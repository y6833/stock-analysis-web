<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, nextTick } from 'vue'

defineOptions({
  name: 'SectorRotationAnalysis',
})
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'

const router = useRouter()

// 图表实例
const heatmapChart = ref<echarts.ECharts | null>(null)
const flowChart = ref<echarts.ECharts | null>(null)
const performanceChart = ref<echarts.ECharts | null>(null)

// 图表容器引用
const heatmapChartRef = ref<HTMLElement | null>(null)
const flowChartRef = ref<HTMLElement | null>(null)
const performanceChartRef = ref<HTMLElement | null>(null)

// 行业列表
const industries = [
  '银行',
  '保险',
  '证券',
  '房地产',
  '医药生物',
  '计算机',
  '电子',
  '通信',
  '家电',
  '食品饮料',
  '纺织服装',
  '汽车',
  '机械设备',
  '建筑材料',
  '钢铁',
  '有色金属',
  '煤炭',
  '石油石化',
  '电力',
  '公用事业',
]

// 时间范围
const timeRanges = [
  { id: '1d', name: '1日' },
  { id: '5d', name: '5日' },
  { id: '1m', name: '1月' },
  { id: '3m', name: '3月' },
  { id: '6m', name: '6月' },
  { id: '1y', name: '1年' },
]

// 选中的时间范围
const selectedTimeRange = ref('5d')

// 加载状态
const isLoading = ref(false)
const error = ref('')

// 行业资金流向数据
const industryFlowData = ref<any[]>([])

// 生成模拟数据
const generateMockData = () => {
  const flowData: any[] = []

  // 为每个行业生成资金流向数据
  industries.forEach((industry) => {
    // 随机生成资金流入/流出
    const inflow = Math.random() > 0.5
    const amount = Math.random() * 50 + 5 // 5-55亿
    const changePercent = (Math.random() * 10 - 5).toFixed(2) // -5% 到 +5%

    flowData.push({
      industry,
      flow: inflow ? amount.toFixed(2) : (-amount).toFixed(2),
      flowText: inflow ? `+${amount.toFixed(2)}亿` : `-${amount.toFixed(2)}亿`,
      changePercent: `${changePercent}%`,
      isPositive: parseFloat(changePercent) > 0,
      stockCount: Math.floor(Math.random() * 50) + 10, // 10-60只股票
      topStocks: [
        {
          symbol: `${Math.floor(Math.random() * 600000 + 1)
            .toString()
            .padStart(6, '0')}.SH`,
          name: `${industry}龙头A`,
          flow: (Math.random() * 5).toFixed(2),
        },
        {
          symbol: `${Math.floor(Math.random() * 600000 + 1)
            .toString()
            .padStart(6, '0')}.SH`,
          name: `${industry}龙头B`,
          flow: (Math.random() * 3).toFixed(2),
        },
        {
          symbol: `${Math.floor(Math.random() * 600000 + 1)
            .toString()
            .padStart(6, '0')}.SH`,
          name: `${industry}龙头C`,
          flow: (Math.random() * 2).toFixed(2),
        },
      ],
    })
  })

  // 按资金流向排序
  flowData.sort((a, b) => parseFloat(b.flow) - parseFloat(a.flow))

  return flowData
}

// 初始化热力图
const initHeatmapChart = () => {
  try {
    if (!heatmapChartRef.value) {
      console.error('热力图容器引用不存在')
      return
    }

    // 检查容器尺寸
    const container = heatmapChartRef.value
    const width = container.clientWidth
    const height = container.clientHeight

    console.log('开始初始化热力图，容器尺寸:', width, 'x', height)

    // 确保容器有尺寸
    if (width <= 0 || height <= 0) {
      console.error('热力图容器尺寸无效:', width, 'x', height)

      // 尝试设置容器尺寸
      container.style.width = '100%'
      container.style.height = '400px'
      container.style.minWidth = '300px'
      container.style.minHeight = '300px'

      console.log('已尝试设置热力图容器尺寸')
    }

    // 如果已经存在实例，先销毁
    if (heatmapChart.value) {
      console.log('销毁旧的热力图实例')
      heatmapChart.value.dispose()
    }

    // 创建新实例
    console.log('创建新的热力图实例')
    heatmapChart.value = echarts.init(container)
    console.log('热力图实例已创建')

    // 生成热力图数据
    const data: Array<{ value: [string, string, number] }> = []
    const days = ['周一', '周二', '周三', '周四', '周五']

    industries.slice(0, 10).forEach((industry) => {
      days.forEach((day) => {
        // 随机生成涨跌幅
        const value = Math.random() * 10 - 5 // -5% 到 +5%
        data.push({
          value: [day, industry, parseFloat(value.toFixed(2))],
        })
      })
    })

    console.log('热力图数据已生成:', data.length, '条数据')

    const option = {
      title: {
        text: '行业热力图 (近5日涨跌幅)',
        left: 'center',
      },
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          return `${params.data.value[1]}<br>${params.data.value[0]}: ${params.data.value[2]}%`
        },
      },
      grid: {
        top: '60px',
        bottom: '10%',
        left: '15%',
        right: '5%',
      },
      xAxis: {
        type: 'category',
        data: days,
        splitArea: {
          show: true,
        },
      },
      yAxis: {
        type: 'category',
        data: industries.slice(0, 10),
        splitArea: {
          show: true,
        },
      },
      visualMap: {
        min: -5,
        max: 5,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: ['#c23531', '#e6e6e6', '#3b9a3c'],
        },
      },
      series: [
        {
          name: '涨跌幅',
          type: 'heatmap',
          data: data,
          label: {
            show: true,
            formatter: (params: any) => {
              return params.data.value[2] > 0
                ? `+${params.data.value[2]}%`
                : `${params.data.value[2]}%`
            },
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    }

    heatmapChart.value.setOption(option)
    console.log('热力图选项已设置')
  } catch (err) {
    console.error('初始化热力图失败:', err)
  }
}

// 初始化资金流向图
const initFlowChart = () => {
  try {
    if (!flowChartRef.value || !industryFlowData.value.length) {
      console.error('资金流向图容器引用不存在或数据为空')
      return
    }

    // 检查容器尺寸
    const container = flowChartRef.value
    const width = container.clientWidth
    const height = container.clientHeight

    console.log('开始初始化资金流向图，容器尺寸:', width, 'x', height)

    // 确保容器有尺寸
    if (width <= 0 || height <= 0) {
      console.error('资金流向图容器尺寸无效:', width, 'x', height)

      // 尝试设置容器尺寸
      container.style.width = '100%'
      container.style.height = '400px'
      container.style.minWidth = '300px'
      container.style.minHeight = '300px'

      console.log('已尝试设置资金流向图容器尺寸')
    }

    // 如果已经存在实例，先销毁
    if (flowChart.value) {
      console.log('销毁旧的资金流向图实例')
      flowChart.value.dispose()
    }

    // 创建新实例
    console.log('创建新的资金流向图实例')
    flowChart.value = echarts.init(container)
    console.log('资金流向图实例已创建')

    // 提取数据
    const industries = industryFlowData.value.map((item) => item.industry)
    const flowValues = industryFlowData.value.map((item) => parseFloat(item.flow))

    console.log('资金流向图数据已提取:', industries.length, '个行业')

    const option = {
      title: {
        text: '行业资金流向',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          const data = params[0]
          const industry = data.name
          const industryData = industryFlowData.value.find((item) => item.industry === industry)
          if (!industryData) return ''

          let html = `<div style="font-weight:bold">${industry}</div>`
          html += `<div>资金流向: ${industryData.flowText}</div>`
          html += `<div>涨跌幅: ${industryData.changePercent}</div>`
          html += `<div>成分股数量: ${industryData.stockCount}</div>`
          html += `<div style="margin-top:5px">龙头股:</div>`

          industryData.topStocks.forEach((stock: any) => {
            html += `<div>${stock.name}: ${stock.flow}亿</div>`
          })

          return html
        },
      },
      grid: {
        top: '60px',
        bottom: '10%',
        left: '3%',
        right: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => {
            return value > 0 ? `+${value}亿` : `${value}亿`
          },
        },
      },
      yAxis: {
        type: 'category',
        data: industries,
        axisLabel: {
          interval: 0,
          rotate: 0,
        },
      },
      series: [
        {
          name: '资金流向',
          type: 'bar',
          data: flowValues,
          itemStyle: {
            color: (params: any) => {
              return params.value >= 0 ? '#c23531' : '#3b9a3c'
            },
          },
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => {
              return params.value >= 0 ? `+${params.value}亿` : `${params.value}亿`
            },
          },
        },
      ],
    }

    flowChart.value.setOption(option)
    console.log('资金流向图选项已设置')
  } catch (err) {
    console.error('初始化资金流向图失败:', err)
  }
}

// 初始化行业表现图
const initPerformanceChart = () => {
  try {
    if (!performanceChartRef.value || !industryFlowData.value.length) {
      console.error('行业表现图容器引用不存在或数据为空')
      return
    }

    // 检查容器尺寸
    const container = performanceChartRef.value
    const width = container.clientWidth
    const height = container.clientHeight

    console.log('开始初始化行业表现图，容器尺寸:', width, 'x', height)

    // 确保容器有尺寸
    if (width <= 0 || height <= 0) {
      console.error('行业表现图容器尺寸无效:', width, 'x', height)

      // 尝试设置容器尺寸
      container.style.width = '100%'
      container.style.height = '400px'
      container.style.minWidth = '300px'
      container.style.minHeight = '300px'

      console.log('已尝试设置行业表现图容器尺寸')
    }

    // 如果已经存在实例，先销毁
    if (performanceChart.value) {
      console.log('销毁旧的行业表现图实例')
      performanceChart.value.dispose()
    }

    // 创建新实例
    console.log('创建新的行业表现图实例')
    performanceChart.value = echarts.init(container)
    console.log('行业表现图实例已创建')

    // 提取数据
    const industries = industryFlowData.value.map((item) => item.industry)
    const performanceValues = industryFlowData.value.map((item) => parseFloat(item.changePercent))

    console.log('行业表现图数据已提取:', industries.length, '个行业')

    const option = {
      title: {
        text: '行业涨跌幅排行',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
      },
      grid: {
        top: '60px',
        bottom: '10%',
        left: '3%',
        right: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value}%',
        },
      },
      yAxis: {
        type: 'category',
        data: industries,
        axisLabel: {
          interval: 0,
          rotate: 0,
        },
      },
      series: [
        {
          name: '涨跌幅',
          type: 'bar',
          data: performanceValues,
          itemStyle: {
            color: (params: any) => {
              return params.value >= 0 ? '#c23531' : '#3b9a3c'
            },
          },
          label: {
            show: true,
            position: 'right',
            formatter: '{c}%',
          },
        },
      ],
    }

    performanceChart.value.setOption(option)
    console.log('行业表现图选项已设置')
  } catch (err) {
    console.error('初始化行业表现图失败:', err)
  }
}

// 加载数据
const loadData = async () => {
  isLoading.value = true
  error.value = ''

  try {
    // 模拟API调用延迟
    await new Promise((resolve) => setTimeout(resolve, 800))

    // 生成模拟数据
    industryFlowData.value = generateMockData()

    // 初始化图表
    initHeatmapChart()
    initFlowChart()
    initPerformanceChart()
  } catch (err: any) {
    console.error('加载行业轮动数据失败:', err)
    error.value = `加载数据失败: ${err.message || '未知错误'}`

    // 显示错误提示
    if (window.$message) {
      window.$message.error(`加载数据失败: ${err.message || '未知错误'}`)
    }
  } finally {
    isLoading.value = false
  }
}

// 切换时间范围
const changeTimeRange = (range: string) => {
  console.log('切换时间范围:', range)

  // 先销毁现有图表实例，避免内存泄漏
  if (heatmapChart.value) {
    console.log('销毁热力图实例')
    heatmapChart.value.dispose()
    heatmapChart.value = null
  }

  if (flowChart.value) {
    console.log('销毁资金流向图实例')
    flowChart.value.dispose()
    flowChart.value = null
  }

  if (performanceChart.value) {
    console.log('销毁行业表现图实例')
    performanceChart.value.dispose()
    performanceChart.value = null
  }

  // 更新选中的时间范围
  selectedTimeRange.value = range

  // 使用 nextTick 确保 DOM 已经更新
  nextTick(() => {
    // 重新加载数据并初始化图表
    console.log('重新加载数据')

    // 先生成模拟数据
    industryFlowData.value = generateMockData()
    console.log('模拟数据已生成:', industryFlowData.value.length, '个行业')

    // 延迟初始化图表，确保容器已经渲染
    setTimeout(() => {
      console.log('开始重新初始化图表...')

      // 检查热力图容器
      if (heatmapChartRef.value) {
        const width = heatmapChartRef.value.clientWidth
        const height = heatmapChartRef.value.clientHeight
        console.log('热力图容器已找到，尺寸:', width, height)

        if (width > 0 && height > 0) {
          initHeatmapChart()
        } else {
          console.error('热力图容器尺寸无效:', width, height)
        }
      } else {
        console.error('热力图容器未找到')
      }

      // 检查资金流向图容器
      if (flowChartRef.value && industryFlowData.value.length > 0) {
        const width = flowChartRef.value.clientWidth
        const height = flowChartRef.value.clientHeight
        console.log('资金流向图容器已找到，尺寸:', width, height)

        if (width > 0 && height > 0) {
          initFlowChart()
        } else {
          console.error('资金流向图容器尺寸无效:', width, height)
        }
      } else {
        console.error('资金流向图容器未找到或数据为空')
      }

      // 检查行业表现图容器
      if (performanceChartRef.value && industryFlowData.value.length > 0) {
        const width = performanceChartRef.value.clientWidth
        const height = performanceChartRef.value.clientHeight
        console.log('行业表现图容器已找到，尺寸:', width, height)

        if (width > 0 && height > 0) {
          initPerformanceChart()
        } else {
          console.error('行业表现图容器尺寸无效:', width, height)
        }
      } else {
        console.error('行业表现图容器未找到或数据为空')
      }
    }, 500)
  })
}

// 跳转到行业分析页面
const goToIndustryAnalysis = (industry: string) => {
  router.push({
    path: '/industry-analysis',
    query: { industry },
  })
}

// 跳转到股票分析页面
const goToStockAnalysis = (symbol: string) => {
  router.push({
    path: '/stock',
    query: { symbol },
  })
}

// 处理窗口大小变化
const handleResize = () => {
  heatmapChart.value?.resize()
  flowChart.value?.resize()
  performanceChart.value?.resize()
}

// 组件挂载时
onMounted(() => {
  console.log('SectorRotationAnalysis 组件已挂载')

  // 使用 nextTick 确保 DOM 已经渲染完成
  nextTick(() => {
    // 延迟加载数据，给足够时间让 DOM 完全渲染
    setTimeout(() => {
      // 先生成模拟数据
      industryFlowData.value = generateMockData()
      console.log('模拟数据已生成:', industryFlowData.value.length, '个行业')

      // 再次使用 nextTick 确保 DOM 已经更新
      nextTick(() => {
        // 延迟初始化图表，确保容器已经渲染并有正确的尺寸
        setTimeout(() => {
          console.log('开始初始化图表...')

          // 检查热力图容器
          if (heatmapChartRef.value) {
            const width = heatmapChartRef.value.clientWidth
            const height = heatmapChartRef.value.clientHeight
            console.log('热力图容器已找到，尺寸:', width, height)

            if (width > 0 && height > 0) {
              initHeatmapChart()
            } else {
              console.error('热力图容器尺寸无效:', width, height)
            }
          } else {
            console.error('热力图容器未找到')
          }

          // 检查资金流向图容器
          if (flowChartRef.value && industryFlowData.value.length > 0) {
            const width = flowChartRef.value.clientWidth
            const height = flowChartRef.value.clientHeight
            console.log('资金流向图容器已找到，尺寸:', width, height)

            if (width > 0 && height > 0) {
              initFlowChart()
            } else {
              console.error('资金流向图容器尺寸无效:', width, height)
            }
          } else {
            console.error('资金流向图容器未找到或数据为空')
          }

          // 检查行业表现图容器
          if (performanceChartRef.value && industryFlowData.value.length > 0) {
            const width = performanceChartRef.value.clientWidth
            const height = performanceChartRef.value.clientHeight
            console.log('行业表现图容器已找到，尺寸:', width, height)

            if (width > 0 && height > 0) {
              initPerformanceChart()
            } else {
              console.error('行业表现图容器尺寸无效:', width, height)
            }
          } else {
            console.error('行业表现图容器未找到或数据为空')
          }
        }, 1000) // 增加延迟时间到 1 秒
      })
    }, 500) // 增加延迟时间到 0.5 秒
  })

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

// 组件卸载时
onUnmounted(() => {
  // 移除事件监听
  window.removeEventListener('resize', handleResize)

  // 销毁图表实例
  heatmapChart.value?.dispose()
  flowChart.value?.dispose()
  performanceChart.value?.dispose()
})
</script>

<template>
  <div class="sector-rotation">
    <div class="rotation-header">
      <h2>板块轮动分析</h2>
      <div class="time-range-selector">
        <span>时间范围:</span>
        <div class="range-buttons">
          <button
            v-for="range in timeRanges"
            :key="range.id"
            class="btn-small"
            :class="{
              'btn-primary': selectedTimeRange === range.id,
              'btn-outline': selectedTimeRange !== range.id,
            }"
            @click="changeTimeRange(range.id)"
          >
            {{ range.name }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>正在加载数据...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="loadData">重试</button>
    </div>

    <div v-else class="rotation-content">
      <div class="chart-container">
        <div ref="heatmapChartRef" class="chart heatmap-chart"></div>
      </div>

      <div class="charts-row">
        <div class="chart-container half-width">
          <div ref="flowChartRef" class="chart flow-chart"></div>
        </div>
        <div class="chart-container half-width">
          <div ref="performanceChartRef" class="chart performance-chart"></div>
        </div>
      </div>

      <div class="industry-flow-table">
        <h3>行业资金流向详情</h3>
        <table>
          <thead>
            <tr>
              <th>排名</th>
              <th>行业</th>
              <th>资金流向</th>
              <th>涨跌幅</th>
              <th>成分股数量</th>
              <th>龙头股</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(industry, index) in industryFlowData" :key="industry.industry">
              <td>{{ index + 1 }}</td>
              <td>
                <a href="#" @click.prevent="goToIndustryAnalysis(industry.industry)">
                  {{ industry.industry }}
                </a>
              </td>
              <td
                :class="{
                  positive: parseFloat(industry.flow) > 0,
                  negative: parseFloat(industry.flow) < 0,
                }"
              >
                {{ industry.flowText }}
              </td>
              <td :class="{ positive: industry.isPositive, negative: !industry.isPositive }">
                {{ industry.changePercent }}
              </td>
              <td>{{ industry.stockCount }}</td>
              <td class="top-stocks">
                <div v-for="stock in industry.topStocks" :key="stock.symbol" class="top-stock">
                  <a href="#" @click.prevent="goToStockAnalysis(stock.symbol)">
                    {{ stock.name }}
                  </a>
                  <span
                    :class="{
                      positive: parseFloat(stock.flow) > 0,
                      negative: parseFloat(stock.flow) < 0,
                    }"
                  >
                    {{ parseFloat(stock.flow) > 0 ? '+' : '' }}{{ stock.flow }}亿
                  </span>
                </div>
              </td>
              <td>
                <button
                  class="btn-small btn-primary"
                  @click="goToIndustryAnalysis(industry.industry)"
                >
                  分析
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sector-rotation {
  width: 100%;
  margin-bottom: var(--spacing-xl);
}

.rotation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.rotation-header h2 {
  margin: 0;
  color: var(--primary-color);
  font-size: var(--font-size-lg);
}

.time-range-selector {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.time-range-selector span {
  color: var(--text-secondary);
}

.range-buttons {
  display: flex;
  gap: var(--spacing-xs);
}

.btn-small {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
  border-radius: var(--border-radius-sm);
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl) 0;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(66, 185, 131, 0.1);
  border-radius: 50%;
  border-top: 3px solid var(--primary-color);
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-md);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-state {
  color: var(--error-color);
}

.rotation-content {
  margin-top: var(--spacing-lg);
}

.chart-container {
  margin-bottom: var(--spacing-lg);
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  min-height: 300px;
  min-width: 300px;
  width: 100%;
  height: 400px;
  position: relative;
}

.chart {
  width: 100%;
  height: 400px;
  min-width: 300px;
  min-height: 300px;
  display: block;
}

.charts-row {
  display: flex;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.half-width {
  flex: 1;
}

.industry-flow-table h3 {
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
  font-size: var(--font-size-md);
  font-weight: 600;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: var(--spacing-sm);
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}

th {
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  font-weight: 600;
  position: sticky;
  top: 0;
}

tr:hover {
  background-color: var(--bg-secondary);
}

.positive {
  color: var(--success-color);
}

.negative {
  color: var(--error-color);
}

.top-stocks {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.top-stock {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-sm);
}

.top-stock a {
  color: var(--primary-color);
  text-decoration: none;
}

.top-stock a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .rotation-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .charts-row {
    flex-direction: column;
  }

  .chart {
    height: 300px;
  }
}
</style>
