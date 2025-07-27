/**
 * 智能缓存系统
 * 提供内存缓存、本地存储缓存和缓存策略管理
 */

// 缓存项接口
interface CacheItem<T = any> {
  data: T
  timestamp: number
  expiry: number
  version: string
  tags: string[]
  accessCount: number
  lastAccessed: number
}

// 缓存选项
interface CacheOptions {
  expiry?: number // 过期时间（毫秒）
  version?: string // 版本号
  tags?: string[] // 标签，用于批量清理
  storage?: 'memory' | 'localStorage' | 'sessionStorage' // 存储类型
  compress?: boolean // 是否压缩
}

// 缓存统计
interface CacheStats {
  totalItems: number
  memoryUsage: number
  hitRate: number
  totalHits: number
  totalMisses: number
}

class SmartCache {
  private memoryCache = new Map<string, CacheItem>()
  private stats = {
    totalHits: 0,
    totalMisses: 0
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const {
      expiry = 5 * 60 * 1000, // 默认5分钟
      version = '1.0',
      tags = [],
      storage = 'memory',
      compress = false
    } = options

    const item: CacheItem<T> = {
      data: compress ? this.compress(data) : data,
      timestamp: Date.now(),
      expiry,
      version,
      tags,
      accessCount: 0,
      lastAccessed: Date.now()
    }

    switch (storage) {
      case 'memory':
        this.memoryCache.set(key, item)
        break
      case 'localStorage':
        this.setToStorage('localStorage', key, item)
        break
      case 'sessionStorage':
        this.setToStorage('sessionStorage', key, item)
        break
    }

    console.log(`[SmartCache] 设置缓存: ${key} (${storage})`)
  }

  /**
   * 获取缓存
   */
  get<T>(key: string, storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): T | null {
    let item: CacheItem<T> | null = null

    switch (storage) {
      case 'memory':
        item = this.memoryCache.get(key) || null
        break
      case 'localStorage':
      case 'sessionStorage':
        item = this.getFromStorage(storage, key)
        break
    }

    if (!item) {
      this.stats.totalMisses++
      return null
    }

    // 检查是否过期
    if (this.isExpired(item)) {
      this.delete(key, storage)
      this.stats.totalMisses++
      return null
    }

    // 更新访问统计
    item.accessCount++
    item.lastAccessed = Date.now()
    this.stats.totalHits++

    console.log(`[SmartCache] 命中缓存: ${key} (${storage})`)
    
    return item.compress ? this.decompress(item.data) : item.data
  }

  /**
   * 获取或设置缓存（缓存穿透保护）
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { storage = 'memory' } = options
    
    // 尝试从缓存获取
    const cached = this.get<T>(key, storage)
    if (cached !== null) {
      return cached
    }

    try {
      // 缓存未命中，调用工厂函数
      console.log(`[SmartCache] 缓存未命中，调用工厂函数: ${key}`)
      const data = await factory()
      
      // 设置缓存
      this.set(key, data, options)
      
      return data
    } catch (error) {
      console.error(`[SmartCache] 工厂函数执行失败: ${key}`, error)
      throw error
    }
  }

  /**
   * 删除缓存
   */
  delete(key: string, storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): boolean {
    switch (storage) {
      case 'memory':
        const deleted = this.memoryCache.delete(key)
        if (deleted) {
          console.log(`[SmartCache] 删除缓存: ${key} (memory)`)
        }
        return deleted
      case 'localStorage':
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(`cache_${key}`)
          console.log(`[SmartCache] 删除缓存: ${key} (localStorage)`)
          return true
        }
        return false
      case 'sessionStorage':
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(`cache_${key}`)
          console.log(`[SmartCache] 删除缓存: ${key} (sessionStorage)`)
          return true
        }
        return false
    }
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string, storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): boolean {
    switch (storage) {
      case 'memory':
        const item = this.memoryCache.get(key)
        return item ? !this.isExpired(item) : false
      case 'localStorage':
        return typeof localStorage !== 'undefined' && localStorage.getItem(`cache_${key}`) !== null
      case 'sessionStorage':
        return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(`cache_${key}`) !== null
    }
  }

  /**
   * 根据标签清理缓存
   */
  invalidateByTags(tags: string[]): void {
    console.log(`[SmartCache] 根据标签清理缓存:`, tags)
    
    // 清理内存缓存
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.tags.some(tag => tags.includes(tag))) {
        this.memoryCache.delete(key)
        console.log(`[SmartCache] 删除标签缓存: ${key}`)
      }
    }

    // 清理本地存储缓存
    this.clearStorageByTags('localStorage', tags)
    this.clearStorageByTags('sessionStorage', tags)
  }

  /**
   * 清理过期缓存
   */
  clearExpired(): void {
    console.log('[SmartCache] 清理过期缓存...')
    
    // 清理内存缓存
    for (const [key, item] of this.memoryCache.entries()) {
      if (this.isExpired(item)) {
        this.memoryCache.delete(key)
      }
    }

    // 清理本地存储缓存
    this.clearExpiredFromStorage('localStorage')
    this.clearExpiredFromStorage('sessionStorage')
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    console.log('[SmartCache] 清空所有缓存')
    
    this.memoryCache.clear()
    
    if (typeof localStorage !== 'undefined') {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'))
      keys.forEach(key => localStorage.removeItem(key))
    }
    
    if (typeof sessionStorage !== 'undefined') {
      const keys = Object.keys(sessionStorage).filter(key => key.startsWith('cache_'))
      keys.forEach(key => sessionStorage.removeItem(key))
    }
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const memoryUsage = this.calculateMemoryUsage()
    const totalRequests = this.stats.totalHits + this.stats.totalMisses
    const hitRate = totalRequests > 0 ? (this.stats.totalHits / totalRequests) * 100 : 0

    return {
      totalItems: this.memoryCache.size,
      memoryUsage,
      hitRate: Math.round(hitRate * 100) / 100,
      totalHits: this.stats.totalHits,
      totalMisses: this.stats.totalMisses
    }
  }

  /**
   * 预热缓存
   */
  async warmup(keys: Array<{ key: string; factory: () => Promise<any>; options?: CacheOptions }>): Promise<void> {
    console.log('[SmartCache] 开始预热缓存...')
    
    const promises = keys.map(async ({ key, factory, options }) => {
      try {
        await this.getOrSet(key, factory, options)
      } catch (error) {
        console.error(`[SmartCache] 预热缓存失败: ${key}`, error)
      }
    })

    await Promise.allSettled(promises)
    console.log('[SmartCache] 缓存预热完成')
  }

  // 私有方法

  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > item.expiry
  }

  private setToStorage(storageType: 'localStorage' | 'sessionStorage', key: string, item: CacheItem): void {
    try {
      const storage = storageType === 'localStorage' ? localStorage : sessionStorage
      if (typeof storage !== 'undefined') {
        storage.setItem(`cache_${key}`, JSON.stringify(item))
      }
    } catch (error) {
      console.error(`[SmartCache] 设置${storageType}失败:`, error)
    }
  }

  private getFromStorage(storageType: 'localStorage' | 'sessionStorage', key: string): CacheItem | null {
    try {
      const storage = storageType === 'localStorage' ? localStorage : sessionStorage
      if (typeof storage !== 'undefined') {
        const data = storage.getItem(`cache_${key}`)
        return data ? JSON.parse(data) : null
      }
    } catch (error) {
      console.error(`[SmartCache] 获取${storageType}失败:`, error)
    }
    return null
  }

  private clearStorageByTags(storageType: 'localStorage' | 'sessionStorage', tags: string[]): void {
    try {
      const storage = storageType === 'localStorage' ? localStorage : sessionStorage
      if (typeof storage !== 'undefined') {
        const keys = Object.keys(storage).filter(key => key.startsWith('cache_'))
        
        keys.forEach(key => {
          try {
            const item = JSON.parse(storage.getItem(key) || '{}')
            if (item.tags && item.tags.some((tag: string) => tags.includes(tag))) {
              storage.removeItem(key)
            }
          } catch (error) {
            // 忽略解析错误
          }
        })
      }
    } catch (error) {
      console.error(`[SmartCache] 清理${storageType}标签缓存失败:`, error)
    }
  }

  private clearExpiredFromStorage(storageType: 'localStorage' | 'sessionStorage'): void {
    try {
      const storage = storageType === 'localStorage' ? localStorage : sessionStorage
      if (typeof storage !== 'undefined') {
        const keys = Object.keys(storage).filter(key => key.startsWith('cache_'))
        
        keys.forEach(key => {
          try {
            const item = JSON.parse(storage.getItem(key) || '{}')
            if (this.isExpired(item)) {
              storage.removeItem(key)
            }
          } catch (error) {
            // 删除无效的缓存项
            storage.removeItem(key)
          }
        })
      }
    } catch (error) {
      console.error(`[SmartCache] 清理${storageType}过期缓存失败:`, error)
    }
  }

  private calculateMemoryUsage(): number {
    let size = 0
    for (const item of this.memoryCache.values()) {
      size += JSON.stringify(item).length
    }
    return size
  }

  private compress(data: any): string {
    // 简单的压缩实现（实际项目中可以使用更好的压缩算法）
    return JSON.stringify(data)
  }

  private decompress(data: string): any {
    return JSON.parse(data)
  }
}

// 创建并导出智能缓存实例
export const smartCache = new SmartCache()

// 定期清理过期缓存
if (typeof window !== 'undefined') {
  setInterval(() => {
    smartCache.clearExpired()
  }, 10 * 60 * 1000) // 每10分钟清理一次
}
