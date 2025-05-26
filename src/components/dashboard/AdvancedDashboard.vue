<template>
  <div class="advanced-dashboard">
    <!-- 顶部控制栏 -->
    <div class="dashboard-header">
      <div class="header-left">
        <h2 class="dashboard-title">
          <span class="title-icon">📊</span>
          智能投资仪表盘
        </h2>
        <div class="market-status">
          <span class="status-indicator" :class="marketStatus.class"></span>
          <span class="status-text">{{ marketStatus.text }}</span>
        </div>
      </div>
      <div class="header-right">
        <div class="time-selector">
          <el-select v-model="selectedTimeframe" size="small" @change="onTimeframeChange">
            <el-option label="1分钟" value="1m" />
            <el-option label="5分钟" value="5m" />
            <el-option label="15分钟" value="15m" />
            <el-option label="1小时" value="1h" />
            <el-option label="日线" value="1d" />
          </el-select>
        </div>
        <el-button type="primary" size="small" @click="refreshData" :loading="isRefreshing">
          <span class="refresh-icon">🔄</span>
          刷新数据
        </el-button>
      </div>
    </div>

    <!-- 核心指标卡片 -->
    <div class="metrics-grid">
      <div class="metric-card" v-for="metric in coreMetrics" :key="metric.id">
        <div class="metric-header">
          <span class="metric-icon">{{ metric.icon }}</span>
          <span class="metric-title">{{ metric.title }}</span>
          <span class="metric-trend" :class="metric.trend">{{ metric.trendIcon }}</span>
        </div>
        <div class="metric-value">{{ metric.value }}</div>
        <div class="metric-change" :class="metric.changeClass">
          {{ metric.change }}
        </div>
        <div class="metric-chart">
          <div class="mini-chart" :ref="el => setChartRef(metric.id, el)"></div>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="dashboard-content">
      <!-- 左侧：市场概览和热点 -->
      <div class="left-panel">
        <!-- 市场热力图 -->
        <div class="panel-card">
          <div class="card-header">
            <h3>市场热力图</h3>
            <div class="card-actions">
              <el-button size="small" @click="toggleHeatmapView">
                {{ heatmapView === 'sector' ? '切换到个股' : '切换到板块' }}
              </el-button>
            </div>
          </div>
          <div class="heatmap-container" ref="heatmapChart"></div>
        </div>

        <!-- 资金流向 -->
        <div class="panel-card">
          <div class="card-header">
            <h3>资金流向</h3>
          </div>
          <div class="money-flow">
            <div class="flow-item" v-for="flow in moneyFlow" :key="flow.type">
              <div class="flow-label">{{ flow.label }}</div>
              <div class="flow-value" :class="flow.class">{{ flow.value }}</div>
              <div class="flow-bar">
                <div class="flow-progress" :style="{ width: flow.percentage + '%', backgroundColor: flow.color }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间：主图表区域 -->
      <div class="center-panel">
        <!-- 主图表 -->
        <div class="panel-card main-chart-card">
          <div class="card-header">
            <h3>市场走势</h3>
            <div class="chart-controls">
              <el-radio-group v-model="chartType" size="small">
                <el-radio-button label="candlestick">K线</el-radio-button>
                <el-radio-button label="line">分时</el-radio-button>
                <el-radio-button label="volume">成交量</el-radio-button>
              </el-radio-group>
            </div>
          </div>
          <div class="main-chart" ref="mainChart"></div>
        </div>

        <!-- 技术指标面板 -->
        <div class="panel-card indicators-card">
          <div class="card-header">
            <h3>技术指标</h3>
            <div class="indicator-tabs">
              <span 
                v-for="indicator in technicalIndicators" 
                :key="indicator.name"
                class="indicator-tab"
                :class="{ active: activeIndicator === indicator.name }"
                @click="activeIndicator = indicator.name"
              >
                {{ indicator.label }}
              </span>
            </div>
          </div>
          <div class="indicators-content">
            <div class="indicator-values">
              <div 
                v-for="value in getCurrentIndicatorValues()" 
                :key="value.name"
                class="indicator-value"
              >
                <span class="value-label">{{ value.label }}:</span>
                <span class="value-number" :class="value.class">{{ value.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：关注列表和交易信号 -->
      <div class="right-panel">
        <!-- 关注列表 -->
        <div class="panel-card">
          <div class="card-header">
            <h3>关注列表</h3>
            <div class="card-actions">
              <el-button size="small" type="primary" @click="showAddStock = true">
                <span>+</span> 添加
              </el-button>
            </div>
          </div>
          <div class="watchlist">
            <div 
              v-for="stock in watchlist" 
              :key="stock.symbol"
              class="watchlist-item"
              @click="selectStock(stock)"
            >
              <div class="stock-info">
                <div class="stock-name">{{ stock.name }}</div>
                <div class="stock-symbol">{{ stock.symbol }}</div>
              </div>
              <div class="stock-price">
                <div class="price">{{ stock.price }}</div>
                <div class="change" :class="stock.changeClass">{{ stock.change }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 交易信号 -->
        <div class="panel-card">
          <div class="card-header">
            <h3>交易信号</h3>
            <div class="signal-filter">
              <el-select v-model="signalFilter" size="small">
                <el-option label="全部" value="all" />
                <el-option label="买入" value="buy" />
                <el-option label="卖出" value="sell" />
                <el-option label="观望" value="hold" />
              </el-select>
            </div>
          </div>
          <div class="signals-list">
            <div 
              v-for="signal in filteredSignals" 
              :key="signal.id"
              class="signal-item"
              :class="signal.type"
            >
              <div class="signal-icon">{{ signal.icon }}</div>
              <div class="signal-content">
                <div class="signal-title">{{ signal.title }}</div>
                <div class="signal-desc">{{ signal.description }}</div>
                <div class="signal-time">{{ signal.time }}</div>
              </div>
              <div class="signal-confidence">
                <div class="confidence-bar">
                  <div 
                    class="confidence-fill" 
                    :style="{ width: signal.confidence + '%' }"
                  ></div>
                </div>
                <span class="confidence-text">{{ signal.confidence }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import * as echarts from 'echarts'

// 响应式数据
const selectedTimeframe = ref('1d')
const isRefreshing = ref(false)
const heatmapView = ref('sector')
const chartType = ref('candlestick')
const activeIndicator = ref('MACD')
const signalFilter = ref('all')
const showAddStock = ref(false)

// 市场状态
const marketStatus = computed(() => {
  // 这里应该根据实际市场数据计算
  return {
    class: 'bullish',
    text: '多头市场'
  }
})

// 核心指标数据
const coreMetrics = ref([
  {
    id: 'shanghai',
    icon: '📈',
    title: '上证指数',
    value: '3,245.67',
    change: '+1.23%',
    changeClass: 'positive',
    trend: 'up',
    trendIcon: '↗'
  },
  {
    id: 'shenzhen',
    icon: '📊',
    title: '深证成指',
    value: '12,456.89',
    change: '+0.87%',
    changeClass: 'positive',
    trend: 'up',
    trendIcon: '↗'
  },
  {
    id: 'volume',
    icon: '💰',
    title: '成交额',
    value: '8,567亿',
    change: '+15.6%',
    changeClass: 'positive',
    trend: 'up',
    trendIcon: '↗'
  },
  {
    id: 'advance',
    icon: '🎯',
    title: '涨跌比',
    value: '2.3:1',
    change: '强势',
    changeClass: 'positive',
    trend: 'up',
    trendIcon: '↗'
  }
])

// 资金流向数据
const moneyFlow = ref([
  { type: 'main', label: '主力资金', value: '+125.6亿', percentage: 75, color: '#e74c3c', class: 'positive' },
  { type: 'retail', label: '散户资金', value: '-89.3亿', percentage: 45, color: '#3498db', class: 'negative' },
  { type: 'foreign', label: '外资', value: '+45.2亿', percentage: 60, color: '#2ecc71', class: 'positive' },
  { type: 'institution', label: '机构', value: '+23.1亿', percentage: 35, color: '#f39c12', class: 'positive' }
])

// 关注列表数据
const watchlist = ref([
  { symbol: '000001', name: '平安银行', price: '12.45', change: '+2.3%', changeClass: 'positive' },
  { symbol: '000002', name: '万科A', price: '18.67', change: '-1.2%', changeClass: 'negative' },
  { symbol: '600036', name: '招商银行', price: '45.23', change: '+1.8%', changeClass: 'positive' }
])

// 技术指标配置
const technicalIndicators = ref([
  { name: 'MACD', label: 'MACD' },
  { name: 'KDJ', label: 'KDJ' },
  { name: 'RSI', label: 'RSI' },
  { name: 'BOLL', label: '布林带' }
])

// 交易信号数据
const signals = ref([
  {
    id: 1,
    type: 'buy',
    icon: '🟢',
    title: '平安银行 买入信号',
    description: 'MACD金叉，成交量放大',
    time: '2分钟前',
    confidence: 85
  },
  {
    id: 2,
    type: 'sell',
    icon: '🔴',
    title: '万科A 卖出信号',
    description: 'RSI超买，建议减仓',
    time: '5分钟前',
    confidence: 72
  }
])

// 计算属性
const filteredSignals = computed(() => {
  if (signalFilter.value === 'all') return signals.value
  return signals.value.filter(signal => signal.type === signalFilter.value)
})

// 方法
const setChartRef = (id: string, el: HTMLElement | null) => {
  // 设置图表引用
}

const onTimeframeChange = () => {
  // 时间周期变化处理
}

const refreshData = async () => {
  isRefreshing.value = true
  // 刷新数据逻辑
  setTimeout(() => {
    isRefreshing.value = false
  }, 2000)
}

const toggleHeatmapView = () => {
  heatmapView.value = heatmapView.value === 'sector' ? 'stock' : 'sector'
}

const getCurrentIndicatorValues = () => {
  // 根据当前选中的指标返回对应的值
  return [
    { name: 'dif', label: 'DIF', value: '0.23', class: 'positive' },
    { name: 'dea', label: 'DEA', value: '0.18', class: 'positive' },
    { name: 'macd', label: 'MACD', value: '0.05', class: 'positive' }
  ]
}

const selectStock = (stock: any) => {
  // 选择股票逻辑
}

onMounted(() => {
  // 初始化图表
})
</script>

<style scoped>
.advanced-dashboard {
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  background: var(--bg-primary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.dashboard-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--primary-color);
  margin: 0;
}

.title-icon {
  font-size: 1.5em;
}

.market-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-color);
  animation: pulse 2s infinite;
}

.status-indicator.bullish {
  background: var(--success-color);
}

.status-indicator.bearish {
  background: var(--error-color);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.refresh-icon {
  margin-right: var(--spacing-xs);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.metric-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-normal);
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.metric-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.metric-icon {
  font-size: 1.5em;
}

.metric-title {
  font-weight: 600;
  color: var(--text-primary);
}

.metric-trend {
  font-size: 1.2em;
}

.metric-trend.up {
  color: var(--success-color);
}

.metric-trend.down {
  color: var(--error-color);
}

.metric-value {
  font-size: var(--font-size-xxl);
  font-weight: 800;
  color: var(--primary-color);
  margin-bottom: var(--spacing-xs);
}

.metric-change {
  font-size: var(--font-size-sm);
  font-weight: 600;
  margin-bottom: var(--spacing-md);
}

.metric-change.positive {
  color: var(--success-color);
}

.metric-change.negative {
  color: var(--error-color);
}

.mini-chart {
  height: 60px;
  width: 100%;
}

.dashboard-content {
  display: grid;
  grid-template-columns: 300px 1fr 300px;
  gap: var(--spacing-lg);
  height: calc(100vh - 300px);
}

.panel-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  margin-bottom: var(--spacing-md);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-secondary);
}

.card-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--primary-color);
}

.heatmap-container,
.main-chart {
  height: 300px;
  padding: var(--spacing-md);
}

.money-flow {
  padding: var(--spacing-md);
}

.flow-item {
  margin-bottom: var(--spacing-md);
}

.flow-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.flow-value {
  font-size: var(--font-size-md);
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
}

.flow-value.positive {
  color: var(--success-color);
}

.flow-value.negative {
  color: var(--error-color);
}

.flow-bar {
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}

.flow-progress {
  height: 100%;
  transition: width var(--transition-normal);
}

.main-chart-card {
  height: 400px;
}

.indicators-card {
  height: 200px;
}

.chart-controls {
  display: flex;
  gap: var(--spacing-sm);
}

.indicator-tabs {
  display: flex;
  gap: var(--spacing-sm);
}

.indicator-tab {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.indicator-tab:hover {
  background: var(--bg-secondary);
}

.indicator-tab.active {
  background: var(--accent-color);
  color: white;
}

.indicators-content {
  padding: var(--spacing-md);
}

.indicator-values {
  display: flex;
  gap: var(--spacing-lg);
}

.indicator-value {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.value-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.value-number {
  font-size: var(--font-size-md);
  font-weight: 600;
}

.value-number.positive {
  color: var(--success-color);
}

.value-number.negative {
  color: var(--error-color);
}

.watchlist {
  max-height: 300px;
  overflow-y: auto;
}

.watchlist-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.watchlist-item:hover {
  background: var(--bg-secondary);
}

.stock-info {
  flex: 1;
}

.stock-name {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.stock-symbol {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.stock-price {
  text-align: right;
}

.price {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.change {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.change.positive {
  color: var(--success-color);
}

.change.negative {
  color: var(--error-color);
}

.signals-list {
  max-height: 400px;
  overflow-y: auto;
}

.signal-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
}

.signal-icon {
  font-size: 1.2em;
}

.signal-content {
  flex: 1;
}

.signal-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.signal-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.signal-time {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.signal-confidence {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.confidence-bar {
  width: 40px;
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: var(--accent-color);
  transition: width var(--transition-normal);
}

.confidence-text {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .dashboard-content {
    grid-template-columns: 1fr;
    height: auto;
  }
  
  .metrics-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}
</style>
