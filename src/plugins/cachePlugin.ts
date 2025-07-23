/**
 * 缓存插件
 * 提供客户端缓存功能，与服务器缓存协同工作
 */
import { App, Plugin } from 'vue'
import { Router } from 'vue-router'
import axios from 'axios'

// 缓存配置接口
interface CacheConfig {
    enabled: boolean
    defaultExpiry: number
    maxSize: number
    storageType: 'localStorage' | 'sessionStorage' | 'memory'
    versionKey: string
    debug: boolean
}

// 缓存项接口
interface CacheItem<T = any> {
    data: T
    timestamp: number
    expiry: number
    source?: string
    version?: string
    metadata?: Record<string, any>
}

// 缓存统计接口
interface CacheStats {
    hits: number
    misses: number
    sets: number
    deletes: number
    errors: number
}

class ClientCacheManager {
    private config: CacheConfig
    private storage: Storage | Map<string, string>
    private memoryCache: Map<string, any>
    private stats: CacheStats
    private version: string
    private router?: Router

    constructor(config: Partial<CacheConfig> = {}) {
        // 默认配置
        this.config = {
            enabled: true,
            defaultExpiry: 5 * 60 * 1000, // 5分钟
            maxSize: 50, // 最大缓存项数
            storageType: 'localStorage',
            versionKey: 'cache_version',
            debug: false,
            ...config
        }

        // 初始化存储
        if (this.config.storageType === 'localStorage') {
            this.storage = localStorage
        } else if (this.config.storageType === 'sessionStorage') {
            this.storage = sessionStorage
        } else {
            this.storage = new Map<string, string>()
        }

        // 内存缓存用于频繁访问的数据
        this.memoryCache = new Map<string, any>()

        // 初始化统计
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0
        }

        // 获取缓存版本
        this.version = this.storage.getItem(this.config.versionKey) || '1.0.0'

        // 清理过期缓存
        this.cleanExpiredCache()
    }

    /**
     * 设置路由器实例
     * @param router Vue Router实例
     */
    setRouter(router: Router) {
        this.router = router

        // 监听路由变化，可以根据路由变化预加载或清理缓存
        router.beforeEach((to, from, next) => {
            // 例如，当用户访问股票详情页时，可以预加载相关数据
            if (to.name === 'stockDetail' && to.params.symbol) {
                const symbol = to.params.symbol as string
                this.prefetch(`stock:${symbol}:info`)
                this.prefetch(`stock:${symbol}:daily`)
            }
            next()
        })
    }

    /**
     * 预取缓存数据
     * @param key 缓存键
     */
    async prefetch(key: string): Promise<void> {
        if (!this.config.enabled) return

        // 检查缓存是否已存在且未过期
        const cached = this.getItem(key)
        if (cached !== null) return

        // 如果缓存不存在或已过期，触发API请求
        try {
            const [namespace, id] = key.split(':')
            if (!namespace || !id) return

            // 根据不同的命名空间构建不同的API请求
            let url = ''
            if (namespace === 'stock') {
                const [symbol, type] = id.split(':')
                if (type === 'info') {
                    url = `/api/v1/stocks/${symbol}`
                } else if (type === 'daily') {
                    url = `/api/v1/stocks/${symbol}/history`
                }
            } else if (namespace === 'market') {
                url = `/api/v1/market/${id}`
            }

            if (url) {
                // 发送API请求，但不等待结果
                axios.get(url).catch(() => {
                    // 忽略错误，这只是预加载
                })
            }
        } catch (error) {
            // 忽略错误，这只是预加载
        }
    }

    /**
     * 获取缓存项
     * @param key 缓存键
     * @returns 缓存数据或null
     */
    get<T = any>(key: string): T | null {
        if (!this.config.enabled) return null

        try {
            // 首先检查内存缓存
            if (this.memoryCache.has(key)) {
                const item = this.memoryCache.get(key) as CacheItem<T>
                if (this.isValid(item)) {
                    this.stats.hits++
                    this.log(`缓存命中(内存): ${key}`)
                    return item.data
                } else {
                    this.memoryCache.delete(key)
                }
            }

            // 然后检查持久化存储
            const cached = this.getItem(key)
            if (cached !== null && this.isValid(cached)) {
                // 将频繁访问的数据添加到内存缓存
                this.memoryCache.set(key, cached)
                if (this.memoryCache.size > this.config.maxSize) {
                    // 如果内存缓存超过最大大小，删除最早添加的项
                    const firstKey = this.memoryCache.keys().next().value
                    this.memoryCache.delete(firstKey)
                }

                this.stats.hits++
                this.log(`缓存命中(${this.config.storageType}): ${key}`)
                return cached.data
            }

            this.stats.misses++
            this.log(`缓存未命中: ${key}`)
            return null
        } catch (error) {
            this.stats.errors++
            this.log(`获取缓存出错: ${key}`, error)
            return null
        }
    }

    /**
     * 设置缓存项
     * @param key 缓存键
     * @param data 要缓存的数据
     * @param expiry 过期时间（毫秒）
     * @param metadata 元数据
     */
    set<T = any>(key: string, data: T, expiry?: number, metadata?: Record<string, any>): void {
        if (!this.config.enabled) return

        try {
            const expiryTime = expiry || this.config.defaultExpiry

            const item: CacheItem<T> = {
                data,
                timestamp: Date.now(),
                expiry: expiryTime,
                version: this.version,
                metadata
            }

            // 存储到持久化存储
            this.setItem(key, item)

            // 同时存储到内存缓存
            this.memoryCache.set(key, item)
            if (this.memoryCache.size > this.config.maxSize) {
                // 如果内存缓存超过最大大小，删除最早添加的项
                const firstKey = this.memoryCache.keys().next().value
                this.memoryCache.delete(firstKey)
            }

            this.stats.sets++
            this.log(`缓存已设置: ${key}`)
        } catch (error) {
            this.stats.errors++
            this.log(`设置缓存出错: ${key}`, error)
        }
    }

    /**
     * 删除缓存项
     * @param key 缓存键
     */
    delete(key: string): void {
        if (!this.config.enabled) return

        try {
            // 从持久化存储中删除
            if (this.storage instanceof Map) {
                this.storage.delete(key)
            } else {
                this.storage.removeItem(key)
            }

            // 从内存缓存中删除
            this.memoryCache.delete(key)

            this.stats.deletes++
            this.log(`缓存已删除: ${key}`)
        } catch (error) {
            this.stats.errors++
            this.log(`删除缓存出错: ${key}`, error)
        }
    }

    /**
     * 清除所有缓存
     */
    clear(): void {
        if (!this.config.enabled) return

        try {
            // 清除内存缓存
            this.memoryCache.clear()

            // 清除持久化存储
            if (this.storage instanceof Map) {
                this.storage.clear()
            } else {
                // 只清除与缓存相关的项
                const keysToRemove: string[] = []
                for (let i = 0; i < this.storage.length; i++) {
                    const key = this.storage.key(i)
                    if (key && key !== this.config.versionKey && key.startsWith('cache:')) {
                        keysToRemove.push(key)
                    }
                }
                keysToRemove.forEach(key => this.storage.removeItem(key))
            }

            // 更新版本号
            this.updateVersion()

            this.log('所有缓存已清除')
        } catch (error) {
            this.stats.errors++
            this.log('清除所有缓存出错', error)
        }
    }

    /**
     * 清除特定命名空间下的缓存
     * @param namespace 命名空间
     */
    clearNamespace(namespace: string): void {
        if (!this.config.enabled) return

        try {
            const prefix = `cache:${namespace}:`

            // 清除内存缓存
            for (const key of this.memoryCache.keys()) {
                if (key.startsWith(prefix)) {
                    this.memoryCache.delete(key)
                }
            }

            // 清除持久化存储
            if (this.storage instanceof Map) {
                for (const key of this.storage.keys()) {
                    if (key.startsWith(prefix)) {
                        this.storage.delete(key)
                    }
                }
            } else {
                const keysToRemove: string[] = []
                for (let i = 0; i < this.storage.length; i++) {
                    const key = this.storage.key(i)
                    if (key && key.startsWith(prefix)) {
                        keysToRemove.push(key)
                    }
                }
                keysToRemove.forEach(key => this.storage.removeItem(key))
            }

            this.log(`命名空间 ${namespace} 的缓存已清除`)
        } catch (error) {
            this.stats.errors++
            this.log(`清除命名空间 ${namespace} 的缓存出错`, error)
        }
    }

    /**
     * 获取或设置缓存
     * @param key 缓存键
     * @param fetcher 数据获取函数
     * @param expiry 过期时间（毫秒）
     * @returns 缓存数据或获取的新数据
     */
    async getOrSet<T = any>(
        key: string,
        fetcher: () => Promise<T>,
        expiry?: number
    ): Promise<T> {
        if (!this.config.enabled) return fetcher()

        // 尝试从缓存获取
        const cached = this.get<T>(key)
        if (cached !== null) {
            return cached
        }

        // 缓存未命中，调用获取函数
        try {
            const data = await fetcher()
            this.set(key, data, expiry)
            return data
        } catch (error) {
            this.log(`获取数据出错: ${key}`, error)
            throw error
        }
    }

    /**
     * 更新缓存版本
     */
    updateVersion(): void {
        const newVersion = Date.now().toString()
        this.version = newVersion
        this.storage.setItem(this.config.versionKey, newVersion)
    }

    /**
     * 获取缓存统计信息
     */
    getStats(): CacheStats {
        return { ...this.stats }
    }

    /**
     * 清理过期缓存
     */
    private cleanExpiredCache(): void {
        if (!this.config.enabled) return

        try {
            const now = Date.now()
            let expiredCount = 0

            // 清理内存缓存
            for (const [key, item] of this.memoryCache.entries()) {
                if (item.timestamp + item.expiry < now) {
                    this.memoryCache.delete(key)
                    expiredCount++
                }
            }

            // 清理持久化存储
            if (this.storage instanceof Map) {
                for (const [key, value] of this.storage.entries()) {
                    if (key.startsWith('cache:')) {
                        try {
                            const item = JSON.parse(value) as CacheItem
                            if (item.timestamp + item.expiry < now) {
                                this.storage.delete(key)
                                expiredCount++
                            }
                        } catch (e) {
                            // 忽略解析错误
                            this.storage.delete(key)
                            expiredCount++
                        }
                    }
                }
            } else {
                const keysToRemove: string[] = []
                for (let i = 0; i < this.storage.length; i++) {
                    const key = this.storage.key(i)
                    if (key && key.startsWith('cache:')) {
                        try {
                            const value = this.storage.getItem(key)
                            if (value) {
                                const item = JSON.parse(value) as CacheItem
                                if (item.timestamp + item.expiry < now) {
                                    keysToRemove.push(key)
                                    expiredCount++
                                }
                            }
                        } catch (e) {
                            // 忽略解析错误
                            keysToRemove.push(key)
                            expiredCount++
                        }
                    }
                }
                keysToRemove.forEach(key => this.storage.removeItem(key))
            }

            if (expiredCount > 0) {
                this.log(`已清理 ${expiredCount} 个过期缓存项`)
            }

            // 定期清理过期缓存
            setTimeout(() => this.cleanExpiredCache(), 5 * 60 * 1000) // 每5分钟清理一次
        } catch (error) {
            this.log('清理过期缓存出错', error)
        }
    }

    /**
     * 智能缓存失效
     * 基于数据依赖关系和访问模式进行智能失效
     */
    smartInvalidate(key: string): void {
        if (!this.config.enabled) return

        // 删除主键
        this.delete(key)

        // 定义依赖关系
        const dependencies: Record<string, string[]> = {
            'stock:*:info': ['stock:list', 'market:overview'],
            'user:profile': ['user:watchlist:*', 'user:portfolio:*'],
            'market:overview': ['stock:hot', 'index:main']
        }

        // 查找匹配的依赖关系
        for (const [pattern, deps] of Object.entries(dependencies)) {
            const regex = new RegExp('^' + pattern.replace('*', '.*') + '$')
            if (regex.test(key)) {
                // 使依赖的缓存失效
                for (const dep of deps) {
                    if (dep.includes('*')) {
                        // 处理通配符依赖
                        this.clearPattern(dep)
                    } else {
                        this.delete(dep)
                    }
                }
            }
        }
    }

    /**
     * 清除匹配模式的缓存
     * @param pattern 模式，支持通配符
     */
    private clearPattern(pattern: string): void {
        const regex = new RegExp('^cache:' + pattern.replace('*', '.*') + '$')

        // 清理内存缓存
        for (const key of this.memoryCache.keys()) {
            if (regex.test('cache:' + key)) {
                this.memoryCache.delete(key)
            }
        }

        // 清理持久化存储
        if (this.storage instanceof Map) {
            for (const key of this.storage.keys()) {
                if (regex.test(key)) {
                    this.storage.delete(key)
                }
            }
        } else {
            const keysToRemove: string[] = []
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i)
                if (key && regex.test(key)) {
                    keysToRemove.push(key)
                }
            }
            keysToRemove.forEach(key => this.storage.removeItem(key))
        }
    }

    /**
     * 缓存预热
     * 预加载可能需要的数据
     */
    async warmup(keys: string[]): Promise<void> {
        if (!this.config.enabled) return

        const warmupPromises = keys.map(async (key) => {
            try {
                // 检查缓存是否已存在
                const cached = this.get(key)
                if (cached !== null) return

                // 触发预加载
                await this.prefetch(key)
            } catch (error) {
                this.log(`预热缓存失败: ${key}`, error)
            }
        })

        await Promise.allSettled(warmupPromises)
        this.log(`缓存预热完成，处理了 ${keys.length} 个键`)
    }

    /**
     * 获取缓存使用情况
     */
    getUsage(): {
        memorySize: number;
        storageSize: number;
        totalItems: number;
        hitRate: number;
    } {
        let memorySize = 0
        let storageSize = 0
        let totalItems = 0

        // 计算内存缓存大小
        for (const [key, item] of this.memoryCache.entries()) {
            memorySize += JSON.stringify(item).length
            totalItems++
        }

        // 计算存储缓存大小
        if (this.storage instanceof Map) {
            for (const [key, value] of this.storage.entries()) {
                if (key.startsWith('cache:')) {
                    storageSize += value.length
                    totalItems++
                }
            }
        } else {
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i)
                if (key && key.startsWith('cache:')) {
                    const value = this.storage.getItem(key)
                    if (value) {
                        storageSize += value.length
                        totalItems++
                    }
                }
            }
        }

        const hitRate = this.stats.hits + this.stats.misses > 0
            ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
            : 0

        return {
            memorySize,
            storageSize,
            totalItems,
            hitRate: Math.round(hitRate * 100) / 100
        }
    }

    /**
     * 从存储中获取缓存项
     * @param key 缓存键
     * @returns 缓存项或null
     */
    private getItem<T = any>(key: string): CacheItem<T> | null {
        const storageKey = `cache:${key}`
        let value: string | null = null

        if (this.storage instanceof Map) {
            value = this.storage.get(storageKey) || null
        } else {
            value = this.storage.getItem(storageKey)
        }

        if (!value) return null

        try {
            return JSON.parse(value) as CacheItem<T>
        } catch (e) {
            return null
        }
    }

    /**
     * 将缓存项存储到存储中
     * @param key 缓存键
     * @param item 缓存项
     */
    private setItem<T = any>(key: string, item: CacheItem<T>): void {
        const storageKey = `cache:${key}`
        const value = JSON.stringify(item)

        if (this.storage instanceof Map) {
            this.storage.set(storageKey, value)
        } else {
            try {
                this.storage.setItem(storageKey, value)
            } catch (e) {
                // 如果存储已满，清理一些旧的缓存项
                this.clearOldestItems(10)
                try {
                    this.storage.setItem(storageKey, value)
                } catch (e2) {
                    // 如果仍然失败，放弃存储
                    this.log('存储空间不足，无法缓存', e2)
                }
            }
        }
    }

    /**
     * 清理最旧的缓存项
     * @param count 要清理的项数
     */
    private clearOldestItems(count: number): void {
        if (this.storage instanceof Map) {
            // 对于Map，我们可以直接删除前N个项
            let deleted = 0
            for (const key of this.storage.keys()) {
                if (key.startsWith('cache:') && deleted < count) {
                    this.storage.delete(key)
                    deleted++
                }
                if (deleted >= count) break
            }
        } else {
            // 对于localStorage/sessionStorage，我们需要找出最旧的项
            const items: { key: string; timestamp: number }[] = []

            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i)
                if (key && key.startsWith('cache:')) {
                    try {
                        const value = this.storage.getItem(key)
                        if (value) {
                            const item = JSON.parse(value) as CacheItem
                            items.push({ key, timestamp: item.timestamp })
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }

            // 按时间戳排序
            items.sort((a, b) => a.timestamp - b.timestamp)

            // 删除最旧的N个项
            for (let i = 0; i < Math.min(count, items.length); i++) {
                this.storage.removeItem(items[i].key)
            }
        }
    }

    /**
     * 检查缓存项是否有效
     * @param item 缓存项
     * @returns 是否有效
     */
    private isValid<T = any>(item: CacheItem<T>): boolean {
        // 检查版本是否匹配
        if (item.version && item.version !== this.version) {
            return false
        }

        // 检查是否过期
        return Date.now() - item.timestamp < item.expiry
    }

    /**
     * 记录日志
     * @param message 日志消息
     * @param error 错误对象
     */
    private log(message: string, error?: any): void {
        if (this.config.debug) {
            if (error) {
                console.log(`[ClientCache] ${message}`, error)
            } else {
                console.log(`[ClientCache] ${message}`)
            }
        }
    }
}

// 创建缓存插件
export const createCachePlugin = (options: Partial<CacheConfig> = {}): Plugin => {
    const clientCache = new ClientCacheManager(options)

    return {
        install(app: App, { router }: { router?: Router } = {}) {
            // 如果提供了路由器，设置路由器
            if (router) {
                clientCache.setRouter(router)
            }

            // 将缓存管理器添加到全局属性
            app.config.globalProperties.$cache = clientCache

            // 添加到provide/inject系统
            app.provide('cache', clientCache)
        }
    }
}

// 导出类型
export type { CacheConfig, CacheItem, CacheStats }

// 导出默认实例
export default createCachePlugin