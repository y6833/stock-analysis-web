'use strict'

module.exports = (app) => {
  const { INTEGER, STRING, TEXT, DECIMAL, DATE, ENUM, JSON, BOOLEAN } = app.Sequelize

  const AiAnalysisCache = app.model.define(
    'ai_analysis_cache',
    {
      id: {
        type: INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      stockSymbol: {
        type: STRING(20),
        allowNull: false,
        field: 'stock_symbol',
        comment: '股票代码',
      },
      analysisType: {
        type: STRING(50),
        allowNull: false,
        field: 'analysis_type',
        comment: '分析类型（technical, fundamental, comprehensive等）',
      },
      cacheKey: {
        type: STRING(255),
        allowNull: false,
        unique: true,
        field: 'cache_key',
        comment: '缓存键（由股票代码、分析类型、参数hash组成）',
      },
      analysisData: {
        type: JSON,
        allowNull: false,
        field: 'analysis_data',
        comment: '分析结果数据（JSON格式）',
      },
      confidenceScore: {
        type: DECIMAL(5, 2),
        allowNull: true,
        field: 'confidence_score',
        comment: '分析置信度分数',
      },
      dataVersion: {
        type: STRING(32),
        allowNull: true,
        field: 'data_version',
        comment: '数据版本号（用于判断数据是否过期）',
      },
      parameters: {
        type: JSON,
        allowNull: true,
        comment: '分析参数（JSON格式）',
      },
      tokensUsed: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        field: 'tokens_used',
        comment: '生成分析使用的Token数量',
      },
      hitCount: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        field: 'hit_count',
        comment: '缓存命中次数',
      },
      lastHitAt: {
        type: DATE,
        allowNull: true,
        field: 'last_hit_at',
        comment: '最后命中时间',
      },
      expiresAt: {
        type: DATE,
        allowNull: false,
        field: 'expires_at',
        comment: '过期时间',
      },
      isValid: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_valid',
        comment: '缓存是否有效',
      },
      createdAt: {
        type: DATE,
        allowNull: false,
        field: 'created_at',
      },
      updatedAt: {
        type: DATE,
        allowNull: false,
        field: 'updated_at',
      },
    },
    {
      tableName: 'ai_analysis_cache',
      underscored: true,
      indexes: [
        {
          name: 'idx_cache_key',
          fields: ['cache_key'],
          unique: true,
        },
        {
          name: 'idx_symbol_type',
          fields: ['stock_symbol', 'analysis_type'],
        },
        {
          name: 'idx_expires_at',
          fields: ['expires_at'],
        },
        {
          name: 'idx_is_valid',
          fields: ['is_valid'],
        },
        {
          name: 'idx_created_at',
          fields: ['created_at'],
        },
      ],
    }
  )

  AiAnalysisCache.associate = function () {
    const prefix = this._associationPrefix || ''

    // 关联股票（如果有股票模型）
    if (app.model.Stock) {
      this.belongsTo(app.model.Stock, {
        foreignKey: 'stockSymbol',
        targetKey: 'symbol',
        as: `${prefix}_stock`,
      })
    }
  }

  // 实例方法
  AiAnalysisCache.prototype.isExpired = function () {
    return new Date() > this.expiresAt || !this.isValid
  }

  AiAnalysisCache.prototype.hit = async function () {
    await this.increment('hitCount')
    await this.update({ lastHitAt: new Date() })
  }

  AiAnalysisCache.prototype.invalidate = async function () {
    await this.update({ isValid: false })
  }

  // 类方法
  AiAnalysisCache.generateCacheKey = function (stockSymbol, analysisType, parameters = {}) {
    const crypto = require('crypto')
    const paramString = JSON.stringify(parameters, Object.keys(parameters).sort())
    const hash = crypto.createHash('md5').update(paramString).digest('hex')
    return `${stockSymbol}_${analysisType}_${hash}`
  }

  AiAnalysisCache.get = async function (stockSymbol, analysisType, parameters = {}) {
    const cacheKey = this.generateCacheKey(stockSymbol, analysisType, parameters)

    const cached = await this.findOne({
      where: {
        cacheKey,
        isValid: true,
        expiresAt: {
          [app.Sequelize.Op.gt]: new Date(),
        },
      },
    })

    if (cached) {
      await cached.hit()
      return cached.analysisData
    }

    return null
  }

  AiAnalysisCache.set = async function (
    stockSymbol,
    analysisType,
    analysisData,
    parameters = {},
    options = {}
  ) {
    const {
      ttl = 5 * 60 * 1000, // 默认5分钟
      confidenceScore,
      tokensUsed = 0,
      dataVersion,
    } = options

    const cacheKey = this.generateCacheKey(stockSymbol, analysisType, parameters)
    const expiresAt = new Date(Date.now() + ttl)

    // 使用 upsert 来处理重复键
    const [cached, created] = await this.upsert({
      stockSymbol,
      analysisType,
      cacheKey,
      analysisData,
      confidenceScore,
      dataVersion,
      parameters,
      tokensUsed,
      expiresAt,
      isValid: true,
      hitCount: 0,
      lastHitAt: null,
    })

    return cached
  }

  AiAnalysisCache.invalidateByStock = async function (stockSymbol) {
    await this.update(
      { isValid: false },
      {
        where: {
          stockSymbol,
          isValid: true,
        },
      }
    )
  }

  AiAnalysisCache.invalidateByType = async function (analysisType) {
    await this.update(
      { isValid: false },
      {
        where: {
          analysisType,
          isValid: true,
        },
      }
    )
  }

  AiAnalysisCache.cleanExpired = async function () {
    const deletedCount = await this.destroy({
      where: {
        [app.Sequelize.Op.or]: [
          {
            expiresAt: {
              [app.Sequelize.Op.lt]: new Date(),
            },
          },
          {
            isValid: false,
          },
        ],
      },
    })

    return deletedCount
  }

  AiAnalysisCache.getStats = async function (days = 7) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [totalCaches, activeCaches, expiredCaches, hitStats] = await Promise.all([
      // 总缓存数
      this.count({
        where: {
          createdAt: {
            [app.Sequelize.Op.gte]: startDate,
          },
        },
      }),

      // 活跃缓存数
      this.count({
        where: {
          isValid: true,
          expiresAt: {
            [app.Sequelize.Op.gt]: new Date(),
          },
        },
      }),

      // 过期缓存数
      this.count({
        where: {
          [app.Sequelize.Op.or]: [
            {
              expiresAt: {
                [app.Sequelize.Op.lt]: new Date(),
              },
            },
            {
              isValid: false,
            },
          ],
        },
      }),

      // 命中统计
      this.findAll({
        attributes: [
          [app.Sequelize.fn('SUM', app.Sequelize.col('hit_count')), 'totalHits'],
          [app.Sequelize.fn('AVG', app.Sequelize.col('hit_count')), 'avgHits'],
          [app.Sequelize.fn('COUNT', app.Sequelize.col('id')), 'cacheCount'],
        ],
        where: {
          createdAt: {
            [app.Sequelize.Op.gte]: startDate,
          },
        },
        raw: true,
      }),
    ])

    const hitData = hitStats[0] || {}
    const totalHits = parseInt(hitData.totalHits) || 0
    const avgHits = parseFloat(hitData.avgHits) || 0
    const cacheCount = parseInt(hitData.cacheCount) || 0

    return {
      totalCaches,
      activeCaches,
      expiredCaches,
      totalHits,
      averageHitsPerCache: avgHits,
      hitRate: cacheCount > 0 ? totalHits / cacheCount : 0,
      cacheEfficiency: totalCaches > 0 ? (activeCaches / totalCaches) * 100 : 0,
    }
  }

  AiAnalysisCache.getTopCachedStocks = async function (limit = 10, days = 7) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const results = await this.findAll({
      attributes: [
        'stockSymbol',
        [app.Sequelize.fn('COUNT', app.Sequelize.col('id')), 'cacheCount'],
        [app.Sequelize.fn('SUM', app.Sequelize.col('hit_count')), 'totalHits'],
        [app.Sequelize.fn('AVG', app.Sequelize.col('confidence_score')), 'avgConfidence'],
      ],
      where: {
        createdAt: {
          [app.Sequelize.Op.gte]: startDate,
        },
      },
      group: ['stockSymbol'],
      order: [[app.Sequelize.fn('SUM', app.Sequelize.col('hit_count')), 'DESC']],
      limit,
      raw: true,
    })

    return results.map((result) => ({
      stockSymbol: result.stockSymbol,
      cacheCount: parseInt(result.cacheCount),
      totalHits: parseInt(result.totalHits) || 0,
      averageConfidence: parseFloat(result.avgConfidence) || 0,
    }))
  }

  AiAnalysisCache.getCacheByType = async function (days = 7) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const results = await this.findAll({
      attributes: [
        'analysisType',
        [app.Sequelize.fn('COUNT', app.Sequelize.col('id')), 'cacheCount'],
        [app.Sequelize.fn('SUM', app.Sequelize.col('hit_count')), 'totalHits'],
        [app.Sequelize.fn('AVG', app.Sequelize.col('tokens_used')), 'avgTokens'],
      ],
      where: {
        createdAt: {
          [app.Sequelize.Op.gte]: startDate,
        },
      },
      group: ['analysisType'],
      order: [[app.Sequelize.fn('COUNT', app.Sequelize.col('id')), 'DESC']],
      raw: true,
    })

    return results.map((result) => ({
      analysisType: result.analysisType,
      cacheCount: parseInt(result.cacheCount),
      totalHits: parseInt(result.totalHits) || 0,
      averageTokens: parseFloat(result.avgTokens) || 0,
      hitRate:
        parseInt(result.cacheCount) > 0
          ? (parseInt(result.totalHits) || 0) / parseInt(result.cacheCount)
          : 0,
    }))
  }

  // 定期清理任务
  AiAnalysisCache.scheduleCleanup = function () {
    // 每小时清理一次过期缓存
    setInterval(async () => {
      try {
        const deletedCount = await this.cleanExpired()
        if (deletedCount > 0) {
          console.log(`AI分析缓存清理完成，删除了 ${deletedCount} 条过期记录`)
        }
      } catch (error) {
        console.error('AI分析缓存清理失败:', error)
      }
    }, 60 * 60 * 1000) // 1小时
  }

  return AiAnalysisCache
}
