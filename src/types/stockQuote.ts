/**
 * 股票行情数据类型
 */
export interface StockQuote {
  /** 股票代码 */
  symbol: string
  /** 股票名称 */
  name: string
  /** 当前价格 */
  price: number
  /** 开盘价 */
  open: number
  /** 最高价 */
  high: number
  /** 最低价 */
  low: number
  /** 收盘价 */
  close: number
  /** 昨收价 */
  pre_close: number
  /** 涨跌额 */
  change: number
  /** 涨跌幅 (%) */
  pct_chg: number
  /** 成交量 (手) */
  vol: number
  /** 成交额 (千元) */
  amount: number
  /** 更新时间 */
  update_time: string
  /** 数据来源 */
  data_source?: string
  /** 数据来源消息 */
  data_source_message?: string
}
