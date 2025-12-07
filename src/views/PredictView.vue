<template>
  <div class="predict-container">
    <!-- 头部标题区域 -->
    <div class="header-section">
      <div class="title-wrapper">
        <el-icon class="title-icon"><TrendCharts /></el-icon>
        <h1 class="page-title">Kronos AI 股票预测</h1>
      </div>
      <p class="page-subtitle">基于深度学习的时间序列预测模型，预测未来股价走势</p>
    </div>

    <!-- 预测输入区域 -->
    <el-card class="input-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon><Search /></el-icon>
          <span>股票预测</span>
        </div>
      </template>
      
      <el-form :inline="true" @submit.prevent="onPredict" class="predict-form">
        <el-form-item label="股票代码">
          <el-autocomplete
            v-model="symbol"
            :fetch-suggestions="querySearch"
            placeholder="请输入股票代码或名称，如 000070、600977、平安银行"
            style="width: 400px"
            clearable
            :trigger-on-focus="true"
            @select="handleSelect"
            @keyup.enter="onPredict"
            value-key="label"
            popper-class="stock-autocomplete-popper"
          >
            <template #prefix>
              <el-icon><Document /></el-icon>
            </template>
            <template #default="{ item }">
              <div class="autocomplete-item">
                <span class="stock-code">{{ item.code }}</span>
                <span class="stock-name">{{ item.name }}</span>
                <span class="stock-market" v-if="item.market">{{ item.market }}</span>
              </div>
            </template>
          </el-autocomplete>
        </el-form-item>
        <el-form-item>
          <el-button 
            type="primary" 
            :loading="loading"
            @click="onPredict"
            size="large"
            :icon="TrendCharts"
          >
            {{ loading ? '预测中...' : '开始预测' }}
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 错误提示 -->
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="true"
        @close="error = ''"
        show-icon
        style="margin-top: 20px"
      />
    </el-card>

    <!-- 预测结果区域 -->
    <div v-if="hasResults" class="results-section">
      <!-- 统计信息卡片 -->
      <div class="stats-cards">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon price-up">
              <el-icon><ArrowUp /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">预测最高价</div>
              <div class="stat-value">{{ formatPrice(maxPrice) }}</div>
            </div>
          </div>
        </el-card>
        
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon price-down">
              <el-icon><ArrowDown /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">预测最低价</div>
              <div class="stat-value">{{ formatPrice(minPrice) }}</div>
            </div>
          </div>
        </el-card>
        
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon price-avg">
              <el-icon><DataLine /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">预测平均价</div>
              <div class="stat-value">{{ formatPrice(avgPrice) }}</div>
            </div>
          </div>
        </el-card>
        
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon prediction-count">
              <el-icon><Calendar /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">预测天数</div>
              <div class="stat-value">{{ predictionDays }} 天</div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 图表区域 -->
      <el-card class="chart-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon><DataAnalysis /></el-icon>
            <span>预测走势图</span>
            <div class="header-actions">
              <el-button-group>
                <el-button :type="chartType === 'candlestick' ? 'primary' : ''" @click="chartType = 'candlestick'">
                  K线图
                </el-button>
                <el-button :type="chartType === 'line' ? 'primary' : ''" @click="chartType = 'line'">
                  折线图
                </el-button>
              </el-button-group>
            </div>
          </div>
        </template>
        <div ref="chartContainer" class="chart-container"></div>
      </el-card>

      <!-- 数据表格 -->
      <el-card class="table-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon><List /></el-icon>
            <span>预测数据详情</span>
            <div class="header-actions">
              <el-button :icon="Download" @click="exportData">导出数据</el-button>
            </div>
          </div>
        </template>
        <el-table 
          :data="resultRows" 
          stripe
          border
          style="width: 100%"
          :default-sort="{ prop: 'date', order: 'ascending' }"
        >
          <el-table-column prop="date" label="日期" width="180" sortable />
          <el-table-column prop="open" label="开盘价" width="120" :formatter="formatPriceColumn" />
          <el-table-column prop="high" label="最高价" width="120" :formatter="formatPriceColumn" />
          <el-table-column prop="low" label="最低价" width="120" :formatter="formatPriceColumn" />
          <el-table-column prop="close" label="收盘价" width="120" :formatter="formatPriceColumn">
            <template #default="{ row }">
              <span :class="getPriceChangeClass(row.close, row.open)">
                {{ formatPrice(row.close) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="volume" label="成交量" width="150" :formatter="formatVolumeColumn" />
          <el-table-column prop="amount" label="成交额" width="150" :formatter="formatAmountColumn" />
      </el-table>
    </el-card>
    </div>

    <!-- 空状态 -->
    <el-empty 
      v-else-if="resultChecked && !error" 
      description="暂无预测结果，请输入股票代码开始预测"
      :image-size="200"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { 
  TrendCharts, 
  Search, 
  Document, 
  ArrowUp, 
  ArrowDown, 
  DataLine, 
  Calendar,
  DataAnalysis,
  List,
  Download
} from '@element-plus/icons-vue'
import { stockService } from '@/services/stockService'
import type { Stock } from '@/types/stock'

const symbol = ref('')
const error = ref('')
const loading = ref(false)
const result = ref<any>({})
const resultRows = ref<any[]>([])
const columns = ref<string[]>([])
const resultChecked = ref(false)
const chartContainer = ref<HTMLElement | null>(null)
const chartInstance = ref<echarts.ECharts | null>(null)
const chartType = ref<'candlestick' | 'line'>('candlestick')
const searchLoading = ref(false)

// 股票搜索联想
const querySearch = async (queryString: string, cb: (suggestions: any[]) => void) => {
  if (!queryString || queryString.trim().length === 0) {
    cb([])
    return
  }
  
  searchLoading.value = true
  try {
    const results = await stockService.searchStocks(queryString.trim())
    const suggestions = results.slice(0, 10).map((stock: Stock) => ({
      value: stock.symbol || stock.tsCode || stock.code || '',
      code: stock.symbol || stock.tsCode || stock.code || '',
      name: stock.name || '',
      market: stock.market || '',
      label: `${stock.symbol || stock.tsCode || stock.code || ''} ${stock.name || ''}`,
      stock: stock
    }))
    cb(suggestions)
  } catch (error) {
    console.error('搜索股票失败:', error)
    cb([])
  } finally {
    searchLoading.value = false
  }
}

// 选择股票
const handleSelect = (item: any) => {
  if (item && item.code) {
    symbol.value = item.code
    // 可以选择自动触发预测
    // onPredict()
  }
}

// 计算属性
const hasResults = computed(() => resultRows.value.length > 0)

const maxPrice = computed(() => {
  if (!result.value.close || !Array.isArray(result.value.close)) return 0
  return Math.max(...result.value.close.filter((v: any) => v != null))
})

const minPrice = computed(() => {
  if (!result.value.low || !Array.isArray(result.value.low)) return 0
  return Math.min(...result.value.low.filter((v: any) => v != null))
})

const avgPrice = computed(() => {
  if (!result.value.close || !Array.isArray(result.value.close)) return 0
  const prices = result.value.close.filter((v: any) => v != null)
  return prices.reduce((sum: number, val: number) => sum + val, 0) / prices.length
})

const predictionDays = computed(() => {
  return result.value.date?.length || 0
})

// 格式化函数
const formatPrice = (price: number | null | undefined): string => {
  if (price == null || isNaN(price)) return '-'
  return price.toFixed(2)
}

const formatPriceColumn = (row: any, column: any, cellValue: any) => {
  return formatPrice(cellValue)
}

const formatVolumeColumn = (row: any, column: any, cellValue: any) => {
  if (cellValue == null || isNaN(cellValue)) return '-'
  if (cellValue >= 100000000) {
    return (cellValue / 100000000).toFixed(2) + '亿'
  } else if (cellValue >= 10000) {
    return (cellValue / 10000).toFixed(2) + '万'
  }
  return cellValue.toFixed(0)
}

const formatAmountColumn = (row: any, column: any, cellValue: any) => {
  if (cellValue == null || isNaN(cellValue)) return '-'
  if (cellValue >= 100000000) {
    return (cellValue / 100000000).toFixed(2) + '亿'
  } else if (cellValue >= 10000) {
    return (cellValue / 10000).toFixed(2) + '万'
  }
  return cellValue.toFixed(0)
}

const getPriceChangeClass = (close: number, open: number) => {
  if (close > open) return 'price-up-text'
  if (close < open) return 'price-down-text'
  return ''
}

// 导出数据
const exportData = () => {
  if (resultRows.value.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }
  
  const csv = [
    columns.value.join(','),
    ...resultRows.value.map(row => 
      columns.value.map(col => row[col] ?? '').join(',')
    )
  ].join('\n')
  
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `预测数据_${symbol.value}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  ElMessage.success('数据导出成功')
}

// 渲染图表
const renderChart = async () => {
  if (!chartContainer.value || resultRows.value.length === 0) return
  
  await nextTick()
  
  if (!chartInstance.value) {
    chartInstance.value = echarts.init(chartContainer.value)
  }
  
  const dates = result.value.date || []
  const opens = result.value.open || []
  const highs = result.value.high || []
  const lows = result.value.low || []
  const closes = result.value.close || []
  const volumes = result.value.volume || []
  
  let series: any[] = []
  
  if (chartType.value === 'candlestick') {
    // K线图
    series.push({
      name: 'K线',
      type: 'candlestick',
      data: dates.map((_: any, i: number) => [
        opens[i],
        closes[i],
        lows[i],
        highs[i]
      ]),
      itemStyle: {
        color: '#26a69a',
        color0: '#ef5350',
        borderColor: '#26a69a',
        borderColor0: '#ef5350'
      }
    })
  } else {
    // 折线图
    series.push({
      name: '收盘价',
      type: 'line',
      data: closes,
      smooth: true,
      lineStyle: {
        color: '#5470c6',
        width: 2
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(84, 112, 198, 0.3)' },
            { offset: 1, color: 'rgba(84, 112, 198, 0.1)' }
          ]
        }
      }
    })
  }
  
  // 添加成交量
  if (volumes.length > 0) {
    series.push({
      name: '成交量',
      type: 'bar',
      data: volumes,
      yAxisIndex: 1,
      itemStyle: {
        color: (params: any) => {
          const idx = params.dataIndex
          return closes[idx] >= opens[idx] ? '#26a69a' : '#ef5350'
        }
      }
    })
  }
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: chartType.value === 'candlestick' ? ['K线', '成交量'] : ['收盘价', '成交量'],
      bottom: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLine: { onZero: false },
      splitLine: { show: false },
      axisLabel: {
        formatter: (value: string) => {
          if (value.length > 10) {
            return value.substring(5, 10)
          }
          return value
        },
        rotate: 45
      }
    },
    yAxis: [
      {
        type: 'value',
        scale: true,
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed'
          }
        },
        axisLabel: {
          formatter: (value: number) => value.toFixed(2)
        }
      },
      {
        type: 'value',
        scale: true,
        splitLine: { show: false },
        axisLabel: {
          formatter: (value: number) => {
            if (value >= 100000000) return (value / 100000000).toFixed(1) + '亿'
            if (value >= 10000) return (value / 10000).toFixed(1) + '万'
            return value.toFixed(0)
          }
        }
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100
      },
      {
        type: 'slider',
        bottom: 10,
        start: 0,
        end: 100
      }
    ],
    series
  }
  
  chartInstance.value.setOption(option, true)
  
  // 响应式调整
  window.addEventListener('resize', handleResize)
}

const handleResize = () => {
  chartInstance.value?.resize()
}

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance.value?.dispose()
})

async function onPredict() {
  error.value = ''
  result.value = {}
  resultRows.value = []
  columns.value = []
  resultChecked.value = false
  loading.value = true
  
  // 清理图表
  if (chartInstance.value) {
    chartInstance.value.dispose()
    chartInstance.value = null
  }
  
  if (!symbol.value) {
    error.value = '请输入股票代码'
    loading.value = false
    ElMessage.warning('请输入股票代码')
    return
  }
  // 使用相对路径，Vite 会代理到后端
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7001'
  fetch(`${apiUrl}/api/predict?symbol=${symbol.value}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then(async res => {
      // 检查响应状态
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`请求失败: ${res.status} ${res.statusText}${errorText ? ': ' + errorText : ''}`)
      }
      
      // 检查响应内容类型
      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text()
        throw new Error(`响应不是 JSON 格式: ${text.substring(0, 100)}`)
      }
      
      // 尝试解析 JSON
      const text = await res.text()
      if (!text || text.trim() === '') {
        throw new Error('响应为空')
      }
      
      try {
        return JSON.parse(text)
      } catch (e) {
        throw new Error(`JSON 解析失败: ${e.message}, 响应内容: ${text.substring(0, 200)}`)
      }
    })
    .then(data => {
      // 检查服务是否可用
      if (data.serviceAvailable === false) {
        error.value = data.prediction?.note || data.prediction?.message || '预测服务暂时不可用'
        resultChecked.value = true
        return
      }
      
      // 检查文件缺失错误
      if (data.error && data.error.includes('文件未找到')) {
        const details = data.details || {}
        let errorMsg = data.message || data.error
        if (details.model_path || details.tokenizer_path) {
          errorMsg += '\n\n缺失的文件路径:'
          if (details.model_path) errorMsg += `\n- 模型文件: ${details.model_path}`
          if (details.tokenizer_path) errorMsg += `\n- Tokenizer 文件: ${details.tokenizer_path}`
        }
        error.value = errorMsg
        resultChecked.value = true
        return
      }
      
      if (data.error) {
        error.value = data.error + (data.message ? '\n' + data.message : '')
        resultChecked.value = true
        return
      }
      
      const prediction = data.prediction || data
      if (!prediction || Object.keys(prediction).length === 0) {
        error.value = '无预测结果'
        resultChecked.value = true
        return
      }
      
      // 如果预测数据包含 message 字段，说明是降级响应
      if (prediction.message && prediction.status === 'service_unavailable') {
        error.value = prediction.note || prediction.message
        resultChecked.value = true
        return
      }
      // 保存原始结果
      result.value = prediction
      
      columns.value = Object.keys(prediction)
      // 转换为表格行
      const len = prediction[columns.value[0]]?.length || 0
      resultRows.value = []
      for (let i = 0; i < len; i++) {
        const row: any = {}
        columns.value.forEach(k => {
          row[k] = Array.isArray(prediction[k]) ? prediction[k][i] : null
        })
        resultRows.value.push(row)
      }
      resultChecked.value = true
      
      // 渲染图表
      nextTick(() => {
        renderChart()
      })
      
      ElMessage.success('预测完成！')
    })
    .catch(err => {
      console.error('预测请求失败:', err)
      error.value = `请求失败：${err.message || '未知错误'}`
      resultChecked.value = true
      result.value = {}
      resultRows.value = []
      columns.value = []
      ElMessage.error('预测失败：' + err.message)
    })
    .finally(() => {
      loading.value = false
    })
}
</script>

<style scoped>
.predict-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* 头部区域 */
.header-section {
  text-align: center;
  margin-bottom: 30px;
  padding: 40px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
}

.title-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 10px;
}

.title-icon {
  font-size: 48px;
}

.page-title {
  font-size: 36px;
  font-weight: 700;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.page-subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
}

/* 卡片样式 */
.input-card,
.chart-card,
.table-card {
  margin-bottom: 20px;
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
}

.card-header .header-actions {
  margin-left: auto;
}

/* 表单样式 */
.predict-form {
  margin-top: 10px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 12px;
  transition: transform 0.3s, box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
}

.stat-icon.price-up {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.price-down {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.price-avg {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.prediction-count {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}

/* 图表容器 */
.chart-container {
  width: 100%;
  height: 500px;
  min-height: 500px;
}

/* 表格样式 */
.price-up-text {
  color: #f56c6c;
  font-weight: 600;
}

.price-down-text {
  color: #67c23a;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .predict-container {
    padding: 10px;
  }
  
  .page-title {
    font-size: 28px;
  }
  
  .stats-cards {
    grid-template-columns: 1fr;
  }
  
  .chart-container {
    height: 400px;
  }
  
  .predict-form {
    flex-direction: column;
  }
  
  .predict-form :deep(.el-form-item) {
    margin-right: 0;
    width: 100%;
  }
  
  .predict-form :deep(.el-input) {
    width: 100% !important;
  }
}

/* 自动补全样式 */
:deep(.stock-autocomplete-popper) {
  .autocomplete-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    
    .stock-code {
      font-weight: 600;
      color: #303133;
      min-width: 80px;
      font-family: 'Courier New', monospace;
    }
    
    .stock-name {
      flex: 1;
      color: #606266;
    }
    
    .stock-market {
      font-size: 12px;
      color: #909399;
      background: #f0f2f5;
      padding: 2px 8px;
      border-radius: 4px;
    }
  }
}

:deep(.el-autocomplete-suggestion__list) {
  .el-autocomplete-suggestion__item {
    padding: 12px 20px;
    
    &.highlighted {
      background-color: #f5f7fa;
    }
  }
}
</style>
