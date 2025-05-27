import type DataSourceInterface from './DataSourceInterface'
import axios from 'axios'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'

/**
 * 聚合数据源实现
 * 专业数据服务平台，提供实时股票交易数据
 */
export class JuheDataSource implements DataSourceInterface {
  // 聚合数据API基础URL
  private readonly JUHE_API_URL = '/api/juhe'

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

      console.log('从聚合数据获取股票列表数据')

      // 尝试通过后端代理获取股票列表
      try {
        const response = await axios.get(`${this.JUHE_API_URL}/stock-list`)

        // 检查响应
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const stocks: Stock[] = response.data.data.map((item: any) => ({
            symbol: item.gid || item.symbol,
            name: item.name,
            market: item.market || (item.gid?.includes('sh') ? '上海' : item.gid?.includes('sz') ? '深圳' : '未知'),
            industry: item.industry || '未知',
          }))

          // 更新缓存
          this.stockListCache = stocks
          this.stockListCacheTime = Date.now()

          // 如果有消息，显示
          if (response.data.message) {
            console.log(`聚合数据股票列表: ${response.data.message}`)
          }

          return stocks
        }
      } catch (proxyError) {
        console.warn('通过后端代理获取股票列表失败，使用预定义列表:', proxyError)
      }

      // 如果API调用失败，返回预定义的A股列表
      const fallbackStocks: Stock[] = [
        { symbol: 'sh000001', name: '上证指数', market: '上海', industry: '指数' },
        { symbol: 'sz399001', name: '深证成指', market: '深圳', industry: '指数' },
        { symbol: 'sz399006', name: '创业板指', market: '深圳', industry: '指数' },
        { symbol: 'sh000300', name: '沪深300', market: '上海', industry: '指数' },
        { symbol: 'sh600519', name: '贵州茅台', market: '上海', industry: '食品饮料' },
        { symbol: 'sh600036', name: '招商银行', market: '上海', industry: '银行' },
        { symbol: 'sz000858', name: '五粮液', market: '深圳', industry: '食品饮料' },
        { symbol: 'sz000001', name: '平安银行', market: '深圳', industry: '银行' },
      ]

      console.log('使用预定义A股列表')
      return fallbackStocks
    } catch (error) {
      console.error('聚合数据获取股票列表失败:', error)
      throw error
    }
  }

  /**
   * 获取单个股票数据
   * @param symbol 股票代码
   */
  async getStockData(symbol: string): Promise<StockData> {
    try {
      console.log(`从聚合数据获取股票${symbol}数据`)

      // 尝试通过后端代理获取股票数据
      try {
        const response = await axios.get(`${this.JUHE_API_URL}/stock-data`, {
          params: { gid: symbol }
        })

        // 检查响应
        if (response.data && response.data.success && response.data.data) {
          const data = response.data.data

          const stockData: StockData = {
            symbol: data.gid || symbol,
            name: data.name || '未知',
            price: parseFloat(data.nowpri) || 0,
            change: parseFloat(data.increase) || 0,
            changePercent: parseFloat(data.increPer) || 0,
            volume: parseInt(data.traAmount) || 0,
            turnover: parseFloat(data.traNumber) || 0,
            high: parseFloat(data.todayMax) || 0,
            low: parseFloat(data.todayMin) || 0,
            open: parseFloat(data.todayStartPri) || 0,
            close: parseFloat(data.yestodEndPri) || 0,
            marketCap: 0, // 聚合数据不提供市值
            pe: 0, // 聚合数据不提供PE
            pb: 0, // 聚合数据不提供PB
            timestamp: Date.now(),
          }

          // 如果有消息，显示
          if (response.data.message) {
            console.log(`聚合数据股票数据: ${response.data.message}`)
          }

          return stockData
        }
      } catch (proxyError) {
        console.warn('通过后端代理获取股票数据失败，使用模拟数据:', proxyError)
      }

      // 如果API调用失败，返回模拟数据
      const mockData: StockData = {
        symbol,
        name: '聚合数据-模拟数据',
        price: 10.00 + Math.random() * 50,
        change: (Math.random() - 0.5) * 2,
        changePercent: (Math.random() - 0.5) * 10,
        volume: Math.floor(Math.random() * 1000000),
        turnover: Math.floor(Math.random() * 100000000),
        high: 10.00 + Math.random() * 50,
        low: 10.00 + Math.random() * 50,
        open: 10.00 + Math.random() * 50,
        close: 10.00 + Math.random() * 50,
        marketCap: 0, // 聚合数据不提供
        pe: 0, // 聚合数据不提供
        pb: 0, // 聚合数据不提供
        timestamp: Date.now(),
      }

      console.log('使用模拟股票数据')
      return mockData
    } catch (error) {
      console.error(`聚合数据获取股票${symbol}数据失败:`, error)
      throw error
    }
  }

  /**
   * 搜索股票
   * @param query 搜索关键词
   */
  async searchStocks(query: string): Promise<Stock[]> {
    try {
      console.log(`聚合数据搜索股票: ${query}`)

      // 聚合数据不提供搜索功能，从本地股票列表中过滤
      const allStocks = await this.getStocks()
      const filteredStocks = allStocks.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
          stock.name.toLowerCase().includes(query.toLowerCase())
      )

      console.log(`本地过滤搜索结果: ${filteredStocks.length}条`)
      return filteredStocks
    } catch (error) {
      console.error(`聚合数据搜索股票失败:`, error)
      throw error
    }
  }

  /**
   * 获取股票实时行情
   * @param symbol 股票代码
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    try {
      console.log(`从聚合数据获取股票${symbol}实时行情`)

      // 尝试通过后端代理获取实时行情
      try {
        const response = await axios.get(`${this.JUHE_API_URL}/quote`, {
          params: { gid: symbol }
        })

        // 检查响应
        if (response.data && response.data.success && response.data.data) {
          const data = response.data.data

          const quote: StockQuote = {
            symbol: data.gid || symbol,
            name: data.name || '未知',
            price: parseFloat(data.nowpri) || 0,
            change: parseFloat(data.increase) || 0,
            changePercent: parseFloat(data.increPer) || 0,
            volume: parseInt(data.traAmount) || 0,
            timestamp: Date.now(),
          }

          // 如果有消息，显示
          if (response.data.message) {
            console.log(`聚合数据实时行情: ${response.data.message}`)
          }

          return quote
        }
      } catch (proxyError) {
        console.warn('通过后端代理获取实时行情失败，使用模拟数据:', proxyError)
      }

      // 如果API调用失败，返回模拟数据
      const mockQuote: StockQuote = {
        symbol,
        name: '聚合数据-模拟行情',
        price: 10.00 + Math.random() * 50,
        change: (Math.random() - 0.5) * 2,
        changePercent: (Math.random() - 0.5) * 10,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: Date.now(),
      }

      console.log('使用模拟实时行情数据')
      return mockQuote
    } catch (error) {
      console.error(`聚合数据获取股票${symbol}实时行情失败:`, error)
      throw error
    }
  }

  /**
   * 获取财经新闻
   * @param limit 新闻数量限制
   */
  async getFinancialNews(limit: number = 10): Promise<FinancialNews[]> {
    try {
      console.log(`从聚合数据获取财经新闻，限制${limit}条`)

      // 聚合数据主要提供股票实时交易数据，不提供新闻
      // 返回空数组
      const mockNews: FinancialNews[] = [
        {
          id: '1',
          title: '聚合数据：专业数据服务平台',
          summary: '聚合数据提供实时股票交易数据，每天免费调用50次',
          url: '#',
          publishTime: Date.now(),
          source: '聚合数据',
        },
      ]

      console.log('聚合数据不提供新闻功能，返回模拟数据')
      return mockNews.slice(0, limit)
    } catch (error) {
      console.error('聚合数据获取财经新闻失败:', error)
      throw error
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('测试聚合数据连接')

      // 尝试获取股票列表来测试连接
      const response = await axios.get(`${this.JUHE_API_URL}/test`, {
        timeout: 5000
      })

      if (response.status === 200) {
        console.log('聚合数据连接测试成功')
        return true
      }

      return false
    } catch (error) {
      console.error('聚合数据连接测试失败:', error)
      return false
    }
  }

  /**
   * 获取数据源名称
   */
  getName(): string {
    return '聚合数据'
  }

  /**
   * 获取数据源描述
   */
  getDescription(): string {
    return '专业数据服务平台，提供实时股票交易数据'
  }
}
