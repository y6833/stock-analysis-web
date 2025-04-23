// 股票基本信息
export interface Stock {
  symbol: string
  name: string
  market: string
  industry: string
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
}

// 技术指标
export interface TechnicalIndicator {
  name: string
  value: number
  description: string
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
  }
  signals: {
    buy: boolean
    sell: boolean
    reason: string
  }
}
