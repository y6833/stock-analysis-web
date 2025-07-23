/**
 * 优化的股票搜索服务
 * 提供高性能的股票搜索功能，包括智能搜索建议和高级筛选
 */

import { stockService } from './stockService'
import type { Stock } from '@/types/stock'

// 搜索结果缓存
interface SearchCache {
    timestamp: number
    query: string
    results: Stock[]
    filters?: SearchFilters
}

// 搜索过滤器接口
export interface SearchFilters {
    market?: string[]
    industry?: string[]
    priceRange?: [number, number]
    volumeRange?: [number, number]
    sortBy?: 'name' | 'symbol' | 'price' | 'change' | 'volume' | 'industry'
    sortDirection?: 'asc' | 'desc'
    limit?: number
}

// 搜索建议接口
export interface SearchSuggestion {
    type: 'stock' | 'industry' | 'market' | 'recent' | 'popular'
    text: string
    data?: any
}

// 缓存设置
const CACHE_SIZE = 50 // 最大缓存条目数
const CACHE_EXPIRY = 5 * 60 * 1000 // 5分钟过期
const searchCache: Map<string, SearchCache> = new Map()
const recentSearches: string[] = []
const MAX_RECENT_SEARCHES = 10

// 从本地存储加载最近搜索
try {
    const savedSearches = localStorage.getItem('recentStockSearches')
    if (savedSearches) {
        recentSearches.push(...JSON.parse(savedSearches))
    }
} catch (error) {
    console.error('Failed to load recent searches:', error)
}

/**
 * 生成缓存键
 */
function generateCacheKey(query: string, filters?: SearchFilters): string {
    return `${query}_${filters ? JSON.stringify(filters) : ''}`
}

/**
 * 检查缓存是否有效
 */
function isCacheValid(cache: SearchCache): boolean {
    return Date.now() - cache.timestamp < CACHE_EXPIRY
}

/**
 * 添加到最近搜索
 */
function addToRecentSearches(query: string): void {
    // 移除已存在的相同查询
    const index = recentSearches.indexOf(query)
    if (index !== -1) {
        recentSearches.splice(index, 1)
    }

    // 添加到最前面
    recentSearches.unshift(query)

    // 保持最大长度
    if (recentSearches.length > MAX_RECENT_SEARCHES) {
        recentSearches.pop()
    }

    // 保存到本地存储
    try {
        localStorage.setItem('recentStockSearches', JSON.stringify(recentSearches))
    } catch (error) {
        console.error('Failed to save recent searches:', error)
    }
}

/**
 * 优化的股票搜索函数
 * 支持模糊匹配、拼音搜索、智能排序和高级筛选
 */
export async function searchStocks(
    query: string,
    filters?: SearchFilters
): Promise<Stock[]> {
    // 空查询直接返回空结果
    if (!query.trim()) {
        return []
    }

    // 检查缓存
    const cacheKey = generateCacheKey(query, filters)
    const cachedResult = searchCache.get(cacheKey)

    if (cachedResult && isCacheValid(cachedResult)) {
        return cachedResult.results
    }

    try {
        // 使用基础服务获取搜索结果
        let results = await stockService.searchStocks(query)

        // 添加到最近搜索
        if (results.length > 0) {
            addToRecentSearches(query)
        }

        // 应用高级筛选
        if (filters) {
            results = applyFilters(results, filters)
        }

        // 缓存结果
        if (searchCache.size >= CACHE_SIZE) {
            // 如果缓存已满，删除最旧的条目
            const oldestKey = searchCache.keys().next().value
            searchCache.delete(oldestKey)
        }

        searchCache.set(cacheKey, {
            timestamp: Date.now(),
            query,
            results,
            filters
        })

        return results
    } catch (error) {
        console.error('Stock search failed:', error)
        return []
    }
}

/**
 * 应用高级筛选
 */
function applyFilters(stocks: Stock[], filters: SearchFilters): Stock[] {
    let filteredStocks = [...stocks]

    // 按市场筛选
    if (filters.market && filters.market.length > 0) {
        filteredStocks = filteredStocks.filter(stock =>
            filters.market!.includes(stock.market || '')
        )
    }

    // 按行业筛选
    if (filters.industry && filters.industry.length > 0) {
        filteredStocks = filteredStocks.filter(stock =>
            filters.industry!.includes(stock.industry || '')
        )
    }

    // 按价格范围筛选
    if (filters.priceRange) {
        const [min, max] = filters.priceRange
        filteredStocks = filteredStocks.filter(stock => {
            const price = parseFloat(stock.price as unknown as string)
            return !isNaN(price) && price >= min && price <= max
        })
    }

    // 按成交量范围筛选
    if (filters.volumeRange) {
        const [min, max] = filters.volumeRange
        filteredStocks = filteredStocks.filter(stock => {
            const volume = parseFloat(stock.volume as unknown as string)
            return !isNaN(volume) && volume >= min && volume <= max
        })
    }

    // 排序
    if (filters.sortBy) {
        filteredStocks.sort((a, b) => {
            let valueA: any
            let valueB: any

            switch (filters.sortBy) {
                case 'name':
                    valueA = a.name || ''
                    valueB = b.name || ''
                    break
                case 'symbol':
                    valueA = a.symbol || a.tsCode || ''
                    valueB = b.symbol || b.tsCode || ''
                    break
                case 'price':
                    valueA = parseFloat(a.price as unknown as string) || 0
                    valueB = parseFloat(b.price as unknown as string) || 0
                    break
                case 'change':
                    valueA = parseFloat(a.change as unknown as string) || 0
                    valueB = parseFloat(b.change as unknown as string) || 0
                    break
                case 'volume':
                    valueA = parseFloat(a.volume as unknown as string) || 0
                    valueB = parseFloat(b.volume as unknown as string) || 0
                    break
                case 'industry':
                    valueA = a.industry || ''
                    valueB = b.industry || ''
                    break
                default:
                    valueA = a.symbol || ''
                    valueB = b.symbol || ''
            }

            // 字符串比较
            if (typeof valueA === 'string' && typeof valueB === 'string') {
                return filters.sortDirection === 'desc'
                    ? valueB.localeCompare(valueA)
                    : valueA.localeCompare(valueB)
            }

            // 数值比较
            return filters.sortDirection === 'desc'
                ? valueB - valueA
                : valueA - valueB
        })
    }

    // 限制结果数量
    if (filters.limit && filters.limit > 0) {
        filteredStocks = filteredStocks.slice(0, filters.limit)
    }

    return filteredStocks
}

/**
 * 获取智能搜索建议
 * 基于用户输入、最近搜索和热门股票
 */
export async function getSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = []

    // 如果查询为空，返回最近搜索和热门股票
    if (!query.trim()) {
        // 添加最近搜索
        recentSearches.slice(0, 5).forEach(search => {
            suggestions.push({
                type: 'recent',
                text: search
            })
        })

        // 添加热门股票（可以从缓存或预定义列表中获取）
        const popularStocks = getPopularStocks()
        popularStocks.forEach(stock => {
            suggestions.push({
                type: 'popular',
                text: `${stock.symbol} ${stock.name}`,
                data: stock
            })
        })

        return suggestions
    }

    try {
        // 获取匹配的股票
        const stocks = await searchStocks(query)

        // 添加股票建议
        stocks.slice(0, 5).forEach(stock => {
            suggestions.push({
                type: 'stock',
                text: `${stock.symbol || stock.tsCode} ${stock.name}`,
                data: stock
            })
        })

        // 提取并添加相关行业建议
        const industries = new Set<string>()
        stocks.forEach(stock => {
            if (stock.industry && !industries.has(stock.industry)) {
                industries.add(stock.industry)
                if (industries.size <= 3) { // 限制行业建议数量
                    suggestions.push({
                        type: 'industry',
                        text: stock.industry,
                        data: { industry: stock.industry }
                    })
                }
            }
        })

        // 提取并添加相关市场建议
        const markets = new Set<string>()
        stocks.forEach(stock => {
            if (stock.market && !markets.has(stock.market)) {
                markets.add(stock.market)
                if (markets.size <= 2) { // 限制市场建议数量
                    suggestions.push({
                        type: 'market',
                        text: stock.market,
                        data: { market: stock.market }
                    })
                }
            }
        })

        return suggestions
    } catch (error) {
        console.error('Failed to get search suggestions:', error)
        return []
    }
}

/**
 * 获取热门股票
 */
function getPopularStocks(): Stock[] {
    // 这里可以实现从后端获取热门股票的逻辑
    // 现在返回一些示例数据
    return [
        { symbol: '000001', name: '平安银行', market: 'SZ', industry: '银行' },
        { symbol: '600036', name: '招商银行', market: 'SH', industry: '银行' },
        { symbol: '601318', name: '中国平安', market: 'SH', industry: '保险' },
        { symbol: '000858', name: '五粮液', market: 'SZ', industry: '白酒' },
        { symbol: '600519', name: '贵州茅台', market: 'SH', industry: '白酒' }
    ] as Stock[]
}

/**
 * 获取可用的市场列表
 */
export async function getAvailableMarkets(): Promise<string[]> {
    try {
        const stocks = await stockService.getStocks()
        const markets = new Set<string>()

        stocks.forEach(stock => {
            if (stock.market) {
                markets.add(stock.market)
            }
        })

        return Array.from(markets).sort()
    } catch (error) {
        console.error('Failed to get available markets:', error)
        return []
    }
}

/**
 * 获取可用的行业列表
 */
export async function getAvailableIndustries(): Promise<string[]> {
    try {
        const stocks = await stockService.getStocks()
        const industries = new Set<string>()

        stocks.forEach(stock => {
            if (stock.industry) {
                industries.add(stock.industry)
            }
        })

        return Array.from(industries).sort()
    } catch (error) {
        console.error('Failed to get available industries:', error)
        return []
    }
}

/**
 * 清除搜索缓存
 */
export function clearSearchCache(): void {
    searchCache.clear()
}

/**
 * 清除最近搜索历史
 */
export function clearRecentSearches(): void {
    recentSearches.length = 0
    try {
        localStorage.removeItem('recentStockSearches')
    } catch (error) {
        console.error('Failed to clear recent searches:', error)
    }
}

// 导出服务
export const stockSearchService = {
    searchStocks,
    getSearchSuggestions,
    getAvailableMarkets,
    getAvailableIndustries,
    clearSearchCache,
    clearRecentSearches
}

export default stockSearchService