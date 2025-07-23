'use strict';

const DatabaseOptimizer = require('./database_optimizer');
const CacheManager = require('./cache_manager');

/**
 * 应用程序引导工具
 * 负责在应用启动时执行初始化任务
 */
class AppBootstrap {
  constructor(app) {
    this.app = app;
    this.logger = app.logger;
  }

  /**
   * 执行应用程序引导过程
   */
  async bootstrap() {
    this.logger.info('[AppBootstrap] 开始应用程序引导过程');

    try {
      // 初始化数据库优化器
      await this.initDatabaseOptimizer();

      // 初始化缓存系统
      await this.initCacheSystem();

      // 初始化其他系统组件
      // ...

      this.logger.info('[AppBootstrap] 应用程序引导过程完成');
    } catch (error) {
      this.logger.error('[AppBootstrap] 应用程序引导过程失败:', error);
    }
  }

  /**
   * 初始化数据库优化器
   */
  async initDatabaseOptimizer() {
    try {
      this.logger.info('[AppBootstrap] 初始化数据库优化器');

      // 创建数据库优化器实例
      const dbOptimizer = new DatabaseOptimizer(this.app);

      // 初始化数据库优化器
      await dbOptimizer.init();

      // 将数据库优化器添加到应用实例
      this.app.util = this.app.util || {};
      this.app.util.DatabaseOptimizer = DatabaseOptimizer;

      this.logger.info('[AppBootstrap] 数据库优化器初始化完成');
    } catch (error) {
      this.logger.error('[AppBootstrap] 初始化数据库优化器失败:', error);
      throw error;
    }
  }

  /**
   * 初始化缓存系统
   */
  async initCacheSystem() {
    try {
      this.logger.info('[AppBootstrap] 初始化缓存系统');

      // 创建缓存管理器实例
      const cacheManager = new CacheManager(this.app);

      // 初始化缓存管理器
      await cacheManager.init();

      // 将缓存管理器添加到应用实例
      this.app.util = this.app.util || {};
      this.app.util.CacheManager = CacheManager;
      this.app.cacheManager = cacheManager;

      this.logger.info('[AppBootstrap] 缓存系统初始化完成');
    } catch (error) {
      this.logger.error('[AppBootstrap] 初始化缓存系统失败:', error);

      // 如果高级缓存系统初始化失败，回退到基本缓存系统
      this.initBasicCacheSystem();
    }
  }

  /**
   * 初始化基本缓存系统（作为备用）
   */
  async initBasicCacheSystem() {
    try {
      this.logger.info('[AppBootstrap] 初始化基本缓存系统');

      // 检查Redis是否可用
      if (this.app.redis) {
        try {
          // 测试Redis连接
          await this.app.redis.ping();
          this.logger.info('[AppBootstrap] Redis连接成功');

          // 设置Redis键前缀
          const keyPrefix = this.app.config.env === 'prod' ? 'prod:' : 'dev:';
          this.app.redis.options.keyPrefix = keyPrefix;

          this.logger.info(`[AppBootstrap] Redis键前缀设置为: ${keyPrefix}`);
        } catch (redisError) {
          this.logger.error('[AppBootstrap] Redis连接失败:', redisError);
          this.logger.warn('[AppBootstrap] 系统将使用内存缓存作为备用');

          // 如果Redis不可用，设置内存缓存作为备用
          this.setupMemoryCache();
        }
      } else {
        this.logger.warn('[AppBootstrap] Redis未配置，系统将使用内存缓存');

        // 如果未配置Redis，设置内存缓存
        this.setupMemoryCache();
      }

      this.logger.info('[AppBootstrap] 基本缓存系统初始化完成');
    } catch (error) {
      this.logger.error('[AppBootstrap] 初始化基本缓存系统失败:', error);
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
        const item = this.store.get(key);
        if (!item) {
          this.stats.misses++;
          return null;
        }

        if (item.expiry && item.expiry < Date.now()) {
          this.store.delete(key);
          this.stats.misses++;
          return null;
        }

        this.stats.hits++;
        return item.value;
      },

      async set(key, value, expiryMode, time) {
        let expiry = null;
        if (expiryMode === 'EX') {
          expiry = Date.now() + time * 1000;
        }

        this.store.set(key, { value, expiry });
        this.stats.sets++;
        return 'OK';
      },

      async del(...keys) {
        let count = 0;
        for (const key of keys) {
          if (this.store.delete(key)) {
            count++;
          }
        }
        this.stats.deletes += count;
        return count;
      },

      async keys(pattern) {
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
        const keys = [];

        for (const key of this.store.keys()) {
          if (regex.test(key)) {
            keys.push(key);
          }
        }

        return keys;
      },

      async ping() {
        return 'PONG';
      },

      async getStats() {
        return { ...this.stats };
      },
    };

    // 将内存缓存添加到应用实例
    this.app.memoryCache = memoryCache;

    // 如果Redis不可用，将memoryCache作为redis的替代
    if (!this.app.redis) {
      this.app.redis = memoryCache;
    }
  }
}

module.exports = AppBootstrap;
