/**
 * 基础Store类 - 提供通用的状态管理功能
 * 实现统一的错误处理、加载状态和缓存策略
 */

import { ref, computed, type Ref } from 'vue'
import { defineStore } from 'pinia'

export interface BaseStoreState {
    isLoading: boolean
    error: string | null
    lastUpdated: number | null
}

export interface CacheConfig {
    enabled: boolean
    ttl: number // Time to live in milliseconds
    key: string
}

export interface StoreOptions {
    name: string
    cache?: CacheConfig
}

/**
 * 创建基础Store的工厂函数
 */
export function createBaseStore<T>(options: StoreOptions) {
    return defineStore(options.name, () => {
        // 基础状态
        const isLoading = ref(false)
        const error = ref<string | null>(null)
        const lastUpdated = ref<number | null>(null)

        // 缓存相关
        const cacheData = ref<Map<string, { data: any; timestamp: number }>>(new Map())

        // 计算属性
        const hasError = computed(() => error.value !== null)
        const isStale = computed(() => {
            if (!lastUpdated.value || !options.cache) return false
            return Date.now() - lastUpdated.value > options.cache.ttl
        })

        // 设置加载状态
        function setLoading(loading: boolean) {
            isLoading.value = loading
        }

        // 设置错误状态
        function setError(errorMessage: string | null) {
            error.value = errorMessage
        }

        // 清除错误
        function clearError() {
            error.value = null
        }

        // 更新最后更新时间
        function updateTimestamp() {
            lastUpdated.value = Date.now()
        }

        // 缓存数据
        function setCacheData(key: string, data: any) {
            if (!options.cache?.enabled) return

            cacheData.value.set(key, {
                data,
                timestamp: Date.now()
            })
        }

        // 获取缓存数据
        function getCacheData(key: string): any | null {
            if (!options.cache?.enabled) return null

            const cached = cacheData.value.get(key)
            if (!cached) return null

            // 检查是否过期
            if (Date.now() - cached.timestamp > options.cache.ttl) {
                cacheData.value.delete(key)
                return null
            }

            return cached.data
        }

        // 清除缓存
        function clearCache(key?: string) {
            if (key) {
                cacheData.value.delete(key)
            } else {
                cacheData.value.clear()
            }
        }

        // 执行异步操作的包装器
        async function executeAsync<R>(
            operation: () => Promise<R>,
            options?: {
                cacheKey?: string
                skipCache?: boolean
                onSuccess?: (result: R) => void
                onError?: (error: Error) => void
            }
        ): Promise<R | null> {
            try {
                // 检查缓存
                if (options?.cacheKey && !options.skipCache) {
                    const cached = getCacheData(options.cacheKey)
                    if (cached) {
                        return cached
                    }
                }

                setLoading(true)
                clearError()

                const result = await operation()

                // 缓存结果
                if (options?.cacheKey) {
                    setCacheData(options.cacheKey, result)
                }

                updateTimestamp()

                if (options?.onSuccess) {
                    options.onSuccess(result)
                }

                return result
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : '操作失败'
                setError(errorMessage)

                if (options?.onError && err instanceof Error) {
                    options.onError(err)
                }

                console.error(`Store ${options.name} operation failed:`, err)
                return null
            } finally {
                setLoading(false)
            }
        }

        return {
            // 状态
            isLoading,
            error,
            lastUpdated,

            // 计算属性
            hasError,
            isStale,

            // 方法
            setLoading,
            setError,
            clearError,
            updateTimestamp,
            setCacheData,
            getCacheData,
            clearCache,
            executeAsync
        }
    })
}

/**
 * 创建分页状态管理
 */
export function createPaginationState() {
    const currentPage = ref(1)
    const pageSize = ref(20)
    const total = ref(0)

    const totalPages = computed(() => Math.ceil(total.value / pageSize.value))
    const hasNextPage = computed(() => currentPage.value < totalPages.value)
    const hasPrevPage = computed(() => currentPage.value > 1)

    function setPage(page: number) {
        if (page >= 1 && page <= totalPages.value) {
            currentPage.value = page
        }
    }

    function nextPage() {
        if (hasNextPage.value) {
            currentPage.value++
        }
    }

    function prevPage() {
        if (hasPrevPage.value) {
            currentPage.value--
        }
    }

    function setPageSize(size: number) {
        pageSize.value = size
        currentPage.value = 1 // 重置到第一页
    }

    function setTotal(totalCount: number) {
        total.value = totalCount
    }

    function reset() {
        currentPage.value = 1
        total.value = 0
    }

    return {
        currentPage,
        pageSize,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        setPage,
        nextPage,
        prevPage,
        setPageSize,
        setTotal,
        reset
    }
}

/**
 * 创建搜索状态管理
 */
export function createSearchState() {
    const query = ref('')
    const filters = ref<Record<string, any>>({})
    const sortBy = ref('')
    const sortOrder = ref<'asc' | 'desc'>('asc')

    function setQuery(searchQuery: string) {
        query.value = searchQuery
    }

    function setFilter(key: string, value: any) {
        filters.value[key] = value
    }

    function removeFilter(key: string) {
        delete filters.value[key]
    }

    function clearFilters() {
        filters.value = {}
    }

    function setSort(field: string, order: 'asc' | 'desc' = 'asc') {
        sortBy.value = field
        sortOrder.value = order
    }

    function clearSort() {
        sortBy.value = ''
        sortOrder.value = 'asc'
    }

    function reset() {
        query.value = ''
        filters.value = {}
        sortBy.value = ''
        sortOrder.value = 'asc'
    }

    return {
        query,
        filters,
        sortBy,
        sortOrder,
        setQuery,
        setFilter,
        removeFilter,
        clearFilters,
        setSort,
        clearSort,
        reset
    }
}