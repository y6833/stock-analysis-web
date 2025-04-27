'use strict';

const Controller = require('egg').Controller;
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class AKShareController extends Controller {
  // 测试连接
  async test() {
    const { ctx } = this;
    
    try {
      // 执行 Python 脚本测试连接
      const result = await this.execPythonScript('test');
      
      if (result.success) {
        ctx.body = {
          success: true,
          message: 'AKShare API连接成功'
        };
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: 'AKShare API连接失败',
          error: result.message
        };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'AKShare API连接失败',
        error: error.message
      };
    }
  }
  
  // 获取股票列表
  async stockList() {
    const { ctx } = this;
    
    try {
      // 执行 Python 脚本获取股票列表
      const result = await this.execPythonScript('stock-list');
      
      if (result.success) {
        ctx.body = result;
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: '获取股票列表失败',
          error: result.message
        };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取股票列表失败',
        error: error.message
      };
    }
  }
  
  // 获取股票行情
  async quote() {
    const { ctx } = this;
    const { symbol } = ctx.query;
    
    if (!symbol) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少股票代码参数'
      };
      return;
    }
    
    try {
      // 执行 Python 脚本获取股票行情
      const result = await this.execPythonScript('quote', symbol);
      
      if (result.success) {
        ctx.body = result;
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: '获取股票行情失败',
          error: result.message
        };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取股票行情失败',
        error: error.message
      };
    }
  }
  
  // 获取历史数据
  async history() {
    const { ctx } = this;
    const { symbol, period, count } = ctx.query;
    
    if (!symbol) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少股票代码参数'
      };
      return;
    }
    
    try {
      // 执行 Python 脚本获取历史数据
      const result = await this.execPythonScript('history', symbol, period, count);
      
      if (result.success) {
        ctx.body = result;
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: '获取历史数据失败',
          error: result.message
        };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取历史数据失败',
        error: error.message
      };
    }
  }
  
  // 搜索股票
  async search() {
    const { ctx } = this;
    const { keyword } = ctx.query;
    
    if (!keyword) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少搜索关键词参数'
      };
      return;
    }
    
    try {
      // 执行 Python 脚本搜索股票
      const result = await this.execPythonScript('search', keyword);
      
      if (result.success) {
        ctx.body = result;
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: '搜索股票失败',
          error: result.message
        };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '搜索股票失败',
        error: error.message
      };
    }
  }
  
  // 获取财经新闻
  async news() {
    const { ctx } = this;
    const { count } = ctx.query;
    
    try {
      // 执行 Python 脚本获取财经新闻
      const result = await this.execPythonScript('news', count);
      
      if (result.success) {
        ctx.body = result;
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: '获取财经新闻失败',
          error: result.message
        };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取财经新闻失败',
        error: error.message
      };
    }
  }
  
  // 执行 Python 脚本
  async execPythonScript(action, ...args) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.app.baseDir, 'scripts', 'akshare_api.py');
      
      // 检查脚本文件是否存在
      if (!fs.existsSync(scriptPath)) {
        reject(new Error(`Python 脚本文件不存在: ${scriptPath}`));
        return;
      }
      
      // 构建命令
      const command = `python "${scriptPath}" ${action} ${args.join(' ')}`;
      
      // 执行命令
      exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
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
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          this.ctx.logger.error(`解析 Python 脚本输出失败: ${e.message}`);
          this.ctx.logger.error(`输出内容: ${stdout}`);
          reject(new Error(`无法解析 Python 脚本输出: ${e.message}`));
        }
      });
    });
  }
}

module.exports = AKShareController;
