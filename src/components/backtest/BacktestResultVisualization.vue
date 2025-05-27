<template>
  <div class="backtest-result-visualization">
    <!-- 绩效概览 -->
    <div class="performance-overview">
      <h3>回测结果概览</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">总收益率</div>
          <div class="metric-value" :class="getReturnClass(result.performance.totalReturn)">
            {{ formatPercent(result.performance.totalReturn) }}
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-label">年化收益率</div>
          <div class="metric-value" :class="getReturnClass(result.performance.annualizedReturn)">
            {{ formatPercent(result.performance.annualizedReturn) }}
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-label">最大回撤</div>
          <div class="metric-value negative">
            {{ formatPercent(result.performance.maxDrawdown) }}
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-label">夏普比率</div>
          <div class="metric-value" :class="getSharpeClass(result.performance.sharpeRatio)">
            {{ result.performance.sharpeRatio.toFixed(2) }}
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-label">胜率</div>
          <div class="metric-value">
            {{ formatPercent(result.performance.winRate) }}
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-label">盈亏比</div>
          <div class="metric-value">
            {{ result.performance.profitFactor.toFixed(2) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <!-- 净值曲线图 -->
      <div class="chart-container">
        <h4>净值曲线</h4>
        <div ref="equityChartRef" class="chart"></div>
      </div>

      <!-- 回撤分析图 -->
      <div class="chart-container">
        <h4>回撤分析</h4>
        <div ref="drawdownChartRef" class="chart"></div>
      </div>

      <!-- 收益分布图 -->
      <div class="chart-container">
        <h4>收益分布</h4>
        <div ref="returnDistributionRef" class="chart"></div>
      </div>

      <!-- 月度收益热力图 -->
      <div class="chart-container">
        <h4>月度收益热力图</h4>
        <div ref="monthlyReturnsRef" class="chart"></div>
      </div>
    </div>

    <!-- 交易详情 -->
    <div class="trades-section">
      <h4>交易记录</h4>
      <div class="trades-summary">
        <span>总交易次数: {{ result.performance.totalTrades }}</span>
        <span>盈利交易: {{ result.performance.profitableTrades }}</span>
        <span>亏损交易: {{ result.performance.lossTrades }}</span>
      </div>
      
      <div class="trades-table-container">
        <table class="trades-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>股票</th>
              <th>方向</th>
              <th>数量</th>
              <th>价格</th>
              <th>金额</th>
              <th>手续费</th>
              <th>原因</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="trade in paginatedTrades" :key="trade.id">
              <td>{{ formatDate(trade.timestamp) }}</td>
              <td>{{ trade.symbol }}</td>
              <td :class="trade.direction === 'buy' ? 'buy' : 'sell'">
                {{ trade.direction === 'buy' ? '买入' : '卖出' }}
              </td>
              <td>{{ trade.quantity }}</td>
              <td>{{ trade.price.toFixed(2) }}</td>
              <td>{{ trade.amount.toFixed(2) }}</td>
              <td>{{ (trade.commission + trade.slippage).toFixed(2) }}</td>
              <td>{{ trade.reason }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="pagination" v-if="totalPages > 1">
        <button 
          @click="currentPage--" 
          :disabled="currentPage === 1"
          class="page-btn"
        >
          上一页
        </button>
        <span class="page-info">
          第 {{ currentPage }} 页，共 {{ totalPages }} 页
        </span>
        <button 
          @click="currentPage++" 
          :disabled="currentPage === totalPages"
          class="page-btn"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { BacktestResult } from '@/types/backtest'

interface Props {
  result: BacktestResult
}

const props = defineProps<Props>()

// 图表引用
const equityChartRef = ref<HTMLElement>()
const drawdownChartRef = ref<HTMLElement>()
const returnDistributionRef = ref<HTMLElement>()
const monthlyReturnsRef = ref<HTMLElement>()

// 分页相关
const currentPage = ref(1)
const pageSize = 20

// 计算属性
const totalPages = computed(() => Math.ceil(props.result.trades.length / pageSize))
const paginatedTrades = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return props.result.trades.slice(start, end)
})

// 格式化函数
const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString()

// 样式类
const getReturnClass = (value: number) => value >= 0 ? 'positive' : 'negative'
const getSharpeClass = (value: number) => {
  if (value >= 1.5) return 'excellent'
  if (value >= 1.0) return 'good'
  if (value >= 0.5) return 'fair'
  return 'poor'
}

// 初始化图表
onMounted(async () => {
  await nextTick()
  initCharts()
})

const initCharts = () => {
  initEquityChart()
  initDrawdownChart()
  initReturnDistributionChart()
  initMonthlyReturnsChart()
}

// 净值曲线图
const initEquityChart = () => {
  if (!equityChartRef.value) return

  const chart = echarts.init(equityChartRef.value)
  const option = {
    title: {
      text: '策略净值曲线',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0]
        return `${data.name}<br/>净值: ${data.value.toFixed(4)}`
      }
    },
    xAxis: {
      type: 'category',
      data: props.result.equity.dates
    },
    yAxis: {
      type: 'value',
      name: '净值'
    },
    series: [{
      name: '净值',
      type: 'line',
      data: props.result.equity.values,
      smooth: true,
      lineStyle: {
        color: '#1890ff'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
            { offset: 1, color: 'rgba(24, 144, 255, 0.1)' }
          ]
        }
      }
    }]
  }
  chart.setOption(option)
}

// 回撤分析图
const initDrawdownChart = () => {
  if (!drawdownChartRef.value) return

  const chart = echarts.init(drawdownChartRef.value)
  const option = {
    title: {
      text: '回撤分析',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0]
        return `${data.name}<br/>回撤: ${(data.value * 100).toFixed(2)}%`
      }
    },
    xAxis: {
      type: 'category',
      data: props.result.drawdowns.dates
    },
    yAxis: {
      type: 'value',
      name: '回撤 (%)',
      max: 0
    },
    series: [{
      name: '回撤',
      type: 'line',
      data: props.result.drawdowns.values,
      lineStyle: {
        color: '#ff4d4f'
      },
      areaStyle: {
        color: 'rgba(255, 77, 79, 0.2)'
      }
    }]
  }
  chart.setOption(option)
}

// 收益分布图
const initReturnDistributionChart = () => {
  if (!returnDistributionRef.value) return

  // 计算日收益率分布
  const returns = calculateDailyReturns()
  const histogram = calculateHistogram(returns, 20)

  const chart = echarts.init(returnDistributionRef.value)
  const option = {
    title: {
      text: '日收益率分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: histogram.bins
    },
    yAxis: {
      type: 'value',
      name: '频次'
    },
    series: [{
      name: '频次',
      type: 'bar',
      data: histogram.counts,
      itemStyle: {
        color: '#52c41a'
      }
    }]
  }
  chart.setOption(option)
}

// 月度收益热力图
const initMonthlyReturnsChart = () => {
  if (!monthlyReturnsRef.value) return

  const monthlyData = calculateMonthlyReturns()
  
  const chart = echarts.init(monthlyReturnsRef.value)
  const option = {
    title: {
      text: '月度收益热力图',
      left: 'center'
    },
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        return `${params.data[1]}年${params.data[0]}月<br/>收益率: ${(params.data[2] * 100).toFixed(2)}%`
      }
    },
    grid: {
      height: '50%',
      top: '10%'
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
      splitArea: {
        show: true
      }
    },
    yAxis: {
      type: 'category',
      data: monthlyData.years,
      splitArea: {
        show: true
      }
    },
    visualMap: {
      min: -0.1,
      max: 0.1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '15%',
      inRange: {
        color: ['#ff4d4f', '#ffffff', '#52c41a']
      }
    },
    series: [{
      name: '月度收益',
      type: 'heatmap',
      data: monthlyData.data,
      label: {
        show: true,
        formatter: (params: any) => `${(params.data[2] * 100).toFixed(1)}%`
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }
  chart.setOption(option)
}

// 计算日收益率
const calculateDailyReturns = () => {
  const returns = []
  for (let i = 1; i < props.result.equity.values.length; i++) {
    const prevValue = props.result.equity.values[i - 1]
    const currentValue = props.result.equity.values[i]
    returns.push((currentValue - prevValue) / prevValue)
  }
  return returns
}

// 计算直方图
const calculateHistogram = (data: number[], bins: number) => {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const binWidth = (max - min) / bins
  
  const binLabels = []
  const counts = new Array(bins).fill(0)
  
  for (let i = 0; i < bins; i++) {
    const binStart = min + i * binWidth
    const binEnd = min + (i + 1) * binWidth
    binLabels.push(`${(binStart * 100).toFixed(1)}%`)
    
    for (const value of data) {
      if (value >= binStart && value < binEnd) {
        counts[i]++
      }
    }
  }
  
  return { bins: binLabels, counts }
}

// 计算月度收益
const calculateMonthlyReturns = () => {
  const monthlyReturns = new Map<string, number>()
  const years = new Set<string>()
  
  // 这里应该根据实际的净值数据计算月度收益
  // 简化实现，生成示例数据
  const currentYear = new Date().getFullYear()
  for (let year = currentYear - 2; year <= currentYear; year++) {
    years.add(year.toString())
    for (let month = 1; month <= 12; month++) {
      const key = `${year}-${month}`
      monthlyReturns.set(key, (Math.random() - 0.5) * 0.2) // 模拟数据
    }
  }
  
  const data = []
  for (const [key, value] of monthlyReturns) {
    const [year, month] = key.split('-')
    data.push([parseInt(month) - 1, year, value])
  }
  
  return {
    years: Array.from(years).sort(),
    data
  }
}
</script>

<style scoped>
.backtest-result-visualization {
  padding: 20px;
}

.performance-overview {
  margin-bottom: 30px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.metric-card {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.metric-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
}

.metric-value.positive { color: #52c41a; }
.metric-value.negative { color: #ff4d4f; }
.metric-value.excellent { color: #1890ff; }
.metric-value.good { color: #52c41a; }
.metric-value.fair { color: #faad14; }
.metric-value.poor { color: #ff4d4f; }

.charts-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 30px;
}

.chart-container {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
}

.chart {
  height: 300px;
}

.trades-section {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
}

.trades-summary {
  display: flex;
  gap: 30px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #666;
}

.trades-table-container {
  overflow-x: auto;
}

.trades-table {
  width: 100%;
  border-collapse: collapse;
}

.trades-table th,
.trades-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e8e8e8;
}

.trades-table th {
  background: #fafafa;
  font-weight: 600;
}

.trades-table .buy { color: #ff4d4f; }
.trades-table .sell { color: #52c41a; }

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 20px;
}

.page-btn {
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #666;
}
</style>
