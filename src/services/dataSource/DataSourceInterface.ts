import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'

/**
 * 数据源接口
 * 所有数据源实现必须遵循此接口
 */
export default interface DataSourceInterface {
  /**
   * 获取股票列表
   */
  getStocks(): Promise<Stock[]>

  /**
   * 获取单个股票数据
   * @param symbol 股票代码
   */
  getStockData(symbol: string): Promise<StockData>

  /**
   * 搜索股票
   * @param query 搜索关键词
   */
  searchStocks(query: string): Promise<Stock[]>

  /**
   * 获取股票实时行情
   * @param symbol 股票代码
   */
  getStockQuote(symbol: string): Promise<StockQuote>

  /**
   * 获取财经新闻
   * @param count 新闻数量
   */
  getFinancialNews(count?: number): Promise<FinancialNews[]>

  /**
   * 获取数据源名称
   */
  getName(): string

  /**
   * 获取数据源描述
   */
  getDescription(): string

  /**
   * 测试数据源连接
   */
  testConnection(): Promise<boolean>
}
