'use strict';

const Service = require('egg').Service;
const axios = require('axios');

/**
 * Yahoo Finance API服务
 */
class YahooFinanceService extends Service {
  constructor(ctx) {
    super(ctx);
    
    // 从环境变量获取配置
    this.isFreeVersion = process.env.YAHOO_FINANCE_FREE === 'true';
    this.apiKey = process.env.YAHOO_FINANCE_RAPIDAPI_KEY;
    this.apiHost = process.env.YAHOO_FINANCE_RAPIDAPI_HOST || 'yahoo-finance1.p.rapidapi.com';
    
    // 根据版本设置不同的基础URL
    this.baseURL = this.isFreeVersion 
      ? 'https://query1.finance.yahoo.com'
      : 'https://yahoo-finance1.p.rapidapi.com';
    
    // 创建axios实例
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: this.isFreeVersion ? {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; HappyStockMarket/1.0)'
      } : {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': this.apiHost
      }
    });
    
    // 添加请求拦截器
    this.client.interceptors.request.use(
      config => {
        this.ctx.logger.info(`Yahoo Finance API请求: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      error => {
        this.ctx.logger.error('Yahoo Finance API请求拦截器错误:', error);
        return Promise.reject(error);
      }
    );
    
    // 添加响应拦截器
    this.client.interceptors.response.use(
      response => {
        this.ctx.logger.info(`Yahoo Finance API响应: ${response.status} ${response.config.url}`);
        return response;
      },
      error => {
        this.ctx.logger.error('Yahoo Finance API响应错误:', error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 验证API配置
   */
  validateConfig() {
    if (!this.isFreeVersion && !this.apiKey) {
      throw new Error('Yahoo Finance付费版API密钥未配置，请设置环境变量 YAHOO_FINANCE_RAPIDAPI_KEY');
    }
  }

  /**
   * 获取股票列表（美股主要股票）
   */
  async getStockList() {
    try {
      if (this.isFreeVersion) {
        // 免费版本：获取S&P 500成分股
        const response = await this.client.get('/v1/finance/screener', {
          params: {
            crumb: 'dummy',
            lang: 'en-US',
            region: 'US',
            formatted: 'true',
            corsDomain: 'finance.yahoo.com'
          }
        });
        
        if (response.data && response.data.finance && response.data.finance.result) {
          const stocks = response.data.finance.result[0]?.quotes || [];
          return {
            success: true,
            data: stocks.map(stock => ({
              symbol: stock.symbol,
              name: stock.longName || stock.shortName,
              market: stock.exchange || '美国',
              industry: stock.sector || '未知'
            })),
            message: '获取Yahoo Finance股票列表成功'
          };
        }
      } else {
        // 付费版本：使用RapidAPI
        this.validateConfig();
        
        const response = await this.client.get('/market/v2/get-quotes', {
          params: {
            region: 'US',
            symbols: 'AAPL,MSFT,GOOGL,AMZN,TSLA,META,NVDA,BRK-B,JNJ,V'
          }
        });
        
        if (response.data && response.data.quoteResponse) {
          const stocks = response.data.quoteResponse.result || [];
          return {
            success: true,
            data: stocks.map(stock => ({
              symbol: stock.symbol,
              name: stock.longName || stock.shortName,
              market: stock.exchange || '美国',
              industry: stock.sector || '未知'
            })),
            message: '获取Yahoo Finance股票列表成功'
          };
        }
      }
      
      throw new Error('Yahoo Finance API返回数据格式错误');
    } catch (error) {
      this.ctx.logger.error('Yahoo Finance获取股票列表失败:', error);
      throw new Error(`Yahoo Finance获取股票列表失败: ${error.message}`);
    }
  }

  /**
   * 获取股票详细数据
   */
  async getStockDetail(symbol) {
    try {
      if (this.isFreeVersion) {
        // 免费版本
        const response = await this.client.get('/v8/finance/chart/' + symbol, {
          params: {
            interval: '1d',
            range: '1d',
            includePrePost: 'true'
          }
        });
        
        if (response.data && response.data.chart && response.data.chart.result) {
          const result = response.data.chart.result[0];
          const meta = result.meta;
          
          return {
            success: true,
            data: {
              symbol: meta.symbol,
              name: meta.longName || meta.shortName,
              price: meta.regularMarketPrice,
              change: meta.regularMarketPrice - meta.previousClose,
              changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
              volume: meta.regularMarketVolume,
              high: meta.regularMarketDayHigh,
              low: meta.regularMarketDayLow,
              open: meta.regularMarketOpen,
              close: meta.previousClose,
              marketCap: meta.marketCap,
              timestamp: Date.now()
            },
            message: '获取股票详细数据成功'
          };
        }
      } else {
        // 付费版本
        this.validateConfig();
        
        const response = await this.client.get('/stock/v2/get-summary', {
          params: {
            symbol: symbol,
            region: 'US'
          }
        });
        
        if (response.data && response.data.price) {
          const price = response.data.price;
          const summaryDetail = response.data.summaryDetail || {};
          
          return {
            success: true,
            data: {
              symbol: price.symbol,
              name: price.longName || price.shortName,
              price: price.regularMarketPrice?.raw || 0,
              change: price.regularMarketChange?.raw || 0,
              changePercent: price.regularMarketChangePercent?.raw || 0,
              volume: price.regularMarketVolume?.raw || 0,
              high: price.regularMarketDayHigh?.raw || 0,
              low: price.regularMarketDayLow?.raw || 0,
              open: price.regularMarketOpen?.raw || 0,
              close: price.regularMarketPreviousClose?.raw || 0,
              marketCap: price.marketCap?.raw || 0,
              pe: summaryDetail.trailingPE?.raw || 0,
              pb: summaryDetail.priceToBook?.raw || 0,
              timestamp: Date.now()
            },
            message: '获取股票详细数据成功'
          };
        }
      }
      
      throw new Error('Yahoo Finance API返回数据格式错误');
    } catch (error) {
      this.ctx.logger.error(`Yahoo Finance获取股票${symbol}详细数据失败:`, error);
      throw new Error(`Yahoo Finance获取股票${symbol}详细数据失败: ${error.message}`);
    }
  }

  /**
   * 搜索股票
   */
  async searchStocks(keyword) {
    try {
      if (this.isFreeVersion) {
        // 免费版本
        const response = await this.client.get('/v1/finance/search', {
          params: {
            q: keyword,
            quotesCount: 20,
            newsCount: 0
          }
        });
        
        if (response.data && response.data.quotes) {
          return {
            success: true,
            data: response.data.quotes.map(stock => ({
              symbol: stock.symbol,
              name: stock.longname || stock.shortname,
              market: stock.exchange || '美国',
              industry: stock.sector || '未知'
            })),
            message: '搜索股票成功'
          };
        }
      } else {
        // 付费版本
        this.validateConfig();
        
        const response = await this.client.get('/auto-complete', {
          params: {
            q: keyword,
            region: 'US'
          }
        });
        
        if (response.data && response.data.quotes) {
          return {
            success: true,
            data: response.data.quotes.map(stock => ({
              symbol: stock.symbol,
              name: stock.longname || stock.shortname,
              market: stock.exchange || '美国',
              industry: stock.sector || '未知'
            })),
            message: '搜索股票成功'
          };
        }
      }
      
      throw new Error('Yahoo Finance API返回数据格式错误');
    } catch (error) {
      this.ctx.logger.error(`Yahoo Finance搜索股票"${keyword}"失败:`, error);
      throw new Error(`Yahoo Finance搜索股票"${keyword}"失败: ${error.message}`);
    }
  }

  /**
   * 获取财经新闻
   */
  async getFinancialNews(limit = 10) {
    try {
      if (this.isFreeVersion) {
        // 免费版本
        const response = await this.client.get('/v1/finance/trending/US', {
          params: {
            count: limit
          }
        });
        
        if (response.data && response.data.finance && response.data.finance.result) {
          const news = response.data.finance.result[0]?.quotes || [];
          return {
            success: true,
            data: news.slice(0, limit).map((item, index) => ({
              id: index.toString(),
              title: `${item.longName || item.shortName} 股票动态`,
              summary: `${item.symbol} 当前价格: $${item.regularMarketPrice}`,
              url: `https://finance.yahoo.com/quote/${item.symbol}`,
              publishTime: Date.now(),
              source: 'Yahoo Finance'
            })),
            message: '获取财经新闻成功'
          };
        }
      } else {
        // 付费版本
        this.validateConfig();
        
        const response = await this.client.get('/news/v2/list', {
          params: {
            region: 'US',
            snippetCount: limit
          }
        });
        
        if (response.data && response.data.data && response.data.data.main) {
          const news = response.data.data.main.stream || [];
          return {
            success: true,
            data: news.slice(0, limit).map(item => ({
              id: item.id || Math.random().toString(),
              title: item.content?.title || '',
              summary: item.content?.summary || '',
              url: item.content?.clickThroughUrl?.url || '#',
              publishTime: item.content?.pubDate || Date.now(),
              source: item.content?.provider?.displayName || 'Yahoo Finance'
            })),
            message: '获取财经新闻成功'
          };
        }
      }
      
      throw new Error('Yahoo Finance API返回数据格式错误');
    } catch (error) {
      this.ctx.logger.error('Yahoo Finance获取财经新闻失败:', error);
      throw new Error(`Yahoo Finance获取财经新闻失败: ${error.message}`);
    }
  }

  /**
   * 测试API连接
   */
  async testConnection() {
    try {
      const response = await this.client.get(this.isFreeVersion ? '/v1/test/ping' : '/market/v2/get-quotes', {
        timeout: 5000,
        params: this.isFreeVersion ? {} : { symbols: 'AAPL' }
      });
      
      if (response.status === 200) {
        return {
          success: true,
          message: 'Yahoo Finance连接测试成功'
        };
      } else {
        throw new Error('连接测试失败');
      }
    } catch (error) {
      this.ctx.logger.error('Yahoo Finance连接测试失败:', error);
      return {
        success: false,
        message: `Yahoo Finance连接测试失败: ${error.message}`
      };
    }
  }
}

module.exports = YahooFinanceService;
