import axios from 'axios'
import { getAuthHeaders } from '@/utils/auth'

// API基础URL
const API_URL = 'http://localhost:7001/api'

// 性能数据类型
export interface PerformanceData {
  dailyReturns: Array<{
    date: string
    value: number
    return: number
  }>
  cumulativeReturns: Array<{
    date: string
    value: number
  }>
  metrics: {
    totalReturn: number
    annualizedReturn: number
    volatility: number
    sharpeRatio: number
    maxDrawdown: number
    maxDrawdownPercentage: number
  }
}

// 投资组合类型
export interface Portfolio {
  id: number
  name: string
  description?: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// 持仓类型
export interface Holding {
  id: number
  portfolioId: number
  stockCode: string
  stockName: string
  quantity: number
  averageCost: number
  currentPrice: number
  notes?: string
  createdAt: string
  updatedAt: string
}

// 交易记录类型
export interface TradeRecord {
  id: number
  userId: number
  portfolioId: number
  stockCode: string
  stockName: string
  tradeType: 'buy' | 'sell'
  quantity: number
  price: number
  totalAmount: number
  tradeDate: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// 创建投资组合请求
export interface CreatePortfolioRequest {
  name: string
  description?: string
  isDefault?: boolean
}

// 添加持仓请求
export interface AddHoldingRequest {
  stockCode: string
  stockName: string
  quantity: number
  averageCost: number
  currentPrice?: number
  notes?: string
}

// 添加交易记录请求
export interface AddTradeRecordRequest {
  stockCode: string
  stockName: string
  tradeType: 'buy' | 'sell'
  quantity: number
  price: number
  tradeDate?: string
  notes?: string
}

/**
 * 获取用户的所有投资组合
 * @returns 投资组合列表
 */
export async function getUserPortfolios(): Promise<Portfolio[]> {
  const response = await axios.get(`${API_URL}/portfolios`, getAuthHeaders())
  return response.data
}

/**
 * 创建投资组合
 * @param data 组合数据
 * @returns 创建的组合
 */
export async function createPortfolio(data: CreatePortfolioRequest): Promise<Portfolio> {
  const response = await axios.post(`${API_URL}/portfolios`, data, getAuthHeaders())
  return response.data
}

/**
 * 更新投资组合
 * @param id 组合ID
 * @param data 更新数据
 * @returns 更新后的组合
 */
export async function updatePortfolio(
  id: number,
  data: CreatePortfolioRequest
): Promise<Portfolio> {
  const response = await axios.put(`${API_URL}/portfolios/${id}`, data, getAuthHeaders())
  return response.data
}

/**
 * 删除投资组合
 * @param id 组合ID
 */
export async function deletePortfolio(id: number): Promise<void> {
  await axios.delete(`${API_URL}/portfolios/${id}`, getAuthHeaders())
}

/**
 * 获取投资组合中的持仓
 * @param id 组合ID
 * @returns 持仓列表
 */
export async function getPortfolioHoldings(id: number): Promise<Holding[]> {
  const response = await axios.get(`${API_URL}/portfolios/${id}/holdings`, getAuthHeaders())
  return response.data
}

/**
 * 添加持仓到投资组合
 * @param portfolioId 组合ID
 * @param data 持仓数据
 * @returns 添加的持仓
 */
export async function addHolding(portfolioId: number, data: AddHoldingRequest): Promise<Holding> {
  const response = await axios.post(
    `${API_URL}/portfolios/${portfolioId}/holdings`,
    data,
    getAuthHeaders()
  )
  return response.data
}

/**
 * 更新持仓
 * @param portfolioId 组合ID
 * @param holdingId 持仓ID
 * @param data 更新数据
 * @returns 更新后的持仓
 */
export async function updateHolding(
  portfolioId: number,
  holdingId: number,
  data: Partial<AddHoldingRequest>
): Promise<Holding> {
  const response = await axios.put(
    `${API_URL}/portfolios/${portfolioId}/holdings/${holdingId}`,
    data,
    getAuthHeaders()
  )
  return response.data
}

/**
 * 删除持仓
 * @param portfolioId 组合ID
 * @param holdingId 持仓ID
 */
export async function deleteHolding(portfolioId: number, holdingId: number): Promise<void> {
  await axios.delete(`${API_URL}/portfolios/${portfolioId}/holdings/${holdingId}`, getAuthHeaders())
}

/**
 * 添加交易记录
 * @param portfolioId 组合ID
 * @param data 交易数据
 * @returns 添加的交易记录
 */
export async function addTradeRecord(
  portfolioId: number,
  data: AddTradeRecordRequest
): Promise<TradeRecord> {
  const response = await axios.post(
    `${API_URL}/portfolios/${portfolioId}/trades`,
    data,
    getAuthHeaders()
  )
  return response.data
}

/**
 * 获取交易记录
 * @param portfolioId 组合ID
 * @returns 交易记录列表
 */
export async function getTradeRecords(portfolioId: number): Promise<TradeRecord[]> {
  const response = await axios.get(`${API_URL}/portfolios/${portfolioId}/trades`, getAuthHeaders())
  return response.data
}

/**
 * 删除交易记录
 * @param portfolioId 组合ID
 * @param tradeId 交易记录ID
 */
export async function deleteTradeRecord(portfolioId: number, tradeId: number): Promise<void> {
  await axios.delete(`${API_URL}/portfolios/${portfolioId}/trades/${tradeId}`, getAuthHeaders())
}

/**
 * 获取投资组合性能数据
 * @param portfolioId 组合ID
 * @param startDate 开始日期 (可选)
 * @param endDate 结束日期 (可选)
 * @returns 性能数据
 */
export async function getPortfolioPerformance(
  portfolioId: number,
  startDate?: string,
  endDate?: string
): Promise<PerformanceData> {
  let url = `${API_URL}/portfolios/${portfolioId}/performance`

  // 添加日期范围查询参数
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)

  if (params.toString()) {
    url += `?${params.toString()}`
  }

  const response = await axios.get(url, getAuthHeaders())
  return response.data
}

/**
 * 获取投资组合摘要
 * @returns 投资组合摘要数据
 */
export async function getPortfolioSummary(): Promise<any> {
  console.log('[PortfolioService] 从API获取投资组合摘要...')

  try {
    const portfolios = await getUserPortfolios()
    if (!portfolios || portfolios.length === 0) {
      return {
        totalValue: 0,
        totalCost: 0,
        totalProfit: 0,
        totalProfitPercent: 0,
        portfolioCount: 0,
        holdingCount: 0
      }
    }

    // 获取所有持仓并计算汇总
    const holdings = await getHoldings()
    
    const totalCost = holdings.reduce((sum, h) => {
      const cost = (h.averageCost || h.cost || 0) * (h.quantity || 0)
      return sum + cost
    }, 0)

    const totalValue = holdings.reduce((sum, h) => {
      const value = (h.currentPrice || h.price || 0) * (h.quantity || 0)
      return sum + value
    }, 0)

    const totalProfit = totalValue - totalCost
    const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0

    console.log(`[PortfolioService] 投资组合汇总: 总价值=${totalValue}, 总成本=${totalCost}, 盈亏=${totalProfit}`)

  return {
      totalValue,
      totalCost,
      totalProfit,
      totalProfitPercent,
      portfolioCount: portfolios.length,
      holdingCount: holdings.length
    }
  } catch (error: any) {
    console.error('[PortfolioService] 获取投资组合汇总失败:', error)
    return {
      totalValue: 0,
      totalCost: 0,
      totalProfit: 0,
      totalProfitPercent: 0,
      portfolioCount: 0,
      holdingCount: 0
    }
  }
}

/**
 * 获取所有持仓（跨投资组合）
 * @returns 所有持仓列表
 */
export async function getHoldings(): Promise<Holding[]> {
  console.log('[PortfolioService] 从API获取所有持仓...')

  try {
    // 先获取用户的所有投资组合
    const portfolios = await getUserPortfolios()
    
    if (!portfolios || portfolios.length === 0) {
      console.log('[PortfolioService] 用户没有投资组合，返回空数组')
      return []
    }

    // 获取所有投资组合的持仓
    const allHoldings: Holding[] = []
    for (const portfolio of portfolios) {
      try {
        const holdings = await getPortfolioHoldings(portfolio.id)
        if (holdings && holdings.length > 0) {
          allHoldings.push(...holdings)
        }
      } catch (error) {
        console.warn(`[PortfolioService] 获取投资组合 ${portfolio.id} 的持仓失败:`, error)
      }
    }

    console.log(`[PortfolioService] 成功获取 ${allHoldings.length} 条持仓数据`)
    return allHoldings
  } catch (error: any) {
    console.error('[PortfolioService] 获取持仓失败:', error)
    // 如果API调用失败，返回空数组而不是假数据
    return []
  }
}

/**
 * 获取所有交易记录（跨投资组合）
 * @returns 所有交易记录列表
 */
export async function getTransactions(): Promise<TradeRecord[]> {
  console.log('[PortfolioService] 从API获取所有交易记录...')

  try {
    // 先获取用户的所有投资组合
    const portfolios = await getUserPortfolios()
    
    if (!portfolios || portfolios.length === 0) {
      console.log('[PortfolioService] 用户没有投资组合，返回空数组')
      return []
    }

    // 获取所有投资组合的交易记录
    const allTransactions: TradeRecord[] = []
    for (const portfolio of portfolios) {
      try {
        const transactions = await getTradeRecords(portfolio.id)
        if (transactions && transactions.length > 0) {
          allTransactions.push(...transactions)
        }
      } catch (error) {
        console.warn(`[PortfolioService] 获取投资组合 ${portfolio.id} 的交易记录失败:`, error)
    }
    }

  // 按交易日期降序排序
    const sortedTransactions = allTransactions.sort((a, b) => {
      const dateA = new Date(a.tradeDate || a.createdAt || 0).getTime()
      const dateB = new Date(b.tradeDate || b.createdAt || 0).getTime()
      return dateB - dateA
    })

    console.log(`[PortfolioService] 成功获取 ${sortedTransactions.length} 条交易记录`)
    return sortedTransactions
  } catch (error: any) {
    console.error('[PortfolioService] 获取交易记录失败:', error)
    // 如果API调用失败，返回空数组而不是假数据
    return []
  }
}

// 创建服务对象，包含所有方法
export const portfolioService = {
  getUserPortfolios,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  getPortfolioHoldings,
  addHolding,
  updateHolding,
  deleteHolding,
  addTradeRecord,
  getTradeRecords,
  deleteTradeRecord,
  getPortfolioPerformance,
  getPortfolioSummary,
  getHoldings,
  getTransactions,
}
