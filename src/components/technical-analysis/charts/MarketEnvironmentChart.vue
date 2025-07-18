<template>
  <div class="market-environment-chart">
    <div class="chart-header">
      <h3>{{ title }}</h3>
    </div>
    <BaseChart :options="chartOptions" :height="height" @chart-ready="onChartReady" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import BaseChart from './BaseChart.vue'
import type { DojiType } from '../../../types/technical-analysis/doji'
import type { MarketCondition } from '../../../types/technical-analysis/kline'
import type { ECharts } from 'echarts'

const props = defineProps({
  patternType: {
    type: String as () => DojiType,
    required: true,
  },
  marketStats: {
    type: Object as () => Record<
      MarketCondition,
      { probability: number; averageChange: number; count: number }
    >,
    required: true,
  },
  title: {
    type: String,
    default: '市场环境对比',
  },
  height: {
    type: String,
    default: '300px',
  },
})

const chartInstance = ref<ECharts | null>(null)

// 图表配置
const chartOptions = computed(() => {
  if (!props.marketStats) {
    return {
      title: {
        text: '暂无数据',
        left: 'center',
      },
    }
  }

  const { bull, bear, neutral } = props.marketStats

  // 准备数据
  const categories = ['牛市', '熊市', '中性']
  const probabilities = [bull.probability * 100, bear.probability * 100, neutral.probability * 100]
  const changes = [bull.averageChange, bear.averageChange, neutral.averageChange]
  const counts = [bull.count, bear.count, neutral.count]

  return {
    title: {
      text: `${getPatternTypeLabel(props.patternType)}十字星在不同市场环境下的表现`,
      left: 'center',
      textStyle: {
        fontSize: 14,
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any[]) => {
        const index = params[0].dataIndex
        const category = categories[index]
        const probability = probabilities[index].toFixed(2)
        const change = changes[index].toFixed(2)
        const count = counts[index]

        return `${category}<br/>上涨概率: ${probability}%<br/>平均涨跌幅: ${change}%<br/>样本数量: ${count}`
      },
    },
    legend: {
      data: ['上涨概率', '平均涨跌幅'],
      top: 30,
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
    },
    yAxis: [
      {
        type: 'value',
        name: '上涨概率',
        min: 0,
        max: 100,
        axisLabel: {
          formatter: '{value}%',
        },
      },
      {
        type: 'value',
        name: '平均涨跌幅',
        axisLabel: {
          formatter: '{value}%',
        },
      },
    ],
    series: [
      {
        name: '上涨概率',
        type: 'bar',
        data: probabilities.map((value) => ({
          value,
          itemStyle: {
            color: '#42a5f5',
          },
        })),
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
        },
      },
      {
        name: '平均涨跌幅',
        type: 'line',
        yAxisIndex: 1,
        data: changes.map((value) => ({
          value,
          itemStyle: {
            color: value >= 0 ? '#26a69a' : '#ef5350',
          },
        })),
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
        },
      },
    ],
  }
})

// 获取形态类型标签
const getPatternTypeLabel = (type: DojiType): string => {
  switch (type) {
    case 'standard':
      return '标准'
    case 'dragonfly':
      return '蜻蜓'
    case 'gravestone':
      return '墓碑'
    case 'longLegged':
      return '长腿'
    default:
      return ''
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

// 监听市场统计数据变化
watch(
  () => props.marketStats,
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
.market-environment-chart {
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
</style>
