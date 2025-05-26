/**
 * 另类因子引擎
 * 计算情绪、资金流、关联性等另类数据因子
 */

import type { StockData } from '@/types/stock'
import type { FactorResult } from './FeatureEngineManager'

/**
 * 市场情绪数据
 */
interface SentimentData {
  date: string
  newsCount: number
  positiveRatio: number
  negativeRatio: number
  neutralRatio: number
  socialMediaMentions: number
  analystRatings: number
  institutionalActivity: number
}

/**
 * 资金流数据
 */
interface MoneyFlowData {
  date: string
  netInflow: number
  largeOrderRatio: number
  retailFlow: number
  institutionalFlow: number
  foreignFlow: number
}

/**
 * 另类因子引擎
 */
export class AlternativeFactorEngine {
  private sentimentCache: Map<string, SentimentData[]> = new Map()
  private moneyFlowCache: Map<string, MoneyFlowData[]> = new Map()
  private correlationCache: Map<string, number[]> = new Map()

  /**
   * 计算指定的另类因子
   */
  async calculateFactor(
    factorName: string,
    symbol: string,
    stockData: StockData,
    params: Record<string, any> = {}
  ): Promise<FactorResult> {
    switch (factorName) {
      case 'sentiment_score':
        return this.calculateSentimentScore(symbol, stockData, params)
      case 'money_flow':
        return this.calculateMoneyFlow(symbol, stockData, params)
      case 'correlation_factor':
        return this.calculateCorrelationFactor(symbol, stockData, params)
      case 'volatility_regime':
        return this.calculateVolatilityRegime(symbol, stockData, params)
      case 'news_sentiment':
        return this.calculateNewsSentiment(symbol, stockData, params)
      case 'social_sentiment':
        return this.calculateSocialSentiment(symbol, stockData, params)
      case 'analyst_consensus':
        return this.calculateAnalystConsensus(symbol, stockData, params)
      case 'institutional_activity':
        return this.calculateInstitutionalActivity(symbol, stockData, params)
      case 'market_microstructure':
        return this.calculateMarketMicrostructure(symbol, stockData, params)
      case 'liquidity_factor':
        return this.calculateLiquidityFactor(symbol, stockData, params)
      default:
        throw new Error(`未知的另类因子: ${factorName}`)
    }
  }

  /**
   * 综合情绪评分因子
   */
  private async calculateSentimentScore(
    symbol: string,
    stockData: StockData,
    params: any
  ): FactorResult {
    const sentimentData = await this.getSentimentData(symbol)
    
    if (sentimentData.length === 0) {
      return this.createEmptyFactorResult('sentiment_score', '无情绪数据', stockData.dates)
    }

    const values = stockData.dates.map(date => {
      const sentiment = sentimentData.find(s => s.date === date)
      if (!sentiment) return 0
      
      // 综合情绪评分
      const newsScore = (sentiment.positiveRatio - sentiment.negativeRatio) * 
                       Math.log(1 + sentiment.newsCount)
      const socialScore = Math.tanh(sentiment.socialMediaMentions / 1000) * 
                         (sentiment.positiveRatio - sentiment.negativeRatio)
      const analystScore = (sentiment.analystRatings - 3) / 2 // 标准化到[-1,1]
      
      return (newsScore + socialScore + analystScore) / 3
    })
    
    return {
      factorName: 'sentiment_score',
      factorType: 'alternative',
      values,
      dates: stockData.dates,
      metadata: {
        description: '综合市场情绪评分',
        category: '情绪指标',
        unit: '评分',
        range: [-1, 1],
        lastUpdated: new Date().toISOString(),
        dataSource: 'sentiment_analysis'
      }
    }
  }

  /**
   * 资金流因子
   */
  private async calculateMoneyFlow(
    symbol: string,
    stockData: StockData,
    params: any
  ): FactorResult {
    const period = params.period || 20
    const moneyFlowData = await this.getMoneyFlowData(symbol)
    
    if (moneyFlowData.length === 0) {
      return this.createEmptyFactorResult('money_flow', '无资金流数据', stockData.dates)
    }

    const values: number[] = []
    
    for (let i = 0; i < stockData.dates.length; i++) {
      if (i < period - 1) {
        values.push(NaN)
        continue
      }
      
      // 计算过去period天的资金流净额
      let totalNetFlow = 0
      let validDays = 0
      
      for (let j = i - period + 1; j <= i; j++) {
        const date = stockData.dates[j]
        const flow = moneyFlowData.find(f => f.date === date)
        if (flow) {
          totalNetFlow += flow.netInflow
          validDays++
        }
      }
      
      const avgNetFlow = validDays > 0 ? totalNetFlow / validDays : 0
      
      // 标准化资金流
      const currentPrice = stockData.prices[i]
      const normalizedFlow = avgNetFlow / (currentPrice * 1000000) // 假设以百万为单位
      
      values.push(normalizedFlow)
    }
    
    return {
      factorName: 'money_flow',
      factorType: 'alternative',
      values,
      dates: stockData.dates,
      metadata: {
        description: '资金流净额指标',
        category: '资金流向',
        unit: '标准化流量',
        lastUpdated: new Date().toISOString(),
        dataSource: 'money_flow_data'
      }
    }
  }

  /**
   * 关联性因子
   */
  private async calculateCorrelationFactor(
    symbol: string,
    stockData: StockData,
    params: any
  ): FactorResult {
    const period = params.period || 60
    const benchmarkSymbol = params.benchmark || '000001' // 上证指数
    
    // 获取基准数据（这里使用模拟数据）
    const benchmarkData = this.generateMockBenchmarkData(stockData.dates)
    
    const values: number[] = []
    
    for (let i = 0; i < stockData.dates.length; i++) {
      if (i < period - 1) {
        values.push(NaN)
        continue
      }
      
      // 计算与基准的滚动相关性
      const stockReturns = []
      const benchmarkReturns = []
      
      for (let j = i - period + 1; j <= i; j++) {
        if (j > 0) {
          const stockReturn = (stockData.prices[j] - stockData.prices[j - 1]) / stockData.prices[j - 1]
          const benchmarkReturn = (benchmarkData[j] - benchmarkData[j - 1]) / benchmarkData[j - 1]
          
          stockReturns.push(stockReturn)
          benchmarkReturns.push(benchmarkReturn)
        }
      }
      
      const correlation = this.calculateCorrelation(stockReturns, benchmarkReturns)
      values.push(correlation)
    }
    
    return {
      factorName: 'correlation_factor',
      factorType: 'alternative',
      values,
      dates: stockData.dates,
      metadata: {
        description: '与市场基准的滚动相关性',
        category: '关联性指标',
        unit: '相关系数',
        range: [-1, 1],
        lastUpdated: new Date().toISOString(),
        dataSource: 'correlation_analysis'
      }
    }
  }

  /**
   * 波动率状态因子
   */
  private calculateVolatilityRegime(
    symbol: string,
    stockData: StockData,
    params: any
  ): FactorResult {
    const shortPeriod = params.shortPeriod || 10
    const longPeriod = params.longPeriod || 60
    
    // 计算短期和长期波动率
    const shortVolatility = this.calculateRollingVolatility(stockData.prices, shortPeriod)
    const longVolatility = this.calculateRollingVolatility(stockData.prices, longPeriod)
    
    const values = shortVolatility.map((shortVol, i) => {
      const longVol = longVolatility[i]
      if (isNaN(shortVol) || isNaN(longVol) || longVol === 0) return NaN
      
      // 波动率状态：短期波动率相对长期波动率的比值
      return (shortVol - longVol) / longVol
    })
    
    return {
      factorName: 'volatility_regime',
      factorType: 'alternative',
      values,
      dates: stockData.dates,
      metadata: {
        description: '波动率状态指标',
        category: '波动性状态',
        unit: '相对波动率',
        lastUpdated: new Date().toISOString(),
        dataSource: 'volatility_analysis'
      }
    }
  }

  /**
   * 新闻情绪因子
   */
  private async calculateNewsSentiment(
    symbol: string,
    stockData: StockData,
    params: any
  ): FactorResult {
    const sentimentData = await this.getSentimentData(symbol)
    
    const values = stockData.dates.map(date => {
      const sentiment = sentimentData.find(s => s.date === date)
      if (!sentiment) return 0
      
      // 新闻情绪评分
      const newsWeight = Math.log(1 + sentiment.newsCount) / 10
      const sentimentScore = sentiment.positiveRatio - sentiment.negativeRatio
      
      return sentimentScore * newsWeight
    })
    
    return {
      factorName: 'news_sentiment',
      factorType: 'alternative',
      values,
      dates: stockData.dates,
      metadata: {
        description: '新闻情绪指标',
        category: '情绪指标',
        unit: '情绪评分',
        range: [-1, 1],
        lastUpdated: new Date().toISOString(),
        dataSource: 'news_sentiment'
      }
    }
  }

  /**
   * 社交媒体情绪因子
   */
  private async calculateSocialSentiment(
    symbol: string,
    stockData: StockData,
    params: any
  ): FactorResult {
    const sentimentData = await this.getSentimentData(symbol)
    
    const values = stockData.dates.map(date => {
      const sentiment = sentimentData.find(s => s.date === date)
      if (!sentiment) return 0
      
      // 社交媒体情绪评分
      const socialWeight = Math.tanh(sentiment.socialMediaMentions / 1000)
      const sentimentScore = sentiment.positiveRatio - sentiment.negativeRatio
      
      return sentimentScore * socialWeight
    })
    
    return {
      factorName: 'social_sentiment',
      factorType: 'alternative',
      values,
      dates: stockData.dates,
      metadata: {
        description: '社交媒体情绪指标',
        category: '情绪指标',
        unit: '情绪评分',
        range: [-1, 1],
        lastUpdated: new Date().toISOString(),
        dataSource: 'social_media'
      }
    }
  }

  /**
   * 分析师一致性因子
   */
  private async calculateAnalystConsensus(
    symbol: string,
    stockData: StockData,
    params: any
  ): FactorResult {
    const sentimentData = await this.getSentimentData(symbol)
    
    const values = stockData.dates.map(date => {
      const sentiment = sentimentData.find(s => s.date === date)
      if (!sentiment) return 0
      
      // 分析师评级标准化
      return (sentiment.analystRatings - 3) / 2 // 1-5评级标准化到[-1,1]
    })
    
    return {
      factorName: 'analyst_consensus',
      factorType: 'alternative',
      values,
      dates: stockData.dates,
      metadata: {
        description: '分析师一致性评级',
        category: '专业观点',
        unit: '标准化评级',
        range: [-1, 1],
        lastUpdated: new Date().toISOString(),
        dataSource: 'analyst_ratings'
      }
    }
  }

  /**
   * 机构活动因子
   */
  private async calculateInstitutionalActivity(
    symbol: string,
    stockData: StockData,
    params: any
  ): FactorResult {
    const sentimentData = await this.getSentimentData(symbol)
    
    const values = stockData.dates.map(date => {
      const sentiment = sentimentData.find(s => s.date === date)
      if (!sentiment) return 0
      
      // 机构活动度标准化
      return Math.tanh(sentiment.institutionalActivity / 100)
    })
    
    return {
      factorName: 'institutional_activity',
      factorType: 'alternative',
      values,
      dates: stockData.dates,
      metadata: {
        description: '机构投资者活动度',
        category: '机构行为',
        unit: '活动度评分',
        range: [-1, 1],
        lastUpdated: new Date().toISOString(),
        dataSource: 'institutional_data'
      }
    }
  }

  /**
   * 市场微观结构因子
   */
  private calculateMarketMicrostructure(
    symbol: string,
    stockData: StockData,
    params: any
  ): FactorResult {
    const period = params.period || 20
    
    if (!stockData.volumes || stockData.volumes.length === 0) {
      return this.createEmptyFactorResult('market_microstructure', '无成交量数据', stockData.dates)
    }

    const values: number[] = []
    
    for (let i = 0; i < stockData.dates.length; i++) {
      if (i < period - 1) {
        values.push(NaN)
        continue
      }
      
      // 计算价格冲击成本（简化版）
      const priceChanges = []
      const volumeRatios = []
      
      for (let j = i - period + 1; j <= i; j++) {
        if (j > 0) {
          const priceChange = Math.abs((stockData.prices[j] - stockData.prices[j - 1]) / stockData.prices[j - 1])
          const volumeRatio = stockData.volumes![j] / stockData.volumes![j - 1]
          
          priceChanges.push(priceChange)
          volumeRatios.push(volumeRatio)
        }
      }
      
      // 市场冲击系数
      const avgPriceChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length
      const avgVolumeRatio = volumeRatios.reduce((sum, ratio) => sum + ratio, 0) / volumeRatios.length
      
      const microstructure = avgVolumeRatio > 0 ? avgPriceChange / avgVolumeRatio : 0
      values.push(microstructure)
    }
    
    return {
      factorName: 'market_microstructure',
      factorType: 'alternative',
      values,
      dates: stockData.dates,
      metadata: {
        description: '市场微观结构指标',
        category: '市场结构',
        unit: '冲击成本',
        lastUpdated: new Date().toISOString(),
        dataSource: 'microstructure_analysis'
      }
    }
  }

  /**
   * 流动性因子
   */
  private calculateLiquidityFactor(
    symbol: string,
    stockData: StockData,
    params: any
  ): FactorResult {
    const period = params.period || 20
    
    if (!stockData.volumes || stockData.volumes.length === 0) {
      return this.createEmptyFactorResult('liquidity_factor', '无成交量数据', stockData.dates)
    }

    const values: number[] = []
    
    for (let i = 0; i < stockData.dates.length; i++) {
      if (i < period - 1) {
        values.push(NaN)
        continue
      }
      
      // 计算流动性指标（成交量加权平均价格偏差）
      let totalVolume = 0
      let weightedPriceSum = 0
      
      for (let j = i - period + 1; j <= i; j++) {
        const volume = stockData.volumes![j]
        const price = stockData.prices[j]
        
        totalVolume += volume
        weightedPriceSum += price * volume
      }
      
      const vwap = totalVolume > 0 ? weightedPriceSum / totalVolume : stockData.prices[i]
      const currentPrice = stockData.prices[i]
      
      // 流动性指标：价格偏离VWAP的程度
      const liquidity = Math.abs(currentPrice - vwap) / vwap
      values.push(-liquidity) // 负值表示流动性好
    }
    
    return {
      factorName: 'liquidity_factor',
      factorType: 'alternative',
      values,
      dates: stockData.dates,
      metadata: {
        description: '流动性指标',
        category: '流动性',
        unit: '流动性评分',
        lastUpdated: new Date().toISOString(),
        dataSource: 'liquidity_analysis'
      }
    }
  }

  /**
   * 获取情绪数据
   */
  private async getSentimentData(symbol: string): Promise<SentimentData[]> {
    if (this.sentimentCache.has(symbol)) {
      return this.sentimentCache.get(symbol)!
    }

    // 生成模拟情绪数据
    const data = this.generateMockSentimentData(symbol)
    this.sentimentCache.set(symbol, data)
    
    return data
  }

  /**
   * 获取资金流数据
   */
  private async getMoneyFlowData(symbol: string): Promise<MoneyFlowData[]> {
    if (this.moneyFlowCache.has(symbol)) {
      return this.moneyFlowCache.get(symbol)!
    }

    // 生成模拟资金流数据
    const data = this.generateMockMoneyFlowData(symbol)
    this.moneyFlowCache.set(symbol, data)
    
    return data
  }

  /**
   * 生成模拟情绪数据
   */
  private generateMockSentimentData(symbol: string): SentimentData[] {
    const data: SentimentData[] = []
    const startDate = new Date('2023-01-01')
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      
      const positiveRatio = 0.3 + Math.random() * 0.4
      const negativeRatio = 0.1 + Math.random() * 0.3
      const neutralRatio = 1 - positiveRatio - negativeRatio
      
      data.push({
        date: date.toISOString().split('T')[0],
        newsCount: Math.floor(Math.random() * 20),
        positiveRatio,
        negativeRatio,
        neutralRatio,
        socialMediaMentions: Math.floor(Math.random() * 1000),
        analystRatings: 2 + Math.random() * 3, // 2-5评级
        institutionalActivity: Math.random() * 100
      })
    }
    
    return data
  }

  /**
   * 生成模拟资金流数据
   */
  private generateMockMoneyFlowData(symbol: string): MoneyFlowData[] {
    const data: MoneyFlowData[] = []
    const startDate = new Date('2023-01-01')
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      
      data.push({
        date: date.toISOString().split('T')[0],
        netInflow: (Math.random() - 0.5) * 10000000, // -5M到5M
        largeOrderRatio: 0.2 + Math.random() * 0.6,
        retailFlow: (Math.random() - 0.5) * 5000000,
        institutionalFlow: (Math.random() - 0.5) * 8000000,
        foreignFlow: (Math.random() - 0.5) * 2000000
      })
    }
    
    return data
  }

  /**
   * 生成模拟基准数据
   */
  private generateMockBenchmarkData(dates: string[]): number[] {
    const data: number[] = []
    let price = 3000 // 起始价格
    
    for (let i = 0; i < dates.length; i++) {
      const change = (Math.random() - 0.5) * 0.02 // ±1%的随机变化
      price *= (1 + change)
      data.push(price)
    }
    
    return data
  }

  /**
   * 计算滚动波动率
   */
  private calculateRollingVolatility(prices: number[], period: number): number[] {
    const values: number[] = []
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        values.push(NaN)
        continue
      }
      
      const returns = []
      for (let j = i - period + 1; j <= i; j++) {
        if (j > 0) {
          const ret = Math.log(prices[j] / prices[j - 1])
          returns.push(ret)
        }
      }
      
      if (returns.length === 0) {
        values.push(NaN)
        continue
      }
      
      const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
      const volatility = Math.sqrt(variance * 252) // 年化波动率
      
      values.push(volatility)
    }
    
    return values
  }

  /**
   * 计算相关系数
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0
    
    const n = x.length
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0)
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0)
    
    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
    
    return denominator === 0 ? 0 : numerator / denominator
  }

  /**
   * 创建空的因子结果
   */
  private createEmptyFactorResult(factorName: string, reason: string, dates: string[]): FactorResult {
    return {
      factorName,
      factorType: 'alternative',
      values: dates.map(() => NaN),
      dates,
      metadata: {
        description: `${factorName} - ${reason}`,
        category: '另类数据',
        lastUpdated: new Date().toISOString(),
        dataSource: 'alternative_data'
      }
    }
  }
}

export default AlternativeFactorEngine
