<template>
  <div class="portfolio-risk-analysis">
    <div class="section-header">
      <h3>风险分析</h3>
    </div>
    
    <el-tabs v-model="activeTab">
      <el-tab-pane label="风险指标" name="metrics">
        <div class="metrics-grid">
          <div class="metric-card" v-for="(metric, index) in riskMetrics" :key="index">
            <div class="metric-title">{{ metric.title }}</div>
            <div class="metric-value" :class="getValueClass(metric)">{{ formatValue(metric.value, metric.format) }}</div>
            <div class="metric-desc">{{ metric.description }}</div>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="风险贡献" name="contribution">
        <div class="risk-contribution">
          <div ref="contributionChartContainer" class="chart-container"></div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="压力测试" name="stress">
        <div class="stress-test">
          <div class="stress-controls">
            <el-select v-model="selectedScenario" placeholder="选择压力测试场景" @change="runStressTest">
              <el-option
                v-for="scenario in stressScenarios"
                :key="scenario.id"
                :label="scenario.name"
                :value="scenario.id"
              />
            </el-select>
            <el-button type="primary" size="small" @click="runStressTest">运行测试</el-button>
          </div>
          
          <div v-if="stressTestResult" class="stress-result">
            <div class="stress-summary">
              <div class="summary-item">
                <div class="summary-label">当前价值</div>
                <div class="summary-value">{{ formatCurrency(stressTestResult.currentValue) }}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">压力测试后价值</div>
                <div class="summary-value">{{ formatCurrency(stressTestResult.newValue) }}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">变化</div>
                <div class="summary-value" :class="stressTestResult.change < 0 ? 'negative' : 'positive'">
                  {{ formatCurrency(stressTestResult.change) }} ({{ formatPercent(stressTestResult.changePercent) }})
                </div>
              </div>
            </div>
            
            <div ref="stressChartContainer" class="chart-container"></div>
            
            <el-table :data="stressTestResult.positionImpacts" stripe style="width: 100%">
              <el-table-column prop="symbol" label="代码" width="100" />
              <el-table-column prop="name" label="名称" />
              <el-table-column prop="currentValue" label="当前价值" width="120">
                <template #default="scope">
                  {{ formatCurrency(scope.row.currentValue) }}
                </template>
              </el-table-column>
              <el-table-column prop="newValue" label="压力测试后价值" width="150">
                <template #default="scope">
                  {{ formatCurrency(scope.row.newValue) }}
                </template>
              </el-table-column>
              <el-table-column prop="changePercent" label="变化" width="120">
                <template #default="scope">
                  <span :class="scope.row.change < 0 ? 'negative' : 'positive'">
                    {{ formatPercent(scope.row.changePercent) }}
                  </span>
                </template>
              </el-table-column>
            </el-table>
          </div>
          
          <div v-else class="no-data">
            <p>请选择压力测试场景并运行测试</p>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="风险价值(VaR)" name="var">
        <div class="var-analysis">
          <div class="var-controls">
            <el-select v-model="varMethod" placeholder="计算方法" @change="calculateVaR">
              <el-option label="历史模拟法" value="historical" />
              <el-option label="参数法" value="parametric" />
              <el-option label="蒙特卡洛模拟" value="monteCarlo" />
            </el-select>
            
            <el-select v-model="varConfidence" placeholder="置信水平" @change="calculateVaR">
              <el-option label="95%" :value="0.95" />
              <el-option label="99%" :value="0.99" />
              <el-option label="99.9%" :value="0.999" />
            </el-select>
            
            <el-select v-model="varHorizon" placeholder="时间范围" @change="calculateVaR">
              <el-option label="1天" :value="1" />
              <el-option label="1周 (5天)" :value="5" />
              <el-option label="1个月 (21天)" :value="21" />
            </el-select>
            
            <el-button type="primary" size="small" @click="calculateVaR">计算</el-button>
          </div>
          
          <div v-if="varResult" class="var-result">
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-title">风险价值 (VaR)</div>
                <div class="metric-value negative">{{ formatCurrency(varResult.var) }}</div>
                <div class="metric-desc">
                  在{{ varConfidence * 100 }}%的置信水平下，{{ varHorizon }}天内的最大潜在损失
                </div>
              </div>
              
              <div class="metric-card">
                <div class="metric-title">风险价值百分比</div>
                <div class="metric-value negative">{{ formatPercent(varResult.varPercent) }}</div>
                <div class="metric-desc">
                  相对于投资组合总价值的百分比
                </div>
              </div>
              
              <div class="metric-card">
                <div class="metric-title">条件风险价值 (CVaR)</div>
                <div class="metric-value negative">{{ formatCurrency(varResult.cvar) }}</div>
                <div class="metric-desc">
                  超过VaR的平均损失
                </div>
              </div>
              
              <div class="metric-card">
                <div class="metric-title">条件风险价值百分比</div>
                <div class="metric-value negative">{{ formatPercent(varResult.cvarPercent) }}</div>
                <div class="metric-desc">
                  相对于投资组合总价值的百分比
                </div>
              </div>
            </div>
            
            <div ref="varChartContainer" class="chart-container"></div>
          </div>
          
          <div v-else class="no-data">
            <p>请选择参数并计算风险价值</p>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template><script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, PieChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { usePortfolioStore } from '@/stores/portfolio/portfolioStore'
import { enhancedPortfolioPerformanceService } from '@/services/portfolio/enhancedPortfolioPerformanceService'
import { portfolioAnalyticsService } from '@/services/portfolio/portfolioAnalyticsService'

// 注册必要的ECharts组件
echarts.use([
  BarChart,
  PieChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  CanvasRenderer
])

const props = defineProps({
  portfolioId: {
    type: Number,
    required: true
  }
})

// 状态
const activeTab = ref('metrics')
const contributionChartContainer = ref<HTMLElement | null>(null)
const stressChartContainer = ref<HTMLElement | null>(null)
const varChartContainer = ref<HTMLElement | null>(null)
const contributionChart = ref<echarts.ECharts | null>(null)
const stressChart = ref<echarts.ECharts | null>(null)
const varChart = ref<echarts.ECharts | null>(null)
const loading = ref(false)
const portfolioStore = usePortfolioStore()

// 风险指标
const riskMetrics = ref<Array<{
  title: string
  value: number
  description: string
  format: 'percent' | 'number' | 'currency'
  isGood?: boolean
}>>([])

// 压力测试
const selectedScenario = ref<string>('')
const stressScenarios = [
  { id: 'market_crash', name: '市场崩盘 (-30%)' },
  { id: 'recession', name: '经济衰退 (-20%)' },
  { id: 'interest_rate_hike', name: '利率上升 (+2%)' },
  { id: 'tech_bubble', name: '科技泡沫破裂 (科技股-40%)' },
  { id: 'inflation', name: '通胀上升 (+5%)' }
]
const stressTestResult = ref<{
  currentValue: number
  newValue: number
  change: number
  changePercent: number
  positionImpacts: Array<{
    symbol: string
    name: string
    currentValue: number
    newValue: number
    change: number
    changePercent: number
  }>
} | null>(null)

// VaR分析
const varMethod = ref<'historical' | 'parametric' | 'monteCarlo'>('historical')
const varConfidence = ref<number>(0.95)
const varHorizon = ref<number>(1)
const varResult = ref<{
  var: number
  varPercent: number
  cvar: number
  cvarPercent: number
} | null>(null)

// 监听属性变化
watch(() => props.portfolioId, () => {
  fetchRiskMetrics()
})

// 监听标签页变化
watch(activeTab, (newTab) => {
  if (newTab === 'contribution') {
    fetchRiskContribution()
  } else if (newTab === 'stress' && !stressTestResult.value) {
    selectedScenario.value = stressScenarios[0].id
    runStressTest()
  } else if (newTab === 'var' && !varResult.value) {
    calculateVaR()
  }
})

// 初始化
onMounted(() => {
  fetchRiskMetrics()
  
  window.addEventListener('resize', handleResize)
})

// 销毁
onUnmounted(() => {
  if (contributionChart.value) {
    contributionChart.value.dispose()
  }
  
  if (stressChart.value) {
    stressChart.value.dispose()
  }
  
  if (varChart.value) {
    varChart.value.dispose()
  }
  
  window.removeEventListener('resize', handleResize)
})

// 处理窗口大小变化
function handleResize() {
  if (contributionChart.value) {
    contributionChart.value.resize()
  }
  
  if (stressChart.value) {
    stressChart.value.resize()
  }
  
  if (varChart.value) {
    varChart.value.resize()
  }
}

// 获取风险指标
async function fetchRiskMetrics() {
  if (!props.portfolioId) return
  
  loading.value = true
  
  try {
    // 获取投资组合持仓
    await portfolioStore.fetchHoldings(props.portfolioId)
    
    // 使用增强的投资组合分析服务获取风险指标
    const analytics = await portfolioAnalyticsService.analyzePortfolio(
      portfolioStore.positionSummaries
    )
    
    riskMetrics.value = [
      {
        title: '波动率',
        value: analytics.volatility,
        description: '投资组合的年化标准差',
        format: 'percent'
      },
      {
        title: '夏普比率',
        value: analytics.sharpeRatio,
        description: '风险调整后的超额收益',
        format: 'number',
        isGood: true
      },
      {
        title: '最大回撤',
        value: analytics.maxDrawdown,
        description: '历史最大价值下跌百分比',
        format: 'percent'
      },
      {
        title: '贝塔系数',
        value: 1.1, // 将在后续实现中从API获取
        description: '相对于市场的波动性',
        format: 'number'
      },
      {
        title: '索提诺比率',
        value: analytics.sortinoRatio,
        description: '下行风险调整后的收益',
        format: 'number',
        isGood: true
      },
      {
        title: '信息比率',
        value: 0.8, // 将在后续实现中从API获取
        description: '相对于基准的超额收益',
        format: 'number',
        isGood: true
      },
      {
        title: '下行偏差',
        value: analytics.downsideDeviation,
        description: '负收益的波动性',
        format: 'percent'
      },
      {
        title: '卡玛比率',
        value: analytics.calmarRatio,
        description: '相对于最大回撤的收益',
        format: 'number',
        isGood: true
      },
      {
        title: '溃疡指数',
        value: 0.08, // 将在后续实现中计算
        description: '考虑回撤深度和持续时间的风险指标',
        format: 'number'
      },
      {
        title: '恢复因子',
        value: 2.5, // 将在后续实现中计算
        description: '总收益与最大回撤的比率',
        format: 'number',
        isGood: true
      }
    ]
  } catch (error) {
    console.error('获取风险指标失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取风险贡献
async function fetchRiskContribution() {
  if (!props.portfolioId || !contributionChartContainer.value) return
  
  loading.value = true
  
  try {
    // 获取投资组合持仓
    await portfolioStore.fetchHoldings(props.portfolioId)
    
    // 使用增强的投资组合分析服务获取风险贡献
    const analytics = await portfolioAnalyticsService.analyzePortfolio(
      portfolioStore.positionSummaries
    )
    
    // 初始化图表
    if (!contributionChart.value) {
      contributionChart.value = echarts.init(contributionChartContainer.value)
    }
    
    // 准备图表数据
    const riskData = analytics.riskContribution.slice(0, 10) // 取前10个持仓
    
    // 设置图表选项
    const option = {
      title: {
        text: '风险贡献 (前10名持仓)',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        data: riskData.map(item => item.name)
      },
      series: [
        {
          name: '风险贡献',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: riskData.map(item => ({
            name: item.name,
            value: item.contribution
          }))
        }
      ]
    }
    
    // 渲染图表
    contributionChart.value.setOption(option)
  } catch (error) {
    console.error('获取风险贡献失败:', error)
  } finally {
    loading.value = false
  }
}

// 运行压力测试
async function runStressTest() {
  if (!props.portfolioId || !selectedScenario.value) return
  
  loading.value = true
  
  try {
    // 获取投资组合持仓
    await portfolioStore.fetchHoldings(props.portfolioId)
    
    // 使用增强的投资组合性能服务运行压力测试
    const scenario = stressScenarios.find(s => s.id === selectedScenario.value)
    
    if (!scenario) return
    
    // 在实际实现中，这将调用API
    // 这里使用模拟数据
    const totalValue = portfolioStore.positionSummaries.reduce(
      (sum, pos) => sum + pos.currentValue, 0
    )
    
    let changePercent = 0
    
    switch (selectedScenario.value) {
      case 'market_crash':
        changePercent = -0.3
        break
      case 'recession':
        changePercent = -0.2
        break
      case 'interest_rate_hike':
        changePercent = -0.05
        break
      case 'tech_bubble':
        changePercent = -0.15
        break
      case 'inflation':
        changePercent = -0.08
        break
    }
    
    const newValue = totalValue * (1 + changePercent)
    const change = newValue - totalValue
    
    // 计算每个持仓的影响
    const positionImpacts = portfolioStore.positionSummaries.map(pos => {
      // 根据行业和特性调整影响
      let posChangePercent = changePercent
      
      if (selectedScenario.value === 'tech_bubble' && pos.sector === 'Technology') {
        posChangePercent = -0.4
      } else if (selectedScenario.value === 'interest_rate_hike' && pos.sector === 'Financials') {
        posChangePercent = 0.02
      }
      
      const posNewValue = pos.currentValue * (1 + posChangePercent)
      const posChange = posNewValue - pos.currentValue
      
      return {
        symbol: pos.symbol,
        name: pos.name,
        currentValue: pos.currentValue,
        newValue: posNewValue,
        change: posChange,
        changePercent: posChangePercent
      }
    })
    
    // 设置结果
    stressTestResult.value = {
      currentValue: totalValue,
      newValue,
      change,
      changePercent,
      positionImpacts
    }
    
    // 渲染图表
    renderStressChart()
  } catch (error) {
    console.error('运行压力测试失败:', error)
  } finally {
    loading.value = false
  }
}

// 渲染压力测试图表
function renderStressChart() {
  if (!stressChartContainer.value || !stressTestResult.value) return
  
  // 初始化图表
  if (!stressChart.value) {
    stressChart.value = echarts.init(stressChartContainer.value)
  }
  
  // 准备图表数据
  const data = stressTestResult.value.positionImpacts
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 10) // 取变化最大的10个持仓
  
  // 设置图表选项
  const option = {
    title: {
      text: '持仓影响 (变化最大的10个)',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params: any) {
        const item = params[0]
        return `${item.name}<br/>变化: ${(item.value * 100).toFixed(2)}%`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}%'
      }
    },
    yAxis: {
      type: 'category',
      data: data.map(item => item.name),
      axisLabel: {
        width: 120,
        overflow: 'truncate'
      }
    },
    series: [
      {
        name: '变化百分比',
        type: 'bar',
        data: data.map(item => item.changePercent * 100),
        itemStyle: {
          color: function(params: any) {
            return params.value >= 0 ? '#91cc75' : '#ee6666'
          }
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%'
        }
      }
    ]
  }
  
  // 渲染图表
  stressChart.value.setOption(option)
}

// 计算VaR
async function calculateVaR() {
  if (!props.portfolioId) return
  
  loading.value = true
  
  try {
    // 获取投资组合持仓
    await portfolioStore.fetchHoldings(props.portfolioId)
    
    // 使用投资组合分析服务计算VaR
    const varResult = await portfolioAnalyticsService.calculatePortfolioVaR(
      portfolioStore.positionSummaries,
      {}, // 在实际实现中，这将是历史数据
      varConfidence.value,
      varHorizon.value
    )
    
    // 设置结果
    varResult.value = varResult
    
    // 渲染图表
    renderVarChart()
  } catch (error) {
    console.error('计算VaR失败:', error)
  } finally {
    loading.value = false
  }
}

// 渲染VaR图表
function renderVarChart() {
  if (!varChartContainer.value || !varResult.value) return
  
  // 初始化图表
  if (!varChart.value) {
    varChart.value = echarts.init(varChartContainer.value)
  }
  
  // 生成模拟的收益分布数据
  const returns: number[] = []
  const mean = 0.0005 // 日均收益率
  const stdDev = 0.01 // 日波动率
  
  for (let i = 0; i < 1000; i++) {
    // 使用Box-Muller变换生成正态分布随机数
    const u1 = Math.random()
    const u2 = Math.random()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    returns.push(mean + stdDev * z0)
  }
  
  // 计算直方图数据
  const bins = 50
  const min = Math.min(...returns)
  const max = Math.max(...returns)
  const binWidth = (max - min) / bins
  const histogram: number[] = Array(bins).fill(0)
  
  for (const r of returns) {
    const binIndex = Math.min(Math.floor((r - min) / binWidth), bins - 1)
    histogram[binIndex]++
  }
  
  // 计算VaR位置
  const varIndex = Math.floor(bins * (1 - varConfidence.value))
  const varX = min + varIndex * binWidth
  
  // 设置图表选项
  const option = {
    title: {
      text: `风险价值 (VaR) - ${varConfidence.value * 100}% 置信水平, ${varHorizon.value}天`,
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: function(params: any) {
        const x = params.data[0]
        const y = params.data[1]
        return `收益率: ${(x * 100).toFixed(2)}%<br/>频率: ${y}`
      }
    },
    xAxis: {
      type: 'value',
      name: '日收益率',
      axisLabel: {
        formatter: '{value}%'
      },
      axisLine: { onZero: false }
    },
    yAxis: {
      type: 'value',
      name: '频率'
    },
    series: [
      {
        name: '收益分布',
        type: 'bar',
        data: histogram.map((count, i) => {
          const x = min + (i + 0.5) * binWidth
          return [x * 100, count]
        }),
        itemStyle: {
          color: function(params: any) {
            return params.data[0] < varX * 100 ? '#ee6666' : '#91cc75'
          }
        }
      },
      {
        name: 'VaR',
        type: 'line',
        markLine: {
          symbol: 'none',
          label: {
            formatter: `VaR (${varConfidence.value * 100}%): ${(varResult.value?.varPercent || 0).toFixed(2)}%`
          },
          lineStyle: {
            color: '#ee6666',
            width: 2
          },
          data: [
            {
              xAxis: varX * 100
            }
          ]
        }
      }
    ]
  }
  
  // 渲染图表
  varChart.value.setOption(option)
}

// 格式化值
function formatValue(value: number, format: string): string {
  if (format === 'percent') {
    return `${(value * 100).toFixed(2)}%`
  } else if (format === 'currency') {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    }).format(value)
  } else {
    return value.toFixed(2)
  }
}

// 获取值的CSS类
function getValueClass(metric: { value: number, format: string, isGood?: boolean }): string {
  if (metric.format === 'percent' || metric.format === 'number') {
    if (metric.isGood) {
      return metric.value > 0 ? 'positive' : 'negative'
    } else {
      return metric.value > 0 ? 'negative' : 'positive'
    }
  }
  
  return ''
}

// 格式化货币
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2
  }).format(value)
}

// 格式化百分比
function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}