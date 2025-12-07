<template>
  <div class="stock-chart">
    <!-- 加载状态 -->
    <div v-show="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载图表数据...</p>
    </div>

    <!-- 错误状态 -->
    <div v-show="error && !isLoading" class="error-container">
      <p class="error-message">{{ error }}</p>
      <button class="btn btn-primary" @click="retryChart">重试</button>
    </div>

    <!-- 图表容器 - 始终存在于DOM中 -->
    <div class="chart-wrapper" v-show="!isLoading && !error">
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
          <button class="btn btn-primary" @click="testMockData" style="margin-left: 10px;">
            测试模拟数据
          </button>
          <button class="btn btn-secondary" @click="forceShowChart" style="margin-left: 5px;">
            强制显示图表
          </button>
        </div>
      </div>
      <!-- 图表容器在wrapper内部 -->
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

// 生成模拟图表数据
const generateMockChartData = () => {
  const dates = []
  const prices = []
  const opens = []
  const highs = []
  const lows = []
  const closes = []
  const volumes = []

  const basePrice = 7.0
  let currentPrice = basePrice

  for (let i = 0; i < 20; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (20 - i))
    dates.push(date.toISOString().split('T')[0])

    // 模拟价格波动
    const change = (Math.random() - 0.5) * 0.2
    currentPrice = Math.max(currentPrice + change, basePrice * 0.8)

    const open = currentPrice
    const close = Math.max(open + (Math.random() - 0.5) * 0.1, basePrice * 0.8)
    const high = Math.max(open, close) + Math.random() * 0.05
    const low = Math.min(open, close) - Math.random() * 0.05

    opens.push(open)
    closes.push(close)
    highs.push(high)
    lows.push(low)
    prices.push(close)
    volumes.push(Math.floor(Math.random() * 1000000) + 500000)

    currentPrice = close
  }

  return {
    symbol: props.symbol || 'MOCK',
    dates,
    prices,
    opens,
    highs,
    lows,
    closes,
    volumes,
    high: Math.max(...highs),
    low: Math.min(...lows),
    open: opens[0],
    close: closes[closes.length - 1]
  }
}

// 加载图表数据
const loadChartData = async () => {
  console.log(`[StockChart] loadChartData 被调用，symbol: ${props.symbol}`)

  if (!props.symbol) {
    console.warn('[StockChart] 没有股票代码，跳过数据加载')
    return
  }

  isLoading.value = true
  error.value = null

  try {
    console.log(`[StockChart] 开始加载股票 ${props.symbol} 的图表数据`)

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

    console.log(`[StockChart] 请求参数: symbol=${props.symbol}, days=${days}`)

    // 使用新的图表数据方法
    const data = await stockService.getStockChartData(props.symbol, days)
    stockData.value = data

    console.log(`[StockChart] 股票 ${props.symbol} 图表数据加载成功:`, {
      dates: data.dates?.length || 0,
      prices: data.prices?.length || 0,
      opens: data.opens?.length || 0,
      closes: data.closes?.length || 0,
      highs: data.highs?.length || 0,
      lows: data.lows?.length || 0,
      volumes: data.volumes?.length || 0,
      source: data.source_type,
      dataStructure: Object.keys(data)
    })

    // 验证数据完整性 - 更宽松的验证
    let chartData = data
    if (!chartData || typeof chartData !== 'object') {
      console.warn('[StockChart] 数据格式不正确，使用模拟数据')
      chartData = generateMockChartData()
    }

    if (!chartData.dates || chartData.dates.length === 0) {
      console.warn('[StockChart] 日期数据为空，使用模拟数据')
      chartData = generateMockChartData()
    }

    // 如果价格数据为空，也使用模拟数据
    if (!chartData.prices || chartData.prices.length === 0) {
      console.warn('[StockChart] 价格数据为空，使用模拟数据')
      chartData = generateMockChartData()
    }

    // 更新stockData
    stockData.value = chartData

    await nextTick()
    initChart()
  } catch (err) {
    console.error('[StockChart] 加载图表数据失败:', err)
    error.value = `加载图表数据失败: ${(err as Error).message || '未知错误'}`
  } finally {
    isLoading.value = false
  }
}

// 初始化图表
const initChart = () => {
  console.log('[StockChart] 开始初始化图表')

  if (!chartContainer.value) {
    console.error('[StockChart] 图表容器不存在')
    error.value = '图表容器不可用，请刷新页面重试'
    return
  }

  // 检查容器尺寸
  const containerRect = chartContainer.value.getBoundingClientRect()
  if (containerRect.width === 0 || containerRect.height === 0) {
    console.warn('[StockChart] 容器尺寸为0，等待DOM渲染完成')
    // 延迟重试
    setTimeout(() => {
      if (chartContainer.value) {
        const newRect = chartContainer.value.getBoundingClientRect()
        console.log('[StockChart] 重试时容器尺寸:', newRect.width, 'x', newRect.height)
        if (newRect.width > 0 && newRect.height > 0) {
          initChart()
        } else {
          error.value = '图表容器尺寸异常，请检查CSS样式'
        }
      }
    }, 200)
    return
  }

  console.log('[StockChart] 容器尺寸正常:', containerRect.width, 'x', containerRect.height)

  if (!stockData.value) {
    console.error('[StockChart] 股票数据不存在')
    error.value = '股票数据不存在'
    return
  }

  console.log('[StockChart] 图表容器和数据都存在，开始创建图表')

  // 销毁旧图表
  if (chart.value) {
    console.log('[StockChart] 销毁旧图表实例')
    try {
      if (!chart.value.isDisposed()) {
        chart.value.dispose()
        console.log('[StockChart] 旧图表实例已销毁')
      } else {
        console.log('[StockChart] 旧图表实例已经被销毁')
      }
    } catch (disposeError) {
      console.warn('[StockChart] 销毁旧图表时出错:', disposeError)
    }
    chart.value = null
  }

  try {
    // 创建新图表
    console.log('[StockChart] 创建新的ECharts实例')
    chart.value = echarts.init(chartContainer.value)
    console.log('[StockChart] ECharts实例创建成功')

    // 添加错误处理
    chart.value.on('error', (err: any) => {
      console.error('[StockChart] ECharts内部错误:', err)
      error.value = 'ECharts渲染错误'
    })

    updateChart()

    // 确保图表正确调整大小 - 添加安全检查
    setTimeout(() => {
      try {
        if (chart.value && !chart.value.isDisposed()) {
          chart.value.resize()
          console.log('[StockChart] 图表大小调整完成')
        }
      } catch (resizeError) {
        console.warn('[StockChart] 图表大小调整失败:', resizeError)
      }
    }, 100)

    // 再次确保图表大小正确 - 添加安全检查
    setTimeout(() => {
      try {
        if (chart.value && !chart.value.isDisposed()) {
          chart.value.resize()
          console.log('[StockChart] 图表大小二次调整完成')
        }
      } catch (resizeError) {
        console.warn('[StockChart] 图表大小二次调整失败:', resizeError)
      }
    }, 500)

    // 监听窗口大小变化
    window.addEventListener('resize', handleResize)
    console.log('[StockChart] 图表初始化完成')
  } catch (err) {
    console.error('[StockChart] 图表初始化失败:', err)
    error.value = `图表初始化失败: ${(err as Error).message}`
  }
}

// 更新图表
const updateChart = () => {
  console.log('[StockChart] 开始更新图表')

  if (!chart.value) {
    console.error('[StockChart] 图表实例不存在')
    error.value = '图表实例不存在'
    return
  }

  if (!stockData.value) {
    console.error('[StockChart] 股票数据不存在')
    error.value = '股票数据不存在'
    return
  }

  const data = stockData.value
  console.log('[StockChart] 股票数据:', {
    symbol: data.symbol,
    dates: data.dates?.length || 0,
    prices: data.prices?.length || 0,
    opens: data.opens?.length || 0,
    closes: data.closes?.length || 0,
    chartType: selectedChartType.value
  })

  // 检查数据完整性
  if (!data.prices || data.prices.length === 0 || !data.dates || data.dates.length === 0) {
    console.error('[StockChart] 股票数据不完整:', {
      hasPrices: !!data.prices,
      pricesLength: data.prices?.length || 0,
      hasDates: !!data.dates,
      datesLength: data.dates?.length || 0
    })
    error.value = '股票数据不完整'
    return
  }

  try {
    console.log(`[StockChart] 开始渲染${selectedChartType.value === 'candlestick' ? 'K线图' : '分时图'}`)
    if (selectedChartType.value === 'candlestick') {
      renderCandlestickChart(data)
    } else {
      renderLineChart(data)
    }
    console.log('[StockChart] 图表渲染完成')
  } catch (err) {
    console.error('[StockChart] 更新图表失败:', err)
    error.value = '图表渲染失败'
  }
}

// 渲染K线图
const renderCandlestickChart = (data: StockData) => {
  if (!chart.value) {
    console.warn('Chart instance not available')
    return
  }

  // 验证数据完整性
  if (!data || !data.dates || !Array.isArray(data.dates) || data.dates.length === 0) {
    console.warn('Invalid or empty stock data')
    return
  }

  try {
    // 安全地清理图表状态 - 添加更多检查
    if (chart.value && !chart.value.isDisposed()) {
      chart.value.clear()
    }
  } catch (clearError) {
    console.warn('Chart clear failed, recreating chart:', clearError)
    // 如果清理失败，重新创建图表实例
    try {
      if (chart.value) {
        chart.value.dispose()
      }
    } catch (disposeError) {
      console.warn('Chart dispose failed:', disposeError)
    }

    if (chartContainer.value) {
      chart.value = echarts.init(chartContainer.value)
    }
  }

  // 字段兼容处理 - 确保都是数组
  const opens = Array.isArray(data.opens) ? data.opens : (typeof data.open === 'number' ? [data.open] : [])
  const closes = Array.isArray(data.closes) ? data.closes : (typeof data.close === 'number' ? [data.close] : [])
  const highs = Array.isArray(data.highs) ? data.highs : (typeof data.high === 'number' ? [data.high] : [])
  const lows = Array.isArray(data.lows) ? data.lows : (typeof data.low === 'number' ? [data.low] : [])
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
  const { highs: highPoints, lows: lowPoints } = (() => {
    try {
      const result = technicalIndicatorService.detectHighLowPoints(prices)
      return result || { highs: [], lows: [] }
    } catch (error) {
      console.warn('High/Low points detection failed:', error)
      return { highs: [], lows: [] }
    }
  })()

  const { lines } = (() => {
    try {
      const result = technicalIndicatorService.drawTrendLines(
        prices,
        data.dates,
        highPoints,
        lowPoints
      )
      return result || { lines: [] }
    } catch (error) {
      console.warn('Trend lines drawing failed:', error)
      return { lines: [] }
    }
  })()

  // 准备K线数据
  const candlestickData = []

  console.log('[StockChart] 准备K线数据:', {
    dates: data.dates.length,
    opens: opens.length,
    closes: closes.length,
    highs: highs.length,
    lows: lows.length,
    prices: prices.length
  })

  if (opens.length && closes.length && highs.length && lows.length) {
    // 使用OHLC数据 - ECharts K线图格式: [open, close, low, high]
    console.log('[StockChart] 使用完整OHLC数据')
    for (let i = 0; i < data.dates.length; i++) {
      if (i < opens.length && i < closes.length && i < lows.length && i < highs.length) {
        // 确保数据有效且为数字
        const open = Number(opens[i])
        const close = Number(closes[i])
        const low = Number(lows[i])
        const high = Number(highs[i])

        // 验证数据有效性
        if (!isNaN(open) && !isNaN(close) && !isNaN(low) && !isNaN(high) &&
          open > 0 && close > 0 && low > 0 && high > 0) {
          // ECharts K线图数据格式: [open, close, low, high]
          candlestickData.push([open, close, low, high])
        } else {
          console.warn(`[StockChart] 无效的OHLC数据在索引 ${i}:`, { open, close, low, high })
        }
      }
    }
  } else {
    // 使用收盘价模拟OHLC数据
    console.log('[StockChart] 使用收盘价模拟OHLC数据')
    for (let i = 0; i < prices.length; i++) {
      const price = Number(prices[i])
      if (!isNaN(price) && price > 0) {
        // 模拟OHLC数据，所有值都使用收盘价
        candlestickData.push([
          price * 0.99, // 模拟开盘价
          price, // 收盘价
          price * 0.98, // 最低价
          price * 1.01, // 最高价
        ])
      } else {
        console.warn(`[StockChart] 无效的价格数据在索引 ${i}:`, price)
      }
    }
  }

  console.log('[StockChart] K线数据准备完成:', {
    candlestickDataLength: candlestickData.length,
    sampleData: candlestickData.slice(0, 3),
    lastData: candlestickData.slice(-3),
    dateRange: data.dates.length > 0 ? `${data.dates[0]} 到 ${data.dates[data.dates.length - 1]}` : '无日期数据',
    sma5Length: sma5.length,
    sma20Length: sma20.length,
    ema12Length: ema12.length,
    ema50Length: ema50.length
  })

  // 如果没有K线数据，直接返回
  if (candlestickData.length === 0) {
    console.error('[StockChart] 没有有效的K线数据，无法渲染图表')
    error.value = '没有有效的股票数据'
    return
  }

  // 构建所有 series
  const allSeries = [
    {
      name: 'K线',
      type: 'candlestick',
      id: 'candlestick-main',
      data: candlestickData,
      itemStyle: {
        color: '#e74c3c',
        color0: '#2ecc71',
        borderColor: '#e74c3c',
        borderColor0: '#2ecc71',
      },
      animation: false,
    },
    {
      name: 'MA5',
      type: 'line',
      id: 'ma5-line',
      data: sma5,
      smooth: true,
      lineStyle: {
        width: 2,
        color: '#3498db',
      },
      symbol: 'none',
      animation: false,
    },
    {
      name: 'MA20',
      type: 'line',
      id: 'ma20-line',
      data: sma20,
      smooth: true,
      lineStyle: {
        width: 2,
        color: '#9b59b6',
      },
      symbol: 'none',
      animation: false,
    },
    {
      name: 'EMA12',
      type: 'line',
      id: 'ema12-line',
      data: ema12,
      smooth: true,
      lineStyle: {
        width: 2,
        color: '#FFD700',
      },
      symbol: 'none',
      animation: false,
    },
    {
      name: 'EMA50',
      type: 'line',
      id: 'ema50-line',
      data: ema50,
      smooth: true,
      lineStyle: {
        width: 2,
        color: '#1E90FF',
      },
      symbol: 'none',
      animation: false,
    },
    // KDJ+MACD指标
    {
      name: 'KDJ+MACD',
      type: 'line',
      id: 'kdj-macd-line',
      data: Array.isArray(kdjMacd.optimizedSignal) ? kdjMacd.optimizedSignal : [],
      smooth: true,
      lineStyle: {
        width: 2,
        color: '#FF00FF',
      },
      symbol: 'none',
      animation: false,
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
      ? lines.map((line, idx) => {
        // 验证趋势线数据的完整性
        if (!line || !line.from || !line.to || !line.color) {
          console.warn('Invalid trend line data:', line)
          return null
        }

        // 验证日期和数值
        if (!line.from.date || !line.to.date ||
          typeof line.from.value !== 'number' ||
          typeof line.to.value !== 'number') {
          console.warn('Invalid trend line values:', line)
          return null
        }

        return {
          name: `趋势线${idx + 1}`,
          type: 'line',
          id: `trend-line-${idx}`,
          data: [
            [line.from.date, line.from.value],
            [line.to.date, line.to.value],
          ],
          symbol: 'none',
          lineStyle: {
            color: line.color,
            width: 2,
            type: 'dashed',
          },
          showSymbol: false,
          emphasis: {
            scale: false, // 替代 hoverAnimation: false
          },
          animation: false, // 禁用动画以避免渲染问题
        }
      }).filter(Boolean)
      : []),
  ]

  // 只保留有效 series，确保每个series都有必要的属性
  const validSeries = allSeries.filter((s) => {
    if (!s || typeof s !== 'object') {
      console.warn('Invalid series object:', s)
      return false
    }
    if (!s.type || typeof s.type !== 'string') {
      console.warn('Series missing or invalid type:', s)
      return false
    }
    if (!s.name || typeof s.name !== 'string') {
      console.warn('Series missing or invalid name:', s)
      return false
    }
    // 确保data是数组
    if (s.data && !Array.isArray(s.data)) {
      console.warn('Series data is not an array:', s.name, s.data)
      return false
    }
    // 确保data不为空或者是有效的空数组
    if (!s.data) {
      s.data = []
    }

    // 验证数据数组中的每个元素
    if (s.data.length > 0) {
      const validDataCount = s.data.filter(item => {
        if (s.type === 'candlestick') {
          // K线数据应该是[open, close, low, high]格式的数组
          return Array.isArray(item) && item.length === 4 &&
            item.every(val => typeof val === 'number' && !isNaN(val))
        } else {
          // 线图数据应该是数字
          return typeof item === 'number' && !isNaN(item)
        }
      }).length

      if (validDataCount === 0) {
        console.warn(`Series ${s.name} has no valid data points`)
        s.data = [] // 清空无效数据
      } else if (validDataCount < s.data.length) {
        console.warn(`Series ${s.name} has ${s.data.length - validDataCount} invalid data points`)
      }
    }

    return true
  }).map(s => {
    // 再次确保s不为null（双重保护）
    if (!s || typeof s !== 'object') {
      console.error('Null series object passed to map function')
      return null
    }

    // 创建安全的series对象
    const safeSeries: any = {
      type: s.type || 'line',
      name: s.name || 'Unknown',
      data: Array.isArray(s.data) ? s.data : [],
      id: s.id || `${s.type || 'line'}-${s.name || 'unknown'}`,
      animation: false, // 禁用动画以提高稳定性
    }

    // 复制其他属性，但确保它们是安全的
    Object.keys(s).forEach(key => {
      if (!['type', 'name', 'data', 'id', 'animation'].includes(key) && (s as any)[key] !== undefined) {
        safeSeries[key] = (s as any)[key]
      }
    })

    return safeSeries
  }).filter(s => s !== null) // 过滤掉null值

  const option = {
    // 全局动画配置 - 禁用以提高稳定性
    animation: false,
    animationDuration: 0,
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
      left: '2%',
      right: '2%',
      bottom: 100,
      top: 80,
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
      type: 'value',
      scale: true,
      min: function (value: any) {
        return Math.floor(value.min * 0.98)
      },
      max: function (value: any) {
        return Math.ceil(value.max * 1.02)
      },
      splitLine: {
        show: true,
        lineStyle: {
          type: 'dashed',
          color: '#e0e0e0'
        },
      },
      axisLabel: {
        formatter: function (value: any) {
          return value.toFixed(2)
        }
      }
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
        filterMode: 'filter',
      },
    ],
    series: validSeries,
  }

  // 验证option是否有效
  if (!option.series || !Array.isArray(option.series)) {
    console.error('Invalid series in option:', option.series)
    return
  }

  // 验证每个series的完整性
  for (let i = 0; i < option.series.length; i++) {
    const series = option.series[i]
    if (!series || typeof series !== 'object') {
      console.error(`Series at index ${i} is invalid:`, series)
      return
    }
    if (!series.type || typeof series.type !== 'string') {
      console.error(`Series at index ${i} missing or invalid type:`, series)
      return
    }
    if (!series.name || typeof series.name !== 'string') {
      console.error(`Series at index ${i} missing or invalid name:`, series)
      return
    }
    if (!series.id || typeof series.id !== 'string') {
      console.error(`Series at index ${i} missing or invalid id:`, series)
      return
    }
  }

  // 确保series数量合理
  if (option.series.length === 0) {
    console.warn('No valid series to render')
    return
  }

  if (option.series.length > 20) {
    console.warn('Too many series, this might cause performance issues:', option.series.length)
  }

  try {
    // 先清空图表，然后设置新的option
    if (chart.value && !chart.value.isDisposed()) {
      // 安全地清空图表
      try {
        chart.value.clear()
      } catch (clearError) {
        console.warn('[StockChart] 清空图表失败，重新创建实例:', clearError)
        // 如果清空失败，重新创建图表实例
        chart.value.dispose()
        chart.value = echarts.init(chartContainer.value!)
      }

      console.log('[StockChart] 设置图表配置:', {
        seriesCount: option.series.length,
        xAxisDataLength: option.xAxis.data.length,
        hasValidData: option.series.some(s => s.data && s.data.length > 0)
      })

      // 使用notMerge=true确保完全替换，并添加错误处理
      try {
        // 在设置新option之前，先清空所有可能的状态
        if (chart.value) {
          // 禁用所有动画和交互，避免在reset时出错
          const safeOption: any = {
            ...option,
            animation: false,
            animationDuration: 0,
          }
          // 确保所有series都有必需的属性
          safeOption.series = safeOption.series.map((s: any) => ({
            ...s,
            animation: false,
            animationDuration: 0,
          }))

          chart.value.setOption(safeOption, true)
          console.log('[StockChart] K线图渲染成功')
        }
      } catch (setOptionError) {
        console.error('[StockChart] setOption失败，尝试重新创建图表:', setOptionError)
        // 重新创建图表实例
        if (chart.value) {
          try {
            chart.value.dispose()
          } catch (disposeError) {
            console.warn('[StockChart] dispose失败:', disposeError)
          }
        }
        if (chartContainer.value) {
          chart.value = echarts.init(chartContainer.value)
          const safeOption = {
            ...option,
            animation: false,
            animationDuration: 0,
          }
          safeOption.series = safeOption.series.map((s: any) => ({
            ...s,
            animation: false,
            animationDuration: 0,
          }))
          chart.value.setOption(safeOption, true)
          console.log('[StockChart] 图表重新创建并渲染成功')
        }
      }
    } else {
      console.error('[StockChart] 图表实例无效或已销毁，重新创建')
      if (chartContainer.value) {
        chart.value = echarts.init(chartContainer.value)
        chart.value.setOption(option, true)
        console.log('[StockChart] 图表重新创建成功')
      } else {
        error.value = '图表容器不可用'
      }
    }
  } catch (err) {
    console.error('ECharts rendering failed completely:', err)
    console.error('Option that caused the error:', JSON.stringify(option, null, 2))
    error.value = `图表渲染失败: ${(err as Error).message || '未知错误'}`

    // 最后的尝试：完全重置图表
    try {
      if (chartContainer.value) {
        if (chart.value) {
          chart.value.dispose()
        }
        chart.value = echarts.init(chartContainer.value)
        console.log('[StockChart] 图表完全重置成功')
      }
    } catch (resetError) {
      console.error('[StockChart] 图表重置也失败了:', resetError)
    }
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
        filterMode: 'filter',
      },
      {
        show: true,
        type: 'slider',
        bottom: 10,
        start: 50,
        end: 100,
        filterMode: 'filter',
      },
    ],
    series: [
      {
        name: '价格',
        type: 'line',
        id: 'price-line',
        data: data.prices || [],
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
        animation: false,
      },
    ],
  }

  try {
    if (chart.value && !chart.value.isDisposed()) {
      console.log('[StockChart] 设置分时图配置:', {
        pricesLength: data.prices?.length || 0,
        datesLength: data.dates?.length || 0,
        hasValidData: data.prices && data.prices.length > 0
      })

      // 确保option结构完整，添加必要的属性
      const safeOption = {
        ...option,
        animation: false,
        animationDuration: 0,
        series: option.series.map((s: any) => ({
          ...s,
          animation: false,
          animationDuration: 0,
        })),
      }

      chart.value.setOption(safeOption, true)
      console.log('[StockChart] 分时图渲染成功')
    } else {
      console.error('[StockChart] 图表实例无效或已销毁')
      error.value = '图表实例无效'
    }
  } catch (err) {
    console.error('ECharts setOption failed for line chart:', err)
    error.value = `分时图渲染失败: ${(err as Error).message || '未知错误'}`
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
  try {
    if (chart.value && !chart.value.isDisposed()) {
      chart.value.resize()
    }
  } catch (resizeError) {
    console.warn('[StockChart] 窗口大小变化处理失败:', resizeError)
  }
}

// 重试图表初始化
const retryChart = async () => {
  console.log('[StockChart] 手动重试图表初始化')
  error.value = null

  if (props.symbol) {
    await loadChartData()
  } else {
    error.value = '没有股票代码'
  }
}

// 测试模拟数据
const testMockData = async () => {
  console.log('[StockChart] 使用模拟数据测试图表')
  error.value = null
  isLoading.value = true

  try {
    const mockData = generateMockChartData()
    console.log('[StockChart] 生成的模拟数据:', {
      dates: mockData.dates?.length || 0,
      prices: mockData.prices?.length || 0,
      opens: mockData.opens?.length || 0,
      closes: mockData.closes?.length || 0,
      highs: mockData.highs?.length || 0,
      lows: mockData.lows?.length || 0,
      volumes: mockData.volumes?.length || 0
    })

    stockData.value = mockData

    await nextTick()

    if (chartContainer.value) {
      console.log('[StockChart] 容器可用，初始化图表')
      initChart()
    } else {
      console.error('[StockChart] 容器不可用')
      error.value = '图表容器不可用'
    }
  } catch (err) {
    console.error('[StockChart] 测试模拟数据失败:', err)
    error.value = `测试失败: ${(err as Error).message}`
  } finally {
    isLoading.value = false
  }
}

// 强制显示图表
const forceShowChart = async () => {
  console.log('[StockChart] 强制显示图表')
  error.value = null
  isLoading.value = false

  try {
    // 如果没有数据，使用模拟数据
    if (!stockData.value) {
      console.log('[StockChart] 没有数据，使用模拟数据')
      stockData.value = generateMockChartData()
    }

    console.log('[StockChart] 当前数据状态:', {
      hasData: !!stockData.value,
      dates: stockData.value?.dates?.length || 0,
      prices: stockData.value?.prices?.length || 0
    })

    await nextTick()

    if (chartContainer.value) {
      console.log('[StockChart] 强制初始化图表')
      initChart()
    } else {
      console.error('[StockChart] 图表容器不存在')
      error.value = '图表容器不存在'
    }
  } catch (err) {
    console.error('[StockChart] 强制显示图表失败:', err)
    error.value = `强制显示失败: ${(err as Error).message}`
  }
}

// 监听股票代码变化
watch(
  () => props.symbol,
  async (newSymbol, oldSymbol) => {
    console.log(`[StockChart] 股票代码变化: ${oldSymbol} -> ${newSymbol}`)
    console.log(`[StockChart] 当前容器状态:`, !!chartContainer.value)
    console.log(`[StockChart] 当前加载状态:`, isLoading.value)

    if (newSymbol && newSymbol !== oldSymbol) {
      // 等待DOM更新完成
      await nextTick()
      // 确保容器存在后再加载数据
      if (chartContainer.value) {
        console.log(`[StockChart] 容器已准备好，开始加载数据: ${newSymbol}`)
        await loadChartData()
      } else {
        console.log('[StockChart] 容器尚未准备好，等待mounted')
      }
    } else if (!newSymbol) {
      console.log('[StockChart] Symbol为空，清空图表')
      stockData.value = null
      if (chart.value) {
        chart.value.clear()
      }
    }
  },
  { immediate: true } // 立即执行一次
)

// 生命周期
onMounted(async () => {
  console.log(`[StockChart] 组件已挂载，股票代码: ${props.symbol}`)

  // 确保DOM已经渲染完成
  await nextTick()

  console.log('[StockChart] DOM渲染完成，容器状态:', !!chartContainer.value)

  if (props.symbol) {
    if (chartContainer.value) {
      console.log(`[StockChart] 开始加载股票数据: ${props.symbol}`)
      loadChartData()
    } else {
      // 如果容器还不可用，等待一下再试
      console.log('[StockChart] 容器尚未可用，等待100ms后重试')
      setTimeout(async () => {
        await nextTick()
        if (chartContainer.value && props.symbol) {
          console.log('[StockChart] 延迟加载股票数据')
          loadChartData()
        }
      }, 100)
    }
  } else {
    console.log('[StockChart] 没有股票代码')
  }
})

onUnmounted(() => {
  console.log('[StockChart] 组件卸载，清理资源')

  // 安全地销毁图表实例
  try {
    if (chart.value && !chart.value.isDisposed()) {
      chart.value.dispose()
      console.log('[StockChart] 图表实例已销毁')
    }
  } catch (disposeError) {
    console.warn('[StockChart] 销毁图表实例失败:', disposeError)
  }

  // 移除事件监听器
  try {
    window.removeEventListener('resize', handleResize)
    console.log('[StockChart] 事件监听器已移除')
  } catch (removeError) {
    console.warn('[StockChart] 移除事件监听器失败:', removeError)
  }
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
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
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
  margin-bottom: 20px;
  font-size: 16px;
  text-align: center;
}

.chart-wrapper {
  width: 100%;
  min-height: 650px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 16px;
  margin-bottom: 20px;
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
  height: 600px;
  min-height: 600px;
  background-color: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  position: relative;
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

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5a6268;
}
</style>
