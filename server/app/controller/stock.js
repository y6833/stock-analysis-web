'use strict';

const Controller = require('egg').Controller;

class StockController extends Controller {
  // 获取股票实时行情
  async getQuote() {
    const { ctx, service } = this;
    const stockCode = ctx.params.code;

    try {
      // 直接从 API 获取，如果 API 失败会自动尝试从缓存获取
      const quote = await service.stock.getStockQuote(stockCode);

      // 设置响应头中的数据来源
      if (quote.data_source) {
        ctx.set('X-Data-Source', quote.data_source);
      } else if (quote.fromCache) {
        ctx.set('X-Data-Source', 'cache');
      } else {
        ctx.set('X-Data-Source', 'api');
      }

      // 返回数据，保留原有的数据来源信息
      ctx.body = quote;
    } catch (err) {
      if (err.message === '未找到股票行情数据') {
        ctx.status = 404;
        ctx.body = {
          error: true,
          message: '未找到股票行情数据',
          code: 'STOCK_NOT_FOUND',
          data_source: 'error',
          data_source_message: '未找到股票行情数据'
        };
      } else {
        ctx.status = 500;
        ctx.body = {
          error: true,
          message: err.message || '获取股票行情失败',
          code: 'API_ERROR',
          data_source: 'error',
          data_source_message: `获取数据失败: ${err.message}`
        };
      }
      ctx.logger.error(err);
    }
  }

  // 获取股票历史数据
  async getHistory() {
    const { ctx, service } = this;
    const stockCode = ctx.params.code;
    const { start_date, end_date } = ctx.query;

    try {
      const history = await service.stock.getStockHistory(
        stockCode,
        start_date || service.stock.getDateString(-30), // 默认30天前
        end_date || service.stock.getDateString(0)      // 默认今天
      );

      // 设置响应头中的数据来源
      if (history.data_source) {
        ctx.set('X-Data-Source', history.data_source);
      }

      // 返回数据，保留原有的数据来源信息
      ctx.body = history;
    } catch (err) {
      ctx.status = 500;
      ctx.body = {
        message: '获取股票历史数据失败',
        data_source: 'error',
        data_source_message: `获取数据失败: ${err.message}`
      };
      ctx.logger.error(err);
    }
  }

  // 获取股票列表
  async getStockList() {
    const { ctx, service } = this;

    try {
      const result = await service.stock.getStockList();

      // 设置响应头中的数据来源
      if (result.data_source) {
        ctx.set('X-Data-Source', result.data_source);
      }

      // 检查是否有数据
      if (result.data && result.data.length > 0) {
        // 返回数据，保留原有的数据来源信息
        ctx.body = result;
      } else if (result.count && result.count > 0) {
        // 兼容旧格式
        ctx.body = result;
      } else {
        ctx.status = 404;
        ctx.body = {
          message: '未找到股票列表数据',
          data_source: 'error',
          data_source_message: '未找到股票列表数据'
        };
      }
    } catch (err) {
      ctx.status = 500;
      ctx.body = {
        message: '获取股票列表失败',
        data_source: 'error',
        data_source_message: `获取数据失败: ${err.message}`
      };
      ctx.logger.error(err);
    }
  }

  // 测试 Redis 连接和数据存储
  async testRedis() {
    const { ctx, service } = this;

    try {
      const result = await service.stock.testRedisStorage();

      // 设置响应头中的数据来源
      if (result.data_source) {
        ctx.set('X-Data-Source', result.data_source);
      }

      ctx.body = result;
    } catch (err) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '测试 Redis 失败',
        error: err.message || '未知错误',
        data_source: 'error',
        data_source_message: `测试Redis失败: ${err.message}`
      };
      ctx.logger.error(err);
    }
  }

  // 主动存储股票数据到 Redis
  async storeStockData() {
    const { ctx, service } = this;
    const { code } = ctx.query;

    if (!code) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少股票代码参数',
        error: '请提供股票代码，例如：?code=000001.SZ',
        data_source: 'error',
        data_source_message: '参数错误'
      };
      return;
    }

    try {
      const result = await service.stock.storeStockDataToRedis(code);

      // 设置响应头中的数据来源
      if (result.data_source) {
        ctx.set('X-Data-Source', result.data_source);
      }

      ctx.body = result;
    } catch (err) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '存储股票数据到 Redis 失败',
        error: err.message || '未知错误',
        data_source: 'error',
        data_source_message: `存储数据失败: ${err.message}`
      };
      ctx.logger.error(err);
    }
  }

  // 批量存储多只股票数据到 Redis
  async storeAllStocks() {
    const { ctx, service } = this;
    const { codes } = ctx.query;

    try {
      // 如果没有提供股票代码，则获取股票列表
      let stockCodes = [];

      if (codes) {
        // 如果提供了股票代码，则使用提供的代码
        stockCodes = codes.split(',');
      } else {
        // 否则，获取常用股票列表
        const commonStocks = [
          '000001.SZ', // 平安银行
          '000002.SZ', // 万科A
          '000063.SZ', // 中兴通讯
          '000333.SZ', // 美的集团
          '000651.SZ', // 格力电器
          '000858.SZ', // 五粮液
          '002415.SZ', // 海康威视
          '600000.SH', // 浦发银行
          '600036.SH', // 招商银行
          '600276.SH', // 恒瑞医药
          '600519.SH', // 贵州茅台
          '600887.SH', // 伊利股份
          '601318.SH', // 中国平安
          '601398.SH', // 工商银行
          '601857.SH', // 中国石油
          '601988.SH', // 中国银行
          '603288.SH'  // 海天味业
        ];

        stockCodes = commonStocks;
      }

      if (stockCodes.length === 0) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '没有可处理的股票代码',
          error: '请提供股票代码，或者系统无法获取股票列表',
          data_source: 'error',
          data_source_message: '参数错误'
        };
        return;
      }

      // 限制一次最多处理的股票数量，避免请求过多
      const maxStocks = 20;
      if (stockCodes.length > maxStocks) {
        stockCodes = stockCodes.slice(0, maxStocks);
        ctx.logger.info(`限制处理股票数量为 ${maxStocks} 只`);
      }

      ctx.logger.info(`开始批量处理 ${stockCodes.length} 只股票`);

      // 开始批量处理
      const result = await service.stock.storeAllStocksToRedis(stockCodes);

      // 设置响应头中的数据来源
      if (result.data_source) {
        ctx.set('X-Data-Source', result.data_source);
      }

      ctx.body = result;
    } catch (err) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '批量存储股票数据到 Redis 失败',
        error: err.message || '未知错误',
        data_source: 'error',
        data_source_message: `批量存储数据失败: ${err.message}`
      };
      ctx.logger.error(err);
    }
  }
}

module.exports = StockController;
