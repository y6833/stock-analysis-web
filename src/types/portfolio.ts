// 持仓信息
export interface Position {
  symbol: string
  name: string
  quantity: number
  buyPrice: number
  buyDate: string
  lastPrice: number
  lastUpdate: string
  notes?: string
  id?: number
  sector?: string
  industry?: string
  country?: string
  currency?: string
  assetClass?: string
  style?: string // 'growth', 'value', 'blend'
  marketCap?: 'large' | 'mid' | 'small' | 'micro'
  dividendYield?: number
  costBasis?: number // 考虑多次买入的平均成本
}

// 持仓摘要（包含计算值）
export interface PositionSummary extends Position {
  currentPrice: number
  investmentValue: number
  currentValue: number
  profit: number
  profitPercentage: number
  weight?: number
  sector?: string
  industry?: string
  marketCap?: number
  beta?: number
  volatility?: number
  riskContribution?: number
  sharpeRatio?: number
  drawdown?: number
  dividendIncome?: number
  totalReturn?: number // 包含股息的总回报
  annualizedReturn?: number
  holdingPeriod?: number // 持有天数
  unrealizedGains?: number
  realizedGains?: number
  taxCost?: number
  turnover?: number // 换手率

  // 增强的风险指标
  downsideDeviation?: number // 下行偏差
  informationRatio?: number // 信息比率
  treynorRatio?: number // 特雷诺比率
  jensenAlpha?: number // 詹森阿尔法
  specificRisk?: number // 特质风险
  systematicRisk?: number // 系统性风险
  valueAtRisk?: number // 风险价值(VaR)
  conditionalVaR?: number // 条件风险价值(CVaR)

  // 增强的绩效指标
  rollingReturns?: Array<{ period: string, return: number }> // 滚动收益
  factorExposure?: Record<string, number> // 因子暴露
  attributionAnalysis?: { // 归因分析
    allocation: number, // 资产配置贡献
    selection: number, // 选股贡献
    interaction: number // 交互贡献
  }
}

// 投资组合性能指标
export interface PortfolioMetrics {
  totalReturn: number
  annualizedReturn: number
  volatility: number
  sharpeRatio: number
  maxDrawdown: number
  maxDrawdownPercentage: number
  beta: number
  alpha: number
  rSquared: number
  informationRatio: number
  treynorRatio: number
  sortinoRatio: number
  calmarRatio: number
  trackingError: number

  // 增强的风险指标
  downsideDeviation?: number // 下行偏差
  ulcerIndex?: number // 溃疡指数
  painIndex?: number // 痛苦指数
  painRatio?: number // 痛苦比率
  recoveryFactor?: number // 恢复因子

  // 回撤相关指标
  drawdownPeriods?: Array<{
    start: string
    end: string
    depth: number
    recovery: string | null
    durationDays: number
  }>

  // 时间相关指标
  timeInMarket?: number // 市场参与时间百分比
  winRate?: number // 盈利天数比例
  bestDay?: { date: string, return: number } // 最佳单日表现
  worstDay?: { date: string, return: number } // 最差单日表现

  // 风险分解
  riskDecomposition?: {
    systematic: number // 系统性风险
    specific: number // 特质性风险
    total: number // 总风险
  }

  // 因子暴露
  factorExposure?: Record<string, number> // 因子暴露

  // 风险价值
  valueAtRisk?: {
    var: number // 风险价值
    varPercent: number // 风险价值百分比
    cvar: number // 条件风险价值
    cvarPercent: number // 条件风险价值百分比
    confidenceLevel: number // 置信水平
    horizon: number // 时间范围(天)
  }
}

// 投资组合回测参数
export interface BacktestParams {
  startDate: string
  endDate: string
  initialCapital: number
  rebalanceFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'none'
  includeDividends?: boolean
  includeFees?: boolean
  feePercentage?: number
}

// 投资组合回测结果
export interface BacktestResult {
  initialCapital: number
  finalCapital: number
  totalReturn: number
  totalReturnPercentage: number
  annualizedReturn: number
  maxDrawdown: number
  maxDrawdownPercentage: number
  sharpeRatio: number
  volatility: number
  dailyReturns: Array<{
    date: string
    value: number
    return: number
    returnPercentage: number
  }>
}

// 投资组合优化结果
export interface OptimizationResult {
  weights: Record<string, number>
  expectedReturn: number
  expectedRisk: number
  sharpeRatio: number
}

// 投资组合分配
export interface PortfolioAllocation {
  type: string // 'sector', 'industry', 'marketCap', etc.
  allocations: Array<{
    name: string
    value: number
    percentage: number
  }>
}
