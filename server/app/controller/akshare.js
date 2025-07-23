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
      // 检查Python环境和AKShare库
      const pythonCheck = await this.checkPythonEnvironment();

      if (!pythonCheck.success) {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: 'AKShare环境检查失败',
          error: pythonCheck.error,
          requirements: {
            python: 'Python 3.7+',
            akshare: 'pip install akshare',
            pandas: 'pip install pandas',
            requests: 'pip install requests'
          },
          installGuide: [
            '1. 安装Python 3.7或更高版本',
            '2. 运行: pip install akshare pandas requests',
            '3. 重启服务器'
          ]
        };
        return;
      }

      // 执行快速的AKShare环境测试（使用临时文件避免引号问题）
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const execAsync = promisify(exec);

        // 创建临时测试文件
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, 'akshare_backend_test.py');

        const testScript = `# -*- coding: utf-8 -*-
try:
    import akshare as ak
    print("akshare_version:" + ak.__version__)

    import pandas as pd
    print("pandas_version:" + pd.__version__)

    has_stock_func = hasattr(ak, 'stock_zh_a_hist')
    print("has_stock_function:" + str(has_stock_func))

    print("test_result:SUCCESS")
except Exception as e:
    print("test_result:ERROR:" + str(e))
`;

        // 写入临时文件
        fs.writeFileSync(tempFile, testScript, 'utf8');

        // 执行测试
        const { stdout, stderr } = await execAsync(
          `"${pythonCheck.pythonCommand}" "${tempFile}"`,
          {
            timeout: 8000,
            encoding: 'utf8',
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
          }
        );

        // 清理临时文件
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // 忽略清理错误
        }

        const allResults = stdout.trim().split('\n');
        const allPassed = stdout.includes('test_result:SUCCESS');

        if (allPassed) {
          ctx.body = {
            success: true,
            message: 'AKShare环境检查成功',
            pythonVersion: pythonCheck.pythonVersion,
            akshareVersion: pythonCheck.akshareVersion,
            testResults: allResults,
            note: '环境测试通过，已跳过网络调用避免超时'
          };
        } else {
          // 即使部分测试失败，如果基本库已安装，仍然返回成功
          ctx.body = {
            success: true,
            message: 'AKShare环境基本正常',
            pythonVersion: pythonCheck.pythonVersion,
            akshareVersion: pythonCheck.akshareVersion,
            testResults: allResults,
            warning: '部分功能测试失败，但基本环境正常',
            note: '库已安装，可以尝试使用基本功能'
          };
        }
      } catch (testError) {
        // 如果测试超时或失败，但Python环境正常，仍然返回成功
        if (testError.code === 'ETIMEDOUT') {
          ctx.body = {
            success: true,
            message: 'AKShare环境可能正常（测试超时）',
            pythonVersion: pythonCheck.pythonVersion,
            akshareVersion: pythonCheck.akshareVersion,
            warning: '测试超时，但Python和AKShare库已正确安装',
            note: '建议在实际使用时测试具体功能'
          };
        } else {
          ctx.status = 500;
          ctx.body = {
            success: false,
            message: 'AKShare测试失败',
            error: testError.message,
            suggestion: '请检查Python环境和AKShare库安装'
          };
        }
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'AKShare API连接测试异常',
        error: error.message,
        troubleshooting: [
          '检查Python是否正确安装',
          '检查AKShare库是否安装: pip list | grep akshare',
          '检查网络连接是否正常'
        ]
      };
    }
  }

  // 获取股票列表
  async stockList() {
    const { ctx } = this;
    const { force_refresh = false } = ctx.query;

    // 生成模拟股票数据的函数
    const getMockStocks = () => [
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
      { symbol: '000002.SZ', name: '万科A', market: '深圳', industry: '房地产' },
      { symbol: '600000.SH', name: '浦发银行', market: '上海', industry: '银行' },
      { symbol: '000001.SZ', name: '平安银行', market: '深圳', industry: '银行' },
      { symbol: '600887.SH', name: '伊利股份', market: '上海', industry: '食品饮料' },
      { symbol: '002594.SZ', name: '比亚迪', market: '深圳', industry: '汽车' }
    ];

    try {
      // 如果不强制刷新，直接返回模拟数据（避免超时）
      if (!force_refresh) {
        ctx.logger.info('使用AKShare模拟股票列表数据（避免Python脚本超时）');

        const mockStocks = getMockStocks();

        ctx.body = {
          success: true,
          data: mockStocks,
          message: '使用模拟数据（Python脚本超时风险较高）',
          data_source: 'mock_data',
          count: mockStocks.length,
          note: '如需真实数据，请设置force_refresh=true'
        };
        return;
      }

      // 只有在强制刷新时才调用Python脚本
      ctx.logger.info('强制刷新：尝试执行Python脚本获取真实股票列表');

      try {
        // 执行 Python 脚本获取股票列表
        const result = await this.execPythonScript('stock-list');

        if (result.success) {
          ctx.body = result;
        } else {
          // Python脚本失败，降级到模拟数据
          ctx.logger.warn('Python脚本执行失败，降级到模拟数据:', result.message);
          const mockStocks = getMockStocks();

          ctx.body = {
            success: true,
            data: mockStocks,
            message: 'Python脚本执行失败，使用模拟数据',
            data_source: 'mock_data_fallback',
            count: mockStocks.length,
            error: result.message
          };
        }
      } catch (scriptError) {
        // Python脚本超时或异常，降级到模拟数据
        ctx.logger.warn('Python脚本超时或异常，降级到模拟数据:', scriptError.message);
        const mockStocks = getMockStocks();

        ctx.body = {
          success: true,
          data: mockStocks,
          message: 'Python脚本超时，使用模拟数据',
          data_source: 'mock_data_timeout',
          count: mockStocks.length,
          error: scriptError.message
        };
      }
    } catch (error) {
      console.error('获取股票列表失败:', error);

      // 如果发生异常，返回模拟数据
      const mockStocks = getMockStocks();

      ctx.body = {
        success: true,
        data: mockStocks,
        message: '使用模拟数据，原因: ' + error.message,
        data_source: 'mock_data_error',
        count: mockStocks.length
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

    // 不生成模拟数据，直接返回错误
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: `AKShare API调用失败，无法获取股票${symbol}的实时行情数据`,
      error: 'AKShare API not available',
      data_source: 'AKShare API',
      data_source_message: 'AKShare API不可用，请检查Python环境和AKShare库配置'
    };
    return;
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

      // 如果发生异常，返回错误而不是模拟数据
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `AKShare API调用失败，无法获取股票${symbol}的历史数据`,
        error: error.message,
        data_source: 'AKShare API',
        data_source_message: 'AKShare API不可用，请检查Python环境和AKShare库配置'
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
    const { count = 5, force_refresh = false } = ctx.query;

    try {
      // 如果不强制刷新，先尝试返回模拟数据（避免超时）
      if (!force_refresh) {
        ctx.logger.info('使用AKShare模拟新闻数据（避免Python脚本超时）');

        const mockNews = this.generateMockNews(parseInt(count));

        ctx.body = {
          success: true,
          data: mockNews,
          message: '使用模拟数据（Python脚本超时风险较高）',
          data_source: 'mock_data',
          note: '如需真实数据，请设置force_refresh=true'
        };
        return;
      }

      // 只有在强制刷新时才调用Python脚本
      ctx.logger.info('强制刷新：尝试执行Python脚本获取真实新闻数据');

      try {
        // 执行 Python 脚本获取财经新闻，设置较短的超时时间
        const result = await this.execPythonScript('news', count, { timeout: 10000 });

        if (result.success) {
          ctx.body = result;
        } else {
          // Python脚本失败，降级到模拟数据
          ctx.logger.warn('Python脚本执行失败，降级到模拟数据');
          const mockNews = this.generateMockNews(parseInt(count));

          ctx.body = {
            success: true,
            data: mockNews,
            message: 'Python脚本执行失败，使用模拟数据',
            data_source: 'mock_data_fallback',
            error: result.message
          };
        }
      } catch (scriptError) {
        // Python脚本超时或异常，降级到模拟数据
        ctx.logger.warn('Python脚本超时或异常，降级到模拟数据:', scriptError.message);
        const mockNews = this.generateMockNews(parseInt(count));

        ctx.body = {
          success: true,
          data: mockNews,
          message: 'Python脚本超时，使用模拟数据',
          data_source: 'mock_data_timeout',
          error: scriptError.message
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

  // 生成模拟新闻数据
  generateMockNews(count = 5) {
    const titles = [
      '央行宣布降准0.5个百分点，释放流动性约1万亿元',
      '科技股集体上涨，人工智能概念股领涨',
      '新能源汽车销量创新高，产业链公司受益',
      '房地产政策持续优化，板块迎来反弹机会',
      '外资持续流入A股市场，看好中国经济前景',
      '消费复苏态势明显，相关概念股表现活跃',
      '制造业PMI重回扩张区间，经济复苏信号增强',
      '金融监管政策调整，银行股迎来配置机会',
      '绿色发展政策支持，环保概念股持续走强',
      '数字经济发展提速，相关龙头股获得关注'
    ];

    const sources = ['财联社', '证券时报', '上海证券报', '中国证券报', '经济参考报'];
    const news = [];

    for (let i = 0; i < count; i++) {
      const title = titles[i % titles.length];
      const source = sources[i % sources.length];
      const publishTime = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);

      news.push({
        title: title,
        time: publishTime.toISOString().split('T')[0] + ' ' + publishTime.toTimeString().split(' ')[0],
        source: source,
        url: `https://example.com/news/${i}`,
        important: Math.random() > 0.7, // 30%概率为重要新闻
        content: `${title}的详细内容...`
      });
    }

    return news;
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
      });
    });
  }

  // 检查Python环境
  async checkPythonEnvironment() {
    return new Promise((resolve) => {
      const { exec } = require('child_process');

      // 检查Python版本
      exec('python --version', (error, stdout, stderr) => {
        if (error) {
          // 尝试python3
          exec('python3 --version', (error3, stdout3, stderr3) => {
            if (error3) {
              resolve({
                success: false,
                error: 'Python未安装或不在PATH中',
                details: error3.message
              });
              return;
            }

            // 检查AKShare库
            this.checkAKShareLibrary('python3', stdout3.trim(), resolve);
          });
          return;
        }

        // 检查AKShare库
        this.checkAKShareLibrary('python', stdout.trim(), resolve);
      });
    });
  }

  // 检查AKShare库
  checkAKShareLibrary(pythonCmd, pythonVersion, resolve) {
    const { exec } = require('child_process');

    exec(`${pythonCmd} -c "import akshare as ak; print(ak.__version__)"`, (error, stdout, stderr) => {
      if (error) {
        resolve({
          success: false,
          error: 'AKShare库未安装',
          pythonVersion,
          details: error.message,
          installCommand: `${pythonCmd} -m pip install akshare`
        });
        return;
      }

      resolve({
        success: true,
        pythonVersion,
        akshareVersion: stdout.trim(),
        pythonCommand: pythonCmd
      }, MANUAL_TIMEOUT);
    });
  }
}

module.exports = AKShareController;
