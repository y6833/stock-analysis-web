<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TrendLine } from '@/types/stock'

const props = defineProps<{
  chartInstance: any
  isActive: boolean
}>()

const emit = defineEmits<{
  (e: 'trendLineAdded', trendLine: TrendLine): void
  (e: 'trendLineRemoved', trendLineId: string): void
  (e: 'trendLineUpdated', trendLine: TrendLine): void
}>()

// 当前选中的工具
const selectedTool = ref<'line' | 'support' | 'resistance' | null>(null)

// 趋势线颜色选项
const colorOptions = [
  { id: 'red', value: '#e74c3c', name: '红色' },
  { id: 'green', value: '#2ecc71', name: '绿色' },
  { id: 'blue', value: '#3498db', name: '蓝色' },
  { id: 'orange', value: '#e67e22', name: '橙色' },
  { id: 'purple', value: '#9b59b6', name: '紫色' }
]

// 当前选中的颜色
const selectedColor = ref(colorOptions[0].value)

// 绘制状态
const isDrawing = ref(false)
const startPoint = ref<{ x: number, y: number } | null>(null)
const endPoint = ref<{ x: number, y: number } | null>(null)

// 当前绘制的趋势线
const currentTrendLine = ref<TrendLine | null>(null)

// 监听工具激活状态
watch(() => props.isActive, (newValue) => {
  if (!newValue) {
    // 如果工具被禁用，重置状态
    resetDrawingState()
  }
})

// 选择工具
const selectTool = (tool: 'line' | 'support' | 'resistance') => {
  selectedTool.value = tool
  
  // 设置鼠标样式
  if (props.chartInstance) {
    const dom = props.chartInstance.getDom()
    if (dom) {
      dom.style.cursor = 'crosshair'
    }
  }
}

// 选择颜色
const selectColor = (color: string) => {
  selectedColor.value = color
}

// 重置绘制状态
const resetDrawingState = () => {
  isDrawing.value = false
  startPoint.value = null
  endPoint.value = null
  currentTrendLine.value = null
  selectedTool.value = null
  
  // 恢复鼠标样式
  if (props.chartInstance) {
    const dom = props.chartInstance.getDom()
    if (dom) {
      dom.style.cursor = 'default'
    }
  }
}

// 初始化趋势线绘制
const initTrendLineDrawing = () => {
  if (!props.chartInstance) return
  
  const chartDom = props.chartInstance.getDom()
  if (!chartDom) return
  
  // 添加鼠标事件监听
  chartDom.addEventListener('mousedown', handleMouseDown)
  chartDom.addEventListener('mousemove', handleMouseMove)
  chartDom.addEventListener('mouseup', handleMouseUp)
  
  // 清理函数
  return () => {
    chartDom.removeEventListener('mousedown', handleMouseDown)
    chartDom.removeEventListener('mousemove', handleMouseMove)
    chartDom.removeEventListener('mouseup', handleMouseUp)
  }
}

// 处理鼠标按下事件
const handleMouseDown = (event: MouseEvent) => {
  if (!props.isActive || !selectedTool.value) return
  
  isDrawing.value = true
  
  // 获取鼠标在图表中的坐标
  const chartCoord = props.chartInstance.convertFromPixel({ seriesIndex: 0 }, [event.offsetX, event.offsetY])
  
  startPoint.value = {
    x: chartCoord[0],
    y: chartCoord[1]
  }
  
  // 创建临时趋势线
  currentTrendLine.value = {
    id: `trendline-${Date.now()}`,
    startIndex: Math.floor(chartCoord[0]),
    endIndex: Math.floor(chartCoord[0]),
    startValue: chartCoord[1],
    endValue: chartCoord[1],
    type: selectedTool.value === 'line' ? 'trend' : selectedTool.value,
    color: selectedColor.value
  }
  
  // 添加临时趋势线到图表
  updateChartTrendLine()
}

// 处理鼠标移动事件
const handleMouseMove = (event: MouseEvent) => {
  if (!isDrawing.value || !startPoint.value || !currentTrendLine.value) return
  
  // 获取鼠标在图表中的坐标
  const chartCoord = props.chartInstance.convertFromPixel({ seriesIndex: 0 }, [event.offsetX, event.offsetY])
  
  endPoint.value = {
    x: chartCoord[0],
    y: chartCoord[1]
  }
  
  // 更新临时趋势线
  currentTrendLine.value.endIndex = Math.floor(chartCoord[0])
  currentTrendLine.value.endValue = chartCoord[1]
  
  // 更新图表中的趋势线
  updateChartTrendLine()
}

// 处理鼠标松开事件
const handleMouseUp = (event: MouseEvent) => {
  if (!isDrawing.value || !startPoint.value || !currentTrendLine.value) return
  
  // 获取鼠标在图表中的坐标
  const chartCoord = props.chartInstance.convertFromPixel({ seriesIndex: 0 }, [event.offsetX, event.offsetY])
  
  endPoint.value = {
    x: chartCoord[0],
    y: chartCoord[1]
  }
  
  // 完成趋势线绘制
  currentTrendLine.value.endIndex = Math.floor(chartCoord[0])
  currentTrendLine.value.endValue = chartCoord[1]
  
  // 如果起点和终点相同或非常接近，则取消绘制
  if (Math.abs(currentTrendLine.value.startIndex - currentTrendLine.value.endIndex) < 2) {
    resetDrawingState()
    return
  }
  
  // 确保起点在左侧，终点在右侧
  if (currentTrendLine.value.startIndex > currentTrendLine.value.endIndex) {
    const tempIndex = currentTrendLine.value.startIndex
    const tempValue = currentTrendLine.value.startValue
    
    currentTrendLine.value.startIndex = currentTrendLine.value.endIndex
    currentTrendLine.value.startValue = currentTrendLine.value.endValue
    
    currentTrendLine.value.endIndex = tempIndex
    currentTrendLine.value.endValue = tempValue
  }
  
  // 通知父组件添加趋势线
  emit('trendLineAdded', { ...currentTrendLine.value })
  
  // 重置绘制状态
  resetDrawingState()
}

// 更新图表中的趋势线
const updateChartTrendLine = () => {
  if (!props.chartInstance || !currentTrendLine.value) return
  
  // 获取当前图表配置
  const option = props.chartInstance.getOption()
  
  // 检查是否已有标记系列
  let markLineIndex = -1
  option.series.forEach((series: any, index: number) => {
    if (series.id === 'temp-trendline') {
      markLineIndex = index
    }
  })
  
  // 创建趋势线数据
  const markLineData = [{
    name: currentTrendLine.value.type,
    coords: [
      [currentTrendLine.value.startIndex, currentTrendLine.value.startValue],
      [currentTrendLine.value.endIndex, currentTrendLine.value.endValue]
    ],
    lineStyle: {
      color: currentTrendLine.value.color,
      width: 2,
      type: currentTrendLine.value.type === 'trend' ? 'solid' : 'dashed'
    }
  }]
  
  // 如果已有标记系列，更新它
  if (markLineIndex !== -1) {
    option.series[markLineIndex].markLine.data = markLineData
  } else {
    // 否则添加新的标记系列
    option.series.push({
      id: 'temp-trendline',
      type: 'line',
      showSymbol: false,
      data: [],
      markLine: {
        silent: true,
        symbol: ['none', 'none'],
        data: markLineData
      }
    })
  }
  
  // 更新图表
  props.chartInstance.setOption(option)
}

// 清除所有趋势线
const clearAllTrendLines = () => {
  if (!props.chartInstance) return
  
  // 获取当前图表配置
  const option = props.chartInstance.getOption()
  
  // 移除所有趋势线系列
  option.series = option.series.filter((series: any) => 
    !series.id || (!series.id.startsWith('trendline-') && series.id !== 'temp-trendline')
  )
  
  // 更新图表
  props.chartInstance.setOption(option)
  
  // 通知父组件
  emit('trendLineRemoved', 'all')
}

// 初始化趋势线绘制
initTrendLineDrawing()
</script>

<template>
  <div class="trend-line-tools" v-if="isActive">
    <div class="tools-header">
      <h3>趋势线工具</h3>
      <button class="btn-close" @click="$emit('update:isActive', false)">×</button>
    </div>
    
    <div class="tools-content">
      <div class="tool-group">
        <div class="tool-group-title">选择工具</div>
        <div class="tool-buttons">
          <button 
            class="tool-button" 
            :class="{ active: selectedTool === 'line' }"
            @click="selectTool('line')"
            title="趋势线"
          >
            <span class="tool-icon">📈</span>
            <span class="tool-name">趋势线</span>
          </button>
          <button 
            class="tool-button" 
            :class="{ active: selectedTool === 'support' }"
            @click="selectTool('support')"
            title="支撑线"
          >
            <span class="tool-icon">📊</span>
            <span class="tool-name">支撑线</span>
          </button>
          <button 
            class="tool-button" 
            :class="{ active: selectedTool === 'resistance' }"
            @click="selectTool('resistance')"
            title="阻力线"
          >
            <span class="tool-icon">📉</span>
            <span class="tool-name">阻力线</span>
          </button>
        </div>
      </div>
      
      <div class="tool-group">
        <div class="tool-group-title">选择颜色</div>
        <div class="color-options">
          <button 
            v-for="color in colorOptions" 
            :key="color.id"
            class="color-option"
            :class="{ active: selectedColor === color.value }"
            :style="{ backgroundColor: color.value }"
            @click="selectColor(color.value)"
            :title="color.name"
          ></button>
        </div>
      </div>
      
      <div class="tool-actions">
        <button 
          class="btn btn-outline btn-sm"
          @click="resetDrawingState"
          :disabled="!selectedTool"
        >
          取消绘制
        </button>
        <button 
          class="btn btn-danger btn-sm"
          @click="clearAllTrendLines"
        >
          清除所有线条
        </button>
      </div>
      
      <div class="tool-instructions">
        <p>使用说明：</p>
        <ol>
          <li>选择一个绘制工具</li>
          <li>在图表上点击并拖动鼠标绘制线条</li>
          <li>松开鼠标完成绘制</li>
        </ol>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trend-line-tools {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-md);
  width: 250px;
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 100;
}

.tools-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
  background-color: var(--bg-secondary);
}

.tools-header h3 {
  margin: 0;
  font-size: var(--font-size-md);
  color: var(--primary-color);
}

.btn-close {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background-color: transparent;
  color: var(--text-secondary);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-close:hover {
  background-color: rgba(231, 76, 60, 0.1);
  color: var(--danger-color);
}

.tools-content {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.tool-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.tool-group-title {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-weight: 600;
}

.tool-buttons {
  display: flex;
  gap: var(--spacing-xs);
}

.tool-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-light);
  background-color: var(--bg-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex: 1;
}

.tool-button:hover {
  background-color: var(--bg-tertiary);
}

.tool-button.active {
  background-color: var(--primary-light);
  color: white;
  border-color: var(--primary-color);
}

.tool-icon {
  font-size: 18px;
  margin-bottom: var(--spacing-xs);
}

.tool-name {
  font-size: var(--font-size-xs);
}

.color-options {
  display: flex;
  gap: var(--spacing-sm);
}

.color-option {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--bg-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: var(--primary-color);
  transform: scale(1.1);
}

.tool-actions {
  display: flex;
  justify-content: space-between;
  margin-top: var(--spacing-sm);
}

.btn-sm {
  font-size: var(--font-size-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
}

.tool-instructions {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  background-color: var(--bg-secondary);
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-sm);
}

.tool-instructions p {
  margin: 0 0 var(--spacing-xs) 0;
  font-weight: 600;
}

.tool-instructions ol {
  margin: 0;
  padding-left: var(--spacing-md);
}
</style>
