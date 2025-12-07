<template>
    <div class="portfolio-analysis-chart">
        <div class="chart-header">
            <h3 class="chart-title">投资组合分析</h3>
            <div class="chart-actions">
                <el-button size="small" @click="$emit('refresh')" :loading="loading">
                    刷新
                </el-button>
            </div>
        </div>

        <div class="chart-content">
            <div v-if="loading" class="loading-placeholder">
                <el-skeleton :rows="3" animated />
            </div>

            <div v-else-if="!data || Object.keys(data).length === 0" class="empty-state">
                <el-empty description="暂无投资组合数据" />
            </div>

            <div v-else class="chart-container">
                <div class="portfolio-summary">
                    <div class="summary-item">
                        <span class="label">总资产</span>
                        <span class="value">¥{{ formatCurrency(portfolioSummary.totalValue) }}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">今日收益</span>
                        <span class="value" :class="portfolioSummary.totalProfit >= 0 ? 'up' : 'down'">
                            {{ formatProfit(portfolioSummary.totalProfit, portfolioSummary.totalProfitPercent) }}
                        </span>
                    </div>
                    <div class="summary-item">
                        <span class="label">持仓数量</span>
                        <span class="value">{{ portfolioSummary.holdingCount }}只</span>
                    </div>
                </div>

                <div class="portfolio-distribution" v-if="holdingsDistribution.length > 0">
                    <h4>资产分布</h4>
                    <div class="distribution-list">
                        <div v-for="(holding, index) in holdingsDistribution" :key="index" class="distribution-item">
                            <span class="stock-name">{{ holding.name }}</span>
                            <span class="percentage">{{ holding.percentage.toFixed(1) }}%</span>
                            <span class="amount">¥{{ formatCurrency(holding.value) }}</span>
                        </div>
                    </div>
                </div>
                <div v-else class="empty-distribution">
                    <el-empty description="暂无持仓数据" :image-size="80" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { portfolioService } from '@/services/portfolioService'
import { stockService } from '@/services/stockService'

interface Props {
    data?: any
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false
})

const emit = defineEmits<{
    refresh: []
}>()

// 持仓数据
const holdings = ref<any[]>([])

// 从props.data或API获取持仓数据
const loadHoldings = async () => {
  try {
    if (props.data && props.data.holdings) {
      holdings.value = props.data.holdings
    } else {
      // 如果没有传入数据，从API获取
      const data = await portfolioService.getHoldings()
      holdings.value = data || []
      
      // 为每个持仓获取最新价格
      if (holdings.value.length > 0) {
        const holdingsWithPrice = await Promise.allSettled(
          holdings.value.map(async (holding: any) => {
            try {
              const quote = await stockService.getStockQuote(holding.stockCode || holding.symbol)
              return {
                ...holding,
                currentPrice: quote?.price || holding.currentPrice || holding.price || 0
              }
            } catch (error) {
              console.warn(`获取股票 ${holding.stockCode || holding.symbol} 价格失败:`, error)
              return holding
            }
          })
        )
        
        holdings.value = holdingsWithPrice
          .filter((result) => result.status === 'fulfilled')
          .map((result: any) => result.value)
      }
    }
  } catch (error) {
    console.error('加载持仓数据失败:', error)
    holdings.value = []
  }
}

// 计算投资组合汇总
const portfolioSummary = computed(() => {
  if (!holdings.value || holdings.value.length === 0) {
    return {
      totalValue: 0,
      totalCost: 0,
      totalProfit: 0,
      totalProfitPercent: 0,
      holdingCount: 0
    }
  }

  const totalCost = holdings.value.reduce((sum, h) => {
    const cost = (h.averageCost || h.cost || 0) * (h.quantity || 0)
    return sum + cost
  }, 0)

  const totalValue = holdings.value.reduce((sum, h) => {
    const value = (h.currentPrice || h.price || 0) * (h.quantity || 0)
    return sum + value
  }, 0)

  const totalProfit = totalValue - totalCost
  const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0

  return {
    totalValue,
    totalCost,
    totalProfit,
    totalProfitPercent,
    holdingCount: holdings.value.length
  }
})

// 计算资产分布（按持仓价值排序）
const holdingsDistribution = computed(() => {
  if (!holdings.value || holdings.value.length === 0) {
    return []
  }

  const totalValue = portfolioSummary.value.totalValue
  if (totalValue === 0) return []

  return holdings.value
    .map((h: any) => {
      const value = (h.currentPrice || h.price || 0) * (h.quantity || 0)
      const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0
      return {
        name: h.stockName || h.name || h.stockCode || h.symbol,
        value,
        percentage
      }
    })
    .filter((h: any) => h.value > 0)
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 10) // 只显示前10个
})

// 格式化货币
const formatCurrency = (value: number) => {
  if (!value || isNaN(value)) return '0.00'
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 格式化盈亏
const formatProfit = (profit: number, percent: number) => {
  if (profit === undefined || profit === null || isNaN(profit)) {
    return '¥0.00 (0.00%)'
  }
  const sign = profit >= 0 ? '+' : ''
  const profitStr = `${sign}¥${formatCurrency(profit)}`
  const percentStr = percent !== undefined && !isNaN(percent) 
    ? ` (${sign}${percent.toFixed(2)}%)` 
    : ''
  return `${profitStr}${percentStr}`
}

// 监听props.data变化
onMounted(() => {
  loadHoldings()
})

// 监听data prop变化
watch(() => props.data, () => {
  if (props.data) {
    loadHoldings()
  }
}, { immediate: true })
</script>

<style scoped>
.portfolio-analysis-chart {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.chart-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 0;
}

.chart-content {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.loading-placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.chart-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.portfolio-summary {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
}

.summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.label {
    font-size: 14px;
    color: var(--el-text-color-regular);
}

.value {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.value.up {
    color: var(--el-color-success);
}

.portfolio-distribution {
    flex: 1;
}

.portfolio-distribution h4 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.distribution-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.distribution-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
}

.stock-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
}

.percentage {
    font-size: 14px;
    color: var(--el-color-primary);
    font-weight: 600;
}

.amount {
    font-size: 14px;
    color: var(--el-text-color-regular);
}

.value.down {
    color: var(--el-color-danger);
}

.empty-distribution {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}
</style>