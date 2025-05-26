/**
 * 因子策略
 * 基于因子分析的量化选股策略
 */

import type { StockData } from '@/types/stock'
import type { FeatureMatrix } from '@/services/featureEngineering/FeatureEngineManager'
import { BaseStrategy, type StrategyContext, type StrategyExecutionResult, type StrategySignal } from './BaseStrategy'

/**
 * 因子权重配置
 */
export interface FactorWeight {
  factorName: string
  weight: number
  direction: 'positive' | 'negative' // 因子方向
}

/**
 * 因子策略参数
 */
export interface FactorStrategyParams {
  factorWeights: FactorWeight[]
  rebalancePeriod: number // 调仓周期（天）
  topN: number // 选择前N只股票
  minScore: number // 最小因子得分
  maxPositions: number // 最大持仓数量
  scoreMethod: 'weighted_sum' | 'rank_ic' | 'z_score' // 评分方法
  neutralization: {
    industry: boolean // 行业中性
    market: boolean // 市值中性
    style: boolean // 风格中性
  }
}

/**
 * 股票评分结果
 */
export interface StockScore {
  symbol: string
  score: number
  rank: number
  factorValues: Record<string, number>
  industry?: string
  marketCap?: number
}

/**
 * 因子策略实现
 */
export class FactorStrategy extends BaseStrategy {
  private params: FactorStrategyParams
  private lastRebalanceDate: string | null = null
  private stockScores: Map<string, StockScore> = new Map()

  constructor(config: any) {
    super(config)
    this.params = this.getDefaultParams()
    
    // 合并用户配置
    if (config.parameters) {
      this.params = { ...this.params, ...config.parameters }
    }
  }

  /**
   * 执行因子策略
   */
  async execute(
    marketData: Map<string, StockData>,
    featureMatrix?: Map<string, FeatureMatrix>
  ): Promise<StrategyExecutionResult> {
    console.log(`执行因子策略: ${this.config.name}`)

    if (!featureMatrix || featureMatrix.size === 0) {
      throw new Error('因子策略需要特征矩阵数据')
    }

    // 创建策略上下文
    const context: StrategyContext = {
      currentDate: new Date().toISOString().split('T')[0],
      marketData,
      featureMatrix,
      positions: new Map(),
      cash: 1000000, // 初始资金100万
      totalValue: 1000000,
      benchmark: marketData.values().next().value // 使用第一个股票作为基准
    }

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
        stockScores: Array.from(this.stockScores.values()),
        rebalanceDate: this.lastRebalanceDate,
        factorWeights: this.params.factorWeights
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

    // 检查是否需要调仓
    if (!this.shouldRebalance(context.currentDate)) {
      // 不需要调仓，生成持有信号
      context.positions.forEach((position, symbol) => {
        const stockData = context.marketData.get(symbol)
        if (stockData) {
          signals.push({
            symbol,
            action: 'hold',
            strength: 0.5,
            confidence: 0.8,
            price: stockData.prices[stockData.prices.length - 1],
            quantity: position.quantity,
            reason: '维持持仓',
            timestamp: new Date().toISOString()
          })
        }
      })
      return signals
    }

    // 计算股票评分
    const stockScores = await this.calculateStockScores(context.featureMatrix!)

    // 选择目标股票
    const targetStocks = this.selectTargetStocks(stockScores)

    // 生成买入信号
    targetStocks.forEach(stockScore => {
      const stockData = context.marketData.get(stockScore.symbol)
      if (stockData) {
        const currentPrice = stockData.prices[stockData.prices.length - 1]
        const positionSize = context.totalValue / this.params.maxPositions
        const quantity = Math.floor(positionSize / currentPrice)

        if (quantity > 0) {
          signals.push({
            symbol: stockScore.symbol,
            action: 'buy',
            strength: Math.min(stockScore.score, 1.0),
            confidence: this.calculateSignalConfidence(stockScore),
            price: currentPrice,
            quantity,
            reason: `因子得分: ${stockScore.score.toFixed(3)}, 排名: ${stockScore.rank}`,
            timestamp: new Date().toISOString()
          })
        }
      }
    })

    // 生成卖出信号（清仓不在目标股票中的持仓）
    const targetSymbols = new Set(targetStocks.map(s => s.symbol))
    context.positions.forEach((position, symbol) => {
      if (!targetSymbols.has(symbol)) {
        const stockData = context.marketData.get(symbol)
        if (stockData) {
          signals.push({
            symbol,
            action: 'sell',
            strength: 0.8,
            confidence: 0.9,
            price: stockData.prices[stockData.prices.length - 1],
            quantity: position.quantity,
            reason: '不在目标股票池中',
            timestamp: new Date().toISOString()
          })
        }
      }
    })

    this.lastRebalanceDate = context.currentDate
    return signals
  }

  /**
   * 计算股票评分
   */
  private async calculateStockScores(featureMatrix: Map<string, FeatureMatrix>): Promise<StockScore[]> {
    const scores: StockScore[] = []
    this.stockScores.clear()

    featureMatrix.forEach((matrix, symbol) => {
      const factorValues: Record<string, number> = {}
      let totalScore = 0
      let validFactors = 0

      // 计算加权因子得分
      this.params.factorWeights.forEach(({ factorName, weight, direction }) => {
        const factor = matrix.factors[factorName]
        if (factor && factor.values.length > 0) {
          const latestValue = factor.values[factor.values.length - 1]
          if (!isNaN(latestValue)) {
            factorValues[factorName] = latestValue
            
            // 标准化因子值
            const normalizedValue = this.normalizeFactorValue(latestValue, factor.values)
            
            // 应用方向和权重
            const directionMultiplier = direction === 'positive' ? 1 : -1
            totalScore += normalizedValue * weight * directionMultiplier
            validFactors++
          }
        }
      })

      // 只有当有效因子数量足够时才计算得分
      if (validFactors >= this.params.factorWeights.length * 0.5) {
        const finalScore = totalScore / validFactors

        if (finalScore >= this.params.minScore) {
          const stockScore: StockScore = {
            symbol,
            score: finalScore,
            rank: 0, // 将在排序后设置
            factorValues
          }

          scores.push(stockScore)
          this.stockScores.set(symbol, stockScore)
        }
      }
    })

    // 排序并设置排名
    scores.sort((a, b) => b.score - a.score)
    scores.forEach((score, index) => {
      score.rank = index + 1
      this.stockScores.set(score.symbol, score)
    })

    return scores
  }

  /**
   * 标准化因子值
   */
  private normalizeFactorValue(value: number, allValues: number[]): number {
    const validValues = allValues.filter(v => !isNaN(v))
    
    if (validValues.length === 0) return 0

    const mean = validValues.reduce((sum, v) => sum + v, 0) / validValues.length
    const variance = validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / validValues.length
    const stdDev = Math.sqrt(variance)

    if (stdDev === 0) return 0

    // Z-score标准化
    return (value - mean) / stdDev
  }

  /**
   * 选择目标股票
   */
  private selectTargetStocks(stockScores: StockScore[]): StockScore[] {
    // 按得分排序，选择前N只
    const sortedScores = stockScores
      .filter(score => score.score >= this.params.minScore)
      .sort((a, b) => b.score - a.score)

    return sortedScores.slice(0, Math.min(this.params.topN, this.params.maxPositions))
  }

  /**
   * 计算信号置信度
   */
  private calculateSignalConfidence(stockScore: StockScore): number {
    // 基于排名和得分计算置信度
    const rankConfidence = Math.max(0, 1 - (stockScore.rank - 1) / this.params.topN)
    const scoreConfidence = Math.min(1, Math.abs(stockScore.score))
    
    return (rankConfidence * 0.6 + scoreConfidence * 0.4)
  }

  /**
   * 判断是否需要调仓
   */
  private shouldRebalance(currentDate: string): boolean {
    if (!this.lastRebalanceDate) return true

    const lastDate = new Date(this.lastRebalanceDate)
    const current = new Date(currentDate)
    const daysDiff = Math.floor((current.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

    return daysDiff >= this.params.rebalancePeriod
  }

  /**
   * 获取默认参数
   */
  private getDefaultParams(): FactorStrategyParams {
    return {
      factorWeights: [
        { factorName: 'momentum', weight: 0.3, direction: 'positive' },
        { factorName: 'rsi_divergence', weight: 0.2, direction: 'negative' },
        { factorName: 'volatility', weight: 0.2, direction: 'negative' },
        { factorName: 'volume_price_trend', weight: 0.3, direction: 'positive' }
      ],
      rebalancePeriod: 5, // 5天调仓一次
      topN: 10,
      minScore: 0.1,
      maxPositions: 10,
      scoreMethod: 'weighted_sum',
      neutralization: {
        industry: false,
        market: false,
        style: false
      }
    }
  }

  /**
   * 更新因子权重
   */
  updateFactorWeights(weights: FactorWeight[]): void {
    this.params.factorWeights = weights
    console.log(`因子权重已更新: ${weights.map(w => `${w.factorName}:${w.weight}`).join(', ')}`)
  }

  /**
   * 获取当前股票评分
   */
  getStockScores(): StockScore[] {
    return Array.from(this.stockScores.values())
  }

  /**
   * 获取因子贡献分析
   */
  getFactorContribution(): Record<string, number> {
    const contribution: Record<string, number> = {}
    
    this.params.factorWeights.forEach(({ factorName, weight }) => {
      contribution[factorName] = weight
    })

    return contribution
  }

  /**
   * 设置调仓周期
   */
  setRebalancePeriod(days: number): void {
    this.params.rebalancePeriod = days
    console.log(`调仓周期设置为 ${days} 天`)
  }

  /**
   * 设置选股数量
   */
  setTopN(n: number): void {
    this.params.topN = Math.min(n, this.params.maxPositions)
    console.log(`选股数量设置为 ${this.params.topN}`)
  }
}

export default FactorStrategy
