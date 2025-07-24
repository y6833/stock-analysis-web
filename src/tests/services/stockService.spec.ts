/**
 * StockService 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { stockService } from '@/services/stockService'
import { DataSourceFactory } from '@/services/dataSource/DataSourceFactory'
import { dataSourceStateManager } from '@/services/dataSourceStateManager'
import { smartCache } from '@/services/cacheService'

// Mock dependencies
vi.mock('@/services/dataSource/DataSourceFactory')
vi.mock('@/services/dataSourceStateManager')
vi.mock('@/services/cacheService')
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}))

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

describe('StockService', () => {
  const mockDataSource = {
    getName: vi.fn().mockReturnValue('MockDataSource'),
    getStocks: vi.fn(),
    getStockData: vi.fn(),
    searchStocks: vi.fn(),
    getStockQuote: vi.fn(),
    getFinancialNews: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mocks
    DataSourceFactory.createDataSource = vi.fn().mockReturnValue(mockDataSource)
    DataSourceFactory.getAvailableDataSources = vi.fn().mockReturnValue(['tushare', 'sina'])
    DataSourceFactory.getDataSourceInfo = vi.fn().mockReturnValue({ name: 'Test Source' })
    
    dataSourceStateManager.getCurrentDataSource = vi.fn().mockReturnValue('tushare')
    dataSourceStateManager.switchDataSource = vi.fn().mockReturnValue(true)
    
    smartCache.getOrSet = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getCurrentDataSourceType', () => {
    it('should return current data source type', () => {
      const result = stockService.getCurrentDataSourceType()
      expect(result).toBe('tushare')
      expect(dataSourceStateManager.getCurrentDataSource).toHaveBeenCalled()
    })
  })

  describe('getAvailableDataSources', () => {
    it('should return available data sources', () => {
      const result = stockService.getAvailableDataSources()
      expect(result).toEqual(['tushare', 'sina'])
      expect(DataSourceFactory.getAvailableDataSources).toHaveBeenCalled()
    })
  })

  describe('getDataSourceInfo', () => {
    it('should return data source info', () => {
      const result = stockService.getDataSourceInfo('tushare')
      expect(result).toEqual({ name: 'Test Source' })
      expect(DataSourceFactory.getDataSourceInfo).toHaveBeenCalledWith('tushare')
    })
  })

  describe('switchDataSource', () => {
    it('should switch data source successfully', () => {
      const result = stockService.switchDataSource('sina')
      expect(result).toBe(true)
      expect(dataSourceStateManager.switchDataSource).toHaveBeenCalledWith('sina')
    })

    it('should handle switch failure', () => {
      dataSourceStateManager.switchDataSource = vi.fn().mockReturnValue(false)
      
      const result = stockService.switchDataSource('sina')
      expect(result).toBe(false)
    })

    it('should handle switch error', () => {
      dataSourceStateManager.switchDataSource = vi.fn().mockImplementation(() => {
        throw new Error('Switch failed')
      })
      
      const result = stockService.switchDataSource('sina')
      expect(result).toBe(false)
    })
  })

  describe('testDataSource', () => {
    it('should test data source connection successfully', async () => {
      // Mock axios response
      const axios = await import('axios')
      axios.default.get = vi.fn().mockResolvedValue({
        data: { success: true }
      })

      const result = await stockService.testDataSource('tushare')
      expect(result).toBe(true)
    })

    it('should handle test failure', async () => {
      const axios = await import('axios')
      axios.default.get = vi.fn().mockRejectedValue(new Error('Connection failed'))

      const result = await stockService.testDataSource('tushare')
      expect(result).toBe(false)
    })

    it('should skip test for non-current data source', async () => {
      dataSourceStateManager.getCurrentDataSource = vi.fn().mockReturnValue('sina')
      
      const result = await stockService.testDataSource('tushare')
      expect(result).toBe(true) // Should return true for non-current sources
    })
  })

  describe('getStocks', () => {
    it('should get stocks from database successfully', async () => {
      const mockStocks = [
        { symbol: '000001', name: '平安银行' },
        { symbol: '000002', name: '万科A' }
      ]

      smartCache.getOrSet = vi.fn().mockResolvedValue({
        ...mockStocks,
        data_source: 'database',
        data_source_message: '数据来自数据库'
      })

      const result = await stockService.getStocks()
      expect(result).toEqual(expect.objectContaining({
        data_source: 'database'
      }))
      expect(smartCache.getOrSet).toHaveBeenCalled()
    })

    it('should fallback to external data source when database fails', async () => {
      const mockStocks = [
        { symbol: '000001', name: '平安银行' }
      ]

      // Mock database failure, then external source success
      smartCache.getOrSet = vi.fn().mockImplementation(async (key, fetchFn) => {
        return await fetchFn() // Execute the fetch function
      })

      // Mock axios to simulate database API failure, then external source success
      const axios = await import('axios')
      axios.default.get = vi.fn()
        .mockRejectedValueOnce(new Error('Database failed'))
        .mockResolvedValueOnce({
          data: { data: mockStocks }
        })

      mockDataSource.getStocks = vi.fn().mockResolvedValue(mockStocks)

      const result = await stockService.getStocks()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getStockData', () => {
    it('should get stock data from current data source', async () => {
      const mockStockData = {
        symbol: '000001',
        name: '平安银行',
        price: 10.5,
        history: []
      }

      mockDataSource.getStockData = vi.fn().mockResolvedValue(mockStockData)

      const result = await stockService.getStockData('000001')
      expect(result).toEqual({
        ...mockStockData,
        source_type: 'tushare'
      })
      expect(mockDataSource.getStockData).toHaveBeenCalledWith('000001', {
        sourceType: 'tushare'
      })
    })

    it('should fallback to other data sources on failure', async () => {
      const mockStockData = {
        symbol: '000001',
        name: '平安银行',
        price: 10.5
      }

      // First data source fails
      mockDataSource.getStockData = vi.fn().mockRejectedValue(new Error('Primary source failed'))

      // Create mock for fallback data source
      const fallbackDataSource = {
        getStockData: vi.fn().mockResolvedValue(mockStockData)
      }

      DataSourceFactory.createDataSource = vi.fn()
        .mockReturnValueOnce(mockDataSource) // Primary source
        .mockReturnValueOnce(fallbackDataSource) // Fallback source

      const result = await stockService.getStockData('000001')
      expect(result).toEqual({
        ...mockStockData,
        source_type: 'sina'
      })
    })

    it('should throw error when all data sources fail', async () => {
      mockDataSource.getStockData = vi.fn().mockRejectedValue(new Error('All sources failed'))
      DataSourceFactory.createDataSource = vi.fn().mockReturnValue(mockDataSource)

      await expect(stockService.getStockData('000001')).rejects.toThrow()
    })
  })

  describe('searchStocks', () => {
    it('should search stocks using database API first', async () => {
      const mockResults = [
        { symbol: '000001', name: '平安银行' }
      ]

      // Mock successful database search
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockResults
        })
      })

      const result = await stockService.searchStocks('平安')
      expect(result).toEqual(mockResults.map(stock => ({
        ...stock,
        source_type: 'database'
      })))
    })

    it('should fallback to external data source when database search fails', async () => {
      const mockResults = [
        { symbol: '000001', name: '平安银行' }
      ]

      // Mock database search failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Database search failed'))

      // Mock external data source success
      mockDataSource.searchStocks = vi.fn().mockResolvedValue(mockResults)

      const result = await stockService.searchStocks('平安')
      expect(result).toEqual(mockResults.map(stock => ({
        ...stock,
        source_type: 'tushare'
      })))
    })
  })

  describe('getStockQuote', () => {
    it('should get stock quote from backend API', async () => {
      const mockQuote = {
        symbol: '000001',
        price: 10.5,
        change: 0.1
      }

      const axios = await import('axios')
      axios.default.get = vi.fn().mockResolvedValue({
        data: mockQuote
      })

      const result = await stockService.getStockQuote('000001')
      expect(result).toEqual({
        ...mockQuote,
        source_type: 'tushare',
        symbol: '000001'
      })
    })

    it('should fallback to frontend data source when backend fails', async () => {
      const mockQuote = {
        symbol: '000001',
        price: 10.5,
        change: 0.1
      }

      // Mock backend failure
      const axios = await import('axios')
      axios.default.get = vi.fn().mockRejectedValue(new Error('Backend failed'))

      // Mock frontend data source success
      mockDataSource.getStockQuote = vi.fn().mockResolvedValue(mockQuote)

      const result = await stockService.getStockQuote('000001')
      expect(result).toEqual({
        ...mockQuote,
        source_type: 'tushare'
      })
    })
  })

  describe('getFinancialNews', () => {
    it('should get financial news from current data source', async () => {
      const mockNews = [
        {
          title: 'Test News',
          content: 'Test content',
          publishTime: '2023-01-01'
        }
      ]

      mockDataSource.getFinancialNews = vi.fn().mockResolvedValue(mockNews)

      const result = await stockService.getFinancialNews(5)
      expect(result).toEqual(mockNews.map(item => ({
        ...item,
        source_type: 'tushare',
        data_source: 'tushare'
      })))
    })

    it('should fallback to other data sources on failure', async () => {
      const mockNews = [
        {
          title: 'Test News',
          content: 'Test content'
        }
      ]

      // Primary source fails
      mockDataSource.getFinancialNews = vi.fn().mockRejectedValue(new Error('Primary failed'))

      // Fallback source succeeds
      const fallbackDataSource = {
        getFinancialNews: vi.fn().mockResolvedValue(mockNews)
      }

      DataSourceFactory.createDataSource = vi.fn()
        .mockReturnValueOnce(mockDataSource)
        .mockReturnValueOnce(fallbackDataSource)

      const result = await stockService.getFinancialNews(5)
      expect(result).toEqual(mockNews.map(item => ({
        ...item,
        source_type: 'sina',
        data_source: 'sina'
      })))
    })
  })

  describe('clearDataSourceCache', () => {
    it('should clear data source cache successfully', async () => {
      // Mock localStorage
      const mockLocalStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      }
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage
      })

      Object.keys = vi.fn().mockReturnValue(['tushare_test_key'])

      const axios = await import('axios')
      axios.default.delete = vi.fn().mockResolvedValue({
        data: { success: true, message: 'Cache cleared' }
      })

      const result = await stockService.clearDataSourceCache('tushare')
      expect(result).toBe(true)
    })

    it('should handle cache clear failure gracefully', async () => {
      const axios = await import('axios')
      axios.default.delete = vi.fn().mockRejectedValue(new Error('Clear failed'))

      const result = await stockService.clearDataSourceCache('tushare')
      expect(result).toBe(false)
    })
  })
})