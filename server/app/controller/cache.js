'use strict';

const Controller = require('egg').Controller;

/**
 * 缓存控制器
 * 提供缓存管理和监控的API接口
 */
class CacheController extends Controller {
  /**
   * 获取缓存状态
   */
  async status() {
    const { ctx, app } = this;

    try {
      const cacheManager = app.cacheManager;

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
          data: {
            enabled: false,
            connected: false,
          },
        };
        return;
      }

      const stats = await cacheManager.getStats();
      const hotKeys = await cacheManager.getHotKeys(10);

      ctx.body = {
        success: true,
        data: {
          enabled: cacheManager.enabled,
          connected: !!cacheManager.redis,
          stats: stats.stats,
          type: stats.type,
          hotKeys,
          layers: cacheManager.layers,
          prewarming: cacheManager.prewarming,
        },
      };
    } catch (error) {
      ctx.logger.error('[CacheController] 获取缓存状态失败:', error);
      ctx.body = {
        success: false,
        message: '获取缓存状态失败',
        error: error.message,
      };
    }
  }

  /**
   * 清除缓存
   */
  async clear() {
    const { ctx, app } = this;

    try {
      const { namespace, pattern } = ctx.request.body;
      const cacheManager = app.cacheManager;

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        };
        return;
      }

      let result = 0;

      if (namespace) {
        result = await cacheManager.clearNamespace(namespace);
      } else if (pattern) {
        result = await cacheManager.clearPattern(pattern);
      } else {
        // 清除所有缓存
        const namespaces = ['stock', 'market', 'user', 'search', 'static'];
        for (const ns of namespaces) {
          result += await cacheManager.clearNamespace(ns);
        }
      }

      ctx.body = {
        success: true,
        message: `已清除 ${result} 个缓存项`,
        data: { clearedCount: result },
      };
    } catch (error) {
      ctx.logger.error('[CacheController] 清除缓存失败:', error);
      ctx.body = {
        success: false,
        message: '清除缓存失败',
        error: error.message,
      };
    }
  }

  /**
   * 预热缓存
   */
  async prewarm() {
    const { ctx, app } = this;

    try {
      const cacheManager = app.cacheManager;

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        };
        return;
      }

      const result = await cacheManager.prewarmCache();

      ctx.body = {
        success: true,
        message: '缓存预热完成',
        data: result,
      };
    } catch (error) {
      ctx.logger.error('[CacheController] 缓存预热失败:', error);
      ctx.body = {
        success: false,
        message: '缓存预热失败',
        error: error.message,
      };
    }
  }

  /**
   * 智能预热
   */
  async smartPrewarm() {
    const { ctx, app } = this;

    try {
      const cacheManager = app.cacheManager;

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        };
        return;
      }

      const result = await cacheManager.smartPrewarm();

      ctx.body = {
        success: true,
        message: '智能预热完成',
        data: result,
      };
    } catch (error) {
      ctx.logger.error('[CacheController] 智能预热失败:', error);
      ctx.body = {
        success: false,
        message: '智能预热失败',
        error: error.message,
      };
    }
  }

  /**
   * 缓存失效
   */
  async invalidate() {
    const { ctx, app } = this;

    try {
      const { namespace, key, pattern } = ctx.request.body;
      const cacheManager = app.cacheManager;

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        };
        return;
      }

      let result = false;

      if (namespace && key) {
        result = await cacheManager.invalidate(namespace, key);
      } else if (pattern) {
        const count = await cacheManager.clearPattern(pattern);
        result = count > 0;
      }

      ctx.body = {
        success: result,
        message: result ? '缓存失效成功' : '缓存失效失败',
      };
    } catch (error) {
      ctx.logger.error('[CacheController] 缓存失效失败:', error);
      ctx.body = {
        success: false,
        message: '缓存失效失败',
        error: error.message,
      };
    }
  }

  /**
   * 基于时间的缓存失效
   */
  async invalidateByTime() {
    const { ctx, app } = this;

    try {
      const cacheManager = app.cacheManager;

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        };
        return;
      }

      const result = await cacheManager.invalidateByTime();

      ctx.body = {
        success: true,
        message: '基于时间的缓存失效完成',
        data: result,
      };
    } catch (error) {
      ctx.logger.error('[CacheController] 基于时间的缓存失效失败:', error);
      ctx.body = {
        success: false,
        message: '基于时间的缓存失效失败',
        error: error.message,
      };
    }
  }

  /**
   * 缓存压缩
   */
  async compress() {
    const { ctx, app } = this;

    try {
      const cacheManager = app.cacheManager;

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        };
        return;
      }

      const result = await cacheManager.compressCache();

      ctx.body = {
        success: true,
        message: '缓存压缩完成',
        data: result,
      };
    } catch (error) {
      ctx.logger.error('[CacheController] 缓存压缩失败:', error);
      ctx.body = {
        success: false,
        message: '缓存压缩失败',
        error: error.message,
      };
    }
  }

  /**
   * 获取热点键
   */
  async hotKeys() {
    const { ctx, app } = this;

    try {
      const { limit = 20 } = ctx.query;
      const cacheManager = app.cacheManager;

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        };
        return;
      }

      const hotKeys = await cacheManager.getHotKeys(parseInt(limit));

      ctx.body = {
        success: true,
        data: hotKeys,
      };
    } catch (error) {
      ctx.logger.error('[CacheController] 获取热点键失败:', error);
      ctx.body = {
        success: false,
        message: '获取热点键失败',
        error: error.message,
      };
    }
  }
}

module.exports = CacheController;
