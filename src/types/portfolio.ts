// 持仓信息
export interface Position {
  symbol: string
  name: string
  quantity: number
  buyPrice: number
  buyDate: string
  lastPrice: number
  lastUpdate: string
  notes?: string
}

// 持仓摘要（包含计算值）
export interface PositionSummary extends Position {
  currentPrice: number
  investmentValue: number
  currentValue: number
  profit: number
  profitPercentage: number
}
