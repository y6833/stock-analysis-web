import axios from 'axios'
import { getToken } from './userService'

// API基础URL
const API_URL = 'http://localhost:7001/api'

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
  const token = getToken()
  const response = await axios.get(`${API_URL}/portfolios`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  return response.data
}

/**
 * 创建投资组合
 * @param data 组合数据
 * @returns 创建的组合
 */
export async function createPortfolio(data: CreatePortfolioRequest): Promise<Portfolio> {
  const token = getToken()
  const response = await axios.post(`${API_URL}/portfolios`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  return response.data
}

/**
 * 更新投资组合
 * @param id 组合ID
 * @param data 更新数据
 * @returns 更新后的组合
 */
export async function updatePortfolio(id: number, data: CreatePortfolioRequest): Promise<Portfolio> {
  const token = getToken()
  const response = await axios.put(`${API_URL}/portfolios/${id}`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  return response.data
}

/**
 * 删除投资组合
 * @param id 组合ID
 */
export async function deletePortfolio(id: number): Promise<void> {
  const token = getToken()
  await axios.delete(`${API_URL}/portfolios/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
}

/**
 * 获取投资组合中的持仓
 * @param id 组合ID
 * @returns 持仓列表
 */
export async function getPortfolioHoldings(id: number): Promise<Holding[]> {
  const token = getToken()
  const response = await axios.get(`${API_URL}/portfolios/${id}/holdings`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  return response.data
}

/**
 * 添加持仓到投资组合
 * @param portfolioId 组合ID
 * @param data 持仓数据
 * @returns 添加的持仓
 */
export async function addHolding(portfolioId: number, data: AddHoldingRequest): Promise<Holding> {
  const token = getToken()
  const response = await axios.post(`${API_URL}/portfolios/${portfolioId}/holdings`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
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
  const token = getToken()
  const response = await axios.put(`${API_URL}/portfolios/${portfolioId}/holdings/${holdingId}`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  return response.data
}

/**
 * 删除持仓
 * @param portfolioId 组合ID
 * @param holdingId 持仓ID
 */
export async function deleteHolding(portfolioId: number, holdingId: number): Promise<void> {
  const token = getToken()
  await axios.delete(`${API_URL}/portfolios/${portfolioId}/holdings/${holdingId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
}

/**
 * 添加交易记录
 * @param portfolioId 组合ID
 * @param data 交易数据
 * @returns 添加的交易记录
 */
export async function addTradeRecord(portfolioId: number, data: AddTradeRecordRequest): Promise<TradeRecord> {
  const token = getToken()
  const response = await axios.post(`${API_URL}/portfolios/${portfolioId}/trades`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  return response.data
}

/**
 * 获取交易记录
 * @param portfolioId 组合ID
 * @returns 交易记录列表
 */
export async function getTradeRecords(portfolioId: number): Promise<TradeRecord[]> {
  const token = getToken()
  const response = await axios.get(`${API_URL}/portfolios/${portfolioId}/trades`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  return response.data
}
