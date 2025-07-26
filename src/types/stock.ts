// 股票基本信息
export interface Stock {
  symbol: string // 股票代码 (ts_code)
  name: string // 股票名称
  market: string // 市场类型 (主板/中小板/创业板等)
  industry: string // 所属行业
  data_source?: string // 数据源
  listDate?: string // 上市日期
  exchange?: string // 交易所 (SSE/SZSE/BSE)
  area?: string // 地域
  fullname?: string // 股票全称
  enname?: string // 英文全称
  cnspell?: string // 拼音缩写
  curr_type?: string // 交易货币
  list_status?: string // 上市状态 (L上市 D退市 P暂停上市)
  delist_date?: string // 退市日期
  is_hs?: string // 是否沪深港通标的 (N否 H沪股通 S深股通)
}

// 股票数据
export interface StockData {
  symbol: string
  dates: string[]
  prices: number[]
  volumes: number[]
  high: number
  low: number
  open: number
  close: number
  // 可选的高低开收价数组
  highs?: number[]
  lows?: number[]
  opens?: number[]
  closes?: number[]
}

// 技术指标
export interface TechnicalIndicator {
  name: string
  value: number
  description: string
}

// 移动平均线指标
export interface MAIndicator {
  sma5: number[]
  sma10: number[]
  sma20: number[]
  sma60: number[]
  ema12: number[]
  ema26: number[]
}

// MACD指标
export interface MACDIndicator {
  macdLine: number[]
  signalLine: number[]
  histogram: number[]
}

// KDJ指标
export interface KDJIndicator {
  k: number[]
  d: number[]
  j: number[]
}

// 布林带指标
export interface BollingerBandsIndicator {
  upper: number[]
  middle: number[]
  lower: number[]
}

// 成交量指标
export interface VolumeIndicator {
  volume: number[]
  ma5: number[]
  ma10: number[]
}

// 形态识别结果
export interface PatternRecognitionResult {
  pattern: string
  positions: number[] | null
  confidence: number
  description: string
}

// 趋势线
export interface TrendLine {
  id: string
  startIndex: number
  endIndex: number
  startValue: number
  endValue: number
  type: 'support' | 'resistance' | 'trend'
  color: string
}

// 时间周期
export type TimeFrame = 'day' | 'week' | 'month' | 'year'

// Tushare API 请求参数接口
export interface TushareApiParams {
  [key: string]: any
}

// Tushare API 响应接口
export interface TushareApiResponse<T = any> {
  request_id: string
  code: number
  msg: string
  data: {
    fields: string[]
    items: T[][]
  }
}

// Tushare 股票基础信息参数
export interface StockBasicParams extends TushareApiParams {
  ts_code?: string // 股票代码
  name?: string // 股票名称
  exchange?: string // 交易所 SSE上交所 SZSE深交所 BSE北交所
  market?: string // 市场类别 (主板/中小板/创业板/科创板/CDR)
  is_hs?: string // 是否沪深港通标的，N否 H沪股通 S深股通
  list_status?: string // 上市状态 L上市 D退市 P暂停上市
  limit?: number // 单次返回数据长度
  offset?: number // 请求数据的开始位移量
  fields?: string // 指定返回的字段
}

// Tushare 日线行情参数
export interface DailyParams extends TushareApiParams {
  ts_code?: string // 股票代码
  trade_date?: string // 交易日期 (YYYYMMDD)
  start_date?: string // 开始日期 (YYYYMMDD)
  end_date?: string // 结束日期 (YYYYMMDD)
  limit?: number // 单次返回数据长度
  offset?: number // 请求数据的开始位移量
}

// Tushare 实时行情参数
export interface RealtimeQuoteParams extends TushareApiParams {
  ts_code?: string // 股票代码
  src?: string // 数据源 (sina/163/qq等)
}

// Tushare 财务数据参数
export interface FinanceParams extends TushareApiParams {
  ts_code?: string // 股票代码
  ann_date?: string // 公告日期
  start_date?: string // 报告期开始日期
  end_date?: string // 报告期结束日期
  period?: string // 报告期 (YYYYMMDD)
  report_type?: string // 报告类型 (1合并报表 2单季合并 3调整单季合并表 4调整合并报表 5调整前合并报表 6母公司报表 7母公司单季表 8 母公司调整单季表 9母公司调整表 10母公司调整前报表 11调整前合并报表)
  comp_type?: string // 公司类型 (1一般工商业 2银行 3保险 4证券)
  limit?: number // 单次返回数据长度
  offset?: number // 请求数据的开始位移量
}

// 股票实时行情
export interface StockQuote {
  symbol: string
  name: string
  price: number
  open: number
  high: number
  low: number
  close: number
  pre_close: number
  change: number
  pct_chg: number
  vol: number
  amount: number
  turnover_rate?: number
  pe?: number
  pb?: number
  total_mv?: number
  circ_mv?: number
  update_time: string
  data_source?: string
  data_source_message?: string
  source_type?: string
}

// 财经新闻
export interface FinancialNews {
  title: string
  time: string
  source: string
  url: string
  important: boolean
  content?: string
  data_source?: string
  source_type?: string
}

// 股票分析结果
export interface StockAnalysis {
  lastPrice: number
  dailyChange: number
  totalChange: number
  technicalIndicators: {
    sma5: number
    sma20: number
    rsi: number
    macd?: {
      macd: number
      signal: number
      histogram: number
    }
    kdj?: {
      k: number
      d: number
      j: number
    }
    bollingerBands?: {
      upper: number
      middle: number
      lower: number
    }
  }
  patternRecognition?: PatternRecognitionResult[]
  signals: {
    buy: boolean
    sell: boolean
    reason: string
  }
}
