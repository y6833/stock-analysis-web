import type DataSourceInterface from './DataSourceInterface'
import axios from 'axios'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'

/**
 * 东方财富数据源实现
 */
export class EastMoneyDataSource implements DataSourceInterface {
  // 东方财富API基础URL
  private readonly EASTMONEY_API_URL = '/api/eastmoney'
  private readonly EASTMONEY_FINANCE_URL = 'https://finance.eastmoney.com'

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
        return this.stockListCache
      }

      // 尝试通过后端代理获取股票列表
      try {
        const response = await axios.get(`${this.EASTMONEY_API_URL}/stock-list`)

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const stocks: Stock[] = response.data.data.map((item: any) => ({
            symbol: item.symbol,
            name: item.name,
            market: item.market || (item.symbol.includes('SH') ? '上海' : '深圳'),
            industry: item.industry || '未知'
          }))

          // 更新缓存
          this.stockListCache = stocks
          this.stockListCacheTime = Date.now()

          return stocks
        }
      } catch (proxyError) {
        console.warn('通过后端代理获取股票列表失败，使用预定义列表:', proxyError)
      }

      // 如果后端代理未实现或返回格式不正确，使用预定义的主要股票列表
      const mainStocks: Stock[] = [
        { symbol: '000001.SH', name: '上证指数', market: '上海', industry: '指数' },
        { symbol: '399001.SZ', name: '深证成指', market: '深圳', industry: '指数' },
        { symbol: '600519.SH', name: '贵州茅台', market: '上海', industry: '白酒' },
        { symbol: '601318.SH', name: '中国平安', market: '上海', industry: '保险' },
        { symbol: '600036.SH', name: '招商银行', market: '上海', industry: '银行' },
        { symbol: '000858.SZ', name: '五粮液', market: '深圳', industry: '白酒' },
        { symbol: '000333.SZ', name: '美的集团', market: '深圳', industry: '家电' },
        { symbol: '601166.SH', name: '兴业银行', market: '上海', industry: '银行' },
        { symbol: '002415.SZ', name: '海康威视', market: '深圳', industry: '电子' },
        { symbol: '600276.SH', name: '恒瑞医药', market: '上海', industry: '医药' },
        { symbol: '601398.SH', name: '工商银行', market: '上海', industry: '银行' },
        { symbol: '600000.SH', name: '浦发银行', market: '上海', industry: '银行' },
        { symbol: '000001.SZ', name: '平安银行', market: '深圳', industry: '银行' },
        // 可以添加更多股票
      ]

      // 更新缓存
      this.stockListCache = mainStocks
      this.stockListCacheTime = Date.now()

      return mainStocks
    } catch (error) {
      console.error('东方财富获取股票列表失败:', error)
      throw error
    }
  }

  /**
   * 获取单个股票数据
   * @param symbol 股票代码
   */
  async getStockData(symbol: string): Promise<StockData> {
    try {
      // 确保股票代码格式正确
      const formattedSymbol = this.formatSymbol(symbol)

      // 尝试通过后端代理获取历史数据
      try {
        const response = await axios.get(`${this.EASTMONEY_API_URL}/history`, {
          params: {
            symbol: formattedSymbol,
            period: 'daily',
            count: 180
          }
        })

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const historyData = response.data.data

          const dates: string[] = []
          const prices: number[] = []
          const volumes: number[] = []

          historyData.forEach((item: any) => {
            dates.push(item.date)
            prices.push(parseFloat(item.close))
            volumes.push(parseInt(item.volume))
          })

          return {
            symbol,
            dates,
            prices,
            volumes,
            high: Math.max(...prices),
            low: Math.min(...prices),
            open: prices[0],
            close: prices[prices.length - 1],
          }
        }
      } catch (proxyError) {
        console.warn(`通过后端代理获取股票${symbol}历史数据失败，使用模拟数据:`, proxyError)
      }

      // 如果后端代理未实现或返回格式不正确，使用模拟数据
      const today = new Date()
      const dates: string[] = []
      const prices: number[] = []
      const volumes: number[] = []

      // 获取实时行情作为基准价格
      const quote = await this.getStockQuote(symbol)
      let basePrice = quote.price

      // 模拟历史数据生成已移除
      throw new Error(`东方财富历史数据API尚未实现，无法获取股票${symbol}的历史数据`)

      return {
        symbol,
        dates,
        prices,
        volumes,
        high: Math.max(...prices),
        low: Math.min(...prices),
        open: prices[0],
        close: prices[prices.length - 1],
      }
    } catch (error) {
      console.error(`东方财富获取股票${symbol}数据失败:`, error)
      throw error
    }
  }

  /**
   * 搜索股票
   * @param query 搜索关键词
   */
  async searchStocks(query: string): Promise<Stock[]> {
    try {
      // 尝试通过后端代理搜索股票
      try {
        const response = await axios.get(`${this.EASTMONEY_API_URL}/search`, {
          params: {
            keyword: query
          }
        })

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          return response.data.data.map((item: any) => ({
            symbol: item.symbol,
            name: item.name,
            market: item.market || (item.symbol.includes('SH') ? '上海' : '深圳'),
            industry: item.industry || '未知'
          }))
        }
      } catch (proxyError) {
        console.warn('通过后端代理搜索股票失败，使用本地过滤:', proxyError)
      }

      // 如果后端代理未实现或返回格式不正确，使用本地过滤
      const allStocks = await this.getStocks()

      // 在本地过滤
      return allStocks.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
          stock.name.toLowerCase().includes(query.toLowerCase())
      )
    } catch (error) {
      console.error('东方财富搜索股票失败:', error)
      throw error
    }
  }

  /**
   * 获取股票实时行情
   * @param symbol 股票代码
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    try {
      // 确保股票代码格式正确
      const formattedSymbol = this.formatSymbol(symbol)

      // 通过后端代理请求东方财富API
      const response = await axios.get(`${this.EASTMONEY_API_URL}/quote`, {
        params: {
          symbol: formattedSymbol
        }
      })

      // 检查响应
      if (response.data && response.data.success && response.data.data) {
        const data = response.data.data

        // 直接使用后端返回的解析好的数据
        const stockName = data.name
        const open = parseFloat(data.open)
        const preClose = parseFloat(data.pre_close)
        const price = parseFloat(data.price)
        const high = parseFloat(data.high)
        const low = parseFloat(data.low)
        const volume = parseInt(data.volume)
        const amount = parseFloat(data.amount)

        // 计算涨跌幅
        const change = price - preClose
        const pctChg = (change / preClose) * 100

        return {
          symbol,
          name: stockName,
          price,
          open,
          high,
          low,
          close: price,
          pre_close: preClose,
          change,
          pct_chg: pctChg,
          vol: volume,
          amount,
          update_time: new Date().toISOString(),
        }
      }

      // 模拟数据已移除 - 抛出错误
      throw new Error(`东方财富数据源获取股票${symbol}行情失败，请检查API配置或网络连接`)
    } catch (error) {
      console.error(`东方财富获取股票${symbol}行情失败:`, error)
      // 不再使用模拟数据，直接抛出错误
      throw new Error(`东方财富API调用失败，无法获取股票${symbol}的行情数据`)
    }
  }

  /**
   * 获取财经新闻
   * @param count 新闻数量
   */
  async getFinancialNews(count: number = 5): Promise<FinancialNews[]> {
    try {
      // 尝试通过后端代理获取财经新闻
      try {
        const response = await axios.get(`${this.EASTMONEY_API_URL}/news`, {
          params: {
            count
          }
        })

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const news: FinancialNews[] = response.data.data.map((item: any) => ({
            title: item.title,
            time: item.time,
            source: item.source || '东方财富',
            url: item.url || `${this.EASTMONEY_FINANCE_URL}/news/`,
            important: item.important || false,
            content: item.content || ''
          }))

          return news
        }
      } catch (proxyError) {
        console.error('通过后端代理获取财经新闻失败:', proxyError)
        throw new Error('东方财富财经新闻API调用失败，请检查API配置或网络连接')
      }

      // 模拟数据已移除 - 抛出错误
      throw new Error('东方财富财经新闻数据获取失败，请检查API配置')
    } catch (error) {
      console.error('东方财富获取财经新闻失败:', error)
      throw error
    }
  }

  /**
   * 获取数据源名称
   */
  getName(): string {
    return '东方财富'
  }

  /**
   * 获取数据源描述
   */
  getDescription(): string {
    return '提供行情、K线等数据，数据丰富，更新及时'
  }

  /**
   * 测试数据源连接
   */
  async testConnection(): Promise<boolean> {
    try {
      // 尝试通过后端代理测试连接
      const response = await axios.get(`${this.EASTMONEY_API_URL}/test`)

      // 检查响应
      if (response.data && response.data.success) {
        return true
      }

      // 如果后端代理未实现测试接口，尝试获取上证指数行情
      await this.getStockQuote('000001.SH')
      return true
    } catch (error) {
      console.error('东方财富数据源连接测试失败:', error)
      return false
    }
  }

  /**
   * 格式化股票代码
   * @param symbol 股票代码
   * @returns 格式化后的股票代码
   */
  private formatSymbol(symbol: string): string {
    // 如果已经包含.SH或.SZ后缀，直接返回
    if (symbol.endsWith('.SH') || symbol.endsWith('.SZ')) {
      return symbol
    }

    // 如果包含sh或sz前缀，转换为.SH或.SZ后缀
    if (symbol.startsWith('sh')) {
      return symbol.slice(2) + '.SH'
    }
    if (symbol.startsWith('sz')) {
      return symbol.slice(2) + '.SZ'
    }

    // 根据股票代码规则添加后缀
    if (symbol.startsWith('6')) {
      return symbol + '.SH'
    } else if (symbol.startsWith('0') || symbol.startsWith('3')) {
      return symbol + '.SZ'
    } else if (symbol.startsWith('4') || symbol.startsWith('8')) {
      return symbol + '.BJ' // 北交所
    }

    // 默认返回原始代码
    return symbol
  }

  /**
   * 模拟股票行情生成函数已移除
   * 现在只使用真实数据源
   */

  /**
   * 获取股票基本信息
   * @param symbol 股票代码
   * @returns 股票基本信息
   */
  private getStockInfo(symbol: string): Stock {
    // 尝试从缓存中获取
    if (this.stockListCache) {
      const stock = this.stockListCache.find(s => s.symbol === symbol)
      if (stock) {
        return stock
      }
    }

    // 如果缓存中没有，返回默认信息
    return {
      symbol,
      name: '未知股票',
      market: symbol.includes('SH') ? '上海' : (symbol.includes('SZ') ? '深圳' : '未知'),
      industry: '未知',
    }
  }
}
