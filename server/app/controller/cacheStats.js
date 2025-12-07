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
        // 确保 dataSourceStats 存在
        if (!global.cacheStats.dataSourceStats) {
          global.cacheStats.dataSourceStats = {};
        }
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
        // 检查服务是否存在，如果不存在则返回默认值
        let stats;
        if (service.cacheStats && typeof service.cacheStats.getStats === 'function') {
          stats = service.cacheStats.getStats(null);
        } else {
          // 如果服务不存在，返回基于全局缓存的统计
          const hitRate = global.cacheStats.requests > 0
            ? (global.cacheStats.hits / global.cacheStats.requests * 100).toFixed(2)
            : '0.00';
          stats = {
            hits: global.cacheStats.hits,
            misses: global.cacheStats.misses,
            requests: global.cacheStats.requests,
            apiCalls: global.cacheStats.apiCalls,
            errors: global.cacheStats.errors,
            hitRate: `${hitRate}%`,
            lastReset: global.cacheStats.lastReset,
            dataSourceStats: global.cacheStats.dataSourceStats || {},
            apiStats: global.cacheStats.apiStats || {}
          };
        }
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
