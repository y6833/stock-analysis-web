<template>
  <div class="modern-dashboard">
    <PageLayout title="市场仪表盘" subtitle="实时市场数据与智能分析">
      <template #extra>
        <div class="header-extra">
          <el-tag v-if="state.isRefreshing" type="info" size="small" effect="plain" class="refreshing-tag">
            <el-icon class="is-loading">
              <Loading />
            </el-icon>
            刷新中...
          </el-tag>
          <DataSourceInfo
            v-if="dataSourceInfo.dataSource !== '未知'"
            :dataSource="dataSourceInfo.dataSource"
            :dataSourceMessage="dataSourceInfo.dataSourceMessage"
            :isRealTime="dataSourceInfo.isRealTime"
            :isCache="dataSourceInfo.isCache"
            class="header-data-source"
          />
          <div class="last-update" v-if="state.lastUpdateTime">
            <el-icon class="update-icon">
              <Clock />
            </el-icon>
            <span class="update-label">最后更新:</span>
            <span class="update-time">{{ dashboardStats.lastUpdate }}</span>
          </div>
        </div>
      </template>
      <template #actions>
        <el-button
          type="primary"
          :icon="Refresh"
          :loading="state.isRefreshing"
          @click="handleRefresh"
          class="action-btn refresh-btn"
        >
          <span v-if="!state.isRefreshing">刷新数据</span>
          <span v-else>刷新中...</span>
        </el-button>
        <el-button-group class="layout-toggle">
          <el-tooltip content="网格布局" placement="bottom">
            <el-button
              :type="state.layoutMode === 'grid' ? 'primary' : 'default'"
              :icon="Grid"
              @click="state.layoutMode = 'grid'"
            />
          </el-tooltip>
          <el-tooltip content="列表布局" placement="bottom">
            <el-button
              :type="state.layoutMode === 'list' ? 'primary' : 'default'"
              :icon="List"
              @click="state.layoutMode = 'list'"
            />
          </el-tooltip>
        </el-button-group>
        <el-tooltip :content="state.isFullscreen ? '退出全屏' : '全屏显示'" placement="bottom">
          <el-button :icon="FullScreen" @click="toggleFullscreen" class="action-btn" />
        </el-tooltip>
        <el-tooltip content="仪表盘设置" placement="bottom">
          <el-button :icon="Setting" @click="state.showSettings = true" class="action-btn" />
        </el-tooltip>
      </template>

      <div class="dashboard-stats">
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-content">
            <div class="stat-value">{{ dashboardStats.totalWatchlists }}</div>
            <div class="stat-label">关注列表</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">{{ dashboardStats.totalStocks }}</div>
            <div class="stat-label">关注股票</div>
          </div>
        </div>
        <div class="stat-card" :class="marketStatusClass">
          <div class="stat-icon">{{ dashboardStats.marketStatus === '开市' ? '🟢' : '🔴' }}</div>
          <div class="stat-content">
            <div class="stat-value" :class="marketStatusClass">{{ dashboardStats.marketStatus }}</div>
            <div class="stat-label">市场状态</div>
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
        <ModernMarketOverview :data="marketData" :loading="state.isRefreshing || globalLoading"
          @refresh="loadMarketData" />
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
        <ModernPopularStocks :stocks="popularStocks" :loading="state.isRefreshing || globalLoading"
          @stock-click="handleStockClick" @add-to-watchlist="handleAddToWatchlist" @refresh="loadPopularStocks"
          @tab-change="handlePopularStocksTabChange" />
      </div>

      <!-- 新闻资讯 -->
      <div class="widget-container news">
        <ModernNewsWidget :news="newsItems" :loading="state.isRefreshing || globalLoading" @news-click="handleNewsClick"
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
    </PageLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, reactive } from 'vue'
import PageLayout from '@/components/common/PageLayout.vue'
import { useRouter } from 'vue-router'
import { getApiUrl } from '@/utils/apiBase'
import { ElMessage, ElNotification } from 'element-plus'
import { Refresh, Setting, FullScreen, Grid, List, Loading, Clock } from '@element-plus/icons-vue'

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
import DataSourceInfo from '@/components/common/DataSourceInfo.vue'

// 工具导入
import { useErrorHandling } from '@/composables/useErrorHandling'
import { useDashboardStore } from '@/stores/dashboardStore'
import { performanceMonitor } from '@/utils/performanceMonitor'

// 初始化
const router = useRouter()
const dashboardStore = useDashboardStore()
const { handleError, showError, clearError, withLoading, withRetry, isLoading: globalLoading } = useErrorHandling()

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

  // 性能优化
  enableLazyLoading: true,
  cacheEnabled: true,
  maxCacheAge: 5 * 60 * 1000, // 5分钟缓存

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

// 数据源信息
const dataSourceInfo = ref({
  dataSource: '未知',
  dataSourceMessage: '数据来源未知',
  isRealTime: false,
  isCache: false
})

// 定时器
let refreshTimer: number | null = null
let autoRefreshTimer: number | null = null

// 缓存和性能优化
const dataCache = ref(new Map())
const lastFetchTimes = ref(new Map())
let refreshDebounceTimer: NodeJS.Timeout | null = null

// 检查缓存是否有效
const isCacheValid = (key: string): boolean => {
  if (!state.cacheEnabled) return false

  const lastFetch = lastFetchTimes.value.get(key)
  if (!lastFetch) return false

  return Date.now() - lastFetch < state.maxCacheAge
}

// 设置缓存
const setCache = (key: string, data: any): void => {
  if (state.cacheEnabled) {
    dataCache.value.set(key, data)
    lastFetchTimes.value.set(key, Date.now())
  }
}

// 获取缓存
const getCache = (key: string): any => {
  if (isCacheValid(key)) {
    return dataCache.value.get(key)
  }
  return null
}

// 防抖刷新
const debouncedRefresh = (fn: () => Promise<void>, delay: number = 1000) => {
  if (refreshDebounceTimer) {
    clearTimeout(refreshDebounceTimer)
  }

  refreshDebounceTimer = setTimeout(async () => {
    await fn()
    refreshDebounceTimer = null
  }, delay)
}

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

const loadMarketData = async (forceRefresh: boolean = false) => {
  const cacheKey = 'market-data'

  // 检查缓存
  if (!forceRefresh) {
    const cached = getCache(cacheKey)
    if (cached) {
      console.log('[Dashboard] 使用缓存的市场数据')
      marketData.value = cached
      return
    }
  }

  const result = await withRetry(
    async () => {
      console.log('[Dashboard] 开始加载市场数据...')
      const data = await dashboardService.getMarketOverview(true)
      console.log('[Dashboard] 市场数据加载成功')

      // 更新数据源信息
      if (data && (data as any).data_source) {
        dataSourceInfo.value = {
          dataSource: (data as any).data_source || '未知',
          dataSourceMessage: (data as any).data_source_message || '数据来源未知',
          isRealTime: (data as any).is_real_time || false,
          isCache: (data as any).is_cache || false
        }
      }

      return data
    },
    '加载市场数据失败'
  )

  if (result) {
    marketData.value = result
    setCache(cacheKey, result)
  } else {
    marketData.value = null
  }
}

const loadPopularStocks = async (type: string = 'hot', forceRefresh: boolean = false) => {
  const cacheKey = `popular-stocks-${type}`

  // 检查缓存
  if (!forceRefresh) {
    const cached = getCache(cacheKey)
    if (cached) {
      console.log(`[Dashboard] 使用缓存的${type}股票数据`)
      popularStocks.value = cached
      return
    }
  }

  const result = await withRetry(
    async () => {
      console.log(`[Dashboard] 开始加载${type}股票...`)
      let data: Stock[] = []

      switch (type) {
        case 'hot':
          data = await stockService.getHotStocks()
          break
        case 'limit-up':
          data = await stockService.getLimitUpStocks()
          break
        case 'limit-down':
          data = await stockService.getLimitDownStocks()
          break
        default:
          data = await stockService.getHotStocks()
      }

      // 如果数据中没有名称，尝试从股票列表中查找
      if (data.length > 0) {
        const allStocks = await stockService.getStocks().catch(() => [])
        const stockMap = new Map(allStocks.map(s => [s.symbol, s]))

        data = data.map(stock => {
          // 如果股票没有名称，从股票列表中查找
          if (!stock.name || stock.name === '未知' || stock.name === '') {
            const stockInfo = stockMap.get(stock.symbol)
            if (stockInfo && stockInfo.name) {
              return { ...stock, name: stockInfo.name }
            }
            // 如果还是找不到，使用股票代码作为名称
            return { ...stock, name: stock.symbol }
          }
          return stock
        })
      }

      console.log(`[Dashboard] ${type}股票加载成功，共 ${data.length} 只`)
      return data.slice(0, 10)
    },
    `加载${type}股票失败`
  )

  if (result) {
    popularStocks.value = result
    setCache(cacheKey, result)
  } else {
    popularStocks.value = []
  }
}

// Handle popular stocks tab change
const handlePopularStocksTabChange = (tab: string) => {
  loadPopularStocks(tab)
}

const loadNewsItems = async (forceRefresh: boolean = false) => {
  const cacheKey = 'news-items'

  // 检查缓存
  if (!forceRefresh) {
    const cached = getCache(cacheKey)
    if (cached) {
      console.log('[Dashboard] 使用缓存的新闻数据')
      newsItems.value = cached
      return
    }
  }

  const result = await withRetry(
    async () => {
      console.log('[Dashboard] 开始加载新闻数据...')
      const data = await marketDataService.getFinancialNews()
      console.log('[Dashboard] 新闻数据加载成功')
      return data.slice(0, 8) // 只显示前8条
    },
    '加载新闻失败'
  )

  if (result) {
    newsItems.value = result
    setCache(cacheKey, result)
  } else {
    newsItems.value = []
  }
}

const loadTradingSignals = async () => {
  try {
    console.log('[Dashboard] 开始加载交易信号...')

    // 调用技术分析API获取交易信号
    const response = await fetch(getApiUrl('/api/technical-indicators/scan'), {
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
        const convertedSignals: any[] = []
        data.data.forEach((stockResult: any) => {
          if (stockResult && stockResult.signals) {
            stockResult.signals.forEach((signal: any, index: number) => {
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
const handleRefresh = async (silent = false, forceRefresh = false) => {
  if (state.isRefreshing) return

  // 使用防抖避免频繁刷新
  if (!forceRefresh && !silent) {
    debouncedRefresh(async () => {
      await handleRefresh(silent, true)
    })
    return
  }

  try {
    state.isRefreshing = true

    if (!silent) {
      ElMessage.info('正在刷新数据...')
    }

    // 并行刷新所有数据，强制刷新时清除缓存
    const refreshPromises = [
      loadWatchlists(),
      loadMarketData(forceRefresh),
      loadPopularStocks('hot', forceRefresh),
      loadNewsItems(forceRefresh),
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

const handleStockClick = (stock: Stock | { symbol: string; name?: string }) => {
  router.push(`/stock?symbol=${stock.symbol}`)
}

const handleAddToWatchlist = async (stock: Stock | { symbol: string; name: string }) => {
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
  position: relative;
}

/* 添加背景装饰 */
.modern-dashboard::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    radial-gradient(circle at 20% 50%, rgba(var(--el-color-primary-rgb), 0.03) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(var(--el-color-success-rgb), 0.03) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.modern-dashboard>* {
  position: relative;
  z-index: 1;
}

.header-extra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-sm);
}

.refreshing-tag {
  margin-left: 0;
}

.header-data-source {
  max-width: fit-content;
}

.dashboard-stats {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--el-bg-color-page);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--el-border-color-lighter);
  transition: all 0.3s ease;
  min-width: 120px;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--el-color-primary-light-7);
}

.stat-card.status-open {
  border-color: var(--el-color-success-light-7);
  background: rgba(var(--el-color-success-rgb), 0.05);
}

.stat-card.status-closed {
  border-color: var(--el-color-danger-light-7);
  background: rgba(var(--el-color-danger-rgb), 0.05);
}

.stat-icon {
  font-size: var(--font-size-xl);
  line-height: 1;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.stat-value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--el-text-color-primary);
  line-height: 1.2;
}

.stat-card.status-open .stat-value {
  color: var(--el-color-success);
}

.stat-card.status-closed .stat-value {
  color: var(--el-color-danger);
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--el-text-color-regular);
  font-weight: var(--font-weight-normal);
}

.action-btn {
  border-radius: var(--border-radius-md);
  transition: all 0.3s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.refresh-btn {
  font-weight: var(--font-weight-medium);
}

.layout-toggle {
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

.last-update {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--el-text-color-regular);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--el-bg-color-page);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--el-border-color-lighter);
}

.update-icon {
  font-size: var(--font-size-base);
  color: var(--el-color-primary);
}

.update-label {
  color: var(--el-text-color-regular);
}

.update-time {
  font-weight: var(--font-weight-medium);
  color: var(--el-text-color-primary);
  font-family: var(--font-family-mono);
}

/* Loading and Error States */
.dashboard-loading {
  padding: var(--spacing-2xl);
  text-align: center;
  background: var(--el-bg-color);
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--el-border-color-light);
}

.loading-text {
  margin-top: var(--spacing-lg);
  font-size: var(--font-size-lg);
  color: var(--el-text-color-regular);
  font-weight: var(--font-weight-medium);
}

.dashboard-error {
  padding: var(--spacing-2xl);
  background: var(--el-bg-color);
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--el-border-color-light);
}

/* Dashboard Content */
.dashboard-content {
  display: grid;
  gap: var(--spacing-xl);
  transition: all 0.3s ease;
  padding: var(--spacing-md) 0;
}

.dashboard-content.layout-grid {
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: minmax(300px, auto);
  max-width: 1600px;
  margin: 0 auto;
}

.dashboard-content.layout-list {
  grid-template-columns: 1fr;
  max-width: 1400px;
  margin: 0 auto;
}

/* Widget Containers */
.widget-container {
  background: var(--el-bg-color);
  border-radius: var(--border-radius-xl);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--el-border-color-lighter);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.widget-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--el-color-primary), var(--el-color-success));
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
}

.widget-container:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-4px);
  border-color: var(--el-color-primary-light-7);
}

.widget-container:hover::before {
  transform: scaleX(1);
}

/* Grid Layout Specific - 使用12列网格系统 */
.layout-grid .market-overview {
  grid-column: span 12;
  grid-row: span 1;
}

.layout-grid .watchlist {
  grid-column: span 6;
  grid-row: span 1;
}

.layout-grid .quick-actions {
  grid-column: span 6;
  grid-row: span 1;
}

.layout-grid .popular-stocks {
  grid-column: span 6;
  grid-row: span 1;
}

.layout-grid .news {
  grid-column: span 6;
  grid-row: span 1;
}

.layout-grid .trading-signals {
  grid-column: span 12;
  grid-row: span 1;
}

/* 大屏幕优化布局 */
@media (min-width: 1400px) {
  .layout-grid .market-overview {
    grid-column: span 8;
  }

  .layout-grid .watchlist {
    grid-column: span 4;
  }

  .layout-grid .quick-actions {
    grid-column: span 4;
  }

  .layout-grid .popular-stocks {
    grid-column: span 4;
  }

  .layout-grid .news {
    grid-column: span 4;
  }

  .layout-grid .trading-signals {
    grid-column: span 8;
  }
}

/* Settings Panel */
.settings-content {
  padding: var(--spacing-lg);
}

/* Responsive Design */
/* 响应式设计 */
@media (max-width: 1400px) {
  .dashboard-content.layout-grid {
    grid-template-columns: repeat(12, 1fr);
  }

  .layout-grid .market-overview {
    grid-column: span 12;
  }

  .layout-grid .watchlist,
  .layout-grid .quick-actions,
  .layout-grid .popular-stocks,
  .layout-grid .news {
    grid-column: span 6;
  }

  .layout-grid .trading-signals {
    grid-column: span 12;
  }
}

@media (max-width: 1024px) {
  .modern-dashboard {
    padding: var(--spacing-lg);
  }

  .dashboard-content.layout-grid {
    grid-template-columns: repeat(12, 1fr);
    gap: var(--spacing-lg);
  }

  .layout-grid .market-overview,
  .layout-grid .watchlist,
  .layout-grid .quick-actions,
  .layout-grid .popular-stocks,
  .layout-grid .news,
  .layout-grid .trading-signals {
    grid-column: span 12;
  }
}

@media (max-width: 768px) {
  .dashboard-stats {
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }

  .stat-card {
    flex: 1;
    min-width: calc(50% - var(--spacing-sm));
  }

  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
    width: 100%;
  }

  .dashboard-content {
    gap: var(--spacing-md);
  }

  .dashboard-content.layout-grid {
    grid-template-columns: 1fr;
  }

  .widget-container {
    margin-bottom: 0;
  }
}

@media (max-width: 480px) {
  .stat-card {
    min-width: 100%;
  }

  .dashboard-content {
    gap: var(--spacing-sm);
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

/* Performance Optimizations */
.widget-container {
  contain: layout style paint;
  will-change: transform;
}

.widget-container.lazy-loading {
  opacity: 0.7;
  pointer-events: none;
}

.widget-container.loaded {
  opacity: 1;
  pointer-events: auto;
}

/* Smooth animations */
.dashboard-content {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {

  .widget-container,
  .dashboard-content {
    animation: none;
    transition: none;
  }

  .widget-container:hover {
    transform: none;
  }
}
</style>
