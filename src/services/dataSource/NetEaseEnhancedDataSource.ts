import type DataSourceInterface from './DataSourceInterface'
import axios from 'axios'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'

/**
 * 网易财经增强版数据源实现
 * 专注于历史数据获取，数据质量高且完整
 */
export class NetEaseEnhancedDataSource implements DataSourceInterface {
  private readonly name = 'netease-enhanced'
  private readonly displayName = '网易财经(增强版)'

  // 网易财经API地址
  private readonly HISTORY_API = 'http://quotes.money.163.com/service/chddata.html'
  private readonly QUOTE_API = 'http://api.money.126.net/data/feed/'

  // 请求配置
  private readonly timeout = 15000
  private readonly headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'http://quotes.money.163.com/'
  }

  // 缓存
  private stockListCache: Stock[] | null = null
  private stockListCacheTime: number = 0
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24小时

  /**
   * 格式化股票代码为网易格式
   * 000001.SZ -> 0000001 (深圳股票前面加0)
   * 600000.SH -> 0600000 (上海股票前面加0)
   */
  private formatSymbolForNetEase(symbol: string): string {
    if (symbol.includes('.')) {
      const [code, market] = symbol.split('.')
      return '0' + code
    }
    return symbol
  }

  /**
   * 格式化网易代码为标准格式
   */
  private formatSymbolFromNetEase(neteaseSymbol: string): string {
    const code = neteaseSymbol.substring(1) // 去掉前面的0

    // 根据代码判断市场
    if (code.startsWith('6')) {
      return code + '.SH'
    } else if (code.startsWith('0') || code.startsWith('3')) {
      return code + '.SZ'
    }
    return code
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

      // 网易没有直接的股票列表API，使用预定义列表
      const popularStocks = [
        { symbol: '000001.SZ', name: '平安银行', industry: '银行' },
        { symbol: '000002.SZ', name: '万科A', industry: '房地产' },
        { symbol: '000858.SZ', name: '五粮液', industry: '食品饮料' },
        { symbol: '002415.SZ', name: '海康威视', industry: '电子' },
        { symbol: '002594.SZ', name: 'BYD', industry: '汽车' },
        { symbol: '600000.SH', name: '浦发银行', industry: '银行' },
        { symbol: '600036.SH', name: '招商银行', industry: '银行' },
        { symbol: '600519.SH', name: '贵州茅台', industry: '食品饮料' },
        { symbol: '600887.SH', name: '伊利股份', industry: '食品饮料' },
        { symbol: '000300.SH', name: '沪深300', industry: '指数' }
      ]

      const stocks: Stock[] = popularStocks.map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        market: stock.symbol.endsWith('.SH') ? 'SH' : 'SZ',
        listDate: '',
        industry: stock.industry,
        area: ''
      }))

      // 更新缓存
      this.stockListCache = stocks
      this.stockListCacheTime = Date.now()

      return stocks
    } catch (error) {
      throw new Error(`网易财经股票列表获取失败: ${error.message}`)
    }
  }

  /**
   * 获取股票实时行情
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    try {
      const neteaseSymbol = this.formatSymbolForNetEase(symbol)
      const response = await axios.get(`${this.QUOTE_API}${neteaseSymbol}`, {
        timeout: this.timeout,
        headers: this.headers
      })

      if (!response.data) {
        throw new Error('无数据返回')
      }

      // 网易返回的是JSONP格式，需要解析
      const dataStr = response.data
      const match = dataStr.match(/\{[^}]+\}/)

      if (!match) {
        throw new Error('数据格式解析失败')
      }

      const data = JSON.parse(match[0])
      const stockData = data[neteaseSymbol]

      if (!stockData) {
        throw new Error('股票数据不存在')
      }

      const quote: StockQuote = {
        symbol: symbol,
        name: stockData.name || '',
        price: parseFloat(stockData.price) || 0,
        change: parseFloat(stockData.updown) || 0,
        changePercent: parseFloat(stockData.percent) || 0,
        open: parseFloat(stockData.open) || 0,
        high: parseFloat(stockData.high) || 0,
        low: parseFloat(stockData.low) || 0,
        volume: parseInt(stockData.volume) || 0,
        amount: parseFloat(stockData.turnover) || 0,
        turnover: 0, // 网易API不直接提供
        pe: 0, // 网易API不直接提供
        pb: 0, // 网易API不直接提供
        marketCap: 0, // 网易API不直接提供
        timestamp: new Date().toISOString(),
        preClose: parseFloat(stockData.yestclose) || 0
      }

      return quote
    } catch (error) {
      throw new Error(`网易财经行情获取失败: ${error.message}`)
    }
  }

  /**
   * 获取股票历史数据 - 网易的强项
   */
  async getStockHistory(symbol: string, period: string = 'day', startDate?: string, endDate?: string): Promise<StockData[]> {
    try {
      const neteaseSymbol = this.formatSymbolForNetEase(symbol)

      // 格式化日期
      const start = startDate ? startDate.replace(/-/g, '') : '20230101'
      const end = endDate ? endDate.replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '')

      // 构建请求参数
      const params = {
        code: neteaseSymbol,
        start: start,
        end: end,
        fields: 'TCLOSE,HIGH,LOW,TOPEN,LCLOSE,CHG,PCHG,TURNOVER,VOTURNOVER,VATURNOVER'
      }

      const response = await axios.get(this.HISTORY_API, {
        params,
        timeout: this.timeout,
        headers: this.headers,
        responseType: 'text' // 网易返回CSV格式
      })

      if (!response.data) {
        throw new Error('历史数据获取失败')
      }

      // 解析CSV数据
      const lines = response.data.split('\n')
      const stockData: StockData[] = []

      // 跳过标题行
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const fields = line.split(',')
        if (fields.length < 10) continue

        try {
          const data: StockData = {
            date: fields[0], // 日期
            open: parseFloat(fields[3]) || 0, // 开盘价
            close: parseFloat(fields[1]) || 0, // 收盘价
            high: parseFloat(fields[2]) || 0, // 最高价
            low: parseFloat(fields[4]) || 0, // 最低价
            volume: parseInt(fields[7]) || 0, // 成交量
            amount: parseFloat(fields[8]) || 0, // 成交额
            symbol: symbol
          }

          stockData.push(data)
        } catch (parseError) {
          console.warn('解析数据行失败:', line, parseError)
          continue
        }
      }

      // 按日期排序
      return stockData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    } catch (error) {
      throw new Error(`网易财经历史数据获取失败: ${error.message}`)
    }
  }

  /**
   * 搜索股票
   */
  async searchStocks(keyword: string): Promise<Stock[]> {
    try {
      const stocks = await this.getStocks()

      return stocks.filter(stock =>
        stock.symbol.includes(keyword.toUpperCase()) ||
        stock.name.includes(keyword)
      )
    } catch (error) {
      throw new Error(`网易财经股票搜索失败: ${error.message}`)
    }
  }

  /**
   * 获取财经新闻
   */
  async getNews(limit: number = 20): Promise<FinancialNews[]> {
    try {
      // 网易财经新闻API较复杂，这里提供基础实现
      const news: FinancialNews[] = [
        {
          id: '1',
          title: '网易财经新闻功能开发中',
          summary: '该功能正在开发中，敬请期待',
          content: '',
          publishTime: new Date().toISOString(),
          source: '网易财经',
          url: 'http://money.163.com'
        }
      ]

      return news.slice(0, limit)
    } catch (error) {
      throw new Error(`网易财经新闻获取失败: ${error.message}`)
    }
  }

  /**
   * 获取数据源信息
   */
  getSourceInfo() {
    return {
      name: this.name,
      displayName: this.displayName,
      description: '网易财经增强版数据源，专注于高质量历史数据',
      features: ['完整历史数据', '复权数据', 'CSV格式下载'],
      limitations: ['实时数据有限', '新闻功能有限'],
      rateLimit: '调用限制宽松',
      cost: '完全免费',
      strengths: ['历史数据完整', '数据质量高', '支持长期历史数据']
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
    return '网易财经增强版数据源，专注于高质量历史数据'
  }

  /**
   * 获取数据源类型
   */
  getType(): any {
    return 'netease_enhanced'
  }

  /**
   * 测试数据源连接
   */
  async testConnection(): Promise<boolean> {
    try {
      // 尝试多个网易财经API端点
      const testUrls = [
        'http://quotes.money.163.com/service/chddata.html?code=0000001&start=20240101&end=20240102&fields=TCLOSE',
        'https://quotes.money.163.com/service/chddata.html?code=0000001&start=20240101&end=20240102&fields=TCLOSE',
        'http://api.money.126.net/data/feed/0000001,money.api'
      ];

      for (const url of testUrls) {
        try {
          const response = await axios.get(url, {
            headers: this.headers,
            timeout: 10000
          });

          if (response.status === 200 && response.data) {
            console.log('网易财经增强版：找到可用端点', url);
            return true;
          }
        } catch (error) {
          console.warn('网易财经端点失败:', url, error.message);
          continue;
        }
      }

      return false;
    } catch (error) {
      console.error('网易财经增强版连接测试失败:', error)
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

export default NetEaseEnhancedDataSource
