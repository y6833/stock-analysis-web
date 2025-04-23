import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Position, PositionSummary } from '@/types/portfolio'
import { useStockStore } from './stockStore'

export const usePortfolioStore = defineStore('portfolio', () => {
  // 状态
  const positions = ref<Position[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // 计算属性
  const totalInvestment = computed(() => {
    return positions.value.reduce((sum, position) => {
      return sum + position.quantity * position.buyPrice
    }, 0)
  })
  
  const currentValue = computed(() => {
    const stockStore = useStockStore()
    
    return positions.value.reduce((sum, position) => {
      // 如果当前股票是持仓中的股票，使用最新价格
      if (stockStore.currentStock?.symbol === position.symbol && stockStore.stockData) {
        const currentPrice = stockStore.stockData.prices[stockStore.stockData.prices.length - 1]
        return sum + position.quantity * currentPrice
      }
      // 否则使用最后更新价格
      return sum + position.quantity * position.lastPrice
    }, 0)
  })
  
  const totalProfit = computed(() => {
    return currentValue.value - totalInvestment.value
  })
  
  const profitPercentage = computed(() => {
    if (totalInvestment.value === 0) return 0
    return (totalProfit.value / totalInvestment.value) * 100
  })
  
  const positionSummaries = computed<PositionSummary[]>(() => {
    const stockStore = useStockStore()
    
    return positions.value.map(position => {
      let currentPrice = position.lastPrice
      
      // 如果当前股票是持仓中的股票，使用最新价格
      if (stockStore.currentStock?.symbol === position.symbol && stockStore.stockData) {
        currentPrice = stockStore.stockData.prices[stockStore.stockData.prices.length - 1]
      }
      
      const investmentValue = position.quantity * position.buyPrice
      const currentValue = position.quantity * currentPrice
      const profit = currentValue - investmentValue
      const profitPercentage = (profit / investmentValue) * 100
      
      return {
        ...position,
        currentPrice,
        investmentValue,
        currentValue,
        profit,
        profitPercentage
      }
    })
  })
  
  // 动作
  function addPosition(position: Position) {
    // 检查是否已存在相同股票的持仓
    const existingIndex = positions.value.findIndex(p => p.symbol === position.symbol)
    
    if (existingIndex >= 0) {
      // 如果存在，更新持仓（这里采用平均成本法）
      const existing = positions.value[existingIndex]
      const totalQuantity = existing.quantity + position.quantity
      const totalCost = existing.quantity * existing.buyPrice + position.quantity * position.buyPrice
      const averagePrice = totalCost / totalQuantity
      
      positions.value[existingIndex] = {
        ...existing,
        quantity: totalQuantity,
        buyPrice: averagePrice,
        buyDate: position.buyDate, // 更新为最新买入日期
        lastPrice: position.lastPrice
      }
    } else {
      // 如果不存在，添加新持仓
      positions.value.push(position)
    }
    
    // 保存到本地存储
    savePositions()
  }
  
  function updatePosition(symbol: string, updates: Partial<Position>) {
    const index = positions.value.findIndex(p => p.symbol === symbol)
    
    if (index >= 0) {
      positions.value[index] = { ...positions.value[index], ...updates }
      savePositions()
    }
  }
  
  function removePosition(symbol: string) {
    positions.value = positions.value.filter(p => p.symbol !== symbol)
    savePositions()
  }
  
  function sellPosition(symbol: string, quantity: number, sellPrice: number) {
    const index = positions.value.findIndex(p => p.symbol === symbol)
    
    if (index >= 0) {
      const position = positions.value[index]
      
      if (quantity >= position.quantity) {
        // 全部卖出
        removePosition(symbol)
      } else {
        // 部分卖出
        positions.value[index] = {
          ...position,
          quantity: position.quantity - quantity,
          lastPrice: sellPrice
        }
        savePositions()
      }
    }
  }
  
  // 辅助函数
  function savePositions() {
    localStorage.setItem('portfolio', JSON.stringify(positions.value))
  }
  
  function loadPositions() {
    const savedPositions = localStorage.getItem('portfolio')
    if (savedPositions) {
      positions.value = JSON.parse(savedPositions)
    }
  }
  
  // 初始化
  function initialize() {
    loadPositions()
  }
  
  // 初始化
  initialize()
  
  return {
    positions,
    positionSummaries,
    totalInvestment,
    currentValue,
    totalProfit,
    profitPercentage,
    isLoading,
    error,
    addPosition,
    updatePosition,
    removePosition,
    sellPosition
  }
})
