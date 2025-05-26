/**
 * 策略评估器
 * 用于评估策略性能和风险指标
 */

import type { StrategyExecutionResult } from './strategies/BaseStrategy'
import type { StrategyPerformance, RiskMetrics } from './StrategyManager'

/**
 * 评估时间窗口
 */
export interface EvaluationPeriod {
  start: string
  end: string
  label: string
}

/**
 * 基准比较结果
 */
export interface BenchmarkComparison {
  strategy: StrategyPerformance
  benchmark: StrategyPerformance
  alpha: number
  beta: number
  informationRatio: number
  trackingError: number
  upCapture: number
  downCapture: number
  correlation: number
}

/**
 * 归因分析结果
 */
export interface AttributionAnalysis {
  factorReturns: Record<string, number>
  specificReturn: number
  totalReturn: number
  factorContributions: Record<string, number>
  riskContributions: Record<string, number>
}

/**
 * 策略评估器实现
 */
export class StrategyEvaluator {
  
  /**
   * 计算策略绩效指标
   */
  async calculatePerformance(
    result: StrategyExecutionResult,
    benchmark?: string
  ): Promise<StrategyPerformance> {
    // 模拟绩效计算
    // 实际应用中应该基于真实的交易记录和价格数据

    const returns = this.generateMockReturns(result)
    
    const totalReturn = returns.reduce((acc, ret) => acc * (1 + ret), 1) - 1
    const annualizedReturn = Math.pow(1 + totalReturn, 252 / returns.length) - 1
    const volatility = this.calculateVolatility(returns)
    const sharpeRatio = volatility > 0 ? annualizedReturn / volatility : 0
    const maxDrawdown = this.calculateMaxDrawdown(returns)
    const winRate = this.calculateWinRate(returns)
    const profitFactor = this.calculateProfitFactor(returns)
    const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0

    // 如果有基准，计算相对指标
    let beta = 1
    let alpha = 0
    let informationRatio = 0
    let trackingError = 0

    if (benchmark) {
      const benchmarkReturns = this.generateMockBenchmarkReturns(returns.length)
      beta = this.calculateBeta(returns, benchmarkReturns)
      alpha = annualizedReturn - beta * this.calculateAnnualizedReturn(benchmarkReturns)
      trackingError = this.calculateTrackingError(returns, benchmarkReturns)
      informationRatio = trackingError > 0 ? alpha / trackingError : 0
    }

    return {
      totalReturn,
      annualizedReturn,
      volatility,
      sharpeRatio,
      maxDrawdown,
      winRate,
      profitFactor,
      calmarRatio,
      informationRatio,
      beta,
      alpha,
      trackingError
    }
  }

  /**
   * 计算风险指标
   */
  async calculateRiskMetrics(result: StrategyExecutionResult): Promise<RiskMetrics> {
    const returns = this.generateMockReturns(result)
    
    const var95 = this.calculateVaR(returns, 0.95)
    const var99 = this.calculateVaR(returns, 0.99)
    const cvar95 = this.calculateCVaR(returns, 0.95)
    const maxDrawdown = this.calculateMaxDrawdown(returns)
    const drawdownDuration = this.calculateDrawdownDuration(returns)
    const volatility = this.calculateVolatility(returns)
    const downside_volatility = this.calculateDownsideVolatility(returns)
    const beta = 1 // 简化
    const correlation = 0.7 // 简化
    const concentration = this.calculateConcentration(result.positions)

    return {
      var95,
      var99,
      cvar95,
      maxDrawdown,
      drawdownDuration,
      volatility,
      downside_volatility,
      beta,
      correlation,
      concentration
    }
  }

  /**
   * 基准比较分析
   */
  async compareToBenchmark(
    strategyResult: StrategyExecutionResult,
    benchmarkReturns: number[]
  ): Promise<BenchmarkComparison> {
    const strategyPerformance = await this.calculatePerformance(strategyResult)
    const benchmarkPerformance = this.calculateBenchmarkPerformance(benchmarkReturns)
    
    const strategyReturns = this.generateMockReturns(strategyResult)
    
    const alpha = strategyPerformance.annualizedReturn - 
                 strategyPerformance.beta * benchmarkPerformance.annualizedReturn
    const beta = this.calculateBeta(strategyReturns, benchmarkReturns)
    const trackingError = this.calculateTrackingError(strategyReturns, benchmarkReturns)
    const informationRatio = trackingError > 0 ? alpha / trackingError : 0
    const upCapture = this.calculateUpCapture(strategyReturns, benchmarkReturns)
    const downCapture = this.calculateDownCapture(strategyReturns, benchmarkReturns)
    const correlation = this.calculateCorrelation(strategyReturns, benchmarkReturns)

    return {
      strategy: strategyPerformance,
      benchmark: benchmarkPerformance,
      alpha,
      beta,
      informationRatio,
      trackingError,
      upCapture,
      downCapture,
      correlation
    }
  }

  /**
   * 归因分析
   */
  async performAttributionAnalysis(
    result: StrategyExecutionResult,
    factorReturns: Record<string, number[]>
  ): Promise<AttributionAnalysis> {
    // 简化的归因分析实现
    const totalReturn = 0.12 // 模拟总收益

    const factorContributions: Record<string, number> = {}
    const riskContributions: Record<string, number> = {}
    
    // 模拟因子贡献
    Object.keys(factorReturns).forEach(factor => {
      factorContributions[factor] = Math.random() * 0.05 - 0.025
      riskContributions[factor] = Math.random() * 0.1
    })

    const factorReturn = Object.values(factorContributions).reduce((sum, contrib) => sum + contrib, 0)
    const specificReturn = totalReturn - factorReturn

    return {
      factorReturns: Object.keys(factorReturns).reduce((acc, factor) => {
        acc[factor] = factorReturns[factor].reduce((sum, ret) => sum + ret, 0) / factorReturns[factor].length
        return acc
      }, {} as Record<string, number>),
      specificReturn,
      totalReturn,
      factorContributions,
      riskContributions
    }
  }

  /**
   * 滚动窗口分析
   */
  async rollingWindowAnalysis(
    results: StrategyExecutionResult[],
    windowSize: number = 60
  ): Promise<{
    dates: string[]
    returns: number[]
    volatility: number[]
    sharpeRatio: number[]
    maxDrawdown: number[]
  }> {
    const dates: string[] = []
    const returns: number[] = []
    const volatility: number[] = []
    const sharpeRatio: number[] = []
    const maxDrawdown: number[] = []

    for (let i = windowSize; i < results.length; i++) {
      const windowResults = results.slice(i - windowSize, i)
      const windowReturns = windowResults.map(r => this.generateMockReturns(r)).flat()
      
      dates.push(new Date().toISOString().split('T')[0])
      returns.push(this.calculateAnnualizedReturn(windowReturns))
      volatility.push(this.calculateVolatility(windowReturns))
      sharpeRatio.push(this.calculateSharpeRatio(windowReturns))
      maxDrawdown.push(this.calculateMaxDrawdown(windowReturns))
    }

    return { dates, returns, volatility, sharpeRatio, maxDrawdown }
  }

  /**
   * 压力测试
   */
  async stressTest(
    result: StrategyExecutionResult,
    scenarios: {
      name: string
      marketShock: number
      volatilityMultiplier: number
      correlationShift: number
    }[]
  ): Promise<Record<string, {
    scenario: string
    expectedLoss: number
    probability: number
    timeToRecover: number
  }>> {
    const stressResults: Record<string, any> = {}

    scenarios.forEach(scenario => {
      // 模拟压力测试结果
      const expectedLoss = Math.abs(scenario.marketShock) * 0.8 + Math.random() * 0.1
      const probability = Math.random() * 0.3 + 0.05
      const timeToRecover = Math.floor(Math.random() * 180) + 30

      stressResults[scenario.name] = {
        scenario: scenario.name,
        expectedLoss,
        probability,
        timeToRecover
      }
    })

    return stressResults
  }

  // 私有辅助方法

  /**
   * 生成模拟收益率
   */
  private generateMockReturns(result: StrategyExecutionResult): number[] {
    const returns: number[] = []
    const baseReturn = 0.0005 // 日均收益率
    const volatility = 0.02 // 日波动率

    for (let i = 0; i < 252; i++) { // 一年的交易日
      const randomReturn = baseReturn + (Math.random() - 0.5) * volatility
      returns.push(randomReturn)
    }

    return returns
  }

  /**
   * 生成模拟基准收益率
   */
  private generateMockBenchmarkReturns(length: number): number[] {
    const returns: number[] = []
    const baseReturn = 0.0003
    const volatility = 0.015

    for (let i = 0; i < length; i++) {
      const randomReturn = baseReturn + (Math.random() - 0.5) * volatility
      returns.push(randomReturn)
    }

    return returns
  }

  /**
   * 计算波动率
   */
  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    
    return Math.sqrt(variance * 252) // 年化波动率
  }

  /**
   * 计算最大回撤
   */
  private calculateMaxDrawdown(returns: number[]): number {
    let maxDrawdown = 0
    let peak = 1
    let current = 1

    returns.forEach(ret => {
      current *= (1 + ret)
      if (current > peak) {
        peak = current
      }
      const drawdown = (peak - current) / peak
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    })

    return maxDrawdown
  }

  /**
   * 计算胜率
   */
  private calculateWinRate(returns: number[]): number {
    if (returns.length === 0) return 0
    const winningDays = returns.filter(ret => ret > 0).length
    return winningDays / returns.length
  }

  /**
   * 计算盈亏比
   */
  private calculateProfitFactor(returns: number[]): number {
    const profits = returns.filter(ret => ret > 0)
    const losses = returns.filter(ret => ret < 0)

    if (losses.length === 0) return Infinity
    if (profits.length === 0) return 0

    const totalProfit = profits.reduce((sum, ret) => sum + ret, 0)
    const totalLoss = Math.abs(losses.reduce((sum, ret) => sum + ret, 0))

    return totalLoss > 0 ? totalProfit / totalLoss : 0
  }

  /**
   * 计算年化收益率
   */
  private calculateAnnualizedReturn(returns: number[]): number {
    const totalReturn = returns.reduce((acc, ret) => acc * (1 + ret), 1) - 1
    return Math.pow(1 + totalReturn, 252 / returns.length) - 1
  }

  /**
   * 计算夏普比率
   */
  private calculateSharpeRatio(returns: number[]): number {
    const annualizedReturn = this.calculateAnnualizedReturn(returns)
    const volatility = this.calculateVolatility(returns)
    return volatility > 0 ? annualizedReturn / volatility : 0
  }

  /**
   * 计算Beta
   */
  private calculateBeta(returns: number[], benchmarkReturns: number[]): number {
    if (returns.length !== benchmarkReturns.length || returns.length === 0) return 1

    const covariance = this.calculateCovariance(returns, benchmarkReturns)
    const benchmarkVariance = this.calculateVariance(benchmarkReturns)

    return benchmarkVariance > 0 ? covariance / benchmarkVariance : 1
  }

  /**
   * 计算跟踪误差
   */
  private calculateTrackingError(returns: number[], benchmarkReturns: number[]): number {
    if (returns.length !== benchmarkReturns.length) return 0

    const trackingDifferences = returns.map((ret, i) => ret - benchmarkReturns[i])
    return this.calculateVolatility(trackingDifferences)
  }

  /**
   * 计算VaR
   */
  private calculateVaR(returns: number[], confidence: number): number {
    const sortedReturns = [...returns].sort((a, b) => a - b)
    const index = Math.floor((1 - confidence) * sortedReturns.length)
    return Math.abs(sortedReturns[index] || 0)
  }

  /**
   * 计算CVaR
   */
  private calculateCVaR(returns: number[], confidence: number): number {
    const sortedReturns = [...returns].sort((a, b) => a - b)
    const index = Math.floor((1 - confidence) * sortedReturns.length)
    const tailReturns = sortedReturns.slice(0, index + 1)
    
    if (tailReturns.length === 0) return 0
    
    const avgTailReturn = tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length
    return Math.abs(avgTailReturn)
  }

  /**
   * 计算回撤持续时间
   */
  private calculateDrawdownDuration(returns: number[]): number {
    let maxDuration = 0
    let currentDuration = 0
    let peak = 1
    let current = 1

    returns.forEach(ret => {
      current *= (1 + ret)
      if (current > peak) {
        peak = current
        currentDuration = 0
      } else {
        currentDuration++
        if (currentDuration > maxDuration) {
          maxDuration = currentDuration
        }
      }
    })

    return maxDuration
  }

  /**
   * 计算下行波动率
   */
  private calculateDownsideVolatility(returns: number[]): number {
    const negativeReturns = returns.filter(ret => ret < 0)
    return this.calculateVolatility(negativeReturns)
  }

  /**
   * 计算集中度
   */
  private calculateConcentration(positions: any[]): number {
    if (positions.length === 0) return 0

    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0)
    const weights = positions.map(pos => pos.marketValue / totalValue)
    
    // 赫芬达尔指数
    return weights.reduce((sum, weight) => sum + weight * weight, 0)
  }

  /**
   * 计算基准绩效
   */
  private calculateBenchmarkPerformance(returns: number[]): StrategyPerformance {
    return {
      totalReturn: this.calculateAnnualizedReturn(returns),
      annualizedReturn: this.calculateAnnualizedReturn(returns),
      volatility: this.calculateVolatility(returns),
      sharpeRatio: this.calculateSharpeRatio(returns),
      maxDrawdown: this.calculateMaxDrawdown(returns),
      winRate: this.calculateWinRate(returns),
      profitFactor: this.calculateProfitFactor(returns),
      calmarRatio: 0,
      informationRatio: 0,
      beta: 1,
      alpha: 0,
      trackingError: 0
    }
  }

  /**
   * 计算上行捕获率
   */
  private calculateUpCapture(returns: number[], benchmarkReturns: number[]): number {
    const upPeriods = benchmarkReturns.map((ret, i) => ret > 0 ? { strategy: returns[i], benchmark: ret } : null)
      .filter(period => period !== null) as { strategy: number, benchmark: number }[]

    if (upPeriods.length === 0) return 0

    const strategyUpReturn = upPeriods.reduce((sum, period) => sum + period.strategy, 0) / upPeriods.length
    const benchmarkUpReturn = upPeriods.reduce((sum, period) => sum + period.benchmark, 0) / upPeriods.length

    return benchmarkUpReturn > 0 ? strategyUpReturn / benchmarkUpReturn : 0
  }

  /**
   * 计算下行捕获率
   */
  private calculateDownCapture(returns: number[], benchmarkReturns: number[]): number {
    const downPeriods = benchmarkReturns.map((ret, i) => ret < 0 ? { strategy: returns[i], benchmark: ret } : null)
      .filter(period => period !== null) as { strategy: number, benchmark: number }[]

    if (downPeriods.length === 0) return 0

    const strategyDownReturn = downPeriods.reduce((sum, period) => sum + period.strategy, 0) / downPeriods.length
    const benchmarkDownReturn = downPeriods.reduce((sum, period) => sum + period.benchmark, 0) / downPeriods.length

    return benchmarkDownReturn < 0 ? strategyDownReturn / benchmarkDownReturn : 0
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
   * 计算协方差
   */
  private calculateCovariance(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0

    const meanX = x.reduce((sum, val) => sum + val, 0) / x.length
    const meanY = y.reduce((sum, val) => sum + val, 0) / y.length

    return x.reduce((sum, val, i) => sum + (val - meanX) * (y[i] - meanY), 0) / x.length
  }

  /**
   * 计算方差
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  }
}

export { StrategyEvaluator }
export default StrategyEvaluator
