'use strict';

const Controller = require('egg').Controller;

class StockController extends Controller {
  // 获取股票实时行情
  async getQuote() {
    const { ctx, service } = this;
    const stockCode = ctx.params.code;
    
    try {
      const quote = await service.stock.getStockQuote(stockCode);
      if (!quote) {
        ctx.status = 404;
        ctx.body = { message: '未找到股票行情数据' };
        return;
      }
      ctx.body = quote;
    } catch (err) {
      ctx.status = 500;
      ctx.body = { message: '获取股票行情失败' };
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
      ctx.body = history;
    } catch (err) {
      ctx.status = 500;
      ctx.body = { message: '获取股票历史数据失败' };
      ctx.logger.error(err);
    }
  }
}

module.exports = StockController;
