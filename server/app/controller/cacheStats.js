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
      // 确保全局缓存统计已初始化
      if (!global.cacheStats) {
        global.cacheStats = {
          hits: 0,
          misses: 0,
          requests: 0,
          apiCalls: 0,
          errors: 0,
          lastReset: new Date().toISOString(),
          dataSourceStats: {},
          apiStats: {},
        };
      }

      // 如果指定了数据源，返回该数据源的统计
      if (dataSource) {
        const sourceStats = global.cacheStats.dataSourceStats[dataSource] || {
          hits: 0,
          misses: 0,
          requests: 0,
          apiCalls: 0,
          errors: 0,
        };

        ctx.body = {
          success: true,
          dataSource: dataSource,
          ...sourceStats,
          hitRate: sourceStats.requests > 0 ?
            ((sourceStats.hits / sourceStats.requests) * 100).toFixed(2) : '0.00'
        };
      } else {
        // 返回全局统计
        const stats = service.cacheStats.getStats(null);
        ctx.body = {
          success: true,
          ...stats,
        };
      }
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
