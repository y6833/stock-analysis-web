<template>
  <div class="doji-alert-statistics">
    <div class="statistics-header">
      <h3>十字星形态提醒统计分析</h3>
      <div class="statistics-actions">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="yyyy-MM-dd"
          @change="loadStatistics"
        />
        <el-select
          v-model="selectedStock"
          placeholder="选择股票"
          clearable
          filterable
          @change="loadStatistics"
        >
          <el-option
            v-for="stock in stockOptions"
            :key="stock.code"
            :label="`${stock.code} ${stock.name}`"
            :value="stock.code"
          />
        </el-select>
        <el-button type="primary" size="small" icon="el-icon-refresh" @click="loadStatistics">
          刷新
        </el-button>
      </div>
    </div>

    <el-row :gutter="20" v-loading="loading">
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-value">{{ statistics.totalAlerts }}</div>
          <div class="stats-label">总提醒数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-value">{{ statistics.activeAlerts }}</div>
          <div class="stats-label">活跃提醒</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-value">{{ statistics.triggeredToday }}</div>
          <div class="stats-label">今日触发</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-value">{{ statistics.triggeredThisWeek }}</div>
          <div class="stats-label">本周触发</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="stats-charts">
      <el-col :span="12">
        <el-card class="chart-card">
          <div slot="header">按优先级分布</div>
          <div class="chart-container" ref="priorityChartRef"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card">
          <div slot="header">按形态类型分布</div>
          <div class="chart-container" ref="patternTypeChartRef"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="time-distribution-card">
      <div slot="header">
        <span>提醒触发时间分布</span>
      </div>
      <div class="chart-container" ref="timeDistributionChartRef"></div>
    </el-card>

    <el-card class="stock-stats-card" v-if="!selectedStock">
      <div slot="header">
        <span>按股票分布 (前10名)</span>
      </div>
      <div class="chart-container" ref="stockChartRef"></div>
    </el-card>

    <el-card class="effectiveness-card" v-if="selectedStock">
      <div slot="header">
        <span>提醒有效性分析</span>
      </div>
      <div class="chart-container" ref="effectivenessChartRef"></div>
    </el-card>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts/core'
import { PieChart, BarChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import dojiPatternAlertHistoryService from '@/services/DojiPatternAlertHistoryService'
import type { DojiPatternAlertStats } from '@/types/alerts'

// 注册 ECharts 组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  PieChart,
  BarChart,
  LineChart,
  CanvasRenderer,
])

export default defineComponent({
  name: 'DojiPatternAlertStatistics',
  props: {
    stockCode: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    const loading = ref(false)
    const dateRange = ref<[string, string] | null>(null)
    const selectedStock = ref(props.stockCode || '')
    const stockOptions = ref<Array<{ code: string; name: string }>>([])

    const priorityChartRef = ref<HTMLElement | null>(null)
    const patternTypeChartRef = ref<HTMLElement | null>(null)
    const timeDistributionChartRef = ref<HTMLElement | null>(null)
    const stockChartRef = ref<HTMLElement | null>(null)
    const effectivenessChartRef = ref<HTMLElement | null>(null)

    let priorityChart: echarts.ECharts | null = null
    let patternTypeChart: echarts.ECharts | null = null
    let timeDistributionChart: echarts.ECharts | null = null
    let stockChart: echarts.ECharts | null = null
    let effectivenessChart: echarts.ECharts | null = null

    // 模拟时间分布数据
    const timeDistributionData = reactive({
      dates: [] as string[],
      counts: [] as number[],
    })

    // 模拟有效性分析数据
    const effectivenessData = reactive({
      patternTypes: ['standard', 'gravestone', 'dragonfly', 'longLegged'],
      successRates: [0, 0, 0, 0],
      sampleCounts: [0, 0, 0, 0],
    })

    const statistics = reactive<DojiPatternAlertStats>({
      totalAlerts: 0,
      activeAlerts: 0,
      triggeredToday: 0,
      triggeredThisWeek: 0,
      triggeredThisMonth: 0,
      byPriority: {
        high: 0,
        medium: 0,
        low: 0,
      },
      byPatternType: {
        standard: 0,
        gravestone: 0,
        dragonfly: 0,
        longLegged: 0,
      },
      byStock: [],
    })

    // 加载统计数据
    const loadStatistics = async () => {
      loading.value = true
      try {
        const params: { startDate?: string; endDate?: string; stockCode?: string } = {}

        if (dateRange.value) {
          params.startDate = dateRange.value[0]
          params.endDate = dateRange.value[1]
        }

        if (selectedStock.value) {
          params.stockCode = selectedStock.value
        }

        const stats = await dojiPatternAlertHistoryService.getAlertHistoryStats(params)
        Object.assign(statistics, stats)

        // 加载股票选项（实际应用中应该从API获取）
        if (stockOptions.value.length === 0) {
          stockOptions.value = statistics.byStock.map((stock) => ({
            code: stock.stockCode,
            name: stock.stockName,
          }))
        }

        // 模拟生成时间分布数据
        generateTimeDistributionData()

        // 模拟生成有效性分析数据
        if (selectedStock.value) {
          generateEffectivenessData()
        }

        nextTick(() => {
          renderCharts()
        })
      } catch (error) {
        console.error('加载提醒统计数据失败:', error)
        ElMessage.error('加载提醒统计数据失败')
      } finally {
        loading.value = false
      }
    }

    // 生成时间分布数据（模拟数据）
    const generateTimeDistributionData = () => {
      const dates: string[] = []
      const counts: number[] = []

      // 生成过去30天的日期
      const today = new Date()
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(today.getDate() - i)
        dates.push(formatDate(date))

        // 生成随机数量
        counts.push(Math.floor(Math.random() * 10))
      }

      timeDistributionData.dates = dates
      timeDistributionData.counts = counts
    }

    // 生成有效性分析数据（模拟数据）
    const generateEffectivenessData = () => {
      // 生成随机成功率和样本数量
      effectivenessData.successRates = [
        Math.random() * 100,
        Math.random() * 100,
        Math.random() * 100,
        Math.random() * 100,
      ]

      effectivenessData.sampleCounts = [
        Math.floor(Math.random() * 100) + 10,
        Math.floor(Math.random() * 100) + 10,
        Math.floor(Math.random() * 100) + 10,
        Math.floor(Math.random() * 100) + 10,
      ]
    }

    // 格式化日期
    const formatDate = (date: Date): string => {
      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date)
    }

    // 渲染图表
    const renderCharts = () => {
      renderPriorityChart()
      renderPatternTypeChart()
      renderTimeDistributionChart()

      if (!selectedStock.value) {
        renderStockChart()
      } else {
        renderEffectivenessChart()
      }
    }

    // 渲染优先级分布图表
    const renderPriorityChart = () => {
      if (!priorityChartRef.value) return

      if (!priorityChart) {
        priorityChart = echarts.init(priorityChartRef.value)
      }

      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)',
        },
        legend: {
          orient: 'vertical',
          left: 'left',
          data: ['高', '中', '低'],
        },
        series: [
          {
            name: '优先级分布',
            type: 'pie',
            radius: '70%',
            center: ['50%', '50%'],
            data: [
              { value: statistics.byPriority.high, name: '高', itemStyle: { color: '#F56C6C' } },
              { value: statistics.byPriority.medium, name: '中', itemStyle: { color: '#E6A23C' } },
              { value: statistics.byPriority.low, name: '低', itemStyle: { color: '#909399' } },
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      }

      priorityChart.setOption(option)
    }

    // 渲染形态类型分布图表
    const renderPatternTypeChart = () => {
      if (!patternTypeChartRef.value) return

      if (!patternTypeChart) {
        patternTypeChart = echarts.init(patternTypeChartRef.value)
      }

      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)',
        },
        legend: {
          orient: 'vertical',
          left: 'left',
          data: ['标准十字星', '墓碑十字星', '蜻蜓十字星', '长腿十字星'],
        },
        series: [
          {
            name: '形态类型分布',
            type: 'pie',
            radius: '70%',
            center: ['50%', '50%'],
            data: [
              {
                value: statistics.byPatternType.standard,
                name: '标准十字星',
                itemStyle: { color: '#409EFF' },
              },
              {
                value: statistics.byPatternType.gravestone,
                name: '墓碑十字星',
                itemStyle: { color: '#F56C6C' },
              },
              {
                value: statistics.byPatternType.dragonfly,
                name: '蜻蜓十字星',
                itemStyle: { color: '#67C23A' },
              },
              {
                value: statistics.byPatternType.longLegged,
                name: '长腿十字星',
                itemStyle: { color: '#9B59B6' },
              },
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      }

      patternTypeChart.setOption(option)
    }

    // 渲染时间分布图表
    const renderTimeDistributionChart = () => {
      if (!timeDistributionChartRef.value) return

      if (!timeDistributionChart) {
        timeDistributionChart = echarts.init(timeDistributionChartRef.value)
      }

      const option = {
        title: {
          text: '提醒触发时间分布',
        },
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
          type: 'category',
          data: timeDistributionData.dates,
          axisLabel: {
            interval: 'auto',
            rotate: 45,
          },
        },
        yAxis: {
          type: 'value',
        },
        dataZoom: [
          {
            type: 'inside',
            start: 0,
            end: 100,
          },
          {
            start: 0,
            end: 100,
          },
        ],
        series: [
          {
            name: '触发次数',
            type: 'bar',
            data: timeDistributionData.counts,
            itemStyle: {
              color: '#409EFF',
            },
          },
        ],
      }

      timeDistributionChart.setOption(option)
    }

    // 渲染股票分布图表
    const renderStockChart = () => {
      if (!stockChartRef.value) return

      if (!stockChart) {
        stockChart = echarts.init(stockChartRef.value)
      }

      // 获取前10名股票
      const topStocks = statistics.byStock.slice(0, 10).sort((a, b) => b.count - a.count)

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
          boundaryGap: [0, 0.01],
        },
        yAxis: {
          type: 'category',
          data: topStocks.map((stock) => `${stock.stockCode} ${stock.stockName}`),
          axisLabel: {
            interval: 0,
            rotate: 0,
          },
        },
        series: [
          {
            name: '提醒数量',
            type: 'bar',
            data: topStocks.map((stock) => stock.count),
            itemStyle: {
              color: '#409EFF',
            },
          },
        ],
      }

      stockChart.setOption(option)
    }

    // 渲染有效性分析图表
    const renderEffectivenessChart = () => {
      if (!effectivenessChartRef.value) return

      if (!effectivenessChart) {
        effectivenessChart = echarts.init(effectivenessChartRef.value)
      }

      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
          },
          formatter: function (params: any) {
            const patternType = params[0].name
            const successRate = params[0].value.toFixed(2)
            const sampleCount = effectivenessData.sampleCounts[params[0].dataIndex]
            return `${patternType}<br/>成功率: ${successRate}%<br/>样本数: ${sampleCount}`
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
          data: ['标准十字星', '墓碑十字星', '蜻蜓十字星', '长腿十字星'],
        },
        yAxis: {
          type: 'value',
          name: '成功率 (%)',
          max: 100,
        },
        series: [
          {
            name: '成功率',
            type: 'bar',
            data: effectivenessData.successRates,
            itemStyle: {
              color: function (params: any) {
                const rate = params.value
                if (rate >= 70) return '#67C23A'
                if (rate >= 50) return '#E6A23C'
                return '#F56C6C'
              },
            },
            label: {
              show: true,
              position: 'top',
              formatter: '{c}%',
            },
          },
        ],
      }

      effectivenessChart.setOption(option)
    }

    // 监听窗口大小变化，调整图表大小
    const handleResize = () => {
      priorityChart?.resize()
      patternTypeChart?.resize()
      timeDistributionChart?.resize()
      stockChart?.resize()
      effectivenessChart?.resize()
    }

    // 监听 props 变化
    watch(
      () => props.stockCode,
      (newVal) => {
        selectedStock.value = newVal
        loadStatistics()
      }
    )

    // 组件挂载时加载数据
    onMounted(() => {
      loadStatistics()
      window.addEventListener('resize', handleResize)
    })

    // 组件卸载时移除事件监听
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      priorityChart?.dispose()
      patternTypeChart?.dispose()
      timeDistributionChart?.dispose()
      stockChart?.dispose()
      effectivenessChart?.dispose()
    })

    return {
      loading,
      dateRange,
      selectedStock,
      stockOptions,
      statistics,
      priorityChartRef,
      patternTypeChartRef,
      timeDistributionChartRef,
      stockChartRef,
      effectivenessChartRef,
      loadStatistics,
    }
  },
})
</script>

<style scoped>
.doji-alert-statistics {
  padding: 16px;
}

.statistics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.statistics-actions {
  display: flex;
  gap: 12px;
}

.stats-charts {
  margin-top: 20px;
  margin-bottom: 20px;
}

.stats-card {
  text-align: center;
  padding: 16px;
}

.stats-value {
  font-size: 28px;
  font-weight: bold;
  color: #409eff;
}

.stats-label {
  margin-top: 8px;
  color: #666;
}

.chart-card,
.time-distribution-card,
.stock-stats-card,
.effectiveness-card {
  margin-bottom: 20px;
}

.chart-container {
  height: 300px;
}
</style>
