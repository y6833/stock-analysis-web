<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  data: {
    type: Array,
    required: true
  }
})

const chartRef = ref(null)
let chart = null

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return
  
  // 如果已经存在图表实例，先销毁
  if (chart) {
    chart.dispose()
  }
  
  // 创建图表实例
  chart = echarts.init(chartRef.value)
  
  // 更新图表数据
  updateChart()
}

// 更新图表数据
const updateChart = () => {
  if (!chart || !props.data || props.data.length === 0) return
  
  // 提取数据
  const dates = props.data.map(item => item.date)
  const prices = props.data.map(item => item.price)
  const assets = props.data.map(item => item.totalAssets)
  
  // 找出买入和卖出点
  const buyPoints = []
  const sellPoints = []
  
  props.data.forEach((item, index) => {
    if (item.signal === 'buy') {
      buyPoints.push([index, item.price])
    } else if (item.signal === 'sell') {
      sellPoints.push([index, item.price])
    }
  })
  
  // 设置图表选项
  const option = {
    title: {
      text: '回测结果图表',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['价格', '资产'],
      top: 30
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      scale: true,
      boundaryGap: false,
      axisLine: { onZero: false },
      axisLabel: {
        formatter: (value) => {
          return value.substring(5) // 只显示月-日
        }
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '价格',
        position: 'left',
        axisLabel: {
          formatter: '{value} 元'
        }
      },
      {
        type: 'value',
        name: '资产',
        position: 'right',
        axisLabel: {
          formatter: '{value} 元'
        }
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100
      },
      {
        show: true,
        type: 'slider',
        top: '90%',
        start: 0,
        end: 100
      }
    ],
    series: [
      {
        name: '价格',
        type: 'line',
        data: prices,
        yAxisIndex: 0,
        symbol: 'none',
        lineStyle: {
          width: 1
        }
      },
      {
        name: '资产',
        type: 'line',
        data: assets,
        yAxisIndex: 1,
        symbol: 'none',
        lineStyle: {
          width: 1
        }
      },
      {
        name: '买入',
        type: 'scatter',
        data: buyPoints,
        yAxisIndex: 0,
        symbol: 'arrow',
        symbolSize: 10,
        itemStyle: {
          color: '#4CAF50'
        }
      },
      {
        name: '卖出',
        type: 'scatter',
        data: sellPoints,
        yAxisIndex: 0,
        symbol: 'arrow',
        symbolSize: 10,
        symbolRotate: 180,
        itemStyle: {
          color: '#F44336'
        }
      }
    ]
  }
  
  // 设置图表选项
  chart.setOption(option)
}

// 监听窗口大小变化
const handleResize = () => {
  if (chart) {
    chart.resize()
  }
}

// 监听数据变化
watch(() => props.data, () => {
  updateChart()
}, { deep: true })

// 组件挂载时初始化图表
onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

// 组件卸载时销毁图表
onUnmounted(() => {
  if (chart) {
    chart.dispose()
    chart = null
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div ref="chartRef" class="backtest-chart"></div>
</template>

<style scoped>
.backtest-chart {
  width: 100%;
  height: 400px;
}
</style>
