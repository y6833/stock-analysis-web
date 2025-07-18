<template>
  <div class="doji-pattern-result-analysis">
    <el-card class="analysis-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>筛选结果分析</span>
          <div class="header-actions">
            <el-button type="primary" size="small" :disabled="!hasData" @click="refreshAnalysis">
              刷新分析
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="!hasData && !loading" class="empty-result">
        <el-empty description="暂无分析数据，请先执行筛选"></el-empty>
      </div>

      <div v-else-if="hasData" class="analysis-content">
        <!-- 结果统计摘要 -->
        <div class="analysis-summary">
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-label">总结果数</div>
                <div class="summary-value">{{ totalResults }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-label">平均上涨幅度</div>
                <div class="summary-value" :class="avgPriceChange >= 0 ? 'price-up' : 'price-down'">
                  {{ avgPriceChange.toFixed(2) }}%
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-label">平均成交量变化</div>
                <div class="summary-value" :class="avgVolumeChange >= 0 ? 'volume-up' : 'volume-down'">
                  {{ avgVolumeChange.toFixed(2) }}%
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-label">平均显著性</div>
                <div class="summary-value">
                  <el-progress 
                    :percentage="avgSignificance * 100" 
                    :color="getSignificanceColor(avgSignificance)"
                    :stroke-width="10"
                    :show-text="false"
                  />
                  {{ (avgSignificance * 100).toFixed(0) }}%
                </div>
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 二次筛选 -->
        <div class="secondary-filter">
          <el-divider content-position="left">二次筛选</el-divider>
          <el-form :model="filterForm" inline>
            <el-form-item label="形态类型">
              <el-select v-model="filterForm.patternType" placeholder="全部" clearable>
                <el-option label="全部" value="" />
                <el-option label="标准十字星" value="standard" />
                <el-option label="蜻蜓十字星" value="dragonfly" />
                <el-option label="墓碑十字星" value="gravestone" />
                <el-option label="长腿十字星" value="longLegged" />
              </el-select>
            </el-form-item>
            <el-form-item label="最小上涨幅度">
              <el-input-number 
                v-model="filterForm.minPriceChange" 
                :min="0" 
                :max="100" 
                :step="0.5"
                :precision="1"
                controls-position="right"
                size="small"
              />
              <span class="input-suffix">%</span>
            </el-form-item>
            <el-form-item label="最小显著性">
              <el-slider 
                v-model="filterForm.minSignificance" 
                :min="0" 
                :max="100" 
                :step="5"
                :format-tooltip="value => `${value}%`"
                style="width: 200px"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="applySecondaryFilter">应用筛选</el-button>
              <el-button @click="resetSecondaryFilter">重置</el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 分布可视化 -->
        <div class="distribution-charts">
          <el-divider content-position="left">结果分布</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="chart-container">
                <h4>形态类型分布</h4>
                <div ref="patternTypeChartRef" class="chart"></div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="chart-container">
                <h4>上涨幅度分布</h4>
                <div ref="priceChangeChartRef" class="chart"></div>
              </div>
            </el-col>
          </el-row>
          <el-row :gutter="20" class="mt-20">
            <el-col :span="12">
              <div class="chart-container">
                <h4>显著性分布</h4>
                <div ref="significanceChartRef" class="chart"></div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="chart-container">
                <h4>形态日期分布</h4>
                <div ref="dateTrendChartRef" class="chart"></div>
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 结果对比 -->
        <div class="comparison-charts">
          <el-divider content-position="left">结果对比</el-divider>
          <el-row :gutter="20">
            <el-col :span="24">
              <div class="chart-container">
                <h4>不同形态类型的平均上涨幅度对比</h4>
                <div ref="patternComparisonChartRef" class="chart"></div>
              </div>
            </el-col>
          </el-row>
          <el-row :gutter="20" class="mt-20">
            <el-col :span="24">
              <div class="chart-container">
                <h4>显著性与上涨幅度关系</h4>
                <div ref="significancePriceChartRef" class="chart"></div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, PropType, watch, onMounted, nextTick } from 'vue'
import type { DojiType } from '../../types/technical-analysis/doji'
import type { StockScreenResult, UpwardStockResult } from '../../types/technical-analysis/screener'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  ToolboxComponent
} from 'echarts/components'
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'

// 注册必须的组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  ToolboxComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  ScatterChart
])

export default defineComponent({
  name: 'DojiPatternResultAnalysis',

  props: {
    screenResult: {
      type: Object as PropType<StockScreenResult>,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    }
  },

  emits: ['refresh', 'filter-change'],

  setup(props, { emit }) {
    // 图表引用
    const patternTypeChartRef = ref<HTMLElement | null>(null)
    const priceChangeChartRef = ref<HTMLElement | null>(null)
    const significanceChartRef = ref<HTMLElement | null>(null)
    const dateTrendChartRef = ref<HTMLElement | null>(null)
    const patternComparisonChartRef = ref<HTMLElement | null>(null)
    const significancePriceChartRef = ref<HTMLElement | null>(null)

    // 图表实例
    const patternTypeChart = ref<echarts.ECharts | null>(null)
    const priceChangeChart = ref<echarts.ECharts | null>(null)
    const significanceChart = ref<echarts.ECharts | null>(null)
    const dateTrendChart = ref<echarts.ECharts | null>(null)
    const patternComparisonChart = ref<echarts.ECharts | null>(null)
    const significancePriceChart = ref<echarts.ECharts | null>(null)

    // 二次筛选表单
    const filterForm = ref({
      patternType: '',
      minPriceChange: 0,
      minSignificance: 0
    })

    // 筛选后的结果
    const filteredResults = ref<UpwardStockResult[]>([])

    // 是否有数据
    const hasData = computed(() => props.screenResult.stocks.length > 0)

    // 总结果数
    const totalResults = computed(() => filteredResults.value.length)

    // 平均上涨幅度
    const avgPriceChange = computed(() => {
      if (!filteredResults.value.length) return 0
      const sum = filteredResults.value.reduce((acc, stock) => acc + stock.priceChange, 0)
      return sum / filteredResults.value.length
    })

    // 平均成交量变化
    const avgVolumeChange = computed(() => {
      if (!filteredResults.value.length) return 0
      const sum = filteredResults.value.reduce((acc, stock) => acc + stock.volumeChange, 0)
      return sum / filteredResults.value.length
    })

    // 平均显著性
    const avgSignificance = computed(() => {
      if (!filteredResults.value.length) return 0
      const sum = filteredResults.value.reduce((acc, stock) => acc + stock.significance, 0)
      return sum / filteredResults.value.length
    })

    // 监听筛选结果变化
    watch(() => props.screenResult, () => {
      resetSecondaryFilter()
      nextTick(() => {
        initCharts()
      })
    }, { deep: true })

    // 初始化
    onMounted(() => {
      resetSecondaryFilter()
      nextTick(() => {
        initCharts()
      })
    })

    // 初始化所有图表
    const initCharts = () => {
      if (!hasData.value) return

      initPatternTypeChart()
      initPriceChangeChart()
      initSignificanceChart()
      initDateTrendChart()
      initPatternComparisonChart()
      initSignificancePriceChart()

      // 窗口大小变化时重新调整图表大小
      window.addEventListener('resize', handleResize)
    }

    // 处理窗口大小变化
    const handleResize = () => {
      patternTypeChart.value?.resize()
      priceChangeChart.value?.resize()
      significanceChart.value?.resize()
      dateTrendChart.value?.resize()
      patternComparisonChart.value?.resize()
      significancePriceChart.value?.resize()
    }

    // 初始化形态类型分布图表
    const initPatternTypeChart = () => {
      if (!patternTypeChartRef.value) return

      // 统计各类型数量
      const typeCount: Record<string, number> = {
        standard: 0,
        dragonfly: 0,
        gravestone: 0,
        longLegged: 0
      }

      filteredResults.value.forEach(stock => {
        typeCount[stock.patternType]++
      })

      // 准备数据
      const data = Object.entries(typeCount).map(([type, count]) => ({
        name: getPatternTypeName(type as DojiType),
        value: count
      }))

      // 初始化图表
      if (!patternTypeChart.value) {
        patternTypeChart.value = echarts.init(patternTypeChartRef.value)
      }

      // 设置图表选项
      patternTypeChart.value.setOption({
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left',
          data: data.map(item => item.name)
        },
        series: [
          {
            name: '形态类型',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 10,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: false,
              position: 'center'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: '18',
                fontWeight: 'bold'
              }
            },
            labelLine: {
              show: false
            },
            data: data
          }
        ]
      })
    }

    // 初始化上涨幅度分布图表
    const initPriceChangeChart = () => {
      if (!priceChangeChartRef.value) return

      // 准备数据
      const priceChanges = filteredResults.value.map(stock => stock.priceChange)
      
      // 计算直方图数据
      const min = Math.floor(Math.min(...priceChanges))
      const max = Math.ceil(Math.max(...priceChanges))
      const binSize = (max - min) / 10
      const bins: number[] = Array(10).fill(0)
      
      priceChanges.forEach(value => {
        const binIndex = Math.min(Math.floor((value - min) / binSize), 9)
        bins[binIndex]++
      })

      // 生成区间标签
      const labels = Array(10).fill(0).map((_, i) => {
        const start = min + i * binSize
        const end = min + (i + 1) * binSize
        return `${start.toFixed(1)}-${end.toFixed(1)}%`
      })

      // 初始化图表
      if (!priceChangeChart.value) {
        priceChangeChart.value = echarts.init(priceChangeChartRef.value)
      }

      // 设置图表选项
      priceChangeChart.value.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: labels,
          axisLabel: {
            rotate: 45,
            interval: 0
          }
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '股票数量',
            type: 'bar',
            data: bins,
            itemStyle: {
              color: '#5470C6'
            }
          }
        ]
      })
    }

    // 初始化显著性分布图表
    const initSignificanceChart = () => {
      if (!significanceChartRef.value) return

      // 准备数据
      const significances = filteredResults.value.map(stock => stock.significance)
      
      // 计算直方图数据
      const bins: number[] = Array(5).fill(0)
      
      significances.forEach(value => {
        const binIndex = Math.min(Math.floor(value * 5), 4)
        bins[binIndex]++
      })

      // 生成区间标签
      const labels = ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%']

      // 初始化图表
      if (!significanceChart.value) {
        significanceChart.value = echarts.init(significanceChartRef.value)
      }

      // 设置图表选项
      significanceChart.value.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: labels
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '股票数量',
            type: 'bar',
            data: bins,
            itemStyle: {
              color: function(params: any) {
                const colors = ['#909399', '#F56C6C', '#E6A23C', '#409EFF', '#67C23A']
                return colors[params.dataIndex]
              }
            }
          }
        ]
      })
    }

    // 初始化形态日期分布图表
    const initDateTrendChart = () => {
      if (!dateTrendChartRef.value) return

      // 准备数据
      const dateMap = new Map<string, number>()
      
      filteredResults.value.forEach(stock => {
        const date = formatDate(stock.patternDate)
        dateMap.set(date, (dateMap.get(date) || 0) + 1)
      })

      // 按日期排序
      const sortedDates = Array.from(dateMap.keys()).sort()
      const data = sortedDates.map(date => [date, dateMap.get(date)])

      // 初始化图表
      if (!dateTrendChart.value) {
        dateTrendChart.value = echarts.init(dateTrendChartRef.value)
      }

      // 设置图表选项
      dateTrendChart.value.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            label: {
              backgroundColor: '#6a7985'
            }
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: sortedDates,
          axisLabel: {
            rotate: 45,
            interval: Math.floor(sortedDates.length / 10)
          }
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '形态数量',
            type: 'line',
            stack: 'Total',
            areaStyle: {},
            emphasis: {
              focus: 'series'
            },
            data: sortedDates.map(date => dateMap.get(date))
          }
        ]
      })
    }

    // 初始化形态类型对比图表
    const initPatternComparisonChart = () => {
      if (!patternComparisonChartRef.value) return

      // 按形态类型分组
      const typeGroups: Record<string, UpwardStockResult[]> = {
        standard: [],
        dragonfly: [],
        gravestone: [],
        longLegged: []
      }

      filteredResults.value.forEach(stock => {
        typeGroups[stock.patternType].push(stock)
      })

      // 计算每种类型的平均上涨幅度
      const avgPriceChanges = Object.entries(typeGroups).map(([type, stocks]) => {
        if (!stocks.length) return { type, value: 0 }
        const avg = stocks.reduce((acc, stock) => acc + stock.priceChange, 0) / stocks.length
        return { type, value: avg }
      })

      // 初始化图表
      if (!patternComparisonChart.value) {
        patternComparisonChart.value = echarts.init(patternComparisonChartRef.value)
      }

      // 设置图表选项
      patternComparisonChart.value.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: '{b}: {c}%'
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: avgPriceChanges.map(item => getPatternTypeName(item.type as DojiType))
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: '{value}%'
          }
        },
        series: [
          {
            name: '平均上涨幅度',
            type: 'bar',
            data: avgPriceChanges.map(item => item.value.toFixed(2)),
            itemStyle: {
              color: function(params: any) {
                const colors = ['#409EFF', '#67C23A', '#F56C6C', '#E6A23C']
                return colors[params.dataIndex]
              }
            },
            label: {
              show: true,
              position: 'top',
              formatter: '{c}%'
            }
          }
        ]
      })
    }

    // 初始化显著性与上涨幅度关系图表
    const initSignificancePriceChart = () => {
      if (!significancePriceChartRef.value) return

      // 准备数据
      const data = filteredResults.value.map(stock => [
        (stock.significance * 100).toFixed(0),
        stock.priceChange.toFixed(2),
        stock.stockName,
        getPatternTypeName(stock.patternType)
      ])

      // 初始化图表
      if (!significancePriceChart.value) {
        significancePriceChart.value = echarts.init(significancePriceChartRef.value)
      }

      // 设置图表选项
      significancePriceChart.value.setOption({
        tooltip: {
          trigger: 'item',
          formatter: function(params: any) {
            return `${params.data[2]}<br/>形态: ${params.data[3]}<br/>显著性: ${params.data[0]}%<br/>上涨幅度: ${params.data[1]}%`
          }
        },
        xAxis: {
          type: 'value',
          name: '显著性(%)',
          nameLocation: 'middle',
          nameGap: 30
        },
        yAxis: {
          type: 'value',
          name: '上涨幅度(%)',
          nameLocation: 'middle',
          nameGap: 30
        },
        series: [
          {
            name: '显著性与上涨幅度',
            type: 'scatter',
            symbolSize: 10,
            data: data,
            emphasis: {
              focus: 'series',
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      })
    }

    // 刷新分析
    const refreshAnalysis = () => {
      emit('refresh')
    }

    // 应用二次筛选
    const applySecondaryFilter = () => {
      const { patternType, minPriceChange, minSignificance } = filterForm.value
      
      filteredResults.value = props.screenResult.stocks.filter(stock => {
        if (patternType && stock.patternType !== patternType) return false
        if (stock.priceChange < minPriceChange) return false
        if (stock.significance * 100 < minSignificance) return false
        return true
      })

      emit('filter-change', filteredResults.value)
      
      // 重新初始化图表
      nextTick(() => {
        initCharts()
      })
    }

    // 重置二次筛选
    const resetSecondaryFilter = () => {
      filterForm.value = {
        patternType: '',
        minPriceChange: 0,
        minSignificance: 0
      }
      
      filteredResults.value = [...props.screenResult.stocks]
      
      emit('filter-change', filteredResults.value)
      
      // 重新初始化图表
      nextTick(() => {
        initCharts()
      })
    }

    // 获取形态类型名称
    const getPatternTypeName = (type: DojiType): string => {
      const typeMap: Record<DojiType, string> = {
        standard: '标准十字星',
        dragonfly: '蜻蜓十字星',
        gravestone: '墓碑十字星',
        longLegged: '长腿十字星'
      }
      return typeMap[type] || '未知形态'
    }

    // 获取显著性颜色
    const getSignificanceColor = (significance: number): string => {
      if (significance >= 0.8) return '#67C23A'
      if (significance >= 0.6) return '#E6A23C'
      if (significance >= 0.4) return '#F56C6C'
      return '#909399'
    }

    // 格式化日期
    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    return {
      hasData,
      totalResults,
      avgPriceChange,
      avgVolumeChange,
      avgSignificance,
      filterForm,
      filteredResults,
      patternTypeChartRef,
      priceChangeChartRef,
      significanceChartRef,
      dateTrendChartRef,
      patternComparisonChartRef,
      significancePriceChartRef,
      refreshAnalysis,
      applySecondaryFilter,
      resetSecondaryFilter,
      getPatternTypeName,
      getSignificanceColor
    }
  }
})
</script>

<style scoped>
.analysis-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.empty-result {
  padding: 40px 0;
  text-align: center;
}

.analysis-summary {
  margin-bottom: 20px;
}

.summary-item {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  text-align: center;
}

.summary-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 20px;
  font-weight: bold;
}

.price-up {
  color: #F56C6C;
}

.price-down {
  color: #67C23A;
}

.volume-up {
  color: #F56C6C;
}

.volume-down {
  color: #67C23A;
}

.secondary-filter {
  margin-bottom: 20px;
}

.chart-container {
  background-color: #fff;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.chart-container h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  color: #303133;
}

.chart {
  height: 300px;
}

.mt-20 {
  margin-top: 20px;
}

.input-suffix {
  margin-left: 8px;
  color: #606266;
}
</style>