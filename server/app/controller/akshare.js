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
        // 如果 Python 脚本执行失败，返回模拟数据
        console.warn('获取股票列表失败，使用模拟数据:', result.message);

        // 模拟数据
        const mockStocks = [
          { symbol: '000001.SH', name: '上证指数', market: '上海', industry: '指数' },
          { symbol: '399001.SZ', name: '深证成指', market: '深圳', industry: '指数' },
          { symbol: '600519.SH', name: '贵州茅台', market: '上海', industry: '白酒' },
          { symbol: '601318.SH', name: '中国平安', market: '上海', industry: '保险' },
          { symbol: '600036.SH', name: '招商银行', market: '上海', industry: '银行' },
          { symbol: '000858.SZ', name: '五粮液', market: '深圳', industry: '白酒' },
          { symbol: '000333.SZ', name: '美的集团', market: '深圳', industry: '家电' },
          { symbol: '601166.SH', name: '兴业银行', market: '上海', industry: '银行' },
          { symbol: '002415.SZ', name: '海康威视', market: '深圳', industry: '电子' },
          { symbol: '600276.SH', name: '恒瑞医药', market: '上海', industry: '医药' },
        ];

        ctx.body = {
          success: true,
          data: mockStocks,
          message: '使用模拟数据，原因: ' + result.message
        };
      }
    } catch (error) {
      console.error('获取股票列表失败:', error);

      // 如果发生异常，返回模拟数据
      const mockStocks = [
        { symbol: '000001.SH', name: '上证指数', market: '上海', industry: '指数' },
        { symbol: '399001.SZ', name: '深证成指', market: '深圳', industry: '指数' },
        { symbol: '600519.SH', name: '贵州茅台', market: '上海', industry: '白酒' },
        { symbol: '601318.SH', name: '中国平安', market: '上海', industry: '保险' },
        { symbol: '600036.SH', name: '招商银行', market: '上海', industry: '银行' },
        { symbol: '000858.SZ', name: '五粮液', market: '深圳', industry: '白酒' },
        { symbol: '000333.SZ', name: '美的集团', market: '深圳', industry: '家电' },
        { symbol: '601166.SH', name: '兴业银行', market: '上海', industry: '银行' },
        { symbol: '002415.SZ', name: '海康威视', market: '深圳', industry: '电子' },
        { symbol: '600276.SH', name: '恒瑞医药', market: '上海', industry: '医药' },
      ];

      ctx.body = {
        success: true,
        data: mockStocks,
        message: '使用模拟数据，原因: ' + error.message
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
        message: '缺少股票代码参数',
        data_source: 'error',
        data_source_message: '参数错误'
      };
      return;
    }

    try {
      // 执行 Python 脚本获取股票行情
      const result = await this.execPythonScript('quote', symbol);

      if (result.success) {
        // 设置响应头中的数据来源
        if (result.data && result.data.data_source) {
          ctx.set('X-Data-Source', result.data.data_source);
        }

        ctx.body = result;
      } else {
        // 如果 Python 脚本执行失败，返回模拟数据
        console.warn(`获取股票${symbol}行情失败，使用模拟数据:`, result.message);

        // 生成模拟数据
        const mockData = this.generateMockStockQuote(symbol);

        ctx.body = {
          success: true,
          data: {
            ...mockData,
            data_source: 'mock_data',
            data_source_message: '模拟数据（API调用失败）'
          },
          message: '使用模拟数据，原因: ' + result.message,
          data_source: 'mock_data',
          data_source_message: '模拟数据（API调用失败）'
        };

        // 设置响应头中的数据来源
        ctx.set('X-Data-Source', 'mock_data');
      }
    } catch (error) {
      console.error(`获取股票${symbol}行情失败:`, error);

      // 如果发生异常，返回模拟数据
      const mockData = this.generateMockStockQuote(symbol);

      ctx.body = {
        success: true,
        data: {
          ...mockData,
          data_source: 'mock_data',
          data_source_message: '模拟数据（API调用失败）'
        },
        message: '使用模拟数据，原因: ' + error.message,
        data_source: 'mock_data',
        data_source_message: '模拟数据（API调用失败）'
      };

      // 设置响应头中的数据来源
      ctx.set('X-Data-Source', 'mock_data');
    }
  }

  // 生成模拟股票行情
  generateMockStockQuote(symbol) {
    // 生成基础价格
    let basePrice = 0;
    let stockName = '';

    switch (symbol) {
    case '000001.SH':
      basePrice = 3000;
      stockName = '上证指数';
      break;
    case '399001.SZ':
      basePrice = 10000;
      stockName = '深证成指';
      break;
    case '600519.SH':
      basePrice = 1800;
      stockName = '贵州茅台';
      break;
    case '601318.SH':
      basePrice = 60;
      stockName = '中国平安';
      break;
    case '600036.SH':
      basePrice = 40;
      stockName = '招商银行';
      break;
    case '000858.SZ':
      basePrice = 150;
      stockName = '五粮液';
      break;
    case '000333.SZ':
      basePrice = 80;
      stockName = '美的集团';
      break;
    case '601166.SH':
      basePrice = 20;
      stockName = '兴业银行';
      break;
    case '002415.SZ':
      basePrice = 35;
      stockName = '海康威视';
      break;
    case '600276.SH':
      basePrice = 50;
      stockName = '恒瑞医药';
      break;
    default:
      basePrice = 100;
      stockName = '未知股票';
    }

    // 生成当前价格（基于随机波动）
    const price = basePrice * (1 + (Math.random() * 0.1 - 0.05)); // -5% 到 +5% 的随机波动
    const preClose = basePrice * (1 + (Math.random() * 0.05 - 0.025)); // 昨收价
    const open = preClose * (1 + (Math.random() * 0.03 - 0.015)); // 开盘价
    const high = Math.max(price, open) * (1 + Math.random() * 0.02); // 最高价
    const low = Math.min(price, open) * (1 - Math.random() * 0.02); // 最低价
    const volume = Math.floor(Math.random() * 10000000) + 1000000; // 成交量
    const amount = price * volume; // 成交额

    // 计算涨跌幅
    const change = price - preClose;
    const pctChg = (change / preClose) * 100;

    return {
      name: stockName,
      price: parseFloat(price.toFixed(2)),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      pre_close: parseFloat(preClose.toFixed(2)),
      volume,
      amount: parseFloat(amount.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      pct_chg: parseFloat(pctChg.toFixed(2)),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      data_source: 'mock_data',
      data_source_message: '模拟数据（API调用失败）'
    };
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
        // 如果 Python 脚本执行失败，返回模拟数据
        console.warn(`获取股票${symbol}历史数据失败，使用模拟数据:`, result.message);

        // 生成模拟数据
        const mockData = this.generateMockHistoryData(symbol, period, count);

        ctx.body = {
          success: true,
          data: mockData,
          message: '使用模拟数据，原因: ' + result.message
        };
      }
    } catch (error) {
      console.error(`获取股票${symbol}历史数据失败:`, error);

      // 如果发生异常，返回模拟数据
      const mockData = this.generateMockHistoryData(symbol, period, count);

      ctx.body = {
        success: true,
        data: mockData,
        message: '使用模拟数据，原因: ' + error.message
      };
    }
  }

  // 生成模拟历史数据
  generateMockHistoryData(symbol, period = 'daily', count = 180) {
    // 获取基础价格
    let basePrice = 0;

    switch (symbol) {
    case '000001.SH':
      basePrice = 3000;
      break;
    case '399001.SZ':
      basePrice = 10000;
      break;
    case '600519.SH':
      basePrice = 1800;
      break;
    case '601318.SH':
      basePrice = 60;
      break;
    case '600036.SH':
      basePrice = 40;
      break;
    case '000858.SZ':
      basePrice = 150;
      break;
    case '000333.SZ':
      basePrice = 80;
      break;
    case '601166.SH':
      basePrice = 20;
      break;
    case '002415.SZ':
      basePrice = 35;
      break;
    case '600276.SH':
      basePrice = 50;
      break;
    default:
      basePrice = 100;
    }

    // 生成历史数据
    const historyData = [];
    const days = parseInt(count) || 180;
    const today = new Date();

    // 根据周期调整时间间隔
    let timeInterval = 1; // 默认为日K，间隔1天
    if (period === 'weekly') {
      timeInterval = 7; // 周K，间隔7天
    } else if (period === 'monthly') {
      timeInterval = 30; // 月K，间隔30天
    }

    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i * timeInterval);
      const dateStr = date.toISOString().split('T')[0];

      // 生成价格（基于随机波动）
      let price;
      if (i === days) {
        // 第一天的价格
        price = basePrice * 0.9; // 假设180天前的价格是当前价格的90%
      } else {
        // 后续价格基于前一天的价格加上随机波动
        const prevPrice = historyData[historyData.length - 1].close;
        const change = prevPrice * (Math.random() * 0.06 - 0.03); // -3% 到 +3% 的随机波动
        price = Math.max(prevPrice + change, 1); // 确保价格不会低于1
      }

      // 生成开盘价、最高价、最低价
      const open = price * (1 + (Math.random() * 0.02 - 0.01));
      const high = Math.max(price, open) * (1 + Math.random() * 0.01);
      const low = Math.min(price, open) * (1 - Math.random() * 0.01);
      const close = price;

      // 生成成交量
      const volume = Math.floor(Math.random() * 10000000) + 1000000;

      historyData.push({
        date: dateStr,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume
      });
    }

    return historyData;
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
        // 如果 Python 脚本执行失败，返回模拟数据
        console.warn(`搜索股票失败，关键词: ${keyword}，使用模拟数据:`, result.message);

        // 获取模拟股票列表
        const mockStocks = [
          { symbol: '000001.SH', name: '上证指数', market: '上海', industry: '指数' },
          { symbol: '399001.SZ', name: '深证成指', market: '深圳', industry: '指数' },
          { symbol: '600519.SH', name: '贵州茅台', market: '上海', industry: '白酒' },
          { symbol: '601318.SH', name: '中国平安', market: '上海', industry: '保险' },
          { symbol: '600036.SH', name: '招商银行', market: '上海', industry: '银行' },
          { symbol: '000858.SZ', name: '五粮液', market: '深圳', industry: '白酒' },
          { symbol: '000333.SZ', name: '美的集团', market: '深圳', industry: '家电' },
          { symbol: '601166.SH', name: '兴业银行', market: '上海', industry: '银行' },
          { symbol: '002415.SZ', name: '海康威视', market: '深圳', industry: '电子' },
          { symbol: '600276.SH', name: '恒瑞医药', market: '上海', industry: '医药' },
        ];

        // 在模拟数据中搜索
        const filteredStocks = mockStocks.filter(stock =>
          stock.symbol.toLowerCase().includes(keyword.toLowerCase()) ||
          stock.name.toLowerCase().includes(keyword.toLowerCase())
        );

        ctx.body = {
          success: true,
          data: filteredStocks,
          message: '使用模拟数据，原因: ' + result.message
        };
      }
    } catch (error) {
      console.error(`搜索股票失败，关键词: ${keyword}:`, error);

      // 如果发生异常，返回模拟数据
      const mockStocks = [
        { symbol: '000001.SH', name: '上证指数', market: '上海', industry: '指数' },
        { symbol: '399001.SZ', name: '深证成指', market: '深圳', industry: '指数' },
        { symbol: '600519.SH', name: '贵州茅台', market: '上海', industry: '白酒' },
        { symbol: '601318.SH', name: '中国平安', market: '上海', industry: '保险' },
        { symbol: '600036.SH', name: '招商银行', market: '上海', industry: '银行' },
        { symbol: '000858.SZ', name: '五粮液', market: '深圳', industry: '白酒' },
        { symbol: '000333.SZ', name: '美的集团', market: '深圳', industry: '家电' },
        { symbol: '601166.SH', name: '兴业银行', market: '上海', industry: '银行' },
        { symbol: '002415.SZ', name: '海康威视', market: '深圳', industry: '电子' },
        { symbol: '600276.SH', name: '恒瑞医药', market: '上海', industry: '医药' },
      ];

      // 在模拟数据中搜索
      const filteredStocks = mockStocks.filter(stock =>
        stock.symbol.toLowerCase().includes(keyword.toLowerCase()) ||
        stock.name.toLowerCase().includes(keyword.toLowerCase())
      );

      ctx.body = {
        success: true,
        data: filteredStocks,
        message: '使用模拟数据，原因: ' + error.message
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

      // 设置手动超时处理
      let timeoutId = null;
      const MANUAL_TIMEOUT = 60000; // 1分钟，减少超时时间

      // 执行命令
      const childProcess = exec(command, {
        maxBuffer: 1024 * 1024 * 10,
        encoding: 'utf8',  // 确保使用 UTF-8 编码
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          TQDM_DISABLE: '1'  // 禁用 tqdm 进度条
        },  // 设置 Python 环境变量
        timeout: 90000  // 设置超时时间为 90 秒 (1.5分钟)，减少超时时间
      }, (error, stdout, stderr) => {
        // 清除超时定时器
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (error) {
          this.ctx.logger.error(`执行 Python 脚本失败: ${error.message}`);
          this.ctx.logger.error(`命令: ${command}`);
          this.ctx.logger.error(`标准错误: ${stderr}`);

          // 如果是超时错误，返回友好的错误信息
          if (error.code === 'ETIMEDOUT') {
            // 返回带有数据来源信息的错误
            resolve({
              success: false,
              message: 'Python 脚本执行超时，请稍后再试',
              data_source: 'error',
              data_source_message: '执行超时'
            });
            return;
          }

          // 返回带有数据来源信息的错误
          resolve({
            success: false,
            message: error.message,
            data_source: 'error',
            data_source_message: `执行失败: ${error.message}`
          });
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

            // 确保结果包含数据来源信息
            if (result.success && result.data && !result.data.data_source) {
              if (action === 'quote') {
                result.data.data_source = 'external_api';
                result.data.data_source_message = '数据来自AKShare API';
              }
            }

            // 添加顶层数据来源信息
            if (!result.data_source) {
              result.data_source = result.success ? 'external_api' : 'error';
              result.data_source_message = result.success ?
                '数据来自AKShare API' :
                `获取数据失败: ${result.message || '未知错误'}`;
            }

            resolve(result);
            return;
          }

          // 如果没有找到 JSON 对象，尝试直接解析
          const result = JSON.parse(cleanedOutput);

          // 确保结果包含数据来源信息
          if (result.success && result.data && !result.data.data_source) {
            if (action === 'quote') {
              result.data.data_source = 'external_api';
              result.data.data_source_message = '数据来自AKShare API';
            }
          }

          // 添加顶层数据来源信息
          if (!result.data_source) {
            result.data_source = result.success ? 'external_api' : 'error';
            result.data_source_message = result.success ?
              '数据来自AKShare API' :
              `获取数据失败: ${result.message || '未知错误'}`;
          }

          resolve(result);
        } catch (e) {
          this.ctx.logger.error(`解析 Python 脚本输出失败: ${e.message}`);
          this.ctx.logger.error(`输出内容: ${stdout}`);

          // 尝试从输出中提取最后一个 JSON 对象
          try {
            const jsonObjects = stdout.match(/{[\s\S]*?}/g);
            if (jsonObjects && jsonObjects.length > 0) {
              // 使用最后一个 JSON 对象，这通常是最终结果
              const lastJson = jsonObjects[jsonObjects.length - 1];
              const result = JSON.parse(lastJson);

              // 确保结果包含数据来源信息
              if (result.success && result.data && !result.data.data_source) {
                if (action === 'quote') {
                  result.data.data_source = 'external_api';
                  result.data.data_source_message = '数据来自AKShare API';
                }
              }

              // 添加顶层数据来源信息
              if (!result.data_source) {
                result.data_source = result.success ? 'external_api' : 'error';
                result.data_source_message = result.success ?
                  '数据来自AKShare API' :
                  `获取数据失败: ${result.message || '未知错误'}`;
              }

              resolve(result);
              return;
            }

            // 如果没有找到 JSON 对象，尝试提取任何 JSON 对象
            const jsonMatch = stdout.match(/{[\s\S]*}/);
            if (jsonMatch) {
              const extractedJson = jsonMatch[0];
              const result = JSON.parse(extractedJson);

              // 确保结果包含数据来源信息
              if (result.success && result.data && !result.data.data_source) {
                if (action === 'quote') {
                  result.data.data_source = 'external_api';
                  result.data.data_source_message = '数据来自AKShare API';
                }
              }

              // 添加顶层数据来源信息
              if (!result.data_source) {
                result.data_source = result.success ? 'external_api' : 'error';
                result.data_source_message = result.success ?
                  '数据来自AKShare API' :
                  `获取数据失败: ${result.message || '未知错误'}`;
              }

              resolve(result);
              return;
            }
          } catch (extractError) {
            this.ctx.logger.error(`尝试提取 JSON 失败: ${extractError.message}`);
          }

          // 如果无法解析 JSON，返回带有数据来源信息的错误
          if (action === 'test') {
            resolve({
              success: false,
              message: 'AKShare API 连接失败，请检查 Python 环境和 AKShare 库是否正确安装',
              data_source: 'error',
              data_source_message: 'AKShare API 连接失败'
            });
          } else {
            resolve({
              success: false,
              message: `无法解析 Python 脚本输出: ${e.message}`,
              data_source: 'error',
              data_source_message: `解析失败: ${e.message}`
            });
          }
        }
      });

      // 设置手动超时处理
      timeoutId = setTimeout(() => {
        try {
          // 尝试终止进程
          if (childProcess && childProcess.pid) {
            this.ctx.logger.warn(`手动终止超时进程: ${childProcess.pid}, 命令: ${command}`);
            process.kill(childProcess.pid, 'SIGTERM');

            // 如果进程没有在 2 秒内终止，强制终止
            setTimeout(() => {
              try {
                if (childProcess && childProcess.pid) {
                  this.ctx.logger.warn(`强制终止超时进程: ${childProcess.pid}`);
                  process.kill(childProcess.pid, 'SIGKILL');
                }
              } catch (killError) {
                this.ctx.logger.error(`强制终止进程失败: ${killError.message}`);
              }
            }, 2000);
          }

          // 返回带有数据来源信息的超时错误
          resolve({
            success: false,
            message: 'Python 脚本执行超时（手动终止），请稍后再试',
            data_source: 'error',
            data_source_message: '执行超时'
          });
        } catch (timeoutError) {
          this.ctx.logger.error(`终止超时进程失败: ${timeoutError.message}`);

          // 返回带有数据来源信息的超时错误
          resolve({
            success: false,
            message: 'Python 脚本执行超时，无法终止进程，请稍后再试',
            data_source: 'error',
            data_source_message: '执行超时且无法终止进程'
          });
        }
      }, MANUAL_TIMEOUT);
    });
  }
}

module.exports = AKShareController;
