import axios from 'axios'
import { getAuthHeaders } from '@/utils/auth'

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
  const response = await axios.get(`${API_URL}/watchlists`, getAuthHeaders())
  return response.data
}

/**
 * 创建关注分组
 * @param data 分组数据
 * @returns 创建的分组
 */
export async function createWatchlist(data: CreateWatchlistRequest): Promise<Watchlist> {
  const response = await axios.post(`${API_URL}/watchlists`, data, getAuthHeaders())
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
  const response = await axios.put(`${API_URL}/watchlists/${id}`, data, getAuthHeaders())
  return response.data
}

/**
 * 删除关注分组
 * @param id 分组ID
 */
export async function deleteWatchlist(id: number): Promise<void> {
  await axios.delete(`${API_URL}/watchlists/${id}`, getAuthHeaders())
}

/**
 * 获取关注分组中的股票
 * @param id 分组ID
 * @returns 股票列表
 */
export async function getWatchlistItems(id: number): Promise<WatchlistItem[]> {
  const response = await axios.get(`${API_URL}/watchlists/${id}/stocks`, getAuthHeaders())
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
  const response = await axios.post(
    `${API_URL}/watchlists/${watchlistId}/stocks`,
    data,
    getAuthHeaders()
  )
  return response.data
}

/**
 * 从关注分组中删除股票
 * @param watchlistId 分组ID
 * @param itemId 股票ID
 */
export async function removeStockFromWatchlist(watchlistId: number, itemId: number): Promise<void> {
  await axios.delete(`${API_URL}/watchlists/${watchlistId}/stocks/${itemId}`, getAuthHeaders())
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
  const response = await axios.put(
    `${API_URL}/watchlists/${watchlistId}/stocks/${itemId}/notes`,
    { notes },
    getAuthHeaders()
  )
  return response.data
}

/**
 * 获取用户的关注股票列表（简化版本）
 * @returns 关注股票列表
 */
export async function getWatchlist(): Promise<WatchlistItem[]> {
  const watchlists = await getUserWatchlists()
  if (watchlists.length === 0) return []

  // 返回第一个关注分组的股票
  return await getWatchlistItems(watchlists[0].id)
}

/**
 * 添加股票到关注列表（简化版本）
 * @param symbol 股票代码
 * @param options 选项
 * @returns 添加的股票
 */
export async function addToWatchlist(
  symbol: string,
  options?: { name?: string; notes?: string }
): Promise<WatchlistItem> {
  const watchlists = await getUserWatchlists()
  if (watchlists.length === 0) {
    throw new Error('没有可用的关注分组')
  }

  return await addStockToWatchlist(watchlists[0].id, {
    stockCode: symbol,
    stockName: options?.name || symbol,
    notes: options?.notes
  })
}

/**
 * 从关注列表移除股票（简化版本）
 * @param symbol 股票代码
 */
export async function removeFromWatchlist(symbol: string): Promise<void> {
  const watchlists = await getUserWatchlists()
  if (watchlists.length === 0) return

  const items = await getWatchlistItems(watchlists[0].id)
  const item = items.find(item => item.stockCode === symbol)

  if (item) {
    await removeStockFromWatchlist(watchlists[0].id, item.id)
  }
}

/**
 * 更新关注列表项（简化版本）
 * @param symbol 股票代码
 * @param updates 更新数据
 * @returns 更新后的股票
 */
export async function updateWatchlistItem(
  symbol: string,
  updates: { notes?: string }
): Promise<WatchlistItem> {
  const watchlists = await getUserWatchlists()
  if (watchlists.length === 0) {
    throw new Error('没有可用的关注分组')
  }

  const items = await getWatchlistItems(watchlists[0].id)
  const item = items.find(item => item.stockCode === symbol)

  if (!item) {
    throw new Error('股票不在关注列表中')
  }

  if (updates.notes !== undefined) {
    return await updateWatchlistItemNotes(watchlists[0].id, item.id, updates.notes)
  }

  return item
}

/**
 * 批量添加股票到关注列表
 * @param symbols 股票代码列表
 * @returns 添加结果
 */
export async function addMultipleToWatchlist(symbols: string[]): Promise<{
  success: WatchlistItem[]
  failed: string[]
}> {
  const watchlists = await getUserWatchlists()
  if (watchlists.length === 0) {
    throw new Error('没有可用的关注分组')
  }

  const success: WatchlistItem[] = []
  const failed: string[] = []

  for (const symbol of symbols) {
    try {
      const item = await addStockToWatchlist(watchlists[0].id, {
        stockCode: symbol,
        stockName: symbol
      })
      success.push(item)
    } catch (error) {
      failed.push(symbol)
    }
  }

  return { success, failed }
}

/**
 * 清空关注列表
 */
export async function clearWatchlist(): Promise<void> {
  const watchlists = await getUserWatchlists()
  if (watchlists.length === 0) return

  const items = await getWatchlistItems(watchlists[0].id)

  for (const item of items) {
    await removeStockFromWatchlist(watchlists[0].id, item.id)
  }
}

// 默认导出的服务对象
export const watchlistService = {
  getUserWatchlists,
  createWatchlist,
  updateWatchlist,
  deleteWatchlist,
  getWatchlistItems,
  addStockToWatchlist,
  removeStockFromWatchlist,
  updateWatchlistItemNotes,
  // 简化版本的方法
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  updateWatchlistItem,
  addMultipleToWatchlist,
  clearWatchlist
}

// 也提供默认导出
export default watchlistService
