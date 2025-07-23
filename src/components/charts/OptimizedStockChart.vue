<template>
  <div class="optimized-stock-chart" ref="chartContainer">
    <div class="chart-header" v-if="showHeader">
      <div class="chart-title">
        <h3>{{ title || `${stockData?.symbol || ''} ${stockData?.name || ''}` }}</h3>
        <span class="chart-subtitle" v-if="subtitle">{{ subtitle }}</span>
      </div>
      
      <div class="chart-controls">
        <!-- 时间范围选择器 -->
        <div class="time-range-selector">
          <button 
            v-for="range in timeRanges" 
            :key="range.value" 
            :class="{ active: selectedTimeRange === range.value }"
            @click="changeTimeRange(range.value)"
          >
            {{ range.label }}
          </button>
        </div>
        
        <!-- 图表类型选择器 -->
        <div class="chart-type-selector">
          <button 
            v-for="type in chartTypes" 
            :key="type.value" 
            :class="{ active: selectedChartType === type.value }"
            @click="changeChartType(type.value)"
            :title="type.label"
          >
            <span class="chart-type-icon" v-html="type.icon"></span>
          </button>
        </div>
        
        <!-- 性能优化开关 -->
        <div class="performance-toggle" v-if="showPerformanceToggle">
          <label class="toggle-switch">
            <input type="checkbox" v-model="performanceOptimization">
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-label">性能优化</span>
        </div>
      </div>
    </div>
    
    <div class="chart-content">
      <VirtualScrollChart
        ref="chartRef"
        :type="chartComponentType"
        :data="chartData"
        :options="chartOptions"
        :showControls="showControls"
        :virtualScroll="virtualScroll"
        :visibleRange="visibleRange"
        :performanceOptimization="performanceOptimization"
        :loading="loading"
        :indicatorType="indicatorType"
        :indicatorData="indicatorData"
        @ready="handleChartReady"
        @scroll="handleChartScroll"
        @zoom="handleChartZoom"
        @loadMore="handleLoadMore"
      />
    </div>
    
    <div class="chart-footer" v-if="showFooter">
      <div class="data-info">
        <span>数据来源: {{ stockData?.dataSource || '未知' }}</span>
        <span>更新时间: {{ formatDateTime(stockData?.lastUpdated) }}</span>
      </div>
      
      <div class="chart-actions">
        <button class="action-button" @click="exportChart" title="导出图表">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
        
        <button class="action-button" @click="toggleFullscreen" title="全屏显示">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
            <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
            <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
            <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import VirtualScrollChart from '@/components/charts/VirtualScrollChart.vue'
import { enhancedChartRenderingService, type EnhancedChartOptions, type EnhancedChartInstance } from '@/services/enhancedChartRenderingService'
import { chartDataManager } from '@/services/chartDataManager'
import { optimizedTechnicalIndicatorService } from '@/services/optimizedTechnicalIndicatorService'
import type { StockData } from '@/types/stock'
import type { ChartSeries } from '@/services/chartRenderingService'

// 组件属性
interface Props {
  // 股票数据
  stockData?: StockData
  // 图表标题
  title?: string
  // 图表副标题
  subtitle?: string
  // 是否显示标题栏
  showHeader?: boolean
  // 是否显示底部栏
  showFooter?: boolean
  // 是否显示控制器
  showControls?: boolean
  // 是否启用虚拟滚动
  virtualScroll?: boolean
  // 可见数据点数量
  visibleRange?: number
  // 是否显示性能优化开关
  showPerformanceToggle?: boolean
  // 默认图表类型
  defaultChartType?: 'candlestick' | 'line' | 'area' | 'bar'
  // 默认时间范围
  defaultTimeRange?: string
  // 技术指标类型
  indicatorType?: string
  // 技术指标数据
  indicatorData?: any
  // 是否正在加载
  loading?: boolean
  // 图表高度
  height?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  showHeader: true,
  showFooter: true,
  showControls: true,
  virtualScroll: true,
  visibleRange: 100,
  showPerformanceToggle: true,
  defaultChartType: 'candlestick',
  defaultTimeRange: '1m',
  loading: false,
  height: '400px'
})

// 事件
const emit = defineEmits<{
  // 图表准备就绪
  ready: [chart: EnhancedChartInstance]
  // 时间范围变化
  timeRangeChange: [range: string]
  // 图表类型变化
  chartTypeChange: [type: string]
  // 需要加载更多数据
  loadMore: [direction: 'left' | 'right', range: string]
  // 性能优化设置变化
  performanceChange: [enabled: boolean]
}>()

// 引用
const chartContainer = ref<HTMLElement | null>(null)
const chartRef = ref<InstanceType<typeof VirtualScrollChart> | null>(null)

// 状态
const selectedChartType = ref(props.defaultChartType)
const selectedTimeRange = ref(props.defaultTimeRange)
const performanceOptimization = ref(true)
const isFullscreen = ref(false)
const dataManager = chartDataManager.createStockDataManager()

// 时间范围选项
const timeRanges = [
  { label: '1日', value: '1d' },
  { label: '1周', value: '1w' },
  { label: '1月', value: '1m' },
  { label: '3月', value: '3m' },
  { label: '6月', value: '6m' },
  { label: '1年', value: '1y' },
  { label: '全部', value: 'all' }
]

// 图表类型选项
const chartTypes = [
  { 
    label: 'K线图', 
    value: 'candlestick',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 5v14"></path>
      <path d="M9 5L3 9"></path>
      <path d="M9 5l6 4"></path>
      <path d="M9 19l-6-4"></path>
      <path d="M9 19l6-4"></path>
    </svg>`
  },
  { 
    label: '折线图', 
    value: 'line',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>`
  },
  { 
    label: '面积图', 
    value: 'area',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 12.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1.5"></path>
      <polyline points="22 12 18 12 15 19 9 9 6 12 2 12"></polyline>
    </svg>`
  },
  { 
    label: '柱状图', 
    value: 'bar',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="12" width="3" height="9"></rect>
      <rect x="8" y="8" width="3" height="13"></rect>
      <rect x="13" y="5" width="3" height="16"></rect>
      <rect x="18" y="10" width="3" height="11"></rect>
    </svg>`
  }
]

// 计算属性
const chartComponentType = computed(() => {
  if (props.indicatorType) {
    return 'indicator'
  }
  
  switch (selectedChartType.value) {
    case 'candlestick':
      return 'candlestick'
    case 'line':
      return 'line'
    case 'area':
      return 'line' // 使用折线图组件，但配置为面积图
    case 'bar':
      return 'multi' // 使用多系列图表组件
    default:
      return 'candlestick'
  }
})

const chartData = computed(() => {
  if (!props.stockData) return []
  
  if (props.indicatorType && props.indicatorData) {
    return props.stockData
  }
  
  switch (selectedChartType.value) {
    case 'candlestick':
      return props.stockData
    case 'line':
      return props.stockData.closes || props.stockData.prices || []
    case 'area':
      return props.stockData.closes || props.stockData.prices || []
    case 'bar':
      // 创建柱状图系列
      const series: ChartSeries[] = []
      
      if (props.stockData.closes || props.stockData.prices) {
        series.push({
          type: 'bar',
          name: '收盘价',
          data: props.stockData.closes || props.stockData.prices || [],
          color: '#5470c6'
        })
      }
      
      if (props.stockData.volumes) {
        series.push({
          type: 'bar',
          name: '成交量',
          data: props.stockData.volumes,
          color: '#91cc75'
        })
      }
      
      return series
    default:
      return props.stockData
  }
})

const chartOptions = computed((): Partial<EnhancedChartOptions> => {
  const baseOptions: Partial<EnhancedChartOptions> = {
    theme: 'light',
    animation: false,
    tooltip: true,
    crosshair: true,
    grid: true,
    virtualScroll: {
      enabled: props.virtualScroll,
      visibleRange: props.visibleRange,
      scrollStep: 10,
      overscanCount: 20
    },
    performance: {
      enableWebGL: performanceOptimization.value,
      throttleRedraw: performanceOptimization.value ? 16 : 0,
      downSampleThreshold: 1000,
      downSampleFactor: 2,
      clipOutOfBounds: performanceOptimization.value,
      lazyUpdate: performanceOptimization.value,
      batchRendering: performanceOptimization.value,
      useRequestAnimationFrame: performanceOptimization.value
    }
  }
  
  // 根据图表类型添加特定选项
  switch (selectedChartType.value) {
    case 'area':
      return {
        ...baseOptions,
        series: {
          type: 'area',
          areaOpacity: 0.3,
          smooth: true
        }
      }
    case 'line':
      return {
        ...baseOptions,
        series: {
          type: 'line',
          smooth: true
        }
      }
    default:
      return baseOptions
  }
})

// 监听属性变化
watch(() => props.stockData, (newData) => {
  if (!newData) return
  
  // 更新数据管理器
  if (newData.symbol) {
    dataManager.setSymbol(newData.symbol)
  }
  
  // 设置总数据长度
  if (newData.dates) {
    dataManager.setTotalLength(newData.dates.length)
  }
}, { deep: true })

watch(() => performanceOptimization.value, (enabled) => {
  emit('performanceChange', enabled)
})

// 生命周期钩子
onMounted(() => {
  // 添加全屏变化监听
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  // 移除全屏变化监听
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})

// 方法
function handleChartReady(chart: EnhancedChartInstance) {
  emit('ready', chart)
}

function handleChartScroll(range: [number, number]) {
  // 可以在这里处理滚动事件
}

function handleChartZoom(level: number) {
  // 可以在这里处理缩放事件
}

function handleLoadMore(direction: 'left' | 'right') {
  emit('loadMore', direction, selectedTimeRange.value)
}

function changeTimeRange(range: string) {
  selectedTimeRange.value = range
  emit('timeRangeChange', range)
}

function changeChartType(type: 'candlestick' | 'line' | 'area' | 'bar') {
  selectedChartType.value = type
  emit('chartTypeChange', type)
}

function formatDateTime(date?: Date | string | number): string {
  if (!date) return '未知'
  
  const d = new Date(date)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function exportChart() {
  if (!chartRef.value) return
  
  const chart = chartRef.value.getChart()
  if (!chart) return
  
  try {
    // 获取图表的数据URL
    const dataURL = chart.toDataURL()
    
    // 创建下载链接
    const link = document.createElement('a')
    link.download = `${props.stockData?.symbol || 'chart'}_${new Date().toISOString().slice(0, 10)}.png`
    link.href = dataURL
    link.click()
  } catch (error) {
    console.error('Failed to export chart:', error)
  }
}

function toggleFullscreen() {
  if (!chartContainer.value) return
  
  if (!isFullscreen.value) {
    // 进入全屏
    if (chartContainer.value.requestFullscreen) {
      chartContainer.value.requestFullscreen()
    }
  } else {
    // 退出全屏
    if (document.exitFullscreen) {
      document.exitFullscreen()
    }
  }
}

function handleFullscreenChange() {
  isFullscreen.value = document.fullscreenElement === chartContainer.value
  
  // 全屏变化后调整图表大小
  if (chartRef.value) {
    setTimeout(() => {
      chartRef.value?.resize()
    }, 100)
  }
}

// 暴露方法
defineExpose({
  // 获取图表实例
  getChart: () => chartRef.value?.getChart(),
  // 滚动到指定位置
  scrollTo: (index: number) => chartRef.value?.scrollTo(index),
  // 滚动指定步长
  scrollBy: (step: number) => chartRef.value?.scrollBy(step),
  // 设置可见范围
  setVisibleRange: (start: number, end: number) => chartRef.value?.setVisibleRange(start, end),
  // 获取当前可见范围
  getVisibleRange: () => chartRef.value?.getVisibleRange(),
  // 缩放
  zoomIn: () => chartRef.value?.zoomIn(),
  zoomOut: () => chartRef.value?.zoomOut(),
  // 重新调整大小
  resize: () => chartRef.value?.resize(),
  // 获取当前图表类型
  getChartType: () => selectedChartType.value,
  // 获取当前时间范围
  getTimeRange: () => selectedTimeRange.value,
  // 设置图表类型
  setChartType: (type: 'candlestick' | 'line' | 'area' | 'bar') => {
    selectedChartType.value = type
  },
  // 设置时间范围
  setTimeRange: (range: string) => {
    selectedTimeRange.value = range
  }
})
</script>

<style scoped>
.optimized-stock-chart {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: v-bind('typeof props.height === "number" ? props.height + "px" : props.height');
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
}

.chart-title {
  display: flex;
  flex-direction: column;
}

.chart-title h3 {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-primary);
}

.chart-subtitle {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.chart-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.time-range-selector {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  overflow: hidden;
}

.time-range-selector button {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: none;
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.time-range-selector button:hover {
  background: var(--bg-secondary);
}

.time-range-selector button.active {
  background: var(--primary-color);
  color: white;
}

.chart-type-selector {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  overflow: hidden;
}

.chart-type-selector button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.chart-type-selector button:hover {
  background: var(--bg-secondary);
}

.chart-type-selector button.active {
  background: var(--primary-color);
  color: white;
}

.chart-type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.performance-toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  transition: all var(--transition-fast);
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: all var(--transition-fast);
}

input:checked + .toggle-slider {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

input:checked + .toggle-slider:before {
  transform: translateX(16px);
}

.toggle-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.chart-content {
  flex: 1;
  min-height: 0;
  position: relative;
}

.chart-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-md);
  border-top: 1px solid var(--border-light);
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.data-info {
  display: flex;
  gap: var(--spacing-md);
}

.chart-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-button:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* 全屏样式 */
.optimized-stock-chart:fullscreen {
  height: 100%;
  padding: var(--spacing-md);
}

@media (max-width: 768px) {
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
  
  .chart-controls {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .time-range-selector {
    flex-wrap: wrap;
  }
  
  .chart-footer {
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  
  .data-info {
    flex-direction: column;
    gap: var(--spacing-xs);
  }
}
</style>