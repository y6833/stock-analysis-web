<template>
  <div 
    class="virtual-scroll-chart" 
    ref="chartContainer"
    @wheel="handleWheel"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <div class="chart-wrapper" ref="chartWrapper">
      <!-- 图表容器 -->
    </div>
    
    <!-- 滚动控制器 -->
    <div class="scroll-controls" v-if="showControls">
      <button class="scroll-button" @click="scrollLeft">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      
      <div class="scroll-track" ref="scrollTrack" @mousedown="handleTrackClick">
        <div 
          class="scroll-thumb" 
          ref="scrollThumb"
          :style="{ left: thumbPosition + '%', width: thumbSize + '%' }"
          @mousedown="startDragging"
        ></div>
      </div>
      
      <button class="scroll-button" @click="scrollRight">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
    
    <!-- 缩放控制器 -->
    <div class="zoom-controls" v-if="showControls">
      <button class="zoom-button" @click="zoomIn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="11" y1="8" x2="11" y2="14"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
      </button>
      
      <button class="zoom-button" @click="zoomOut">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
      </button>
    </div>
    
    <!-- 加载指示器 -->
    <div class="loading-indicator" v-if="loading">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { enhancedChartRenderingService, type EnhancedChartInstance, type EnhancedChartOptions } from '@/services/enhancedChartRenderingService'
import type { StockData } from '@/types/stock'
import type { ChartSeries } from '@/services/chartRenderingService'
import { useResizeObserver } from '@/composables/useResizeObserver'

// 组件属性
interface Props {
  // 图表类型
  type: 'candlestick' | 'line' | 'area' | 'bar' | 'multi'
  // 图表数据
  data: StockData | number[] | Array<[number, number]> | ChartSeries[]
  // 图表选项
  options?: Partial<EnhancedChartOptions>
  // 是否显示控制器
  showControls?: boolean
  // 是否启用虚拟滚动
  virtualScroll?: boolean
  // 可见数据点数量
  visibleRange?: number
  // 是否启用性能优化
  performanceOptimization?: boolean
  // 是否正在加载
  loading?: boolean
  // 指标类型（用于技术指标图表）
  indicatorType?: string
  // 指标数据（用于技术指标图表）
  indicatorData?: any
}

const props = withDefaults(defineProps<Props>(), {
  showControls: true,
  virtualScroll: true,
  visibleRange: 100,
  performanceOptimization: true,
  loading: false
})

// 事件
const emit = defineEmits<{
  // 图表准备就绪
  ready: [chart: EnhancedChartInstance]
  // 滚动事件
  scroll: [range: [number, number]]
  // 缩放事件
  zoom: [level: number]
  // 点击事件
  click: [event: MouseEvent, dataIndex: number]
  // 需要加载更多数据
  loadMore: [direction: 'left' | 'right']
}>()

// 引用
const chartContainer = ref<HTMLElement | null>(null)
const chartWrapper = ref<HTMLElement | null>(null)
const scrollTrack = ref<HTMLElement | null>(null)
const scrollThumb = ref<HTMLElement | null>(null)

// 状态
const chart = ref<EnhancedChartInstance | null>(null)
const dataLength = ref(0)
const currentRange = ref<[number, number]>([0, 0])
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartPosition = ref(0)
const zoomLevel = ref(1)
const touchStartX = ref(0)
const touchStartY = ref(0)
const isTouchScrolling = ref(false)

// 计算属性
const thumbPosition = computed(() => {
  if (dataLength.value === 0) return 0
  return (currentRange.value[0] / dataLength.value) * 100
})

const thumbSize = computed(() => {
  if (dataLength.value === 0) return 100
  const visibleCount = currentRange.value[1] - currentRange.value[0]
  return Math.max(5, (visibleCount / dataLength.value) * 100)
})

// 监听属性变化
watch(() => props.data, (newData) => {
  if (!chart.value) return
  
  // 更新数据
  updateChartData(newData)
}, { deep: true })

watch(() => props.options, (newOptions) => {
  if (!chart.value) return
  
  // 更新选项
  chart.value.setOptions(newOptions || {})
}, { deep: true })

watch(() => props.visibleRange, (newRange) => {
  if (!chart.value) return
  
  // 更新可见范围
  const [start, end] = currentRange.value
  const visibleCount = end - start
  
  if (newRange !== visibleCount) {
    const newEnd = Math.min(dataLength.value, start + newRange)
    currentRange.value = [start, newEnd]
    chart.value.setVisibleRange(start, newEnd)
  }
})

// 生命周期钩子
onMounted(() => {
  if (!chartContainer.value || !chartWrapper.value) return
  
  // 初始化图表
  initChart()
  
  // 监听窗口大小变化
  useResizeObserver(chartContainer.value, handleResize)
  
  // 添加全局事件监听
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  // 销毁图表
  if (chart.value) {
    chart.value.destroy()
    chart.value = null
  }
  
  // 移除全局事件监听
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})

// 方法
function initChart() {
  if (!chartContainer.value || !chartWrapper.value) return
  
  // 准备图表选项
  const chartOptions: EnhancedChartOptions = {
    container: chartWrapper.value,
    width: chartWrapper.value.clientWidth,
    height: chartWrapper.value.clientHeight,
    virtualScroll: {
      enabled: props.virtualScroll,
      visibleRange: props.visibleRange,
      scrollStep: 10,
      overscanCount: 20
    },
    performance: {
      enableWebGL: props.performanceOptimization,
      throttleRedraw: 16,
      downSampleThreshold: 1000,
      downSampleFactor: 2,
      clipOutOfBounds: true,
      lazyUpdate: true,
      batchRendering: true,
      useRequestAnimationFrame: true
    },
    ...props.options
  }
  
  // 创建图表
  try {
    switch (props.type) {
      case 'candlestick':
        chart.value = enhancedChartRenderingService.renderEnhancedCandlestickChart(
          chartWrapper.value,
          props.data as StockData,
          chartOptions
        )
        break
      case 'line':
        chart.value = enhancedChartRenderingService.renderEnhancedLineChart(
          chartWrapper.value,
          props.data as number[] | Array<[number, number]>,
          chartOptions
        )
        break
      case 'multi':
        chart.value = enhancedChartRenderingService.renderEnhancedMultiSeriesChart(
          chartWrapper.value,
          props.data as ChartSeries[],
          chartOptions
        )
        break
      default:
        if (props.indicatorType && props.indicatorData) {
          chart.value = enhancedChartRenderingService.renderEnhancedTechnicalIndicator(
            chartWrapper.value,
            props.data as StockData,
            props.indicatorData,
            props.indicatorType,
            chartOptions
          )
        } else {
          // 默认为折线图
          chart.value = enhancedChartRenderingService.renderEnhancedLineChart(
            chartWrapper.value,
            props.data as number[] | Array<[number, number]>,
            chartOptions
          )
        }
    }
    
    // 获取数据长度和当前范围
    if (chart.value) {
      dataLength.value = chart.value.getDataLength()
      currentRange.value = chart.value.getVisibleRange()
      
      // 触发准备就绪事件
      emit('ready', chart.value)
    }
  } catch (error) {
    console.error('Failed to initialize chart:', error)
  }
}

function updateChartData(newData: any) {
  if (!chart.value) return
  
  // 更新图表数据
  chart.value.update(newData)
  
  // 更新数据长度和当前范围
  dataLength.value = chart.value.getDataLength()
  currentRange.value = chart.value.getVisibleRange()
}

function handleResize() {
  if (!chart.value || !chartWrapper.value) return
  
  // 调整图表大小
  chart.value.resize()
}

function scrollLeft() {
  if (!chart.value) return
  
  const [start, end] = currentRange.value
  const visibleCount = end - start
  const step = Math.max(1, Math.floor(visibleCount * 0.1)) // 滚动10%
  
  // 检查是否需要加载更多数据
  if (start <= 0) {
    emit('loadMore', 'left')
    return
  }
  
  // 滚动
  chart.value.scrollBy(-step)
  currentRange.value = chart.value.getVisibleRange()
  emit('scroll', currentRange.value)
}

function scrollRight() {
  if (!chart.value) return
  
  const [start, end] = currentRange.value
  const visibleCount = end - start
  const step = Math.max(1, Math.floor(visibleCount * 0.1)) // 滚动10%
  
  // 检查是否需要加载更多数据
  if (end >= dataLength.value) {
    emit('loadMore', 'right')
    return
  }
  
  // 滚动
  chart.value.scrollBy(step)
  currentRange.value = chart.value.getVisibleRange()
  emit('scroll', currentRange.value)
}

function zoomIn() {
  if (!chart.value) return
  
  const [start, end] = currentRange.value
  const visibleCount = end - start
  const newVisibleCount = Math.max(20, Math.floor(visibleCount * 0.8)) // 缩小20%
  const center = Math.floor((start + end) / 2)
  const newStart = Math.max(0, Math.floor(center - newVisibleCount / 2))
  const newEnd = Math.min(dataLength.value, newStart + newVisibleCount)
  
  // 更新缩放级别
  zoomLevel.value = zoomLevel.value * 1.25
  
  // 设置新的可见范围
  chart.value.setVisibleRange(newStart, newEnd)
  currentRange.value = chart.value.getVisibleRange()
  emit('zoom', zoomLevel.value)
}

function zoomOut() {
  if (!chart.value) return
  
  const [start, end] = currentRange.value
  const visibleCount = end - start
  const newVisibleCount = Math.min(dataLength.value, Math.floor(visibleCount * 1.25)) // 放大25%
  const center = Math.floor((start + end) / 2)
  const newStart = Math.max(0, Math.floor(center - newVisibleCount / 2))
  const newEnd = Math.min(dataLength.value, newStart + newVisibleCount)
  
  // 更新缩放级别
  zoomLevel.value = zoomLevel.value * 0.8
  
  // 设置新的可见范围
  chart.value.setVisibleRange(newStart, newEnd)
  currentRange.value = chart.value.getVisibleRange()
  emit('zoom', zoomLevel.value)
}

function handleWheel(event: WheelEvent) {
  if (!chart.value) return
  
  // 阻止默认行为
  event.preventDefault()
  
  // 根据滚轮方向滚动
  const step = Math.max(1, Math.floor((currentRange.value[1] - currentRange.value[0]) * 0.05)) // 滚动5%
  
  if (event.deltaY > 0) {
    // 向下滚动，向右移动
    chart.value.scrollBy(step)
  } else {
    // 向上滚动，向左移动
    chart.value.scrollBy(-step)
  }
  
  // 更新当前范围
  currentRange.value = chart.value.getVisibleRange()
  emit('scroll', currentRange.value)
}

function handleTrackClick(event: MouseEvent) {
  if (!chart.value || !scrollTrack.value || !scrollThumb.value) return
  
  // 如果点击的是滑块，不处理
  if (event.target === scrollThumb.value) return
  
  // 计算点击位置对应的数据索引
  const trackRect = scrollTrack.value.getBoundingClientRect()
  const clickPosition = (event.clientX - trackRect.left) / trackRect.width
  const targetIndex = Math.floor(clickPosition * dataLength.value)
  
  // 设置新的可见范围
  const visibleCount = currentRange.value[1] - currentRange.value[0]
  const newStart = Math.max(0, Math.min(targetIndex - Math.floor(visibleCount / 2), dataLength.value - visibleCount))
  const newEnd = Math.min(dataLength.value, newStart + visibleCount)
  
  chart.value.setVisibleRange(newStart, newEnd)
  currentRange.value = chart.value.getVisibleRange()
  emit('scroll', currentRange.value)
}

function startDragging(event: MouseEvent) {
  if (!scrollThumb.value) return
  
  // 开始拖动
  isDragging.value = true
  dragStartX.value = event.clientX
  dragStartPosition.value = currentRange.value[0]
  
  // 阻止默认行为和冒泡
  event.preventDefault()
  event.stopPropagation()
}

function handleMouseMove(event: MouseEvent) {
  if (!isDragging.value || !chart.value || !scrollTrack.value) return
  
  // 计算拖动距离
  const trackRect = scrollTrack.value.getBoundingClientRect()
  const dragDistance = event.clientX - dragStartX.value
  const dragRatio = dragDistance / trackRect.width
  const dataDragDistance = Math.floor(dragRatio * dataLength.value)
  
  // 计算新的起始位置
  const newStart = Math.max(0, Math.min(dragStartPosition.value + dataDragDistance, dataLength.value - (currentRange.value[1] - currentRange.value[0])))
  const newEnd = Math.min(dataLength.value, newStart + (currentRange.value[1] - currentRange.value[0]))
  
  // 设置新的可见范围
  chart.value.setVisibleRange(newStart, newEnd)
  currentRange.value = chart.value.getVisibleRange()
  emit('scroll', currentRange.value)
}

function handleMouseUp() {
  // 结束拖动
  isDragging.value = false
}

function handleTouchStart(event: TouchEvent) {
  if (!chart.value || event.touches.length !== 1) return
  
  // 记录触摸起始位置
  touchStartX.value = event.touches[0].clientX
  touchStartY.value = event.touches[0].clientY
  isTouchScrolling.value = false
}

function handleTouchMove(event: TouchEvent) {
  if (!chart.value || event.touches.length !== 1) return
  
  // 计算触摸移动距离
  const touchX = event.touches[0].clientX
  const touchY = event.touches[0].clientY
  const deltaX = touchX - touchStartX.value
  const deltaY = touchY - touchStartY.value
  
  // 判断是水平滚动还是垂直滚动
  if (!isTouchScrolling.value) {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      isTouchScrolling.value = true
      event.preventDefault() // 阻止默认行为（页面滚动）
    } else {
      return // 允许页面垂直滚动
    }
  } else {
    event.preventDefault() // 阻止默认行为
  }
  
  // 计算滚动步长
  const [start, end] = currentRange.value
  const visibleCount = end - start
  const step = Math.max(1, Math.floor(visibleCount * 0.01 * Math.abs(deltaX))) // 根据移动距离计算步长
  
  // 根据移动方向滚动
  if (deltaX < 0) {
    // 向左滑动，向右移动
    chart.value.scrollBy(step)
  } else {
    // 向右滑动，向左移动
    chart.value.scrollBy(-step)
  }
  
  // 更新触摸起始位置
  touchStartX.value = touchX
  touchStartY.value = touchY
  
  // 更新当前范围
  currentRange.value = chart.value.getVisibleRange()
  emit('scroll', currentRange.value)
}

function handleTouchEnd() {
  // 结束触摸滚动
  isTouchScrolling.value = false
}

// 暴露方法
defineExpose({
  // 获取图表实例
  getChart: () => chart.value,
  // 滚动到指定位置
  scrollTo: (index: number) => {
    if (!chart.value) return
    chart.value.scrollTo(index)
    currentRange.value = chart.value.getVisibleRange()
  },
  // 滚动指定步长
  scrollBy: (step: number) => {
    if (!chart.value) return
    chart.value.scrollBy(step)
    currentRange.value = chart.value.getVisibleRange()
  },
  // 设置可见范围
  setVisibleRange: (start: number, end: number) => {
    if (!chart.value) return
    chart.value.setVisibleRange(start, end)
    currentRange.value = chart.value.getVisibleRange()
  },
  // 获取当前可见范围
  getVisibleRange: () => currentRange.value,
  // 获取数据长度
  getDataLength: () => dataLength.value,
  // 缩放
  zoomIn,
  zoomOut,
  // 重新调整大小
  resize: () => {
    if (!chart.value) return
    chart.value.resize()
  }
})
</script>

<style scoped>
.virtual-scroll-chart {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.chart-wrapper {
  width: 100%;
  height: calc(100% - 30px); /* 减去滚动控制器的高度 */
}

.scroll-controls {
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 var(--spacing-sm);
  border-top: 1px solid var(--border-light);
}

.scroll-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.scroll-button:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
}

.scroll-track {
  position: relative;
  flex: 1;
  height: 6px;
  margin: 0 var(--spacing-sm);
  background: var(--bg-secondary);
  border-radius: 3px;
  cursor: pointer;
}

.scroll-thumb {
  position: absolute;
  top: -2px;
  height: 10px;
  background: var(--primary-color);
  border-radius: 5px;
  cursor: grab;
  transition: background var(--transition-fast);
}

.scroll-thumb:hover {
  background: var(--primary-dark);
}

.scroll-thumb:active {
  cursor: grabbing;
}

.zoom-controls {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.zoom-button {
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

.zoom-button:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.loading-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  z-index: 10;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-light);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>