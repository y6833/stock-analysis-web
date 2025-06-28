/**
 * 缓存服务
 * 处理数据缓存相关的功能，包括智能缓存管理
 */

import axios from 'axios'
import { getAuthHeaders } from '@/utils/auth'

// API基础URL
const API_URL = 'http://localhost:7001/api'

// 智能缓存项接口
interface SmartCacheItem<T = any> {
  data: T
  timestamp: number
  expiry: number
  version?: string
  tags?: string[]
}

// 智能缓存选项
interface SmartCacheOptions {
  expiry?: number // 过期时间（毫秒）
  version?: string // 版本号
  tags?: string[] // 标签
  forceRefresh?: boolean // 强制刷新
}

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

// 智能缓存管理器
class SmartCacheManager {
  private memoryCache = new Map<string, SmartCacheItem>()
  private readonly defaultExpiry = 5 * 60 * 1000 // 5分钟
  private readonly maxMemoryCacheSize = 100

  /**
   * 获取缓存数据
   */
  async get<T>(key: string, options: SmartCacheOptions = {}): Promise<T | null> {
    const { forceRefresh = false, version } = options

    if (forceRefresh) {
      return null
    }

    // 检查内存缓存
    const memoryItem = this.memoryCache.get(key)
    if (memoryItem && this.isValid(memoryItem, version)) {
      return memoryItem.data
    }

    // 检查localStorage缓存
    try {
      const localItem = localStorage.getItem(key)
      if (localItem) {
        const parsed: SmartCacheItem<T> = JSON.parse(localItem)
        if (this.isValid(parsed, version)) {
          this.setMemoryCache(key, parsed)
          return parsed.data
        } else {
          localStorage.removeItem(key)
        }
      }
    } catch (error) {
      console.warn(`读取缓存失败: ${key}`, error)
    }

    return null
  }

  /**
   * 设置缓存数据
   */
  async set<T>(key: string, data: T, options: SmartCacheOptions = {}): Promise<void> {
    const {
      expiry = this.defaultExpiry,
      version = '1.0',
      tags = []
    } = options

    const item: SmartCacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry,
      version,
      tags
    }

    this.setMemoryCache(key, item)

    try {
      localStorage.setItem(key, JSON.stringify(item))
    } catch (error) {
      console.warn(`设置缓存失败: ${key}`, error)
    }
  }

  /**
   * 带缓存的数据获取
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: SmartCacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options)
    if (cached !== null) {
      return cached
    }

    const data = await fetcher()
    await this.set(key, data, options)
    return data
  }

  private isValid<T>(item: SmartCacheItem<T>, version?: string): boolean {
    const now = Date.now()
    const isNotExpired = now - item.timestamp < item.expiry
    const isVersionMatch = !version || item.version === version
    return isNotExpired && isVersionMatch
  }

  private setMemoryCache<T>(key: string, item: SmartCacheItem<T>): void {
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const oldestKey = this.memoryCache.keys().next().value
      if (oldestKey) {
        this.memoryCache.delete(oldestKey)
      }
    }
    this.memoryCache.set(key, item)
  }
}

// 创建智能缓存实例
export const smartCache = new SmartCacheManager()

// 缓存服务
export const cacheService = {
  // 智能缓存方法
  smartCache,

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
