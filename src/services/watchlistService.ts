import axios from 'axios'
import { getToken } from './userService'

// API基础URL
const API_URL = 'http://localhost:7001/api'

// 关注分组类型
export interface Watchlist {
  id: number
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  watchlist_items?: WatchlistItem[]
}

// 关注股票类型
export interface WatchlistItem {
  id: number
  watchlistId: number
  stockCode: string
  stockName: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// 创建关注分组请求
export interface CreateWatchlistRequest {
  name: string
  description?: string
}

// 添加股票到关注分组请求
export interface AddStockRequest {
  stockCode: string
  stockName: string
  notes?: string
}

/**
 * 获取用户的所有关注分组
 * @returns 关注分组列表
 */
export async function getUserWatchlists(): Promise<Watchlist[]> {
  const token = getToken()
  const response = await axios.get(`${API_URL}/watchlists`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data
}

/**
 * 创建关注分组
 * @param data 分组数据
 * @returns 创建的分组
 */
export async function createWatchlist(data: CreateWatchlistRequest): Promise<Watchlist> {
  const token = getToken()
  const response = await axios.post(`${API_URL}/watchlists`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data
}

/**
 * 更新关注分组
 * @param id 分组ID
 * @param data 更新数据
 * @returns 更新后的分组
 */
export async function updateWatchlist(
  id: number,
  data: CreateWatchlistRequest
): Promise<Watchlist> {
  const token = getToken()
  const response = await axios.put(`${API_URL}/watchlists/${id}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data
}

/**
 * 删除关注分组
 * @param id 分组ID
 */
export async function deleteWatchlist(id: number): Promise<void> {
  const token = getToken()
  await axios.delete(`${API_URL}/watchlists/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

/**
 * 获取关注分组中的股票
 * @param id 分组ID
 * @returns 股票列表
 */
export async function getWatchlistItems(id: number): Promise<WatchlistItem[]> {
  const token = getToken()
  const response = await axios.get(`${API_URL}/watchlists/${id}/stocks`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data
}

/**
 * 添加股票到关注分组
 * @param watchlistId 分组ID
 * @param data 股票数据
 * @returns 添加的股票
 */
export async function addStockToWatchlist(
  watchlistId: number,
  data: AddStockRequest
): Promise<WatchlistItem> {
  const token = getToken()
  const response = await axios.post(`${API_URL}/watchlists/${watchlistId}/stocks`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data
}

/**
 * 从关注分组中删除股票
 * @param watchlistId 分组ID
 * @param itemId 股票ID
 */
export async function removeStockFromWatchlist(watchlistId: number, itemId: number): Promise<void> {
  const token = getToken()
  await axios.delete(`${API_URL}/watchlists/${watchlistId}/stocks/${itemId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

/**
 * 更新关注股票的备注
 * @param watchlistId 分组ID
 * @param itemId 股票ID
 * @param notes 备注
 * @returns 更新后的股票
 */
export async function updateWatchlistItemNotes(
  watchlistId: number,
  itemId: number,
  notes: string
): Promise<WatchlistItem> {
  const token = getToken()
  const response = await axios.put(
    `${API_URL}/watchlists/${watchlistId}/stocks/${itemId}/notes`,
    { notes },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
  return response.data
}
