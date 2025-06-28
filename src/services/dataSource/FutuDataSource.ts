import type DataSourceInterface from './DataSourceInterface'
import type { DataSourceType } from './DataSourceFactory'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'
import { createFutuApiClient, FutuMarket, type FutuApiClient, type FutuSecurity } from './FutuApiClient'

/**
 * 富途数据源
 *
 * 富途OpenAPI是一个专业的量化交易接口，提供丰富的行情和交易功能
 * 支持港股、美股、A股等多个市场的实时行情数据
 *
 * 特点：
 * - 需要通过OpenD网关程序连接
 * - 支持实时行情、历史数据、基本面数据
 * - 提供WebSocket连接方式
 * - 需要富途账号和相应的行情权限
 *
 * 注意：
 * - 需要先安装并启动OpenD程序
 * - 需要富途账号登录
 * - 部分行情数据需要相应权限
 * - 接口有频率限制
 */
export default class FutuDataSource implements DataSourceInterface {
  private readonly name = '富途OpenAPI'
  private readonly description = '富途OpenAPI量化接口，支持港股、美股、A股等多市场实时行情'
  private readonly type: DataSourceType = 'futu'

  // 富途API客户端
  private futuClient: FutuApiClient

  // 缓存
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly cacheTimeout = 5000 // 5秒缓存

  constructor() {
    // 初始化富途API客户端
    this.futuClient = createFutuApiClient({
      host: '127.0.0.1',
      port: 11111,
      enableSsl: false,
      timeout: 10000
    })
  }

  /**
   * 获取数据源名称
   */
  getName(): string {
    return this.name
  }

  /**
   * 获取数据源描述
   */
  getDescription(): string {
    return this.description
  }

  /**
   * 获取数据源类型
   */
  getType(): DataSourceType {
    return this.type
  }

  /**
   * 测试数据源连接
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.futuClient.testConnection()
    } catch (error) {
      console.error('富途OpenD连接测试失败:', error)
      return false
    }
  }

  /**
   * 获取股票列表
   */
  async getStocks(): Promise<Stock[]> {
    try {
      // 富途API需要通过特定接口获取股票列表
      // 这里返回一些常见的港股和美股作为示例
      const stocks: Stock[] = [
        {
          symbol: 'HK.00700',
          name: '腾讯控股',
          market: 'HK',
          exchange: 'HKEX',
          currency: 'HKD',
          type: 'stock'
        },
        {
          symbol: 'HK.00941',
          name: '中国移动',
          market: 'HK',
          exchange: 'HKEX',
          currency: 'HKD',
          type: 'stock'
        },
        {
          symbol: 'US.AAPL',
          name: '苹果公司',
          market: 'US',
          exchange: 'NASDAQ',
          currency: 'USD',
          type: 'stock'
        },
        {
          symbol: 'US.TSLA',
          name: '特斯拉',
          market: 'US',
          exchange: 'NASDAQ',
          currency: 'USD',
          type: 'stock'
        }
      ]

      return stocks
    } catch (error) {
      console.error('获取富途股票列表失败:', error)
      throw new Error(`获取股票列表失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 获取股票数据
   */
  async getStockData(symbol: string): Promise<StockData> {
    try {
      // 检查缓存
      const cacheKey = `stockData_${symbol}`
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }

      // 富途API获取股票基本信息
      const stockData: StockData = {
        symbol,
        name: this.getStockName(symbol),
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        marketCap: 0,
        pe: 0,
        pb: 0,
        eps: 0,
        dividend: 0,
        timestamp: Date.now(),
        source: this.type
      }

      // 缓存结果
      this.cache.set(cacheKey, { data: stockData, timestamp: Date.now() })

      return stockData
    } catch (error) {
      console.error('获取富途股票数据失败:', error)
      throw new Error(`获取股票数据失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 搜索股票
   */
  async searchStocks(query: string): Promise<Stock[]> {
    try {
      // 使用富途API搜索股票
      const securities = await this.futuClient.searchStocks(query)

      // 转换为系统标准格式
      const stocks: Stock[] = securities.map(security => {
        const symbol = this.futuClient.formatStockCode(security.market, security.code)
        return {
          symbol,
          name: this.getStockName(symbol),
          market: this.getMarketFromFutuMarket(security.market),
          exchange: this.getExchangeFromFutuMarket(security.market),
          currency: this.getCurrencyFromFutuMarket(security.market),
          type: 'stock'
        }
      })

      return stocks
    } catch (error) {
      console.error('富途股票搜索失败:', error)
      throw new Error(`搜索股票失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 获取股票实时行情
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    try {
      // 检查缓存
      const cacheKey = `quote_${symbol}`
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }

      // 解析股票代码
      const security = this.futuClient.parseStockCode(symbol)
      if (!security) {
        throw new Error(`无效的股票代码格式: ${symbol}`)
      }

      // 使用富途API获取实时行情
      const basicQuotes = await this.futuClient.getBasicQuote([security])

      if (basicQuotes.length === 0) {
        throw new Error(`未找到股票 ${symbol} 的行情数据`)
      }

      const basicQuote = basicQuotes[0]

      // 转换为系统标准格式
      const quote: StockQuote = {
        symbol,
        name: this.getStockName(symbol),
        price: basicQuote.curPrice,
        open: basicQuote.openPrice,
        high: basicQuote.highPrice,
        low: basicQuote.lowPrice,
        close: basicQuote.lastClosePrice,
        volume: parseInt(basicQuote.volume) || 0,
        change: basicQuote.curPrice - basicQuote.lastClosePrice,
        changePercent: ((basicQuote.curPrice - basicQuote.lastClosePrice) / basicQuote.lastClosePrice) * 100,
        timestamp: Date.now(),
        source: this.type
      }

      // 缓存结果
      this.cache.set(cacheKey, { data: quote, timestamp: Date.now() })

      return quote
    } catch (error) {
      console.error('获取富途股票行情失败:', error)
      throw new Error(`获取股票行情失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 获取财经新闻
   */
  async getFinancialNews(count: number = 10): Promise<FinancialNews[]> {
    try {
      // 富途API暂不直接提供新闻接口，返回空数组
      console.warn('富途API暂不支持财经新闻功能')
      return []
    } catch (error) {
      console.error('获取富途财经新闻失败:', error)
      throw new Error(`获取财经新闻失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 获取股票名称（辅助方法）
   */
  private getStockName(symbol: string): string {
    const stockNames: Record<string, string> = {
      'HK.00700': '腾讯控股',
      'HK.00941': '中国移动',
      'HK.00005': '汇丰控股',
      'HK.00388': '香港交易所',
      'US.AAPL': '苹果公司',
      'US.TSLA': '特斯拉',
      'US.GOOGL': '谷歌',
      'US.MSFT': '微软',
      'SH.000001': '上证指数',
      'SZ.399001': '深证成指'
    }

    return stockNames[symbol] || symbol
  }

  /**
   * 从富途市场类型获取市场名称
   */
  private getMarketFromFutuMarket(futuMarket: FutuMarket): string {
    switch (futuMarket) {
      case FutuMarket.HK:
        return 'HK'
      case FutuMarket.US:
        return 'US'
      case FutuMarket.CN:
        return 'CN'
      default:
        return 'UNKNOWN'
    }
  }

  /**
   * 从富途市场类型获取交易所名称
   */
  private getExchangeFromFutuMarket(futuMarket: FutuMarket): string {
    switch (futuMarket) {
      case FutuMarket.HK:
        return 'HKEX'
      case FutuMarket.US:
        return 'NASDAQ'
      case FutuMarket.CN:
        return 'SSE'
      default:
        return 'UNKNOWN'
    }
  }

  /**
   * 从富途市场类型获取货币
   */
  private getCurrencyFromFutuMarket(futuMarket: FutuMarket): string {
    switch (futuMarket) {
      case FutuMarket.HK:
        return 'HKD'
      case FutuMarket.US:
        return 'USD'
      case FutuMarket.CN:
        return 'CNY'
      default:
        return 'USD'
    }
  }

  /**
   * 清理缓存
   */
  private clearExpiredCache(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key)
      }
    }
  }
}
