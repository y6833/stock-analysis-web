/**
 * 策略管理器
 * 统一管理量化策略的创建、执行、优化和评估
 */

import type { StockData } from '@/types/stock'
import type { FeatureMatrix } from '@/services/featureEngineering/FeatureEngineManager'
import { BaseStrategy } from './strategies/BaseStrategy'
import { FactorStrategy } from './strategies/FactorStrategy'
import { MLStrategy } from './strategies/MLStrategy'
import { TimingStrategy } from './strategies/TimingStrategy'
import { PortfolioStrategy } from './strategies/PortfolioStrategy'
import { StrategyOptimizer } from './StrategyOptimizer'
import { StrategyEvaluator } from './StrategyEvaluator'

/**
 * 策略类型
 */
export type StrategyType = 
  | 'factor'      // 因子策略
  | 'ml'          // 机器学习策略
  | 'timing'      // 择时策略
  | 'portfolio'   // 组合策略
  | 'arbitrage'   // 套利策略
  | 'custom'      // 自定义策略

/**
 * 策略配置
 */
export interface StrategyConfig {
  id: string
  name: string
  type: StrategyType
  description: string
  parameters: Record<string, any>
  enabled: boolean
  priority: number
  riskLevel: 'low' | 'medium' | 'high'
  expectedReturn: number
  maxDrawdown: number
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  universe: string[] // 股票池
  benchmark: string
  createdAt: string
  updatedAt: string
}

/**
 * 策略执行结果
 */
export interface StrategyResult {
  strategyId: string
  timestamp: string
  signals: StrategySignal[]
  positions: StrategyPosition[]
  performance: StrategyPerformance
  riskMetrics: RiskMetrics
  metadata: {
    executionTime: number
    dataQuality: number
    confidence: number
  }
}

/**
 * 策略信号
 */
export interface StrategySignal {
  symbol: string
  action: 'buy' | 'sell' | 'hold'
  strength: number // 信号强度 0-1
  confidence: number // 信号置信度 0-1
  price: number
  quantity: number
  reason: string
  timestamp: string
}

/**
 * 策略持仓
 */
export interface StrategyPosition {
  symbol: string
  quantity: number
  avgPrice: number
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  weight: number // 权重
  holdingPeriod: number // 持仓天数
}

/**
 * 策略绩效
 */
export interface StrategyPerformance {
  totalReturn: number
  annualizedReturn: number
  volatility: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  profitFactor: number
  calmarRatio: number
  informationRatio: number
  beta: number
  alpha: number
  trackingError: number
}

/**
 * 风险指标
 */
export interface RiskMetrics {
  var95: number // 95% VaR
  var99: number // 99% VaR
  cvar95: number // 95% CVaR
  maxDrawdown: number
  drawdownDuration: number
  volatility: number
  downside_volatility: number
  beta: number
  correlation: number
  concentration: number // 集中度
}

/**
 * 策略管理器
 */
export class StrategyManager {
  private strategies: Map<string, BaseStrategy> = new Map()
  private strategyConfigs: Map<string, StrategyConfig> = new Map()
  private optimizer: StrategyOptimizer
  private evaluator: StrategyEvaluator
  private executionHistory: Map<string, StrategyResult[]> = new Map()

  constructor() {
    this.optimizer = new StrategyOptimizer()
    this.evaluator = new StrategyEvaluator()
  }

  /**
   * 创建策略实例
   */
  createStrategy(config: StrategyConfig): BaseStrategy {
    let strategy: BaseStrategy

    switch (config.type) {
      case 'factor':
        strategy = new FactorStrategy(config)
        break
      case 'ml':
        strategy = new MLStrategy(config)
        break
      case 'timing':
        strategy = new TimingStrategy(config)
        break
      case 'portfolio':
        strategy = new PortfolioStrategy(config)
        break
      default:
        throw new Error(`不支持的策略类型: ${config.type}`)
    }

    this.strategies.set(config.id, strategy)
    this.strategyConfigs.set(config.id, config)

    console.log(`策略 ${config.name} (${config.id}) 创建成功`)
    return strategy
  }

  /**
   * 执行策略
   */
  async executeStrategy(
    strategyId: string,
    marketData: Map<string, StockData>,
    featureMatrix?: Map<string, FeatureMatrix>
  ): Promise<StrategyResult> {
    const strategy = this.strategies.get(strategyId)
    const config = this.strategyConfigs.get(strategyId)

    if (!strategy || !config) {
      throw new Error(`策略 ${strategyId} 不存在`)
    }

    console.log(`开始执行策略: ${config.name}`)
    const startTime = Date.now()

    try {
      // 执行策略
      const result = await strategy.execute(marketData, featureMatrix)

      // 计算绩效指标
      const performance = await this.evaluator.calculatePerformance(result, config.benchmark)

      // 计算风险指标
      const riskMetrics = await this.evaluator.calculateRiskMetrics(result)

      // 构建执行结果
      const strategyResult: StrategyResult = {
        strategyId,
        timestamp: new Date().toISOString(),
        signals: result.signals,
        positions: result.positions,
        performance,
        riskMetrics,
        metadata: {
          executionTime: Date.now() - startTime,
          dataQuality: this.calculateDataQuality(marketData),
          confidence: result.confidence || 0.8
        }
      }

      // 保存执行历史
      if (!this.executionHistory.has(strategyId)) {
        this.executionHistory.set(strategyId, [])
      }
      this.executionHistory.get(strategyId)!.push(strategyResult)

      console.log(`策略 ${config.name} 执行完成，用时 ${strategyResult.metadata.executionTime}ms`)
      return strategyResult

    } catch (error) {
      console.error(`策略 ${config.name} 执行失败:`, error)
      throw error
    }
  }

  /**
   * 批量执行多个策略
   */
  async executeMultipleStrategies(
    strategyIds: string[],
    marketData: Map<string, StockData>,
    featureMatrix?: Map<string, FeatureMatrix>
  ): Promise<Map<string, StrategyResult>> {
    const results = new Map<string, StrategyResult>()

    // 并行执行策略
    const promises = strategyIds.map(async (strategyId) => {
      try {
        const result = await this.executeStrategy(strategyId, marketData, featureMatrix)
        results.set(strategyId, result)
      } catch (error) {
        console.error(`策略 ${strategyId} 执行失败:`, error)
      }
    })

    await Promise.all(promises)
    return results
  }

  /**
   * 优化策略参数
   */
  async optimizeStrategy(
    strategyId: string,
    marketData: Map<string, StockData>,
    optimizationConfig: {
      objective: 'return' | 'sharpe' | 'calmar'
      constraints: Record<string, any>
      parameterRanges: Record<string, [number, number]>
      maxIterations: number
    }
  ): Promise<StrategyConfig> {
    const strategy = this.strategies.get(strategyId)
    const config = this.strategyConfigs.get(strategyId)

    if (!strategy || !config) {
      throw new Error(`策略 ${strategyId} 不存在`)
    }

    console.log(`开始优化策略: ${config.name}`)

    const optimizedConfig = await this.optimizer.optimize(
      strategy,
      marketData,
      optimizationConfig
    )

    // 更新策略配置
    this.strategyConfigs.set(strategyId, optimizedConfig)

    console.log(`策略 ${config.name} 优化完成`)
    return optimizedConfig
  }

  /**
   * 获取策略绩效报告
   */
  async getStrategyReport(strategyId: string): Promise<{
    config: StrategyConfig
    latestResult: StrategyResult | null
    historicalPerformance: StrategyPerformance[]
    riskAnalysis: RiskMetrics
    recommendations: string[]
  }> {
    const config = this.strategyConfigs.get(strategyId)
    const history = this.executionHistory.get(strategyId) || []

    if (!config) {
      throw new Error(`策略 ${strategyId} 不存在`)
    }

    const latestResult = history.length > 0 ? history[history.length - 1] : null
    const historicalPerformance = history.map(result => result.performance)
    const riskAnalysis = latestResult?.riskMetrics || this.getDefaultRiskMetrics()

    // 生成策略建议
    const recommendations = this.generateRecommendations(config, latestResult, history)

    return {
      config,
      latestResult,
      historicalPerformance,
      riskAnalysis,
      recommendations
    }
  }

  /**
   * 获取策略列表
   */
  getStrategies(): StrategyConfig[] {
    return Array.from(this.strategyConfigs.values())
  }

  /**
   * 获取策略执行历史
   */
  getExecutionHistory(strategyId: string): StrategyResult[] {
    return this.executionHistory.get(strategyId) || []
  }

  /**
   * 删除策略
   */
  removeStrategy(strategyId: string): boolean {
    const removed = this.strategies.delete(strategyId) && this.strategyConfigs.delete(strategyId)
    if (removed) {
      this.executionHistory.delete(strategyId)
      console.log(`策略 ${strategyId} 已删除`)
    }
    return removed
  }

  /**
   * 更新策略配置
   */
  updateStrategyConfig(strategyId: string, updates: Partial<StrategyConfig>): boolean {
    const config = this.strategyConfigs.get(strategyId)
    if (!config) return false

    const updatedConfig = {
      ...config,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    this.strategyConfigs.set(strategyId, updatedConfig)

    // 重新创建策略实例
    this.createStrategy(updatedConfig)

    return true
  }

  /**
   * 计算数据质量
   */
  private calculateDataQuality(marketData: Map<string, StockData>): number {
    let totalQuality = 0
    let count = 0

    marketData.forEach((data) => {
      const missingRatio = data.prices.filter(p => isNaN(p) || p <= 0).length / data.prices.length
      const quality = 1 - missingRatio
      totalQuality += quality
      count++
    })

    return count > 0 ? totalQuality / count : 0
  }

  /**
   * 生成策略建议
   */
  private generateRecommendations(
    config: StrategyConfig,
    latestResult: StrategyResult | null,
    history: StrategyResult[]
  ): string[] {
    const recommendations: string[] = []

    if (!latestResult) {
      recommendations.push('策略尚未执行，建议先运行回测验证策略有效性')
      return recommendations
    }

    const performance = latestResult.performance
    const risk = latestResult.riskMetrics

    // 收益率建议
    if (performance.annualizedReturn < 0.05) {
      recommendations.push('策略年化收益率较低，建议优化选股逻辑或调整参数')
    }

    // 夏普比率建议
    if (performance.sharpeRatio < 1.0) {
      recommendations.push('夏普比率偏低，建议降低策略波动性或提高收益率')
    }

    // 最大回撤建议
    if (performance.maxDrawdown > 0.2) {
      recommendations.push('最大回撤过大，建议加强风险控制措施')
    }

    // 胜率建议
    if (performance.winRate < 0.4) {
      recommendations.push('胜率较低，建议优化入场时机或止损策略')
    }

    // 风险建议
    if (risk.concentration > 0.3) {
      recommendations.push('持仓集中度过高，建议增加分散化投资')
    }

    return recommendations
  }

  /**
   * 获取默认风险指标
   */
  private getDefaultRiskMetrics(): RiskMetrics {
    return {
      var95: 0,
      var99: 0,
      cvar95: 0,
      maxDrawdown: 0,
      drawdownDuration: 0,
      volatility: 0,
      downside_volatility: 0,
      beta: 1,
      correlation: 0,
      concentration: 0
    }
  }

  /**
   * 获取默认策略配置
   */
  getDefaultStrategyConfigs(): StrategyConfig[] {
    return [
      {
        id: 'factor_momentum',
        name: '动量因子策略',
        type: 'factor',
        description: '基于动量因子的选股策略',
        parameters: {
          lookbackPeriod: 20,
          rebalancePeriod: 5,
          topN: 10
        },
        enabled: true,
        priority: 1,
        riskLevel: 'medium',
        expectedReturn: 0.15,
        maxDrawdown: 0.15,
        rebalanceFrequency: 'weekly',
        universe: [],
        benchmark: '000300.SH',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'ml_xgboost',
        name: 'XGBoost机器学习策略',
        type: 'ml',
        description: '基于XGBoost的机器学习选股策略',
        parameters: {
          nEstimators: 100,
          maxDepth: 6,
          learningRate: 0.1,
          featureSelection: 'auto'
        },
        enabled: true,
        priority: 2,
        riskLevel: 'high',
        expectedReturn: 0.20,
        maxDrawdown: 0.20,
        rebalanceFrequency: 'monthly',
        universe: [],
        benchmark: '000300.SH',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }
}

// 创建全局策略管理器实例
export const strategyManager = new StrategyManager()

export default strategyManager
