'use strict'

/**
 * 缓存管理器
 * 提供多层缓存策略，包括客户端缓存、服务器缓存和数据库缓存
 */
class CacheManager {
  constructor(app) {
    this.app = app
    this.logger = app.logger
    this.redis = app.redis
    this.config = app.config.cache || {}
    this.enabled = this.config.enabled !== false
    this.prefix = this.config.prefix || (app.config.env === 'prod' ? 'prod:' : 'dev:')
    this.defaultTTL = this.config.defaultTTL || 300 // 默认缓存时间（秒）

    // 缓存统计
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    }

    // 缓存分层配置
    this.layers = {
      client: {
        enabled: true,
        maxAge: {
          static: 86400, // 静态资源缓存1天
          api: 60, // API响应缓存60秒
          user: 300, // 用户数据缓存5分钟
        },
      },
      server: {
        enabled: true,
        ttl: {
          stock: 300, // 股票数据缓存5分钟
          user: 600, // 用户数据缓存10分钟
          market: 60, // 市场数据缓存1分钟
          search: 1800, // 搜索结果缓存30分钟
          static: 86400, // 静态数据缓存1天
        },
      },
    }

    // 预热配置
    this.prewarming = {
      enabled: true,
      targets: [],
    }
  }

  /**
   * 初始化缓存管理器
   */
  async init() {
    try {
      this.logger.info('[CacheManager] 初始化缓存管理器')

      // 如果 Redis 不可用，使用内存缓存
      if (!this.redis) {
        this.logger.warn('[CacheManager] Redis 不可用，使用内存缓存')
        this.memoryCache = new Map()
      }

      this.logger.info('[CacheManager] 缓存管理器初始化完成')
    } catch (error) {
      this.logger.error('[CacheManager] 初始化失败:', error)
      this.enabled = false
    }
  }

  /**
   * 生成缓存键
   */
  getCacheKey(namespace, key) {
    return `${this.prefix}${namespace}:${key}`
  }

  /**
   * 获取缓存
   */
  async get(namespace, key) {
    if (!this.enabled) return null

    const cacheKey = this.getCacheKey(namespace, key)

    try {
      let value = null

      if (this.redis) {
        value = await this.redis.get(cacheKey)
      } else if (this.memoryCache) {
        const cached = this.memoryCache.get(cacheKey)
        if (cached && cached.expires > Date.now()) {
          value = cached.value
        } else if (cached) {
          this.memoryCache.delete(cacheKey)
        }
      }

      if (value) {
        this.cacheStats.hits++
        return JSON.parse(value)
      } else {
        this.cacheStats.misses++
        return null
      }
    } catch (error) {
      this.logger.error(`[CacheManager] 获取缓存失败 (${cacheKey}):`, error)
      this.cacheStats.errors++
      return null
    }
  }

  /**
   * 设置缓存
   */
  async set(namespace, key, value, ttl = null) {
    if (!this.enabled) return false

    const cacheKey = this.getCacheKey(namespace, key)
    const cacheTTL = ttl || this.layers.server.ttl[namespace] || this.defaultTTL

    try {
      const serializedValue = JSON.stringify(value)

      if (this.redis) {
        await this.redis.setex(cacheKey, cacheTTL, serializedValue)
      } else if (this.memoryCache) {
        this.memoryCache.set(cacheKey, {
          value: serializedValue,
          expires: Date.now() + cacheTTL * 1000,
        })
      }

      this.cacheStats.sets++
      return true
    } catch (error) {
      this.logger.error(`[CacheManager] 设置缓存失败 (${cacheKey}):`, error)
      this.cacheStats.errors++
      return false
    }
  }

  /**
   * 删除缓存
   */
  async delete(key) {
    if (!this.enabled) return false

    try {
      if (this.redis) {
        const result = await this.redis.del(key)
        this.cacheStats.deletes++
        return result > 0
      } else if (this.memoryCache) {
        const result = this.memoryCache.delete(key)
        this.cacheStats.deletes++
        return result
      }
      return false
    } catch (error) {
      this.logger.error(`[CacheManager] 删除缓存失败 (${key}):`, error)
      this.cacheStats.errors++
      return false
    }
  }

  /**
   * 清除命名空间缓存
   */
  async clearNamespace(namespace) {
    if (!this.enabled) return 0

    try {
      const pattern = `${this.prefix}${namespace}:*`
      let deletedCount = 0

      if (this.redis) {
        const keys = await this.redis.keys(pattern)
        if (keys.length > 0) {
          deletedCount = await this.redis.del(...keys)
        }
      } else if (this.memoryCache) {
        for (const key of this.memoryCache.keys()) {
          if (key.startsWith(`${this.prefix}${namespace}:`)) {
            this.memoryCache.delete(key)
            deletedCount++
          }
        }
      }

      this.cacheStats.deletes += deletedCount
      return deletedCount
    } catch (error) {
      this.logger.error(`[CacheManager] 清除命名空间缓存失败 (${namespace}):`, error)
      this.cacheStats.errors++
      return 0
    }
  }

  /**
   * 获取热点键
   */
  async getHotKeys(limit = 10) {
    if (!this.enabled) return []

    try {
      if (this.redis) {
        // 简化实现：返回一些示例热点键
        return [
          { key: 'stock:list', hits: 100 },
          { key: 'market:overview', hits: 80 },
          { key: 'hot:stocks', hits: 60 },
        ].slice(0, limit)
      } else if (this.memoryCache) {
        return Array.from(this.memoryCache.keys())
          .slice(0, limit)
          .map((key) => ({ key, hits: 1 }))
      }
      return []
    } catch (error) {
      this.logger.error('[CacheManager] 获取热点键失败:', error)
      return []
    }
  }

  /**
   * 获取缓存统计
   */
  async getStats() {
    const stats = {
      enabled: this.enabled,
      type: this.redis ? 'redis' : 'memory',
      stats: { ...this.cacheStats },
    }

    if (this.redis) {
      try {
        const info = await this.redis.info('memory')
        stats.memory = this.parseRedisInfo(info)
      } catch (error) {
        this.logger.warn('[CacheManager] 获取 Redis 内存信息失败:', error)
      }
    } else if (this.memoryCache) {
      stats.stats.keyCount = this.memoryCache.size
    }

    return stats
  }

  /**
   * 解析 Redis INFO 命令输出
   */
  parseRedisInfo(info) {
    const lines = info.split('\r\n')
    const result = {}

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':')
        result[key] = value
      }
    }

    return result
  }

  /**
   * 设置过期时间
   */
  async expire(key, ttl) {
    if (!this.enabled) return false

    try {
      if (this.redis) {
        const result = await this.redis.expire(key, ttl)
        return result === 1
      } else if (this.memoryCache && this.memoryCache.has(key)) {
        const cached = this.memoryCache.get(key)
        cached.expires = Date.now() + ttl * 1000
        return true
      }
      return false
    } catch (error) {
      this.logger.error(`[CacheManager] 设置过期时间失败 (${key}):`, error)
      return false
    }
  }

  /**
   * 获取按模式匹配的键
   */
  async getKeysByPattern(pattern, limit = 100) {
    if (!this.enabled) return []

    try {
      if (this.redis) {
        const keys = await this.redis.keys(pattern)
        return keys.slice(0, limit)
      } else if (this.memoryCache) {
        const regex = new RegExp(pattern.replace('*', '.*'))
        return Array.from(this.memoryCache.keys())
          .filter((key) => regex.test(key))
          .slice(0, limit)
      }
      return []
    } catch (error) {
      this.logger.error(`[CacheManager] 获取模式键失败 (${pattern}):`, error)
      return []
    }
  }
}

module.exports = CacheManager
