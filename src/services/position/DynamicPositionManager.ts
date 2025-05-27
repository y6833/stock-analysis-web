/**
 * 动态仓位管理器
 * 基于波动率和风险指标的智能仓位调整
 */

export interface PositionData {
  symbol: string
  quantity: number
  averagePrice: number
  currentPrice: number
  marketValue: number
  weight: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  volatility: number
  beta: number
  lastUpdateTime: string
}

export interface PortfolioData {
  totalValue: number
  cash: number
  marketValue: number
  positions: PositionData[]
  portfolioVolatility: number
  portfolioBeta: number
  sharpeRatio: number
  maxDrawdown: number
  dailyReturn: number
}

export interface VolatilityTargetParams {
  targetVolatility: number        // 目标波动率
  lookbackPeriod: number         // 回望期
  rebalanceThreshold: number     // 再平衡阈值
  maxPositionWeight: number      // 最大单仓权重
  minPositionWeight: number      // 最小单仓权重
  volatilityFloor: number        // 波动率下限
  volatilityCeiling: number      // 波动率上限
}

export interface RiskControlParams {
  maxDrawdown: number            // 最大回撤限制
  stopLossPercent: number        // 止损百分比
  takeProfitPercent: number      // 止盈百分比
  correlationThreshold: number   // 相关性阈值
  concentrationLimit: number     // 集中度限制
  leverageLimit: number          // 杠杆限制
}

export interface AdjustmentSignal {
  symbol: string
  currentWeight: number
  targetWeight: number
  currentQuantity: number
  targetQuantity: number
  action: 'buy' | 'sell' | 'hold' | 'close'
  urgency: 'low' | 'medium' | 'high' | 'critical'
  reason: string
  expectedImpact: number
  confidence: number
}

export interface MarketRegime {
  volatilityLevel: 'low' | 'medium' | 'high' | 'extreme'
  trendDirection: 'bull' | 'bear' | 'sideways'
  correlationLevel: 'low' | 'medium' | 'high'
  liquidityCondition: 'normal' | 'stressed' | 'crisis'
}

export interface RiskMetrics {
  portfolioVaR: number
  expectedShortfall: number
  trackingError: number
  informationRatio: number
  calmarRatio: number
  sortinoRatio: number
  maxDrawdownDuration: number
  winRate: number
}

export class DynamicPositionManager {
  private volatilityTargetParams: VolatilityTargetParams
  private riskControlParams: RiskControlParams
  private historicalData: Map<string, number[]> = new Map()
  private lastAdjustmentTime: string = ''

  constructor(
    volatilityParams: VolatilityTargetParams,
    riskParams: RiskControlParams
  ) {
    this.volatilityTargetParams = volatilityParams
    this.riskControlParams = riskParams
  }

  /**
   * 计算动态仓位调整信号
   */
  calculateAdjustmentSignals(
    portfolio: PortfolioData,
    marketRegime: MarketRegime
  ): AdjustmentSignal[] {
    const signals: AdjustmentSignal[] = []

    // 1. 波动率目标调整
    const volatilitySignals = this.calculateVolatilityTargetAdjustments(portfolio, marketRegime)
    signals.push(...volatilitySignals)

    // 2. 风险控制调整
    const riskSignals = this.calculateRiskControlAdjustments(portfolio)
    signals.push(...riskSignals)

    // 3. 市场环境适应性调整
    const regimeSignals = this.calculateRegimeBasedAdjustments(portfolio, marketRegime)
    signals.push(...regimeSignals)

    // 4. 合并和优化信号
    return this.optimizeSignals(signals)
  }

  /**
   * 基于波动率目标的仓位调整
   */
  private calculateVolatilityTargetAdjustments(
    portfolio: PortfolioData,
    marketRegime: MarketRegime
  ): AdjustmentSignal[] {
    const signals: AdjustmentSignal[] = []
    const currentVol = portfolio.portfolioVolatility
    const targetVol = this.getAdjustedTargetVolatility(marketRegime)

    // 计算波动率偏差
    const volDeviation = (currentVol - targetVol) / targetVol

    if (Math.abs(volDeviation) > this.volatilityTargetParams.rebalanceThreshold) {
      // 需要调整仓位
      const scalingFactor = targetVol / currentVol

      portfolio.positions.forEach(position => {
        const currentWeight = position.weight
        const targetWeight = Math.min(
          Math.max(currentWeight * scalingFactor, this.volatilityTargetParams.minPositionWeight),
          this.volatilityTargetParams.maxPositionWeight
        )

        if (Math.abs(targetWeight - currentWeight) > 0.01) { // 1%阈值
          const targetQuantity = Math.floor(
            (targetWeight * portfolio.totalValue) / position.currentPrice / 100
          ) * 100

          signals.push({
            symbol: position.symbol,
            currentWeight,
            targetWeight,
            currentQuantity: position.quantity,
            targetQuantity,
            action: targetQuantity > position.quantity ? 'buy' : 'sell',
            urgency: this.getVolatilityUrgency(Math.abs(volDeviation)),
            reason: `波动率调整: 当前${(currentVol * 100).toFixed(2)}% → 目标${(targetVol * 100).toFixed(2)}%`,
            expectedImpact: Math.abs(targetWeight - currentWeight),
            confidence: this.calculateVolatilityConfidence(position, marketRegime)
          })
        }
      })
    }

    return signals
  }

  /**
   * 基于风险控制的仓位调整
   */
  private calculateRiskControlAdjustments(portfolio: PortfolioData): AdjustmentSignal[] {
    const signals: AdjustmentSignal[] = []

    portfolio.positions.forEach(position => {
      // 止损检查
      if (position.unrealizedPnLPercent <= -this.riskControlParams.stopLossPercent) {
        signals.push({
          symbol: position.symbol,
          currentWeight: position.weight,
          targetWeight: 0,
          currentQuantity: position.quantity,
          targetQuantity: 0,
          action: 'close',
          urgency: 'critical',
          reason: `触发止损: 亏损${(position.unrealizedPnLPercent * 100).toFixed(2)}%`,
          expectedImpact: position.weight,
          confidence: 0.95
        })
      }

      // 止盈检查
      if (position.unrealizedPnLPercent >= this.riskControlParams.takeProfitPercent) {
        const reduceRatio = 0.5 // 减仓50%
        const targetQuantity = Math.floor(position.quantity * (1 - reduceRatio) / 100) * 100
        const targetWeight = (targetQuantity * position.currentPrice) / portfolio.totalValue

        signals.push({
          symbol: position.symbol,
          currentWeight: position.weight,
          targetWeight,
          currentQuantity: position.quantity,
          targetQuantity,
          action: 'sell',
          urgency: 'medium',
          reason: `触发止盈: 盈利${(position.unrealizedPnLPercent * 100).toFixed(2)}%`,
          expectedImpact: position.weight - targetWeight,
          confidence: 0.8
        })
      }

      // 集中度检查
      if (position.weight > this.riskControlParams.concentrationLimit) {
        const targetWeight = this.riskControlParams.concentrationLimit
        const targetQuantity = Math.floor(
          (targetWeight * portfolio.totalValue) / position.currentPrice / 100
        ) * 100

        signals.push({
          symbol: position.symbol,
          currentWeight: position.weight,
          targetWeight,
          currentQuantity: position.quantity,
          targetQuantity,
          action: 'sell',
          urgency: 'high',
          reason: `集中度过高: ${(position.weight * 100).toFixed(2)}% > ${(this.riskControlParams.concentrationLimit * 100).toFixed(2)}%`,
          expectedImpact: position.weight - targetWeight,
          confidence: 0.9
        })
      }
    })

    // 最大回撤检查
    if (portfolio.maxDrawdown > this.riskControlParams.maxDrawdown) {
      // 全面减仓
      portfolio.positions.forEach(position => {
        const reduceRatio = 0.3 // 减仓30%
        const targetQuantity = Math.floor(position.quantity * (1 - reduceRatio) / 100) * 100
        const targetWeight = (targetQuantity * position.currentPrice) / portfolio.totalValue

        signals.push({
          symbol: position.symbol,
          currentWeight: position.weight,
          targetWeight,
          currentQuantity: position.quantity,
          targetQuantity,
          action: 'sell',
          urgency: 'critical',
          reason: `最大回撤超限: ${(portfolio.maxDrawdown * 100).toFixed(2)}%`,
          expectedImpact: position.weight - targetWeight,
          confidence: 0.95
        })
      })
    }

    return signals
  }

  /**
   * 基于市场环境的适应性调整
   */
  private calculateRegimeBasedAdjustments(
    portfolio: PortfolioData,
    marketRegime: MarketRegime
  ): AdjustmentSignal[] {
    const signals: AdjustmentSignal[] = []

    // 根据市场环境调整策略
    switch (marketRegime.volatilityLevel) {
      case 'extreme':
        // 极端波动环境：大幅减仓
        return this.generateDefensiveSignals(portfolio, 0.5, '极端波动环境防御')

      case 'high':
        // 高波动环境：适度减仓
        return this.generateDefensiveSignals(portfolio, 0.2, '高波动环境调整')

      case 'low':
        // 低波动环境：可以适度加仓
        if (portfolio.cash / portfolio.totalValue > 0.2) {
          return this.generateAggressiveSignals(portfolio, 0.1, '低波动环境机会')
        }
        break
    }

    // 根据趋势方向调整
    if (marketRegime.trendDirection === 'bear') {
      // 熊市：保守策略
      return this.generateDefensiveSignals(portfolio, 0.3, '熊市防御')
    }

    // 根据相关性调整
    if (marketRegime.correlationLevel === 'high') {
      // 高相关性：增加分散化
      return this.generateDiversificationSignals(portfolio, '高相关性分散化')
    }

    return signals
  }

  /**
   * 生成防御性信号
   */
  private generateDefensiveSignals(
    portfolio: PortfolioData,
    reduceRatio: number,
    reason: string
  ): AdjustmentSignal[] {
    return portfolio.positions.map(position => {
      const targetQuantity = Math.floor(position.quantity * (1 - reduceRatio) / 100) * 100
      const targetWeight = (targetQuantity * position.currentPrice) / portfolio.totalValue

      return {
        symbol: position.symbol,
        currentWeight: position.weight,
        targetWeight,
        currentQuantity: position.quantity,
        targetQuantity,
        action: 'sell' as const,
        urgency: 'high' as const,
        reason,
        expectedImpact: position.weight - targetWeight,
        confidence: 0.8
      }
    })
  }

  /**
   * 生成进攻性信号
   */
  private generateAggressiveSignals(
    portfolio: PortfolioData,
    increaseRatio: number,
    reason: string
  ): AdjustmentSignal[] {
    return portfolio.positions
      .filter(position => position.weight < this.volatilityTargetParams.maxPositionWeight)
      .map(position => {
        const maxIncrease = this.volatilityTargetParams.maxPositionWeight - position.weight
        const actualIncrease = Math.min(increaseRatio, maxIncrease)
        const targetWeight = position.weight + actualIncrease
        const targetQuantity = Math.floor(
          (targetWeight * portfolio.totalValue) / position.currentPrice / 100
        ) * 100

        return {
          symbol: position.symbol,
          currentWeight: position.weight,
          targetWeight,
          currentQuantity: position.quantity,
          targetQuantity,
          action: 'buy' as const,
          urgency: 'medium' as const,
          reason,
          expectedImpact: actualIncrease,
          confidence: 0.7
        }
      })
  }

  /**
   * 生成分散化信号
   */
  private generateDiversificationSignals(
    portfolio: PortfolioData,
    reason: string
  ): AdjustmentSignal[] {
    const signals: AdjustmentSignal[] = []
    const avgWeight = 1 / portfolio.positions.length

    portfolio.positions.forEach(position => {
      const deviation = position.weight - avgWeight
      if (Math.abs(deviation) > 0.05) { // 5%偏差阈值
        const targetWeight = avgWeight
        const targetQuantity = Math.floor(
          (targetWeight * portfolio.totalValue) / position.currentPrice / 100
        ) * 100

        signals.push({
          symbol: position.symbol,
          currentWeight: position.weight,
          targetWeight,
          currentQuantity: position.quantity,
          targetQuantity,
          action: targetQuantity > position.quantity ? 'buy' : 'sell',
          urgency: 'medium',
          reason,
          expectedImpact: Math.abs(deviation),
          confidence: 0.75
        })
      }
    })

    return signals
  }

  /**
   * 优化和合并信号
   */
  private optimizeSignals(signals: AdjustmentSignal[]): AdjustmentSignal[] {
    // 按股票分组
    const signalsBySymbol = new Map<string, AdjustmentSignal[]>()
    
    signals.forEach(signal => {
      if (!signalsBySymbol.has(signal.symbol)) {
        signalsBySymbol.set(signal.symbol, [])
      }
      signalsBySymbol.get(signal.symbol)!.push(signal)
    })

    // 合并同一股票的信号
    const optimizedSignals: AdjustmentSignal[] = []
    
    signalsBySymbol.forEach((symbolSignals, symbol) => {
      if (symbolSignals.length === 1) {
        optimizedSignals.push(symbolSignals[0])
      } else {
        // 合并多个信号
        const mergedSignal = this.mergeSignals(symbolSignals)
        optimizedSignals.push(mergedSignal)
      }
    })

    // 按紧急程度排序
    return optimizedSignals.sort((a, b) => {
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
    })
  }

  /**
   * 合并同一股票的多个信号
   */
  private mergeSignals(signals: AdjustmentSignal[]): AdjustmentSignal {
    // 选择最高优先级的信号作为基础
    const prioritySignal = signals.reduce((prev, current) => {
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return urgencyOrder[current.urgency] > urgencyOrder[prev.urgency] ? current : prev
    })

    // 合并原因
    const reasons = signals.map(s => s.reason).join('; ')
    
    // 计算平均置信度
    const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length

    return {
      ...prioritySignal,
      reason: reasons,
      confidence: avgConfidence
    }
  }

  /**
   * 计算调整后的目标波动率
   */
  private getAdjustedTargetVolatility(marketRegime: MarketRegime): number {
    let adjustedTarget = this.volatilityTargetParams.targetVolatility

    // 根据市场环境调整目标波动率
    switch (marketRegime.volatilityLevel) {
      case 'extreme':
        adjustedTarget *= 0.5 // 极端环境下降低目标波动率
        break
      case 'high':
        adjustedTarget *= 0.7
        break
      case 'low':
        adjustedTarget *= 1.2 // 低波动环境可以提高目标
        break
    }

    // 应用波动率上下限
    return Math.max(
      this.volatilityTargetParams.volatilityFloor,
      Math.min(adjustedTarget, this.volatilityTargetParams.volatilityCeiling)
    )
  }

  /**
   * 获取波动率调整的紧急程度
   */
  private getVolatilityUrgency(deviation: number): 'low' | 'medium' | 'high' | 'critical' {
    if (deviation > 0.5) return 'critical'
    if (deviation > 0.3) return 'high'
    if (deviation > 0.15) return 'medium'
    return 'low'
  }

  /**
   * 计算波动率调整的置信度
   */
  private calculateVolatilityConfidence(position: PositionData, marketRegime: MarketRegime): number {
    let confidence = 0.7 // 基础置信度

    // 根据历史波动率稳定性调整
    const historicalVol = this.calculateHistoricalVolatility(position.symbol)
    if (historicalVol) {
      const volStability = 1 - Math.abs(position.volatility - historicalVol) / historicalVol
      confidence += volStability * 0.2
    }

    // 根据市场环境调整
    if (marketRegime.liquidityCondition === 'normal') {
      confidence += 0.1
    } else if (marketRegime.liquidityCondition === 'crisis') {
      confidence -= 0.2
    }

    return Math.max(0.3, Math.min(confidence, 0.95))
  }

  /**
   * 计算历史波动率
   */
  private calculateHistoricalVolatility(symbol: string): number | null {
    const prices = this.historicalData.get(symbol)
    if (!prices || prices.length < 30) return null

    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    
    return Math.sqrt(variance * 252) // 年化波动率
  }

  /**
   * 更新历史数据
   */
  updateHistoricalData(symbol: string, prices: number[]): void {
    this.historicalData.set(symbol, prices)
  }

  /**
   * 计算风险指标
   */
  calculateRiskMetrics(portfolio: PortfolioData): RiskMetrics {
    // 这里实现各种风险指标的计算
    // 简化实现，实际应用中需要更复杂的计算
    return {
      portfolioVaR: portfolio.portfolioVolatility * 1.65, // 95% VaR近似
      expectedShortfall: portfolio.portfolioVolatility * 2.0,
      trackingError: portfolio.portfolioVolatility * 0.5,
      informationRatio: portfolio.sharpeRatio * 0.8,
      calmarRatio: portfolio.sharpeRatio * 1.2,
      sortinoRatio: portfolio.sharpeRatio * 1.5,
      maxDrawdownDuration: 30, // 假设30天
      winRate: 0.6 // 假设60%胜率
    }
  }
}
