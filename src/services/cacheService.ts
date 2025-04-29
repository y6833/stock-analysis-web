/**
 * 缓存服务
 * 处理数据缓存相关的功能
 */

import axios from 'axios'
import { getAuthHeaders } from '@/utils/auth'

// API基础URL
const API_URL = 'http://localhost:7001/api'

// 缓存状态接口
export interface CacheStatus {
  success: boolean
  dataSource: string
  available: boolean
  lastUpdate: string | null
  cacheKeys: string[]
  stockCount: number
  indexCount: number
  industryCount: number
  error: string | null
}

// 刷新限制接口
export interface RefreshLimit {
  success: boolean
  dataSource: string
  canRefresh: boolean
  lastUpdate: string | null
  nextRefreshTime: string | null
  timeRemaining: number | null
  error: string | null
}

// 刷新结果接口
export interface RefreshResult {
  success: boolean
  message: string
  dataSource: string
  cachedItems: number
  refreshTime: string
  error?: string
}

// 缓存服务
export const cacheService = {
  /**
   * 获取缓存状态
   * @param dataSource 数据源名称
   */
  async getCacheStatus(dataSource?: string): Promise<CacheStatus> {
    try {
      // 如果没有提供数据源，使用当前数据源
      const currentDataSource =
        dataSource || localStorage.getItem('preferredDataSource') || 'tushare'

      const response = await axios.get(
        `${API_URL}/cache/status?dataSource=${currentDataSource}`,
        getAuthHeaders()
      )
      return response.data
    } catch (error: any) {
      console.error('获取缓存状态失败:', error)
      throw new Error(error.response?.data?.message || '获取缓存状态失败')
    }
  },

  /**
   * 刷新缓存数据
   * @param dataSource 数据源名称
   */
  async refreshCache(dataSource: string = 'tushare'): Promise<RefreshResult> {
    try {
      const response = await axios.post(
        `${API_URL}/cache/refresh`,
        { dataSource },
        getAuthHeaders()
      )
      return response.data
    } catch (error: any) {
      console.error('刷新缓存失败:', error)
      throw new Error(error.response?.data?.message || '刷新缓存失败')
    }
  },

  /**
   * 清除缓存
   * @param dataSource 数据源名称
   */
  async clearCache(dataSource: string = 'tushare'): Promise<any> {
    try {
      const response = await axios.delete(`${API_URL}/cache/${dataSource}`, getAuthHeaders())
      return response.data
    } catch (error: any) {
      console.error('清除缓存失败:', error)
      throw new Error(error.response?.data?.message || '清除缓存失败')
    }
  },

  /**
   * 检查是否可以刷新缓存
   * @param dataSource 数据源名称
   */
  async checkRefreshLimit(dataSource?: string): Promise<RefreshLimit> {
    try {
      // 如果没有提供数据源，使用当前数据源
      const currentDataSource =
        dataSource || localStorage.getItem('preferredDataSource') || 'tushare'

      const response = await axios.get(
        `${API_URL}/cache/refresh-limit?dataSource=${currentDataSource}`,
        getAuthHeaders()
      )
      return response.data
    } catch (error: any) {
      console.error('检查刷新限制失败:', error)
      throw new Error(error.response?.data?.message || '检查刷新限制失败')
    }
  },

  /**
   * 格式化剩余时间
   * @param ms 剩余时间（毫秒）
   */
  formatTimeRemaining(ms: number): string {
    if (!ms || ms <= 0) return '0分钟'

    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)

    if (minutes > 0) {
      return `${minutes}分钟${seconds > 0 ? seconds + '秒' : ''}`
    }
    return `${seconds}秒`
  },
}
