'use strict';

const Service = require('egg').Service;
const axios = require('axios');

/**
 * Google Finance API服务（使用Alpha Vantage替代）
 */
class GoogleFinanceService extends Service {
  constructor(ctx) {
    super(ctx);
    
    // 从环境变量获取配置
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    this.baseURL = process.env.ALPHA_VANTAGE_BASE_URL || 'https://www.alphavantage.co';
    
    // 创建axios实例
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HappyStockMarket/1.0'
      }
    });
    
    // 添加请求拦截器
    this.client.interceptors.request.use(
      config => {
        // Alpha Vantage使用查询参数传递API密钥
        if (this.apiKey) {
          config.params = config.params || {};
          config.params.apikey = this.apiKey;
        }
        
        this.ctx.logger.info(`Alpha Vantage API请求: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      error => {
        this.ctx.logger.error('Alpha Vantage API请求拦截器错误:', error);
        return Promise.reject(error);
      }
    );
    
    // 添加响应拦截器
    this.client.interceptors.response.use(
      response => {
        this.ctx.logger.info(`Alpha Vantage API响应: ${response.status} ${response.config.url}`);
        return response;
      },
      error => {
        this.ctx.logger.error('Alpha Vantage API响应错误:', error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 验证API配置
   */
  validateConfig() {
    if (!this.apiKey) {
      throw new Error('Alpha Vantage API密钥未配置，请设置环境变量 ALPHA_VANTAGE_API_KEY');
    }
  }

  /**
   * 获取股票列表（获取热门美股）
   */
  async getStockList() {
    try {
      this.validateConfig();
      
      // Alpha Vantage没有直接的股票列表API，我们获取一些热门股票的数据
      const popularSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'BRK.B', 'JNJ', 'V'];
      const stocks = [];
      
      // 批量获取股票信息
      for (const symbol of popularSymbols.slice(0, 5)) { // 限制数量避免API限制
        try {
          const response = await this.client.get('/query', {
            params: {
              function: 'OVERVIEW',
              symbol: symbol
            }
          });
          
          if (response.data && !response.data['Error Message'] && !response.data['Note']) {
            const data = response.data;
            stocks.push({
              symbol: data.Symbol || symbol,
              name: data.Name || data.Description || symbol,
              market: data.Exchange || '美国',
              industry: data.Industry || data.Sector || '未知'
            });
          }
          
          // 添加延迟避免API限制
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          this.ctx.logger.warn(`获取股票${symbol}信息失败:`, error.message);
        }
      }
      
      // 如果没有获取到数据，返回预定义列表
      if (stocks.length === 0) {
        return {
          success: true,
          data: [
            { symbol: 'AAPL', name: 'Apple Inc.', market: '纳斯达克', industry: '科技' },
            { symbol: 'MSFT', name: 'Microsoft Corporation', market: '纳斯达克', industry: '科技' },
            { symbol: 'GOOGL', name: 'Alphabet Inc.', market: '纳斯达克', industry: '科技' },
            { symbol: 'AMZN', name: 'Amazon.com Inc.', market: '纳斯达克', industry: '消费' },
            { symbol: 'TSLA', name: 'Tesla Inc.', market: '纳斯达克', industry: '汽车' }
          ],
          message: '获取Alpha Vantage股票列表成功（预定义数据）'
        };
      }
      
      return {
        success: true,
        data: stocks,
        message: '获取Alpha Vantage股票列表成功'
      };
    } catch (error) {
      this.ctx.logger.error('Alpha Vantage获取股票列表失败:', error);
      throw new Error(`Alpha Vantage获取股票列表失败: ${error.message}`);
    }
  }

  /**
   * 获取股票详细数据
   */
  async getStockDetail(symbol) {
    try {
      this.validateConfig();
      
      // 获取股票概览信息
      const overviewResponse = await this.client.get('/query', {
        params: {
          function: 'OVERVIEW',
          symbol: symbol
        }
      });
      
      // 获取实时报价
      const quoteResponse = await this.client.get('/query', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol
        }
      });
      
      if (overviewResponse.data['Error Message'] || quoteResponse.data['Error Message']) {
        throw new Error('股票代码不存在或API调用失败');
      }
      
      if (overviewResponse.data['Note'] || quoteResponse.data['Note']) {
        throw new Error('API调用频率限制，请稍后重试');
      }
      
      const overview = overviewResponse.data;
      const quote = quoteResponse.data['Global Quote'] || {};
      
      return {
        success: true,
        data: {
          symbol: overview.Symbol || symbol,
          name: overview.Name || overview.Description,
          price: parseFloat(quote['05. price']) || 0,
          change: parseFloat(quote['09. change']) || 0,
          changePercent: parseFloat(quote['10. change percent']?.replace('%', '')) || 0,
          volume: parseInt(quote['06. volume']) || 0,
          high: parseFloat(quote['03. high']) || 0,
          low: parseFloat(quote['04. low']) || 0,
          open: parseFloat(quote['02. open']) || 0,
          close: parseFloat(quote['08. previous close']) || 0,
          marketCap: parseFloat(overview.MarketCapitalization) || 0,
          pe: parseFloat(overview.PERatio) || 0,
          pb: parseFloat(overview.PriceToBookRatio) || 0,
          timestamp: Date.now()
        },
        message: '获取股票详细数据成功'
      };
    } catch (error) {
      this.ctx.logger.error(`Alpha Vantage获取股票${symbol}详细数据失败:`, error);
      throw new Error(`Alpha Vantage获取股票${symbol}详细数据失败: ${error.message}`);
    }
  }

  /**
   * 搜索股票
   */
  async searchStocks(keyword) {
    try {
      this.validateConfig();
      
      const response = await this.client.get('/query', {
        params: {
          function: 'SYMBOL_SEARCH',
          keywords: keyword
        }
      });
      
      if (response.data['Error Message']) {
        throw new Error(response.data['Error Message']);
      }
      
      if (response.data['Note']) {
        throw new Error('API调用频率限制，请稍后重试');
      }
      
      const matches = response.data['bestMatches'] || [];
      
      return {
        success: true,
        data: matches.map(match => ({
          symbol: match['1. symbol'],
          name: match['2. name'],
          market: match['4. region'] || '美国',
          industry: match['3. type'] || '未知'
        })),
        message: '搜索股票成功'
      };
    } catch (error) {
      this.ctx.logger.error(`Alpha Vantage搜索股票"${keyword}"失败:`, error);
      throw new Error(`Alpha Vantage搜索股票"${keyword}"失败: ${error.message}`);
    }
  }

  /**
   * 获取股票实时行情
   */
  async getStockQuote(symbol) {
    try {
      this.validateConfig();
      
      const response = await this.client.get('/query', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol
        }
      });
      
      if (response.data['Error Message']) {
        throw new Error(response.data['Error Message']);
      }
      
      if (response.data['Note']) {
        throw new Error('API调用频率限制，请稍后重试');
      }
      
      const quote = response.data['Global Quote'] || {};
      
      return {
        success: true,
        data: {
          symbol: quote['01. symbol'] || symbol,
          name: symbol, // Alpha Vantage的GLOBAL_QUOTE不包含公司名称
          price: parseFloat(quote['05. price']) || 0,
          change: parseFloat(quote['09. change']) || 0,
          changePercent: parseFloat(quote['10. change percent']?.replace('%', '')) || 0,
          volume: parseInt(quote['06. volume']) || 0,
          timestamp: Date.now()
        },
        message: '获取股票实时行情成功'
      };
    } catch (error) {
      this.ctx.logger.error(`Alpha Vantage获取股票${symbol}实时行情失败:`, error);
      throw new Error(`Alpha Vantage获取股票${symbol}实时行情失败: ${error.message}`);
    }
  }

  /**
   * 获取财经新闻
   */
  async getFinancialNews(limit = 10) {
    try {
      this.validateConfig();
      
      const response = await this.client.get('/query', {
        params: {
          function: 'NEWS_SENTIMENT',
          limit: limit
        }
      });
      
      if (response.data['Error Message']) {
        throw new Error(response.data['Error Message']);
      }
      
      if (response.data['Note']) {
        throw new Error('API调用频率限制，请稍后重试');
      }
      
      const feed = response.data.feed || [];
      
      return {
        success: true,
        data: feed.slice(0, limit).map(item => ({
          id: item.url || Math.random().toString(),
          title: item.title,
          summary: item.summary || '',
          url: item.url || '#',
          publishTime: new Date(item.time_published).getTime() || Date.now(),
          source: item.source || 'Alpha Vantage'
        })),
        message: '获取财经新闻成功'
      };
    } catch (error) {
      this.ctx.logger.error('Alpha Vantage获取财经新闻失败:', error);
      throw new Error(`Alpha Vantage获取财经新闻失败: ${error.message}`);
    }
  }

  /**
   * 测试API连接
   */
  async testConnection() {
    try {
      this.validateConfig();
      
      const response = await this.client.get('/query', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: 'AAPL'
        },
        timeout: 5000
      });
      
      if (response.status === 200 && !response.data['Error Message']) {
        return {
          success: true,
          message: 'Alpha Vantage连接测试成功'
        };
      } else {
        throw new Error(response.data['Error Message'] || '连接测试失败');
      }
    } catch (error) {
      this.ctx.logger.error('Alpha Vantage连接测试失败:', error);
      return {
        success: false,
        message: `Alpha Vantage连接测试失败: ${error.message}`
      };
    }
  }
}

module.exports = GoogleFinanceService;
