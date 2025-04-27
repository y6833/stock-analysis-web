import type DataSourceInterface from './DataSourceInterface'
import { tushareService } from '../tushareService'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'

/**
 * Tushare数据源实现
 */
export class TushareDataSource implements DataSourceInterface {
  /**
   * 获取股票列表
   */
  async getStocks(): Promise<Stock[]> {
    try {
      const stocks = await tushareService.getStocks()
      return stocks
    } catch (error) {
      console.error('Tushare获取股票列表失败:', error)
      throw error
    }
  }

  /**
   * 获取单个股票数据
   * @param symbol 股票代码
   */
  async getStockData(symbol: string): Promise<StockData> {
    try {
      const stockData = await tushareService.getStockData(symbol)
      return stockData
    } catch (error) {
      console.error(`Tushare获取股票${symbol}数据失败:`, error)
      throw error
    }
  }

  /**
   * 搜索股票
   * @param query 搜索关键词
   */
  async searchStocks(query: string): Promise<Stock[]> {
    try {
      return await tushareService.searchStocks(query)
    } catch (error) {
      console.error('Tushare搜索股票失败:', error)
      throw error
    }
  }

  /**
   * 获取股票实时行情
   * @param symbol 股票代码
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    try {
      const quote = await tushareService.getStockQuote(symbol)
      return quote
    } catch (error) {
      console.error(`Tushare获取股票${symbol}行情失败:`, error)
      throw error
    }
  }

  /**
   * 获取财经新闻
   * @param count 新闻数量
   */
  async getFinancialNews(count: number = 5): Promise<FinancialNews[]> {
    try {
      // 使用tushareService获取财经新闻
      // 注意：如果tushareService没有实现getFinancialNews方法，需要添加
      if (typeof tushareService.getFinancialNews === 'function') {
        return await tushareService.getFinancialNews(count)
      } else {
        throw new Error('Tushare数据源未实现getFinancialNews方法')
      }
    } catch (error) {
      console.error('Tushare获取财经新闻失败:', error)
      throw error
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
   * 测试数据源连接
   */
  async testConnection(): Promise<boolean> {
    try {
      // 尝试获取股票列表，如果成功则连接正常
      const stocks = await this.getStocks()
      return stocks.length > 0
    } catch (error) {
      console.error('Tushare数据源连接测试失败:', error)
      return false
    }
  }
}
