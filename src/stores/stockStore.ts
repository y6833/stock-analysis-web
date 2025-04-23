import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Stock, StockData, StockAnalysis, TechnicalIndicator } from '@/types/stock'
import { stockService } from '@/services/stockService'

export const useStockStore = defineStore('stock', () => {
  // 状态
  const stocks = ref<Stock[]>([])
  const currentStock = ref<Stock | null>(null)
  const stockData = ref<StockData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const watchlist = ref<string[]>([])
  
  // 计算属性
  const stockAnalysis = computed<StockAnalysis | null>(() => {
    if (!stockData.value) return null
    
    const prices = stockData.value.prices
    const lastPrice = prices[prices.length - 1]
    const prevPrice = prices[prices.length - 2] || prices[0]
    const firstPrice = prices[0]
    
    // 计算涨跌幅
    const dailyChange = ((lastPrice - prevPrice) / prevPrice) * 100
    const totalChange = ((lastPrice - firstPrice) / firstPrice) * 100
    
    // 简单移动平均线 (5日和20日)
    const sma5 = calculateSMA(prices, 5)
    const sma20 = calculateSMA(prices, 20)
    
    // 相对强弱指标 (RSI)
    const rsi = calculateRSI(prices)
    
    // 入场/卖出信号
    const signals = generateSignals(prices, sma5, sma20, rsi)
    
    return {
      lastPrice,
      dailyChange,
      totalChange,
      technicalIndicators: {
        sma5: sma5[sma5.length - 1],
        sma20: sma20[sma20.length - 1],
        rsi: rsi[rsi.length - 1]
      },
      signals
    }
  })
  
  // 动作
  async function fetchStocks() {
    isLoading.value = true
    error.value = null
    
    try {
      stocks.value = await stockService.getStocks()
    } catch (err) {
      error.value = '获取股票列表失败'
      console.error(err)
    } finally {
      isLoading.value = false
    }
  }
  
  async function fetchStockData(symbol: string) {
    isLoading.value = true
    error.value = null
    
    try {
      stockData.value = await stockService.getStockData(symbol)
      
      // 更新当前股票
      const stock = stocks.value.find(s => s.symbol === symbol)
      if (stock) {
        currentStock.value = stock
      }
    } catch (err) {
      error.value = '获取股票数据失败'
      console.error(err)
      stockData.value = null
    } finally {
      isLoading.value = false
    }
  }
  
  function addToWatchlist(symbol: string) {
    if (!watchlist.value.includes(symbol)) {
      watchlist.value.push(symbol)
      // 可以保存到本地存储
      localStorage.setItem('watchlist', JSON.stringify(watchlist.value))
    }
  }
  
  function removeFromWatchlist(symbol: string) {
    watchlist.value = watchlist.value.filter(s => s !== symbol)
    // 更新本地存储
    localStorage.setItem('watchlist', JSON.stringify(watchlist.value))
  }
  
  // 初始化
  function initialize() {
    // 从本地存储加载观察列表
    const savedWatchlist = localStorage.getItem('watchlist')
    if (savedWatchlist) {
      watchlist.value = JSON.parse(savedWatchlist)
    }
  }
  
  // 辅助函数
  function calculateSMA(prices: number[], period: number): number[] {
    const result: number[] = []
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        result.push(NaN)
        continue
      }
      
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += prices[i - j]
      }
      
      result.push(sum / period)
    }
    
    return result
  }
  
  function calculateRSI(prices: number[], period: number = 14): number[] {
    const result: number[] = []
    const gains: number[] = []
    const losses: number[] = []
    
    // 计算价格变化
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? Math.abs(change) : 0)
      
      if (i < period) {
        result.push(NaN)
        continue
      }
      
      // 计算平均收益和损失
      const avgGain = gains.slice(i - period, i).reduce((sum, val) => sum + val, 0) / period
      const avgLoss = losses.slice(i - period, i).reduce((sum, val) => sum + val, 0) / period
      
      if (avgLoss === 0) {
        result.push(100)
      } else {
        const rs = avgGain / avgLoss
        result.push(100 - (100 / (1 + rs)))
      }
    }
    
    return result
  }
  
  function generateSignals(
    prices: number[], 
    sma5: number[], 
    sma20: number[], 
    rsi: number[]
  ): { buy: boolean; sell: boolean; reason: string } {
    const lastPrice = prices[prices.length - 1]
    const lastSMA5 = sma5[sma5.length - 1]
    const lastSMA20 = sma20[sma20.length - 1]
    const lastRSI = rsi[rsi.length - 1]
    
    // 默认信号
    const signals = { buy: false, sell: false, reason: '无明确信号' }
    
    // 金叉信号 (短期均线上穿长期均线)
    if (sma5[sma5.length - 2] < sma20[sma20.length - 2] && lastSMA5 > lastSMA20) {
      signals.buy = true
      signals.reason = '金叉形成：5日均线上穿20日均线，可能是上涨趋势开始'
      return signals
    }
    
    // 死叉信号 (短期均线下穿长期均线)
    if (sma5[sma5.length - 2] > sma20[sma20.length - 2] && lastSMA5 < lastSMA20) {
      signals.sell = true
      signals.reason = '死叉形成：5日均线下穿20日均线，可能是下跌趋势开始'
      return signals
    }
    
    // RSI超买超卖信号
    if (lastRSI > 70) {
      signals.sell = true
      signals.reason = `RSI(${lastRSI.toFixed(2)})处于超买区域，可能即将回调`
      return signals
    }
    
    if (lastRSI < 30) {
      signals.buy = true
      signals.reason = `RSI(${lastRSI.toFixed(2)})处于超卖区域，可能即将反弹`
      return signals
    }
    
    // 价格突破均线
    if (prices[prices.length - 2] < lastSMA20 && lastPrice > lastSMA20) {
      signals.buy = true
      signals.reason = '价格突破20日均线，可能是上涨信号'
      return signals
    }
    
    if (prices[prices.length - 2] > lastSMA20 && lastPrice < lastSMA20) {
      signals.sell = true
      signals.reason = '价格跌破20日均线，可能是下跌信号'
      return signals
    }
    
    return signals
  }
  
  // 初始化
  initialize()
  
  return {
    stocks,
    currentStock,
    stockData,
    stockAnalysis,
    isLoading,
    error,
    watchlist,
    fetchStocks,
    fetchStockData,
    addToWatchlist,
    removeFromWatchlist
  }
})
