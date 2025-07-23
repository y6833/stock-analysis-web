<template>
  <div class="advanced-portfolio-analytics">
    <div class="section-header">
      <h3>高级投资组合分析</h3>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="绩效归因" name="attribution">
        <div class="attribution-analysis">
          <div class="analysis-controls">
            <el-select
              v-model="selectedBenchmark"
              placeholder="选择基准"
              @change="fetchAttributionAnalysis"
            >
              <el-option
                v-for="option in benchmarkOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>

            <el-date-picker
              v-model="attributionDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              @change="fetchAttributionAnalysis"
            />
          </div>

          <div v-if="attributionResult" class="attribution-result">
            <div class="attribution-summary">
              <div class="summary-item">
                <div class="summary-label">总收益</div>
                <div
                  class="summary-value"
                  :class="attributionResult.totalReturn >= 0 ? 'positive' : 'negative'"
                >
                  {{ formatPercent(attributionResult.totalReturn) }}
                </div>
              </div>
              <div class="summary-item">
                <div class="summary-label">基准收益</div>
                <div
                  class="summary-value"
                  :class="attributionResult.benchmarkReturn >= 0 ? 'positive' : 'negative'"
                >
                  {{ formatPercent(attributionResult.benchmarkReturn) }}
                </div>
              </div>
              <div class="summary-item">
                <div class="summary-label">超额收益</div>
                <div
                  class="summary-value"
                  :class="attributionResult.excessReturn >= 0 ? 'positive' : 'negative'"
                >
                  {{ formatPercent(attributionResult.excessReturn) }}
                </div>
              </div>
            </div>

            <div class="attribution-breakdown">
              <h4>超额收益分解</h4>
              <div class="breakdown-chart">
                <div ref="attributionChartContainer" class="chart-container"></div>
              </div>

              <h4>行业归因分析</h4>
              <el-table :data="attributionResult.sectorAttribution" stripe style="width: 100%">
                <el-table-column prop="sector" label="行业" />
                <el-table-column prop="portfolioWeight" label="组合权重" width="100">
                  <template #default="scope">
                    {{ formatPercent(scope.row.portfolioWeight) }}
                  </template>
                </el-table-column>
                <el-table-column prop="benchmarkWeight" label="基准权重" width="100">
                  <template #default="scope">
                    {{ formatPercent(scope.row.benchmarkWeight) }}
                  </template>
                </el-table-column>
                <el-table-column prop="allocation" label="配置效应" width="100">
                  <template #default="scope">
                    <span :class="scope.row.allocation >= 0 ? 'positive' : 'negative'">
                      {{ formatPercent(scope.row.allocation) }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="selection" label="选股效应" width="100">
                  <template #default="scope">
                    <span :class="scope.row.selection >= 0 ? 'positive' : 'negative'">
                      {{ formatPercent(scope.row.selection) }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="total" label="总贡献" width="100">
                  <template #default="scope">
                    <span :class="scope.row.total >= 0 ? 'positive' : 'negative'">
                      {{ formatPercent(scope.row.total) }}
                    </span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>

          <div v-else class="no-data">
            <p>请选择基准和日期范围进行绩效归因分析</p>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="投资组合优化" name="optimization">
        <div class="portfolio-optimization">
          <div class="optimization-controls">
            <el-select
              v-model="optimizationType"
              placeholder="优化类型"
              @change="resetOptimizationResult"
            >
              <el-option label="均值方差优化" value="meanVariance" />
              <el-option label="最小方差优化" value="minVariance" />
              <el-option label="最大夏普比率" value="maxSharpe" />
              <el-option label="风险平价" value="riskParity" />
              <el-option label="最大分散化" value="maxDiversification" />
              <el-option label="等权重" value="equalWeight" />
            </el-select>

            <el-button type="primary" @click="optimizePortfolio">优化投资组合</el-button>
          </div>

          <div class="optimization-constraints" v-if="optimizationType !== 'equalWeight'">
            <h4>约束条件</h4>
            <div class="constraints-grid">
              <div class="constraint-item">
                <div class="constraint-label">最小权重</div>
                <el-slider
                  v-model="constraints.minWeight"
                  :min="0"
                  :max="0.5"
                  :step="0.01"
                  :format-tooltip="formatPercent"
                />
              </div>
              <div class="constraint-item">
                <div class="constraint-label">最大权重</div>
                <el-slider
                  v-model="constraints.maxWeight"
                  :min="0.1"
                  :max="1"
                  :step="0.01"
                  :format-tooltip="formatPercent"
                />
              </div>
              <div class="constraint-item" v-if="optimizationType === 'meanVariance'">
                <div class="constraint-label">目标收益率</div>
                <el-slider
                  v-model="constraints.targetReturn"
                  :min="0"
                  :max="0.3"
                  :step="0.01"
                  :format-tooltip="formatPercent"
                />
              </div>
              <div
                class="constraint-item"
                v-if="optimizationType === 'meanVariance' || optimizationType === 'maxSharpe'"
              >
                <div class="constraint-label">风险厌恶系数</div>
                <el-slider v-model="riskAversion" :min="1" :max="10" :step="1" />
              </div>
            </div>
          </div>

          <div v-if="optimizationResult" class="optimization-result">
            <div class="result-summary">
              <div class="summary-item">
                <div class="summary-label">预期收益率</div>
                <div class="summary-value positive">
                  {{ formatPercent(optimizationResult.expectedReturn) }}
                </div>
              </div>
              <div class="summary-item">
                <div class="summary-label">预期风险</div>
                <div class="summary-value">
                  {{ formatPercent(optimizationResult.expectedRisk) }}
                </div>
              </div>
              <div class="summary-item">
                <div class="summary-label">夏普比率</div>
                <div
                  class="summary-value"
                  :class="optimizationResult.sharpeRatio >= 0 ? 'positive' : 'negative'"
                >
                  {{ optimizationResult.sharpeRatio.toFixed(2) }}
                </div>
              </div>
            </div>

            <div class="weights-chart">
              <div ref="weightsChartContainer" class="chart-container"></div>
            </div>

            <div class="weights-table">
              <h4>优化后的权重</h4>
              <el-table :data="weightsTableData" stripe style="width: 100%">
                <el-table-column prop="symbol" label="代码" width="100" />
                <el-table-column prop="name" label="名称" />
                <el-table-column prop="currentWeight" label="当前权重" width="120">
                  <template #default="scope">
                    {{ formatPercent(scope.row.currentWeight) }}
                  </template>
                </el-table-column>
                <el-table-column prop="targetWeight" label="目标权重" width="120">
                  <template #default="scope">
                    {{ formatPercent(scope.row.targetWeight) }}
                  </template>
                </el-table-column>
                <el-table-column prop="change" label="变化" width="120">
                  <template #default="scope">
                    <span :class="scope.row.change >= 0 ? 'positive' : 'negative'">
                      {{ formatPercent(scope.row.change) }}
                    </span>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div class="rebalance-actions">
              <el-button type="primary">应用优化权重</el-button>
              <el-button>导出优化结果</el-button>
            </div>
          </div>

          <div v-else class="no-data">
            <p>请选择优化类型并点击"优化投资组合"按钮</p>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="相关性分析" name="correlation">
        <div class="correlation-analysis">
          <div ref="correlationChartContainer" class="chart-container correlation-chart"></div>

          <div class="correlation-insights" v-if="correlationInsights.length > 0">
            <h4>相关性洞察</h4>
            <ul class="insights-list">
              <li v-for="(insight, index) in correlationInsights" :key="index">
                {{ insight }}
              </li>
            </ul>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="有效前沿" name="frontier">
        <div class="efficient-frontier">
          <div class="frontier-controls">
            <el-button type="primary" @click="generateEfficientFrontier">生成有效前沿</el-button>
            <el-checkbox v-model="showCurrentPortfolio">显示当前投资组合</el-checkbox>
            <el-checkbox v-model="showOptimalPortfolios">显示最优投资组合</el-checkbox>
          </div>

          <div ref="frontierChartContainer" class="chart-container frontier-chart"></div>

          <div class="frontier-insights" v-if="frontierGenerated">
            <h4>投资组合分析</h4>
            <div class="insights-grid">
              <div class="insight-item">
                <div class="insight-label">当前投资组合效率</div>
                <div class="insight-value">{{ portfolioEfficiency.toFixed(2) }}%</div>
                <div class="insight-desc">相对于有效前沿的效率</div>
              </div>
              <div class="insight-item">
                <div class="insight-label">最小风险投资组合</div>
                <div class="insight-value">
                  收益率: {{ formatPercent(minRiskPortfolio.return) }}, 风险:
                  {{ formatPercent(minRiskPortfolio.risk) }}
                </div>
              </div>
              <div class="insight-item">
                <div class="insight-label">最大夏普比率投资组合</div>
                <div class="insight-value">
                  收益率: {{ formatPercent(maxSharpePortfolio.return) }}, 风险:
                  {{ formatPercent(maxSharpePortfolio.risk) }}
                </div>
              </div>
              <div class="insight-item">
                <div class="insight-label">潜在改进空间</div>
                <div class="insight-value" :class="improvementPotential > 0 ? 'positive' : ''">
                  {{ formatPercent(improvementPotential) }}
                </div>
                <div class="insight-desc">通过优化可能获得的额外收益</div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, PieChart, LineChart, ScatterChart, HeatmapChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  VisualMapComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { usePortfolioStore } from '@/stores/portfolio/portfolioStore'
import { enhancedPortfolioPerformanceService } from '@/services/portfolio/enhancedPortfolioPerformanceService'
import { portfolioAnalyticsService } from '@/services/portfolio/portfolioAnalyticsService'
import { OptimizationResult } from '@/types/portfolio'

// 注册必要的ECharts组件
echarts.use([
  BarChart,
  PieChart,
  LineChart,
  ScatterChart,
  HeatmapChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  VisualMapComponent,
  CanvasRenderer,
])

const props = defineProps({
  portfolioId: {
    type: Number,
    required: true,
  },
})

// 状态
const activeTab = ref('attribution')
const attributionChartContainer = ref<HTMLElement | null>(null)
const weightsChartContainer = ref<HTMLElement | null>(null)
const correlationChartContainer = ref<HTMLElement | null>(null)
const frontierChartContainer = ref<HTMLElement | null>(null)
const attributionChart = ref<echarts.ECharts | null>(null)
const weightsChart = ref<echarts.ECharts | null>(null)
const correlationChart = ref<echarts.ECharts | null>(null)
const frontierChart = ref<echarts.ECharts | null>(null)
const loading = ref(false)
const portfolioStore = usePortfolioStore()

// 绩效归因
const selectedBenchmark = ref('CSI300') // 默认沪深300
const attributionDateRange = ref<[string, string]>(['', ''])
const attributionResult = ref<any>(null)

// 基准选项
const benchmarkOptions = [
  { label: '沪深300', value: 'CSI300' },
  { label: '上证指数', value: 'SSE' },
  { label: '深证成指', value: 'SZSE' },
  { label: '创业板指', value: 'GEM' },
  { label: '标普500', value: 'SPX' },
]

// 投资组合优化
const optimizationType = ref<
  'meanVariance' | 'minVariance' | 'maxSharpe' | 'riskParity' | 'maxDiversification' | 'equalWeight'
>('meanVariance')
const constraints = ref({
  minWeight: 0.01,
  maxWeight: 0.3,
  targetReturn: 0.1,
})
const riskAversion = ref(5)
const optimizationResult = ref<OptimizationResult | null>(null)
const weightsTableData = ref<
  Array<{
    symbol: string
    name: string
    currentWeight: number
    targetWeight: number
    change: number
  }>
>([])

// 相关性分析
const correlationInsights = ref<string[]>([])

// 有效前沿
const showCurrentPortfolio = ref(true)
const showOptimalPortfolios = ref(true)
const frontierGenerated = ref(false)
const portfolioEfficiency = ref(85) // 模拟数据
const minRiskPortfolio = ref({ return: 0.08, risk: 0.12 }) // 模拟数据
const maxSharpePortfolio = ref({ return: 0.12, risk: 0.18 }) // 模拟数据
const improvementPotential = ref(0.03) // 模拟数据

// 监听标签页变化
watch(activeTab, (newTab) => {
  if (newTab === 'attribution' && !attributionResult.value) {
    initAttributionDateRange()
    fetchAttributionAnalysis()
  } else if (newTab === 'correlation') {
    fetchCorrelationMatrix()
  } else if (newTab === 'frontier' && !frontierGenerated.value) {
    generateEfficientFrontier()
  }
})

// 初始化
onMounted(() => {
  initAttributionDateRange()

  window.addEventListener('resize', handleResize)
})

// 销毁
onUnmounted(() => {
  disposeCharts()

  window.removeEventListener('resize', handleResize)
})

// 处理窗口大小变化
function handleResize() {
  if (attributionChart.value) {
    attributionChart.value.resize()
  }

  if (weightsChart.value) {
    weightsChart.value.resize()
  }

  if (correlationChart.value) {
    correlationChart.value.resize()
  }

  if (frontierChart.value) {
    frontierChart.value.resize()
  }
}

// 销毁图表
function disposeCharts() {
  if (attributionChart.value) {
    attributionChart.value.dispose()
    attributionChart.value = null
  }

  if (weightsChart.value) {
    weightsChart.value.dispose()
    weightsChart.value = null
  }

  if (correlationChart.value) {
    correlationChart.value.dispose()
    correlationChart.value = null
  }

  if (frontierChart.value) {
    frontierChart.value.dispose()
    frontierChart.value = null
  }
}

// 初始化归因分析日期范围
function initAttributionDateRange() {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 6) // 默认6个月

  attributionDateRange.value = [
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0],
  ]
}

// 获取绩效归因分析
async function fetchAttributionAnalysis() {
  if (
    !props.portfolioId ||
    !selectedBenchmark.value ||
    !attributionDateRange.value[0] ||
    !attributionDateRange.value[1]
  )
    return

  loading.value = true

  try {
    // 在实际实现中，这将调用API
    // 这里使用模拟数据

    // 模拟API调用
    // const result = await enhancedPortfolioPerformanceService.getAttributionAnalysis(
    //   props.portfolioId,
    //   selectedBenchmark.value,
    //   attributionDateRange.value[0],
    //   attributionDateRange.value[1]
    // )

    // 模拟数据
    const result = {
      portfolioId: props.portfolioId,
      period: {
        start: attributionDateRange.value[0],
        end: attributionDateRange.value[1],
      },
      totalReturn: 0.15, // 15%
      benchmarkReturn: 0.1, // 10%
      excessReturn: 0.05, // 5%

      // 归因分解
      attribution: {
        allocation: 0.02, // 资产配置效应
        selection: 0.025, // 选股效应
        interaction: 0.005, // 交互效应
        total: 0.05, // 总超额收益
      },

      // 按行业/板块分解
      sectorAttribution: [
        {
          sector: '信息技术',
          portfolioWeight: 0.25,
          benchmarkWeight: 0.2,
          portfolioReturn: 0.22,
          benchmarkReturn: 0.18,
          allocation: 0.01,
          selection: 0.015,
          interaction: 0.002,
          total: 0.027,
        },
        {
          sector: '金融',
          portfolioWeight: 0.2,
          benchmarkWeight: 0.25,
          portfolioReturn: 0.08,
          benchmarkReturn: 0.06,
          allocation: -0.003,
          selection: 0.005,
          interaction: -0.001,
          total: 0.001,
        },
        {
          sector: '医疗健康',
          portfolioWeight: 0.15,
          benchmarkWeight: 0.1,
          portfolioReturn: 0.18,
          benchmarkReturn: 0.15,
          allocation: 0.008,
          selection: 0.004,
          interaction: 0.001,
          total: 0.013,
        },
        {
          sector: '消费品',
          portfolioWeight: 0.15,
          benchmarkWeight: 0.15,
          portfolioReturn: 0.12,
          benchmarkReturn: 0.1,
          allocation: 0.0,
          selection: 0.003,
          interaction: 0.0,
          total: 0.003,
        },
        {
          sector: '工业',
          portfolioWeight: 0.1,
          benchmarkWeight: 0.12,
          portfolioReturn: 0.09,
          benchmarkReturn: 0.08,
          allocation: -0.001,
          selection: 0.001,
          interaction: 0.0,
          total: 0.0,
        },
        {
          sector: '能源',
          portfolioWeight: 0.05,
          benchmarkWeight: 0.08,
          portfolioReturn: 0.05,
          benchmarkReturn: 0.04,
          allocation: -0.001,
          selection: 0.001,
          interaction: 0.0,
          total: 0.0,
        },
        {
          sector: '其他',
          portfolioWeight: 0.1,
          benchmarkWeight: 0.1,
          portfolioReturn: 0.1,
          benchmarkReturn: 0.09,
          allocation: 0.0,
          selection: 0.001,
          interaction: 0.0,
          total: 0.001,
        },
      ],
    }

    attributionResult.value = result

    // 渲染归因分析图表
    renderAttributionChart()
  } catch (error) {
    console.error('获取绩效归因分析失败:', error)
  } finally {
    loading.value = false
  }
}

// 渲染归因分析图表
function renderAttributionChart() {
  if (!attributionChartContainer.value || !attributionResult.value) return

  // 初始化图表
  if (!attributionChart.value) {
    attributionChart.value = echarts.init(attributionChartContainer.value)
  }

  // 准备图表数据
  const { attribution } = attributionResult.value

  // 设置图表选项
  const option = {
    title: {
      text: '超额收益分解',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      data: ['资产配置效应', '选股效应', '交互效应'],
    },
    series: [
      {
        name: '超额收益分解',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          formatter: '{b}: {c} ({d}%)',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold',
          },
        },
        data: [
          { value: attribution.allocation, name: '资产配置效应', itemStyle: { color: '#5470c6' } },
          { value: attribution.selection, name: '选股效应', itemStyle: { color: '#91cc75' } },
          { value: attribution.interaction, name: '交互效应', itemStyle: { color: '#fac858' } },
        ],
      },
    ],
  }

  // 渲染图表
  attributionChart.value.setOption(option)
}

// 重置优化结果
function resetOptimizationResult() {
  optimizationResult.value = null
  weightsTableData.value = []
}

// 优化投资组合
async function optimizePortfolio() {
  if (!props.portfolioId) return

  loading.value = true

  try {
    // 获取投资组合持仓
    await portfolioStore.fetchHoldings(props.portfolioId)

    // 在实际实现中，这将调用API
    // 这里使用模拟数据

    // 模拟API调用
    // const result = await enhancedPortfolioPerformanceService.optimizePortfolio({
    //   portfolioId: props.portfolioId,
    //   optimizationType: optimizationType.value,
    //   constraints: {
    //     minWeight: constraints.value.minWeight,
    //     maxWeight: constraints.value.maxWeight,
    //     targetReturn: constraints.value.targetReturn
    //   },
    //   riskAversion: riskAversion.value
    // })

    // 模拟数据
    const positions = portfolioStore.positionSummaries
    const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0)

    // 计算当前权重
    const currentWeights: Record<string, number> = {}
    positions.forEach((pos) => {
      currentWeights[pos.symbol] = pos.currentValue / totalValue
    })

    // 生成模拟的优化权重
    const optimizedWeights: Record<string, number> = {}

    if (optimizationType.value === 'equalWeight') {
      // 等权重
      const equalWeight = 1 / positions.length
      positions.forEach((pos) => {
        optimizedWeights[pos.symbol] = equalWeight
      })
    } else {
      // 其他优化类型
      positions.forEach((pos) => {
        // 生成一些随机变化
        let weight = currentWeights[pos.symbol]

        // 根据优化类型调整权重
        if (optimizationType.value === 'minVariance') {
          // 低波动率股票权重增加
          weight = weight * (1 + (0.2 - (pos.volatility || 0.2)) * 2)
        } else if (optimizationType.value === 'maxSharpe') {
          // 高夏普比率股票权重增加
          weight = weight * (1 + ((pos.sharpeRatio || 1) - 1) * 0.5)
        } else if (optimizationType.value === 'riskParity') {
          // 风险平价
          weight = (1 / (pos.volatility || 0.2) / positions.length) * 5
        } else {
          // 均值方差或最大分散化
          weight = weight * (0.8 + Math.random() * 0.4)
        }

        optimizedWeights[pos.symbol] = weight
      })

      // 归一化权重
      const totalWeight = Object.values(optimizedWeights).reduce((sum, w) => sum + w, 0)
      Object.keys(optimizedWeights).forEach((symbol) => {
        optimizedWeights[symbol] = optimizedWeights[symbol] / totalWeight
      })

      // 应用约束条件
      Object.keys(optimizedWeights).forEach((symbol) => {
        if (optimizedWeights[symbol] < constraints.value.minWeight) {
          optimizedWeights[symbol] = constraints.value.minWeight
        } else if (optimizedWeights[symbol] > constraints.value.maxWeight) {
          optimizedWeights[symbol] = constraints.value.maxWeight
        }
      })

      // 再次归一化
      const totalWeightAfterConstraints = Object.values(optimizedWeights).reduce(
        (sum, w) => sum + w,
        0
      )
      Object.keys(optimizedWeights).forEach((symbol) => {
        optimizedWeights[symbol] = optimizedWeights[symbol] / totalWeightAfterConstraints
      })
    }

    // 计算预期收益和风险
    const expectedReturn = positions.reduce((sum, pos) => {
      return sum + optimizedWeights[pos.symbol] * (pos.annualizedReturn || 0.1)
    }, 0)

    const expectedRisk = Math.sqrt(
      positions.reduce((sum, pos) => {
        return sum + Math.pow(optimizedWeights[pos.symbol] * (pos.volatility || 0.2), 2)
      }, 0)
    )

    const sharpeRatio = (expectedReturn - 0.02) / expectedRisk // 假设无风险利率为2%

    // 设置优化结果
    optimizationResult.value = {
      weights: optimizedWeights,
      expectedReturn,
      expectedRisk,
      sharpeRatio,
    }

    // 准备表格数据
    weightsTableData.value = positions
      .map((pos) => ({
        symbol: pos.symbol,
        name: pos.name,
        currentWeight: currentWeights[pos.symbol],
        targetWeight: optimizedWeights[pos.symbol],
        change: optimizedWeights[pos.symbol] - currentWeights[pos.symbol],
      }))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))

    // 渲染权重图表
    renderWeightsChart()
  } catch (error) {
    console.error('优化投资组合失败:', error)
  } finally {
    loading.value = false
  }
}

// 渲染权重图表
function renderWeightsChart() {
  if (!weightsChartContainer.value || !optimizationResult.value) return

  // 初始化图表
  if (!weightsChart.value) {
    weightsChart.value = echarts.init(weightsChartContainer.value)
  }

  // 准备图表数据
  const data = weightsTableData.value.slice(0, 10) // 取前10个变化最大的持仓

  // 设置图表选项
  const option = {
    title: {
      text: '权重变化 (变化最大的10个持仓)',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: function (params: any) {
        const current = params[0]
        const target = params[1]
        return `${current.name}<br/>
                ${current.marker}当前权重: ${(current.value * 100).toFixed(2)}%<br/>
                ${target.marker}目标权重: ${(target.value * 100).toFixed(2)}%<br/>
                变化: ${((target.value - current.value) * 100).toFixed(2)}%`
      },
    },
    legend: {
      data: ['当前权重', '目标权重'],
      top: 30,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}%',
      },
    },
    yAxis: {
      type: 'category',
      data: data.map((item) => item.name),
      axisLabel: {
        width: 120,
        overflow: 'truncate',
      },
    },
    series: [
      {
        name: '当前权重',
        type: 'bar',
        stack: 'total',
        label: {
          show: true,
          formatter: '{c}%',
        },
        data: data.map((item) => (item.currentWeight * 100).toFixed(2)),
      },
      {
        name: '目标权重',
        type: 'bar',
        stack: 'total',
        label: {
          show: true,
          formatter: '{c}%',
        },
        data: data.map((item) => (item.targetWeight * 100).toFixed(2)),
      },
    ],
  }

  // 渲染图表
  weightsChart.value.setOption(option)
}

// 获取相关性矩阵
async function fetchCorrelationMatrix() {
  if (!props.portfolioId || !correlationChartContainer.value) return

  loading.value = true

  try {
    // 获取投资组合持仓
    await portfolioStore.fetchHoldings(props.portfolioId)

    // 在实际实现中，这将调用API
    // 这里使用模拟数据

    // 模拟API调用
    // const result = await enhancedPortfolioPerformanceService.getCorrelationMatrix(props.portfolioId)

    // 模拟数据
    const positions = portfolioStore.positionSummaries
    const symbols = positions.map((p) => p.symbol)
    const names = positions.map((p) => p.name)

    // 生成模拟的相关性矩阵
    const matrix: number[][] = []

    for (let i = 0; i < symbols.length; i++) {
      matrix[i] = []

      for (let j = 0; j < symbols.length; j++) {
        if (i === j) {
          matrix[i][j] = 1 // 对角线为1
        } else if (j < i) {
          matrix[i][j] = matrix[j][i] // 对称矩阵
        } else {
          // 生成0.3到0.9之间的随机相关系数
          matrix[i][j] = 0.3 + Math.random() * 0.6
        }
      }
    }

    // 初始化图表
    if (!correlationChart.value) {
      correlationChart.value = echarts.init(correlationChartContainer.value)
    }

    // 准备图表数据
    const data: Array<[number, number, number]> = []

    for (let i = 0; i < names.length; i++) {
      for (let j = 0; j < names.length; j++) {
        data.push([i, j, matrix[i][j]])
      }
    }

    // 设置图表选项
    const option = {
      title: {
        text: '持仓相关性矩阵',
        left: 'center',
      },
      tooltip: {
        position: 'top',
        formatter: function (params: any) {
          return `${names[params.data[0]]} 与 ${
            names[params.data[1]]
          } 的相关性: ${params.data[2].toFixed(2)}`
        },
      },
      grid: {
        height: '70%',
        top: '10%',
      },
      xAxis: {
        type: 'category',
        data: names,
        splitArea: {
          show: true,
        },
        axisLabel: {
          interval: 0,
          rotate: 45,
          width: 100,
          overflow: 'truncate',
        },
      },
      yAxis: {
        type: 'category',
        data: names,
        splitArea: {
          show: true,
        },
        axisLabel: {
          width: 100,
          overflow: 'truncate',
        },
      },
      visualMap: {
        min: 0,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: ['#e0f5ff', '#51b4ff', '#1929d1'],
        },
      },
      series: [
        {
          name: '相关性',
          type: 'heatmap',
          data: data,
          label: {
            show: false,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    }

    // 渲染图表
    correlationChart.value.setOption(option)

    // 生成相关性洞察
    generateCorrelationInsights(matrix, names)
  } catch (error) {
    console.error('获取相关性矩阵失败:', error)
  } finally {
    loading.value = false
  }
}

// 生成相关性洞察
function generateCorrelationInsights(matrix: number[][], names: string[]) {
  const insights: string[] = []

  // 找出高相关性对
  const highCorrelationPairs: Array<{ i: number; j: number; correlation: number }> = []

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      if (matrix[i][j] > 0.7) {
        highCorrelationPairs.push({ i, j, correlation: matrix[i][j] })
      }
    }
  }

  // 排序并取前5个
  highCorrelationPairs.sort((a, b) => b.correlation - a.correlation)

  if (highCorrelationPairs.length > 0) {
    insights.push(`发现${highCorrelationPairs.length}对高相关性持仓 (相关性 > 0.7)。`)

    for (let i = 0; i < Math.min(5, highCorrelationPairs.length); i++) {
      const pair = highCorrelationPairs[i]
      insights.push(
        `${names[pair.i]}与${names[pair.j]}的相关性为${pair.correlation.toFixed(
          2
        )}，考虑减少其中一个以降低组合风险。`
      )
    }
  } else {
    insights.push('未发现高相关性持仓对，投资组合分散性良好。')
  }

  // 找出低相关性对
  const lowCorrelationPairs: Array<{ i: number; j: number; correlation: number }> = []

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      if (matrix[i][j] < 0.3) {
        lowCorrelationPairs.push({ i, j, correlation: matrix[i][j] })
      }
    }
  }

  // 排序并取前3个
  lowCorrelationPairs.sort((a, b) => a.correlation - b.correlation)

  if (lowCorrelationPairs.length > 0) {
    insights.push(
      `发现${lowCorrelationPairs.length}对低相关性持仓 (相关性 < 0.3)，有助于分散投资组合风险。`
    )

    for (let i = 0; i < Math.min(3, lowCorrelationPairs.length); i++) {
      const pair = lowCorrelationPairs[i]
      insights.push(
        `${names[pair.i]}与${names[pair.j]}的相关性为${pair.correlation.toFixed(
          2
        )}，这种低相关性有助于降低整体波动。`
      )
    }
  }

  // 计算平均相关性
  let sum = 0
  let count = 0

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      sum += matrix[i][j]
      count++
    }
  }

  const avgCorrelation = sum / count

  insights.push(
    `投资组合的平均相关性为${avgCorrelation.toFixed(2)}。${
      avgCorrelation < 0.5
        ? '这表明投资组合具有良好的分散性。'
        : '这表明投资组合可能需要进一步分散。'
    }`
  )

  correlationInsights.value = insights
}

// 生成有效前沿
async function generateEfficientFrontier() {
  if (!props.portfolioId || !frontierChartContainer.value) return

  loading.value = true

  try {
    // 获取投资组合持仓
    await portfolioStore.fetchHoldings(props.portfolioId)

    // 在实际实现中，这将调用API
    // 这里使用模拟数据

    // 模拟API调用
    // const result = await enhancedPortfolioPerformanceService.getEfficientFrontier(props.portfolioId)

    // 模拟数据 - 生成有效前沿点
    const frontierPoints: Array<{ risk: number; return: number; weights: Record<string, number> }> =
      []

    // 生成20个点
    for (let i = 0; i < 20; i++) {
      const risk = 0.05 + i * 0.01
      // 有效前沿是一条凹曲线
      const returnValue = 0.02 + Math.sqrt(risk) * 0.2

      frontierPoints.push({
        risk,
        return: returnValue,
        weights: {}, // 在实际实现中，这将包含每个点的权重
      })
    }

    // 当前投资组合点
    const currentPortfolio = {
      risk: 0.18,
      return: 0.12,
    }

    // 最小风险点
    const minRiskPoint = frontierPoints[0]

    // 最大夏普比率点 (假设无风险利率为2%)
    let maxSharpePoint = frontierPoints[0]
    let maxSharpe = (maxSharpePoint.return - 0.02) / maxSharpePoint.risk

    for (const point of frontierPoints) {
      const sharpe = (point.return - 0.02) / point.risk
      if (sharpe > maxSharpe) {
        maxSharpe = sharpe
        maxSharpePoint = point
      }
    }

    // 初始化图表
    if (!frontierChart.value) {
      frontierChart.value = echarts.init(frontierChartContainer.value)
    }

    // 准备图表数据
    const frontierData = frontierPoints.map((point) => [point.risk * 100, point.return * 100])

    // 设置图表选项
    const option = {
      title: {
        text: '有效前沿',
        left: 'center',
      },
      tooltip: {
        trigger: 'item',
        formatter: function (params: any) {
          if (params.seriesName === '有效前沿') {
            return `风险: ${params.data[0].toFixed(2)}%<br/>收益率: ${params.data[1].toFixed(2)}%`
          } else if (params.seriesName === '当前投资组合') {
            return `当前投资组合<br/>风险: ${params.data[0].toFixed(
              2
            )}%<br/>收益率: ${params.data[1].toFixed(2)}%`
          } else if (params.seriesName === '最小风险投资组合') {
            return `最小风险投资组合<br/>风险: ${params.data[0].toFixed(
              2
            )}%<br/>收益率: ${params.data[1].toFixed(2)}%`
          } else if (params.seriesName === '最大夏普比率投资组合') {
            return `最大夏普比率投资组合<br/>风险: ${params.data[0].toFixed(
              2
            )}%<br/>收益率: ${params.data[1].toFixed(2)}%`
          }
          return ''
        },
      },
      legend: {
        data: ['有效前沿', '当前投资组合', '最小风险投资组合', '最大夏普比率投资组合'],
        top: 30,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: '风险 (%)',
        nameLocation: 'middle',
        nameGap: 30,
        min: 0,
      },
      yAxis: {
        type: 'value',
        name: '收益率 (%)',
        nameLocation: 'middle',
        nameGap: 30,
        min: 0,
      },
      series: [
        {
          name: '有效前沿',
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: frontierData,
          lineStyle: {
            width: 3,
          },
        },
        {
          name: '当前投资组合',
          type: 'scatter',
          symbolSize: 20,
          data: [[currentPortfolio.risk * 100, currentPortfolio.return * 100]],
          itemStyle: {
            color: '#ee6666',
          },
          emphasis: {
            itemStyle: {
              borderColor: '#000',
              borderWidth: 2,
            },
          },
        },
        {
          name: '最小风险投资组合',
          type: 'scatter',
          symbolSize: 20,
          data: [[minRiskPoint.risk * 100, minRiskPoint.return * 100]],
          itemStyle: {
            color: '#73c0de',
          },
          emphasis: {
            itemStyle: {
              borderColor: '#000',
              borderWidth: 2,
            },
          },
        },
        {
          name: '最大夏普比率投资组合',
          type: 'scatter',
          symbolSize: 20,
          data: [[maxSharpePoint.risk * 100, maxSharpePoint.return * 100]],
          itemStyle: {
            color: '#91cc75',
          },
          emphasis: {
            itemStyle: {
              borderColor: '#000',
              borderWidth: 2,
            },
          },
        },
      ],
    }

    // 渲染图表
    frontierChart.value.setOption(option)

    // 更新有效前沿数据
    minRiskPortfolio.value = { return: minRiskPoint.return, risk: minRiskPoint.risk }
    maxSharpePortfolio.value = { return: maxSharpePoint.return, risk: maxSharpePoint.risk }

    // 计算潜在改进空间
    improvementPotential.value = maxSharpePoint.return - currentPortfolio.return

    frontierGenerated.value = true
  } catch (error) {
    console.error('生成有效前沿失败:', error)
  } finally {
    loading.value = false
  }
}

// 格式化百分比
function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}
</script>

<style scoped>
.advanced-portfolio-analytics {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 16px;
}

.section-header {
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.analysis-controls,
.optimization-controls,
.frontier-controls {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.attribution-summary,
.result-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.summary-item {
  flex: 1;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  text-align: center;
}

.summary-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 20px;
  font-weight: 500;
}

.chart-container {
  width: 100%;
  height: 300px;
  margin-bottom: 16px;
}

.correlation-chart,
.frontier-chart {
  height: 500px;
}

.attribution-breakdown,
.weights-table {
  margin-top: 24px;
}

.attribution-breakdown h4,
.weights-table h4,
.correlation-insights h4,
.frontier-insights h4 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 500;
}

.breakdown-chart {
  margin-bottom: 24px;
}

.constraints-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.constraint-item {
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.constraint-label {
  font-size: 14px;
  margin-bottom: 8px;
}

.rebalance-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 16px;
}

.insights-list {
  padding-left: 20px;
  margin-top: 0;
}

.insights-list li {
  margin-bottom: 8px;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.insight-item {
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.insight-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.insight-value {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.insight-desc {
  font-size: 12px;
  color: #909399;
}

.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  background-color: #f5f7fa;
  border-radius: 4px;
  color: #909399;
}

.positive {
  color: #67c23a;
}

.negative {
  color: #f56c6c;
}
</style>
