import { inject, ref, Ref } from 'vue'
import type { CacheStats } from '../plugins/cachePlugin'

/**
 * 缓存钩子
 * 提供在Vue组件中使用缓存的便捷方法
 */
export function useCache() {
    // 从依赖注入系统获取缓存实例
    const cache = inject('cache')

    if (!cache) {
        console.error('Cache plugin not found. Make sure it is registered in your main.ts file.')
        throw new Error('Cache plugin not found')
    }

    // 缓存状态
    const isLoading = ref(false)
    const error = ref<Error | null>(null)
    const stats = ref<CacheStats>(cache.getStats())

    /**
     * 获取缓存数据
     * @param key 缓存键
     * @returns 缓存数据或null
     */
    function get<T>(key: string): T | null {
        return cache.get<T>(key)
    }

    /**
     * 设置缓存数据
     * @param key 缓存键
     * @param data 要缓存的数据
     * @param expiry 过期时间（毫秒）
     */
    function set<T>(key: string, data: T, expiry?: number): void {
        cache.set(key, data, expiry)
    }

    /**
     * 删除缓存项
     * @param key 缓存键
     */
    function remove(key: string): void {
        cache.delete(key)
    }

    /**
     * 清除所有缓存
     */
    function clearAll(): void {
        cache.clear()
    }

    /**
     * 清除特定命名空间下的缓存
     * @param namespace 命名空间
     */
    function clearNamespace(namespace: string): void {
        cache.clearNamespace(namespace)
    }

    /**
     * 获取或设置缓存，带加载状态
     * @param key 缓存键
     * @param fetcher 数据获取函数
     * @param expiry 过期时间（毫秒）
     * @returns 响应式数据、加载状态和错误
     */
    function useAsync<T>(
        key: string,
        fetcher: () => Promise<T>,
        expiry?: number
    ): {
        data: Ref<T | null>;
        isLoading: Ref<boolean>;
        error: Ref<Error | null>;
        refresh: () => Promise<void>;
    } {
        const data = ref<T | null>(null)

        // 首先尝试从缓存获取
        const cachedData = get<T>(key)
        if (cachedData !== null) {
            data.value = cachedData
        }

        // 刷新函数
        const refresh = async () => {
            isLoading.value = true
            error.value = null

            try {
                const freshData = await fetcher()
                data.value = freshData
                set(key, freshData, expiry)
            } catch (err) {
                error.value = err instanceof Error ? err : new Error(String(err))
            } finally {
                isLoading.value = false
            }
        }

        // 如果没有缓存数据，立即获取
        if (cachedData === null) {
            refresh()
        }

        return {
            data,
            isLoading,
            error,
            refresh
        }
    }

    /**
     * 预取缓存数据
     * @param key 缓存键
     */
    function prefetch(key: string): void {
        cache.prefetch(key)
    }

    /**
     * 更新缓存统计信息
     */
    function updateStats(): void {
        stats.value = cache.getStats()
    }

    /**
     * 智能缓存失效
     * @param key 缓存键
     */
    function smartInvalidate(key: string): void {
        cache.smartInvalidate(key)
    }

    /**
     * 缓存预热
     * @param keys 要预热的缓存键数组
     */
    async function warmup(keys: string[]): Promise<void> {
        await cache.warmup(keys)
    }

    /**
     * 获取缓存使用情况
     */
    function getUsage() {
        return cache.getUsage()
    }

    // 定期更新统计信息
    setInterval(updateStats, 10000)

    return {
        get,
        set,
        remove,
        clearAll,
        clearNamespace,
        useAsync,
        prefetch,
        smartInvalidate,
        warmup,
        getUsage,
        isLoading,
        error,
        stats,
        updateStats
    }
}