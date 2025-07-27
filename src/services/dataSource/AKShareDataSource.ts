import type DataSourceInterface from './DataSourceInterface'
import axios from 'axios'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'
import type { DataSourceType } from './DataSourceFactory'

/**
 * AKShare 数据源实现
 */
export class AKShareDataSource implements DataSourceInterface {
  // AKShare API基础URL
  private readonly AKSHARE_API_URL = '/api/akshare'

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

      console.log('从AKShare获取股票列表数据')

      // 尝试通过后端代理获取股票列表
      try {
        const response = await axios.get(`${this.AKSHARE_API_URL}/stock-list`)

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const stocks: Stock[] = response.data.data.map((item: any) => ({
            symbol: item.symbol,
            name: item.name,
            market:
              item.market ||
              (item.symbol.includes('SH') ? '上海' : item.symbol.includes('SZ') ? '深圳' : '未知'),
            industry: item.industry || '未知',
          }))

          // 更新缓存
          this.stockListCache = stocks
          this.stockListCacheTime = Date.now()

          // 如果有消息，显示
          if (response.data.message) {
            console.log(`AKShare股票列表: ${response.data.message}`)
          }

          return stocks
        }
      } catch (proxyError) {
        console.warn('通过后端代理获取股票列表失败，使用预定义列表:', proxyError)
      }

      // 如果后端代理未实现或返回格式不正确，返回空数组而不是硬编码数据
      console.warn('AKShare数据源：后端代理未实现或返回格式不正确，返回空结果');
      return [];
    } catch (error) {
      console.error('AKShare获取股票列表失败:', error)
      throw error
    }
  }

  /**
   * 获取单个股票数据
   * @param symbol 股票代码
   */
  async getStockData(symbol: string): Promise<StockData> {
    try {
      console.log(`从AKShare获取股票${symbol}的历史数据`)

      // 确保股票代码格式正确
      const formattedSymbol = this.formatSymbol(symbol)

      // 尝试通过后端代理获取历史数据
      try {
        const response = await axios.get(`${this.AKSHARE_API_URL}/history`, {
          params: {
            symbol: formattedSymbol,
            period: 'daily',
            count: 180,
          },
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

          // 如果有消息，显示
          if (response.data.message) {
            console.log(`AKShare历史数据: ${response.data.message}`)
          }

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

      console.log(`使用模拟数据生成股票${symbol}的历史数据`)

      // 如果后端代理未实现或返回格式不正确，使用模拟数据
      const today = new Date()
      const dates: string[] = []
      const prices: number[] = []
      const volumes: number[] = []

      // 获取实时行情作为基准价格
      const quote = await this.getStockQuote(symbol)
      let basePrice = quote.price

      // 不生成模拟数据，抛出错误
      throw new Error(`AKShare数据源获取股票${symbol}历史数据失败，请检查Python环境和AKShare库配置`)

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
      console.error(`AKShare获取股票${symbol}数据失败:`, error)
      throw error
    }
  }

  /**
   * 搜索股票
   * @param query 搜索关键词
   */
  async searchStocks(query: string): Promise<Stock[]> {
    try {
      console.log(`搜索股票: ${query}`)

      // 尝试通过后端代理搜索股票
      try {
        const response = await axios.get(`${this.AKSHARE_API_URL}/search`, {
          params: {
            keyword: query,
          },
        })

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const stocks = response.data.data.map((item: any) => ({
            symbol: item.symbol,
            name: item.name,
            market:
              item.market ||
              (item.symbol.includes('SH') ? '上海' : item.symbol.includes('SZ') ? '深圳' : '未知'),
            industry: item.industry || '未知',
          }))

          // 如果有消息，显示
          if (response.data.message) {
            console.log(`AKShare搜索结果: ${response.data.message}`)
          }

          return stocks
        }
      } catch (proxyError) {
        console.warn('通过后端代理搜索股票失败，使用本地过滤:', proxyError)
      }

      console.log('使用本地过滤搜索股票')

      // 如果后端代理未实现或返回格式不正确，使用本地过滤
      const allStocks = await this.getStocks()

      // 在本地过滤
      return allStocks.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
          stock.name.toLowerCase().includes(query.toLowerCase())
      )
    } catch (error) {
      console.error('AKShare搜索股票失败:', error)
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

      // 通过后端代理请求AKShare API
      const response = await axios.get(`${this.AKSHARE_API_URL}/quote`, {
        params: {
          symbol: formattedSymbol,
        },
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
      throw new Error(`AKShare获取股票${symbol}行情失败: 后端代理未实现`)
    } catch (error) {
      console.error(`AKShare获取股票${symbol}行情失败:`, error)
      // 如果API请求失败，抛出错误
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      throw new Error(`AKShare获取股票${symbol}行情失败: ${errorMessage}`)
    }
  }

  /**
   * 获取财经新闻
   * @param count 新闻数量
   * @param options 可选参数
   */
  async getFinancialNews(
    count: number = 5,
    options?: { sourceType?: DataSourceType; forceRefresh?: boolean }
  ): Promise<FinancialNews[]> {
    try {
      console.log('获取财经新闻')
      const forceRefresh = options?.forceRefresh || false

      // 如果不强制刷新，尝试从缓存获取
      if (!forceRefresh) {
        try {
          const cacheKey = 'akshare_news_cache'
          const cachedData = localStorage.getItem(cacheKey)
          if (cachedData) {
            const { data, timestamp } = JSON.parse(cachedData)
            const now = new Date().getTime()

            // 检查缓存是否过期（15分钟）
            if (now - timestamp < 15 * 60 * 1000) {
              console.log(`使用缓存的AKShare财经新闻`)
              return data.slice(0, count).map((item: FinancialNews) => ({
                ...item,
                data_source: 'akshare_cache',
              }))
            }
          }
        } catch (cacheError) {
          console.warn('读取AKShare新闻缓存失败:', cacheError)
        }
      }

      // 尝试通过后端代理获取财经新闻
      try {
        const response = await axios.get(`${this.AKSHARE_API_URL}/news`, {
          params: {
            count,
            force_refresh: forceRefresh,
          },
        })

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const news: FinancialNews[] = response.data.data.map((item: any) => ({
            title: item.title,
            time: item.time,
            source: item.source || 'AKShare',
            url: item.url || '#',
            important: item.important || false,
            content: item.content || '',
            data_source: 'akshare_api',
          }))

          // 如果有消息，显示
          if (response.data.message) {
            console.log(`AKShare财经新闻: ${response.data.message}`)
          }

          // 缓存数据
          try {
            localStorage.setItem(
              'akshare_news_cache',
              JSON.stringify({
                data: news,
                timestamp: new Date().getTime(),
              })
            )
          } catch (cacheError) {
            console.warn('缓存AKShare新闻数据失败:', cacheError)
          }

          return news
        }
      } catch (proxyError) {
        console.warn('通过后端代理获取财经新闻失败，使用模拟数据:', proxyError)
      }

      // 如果API调用失败，尝试从缓存获取
      try {
        const cacheKey = 'akshare_news_cache'
        const cachedData = localStorage.getItem(cacheKey)
        if (cachedData) {
          const { data } = JSON.parse(cachedData)
          console.log(`API失败后使用缓存的AKShare财经新闻`)
          return data.slice(0, count).map((item: FinancialNews) => ({
            ...item,
            data_source: 'akshare_cache (API失败)',
          }))
        }
      } catch (cacheError) {
        console.warn('读取AKShare新闻缓存失败:', cacheError)
      }

      // 如果API调用失败且缓存不可用，抛出错误
      throw new Error('AKShare获取财经新闻失败: 后端代理未实现且缓存不可用')
    } catch (error) {
      console.error('AKShare获取财经新闻失败:', error)
      throw error
    }
  }

  /**
   * 获取数据源名称
   */
  getName(): string {
    return 'AKShare'
  }

  /**
   * 获取数据源类型
   */
  getType(): DataSourceType {
    return 'akshare'
  }

  /**
   * 获取数据源描述
   */
  getDescription(): string {
    return '开源的 Python 金融数据接口库，提供丰富的中文金融市场数据'
  }

  /**
   * 测试数据源连接
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('测试AKShare数据源连接')

      // 尝试通过后端代理测试连接
      const response = await axios.get(`${this.AKSHARE_API_URL}/test`)

      // 检查响应
      if (response.data && response.data.success) {
        console.log(`AKShare连接测试成功: ${response.data.message || '连接正常'}`)
        return true
      }

      console.log(`AKShare连接测试失败: ${response.data.message || '未知错误'}`)
      return false
    } catch (error) {
      console.error('AKShare数据源连接测试失败:', error)
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
   * 获取股票基本信息
   * @param symbol 股票代码
   * @returns 股票基本信息
   */
  private getStockInfo(symbol: string): Stock {
    // 尝试从缓存中获取
    if (this.stockListCache) {
      const stock = this.stockListCache.find((s) => s.symbol === symbol)
      if (stock) {
        return stock
      }
    }

    // 如果缓存中没有，返回默认信息
    return {
      symbol,
      name: '未知股票',
      market: symbol.includes('SH') ? '上海' : symbol.includes('SZ') ? '深圳' : '未知',
      industry: '未知',
    }
  }
}
