<template>
  <div class="strategy-visualization">
    <!-- 策略概览 -->
    <div class="strategy-overview">
      <el-card class="overview-card">
        <template #header>
          <div class="card-header">
            <span>策略概览</span>
            <el-button type="primary" size="small" @click="refreshData">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </template>
        
        <div class="overview-grid">
          <div class="metric-item">
            <div class="metric-label">总收益率</div>
            <div class="metric-value" :class="getReturnClass(performance.totalReturn)">
              {{ formatPercent(performance.totalReturn) }}
            </div>
          </div>
          
          <div class="metric-item">
            <div class="metric-label">年化收益率</div>
            <div class="metric-value" :class="getReturnClass(performance.annualizedReturn)">
              {{ formatPercent(performance.annualizedReturn) }}
            </div>
          </div>
          
          <div class="metric-item">
            <div class="metric-label">夏普比率</div>
            <div class="metric-value" :class="getSharpeClass(performance.sharpeRatio)">
              {{ performance.sharpeRatio.toFixed(2) }}
            </div>
          </div>
          
          <div class="metric-item">
            <div class="metric-label">最大回撤</div>
            <div class="metric-value negative">
              {{ formatPercent(performance.maxDrawdown) }}
            </div>
          </div>
          
          <div class="metric-item">
            <div class="metric-label">胜率</div>
            <div class="metric-value" :class="getWinRateClass(performance.winRate)">
              {{ formatPercent(performance.winRate) }}
            </div>
          </div>
          
          <div class="metric-item">
            <div class="metric-label">信息比率</div>
            <div class="metric-value">
              {{ performance.informationRatio.toFixed(2) }}
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <el-row :gutter="20">
        <!-- 净值曲线 -->
        <el-col :span="12">
          <el-card>
            <template #header>
              <span>净值曲线</span>
            </template>
            <div ref="netValueChart" class="chart-container"></div>
          </el-card>
        </el-col>
        
        <!-- 回撤曲线 -->
        <el-col :span="12">
          <el-card>
            <template #header>
              <span>回撤分析</span>
            </template>
            <div ref="drawdownChart" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
      
      <el-row :gutter="20" style="margin-top: 20px;">
        <!-- 收益分布 -->
        <el-col :span="12">
          <el-card>
            <template #header>
              <span>收益分布</span>
            </template>
            <div ref="returnDistChart" class="chart-container"></div>
          </el-card>
        </el-col>
        
        <!-- 持仓分析 -->
        <el-col :span="12">
          <el-card>
            <template #header>
              <span>持仓分析</span>
            </template>
            <div ref="positionChart" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 信号分析 -->
    <div class="signals-section">
      <el-card>
        <template #header>
          <span>交易信号分析</span>
        </template>
        
        <el-table :data="recentSignals" style="width: 100%">
          <el-table-column prop="timestamp" label="时间" width="180">
            <template #default="scope">
              {{ formatDateTime(scope.row.timestamp) }}
            </template>
          </el-table-column>
          <el-table-column prop="symbol" label="股票代码" width="120" />
          <el-table-column prop="action" label="操作" width="80">
            <template #default="scope">
              <el-tag :type="getActionType(scope.row.action)">
                {{ getActionText(scope.row.action) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="strength" label="信号强度" width="100">
            <template #default="scope">
              <el-progress 
                :percentage="scope.row.strength * 100" 
                :stroke-width="8"
                :show-text="false"
              />
            </template>
          </el-table-column>
          <el-table-column prop="confidence" label="置信度" width="100">
            <template #default="scope">
              {{ formatPercent(scope.row.confidence) }}
            </template>
          </el-table-column>
          <el-table-column prop="price" label="价格" width="100">
            <template #default="scope">
              ¥{{ scope.row.price.toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="100" />
          <el-table-column prop="reason" label="原因" min-width="200" />
        </el-table>
      </el-card>
    </div>

    <!-- 风险指标 -->
    <div class="risk-metrics">
      <el-card>
        <template #header>
          <span>风险指标</span>
        </template>
        
        <div class="risk-grid">
          <div class="risk-item">
            <div class="risk-label">95% VaR</div>
            <div class="risk-value">{{ formatPercent(riskMetrics.var95) }}</div>
          </div>
          
          <div class="risk-item">
            <div class="risk-label">99% VaR</div>
            <div class="risk-value">{{ formatPercent(riskMetrics.var99) }}</div>
          </div>
          
          <div class="risk-item">
            <div class="risk-label">波动率</div>
            <div class="risk-value">{{ formatPercent(riskMetrics.volatility) }}</div>
          </div>
          
          <div class="risk-item">
            <div class="risk-label">Beta系数</div>
            <div class="risk-value">{{ riskMetrics.beta.toFixed(2) }}</div>
          </div>
          
          <div class="risk-item">
            <div class="risk-label">集中度</div>
            <div class="risk-value">{{ formatPercent(riskMetrics.concentration) }}</div>
          </div>
          
          <div class="risk-item">
            <div class="risk-label">相关性</div>
            <div class="risk-value">{{ riskMetrics.correlation.toFixed(2) }}</div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { ElCard, ElButton, ElIcon, ElRow, ElCol, ElTable, ElTableColumn, ElTag, ElProgress } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import type { StrategyPerformance, RiskMetrics, StrategySignal } from '@/services/strategy/StrategyManager'

// Props
interface Props {
  strategyId: string
  performance: StrategyPerformance
  riskMetrics: RiskMetrics
  signals: StrategySignal[]
  netValueData?: number[]
  drawdownData?: number[]
  positionData?: any[]
}

const props = withDefaults(defineProps<Props>(), {
  netValueData: () => [],
  drawdownData: () => [],
  positionData: () => []
})

// Refs
const netValueChart = ref<HTMLElement>()
const drawdownChart = ref<HTMLElement>()
const returnDistChart = ref<HTMLElement>()
const positionChart = ref<HTMLElement>()

// Data
const recentSignals = ref<StrategySignal[]>([])

// Computed
const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(2)}%`
}

const formatDateTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString()
}

const getReturnClass = (value: number) => {
  return value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
}

const getSharpeClass = (value: number) => {
  return value > 1 ? 'positive' : value > 0.5 ? 'neutral' : 'negative'
}

const getWinRateClass = (value: number) => {
  return value > 0.6 ? 'positive' : value > 0.4 ? 'neutral' : 'negative'
}

const getActionType = (action: string) => {
  switch (action) {
    case 'buy': return 'success'
    case 'sell': return 'danger'
    default: return 'info'
  }
}

const getActionText = (action: string) => {
  switch (action) {
    case 'buy': return '买入'
    case 'sell': return '卖出'
    case 'hold': return '持有'
    default: return action
  }
}

// Methods
const refreshData = () => {
  // 刷新数据逻辑
  console.log('刷新策略数据')
}

const initCharts = () => {
  nextTick(() => {
    initNetValueChart()
    initDrawdownChart()
    initReturnDistChart()
    initPositionChart()
  })
}

const initNetValueChart = () => {
  if (!netValueChart.value) return
  
  const chart = echarts.init(netValueChart.value)
  const option = {
    title: {
      text: '策略净值走势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: props.netValueData.map((_, i) => `Day ${i + 1}`)
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      name: '净值',
      type: 'line',
      data: props.netValueData,
      smooth: true,
      lineStyle: {
        color: '#409EFF'
      }
    }]
  }
  chart.setOption(option)
}

const initDrawdownChart = () => {
  if (!drawdownChart.value) return
  
  const chart = echarts.init(drawdownChart.value)
  const option = {
    title: {
      text: '回撤分析',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: props.drawdownData.map((_, i) => `Day ${i + 1}`)
    },
    yAxis: {
      type: 'value',
      max: 0
    },
    series: [{
      name: '回撤',
      type: 'line',
      data: props.drawdownData,
      areaStyle: {
        color: '#F56C6C'
      },
      lineStyle: {
        color: '#F56C6C'
      }
    }]
  }
  chart.setOption(option)
}

const initReturnDistChart = () => {
  if (!returnDistChart.value) return
  
  const chart = echarts.init(returnDistChart.value)
  // 模拟收益分布数据
  const data = Array.from({ length: 20 }, (_, i) => Math.random() * 100)
  
  const option = {
    title: {
      text: '收益分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: data.map((_, i) => `${i - 10}%`)
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      name: '频次',
      type: 'bar',
      data: data,
      itemStyle: {
        color: '#67C23A'
      }
    }]
  }
  chart.setOption(option)
}

const initPositionChart = () => {
  if (!positionChart.value) return
  
  const chart = echarts.init(positionChart.value)
  const data = props.positionData.length > 0 ? props.positionData : [
    { name: '股票A', value: 25 },
    { name: '股票B', value: 20 },
    { name: '股票C', value: 15 },
    { name: '股票D', value: 10 },
    { name: '现金', value: 30 }
  ]
  
  const option = {
    title: {
      text: '持仓分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'item'
    },
    series: [{
      name: '持仓比例',
      type: 'pie',
      radius: '50%',
      data: data,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }
  chart.setOption(option)
}

// Lifecycle
onMounted(() => {
  recentSignals.value = props.signals.slice(-10) // 显示最近10个信号
  initCharts()
})
</script>

<style scoped>
.strategy-visualization {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.metric-item {
  text-align: center;
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.metric-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
}

.metric-value.positive {
  color: #67c23a;
}

.metric-value.negative {
  color: #f56c6c;
}

.metric-value.neutral {
  color: #e6a23c;
}

.charts-section {
  margin-top: 20px;
}

.chart-container {
  height: 300px;
}

.signals-section {
  margin-top: 20px;
}

.risk-metrics {
  margin-top: 20px;
}

.risk-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.risk-item {
  text-align: center;
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.risk-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.risk-value {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}
</style>
