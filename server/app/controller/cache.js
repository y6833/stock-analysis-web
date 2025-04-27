'use strict';

const Controller = require('egg').Controller;

/**
 * 缓存控制器
 * 处理缓存相关的API请求
 */
class CacheController extends Controller {
  /**
   * 获取缓存状态
   */
  async getStatus() {
    const { ctx, service } = this;
    const { dataSource = 'tushare' } = ctx.query;
    
    try {
      const status = await service.cache.getCacheStatus(dataSource);
      ctx.body = status;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { 
        success: false, 
        error: '获取缓存状态失败',
        message: error.message || '未知错误'
      };
      ctx.logger.error('获取缓存状态失败:', error);
    }
  }
  
  /**
   * 刷新缓存数据
   */
  async refreshCache() {
    const { ctx, service } = this;
    const { dataSource = 'tushare' } = ctx.request.body;
    
    try {
      // 检查是否可以刷新缓存
      const canRefreshResult = await service.cache.canRefreshCache(dataSource);
      
      if (!canRefreshResult.success) {
        ctx.status = 500;
        ctx.body = {
          success: false,
          error: '检查刷新限制失败',
          message: canRefreshResult.error || '未知错误'
        };
        return;
      }
      
      if (!canRefreshResult.canRefresh) {
        ctx.status = 429; // Too Many Requests
        ctx.body = {
          success: false,
          error: '刷新频率限制',
          message: '刷新操作过于频繁，请稍后再试',
          lastUpdate: canRefreshResult.lastUpdate,
          nextRefreshTime: canRefreshResult.nextRefreshTime,
          timeRemaining: canRefreshResult.timeRemaining
        };
        return;
      }
      
      // 可以刷新，先清除旧缓存
      await service.cache.clearCache(dataSource);
      
      // 初始化新缓存
      const result = await service.cache.initStockDataCache({ dataSource });
      
      if (result.success) {
        ctx.body = {
          success: true,
          message: '缓存刷新成功',
          dataSource,
          cachedItems: result.cachedItems,
          refreshTime: new Date().toISOString()
        };
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          error: '缓存刷新失败',
          message: result.error || '未知错误'
        };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: '缓存刷新失败',
        message: error.message || '未知错误'
      };
      ctx.logger.error('缓存刷新失败:', error);
    }
  }
  
  /**
   * 清除缓存
   */
  async clearCache() {
    const { ctx, service } = this;
    const { dataSource = 'tushare' } = ctx.params;
    
    try {
      const result = await service.cache.clearCache(dataSource);
      
      if (result.success) {
        ctx.body = {
          success: true,
          message: `已清除 ${dataSource} 数据源的缓存`,
          clearedKeys: result.clearedKeys
        };
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          error: '清除缓存失败',
          message: result.error || '未知错误'
        };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: '清除缓存失败',
        message: error.message || '未知错误'
      };
      ctx.logger.error('清除缓存失败:', error);
    }
  }
  
  /**
   * 检查是否可以刷新缓存
   */
  async checkRefreshLimit() {
    const { ctx, service } = this;
    const { dataSource = 'tushare' } = ctx.query;
    
    try {
      const result = await service.cache.canRefreshCache(dataSource);
      
      if (result.success) {
        ctx.body = {
          success: true,
          dataSource,
          canRefresh: result.canRefresh,
          lastUpdate: result.lastUpdate,
          nextRefreshTime: result.nextRefreshTime,
          timeRemaining: result.timeRemaining
        };
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          error: '检查刷新限制失败',
          message: result.error || '未知错误'
        };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: '检查刷新限制失败',
        message: error.message || '未知错误'
      };
      ctx.logger.error('检查刷新限制失败:', error);
    }
  }
}

module.exports = CacheController;
