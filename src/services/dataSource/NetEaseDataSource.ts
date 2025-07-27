import type DataSourceInterface from './DataSourceInterface'
import axios from 'axios'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'
import type { DataSourceType } from './DataSourceFactory'

/**
 * 网易财经数据源实现
 */
export class NetEaseDataSource implements DataSourceInterface {
  // 网易财经API基础URL
  private readonly NETEASE_API_URL = '/api/netease'
  private readonly NETEASE_FINANCE_URL = 'https://money.163.com'

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
        const response = await axios.get(`${this.NETEASE_API_URL}/stock-list`)

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const stocks: Stock[] = response.data.data.map((item: any) => ({
            symbol: item.symbol,
            name: item.name,
            market: item.market || (item.symbol.includes('0') ? '上海' : '深圳'),
            industry: item.industry || '未知'
          }))

          // 更新缓存
          this.stockListCache = stocks
          this.stockListCacheTime = Date.now()

          return stocks
        }
      } catch (proxyError) {
        console.warn('通过后端代理获取股票列表失败:', proxyError)
      }

      // 如果后端代理未实现或返回格式不正确，抛出错误
      throw new Error('网易财经数据源获取股票列表失败，API不可用')
    } catch (error) {
      console.error('网易财经获取股票列表失败:', error)
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
        const response = await axios.get(`${this.NETEASE_API_URL}/history`, {
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
        console.warn(`通过后端代理获取股票${symbol}历史数据失败:`, proxyError)
      }

      // 如果后端代理未实现或返回格式不正确，抛出错误
      throw new Error(`网易财经数据源获取股票${symbol}历史数据失败，API不可用`)
    } catch (error) {
      console.error(`网易财经获取股票${symbol}数据失败:`, error)
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
        const response = await axios.get(`${this.NETEASE_API_URL}/search`, {
          params: {
            keyword: query
          }
        })

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          return response.data.data.map((item: any) => ({
            symbol: item.symbol,
            name: item.name,
            market: item.market || (item.symbol.startsWith('0') ? '上海' : '深圳'),
            industry: item.industry || '未知'
          }))
        }
      } catch (proxyError) {
        console.warn('通过后端代理搜索股票失败:', proxyError)
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
      console.error('网易财经搜索股票失败:', error)
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

      // 通过后端代理请求网易财经API
      const response = await axios.get(`${this.NETEASE_API_URL}/quote`, {
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

      // 如果后端代理未实现或返回格式不正确，抛出错误
      throw new Error(`网易财经数据源获取股票${symbol}行情失败，API不可用`)
    } catch (error) {
      console.error(`网易财经获取股票${symbol}行情失败:`, error)
      throw error
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
        const response = await axios.get(`${this.NETEASE_API_URL}/news`, {
          params: {
            count
          }
        })

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const news: FinancialNews[] = response.data.data.map((item: any) => ({
            title: item.title,
            time: item.time,
            source: item.source || '网易财经',
            url: item.url || `${this.NETEASE_FINANCE_URL}/news/`,
            important: item.important || false,
            content: item.content || ''
          }))

          return news
        }
      } catch (proxyError) {
        console.warn('通过后端代理获取财经新闻失败:', proxyError)
      }

      // 如果后端代理未实现或返回格式不正确，抛出错误
      throw new Error('网易财经数据源获取财经新闻失败，API不可用')
    } catch (error) {
      console.error('网易财经获取财经新闻失败:', error)
      throw error
    }
  }

  /**
   * 获取数据源名称
   */
  getName(): string {
    return '网易财经'
  }

  /**
   * 获取数据源描述
   */
  getDescription(): string {
    return '提供历史数据和行情，历史数据丰富'
  }

  /**
   * 获取数据源类型
   */
  getType(): DataSourceType {
    return 'netease'
  }

  /**
   * 测试数据源连接
   */
  async testConnection(): Promise<boolean> {
    try {
      // 尝试通过后端代理测试连接
      const response = await axios.get(`${this.NETEASE_API_URL}/test`, {
        timeout: 10000
      })

      // 检查响应
      if (response.data && response.data.success) {
        return true
      }

      // 如果测试失败，检查具体错误信息
      if (response.data && response.data.message) {
        console.warn('网易财经测试失败:', response.data.message)
      }

      return false
    } catch (error) {
      console.error('网易财经数据源连接测试失败:', error)

      // 如果是网络错误，尝试使用增强版网易数据源
      if ((error as any).code === 'ECONNREFUSED' || (error as any).code === 'ETIMEDOUT') {
        console.info('建议使用网易财经增强版数据源 (netease_enhanced)')
      }

      return false
    }
  }

  /**
   * 格式化股票代码
   * @param symbol 股票代码
   * @returns 格式化后的股票代码
   */
  private formatSymbol(symbol: string): string {
    // 如果已经是网易财经格式（0开头上海，1开头深圳），直接返回
    if (/^[01]\d{6}$/.test(symbol)) {
      return symbol
    }

    // 如果是sh或sz前缀，转换为网易财经格式
    if (symbol.startsWith('sh')) {
      return '0' + symbol.slice(2)
    }
    if (symbol.startsWith('sz')) {
      return '1' + symbol.slice(2)
    }

    // 如果是.SH或.SZ后缀，转换为网易财经格式
    if (symbol.endsWith('.SH')) {
      return '0' + symbol.slice(0, -3)
    }
    if (symbol.endsWith('.SZ')) {
      return '1' + symbol.slice(0, -3)
    }

    // 根据股票代码规则添加前缀
    if (symbol.startsWith('6')) {
      return '0' + symbol
    } else if (symbol.startsWith('0') || symbol.startsWith('3')) {
      return '1' + symbol
    } else if (symbol.startsWith('4') || symbol.startsWith('8')) {
      return '2' + symbol // 北交所
    }

    // 默认返回原始代码
    return symbol
  }
}
