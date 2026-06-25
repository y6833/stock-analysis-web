<template>
  <div class="stock-analysis">
    <PageLayout :title="pageTitle" :subtitle="pageSubtitle">
      <template #actions>
        <div class="search-container">
          <UnifiedStockSearch placeholder="搜索股票代码或名称..." @select="onStockSelect" @clear="onStockClear" />
        </div>
      </template>

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
            <div class="stock-title-row">
              <h1 class="stock-name">{{ currentStock.name }}</h1>
              <div class="stock-actions">
                <button class="icon-button" @click="refreshStockData" :disabled="isRefreshing" title="刷新数据">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" :class="{ spinning: isRefreshing }">
                    <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4a9 9 0 0 1-14.85 4.36L23 14" />
                  </svg>
                </button>
                <button class="icon-button" @click="addToWatchlist" title="添加到关注">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z" />
                  </svg>
                </button>
                <button class="icon-button" @click="shareStock" title="分享">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </button>
              </div>
            </div>
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
            <div class="price-time" v-if="(currentStock as any).timestamp">
              {{ formatTime((currentStock as any).timestamp) }}
            </div>
          </div>
        </div>

        <!-- 股票详细数据 -->
        <div class="stock-metrics">
          <div class="metrics-grid">
            <div class="metric-item">
              <div class="metric-icon">📈</div>
              <div class="metric-content">
                <span class="metric-label">开盘</span>
                <span class="metric-value">{{ formatPrice(currentStock.open) }}</span>
              </div>
            </div>
            <div class="metric-item">
              <div class="metric-icon">⬆️</div>
              <div class="metric-content">
                <span class="metric-label">最高</span>
                <span class="metric-value high">{{ formatPrice(currentStock.high) }}</span>
              </div>
            </div>
            <div class="metric-item">
              <div class="metric-icon">⬇️</div>
              <div class="metric-content">
                <span class="metric-label">最低</span>
                <span class="metric-value low">{{ formatPrice(currentStock.low) }}</span>
              </div>
            </div>
            <div class="metric-item">
              <div class="metric-icon">📊</div>
              <div class="metric-content">
                <span class="metric-label">昨收</span>
                <span class="metric-value">{{ formatPrice(currentStock.pre_close) }}</span>
              </div>
            </div>
            <div class="metric-item">
              <div class="metric-icon">📦</div>
              <div class="metric-content">
                <span class="metric-label">成交量</span>
                <span class="metric-value">{{ formatVolume(currentStock.vol || (currentStock as any).volume || 0)
                  }}</span>
              </div>
            </div>
            <div class="metric-item">
              <div class="metric-icon">💰</div>
              <div class="metric-content">
                <span class="metric-label">成交额</span>
                <span class="metric-value">{{ formatAmount(currentStock.amount || 0) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 标签页导航 -->
      <div class="tabs-container">
        <div class="tabs-header">
          <button v-for="tab in tabs" :key="tab.id" :class="['tab-button', { active: activeTab === tab.id }]"
            @click="activeTab = tab.id">
            <span class="tab-icon">{{ tab.icon }}</span>
            <span class="tab-label">{{ tab.label }}</span>
          </button>
        </div>

        <!-- 标签页内容 -->
        <div class="tabs-content">
          <!-- 概览标签页 -->
          <div v-show="activeTab === 'overview'" class="tab-panel">
            <div class="panel-grid">
              <!-- 图表区域 -->
              <div class="panel-card chart-card">
                <div class="card-header">
                  <h3>📈 价格走势</h3>
                </div>
                <div class="card-body">
                  <StockChart v-if="currentStock" :symbol="currentStock.symbol" :name="currentStock.name" />
                </div>
              </div>

              <!-- 技术分析区域 -->
              <div class="panel-card analysis-card">
                <div class="card-header">
                  <h3>🔍 技术信号</h3>
                </div>
                <div class="card-body">
                  <TechnicalSignals v-if="currentStock" :stock-code="currentStock.symbol"
                    :kline-data="preparedKlineData" />
                </div>
              </div>
            </div>
          </div>

          <!-- 技术分析标签页 -->
          <div v-show="activeTab === 'technical'" class="tab-panel">
            <div class="panel-card">
              <div class="card-header">
                <h3>📊 技术分析</h3>
                <p class="card-subtitle">深度技术指标分析和信号识别</p>
              </div>
              <div class="card-body">
                <TechnicalSignals v-if="currentStock" :stock-code="currentStock.symbol"
                  :kline-data="preparedKlineData" />
              </div>
            </div>
          </div>

          <!-- 财务数据标签页 -->
          <div v-show="activeTab === 'financial'" class="tab-panel">
            <div class="panel-card">
              <div class="card-header">
                <h3>💼 财务数据</h3>
                <p class="card-subtitle">财务指标和基本面分析</p>
              </div>
              <div class="card-body">
                <div class="financial-placeholder">
                  <p>财务数据功能开发中...</p>
                  <p class="placeholder-hint">将显示PE、PB、ROE、营收、净利润等财务指标</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 新闻公告标签页 -->
          <div v-show="activeTab === 'news'" class="tab-panel">
            <div class="panel-card">
              <div class="card-header">
                <h3>📰 新闻公告</h3>
                <p class="card-subtitle">最新资讯和公司公告</p>
              </div>
              <div class="card-body">
                <div class="news-placeholder">
                  <p>新闻公告功能开发中...</p>
                  <p class="placeholder-hint">将显示相关新闻、公告和研报</p>
                </div>
              </div>
            </div>
          </div>
        </div>
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
        <p>请使用右上角搜索框输入股票代码或名称来开始分析</p>
        <div class="empty-actions">
          <button class="empty-button" @click="selectStock('000002.SZ')">
            查看示例：万科A
          </button>
        </div>
      </div>
    </div>
    </PageLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import PageLayout from '@/components/common/PageLayout.vue'
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
const isRefreshing = ref(false)
const activeTab = ref('overview')

const pageTitle = computed(() => currentStock.value?.name || '股票分析')
const pageSubtitle = computed(() =>
  currentStock.value?.symbol
    ? `${currentStock.value.symbol} · 多维度分析与技术指标`
    : '搜索股票代码或名称开始分析',
)

// 标签页配置
const tabs = [
  { id: 'overview', label: '概览', icon: '📊' },
  { id: 'technical', label: '技术分析', icon: '🔍' },
  { id: 'financial', label: '财务数据', icon: '💼' },
  { id: 'news', label: '新闻公告', icon: '📰' }
]

// 计算属性 - 为技术指标组件准备K线数据
const preparedKlineData = computed(() => {
  if (!currentStock.value) return {}

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
  await selectStock(stock.symbol || (stock as any).tsCode || '')
}

const onStockClear = () => {
  console.log('搜索已清除')
}

// 选择股票
const selectStock = async (symbol: string) => {
  console.log(`[StockAnalysisView] selectStock 被调用，symbol: ${symbol}`)
  isLoading.value = true

  try {
    const quote = await stockService.getStockQuote(symbol, false)
    console.log(`[StockAnalysisView] 获取到股票数据:`, quote)

    if (quote && quote.symbol) {
      currentStock.value = quote

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
  }
}

// 刷新股票数据
const refreshStockData = async () => {
  if (!currentStock.value) return

  isRefreshing.value = true

  try {
    const quote = await stockService.getStockQuote(currentStock.value.symbol, true)
    currentStock.value = quote
    toast.success('股票数据已刷新')
  } catch (error) {
    console.error(`刷新股票 ${currentStock.value.symbol} 行情失败:`, error)
    toast.error(`刷新股票行情失败: ${(error as Error).message || '未知错误'}`)
  } finally {
    isRefreshing.value = false
  }
}

// 添加到关注列表
const addToWatchlist = async () => {
  if (!currentStock.value) return

  try {
    const dashboardSettings = await dashboardService.getDashboardSettings()

    if (!dashboardSettings || !dashboardSettings.watchlists) {
      toast.error('获取关注列表失败')
      return
    }

    const defaultWatchlist =
      dashboardSettings.watchlists.find(
        (w: Watchlist) => w.id === (dashboardSettings.activeWatchlistId as any)
      ) || dashboardSettings.watchlists[0]

    if (!defaultWatchlist) {
      toast.error('未找到默认关注列表')
      return
    }

    const items = defaultWatchlist.items || defaultWatchlist.watchlist_items || []
    const isAlreadyInWatchlist = items.some(
      (stock: WatchlistItem) =>
        stock.symbol === currentStock.value?.symbol ||
        stock.stockCode === currentStock.value?.symbol
    )

    if (isAlreadyInWatchlist) {
      toast.info(`${currentStock.value.name} 已在关注列表中`)
      return
    }

    const newItem: WatchlistItem = {
      id: Date.now(),
      watchlistId: defaultWatchlist.id,
      stockCode: currentStock.value.symbol,
      stockName: currentStock.value.name,
      symbol: currentStock.value.symbol,
      name: currentStock.value.name,
      price: currentStock.value.price || 0,
      change: currentStock.value.change || 0,
      changePercent: currentStock.value.pct_chg || 0,
      volume: currentStock.value.vol || 0,
      turnover: currentStock.value.amount || 0,
      notes: '',
      addedAt: new Date().toISOString(),
    }

    if (defaultWatchlist.items) {
      defaultWatchlist.items.push(newItem)
    } else if (defaultWatchlist.watchlist_items) {
      defaultWatchlist.watchlist_items.push(newItem)
    } else {
      defaultWatchlist.items = [newItem]
    }

    await dashboardService.saveDashboardSettings(dashboardSettings)
    toast.success(`已添加 ${currentStock.value.name} 到关注列表`)
  } catch (error) {
    console.error('添加到关注列表失败:', error)
    toast.error(`添加到关注列表失败: ${(error as Error).message || '未知错误'}`)
  }
}

// 分享股票
const shareStock = async () => {
  if (!currentStock.value) return

  try {
    const url = `${window.location.origin}${window.location.pathname}?symbol=${currentStock.value.symbol}`

    if (navigator.share) {
      await navigator.share({
        title: `${currentStock.value.name} (${currentStock.value.symbol}) - 股票分析`,
        text: `查看 ${currentStock.value.name} 的详细分析`,
        url: url
      })
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('链接已复制到剪贴板')
    }
  } catch (error) {
    console.error('分享失败:', error)
    // 如果分享失败，尝试复制到剪贴板
    try {
      const url = `${window.location.origin}${window.location.pathname}?symbol=${currentStock.value.symbol}`
      await navigator.clipboard.writeText(url)
      toast.success('链接已复制到剪贴板')
    } catch (copyError) {
      toast.error('分享失败，请手动复制链接')
    }
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

// 格式化时间
const formatTime = (timestamp: number | string | Date): string => {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前`

    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '--'
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
    const urlParams = new URLSearchParams(window.location.search)
    const symbolFromUrl = urlParams.get('symbol')

    if (symbolFromUrl) {
      await selectStock(symbolFromUrl)
    } else {
      try {
        const dashboardSettings = await dashboardService.getDashboardSettings()
        if (dashboardSettings && dashboardSettings.defaultSymbol) {
          await selectStock(dashboardSettings.defaultSymbol)
        } else {
          // 不自动加载，让用户主动搜索
        }
      } catch (settingsError) {
        console.error('获取仪表盘设置失败:', settingsError)
      }
    }
  } catch (error) {
    console.error('初始化股票数据失败:', error)
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
  --border-radius: 16px;
  --border-radius-small: 8px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stock-analysis {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  position: relative;
}

.search-container {
  min-width: 280px;
}

/* 加载状态 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-content {
  text-align: center;
  padding: 48px;
  background: white;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-heavy);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
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
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 股票信息卡片 */
.stock-info-card {
  background: white;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-medium);
  overflow: hidden;
  transition: var(--transition);
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
  padding: 32px 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: relative;
  overflow: hidden;
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

.stock-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 12px;
}

.stock-identity {
  flex: 1;
}

.stock-identity h1.stock-name {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: white;
  line-height: 1.2;
}

.stock-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stock-code {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
  backdrop-filter: blur(10px);
}

.data-source-badge {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(10px);
}

.stock-actions {
  display: flex;
  gap: 8px;
}

.icon-button {
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
  backdrop-filter: blur(10px);
}

.icon-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.icon-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-button svg {
  width: 20px;
  height: 20px;
  stroke-width: 2;
}

.icon-button svg.spinning {
  animation: spin 1s linear infinite;
}

.price-section {
  text-align: right;
  position: relative;
  z-index: 1;
}

.current-price {
  font-size: 56px;
  font-weight: 900;
  color: white;
  line-height: 1;
  margin-bottom: 12px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.02em;
}

.price-change {
  font-size: 18px;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  margin-bottom: 8px;
}

.price-change.positive {
  color: #10b981;
}

.price-change.negative {
  color: #ef4444;
}

.change-amount {
  font-size: 20px;
}

.change-percent {
  font-size: 16px;
  opacity: 0.9;
}

.price-time {
  font-size: 12px;
  opacity: 0.8;
  color: rgba(255, 255, 255, 0.9);
}

/* 股票指标 */
.stock-metrics {
  padding: 32px 40px;
  background: #f8fafc;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: var(--transition);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
}

.metric-item:hover {
  border-color: rgba(102, 126, 234, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.metric-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.metric-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.metric-label {
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
}

.metric-value {
  font-weight: 700;
  color: #1e293b;
  font-size: 18px;
}

.metric-value.high {
  color: #ef4444;
}

.metric-value.low {
  color: #10b981;
}

/* 标签页 */
.tabs-container {
  background: white;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-medium);
  overflow: hidden;
}

.tabs-header {
  display: flex;
  gap: 4px;
  padding: 8px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: var(--transition);
  white-space: nowrap;
}

.tab-button:hover {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

.tab-button.active {
  background: white;
  color: #667eea;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.tab-icon {
  font-size: 16px;
}

.tab-label {
  font-weight: 600;
}

.tabs-content {
  padding: 24px;
}

.tab-panel {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

.panel-card {
  background: #f8fafc;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.card-header {
  padding: 20px 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.card-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.card-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.card-body {
  padding: 24px;
}

.financial-placeholder,
.news-placeholder {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.placeholder-hint {
  font-size: 13px;
  margin-top: 8px;
  opacity: 0.7;
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
  max-width: 500px;
}

.empty-icon {
  width: 100px;
  height: 100px;
  color: #cbd5e1;
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
  margin: 0 0 24px 0;
}

.empty-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.empty-button {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
}

.empty-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .stock-content {
    padding: 20px;
  }

  .panel-grid {
    grid-template-columns: 1fr;
  }
}

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
    font-size: 40px;
  }

  .stock-identity h1.stock-name {
    font-size: 24px;
  }

  .stock-title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .stock-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .stock-metrics {
    padding: 24px;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .tabs-header {
    padding: 6px;
  }

  .tab-button {
    padding: 10px 16px;
    font-size: 13px;
  }

  .tabs-content {
    padding: 16px;
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

  .current-price {
    font-size: 36px;
  }

  .stock-metrics {
    padding: 20px;
  }

  .metric-item {
    padding: 16px;
  }
}
</style>
