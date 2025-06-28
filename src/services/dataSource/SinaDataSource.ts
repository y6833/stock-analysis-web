import type DataSourceInterface from './DataSourceInterface'
import axios from 'axios'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'
import type { DataSourceType } from './DataSourceFactory'

/**
 * 新浪财经数据源实现
 */
export class SinaDataSource implements DataSourceInterface {
  // 新浪财经API基础URL
  private readonly SINA_API_URL = '/api/sina'
  private readonly SINA_FINANCE_URL = 'https://finance.sina.com.cn'

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
        const response = await axios.get(`${this.SINA_API_URL}/stock-list`)

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const stocks: Stock[] = response.data.data.map((item: any) => ({
            symbol: item.symbol,
            name: item.name,
            market: item.market || (item.symbol.startsWith('sh') ? '上海' : '深圳'),
            industry: item.industry || '未知',
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
        { symbol: 'sh000001', name: '上证指数', market: '上海', industry: '指数' },
        { symbol: 'sz399001', name: '深证成指', market: '深圳', industry: '指数' },
        { symbol: 'sh600519', name: '贵州茅台', market: '上海', industry: '白酒' },
        { symbol: 'sh601318', name: '中国平安', market: '上海', industry: '保险' },
        { symbol: 'sh600036', name: '招商银行', market: '上海', industry: '银行' },
        { symbol: 'sz000858', name: '五粮液', market: '深圳', industry: '白酒' },
        { symbol: 'sz000333', name: '美的集团', market: '深圳', industry: '家电' },
        { symbol: 'sh601166', name: '兴业银行', market: '上海', industry: '银行' },
        { symbol: 'sz002415', name: '海康威视', market: '深圳', industry: '电子' },
        { symbol: 'sh600276', name: '恒瑞医药', market: '上海', industry: '医药' },
        { symbol: 'sh601398', name: '工商银行', market: '上海', industry: '银行' },
        { symbol: 'sh600000', name: '浦发银行', market: '上海', industry: '银行' },
        { symbol: 'sz000001', name: '平安银行', market: '深圳', industry: '银行' },
        // 可以添加更多股票
      ]

      // 更新缓存
      this.stockListCache = mainStocks
      this.stockListCacheTime = Date.now()

      return mainStocks
    } catch (error) {
      console.error('新浪财经获取股票列表失败:', error)
      throw error
    }
  }

  /**
   * 获取单个股票数据
   * @param symbol 股票代码
   */
  async getStockData(symbol: string): Promise<StockData> {
    try {
      // 确保股票代码格式正确（新浪使用sh/sz前缀）
      const formattedSymbol = this.formatSymbol(symbol)

      // 尝试通过后端代理获取历史数据
      try {
        const response = await axios.get(`${this.SINA_API_URL}/history`, {
          params: {
            symbol: formattedSymbol,
            period: 'daily',
            count: 90,
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

      // 不生成模拟数据，抛出错误
      throw new Error(`新浪财经数据源获取股票${symbol}历史数据失败，API不可用`)

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
      console.error(`新浪财经获取股票${symbol}数据失败:`, error)
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
        const response = await axios.get(`${this.SINA_API_URL}/search`, {
          params: {
            keyword: query,
          },
        })

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          return response.data.data.map((item: any) => ({
            symbol: item.symbol,
            name: item.name,
            market: item.market || (item.symbol.startsWith('sh') ? '上海' : '深圳'),
            industry: item.industry || '未知',
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
      console.error('新浪财经搜索股票失败:', error)
      throw error
    }
  }

  /**
   * 获取股票实时行情
   * @param symbol 股票代码
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    try {
      // 确保股票代码格式正确（新浪使用sh/sz前缀）
      const formattedSymbol = this.formatSymbol(symbol)

      // 通过后端代理请求新浪财经API
      const response = await axios.get(`${this.SINA_API_URL}/quote`, {
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

      // 如果后端代理未实现或返回格式不正确，尝试直接解析响应
      const data = response.data
      const match = typeof data === 'string' ? data.match(/var hq_str_[^=]+=("[^"]+")/) : null

      if (!match) {
        throw new Error('无法解析新浪财经API响应')
      }

      const stockData = JSON.parse(match[1]).split(',')

      // 解析股票数据
      const stockName = stockData[0]
      const open = parseFloat(stockData[1])
      const preClose = parseFloat(stockData[2])
      const price = parseFloat(stockData[3])
      const high = parseFloat(stockData[4])
      const low = parseFloat(stockData[5])
      const volume = parseInt(stockData[8])
      const amount = parseFloat(stockData[9])

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
    } catch (error) {
      console.error(`新浪财经获取股票${symbol}行情失败:`, error)
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
        const response = await axios.get(`${this.SINA_API_URL}/news`, {
          params: {
            count,
          },
        })

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const news: FinancialNews[] = response.data.data.map((item: any) => ({
            title: item.title,
            time: item.time,
            source: item.source || '新浪财经',
            url: item.url || `${this.SINA_FINANCE_URL}/news/`,
            important: item.important || false,
            content: item.content || '',
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
          source: '新浪财经',
          url: `${this.SINA_FINANCE_URL}/news/`,
          important: true,
        },
        {
          title: '科技板块全线上涨，半导体行业领涨',
          time: '30分钟前',
          source: '新浪财经',
          url: `${this.SINA_FINANCE_URL}/news/`,
          important: false,
        },
        {
          title: '多家券商上调A股目标位，看好下半年行情',
          time: '1小时前',
          source: '新浪财经',
          url: `${this.SINA_FINANCE_URL}/news/`,
          important: false,
        },
        {
          title: '外资连续三日净流入，北向资金今日净买入超50亿',
          time: '2小时前',
          source: '新浪财经',
          url: `${this.SINA_FINANCE_URL}/news/`,
          important: false,
        },
        {
          title: '新能源汽车销量创新高，相关概念股受关注',
          time: '3小时前',
          source: '新浪财经',
          url: `${this.SINA_FINANCE_URL}/news/`,
          important: false,
        },
        {
          title: '国常会：进一步扩大内需，促进消费持续恢复',
          time: '4小时前',
          source: '新浪财经',
          url: `${this.SINA_FINANCE_URL}/news/`,
          important: true,
        },
        {
          title: '两部门：加大对先进制造业支持力度，优化融资环境',
          time: '5小时前',
          source: '新浪财经',
          url: `${this.SINA_FINANCE_URL}/news/`,
          important: false,
        },
      ]

      // 随机打乱新闻顺序
      const shuffledNews = [...mockNews].sort(() => Math.random() - 0.5)

      // 返回指定数量的新闻
      return shuffledNews.slice(0, count)
    } catch (error) {
      console.error('新浪财经获取财经新闻失败:', error)
      throw error
    }
  }

  /**
   * 获取数据源名称
   */
  getName(): string {
    return '新浪财经'
  }

  /**
   * 获取数据源描述
   */
  getDescription(): string {
    return '提供实时行情数据，无需注册直接调用'
  }

  /**
   * 获取数据源类型
   */
  getType(): DataSourceType {
    return 'sina'
  }

  /**
   * 测试数据源连接
   */
  async testConnection(): Promise<boolean> {
    try {
      // 检查当前选择的数据源
      const currentDataSource = localStorage.getItem('preferredDataSource') || 'tushare'

      // 使用新的通用数据源API
      console.log('测试新浪财经数据源连接')

      // 使用新的API路径，传递source参数和当前数据源参数
      const response = await axios.get('/api/data-source/test', {
        params: {
          source: 'sina',
          currentSource: currentDataSource,
        },
      })

      // 检查响应
      if (response.data && response.data.success) {
        console.log(`新浪财经连接测试成功: ${response.data.message || '连接正常'}`)
        return true
      }

      // 如果新API未实现，尝试通过后端代理测试连接
      const fallbackResponse = await axios.get(`${this.SINA_API_URL}/test`)

      // 检查响应
      if (fallbackResponse.data && fallbackResponse.data.success) {
        return true
      }

      // 如果后端代理未实现测试接口，尝试获取上证指数行情
      await this.getStockQuote('sh000001')
      return true
    } catch (error) {
      console.error('新浪财经数据源连接测试失败:', error)
      return false
    }
  }

  /**
   * 格式化股票代码
   * @param symbol 股票代码
   * @returns 格式化后的股票代码
   */
  private formatSymbol(symbol: string): string {
    // 如果已经包含sh或sz前缀，直接返回
    if (symbol.startsWith('sh') || symbol.startsWith('sz')) {
      return symbol
    }

    // 如果包含.SH或.SZ后缀，转换为sh或sz前缀
    if (symbol.endsWith('.SH')) {
      return 'sh' + symbol.slice(0, -3)
    }
    if (symbol.endsWith('.SZ')) {
      return 'sz' + symbol.slice(0, -3)
    }

    // 根据股票代码规则添加前缀
    if (symbol.startsWith('6')) {
      return 'sh' + symbol
    } else if (symbol.startsWith('0') || symbol.startsWith('3')) {
      return 'sz' + symbol
    } else if (symbol.startsWith('4') || symbol.startsWith('8')) {
      return 'bj' + symbol // 北交所
    }

    // 默认返回原始代码
    return symbol
  }
}
