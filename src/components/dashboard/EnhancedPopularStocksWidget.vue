<template>
  <div class="enhanced-popular-stocks-widget">
    <div class="widget-header">
      <h3>热门股票</h3>
      <div class="widget-controls">
        <div class="tab-selector">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-button"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
        <button class="refresh-btn" @click="refreshData" :disabled="isLoading">
          <span class="refresh-icon" :class="{ spinning: isLoading }">🔄</span>
        </button>
      </div>
    </div>

    <div class="widget-content">
      <div v-if="isLoading" class="loading-state">
        <SkeletonLoader type="table" :rows="10" :columns="6" />
      </div>

      <div v-else-if="error" class="error-state">
        <div class="error-icon">⚠️</div>
        <p>{{ error }}</p>
        <button class="retry-btn" @click="refreshData">重试</button>
      </div>

      <div v-else-if="currentStocks.length === 0" class="empty-state">
        <div class="empty-icon">📊</div>
        <p>暂无数据</p>
      </div>

      <div v-else class="stocks-list">
        <div class="list-header">
          <span class="rank-col">排名</span>
          <span class="symbol-col">代码</span>
          <span class="name-col">名称</span>
          <span class="price-col">价格</span>
          <span class="change-col">{{ getChangeLabel() }}</span>
          <span class="action-col">操作</span>
        </div>

        <div class="list-body">
          <VirtualScrollList
            :items="currentStocks"
            :item-height="40"
            :container-height="300"
            :overscan="3"
            key-field="symbol"
          >
            <template #default="{ item: stock, index }">
              <div
                class="stock-row"
                @click="$emit('stock-click', stock)"
              >
                <span class="rank-col">{{ index + 1 }}</span>
                <span class="symbol-col">{{ stock.symbol }}</span>
                <span class="name-col">{{ stock.name }}</span>
                <span class="price-col">{{ formatPrice(stock.price) }}</span>
                <span class="change-col" :class="getChangeClass(stock)">
                  {{ formatChange(stock) }}
                </span>
                <span class="action-col">
                  <button
                    class="action-btn add-watchlist"
                    @click.stop="$emit('add-to-watchlist', stock)"
                    title="添加到关注列表"
                  >
                    ⭐
                  </button>
                  <button
                    class="action-btn view-detail"
                    @click.stop="$emit('view-detail', stock)"
                    title="查看详情"
                  >
                    📈
                  </button>
                </span>
              </div>
            </template>
          </VirtualScrollList>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { stockService } from '@/services/stockService'
import type { Stock } from '@/types/stock'
import VirtualScrollList from '@/components/common/VirtualScrollList.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { debounce } from '@/utils/debounce'

// Props
interface Props {
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  refreshInterval: 300000 // 5分钟
})

// Emits
const emit = defineEmits<{
  'stock-click': [stock: Stock]
  'add-to-watchlist': [stock: Stock]
  'view-detail': [stock: Stock]
}>()

// 状态
const isLoading = ref(false)
const error = ref('')
const activeTab = ref('gainers')

// 数据
const gainers = ref<Stock[]>([])
const losers = ref<Stock[]>([])
const volume = ref<Stock[]>([])

// 标签页配置
const tabs = [
  { key: 'gainers', label: '涨幅榜' },
  { key: 'losers', label: '跌幅榜' },
  { key: 'volume', label: '成交量榜' }
]

// 计算属性
const currentStocks = computed(() => {
  switch (activeTab.value) {
    case 'gainers':
      return gainers.value
    case 'losers':
      return losers.value
    case 'volume':
      return volume.value
    default:
      return []
  }
})

// 优化：批量获取股票行情数据
const getBatchStockQuotes = async (symbols: string[]): Promise<Record<string, any>> => {
  try {
    // 尝试使用批量API（如果后端支持）
    const response = await fetch('/api/stocks/quotes/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbols: symbols.slice(0, 50) }) // 限制数量
    })

    if (response.ok) {
      const data = await response.json()
      return data.quotes || {}
    }
  } catch (error) {
    console.warn('批量获取行情失败，回退到单个获取:', error)
  }

  // 回退到单个获取，但限制并发数
  const quotes: Record<string, any> = {}
  const batchSize = 10 // 限制并发数

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)
    const batchPromises = batch.map(async (symbol) => {
      try {
        const quote = await stockService.getStockQuote(symbol)
        return { symbol, quote }
      } catch (err) {
        console.warn(`获取股票 ${symbol} 行情失败:`, err)
        return { symbol, quote: null }
      }
    })

    const batchResults = await Promise.allSettled(batchPromises)
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.quote) {
        quotes[result.value.symbol] = result.value.quote
      }
    })

    // 添加小延迟避免API限制
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return quotes
}

// 方法
const refreshDataInternal = async () => {
  if (isLoading.value) return

  isLoading.value = true
  error.value = ''

  try {
    console.log('[PopularStocks] 开始刷新数据...')
    const startTime = performance.now()

    // 获取股票基础数据
    const stocks = await stockService.getStocks()

    if (!stocks || stocks.length === 0) {
      throw new Error('未获取到股票数据')
    }

    // 优化：只获取前50个股票的行情数据，减少API调用
    const topStocks = stocks.slice(0, 50)
    const symbols = topStocks.map(stock => stock.symbol)

    // 批量获取行情数据
    const quotes = await getBatchStockQuotes(symbols)

    // 合并股票基础信息和行情数据
    const stocksWithQuotes = topStocks.map(stock => {
      const quote = quotes[stock.symbol]
      return {
        ...stock,
        price: quote?.price || 0,
        change: quote?.change || 0,
        changePercent: quote?.changePercent || 0,
        volume: quote?.vol || 0,
        turnover: quote?.amount || 0
      }
    })

    // 过滤有效数据
    const validStocks = stocksWithQuotes.filter(stock => stock.price > 0)

    // 按涨幅排序（涨幅榜）
    gainers.value = [...validStocks]
      .sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))
      .slice(0, 20)

    // 按跌幅排序（跌幅榜）
    losers.value = [...validStocks]
      .sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0))
      .slice(0, 20)

    // 按成交量排序（成交量榜）
    volume.value = [...validStocks]
      .sort((a, b) => (b.volume || 0) - (a.volume || 0))
      .slice(0, 20)

    const loadTime = performance.now() - startTime
    console.log(`[PopularStocks] 数据刷新完成，耗时: ${loadTime.toFixed(2)}ms，有效股票数: ${validStocks.length}`)

  } catch (err) {
    console.error('获取热门股票数据失败:', err)
    error.value = err instanceof Error ? err.message : '获取数据失败'
  } finally {
    isLoading.value = false
  }
}

// 使用防抖处理的刷新方法
const refreshData = debounce(refreshDataInternal, 1000)

const formatPrice = (price: number): string => {
  return price ? price.toFixed(2) : '--'
}

const formatChange = (stock: any): string => {
  if (activeTab.value === 'volume') {
    return formatVolume(stock.volume)
  }

  const changePercent = stock.changePercent || 0
  return changePercent > 0 ? `+${changePercent.toFixed(2)}%` : `${changePercent.toFixed(2)}%`
}

const formatVolume = (volume: number): string => {
  if (volume >= 100000000) {
    return `${(volume / 100000000).toFixed(1)}亿`
  } else if (volume >= 10000) {
    return `${(volume / 10000).toFixed(1)}万`
  }
  return volume.toString()
}

const getChangeClass = (stock: any): string => {
  if (activeTab.value === 'volume') {
    return 'volume'
  }

  const changePercent = stock.changePercent || 0
  return changePercent > 0 ? 'positive' : changePercent < 0 ? 'negative' : 'neutral'
}

const getChangeLabel = (): string => {
  switch (activeTab.value) {
    case 'gainers':
    case 'losers':
      return '涨跌幅'
    case 'volume':
      return '成交量'
    default:
      return '变化'
  }
}

// 监听标签页变化
watch(activeTab, () => {
  if (currentStocks.value.length === 0) {
    refreshData()
  }
})

// 生命周期
onMounted(() => {
  refreshData()

  // 设置定时刷新
  if (props.refreshInterval > 0) {
    setInterval(refreshData, props.refreshInterval)
  }
})
</script>

<style scoped>
.enhanced-popular-stocks-widget {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--border-light);
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-secondary);
}

.widget-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--primary-color);
  font-weight: 600;
}

.widget-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.tab-selector {
  display: flex;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-md);
  padding: 2px;
}

.tab-button {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-button.active {
  background: var(--accent-color);
  color: white;
}

.refresh-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.refresh-btn:hover {
  background: var(--bg-secondary);
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.widget-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.loading-state,
.error-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--text-secondary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-light);
  border-top: 3px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-md);
}

.error-icon,
.empty-icon {
  font-size: 2rem;
  margin-bottom: var(--spacing-md);
}

.retry-btn {
  margin-top: var(--spacing-md);
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
}

.stocks-list {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.list-header {
  display: grid;
  grid-template-columns: 40px 80px 1fr 80px 80px 60px;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
}

.list-body {
  flex: 1;
  overflow-y: auto;
}

.stock-row {
  display: grid;
  grid-template-columns: 40px 80px 1fr 80px 80px 60px;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  font-size: var(--font-size-sm);
}

.stock-row:hover {
  background: var(--bg-secondary);
}

.rank-col {
  text-align: center;
  color: var(--text-secondary);
}

.symbol-col {
  color: var(--accent-color);
  font-weight: 500;
}

.name-col {
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.price-col {
  text-align: right;
  color: var(--text-primary);
  font-weight: 500;
}

.change-col {
  text-align: right;
  font-weight: 500;
}

.change-col.positive {
  color: var(--stock-up);
}

.change-col.negative {
  color: var(--stock-down);
}

.change-col.neutral {
  color: var(--text-secondary);
}

.change-col.volume {
  color: var(--info-color);
}

.action-col {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.action-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: background-color var(--transition-fast);
}

.action-btn:hover {
  background: var(--bg-tertiary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .list-header,
  .stock-row {
    grid-template-columns: 30px 60px 1fr 60px 70px 50px;
    font-size: var(--font-size-xs);
  }

  .widget-header {
    padding: var(--spacing-sm);
  }

  .tab-button {
    padding: var(--spacing-xs);
    font-size: var(--font-size-xs);
  }
}
</style>
