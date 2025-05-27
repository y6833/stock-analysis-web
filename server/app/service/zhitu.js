'use strict';

const Service = require('egg').Service;
const axios = require('axios');

/**
 * 智兔数服API服务
 */
class ZhituService extends Service {
  constructor(ctx) {
    super(ctx);

    // 从环境变量获取配置
    this.apiToken = process.env.ZHITU_API_KEY; // 使用您提供的token
    this.baseURL = process.env.ZHITU_BASE_URL || 'https://api.zhitudata.com';

    // 创建axios实例
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HappyStockMarket/1.0'
      }
    });

    // 添加请求拦截器
    this.client.interceptors.request.use(
      config => {
        // 添加认证信息 - 使用Bearer token
        if (this.apiToken) {
          config.headers['Authorization'] = `Bearer ${this.apiToken}`;
          // 也尝试其他可能的认证方式
          config.headers['X-API-Token'] = this.apiToken;
          config.headers['token'] = this.apiToken;
        }

        this.ctx.logger.info(`智兔数服API请求: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      error => {
        this.ctx.logger.error('智兔数服API请求拦截器错误:', error);
        return Promise.reject(error);
      }
    );

    // 添加响应拦截器
    this.client.interceptors.response.use(
      response => {
        this.ctx.logger.info(`智兔数服API响应: ${response.status} ${response.config.url}`);
        return response;
      },
      error => {
        this.ctx.logger.error('智兔数服API响应错误:', error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 验证API配置
   */
  validateConfig() {
    if (!this.apiToken) {
      throw new Error('智兔数服API token未配置，请设置环境变量 ZHITU_API_KEY');
    }
  }

  /**
   * 获取股票列表
   */
  async getStockList() {
    try {
      this.validateConfig();

      const response = await this.client.get('/api/v1/stock/list', {
        params: {
          market: 'all',
          status: 'active',
          page: 1,
          limit: 5000
        }
      });

      if (response.data && response.data.code === 0) {
        return {
          success: true,
          data: response.data.data || [],
          message: response.data.message || '获取成功'
        };
      } else {
        throw new Error(response.data?.message || '智兔数服API返回错误');
      }
    } catch (error) {
      this.ctx.logger.error('智兔数服获取股票列表失败:', error);
      throw new Error(`智兔数服获取股票列表失败: ${error.message}`);
    }
  }

  /**
   * 获取股票详细数据
   */
  async getStockDetail(symbol) {
    try {
      this.validateConfig();

      const response = await this.client.get('/api/v1/stock/detail', {
        params: {
          symbol: symbol,
          fields: 'basic,quote,financial'
        }
      });

      if (response.data && response.data.code === 0) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message || '获取成功'
        };
      } else {
        throw new Error(response.data?.message || '智兔数服API返回错误');
      }
    } catch (error) {
      this.ctx.logger.error(`智兔数服获取股票${symbol}详细数据失败:`, error);
      throw new Error(`智兔数服获取股票${symbol}详细数据失败: ${error.message}`);
    }
  }

  /**
   * 搜索股票
   */
  async searchStocks(keyword) {
    try {
      this.validateConfig();

      const response = await this.client.get('/api/v1/stock/search', {
        params: {
          keyword: keyword,
          limit: 50
        }
      });

      if (response.data && response.data.code === 0) {
        return {
          success: true,
          data: response.data.data || [],
          message: response.data.message || '搜索成功'
        };
      } else {
        throw new Error(response.data?.message || '智兔数服API返回错误');
      }
    } catch (error) {
      this.ctx.logger.error(`智兔数服搜索股票"${keyword}"失败:`, error);
      throw new Error(`智兔数服搜索股票"${keyword}"失败: ${error.message}`);
    }
  }

  /**
   * 获取股票实时行情
   */
  async getStockQuote(symbol) {
    try {
      this.validateConfig();

      const response = await this.client.get('/api/v1/stock/quote', {
        params: {
          symbol: symbol
        }
      });

      if (response.data && response.data.code === 0) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message || '获取成功'
        };
      } else {
        throw new Error(response.data?.message || '智兔数服API返回错误');
      }
    } catch (error) {
      this.ctx.logger.error(`智兔数服获取股票${symbol}实时行情失败:`, error);
      throw new Error(`智兔数服获取股票${symbol}实时行情失败: ${error.message}`);
    }
  }

  /**
   * 获取财经新闻
   */
  async getFinancialNews(limit = 10) {
    try {
      this.validateConfig();

      const response = await this.client.get('/api/v1/news/financial', {
        params: {
          limit: limit,
          category: 'stock'
        }
      });

      if (response.data && response.data.code === 0) {
        return {
          success: true,
          data: response.data.data || [],
          message: response.data.message || '获取成功'
        };
      } else {
        throw new Error(response.data?.message || '智兔数服API返回错误');
      }
    } catch (error) {
      this.ctx.logger.error('智兔数服获取财经新闻失败:', error);
      throw new Error(`智兔数服获取财经新闻失败: ${error.message}`);
    }
  }

  /**
   * 测试API连接
   */
  async testConnection() {
    try {
      this.validateConfig();

      const response = await this.client.get('/api/v1/ping', {
        timeout: 5000
      });

      if (response.status === 200) {
        return {
          success: true,
          message: '智兔数服连接测试成功'
        };
      } else {
        throw new Error('连接测试失败');
      }
    } catch (error) {
      this.ctx.logger.error('智兔数服连接测试失败:', error);
      return {
        success: false,
        message: `智兔数服连接测试失败: ${error.message}`
      };
    }
  }

  /**
   * 获取API使用统计
   */
  async getApiUsage() {
    try {
      this.validateConfig();

      const response = await this.client.get('/api/v1/usage');

      if (response.data && response.data.code === 0) {
        return {
          success: true,
          data: response.data.data,
          message: '获取API使用统计成功'
        };
      } else {
        throw new Error(response.data?.message || '获取API使用统计失败');
      }
    } catch (error) {
      this.ctx.logger.error('智兔数服获取API使用统计失败:', error);
      throw new Error(`智兔数服获取API使用统计失败: ${error.message}`);
    }
  }
}

module.exports = ZhituService;
