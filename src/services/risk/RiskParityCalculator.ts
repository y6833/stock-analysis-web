/**
 * 风险平价模型计算器
 * 实现等风险贡献的投资组合优化
 */

export interface Asset {
  symbol: string
  name: string
  expectedReturn: number
  volatility: number
  weight: number
  riskContribution: number
  currentPrice: number
  historicalPrices: number[]
}

export interface RiskParityParams {
  assets: Asset[]
  targetVolatility: number
  riskFreeRate: number
  lookbackPeriod: number
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  maxWeight: number
  minWeight: number
}

export interface RiskParityResult {
  optimizedWeights: number[]
  riskContributions: number[]
  portfolioVolatility: number
  portfolioReturn: number
  sharpeRatio: number
  diversificationRatio: number
  effectiveAssets: number
  convergenceInfo: {
    converged: boolean
    iterations: number
    finalError: number
  }
  rebalanceSignals: RebalanceSignal[]
}

export interface RebalanceSignal {
  symbol: string
  currentWeight: number
  targetWeight: number
  action: 'buy' | 'sell' | 'hold'
  amount: number
  reason: string
}

export interface CovarianceMatrix {
  matrix: number[][]
  eigenvalues: number[]
  condition: number
  isPositiveDefinite: boolean
}

export class RiskParityCalculator {
  private tolerance: number = 1e-6
  private maxIterations: number = 1000
  private learningRate: number = 0.01

  constructor(tolerance?: number, maxIterations?: number) {
    if (tolerance) this.tolerance = tolerance
    if (maxIterations) this.maxIterations = maxIterations
  }

  /**
   * 计算风险平价权重
   */
  calculateRiskParityWeights(params: RiskParityParams): RiskParityResult {
    // 1. 计算协方差矩阵
    const covMatrix = this.calculateCovarianceMatrix(params.assets)
    
    // 2. 验证协方差矩阵
    if (!covMatrix.isPositiveDefinite) {
      throw new Error('协方差矩阵不是正定的，无法进行优化')
    }

    // 3. 初始化权重（等权重）
    const n = params.assets.length
    let weights = new Array(n).fill(1 / n)

    // 4. 应用权重约束
    weights = this.applyWeightConstraints(weights, params.maxWeight, params.minWeight)

    // 5. 迭代优化
    const optimizationResult = this.optimizeRiskParity(weights, covMatrix.matrix, params)

    // 6. 计算最终指标
    const portfolioMetrics = this.calculatePortfolioMetrics(
      optimizationResult.weights, 
      params.assets, 
      covMatrix.matrix
    )

    // 7. 生成再平衡信号
    const rebalanceSignals = this.generateRebalanceSignals(
      params.assets, 
      optimizationResult.weights
    )

    return {
      optimizedWeights: optimizationResult.weights,
      riskContributions: optimizationResult.riskContributions,
      portfolioVolatility: portfolioMetrics.volatility,
      portfolioReturn: portfolioMetrics.expectedReturn,
      sharpeRatio: portfolioMetrics.sharpeRatio,
      diversificationRatio: portfolioMetrics.diversificationRatio,
      effectiveAssets: portfolioMetrics.effectiveAssets,
      convergenceInfo: optimizationResult.convergenceInfo,
      rebalanceSignals
    }
  }

  /**
   * 计算协方差矩阵
   */
  calculateCovarianceMatrix(assets: Asset[]): CovarianceMatrix {
    const n = assets.length
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0))

    // 计算收益率序列
    const returns = assets.map(asset => this.calculateReturns(asset.historicalPrices))
    
    // 确保所有资产的收益率序列长度一致
    const minLength = Math.min(...returns.map(r => r.length))
    const alignedReturns = returns.map(r => r.slice(-minLength))

    // 计算协方差矩阵
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          // 对角线元素：方差
          matrix[i][j] = this.calculateVariance(alignedReturns[i])
        } else {
          // 非对角线元素：协方差
          matrix[i][j] = this.calculateCovariance(alignedReturns[i], alignedReturns[j])
        }
      }
    }

    // 计算特征值和条件数
    const eigenvalues = this.calculateEigenvalues(matrix)
    const condition = Math.max(...eigenvalues) / Math.min(...eigenvalues)
    const isPositiveDefinite = eigenvalues.every(val => val > 0)

    return {
      matrix,
      eigenvalues,
      condition,
      isPositiveDefinite
    }
  }

  /**
   * 风险平价优化
   */
  private optimizeRiskParity(
    initialWeights: number[], 
    covMatrix: number[][], 
    params: RiskParityParams
  ): {
    weights: number[]
    riskContributions: number[]
    convergenceInfo: { converged: boolean; iterations: number; finalError: number }
  } {
    let weights = [...initialWeights]
    let converged = false
    let iterations = 0
    let finalError = Infinity

    const n = weights.length
    const targetRiskContrib = 1 / n // 等风险贡献

    for (iterations = 0; iterations < this.maxIterations; iterations++) {
      // 计算当前风险贡献
      const riskContributions = this.calculateRiskContributions(weights, covMatrix)
      
      // 计算误差
      const errors = riskContributions.map(rc => rc - targetRiskContrib)
      const totalError = Math.sqrt(errors.reduce((sum, err) => sum + err * err, 0))
      
      if (totalError < this.tolerance) {
        converged = true
        finalError = totalError
        break
      }

      // 计算梯度并更新权重
      const gradients = this.calculateRiskContributionGradients(weights, covMatrix)
      
      for (let i = 0; i < n; i++) {
        // 使用梯度下降更新权重
        const adjustment = -this.learningRate * errors[i] * gradients[i]
        weights[i] = Math.max(params.minWeight, Math.min(params.maxWeight, weights[i] + adjustment))
      }

      // 重新归一化权重
      const totalWeight = weights.reduce((sum, w) => sum + w, 0)
      weights = weights.map(w => w / totalWeight)

      finalError = totalError
    }

    const finalRiskContributions = this.calculateRiskContributions(weights, covMatrix)

    return {
      weights,
      riskContributions: finalRiskContributions,
      convergenceInfo: {
        converged,
        iterations,
        finalError
      }
    }
  }

  /**
   * 计算风险贡献
   */
  private calculateRiskContributions(weights: number[], covMatrix: number[][]): number[] {
    const n = weights.length
    const riskContributions = new Array(n).fill(0)

    // 计算投资组合方差
    let portfolioVariance = 0
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        portfolioVariance += weights[i] * weights[j] * covMatrix[i][j]
      }
    }

    const portfolioStd = Math.sqrt(portfolioVariance)

    // 计算每个资产的边际风险贡献
    for (let i = 0; i < n; i++) {
      let marginalContrib = 0
      for (let j = 0; j < n; j++) {
        marginalContrib += weights[j] * covMatrix[i][j]
      }
      
      // 风险贡献 = 权重 × 边际风险贡献 / 投资组合标准差
      riskContributions[i] = weights[i] * marginalContrib / portfolioStd
    }

    // 归一化风险贡献
    const totalRiskContrib = riskContributions.reduce((sum, rc) => sum + rc, 0)
    return riskContributions.map(rc => rc / totalRiskContrib)
  }

  /**
   * 计算风险贡献梯度
   */
  private calculateRiskContributionGradients(weights: number[], covMatrix: number[][]): number[] {
    const n = weights.length
    const gradients = new Array(n).fill(0)
    const epsilon = 1e-8

    const baseRiskContribs = this.calculateRiskContributions(weights, covMatrix)

    for (let i = 0; i < n; i++) {
      // 数值梯度计算
      const weightsPlus = [...weights]
      weightsPlus[i] += epsilon
      
      // 重新归一化
      const totalWeight = weightsPlus.reduce((sum, w) => sum + w, 0)
      weightsPlus.forEach((w, idx) => weightsPlus[idx] = w / totalWeight)

      const riskContribsPlus = this.calculateRiskContributions(weightsPlus, covMatrix)
      
      // 计算梯度
      gradients[i] = (riskContribsPlus[i] - baseRiskContribs[i]) / epsilon
    }

    return gradients
  }

  /**
   * 计算投资组合指标
   */
  private calculatePortfolioMetrics(
    weights: number[], 
    assets: Asset[], 
    covMatrix: number[][]
  ): {
    volatility: number
    expectedReturn: number
    sharpeRatio: number
    diversificationRatio: number
    effectiveAssets: number
  } {
    const n = weights.length

    // 计算期望收益
    const expectedReturn = weights.reduce((sum, w, i) => sum + w * assets[i].expectedReturn, 0)

    // 计算投资组合波动率
    let portfolioVariance = 0
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        portfolioVariance += weights[i] * weights[j] * covMatrix[i][j]
      }
    }
    const volatility = Math.sqrt(portfolioVariance)

    // 计算夏普比率
    const riskFreeRate = 0.03 // 假设3%无风险利率
    const sharpeRatio = (expectedReturn - riskFreeRate) / volatility

    // 计算分散化比率
    const weightedAvgVol = weights.reduce((sum, w, i) => sum + w * assets[i].volatility, 0)
    const diversificationRatio = weightedAvgVol / volatility

    // 计算有效资产数量（基于权重的赫芬达尔指数）
    const herfindahlIndex = weights.reduce((sum, w) => sum + w * w, 0)
    const effectiveAssets = 1 / herfindahlIndex

    return {
      volatility,
      expectedReturn,
      sharpeRatio,
      diversificationRatio,
      effectiveAssets
    }
  }

  /**
   * 生成再平衡信号
   */
  private generateRebalanceSignals(assets: Asset[], targetWeights: number[]): RebalanceSignal[] {
    const signals: RebalanceSignal[] = []
    const threshold = 0.05 // 5%的权重偏差阈值

    assets.forEach((asset, i) => {
      const currentWeight = asset.weight
      const targetWeight = targetWeights[i]
      const deviation = Math.abs(currentWeight - targetWeight)

      let action: 'buy' | 'sell' | 'hold' = 'hold'
      let reason = '权重在目标范围内'

      if (deviation > threshold) {
        if (targetWeight > currentWeight) {
          action = 'buy'
          reason = `当前权重${(currentWeight * 100).toFixed(2)}%低于目标${(targetWeight * 100).toFixed(2)}%`
        } else {
          action = 'sell'
          reason = `当前权重${(currentWeight * 100).toFixed(2)}%高于目标${(targetWeight * 100).toFixed(2)}%`
        }
      }

      // 计算调整金额（假设总资产为100万）
      const totalPortfolioValue = 1000000
      const amount = Math.abs(targetWeight - currentWeight) * totalPortfolioValue

      signals.push({
        symbol: asset.symbol,
        currentWeight,
        targetWeight,
        action,
        amount,
        reason
      })
    })

    return signals
  }

  /**
   * 应用权重约束
   */
  private applyWeightConstraints(weights: number[], maxWeight: number, minWeight: number): number[] {
    const constrainedWeights = weights.map(w => Math.max(minWeight, Math.min(maxWeight, w)))
    
    // 重新归一化
    const totalWeight = constrainedWeights.reduce((sum, w) => sum + w, 0)
    return constrainedWeights.map(w => w / totalWeight)
  }

  /**
   * 计算收益率序列
   */
  private calculateReturns(prices: number[]): number[] {
    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }
    return returns
  }

  /**
   * 计算方差
   */
  private calculateVariance(returns: number[]): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1)
    return variance
  }

  /**
   * 计算协方差
   */
  private calculateCovariance(returns1: number[], returns2: number[]): number {
    const n = Math.min(returns1.length, returns2.length)
    const mean1 = returns1.slice(0, n).reduce((sum, r) => sum + r, 0) / n
    const mean2 = returns2.slice(0, n).reduce((sum, r) => sum + r, 0) / n
    
    let covariance = 0
    for (let i = 0; i < n; i++) {
      covariance += (returns1[i] - mean1) * (returns2[i] - mean2)
    }
    
    return covariance / (n - 1)
  }

  /**
   * 计算特征值（简化实现）
   */
  private calculateEigenvalues(matrix: number[][]): number[] {
    // 这里使用简化的特征值估算
    // 实际应用中应该使用更精确的数值方法
    const n = matrix.length
    const eigenvalues = []
    
    for (let i = 0; i < n; i++) {
      eigenvalues.push(matrix[i][i]) // 对角线元素作为特征值的近似
    }
    
    return eigenvalues
  }

  /**
   * 动态权重调整
   */
  adjustWeightsDynamically(
    currentWeights: number[],
    marketConditions: {
      volatilityRegime: 'low' | 'medium' | 'high'
      correlationLevel: number
      marketTrend: 'bull' | 'bear' | 'sideways'
    }
  ): number[] {
    let adjustedWeights = [...currentWeights]

    // 根据波动率环境调整
    switch (marketConditions.volatilityRegime) {
      case 'high':
        // 高波动环境下，增加分散化
        adjustedWeights = this.increaseEqualization(adjustedWeights)
        break
      case 'low':
        // 低波动环境下，可以适当集中
        adjustedWeights = this.allowConcentration(adjustedWeights)
        break
    }

    // 根据相关性调整
    if (marketConditions.correlationLevel > 0.7) {
      // 高相关性时，进一步平均化权重
      adjustedWeights = this.increaseEqualization(adjustedWeights)
    }

    return adjustedWeights
  }

  /**
   * 增加权重均等化
   */
  private increaseEqualization(weights: number[]): number[] {
    const n = weights.length
    const equalWeight = 1 / n
    const alpha = 0.3 // 调整强度
    
    return weights.map(w => w * (1 - alpha) + equalWeight * alpha)
  }

  /**
   * 允许适度集中
   */
  private allowConcentration(weights: number[]): number[] {
    // 对权重进行轻微的非线性变换，允许较大权重进一步增大
    const sum = weights.reduce((s, w) => s + w, 0)
    const adjustedWeights = weights.map(w => Math.pow(w, 0.9)) // 轻微的幂变换
    const newSum = adjustedWeights.reduce((s, w) => s + w, 0)
    
    return adjustedWeights.map(w => w / newSum)
  }
}
