<template>
  <div class="portfolio-optimizer">
    <div class="section-header">
      <h3>投资组合优化</h3>
    </div>

    <div class="optimizer-container">
      <div class="optimizer-controls">
        <div class="control-group">
          <h4>优化目标</h4>
          <el-radio-group v-model="optimizationType">
            <el-radio-button label="meanVariance">均值方差优化</el-radio-button>
            <el-radio-button label="minVariance">最小方差</el-radio-button>
            <el-radio-button label="maxSharpe">最大夏普比率</el-radio-button>
            <el-radio-button label="riskParity">风险平价</el-radio-button>
            <el-radio-button label="maxDiversification">最大分散化</el-radio-button>
            <el-radio-button label="equalWeight">等权重</el-radio-button>
          </el-radio-group>
        </div>

        <div class="control-group" v-if="optimizationType !== 'equalWeight'">
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
              <div class="constraint-value">{{ formatPercent(constraints.minWeight) }}</div>
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
              <div class="constraint-value">{{ formatPercent(constraints.maxWeight) }}</div>
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
              <div class="constraint-value">{{ formatPercent(constraints.targetReturn) }}</div>
            </div>
            <div
              class="constraint-item"
              v-if="optimizationType === 'meanVariance' || optimizationType === 'maxSharpe'"
            >
              <div class="constraint-label">风险厌恶系数</div>
              <el-slider v-model="riskAversion" :min="1" :max="10" :step="1" />
              <div class="constraint-value">{{ riskAversion }}</div>
            </div>
          </div>
        </div>

        <div class="control-group">
          <h4>行业约束</h4>
          <el-switch v-model="useSectorConstraints" active-text="启用行业约束" />

          <div v-if="useSectorConstraints" class="sector-constraints">
            <div
              v-for="(constraint, sector) in sectorConstraints"
              :key="sector"
              class="sector-constraint-item"
            >
              <div class="sector-name">{{ sector }}</div>
              <div class="sector-range">
                <el-slider
                  v-model="sectorConstraints[sector]"
                  range
                  :min="0"
                  :max="1"
                  :step="0.01"
                  :format-tooltip="formatPercent"
                />
              </div>
              <div class="sector-values">
                <span>{{ formatPercent(sectorConstraints[sector][0]) }}</span>
                <span>{{ formatPercent(sectorConstraints[sector][1]) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <el-button type="primary" @click="optimizePortfolio" :loading="loading"
            >优化投资组合</el-button
          >
          <el-button @click="resetOptimization">重置</el-button>
        </div>
      </div>

      <div class="optimization-results" v-if="optimizationResult">
        <div class="results-header">
          <h4>优化结果</h4>
          <div class="metrics-summary">
            <div class="metric-item">
              <div class="metric-label">预期收益率</div>
              <div class="metric-value positive">
                {{ formatPercent(optimizationResult.expectedReturn) }}
              </div>
            </div>
            <div class="metric-item">
              <div class="metric-label">预期风险</div>
              <div class="metric-value">{{ formatPercent(optimizationResult.expectedRisk) }}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">夏普比率</div>
              <div
                class="metric-value"
                :class="optimizationResult.sharpeRatio >= 0 ? 'positive' : 'negative'"
              >
                {{ optimizationResult.sharpeRatio.toFixed(2) }}
              </div>
            </div>
          </div>
        </div>

        <div class="results-charts">
          <div class="chart-container">
            <div ref="weightsChartContainer" class="weights-chart"></div>
          </div>
          <div class="chart-container">
            <div ref="sectorChartContainer" class="sector-chart"></div>
          </div>
        </div>

        <div class="weights-table">
          <h4>优化后的权重</h4>
          <el-table :data="weightsTableData" stripe style="width: 100%">
            <el-table-column prop="symbol" label="代码" width="100" />
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="sector" label="行业" />
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
          <el-button>保存为方案</el-button>
        </div>
      </div>

      <div class="no-results" v-else>
        <div class="empty-state">
          <i class="el-icon-data-analysis"></i>
          <p>设置优化参数并点击"优化投资组合"按钮</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { usePortfolioStore } from '@/stores/portfolio/portfolioStore'
import { enhancedPortfolioPerformanceService } from '@/services/portfolio/enhancedPortfolioPerformanceService'
import { OptimizationResult } from '@/types/portfolio'

// 注册必要的ECharts组件
echarts.use([
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  CanvasRenderer,
])

const props = defineProps({
  portfolioId: {
    type: Number,
    required: true,
  },
})

// 状态
const loading = ref(false)
const portfolioStore = usePortfolioStore()
const weightsChartContainer = ref<HTMLElement | null>(null)
const sectorChartContainer = ref<HTMLElement | null>(null)
const weightsChart = ref<echarts.ECharts | null>(null)
const sectorChart = ref<echarts.ECharts | null>(null)

// 优化参数
const optimizationType = ref<
  'meanVariance' | 'minVariance' | 'maxSharpe' | 'riskParity' | 'maxDiversification' | 'equalWeight'
>('meanVariance')
const constraints = ref({
  minWeight: 0.01,
  maxWeight: 0.3,
  targetReturn: 0.1,
})
const riskAversion = ref(5)
const useSectorConstraints = ref(false)
const sectorConstraints = ref<Record<string, [number, number]>>({
  信息技术: [0, 0.4],
  金融: [0, 0.3],
  医疗健康: [0, 0.25],
  消费品: [0, 0.25],
  工业: [0, 0.2],
  能源: [0, 0.15],
  公用事业: [0, 0.15],
  通信服务: [0, 0.15],
  房地产: [0, 0.15],
  材料: [0, 0.15],
})

// 优化结果
const optimizationResult = ref<OptimizationResult | null>(null)
const weightsTableData = ref<
  Array<{
    symbol: string
    name: string
    sector: string
    currentWeight: number
    targetWeight: number
    change: number
  }>
>([])

// 计算当前行业分配
const currentSectorAllocation = computed(() => {
  if (!portfolioStore.positionSummaries.length) return {}

  const totalValue = portfolioStore.positionSummaries.reduce(
    (sum, pos) => sum + pos.currentValue,
    0
  )
  const allocation: Record<string, number> = {}

  for (const position of portfolioStore.positionSummaries) {
    const sector = position.sector || '其他'
    if (!allocation[sector]) {
      allocation[sector] = 0
    }
    allocation[sector] += position.currentValue / totalValue
  }

  return allocation
})

// 计算优化后的行业分配
const optimizedSectorAllocation = computed(() => {
  if (!optimizationResult.value || !weightsTableData.value.length) return {}

  const allocation: Record<string, number> = {}

  for (const row of weightsTableData.value) {
    const sector = row.sector || '其他'
    if (!allocation[sector]) {
      allocation[sector] = 0
    }
    allocation[sector] += row.targetWeight
  }

  return allocation
})

// 初始化
onMounted(async () => {
  await portfolioStore.fetchHoldings(props.portfolioId)

  window.addEventListener('resize', handleResize)
})

// 销毁
onUnmounted(() => {
  if (weightsChart.value) {
    weightsChart.value.dispose()
  }

  if (sectorChart.value) {
    sectorChart.value.dispose()
  }

  window.removeEventListener('resize', handleResize)
})

// 处理窗口大小变化
function handleResize() {
  if (weightsChart.value) {
    weightsChart.value.resize()
  }

  if (sectorChart.value) {
    sectorChart.value.resize()
  }
}

// 优化投资组合
async function optimizePortfolio() {
  if (!props.portfolioId) return

  loading.value = true

  try {
    // 在实际实现中，这将调用API
    // 这里使用模拟数据

    // 模拟API调用
    // const result = await enhancedPortfolioPerformanceService.optimizePortfolio({
    //   portfolioId: props.portfolioId,
    //   optimizationType: optimizationType.value,
    //   constraints: {
    //     minWeight: constraints.value.minWeight,
    //     maxWeight: constraints.value.maxWeight,
    //     targetReturn: constraints.value.targetReturn,
    //     sectorConstraints: useSectorConstraints.value ? sectorConstraints.value : undefined
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
        } else if (optimizationType.value === 'maxDiversification') {
          // 最大分散化 - 增加相关性低的股票权重
          weight = weight * (1 + Math.random() * 0.5)
        } else {
          // 均值方差
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

      // 如果启用了行业约束
      if (useSectorConstraints.value) {
        // 计算行业权重
        const sectorWeights: Record<string, number> = {}
        positions.forEach((pos) => {
          const sector = pos.sector || '其他'
          if (!sectorWeights[sector]) {
            sectorWeights[sector] = 0
          }
          sectorWeights[sector] += optimizedWeights[pos.symbol]
        })

        // 应用行业约束
        for (const sector in sectorConstraints.value) {
          if (sectorWeights[sector]) {
            const [min, max] = sectorConstraints.value[sector]
            if (sectorWeights[sector] < min || sectorWeights[sector] > max) {
              // 调整该行业的权重
              const targetWeight = sectorWeights[sector] < min ? min : max
              const scaleFactor = targetWeight / sectorWeights[sector]

              // 调整该行业内的股票权重
              positions.forEach((pos) => {
                if (pos.sector === sector) {
                  optimizedWeights[pos.symbol] *= scaleFactor
                }
              })
            }
          }
        }
      }

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
        sector: pos.sector || '其他',
        currentWeight: currentWeights[pos.symbol],
        targetWeight: optimizedWeights[pos.symbol],
        change: optimizedWeights[pos.symbol] - currentWeights[pos.symbol],
      }))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))

    // 渲染图表
    renderWeightsChart()
    renderSectorChart()
  } catch (error) {
    console.error('优化投资组合失败:', error)
  } finally {
    loading.value = false
  }
}

// 重置优化
function resetOptimization() {
  optimizationResult.value = null
  weightsTableData.value = []

  // 重置参数
  optimizationType.value = 'meanVariance'
  constraints.value = {
    minWeight: 0.01,
    maxWeight: 0.3,
    targetReturn: 0.1,
  }
  riskAversion.value = 5
  useSectorConstraints.value = false
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
        data: data.map((item) => (item.currentWeight * 100).toFixed(2)),
      },
      {
        name: '目标权重',
        type: 'bar',
        data: data.map((item) => (item.targetWeight * 100).toFixed(2)),
      },
    ],
  }

  // 渲染图表
  weightsChart.value.setOption(option)
}

// 渲染行业图表
function renderSectorChart() {
  if (!sectorChartContainer.value || !optimizationResult.value) return

  // 初始化图表
  if (!sectorChart.value) {
    sectorChart.value = echarts.init(sectorChartContainer.value)
  }

  // 准备图表数据
  const currentSectors = currentSectorAllocation.value
  const optimizedSectors = optimizedSectorAllocation.value

  // 合并所有行业
  const allSectors = new Set([...Object.keys(currentSectors), ...Object.keys(optimizedSectors)])

  const sectorNames = Array.from(allSectors)
  const currentData = sectorNames.map((sector) => (currentSectors[sector] || 0) * 100)
  const optimizedData = sectorNames.map((sector) => (optimizedSectors[sector] || 0) * 100)

  // 设置图表选项
  const option = {
    title: {
      text: '行业分配对比',
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
                ${current.marker}当前分配: ${current.value.toFixed(2)}%<br/>
                ${target.marker}优化后: ${target.value.toFixed(2)}%<br/>
                变化: ${(target.value - current.value).toFixed(2)}%`
      },
    },
    legend: {
      data: ['当前分配', '优化后'],
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
      data: sectorNames,
    },
    series: [
      {
        name: '当前分配',
        type: 'bar',
        data: currentData,
      },
      {
        name: '优化后',
        type: 'bar',
        data: optimizedData,
      },
    ],
  }

  // 渲染图表
  sectorChart.value.setOption(option)
}

// 格式化百分比
function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}
</script>

<style scoped>
.portfolio-optimizer {
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

.optimizer-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.optimizer-controls {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.control-group {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 16px;
}

.control-group h4 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 500;
}

.constraints-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
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

.constraint-value {
  font-size: 14px;
  color: #606266;
  margin-top: 8px;
  text-align: right;
}

.sector-constraints {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sector-constraint-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sector-name {
  width: 100px;
  font-size: 14px;
}

.sector-range {
  flex: 1;
}

.sector-values {
  width: 120px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #606266;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 16px;
}

.optimization-results {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 16px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.results-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.metrics-summary {
  display: flex;
  gap: 16px;
}

.metric-item {
  text-align: center;
  padding: 8px 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
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

.results-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.chart-container {
  height: 300px;
}

.weights-chart,
.sector-chart {
  width: 100%;
  height: 100%;
}

.weights-table {
  margin-bottom: 16px;
}

.weights-table h4 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 500;
}

.rebalance-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}

.no-results {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #909399;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
}

.positive {
  color: #67c23a;
}

.negative {
  color: #f56c6c;
}

@media (max-width: 768px) {
  .results-charts {
    grid-template-columns: 1fr;
  }
}
</style>
