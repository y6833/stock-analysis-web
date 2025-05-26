<template>
  <div class="strategy-dashboard">
    <div class="dashboard-header">
      <h2>策略管理中心</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          创建策略
        </el-button>
        <el-button @click="refreshStrategies">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 策略概览卡片 -->
    <div class="overview-cards">
      <div class="overview-card">
        <div class="card-icon">
          <el-icon><TrendCharts /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-title">活跃策略</div>
          <div class="card-value">{{ activeStrategies.length }}</div>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon">
          <el-icon><Money /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-title">总收益率</div>
          <div class="card-value" :class="totalReturnClass">
            {{ formatPercentage(totalReturn) }}
          </div>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon">
          <el-icon><DataAnalysis /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-title">平均夏普比率</div>
          <div class="card-value">{{ avgSharpeRatio.toFixed(2) }}</div>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon">
          <el-icon><Warning /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-title">最大回撤</div>
          <div class="card-value text-danger">
            {{ formatPercentage(maxDrawdown) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 策略列表 -->
    <div class="strategy-list">
      <div class="list-header">
        <h3>策略列表</h3>
        <div class="list-filters">
          <el-select v-model="filterType" placeholder="策略类型" clearable>
            <el-option label="全部" value="" />
            <el-option label="因子策略" value="factor" />
            <el-option label="机器学习" value="ml" />
            <el-option label="择时策略" value="timing" />
            <el-option label="组合策略" value="portfolio" />
          </el-select>
          <el-select v-model="filterStatus" placeholder="状态" clearable>
            <el-option label="全部" value="" />
            <el-option label="运行中" value="running" />
            <el-option label="已停止" value="stopped" />
            <el-option label="优化中" value="optimizing" />
          </el-select>
        </div>
      </div>

      <el-table :data="filteredStrategies" stripe>
        <el-table-column prop="name" label="策略名称" width="200">
          <template #default="{ row }">
            <div class="strategy-name">
              <el-tag :type="getStrategyTypeColor(row.type)" size="small">
                {{ getStrategyTypeName(row.type) }}
              </el-tag>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="performance" label="绩效指标" width="300">
          <template #default="{ row }">
            <div class="performance-metrics">
              <div class="metric">
                <span class="label">收益率:</span>
                <span :class="getReturnClass(row.performance?.totalReturn)">
                  {{ formatPercentage(row.performance?.totalReturn) }}
                </span>
              </div>
              <div class="metric">
                <span class="label">夏普:</span>
                <span>{{ row.performance?.sharpeRatio?.toFixed(2) || 'N/A' }}</span>
              </div>
              <div class="metric">
                <span class="label">回撤:</span>
                <span class="text-danger">
                  {{ formatPercentage(row.performance?.maxDrawdown) }}
                </span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="riskLevel" label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getRiskLevelColor(row.riskLevel)">
              {{ getRiskLevelName(row.riskLevel) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="enabled" label="状态" width="80">
          <template #default="{ row }">
            <el-switch
              v-model="row.enabled"
              @change="toggleStrategy(row)"
            />
          </template>
        </el-table-column>

        <el-table-column prop="updatedAt" label="更新时间" width="150">
          <template #default="{ row }">
            {{ formatDateTime(row.updatedAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="viewStrategy(row)">
              详情
            </el-button>
            <el-button size="small" type="warning" @click="optimizeStrategy(row)">
              优化
            </el-button>
            <el-button size="small" type="danger" @click="deleteStrategy(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 策略绩效图表 -->
    <div class="performance-charts">
      <div class="chart-container">
        <h3>策略收益曲线</h3>
        <div ref="returnChart" class="chart"></div>
      </div>
      <div class="chart-container">
        <h3>风险收益散点图</h3>
        <div ref="riskReturnChart" class="chart"></div>
      </div>
    </div>

    <!-- 创建策略对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      title="创建新策略"
      width="600px"
    >
      <StrategyCreateForm
        @created="onStrategyCreated"
        @cancel="showCreateDialog = false"
      />
    </el-dialog>

    <!-- 策略详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      :title="selectedStrategy?.name"
      width="80%"
      top="5vh"
    >
      <StrategyDetailPanel
        v-if="selectedStrategy"
        :strategy="selectedStrategy"
        @updated="onStrategyUpdated"
      />
    </el-dialog>

    <!-- 策略优化对话框 -->
    <el-dialog
      v-model="showOptimizeDialog"
      title="策略优化"
      width="70%"
    >
      <StrategyOptimizePanel
        v-if="optimizingStrategy"
        :strategy="optimizingStrategy"
        @optimized="onStrategyOptimized"
        @cancel="showOptimizeDialog = false"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, TrendCharts, Money, DataAnalysis, Warning } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import type { StrategyConfig } from '@/services/strategy/StrategyManager'
import { strategyManager } from '@/services/strategy/StrategyManager'
import StrategyCreateForm from './StrategyCreateForm.vue'
import StrategyDetailPanel from './StrategyDetailPanel.vue'
import StrategyOptimizePanel from './StrategyOptimizePanel.vue'

// 响应式数据
const strategies = ref<StrategyConfig[]>([])
const filterType = ref('')
const filterStatus = ref('')
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showOptimizeDialog = ref(false)
const selectedStrategy = ref<StrategyConfig | null>(null)
const optimizingStrategy = ref<StrategyConfig | null>(null)

// 图表引用
const returnChart = ref<HTMLElement>()
const riskReturnChart = ref<HTMLElement>()

// 计算属性
const activeStrategies = computed(() => 
  strategies.value.filter(s => s.enabled)
)

const filteredStrategies = computed(() => {
  return strategies.value.filter(strategy => {
    const typeMatch = !filterType.value || strategy.type === filterType.value
    const statusMatch = !filterStatus.value || 
      (filterStatus.value === 'running' && strategy.enabled) ||
      (filterStatus.value === 'stopped' && !strategy.enabled)
    
    return typeMatch && statusMatch
  })
})

const totalReturn = computed(() => {
  if (strategies.value.length === 0) return 0
  // 模拟总收益率计算
  return strategies.value.reduce((sum, s) => sum + (Math.random() * 0.3 - 0.1), 0) / strategies.value.length
})

const avgSharpeRatio = computed(() => {
  if (strategies.value.length === 0) return 0
  // 模拟夏普比率计算
  return strategies.value.reduce((sum, s) => sum + (Math.random() * 2), 0) / strategies.value.length
})

const maxDrawdown = computed(() => {
  if (strategies.value.length === 0) return 0
  // 模拟最大回撤计算
  return Math.max(...strategies.value.map(s => Math.random() * 0.2))
})

const totalReturnClass = computed(() => ({
  'text-success': totalReturn.value > 0,
  'text-danger': totalReturn.value < 0
}))

// 方法
const refreshStrategies = async () => {
  try {
    strategies.value = strategyManager.getStrategies()
    
    // 为每个策略添加模拟绩效数据
    strategies.value.forEach(strategy => {
      if (!strategy.performance) {
        strategy.performance = {
          totalReturn: Math.random() * 0.4 - 0.1,
          annualizedReturn: Math.random() * 0.3 - 0.05,
          volatility: Math.random() * 0.3 + 0.1,
          sharpeRatio: Math.random() * 2 - 0.5,
          maxDrawdown: Math.random() * 0.25 + 0.05,
          winRate: Math.random() * 0.4 + 0.4,
          profitFactor: Math.random() * 2 + 0.5,
          calmarRatio: Math.random() * 1.5,
          informationRatio: Math.random() * 1.5 - 0.5,
          beta: Math.random() * 0.5 + 0.75,
          alpha: Math.random() * 0.1 - 0.05,
          trackingError: Math.random() * 0.05 + 0.01
        }
      }
    })

    await nextTick()
    renderCharts()
    
    ElMessage.success('策略列表已刷新')
  } catch (error) {
    console.error('刷新策略失败:', error)
    ElMessage.error('刷新策略失败')
  }
}

const toggleStrategy = async (strategy: StrategyConfig) => {
  try {
    const updated = strategyManager.updateStrategyConfig(strategy.id, {
      enabled: strategy.enabled
    })
    
    if (updated) {
      ElMessage.success(`策略 ${strategy.name} ${strategy.enabled ? '已启用' : '已停用'}`)
    }
  } catch (error) {
    console.error('切换策略状态失败:', error)
    ElMessage.error('操作失败')
  }
}

const viewStrategy = (strategy: StrategyConfig) => {
  selectedStrategy.value = strategy
  showDetailDialog.value = true
}

const optimizeStrategy = (strategy: StrategyConfig) => {
  optimizingStrategy.value = strategy
  showOptimizeDialog.value = true
}

const deleteStrategy = async (strategy: StrategyConfig) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除策略 "${strategy.name}" 吗？此操作不可撤销。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const removed = strategyManager.removeStrategy(strategy.id)
    if (removed) {
      await refreshStrategies()
      ElMessage.success('策略已删除')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除策略失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const onStrategyCreated = async (strategy: StrategyConfig) => {
  showCreateDialog.value = false
  await refreshStrategies()
  ElMessage.success('策略创建成功')
}

const onStrategyUpdated = async () => {
  showDetailDialog.value = false
  await refreshStrategies()
  ElMessage.success('策略更新成功')
}

const onStrategyOptimized = async () => {
  showOptimizeDialog.value = false
  await refreshStrategies()
  ElMessage.success('策略优化完成')
}

const renderCharts = () => {
  renderReturnChart()
  renderRiskReturnChart()
}

const renderReturnChart = () => {
  if (!returnChart.value) return

  const chart = echarts.init(returnChart.value)
  
  // 生成模拟收益曲线数据
  const dates = []
  const returns = []
  const baseDate = new Date()
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(baseDate)
    date.setDate(date.getDate() - (29 - i))
    dates.push(date.toISOString().split('T')[0])
    
    const dailyReturn = (Math.random() - 0.5) * 0.02
    const cumulativeReturn = i === 0 ? dailyReturn : returns[i - 1] + dailyReturn
    returns.push(cumulativeReturn)
  }

  const option = {
    title: {
      text: '策略收益曲线'
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: dates
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [{
      name: '累计收益率',
      type: 'line',
      data: returns.map(r => (r * 100).toFixed(2)),
      smooth: true,
      lineStyle: {
        color: '#409EFF'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0, color: 'rgba(64, 158, 255, 0.3)'
          }, {
            offset: 1, color: 'rgba(64, 158, 255, 0.1)'
          }]
        }
      }
    }]
  }

  chart.setOption(option)
}

const renderRiskReturnChart = () => {
  if (!riskReturnChart.value) return

  const chart = echarts.init(riskReturnChart.value)
  
  const data = strategies.value.map(strategy => [
    (strategy.performance?.volatility || 0) * 100,
    (strategy.performance?.annualizedReturn || 0) * 100,
    strategy.name
  ])

  const option = {
    title: {
      text: '风险收益散点图'
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `${params.data[2]}<br/>风险: ${params.data[0].toFixed(2)}%<br/>收益: ${params.data[1].toFixed(2)}%`
      }
    },
    xAxis: {
      type: 'value',
      name: '风险 (%)',
      nameLocation: 'middle',
      nameGap: 30
    },
    yAxis: {
      type: 'value',
      name: '收益 (%)',
      nameLocation: 'middle',
      nameGap: 40
    },
    series: [{
      type: 'scatter',
      data,
      symbolSize: 20,
      itemStyle: {
        color: '#67C23A'
      }
    }]
  }

  chart.setOption(option)
}

// 工具函数
const getStrategyTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    factor: 'primary',
    ml: 'success',
    timing: 'warning',
    portfolio: 'info'
  }
  return colors[type] || 'default'
}

const getStrategyTypeName = (type: string): string => {
  const names: Record<string, string> = {
    factor: '因子',
    ml: 'ML',
    timing: '择时',
    portfolio: '组合'
  }
  return names[type] || type
}

const getRiskLevelColor = (level: string): string => {
  const colors: Record<string, string> = {
    low: 'success',
    medium: 'warning',
    high: 'danger'
  }
  return colors[level] || 'default'
}

const getRiskLevelName = (level: string): string => {
  const names: Record<string, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险'
  }
  return names[level] || level
}

const getReturnClass = (returnValue?: number): string => {
  if (!returnValue) return ''
  return returnValue > 0 ? 'text-success' : 'text-danger'
}

const formatPercentage = (value?: number): string => {
  if (value === undefined || value === null) return 'N/A'
  return `${(value * 100).toFixed(2)}%`
}

const formatDateTime = (dateTime: string): string => {
  return new Date(dateTime).toLocaleDateString()
}

// 生命周期
onMounted(() => {
  refreshStrategies()
})
</script>

<style scoped>
.strategy-dashboard {
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.overview-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 15px;
}

.card-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #f0f9ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #409EFF;
  font-size: 24px;
}

.card-content {
  flex: 1;
}

.card-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.strategy-list {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 30px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-filters {
  display: flex;
  gap: 10px;
}

.strategy-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.performance-metrics {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.metric .label {
  color: #666;
}

.performance-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.chart {
  height: 300px;
  width: 100%;
}

.text-success {
  color: #67C23A;
}

.text-danger {
  color: #F56C6C;
}

h2, h3 {
  margin: 0 0 10px 0;
  color: #333;
}
</style>
