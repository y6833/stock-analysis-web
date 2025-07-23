import axios from 'axios'
import { getAuthHeaders } from '@/utils/auth'
import { useAuthStore } from '@/stores/auth/authStore'
import { useStockDataStore } from '@/stores/stock/stockDataStore'
import type { Watchlist, WatchlistItem, WatchlistAlert } from '@/types/dashboard'

// API基础URL
const API_URL = 'http://localhost:7001/api'

// 本地存储键
const LOCAL_STORAGE_KEY = 'watchlists_data'

/**
 * 增强版关注列表服务
 * 提供更高效的数据同步和批量操作支持
 */
export class EnhancedWatchlistService {
    // 缓存控制
    private cacheExpiry: number = 5 * 60 * 1000 // 5分钟缓存过期
    private lastFetchTime: number = 0
    private cachedWatchlists: Watchlist[] | null = null

    /**
     * 获取用户的所有关注列表
     * @param forceRefresh 是否强制刷新
     * @returns 关注列表数组
     */
    async getWatchlists(forceRefresh = false): Promise<Watchlist[]> {
        const authStore = useAuthStore()

        // 如果用户未登录，从本地存储加载
        if (!authStore.isAuthenticated) {
            return this.loadLocalWatchlists()
        }

        // 检查缓存是否有效
        const now = Date.now()
        if (
            !forceRefresh &&
            this.cachedWatchlists &&
            now - this.lastFetchTime < this.cacheExpiry
        ) {
            return this.cachedWatchlists
        }

        try {
            // 从API获取数据
            const response = await axios.get(`${API_URL}/watchlists`, getAuthHeaders())

            // 转换为前端格式
            const watchlists = this.convertApiWatchlistsToFrontend(response.data)

            // 更新缓存
            this.cachedWatchlists = watchlists
            this.lastFetchTime = now

            // 同步到本地存储
            this.saveLocalWatchlists(watchlists)

            return watchlists
        } catch (error) {
            console.error('获取关注列表失败:', error)

            // 失败时尝试从本地加载
            return this.loadLocalWatchlists()
        }
    }

    /**
     * 创建新的关注列表
     * @param name 关注列表名称
     * @param description 关注列表描述
     * @returns 创建的关注列表
     */
    async createWatchlist(name: string, description?: string): Promise<Watchlist> {
        const authStore = useAuthStore()

        if (!authStore.isAuthenticated) {
            // 离线模式创建
            const newWatchlist: Watchlist = {
                id: `local_${Date.now()}`,
                name,
                items: [],
                sortBy: 'addedAt',
                sortDirection: 'desc',
                columns: ['symbol', 'name', 'price', 'change', 'changePercent']
            }

            const watchlists = await this.loadLocalWatchlists()
            watchlists.push(newWatchlist)
            this.saveLocalWatchlists(watchlists)

            return newWatchlist
        }

        try {
            const response = await axios.post(
                `${API_URL}/watchlists`,
                { name, description },
                getAuthHeaders()
            )

            // 转换为前端格式
            const newWatchlist = this.convertApiWatchlistToFrontend(response.data)

            // 更新缓存
            if (this.cachedWatchlists) {
                this.cachedWatchlists.push(newWatchlist)
            }

            // 同步到本地存储
            const watchlists = await this.loadLocalWatchlists()
            watchlists.push(newWatchlist)
            this.saveLocalWatchlists(watchlists)

            return newWatchlist
        } catch (error) {
            console.error('创建关注列表失败:', error)
            throw error
        }
    }

    /**
     * 更新关注列表
     * @param id 关注列表ID
     * @param name 新名称
     * @param description 新描述
     * @returns 更新后的关注列表
     */
    async updateWatchlist(id: string, name: string, description?: string): Promise<Watchlist> {
        const authStore = useAuthStore()

        if (!authStore.isAuthenticated) {
            // 离线模式更新
            const watchlists = await this.loadLocalWatchlists()
            const index = watchlists.findIndex(w => w.id === id)

            if (index === -1) {
                throw new Error('关注列表不存在')
            }

            watchlists[index] = {
                ...watchlists[index],
                name,
            }

            this.saveLocalWatchlists(watchlists)
            return watchlists[index]
        }

        try {
            const response = await axios.put(
                `${API_URL}/watchlists/${id}`,
                { name, description },
                getAuthHeaders()
            )

            // 转换为前端格式
            const updatedWatchlist = this.convertApiWatchlistToFrontend(response.data)

            // 更新缓存
            if (this.cachedWatchlists) {
                const index = this.cachedWatchlists.findIndex(w => w.id === id)
                if (index !== -1) {
                    this.cachedWatchlists[index] = {
                        ...this.cachedWatchlists[index],
                        name,
                    }
                }
            }

            // 同步到本地存储
            const watchlists = await this.loadLocalWatchlists()
            const localIndex = watchlists.findIndex(w => w.id === id)
            if (localIndex !== -1) {
                watchlists[localIndex] = {
                    ...watchlists[localIndex],
                    name,
                }
                this.saveLocalWatchlists(watchlists)
            }

            return updatedWatchlist
        } catch (error) {
            console.error('更新关注列表失败:', error)
            throw error
        }
    }

    /**
     * 删除关注列表
     * @param id 关注列表ID
     */
    async deleteWatchlist(id: string): Promise<void> {
        const authStore = useAuthStore()

        if (!authStore.isAuthenticated) {
            // 离线模式删除
            const watchlists = await this.loadLocalWatchlists()
            const filteredWatchlists = watchlists.filter(w => w.id !== id)
            this.saveLocalWatchlists(filteredWatchlists)
            return
        }

        try {
            await axios.delete(`${API_URL}/watchlists/${id}`, getAuthHeaders())

            // 更新缓存
            if (this.cachedWatchlists) {
                this.cachedWatchlists = this.cachedWatchlists.filter(w => w.id !== id)
            }

            // 同步到本地存储
            const watchlists = await this.loadLocalWatchlists()
            const filteredWatchlists = watchlists.filter(w => w.id !== id)
            this.saveLocalWatchlists(filteredWatchlists)
        } catch (error) {
            console.error('删除关注列表失败:', error)
            throw error
        }
    }

    /**
     * 添加股票到关注列表
     * @param watchlistId 关注列表ID
     * @param symbol 股票代码
     * @param name 股票名称
     * @param notes 备注
     * @returns 添加的股票项
     */
    async addStockToWatchlist(
        watchlistId: string,
        symbol: string,
        name: string,
        notes?: string
    ): Promise<WatchlistItem> {
        const authStore = useAuthStore()
        const stockDataStore = useStockDataStore()

        // 获取股票数据
        const stockData = stockDataStore.stocksMap.get(symbol)

        const newItem: WatchlistItem = {
            symbol,
            name,
            price: stockData?.price || 0,
            change: stockData?.change || 0,
            changePercent: stockData?.changePercent || 0,
            volume: stockData?.volume || 0,
            turnover: stockData?.turnover || 0,
            notes,
            addedAt: new Date().toISOString()
        }

        if (!authStore.isAuthenticated) {
            // 离线模式添加
            const watchlists = await this.loadLocalWatchlists()
            const watchlistIndex = watchlists.findIndex(w => w.id === watchlistId)

            if (watchlistIndex === -1) {
                throw new Error('关注列表不存在')
            }

            // 检查是否已存在
            if (watchlists[watchlistIndex].items.some(item => item.symbol === symbol)) {
                throw new Error('股票已在关注列表中')
            }

            watchlists[watchlistIndex].items.push(newItem)
            this.saveLocalWatchlists(watchlists)

            return newItem
        }

        try {
            const response = await axios.post(
                `${API_URL}/watchlists/${watchlistId}/stocks`,
                { stockCode: symbol, stockName: name, notes },
                getAuthHeaders()
            )

            // 转换为前端格式
            const addedItem = this.convertApiWatchlistItemToFrontend(response.data)

            // 更新缓存
            if (this.cachedWatchlists) {
                const watchlistIndex = this.cachedWatchlists.findIndex(w => w.id === watchlistId)
                if (watchlistIndex !== -1) {
                    this.cachedWatchlists[watchlistIndex].items.push(addedItem)
                }
            }

            // 同步到本地存储
            const watchlists = await this.loadLocalWatchlists()
            const localWatchlistIndex = watchlists.findIndex(w => w.id === watchlistId)
            if (localWatchlistIndex !== -1) {
                watchlists[localWatchlistIndex].items.push(addedItem)
                this.saveLocalWatchlists(watchlists)
            }

            return addedItem
        } catch (error) {
            console.error('添加股票到关注列表失败:', error)
            throw error
        }
    }

    /**
     * 批量添加股票到关注列表
     * @param watchlistId 关注列表ID
     * @param stocks 股票数组 [{symbol, name}]
     * @returns 添加的股票项数组
     */
    async addStocksBatchToWatchlist(
        watchlistId: string,
        stocks: Array<{ symbol: string, name: string }>
    ): Promise<WatchlistItem[]> {
        const authStore = useAuthStore()
        const stockDataStore = useStockDataStore()

        // 创建新项目数组
        const newItems: WatchlistItem[] = stocks.map(stock => {
            const stockData = stockDataStore.stocksMap.get(stock.symbol)

            return {
                symbol: stock.symbol,
                name: stock.name,
                price: stockData?.price || 0,
                change: stockData?.change || 0,
                changePercent: stockData?.changePercent || 0,
                volume: stockData?.volume || 0,
                turnover: stockData?.turnover || 0,
                addedAt: new Date().toISOString()
            }
        })

        if (!authStore.isAuthenticated) {
            // 离线模式批量添加
            const watchlists = await this.loadLocalWatchlists()
            const watchlistIndex = watchlists.findIndex(w => w.id === watchlistId)

            if (watchlistIndex === -1) {
                throw new Error('关注列表不存在')
            }

            // 过滤掉已存在的股票
            const existingSymbols = new Set(watchlists[watchlistIndex].items.map(item => item.symbol))
            const uniqueNewItems = newItems.filter(item => !existingSymbols.has(item.symbol))

            watchlists[watchlistIndex].items.push(...uniqueNewItems)
            this.saveLocalWatchlists(watchlists)

            return uniqueNewItems
        }

        try {
            // 在线模式批量添加 - 使用Promise.all并行处理
            const addedItems = await Promise.all(
                stocks.map(async stock => {
                    try {
                        const response = await axios.post(
                            `${API_URL}/watchlists/${watchlistId}/stocks`,
                            { stockCode: stock.symbol, stockName: stock.name },
                            getAuthHeaders()
                        )
                        return this.convertApiWatchlistItemToFrontend(response.data)
                    } catch (error) {
                        console.error(`添加股票 ${stock.symbol} 失败:`, error)
                        return null
                    }
                })
            )

            // 过滤掉添加失败的项
            const successfulItems = addedItems.filter(Boolean) as WatchlistItem[]

            // 更新缓存
            if (this.cachedWatchlists) {
                const watchlistIndex = this.cachedWatchlists.findIndex(w => w.id === watchlistId)
                if (watchlistIndex !== -1) {
                    this.cachedWatchlists[watchlistIndex].items.push(...successfulItems)
                }
            }

            // 同步到本地存储
            const watchlists = await this.loadLocalWatchlists()
            const localWatchlistIndex = watchlists.findIndex(w => w.id === watchlistId)
            if (localWatchlistIndex !== -1) {
                watchlists[localWatchlistIndex].items.push(...successfulItems)
                this.saveLocalWatchlists(watchlists)
            }

            return successfulItems
        } catch (error) {
            console.error('批量添加股票到关注列表失败:', error)
            throw error
        }
    }

    /**
     * 从关注列表中移除股票
     * @param watchlistId 关注列表ID
     * @param symbol 股票代码
     */
    async removeStockFromWatchlist(watchlistId: string, symbol: string): Promise<void> {
        const authStore = useAuthStore()

        if (!authStore.isAuthenticated) {
            // 离线模式移除
            const watchlists = await this.loadLocalWatchlists()
            const watchlistIndex = watchlists.findIndex(w => w.id === watchlistId)

            if (watchlistIndex === -1) {
                throw new Error('关注列表不存在')
            }

            watchlists[watchlistIndex].items = watchlists[watchlistIndex].items.filter(
                item => item.symbol !== symbol
            )

            this.saveLocalWatchlists(watchlists)
            return
        }

        try {
            // 先获取项目ID
            const response = await axios.get(
                `${API_URL}/watchlists/${watchlistId}/stocks`,
                getAuthHeaders()
            )

            const items = response.data
            const itemToRemove = items.find((item: any) => item.stockCode === symbol)

            if (!itemToRemove) {
                throw new Error('股票不在关注列表中')
            }

            await axios.delete(
                `${API_URL}/watchlists/${watchlistId}/stocks/${itemToRemove.id}`,
                getAuthHeaders()
            )

            // 更新缓存
            if (this.cachedWatchlists) {
                const watchlistIndex = this.cachedWatchlists.findIndex(w => w.id === watchlistId)
                if (watchlistIndex !== -1) {
                    this.cachedWatchlists[watchlistIndex].items = this.cachedWatchlists[watchlistIndex].items.filter(
                        item => item.symbol !== symbol
                    )
                }
            }

            // 同步到本地存储
            const watchlists = await this.loadLocalWatchlists()
            const localWatchlistIndex = watchlists.findIndex(w => w.id === watchlistId)
            if (localWatchlistIndex !== -1) {
                watchlists[localWatchlistIndex].items = watchlists[localWatchlistIndex].items.filter(
                    item => item.symbol !== symbol
                )
                this.saveLocalWatchlists(watchlists)
            }
        } catch (error) {
            console.error('从关注列表中移除股票失败:', error)
            throw error
        }
    }

    /**
     * 批量从关注列表中移除股票
     * @param watchlistId 关注列表ID
     * @param symbols 股票代码数组
     */
    async removeStocksBatchFromWatchlist(watchlistId: string, symbols: string[]): Promise<void> {
        const authStore = useAuthStore()

        if (!authStore.isAuthenticated) {
            // 离线模式批量移除
            const watchlists = await this.loadLocalWatchlists()
            const watchlistIndex = watchlists.findIndex(w => w.id === watchlistId)

            if (watchlistIndex === -1) {
                throw new Error('关注列表不存在')
            }

            const symbolsSet = new Set(symbols)
            watchlists[watchlistIndex].items = watchlists[watchlistIndex].items.filter(
                item => !symbolsSet.has(item.symbol)
            )

            this.saveLocalWatchlists(watchlists)
            return
        }

        try {
            // 获取所有项目
            const response = await axios.get(
                `${API_URL}/watchlists/${watchlistId}/stocks`,
                getAuthHeaders()
            )

            const items = response.data
            const symbolsSet = new Set(symbols)
            const itemsToRemove = items.filter((item: any) => symbolsSet.has(item.stockCode))

            // 并行删除所有项目
            await Promise.all(
                itemsToRemove.map((item: any) =>
                    axios.delete(
                        `${API_URL}/watchlists/${watchlistId}/stocks/${item.id}`,
                        getAuthHeaders()
                    )
                )
            )

            // 更新缓存
            if (this.cachedWatchlists) {
                const watchlistIndex = this.cachedWatchlists.findIndex(w => w.id === watchlistId)
                if (watchlistIndex !== -1) {
                    this.cachedWatchlists[watchlistIndex].items = this.cachedWatchlists[watchlistIndex].items.filter(
                        item => !symbolsSet.has(item.symbol)
                    )
                }
            }

            // 同步到本地存储
            const watchlists = await this.loadLocalWatchlists()
            const localWatchlistIndex = watchlists.findIndex(w => w.id === watchlistId)
            if (localWatchlistIndex !== -1) {
                watchlists[localWatchlistIndex].items = watchlists[localWatchlistIndex].items.filter(
                    item => !symbolsSet.has(item.symbol)
                )
                this.saveLocalWatchlists(watchlists)
            }
        } catch (error) {
            console.error('批量从关注列表中移除股票失败:', error)
            throw error
        }
    }

    /**
     * 更新关注股票的备注
     * @param watchlistId 关注列表ID
     * @param symbol 股票代码
     * @param notes 备注
     */
    async updateStockNotes(watchlistId: string, symbol: string, notes: string): Promise<void> {
        const authStore = useAuthStore()

        if (!authStore.isAuthenticated) {
            // 离线模式更新备注
            const watchlists = await this.loadLocalWatchlists()
            const watchlistIndex = watchlists.findIndex(w => w.id === watchlistId)

            if (watchlistIndex === -1) {
                throw new Error('关注列表不存在')
            }

            const itemIndex = watchlists[watchlistIndex].items.findIndex(item => item.symbol === symbol)

            if (itemIndex === -1) {
                throw new Error('股票不在关注列表中')
            }

            watchlists[watchlistIndex].items[itemIndex].notes = notes
            this.saveLocalWatchlists(watchlists)
            return
        }

        try {
            // 先获取项目ID
            const response = await axios.get(
                `${API_URL}/watchlists/${watchlistId}/stocks`,
                getAuthHeaders()
            )

            const items = response.data
            const itemToUpdate = items.find((item: any) => item.stockCode === symbol)

            if (!itemToUpdate) {
                throw new Error('股票不在关注列表中')
            }

            await axios.put(
                `${API_URL}/watchlists/${watchlistId}/stocks/${itemToUpdate.id}/notes`,
                { notes },
                getAuthHeaders()
            )

            // 更新缓存
            if (this.cachedWatchlists) {
                const watchlistIndex = this.cachedWatchlists.findIndex(w => w.id === watchlistId)
                if (watchlistIndex !== -1) {
                    const itemIndex = this.cachedWatchlists[watchlistIndex].items.findIndex(
                        item => item.symbol === symbol
                    )

                    if (itemIndex !== -1) {
                        this.cachedWatchlists[watchlistIndex].items[itemIndex].notes = notes
                    }
                }
            }

            // 同步到本地存储
            const watchlists = await this.loadLocalWatchlists()
            const localWatchlistIndex = watchlists.findIndex(w => w.id === watchlistId)
            if (localWatchlistIndex !== -1) {
                const itemIndex = watchlists[localWatchlistIndex].items.findIndex(
                    item => item.symbol === symbol
                )

                if (itemIndex !== -1) {
                    watchlists[localWatchlistIndex].items[itemIndex].notes = notes
                    this.saveLocalWatchlists(watchlists)
                }
            }
        } catch (error) {
            console.error('更新关注股票备注失败:', error)
            throw error
        }
    }

    /**
     * 批量更新关注列表中的股票数据
     * @param watchlistId 关注列表ID
     * @param updates 更新数据 [{symbol, price, change, ...}]
     */
    async updateStocksBatchData(
        watchlistId: string,
        updates: Array<{ symbol: string } & Partial<WatchlistItem>>
    ): Promise<void> {
        const watchlists = await this.loadLocalWatchlists()
        const watchlistIndex = watchlists.findIndex(w => w.id === watchlistId)

        if (watchlistIndex === -1) {
            throw new Error('关注列表不存在')
        }

        // 创建符号到更新的映射
        const updateMap = new Map(updates.map(update => [update.symbol, update]))

        // 更新项目
        watchlists[watchlistIndex].items = watchlists[watchlistIndex].items.map(item => {
            const update = updateMap.get(item.symbol)
            if (update) {
                return { ...item, ...update }
            }
            return item
        })

        // 更新缓存
        if (this.cachedWatchlists) {
            const cacheWatchlistIndex = this.cachedWatchlists.findIndex(w => w.id === watchlistId)
            if (cacheWatchlistIndex !== -1) {
                this.cachedWatchlists[cacheWatchlistIndex].items = this.cachedWatchlists[cacheWatchlistIndex].items.map(item => {
                    const update = updateMap.get(item.symbol)
                    if (update) {
                        return { ...item, ...update }
                    }
                    return item
                })
            }
        }

        // 保存到本地存储
        this.saveLocalWatchlists(watchlists)
    }

    /**
     * 排序关注列表中的股票
     * @param watchlistId 关注列表ID
     * @param sortBy 排序字段
     * @param sortDirection 排序方向
     */
    async sortWatchlist(
        watchlistId: string,
        sortBy: string,
        sortDirection: 'asc' | 'desc' = 'asc'
    ): Promise<void> {
        const watchlists = await this.loadLocalWatchlists()
        const watchlistIndex = watchlists.findIndex(w => w.id === watchlistId)

        if (watchlistIndex === -1) {
            throw new Error('关注列表不存在')
        }

        // 更新排序设置
        watchlists[watchlistIndex].sortBy = sortBy
        watchlists[watchlistIndex].sortDirection = sortDirection

        // 执行排序
        watchlists[watchlistIndex].items.sort((a, b) => {
            // 获取排序字段值
            const aValue = a[sortBy as keyof WatchlistItem]
            const bValue = b[sortBy as keyof WatchlistItem]

            // 比较
            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
            return 0
        })

        // 更新缓存
        if (this.cachedWatchlists) {
            const cacheWatchlistIndex = this.cachedWatchlists.findIndex(w => w.id === watchlistId)
            if (cacheWatchlistIndex !== -1) {
                this.cachedWatchlists[cacheWatchlistIndex].sortBy = sortBy
                this.cachedWatchlists[cacheWatchlistIndex].sortDirection = sortDirection

                // 执行排序
                this.cachedWatchlists[cacheWatchlistIndex].items.sort((a, b) => {
                    const aValue = a[sortBy as keyof WatchlistItem]
                    const bValue = b[sortBy as keyof WatchlistItem]

                    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
                    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
                    return 0
                })
            }
        }

        // 保存到本地存储
        this.saveLocalWatchlists(watchlists)
    }

    /**
     * 设置关注列表显示的列
     * @param watchlistId 关注列表ID
     * @param columns 列名数组
     */
    async setWatchlistColumns(watchlistId: string, columns: string[]): Promise<void> {
        const watchlists = await this.loadLocalWatchlists()
        const watchlistIndex = watchlists.findIndex(w => w.id === watchlistId)

        if (watchlistIndex === -1) {
            throw new Error('关注列表不存在')
        }

        // 更新列设置
        watchlists[watchlistIndex].columns = columns

        // 更新缓存
        if (this.cachedWatchlists) {
            const cacheWatchlistIndex = this.cachedWatchlists.findIndex(w => w.id === watchlistId)
            if (cacheWatchlistIndex !== -1) {
                this.cachedWatchlists[cacheWatchlistIndex].columns = columns
            }
        }

        // 保存到本地存储
        this.saveLocalWatchlists(watchlists)
    }

    /**
     * 清除缓存
     */
    clearCache(): void {
        this.cachedWatchlists = null
        this.lastFetchTime = 0
    }

    /**
     * 从本地存储加载关注列表
     */
    private loadLocalWatchlists(): Watchlist[] {
        try {
            const data = localStorage.getItem(LOCAL_STORAGE_KEY)
            if (data) {
                return JSON.parse(data)
            }
        } catch (error) {
            console.error('从本地存储加载关注列表失败:', error)
        }

        // 返回默认关注列表
        return [this.createDefaultWatchlist()]
    }

    /**
     * 保存关注列表到本地存储
     */
    private saveLocalWatchlists(watchlists: Watchlist[]): void {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(watchlists))
        } catch (error) {
            console.error('保存关注列表到本地存储失败:', error)
        }
    }

    /**
     * 创建默认关注列表
     */
    private createDefaultWatchlist(): Watchlist {
        return {
            id: 'default',
            name: '默认关注',
            items: [],
            sortBy: 'addedAt',
            sortDirection: 'desc',
            columns: ['symbol', 'name', 'price', 'change', 'changePercent']
        }
    }

    /**
     * 将API返回的关注列表转换为前端格式
     */
    private convertApiWatchlistsToFrontend(apiWatchlists: any[]): Watchlist[] {
        return apiWatchlists.map(watchlist => this.convertApiWatchlistToFrontend(watchlist))
    }

    /**
     * 将API返回的单个关注列表转换为前端格式
     */
    private convertApiWatchlistToFrontend(apiWatchlist: any): Watchlist {
        return {
            id: apiWatchlist.id.toString(),
            name: apiWatchlist.name,
            items: (apiWatchlist.watchlist_items || []).map((item: any) =>
                this.convertApiWatchlistItemToFrontend(item)
            ),
            sortBy: 'addedAt',
            sortDirection: 'desc' as const,
            columns: ['symbol', 'name', 'price', 'change', 'changePercent']
        }
    }

    /**
     * 将API返回的关注列表项转换为前端格式
     */
    private convertApiWatchlistItemToFrontend(apiItem: any): WatchlistItem {
        return {
            symbol: apiItem.stockCode,
            name: apiItem.stockName,
            price: 0,
            change: 0,
            changePercent: 0,
            volume: 0,
            turnover: 0,
            notes: apiItem.notes || '',
            addedAt: apiItem.createdAt,
        }
    }
}

// 导出单例实例
export const enhancedWatchlistService = new EnhancedWatchlistService()