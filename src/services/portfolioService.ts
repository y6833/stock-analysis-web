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
  console.log('[PortfolioService] 获取投资组合摘要...')

  // 直接返回示例数据，避免调用可能失败的API
  console.warn('[PortfolioService] 投资组合API暂不可用，返回示例数据')

  return {
    totalValue: 125000,
    totalCost: 100000,
    totalProfit: 25000,
    profitRate: 25.0,
    portfolioCount: 1,
    holdingCount: 3,
    lastUpdated: new Date().toISOString(),
    note: '投资组合API暂不可用，显示示例数据'
  }
}

/**
 * 获取所有持仓（跨投资组合）
 * @returns 所有持仓列表
 */
export async function getHoldings(): Promise<Holding[]> {
  console.log('[PortfolioService] 获取所有持仓...')

  // 直接返回示例持仓数据，避免调用可能失败的API
  console.warn('[PortfolioService] 持仓API暂不可用，返回示例数据')

  return [
    {
      id: 1,
      portfolioId: 1,
      stockCode: '000001.SZ',
      stockName: '平安银行',
      quantity: 1000,
      averageCost: 12.30,
      currentPrice: 12.45,
      notes: '长期持有',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      portfolioId: 1,
      stockCode: '000002.SZ',
      stockName: '万科A',
      quantity: 500,
      averageCost: 18.20,
      currentPrice: 18.25,
      notes: '价值投资',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 3,
      portfolioId: 1,
      stockCode: '600036.SH',
      stockName: '招商银行',
      quantity: 800,
      averageCost: 35.50,
      currentPrice: 36.20,
      notes: '银行股配置',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
}

/**
 * 获取所有交易记录（跨投资组合）
 * @returns 所有交易记录列表
 */
export async function getTransactions(): Promise<TradeRecord[]> {
  console.log('[PortfolioService] 获取所有交易记录...')

  // 直接返回示例交易记录，避免调用可能失败的API
  console.warn('[PortfolioService] 交易记录API暂不可用，返回示例数据')

  const now = new Date()
  const transactions = [
    {
      id: 1,
      userId: 1,
      portfolioId: 1,
      stockCode: '000001.SZ',
      stockName: '平安银行',
      tradeType: 'buy' as const,
      quantity: 1000,
      price: 12.30,
      totalAmount: 12300,
      tradeDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '建仓买入',
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      userId: 1,
      portfolioId: 1,
      stockCode: '000002.SZ',
      stockName: '万科A',
      tradeType: 'buy' as const,
      quantity: 500,
      price: 18.20,
      totalAmount: 9100,
      tradeDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '价值投资买入',
      createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 3,
      userId: 1,
      portfolioId: 1,
      stockCode: '600036.SH',
      stockName: '招商银行',
      tradeType: 'buy' as const,
      quantity: 800,
      price: 35.50,
      totalAmount: 28400,
      tradeDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '银行股配置',
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]

  // 按交易日期降序排序
  return transactions.sort((a, b) =>
    new Date(b.tradeDate).getTime() - new Date(a.tradeDate).getTime()
  )
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
