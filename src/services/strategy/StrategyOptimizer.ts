/**
 * 策略优化器
 * 用于优化策略参数，提高策略性能
 */

import type { StockData } from '@/types/stock'
import type { StrategyConfig } from './StrategyManager'
import type { BaseStrategy } from './strategies/BaseStrategy'

/**
 * 优化目标
 */
export type OptimizationObjective =
  | 'return' // 最大化收益
  | 'sharpe' // 最大化夏普比率
  | 'calmar' // 最大化卡尔玛比率
  | 'sortino' // 最大化索提诺比率
  | 'max_drawdown' // 最小化最大回撤
  | 'volatility' // 最小化波动率
  | 'var' // 最小化VaR
  | 'custom' // 自定义目标函数

/**
 * 优化方法
 */
export type OptimizationMethod =
  | 'grid_search' // 网格搜索
  | 'random_search' // 随机搜索
  | 'genetic' // 遗传算法
  | 'particle_swarm' // 粒子群优化
  | 'bayesian' // 贝叶斯优化
  | 'gradient_descent' // 梯度下降

/**
 * 参数范围定义
 */
export interface ParameterRange {
  name: string
  type: 'int' | 'float' | 'choice'
  min?: number
  max?: number
  step?: number
  choices?: any[]
  default?: any
}

/**
 * 优化约束
 */
export interface OptimizationConstraints {
  maxIterations: number
  maxTime: number // 最大优化时间（秒）
  convergenceThreshold: number
  minSampleSize: number
  crossValidationFolds: number
  walkForwardSteps: number
  outOfSampleRatio: number
}

/**
 * 优化配置
 */
export interface OptimizationConfig {
  objective: OptimizationObjective
  method: OptimizationMethod
  parameterRanges: ParameterRange[]
  constraints: OptimizationConstraints
  customObjective?: (result: OptimizationResult) => number
}

/**
 * 优化结果
 */
export interface OptimizationResult {
  parameters: Record<string, any>
  performance: {
    totalReturn: number
    annualizedReturn: number
    volatility: number
    sharpeRatio: number
    maxDrawdown: number
    calmarRatio: number
    sortinoRatio: number
    winRate: number
    profitFactor: number
    var95: number
    cvar95: number
  }
  backtest: {
    trades: number
    winningTrades: number
    losingTrades: number
    avgWin: number
    avgLoss: number
    maxConsecutiveWins: number
    maxConsecutiveLosses: number
  }
  robustness: {
    stability: number
    consistency: number
    outOfSamplePerformance: number
  }
  objectiveValue: number
  iteration: number
  timestamp: string
}

/**
 * 策略优化器实现
 */
export class StrategyOptimizer {
  private optimizationHistory: Map<string, OptimizationResult[]> = new Map()

  /**
   * 优化策略参数
   */
  async optimize(
    strategy: BaseStrategy,
    marketData: Map<string, StockData>,
    config: OptimizationConfig
  ): Promise<StrategyConfig> {
    console.log(`开始优化策略，目标: ${config.objective}, 方法: ${config.method}`)

    const startTime = Date.now()
    let bestResult: OptimizationResult | null = null
    const results: OptimizationResult[] = []

    try {
      switch (config.method) {
        case 'grid_search':
          bestResult = await this.gridSearch(strategy, marketData, config)
          break
        case 'random_search':
          bestResult = await this.randomSearch(strategy, marketData, config)
          break
        case 'genetic':
          bestResult = await this.geneticOptimization(strategy, marketData, config)
          break
        case 'bayesian':
          bestResult = await this.bayesianOptimization(strategy, marketData, config)
          break
        default:
          bestResult = await this.gridSearch(strategy, marketData, config)
      }

      if (!bestResult) {
        throw new Error('优化失败，未找到有效结果')
      }

      // 保存优化历史
      const strategyId = strategy.getConfig().id
      if (!this.optimizationHistory.has(strategyId)) {
        this.optimizationHistory.set(strategyId, [])
      }
      this.optimizationHistory.get(strategyId)!.push(bestResult)

      // 更新策略配置
      const updatedConfig = {
        ...strategy.getConfig(),
        parameters: bestResult.parameters,
        updatedAt: new Date().toISOString(),
      }

      const optimizationTime = (Date.now() - startTime) / 1000
      console.log(`策略优化完成，用时 ${optimizationTime.toFixed(2)} 秒`)
      console.log(`最优参数:`, bestResult.parameters)
      console.log(`目标函数值: ${bestResult.objectiveValue.toFixed(4)}`)

      return updatedConfig
    } catch (error) {
      console.error('策略优化失败:', error)
      throw error
    }
  }

  /**
   * 网格搜索优化
   */
  private async gridSearch(
    strategy: BaseStrategy,
    marketData: Map<string, StockData>,
    config: OptimizationConfig
  ): Promise<OptimizationResult> {
    console.log('执行网格搜索优化...')

    const parameterCombinations = this.generateParameterCombinations(config.parameterRanges)
    let bestResult: OptimizationResult | null = null
    let iteration = 0

    for (const params of parameterCombinations) {
      if (iteration >= config.constraints.maxIterations) break

      try {
        const result = await this.evaluateParameters(strategy, marketData, params, config)
        result.iteration = iteration

        if (!bestResult || result.objectiveValue > bestResult.objectiveValue) {
          bestResult = result
        }

        iteration++

        // 进度报告
        if (iteration % 10 === 0) {
          console.log(
            `网格搜索进度: ${iteration}/${Math.min(
              parameterCombinations.length,
              config.constraints.maxIterations
            )}`
          )
        }
      } catch (error) {
        console.warn(`参数组合 ${JSON.stringify(params)} 评估失败:`, error)
      }
    }

    if (!bestResult) {
      throw new Error('网格搜索未找到有效结果')
    }

    return bestResult
  }

  /**
   * 随机搜索优化
   */
  private async randomSearch(
    strategy: BaseStrategy,
    marketData: Map<string, StockData>,
    config: OptimizationConfig
  ): Promise<OptimizationResult> {
    console.log('执行随机搜索优化...')

    let bestResult: OptimizationResult | null = null
    let iteration = 0
    let noImprovementCount = 0

    while (iteration < config.constraints.maxIterations && noImprovementCount < 50) {
      try {
        const params = this.generateRandomParameters(config.parameterRanges)
        const result = await this.evaluateParameters(strategy, marketData, params, config)
        result.iteration = iteration

        if (!bestResult || result.objectiveValue > bestResult.objectiveValue) {
          bestResult = result
          noImprovementCount = 0
        } else {
          noImprovementCount++
        }

        iteration++

        // 进度报告
        if (iteration % 20 === 0) {
          console.log(
            `随机搜索进度: ${iteration}/${
              config.constraints.maxIterations
            }, 最优值: ${bestResult?.objectiveValue.toFixed(4)}`
          )
        }
      } catch (error) {
        console.warn(`随机参数评估失败:`, error)
      }
    }

    if (!bestResult) {
      throw new Error('随机搜索未找到有效结果')
    }

    return bestResult
  }

  /**
   * 遗传算法优化
   */
  private async geneticOptimization(
    strategy: BaseStrategy,
    marketData: Map<string, StockData>,
    config: OptimizationConfig
  ): Promise<OptimizationResult> {
    console.log('执行遗传算法优化...')

    const populationSize = 50
    const mutationRate = 0.1
    const crossoverRate = 0.8
    const eliteSize = 5

    // 初始化种群
    let population: OptimizationResult[] = []
    for (let i = 0; i < populationSize; i++) {
      const params = this.generateRandomParameters(config.parameterRanges)
      const result = await this.evaluateParameters(strategy, marketData, params, config)
      population.push(result)
    }

    let generation = 0
    let bestResult = population.reduce((best, current) =>
      current.objectiveValue > best.objectiveValue ? current : best
    )

    while (generation < config.constraints.maxIterations / populationSize) {
      // 选择
      population.sort((a, b) => b.objectiveValue - a.objectiveValue)

      // 精英保留
      const newPopulation = population.slice(0, eliteSize)

      // 交叉和变异
      while (newPopulation.length < populationSize) {
        const parent1 = this.tournamentSelection(population)
        const parent2 = this.tournamentSelection(population)

        let offspring = parent1
        if (Math.random() < crossoverRate) {
          offspring = this.crossover(parent1, parent2, config.parameterRanges)
        }

        if (Math.random() < mutationRate) {
          offspring = this.mutate(offspring, config.parameterRanges)
        }

        try {
          const result = await this.evaluateParameters(
            strategy,
            marketData,
            offspring.parameters,
            config
          )
          newPopulation.push(result)
        } catch (error) {
          // 如果评估失败，使用父代
          newPopulation.push(parent1)
        }
      }

      population = newPopulation
      const currentBest = population.reduce((best, current) =>
        current.objectiveValue > best.objectiveValue ? current : best
      )

      if (currentBest.objectiveValue > bestResult.objectiveValue) {
        bestResult = currentBest
      }

      generation++
      console.log(`遗传算法第 ${generation} 代，最优值: ${bestResult.objectiveValue.toFixed(4)}`)
    }

    return bestResult
  }

  /**
   * 贝叶斯优化
   */
  private async bayesianOptimization(
    strategy: BaseStrategy,
    marketData: Map<string, StockData>,
    config: OptimizationConfig
  ): Promise<OptimizationResult> {
    console.log('执行贝叶斯优化...')

    // 简化的贝叶斯优化实现
    // 实际应用中应该使用专业的贝叶斯优化库

    const initialSamples = 10
    const acquisitionSamples = 100

    // 初始随机采样
    const samples: OptimizationResult[] = []
    for (let i = 0; i < initialSamples; i++) {
      const params = this.generateRandomParameters(config.parameterRanges)
      const result = await this.evaluateParameters(strategy, marketData, params, config)
      samples.push(result)
    }

    let bestResult = samples.reduce((best, current) =>
      current.objectiveValue > best.objectiveValue ? current : best
    )

    // 迭代优化
    for (
      let iteration = 0;
      iteration < config.constraints.maxIterations - initialSamples;
      iteration++
    ) {
      // 简化的采集函数：在最优点附近搜索
      const candidates: OptimizationResult[] = []

      for (let i = 0; i < acquisitionSamples; i++) {
        const params = this.generateParametersNearBest(
          bestResult.parameters,
          config.parameterRanges
        )
        try {
          const result = await this.evaluateParameters(strategy, marketData, params, config)
          candidates.push(result)
        } catch (error) {
          // 忽略评估失败的候选
        }
      }

      if (candidates.length > 0) {
        const newBest = candidates.reduce((best, current) =>
          current.objectiveValue > best.objectiveValue ? current : best
        )

        if (newBest.objectiveValue > bestResult.objectiveValue) {
          bestResult = newBest
          console.log(
            `贝叶斯优化第 ${iteration + 1} 轮，新最优值: ${bestResult.objectiveValue.toFixed(4)}`
          )
        }

        samples.push(...candidates)
      }
    }

    return bestResult
  }

  /**
   * 评估参数组合
   */
  private async evaluateParameters(
    strategy: BaseStrategy,
    marketData: Map<string, StockData>,
    parameters: Record<string, any>,
    config: OptimizationConfig
  ): Promise<OptimizationResult> {
    // 更新策略参数
    const originalConfig = strategy.getConfig()
    strategy.updateConfig({ parameters })

    try {
      // 执行回测
      const backtestResult = await this.runBacktest(strategy, marketData)

      // 计算目标函数值
      const objectiveValue = this.calculateObjectiveValue(backtestResult, config)

      return {
        parameters,
        performance: backtestResult.performance,
        backtest: backtestResult.backtest,
        robustness: backtestResult.robustness,
        objectiveValue,
        iteration: 0,
        timestamp: new Date().toISOString(),
      }
    } finally {
      // 恢复原始配置
      strategy.updateConfig(originalConfig)
    }
  }

  /**
   * 运行回测
   */
  private async runBacktest(
    strategy: BaseStrategy,
    marketData: Map<string, StockData>
  ): Promise<{
    performance: OptimizationResult['performance']
    backtest: OptimizationResult['backtest']
    robustness: OptimizationResult['robustness']
  }> {
    // 简化的回测实现
    // 实际应用中应该使用专业的回测引擎

    const result = await strategy.execute(marketData)

    // 模拟性能指标
    const performance = {
      totalReturn: Math.random() * 0.3 - 0.1, // -10% to 20%
      annualizedReturn: Math.random() * 0.25 - 0.05, // -5% to 20%
      volatility: Math.random() * 0.3 + 0.1, // 10% to 40%
      sharpeRatio: Math.random() * 2 - 0.5, // -0.5 to 1.5
      maxDrawdown: Math.random() * 0.3 + 0.05, // 5% to 35%
      calmarRatio: Math.random() * 1.5,
      sortinoRatio: Math.random() * 2,
      winRate: Math.random() * 0.4 + 0.4, // 40% to 80%
      profitFactor: Math.random() * 2 + 0.5, // 0.5 to 2.5
      var95: Math.random() * 0.1 + 0.02, // 2% to 12%
      cvar95: Math.random() * 0.15 + 0.03, // 3% to 18%
    }

    const backtest = {
      trades: Math.floor(Math.random() * 100) + 20,
      winningTrades: Math.floor(Math.random() * 60) + 10,
      losingTrades: Math.floor(Math.random() * 40) + 5,
      avgWin: Math.random() * 0.05 + 0.01,
      avgLoss: Math.random() * 0.03 + 0.005,
      maxConsecutiveWins: Math.floor(Math.random() * 8) + 1,
      maxConsecutiveLosses: Math.floor(Math.random() * 6) + 1,
    }

    const robustness = {
      stability: Math.random() * 0.5 + 0.5,
      consistency: Math.random() * 0.4 + 0.6,
      outOfSamplePerformance: Math.random() * 0.3 + 0.7,
    }

    return { performance, backtest, robustness }
  }

  /**
   * 计算目标函数值
   */
  private calculateObjectiveValue(
    result: {
      performance: OptimizationResult['performance']
      backtest: OptimizationResult['backtest']
      robustness: OptimizationResult['robustness']
    },
    config: OptimizationConfig
  ): number {
    if (config.customObjective) {
      return config.customObjective(result as OptimizationResult)
    }

    switch (config.objective) {
      case 'return':
        return result.performance.annualizedReturn

      case 'sharpe':
        return result.performance.sharpeRatio

      case 'calmar':
        return result.performance.calmarRatio

      case 'sortino':
        return result.performance.sortinoRatio

      case 'max_drawdown':
        return -result.performance.maxDrawdown // 负值，因为要最小化

      case 'volatility':
        return -result.performance.volatility // 负值，因为要最小化

      case 'var':
        return -result.performance.var95 // 负值，因为要最小化

      default:
        return result.performance.sharpeRatio
    }
  }

  /**
   * 生成参数组合
   */
  private generateParameterCombinations(ranges: ParameterRange[]): Record<string, any>[] {
    const combinations: Record<string, any>[] = []

    const generateCombinations = (index: number, current: Record<string, any>) => {
      if (index >= ranges.length) {
        combinations.push({ ...current })
        return
      }

      const range = ranges[index]
      let values: any[] = []

      if (range.type === 'choice') {
        values = range.choices || []
      } else if (range.type === 'int') {
        const min = range.min || 0
        const max = range.max || 100
        const step = range.step || 1
        for (let i = min; i <= max; i += step) {
          values.push(i)
        }
      } else if (range.type === 'float') {
        const min = range.min || 0
        const max = range.max || 1
        const step = range.step || 0.1
        for (let i = min; i <= max; i += step) {
          values.push(parseFloat(i.toFixed(2)))
        }
      }

      values.forEach((value) => {
        current[range.name] = value
        generateCombinations(index + 1, current)
      })
    }

    generateCombinations(0, {})
    return combinations
  }

  /**
   * 生成随机参数
   */
  private generateRandomParameters(ranges: ParameterRange[]): Record<string, any> {
    const params: Record<string, any> = {}

    ranges.forEach((range) => {
      if (range.type === 'choice') {
        const choices = range.choices || []
        params[range.name] = choices[Math.floor(Math.random() * choices.length)]
      } else if (range.type === 'int') {
        const min = range.min || 0
        const max = range.max || 100
        params[range.name] = Math.floor(Math.random() * (max - min + 1)) + min
      } else if (range.type === 'float') {
        const min = range.min || 0
        const max = range.max || 1
        params[range.name] = Math.random() * (max - min) + min
      }
    })

    return params
  }

  /**
   * 在最优点附近生成参数
   */
  private generateParametersNearBest(
    bestParams: Record<string, any>,
    ranges: ParameterRange[]
  ): Record<string, any> {
    const params: Record<string, any> = { ...bestParams }

    ranges.forEach((range) => {
      const currentValue = bestParams[range.name]

      if (range.type === 'int') {
        const min = range.min || 0
        const max = range.max || 100
        const perturbation = Math.floor((Math.random() - 0.5) * 10)
        params[range.name] = Math.max(min, Math.min(max, currentValue + perturbation))
      } else if (range.type === 'float') {
        const min = range.min || 0
        const max = range.max || 1
        const perturbation = (Math.random() - 0.5) * 0.2
        params[range.name] = Math.max(min, Math.min(max, currentValue + perturbation))
      }
    })

    return params
  }

  /**
   * 锦标赛选择
   */
  private tournamentSelection(
    population: OptimizationResult[],
    tournamentSize: number = 3
  ): OptimizationResult {
    const tournament = []
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * population.length)
      tournament.push(population[randomIndex])
    }

    return tournament.reduce((best, current) =>
      current.objectiveValue > best.objectiveValue ? current : best
    )
  }

  /**
   * 交叉操作
   */
  private crossover(
    parent1: OptimizationResult,
    parent2: OptimizationResult,
    ranges: ParameterRange[]
  ): OptimizationResult {
    const offspring = { ...parent1 }

    ranges.forEach((range) => {
      if (Math.random() < 0.5) {
        offspring.parameters[range.name] = parent2.parameters[range.name]
      }
    })

    return offspring
  }

  /**
   * 变异操作
   */
  private mutate(individual: OptimizationResult, ranges: ParameterRange[]): OptimizationResult {
    const mutated = { ...individual }

    ranges.forEach((range) => {
      if (Math.random() < 0.1) {
        // 10%变异概率
        if (range.type === 'choice') {
          const choices = range.choices || []
          mutated.parameters[range.name] = choices[Math.floor(Math.random() * choices.length)]
        } else if (range.type === 'int') {
          const min = range.min || 0
          const max = range.max || 100
          mutated.parameters[range.name] = Math.floor(Math.random() * (max - min + 1)) + min
        } else if (range.type === 'float') {
          const min = range.min || 0
          const max = range.max || 1
          mutated.parameters[range.name] = Math.random() * (max - min) + min
        }
      }
    })

    return mutated
  }

  /**
   * 获取优化历史
   */
  getOptimizationHistory(strategyId: string): OptimizationResult[] {
    return this.optimizationHistory.get(strategyId) || []
  }

  /**
   * 清除优化历史
   */
  clearOptimizationHistory(strategyId?: string): void {
    if (strategyId) {
      this.optimizationHistory.delete(strategyId)
    } else {
      this.optimizationHistory.clear()
    }
  }
}

export { StrategyOptimizer }
export default StrategyOptimizer
