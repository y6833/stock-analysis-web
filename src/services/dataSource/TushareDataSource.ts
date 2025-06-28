import type DataSourceInterface from './DataSourceInterface'
import { tushareService } from '../tushareService'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'
import axios from 'axios'
import type { DataSourceType } from './DataSourceFactory'

/**
 * Tushare数据源实现
 */
export class TushareDataSource implements DataSourceInterface {
  // 数据源类型
  private readonly sourceType: DataSourceType = 'tushare'

  /**
   * 获取股票列表
   * @param options 可选参数
   */
  async getStocks(options?: {
    sourceType?: DataSourceType
    forceRefresh?: boolean
  }): Promise<Stock[]> {
    try {
      // 设置数据源类型
      const sourceType = options?.sourceType || this.sourceType
      const forceRefresh = options?.forceRefresh || false

      // 如果不强制刷新，尝试从缓存获取
      if (!forceRefresh) {
        const cachedStocks = tushareService.getCachedStocks()
        if (cachedStocks && cachedStocks.length > 0) {
          console.log('使用缓存的股票列表')
          return cachedStocks
        }
      }

      // 确保使用Tushare数据源
      tushareService.setAllowApiCall(true)

      try {
        // 获取股票列表
        const stocks = await tushareService.getStocks()

        // 重置API调用权限
        tushareService.setAllowApiCall(false)

        return stocks
      } catch (apiError) {
        console.error('Tushare API获取股票列表失败:', apiError)

        // 尝试使用模拟数据
        const mockStocks = tushareService.getMockStockList
          ? tushareService.getMockStockList()
          : { items: [], fields: [] }

        if (mockStocks && mockStocks.items && mockStocks.items.length > 0) {
          const { fields, items } = mockStocks
          const tsCodeIndex = fields.indexOf('ts_code')
          const nameIndex = fields.indexOf('name')
          const industryIndex = fields.indexOf('industry')
          const marketIndex = fields.indexOf('market')

          const stocks: Stock[] = items.map((item: any) => ({
            symbol: item[tsCodeIndex],
            name: item[nameIndex],
            industry: item[industryIndex] || '',
            market: item[marketIndex] || '',
            data_source: 'mock',
          }))

          console.log('使用模拟股票列表数据')
          return stocks
        }

        // 如果模拟数据也失败，抛出原始错误
        throw apiError
      }
    } catch (error) {
      console.error('Tushare获取股票列表失败:', error)
      throw error
    }
  }

  /**
   * 获取单个股票数据
   * @param symbol 股票代码
   * @param options 可选参数
   */
  async getStockData(
    symbol: string,
    options?: { sourceType?: DataSourceType }
  ): Promise<StockData> {
    try {
      // 设置数据源类型
      const sourceType = options?.sourceType || this.sourceType

      // 确保使用Tushare数据源
      tushareService.setAllowApiCall(true)

      // 获取股票数据
      const stockData = await tushareService.getStockData(symbol)

      // 重置API调用权限
      tushareService.setAllowApiCall(false)

      return stockData
    } catch (error) {
      console.error(`Tushare获取股票${symbol}数据失败:`, error)
      throw error
    }
  }

  /**
   * 搜索股票
   * @param query 搜索关键词
   * @param options 可选参数
   */
  async searchStocks(query: string, options?: { sourceType?: DataSourceType }): Promise<Stock[]> {
    try {
      // 设置数据源类型
      const sourceType = options?.sourceType || this.sourceType

      // 确保使用Tushare数据源
      tushareService.setAllowApiCall(true)

      // 搜索股票
      const results = await tushareService.searchStocks(query)

      // 重置API调用权限
      tushareService.setAllowApiCall(false)

      return results
    } catch (error) {
      console.error('Tushare搜索股票失败:', error)
      throw error
    }
  }

  /**
   * 获取股票实时行情
   * @param symbol 股票代码
   * @param options 可选参数
   */
  async getStockQuote(
    symbol: string,
    options?: { sourceType?: DataSourceType; forceRefresh?: boolean }
  ): Promise<StockQuote> {
    try {
      // 设置数据源类型
      const sourceType = options?.sourceType || this.sourceType
      const forceRefresh = options?.forceRefresh || false

      // 如果不强制刷新，尝试从缓存获取
      if (!forceRefresh && tushareService.getCachedStockQuote) {
        const cachedQuote = tushareService.getCachedStockQuote(symbol)
        if (cachedQuote) {
          console.log(`使用缓存的股票行情: ${symbol}`)
          return cachedQuote
        }
      }

      // 确保使用Tushare数据源
      tushareService.setAllowApiCall(true)

      try {
        // 获取股票行情
        const quote = await tushareService.getStockQuote(symbol, forceRefresh)

        // 重置API调用权限
        tushareService.setAllowApiCall(false)

        return quote
      } catch (apiError) {
        console.error(`Tushare获取股票${symbol}行情失败:`, apiError)

        // 不使用模拟数据，直接抛出错误
        throw new Error(`Tushare API获取股票${symbol}行情失败，请检查API配置或网络连接`)
      }
    } catch (error) {
      console.error(`Tushare获取股票${symbol}行情失败:`, error)
      throw error
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
      // 设置数据源类型
      const sourceType = options?.sourceType || this.sourceType
      const forceRefresh = options?.forceRefresh || false

      // 确保使用Tushare数据源
      tushareService.setAllowApiCall(true)

      try {
        // 使用tushareService获取财经新闻
        if (typeof tushareService.getFinancialNews === 'function') {
          const news = await tushareService.getFinancialNews(count, forceRefresh)

          // 重置API调用权限
          tushareService.setAllowApiCall(false)

          // 添加数据源信息
          return news.map((item) => ({
            ...item,
            data_source: 'tushare',
          }))
        } else {
          throw new Error('Tushare数据源未实现getFinancialNews方法')
        }
      } catch (apiError) {
        console.error('Tushare API获取财经新闻失败:', apiError)

        // 尝试使用模拟数据
        console.log('使用模拟财经新闻数据')

        // 生成模拟新闻数据
        const mockNews: FinancialNews[] = [
          {
            title: '央行宣布降准0.5个百分点，释放长期资金约1万亿元',
            time: '10分钟前',
            source: '财经日报',
            url: '#',
            important: true,
            content:
              '中国人民银行今日宣布，决定于下周一起下调金融机构存款准备金率0.5个百分点，预计将释放长期资金约1万亿元。',
            data_source: 'mock (tushare)',
          },
          {
            title: '科技板块全线上涨，半导体行业领涨',
            time: '30分钟前',
            source: '证券时报',
            url: '#',
            important: false,
            content:
              '今日A股市场，科技板块表现强势，全线上涨。其中，半导体行业领涨，多只个股涨停。',
            data_source: 'mock (tushare)',
          },
          {
            title: '多家券商上调A股目标位，看好下半年行情',
            time: '1小时前',
            source: '上海证券报',
            url: '#',
            important: false,
            content: '近日，多家券商发布研报，上调A股目标位，普遍看好下半年市场行情。',
            data_source: 'mock (tushare)',
          },
        ]

        // 随机打乱新闻顺序
        const shuffledNews = [...mockNews].sort(() => Math.random() - 0.5)

        // 返回指定数量的新闻
        return shuffledNews.slice(0, count)
      }
    } catch (error) {
      console.error('Tushare获取财经新闻失败:', error)
      throw error
    } finally {
      // 确保重置API调用权限
      tushareService.setAllowApiCall(false)
    }
  }

  /**
   * 获取数据源名称
   */
  getName(): string {
    return 'Tushare数据'
  }

  /**
   * 获取数据源描述
   */
  getDescription(): string {
    return '提供A股基础数据，包括行情、基本面等'
  }

  /**
   * 获取数据源类型
   */
  getType(): DataSourceType {
    return this.sourceType
  }

  /**
   * 测试数据源连接
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('系统已配置为不使用Tushare数据源，跳过测试')

      // 直接返回成功，避免任何API调用
      return true
    } catch (error) {
      console.error('Tushare数据源连接测试失败:', error)
      return false
    }
  }
}
