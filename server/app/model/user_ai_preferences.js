'use strict'

module.exports = (app) => {
  const { INTEGER, STRING, DECIMAL, DATE, ENUM, JSON, BOOLEAN } = app.Sequelize

  const UserAiPreferences = app.model.define(
    'user_ai_preferences',
    {
      id: {
        type: INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        unique: true,
        field: 'user_id',
        comment: '用户ID',
      },
      riskTolerance: {
        type: ENUM('conservative', 'moderate', 'aggressive'),
        allowNull: false,
        defaultValue: 'moderate',
        field: 'risk_tolerance',
        comment: '风险承受能力',
      },
      investmentHorizon: {
        type: ENUM('short', 'medium', 'long'),
        allowNull: false,
        defaultValue: 'medium',
        field: 'investment_horizon',
        comment: '投资期限偏好',
      },
      sectorPreferences: {
        type: JSON,
        allowNull: true,
        field: 'sector_preferences',
        comment: '行业偏好设置（JSON格式）',
      },
      analysisDepth: {
        type: ENUM('basic', 'detailed', 'comprehensive'),
        allowNull: false,
        defaultValue: 'detailed',
        field: 'analysis_depth',
        comment: 'AI分析深度偏好',
      },
      aiWeight: {
        type: DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 0.6,
        field: 'ai_weight',
        comment: 'AI分析权重（0.1-0.9）',
        validate: {
          min: 0.1,
          max: 0.9,
        },
      },
      focusAreas: {
        type: JSON,
        allowNull: true,
        field: 'focus_areas',
        comment: '关注领域（技术分析、基本面分析等）',
      },
      excludePatterns: {
        type: JSON,
        allowNull: true,
        field: 'exclude_patterns',
        comment: '排除模式（ST股票、新股等）',
      },
      notificationSettings: {
        type: JSON,
        allowNull: true,
        field: 'notification_settings',
        comment: '通知设置（JSON格式）',
      },
      customCriteria: {
        type: JSON,
        allowNull: true,
        field: 'custom_criteria',
        comment: '自定义筛选条件',
      },
      // 学习相关字段
      learningEnabled: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'learning_enabled',
        comment: '是否启用学习功能',
      },
      feedbackWeight: {
        type: DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 0.2,
        field: 'feedback_weight',
        comment: '用户反馈权重',
      },
      adaptationRate: {
        type: DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 0.1,
        field: 'adaptation_rate',
        comment: '偏好适应速度',
      },
      // 性能跟踪
      totalRecommendations: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        field: 'total_recommendations',
        comment: '总推荐次数',
      },
      successfulRecommendations: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        field: 'successful_recommendations',
        comment: '成功推荐次数',
      },
      averageReturn: {
        type: DECIMAL(8, 4),
        allowNull: true,
        field: 'average_return',
        comment: '平均收益率',
      },
      lastRecommendationAt: {
        type: DATE,
        allowNull: true,
        field: 'last_recommendation_at',
        comment: '最后推荐时间',
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
      tableName: 'user_ai_preferences',
      underscored: true,
      indexes: [
        {
          name: 'idx_user_id',
          fields: ['user_id'],
          unique: true,
        },
        {
          name: 'idx_risk_tolerance',
          fields: ['risk_tolerance'],
        },
        {
          name: 'idx_investment_horizon',
          fields: ['investment_horizon'],
        },
        {
          name: 'idx_learning_enabled',
          fields: ['learning_enabled'],
        },
      ],
    }
  )

  UserAiPreferences.associate = function () {
    const prefix = this._associationPrefix || ''

    // 关联用户
    this.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: `${prefix}_user`,
    })
  }

  // 实例方法
  UserAiPreferences.prototype.updatePerformance = async function (isSuccessful, actualReturn) {
    const updates = {
      totalRecommendations: this.totalRecommendations + 1,
      lastRecommendationAt: new Date(),
    }

    if (isSuccessful) {
      updates.successfulRecommendations = this.successfulRecommendations + 1
    }

    if (actualReturn !== null && actualReturn !== undefined) {
      // 计算新的平均收益率
      const currentTotal = (this.averageReturn || 0) * this.totalRecommendations
      updates.averageReturn = (currentTotal + actualReturn) / updates.totalRecommendations
    }

    await this.update(updates)
  }

  UserAiPreferences.prototype.getSuccessRate = function () {
    if (this.totalRecommendations === 0) return 0
    return (this.successfulRecommendations / this.totalRecommendations) * 100
  }

  UserAiPreferences.prototype.adaptPreferences = async function (feedback) {
    if (!this.learningEnabled) return

    const adaptationRate = this.adaptationRate
    const updates = {}

    // 基于反馈调整AI权重
    if (feedback.aiAccuracy !== undefined) {
      const currentWeight = this.aiWeight
      const adjustment = (feedback.aiAccuracy - 0.5) * adaptationRate
      updates.aiWeight = Math.max(0.1, Math.min(0.9, currentWeight + adjustment))
    }

    // 基于反馈调整风险偏好
    if (feedback.riskSatisfaction !== undefined) {
      const riskLevels = ['conservative', 'moderate', 'aggressive']
      const currentIndex = riskLevels.indexOf(this.riskTolerance)

      if (feedback.riskSatisfaction < 0.3 && currentIndex > 0) {
        updates.riskTolerance = riskLevels[currentIndex - 1]
      } else if (feedback.riskSatisfaction > 0.7 && currentIndex < 2) {
        updates.riskTolerance = riskLevels[currentIndex + 1]
      }
    }

    // 调整行业偏好
    if (feedback.sectorPerformance) {
      const currentPreferences = this.sectorPreferences || {}
      const updatedPreferences = { ...currentPreferences }

      Object.entries(feedback.sectorPerformance).forEach(([sector, performance]) => {
        const currentWeight = updatedPreferences[sector] || 0.5
        const adjustment = (performance - 0.5) * adaptationRate
        updatedPreferences[sector] = Math.max(0.1, Math.min(1.0, currentWeight + adjustment))
      })

      updates.sectorPreferences = updatedPreferences
    }

    if (Object.keys(updates).length > 0) {
      await this.update(updates)
    }
  }

  UserAiPreferences.prototype.getPersonalizationScore = function () {
    let score = 0
    let factors = 0

    // 基于使用历史
    if (this.totalRecommendations > 0) {
      score += Math.min(this.totalRecommendations / 10, 1) * 30 // 最多30分
      factors++
    }

    // 基于成功率
    if (this.totalRecommendations > 5) {
      score += (this.getSuccessRate() / 100) * 25 // 最多25分
      factors++
    }

    // 基于配置完整性
    const configCompleteness = this.getConfigCompleteness()
    score += configCompleteness * 25 // 最多25分
    factors++

    // 基于学习启用状态
    if (this.learningEnabled) {
      score += 20 // 20分
    }
    factors++

    return factors > 0 ? Math.round((score / factors) * (factors / 4)) : 0
  }

  UserAiPreferences.prototype.getConfigCompleteness = function () {
    let completeness = 0
    let totalFields = 0

    // 检查基础配置
    const basicFields = ['riskTolerance', 'investmentHorizon', 'analysisDepth']
    basicFields.forEach((field) => {
      totalFields++
      if (this[field]) completeness++
    })

    // 检查高级配置
    const advancedFields = ['sectorPreferences', 'focusAreas', 'customCriteria']
    advancedFields.forEach((field) => {
      totalFields++
      if (this[field] && Object.keys(this[field]).length > 0) completeness++
    })

    return totalFields > 0 ? completeness / totalFields : 0
  }

  // 类方法
  UserAiPreferences.createDefault = async function (userId) {
    const defaultPreferences = {
      userId,
      riskTolerance: 'moderate',
      investmentHorizon: 'medium',
      analysisDepth: 'detailed',
      aiWeight: 0.6,
      focusAreas: ['技术分析', '基本面分析', '风险控制'],
      excludePatterns: ['ST股票', '退市风险'],
      notificationSettings: {
        enablePush: true,
        enableEmail: false,
        frequency: 'daily',
        threshold: 0.7,
      },
      learningEnabled: true,
      feedbackWeight: 0.2,
      adaptationRate: 0.1,
    }

    return await this.create(defaultPreferences)
  }

  UserAiPreferences.getOrCreate = async function (userId) {
    let preferences = await this.findOne({ where: { userId } })

    if (!preferences) {
      preferences = await this.createDefault(userId)
    }

    return preferences
  }

  UserAiPreferences.updatePreferences = async function (userId, updates) {
    const [preferences] = await this.upsert({
      userId,
      ...updates,
      updatedAt: new Date(),
    })

    return preferences
  }

  UserAiPreferences.getPersonalizationInsights = async function (userId) {
    const preferences = await this.findOne({ where: { userId } })

    if (!preferences) {
      return null
    }

    const insights = {
      personalizationScore: preferences.getPersonalizationScore(),
      successRate: preferences.getSuccessRate(),
      totalRecommendations: preferences.totalRecommendations,
      averageReturn: preferences.averageReturn,
      configCompleteness: preferences.getConfigCompleteness(),
      learningEnabled: preferences.learningEnabled,
      lastActivity: preferences.lastRecommendationAt,
      recommendations: [],
    }

    // 生成个性化建议
    if (insights.personalizationScore < 50) {
      insights.recommendations.push('建议完善偏好设置以获得更精准的推荐')
    }

    if (preferences.totalRecommendations < 5) {
      insights.recommendations.push('多使用推荐功能以提升个性化效果')
    }

    if (!preferences.learningEnabled) {
      insights.recommendations.push('启用学习功能可以自动优化推荐效果')
    }

    if (insights.successRate < 60 && preferences.totalRecommendations > 10) {
      insights.recommendations.push('考虑调整风险偏好或投资期限设置')
    }

    return insights
  }

  UserAiPreferences.getBulkPreferences = async function (userIds) {
    const preferences = await this.findAll({
      where: {
        userId: {
          [app.Sequelize.Op.in]: userIds,
        },
      },
    })

    // 转换为以userId为键的对象
    const preferencesMap = {}
    preferences.forEach((pref) => {
      preferencesMap[pref.userId] = pref
    })

    return preferencesMap
  }

  UserAiPreferences.getPreferenceStats = async function () {
    const stats = await this.findAll({
      attributes: [
        'riskTolerance',
        'investmentHorizon',
        'analysisDepth',
        [app.Sequelize.fn('COUNT', app.Sequelize.col('id')), 'count'],
        [app.Sequelize.fn('AVG', app.Sequelize.col('ai_weight')), 'avgAiWeight'],
        [app.Sequelize.fn('AVG', app.Sequelize.col('average_return')), 'avgReturn'],
      ],
      group: ['riskTolerance', 'investmentHorizon', 'analysisDepth'],
      raw: true,
    })

    return stats.map((stat) => ({
      riskTolerance: stat.riskTolerance,
      investmentHorizon: stat.investmentHorizon,
      analysisDepth: stat.analysisDepth,
      userCount: parseInt(stat.count),
      averageAiWeight: parseFloat(stat.avgAiWeight) || 0,
      averageReturn: parseFloat(stat.avgReturn) || 0,
    }))
  }

  return UserAiPreferences
}
