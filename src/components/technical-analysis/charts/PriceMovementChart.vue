<template>
  <div class="price-movement-chart">
    <div class="chart-header">
      <h3>{{ title }}</h3>
      <div class="chart-controls">
        <select v-model="selectedDays" @change="updateChart">
          <option v-for="day in dayOptions" :key="day" :value="day">{{ day }}天</option>
        </select>
      </div>
    </div>
    <BaseChart :options="chartOptions" :height="height" @chart-ready="onChartReady" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import BaseChart from './BaseChart.vue'
import type { DojiPattern } from '../../../types/technical-analysis/doji'
import type { PriceMovement } from '../../../types/technical-analysis/doji-analysis'
import type { ECharts } from 'echarts'

const props = defineProps({
  pattern: {
    type: Object as () => DojiPattern,
    required: true,
  },
  priceMovement: {
    type: Object as () => PriceMovement,
    required: true,
  },
  title: {
    type: String,
    default: '价格走势分析',
  },
  height: {
    type: String,
    default: '300px',
  },
})

const chartInstance = ref<ECharts | null>(null)
const dayOptions = [1, 3, 5, 10]
const selectedDays = ref(5)

// 图表配置
const chartOptions = computed(() => {
  const { priceMovement } = props
  const priceChange = getPriceChangeForDays(priceMovement, selectedDays.value)
  const isPositive = priceChange >= 0

  return {
    title: {
      text: `${selectedDays.value}天价格变化: ${priceChange.toFixed(2)}%`,
      left: 'center',
      textStyle: {
        fontSize: 14,
        color: isPositive ? '#26a69a' : '#ef5350',
      },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        const dayIndex = params[0].dataIndex
        const days = dayIndex + 1
        const value = params[0].value
        return `${days}天后: ${value.toFixed(2)}%`
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ['1天', '3天', '5天', '10天'],
      axisLabel: {
        interval: 0,
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
        name: '价格变化',
        type: 'bar',
        data: [
          {
            value: priceMovement.priceChanges.day1,
            itemStyle: {
              color: priceMovement.priceChanges.day1 >= 0 ? '#26a69a' : '#ef5350',
            },
          },
          {
            value: priceMovement.priceChanges.day3,
            itemStyle: {
              color: priceMovement.priceChanges.day3 >= 0 ? '#26a69a' : '#ef5350',
            },
          },
          {
            value: priceMovement.priceChanges.day5,
            itemStyle: {
              color: priceMovement.priceChanges.day5 >= 0 ? '#26a69a' : '#ef5350',
            },
          },
          {
            value: priceMovement.priceChanges.day10,
            itemStyle: {
              color: priceMovement.priceChanges.day10 >= 0 ? '#26a69a' : '#ef5350',
            },
          },
        ],
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
        },
      },
    ],
  }
})

// 获取指定天数的价格变化
const getPriceChangeForDays = (priceMovement: PriceMovement, days: number): number => {
  switch (days) {
    case 1:
      return priceMovement.priceChanges.day1
    case 3:
      return priceMovement.priceChanges.day3
    case 5:
      return priceMovement.priceChanges.day5
    case 10:
      return priceMovement.priceChanges.day10
    default:
      return priceMovement.priceChanges.day5
  }
}

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

// 监听价格走势变化
watch(
  () => props.priceMovement,
  () => {
    updateChart()
  },
  { deep: true }
)

onMounted(() => {
  updateChart()
})
</script>

<style scoped>
.price-movement-chart {
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
</style>
