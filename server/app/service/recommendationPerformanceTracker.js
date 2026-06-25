'use strict'

const Service = require('egg').Service

/**
 * 推荐性能跟踪服务
 * 跟踪和分析AI推荐的表现，计算准确率和收益率
 */
class RecommendationPerformanceTrackerService extends Service {
  /**
   * 更新推荐性能数据
   * @param {string} recommendationId - 推荐ID
   * @param {Object} performanceData - 性能数据
   * @returns {Object} 更新结果
   */
  async updateRecommendationPerformance(recommendationId, performanceData) {
    try {
      const {
        currentPrice,
        actualReturn,
        maxReturn,
        minReturn,
        volatility,
        holdingDays,
        status = 'active',
      } = performanceData

      // 查找推荐记录
      const recommendation = await this.app.model.AiRecommendationHistory.findOne({
        where: { requestId: recommendationId },
      })

      if (!recommendation) {
        throw new Error(`推荐记录不存在: ${recommendationId}`)
      }

      // 更新性能数据
      await recommendation.update({
        currentPrice,
        actualReturn,
        maxReturn,
        minReturn,
        volatility,
        holdingDays,
        status,
        performanceUpdatedAt: new Date(),
      })

      // 计算推荐准确性
      const accuracy = this.calculateRecommendationAccuracy(recommendation, performanceData)

      // 更新用户的整体表现统计
      await this.updateUserPerformanceStats(recommendation.userId)

      return {
        success: true,
        data: {
          recommendationId,
          performance: {
            actualReturn,
            accuracy,
            status,
          },
        },
      }
    } catch (error) {
      this.logger.error('更新推荐性能失败:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * 批量更新推荐性能
   * @param {Array} updates - 更新数据列表
   * @returns {Object} 批量更新结果
   */
  async batchUpdatePerformance(updates) {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    }

    for (const update of updates) {
      try {
        await this.updateRecommendationPerformance(update.recommendationId, update.performanceData)
        results.success++
      } catch (error) {
        results.failed++
        results.errors.push({
          recommendationId: update.recommendationId,
          error: error.message,
        })
      }
    }

    return {
      success: true,
      data: results,
    }
  }

  /**
   * 获取推荐性能统计
   * @param {Object} params - 查询参数
   * @returns {Object} 性能统计结果
   */
  async getPerformanceStats(params) {
    const {
      userId,
      timeRange = 30, // 天数
      groupBy = 'day', // day, week, month
      includeDetails = false,
    } = params

    try {
      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000)

      const whereCondition = {
        createdAt: {
          [this.app.Sequelize.Op.gte]: startDate,
        },
      }

      if (userId) {
        whereCondition.userId = userId
      }

      // 获取推荐记录
      const recommendations = await this.app.model.AiRecommendationHistory.findAll({
        where: whereCondition,
        order: [['createdAt', 'DESC']],
      })

      if (recommendations.length === 0) {
        return {
          success: true,
          data: {
            totalRecommendations: 0,
            overallStats: this.getEmptyStats(),
            timeSeriesData: [],
            sectorAnalysis: {},
            riskAnalysis: {},
          },
        }
      }

      // 计算整体统计
      const overallStats = this.calculateOverallStats(recommendations)

      // 计算时间序列数据
      const timeSeriesData = this.calculateTimeSeriesStats(recommendations, groupBy)

      // 计算行业分析
      const sectorAnalysis = this.calculateSectorAnalysis(recommendations)

      // 计算风险分析
      const riskAnalysis = this.calculateRiskAnalysis(recommendations)

      // 计算AI vs 传统分析对比
      const aiVsTraditionalAnalysis = this.calculateAIVsTraditionalAnalysis(recommendations)

      const result = {
        success: true,
        data: {
          totalRecommendations: recommendations.length,
          overallStats,
          timeSeriesData,
          sectorAnalysis,
          riskAnalysis,
          aiVsTraditionalAnalysis,
          timeRange,
          lastUpdated: new Date(),
        },
      }

      if (includeDetails) {
        result.data.detailedRecommendations = recommendations.map((rec) => ({
          id: rec.requestId,
          symbol: rec.stockSymbol,
          name: rec.stockName,
          recommendationType: rec.recommendationType,
          confidence: rec.confidenceScore,
          expectedReturn: rec.expectedReturn,
          actualReturn: rec.actualReturn,
          createdAt: rec.createdAt,
          status: rec.status,
        }))
      }

      return result
    } catch (error) {
      this.logger.error('获取性能统计失败:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * 获取推荐准确率分析
   * @param {Object} params - 查询参数
   * @returns {Object} 准确率分析结果
   */
  async getAccuracyAnalysis(params) {
    const { userId, timeRange = 90, confidenceThreshold = 60 } = params

    try {
      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000)

      const whereCondition = {
        createdAt: {
          [this.app.Sequelize.Op.gte]: startDate,
        },
        actualReturn: {
          [this.app.Sequelize.Op.ne]: null,
        },
      }

      if (userId) {
        whereCondition.userId = userId
      }

      const recommendations = await this.app.model.AiRecommendationHistory.findAll({
        where: whereCondition,
      })

      if (recommendations.length === 0) {
        return {
          success: true,
          data: {
            overallAccuracy: 0,
            confidenceAnalysis: {},
            recommendationTypeAnalysis: {},
            timeHorizonAnalysis: {},
          },
        }
      }

      // 计算整体准确率
      const overallAccuracy = this.calculateOverallAccuracy(recommendations)

      // 按置信度分析准确率
      const confidenceAnalysis = this.calculateAccuracyByConfidence(
        recommendations,
        confidenceThreshold
      )

      // 按推荐类型分析准确率
      const recommendationTypeAnalysis = this.calculateAccuracyByRecommendationType(recommendations)

      // 按时间范围分析准确率
      const timeHorizonAnalysis = this.calculateAccuracyByTimeHorizon(recommendations)

      // 计算预测偏差
      const predictionBias = this.calculatePredictionBias(recommendations)

      return {
        success: true,
        data: {
          totalAnalyzedRecommendations: recommendations.length,
          overallAccuracy,
          confidenceAnalysis,
          recommendationTypeAnalysis,
          timeHorizonAnalysis,
          predictionBias,
          analysisDate: new Date(),
        },
      }
    } catch (error) {
      this.logger.error('获取准确率分析失败:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * 获取收益率分析
   * @param {Object} params - 查询参数
   * @returns {Object} 收益率分析结果
   */
  async getReturnAnalysis(params) {
    const {
      userId,
      timeRange = 90,
      benchmark = 'market', // market, sector, risk_free
    } = params

    try {
      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000)

      const whereCondition = {
        createdAt: {
          [this.app.Sequelize.Op.gte]: startDate,
        },
        actualReturn: {
          [this.app.Sequelize.Op.ne]: null,
        },
      }

      if (userId) {
        whereCondition.userId = userId
      }

      const recommendations = await this.app.model.AiRecommendationHistory.findAll({
        where: whereCondition,
      })

      if (recommendations.length === 0) {
        return {
          success: true,
          data: {
            totalReturn: 0,
            averageReturn: 0,
            winRate: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
          },
        }
      }

      // 计算收益率统计
      const returnStats = this.calculateReturnStats(recommendations)

      // 计算风险调整收益
      const riskAdjustedReturns = this.calculateRiskAdjustedReturns(recommendations)

      // 计算基准对比
      const benchmarkComparison = await this.calculateBenchmarkComparison(
        recommendations,
        benchmark
      )

      // 计算收益分布
      const returnDistribution = this.calculateReturnDistribution(recommendations)

      return {
        success: true,
        data: {
          totalAnalyzedRecommendations: recommendations.length,
          returnStats,
          riskAdjustedReturns,
          benchmarkComparison,
          returnDistribution,
          analysisDate: new Date(),
        },
      }
    } catch (error) {
      this.logger.error('获取收益率分析失败:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * 生成性能报告
   * @param {Object} params - 报告参数
   * @returns {Object} 性能报告
   */
  async generatePerformanceReport(params) {
    const {
      userId,
      timeRange = 90,
      reportType = 'comprehensive', // summary, detailed, comprehensive
    } = params

    try {
      // 获取基础性能统计
      const performanceStats = await this.getPerformanceStats({
        userId,
        timeRange,
        includeDetails: reportType === 'comprehensive',
      })

      // 获取准确率分析
      const accuracyAnalysis = await this.getAccuracyAnalysis({
        userId,
        timeRange,
      })

      // 获取收益率分析
      const returnAnalysis = await this.getReturnAnalysis({
        userId,
        timeRange,
      })

      // 生成改进建议
      const improvementSuggestions = this.generateImprovementSuggestions(
        performanceStats.data,
        accuracyAnalysis.data,
        returnAnalysis.data
      )

      // 计算性能评级
      const performanceRating = this.calculatePerformanceRating(
        performanceStats.data,
        accuracyAnalysis.data,
        returnAnalysis.data
      )

      return {
        success: true,
        data: {
          reportMetadata: {
            userId,
            timeRange,
            reportType,
            generatedAt: new Date(),
          },
          performanceRating,
          performanceStats: performanceStats.data,
          accuracyAnalysis: accuracyAnalysis.data,
          returnAnalysis: returnAnalysis.data,
          improvementSuggestions,
        },
      }
    } catch (error) {
      this.logger.error('生成性能报告失败:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * 计算推荐准确性
   * @param {Object} recommendation - 推荐记录
   * @param {Object} performanceData - 性能数据
   * @returns {number} 准确性分数 (0-100)
   */
  calculateRecommendationAccuracy(recommendation, performanceData) {
    const { actualReturn } = performanceData
    const { recommendationType, expectedReturn } = recommendation

    let accuracy = 50 // 基础分数

    // 根据推荐类型和实际表现计算准确性
    switch (recommendationType) {
      case 'strong_buy':
        if (actualReturn > 0.1) accuracy = 90
        else if (actualReturn > 0.05) accuracy = 75
        else if (actualReturn > 0) accuracy = 60
        else accuracy = 20
        break

      case 'buy':
        if (actualReturn > 0.05) accuracy = 85
        else if (actualReturn > 0.02) accuracy = 70
        else if (actualReturn > 0) accuracy = 55
        else accuracy = 30
        break

      case 'hold':
        if (Math.abs(actualReturn) < 0.02) accuracy = 80
        else if (Math.abs(actualReturn) < 0.05) accuracy = 60
        else accuracy = 40
        break

      case 'sell':
        if (actualReturn < -0.02) accuracy = 85
        else if (actualReturn < 0) accuracy = 70
        else if (actualReturn < 0.02) accuracy = 55
        else accuracy = 30
        break

      case 'strong_sell':
        if (actualReturn < -0.05) accuracy = 90
        else if (actualReturn < -0.02) accuracy = 75
        else if (actualReturn < 0) accuracy = 60
        else accuracy = 20
        break
    }

    // 根据预期收益与实际收益的差异调整
    if (expectedReturn) {
      const returnDiff = Math.abs(actualReturn - expectedReturn)
      if (returnDiff < 0.01) accuracy += 10
      else if (returnDiff < 0.03) accuracy += 5
      else if (returnDiff > 0.1) accuracy -= 10
    }

    return Math.max(0, Math.min(100, accuracy))
  }

  /**
   * 计算整体统计
   */
  calculateOverallStats(recommendations) {
    const total = recommendations.length
    const withReturns = recommendations.filter((rec) => rec.actualReturn !== null)

    if (withReturns.length === 0) {
      return this.getEmptyStats()
    }

    const totalReturn = withReturns.reduce((sum, rec) => sum + (rec.actualReturn || 0), 0)
    const averageReturn = totalReturn / withReturns.length

    const positiveReturns = withReturns.filter((rec) => rec.actualReturn > 0)
    const winRate = (positiveReturns.length / withReturns.length) * 100

    const returns = withReturns.map((rec) => rec.actualReturn)
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - averageReturn, 2), 0) / returns.length
    const volatility = Math.sqrt(variance)

    const maxReturn = Math.max(...returns)
    const minReturn = Math.min(...returns)

    // 计算夏普比率 (假设无风险利率为3%)
    const riskFreeRate = 0.03 / 365 // 日化无风险利率
    const sharpeRatio = volatility > 0 ? (averageReturn - riskFreeRate) / volatility : 0

    return {
      totalRecommendations: total,
      completedRecommendations: withReturns.length,
      averageReturn: Math.round(averageReturn * 10000) / 100, // 转换为百分比
      totalReturn: Math.round(totalReturn * 10000) / 100,
      winRate: Math.round(winRate * 100) / 100,
      volatility: Math.round(volatility * 10000) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      maxReturn: Math.round(maxReturn * 10000) / 100,
      minReturn: Math.round(minReturn * 10000) / 100,
      completionRate: Math.round((withReturns.length / total) * 10000) / 100,
    }
  }

  /**
   * 计算时间序列统计
   */
  calculateTimeSeriesStats(recommendations, groupBy) {
    const timeSeriesData = []
    const groupedData = {}

    recommendations.forEach((rec) => {
      if (!rec.actualReturn) return

      const date = new Date(rec.createdAt)
      let key

      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0]
          break
        case 'week':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split('T')[0]
          break
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        default:
          key = date.toISOString().split('T')[0]
      }

      if (!groupedData[key]) {
        groupedData[key] = {
          date: key,
          returns: [],
          count: 0,
        }
      }

      groupedData[key].returns.push(rec.actualReturn)
      groupedData[key].count++
    })

    Object.values(groupedData).forEach((group) => {
      const avgReturn = group.returns.reduce((sum, ret) => sum + ret, 0) / group.returns.length
      const positiveCount = group.returns.filter((ret) => ret > 0).length
      const winRate = (positiveCount / group.returns.length) * 100

      timeSeriesData.push({
        date: group.date,
        averageReturn: Math.round(avgReturn * 10000) / 100,
        winRate: Math.round(winRate * 100) / 100,
        count: group.count,
      })
    })

    return timeSeriesData.sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * 计算行业分析
   */
  calculateSectorAnalysis(recommendations) {
    const sectorStats = {}

    recommendations.forEach((rec) => {
      if (!rec.actualReturn || !rec.marketData) return

      const sector = rec.marketData.industry || '其他'

      if (!sectorStats[sector]) {
        sectorStats[sector] = {
          count: 0,
          returns: [],
          totalReturn: 0,
        }
      }

      sectorStats[sector].count++
      sectorStats[sector].returns.push(rec.actualReturn)
      sectorStats[sector].totalReturn += rec.actualReturn
    })

    const sectorAnalysis = {}
    Object.entries(sectorStats).forEach(([sector, stats]) => {
      const avgReturn = stats.totalReturn / stats.count
      const positiveCount = stats.returns.filter((ret) => ret > 0).length
      const winRate = (positiveCount / stats.count) * 100

      sectorAnalysis[sector] = {
        count: stats.count,
        averageReturn: Math.round(avgReturn * 10000) / 100,
        winRate: Math.round(winRate * 100) / 100,
        totalReturn: Math.round(stats.totalReturn * 10000) / 100,
      }
    })

    return sectorAnalysis
  }

  /**
   * 计算风险分析
   */
  calculateRiskAnalysis(recommendations) {
    const riskStats = {
      low: { returns: [], count: 0 },
      medium: { returns: [], count: 0 },
      high: { returns: [], count: 0 },
    }

    recommendations.forEach((rec) => {
      if (!rec.actualReturn) return

      const riskLevel = rec.riskLevel || 'medium'
      if (riskStats[riskLevel]) {
        riskStats[riskLevel].returns.push(rec.actualReturn)
        riskStats[riskLevel].count++
      }
    })

    const riskAnalysis = {}
    Object.entries(riskStats).forEach(([risk, stats]) => {
      if (stats.count === 0) {
        riskAnalysis[risk] = {
          count: 0,
          averageReturn: 0,
          winRate: 0,
          volatility: 0,
        }
        return
      }

      const avgReturn = stats.returns.reduce((sum, ret) => sum + ret, 0) / stats.count
      const positiveCount = stats.returns.filter((ret) => ret > 0).length
      const winRate = (positiveCount / stats.count) * 100

      const variance =
        stats.returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / stats.count
      const volatility = Math.sqrt(variance)

      riskAnalysis[risk] = {
        count: stats.count,
        averageReturn: Math.round(avgReturn * 10000) / 100,
        winRate: Math.round(winRate * 100) / 100,
        volatility: Math.round(volatility * 10000) / 100,
      }
    })

    return riskAnalysis
  }

  /**
   * 计算AI vs 传统分析对比
   */
  calculateAIVsTraditionalAnalysis(recommendations) {
    const aiRecommendations = recommendations.filter(
      (rec) => rec.analysisType === 'comprehensive' && rec.actualReturn !== null
    )
    const traditionalRecommendations = recommendations.filter(
      (rec) => rec.analysisType !== 'comprehensive' && rec.actualReturn !== null
    )

    const calculateStats = (recs) => {
      if (recs.length === 0) return { count: 0, averageReturn: 0, winRate: 0 }

      const avgReturn = recs.reduce((sum, rec) => sum + rec.actualReturn, 0) / recs.length
      const positiveCount = recs.filter((rec) => rec.actualReturn > 0).length
      const winRate = (positiveCount / recs.length) * 100

      return {
        count: recs.length,
        averageReturn: Math.round(avgReturn * 10000) / 100,
        winRate: Math.round(winRate * 100) / 100,
      }
    }

    return {
      aiEnhanced: calculateStats(aiRecommendations),
      traditional: calculateStats(traditionalRecommendations),
    }
  }

  /**
   * 计算整体准确率
   */
  calculateOverallAccuracy(recommendations) {
    const accuracyScores = recommendations.map((rec) =>
      this.calculateRecommendationAccuracy(rec, { actualReturn: rec.actualReturn })
    )

    const totalAccuracy = accuracyScores.reduce((sum, score) => sum + score, 0)
    return Math.round(totalAccuracy / accuracyScores.length)
  }

  /**
   * 按置信度分析准确率
   */
  calculateAccuracyByConfidence(recommendations, threshold) {
    const highConfidence = recommendations.filter((rec) => rec.confidenceScore >= threshold)
    const lowConfidence = recommendations.filter((rec) => rec.confidenceScore < threshold)

    const calculateAccuracy = (recs) => {
      if (recs.length === 0) return 0
      const accuracyScores = recs.map((rec) =>
        this.calculateRecommendationAccuracy(rec, { actualReturn: rec.actualReturn })
      )
      return Math.round(
        accuracyScores.reduce((sum, score) => sum + score, 0) / accuracyScores.length
      )
    }

    return {
      highConfidence: {
        count: highConfidence.length,
        accuracy: calculateAccuracy(highConfidence),
      },
      lowConfidence: {
        count: lowConfidence.length,
        accuracy: calculateAccuracy(lowConfidence),
      },
      threshold,
    }
  }

  /**
   * 按推荐类型分析准确率
   */
  calculateAccuracyByRecommendationType(recommendations) {
    const typeStats = {}

    recommendations.forEach((rec) => {
      const type = rec.recommendationType
      if (!typeStats[type]) {
        typeStats[type] = []
      }
      typeStats[type].push(rec)
    })

    const typeAnalysis = {}
    Object.entries(typeStats).forEach(([type, recs]) => {
      const accuracyScores = recs.map((rec) =>
        this.calculateRecommendationAccuracy(rec, { actualReturn: rec.actualReturn })
      )
      const avgAccuracy =
        accuracyScores.reduce((sum, score) => sum + score, 0) / accuracyScores.length

      typeAnalysis[type] = {
        count: recs.length,
        accuracy: Math.round(avgAccuracy),
      }
    })

    return typeAnalysis
  }

  /**
   * 按时间范围分析准确率
   */
  calculateAccuracyByTimeHorizon(recommendations) {
    const horizonStats = {}

    recommendations.forEach((rec) => {
      const horizon = rec.timeHorizon || '30天'
      if (!horizonStats[horizon]) {
        horizonStats[horizon] = []
      }
      horizonStats[horizon].push(rec)
    })

    const horizonAnalysis = {}
    Object.entries(horizonStats).forEach(([horizon, recs]) => {
      const accuracyScores = recs.map((rec) =>
        this.calculateRecommendationAccuracy(rec, { actualReturn: rec.actualReturn })
      )
      const avgAccuracy =
        accuracyScores.reduce((sum, score) => sum + score, 0) / accuracyScores.length

      horizonAnalysis[horizon] = {
        count: recs.length,
        accuracy: Math.round(avgAccuracy),
      }
    })

    return horizonAnalysis
  }

  /**
   * 计算预测偏差
   */
  calculatePredictionBias(recommendations) {
    const validRecs = recommendations.filter(
      (rec) => rec.expectedReturn && rec.actualReturn !== null
    )

    if (validRecs.length === 0) {
      return { bias: 0, meanAbsoluteError: 0, count: 0 }
    }

    const errors = validRecs.map((rec) => rec.actualReturn - rec.expectedReturn)
    const bias = errors.reduce((sum, error) => sum + error, 0) / errors.length
    const meanAbsoluteError =
      errors.reduce((sum, error) => sum + Math.abs(error), 0) / errors.length

    return {
      bias: Math.round(bias * 10000) / 100,
      meanAbsoluteError: Math.round(meanAbsoluteError * 10000) / 100,
      count: validRecs.length,
    }
  }

  /**
   * 计算收益率统计
   */
  calculateReturnStats(recommendations) {
    const returns = recommendations.map((rec) => rec.actualReturn)
    const totalReturn = returns.reduce((sum, ret) => sum + ret, 0)
    const averageReturn = totalReturn / returns.length

    const positiveReturns = returns.filter((ret) => ret > 0)
    const negativeReturns = returns.filter((ret) => ret < 0)

    const winRate = (positiveReturns.length / returns.length) * 100
    const avgWin =
      positiveReturns.length > 0
        ? positiveReturns.reduce((sum, ret) => sum + ret, 0) / positiveReturns.length
        : 0
    const avgLoss =
      negativeReturns.length > 0
        ? negativeReturns.reduce((sum, ret) => sum + ret, 0) / negativeReturns.length
        : 0

    const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0

    return {
      totalReturn: Math.round(totalReturn * 10000) / 100,
      averageReturn: Math.round(averageReturn * 10000) / 100,
      winRate: Math.round(winRate * 100) / 100,
      averageWin: Math.round(avgWin * 10000) / 100,
      averageLoss: Math.round(avgLoss * 10000) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      bestReturn: Math.round(Math.max(...returns) * 10000) / 100,
      worstReturn: Math.round(Math.min(...returns) * 10000) / 100,
    }
  }

  /**
   * 计算风险调整收益
   */
  calculateRiskAdjustedReturns(recommendations) {
    const returns = recommendations.map((rec) => rec.actualReturn)
    const averageReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length

    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - averageReturn, 2), 0) / returns.length
    const volatility = Math.sqrt(variance)

    // 计算最大回撤
    let maxDrawdown = 0
    let peak = 0
    let cumulativeReturn = 0

    returns.forEach((ret) => {
      cumulativeReturn += ret
      if (cumulativeReturn > peak) {
        peak = cumulativeReturn
      }
      const drawdown = (peak - cumulativeReturn) / (1 + peak)
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    })

    // 夏普比率 (假设无风险利率为3%)
    const riskFreeRate = 0.03 / 365
    const sharpeRatio = volatility > 0 ? (averageReturn - riskFreeRate) / volatility : 0

    // 卡尔马比率
    const calmarRatio = maxDrawdown > 0 ? averageReturn / maxDrawdown : 0

    return {
      volatility: Math.round(volatility * 10000) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
      calmarRatio: Math.round(calmarRatio * 100) / 100,
    }
  }

  /**
   * 计算基准对比
   */
  async calculateBenchmarkComparison(recommendations, benchmark) {
    // 简化实现，实际应该获取真实的基准数据
    const benchmarkReturns = {
      market: 0.08 / 365, // 年化8%的日收益率
      sector: 0.06 / 365, // 年化6%的日收益率
      risk_free: 0.03 / 365, // 年化3%的日收益率
    }

    const benchmarkReturn = benchmarkReturns[benchmark] || benchmarkReturns.market
    const actualReturns = recommendations.map((rec) => rec.actualReturn)
    const averageReturn = actualReturns.reduce((sum, ret) => sum + ret, 0) / actualReturns.length

    const excessReturn = averageReturn - benchmarkReturn
    const outperformanceRate =
      (actualReturns.filter((ret) => ret > benchmarkReturn).length / actualReturns.length) * 100

    return {
      benchmark,
      benchmarkReturn: Math.round(benchmarkReturn * 10000) / 100,
      actualReturn: Math.round(averageReturn * 10000) / 100,
      excessReturn: Math.round(excessReturn * 10000) / 100,
      outperformanceRate: Math.round(outperformanceRate * 100) / 100,
    }
  }

  /**
   * 计算收益分布
   */
  calculateReturnDistribution(recommendations) {
    const returns = recommendations.map((rec) => rec.actualReturn)
    const bins = [-0.1, -0.05, -0.02, 0, 0.02, 0.05, 0.1, Infinity]
    const labels = ['<-10%', '-10%~-5%', '-5%~-2%', '-2%~0%', '0%~2%', '2%~5%', '5%~10%', '>10%']

    const distribution = bins
      .map((_, index) => {
        if (index === 0) return 0

        const lowerBound = bins[index - 1]
        const upperBound = bins[index]

        const count = returns.filter((ret) => {
          if (upperBound === Infinity) {
            return ret > lowerBound
          }
          return ret > lowerBound && ret <= upperBound
        }).length

        return {
          range: labels[index - 1],
          count,
          percentage: Math.round((count / returns.length) * 10000) / 100,
        }
      })
      .filter((item) => item !== 0)

    return distribution
  }

  /**
   * 生成改进建议
   */
  generateImprovementSuggestions(performanceStats, accuracyAnalysis, returnAnalysis) {
    const suggestions = []

    // 基于整体表现的建议
    if (performanceStats.overallStats.winRate < 50) {
      suggestions.push({
        type: 'performance',
        priority: 'high',
        title: '提高胜率',
        description: '当前胜率偏低，建议调整推荐策略或提高筛选标准',
        actionItems: ['提高推荐的置信度阈值', '加强基本面分析权重', '优化技术指标组合'],
      })
    }

    // 基于准确率的建议
    if (accuracyAnalysis.overallAccuracy < 60) {
      suggestions.push({
        type: 'accuracy',
        priority: 'high',
        title: '提升预测准确性',
        description: '推荐准确率需要改善，建议优化分析模型',
        actionItems: ['增加更多数据维度', '调整AI模型参数', '加强市场情绪分析'],
      })
    }

    // 基于收益率的建议
    if (returnAnalysis.returnStats.averageReturn < 2) {
      suggestions.push({
        type: 'returns',
        priority: 'medium',
        title: '提升收益水平',
        description: '平均收益率偏低，建议优化选股策略',
        actionItems: ['关注高成长性股票', '增加价值投资策略', '优化持仓时间'],
      })
    }

    // 基于风险的建议
    if (returnAnalysis.riskAdjustedReturns.sharpeRatio < 1) {
      suggestions.push({
        type: 'risk',
        priority: 'medium',
        title: '优化风险收益比',
        description: '夏普比率偏低，建议改善风险管理',
        actionItems: ['加强止损策略', '优化仓位管理', '分散投资组合'],
      })
    }

    return suggestions
  }

  /**
   * 计算性能评级
   */
  calculatePerformanceRating(performanceStats, accuracyAnalysis, returnAnalysis) {
    let score = 0
    const weights = {
      winRate: 0.25,
      accuracy: 0.25,
      returns: 0.25,
      sharpeRatio: 0.25,
    }

    // 胜率评分 (0-25分)
    const winRate = performanceStats.overallStats.winRate
    if (winRate >= 70) score += 25
    else if (winRate >= 60) score += 20
    else if (winRate >= 50) score += 15
    else if (winRate >= 40) score += 10
    else score += 5

    // 准确率评分 (0-25分)
    const accuracy = accuracyAnalysis.overallAccuracy
    if (accuracy >= 80) score += 25
    else if (accuracy >= 70) score += 20
    else if (accuracy >= 60) score += 15
    else if (accuracy >= 50) score += 10
    else score += 5

    // 收益率评分 (0-25分)
    const avgReturn = returnAnalysis.returnStats.averageReturn
    if (avgReturn >= 5) score += 25
    else if (avgReturn >= 3) score += 20
    else if (avgReturn >= 1) score += 15
    else if (avgReturn >= 0) score += 10
    else score += 5

    // 夏普比率评分 (0-25分)
    const sharpeRatio = returnAnalysis.riskAdjustedReturns.sharpeRatio
    if (sharpeRatio >= 2) score += 25
    else if (sharpeRatio >= 1.5) score += 20
    else if (sharpeRatio >= 1) score += 15
    else if (sharpeRatio >= 0.5) score += 10
    else score += 5

    // 确定评级
    let rating
    if (score >= 90) rating = 'A+'
    else if (score >= 80) rating = 'A'
    else if (score >= 70) rating = 'B+'
    else if (score >= 60) rating = 'B'
    else if (score >= 50) rating = 'C+'
    else if (score >= 40) rating = 'C'
    else rating = 'D'

    return {
      score,
      rating,
      breakdown: {
        winRate: Math.round(winRate),
        accuracy: Math.round(accuracy),
        avgReturn: Math.round(avgReturn * 100) / 100,
        sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      },
    }
  }

  /**
   * 更新用户整体表现统计
   */
  async updateUserPerformanceStats(userId) {
    if (!userId) return

    try {
      const preferences = await this.app.model.UserAiPreferences.findOne({ where: { userId } })
      if (!preferences) return

      const stats = await this.app.model.AiRecommendationHistory.getPerformanceStats({
        userId,
        days: 90,
      })

      if (stats.totalRecommendations > 0) {
        await preferences.update({
          totalRecommendations: stats.totalRecommendations,
          successfulRecommendations: Math.round(
            (stats.successRate / 100) * stats.totalRecommendations
          ),
          averageReturn: stats.averageReturn,
          lastRecommendationAt: new Date(),
        })
      }
    } catch (error) {
      this.logger.error('更新用户表现统计失败:', error)
    }
  }

  /**
   * 获取推荐当前价格（多数据源回退）
   * @param {string} symbol
   * @returns {Promise<number|null>}
   */
  async fetchQuotePrice(symbol) {
    const internalQuote = this.ctx.service.internalQuote
    const sources = ['sina', 'eastmoney']

    for (const source of sources) {
      try {
        const response = await internalQuote.fetchQuote(source, symbol)
        const price = internalQuote.extractPrice(response)
        if (price) return price
      } catch (error) {
        this.logger.warn(`行情获取失败 ${source}/${symbol}:`, error.message)
      }
    }

    try {
      const quote = await this.ctx.service.stock.getStockQuote(symbol)
      const price = parseFloat(quote?.price ?? quote?.close)
      if (Number.isFinite(price) && price > 0) return price
    } catch (error) {
      this.logger.warn(`stock.getStockQuote 失败 ${symbol}:`, error.message)
    }

    return null
  }

  /**
   * 根据当前价评估推荐状态
   * @param {object} recommendation
   * @param {number} currentPrice
   * @returns {string}
   */
  evaluateRecommendationStatus(recommendation, currentPrice) {
    if (recommendation.expiresAt && new Date() > new Date(recommendation.expiresAt)) {
      return 'expired'
    }

    const target = parseFloat(recommendation.targetPrice)
    if (Number.isFinite(target) && Number.isFinite(currentPrice)) {
      const type = recommendation.recommendationType
      if (['strong_buy', 'buy'].includes(type) && currentPrice >= target) return 'achieved'
      if (['strong_sell', 'sell'].includes(type) && currentPrice <= target) return 'achieved'
    }

    return recommendation.status === 'active' ? 'active' : recommendation.status
  }

  /**
   * 回填活跃推荐的 actualReturn 与状态
   * @param {object} options
   * @returns {Promise<object>}
   */
  async backfillRecommendationPerformance(options = {}) {
    const { limit = 200, staleMinutes = 30, includeExpired = true } = options
    const { Op } = this.app.Sequelize

    const staleBefore = new Date(Date.now() - staleMinutes * 60 * 1000)
    const statuses = includeExpired ? ['active', 'expired'] : ['active']

    const where = {
      status: { [Op.in]: statuses },
      currentPrice: { [Op.ne]: null },
      [Op.or]: [
        { performanceUpdatedAt: null },
        { performanceUpdatedAt: { [Op.lt]: staleBefore } },
      ],
    }

    const recommendations = await this.app.model.AiRecommendationHistory.findAll({
      where,
      limit,
      order: [
        ['performanceUpdatedAt', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    })

    const summary = {
      processed: recommendations.length,
      updated: 0,
      skipped: 0,
      failed: 0,
      expired: 0,
      achieved: 0,
    }

    const touchedUsers = new Set()

    for (const rec of recommendations) {
      try {
        const entryPrice = parseFloat(rec.currentPrice)
        if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
          summary.skipped++
          continue
        }

        const currentPrice = await this.fetchQuotePrice(rec.stockSymbol)
        if (!currentPrice) {
          summary.failed++
          continue
        }

        const actualReturn = (currentPrice - entryPrice) / entryPrice
        const status = this.evaluateRecommendationStatus(rec, currentPrice)

        await rec.update({
          actualPrice: currentPrice,
          actualReturn,
          performanceUpdatedAt: new Date(),
          status,
        })

        if (status === 'expired') summary.expired++
        if (status === 'achieved') summary.achieved++
        if (rec.userId) touchedUsers.add(rec.userId)
        summary.updated++
      } catch (error) {
        summary.failed++
        this.logger.error(`回填推荐绩效失败 ${rec.requestId}:`, error)
      }
    }

    for (const userId of touchedUsers) {
      await this.updateUserPerformanceStats(userId)
    }

    return { success: true, data: summary }
  }

  /**
   * 获取空统计数据
   */
  getEmptyStats() {
    return {
      totalRecommendations: 0,
      completedRecommendations: 0,
      averageReturn: 0,
      totalReturn: 0,
      winRate: 0,
      volatility: 0,
      sharpeRatio: 0,
      maxReturn: 0,
      minReturn: 0,
      completionRate: 0,
    }
  }
}

module.exports = RecommendationPerformanceTrackerService
