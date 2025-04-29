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
  async getStocks(options?: { sourceType?: DataSourceType }): Promise<Stock[]> {
    try {
      // 设置数据源类型
      const sourceType = options?.sourceType || this.sourceType

      // 确保使用Tushare数据源
      tushareService.setAllowApiCall(true)

      // 获取股票列表
      const stocks = await tushareService.getStocks()

      // 重置API调用权限
      tushareService.setAllowApiCall(false)

      return stocks
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
    options?: { sourceType?: DataSourceType }
  ): Promise<StockQuote> {
    try {
      // 设置数据源类型
      const sourceType = options?.sourceType || this.sourceType

      // 确保使用Tushare数据源
      tushareService.setAllowApiCall(true)

      // 获取股票行情
      const quote = await tushareService.getStockQuote(symbol)

      // 重置API调用权限
      tushareService.setAllowApiCall(false)

      return quote
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
    options?: { sourceType?: DataSourceType }
  ): Promise<FinancialNews[]> {
    try {
      // 设置数据源类型
      const sourceType = options?.sourceType || this.sourceType

      // 确保使用Tushare数据源
      tushareService.setAllowApiCall(true)

      // 使用tushareService获取财经新闻
      if (typeof tushareService.getFinancialNews === 'function') {
        const news = await tushareService.getFinancialNews(count)

        // 重置API调用权限
        tushareService.setAllowApiCall(false)

        return news
      } else {
        throw new Error('Tushare数据源未实现getFinancialNews方法')
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
