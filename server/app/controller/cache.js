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
   * 清除指定数据源的所有缓存
   */
  async clearDataSourceCache() {
    const { ctx, service } = this;
    const { dataSource } = ctx.params;

    if (!dataSource) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少数据源参数'
      };
      return;
    }

    try {
      // 使用 Redis 的 SCAN 命令查找匹配的键
      const keys = await service.cache.scanKeys(`${dataSource}:*`);

      if (keys.length === 0) {
        ctx.body = {
          success: true,
          message: `没有找到数据源为 ${dataSource} 的缓存`,
          count: 0
        };
        return;
      }

      // 删除找到的键
      const result = await service.cache.deleteKeys(keys);

      ctx.body = {
        success: true,
        message: `已清除数据源为 ${dataSource} 的缓存`,
        count: result,
        keys
      };
    } catch (error) {
      ctx.logger.error(`清除数据源缓存失败: ${error.message}`);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `清除数据源缓存失败: ${error.message}`
      };
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

  /**
   * 获取缓存统计信息
   */
  async getStats() {
    const { ctx, app } = this;
    const { source } = ctx.params;

    try {
      // 验证数据源参数
      if (!source) {
        ctx.body = {
          success: false,
          message: '缺少数据源参数',
        };
        return;
      }

      // 检查Redis是否可用
      if (!app.redis) {
        ctx.body = {
          success: false,
          message: 'Redis 客户端不可用，使用内存缓存统计',
          source,
          count: 0,
          lastCleared: null,
          hitCount: 0,
          missCount: 0,
          hitRate: 0
        };
        return;
      }

      // 获取Redis客户端
      const redis = app.redis;

      // 获取与指定数据源相关的所有键
      const keys = await redis.keys(`${source}:*`);

      // 获取上次清除时间
      const lastCleared = await redis.get(`${source}:last_cleared`);

      // 获取缓存命中率
      const hitCount = parseInt(await redis.get(`${source}:hit_count`) || '0');
      const missCount = parseInt(await redis.get(`${source}:miss_count`) || '0');
      const hitRate = hitCount + missCount > 0 ? (hitCount / (hitCount + missCount) * 100).toFixed(2) : 0;

      ctx.body = {
        success: true,
        source,
        count: keys.length,
        lastCleared,
        hitCount,
        missCount,
        hitRate
      };
    } catch (error) {
      ctx.logger.error('获取缓存统计信息失败:', error);
      ctx.body = {
        success: false,
        message: '获取缓存统计信息失败',
        error: error.message,
      };
    }
  }

  /**
   * 获取缓存详情
   */
  async getDetails() {
    const { ctx, app } = this;
    const { source } = ctx.params;
    const { page = 1, pageSize = 20, search = '' } = ctx.query;

    try {
      // 验证数据源参数
      if (!source) {
        ctx.body = {
          success: false,
          message: '缺少数据源参数',
        };
        return;
      }

      // 获取Redis客户端
      const redis = app.redis;

      if (!redis) {
        ctx.body = {
          success: false,
          message: 'Redis 客户端不可用',
        };
        return;
      }

      // 获取与指定数据源相关的所有键
      let keys = [];
      if (typeof redis.keys === 'function') {
        keys = await redis.keys(`${source}:*`);
      } else {
        ctx.body = {
          success: false,
          message: 'Redis keys 方法不可用',
        };
        return;
      }

      // 如果有搜索条件，过滤键
      if (search) {
        keys = keys.filter(key => key.toLowerCase().includes(search.toLowerCase()));
      }

      // 计算总数和分页
      const total = keys.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, total);
      const pagedKeys = keys.slice(startIndex, endIndex);

      // 获取键的详细信息
      const details = [];
      for (const key of pagedKeys) {
        // 获取键的类型
        const type = await redis.type(key);

        // 根据类型获取值
        let value;
        let size = 0;

        switch (type) {
        case 'string':
          value = await redis.get(key);
          size = Buffer.byteLength(value, 'utf8');
          break;
        case 'hash':
          value = await redis.hgetall(key);
          size = Buffer.byteLength(JSON.stringify(value), 'utf8');
          break;
        case 'list':
          const listLength = await redis.llen(key);
          value = await redis.lrange(key, 0, listLength - 1);
          size = Buffer.byteLength(JSON.stringify(value), 'utf8');
          break;
        case 'set':
          value = await redis.smembers(key);
          size = Buffer.byteLength(JSON.stringify(value), 'utf8');
          break;
        case 'zset':
          value = await redis.zrange(key, 0, -1, 'WITHSCORES');
          size = Buffer.byteLength(JSON.stringify(value), 'utf8');
          break;
        default:
          value = null;
        }

        // 获取过期时间（TTL）
        const ttl = await redis.ttl(key);

        details.push({
          key,
          type,
          value: typeof value === 'string' && value.length > 1000 ? `${value.substring(0, 1000)}...` : value,
          size: `${(size / 1024).toFixed(2)} KB`,
          ttl: ttl > 0 ? `${ttl} 秒` : (ttl === -1 ? '永不过期' : '已过期'),
          createdAt: await redis.get(`${key}:created_at`) || '未知'
        });
      }

      ctx.body = {
        success: true,
        source,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        details
      };
    } catch (error) {
      ctx.logger.error('获取缓存详情失败:', error);
      ctx.body = {
        success: false,
        message: '获取缓存详情失败',
        error: error.message,
      };
    }
  }

  /**
   * 删除缓存键
   */
  async deleteKey() {
    const { ctx } = this;
    const { key, source } = ctx.request.body;

    try {
      // 验证参数
      if (!key || !source) {
        ctx.body = {
          success: false,
          message: '缺少必要参数',
        };
        return;
      }

      // 使用缓存服务删除键
      const result = await ctx.service.cache.deleteKey(key);

      // 记录日志
      await ctx.service.logs.addDataSourceLog({
        level: 'INFO',
        source,
        message: `删除缓存键: ${key}`,
        data: { key, result }
      });

      ctx.body = result;
    } catch (error) {
      ctx.logger.error('删除缓存键失败:', error);
      ctx.body = {
        success: false,
        message: '删除缓存键失败',
        error: error.message,
      };
    }
  }

  /**
   * 设置缓存过期时间
   */
  async setExpire() {
    const { ctx } = this;
    const { key, seconds, source } = ctx.request.body;

    try {
      // 验证参数
      if (!key || !seconds || !source) {
        ctx.body = {
          success: false,
          message: '缺少必要参数',
        };
        return;
      }

      // 使用缓存服务设置过期时间
      const result = await ctx.service.cache.setKeyExpiration(key, seconds);

      // 记录日志
      await ctx.service.logs.addDataSourceLog({
        level: 'INFO',
        source,
        message: `设置缓存键过期时间: ${key}, ${seconds}秒`,
        data: { key, seconds, result }
      });

      ctx.body = result;
    } catch (error) {
      ctx.logger.error('设置缓存过期时间失败:', error);
      ctx.body = {
        success: false,
        message: '设置缓存过期时间失败',
        error: error.message,
      };
    }
  }

  /**
   * 基于时间的缓存清理
   */
  async cleanCacheByTime() {
    const { ctx } = this;
    const { source, maxAgeHours = 24 } = ctx.request.body;

    try {
      // 验证参数
      if (!source) {
        ctx.body = {
          success: false,
          message: '缺少数据源参数',
        };
        return;
      }

      // 使用缓存服务清理缓存
      const result = await ctx.service.cache.cleanCacheByTime(source, maxAgeHours);

      // 记录日志
      await ctx.service.logs.addDataSourceLog({
        level: 'INFO',
        source,
        message: `基于时间的缓存清理: ${source}, 最大缓存时间: ${maxAgeHours}小时`,
        data: { source, maxAgeHours, clearedCount: result.clearedKeys.length }
      });

      ctx.body = result;
    } catch (error) {
      ctx.logger.error('基于时间的缓存清理失败:', error);
      ctx.body = {
        success: false,
        message: '基于时间的缓存清理失败',
        error: error.message,
      };
    }
  }

  /**
   * 基于容量的缓存清理
   */
  async cleanCacheByCapacity() {
    const { ctx } = this;
    const { source, maxItems = 1000 } = ctx.request.body;

    try {
      // 验证参数
      if (!source) {
        ctx.body = {
          success: false,
          message: '缺少数据源参数',
        };
        return;
      }

      // 使用缓存服务清理缓存
      const result = await ctx.service.cache.cleanCacheByCapacity(source, maxItems);

      // 记录日志
      await ctx.service.logs.addDataSourceLog({
        level: 'INFO',
        source,
        message: `基于容量的缓存清理: ${source}, 最大缓存数量: ${maxItems}`,
        data: { source, maxItems, clearedCount: result.clearedKeys.length }
      });

      ctx.body = result;
    } catch (error) {
      ctx.logger.error('基于容量的缓存清理失败:', error);
      ctx.body = {
        success: false,
        message: '基于容量的缓存清理失败',
        error: error.message,
      };
    }
  }

  /**
   * 自动缓存清理
   */
  async autoCleanCache() {
    const { ctx } = this;
    const { source, maxAgeHours = 24, maxItems = 1000 } = ctx.request.body;

    try {
      // 验证参数
      if (!source) {
        ctx.body = {
          success: false,
          message: '缺少数据源参数',
        };
        return;
      }

      // 使用缓存服务自动清理缓存
      const result = await ctx.service.cache.autoCleanCache(source, { maxAgeHours, maxItems });

      // 记录日志
      await ctx.service.logs.addDataSourceLog({
        level: 'INFO',
        source,
        message: `自动缓存清理: ${source}`,
        data: {
          source,
          maxAgeHours,
          maxItems,
          timeBasedCleaning: result.timeBasedCleaning ? result.timeBasedCleaning.clearedKeys.length : 0,
          capacityBasedCleaning: result.capacityBasedCleaning ? result.capacityBasedCleaning.clearedKeys.length : 0
        }
      });

      ctx.body = result;
    } catch (error) {
      ctx.logger.error('自动缓存清理失败:', error);
      ctx.body = {
        success: false,
        message: '自动缓存清理失败',
        error: error.message,
      };
    }
  }
}

module.exports = CacheController;
