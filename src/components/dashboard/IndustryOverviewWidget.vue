<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'

const router = useRouter()
const industryChartRef = ref<HTMLElement | null>(null)
const chart = ref<echarts.ECharts | null>(null)
const isLoading = ref(true)

// 模拟行业数据
const industryData = [
  { name: '电子', value: 12.5, change: '+2.3%', status: 'up' },
  { name: '医药', value: 8.7, change: '+1.5%', status: 'up' },
  { name: '银行', value: 7.2, change: '-0.8%', status: 'down' },
  { name: '食品饮料', value: 6.8, change: '+0.5%', status: 'up' },
  { name: '房地产', value: 5.4, change: '-1.2%', status: 'down' },
  { name: '汽车', value: 4.9, change: '+0.7%', status: 'up' },
  { name: '钢铁', value: 4.2, change: '-0.3%', status: 'down' },
  { name: '化工', value: 3.8, change: '+0.2%', status: 'up' }
]

// 初始化图表
onMounted(() => {
  setTimeout(() => {
    initIndustryChart()
    isLoading.value = false
  }, 500)
  
  // 响应窗口大小变化
  window.addEventListener('resize', handleResize)
})

// 组件卸载时清理
const handleResize = () => {
  chart.value?.resize()
}

// 初始化行业概览图表
const initIndustryChart = () => {
  if (!industryChartRef.value) return
  
  // 初始化图表
  chart.value = echarts.init(industryChartRef.value)
  
  // 准备数据
  const names = industryData.map(item => item.name)
  const values = industryData.map(item => item.value)
  const colors = industryData.map(item => item.status === 'up' ? '#e74c3c' : '#2ecc71')
  
  // 设置图表选项
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params: any) {
        const item = params[0]
        const industry = industryData.find(d => d.name === item.name)
        return `${item.name}<br />市值占比: ${item.value}%<br />涨跌幅: ${industry?.change}`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}%'
      }
    },
    yAxis: {
      type: 'category',
      data: names,
      axisTick: {
        alignWithLabel: true
      }
    },
    series: [
      {
        name: '市值占比',
        type: 'bar',
        data: values,
        itemStyle: {
          color: function(params: any) {
            return colors[params.dataIndex]
          }
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%'
        }
      }
    ]
  }
  
  chart.value.setOption(option)
}

// 跳转到行业分析页面
const goToIndustryAnalysis = () => {
  router.push('/industry-analysis')
}
</script>

<template>
  <div class="industry-overview-widget">
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载行业数据...</p>
    </div>
    
    <div v-else class="industry-chart-container">
      <div ref="industryChartRef" class="industry-chart"></div>
    </div>
    
    <div class="widget-footer">
      <button class="btn btn-outline btn-sm" @click="goToIndustryAnalysis">
        查看详细行业分析
      </button>
    </div>
  </div>
</template>

<style scoped>
.industry-overview-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  gap: var(--spacing-md);
  flex: 1;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(66, 185, 131, 0.2);
  border-top: 3px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.industry-chart-container {
  flex: 1;
  min-height: 250px;
}

.industry-chart {
  width: 100%;
  height: 100%;
}

.widget-footer {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--border-light);
}

.btn-sm {
  font-size: var(--font-size-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
}
</style>
