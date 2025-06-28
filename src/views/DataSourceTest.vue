<template>
  <div class="data-source-test">
    <div class="header">
      <h1>新数据源测试页面</h1>
      <p>测试 Alpha Vantage 和 AllTick 数据源的功能</p>
    </div>

    <div class="test-controls">
      <div class="control-group">
        <h3>基础测试</h3>
        <div class="button-row">
          <button @click="testAlphaVantage" :disabled="testing" class="test-btn alpha-btn">
            {{ testing === 'alpha' ? '测试中...' : '测试 Alpha Vantage' }}
          </button>
          <button @click="testAllTick" :disabled="testing" class="test-btn alltick-btn">
            {{ testing === 'alltick' ? '测试中...' : '测试 AllTick' }}
          </button>
          <button @click="testBoth" :disabled="testing" class="test-btn both-btn">
            {{ testing === 'both' ? '测试中...' : '测试所有数据源' }}
          </button>
        </div>
      </div>

      <div class="control-group">
        <h3>详细测试</h3>
        <div class="button-row">
          <button @click="testConnection" :disabled="testing" class="test-btn connection-btn">
            {{ testing === 'connection' ? '测试中...' : '连接测试' }}
          </button>
          <button @click="testDataFetch" :disabled="testing" class="test-btn data-btn">
            {{ testing === 'data' ? '测试中...' : '数据获取测试' }}
          </button>
          <button @click="testPerformance" :disabled="testing" class="test-btn performance-btn">
            {{ testing === 'performance' ? '测试中...' : '性能测试' }}
          </button>
          <button @click="testIntegrity" :disabled="testing" class="test-btn integrity-btn">
            {{ testing === 'integrity' ? '测试中...' : '数据完整性测试' }}
          </button>
        </div>
      </div>

      <div class="control-group">
        <h3>工具</h3>
        <div class="button-row">
          <button @click="clearResults" :disabled="testing" class="test-btn clear-btn">
            清除结果
          </button>
          <button @click="exportResults" :disabled="testing || results.length === 0" class="test-btn export-btn">
            导出结果
          </button>
          <button @click="toggleNetworkMonitor" class="test-btn monitor-btn">
            {{ networkMonitoring ? '停止网络监控' : '开始网络监控' }}
          </button>
        </div>
      </div>
    </div>

    <div class="test-results">
      <div v-if="results.length === 0" class="no-results">
        点击上方按钮开始测试数据源
      </div>

      <div v-for="(result, index) in results" :key="index" class="result-item">
        <div class="result-header">
          <span class="timestamp">{{ result.timestamp }}</span>
          <span class="data-source">{{ result.dataSource }}</span>
          <span class="status" :class="result.success ? 'success' : 'error'">
            {{ result.success ? '✅ 成功' : '❌ 失败' }}
          </span>
        </div>

        <div class="result-content">
          <div v-if="result.success" class="success-content">
            <h4>测试结果:</h4>
            <div class="data-grid">
              <div v-if="result.data.quote" class="data-section">
                <h5>实时行情:</h5>
                <pre>{{ JSON.stringify(result.data.quote, null, 2) }}</pre>
              </div>

              <div v-if="result.data.stocks" class="data-section">
                <h5>股票列表 (前5个):</h5>
                <pre>{{ JSON.stringify(result.data.stocks.slice(0, 5), null, 2) }}</pre>
              </div>

              <div v-if="result.data.history" class="data-section">
                <h5>历史数据 (最新3条):</h5>
                <pre>{{ JSON.stringify(result.data.history.slice(-3), null, 2) }}</pre>
              </div>
            </div>
          </div>

          <div v-else class="error-content">
            <h4>错误信息:</h4>
            <pre class="error-message">{{ result.error }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AlphaVantageDataSource from '@/services/dataSource/AlphaVantageDataSource'
import AlltickDataSource from '@/services/dataSource/AlltickDataSource'
import { ComprehensiveTestRunner, ConnectionTester, DataFetchTester } from '@/tests/dataSource/detailedConnectionTest'
import BrowserTestUtils from '@/tests/dataSource/browserConsoleTest'

interface TestResult {
  timestamp: string
  dataSource: string
  testType?: string
  success: boolean
  data?: any
  error?: string
  duration?: number
}

const testing = ref<string | null>(null)
const results = ref<TestResult[]>([])
const networkMonitoring = ref(false)
let networkMonitorRestore: (() => void) | null = null

const addResult = (result: TestResult) => {
  results.value.unshift(result) // 新结果添加到顶部
}

const testAlphaVantage = async () => {
  testing.value = 'alpha'

  try {
    const dataSource = new AlphaVantageDataSource()

    // 测试连接
    const connectionTest = await dataSource.testConnection()
    if (!connectionTest) {
      throw new Error('连接测试失败')
    }

    // 获取测试数据
    const [quote, stocks, history] = await Promise.all([
      dataSource.getStockQuote('AAPL').catch(e => null),
      dataSource.getStocks().catch(e => []),
      dataSource.getStockHistory('AAPL', 'day').catch(e => [])
    ])

    addResult({
      timestamp: new Date().toLocaleString(),
      dataSource: 'Alpha Vantage',
      success: true,
      data: { quote, stocks, history }
    })

  } catch (error) {
    addResult({
      timestamp: new Date().toLocaleString(),
      dataSource: 'Alpha Vantage',
      success: false,
      error: error.message
    })
  } finally {
    testing.value = null
  }
}

const testAllTick = async () => {
  testing.value = 'alltick'

  try {
    const dataSource = new AlltickDataSource()

    // 测试连接
    const connectionTest = await dataSource.testConnection()
    if (!connectionTest) {
      throw new Error('连接测试失败')
    }

    // 获取测试数据
    const [quote, stocks, history] = await Promise.all([
      dataSource.getStockQuote('AAPL').catch(e => null),
      dataSource.getStocks().catch(e => []),
      dataSource.getStockHistory('AAPL', 'day').catch(e => [])
    ])

    addResult({
      timestamp: new Date().toLocaleString(),
      dataSource: 'AllTick',
      success: true,
      data: { quote, stocks, history }
    })

  } catch (error) {
    addResult({
      timestamp: new Date().toLocaleString(),
      dataSource: 'AllTick',
      success: false,
      error: error.message
    })
  } finally {
    testing.value = null
  }
}

const testBoth = async () => {
  testing.value = 'both'

  try {
    await testAlphaVantage()
    await new Promise(resolve => setTimeout(resolve, 2000)) // 等待2秒避免频率限制
    await testAllTick()
  } finally {
    testing.value = null
  }
}

const clearResults = () => {
  results.value = []
}

// 新增的详细测试方法
const testConnection = async () => {
  testing.value = 'connection'

  try {
    // 测试 Alpha Vantage 连接
    const alphaResults = await ConnectionTester.testAlphaVantageConnection()
    for (const result of alphaResults) {
      addResult({
        timestamp: new Date().toLocaleString(),
        dataSource: 'Alpha Vantage',
        testType: result.testName,
        success: result.success,
        data: result.data,
        error: result.error,
        duration: result.duration
      })
    }

    // 等待避免频率限制
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 测试 AllTick 连接
    const allTickResults = await ConnectionTester.testAlltickConnection()
    for (const result of allTickResults) {
      addResult({
        timestamp: new Date().toLocaleString(),
        dataSource: 'AllTick',
        testType: result.testName,
        success: result.success,
        data: result.data,
        error: result.error,
        duration: result.duration
      })
    }

  } catch (error) {
    addResult({
      timestamp: new Date().toLocaleString(),
      dataSource: '连接测试',
      success: false,
      error: error.message
    })
  } finally {
    testing.value = null
  }
}

const testDataFetch = async () => {
  testing.value = 'data'

  try {
    // 测试 Alpha Vantage 数据获取
    const alphaResults = await DataFetchTester.testAlphaVantageDataFetch()
    for (const result of alphaResults) {
      addResult({
        timestamp: new Date().toLocaleString(),
        dataSource: 'Alpha Vantage',
        testType: result.testName,
        success: result.success,
        data: result.data,
        error: result.error,
        duration: result.duration
      })
    }

    // 等待避免频率限制
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 测试 AllTick 数据获取
    const allTickResults = await DataFetchTester.testAlltickDataFetch()
    for (const result of allTickResults) {
      addResult({
        timestamp: new Date().toLocaleString(),
        dataSource: 'AllTick',
        testType: result.testName,
        success: result.success,
        data: result.data,
        error: result.error,
        duration: result.duration
      })
    }

  } catch (error) {
    addResult({
      timestamp: new Date().toLocaleString(),
      dataSource: '数据获取测试',
      success: false,
      error: error.message
    })
  } finally {
    testing.value = null
  }
}

const testPerformance = async () => {
  testing.value = 'performance'

  try {
    const performanceResults = await BrowserTestUtils.performanceTest()

    addResult({
      timestamp: new Date().toLocaleString(),
      dataSource: '性能测试',
      testType: '综合性能测试',
      success: true,
      data: performanceResults
    })

  } catch (error) {
    addResult({
      timestamp: new Date().toLocaleString(),
      dataSource: '性能测试',
      success: false,
      error: error.message
    })
  } finally {
    testing.value = null
  }
}

const testIntegrity = async () => {
  testing.value = 'integrity'

  try {
    const integrityResults = await BrowserTestUtils.dataIntegrityCheck()

    addResult({
      timestamp: new Date().toLocaleString(),
      dataSource: '数据完整性测试',
      testType: '数据验证',
      success: integrityResults.every(r => r.valid),
      data: integrityResults
    })

  } catch (error) {
    addResult({
      timestamp: new Date().toLocaleString(),
      dataSource: '数据完整性测试',
      success: false,
      error: error.message
    })
  } finally {
    testing.value = null
  }
}

const toggleNetworkMonitor = () => {
  if (networkMonitoring.value) {
    if (networkMonitorRestore) {
      networkMonitorRestore()
      networkMonitorRestore = null
    }
    networkMonitoring.value = false
  } else {
    networkMonitorRestore = BrowserTestUtils.monitorNetworkRequests()
    networkMonitoring.value = true
  }
}

const exportResults = () => {
  const dataStr = JSON.stringify(results.value, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `data-source-test-results-${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.data-source-test {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.header p {
  color: #7f8c8d;
  font-size: 16px;
}

.test-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 30px;
}

.control-group {
  text-align: center;
}

.control-group h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
}

.button-row {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.test-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.test-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alpha-btn {
  background: #3498db;
  color: white;
}

.alpha-btn:hover:not(:disabled) {
  background: #2980b9;
}

.alltick-btn {
  background: #e74c3c;
  color: white;
}

.alltick-btn:hover:not(:disabled) {
  background: #c0392b;
}

.both-btn {
  background: #9b59b6;
  color: white;
}

.both-btn:hover:not(:disabled) {
  background: #8e44ad;
}

.clear-btn {
  background: #95a5a6;
  color: white;
}

.clear-btn:hover:not(:disabled) {
  background: #7f8c8d;
}

.connection-btn {
  background: #16a085;
  color: white;
}

.connection-btn:hover:not(:disabled) {
  background: #138d75;
}

.data-btn {
  background: #2980b9;
  color: white;
}

.data-btn:hover:not(:disabled) {
  background: #2471a3;
}

.performance-btn {
  background: #f39c12;
  color: white;
}

.performance-btn:hover:not(:disabled) {
  background: #e67e22;
}

.integrity-btn {
  background: #8e44ad;
  color: white;
}

.integrity-btn:hover:not(:disabled) {
  background: #7d3c98;
}

.export-btn {
  background: #27ae60;
  color: white;
}

.export-btn:hover:not(:disabled) {
  background: #229954;
}

.monitor-btn {
  background: #e74c3c;
  color: white;
}

.monitor-btn:hover:not(:disabled) {
  background: #c0392b;
}

.test-results {
  margin-top: 30px;
}

.no-results {
  text-align: center;
  color: #7f8c8d;
  font-style: italic;
  padding: 40px;
  background: #f8f9fa;
  border-radius: 8px;
}

.result-item {
  background: white;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  margin-bottom: 20px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.result-header {
  background: #f8f9fa;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e1e8ed;
}

.timestamp {
  color: #7f8c8d;
  font-size: 14px;
}

.data-source {
  font-weight: 600;
  color: #2c3e50;
}

.status.success {
  color: #27ae60;
}

.status.error {
  color: #e74c3c;
}

.result-content {
  padding: 20px;
}

.data-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.data-section h5 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 14px;
  font-weight: 600;
}

.data-section pre {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
  overflow-x: auto;
  margin: 0;
  border: 1px solid #e1e8ed;
}

.error-message {
  background: #fdf2f2;
  color: #e74c3c;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #fecaca;
  margin: 0;
  font-size: 14px;
}

@media (max-width: 768px) {
  .test-controls {
    flex-direction: column;
    align-items: center;
  }

  .test-btn {
    width: 200px;
  }

  .data-grid {
    grid-template-columns: 1fr;
  }
}
</style>
