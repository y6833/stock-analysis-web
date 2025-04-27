<template>
  <div class="api-test">
    <h1>API 和 Redis 缓存测试</h1>
    <div class="nav-links">
      <router-link to="/tushare-test" class="nav-link">Tushare 数据库测试</router-link>
    </div>

    <div class="test-section">
      <h2>股票行情测试</h2>
      <div class="input-group">
        <input v-model="stockCode" placeholder="输入股票代码 (例如: 000001.SZ)" />
        <button @click="getStockQuote" :disabled="isLoading">获取股票行情</button>
      </div>

      <div v-if="isLoading" class="loading">
        <p>正在加载数据，请稍候...</p>
      </div>

      <div v-if="error" class="error">
        <p>{{ error }}</p>
      </div>

      <div v-if="quoteData" class="data-display">
        <h3>股票行情数据</h3>
        <p><strong>数据来源:</strong> {{ quoteData.fromCache ? '缓存' : 'API' }}</p>
        <p v-if="quoteData.fromCache">
          <strong>缓存时间:</strong> {{ formatDate(quoteData.cacheTime) }}
        </p>
        <table>
          <tr>
            <th>股票代码</th>
            <td>{{ quoteData.symbol }}</td>
          </tr>
          <tr>
            <th>股票名称</th>
            <td>{{ quoteData.name }}</td>
          </tr>
          <tr>
            <th>最新价格</th>
            <td>{{ quoteData.price }}</td>
          </tr>
          <tr>
            <th>涨跌幅</th>
            <td :class="quoteData.pct_chg >= 0 ? 'up' : 'down'">
              {{ quoteData.pct_chg.toFixed(2) }}%
            </td>
          </tr>
          <tr>
            <th>开盘价</th>
            <td>{{ quoteData.open }}</td>
          </tr>
          <tr>
            <th>最高价</th>
            <td>{{ quoteData.high }}</td>
          </tr>
          <tr>
            <th>最低价</th>
            <td>{{ quoteData.low }}</td>
          </tr>
          <tr>
            <th>成交量</th>
            <td>{{ formatNumber(quoteData.vol) }}</td>
          </tr>
          <tr>
            <th>成交额</th>
            <td>{{ formatNumber(quoteData.amount) }}</td>
          </tr>
        </table>
      </div>
    </div>

    <div class="test-section">
      <h2>股票列表测试</h2>
      <button @click="getStockList" :disabled="isLoadingList">获取股票列表</button>

      <div v-if="isLoadingList" class="loading">
        <p>正在加载股票列表，请稍候...</p>
      </div>

      <div v-if="listError" class="error">
        <p>{{ listError }}</p>
      </div>

      <div v-if="stockList && stockList.length > 0" class="data-display">
        <h3>股票列表 (显示前 20 条)</h3>
        <table>
          <thead>
            <tr>
              <th>股票代码</th>
              <th>股票名称</th>
              <th>行业</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stock in stockList.slice(0, 20)" :key="stock.symbol">
              <td>{{ stock.symbol }}</td>
              <td>{{ stock.name }}</td>
              <td>{{ stock.industry }}</td>
              <td>
                <button @click="selectStock(stock.symbol)" class="small-button">查看行情</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="list-info">共加载 {{ stockList.length }} 只股票</p>
      </div>
    </div>

    <div class="test-section">
      <h2>Redis 缓存测试</h2>
      <button @click="testRedisConnection" :disabled="isLoadingRedis">测试 Redis 连接</button>

      <div v-if="isLoadingRedis" class="loading">
        <p>正在测试 Redis 连接，请稍候...</p>
      </div>

      <div v-if="redisError" class="error">
        <p>{{ redisError }}</p>
      </div>

      <div v-if="redisData" class="data-display">
        <h3>Redis 测试结果</h3>
        <div v-if="redisData.success" class="redis-success">
          <p><strong>状态:</strong> 成功</p>
          <p v-if="redisData.redisAvailable"><strong>Redis 可用:</strong> 是</p>

          <div v-if="redisData.testData">
            <h4>测试数据:</h4>
            <pre>{{ JSON.stringify(redisData.testData, null, 2) }}</pre>
          </div>

          <div v-if="redisData.existingKeys && redisData.existingKeys.length > 0">
            <h4>Redis 键:</h4>
            <ul>
              <li v-for="(key, index) in redisData.existingKeys" :key="index">{{ key }}</li>
            </ul>
          </div>
        </div>

        <div v-else class="redis-error">
          <p><strong>状态:</strong> 失败</p>
          <p><strong>错误信息:</strong> {{ redisData.error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

// 状态
const stockCode = ref('000001.SZ')
const quoteData = ref(null)
const isLoading = ref(false)
const error = ref('')

const stockList = ref([])
const isLoadingList = ref(false)
const listError = ref('')

const redisData = ref(null)
const isLoadingRedis = ref(false)
const redisError = ref('')

// 获取股票行情
const getStockQuote = async () => {
  if (!stockCode.value) return

  isLoading.value = true
  error.value = ''
  quoteData.value = null

  try {
    const response = await axios.get(`/api/stocks/${stockCode.value}/quote`)
    quoteData.value = response.data
    console.log('股票行情数据:', response.data)
  } catch (err) {
    console.error('获取股票行情失败:', err)
    error.value = err.response?.data?.message || err.message || '获取股票行情失败'
  } finally {
    isLoading.value = false
  }
}

// 获取股票列表
const getStockList = async () => {
  isLoadingList.value = true
  listError.value = ''

  try {
    const response = await axios.get('/api/stocks')
    stockList.value = response.data
    console.log('股票列表数据:', response.data)
  } catch (err) {
    console.error('获取股票列表失败:', err)
    listError.value = err.response?.data?.message || err.message || '获取股票列表失败'
  } finally {
    isLoadingList.value = false
  }
}

// 选择股票
const selectStock = (code) => {
  stockCode.value = code
  getStockQuote()
}

// 测试 Redis 连接
const testRedisConnection = async () => {
  isLoadingRedis.value = true
  redisError.value = ''
  redisData.value = null

  try {
    const response = await axios.get('/api/test/redis')
    redisData.value = response.data
    console.log('Redis 测试结果:', response.data)
  } catch (err) {
    console.error('测试 Redis 连接失败:', err)
    redisError.value = err.response?.data?.message || err.message || '测试 Redis 连接失败'
  } finally {
    isLoadingRedis.value = false
  }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString()
}

// 格式化数字
const formatNumber = (num) => {
  if (num === undefined || num === null) return ''
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
</script>

<style scoped>
.api-test {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.nav-links {
  margin-bottom: 20px;
}

.nav-link {
  display: inline-block;
  background-color: #1976d2;
  color: white;
  padding: 8px 15px;
  text-decoration: none;
  border-radius: 4px;
  margin-right: 10px;
  transition: background-color 0.3s;
}

.nav-link:hover {
  background-color: #1565c0;
}

h1 {
  color: #333;
  margin-bottom: 30px;
}

.test-section {
  margin-bottom: 40px;
  padding: 20px;
  border-radius: 8px;
  background-color: #f9f9f9;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

h2 {
  color: #2c3e50;
  margin-top: 0;
  margin-bottom: 20px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 10px;
}

.input-group {
  display: flex;
  margin-bottom: 20px;
}

input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 10px;
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

.small-button {
  padding: 5px 10px;
  font-size: 14px;
}

.loading,
.error,
.data-display {
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

.data-display {
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

.up {
  color: #4caf50;
}

.down {
  color: #f44336;
}

.list-info {
  margin-top: 10px;
  font-style: italic;
  color: #666;
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

pre {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 300px;
}
</style>
