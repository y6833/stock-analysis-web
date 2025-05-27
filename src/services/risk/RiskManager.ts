/**
 * 风险管理器
 * 提供完整的风险控制和资金管理功能
 */

export interface Position {
  symbol: string
  quantity: number
  averagePrice: number
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  weight: number
  openDate: string
}

export interface Portfolio {
  totalValue: number
  cash: number
  marketValue: number
  positions: Position[]
  dailyReturn: number
  totalReturn: number
  volatility: number
  sharpeRatio: number
  maxDrawdown: number
  beta: number
  alpha: number
}

export interface RiskMetrics {
  portfolioVaR: number          // 投资组合VaR
  componentVaR: number[]        // 成分VaR
  expectedShortfall: number     // 期望损失
  concentrationRisk: number     // 集中度风险
  sectorExposure: Record<string, number>  // 行业暴露
  correlationRisk: number       // 相关性风险
  liquidityRisk: number         // 流动性风险
  leverageRatio: number         // 杠杆比率
}

export interface RiskLimits {
  maxPositionWeight: number     // 单个持仓最大权重
  maxSectorWeight: number       // 单个行业最大权重
  maxDrawdown: number           // 最大回撤限制
  maxLeverage: number           // 最大杠杆
  minCashRatio: number          // 最小现金比例
  maxVaR: number                // 最大VaR
  stopLossPercent: number       // 止损百分比
  takeProfitPercent: number     // 止盈百分比
}

export interface PositionSizingParams {
  method: 'fixed' | 'kelly' | 'risk_parity' | 'equal_weight' | 'volatility_target'
  riskFreeRate: number
  targetVolatility: number
  lookbackPeriod: number
  maxPositionSize: number
  minPositionSize: number
}

export class RiskManager {
  private riskLimits: RiskLimits
  private positionSizingParams: PositionSizingParams

  constructor(
    riskLimits: RiskLimits,
    positionSizingParams: PositionSizingParams
  ) {
    this.riskLimits = riskLimits
    this.positionSizingParams = positionSizingParams
  }

  /**
   * 计算投资组合风险指标
   */
  calculateRiskMetrics(portfolio: Portfolio, historicalReturns: number[][]): RiskMetrics {
    const portfolioReturns = this.calculatePortfolioReturns(portfolio, historicalReturns)
    
    return {
      portfolioVaR: this.calculateVaR(portfolioReturns, 0.05),
      componentVaR: this.calculateComponentVaR(portfolio, historicalReturns),
      expectedShortfall: this.calculateExpectedShortfall(portfolioReturns, 0.05),
      concentrationRisk: this.calculateConcentrationRisk(portfolio),
      sectorExposure: this.calculateSectorExposure(portfolio),
      correlationRisk: this.calculateCorrelationRisk(historicalReturns),
      liquidityRisk: this.calculateLiquidityRisk(portfolio),
      leverageRatio: this.calculateLeverageRatio(portfolio)
    }
  }

  /**
   * Kelly公式仓位优化
   */
  calculateKellyPosition(
    expectedReturn: number,
    winRate: number,
    avgWin: number,
    avgLoss: number,
    currentPrice: number,
    availableCash: number
  ): number {
    // Kelly公式: f = (bp - q) / b
    // 其中 b = 平均盈利/平均亏损, p = 胜率, q = 败率
    const b = Math.abs(avgWin / avgLoss)
    const p = winRate
    const q = 1 - winRate
    
    const kellyFraction = (b * p - q) / b
    
    // 限制Kelly比例，避免过度集中
    const adjustedKelly = Math.max(0, Math.min(kellyFraction, this.positionSizingParams.maxPositionSize))
    
    // 计算建议仓位
    const suggestedAmount = availableCash * adjustedKelly
    const suggestedShares = Math.floor(suggestedAmount / currentPrice / 100) * 100 // 按手计算
    
    return suggestedShares
  }

  /**
   * 风险平价模型仓位分配
   */
  calculateRiskParityWeights(
    expectedReturns: number[],
    covarianceMatrix: number[][],
    targetRisk: number = 0.1
  ): number[] {
    const n = expectedReturns.length
    
    // 简化的风险平价实现
    // 实际应用中需要使用优化算法求解
    const weights = new Array(n).fill(1 / n)
    const riskContributions = this.calculateRiskContributions(weights, covarianceMatrix)
    
    // 迭代调整权重，使风险贡献相等
    const maxIterations = 100
    const tolerance = 0.001
    
    for (let iter = 0; iter < maxIterations; iter++) {
      const targetRiskContrib = targetRisk / n
      let converged = true
      
      for (let i = 0; i < n; i++) {
        const adjustment = targetRiskContrib / riskContributions[i]
        const newWeight = weights[i] * adjustment
        
        if (Math.abs(newWeight - weights[i]) > tolerance) {
          converged = false
        }
        
        weights[i] = Math.max(0, Math.min(newWeight, this.positionSizingParams.maxPositionSize))
      }
      
      // 重新归一化权重
      const totalWeight = weights.reduce((sum, w) => sum + w, 0)
      for (let i = 0; i < n; i++) {
        weights[i] /= totalWeight
      }
      
      if (converged) break
      
      // 重新计算风险贡献
      this.calculateRiskContributions(weights, covarianceMatrix).forEach((rc, i) => {
        riskContributions[i] = rc
      })
    }
    
    return weights
  }

  /**
   * 动态仓位调整
   */
  calculateDynamicPositionSize(
    symbol: string,
    currentPosition: Position | null,
    marketData: any,
    portfolioMetrics: Portfolio,
    riskMetrics: RiskMetrics
  ): {
    action: 'buy' | 'sell' | 'hold'
    targetQuantity: number
    reason: string
  } {
    // 检查风险限制
    const riskChecks = this.checkRiskLimits(portfolioMetrics, riskMetrics)
    if (!riskChecks.canTrade) {
      return {
        action: 'hold',
        targetQuantity: currentPosition?.quantity || 0,
        reason: riskChecks.reason
      }
    }

    // 计算目标仓位
    const volatility = this.calculateVolatility(marketData.historicalPrices)
    const targetVolatility = this.positionSizingParams.targetVolatility
    
    // 基于波动率的仓位调整
    const volatilityAdjustment = targetVolatility / volatility
    const basePositionSize = portfolioMetrics.totalValue * 0.1 // 基础10%仓位
    const adjustedPositionSize = basePositionSize * volatilityAdjustment
    
    // 限制仓位大小
    const maxPositionValue = portfolioMetrics.totalValue * this.riskLimits.maxPositionWeight
    const finalPositionValue = Math.min(adjustedPositionSize, maxPositionValue)
    
    const targetQuantity = Math.floor(finalPositionValue / marketData.currentPrice / 100) * 100
    const currentQuantity = currentPosition?.quantity || 0
    
    if (targetQuantity > currentQuantity * 1.1) {
      return {
        action: 'buy',
        targetQuantity,
        reason: `基于波动率调整，目标仓位: ${targetQuantity}股`
      }
    } else if (targetQuantity < currentQuantity * 0.9) {
      return {
        action: 'sell',
        targetQuantity,
        reason: `基于波动率调整，目标仓位: ${targetQuantity}股`
      }
    } else {
      return {
        action: 'hold',
        targetQuantity: currentQuantity,
        reason: '仓位在合理范围内'
      }
    }
  }

  /**
   * 止损止盈检查
   */
  checkStopLossAndTakeProfit(position: Position): {
    shouldStop: boolean
    action: 'stop_loss' | 'take_profit' | 'none'
    reason: string
  } {
    const pnlPercent = position.unrealizedPnLPercent
    
    if (pnlPercent <= -this.riskLimits.stopLossPercent) {
      return {
        shouldStop: true,
        action: 'stop_loss',
        reason: `触发止损：当前亏损${(pnlPercent * 100).toFixed(2)}%`
      }
    }
    
    if (pnlPercent >= this.riskLimits.takeProfitPercent) {
      return {
        shouldStop: true,
        action: 'take_profit',
        reason: `触发止盈：当前盈利${(pnlPercent * 100).toFixed(2)}%`
      }
    }
    
    return {
      shouldStop: false,
      action: 'none',
      reason: '未触发止损止盈条件'
    }
  }

  /**
   * 风险限制检查
   */
  private checkRiskLimits(portfolio: Portfolio, riskMetrics: RiskMetrics): {
    canTrade: boolean
    reason: string
  } {
    // 检查最大回撤
    if (portfolio.maxDrawdown > this.riskLimits.maxDrawdown) {
      return {
        canTrade: false,
        reason: `超过最大回撤限制: ${(portfolio.maxDrawdown * 100).toFixed(2)}%`
      }
    }
    
    // 检查VaR限制
    if (riskMetrics.portfolioVaR > this.riskLimits.maxVaR) {
      return {
        canTrade: false,
        reason: `超过VaR限制: ${(riskMetrics.portfolioVaR * 100).toFixed(2)}%`
      }
    }
    
    // 检查现金比例
    const cashRatio = portfolio.cash / portfolio.totalValue
    if (cashRatio < this.riskLimits.minCashRatio) {
      return {
        canTrade: false,
        reason: `现金比例过低: ${(cashRatio * 100).toFixed(2)}%`
      }
    }
    
    // 检查杠杆比率
    if (riskMetrics.leverageRatio > this.riskLimits.maxLeverage) {
      return {
        canTrade: false,
        reason: `杠杆比率过高: ${riskMetrics.leverageRatio.toFixed(2)}`
      }
    }
    
    return {
      canTrade: true,
      reason: '风险检查通过'
    }
  }

  /**
   * 计算VaR (Value at Risk)
   */
  private calculateVaR(returns: number[], confidenceLevel: number): number {
    const sortedReturns = [...returns].sort((a, b) => a - b)
    const index = Math.floor((1 - confidenceLevel) * sortedReturns.length)
    return Math.abs(sortedReturns[index] || 0)
  }

  /**
   * 计算期望损失 (Expected Shortfall)
   */
  private calculateExpectedShortfall(returns: number[], confidenceLevel: number): number {
    const sortedReturns = [...returns].sort((a, b) => a - b)
    const cutoffIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length)
    const tailReturns = sortedReturns.slice(0, cutoffIndex)
    
    if (tailReturns.length === 0) return 0
    
    const avgTailReturn = tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length
    return Math.abs(avgTailReturn)
  }

  /**
   * 计算集中度风险
   */
  private calculateConcentrationRisk(portfolio: Portfolio): number {
    const weights = portfolio.positions.map(pos => pos.weight)
    const herfindahlIndex = weights.reduce((sum, w) => sum + w * w, 0)
    return herfindahlIndex
  }

  /**
   * 计算行业暴露
   */
  private calculateSectorExposure(portfolio: Portfolio): Record<string, number> {
    // 简化实现，实际需要股票行业分类数据
    const sectorExposure: Record<string, number> = {}
    
    portfolio.positions.forEach(position => {
      // 这里需要根据股票代码获取行业信息
      const sector = this.getSectorBySymbol(position.symbol)
      sectorExposure[sector] = (sectorExposure[sector] || 0) + position.weight
    })
    
    return sectorExposure
  }

  /**
   * 计算相关性风险
   */
  private calculateCorrelationRisk(historicalReturns: number[][]): number {
    if (historicalReturns.length < 2) return 0
    
    const correlationMatrix = this.calculateCorrelationMatrix(historicalReturns)
    const avgCorrelation = this.calculateAverageCorrelation(correlationMatrix)
    
    return avgCorrelation
  }

  /**
   * 计算流动性风险
   */
  private calculateLiquidityRisk(portfolio: Portfolio): number {
    // 简化实现，基于持仓市值和平均成交量
    let liquidityRisk = 0
    
    portfolio.positions.forEach(position => {
      // 这里需要获取股票的平均成交量数据
      const avgVolume = this.getAverageVolume(position.symbol)
      const liquidityRatio = position.marketValue / (avgVolume * position.currentPrice)
      liquidityRisk += liquidityRatio * position.weight
    })
    
    return liquidityRisk
  }

  /**
   * 计算杠杆比率
   */
  private calculateLeverageRatio(portfolio: Portfolio): number {
    const totalExposure = portfolio.positions.reduce((sum, pos) => sum + pos.marketValue, 0)
    return totalExposure / portfolio.totalValue
  }

  /**
   * 计算投资组合收益率
   */
  private calculatePortfolioReturns(portfolio: Portfolio, historicalReturns: number[][]): number[] {
    const weights = portfolio.positions.map(pos => pos.weight)
    const portfolioReturns: number[] = []
    
    for (let i = 0; i < historicalReturns[0].length; i++) {
      let portfolioReturn = 0
      for (let j = 0; j < weights.length; j++) {
        portfolioReturn += weights[j] * historicalReturns[j][i]
      }
      portfolioReturns.push(portfolioReturn)
    }
    
    return portfolioReturns
  }

  /**
   * 计算成分VaR
   */
  private calculateComponentVaR(portfolio: Portfolio, historicalReturns: number[][]): number[] {
    // 简化实现，实际需要更复杂的计算
    return portfolio.positions.map(pos => pos.weight * 0.05) // 假设5%的成分VaR
  }

  /**
   * 计算风险贡献
   */
  private calculateRiskContributions(weights: number[], covarianceMatrix: number[][]): number[] {
    const n = weights.length
    const riskContributions = new Array(n).fill(0)
    
    // 计算投资组合方差
    let portfolioVariance = 0
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        portfolioVariance += weights[i] * weights[j] * covarianceMatrix[i][j]
      }
    }
    
    const portfolioStd = Math.sqrt(portfolioVariance)
    
    // 计算边际风险贡献
    for (let i = 0; i < n; i++) {
      let marginalContrib = 0
      for (let j = 0; j < n; j++) {
        marginalContrib += weights[j] * covarianceMatrix[i][j]
      }
      riskContributions[i] = weights[i] * marginalContrib / portfolioStd
    }
    
    return riskContributions
  }

  /**
   * 计算波动率
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0
    
    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
    
    return Math.sqrt(variance * 252) // 年化波动率
  }

  /**
   * 计算相关性矩阵
   */
  private calculateCorrelationMatrix(returns: number[][]): number[][] {
    const n = returns.length
    const correlationMatrix = Array(n).fill(null).map(() => Array(n).fill(0))
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          correlationMatrix[i][j] = 1
        } else {
          correlationMatrix[i][j] = this.calculateCorrelation(returns[i], returns[j])
        }
      }
    }
    
    return correlationMatrix
  }

  /**
   * 计算两个序列的相关性
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length)
    if (n < 2) return 0
    
    const avgX = x.slice(0, n).reduce((sum, val) => sum + val, 0) / n
    const avgY = y.slice(0, n).reduce((sum, val) => sum + val, 0) / n
    
    let numerator = 0
    let sumXSquared = 0
    let sumYSquared = 0
    
    for (let i = 0; i < n; i++) {
      const deltaX = x[i] - avgX
      const deltaY = y[i] - avgY
      numerator += deltaX * deltaY
      sumXSquared += deltaX * deltaX
      sumYSquared += deltaY * deltaY
    }
    
    const denominator = Math.sqrt(sumXSquared * sumYSquared)
    return denominator === 0 ? 0 : numerator / denominator
  }

  /**
   * 计算平均相关性
   */
  private calculateAverageCorrelation(correlationMatrix: number[][]): number {
    const n = correlationMatrix.length
    if (n < 2) return 0
    
    let sum = 0
    let count = 0
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        sum += Math.abs(correlationMatrix[i][j])
        count++
      }
    }
    
    return count === 0 ? 0 : sum / count
  }

  /**
   * 根据股票代码获取行业
   */
  private getSectorBySymbol(symbol: string): string {
    // 简化实现，实际需要行业分类数据
    const sectorMap: Record<string, string> = {
      '000001': '银行',
      '000002': '房地产',
      '600036': '银行',
      '600519': '食品饮料',
      '000858': '家电'
    }
    
    return sectorMap[symbol] || '其他'
  }

  /**
   * 获取平均成交量
   */
  private getAverageVolume(symbol: string): number {
    // 简化实现，实际需要从数据库或API获取
    return 1000000 // 假设100万股平均成交量
  }
}
