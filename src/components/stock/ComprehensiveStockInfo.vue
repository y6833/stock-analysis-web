<template>
  <div class="comprehensive-stock-info" :class="{ 'dark-theme': isDarkMode }">
    <!-- 股票搜索和切换 -->
    <div class="stock-search-section">
      <div class="search-container">
        <el-select v-model="selectedStock" filterable remote reserve-keyword placeholder="搜索股票代码或名称"
          :remote-method="searchStocks" :loading="searchLoading" @change="handleStockChange" class="stock-selector">
          <el-option v-for="stock in searchResults" :key="stock.symbol" :label="`${stock.symbol} - ${stock.name}`"
            :value="stock.symbol" />
        </el-select>

        <div class="action-buttons">
          <el-button :icon="Star" @click="toggleWatchlist" :type="isInWatchlist ? 'warning' : 'default'" size="small">
            {{ isInWatchlist ? '已关注' : '加自选' }}
          </el-button>
          <el-button :icon="Bell" @click="showPriceAlert = true" size="small">
            价格提醒
          </el-button>
          <el-button :icon="Download" @click="exportData" size="small">
            导出数据
          </el-button>
        </div>
      </div>
    </div>

    <!-- 全局加载状态 -->
    <div v-if="state.isInitialLoading" class="global-loading">
      <el-skeleton :rows="8" animated />
      <div class="loading-text">正在加载股票信息...</div>
    </div>

    <!-- 主要内容区域 -->
    <div v-else-if="stockData" class="main-content">
      <!-- 基本信息卡片 -->
      <el-card class="basic-info-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <div class="stock-title">
              <h2 class="stock-name">{{ stockData.name }}</h2>
              <span class="stock-symbol">{{ stockData.symbol }}</span>
            </div>
            <div class="update-time">
              更新时间: {{ formatTime(stockData.updateTime) }}
            </div>
          </div>
        </template>

        <div class="basic-info-grid">
          <!-- 价格信息 -->
          <div class="price-section">
            <div class="current-price" :class="getPriceChangeClass(stockData.change)">
              ¥{{ formatPrice(stockData.currentPrice) }}
            </div>
            <div class="price-change" :class="getPriceChangeClass(stockData.change)">
              <span class="change-amount">{{ formatChange(stockData.change) }}</span>
              <span class="change-percent">{{ formatPercent(stockData.changePercent) }}</span>
            </div>
          </div>

          <!-- 基本数据 -->
          <div class="basic-data-grid">
            <div class="data-item">
              <span class="label">今开</span>
              <span class="value">{{ formatPrice(stockData.open) }}</span>
            </div>
            <div class="data-item">
              <span class="label">昨收</span>
              <span class="value">{{ formatPrice(stockData.previousClose) }}</span>
            </div>
            <div class="data-item">
              <span class="label">最高</span>
              <span class="value high">{{ formatPrice(stockData.high) }}</span>
            </div>
            <div class="data-item">
              <span class="label">最低</span>
              <span class="value low">{{ formatPrice(stockData.low) }}</span>
            </div>
            <div class="data-item">
              <span class="label">成交量</span>
              <span class="value">{{ formatVolume(stockData.volume) }}</span>
            </div>
            <div class="data-item">
              <span class="label">成交额</span>
              <span class="value">{{ formatAmount(stockData.turnover) }}</span>
            </div>
            <div class="data-item">
              <span class="label">市值</span>
              <span class="value">{{ formatAmount(stockData.marketCap) }}</span>
            </div>
            <div class="data-item">
              <span class="label">流通市值</span>
              <span class="value">{{ formatAmount(stockData.floatMarketCap) }}</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 图表和技术指标区域 -->
      <el-row :gutter="24" class="charts-row">
        <!-- K线图 -->
        <el-col :lg="16" :md="24">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <div class="chart-header">
                <span>K线图</span>
                <div class="chart-controls">
                  <el-radio-group v-model="chartPeriod" size="small" @change="handlePeriodChange">
                    <el-radio-button value="1d">日K</el-radio-button>
                    <el-radio-button value="1w">周K</el-radio-button>
                    <el-radio-button value="1m">月K</el-radio-button>
                  </el-radio-group>
                </div>
              </div>
            </template>
            <div class="chart-container" v-loading="state.isChartLoading">
              <div ref="klineChart" class="kline-chart"></div>
            </div>
          </el-card>
        </el-col>

        <!-- 分时图 -->
        <el-col :lg="8" :md="24">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <span>分时图</span>
            </template>
            <div class="chart-container" v-loading="state.isChartLoading">
              <div ref="timeChart" class="time-chart"></div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 技术指标和财务数据 -->
      <el-row :gutter="24" class="data-row">
        <!-- 技术指标 -->
        <el-col :lg="12" :md="24">
          <el-card class="technical-card" shadow="hover">
            <template #header>
              <div class="expandable-header" @click="toggleTechnicalExpanded">
                <span>技术指标</span>
                <el-icon class="expand-icon" :class="{ expanded: technicalExpanded }">
                  <ArrowDown />
                </el-icon>
              </div>
            </template>
            <el-collapse-transition>
              <div v-show="technicalExpanded" class="technical-indicators" v-loading="state.isTechnicalLoading">
                <div class="indicator-grid">
                  <div class="indicator-item" v-for="indicator in technicalData" :key="indicator.name">
                    <div class="indicator-name">{{ indicator.name }}</div>
                    <div class="indicator-value" :class="indicator.signal">
                      {{ indicator.value }}
                    </div>
                    <div class="indicator-signal">{{ indicator.signalText }}</div>
                  </div>
                </div>
              </div>
            </el-collapse-transition>
          </el-card>
        </el-col>

        <!-- 财务数据 -->
        <el-col :lg="12" :md="24">
          <el-card class="financial-card" shadow="hover">
            <template #header>
              <div class="expandable-header" @click="toggleFinancialExpanded">
                <span>财务数据</span>
                <el-icon class="expand-icon" :class="{ expanded: financialExpanded }">
                  <ArrowDown />
                </el-icon>
              </div>
            </template>
            <el-collapse-transition>
              <div v-show="financialExpanded" class="financial-data" v-loading="state.isFinancialLoading">
                <div class="financial-grid">
                  <div class="financial-item" v-for="item in financialData" :key="item.name">
                    <div class="financial-name">{{ item.name }}</div>
                    <div class="financial-value">{{ item.value }}</div>
                    <div class="financial-unit">{{ item.unit }}</div>
                  </div>
                </div>
              </div>
            </el-collapse-transition>
          </el-card>
        </el-col>
      </el-row>

      <!-- 实时数据区域 -->
      <el-row :gutter="24" class="realtime-row">
        <!-- 成交明细 -->
        <el-col :lg="8" :md="24">
          <el-card class="realtime-card" shadow="hover">
            <template #header>
              <span>成交明细</span>
            </template>
            <div class="transaction-details" v-loading="state.isRealtimeLoading">
              <div class="transaction-header">
                <span>时间</span>
                <span>价格</span>
                <span>成交量</span>
                <span>方向</span>
              </div>
              <div class="transaction-list">
                <div v-for="transaction in transactionDetails" :key="transaction.id" class="transaction-item"
                  :class="transaction.direction">
                  <span class="time">{{ formatTransactionTime(transaction.time) }}</span>
                  <span class="price">{{ formatPrice(transaction.price) }}</span>
                  <span class="volume">{{ formatVolume(transaction.volume) }}</span>
                  <span class="direction">{{ transaction.direction === 'buy' ? '买' : '卖' }}</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 资金流向 -->
        <el-col :lg="8" :md="24">
          <el-card class="realtime-card" shadow="hover">
            <template #header>
              <span>资金流向</span>
            </template>
            <div class="money-flow" v-loading="state.isRealtimeLoading">
              <div class="flow-item" v-for="flow in moneyFlowData" :key="flow.type">
                <div class="flow-label">{{ flow.label }}</div>
                <div class="flow-value" :class="flow.type">
                  {{ formatAmount(flow.value) }}
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 买卖盘 -->
        <el-col :lg="8" :md="24">
          <el-card class="realtime-card" shadow="hover">
            <template #header>
              <span>买卖盘</span>
            </template>
            <div class="order-book" v-loading="state.isRealtimeLoading">
              <div class="order-section">
                <div class="section-title">卖盘</div>
                <div class="order-list sell-orders">
                  <div v-for="order in sellOrders" :key="order.level" class="order-item sell">
                    <span class="level">卖{{ order.level }}</span>
                    <span class="price">{{ formatPrice(order.price) }}</span>
                    <span class="volume">{{ formatVolume(order.volume) }}</span>
                  </div>
                </div>
              </div>

              <div class="current-price-section">
                <div class="current-price-label">现价</div>
                <div class="current-price-value" :class="getPriceChangeClass(stockData.change)">
                  {{ formatPrice(stockData.currentPrice) }}
                </div>
              </div>

              <div class="order-section">
                <div class="section-title">买盘</div>
                <div class="order-list buy-orders">
                  <div v-for="order in buyOrders" :key="order.level" class="order-item buy">
                    <span class="level">买{{ order.level }}</span>
                    <span class="price">{{ formatPrice(order.price) }}</span>
                    <span class="volume">{{ formatVolume(order.volume) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      <el-result icon="error" title="加载失败" :sub-title="error">
        <template #extra>
          <el-button type="primary" @click="handleRetry">重试</el-button>
        </template>
      </el-result>
    </div>

    <!-- 价格提醒对话框 -->
    <PriceAlertDialog v-model="showPriceAlert" :stock="stockData" @confirm="handlePriceAlert" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import {
  Star,
  Bell,
  Download,
  ArrowDown
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'

// 组件导入
import PriceAlertDialog from './PriceAlertDialog.vue'

// 服务和工具导入
import { useTheme } from '@/composables/useTheme'
import { useWebSocket } from '@/composables/useWebSocket'
import { useErrorHandling } from '@/composables/useErrorHandling'
import { stockService } from '@/services/stockService'
import { watchlistService } from '@/services/watchlistService'
import { formatPriceSafe, formatPercentSafe, formatChangeSafe } from '@/utils/formatters'

// 类型定义
interface StockData {
  symbol: string
  name: string
  currentPrice: number
  change: number
  changePercent: number
  open: number
  previousClose: number
  high: number
  low: number
  volume: number
  turnover: number
  marketCap: number
  floatMarketCap: number
  updateTime: Date
}

interface TechnicalIndicator {
  name: string
  value: string
  signal: 'bullish' | 'bearish' | 'neutral'
  signalText: string
}

interface FinancialData {
  name: string
  value: string
  unit: string
}

interface TransactionDetail {
  id: string
  time: Date
  price: number
  volume: number
  direction: 'buy' | 'sell'
}

interface OrderBookItem {
  level: number
  price: number
  volume: number
}

interface MoneyFlow {
  type: string
  label: string
  value: number
}

interface ComponentState {
  isInitialLoading: boolean
  isChartLoading: boolean
  isTechnicalLoading: boolean
  isFinancialLoading: boolean
  isRealtimeLoading: boolean
}

// 响应式状态
const { isDarkMode } = useTheme()
const { connect, disconnect, subscribe } = useWebSocket()
const { handleError, withRetry, clearError } = useErrorHandling()

const state = reactive<ComponentState>({
  isInitialLoading: true,
  isChartLoading: false,
  isTechnicalLoading: false,
  isFinancialLoading: false,
  isRealtimeLoading: false
})

// 数据状态
const selectedStock = ref('000001.SZ')
const stockData = ref<StockData | null>(null)
const technicalData = ref<TechnicalIndicator[]>([])
const financialData = ref<FinancialData[]>([])
const transactionDetails = ref<TransactionDetail[]>([])
const moneyFlowData = ref<MoneyFlow[]>([])
const buyOrders = ref<OrderBookItem[]>([])
const sellOrders = ref<OrderBookItem[]>([])
const searchResults = ref<any[]>([])

// UI状态
const searchLoading = ref(false)
const technicalExpanded = ref(true)
const financialExpanded = ref(true)
const chartPeriod = ref('1d')
const showPriceAlert = ref(false)
const error = ref<string | null>(null)

// 图表引用
const klineChart = ref<HTMLElement>()
const timeChart = ref<HTMLElement>()
let klineChartInstance: echarts.ECharts | null = null
let timeChartInstance: echarts.ECharts | null = null

// 计算属性
const isInWatchlist = computed(() => {
  // 这里应该检查股票是否在自选列表中
  return false
})

// 格式化函数
const formatPrice = (price: number | undefined | null) => {
  return formatPriceSafe(price, 2)
}

const formatChange = (change: number | undefined | null) => {
  return formatChangeSafe(change, 2)
}

const formatPercent = (percent: number | undefined | null) => {
  return formatPercentSafe(percent, 2)
}

const formatVolume = (volume: number | undefined | null) => {
  if (volume === undefined || volume === null) return '--'

  if (volume >= 100000000) {
    return `${(volume / 100000000).toFixed(2)}亿`
  } else if (volume >= 10000) {
    return `${(volume / 10000).toFixed(2)}万`
  } else {
    return volume.toLocaleString()
  }
}

const formatAmount = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return '--'

  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(2)}亿`
  } else if (amount >= 10000) {
    return `${(amount / 10000).toFixed(2)}万`
  } else {
    return amount.toLocaleString()
  }
}

const formatTime = (time: Date | string | undefined | null) => {
  if (!time) return '--'

  const date = typeof time === 'string' ? new Date(time) : time
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatTransactionTime = (time: Date | string | undefined | null) => {
  if (!time) return '--'

  const date = typeof time === 'string' ? new Date(time) : time
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const getPriceChangeClass = (change: number | undefined | null) => {
  if (change === undefined || change === null) return 'neutral'
  if (change > 0) return 'positive'
  if (change < 0) return 'negative'
  return 'neutral'
}

// 事件处理函数
const searchStocks = async (query: string) => {
  if (!query) {
    searchResults.value = []
    return
  }

  searchLoading.value = true
  try {
    const results = await stockService.searchStocks(query)
    searchResults.value = results
  } catch (err) {
    handleError(err, '搜索股票失败')
  } finally {
    searchLoading.value = false
  }
}

const handleStockChange = async (symbol: string) => {
  if (!symbol) return

  selectedStock.value = symbol
  clearError()
  await loadStockData(symbol)
}

const toggleWatchlist = async () => {
  if (!stockData.value) return

  try {
    if (isInWatchlist.value) {
      await watchlistService.removeFromWatchlist(stockData.value.symbol)
      ElMessage.success('已从自选股中移除')
    } else {
      await watchlistService.addToWatchlist(stockData.value.symbol)
      ElMessage.success('已添加到自选股')
    }
  } catch (err) {
    handleError(err, '操作失败')
  }
}

const handlePriceAlert = async (alertData: any) => {
  try {
    // 这里应该调用价格提醒服务
    ElMessage.success('价格提醒设置成功')
  } catch (err) {
    handleError(err, '设置价格提醒失败')
  }
}

const exportData = async () => {
  if (!stockData.value) return

  try {
    // 这里应该实现数据导出功能
    ElMessage.success('数据导出成功')
  } catch (err) {
    handleError(err, '导出数据失败')
  }
}

const handlePeriodChange = async (period: string) => {
  chartPeriod.value = period
  await loadChartData(selectedStock.value, period)
}

const toggleTechnicalExpanded = () => {
  technicalExpanded.value = !technicalExpanded.value
}

const toggleFinancialExpanded = () => {
  financialExpanded.value = !financialExpanded.value
}

const handleRetry = async () => {
  clearError()
  await loadStockData(selectedStock.value)
}

// 数据加载函数
const loadStockData = async (symbol: string) => {
  if (!symbol) return

  state.isInitialLoading = true
  error.value = null

  try {
    // 并行加载所有数据
    const [
      basicData,
      technicalIndicators,
      financialInfo,
      chartData,
      realtimeData
    ] = await Promise.allSettled([
      loadBasicData(symbol),
      loadTechnicalData(symbol),
      loadFinancialData(symbol),
      loadChartData(symbol, chartPeriod.value),
      loadRealtimeData(symbol)
    ])

    // 处理基本数据
    if (basicData.status === 'fulfilled') {
      stockData.value = basicData.value
    }

    // 处理技术指标
    if (technicalIndicators.status === 'fulfilled') {
      technicalData.value = technicalIndicators.value
    }

    // 处理财务数据
    if (financialInfo.status === 'fulfilled') {
      financialData.value = financialInfo.value
    }

    // 处理实时数据
    if (realtimeData.status === 'fulfilled') {
      const { transactions, moneyFlow, orderBook } = realtimeData.value
      transactionDetails.value = transactions
      moneyFlowData.value = moneyFlow
      buyOrders.value = orderBook.buy
      sellOrders.value = orderBook.sell
    }

  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载数据失败'
    handleError(err, '加载股票数据失败')
  } finally {
    state.isInitialLoading = false
  }
}

const loadBasicData = async (symbol: string): Promise<StockData> => {
  console.log(`[ComprehensiveStockInfo] 开始加载股票基本数据: ${symbol}`)
  const response = await stockService.getStockBasicInfo(symbol)
  console.log(`[ComprehensiveStockInfo] API响应数据:`, response)

  // v1 API返回的数据结构: { success: true, data: { quote: {...}, name: "...", ... } }
  const stockInfo = response.data || response
  const quote = stockInfo.quote || stockInfo

  console.log(`[ComprehensiveStockInfo] 提取的quote数据:`, quote)

  // 计算涨跌幅
  const currentPrice = quote.price || 0
  const change = quote.change || 0
  const previousClose = currentPrice - change
  const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0

  const result = {
    symbol: quote.code || stockInfo.symbol || symbol,
    name: quote.name || stockInfo.name || `股票${symbol}`,
    currentPrice: currentPrice,
    change: change,
    changePercent: changePercent,
    open: quote.open || currentPrice,
    previousClose: previousClose,
    high: quote.high || currentPrice,
    low: quote.low || currentPrice,
    volume: quote.volume || 0,
    turnover: quote.amount || 0,
    marketCap: 0, // v1 API暂不提供
    floatMarketCap: 0, // v1 API暂不提供
    updateTime: new Date(quote.date || quote.cacheTime || Date.now())
  }

  console.log(`[ComprehensiveStockInfo] 处理后的股票数据:`, result)
  return result
}

const loadTechnicalData = async (symbol: string): Promise<TechnicalIndicator[]> => {
  state.isTechnicalLoading = true
  try {
    console.log(`[ComprehensiveStockInfo] 开始加载技术指标: ${symbol}`)
    const response = await stockService.getTechnicalIndicators(symbol)
    console.log(`[ComprehensiveStockInfo] 技术指标API响应:`, response)

    const data = response.data || response
    const movingAverages = data.movingAverages || {}
    const indicators = data.indicators || {}
    const stochastic = indicators.stochastic || {}

    // 获取最新的移动平均线值（数组的最后一个值）
    const ma5 = movingAverages.ma5 ? movingAverages.ma5[movingAverages.ma5.length - 1] : null
    const ma10 = movingAverages.ma10 ? movingAverages.ma10[movingAverages.ma10.length - 1] : null
    const ma20 = movingAverages.ma20 ? movingAverages.ma20[movingAverages.ma20.length - 1] : null
    const ma30 = movingAverages.ma30 ? movingAverages.ma30[movingAverages.ma30.length - 1] : null

    // 获取最新的KDJ值
    const kValue = stochastic.k ? stochastic.k[stochastic.k.length - 1] : null
    const dValue = stochastic.d ? stochastic.d[stochastic.d.length - 1] : null

    // 获取当前价格用于比较
    const currentPrice = stockData.value?.currentPrice || 12.35 // 使用默认值或当前价格

    const result = [
      {
        name: 'MA5',
        value: ma5 ? ma5.toFixed(2) : '--',
        signal: ma5 && ma5 > currentPrice ? 'bearish' : 'bullish',
        signalText: ma5 && ma5 > currentPrice ? '压力位' : '支撑位'
      },
      {
        name: 'MA10',
        value: ma10 ? ma10.toFixed(2) : '--',
        signal: ma10 && ma10 > currentPrice ? 'bearish' : 'bullish',
        signalText: ma10 && ma10 > currentPrice ? '压力位' : '支撑位'
      },
      {
        name: 'MA20',
        value: ma20 ? ma20.toFixed(2) : '--',
        signal: ma20 && ma20 > currentPrice ? 'bearish' : 'bullish',
        signalText: ma20 && ma20 > currentPrice ? '压力位' : '支撑位'
      },
      {
        name: 'MA30',
        value: ma30 ? ma30.toFixed(2) : '--',
        signal: ma30 && ma30 > currentPrice ? 'bearish' : 'bullish',
        signalText: ma30 && ma30 > currentPrice ? '压力位' : '支撑位'
      },
      {
        name: 'KDJ-K',
        value: kValue ? kValue.toFixed(2) : '--',
        signal: kValue && kValue > 80 ? 'bearish' : kValue && kValue < 20 ? 'bullish' : 'neutral',
        signalText: kValue && kValue > 80 ? '超买' : kValue && kValue < 20 ? '超卖' : '正常'
      },
      {
        name: 'KDJ-D',
        value: dValue ? dValue.toFixed(2) : '--',
        signal: dValue && dValue > 80 ? 'bearish' : dValue && dValue < 20 ? 'bullish' : 'neutral',
        signalText: dValue && dValue > 80 ? '超买' : dValue && dValue < 20 ? '超卖' : '正常'
      }
    ]

    console.log(`[ComprehensiveStockInfo] 处理后的技术指标:`, result)
    return result
  } catch (error) {
    console.error(`[ComprehensiveStockInfo] 加载技术指标失败:`, error)
    // 返回默认数据
    return [
      { name: 'MA5', value: '--', signal: 'neutral', signalText: '暂无数据' },
      { name: 'MA10', value: '--', signal: 'neutral', signalText: '暂无数据' },
      { name: 'MA20', value: '--', signal: 'neutral', signalText: '暂无数据' },
      { name: 'MA30', value: '--', signal: 'neutral', signalText: '暂无数据' },
      { name: 'KDJ-K', value: '--', signal: 'neutral', signalText: '暂无数据' },
      { name: 'KDJ-D', value: '--', signal: 'neutral', signalText: '暂无数据' }
    ]
  } finally {
    state.isTechnicalLoading = false
  }
}

const loadFinancialData = async (symbol: string): Promise<FinancialData[]> => {
  state.isFinancialLoading = true
  try {
    console.log(`[ComprehensiveStockInfo] 开始加载财务数据: ${symbol}`)
    const response = await stockService.getFinancialData(symbol)
    console.log(`[ComprehensiveStockInfo] 财务数据API响应:`, response)

    // 生成一些示例财务数据（基于平安银行的大致数据）
    const mockFinancialData = [
      {
        name: 'PE比率',
        value: '4.56',
        unit: '倍'
      },
      {
        name: 'PB比率',
        value: '0.67',
        unit: '倍'
      },
      {
        name: 'ROE',
        value: '11.24%',
        unit: ''
      },
      {
        name: '营业收入',
        value: '1,847.32亿',
        unit: '元'
      },
      {
        name: '净利润',
        value: '421.67亿',
        unit: '元'
      },
      {
        name: '总资产',
        value: '5.12万亿',
        unit: '元'
      },
      {
        name: '净资产',
        value: '3,756.89亿',
        unit: '元'
      },
      {
        name: '每股收益',
        value: '2.17',
        unit: '元'
      }
    ]

    console.log(`[ComprehensiveStockInfo] 使用模拟财务数据:`, mockFinancialData)
    return mockFinancialData
  } catch (error) {
    console.error(`[ComprehensiveStockInfo] 加载财务数据失败:`, error)
    // 返回默认数据
    return [
      { name: 'PE比率', value: '--', unit: '倍' },
      { name: 'PB比率', value: '--', unit: '倍' },
      { name: 'ROE', value: '--', unit: '' },
      { name: '营业收入', value: '--', unit: '元' },
      { name: '净利润', value: '--', unit: '元' },
      { name: '总资产', value: '--', unit: '元' },
      { name: '净资产', value: '--', unit: '元' },
      { name: '每股收益', value: '--', unit: '元' }
    ]
  } finally {
    state.isFinancialLoading = false
  }
}

const loadChartData = async (symbol: string, period: string) => {
  state.isChartLoading = true
  try {
    console.log(`[ComprehensiveStockInfo] 开始加载图表数据: ${symbol}, period: ${period}`)

    // 分别处理K线数据和分时数据，避免一个失败影响另一个
    let klineData = null
    let timeData = null

    try {
      klineData = await stockService.getKlineData(symbol, period)
      console.log('[ComprehensiveStockInfo] K线数据加载成功')
    } catch (klineError) {
      console.error('[ComprehensiveStockInfo] K线数据加载失败:', klineError)
      klineData = null // 将在initKlineChart中处理
    }

    try {
      timeData = await stockService.getTimeData(symbol)
      console.log('[ComprehensiveStockInfo] 分时数据加载成功')
    } catch (timeError) {
      console.error('[ComprehensiveStockInfo] 分时数据加载失败:', timeError)
      timeData = null // 将在initTimeChart中处理
    }

    await nextTick()
    initKlineChart(klineData)
    initTimeChart(timeData)

    console.log('[ComprehensiveStockInfo] 图表数据加载完成')
  } catch (err) {
    console.error('[ComprehensiveStockInfo] 加载图表数据失败:', err)
    handleError(err, '加载图表数据失败')

    // 即使出错也尝试显示模拟数据
    try {
      await nextTick()
      initKlineChart(null)
      initTimeChart(null)
    } catch (fallbackError) {
      console.error('[ComprehensiveStockInfo] 显示模拟数据也失败:', fallbackError)
    }
  } finally {
    state.isChartLoading = false
  }
}

const loadRealtimeData = async (symbol: string) => {
  state.isRealtimeLoading = true
  try {
    console.log(`[ComprehensiveStockInfo] 开始加载实时数据: ${symbol}`)

    // 生成模拟的实时数据
    const currentPrice = stockData.value?.currentPrice || 12.35
    const now = new Date()

    // 模拟成交明细
    const mockTransactions = Array.from({ length: 20 }, (_, i) => ({
      id: `tx_${Date.now()}_${i}`,
      time: new Date(now.getTime() - i * 30000), // 每30秒一笔交易
      price: currentPrice + (Math.random() - 0.5) * 0.1,
      volume: Math.floor(Math.random() * 1000) + 100,
      direction: Math.random() > 0.5 ? 'buy' : 'sell'
    }))

    // 模拟资金流向
    const mockMoneyFlow = [
      { type: 'inflow', label: '主力流入', value: 125600000 },
      { type: 'outflow', label: '主力流出', value: 98400000 },
      { type: 'inflow', label: '散户流入', value: 67800000 },
      { type: 'outflow', label: '散户流出', value: 89200000 }
    ]

    // 模拟买卖盘
    const mockOrderBook = {
      buy: Array.from({ length: 5 }, (_, i) => ({
        level: i + 1,
        price: currentPrice - (i + 1) * 0.01,
        volume: Math.floor(Math.random() * 5000) + 1000
      })),
      sell: Array.from({ length: 5 }, (_, i) => ({
        level: i + 1,
        price: currentPrice + (i + 1) * 0.01,
        volume: Math.floor(Math.random() * 5000) + 1000
      }))
    }

    console.log(`[ComprehensiveStockInfo] 生成的模拟实时数据:`, {
      transactions: mockTransactions.length,
      moneyFlow: mockMoneyFlow.length,
      orderBook: { buy: mockOrderBook.buy.length, sell: mockOrderBook.sell.length }
    })

    return {
      transactions: mockTransactions,
      moneyFlow: mockMoneyFlow,
      orderBook: mockOrderBook
    }
  } catch (error) {
    console.error(`[ComprehensiveStockInfo] 加载实时数据失败:`, error)
    return {
      transactions: [],
      moneyFlow: [],
      orderBook: { buy: [], sell: [] }
    }
  } finally {
    state.isRealtimeLoading = false
  }
}

// 生成模拟K线数据
const generateMockKlineData = () => {
  const data = []
  let basePrice = 10.0

  for (let i = 0; i < 30; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (30 - i))

    const change = (Math.random() - 0.5) * 0.5
    const open = basePrice
    const close = Math.max(basePrice + change, 1)
    const high = Math.max(open, close) + Math.random() * 0.2
    const low = Math.min(open, close) - Math.random() * 0.2
    const volume = Math.floor(Math.random() * 1000000) + 100000

    data.push({
      date: date.toISOString().split('T')[0],
      open: Number(open.toFixed(2)),
      close: Number(close.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      volume: volume
    })

    basePrice = close
  }

  return data
}

// 生成模拟分时数据
const generateMockTimeData = () => {
  const data = []
  let basePrice = 10.0
  const now = new Date()

  // 生成今天的分时数据（9:30-15:00）
  for (let hour = 9; hour <= 15; hour++) {
    const startMinute = hour === 9 ? 30 : 0
    const endMinute = hour === 15 ? 0 : 59

    for (let minute = startMinute; minute <= endMinute; minute += 5) {
      if (hour === 11 && minute > 30) continue // 午休时间
      if (hour === 12) continue // 午休时间
      if (hour === 13 && minute < 0) continue // 午休时间

      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      const change = (Math.random() - 0.5) * 0.1
      const price = Math.max(basePrice + change, 1)

      data.push({
        time: time,
        price: Number(price.toFixed(2))
      })

      basePrice = price
    }
  }

  return data
}

// 图表初始化函数
const initKlineChart = (rawData: any) => {
  if (!klineChart.value) return

  if (klineChartInstance) {
    klineChartInstance.dispose()
  }

  // 验证和处理数据格式
  let data: any[] = []

  console.log('[ComprehensiveStockInfo] 接收到的K线数据:', rawData)

  if (Array.isArray(rawData)) {
    data = rawData
  } else if (rawData && rawData.data && Array.isArray(rawData.data)) {
    data = rawData.data
  } else if (rawData && typeof rawData === 'object') {
    // 如果是对象，尝试提取数组字段
    const possibleArrayFields = ['data', 'kline', 'history', 'records']
    for (const field of possibleArrayFields) {
      if (rawData[field] && Array.isArray(rawData[field])) {
        data = rawData[field]
        break
      }
    }
  }

  if (!Array.isArray(data) || data.length === 0) {
    console.warn('[ComprehensiveStockInfo] K线数据格式不正确或为空，使用模拟数据')
    // 生成模拟K线数据
    data = generateMockKlineData()
  }

  console.log('[ComprehensiveStockInfo] 处理后的K线数据长度:', data.length)

  klineChartInstance = echarts.init(klineChart.value, isDarkMode.value ? 'dark' : 'light')

  const option = {
    title: {
      text: `${stockData.value?.name || ''} K线图`,
      left: 'center',
      textStyle: {
        color: isDarkMode.value ? '#ffffff' : '#333333'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: function (params: any) {
        const data = params[0].data
        return `
          <div>
            <div>时间: ${data[0]}</div>
            <div>开盘: ${data[1]}</div>
            <div>收盘: ${data[2]}</div>
            <div>最低: ${data[3]}</div>
            <div>最高: ${data[4]}</div>
            <div>成交量: ${data[5]}</div>
          </div>
        `
      }
    },
    grid: {
      left: '10%',
      right: '10%',
      bottom: '15%'
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.date),
      scale: true,
      boundaryGap: false,
      axisLine: { onZero: false },
      splitLine: { show: false },
      min: 'dataMin',
      max: 'dataMax'
    },
    yAxis: {
      scale: true,
      splitArea: {
        show: true
      }
    },
    dataZoom: [
      {
        type: 'inside',
        start: 50,
        end: 100
      },
      {
        show: true,
        type: 'slider',
        top: '90%',
        start: 50,
        end: 100
      }
    ],
    series: [
      {
        name: 'K线',
        type: 'candlestick',
        data: data.map(item => [item.open, item.close, item.low, item.high]),
        itemStyle: {
          color: '#ef232a',
          color0: '#14b143',
          borderColor: '#ef232a',
          borderColor0: '#14b143'
        }
      },
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: data.map(item => item.volume)
      }
    ]
  }

  klineChartInstance.setOption(option)
}

const initTimeChart = (rawData: any) => {
  if (!timeChart.value) return

  if (timeChartInstance) {
    timeChartInstance.dispose()
  }

  // 验证和处理数据格式
  let data: any[] = []

  console.log('[ComprehensiveStockInfo] 接收到的分时数据:', rawData)

  if (Array.isArray(rawData)) {
    data = rawData
  } else if (rawData && rawData.data && Array.isArray(rawData.data)) {
    data = rawData.data
  } else if (rawData && typeof rawData === 'object') {
    // 如果是对象，尝试提取数组字段
    const possibleArrayFields = ['data', 'time', 'timeline', 'records']
    for (const field of possibleArrayFields) {
      if (rawData[field] && Array.isArray(rawData[field])) {
        data = rawData[field]
        break
      }
    }
  }

  if (!Array.isArray(data) || data.length === 0) {
    console.warn('[ComprehensiveStockInfo] 分时数据格式不正确或为空，使用模拟数据')
    // 生成模拟分时数据
    data = generateMockTimeData()
  }

  console.log('[ComprehensiveStockInfo] 处理后的分时数据长度:', data.length)

  timeChartInstance = echarts.init(timeChart.value, isDarkMode.value ? 'dark' : 'light')

  const option = {
    title: {
      text: '分时图',
      left: 'center',
      textStyle: {
        color: isDarkMode.value ? '#ffffff' : '#333333'
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: function (params: any) {
        const data = params[0]
        return `
          <div>
            <div>时间: ${data.name}</div>
            <div>价格: ${data.value}</div>
          </div>
        `
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map(item => item.time)
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '价格',
        type: 'line',
        stack: 'Total',
        smooth: true,
        lineStyle: {
          color: '#1890ff'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: 'rgba(24, 144, 255, 0.3)'
              },
              {
                offset: 1,
                color: 'rgba(24, 144, 255, 0.1)'
              }
            ]
          }
        },
        data: data.map(item => item.price)
      }
    ]
  }

  timeChartInstance.setOption(option)
}

// WebSocket 实时数据更新
const setupRealtimeUpdates = () => {
  if (!selectedStock.value) return

  // 订阅股票实时数据
  subscribe(`stock.${selectedStock.value}`, (data: any) => {
    if (stockData.value && data.symbol === stockData.value.symbol) {
      // 更新基本数据
      stockData.value.currentPrice = data.current_price
      stockData.value.change = data.change
      stockData.value.changePercent = data.change_percent
      stockData.value.volume = data.volume
      stockData.value.turnover = data.turnover
      stockData.value.updateTime = new Date(data.update_time)

      // 显示更新通知
      ElNotification({
        title: '数据更新',
        message: `${stockData.value.name} 价格已更新`,
        type: 'info',
        duration: 2000,
        position: 'bottom-right'
      })
    }
  })

  // 订阅成交明细
  subscribe(`transactions.${selectedStock.value}`, (data: any) => {
    if (data.length > 0) {
      transactionDetails.value = data.map((t: any) => ({
        id: t.id,
        time: new Date(t.time),
        price: t.price,
        volume: t.volume,
        direction: t.direction
      }))
    }
  })

  // 订阅买卖盘
  subscribe(`orderbook.${selectedStock.value}`, (data: any) => {
    if (data.buy && data.sell) {
      buyOrders.value = data.buy.map((order: any, index: number) => ({
        level: index + 1,
        price: order.price,
        volume: order.volume
      }))

      sellOrders.value = data.sell.map((order: any, index: number) => ({
        level: index + 1,
        price: order.price,
        volume: order.volume
      }))
    }
  })
}

// 响应式图表大小调整
const handleResize = () => {
  if (klineChartInstance) {
    klineChartInstance.resize()
  }
  if (timeChartInstance) {
    timeChartInstance.resize()
  }
}

// 监听主题变化
watch(isDarkMode, (newValue) => {
  if (klineChartInstance) {
    klineChartInstance.dispose()
    klineChartInstance = echarts.init(klineChart.value!, newValue ? 'dark' : 'light')
    // 重新设置配置
  }
  if (timeChartInstance) {
    timeChartInstance.dispose()
    timeChartInstance = echarts.init(timeChart.value!, newValue ? 'dark' : 'light')
    // 重新设置配置
  }
})

// 监听股票变化
watch(selectedStock, (newSymbol) => {
  if (newSymbol) {
    setupRealtimeUpdates()
  }
})

// 生命周期钩子
onMounted(async () => {
  // 连接WebSocket
  connect()

  // 加载初始数据
  await loadStockData(selectedStock.value)

  // 设置实时更新
  setupRealtimeUpdates()

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  // 断开WebSocket连接
  disconnect()

  // 清理图表实例
  if (klineChartInstance) {
    klineChartInstance.dispose()
    klineChartInstance = null
  }

  if (timeChartInstance) {
    timeChartInstance.dispose()
    timeChartInstance = null
  }

  // 移除事件监听器
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.comprehensive-stock-info {
  padding: 24px;
  background: transparent;
  min-height: 100vh;
}

.stock-search-section {
  margin-bottom: 24px;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e9ecef;
}

.search-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.stock-selector {
  flex: 1;
  max-width: 400px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-buttons .el-button {
  border-radius: 4px;
  padding: 6px 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: none;
  border: 1px solid #dee2e6;
}

.action-buttons .el-button:hover {
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.global-loading {
  text-align: center;
  padding: 48px;
  background: white;
  border-radius: 8px;
  margin: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e9ecef;
}

.loading-text {
  margin-top: 16px;
  color: #6c757d;
  font-size: 1rem;
  font-weight: 500;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.basic-info-card {
  transition: all 0.2s ease;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e9ecef;
  overflow: hidden;
}

.basic-info-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stock-title {
  display: flex;
  align-items: center;
  gap: var(--el-spacing-md);
}

.stock-name {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #212529;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.stock-symbol {
  padding: 4px 8px;
  background: #f8f9fa;
  color: #495057;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid #dee2e6;
}

.update-time {
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
}

.basic-info-grid {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: var(--el-spacing-xl);
  align-items: start;
}

.price-section {
  text-align: center;
  padding: 24px;
  border-radius: 8px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.current-price {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 12px;
  color: #212529;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.current-price.positive {
  color: var(--el-color-success);
}

.current-price.negative {
  color: var(--el-color-danger);
}

.current-price.neutral {
  color: var(--el-text-color-primary);
}

.price-change {
  display: flex;
  justify-content: center;
  gap: var(--el-spacing-sm);
  font-size: 1.125rem;
  font-weight: 600;
}

.basic-data-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--el-spacing-lg);
}

.data-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.data-item:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.data-item .label {
  font-size: 0.75rem;
  color: #6c757d;
  font-weight: 500;
}

.data-item .value {
  font-size: 1rem;
  font-weight: 600;
  color: #212529;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.data-item .value.high {
  color: var(--el-color-success);
}

.data-item .value.low {
  color: var(--el-color-danger);
}

.charts-row,
.data-row,
.realtime-row {
  margin-bottom: var(--el-spacing-lg);
}

.chart-card,
.technical-card,
.financial-card,
.realtime-card {
  height: 400px;
  transition: all 0.2s ease;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e9ecef;
  overflow: hidden;
}

.chart-card:hover,
.technical-card:hover,
.financial-card:hover,
.realtime-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 320px;
  padding: var(--el-spacing-md);
}

.kline-chart,
.time-chart {
  width: 100%;
  height: 100%;
}

.expandable-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.expand-icon {
  transition: transform 0.3s ease;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.technical-indicators,
.financial-data {
  padding: var(--el-spacing-md);
  height: 320px;
  overflow-y: auto;
}

.indicator-grid,
.financial-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--el-spacing-md);
}

.indicator-item,
.financial-item {
  padding: 16px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  text-align: center;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.indicator-item:hover,
.financial-item:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  background: #f1f3f4;
}

.indicator-name,
.financial-name {
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
  margin-bottom: var(--el-spacing-xs);
}

.indicator-value,
.financial-value {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.indicator-value.bullish {
  color: #28a745;
}

.indicator-value.bearish {
  color: #dc3545;
}

.indicator-value.neutral {
  color: #6c757d;
}

.indicator-signal {
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
}

.financial-unit {
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
}

.transaction-details,
.money-flow,
.order-book {
  height: 320px;
  padding: var(--el-spacing-md);
}

.transaction-header {
  display: grid;
  grid-template-columns: 60px 80px 80px 40px;
  gap: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6c757d;
  margin-bottom: 8px;
  border: 1px solid #e9ecef;
}

.transaction-list {
  height: 260px;
  overflow-y: auto;
}

.transaction-item {
  display: grid;
  grid-template-columns: 60px 80px 80px 40px;
  gap: var(--el-spacing-sm);
  padding: var(--el-spacing-xs) var(--el-spacing-sm);
  font-size: 0.75rem;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.transaction-item.buy {
  color: var(--el-color-success);
}

.transaction-item.sell {
  color: var(--el-color-danger);
}

.flow-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--el-spacing-sm);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.flow-label {
  font-size: 0.875rem;
  color: var(--el-text-color-regular);
}

.flow-value {
  font-size: 0.875rem;
  font-weight: 600;
}

.flow-value.inflow {
  color: var(--el-color-success);
}

.flow-value.outflow {
  color: var(--el-color-danger);
}

.order-section {
  margin-bottom: var(--el-spacing-md);
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: var(--el-spacing-sm);
  text-align: center;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.order-item {
  display: grid;
  grid-template-columns: 40px 80px 80px;
  gap: var(--el-spacing-sm);
  padding: 2px var(--el-spacing-sm);
  font-size: 0.75rem;
  text-align: center;
}

.order-item.sell {
  color: var(--el-color-success);
}

.order-item.buy {
  color: var(--el-color-danger);
}

.current-price-section {
  text-align: center;
  padding: 12px;
  margin: 12px 0;
  background: #007bff;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
}

.current-price-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 4px;
  font-weight: 500;
}

.current-price-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.error-state {
  padding: 48px;
  text-align: center;
  background: white;
  border-radius: 8px;
  margin: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e9ecef;
}

.error-state .el-result {
  background: transparent;
}

.error-state .el-button {
  border-radius: 4px;
  padding: 8px 24px;
  font-weight: 500;
  background: #007bff;
  border: 1px solid #007bff;
  color: white;
  transition: all 0.2s ease;
}

.error-state .el-button:hover {
  background: #0056b3;
  border-color: #0056b3;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .basic-info-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .basic-data-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .chart-card,
  .technical-card,
  .financial-card,
  .realtime-card {
    height: 350px;
  }
}

@media (max-width: 768px) {
  .comprehensive-stock-info {
    padding: 12px;
  }

  .search-container {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .stock-selector {
    max-width: none;
  }

  .action-buttons {
    justify-content: center;
    flex-wrap: wrap;
  }

  .basic-data-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .indicator-grid,
  .financial-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .current-price {
    font-size: 2rem;
  }

  .stock-name {
    font-size: 1.25rem;
  }

  .chart-card,
  .technical-card,
  .financial-card,
  .realtime-card {
    height: 300px;
  }

  .chart-container {
    height: 220px;
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
