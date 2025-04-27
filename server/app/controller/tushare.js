'use strict';

const Controller = require('egg').Controller;
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class TushareController extends Controller {
  // 测试 Tushare API 连接
  async test() {
    const { ctx } = this;

    try {
      // 执行 Python 脚本测试连接
      const result = await this.execPythonScript('test_connection');

      ctx.body = {
        success: result.success,
        message: result.message,
        data: result.data
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Tushare API 连接测试失败',
        error: error.message
      };
    }
  }

  // 更新股票基本信息到数据库
  async updateStockBasic() {
    const { ctx } = this;

    try {
      // 执行 Python 脚本更新数据库
      const result = await this.execPythonScript('update_stock_basic');

      ctx.body = {
        success: result.success,
        message: result.message,
        data: result.data
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '更新股票基本信息失败',
        error: error.message
      };
    }
  }

  // 获取股票基本信息
  async getStockBasic() {
    const { ctx } = this;

    try {
      // 执行 Python 脚本获取股票基本信息
      const result = await this.execPythonScript('get_stock_basic');

      // 检查结果类型
      if (result.type === 'warning') {
        // 如果是警告，返回 200 状态码，但标记为不成功
        ctx.body = {
          success: false,
          message: result.message,
          warning: result.error, // 使用 warning 字段而不是 error
          type: 'warning'
        };
      } else if (result.success) {
        // 成功情况
        ctx.body = {
          success: true,
          message: result.message,
          data: result.data,
          source: result.source
        };
      } else {
        // 失败但不是错误的情况（例如数据库中没有数据）
        ctx.body = {
          success: false,
          message: result.message,
          type: 'info' // 使用 info 类型表示这是一个信息性消息
        };
      }
    } catch (error) {
      // 真正的错误情况
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取股票基本信息失败',
        error: error.message,
        type: 'error' // 明确标记为错误
      };
    }
  }

  // 代理 Tushare API 请求
  async proxy() {
    const { ctx } = this;
    const { api_name, params, token } = ctx.request.body;

    if (!api_name) {
      ctx.status = 400;
      ctx.body = {
        code: 400,
        msg: '缺少 api_name 参数'
      };
      return;
    }

    try {
      this.ctx.logger.info(`代理 Tushare API 请求: ${api_name}`);

      // 构建请求 URL
      const tushareUrl = 'http://api.tushare.pro';

      // 构建请求数据
      const requestData = {
        api_name,
        token: token || '983b25aa025eee598034c4741dc776dd73356ddc53ddcffbb180cf61', // 使用提供的 token 或默认 token
        params: params || {}
      };

      // 发送请求到 Tushare API
      const response = await ctx.curl(tushareUrl, {
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(requestData),
        dataType: 'json',
        timeout: 30000 // 30秒超时
      });

      // 检查响应状态
      if (response.status !== 200) {
        ctx.status = response.status;
        ctx.body = {
          code: response.status,
          msg: `Tushare API 请求失败: HTTP ${response.status}`
        };
        return;
      }

      // 返回 Tushare API 的响应
      ctx.body = response.data;
    } catch (error) {
      this.ctx.logger.error(`代理 Tushare API 请求失败: ${error.message}`);

      ctx.status = 500;
      ctx.body = {
        code: 500,
        msg: `代理 Tushare API 请求失败: ${error.message}`
      };
    }
  }

  // 执行 Python 脚本
  async execPythonScript(action, ...args) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.app.baseDir, 'scripts', 'tushare_api.py');

      // 检查脚本文件是否存在
      if (!fs.existsSync(scriptPath)) {
        reject(new Error(`Python 脚本文件不存在: ${scriptPath}`));
        return;
      }

      // 构建命令
      const command = `python "${scriptPath}" ${action} ${args.join(' ')}`;

      // 执行命令
      exec(command, {
        maxBuffer: 1024 * 1024 * 10,
        encoding: 'utf8',  // 确保使用 UTF-8 编码
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }  // 设置 Python 输出编码
      }, (error, stdout, stderr) => {
        if (error) {
          this.ctx.logger.error(`执行 Python 脚本失败: ${error.message}`);
          this.ctx.logger.error(`命令: ${command}`);
          this.ctx.logger.error(`标准错误: ${stderr}`);
          reject(error);
          return;
        }

        if (stderr) {
          this.ctx.logger.warn(`Python 脚本警告: ${stderr}`);
        }

        try {
          // 去除 BOM 和其他不可见字符
          const cleanedOutput = stdout.trim().replace(/^\uFEFF/, '');

          // 尝试提取最后一个 JSON 对象
          const jsonObjects = cleanedOutput.match(/{[\s\S]*?}/g);
          if (jsonObjects && jsonObjects.length > 0) {
            // 使用最后一个 JSON 对象，这通常是最终结果
            const lastJson = jsonObjects[jsonObjects.length - 1];
            const result = JSON.parse(lastJson);
            resolve(result);
            return;
          }

          // 如果没有找到 JSON 对象，尝试直接解析
          const result = JSON.parse(cleanedOutput);
          resolve(result);
        } catch (e) {
          this.ctx.logger.warn(`解析 Python 脚本输出失败: ${e.message}`); // 改为警告级别
          this.ctx.logger.warn(`输出内容: ${stdout}`); // 改为警告级别

          // 尝试从输出中提取最后一个 JSON 对象
          try {
            const jsonObjects = stdout.match(/{[\s\S]*?}/g);
            if (jsonObjects && jsonObjects.length > 0) {
              // 使用最后一个 JSON 对象，这通常是最终结果
              const lastJson = jsonObjects[jsonObjects.length - 1];
              const result = JSON.parse(lastJson);
              resolve(result);
              return;
            }

            // 如果没有找到 JSON 对象，尝试提取任何 JSON 对象
            const jsonMatch = stdout.match(/{[\s\S]*}/);
            if (jsonMatch) {
              const extractedJson = jsonMatch[0];
              const result = JSON.parse(extractedJson);
              resolve(result);
              return;
            }
          } catch (extractError) {
            this.ctx.logger.warn(`尝试提取 JSON 失败: ${extractError.message}`); // 改为警告级别
          }

          // 如果所有尝试都失败，返回一个友好的错误对象
          resolve({
            success: false,
            message: '解析 Python 脚本输出失败',
            error: e.message,
            type: 'warning' // 添加类型字段，表示这是一个警告而不是错误
          });
        }
      });
    });
  }
}

module.exports = TushareController;
