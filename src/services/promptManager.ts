/**
 * AI 提示词管理器
 * 管理和优化发送给DeepSeek的提示词模板
 */

// 提示词模板接口
export interface PromptTemplate {
    id: string
    name: string
    description: string
    template: string
    variables: string[]
    category: 'analysis' | 'recommendation' | 'insights' | 'risk' | 'strategy'
    version: string
    createdAt: Date
    updatedAt: Date
}

// 提示词参数接口
export interface PromptParams {
    [key: string]: any
}

// 提示词构建选项
export interface PromptBuildOptions {
    includeContext?: boolean
    optimizeLength?: boolean
    targetTokens?: number
    language?: 'zh' | 'en'
    style?: 'professional' | 'casual' | 'technical'
}

/**
 * 提示词管理器类
 */
export class PromptManager {
    private templates: Map<string, PromptTemplate> = new Map()
    private systemPrompts: Map<string, string> = new Map()

    constructor() {
        this.initializeTemplates()
        this.initializeSystemPrompts()
    }

    /**
     * 构建股票分析提示词
     */
    buildAnalysisPrompt(
        stockData: {
            symbol: string
            name: string
            currentPrice: number
            priceData?: number[]
            volumeData?: number[]
            technicalIndicators?: Record<string, any>
            fundamentalData?: Record<string, any>
            newsData?: string[]
        },
        analysisType: 'basic' | 'detailed' | 'comprehensive',
        userPreferences?: {
            riskLevel: 'low' | 'medium' | 'high'
            investmentHorizon: 'short' | 'medium' | 'long'
            focusAreas?: string[]
        },
        options: PromptBuildOptions = {}
    ): string {
        const templateId = `stock_analysis_${analysisType}`
        const template = this.templates.get(templateId)

        if (!template) {
            throw new Error(`未找到模板: ${templateId}`)
        }

        const params: PromptParams = {
            symbol: stockData.symbol,
            name: stockData.name,
            currentPrice: stockData.currentPrice,
            priceDataSection: this.buildPriceDataSection(stockData.priceData),
            volumeDataSection: this.buildVolumeDataSection(stockData.volumeData),
            technicalIndicatorsSection: this.buildTechnicalIndicatorsSection(stockData.technicalIndicators),
            fundamentalDataSection: this.buildFundamentalDataSection(stockData.fundamentalData),
            newsSection: this.buildNewsSection(stockData.newsData),
            userPreferencesSection: this.buildUserPreferencesSection(userPreferences),
            analysisRequirements: this.getAnalysisRequirements(analysisType)
        }

        let prompt = this.renderTemplate(template.template, params)

        // 应用构建选项
        if (options.optimizeLength && options.targetTokens) {
            prompt = this.optimizePromptLength(prompt, options.targetTokens)
        }

        if (options.style) {
            prompt = this.applyStyle(prompt, options.style)
        }

        return prompt
    }

    /**
     * 构建推荐生成提示词
     */
    buildRecommendationPrompt(
        criteria: {
            riskLevel: 'low' | 'medium' | 'high'
            expectedReturn: number
            timeHorizon: number
            sectors?: string[]
            marketCap?: 'small' | 'medium' | 'large'
            maxRecommendations: number
        },
        stockPool: Array<{
            symbol: string
            name: string
            currentPrice: number
            marketData: Record<string, any>
        }>,
        userProfile?: {
            investmentExperience: string
            riskTolerance: string
            preferences: Record<string, any>
        },
        options: PromptBuildOptions = {}
    ): string {
        const template = this.templates.get('stock_recommendation')

        if (!template) {
            throw new Error('未找到推荐模板')
        }

        const params: PromptParams = {
            riskLevel: criteria.riskLevel,
            expectedReturn: (criteria.expectedReturn * 100).toFixed(1),
            timeHorizon: criteria.timeHorizon,
            maxRecommendations: criteria.maxRecommendations,
            sectorsSection: this.buildSectorsSection(criteria.sectors),
            marketCapSection: this.buildMarketCapSection(criteria.marketCap),
            stockPoolSection: this.buildStockPoolSection(stockPool, options.targetTokens),
            userProfileSection: this.buildUserProfileSection(userProfile),
            recommendationRequirements: this.getRecommendationRequirements()
        }

        let prompt = this.renderTemplate(template.template, params)

        if (options.optimizeLength && options.targetTokens) {
            prompt = this.optimizePromptLength(prompt, options.targetTokens)
        }

        return prompt
    }

    /**
     * 构建风险评估提示词
     */
    buildRiskAssessmentPrompt(
        stockData: {
            symbol: string
            name: string
            historicalData: number[]
            volatility: number
            beta?: number
            correlations?: Record<string, number>
        },
        riskLevel: 'low' | 'medium' | 'high',
        options: PromptBuildOptions = {}
    ): string {
        const template = this.templates.get('risk_assessment')

        if (!template) {
            throw new Error('未找到风险评估模板')
        }

        const params: PromptParams = {
            symbol: stockData.symbol,
            name: stockData.name,
            volatility: (stockData.volatility * 100).toFixed(2),
            beta: stockData.beta?.toFixed(2) || '未知',
            historicalDataSection: this.buildHistoricalDataSection(stockData.historicalData),
            correlationsSection: this.buildCorrelationsSection(stockData.correlations),
            riskLevel: riskLevel,
            riskRequirements: this.getRiskAssessmentRequirements(riskLevel)
        }

        return this.renderTemplate(template.template, params)
    }

    /**
     * 构建市场洞察提示词
     */
    buildMarketInsightsPrompt(
        marketData: {
            indices: Record<string, number>
            sectors: Record<string, number>
            news: string[]
            economicIndicators?: Record<string, number>
        },
        options: PromptBuildOptions = {}
    ): string {
        const template = this.templates.get('market_insights')

        if (!template) {
            throw new Error('未找到市场洞察模板')
        }

        const params: PromptParams = {
            indicesSection: this.buildIndicesSection(marketData.indices),
            sectorsSection: this.buildSectorsPerformanceSection(marketData.sectors),
            newsSection: this.buildMarketNewsSection(marketData.news),
            economicIndicatorsSection: this.buildEconomicIndicatorsSection(marketData.economicIndicators),
            insightsRequirements: this.getMarketInsightsRequirements()
        }

        return this.renderTemplate(template.template, params)
    }

    /**
     * 获取系统提示词
     */
    getSystemPrompt(type: 'analysis' | 'recommendation' | 'insights' | 'risk'): string {
        return this.systemPrompts.get(type) || this.systemPrompts.get('default') || ''
    }

    /**
     * 优化提示词长度
     */
    optimizePromptLength(prompt: string, targetTokens: number): string {
        // 估算token数量（粗略估算：1个token约等于0.75个英文单词或0.5个中文字符）
        const estimatedTokens = this.estimateTokens(prompt)

        if (estimatedTokens <= targetTokens) {
            return prompt
        }

        // 如果超出目标token数，进行优化
        const compressionRatio = targetTokens / estimatedTokens

        // 优化策略：
        // 1. 压缩示例数据
        // 2. 简化描述性文字
        // 3. 保留核心分析要求

        let optimizedPrompt = prompt

        // 压缩价格数据
        optimizedPrompt = this.compressPriceData(optimizedPrompt, compressionRatio)

        // 压缩新闻数据
        optimizedPrompt = this.compressNewsData(optimizedPrompt, compressionRatio)

        // 简化描述
        optimizedPrompt = this.simplifyDescriptions(optimizedPrompt, compressionRatio)

        return optimizedPrompt
    }

    /**
     * 应用提示词风格
     */
    applyStyle(prompt: string, style: 'professional' | 'casual' | 'technical'): string {
        const styleModifiers = {
            professional: '请用专业、正式的语言进行分析，确保术语准确。',
            casual: '请用通俗易懂的语言进行分析，避免过多专业术语。',
            technical: '请进行深入的技术分析，使用专业的金融术语和指标。'
        }

        return prompt + '\n\n' + styleModifiers[style]
    }

    /**
     * 渲染模板
     */
    private renderTemplate(template: string, params: PromptParams): string {
        let rendered = template

        for (const [key, value] of Object.entries(params)) {
            const placeholder = `{{${key}}}`
            rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value || ''))
        }

        // 清理空的占位符
        rendered = rendered.replace(/\{\{[^}]+\}\}/g, '')

        // 清理多余的空行
        rendered = rendered.replace(/\n\s*\n\s*\n/g, '\n\n')

        return rendered.trim()
    }

    /**
     * 初始化模板
     */
    private initializeTemplates(): void {
        // 基础股票分析模板
        this.templates.set('stock_analysis_basic', {
            id: 'stock_analysis_basic',
            name: '基础股票分析',
            description: '基础股票分析提示词模板',
            template: `请分析以下股票：

股票信息：
- 代码：{{symbol}}
- 名称：{{name}}
- 当前价格：{{currentPrice}}元

{{priceDataSection}}

{{volumeDataSection}}

{{technicalIndicatorsSection}}

{{fundamentalDataSection}}

{{newsSection}}

{{userPreferencesSection}}

{{analysisRequirements}}`,
            variables: ['symbol', 'name', 'currentPrice', 'priceDataSection', 'volumeDataSection', 'technicalIndicatorsSection', 'fundamentalDataSection', 'newsSection', 'userPreferencesSection', 'analysisRequirements'],
            category: 'analysis',
            version: '1.0',
            createdAt: new Date(),
            updatedAt: new Date()
        })

        // 详细股票分析模板
        this.templates.set('stock_analysis_detailed', {
            id: 'stock_analysis_detailed',
            name: '详细股票分析',
            description: '详细股票分析提示词模板',
            template: `请对以下股票进行详细分析：

## 股票基本信息
- 股票代码：{{symbol}}
- 股票名称：{{name}}
- 当前价格：{{currentPrice}}元

## 市场数据
{{priceDataSection}}

{{volumeDataSection}}

## 技术分析数据
{{technicalIndicatorsSection}}

## 基本面数据
{{fundamentalDataSection}}

## 市场资讯
{{newsSection}}

## 用户投资偏好
{{userPreferencesSection}}

## 分析要求
{{analysisRequirements}}

请提供结构化的分析报告，包括明确的投资建议和风险提示。`,
            variables: ['symbol', 'name', 'currentPrice', 'priceDataSection', 'volumeDataSection', 'technicalIndicatorsSection', 'fundamentalDataSection', 'newsSection', 'userPreferencesSection', 'analysisRequirements'],
            category: 'analysis',
            version: '1.0',
            createdAt: new Date(),
            updatedAt: new Date()
        })

        // 全面股票分析模板
        this.templates.set('stock_analysis_comprehensive', {
            id: 'stock_analysis_comprehensive',
            name: '全面股票分析',
            description: '全面股票分析提示词模板',
            template: `请对以下股票进行全面深入的投资分析：

# 股票概况
**股票代码：** {{symbol}}
**股票名称：** {{name}}
**当前价格：** {{currentPrice}}元

# 历史价格表现
{{priceDataSection}}

# 成交量分析
{{volumeDataSection}}

# 技术指标分析
{{technicalIndicatorsSection}}

# 基本面分析
{{fundamentalDataSection}}

# 市场动态与新闻
{{newsSection}}

# 投资者偏好设置
{{userPreferencesSection}}

# 分析框架与要求
{{analysisRequirements}}

请提供专业、全面的投资分析报告，包括多维度评估、风险收益分析、具体操作建议等。`,
            variables: ['symbol', 'name', 'currentPrice', 'priceDataSection', 'volumeDataSection', 'technicalIndicatorsSection', 'fundamentalDataSection', 'newsSection', 'userPreferencesSection', 'analysisRequirements'],
            category: 'analysis',
            version: '1.0',
            createdAt: new Date(),
            updatedAt: new Date()
        })

        // 股票推荐模板
        this.templates.set('stock_recommendation', {
            id: 'stock_recommendation',
            name: '股票推荐',
            description: '股票推荐生成提示词模板',
            template: `请根据以下投资标准从股票池中筛选并推荐股票：

## 投资标准
- **风险等级：** {{riskLevel}}
- **预期收益：** {{expectedReturn}}%
- **投资期限：** {{timeHorizon}}天
- **最大推荐数量：** {{maxRecommendations}}只

{{sectorsSection}}

{{marketCapSection}}

## 股票池
{{stockPoolSection}}

{{userProfileSection}}

## 推荐要求
{{recommendationRequirements}}

请按优先级排序，提供详细的推荐理由和操作建议。`,
            variables: ['riskLevel', 'expectedReturn', 'timeHorizon', 'maxRecommendations', 'sectorsSection', 'marketCapSection', 'stockPoolSection', 'userProfileSection', 'recommendationRequirements'],
            category: 'recommendation',
            version: '1.0',
            createdAt: new Date(),
            updatedAt: new Date()
        })

        // 风险评估模板
        this.templates.set('risk_assessment', {
            id: 'risk_assessment',
            name: '风险评估',
            description: '股票风险评估提示词模板',
            template: `请对以下股票进行风险评估：

## 股票信息
- **代码：** {{symbol}}
- **名称：** {{name}}
- **波动率：** {{volatility}}%
- **Beta系数：** {{beta}}

## 历史数据
{{historicalDataSection}}

## 相关性分析
{{correlationsSection}}

## 风险等级设定
目标风险等级：{{riskLevel}}

## 评估要求
{{riskRequirements}}

请提供全面的风险分析和管理建议。`,
            variables: ['symbol', 'name', 'volatility', 'beta', 'historicalDataSection', 'correlationsSection', 'riskLevel', 'riskRequirements'],
            category: 'risk',
            version: '1.0',
            createdAt: new Date(),
            updatedAt: new Date()
        })

        // 市场洞察模板
        this.templates.set('market_insights', {
            id: 'market_insights',
            name: '市场洞察',
            description: '市场洞察分析提示词模板',
            template: `请分析当前市场状况并提供投资洞察：

## 主要指数表现
{{indicesSection}}

## 行业板块表现
{{sectorsSection}}

{{economicIndicatorsSection}}

## 市场新闻与动态
{{newsSection}}

## 分析要求
{{insightsRequirements}}

请提供前瞻性的市场分析和投资建议。`,
            variables: ['indicesSection', 'sectorsSection', 'economicIndicatorsSection', 'newsSection', 'insightsRequirements'],
            category: 'insights',
            version: '1.0',
            createdAt: new Date(),
            updatedAt: new Date()
        })
    }

    /**
     * 初始化系统提示词
     */
    private initializeSystemPrompts(): void {
        this.systemPrompts.set('default', `你是一位专业的股票分析师和投资顾问，具有丰富的市场经验和深厚的金融知识。请基于提供的数据进行客观、专业的分析。`)

        this.systemPrompts.set('analysis', `你是一位专业的股票分析师，具有以下特点：

1. **专业背景**：拥有金融学硕士学位，10年以上A股市场分析经验
2. **分析方法**：精通技术分析、基本面分析和量化分析
3. **投资理念**：坚持价值投资，注重风险控制
4. **分析风格**：客观理性，数据驱动，逻辑清晰

在分析股票时，请：
- 综合考虑技术面、基本面和市场情绪
- 提供具体的数据支撑和逻辑推理
- 明确指出风险和机会
- 给出可操作的投资建议
- 保持客观中立，避免过度乐观或悲观

请用专业但易懂的语言回答，确保普通投资者也能理解。`)

        this.systemPrompts.set('recommendation', `你是一位资深的投资顾问，专门为客户提供个性化的股票投资建议。

你的职责包括：
1. **风险匹配**：根据客户的风险承受能力筛选合适的投资标的
2. **收益预期**：基于市场分析提供合理的收益预期
3. **时间规划**：考虑投资期限制定相应的投资策略
4. **组合构建**：平衡风险和收益，构建多元化投资组合

在生成推荐时，请：
- 严格按照用户设定的风险等级和收益预期筛选
- 考虑投资期限的适配性
- 提供清晰的推荐理由和风险提示
- 给出具体的操作建议（买入价位、止损点等）
- 按优先级排序推荐结果

请确保推荐的合理性和可执行性。`)

        this.systemPrompts.set('insights', `你是一位宏观经济分析师和市场策略专家，专注于：

1. **宏观分析**：深入理解经济周期、政策影响和国际形势
2. **市场研判**：准确把握市场趋势和投资机会
3. **策略制定**：基于市场环境制定投资策略
4. **风险预警**：及时识别和提示市场风险

在分析市场时，请：
- 从宏观和微观角度综合分析
- 识别关键的市场驱动因素
- 评估短期和中长期趋势
- 提供前瞻性的投资建议
- 关注风险管理和机会把握

请提供有价值的市场洞察，帮助投资者做出明智决策。`)

        this.systemPrompts.set('risk', `你是一位专业的风险管理专家，具备：

1. **风险识别**：能够识别各类投资风险
2. **风险量化**：使用专业工具量化风险水平
3. **风险控制**：制定有效的风险管理策略
4. **危机应对**：在市场危机时提供应对方案

在进行风险评估时，请：
- 全面识别系统性和非系统性风险
- 量化风险水平和潜在损失
- 提供具体的风险控制措施
- 制定应急预案和止损策略
- 平衡风险和收益的关系

请确保风险评估的准确性和实用性。`)
    }

    // 以下是各种数据段构建方法的实现

    private buildPriceDataSection(priceData?: number[]): string {
        if (!priceData || priceData.length === 0) {
            return ''
        }

        const recentData = priceData.slice(-10) // 最近10个交易日
        const dataStr = recentData
            .map((price, index) => `第${index + 1}日: ${price.toFixed(2)}元`)
            .join('\n')

        return `价格数据（最近${recentData.length}个交易日）：\n${dataStr}\n`
    }

    private buildVolumeDataSection(volumeData?: number[]): string {
        if (!volumeData || volumeData.length === 0) {
            return ''
        }

        const recentData = volumeData.slice(-10)
        const dataStr = recentData
            .map((volume, index) => `第${index + 1}日: ${(volume / 10000).toFixed(0)}万股`)
            .join('\n')

        return `成交量数据（最近${recentData.length}个交易日）：\n${dataStr}\n`
    }

    private buildTechnicalIndicatorsSection(indicators?: Record<string, any>): string {
        if (!indicators || Object.keys(indicators).length === 0) {
            return ''
        }

        const indicatorStr = Object.entries(indicators)
            .map(([key, value]) => `${key}: ${this.formatIndicatorValue(value)}`)
            .join('\n')

        return `技术指标：\n${indicatorStr}\n`
    }

    private buildFundamentalDataSection(fundamentalData?: Record<string, any>): string {
        if (!fundamentalData || Object.keys(fundamentalData).length === 0) {
            return ''
        }

        const dataStr = Object.entries(fundamentalData)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n')

        return `基本面数据：\n${dataStr}\n`
    }

    private buildNewsSection(newsData?: string[]): string {
        if (!newsData || newsData.length === 0) {
            return ''
        }

        const newsStr = newsData
            .slice(0, 3) // 最多3条新闻
            .map((news, index) => `${index + 1}. ${news}`)
            .join('\n')

        return `相关新闻：\n${newsStr}\n`
    }

    private buildUserPreferencesSection(userPreferences?: {
        riskLevel: 'low' | 'medium' | 'high'
        investmentHorizon: 'short' | 'medium' | 'long'
        focusAreas?: string[]
    }): string {
        if (!userPreferences) {
            return ''
        }

        let section = `用户偏好：\n- 风险等级：${userPreferences.riskLevel}\n- 投资期限：${userPreferences.investmentHorizon}`

        if (userPreferences.focusAreas && userPreferences.focusAreas.length > 0) {
            section += `\n- 关注领域：${userPreferences.focusAreas.join(', ')}`
        }

        return section + '\n'
    }

    private buildSectorsSection(sectors?: string[]): string {
        if (!sectors || sectors.length === 0) {
            return ''
        }

        return `偏好行业：${sectors.join(', ')}\n`
    }

    private buildMarketCapSection(marketCap?: 'small' | 'medium' | 'large'): string {
        if (!marketCap) {
            return ''
        }

        const capMap = {
            small: '小盘股',
            medium: '中盘股',
            large: '大盘股'
        }

        return `市值偏好：${capMap[marketCap]}\n`
    }

    private buildStockPoolSection(
        stockPool: Array<{
            symbol: string
            name: string
            currentPrice: number
            marketData: Record<string, any>
        }>,
        targetTokens?: number
    ): string {
        // 根据目标token数限制股票池大小
        const maxStocks = targetTokens ? Math.min(Math.floor(targetTokens / 50), 20) : 20
        const limitedPool = stockPool.slice(0, maxStocks)

        let section = `股票池（${stockPool.length}只股票，显示前${limitedPool.length}只）：\n`

        limitedPool.forEach((stock, index) => {
            section += `${index + 1}. ${stock.symbol} (${stock.name}) - 当前价格：${stock.currentPrice}元\n`

            if (stock.marketData && Object.keys(stock.marketData).length > 0) {
                const keyData = Object.entries(stock.marketData)
                    .slice(0, 3)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ')
                section += `   关键数据：${keyData}\n`
            }
        })

        return section
    }

    private buildUserProfileSection(userProfile?: {
        investmentExperience: string
        riskTolerance: string
        preferences: Record<string, any>
    }): string {
        if (!userProfile) {
            return ''
        }

        return `用户画像：
- 投资经验：${userProfile.investmentExperience}
- 风险承受能力：${userProfile.riskTolerance}
`
    }

    private buildHistoricalDataSection(historicalData: number[]): string {
        const recentData = historicalData.slice(-20) // 最近20个数据点
        const dataStr = recentData
            .map((value, index) => `${index + 1}: ${value.toFixed(2)}`)
            .join(', ')

        return `历史数据（最近${recentData.length}个数据点）：\n${dataStr}\n`
    }

    private buildCorrelationsSection(correlations?: Record<string, number>): string {
        if (!correlations || Object.keys(correlations).length === 0) {
            return ''
        }

        const corrStr = Object.entries(correlations)
            .map(([asset, corr]) => `与${asset}的相关性: ${corr.toFixed(3)}`)
            .join('\n')

        return `相关性分析：\n${corrStr}\n`
    }

    private buildIndicesSection(indices: Record<string, number>): string {
        const indicesStr = Object.entries(indices)
            .map(([index, change]) => `${index}: ${change > 0 ? '+' : ''}${(change * 100).toFixed(2)}%`)
            .join('\n')

        return indicesStr
    }

    private buildSectorsPerformanceSection(sectors: Record<string, number>): string {
        const sectorsStr = Object.entries(sectors)
            .map(([sector, change]) => `${sector}: ${change > 0 ? '+' : ''}${(change * 100).toFixed(2)}%`)
            .join('\n')

        return sectorsStr
    }

    private buildMarketNewsSection(news: string[]): string {
        return news
            .slice(0, 5)
            .map((item, index) => `${index + 1}. ${item}`)
            .join('\n')
    }

    private buildEconomicIndicatorsSection(indicators?: Record<string, number>): string {
        if (!indicators || Object.keys(indicators).length === 0) {
            return ''
        }

        const indicatorsStr = Object.entries(indicators)
            .map(([indicator, value]) => `${indicator}: ${value}`)
            .join('\n')

        return `经济指标：\n${indicatorsStr}\n`
    }

    private getAnalysisRequirements(analysisType: 'basic' | 'detailed' | 'comprehensive'): string {
        const requirements = {
            basic: `请提供基础分析，包括：
1. 简要技术分析
2. 基本投资建议
3. 风险提示
4. 推荐等级（strong_buy/buy/hold/sell/strong_sell）`,

            detailed: `请提供详细分析，包括：
1. 深入技术分析（趋势、支撑阻力、指标解读）
2. 基本面分析（如有数据）
3. 风险评估
4. 具体买卖建议（目标价、止损价）
5. 推荐等级和理由`,

            comprehensive: `请提供全面分析，包括：
1. 完整技术分析
2. 基本面深度分析
3. 行业和市场环境分析
4. 多时间框架分析
5. 风险收益评估
6. 详细操作建议
7. 推荐等级和完整理由`
        }

        return requirements[analysisType]
    }

    private getRecommendationRequirements(): string {
        return `请选择最符合条件的股票，并为每只推荐股票提供：
1. 推荐等级（strong_buy/buy/hold）
2. 置信度分数（0-100）
3. 预期收益率
4. 风险等级
5. 推荐理由（3-5条）
6. 目标价格
7. 止损价格
8. 建议持有时间

请按推荐优先级排序。`
    }

    private getRiskAssessmentRequirements(riskLevel: string): string {
        return `请基于${riskLevel}风险等级要求，提供：
1. 风险等级评估
2. 主要风险因素识别
3. 风险量化分析
4. 风险控制建议
5. 止损策略
6. 仓位管理建议`
    }

    private getMarketInsightsRequirements(): string {
        return `请提供：
1. 市场整体分析和趋势判断
2. 主要市场趋势（3-5个）
3. 当前主要风险（3-5个）
4. 投资机会（3-5个）
5. 操作建议和策略`
    }

    private formatIndicatorValue(value: any): string {
        if (typeof value === 'number') {
            return value.toFixed(2)
        }
        if (Array.isArray(value)) {
            return value.slice(-3).map(v => v.toFixed(2)).join(', ')
        }
        return String(value)
    }

    private estimateTokens(text: string): number {
        // 粗略估算：中文字符约0.5个token，英文单词约0.75个token
        const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
        const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
        const numbers = (text.match(/\d+/g) || []).length

        return Math.ceil(chineseChars * 0.5 + englishWords * 0.75 + numbers * 0.3)
    }

    private compressPriceData(prompt: string, ratio: number): string {
        // 压缩价格数据，只保留关键数据点
        return prompt.replace(
            /价格数据[^：]*：\n([^\n]+\n)+/g,
            (match) => {
                const lines = match.split('\n').filter(line => line.trim())
                const keepCount = Math.max(1, Math.floor(lines.length * ratio))
                return lines.slice(0, keepCount + 1).join('\n') + '\n'
            }
        )
    }

    private compressNewsData(prompt: string, ratio: number): string {
        // 压缩新闻数据
        return prompt.replace(
            /相关新闻：\n([^\n]+\n)+/g,
            (match) => {
                const lines = match.split('\n').filter(line => line.trim())
                const keepCount = Math.max(1, Math.floor((lines.length - 1) * ratio))
                return lines[0] + '\n' + lines.slice(1, keepCount + 1).join('\n') + '\n'
            }
        )
    }

    private simplifyDescriptions(prompt: string, ratio: number): string {
        // 简化描述性文字
        if (ratio < 0.7) {
            prompt = prompt.replace(/请提供[^。]*。/g, '请分析。')
            prompt = prompt.replace(/包括[^：]*：/g, '包括：')
        }
        return prompt
    }
}

// 导出单例实例
export const promptManager = new PromptManager()

// 导出类型
export type {
    PromptTemplate,
    PromptParams,
    PromptBuildOptions
}