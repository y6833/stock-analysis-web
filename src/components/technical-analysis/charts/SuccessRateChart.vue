<template>
  <div class="success-rate-chart">
    <div class="chart-header">
      <h3>{{ title }}</h3>
      <div class="chart-controls">
        <select v-model="selectedTimeframe" @change="updateChart">
          <option v-for="tf in timeframeOptions" :key="tf.value" :value="tf.value">
            {{ tf.label }}
          </option>
        </select>
      </div>
    </div>
    <BaseChart :options="chartOptions" :height="height" @chart-ready="onChartReady" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import BaseChart from './BaseChart.vue'
import type { DojiType } from '../../../types/technical-analysis/doji'
import type { SuccessRateStats } from '../../../types/technical-analysis/doji-analysis'
import type { ECharts } from 'echarts'

const props = defineProps({
  patternType: {
    type: String as () => DojiType,
    required: true,
  },
  stats: {
    type: Object as () => SuccessRateStats,
    required: true,
  },
  title: {
    type: String,
    default: '上涨概率统计',
  },
  height: {
    type: String,
    default: '300px',
  },
})

const chartInstance = ref<ECharts | null>(null)
const timeframeOptions = [
  { value: '1d', label: '1天' },
  { value: '3d', label: '3天' },
  { value: '5d', label: '5天' },
  { value: '10d', label: '10天' },
]
const selectedTimeframe = ref('5d')

// 图表配置
const chartOptions = computed(() => {
  if (!props.stats) {
    return {
      title: {
        text: '暂无数据',
        left: 'center',
      },
    }
  }

  const { upwardProbability, averageGain, averageLoss, sampleSize } = props.stats

  return {
    title: {
      text: `${getPatternTypeLabel(props.patternType)}十字星后续表现`,
      left: 'center',
      textStyle: {
        fontSize: 14,
      },
    },
    tooltip: {
      trigger: 'item',
    },
    legend: {
      top: '10%',
      left: 'center',
    },
    series: [
      {
        name: '上涨概率',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: [
          {
            value: upwardProbability * 100,
            name: '上涨概率',
            itemStyle: { color: '#26a69a' },
          },
          {
            value: (1 - upwardProbability) * 100,
            name: '下跌概率',
            itemStyle: { color: '#ef5350' },
          },
        ],
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

  // 触发时间周期变化事件
  emit('timeframeChange', selectedTimeframe.value)
}

// 图表准备好时的回调
const onChartReady = (chart: ECharts) => {
  chartInstance.value = chart
}

// 监听统计数据变化
watch(
  () => props.stats,
  () => {
    updateChart()
  },
  { deep: true }
)

const emit = defineEmits(['timeframeChange'])

onMounted(() => {
  updateChart()
})
</script>

<style scoped>
.success-rate-chart {
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
