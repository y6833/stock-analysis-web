'use strict';

const Controller = require('egg').Controller;

/**
 * 缓存管理控制器
 * 提供缓存管理和监控的API接口
 */
class CacheManagementController extends Controller {
  /**
   * 获取缓存统计信息
   */
  async getStats() {
    const { ctx } = this

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器不可用',
          error: 'Cache manager not available',
        }
        return
      }

      const stats = await cacheManager.getStats()

      ctx.body = {
        success: true,
        data: stats,
      }
    } catch (error) {
      ctx.logger.error('[CacheManagement] 获取缓存统计失败:', error)
      ctx.body = {
        success: false,
        message: '获取缓存统计失败',
        error: error.message,
      }
    }
  }

  /**
   * 获取缓存健康状态
   */
  async getHealth() {
    const { ctx } = this

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器不可用',
          error: 'Cache manager not available',
        }
        return
      }

      const health = await cacheManager.healthCheck()

      ctx.body = {
        success: true,
        data: health,
      }
    } catch (error) {
      ctx.logger.error('[CacheManagement] 获取缓存健康状态失败:', error)
      ctx.body = {
        success: false,
        message: '获取缓存健康状态失败',
        error: error.message,
      }
    }
  }

  /**
   * 执行缓存预热
   */
  async prewarm() {
    const { ctx } = this

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器不可用',
          error: 'Cache manager not available',
        }
        return
      }

      const { type = 'basic' } = ctx.request.body

      let result
      switch (type) {
        case 'basic':
          result = await cacheManager.prewarmCache()
          break
        case 'smart':
          result = await cacheManager.smartPrewarm()
          break
        case 'scheduled':
          result = await cacheManager.scheduledPrewarm()
          break
        default:
          result = await cacheManager.prewarmCache()
      }

      ctx.body = {
        success: true,
        message: '缓存预热完成',
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[CacheManagement] 缓存预热失败:', error)
      ctx.body = {
        success: false,
        message: '缓存预热失败',
        error: error.message,
      }
    }
  }

  /**
   * 执行缓存优化
   */
  async optimize() {
    const { ctx } = this

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器不可用',
          error: 'Cache manager not available',
        }
        return
      }

      const result = await cacheManager.optimizeCache()

      ctx.body = {
        success: true,
        message: '缓存优化完成',
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[CacheManagement] 缓存优化失败:', error)
      ctx.body = {
        success: false,
        message: '缓存优化失败',
        error: error.message,
      }
    }
  }

  /**
   * 执行智能缓存失效
   */
  async smartInvalidate() {
    const { ctx } = this

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器不可用',
          error: 'Cache manager not available',
        }
        return
      }

      const result = await cacheManager.smartInvalidation()

      ctx.body = {
        success: true,
        message: '智能缓存失效完成',
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[CacheManagement] 智能缓存失效失败:', error)
      ctx.body = {
        success: false,
        message: '智能缓存失效失败',
        error: error.message,
      }
    }
  }

  /**
   * 清除缓存
   */
  async clear() {
    const { ctx } = this;

    try {
      const cacheManager = ctx.app.cacheManager;

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器不可用',
          error: 'Cache manager not available',
        }
        return
      }

      const { namespace, pattern } = ctx.request.body

      let result
      if (namespace) {
        result = await cacheManager.clearNamespace(namespace)
      } else if (pattern) {
        result = await cacheManager.clearPattern(pattern)
      } else {
        // 清除所有缓存需要谨慎处理
        ctx.body = {
          success: false,
          message: '请指定要清除的缓存命名空间或模式',
          error: 'Namespace or pattern required',
        }
        return
      }

      ctx.body = {
        success: true,
        message: `已清除 ${result} 个缓存项`,
        data: { clearedCount: result },
      }
    } catch (error) {
      ctx.logger.error('[CacheManagement] 清除缓存失败:', error)
      ctx.body = {
        success: false,
        message: '清除缓存失败',
        error: error.message,
      }
    }
  }

  /**
   * 获取热点键
   */
  async getHotKeys() {
    const { ctx } = this

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器不可用',
          error: 'Cache manager not available',
        }
        return
      }

      const { limit = 20 } = ctx.query
      const hotKeys = await cacheManager.getHotKeys(parseInt(limit))

      // 格式化热点键数据
      const formattedHotKeys = []
      for (let i = 0; i < hotKeys.length; i += 2) {
        formattedHotKeys.push({
          key: hotKeys[i],
          score: parseInt(hotKeys[i + 1]),
        })
      }

      ctx.body = {
        success: true,
        data: formattedHotKeys,
      }
    } catch (error) {
      ctx.logger.error('[CacheManagement] 获取热点键失败:', error)
      ctx.body = {
        success: false,
        message: '获取热点键失败',
        error: error.message,
      }
    }
  }

  /**
   * 获取缓存项详情
   */
  async getCacheItem() {
    const { ctx } = this

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器不可用',
          error: 'Cache manager not available',
        }
        return
      }

      const { namespace, key } = ctx.query

      if (!namespace || !key) {
        ctx.body = {
          success: false,
          message: '请提供命名空间和键名',
          error: 'Namespace and key required',
        }
        return
      }

      const data = await cacheManager.get(namespace, key)
      const metadata = await cacheManager.getMetadata(namespace, key)

      ctx.body = {
        success: true,
        data: {
          exists: data !== null,
          data: data,
          metadata: metadata,
        },
      }
    } catch (error) {
      ctx.logger.error('[CacheManagement] 获取缓存项失败:', error)
      ctx.body = {
        success: false,
        message: '获取缓存项失败',
        error: error.message,
      }
    }
  }

  /**
   * 设置缓存项
   */
  async setCacheItem() {
    const { ctx } = this

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器不可用',
          error: 'Cache manager not available',
        }
        return
      }

      const { namespace, key, data, ttl, metadata } = ctx.request.body

      if (!namespace || !key || data === undefined) {
        ctx.body = {
          success: false,
          message: '请提供完整的缓存信息',
          error: 'Namespace, key and data required',
        }
        return
      }

      const result = await cacheManager.set(namespace, key, data, ttl, metadata)

      ctx.body = {
        success: result,
        message: result ? '缓存设置成功' : '缓存设置失败',
      }
    } catch (error) {
      ctx.logger.error('[CacheManagement] 设置缓存项失败:', error)
      ctx.body = {
        success: false,
        message: '设置缓存项失败',
        error: error.message,
      }
    }
  }

  /**
   * 删除缓存项
   */
  async deleteCacheItem() {
    const { ctx } = this

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器不可用',
          error: 'Cache manager not available',
        }
        return
      }

      const { namespace, key } = ctx.request.body

      if (!namespace || !key) {
        ctx.body = {
          success: false,
          message: '请提供命名空间和键名',
          error: 'Namespace and key required',
        }
        return
      }

      const result = await cacheManager.del(namespace, key)

      ctx.body = {
        success: result,
        message: result ? '缓存删除成功' : '缓存删除失败',
      }
    } catch (error) {
      ctx.logger.error('[CacheManagement] 删除缓存项失败:', error)
      ctx.body = {
        success: false,
        message: '删除缓存项失败',
        error: error.message,
      }
    }
  }

  /**
   * 批量操作缓存
   */
  async batchOperation() {
    const { ctx } = this

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器不可用',
          error: 'Cache manager not available',
        }
        return
      }

      const { operation, namespace, data, keys, ttl } = ctx.request.body

      if (!operation || !namespace) {
        ctx.body = {
          success: false,
          message: '请提供操作类型和命名空间',
          error: 'Operation and namespace required',
        }
        return
      }

      let result
      switch (operation) {
        case 'mget':
          if (!keys || !Array.isArray(keys)) {
            ctx.body = {
              success: false,
              message: '批量获取需要提供键数组',
              error: 'Keys array required for mget',
            }
            return
          }
          result = await cacheManager.mget(namespace, keys)
          break

        case 'mset':
          if (!data || typeof data !== 'object') {
            ctx.body = {
              success: false,
              message: '批量设置需要提供数据对象',
              error: 'Data object required for mset',
            }
            return
          }
          result = await cacheManager.mset(namespace, data, ttl)
          break

        default:
          ctx.body = {
            success: false,
            message: '不支持的操作类型',
            error: 'Unsupported operation',
          }
          return
      }

      ctx.body = {
        success: true,
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[CacheManagement] 批量操作失败:', error)
      ctx.body = {
        success: false,
        message: '批量操作失败',
        error: error.message,
      }
    }
  }

  /**
   * 获取缓存配置
   */
  async getConfig() {
    const { ctx } = this

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器不可用',
          error: 'Cache manager not available',
        }
        return
      }

      const config = {
        enabled: cacheManager.enabled,
        prefix: cacheManager.prefix,
        defaultTTL: cacheManager.defaultTTL,
        layers: cacheManager.layers,
        prewarming: cacheManager.prewarming,
        invalidation: cacheManager.invalidation,
      }

      ctx.body = {
        success: true,
        data: config,
      }
    } catch (error) {
      ctx.logger.error('[CacheManagement] 获取缓存配置失败:', error)
      ctx.body = {
        success: false,
        message: '获取缓存配置失败',
        error: error.message,
      }
    }
  }

  /**
   * 更新缓存配置
   */
  async updateConfig() {
    const { ctx } = this

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器不可用',
          error: 'Cache manager not available',
        }
        return
      }

      const { config } = ctx.request.body

      if (!config || typeof config !== 'object') {
        ctx.body = {
          success: false,
          message: '请提供有效的配置对象',
          error: 'Valid config object required',
        }
        return
      }

      // 更新配置（这里需要根据实际需求实现配置更新逻辑）
      if (config.defaultTTL !== undefined) {
        cacheManager.defaultTTL = config.defaultTTL
      }

      if (config.layers !== undefined) {
        Object.assign(cacheManager.layers, config.layers)
      }

      if (config.prewarming !== undefined) {
        Object.assign(cacheManager.prewarming, config.prewarming)
      }

      ctx.body = {
        success: true,
        message: '缓存配置更新成功',
      }
    } catch (error) {
      ctx.logger.error('[CacheManagement] 更新缓存配置失败:', error)
      ctx.body = {
        success: false,
        message: '更新缓存配置失败',
        error: error.message,
      }
    }
  }

  /**
   * 重置缓存统计
   */
  async resetStats() {
    const { ctx } = this

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器不可用',
          error: 'Cache manager not available',
        }
        return
      }

      cacheManager.resetCacheStats()

      ctx.body = {
        success: true,
        message: '缓存统计已重置',
      }
    } catch (error) {
      ctx.logger.error('[CacheManagement] 重置缓存统计失败:', error)
      ctx.body = {
        success: false,
        message: '重置缓存统计失败',
        error: error.message,
      }
    }
  }
}

module.exports = CacheManagementController
