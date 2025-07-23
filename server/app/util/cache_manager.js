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
    this.cacheHitCount = 0
    this.cacheMissCount = 0
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
      database: {
        enabled: true,
        refreshInterval: {
          stock: 3600, // 股票数据每小时刷新
          index: 1800, // 指数数据每30分钟刷新
          industry: 7200, // 行业数据每2小时刷新
        },
      },
    }

    // 缓存预热配置
    this.prewarming = {
      enabled: true,
      targets: [
        { key: 'stock:list', ttl: 3600, handler: 'preloadStockList' },
        { key: 'index:list', ttl: 3600, handler: 'preloadIndexList' },
        { key: 'industry:list', ttl: 7200, handler: 'preloadIndustryList' },
        { key: 'market:overview', ttl: 300, handler: 'preloadMarketOverview' },
        { key: 'hot:stocks', ttl: 1800, handler: 'preloadHotStocks' },
      ],
      strategies: {
        // 基于时间的预热策略
        timeBasedWarming: {
          enabled: true,
          schedule: [
            { time: '09:00', targets: ['market:overview', 'hot:stocks'] },
            { time: '12:00', targets: ['stock:list', 'index:list'] },
            { time: '15:30', targets: ['market:overview'] },
          ]
        },
        // 基于访问模式的预热策略
        patternBasedWarming: {
          enabled: true,
          minAccessCount: 10, // 最小访问次数
          warmingThreshold: 0.7, // 预热阈值
        },
        // 预测性预热策略
        predictiveWarming: {
          enabled: true,
          lookAheadMinutes: 30, // 预测未来30分钟的访问
          confidenceThreshold: 0.6, // 置信度阈值
        }
      }
    }

    // 缓存失效策略配置
    this.invalidation = {
      patterns: {
        stockUpdate: 'stock:*',
        userUpdate: 'user:*',
        marketUpdate: 'market:*',
      },
      dependencies: {
        'stock:detail:*': ['stock:list', 'market:overview'],
        'user:profile:*': ['user:watchlist:*'],
      },
    }
  }

  /**
   * 初始化缓存管理器
   */
  async init() {
    this.logger.info('[CacheManager] 初始化多层缓存管理器')

    try {
      // 检查Redis是否可用
      if (this.redis) {
        try {
          await this.redis.ping()
          this.logger.info('[CacheManager] Redis连接成功')

          // 设置Redis键前缀
          if (this.redis.options) {
            this.redis.options.keyPrefix = this.prefix
            this.logger.info(`[CacheManager] Redis键前缀设置为: ${this.prefix}`)
          }

          // 启动缓存统计收集
          this.startStatsCollection()

          // 如果启用了缓存预热，执行预热
          if (this.prewarming.enabled) {
            await this.prewarmCache()
          }

          // 启动自动缓存失效任务
          this.startAutoInvalidation()

          // 启动智能预热任务（每小时执行一次）
          setInterval(async () => {
            try {
              await this.smartPrewarm()
            } catch (error) {
              this.logger.error('[CacheManager] 智能预热任务失败:', error)
            }
          }, 60 * 60 * 1000)

          // 启动缓存压缩任务（每天执行一次）
          setInterval(async () => {
            try {
              await this.compressCache()
            } catch (error) {
              this.logger.error('[CacheManager] 缓存压缩任务失败:', error)
            }
          }, 24 * 60 * 60 * 1000)

          // 启动缓存预热任务（每6小时执行一次）
          setInterval(async () => {
            try {
              await this.scheduledPrewarm()
            } catch (error) {
              this.logger.error('[CacheManager] 定时缓存预热任务失败:', error)
            }
          }, 6 * 60 * 60 * 1000)

          // 启动缓存健康检查（每30分钟执行一次）
          setInterval(async () => {
            try {
              await this.healthCheck()
            } catch (error) {
              this.logger.error('[CacheManager] 缓存健康检查失败:', error)
            }
          }, 30 * 60 * 1000)
        } catch (redisError) {
          this.logger.error('[CacheManager] Redis连接失败:', redisError)
          this.logger.warn('[CacheManager] 系统将使用内存缓存作为备用')
          this.setupMemoryCache()
        }
      } else {
        this.logger.warn('[CacheManager] Redis未配置，系统将使用内存缓存')
        this.setupMemoryCache()
      }

      this.logger.info('[CacheManager] 多层缓存管理器初始化完成')
    } catch (error) {
      this.logger.error('[CacheManager] 初始化缓存管理器失败:', error)
      throw error
    }
  }

  /**
   * 设置内存缓存作为备用
   */
  setupMemoryCache() {
    // 创建简单的内存缓存
    const memoryCache = {
      store: new Map(),
      stats: { hits: 0, misses: 0, sets: 0, deletes: 0 },

      async get(key) {
        const item = this.store.get(key)
        if (!item) {
          this.stats.misses++
          return null
        }

        if (item.expiry && item.expiry < Date.now()) {
          this.store.delete(key)
          this.stats.misses++
          return null
        }

        this.stats.hits++
        return item.value
      },

      async set(key, value, expiryMode, time) {
        let expiry = null
        if (expiryMode === 'EX') {
          expiry = Date.now() + time * 1000
        }

        this.store.set(key, { value, expiry })
        this.stats.sets++
        return 'OK'
      },

      async del(...keys) {
        let count = 0
        for (const key of keys) {
          if (this.store.delete(key)) {
            count++
          }
        }
        this.stats.deletes += count
        return count
      },

      async keys(pattern) {
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$')
        const keys = []

        for (const key of this.store.keys()) {
          if (regex.test(key)) {
            keys.push(key)
          }
        }

        return keys
      },

      async ping() {
        return 'PONG'
      },

      async getStats() {
        return { ...this.stats }
      },
    }

    // 将内存缓存添加到应用实例
    this.app.memoryCache = memoryCache

    // 如果Redis不可用，将memoryCache作为redis的替代
    if (!this.app.redis) {
      this.app.redis = memoryCache
      this.redis = memoryCache
    }
  }

  /**
   * 获取缓存键
   * @param {String} namespace - 命名空间
   * @param {String} key - 键
   * @returns {String} 完整的缓存键
   */
  getCacheKey(namespace, key) {
    return `${namespace}:${key}`
  }

  /**
   * 从缓存获取数据
   * @param {String} namespace - 命名空间
   * @param {String} key - 键
   * @returns {Promise<*>} 缓存的数据，如果不存在则返回null
   */
  async get(namespace, key) {
    if (!this.enabled || !this.redis) {
      return null
    }

    const cacheKey = this.getCacheKey(namespace, key)

    try {
      const data = await this.redis.get(cacheKey)

      if (data) {
        this.cacheStats.hits++
        return JSON.parse(data)
      } else {
        this.cacheStats.misses++
        return null
      }
    } catch (error) {
      this.logger.warn(`[CacheManager] 从缓存获取数据失败 (${cacheKey}):`, error)
      this.cacheStats.errors++
      return null
    }
  }

  /**
   * 将数据存入缓存
   * @param {String} namespace - 命名空间
   * @param {String} key - 键
   * @param {*} data - 要缓存的数据
   * @param {Number} ttl - 缓存时间（秒），如果不指定则使用默认值
   * @param {Object} metadata - 可选的元数据
   * @returns {Promise<Boolean>} 是否成功
   */
  async set(namespace, key, data, ttl, metadata = {}) {
    if (!this.enabled || !this.redis) {
      return false
    }

    const cacheKey = this.getCacheKey(namespace, key)
    const cacheTTL = ttl || this.getDefaultTTL(namespace)

    try {
      const serializedData = JSON.stringify(data)
      const pipeline = this.redis.pipeline()
      
      // 设置主数据
      pipeline.set(cacheKey, serializedData, 'EX', cacheTTL)
      
      // 设置元数据
      const metaKey = `${cacheKey}:meta`
      const defaultMeta = {
        lastUpdated: Date.now(),
        ttl: cacheTTL,
        dataType: Array.isArray(data) ? 'array' : typeof data,
        size: serializedData.length
      }
      
      const meta = { ...defaultMeta, ...metadata }
      
      // 使用 HSET 存储元数据
      const args = []
      for (const [field, value] of Object.entries(meta)) {
        args.push(field, typeof value === 'object' ? JSON.stringify(value) : value)
      }
      
      if (args.length > 0) {
        pipeline.hset(metaKey, ...args)
        // 设置元数据的过期时间比主数据稍长，便于后续分析
        pipeline.expire(metaKey, cacheTTL + 60)
      }
      
      await pipeline.exec()
      this.cacheStats.sets++
      
      // 如果是高频访问的键，考虑添加到LRU缓存
      if (namespace === 'stock' || namespace === 'market') {
        this.trackHotKey(cacheKey)
      }
      
      return true
    } catch (error) {
      this.logger.warn(`[CacheManager] 缓存数据失败 (${cacheKey}):`, error)
      this.cacheStats.errors++
      return false
    }
  }
  
  /**
   * 跟踪热点键
   * @param {String} key - 缓存键
   */
  async trackHotKey(key) {
    if (!this.redis) return
    
    try {
      // 使用Redis的ZINCRBY命令增加键的访问计数
      await this.redis.zincrby('cache:hot_keys', 1, key)
      
      // 定期裁剪热键集合，只保留前100个
      if (Math.random() < 0.01) { // 1%的概率执行裁剪，避免每次都执行
        await this.redis.zremrangebyrank('cache:hot_keys', 0, -101)
      }
    } catch (error) {
      // 忽略错误，这只是一个优化功能
    }
  }
  
  /**
   * 获取热点键列表
   * @param {Number} limit - 返回的键数量
   * @returns {Promise<Array>} 热点键列表
   */
  async getHotKeys(limit = 20) {
    if (!this.redis) return []
    
    try {
      // 获取访问频率最高的键
      return await this.redis.zrevrange('cache:hot_keys', 0, limit - 1, 'WITHSCORES')
    } catch (error) {
      this.logger.warn('[CacheManager] 获取热点键失败:', error)
      return []
    }
  }

  /**
   * 获取默认的缓存时间
   * @param {String} namespace - 命名空间
   * @returns {Number} 缓存时间（秒）
   */
  getDefaultTTL(namespace) {
    if (namespace.startsWith('stock')) {
      return this.layers.server.ttl.stock
    } else if (namespace.startsWith('user')) {
      return this.layers.server.ttl.user
    } else if (namespace.startsWith('market')) {
      return this.layers.server.ttl.market
    } else if (namespace.startsWith('search')) {
      return this.layers.server.ttl.search
    } else if (namespace.startsWith('static')) {
      return this.layers.server.ttl.static
    } else {
      return this.defaultTTL
    }
  }

  /**
   * 从缓存删除数据
   * @param {String} namespace - 命名空间
   * @param {String} key - 键
   * @returns {Promise<Boolean>} 是否成功
   */
  async del(namespace, key) {
    if (!this.enabled || !this.redis) {
      return false
    }

    const cacheKey = this.getCacheKey(namespace, key)

    try {
      await this.redis.del(cacheKey)
      this.cacheStats.deletes++
      return true
    } catch (error) {
      this.logger.warn(`[CacheManager] 从缓存删除数据失败 (${cacheKey}):`, error)
      this.cacheStats.errors++
      return false
    }
  }

  /**
   * 清除命名空间下的所有缓存
   * @param {String} namespace - 命名空间
   * @returns {Promise<Number>} 删除的键数量
   */
  async clearNamespace(namespace) {
    if (!this.enabled || !this.redis) {
      return 0
    }

    const pattern = `${namespace}:*`

    try {
      const keys = await this.redis.keys(pattern)

      if (keys.length > 0) {
        const count = await this.redis.del(...keys)
        this.logger.info(`[CacheManager] 已清除命名空间 ${namespace} 下的 ${count} 个缓存`)
        this.cacheStats.deletes += count
        return count
      }

      return 0
    } catch (error) {
      this.logger.error(`[CacheManager] 清除命名空间 ${namespace} 缓存失败:`, error)
      this.cacheStats.errors++
      return 0
    }
  }

  /**
   * 使用模式匹配清除缓存
   * @param {String} pattern - 模式，例如 'stock:*'
   * @returns {Promise<Number>} 删除的键数量
   */
  async clearPattern(pattern) {
    if (!this.enabled || !this.redis) {
      return 0
    }

    try {
      const keys = await this.redis.keys(pattern)

      if (keys.length > 0) {
        const count = await this.redis.del(...keys)
        this.logger.info(`[CacheManager] 已清除模式 ${pattern} 匹配的 ${count} 个缓存`)
        this.cacheStats.deletes += count
        return count
      }

      return 0
    } catch (error) {
      this.logger.error(`[CacheManager] 清除模式 ${pattern} 匹配的缓存失败:`, error)
      this.cacheStats.errors++
      return 0
    }
  }

  /**
   * 获取或设置缓存
   * 如果缓存存在，则返回缓存的数据
   * 如果缓存不存在，则调用回调函数获取数据，并将数据存入缓存
   * @param {String} namespace - 命名空间
   * @param {String} key - 键
   * @param {Function} callback - 回调函数，用于获取数据
   * @param {Number} ttl - 缓存时间（秒），如果不指定则使用默认值
   * @returns {Promise<*>} 数据
   */
  async getOrSet(namespace, key, callback, ttl) {
    // 尝试从缓存获取数据
    const cachedData = await this.get(namespace, key)

    if (cachedData !== null) {
      return cachedData
    }

    // 缓存不存在，调用回调函数获取数据
    try {
      const data = await callback()

      // 将数据存入缓存
      if (data !== null && data !== undefined) {
        await this.set(namespace, key, data, ttl)
      }

      return data
    } catch (error) {
      this.logger.error(`[CacheManager] 获取数据失败 (${namespace}:${key}):`, error)
      throw error
    }
  }

  /**
   * 批量获取缓存
   * @param {String} namespace - 命名空间
   * @param {Array<String>} keys - 键数组
   * @returns {Promise<Object>} 键值对对象
   */
  async mget(namespace, keys) {
    if (!this.enabled || !this.redis || !keys.length) {
      return {}
    }

    const cacheKeys = keys.map((key) => this.getCacheKey(namespace, key))
    const result = {}

    try {
      const values = await this.redis.mget(...cacheKeys)

      for (let i = 0; i < keys.length; i++) {
        if (values[i]) {
          result[keys[i]] = JSON.parse(values[i])
          this.cacheStats.hits++
        } else {
          result[keys[i]] = null
          this.cacheStats.misses++
        }
      }

      return result
    } catch (error) {
      this.logger.warn(`[CacheManager] 批量获取缓存失败:`, error)
      this.cacheStats.errors++
      return {}
    }
  }

  /**
   * 批量设置缓存
   * @param {String} namespace - 命名空间
   * @param {Object} data - 键值对对象
   * @param {Number} ttl - 缓存时间（秒），如果不指定则使用默认值
   * @returns {Promise<Boolean>} 是否成功
   */
  async mset(namespace, data, ttl) {
    if (!this.enabled || !this.redis || !Object.keys(data).length) {
      return false
    }

    const cacheTTL = ttl || this.getDefaultTTL(namespace)
    const pipeline = this.redis.pipeline()

    try {
      for (const [key, value] of Object.entries(data)) {
        const cacheKey = this.getCacheKey(namespace, key)
        const serializedData = JSON.stringify(value)
        pipeline.set(cacheKey, serializedData, 'EX', cacheTTL)
      }

      await pipeline.exec()
      this.cacheStats.sets += Object.keys(data).length
      return true
    } catch (error) {
      this.logger.warn(`[CacheManager] 批量设置缓存失败:`, error)
      this.cacheStats.errors++
      return false
    }
  }

  /**
   * 使用缓存包装函数
   * 创建一个新函数，该函数会先尝试从缓存获取结果，如果缓存不存在则调用原函数
   * @param {Function} fn - 要包装的函数
   * @param {String} namespace - 缓存命名空间
   * @param {Function} keyGenerator - 根据参数生成缓存键的函数
   * @param {Number} ttl - 缓存时间（秒）
   * @returns {Function} 包装后的函数
   */
  cacheWrapper(fn, namespace, keyGenerator, ttl) {
    return async (...args) => {
      if (!this.enabled) {
        return fn(...args)
      }

      const key = keyGenerator(...args)
      return this.getOrSet(namespace, key, () => fn(...args), ttl)
    }
  }

  /**
   * 获取客户端缓存控制头
   * @param {String} type - 缓存类型（static, api, user）
   * @param {Boolean} isPublic - 是否公共缓存
   * @returns {Object} 缓存控制头
   */
  getClientCacheHeaders(type, isPublic = true) {
    if (!this.layers.client.enabled) {
      return { 'Cache-Control': 'no-store' }
    }

    const maxAge = this.layers.client.maxAge[type] || 0
    const visibility = isPublic ? 'public' : 'private'

    if (maxAge <= 0) {
      return { 'Cache-Control': 'no-store' }
    }

    const expires = new Date(Date.now() + maxAge * 1000)

    return {
      'Cache-Control': `${visibility}, max-age=${maxAge}`,
      Expires: expires.toUTCString(),
    }
  }

  /**
   * 启动缓存统计收集
   */
  startStatsCollection() {
    // 每分钟记录一次缓存统计
    setInterval(() => {
      const hitRate =
        this.cacheStats.hits + this.cacheStats.misses > 0
          ? (
              (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) *
              100
            ).toFixed(2)
          : 0

      this.logger.info(
        `[CacheManager] 缓存统计: 命中率=${hitRate}%, 命中=${this.cacheStats.hits}, 未命中=${this.cacheStats.misses}, 设置=${this.cacheStats.sets}, 删除=${this.cacheStats.deletes}, 错误=${this.cacheStats.errors}`
      )

      // 重置计数器
      this.cacheStats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
      }
    }, 60000)
  }

  /**
   * 预热缓存
   */
  async prewarmCache() {
    this.logger.info('[CacheManager] 开始预热缓存')

    const startTime = Date.now()
    let successCount = 0
    let failCount = 0

    // 并行预热多个缓存以提高效率
    const prewarmPromises = this.prewarming.targets.map(async (target) => {
      try {
        // 检查缓存是否已存在
        const exists = await this.redis.exists(target.key)

        if (!exists) {
          // 如果缓存不存在，调用预热处理函数
          if (typeof this[target.handler] === 'function') {
            this.logger.info(`[CacheManager] 预热缓存: ${target.key}`)
            await this[target.handler](target.key, target.ttl)
            successCount++
            return { key: target.key, success: true }
          } else {
            this.logger.warn(`[CacheManager] 预热处理函数不存在: ${target.handler}`)
            failCount++
            return { key: target.key, success: false, error: 'Handler not found' }
          }
        } else {
          this.logger.info(`[CacheManager] 缓存已存在，跳过预热: ${target.key}`)
          return { key: target.key, success: true, skipped: true }
        }
      } catch (error) {
        this.logger.error(`[CacheManager] 预热缓存失败 (${target.key}):`, error)
        failCount++
        return { key: target.key, success: false, error: error.message }
      }
    })

    // 等待所有预热任务完成
    const results = await Promise.allSettled(prewarmPromises)

    const duration = Date.now() - startTime
    this.logger.info(
      `[CacheManager] 缓存预热完成，耗时 ${duration}ms，成功: ${successCount}，失败: ${failCount}`
    )

    // 记录预热结果
    this.prewarmResults = {
      timestamp: Date.now(),
      duration,
      successCount,
      failCount,
      details: results.map((r) => r.value || r.reason),
    }

    return this.prewarmResults
  }

  /**
   * 预加载市场概览数据
   * @param {String} cacheKey - 缓存键
   * @param {Number} ttl - 缓存时间（秒）
   */
  async preloadMarketOverview(cacheKey, ttl) {
    try {
      // 获取市场概览数据
      const marketService = this.app.service.marketService
      if (!marketService) {
        this.logger.error('[CacheManager] 市场服务不可用，无法预热市场概览数据')
        return
      }

      const overview = await marketService.getMarketOverview()

      // 缓存市场概览数据
      await this.redis.set(cacheKey, JSON.stringify(overview), 'EX', ttl)
      this.logger.info(`[CacheManager] 预加载市场概览数据成功`)
    } catch (error) {
      this.logger.error('[CacheManager] 预加载市场概览数据失败:', error)
    }
  }

  /**
   * 预加载热门股票
   * @param {String} cacheKey - 缓存键
   * @param {Number} ttl - 缓存时间（秒）
   */
  async preloadHotStocks(cacheKey, ttl) {
    try {
      // 获取热门股票数据
      const stockService = this.app.service.stockService
      if (!stockService) {
        this.logger.error('[CacheManager] 股票服务不可用，无法预热热门股票数据')
        return
      }

      const hotStocks = await stockService.getHotStocks(20) // 获取前20个热门股票

      // 缓存热门股票数据
      await this.redis.set(cacheKey, JSON.stringify(hotStocks), 'EX', ttl)
      this.logger.info(`[CacheManager] 预加载热门股票数据成功，共 ${hotStocks.length} 条记录`)
    } catch (error) {
      this.logger.error('[CacheManager] 预加载热门股票数据失败:', error)
    }
  }

  /**
   * 预加载股票列表
   * @param {String} cacheKey - 缓存键
   * @param {Number} ttl - 缓存时间（秒）
   */
  async preloadStockList(cacheKey, ttl) {
    try {
      // 从数据库获取股票列表
      const stocks = await this.app.model.Stock.findAll({
        attributes: ['symbol', 'name', 'exchange'],
        raw: true,
      })

      // 缓存股票列表
      await this.redis.set(cacheKey, JSON.stringify(stocks), 'EX', ttl)
      this.logger.info(`[CacheManager] 预加载股票列表成功，共 ${stocks.length} 条记录`)
    } catch (error) {
      this.logger.error('[CacheManager] 预加载股票列表失败:', error)
    }
  }

  /**
   * 预加载指数列表
   * @param {String} cacheKey - 缓存键
   * @param {Number} ttl - 缓存时间（秒）
   */
  async preloadIndexList(cacheKey, ttl) {
    try {
      // 从数据库获取指数列表
      const indexes = await this.app.model.Index.findAll({
        attributes: ['symbol', 'name', 'exchange'],
        raw: true,
      })

      // 缓存指数列表
      await this.redis.set(cacheKey, JSON.stringify(indexes), 'EX', ttl)
      this.logger.info(`[CacheManager] 预加载指数列表成功，共 ${indexes.length} 条记录`)
    } catch (error) {
      this.logger.error('[CacheManager] 预加载指数列表失败:', error)
    }
  }

  /**
   * 预加载行业列表
   * @param {String} cacheKey - 缓存键
   * @param {Number} ttl - 缓存时间（秒）
   */
  async preloadIndustryList(cacheKey, ttl) {
    try {
      // 从数据库获取行业列表
      const industries = await this.app.model.Industry.findAll({
        attributes: ['code', 'name', 'level'],
        raw: true,
      })

      // 缓存行业列表
      await this.redis.set(cacheKey, JSON.stringify(industries), 'EX', ttl)
      this.logger.info(`[CacheManager] 预加载行业列表成功，共 ${industries.length} 条记录`)
    } catch (error) {
      this.logger.error('[CacheManager] 预加载行业列表失败:', error)
    }
  }

  /**
   * 使特定键的缓存失效
   * @param {String} namespace - 命名空间
   * @param {String} key - 键
   * @returns {Promise<Boolean>} 是否成功
   */
  async invalidate(namespace, key) {
    // 删除主键缓存
    const success = await this.del(namespace, key)

    // 检查是否有依赖缓存需要失效
    const cacheKey = this.getCacheKey(namespace, key)
    const pattern = `${namespace}:${key}`

    // 查找匹配的依赖关系
    for (const [depPattern, dependencies] of Object.entries(this.invalidation.dependencies)) {
      if (new RegExp('^' + depPattern.replace('*', '.*') + '$').test(cacheKey)) {
        // 使依赖的缓存失效
        for (const dependency of dependencies) {
          const [depNamespace, ...depKeyParts] = dependency.split(':')
          const depKey = depKeyParts.join(':')
          await this.del(depNamespace, depKey)
        }
      }
    }

    return success
  }
  
  /**
   * 使用时间策略使缓存失效
   * 根据配置的刷新间隔，自动使过期的缓存失效
   * @returns {Promise<Object>} 失效结果
   */
  async invalidateByTime() {
    const results = {
      total: 0,
      invalidated: 0,
      errors: 0,
      details: {}
    }
    
    if (!this.enabled || !this.redis) {
      return results
    }
    
    this.logger.info('[CacheManager] 开始基于时间的缓存失效检查')
    
    try {
      // 处理数据库层缓存刷新
      const refreshIntervals = this.layers.database.refreshInterval
      
      for (const [namespace, interval] of Object.entries(refreshIntervals)) {
        try {
          // 获取该命名空间下的所有缓存键
          const keys = await this.redis.keys(`${namespace}:*`)
          results.total += keys.length
          
          if (keys.length === 0) {
            continue
          }
          
          // 获取所有键的元数据
          const pipeline = this.redis.pipeline()
          for (const key of keys) {
            pipeline.hgetall(`${key}:meta`)
          }
          
          const metaResults = await pipeline.exec()
          
          // 检查每个键是否需要刷新
          const now = Date.now()
          const keysToInvalidate = []
          
          for (let i = 0; i < keys.length; i++) {
            const meta = metaResults[i][1]
            
            // 如果没有元数据或上次更新时间 + 刷新间隔 < 当前时间，则需要刷新
            if (!meta || !meta.lastUpdated || (parseInt(meta.lastUpdated) + interval * 1000) < now) {
              keysToInvalidate.push(keys[i])
            }
          }
          
          // 删除需要刷新的键
          if (keysToInvalidate.length > 0) {
            await this.redis.del(...keysToInvalidate)
            results.invalidated += keysToInvalidate.length
            
            this.logger.info(`[CacheManager] 已使 ${namespace} 命名空间下的 ${keysToInvalidate.length} 个缓存失效`)
            results.details[namespace] = keysToInvalidate.length
          }
        } catch (error) {
          this.logger.error(`[CacheManager] 处理 ${namespace} 命名空间的缓存失效时出错:`, error)
          results.errors++
        }
      }
      
      this.logger.info(`[CacheManager] 基于时间的缓存失效检查完成，共检查 ${results.total} 个键，使 ${results.invalidated} 个键失效`)
      return results
    } catch (error) {
      this.logger.error('[CacheManager] 基于时间的缓存失效检查失败:', error)
      results.errors++
      return results
    }
  }

  /**
   * 启动自动缓存失效任务
   */
  startAutoInvalidation() {
    if (!this.enabled) return

    // 每30分钟执行一次基于时间的缓存失效
    setInterval(async () => {
      try {
        await this.invalidateByTime()
      } catch (error) {
        this.logger.error('[CacheManager] 自动缓存失效任务失败:', error)
      }
    }, 30 * 60 * 1000)

    // 每小时执行一次智能失效策略
    setInterval(async () => {
      try {
        await this.smartInvalidation()
      } catch (error) {
        this.logger.error('[CacheManager] 智能失效任务失败:', error)
      }
    }, 60 * 60 * 1000)

    // 每天执行一次缓存优化
    setInterval(async () => {
      try {
        await this.optimizeCache()
      } catch (error) {
        this.logger.error('[CacheManager] 缓存优化任务失败:', error)
      }
    }, 24 * 60 * 60 * 1000)

    this.logger.info('[CacheManager] 自动缓存失效任务已启动')
  }

  /**
   * 智能缓存失效策略
   * 基于访问模式和数据依赖关系进行智能失效
   */
  async smartInvalidation() {
    if (!this.enabled || !this.redis) return

    this.logger.info('[CacheManager] 开始智能缓存失效')

    try {
      const results = {
        totalChecked: 0,
        invalidated: 0,
        errors: 0,
        strategies: {}
      }

      // 策略1: 基于访问频率的失效
      const lowAccessResult = await this.invalidateLowAccessKeys()
      results.strategies.lowAccess = lowAccessResult
      results.totalChecked += lowAccessResult.checked
      results.invalidated += lowAccessResult.invalidated

      // 策略2: 基于数据一致性的失效
      const consistencyResult = await this.invalidateInconsistentData()
      results.strategies.consistency = consistencyResult
      results.totalChecked += consistencyResult.checked
      results.invalidated += consistencyResult.invalidated

      // 策略3: 基于内存使用的失效
      const memoryResult = await this.invalidateByMemoryPressure()
      results.strategies.memory = memoryResult
      results.totalChecked += memoryResult.checked
      results.invalidated += memoryResult.invalidated

      this.logger.info(`[CacheManager] 智能缓存失效完成，检查 ${results.totalChecked} 个键，失效 ${results.invalidated} 个键`)
      return results
    } catch (error) {
      this.logger.error('[CacheManager] 智能缓存失效失败:', error)
      return { totalChecked: 0, invalidated: 0, errors: 1, error: error.message }
    }
  }

  /**
   * 失效低访问频率的缓存键
   */
  async invalidateLowAccessKeys() {
    const result = { checked: 0, invalidated: 0, errors: 0 }

    try {
      // 获取所有热点键的访问统计
      const hotKeys = await this.redis.zrange('cache:hot_keys', 0, -1, 'WITHSCORES')
      const hotKeyMap = new Map()

      for (let i = 0; i < hotKeys.length; i += 2) {
        hotKeyMap.set(hotKeys[i], parseInt(hotKeys[i + 1]))
      }

      // 获取所有缓存键
      const allKeys = await this.redis.keys('*')
      result.checked = allKeys.length

      const keysToInvalidate = []
      const lowAccessThreshold = 5 // 访问次数低于5次的键被认为是低频访问

      for (const key of allKeys) {
        // 跳过元数据键和系统键
        if (key.endsWith(':meta') || key.startsWith('cache:hot_keys')) continue

        const accessCount = hotKeyMap.get(key) || 0
        
        // 如果访问频率很低且缓存时间超过1小时，则考虑失效
        if (accessCount < lowAccessThreshold) {
          const meta = await this.redis.hgetall(`${key}:meta`)
          if (meta && meta.lastUpdated) {
            const age = Date.now() - parseInt(meta.lastUpdated)
            if (age > 60 * 60 * 1000) { // 超过1小时
              keysToInvalidate.push(key)
            }
          }
        }
      }

      // 批量删除低频访问的键
      if (keysToInvalidate.length > 0) {
        await this.redis.del(...keysToInvalidate)
        result.invalidated = keysToInvalidate.length
        this.logger.info(`[CacheManager] 已失效 ${keysToInvalidate.length} 个低频访问的缓存键`)
      }

      return result
    } catch (error) {
      this.logger.error('[CacheManager] 失效低访问频率缓存键失败:', error)
      result.errors++
      return result
    }
  }

  /**
   * 失效不一致的数据
   */
  async invalidateInconsistentData() {
    const result = { checked: 0, invalidated: 0, errors: 0 }

    try {
      // 检查股票数据的一致性
      const stockKeys = await this.redis.keys('stock:*')
      result.checked += stockKeys.length

      const inconsistentKeys = []

      for (const key of stockKeys) {
        try {
          // 跳过元数据键
          if (key.endsWith(':meta')) continue

          const data = await this.redis.get(key)
          if (!data) continue

          const parsedData = JSON.parse(data)
          
          // 检查数据完整性
          if (this.isDataInconsistent(parsedData, key)) {
            inconsistentKeys.push(key)
          }
        } catch (error) {
          // 如果数据无法解析，也认为是不一致的
          inconsistentKeys.push(key)
        }
      }

      // 删除不一致的数据
      if (inconsistentKeys.length > 0) {
        await this.redis.del(...inconsistentKeys)
        result.invalidated = inconsistentKeys.length
        this.logger.info(`[CacheManager] 已失效 ${inconsistentKeys.length} 个不一致的缓存键`)
      }

      return result
    } catch (error) {
      this.logger.error('[CacheManager] 失效不一致数据失败:', error)
      result.errors++
      return result
    }
  }

  /**
   * 基于内存压力失效缓存
   */
  async invalidateByMemoryPressure() {
    const result = { checked: 0, invalidated: 0, errors: 0 }

    try {
      // 获取Redis内存使用情况
      const info = await this.redis.info('memory')
      const memoryMatch = info.match(/used_memory:(\d+)/)
      
      if (!memoryMatch) return result

      const usedMemory = parseInt(memoryMatch[1])
      const memoryThreshold = 100 * 1024 * 1024 // 100MB阈值

      // 如果内存使用超过阈值，开始清理
      if (usedMemory > memoryThreshold) {
        // 获取所有键并按大小排序
        const keys = await this.redis.keys('*')
        result.checked = keys.length

        const keysSizes = []

        for (const key of keys) {
          if (key.endsWith(':meta')) continue

          try {
            const meta = await this.redis.hgetall(`${key}:meta`)
            const size = meta.size ? parseInt(meta.size) : 0
            const lastUpdated = meta.lastUpdated ? parseInt(meta.lastUpdated) : 0
            
            keysSizes.push({
              key,
              size,
              lastUpdated,
              age: Date.now() - lastUpdated
            })
          } catch (error) {
            // 忽略错误
          }
        }

        // 按大小和年龄排序，优先删除大且旧的数据
        keysSizes.sort((a, b) => {
          const scoreA = a.size * Math.log(a.age + 1)
          const scoreB = b.size * Math.log(b.age + 1)
          return scoreB - scoreA
        })

        // 删除前10%的键
        const keysToDelete = keysSizes.slice(0, Math.ceil(keysSizes.length * 0.1))
        const keysToDeleteNames = keysToDelete.map(item => item.key)

        if (keysToDeleteNames.length > 0) {
          await this.redis.del(...keysToDeleteNames)
          result.invalidated = keysToDeleteNames.length
          
          const totalSizeFreed = keysToDelete.reduce((sum, item) => sum + item.size, 0)
          this.logger.info(`[CacheManager] 内存压力清理完成，删除 ${keysToDeleteNames.length} 个键，释放 ${Math.round(totalSizeFreed / 1024)}KB`)
        }
      }

      return result
    } catch (error) {
      this.logger.error('[CacheManager] 基于内存压力失效缓存失败:', error)
      result.errors++
      return result
    }
  }

  /**
   * 检查数据是否不一致
   */
  isDataInconsistent(data, key) {
    try {
      // 基本的数据完整性检查
      if (!data || typeof data !== 'object') return true

      // 检查股票数据的完整性
      if (key.includes('stock:')) {
        if (key.includes(':info')) {
          return !data.symbol || !data.name
        } else if (key.includes(':daily')) {
          return !Array.isArray(data) || data.length === 0
        }
      }

      // 检查市场数据的完整性
      if (key.includes('market:')) {
        if (key.includes('overview')) {
          return !data.timestamp || Date.now() - data.timestamp > 24 * 60 * 60 * 1000
        }
      }

      return false
    } catch (error) {
      return true
    }
  }

  /**
   * 缓存优化
   * 整体优化缓存性能和存储效率
   */
  async optimizeCache() {
    if (!this.enabled || !this.redis) return

    this.logger.info('[CacheManager] 开始缓存优化')

    try {
      const results = {
        compressed: 0,
        defragmented: 0,
        rebalanced: 0,
        errors: 0
      }

      // 1. 压缩大型缓存项
      const compressionResult = await this.compressCache()
      results.compressed = compressionResult.compressedCount || 0

      // 2. 碎片整理
      const defragResult = await this.defragmentCache()
      results.defragmented = defragResult.processed || 0

      // 3. 重新平衡热点数据
      const rebalanceResult = await this.rebalanceHotData()
      results.rebalanced = rebalanceResult.rebalanced || 0

      this.logger.info(`[CacheManager] 缓存优化完成，压缩: ${results.compressed}，整理: ${results.defragmented}，重平衡: ${results.rebalanced}`)
      return results
    } catch (error) {
      this.logger.error('[CacheManager] 缓存优化失败:', error)
      return { compressed: 0, defragmented: 0, rebalanced: 0, errors: 1, error: error.message }
    }
  }

  /**
   * 缓存碎片整理
   */
  async defragmentCache() {
    const result = { processed: 0, errors: 0 }

    try {
      // 获取所有键
      const keys = await this.redis.keys('*')
      const pipeline = this.redis.pipeline()

      let processedCount = 0

      for (const key of keys) {
        if (key.endsWith(':meta')) continue

        try {
          // 重新设置键以触发内存重新分配
          const ttl = await this.redis.ttl(key)
          if (ttl > 0) {
            const value = await this.redis.get(key)
            if (value) {
              pipeline.set(key, value, 'EX', ttl)
              processedCount++
            }
          }

          // 批量执行，避免管道过大
          if (processedCount % 100 === 0) {
            await pipeline.exec()
          }
        } catch (error) {
          result.errors++
        }
      }

      // 执行剩余的命令
      if (processedCount % 100 !== 0) {
        await pipeline.exec()
      }

      result.processed = processedCount
      this.logger.info(`[CacheManager] 缓存碎片整理完成，处理了 ${processedCount} 个键`)
      return result
    } catch (error) {
      this.logger.error('[CacheManager] 缓存碎片整理失败:', error)
      result.errors++
      return result
    }
  }

  /**
   * 重新平衡热点数据
   */
  async rebalanceHotData() {
    const result = { rebalanced: 0, errors: 0 }

    try {
      // 获取热点键
      const hotKeys = await this.getHotKeys(100)
      
      for (let i = 0; i < hotKeys.length; i += 2) {
        const key = hotKeys[i]
        const score = hotKeys[i + 1]

        try {
          // 对于高频访问的键，延长其TTL
          if (score > 50) {
            const currentTtl = await this.redis.ttl(key)
            if (currentTtl > 0 && currentTtl < 3600) {
              await this.redis.expire(key, 3600) // 延长到1小时
              result.rebalanced++
            }
          }
          // 对于中频访问的键，保持默认TTL
          else if (score > 20) {
            const currentTtl = await this.redis.ttl(key)
            if (currentTtl > 3600) {
              await this.redis.expire(key, 1800) // 缩短到30分钟
              result.rebalanced++
            }
          }
        } catch (error) {
          result.errors++
        }
      }

      this.logger.info(`[CacheManager] 热点数据重平衡完成，调整了 ${result.rebalanced} 个键`)
      return result
    } catch (error) {
      this.logger.error('[CacheManager] 热点数据重平衡失败:', error)
      result.errors++
      return result
    }
  }

  /**
   * 智能缓存预热
   * 基于访问模式和热点数据进行智能预热
   */
  async smartPrewarm() {
    if (!this.enabled || !this.redis) return

    this.logger.info('[CacheManager] 开始智能缓存预热')

    try {
      // 获取热点键列表
      const hotKeys = await this.getHotKeys(50)
      
      // 预热热点数据
      const prewarmPromises = []
      
      for (let i = 0; i < hotKeys.length; i += 2) {
        const key = hotKeys[i]
        const score = hotKeys[i + 1]
        
        // 只预热访问频率较高的键
        if (score > 10) {
          prewarmPromises.push(this.prewarmHotKey(key))
        }
      }

      // 并行执行预热任务
      const results = await Promise.allSettled(prewarmPromises)
      
      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failCount = results.filter(r => r.status === 'rejected').length
      
      this.logger.info(`[CacheManager] 智能缓存预热完成，成功: ${successCount}，失败: ${failCount}`)
      
      return { successCount, failCount, total: results.length }
    } catch (error) {
      this.logger.error('[CacheManager] 智能缓存预热失败:', error)
      return { successCount: 0, failCount: 0, total: 0, error: error.message }
    }
  }

  /**
   * 预热热点键
   * @param {String} key - 热点键
   */
  async prewarmHotKey(key) {
    try {
      // 检查键是否已存在
      const exists = await this.redis.exists(key)
      if (exists) return

      // 根据键的模式确定预热策略
      if (key.includes('stock:')) {
        const symbol = key.split(':')[1]
        if (symbol) {
          await this.prewarmStockData(symbol)
        }
      } else if (key.includes('market:')) {
        await this.prewarmMarketData()
      } else if (key.includes('search:')) {
        // 搜索结果通常不需要预热，因为它们是动态的
        return
      }
    } catch (error) {
      this.logger.warn(`[CacheManager] 预热热点键失败 (${key}):`, error)
    }
  }

  /**
   * 预热股票数据
   * @param {String} symbol - 股票代码
   */
  async prewarmStockData(symbol) {
    try {
      const stockService = this.app.service.stockService
      if (!stockService) return

      // 预热股票基本信息
      const stockInfo = await stockService.getStockInfo(symbol)
      if (stockInfo) {
        await this.set('stock', `${symbol}:info`, stockInfo, this.layers.server.ttl.stock)
      }

      // 预热股票日线数据
      const dailyData = await stockService.getDailyData(symbol, 30) // 最近30天
      if (dailyData) {
        await this.set('stock', `${symbol}:daily`, dailyData, this.layers.server.ttl.stock)
      }
    } catch (error) {
      this.logger.warn(`[CacheManager] 预热股票数据失败 (${symbol}):`, error)
    }
  }

  /**
   * 预热市场数据
   */
  async prewarmMarketData() {
    try {
      const marketService = this.app.service.marketService
      if (!marketService) return

      // 预热市场概览
      const overview = await marketService.getMarketOverview()
      if (overview) {
        await this.set('market', 'overview', overview, this.layers.server.ttl.market)
      }

      // 预热主要指数
      const indexes = await marketService.getMainIndexes()
      if (indexes) {
        await this.set('market', 'indexes', indexes, this.layers.server.ttl.market)
      }
    } catch (error) {
      this.logger.warn('[CacheManager] 预热市场数据失败:', error)
    }
  }

  /**
   * 缓存压缩
   * 对大型缓存数据进行压缩以节省内存
   */
  async compressCache() {
    if (!this.enabled || !this.redis) return

    this.logger.info('[CacheManager] 开始缓存压缩检查')

    try {
      const zlib = require('zlib')
      const util = require('util')
      const gzip = util.promisify(zlib.gzip)

      // 获取所有缓存键
      const keys = await this.redis.keys('*')
      let compressedCount = 0
      let savedBytes = 0

      for (const key of keys) {
        try {
          // 跳过元数据键和已压缩的键
          if (key.endsWith(':meta') || key.endsWith(':compressed')) continue

          const value = await this.redis.get(key)
          if (!value) continue

          const originalSize = Buffer.byteLength(value, 'utf8')
          
          // 只压缩大于1KB的数据
          if (originalSize > 1024) {
            const compressed = await gzip(value)
            const compressedSize = compressed.length

            // 如果压缩后大小减少超过20%，则使用压缩版本
            if (compressedSize < originalSize * 0.8) {
              await this.redis.set(key + ':compressed', compressed.toString('base64'))
              await this.redis.del(key)
              
              // 更新元数据
              const [namespace, ...keyParts] = key.split(':')
              const keyName = keyParts.join(':')
              await this.setMetadata(namespace, keyName, {
                compressed: true,
                originalSize,
                compressedSize
              })

              compressedCount++
              savedBytes += (originalSize - compressedSize)
            }
          }
        } catch (error) {
          this.logger.warn(`[CacheManager] 压缩缓存项失败 (${key}):`, error)
        }
      }

      this.logger.info(`[CacheManager] 缓存压缩完成，压缩了 ${compressedCount} 个项，节省了 ${Math.round(savedBytes / 1024)}KB`)
      
      return { compressedCount, savedBytes }
    } catch (error) {
      this.logger.error('[CacheManager] 缓存压缩失败:', error)
      return { compressedCount: 0, savedBytes: 0, error: error.message }
    }
  }

  /**
   * 获取压缩的缓存数据
   * @param {String} namespace - 命名空间
   * @param {String} key - 键
   * @returns {Promise<*>} 解压后的数据
   */
  async getCompressed(namespace, key) {
    if (!this.enabled || !this.redis) return null

    const cacheKey = this.getCacheKey(namespace, key)
    const compressedKey = cacheKey + ':compressed'

    try {
      const compressed = await this.redis.get(compressedKey)
      if (!compressed) return null

      const zlib = require('zlib')
      const util = require('util')
      const gunzip = util.promisify(zlib.gunzip)

      const buffer = Buffer.from(compressed, 'base64')
      const decompressed = await gunzip(buffer)
      
      this.cacheStats.hits++
      return JSON.parse(decompressed.toString())
    } catch (error) {
      this.logger.warn(`[CacheManager] 获取压缩缓存失败 (${cacheKey}):`, error)
      this.cacheStats.errors++
      return null
    }
  }
  
  /**
   * 设置缓存元数据
   * @param {String} namespace - 命名空间
   * @param {String} key - 键
   * @param {Object} metadata - 元数据
   * @returns {Promise<Boolean>} 是否成功
   */
  async setMetadata(namespace, key, metadata) {
    if (!this.enabled || !this.redis) {
      return false
    }
    
    const cacheKey = this.getCacheKey(namespace, key)
    const metaKey = `${cacheKey}:meta`
    
    try {
      // 设置默认元数据
      const defaultMeta = {
        lastUpdated: Date.now(),
        source: 'unknown',
        version: '1.0'
      }
      
      const meta = { ...defaultMeta, ...metadata }
      
      // 使用 HSET 存储元数据
      const args = []
      for (const [field, value] of Object.entries(meta)) {
        args.push(field, typeof value === 'object' ? JSON.stringify(value) : value)
      }
      
      if (args.length > 0) {
        await this.redis.hset(metaKey, ...args)
        return true
      }
      
      return false
    } catch (error) {
      this.logger.warn(`[CacheManager] 设置缓存元数据失败 (${cacheKey}):`, error)
      return false
    }
  }
  
  /**
   * 获取缓存元数据
   * @param {String} namespace - 命名空间
   * @param {String} key - 键
   * @returns {Promise<Object|null>} 元数据
   */
  async getMetadata(namespace, key) {
    if (!this.enabled || !this.redis) {
      return null
    }
    
    const cacheKey = this.getCacheKey(namespace, key)
    const metaKey = `${cacheKey}:meta`
    
    try {
      const meta = await this.redis.hgetall(metaKey)
      return Object.keys(meta).length > 0 ? meta : null
    } catch (error) {
      this.logger.warn(`[CacheManager] 获取缓存元数据失败 (${cacheKey}):`, error)
      return null
    }
  }$').test(cacheKey)) {
        // 使依赖的缓存失效
        for (const dependency of dependencies) {
          const [depNamespace, ...depKeyParts] = dependency.split(':')
          const depKey = depKeyParts.join(':')
          await this.del(depNamespace, depKey)
        }
      }
    }

    return success
  }

  /**
   * 获取缓存统计信息
   * @returns {Promise<Object>} 缓存统计信息
   */
  async getStats() {
    if (!this.redis) {
      return {
        enabled: this.enabled,
        type: 'none',
        stats: this.cacheStats,
      }
    }

    try {
      // 如果是内存缓存，直接返回统计信息
      if (this.redis.getStats) {
        const memStats = await this.redis.getStats()
        return {
          enabled: this.enabled,
          type: 'memory',
          stats: {
            ...this.cacheStats,
            memoryCache: memStats,
          },
        }
      }

      // 如果是Redis，获取Redis信息
      const info = await this.redis.info()
      const dbSize = await this.redis.dbsize()

      return {
        enabled: this.enabled,
        type: 'redis',
        stats: {
          ...this.cacheStats,
          redis: {
            dbSize,
            info: this.parseRedisInfo(info),
          },
        },
      }
    } catch (error) {
      this.logger.error('[CacheManager] 获取缓存统计信息失败:', error)
      return {
        enabled: this.enabled,
        type: this.redis ? 'redis' : 'memory',
        stats: this.cacheStats,
        error: error.message,
      }
    }
  }

  /**
   * 解析Redis信息
   * @param {String} info - Redis INFO命令返回的信息
   * @returns {Object} 解析后的信息
   */
  parseRedisInfo(info) {
    const result = {}
    const lines = info.split('\r\n')

    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const parts = line.split(':')
        if (parts.length === 2) {
          result[parts[0]] = parts[1]
        }
      }
    }

    return result
  }
}

module.exports = CacheManager
  /**
   * 定时缓存预热
   * 定期执行的缓存预热任务
   */
  async scheduledPrewarm() {
    if (!this.enabled || !this.redis) return

    this.logger.info('[CacheManager] 开始定时缓存预热')

    try {
      // 预热核心数据
      const prewarmTasks = [
        this.prewarmCoreStockData(),
        this.prewarmMarketIndicators(),
        this.prewarmPopularSearches(),
        this.prewarmUserPreferences()
      ]

      const results = await Promise.allSettled(prewarmTasks)
      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failCount = results.filter(r => r.status === 'rejected').length

      this.logger.info(`[CacheManager] 定时缓存预热完成，成功: ${successCount}，失败: ${failCount}`)
      return { successCount, failCount, total: results.length }
    } catch (error) {
      this.logger.error('[CacheManager] 定时缓存预热失败:', error)
      return { successCount: 0, failCount: 0, total: 0, error: error.message }
    }
  }

  /**
   * 预热核心股票数据
   */
  async prewarmCoreStockData() {
    try {
      // 获取热门股票列表
      const hotStocks = ['000001.SZ', '000002.SZ', '600000.SH', '600036.SH', '000858.SZ']
      
      for (const symbol of hotStocks) {
        await this.prewarmStockData(symbol)
      }

      this.logger.info('[CacheManager] 核心股票数据预热完成')
    } catch (error) {
      this.logger.error('[CacheManager] 预热核心股票数据失败:', error)
    }
  }

  /**
   * 预热市场指标
   */
  async prewarmMarketIndicators() {
    try {
      // 预热主要市场指数
      const indexes = ['000001.SH', '399001.SZ', '399006.SZ']
      
      for (const index of indexes) {
        const key = `market:index:${index}`
        const exists = await this.redis.exists(key)
        
        if (!exists) {
          // 这里应该调用实际的市场数据服务
          const mockData = {
            symbol: index,
            name: index === '000001.SH' ? '上证指数' : index === '399001.SZ' ? '深证成指' : '创业板指',
            price: 3000 + Math.random() * 1000,
            change: (Math.random() - 0.5) * 100,
            changePercent: (Math.random() - 0.5) * 5,
            timestamp: Date.now()
          }
          
          await this.set('market', `index:${index}`, mockData, this.layers.server.ttl.market)
        }
      }

      this.logger.info('[CacheManager] 市场指标预热完成')
    } catch (error) {
      this.logger.error('[CacheManager] 预热市场指标失败:', error)
    }
  }

  /**
   * 预热热门搜索
   */
  async prewarmPopularSearches() {
    try {
      const popularSearches = ['茅台', '腾讯', '阿里巴巴', '比亚迪', '宁德时代']
      
      for (const search of popularSearches) {
        const key = `search:popular:${search}`
        const exists = await this.redis.exists(key)
        
        if (!exists) {
          // 模拟搜索结果
          const mockResults = [
            { symbol: '600519.SH', name: '贵州茅台', match: search },
            { symbol: '000858.SZ', name: '五粮液', match: search }
          ]
          
          await this.set('search', `popular:${search}`, mockResults, this.layers.server.ttl.search)
        }
      }

      this.logger.info('[CacheManager] 热门搜索预热完成')
    } catch (error) {
      this.logger.error('[CacheManager] 预热热门搜索失败:', error)
    }
  }

  /**
   * 预热用户偏好设置
   */
  async prewarmUserPreferences() {
    try {
      // 预热默认用户偏好设置
      const defaultPreferences = {
        theme: 'light',
        language: 'zh-CN',
        chartType: 'candlestick',
        refreshInterval: 30000,
        notifications: true
      }
      
      const key = 'user:preferences:default'
      const exists = await this.redis.exists(key)
      
      if (!exists) {
        await this.set('user', 'preferences:default', defaultPreferences, this.layers.server.ttl.user)
      }

      this.logger.info('[CacheManager] 用户偏好设置预热完成')
    } catch (error) {
      this.logger.error('[CacheManager] 预热用户偏好设置失败:', error)
    }
  }

  /**
   * 缓存健康检查
   */
  async healthCheck() {
    if (!this.enabled || !this.redis) return

    this.logger.info('[CacheManager] 开始缓存健康检查')

    const healthReport = {
      timestamp: Date.now(),
      redis: { status: 'unknown', latency: 0, memory: 0, keys: 0 },
      cache: { hitRate: 0, totalOperations: 0, errors: 0 },
      layers: {
        client: { enabled: this.layers.client.enabled },
        server: { enabled: this.layers.server.enabled },
        database: { enabled: this.layers.database.enabled }
      }
    }

    try {
      // 检查Redis连接和性能
      const startTime = Date.now()
      await this.redis.ping()
      healthReport.redis.latency = Date.now() - startTime
      healthReport.redis.status = 'healthy'

      // 获取Redis内存使用情况
      try {
        const info = await this.redis.info('memory')
        const memoryMatch = info.match(/used_memory:(\d+)/)
        if (memoryMatch) {
          healthReport.redis.memory = parseInt(memoryMatch[1])
        }
      } catch (infoError) {
        this.logger.warn('[CacheManager] 获取Redis内存信息失败:', infoError)
      }

      // 获取缓存键数量
      try {
        const keys = await this.redis.keys('*')
        healthReport.redis.keys = keys.length
      } catch (keysError) {
        this.logger.warn('[CacheManager] 获取缓存键数量失败:', keysError)
      }

      // 计算缓存命中率
      const totalOps = this.cacheStats.hits + this.cacheStats.misses
      if (totalOps > 0) {
        healthReport.cache.hitRate = (this.cacheStats.hits / totalOps * 100).toFixed(2)
      }
      healthReport.cache.totalOperations = totalOps
      healthReport.cache.errors = this.cacheStats.errors

      // 检查缓存层状态
      if (healthReport.redis.latency > 100) {
        this.logger.warn(`[CacheManager] Redis延迟较高: ${healthReport.redis.latency}ms`)
      }

      if (healthReport.cache.hitRate < 50 && totalOps > 100) {
        this.logger.warn(`[CacheManager] 缓存命中率较低: ${healthReport.cache.hitRate}%`)
      }

      this.logger.info(`[CacheManager] 缓存健康检查完成 - Redis延迟: ${healthReport.redis.latency}ms, 命中率: ${healthReport.cache.hitRate}%, 键数量: ${healthReport.redis.keys}`)
      
      return healthReport
    } catch (error) {
      healthReport.redis.status = 'unhealthy'
      this.logger.error('[CacheManager] 缓存健康检查失败:', error)
      return healthReport
    }
  }

  /**
   * 设置元数据
   * @param {String} namespace - 命名空间
   * @param {String} key - 键
   * @param {Object} metadata - 元数据
   */
  async setMetadata(namespace, key, metadata) {
    if (!this.enabled || !this.redis) return

    try {
      const cacheKey = this.getCacheKey(namespace, key)
      const metaKey = `${cacheKey}:meta`
      
      const args = []
      for (const [field, value] of Object.entries(metadata)) {
        args.push(field, typeof value === 'object' ? JSON.stringify(value) : value)
      }
      
      if (args.length > 0) {
        await this.redis.hset(metaKey, ...args)
      }
    } catch (error) {
      this.logger.warn(`[CacheManager] 设置元数据失败 (${namespace}:${key}):`, error)
    }
  }

  /**
   * 获取元数据
   * @param {String} namespace - 命名空间
   * @param {String} key - 键
   * @returns {Promise<Object>} 元数据
   */
  async getMetadata(namespace, key) {
    if (!this.enabled || !this.redis) return {}

    try {
      const cacheKey = this.getCacheKey(namespace, key)
      const metaKey = `${cacheKey}:meta`
      
      const metadata = await this.redis.hgetall(metaKey)
      
      // 解析JSON字段
      for (const [field, value] of Object.entries(metadata)) {
        try {
          metadata[field] = JSON.parse(value)
        } catch (parseError) {
          // 如果解析失败，保持原值
        }
      }
      
      return metadata
    } catch (error) {
      this.logger.warn(`[CacheManager] 获取元数据失败 (${namespace}:${key}):`, error)
      return {}
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  getCacheStats() {
    return {
      ...this.cacheStats,
      enabled: this.enabled,
      layers: this.layers,
      prewarming: this.prewarming,
      lastPrewarmResults: this.prewarmResults
    }
  }

  /**
   * 重置缓存统计
   */
  resetCacheStats() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    }
    this.logger.info('[CacheManager] 缓存统计已重置')
  }

  /**
   * 优雅关闭缓存管理器
   */
  async shutdown() {
    this.logger.info('[CacheManager] 开始关闭缓存管理器')

    try {
      // 清理定时任务
      // 注意：在实际应用中，应该保存定时器引用以便清理
      
      // 如果使用Redis，关闭连接
      if (this.redis && typeof this.redis.quit === 'function') {
        await this.redis.quit()
        this.logger.info('[CacheManager] Redis连接已关闭')
      }

      this.logger.info('[CacheManager] 缓存管理器已关闭')
    } catch (error) {
      this.logger.error('[CacheManager] 关闭缓存管理器失败:', error)
    }
  }
}

module.exports = CacheManager