<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as echarts from 'echarts'
import { useRouter } from 'vue-router'

const router = useRouter()
const marketOverviewChart = ref<HTMLElement | null>(null)
const chart = ref<echarts.ECharts | null>(null)
const marketIndices = ref<any[]>([
  { name: '上证指数', code: '000001.SH', value: 3250.78, change: '+0.85%', status: 'up' },
  { name: '深证成指', code: '399001.SZ', value: 10876.54, change: '+1.12%', status: 'up' },
  { name: '创业板指', code: '399006.SZ', value: 2145.32, change: '-0.32%', status: 'down' },
  { name: '沪深300', code: '000300.SH', value: 4021.45, change: '+0.67%', status: 'up' },
])

// 初始化图表
onMounted(() => {
  initMarketOverviewChart()
  
  // 响应窗口大小变化
  window.addEventListener('resize', handleResize)
})

// 组件卸载时清理
const handleResize = () => {
  chart.value?.resize()
}

// 初始化市场概览图表
const initMarketOverviewChart = () => {
  if (!marketOverviewChart.value) return
  
  // 初始化图表
  chart.value = echarts.init(marketOverviewChart.value)
  
  // 生成随机数据
  const dates = []
  const data = []
  
  const today = new Date()
  for (let i = 30; i >= 0; i--) {
    const date = new Date()
    date.setDate(today.getDate() - i)
    dates.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }))
    
    // 生成随机数据，但保持一定的连续性
    if (i === 30) {
      data.push(3200 + Math.random() * 100)
    } else {
      const prevValue = data[data.length - 1]
      const change = (Math.random() - 0.5) * 50 // -25 到 +25 的随机变化
      data.push(prevValue + change)
    }
  }
  
  // 设置图表选项
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br />{a}: {c}'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        interval: 5
      }
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: {
        formatter: '{value}'
      }
    },
    series: [
      {
        name: '上证指数',
        type: 'line',
        data: data,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          width: 2,
          color: '#e74c3c'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(231, 76, 60, 0.3)'
            },
            {
              offset: 1,
              color: 'rgba(231, 76, 60, 0.1)'
            }
          ])
        }
      }
    ]
  }
  
  chart.value.setOption(option)
}

// 跳转到市场页面
const goToMarketView = () => {
  router.push('/market-heatmap')
}
</script>

<template>
  <div class="market-overview-widget">
    <div class="market-indices">
      <div v-for="index in marketIndices" :key="index.code" class="market-index">
        <div class="index-name">{{ index.name }}</div>
        <div class="index-value">{{ index.value }}</div>
        <div class="index-change" :class="index.status">{{ index.change }}</div>
      </div>
    </div>
    
    <div class="market-chart-container">
      <div ref="marketOverviewChart" class="market-chart"></div>
    </div>
    
    <div class="widget-footer">
      <button class="btn btn-outline btn-sm" @click="goToMarketView">
        查看大盘云图
      </button>
    </div>
  </div>
</template>

<style scoped>
.market-overview-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.market-indices {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.market-index {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  background-color: var(--bg-secondary);
  transition: all var(--transition-fast);
}

.market-index:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.index-name {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.index-value {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.index-change {
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.index-change.up {
  color: var(--stock-up);
}

.index-change.down {
  color: var(--stock-down);
}

.market-chart-container {
  flex: 1;
  min-height: 200px;
  margin-bottom: var(--spacing-md);
}

.market-chart {
  width: 100%;
  height: 100%;
}

.widget-footer {
  display: flex;
  justify-content: center;
  margin-top: auto;
}

.btn-sm {
  font-size: var(--font-size-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
}
</style>
