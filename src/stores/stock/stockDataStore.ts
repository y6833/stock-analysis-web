/**
 * 股票数据状态管理 - 专门处理股票基础数据
 * 优化后的股票数据管理，支持智能缓存和批量操作
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Stock, StockData } from '@/types/stock'
import { stockService } from '@/services/stockService'
import { createBaseStore, createPaginationState, createSearchState } from '@/stores/core/baseStore'

export const useStockDataStore = defineStore('stockData', () => {
    // 使用基础Store功能
    const baseStore = createBaseStore({
        name: 'stockData',
        cache: {
            enabled: true,
            ttl: 5 * 60 * 1000, // 5分钟缓存
            key: 'stock_data'
        }
    })()

    // 使用分页和搜索状态
    const pagination = createPaginationState()
    const search = createSearchState()

    // 股票数据状态
    const stocks = ref<Stock[]>([])
    const stocksMap = ref<Map<string, Stock>>(new Map())
    const currentStock = ref<Stock | null>(null)
    const stockData = ref<Map<string, StockData>>(new Map())
    const recentlyViewed = ref<string[]>([])

    // 计算属性
    const filteredStocks = computed(() => {
        let result = stocks.value

        // 应用搜索过滤
        if (search.query.value) {
            const query = search.query.value.toLowerCase()
            result = result.filter(stock =>
                stock.symbol.toLowerCase().includes(query) ||
                stock.name.toLowerCase().includes(query)
            )
        }

        // 应用其他过滤器
        Object.entries(search.filters.value).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                result = result.filter(stock => {
                    const stockValue = (stock as any)[key]
                    if (typeof value === 'string') {
                        return stockValue?.toString().toLowerCase().includes(value.toLowerCase())
                    }
                    return stockValue === value
                })
            }
        })

        // 应用排序
        if (search.sortBy.value) {
            result.sort((a, b) => {
                const aValue = (a as any)[search.sortBy.value]
                const bValue = (b as any)[search.sortBy.value]

                if (aValue < bValue) return search.sortOrder.value === 'asc' ? -1 : 1
                if (aValue > bValue) return search.sortOrder.value === 'asc' ? 1 : -1
                return 0
            })
        }

        return result
    })

    const paginatedStocks = computed(() => {
        const start = (pagination.currentPage.value - 1) * pagination.pageSize.value
        const end = start + pagination.pageSize.value
        return filteredStocks.value.slice(start, end)
    })

    const currentStockData = computed(() => {
        if (!currentStock.value) return null
        return stockData.value.get(currentStock.value.symbol) || null
    })

    // 获取股票列表
    async function fetchStocks(options?: { forceRefresh?: boolean; page?: number; pageSize?: number }) {
        const { forceRefresh = false, page, pageSize } = options || {}

        if (page) pagination.setPage(page)
        if (pageSize) pagination.setPageSize(pageSize)

        return await baseStore.executeAsync(async () => {
            const result = await stockService.getStocks({
                page: pagination.currentPage.value,
                pageSize: pagination.pageSize.value,
                search: search.query.value,
                filters: search.filters.value,
                sortBy: search.sortBy.value,
                sortOrder: search.sortOrder.value
            })

            stocks.value = result.data
            pagination.setTotal(result.total)

            // 更新股票映射
            result.data.forEach(stock => {
                stocksMap.value.set(stock.symbol, stock)
            })

            return result
        }, {
            cacheKey: `stocks_${pagination.currentPage.value}_${pagination.pageSize.value}_${search.query.value}`,
            skipCache: forceRefresh,
            onError: (error) => {
                console.error('获取股票列表失败:', error)
            }
        })
    }

    // 获取单个股票信息
    async function fetchStock(symbol: string, forceRefresh = false) {
        return await baseStore.executeAsync(async () => {
            // 先检查本地缓存
            if (!forceRefresh && stocksMap.value.has(symbol)) {
                const stock = stocksMap.value.get(symbol)!
                currentStock.value = stock
                return stock
            }

            const stock = await stockService.getStock(symbol)
            stocksMap.value.set(symbol, stock)
            currentStock.value = stock

            // 添加到最近查看
            addToRecentlyViewed(symbol)

            return stock
        }, {
            cacheKey: `stock_${symbol}`,
            skipCache: forceRefresh,
            onError: (error) => {
                console.error(`获取股票信息失败: ${symbol}`, error)
            }
        })
    }

    // 获取股票数据
    async function fetchStockData(symbol: string, options?: {
        period?: string
        forceRefresh?: boolean
    }) {
        const { period = '1d', forceRefresh = false } = options || {}

        return await baseStore.executeAsync(async () => {
            const data = await stockService.getStockData(symbol, { period })

            // 缓存数据
            const cacheKey = `${symbol}_${period}`
            stockData.value.set(cacheKey, data)

            // 如果是当前股票，也更新股票信息
            if (currentStock.value?.symbol === symbol) {
                await fetchStock(symbol)
            }

            return data
        }, {
            cacheKey: `stock_data_${symbol}_${period}`,
            skipCache: forceRefresh,
            onError: (error) => {
                console.error(`获取股票数据失败: ${symbol}`, error)
            }
        })
    }

    // 批量获取股票数据
    async function fetchMultipleStockData(symbols: string[], options?: {
        period?: string
        forceRefresh?: boolean
    }) {
        const { period = '1d', forceRefresh = false } = options || {}

        return await baseStore.executeAsync(async () => {
            const results = await Promise.allSettled(
                symbols.map(symbol => stockService.getStockData(symbol, { period }))
            )

            const successResults: { symbol: string; data: StockData }[] = []
            const failedResults: { symbol: string; error: any }[] = []

            results.forEach((result, index) => {
                const symbol = symbols[index]
                if (result.status === 'fulfilled') {
                    const cacheKey = `${symbol}_${period}`
                    stockData.value.set(cacheKey, result.value)
                    successResults.push({ symbol, data: result.value })
                } else {
                    failedResults.push({ symbol, error: result.reason })
                }
            })

            return { success: successResults, failed: failedResults }
        }, {
            cacheKey: `batch_stock_data_${symbols.join(',')}_${period}`,
            skipCache: forceRefresh,
            onError: (error) => {
                console.error('批量获取股票数据失败:', error)
            }
        })
    }

    // 搜索股票
    async function searchStocks(query: string, options?: { limit?: number }) {
        const { limit = 20 } = options || {}

        return await baseStore.executeAsync(async () => {
            const results = await stockService.searchStocks(query, { limit })

            // 更新股票映射
            results.forEach(stock => {
                stocksMap.value.set(stock.symbol, stock)
            })

            return results
        }, {
            cacheKey: `search_${query}_${limit}`,
            onError: (error) => {
                console.error(`搜索股票失败: ${query}`, error)
            }
        })
    }

    // 获取热门股票
    async function fetchPopularStocks(limit = 10) {
        return await baseStore.executeAsync(async () => {
            const results = await stockService.getPopularStocks(limit)

            // 更新股票映射
            results.forEach(stock => {
                stocksMap.value.set(stock.symbol, stock)
            })

            return results
        }, {
            cacheKey: `popular_stocks_${limit}`,
            onError: (error) => {
                console.error('获取热门股票失败:', error)
            }
        })
    }

    // 添加到最近查看
    function addToRecentlyViewed(symbol: string) {
        const index = recentlyViewed.value.indexOf(symbol)
        if (index > -1) {
            recentlyViewed.value.splice(index, 1)
        }
        recentlyViewed.value.unshift(symbol)

        // 限制最近查看的数量
        if (recentlyViewed.value.length > 20) {
            recentlyViewed.value = recentlyViewed.value.slice(0, 20)
        }

        // 保存到本地存储
        localStorage.setItem('recently_viewed_stocks', JSON.stringify(recentlyViewed.value))
    }

    // 获取最近查看的股票
    function getRecentlyViewedStocks() {
        return recentlyViewed.value.map(symbol => stocksMap.value.get(symbol)).filter(Boolean) as Stock[]
    }

    // 清除特定股票的缓存
    function clearStockCache(symbol?: string) {
        if (symbol) {
            // 清除特定股票的缓存
            const keysToDelete = Array.from(stockData.value.keys()).filter(key =>
                key.startsWith(symbol)
            )
            keysToDelete.forEach(key => stockData.value.delete(key))

            // 清除基础Store缓存
            baseStore.clearCache(`stock_${symbol}`)
            baseStore.clearCache(`stock_data_${symbol}`)
        } else {
            // 清除所有缓存
            stockData.value.clear()
            baseStore.clearCache()
        }
    }

    // 初始化
    function initialize() {
        // 从本地存储加载最近查看
        const saved = localStorage.getItem('recently_viewed_stocks')
        if (saved) {
            try {
                recentlyViewed.value = JSON.parse(saved)
            } catch (error) {
                console.error('加载最近查看股票失败:', error)
            }
        }
    }

    // 重置状态
    function reset() {
        stocks.value = []
        stocksMap.value.clear()
        currentStock.value = null
        stockData.value.clear()
        pagination.reset()
        search.reset()
        baseStore.clearCache()
    }

    // 初始化
    initialize()

    return {
        // 基础Store功能
        ...baseStore,

        // 分页和搜索
        ...pagination,
        ...search,

        // 股票数据状态
        stocks,
        stocksMap,
        currentStock,
        stockData,
        recentlyViewed,

        // 计算属性
        filteredStocks,
        paginatedStocks,
        currentStockData,

        // 方法
        fetchStocks,
        fetchStock,
        fetchStockData,
        fetchMultipleStockData,
        searchStocks,
        fetchPopularStocks,
        addToRecentlyViewed,
        getRecentlyViewedStocks,
        clearStockCache,
        reset
    }
})