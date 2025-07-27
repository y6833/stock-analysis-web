<template>
  <div class="stock-analysis">
    <!-- 顶部搜索栏 -->
    <div class="top-search-bar">
      <div class="search-container">
        <UnifiedStockSearch placeholder="搜索股票代码或名称..." @select="onStockSelect" @clear="onStockClear" />
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>正在加载股票数据...</p>
      </div>
    </div>

    <!-- 股票内容 -->
    <div v-else-if="currentStock" class="stock-content">
      <!-- 股票信息卡片 -->
      <div class="stock-info-card">
        <div class="stock-header">
          <div class="stock-identity">
            <h1 class="stock-name">{{ currentStock.name }}</h1>
            <div class="stock-meta">
              <span class="stock-code">{{ currentStock.symbol }}</span>
              <span v-if="currentStock.data_source" class="data-source-badge"
                :class="getDataSourceClass(currentStock.data_source)" :title="'数据来源: ' + currentStock.data_source">
                {{ getDataSourceIcon(currentStock.data_source) }}
              </span>
            </div>
          </div>

          <div class="price-section">
            <div class="current-price">¥{{ formatPrice(currentStock.price) }}</div>
            <div class="price-change" :class="getPriceChangeClass(currentStock)">
              <span class="change-amount">
                {{ formatChange(currentStock) }}
              </span>
              <span class="change-percent">
                ({{ formatPercentChange(currentStock) }})
              </span>
            </div>
          </div>
        </div>

        <!-- 股票详细数据 -->
        <div class="stock-metrics">
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="metric-label">开盘</span>
              <span class="metric-value">{{ formatPrice(currentStock.open) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">最高</span>
              <span class="metric-value high">{{ formatPrice(currentStock.high) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">最低</span>
              <span class="metric-value low">{{ formatPrice(currentStock.low) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">昨收</span>
              <span class="metric-value">{{ formatPrice(currentStock.pre_close) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">成交量</span>
              <span class="metric-value">{{ formatVolume(currentStock.vol || currentStock.volume || 0) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">成交额</span>
              <span class="metric-value">{{ formatAmount(currentStock.amount || 0) }}</span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-bar">
          <button class="action-button primary" @click="refreshStockData">
            <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4a9 9 0 0 1-14.85 4.36L23 14" />
            </svg>
            刷新数据
          </button>
          <button class="action-button secondary" @click="addToWatchlist">
            <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z" />
            </svg>
            添加关注
          </button>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="chart-section">
        <StockChart v-if="currentStock" :symbol="currentStock.symbol" :name="currentStock.name" />
      </div>

      <!-- 技术分析区域 -->
      <div class="analysis-section">
        <TechnicalSignals v-if="currentStock" :stock-code="currentStock.symbol" :kline-data="preparedKlineData" />
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-content">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <h3>开始股票分析</h3>
        <p>请在上方搜索框中输入股票代码或名称来开始分析</p>

        <!-- 调试信息 -->
        <div class="debug-info"
          style="margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 4px; font-size: 12px; text-align: left;">
          <p><strong>调试信息:</strong></p>
          <p>currentStock: {{ currentStock ? `${currentStock.name} (${currentStock.symbol})` : 'null' }}</p>
          <p>isLoading: {{ isLoading }}</p>
          <button @click="testLoadStock"
            style="margin-top: 10px; padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">
            测试加载万科A
          </button>
        </div>
      </div>
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
  console.log(`[StockAnalysisView] selectStock 被调用，symbol: ${symbol}`)
  isLoading.value = true
  console.log(`[StockAnalysisView] 开始加载股票: ${symbol}`)

  try {
    // 使用不强制刷新的方式获取股票行情，优先使用缓存
    console.log(`[StockAnalysisView] 调用 stockService.getStockQuote(${symbol}, false)`)
    const quote = await stockService.getStockQuote(symbol, false)
    console.log(`[StockAnalysisView] 获取到股票数据:`, quote)

    if (quote && quote.symbol) {
      currentStock.value = quote
      console.log(`[StockAnalysisView] 当前股票状态:`, currentStock.value)
      console.log(`[StockAnalysisView] currentStock.value 是否为真值:`, !!currentStock.value)

      // 更新URL参数，方便分享和刷新
      const url = new URL(window.location.href)
      url.searchParams.set('symbol', symbol)
      window.history.replaceState({}, '', url.toString())

      toast.success(`已加载 ${quote.name} (${symbol}) 的数据`)
    } else {
      console.error(`[StockAnalysisView] 获取到的股票数据无效:`, quote)
      toast.error('获取到的股票数据无效')
    }
  } catch (error) {
    console.error(`获取股票 ${symbol} 行情失败:`, error)
    toast.error(`获取股票行情失败: ${(error as Error).message || '未知错误'}`)
  } finally {
    isLoading.value = false
    console.log(`[StockAnalysisView] selectStock 完成，isLoading: ${isLoading.value}, currentStock: ${!!currentStock.value}`)
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

// 格式化价格
const formatPrice = (price: number | undefined | null): string => {
  if (price === undefined || price === null || isNaN(price)) {
    return '--'
  }
  return price.toFixed(2)
}

// 获取价格变化样式类
const getPriceChangeClass = (stock: any): string => {
  const change = stock?.change || stock?.pct_chg || 0
  return change >= 0 ? 'positive' : 'negative'
}

// 格式化价格变化
const formatChange = (stock: any): string => {
  const change = stock?.change || 0
  if (isNaN(change)) return '--'
  const prefix = change >= 0 ? '+' : ''
  return `${prefix}${change.toFixed(2)}`
}

// 格式化百分比变化
const formatPercentChange = (stock: any): string => {
  const pctChg = stock?.pct_chg || 0
  if (isNaN(pctChg)) return '--'
  const prefix = pctChg >= 0 ? '+' : ''
  return `${prefix}${pctChg.toFixed(2)}%`
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

// 测试加载股票
const testLoadStock = async () => {
  console.log('[StockAnalysisView] 测试加载万科A')
  await selectStock('000002.SZ')
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
/* 全局变量 */
:root {
  --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-success: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  --gradient-danger: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  --shadow-light: 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-medium: 0 4px 16px rgba(0, 0, 0, 0.1);
  --shadow-heavy: 0 8px 32px rgba(0, 0, 0, 0.15);
  --border-radius: 12px;
  --border-radius-small: 8px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stock-analysis {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
  padding: 0;
  position: relative;
}

.stock-analysis::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  z-index: -1;
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

/* 顶部搜索栏 */
.top-search-bar {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 20px 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.search-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 加载状态 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-content {
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-heavy);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.loading-content p {
  color: #6b7280;
  font-size: 16px;
  margin: 0;
}

/* 股票内容 */
.stock-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 股票信息卡片 */
.stock-info-card {
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.stock-info-card:hover {
  box-shadow: var(--shadow-heavy);
  transform: translateY(-2px);
}

.stock-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 40px;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #667eea 100%);
  color: white;
  position: relative;
}

.stock-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
  opacity: 0.3;
}

.stock-identity h1.stock-name {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: white;
}

.stock-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stock-code {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.data-source-badge {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.price-section {
  text-align: right;
}

.current-price {
  font-size: 56px;
  font-weight: 900;
  color: white;
  line-height: 1;
  margin-bottom: 12px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.02em;
}

.price-change {
  font-size: 16px;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.price-change.positive {
  color: #10b981;
}

.price-change.negative {
  color: #ef4444;
}

.change-amount {
  font-size: 18px;
}

.change-percent {
  font-size: 14px;
  opacity: 0.9;
}

/* 股票指标 */
.stock-metrics {
  padding: 32px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.04);
}

.metric-item:hover {
  background: linear-gradient(135deg, #e2e8f0 0%, #f1f5f9 100%);
  border-color: rgba(59, 130, 246, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
}

.metric-label {
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
}

.metric-value {
  font-weight: 700;
  color: #1e293b;
  font-size: 16px;
}

.metric-value.high {
  color: #ef4444;
}

.metric-value.low {
  color: #10b981;
}

/* 操作按钮 */
.action-bar {
  display: flex;
  gap: 16px;
  padding: 24px 32px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: var(--border-radius-small);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  position: relative;
  overflow: hidden;
}

.action-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.action-button:hover::before {
  left: 100%;
}

.action-button.primary {
  background: var(--gradient-primary);
  color: white;
}

.action-button.primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.action-button.secondary {
  background: white;
  color: #3b82f6;
  border: 2px solid #3b82f6;
}

.action-button.secondary:hover {
  background: #3b82f6;
  color: white;
  transform: translateY(-2px);
}

.button-icon {
  width: 16px;
  height: 16px;
  stroke-width: 2;
}

/* 图表和分析区域 */
.chart-section,
.analysis-section {
  background: white;
  border-radius: 20px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.06), 0 4px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.chart-section {
  min-height: 600px;
  /* 确保图表区域有足够的高度 */
}

.analysis-section {
  min-height: 400px;
  /* 确保分析区域有足够的高度 */
}

.chart-section:hover,
.analysis-section:hover {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.06);
  transform: translateY(-4px);
}

/* 空状态 */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 40px;
}

.empty-content {
  text-align: center;
  max-width: 400px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  color: #9ca3af;
  margin: 0 auto 24px;
  stroke-width: 1.5;
}

.empty-content h3 {
  font-size: 24px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
}

.empty-content p {
  color: #6b7280;
  font-size: 16px;
  line-height: 1.6;
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stock-content {
    padding: 16px;
    gap: 16px;
  }

  .stock-header {
    flex-direction: column;
    gap: 20px;
    padding: 24px;
  }

  .price-section {
    text-align: left;
    width: 100%;
  }

  .current-price {
    font-size: 36px;
  }

  .stock-identity h1.stock-name {
    font-size: 24px;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .action-bar {
    flex-direction: column;
    padding: 20px;
  }

  .action-button {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .top-search-bar {
    padding: 16px 0;
  }

  .search-container {
    padding: 0 16px;
  }

  .stock-header {
    padding: 20px;
  }

  .stock-metrics {
    padding: 20px;
  }

  .action-bar {
    padding: 16px;
  }
}
</style>
