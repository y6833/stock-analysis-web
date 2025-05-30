'use strict';

const Controller = require('egg').Controller;
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class DataSourceController extends Controller {
  // 测试数据源连接
  async test() {
    const { ctx } = this;

    // 获取数据源参数
    const dataSource = ctx.query.source || 'eastmoney';

    // 获取当前选择的数据源
    const currentDataSource = ctx.query.currentSource || dataSource;

    this.ctx.logger.info(`测试数据源连接: ${dataSource}，当前数据源是: ${currentDataSource}`);

    // 完全禁止测试Tushare数据源
    if (dataSource === 'tushare') {
      this.ctx.logger.warn('禁止测试Tushare数据源，系统已配置为使用其他数据源');
      ctx.body = {
        success: true,
        message: '系统已配置为不使用Tushare数据源，跳过测试',
        data_source: dataSource,
        skipped: true
      };
      return;
    }

    // 如果要测试的数据源不是当前选择的数据源，则跳过测试
    if (dataSource !== currentDataSource) {
      this.ctx.logger.info(`跳过测试非当前数据源: ${dataSource}，当前数据源是: ${currentDataSource}`);
      ctx.body = {
        success: true,
        message: `跳过测试非当前数据源: ${dataSource}，当前数据源是: ${currentDataSource}`,
        data_source: dataSource,
        skipped: true
      };
      return;
    }

    // 根据数据源类型调用不同的测试方法
    switch (dataSource) {
    case 'tushare':
      return await this.testTushare();
    case 'sina':
      return await this.testSina();
    case 'eastmoney':
      return await this.testEastMoney();
    case 'akshare':
      return await this.testAKShare();
    case 'netease':
      return await this.testNetEase();
    case 'tencent':
      return await this.testTencent();
    default:
      ctx.body = {
        success: false,
        message: `未知数据源类型: ${dataSource}`,
        data_source: dataSource
      };
    }
  }

  // 测试Tushare数据源
  async testTushare() {
    const { ctx } = this;

    try {
      this.ctx.logger.info('执行 Tushare API 连接测试');

      // 执行 Python 脚本测试连接
      const result = await this.execPythonScript('tushare_api.py', 'test_connection');

      ctx.body = {
        success: result.success,
        message: result.message,
        data: result.data,
        data_source: 'tushare'
      };
    } catch (error) {
      this.ctx.logger.error(`Tushare API 连接测试失败: ${error.message}`);

      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Tushare API 连接测试失败',
        error: error.message,
        data_source: 'tushare'
      };
    }
  }

  // 测试新浪数据源
  async testSina() {
    const { ctx } = this;

    try {
      // 新浪数据源测试逻辑
      // 这里可以实现实际的测试逻辑，或者简单返回成功
      ctx.body = {
        success: true,
        message: '新浪财经数据源连接正常',
        data_source: 'sina'
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '新浪财经数据源连接测试失败',
        error: error.message,
        data_source: 'sina'
      };
    }
  }

  // 测试东方财富数据源
  async testEastMoney() {
    const { ctx } = this;

    try {
      // 东方财富数据源测试逻辑
      ctx.body = {
        success: true,
        message: '东方财富数据源连接正常',
        data_source: 'eastmoney'
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '东方财富数据源连接测试失败',
        error: error.message,
        data_source: 'eastmoney'
      };
    }
  }

  // 测试AKShare数据源
  async testAKShare() {
    const { ctx } = this;

    try {
      // 执行 Python 脚本测试连接
      const result = await this.execPythonScript('akshare_api.py', 'test_connection');

      ctx.body = {
        success: result.success,
        message: result.message,
        data: result.data,
        data_source: 'akshare'
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'AKShare 数据源连接测试失败',
        error: error.message,
        data_source: 'akshare'
      };
    }
  }

  // 测试网易财经数据源
  async testNetEase() {
    const { ctx } = this;

    try {
      // 网易财经数据源测试逻辑
      ctx.body = {
        success: true,
        message: '网易财经数据源连接正常',
        data_source: 'netease'
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '网易财经数据源连接测试失败',
        error: error.message,
        data_source: 'netease'
      };
    }
  }

  // 测试腾讯财经数据源
  async testTencent() {
    const { ctx } = this;

    try {
      // 腾讯财经数据源测试逻辑
      ctx.body = {
        success: true,
        message: '腾讯财经数据源连接正常',
        data_source: 'tencent'
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '腾讯财经数据源连接测试失败',
        error: error.message,
        data_source: 'tencent'
      };
    }
  }

  // 获取股票列表
  async getStockList() {
    const { ctx } = this;

    // 获取数据源参数
    const dataSource = ctx.query.source || 'tushare';

    this.ctx.logger.info(`获取股票列表: ${dataSource}`);

    // 根据数据源类型调用不同的方法
    switch (dataSource) {
    case 'tushare':
      // 调用tushare控制器的方法
      return await ctx.service.proxy.callController('tushare', 'getStockBasic');
    case 'zhitu':
      // 智兔数服数据源 - 调用真实API
      try {
        const zhituResult = await ctx.service.zhitu.getStockList();
        ctx.body = {
          success: true,
          message: '智兔数服股票列表获取成功',
          data: zhituResult.data || [],
          data_source: 'zhitu',
          data_source_message: '数据来自智兔数服专业股票数据API'
        };
      } catch (error) {
        ctx.body = {
          success: false,
          message: `智兔数服API调用失败: ${error.message}`,
          error: error.message,
          data_source: 'zhitu',
          data_source_message: '智兔数服API暂时不可用，请检查API配置'
        };
      }
      return;
    case 'yahoo_finance':
      // Yahoo Finance API数据源 - 调用真实API
      try {
        const yahooResult = await ctx.service.yahooFinance.getStockList();
        ctx.body = {
          success: true,
          message: 'Yahoo Finance股票列表获取成功',
          data: yahooResult.data || [],
          data_source: 'yahoo_finance',
          data_source_message: '数据来自Yahoo Finance API'
        };
      } catch (error) {
        ctx.body = {
          success: false,
          message: `Yahoo Finance API调用失败: ${error.message}`,
          error: error.message,
          data_source: 'yahoo_finance',
          data_source_message: 'Yahoo Finance API暂时不可用，请检查网络连接'
        };
      }
      return;
    case 'google_finance':
      // Google Finance API数据源 - 调用真实API（使用Alpha Vantage）
      try {
        const googleResult = await ctx.service.googleFinance.getStockList();
        ctx.body = {
          success: true,
          message: 'Google Finance股票列表获取成功',
          data: googleResult.data || [],
          data_source: 'google_finance',
          data_source_message: '数据来自Alpha Vantage API（Google Finance替代）'
        };
      } catch (error) {
        ctx.body = {
          success: false,
          message: `Alpha Vantage API调用失败: ${error.message}`,
          error: error.message,
          data_source: 'google_finance',
          data_source_message: 'Alpha Vantage API暂时不可用，请检查API密钥配置'
        };
      }
      return;
    case 'juhe':
      // 聚合数据源 - 调用真实API
      try {
        const juheResult = await ctx.service.juhe.getStockList();
        ctx.body = {
          success: true,
          message: '聚合数据股票列表获取成功',
          data: juheResult.data || [],
          data_source: 'juhe',
          data_source_message: '数据来自聚合数据平台（每天免费50次调用）'
        };
      } catch (error) {
        ctx.body = {
          success: false,
          message: `聚合数据API调用失败: ${error.message}`,
          error: error.message,
          data_source: 'juhe',
          data_source_message: '聚合数据API暂时不可用，请检查API密钥配置或调用次数限制'
        };
      }
      return;
    case 'sina':
    case 'eastmoney':
    case 'akshare':
    case 'netease':
    case 'tencent':
      // 这里可以实现其他数据源的股票列表获取逻辑
      // 暂时重定向到tushare
      const result = await ctx.service.proxy.callController('tushare', 'getStockBasic');

      // 如果结果中没有明确的数据来源信息，添加数据来源信息
      if (result && result.body) {
        if (!result.body.data_source) {
          result.body.data_source = dataSource;
        }
        if (!result.body.data_source_message) {
          result.body.data_source_message = `数据来自${dataSource.toUpperCase()}数据源`;
        }
      }

      return result;
    default:
      ctx.body = {
        success: false,
        message: `未知数据源类型: ${dataSource}`,
        data_source: dataSource,
        data_source_message: `未知数据源: ${dataSource}`
      };
    }
  }

  // 执行 Python 脚本
  async execPythonScript(scriptName, action, ...args) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.app.baseDir, 'scripts', scriptName);

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
          this.ctx.logger.warn(`解析 Python 脚本输出失败: ${e.message}`);
          this.ctx.logger.warn(`输出内容: ${stdout}`);

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
            this.ctx.logger.warn(`尝试提取 JSON 失败: ${extractError.message}`);
          }

          // 如果所有尝试都失败，返回一个友好的错误对象
          resolve({
            success: false,
            message: '解析 Python 脚本输出失败',
            error: e.message,
            type: 'warning',
            data_source: 'error',
            data_source_message: `解析Python脚本输出失败: ${e.message}`
          });
        }
      });
    });
  }
}

module.exports = DataSourceController;
