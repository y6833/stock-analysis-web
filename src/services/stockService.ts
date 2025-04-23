import axios from 'axios'
import type { Stock, StockData } from '@/types/stock'
import { tushareService } from './tushareService'

// 是否使用 Tushare 数据
const USE_TUSHARE = true

// 模拟数据
const mockStocks: Stock[] = [
  { symbol: '000001.SZ', name: '平安银行', market: '深交所', industry: '银行' },
  { symbol: '600000.SH', name: '浦发银行', market: '上交所', industry: '银行' },
  { symbol: '601318.SH', name: '中国平安', market: '上交所', industry: '保险' },
  { symbol: '000858.SZ', name: '五粮液', market: '深交所', industry: '白酒' },
  { symbol: '600519.SH', name: '贵州茅台', market: '上交所', industry: '白酒' },
  { symbol: '000333.SZ', name: '美的集团', market: '深交所', industry: '家电' },
  { symbol: '600036.SH', name: '招商银行', market: '上交所', industry: '银行' },
  { symbol: '601166.SH', name: '兴业银行', market: '上交所', industry: '银行' },
  { symbol: '002415.SZ', name: '海康威视', market: '深交所', industry: '电子' },
  { symbol: '600276.SH', name: '恒瑞医药', market: '上交所', industry: '医药' },
]

// 生成模拟股票数据
function generateMockStockData(symbol: string): StockData {
  const today = new Date()
  const dates: string[] = []
  const prices: number[] = []
  const volumes: number[] = []

  // 生成基础价格 (不同股票有不同的基础价格)
  let basePrice = 0
  switch (symbol) {
    case '000001.SZ':
      basePrice = 15
      break
    case '600000.SH':
      basePrice = 10
      break
    case '601318.SH':
      basePrice = 60
      break
    case '000858.SZ':
      basePrice = 150
      break
    case '600519.SH':
      basePrice = 1800
      break
    case '000333.SZ':
      basePrice = 80
      break
    case '600036.SH':
      basePrice = 40
      break
    case '601166.SH':
      basePrice = 20
      break
    case '002415.SZ':
      basePrice = 35
      break
    case '600276.SH':
      basePrice = 50
      break
    default:
      basePrice = 100
  }

  // 生成180天的数据
  for (let i = 180; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    dates.push(date.toISOString().split('T')[0])

    // 生成价格 (基于随机波动)
    if (i === 180) {
      // 第一天的价格
      prices.push(basePrice)
    } else {
      // 后续价格基于前一天的价格加上随机波动
      const prevPrice = prices[prices.length - 1]
      const change = prevPrice * (Math.random() * 0.06 - 0.03) // -3% 到 +3% 的随机波动
      const newPrice = Math.max(prevPrice + change, 1) // 确保价格不会低于1
      prices.push(parseFloat(newPrice.toFixed(2)))
    }

    // 生成成交量
    const volume = Math.floor(Math.random() * 10000000) + 1000000
    volumes.push(volume)
  }

  return {
    symbol,
    dates,
    prices,
    volumes,
    high: Math.max(...prices),
    low: Math.min(...prices),
    open: prices[0],
    close: prices[prices.length - 1],
  }
}

// 股票服务
export const stockService = {
  // 获取股票列表
  async getStocks(): Promise<Stock[]> {
    if (USE_TUSHARE) {
      try {
        return await tushareService.getStocks()
      } catch (error) {
        console.error('Tushare 获取股票列表失败，使用模拟数据:', error)
        return mockStocks
      }
    }

    // 使用模拟数据
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockStocks), 500)
    })
  },

  // 获取单个股票数据
  async getStockData(symbol: string): Promise<StockData> {
    if (USE_TUSHARE) {
      try {
        return await tushareService.getStockData(symbol)
      } catch (error) {
        console.error(`Tushare 获取股票 ${symbol} 数据失败，使用模拟数据:`, error)
        return generateMockStockData(symbol)
      }
    }

    // 使用模拟数据
    return new Promise((resolve) => {
      setTimeout(() => resolve(generateMockStockData(symbol)), 800)
    })
  },

  // 搜索股票
  async searchStocks(query: string): Promise<Stock[]> {
    if (USE_TUSHARE) {
      try {
        return await tushareService.searchStocks(query)
      } catch (error) {
        console.error('Tushare 搜索股票失败，使用模拟数据:', error)
        // 使用模拟数据进行过滤
        const results = mockStocks.filter(
          (stock) =>
            stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
            stock.name.toLowerCase().includes(query.toLowerCase()),
        )
        return results
      }
    }

    // 使用模拟数据进行过滤
    return new Promise((resolve) => {
      const results = mockStocks.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
          stock.name.toLowerCase().includes(query.toLowerCase()),
      )
      setTimeout(() => resolve(results), 300)
    })
  },
}
