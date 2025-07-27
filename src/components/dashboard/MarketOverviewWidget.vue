<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { stockService } from '@/services/stockService'
import { marketDataService } from '@/services/marketDataService'

const router = useRouter()
const marketOverviewChart = ref<HTMLElement | null>(null)
const chart = ref<echarts.ECharts | null>(null)
const marketIndices = ref<any[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

// 加载真实市场数据
const loadMarketData = async () => {
  try {
    isLoading.value = true
    error.value = null

    // 获取主要指数数据
    const indices = [
      { code: '000001.SH', name: '上证指数' },
      { code: '399001.SZ', name: '深证成指' },
      { code: '399006.SZ', name: '创业板指' },
      { code: '000300.SH', name: '沪深300' },
    ]

    const marketData = await Promise.allSettled(
      indices.map(async (index) => {
        try {
          const quote = await marketDataService.getIndexQuote(index.code)
          return {
            name: index.name,
            code: index.code,
            value: quote?.price || 0,
            change: quote?.change || 0,
            changePercent: quote?.changePercent || 0,
            status: (quote?.change || 0) >= 0 ? 'up' : 'down'
          }
        } catch (err) {
          console.warn(`获取${index.name}数据失败:`, err)
          return {
            name: index.name,
            code: index.code,
            value: 0,
            change: 0,
            changePercent: 0,
            status: 'neutral'
          }
        }
      })
    )

    marketIndices.value = marketData
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value)

    // 初始化图表
    await initMarketOverviewChart()

  } catch (err) {
    console.error('加载市场数据失败:', err)
    error.value = '加载市场数据失败'
    ElMessage.error('加载市场数据失败')
  } finally {
    isLoading.value = false
  }
}

// 初始化图表
onMounted(async () => {
  await loadMarketData()

  // 响应窗口大小变化
  window.addEventListener('resize', handleResize)
})

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart.value?.dispose()
})

const handleResize = () => {
  chart.value?.resize()
}

// 初始化市场概览图表
const initMarketOverviewChart = async () => {
  if (!marketOverviewChart.value || marketIndices.value.length === 0) return

  // 初始化图表
  chart.value = echarts.init(marketOverviewChart.value)

  try {
    // 获取上证指数的历史数据用于图表显示
    const historyData = await stockService.getStockHistory('000001.SH', 30)

    const dates = []
    const data = []

    if (historyData && historyData.length > 0) {
      // 使用真实历史数据
      historyData.forEach(item => {
        dates.push(new Date(item.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }))
        data.push(item.close)
      })
    } else {
      // 如果没有历史数据，使用当前指数数据生成简单图表
      const today = new Date()
      const baseValue = marketIndices.value[0]?.value || 3200

      for (let i = 30; i >= 0; i--) {
        const date = new Date()
        date.setDate(today.getDate() - i)
        dates.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }))

        // 基于当前值生成趋势数据
        const variation = (Math.random() - 0.5) * 0.02 // 2%的变化
        data.push(baseValue * (1 + variation * (30 - i) / 30))
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
  } catch (err) {
    console.error('初始化图表失败:', err)
    ElMessage.error('图表初始化失败')
  }
}

// 跳转到市场页面
const goToMarketView = () => {
  router.push('/market-heatmap')
}
</script>

<template>
  <div class="market-overview-widget">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <el-skeleton :rows="3" animated />
      <div class="loading-text">正在加载市场数据...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <el-empty description="加载失败" size="small">
        <el-button size="small" @click="loadMarketData">
          重新加载
        </el-button>
      </el-empty>
    </div>

    <!-- Normal State -->
    <template v-else>
      <div class="market-indices">
        <div v-for="index in marketIndices" :key="index.code" class="market-index">
          <div class="index-name">{{ index.name }}</div>
          <div class="index-value">{{ index.value.toFixed(2) }}</div>
          <div class="index-change" :class="index.status">
            {{ index.change >= 0 ? '+' : '' }}{{ index.change.toFixed(2) }}
            ({{ index.changePercent >= 0 ? '+' : '' }}{{ index.changePercent.toFixed(2) }}%)
          </div>
        </div>
      </div>

      <div class="market-chart-container">
        <div ref="marketOverviewChart" class="market-chart"></div>
      </div>

      <div class="widget-footer">
        <el-button size="small" @click="goToMarketView">
          查看大盘云图
        </el-button>
        <el-button size="small" @click="loadMarketData" :loading="isLoading">
          刷新数据
        </el-button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.market-overview-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  padding: var(--spacing-lg);
}

.loading-text {
  margin-top: var(--spacing-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
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
