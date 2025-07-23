'use strict';

/**
 * 数据库服务
 * 提供优化的数据库访问层，包括连接池管理、查询优化和缓存集成
 */
class DatabaseService {
  constructor(ctx) {
    this.ctx = ctx;
    this.app = ctx.app;
    this.model = ctx.model;
    this.Sequelize = this.app.Sequelize;
    this.Op = this.Sequelize.Op;
    this.sequelize = this.app.model.sequelize;
    this.logger = ctx.logger;
    this.redis = this.app.redis;
  }

  /**
   * 获取数据库连接池状态
   * @returns {Object} 连接池状态信息
   */
  async getConnectionPoolStats() {
    try {
      const stats = {
        total: this.sequelize.config.pool.max,
        acquired: 0,
        idle: 0,
        pending: 0,
      };

      // 获取连接池状态
      const pool = this.sequelize.connectionManager.pool;
      if (pool) {
        stats.acquired = pool.size - pool.available;
        stats.idle = pool.available;
        stats.pending = pool.pending;
      }

      return stats;
    } catch (error) {
      this.logger.error('[DatabaseService] 获取连接池状态失败:', error);
      throw error;
    }
  }

  /**
   * 优化的查询方法，支持缓存、分页和字段选择
   * @param {String} modelName - 模型名称
   * @param {Object} options - 查询选项
   * @param {Object} options.where - 查询条件
   * @param {Array|Object} options.order - 排序条件
   * @param {Number} options.limit - 限制数量
   * @param {Number} options.offset - 偏移量
   * @param {Array} options.attributes - 要选择的字段
   * @param {Array|Object} options.include - 关联查询
   * @param {Boolean} options.useCache - 是否使用缓存
   * @param {Number} options.cacheTTL - 缓存时间（秒）
   * @returns {Promise<Array>} 查询结果
   */
  async findAll(modelName, options = {}) {
    const {
      where,
      order,
      limit,
      offset,
      attributes,
      include,
      useCache = false,
      cacheTTL = 300,
    } = options;
    const model = this.model[modelName];

    if (!model) {
      throw new Error(`模型 ${modelName} 不存在`);
    }

    // 使用高级缓存管理器（如果可用）
    if (useCache && this.app.cacheManager) {
      const cacheKey = JSON.stringify({
        where,
        order,
        limit,
        offset,
        attributes,
        include,
      });

      return await this.app.cacheManager.getOrSet(
        `db:${modelName}`,
        cacheKey,
        async () => {
          // 构建查询选项
          const queryOptions = {};
          if (where) queryOptions.where = where;
          if (order) queryOptions.order = order;
          if (limit) queryOptions.limit = limit;
          if (offset) queryOptions.offset = offset;
          if (attributes) queryOptions.attributes = attributes;
          if (include) queryOptions.include = include;

          // 添加查询性能跟踪
          const startTime = Date.now();

          // 执行查询
          const results = await model.findAll(queryOptions);

          // 记录查询性能
          const duration = Date.now() - startTime;
          if (duration > 100) {
            // 记录执行时间超过100ms的查询
            this.logger.warn(`[DatabaseService] 慢查询 (${duration}ms): ${modelName}`, {
              where,
              limit,
              offset,
            });
          }

          return results;
        },
        cacheTTL
      );
    }

    // 回退到传统缓存方式
    // 构建缓存键
    const cacheKey = useCache
      ? `db:query:${modelName}:${JSON.stringify({
        where,
        order,
        limit,
        offset,
        attributes,
        include,
      })}`
      : null;

    // 如果启用缓存，尝试从缓存获取
    if (useCache && this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        this.logger.warn('[DatabaseService] 从缓存获取数据失败:', error);
      }
    }

    // 构建查询选项
    const queryOptions = {};
    if (where) queryOptions.where = where;
    if (order) queryOptions.order = order;
    if (limit) queryOptions.limit = limit;
    if (offset) queryOptions.offset = offset;
    if (attributes) queryOptions.attributes = attributes;
    if (include) queryOptions.include = include;

    // 添加查询性能跟踪
    const startTime = Date.now();
    try {
      // 执行查询
      const results = await model.findAll(queryOptions);

      // 记录查询性能
      const duration = Date.now() - startTime;
      if (duration > 100) {
        // 记录执行时间超过100ms的查询
        this.logger.warn(`[DatabaseService] 慢查询 (${duration}ms): ${modelName}`, {
          where,
          limit,
          offset,
        });
      }

      // 如果启用缓存，将结果存入缓存
      if (useCache && this.redis) {
        try {
          const data = JSON.stringify(results);
          await this.redis.set(cacheKey, data, 'EX', cacheTTL);
        } catch (error) {
          this.logger.warn('[DatabaseService] 缓存数据失败:', error);
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`[DatabaseService] 查询 ${modelName} 失败:`, error);
      throw error;
    }
  }

  /**
   * 优化的分页查询方法
   * @param {String} modelName - 模型名称
   * @param {Object} options - 查询选项
   * @param {Object} options.where - 查询条件
   * @param {Array|Object} options.order - 排序条件
   * @param {Number} options.page - 页码
   * @param {Number} options.pageSize - 每页大小
   * @param {Array} options.attributes - 要选择的字段
   * @param {Array|Object} options.include - 关联查询
   * @param {Boolean} options.useCache - 是否使用缓存
   * @param {Number} options.cacheTTL - 缓存时间（秒）
   * @returns {Promise<Object>} 分页结果
   */
  async findAndCountAll(modelName, options = {}) {
    const {
      where,
      order,
      page = 1,
      pageSize = 20,
      attributes,
      include,
      useCache = false,
      cacheTTL = 300,
    } = options;

    const model = this.model[modelName];

    if (!model) {
      throw new Error(`模型 ${modelName} 不存在`);
    }

    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    // 使用高级缓存管理器（如果可用）
    if (useCache && this.app.cacheManager) {
      const cacheKey = JSON.stringify({
        where,
        order,
        page,
        pageSize,
        attributes,
        include,
      });

      return await this.app.cacheManager.getOrSet(
        `db:paginate:${modelName}`,
        cacheKey,
        async () => {
          // 构建查询选项
          const queryOptions = { where };
          if (order) queryOptions.order = order;
          if (attributes) queryOptions.attributes = attributes;
          if (include) queryOptions.include = include;

          // 添加查询性能跟踪
          const startTime = Date.now();

          // 使用事务确保数据一致性
          const result = await this.sequelize.transaction(async (transaction) => {
            // 分别查询总数和数据，避免复杂查询的性能问题
            const countOptions = { where, transaction };
            if (include) {
              countOptions.include = include.map((inc) => ({
                model: inc.model,
                as: inc.as,
                where: inc.where,
              }));
              countOptions.distinct = true;
            }

            const count = await model.count(countOptions);

            // 如果总数为0，直接返回空结果
            if (count === 0) {
              return { count: 0, rows: [] };
            }

            // 查询分页数据
            queryOptions.offset = offset;
            queryOptions.limit = limit;
            queryOptions.transaction = transaction;

            const rows = await model.findAll(queryOptions);
            return { count, rows };
          });

          // 记录查询性能
          const duration = Date.now() - startTime;
          if (duration > 200) {
            // 记录执行时间超过200ms的分页查询
            this.logger.warn(`[DatabaseService] 慢分页查询 (${duration}ms): ${modelName}`, {
              where,
              page,
              pageSize,
            });
          }

          // 格式化分页结果
          const totalPages = Math.ceil(result.count / pageSize);
          const paginatedResult = {
            items: result.rows,
            pagination: {
              total: result.count,
              page,
              pageSize,
              totalPages,
              hasNext: page < totalPages,
              hasPrev: page > 1,
            },
          };

          return paginatedResult;
        },
        cacheTTL
      );
    }

    // 回退到传统缓存方式
    // 构建缓存键
    const cacheKey = useCache
      ? `db:paginate:${modelName}:${JSON.stringify({
        where,
        order,
        page,
        pageSize,
        attributes,
        include,
      })}`
      : null;

    // 如果启用缓存，尝试从缓存获取
    if (useCache && this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        this.logger.warn('[DatabaseService] 从缓存获取分页数据失败:', error);
      }
    }

    // 构建查询选项
    const queryOptions = { where };
    if (order) queryOptions.order = order;
    if (attributes) queryOptions.attributes = attributes;
    if (include) queryOptions.include = include;

    // 添加查询性能跟踪
    const startTime = Date.now();
    try {
      // 使用事务确保数据一致性
      const result = await this.sequelize.transaction(async (transaction) => {
        // 分别查询总数和数据，避免复杂查询的性能问题
        const countOptions = { where, transaction };
        if (include) {
          countOptions.include = include.map((inc) => ({
            model: inc.model,
            as: inc.as,
            where: inc.where,
          }));
          countOptions.distinct = true;
        }

        const count = await model.count(countOptions);

        // 如果总数为0，直接返回空结果
        if (count === 0) {
          return { count: 0, rows: [] };
        }

        // 查询分页数据
        queryOptions.offset = offset;
        queryOptions.limit = limit;
        queryOptions.transaction = transaction;

        const rows = await model.findAll(queryOptions);
        return { count, rows };
      });

      // 记录查询性能
      const duration = Date.now() - startTime;
      if (duration > 200) {
        // 记录执行时间超过200ms的分页查询
        this.logger.warn(`[DatabaseService] 慢分页查询 (${duration}ms): ${modelName}`, {
          where,
          page,
          pageSize,
        });
      }

      // 格式化分页结果
      const totalPages = Math.ceil(result.count / pageSize);
      const paginatedResult = {
        items: result.rows,
        pagination: {
          total: result.count,
          page,
          pageSize,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };

      // 如果启用缓存，将结果存入缓存
      if (useCache && this.redis) {
        try {
          const data = JSON.stringify(paginatedResult);
          await this.redis.set(cacheKey, data, 'EX', cacheTTL);
        } catch (error) {
          this.logger.warn('[DatabaseService] 缓存分页数据失败:', error);
        }
      }

      return paginatedResult;
    } catch (error) {
      this.logger.error(`[DatabaseService] 分页查询 ${modelName} 失败:`, error);
      throw error;
    }
  }

  /**
   * 批量插入数据，优化性能
   * @param {String} modelName - 模型名称
   * @param {Array} records - 要插入的记录数组
   * @param {Object} options - 插入选项
   * @returns {Promise<Array>} 插入的记录
   */
  async bulkCreate(modelName, records, options = {}) {
    const model = this.model[modelName];

    if (!model) {
      throw new Error(`模型 ${modelName} 不存在`);
    }

    if (!Array.isArray(records) || records.length === 0) {
      return [];
    }

    // 默认选项
    const defaultOptions = {
      validate: true,
      returning: true,
      ignoreDuplicates: false,
      updateOnDuplicate: null,
      individualHooks: false,
      benchmark: true,
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      // 如果记录数量大于100，分批插入以避免数据库负载过高
      if (records.length > 100) {
        const batchSize = 100;
        const batches = [];

        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          batches.push(batch);
        }

        let results = [];
        for (const batch of batches) {
          const batchResults = await model.bulkCreate(batch, finalOptions);
          results = results.concat(batchResults);
        }

        return results;
      } else {
        return await model.bulkCreate(records, finalOptions);
      }
    } catch (error) {
      this.logger.error(`[DatabaseService] 批量创建 ${modelName} 记录失败:`, error);
      throw error;
    }
  }

  /**
   * 执行原始SQL查询
   * @param {String} sql - SQL查询语句
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 查询结果
   */
  async query(sql, options = {}) {
    try {
      const startTime = Date.now();
      const [results] = await this.sequelize.query(sql, {
        type: this.Sequelize.QueryTypes.SELECT,
        ...options,
      });

      const duration = Date.now() - startTime;
      if (duration > 100) {
        // 记录执行时间超过100ms的原始SQL查询
        this.logger.warn(`[DatabaseService] 慢SQL查询 (${duration}ms): ${sql.substring(0, 100)}...`);
      }

      return results;
    } catch (error) {
      this.logger.error('[DatabaseService] 执行SQL查询失败:', error);
      throw error;
    }
  }

  /**
   * 清除模型相关的缓存
   * @param {String} modelName - 模型名称
   * @returns {Promise<Boolean>} 是否成功
   */
  async clearModelCache(modelName) {
    // 使用高级缓存管理器（如果可用）
    if (this.app.cacheManager) {
      try {
        // 清除模型相关的所有缓存
        await this.app.cacheManager.clearPattern(`db:*:${modelName}:*`);

        // 清除特定命名空间的缓存
        await this.app.cacheManager.clearNamespace(`db:${modelName}`);
        await this.app.cacheManager.clearNamespace(`db:paginate:${modelName}`);

        this.logger.info(`[DatabaseService] 已清除 ${modelName} 相关的缓存`);
        return true;
      } catch (error) {
        this.logger.error(`[DatabaseService] 使用缓存管理器清除 ${modelName} 缓存失败:`, error);
        // 回退到传统方式
      }
    }

    // 回退到传统缓存清除方式
    if (!this.redis) {
      return false;
    }

    try {
      const pattern = `db:*:${modelName}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.info(`[DatabaseService] 已清除 ${modelName} 相关的 ${keys.length} 个缓存`);
      }

      return true;
    } catch (error) {
      this.logger.error(`[DatabaseService] 清除 ${modelName} 缓存失败:`, error);
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Promise<Object>} 缓存统计信息
   */
  async getCacheStats() {
    // 使用高级缓存管理器（如果可用）
    if (this.app.cacheManager) {
      try {
        return await this.app.cacheManager.getStats();
      } catch (error) {
        this.logger.error('[DatabaseService] 获取缓存统计信息失败:', error);
        // 回退到基本信息
      }
    }

    // 回退到基本缓存信息
    const info = {
      enabled: !!this.redis,
      type: this.redis ? 'redis' : 'none',
    };

    if (this.redis) {
      try {
        // 尝试获取Redis信息
        if (typeof this.redis.info === 'function') {
          info.redisInfo = await this.redis.info();
        }

        // 尝试获取数据库大小
        if (typeof this.redis.dbsize === 'function') {
          info.dbSize = await this.redis.dbsize();
        }
      } catch (error) {
        this.logger.warn('[DatabaseService] 获取Redis信息失败:', error);
      }
    }

    return info;
  }

  /**
   * 获取数据库健康状态
   * @returns {Promise<Object>} 健康状态信息
   */
  async getHealthStatus() {
    try {
      // 检查数据库连接
      await this.sequelize.authenticate();

      // 获取连接池状态
      const poolStats = await this.getConnectionPoolStats();

      // 获取数据库版本
      const [versionResult] = await this.sequelize.query('SELECT VERSION() as version');
      const version = versionResult[0]?.version || 'Unknown';

      return {
        status: 'healthy',
        version,
        connectionPool: poolStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('[DatabaseService] 数据库健康检查失败:', error);

      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

module.exports = DatabaseService;
