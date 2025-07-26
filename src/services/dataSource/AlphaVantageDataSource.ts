import type DataSourceInterface from './DataSourceInterface'
import axios from 'axios'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'

/**
 * Alpha Vantage数据源实现
 * 官方API，支持全球市场，包含A股数据
 */
export class AlphaVantageDataSource implements DataSourceInterface {
  private readonly name = 'alphavantage'
  private readonly displayName = 'Alpha Vantage'

  // Alpha Vantage API配置
  private readonly BASE_URL = 'https://www.alphavantage.co/query'
  private readonly API_KEY = 'UZMT16NQOTELC1O7' // 提供的API Key

  // 请求配置
  private readonly timeout = 15000
  private readonly headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }

  // 缓存和限流
  private stockListCache: Stock[] | null = null
  private stockListCacheTime: number = 0
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24小时
  private lastRequestTime: number = 0
  private readonly REQUEST_INTERVAL = 12000 // 12秒间隔，避免超过免费限制

  /**
   * 请求限流控制
   */
  private async rateLimitDelay(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < this.REQUEST_INTERVAL) {
      const delay = this.REQUEST_INTERVAL - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    this.lastRequestTime = Date.now()
  }

  /**
   * 格式化股票代码为Alpha Vantage格式
   * 000001.SZ -> 000001.SHZ
   * 600000.SH -> 600000.SHG
   */
  private formatSymbolForAlphaVantage(symbol: string): string {
    if (symbol.includes('.')) {
      const [code, market] = symbol.split('.')
      if (market === 'SZ') {
        return `${code}.SHZ` // 深圳
      } else if (market === 'SH') {
        return `${code}.SHG` // 上海
      }
    }
    return symbol
  }

  /**
   * 发送API请求
   */
  private async makeRequest(params: Record<string, string>): Promise<any> {
    await this.rateLimitDelay()

    const requestParams = {
      ...params,
      apikey: this.API_KEY
    }

    const response = await axios.get(this.BASE_URL, {
      params: requestParams,
      timeout: this.timeout,
      headers: this.headers
    })

    // 检查API限制
    if (response.data && response.data['Error Message']) {
      throw new Error(`Alpha Vantage API错误: ${response.data['Error Message']}`)
    }

    if (response.data && response.data['Note']) {
      throw new Error('API调用频率超限，请稍后重试')
    }

    return response.data
  }

  /**
   * 获取股票列表
   */
  async getStocks(): Promise<Stock[]> {
    try {
      // 检查缓存
      if (this.stockListCache && Date.now() - this.stockListCacheTime < this.CACHE_DURATION) {
        return this.stockListCache
      }

      // Alpha Vantage没有直接的股票列表API，返回空数组而不是硬编码数据
      console.warn('Alpha Vantage数据源：没有股票列表API，返回空结果');
      return [];

      return stocks
    } catch (error) {
      throw new Error(`Alpha Vantage股票列表获取失败: ${error.message}`)
    }
  }

  /**
   * 获取股票实时行情
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    try {
      const alphaSymbol = this.formatSymbolForAlphaVantage(symbol)

      const data = await this.makeRequest({
        function: 'GLOBAL_QUOTE',
        symbol: alphaSymbol
      })

      const quote = data['Global Quote']
      if (!quote) {
        throw new Error('行情数据不存在')
      }

      const result: StockQuote = {
        symbol: symbol,
        name: '', // Alpha Vantage不直接提供公司名称
        price: parseFloat(quote['05. price']) || 0,
        change: parseFloat(quote['09. change']) || 0,
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')) || 0,
        open: parseFloat(quote['02. open']) || 0,
        high: parseFloat(quote['03. high']) || 0,
        low: parseFloat(quote['04. low']) || 0,
        volume: parseInt(quote['06. volume']) || 0,
        amount: 0, // Alpha Vantage不直接提供成交额
        turnover: 0,
        pe: 0,
        pb: 0,
        marketCap: 0,
        timestamp: new Date().toISOString(),
        preClose: parseFloat(quote['08. previous close']) || 0
      }

      return result
    } catch (error) {
      throw new Error(`Alpha Vantage行情获取失败: ${error.message}`)
    }
  }

  /**
   * 获取股票历史数据
   */
  async getStockHistory(symbol: string, period: string = 'day', startDate?: string, endDate?: string): Promise<StockData[]> {
    try {
      const alphaSymbol = this.formatSymbolForAlphaVantage(symbol)

      // 根据周期选择API函数
      let functionName = 'TIME_SERIES_DAILY'
      if (period === 'week') {
        functionName = 'TIME_SERIES_WEEKLY'
      } else if (period === 'month') {
        functionName = 'TIME_SERIES_MONTHLY'
      }

      const data = await this.makeRequest({
        function: functionName,
        symbol: alphaSymbol,
        outputsize: 'full' // 获取完整历史数据
      })

      // 根据函数类型获取时间序列数据
      let timeSeriesKey = 'Time Series (Daily)'
      if (period === 'week') {
        timeSeriesKey = 'Weekly Time Series'
      } else if (period === 'month') {
        timeSeriesKey = 'Monthly Time Series'
      }

      const timeSeries = data[timeSeriesKey]
      if (!timeSeries) {
        throw new Error('历史数据不存在')
      }

      const stockData: StockData[] = []

      for (const [date, values] of Object.entries(timeSeries)) {
        // 日期过滤
        if (startDate && date < startDate) continue
        if (endDate && date > endDate) continue

        const dayData = values as any

        stockData.push({
          date: date,
          open: parseFloat(dayData['1. open']) || 0,
          close: parseFloat(dayData['4. close']) || 0,
          high: parseFloat(dayData['2. high']) || 0,
          low: parseFloat(dayData['3. low']) || 0,
          volume: parseInt(dayData['5. volume']) || 0,
          amount: 0, // Alpha Vantage不提供成交额
          symbol: symbol
        })
      }

      // 按日期排序
      return stockData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    } catch (error) {
      throw new Error(`Alpha Vantage历史数据获取失败: ${error.message}`)
    }
  }

  /**
   * 搜索股票
   */
  async searchStocks(keyword: string): Promise<Stock[]> {
    try {
      // 使用Alpha Vantage的搜索功能
      const data = await this.makeRequest({
        function: 'SYMBOL_SEARCH',
        keywords: keyword
      })

      const matches = data['bestMatches']
      if (!matches || !Array.isArray(matches)) {
        return []
      }

      return matches.slice(0, 10).map((match: any) => ({
        symbol: match['1. symbol'],
        name: match['2. name'],
        market: match['4. region'] === 'China' ?
          (match['1. symbol'].includes('SHG') ? 'SH' : 'SZ') :
          match['4. region'],
        listDate: '',
        industry: match['3. type'] || '',
        area: match['4. region'] || ''
      }))
    } catch (error) {
      // 如果搜索失败，从本地列表搜索
      const stocks = await this.getStocks()
      return stocks.filter(stock =>
        stock.symbol.includes(keyword.toUpperCase()) ||
        stock.name.includes(keyword)
      )
    }
  }

  /**
   * 获取财经新闻
   */
  async getNews(limit: number = 20): Promise<FinancialNews[]> {
    try {
      // Alpha Vantage提供新闻API
      const data = await this.makeRequest({
        function: 'NEWS_SENTIMENT',
        limit: limit.toString()
      })

      const feed = data.feed
      if (!feed || !Array.isArray(feed)) {
        return []
      }

      return feed.map((item: any, index: number) => ({
        id: index.toString(),
        title: item.title || '',
        summary: item.summary || '',
        content: item.summary || '',
        publishTime: item.time_published || new Date().toISOString(),
        source: item.source || 'Alpha Vantage',
        url: item.url || ''
      }))
    } catch (error) {
      throw new Error(`Alpha Vantage新闻获取失败: ${error.message}`)
    }
  }

  /**
   * 获取数据源信息
   */
  getSourceInfo() {
    return {
      name: this.name,
      displayName: this.displayName,
      description: 'Alpha Vantage官方API，支持全球市场数据',
      features: ['全球市场', '官方API', '技术指标', '新闻数据'],
      limitations: ['需要API Key', '免费版每天500次调用', '调用间隔12秒'],
      rateLimit: '免费版：每天500次，每分钟5次',
      cost: '免费版有限制，付费版无限制',
      strengths: ['官方支持', '数据准确', '全球覆盖', '功能丰富']
    }
  }

  /**
   * 获取数据源名称
   */
  getName(): string {
    return this.displayName
  }

  /**
   * 获取数据源描述
   */
  getDescription(): string {
    return 'Alpha Vantage官方API，支持全球市场数据'
  }

  /**
   * 获取数据源类型
   */
  getType(): any {
    return 'alphavantage'
  }

  /**
   * 测试数据源连接
   */
  async testConnection(): Promise<boolean> {
    try {
      // 测试获取股票行情
      const testSymbol = 'AAPL' // 苹果公司，Alpha Vantage对美股支持最好
      const quote = await this.getStockQuote(testSymbol)

      // 检查返回的数据是否有效
      return !!(quote && quote.symbol && quote.price > 0)
    } catch (error) {
      console.error('Alpha Vantage连接测试失败:', error)
      return false
    }
  }

  /**
   * 获取股票数据（兼容接口）
   */
  async getStockData(symbol: string): Promise<any> {
    // 返回历史数据的最新一条记录
    const history = await this.getStockHistory(symbol, 'day')
    return history.length > 0 ? history[history.length - 1] : null
  }

  /**
   * 获取财经新闻（兼容接口）
   */
  async getFinancialNews(count: number = 20): Promise<any[]> {
    return await this.getNews(count)
  }
}

export default AlphaVantageDataSource
