<template>
  <div class="stock-analysis">
    <div class="page-header">
      <h1>专业股票分析工具</h1>
      <p class="subtitle">基于技术指标的智能分析系统，帮助您做出更明智的投资决策</p>
    </div>

    <div class="stock-search">
      <UnifiedStockSearch placeholder="输入股票代码或名称搜索..." @select="onStockSelect" @clear="onStockClear" />
    </div>

    <div v-if="isLoading" class="loading-container">
      <p>正在加载股票数据...</p>
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="currentStock" class="stock-content">
      <div class="stock-header">
        <div class="stock-title">
          <h2>{{ currentStock.name }}</h2>
          <span class="stock-code">{{ currentStock.symbol }}</span>
          <span v-if="currentStock.data_source" class="stock-data-source"
            :class="getDataSourceClass(currentStock.data_source)" :title="'数据来源: ' + currentStock.data_source">
            {{ getDataSourceIcon(currentStock.data_source) }}
          </span>
        </div>
        <div class="stock-price-container">
          <div class="stock-price">{{ (currentStock.price || 0).toFixed(2) }}</div>
          <div class="stock-change" :class="(currentStock.pct_chg || 0) >= 0 ? 'up' : 'down'">
            {{ (currentStock.pct_chg || 0) >= 0 ? '+' : '' }}{{ (currentStock.pct_chg || 0).toFixed(2) }}%
          </div>
        </div>
      </div>

      <div class="stock-details">
        <div class="detail-item">
          <span class="detail-label">开盘价</span>
          <span class="detail-value">{{ (currentStock.open || 0).toFixed(2) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">最高价</span>
          <span class="detail-value">{{ (currentStock.high || 0).toFixed(2) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">最低价</span>
          <span class="detail-value">{{ (currentStock.low || 0).toFixed(2) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">昨收价</span>
          <span class="detail-value">{{ (currentStock.pre_close || 0).toFixed(2) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">成交量</span>
          <span class="detail-value">{{ formatVolume(currentStock.vol || 0) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">成交额</span>
          <span class="detail-value">{{ formatAmount(currentStock.amount || 0) }}</span>
        </div>
      </div>

      <div class="action-buttons">
        <button class="action-btn refresh-btn" @click="refreshStockData">
          <span>刷新数据</span>
        </button>
        <button class="action-btn add-watchlist-btn" @click="addToWatchlist">
          <span>添加到关注列表</span>
        </button>
      </div>

      <div class="chart-container">
        <StockChart v-if="currentStock" :symbol="currentStock.symbol" :name="currentStock.name" />
        <div v-else class="chart-placeholder">
          <p>请选择股票以查看图表</p>
        </div>
      </div>

      <!-- 技术信号面板 -->
      <div class="technical-signals-container">
        <TechnicalSignals v-if="currentStock" :stock-code="currentStock.symbol" :kline-data="preparedKlineData" />
      </div>
    </div>

    <div v-else class="empty-state">
      <p>请搜索并选择一只股票进行分析</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { stockService } from '@/services/stockService'
import { dashboardService } from '@/services/dashboardService'
import { toast } from '@/utils/toast'
import StockChart from '@/components/charts/StockChart.vue'
import TechnicalSignals from '@/components/TechnicalSignals.vue'
import UnifiedStockSearch from '@/components/common/UnifiedStockSearch.vue'
import type { Stock, StockQuote } from '@/types/stock'
import type { DashboardSettings, Watchlist, WatchlistItem } from '@/types/dashboard'

// 状态
const currentStock = ref<StockQuote | null>(null)
const isLoading = ref(false)
const klineData = ref<any>({})

// 计算属性 - 为技术指标组件准备K线数据
const preparedKlineData = computed(() => {
  if (!currentStock.value) return {}

  // 这里可以从历史数据API获取完整的K线数据
  // 暂时使用当前股票数据构造简单的K线数据
  return {
    open: [currentStock.value.open],
    high: [currentStock.value.high],
    low: [currentStock.value.low],
    close: [currentStock.value.price],
    volume: [currentStock.value.vol],
  }
})

// 股票搜索事件处理
const onStockSelect = async (stock: Stock) => {
  await selectStock(stock.symbol || stock.tsCode)
}

const onStockClear = () => {
  // 可以在这里添加清除当前股票的逻辑
  console.log('搜索已清除')
}

// 选择股票
const selectStock = async (symbol: string) => {
  isLoading.value = true

  try {
    // 使用不强制刷新的方式获取股票行情，优先使用缓存
    const quote = await stockService.getStockQuote(symbol, false)
    currentStock.value = quote

    // 更新URL参数，方便分享和刷新
    const url = new URL(window.location.href)
    url.searchParams.set('symbol', symbol)
    window.history.replaceState({}, '', url.toString())

    toast.success(`已加载 ${quote.name} (${symbol}) 的数据`)
  } catch (error) {
    console.error(`获取股票 ${symbol} 行情失败:`, error)
    toast.error(`获取股票行情失败: ${(error as Error).message || '未知错误'}`)
  } finally {
    isLoading.value = false
  }
}

// 刷新股票数据
const refreshStockData = async () => {
  if (!currentStock.value) return

  isLoading.value = true

  try {
    // 强制刷新股票行情
    const quote = await stockService.getStockQuote(currentStock.value.symbol, true)
    currentStock.value = quote
    toast.success('股票数据已刷新')
  } catch (error) {
    console.error(`刷新股票 ${currentStock.value.symbol} 行情失败:`, error)
    toast.error(`刷新股票行情失败: ${(error as Error).message || '未知错误'}`)
  } finally {
    isLoading.value = false
  }
}

// 添加到关注列表
const addToWatchlist = async () => {
  if (!currentStock.value) return

  try {
    // 获取当前用户的关注列表
    const dashboardSettings = await dashboardService.getDashboardSettings()

    if (!dashboardSettings || !dashboardSettings.watchlists) {
      toast.error('获取关注列表失败')
      return
    }

    // 检查是否已经在关注列表中
    const defaultWatchlist =
      dashboardSettings.watchlists.find(
        (w: Watchlist) => w.id === dashboardSettings.activeWatchlistId
      ) || dashboardSettings.watchlists[0]

    if (!defaultWatchlist) {
      toast.error('未找到默认关注列表')
      return
    }

    // 检查股票是否已在关注列表中
    const isAlreadyInWatchlist = defaultWatchlist.items.some(
      (stock: WatchlistItem) => stock.symbol === currentStock.value?.symbol
    )

    if (isAlreadyInWatchlist) {
      toast.info(`${currentStock.value.name} 已在关注列表中`)
      return
    }

    // 添加到关注列表
    defaultWatchlist.items.push({
      symbol: currentStock.value.symbol,
      name: currentStock.value.name,
      price: currentStock.value.price,
      change: currentStock.value.change,
      changePercent: currentStock.value.pct_chg,
      volume: currentStock.value.vol,
      turnover: currentStock.value.amount,
      notes: '',
      addedAt: new Date().toISOString(),
    })

    // 保存更新后的关注列表
    await dashboardService.saveDashboardSettings(dashboardSettings)

    toast.success(`已添加 ${currentStock.value.name} 到关注列表`)
  } catch (error) {
    console.error('添加到关注列表失败:', error)
    toast.error(`添加到关注列表失败: ${(error as Error).message || '未知错误'}`)
  }
}

// 格式化成交量
const formatVolume = (vol: number): string => {
  if (vol >= 100000000) {
    return (vol / 100000000).toFixed(2) + '亿手'
  } else if (vol >= 10000) {
    return (vol / 10000).toFixed(2) + '万手'
  } else {
    return vol.toFixed(0) + '手'
  }
}

// 格式化成交额
const formatAmount = (amount: number): string => {
  if (amount >= 100000000) {
    return (amount / 100000000).toFixed(2) + '亿'
  } else if (amount >= 10000) {
    return (amount / 10000).toFixed(2) + '万'
  } else {
    return amount.toFixed(0)
  }
}

// 获取数据源类名
const getDataSourceClass = (dataSource: string): string => {
  if (!dataSource) return ''

  if (dataSource.includes('api')) return 'api'
  if (dataSource.includes('cache')) return 'cache'
  if (dataSource.includes('mock')) return 'mock'

  return ''
}

// 获取数据源图标
const getDataSourceIcon = (dataSource: string): string => {
  if (!dataSource) return ''

  if (dataSource.includes('api')) return '🔄'
  if (dataSource.includes('cache')) return '💾'
  if (dataSource.includes('mock')) return '📊'

  return ''
}

onMounted(async () => {
  console.log('StockAnalysisView 组件已加载')

  try {
    // 尝试从URL参数获取股票代码
    const urlParams = new URLSearchParams(window.location.search)
    const symbolFromUrl = urlParams.get('symbol')

    if (symbolFromUrl) {
      // 如果URL中有股票代码，直接加载该股票
      await selectStock(symbolFromUrl)
    } else {
      // 否则尝试加载默认股票
      try {
        const dashboardSettings = await dashboardService.getDashboardSettings()
        if (dashboardSettings && dashboardSettings.defaultSymbol) {
          await selectStock(dashboardSettings.defaultSymbol)
        } else {
          // 如果没有默认股票，加载万科A
          await selectStock('000002.SZ')
        }
      } catch (settingsError) {
        console.error('获取仪表盘设置失败:', settingsError)
        // 加载万科A作为备选
        await selectStock('000002.SZ')
      }
    }
  } catch (error) {
    console.error('初始化股票数据失败:', error)
    toast.error('初始化股票数据失败，请手动搜索股票')
  }
})
</script>

<style scoped>
.stock-analysis {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 28px;
  color: var(--primary-color);
  margin-bottom: 10px;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 16px;
}

.stock-search {
  position: relative;
  margin-bottom: 20px;
}

.search-input {
  display: flex;
  width: 100%;
}

.search-input input {
  flex: 1;
  padding: 12px 15px;
  border: 1px solid var(--border-color);
  border-radius: 4px 0 0 4px;
  font-size: 16px;
}

.search-btn {
  padding: 0 15px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: white;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
  max-height: 300px;
  overflow-y: auto;
}

.search-result-item {
  padding: 10px 15px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
}

.search-result-item:hover {
  background-color: var(--bg-hover);
}

.stock-symbol {
  font-weight: bold;
  color: var(--text-primary);
}

.stock-name {
  color: var(--text-secondary);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(66, 185, 131, 0.2);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-top: 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.stock-content {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}

.stock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.stock-title {
  display: flex;
  align-items: center;
}

.stock-title h2 {
  margin: 0;
  margin-right: 10px;
}

.stock-code {
  color: var(--text-secondary);
  font-size: 14px;
  margin-right: 10px;
}

.stock-data-source {
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 3px;
  background-color: var(--bg-tertiary);
}

.stock-data-source.api {
  color: var(--accent-color);
}

.stock-data-source.cache {
  color: var(--info-color);
}

.stock-data-source.mock {
  color: var(--warning-color);
}

.stock-price-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.stock-price {
  font-size: 24px;
  font-weight: bold;
}

.stock-change {
  font-size: 16px;
}

.stock-change.up {
  color: var(--stock-up);
}

.stock-change.down {
  color: var(--stock-down);
}

.stock-details {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.detail-item {
  background-color: var(--bg-primary);
  padding: 10px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
}

.detail-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 5px;
}

.detail-value {
  font-size: 16px;
  font-weight: bold;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.action-btn {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.refresh-btn {
  background-color: var(--info-color);
  color: white;
}

.add-watchlist-btn {
  background-color: var(--primary-color);
  color: white;
}

.chart-container {
  background-color: var(--bg-primary);
  border-radius: 4px;
  padding: 20px;
  min-height: 400px;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: var(--text-secondary);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .stock-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .stock-price-container {
    align-items: flex-start;
    margin-top: 10px;
  }

  .stock-details {
    grid-template-columns: repeat(2, 1fr);
  }
}

.technical-signals-container {
  margin-top: 20px;
}
</style>
