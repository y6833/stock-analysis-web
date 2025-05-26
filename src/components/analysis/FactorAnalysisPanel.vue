<template>
  <div class="factor-analysis-panel">
    <div class="panel-header">
      <h3>因子分析</h3>
      <div class="controls">
        <el-select v-model="selectedFactorType" placeholder="选择因子类型" @change="onFactorTypeChange">
          <el-option label="全部" value="all" />
          <el-option label="技术指标" value="technical" />
          <el-option label="基本面" value="fundamental" />
          <el-option label="另类数据" value="alternative" />
        </el-select>
        
        <el-button 
          type="primary" 
          :loading="isCalculating" 
          @click="calculateFactors"
        >
          计算因子
        </el-button>
        
        <el-button @click="exportFactors" :disabled="!featureMatrix">
          导出数据
        </el-button>
      </div>
    </div>

    <div v-if="isCalculating" class="loading-container">
      <el-loading-directive />
      <p>正在计算因子数据...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <el-alert :title="error" type="error" show-icon />
    </div>

    <div v-else-if="featureMatrix" class="analysis-content">
      <!-- 因子概览 -->
      <div class="factor-overview">
        <div class="overview-cards">
          <div class="overview-card">
            <div class="card-title">总因子数</div>
            <div class="card-value">{{ featureMatrix.metadata.totalFactors }}</div>
          </div>
          <div class="overview-card">
            <div class="card-title">数据完整度</div>
            <div class="card-value">{{ (100 - featureMatrix.metadata.missingDataRatio * 100).toFixed(1) }}%</div>
          </div>
          <div class="overview-card">
            <div class="card-title">数据范围</div>
            <div class="card-value">{{ formatDateRange(featureMatrix.metadata.dataRange) }}</div>
          </div>
          <div class="overview-card">
            <div class="card-title">最后更新</div>
            <div class="card-value">{{ formatDateTime(featureMatrix.metadata.lastUpdated) }}</div>
          </div>
        </div>
      </div>

      <!-- 因子列表 -->
      <div class="factor-list">
        <h4>因子详情</h4>
        <el-table :data="filteredFactors" stripe>
          <el-table-column prop="factorName" label="因子名称" width="150" />
          <el-table-column prop="factorType" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getFactorTypeColor(row.factorType)">
                {{ getFactorTypeName(row.factorType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="metadata.category" label="分类" width="120" />
          <el-table-column prop="metadata.description" label="描述" />
          <el-table-column prop="currentValue" label="当前值" width="100">
            <template #default="{ row }">
              <span :class="getValueClass(row.currentValue)">
                {{ formatValue(row.currentValue) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button size="small" @click="showFactorChart(row)">
                查看图表
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 因子相关性矩阵 -->
      <div class="correlation-matrix">
        <h4>因子相关性矩阵</h4>
        <div ref="correlationChart" class="correlation-chart"></div>
      </div>

      <!-- 因子重要性排名 -->
      <div class="factor-importance">
        <h4>因子重要性排名</h4>
        <div ref="importanceChart" class="importance-chart"></div>
      </div>
    </div>

    <!-- 因子图表对话框 -->
    <el-dialog 
      v-model="showChartDialog" 
      :title="`${selectedFactor?.factorName} - ${selectedFactor?.metadata.description}`"
      width="80%"
    >
      <div ref="factorChart" class="factor-chart-container"></div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import type { StockData } from '@/types/stock'
import type { FeatureMatrix, FactorResult } from '@/services/featureEngineering/FeatureEngineManager'
import { featureEngineManager } from '@/services/featureEngineering/FeatureEngineManager'

interface Props {
  symbol: string
  stockData: StockData | null
}

const props = defineProps<Props>()

// 响应式数据
const isCalculating = ref(false)
const error = ref<string | null>(null)
const featureMatrix = ref<FeatureMatrix | null>(null)
const selectedFactorType = ref('all')
const showChartDialog = ref(false)
const selectedFactor = ref<FactorResult | null>(null)

// 图表引用
const correlationChart = ref<HTMLElement>()
const importanceChart = ref<HTMLElement>()
const factorChart = ref<HTMLElement>()

// 计算属性
const filteredFactors = computed(() => {
  if (!featureMatrix.value) return []
  
  const factors = Object.values(featureMatrix.value.factors).map(factor => ({
    ...factor,
    currentValue: factor.values[factor.values.length - 1]
  }))
  
  if (selectedFactorType.value === 'all') {
    return factors
  }
  
  return factors.filter(factor => factor.factorType === selectedFactorType.value)
})

// 方法
const calculateFactors = async () => {
  if (!props.stockData) {
    ElMessage.error('缺少股票数据')
    return
  }

  isCalculating.value = true
  error.value = null

  try {
    const configs = featureEngineManager.getDefaultFactorConfigs()
    const result = await featureEngineManager.calculateAllFactors(
      props.symbol,
      props.stockData,
      configs
    )
    
    featureMatrix.value = result
    
    // 渲染图表
    await nextTick()
    renderCorrelationMatrix()
    renderImportanceChart()
    
    ElMessage.success('因子计算完成')
  } catch (err) {
    console.error('因子计算失败:', err)
    error.value = '因子计算失败，请重试'
    ElMessage.error('因子计算失败')
  } finally {
    isCalculating.value = false
  }
}

const onFactorTypeChange = () => {
  // 因子类型变化时的处理
}

const exportFactors = () => {
  if (!featureMatrix.value) return
  
  // 导出因子数据为CSV
  const csvData = generateCSVData()
  downloadCSV(csvData, `${props.symbol}_factors.csv`)
  
  ElMessage.success('数据导出成功')
}

const showFactorChart = (factor: FactorResult) => {
  selectedFactor.value = factor
  showChartDialog.value = true
  
  nextTick(() => {
    renderFactorChart(factor)
  })
}

const renderCorrelationMatrix = () => {
  if (!correlationChart.value || !featureMatrix.value) return
  
  const chart = echarts.init(correlationChart.value)
  const factors = Object.values(featureMatrix.value.factors)
  
  // 计算相关性矩阵
  const correlationMatrix = calculateCorrelationMatrix(factors)
  const factorNames = factors.map(f => f.factorName)
  
  const option = {
    title: {
      text: '因子相关性矩阵'
    },
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        return `${factorNames[params.data[1]]} vs ${factorNames[params.data[0]]}<br/>相关性: ${params.data[2].toFixed(3)}`
      }
    },
    grid: {
      height: '50%',
      top: '10%'
    },
    xAxis: {
      type: 'category',
      data: factorNames,
      splitArea: {
        show: true
      }
    },
    yAxis: {
      type: 'category',
      data: factorNames,
      splitArea: {
        show: true
      }
    },
    visualMap: {
      min: -1,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '15%',
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
      }
    },
    series: [{
      name: '相关性',
      type: 'heatmap',
      data: correlationMatrix,
      label: {
        show: true,
        formatter: (params: any) => params.data[2].toFixed(2)
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

const renderImportanceChart = () => {
  if (!importanceChart.value || !featureMatrix.value) return
  
  const chart = echarts.init(importanceChart.value)
  const factors = Object.values(featureMatrix.value.factors)
  
  // 计算因子重要性（这里使用方差作为重要性指标）
  const importance = factors.map(factor => {
    const validValues = factor.values.filter(v => !isNaN(v))
    if (validValues.length === 0) return { name: factor.factorName, value: 0 }
    
    const mean = validValues.reduce((sum, v) => sum + v, 0) / validValues.length
    const variance = validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / validValues.length
    
    return {
      name: factor.factorName,
      value: Math.sqrt(variance), // 标准差作为重要性
      type: factor.factorType
    }
  }).sort((a, b) => b.value - a.value)
  
  const option = {
    title: {
      text: '因子重要性排名'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: importance.map(item => item.name)
    },
    series: [{
      name: '重要性',
      type: 'bar',
      data: importance.map(item => ({
        value: item.value,
        itemStyle: {
          color: getFactorTypeColor(item.type)
        }
      }))
    }]
  }
  
  chart.setOption(option)
}

const renderFactorChart = (factor: FactorResult) => {
  if (!factorChart.value) return
  
  const chart = echarts.init(factorChart.value)
  
  const option = {
    title: {
      text: factor.metadata.description
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['因子值']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: factor.dates
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      name: '因子值',
      type: 'line',
      data: factor.values,
      smooth: true
    }]
  }
  
  chart.setOption(option)
}

const calculateCorrelationMatrix = (factors: FactorResult[]) => {
  const matrix: [number, number, number][] = []
  
  for (let i = 0; i < factors.length; i++) {
    for (let j = 0; j < factors.length; j++) {
      const correlation = calculateCorrelation(factors[i].values, factors[j].values)
      matrix.push([i, j, correlation])
    }
  }
  
  return matrix
}

const calculateCorrelation = (x: number[], y: number[]): number => {
  if (x.length !== y.length) return 0
  
  const validPairs = x.map((val, i) => ({ x: val, y: y[i] }))
    .filter(pair => !isNaN(pair.x) && !isNaN(pair.y))
  
  if (validPairs.length < 2) return 0
  
  const n = validPairs.length
  const sumX = validPairs.reduce((sum, pair) => sum + pair.x, 0)
  const sumY = validPairs.reduce((sum, pair) => sum + pair.y, 0)
  const sumXY = validPairs.reduce((sum, pair) => sum + pair.x * pair.y, 0)
  const sumX2 = validPairs.reduce((sum, pair) => sum + pair.x * pair.x, 0)
  const sumY2 = validPairs.reduce((sum, pair) => sum + pair.y * pair.y, 0)
  
  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  
  return denominator === 0 ? 0 : numerator / denominator
}

const generateCSVData = (): string => {
  if (!featureMatrix.value) return ''
  
  const factors = Object.values(featureMatrix.value.factors)
  const headers = ['Date', ...factors.map(f => f.factorName)]
  
  const rows = featureMatrix.value.dates.map((date, i) => {
    const row = [date]
    factors.forEach(factor => {
      row.push(factor.values[i]?.toString() || '')
    })
    return row.join(',')
  })
  
  return [headers.join(','), ...rows].join('\n')
}

const downloadCSV = (csvData: string, filename: string) => {
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 工具函数
const getFactorTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    technical: '#409EFF',
    fundamental: '#67C23A',
    alternative: '#E6A23C'
  }
  return colors[type] || '#909399'
}

const getFactorTypeName = (type: string): string => {
  const names: Record<string, string> = {
    technical: '技术',
    fundamental: '基本面',
    alternative: '另类'
  }
  return names[type] || type
}

const getValueClass = (value: number): string => {
  if (isNaN(value)) return 'value-na'
  if (value > 0) return 'value-positive'
  if (value < 0) return 'value-negative'
  return 'value-neutral'
}

const formatValue = (value: number): string => {
  if (isNaN(value)) return 'N/A'
  return value.toFixed(4)
}

const formatDateRange = (range: [string, string]): string => {
  return `${range[0]} ~ ${range[1]}`
}

const formatDateTime = (dateTime: string): string => {
  return new Date(dateTime).toLocaleString()
}

// 监听器
watch(() => props.symbol, () => {
  featureMatrix.value = null
  error.value = null
})

// 生命周期
onMounted(() => {
  if (props.stockData) {
    calculateFactors()
  }
})
</script>

<style scoped>
.factor-analysis-panel {
  width: 100%;
  padding: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.loading-container {
  text-align: center;
  padding: 40px;
}

.error-container {
  margin: 20px 0;
}

.analysis-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.factor-overview {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.overview-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.card-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.factor-list {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.correlation-matrix,
.factor-importance {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.correlation-chart,
.importance-chart {
  height: 400px;
  width: 100%;
}

.factor-chart-container {
  height: 400px;
  width: 100%;
}

.value-positive {
  color: #67C23A;
}

.value-negative {
  color: #F56C6C;
}

.value-neutral {
  color: #909399;
}

.value-na {
  color: #C0C4CC;
}

h4 {
  margin-bottom: 15px;
  color: #333;
}
</style>
