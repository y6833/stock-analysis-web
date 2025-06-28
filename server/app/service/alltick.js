'use strict';

const Service = require('egg').Service;

/**
 * AllTick 数据源服务
 */
class AlltickService extends Service {

  constructor(ctx) {
    super(ctx);

    // AllTick API 配置
    this.STOCK_BASE_URL = 'https://quote.alltick.io/quote-stock-b-api';
    this.API_TOKEN = '85b75304f6ef5a52123479654ddab44e-c-app';
    this.timeout = 15000;

    // 限流控制
    this.lastRequestTime = 0;
    this.MIN_REQUEST_INTERVAL = 1000; // 1秒间隔
  }

  /**
   * 限流延迟
   */
  async rateLimitDelay() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * 发送API请求
   */
  async makeRequest(endpoint, params) {
    await this.rateLimitDelay();

    const url = `${this.STOCK_BASE_URL}/${endpoint}`;

    // 构建查询参数
    const queryData = {
      trace: `request-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      data: params
    };

    const queryParams = new URLSearchParams({
      token: this.API_TOKEN,
      query: JSON.stringify(queryData)
    });

    const fullUrl = `${url}?${queryParams.toString()}`;

    this.ctx.logger.info(`AllTick API 请求: ${fullUrl}`);

    try {
      const response = await this.ctx.curl(fullUrl, {
        method: 'GET',
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Content-Type': 'application/json'
        },
        dataType: 'json'
      });

      this.ctx.logger.info('AllTick API 响应:', response.data);

      // 检查API响应
      if (response.data && response.data.ret !== 200) {
        throw new Error(`AllTick API错误: ${response.data.msg || '未知错误'}`);
      }

      return response.data;

    } catch (error) {
      this.ctx.logger.error('AllTick API 请求失败:', error);
      throw new Error(`AllTick API请求失败: ${error.message}`);
    }
  }

  /**
   * 格式化股票代码为AllTick格式
   */
  formatSymbolForAlltick(symbol) {
    // 处理A股代码
    if (/^\d{6}$/.test(symbol)) {
      const code = parseInt(symbol);
      if (code >= 600000 && code <= 699999) {
        return `${symbol}.SH`; // 上海主板
      } else if (code >= 0 && code <= 399999) {
        return `${symbol}.SZ`; // 深圳主板/中小板/创业板
      }
    }

    // 处理港股代码 - AllTick 需要去掉前导零
    if (/^\d{1,5}$/.test(symbol)) {
      return `${parseInt(symbol)}.HK`;
    }

    // 处理已经包含 .HK 但有前导零的情况
    if (symbol.includes('.HK')) {
      const parts = symbol.split('.HK');
      const code = parseInt(parts[0]);
      return `${code}.HK`;
    }

    // 处理美股代码
    if (/^[A-Z]+$/.test(symbol)) {
      return `${symbol}.US`;
    }

    return symbol;
  }

  /**
   * 获取股票实时行情
   */
  async getStockQuote(symbol) {
    try {
      const alltickSymbol = this.formatSymbolForAlltick(symbol);

      const params = {
        symbol_list: [{ code: alltickSymbol }]
      };

      const data = await this.makeRequest('trade-tick', params);

      if (!data.data || !data.data.tick_list || data.data.tick_list.length === 0) {
        throw new Error('行情数据不存在');
      }

      const tick = data.data.tick_list[0];

      return {
        symbol: symbol,
        name: symbol,
        price: parseFloat(tick.price),
        open: parseFloat(tick.price),
        high: parseFloat(tick.price),
        low: parseFloat(tick.price),
        close: parseFloat(tick.price),
        pre_close: parseFloat(tick.price),
        change: 0,
        pct_chg: 0,
        vol: parseFloat(tick.volume || '0'),
        amount: parseFloat(tick.turnover || '0'),
        update_time: new Date(parseInt(tick.tick_time)).toISOString(),
        data_source: 'alltick'
      };

    } catch (error) {
      throw new Error(`AllTick股票行情获取失败: ${error.message}`);
    }
  }

  /**
   * 获取股票历史数据
   */
  async getStockHistory(symbol, period = 'day') {
    try {
      const alltickSymbol = this.formatSymbolForAlltick(symbol);

      // 映射周期类型
      let klineType = 8; // 默认日K
      switch (period) {
        case 'minute':
          klineType = 1;
          break;
        case '5min':
          klineType = 2;
          break;
        case '15min':
          klineType = 3;
          break;
        case '30min':
          klineType = 4;
          break;
        case 'hour':
          klineType = 5;
          break;
        case 'day':
          klineType = 8;
          break;
        case 'week':
          klineType = 9;
          break;
        case 'month':
          klineType = 10;
          break;
      }

      const params = {
        code: alltickSymbol,
        kline_type: klineType,
        kline_timestamp_end: 0,
        query_kline_num: 100,
        adjust_type: 0
      };

      const data = await this.makeRequest('kline', params);

      if (!data.data || !data.data.kline_list) {
        return [];
      }

      return data.data.kline_list.map(kline => ({
        symbol: symbol,
        date: new Date(parseInt(kline.timestamp) * 1000).toISOString().split('T')[0],
        open: parseFloat(kline.open_price),
        high: parseFloat(kline.high_price),
        low: parseFloat(kline.low_price),
        close: parseFloat(kline.close_price),
        volume: parseFloat(kline.volume || '0'),
        turnover: parseFloat(kline.turnover || '0'),
        change: 0,
        changePercent: 0
      })).reverse();

    } catch (error) {
      throw new Error(`AllTick历史数据获取失败: ${error.message}`);
    }
  }

  /**
   * 获取股票列表
   */
  async getStocks() {
    // AllTick没有直接的股票列表接口，返回常用股票
    const popularStocks = [
      { symbol: '000001', name: '平安银行', market: 'SZ', industry: '银行', area: 'CN' },
      { symbol: '000002', name: '万科A', market: 'SZ', industry: '房地产', area: 'CN' },
      { symbol: '600000', name: '浦发银行', market: 'SH', industry: '银行', area: 'CN' },
      { symbol: '600036', name: '招商银行', market: 'SH', industry: '银行', area: 'CN' },
      { symbol: '00700', name: '腾讯控股', market: 'HK', industry: '科技', area: 'HK' },
      { symbol: '00941', name: '中国移动', market: 'HK', industry: '通信', area: 'HK' },
      { symbol: 'AAPL', name: 'Apple Inc.', market: 'US', industry: 'Technology', area: 'US' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', market: 'US', industry: 'Technology', area: 'US' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'US', industry: 'Technology', area: 'US' },
      { symbol: 'TSLA', name: 'Tesla, Inc.', market: 'US', industry: 'Automotive', area: 'US' }
    ];

    return popularStocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      market: stock.market,
      listDate: '',
      industry: stock.industry,
      area: stock.area
    }));
  }

  /**
   * 搜索股票
   */
  async searchStocks(query) {
    const stocks = await this.getStocks();
    return stocks.filter(stock =>
      stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
      stock.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * 测试连接
   */
  async testConnection() {
    try {
      const quote = await this.getStockQuote('AAPL');
      return !!(quote && quote.symbol && quote.price > 0);
    } catch (error) {
      this.ctx.logger.error('AllTick连接测试失败:', error);
      return false;
    }
  }
}

module.exports = AlltickService;
