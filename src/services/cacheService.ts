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

// 多层缓存管理器
class MultiLayerCacheManager {
  private memoryCache = new Map<string, SmartCacheItem>()
  private readonly maxMemorySize = 50 * 1024 * 1024 // 50MB内存缓存限制
  private readonly compressionThreshold = 1024 // 1KB以上数据进行压缩
  private currentMemorySize = 0

  /**
   * 多层缓存获取策略
   * 1. 内存缓存 (最快)
   * 2. localStorage (中等速度)
   * 3. sessionStorage (备用)
   * 4. IndexedDB (大数据存储)
   */
  async getMultiLayer<T>(key: string, options: SmartCacheOptions = {}): Promise<T | null> {
    const { forceRefresh = false, version } = options

    if (forceRefresh) {
      return null
    }

    // 第一层：内存缓存
    const memoryItem = this.memoryCache.get(key)
    if (memoryItem && this.isValid(memoryItem, version)) {
      return memoryItem.data
    }

    // 第二层：localStorage
    try {
      const localItem = localStorage.getItem(`cache:${key}`)
      if (localItem) {
        const parsed: SmartCacheItem<T> = JSON.parse(localItem)
        if (this.isValid(parsed, version)) {
          // 提升到内存缓存
          this.setMemoryCache(key, parsed)
          return parsed.data
        } else {
          localStorage.removeItem(`cache:${key}`)
        }
      }
    } catch (error) {
      console.warn(`localStorage缓存读取失败: ${key}`, error)
    }

    // 第三层：sessionStorage
    try {
      const sessionItem = sessionStorage.getItem(`cache:${key}`)
      if (sessionItem) {
        const parsed: SmartCacheItem<T> = JSON.parse(sessionItem)
        if (this.isValid(parsed, version)) {
          // 提升到内存缓存和localStorage
          this.setMemoryCache(key, parsed)
          try {
            localStorage.setItem(`cache:${key}`, sessionItem)
          } catch (e) {
            // localStorage可能已满，忽略错误
          }
          return parsed.data
        } else {
          sessionStorage.removeItem(`cache:${key}`)
        }
      }
    } catch (error) {
      console.warn(`sessionStorage缓存读取失败: ${key}`, error)
    }

    // 第四层：IndexedDB (用于大数据)
    try {
      const idbItem = await this.getFromIndexedDB<T>(key)
      if (idbItem && this.isValid(idbItem, version)) {
        // 根据数据大小决定是否提升到上层缓存
        const dataSize = JSON.stringify(idbItem).length
        if (dataSize < this.compressionThreshold) {
          this.setMemoryCache(key, idbItem)
          try {
            localStorage.setItem(`cache:${key}`, JSON.stringify(idbItem))
          } catch (e) {
            // localStorage可能已满，忽略错误
          }
        }
        return idbItem.data
      }
    } catch (error) {
      console.warn(`IndexedDB缓存读取失败: ${key}`, error)
    }

    return null
  }

  /**
   * 多层缓存设置策略
   * 根据数据大小和重要性选择合适的存储层
   */
  async setMultiLayer<T>(key: string, data: T, options: SmartCacheOptions = {}): Promise<void> {
    const {
      expiry = 5 * 60 * 1000,
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

    const serializedData = JSON.stringify(item)
    const dataSize = serializedData.length

    // 根据数据大小选择存储策略
    if (dataSize > 1024 * 1024) { // 大于1MB的数据
      // 只存储到IndexedDB
      await this.setToIndexedDB(key, item)
    } else if (dataSize > 100 * 1024) { // 大于100KB的数据
      // 存储到IndexedDB和sessionStorage
      await this.setToIndexedDB(key, item)
      try {
        sessionStorage.setItem(`cache:${key}`, serializedData)
      } catch (e) {
        console.warn(`sessionStorage存储失败: ${key}`, e)
      }
    } else { // 小数据
      // 存储到所有层
      this.setMemoryCache(key, item)

      try {
        localStorage.setItem(`cache:${key}`, serializedData)
      } catch (e) {
        console.warn(`localStorage存储失败: ${key}`, e)
        // 如果localStorage失败，尝试sessionStorage
        try {
          sessionStorage.setItem(`cache:${key}`, serializedData)
        } catch (e2) {
          console.warn(`sessionStorage存储失败: ${key}`, e2)
        }
      }

      try {
        sessionStorage.setItem(`cache:${key}`, serializedData)
      } catch (e) {
        // sessionStorage失败不影响其他层
      }
    }
  }

  /**
   * 智能缓存失效
   * 根据依赖关系和标签进行级联失效
   */
  async smartInvalidate(key: string, tags?: string[]): Promise<void> {
    // 从所有层删除主键
    await this.deleteFromAllLayers(key)

    // 如果提供了标签，删除相关的缓存
    if (tags && tags.length > 0) {
      await this.invalidateByTags(tags)
    }

    // 根据预定义的依赖关系进行级联失效
    const dependencies = this.getDependencies(key)
    for (const dep of dependencies) {
      await this.deleteFromAllLayers(dep)
    }
  }

  /**
   * 缓存预热
   * 预加载可能需要的数据
   */
  async warmup(keys: Array<{ key: string; fetcher: () => Promise<any>; options?: SmartCacheOptions }>): Promise<void> {
    const warmupPromises = keys.map(async ({ key, fetcher, options = {} }) => {
      try {
        // 检查缓存是否已存在
        const cached = await this.getMultiLayer(key, options)
        if (cached !== null) return

        // 获取数据并缓存
        const data = await fetcher()
        await this.setMultiLayer(key, data, options)
      } catch (error) {
        console.warn(`缓存预热失败: ${key}`, error)
      }
    })

    await Promise.allSettled(warmupPromises)
  }

  /**
   * 缓存压缩
   * 对大型数据进行压缩存储
   */
  private async compressData(data: any): Promise<string> {
    // 简单的压缩实现，实际项目中可以使用更高效的压缩算法
    const jsonString = JSON.stringify(data)

    // 如果数据较小，不进行压缩
    if (jsonString.length < this.compressionThreshold) {
      return jsonString
    }

    // 这里可以集成LZ-string或其他压缩库
    // 目前返回原始数据
    return jsonString
  }

  /**
   * 缓存解压缩
   */
  private async decompressData(compressedData: string): Promise<any> {
    // 对应的解压缩实现
    return JSON.parse(compressedData)
  }

  /**
   * 内存缓存管理
   */
  private setMemoryCache<T>(key: string, item: SmartCacheItem<T>): void {
    const itemSize = JSON.stringify(item).length

    // 检查内存限制
    if (this.currentMemorySize + itemSize > this.maxMemorySize) {
      this.evictMemoryCache(itemSize)
    }

    this.memoryCache.set(key, item)
    this.currentMemorySize += itemSize
  }

  /**
   * 内存缓存淘汰策略 (LRU)
   */
  private evictMemoryCache(requiredSize: number): void {
    const entries = Array.from(this.memoryCache.entries())

    // 按时间戳排序，删除最旧的项
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

    let freedSize = 0
    for (const [key, item] of entries) {
      const itemSize = JSON.stringify(item).length
      this.memoryCache.delete(key)
      this.currentMemorySize -= itemSize
      freedSize += itemSize

      if (freedSize >= requiredSize) {
        break
      }
    }
  }

  /**
   * IndexedDB操作
   */
  private async getFromIndexedDB<T>(key: string): Promise<SmartCacheItem<T> | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open('CacheDB', 1)

      request.onerror = () => resolve(null)

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = db.transaction(['cache'], 'readonly')
        const store = transaction.objectStore('cache')
        const getRequest = store.get(key)

        getRequest.onsuccess = () => {
          resolve(getRequest.result || null)
        }

        getRequest.onerror = () => resolve(null)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' })
        }
      }
    })
  }

  private async setToIndexedDB<T>(key: string, item: SmartCacheItem<T>): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CacheDB', 1)

      request.onerror = () => reject(new Error('IndexedDB error'))

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = db.transaction(['cache'], 'readwrite')
        const store = transaction.objectStore('cache')

        store.put({ key, ...item })

        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(new Error('Transaction error'))
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' })
        }
      }
    })
  }

  /**
   * 从所有层删除缓存
   */
  private async deleteFromAllLayers(key: string): Promise<void> {
    // 内存缓存
    const item = this.memoryCache.get(key)
    if (item) {
      this.currentMemorySize -= JSON.stringify(item).length
      this.memoryCache.delete(key)
    }

    // localStorage
    try {
      localStorage.removeItem(`cache:${key}`)
    } catch (e) {
      // 忽略错误
    }

    // sessionStorage
    try {
      sessionStorage.removeItem(`cache:${key}`)
    } catch (e) {
      // 忽略错误
    }

    // IndexedDB
    try {
      await new Promise<void>((resolve) => {
        const request = indexedDB.open('CacheDB', 1)
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          const transaction = db.transaction(['cache'], 'readwrite')
          const store = transaction.objectStore('cache')
          store.delete(key)
          transaction.oncomplete = () => resolve()
          transaction.onerror = () => resolve() // 忽略错误
        }
        request.onerror = () => resolve() // 忽略错误
      })
    } catch (e) {
      // 忽略错误
    }
  }

  /**
   * 根据标签失效缓存
   */
  private async invalidateByTags(tags: string[]): Promise<void> {
    // 遍历内存缓存
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.tags && item.tags.some(tag => tags.includes(tag))) {
        await this.deleteFromAllLayers(key)
      }
    }

    // 遍历localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('cache:')) {
          try {
            const item = JSON.parse(localStorage.getItem(key) || '{}')
            if (item.tags && item.tags.some((tag: string) => tags.includes(tag))) {
              const cacheKey = key.replace('cache:', '')
              await this.deleteFromAllLayers(cacheKey)
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    } catch (e) {
      // 忽略错误
    }
  }

  /**
   * 获取依赖关系
   */
  private getDependencies(key: string): string[] {
    const dependencies: Record<string, string[]> = {
      'stock:*:info': ['stock:list', 'market:overview'],
      'user:profile': ['user:watchlist:*', 'user:portfolio:*'],
      'market:overview': ['stock:hot', 'index:main']
    }

    const result: string[] = []
    for (const [pattern, deps] of Object.entries(dependencies)) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$')
      if (regex.test(key)) {
        result.push(...deps)
      }
    }

    return result
  }

  /**
   * 检查缓存项是否有效
   */
  private isValid<T>(item: SmartCacheItem<T>, version?: string): boolean {
    const now = Date.now()
    const isNotExpired = now - item.timestamp < item.expiry
    const isVersionMatch = !version || item.version === version
    return isNotExpired && isVersionMatch
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return {
      memoryCache: {
        size: this.memoryCache.size,
        memoryUsage: this.currentMemorySize,
        maxMemorySize: this.maxMemorySize
      },
      localStorage: {
        available: typeof Storage !== 'undefined',
        usage: this.getStorageUsage(localStorage)
      },
      sessionStorage: {
        available: typeof Storage !== 'undefined',
        usage: this.getStorageUsage(sessionStorage)
      }
    }
  }

  private getStorageUsage(storage: Storage): number {
    let total = 0
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key && key.startsWith('cache:')) {
          const value = storage.getItem(key)
          if (value) {
            total += value.length
          }
        }
      }
    } catch (e) {
      // 忽略错误
    }
    return total
  }
}

// 创建多层缓存实例
export const multiLayerCache = new MultiLayerCacheManager()

// 缓存服务
export const cacheService = {
  // 智能缓存方法
  smartCache,

  // 多层缓存方法
  multiLayerCache,

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
