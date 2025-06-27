'use strict';

const Controller = require('egg').Controller;
const axios = require('axios');

class AlphaVantageController extends Controller {
  // 测试连接
  async test() {
    const { ctx } = this;
    
    try {
      // 检查Alpha Vantage API配置
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
      
      if (!apiKey) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Alpha Vantage API Key未配置',
          error: '请在环境变量中设置 ALPHA_VANTAGE_API_KEY',
          configHelp: {
            step1: '访问 https://www.alphavantage.co/support/#api-key 获取免费API Key',
            step2: '在环境变量中设置 ALPHA_VANTAGE_API_KEY=your_api_key',
            step3: '重启服务器',
            freeQuota: '每分钟5次调用，每天500次调用'
          }
        };
        return;
      }
      
      // 测试Alpha Vantage API连接
      try {
        const response = await axios.get('https://www.alphavantage.co/query', {
          params: {
            function: 'GLOBAL_QUOTE',
            symbol: 'AAPL',
            apikey: apiKey
          },
          headers: {
            'User-Agent': 'HappyStockMarket/1.0'
          },
          timeout: 15000
        });
        
        if (response.status === 200) {
          const data = response.data;
          
          // 检查API响应
          if (data['Global Quote']) {
            ctx.body = {
              success: true,
              message: 'Alpha Vantage API连接成功',
              apiStatus: 'active',
              testSymbol: 'AAPL',
              sampleData: {
                symbol: data['Global Quote']['01. symbol'],
                price: data['Global Quote']['05. price'],
                change: data['Global Quote']['09. change']
              }
            };
          } else if (data['Error Message']) {
            ctx.status = 400;
            ctx.body = {
              success: false,
              message: 'Alpha Vantage API调用失败',
              error: data['Error Message'],
              suggestion: '请检查API Key是否正确或符号是否有效'
            };
          } else if (data['Note']) {
            ctx.status = 429;
            ctx.body = {
              success: false,
              message: 'Alpha Vantage API调用频率限制',
              error: data['Note'],
              suggestion: '请等待一分钟后重试，或升级到付费计划'
            };
          } else {
            ctx.status = 400;
            ctx.body = {
              success: false,
              message: 'Alpha Vantage API响应格式异常',
              error: '未知的响应格式',
              responseKeys: Object.keys(data)
            };
          }
        } else {
          ctx.status = 500;
          ctx.body = {
            success: false,
            message: 'Alpha Vantage API响应异常',
            httpStatus: response.status
          };
        }
        
      } catch (apiError) {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: 'Alpha Vantage API连接失败',
          error: apiError.message,
          suggestion: '请检查网络连接和API配置'
        };
      }
      
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Alpha Vantage API连接测试异常',
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
    
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Alpha Vantage API Key未配置'
      };
      return;
    }
    
    try {
      const response = await axios.get('https://www.alphavantage.co/query', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: apiKey
        },
        timeout: 15000
      });
      
      if (response.data['Global Quote']) {
        const quote = response.data['Global Quote'];
        ctx.body = {
          success: true,
          data: {
            symbol: quote['01. symbol'],
            open: parseFloat(quote['02. open']),
            high: parseFloat(quote['03. high']),
            low: parseFloat(quote['04. low']),
            price: parseFloat(quote['05. price']),
            volume: parseInt(quote['06. volume']),
            latestTradingDay: quote['07. latest trading day'],
            previousClose: parseFloat(quote['08. previous close']),
            change: parseFloat(quote['09. change']),
            changePercent: quote['10. change percent']
          },
          message: '获取股票行情成功'
        };
      } else {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: response.data['Error Message'] || '获取股票行情失败'
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
    const { symbol, interval = 'daily' } = ctx.query;
    
    if (!symbol) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少股票代码参数'
      };
      return;
    }
    
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Alpha Vantage API Key未配置'
      };
      return;
    }
    
    try {
      const functionMap = {
        '1min': 'TIME_SERIES_INTRADAY',
        '5min': 'TIME_SERIES_INTRADAY',
        '15min': 'TIME_SERIES_INTRADAY',
        '30min': 'TIME_SERIES_INTRADAY',
        '60min': 'TIME_SERIES_INTRADAY',
        'daily': 'TIME_SERIES_DAILY',
        'weekly': 'TIME_SERIES_WEEKLY',
        'monthly': 'TIME_SERIES_MONTHLY'
      };
      
      const params = {
        function: functionMap[interval] || 'TIME_SERIES_DAILY',
        symbol: symbol,
        apikey: apiKey
      };
      
      if (functionMap[interval] === 'TIME_SERIES_INTRADAY') {
        params.interval = interval;
      }
      
      const response = await axios.get('https://www.alphavantage.co/query', {
        params: params,
        timeout: 20000
      });
      
      const data = response.data;
      const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'));
      
      if (timeSeriesKey && data[timeSeriesKey]) {
        const timeSeries = data[timeSeriesKey];
        const history = Object.entries(timeSeries).map(([date, values]) => ({
          date: date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'])
        }));
        
        ctx.body = {
          success: true,
          data: history,
          message: '获取历史数据成功'
        };
      } else {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: data['Error Message'] || '获取历史数据失败'
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
        message: '缺少搜索关键词'
      };
      return;
    }
    
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Alpha Vantage API Key未配置'
      };
      return;
    }
    
    try {
      const response = await axios.get('https://www.alphavantage.co/query', {
        params: {
          function: 'SYMBOL_SEARCH',
          keywords: keyword,
          apikey: apiKey
        },
        timeout: 15000
      });
      
      if (response.data.bestMatches) {
        ctx.body = {
          success: true,
          data: response.data.bestMatches.map(match => ({
            symbol: match['1. symbol'],
            name: match['2. name'],
            type: match['3. type'],
            region: match['4. region'],
            marketOpen: match['5. marketOpen'],
            marketClose: match['6. marketClose'],
            timezone: match['7. timezone'],
            currency: match['8. currency']
          })),
          message: '搜索股票成功'
        };
      } else {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: response.data['Error Message'] || '搜索股票失败'
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
  
  // 获取股票列表
  async stockList() {
    const { ctx } = this;
    
    ctx.status = 501;
    ctx.body = {
      success: false,
      message: 'Alpha Vantage不提供股票列表API',
      recommendation: '请使用搜索功能查找特定股票'
    };
  }
  
  // 获取新闻
  async news() {
    const { ctx } = this;
    
    ctx.status = 501;
    ctx.body = {
      success: false,
      message: 'Alpha Vantage不提供新闻API',
      recommendation: '请使用其他数据源获取财经新闻'
    };
  }
}

module.exports = AlphaVantageController;
