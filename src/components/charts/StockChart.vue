<template>
  <div class="stock-chart">
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载图表数据...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <p class="error-message">{{ error }}</p>
      <button class="btn btn-primary" @click="loadChartData">重试</button>
    </div>

    <div v-else class="chart-wrapper">
      <div class="chart-controls">
        <div class="time-period-selector">
          <button
            v-for="period in timePeriods"
            :key="period.value"
            :class="['period-btn', { active: selectedPeriod === period.value }]"
            @click="changePeriod(period.value)"
          >
            {{ period.label }}
          </button>
        </div>
        <div class="chart-type-selector">
          <button
            v-for="type in chartTypes"
            :key="type.value"
            :class="['type-btn', { active: selectedChartType === type.value }]"
            @click="changeChartType(type.value)"
          >
            {{ type.label }}
          </button>
        </div>
      </div>
      <div ref="chartContainer" class="chart-container"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { stockService } from '@/services/stockService'
import { technicalIndicatorService } from '@/services/technicalIndicatorService'
import type { StockData } from '@/types/stock'

const props = defineProps<{
  symbol: string
  name?: string
}>()

// 状态
const isLoading = ref(true)
const error = ref<string | null>(null)
const chartContainer = ref<HTMLElement | null>(null)
const chart = ref<echarts.ECharts | null>(null)
const stockData = ref<StockData | null>(null)

// 图表配置
const selectedPeriod = ref('daily')
const selectedChartType = ref('candlestick')

const timePeriods = [
  { value: 'daily', label: '日K' },
  { value: 'weekly', label: '周K' },
  { value: 'monthly', label: '月K' }
]

const chartTypes = [
  { value: 'candlestick', label: 'K线图' },
  { value: 'line', label: '分时图' }
]

// 加载图表数据
const loadChartData = async () => {
  if (!props.symbol) return

  isLoading.value = true
  error.value = null

  try {
    console.log(`加载股票 ${props.symbol} 的图表数据`)
    const data = await stockService.getStockData(props.symbol)
    stockData.value = data
    
    await nextTick()
    initChart()
  } catch (err) {
    console.error('加载图表数据失败:', err)
    error.value = `加载图表数据失败: ${(err as Error).message || '未知错误'}`
  } finally {
    isLoading.value = false
  }
}

// 初始化图表
const initChart = () => {
  if (!chartContainer.value || !stockData.value) return

  // 销毁旧图表
  if (chart.value) {
    chart.value.dispose()
  }

  // 创建新图表
  chart.value = echarts.init(chartContainer.value)
  updateChart()

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
}

// 更新图表
const updateChart = () => {
  if (!chart.value || !stockData.value) return

  const data = stockData.value

  // 检查数据完整性
  if (!data.prices || data.prices.length === 0 || !data.dates || data.dates.length === 0) {
    error.value = '股票数据不完整'
    return
  }

  try {
    if (selectedChartType.value === 'candlestick') {
      renderCandlestickChart(data)
    } else {
      renderLineChart(data)
    }
  } catch (err) {
    console.error('更新图表失败:', err)
    error.value = '图表渲染失败'
  }
}

// 渲染K线图
const renderCandlestickChart = (data: StockData) => {
  if (!chart.value) return

  // 计算技术指标
  const sma5 = technicalIndicatorService.calculateSMA(data.prices, 5)
  const sma20 = technicalIndicatorService.calculateSMA(data.prices, 20)

  // 准备K线数据
  const candlestickData = []
  
  if (data.opens && data.closes && data.highs && data.lows) {
    // 使用OHLC数据
    for (let i = 0; i < data.dates.length; i++) {
      if (i < data.opens.length && i < data.closes.length && 
          i < data.lows.length && i < data.highs.length) {
        candlestickData.push([data.opens[i], data.closes[i], data.lows[i], data.highs[i]])
      }
    }
  } else {
    // 使用收盘价模拟
    for (let i = 0; i < data.prices.length; i++) {
      const price = data.prices[i]
      if (price !== undefined && !isNaN(price)) {
        candlestickData.push([
          price * 0.99, // 模拟开盘价
          price,        // 收盘价
          price * 0.98, // 最低价
          price * 1.01  // 最高价
        ])
      }
    }
  }

  const option = {
    title: {
      text: `${props.name || props.symbol} K线图`,
      left: 'center',
      textStyle: {
        color: '#333',
        fontSize: 16
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['K线', 'MA5', 'MA20'],
      bottom: 10
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: 80,
      top: 60,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.dates,
      scale: true,
      boundaryGap: false,
      axisLine: { onZero: false },
      splitLine: { show: false },
      axisLabel: {
        formatter: (value: string) => {
          return value.substring(5) // 只显示月-日
        }
      }
    },
    yAxis: {
      scale: true,
      splitLine: {
        show: true,
        lineStyle: {
          type: 'dashed'
        }
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
        bottom: 30,
        start: 50,
        end: 100
      }
    ],
    series: [
      {
        name: 'K线',
        type: 'candlestick',
        data: candlestickData,
        itemStyle: {
          color: '#e74c3c',
          color0: '#2ecc71',
          borderColor: '#e74c3c',
          borderColor0: '#2ecc71'
        }
      },
      {
        name: 'MA5',
        type: 'line',
        data: sma5,
        smooth: true,
        lineStyle: {
          width: 2,
          color: '#3498db'
        },
        symbol: 'none'
      },
      {
        name: 'MA20',
        type: 'line',
        data: sma20,
        smooth: true,
        lineStyle: {
          width: 2,
          color: '#9b59b6'
        },
        symbol: 'none'
      }
    ]
  }

  chart.value.setOption(option)
}

// 渲染分时图
const renderLineChart = (data: StockData) => {
  if (!chart.value) return

  const option = {
    title: {
      text: `${props.name || props.symbol} 分时图`,
      left: 'center',
      textStyle: {
        color: '#333',
        fontSize: 16
      }
    },
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: 60,
      top: 60,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.dates,
      axisLabel: {
        formatter: (value: string) => {
          return value.substring(5)
        }
      }
    },
    yAxis: {
      type: 'value',
      scale: true
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
        bottom: 10,
        start: 50,
        end: 100
      }
    ],
    series: [
      {
        name: '价格',
        type: 'line',
        data: data.prices,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          width: 2,
          color: '#42b983'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(66, 185, 131, 0.3)'
            },
            {
              offset: 1,
              color: 'rgba(66, 185, 131, 0.1)'
            }
          ])
        }
      }
    ]
  }

  chart.value.setOption(option)
}

// 切换时间周期
const changePeriod = (period: string) => {
  selectedPeriod.value = period
  loadChartData()
}

// 切换图表类型
const changeChartType = (type: string) => {
  selectedChartType.value = type
  updateChart()
}

// 处理窗口大小变化
const handleResize = () => {
  if (chart.value) {
    chart.value.resize()
  }
}

// 监听股票代码变化
watch(() => props.symbol, () => {
  if (props.symbol) {
    loadChartData()
  }
}, { immediate: true })

// 生命周期
onMounted(() => {
  if (props.symbol) {
    loadChartData()
  }
})

onUnmounted(() => {
  if (chart.value) {
    chart.value.dispose()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.stock-chart {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(66, 185, 131, 0.2);
  border-top: 3px solid #42b983;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: #e74c3c;
  margin-bottom: 10px;
}

.chart-wrapper {
  width: 100%;
  height: 100%;
}

.chart-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px;
  background-color: var(--bg-secondary);
  border-radius: 4px;
}

.time-period-selector,
.chart-type-selector {
  display: flex;
  gap: 5px;
}

.period-btn,
.type-btn {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.period-btn:hover,
.type-btn:hover {
  background-color: var(--bg-hover);
}

.period-btn.active,
.type-btn.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.chart-container {
  width: 100%;
  height: 400px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--primary-color-dark);
}
</style>
