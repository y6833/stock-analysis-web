'use strict'

const Controller = require('egg').Controller

/**
 * AI 功能统一控制器 — DeepSeek 代理、金股、条件筛选
 */
class AiController extends Controller {
  /**
   * GET /api/ai/status
   */
  async status() {
    const { ctx } = this
    const runtime = ctx.service.aiProviderRuntime.getRuntimeConfig()
    const available = ctx.service.aiProviderRuntime.isAvailable()
    ctx.body = {
      success: true,
      data: {
        aiEnabled: available,
        provider: runtime?.provider || 'none',
        model: runtime?.model || null,
        profileName: runtime?.profileName || null,
        baseUrl: runtime?.baseUrl ? runtime.baseUrl.replace(/\/\/[^/]+@/, '//***@') : null,
        features: {
          recommendations: true,
          conditionScreening: available,
          goldenStocks: available,
          stockAnalysis: available,
          preferences: true,
        },
      },
    }
  }

  /**
   * POST /api/ai/screen — AI 条件筛选
   */
  async screen() {
    const { ctx } = this
    const { query, riskLevel = 'medium', limit = 20 } = ctx.request.body || {}

    if (!query || typeof query !== 'string') {
      ctx.status = 400
      ctx.body = { success: false, message: '请提供选股条件描述 (query)' }
      return
    }

    try {
      let conditions = null
      if (ctx.service.deepseekApiService.isAvailable()) {
        const parsed = await ctx.service.deepseekApiService.parseScreeningConditions(query)
        if (parsed.success) conditions = parsed.conditions
      }

      const recOptions = {
        riskLevel: conditions?.riskLevel || riskLevel,
        expectedReturn: conditions?.minExpectedReturn || 0.05,
        timeHorizon: conditions?.timeHorizon || 30,
        limit: parseInt(limit, 10),
        industry: conditions?.industries?.[0] || null,
        marketCap: conditions?.marketCap !== 'all' ? conditions?.marketCap : null,
        enableAI: ctx.service.deepseekApiService.isAvailable(),
        userId: ctx.user?.id || null,
      }

      const result = await ctx.service.enhancedSmartRecommendation.getEnhancedRecommendations(recOptions)

      ctx.body = {
        success: result.success,
        data: result.data || [],
        conditions: conditions || { summary: query, riskLevel },
        meta: {
          ...result.meta,
          parsedByAI: Boolean(conditions),
          originalQuery: query,
        },
      }
    } catch (error) {
      ctx.logger.error('AI 条件筛选失败:', error)
      ctx.status = 500
      ctx.body = { success: false, message: error.message }
    }
  }

  /**
   * GET /api/ai/golden-stocks — AI 金股
   */
  async goldenStocks() {
    const { ctx } = this
    const { riskLevel = 'medium', limit = 10 } = ctx.query

    try {
      const base = await ctx.service.smartRecommendation.getRecommendations({
        riskLevel,
        expectedReturn: 0.1,
        timeHorizon: 30,
        limit: Math.min(parseInt(limit, 10) * 3, 30),
      })

      if (!base.success || !base.data?.length) {
        ctx.body = { success: false, message: '无法获取候选股票', data: [] }
        return
      }

      if (ctx.service.deepseekApiService.isAvailable()) {
        const golden = await ctx.service.deepseekApiService.selectGoldenStocks(base.data, {
          riskLevel,
          limit: parseInt(limit, 10),
        })

        const enriched = (golden.data || []).map((g) => {
          const original = base.data.find((s) => s.symbol === g.symbol)
          return { ...original, ...g, isGoldenStock: true }
        })

        ctx.body = {
          success: golden.success,
          data: enriched,
          marketOutlook: golden.marketOutlook,
          meta: { aiPowered: true, ...golden.meta },
        }
        return
      }

      // 降级：取评分最高的股票作为金股
      const fallback = base.data
        .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
        .slice(0, parseInt(limit, 10))
        .map((s) => ({
          ...s,
          goldenScore: s.totalScore,
          isGoldenStock: true,
          reasons: s.reasons || ['综合评分领先'],
        }))

      ctx.body = {
        success: true,
        data: fallback,
        meta: { aiPowered: false, fallback: true },
      }
    } catch (error) {
      ctx.logger.error('AI 金股获取失败:', error)
      ctx.status = 500
      ctx.body = { success: false, message: error.message }
    }
  }

  /**
   * POST /api/ai/analyze/:symbol — 个股 AI 深度分析
   */
  async analyzeStock() {
    const { ctx } = this
    const { symbol } = ctx.params
    const { riskLevel = 'medium', timeHorizon = 7 } = ctx.request.body || {}

    if (!symbol) {
      ctx.status = 400
      ctx.body = { success: false, message: '缺少股票代码' }
      return
    }

    try {
      const stockInfo = await ctx.service.stock.getStockInfo(symbol)
      if (!stockInfo) {
        ctx.status = 404
        ctx.body = { success: false, message: '未找到该股票信息' }
        return
      }

      const score = await ctx.service.smartRecommendation.calculateStockScore(stockInfo, {
        riskLevel,
        expectedReturn: 0.05,
        timeHorizon,
      })

      if (!score) {
        ctx.status = 400
        ctx.body = { success: false, message: '该股票数据不足，无法进行分析' }
        return
      }

      const enrichedInfo = await ctx.service.smartRecommendation.enrichRecommendation({
        ...stockInfo,
        ...score,
      })

      if (ctx.service.aiProviderRuntime.isAvailable()) {
        const aiResult = await ctx.service.deepseekApiService.analyzeStock(
          {
            symbol: enrichedInfo.symbol || symbol,
            name: enrichedInfo.name,
            currentPrice: enrichedInfo.currentPrice,
            technicalIndicators: enrichedInfo,
          },
          { riskLevel, timeHorizon },
        )

        ctx.body = {
          success: true,
          data: { ...enrichedInfo, aiAnalysis: aiResult.analysis },
          meta: aiResult.metadata,
        }
        return
      }

      ctx.body = { success: true, data: enrichedInfo }
    } catch (error) {
      ctx.logger.error('AI 个股分析失败:', error)
      ctx.status = 500
      ctx.body = { success: false, message: error.message }
    }
  }

  /**
   * GET /api/ai/history — 推荐历史
   */
  async getHistory() {
    const { ctx } = this
    const userId = ctx.user?.id
    if (!userId) {
      ctx.status = 401
      ctx.body = { success: false, message: '请先登录' }
      return
    }

    try {
      const { page = 1, pageSize = 20 } = ctx.query
      const limit = Math.min(parseInt(pageSize, 10) || 20, 100)
      const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit

      const result = await ctx.app.model.AiRecommendationHistory.findAndCountAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      })

      ctx.body = {
        success: true,
        data: result.rows,
        total: result.count,
        page: parseInt(page, 10) || 1,
        pageSize: limit,
      }
    } catch (error) {
      ctx.logger.error('获取 AI 历史失败:', error)
      ctx.status = 500
      ctx.body = { success: false, message: error.message }
    }
  }
}

module.exports = AiController
