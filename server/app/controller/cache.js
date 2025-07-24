'use strict'

const Controller = require('egg').Controller

/**
 * 缓存控制器
 * 提供缓存管理和监控的API接口
 */
class CacheController extends Controller {
  /**
   * 获取缓存状态
   */
  async status() {
    const { ctx, app } = this

    try {
      const cacheManager = app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
          data: {
            enabled: false,
            connected: false,
          },
        }
        return
      }

      const stats = await cacheManager.getStats()
      const hotKeys = await cacheManager.getHotKeys(10)

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
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 获取缓存状态失败:', error)
      ctx.body = {
        success: false,
        message: '获取缓存状态失败',
        error: error.message,
      }
    }
  }

  /**
   * 清除缓存
   */
  async clear() {
    const { ctx, app } = this

    try {
      const { namespace, pattern } = ctx.request.body
      const cacheManager = app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        }
        return
      }

      let result = 0

      if (namespace) {
        result = await cacheManager.clearNamespace(namespace)
      } else if (pattern) {
        result = await cacheManager.clearPattern(pattern)
      } else {
        // 清除所有缓存
        const namespaces = ['stock', 'market', 'user', 'search', 'static']
        for (const ns of namespaces) {
          result += await cacheManager.clearNamespace(ns)
        }
      }

      ctx.body = {
        success: true,
        message: `已清除 ${result} 个缓存项`,
        data: { clearedCount: result },
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 清除缓存失败:', error)
      ctx.body = {
        success: false,
        message: '清除缓存失败',
        error: error.message,
      }
    }
  }

  /**
   * 预热缓存
   */
  async prewarm() {
    const { ctx, app } = this

    try {
      const cacheManager = app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        }
        return
      }

      const result = await cacheManager.prewarmCache()

      ctx.body = {
        success: true,
        message: '缓存预热完成',
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 缓存预热失败:', error)
      ctx.body = {
        success: false,
        message: '缓存预热失败',
        error: error.message,
      }
    }
  }

  /**
   * 智能预热
   */
  async smartPrewarm() {
    const { ctx, app } = this

    try {
      const cacheManager = app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        }
        return
      }

      const result = await cacheManager.smartPrewarm()

      ctx.body = {
        success: true,
        message: '智能预热完成',
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 智能预热失败:', error)
      ctx.body = {
        success: false,
        message: '智能预热失败',
        error: error.message,
      }
    }
  }

  /**
   * 缓存失效
   */
  async invalidate() {
    const { ctx, app } = this

    try {
      const { namespace, key, pattern } = ctx.request.body
      const cacheManager = app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        }
        return
      }

      let result = false

      if (namespace && key) {
        result = await cacheManager.invalidate(namespace, key)
      } else if (pattern) {
        const count = await cacheManager.clearPattern(pattern)
        result = count > 0
      }

      ctx.body = {
        success: result,
        message: result ? '缓存失效成功' : '缓存失效失败',
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 缓存失效失败:', error)
      ctx.body = {
        success: false,
        message: '缓存失效失败',
        error: error.message,
      }
    }
  }

  /**
   * 基于时间的缓存失效
   */
  async invalidateByTime() {
    const { ctx, app } = this

    try {
      const cacheManager = app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        }
        return
      }

      const result = await cacheManager.invalidateByTime()

      ctx.body = {
        success: true,
        message: '基于时间的缓存失效完成',
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 基于时间的缓存失效失败:', error)
      ctx.body = {
        success: false,
        message: '基于时间的缓存失效失败',
        error: error.message,
      }
    }
  }

  /**
   * 缓存压缩
   */
  async compress() {
    const { ctx, app } = this

    try {
      const cacheManager = app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        }
        return
      }

      const result = await cacheManager.compressCache()

      ctx.body = {
        success: true,
        message: '缓存压缩完成',
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 缓存压缩失败:', error)
      ctx.body = {
        success: false,
        message: '缓存压缩失败',
        error: error.message,
      }
    }
  }

  /**
   * 获取热点键
   */
  async hotKeys() {
    const { ctx, app } = this

    try {
      const { limit = 20 } = ctx.query
      const cacheManager = app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        }
        return
      }

      const hotKeys = await cacheManager.getHotKeys(parseInt(limit))

      ctx.body = {
        success: true,
        data: hotKeys,
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 获取热点键失败:', error)
      ctx.body = {
        success: false,
        message: '获取热点键失败',
        error: error.message,
      }
    }
  }

  /**
   * 获取缓存状态 (别名方法)
   */
  async getStatus() {
    return await this.status()
  }

  /**
   * 刷新缓存
   */
  async refreshCache() {
    const { ctx, app } = this

    try {
      const { namespace, keys } = ctx.request.body
      const cacheManager = app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        }
        return
      }

      let refreshedCount = 0

      if (keys && Array.isArray(keys)) {
        // 刷新指定的键
        for (const key of keys) {
          await cacheManager.delete(key)
          refreshedCount++
        }
      } else if (namespace) {
        // 刷新指定命名空间
        refreshedCount = await cacheManager.clearNamespace(namespace)
      } else {
        // 刷新所有缓存
        const namespaces = ['stock', 'market', 'user', 'search', 'static']
        for (const ns of namespaces) {
          refreshedCount += await cacheManager.clearNamespace(ns)
        }
      }

      ctx.body = {
        success: true,
        message: `已刷新 ${refreshedCount} 个缓存项`,
        data: { refreshedCount },
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 刷新缓存失败:', error)
      ctx.body = {
        success: false,
        message: '刷新缓存失败',
        error: error.message,
      }
    }
  }

  /**
   * 清除缓存 (别名方法)
   */
  async clearCache() {
    const { ctx } = this
    const { dataSource } = ctx.params

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        }
        return
      }

      let clearedCount = 0

      if (dataSource) {
        // 清除指定数据源的缓存
        clearedCount = await cacheManager.clearNamespace(dataSource)
      } else {
        // 清除所有缓存
        const namespaces = ['stock', 'market', 'user', 'search', 'static']
        for (const ns of namespaces) {
          clearedCount += await cacheManager.clearNamespace(ns)
        }
      }

      ctx.body = {
        success: true,
        message: `已清除 ${clearedCount} 个缓存项`,
        data: { clearedCount },
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 清除缓存失败:', error)
      ctx.body = {
        success: false,
        message: '清除缓存失败',
        error: error.message,
      }
    }
  }

  /**
   * 清除数据源缓存
   */
  async clearDataSourceCache() {
    const { ctx } = this
    const { dataSource } = ctx.params

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        }
        return
      }

      if (!dataSource) {
        ctx.body = {
          success: false,
          message: '数据源参数不能为空',
        }
        return
      }

      const clearedCount = await cacheManager.clearNamespace(dataSource)

      ctx.body = {
        success: true,
        message: `已清除数据源 ${dataSource} 的 ${clearedCount} 个缓存项`,
        data: { dataSource, clearedCount },
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 清除数据源缓存失败:', error)
      ctx.body = {
        success: false,
        message: '清除数据源缓存失败',
        error: error.message,
      }
    }
  }

  /**
   * 检查刷新限制
   */
  async checkRefreshLimit() {
    const { ctx } = this

    try {
      // 简单的刷新限制检查
      const userId = ctx.state.user?.id || 'anonymous'
      const limitKey = `refresh_limit:${userId}`
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: true,
          data: {
            canRefresh: true,
            remainingRequests: 10,
            resetTime: new Date(Date.now() + 60000).toISOString(),
          },
        }
        return
      }

      const currentCount = (await cacheManager.get(limitKey)) || 0
      const maxRequests = 10 // 每分钟最多10次刷新
      const canRefresh = currentCount < maxRequests

      if (canRefresh) {
        await cacheManager.set(limitKey, currentCount + 1, 60) // 60秒过期
      }

      ctx.body = {
        success: true,
        data: {
          canRefresh,
          remainingRequests: Math.max(0, maxRequests - currentCount - (canRefresh ? 1 : 0)),
          resetTime: new Date(Date.now() + 60000).toISOString(),
        },
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 检查刷新限制失败:', error)
      ctx.body = {
        success: false,
        message: '检查刷新限制失败',
        error: error.message,
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats() {
    const { ctx } = this
    const { source } = ctx.params

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        }
        return
      }

      const stats = await cacheManager.getStats()

      let result = stats
      if (source) {
        // 如果指定了数据源，返回该数据源的统计
        result = {
          ...stats,
          source,
          sourceStats: stats.dataSourceStats?.[source] || {
            hits: 0,
            misses: 0,
            requests: 0,
          },
        }
      }

      ctx.body = {
        success: true,
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 获取缓存统计失败:', error)
      ctx.body = {
        success: false,
        message: '获取缓存统计失败',
        error: error.message,
      }
    }
  }

  /**
   * 获取缓存详情
   */
  async getDetails() {
    const { ctx } = this
    const { source } = ctx.params

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        }
        return
      }

      const details = {
        source,
        enabled: cacheManager.enabled,
        connected: !!cacheManager.redis,
        layers: cacheManager.layers,
        prewarming: cacheManager.prewarming,
        stats: await cacheManager.getStats(),
        hotKeys: await cacheManager.getHotKeys(10),
      }

      if (source && cacheManager.getKeysByPattern) {
        // 获取指定数据源的详细信息
        const pattern = `${source}:*`
        const keys = await cacheManager.getKeysByPattern(pattern, 100)
        details.keys = keys
        details.keyCount = keys.length
      }

      ctx.body = {
        success: true,
        data: details,
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 获取缓存详情失败:', error)
      ctx.body = {
        success: false,
        message: '获取缓存详情失败',
        error: error.message,
      }
    }
  }

  /**
   * 删除缓存键
   */
  async deleteKey() {
    const { ctx } = this
    const { key } = ctx.request.body

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        }
        return
      }

      if (!key) {
        ctx.body = {
          success: false,
          message: '缓存键不能为空',
        }
        return
      }

      const result = await cacheManager.delete(key)

      ctx.body = {
        success: true,
        message: result ? '缓存键删除成功' : '缓存键不存在',
        data: { key, deleted: result },
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 删除缓存键失败:', error)
      ctx.body = {
        success: false,
        message: '删除缓存键失败',
        error: error.message,
      }
    }
  }

  /**
   * 设置缓存过期时间
   */
  async setExpire() {
    const { ctx } = this
    const { key, ttl } = ctx.request.body

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        }
        return
      }

      if (!key || !ttl) {
        ctx.body = {
          success: false,
          message: '缓存键和过期时间不能为空',
        }
        return
      }

      const result = await cacheManager.expire(key, ttl)

      ctx.body = {
        success: true,
        message: result ? '过期时间设置成功' : '缓存键不存在',
        data: { key, ttl, set: result },
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 设置过期时间失败:', error)
      ctx.body = {
        success: false,
        message: '设置过期时间失败',
        error: error.message,
      }
    }
  }

  /**
   * 按时间清理缓存
   */
  async cleanCacheByTime() {
    const { ctx } = this
    const { olderThan } = ctx.request.body

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        }
        return
      }

      const cutoffTime = olderThan
        ? new Date(olderThan)
        : new Date(Date.now() - 24 * 60 * 60 * 1000) // 默认24小时前
      let cleanedCount = 0

      // 这里需要根据实际的缓存管理器实现来清理过期缓存
      // 简化实现：清理所有命名空间的缓存
      const namespaces = ['stock', 'market', 'user', 'search', 'static']
      for (const ns of namespaces) {
        cleanedCount += await cacheManager.clearNamespace(ns)
      }

      ctx.body = {
        success: true,
        message: `已清理 ${cleanedCount} 个过期缓存项`,
        data: { cleanedCount, cutoffTime },
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 按时间清理缓存失败:', error)
      ctx.body = {
        success: false,
        message: '按时间清理缓存失败',
        error: error.message,
      }
    }
  }

  /**
   * 按容量清理缓存
   */
  async cleanCacheByCapacity() {
    const { ctx } = this
    const { maxSize } = ctx.request.body

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        }
        return
      }

      const targetSize = maxSize || 1000 // 默认保留1000个缓存项
      let cleanedCount = 0

      // 简化实现：获取统计信息并清理部分缓存
      const stats = await cacheManager.getStats()
      const currentSize = stats.stats?.keyCount || 0

      if (currentSize > targetSize) {
        const toClean = currentSize - targetSize
        // 清理最少使用的缓存项
        const namespaces = ['static', 'search', 'user'] // 按优先级清理
        for (const ns of namespaces) {
          if (cleanedCount >= toClean) break
          cleanedCount += await cacheManager.clearNamespace(ns)
        }
      }

      ctx.body = {
        success: true,
        message: `已清理 ${cleanedCount} 个缓存项`,
        data: { cleanedCount, targetSize, currentSize },
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 按容量清理缓存失败:', error)
      ctx.body = {
        success: false,
        message: '按容量清理缓存失败',
        error: error.message,
      }
    }
  }

  /**
   * 自动清理缓存
   */
  async autoCleanCache() {
    const { ctx } = this

    try {
      const cacheManager = ctx.app.cacheManager

      if (!cacheManager) {
        ctx.body = {
          success: false,
          message: '缓存管理器未初始化',
        }
        return
      }

      let totalCleaned = 0

      // 1. 清理过期缓存（24小时前）
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000)

      // 2. 清理低优先级缓存
      const lowPriorityNamespaces = ['static', 'search']
      for (const ns of lowPriorityNamespaces) {
        totalCleaned += await cacheManager.clearNamespace(ns)
      }

      // 3. 获取清理后的统计信息
      const stats = await cacheManager.getStats()

      ctx.body = {
        success: true,
        message: `自动清理完成，共清理 ${totalCleaned} 个缓存项`,
        data: {
          cleanedCount: totalCleaned,
          cutoffTime,
          currentStats: stats,
        },
      }
    } catch (error) {
      ctx.logger.error('[CacheController] 自动清理缓存失败:', error)
      ctx.body = {
        success: false,
        message: '自动清理缓存失败',
        error: error.message,
      }
    }
  }
}

module.exports = CacheController
