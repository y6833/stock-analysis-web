<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { IndustryComparison as IndustryComparisonType } from '@/types/fundamental'
import * as echarts from 'echarts'

const props = defineProps<{
  symbol: string
  comparison: IndustryComparisonType | null
  isLoading: boolean
}>()

// 图表引用
const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

// 当前选中的对比指标
const selectedIndicator = ref('roe')

// 对比指标选项
const comparisonIndicators = [
  { value: 'revenue', label: '营业收入' },
  { value: 'netProfit', label: '净利润' },
  { value: 'grossMargin', label: '毛利率' },
  { value: 'netMargin', label: '净利率' },
  { value: 'roe', label: '净资产收益率(ROE)' },
  { value: 'debtToAsset', label: '资产负债率' },
  { value: 'pe', label: '市盈率(PE)' },
  { value: 'pb', label: '市净率(PB)' },
]

// 当前选中的指标数据
const currentIndicator = computed(() => {
  if (!props.comparison) return null

  return (
    props.comparison.items[selectedIndicator.value as keyof typeof props.comparison.items] || null
  )
})

// 切换对比指标
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
  if (!chart || !props.comparison || !currentIndicator.value) return

  const indicator = currentIndicator.value

  // 准备数据
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
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
        formatter: '{value}',
      },
    },
    yAxis: {
      type: 'category',
      data: ['行业最低', '行业平均', '本公司', '行业最高'],
      axisLine: { onZero: false },
    },
    series: [
      {
        name: indicator.name,
        type: 'bar',
        data: [
          {
            value: indicator.industryMin,
            itemStyle: { color: '#91cc75' },
          },
          {
            value: indicator.industryAvg,
            itemStyle: { color: '#5470c6' },
          },
          {
            value: indicator.value,
            itemStyle: { color: '#ee6666' },
          },
          {
            value: indicator.industryMax,
            itemStyle: { color: '#73c0de' },
          },
        ],
        label: {
          show: true,
          position: 'right',
          formatter: '{c}',
        },
      },
    ],
  }

  chart.setOption(option)
}

// 获取排名描述
const getRankDescription = (rank: number, total: number) => {
  const percentile = Math.round(((total - rank) / total) * 100)

  if (percentile >= 90) return '极佳（行业前10%）'
  if (percentile >= 75) return '优秀（行业前25%）'
  if (percentile >= 50) return '良好（行业前50%）'
  if (percentile >= 25) return '一般（行业后50%）'
  return '较差（行业后25%）'
}

// 获取排名颜色类名
const getRankClass = (rank: number, total: number, isInverse = false) => {
  const percentile = ((total - rank) / total) * 100

  // 对于资产负债率等，越低越好；对于ROE等，越高越好
  if (isInverse) {
    if (percentile >= 75) return 'rank-low'
    if (percentile >= 25) return 'rank-medium'
    return 'rank-high'
  } else {
    if (percentile >= 75) return 'rank-high'
    if (percentile >= 25) return 'rank-medium'
    return 'rank-low'
  }
}

// 判断是否为反向指标（值越低越好）
const isInverseIndicator = (indicator: string) => {
  return indicator === 'debtToAsset' || indicator === 'pe' || indicator === 'pb'
}
</script>

<template>
  <div class="industry-comparison">
    <div class="comparison-header">
      <h3>行业对比</h3>
      <div v-if="!isLoading && comparison" class="industry-info">
        <span>{{ comparison.industry }}</span>
        <span>共{{ comparison.companyCount }}家公司</span>
      </div>
    </div>

    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载行业对比数据...</p>
    </div>

    <div v-else-if="!comparison" class="empty-container">
      <p>暂无行业对比数据</p>
    </div>

    <div v-else class="comparison-content">
      <div class="indicator-tabs">
        <button
          v-for="indicator in comparisonIndicators"
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
            <div class="indicator-value">
              {{
                typeof currentIndicator.value === 'number'
                  ? currentIndicator.value.toFixed(2)
                  : currentIndicator.value
              }}
            </div>
          </div>

          <div class="indicator-rank">
            <div class="rank-label">行业排名</div>
            <div
              class="rank-value"
              :class="
                getRankClass(
                  currentIndicator.rank,
                  currentIndicator.totalCompanies,
                  isInverseIndicator(selectedIndicator)
                )
              "
            >
              {{ currentIndicator.rank }} / {{ currentIndicator.totalCompanies }}
            </div>
            <div class="rank-description">
              {{ getRankDescription(currentIndicator.rank, currentIndicator.totalCompanies) }}
            </div>
          </div>

          <div class="indicator-percentile">
            <div class="percentile-label">行业分位数</div>
            <div
              class="percentile-value"
              :class="
                getRankClass(
                  currentIndicator.rank,
                  currentIndicator.totalCompanies,
                  isInverseIndicator(selectedIndicator)
                )
              "
            >
              {{ currentIndicator.percentile }}%
            </div>
            <div class="percentile-bar">
              <div
                class="percentile-progress"
                :style="{ width: `${currentIndicator.percentile}%` }"
                :class="
                  getRankClass(
                    currentIndicator.rank,
                    currentIndicator.totalCompanies,
                    isInverseIndicator(selectedIndicator)
                  )
                "
              ></div>
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
.industry-comparison {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
}

.comparison-header {
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comparison-header h3 {
  margin: 0;
  font-size: var(--font-size-md);
  color: var(--primary-color);
}

.industry-info {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.loading-container,
.empty-container {
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
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.comparison-content {
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
}

.indicator-value-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.indicator-name {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-primary);
}

.indicator-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--primary-color);
}

.indicator-rank,
.indicator-percentile {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.rank-label,
.percentile-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.rank-value,
.percentile-value {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.rank-high,
.percentile-high {
  color: var(--success-color);
}

.rank-medium,
.percentile-medium {
  color: var(--warning-color);
}

.rank-low,
.percentile-low {
  color: var(--danger-color);
}

.rank-description {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.percentile-bar {
  height: 8px;
  background-color: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.percentile-progress {
  height: 100%;
  border-radius: 4px;
}

.percentile-progress.rank-high {
  background-color: var(--success-color);
}

.percentile-progress.rank-medium {
  background-color: var(--warning-color);
}

.percentile-progress.rank-low {
  background-color: var(--danger-color);
}

.indicator-chart-container {
  width: 100%;
}

.indicator-chart {
  width: 100%;
  height: 300px;
}

@media (max-width: 768px) {
  .indicator-tabs {
    flex-direction: column;
  }

  .tab-btn {
    width: 100%;
    text-align: center;
  }

  .indicator-chart {
    height: 250px;
  }
}
</style>
