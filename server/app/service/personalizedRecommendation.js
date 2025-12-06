'use strict'

const Service = require('egg').Service

/**
 * 个性化推荐服务
 * 基于用户偏好和历史表现提供定制化推荐
 */
class PersonalizedRecommendationService extends Service {
  /**
   * 获取个性化推荐
   * @param {number} userId - 用户ID
   * @param {Object} overrides - 临时覆盖参数
   * @returns {Object} 个性化推荐结果
   */
  async getPersonalizedRecommendations(userId, overrides = {}) {
    try {
      // 1. 获取用户偏好
      const userPreferences = await this.getUserPreferences(userId)

      // 2. 分析用户历史表现
      const performanceAnalysis = await this.analyzeUserPerformance(userId)

      // 3. 构建个性化参数
      const personalizedParams = this.buildPersonalizedParams(
        userPreferences,
        performanceAnalysis,
        overrides
      )

      // 4. 获取增强推荐
      const recommendations =
        await this.service.enhancedSmartRecommendation.getEnhancedRecommendations({
          ...personalizedParams,
          userId,
        })

      // 5. 应用个性化过滤和排序
      const personalizedRecommendations = await this.applyPersonalization(
        recommendations.data.recommendations,
        userPreferences,
        performanceAnalysis
      )

      // 6. 生成个性化洞察
      const insights = await this.generatePersonalizedInsights(
        personalizedRecommendations,
        userPreferences,
        performanceAnalysis
      )

      return {
        success: true,
        data: {
          recommendations: personalizedRecommendations,
          insights,
          personalization: {
            userPreferences: this.sanitizePreferences(userPreferences),
            performanceAnalysis,
            personalizationScore: await this.calculatePersonalizationScore(userId),
          },
          metadata: {
            ...recommendations.data.metadata,
            personalized: true,
            userId,
          },
        },
      }
    } catch (error) {
      this.logger.error('个性化推荐失败:', error)

      // 降级到标准推荐
      return await this.service.enhancedSmartRecommendation.getEnhancedRecommendations(overrides)
    }
  }

  /**
   * 更新用户偏好
   * @param {number} userId - 用户ID
   * @param {Object} preferences - 偏好设置
   * @returns {Object} 更新结果
   */
  async updateUserPreferences(userId, preferences) {
    try {
      // 验证偏好设置
      const validatedPreferences = this.validatePreferences(preferences)

      // 更新数据库
      const updatedPreferences = await this.app.model.UserAiPreferences.updatePreferences(
        userId,
        validatedPreferences
      )

      // 记录偏好变更历史
      await this.recordPreferenceChange(userId, preferences)

      return {
        success: true,
        data: {
          preferences: updatedPreferences.toJSON(),
          message: '偏好设置更新成功',
        },
      }
    } catch (error) {
      this.logger.error('更新用户偏好失败:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * 获取用户偏好设置
   * @param {number} userId - 用户ID
   * @returns {Object} 用户偏好
   */
  async getUserPreferences(userId) {
    const preferences = await this.app.model.UserAiPreferences.getOrCreate(userId)
    return preferences
  }

  /**
   * 分析用户历史表现
   * @param {number} userId - 用户ID
   * @returns {Object} 表现分析结果
   */
  async analyzeUserPerformance(userId) {
    try {
      // 获取最近90天的推荐历史
      const recentHistory = await this.app.model.AiRecommendationHistory.findAll({
        where: {
          userId,
          createdAt: {
            [this.app.Sequelize.Op.gte]: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          },
        },
        order: [['createdAt', 'DESC']],
        limit: 100,
      })

      if (recentHistory.length === 0) {
        return {
          totalRecommendations: 0,
          successRate: 0,
          averageReturn: 0,
          bestPerformingSectors: [],
          riskProfile: 'medium',
          preferredTimeHorizon: 'medium',
        }
      }

      // 计算成功率
      const successfulRecommendations = recentHistory.filter(
        (rec) => rec.actualReturn && rec.actualReturn > 0
      )
      const successRate = (successfulRecommendations.length / recentHistory.length) * 100

      // 计算平均收益
      const totalReturn = recentHistory.reduce((sum, rec) => {
        return sum + (rec.actualReturn || 0)
      }, 0)
      const averageReturn = totalReturn / recentHistory.length

      // 分析行业表现
      const sectorPerformance = this.analyzeSectorPerformance(recentHistory)
      const bestPerformingSectors = Object.entries(sectorPerformance)
        .sort(([, a], [, b]) => b.avgReturn - a.avgReturn)
        .slice(0, 3)
        .map(([sector]) => sector)

      // 分析风险偏好
      const riskBehavior = this.analyzeRiskBehavior(recentHistory)

      // 分析时间偏好
      const timePreferences = this.analyzeTimePreferences(recentHistory)

      return {
        totalRecommendations: recentHistory.length,
        successRate,
        averageReturn,
        bestPerformingSectors,
        riskProfile: riskBehavior.preferredRisk,
        preferredTimeHorizon: timePreferences.preferredHorizon,
        sectorPerformance,
        riskBehavior,
        timePreferences,
      }
    } catch (error) {
      this.logger.error('分析用户历史表现失败:', error)
      return {
        totalRecommendations: 0,
        successRate: 0,
        averageReturn: 0,
        bestPerformingSectors: [],
        riskProfile: 'medium',
        preferredTimeHorizon: 'medium',
      }
    }
  }

  /**
   * 分析行业表现
   */
  analyzeSectorPerformance(history) {
    const sectorStats = {}

    history.forEach((record) => {
      if (!record.actualReturn) return

      const sector = this.getSectorFromSymbol(record.stockSymbol)

      if (!sectorStats[sector]) {
        sectorStats[sector] = {
          count: 0,
          totalReturn: 0,
          successCount: 0,
        }
      }

      sectorStats[sector].count++
      sectorStats[sector].totalReturn += record.actualReturn

      if (record.actualReturn > 0) {
        sectorStats[sector].successCount++
      }
    })

    // 计算每个行业的平均表现
    Object.keys(sectorStats).forEach((sector) => {
      const stats = sectorStats[sector]
      stats.avgReturn = stats.totalReturn / stats.count
      stats.successRate = stats.successCount / stats.count
      stats.preference = stats.avgReturn * 0.7 + stats.successRate * 0.3
    })

    return sectorStats
  }

  /**
   * 分析风险行为
   */
  analyzeRiskBehavior(history) {
    if (history.length === 0) {
      return { preferredRisk: 'medium', avgReturn: 0, volatility: 0 }
    }

    const riskStats = {
      low: { count: 0, totalReturn: 0 },
      medium: { count: 0, totalReturn: 0 },
      high: { count: 0, totalReturn: 0 },
    }

    let totalReturn = 0
    const returns = []

    history.forEach((record) => {
      if (!record.actualReturn) return

      const riskLevel = record.riskLevel || 'medium'
      if (riskStats[riskLevel]) {
        riskStats[riskLevel].count++
        riskStats[riskLevel].totalReturn += record.actualReturn
      }

      totalReturn += record.actualReturn
      returns.push(record.actualReturn)
    })

    // 计算各风险等级的平均收益
    Object.keys(riskStats).forEach((risk) => {
      const stats = riskStats[risk]
      stats.avgReturn = stats.count > 0 ? stats.totalReturn / stats.count : 0
    })

    // 找出表现最好的风险等级
    const bestRisk = Object.keys(riskStats).reduce((best, current) => {
      return riskStats[current].avgReturn > riskStats[best].avgReturn ? current : best
    }, 'medium')

    // 计算波动率
    const avgReturn = totalReturn / returns.length
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
    const volatility = Math.sqrt(variance)

    return {
      preferredRisk: bestRisk,
      avgReturn,
      volatility,
      riskStats,
    }
  }

  /**
   * 分析时间偏好
   */
  analyzeTimePreferences(history) {
    const timeStats = {
      short: { count: 0, totalReturn: 0 },
      medium: { count: 0, totalReturn: 0 },
      long: { count: 0, totalReturn: 0 },
    }

    history.forEach((record) => {
      if (!record.actualReturn || !record.timeHorizon) return

      const horizon = this.mapTimeHorizonToCategory(record.timeHorizon)
      if (timeStats[horizon]) {
        timeStats[horizon].count++
        timeStats[horizon].totalReturn += record.actualReturn
      }
    })

    // 计算各时间范围的平均收益
    Object.keys(timeStats).forEach((horizon) => {
      const stats = timeStats[horizon]
      stats.avgReturn = stats.count > 0 ? stats.totalReturn / stats.count : 0
    })

    // 找出表现最好的时间范围
    const bestHorizon = Object.keys(timeStats).reduce((best, current) => {
      return timeStats[current].avgReturn > timeStats[best].avgReturn ? current : best
    }, 'medium')

    return {
      preferredHorizon: bestHorizon,
      timeStats,
    }
  }

  /**
   * 构建个性化参数
   * @param {Object} userPreferences - 用户偏好
   * @param {Object} performanceAnalysis - 表现分析
   * @param {Object} overrides - 覆盖参数
   * @returns {Object} 个性化参数
   */
  buildPersonalizedParams(userPreferences, performanceAnalysis, overrides) {
    const params = {
      riskLevel: userPreferences.getRiskLevel(),
      expectedReturn: userPreferences.expectedReturn,
      timeHorizon: userPreferences.getTimeHorizonDays(),
      maxRecommendations: userPreferences.maxRecommendations,
      sectors: this.getPreferredSectors(userPreferences, performanceAnalysis),
      marketCap: userPreferences.marketCapPreference,
      enableAI: userPreferences.enableAIRecommendations,
      analysisDepth: userPreferences.analysisDepth,
      confidenceThreshold: userPreferences.confidenceThreshold,
      excludedStocks: userPreferences.excludedStocks || [],
      ...overrides,
    }

    // 基于历史表现调整参数
    if (performanceAnalysis.totalRecommendations > 10) {
      // 如果历史表现好，可以适当提高风险等级
      if (performanceAnalysis.successRate > 70 && performanceAnalysis.averageReturn > 0.05) {
        const riskLevels = ['low', 'medium', 'high']
        const currentIndex = riskLevels.indexOf(params.riskLevel)
        if (currentIndex < riskLevels.length - 1) {
          params.riskLevel = riskLevels[currentIndex + 1]
        }
      }

      // 如果历史表现差，降低风险等级
      if (performanceAnalysis.successRate < 40 || performanceAnalysis.averageReturn < -0.02) {
        const riskLevels = ['low', 'medium', 'high']
        const currentIndex = riskLevels.indexOf(params.riskLevel)
        if (currentIndex > 0) {
          params.riskLevel = riskLevels[currentIndex - 1]
        }
      }
    }

    return params
  }

  /**
   * 应用个性化过滤和排序
   * @param {Array} recommendations - 推荐列表
   * @param {Object} userPreferences - 用户偏好
   * @param {Object} performanceAnalysis - 表现分析
   * @returns {Array} 个性化推荐列表
   */
  async applyPersonalization(recommendations, userPreferences, performanceAnalysis) {
    let personalizedRecommendations = [...recommendations]

    // 1. 过滤排除的股票
    if (userPreferences.excludedStocks && userPreferences.excludedStocks.length > 0) {
      personalizedRecommendations = personalizedRecommendations.filter(
        (rec) => !userPreferences.excludedStocks.includes(rec.symbol)
      )
    }

    // 2. 基于行业偏好调整评分
    const sectorWeights = userPreferences.getSectorWeights()
    personalizedRecommendations = personalizedRecommendations.map((rec) => {
      const sector = this.getSectorFromSymbol(rec.symbol)
      const sectorWeight = sectorWeights[sector] || 1.0

      // 调整置信度
      const adjustedConfidence = Math.min(100, Math.max(0, rec.confidence * sectorWeight))

      return {
        ...rec,
        confidence: Math.round(adjustedConfidence),
        sectorWeight,
        personalizedScore: rec.confidence * sectorWeight,
      }
    })

    // 3. 基于历史表现调整
    if (performanceAnalysis.bestPerformingSectors.length > 0) {
      personalizedRecommendations = personalizedRecommendations.map((rec) => {
        const sector = this.getSectorFromSymbol(rec.symbol)
        const isTopSector = performanceAnalysis.bestPerformingSectors.includes(sector)

        if (isTopSector) {
          rec.personalizedScore = (rec.personalizedScore || rec.confidence) * 1.1
          rec.historicalBonus = true
        }

        return rec
      })
    }

    // 4. 重新排序
    personalizedRecommendations.sort((a, b) => {
      return (b.personalizedScore || b.confidence) - (a.personalizedScore || a.confidence)
    })

    // 5. 添加个性化标签
    personalizedRecommendations = personalizedRecommendations.map((rec) => {
      const tags = []

      if (rec.sectorWeight > 1.0) {
        tags.push('偏好行业')
      }

      if (rec.historicalBonus) {
        tags.push('历史表现优秀')
      }

      if (rec.aiEnhanced) {
        tags.push('AI增强')
      }

      return {
        ...rec,
        personalizationTags: tags,
      }
    })

    return personalizedRecommendations
  }

  /**
   * 生成个性化洞察
   * @param {Array} recommendations - 推荐列表
   * @param {Object} userPreferences - 用户偏好
   * @param {Object} performanceAnalysis - 表现分析
   * @returns {Array} 洞察列表
   */
  async generatePersonalizedInsights(recommendations, userPreferences, performanceAnalysis) {
    const insights = []

    // 个性化程度洞察
    const personalizationScore = await this.calculatePersonalizationScore(userPreferences.userId)
    if (personalizationScore < 60) {
      insights.push({
        type: 'personalization',
        title: '个性化程度可以提升',
        message: '完善更多偏好设置可以获得更精准的推荐',
        action: 'improve_preferences',
        priority: 'medium',
      })
    }

    // 历史表现洞察
    if (performanceAnalysis.totalRecommendations > 5) {
      if (performanceAnalysis.successRate > 70) {
        insights.push({
          type: 'performance',
          title: '推荐表现优秀',
          message: `您的推荐成功率达到 ${performanceAnalysis.successRate.toFixed(1)}%`,
          priority: 'info',
        })
      } else if (performanceAnalysis.successRate < 40) {
        insights.push({
          type: 'performance',
          title: '推荐表现需要改善',
          message: '考虑调整风险偏好或关注不同行业',
          action: 'adjust_strategy',
          priority: 'high',
        })
      }
    }

    // 行业分布洞察
    const sectorDistribution = this.analyzeSectorDistribution(recommendations)
    const dominantSector = Object.keys(sectorDistribution)[0]
    if (dominantSector && sectorDistribution[dominantSector] > 0.5) {
      insights.push({
        type: 'diversification',
        title: '行业集中度较高',
        message: `推荐股票主要集中在${dominantSector}行业，建议关注分散化`,
        action: 'diversify_sectors',
        priority: 'medium',
      })
    }

    // AI 使用洞察
    const aiEnhancedCount = recommendations.filter((rec) => rec.aiEnhanced).length
    if (aiEnhancedCount > 0) {
      insights.push({
        type: 'ai_analysis',
        title: 'AI 分析应用',
        message: `本次有 ${aiEnhancedCount} 只股票经过 AI 深度分析`,
        priority: 'info',
      })
    }

    return insights
  }

  /**
   * 计算个性化评分
   * @param {number} userId - 用户ID
   * @returns {number} 个性化评分 (0-100)
   */
  async calculatePersonalizationScore(userId) {
    try {
      const preferences = await this.app.model.UserAiPreferences.getOrCreate(userId)
      const performance = await this.app.model.AiRecommendationHistory.getPerformanceStats({
        userId,
        days: 90,
      })

      return this.app.model.UserAiPreferences.calculatePersonalizationScore(
        preferences,
        performance
      )
    } catch (error) {
      this.logger.error('计算个性化评分失败:', error)
      return 50 // 默认评分
    }
  }

  /**
   * 记录偏好变更历史
   * @param {number} userId - 用户ID
   * @param {Object} preferences - 新偏好设置
   */
  async recordPreferenceChange(userId, preferences) {
    try {
      // 这里可以记录偏好变更历史，用于分析用户行为
      this.logger.info(`用户 ${userId} 更新偏好设置:`, preferences)
    } catch (error) {
      this.logger.error('记录偏好变更失败:', error)
    }
  }

  /**
   * 验证偏好设置
   * @param {Object} preferences - 偏好设置
   * @returns {Object} 验证后的偏好设置
   */
  validatePreferences(preferences) {
    const validated = {}

    // 验证风险承受能力
    if (['conservative', 'moderate', 'aggressive'].includes(preferences.riskTolerance)) {
      validated.riskTolerance = preferences.riskTolerance
    }

    // 验证投资期限
    if (['short', 'medium', 'long'].includes(preferences.investmentHorizon)) {
      validated.investmentHorizon = preferences.investmentHorizon
    }

    // 验证预期收益率
    if (
      typeof preferences.expectedReturn === 'number' &&
      preferences.expectedReturn >= 0 &&
      preferences.expectedReturn <= 1
    ) {
      validated.expectedReturn = preferences.expectedReturn
    }

    // 验证最大仓位
    if (
      typeof preferences.maxPositionSize === 'number' &&
      preferences.maxPositionSize > 0 &&
      preferences.maxPositionSize <= 1
    ) {
      validated.maxPositionSize = preferences.maxPositionSize
    }

    // 验证行业偏好
    if (preferences.sectorPreferences && typeof preferences.sectorPreferences === 'object') {
      validated.sectorPreferences = preferences.sectorPreferences
    }

    // 验证其他设置
    if (typeof preferences.enableAIRecommendations === 'boolean') {
      validated.enableAIRecommendations = preferences.enableAIRecommendations
    }

    if (
      typeof preferences.confidenceThreshold === 'number' &&
      preferences.confidenceThreshold >= 0 &&
      preferences.confidenceThreshold <= 1
    ) {
      validated.confidenceThreshold = preferences.confidenceThreshold
    }

    return validated
  }

  /**
   * 获取偏好行业列表
   * @param {Object} userPreferences - 用户偏好
   * @param {Object} performanceAnalysis - 表现分析
   * @returns {Array} 偏好行业列表
   */
  getPreferredSectors(userPreferences, performanceAnalysis) {
    const sectors = []

    // 从用户设置中获取偏好行业
    if (userPreferences.sectorPreferences) {
      const preferredSectors = Object.entries(userPreferences.sectorPreferences)
        .filter(([, weight]) => weight > 0.6)
        .map(([sector]) => sector)
      sectors.push(...preferredSectors)
    }

    // 从历史表现中获取优秀行业
    if (performanceAnalysis.bestPerformingSectors) {
      sectors.push(...performanceAnalysis.bestPerformingSectors)
    }

    // 去重并返回
    return [...new Set(sectors)]
  }

  /**
   * 分析推荐的行业分布
   * @param {Array} recommendations - 推荐列表
   * @returns {Object} 行业分布统计
   */
  analyzeSectorDistribution(recommendations) {
    const distribution = {}
    const total = recommendations.length

    recommendations.forEach((rec) => {
      const sector = this.getSectorFromSymbol(rec.symbol)
      distribution[sector] = (distribution[sector] || 0) + 1
    })

    // 转换为比例并排序
    const sortedDistribution = {}
    Object.entries(distribution)
      .sort(([, a], [, b]) => b - a)
      .forEach(([sector, count]) => {
        sortedDistribution[sector] = count / total
      })

    return sortedDistribution
  }

  /**
   * 清理敏感的偏好信息
   * @param {Object} preferences - 用户偏好
   * @returns {Object} 清理后的偏好信息
   */
  sanitizePreferences(preferences) {
    const sanitized = preferences.toJSON ? preferences.toJSON() : { ...preferences }

    // 移除敏感字段
    delete sanitized.id
    delete sanitized.userId
    delete sanitized.createdAt
    delete sanitized.updatedAt

    return sanitized
  }

  /**
   * 辅助方法
   */
  getSectorFromSymbol(symbol) {
    // 简化实现，实际应该从数据库查询
    const sectorMap = {
      '000001': '银行',
      '000002': '房地产',
      600036: '银行',
      600519: '食品饮料',
      '000858': '食品饮料',
      '002415': '医药生物',
    }

    const code = symbol.replace(/\.(SZ|SH)$/, '')
    return sectorMap[code] || '其他'
  }

  mapTimeHorizonToCategory(timeHorizon) {
    if (typeof timeHorizon === 'string') {
      if (timeHorizon.includes('短期') || timeHorizon.includes('7天')) return 'short'
      if (timeHorizon.includes('长期') || timeHorizon.includes('90天')) return 'long'
      return 'medium'
    }
    return 'medium'
  }
}

module.exports = PersonalizedRecommendationService
