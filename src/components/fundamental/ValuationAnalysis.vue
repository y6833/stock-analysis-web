<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { ValuationAnalysis as ValuationAnalysisType } from '@/types/fundamental'
import * as echarts from 'echarts'

const props = defineProps<{
  symbol: string
  valuation: ValuationAnalysisType | null
  isLoading: boolean
}>()

// 图表引用
const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

// 当前选中的估值指标
const selectedIndicator = ref('pe')

// 估值指标选项
const valuationIndicators = [
  { value: 'pe', label: '市盈率(PE)' },
  { value: 'pb', label: '市净率(PB)' },
  { value: 'ps', label: '市销率(PS)' },
  { value: 'pcf', label: '市现率(PCF)' },
  { value: 'dividend', label: '股息率' },
  { value: 'evToEbitda', label: 'EV/EBITDA' }
]

// 当前选中的指标数据
const currentIndicator = computed(() => {
  if (!props.valuation) return null
  
  return props.valuation[selectedIndicator.value as keyof ValuationAnalysisType] || null
})

// 切换估值指标
const changeIndicator = (indicator: string) => {
  selectedIndicator.value = indicator
  updateChart()
}

// 初始化图表
onMounted(() => {
  if (chartRef.value) {
    chart = echarts.init(chartRef.value)
    updateChart()
    
    // 监听窗口大小变化，调整图表大小
    window.addEventListener('resize', () => {
      chart?.resize()
    })
  }
})

// 更新图表
const updateChart = () => {
  if (!chart || !props.valuation || !currentIndicator.value) return
  
  const indicator = currentIndicator.value
  const historyData = indicator.history || []
  
  // 准备数据
  const dates = historyData.map(item => item.date)
  const values = historyData.map(item => item.value)
  
  // 计算移动平均线
  const ma20 = calculateMA(values, 20)
  
  // 设置图表选项
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: [indicator.name, '20日均线']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      scale: true,
      boundaryGap: false,
      axisLine: { onZero: false },
      splitLine: { show: false },
      axisLabel: {
        formatter: (value: string) => {
          return value.substring(5) // 只显示月-日
        }
      }
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitLine: {
        show: true,
        lineStyle: {
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: indicator.name,
        type: 'line',
        data: values,
        smooth: true,
        lineStyle: {
          width: 2
        },
        markLine: {
          data: [
            { 
              name: '当前值', 
              yAxis: indicator.value,
              lineStyle: {
                color: '#5470c6',
                type: 'solid',
                width: 2
              },
              label: {
                formatter: '当前值: {c}'
              }
            },
            { 
              name: '行业平均', 
              yAxis: indicator.industry,
              lineStyle: {
                color: '#91cc75',
                type: 'dashed',
                width: 2
              },
              label: {
                formatter: '行业平均: {c}'
              }
            },
            { 
              name: '市场平均', 
              yAxis: indicator.market,
              lineStyle: {
                color: '#fac858',
                type: 'dashed',
                width: 2
              },
              label: {
                formatter: '市场平均: {c}'
              }
            }
          ]
        }
      },
      {
        name: '20日均线',
        type: 'line',
        data: ma20,
        smooth: true,
        lineStyle: {
          opacity: 0.5,
          width: 2
        }
      }
    ]
  }
  
  chart.setOption(option)
}

// 计算移动平均线
const calculateMA = (data: number[], dayCount: number) => {
  const result = []
  for (let i = 0; i < data.length; i++) {
    if (i < dayCount - 1) {
      result.push('-')
      continue
    }
    let sum = 0
    for (let j = 0; j < dayCount; j++) {
      sum += data[i - j]
    }
    result.push((sum / dayCount).toFixed(2))
  }
  return result
}

// 获取百分位数描述
const getPercentileDescription = (percentile: number) => {
  if (percentile <= 10) return '极低（历史底部区域）'
  if (percentile <= 30) return '较低（历史低位）'
  if (percentile <= 70) return '适中（历史中位）'
  if (percentile <= 90) return '较高（历史高位）'
  return '极高（历史顶部区域）'
}

// 获取百分位数颜色类名
const getPercentileClass = (percentile: number, isInverse = false) => {
  // 对于市盈率、市净率等，越低越好；对于股息率，越高越好
  if (isInverse) {
    if (percentile <= 30) return 'percentile-high'
    if (percentile <= 70) return 'percentile-medium'
    return 'percentile-low'
  } else {
    if (percentile <= 30) return 'percentile-low'
    if (percentile <= 70) return 'percentile-medium'
    return 'percentile-high'
  }
}

// 判断是否为反向指标（值越低越好）
const isInverseIndicator = (indicator: string) => {
  return indicator !== 'dividend' // 只有股息率是值越高越好
}
</script>

<template>
  <div class="valuation-analysis">
    <div class="valuation-header">
      <h3>估值分析</h3>
    </div>
    
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载估值数据...</p>
    </div>
    
    <div v-else-if="!valuation" class="empty-container">
      <p>暂无估值数据</p>
    </div>
    
    <div v-else class="valuation-content">
      <div class="indicator-tabs">
        <button 
          v-for="indicator in valuationIndicators" 
          :key="indicator.value"
          class="tab-btn"
          :class="{ active: selectedIndicator === indicator.value }"
          @click="changeIndicator(indicator.value)"
        >
          {{ indicator.label }}
        </button>
      </div>
      
      <div v-if="currentIndicator" class="indicator-details">
        <div class="indicator-summary">
          <div class="indicator-value-container">
            <div class="indicator-name">{{ currentIndicator.name }}</div>
            <div class="indicator-value">{{ currentIndicator.value.toFixed(2) }}</div>
            <div class="indicator-description">{{ currentIndicator.description }}</div>
          </div>
          
          <div class="indicator-comparisons">
            <div class="comparison-item">
              <div class="comparison-label">行业平均</div>
              <div class="comparison-value">{{ currentIndicator.industry.toFixed(2) }}</div>
              <div class="comparison-diff" :class="currentIndicator.value < currentIndicator.industry ? 'positive' : 'negative'">
                {{ ((currentIndicator.value - currentIndicator.industry) / currentIndicator.industry * 100).toFixed(2) }}%
              </div>
            </div>
            
            <div class="comparison-item">
              <div class="comparison-label">市场平均</div>
              <div class="comparison-value">{{ currentIndicator.market.toFixed(2) }}</div>
              <div class="comparison-diff" :class="currentIndicator.value < currentIndicator.market ? 'positive' : 'negative'">
                {{ ((currentIndicator.value - currentIndicator.market) / currentIndicator.market * 100).toFixed(2) }}%
              </div>
            </div>
            
            <div class="comparison-item">
              <div class="comparison-label">历史分位数</div>
              <div 
                class="comparison-percentile" 
                :class="getPercentileClass(currentIndicator.percentile, isInverseIndicator(selectedIndicator))"
              >
                {{ currentIndicator.percentile }}%
              </div>
              <div class="comparison-percentile-desc">
                {{ getPercentileDescription(currentIndicator.percentile) }}
              </div>
            </div>
          </div>
        </div>
        
        <div class="indicator-chart-container">
          <div ref="chartRef" class="indicator-chart"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.valuation-analysis {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
}

.valuation-header {
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
}

.valuation-header h3 {
  margin: 0;
  font-size: var(--font-size-md);
  color: var(--primary-color);
}

.loading-container, .empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  gap: var(--spacing-md);
  min-height: 200px;
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
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.valuation-content {
  padding: var(--spacing-md);
}

.indicator-tabs {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-md);
}

.tab-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.tab-btn:hover {
  background-color: var(--bg-tertiary);
}

.tab-btn.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.indicator-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.indicator-summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
}

.indicator-value-container {
  flex: 1;
  min-width: 200px;
}

.indicator-name {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.indicator-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: var(--spacing-xs);
}

.indicator-description {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.indicator-comparisons {
  flex: 2;
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.comparison-item {
  flex: 1;
  min-width: 120px;
}

.comparison-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.comparison-value {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.comparison-diff {
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.positive {
  color: var(--stock-up);
}

.negative {
  color: var(--stock-down);
}

.comparison-percentile {
  font-size: var(--font-size-md);
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
}

.percentile-low {
  color: var(--success-color);
}

.percentile-medium {
  color: var(--warning-color);
}

.percentile-high {
  color: var(--danger-color);
}

.comparison-percentile-desc {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.indicator-chart-container {
  width: 100%;
}

.indicator-chart {
  width: 100%;
  height: 400px;
}

@media (max-width: 768px) {
  .indicator-tabs {
    flex-direction: column;
  }
  
  .tab-btn {
    width: 100%;
    text-align: center;
  }
  
  .indicator-summary {
    flex-direction: column;
  }
  
  .indicator-chart {
    height: 300px;
  }
}
</style>
