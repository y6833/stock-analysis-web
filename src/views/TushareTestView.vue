<template>
  <div class="tushare-test">
    <h1>Tushare API 测试</h1>

    <div class="test-controls">
      <button @click="testConnection" :disabled="isLoading">测试 API 连接</button>
      <button @click="getStockList" :disabled="isLoading">获取股票列表</button>
      <button @click="getStockData" :disabled="isLoading || !selectedStock">获取股票数据</button>
    </div>

    <div v-if="isLoading" class="loading">
      <p>正在加载数据，请稍候...</p>
    </div>

    <div v-if="error" class="error">
      <h3>错误信息</h3>
      <pre>{{ error }}</pre>
    </div>

    <div v-if="connectionStatus" class="status">
      <h3>连接状态</h3>
      <p>{{ connectionStatus }}</p>
    </div>

    <div v-if="stocks.length > 0" class="stock-list">
      <h3>股票列表 (显示前20条)</h3>
      <table>
        <thead>
          <tr>
            <th>代码</th>
            <th>名称</th>
            <th>市场</th>
            <th>行业</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="stock in stocks.slice(0, 20)" :key="stock.symbol">
            <td>{{ stock.symbol }}</td>
            <td>{{ stock.name }}</td>
            <td>{{ stock.market }}</td>
            <td>{{ stock.industry }}</td>
            <td>
              <button @click="selectStock(stock)">选择</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="selectedStock" class="selected-stock">
      <h3>已选择股票</h3>
      <p>{{ selectedStock.name }} ({{ selectedStock.symbol }})</p>
    </div>

    <div v-if="stockData" class="stock-data">
      <h3>股票数据</h3>
      <p>股票: {{ stockData.symbol }}</p>
      <p>数据点数量: {{ stockData.dates.length }}</p>
      <p>最新收盘价: {{ stockData.close }}</p>
      <p>最高价: {{ stockData.high }}</p>
      <p>最低价: {{ stockData.low }}</p>

      <h4>最近5天数据</h4>
      <table>
        <thead>
          <tr>
            <th>日期</th>
            <th>开盘价</th>
            <th>收盘价</th>
            <th>成交量</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(date, index) in stockData.dates.slice(-5)" :key="date">
            <td>{{ date }}</td>
            <td>{{ stockData.prices[stockData.dates.length - 5 + index].toFixed(2) }}</td>
            <td>{{ stockData.prices[stockData.dates.length - 5 + index].toFixed(2) }}</td>
            <td>{{ stockData.volumes[stockData.dates.length - 5 + index].toFixed(0) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="raw-response" v-if="rawResponse">
      <h3>原始响应数据</h3>
      <pre>{{ rawResponse }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
import type { Stock, StockData } from '@/types/stock'
import { tushareService } from '@/services/tushareService'

// 状态
const isLoading = ref(false)
const error = ref('')
const connectionStatus = ref('')
const stocks = ref<Stock[]>([])
const selectedStock = ref<Stock | null>(null)
const stockData = ref<StockData | null>(null)
const rawResponse = ref('')

// Tushare API 配置
// 使用本地代理服务器避免 CORS 问题
const TUSHARE_API_URL = 'http://localhost:3000/api/tushare'
const TOKEN = '983b25aa025eee598034c4741dc776dd73356ddc53ddcffbb180cf61'

// 测试 API 连接
const testConnection = async () => {
  isLoading.value = true
  error.value = ''
  connectionStatus.value = '正在测试连接...'
  rawResponse.value = ''

  try {
    const response = await axios.post(TUSHARE_API_URL, {
      api_name: 'stock_basic',
      token: TOKEN,
      params: {
        exchange: '',
        list_status: 'L',
        fields: 'ts_code,name,industry,market,list_date'
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*'
      }
    })

    if (response.data && response.data.code === 0) {
      connectionStatus.value = `连接成功! 获取到 ${response.data.data.items.length} 条数据`
      rawResponse.value = JSON.stringify(response.data, null, 2)
    } else {
      connectionStatus.value = '连接失败!'
      error.value = response.data.msg || '未知错误'
    }
  } catch (err: any) {
    connectionStatus.value = '连接失败!'
    error.value = err.message || '未知错误'
    console.error('API 连接测试错误:', err)
  } finally {
    isLoading.value = false
  }
}

// 获取股票列表
const getStockList = async () => {
  isLoading.value = true
  error.value = ''
  stocks.value = []
  rawResponse.value = ''

  try {
    stocks.value = await tushareService.getStocks()
    if (stocks.value.length > 0) {
      connectionStatus.value = `成功获取 ${stocks.value.length} 只股票信息`
    } else {
      connectionStatus.value = '获取股票列表失败或列表为空'
    }
  } catch (err: any) {
    error.value = err.message || '获取股票列表失败'
    console.error('获取股票列表错误:', err)
  } finally {
    isLoading.value = false
  }
}

// 选择股票
const selectStock = (stock: Stock) => {
  selectedStock.value = stock
  stockData.value = null
}

// 获取股票数据
const getStockData = async () => {
  if (!selectedStock.value) return

  isLoading.value = true
  error.value = ''
  stockData.value = null
  rawResponse.value = ''

  try {
    stockData.value = await tushareService.getStockData(selectedStock.value.symbol)
    connectionStatus.value = `成功获取 ${selectedStock.value.name} 的股票数据`
  } catch (err: any) {
    error.value = err.message || '获取股票数据失败'
    console.error('获取股票数据错误:', err)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.tushare-test {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.test-controls {
  margin-bottom: 20px;
}

button {
  background-color: #4CAF50;
  border: none;
  color: white;
  padding: 10px 15px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  margin-right: 10px;
  cursor: pointer;
  border-radius: 4px;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.loading, .error, .status, .stock-list, .selected-stock, .stock-data, .raw-response {
  margin-top: 20px;
  padding: 15px;
  border-radius: 4px;
}

.loading {
  background-color: #f0f0f0;
}

.error {
  background-color: #ffebee;
  color: #c62828;
}

.status {
  background-color: #e8f5e9;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

th {
  background-color: #f2f2f2;
}

pre {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 300px;
}
</style>
