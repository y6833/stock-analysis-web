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
          <button v-for="period in timePeriods" :key="period.value"
            :class="['period-btn', { active: selectedPeriod === period.value }]" @click="changePeriod(period.value)">
            {{ period.label }}
          </button>
        </div>
        <div class="chart-type-selector">
          <button v-for="type in chartTypes" :key="type.value"
            :class="['type-btn', { active: selectedChartType === type.value }]" @click="changeChartType(type.value)">
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
  { value: 'monthly', label: '月K' },
]

const chartTypes = [
  { value: 'candlestick', label: 'K线图' },
  { value: 'line', label: '分时图' },
]

// 加载图表数据
const loadChartData = async () => {
  if (!props.symbol) return

  isLoading.value = true
  error.value = null

  try {
    console.log(`加载股票 ${props.symbol} 的图表数据`)

    // 根据选择的时间周期确定天数
    let days = 30
    switch (selectedPeriod.value) {
      case 'daily':
        days = 30
        break
      case 'weekly':
        days = 90
        break
      case 'monthly':
        days = 365
        break
    }

    // 使用新的图表数据方法
    const data = await stockService.getStockChartData(props.symbol, days)
    stockData.value = data

    console.log(`股票 ${props.symbol} 图表数据加载成功:`, {
      dates: data.dates?.length || 0,
      prices: data.prices?.length || 0,
      source: data.source_type
    })

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

  // 字段兼容处理
  const opens = data.opens || data.open || []
  const closes = data.closes || data.close || []
  const highs = data.highs || data.high || []
  const lows = data.lows || data.low || []
  const prices = data.prices || closes || []

  // 计算技术指标，确保返回有效数组
  const sma5 = (() => {
    try {
      const result = technicalIndicatorService.calculateSMA(prices, 5)
      return Array.isArray(result) ? result : []
    } catch (error) {
      console.warn('SMA5 calculation failed:', error)
      return []
    }
  })()

  const sma20 = (() => {
    try {
      const result = technicalIndicatorService.calculateSMA(prices, 20)
      return Array.isArray(result) ? result : []
    } catch (error) {
      console.warn('SMA20 calculation failed:', error)
      return []
    }
  })()

  const ema12 = (() => {
    try {
      const result = technicalIndicatorService.calculateEMA(prices, 12)
      return Array.isArray(result) ? result : []
    } catch (error) {
      console.warn('EMA12 calculation failed:', error)
      return []
    }
  })()

  const ema50 = (() => {
    try {
      const result = technicalIndicatorService.calculateEMA(prices, 50)
      return Array.isArray(result) ? result : []
    } catch (error) {
      console.warn('EMA50 calculation failed:', error)
      return []
    }
  })()

  // 计算KDJ+MACD双优化指标
  const kdjMacd = (() => {
    try {
      const result = technicalIndicatorService.calculateKDJMACDOptimized(highs, lows, closes)
      return result && result.optimizedSignal ? result : { optimizedSignal: [] }
    } catch (error) {
      console.warn('KDJ+MACD calculation failed:', error)
      return { optimizedSignal: [] }
    }
  })()

  // 检测高低点和绘制趋势线
  const { highs: highPoints, lows: lowPoints } = technicalIndicatorService.detectHighLowPoints(
    prices
  ) || { highs: [], lows: [] }
  const { lines } = technicalIndicatorService.drawTrendLines(
    prices,
    data.dates,
    highPoints,
    lowPoints
  ) || { lines: [] }

  // 准备K线数据
  const candlestickData = []

  if (opens.length && closes.length && highs.length && lows.length) {
    // 使用OHLC数据
    for (let i = 0; i < data.dates.length; i++) {
      if (i < opens.length && i < closes.length && i < lows.length && i < highs.length) {
        candlestickData.push([opens[i], closes[i], lows[i], highs[i]])
      }
    }
  } else {
    // 使用收盘价模拟
    for (let i = 0; i < prices.length; i++) {
      const price = prices[i]
      if (price !== undefined && !isNaN(price)) {
        candlestickData.push([
          price * 0.99, // 模拟开盘价
          price, // 收盘价
          price * 0.98, // 最低价
          price * 1.01, // 最高价
        ])
      }
    }
  }

  // 构建所有 series
  const allSeries = [
    {
      name: 'K线',
      type: 'candlestick',
      data: candlestickData,
      itemStyle: {
        color: '#e74c3c',
        color0: '#2ecc71',
        borderColor: '#e74c3c',
        borderColor0: '#2ecc71',
      },
    },
    {
      name: 'MA5',
      type: 'line',
      data: sma5,
      smooth: true,
      lineStyle: {
        width: 2,
        color: '#3498db',
      },
      symbol: 'none',
    },
    {
      name: 'MA20',
      type: 'line',
      data: sma20,
      smooth: true,
      lineStyle: {
        width: 2,
        color: '#9b59b6',
      },
      symbol: 'none',
    },
    {
      name: 'EMA12',
      type: 'line',
      data: ema12,
      smooth: true,
      lineStyle: {
        width: 2,
        color: '#FFD700',
      },
      symbol: 'none',
    },
    {
      name: 'EMA50',
      type: 'line',
      data: ema50,
      smooth: true,
      lineStyle: {
        width: 2,
        color: '#1E90FF',
      },
      symbol: 'none',
    },
    // KDJ+MACD指标
    {
      name: 'KDJ+MACD',
      type: 'line',
      data: Array.isArray(kdjMacd.optimizedSignal) ? kdjMacd.optimizedSignal : [],
      smooth: true,
      lineStyle: {
        width: 2,
        color: '#FF00FF',
      },
      symbol: 'none',
      markLine: {
        silent: true,
        data: [
          {
            yAxis: 0,
            lineStyle: {
              color: '#888',
              type: 'dashed',
            },
          },
        ],
      },
    },
    // 趋势线
    ...(Array.isArray(lines)
      ? lines.map((line, idx) =>
        line && line.from && line.to && line.color
          ? {
            name: line.color === '#00FF00' ? '上升趋势' : '下降趋势',
            type: 'line',
            data: [
              { value: line.from.value, coord: [line.from.date, line.from.value] },
              { value: line.to.value, coord: [line.to.date, line.to.value] },
            ],
            symbol: ['none', 'none'],
            lineStyle: {
              color: line.color,
              width: 2,
              type: 'dashed',
            },
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: {
                color: line.color,
                width: 2,
                type: 'dashed',
              },
              data: [
                {
                  coord: [line.from.date, line.from.value],
                  label: {
                    show: false,
                  },
                },
                {
                  coord: [line.to.date, line.to.value],
                  label: {
                    show: false,
                  },
                },
              ],
            },
          }
          : null
      )
      : []),
  ]

  // 只保留有效 series，确保每个series都有必要的属性
  const validSeries = allSeries.filter((s) => {
    if (!s || !s.type || !s.name) {
      console.warn('Invalid series found:', s)
      return false
    }
    // 确保data是数组
    if (s.data && !Array.isArray(s.data)) {
      console.warn('Series data is not an array:', s.name, s.data)
      return false
    }
    return true
  })

  const option = {
    title: {
      text: `${props.name || props.symbol} K线图`,
      left: 'center',
      textStyle: {
        color: '#333',
        fontSize: 16,
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
    },
    legend: {
      data: ['K线', 'MA5', 'MA20', 'EMA12', 'EMA50', 'KDJ+MACD', '上升趋势', '下降趋势'],
      bottom: 10,
      itemGap: 10,
      textStyle: {
        color: '#333',
      },
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: 80,
      top: 60,
      containLabel: true,
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
        },
      },
    },
    yAxis: {
      scale: true,
      splitLine: {
        show: true,
        lineStyle: {
          type: 'dashed',
        },
      },
    },
    dataZoom: [
      {
        type: 'inside',
        start: 50,
        end: 100,
      },
      {
        show: true,
        type: 'slider',
        bottom: 30,
        start: 50,
        end: 100,
      },
    ],
    series: validSeries,
  }

  // 验证option是否有效
  if (!option.series || !Array.isArray(option.series)) {
    console.error('Invalid series in option:', option.series)
    return
  }

  // 验证每个series
  for (const series of option.series) {
    if (!series.type) {
      console.error('Series missing type:', series)
      return
    }
  }

  try {
    chart.value.setOption(option, true) // 使用notMerge=true确保完全替换
  } catch (error) {
    console.error('ECharts setOption failed:', error)
  }
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
        fontSize: 16,
      },
    },
    tooltip: {
      trigger: 'axis',
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: 60,
      top: 60,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.dates,
      axisLabel: {
        formatter: (value: string) => {
          return value.substring(5)
        },
      },
    },
    yAxis: {
      type: 'value',
      scale: true,
    },
    dataZoom: [
      {
        type: 'inside',
        start: 50,
        end: 100,
      },
      {
        show: true,
        type: 'slider',
        bottom: 10,
        start: 50,
        end: 100,
      },
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
          color: '#42b983',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(66, 185, 131, 0.3)',
            },
            {
              offset: 1,
              color: 'rgba(66, 185, 131, 0.1)',
            },
          ]),
        },
      },
    ],
  }

  try {
    chart.value.setOption(option, true)
  } catch (error) {
    console.error('ECharts setOption failed for line chart:', error)
  }
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
watch(
  () => props.symbol,
  () => {
    if (props.symbol) {
      loadChartData()
    }
  },
  { immediate: true }
)

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
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
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
