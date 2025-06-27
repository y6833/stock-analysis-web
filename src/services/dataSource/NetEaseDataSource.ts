import type DataSourceInterface from './DataSourceInterface'
import axios from 'axios'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'

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
        console.warn('通过后端代理获取股票列表失败，使用预定义列表:', proxyError)
      }

      // 如果后端代理未实现或返回格式不正确，使用预定义的主要股票列表
      const mainStocks: Stock[] = [
        { symbol: '0000001', name: '上证指数', market: '上海', industry: '指数' },
        { symbol: '1399001', name: '深证成指', market: '深圳', industry: '指数' },
        { symbol: '0600519', name: '贵州茅台', market: '上海', industry: '白酒' },
        { symbol: '0601318', name: '中国平安', market: '上海', industry: '保险' },
        { symbol: '0600036', name: '招商银行', market: '上海', industry: '银行' },
        { symbol: '1000858', name: '五粮液', market: '深圳', industry: '白酒' },
        { symbol: '1000333', name: '美的集团', market: '深圳', industry: '家电' },
        { symbol: '0601166', name: '兴业银行', market: '上海', industry: '银行' },
        { symbol: '1002415', name: '海康威视', market: '深圳', industry: '电子' },
        { symbol: '0600276', name: '恒瑞医药', market: '上海', industry: '医药' },
        { symbol: '0601398', name: '工商银行', market: '上海', industry: '银行' },
        { symbol: '0600000', name: '浦发银行', market: '上海', industry: '银行' },
        { symbol: '1000001', name: '平安银行', market: '深圳', industry: '银行' },
        // 可以添加更多股票
      ]

      // 更新缓存
      this.stockListCache = mainStocks
      this.stockListCacheTime = Date.now()

      return mainStocks
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

      // 生成180天的模拟历史数据
      for (let i = 180; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        dates.push(date.toISOString().split('T')[0])

        // 生成价格（基于随机波动）
        if (i === 180) {
          // 第一天的价格
          prices.push(basePrice * 0.9) // 假设180天前的价格是当前价格的90%
        } else {
          // 后续价格基于前一天的价格加上随机波动
          const prevPrice = prices[prices.length - 1]
          const change = prevPrice * (Math.random() * 0.06 - 0.03) // -3% 到 +3% 的随机波动
          const newPrice = Math.max(prevPrice + change, 1) // 确保价格不会低于1
          prices.push(parseFloat(newPrice.toFixed(2)))
        }

        // 生成成交量
        const volume = Math.floor(Math.random() * 10000000) + 1000000
        volumes.push(volume)
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

      // 如果后端代理未实现或返回格式不正确，使用模拟数据
      return this.generateMockStockQuote(symbol)
    } catch (error) {
      console.error(`网易财经获取股票${symbol}行情失败:`, error)
      // 如果API请求失败，使用模拟数据
      return this.generateMockStockQuote(symbol)
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
        console.warn('通过后端代理获取财经新闻失败，使用模拟数据:', proxyError)
      }

      // 如果后端代理未实现或返回格式不正确，使用模拟数据
      const mockNews: FinancialNews[] = [
        {
          title: '央行宣布降准0.5个百分点，释放长期资金约1万亿元',
          time: '10分钟前',
          source: '网易财经',
          url: `${this.NETEASE_FINANCE_URL}/news/`,
          important: true,
        },
        {
          title: '科技板块全线上涨，半导体行业领涨',
          time: '30分钟前',
          source: '网易财经',
          url: `${this.NETEASE_FINANCE_URL}/news/`,
          important: false,
        },
        {
          title: '多家券商上调A股目标位，看好下半年行情',
          time: '1小时前',
          source: '网易财经',
          url: `${this.NETEASE_FINANCE_URL}/news/`,
          important: false,
        },
        {
          title: '外资连续三日净流入，北向资金今日净买入超50亿',
          time: '2小时前',
          source: '网易财经',
          url: `${this.NETEASE_FINANCE_URL}/news/`,
          important: false,
        },
        {
          title: '新能源汽车销量创新高，相关概念股受关注',
          time: '3小时前',
          source: '网易财经',
          url: `${this.NETEASE_FINANCE_URL}/news/`,
          important: false,
        },
        {
          title: '国常会：进一步扩大内需，促进消费持续恢复',
          time: '4小时前',
          source: '网易财经',
          url: `${this.NETEASE_FINANCE_URL}/news/`,
          important: true,
        },
        {
          title: '两部门：加大对先进制造业支持力度，优化融资环境',
          time: '5小时前',
          source: '网易财经',
          url: `${this.NETEASE_FINANCE_URL}/news/`,
          important: false,
        },
      ]

      // 随机打乱新闻顺序
      const shuffledNews = [...mockNews].sort(() => Math.random() - 0.5)

      // 返回指定数量的新闻
      return shuffledNews.slice(0, count)
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
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
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

  /**
   * 生成模拟股票行情
   * @param symbol 股票代码
   * @returns 模拟股票行情
   */
  private generateMockStockQuote(symbol: string): StockQuote {
    // 查找股票基本信息
    const stock = this.getStockInfo(symbol)

    // 生成基础价格
    let basePrice = 0
    switch (symbol) {
      case '0000001':
        basePrice = 3000
        break
      case '1399001':
        basePrice = 10000
        break
      case '0600519':
        basePrice = 1800
        break
      case '0601318':
        basePrice = 60
        break
      case '0600036':
        basePrice = 40
        break
      case '1000858':
        basePrice = 150
        break
      case '1000333':
        basePrice = 80
        break
      case '0601166':
        basePrice = 20
        break
      case '1002415':
        basePrice = 35
        break
      case '0600276':
        basePrice = 50
        break
      default:
        basePrice = 100
    }

    // 生成当前价格（基于随机波动）
    const price = basePrice * (1 + (Math.random() * 0.1 - 0.05)) // -5% 到 +5% 的随机波动
    const preClose = basePrice * (1 + (Math.random() * 0.05 - 0.025)) // 昨收价
    const open = preClose * (1 + (Math.random() * 0.03 - 0.015)) // 开盘价
    const high = Math.max(price, open) * (1 + Math.random() * 0.02) // 最高价
    const low = Math.min(price, open) * (1 - Math.random() * 0.02) // 最低价
    const volume = Math.floor(Math.random() * 10000000) + 1000000 // 成交量
    const amount = price * volume // 成交额

    // 计算涨跌幅
    const change = price - preClose
    const pctChg = (change / preClose) * 100

    return {
      symbol,
      name: stock.name,
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
      market: symbol.startsWith('0') ? '上海' : (symbol.startsWith('1') ? '深圳' : '未知'),
      industry: '未知',
    }
  }
}
