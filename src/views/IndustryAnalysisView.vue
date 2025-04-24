<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'

const isLoading = ref(true)
const industries = ref([])
const selectedIndustry = ref('')
const industryChart = ref(null)
const chart = ref(null)
const performanceChart = ref(null)
const performanceChartInstance = ref(null)

// 模拟行业数据
const industryData = [
  { name: '银行', code: 'bank', stocks: 42, avgPE: 5.8, avgPB: 0.7, monthReturn: 3.2, yearReturn: 12.5 },
  { name: '证券', code: 'securities', stocks: 48, avgPE: 15.2, avgPB: 1.5, monthReturn: 5.1, yearReturn: 18.7 },
  { name: '保险', code: 'insurance', stocks: 12, avgPE: 8.4, avgPB: 1.1, monthReturn: 2.8, yearReturn: 9.6 },
  { name: '房地产', code: 'realestate', stocks: 138, avgPE: 7.2, avgPB: 0.9, monthReturn: -1.5, yearReturn: -8.3 },
  { name: '医药生物', code: 'medicine', stocks: 325, avgPE: 32.5, avgPB: 4.2, monthReturn: 4.7, yearReturn: 22.1 },
  { name: '电子', code: 'electronics', stocks: 412, avgPE: 28.7, avgPB: 3.8, monthReturn: 6.2, yearReturn: 31.5 },
  { name: '计算机', code: 'computer', stocks: 278, avgPE: 35.2, avgPB: 4.5, monthReturn: 7.8, yearReturn: 28.9 },
  { name: '通信', code: 'communication', stocks: 98, avgPE: 25.3, avgPB: 3.2, monthReturn: 3.5, yearReturn: 15.2 },
  { name: '汽车', code: 'automobile', stocks: 175, avgPE: 18.6, avgPB: 2.1, monthReturn: 2.2, yearReturn: 10.8 },
  { name: '食品饮料', code: 'food', stocks: 102, avgPE: 30.1, avgPB: 5.8, monthReturn: 1.8, yearReturn: 25.3 },
  { name: '家用电器', code: 'appliance', stocks: 45, avgPE: 15.8, avgPB: 2.7, monthReturn: 0.5, yearReturn: 7.2 },
  { name: '纺织服装', code: 'textile', stocks: 87, avgPE: 22.3, avgPB: 2.5, monthReturn: -0.8, yearReturn: 5.6 },
]

// 模拟行业内股票数据
const getIndustryStocks = (industry) => {
  // 生成该行业的模拟股票数据
  const stocks = []
  const count = Math.floor(Math.random() * 20) + 10 // 10-30只股票
  
  for (let i = 0; i < count; i++) {
    const price = Math.random() * 50 + 5
    const change = (Math.random() * 10 - 5).toFixed(2)
    
    stocks.push({
      name: `${industry.name}股票${i+1}`,
      code: `${industry.code}${i+1}`,
      price: price.toFixed(2),
      change: change,
      pe: (Math.random() * 40 + 5).toFixed(1),
      pb: (Math.random() * 5 + 0.5).toFixed(1),
      marketCap: (price * (Math.random() * 10 + 1) * 100000000).toFixed(0),
      volume: Math.floor(Math.random() * 1000000 + 100000)
    })
  }
  
  // 按涨跌幅排序
  return stocks.sort((a, b) => parseFloat(b.change) - parseFloat(a.change))
}

// 初始化页面
onMounted(() => {
  // 设置行业数据
  industries.value = industryData
  
  // 默认选择第一个行业
  if (industryData.length > 0) {
    selectedIndustry.value = industryData[0]
    initIndustryChart()
    initPerformanceChart()
  }
  
  isLoading.value = false
})

// 选择行业
const selectIndustry = (industry) => {
  selectedIndustry.value = industry
  initIndustryChart()
  initPerformanceChart()
}

// 初始化行业分布图表
const initIndustryChart = () => {
  if (!industryChart.value) return
  
  if (chart.value) {
    chart.value.dispose()
  }
  
  chart.value = echarts.init(industryChart.value)
  
  // 准备数据
  const data = industryData.map(item => ({
    name: item.name,
    value: item.stocks
  }))
  
  const option = {
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
  
  chart.value.setOption(option)
  
  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    chart.value?.resize()
  })
}

// 初始化行业表现图表
const initPerformanceChart = () => {
  if (!performanceChart.value) return
  
  if (performanceChartInstance.value) {
    performanceChartInstance.value.dispose()
  }
  
  performanceChartInstance.value = echarts.init(performanceChart.value)
  
  // 准备数据
  const industries = industryData.map(item => item.name)
  const monthReturn = industryData.map(item => item.monthReturn)
  const yearReturn = industryData.map(item => item.yearReturn)
  
  const option = {
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
      data: industries,
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
          color: function(params) {
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
          color: function(params) {
            return params.data >= 0 ? '#e74c3c' : '#2ecc71'
          }
        }
      }
    ]
  }
  
  performanceChartInstance.value.setOption(option)
  
  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    performanceChartInstance.value?.resize()
  })
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
            <div ref="industryChart" class="industry-chart"></div>
          </div>
          
          <div class="industry-performance-container">
            <h3>行业表现</h3>
            <div ref="performanceChart" class="performance-chart"></div>
          </div>
        </div>
      </div>
      
      <!-- 行业列表 -->
      <div class="card industry-list">
        <div class="card-header">
          <h2>行业列表</h2>
          <div class="search-box">
            <input type="text" placeholder="搜索行业..." class="search-input" />
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
              <tr 
                v-for="industry in industries" 
                :key="industry.code"
                :class="{ 'selected': selectedIndustry === industry }"
                @click="selectIndustry(industry)"
              >
                <td>{{ industry.name }}</td>
                <td>{{ industry.stocks }}</td>
                <td>{{ industry.avgPE }}</td>
                <td>{{ industry.avgPB }}</td>
                <td :class="industry.monthReturn >= 0 ? 'up' : 'down'">
                  {{ industry.monthReturn >= 0 ? '+' : '' }}{{ industry.monthReturn }}%
                </td>
                <td :class="industry.yearReturn >= 0 ? 'up' : 'down'">
                  {{ industry.yearReturn >= 0 ? '+' : '' }}{{ industry.yearReturn }}%
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
              <tr v-for="stock in getIndustryStocks(selectedIndustry)" :key="stock.code">
                <td>{{ stock.name }}</td>
                <td>{{ stock.code }}</td>
                <td>{{ stock.price }}</td>
                <td :class="parseFloat(stock.change) >= 0 ? 'up' : 'down'">
                  {{ parseFloat(stock.change) >= 0 ? '+' : '' }}{{ stock.change }}%
                </td>
                <td>{{ stock.pe }}</td>
                <td>{{ stock.pb }}</td>
                <td>{{ formatMarketCap(stock.marketCap) }}</td>
                <td>{{ formatVolume(stock.volume) }}</td>
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
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

.industry-chart,
.performance-chart {
  width: 100%;
  height: 100%;
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
