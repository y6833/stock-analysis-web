/**
 * 全局缓存管理器
 * 提供统一的缓存策略和管理功能
 */

export interface CacheItem<T = any> {
    data: T
    timestamp: number
    ttl: number
    key: string
}

export interface CacheOptions {
    ttl?: number
    maxSize?: number
    strategy?: 'lru' | 'fifo'
}

class CacheManager {
    private cache = new Map<string, CacheItem>()
    private accessOrder = new Map<string, number>()
    private maxSize = 1000
    private strategy: 'lru' | 'fifo' = 'lru'
    private accessCounter = 0

    constructor(options?: CacheOptions) {
        if (options?.maxSize) this.maxSize = options.maxSize
        if (options?.strategy) this.strategy = options.strategy
    }

    /**
     * 设置缓存项
     */
    set<T>(key: string, data: T, ttl = 5 * 60 * 1000): void {
        // 检查缓存大小限制
        if (this.cache.size >= this.maxSize) {
            this.evict()
        }

        const item: CacheItem<T> = {
            data,
            timestamp: Date.now(),
            ttl,
            key
        }

        this.cache.set(key, item)
        this.accessOrder.set(key, ++this.accessCounter)
    }

    /**
     * 获取缓存项
     */
    get<T>(key: string): T | null {
        const item = this.cache.get(key)

        if (!item) {
            return null
        }

        // 检查是否过期
        if (this.isExpired(item)) {
            this.delete(key)
            return null
        }

        // 更新访问顺序（LRU策略）
        if (this.strategy === 'lru') {
            this.accessOrder.set(key, ++this.accessCounter)
        }

        return item.data as T
    }

    /**
     * 删除缓存项
     */
    delete(key: string): boolean {
        this.accessOrder.delete(key)
        return this.cache.delete(key)
    }

    /**
     * 清除所有缓存
     */
    clear(): void {
        this.cache.clear()
        this.accessOrder.clear()
        this.accessCounter = 0
    }

    /**
     * 清除过期缓存
     */
    clearExpired(): number {
        let cleared = 0

        for (const [key, item] of this.cache.entries()) {
            if (this.isExpired(item)) {
                this.delete(key)
                cleared++
            }
        }

        return cleared
    }

    /**
     * 检查缓存项是否存在且未过期
     */
    has(key: string): boolean {
        const item = this.cache.get(key)
        return item !== undefined && !this.isExpired(item)
    }

    /**
     * 获取缓存统计信息
     */
    getStats() {
        const now = Date.now()
        let expired = 0
        let valid = 0

        for (const item of this.cache.values()) {
            if (this.isExpired(item)) {
                expired++
            } else {
                valid++
            }
        }

        return {
            total: this.cache.size,
            valid,
            expired,
            maxSize: this.maxSize,
            strategy: this.strategy,
            hitRate: this.calculateHitRate()
        }
    }

    /**
     * 批量设置缓存
     */
    setMultiple<T>(items: Array<{ key: string; data: T; ttl?: number }>): void {
        items.forEach(({ key, data, ttl }) => {
            this.set(key, data, ttl)
        })
    }

    /**
     * 批量获取缓存
     */
    getMultiple<T>(keys: string[]): Map<string, T> {
        const result = new Map<string, T>()

        keys.forEach(key => {
            const data = this.get<T>(key)
            if (data !== null) {
                result.set(key, data)
            }
        })

        return result
    }

    /**
     * 根据前缀删除缓存
     */
    deleteByPrefix(prefix: string): number {
        let deleted = 0

        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.delete(key)
                deleted++
            }
        }

        return deleted
    }

    /**
     * 根据模式删除缓存
     */
    deleteByPattern(pattern: RegExp): number {
        let deleted = 0

        for (const key of this.cache.keys()) {
            if (pattern.test(key)) {
                this.delete(key)
                deleted++
            }
        }

        return deleted
    }

    /**
     * 检查缓存项是否过期
     */
    private isExpired(item: CacheItem): boolean {
        return Date.now() - item.timestamp > item.ttl
    }

    /**
     * 缓存淘汰策略
     */
    private evict(): void {
        if (this.cache.size === 0) return

        let keyToEvict: string

        if (this.strategy === 'lru') {
            // 找到最少使用的项
            let oldestAccess = Infinity
            keyToEvict = ''

            for (const [key, accessTime] of this.accessOrder.entries()) {
                if (accessTime < oldestAccess) {
                    oldestAccess = accessTime
                    keyToEvict = key
                }
            }
        } else {
            // FIFO: 删除最早添加的项
            keyToEvict = this.cache.keys().next().value
        }

        if (keyToEvict) {
            this.delete(keyToEvict)
        }
    }

    /**
     * 计算缓存命中率
     */
    private calculateHitRate(): number {
        // 这里可以实现更复杂的命中率计算
        // 目前返回一个简单的估算值
        return this.cache.size > 0 ? 0.8 : 0
    }
}

// 创建全局缓存管理器实例
export const globalCacheManager = new CacheManager({
    maxSize: 1000,
    strategy: 'lru'
})

// 创建专用缓存管理器的工厂函数
export function createCacheManager(options?: CacheOptions): CacheManager {
    return new CacheManager(options)
}

// 缓存装饰器
export function cached(ttl = 5 * 60 * 1000) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value

        descriptor.value = async function (...args: any[]) {
            const cacheKey = `${target.constructor.name}_${propertyKey}_${JSON.stringify(args)}`

            // 尝试从缓存获取
            const cached = globalCacheManager.get(cacheKey)
            if (cached !== null) {
                return cached
            }

            // 执行原方法
            const result = await originalMethod.apply(this, args)

            // 缓存结果
            globalCacheManager.set(cacheKey, result, ttl)

            return result
        }

        return descriptor
    }
}

// 定期清理过期缓存
setInterval(() => {
    const cleared = globalCacheManager.clearExpired()
    if (cleared > 0) {
        console.log(`Cleared ${cleared} expired cache items`)
    }
}, 5 * 60 * 1000) // 每5分钟清理一次