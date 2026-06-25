<template>
  <div class="advanced-dashboard" :class="{ 'dark-theme': isDarkMode }">
    <PageLayout title="高级仪表盘" subtitle="实时市场分析与投资组合管理">
      <template #extra>
        <div class="header-extra">
          <el-tag v-if="state.isRefreshing" type="info" size="small" effect="plain" class="refreshing-tag">
            <el-icon class="is-loading"><Loading /></el-icon>
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
            <el-icon class="update-icon"><Clock /></el-icon>
            <span class="update-label">最后更新:</span>
            <span class="update-time">{{ formatUpdateTime(state.lastUpdateTime) }}</span>
          </div>
        </div>
      </template>
      <template #actions>
        <el-button-group>
          <el-tooltip content="刷新数据" placement="bottom">
            <el-button :icon="Refresh" @click="handleRefresh" :loading="state.isRefreshing" type="primary">
              <span v-if="!state.isRefreshing">刷新数据</span>
              <span v-else>刷新中...</span>
            </el-button>
          </el-tooltip>
          <el-tooltip content="仪表盘设置" placement="bottom">
            <el-button :icon="Setting" @click="showSettings = true">设置</el-button>
          </el-tooltip>
          <el-tooltip :content="isDarkMode ? '切换到亮色模式' : '切换到暗色模式'" placement="bottom">
            <el-button :icon="isDarkMode ? Sunny : Moon" @click="toggleTheme" circle />
          </el-tooltip>
        </el-button-group>
      </template>

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
            <PortfolioAnalysisChart :data="{ holdings: holdingsData }" :loading="state.isRefreshing" @refresh="loadPortfolioData" />
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
    </PageLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import PageLayout from '@/components/common/PageLayout.vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import {
  Refresh,
  Setting,
  Moon,
  Sunny,
  Loading,
  Clock
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
import DataSourceInfo from '@/components/common/DataSourceInfo.vue'

// 服务和工具导入
import { useErrorHandling } from '@/composables/useErrorHandling'
import { useTheme } from '@/composables/useTheme'
import { useWebSocket } from '@/composables/useWebSocket'
import { stockService } from '@/services/stockService'
import { portfolioService } from '@/services/portfolioService'
import { marketDataService } from '@/services/marketDataService'

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

// 数据源信息
const dataSourceInfo = ref({
  dataSource: '未知',
  dataSourceMessage: '数据来源未知',
  isRealTime: false,
  isCache: false
})

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

// 计算属性 - 从真实持仓数据计算
const portfolioSummary = computed(() => {
  if (!holdingsData.value || holdingsData.value.length === 0) {
    return {
      totalValue: 0,
      totalCost: 0,
      totalProfit: 0,
      totalProfitPercent: 0,
      holdingCount: 0
    }
  }

  const totalCost = holdingsData.value.reduce((sum, h) => {
    const cost = (h.averageCost || h.cost || 0) * (h.quantity || 0)
    return sum + cost
  }, 0)

  const totalValue = holdingsData.value.reduce((sum, h) => {
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
    holdingCount: holdingsData.value.length
  }
})

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
    change: 0, // 日盈亏需要从API获取
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

// 格式化更新时间
function formatUpdateTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
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
  const result = await withRetry(
    async () => {
      console.log('[AdvancedDashboard] 开始加载持仓数据...')
      const data = await portfolioService.getHoldings()
      console.log('[AdvancedDashboard] 持仓数据加载成功，共', data.length, '条')
      
      // 如果返回的是空数组或示例数据，尝试获取实时价格
      if (data && data.length > 0) {
        // 为每个持仓获取最新价格
        const holdingsWithPrice = await Promise.allSettled(
          data.map(async (holding: any) => {
            try {
              const quote = await stockService.getStockQuote(holding.stockCode || holding.symbol)
              return {
                ...holding,
                currentPrice: quote?.price || holding.currentPrice || holding.price || 0,
                change: quote?.change || 0,
                changePercent: quote?.pct_chg || quote?.changePercent || 0
              }
  } catch (error) {
              console.warn(`获取股票 ${holding.stockCode || holding.symbol} 价格失败:`, error)
              return holding
            }
          })
        )
        
        holdingsData.value = holdingsWithPrice
          .filter((result) => result.status === 'fulfilled')
          .map((result: any) => result.value)
      } else {
        holdingsData.value = []
      }
      
      return data
    },
    '加载持仓数据失败'
  )

  if (!result || result.length === 0) {
    holdingsData.value = []
  }
}

const loadTransactionsData = async (forceRefresh = false) => {
  const result = await withRetry(
    async () => {
      console.log('[AdvancedDashboard] 开始加载交易记录...')
      const data = await portfolioService.getTransactions()
      console.log('[AdvancedDashboard] 交易记录加载成功，共', data.length, '条')
      
      // 按交易日期降序排序，只显示最近20条
      const sortedData = data
        .sort((a: any, b: any) => {
          const dateA = new Date(a.tradeDate || a.createdAt || 0).getTime()
          const dateB = new Date(b.tradeDate || b.createdAt || 0).getTime()
          return dateB - dateA
        })
        .slice(0, 20)
      
      transactionsData.value = sortedData
      return sortedData
    },
    '加载交易记录失败'
  )

  if (!result || result.length === 0) {
    transactionsData.value = []
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

// 实时数据更新定时器
let realtimeDataInterval: NodeJS.Timeout | null = null

// 实时数据更新 - 使用真实数据源
const setupRealtimeData = () => {
  console.log('[AdvancedDashboard] 启动实时数据更新')
  
  // 从持仓数据中获取股票代码，然后获取实时行情
  const updateRealtimeQuotes = async () => {
    try {
      if (holdingsData.value && holdingsData.value.length > 0) {
        const symbols = holdingsData.value.map((h: any) => h.stockCode || h.symbol).filter(Boolean)
        
        if (symbols.length > 0) {
          const quotes = await Promise.allSettled(
            symbols.map(async (symbol: string) => {
              try {
                const quote = await stockService.getStockQuote(symbol)
                return {
                  symbol,
                  price: quote?.price || 0,
                  change: quote?.change || 0,
                  changePercent: quote?.pct_chg || quote?.changePercent || 0,
                  name: quote?.name || ''
                }
              } catch (error) {
                console.warn(`获取股票 ${symbol} 实时行情失败:`, error)
                return null
              }
            })
          )
          
          realtimeQuotes.value = quotes
            .filter((result) => result.status === 'fulfilled' && result.value)
            .map((result: any) => result.value)
        }
      } else if (realtimeQuotes.value.length === 0) {
        // 如果没有持仓，尝试获取热门股票的实时行情
        try {
          const hotStocks = await stockService.getHotStocks(10)
          const quotes = await Promise.allSettled(
            hotStocks.map(async (stock) => {
              try {
                const quote = await stockService.getStockQuote(stock.symbol)
                return {
                  symbol: stock.symbol,
                  price: quote?.price || 0,
                  change: quote?.change || 0,
                  changePercent: quote?.pct_chg || quote?.changePercent || 0,
                  name: stock.name || quote?.name || ''
                }
              } catch (error) {
                return null
              }
            })
          )
          
          realtimeQuotes.value = quotes
            .filter((result) => result.status === 'fulfilled' && result.value)
            .map((result: any) => result.value)
  } catch (error) {
          console.warn('获取热门股票实时行情失败:', error)
        }
      }
    } catch (error) {
      console.error('更新实时行情失败:', error)
    }
  }

  // 立即更新一次
  updateRealtimeQuotes()

  // 每30秒更新一次实时行情
  if (realtimeDataInterval) {
    clearInterval(realtimeDataInterval)
  }
  realtimeDataInterval = setInterval(updateRealtimeQuotes, 30000)
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
  
  // 清理实时数据更新定时器
  if (realtimeDataInterval) {
    clearInterval(realtimeDataInterval)
    realtimeDataInterval = null
  }
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
  max-width: fit-content;
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

.global-loading {
  padding: var(--spacing-2xl);
  text-align: center;
  background: var(--el-bg-color);
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--el-border-color-light);
  margin: var(--spacing-lg);
}

.loading-text {
  margin-top: var(--spacing-lg);
  color: var(--el-text-color-secondary);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
}

.dashboard-content {
  max-width: 1600px;
  margin: 0 auto;
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: 0;
}

/* 大屏幕优化指标卡片布局 */
@media (min-width: 1400px) {
  .metrics-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.charts-section {
  margin-bottom: 0;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--spacing-lg);
  grid-auto-rows: minmax(400px, auto);
}

/* 图表布局优化 */
.charts-grid .market-overview {
  grid-column: span 8;
  grid-row: span 1;
}

.charts-grid .portfolio-analysis {
  grid-column: span 4;
  grid-row: span 1;
}

.charts-grid .technical-analysis {
  grid-column: span 6;
  grid-row: span 1;
}

.charts-grid .realtime-quotes {
  grid-column: span 6;
  grid-row: span 1;
}

/* 大屏幕图表布局 */
@media (min-width: 1400px) {
  .charts-grid .market-overview {
    grid-column: span 8;
  }

  .charts-grid .portfolio-analysis {
    grid-column: span 4;
  }

  .charts-grid .technical-analysis {
    grid-column: span 6;
  }

  .charts-grid .realtime-quotes {
    grid-column: span 6;
  }
}

.chart-container {
  background: var(--el-bg-color);
  border-radius: var(--border-radius-xl);
  border: 1px solid var(--el-border-color-lighter);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  position: relative;
}

.chart-container::before {
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

.chart-container:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-4px);
  border-color: var(--el-color-primary-light-7);
}

.chart-container:hover::before {
  transform: scaleX(1);
}

.tables-section {
  background: var(--el-bg-color);
  border-radius: var(--border-radius-xl);
  border: 1px solid var(--el-border-color-lighter);
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.tables-section:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .charts-grid {
    grid-template-columns: repeat(12, 1fr);
  }

  .charts-grid .market-overview,
  .charts-grid .portfolio-analysis,
  .charts-grid .technical-analysis,
  .charts-grid .realtime-quotes {
    grid-column: span 12;
  }
}

@media (max-width: 1024px) {
  .dashboard-content {
    padding: var(--spacing-lg);
    gap: var(--spacing-lg);
  }

  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }

  .charts-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }

  .charts-grid .market-overview,
  .charts-grid .portfolio-analysis,
  .charts-grid .technical-analysis,
  .charts-grid .realtime-quotes {
    grid-column: span 1;
  }
}

@media (max-width: 768px) {
  .dashboard-content {
    padding: var(--spacing-md);
    gap: var(--spacing-md);
  }

  .metrics-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }

  .charts-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }

  .last-update {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .dashboard-content {
    padding: var(--spacing-sm);
    gap: var(--spacing-sm);
  }

  .metrics-grid,
  .charts-grid {
    gap: var(--spacing-sm);
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
