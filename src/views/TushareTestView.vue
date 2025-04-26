<template>
  <div class="tushare-test">
    <h1>Tushare API 测试</h1>

    <div class="test-controls">
      <button @click="testConnection" :disabled="isLoading">测试 API 连接</button>
      <button @click="getStockList" :disabled="isLoading">获取股票列表</button>
      <button @click="getStockData" :disabled="isLoading || !selectedStock">获取股票数据</button>
    </div>

    <div class="redis-controls">
      <h3>Redis 缓存测试</h3>
      <button @click="testRedisConnection" :disabled="isLoading">测试 Redis 连接</button>
      <button @click="storeStockDataToRedis" :disabled="isLoading || !selectedStock">
        存储当前股票到 Redis
      </button>
      <input v-model="customStockCode" placeholder="输入股票代码 (例如: 000001.SZ)" />
      <button @click="storeCustomStockToRedis" :disabled="isLoading || !customStockCode">
        存储自定义股票到 Redis
      </button>
      <div class="batch-controls">
        <button @click="storeAllStocksToRedis" :disabled="isLoading" class="store-all-button">
          一键存储常用股票到 Redis
        </button>
        <p class="hint">将自动存储沪深主要股票数据，包括茅台、平安、工行等</p>
      </div>
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

    <div class="redis-response" v-if="redisResponse">
      <h3>Redis 测试结果</h3>
      <div v-if="redisResponse.success" class="redis-success">
        <p><strong>状态:</strong> 成功</p>
        <p v-if="redisResponse.redisAvailable"><strong>Redis 可用:</strong> 是</p>

        <div v-if="redisResponse.testData">
          <h4>测试数据:</h4>
          <pre>{{ JSON.stringify(redisResponse.testData, null, 2) }}</pre>
        </div>

        <div v-if="redisResponse.data">
          <!-- 单只股票数据 -->
          <div v-if="redisResponse.stockCode">
            <h4>存储的股票数据:</h4>
            <p><strong>股票代码:</strong> {{ redisResponse.stockCode }}</p>
            <p v-if="redisResponse.data.name">
              <strong>股票名称:</strong> {{ redisResponse.data.name }}
            </p>
            <p v-if="redisResponse.data.history">
              <strong>历史数据条数:</strong> {{ redisResponse.data.history }}
            </p>

            <div v-if="redisResponse.data.keys && redisResponse.data.keys.length > 0">
              <h4>Redis 键:</h4>
              <ul>
                <li v-for="(key, index) in redisResponse.data.keys" :key="index">{{ key }}</li>
              </ul>
            </div>
          </div>

          <!-- 批量处理结果 -->
          <div v-if="redisResponse.totalStocks" class="batch-results">
            <h4>批量处理结果:</h4>
            <p><strong>总股票数:</strong> {{ redisResponse.totalStocks }}</p>
            <p><strong>成功数量:</strong> {{ redisResponse.successCount }}</p>
            <p><strong>失败数量:</strong> {{ redisResponse.failedCount }}</p>
            <p><strong>总耗时:</strong> {{ redisResponse.totalTime.toFixed(2) }} 秒</p>
            <p>
              <strong>平均每只股票耗时:</strong>
              {{ redisResponse.averageTimePerStock.toFixed(2) }} 秒
            </p>

            <div v-if="redisResponse.processedStocks && redisResponse.processedStocks.length > 0">
              <h4>处理详情:</h4>
              <table class="batch-table">
                <thead>
                  <tr>
                    <th>股票代码</th>
                    <th>状态</th>
                    <th>名称</th>
                    <th>历史数据</th>
                    <th>错误信息</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(stock, index) in redisResponse.processedStocks"
                    :key="index"
                    :class="{ 'success-row': stock.success, 'error-row': !stock.success }"
                  >
                    <td>{{ stock.stockCode }}</td>
                    <td>{{ stock.success ? '成功' : '失败' }}</td>
                    <td>{{ stock.data ? stock.data.name : '-' }}</td>
                    <td>{{ stock.data ? stock.data.historyCount : '-' }}</td>
                    <td>{{ stock.error || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-if="redisResponse.existingKeys && redisResponse.existingKeys.length > 0">
          <h4>现有 Redis 键:</h4>
          <ul>
            <li v-for="(key, index) in redisResponse.existingKeys" :key="index">{{ key }}</li>
          </ul>
        </div>
      </div>

      <div v-else class="redis-error">
        <p><strong>状态:</strong> 失败</p>
        <p><strong>错误信息:</strong> {{ redisResponse.error }}</p>
      </div>
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
const redisResponse = ref<any>(null)
const customStockCode = ref('')

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
    const response = await axios.post(
      TUSHARE_API_URL,
      {
        api_name: 'stock_basic',
        token: TOKEN,
        params: {
          exchange: '',
          list_status: 'L',
          fields: 'ts_code,name,industry,market,list_date',
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/plain, */*',
        },
      }
    )

    if (response.data && response.data.code === 0) {
      connectionStatus.value = `连接成功! 获取到 ${response.data.data.items.length} 条数据`
      rawResponse.value = JSON.stringify(response.data, null, 2)

      // 自动存储获取到的股票数据到 Redis
      if (response.data.data && response.data.data.items && response.data.data.items.length > 0) {
        connectionStatus.value = `连接成功! 获取到 ${response.data.data.items.length} 条数据，正在将数据存入 Redis...`

        try {
          // 提取股票代码
          const stockCodes = response.data.data.items
            .map((item) => item[0]) // ts_code 在第一个位置
            .slice(0, 20) // 限制为前20只股票，避免请求过多

          // 调用批量存储接口
          const storeResponse = await axios.get(
            `/api/test/store-all-stocks?codes=${stockCodes.join(',')}`
          )

          if (storeResponse.data.success) {
            connectionStatus.value = `连接成功! 获取到 ${
              response.data.data.items.length
            } 条数据，并将其中 ${storeResponse.data.successCount}/${
              storeResponse.data.totalStocks
            } 只股票数据存入 Redis! 总耗时: ${storeResponse.data.totalTime.toFixed(2)}秒`
            redisResponse.value = storeResponse.data
          } else {
            connectionStatus.value = `连接成功! 获取到 ${
              response.data.data.items.length
            } 条数据，但存储到 Redis 失败: ${storeResponse.data.error || '未知错误'}`
          }
        } catch (storeErr: any) {
          console.error('存储股票数据到 Redis 错误:', storeErr)
          connectionStatus.value = `连接成功! 获取到 ${
            response.data.data.items.length
          } 条数据，但存储到 Redis 失败: ${storeErr.message || '未知错误'}`
        }
      }
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
  connectionStatus.value = '正在获取股票列表...'

  try {
    stocks.value = await tushareService.getStocks()
    if (stocks.value.length > 0) {
      connectionStatus.value = `成功获取 ${stocks.value.length} 只股票信息`

      // 自动存储获取到的股票数据到 Redis
      connectionStatus.value = `成功获取 ${stocks.value.length} 只股票信息，正在将数据存入 Redis...`

      try {
        // 提取股票代码
        const stockCodes = stocks.value.map((stock) => stock.symbol).slice(0, 20) // 限制为前20只股票，避免请求过多

        // 调用批量存储接口
        const storeResponse = await axios.get(
          `/api/test/store-all-stocks?codes=${stockCodes.join(',')}`
        )

        if (storeResponse.data.success) {
          connectionStatus.value = `成功获取 ${stocks.value.length} 只股票信息，并将其中 ${
            storeResponse.data.successCount
          }/${
            storeResponse.data.totalStocks
          } 只股票数据存入 Redis! 总耗时: ${storeResponse.data.totalTime.toFixed(2)}秒`
          redisResponse.value = storeResponse.data
        } else {
          connectionStatus.value = `成功获取 ${
            stocks.value.length
          } 只股票信息，但存储到 Redis 失败: ${storeResponse.data.error || '未知错误'}`
        }
      } catch (storeErr: any) {
        console.error('存储股票数据到 Redis 错误:', storeErr)
        connectionStatus.value = `成功获取 ${
          stocks.value.length
        } 只股票信息，但存储到 Redis 失败: ${storeErr.message || '未知错误'}`
      }
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

    // 自动存储获取到的股票数据到 Redis
    connectionStatus.value = `成功获取 ${selectedStock.value.name} 的股票数据，正在将数据存入 Redis...`

    try {
      // 调用存储接口
      const storeResponse = await axios.get(
        `/api/test/store-stock?code=${selectedStock.value.symbol}`
      )

      if (storeResponse.data.success) {
        connectionStatus.value = `成功获取 ${selectedStock.value.name} 的股票数据，并已存入 Redis!`
        redisResponse.value = storeResponse.data
      } else {
        connectionStatus.value = `成功获取 ${
          selectedStock.value.name
        } 的股票数据，但存储到 Redis 失败: ${storeResponse.data.error || '未知错误'}`
      }
    } catch (storeErr: any) {
      console.error('存储股票数据到 Redis 错误:', storeErr)
      connectionStatus.value = `成功获取 ${
        selectedStock.value.name
      } 的股票数据，但存储到 Redis 失败: ${storeErr.message || '未知错误'}`
    }
  } catch (err: any) {
    error.value = err.message || '获取股票数据失败'
    console.error('获取股票数据错误:', err)
  } finally {
    isLoading.value = false
  }
}

// 测试 Redis 连接
const testRedisConnection = async () => {
  isLoading.value = true
  error.value = ''
  redisResponse.value = null
  connectionStatus.value = '正在测试 Redis 连接...'

  try {
    const response = await axios.get('/api/test/redis')
    redisResponse.value = response.data

    if (response.data.success) {
      connectionStatus.value = 'Redis 连接测试成功!'
    } else {
      connectionStatus.value = 'Redis 连接测试失败!'
      error.value = response.data.error || '未知错误'
    }
  } catch (err: any) {
    connectionStatus.value = 'Redis 连接测试失败!'
    error.value = err.message || '未知错误'
    console.error('Redis 连接测试错误:', err)

    redisResponse.value = {
      success: false,
      error: err.message || '未知错误',
    }
  } finally {
    isLoading.value = false
  }
}

// 存储当前选中的股票数据到 Redis
const storeStockDataToRedis = async () => {
  if (!selectedStock.value) return

  isLoading.value = true
  error.value = ''
  redisResponse.value = null
  connectionStatus.value = `正在存储 ${selectedStock.value.name} 的数据到 Redis...`

  try {
    const response = await axios.get(`/api/test/store-stock?code=${selectedStock.value.symbol}`)
    redisResponse.value = response.data

    if (response.data.success) {
      connectionStatus.value = `成功将 ${selectedStock.value.name} 的数据存储到 Redis!`
    } else {
      connectionStatus.value = `存储 ${selectedStock.value.name} 的数据到 Redis 失败!`
      error.value = response.data.error || '未知错误'
    }
  } catch (err: any) {
    connectionStatus.value = `存储 ${selectedStock.value.name} 的数据到 Redis 失败!`
    error.value = err.message || '未知错误'
    console.error('存储股票数据到 Redis 错误:', err)

    redisResponse.value = {
      success: false,
      error: err.message || '未知错误',
    }
  } finally {
    isLoading.value = false
  }
}

// 存储自定义股票代码的数据到 Redis
const storeCustomStockToRedis = async () => {
  if (!customStockCode.value) return

  isLoading.value = true
  error.value = ''
  redisResponse.value = null
  connectionStatus.value = `正在存储 ${customStockCode.value} 的数据到 Redis...`

  try {
    const response = await axios.get(`/api/test/store-stock?code=${customStockCode.value}`)
    redisResponse.value = response.data

    if (response.data.success) {
      connectionStatus.value = `成功将 ${customStockCode.value} 的数据存储到 Redis!`
    } else {
      connectionStatus.value = `存储 ${customStockCode.value} 的数据到 Redis 失败!`
      error.value = response.data.error || '未知错误'
    }
  } catch (err: any) {
    connectionStatus.value = `存储 ${customStockCode.value} 的数据到 Redis 失败!`
    error.value = err.message || '未知错误'
    console.error('存储股票数据到 Redis 错误:', err)

    redisResponse.value = {
      success: false,
      error: err.message || '未知错误',
    }
  } finally {
    isLoading.value = false
  }
}

// 批量存储常用股票数据到 Redis
const storeAllStocksToRedis = async () => {
  isLoading.value = true
  error.value = ''
  redisResponse.value = null
  connectionStatus.value = '正在批量存储常用股票数据到 Redis...'

  try {
    const response = await axios.get('/api/test/store-all-stocks')
    redisResponse.value = response.data

    if (response.data.success) {
      connectionStatus.value = `成功将 ${response.data.successCount}/${
        response.data.totalStocks
      } 只股票数据存储到 Redis! 总耗时: ${response.data.totalTime.toFixed(2)}秒`
    } else {
      connectionStatus.value = '批量存储股票数据到 Redis 失败!'
      error.value = response.data.error || '未知错误'
    }
  } catch (err: any) {
    connectionStatus.value = '批量存储股票数据到 Redis 失败!'
    error.value = err.message || '未知错误'
    console.error('批量存储股票数据到 Redis 错误:', err)

    redisResponse.value = {
      success: false,
      error: err.message || '未知错误',
    }
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
  background-color: #4caf50;
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

.loading,
.error,
.status,
.stock-list,
.selected-stock,
.stock-data,
.raw-response,
.redis-response {
  margin-top: 20px;
  padding: 15px;
  border-radius: 4px;
}

.redis-controls {
  margin-top: 30px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #e3f2fd;
  border-radius: 4px;
}

.redis-controls input {
  padding: 10px;
  margin-right: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 250px;
}

.batch-controls {
  margin-top: 15px;
  padding: 10px;
  background-color: #fff8e1;
  border-radius: 4px;
  border-left: 4px solid #ffc107;
}

.store-all-button {
  background-color: #ff5722;
  font-weight: bold;
  margin-bottom: 5px;
}

.hint {
  font-size: 12px;
  color: #666;
  margin: 5px 0 0 0;
}

.redis-success {
  background-color: #e8f5e9;
  padding: 10px;
  border-radius: 4px;
}

.redis-error {
  background-color: #ffebee;
  color: #c62828;
  padding: 10px;
  border-radius: 4px;
}

.batch-results {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.batch-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  font-size: 14px;
}

.batch-table th {
  background-color: #e0e0e0;
  padding: 8px;
  text-align: left;
}

.batch-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #ddd;
}

.success-row {
  background-color: #e8f5e9;
}

.error-row {
  background-color: #ffebee;
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

th,
td {
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
