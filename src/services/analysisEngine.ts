/**
 * AI 分析引擎
 * 整合技术分析、基本面分析和情绪分析，提供综合的股票分析能力
 */

import { deepSeekService, type StockAnalysisRequest, type StockAnalysisResponse } from './deepseekService'
import { promptManager } from './promptManager'

// 技术分析数据接口
export interface TechnicalAnalysisData {
    symbol: string
    priceData: number[]
    volumeData: number[]
    indicators: {
        sma?: { sma5: number[]; sma10: number[]; sma20: number[] }
        ema?: { ema12: number[]; ema26: number[] }
        macd?: { macd: number[]; signal: number[]; histogram: number[] }
        rsi?: number[]
        kdj?: { k: number[]; d: number[]; j: number[] }
        bollingerBands?: { upper: number[]; middle: number[]; lower: number[] }
        atr?: number[]
        obv?: number[]
    }
    patterns?: {
        support: number[]
        resistance: number[]
        trendLines: Array<{ start: number; end: number; slope: number }>
        candlestickPatterns: string[]
    }
}

// 基本面分析数据接口
export interface FundamentalAnalysisData {
    symbol: string
    financialMetrics: {
        pe?: number
        pb?: number
        roe?: number
        roa?: number
        debtToEquity?: number
        currentRatio?: number
        quickRatio?: number
        grossMargin?: number
        netMargin?: number
        revenueGrowth?: number
        earningsGrowth?: number
    }
    valuation: {
        marketCap?: number
        enterpriseValue?: number
        priceToSales?: number
        priceToBook?: number
        evToEbitda?: number
    }
    dividends: {
        dividendYield?: number
        payoutRatio?: number
        dividendGrowthRate?: number
    }
    industry: {
        sector: string
        industry: string
        industryPE?: number
        industryPB?: number
        marketPosition?: string
    }
}

// 市场情绪分析数据接口
export interface SentimentAnalysisData {
    symbol: string
    news: Array<{
        title: string
        content: string
        sentiment: 'positive' | 'negative' | 'neutral'
        score: number
        source: string
        publishedAt: Date
    }>
    socialMedia: {
        mentions: number
        sentiment: 'bullish' | 'bearish' | 'neutral'
        score: number
        trending: boolean
    }
    analystRatings: Array<{
        analyst: string
        rating: 'buy' | 'hold' | 'sell'
        targetPrice: number
        date: Date
    }>
    institutionalActivity: {
        buyVolume: number
        sellVolume: number
        netFlow: number
        majorTransactions: Array<{
            type: 'buy' | 'sell'
            volume: number
            price: number
            date: Date
        }>
    }
}

// 综合分析结果接口
export interface ComprehensiveAnalysisResult {
    symbol: string
    timestamp: Date
    technicalAnalysis: {
        trend: 'bullish' | 'bearish' | 'neutral'
        strength: number
        signals: Array<{
            type: string
            signal: 'buy' | 'sell' | 'hold'
            strength: number
            description: string
        }>
        supportResistance: {
            support: number[]
            resistance: number[]
            currentLevel: 'support' | 'resistance' | 'neutral'
        }
    }
    fundamentalAnalysis: {
        valuation: 'undervalued' | 'fairly_valued' | 'overvalued'
        quality: 'high' | 'medium' | 'low'
        growth: 'high' | 'medium' | 'low'
        financial_health: 'strong' | 'moderate' | 'weak'
        industry_comparison: 'outperform' | 'inline' | 'underperform'
    }
    sentimentAnalysis: {
        overall: 'positive' | 'negative' | 'neutral'
        news_sentiment: number
        social_sentiment: number
        analyst_consensus: 'buy' | 'hold' | 'sell'
        institutional_flow: 'inflow' | 'outflow' | 'neutral'
    }
    aiAnalysis: StockAnalysisResponse
    riskAssessment: {
        overall_risk: 'low' | 'medium' | 'high'
        volatility_risk: number
        liquidity_risk: number
        fundamental_risk: number
        market_risk: number
    }
    recommendation: {
        action: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
        confidence: number
        target_price: number
        stop_loss: number
        time_horizon: string
        reasoning: string[]
    }
}

/**
 * AI 分析引擎类
 */
export class AnalysisEngine {
    /**
     * 综合分析股票
     */
    async comprehensiveAnalysis(
        symbol: string,
        technicalData: TechnicalAnalysisData,
        fundamentalData?: FundamentalAnalysisData,
        sentimentData?: SentimentAnalysisData,
        userPreferences?: {
            riskLevel: 'low' | 'medium' | 'high'
            investmentHorizon: 'short' | 'medium' | 'long'
            focusAreas?: string[]
        }
    ): Promise<ComprehensiveAnalysisResult> {
        try {
            console.log(`🔍 开始综合分析股票: ${symbol}`)

            // 1. 技术分析
            const technicalAnalysis = await this.performTechnicalAnalysis(technicalData)

            // 2. 基本面分析
            const fundamentalAnalysis = fundamentalData
                ? await this.performFundamentalAnalysis(fundamentalData)
                : this.getDefaultFundamentalAnalysis()

            // 3. 情绪分析
            const sentimentAnalysis = sentimentData
                ? await this.performSentimentAnalysis(sentimentData)
                : this.getDefaultSentimentAnalysis()

            // 4. AI深度分析
            const aiAnalysis = await this.performAIAnalysis(
                symbol,
                technicalData,
                fundamentalData,
                sentimentData,
                userPreferences
            )

            // 5. 风险评估
            const riskAssessment = this.performRiskAssessment(
                technicalData,
                fundamentalData,
                sentimentData
            )

            // 6. 生成最终推荐
            const recommendation = this.generateRecommendation(
                technicalAnalysis,
                fundamentalAnalysis,
                sentimentAnalysis,
                aiAnalysis,
                riskAssessment,
                userPreferences
            )

            const result: ComprehensiveAnalysisResult = {
                symbol,
                timestamp: new Date(),
                technicalAnalysis,
                fundamentalAnalysis,
                sentimentAnalysis,
                aiAnalysis,
                riskAssessment,
                recommendation
            }

            console.log(`✅ 综合分析完成: ${symbol}, 推荐: ${recommendation.action}`)
            return result

        } catch (error) {
            console.error(`❌ 综合分析失败: ${symbol}`, error)
            throw new Error(`综合分析失败: ${(error as Error).message}`)
        }
    }

    /**
     * 技术分析
     */
    async performTechnicalAnalysis(data: TechnicalAnalysisData): Promise<ComprehensiveAnalysisResult['technicalAnalysis']> {
        const { priceData, indicators, patterns } = data

        // 趋势分析
        const trend = this.analyzeTrend(priceData, indicators)

        // 信号分析
        const signals = this.analyzeSignals(indicators)

        // 支撑阻力分析
        const supportResistance = this.analyzeSupportResistance(priceData, patterns)

        return {
            trend: trend.direction,
            strength: trend.strength,
            signals,
            supportResistance
        }
    }

    /**
     * 基本面分析
     */
    async performFundamentalAnalysis(data: FundamentalAnalysisData): Promise<ComprehensiveAnalysisResult['fundamentalAnalysis']> {
        const { financialMetrics, valuation, industry } = data

        // 估值分析
        const valuationResult = this.analyzeValuation(financialMetrics, valuation, industry)

        // 质量分析
        const quality = this.analyzeQuality(financialMetrics)

        // 成长性分析
        const growth = this.analyzeGrowth(financialMetrics)

        // 财务健康度分析
        const financialHealth = this.analyzeFinancialHealth(financialMetrics)

        // 行业比较
        const industryComparison = this.compareWithIndustry(financialMetrics, industry)

        return {
            valuation: valuationResult,
            quality,
            growth,
            financial_health: financialHealth,
            industry_comparison: industryComparison
        }
    }

    /**
     * 情绪分析
     */
    async performSentimentAnalysis(data: SentimentAnalysisData): Promise<ComprehensiveAnalysisResult['sentimentAnalysis']> {
        const { news, socialMedia, analystRatings, institutionalActivity } = data

        // 新闻情绪分析
        const newsSentiment = this.analyzeNewsSentiment(news)

        // 社交媒体情绪分析
        const socialSentiment = socialMedia.score

        // 分析师共识
        const analystConsensus = this.analyzeAnalystConsensus(analystRatings)

        // 机构资金流向
        const institutionalFlow = this.analyzeInstitutionalFlow(institutionalActivity)

        // 综合情绪
        const overall = this.calculateOverallSentiment(newsSentiment, socialSentiment, analystConsensus)

        return {
            overall,
            news_sentiment: newsSentiment,
            social_sentiment: socialSentiment,
            analyst_consensus: analystConsensus,
            institutional_flow: institutionalFlow
        }
    }

    /**
     * AI深度分析
     */
    async performAIAnalysis(
        symbol: string,
        technicalData: TechnicalAnalysisData,
        fundamentalData?: FundamentalAnalysisData,
        sentimentData?: SentimentAnalysisData,
        userPreferences?: any
    ): Promise<StockAnalysisResponse> {
        // 构建AI分析请求
        const request: StockAnalysisRequest = {
            symbol,
            name: symbol, // 这里应该从股票基础信息获取
            currentPrice: technicalData.priceData[technicalData.priceData.length - 1],
            priceData: technicalData.priceData,
            volumeData: technicalData.volumeData,
            technicalIndicators: technicalData.indicators,
            fundamentalData: fundamentalData?.financialMetrics,
            newsData: sentimentData?.news.map(n => n.title),
            analysisType: 'comprehensive',
            userPreferences
        }

        return await deepSeekService.analyzeStock(request)
    }

    /**
     * 风险评估
     */
    performRiskAssessment(
        technicalData: TechnicalAnalysisData,
        fundamentalData?: FundamentalAnalysisData,
        sentimentData?: SentimentAnalysisData
    ): ComprehensiveAnalysisResult['riskAssessment'] {
        // 波动性风险
        const volatilityRisk = this.calculateVolatilityRisk(technicalData.priceData)

        // 流动性风险
        const liquidityRisk = this.calculateLiquidityRisk(technicalData.volumeData)

        // 基本面风险
        const fundamentalRisk = fundamentalData
            ? this.calculateFundamentalRisk(fundamentalData)
            : 0.5

        // 市场风险
        const marketRisk = sentimentData
            ? this.calculateMarketRisk(sentimentData)
            : 0.5

        // 综合风险等级
        const overallRisk = this.calculateOverallRisk(
            volatilityRisk,
            liquidityRisk,
            fundamentalRisk,
            marketRisk
        )

        return {
            overall_risk: overallRisk,
            volatility_risk: volatilityRisk,
            liquidity_risk: liquidityRisk,
            fundamental_risk: fundamentalRisk,
            market_risk: marketRisk
        }
    }

    /**
     * 生成最终推荐
     */
    generateRecommendation(
        technical: ComprehensiveAnalysisResult['technicalAnalysis'],
        fundamental: ComprehensiveAnalysisResult['fundamentalAnalysis'],
        sentiment: ComprehensiveAnalysisResult['sentimentAnalysis'],
        aiAnalysis: StockAnalysisResponse,
        risk: ComprehensiveAnalysisResult['riskAssessment'],
        userPreferences?: any
    ): ComprehensiveAnalysisResult['recommendation'] {
        // 综合各维度分析结果
        const scores = {
            technical: this.getTechnicalScore(technical),
            fundamental: this.getFundamentalScore(fundamental),
            sentiment: this.getSentimentScore(sentiment),
            ai: aiAnalysis.analysis.confidenceScore / 100
        }

        // 权重分配
        const weights = {
            technical: 0.3,
            fundamental: 0.3,
            sentiment: 0.2,
            ai: 0.2
        }

        // 计算综合分数
        const totalScore = Object.entries(scores).reduce(
            (sum, [key, score]) => sum + score * weights[key as keyof typeof weights],
            0
        )

        // 风险调整
        const riskAdjustedScore = this.adjustScoreForRisk(totalScore, risk, userPreferences)

        // 生成推荐动作
        const action = this.getRecommendationAction(riskAdjustedScore)

        // 计算置信度
        const confidence = Math.min(95, Math.max(30, riskAdjustedScore * 100))

        // 生成推荐理由
        const reasoning = this.generateRecommendationReasoning(
            technical,
            fundamental,
            sentiment,
            aiAnalysis,
            risk
        )

        return {
            action,
            confidence,
            target_price: aiAnalysis.analysis.targetPrice || 0,
            stop_loss: aiAnalysis.analysis.stopLoss || 0,
            time_horizon: this.getTimeHorizon(userPreferences),
            reasoning
        }
    }

    // 以下是各种分析方法的具体实现

    private analyzeTrend(priceData: number[], indicators?: any): { direction: 'bullish' | 'bearish' | 'neutral'; strength: number } {
        const recentPrices = priceData.slice(-20)
        const priceChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0]

        let direction: 'bullish' | 'bearish' | 'neutral'
        let strength: number

        if (priceChange > 0.05) {
            direction = 'bullish'
            strength = Math.min(1, priceChange * 10)
        } else if (priceChange < -0.05) {
            direction = 'bearish'
            strength = Math.min(1, Math.abs(priceChange) * 10)
        } else {
            direction = 'neutral'
            strength = 0.5
        }

        // 结合移动平均线
        if (indicators?.sma) {
            const currentPrice = priceData[priceData.length - 1]
            const sma20 = indicators.sma.sma20[indicators.sma.sma20.length - 1]

            if (currentPrice > sma20 && direction === 'bullish') {
                strength = Math.min(1, strength + 0.2)
            } else if (currentPrice < sma20 && direction === 'bearish') {
                strength = Math.min(1, strength + 0.2)
            }
        }

        return { direction, strength }
    }

    private analyzeSignals(indicators?: any): Array<{ type: string; signal: 'buy' | 'sell' | 'hold'; strength: number; description: string }> {
        const signals: Array<{ type: string; signal: 'buy' | 'sell' | 'hold'; strength: number; description: string }> = []

        // MACD信号
        if (indicators?.macd) {
            const macd = indicators.macd
            const currentMACD = macd.macd[macd.macd.length - 1]
            const currentSignal = macd.signal[macd.signal.length - 1]

            if (currentMACD > currentSignal) {
                signals.push({
                    type: 'MACD',
                    signal: 'buy',
                    strength: 0.7,
                    description: 'MACD线上穿信号线，看涨信号'
                })
            } else {
                signals.push({
                    type: 'MACD',
                    signal: 'sell',
                    strength: 0.7,
                    description: 'MACD线下穿信号线，看跌信号'
                })
            }
        }

        // RSI信号
        if (indicators?.rsi) {
            const currentRSI = indicators.rsi[indicators.rsi.length - 1]

            if (currentRSI < 30) {
                signals.push({
                    type: 'RSI',
                    signal: 'buy',
                    strength: 0.8,
                    description: 'RSI超卖，可能反弹'
                })
            } else if (currentRSI > 70) {
                signals.push({
                    type: 'RSI',
                    signal: 'sell',
                    strength: 0.8,
                    description: 'RSI超买，可能回调'
                })
            }
        }

        return signals
    }

    private analyzeSupportResistance(priceData: number[], patterns?: any): {
        support: number[]
        resistance: number[]
        currentLevel: 'support' | 'resistance' | 'neutral'
    } {
        const support = patterns?.support || this.calculateSupport(priceData)
        const resistance = patterns?.resistance || this.calculateResistance(priceData)
        const currentPrice = priceData[priceData.length - 1]

        let currentLevel: 'support' | 'resistance' | 'neutral' = 'neutral'

        // 判断当前价格位置
        const nearSupport = support.some(level => Math.abs(currentPrice - level) / currentPrice < 0.02)
        const nearResistance = resistance.some(level => Math.abs(currentPrice - level) / currentPrice < 0.02)

        if (nearSupport) {
            currentLevel = 'support'
        } else if (nearResistance) {
            currentLevel = 'resistance'
        }

        return { support, resistance, currentLevel }
    }

    private calculateSupport(priceData: number[]): number[] {
        // 简化的支撑位计算
        const lows = []
        for (let i = 1; i < priceData.length - 1; i++) {
            if (priceData[i] < priceData[i - 1] && priceData[i] < priceData[i + 1]) {
                lows.push(priceData[i])
            }
        }
        return lows.slice(-3) // 返回最近3个支撑位
    }

    private calculateResistance(priceData: number[]): number[] {
        // 简化的阻力位计算
        const highs = []
        for (let i = 1; i < priceData.length - 1; i++) {
            if (priceData[i] > priceData[i - 1] && priceData[i] > priceData[i + 1]) {
                highs.push(priceData[i])
            }
        }
        return highs.slice(-3) // 返回最近3个阻力位
    }

    private analyzeValuation(
        metrics: any,
        valuation: any,
        industry: any
    ): 'undervalued' | 'fairly_valued' | 'overvalued' {
        const pe = metrics?.pe || 0
        const pb = metrics?.pb || 0
        const industryPE = industry?.industryPE || 20
        const industryPB = industry?.industryPB || 2

        let score = 0

        if (pe > 0 && pe < industryPE * 0.8) score += 1
        if (pb > 0 && pb < industryPB * 0.8) score += 1

        if (score >= 2) return 'undervalued'
        if (score >= 1) return 'fairly_valued'
        return 'overvalued'
    }

    private analyzeQuality(metrics: any): 'high' | 'medium' | 'low' {
        const roe = metrics?.roe || 0
        const roa = metrics?.roa || 0
        const debtToEquity = metrics?.debtToEquity || 1

        let score = 0
        if (roe > 15) score += 1
        if (roa > 5) score += 1
        if (debtToEquity < 0.5) score += 1

        if (score >= 3) return 'high'
        if (score >= 2) return 'medium'
        return 'low'
    }

    private analyzeGrowth(metrics: any): 'high' | 'medium' | 'low' {
        const revenueGrowth = metrics?.revenueGrowth || 0
        const earningsGrowth = metrics?.earningsGrowth || 0

        let score = 0
        if (revenueGrowth > 20) score += 1
        if (earningsGrowth > 20) score += 1

        if (score >= 2) return 'high'
        if (score >= 1) return 'medium'
        return 'low'
    }

    private analyzeFinancialHealth(metrics: any): 'strong' | 'moderate' | 'weak' {
        const currentRatio = metrics?.currentRatio || 1
        const quickRatio = metrics?.quickRatio || 1
        const debtToEquity = metrics?.debtToEquity || 1

        let score = 0
        if (currentRatio > 1.5) score += 1
        if (quickRatio > 1) score += 1
        if (debtToEquity < 0.5) score += 1

        if (score >= 3) return 'strong'
        if (score >= 2) return 'moderate'
        return 'weak'
    }

    private compareWithIndustry(metrics: any, industry: any): 'outperform' | 'inline' | 'underperform' {
        const pe = metrics?.pe || 0
        const pb = metrics?.pb || 0
        const roe = metrics?.roe || 0
        const industryPE = industry?.industryPE || 20
        const industryPB = industry?.industryPB || 2

        let score = 0
        if (pe > 0 && pe < industryPE) score += 1
        if (pb > 0 && pb < industryPB) score += 1
        if (roe > 15) score += 1

        if (score >= 2) return 'outperform'
        if (score >= 1) return 'inline'
        return 'underperform'
    }

    private analyzeNewsSentiment(news: any[]): number {
        if (!news || news.length === 0) return 0

        const totalScore = news.reduce((sum, item) => {
            const sentimentScore = item.sentiment === 'positive' ? 1 :
                item.sentiment === 'negative' ? -1 : 0
            return sum + sentimentScore * (item.score || 0.5)
        }, 0)

        return totalScore / news.length
    }

    private analyzeAnalystConsensus(ratings: any[]): 'buy' | 'hold' | 'sell' {
        if (!ratings || ratings.length === 0) return 'hold'

        const buyCount = ratings.filter(r => r.rating === 'buy').length
        const sellCount = ratings.filter(r => r.rating === 'sell').length
        const holdCount = ratings.length - buyCount - sellCount

        if (buyCount > sellCount && buyCount > holdCount) return 'buy'
        if (sellCount > buyCount && sellCount > holdCount) return 'sell'
        return 'hold'
    }

    private analyzeInstitutionalFlow(activity: any): 'inflow' | 'outflow' | 'neutral' {
        const netFlow = activity?.netFlow || 0

        if (netFlow > 0) return 'inflow'
        if (netFlow < 0) return 'outflow'
        return 'neutral'
    }

    private calculateOverallSentiment(
        newsSentiment: number,
        socialSentiment: number,
        analystConsensus: 'buy' | 'hold' | 'sell'
    ): 'positive' | 'negative' | 'neutral' {
        const analystScore = analystConsensus === 'buy' ? 1 :
            analystConsensus === 'sell' ? -1 : 0

        const totalScore = (newsSentiment + socialSentiment + analystScore) / 3

        if (totalScore > 0.2) return 'positive'
        if (totalScore < -0.2) return 'negative'
        return 'neutral'
    }

    private calculateVolatilityRisk(priceData: number[]): number {
        const returns = []
        for (let i = 1; i < priceData.length; i++) {
            returns.push((priceData[i] - priceData[i - 1]) / priceData[i - 1])
        }

        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
        const volatility = Math.sqrt(variance)

        return Math.min(1, volatility * 10) // 标准化到0-1
    }

    private calculateLiquidityRisk(volumeData: number[]): number {
        const avgVolume = volumeData.reduce((sum, v) => sum + v, 0) / volumeData.length
        const recentVolume = volumeData.slice(-5).reduce((sum, v) => sum + v, 0) / 5

        const volumeRatio = recentVolume / avgVolume

        if (volumeRatio > 0.8) return 0.2 // 低流动性风险
        if (volumeRatio > 0.5) return 0.5 // 中等流动性风险
        return 0.8 // 高流动性风险
    }

    private calculateFundamentalRisk(fundamentalData: FundamentalAnalysisData): number {
        const metrics = fundamentalData.financialMetrics
        let riskScore = 0.5 // 基础风险

        // 债务风险
        if (metrics.debtToEquity && metrics.debtToEquity > 1) {
            riskScore += 0.2
        }

        // 盈利能力风险
        if (metrics.roe && metrics.roe < 5) {
            riskScore += 0.2
        }

        // 流动性风险
        if (metrics.currentRatio && metrics.currentRatio < 1) {
            riskScore += 0.2
        }

        return Math.min(1, riskScore)
    }

    private calculateMarketRisk(sentimentData: SentimentAnalysisData): number {
        let riskScore = 0.5

        // 新闻情绪风险
        const negativeNews = sentimentData.news.filter(n => n.sentiment === 'negative').length
        if (negativeNews > sentimentData.news.length * 0.5) {
            riskScore += 0.2
        }

        // 机构资金流出风险
        if (sentimentData.institutionalActivity.netFlow < 0) {
            riskScore += 0.2
        }

        return Math.min(1, riskScore)
    }

    private calculateOverallRisk(
        volatilityRisk: number,
        liquidityRisk: number,
        fundamentalRisk: number,
        marketRisk: number
    ): 'low' | 'medium' | 'high' {
        const avgRisk = (volatilityRisk + liquidityRisk + fundamentalRisk + marketRisk) / 4

        if (avgRisk < 0.4) return 'low'
        if (avgRisk < 0.7) return 'medium'
        return 'high'
    }

    private getTechnicalScore(technical: any): number {
        let score = 0.5

        if (technical.trend === 'bullish') score += 0.3 * technical.strength
        if (technical.trend === 'bearish') score -= 0.3 * technical.strength

        const buySignals = technical.signals.filter((s: any) => s.signal === 'buy').length
        const sellSignals = technical.signals.filter((s: any) => s.signal === 'sell').length

        score += (buySignals - sellSignals) * 0.1

        return Math.max(0, Math.min(1, score))
    }

    private getFundamentalScore(fundamental: any): number {
        let score = 0.5

        if (fundamental.valuation === 'undervalued') score += 0.2
        if (fundamental.valuation === 'overvalued') score -= 0.2

        if (fundamental.quality === 'high') score += 0.2
        if (fundamental.quality === 'low') score -= 0.2

        if (fundamental.growth === 'high') score += 0.1
        if (fundamental.growth === 'low') score -= 0.1

        return Math.max(0, Math.min(1, score))
    }

    private getSentimentScore(sentiment: any): number {
        let score = 0.5

        if (sentiment.overall === 'positive') score += 0.3
        if (sentiment.overall === 'negative') score -= 0.3

        if (sentiment.analyst_consensus === 'buy') score += 0.2
        if (sentiment.analyst_consensus === 'sell') score -= 0.2

        return Math.max(0, Math.min(1, score))
    }

    private adjustScoreForRisk(score: number, risk: any, userPreferences?: any): number {
        const riskAdjustment = {
            low: 0.1,
            medium: 0,
            high: -0.1
        }

        let adjustedScore = score + riskAdjustment[risk.overall_risk]

        // 根据用户风险偏好调整
        if (userPreferences?.riskLevel === 'low' && risk.overall_risk === 'high') {
            adjustedScore -= 0.2
        }
        if (userPreferences?.riskLevel === 'high' && risk.overall_risk === 'low') {
            adjustedScore += 0.1
        }

        return Math.max(0, Math.min(1, adjustedScore))
    }

    private getRecommendationAction(score: number): 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' {
        if (score >= 0.8) return 'strong_buy'
        if (score >= 0.6) return 'buy'
        if (score >= 0.4) return 'hold'
        if (score >= 0.2) return 'sell'
        return 'strong_sell'
    }

    private getTimeHorizon(userPreferences?: any): string {
        if (userPreferences?.investmentHorizon === 'short') return '1-3个月'
        if (userPreferences?.investmentHorizon === 'long') return '6-12个月'
        return '3-6个月'
    }

    private generateRecommendationReasoning(
        technical: any,
        fundamental: any,
        sentiment: any,
        aiAnalysis: any,
        risk: any
    ): string[] {
        const reasoning: string[] = []

        // 技术面理由
        if (technical.trend === 'bullish') {
            reasoning.push(`技术面呈现上涨趋势，强度${(technical.strength * 100).toFixed(0)}%`)
        }

        // 基本面理由
        if (fundamental.valuation === 'undervalued') {
            reasoning.push('基本面分析显示股票被低估')
        }

        // 情绪面理由
        if (sentiment.overall === 'positive') {
            reasoning.push('市场情绪积极，投资者信心较强')
        }

        // AI分析理由
        if (aiAnalysis.analysis.reasoning && aiAnalysis.analysis.reasoning.length > 0) {
            reasoning.push(...aiAnalysis.analysis.reasoning.slice(0, 2))
        }

        // 风险提示
        if (risk.overall_risk === 'high') {
            reasoning.push('注意：该股票风险等级较高，建议谨慎投资')
        }

        return reasoning.length > 0 ? reasoning : ['基于综合分析结果']
    }

    private getDefaultFundamentalAnalysis(): ComprehensiveAnalysisResult['fundamentalAnalysis'] {
        return {
            valuation: 'fairly_valued',
            quality: 'medium',
            growth: 'medium',
            financial_health: 'moderate',
            industry_comparison: 'inline'
        }
    }

    private getDefaultSentimentAnalysis(): ComprehensiveAnalysisResult['sentimentAnalysis'] {
        return {
            overall: 'neutral',
            news_sentiment: 0,
            social_sentiment: 0,
            analyst_consensus: 'hold',
            institutional_flow: 'neutral'
        }
    }
}

// 导出单例实例
export const analysisEngine = new AnalysisEngine()

// 导出类型
export type {
    TechnicalAnalysisData,
    FundamentalAnalysisData,
    SentimentAnalysisData,
    ComprehensiveAnalysisResult
}