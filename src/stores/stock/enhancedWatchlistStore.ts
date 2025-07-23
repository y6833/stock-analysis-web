import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { enhancedWatchlistService } from '@/services/enhancedWatchlistService'
import { useStockDataStore } from './stockDataStore'
import { useAuthStore } from '@/stores/auth/authStore'
import type { Watchlist, WatchlistItem } from '@/types/dashboard'
import type { Stock } from '@/types/stock'

/**
 * 增强版关注列表状态管理
 * 提供更高效的数据同步和批量操作支持
 */
export const useEnhancedWatchlistStore = defineStore('enhancedWatchlist', () => {
    // 状态
    const watchlists = ref<Watchlist[]>([])
    const activeWatchlistId = ref<string>('')
    const isLoading = ref<boolean>(false)
    const error = ref<string | null>(null)
    const lastUpdated = ref<number>(0)

    // 选中的股票（用于批量操作）
    const selectedSymbols = ref<Set<string>>(new Set())

    // 计算属性
    const activeWatchlist = computed<Watchlist | undefined>(() =>
        watchlists.value.find(w => w.id === activeWatchlistId.value)
    )

    const watchlistsMap = computed(() => {
        const map = new Map<string, Watchlist>()
        watchlists.value.forEach(watchlist => {
            map.set(watchlist.id, watchlist)
        })
        return map
    })

    const watchlistItemsMap = computed(() => {
        const map = new Map<string, Map<string, WatchlistItem>>()

        watchlists.value.forEach(watchlist => {
            const itemsMap = new Map<string, WatchlistItem>()
            watchlist.items.forEach(item => {
                itemsMap.set(item.symbol, item)
            })
            map.set(watchlist.id, itemsMap)
        })

        return map
    })

    const allWatchedSymbols = computed(() => {
        const symbols = new Set<string>()
        watchlists.value.forEach(watchlist => {
            watchlist.items.forEach(item => {
                symbols.add(item.symbol)
            })
        })
        return symbols
    })

    const selectedItems = computed(() => {
        if (!activeWatchlist.value) return []

        return activeWatchlist.value.items.filter(item =>
            selectedSymbols.value.has(item.symbol)
        )
    })

    // 方法
    /**
     * 加载所有关注列表
     * @param forceRefresh 是否强制刷新
     */
    async function loadWatchlists(forceRefresh = false) {
        if (isLoading.value) return

        isLoading.value = true
        error.value = null

        try {
            const result = await enhancedWatchlistService.getWatchlists(forceRefresh)
            watchlists.value = result

            // 如果没有活动的关注列表或当前活动的不存在，选择第一个
            if (!activeWatchlistId.value || !watchlists.value.find(w => w.id === activeWatchlistId.value)) {
                activeWatchlistId.value = watchlists.value[0]?.id || ''
            }

            lastUpdated.value = Date.now()
        } catch (err) {
            console.error('加载关注列表失败:', err)
            error.value = err instanceof Error ? err.message : '加载关注列表失败'
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 创建新的关注列表
     * @param name 名称
     * @param description 描述
     */
    async function createWatchlist(name: string, description?: string) {
        if (isLoading.value) return

        isLoading.value = true
        error.value = null

        try {
            const newWatchlist = await enhancedWatchlistService.createWatchlist(name, description)
            watchlists.value.push(newWatchlist)
            activeWatchlistId.value = newWatchlist.id
            return newWatchlist
        } catch (err) {
            console.error('创建关注列表失败:', err)
            error.value = err instanceof Error ? err.message : '创建关注列表失败'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 更新关注列表
     * @param id 关注列表ID
     * @param name 新名称
     * @param description 新描述
     */
    async function updateWatchlist(id: string, name: string, description?: string) {
        if (isLoading.value) return

        isLoading.value = true
        error.value = null

        try {
            const updatedWatchlist = await enhancedWatchlistService.updateWatchlist(id, name, description)

            const index = watchlists.value.findIndex(w => w.id === id)
            if (index !== -1) {
                watchlists.value[index] = {
                    ...watchlists.value[index],
                    name,
                }
            }

            return updatedWatchlist
        } catch (err) {
            console.error('更新关注列表失败:', err)
            error.value = err instanceof Error ? err.message : '更新关注列表失败'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 删除关注列表
     * @param id 关注列表ID
     */
    async function deleteWatchlist(id: string) {
        if (isLoading.value) return
        if (watchlists.value.length <= 1) {
            error.value = '至少保留一个关注列表'
            return
        }

        isLoading.value = true
        error.value = null

        try {
            await enhancedWatchlistService.deleteWatchlist(id)

            // 从状态中移除
            watchlists.value = watchlists.value.filter(w => w.id !== id)

            // 如果删除的是当前活动的关注列表，选择第一个
            if (activeWatchlistId.value === id) {
                activeWatchlistId.value = watchlists.value[0]?.id || ''
            }
        } catch (err) {
            console.error('删除关注列表失败:', err)
            error.value = err instanceof Error ? err.message : '删除关注列表失败'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 设置活动的关注列表
     * @param id 关注列表ID
     */
    function setActiveWatchlist(id: string) {
        const watchlist = watchlists.value.find(w => w.id === id)
        if (watchlist) {
            activeWatchlistId.value = id
            // 清除选中的股票
            selectedSymbols.value.clear()
        }
    }

    /**
     * 添加股票到关注列表
     * @param watchlistId 关注列表ID
     * @param symbol 股票代码
     * @param name 股票名称
     * @param notes 备注
     */
    async function addStockToWatchlist(
        watchlistId: string,
        symbol: string,
        name: string,
        notes?: string
    ) {
        if (isLoading.value) return

        const watchlist = watchlists.value.find(w => w.id === watchlistId)
        if (!watchlist) {
            error.value = '关注列表不存在'
            return
        }

        // 检查是否已存在
        if (watchlist.items.some(item => item.symbol === symbol)) {
            error.value = '股票已在关注列表中'
            return
        }

        isLoading.value = true
        error.value = null

        try {
            const newItem = await enhancedWatchlistService.addStockToWatchlist(
                watchlistId, symbol, name, notes
            )

            // 更新状态
            const index = watchlists.value.findIndex(w => w.id === watchlistId)
            if (index !== -1) {
                watchlists.value[index].items.push(newItem)
            }

            return newItem
        } catch (err) {
            console.error('添加股票到关注列表失败:', err)
            error.value = err instanceof Error ? err.message : '添加股票到关注列表失败'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 批量添加股票到关注列表
     * @param watchlistId 关注列表ID
     * @param stocks 股票数组 [{symbol, name}]
     */
    async function addStocksBatchToWatchlist(
        watchlistId: string,
        stocks: Array<{ symbol: string, name: string }>
    ) {
        if (isLoading.value) return

        const watchlist = watchlists.value.find(w => w.id === watchlistId)
        if (!watchlist) {
            error.value = '关注列表不存在'
            return
        }

        isLoading.value = true
        error.value = null

        try {
            // 过滤掉已存在的股票
            const existingSymbols = new Set(watchlist.items.map(item => item.symbol))
            const uniqueStocks = stocks.filter(stock => !existingSymbols.has(stock.symbol))

            if (uniqueStocks.length === 0) {
                return []
            }

            const addedItems = await enhancedWatchlistService.addStocksBatchToWatchlist(
                watchlistId, uniqueStocks
            )

            // 更新状态
            const index = watchlists.value.findIndex(w => w.id === watchlistId)
            if (index !== -1) {
                watchlists.value[index].items.push(...addedItems)
            }

            return addedItems
        } catch (err) {
            console.error('批量添加股票到关注列表失败:', err)
            error.value = err instanceof Error ? err.message : '批量添加股票到关注列表失败'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 从关注列表中移除股票
     * @param watchlistId 关注列表ID
     * @param symbol 股票代码
     */
    async function removeStockFromWatchlist(watchlistId: string, symbol: string) {
        if (isLoading.value) return

        const watchlist = watchlists.value.find(w => w.id === watchlistId)
        if (!watchlist) {
            error.value = '关注列表不存在'
            return
        }

        isLoading.value = true
        error.value = null

        try {
            await enhancedWatchlistService.removeStockFromWatchlist(watchlistId, symbol)

            // 更新状态
            const index = watchlists.value.findIndex(w => w.id === watchlistId)
            if (index !== -1) {
                watchlists.value[index].items = watchlists.value[index].items.filter(
                    item => item.symbol !== symbol
                )
            }

            // 如果在选中列表中，移除
            if (selectedSymbols.value.has(symbol)) {
                selectedSymbols.value.delete(symbol)
            }
        } catch (err) {
            console.error('从关注列表中移除股票失败:', err)
            error.value = err instanceof Error ? err.message : '从关注列表中移除股票失败'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 批量从关注列表中移除股票
     * @param watchlistId 关注列表ID
     * @param symbols 股票代码数组
     */
    async function removeStocksBatchFromWatchlist(watchlistId: string, symbols: string[]) {
        if (isLoading.value) return

        const watchlist = watchlists.value.find(w => w.id === watchlistId)
        if (!watchlist) {
            error.value = '关注列表不存在'
            return
        }

        isLoading.value = true
        error.value = null

        try {
            await enhancedWatchlistService.removeStocksBatchFromWatchlist(watchlistId, symbols)

            // 更新状态
            const index = watchlists.value.findIndex(w => w.id === watchlistId)
            if (index !== -1) {
                const symbolsSet = new Set(symbols)
                watchlists.value[index].items = watchlists.value[index].items.filter(
                    item => !symbolsSet.has(item.symbol)
                )
            }

            // 清除选中状态
            symbols.forEach(symbol => {
                if (selectedSymbols.value.has(symbol)) {
                    selectedSymbols.value.delete(symbol)
                }
            })
        } catch (err) {
            console.error('批量从关注列表中移除股票失败:', err)
            error.value = err instanceof Error ? err.message : '批量从关注列表中移除股票失败'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 更新关注股票的备注
     * @param watchlistId 关注列表ID
     * @param symbol 股票代码
     * @param notes 备注
     */
    async function updateStockNotes(watchlistId: string, symbol: string, notes: string) {
        if (isLoading.value) return

        const watchlist = watchlists.value.find(w => w.id === watchlistId)
        if (!watchlist) {
            error.value = '关注列表不存在'
            return
        }

        isLoading.value = true
        error.value = null

        try {
            await enhancedWatchlistService.updateStockNotes(watchlistId, symbol, notes)

            // 更新状态
            const watchlistIndex = watchlists.value.findIndex(w => w.id === watchlistId)
            if (watchlistIndex !== -1) {
                const itemIndex = watchlists.value[watchlistIndex].items.findIndex(
                    item => item.symbol === symbol
                )

                if (itemIndex !== -1) {
                    watchlists.value[watchlistIndex].items[itemIndex].notes = notes
                }
            }
        } catch (err) {
            console.error('更新关注股票备注失败:', err)
            error.value = err instanceof Error ? err.message : '更新关注股票备注失败'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 刷新关注列表中的股票数据
     * @param watchlistId 关注列表ID
     */
    async function refreshWatchlistData(watchlistId: string) {
        const watchlist = watchlists.value.find(w => w.id === watchlistId)
        if (!watchlist) {
            error.value = '关注列表不存在'
            return
        }

        const stockDataStore = useStockDataStore()
        const symbols = watchlist.items.map(item => item.symbol)

        // 批量获取最新数据
        await stockDataStore.fetchStocksBatch(symbols, true)

        // 更新关注列表中的股票数据
        const updates = symbols.map(symbol => {
            const stockData = stockDataStore.stocksMap.get(symbol)
            if (!stockData) return null

            return {
                symbol,
                price: stockData.price,
                change: stockData.change,
                changePercent: stockData.changePercent,
                volume: stockData.volume,
                turnover: stockData.turnover,
            }
        }).filter(Boolean) as Array<{ symbol: string } & Partial<WatchlistItem>>

        if (updates.length > 0) {
            await enhancedWatchlistService.updateStocksBatchData(watchlistId, updates)

            // 更新状态
            const watchlistIndex = watchlists.value.findIndex(w => w.id === watchlistId)
            if (watchlistIndex !== -1) {
                const updateMap = new Map(updates.map(update => [update.symbol, update]))

                watchlists.value[watchlistIndex].items = watchlists.value[watchlistIndex].items.map(item => {
                    const update = updateMap.get(item.symbol)
                    if (update) {
                        return { ...item, ...update }
                    }
                    return item
                })
            }
        }

        lastUpdated.value = Date.now()
    }

    /**
     * 排序关注列表中的股票
     * @param watchlistId 关注列表ID
     * @param sortBy 排序字段
     * @param sortDirection 排序方向
     */
    async function sortWatchlist(
        watchlistId: string,
        sortBy: string,
        sortDirection: 'asc' | 'desc' = 'asc'
    ) {
        const watchlist = watchlists.value.find(w => w.id === watchlistId)
        if (!watchlist) {
            error.value = '关注列表不存在'
            return
        }

        await enhancedWatchlistService.sortWatchlist(watchlistId, sortBy, sortDirection)

        // 更新状态
        const watchlistIndex = watchlists.value.findIndex(w => w.id === watchlistId)
        if (watchlistIndex !== -1) {
            watchlists.value[watchlistIndex].sortBy = sortBy
            watchlists.value[watchlistIndex].sortDirection = sortDirection

            // 执行排序
            watchlists.value[watchlistIndex].items.sort((a, b) => {
                const aValue = a[sortBy as keyof WatchlistItem]
                const bValue = b[sortBy as keyof WatchlistItem]

                if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
                if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
                return 0
            })
        }
    }

    /**
     * 设置关注列表显示的列
     * @param watchlistId 关注列表ID
     * @param columns 列名数组
     */
    async function setWatchlistColumns(watchlistId: string, columns: string[]) {
        const watchlist = watchlists.value.find(w => w.id === watchlistId)
        if (!watchlist) {
            error.value = '关注列表不存在'
            return
        }

        await enhancedWatchlistService.setWatchlistColumns(watchlistId, columns)

        // 更新状态
        const watchlistIndex = watchlists.value.findIndex(w => w.id === watchlistId)
        if (watchlistIndex !== -1) {
            watchlists.value[watchlistIndex].columns = columns
        }
    }

    /**
     * 选择/取消选择股票（用于批量操作）
     * @param symbol 股票代码
     * @param selected 是否选中
     */
    function toggleStockSelection(symbol: string, selected?: boolean) {
        if (selected === undefined) {
            // 切换选中状态
            if (selectedSymbols.value.has(symbol)) {
                selectedSymbols.value.delete(symbol)
            } else {
                selectedSymbols.value.add(symbol)
            }
        } else if (selected) {
            // 选中
            selectedSymbols.value.add(symbol)
        } else {
            // 取消选中
            selectedSymbols.value.delete(symbol)
        }
    }

    /**
     * 全选/取消全选
     * @param selected 是否全选
     */
    function toggleSelectAll(selected?: boolean) {
        if (!activeWatchlist.value) return

        if (selected === undefined) {
            // 如果当前已全选，则取消全选；否则全选
            const isAllSelected = activeWatchlist.value.items.every(
                item => selectedSymbols.value.has(item.symbol)
            )

            if (isAllSelected) {
                selectedSymbols.value.clear()
            } else {
                activeWatchlist.value.items.forEach(item => {
                    selectedSymbols.value.add(item.symbol)
                })
            }
        } else if (selected) {
            // 全选
            activeWatchlist.value.items.forEach(item => {
                selectedSymbols.value.add(item.symbol)
            })
        } else {
            // 取消全选
            selectedSymbols.value.clear()
        }
    }

    /**
     * 批量移除选中的股票
     */
    async function removeSelectedStocks() {
        if (!activeWatchlist.value || selectedSymbols.value.size === 0) return

        const symbols = Array.from(selectedSymbols.value)
        await removeStocksBatchFromWatchlist(activeWatchlist.value.id, symbols)
    }

    /**
     * 批量移动选中的股票到另一个关注列表
     * @param targetWatchlistId 目标关注列表ID
     */
    async function moveSelectedStocks(targetWatchlistId: string) {
        if (
            !activeWatchlist.value ||
            selectedSymbols.value.size === 0 ||
            activeWatchlist.value.id === targetWatchlistId
        ) return

        const symbols = Array.from(selectedSymbols.value)
        const sourceWatchlistId = activeWatchlist.value.id

        // 获取选中的股票数据
        const selectedStocks = activeWatchlist.value.items
            .filter(item => selectedSymbols.value.has(item.symbol))
            .map(item => ({
                symbol: item.symbol,
                name: item.name,
                notes: item.notes
            }))

        // 批量添加到目标关注列表
        await addStocksBatchToWatchlist(
            targetWatchlistId,
            selectedStocks.map(item => ({ symbol: item.symbol, name: item.name }))
        )

        // 从源关注列表中移除
        await removeStocksBatchFromWatchlist(sourceWatchlistId, symbols)
    }

    /**
     * 批量添加标签到选中的股票
     * @param tag 标签
     */
    async function addTagToSelectedStocks(tag: string) {
        if (!activeWatchlist.value || selectedSymbols.value.size === 0) return

        const watchlistId = activeWatchlist.value.id
        const watchlistIndex = watchlists.value.findIndex(w => w.id === watchlistId)

        if (watchlistIndex === -1) return

        // 更新选中的股票
        watchlists.value[watchlistIndex].items = watchlists.value[watchlistIndex].items.map(item => {
            if (selectedSymbols.value.has(item.symbol)) {
                const tags = item.tags || []
                if (!tags.includes(tag)) {
                    return {
                        ...item,
                        tags: [...tags, tag]
                    }
                }
            }
            return item
        })
    }

    /**
     * 清除缓存并重新加载
     */
    async function refreshAll() {
        enhancedWatchlistService.clearCache()
        await loadWatchlists(true)
    }

    // 监听认证状态变化
    const authStore = useAuthStore()
    watch(() => authStore.isAuthenticated, (isAuthenticated) => {
        if (isAuthenticated) {
            // 用户登录后刷新数据
            refreshAll()
        }
    })

    // 初始化
    loadWatchlists()

    return {
        // 状态
        watchlists,
        activeWatchlistId,
        isLoading,
        error,
        lastUpdated,
        selectedSymbols,

        // 计算属性
        activeWatchlist,
        watchlistsMap,
        watchlistItemsMap,
        allWatchedSymbols,
        selectedItems,

        // 方法
        loadWatchlists,
        createWatchlist,
        updateWatchlist,
        deleteWatchlist,
        setActiveWatchlist,
        addStockToWatchlist,
        addStocksBatchToWatchlist,
        removeStockFromWatchlist,
        removeStocksBatchFromWatchlist,
        updateStockNotes,
        refreshWatchlistData,
        sortWatchlist,
        setWatchlistColumns,
        toggleStockSelection,
        toggleSelectAll,
        removeSelectedStocks,
        moveSelectedStocks,
        addTagToSelectedStocks,
        refreshAll
    }
})