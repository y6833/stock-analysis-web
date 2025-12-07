<script setup lang="ts">
import { ref, onMounted, computed, nextTick, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const isLoading = ref(true)
const industries = ref<any[]>([])
const selectedIndustry = ref<any>(null)
const industryChart = ref<HTMLElement | null>(null)
const chart = ref<echarts.ECharts | null>(null)
const performanceChart = ref<HTMLElement | null>(null)
const performanceChartInstance = ref<echarts.ECharts | null>(null)
const industryStocks = ref<any[]>([])
const loadingStocks = ref(false)
const searchKeyword = ref('')

// 获取行业数据
async function fetchIndustryData() {
  try {
    isLoading.value = true
    
    // 调用后端API获取行业板块数据
    const response = await axios.post('/api/market/sectors', {
      forceRefresh: true
    })

    if (response.data && response.data.success && response.data.data) {
      const sectors = response.data.data
      
      // 转换数据格式以匹配前端需求
      industries.value = sectors.map((sector: any) => ({
        name: sector.name,
        code: sector.code,
        stocks: sector.stockCount || sector.upCount + sector.downCount + sector.flatCount || 0,
        avgPE: sector.avgPE || 0,
        avgPB: sector.avgPB || 0,
        monthReturn: sector.monthReturn || sector.changePercent || 0,
        yearReturn: sector.yearReturn || 0,
        changePercent: sector.changePercent || 0,
        volume: sector.volume || 0,
        turnover: sector.turnover || 0,
        upCount: sector.upCount || 0,
        downCount: sector.downCount || 0,
        flatCount: sector.flatCount || 0,
        dataSource: response.data.data_source,
        dataSourceMessage: response.data.data_source_message
      }))

      // 如果数据源是模拟数据，显示提示
      if (response.data.data_source === 'mock') {
        ElMessage.warning('当前显示的是模拟数据，真实数据获取失败')
      } else {
        ElMessage.success(`成功获取 ${industries.value.length} 个行业数据`)
      }

      // 默认选择第一个行业
      if (industries.value.length > 0) {
        selectedIndustry.value = industries.value[0]
        await fetchIndustryStocks(selectedIndustry.value)
        // 等待 DOM 更新完成后再初始化图表
        await nextTick()
        // 使用 setTimeout 确保容器已经渲染并有尺寸
        setTimeout(() => {
          initIndustryChart()
          initPerformanceChart()
        }, 100)
      }
    } else {
      throw new Error('API返回数据格式错误')
    }
  } catch (error: any) {
    console.error('获取行业数据失败:', error)
    ElMessage.error(`获取行业数据失败: ${error.message || '未知错误'}`)
    
    // 如果API失败，使用默认的行业列表
    industries.value = [
      { name: '银行', code: 'BK0475', stocks: 0, avgPE: 0, avgPB: 0, monthReturn: 0, yearReturn: 0 },
      { name: '房地产', code: 'BK0451', stocks: 0, avgPE: 0, avgPB: 0, monthReturn: 0, yearReturn: 0 },
      { name: '证券', code: 'BK0473', stocks: 0, avgPE: 0, avgPB: 0, monthReturn: 0, yearReturn: 0 },
      { name: '保险', code: 'BK0474', stocks: 0, avgPE: 0, avgPB: 0, monthReturn: 0, yearReturn: 0 },
      { name: '医药生物', code: 'BK0459', stocks: 0, avgPE: 0, avgPB: 0, monthReturn: 0, yearReturn: 0 },
      { name: '电子', code: 'BK0460', stocks: 0, avgPE: 0, avgPB: 0, monthReturn: 0, yearReturn: 0 },
      { name: '计算机', code: 'BK0459', stocks: 0, avgPE: 0, avgPB: 0, monthReturn: 0, yearReturn: 0 },
    ]
  } finally {
    isLoading.value = false
  }
}

// 获取行业内的股票列表
async function fetchIndustryStocks(industry: any) {
  if (!industry || !industry.code) return
  
  try {
    loadingStocks.value = true
    
    // 调用后端API获取行业内的股票
    // 注意：这里需要后端提供获取行业内股票的API
    // 暂时使用股票搜索API，按行业筛选
    const response = await axios.get('/api/v1/stocks/search', {
      params: {
        keyword: industry.name,
        limit: 50
      }
    })

    if (response.data && response.data.data) {
      industryStocks.value = response.data.data.map((stock: any) => ({
        name: stock.name,
        code: stock.symbol || stock.code,
        price: stock.price || stock.current || 0,
        change: stock.changePercent || stock.change || 0,
        pe: stock.pe || 0,
        pb: stock.pb || 0,
        marketCap: stock.marketCap || stock.total_mv || 0,
        volume: stock.volume || 0
      }))
    }
  } catch (error: any) {
    console.error('获取行业股票列表失败:', error)
    industryStocks.value = []
  } finally {
    loadingStocks.value = false
  }
}

// 过滤后的行业列表
const filteredIndustries = computed(() => {
  if (!searchKeyword.value) return industries.value
  const keyword = searchKeyword.value.toLowerCase()
  return industries.value.filter(industry => 
    industry.name.toLowerCase().includes(keyword) ||
    industry.code.toLowerCase().includes(keyword)
  )
})

// 清理图表资源
onBeforeUnmount(() => {
  if (chart.value) {
    chart.value.dispose()
    chart.value = null
  }
  if (performanceChartInstance.value) {
    performanceChartInstance.value.dispose()
    performanceChartInstance.value = null
  }
})

// 初始化页面
onMounted(async () => {
  await fetchIndustryData()
  // 确保在数据加载完成后初始化图表
  await nextTick()
  setTimeout(() => {
    if (industries.value.length > 0) {
      initIndustryChart()
      initPerformanceChart()
    }
  }, 300)
})

// 选择行业
const selectIndustry = async (industry: any) => {
  selectedIndustry.value = industry
  await fetchIndustryStocks(industry)
  // 图表数据不会因为选择行业而改变，所以不需要重新初始化
  // 如果需要根据选择的行业更新图表，可以在这里添加逻辑
}

// 初始化行业分布图表
const initIndustryChart = () => {
  if (!industryChart.value) {
    console.warn('行业分布图表容器未找到')
    return
  }

  // 检查容器是否有尺寸
  const container = industryChart.value as HTMLElement
  if (container.offsetWidth === 0 || container.offsetHeight === 0) {
    console.warn('行业分布图表容器尺寸为0，延迟初始化')
    setTimeout(() => initIndustryChart(), 200)
    return
  }

  // 准备数据
  const data = industries.value
    .filter(item => (item.stocks || 0) > 0) // 过滤掉股票数为0的行业
    .map(item => ({
      name: item.name || '未知行业',
      value: item.stocks || 1 // 确保值大于0
    }))

  // 如果数据为空，不创建图表
  if (data.length === 0) {
    console.warn('行业分布数据为空')
    if (chart.value) {
      chart.value.dispose()
      chart.value = null
    }
    return
  }

  try {
    // 先销毁旧图表
    if (chart.value) {
      chart.value.dispose()
      chart.value = null
    }

    // 创建新图表实例
    chart.value = echarts.init(industryChart.value)

    const option: any = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        data: data.map(item => item.name)
      },
      series: [
        {
          name: '行业分布',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '50%'],
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
    }

    // 使用 notMerge: false 确保完全替换配置
    chart.value.setOption(option, { notMerge: true })

    // 响应窗口大小变化
    const resizeHandler = () => {
      if (chart.value) {
        chart.value.resize()
      }
    }
    window.addEventListener('resize', resizeHandler)
  } catch (error) {
    console.error('初始化行业分布图表失败:', error)
    if (chart.value) {
      chart.value.dispose()
      chart.value = null
    }
  }
}

// 初始化行业表现图表
const initPerformanceChart = () => {
  if (!performanceChart.value) {
    console.warn('行业表现图表容器未找到')
    return
  }

  // 检查容器是否有尺寸
  const container = performanceChart.value as HTMLElement
  if (container.offsetWidth === 0 || container.offsetHeight === 0) {
    console.warn('行业表现图表容器尺寸为0，延迟初始化')
    setTimeout(() => initPerformanceChart(), 200)
    return
  }

  // 准备数据
  const industryNames = industries.value.map(item => item.name || '未知行业')
  const monthReturn = industries.value.map(item => item.monthReturn || 0)
  const yearReturn = industries.value.map(item => item.yearReturn || 0)

  // 如果数据为空，不创建图表
  if (industryNames.length === 0) {
    console.warn('行业表现数据为空')
    if (performanceChartInstance.value) {
      performanceChartInstance.value.dispose()
      performanceChartInstance.value = null
    }
    return
  }

  try {
    // 先销毁旧图表
    if (performanceChartInstance.value) {
      performanceChartInstance.value.dispose()
      performanceChartInstance.value = null
    }

    // 创建新图表实例
    performanceChartInstance.value = echarts.init(performanceChart.value)

    const option: any = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['月涨跌幅', '年涨跌幅']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
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
        data: industryNames,
        inverse: true
      },
      series: [
        {
          name: '月涨跌幅',
          type: 'bar',
          data: monthReturn,
          label: {
            show: true,
            formatter: '{c}%',
            position: 'right'
          },
          itemStyle: {
            color: function (params: any) {
              return params.data >= 0 ? '#e74c3c' : '#2ecc71'
            }
          }
        },
        {
          name: '年涨跌幅',
          type: 'bar',
          data: yearReturn,
          label: {
            show: true,
            formatter: '{c}%',
            position: 'right'
          },
          itemStyle: {
            color: function (params: any) {
              return params.data >= 0 ? '#e74c3c' : '#2ecc71'
            }
          }
        }
      ]
    }

    // 使用 notMerge: true 确保完全替换配置
    performanceChartInstance.value.setOption(option, { notMerge: true })

    // 响应窗口大小变化
    const resizeHandler = () => {
      if (performanceChartInstance.value) {
        performanceChartInstance.value.resize()
      }
    }
    window.addEventListener('resize', resizeHandler)
  } catch (error) {
    console.error('初始化行业表现图表失败:', error)
    if (performanceChartInstance.value) {
      performanceChartInstance.value.dispose()
      performanceChartInstance.value = null
    }
  }
}

// 格式化市值
const formatMarketCap = (value) => {
  const num = parseFloat(value)
  if (num >= 100000000000) {
    return (num / 100000000000).toFixed(2) + '千亿'
  } else if (num >= 10000000000) {
    return (num / 10000000000).toFixed(2) + '百亿'
  } else {
    return (num / 100000000).toFixed(2) + '亿'
  }
}

// 格式化成交量
const formatVolume = (value) => {
  const num = parseFloat(value)
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + '百万'
  } else if (num >= 10000) {
    return (num / 10000).toFixed(2) + '万'
  } else {
    return num.toString()
  }
}
</script>

<template>
  <div class="industry-analysis-view">
    <div class="page-header">
      <h1>行业分析</h1>
      <p class="subtitle">深入分析各行业板块表现，发现投资机会</p>
    </div>

    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>正在加载行业数据...</p>
    </div>

    <div v-else class="industry-content">
      <!-- 行业概览 -->
      <div class="card industry-overview">
        <div class="card-header">
          <h2>行业概览</h2>
        </div>

        <div class="overview-content">
          <div class="industry-chart-container">
            <h3>行业分布</h3>
            <div v-if="industries.length === 0" class="chart-placeholder">
              <p>暂无行业数据</p>
            </div>
            <div v-else ref="industryChart" class="industry-chart"></div>
          </div>

          <div class="industry-performance-container">
            <h3>行业表现</h3>
            <div v-if="industries.length === 0" class="chart-placeholder">
              <p>暂无行业数据</p>
            </div>
            <div v-else ref="performanceChart" class="performance-chart"></div>
          </div>
        </div>
      </div>

      <!-- 行业列表 -->
      <div class="card industry-list">
        <div class="card-header">
          <h2>行业列表</h2>
          <div class="search-box">
            <input 
              type="text" 
              v-model="searchKeyword"
              placeholder="搜索行业..." 
              class="search-input" 
            />
          </div>
        </div>

        <div class="industry-table-container">
          <table class="industry-table">
            <thead>
              <tr>
                <th>行业名称</th>
                <th>股票数量</th>
                <th>平均市盈率</th>
                <th>平均市净率</th>
                <th>月涨跌幅</th>
                <th>年涨跌幅</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="industry in filteredIndustries" :key="industry.code"
                :class="{ 'selected': selectedIndustry?.code === industry.code }" @click="selectIndustry(industry)">
                <td>{{ industry.name }}</td>
                <td>{{ industry.stocks || 0 }}</td>
                <td>{{ industry.avgPE ? industry.avgPE.toFixed(2) : '-' }}</td>
                <td>{{ industry.avgPB ? industry.avgPB.toFixed(2) : '-' }}</td>
                <td :class="(industry.monthReturn || 0) >= 0 ? 'up' : 'down'">
                  {{ (industry.monthReturn || 0) >= 0 ? '+' : '' }}{{ (industry.monthReturn || 0).toFixed(2) }}%
                </td>
                <td :class="(industry.yearReturn || 0) >= 0 ? 'up' : 'down'">
                  {{ (industry.yearReturn || 0) >= 0 ? '+' : '' }}{{ (industry.yearReturn || 0).toFixed(2) }}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 行业详情 -->
      <div v-if="selectedIndustry" class="card industry-detail">
        <div class="card-header">
          <h2>{{ selectedIndustry.name }}行业详情</h2>
          <div class="industry-stats">
            <div class="stat-item">
              <div class="stat-label">股票数量</div>
              <div class="stat-value">{{ selectedIndustry.stocks }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">平均市盈率</div>
              <div class="stat-value">{{ selectedIndustry.avgPE }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">平均市净率</div>
              <div class="stat-value">{{ selectedIndustry.avgPB }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">月涨跌幅</div>
              <div class="stat-value" :class="selectedIndustry.monthReturn >= 0 ? 'up' : 'down'">
                {{ selectedIndustry.monthReturn >= 0 ? '+' : '' }}{{ selectedIndustry.monthReturn }}%
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-label">年涨跌幅</div>
              <div class="stat-value" :class="selectedIndustry.yearReturn >= 0 ? 'up' : 'down'">
                {{ selectedIndustry.yearReturn >= 0 ? '+' : '' }}{{ selectedIndustry.yearReturn }}%
              </div>
            </div>
          </div>
        </div>

        <div class="industry-stocks">
          <h3>行业成分股</h3>
          <table class="stocks-table">
            <thead>
              <tr>
                <th>股票名称</th>
                <th>股票代码</th>
                <th>最新价</th>
                <th>涨跌幅</th>
                <th>市盈率</th>
                <th>市净率</th>
                <th>市值</th>
                <th>成交量</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingStocks">
                <td colspan="8" style="text-align: center; padding: 20px;">
                  正在加载股票数据...
                </td>
              </tr>
              <tr v-else-if="industryStocks.length === 0">
                <td colspan="8" style="text-align: center; padding: 20px; color: var(--text-secondary);">
                  暂无股票数据
                </td>
              </tr>
              <tr v-else v-for="stock in industryStocks" :key="stock.code">
                <td>{{ stock.name }}</td>
                <td>{{ stock.code }}</td>
                <td>{{ stock.price ? stock.price.toFixed(2) : '-' }}</td>
                <td :class="(stock.change || 0) >= 0 ? 'up' : 'down'">
                  {{ (stock.change || 0) >= 0 ? '+' : '' }}{{ (stock.change || 0).toFixed(2) }}%
                </td>
                <td>{{ stock.pe ? stock.pe.toFixed(2) : '-' }}</td>
                <td>{{ stock.pb ? stock.pb.toFixed(2) : '-' }}</td>
                <td>{{ stock.marketCap ? formatMarketCap(stock.marketCap) : '-' }}</td>
                <td>{{ stock.volume ? formatVolume(stock.volume) : '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.industry-analysis-view {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.page-header {
  margin: var(--spacing-lg) 0;
  text-align: center;
}

.page-header h1 {
  font-size: var(--font-size-xl);
  color: var(--primary-color);
  margin-bottom: var(--spacing-xs);
  font-weight: 700;
}

.subtitle {
  color: var(--text-secondary);
  font-size: var(--font-size-md);
  max-width: 700px;
  margin: 0 auto;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(66, 185, 131, 0.1);
  border-radius: 50%;
  border-top: 4px solid var(--accent-color);
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

.industry-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.card {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
}

.card-header {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.card-header h2 {
  font-size: var(--font-size-lg);
  color: var(--primary-color);
  margin: 0;
  font-weight: 600;
}

.search-box {
  position: relative;
}

.search-input {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  width: 200px;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.2);
}

/* 行业概览 */
.overview-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
}

.industry-chart-container,
.industry-performance-container {
  height: 400px;
}

.industry-chart-container h3,
.industry-performance-container h3 {
  font-size: var(--font-size-md);
  color: var(--primary-color);
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  font-weight: 600;
}

.industry-chart,
.performance-chart {
  width: 100%;
  height: 100%;
  min-height: 300px;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  color: var(--text-secondary);
  font-size: var(--font-size-md);
}

.industry-performance-container h3 {
  font-size: var(--font-size-md);
  color: var(--primary-color);
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  font-weight: 600;
}

/* 行业列表 */
.industry-table-container {
  overflow-x: auto;
}

.industry-table {
  width: 100%;
  border-collapse: collapse;
}

.industry-table th,
.industry-table td {
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}

.industry-table th {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  background-color: var(--bg-secondary);
}

.industry-table tr {
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.industry-table tr:hover {
  background-color: var(--bg-secondary);
}

.industry-table tr.selected {
  background-color: rgba(66, 185, 131, 0.1);
  border-left: 3px solid var(--accent-color);
}

.up {
  color: var(--stock-up);
}

.down {
  color: var(--stock-down);
}

/* 行业详情 */
.industry-stats {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
  background-color: var(--bg-secondary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-md);
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.stat-value {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-primary);
}

.industry-stocks {
  padding: var(--spacing-lg);
}

.industry-stocks h3 {
  font-size: var(--font-size-md);
  color: var(--primary-color);
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  font-weight: 600;
}

.stocks-table {
  width: 100%;
  border-collapse: collapse;
}

.stocks-table th,
.stocks-table td {
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: left;
  border-bottom: 1px solid var(--border-light);
  font-size: var(--font-size-sm);
}

.stocks-table th {
  font-weight: 600;
  color: var(--text-secondary);
  background-color: var(--bg-secondary);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .overview-content {
    grid-template-columns: 1fr;
  }

  .industry-chart-container,
  .industry-performance-container {
    height: 300px;
  }
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .search-box {
    width: 100%;
  }

  .search-input {
    width: 100%;
  }

  .industry-stats {
    justify-content: center;
    width: 100%;
    margin-top: var(--spacing-sm);
  }
}
</style>
