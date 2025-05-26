/**
 * 聚宽（JoinQuant）数据源实现
 * 提供专业的量化数据服务
 */

import type DataSourceInterface from './DataSourceInterface'
import axios from 'axios'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'
import type { DataSourceType } from './DataSourceFactory'

/**
 * 聚宽数据源配置
 */
interface JoinQuantConfig {
  apiUrl: string
  token: string
  timeout: number
  retryCount: number
}

/**
 * 聚宽API响应格式
 */
interface JoinQuantResponse<T = any> {
  error: string | null
  data: T
  message?: string
}

/**
 * 聚宽股票数据格式
 */
interface JoinQuantStockInfo {
  code: string
  display_name: string
  name: string
  start_date: string
  end_date: string
  type: string
}

/**
 * 聚宽行情数据格式
 */
interface JoinQuantPriceData {
  date: string
  open: number
  close: number
  high: number
  low: number
  volume: number
  money: number
}

export class JoinQuantDataSource implements DataSourceInterface {
  private config: JoinQuantConfig
  private readonly sourceType: DataSourceType = 'joinquant'
  
  // 缓存
  private stockListCache: Stock[] | null = null
  private stockListCacheTime: number = 0
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24小时

  constructor(config?: Partial<JoinQuantConfig>) {
    this.config = {
      apiUrl: '/api/joinquant', // 通过后端代理
      token: process.env.JOINQUANT_TOKEN || '',
      timeout: 15000,
      retryCount: 3,
      ...config
    }
  }

  /**
   * 发送API请求
   */
  private async request<T>(
    endpoint: string, 
    params: Record<string, any> = {},
    retryCount = 0
  ): Promise<T> {
    try {
      const response = await axios.get(`${this.config.apiUrl}${endpoint}`, {
        params: {
          token: this.config.token,
          ...params
        },
        timeout: this.config.timeout
      })

      const result: JoinQuantResponse<T> = response.data

      if (result.error) {
        throw new Error(`聚宽API错误: ${result.error}`)
      }

      return result.data
    } catch (error) {
      if (retryCount < this.config.retryCount) {
        console.warn(`聚宽API请求失败，重试 ${retryCount + 1}/${this.config.retryCount}:`, error)
        await this.delay(1000 * (retryCount + 1)) // 递增延迟
        return this.request<T>(endpoint, params, retryCount + 1)
      }
      
      throw error
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 格式化股票代码
   */
  private formatSymbol(symbol: string): string {
    // 聚宽使用格式：000001.XSHE, 000001.XSHG
    if (symbol.includes('.')) {
      return symbol
    }
    
    // 根据代码判断市场
    if (symbol.startsWith('6')) {
      return `${symbol}.XSHG` // 上海
    } else if (symbol.startsWith('0') || symbol.startsWith('3')) {
      return `${symbol}.XSHE` // 深圳
    }
    
    return symbol
  }

  /**
   * 获取股票列表
   */
  async getStocks(): Promise<Stock[]> {
    try {
      // 检查缓存
      if (this.stockListCache && Date.now() - this.stockListCacheTime < this.CACHE_DURATION) {
        console.log('使用缓存的聚宽股票列表数据')
        return this.stockListCache
      }

      console.log('从聚宽获取股票列表数据')

      const stockInfos = await this.request<JoinQuantStockInfo[]>('/get_all_securities', {
        type: 'stock',
        date: new Date().toISOString().split('T')[0]
      })

      const stocks: Stock[] = stockInfos.map(info => ({
        symbol: info.code,
        name: info.display_name || info.name,
        market: info.code.includes('XSHG') ? '上海' : '深圳',
        industry: '未知', // 聚宽需要单独接口获取行业信息
        listDate: info.start_date
      }))

      // 更新缓存
      this.stockListCache = stocks
      this.stockListCacheTime = Date.now()

      console.log(`聚宽获取到 ${stocks.length} 只股票`)
      return stocks

    } catch (error) {
      console.error('聚宽获取股票列表失败:', error)
      throw error
    }
  }

  /**
   * 获取单个股票数据
   */
  async getStockData(symbol: string): Promise<StockData> {
    try {
      console.log(`从聚宽获取股票${symbol}的历史数据`)

      const formattedSymbol = this.formatSymbol(symbol)
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const priceData = await this.request<JoinQuantPriceData[]>('/get_price', {
        security: formattedSymbol,
        start_date: startDate,
        end_date: endDate,
        frequency: 'daily',
        fields: ['open', 'close', 'high', 'low', 'volume', 'money'],
        skip_paused: false,
        fq: 'pre' // 前复权
      })

      if (!priceData || priceData.length === 0) {
        throw new Error('未获取到有效的历史数据')
      }

      const dates: string[] = []
      const prices: number[] = []
      const volumes: number[] = []
      const highs: number[] = []
      const lows: number[] = []
      const opens: number[] = []

      priceData.forEach(item => {
        dates.push(item.date)
        opens.push(item.open)
        highs.push(item.high)
        lows.push(item.low)
        prices.push(item.close)
        volumes.push(item.volume)
      })

      return {
        symbol,
        dates,
        prices,
        volumes,
        highs,
        lows,
        opens,
        high: Math.max(...highs),
        low: Math.min(...lows),
        open: opens[0],
        close: prices[prices.length - 1],
        dataSource: 'joinquant'
      }

    } catch (error) {
      console.error(`聚宽获取股票${symbol}数据失败:`, error)
      throw error
    }
  }

  /**
   * 搜索股票
   */
  async searchStocks(query: string): Promise<Stock[]> {
    try {
      console.log(`聚宽搜索股票: ${query}`)

      // 聚宽没有直接的搜索接口，使用本地过滤
      const allStocks = await this.getStocks()

      return allStocks.filter(stock =>
        stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
        stock.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 50) // 限制返回数量

    } catch (error) {
      console.error('聚宽搜索股票失败:', error)
      throw error
    }
  }

  /**
   * 获取股票实时行情
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    try {
      const formattedSymbol = this.formatSymbol(symbol)

      // 获取当前价格数据
      const currentData = await this.request<JoinQuantPriceData[]>('/get_current_data', {
        security: formattedSymbol
      })

      if (!currentData || currentData.length === 0) {
        throw new Error('未获取到实时行情数据')
      }

      const data = currentData[0]

      // 获取昨日收盘价用于计算涨跌
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      const prevData = await this.request<JoinQuantPriceData[]>('/get_price', {
        security: formattedSymbol,
        start_date: yesterdayStr,
        end_date: yesterdayStr,
        frequency: 'daily',
        fields: ['close']
      })

      const prevClose = prevData && prevData.length > 0 ? prevData[0].close : data.close
      const change = data.close - prevClose
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0

      return {
        symbol,
        name: symbol, // 需要从股票列表中获取名称
        price: data.close,
        change,
        changePercent,
        open: data.open,
        high: data.high,
        low: data.low,
        volume: data.volume,
        turnover: data.money,
        prevClose,
        timestamp: new Date().toISOString(),
        dataSource: 'joinquant'
      }

    } catch (error) {
      console.error(`聚宽获取股票${symbol}行情失败:`, error)
      throw error
    }
  }

  /**
   * 获取财经新闻
   */
  async getFinancialNews(count = 20): Promise<FinancialNews[]> {
    try {
      console.log('聚宽暂不支持财经新闻接口')
      
      // 聚宽主要提供数据服务，新闻功能有限
      // 返回空数组或使用其他数据源
      return []

    } catch (error) {
      console.error('聚宽获取财经新闻失败:', error)
      throw error
    }
  }

  /**
   * 获取股票基本信息
   */
  async getStockInfo(symbol: string): Promise<any> {
    try {
      const formattedSymbol = this.formatSymbol(symbol)

      const info = await this.request('/get_security_info', {
        security: formattedSymbol
      })

      return info

    } catch (error) {
      console.error(`聚宽获取股票${symbol}基本信息失败:`, error)
      throw error
    }
  }

  /**
   * 获取财务数据
   */
  async getFinancialData(symbol: string, statDate?: string): Promise<any> {
    try {
      const formattedSymbol = this.formatSymbol(symbol)

      const financialData = await this.request('/get_fundamentals', {
        security: formattedSymbol,
        stat_date: statDate || new Date().toISOString().split('T')[0]
      })

      return financialData

    } catch (error) {
      console.error(`聚宽获取股票${symbol}财务数据失败:`, error)
      throw error
    }
  }

  /**
   * 获取分钟级数据
   */
  async getMinuteData(symbol: string, count = 240): Promise<any> {
    try {
      const formattedSymbol = this.formatSymbol(symbol)

      const minuteData = await this.request('/get_price', {
        security: formattedSymbol,
        count,
        frequency: '1m',
        fields: ['open', 'close', 'high', 'low', 'volume', 'money'],
        skip_paused: false,
        fq: 'pre'
      })

      return minuteData

    } catch (error) {
      console.error(`聚宽获取股票${symbol}分钟数据失败:`, error)
      throw error
    }
  }

  /**
   * 获取行业数据
   */
  async getIndustryData(): Promise<any> {
    try {
      const industries = await this.request('/get_industries', {
        name: 'sw_l1' // 申万一级行业
      })

      return industries

    } catch (error) {
      console.error('聚宽获取行业数据失败:', error)
      throw error
    }
  }
}

export default JoinQuantDataSource
