/**
 * 基础服务类
 * 提供统一的服务基础功能和数据访问模式
 */

'use strict';

const { Service } = require('egg');

/**
 * 基础服务类
 * 所有服务都应该继承此类以获得统一的功能
 */
class BaseService extends Service {
  
  /**
   * 构造函数
   */
  constructor(ctx) {
    super(ctx);
    this.startTime = Date.now();
  }

  /**
   * 统一的缓存包装器
   * @param {string} cacheKey - 缓存键
   * @param {number} ttl - 过期时间（秒）
   * @param {Function} fetchDataFn - 获取数据的函数
   * @param {object} options - 选项
   */
  async withCache(cacheKey, ttl, fetchDataFn, options = {}) {
    const { 
      enableCache = true, 
      forceRefresh = false,
      dataSource = 'unknown'
    } = options;

    // 如果禁用缓存或强制刷新，直接获取数据
    if (!enableCache || forceRefresh) {
      return await this.executeWithFallback(fetchDataFn, cacheKey, dataSource);
    }

    // 尝试从Redis缓存获取数据
    try {
      if (this.app.redis && typeof this.app.redis.get === 'function') {
        const cachedData = await this.app.redis.get(cacheKey);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          this.ctx.logger.info(`从Redis缓存获取数据成功: ${cacheKey}`);
          
          return {
            ...parsedData,
            fromCache: true,
            data_source: 'redis_cache',
            data_source_message: '数据来自Redis缓存'
          };
        }
      }
    } catch (cacheError) {
      this.ctx.logger.warn('Redis缓存获取失败:', cacheError);
    }

    // 尝试从内存缓存获取数据
    try {
      const memoryData = this.getMemoryCache(cacheKey, ttl);
      if (memoryData) {
        this.ctx.logger.info(`从内存缓存获取数据成功: ${cacheKey}`);
        return {
          ...memoryData,
          fromCache: true,
          data_source: 'memory_cache',
          data_source_message: '数据来自内存缓存'
        };
      }
    } catch (memoryError) {
      this.ctx.logger.warn('内存缓存获取失败:', memoryError);
    }

    // 缓存未命中，获取新数据
    const data = await this.executeWithFallback(fetchDataFn, cacheKey, dataSource);

    // 保存到缓存
    await this.saveToCache(cacheKey, data, ttl);

    return data;
  }

  /**
   * 执行数据获取操作，带有降级处理
   * @param {Function} fetchDataFn - 获取数据的函数
   * @param {string} cacheKey - 缓存键
   * @param {string} dataSource - 数据源名称
   */
  async executeWithFallback(fetchDataFn, cacheKey, dataSource) {
    try {
      const data = await fetchDataFn();
      return {
        ...data,
        cacheTime: new Date().toISOString(),
        data_source: 'external_api',
        data_source_message: `数据来自${dataSource.toUpperCase()}外部API`
      };
    } catch (error) {
      this.ctx.logger.error(`获取数据失败: ${cacheKey}`, error);

      // 尝试从缓存获取过期数据作为降级
      const fallbackData = await this.getFallbackData(cacheKey);
      if (fallbackData) {
        this.ctx.logger.info(`使用降级缓存数据: ${cacheKey}`);
        return {
          ...fallbackData,
          fromCache: true,
          data_source: 'fallback_cache',
          data_source_message: '数据来自降级缓存（API调用失败）'
        };
      }

      throw error;
    }
  }

  /**
   * 保存数据到缓存
   * @param {string} cacheKey - 缓存键
   * @param {*} data - 数据
   * @param {number} ttl - 过期时间（秒）
   */
  async saveToCache(cacheKey, data, ttl) {
    const dataToCache = {
      ...data,
      cacheTime: new Date().toISOString()
    };

    // 保存到Redis缓存
    try {
      if (this.app.redis && typeof this.app.redis.set === 'function') {
        await this.app.redis.set(cacheKey, JSON.stringify(dataToCache), 'EX', ttl);
        this.ctx.logger.info(`数据已保存到Redis缓存: ${cacheKey}`);
      }
    } catch (redisError) {
      this.ctx.logger.warn('保存到Redis缓存失败:', redisError);
    }

    // 保存到内存缓存作为备份
    try {
      this.setMemoryCache(cacheKey, dataToCache, ttl);
    } catch (memoryError) {
      this.ctx.logger.warn('保存到内存缓存失败:', memoryError);
    }
  }

  /**
   * 从内存缓存获取数据
   * @param {string} cacheKey - 缓存键
   * @param {number} ttl - 过期时间（秒）
   */
  getMemoryCache(cacheKey, ttl) {
    if (!global.serviceCache) {
      global.serviceCache = {};
    }

    const cache = global.serviceCache[cacheKey];
    if (!cache) return null;

    // 检查缓存是否过期
    const cacheTime = new Date(cache.cacheTime || 0);
    const now = new Date();
    const cacheAge = (now.getTime() - cacheTime.getTime()) / 1000;

    if (cacheAge < ttl) {
      return cache;
    }

    // 缓存已过期，删除它
    delete global.serviceCache[cacheKey];
    return null;
  }

  /**
   * 设置内存缓存
   * @param {string} cacheKey - 缓存键
   * @param {*} data - 数据
   * @param {number} ttl - 过期时间（秒）
   */
  setMemoryCache(cacheKey, data, ttl) {
    if (!global.serviceCache) {
      global.serviceCache = {};
    }

    global.serviceCache[cacheKey] = {
      ...data,
      cacheTime: new Date().toISOString()
    };

    // 设置过期清理
    setTimeout(() => {
      if (global.serviceCache && global.serviceCache[cacheKey]) {
        delete global.serviceCache[cacheKey];
      }
    }, ttl * 1000);
  }

  /**
   * 获取降级数据
   * @param {string} cacheKey - 缓存键
   */
  async getFallbackData(cacheKey) {
    // 尝试从Redis获取过期数据
    try {
      if (this.app.redis && typeof this.app.redis.get === 'function') {
        const cachedData = await this.app.redis.get(`fallback:${cacheKey}`);
        if (cachedData) {
          return JSON.parse(cachedData);
        }
      }
    } catch (error) {
      this.ctx.logger.warn('获取Redis降级数据失败:', error);
    }

    // 尝试从内存获取过期数据
    try {
      if (global.serviceCache && global.serviceCache[cacheKey]) {
        return global.serviceCache[cacheKey];
      }
    } catch (error) {
      this.ctx.logger.warn('获取内存降级数据失败:', error);
    }

    return null;
  }

  /**
   * 分页查询辅助方法
   * @param {object} model - 数据模型
   * @param {object} options - 查询选项
   */
  async paginate(model, options = {}) {
    const {
      where = {},
      include = [],
      order = [['id', 'DESC']],
      page = 1,
      pageSize = 20,
      attributes
    } = options;

    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    const queryOptions = {
      where,
      include,
      order,
      offset,
      limit,
      distinct: true
    };

    if (attributes) {
      queryOptions.attributes = attributes;
    }

    try {
      const result = await model.findAndCountAll(queryOptions);
      
      return {
        items: result.rows,
        total: result.count,
        page,
        pageSize,
        totalPages: Math.ceil(result.count / pageSize),
        hasNext: page * pageSize < result.count,
        hasPrev: page > 1
      };
    } catch (error) {
      this.ctx.logger.error('分页查询失败:', error);
      throw error;
    }
  }

  /**
   * 批量操作辅助方法
   * @param {Array} items - 操作项
   * @param {Function} operation - 操作函数
   * @param {object} options - 选项
   */
  async batchOperation(items, operation, options = {}) {
    const {
      batchSize = 10,
      delay = 100,
      continueOnError = true
    } = options;

    const results = [];
    const errors = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item, index) => {
        try {
          const result = await operation(item, i + index);
          return { success: true, result, item };
        } catch (error) {
          this.ctx.logger.warn(`批量操作项失败:`, error);
          return { success: false, error: error.message, item };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { success, result: opResult, error, item } = result.value;
          if (success) {
            results.push(opResult);
          } else {
            errors.push({ error, item });
            if (!continueOnError) {
              throw new Error(`批量操作失败: ${error}`);
            }
          }
        } else {
          errors.push({ error: result.reason.message, item: null });
          if (!continueOnError) {
            throw new Error(`批量操作Promise失败: ${result.reason.message}`);
          }
        }
      });

      // 添加延迟避免过载
      if (i + batchSize < items.length && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      results,
      errors,
      total: items.length,
      successful: results.length,
      failed: errors.length
    };
  }

  /**
   * 事务包装器
   * @param {Function} operation - 事务操作
   */
  async withTransaction(operation) {
    const transaction = await this.app.model.transaction();
    
    try {
      const result = await operation(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      this.ctx.logger.error('事务执行失败:', error);
      throw error;
    }
  }

  /**
   * 重试包装器
   * @param {Function} operation - 操作函数
   * @param {number} maxRetries - 最大重试次数
   * @param {number} delay - 重试延迟
   */
  async withRetry(operation, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }

        // 如果是不可重试的错误，直接抛出
        if (this.isNonRetryableError(error)) {
          break;
        }

        this.ctx.logger.warn(`操作失败，第${attempt}次重试:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }

    throw lastError;
  }

  /**
   * 判断是否为不可重试的错误
   * @param {Error} error - 错误对象
   */
  isNonRetryableError(error) {
    // 数据验证错误、权限错误等不需要重试
    const nonRetryableTypes = [
      'ValidationError',
      'UnauthorizedError',
      'ForbiddenError',
      'NotFoundError'
    ];
    
    return nonRetryableTypes.includes(error.name);
  }

  /**
   * 获取日期字符串
   * @param {number} offset - 偏移天数
   */
  getDateString(offset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offset);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}${month}${day}`;
  }

  /**
   * 格式化响应数据
   * @param {*} data - 数据
   * @param {string} message - 消息
   * @param {object} meta - 元数据
   */
  formatResponse(data, message = '操作成功', meta = {}) {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      ...meta
    };
  }

  /**
   * 记录服务调用统计
   * @param {string} action - 操作名称
   * @param {object} metadata - 元数据
   */
  logServiceCall(action, metadata = {}) {
    this.ctx.logger.info(`Service Call: ${action}`, {
      service: this.constructor.name,
      duration: Date.now() - this.startTime,
      ...metadata
    });
  }

  /**
   * 验证必需参数
   * @param {object} params - 参数对象
   * @param {Array} requiredFields - 必需字段列表
   */
  validateRequired(params, requiredFields) {
    const missing = requiredFields.filter(field => 
      params[field] === undefined || params[field] === null || params[field] === ''
    );

    if (missing.length > 0) {
      throw new Error(`缺少必需参数: ${missing.join(', ')}`);
    }
  }

  /**
   * 清理对象中的空值
   * @param {object} obj - 对象
   */
  cleanObject(obj) {
    const cleaned = {};
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== null && value !== undefined && value !== '') {
        cleaned[key] = value;
      }
    });
    
    return cleaned;
  }
}

module.exports = BaseService;