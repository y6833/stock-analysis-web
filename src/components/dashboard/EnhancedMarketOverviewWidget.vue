<template>
  <div class="enhanced-market-overview-widget">
    <div class="widget-header">
      <h3>市场概览</h3>
      <div class="widget-controls">
        <div class="time-range-selector">
          <button
            v-for="range in timeRanges"
            :key="range.key"
            class="range-button"
            :class="{ active: activeTimeRange === range.key }"
            @click="activeTimeRange = range.key"
          >
            {{ range.label }}
          </button>
        </div>
        <button class="refresh-btn" @click="refreshData" :disabled="isLoading">
          <span class="refresh-icon" :class="{ spinning: isLoading }">🔄</span>
        </button>
      </div>
    </div>

    <div class="widget-content">
      <div v-if="isLoading" class="loading-state">
        <SkeletonLoader type="chart" :rows="4" />
      </div>

      <div v-else-if="error" class="error-state">
        <div class="error-icon">⚠️</div>
        <p>{{ error }}</p>
        <button class="retry-btn" @click="refreshData">重试</button>
      </div>

      <div v-else class="market-content">
        <!-- 主要指数 -->
        <div class="indices-section">
          <div class="section-title">主要指数</div>
          <div class="indices-grid">
            <div
              v-for="index in marketIndices"
              :key="index.symbol"
              class="index-card"
              @click="$emit('index-click', index)"
            >
              <div class="index-name">{{ index.name }}</div>
              <div class="index-value">{{ formatPrice(index.price) }}</div>
              <div class="index-change" :class="getChangeClass(index.changePercent)">
                <span class="change-value">{{ formatChange(index.change) }}</span>
                <span class="change-percent">{{ formatPercent(index.changePercent) }}</span>
              </div>
              <div class="index-trend">
                <span class="trend-icon">{{ getTrendIcon(index.changePercent) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 市场指标 -->
        <div class="indicators-section">
          <div class="section-title">市场指标</div>
          <div class="indicators-grid">
            <div class="indicator-card">
              <div class="indicator-label">上涨家数</div>
              <div class="indicator-value positive">{{ marketBreadth.advancing }}</div>
            </div>
            <div class="indicator-card">
              <div class="indicator-label">下跌家数</div>
              <div class="indicator-value negative">{{ marketBreadth.declining }}</div>
            </div>
            <div class="indicator-card">
              <div class="indicator-label">平盘家数</div>
              <div class="indicator-value neutral">{{ marketBreadth.unchanged }}</div>
            </div>
            <div class="indicator-card">
              <div class="indicator-label">涨停家数</div>
              <div class="indicator-value positive">{{ marketBreadth.newHighs }}</div>
            </div>
          </div>
        </div>

        <!-- 市场情绪 -->
        <div class="sentiment-section">
          <div class="section-title">市场情绪</div>
          <div class="sentiment-display">
            <div class="sentiment-indicator">
              <div class="sentiment-icon">{{ sentimentIcon }}</div>
              <div class="sentiment-text">{{ sentimentText }}</div>
              <div class="sentiment-score" :class="sentimentClass">
                {{ sentimentScore }}%
              </div>
            </div>
            <div class="sentiment-bar">
              <div
                class="sentiment-fill"
                :class="sentimentClass"
                :style="{ width: `${Math.abs(sentimentScore)}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- 图表区域 -->
        <div class="chart-section">
          <div class="section-title">指数走势</div>
          <div class="chart-container">
            <div ref="chartElement" class="chart"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { dashboardService } from '@/services/dashboardService'
import type { MarketIndex, MarketOverview } from '@/types/dashboard'
import * as echarts from 'echarts'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'

// Props
interface Props {
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  refreshInterval: 60000 // 1分钟
})

// Emits
const emit = defineEmits<{
  'index-click': [index: MarketIndex]
}>()

// 状态
const isLoading = ref(false)
const error = ref('')
const activeTimeRange = ref('1D')

// 数据
const marketOverview = ref<MarketOverview | null>(null)
const chartElement = ref<HTMLElement | null>(null)
const chart = ref<echarts.ECharts | null>(null)

// 时间范围配置
const timeRanges = [
  { key: '1D', label: '日' },
  { key: '1W', label: '周' },
  { key: '1M', label: '月' },
  { key: '3M', label: '3月' },
  { key: '1Y', label: '年' }
]

// 计算属性
const marketIndices = computed(() => {
  return marketOverview.value?.indices || []
})

const marketBreadth = computed(() => {
  return marketOverview.value?.breadth || {
    advancing: 0,
    declining: 0,
    unchanged: 0,
    newHighs: 0,
    newLows: 0,
    advancingVolume: 0,
    decliningVolume: 0
  }
})

const sentimentScore = computed(() => {
  const breadth = marketBreadth.value
  const total = breadth.advancing + breadth.declining + breadth.unchanged
  if (total === 0) return 0

  const advancingRatio = breadth.advancing / total
  return Math.round((advancingRatio - 0.5) * 200) // -100 到 100
})

const sentimentClass = computed(() => {
  const score = sentimentScore.value
  if (score > 20) return 'bullish'
  if (score < -20) return 'bearish'
  return 'neutral'
})

const sentimentIcon = computed(() => {
  const score = sentimentScore.value
  if (score > 20) return '🐂'
  if (score < -20) return '🐻'
  return '🦊'
})

const sentimentText = computed(() => {
  const score = sentimentScore.value
  if (score > 20) return '看多'
  if (score < -20) return '看空'
  return '中性'
})

// 方法
const refreshData = async () => {
  if (isLoading.value) return

  isLoading.value = true
  error.value = ''

  try {
    const overview = await dashboardService.getMarketOverview(true)
    marketOverview.value = overview

    // 更新图表
    await nextTick()
    updateChart()

  } catch (err) {
    console.error('获取市场概览数据失败:', err)
    error.value = err instanceof Error ? err.message : '获取数据失败'
  } finally {
    isLoading.value = false
  }
}

const formatPrice = (price: number): string => {
  return price ? price.toFixed(2) : '--'
}

const formatChange = (change: number): string => {
  if (!change) return '--'
  return change > 0 ? `+${change.toFixed(2)}` : change.toFixed(2)
}

const formatPercent = (percent: number): string => {
  if (!percent) return '--'
  return percent > 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`
}

const getChangeClass = (changePercent: number): string => {
  if (changePercent > 0) return 'positive'
  if (changePercent < 0) return 'negative'
  return 'neutral'
}

const getTrendIcon = (changePercent: number): string => {
  if (changePercent > 0) return '📈'
  if (changePercent < 0) return '📉'
  return '📊'
}

const initChart = () => {
  if (!chartElement.value) return

  if (chart.value) {
    chart.value.dispose()
  }

  chart.value = echarts.init(chartElement.value)
  updateChart()

  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    chart.value?.resize()
  })
}

const updateChart = () => {
  if (!chart.value || !marketIndices.value.length) return

  // 生成模拟的历史数据（实际应用中应该从API获取）
  const dates = []
  const data = []
  const baseValue = marketIndices.value[0]?.price || 3000

  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    dates.push(date.toLocaleDateString())

    // 生成模拟数据
    const randomChange = (Math.random() - 0.5) * 100
    data.push((baseValue + randomChange * (30 - i) / 30).toFixed(2))
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        fontSize: 10,
        color: '#666'
      }
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0'
        }
      },
      axisLabel: {
        fontSize: 10,
        color: '#666'
      }
    },
    series: [{
      name: '上证指数',
      type: 'line',
      data: data,
      smooth: true,
      symbol: 'none',
      lineStyle: {
        width: 2,
        color: '#42b883'
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(66, 184, 131, 0.3)' },
          { offset: 1, color: 'rgba(66, 184, 131, 0.1)' }
        ])
      }
    }]
  }

  chart.value.setOption(option)
}

// 监听时间范围变化
watch(activeTimeRange, () => {
  updateChart()
})

// 生命周期
onMounted(() => {
  refreshData()
  initChart()

  // 设置定时刷新
  if (props.refreshInterval > 0) {
    setInterval(refreshData, props.refreshInterval)
  }
})

onUnmounted(() => {
  if (chart.value) {
    chart.value.dispose()
  }
  window.removeEventListener('resize', () => {
    chart.value?.resize()
  })
})
</script>

<style scoped>
.enhanced-market-overview-widget {
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

.time-range-selector {
  display: flex;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-md);
  padding: 2px;
}

.range-button {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.range-button.active {
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
.error-state {
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

.error-icon {
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

.market-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.section-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: var(--spacing-sm);
}

.indices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.index-card {
  background: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  border: 1px solid var(--border-light);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.index-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.index-name {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.index-value {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.index-change {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.index-change.positive {
  color: var(--stock-up);
}

.index-change.negative {
  color: var(--stock-down);
}

.index-change.neutral {
  color: var(--text-secondary);
}

.index-trend {
  margin-top: var(--spacing-xs);
  text-align: right;
}

.indicators-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--spacing-md);
}

.indicator-card {
  background: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  text-align: center;
  border: 1px solid var(--border-light);
}

.indicator-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.indicator-value {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.indicator-value.positive {
  color: var(--stock-up);
}

.indicator-value.negative {
  color: var(--stock-down);
}

.indicator-value.neutral {
  color: var(--text-secondary);
}

.sentiment-display {
  background: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  border: 1px solid var(--border-light);
}

.sentiment-indicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.sentiment-icon {
  font-size: 1.5rem;
}

.sentiment-text {
  font-size: var(--font-size-md);
  font-weight: 500;
  color: var(--text-primary);
}

.sentiment-score {
  margin-left: auto;
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.sentiment-score.bullish {
  color: var(--stock-up);
}

.sentiment-score.bearish {
  color: var(--stock-down);
}

.sentiment-score.neutral {
  color: var(--text-secondary);
}

.sentiment-bar {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.sentiment-fill {
  height: 100%;
  transition: width var(--transition-normal);
}

.sentiment-fill.bullish {
  background: var(--stock-up);
}

.sentiment-fill.bearish {
  background: var(--stock-down);
}

.sentiment-fill.neutral {
  background: var(--text-secondary);
}

.chart-container {
  background: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
  height: 200px;
}

.chart {
  width: 100%;
  height: 100%;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .widget-header {
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: stretch;
  }

  .widget-controls {
    justify-content: space-between;
  }

  .indices-grid {
    grid-template-columns: 1fr;
  }

  .indicators-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .sentiment-indicator {
    flex-direction: column;
    text-align: center;
  }
}
</style>
