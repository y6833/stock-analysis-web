<template>
  <div class="modern-dashboard">
    <!-- Dashboard Header -->
    <div class="dashboard-header">
      <div class="header-left">
        <h1 class="dashboard-title">
          <el-icon class="title-icon">
            <Grid />
          </el-icon>
          市场仪表盘
        </h1>
        <div class="dashboard-stats">
          <span class="stat-item">
            <span class="stat-label">关注列表:</span>
            <span class="stat-value">{{ dashboardStats.totalWatchlists }}</span>
          </span>
          <span class="stat-item">
            <span class="stat-label">关注股票:</span>
            <span class="stat-value">{{ dashboardStats.totalStocks }}</span>
          </span>
          <span class="stat-item">
            <span class="stat-label">市场状态:</span>
            <span class="stat-value" :class="marketStatusClass">{{ dashboardStats.marketStatus }}</span>
          </span>
        </div>
      </div>

      <div class="header-right">
        <div class="header-actions">
          <!-- 刷新按钮 -->
          <el-button type="primary" :icon="Refresh" :loading="state.isRefreshing" @click="handleRefresh"
            class="action-btn">
            刷新数据
          </el-button>

          <!-- 布局切换 -->
          <el-button-group class="layout-toggle">
            <el-button :type="state.layoutMode === 'grid' ? 'primary' : 'default'" :icon="Grid"
              @click="state.layoutMode = 'grid'" />
            <el-button :type="state.layoutMode === 'list' ? 'primary' : 'default'" :icon="List"
              @click="state.layoutMode = 'list'" />
          </el-button-group>

          <!-- 全屏按钮 -->
          <el-button :icon="FullScreen" @click="toggleFullscreen" class="action-btn" />

          <!-- 设置按钮 -->
          <el-button :icon="Setting" @click="state.showSettings = true" class="action-btn" />
        </div>

        <!-- 最后更新时间 -->
        <div class="last-update" v-if="state.lastUpdateTime">
          <span class="update-label">最后更新:</span>
          <span class="update-time">{{ dashboardStats.lastUpdate }}</span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="state.isLoading" class="dashboard-loading">
      <el-skeleton :rows="6" animated />
      <div class="loading-text">正在加载仪表盘数据...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="state.hasError" class="dashboard-error">
      <el-result icon="error" title="加载失败" :sub-title="state.errorMessage">
        <template #extra>
          <el-button type="primary" @click="initializeDashboard">
            重新加载
          </el-button>
        </template>
      </el-result>
    </div>

    <!-- Dashboard Content -->
    <div v-else class="dashboard-content"
      :class="{ 'layout-grid': state.layoutMode === 'grid', 'layout-list': state.layoutMode === 'list' }">
      <!-- 市场概览 -->
      <div class="widget-container market-overview">
        <ModernMarketOverview :data="marketData" :loading="state.isRefreshing" @refresh="loadMarketData" />
      </div>

      <!-- 关注列表 -->
      <div class="widget-container watchlist">
        <ModernWatchlistWidget :watchlists="watchlists" :active-watchlist-id="activeWatchlistId"
          :loading="state.isRefreshing" @watchlist-change="handleWatchlistChange" @stock-click="handleStockClick"
          @refresh="loadWatchlists" />
      </div>

      <!-- 快速操作 -->
      <div class="widget-container quick-actions">
        <ModernQuickActions @doji-scan="handleDojiScan" @ai-recommend="handleAIRecommend"
          @risk-monitor="handleRiskMonitor" />
      </div>

      <!-- 热门股票 -->
      <div class="widget-container popular-stocks">
        <ModernPopularStocks :stocks="popularStocks" :loading="state.isRefreshing" @stock-click="handleStockClick"
          @add-to-watchlist="handleAddToWatchlist" @refresh="loadPopularStocks" />
      </div>

      <!-- 新闻资讯 -->
      <div class="widget-container news">
        <ModernNewsWidget :news="newsItems" :loading="state.isRefreshing" @news-click="handleNewsClick"
          @refresh="loadNewsItems" />
      </div>

      <!-- 交易信号 -->
      <div class="widget-container trading-signals">
        <ModernTradingSignals :signals="tradingSignals" :loading="state.isRefreshing" @signal-click="handleSignalClick"
          @refresh="loadTradingSignals" />
      </div>
    </div>

    <!-- 设置面板 -->
    <el-drawer v-model="state.showSettings" title="仪表盘设置" direction="rtl" size="400px">
      <div class="settings-content">
        <el-form label-position="top">
          <el-form-item label="自动刷新">
            <el-switch v-model="state.autoRefreshEnabled" @change="handleAutoRefreshToggle" />
          </el-form-item>

          <el-form-item label="刷新间隔(秒)" v-if="state.autoRefreshEnabled">
            <el-input-number v-model="state.refreshInterval" :min="10" :max="300" :step="10"
              @change="handleRefreshIntervalChange" />
          </el-form-item>

          <el-form-item label="默认布局">
            <el-radio-group v-model="state.layoutMode">
              <el-radio label="grid">网格布局</el-radio>
              <el-radio label="list">列表布局</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import { Refresh, Setting, FullScreen, Grid, List } from '@element-plus/icons-vue'

// 服务导入
import { stockService } from '@/services/stockService'
import { dashboardService } from '@/services/dashboardService'
import { watchlistService } from '@/services/watchlistService'
import { marketDataService } from '@/services/marketDataService'

// 类型导入
import type { Stock } from '@/types/stock'
import type { DashboardSettings, Watchlist, WatchlistItem, MarketOverview } from '@/types/dashboard'

// 组件导入
import ModernMarketOverview from '@/components/dashboard/ModernMarketOverview.vue'
import ModernWatchlistWidget from '@/components/dashboard/ModernWatchlistWidget.vue'
import ModernQuickActions from '@/components/dashboard/ModernQuickActions.vue'
import ModernNewsWidget from '@/components/dashboard/ModernNewsWidget.vue'
import ModernPopularStocks from '@/components/dashboard/ModernPopularStocks.vue'
import ModernTradingSignals from '@/components/dashboard/ModernTradingSignals.vue'

// 工具导入
import { useErrorHandling } from '@/composables/useErrorHandling'
import { useDashboardStore } from '@/stores/dashboardStore'
import { performanceMonitor } from '@/utils/performanceMonitor'

// 初始化
const router = useRouter()
const dashboardStore = useDashboardStore()
const { handleError, showError, clearError } = useErrorHandling()

// 响应式状态
const state = reactive({
  // 加载状态
  isLoading: true,
  isRefreshing: false,

  // 布局设置
  layoutMode: 'grid' as 'grid' | 'list',
  isFullscreen: false,
  showSettings: false,

  // 数据状态
  lastUpdateTime: null as Date | null,
  autoRefreshEnabled: true,
  refreshInterval: 30000, // 30秒

  // 错误状态
  hasError: false,
  errorMessage: '',
})

// 数据引用
const marketData = ref<MarketOverview | null>(null)
const watchlists = ref<Watchlist[]>([])
const activeWatchlistId = ref<number | null>(null)
const popularStocks = ref<Stock[]>([])
const newsItems = ref<any[]>([])
const tradingSignals = ref<any[]>([])

// 定时器
let refreshTimer: number | null = null
let autoRefreshTimer: number | null = null

// 计算属性
const activeWatchlist = computed(() => {
  if (!activeWatchlistId.value) return null
  return watchlists.value.find(w => w.id === activeWatchlistId.value) || null
})

const dashboardStats = computed(() => ({
  totalWatchlists: watchlists.value.length,
  totalStocks: watchlists.value.reduce((sum, w) => sum + (w.watchlist_items?.length || 0), 0),
  marketStatus: marketData.value ? '开市' : '闭市',
  lastUpdate: state.lastUpdateTime?.toLocaleTimeString() || '未更新'
}))

const marketStatusClass = computed(() => ({
  'status-open': dashboardStats.value.marketStatus === '开市',
  'status-closed': dashboardStats.value.marketStatus === '闭市'
}))

// 数据加载函数
const loadWatchlists = async () => {
  try {
    const data = await watchlistService.getUserWatchlists()
    watchlists.value = data
    if (data.length > 0 && !activeWatchlistId.value) {
      activeWatchlistId.value = data[0].id
    }
  } catch (error) {
    console.error('加载关注列表失败:', error)
    handleError(error, '加载关注列表失败')
  }
}

const loadMarketData = async () => {
  try {
    console.log('[Dashboard] 开始加载市场数据...')
    const data = await dashboardService.getMarketOverview(true)
    marketData.value = data
    console.log('[Dashboard] 市场数据加载成功')
  } catch (error) {
    console.error('加载市场数据失败:', error)
    marketData.value = []
    handleError(error, '加载市场数据失败')
  }
}

const loadPopularStocks = async () => {
  try {
    console.log('[Dashboard] 开始加载热门股票...')
    const data = await stockService.getHotStocks()
    popularStocks.value = data.slice(0, 10)
    console.log('[Dashboard] 热门股票加载成功')
  } catch (error) {
    console.error('加载热门股票失败:', error)
    popularStocks.value = []
    handleError(error, '加载热门股票失败')
  }
}

const loadNewsItems = async () => {
  try {
    console.log('[Dashboard] 开始加载新闻数据...')
    const data = await marketDataService.getFinancialNews()
    newsItems.value = data.slice(0, 8) // 只显示前8条
    console.log('[Dashboard] 新闻数据加载成功')
  } catch (error) {
    console.error('加载新闻失败:', error)
    newsItems.value = []
    handleError(error, '加载新闻失败')
  }
}

const loadTradingSignals = async () => {
  try {
    console.log('[Dashboard] 开始加载交易信号...')

    // 调用技术分析API获取交易信号
    const response = await fetch('http://localhost:7001/api/technical-indicators/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stockCodes: ['000002.SZ', '000001.SZ', '600036.SH', '000858.SZ', '002415.SZ'],
        signalTypes: ['d2', 'hunting', 'reversal', 'sell', 'turtle']
      })
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success && data.data && data.data.length > 0) {
        // 转换后端数据格式为前端组件期望的格式
        const convertedSignals = []
        data.data.forEach(stockResult => {
          if (stockResult && stockResult.signals) {
            stockResult.signals.forEach((signal, index) => {
              convertedSignals.push({
                id: `${stockResult.stockCode}_${index}_${Date.now()}`,
                stockName: stockResult.stockName || stockResult.stockCode,
                stockCode: stockResult.stockCode,
                type: signal.type === 'buy' ? 'buy' : signal.type === 'sell' ? 'sell' : 'hold',
                price: stockResult.currentPrice || signal.price || 0,
                strategy: signal.signal || signal.strategy || '技术分析',
                confidence: signal.strength || signal.confidence || 75,
                timestamp: signal.timestamp || stockResult.lastUpdate || new Date().toISOString()
              })
            })
          }
        })

        tradingSignals.value = convertedSignals.slice(0, 10) // 只显示前10个信号
        console.log('[Dashboard] 交易信号加载成功:', tradingSignals.value.length, '个信号')
      } else {
        console.warn('[Dashboard] 交易信号API返回空数据或失败:', data.message)
        tradingSignals.value = []
      }
    } else {
      console.warn('[Dashboard] 交易信号API请求失败:', response.status)
      tradingSignals.value = []
    }
  } catch (error) {
    console.error('加载交易信号失败:', error)
    tradingSignals.value = []
    handleError(error, '加载交易信号失败')
  }
}

// 初始化函数
const initializeDashboard = async () => {
  try {
    state.isLoading = true
    clearError()

    console.log('[Dashboard] 开始初始化仪表盘...')

    // 并行加载所有数据
    const loadPromises = [
      loadWatchlists(),
      loadMarketData(),
      loadPopularStocks(),
      loadNewsItems(),
      loadTradingSignals()
    ]

    await Promise.allSettled(loadPromises)

    // 设置自动刷新
    setupAutoRefresh()

    state.lastUpdateTime = new Date()
    console.log('[Dashboard] 仪表盘初始化完成')

    ElNotification({
      title: '仪表盘加载完成',
      message: '所有数据已成功加载',
      type: 'success',
      duration: 3000
    })

  } catch (error) {
    console.error('[Dashboard] 初始化失败:', error)
    handleError(error, '仪表盘初始化失败')
    state.hasError = true
    state.errorMessage = '仪表盘初始化失败，请刷新页面重试'
  } finally {
    state.isLoading = false
  }
}

// 自动刷新设置
const setupAutoRefresh = () => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
  }

  if (state.autoRefreshEnabled) {
    autoRefreshTimer = window.setInterval(() => {
      handleRefresh(true) // 静默刷新
    }, state.refreshInterval)
  }
}

// 事件处理函数
const handleRefresh = async (silent = false) => {
  if (state.isRefreshing) return

  try {
    state.isRefreshing = true

    if (!silent) {
      ElMessage.info('正在刷新数据...')
    }

    // 并行刷新所有数据
    const refreshPromises = [
      loadWatchlists(),
      loadMarketData(),
      loadPopularStocks(),
      loadNewsItems(),
      loadTradingSignals()
    ]

    await Promise.allSettled(refreshPromises)

    state.lastUpdateTime = new Date()

    if (!silent) {
      ElMessage.success('数据刷新完成')
    }

  } catch (error) {
    console.error('刷新数据失败:', error)
    handleError(error, '刷新数据失败')
  } finally {
    state.isRefreshing = false
  }
}

const handleWatchlistChange = (watchlistId: number) => {
  activeWatchlistId.value = watchlistId
}

const handleStockClick = (stock: Stock) => {
  router.push(`/stock?symbol=${stock.symbol}`)
}

const handleAddToWatchlist = async (stock: Stock) => {
  if (!activeWatchlist.value) {
    ElMessage.warning('请先选择一个关注列表')
    return
  }

  try {
    await watchlistService.addStockToWatchlist(activeWatchlist.value.id, {
      stockCode: stock.symbol,
      stockName: stock.name
    })

    ElMessage.success(`已将 ${stock.name} 添加到关注列表`)
    await loadWatchlists() // 重新加载关注列表

  } catch (error) {
    console.error('添加到关注列表失败:', error)
    handleError(error, '添加到关注列表失败')
  }
}

const handleDojiScan = () => {
  router.push('/doji-pattern/screener')
}

const handleAIRecommend = () => {
  router.push('/strategies/smart-recommendation')
}

const handleRiskMonitor = () => {
  router.push('/risk/monitoring')
}

const handleNewsClick = (news: any) => {
  if (news.url) {
    window.open(news.url, '_blank')
  }
}

const handleSignalClick = (signal: any) => {
  router.push(`/stock?symbol=${signal.symbol}`)
}

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    state.isFullscreen = true
  } else {
    document.exitFullscreen()
    state.isFullscreen = false
  }
}

const handleAutoRefreshToggle = () => {
  setupAutoRefresh()
}

const handleRefreshIntervalChange = () => {
  setupAutoRefresh()
}

// 生命周期
onMounted(() => {
  initializeDashboard()
})

onUnmounted(() => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
  }
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.modern-dashboard {
  min-height: 100vh;
  background: var(--el-bg-color-page);
  padding: var(--spacing-lg);
}

/* Dashboard Header */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  background: var(--el-bg-color);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--el-border-color-light);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.dashboard-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--el-text-color-primary);
}

.title-icon {
  color: var(--color-primary);
}

.dashboard-stats {
  display: flex;
  gap: var(--spacing-lg);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}

.stat-label {
  color: var(--el-text-color-regular);
}

.stat-value {
  font-weight: var(--font-weight-medium);
  color: var(--el-text-color-primary);
}

.stat-value.status-open {
  color: var(--color-success);
}

.stat-value.status-closed {
  color: var(--color-danger);
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing-sm);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.action-btn {
  border-radius: var(--border-radius-md);
}

.layout-toggle {
  border-radius: var(--border-radius-md);
}

.last-update {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--el-text-color-regular);
}

.update-time {
  font-weight: var(--font-weight-medium);
  color: var(--el-text-color-primary);
}

/* Loading and Error States */
.dashboard-loading {
  padding: var(--spacing-xl);
  text-align: center;
}

.loading-text {
  margin-top: var(--spacing-lg);
  font-size: var(--font-size-lg);
  color: var(--el-text-color-regular);
}

.dashboard-error {
  padding: var(--spacing-xl);
}

/* Dashboard Content */
.dashboard-content {
  display: grid;
  gap: var(--spacing-lg);
  transition: all 0.3s ease;
}

.dashboard-content.layout-grid {
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  grid-template-rows: auto;
}

.dashboard-content.layout-list {
  grid-template-columns: 1fr;
  max-width: 1200px;
  margin: 0 auto;
}

/* Widget Containers */
.widget-container {
  background: var(--el-bg-color);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--el-border-color-light);
  overflow: hidden;
  transition: all 0.3s ease;
}

.widget-container:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

/* Grid Layout Specific */
.layout-grid .market-overview {
  grid-column: span 2;
}

.layout-grid .watchlist {
  grid-column: span 1;
}

.layout-grid .quick-actions {
  grid-column: span 1;
}

.layout-grid .popular-stocks {
  grid-column: span 1;
}

.layout-grid .news {
  grid-column: span 1;
}

.layout-grid .trading-signals {
  grid-column: span 2;
}

/* Settings Panel */
.settings-content {
  padding: var(--spacing-lg);
}

/* Responsive Design */
@media (max-width: 1200px) {
  .dashboard-content.layout-grid {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  }

  .layout-grid .market-overview,
  .layout-grid .trading-signals {
    grid-column: span 1;
  }
}

@media (max-width: 768px) {
  .modern-dashboard {
    padding: var(--spacing-md);
  }

  .dashboard-header {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
  }

  .header-left,
  .header-right {
    align-items: center;
  }

  .dashboard-stats {
    justify-content: center;
    flex-wrap: wrap;
  }

  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
  }

  .dashboard-content.layout-grid {
    grid-template-columns: 1fr;
  }

  .widget-container {
    margin-bottom: var(--spacing-md);
  }
}

@media (max-width: 480px) {
  .dashboard-stats {
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .header-actions {
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .action-btn {
    width: 100%;
  }
}
</style>
