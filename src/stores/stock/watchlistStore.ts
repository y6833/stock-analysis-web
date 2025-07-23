/**
 * 关注列表状态管理 - 专门处理用户关注的股票
 * 从原stockStore中分离出关注列表相关功能
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { watchlistService } from '@/services/watchlistService'
import type { Stock } from '@/types/stock'
import { createBaseStore } from '@/stores/core/baseStore'
import { useAuthStore } from '@/stores/user/authStore'
import { useStockDataStore } from './stockDataStore'

export interface WatchlistItem {
    id: string
    symbol: string
    addedAt: Date
    notes?: string
    alertSettings?: {
        priceAlert?: { enabled: boolean; targetPrice: number }
        percentAlert?: { enabled: boolean; targetPercent: number }
    }
}

export const useWatchlistStore = defineStore('watchlist', () => {
    // 使用基础Store功能
    const baseStore = createBaseStore({
        name: 'watchlist',
        cache: {
            enabled: true,
            ttl: 2 * 60 * 1000, // 2分钟缓存
            key: 'watchlist'
        }
    })()

    // 关注列表状态
    const watchlistItems = ref<WatchlistItem[]>([])
    const watchlistSymbols = ref<Set<string>>(new Set())

    // 计算属性
    const watchlistCount = computed(() => watchlistItems.value.length)
    const hasWatchlist = computed(() => watchlistCount.value > 0)

    // 获取关注列表中的股票详情
    const watchlistStocks = computed(() => {
        const stockDataStore = useStockDataStore()
        return watchlistItems.value.map(item => {
            const stock = stockDataStore.stocksMap.get(item.symbol)
            return stock ? { ...stock, watchlistItem: item } : null
        }).filter(Boolean) as (Stock & { watchlistItem: WatchlistItem })[]
    })

    // 获取关注列表
    async function fetchWatchlist(forceRefresh = false) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            // 未登录时从本地存储加载
            loadLocalWatchlist()
            return watchlistItems.value
        }

        return await baseStore.executeAsync(async () => {
            const items = await watchlistService.getWatchlist()
            watchlistItems.value = items

            // 更新符号集合
            watchlistSymbols.value = new Set(items.map(item => item.symbol))

            // 同步到本地存储
            saveLocalWatchlist()

            return items
        }, {
            cacheKey: 'user_watchlist',
            skipCache: forceRefresh,
            onError: (error) => {
                console.error('获取关注列表失败:', error)
                // 失败时尝试加载本地数据
                loadLocalWatchlist()
            }
        })
    }

    // 添加股票到关注列表
    async function addToWatchlist(symbol: string, options?: {
        notes?: string
        alertSettings?: WatchlistItem['alertSettings']
    }) {
        const authStore = useAuthStore()

        // 检查是否已存在
        if (watchlistSymbols.value.has(symbol)) {
            throw new Error('股票已在关注列表中')
        }

        const newItem: WatchlistItem = {
            id: `watchlist_${Date.now()}_${symbol}`,
            symbol,
            addedAt: new Date(),
            notes: options?.notes,
            alertSettings: options?.alertSettings
        }

        if (authStore.isAuthenticated) {
            return await baseStore.executeAsync(async () => {
                const item = await watchlistService.addToWatchlist(symbol, options)
                watchlistItems.value.unshift(item)
                watchlistSymbols.value.add(symbol)

                // 同步到本地存储
                saveLocalWatchlist()

                return item
            }, {
                onSuccess: () => {
                    // 清除缓存
                    baseStore.clearCache('user_watchlist')
                },
                onError: (error) => {
                    console.error('添加到关注列表失败:', error)
                }
            })
        } else {
            // 未登录时保存到本地
            watchlistItems.value.unshift(newItem)
            watchlistSymbols.value.add(symbol)
            saveLocalWatchlist()
            return newItem
        }
    }

    // 从关注列表移除股票
    async function removeFromWatchlist(symbol: string) {
        const authStore = useAuthStore()

        if (!watchlistSymbols.value.has(symbol)) {
            throw new Error('股票不在关注列表中')
        }

        if (authStore.isAuthenticated) {
            return await baseStore.executeAsync(async () => {
                await watchlistService.removeFromWatchlist(symbol)

                watchlistItems.value = watchlistItems.value.filter(item => item.symbol !== symbol)
                watchlistSymbols.value.delete(symbol)

                // 同步到本地存储
                saveLocalWatchlist()

                return true
            }, {
                onSuccess: () => {
                    // 清除缓存
                    baseStore.clearCache('user_watchlist')
                },
                onError: (error) => {
                    console.error('从关注列表移除失败:', error)
                }
            })
        } else {
            // 未登录时从本地移除
            watchlistItems.value = watchlistItems.value.filter(item => item.symbol !== symbol)
            watchlistSymbols.value.delete(symbol)
            saveLocalWatchlist()
            return true
        }
    }

    // 更新关注列表项
    async function updateWatchlistItem(symbol: string, updates: Partial<WatchlistItem>) {
        const authStore = useAuthStore()
        const itemIndex = watchlistItems.value.findIndex(item => item.symbol === symbol)

        if (itemIndex === -1) {
            throw new Error('股票不在关注列表中')
        }

        if (authStore.isAuthenticated) {
            return await baseStore.executeAsync(async () => {
                const updatedItem = await watchlistService.updateWatchlistItem(symbol, updates)
                watchlistItems.value[itemIndex] = updatedItem

                // 同步到本地存储
                saveLocalWatchlist()

                return updatedItem
            }, {
                onSuccess: () => {
                    // 清除缓存
                    baseStore.clearCache('user_watchlist')
                },
                onError: (error) => {
                    console.error('更新关注列表项失败:', error)
                }
            })
        } else {
            // 未登录时更新本地数据
            watchlistItems.value[itemIndex] = {
                ...watchlistItems.value[itemIndex],
                ...updates
            }
            saveLocalWatchlist()
            return watchlistItems.value[itemIndex]
        }
    }

    // 批量添加到关注列表
    async function addMultipleToWatchlist(symbols: string[]) {
        const authStore = useAuthStore()
        const newSymbols = symbols.filter(symbol => !watchlistSymbols.value.has(symbol))

        if (newSymbols.length === 0) {
            return { success: [], failed: [] }
        }

        if (authStore.isAuthenticated) {
            return await baseStore.executeAsync(async () => {
                const results = await watchlistService.addMultipleToWatchlist(newSymbols)

                // 更新本地状态
                results.success.forEach(item => {
                    watchlistItems.value.unshift(item)
                    watchlistSymbols.value.add(item.symbol)
                })

                // 同步到本地存储
                saveLocalWatchlist()

                return results
            }, {
                onSuccess: () => {
                    // 清除缓存
                    baseStore.clearCache('user_watchlist')
                },
                onError: (error) => {
                    console.error('批量添加到关注列表失败:', error)
                }
            })
        } else {
            // 未登录时添加到本地
            const success = newSymbols.map(symbol => ({
                id: `watchlist_${Date.now()}_${symbol}`,
                symbol,
                addedAt: new Date()
            } as WatchlistItem))

            success.forEach(item => {
                watchlistItems.value.unshift(item)
                watchlistSymbols.value.add(item.symbol)
            })

            saveLocalWatchlist()
            return { success, failed: [] }
        }
    }

    // 检查股票是否在关注列表中
    function isInWatchlist(symbol: string): boolean {
        return watchlistSymbols.value.has(symbol)
    }

    // 获取关注列表项
    function getWatchlistItem(symbol: string): WatchlistItem | null {
        return watchlistItems.value.find(item => item.symbol === symbol) || null
    }

    // 清空关注列表
    async function clearWatchlist() {
        const authStore = useAuthStore()

        if (authStore.isAuthenticated) {
            return await baseStore.executeAsync(async () => {
                await watchlistService.clearWatchlist()

                watchlistItems.value = []
                watchlistSymbols.value.clear()

                // 清除本地存储
                localStorage.removeItem('local_watchlist')

                return true
            }, {
                onSuccess: () => {
                    // 清除缓存
                    baseStore.clearCache('user_watchlist')
                },
                onError: (error) => {
                    console.error('清空关注列表失败:', error)
                }
            })
        } else {
            // 未登录时清除本地数据
            watchlistItems.value = []
            watchlistSymbols.value.clear()
            localStorage.removeItem('local_watchlist')
            return true
        }
    }

    // 保存到本地存储
    function saveLocalWatchlist() {
        try {
            const data = {
                items: watchlistItems.value,
                lastUpdated: Date.now()
            }
            localStorage.setItem('local_watchlist', JSON.stringify(data))
        } catch (error) {
            console.error('保存本地关注列表失败:', error)
        }
    }

    // 从本地存储加载
    function loadLocalWatchlist() {
        try {
            const saved = localStorage.getItem('local_watchlist')
            if (saved) {
                const data = JSON.parse(saved)
                watchlistItems.value = data.items || []
                watchlistSymbols.value = new Set(watchlistItems.value.map(item => item.symbol))
            }
        } catch (error) {
            console.error('加载本地关注列表失败:', error)
            watchlistItems.value = []
            watchlistSymbols.value.clear()
        }
    }

    // 同步本地数据到服务器
    async function syncLocalToServer() {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated || watchlistItems.value.length === 0) {
            return false
        }

        return await baseStore.executeAsync(async () => {
            const symbols = watchlistItems.value.map(item => item.symbol)
            const results = await watchlistService.addMultipleToWatchlist(symbols)

            // 清除本地数据，使用服务器数据
            await fetchWatchlist(true)

            return results
        }, {
            onError: (error) => {
                console.error('同步本地关注列表到服务器失败:', error)
            }
        })
    }

    // 重置状态
    function reset() {
        watchlistItems.value = []
        watchlistSymbols.value.clear()
        baseStore.clearCache()
    }

    // 初始化
    function initialize() {
        loadLocalWatchlist()
    }

    // 初始化
    initialize()

    return {
        // 基础Store功能
        ...baseStore,

        // 关注列表状态
        watchlistItems,
        watchlistSymbols,

        // 计算属性
        watchlistCount,
        hasWatchlist,
        watchlistStocks,

        // 方法
        fetchWatchlist,
        addToWatchlist,
        removeFromWatchlist,
        updateWatchlistItem,
        addMultipleToWatchlist,
        isInWatchlist,
        getWatchlistItem,
        clearWatchlist,
        syncLocalToServer,
        reset
    }
})