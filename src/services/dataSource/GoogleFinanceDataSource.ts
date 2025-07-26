import type DataSourceInterface from './DataSourceInterface'
import axios from 'axios'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'

/**
 * Google Finance API数据源实现
 * 谷歌提供的免费股票API，支持全球多个股票市场
 */
export class GoogleFinanceDataSource implements DataSourceInterface {
  // Google Finance API基础URL
  private readonly GOOGLE_API_URL = '/api/google-finance'

  // 缓存
  private stockListCache: Stock[] | null = null
  private stockListCacheTime: number = 0
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24小时

  /**
   * 获取股票列表
   */
  async getStocks(): Promise<Stock[]> {
    try {
      // 检查缓存
      if (this.stockListCache && Date.now() - this.stockListCacheTime < this.CACHE_DURATION) {
        console.log('使用缓存的股票列表数据')
        return this.stockListCache
      }

      console.log('从Google Finance获取股票列表数据')

      // 尝试通过后端代理获取股票列表
      try {
        const response = await axios.get(`${this.GOOGLE_API_URL}/stock-list`)

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const stocks: Stock[] = response.data.data.map((item: any) => ({
            symbol: item.symbol || item.ticker,
            name: item.name || item.companyName,
            market: item.market || item.exchange || '全球',
            industry: item.industry || item.sector || '未知',
          }))

          // 更新缓存
          this.stockListCache = stocks
          this.stockListCacheTime = Date.now()

          // 如果有消息，显示
          if (response.data.message) {
            console.log(`Google Finance股票列表: ${response.data.message}`)
          }

          return stocks
        }
      } catch (proxyError) {
        console.warn('通过后端代理获取股票列表失败，使用预定义列表:', proxyError)
      }

      // 如果API调用失败，返回空数组而不是硬编码数据
      console.warn('Google Finance数据源：API调用失败，返回空结果');
      return [];

      console.log('使用预定义全球股票列表')
      return fallbackStocks
    } catch (error) {
      console.error('Google Finance获取股票列表失败:', error)
      throw error
    }
  }

  /**
   * 获取单个股票数据
   * @param symbol 股票代码
   */
  async getStockData(symbol: string): Promise<StockData> {
    try {
      console.log(`从Google Finance获取股票${symbol}数据`)

      // 尝试通过后端代理获取股票数据
      try {
        const response = await axios.get(`${this.GOOGLE_API_URL}/stock-data`, {
          params: { symbol }
        })

        // 检查响应
        if (response.data && response.data.success && response.data.data) {
          const data = response.data.data

          const stockData: StockData = {
            symbol: data.symbol || symbol,
            name: data.name || data.companyName || '未知',
            price: parseFloat(data.price || data.currentPrice) || 0,
            change: parseFloat(data.change || data.priceChange) || 0,
            changePercent: parseFloat(data.changePercent || data.percentChange) || 0,
            volume: parseInt(data.volume || data.tradingVolume) || 0,
            turnover: parseFloat(data.marketCap) || 0,
            high: parseFloat(data.high || data.dayHigh) || 0,
            low: parseFloat(data.low || data.dayLow) || 0,
            open: parseFloat(data.open || data.openPrice) || 0,
            close: parseFloat(data.close || data.previousClose) || 0,
            marketCap: parseFloat(data.marketCap) || 0,
            pe: parseFloat(data.pe || data.peRatio) || 0,
            pb: parseFloat(data.pb || data.pbRatio) || 0,
            timestamp: data.timestamp || Date.now(),
          }

          // 如果有消息，显示
          if (response.data.message) {
            console.log(`Google Finance股票数据: ${response.data.message}`)
          }

          return stockData
        }
      } catch (proxyError) {
        console.warn('通过后端代理获取股票数据失败，使用模拟数据:', proxyError)
      }

      // 不再返回模拟数据，直接抛出错误
      throw new Error(`Google Finance API调用失败，无法获取股票${symbol}的数据`)
    } catch (error) {
      console.error(`Google Finance获取股票${symbol}数据失败:`, error)
      throw error
    }
  }

  /**
   * 搜索股票
   * @param query 搜索关键词
   */
  async searchStocks(query: string): Promise<Stock[]> {
    try {
      console.log(`Google Finance搜索股票: ${query}`)

      // 尝试通过后端代理搜索股票
      try {
        const response = await axios.get(`${this.GOOGLE_API_URL}/search`, {
          params: { q: query }
        })

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const stocks = response.data.data.map((item: any) => ({
            symbol: item.symbol || item.ticker,
            name: item.name || item.companyName,
            market: item.market || item.exchange || '全球',
            industry: item.industry || item.sector || '未知',
          }))

          // 如果有消息，显示
          if (response.data.message) {
            console.log(`Google Finance搜索结果: ${response.data.message}`)
          }

          return stocks
        }
      } catch (proxyError) {
        console.warn('通过后端代理搜索股票失败，使用本地过滤:', proxyError)
      }

      // 如果API调用失败，从本地股票列表中过滤
      const allStocks = await this.getStocks()
      const filteredStocks = allStocks.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
          stock.name.toLowerCase().includes(query.toLowerCase())
      )

      console.log(`本地过滤搜索结果: ${filteredStocks.length}条`)
      return filteredStocks
    } catch (error) {
      console.error(`Google Finance搜索股票失败:`, error)
      throw error
    }
  }

  /**
   * 获取股票实时行情
   * @param symbol 股票代码
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    try {
      console.log(`从Google Finance获取股票${symbol}实时行情`)

      // 尝试通过后端代理获取实时行情
      try {
        const response = await axios.get(`${this.GOOGLE_API_URL}/quote`, {
          params: { symbol }
        })

        // 检查响应
        if (response.data && response.data.success && response.data.data) {
          const data = response.data.data

          const quote: StockQuote = {
            symbol: data.symbol || symbol,
            name: data.name || data.companyName || '未知',
            price: parseFloat(data.price || data.currentPrice) || 0,
            change: parseFloat(data.change || data.priceChange) || 0,
            changePercent: parseFloat(data.changePercent || data.percentChange) || 0,
            volume: parseInt(data.volume || data.tradingVolume) || 0,
            timestamp: data.timestamp || Date.now(),
          }

          // 如果有消息，显示
          if (response.data.message) {
            console.log(`Google Finance实时行情: ${response.data.message}`)
          }

          return quote
        }
      } catch (proxyError) {
        console.warn('通过后端代理获取实时行情失败，使用模拟数据:', proxyError)
      }

      // 如果API调用失败，返回模拟数据
      const mockQuote: StockQuote = {
        symbol,
        name: 'Google Finance-模拟行情',
        price: 50.00 + Math.random() * 200,
        change: (Math.random() - 0.5) * 8,
        changePercent: (Math.random() - 0.5) * 6,
        volume: Math.floor(Math.random() * 5000000),
        timestamp: Date.now(),
      }

      console.log('使用模拟实时行情数据')
      return mockQuote
    } catch (error) {
      console.error(`Google Finance获取股票${symbol}实时行情失败:`, error)
      throw error
    }
  }

  /**
   * 获取财经新闻
   * @param limit 新闻数量限制
   */
  async getFinancialNews(limit: number = 10): Promise<FinancialNews[]> {
    try {
      console.log(`从Google Finance获取财经新闻，限制${limit}条`)

      // 尝试通过后端代理获取新闻
      try {
        const response = await axios.get(`${this.GOOGLE_API_URL}/news`, {
          params: { limit }
        })

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const news = response.data.data.map((item: any) => ({
            id: item.id || Math.random().toString(),
            title: item.title,
            summary: item.summary || item.snippet || '',
            url: item.url || item.link || '#',
            publishTime: item.publishTime || item.timestamp || Date.now(),
            source: item.source || 'Google Finance',
          }))

          // 如果有消息，显示
          if (response.data.message) {
            console.log(`Google Finance新闻: ${response.data.message}`)
          }

          return news.slice(0, limit)
        }
      } catch (proxyError) {
        console.warn('通过后端代理获取新闻失败，使用模拟数据:', proxyError)
      }

      // 如果API调用失败，返回模拟新闻
      const mockNews: FinancialNews[] = [
        {
          id: '1',
          title: 'Google Finance: 全球股市今日动态',
          summary: 'Google Finance提供的全球股市实时数据和技术指标分析',
          url: '#',
          publishTime: Date.now(),
          source: 'Google Finance',
        },
        {
          id: '2',
          title: 'Google Finance: 新兴市场投资机会',
          summary: '新兴市场在本季度表现活跃，投资者关注度不断提升',
          url: '#',
          publishTime: Date.now() - 7200000,
          source: 'Google Finance',
        },
      ]

      console.log('使用模拟新闻数据')
      return mockNews.slice(0, limit)
    } catch (error) {
      console.error('Google Finance获取财经新闻失败:', error)
      throw error
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('测试Google Finance连接')

      // 尝试获取股票列表来测试连接
      const response = await axios.get(`${this.GOOGLE_API_URL}/test`, {
        timeout: 5000
      })

      if (response.status === 200) {
        console.log('Google Finance连接测试成功')
        return true
      }

      return false
    } catch (error) {
      console.error('Google Finance连接测试失败:', error)
      return false
    }
  }

  /**
   * 获取数据源名称
   */
  getName(): string {
    return 'Google Finance API'
  }

  /**
   * 获取数据源描述
   */
  getDescription(): string {
    return '谷歌提供的免费股票API，支持全球多个股票市场'
  }
}
