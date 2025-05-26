/**
 * 组合策略
 * 多策略组合和资产配置策略
 */

import type { StockData } from '@/types/stock'
import type { FeatureMatrix } from '@/services/featureEngineering/FeatureEngineManager'
import { BaseStrategy, type StrategyContext, type StrategyExecutionResult, type StrategySignal } from './BaseStrategy'
import { FactorStrategy } from './FactorStrategy'
import { MLStrategy } from './MLStrategy'
import { TimingStrategy } from './TimingStrategy'

/**
 * 子策略配置
 */
export interface SubStrategyConfig {
  id: string
  name: string
  strategy: BaseStrategy
  weight: number
  enabled: boolean
  riskBudget: number
  maxAllocation: number
  minAllocation: number
}

/**
 * 组合优化方法
 */
export type OptimizationMethod = 
  | 'equal_weight'        // 等权重
  | 'risk_parity'         // 风险平价
  | 'mean_variance'       // 均值方差优化
  | 'black_litterman'     // Black-Litterman模型
  | 'hierarchical_risk'   // 层次风险平价
  | 'kelly'               // 凯利公式

/**
 * 再平衡触发条件
 */
export interface RebalanceTrigger {
  timeBasedDays: number
  driftThreshold: number
  volatilityThreshold: number
  performanceThreshold: number
}

/**
 * 组合策略参数
 */
export interface PortfolioStrategyParams {
  optimizationMethod: OptimizationMethod
  rebalanceTrigger: RebalanceTrigger
  riskTarget: number
  returnTarget: number
  maxDrawdown: number
  correlationThreshold: number
  diversificationTarget: number
  transactionCosts: number
  constraints: {
    maxSingleWeight: number
    minSingleWeight: number
    maxSectorWeight: number
    maxRegionWeight: number
    turnoverLimit: number
  }
}

/**
 * 组合分析结果
 */
export interface PortfolioAnalysis {
  expectedReturn: number
  expectedVolatility: number
  sharpeRatio: number
  diversificationRatio: number
  concentrationIndex: number
  correlationMatrix: number[][]
  riskContribution: Record<string, number>
  sectorAllocation: Record<string, number>
  factorExposure: Record<string, number>
}

/**
 * 组合策略实现
 */
export class PortfolioStrategy extends BaseStrategy {
  private params: PortfolioStrategyParams
  private subStrategies: Map<string, SubStrategyConfig> = new Map()
  private lastRebalanceDate: string | null = null
  private currentWeights: Map<string, number> = new Map()
  private portfolioAnalysis: PortfolioAnalysis | null = null

  constructor(config: any) {
    super(config)
    this.params = this.getDefaultParams()
    
    // 合并用户配置
    if (config.parameters) {
      this.params = { ...this.params, ...config.parameters }
    }

    // 初始化子策略
    this.initializeSubStrategies()
  }

  /**
   * 执行组合策略
   */
  async execute(
    marketData: Map<string, StockData>,
    featureMatrix?: Map<string, FeatureMatrix>
  ): Promise<StrategyExecutionResult> {
    console.log(`执行组合策略: ${this.config.name}`)

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

    // 执行所有子策略
    const subStrategyResults = await this.executeSubStrategies(marketData, featureMatrix)

    // 检查是否需要再平衡
    const shouldRebalance = await this.shouldRebalance(context, subStrategyResults)

    let signals: StrategySignal[] = []

    if (shouldRebalance) {
      // 组合优化
      const optimizedWeights = await this.optimizePortfolio(subStrategyResults, marketData)
      
      // 生成再平衡信号
      signals = await this.generateRebalanceSignals(context, optimizedWeights, subStrategyResults)
      
      this.lastRebalanceDate = context.currentDate
      this.currentWeights = optimizedWeights
    } else {
      // 生成维持信号
      signals = await this.generateHoldSignals(context)
    }

    // 应用风险控制
    const filteredSignals = this.applyRiskControl(signals, context.positions, context.totalValue)

    // 更新持仓
    const positions = this.updatePositions(context.positions, filteredSignals, marketData)

    // 计算组合分析
    this.portfolioAnalysis = await this.analyzePortfolio(positions, marketData)

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
        subStrategyResults,
        portfolioAnalysis: this.portfolioAnalysis,
        currentWeights: Object.fromEntries(this.currentWeights),
        rebalanceDate: this.lastRebalanceDate
      }
    }

    this.executionHistory.push(result)
    return result
  }

  /**
   * 生成交易信号
   */
  async generateSignals(context: StrategyContext): Promise<StrategySignal[]> {
    // 组合策略的信号生成在execute方法中处理
    return []
  }

  /**
   * 初始化子策略
   */
  private initializeSubStrategies(): void {
    // 创建默认子策略
    const factorConfig = {
      id: 'factor_momentum',
      name: '动量因子策略',
      type: 'factor',
      parameters: {}
    }
    
    const mlConfig = {
      id: 'ml_xgboost',
      name: 'XGBoost策略',
      type: 'ml',
      parameters: {}
    }

    const timingConfig = {
      id: 'timing_trend',
      name: '趋势择时策略',
      type: 'timing',
      parameters: {}
    }

    this.subStrategies.set('factor', {
      id: 'factor',
      name: '因子策略',
      strategy: new FactorStrategy(factorConfig),
      weight: 0.4,
      enabled: true,
      riskBudget: 0.3,
      maxAllocation: 0.6,
      minAllocation: 0.2
    })

    this.subStrategies.set('ml', {
      id: 'ml',
      name: '机器学习策略',
      strategy: new MLStrategy(mlConfig),
      weight: 0.3,
      enabled: true,
      riskBudget: 0.4,
      maxAllocation: 0.5,
      minAllocation: 0.1
    })

    this.subStrategies.set('timing', {
      id: 'timing',
      name: '择时策略',
      strategy: new TimingStrategy(timingConfig),
      weight: 0.3,
      enabled: true,
      riskBudget: 0.3,
      maxAllocation: 0.4,
      minAllocation: 0.1
    })
  }

  /**
   * 执行所有子策略
   */
  private async executeSubStrategies(
    marketData: Map<string, StockData>,
    featureMatrix?: Map<string, FeatureMatrix>
  ): Promise<Map<string, StrategyExecutionResult>> {
    const results = new Map<string, StrategyExecutionResult>()

    const promises = Array.from(this.subStrategies.entries()).map(async ([id, config]) => {
      if (!config.enabled) return

      try {
        const result = await config.strategy.execute(marketData, featureMatrix)
        results.set(id, result)
        console.log(`子策略 ${config.name} 执行完成`)
      } catch (error) {
        console.error(`子策略 ${config.name} 执行失败:`, error)
      }
    })

    await Promise.all(promises)
    return results
  }

  /**
   * 判断是否需要再平衡
   */
  private async shouldRebalance(
    context: StrategyContext,
    subStrategyResults: Map<string, StrategyExecutionResult>
  ): Promise<boolean> {
    // 时间触发
    if (!this.lastRebalanceDate) return true

    const daysSinceRebalance = this.calculateDaysDifference(this.lastRebalanceDate, context.currentDate)
    if (daysSinceRebalance >= this.params.rebalanceTrigger.timeBasedDays) {
      console.log('时间触发再平衡')
      return true
    }

    // 权重漂移触发
    const currentDrift = this.calculateWeightDrift(context.positions)
    if (currentDrift > this.params.rebalanceTrigger.driftThreshold) {
      console.log('权重漂移触发再平衡')
      return true
    }

    // 波动率触发
    const currentVolatility = this.calculatePortfolioVolatility(context.positions, context.marketData)
    if (Math.abs(currentVolatility - this.params.riskTarget) > this.params.rebalanceTrigger.volatilityThreshold) {
      console.log('波动率变化触发再平衡')
      return true
    }

    return false
  }

  /**
   * 组合优化
   */
  private async optimizePortfolio(
    subStrategyResults: Map<string, StrategyExecutionResult>,
    marketData: Map<string, StockData>
  ): Promise<Map<string, number>> {
    const weights = new Map<string, number>()

    switch (this.params.optimizationMethod) {
      case 'equal_weight':
        return this.equalWeightOptimization(subStrategyResults)

      case 'risk_parity':
        return this.riskParityOptimization(subStrategyResults, marketData)

      case 'mean_variance':
        return this.meanVarianceOptimization(subStrategyResults, marketData)

      default:
        return this.equalWeightOptimization(subStrategyResults)
    }
  }

  /**
   * 等权重优化
   */
  private equalWeightOptimization(
    subStrategyResults: Map<string, StrategyExecutionResult>
  ): Map<string, number> {
    const weights = new Map<string, number>()
    const enabledStrategies = Array.from(this.subStrategies.values()).filter(s => s.enabled)
    const equalWeight = 1 / enabledStrategies.length

    enabledStrategies.forEach(strategy => {
      weights.set(strategy.id, equalWeight)
    })

    return weights
  }

  /**
   * 风险平价优化
   */
  private riskParityOptimization(
    subStrategyResults: Map<string, StrategyExecutionResult>,
    marketData: Map<string, StockData>
  ): Map<string, number> {
    const weights = new Map<string, number>()
    const riskContributions = new Map<string, number>()

    // 计算每个子策略的风险贡献
    this.subStrategies.forEach((config, id) => {
      if (!config.enabled) return

      const result = subStrategyResults.get(id)
      if (result) {
        const volatility = this.calculateStrategyVolatility(result, marketData)
        riskContributions.set(id, 1 / volatility)
      }
    })

    // 标准化权重
    const totalRiskContrib = Array.from(riskContributions.values()).reduce((sum, contrib) => sum + contrib, 0)
    
    riskContributions.forEach((contrib, id) => {
      weights.set(id, contrib / totalRiskContrib)
    })

    return weights
  }

  /**
   * 均值方差优化
   */
  private meanVarianceOptimization(
    subStrategyResults: Map<string, StrategyExecutionResult>,
    marketData: Map<string, StockData>
  ): Map<string, number> {
    // 简化的均值方差优化实现
    const weights = new Map<string, number>()
    const returns = new Map<string, number>()
    const risks = new Map<string, number>()

    // 计算预期收益和风险
    this.subStrategies.forEach((config, id) => {
      if (!config.enabled) return

      const result = subStrategyResults.get(id)
      if (result) {
        const expectedReturn = this.estimateExpectedReturn(result)
        const volatility = this.calculateStrategyVolatility(result, marketData)
        
        returns.set(id, expectedReturn)
        risks.set(id, volatility)
      }
    })

    // 简化的优化：最大化夏普比率
    const sharpeRatios = new Map<string, number>()
    returns.forEach((ret, id) => {
      const risk = risks.get(id) || 1
      sharpeRatios.set(id, ret / risk)
    })

    // 标准化权重
    const totalSharpe = Array.from(sharpeRatios.values()).reduce((sum, sharpe) => sum + Math.max(sharpe, 0), 0)
    
    if (totalSharpe > 0) {
      sharpeRatios.forEach((sharpe, id) => {
        weights.set(id, Math.max(sharpe, 0) / totalSharpe)
      })
    } else {
      // 如果所有夏普比率都为负，使用等权重
      return this.equalWeightOptimization(subStrategyResults)
    }

    return weights
  }

  /**
   * 生成再平衡信号
   */
  private async generateRebalanceSignals(
    context: StrategyContext,
    targetWeights: Map<string, number>,
    subStrategyResults: Map<string, StrategyExecutionResult>
  ): Promise<StrategySignal[]> {
    const signals: StrategySignal[] = []

    // 合并所有子策略的信号
    const allSignals = new Map<string, StrategySignal[]>()
    
    subStrategyResults.forEach((result, strategyId) => {
      const weight = targetWeights.get(strategyId) || 0
      if (weight > 0) {
        // 按权重调整信号强度
        const adjustedSignals = result.signals.map(signal => ({
          ...signal,
          strength: signal.strength * weight,
          reason: `${signal.reason} (权重: ${(weight * 100).toFixed(1)}%)`
        }))
        
        adjustedSignals.forEach(signal => {
          if (!allSignals.has(signal.symbol)) {
            allSignals.set(signal.symbol, [])
          }
          allSignals.get(signal.symbol)!.push(signal)
        })
      }
    })

    // 合并同一股票的信号
    allSignals.forEach((symbolSignals, symbol) => {
      const combinedSignal = this.combineSignals(symbolSignals)
      if (combinedSignal) {
        signals.push(combinedSignal)
      }
    })

    return signals
  }

  /**
   * 合并信号
   */
  private combineSignals(signals: StrategySignal[]): StrategySignal | null {
    if (signals.length === 0) return null

    const buySignals = signals.filter(s => s.action === 'buy')
    const sellSignals = signals.filter(s => s.action === 'sell')
    const holdSignals = signals.filter(s => s.action === 'hold')

    // 计算加权平均
    const totalBuyStrength = buySignals.reduce((sum, s) => sum + s.strength, 0)
    const totalSellStrength = sellSignals.reduce((sum, s) => sum + s.strength, 0)

    let finalAction: 'buy' | 'sell' | 'hold' = 'hold'
    let finalStrength = 0
    let finalConfidence = 0

    if (totalBuyStrength > totalSellStrength && totalBuyStrength > 0.3) {
      finalAction = 'buy'
      finalStrength = totalBuyStrength / buySignals.length
      finalConfidence = buySignals.reduce((sum, s) => sum + s.confidence, 0) / buySignals.length
    } else if (totalSellStrength > totalBuyStrength && totalSellStrength > 0.3) {
      finalAction = 'sell'
      finalStrength = totalSellStrength / sellSignals.length
      finalConfidence = sellSignals.reduce((sum, s) => sum + s.confidence, 0) / sellSignals.length
    } else {
      finalAction = 'hold'
      finalStrength = 0.5
      finalConfidence = 0.6
    }

    const firstSignal = signals[0]
    return {
      symbol: firstSignal.symbol,
      action: finalAction,
      strength: finalStrength,
      confidence: finalConfidence,
      price: firstSignal.price,
      quantity: firstSignal.quantity,
      reason: `组合信号: ${signals.length}个子策略`,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 生成持有信号
   */
  private async generateHoldSignals(context: StrategyContext): Promise<StrategySignal[]> {
    const signals: StrategySignal[] = []

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
          reason: '维持组合配置',
          timestamp: new Date().toISOString()
        })
      }
    })

    return signals
  }

  /**
   * 分析组合
   */
  private async analyzePortfolio(
    positions: any[],
    marketData: Map<string, StockData>
  ): Promise<PortfolioAnalysis> {
    // 简化的组合分析实现
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0)
    
    return {
      expectedReturn: 0.12, // 模拟值
      expectedVolatility: 0.15,
      sharpeRatio: 0.8,
      diversificationRatio: 1.2,
      concentrationIndex: 0.3,
      correlationMatrix: [],
      riskContribution: {},
      sectorAllocation: {},
      factorExposure: {}
    }
  }

  // 辅助方法
  private calculateDaysDifference(date1: string, date2: string): number {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
  }

  private calculateWeightDrift(positions: Map<string, any>): number {
    // 简化实现
    return 0.05
  }

  private calculatePortfolioVolatility(positions: Map<string, any>, marketData: Map<string, StockData>): number {
    // 简化实现
    return 0.15
  }

  private calculateStrategyVolatility(result: StrategyExecutionResult, marketData: Map<string, StockData>): number {
    // 简化实现
    return 0.2
  }

  private estimateExpectedReturn(result: StrategyExecutionResult): number {
    // 简化实现
    return 0.1
  }

  /**
   * 获取默认参数
   */
  private getDefaultParams(): PortfolioStrategyParams {
    return {
      optimizationMethod: 'risk_parity',
      rebalanceTrigger: {
        timeBasedDays: 30,
        driftThreshold: 0.05,
        volatilityThreshold: 0.02,
        performanceThreshold: 0.1
      },
      riskTarget: 0.15,
      returnTarget: 0.12,
      maxDrawdown: 0.2,
      correlationThreshold: 0.8,
      diversificationTarget: 0.7,
      transactionCosts: 0.001,
      constraints: {
        maxSingleWeight: 0.3,
        minSingleWeight: 0.05,
        maxSectorWeight: 0.4,
        maxRegionWeight: 0.6,
        turnoverLimit: 0.5
      }
    }
  }

  /**
   * 添加子策略
   */
  addSubStrategy(config: SubStrategyConfig): void {
    this.subStrategies.set(config.id, config)
    console.log(`添加子策略: ${config.name}`)
  }

  /**
   * 移除子策略
   */
  removeSubStrategy(id: string): boolean {
    const removed = this.subStrategies.delete(id)
    if (removed) {
      console.log(`移除子策略: ${id}`)
    }
    return removed
  }

  /**
   * 更新子策略权重
   */
  updateSubStrategyWeight(id: string, weight: number): boolean {
    const strategy = this.subStrategies.get(id)
    if (strategy) {
      strategy.weight = weight
      console.log(`更新子策略 ${id} 权重为 ${weight}`)
      return true
    }
    return false
  }

  /**
   * 获取子策略列表
   */
  getSubStrategies(): SubStrategyConfig[] {
    return Array.from(this.subStrategies.values())
  }

  /**
   * 获取组合分析
   */
  getPortfolioAnalysis(): PortfolioAnalysis | null {
    return this.portfolioAnalysis
  }

  /**
   * 获取当前权重
   */
  getCurrentWeights(): Map<string, number> {
    return this.currentWeights
  }
}

export default PortfolioStrategy
