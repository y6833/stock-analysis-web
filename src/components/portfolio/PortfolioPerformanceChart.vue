<template>
  <div class="portfolio-performance-chart">
    <div class="chart-header">
      <h3>{{ title }}</h3>
      <div class="chart-controls">
        <el-select v-model="selectedMetric" size="small" @change="updateChart">
          <el-option
            v-for="option in metricOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-select v-model="selectedPeriod" size="small" @change="updateChart">
          <el-option
            v-for="option in periodOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-select
          v-if="showBenchmarkSelector"
          v-model="selectedBenchmark"
          size="small"
          @change="updateChart"
        >
          <el-option
            v-for="option in benchmarkOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div>
    </div>

    <div ref="chartContainer" class="chart-container" :style="{ height: height + 'px' }"></div>

    <div v-if="loading" class="chart-loading">
      <el-spinner size="medium" />
    </div>

    <div class="chart-metrics">
      <div class="metric-item" v-for="(metric, index) in displayMetrics" :key="index">
        <div class="metric-label">{{ metric.label }}</div>
        <div class="metric-value" :class="getValueClass(metric)">
          {{ formatMetricValue(metric.value, metric.format) }}
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { usePortfolioStore } from '@/stores/portfolio/portfolioStore'
import { enhancedPortfolioPerformanceService } from '@/services/portfolio/enhancedPortfolioPerformanceService'
import { portfolioAnalyticsService } from '@/services/portfolio/portfolioAnalyticsService'

// 注册必要的ECharts组件
echarts.use([
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  CanvasRenderer,
])

const props = defineProps({
  portfolioId: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    default: '投资组合表现',
  },
  height: {
    type: Number,
    default: 400,
  },
  defaultMetric: {
    type: String,
    default: 'cumulativeReturn',
  },
  defaultPeriod: {
    type: String,
    default: '1y',
  },
  showControls: {
    type: Boolean,
    default: true,
  },
  showMetrics: {
    type: Boolean,
    default: true,
  },
  benchmark: {
    type: String,
    default: '',
  },
  showBenchmarkSelector: {
    type: Boolean,
    default: false,
  },
})

const chartContainer = ref<HTMLElement | null>(null)
const chart = ref<echarts.ECharts | null>(null)
const loading = ref(false)
const selectedMetric = ref(props.defaultMetric)
const selectedPeriod = ref(props.defaultPeriod)
const chartData = ref<any>(null)
const portfolioStore = usePortfolioStore()

// 指标选项
const metricOptions = [
  { label: '累计收益', value: 'cumulativeReturn' },
  { label: '日收益率', value: 'dailyReturn' },
  { label: '滚动波动率', value: 'rollingVolatility' },
  { label: '滚动夏普比率', value: 'rollingSharpe' },
  { label: '回撤', value: 'drawdown' },
  { label: '资产配置', value: 'allocation' },
  { label: '风险贡献', value: 'riskContribution' },
  { label: '相关性矩阵', value: 'correlation' },
]

// 基准选项
const benchmarkOptions = [
  { label: '无基准', value: '' },
  { label: '沪深300', value: 'CSI300' },
  { label: '上证指数', value: 'SSE' },
  { label: '深证成指', value: 'SZSE' },
  { label: '创业板指', value: 'GEM' },
  { label: '标普500', value: 'SPX' },
]

// 选中的基准
const selectedBenchmark = ref(props.benchmark)

// 时间周期选项
const periodOptions = [
  { label: '1周', value: '1w' },
  { label: '1个月', value: '1m' },
  { label: '3个月', value: '3m' },
  { label: '6个月', value: '6m' },
  { label: '1年', value: '1y' },
  { label: '3年', value: '3y' },
  { label: '5年', value: '5y' },
  { label: '全部', value: 'all' },
]

// 计算显示的指标
const displayMetrics = computed(() => {
  if (!chartData.value) return []

  const metrics = []

  if (selectedMetric.value === 'cumulativeReturn' || selectedMetric.value === 'dailyReturn') {
    metrics.push(
      { label: '总收益率', value: chartData.value.totalReturn || 0, format: 'percent' },
      { label: '年化收益率', value: chartData.value.annualizedReturn || 0, format: 'percent' },
      { label: '波动率', value: chartData.value.volatility || 0, format: 'percent' },
      { label: '夏普比率', value: chartData.value.sharpeRatio || 0, format: 'number' },
      { label: '最大回撤', value: chartData.value.maxDrawdown || 0, format: 'percent' }
    )
  } else if (selectedMetric.value === 'rollingVolatility') {
    metrics.push(
      { label: '当前波动率', value: chartData.value.currentVolatility || 0, format: 'percent' },
      { label: '平均波动率', value: chartData.value.avgVolatility || 0, format: 'percent' },
      { label: '最高波动率', value: chartData.value.maxVolatility || 0, format: 'percent' },
      { label: '最低波动率', value: chartData.value.minVolatility || 0, format: 'percent' }
    )
  } else if (selectedMetric.value === 'rollingSharpe') {
    metrics.push(
      { label: '当前夏普比率', value: chartData.value.currentSharpe || 0, format: 'number' },
      { label: '平均夏普比率', value: chartData.value.avgSharpe || 0, format: 'number' },
      { label: '最高夏普比率', value: chartData.value.maxSharpe || 0, format: 'number' },
      { label: '最低夏普比率', value: chartData.value.minSharpe || 0, format: 'number' }
    )
  } else if (selectedMetric.value === 'drawdown') {
    metrics.push(
      { label: '当前回撤', value: chartData.value.currentDrawdown || 0, format: 'percent' },
      { label: '最大回撤', value: chartData.value.maxDrawdown || 0, format: 'percent' },
      { label: '平均回撤', value: chartData.value.avgDrawdown || 0, format: 'percent' },
      { label: '回撤次数', value: chartData.value.drawdownCount || 0, format: 'number' }
    )
  }

  return metrics
})
// 监听属性变化
watch(
  () => props.portfolioId,
  () => {
    fetchData()
  }
)

// 初始化图表
onMounted(() => {
  if (chartContainer.value) {
    chart.value = echarts.init(chartContainer.value)
    fetchData()
  }

  window.addEventListener('resize', handleResize)
})

// 销毁图表
onUnmounted(() => {
  if (chart.value) {
    chart.value.dispose()
  }

  window.removeEventListener('resize', handleResize)
})

// 处理窗口大小变化
function handleResize() {
  if (chart.value) {
    chart.value.resize()
  }
}

// 更新图表
function updateChart() {
  fetchData()
}

// 获取数据
async function fetchData() {
  if (!props.portfolioId) return

  loading.value = true

  try {
    // 根据选择的指标和时间周期获取数据
    if (selectedMetric.value === 'cumulativeReturn') {
      await fetchPerformanceData()
    } else if (selectedMetric.value === 'dailyReturn') {
      await fetchDailyReturnsData()
    } else if (
      selectedMetric.value === 'rollingVolatility' ||
      selectedMetric.value === 'rollingSharpe'
    ) {
      await fetchRollingMetricsData()
    } else if (selectedMetric.value === 'drawdown') {
      await fetchDrawdownData()
    } else if (selectedMetric.value === 'allocation') {
      await fetchAllocationData()
    }

    renderChart()
  } catch (error) {
    console.error('获取投资组合数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取性能数据
async function fetchPerformanceData() {
  // 在实际实现中，这将从API获取数据
  // 这里使用模拟数据

  const startDate = getStartDateFromPeriod()
  const endDate = new Date().toISOString().split('T')[0]

  try {
    // 获取投资组合持仓
    const holdings = await portfolioStore.fetchHoldings(props.portfolioId)

    // 分析投资组合
    const analytics = portfolioAnalyticsService.analyzePortfolio(portfolioStore.positionSummaries)

    // 设置图表数据
    chartData.value = {
      dates: analytics.dailyReturns.map((r) => r.date),
      portfolioValues: calculateCumulativeReturns(analytics.dailyReturns),
      benchmarkValues: props.benchmark ? [] : undefined, // 在实际实现中，这将是基准数据
      totalReturn: analytics.totalProfitPercentage / 100,
      annualizedReturn: 0.12, // 模拟数据
      volatility: analytics.volatility,
      sharpeRatio: analytics.sharpeRatio,
      maxDrawdown: analytics.maxDrawdown,
    }
  } catch (error) {
    console.error('获取性能数据失败:', error)
    throw error
  }
}

// 获取日收益率数据
async function fetchDailyReturnsData() {
  // 在实际实现中，这将从API获取数据
  // 这里使用模拟数据

  try {
    // 获取投资组合持仓
    const holdings = await portfolioStore.fetchHoldings(props.portfolioId)

    // 分析投资组合
    const analytics = portfolioAnalyticsService.analyzePortfolio(portfolioStore.positionSummaries)

    // 设置图表数据
    chartData.value = {
      dates: analytics.dailyReturns.map((r) => r.date),
      portfolioReturns: analytics.dailyReturns.map((r) => r.return * 100), // 转换为百分比
      benchmarkReturns: props.benchmark ? [] : undefined, // 在实际实现中，这将是基准数据
      totalReturn: analytics.totalProfitPercentage / 100,
      annualizedReturn: 0.12, // 模拟数据
      volatility: analytics.volatility,
      sharpeRatio: analytics.sharpeRatio,
      maxDrawdown: analytics.maxDrawdown,
    }
  } catch (error) {
    console.error('获取日收益率数据失败:', error)
    throw error
  }
} // 获取滚动指标数据
async function fetchRollingMetricsData() {
  // 在实际实现中，这将从API获取数据
  // 这里使用模拟数据

  const metric = selectedMetric.value === 'rollingVolatility' ? 'volatility' : 'sharpe'

  try {
    // 模拟滚动指标数据
    const dates: string[] = []
    const values: number[] = []
    const now = new Date()
    const startDate = getStartDateFromPeriod()
    let currentDate = new Date(startDate)

    while (currentDate <= now) {
      dates.push(currentDate.toISOString().split('T')[0])

      // 生成模拟数据
      if (metric === 'volatility') {
        // 波动率在0.05到0.2之间
        values.push(0.05 + Math.random() * 0.15)
      } else {
        // 夏普比率在-0.5到2之间
        values.push(-0.5 + Math.random() * 2.5)
      }

      // 增加一天
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // 计算统计数据
    const currentValue = values[values.length - 1]
    const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length
    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)

    // 设置图表数据
    if (metric === 'volatility') {
      chartData.value = {
        dates,
        values,
        currentVolatility: currentValue,
        avgVolatility: avgValue,
        maxVolatility: maxValue,
        minVolatility: minValue,
      }
    } else {
      chartData.value = {
        dates,
        values,
        currentSharpe: currentValue,
        avgSharpe: avgValue,
        maxSharpe: maxValue,
        minSharpe: minValue,
      }
    }
  } catch (error) {
    console.error(`获取滚动${metric}数据失败:`, error)
    throw error
  }
}

// 获取回撤数据
async function fetchDrawdownData() {
  // 在实际实现中，这将从API获取数据
  // 这里使用模拟数据

  try {
    // 获取投资组合持仓
    const holdings = await portfolioStore.fetchHoldings(props.portfolioId)

    // 分析投资组合
    const analytics = portfolioAnalyticsService.analyzePortfolio(portfolioStore.positionSummaries)

    // 计算回撤序列
    const cumulativeReturns = calculateCumulativeReturns(analytics.dailyReturns)
    const drawdowns = calculateDrawdowns(cumulativeReturns)

    // 计算统计数据
    const currentDrawdown = drawdowns[drawdowns.length - 1]
    const maxDrawdown = Math.min(...drawdowns)
    const avgDrawdown = drawdowns.reduce((sum, val) => sum + val, 0) / drawdowns.length

    // 计算回撤次数 (连续的负回撤算一次)
    let drawdownCount = 0
    let inDrawdown = false

    for (const drawdown of drawdowns) {
      if (drawdown < 0 && !inDrawdown) {
        drawdownCount++
        inDrawdown = true
      } else if (drawdown >= 0) {
        inDrawdown = false
      }
    }

    // 设置图表数据
    chartData.value = {
      dates: analytics.dailyReturns.map((r) => r.date),
      drawdowns: drawdowns.map((d) => d * 100), // 转换为百分比
      currentDrawdown,
      maxDrawdown,
      avgDrawdown,
      drawdownCount,
    }
  } catch (error) {
    console.error('获取回撤数据失败:', error)
    throw error
  }
}

// 获取资产配置数据
async function fetchAllocationData() {
  // 在实际实现中，这将从API获取数据
  // 这里使用模拟数据

  try {
    // 获取投资组合持仓
    const holdings = await portfolioStore.fetchHoldings(props.portfolioId)

    // 分析投资组合
    const analytics = portfolioAnalyticsService.analyzePortfolio(portfolioStore.positionSummaries)

    // 设置图表数据
    chartData.value = {
      sectors: analytics.sectorAllocation.map((item) => item.sector),
      values: analytics.sectorAllocation.map((item) => item.value),
      percentages: analytics.sectorAllocation.map((item) => item.percentage),
    }
  } catch (error) {
    console.error('获取资产配置数据失败:', error)
    throw error
  }
} // 渲染图表
function renderChart() {
  if (!chart.value || !chartData.value) return

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: getTooltipFormatter(),
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: [],
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: getYAxisFormatter(),
      },
    },
    series: [],
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
      },
      {
        start: 0,
        end: 100,
      },
    ],
  }

  // 根据选择的指标配置图表
  if (selectedMetric.value === 'cumulativeReturn') {
    option.xAxis!.data = chartData.value.dates

    const portfolioSeries: any = {
      name: '投资组合',
      type: 'line',
      data: chartData.value.portfolioValues,
      smooth: true,
      showSymbol: false,
      lineStyle: {
        width: 2,
      },
      areaStyle: {
        opacity: 0.2,
      },
    }

    option.series!.push(portfolioSeries)

    if (chartData.value.benchmarkValues) {
      const benchmarkSeries: any = {
        name: '基准',
        type: 'line',
        data: chartData.value.benchmarkValues,
        smooth: true,
        showSymbol: false,
        lineStyle: {
          width: 2,
          type: 'dashed',
        },
      }

      option.series!.push(benchmarkSeries)
    }
  } else if (selectedMetric.value === 'dailyReturn') {
    option.xAxis!.data = chartData.value.dates

    const portfolioSeries: any = {
      name: '日收益率',
      type: 'bar',
      data: chartData.value.portfolioReturns,
      itemStyle: {
        color: (params: any) => {
          return params.value >= 0 ? '#91cc75' : '#ee6666'
        },
      },
    }

    option.series!.push(portfolioSeries)

    if (chartData.value.benchmarkReturns) {
      const benchmarkSeries: any = {
        name: '基准日收益率',
        type: 'line',
        data: chartData.value.benchmarkReturns,
        smooth: true,
        showSymbol: false,
        lineStyle: {
          width: 2,
          type: 'dashed',
        },
      }

      option.series!.push(benchmarkSeries)
    }
  } else if (
    selectedMetric.value === 'rollingVolatility' ||
    selectedMetric.value === 'rollingSharpe'
  ) {
    option.xAxis!.data = chartData.value.dates

    const series: any = {
      name: selectedMetric.value === 'rollingVolatility' ? '滚动波动率' : '滚动夏普比率',
      type: 'line',
      data: chartData.value.values,
      smooth: true,
      showSymbol: false,
      lineStyle: {
        width: 2,
      },
      areaStyle: {
        opacity: 0.2,
      },
      markLine: {
        data: [
          {
            name: '平均值',
            type: 'average',
            label: {
              position: 'end',
              formatter: '{b}: {c}',
            },
          },
        ],
      },
    }

    option.series!.push(series)
  } else if (selectedMetric.value === 'drawdown') {
    option.xAxis!.data = chartData.value.dates

    const series: any = {
      name: '回撤',
      type: 'line',
      data: chartData.value.drawdowns,
      smooth: true,
      showSymbol: false,
      lineStyle: {
        width: 2,
      },
      areaStyle: {
        opacity: 0.2,
        color: '#ee6666',
      },
      markLine: {
        data: [
          {
            name: '最大回撤',
            type: 'min',
            label: {
              position: 'end',
              formatter: '最大回撤: {c}%',
            },
          },
        ],
      },
    }

    option.series!.push(series)
  } else if (selectedMetric.value === 'allocation') {
    option.xAxis = {
      type: 'category',
      data: chartData.value.sectors,
    }

    option.yAxis = {
      type: 'value',
      axisLabel: {
        formatter: '{value}%',
      },
    }

    const series: any = {
      name: '资产配置',
      type: 'bar',
      data: chartData.value.percentages,
      itemStyle: {
        color: (params: any) => {
          // 使用不同颜色区分不同行业
          const colors = [
            '#5470c6',
            '#91cc75',
            '#fac858',
            '#ee6666',
            '#73c0de',
            '#3ba272',
            '#fc8452',
            '#9a60b4',
            '#ea7ccc',
            '#6e7074',
            '#61a0a8',
            '#efa18d',
          ]
          return colors[params.dataIndex % colors.length]
        },
      },
      label: {
        show: true,
        position: 'top',
        formatter: '{c}%',
      },
    }

    option.series!.push(series)

    // 移除数据缩放
    option.dataZoom = []
  }

  chart.value.setOption(option, true)
}

// 获取Y轴格式化函数
function getYAxisFormatter() {
  if (selectedMetric.value === 'cumulativeReturn') {
    return '{value}%'
  } else if (selectedMetric.value === 'dailyReturn') {
    return '{value}%'
  } else if (selectedMetric.value === 'rollingVolatility') {
    return '{value}'
  } else if (selectedMetric.value === 'rollingSharpe') {
    return '{value}'
  } else if (selectedMetric.value === 'drawdown') {
    return '{value}%'
  } else {
    return '{value}'
  }
}

// 获取提示框格式化函数
function getTooltipFormatter() {
  if (selectedMetric.value === 'cumulativeReturn') {
    return (params: any) => {
      let result = `${params[0].axisValue}<br/>`

      params.forEach((item: any) => {
        result += `${item.marker}${item.seriesName}: ${item.value.toFixed(2)}%<br/>`
      })

      return result
    }
  } else if (selectedMetric.value === 'dailyReturn') {
    return (params: any) => {
      let result = `${params[0].axisValue}<br/>`

      params.forEach((item: any) => {
        const color = item.value >= 0 ? '#91cc75' : '#ee6666'
        const sign = item.value >= 0 ? '+' : ''
        result += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${color};"></span>${
          item.seriesName
        }: ${sign}${item.value.toFixed(2)}%<br/>`
      })

      return result
    }
  } else if (selectedMetric.value === 'rollingVolatility') {
    return (params: any) => {
      return `${params[0].axisValue}<br/>${params[0].marker}滚动波动率: ${(
        params[0].value * 100
      ).toFixed(2)}%`
    }
  } else if (selectedMetric.value === 'rollingSharpe') {
    return (params: any) => {
      return `${params[0].axisValue}<br/>${params[0].marker}滚动夏普比率: ${params[0].value.toFixed(
        2
      )}`
    }
  } else if (selectedMetric.value === 'drawdown') {
    return (params: any) => {
      return `${params[0].axisValue}<br/>${params[0].marker}回撤: ${params[0].value.toFixed(2)}%`
    }
  } else if (selectedMetric.value === 'allocation') {
    return (params: any) => {
      return `${params[0].name}<br/>${params[0].marker}占比: ${params[0].value.toFixed(2)}%`
    }
  } else {
    return '{b}: {c}'
  }
}

// 计算累积收益
function calculateCumulativeReturns(
  dailyReturns: Array<{ date: string; return: number }>
): number[] {
  const cumulativeReturns: number[] = []
  let cumReturn = 0

  for (const dailyReturn of dailyReturns) {
    cumReturn += dailyReturn.return * 100 // 转换为百分比
    cumulativeReturns.push(cumReturn)
  }

  return cumulativeReturns
}

// 计算回撤序列
function calculateDrawdowns(cumulativeReturns: number[]): number[] {
  const drawdowns: number[] = []
  let peak = -Infinity

  for (const cumReturn of cumulativeReturns) {
    if (cumReturn > peak) {
      peak = cumReturn
    }

    const drawdown = (cumReturn - peak) / (100 + peak) // 转换为百分比
    drawdowns.push(drawdown)
  }

  return drawdowns
}

// 根据选择的时间周期获取开始日期
function getStartDateFromPeriod(): string {
  const now = new Date()
  const startDate = new Date(now)

  switch (selectedPeriod.value) {
    case '1w':
      startDate.setDate(now.getDate() - 7)
      break
    case '1m':
      startDate.setMonth(now.getMonth() - 1)
      break
    case '3m':
      startDate.setMonth(now.getMonth() - 3)
      break
    case '6m':
      startDate.setMonth(now.getMonth() - 6)
      break
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1)
      break
    case '3y':
      startDate.setFullYear(now.getFullYear() - 3)
      break
    case '5y':
      startDate.setFullYear(now.getFullYear() - 5)
      break
    case 'all':
      startDate.setFullYear(now.getFullYear() - 10) // 假设最多10年数据
      break
  }

  return startDate.toISOString().split('T')[0]
}

// 格式化指标值
function formatMetricValue(value: number, format: string): string {
  if (format === 'percent') {
    return `${(value * 100).toFixed(2)}%`
  } else if (format === 'currency') {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
    }).format(value)
  } else {
    return value.toFixed(2)
  }
}

// 获取值的CSS类
function getValueClass(metric: { value: number; format: string }): string {
  if (metric.format === 'percent' || metric.format === 'number') {
    if (metric.value > 0) return 'positive'
    if (metric.value < 0) return 'negative'
  }

  return ''
}
</script>

<style scoped>
.portfolio-performance-chart {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 16px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.chart-controls {
  display: flex;
  gap: 8px;
}

.chart-container {
  width: 100%;
  min-height: 300px;
}

.chart-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.chart-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.metric-item {
  flex: 1;
  min-width: 120px;
  text-align: center;
}

.metric-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 16px;
  font-weight: 500;
}

.positive {
  color: #67c23a;
}

.negative {
  color: #f56c6c;
}
</style>
