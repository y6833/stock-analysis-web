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
        await app.redis.ping();
        result.available = true;
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
      const keys = await app.redis.keys(`${dataSource}:*`);

      if (keys.length > 0) {
        // 删除所有键
        for (const key of keys) {
          await app.redis.del(key);
          result.clearedKeys.push(key);
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
}

module.exports = CacheService;
