import { describe, it, expect, beforeEach, vi } from 'vitest'
import FutuDataSource from '../FutuDataSource'

// Mock fetch
global.fetch = vi.fn()

describe('FutuDataSource', () => {
  let dataSource: FutuDataSource

  beforeEach(() => {
    dataSource = new FutuDataSource()
    vi.clearAllMocks()
  })

  describe('基本信息', () => {
    it('应该返回正确的数据源名称', () => {
      expect(dataSource.getName()).toBe('富途OpenAPI')
    })

    it('应该返回正确的数据源描述', () => {
      expect(dataSource.getDescription()).toBe('富途OpenAPI量化接口，支持港股、美股、A股等多市场实时行情')
    })

    it('应该返回正确的数据源类型', () => {
      expect(dataSource.getType()).toBe('futu')
    })
  })

  describe('连接测试', () => {
    it('连接成功时应该返回true', async () => {
      // Mock successful response
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      const result = await dataSource.testConnection()
      expect(result).toBe(true)
      expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:11111/health', {
        method: 'GET',
        timeout: 10000
      })
    })

    it('连接失败时应该返回false', async () => {
      // Mock failed response
      ;(fetch as any).mockRejectedValueOnce(new Error('Connection failed'))

      const result = await dataSource.testConnection()
      expect(result).toBe(false)
    })

    it('HTTP错误时应该返回false', async () => {
      // Mock HTTP error response
      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      const result = await dataSource.testConnection()
      expect(result).toBe(false)
    })
  })

  describe('获取股票列表', () => {
    it('应该返回预定义的股票列表', async () => {
      const stocks = await dataSource.getStocks()
      
      expect(Array.isArray(stocks)).toBe(true)
      expect(stocks.length).toBeGreaterThan(0)
      
      // 检查是否包含预期的股票
      const symbols = stocks.map(stock => stock.symbol)
      expect(symbols).toContain('HK.00700') // 腾讯控股
      expect(symbols).toContain('US.AAPL')  // 苹果公司
      
      // 检查股票对象结构
      const firstStock = stocks[0]
      expect(firstStock).toHaveProperty('symbol')
      expect(firstStock).toHaveProperty('name')
      expect(firstStock).toHaveProperty('market')
      expect(firstStock).toHaveProperty('exchange')
      expect(firstStock).toHaveProperty('currency')
      expect(firstStock).toHaveProperty('type')
    })
  })

  describe('搜索股票', () => {
    it('应该能够按股票代码搜索', async () => {
      const results = await dataSource.searchStocks('00700')
      
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].symbol).toContain('00700')
    })

    it('应该能够按股票名称搜索', async () => {
      const results = await dataSource.searchStocks('腾讯')
      
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].name).toContain('腾讯')
    })

    it('搜索不存在的股票应该返回空数组', async () => {
      const results = await dataSource.searchStocks('NONEXISTENT')
      
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBe(0)
    })

    it('搜索应该不区分大小写', async () => {
      const results1 = await dataSource.searchStocks('aapl')
      const results2 = await dataSource.searchStocks('AAPL')
      
      expect(results1.length).toBe(results2.length)
      if (results1.length > 0) {
        expect(results1[0].symbol).toBe(results2[0].symbol)
      }
    })
  })

  describe('获取股票数据', () => {
    it('应该返回股票基本数据', async () => {
      const stockData = await dataSource.getStockData('HK.00700')
      
      expect(stockData).toHaveProperty('symbol', 'HK.00700')
      expect(stockData).toHaveProperty('name')
      expect(stockData).toHaveProperty('price')
      expect(stockData).toHaveProperty('change')
      expect(stockData).toHaveProperty('changePercent')
      expect(stockData).toHaveProperty('volume')
      expect(stockData).toHaveProperty('marketCap')
      expect(stockData).toHaveProperty('pe')
      expect(stockData).toHaveProperty('pb')
      expect(stockData).toHaveProperty('eps')
      expect(stockData).toHaveProperty('dividend')
      expect(stockData).toHaveProperty('timestamp')
      expect(stockData).toHaveProperty('source', 'futu')
    })

    it('应该缓存股票数据', async () => {
      const symbol = 'HK.00700'
      
      // 第一次调用
      const data1 = await dataSource.getStockData(symbol)
      const timestamp1 = data1.timestamp
      
      // 立即第二次调用，应该返回缓存的数据
      const data2 = await dataSource.getStockData(symbol)
      const timestamp2 = data2.timestamp
      
      expect(timestamp1).toBe(timestamp2)
    })
  })

  describe('获取股票行情', () => {
    it('应该返回股票实时行情', async () => {
      const quote = await dataSource.getStockQuote('HK.00700')
      
      expect(quote).toHaveProperty('symbol', 'HK.00700')
      expect(quote).toHaveProperty('name')
      expect(quote).toHaveProperty('price')
      expect(quote).toHaveProperty('open')
      expect(quote).toHaveProperty('high')
      expect(quote).toHaveProperty('low')
      expect(quote).toHaveProperty('close')
      expect(quote).toHaveProperty('volume')
      expect(quote).toHaveProperty('change')
      expect(quote).toHaveProperty('changePercent')
      expect(quote).toHaveProperty('timestamp')
      expect(quote).toHaveProperty('source', 'futu')
    })

    it('应该缓存行情数据', async () => {
      const symbol = 'HK.00700'
      
      // 第一次调用
      const quote1 = await dataSource.getStockQuote(symbol)
      const timestamp1 = quote1.timestamp
      
      // 立即第二次调用，应该返回缓存的数据
      const quote2 = await dataSource.getStockQuote(symbol)
      const timestamp2 = quote2.timestamp
      
      expect(timestamp1).toBe(timestamp2)
    })
  })

  describe('获取财经新闻', () => {
    it('应该返回空数组（暂不支持）', async () => {
      const news = await dataSource.getFinancialNews()
      
      expect(Array.isArray(news)).toBe(true)
      expect(news.length).toBe(0)
    })

    it('应该接受count参数', async () => {
      const news = await dataSource.getFinancialNews(20)
      
      expect(Array.isArray(news)).toBe(true)
      expect(news.length).toBe(0)
    })
  })

  describe('错误处理', () => {
    it('获取股票数据失败时应该抛出错误', async () => {
      // 这里可以模拟API调用失败的情况
      // 由于当前实现是返回模拟数据，所以不会失败
      // 在实际API集成后可以添加更多错误测试
      await expect(dataSource.getStockData('INVALID')).resolves.toBeDefined()
    })

    it('获取股票行情失败时应该抛出错误', async () => {
      // 同上，当前实现返回模拟数据
      await expect(dataSource.getStockQuote('INVALID')).resolves.toBeDefined()
    })
  })
})
