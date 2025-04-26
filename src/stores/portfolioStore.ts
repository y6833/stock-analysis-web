import { defineStore } from 'pinia'
import { ref, computed, onMounted } from 'vue'
import type { Position, PositionSummary } from '@/types/portfolio'
import { useStockStore } from './stockStore'
import * as portfolioService from '@/services/portfolioService'

export const usePortfolioStore = defineStore('portfolio', () => {
  // 状态
  const positions = ref<Position[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 投资组合相关
  const portfolios = ref<portfolioService.Portfolio[]>([])
  const currentPortfolioId = ref<number | null>(null)
  const holdings = ref<portfolioService.Holding[]>([])
  const tradeRecords = ref<portfolioService.TradeRecord[]>([])

  // 计算属性
  const totalInvestment = computed(() => {
    return holdings.value.reduce((sum, holding) => {
      return sum + holding.quantity * holding.averageCost
    }, 0)
  })

  const currentValue = computed(() => {
    const stockStore = useStockStore()

    return holdings.value.reduce((sum, holding) => {
      // 如果当前股票是持仓中的股票，使用最新价格
      if (stockStore.currentStock?.symbol === holding.stockCode && stockStore.stockData) {
        const currentPrice = stockStore.stockData.prices[stockStore.stockData.prices.length - 1]
        return sum + holding.quantity * currentPrice
      }
      // 否则使用最后更新价格
      return sum + holding.quantity * holding.currentPrice
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

    return holdings.value.map((holding) => {
      let currentPrice = holding.currentPrice

      // 如果当前股票是持仓中的股票，使用最新价格
      if (stockStore.currentStock?.symbol === holding.stockCode && stockStore.stockData) {
        currentPrice = stockStore.stockData.prices[stockStore.stockData.prices.length - 1]
      }

      const investmentValue = holding.quantity * holding.averageCost
      const currentValue = holding.quantity * currentPrice
      const profit = currentValue - investmentValue
      const profitPercentage = investmentValue > 0 ? (profit / investmentValue) * 100 : 0

      return {
        symbol: holding.stockCode,
        name: holding.stockName,
        quantity: holding.quantity,
        buyPrice: holding.averageCost,
        buyDate: holding.createdAt,
        lastPrice: holding.currentPrice,
        lastUpdate: holding.updatedAt,
        notes: holding.notes,
        currentPrice,
        investmentValue,
        currentValue,
        profit,
        profitPercentage,
      }
    })
  })

  // 获取用户的所有投资组合
  async function fetchPortfolios() {
    isLoading.value = true
    error.value = null

    try {
      portfolios.value = await portfolioService.getUserPortfolios()

      if (portfolios.value.length > 0) {
        // 如果有默认组合，选择默认组合，否则选择第一个组合
        const defaultPortfolio = portfolios.value.find((p) => p.isDefault)
        currentPortfolioId.value = defaultPortfolio ? defaultPortfolio.id : portfolios.value[0].id

        // 加载当前组合的持仓
        await fetchHoldings(currentPortfolioId.value)
      }
    } catch (err) {
      console.error('获取投资组合失败:', err)
      error.value = '获取投资组合失败，请稍后再试'
      // 获取投资组合失败
    } finally {
      isLoading.value = false
    }
  }

  // 创建投资组合
  async function createPortfolio(data: portfolioService.CreatePortfolioRequest) {
    isLoading.value = true
    error.value = null

    try {
      const portfolio = await portfolioService.createPortfolio(data)
      portfolios.value.push(portfolio)

      // 如果是默认组合或者是第一个组合，选择它
      if (data.isDefault || portfolios.value.length === 1) {
        currentPortfolioId.value = portfolio.id
        await fetchHoldings(portfolio.id)
      }

      // 成功创建投资组合
      return portfolio
    } catch (err) {
      console.error('创建投资组合失败:', err)
      error.value = '创建投资组合失败，请稍后再试'
      // 创建投资组合失败
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 更新投资组合
  async function updatePortfolio(id: number, data: portfolioService.CreatePortfolioRequest) {
    isLoading.value = true
    error.value = null

    try {
      const portfolio = await portfolioService.updatePortfolio(id, data)
      const index = portfolios.value.findIndex((p) => p.id === id)

      if (index !== -1) {
        portfolios.value[index] = portfolio
      }

      // 更新投资组合成功
      return portfolio
    } catch (err) {
      console.error('更新投资组合失败:', err)
      error.value = '更新投资组合失败，请稍后再试'
      // 更新投资组合失败
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 删除投资组合
  async function deletePortfolio(id: number) {
    isLoading.value = true
    error.value = null

    try {
      await portfolioService.deletePortfolio(id)
      portfolios.value = portfolios.value.filter((p) => p.id !== id)

      // 如果删除的是当前选中的组合，选择另一个组合
      if (currentPortfolioId.value === id) {
        if (portfolios.value.length > 0) {
          const defaultPortfolio = portfolios.value.find((p) => p.isDefault)
          currentPortfolioId.value = defaultPortfolio ? defaultPortfolio.id : portfolios.value[0].id
          await fetchHoldings(currentPortfolioId.value)
        } else {
          currentPortfolioId.value = null
          holdings.value = []
        }
      }

      // 删除投资组合成功
      return true
    } catch (err) {
      console.error('删除投资组合失败:', err)
      error.value = '删除投资组合失败，请稍后再试'
      // 删除投资组合失败
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 获取投资组合中的持仓
  async function fetchHoldings(portfolioId: number) {
    isLoading.value = true
    error.value = null

    try {
      holdings.value = await portfolioService.getPortfolioHoldings(portfolioId)
      return holdings.value
    } catch (err) {
      console.error('获取持仓信息失败:', err)
      error.value = '获取持仓信息失败，请稍后再试'
      // 获取持仓信息失败
      return []
    } finally {
      isLoading.value = false
    }
  }

  // 添加持仓
  async function addHolding(data: portfolioService.AddHoldingRequest) {
    if (!currentPortfolioId.value) {
      error.value = '请先选择或创建一个投资组合'
      // 请先选择或创建一个投资组合
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      const holding = await portfolioService.addHolding(currentPortfolioId.value, data)

      // 检查是否已存在相同股票的持仓
      const existingIndex = holdings.value.findIndex((h) => h.stockCode === data.stockCode)

      if (existingIndex !== -1) {
        holdings.value[existingIndex] = holding
      } else {
        holdings.value.push(holding)
      }

      // 添加持仓成功
      return holding
    } catch (err) {
      console.error('添加持仓失败:', err)
      error.value = '添加持仓失败，请稍后再试'
      // 添加持仓失败
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 更新持仓
  async function updateHolding(
    holdingId: number,
    data: Partial<portfolioService.AddHoldingRequest>
  ) {
    if (!currentPortfolioId.value) {
      error.value = '请先选择一个投资组合'
      // 请先选择一个投资组合
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      const holding = await portfolioService.updateHolding(
        currentPortfolioId.value,
        holdingId,
        data
      )
      const index = holdings.value.findIndex((h) => h.id === holdingId)

      if (index !== -1) {
        holdings.value[index] = holding
      }

      // 更新持仓成功
      return holding
    } catch (err) {
      console.error('更新持仓失败:', err)
      error.value = '更新持仓失败，请稍后再试'
      // 更新持仓失败
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 删除持仓
  async function deleteHolding(holdingId: number) {
    if (!currentPortfolioId.value) {
      error.value = '请先选择一个投资组合'
      // 请先选择一个投资组合
      return false
    }

    isLoading.value = true
    error.value = null

    try {
      await portfolioService.deleteHolding(currentPortfolioId.value, holdingId)
      holdings.value = holdings.value.filter((h) => h.id !== holdingId)

      // 删除持仓成功
      return true
    } catch (err) {
      console.error('删除持仓失败:', err)
      error.value = '删除持仓失败，请稍后再试'
      // 删除持仓失败
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 添加交易记录
  async function addTradeRecord(data: portfolioService.AddTradeRecordRequest) {
    if (!currentPortfolioId.value) {
      error.value = '请先选择一个投资组合'
      // 请先选择一个投资组合
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      const record = await portfolioService.addTradeRecord(currentPortfolioId.value, data)

      // 刷新持仓数据
      await fetchHoldings(currentPortfolioId.value)

      // 添加交易记录成功
      return record
    } catch (err) {
      console.error('添加交易记录失败:', err)
      error.value = '添加交易记录失败，请稍后再试'
      // 添加交易记录失败
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 获取交易记录
  async function fetchTradeRecords() {
    if (!currentPortfolioId.value) {
      error.value = '请先选择一个投资组合'
      // 请先选择一个投资组合
      return []
    }

    isLoading.value = true
    error.value = null

    try {
      tradeRecords.value = await portfolioService.getTradeRecords(currentPortfolioId.value)
      return tradeRecords.value
    } catch (err) {
      console.error('获取交易记录失败:', err)
      error.value = '获取交易记录失败，请稍后再试'
      // 获取交易记录失败
      return []
    } finally {
      isLoading.value = false
    }
  }

  // 切换当前投资组合
  async function switchPortfolio(portfolioId: number) {
    if (currentPortfolioId.value === portfolioId) return

    currentPortfolioId.value = portfolioId
    await fetchHoldings(portfolioId)
  }

  // 兼容旧版本的API
  function addPosition(position: Position) {
    addHolding({
      stockCode: position.symbol,
      stockName: position.name,
      quantity: position.quantity,
      averageCost: position.buyPrice,
      currentPrice: position.lastPrice,
      notes: position.notes,
    })
  }

  function updatePosition(symbol: string, updates: Partial<Position>) {
    const holding = holdings.value.find((h) => h.stockCode === symbol)
    if (holding) {
      updateHolding(holding.id, {
        quantity: updates.quantity,
        averageCost: updates.buyPrice,
        currentPrice: updates.lastPrice,
        notes: updates.notes,
      })
    }
  }

  function removePosition(symbol: string) {
    const holding = holdings.value.find((h) => h.stockCode === symbol)
    if (holding) {
      deleteHolding(holding.id)
    }
  }

  function sellPosition(symbol: string, quantity: number, sellPrice: number) {
    const holding = holdings.value.find((h) => h.stockCode === symbol)
    if (holding) {
      addTradeRecord({
        stockCode: symbol,
        stockName: holding.stockName,
        tradeType: 'sell',
        quantity,
        price: sellPrice,
      })
    }
  }

  // 初始化
  function initialize() {
    fetchPortfolios()
  }

  // 初始化
  onMounted(() => {
    initialize()
  })

  return {
    // 状态
    positions: holdings,
    positionSummaries,
    totalInvestment,
    currentValue,
    totalProfit,
    profitPercentage,
    isLoading,
    error,

    // 投资组合相关
    portfolios,
    currentPortfolioId,
    holdings,
    tradeRecords,

    // 方法
    fetchPortfolios,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    fetchHoldings,
    addHolding,
    updateHolding,
    deleteHolding,
    addTradeRecord,
    fetchTradeRecords,
    switchPortfolio,

    // 兼容旧版本的API
    addPosition,
    updatePosition,
    removePosition,
    sellPosition,
  }
})
