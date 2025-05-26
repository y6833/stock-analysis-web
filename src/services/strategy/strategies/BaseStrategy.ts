/**
 * 策略基类
 * 定义所有策略的通用接口和基础功能
 */

import type { StockData } from '@/types/stock'
import type { FeatureMatrix } from '@/services/featureEngineering/FeatureEngineManager'
import type { StrategyConfig, StrategySignal, StrategyPosition } from '../StrategyManager'

/**
 * 策略执行上下文
 */
export interface StrategyContext {
  currentDate: string
  marketData: Map<string, StockData>
  featureMatrix?: Map<string, FeatureMatrix>
  positions: Map<string, StrategyPosition>
  cash: number
  totalValue: number
  benchmark: StockData
}

/**
 * 策略执行结果
 */
export interface StrategyExecutionResult {
  signals: StrategySignal[]
  positions: StrategyPosition[]
  cash: number
  totalValue: number
  confidence?: number
  metadata?: Record<string, any>
}

/**
 * 风险控制参数
 */
export interface RiskControlParams {
  maxPositionSize: number // 最大单个持仓比例
  maxDrawdown: number // 最大回撤限制
  stopLoss: number // 止损比例
  takeProfit: number // 止盈比例
  maxLeverage: number // 最大杠杆
  concentrationLimit: number // 集中度限制
  sectorLimit: number // 行业集中度限制
}

/**
 * 策略基类
 */
export abstract class BaseStrategy {
  protected config: StrategyConfig
  protected riskControl: RiskControlParams
  protected executionHistory: StrategyExecutionResult[] = []

  constructor(config: StrategyConfig) {
    this.config = config
    this.riskControl = this.getDefaultRiskControl()
  }

  /**
   * 策略执行主方法（抽象方法，子类必须实现）
   */
  abstract execute(
    marketData: Map<string, StockData>,
    featureMatrix?: Map<string, FeatureMatrix>
  ): Promise<StrategyExecutionResult>

  /**
   * 生成交易信号（抽象方法，子类必须实现）
   */
  abstract generateSignals(context: StrategyContext): Promise<StrategySignal[]>

  /**
   * 更新持仓（通用方法）
   */
  protected updatePositions(
    currentPositions: Map<string, StrategyPosition>,
    signals: StrategySignal[],
    marketData: Map<string, StockData>
  ): StrategyPosition[] {
    const newPositions = new Map(currentPositions)

    signals.forEach(signal => {
      const stockData = marketData.get(signal.symbol)
      if (!stockData) return

      const currentPrice = stockData.prices[stockData.prices.length - 1]
      const existingPosition = newPositions.get(signal.symbol)

      switch (signal.action) {
        case 'buy':
          if (existingPosition) {
            // 加仓
            const totalQuantity = existingPosition.quantity + signal.quantity
            const totalCost = existingPosition.avgPrice * existingPosition.quantity + 
                            currentPrice * signal.quantity
            existingPosition.quantity = totalQuantity
            existingPosition.avgPrice = totalCost / totalQuantity
            existingPosition.currentPrice = currentPrice
            existingPosition.marketValue = totalQuantity * currentPrice
            existingPosition.unrealizedPnL = (currentPrice - existingPosition.avgPrice) * totalQuantity
          } else {
            // 新建仓位
            newPositions.set(signal.symbol, {
              symbol: signal.symbol,
              quantity: signal.quantity,
              avgPrice: currentPrice,
              currentPrice,
              marketValue: signal.quantity * currentPrice,
              unrealizedPnL: 0,
              weight: 0, // 将在后续计算
              holdingPeriod: 0
            })
          }
          break

        case 'sell':
          if (existingPosition) {
            if (signal.quantity >= existingPosition.quantity) {
              // 全部卖出
              newPositions.delete(signal.symbol)
            } else {
              // 部分卖出
              existingPosition.quantity -= signal.quantity
              existingPosition.marketValue = existingPosition.quantity * currentPrice
              existingPosition.unrealizedPnL = (currentPrice - existingPosition.avgPrice) * existingPosition.quantity
            }
          }
          break

        case 'hold':
          if (existingPosition) {
            // 更新当前价格和市值
            existingPosition.currentPrice = currentPrice
            existingPosition.marketValue = existingPosition.quantity * currentPrice
            existingPosition.unrealizedPnL = (currentPrice - existingPosition.avgPrice) * existingPosition.quantity
            existingPosition.holdingPeriod += 1
          }
          break
      }
    })

    // 计算权重
    const totalValue = Array.from(newPositions.values())
      .reduce((sum, pos) => sum + pos.marketValue, 0)

    newPositions.forEach(position => {
      position.weight = totalValue > 0 ? position.marketValue / totalValue : 0
    })

    return Array.from(newPositions.values())
  }

  /**
   * 风险控制检查
   */
  protected applyRiskControl(
    signals: StrategySignal[],
    currentPositions: Map<string, StrategyPosition>,
    totalValue: number
  ): StrategySignal[] {
    const filteredSignals: StrategySignal[] = []

    signals.forEach(signal => {
      // 检查单个持仓限制
      if (signal.action === 'buy') {
        const positionValue = signal.price * signal.quantity
        const positionWeight = positionValue / totalValue

        if (positionWeight > this.riskControl.maxPositionSize) {
          // 调整仓位大小
          const maxQuantity = Math.floor(
            (totalValue * this.riskControl.maxPositionSize) / signal.price
          )
          signal.quantity = Math.min(signal.quantity, maxQuantity)
        }
      }

      // 检查止损止盈
      const existingPosition = currentPositions.get(signal.symbol)
      if (existingPosition && signal.action === 'hold') {
        const returnRate = (signal.price - existingPosition.avgPrice) / existingPosition.avgPrice

        // 止损检查
        if (returnRate <= -this.riskControl.stopLoss) {
          signal.action = 'sell'
          signal.quantity = existingPosition.quantity
          signal.reason = '触发止损'
        }

        // 止盈检查
        if (returnRate >= this.riskControl.takeProfit) {
          signal.action = 'sell'
          signal.quantity = existingPosition.quantity
          signal.reason = '触发止盈'
        }
      }

      filteredSignals.push(signal)
    })

    return filteredSignals
  }

  /**
   * 计算策略置信度
   */
  protected calculateConfidence(
    signals: StrategySignal[],
    marketData: Map<string, StockData>
  ): number {
    if (signals.length === 0) return 0

    const avgConfidence = signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length
    const avgStrength = signals.reduce((sum, signal) => sum + signal.strength, 0) / signals.length

    // 考虑数据质量
    let dataQuality = 0
    let count = 0
    marketData.forEach(data => {
      const validPrices = data.prices.filter(p => !isNaN(p) && p > 0).length
      dataQuality += validPrices / data.prices.length
      count++
    })
    dataQuality = count > 0 ? dataQuality / count : 0

    return (avgConfidence * 0.4 + avgStrength * 0.4 + dataQuality * 0.2)
  }

  /**
   * 获取策略配置
   */
  getConfig(): StrategyConfig {
    return this.config
  }

  /**
   * 更新策略配置
   */
  updateConfig(updates: Partial<StrategyConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      updatedAt: new Date().toISOString()
    }
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(): StrategyExecutionResult[] {
    return this.executionHistory
  }

  /**
   * 清空执行历史
   */
  clearExecutionHistory(): void {
    this.executionHistory = []
  }

  /**
   * 获取策略统计信息
   */
  getStatistics(): {
    totalExecutions: number
    avgConfidence: number
    avgSignalCount: number
    avgPositionCount: number
    lastExecution: string | null
  } {
    const history = this.executionHistory
    
    if (history.length === 0) {
      return {
        totalExecutions: 0,
        avgConfidence: 0,
        avgSignalCount: 0,
        avgPositionCount: 0,
        lastExecution: null
      }
    }

    const avgConfidence = history.reduce((sum, result) => 
      sum + (result.confidence || 0), 0) / history.length

    const avgSignalCount = history.reduce((sum, result) => 
      sum + result.signals.length, 0) / history.length

    const avgPositionCount = history.reduce((sum, result) => 
      sum + result.positions.length, 0) / history.length

    return {
      totalExecutions: history.length,
      avgConfidence,
      avgSignalCount,
      avgPositionCount,
      lastExecution: new Date().toISOString()
    }
  }

  /**
   * 验证策略参数
   */
  protected validateParameters(): boolean {
    // 基础参数验证
    if (!this.config.name || !this.config.type) {
      console.error('策略名称和类型不能为空')
      return false
    }

    if (!this.config.universe || this.config.universe.length === 0) {
      console.warn('策略股票池为空，将使用默认股票池')
    }

    return true
  }

  /**
   * 获取默认风险控制参数
   */
  private getDefaultRiskControl(): RiskControlParams {
    return {
      maxPositionSize: 0.1, // 单个持仓不超过10%
      maxDrawdown: 0.2, // 最大回撤20%
      stopLoss: 0.1, // 止损10%
      takeProfit: 0.3, // 止盈30%
      maxLeverage: 1.0, // 不使用杠杆
      concentrationLimit: 0.3, // 集中度限制30%
      sectorLimit: 0.4 // 行业集中度限制40%
    }
  }

  /**
   * 设置风险控制参数
   */
  setRiskControl(params: Partial<RiskControlParams>): void {
    this.riskControl = {
      ...this.riskControl,
      ...params
    }
  }

  /**
   * 获取风险控制参数
   */
  getRiskControl(): RiskControlParams {
    return this.riskControl
  }

  /**
   * 策略预热（可选实现）
   */
  async warmUp(marketData: Map<string, StockData>): Promise<void> {
    // 默认实现为空，子类可以重写
    console.log(`策略 ${this.config.name} 预热完成`)
  }

  /**
   * 策略清理（可选实现）
   */
  async cleanup(): Promise<void> {
    // 默认实现为空，子类可以重写
    console.log(`策略 ${this.config.name} 清理完成`)
  }
}

export default BaseStrategy
