'use strict';

const Service = require('egg').Service;
const axios = require('axios');

/**
 * 聚合数据API服务
 */
class JuheService extends Service {
  constructor(ctx) {
    super(ctx);
    
    // 从环境变量获取配置
    this.apiKey = process.env.JUHE_API_KEY;
    this.baseURL = process.env.JUHE_BASE_URL || 'http://web.juhe.cn/finance';
    
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
        // 聚合数据使用查询参数传递API密钥
        if (this.apiKey) {
          config.params = config.params || {};
          config.params.key = this.apiKey;
        }
        
        this.ctx.logger.info(`聚合数据API请求: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      error => {
        this.ctx.logger.error('聚合数据API请求拦截器错误:', error);
        return Promise.reject(error);
      }
    );
    
    // 添加响应拦截器
    this.client.interceptors.response.use(
      response => {
        this.ctx.logger.info(`聚合数据API响应: ${response.status} ${response.config.url}`);
        return response;
      },
      error => {
        this.ctx.logger.error('聚合数据API响应错误:', error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 验证API配置
   */
  validateConfig() {
    if (!this.apiKey) {
      throw new Error('聚合数据API密钥未配置，请设置环境变量 JUHE_API_KEY');
    }
  }

  /**
   * 获取股票列表（获取主要指数和热门股票）
   */
  async getStockList() {
    try {
      this.validateConfig();
      
      // 聚合数据的股票API主要提供实时行情，我们获取一些主要的股票和指数
      const response = await this.client.get('/stock/hs', {
        params: {
          gid: 'sh000001,sz399001,sz399006,sh000300,sh600519,sh600036,sz000858,sz000001'
        }
      });
      
      if (response.data && response.data.error_code === 0) {
        const stocks = response.data.result.map(item => ({
          symbol: item.gid,
          name: item.name,
          market: item.gid.startsWith('sh') ? '上海' : item.gid.startsWith('sz') ? '深圳' : '未知',
          industry: item.gid.includes('000001') || item.gid.includes('399') || item.gid.includes('000300') ? '指数' : '股票'
        }));
        
        return {
          success: true,
          data: stocks,
          message: '获取聚合数据股票列表成功'
        };
      } else {
        throw new Error(response.data?.reason || '聚合数据API返回错误');
      }
    } catch (error) {
      this.ctx.logger.error('聚合数据获取股票列表失败:', error);
      throw new Error(`聚合数据获取股票列表失败: ${error.message}`);
    }
  }

  /**
   * 获取股票详细数据
   */
  async getStockDetail(symbol) {
    try {
      this.validateConfig();
      
      const response = await this.client.get('/stock/hs', {
        params: {
          gid: symbol
        }
      });
      
      if (response.data && response.data.error_code === 0 && response.data.result.length > 0) {
        const data = response.data.result[0];
        
        return {
          success: true,
          data: {
            symbol: data.gid,
            name: data.name,
            price: parseFloat(data.nowpri) || 0,
            change: parseFloat(data.increase) || 0,
            changePercent: parseFloat(data.increPer) || 0,
            volume: parseInt(data.traAmount) || 0,
            turnover: parseFloat(data.traNumber) || 0,
            high: parseFloat(data.todayMax) || 0,
            low: parseFloat(data.todayMin) || 0,
            open: parseFloat(data.todayStartPri) || 0,
            close: parseFloat(data.yestodEndPri) || 0,
            marketCap: 0, // 聚合数据不提供市值
            pe: 0, // 聚合数据不提供PE
            pb: 0, // 聚合数据不提供PB
            timestamp: Date.now()
          },
          message: '获取股票详细数据成功'
        };
      } else {
        throw new Error(response.data?.reason || '股票代码不存在或API调用失败');
      }
    } catch (error) {
      this.ctx.logger.error(`聚合数据获取股票${symbol}详细数据失败:`, error);
      throw new Error(`聚合数据获取股票${symbol}详细数据失败: ${error.message}`);
    }
  }

  /**
   * 搜索股票（聚合数据不提供搜索功能，返回常用股票）
   */
  async searchStocks(keyword) {
    try {
      this.validateConfig();
      
      // 聚合数据不提供搜索功能，我们返回一些常用的股票供参考
      const commonStocks = [
        { symbol: 'sh000001', name: '上证指数', market: '上海', industry: '指数' },
        { symbol: 'sz399001', name: '深证成指', market: '深圳', industry: '指数' },
        { symbol: 'sz399006', name: '创业板指', market: '深圳', industry: '指数' },
        { symbol: 'sh000300', name: '沪深300', market: '上海', industry: '指数' },
        { symbol: 'sh600519', name: '贵州茅台', market: '上海', industry: '食品饮料' },
        { symbol: 'sh600036', name: '招商银行', market: '上海', industry: '银行' },
        { symbol: 'sz000858', name: '五粮液', market: '深圳', industry: '食品饮料' },
        { symbol: 'sz000001', name: '平安银行', market: '深圳', industry: '银行' }
      ];
      
      // 简单的关键词匹配
      const filteredStocks = commonStocks.filter(stock => 
        stock.symbol.toLowerCase().includes(keyword.toLowerCase()) ||
        stock.name.toLowerCase().includes(keyword.toLowerCase())
      );
      
      return {
        success: true,
        data: filteredStocks,
        message: '搜索结果（聚合数据不支持搜索，返回匹配的常用股票）'
      };
    } catch (error) {
      this.ctx.logger.error(`聚合数据搜索股票"${keyword}"失败:`, error);
      throw new Error(`聚合数据搜索股票"${keyword}"失败: ${error.message}`);
    }
  }

  /**
   * 获取股票实时行情
   */
  async getStockQuote(symbol) {
    try {
      this.validateConfig();
      
      const response = await this.client.get('/stock/hs', {
        params: {
          gid: symbol
        }
      });
      
      if (response.data && response.data.error_code === 0 && response.data.result.length > 0) {
        const data = response.data.result[0];
        
        return {
          success: true,
          data: {
            symbol: data.gid,
            name: data.name,
            price: parseFloat(data.nowpri) || 0,
            change: parseFloat(data.increase) || 0,
            changePercent: parseFloat(data.increPer) || 0,
            volume: parseInt(data.traAmount) || 0,
            timestamp: Date.now()
          },
          message: '获取股票实时行情成功'
        };
      } else {
        throw new Error(response.data?.reason || '股票代码不存在或API调用失败');
      }
    } catch (error) {
      this.ctx.logger.error(`聚合数据获取股票${symbol}实时行情失败:`, error);
      throw new Error(`聚合数据获取股票${symbol}实时行情失败: ${error.message}`);
    }
  }

  /**
   * 获取财经新闻（聚合数据不提供新闻服务）
   */
  async getFinancialNews(limit = 10) {
    try {
      // 聚合数据主要提供股票实时交易数据，不提供新闻服务
      return {
        success: true,
        data: [
          {
            id: '1',
            title: '聚合数据：专业数据服务平台',
            summary: '聚合数据提供实时股票交易数据，每天免费调用50次',
            url: 'https://www.juhe.cn/',
            publishTime: Date.now(),
            source: '聚合数据'
          }
        ],
        message: '聚合数据不提供新闻服务，返回平台信息'
      };
    } catch (error) {
      this.ctx.logger.error('聚合数据获取财经新闻失败:', error);
      throw new Error(`聚合数据获取财经新闻失败: ${error.message}`);
    }
  }

  /**
   * 测试API连接
   */
  async testConnection() {
    try {
      this.validateConfig();
      
      const response = await this.client.get('/stock/hs', {
        params: {
          gid: 'sh000001'
        },
        timeout: 5000
      });
      
      if (response.status === 200 && response.data && response.data.error_code === 0) {
        return {
          success: true,
          message: '聚合数据连接测试成功'
        };
      } else {
        throw new Error(response.data?.reason || '连接测试失败');
      }
    } catch (error) {
      this.ctx.logger.error('聚合数据连接测试失败:', error);
      return {
        success: false,
        message: `聚合数据连接测试失败: ${error.message}`
      };
    }
  }

  /**
   * 获取API使用统计
   */
  async getApiUsage() {
    try {
      // 聚合数据没有提供使用统计API，返回基本信息
      return {
        success: true,
        data: {
          dailyLimit: 50,
          usedToday: '未知',
          remaining: '未知',
          resetTime: '每日0点重置'
        },
        message: '聚合数据免费版每天可调用50次'
      };
    } catch (error) {
      this.ctx.logger.error('聚合数据获取API使用统计失败:', error);
      throw new Error(`聚合数据获取API使用统计失败: ${error.message}`);
    }
  }
}

module.exports = JuheService;
