// 股票基本信息
export interface Stock {
  symbol: string
  name: string
  market: string
  industry: string
  data_source?: string
  listDate?: string
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
