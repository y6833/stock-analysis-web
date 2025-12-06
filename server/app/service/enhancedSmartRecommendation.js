'use strict'

const Service = require('egg').Service

/**
 * 增强智能推荐服务
 * 集成DeepSeek AI分析的智能股票推荐服务
 */
class EnhancedSmartRecommendationService extends Service {
  /**
   * 获取AI增强的智能推荐股票列表
   * @param {Object} options - 推荐选项
   * @param {string} options.riskLevel - 风险等级 (low/medium/high)
   * @param {number} options.expectedReturn - 预期收益率
   * @param {number} options.timeHorizon - 投资时间范围（天）
   * @param {number} options.limit - 推荐数量限制
   * @param {string} options.industry - 行业筛选
   * @param {string} options.market - 板块筛选
   * @param {string} options.marketCap - 市值筛选
   * @param {boolean} options.enableAI - 是否启用AI分析
   * @param {Object} options.userPreferences - 用户偏好设置
   * @return {Object} 推荐结果
   */
  async getEnhancedRecommendations(options = {}) {
    const { ctx } = this
    const {
      riskLevel = 'medium',
      expectedReturn = 0.05,
      timeHorizon = 7,
      limit = 10,
      industry = null,
      market = null,
      marketCap = null,
      enableAI = true,
      userPreferences = {},
      userId = null,
    } = options

    try {
      ctx.logger.info('🚀 开始AI增强推荐分析', { options })

      // 1. 获取基础推荐（使用原有逻辑）
      const baseRecommendations = await this.getBaseRecommendations({
        riskLevel,
        expectedReturn,
        timeHorizon,
        limit: limit * 2, // 获取更多候选股票供AI筛选
        industry,
        market,
        marketCap,
      })

      if (!baseRecommendations.success || baseRecommendations.data.length === 0) {
        ctx.logger.warn('基础推荐获取失败或无结果')
        return baseRecommendations
      }

      let finalRecommendations = baseRecommendations.data

      // 2. AI增强分析（如果启用）
      if (enableAI && this.isAIServiceAvailable()) {
        try {
          finalRecommendations = await this.enhanceWithAI(baseRecommendations.data, {
            riskLevel,
            expectedReturn,
            timeHorizon,
            userPreferences,
          })
        } catch (aiError) {
          ctx.logger.warn('AI增强分析失败，使用基础推荐:', aiError.message)
          // AI失败时降级到基础推荐
        }
      }

      // 3. 应用最终筛选和排序
      const sortedRecommendations = await this.finalizeRecommendations(finalRecommendations, {
        riskLevel,
        expectedReturn,
        timeHorizon,
        limit,
      })

      // 4. 保存推荐记录到数据库
      await this.saveAIRecommendationHistory(sortedRecommendations, options, userId)

      return {
        success: true,
        data: sortedRecommendations,
        meta: {
          ...baseRecommendations.meta,
          aiEnhanced: enableAI && this.isAIServiceAvailable(),
          finalRecommended: sortedRecommendations.length,
          generatedAt: new Date(),
        },
      }
    } catch (error) {
      ctx.logger.error('AI增强推荐失败:', error)
      return {
        success: false,
        error: error.message,
        data: [],
      }
    }
  }

  /**
   * 获取基础推荐（使用原有SmartRecommendationService逻辑）
   */
  async getBaseRecommendations(options) {
    const { ctx } = this

    try {
      // 调用原有的智能推荐服务
      return await ctx.service.smartRecommendation.getRecommendations(options)
    } catch (error) {
      ctx.logger.error('获取基础推荐失败:', error)
      return {
        success: false,
        error: error.message,
        data: [],
      }
    }
  }

  /**
   * 使用AI增强推荐结果
   */
  async enhanceWithAI(baseRecommendations, criteria) {
    const { ctx } = this

    try {
      ctx.logger.info(`🤖 开始AI增强分析，候选股票数量: ${baseRecommendations.length}`)

      const enhancedRecommendations = []

      // 批量处理，避免API限制
      const batchSize = 5
      for (let i = 0; i < baseRecommendations.length; i += batchSize) {
        const batch = baseRecommendations.slice(i, i + batchSize)

        const batchPromises = batch.map(async (stock) => {
          try {
            return await this.enhanceSingleStock(stock, criteria)
          } catch (error) {
            ctx.logger.warn(`AI分析股票 ${stock.symbol} 失败:`, error.message)
            // 返回原始推荐，但标记为未AI增强
            return {
              ...stock,
              aiEnhanced: false,
              aiConfidence: 0,
              aiReasoning: ['AI分析失败，使用基础推荐'],
            }
          }
        })

        const batchResults = await Promise.all(batchPromises)
        enhancedRecommendations.push(...batchResults)

        // 批次间延迟，避免API限制
        if (i + batchSize < baseRecommendations.length) {
          await this.sleep(1000)
        }
      }

      ctx.logger.info(`✅ AI增强分析完成，处理了 ${enhancedRecommendations.length} 只股票`)
      return enhancedRecommendations
    } catch (error) {
      ctx.logger.error('AI增强处理失败:', error)
      throw error
    }
  }

  /**
   * AI增强单个股票分析
   */
  async enhanceSingleStock(stock, criteria) {
    const { ctx } = this

    try {
      // 准备AI分析数据
      const analysisRequest = {
        symbol: stock.symbol,
        name: stock.name,
        currentPrice: stock.currentPrice || 0,
        priceData: await this.getStockPriceData(stock.symbol),
        volumeData: await this.getStockVolumeData(stock.symbol),
        technicalIndicators: await this.getTechnicalIndicators(stock.symbol),
        fundamentalData: await this.getFundamentalData(stock.symbol),
        analysisType: 'detailed',
        userPreferences: {
          riskLevel: criteria.riskLevel,
          investmentHorizon: this.mapTimeHorizonToHorizon(criteria.timeHorizon),
          focusAreas: criteria.userPreferences?.focusAreas || ['技术分析', '风险控制'],
        },
      }

      // 调用DeepSeek AI分析（这里需要实际的AI服务调用）
      const aiAnalysis = await this.callDeepSeekAnalysis(analysisRequest)

      // 融合AI分析结果与传统评分
      const enhancedScore = this.fuseAIWithTraditionalScore(
        stock.totalScore || 50,
        aiAnalysis.analysis.confidenceScore,
        criteria
      )

      // 计算最终置信度
      const finalConfidence = this.calculateFinalConfidence(
        stock.totalScore || 50,
        aiAnalysis.analysis.confidenceScore,
        aiAnalysis.metadata.tokensUsed
      )

      return {
        ...stock,
        // AI增强字段
        aiEnhanced: true,
        aiAnalysis: aiAnalysis.analysis,
        aiConfidence: finalConfidence,
        aiReasoning: aiAnalysis.analysis.reasoning || [],

        // 更新的评分
        totalScore: enhancedScore,
        originalScore: stock.totalScore || 50,

        // AI推荐信息
        recommendation: aiAnalysis.analysis.recommendation,
        targetPrice: aiAnalysis.analysis.targetPrice,
        stopLoss: aiAnalysis.analysis.stopLoss,

        // 元数据
        aiMetadata: {
          tokensUsed: aiAnalysis.metadata.tokensUsed,
          processingTime: aiAnalysis.metadata.processingTime,
          analysisType: aiAnalysis.metadata.analysisType,
        },
      }
    } catch (error) {
      ctx.logger.error(`AI增强股票 ${stock.symbol} 失败:`, error)
      throw error
    }
  }

  /**
   * 调用DeepSeek AI分析（模拟实现）
   */
  async callDeepSeekAnalysis(request) {
    const { ctx } = this

    // 这里应该调用实际的DeepSeek服务
    // 目前返回模拟数据
    return {
      symbol: request.symbol,
      analysis: {
        summary: `基于AI分析，${request.name}显示出积极的投资信号`,
        technicalAnalysis: '技术指标显示上涨趋势',
        fundamentalAnalysis: '基本面数据良好',
        riskAssessment: '中等风险水平',
        recommendation: this.generateAIRecommendation(request),
        confidenceScore: Math.floor(Math.random() * 30) + 60, // 60-90分
        targetPrice: request.currentPrice * (1 + Math.random() * 0.2), // 上涨0-20%
        stopLoss: request.currentPrice * (1 - Math.random() * 0.1), // 下跌0-10%
        reasoning: [
          '技术指标显示积极信号',
          '基本面数据支持投资',
          '市场情绪相对乐观',
          '风险收益比合理',
        ],
      },
      metadata: {
        analysisType: request.analysisType,
        timestamp: Date.now(),
        tokensUsed: Math.floor(Math.random() * 1000) + 500,
        processingTime: Math.floor(Math.random() * 2000) + 1000,
      },
    }
  }

  /**
   * 生成AI推荐等级
   */
  generateAIRecommendation(request) {
    const { riskLevel } = request.userPreferences || {}

    // 基于风险等级生成推荐
    const recommendations = {
      low: ['hold', 'buy'],
      medium: ['hold', 'buy', 'strong_buy'],
      high: ['buy', 'strong_buy'],
    }

    const options = recommendations[riskLevel] || recommendations.medium
    return options[Math.floor(Math.random() * options.length)]
  }

  /**
   * 融合AI分析结果与传统评分
   */
  fuseAIWithTraditionalScore(traditionalScore, aiScore, criteria) {
    // 权重配置
    const weights = {
      traditional: 0.4,
      ai: 0.6,
    }

    // 基础融合分数
    let fusedScore = traditionalScore * weights.traditional + aiScore * weights.ai

    // 根据用户偏好调整权重
    if (criteria.userPreferences?.aiWeight) {
      const aiWeight = Math.min(Math.max(criteria.userPreferences.aiWeight, 0.1), 0.9)
      fusedScore = traditionalScore * (1 - aiWeight) + aiScore * aiWeight
    }

    // 风险调整
    const riskAdjustment = this.getRiskAdjustment(criteria.riskLevel)
    fusedScore *= riskAdjustment

    return Math.round(Math.min(Math.max(fusedScore, 0), 100))
  }

  /**
   * 计算最终置信度
   */
  calculateFinalConfidence(traditionalScore, aiScore, tokensUsed) {
    // 基础置信度（传统评分和AI评分的加权平均）
    const baseConfidence = traditionalScore * 0.3 + aiScore * 0.7

    // Token使用量调整（更多token通常意味着更深入的分析）
    const tokenAdjustment = Math.min(tokensUsed / 1000, 1.2) // 最多20%的提升

    // 一致性调整（传统评分和AI评分越接近，置信度越高）
    const consistency = 1 - Math.abs(traditionalScore - aiScore) / 100
    const consistencyAdjustment = 0.9 + consistency * 0.2 // 0.9-1.1的调整范围

    const finalConfidence = baseConfidence * tokenAdjustment * consistencyAdjustment

    return Math.round(Math.min(Math.max(finalConfidence, 30), 95))
  }

  /**
   * 获取风险调整系数
   */
  getRiskAdjustment(riskLevel) {
    const adjustments = {
      low: 0.95, // 保守调整
      medium: 1.0, // 无调整
      high: 1.05, // 积极调整
    }
    return adjustments[riskLevel] || 1.0
  }

  /**
   * 最终化推荐结果
   */
  async finalizeRecommendations(recommendations, criteria) {
    const { ctx } = this

    try {
      // 1. 按AI增强后的评分排序
      const sortedRecommendations = recommendations.sort((a, b) => {
        // 优先考虑AI增强的推荐
        if (a.aiEnhanced && !b.aiEnhanced) return -1
        if (!a.aiEnhanced && b.aiEnhanced) return 1

        // 然后按总分排序
        return (b.totalScore || 0) - (a.totalScore || 0)
      })

      // 2. 应用最终筛选
      const filteredRecommendations = sortedRecommendations.filter((stock) => {
        // 基本质量筛选
        if ((stock.totalScore || 0) < 40) return false

        // AI置信度筛选（如果有AI分析）
        if (stock.aiEnhanced && (stock.aiConfidence || 0) < 50) return false

        return true
      })

      // 3. 限制数量
      const finalRecommendations = filteredRecommendations.slice(0, criteria.limit)

      // 4. 增强推荐信息
      return await Promise.all(
        finalRecommendations.map((stock) => this.enrichFinalRecommendation(stock, criteria))
      )
    } catch (error) {
      ctx.logger.error('最终化推荐失败:', error)
      return recommendations.slice(0, criteria.limit)
    }
  }

  /**
   * 丰富最终推荐信息
   */
  async enrichFinalRecommendation(stock, criteria) {
    const { ctx } = this

    try {
      // 生成投资建议
      const investmentAdvice = this.generateInvestmentAdvice(stock, criteria)

      // 计算风险收益比
      const riskReturnRatio = this.calculateRiskReturnRatio(stock, criteria)

      return {
        ...stock,
        investmentAdvice,
        riskReturnRatio,
        recommendationRank: this.getRecommendationRank(stock.totalScore || 0),
        lastUpdated: new Date(),
      }
    } catch (error) {
      ctx.logger.warn(`丰富推荐信息失败 ${stock.symbol}:`, error.message)
      return stock
    }
  }

  /**
   * 生成投资建议
   */
  generateInvestmentAdvice(stock, criteria) {
    const advice = {
      action: stock.recommendation || 'hold',
      confidence: stock.aiConfidence || stock.totalScore || 50,
      timeHorizon: this.mapTimeHorizonToText(criteria.timeHorizon),
      riskLevel: criteria.riskLevel,
      keyPoints: [],
    }

    // 基于AI分析生成关键点
    if (stock.aiEnhanced && stock.aiReasoning) {
      advice.keyPoints = stock.aiReasoning.slice(0, 3)
    } else {
      advice.keyPoints = ['基于技术分析推荐', '符合风险偏好设置', '建议关注市场变化']
    }

    // 添加价格建议
    if (stock.targetPrice && stock.currentPrice) {
      const upside = (
        ((stock.targetPrice - stock.currentPrice) / stock.currentPrice) *
        100
      ).toFixed(1)
      advice.priceTarget = {
        current: stock.currentPrice,
        target: stock.targetPrice,
        upside: `${upside}%`,
        stopLoss: stock.stopLoss,
      }
    }

    return advice
  }

  /**
   * 计算风险收益比
   */
  calculateRiskReturnRatio(stock, criteria) {
    const expectedReturn = criteria.expectedReturn || 0.05
    const riskScore = this.calculateRiskScore(stock, criteria.riskLevel)

    return {
      expectedReturn: (expectedReturn * 100).toFixed(1) + '%',
      riskScore: riskScore.toFixed(1),
      ratio: ((expectedReturn / riskScore) * 100).toFixed(2),
      rating: this.getRiskReturnRating(expectedReturn / riskScore),
    }
  }

  /**
   * 计算风险分数
   */
  calculateRiskScore(stock, riskLevel) {
    let baseRisk = 0.5

    // 基于风险等级调整
    const riskMultipliers = {
      low: 0.3,
      medium: 0.5,
      high: 0.8,
    }
    baseRisk = riskMultipliers[riskLevel] || 0.5

    // 基于AI分析调整
    if (stock.aiEnhanced && stock.aiAnalysis) {
      // 这里可以基于AI分析的风险评估进行调整
      baseRisk *= 0.9 // AI分析通常能降低风险不确定性
    }

    return baseRisk
  }

  /**
   * 获取风险收益评级
   */
  getRiskReturnRating(ratio) {
    if (ratio >= 0.15) return 'excellent'
    if (ratio >= 0.1) return 'good'
    if (ratio >= 0.05) return 'fair'
    return 'poor'
  }

  /**
   * 获取推荐等级
   */
  getRecommendationRank(score) {
    if (score >= 80) return 'A'
    if (score >= 70) return 'B'
    if (score >= 60) return 'C'
    if (score >= 50) return 'D'
    return 'E'
  }

  /**
   * 保存AI推荐历史记录
   */
  async saveAIRecommendationHistory(recommendations, options, userId) {
    const { ctx, app } = this

    try {
      if (!recommendations || recommendations.length === 0) {
        return
      }

      const records = recommendations.map((stock) => ({
        userId: userId,
        requestId: this.generateRequestId(),
        stockSymbol: stock.symbol,
        stockName: stock.name,
        recommendationType: stock.recommendation || 'hold',
        confidenceScore: stock.aiConfidence || stock.totalScore || 50,
        aiAnalysis: JSON.stringify(stock.aiAnalysis || {}),
        reasoning: (stock.aiReasoning || []).join('; '),
        riskLevel: options.riskLevel,
        expectedReturn: options.expectedReturn,
        targetPrice: stock.targetPrice,
        stopLossPrice: stock.stopLoss,
        currentPrice: stock.currentPrice,
        timeHorizon: this.mapTimeHorizonToText(options.timeHorizon),
        analysisType: 'enhanced',
        userPreferences: JSON.stringify(options.userPreferences || {}),
        marketData: JSON.stringify({
          totalScore: stock.totalScore,
          originalScore: stock.originalScore,
          aiEnhanced: stock.aiEnhanced,
        }),
        tokensUsed: stock.aiMetadata?.tokensUsed || 0,
        processingTime: stock.aiMetadata?.processingTime || 0,
        status: 'active',
        expiresAt: new Date(Date.now() + options.timeHorizon * 24 * 60 * 60 * 1000),
      }))

      // 批量插入记录
      await app.model.AiRecommendationHistory.bulkCreate(records)

      ctx.logger.info(`✅ 保存了 ${records.length} 条AI推荐历史记录`)
    } catch (error) {
      ctx.logger.error('保存AI推荐历史失败:', error)
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 辅助方法
   */

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }

  mapTimeHorizonToHorizon(days) {
    if (days <= 7) return 'short'
    if (days <= 30) return 'medium'
    return 'long'
  }

  mapTimeHorizonToText(days) {
    if (days <= 7) return `${days}天（短期）`
    if (days <= 30) return `${days}天（中期）`
    return `${days}天（长期）`
  }

  isAIServiceAvailable() {
    // 检查AI服务是否可用
    // 这里可以添加实际的服务检查逻辑
    return true
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // 模拟数据获取方法（实际应该从真实数据源获取）
  async getStockPriceData(symbol) {
    // 返回模拟价格数据
    const basePrice = 10 + Math.random() * 20
    return Array.from({ length: 20 }, (_, i) => basePrice + (Math.random() - 0.5) * 2)
  }

  async getStockVolumeData(symbol) {
    // 返回模拟成交量数据
    return Array.from({ length: 20 }, () => Math.floor(Math.random() * 2000000) + 500000)
  }

  async getTechnicalIndicators(symbol) {
    // 返回模拟技术指标
    return {
      rsi: Array.from({ length: 5 }, () => 30 + Math.random() * 40),
      macd: {
        macd: Array.from({ length: 5 }, () => (Math.random() - 0.5) * 2),
        signal: Array.from({ length: 5 }, () => (Math.random() - 0.5) * 2),
        histogram: Array.from({ length: 5 }, () => (Math.random() - 0.5) * 1),
      },
    }
  }

  async getFundamentalData(symbol) {
    // 返回模拟基本面数据
    return {
      pe: 8 + Math.random() * 20,
      pb: 0.5 + Math.random() * 3,
      roe: 5 + Math.random() * 20,
      roa: 1 + Math.random() * 10,
    }
  }
}

module.exports = EnhancedSmartRecommendationService
