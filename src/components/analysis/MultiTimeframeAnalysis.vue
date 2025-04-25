<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import type { StockData, TimeFrame } from '@/types/stock'
import { stockService } from '@/services/stockService'
import { technicalIndicatorService } from '@/services/technicalIndicatorService'

const props = defineProps<{
  symbol: string
}>()

// 状态
const isLoading = ref(true)
const error = ref<string | null>(null)
const timeframes = ref<TimeFrame[]>(['day', 'week', 'month'])
const stockData = ref<Record<TimeFrame, StockData | null>>({
  day: null,
  week: null,
  month: null,
  year: null,
})
const chartInstances = ref<Record<TimeFrame, echarts.ECharts | null>>({
  day: null,
  week: null,
  month: null,
  year: null,
})
const chartRefs = ref<Record<TimeFrame, HTMLElement | null>>({
  day: null,
  week: null,
  month: null,
  year: null,
})

// 时间周期名称映射
const timeframeNames = {
  day: '日线',
  week: '周线',
  month: '月线',
  year: '年线',
}

// 加载股票数据
const loadStockData = async () => {
  isLoading.value = true
  error.value = null

  try {
    // 加载各个时间周期的数据
    const promises = timeframes.value.map(async (timeframe) => {
      try {
        // 这里应该调用后端API获取不同时间周期的数据
        // 由于目前没有实现这个API，我们使用模拟数据
        const data = await stockService.getStockData(props.symbol)

        if (!data) {
          throw new Error(`无法获取${props.symbol}的${timeframeNames[timeframe]}数据`)
        }

        // 根据时间周期处理数据
        const processedData = processDataByTimeframe(data, timeframe)
        stockData.value[timeframe] = processedData
      } catch (err) {
        console.error(`加载${timeframeNames[timeframe]}数据失败:`, err)
        stockData.value[timeframe] = null
      }
    })

    await Promise.all(promises)
  } catch (err) {
    console.error('加载多时间周期数据失败:', err)
    error.value = '加载数据失败，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

// 根据时间周期处理数据
const processDataByTimeframe = (data: StockData, timeframe: TimeFrame): StockData => {
  // 这里应该根据时间周期处理数据
  // 由于目前没有实际的不同时间周期数据，我们使用模拟数据

  // 复制原始数据
  const result: StockData = { ...data }

  // 根据时间周期调整数据点数量
  let interval = 1
  switch (timeframe) {
    case 'week':
      interval = 5
      break
    case 'month':
      interval = 20
      break
    case 'year':
      interval = 240
      break
  }

  // 简化处理：每隔interval个点取一个点
  result.dates = data.dates.filter((_, i) => i % interval === 0)
  result.prices = data.prices.filter((_, i) => i % interval === 0)
  result.volumes = data.volumes.filter((_, i) => i % interval === 0)

  // 计算OHLC数据
  if (timeframe !== 'day') {
    result.highs = []
    result.lows = []
    result.opens = []
    result.closes = []

    for (let i = 0; i < data.prices.length; i += interval) {
      const chunk = data.prices.slice(i, i + interval)
      if (chunk.length > 0) {
        result.opens!.push(chunk[0])
        result.closes!.push(chunk[chunk.length - 1])
        result.highs!.push(Math.max(...chunk))
        result.lows!.push(Math.min(...chunk))
      }
    }
  }

  return result
}

// 初始化图表
const initCharts = () => {
  timeframes.value.forEach((timeframe) => {
    if (chartRefs.value[timeframe] && stockData.value[timeframe]) {
      // 销毁旧图表
      if (chartInstances.value[timeframe]) {
        chartInstances.value[timeframe]!.dispose()
      }

      // 创建新图表
      chartInstances.value[timeframe] = echarts.init(chartRefs.value[timeframe]!)

      // 设置图表选项
      updateChart(timeframe)
    }
  })
}

// 更新图表
const updateChart = (timeframe: TimeFrame) => {
  console.log(`更新${timeframeNames[timeframe]}图表`)

  if (!chartInstances.value[timeframe]) {
    console.warn(`${timeframeNames[timeframe]}图表实例不存在`)
    return
  }

  if (!stockData.value[timeframe]) {
    console.warn(`${timeframeNames[timeframe]}数据不存在`)
    return
  }

  const data = stockData.value[timeframe]!

  // 检查数据完整性
  if (!data.prices || data.prices.length === 0 || !data.dates || data.dates.length === 0) {
    console.warn(`${timeframeNames[timeframe]}价格数据不完整`)
    return
  }

  try {
    // 计算技术指标
    const sma5 = technicalIndicatorService.calculateSMA(data.prices, 5)
    const sma20 = technicalIndicatorService.calculateSMA(data.prices, 20)

    if (!sma5.length || !sma20.length) {
      console.warn(`${timeframeNames[timeframe]}技术指标计算结果为空`)
      return
    }

    // 准备K线图数据
    const candlestickData = []

    if (timeframe !== 'day' && data.opens && data.closes && data.highs && data.lows) {
      // 使用OHLC数据
      for (let i = 0; i < data.dates.length; i++) {
        if (
          i < data.opens.length &&
          i < data.closes.length &&
          i < data.lows.length &&
          i < data.highs.length
        ) {
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
            price, // 收盘价
            price * 0.98, // 最低价
            price * 1.01, // 最高价
          ])
        }
      }
    }

    if (candlestickData.length === 0) {
      console.warn(`${timeframeNames[timeframe]}K线数据为空`)
      return
    }

    // 设置图表选项
    const option = {
      title: {
        text: `${props.symbol} ${timeframeNames[timeframe]}`,
        left: 'center',
        textStyle: {
          color: '#333',
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
      },
      legend: {
        data: ['K线', 'MA5', 'MA20'],
        bottom: 10,
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
        scale: true,
        boundaryGap: false,
        axisLine: { onZero: false },
        splitLine: { show: false },
        axisLabel: {
          formatter: (value: string) => {
            // 简化日期显示
            return value.substring(5) // 只显示月-日
          },
        },
        min: 'dataMin',
        max: 'dataMax',
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
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: candlestickData,
          itemStyle: {
            color: '#e74c3c', // 阳线颜色
            color0: '#2ecc71', // 阴线颜色
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
        },
      ],
    }

    console.log(`设置${timeframeNames[timeframe]}图表选项`)
    chartInstances.value[timeframe]!.setOption(option)
    console.log(`${timeframeNames[timeframe]}图表更新完成`)
  } catch (error) {
    console.error(`更新${timeframeNames[timeframe]}图表失败:`, error)
  }
}

// 监听窗口大小变化
const handleResize = () => {
  timeframes.value.forEach((timeframe) => {
    chartInstances.value[timeframe]?.resize()
  })
}

// 监听股票代码变化
watch(
  () => props.symbol,
  async () => {
    await loadStockData()
    initCharts()
  }
)

// 组件挂载时加载数据
onMounted(async () => {
  await loadStockData()
  initCharts()

  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize)
})

// 组件卸载时清理
onUnmounted(() => {
  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleResize)

  // 销毁所有图表实例
  timeframes.value.forEach((timeframe) => {
    if (chartInstances.value[timeframe]) {
      chartInstances.value[timeframe]!.dispose()
    }
  })
})
</script>

<template>
  <div class="multi-timeframe-analysis">
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载多时间周期数据...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="loadStockData">重试</button>
    </div>

    <div v-else class="charts-container">
      <div v-for="timeframe in timeframes" :key="timeframe" class="chart-wrapper">
        <div :ref="(el) => (chartRefs[timeframe] = el)" class="chart"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.multi-timeframe-analysis {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--spacing-md);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(66, 185, 131, 0.2);
  border-top: 4px solid var(--accent-color);
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

.charts-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: var(--spacing-md);
  height: 100%;
  width: 100%;
}

.chart-wrapper {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
  height: 100%;
  min-height: 300px;
}

.chart {
  width: 100%;
  height: 100%;
}

@media (max-width: 768px) {
  .charts-container {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(4, 1fr);
  }
}
</style>
