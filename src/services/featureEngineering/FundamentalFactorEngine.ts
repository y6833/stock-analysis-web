/**
 * 基本面因子引擎
 * 计算各种基本面分析因子
 */

import type { StockData } from '@/types/stock'
import type { FactorResult } from './FeatureEngineManager'
import { dataSourceManager } from '@/services/dataSource/DataSourceManager'

/**
 * 财务数据接口
 */
interface FinancialData {
  reportDate: string
  revenue: number
  netProfit: number
  totalAssets: number
  totalEquity: number
  totalDebt: number
  operatingCashFlow: number
  eps: number
  roe: number
  roa: number
  debtToEquity: number
  currentRatio: number
  quickRatio: number
  grossMargin: number
  netMargin: number
  assetTurnover: number
}

/**
 * 基本面因子引擎
 */
export class FundamentalFactorEngine {
  private financialDataCache: Map<string, FinancialData[]> = new Map()

  /**
   * 计算指定的基本面因子
   */
  async calculateFactor(
    factorName: string,
    symbol: string,
    stockData: StockData,
    params: Record<string, any> = {}
  ): Promise<FactorResult> {
    // 获取财务数据
    const financialData = await this.getFinancialData(symbol)

    switch (factorName) {
      case 'roe_trend':
        return this.calculateROETrend(symbol, stockData, financialData, params)
      case 'pe_relative':
        return this.calculatePERelative(symbol, stockData, financialData, params)
      case 'debt_ratio':
        return this.calculateDebtRatio(symbol, stockData, financialData, params)
      case 'revenue_growth':
        return this.calculateRevenueGrowth(symbol, stockData, financialData, params)
      case 'profit_margin':
        return this.calculateProfitMargin(symbol, stockData, financialData, params)
      case 'asset_quality':
        return this.calculateAssetQuality(symbol, stockData, financialData, params)
      case 'cash_flow_strength':
        return this.calculateCashFlowStrength(symbol, stockData, financialData, params)
      case 'financial_stability':
        return this.calculateFinancialStability(symbol, stockData, financialData, params)
      case 'growth_quality':
        return this.calculateGrowthQuality(symbol, stockData, financialData, params)
      case 'valuation_score':
        return this.calculateValuationScore(symbol, stockData, financialData, params)
      default:
        throw new Error(`未知的基本面因子: ${factorName}`)
    }
  }

  /**
   * 获取财务数据
   */
  private async getFinancialData(symbol: string): Promise<FinancialData[]> {
    // 检查缓存
    if (this.financialDataCache.has(symbol)) {
      return this.financialDataCache.get(symbol)!
    }

    try {
      // 调用真实的财务数据API
      const response = await fetch(`/api/financial/${symbol}`)

      if (!response.ok) {
        throw new Error(`获取财务数据失败: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || '获取财务数据失败')
      }

      const financialData = data.data

      // 缓存数据
      this.financialDataCache.set(symbol, financialData)

      return financialData
    } catch (error) {
      console.error(`获取股票 ${symbol} 财务数据失败:`, error)
      throw new Error(`无法获取股票${symbol}的财务数据，请检查数据源配置`)
    }
  }

  /**
   * ROE趋势因子
   */
  private calculateROETrend(
    symbol: string,
    stockData: StockData,
    financialData: FinancialData[],
    params: any
  ): FactorResult {
    const lookback = params.lookback || 4 // 4个季度

    if (financialData.length < lookback) {
      return this.createEmptyFactorResult('roe_trend', 'ROE趋势不足数据', stockData.dates)
    }

    // 计算ROE趋势
    const roeValues = financialData.slice(-lookback).map(data => data.roe)
    const trend = this.calculateLinearTrend(roeValues)

    // 将趋势值扩展到所有日期
    const values = stockData.dates.map(() => trend)

    return {
      factorName: 'roe_trend',
      factorType: 'fundamental',
      values,
      dates: stockData.dates,
      metadata: {
        description: 'ROE趋势斜率',
        category: '盈利能力',
        unit: '趋势斜率',
        lastUpdated: new Date().toISOString(),
        dataSource: 'financial_statements'
      }
    }
  }

  /**
   * 相对PE因子
   */
  private calculatePERelative(
    symbol: string,
    stockData: StockData,
    financialData: FinancialData[],
    params: any
  ): FactorResult {
    if (financialData.length === 0) {
      return this.createEmptyFactorResult('pe_relative', '无财务数据', stockData.dates)
    }

    const latestFinancial = financialData[financialData.length - 1]
    const currentPrice = stockData.prices[stockData.prices.length - 1]

    // 计算当前PE
    const currentPE = latestFinancial.eps > 0 ? currentPrice / latestFinancial.eps : NaN

    // 计算历史PE均值
    const historicalPEs = stockData.prices.slice(-252).map((price, i) => {
      return latestFinancial.eps > 0 ? price / latestFinancial.eps : NaN
    }).filter(pe => !isNaN(pe))

    const avgPE = historicalPEs.length > 0
      ? historicalPEs.reduce((sum, pe) => sum + pe, 0) / historicalPEs.length
      : NaN

    // 计算相对PE
    const relativePE = !isNaN(currentPE) && !isNaN(avgPE) && avgPE > 0
      ? (currentPE - avgPE) / avgPE
      : 0

    const values = stockData.dates.map(() => relativePE)

    return {
      factorName: 'pe_relative',
      factorType: 'fundamental',
      values,
      dates: stockData.dates,
      metadata: {
        description: '相对历史PE水平',
        category: '估值指标',
        unit: '相对比例',
        lastUpdated: new Date().toISOString(),
        dataSource: 'financial_statements'
      }
    }
  }

  /**
   * 债务比率因子
   */
  private calculateDebtRatio(
    symbol: string,
    stockData: StockData,
    financialData: FinancialData[],
    params: any
  ): FactorResult {
    if (financialData.length === 0) {
      return this.createEmptyFactorResult('debt_ratio', '无财务数据', stockData.dates)
    }

    const latestFinancial = financialData[financialData.length - 1]
    const debtRatio = latestFinancial.debtToEquity

    const values = stockData.dates.map(() => debtRatio)

    return {
      factorName: 'debt_ratio',
      factorType: 'fundamental',
      values,
      dates: stockData.dates,
      metadata: {
        description: '债务权益比',
        category: '财务健康',
        unit: '比率',
        lastUpdated: new Date().toISOString(),
        dataSource: 'financial_statements'
      }
    }
  }

  /**
   * 营收增长因子
   */
  private calculateRevenueGrowth(
    symbol: string,
    stockData: StockData,
    financialData: FinancialData[],
    params: any
  ): FactorResult {
    const periods = params.periods || 4

    if (financialData.length < periods) {
      return this.createEmptyFactorResult('revenue_growth', '营收数据不足', stockData.dates)
    }

    // 计算营收增长率
    const recentData = financialData.slice(-periods)
    const growthRates = []

    for (let i = 1; i < recentData.length; i++) {
      const currentRevenue = recentData[i].revenue
      const previousRevenue = recentData[i - 1].revenue

      if (previousRevenue > 0) {
        const growthRate = (currentRevenue - previousRevenue) / previousRevenue
        growthRates.push(growthRate)
      }
    }

    const avgGrowthRate = growthRates.length > 0
      ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length
      : 0

    const values = stockData.dates.map(() => avgGrowthRate)

    return {
      factorName: 'revenue_growth',
      factorType: 'fundamental',
      values,
      dates: stockData.dates,
      metadata: {
        description: '平均营收增长率',
        category: '成长能力',
        unit: '增长率',
        lastUpdated: new Date().toISOString(),
        dataSource: 'financial_statements'
      }
    }
  }

  /**
   * 利润率因子
   */
  private calculateProfitMargin(
    symbol: string,
    stockData: StockData,
    financialData: FinancialData[],
    params: any
  ): FactorResult {
    if (financialData.length === 0) {
      return this.createEmptyFactorResult('profit_margin', '无财务数据', stockData.dates)
    }

    const latestFinancial = financialData[financialData.length - 1]
    const netMargin = latestFinancial.netMargin

    const values = stockData.dates.map(() => netMargin)

    return {
      factorName: 'profit_margin',
      factorType: 'fundamental',
      values,
      dates: stockData.dates,
      metadata: {
        description: '净利润率',
        category: '盈利能力',
        unit: '百分比',
        lastUpdated: new Date().toISOString(),
        dataSource: 'financial_statements'
      }
    }
  }

  /**
   * 资产质量因子
   */
  private calculateAssetQuality(
    symbol: string,
    stockData: StockData,
    financialData: FinancialData[],
    params: any
  ): FactorResult {
    if (financialData.length === 0) {
      return this.createEmptyFactorResult('asset_quality', '无财务数据', stockData.dates)
    }

    const latestFinancial = financialData[financialData.length - 1]

    // 综合资产质量评分
    const roa = latestFinancial.roa
    const assetTurnover = latestFinancial.assetTurnover
    const currentRatio = latestFinancial.currentRatio

    // 标准化各指标并计算综合评分
    const roaScore = Math.min(roa / 0.1, 1) // ROA > 10% 得满分
    const turnoverScore = Math.min(assetTurnover / 2, 1) // 周转率 > 2 得满分
    const liquidityScore = Math.min(currentRatio / 2, 1) // 流动比率 > 2 得满分

    const assetQuality = (roaScore + turnoverScore + liquidityScore) / 3

    const values = stockData.dates.map(() => assetQuality)

    return {
      factorName: 'asset_quality',
      factorType: 'fundamental',
      values,
      dates: stockData.dates,
      metadata: {
        description: '资产质量综合评分',
        category: '资产质量',
        unit: '评分',
        range: [0, 1],
        lastUpdated: new Date().toISOString(),
        dataSource: 'financial_statements'
      }
    }
  }

  /**
   * 现金流强度因子
   */
  private calculateCashFlowStrength(
    symbol: string,
    stockData: StockData,
    financialData: FinancialData[],
    params: any
  ): FactorResult {
    if (financialData.length === 0) {
      return this.createEmptyFactorResult('cash_flow_strength', '无财务数据', stockData.dates)
    }

    const latestFinancial = financialData[financialData.length - 1]

    // 现金流强度 = 经营现金流 / 净利润
    const cashFlowStrength = latestFinancial.netProfit > 0
      ? latestFinancial.operatingCashFlow / latestFinancial.netProfit
      : 0

    const values = stockData.dates.map(() => cashFlowStrength)

    return {
      factorName: 'cash_flow_strength',
      factorType: 'fundamental',
      values,
      dates: stockData.dates,
      metadata: {
        description: '现金流质量',
        category: '现金流',
        unit: '比率',
        lastUpdated: new Date().toISOString(),
        dataSource: 'financial_statements'
      }
    }
  }

  /**
   * 财务稳定性因子
   */
  private calculateFinancialStability(
    symbol: string,
    stockData: StockData,
    financialData: FinancialData[],
    params: any
  ): FactorResult {
    const periods = params.periods || 4

    if (financialData.length < periods) {
      return this.createEmptyFactorResult('financial_stability', '数据不足', stockData.dates)
    }

    const recentData = financialData.slice(-periods)

    // 计算各指标的变异系数
    const roeCV = this.calculateCoefficientOfVariation(recentData.map(d => d.roe))
    const revenueCV = this.calculateCoefficientOfVariation(recentData.map(d => d.revenue))
    const profitCV = this.calculateCoefficientOfVariation(recentData.map(d => d.netProfit))

    // 稳定性评分（变异系数越小越稳定）
    const stability = 1 / (1 + (roeCV + revenueCV + profitCV) / 3)

    const values = stockData.dates.map(() => stability)

    return {
      factorName: 'financial_stability',
      factorType: 'fundamental',
      values,
      dates: stockData.dates,
      metadata: {
        description: '财务稳定性评分',
        category: '财务健康',
        unit: '评分',
        range: [0, 1],
        lastUpdated: new Date().toISOString(),
        dataSource: 'financial_statements'
      }
    }
  }

  /**
   * 成长质量因子
   */
  private calculateGrowthQuality(
    symbol: string,
    stockData: StockData,
    financialData: FinancialData[],
    params: any
  ): FactorResult {
    const periods = params.periods || 4

    if (financialData.length < periods) {
      return this.createEmptyFactorResult('growth_quality', '数据不足', stockData.dates)
    }

    const recentData = financialData.slice(-periods)

    // 计算营收和利润增长的一致性
    const revenueGrowth = this.calculateLinearTrend(recentData.map(d => d.revenue))
    const profitGrowth = this.calculateLinearTrend(recentData.map(d => d.netProfit))

    // 成长质量 = 增长趋势的一致性
    const growthQuality = Math.abs(revenueGrowth) > 0 && Math.abs(profitGrowth) > 0
      ? Math.min(Math.abs(profitGrowth / revenueGrowth), 2) / 2
      : 0

    const values = stockData.dates.map(() => growthQuality)

    return {
      factorName: 'growth_quality',
      factorType: 'fundamental',
      values,
      dates: stockData.dates,
      metadata: {
        description: '成长质量评分',
        category: '成长能力',
        unit: '评分',
        range: [0, 1],
        lastUpdated: new Date().toISOString(),
        dataSource: 'financial_statements'
      }
    }
  }

  /**
   * 估值评分因子
   */
  private calculateValuationScore(
    symbol: string,
    stockData: StockData,
    financialData: FinancialData[],
    params: any
  ): FactorResult {
    if (financialData.length === 0) {
      return this.createEmptyFactorResult('valuation_score', '无财务数据', stockData.dates)
    }

    const latestFinancial = financialData[financialData.length - 1]
    const currentPrice = stockData.prices[stockData.prices.length - 1]

    // 计算多个估值指标
    const pe = latestFinancial.eps > 0 ? currentPrice / latestFinancial.eps : NaN
    const pb = latestFinancial.totalEquity > 0 ? currentPrice / (latestFinancial.totalEquity / 1000000) : NaN

    // 估值评分（越低越好）
    let valuationScore = 0
    let validMetrics = 0

    if (!isNaN(pe) && pe > 0) {
      valuationScore += Math.max(0, 1 - pe / 30) // PE < 30 得分较高
      validMetrics++
    }

    if (!isNaN(pb) && pb > 0) {
      valuationScore += Math.max(0, 1 - pb / 3) // PB < 3 得分较高
      validMetrics++
    }

    const finalScore = validMetrics > 0 ? valuationScore / validMetrics : 0

    const values = stockData.dates.map(() => finalScore)

    return {
      factorName: 'valuation_score',
      factorType: 'fundamental',
      values,
      dates: stockData.dates,
      metadata: {
        description: '估值吸引力评分',
        category: '估值指标',
        unit: '评分',
        range: [0, 1],
        lastUpdated: new Date().toISOString(),
        dataSource: 'financial_statements'
      }
    }
  }

  /**
   * 创建空的因子结果
   */
  private createEmptyFactorResult(factorName: string, reason: string, dates: string[]): FactorResult {
    return {
      factorName,
      factorType: 'fundamental',
      values: dates.map(() => NaN),
      dates,
      metadata: {
        description: `${factorName} - ${reason}`,
        category: '基本面',
        lastUpdated: new Date().toISOString(),
        dataSource: 'financial_statements'
      }
    }
  }

  /**
   * 计算线性趋势
   */
  private calculateLinearTrend(values: number[]): number {
    if (values.length < 2) return 0

    const n = values.length
    const x = Array.from({ length: n }, (_, i) => i)
    const y = values

    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

    return slope
  }

  /**
   * 计算变异系数
   */
  private calculateCoefficientOfVariation(values: number[]): number {
    if (values.length === 0) return 0

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    return mean !== 0 ? stdDev / Math.abs(mean) : 0
  }

  /**
   * 模拟财务数据生成函数已移除
   * 现在只从真实数据源获取财务数据
   */
}

export default FundamentalFactorEngine
