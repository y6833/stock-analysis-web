<template>
  <div class="advanced-dashboard" :class="{ 'dark-theme': isDarkMode }">
    <!-- 页面头部 -->
    <div class="dashboard-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <el-icon>
              <TrendCharts />
            </el-icon>
            高级仪表盘
          </h1>
          <p class="page-subtitle">实时市场分析与投资组合管理</p>
        </div>
        <div class="header-actions">
          <el-button-group>
            <el-button :icon="Refresh" @click="handleRefresh" :loading="state.isRefreshing" type="primary">
              刷新数据
            </el-button>
            <el-button :icon="Setting" @click="showSettings = true">
              设置
            </el-button>
            <el-button :icon="isDarkMode ? Sunny : Moon" @click="toggleTheme" circle />
          </el-button-group>
        </div>
      </div>
    </div>

    <!-- 全局加载状态 -->
    <div v-if="state.isInitialLoading" class="global-loading">
      <el-skeleton :rows="8" animated />
      <div class="loading-text">正在加载高级仪表盘数据...</div>
    </div>

    <!-- 主要内容区域 -->
    <div v-else class="dashboard-content">
      <!-- 关键指标卡片 -->
      <div class="metrics-grid">
        <MetricCard v-for="metric in keyMetrics" :key="metric.id" :metric="metric" :loading="state.isRefreshing"
          @click="handleMetricClick" />
      </div>

      <!-- 图表区域 -->
      <div class="charts-section">
        <div class="charts-grid">
          <!-- 市场概览图表 -->
          <div class="chart-container market-overview">
            <MarketOverviewChart :data="marketData" :loading="state.isRefreshing" @refresh="loadMarketData" />
          </div>

          <!-- 投资组合分析 -->
          <div class="chart-container portfolio-analysis">
            <PortfolioAnalysisChart :data="portfolioData" :loading="state.isRefreshing" @refresh="loadPortfolioData" />
          </div>

          <!-- 技术指标分析 -->
          <div class="chart-container technical-analysis">
            <TechnicalAnalysisChart :data="technicalData" :loading="state.isRefreshing" @refresh="loadTechnicalData" />
          </div>

          <!-- 实时行情 -->
          <div class="chart-container realtime-quotes">
            <RealtimeQuotesWidget :quotes="realtimeQuotes" :loading="state.isRefreshing"
              @refresh="loadRealtimeQuotes" />
          </div>
        </div>
      </div>

      <!-- 数据表格区域 -->
      <div class="tables-section">
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <el-tab-pane label="持仓明细" name="holdings">
            <HoldingsTable :data="holdingsData" :loading="state.isRefreshing" @refresh="loadHoldingsData" />
          </el-tab-pane>
          <el-tab-pane label="交易记录" name="transactions">
            <TransactionsTable :data="transactionsData" :loading="state.isRefreshing" @refresh="loadTransactionsData" />
          </el-tab-pane>
          <el-tab-pane label="市场热点" name="hotspots">
            <MarketHotspotsTable :data="hotspotsData" :loading="state.isRefreshing" @refresh="loadHotspotsData" />
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 设置对话框 -->
    <DashboardSettings v-model="showSettings" :settings="dashboardSettings" @update:settings="updateSettings" />

    <!-- 错误提示 -->
    <ErrorBoundary v-if="error" :error="error" @retry="handleRetry" @dismiss="clearError" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import {
  TrendCharts,
  Refresh,
  Setting,
  Moon,
  Sunny
} from '@element-plus/icons-vue'

// 组件导入
import MetricCard from '@/components/dashboard/advanced/MetricCard.vue'
import MarketOverviewChart from '@/components/dashboard/advanced/MarketOverviewChart.vue'
import PortfolioAnalysisChart from '@/components/dashboard/advanced/PortfolioAnalysisChart.vue'
import TechnicalAnalysisChart from '@/components/dashboard/advanced/TechnicalAnalysisChart.vue'
import RealtimeQuotesWidget from '@/components/dashboard/advanced/RealtimeQuotesWidget.vue'
import HoldingsTable from '@/components/dashboard/advanced/HoldingsTable.vue'
import TransactionsTable from '@/components/dashboard/advanced/TransactionsTable.vue'
import MarketHotspotsTable from '@/components/dashboard/advanced/MarketHotspotsTable.vue'
import DashboardSettings from '@/components/dashboard/DashboardSettings.vue'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'

// 服务和工具导入
import { useErrorHandling } from '@/composables/useErrorHandling'
import { useTheme } from '@/composables/useTheme'
import { useWebSocket } from '@/composables/useWebSocket'
import { stockService } from '@/services/stockService'
import { portfolioService } from '@/services/portfolioService'
import { marketDataService } from '@/services/marketDataService'
import { mockHoldings, mockTransactions, calculatePortfolioSummary, getRecentTransactions } from '@/data/mockPortfolioData'

// 类型定义
interface DashboardState {
  isInitialLoading: boolean
  isRefreshing: boolean
  lastUpdateTime: Date | null
  autoRefreshEnabled: boolean
  refreshInterval: number
}

interface KeyMetric {
  id: string
  title: string
  value: string | number
  change: number
  changePercent: number
  icon: string
  color: string
  trend: 'up' | 'down' | 'neutral'
}

// 响应式状态
const router = useRouter()
const { handleError, withRetry, isLoading, clearError } = useErrorHandling()
const { isDarkMode, toggleTheme } = useTheme()
const { disconnect } = useWebSocket() // 只保留disconnect用于清理

const state = reactive<DashboardState>({
  isInitialLoading: true,
  isRefreshing: false,
  lastUpdateTime: null,
  autoRefreshEnabled: true,
  refreshInterval: 30000 // 30秒
})

// 数据状态
const marketData = ref<any[]>([])
const portfolioData = ref<any>({})
const technicalData = ref<any[]>([])
const realtimeQuotes = ref<any[]>([])
const holdingsData = ref<any[]>([])
const transactionsData = ref<any[]>([])
const hotspotsData = ref<any[]>([])

// UI状态
const activeTab = ref('holdings')
const showSettings = ref(false)
const error = ref<string | null>(null)
const dashboardSettings = ref({
  autoRefresh: true,
  refreshInterval: 30000,
  showNotifications: true,
  theme: 'auto'
})

// 计算属性
const portfolioSummary = computed(() => calculatePortfolioSummary(holdingsData.value))

const keyMetrics = computed<KeyMetric[]>(() => [
  {
    id: 'total-value',
    title: '总资产',
    value: portfolioSummary.value.totalValue,
    change: portfolioSummary.value.totalProfit,
    changePercent: portfolioSummary.value.totalProfitPercent,
    icon: 'money',
    color: 'primary',
    trend: portfolioSummary.value.totalProfitPercent >= 0 ? 'up' : 'down'
  },
  {
    id: 'daily-pnl',
    title: '总盈亏',
    value: portfolioSummary.value.totalProfit,
    change: portfolioSummary.value.totalProfit * 0.1, // Mock daily change
    changePercent: portfolioSummary.value.totalProfitPercent,
    icon: 'trend',
    color: portfolioSummary.value.totalProfit >= 0 ? 'success' : 'danger',
    trend: portfolioSummary.value.totalProfit >= 0 ? 'up' : 'down'
  },
  {
    id: 'market-cap',
    title: '持仓数量',
    value: portfolioSummary.value.holdingCount,
    change: 0,
    changePercent: 0,
    icon: 'chart',
    color: 'info',
    trend: 'neutral'
  },
  {
    id: 'risk-level',
    title: '总成本',
    value: portfolioSummary.value.totalCost,
    change: 0,
    changePercent: 0,
    icon: 'warning',
    color: 'warning',
    trend: 'neutral'
  }
])

// 工具函数
function getRiskColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'low': return 'success'
    case 'medium': return 'warning'
    case 'high': return 'danger'
    default: return 'info'
  }
}

// 数据加载函数
const loadMarketData = async (forceRefresh = false) => {
  const cacheKey = 'advanced-market-data'

  if (!forceRefresh) {
    // 检查缓存逻辑可以在这里实现
  }

  const result = await withRetry(
    async () => {
      const data = await marketDataService.getAdvancedMarketData()
      return data
    },
    '加载市场数据失败'
  )

  if (result) {
    marketData.value = result
  }
}

const loadPortfolioData = async (forceRefresh = false) => {
  const result = await withRetry(
    async () => {
      const data = await portfolioService.getPortfolioSummary()
      return data
    },
    '加载投资组合数据失败'
  )

  if (result) {
    portfolioData.value = result
  }
}

const loadTechnicalData = async (forceRefresh = false) => {
  const result = await withRetry(
    async () => {
      const data = await stockService.getTechnicalAnalysis()
      return data
    },
    '加载技术分析数据失败'
  )

  if (result) {
    technicalData.value = result
  }
}

const loadRealtimeQuotes = async (forceRefresh = false) => {
  const result = await withRetry(
    async () => {
      const data = await stockService.getRealtimeQuotes()
      return data
    },
    '加载实时行情失败'
  )

  if (result) {
    realtimeQuotes.value = result
  }
}

const loadHoldingsData = async (forceRefresh = false) => {
  try {
    // Use mock data for demonstration
    // In production, this would call: await portfolioService.getHoldings()
    await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API delay
    holdingsData.value = mockHoldings
  } catch (error) {
    handleError(error, '加载持仓数据失败')
  }
}

const loadTransactionsData = async (forceRefresh = false) => {
  try {
    // Use mock data for demonstration
    // In production, this would call: await portfolioService.getTransactions()
    await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API delay
    transactionsData.value = getRecentTransactions(mockTransactions, 20)
  } catch (error) {
    handleError(error, '加载交易记录失败')
  }
}

const loadHotspotsData = async (forceRefresh = false) => {
  const result = await withRetry(
    async () => {
      const data = await marketDataService.getMarketHotspots()
      return data
    },
    '加载市场热点失败'
  )

  if (result) {
    hotspotsData.value = result
  }
}

// 初始化数据加载
const initializeDashboard = async () => {
  try {
    state.isInitialLoading = true

    // 并行加载所有数据
    await Promise.allSettled([
      loadMarketData(),
      loadPortfolioData(),
      loadTechnicalData(),
      loadRealtimeQuotes(),
      loadHoldingsData(),
      loadTransactionsData(),
      loadHotspotsData()
    ])

    state.lastUpdateTime = new Date()
  } catch (error) {
    handleError(error, '初始化仪表盘失败')
  } finally {
    state.isInitialLoading = false
  }
}

// 刷新所有数据
const handleRefresh = async () => {
  if (state.isRefreshing) return

  try {
    state.isRefreshing = true

    await Promise.allSettled([
      loadMarketData(true),
      loadPortfolioData(true),
      loadTechnicalData(true),
      loadRealtimeQuotes(true),
      loadHoldingsData(true),
      loadTransactionsData(true),
      loadHotspotsData(true)
    ])

    state.lastUpdateTime = new Date()
    ElMessage.success('数据刷新完成')
  } catch (error) {
    handleError(error, '刷新数据失败')
  } finally {
    state.isRefreshing = false
  }
}

// 事件处理函数
const handleMetricClick = (metric: KeyMetric) => {
  // 根据指标类型导航到相应页面
  switch (metric.id) {
    case 'total-value':
    case 'daily-pnl':
    case 'market-cap':
      router.push('/portfolio')
      break
    case 'risk-level':
      router.push('/risk-monitoring')
      break
  }
}

const handleTabChange = (tabName: string) => {
  activeTab.value = tabName

  // 根据需要加载对应的数据
  switch (tabName) {
    case 'holdings':
      loadHoldingsData()
      break
    case 'transactions':
      loadTransactionsData()
      break
    case 'hotspots':
      loadHotspotsData()
      break
  }
}

const updateSettings = (newSettings: any) => {
  dashboardSettings.value = { ...dashboardSettings.value, ...newSettings }

  // 应用新设置
  if (newSettings.autoRefresh !== undefined) {
    state.autoRefreshEnabled = newSettings.autoRefresh
  }

  if (newSettings.refreshInterval !== undefined) {
    state.refreshInterval = newSettings.refreshInterval
  }
}

const handleRetry = () => {
  clearError()
  initializeDashboard()
}

// 自动刷新定时器
let autoRefreshTimer: NodeJS.Timeout | null = null

const startAutoRefresh = () => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
  }

  if (state.autoRefreshEnabled) {
    autoRefreshTimer = setInterval(() => {
      handleRefresh()
    }, state.refreshInterval)
  }
}

const stopAutoRefresh = () => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
}

// WebSocket 连接和实时数据 (可选)
const setupRealtimeData = () => {
  // 由于没有后端服务器，直接使用模拟数据
  console.log('使用模拟实时数据模式')
  setupMockRealtimeData()

  // 如果需要真实WebSocket连接，可以取消注释以下代码
  /*
  try {
    connect()
    subscribe('quotes', (data: any) => {
      realtimeQuotes.value = data
    })
    subscribe('portfolio', (data: any) => {
      portfolioData.value = { ...portfolioData.value, ...data }
    })
  } catch (error) {
    console.warn('WebSocket连接失败，使用模拟数据模式:', error)
    setupMockRealtimeData()
  }
  */
}

// 模拟实时数据更新
const setupMockRealtimeData = () => {
  console.log('启动模拟实时数据更新')
  // 每5秒更新一次模拟数据
  setInterval(() => {
    // 模拟实时行情更新 - 修复类型问题
    const mockQuotes = mockHoldings.map(holding => ({
      symbol: holding.symbol,
      price: holding.currentPrice * (1 + (Math.random() - 0.5) * 0.02),
      change: (Math.random() - 0.5) * 2,
      changePercent: (Math.random() - 0.5) * 4
    }))

    realtimeQuotes.value = mockQuotes
  }, 5000)
}

// 生命周期钩子
onMounted(async () => {
  await initializeDashboard()
  setupRealtimeData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
  disconnect()
})

// 监听设置变化
watch(
  () => state.autoRefreshEnabled,
  (enabled) => {
    if (enabled) {
      startAutoRefresh()
    } else {
      stopAutoRefresh()
    }
  }
)

watch(
  () => state.refreshInterval,
  () => {
    if (state.autoRefreshEnabled) {
      startAutoRefresh()
    }
  }
)
</script>

<style scoped>
.advanced-dashboard {
  min-height: 100vh;
  background: var(--el-bg-color-page);
  transition: all 0.3s ease;
}

.dashboard-header {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  padding: var(--el-spacing-lg);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.page-title {
  display: flex;
  align-items: center;
  gap: var(--el-spacing-sm);
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.page-subtitle {
  margin: var(--el-spacing-xs) 0 0 0;
  color: var(--el-text-color-secondary);
  font-size: 0.875rem;
}

.global-loading {
  padding: var(--el-spacing-xl);
  text-align: center;
}

.loading-text {
  margin-top: var(--el-spacing-lg);
  color: var(--el-text-color-secondary);
}

.dashboard-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--el-spacing-lg);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--el-spacing-lg);
  margin-bottom: var(--el-spacing-xl);
}

.charts-section {
  margin-bottom: var(--el-spacing-xl);
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--el-spacing-lg);
}

.chart-container {
  background: var(--el-bg-color);
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color-light);
  overflow: hidden;
  transition: all 0.3s ease;
}

.chart-container:hover {
  box-shadow: var(--el-box-shadow-light);
  transform: translateY(-2px);
}

.tables-section {
  background: var(--el-bg-color);
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color-light);
  overflow: hidden;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: var(--el-spacing-md);
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-content {
    padding: var(--el-spacing-md);
  }
}

/* 暗色主题 */
.dark-theme {
  --el-bg-color-page: #0a0a0a;
  --el-bg-color: #141414;
  --el-text-color-primary: #ffffff;
  --el-text-color-secondary: #a3a3a3;
  --el-border-color-light: #262626;
}
</style>
