<template>
  <div class="price-distribution-chart">
    <div class="chart-header">
      <h3>{{ title }}</h3>
      <div class="chart-controls">
        <select v-model="selectedDays" @change="updateChart">
          <option v-for="day in dayOptions" :key="day" :value="day">{{ day }}天</option>
        </select>
      </div>
    </div>
    <BaseChart :options="chartOptions" :height="height" @chart-ready="onChartReady" />
    <div class="chart-footer" v-if="distribution">
      <div class="stat-item">
        <span class="stat-label">样本数量:</span>
        <span class="stat-value">{{ distribution.totalSamples }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">上涨概率:</span>
        <span
          class="stat-value"
          :class="{ positive: upwardProbability > 0.5, negative: upwardProbability < 0.5 }"
        >
          {{ (upwardProbability * 100).toFixed(2) }}%
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import BaseChart from './BaseChart.vue'
import type { DojiType } from '../../../types/technical-analysis/doji'
import type { PriceDistribution } from '../../../types/technical-analysis/doji-analysis'
import type { ECharts } from 'echarts'

const props = defineProps({
  patternType: {
    type: String as () => DojiType,
    required: true,
  },
  distribution: {
    type: Object as () => PriceDistribution,
    required: true,
  },
  title: {
    type: String,
    default: '价格分布直方图',
  },
  height: {
    type: String,
    default: '300px',
  },
})

const chartInstance = ref<ECharts | null>(null)
const dayOptions = [1, 3, 5, 10]
const selectedDays = ref(5)

// 上涨概率
const upwardProbability = computed(() => {
  if (!props.distribution || !props.distribution.distribution) {
    return 0
  }

  // 计算上涨区间的总百分比
  const upwardRanges = props.distribution.distribution.filter((item) => {
    // 区间标签中包含正数百分比的为上涨区间
    return (
      item.range.includes('1%') ||
      item.range.includes('3%') ||
      item.range.includes('5%') ||
      item.range.includes('10%') ||
      item.range.includes('> 10%')
    )
  })

  const upwardPercentage = upwardRanges.reduce((sum, item) => sum + item.percentage, 0) / 100
  return upwardPercentage
})

// 图表配置
const chartOptions = computed(() => {
  if (!props.distribution || !props.distribution.distribution) {
    return {
      title: {
        text: '暂无数据',
        left: 'center',
      },
    }
  }

  const { distribution } = props.distribution

  // 准备数据
  const categories = distribution.map((item) => item.range)
  const data = distribution.map((item) => item.percentage)
  const colors = distribution.map((item) => {
    // 根据区间判断颜色
    if (item.range.includes('< -') || item.range.includes('-')) {
      return '#ef5350' // 下跌为红色
    } else if (item.range.includes('-1% ~ 1%')) {
      return '#9e9e9e' // 平盘为灰色
    } else {
      return '#26a69a' // 上涨为绿色
    }
  })

  return {
    title: {
      text: `${props.patternType}十字星${selectedDays.value}天后价格分布`,
      left: 'center',
      textStyle: {
        fontSize: 14,
      },
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}%',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        interval: 0,
        rotate: 45,
        fontSize: 10,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}%',
      },
    },
    series: [
      {
        name: '价格分布',
        type: 'bar',
        data: data.map((value, index) => ({
          value,
          itemStyle: {
            color: colors[index],
          },
        })),
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
          fontSize: 10,
        },
      },
    ],
  }
})

// 更新图表
const updateChart = () => {
  if (chartInstance.value) {
    chartInstance.value.setOption(chartOptions.value)
  }
}

// 图表准备好时的回调
const onChartReady = (chart: ECharts) => {
  chartInstance.value = chart
}

// 监听分布数据变化
watch(
  () => props.distribution,
  () => {
    updateChart()
  },
  { deep: true }
)

// 监听选择的天数变化
watch(selectedDays, () => {
  // 触发天数变化事件
  emit('daysChange', selectedDays.value)
})

const emit = defineEmits(['daysChange'])

onMounted(() => {
  updateChart()
})
</script>

<style scoped>
.price-distribution-chart {
  width: 100%;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

.chart-controls select {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background-color: #f5f5f5;
  font-size: 14px;
}

.chart-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.stat-item {
  display: flex;
  align-items: center;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-right: 8px;
}

.stat-value {
  font-size: 14px;
  font-weight: 500;
}

.positive {
  color: #26a69a;
}

.negative {
  color: #ef5350;
}
</style>
