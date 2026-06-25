'use strict'

const Service = require('egg').Service

/**
 * DeepSeek API 服务端代理 — 密钥仅存后端，不暴露给前端
 */
class DeepseekApiService extends Service {
  getConfig() {
    const runtime = this.ctx.service.aiProviderRuntime.getRuntimeConfig()
    if (runtime) {
      return {
        apiKey: runtime.apiKey,
        baseUrl: runtime.baseUrl,
        model: runtime.model,
        maxTokens: 4000,
        temperature: 0.7,
        timeout: runtime.timeout || 30000,
        provider: runtime.provider,
        profileName: runtime.profileName,
      }
    }
    const { app } = this
    return {
      apiKey: process.env.DEEPSEEK_API_KEY || app.config.deepseek?.apiKey || '',
      baseUrl: process.env.DEEPSEEK_BASE_URL || app.config.deepseek?.baseUrl || 'https://api.deepseek.com/v1',
      model: process.env.DEEPSEEK_MODEL || app.config.deepseek?.model || 'deepseek-chat',
      maxTokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS || '4000', 10),
      temperature: parseFloat(process.env.DEEPSEEK_TEMPERATURE || '0.7'),
      timeout: parseInt(process.env.DEEPSEEK_TIMEOUT || '30000', 10),
    }
  }

  isAvailable() {
    return this.ctx.service.aiProviderRuntime.isAvailable()
  }

  /**
   * 调用 AI Chat Completions（支持 CC Switch 多 Provider）
   */
  async chat(messages, options = {}) {
    return this.ctx.service.aiProviderRuntime.chat(messages, options)
  }

  /**
   * 分析单只股票
   */
  async analyzeStock(stockData, userPreferences = {}) {
    const prompt = `你是一位专业 A 股分析师。请分析以下股票并返回 JSON：
{
  "summary": "一句话总结",
  "technicalAnalysis": "技术分析",
  "fundamentalAnalysis": "基本面分析",
  "riskAssessment": "风险评估",
  "recommendation": "strong_buy|buy|hold|sell",
  "confidenceScore": 0-100,
  "targetPrice": 数字,
  "stopLoss": 数字,
  "reasoning": ["理由1", "理由2"]
}

股票: ${stockData.symbol} ${stockData.name}
现价: ${stockData.currentPrice}
用户风险偏好: ${userPreferences.riskLevel || 'medium'}
投资周期(天): ${userPreferences.timeHorizon || 7}
技术指标: ${JSON.stringify(stockData.technicalIndicators || {})}`

    const result = await this.chat(
      [
        { role: 'system', content: '你是专业股票分析师，只返回合法 JSON，不要 markdown 代码块。' },
        { role: 'user', content: prompt },
      ],
      { jsonMode: true },
    )

    let analysis
    try {
      const cleaned = result.content.replace(/```json\n?|\n?```/g, '').trim()
      analysis = JSON.parse(cleaned)
    } catch {
      analysis = {
        summary: result.content.slice(0, 200),
        recommendation: 'hold',
        confidenceScore: 50,
        reasoning: ['AI 解析失败，请重试'],
      }
    }

    return {
      analysis,
      metadata: {
        tokensUsed: result.tokensUsed,
        processingTime: result.processingTime,
        analysisType: 'detailed',
        timestamp: Date.now(),
      },
    }
  }

  /**
   * 自然语言条件筛选 — 解析用户描述为结构化筛选条件
   */
  async parseScreeningConditions(naturalLanguage) {
    const prompt = `将以下自然语言选股条件解析为 JSON：
{
  "riskLevel": "low|medium|high",
  "industries": ["行业1"],
  "marketCap": "large|mid|small|all",
  "minExpectedReturn": 0.05,
  "timeHorizon": 30,
  "keywords": ["关键词"],
  "technicalSignals": ["信号描述"],
  "summary": "条件摘要"
}

用户描述: ${naturalLanguage}`

    const result = await this.chat(
      [
        { role: 'system', content: '只返回合法 JSON' },
        { role: 'user', content: prompt },
      ],
      { jsonMode: true },
    )

    try {
      const cleaned = result.content.replace(/```json\n?|\n?```/g, '').trim()
      return { success: true, conditions: JSON.parse(cleaned), tokensUsed: result.tokensUsed }
    } catch (error) {
      return { success: false, error: error.message, conditions: null }
    }
  }

  /**
   * AI 金股评选
   */
  async selectGoldenStocks(candidates, options = {}) {
    const { limit = 10 } = options
    const stockList = candidates
      .slice(0, 30)
      .map((s) => `${s.symbol} ${s.name} 评分:${s.totalScore || 'N/A'}`)
      .join('\n')

    const prompt = `从以下 A 股候选中选出最具「金股」潜力的 ${limit} 只，返回 JSON：
{
  "goldenStocks": [
    {
      "symbol": "代码",
      "name": "名称",
      "goldenScore": 0-100,
      "reasons": ["理由"],
      "riskLevel": "low|medium|high",
      "expectedReturn": 0.15,
      "holdingPeriod": "建议持有期"
    }
  ],
  "marketOutlook": "市场整体判断"
}

筛选标准: 技术强势 + 基本面稳健 + 资金关注 + 风险可控
风险偏好: ${options.riskLevel || 'medium'}

候选股票:
${stockList}`

    const result = await this.chat(
      [
        { role: 'system', content: '你是金股研究员，只返回合法 JSON' },
        { role: 'user', content: prompt },
      ],
      { jsonMode: true },
    )

    try {
      const cleaned = result.content.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      return {
        success: true,
        data: parsed.goldenStocks || [],
        marketOutlook: parsed.marketOutlook || '',
        meta: { tokensUsed: result.tokensUsed, aiPowered: true },
      }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }
}

module.exports = DeepseekApiService
