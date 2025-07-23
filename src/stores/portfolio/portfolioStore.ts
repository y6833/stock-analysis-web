/**
 * 优化后的投资组合状态管理
 * 重构原portfolioStore，提供更好的状态管理和性能优化
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Position, PositionSummary } from '@/types/portfolio'
import * as portfolioService from '@/services/portfolioService'
import { createBaseStore } from '@/stores/core/baseStore'
import { useAuthStore } from '@/stores/user/authStore'
import { useStockDataStore } from '@/stores/stock/stockDataStore'

export const usePortfolioStore = defineStore('portfolio', () => {
    // 使用基础Store功能
    const baseStore = createBaseStore({
        name: 'portfolio',
        cache: {
            enabled: true,
            ttl: 2 * 60 * 1000, // 2分钟缓存
            key: 'portfolio'
        }
    })()

    // 投资组合状态
    const portfolios = ref<portfolioService.Portfolio[]>([])
    const currentPortfolioId = ref<number | null>(null)
    const holdings = ref<portfolioService.Holding[]>([])
    const tradeRecords = ref<portfolioService.TradeRecord[]>([])
    const performanceData = ref<any>(null)

    // 计算属性
    const currentPortfolio = computed(() =>
        portfolios.value.find(p => p.id === currentPortfolioId.value) || null
    )

    const totalInvestment = computed(() => {
        return holdings.value.reduce((sum, holding) => {
            return sum + holding.quantity * holding.averageCost
        }, 0)
    })

    const currentValue = computed(() => {
        const stockDataStore = useStockDataStore()

        return holdings.value.reduce((sum, holding) => {
            // 尝试获取最新价格
            let currentPrice = holding.currentPrice

            const stockData = stockDataStore.stockData.get(`${holding.stockCode}_1d`)
            if (stockData && stockData.prices.length > 0) {
                currentPrice = stockData.prices[stockData.prices.length - 1]
            }

            return sum + holding.quantity * currentPrice
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
        const stockDataStore = useStockDataStore()

        return holdings.value.map((holding) => {
            let currentPrice = holding.currentPrice

            // 尝试获取最新价格
            const stockData = stockDataStore.stockData.get(`${holding.stockCode}_1d`)
            if (stockData && stockData.prices.length > 0) {
                currentPrice = stockData.prices[stockData.prices.length - 1]
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
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            const result = await portfolioService.getUserPortfolios()
            portfolios.value = result

            if (result.length > 0) {
                // 如果有默认组合，选择默认组合，否则选择第一个组合
                const defaultPortfolio = result.find((p) => p.isDefault)
                currentPortfolioId.value = defaultPortfolio ? defaultPortfolio.id : result[0].id

                // 加载当前组合的持仓
                await fetchHoldings(currentPortfolioId.value)
            }

            return result
        }, {
            cacheKey: 'user_portfolios',
            onError: (error) => {
                console.error('获取投资组合失败:', error)
            }
        })
    }

    // 创建投资组合
    async function createPortfolio(data: portfolioService.CreatePortfolioRequest) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            const portfolio = await portfolioService.createPortfolio(data)
            portfolios.value.push(portfolio)

            // 如果是默认组合或者是第一个组合，选择它
            if (data.isDefault || portfolios.value.length === 1) {
                currentPortfolioId.value = portfolio.id
                await fetchHoldings(portfolio.id)
            }

            return portfolio
        }, {
            onSuccess: () => {
                baseStore.clearCache('user_portfolios')
            },
            onError: (error) => {
                console.error('创建投资组合失败:', error)
            }
        })
    }

    // 更新投资组合
    async function updatePortfolio(id: number, data: portfolioService.CreatePortfolioRequest) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            const portfolio = await portfolioService.updatePortfolio(id, data)
            const index = portfolios.value.findIndex((p) => p.id === id)

            if (index !== -1) {
                portfolios.value[index] = portfolio
            }

            return portfolio
        }, {
            onSuccess: () => {
                baseStore.clearCache('user_portfolios')
            },
            onError: (error) => {
                console.error('更新投资组合失败:', error)
            }
        })
    }

    // 删除投资组合
    async function deletePortfolio(id: number) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
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

            return true
        }, {
            onSuccess: () => {
                baseStore.clearCache('user_portfolios')
                baseStore.clearCache(`portfolio_holdings_${id}`)
            },
            onError: (error) => {
                console.error('删除投资组合失败:', error)
            }
        })
    }

    // 获取投资组合中的持仓
    async function fetchHoldings(portfolioId: number) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            const result = await portfolioService.getPortfolioHoldings(portfolioId)
            holdings.value = result
            return result
        }, {
            cacheKey: `portfolio_holdings_${portfolioId}`,
            onError: (error) => {
                console.error('获取持仓信息失败:', error)
            }
        })
    }

    // 添加持仓
    async function addHolding(data: portfolioService.AddHoldingRequest) {
        if (!currentPortfolioId.value) {
            throw new Error('请先选择或创建一个投资组合')
        }

        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            const holding = await portfolioService.addHolding(currentPortfolioId.value!, data)

            // 检查是否已存在相同股票的持仓
            const existingIndex = holdings.value.findIndex((h) => h.stockCode === data.stockCode)

            if (existingIndex !== -1) {
                holdings.value[existingIndex] = holding
            } else {
                holdings.value.push(holding)
            }

            return holding
        }, {
            onSuccess: () => {
                baseStore.clearCache(`portfolio_holdings_${currentPortfolioId.value}`)
            },
            onError: (error) => {
                console.error('添加持仓失败:', error)
            }
        })
    }

    // 更新持仓
    async function updateHolding(holdingId: number, data: Partial<portfolioService.AddHoldingRequest>) {
        if (!currentPortfolioId.value) {
            throw new Error('请先选择一个投资组合')
        }

        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            const holding = await portfolioService.updateHolding(currentPortfolioId.value!, holdingId, data)
            const index = holdings.value.findIndex((h) => h.id === holdingId)

            if (index !== -1) {
                holdings.value[index] = holding
            }

            return holding
        }, {
            onSuccess: () => {
                baseStore.clearCache(`portfolio_holdings_${currentPortfolioId.value}`)
            },
            onError: (error) => {
                console.error('更新持仓失败:', error)
            }
        })
    }

    // 删除持仓
    async function deleteHolding(holdingId: number) {
        if (!currentPortfolioId.value) {
            throw new Error('请先选择一个投资组合')
        }

        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            await portfolioService.deleteHolding(currentPortfolioId.value!, holdingId)
            holdings.value = holdings.value.filter((h) => h.id !== holdingId)
            return true
        }, {
            onSuccess: () => {
                baseStore.clearCache(`portfolio_holdings_${currentPortfolioId.value}`)
            },
            onError: (error) => {
                console.error('删除持仓失败:', error)
            }
        })
    }

    // 添加交易记录
    async function addTradeRecord(data: portfolioService.AddTradeRecordRequest) {
        if (!currentPortfolioId.value) {
            throw new Error('请先选择一个投资组合')
        }

        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            const record = await portfolioService.addTradeRecord(currentPortfolioId.value!, data)

            // 刷新持仓数据
            await fetchHoldings(currentPortfolioId.value!)

            return record
        }, {
            onSuccess: () => {
                baseStore.clearCache(`portfolio_holdings_${currentPortfolioId.value}`)
                baseStore.clearCache(`trade_records_${currentPortfolioId.value}`)
            },
            onError: (error) => {
                console.error('添加交易记录失败:', error)
            }
        })
    }

    // 获取交易记录
    async function fetchTradeRecords() {
        if (!currentPortfolioId.value) {
            throw new Error('请先选择一个投资组合')
        }

        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            const result = await portfolioService.getTradeRecords(currentPortfolioId.value!)
            tradeRecords.value = result
            return result
        }, {
            cacheKey: `trade_records_${currentPortfolioId.value}`,
            onError: (error) => {
                console.error('获取交易记录失败:', error)
            }
        })
    }

    // 删除交易记录
    async function deleteTradeRecord(portfolioId: number, tradeId: number) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            await portfolioService.deleteTradeRecord(portfolioId, tradeId)

            // 更新交易记录列表
            if (currentPortfolioId.value === portfolioId) {
                tradeRecords.value = tradeRecords.value.filter((record) => record.id !== tradeId)
            }

            return true
        }, {
            onSuccess: () => {
                baseStore.clearCache(`trade_records_${portfolioId}`)
                baseStore.clearCache(`portfolio_holdings_${portfolioId}`)
            },
            onError: (error) => {
                console.error('删除交易记录失败:', error)
            }
        })
    }

    // 切换当前投资组合
    async function switchPortfolio(portfolioId: number) {
        if (currentPortfolioId.value === portfolioId) return

        currentPortfolioId.value = portfolioId
        await fetchHoldings(portfolioId)
    }

    // 获取投资组合性能数据
    async function fetchPerformanceData(portfolioId?: number) {
        const targetId = portfolioId || currentPortfolioId.value
        if (!targetId) {
            throw new Error('请先选择一个投资组合')
        }

        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            const result = await portfolioService.getPortfolioPerformance(targetId)
            if (targetId === currentPortfolioId.value) {
                performanceData.value = result
            }
            return result
        }, {
            cacheKey: `portfolio_performance_${targetId}`,
            onError: (error) => {
                console.error('获取投资组合性能数据失败:', error)
            }
        })
    }

    // 重置状态
    function reset() {
        portfolios.value = []
        currentPortfolioId.value = null
        holdings.value = []
        tradeRecords.value = []
        performanceData.value = null
        baseStore.clearCache()
    }

    return {
        // 基础Store功能
        ...baseStore,

        // 投资组合状态
        portfolios,
        currentPortfolioId,
        holdings,
        tradeRecords,
        performanceData,

        // 计算属性
        currentPortfolio,
        totalInvestment,
        currentValue,
        totalProfit,
        profitPercentage,
        positionSummaries,

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
        deleteTradeRecord,
        switchPortfolio,
        fetchPerformanceData,
        reset
    }
})