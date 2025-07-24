/**
 * 重构后的股票Store
 * 使用新的基础Store类和统一的状态管理模式
 */

import { defineStore } from 'pinia'
import { computed } from 'vue'
import { createListStore, createDetailStore } from '@/core/BaseStore'
import type { Stock, StockData, StockQuote } from '@/types/stock'
import { stockService } from '@/services/stockService'
import { CONSTANTS } from '@/constants'
import { Utils } from '@/utils'

/**
 * 股票列表Store
 */
export const useStockListStore = createListStore<Stock>('stockList', {
  persistKey: CONSTANTS.STORAGE.KEYS.WATCHLIST,
  enablePersist: true,
  pageSize: CONSTANTS.UI.PAGINATION.DEFAULT_PAGE_SIZE
})

/**
 * 股票详情Store
 */
export const useStockDetailStore = createDetailStore<StockData | null>('stockDetail', null, {
  enablePersist: false
})

/**
 * 股票行情Store
 */
export const useStockQuoteStore = defineStore('stockQuote', () => {
  // 使用基础Store创建行情数据管理
  const baseStore = createListStore<StockQuote>('stockQuoteBase', {
    enablePersist: true,
    persistKey: 'stock_quotes_cache'
  })()

  // 当前选中的股票
  const currentSymbol = ref<string>('')
  const currentQuote = computed(() => 
    baseStore.data.find(quote => quote.symbol === currentSymbol.value)
  )

  // 行情数据操作
  const getQuote = async (symbol: string, forceRefresh = false): Promise<StockQuote | null> => {
    return await baseStore.withAsyncOperation(async () => {
      // 检查缓存
      if (!forceRefresh) {
        const cached = baseStore.data.find(quote => quote.symbol === symbol)
        if (cached && isQuoteValid(cached)) {
          return cached
        }
      }

      // 获取新数据
      const quote = await stockService.getStockQuote(symbol, forceRefresh)
      
      // 更新或添加到列表
      const existingIndex = baseStore.data.findIndex(q => q.symbol === symbol)
      if (existingIndex !== -1) {
        baseStore.updateItem(q => q.symbol === symbol, () => quote)
      } else {
        baseStore.addItem(quote)
      }

      return quote
    }, '获取股票行情失败')
  }

  // 批量获取行情
  const getBatchQuotes = async (symbols: string[]): Promise<Record<string, StockQuote>> => {
    return await baseStore.withAsyncOperation(async () => {
      const results: Record<string, StockQuote> = {}
      
      // 并发获取行情数据
      const promises = symbols.map(async (symbol) => {
        try {
          const quote = await getQuote(symbol)
          if (quote) {
            results[symbol] = quote
          }
        } catch (error) {
          console.error(`获取${symbol}行情失败:`, error)
        }
      })

      await Promise.allSettled(promises)
      return results
    }, '批量获取行情失败') || {}
  }

  // 设置当前股票
  const setCurrentSymbol = (symbol: string) => {
    currentSymbol.value = symbol
  }

  // 刷新当前股票行情
  const refreshCurrentQuote = async (): Promise<StockQuote | null> => {
    if (!currentSymbol.value) return null
    return await getQuote(currentSymbol.value, true)
  }

  // 清除过期行情
  const clearExpiredQuotes = () => {
    baseStore.updateData(quotes => 
      quotes.filter(quote => isQuoteValid(quote))
    )
  }

  // 判断行情是否有效（未过期）
  const isQuoteValid = (quote: StockQuote): boolean => {
    if (!quote.timestamp) return false
    const now = new Date()
    const quoteTime = new Date(quote.timestamp)
    const diffMinutes = (now.getTime() - quoteTime.getTime()) / (1000 * 60)
    return diffMinutes < 5 // 5分钟内的数据认为有效
  }

  return {
    // 继承基础Store功能
    ...baseStore,
    
    // 当前股票状态
    currentSymbol,
    currentQuote,
    
    // 行情操作
    getQuote,
    getBatchQuotes,
    setCurrentSymbol,
    refreshCurrentQuote,
    clearExpiredQuotes
  }
})

/**
 * 股票搜索Store
 */
export const useStockSearchStore = defineStore('stockSearch', () => {
  const baseStore = createListStore<Stock>('stockSearchBase', {
    enablePersist: false,
    pageSize: 50
  })()

  // 搜索历史
  const searchHistory = ref<string[]>(
    Utils.Storage.local.get('stock_search_history', [])
  )

  // 热门搜索
  const hotSearches = ref<string[]>([])

  // 搜索建议
  const suggestions = ref<Stock[]>([])

  // 执行搜索
  const search = async (query: string): Promise<Stock[]> => {
    if (!query.trim()) {
      baseStore.setItems([])
      return []
    }

    return await baseStore.withAsyncOperation(async () => {
      const results = await stockService.searchStocks(query)
      baseStore.setItems(results, results.length)
      
      // 添加到搜索历史
      addToHistory(query)
      
      return results
    }, '搜索股票失败') || []
  }

  // 获取搜索建议
  const getSuggestions = async (query: string): Promise<Stock[]> => {
    if (!query.trim()) {
      suggestions.value = []
      return []
    }

    try {
      const results = await stockService.searchStocks(query)
      suggestions.value = results.slice(0, 10) // 只取前10个建议
      return suggestions.value
    } catch (error) {
      console.error('获取搜索建议失败:', error)
      suggestions.value = []
      return []
    }
  }

  // 添加到搜索历史
  const addToHistory = (query: string) => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    // 移除重复项并添加到开头
    const newHistory = [
      trimmedQuery,
      ...searchHistory.value.filter(item => item !== trimmedQuery)
    ].slice(0, 20) // 最多保存20条历史

    searchHistory.value = newHistory
    Utils.Storage.local.set('stock_search_history', newHistory)
  }

  // 清除搜索历史
  const clearHistory = () => {
    searchHistory.value = []
    Utils.Storage.local.remove('stock_search_history')
  }

  // 删除历史项
  const removeHistoryItem = (query: string) => {
    searchHistory.value = searchHistory.value.filter(item => item !== query)
    Utils.Storage.local.set('stock_search_history', searchHistory.value)
  }

  // 获取热门搜索
  const getHotSearches = async (): Promise<string[]> => {
    try {
      // 这里可以从API获取热门搜索词
      // const hot = await stockService.getHotSearches()
      // hotSearches.value = hot
      
      // 暂时使用模拟数据
      hotSearches.value = ['贵州茅台', '中国平安', '招商银行', '五粮液', '美的集团']
      return hotSearches.value
    } catch (error) {
      console.error('获取热门搜索失败:', error)
      return []
    }
  }

  return {
    // 继承基础Store功能
    ...baseStore,
    
    // 搜索状态
    searchHistory,
    hotSearches,
    suggestions,
    
    // 搜索操作
    search,
    getSuggestions,
    addToHistory,
    clearHistory,
    removeHistoryItem,
    getHotSearches
  }
})

/**
 * 股票数据源Store
 */
export const useStockDataSourceStore = defineStore('stockDataSource', () => {
  const currentDataSource = ref<string>(
    Utils.Storage.local.get(CONSTANTS.STORAGE.KEYS.DATA_SOURCE, CONSTANTS.DATA_SOURCE.TYPES.TUSHARE)
  )
  
  const availableDataSources = ref<string[]>(
    stockService.getAvailableDataSources()
  )

  const dataSourceInfo = computed(() => 
    stockService.getDataSourceInfo(currentDataSource.value as any)
  )

  // 切换数据源
  const switchDataSource = async (dataSource: string): Promise<boolean> => {
    try {
      const success = stockService.switchDataSource(dataSource as any)
      if (success) {
        currentDataSource.value = dataSource
        Utils.Storage.local.set(CONSTANTS.STORAGE.KEYS.DATA_SOURCE, dataSource)
      }
      return success
    } catch (error) {
      console.error('切换数据源失败:', error)
      return false
    }
  }

  // 测试数据源连接
  const testDataSource = async (dataSource: string): Promise<boolean> => {
    try {
      return await stockService.testDataSource(dataSource as any)
    } catch (error) {
      console.error('测试数据源失败:', error)
      return false
    }
  }

  // 清除数据源缓存
  const clearDataSourceCache = async (dataSource: string): Promise<boolean> => {
    try {
      return await stockService.clearDataSourceCache(dataSource as any)
    } catch (error) {
      console.error('清除数据源缓存失败:', error)
      return false
    }
  }

  return {
    // 状态
    currentDataSource,
    availableDataSources,
    dataSourceInfo,
    
    // 操作
    switchDataSource,
    testDataSource,
    clearDataSourceCache
  }
})

// 导出所有Store
export default {
  useStockListStore,
  useStockDetailStore,
  useStockQuoteStore,
  useStockSearchStore,
  useStockDataSourceStore
}