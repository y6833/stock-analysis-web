import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'
import type { DataSourceType } from './DataSourceFactory'

/**
 * 数据源接口
 * 所有数据源实现必须遵循此接口
 */
export default interface DataSourceInterface {
  /**
   * 获取股票列表
   * @param options 可选参数
   */
  getStocks(options?: { sourceType?: DataSourceType }): Promise<Stock[]>

  /**
   * 获取单个股票数据
   * @param symbol 股票代码
   * @param options 可选参数
   */
  getStockData(symbol: string, options?: { sourceType?: DataSourceType }): Promise<StockData>

  /**
   * 搜索股票
   * @param query 搜索关键词
   * @param options 可选参数
   */
  searchStocks(query: string, options?: { sourceType?: DataSourceType }): Promise<Stock[]>

  /**
   * 获取股票实时行情
   * @param symbol 股票代码
   * @param options 可选参数
   */
  getStockQuote(symbol: string, options?: { sourceType?: DataSourceType }): Promise<StockQuote>

  /**
   * 获取财经新闻
   * @param count 新闻数量
   * @param options 可选参数
   */
  getFinancialNews(
    count?: number,
    options?: { sourceType?: DataSourceType }
  ): Promise<FinancialNews[]>

  /**
   * 获取数据源名称
   */
  getName(): string

  /**
   * 获取数据源描述
   */
  getDescription(): string

  /**
   * 获取数据源类型
   */
  getType(): DataSourceType

  /**
   * 测试数据源连接
   */
  testConnection(): Promise<boolean>
}
