import type DataSourceInterface from './DataSourceInterface'
import axios from 'axios'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'

/**
 * Alltick数据源实现
 * 提供全球金融市场实时和历史数据，包括股票、外汇、加密货币等
 */
export class AlltickDataSource implements DataSourceInterface {
  private readonly name = 'alltick'
  private readonly displayName = 'AllTick'

  // 通过前端代理调用 AllTick API
  private readonly PROXY_BASE_URL = '/alltick-api'
  private readonly API_TOKEN = '85b75304f6ef5a52123479654ddab44e-c-app'

  // 请求配置
  private readonly timeout = 15000

  // 缓存
  private stockListCache: Stock[] | null = null
  private stockListCacheTime: number = 0
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24小时

  // 限流控制
  private lastRequestTime: number = 0
  private readonly MIN_REQUEST_INTERVAL = 1000 // 1秒间隔

  /**
   * 限流延迟
   */
  private async rateLimitDelay(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    this.lastRequestTime = Date.now()
  }

  /**
   * 通过前端代理发送API请求
   */
  private async makeRequest(endpoint: string, params: Record<string, any>): Promise<any> {
    await this.rateLimitDelay()

    const url = `${this.PROXY_BASE_URL}/quote-stock-b-api/${endpoint}`

    // 构建查询参数
    const queryData = {
      trace: `request-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      data: params
    }

    const queryParams = new URLSearchParams({
      token: this.API_TOKEN,
      query: JSON.stringify(queryData)
    })

    const fullUrl = `${url}?${queryParams.toString()}`

    console.log(`AllTick 前端代理请求: ${fullUrl}`)

    try {
      const response = await axios.get(fullUrl, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      console.log('AllTick 前端代理响应:', response.data)

      // 检查API响应
      if (response.data && response.data.ret !== 200) {
        throw new Error(`AllTick API错误: ${response.data.msg || '未知错误'}`)
      }

      return response.data
    } catch (error: any) {
      console.error('AllTick 前端代理请求失败:', error.message)
      if (error.response) {
        console.error('响应状态:', error.response.status)
        console.error('响应数据:', error.response.data)
      }
      throw new Error(`AllTick 前端代理请求失败: ${error.message}`)
    }
  }

  /**
   * 格式化股票代码为Alltick格式
   */
  private formatSymbolForAlltick(symbol: string): string {
    // 处理A股代码
    if (/^\d{6}$/.test(symbol)) {
      // 根据代码判断市场
      const code = parseInt(symbol)
      if (code >= 600000 && code <= 699999) {
        return `${symbol}.SH` // 上海主板
      } else if (code >= 0 && code <= 399999) {
        return `${symbol}.SZ` // 深圳主板/中小板/创业板
      }
    }

    // 处理港股代码 - AllTick 使用不同的格式
    if (/^\d{1,5}$/.test(symbol)) {
      // 港股代码需要去掉前导零
      return `${parseInt(symbol)}.HK`
    }

    // 处理已经包含 .HK 但有前导零的情况
    if (symbol.includes('.HK')) {
      const parts = symbol.split('.HK')
      const code = parseInt(parts[0])
      return `${code}.HK`
    }

    // 处理美股代码
    if (/^[A-Z]+$/.test(symbol)) {
      return `${symbol}.US`
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
        return this.stockListCache
      }

      // AllTick没有直接的股票列表接口，返回常用股票
      const popularStocks = [
        { symbol: '000001', name: '平安银行', market: 'SZ', industry: '银行', area: 'CN' },
        { symbol: '000002', name: '万科A', market: 'SZ', industry: '房地产', area: 'CN' },
        { symbol: '600000', name: '浦发银行', market: 'SH', industry: '银行', area: 'CN' },
        { symbol: '600036', name: '招商银行', market: 'SH', industry: '银行', area: 'CN' },
        { symbol: '00700', name: '腾讯控股', market: 'HK', industry: '科技', area: 'HK' },
        { symbol: '00941', name: '中国移动', market: 'HK', industry: '通信', area: 'HK' },
        { symbol: 'AAPL', name: 'Apple Inc.', market: 'US', industry: 'Technology', area: 'US' },
        { symbol: 'MSFT', name: 'Microsoft Corporation', market: 'US', industry: 'Technology', area: 'US' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'US', industry: 'Technology', area: 'US' },
        { symbol: 'TSLA', name: 'Tesla, Inc.', market: 'US', industry: 'Automotive', area: 'US' }
      ]

      const stocks: Stock[] = popularStocks.map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        listDate: '',
        industry: stock.industry,
        area: stock.area
      }))

      // 更新缓存
      this.stockListCache = stocks
      this.stockListCacheTime = Date.now()

      return stocks
    } catch (error: any) {
      throw new Error(`Alltick股票列表获取失败: ${error.message}`)
    }
  }

  /**
   * 获取股票实时行情
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    try {
      const alltickSymbol = this.formatSymbolForAlltick(symbol)

      const params = {
        symbol_list: [{ code: alltickSymbol }]
      }

      const data = await this.makeRequest('trade-tick', params)

      if (!data.data || !data.data.tick_list || data.data.tick_list.length === 0) {
        throw new Error('行情数据不存在')
      }

      const tick = data.data.tick_list[0]

      return {
        symbol: symbol,
        name: symbol,
        price: parseFloat(tick.price),
        open: parseFloat(tick.price), // 当前价作为开盘价的近似值
        high: parseFloat(tick.price), // 当前价作为最高价的近似值
        low: parseFloat(tick.price), // 当前价作为最低价的近似值
        close: parseFloat(tick.price),
        pre_close: parseFloat(tick.price), // 需要通过历史数据获取
        change: 0, // Alltick不直接提供涨跌额，需要通过历史数据计算
        pct_chg: 0, // 需要通过历史数据计算
        vol: parseFloat(tick.volume || '0'),
        amount: parseFloat(tick.turnover || '0'),
        update_time: new Date(parseInt(tick.tick_time)).toISOString(),
        data_source: 'alltick'
      }
    } catch (error: any) {
      throw new Error(`Alltick股票行情获取失败: ${error.message}`)
    }
  }

  /**
   * 获取股票历史数据
   */
  async getStockHistory(symbol: string, period: string = 'day', _startDate?: string, _endDate?: string): Promise<StockData[]> {
    try {
      const alltickSymbol = this.formatSymbolForAlltick(symbol)

      // 映射周期类型
      let klineType = 8 // 默认日K
      switch (period) {
        case 'minute':
          klineType = 1
          break
        case '5min':
          klineType = 2
          break
        case '15min':
          klineType = 3
          break
        case '30min':
          klineType = 4
          break
        case 'hour':
          klineType = 5
          break
        case 'day':
          klineType = 8
          break
        case 'week':
          klineType = 9
          break
        case 'month':
          klineType = 10
          break
      }

      const params = {
        code: alltickSymbol,
        kline_type: klineType,
        kline_timestamp_end: 0,
        query_kline_num: 100,
        adjust_type: 0
      }

      const data = await this.makeRequest('kline', params)

      if (!data.data || !data.data.kline_list) {
        return []
      }

      return data.data.kline_list.map((kline: any) => ({
        symbol: symbol,
        date: new Date(parseInt(kline.timestamp) * 1000).toISOString().split('T')[0],
        open: parseFloat(kline.open_price),
        high: parseFloat(kline.high_price),
        low: parseFloat(kline.low_price),
        close: parseFloat(kline.close_price),
        volume: parseFloat(kline.volume || '0'),
        turnover: parseFloat(kline.turnover || '0'),
        change: 0, // 需要计算
        changePercent: 0 // 需要计算
      })).reverse() // 按时间正序排列
    } catch (error: any) {
      throw new Error(`Alltick历史数据获取失败: ${error.message}`)
    }
  }

  /**
   * 搜索股票
   */
  async searchStocks(query: string): Promise<Stock[]> {
    // AllTick没有搜索接口，从缓存的股票列表中搜索
    const stocks = await this.getStocks()
    return stocks.filter(stock =>
      stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
      stock.name.toLowerCase().includes(query.toLowerCase())
    )
  }

  /**
   * 获取财经新闻
   */
  async getFinancialNews(_count: number = 20): Promise<FinancialNews[]> {
    // Alltick主要提供行情数据，不提供新闻服务
    return []
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
    return '全球金融市场实时数据提供商，支持股票、外汇、加密货币等多种资产类型'
  }

  /**
   * 获取数据源类型
   */
  getType(): 'alltick' {
    return 'alltick'
  }

  /**
   * 测试数据源连接
   */
  async testConnection(): Promise<boolean> {
    try {
      // 测试获取苹果股票行情
      const quote = await this.getStockQuote('AAPL')
      return !!(quote && quote.symbol && quote.price > 0)
    } catch (error) {
      console.error('Alltick连接测试失败:', error)
      return false
    }
  }

  /**
   * 获取股票数据（兼容接口）
   */
  async getStockData(symbol: string): Promise<any> {
    const history = await this.getStockHistory(symbol, 'day')
    return history.length > 0 ? history[history.length - 1] : null
  }


}

export default AlltickDataSource
