/**
 * 基本面分析相关类型定义
 */

// 财务指标
export interface FinancialIndicator {
  name: string
  value: number | string
  unit: string
  description: string
  trend?: 'up' | 'down' | 'stable'
  changePercent?: number
}

// 财务报表类型
export type FinancialStatementType = 'income' | 'balance' | 'cash_flow'

// 财务报表周期
export type FinancialPeriod = 'annual' | 'quarterly'

// 财务报表项目
export interface FinancialStatementItem {
  name: string
  value: number
  unit: string
  yoyChange?: number // 同比变化
  qoqChange?: number // 环比变化
}

// 财务报表
export interface FinancialStatement {
  type: FinancialStatementType
  period: FinancialPeriod
  reportDate: string
  items: FinancialStatementItem[]
}

// 财务摘要
export interface FinancialSummary {
  revenue: FinancialIndicator
  netProfit: FinancialIndicator
  grossMargin: FinancialIndicator
  netMargin: FinancialIndicator
  roe: FinancialIndicator
  debtToAsset: FinancialIndicator
  eps: FinancialIndicator
  bps: FinancialIndicator
}

// 估值指标
export interface ValuationIndicator {
  name: string
  value: number
  industry: number
  market: number
  history: {
    date: string
    value: number
  }[]
  percentile: number // 在历史分位数中的位置 (0-100)
  description: string
}

// 估值分析
export interface ValuationAnalysis {
  pe: ValuationIndicator
  pb: ValuationIndicator
  ps: ValuationIndicator
  pcf: ValuationIndicator
  dividend: ValuationIndicator
  evToEbitda: ValuationIndicator
}

// 行业对比项
export interface IndustryComparisonItem {
  name: string
  value: number
  industryAvg: number
  industryMax: number
  industryMin: number
  rank: number
  totalCompanies: number
  percentile: number // 在行业中的分位数 (0-100)
}

// 行业对比
export interface IndustryComparison {
  industry: string
  companyCount: number
  items: {
    revenue: IndustryComparisonItem
    netProfit: IndustryComparisonItem
    grossMargin: IndustryComparisonItem
    netMargin: IndustryComparisonItem
    roe: IndustryComparisonItem
    debtToAsset: IndustryComparisonItem
    pe: IndustryComparisonItem
    pb: IndustryComparisonItem
  }
}

// 财报解读
export interface FinancialReportAnalysis {
  reportDate: string
  period: FinancialPeriod
  summary: string
  highlights: string[]
  risks: string[]
  outlook: string
}

// 基本面分析结果
export interface FundamentalAnalysis {
  symbol: string
  name: string
  industry: string
  summary: FinancialSummary
  statements: FinancialStatement[]
  valuation: ValuationAnalysis
  industryComparison: IndustryComparison
  reportAnalysis: FinancialReportAnalysis
}
