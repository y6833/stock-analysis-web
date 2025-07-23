'use strict';

/**
 * 十字星形态查询结果缓存模型
 */
module.exports = (app) => {
  const { INTEGER, STRING, JSON, DATE } = app.Sequelize;

  const DojiPatternQueryCache = app.model.define(
    'doji_pattern_query_cache',
    {
      id: {
        type: INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      cacheKey: {
        type: STRING(255),
        allowNull: false,
        unique: true,
        comment: '缓存键，基于查询条件生成的哈希值',
      },
      queryParams: {
        type: JSON,
        allowNull: false,
        comment: '查询参数',
      },
      resultData: {
        type: JSON,
        allowNull: false,
        comment: '查询结果数据',
      },
      totalCount: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '总记录数',
      },
      expiresAt: {
        type: DATE,
        allowNull: false,
        comment: '过期时间',
      },
      hitCount: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '命中次数',
      },
      lastHitAt: {
        type: DATE,
        allowNull: true,
        comment: '最后命中时间',
      },
    },
    {
      tableName: 'doji_pattern_query_cache',
      underscored: true,
      indexes: [
        {
          name: 'idx_doji_pattern_query_cache_key',
          fields: ['cache_key'],
          unique: true,
        },
        {
          name: 'idx_doji_pattern_query_cache_expires_at',
          fields: ['expires_at'],
        },
      ],
    }
  );

  // 静态方法：生成缓存键
  DojiPatternQueryCache.generateCacheKey = function (queryParams) {
    const crypto = require('crypto');
    const sortedParams = JSON.stringify(queryParams, Object.keys(queryParams).sort());
    return crypto.createHash('md5').update(sortedParams).digest('hex');
  };

  // 静态方法：获取缓存结果
  DojiPatternQueryCache.getCache = async function (queryParams) {
    const cacheKey = this.generateCacheKey(queryParams);

    const cache = await this.findOne({
      where: {
        cacheKey,
        expiresAt: {
          [app.Sequelize.Op.gt]: new Date(),
        },
      },
    });

    if (cache) {
      // 更新命中统计
      await cache.update({
        hitCount: cache.hitCount + 1,
        lastHitAt: new Date(),
      });

      return {
        data: cache.resultData,
        totalCount: cache.totalCount,
        fromCache: true,
      };
    }

    return null;
  };

  // 静态方法：设置缓存
  DojiPatternQueryCache.setCache = async function (
    queryParams,
    resultData,
    totalCount,
    cacheDuration = 300
  ) {
    const cacheKey = this.generateCacheKey(queryParams);
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + cacheDuration);

    await this.upsert({
      cacheKey,
      queryParams,
      resultData,
      totalCount,
      expiresAt,
      hitCount: 0,
      lastHitAt: null,
    });

    return true;
  };

  // 静态方法：清理过期缓存
  DojiPatternQueryCache.cleanExpiredCache = async function () {
    const deletedCount = await this.destroy({
      where: {
        expiresAt: {
          [app.Sequelize.Op.lt]: new Date(),
        },
      },
    });

    return deletedCount;
  };

  // 静态方法：清理特定类型的缓存
  DojiPatternQueryCache.clearCacheByPattern = async function (pattern) {
    const deletedCount = await this.destroy({
      where: {
        cacheKey: {
          [app.Sequelize.Op.like]: `%${pattern}%`,
        },
      },
    });

    return deletedCount;
  };

  // 静态方法：获取缓存统计
  DojiPatternQueryCache.getCacheStats = async function () {
    const totalCaches = await this.count();
    const expiredCaches = await this.count({
      where: {
        expiresAt: {
          [app.Sequelize.Op.lt]: new Date(),
        },
      },
    });

    const hitStats = await this.findAll({
      attributes: [
        [app.Sequelize.fn('AVG', app.Sequelize.col('hit_count')), 'avgHits'],
        [app.Sequelize.fn('MAX', app.Sequelize.col('hit_count')), 'maxHits'],
        [app.Sequelize.fn('SUM', app.Sequelize.col('hit_count')), 'totalHits'],
      ],
      raw: true,
    });

    return {
      totalCaches,
      activeCaches: totalCaches - expiredCaches,
      expiredCaches,
      hitStats: hitStats[0] || { avgHits: 0, maxHits: 0, totalHits: 0 },
    };
  };

  return DojiPatternQueryCache;
};
