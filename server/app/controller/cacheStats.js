'use strict';

const Controller = require('egg').Controller;

/**
 * 缓存统计控制器
 * 处理缓存统计相关的API请求
 */
class CacheStatsController extends Controller {
  /**
   * 获取缓存统计信息
   */
  async getStats() {
    const { ctx, service } = this;
    const { dataSource } = ctx.query;
    
    try {
      const stats = service.cacheStats.getStats(dataSource || null);
      ctx.body = {
        success: true,
        ...stats,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: '获取缓存统计信息失败',
        message: error.message || '未知错误',
      };
      ctx.logger.error('获取缓存统计信息失败:', error);
    }
  }
  
  /**
   * 重置缓存统计信息
   */
  async resetStats() {
    const { ctx, service } = this;
    const { dataSource } = ctx.request.body;
    
    try {
      const result = service.cacheStats.resetStats(dataSource || null);
      
      if (result.success) {
        ctx.body = result;
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          error: '重置缓存统计信息失败',
          message: result.error || '未知错误',
        };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: '重置缓存统计信息失败',
        message: error.message || '未知错误',
      };
      ctx.logger.error('重置缓存统计信息失败:', error);
    }
  }
}

module.exports = CacheStatsController;
