/**
 * 择时策略
 * 基于技术指标和市场状态的择时交易策略
 */

import type { StockData } from '@/types/stock'
import type { FeatureMatrix } from '@/services/featureEngineering/FeatureEngineManager'
import { BaseStrategy, type StrategyContext, type StrategyExecutionResult, type StrategySignal } from './BaseStrategy'

/**
 * 择时信号类型
 */
export type TimingSignalType = 
  | 'trend_following'    // 趋势跟踪
  | 'mean_reversion'     // 均值回归
  | 'momentum'           // 动量
  | 'breakout'           // 突破
  | 'pattern'            // 形态
  | 'volume'             // 成交量

/**
 * 市场状态
 */
export type MarketRegime = 
  | 'bull'      // 牛市
  | 'bear'      // 熊市
  | 'sideways'  // 震荡
  | 'volatile'  // 高波动
  | 'unknown'   // 未知

/**
 * 择时策略参数
 */
export interface TimingStrategyParams {
  signalTypes: TimingSignalType[]
  lookbackPeriod: number
  signalThreshold: number
  confirmationPeriod: number
  maxHoldingPeriod: number
  stopLoss: number
  takeProfit: number
  positionSizing: 'fixed' | 'volatility' | 'kelly'
  riskPerTrade: number
  marketRegimeFilter: boolean
  indicators: {
    ma: { fast: number, slow: number }
    rsi: { period: number, overbought: number, oversold: number }
    macd: { fast: number, slow: number, signal: number }
    bollinger: { period: number, multiplier: number }
    atr: { period: number }
  }
}

/**
 * 择时信号
 */
export interface TimingSignal {
  type: TimingSignalType
  direction: 'long' | 'short' | 'neutral'
  strength: number
  confidence: number
  timestamp: string
  indicators: Record<string, number>
  description: string
}

/**
 * 市场状态分析
 */
export interface MarketRegimeAnalysis {
  regime: MarketRegime
  confidence: number
  trend: number // -1 to 1
  volatility: number
  momentum: number
  support: number
  resistance: number
  timestamp: string
}

/**
 * 择时策略实现
 */
export class TimingStrategy extends BaseStrategy {
  private params: TimingStrategyParams
  private currentRegime: MarketRegimeAnalysis | null = null
  private signals: TimingSignal[] = []
  private indicators: Map<string, number[]> = new Map()

  constructor(config: any) {
    super(config)
    this.params = this.getDefaultParams()
    
    // 合并用户配置
    if (config.parameters) {
      this.params = { ...this.params, ...config.parameters }
    }
  }

  /**
   * 执行择时策略
   */
  async execute(
    marketData: Map<string, StockData>,
    featureMatrix?: Map<string, FeatureMatrix>
  ): Promise<StrategyExecutionResult> {
    console.log(`执行择时策略: ${this.config.name}`)

    // 创建策略上下文
    const context: StrategyContext = {
      currentDate: new Date().toISOString().split('T')[0],
      marketData,
      featureMatrix,
      positions: new Map(),
      cash: 1000000,
      totalValue: 1000000,
      benchmark: marketData.values().next().value
    }

    // 分析市场状态
    await this.analyzeMarketRegime(context.benchmark)

    // 计算技术指标
    await this.calculateIndicators(context.benchmark)

    // 生成交易信号
    const signals = await this.generateSignals(context)

    // 应用风险控制
    const filteredSignals = this.applyRiskControl(signals, context.positions, context.totalValue)

    // 更新持仓
    const positions = this.updatePositions(context.positions, filteredSignals, marketData)

    // 计算置信度
    const confidence = this.calculateConfidence(filteredSignals, marketData)

    // 保存执行结果
    const result: StrategyExecutionResult = {
      signals: filteredSignals,
      positions,
      cash: context.cash,
      totalValue: context.totalValue,
      confidence,
      metadata: {
        marketRegime: this.currentRegime,
        timingSignals: this.signals,
        indicators: Object.fromEntries(this.indicators)
      }
    }

    this.executionHistory.push(result)
    return result
  }

  /**
   * 生成交易信号
   */
  async generateSignals(context: StrategyContext): Promise<StrategySignal[]> {
    const signals: StrategySignal[] = []

    // 如果启用了市场状态过滤，检查当前市场状态
    if (this.params.marketRegimeFilter && this.currentRegime) {
      if (this.currentRegime.regime === 'bear' && this.currentRegime.confidence > 0.7) {
        console.log('熊市状态，暂停交易')
        return signals
      }
    }

    // 为每个股票生成择时信号
    context.marketData.forEach((stockData, symbol) => {
      const timingSignals = this.generateTimingSignals(stockData)
      
      // 综合择时信号
      const combinedSignal = this.combineTimingSignals(timingSignals)
      
      if (combinedSignal && Math.abs(combinedSignal.strength) > this.params.signalThreshold) {
        const currentPrice = stockData.prices[stockData.prices.length - 1]
        const positionSize = this.calculatePositionSize(stockData, context.totalValue)
        const quantity = Math.floor(positionSize / currentPrice)

        if (quantity > 0) {
          const action = combinedSignal.direction === 'long' ? 'buy' : 
                        combinedSignal.direction === 'short' ? 'sell' : 'hold'

          signals.push({
            symbol,
            action,
            strength: Math.abs(combinedSignal.strength),
            confidence: combinedSignal.confidence,
            price: currentPrice,
            quantity,
            reason: `择时信号: ${combinedSignal.description}`,
            timestamp: new Date().toISOString()
          })
        }
      }
    })

    return signals
  }

  /**
   * 生成择时信号
   */
  private generateTimingSignals(stockData: StockData): TimingSignal[] {
    const signals: TimingSignal[] = []
    const prices = stockData.prices
    const volumes = stockData.volumes || []

    if (prices.length < this.params.lookbackPeriod) {
      return signals
    }

    // 趋势跟踪信号
    if (this.params.signalTypes.includes('trend_following')) {
      const trendSignal = this.generateTrendFollowingSignal(prices)
      if (trendSignal) signals.push(trendSignal)
    }

    // 均值回归信号
    if (this.params.signalTypes.includes('mean_reversion')) {
      const meanReversionSignal = this.generateMeanReversionSignal(prices)
      if (meanReversionSignal) signals.push(meanReversionSignal)
    }

    // 动量信号
    if (this.params.signalTypes.includes('momentum')) {
      const momentumSignal = this.generateMomentumSignal(prices)
      if (momentumSignal) signals.push(momentumSignal)
    }

    // 突破信号
    if (this.params.signalTypes.includes('breakout')) {
      const breakoutSignal = this.generateBreakoutSignal(prices, volumes)
      if (breakoutSignal) signals.push(breakoutSignal)
    }

    return signals
  }

  /**
   * 生成趋势跟踪信号
   */
  private generateTrendFollowingSignal(prices: number[]): TimingSignal | null {
    const { fast, slow } = this.params.indicators.ma
    
    if (prices.length < slow) return null

    const fastMA = this.calculateSMA(prices, fast)
    const slowMA = this.calculateSMA(prices, slow)
    
    const currentFast = fastMA[fastMA.length - 1]
    const currentSlow = slowMA[slowMA.length - 1]
    const prevFast = fastMA[fastMA.length - 2]
    const prevSlow = slowMA[slowMA.length - 2]

    // 金叉死叉判断
    let direction: 'long' | 'short' | 'neutral' = 'neutral'
    let strength = 0
    let description = ''

    if (currentFast > currentSlow && prevFast <= prevSlow) {
      direction = 'long'
      strength = Math.min((currentFast - currentSlow) / currentSlow, 0.1) * 10
      description = '均线金叉'
    } else if (currentFast < currentSlow && prevFast >= prevSlow) {
      direction = 'short'
      strength = Math.min((currentSlow - currentFast) / currentSlow, 0.1) * 10
      description = '均线死叉'
    }

    if (direction === 'neutral') return null

    return {
      type: 'trend_following',
      direction,
      strength,
      confidence: 0.7,
      timestamp: new Date().toISOString(),
      indicators: { fastMA: currentFast, slowMA: currentSlow },
      description
    }
  }

  /**
   * 生成均值回归信号
   */
  private generateMeanReversionSignal(prices: number[]): TimingSignal | null {
    const { period, multiplier } = this.params.indicators.bollinger
    
    if (prices.length < period) return null

    const sma = this.calculateSMA(prices, period)
    const std = this.calculateStandardDeviation(prices, period)
    
    const currentPrice = prices[prices.length - 1]
    const currentSMA = sma[sma.length - 1]
    const currentStd = std[std.length - 1]
    
    const upperBand = currentSMA + multiplier * currentStd
    const lowerBand = currentSMA - multiplier * currentStd
    
    let direction: 'long' | 'short' | 'neutral' = 'neutral'
    let strength = 0
    let description = ''

    if (currentPrice < lowerBand) {
      direction = 'long'
      strength = Math.min((lowerBand - currentPrice) / currentPrice, 0.05) * 20
      description = '价格超卖，均值回归买入'
    } else if (currentPrice > upperBand) {
      direction = 'short'
      strength = Math.min((currentPrice - upperBand) / currentPrice, 0.05) * 20
      description = '价格超买，均值回归卖出'
    }

    if (direction === 'neutral') return null

    return {
      type: 'mean_reversion',
      direction,
      strength,
      confidence: 0.6,
      timestamp: new Date().toISOString(),
      indicators: { price: currentPrice, upperBand, lowerBand, sma: currentSMA },
      description
    }
  }

  /**
   * 生成动量信号
   */
  private generateMomentumSignal(prices: number[]): TimingSignal | null {
    const { period, overbought, oversold } = this.params.indicators.rsi
    
    if (prices.length < period + 1) return null

    const rsi = this.calculateRSI(prices, period)
    const currentRSI = rsi[rsi.length - 1]
    const prevRSI = rsi[rsi.length - 2]

    let direction: 'long' | 'short' | 'neutral' = 'neutral'
    let strength = 0
    let description = ''

    if (currentRSI < oversold && prevRSI >= oversold) {
      direction = 'long'
      strength = (oversold - currentRSI) / oversold
      description = 'RSI超卖反弹'
    } else if (currentRSI > overbought && prevRSI <= overbought) {
      direction = 'short'
      strength = (currentRSI - overbought) / (100 - overbought)
      description = 'RSI超买回调'
    }

    if (direction === 'neutral') return null

    return {
      type: 'momentum',
      direction,
      strength,
      confidence: 0.8,
      timestamp: new Date().toISOString(),
      indicators: { rsi: currentRSI },
      description
    }
  }

  /**
   * 生成突破信号
   */
  private generateBreakoutSignal(prices: number[], volumes: number[]): TimingSignal | null {
    if (prices.length < this.params.lookbackPeriod) return null

    const recentPrices = prices.slice(-this.params.lookbackPeriod)
    const currentPrice = prices[prices.length - 1]
    
    const high = Math.max(...recentPrices)
    const low = Math.min(...recentPrices)
    const range = high - low

    let direction: 'long' | 'short' | 'neutral' = 'neutral'
    let strength = 0
    let description = ''

    // 向上突破
    if (currentPrice > high * 1.01) {
      direction = 'long'
      strength = Math.min((currentPrice - high) / range, 0.1) * 10
      description = '向上突破阻力位'
    }
    // 向下突破
    else if (currentPrice < low * 0.99) {
      direction = 'short'
      strength = Math.min((low - currentPrice) / range, 0.1) * 10
      description = '向下突破支撑位'
    }

    // 成交量确认
    if (direction !== 'neutral' && volumes.length > 0) {
      const avgVolume = volumes.slice(-10).reduce((sum, v) => sum + v, 0) / 10
      const currentVolume = volumes[volumes.length - 1]
      
      if (currentVolume > avgVolume * 1.5) {
        strength *= 1.5
        description += '（成交量放大确认）'
      }
    }

    if (direction === 'neutral') return null

    return {
      type: 'breakout',
      direction,
      strength,
      confidence: 0.75,
      timestamp: new Date().toISOString(),
      indicators: { high, low, currentPrice },
      description
    }
  }

  /**
   * 综合择时信号
   */
  private combineTimingSignals(signals: TimingSignal[]): TimingSignal | null {
    if (signals.length === 0) return null

    // 计算加权平均
    let totalWeight = 0
    let weightedStrength = 0
    let avgConfidence = 0
    const directions: Record<string, number> = { long: 0, short: 0, neutral: 0 }

    signals.forEach(signal => {
      const weight = signal.confidence
      totalWeight += weight
      weightedStrength += signal.strength * weight * (signal.direction === 'short' ? -1 : 1)
      avgConfidence += signal.confidence
      directions[signal.direction] += weight
    })

    if (totalWeight === 0) return null

    const finalStrength = weightedStrength / totalWeight
    const finalConfidence = avgConfidence / signals.length

    // 确定最终方向
    let finalDirection: 'long' | 'short' | 'neutral' = 'neutral'
    if (directions.long > directions.short && directions.long > directions.neutral) {
      finalDirection = 'long'
    } else if (directions.short > directions.long && directions.short > directions.neutral) {
      finalDirection = 'short'
    }

    const descriptions = signals.map(s => s.description).join(', ')

    return {
      type: 'pattern',
      direction: finalDirection,
      strength: Math.abs(finalStrength),
      confidence: finalConfidence,
      timestamp: new Date().toISOString(),
      indicators: {},
      description: `综合信号: ${descriptions}`
    }
  }

  /**
   * 分析市场状态
   */
  private async analyzeMarketRegime(benchmarkData: StockData): Promise<void> {
    const prices = benchmarkData.prices
    if (prices.length < 60) return

    // 计算趋势
    const shortMA = this.calculateSMA(prices, 20)
    const longMA = this.calculateSMA(prices, 60)
    const trend = (shortMA[shortMA.length - 1] - longMA[longMA.length - 1]) / longMA[longMA.length - 1]

    // 计算波动率
    const returns = prices.slice(1).map((price, i) => Math.log(price / prices[i]))
    const volatility = this.calculateStandardDeviation(returns, 20)[returns.length - 1]

    // 计算动量
    const momentum = (prices[prices.length - 1] - prices[prices.length - 21]) / prices[prices.length - 21]

    // 确定市场状态
    let regime: MarketRegime = 'unknown'
    let confidence = 0

    if (trend > 0.02 && momentum > 0.05) {
      regime = 'bull'
      confidence = Math.min(trend * 10, 1)
    } else if (trend < -0.02 && momentum < -0.05) {
      regime = 'bear'
      confidence = Math.min(Math.abs(trend) * 10, 1)
    } else if (volatility > 0.02) {
      regime = 'volatile'
      confidence = Math.min(volatility * 20, 1)
    } else {
      regime = 'sideways'
      confidence = 0.6
    }

    this.currentRegime = {
      regime,
      confidence,
      trend,
      volatility,
      momentum,
      support: Math.min(...prices.slice(-20)),
      resistance: Math.max(...prices.slice(-20)),
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 计算技术指标
   */
  private async calculateIndicators(stockData: StockData): Promise<void> {
    const prices = stockData.prices
    
    // 移动平均线
    this.indicators.set('sma_20', this.calculateSMA(prices, 20))
    this.indicators.set('sma_60', this.calculateSMA(prices, 60))
    
    // RSI
    this.indicators.set('rsi', this.calculateRSI(prices, 14))
    
    // MACD
    const macd = this.calculateMACD(prices, 12, 26, 9)
    this.indicators.set('macd', macd.macd)
    this.indicators.set('macd_signal', macd.signal)
    this.indicators.set('macd_histogram', macd.histogram)
  }

  /**
   * 计算仓位大小
   */
  private calculatePositionSize(stockData: StockData, totalValue: number): number {
    switch (this.params.positionSizing) {
      case 'fixed':
        return totalValue * this.params.riskPerTrade

      case 'volatility':
        const volatility = this.calculateVolatility(stockData.prices, 20)
        const adjustedRisk = this.params.riskPerTrade / Math.max(volatility, 0.01)
        return totalValue * Math.min(adjustedRisk, 0.2)

      case 'kelly':
        // 简化的凯利公式
        const winRate = 0.6 // 假设胜率
        const avgWin = 0.05 // 假设平均盈利
        const avgLoss = 0.03 // 假设平均亏损
        const kelly = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin
        return totalValue * Math.max(0, Math.min(kelly, 0.25))

      default:
        return totalValue * this.params.riskPerTrade
    }
  }

  /**
   * 计算波动率
   */
  private calculateVolatility(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0

    const returns = prices.slice(1).map((price, i) => Math.log(price / prices[i]))
    const recentReturns = returns.slice(-period)
    
    const mean = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length
    const variance = recentReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / recentReturns.length
    
    return Math.sqrt(variance * 252) // 年化波动率
  }

  // 技术指标计算方法
  private calculateSMA(prices: number[], period: number): number[] {
    const sma: number[] = []
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      sma.push(sum / period)
    }
    return sma
  }

  private calculateRSI(prices: number[], period: number): number[] {
    const rsi: number[] = []
    const gains: number[] = []
    const losses: number[] = []

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? -change : 0)
    }

    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
      
      if (avgLoss === 0) {
        rsi.push(100)
      } else {
        const rs = avgGain / avgLoss
        rsi.push(100 - (100 / (1 + rs)))
      }
    }

    return rsi
  }

  private calculateMACD(prices: number[], fast: number, slow: number, signal: number): {
    macd: number[], signal: number[], histogram: number[]
  } {
    const emaFast = this.calculateEMA(prices, fast)
    const emaSlow = this.calculateEMA(prices, slow)
    
    const macd = emaFast.map((fast, i) => fast - emaSlow[i])
    const signalLine = this.calculateEMA(macd, signal)
    const histogram = macd.map((macd, i) => macd - signalLine[i])

    return { macd, signal: signalLine, histogram }
  }

  private calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = []
    const multiplier = 2 / (period + 1)
    
    ema[0] = prices[0]
    for (let i = 1; i < prices.length; i++) {
      ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1]
    }
    
    return ema
  }

  private calculateStandardDeviation(values: number[], period: number): number[] {
    const std: number[] = []
    
    for (let i = period - 1; i < values.length; i++) {
      const slice = values.slice(i - period + 1, i + 1)
      const mean = slice.reduce((sum, val) => sum + val, 0) / slice.length
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / slice.length
      std.push(Math.sqrt(variance))
    }
    
    return std
  }

  /**
   * 获取默认参数
   */
  private getDefaultParams(): TimingStrategyParams {
    return {
      signalTypes: ['trend_following', 'momentum', 'breakout'],
      lookbackPeriod: 20,
      signalThreshold: 0.3,
      confirmationPeriod: 2,
      maxHoldingPeriod: 30,
      stopLoss: 0.05,
      takeProfit: 0.15,
      positionSizing: 'volatility',
      riskPerTrade: 0.02,
      marketRegimeFilter: true,
      indicators: {
        ma: { fast: 10, slow: 30 },
        rsi: { period: 14, overbought: 70, oversold: 30 },
        macd: { fast: 12, slow: 26, signal: 9 },
        bollinger: { period: 20, multiplier: 2 },
        atr: { period: 14 }
      }
    }
  }

  /**
   * 获取当前市场状态
   */
  getCurrentMarketRegime(): MarketRegimeAnalysis | null {
    return this.currentRegime
  }

  /**
   * 获取择时信号历史
   */
  getTimingSignals(): TimingSignal[] {
    return this.signals
  }

  /**
   * 获取技术指标
   */
  getIndicators(): Map<string, number[]> {
    return this.indicators
  }
}

export default TimingStrategy
