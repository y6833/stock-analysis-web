<template>
  <div ref="chartContainer" :style="{ width, height }" class="chart-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  LegendComponent,
  ToolboxComponent,
} from 'echarts/components'
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'

// 注册必要的组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  LegendComponent,
  ToolboxComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
  BarChart,
  LineChart,
])

const props = defineProps({
  width: {
    type: String,
    default: '100%',
  },
  height: {
    type: String,
    default: '300px',
  },
  options: {
    type: Object,
    required: true,
  },
  autoResize: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['chartReady', 'chartClick', 'chartDataZoom'])

const chartContainer = ref<HTMLElement | null>(null)
const chart = ref<echarts.ECharts | null>(null)

// 初始化图表
const initChart = () => {
  if (!chartContainer.value) return

  // 创建图表实例
  chart.value = echarts.init(chartContainer.value)

  // 设置图表选项
  chart.value.setOption(props.options)

  // 添加事件监听
  chart.value.on('click', (params) => {
    emit('chartClick', params)
  })

  chart.value.on('datazoom', (params) => {
    emit('chartDataZoom', params)
  })

  // 通知图表已准备好
  emit('chartReady', chart.value)
}

// 监听选项变化
watch(
  () => props.options,
  (newOptions) => {
    if (chart.value) {
      chart.value.setOption(newOptions, true)
    }
  },
  { deep: true }
)

// 处理窗口大小变化
const handleResize = () => {
  if (chart.value) {
    chart.value.resize()
  }
}

onMounted(() => {
  initChart()

  // 添加窗口大小变化监听
  if (props.autoResize) {
    window.addEventListener('resize', handleResize)
  }
})

onBeforeUnmount(() => {
  // 销毁图表实例
  if (chart.value) {
    chart.value.dispose()
    chart.value = null
  }

  // 移除窗口大小变化监听
  if (props.autoResize) {
    window.removeEventListener('resize', handleResize)
  }
})

// 暴露图表实例
defineExpose({
  chart,
  resize: handleResize,
})
</script>

<style scoped>
.chart-container {
  position: relative;
}
</style>
