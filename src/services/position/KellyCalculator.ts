/**
 * Kelly公式仓位计算器
 * 基于Kelly公式计算最优仓位大小
 */

export interface KellyParams {
  winRate: number           // 胜率 (0-1)
  avgWin: number           // 平均盈利金额
  avgLoss: number          // 平均亏损金额
  expectedReturn: number   // 期望收益率
  riskFreeRate: number     // 无风险利率
  maxKellyFraction: number // Kelly比例上限
}

export interface KellyResult {
  kellyFraction: number    // Kelly比例
  adjustedFraction: number // 调整后比例
  suggestedAmount: number  // 建议投资金额
  suggestedShares: number  // 建议股数
  riskLevel: 'low' | 'medium' | 'high' | 'extreme'
  confidence: number       // 置信度
  warnings: string[]       // 风险警告
}

export interface TradeHistory {
  date: string
  symbol: string
  direction: 'buy' | 'sell'
  quantity: number
  price: number
  pnl: number
  isWin: boolean
}

export class KellyCalculator {
  private maxKellyFraction: number
  private minSampleSize: number

  constructor(maxKellyFraction: number = 0.25, minSampleSize: number = 30) {
    this.maxKellyFraction = maxKellyFraction
    this.minSampleSize = minSampleSize
  }

  /**
   * 计算Kelly最优仓位
   */
  calculateKellyPosition(
    params: KellyParams,
    currentPrice: number,
    availableCash: number,
    tradeHistory?: TradeHistory[]
  ): KellyResult {
    // 验证输入参数
    const validation = this.validateParams(params)
    if (!validation.isValid) {
      return this.createErrorResult(validation.errors)
    }

    // 如果有交易历史，使用历史数据计算参数
    let adjustedParams = params
    if (tradeHistory && tradeHistory.length >= this.minSampleSize) {
      adjustedParams = this.calculateParamsFromHistory(tradeHistory)
    }

    // 计算Kelly比例
    const kellyFraction = this.calculateKellyFraction(adjustedParams)
    
    // 应用风险调整
    const adjustedFraction = this.applyRiskAdjustment(kellyFraction, adjustedParams)
    
    // 计算建议投资金额和股数
    const suggestedAmount = availableCash * adjustedFraction
    const suggestedShares = Math.floor(suggestedAmount / currentPrice / 100) * 100 // 按手计算
    
    // 评估风险等级
    const riskLevel = this.assessRiskLevel(adjustedFraction, adjustedParams)
    
    // 计算置信度
    const confidence = this.calculateConfidence(adjustedParams, tradeHistory)
    
    // 生成风险警告
    const warnings = this.generateWarnings(adjustedFraction, adjustedParams, tradeHistory)

    return {
      kellyFraction,
      adjustedFraction,
      suggestedAmount,
      suggestedShares,
      riskLevel,
      confidence,
      warnings
    }
  }

  /**
   * 从交易历史计算Kelly参数
   */
  calculateParamsFromHistory(tradeHistory: TradeHistory[]): KellyParams {
    const wins = tradeHistory.filter(trade => trade.isWin)
    const losses = tradeHistory.filter(trade => !trade.isWin)
    
    const winRate = wins.length / tradeHistory.length
    const avgWin = wins.length > 0 ? wins.reduce((sum, trade) => sum + trade.pnl, 0) / wins.length : 0
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0) / losses.length) : 0
    
    // 计算期望收益率
    const totalPnL = tradeHistory.reduce((sum, trade) => sum + trade.pnl, 0)
    const totalInvestment = tradeHistory.reduce((sum, trade) => sum + (trade.quantity * trade.price), 0)
    const expectedReturn = totalInvestment > 0 ? totalPnL / totalInvestment : 0

    return {
      winRate,
      avgWin,
      avgLoss,
      expectedReturn,
      riskFreeRate: 0.03, // 默认3%无风险利率
      maxKellyFraction: this.maxKellyFraction
    }
  }

  /**
   * 计算Kelly比例
   */
  private calculateKellyFraction(params: KellyParams): number {
    const { winRate, avgWin, avgLoss } = params
    
    // Kelly公式: f = (bp - q) / b
    // 其中 b = 平均盈利/平均亏损, p = 胜率, q = 败率
    if (avgLoss === 0) return 0
    
    const b = avgWin / avgLoss  // 盈亏比
    const p = winRate           // 胜率
    const q = 1 - winRate       // 败率
    
    const kellyFraction = (b * p - q) / b
    
    return Math.max(0, kellyFraction) // 确保非负
  }

  /**
   * 应用风险调整
   */
  private applyRiskAdjustment(kellyFraction: number, params: KellyParams): number {
    // 1. 应用最大Kelly比例限制
    let adjustedFraction = Math.min(kellyFraction, this.maxKellyFraction)
    
    // 2. 基于胜率的调整
    if (params.winRate < 0.4) {
      adjustedFraction *= 0.5 // 胜率过低，减半仓位
    } else if (params.winRate < 0.5) {
      adjustedFraction *= 0.7 // 胜率较低，减少仓位
    }
    
    // 3. 基于盈亏比的调整
    const profitLossRatio = params.avgWin / params.avgLoss
    if (profitLossRatio < 1.5) {
      adjustedFraction *= 0.8 // 盈亏比过低，减少仓位
    }
    
    // 4. 基于期望收益的调整
    if (params.expectedReturn < params.riskFreeRate) {
      adjustedFraction = 0 // 期望收益低于无风险利率，不建议投资
    }
    
    // 5. 应用保守系数
    adjustedFraction *= 0.8 // 保守系数，避免过度激进
    
    return Math.max(0, Math.min(adjustedFraction, this.maxKellyFraction))
  }

  /**
   * 评估风险等级
   */
  private assessRiskLevel(fraction: number, params: KellyParams): 'low' | 'medium' | 'high' | 'extreme' {
    if (fraction === 0) return 'low'
    if (fraction <= 0.05) return 'low'
    if (fraction <= 0.15) return 'medium'
    if (fraction <= 0.25) return 'high'
    return 'extreme'
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(params: KellyParams, tradeHistory?: TradeHistory[]): number {
    let confidence = 0.5 // 基础置信度50%
    
    // 基于胜率的置信度
    if (params.winRate >= 0.6) {
      confidence += 0.2
    } else if (params.winRate >= 0.5) {
      confidence += 0.1
    } else if (params.winRate < 0.4) {
      confidence -= 0.2
    }
    
    // 基于盈亏比的置信度
    const profitLossRatio = params.avgWin / params.avgLoss
    if (profitLossRatio >= 2) {
      confidence += 0.2
    } else if (profitLossRatio >= 1.5) {
      confidence += 0.1
    } else if (profitLossRatio < 1) {
      confidence -= 0.3
    }
    
    // 基于样本大小的置信度
    if (tradeHistory) {
      if (tradeHistory.length >= 100) {
        confidence += 0.1
      } else if (tradeHistory.length >= 50) {
        confidence += 0.05
      } else if (tradeHistory.length < this.minSampleSize) {
        confidence -= 0.2
      }
    }
    
    return Math.max(0, Math.min(confidence, 1))
  }

  /**
   * 生成风险警告
   */
  private generateWarnings(
    fraction: number, 
    params: KellyParams, 
    tradeHistory?: TradeHistory[]
  ): string[] {
    const warnings: string[] = []
    
    // 胜率警告
    if (params.winRate < 0.4) {
      warnings.push(`胜率过低 (${(params.winRate * 100).toFixed(1)}%)，建议谨慎投资`)
    }
    
    // 盈亏比警告
    const profitLossRatio = params.avgWin / params.avgLoss
    if (profitLossRatio < 1.2) {
      warnings.push(`盈亏比过低 (${profitLossRatio.toFixed(2)})，风险较高`)
    }
    
    // Kelly比例警告
    if (fraction > 0.2) {
      warnings.push(`Kelly比例较高 (${(fraction * 100).toFixed(1)}%)，建议分散投资`)
    }
    
    // 样本大小警告
    if (tradeHistory && tradeHistory.length < this.minSampleSize) {
      warnings.push(`交易样本过少 (${tradeHistory.length}笔)，建议积累更多交易数据`)
    }
    
    // 期望收益警告
    if (params.expectedReturn <= params.riskFreeRate) {
      warnings.push(`期望收益率低于无风险利率，不建议投资`)
    }
    
    // 连续亏损警告
    if (tradeHistory) {
      const recentLosses = this.countRecentConsecutiveLosses(tradeHistory)
      if (recentLosses >= 3) {
        warnings.push(`近期连续亏损 ${recentLosses} 次，建议暂停交易`)
      }
    }
    
    return warnings
  }

  /**
   * 验证输入参数
   */
  private validateParams(params: KellyParams): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (params.winRate < 0 || params.winRate > 1) {
      errors.push('胜率必须在0-1之间')
    }
    
    if (params.avgWin <= 0) {
      errors.push('平均盈利必须大于0')
    }
    
    if (params.avgLoss <= 0) {
      errors.push('平均亏损必须大于0')
    }
    
    if (params.riskFreeRate < 0 || params.riskFreeRate > 1) {
      errors.push('无风险利率必须在0-1之间')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 创建错误结果
   */
  private createErrorResult(errors: string[]): KellyResult {
    return {
      kellyFraction: 0,
      adjustedFraction: 0,
      suggestedAmount: 0,
      suggestedShares: 0,
      riskLevel: 'extreme',
      confidence: 0,
      warnings: errors
    }
  }

  /**
   * 计算近期连续亏损次数
   */
  private countRecentConsecutiveLosses(tradeHistory: TradeHistory[]): number {
    let consecutiveLosses = 0
    
    // 从最近的交易开始倒序检查
    for (let i = tradeHistory.length - 1; i >= 0; i--) {
      if (!tradeHistory[i].isWin) {
        consecutiveLosses++
      } else {
        break
      }
    }
    
    return consecutiveLosses
  }

  /**
   * 计算Kelly公式的理论最大收益
   */
  calculateTheoreticalMaxReturn(params: KellyParams, initialCapital: number, periods: number): number {
    const kellyFraction = this.calculateKellyFraction(params)
    
    // 假设每期都按Kelly比例投资
    let capital = initialCapital
    
    for (let i = 0; i < periods; i++) {
      const investmentAmount = capital * kellyFraction
      
      // 模拟交易结果
      if (Math.random() < params.winRate) {
        // 盈利
        capital += params.avgWin * (investmentAmount / 100) // 假设每100元投资获得avgWin收益
      } else {
        // 亏损
        capital -= params.avgLoss * (investmentAmount / 100)
      }
    }
    
    return capital
  }

  /**
   * 获取Kelly公式建议
   */
  getKellyAdvice(result: KellyResult): string {
    if (result.adjustedFraction === 0) {
      return '不建议投资：风险过高或期望收益不足'
    }
    
    if (result.riskLevel === 'low') {
      return '低风险投资：可以考虑适当增加仓位'
    }
    
    if (result.riskLevel === 'medium') {
      return '中等风险投资：建议按计算结果执行'
    }
    
    if (result.riskLevel === 'high') {
      return '高风险投资：建议减少仓位或分批建仓'
    }
    
    return '极高风险投资：强烈建议重新评估策略'
  }
}
