'use strict'

module.exports = (app) => {
  const { INTEGER, STRING, TEXT, DECIMAL, DATE, ENUM, JSON } = app.Sequelize

  const AiRecommendationHistory = app.model.define(
    'ai_recommendation_history',
    {
      id: {
        type: INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: INTEGER.UNSIGNED,
        allowNull: true,
        field: 'user_id',
        comment: '用户ID，可为空（匿名推荐）',
      },
      requestId: {
        type: STRING(64),
        allowNull: false,
        unique: true,
        field: 'request_id',
        comment: '请求唯一标识',
      },
      stockSymbol: {
        type: STRING(20),
        allowNull: false,
        field: 'stock_symbol',
        comment: '股票代码',
      },
      stockName: {
        type: STRING(100),
        allowNull: true,
        field: 'stock_name',
        comment: '股票名称',
      },
      recommendationType: {
        type: ENUM('strong_buy', 'buy', 'hold', 'sell', 'strong_sell'),
        allowNull: false,
        field: 'recommendation_type',
        comment: '推荐类型',
      },
      confidenceScore: {
        type: DECIMAL(5, 2),
        allowNull: false,
        field: 'confidence_score',
        comment: '置信度分数 (0-100)',
        validate: {
          min: 0,
          max: 100,
        },
      },
      aiAnalysis: {
        type: TEXT('long'),
        allowNull: true,
        field: 'ai_analysis',
        comment: 'AI分析结果（JSON格式）',
      },
      reasoning: {
        type: TEXT,
        allowNull: true,
        comment: '推荐理由',
      },
      riskLevel: {
        type: ENUM('low', 'medium', 'high'),
        allowNull: false,
        field: 'risk_level',
        comment: '风险等级',
      },
      expectedReturn: {
        type: DECIMAL(8, 4),
        allowNull: true,
        field: 'expected_return',
        comment: '预期收益率',
      },
      targetPrice: {
        type: DECIMAL(10, 2),
        allowNull: true,
        field: 'target_price',
        comment: '目标价格',
      },
      stopLossPrice: {
        type: DECIMAL(10, 2),
        allowNull: true,
        field: 'stop_loss_price',
        comment: '止损价格',
      },
      currentPrice: {
        type: DECIMAL(10, 2),
        allowNull: true,
        field: 'current_price',
        comment: '推荐时的当前价格',
      },
      timeHorizon: {
        type: STRING(50),
        allowNull: true,
        field: 'time_horizon',
        comment: '投资时间范围',
      },
      analysisType: {
        type: ENUM('basic', 'detailed', 'comprehensive'),
        allowNull: false,
        field: 'analysis_type',
        comment: '分析类型',
      },
      userPreferences: {
        type: JSON,
        allowNull: true,
        field: 'user_preferences',
        comment: '用户偏好设置（JSON格式）',
      },
      marketData: {
        type: JSON,
        allowNull: true,
        field: 'market_data',
        comment: '市场数据快照（JSON格式）',
      },
      tokensUsed: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        field: 'tokens_used',
        comment: 'AI分析使用的Token数量',
      },
      processingTime: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        field: 'processing_time',
        comment: '处理时间（毫秒）',
      },
      // 性能跟踪字段
      actualPrice: {
        type: DECIMAL(10, 2),
        allowNull: true,
        field: 'actual_price',
        comment: '实际价格（用于性能跟踪）',
      },
      actualReturn: {
        type: DECIMAL(8, 4),
        allowNull: true,
        field: 'actual_return',
        comment: '实际收益率',
      },
      performanceUpdatedAt: {
        type: DATE,
        allowNull: true,
        field: 'performance_updated_at',
        comment: '性能数据最后更新时间',
      },
      // 状态字段
      status: {
        type: ENUM('active', 'expired', 'achieved', 'stopped'),
        allowNull: false,
        defaultValue: 'active',
        comment: '推荐状态',
      },
      expiresAt: {
        type: DATE,
        allowNull: true,
        field: 'expires_at',
        comment: '推荐过期时间',
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
      tableName: 'ai_recommendation_history',
      underscored: true,
      indexes: [
        {
          name: 'idx_user_created',
          fields: ['user_id', 'created_at'],
        },
        {
          name: 'idx_symbol_created',
          fields: ['stock_symbol', 'created_at'],
        },
        {
          name: 'idx_recommendation_type',
          fields: ['recommendation_type'],
        },
        {
          name: 'idx_risk_level',
          fields: ['risk_level'],
        },
        {
          name: 'idx_status',
          fields: ['status'],
        },
        {
          name: 'idx_expires_at',
          fields: ['expires_at'],
        },
      ],
    }
  )

  AiRecommendationHistory.associate = function () {
    const prefix = this._associationPrefix || ''

    // 关联用户
    this.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: `${prefix}_user`,
    })

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
  AiRecommendationHistory.prototype.updatePerformance = async function (currentPrice) {
    if (!this.currentPrice || !currentPrice) {
      return false
    }

    const actualReturn = (currentPrice - this.currentPrice) / this.currentPrice

    await this.update({
      actualPrice: currentPrice,
      actualReturn: actualReturn,
      performanceUpdatedAt: new Date(),
    })

    return true
  }

  AiRecommendationHistory.prototype.isExpired = function () {
    if (!this.expiresAt) {
      return false
    }
    return new Date() > this.expiresAt
  }

  AiRecommendationHistory.prototype.getPerformanceMetrics = function () {
    if (!this.actualReturn || !this.expectedReturn) {
      return null
    }

    return {
      expectedReturn: this.expectedReturn,
      actualReturn: this.actualReturn,
      outperformance: this.actualReturn - this.expectedReturn,
      accuracy:
        Math.abs(this.actualReturn - this.expectedReturn) < 0.02
          ? 'high'
          : Math.abs(this.actualReturn - this.expectedReturn) < 0.05
          ? 'medium'
          : 'low',
    }
  }

  // 类方法
  AiRecommendationHistory.getPerformanceStats = async function (options = {}) {
    const { userId, stockSymbol, days = 30, recommendationType, riskLevel } = options

    const whereClause = {
      createdAt: {
        [app.Sequelize.Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      },
      actualReturn: {
        [app.Sequelize.Op.ne]: null,
      },
    }

    if (userId) whereClause.userId = userId
    if (stockSymbol) whereClause.stockSymbol = stockSymbol
    if (recommendationType) whereClause.recommendationType = recommendationType
    if (riskLevel) whereClause.riskLevel = riskLevel

    const recommendations = await this.findAll({
      where: whereClause,
      attributes: [
        'recommendationType',
        'expectedReturn',
        'actualReturn',
        'confidenceScore',
        'riskLevel',
      ],
    })

    if (recommendations.length === 0) {
      return {
        totalRecommendations: 0,
        successRate: 0,
        averageReturn: 0,
        averageExpectedReturn: 0,
        outperformanceRate: 0,
      }
    }

    const successfulRecommendations = recommendations.filter((rec) => {
      if (rec.recommendationType === 'buy' || rec.recommendationType === 'strong_buy') {
        return rec.actualReturn > 0
      } else if (rec.recommendationType === 'sell' || rec.recommendationType === 'strong_sell') {
        return rec.actualReturn < 0
      }
      return Math.abs(rec.actualReturn) < 0.02 // hold 推荐的成功标准
    })

    const totalReturn = recommendations.reduce((sum, rec) => sum + rec.actualReturn, 0)
    const totalExpectedReturn = recommendations.reduce((sum, rec) => sum + rec.expectedReturn, 0)
    const outperformingRecommendations = recommendations.filter(
      (rec) => rec.actualReturn > rec.expectedReturn
    )

    return {
      totalRecommendations: recommendations.length,
      successRate: (successfulRecommendations.length / recommendations.length) * 100,
      averageReturn: (totalReturn / recommendations.length) * 100,
      averageExpectedReturn: (totalExpectedReturn / recommendations.length) * 100,
      outperformanceRate: (outperformingRecommendations.length / recommendations.length) * 100,
      riskAdjustedReturn: this.calculateRiskAdjustedReturn(recommendations),
    }
  }

  AiRecommendationHistory.calculateRiskAdjustedReturn = function (recommendations) {
    const riskWeights = { low: 1.0, medium: 1.2, high: 1.5 }

    let weightedReturn = 0
    let totalWeight = 0

    recommendations.forEach((rec) => {
      const weight = riskWeights[rec.riskLevel] || 1.0
      weightedReturn += rec.actualReturn * weight
      totalWeight += weight
    })

    return totalWeight > 0 ? (weightedReturn / totalWeight) * 100 : 0
  }

  AiRecommendationHistory.getTopPerformingStocks = async function (options = {}) {
    const { userId, days = 30, limit = 10, recommendationType } = options

    const whereClause = {
      createdAt: {
        [app.Sequelize.Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      },
      actualReturn: {
        [app.Sequelize.Op.ne]: null,
      },
    }

    if (userId) whereClause.userId = userId
    if (recommendationType) whereClause.recommendationType = recommendationType

    const results = await this.findAll({
      where: whereClause,
      attributes: [
        'stockSymbol',
        'stockName',
        [app.Sequelize.fn('AVG', app.Sequelize.col('actual_return')), 'avgReturn'],
        [app.Sequelize.fn('COUNT', app.Sequelize.col('id')), 'recommendationCount'],
        [app.Sequelize.fn('AVG', app.Sequelize.col('confidence_score')), 'avgConfidence'],
      ],
      group: ['stockSymbol', 'stockName'],
      order: [[app.Sequelize.fn('AVG', app.Sequelize.col('actual_return')), 'DESC']],
      limit,
      raw: true,
    })

    return results.map((result) => ({
      stockSymbol: result.stockSymbol,
      stockName: result.stockName,
      averageReturn: parseFloat(result.avgReturn) * 100,
      recommendationCount: parseInt(result.recommendationCount),
      averageConfidence: parseFloat(result.avgConfidence),
    }))
  }

  return AiRecommendationHistory
}
