'use strict';

const Service = require('egg').Service;

/**
 * 缓存服务
 * 处理数据缓存相关的逻辑
 */
class CacheService extends Service {
  /**
   * 初始化股票数据缓存
   * 在用户登录时调用，获取并缓存基础股票数据
   * @param {Object} options - 缓存选项
   * @param {string} options.dataSource - 数据源名称，默认为 'tushare'
   * @return {Object} 缓存结果
   */
  async initStockDataCache(options = {}) {
    const { ctx, app } = this;
    const { dataSource = 'tushare' } = options;

    const result = {
      success: false,
      dataSource,
      cachedItems: 0,
      error: null,
    };

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        result.error = 'Redis 客户端不可用';
        return result;
      }

      // 测试 Redis 连接
      try {
        await app.redis.ping();
      } catch (pingErr) {
        result.error = `Redis 连接测试失败: ${pingErr.message}`;
        return result;
      }

      // 获取股票列表并缓存
      const stockListKey = `${dataSource}:stock:list`;
      let stockList;

      try {
        // 获取股票列表
        stockList = await ctx.service.stock.getStockList();

        if (stockList && stockList.length > 0) {
          // 缓存股票列表
          await app.redis.set(
            stockListKey,
            JSON.stringify({
              data: stockList,
              cacheTime: new Date().toISOString(),
            }),
            'EX',
            86400 // 24小时过期
          );

          ctx.logger.info(`股票列表已缓存，共 ${stockList.length} 条数据`);
          result.cachedItems += 1;

          // 缓存热门股票数据（前20个）
          const popularStocks = stockList.slice(0, 20);

          for (const stock of popularStocks) {
            try {
              // 获取股票实时行情
              const quoteData = await ctx.service.stock.getStockQuote(stock.symbol);

              if (quoteData) {
                const quoteKey = `${dataSource}:stock:quote:${stock.symbol}`;
                const dataToCache = {
                  ...quoteData,
                  cacheTime: new Date().toISOString(),
                };

                await app.redis.set(quoteKey, JSON.stringify(dataToCache), 'EX', 3600); // 1小时过期
                ctx.logger.info(`股票 ${stock.symbol} 行情数据已缓存`);
                result.cachedItems += 1;
              }
            } catch (stockErr) {
              ctx.logger.warn(`缓存股票 ${stock.symbol} 数据失败:`, stockErr);
              // 继续处理下一个股票
            }
          }

          // 缓存指数数据
          const indices = ['000001.SH', '399001.SZ', '399006.SZ'];

          for (const index of indices) {
            try {
              // 获取指数实时行情
              const indexData = await ctx.service.stock.getStockQuote(index);

              if (indexData) {
                const indexKey = `${dataSource}:index:quote:${index}`;
                const dataToCache = {
                  ...indexData,
                  cacheTime: new Date().toISOString(),
                };

                await app.redis.set(indexKey, JSON.stringify(dataToCache), 'EX', 3600); // 1小时过期
                ctx.logger.info(`指数 ${index} 行情数据已缓存`);
                result.cachedItems += 1;
              }
            } catch (indexErr) {
              ctx.logger.warn(`缓存指数 ${index} 数据失败:`, indexErr);
              // 继续处理下一个指数
            }
          }

          // 缓存行业数据
          try {
            const industries = [...new Set(stockList.map(stock => stock.industry).filter(Boolean))];

            if (industries.length > 0) {
              const industryKey = `${dataSource}:industry:list`;
              const dataToCache = {
                data: industries,
                cacheTime: new Date().toISOString(),
              };

              await app.redis.set(industryKey, JSON.stringify(dataToCache), 'EX', 86400); // 24小时过期
              ctx.logger.info(`行业列表已缓存，共 ${industries.length} 个行业`);
              result.cachedItems += 1;
            }
          } catch (industryErr) {
            ctx.logger.warn('缓存行业数据失败:', industryErr);
          }

          result.success = true;
        } else {
          result.error = '获取股票列表失败或列表为空';
        }
      } catch (listErr) {
        ctx.logger.error('获取股票列表失败:', listErr);
        result.error = `获取股票列表失败: ${listErr.message || '未知错误'}`;
      }
    } catch (err) {
      ctx.logger.error('初始化股票数据缓存失败:', err);
      result.error = err.message || '未知错误';
    }

    return result;
  }

  /**
   * 获取缓存状态
   * @param {string} dataSource - 数据源名称，默认为 'tushare'
   * @return {Object} 缓存状态
   */
  async getCacheStatus(dataSource = 'tushare') {
    const { ctx, app } = this;

    const result = {
      success: false,
      dataSource,
      available: false,
      lastUpdate: null,
      cacheKeys: [],
      stockCount: 0,
      indexCount: 0,
      industryCount: 0,
      error: null,
    };

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        result.error = 'Redis 客户端不可用';
        return result;
      }

      // 测试 Redis 连接
      try {
        if (typeof app.redis.ping === 'function') {
          await app.redis.ping();
          result.available = true;
        } else {
          result.error = 'Redis ping 方法不可用';
          return result;
        }
      } catch (pingErr) {
        result.error = `Redis 连接测试失败: ${pingErr.message}`;
        return result;
      }

      // 获取所有与数据源相关的键
      const keys = await app.redis.keys(`${dataSource}:*`);
      result.cacheKeys = keys;

      // 统计不同类型的缓存数量
      result.stockCount = keys.filter(key => key.includes(':stock:')).length;
      result.indexCount = keys.filter(key => key.includes(':index:')).length;
      result.industryCount = keys.filter(key => key.includes(':industry:')).length;

      // 获取最后更新时间
      const stockListKey = `${dataSource}:stock:list`;
      const stockListData = await app.redis.get(stockListKey);

      if (stockListData) {
        try {
          const parsed = JSON.parse(stockListData);
          result.lastUpdate = parsed.cacheTime;
        } catch (parseErr) {
          ctx.logger.warn('解析股票列表缓存数据失败:', parseErr);
        }
      }

      result.success = true;
    } catch (err) {
      ctx.logger.error('获取缓存状态失败:', err);
      result.error = err.message || '未知错误';
    }

    return result;
  }

  /**
   * 清除数据源缓存
   * @param {string} dataSource - 数据源名称，默认为 'tushare'
   * @return {Object} 清除结果
   */
  async clearCache(dataSource = 'tushare') {
    const { ctx, app } = this;

    const result = {
      success: false,
      dataSource,
      clearedKeys: [],
      error: null,
    };

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        result.error = 'Redis 客户端不可用';
        return result;
      }

      // 获取所有与数据源相关的键
      let keys = [];
      if (typeof app.redis.keys === 'function') {
        keys = await app.redis.keys(`${dataSource}:*`);
      } else {
        result.error = 'Redis keys 方法不可用';
        return result;
      }

      if (keys.length > 0) {
        // 删除所有键
        for (const key of keys) {
          if (typeof app.redis.del === 'function') {
            await app.redis.del(key);
            result.clearedKeys.push(key);
          }
        }

        ctx.logger.info(`已清除 ${dataSource} 数据源的 ${keys.length} 个缓存项`);
        result.success = true;
      } else {
        result.success = true;
        ctx.logger.info(`${dataSource} 数据源没有缓存项需要清除`);
      }
    } catch (err) {
      ctx.logger.error('清除缓存失败:', err);
      result.error = err.message || '未知错误';
    }

    return result;
  }

  /**
   * 获取最后缓存更新时间
   * @param {string} dataSource - 数据源名称，默认为 'tushare'
   * @return {Object} 最后更新时间
   */
  async getLastUpdateTime(dataSource = 'tushare') {
    const { ctx, app } = this;

    const result = {
      success: false,
      dataSource,
      lastUpdate: null,
      error: null,
    };

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        result.error = 'Redis 客户端不可用';
        return result;
      }

      // 获取股票列表缓存
      const stockListKey = `${dataSource}:stock:list`;
      const stockListData = await app.redis.get(stockListKey);

      if (stockListData) {
        try {
          const parsed = JSON.parse(stockListData);
          result.lastUpdate = parsed.cacheTime;
          result.success = true;
        } catch (parseErr) {
          ctx.logger.warn('解析股票列表缓存数据失败:', parseErr);
          result.error = '解析缓存数据失败';
        }
      } else {
        result.error = '未找到缓存数据';
      }
    } catch (err) {
      ctx.logger.error('获取最后更新时间失败:', err);
      result.error = err.message || '未知错误';
    }

    return result;
  }

  /**
   * 检查是否可以刷新缓存
   * 根据上次刷新时间，判断是否已经过了限制时间（默认1小时）
   * @param {string} dataSource - 数据源名称，默认为 'tushare'
   * @param {number} limitHours - 限制时间（小时），默认为1
   * @return {Object} 检查结果
   */
  async canRefreshCache(dataSource = 'tushare', limitHours = 1) {
    const { ctx, app } = this;

    const result = {
      success: false,
      dataSource,
      canRefresh: false,
      lastUpdate: null,
      nextRefreshTime: null,
      timeRemaining: null, // 剩余时间（毫秒）
      error: null,
    };

    try {
      // 获取最后更新时间
      const lastUpdateResult = await this.getLastUpdateTime(dataSource);

      if (lastUpdateResult.success && lastUpdateResult.lastUpdate) {
        result.lastUpdate = lastUpdateResult.lastUpdate;

        // 计算时间差
        const lastUpdateTime = new Date(lastUpdateResult.lastUpdate).getTime();
        const now = Date.now();
        const diffMs = now - lastUpdateTime;
        const limitMs = limitHours * 60 * 60 * 1000;

        result.canRefresh = diffMs >= limitMs;

        if (!result.canRefresh) {
          // 计算下次可刷新时间
          const nextRefreshTime = new Date(lastUpdateTime + limitMs);
          result.nextRefreshTime = nextRefreshTime.toISOString();
          result.timeRemaining = limitMs - diffMs;
        }

        result.success = true;
      } else {
        // 如果没有找到最后更新时间，则可以刷新
        result.canRefresh = true;
        result.success = true;
      }
    } catch (err) {
      ctx.logger.error('检查是否可以刷新缓存失败:', err);
      result.error = err.message || '未知错误';
    }

    return result;
  }

  /**
   * 记录缓存命中
   * @param {string} dataSource - 数据源
   */
  async recordCacheHit(dataSource) {
    const { app, ctx } = this;

    try {
      if (app.redis && typeof app.redis.incr === 'function') {
        // 增加命中计数
        await app.redis.incr(`${dataSource}:hit_count`);
      } else {
        // Redis不可用时，使用内存统计
        if (!global.cacheStats) {
          global.cacheStats = {};
        }
        if (!global.cacheStats[dataSource]) {
          global.cacheStats[dataSource] = { hits: 0, misses: 0 };
        }
        global.cacheStats[dataSource].hits++;
        ctx.logger.debug(`内存缓存统计 - ${dataSource} 命中: ${global.cacheStats[dataSource].hits}`);
      }
    } catch (error) {
      ctx.logger.warn('记录缓存命中失败:', error);
      // 降级到内存统计
      if (!global.cacheStats) {
        global.cacheStats = {};
      }
      if (!global.cacheStats[dataSource]) {
        global.cacheStats[dataSource] = { hits: 0, misses: 0 };
      }
      global.cacheStats[dataSource].hits++;
    }
  }

  /**
   * 记录缓存未命中
   * @param {string} dataSource - 数据源
   */
  async recordCacheMiss(dataSource) {
    const { app, ctx } = this;

    try {
      if (app.redis && typeof app.redis.incr === 'function') {
        // 增加未命中计数
        await app.redis.incr(`${dataSource}:miss_count`);
      } else {
        // Redis不可用时，使用内存统计
        if (!global.cacheStats) {
          global.cacheStats = {};
        }
        if (!global.cacheStats[dataSource]) {
          global.cacheStats[dataSource] = { hits: 0, misses: 0 };
        }
        global.cacheStats[dataSource].misses++;
        ctx.logger.debug(`内存缓存统计 - ${dataSource} 未命中: ${global.cacheStats[dataSource].misses}`);
      }
    } catch (error) {
      ctx.logger.warn('记录缓存未命中失败:', error);
      // 降级到内存统计
      if (!global.cacheStats) {
        global.cacheStats = {};
      }
      if (!global.cacheStats[dataSource]) {
        global.cacheStats[dataSource] = { hits: 0, misses: 0 };
      }
      global.cacheStats[dataSource].misses++;
    }
  }

  /**
   * 设置缓存键的过期时间
   * @param {string} key - 缓存键
   * @param {number} seconds - 过期时间（秒）
   * @returns {Promise<Object>} - 设置结果
   */
  async setKeyExpiration(key, seconds) {
    const { app } = this;
    const redis = app.redis;

    try {
      // 检查键是否存在
      const exists = await redis.exists(key);
      if (!exists) {
        return {
          success: false,
          message: `缓存键 ${key} 不存在`
        };
      }

      // 设置过期时间
      const result = await redis.expire(key, seconds);

      return {
        success: true,
        message: `缓存键 ${key} 的过期时间已设置为 ${seconds} 秒`,
        result
      };
    } catch (error) {
      this.ctx.logger.error('设置缓存过期时间失败:', error);
      return {
        success: false,
        message: '设置缓存过期时间失败',
        error: error.message
      };
    }
  }

  /**
   * 设置缓存数据
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（秒）
   * @returns {Promise<Object>} - 设置结果
   */
  async set(key, value, ttl = 3600) {
    const { app, ctx } = this;

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        return {
          success: false,
          message: 'Redis 客户端不可用',
          error: 'Redis not available'
        };
      }

      // 将值转换为JSON字符串
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

      // 设置缓存
      if (typeof app.redis.set === 'function') {
        await app.redis.set(key, valueStr, 'EX', ttl);
      } else {
        return {
          success: false,
          message: 'Redis set 方法不可用',
          error: 'Redis set method not available'
        };
      }

      ctx.logger.info(`缓存设置成功: ${key}, TTL: ${ttl}秒`);

      return {
        success: true,
        message: `缓存 ${key} 设置成功`,
        key,
        ttl
      };
    } catch (error) {
      ctx.logger.error('设置缓存失败:', error);
      return {
        success: false,
        message: '设置缓存失败',
        error: error.message
      };
    }
  }

  /**
   * 获取缓存数据
   * @param {string} key - 缓存键
   * @returns {Promise<Object>} - 获取结果
   */
  async get(key) {
    const { app, ctx } = this;

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        return {
          success: false,
          message: 'Redis 客户端不可用',
          data: null
        };
      }

      // 获取缓存
      let value = null;
      if (typeof app.redis.get === 'function') {
        value = await app.redis.get(key);
      } else {
        return {
          success: false,
          message: 'Redis get 方法不可用',
          data: null
        };
      }

      if (value === null) {
        return {
          success: false,
          message: '缓存不存在或已过期',
          data: null
        };
      }

      // 尝试解析JSON
      let data;
      try {
        data = JSON.parse(value);
      } catch (parseErr) {
        // 如果解析失败，返回原始字符串
        data = value;
      }

      ctx.logger.info(`缓存获取成功: ${key}`);

      return {
        success: true,
        message: `缓存 ${key} 获取成功`,
        data
      };
    } catch (error) {
      ctx.logger.error('获取缓存失败:', error);
      return {
        success: false,
        message: '获取缓存失败',
        error: error.message,
        data: null
      };
    }
  }

  /**
   * 删除缓存键
   * @param {string} key - 缓存键
   * @returns {Promise<Object>} - 删除结果
   */
  async deleteKey(key) {
    const { app } = this;
    const redis = app.redis;

    try {
      // 删除键
      const result = await redis.del(key);

      return {
        success: true,
        message: `缓存键 ${key} 已删除`,
        result
      };
    } catch (error) {
      this.ctx.logger.error('删除缓存键失败:', error);
      return {
        success: false,
        message: '删除缓存键失败',
        error: error.message
      };
    }
  }

  /**
   * 设置缓存数据
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（秒）
   * @returns {Promise<Object>} - 设置结果
   */
  async set(key, value, ttl = 3600) {
    const { app, ctx } = this;

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        return {
          success: false,
          message: 'Redis 客户端不可用',
          error: 'Redis not available'
        };
      }

      // 将值转换为JSON字符串
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

      // 设置缓存
      if (typeof app.redis.set === 'function') {
        await app.redis.set(key, valueStr, 'EX', ttl);
      } else {
        return {
          success: false,
          message: 'Redis set 方法不可用',
          error: 'Redis set method not available'
        };
      }

      ctx.logger.info(`缓存设置成功: ${key}, TTL: ${ttl}秒`);

      return {
        success: true,
        message: `缓存 ${key} 设置成功`,
        key,
        ttl
      };
    } catch (error) {
      ctx.logger.error('设置缓存失败:', error);
      return {
        success: false,
        message: '设置缓存失败',
        error: error.message
      };
    }
  }

  /**
   * 获取缓存数据
   * @param {string} key - 缓存键
   * @returns {Promise<Object>} - 获取结果
   */
  async get(key) {
    const { app, ctx } = this;

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        return {
          success: false,
          message: 'Redis 客户端不可用',
          data: null
        };
      }

      // 获取缓存
      let value = null;
      if (typeof app.redis.get === 'function') {
        value = await app.redis.get(key);
      } else {
        return {
          success: false,
          message: 'Redis get 方法不可用',
          data: null
        };
      }

      if (value === null) {
        return {
          success: false,
          message: '缓存不存在或已过期',
          data: null
        };
      }

      // 尝试解析JSON
      let data;
      try {
        data = JSON.parse(value);
      } catch (parseErr) {
        // 如果解析失败，返回原始字符串
        data = value;
      }

      ctx.logger.info(`缓存获取成功: ${key}`);

      return {
        success: true,
        message: `缓存 ${key} 获取成功`,
        data
      };
    } catch (error) {
      ctx.logger.error('获取缓存失败:', error);
      return {
        success: false,
        message: '获取缓存失败',
        error: error.message,
        data: null
      };
    }
  }

  /**
   * 基于时间的自动缓存清理
   * 清理指定数据源中超过指定时间的缓存
   * @param {string} dataSource - 数据源名称，默认为 'tushare'
   * @param {number} maxAgeHours - 最大缓存时间（小时），默认为24
   * @returns {Promise<Object>} - 清理结果
   */
  async cleanCacheByTime(dataSource = 'tushare', maxAgeHours = 24) {
    const { ctx, app } = this;

    const result = {
      success: false,
      dataSource,
      maxAgeHours,
      clearedKeys: [],
      error: null,
    };

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        result.error = 'Redis 客户端不可用';
        return result;
      }

      // 获取所有与数据源相关的键
      const keys = await app.redis.keys(`${dataSource}:*`);

      if (keys.length === 0) {
        result.success = true;
        ctx.logger.info(`${dataSource} 数据源没有缓存项需要清理`);
        return result;
      }

      // 当前时间
      const now = new Date();

      // 遍历所有键，检查缓存时间
      for (const key of keys) {
        try {
          // 获取键的值
          const value = await app.redis.get(key);

          if (value) {
            try {
              // 解析值
              const data = JSON.parse(value);

              // 检查是否有缓存时间
              if (data.cacheTime) {
                const cacheTime = new Date(data.cacheTime);
                const ageMs = now.getTime() - cacheTime.getTime();
                const ageHours = ageMs / (1000 * 60 * 60);

                // 如果缓存时间超过最大时间，删除键
                if (ageHours > maxAgeHours) {
                  await app.redis.del(key);
                  result.clearedKeys.push(key);
                  ctx.logger.info(`已清除过期缓存: ${key}, 缓存时间: ${ageHours.toFixed(2)}小时`);
                }
              }
            } catch (parseErr) {
              ctx.logger.warn(`解析缓存数据失败: ${key}`, parseErr);
              // 如果解析失败，也删除键
              await app.redis.del(key);
              result.clearedKeys.push(key);
            }
          }
        } catch (keyErr) {
          ctx.logger.warn(`处理缓存键失败: ${key}`, keyErr);
        }
      }

      // 记录清理时间
      await app.redis.set(`${dataSource}:last_cleaned_time`, now.toISOString());

      result.success = true;
      ctx.logger.info(`已清除 ${dataSource} 数据源的 ${result.clearedKeys.length} 个过期缓存项`);
    } catch (err) {
      ctx.logger.error('基于时间的缓存清理失败:', err);
      result.error = err.message || '未知错误';
    }

    return result;
  }

  /**
   * 基于容量的自动缓存清理
   * 当缓存数量超过指定容量时，清理最旧的缓存
   * @param {string} dataSource - 数据源名称，默认为 'tushare'
   * @param {number} maxItems - 最大缓存数量，默认为1000
   * @returns {Promise<Object>} - 清理结果
   */
  async cleanCacheByCapacity(dataSource = 'tushare', maxItems = 1000) {
    const { ctx, app } = this;

    const result = {
      success: false,
      dataSource,
      maxItems,
      clearedKeys: [],
      error: null,
    };

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        result.error = 'Redis 客户端不可用';
        return result;
      }

      // 获取所有与数据源相关的键
      let keys = [];
      if (typeof app.redis.keys === 'function') {
        keys = await app.redis.keys(`${dataSource}:*`);
      } else {
        result.error = 'Redis keys 方法不可用';
        return result;
      }

      if (keys.length <= maxItems) {
        result.success = true;
        ctx.logger.info(`${dataSource} 数据源的缓存数量 ${keys.length} 未超过最大容量 ${maxItems}`);
        return result;
      }

      // 获取所有键的缓存时间
      const keyAges = [];

      for (const key of keys) {
        try {
          // 获取键的值
          const value = await app.redis.get(key);

          if (value) {
            try {
              // 解析值
              const data = JSON.parse(value);

              // 检查是否有缓存时间
              if (data.cacheTime) {
                const cacheTime = new Date(data.cacheTime);
                keyAges.push({ key, cacheTime });
              } else {
                // 如果没有缓存时间，使用当前时间
                keyAges.push({ key, cacheTime: new Date() });
              }
            } catch (parseErr) {
              ctx.logger.warn(`解析缓存数据失败: ${key}`, parseErr);
              // 如果解析失败，使用当前时间
              keyAges.push({ key, cacheTime: new Date() });
            }
          }
        } catch (keyErr) {
          ctx.logger.warn(`处理缓存键失败: ${key}`, keyErr);
        }
      }

      // 按缓存时间排序（从旧到新）
      keyAges.sort((a, b) => a.cacheTime.getTime() - b.cacheTime.getTime());

      // 计算需要删除的数量
      const deleteCount = keys.length - maxItems;

      // 删除最旧的键
      for (let i = 0; i < deleteCount && i < keyAges.length; i++) {
        const { key } = keyAges[i];
        await app.redis.del(key);
        result.clearedKeys.push(key);
        ctx.logger.info(`已清除超容量缓存: ${key}`);
      }

      // 记录清理时间
      await app.redis.set(`${dataSource}:last_cleaned_capacity`, new Date().toISOString());

      result.success = true;
      ctx.logger.info(`已清除 ${dataSource} 数据源的 ${result.clearedKeys.length} 个超容量缓存项`);
    } catch (err) {
      ctx.logger.error('基于容量的缓存清理失败:', err);
      result.error = err.message || '未知错误';
    }

    return result;
  }

  /**
   * 自动缓存清理
   * 结合基于时间和容量的清理策略
   * @param {string} dataSource - 数据源名称，默认为 'tushare'
   * @param {Object} options - 清理选项
   * @param {number} options.maxAgeHours - 最大缓存时间（小时），默认为24
   * @param {number} options.maxItems - 最大缓存数量，默认为1000
   * @returns {Promise<Object>} - 清理结果
   */
  async autoCleanCache(dataSource = 'tushare', options = {}) {
    const { ctx } = this;
    const { maxAgeHours = 24, maxItems = 1000 } = options;

    const result = {
      success: false,
      dataSource,
      timeBasedCleaning: null,
      capacityBasedCleaning: null,
      error: null,
    };

    try {
      // 基于时间的清理
      const timeResult = await this.cleanCacheByTime(dataSource, maxAgeHours);
      result.timeBasedCleaning = timeResult;

      // 基于容量的清理
      const capacityResult = await this.cleanCacheByCapacity(dataSource, maxItems);
      result.capacityBasedCleaning = capacityResult;

      result.success = true;
      ctx.logger.info(`自动缓存清理完成: ${dataSource}`);
    } catch (err) {
      ctx.logger.error('自动缓存清理失败:', err);
      result.error = err.message || '未知错误';
    }

    return result;
  }
}

module.exports = CacheService;
