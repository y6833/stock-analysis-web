import type DataSourceInterface from './DataSourceInterface'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'
import { yahooFinanceConfig, validateApiConfig } from '@/config/apiConfig'
import { createApiClient, ApiError } from '@/utils/apiRequest'

/**
 * Yahoo Finance API数据源实现
 * 广泛使用的免费股票API，提供美国和加拿大股票市场数据
 */
export class YahooFinanceDataSource implements DataSourceInterface {
  private readonly apiClient = createApiClient(yahooFinanceConfig)
  private readonly isFreeVersion = !yahooFinanceConfig.apiKey

  /**
   * 验证API配置
   */
  private validateConfig(): void {
    const validation = validateApiConfig('yahoo_finance')
    if (!validation.isValid && !this.isFreeVersion) {
      throw new ApiError(
        `Yahoo Finance API配置无效: 缺少 ${validation.missingFields.join(
          ', '
        )}。请检查环境变量配置。`,
        undefined,
        undefined,
        'yahoo_finance'
      )
    }
  }

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

      console.log('从Yahoo Finance获取股票列表数据')

      // 尝试通过后端代理获取股票列表
      try {
        const response = await axios.get(`${this.YAHOO_API_URL}/stock-list`)

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const stocks: Stock[] = response.data.data.map((item: any) => ({
            symbol: item.symbol,
            name: item.name || item.longName || item.shortName,
            market: item.market || item.exchange || '美国',
            industry: item.industry || item.sector || '未知',
          }))

          // 更新缓存
          this.stockListCache = stocks
          this.stockListCacheTime = Date.now()

          // 如果有消息，显示
          if (response.data.message) {
            console.log(`Yahoo Finance股票列表: ${response.data.message}`)
          }

          return stocks
        }
      } catch (proxyError) {
        console.warn('通过后端代理获取股票列表失败，使用预定义列表:', proxyError)
      }

      // 如果API调用失败，返回预定义的美股列表
      const fallbackStocks: Stock[] = [
        { symbol: 'AAPL', name: 'Apple Inc.', market: '纳斯达克', industry: '科技' },
        { symbol: 'MSFT', name: 'Microsoft Corporation', market: '纳斯达克', industry: '科技' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', market: '纳斯达克', industry: '科技' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', market: '纳斯达克', industry: '消费' },
        { symbol: 'TSLA', name: 'Tesla Inc.', market: '纳斯达克', industry: '汽车' },
        { symbol: 'NVDA', name: 'NVIDIA Corporation', market: '纳斯达克', industry: '科技' },
        { symbol: 'META', name: 'Meta Platforms Inc.', market: '纳斯达克', industry: '科技' },
        { symbol: 'BRK-B', name: 'Berkshire Hathaway Inc.', market: '纽交所', industry: '金融' },
      ]

      console.log('使用预定义美股列表')
      return fallbackStocks
    } catch (error) {
      console.error('Yahoo Finance获取股票列表失败:', error)
      throw error
    }
  }

  /**
   * 获取单个股票数据
   * @param symbol 股票代码
   */
  async getStockData(symbol: string): Promise<StockData> {
    try {
      console.log(`从Yahoo Finance获取股票${symbol}数据`)

      // 尝试通过后端代理获取股票数据
      try {
        const response = await axios.get(`${this.YAHOO_API_URL}/stock-data`, {
          params: { symbol },
        })

        // 检查响应
        if (response.data && response.data.success && response.data.data) {
          const data = response.data.data

          const stockData: StockData = {
            symbol: data.symbol || symbol,
            name: data.name || data.longName || data.shortName || '未知',
            price: parseFloat(data.regularMarketPrice || data.price) || 0,
            change: parseFloat(data.regularMarketChange || data.change) || 0,
            changePercent: parseFloat(data.regularMarketChangePercent || data.changePercent) || 0,
            volume: parseInt(data.regularMarketVolume || data.volume) || 0,
            turnover: parseFloat(data.marketCap) || 0,
            high: parseFloat(data.regularMarketDayHigh || data.high) || 0,
            low: parseFloat(data.regularMarketDayLow || data.low) || 0,
            open: parseFloat(data.regularMarketOpen || data.open) || 0,
            close: parseFloat(data.regularMarketPreviousClose || data.close) || 0,
            marketCap: parseFloat(data.marketCap) || 0,
            pe: parseFloat(data.trailingPE || data.pe) || 0,
            pb: parseFloat(data.priceToBook || data.pb) || 0,
            timestamp: data.timestamp || Date.now(),
          }

          // 如果有消息，显示
          if (response.data.message) {
            console.log(`Yahoo Finance股票数据: ${response.data.message}`)
          }

          return stockData
        }
      } catch (proxyError) {
        console.warn('通过后端代理获取股票数据失败，使用模拟数据:', proxyError)
      }

      // 如果API调用失败，返回模拟数据
      const mockData: StockData = {
        symbol,
        name: 'Yahoo Finance-模拟数据',
        price: 100.0 + Math.random() * 400,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        volume: Math.floor(Math.random() * 10000000),
        turnover: Math.floor(Math.random() * 1000000000),
        high: 100.0 + Math.random() * 400,
        low: 100.0 + Math.random() * 400,
        open: 100.0 + Math.random() * 400,
        close: 100.0 + Math.random() * 400,
        marketCap: Math.floor(Math.random() * 10000000000),
        pe: Math.random() * 30,
        pb: Math.random() * 5,
        timestamp: Date.now(),
      }

      console.log('使用模拟股票数据')
      return mockData
    } catch (error) {
      console.error(`Yahoo Finance获取股票${symbol}数据失败:`, error)
      throw error
    }
  }

  /**
   * 搜索股票
   * @param query 搜索关键词
   */
  async searchStocks(query: string): Promise<Stock[]> {
    try {
      console.log(`Yahoo Finance搜索股票: ${query}`)

      // 尝试通过后端代理搜索股票
      try {
        const response = await axios.get(`${this.YAHOO_API_URL}/search`, {
          params: { q: query },
        })

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const stocks = response.data.data.map((item: any) => ({
            symbol: item.symbol,
            name: item.name || item.longName || item.shortName,
            market: item.market || item.exchange || '美国',
            industry: item.industry || item.sector || '未知',
          }))

          // 如果有消息，显示
          if (response.data.message) {
            console.log(`Yahoo Finance搜索结果: ${response.data.message}`)
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
      console.error(`Yahoo Finance搜索股票失败:`, error)
      throw error
    }
  }

  /**
   * 获取股票实时行情
   * @param symbol 股票代码
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    try {
      console.log(`从Yahoo Finance获取股票${symbol}实时行情`)

      // 尝试通过后端代理获取实时行情
      try {
        const response = await axios.get(`${this.YAHOO_API_URL}/quote`, {
          params: { symbol },
        })

        // 检查响应
        if (response.data && response.data.success && response.data.data) {
          const data = response.data.data

          const quote: StockQuote = {
            symbol: data.symbol || symbol,
            name: data.name || data.longName || data.shortName || '未知',
            price: parseFloat(data.regularMarketPrice || data.price) || 0,
            change: parseFloat(data.regularMarketChange || data.change) || 0,
            changePercent: parseFloat(data.regularMarketChangePercent || data.changePercent) || 0,
            volume: parseInt(data.regularMarketVolume || data.volume) || 0,
            timestamp: data.timestamp || Date.now(),
          }

          // 如果有消息，显示
          if (response.data.message) {
            console.log(`Yahoo Finance实时行情: ${response.data.message}`)
          }

          return quote
        }
      } catch (proxyError) {
        console.warn('通过后端代理获取实时行情失败，使用模拟数据:', proxyError)
      }

      // 如果API调用失败，返回模拟数据
      const mockQuote: StockQuote = {
        symbol,
        name: 'Yahoo Finance-模拟行情',
        price: 100.0 + Math.random() * 400,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        volume: Math.floor(Math.random() * 10000000),
        timestamp: Date.now(),
      }

      console.log('使用模拟实时行情数据')
      return mockQuote
    } catch (error) {
      console.error(`Yahoo Finance获取股票${symbol}实时行情失败:`, error)
      throw error
    }
  }

  /**
   * 获取财经新闻
   * @param limit 新闻数量限制
   */
  async getFinancialNews(limit: number = 10): Promise<FinancialNews[]> {
    try {
      console.log(`从Yahoo Finance获取财经新闻，限制${limit}条`)

      // 尝试通过后端代理获取新闻
      try {
        const response = await axios.get(`${this.YAHOO_API_URL}/news`, {
          params: { limit },
        })

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const news = response.data.data.map((item: any) => ({
            id: item.uuid || item.id || Math.random().toString(),
            title: item.title,
            summary: item.summary || item.description || '',
            url: item.link || item.url || '#',
            publishTime: item.providerPublishTime || item.publishTime || Date.now(),
            source: item.publisher || 'Yahoo Finance',
          }))

          // 如果有消息，显示
          if (response.data.message) {
            console.log(`Yahoo Finance新闻: ${response.data.message}`)
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
          title: 'Yahoo Finance: 美股市场今日表现',
          summary: 'Yahoo Finance提供的美股市场实时数据和分析',
          url: '#',
          publishTime: Date.now(),
          source: 'Yahoo Finance',
        },
        {
          id: '2',
          title: 'Yahoo Finance: 科技股走势分析',
          summary: '科技股在本周表现强劲，投资者关注度持续上升',
          url: '#',
          publishTime: Date.now() - 3600000,
          source: 'Yahoo Finance',
        },
      ]

      console.log('使用模拟新闻数据')
      return mockNews.slice(0, limit)
    } catch (error) {
      console.error('Yahoo Finance获取财经新闻失败:', error)
      throw error
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('测试Yahoo Finance连接')

      // 尝试获取股票列表来测试连接
      const response = await axios.get(`${this.YAHOO_API_URL}/test`, {
        timeout: 5000,
      })

      if (response.status === 200) {
        console.log('Yahoo Finance连接测试成功')
        return true
      }

      return false
    } catch (error) {
      console.error('Yahoo Finance连接测试失败:', error)
      return false
    }
  }

  /**
   * 获取数据源名称
   */
  getName(): string {
    return 'Yahoo Finance API'
  }

  /**
   * 获取数据源描述
   */
  getDescription(): string {
    return '广泛使用的免费股票API，提供美国和加拿大股票市场数据'
  }
}
