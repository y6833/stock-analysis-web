import type DataSourceInterface from './DataSourceInterface'
import axios from 'axios'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'

/**
 * 腾讯财经增强版数据源实现
 * 直接调用腾讯财经API，无需后端代理
 */
export class TencentEnhancedDataSource implements DataSourceInterface {
  private readonly name = 'tencent-enhanced'
  private readonly displayName = '腾讯财经(增强版)'

  // 腾讯财经API地址
  private readonly QUOTE_API = 'https://qt.gtimg.cn/q='
  private readonly HISTORY_API = 'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get'
  private readonly NEWS_API = 'https://finance.qq.com/api/news'

  // 请求配置
  private readonly timeout = 10000
  private readonly headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'https://finance.qq.com/'
  }

  // 缓存
  private stockListCache: Stock[] | null = null
  private stockListCacheTime: number = 0
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24小时

  /**
   * 格式化股票代码为腾讯格式
   * 000001.SZ -> sz000001
   * 600000.SH -> sh600000
   */
  private formatSymbolForTencent(symbol: string): string {
    if (symbol.includes('.')) {
      const [code, market] = symbol.split('.')
      return market.toLowerCase() + code
    }
    return symbol
  }

  /**
   * 格式化腾讯代码为标准格式
   * sz000001 -> 000001.SZ
   * sh600000 -> 600000.SH
   */
  private formatSymbolFromTencent(tencentSymbol: string): string {
    if (tencentSymbol.startsWith('sz')) {
      return tencentSymbol.substring(2) + '.SZ'
    } else if (tencentSymbol.startsWith('sh')) {
      return tencentSymbol.substring(2) + '.SH'
    }
    return tencentSymbol
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

      // 使用预定义的热门股票列表
      const popularStocks = [
        { symbol: '000001.SZ', name: '平安银行' },
        { symbol: '000002.SZ', name: '万科A' },
        { symbol: '000858.SZ', name: '五粮液' },
        { symbol: '002415.SZ', name: '海康威视' },
        { symbol: '600000.SH', name: '浦发银行' },
        { symbol: '600036.SH', name: '招商银行' },
        { symbol: '600519.SH', name: '贵州茅台' },
        { symbol: '600887.SH', name: '伊利股份' },
        { symbol: '000858.SZ', name: '五粮液' },
        { symbol: '002594.SZ', name: 'BYD' }
      ]

      // 验证这些股票的可用性
      const symbols = popularStocks.map(s => this.formatSymbolForTencent(s.symbol)).join(',')

      try {
        const response = await axios.get(`${this.QUOTE_API}${symbols}`, {
          timeout: this.timeout,
          headers: this.headers
        })

        if (response.data) {
          const stocks: Stock[] = popularStocks.map(stock => ({
            symbol: stock.symbol,
            name: stock.name,
            market: stock.symbol.endsWith('.SH') ? 'SH' : 'SZ',
            listDate: '',
            industry: '',
            area: ''
          }))

          // 更新缓存
          this.stockListCache = stocks
          this.stockListCacheTime = Date.now()

          return stocks
        }
      } catch (error) {
        console.warn('腾讯API验证失败，返回预定义列表:', error)
      }

      // 如果API调用失败，直接返回预定义列表
      const stocks: Stock[] = popularStocks.map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        market: stock.symbol.endsWith('.SH') ? 'SH' : 'SZ',
        listDate: '',
        industry: '',
        area: ''
      }))

      this.stockListCache = stocks
      this.stockListCacheTime = Date.now()

      return stocks
    } catch (error) {
      throw new Error(`腾讯财经股票列表获取失败: ${error.message}`)
    }
  }

  /**
   * 获取股票实时行情
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    try {
      const tencentSymbol = this.formatSymbolForTencent(symbol)
      const response = await axios.get(`${this.QUOTE_API}${tencentSymbol}`, {
        timeout: this.timeout,
        headers: this.headers
      })

      if (!response.data) {
        throw new Error('无数据返回')
      }

      // 解析腾讯财经返回的数据格式
      // 格式: v_sz000001="1~平安银行~000001~13.50~13.48~13.48~181626~91664~89962~13.50~4~13.49~5~13.51~1~13.52~1~13.53~1~13.48~1~13.47~1~13.46~1~13.45~1~13.44~1~~20231201155959~0.02~0.15~13.50~13.35~13.50/181626/245064896~181626~24507~0.78~8.06~~13.50~13.35~1.11~1063.64~1063.64~1.07~14.31~11.26~1.20~-3734~13.48~6.77~7.29~~~1.11~245064896.00~0.00~0~ ~GP-A~-0.74~1.11~0.78~8.06~8.06~2.95~13.89~10.95~2.95~-27.69~-27.69";

      const dataStr = response.data
      const match = dataStr.match(/="([^"]+)"/)

      if (!match) {
        throw new Error('数据格式解析失败')
      }

      const fields = match[1].split('~')

      if (fields.length < 50) {
        throw new Error('数据字段不完整')
      }

      const quote: StockQuote = {
        symbol: symbol,
        name: fields[1] || '',
        price: parseFloat(fields[3]) || 0,
        change: parseFloat(fields[31]) || 0,
        changePercent: parseFloat(fields[32]) || 0,
        open: parseFloat(fields[5]) || 0,
        high: parseFloat(fields[33]) || 0,
        low: parseFloat(fields[34]) || 0,
        volume: parseInt(fields[6]) || 0,
        amount: parseFloat(fields[37]) || 0,
        turnover: parseFloat(fields[38]) || 0,
        pe: parseFloat(fields[39]) || 0,
        pb: parseFloat(fields[46]) || 0,
        marketCap: parseFloat(fields[45]) || 0,
        timestamp: new Date().toISOString(),
        preClose: parseFloat(fields[4]) || 0
      }

      return quote
    } catch (error) {
      throw new Error(`腾讯财经行情获取失败: ${error.message}`)
    }
  }

  /**
   * 获取股票历史数据
   */
  async getStockHistory(symbol: string, period: string = 'day', startDate?: string, endDate?: string): Promise<StockData[]> {
    try {
      const tencentSymbol = this.formatSymbolForTencent(symbol)

      // 构建请求参数
      const params = {
        param: `${tencentSymbol},${period},${startDate || '2023-01-01'},${endDate || new Date().toISOString().split('T')[0]},320,qfq`
      }

      const response = await axios.get(this.HISTORY_API, {
        params,
        timeout: this.timeout,
        headers: this.headers
      })

      if (!response.data || !response.data.data) {
        throw new Error('历史数据获取失败')
      }

      const historyData = response.data.data[tencentSymbol]

      if (!historyData || !historyData.qfqday) {
        throw new Error('历史数据格式错误')
      }

      const stockData: StockData[] = historyData.qfqday.map((item: string[]) => ({
        date: item[0],
        open: parseFloat(item[1]),
        close: parseFloat(item[2]),
        high: parseFloat(item[3]),
        low: parseFloat(item[4]),
        volume: parseInt(item[5]),
        amount: parseFloat(item[6] || '0'),
        symbol: symbol
      }))

      return stockData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    } catch (error) {
      throw new Error(`腾讯财经历史数据获取失败: ${error.message}`)
    }
  }

  /**
   * 搜索股票
   */
  async searchStocks(keyword: string): Promise<Stock[]> {
    try {
      // 腾讯没有直接的搜索API，从缓存的股票列表中搜索
      const stocks = await this.getStocks()

      return stocks.filter(stock =>
        stock.symbol.includes(keyword.toUpperCase()) ||
        stock.name.includes(keyword)
      )
    } catch (error) {
      throw new Error(`腾讯财经股票搜索失败: ${error.message}`)
    }
  }

  /**
   * 获取财经新闻
   */
  async getNews(limit: number = 20): Promise<FinancialNews[]> {
    try {
      // 腾讯财经新闻API相对复杂，这里提供基础实现
      const news: FinancialNews[] = [
        {
          id: '1',
          title: '腾讯财经新闻功能开发中',
          summary: '该功能正在开发中，敬请期待',
          content: '',
          publishTime: new Date().toISOString(),
          source: '腾讯财经',
          url: 'https://finance.qq.com'
        }
      ]

      return news.slice(0, limit)
    } catch (error) {
      throw new Error(`腾讯财经新闻获取失败: ${error.message}`)
    }
  }

  /**
   * 获取数据源信息
   */
  getSourceInfo() {
    return {
      name: this.name,
      displayName: this.displayName,
      description: '腾讯财经增强版数据源，直接调用腾讯API',
      features: ['实时行情', '历史数据', '股票搜索'],
      limitations: ['新闻功能有限', '股票列表为预定义'],
      rateLimit: '每秒可调用数十次',
      cost: '完全免费'
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
    return '腾讯财经增强版数据源，直接调用腾讯API，稳定可靠'
  }

  /**
   * 获取数据源类型
   */
  getType(): any {
    return 'tencent_enhanced'
  }

  /**
   * 测试数据源连接
   */
  async testConnection(): Promise<boolean> {
    try {
      // 测试获取一个简单的股票行情
      const testSymbol = '000001.SZ' // 平安银行
      const quote = await this.getStockQuote(testSymbol)

      // 检查返回的数据是否有效
      return !!(quote && quote.symbol && quote.price > 0)
    } catch (error) {
      console.error('腾讯财经增强版连接测试失败:', error)
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

export default TencentEnhancedDataSource
