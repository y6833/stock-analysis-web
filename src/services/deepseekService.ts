/**
 * DeepSeek AI 服务
 * 提供股票分析和推荐的AI功能
 */

import { deepSeekHttpClient, type DeepSeekRequest, type DeepSeekResponse } from '@/utils/deepseekHttpClient'
import {
    getDeepSeekModel,
    getDeepSeekMaxTokens,
    getDeepSeekTemperature,
    getDeepSeekTopP,
    isDeepSeekDebugEnabled
} from '@/config/deepseekConfig'

// 股票分析请求接口
export interface StockAnalysisRequest {
    symbol: string
    name: string
    currentPrice: number
    priceData?: number[]
    volumeData?: number[]
    technicalIndicators?: Record<string, any>
    fundamentalData?: Record<string, any>
    newsData?: string[]
    analysisType: 'basic' | 'detailed' | 'comprehensive'
    userPreferences?: {
        riskLevel: 'low' | 'medium' | 'high'
        investmentHorizon: 'short' | 'medium' | 'long'
        focusAreas?: string[]
    }
}

// 股票分析响应接口
export interface StockAnalysisResponse {
    symbol: string
    analysis: {
        summary: string
        technicalAnalysis: string
        fundamentalAnalysis: string
        riskAssessment: string
        recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
        confidenceScore: number
        targetPrice?: number
        stopLoss?: number
        reasoning: string[]
    }
    metadata: {
        analysisType: string
        timestamp: number
        tokensUsed: number
        processingTime: number
    }
}

// 推荐请求接口
export interface RecommendationRequest {
    criteria: {
        riskLevel: 'low' | 'medium' | 'high'
        expectedReturn: number
        timeHorizon: number
        sectors?: string[]
        marketCap?: 'small' | 'medium' | 'large'
        maxRecommendations: number
    }
    stockPool: Array<{
        symbol: string
        name: string
        currentPrice: number
        marketData: Record<string, any>
    }>
    userProfile?: {
        investmentExperience: string
        riskTolerance: string
        preferences: Record<string, any>
    }
}

// 推荐响应接口
export interface RecommendationResponse {
    recommendations: Array<{
        symbol: string
        name: string
        recommendation: 'strong_buy' | 'buy' | 'hold'
        confidenceScore: number
        expectedReturn: number
        riskLevel: 'low' | 'medium' | 'high'
        reasoning: string[]
        targetPrice: number
        stopLoss: number
        timeframe: string
    }>
    metadata: {
        totalAnalyzed: number
        criteriaUsed: Record<string, any>
        timestamp: number
        tokensUsed: number
    }
}

/**
 * DeepSeek AI 服务类
 */
export class DeepSeekService {
    private model: string
    private maxTokens: number
    private temperature: number
    private topP: number
    private debug: boolean

    constructor() {
        this.model = getDeepSeekModel()
        this.maxTokens = getDeepSeekMaxTokens()
        this.temperature = getDeepSeekTemperature()
        this.topP = getDeepSeekTopP()
        this.debug = isDeepSeekDebugEnabled()
    }

    /**
     * 分析单个股票
     */
    async analyzeStock(request: StockAnalysisRequest): Promise<StockAnalysisResponse> {
        const startTime = Date.now()

        try {
            if (this.debug) {
                console.log('🔍 开始分析股票:', request.symbol)
            }

            // 构建分析提示词
            const prompt = this.buildStockAnalysisPrompt(request)

            // 调用DeepSeek API
            const apiRequest: DeepSeekRequest = {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: this.getSystemPrompt('stock_analysis')
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: this.maxTokens,
                temperature: this.temperature,
                top_p: this.topP
            }

            const response = await deepSeekHttpClient.chatCompletion(apiRequest)

            // 解析AI响应
            const analysis = this.parseStockAnalysisResponse(response.choices[0].message.content)

            const result: StockAnalysisResponse = {
                symbol: request.symbol,
                analysis: {
                    ...analysis,
                    confidenceScore: this.calculateConfidenceScore(analysis, request)
                },
                metadata: {
                    analysisType: request.analysisType,
                    timestamp: Date.now(),
                    tokensUsed: response.usage?.total_tokens || 0,
                    processingTime: Date.now() - startTime
                }
            }

            if (this.debug) {
                console.log('✅ 股票分析完成:', request.symbol, '置信度:', result.analysis.confidenceScore)
            }

            return result

        } catch (error) {
            console.error('❌ 股票分析失败:', request.symbol, error)
            throw new Error(`股票分析失败: ${(error as Error).message}`)
        }
    }

    /**
     * 生成股票推荐
     */
    async generateRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
        const startTime = Date.now()

        try {
            if (this.debug) {
                console.log('🎯 开始生成推荐，股票池大小:', request.stockPool.length)
            }

            // 构建推荐提示词
            const prompt = this.buildRecommendationPrompt(request)

            // 调用DeepSeek API
            const apiRequest: DeepSeekRequest = {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: this.getSystemPrompt('recommendation')
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: this.maxTokens,
                temperature: this.temperature * 0.8, // 推荐时使用稍低的温度
                top_p: this.topP
            }

            const response = await deepSeekHttpClient.chatCompletion(apiRequest)

            // 解析AI响应
            const recommendations = this.parseRecommendationResponse(response.choices[0].message.content)

            const result: RecommendationResponse = {
                recommendations: recommendations.slice(0, request.criteria.maxRecommendations),
                metadata: {
                    totalAnalyzed: request.stockPool.length,
                    criteriaUsed: request.criteria,
                    timestamp: Date.now(),
                    tokensUsed: response.usage?.total_tokens || 0
                }
            }

            if (this.debug) {
                console.log('✅ 推荐生成完成，推荐数量:', result.recommendations.length)
            }

            return result

        } catch (error) {
            console.error('❌ 推荐生成失败:', error)
            throw new Error(`推荐生成失败: ${(error as Error).message}`)
        }
    }

    /**
     * 批量分析股票
     */
    async batchAnalyzeStocks(
        stocks: Array<Omit<StockAnalysisRequest, 'analysisType'>>,
        analysisType: 'basic' | 'detailed' | 'comprehensive' = 'basic'
    ): Promise<StockAnalysisResponse[]> {
        const results: StockAnalysisResponse[] = []
        const batchSize = 5 // 每批处理5只股票，避免API限制

        for (let i = 0; i < stocks.length; i += batchSize) {
            const batch = stocks.slice(i, i + batchSize)

            const batchPromises = batch.map(stock =>
                this.analyzeStock({ ...stock, analysisType })
                    .catch(error => {
                        console.warn(`股票 ${stock.symbol} 分析失败:`, error)
                        return null
                    })
            )

            const batchResults = await Promise.all(batchPromises)
            results.push(...batchResults.filter(result => result !== null) as StockAnalysisResponse[])

            // 批次间延迟，避免触发速率限制
            if (i + batchSize < stocks.length) {
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }

        return results
    }

    /**
     * 获取市场洞察
     */
    async getMarketInsights(marketData: {
        indices: Record<string, number>
        sectors: Record<string, number>
        news: string[]
        economicIndicators?: Record<string, number>
    }): Promise<{
        insights: string
        trends: string[]
        risks: string[]
        opportunities: string[]
        tokensUsed: number
    }> {
        try {
            const prompt = this.buildMarketInsightsPrompt(marketData)

            const apiRequest: DeepSeekRequest = {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: this.getSystemPrompt('market_insights')
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: Math.min(this.maxTokens, 2000),
                temperature: this.temperature,
                top_p: this.topP
            }

            const response = await deepSeekHttpClient.chatCompletion(apiRequest)
            const insights = this.parseMarketInsightsResponse(response.choices[0].message.content)

            return {
                ...insights,
                tokensUsed: response.usage?.total_tokens || 0
            }

        } catch (error) {
            console.error('❌ 市场洞察生成失败:', error)
            throw new Error(`市场洞察生成失败: ${(error as Error).message}`)
        }
    }

    /**
     * 构建股票分析提示词
     */
    private buildStockAnalysisPrompt(request: StockAnalysisRequest): string {
        const { symbol, name, currentPrice, analysisType, userPreferences } = request

        let prompt = `请分析以下股票：

股票信息：
- 代码：${symbol}
- 名称：${name}
- 当前价格：${currentPrice}元

`

        // 添加价格数据
        if (request.priceData && request.priceData.length > 0) {
            prompt += `价格数据（最近${request.priceData.length}个交易日）：
${request.priceData.map((price, index) => `第${index + 1}日: ${price}元`).join('\n')}

`
        }

        // 添加成交量数据
        if (request.volumeData && request.volumeData.length > 0) {
            prompt += `成交量数据：
${request.volumeData.map((volume, index) => `第${index + 1}日: ${volume}股`).join('\n')}

`
        }

        // 添加技术指标
        if (request.technicalIndicators) {
            prompt += `技术指标：
${Object.entries(request.technicalIndicators)
                    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                    .join('\n')}

`
        }

        // 添加基本面数据
        if (request.fundamentalData) {
            prompt += `基本面数据：
${Object.entries(request.fundamentalData)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n')}

`
        }

        // 添加新闻数据
        if (request.newsData && request.newsData.length > 0) {
            prompt += `相关新闻：
${request.newsData.slice(0, 3).map((news, index) => `${index + 1}. ${news}`).join('\n')}

`
        }

        // 添加用户偏好
        if (userPreferences) {
            prompt += `用户偏好：
- 风险等级：${userPreferences.riskLevel}
- 投资期限：${userPreferences.investmentHorizon}
${userPreferences.focusAreas ? `- 关注领域：${userPreferences.focusAreas.join(', ')}` : ''}

`
        }

        // 根据分析类型添加具体要求
        switch (analysisType) {
            case 'basic':
                prompt += `请提供基础分析，包括：
1. 简要技术分析
2. 基本投资建议
3. 风险提示
4. 推荐等级（strong_buy/buy/hold/sell/strong_sell）`
                break
            case 'detailed':
                prompt += `请提供详细分析，包括：
1. 深入技术分析（趋势、支撑阻力、指标解读）
2. 基本面分析（如有数据）
3. 风险评估
4. 具体买卖建议（目标价、止损价）
5. 推荐等级和理由`
                break
            case 'comprehensive':
                prompt += `请提供全面分析，包括：
1. 完整技术分析
2. 基本面深度分析
3. 行业和市场环境分析
4. 多时间框架分析
5. 风险收益评估
6. 详细操作建议
7. 推荐等级和完整理由`
                break
        }

        return prompt
    }

    /**
     * 构建推荐提示词
     */
    private buildRecommendationPrompt(request: RecommendationRequest): string {
        const { criteria, stockPool, userProfile } = request

        let prompt = `请根据以下条件从股票池中选择推荐股票：

投资标准：
- 风险等级：${criteria.riskLevel}
- 预期收益：${(criteria.expectedReturn * 100).toFixed(1)}%
- 投资期限：${criteria.timeHorizon}天
- 最大推荐数量：${criteria.maxRecommendations}

`

        if (criteria.sectors && criteria.sectors.length > 0) {
            prompt += `偏好行业：${criteria.sectors.join(', ')}\n`
        }

        if (criteria.marketCap) {
            prompt += `市值偏好：${criteria.marketCap}\n`
        }

        prompt += `\n股票池（${stockPool.length}只股票）：\n`

        // 添加股票池信息（限制数量避免token过多）
        const limitedPool = stockPool.slice(0, 20) // 最多分析20只股票
        limitedPool.forEach((stock, index) => {
            prompt += `${index + 1}. ${stock.symbol} (${stock.name}) - 当前价格：${stock.currentPrice}元\n`

            // 添加关键市场数据
            if (stock.marketData) {
                const keyData = Object.entries(stock.marketData)
                    .slice(0, 3) // 只取前3个关键指标
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ')
                if (keyData) {
                    prompt += `   关键数据：${keyData}\n`
                }
            }
        })

        if (userProfile) {
            prompt += `\n用户画像：
- 投资经验：${userProfile.investmentExperience}
- 风险承受能力：${userProfile.riskTolerance}
`
        }

        prompt += `\n请选择最符合条件的股票，并为每只推荐股票提供：
1. 推荐等级（strong_buy/buy/hold）
2. 置信度分数（0-100）
3. 预期收益率
4. 风险等级
5. 推荐理由（3-5条）
6. 目标价格
7. 止损价格
8. 建议持有时间

请按推荐优先级排序。`

        return prompt
    }

    /**
     * 构建市场洞察提示词
     */
    private buildMarketInsightsPrompt(marketData: {
        indices: Record<string, number>
        sectors: Record<string, number>
        news: string[]
        economicIndicators?: Record<string, number>
    }): string {
        let prompt = `请分析当前市场状况并提供投资洞察：

主要指数表现：
${Object.entries(marketData.indices)
                .map(([index, change]) => `${index}: ${change > 0 ? '+' : ''}${(change * 100).toFixed(2)}%`)
                .join('\n')}

行业板块表现：
${Object.entries(marketData.sectors)
                .map(([sector, change]) => `${sector}: ${change > 0 ? '+' : ''}${(change * 100).toFixed(2)}%`)
                .join('\n')}

`

        if (marketData.economicIndicators) {
            prompt += `经济指标：
${Object.entries(marketData.economicIndicators)
                    .map(([indicator, value]) => `${indicator}: ${value}`)
                    .join('\n')}

`
        }

        prompt += `市场新闻：
${marketData.news.slice(0, 5).map((news, index) => `${index + 1}. ${news}`).join('\n')}

请提供：
1. 市场整体分析和趋势判断
2. 主要市场趋势（3-5个）
3. 当前主要风险（3-5个）
4. 投资机会（3-5个）`

        return prompt
    }

    /**
     * 获取系统提示词
     */
    private getSystemPrompt(type: 'stock_analysis' | 'recommendation' | 'market_insights'): string {
        const basePrompt = `你是一位专业的股票分析师和投资顾问，具有丰富的市场经验和深厚的金融知识。请基于提供的数据进行客观、专业的分析。`

        switch (type) {
            case 'stock_analysis':
                return `${basePrompt}

在分析股票时，请：
1. 综合考虑技术面、基本面和市场情绪
2. 提供具体的数据支撑和逻辑推理
3. 明确指出风险和机会
4. 给出可操作的投资建议
5. 保持客观中立，避免过度乐观或悲观

请用专业但易懂的语言回答，确保普通投资者也能理解。`

            case 'recommendation':
                return `${basePrompt}

在生成推荐时，请：
1. 严格按照用户设定的风险等级和收益预期筛选
2. 考虑投资期限的适配性
3. 提供清晰的推荐理由和风险提示
4. 给出具体的操作建议（买入价位、止损点等）
5. 按优先级排序推荐结果

请确保推荐的合理性和可执行性。`

            case 'market_insights':
                return `${basePrompt}

在分析市场时，请：
1. 从宏观和微观角度综合分析
2. 识别关键的市场驱动因素
3. 评估短期和中长期趋势
4. 提供前瞻性的投资建议
5. 关注风险管理和机会把握

请提供有价值的市场洞察，帮助投资者做出明智决策。`

            default:
                return basePrompt
        }
    }

    /**
     * 解析股票分析响应
     */
    private parseStockAnalysisResponse(content: string): Omit<StockAnalysisResponse['analysis'], 'confidenceScore'> {
        // 这里实现AI响应的解析逻辑
        // 由于AI响应格式可能不固定，需要使用正则表达式或其他方法提取关键信息

        try {
            // 尝试提取推荐等级
            const recommendationMatch = content.match(/推荐等级[：:]\s*(strong_buy|buy|hold|sell|strong_sell)/i)
            const recommendation = recommendationMatch ? recommendationMatch[1] as any : 'hold'

            // 提取目标价格
            const targetPriceMatch = content.match(/目标价[格]?[：:]\s*(\d+\.?\d*)/i)
            const targetPrice = targetPriceMatch ? parseFloat(targetPriceMatch[1]) : undefined

            // 提取止损价格
            const stopLossMatch = content.match(/止损价[格]?[：:]\s*(\d+\.?\d*)/i)
            const stopLoss = stopLossMatch ? parseFloat(stopLossMatch[1]) : undefined

            // 提取各部分分析内容
            const sections = this.extractAnalysisSections(content)

            return {
                summary: sections.summary || content.substring(0, 200) + '...',
                technicalAnalysis: sections.technical || '技术分析内容',
                fundamentalAnalysis: sections.fundamental || '基本面分析内容',
                riskAssessment: sections.risk || '风险评估内容',
                recommendation,
                targetPrice,
                stopLoss,
                reasoning: this.extractReasoning(content)
            }
        } catch (error) {
            console.warn('解析AI响应失败，使用默认格式:', error)
            return {
                summary: content.substring(0, 200) + '...',
                technicalAnalysis: '技术分析内容',
                fundamentalAnalysis: '基本面分析内容',
                riskAssessment: '风险评估内容',
                recommendation: 'hold',
                reasoning: ['AI分析结果']
            }
        }
    }

    /**
     * 解析推荐响应
     */
    private parseRecommendationResponse(content: string): RecommendationResponse['recommendations'] {
        // 实现推荐响应的解析逻辑
        try {
            const recommendations: RecommendationResponse['recommendations'] = []

            // 使用正则表达式提取推荐信息
            const stockPattern = /(\d+)\.\s*([A-Z0-9.]+)\s*\(([^)]+)\)/g
            let match

            while ((match = stockPattern.exec(content)) !== null) {
                const [, , symbol, name] = match

                // 提取该股票的详细信息
                const stockInfo = this.extractStockRecommendationInfo(content, symbol)

                recommendations.push({
                    symbol,
                    name,
                    recommendation: stockInfo.recommendation,
                    confidenceScore: stockInfo.confidenceScore,
                    expectedReturn: stockInfo.expectedReturn,
                    riskLevel: stockInfo.riskLevel,
                    reasoning: stockInfo.reasoning,
                    targetPrice: stockInfo.targetPrice,
                    stopLoss: stockInfo.stopLoss,
                    timeframe: stockInfo.timeframe
                })
            }

            return recommendations
        } catch (error) {
            console.warn('解析推荐响应失败:', error)
            return []
        }
    }

    /**
     * 解析市场洞察响应
     */
    private parseMarketInsightsResponse(content: string): {
        insights: string
        trends: string[]
        risks: string[]
        opportunities: string[]
    } {
        try {
            return {
                insights: content,
                trends: this.extractListItems(content, '趋势'),
                risks: this.extractListItems(content, '风险'),
                opportunities: this.extractListItems(content, '机会')
            }
        } catch (error) {
            console.warn('解析市场洞察失败:', error)
            return {
                insights: content,
                trends: [],
                risks: [],
                opportunities: []
            }
        }
    }

    /**
     * 提取分析章节
     */
    private extractAnalysisSections(content: string): {
        summary?: string
        technical?: string
        fundamental?: string
        risk?: string
    } {
        const sections: any = {}

        // 提取技术分析部分
        const technicalMatch = content.match(/技术分析[：:]?\s*([\s\S]*?)(?=基本面|风险|推荐|$)/i)
        if (technicalMatch) {
            sections.technical = technicalMatch[1].trim()
        }

        // 提取基本面分析部分
        const fundamentalMatch = content.match(/基本面分析[：:]?\s*([\s\S]*?)(?=技术|风险|推荐|$)/i)
        if (fundamentalMatch) {
            sections.fundamental = fundamentalMatch[1].trim()
        }

        // 提取风险评估部分
        const riskMatch = content.match(/风险[评估]?[：:]?\s*([\s\S]*?)(?=技术|基本面|推荐|$)/i)
        if (riskMatch) {
            sections.risk = riskMatch[1].trim()
        }

        return sections
    }

    /**
     * 提取推理内容
     */
    private extractReasoning(content: string): string[] {
        const reasoning: string[] = []

        // 查找编号列表
        const listPattern = /(?:^|\n)\s*\d+[.、]\s*([^\n]+)/g
        let match

        while ((match = listPattern.exec(content)) !== null) {
            reasoning.push(match[1].trim())
        }

        // 如果没有找到编号列表，尝试其他格式
        if (reasoning.length === 0) {
            const bulletPattern = /(?:^|\n)\s*[•·-]\s*([^\n]+)/g
            while ((match = bulletPattern.exec(content)) !== null) {
                reasoning.push(match[1].trim())
            }
        }

        return reasoning.length > 0 ? reasoning : ['基于AI分析结果']
    }

    /**
     * 提取股票推荐信息
     */
    private extractStockRecommendationInfo(content: string, symbol: string): {
        recommendation: 'strong_buy' | 'buy' | 'hold'
        confidenceScore: number
        expectedReturn: number
        riskLevel: 'low' | 'medium' | 'high'
        reasoning: string[]
        targetPrice: number
        stopLoss: number
        timeframe: string
    } {
        // 默认值
        return {
            recommendation: 'buy',
            confidenceScore: 75,
            expectedReturn: 0.08,
            riskLevel: 'medium',
            reasoning: ['AI推荐'],
            targetPrice: 0,
            stopLoss: 0,
            timeframe: '1-3个月'
        }
    }

    /**
     * 提取列表项
     */
    private extractListItems(content: string, keyword: string): string[] {
        const items: string[] = []
        const pattern = new RegExp(`${keyword}[^：:]*[：:]?\\s*([\\s\\S]*?)(?=\\n\\n|$)`, 'i')
        const match = content.match(pattern)

        if (match) {
            const listText = match[1]
            const itemPattern = /(?:^|\n)\s*\d*[.、]?\s*([^\n]+)/g
            let itemMatch

            while ((itemMatch = itemPattern.exec(listText)) !== null) {
                const item = itemMatch[1].trim()
                if (item && !item.includes(keyword)) {
                    items.push(item)
                }
            }
        }

        return items
    }

    /**
     * 计算置信度分数
     */
    private calculateConfidenceScore(
        analysis: any,
        request: StockAnalysisRequest
    ): number {
        let score = 50 // 基础分数

        // 根据数据完整性调整
        if (request.priceData && request.priceData.length > 10) score += 10
        if (request.technicalIndicators) score += 10
        if (request.fundamentalData) score += 10
        if (request.newsData && request.newsData.length > 0) score += 5

        // 根据分析类型调整
        switch (request.analysisType) {
            case 'comprehensive': score += 15; break
            case 'detailed': score += 10; break
            case 'basic': score += 5; break
        }

        // 确保分数在合理范围内
        return Math.min(Math.max(score, 30), 95)
    }
}

// 导出单例实例
export const deepSeekService = new DeepSeekService()

// 导出类型
export type {
    StockAnalysisRequest,
    StockAnalysisResponse,
    RecommendationRequest,
    RecommendationResponse
}