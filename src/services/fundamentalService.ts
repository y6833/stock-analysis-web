/**
 * 基本面分析服务
 * 提供获取和处理财务数据的功能
 * 注意：已移除所有模拟数据，现在只使用真实数据源
 */

import type { 
  FundamentalAnalysis, 
  FinancialSummary, 
  FinancialStatement,
  ValuationAnalysis,
  IndustryComparison,
  FinancialReportAnalysis
} from '@/types/fundamental'

/**
 * 获取股票的基本面分析数据
 * @param symbol 股票代码
 * @returns 基本面分析数据
 */
export async function getFundamentalAnalysis(symbol: string): Promise<FundamentalAnalysis> {
  try {
    // 调用后端API获取真实基本面数据
    const response = await fetch(`/api/fundamental/analysis/${symbol}`)
    
    if (!response.ok) {
      throw new Error(`获取基本面数据失败: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || '获取基本面数据失败')
    }
    
    return data.data
  } catch (error) {
    console.error('获取基本面数据失败:', error)
    throw new Error(`无法获取股票 ${symbol} 的基本面数据，请稍后重试或检查数据源配置`)
  }
}

/**
 * 获取财务摘要数据
 * @param symbol 股票代码
 * @returns 财务摘要数据
 */
export async function getFinancialSummary(symbol: string): Promise<FinancialSummary> {
  try {
    const fundamentalData = await getFundamentalAnalysis(symbol)
    return fundamentalData.summary
  } catch (error) {
    console.error('获取财务摘要失败:', error)
    throw error
  }
}

/**
 * 获取财务报表数据
 * @param symbol 股票代码
 * @returns 财务报表数据
 */
export async function getFinancialStatements(symbol: string): Promise<FinancialStatement[]> {
  try {
    const fundamentalData = await getFundamentalAnalysis(symbol)
    return fundamentalData.statements
  } catch (error) {
    console.error('获取财务报表失败:', error)
    throw error
  }
}

/**
 * 获取估值分析数据
 * @param symbol 股票代码
 * @returns 估值分析数据
 */
export async function getValuationAnalysis(symbol: string): Promise<ValuationAnalysis> {
  try {
    const fundamentalData = await getFundamentalAnalysis(symbol)
    return fundamentalData.valuation
  } catch (error) {
    console.error('获取估值分析失败:', error)
    throw error
  }
}

/**
 * 获取行业对比数据
 * @param symbol 股票代码
 * @returns 行业对比数据
 */
export async function getIndustryComparison(symbol: string): Promise<IndustryComparison> {
  try {
    const fundamentalData = await getFundamentalAnalysis(symbol)
    return fundamentalData.industryComparison
  } catch (error) {
    console.error('获取行业对比失败:', error)
    throw error
  }
}

/**
 * 获取财报解读数据
 * @param symbol 股票代码
 * @returns 财报解读数据
 */
export async function getFinancialReportAnalysis(symbol: string): Promise<FinancialReportAnalysis> {
  try {
    const fundamentalData = await getFundamentalAnalysis(symbol)
    return fundamentalData.reportAnalysis
  } catch (error) {
    console.error('获取财报解读失败:', error)
    throw error
  }
}

// 导出服务
export const fundamentalService = {
  getFundamentalAnalysis,
  getFinancialSummary,
  getFinancialStatements,
  getValuationAnalysis,
  getIndustryComparison,
  getFinancialReportAnalysis
}

export default fundamentalService
