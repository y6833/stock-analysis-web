'use strict';

const Controller = require('egg').Controller;

/**
 * AllTick 数据源代理控制器
 * 解决前端 CORS 问题
 */
class AlltickController extends Controller {
  
  /**
   * 获取股票实时行情
   */
  async getQuote() {
    const { ctx } = this;
    
    try {
      const { symbol } = ctx.request.body;
      
      if (!symbol) {
        ctx.body = {
          success: false,
          message: '股票代码不能为空'
        };
        return;
      }
      
      // 调用 AllTick 服务
      const result = await ctx.service.alltick.getStockQuote(symbol);
      
      ctx.body = {
        success: true,
        data: result
      };
      
    } catch (error) {
      ctx.logger.error('AllTick 获取行情失败:', error);
      ctx.body = {
        success: false,
        message: error.message || 'AllTick API 调用失败'
      };
    }
  }
  
  /**
   * 获取股票历史数据
   */
  async getHistory() {
    const { ctx } = this;
    
    try {
      const { symbol, period = 'day' } = ctx.request.body;
      
      if (!symbol) {
        ctx.body = {
          success: false,
          message: '股票代码不能为空'
        };
        return;
      }
      
      // 调用 AllTick 服务
      const result = await ctx.service.alltick.getStockHistory(symbol, period);
      
      ctx.body = {
        success: true,
        data: result
      };
      
    } catch (error) {
      ctx.logger.error('AllTick 获取历史数据失败:', error);
      ctx.body = {
        success: false,
        message: error.message || 'AllTick API 调用失败'
      };
    }
  }
  
  /**
   * 获取股票列表
   */
  async getStocks() {
    const { ctx } = this;
    
    try {
      // 调用 AllTick 服务
      const result = await ctx.service.alltick.getStocks();
      
      ctx.body = {
        success: true,
        data: result
      };
      
    } catch (error) {
      ctx.logger.error('AllTick 获取股票列表失败:', error);
      ctx.body = {
        success: false,
        message: error.message || 'AllTick API 调用失败'
      };
    }
  }
  
  /**
   * 搜索股票
   */
  async searchStocks() {
    const { ctx } = this;
    
    try {
      const { query } = ctx.request.body;
      
      if (!query) {
        ctx.body = {
          success: false,
          message: '搜索关键词不能为空'
        };
        return;
      }
      
      // 调用 AllTick 服务
      const result = await ctx.service.alltick.searchStocks(query);
      
      ctx.body = {
        success: true,
        data: result
      };
      
    } catch (error) {
      ctx.logger.error('AllTick 搜索股票失败:', error);
      ctx.body = {
        success: false,
        message: error.message || 'AllTick API 调用失败'
      };
    }
  }
  
  /**
   * 测试连接
   */
  async testConnection() {
    const { ctx } = this;
    
    try {
      // 调用 AllTick 服务
      const result = await ctx.service.alltick.testConnection();
      
      ctx.body = {
        success: true,
        data: { connected: result }
      };
      
    } catch (error) {
      ctx.logger.error('AllTick 连接测试失败:', error);
      ctx.body = {
        success: false,
        message: error.message || 'AllTick 连接测试失败'
      };
    }
  }
}

module.exports = AlltickController;
