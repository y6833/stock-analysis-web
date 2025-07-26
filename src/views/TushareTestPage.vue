<template>
  <div class="tushare-test-page">
    <div class="header">
      <h1>Tushare API 集成测试</h1>
      <p>验证 Tushare API 集成的正确性和数据流</p>
    </div>

    <div class="test-controls">
      <button 
        @click="runQuickTest" 
        :disabled="isRunning"
        class="btn btn-primary"
      >
        {{ isRunning ? '测试中...' : '快速测试' }}
      </button>
      
      <button 
        @click="runFullTest" 
        :disabled="isRunning"
        class="btn btn-secondary"
      >
        {{ isRunning ? '测试中...' : '完整测试' }}
      </button>
      
      <button 
        @click="clearResults"
        :disabled="isRunning"
        class="btn btn-outline"
      >
        清除结果
      </button>
    </div>

    <!-- 配置信息 -->
    <div class="config-section">
      <h2>配置信息</h2>
      <div class="config-grid">
        <div class="config-item">
          <label>Token 状态:</label>
          <span :class="configInfo.hasToken ? 'status-success' : 'status-error'">
            {{ configInfo.hasToken ? '已配置' : '未配置' }}
          </span>
        </div>
        <div class="config-item">
          <label>Token 预览:</label>
          <span>{{ configInfo.tokenPreview }}</span>
        </div>
        <div class="config-item">
          <label>速率限制:</label>
          <span>{{ configInfo.rateLimit }} 请求/分钟</span>
        </div>
        <div class="config-item">
          <label>调试模式:</label>
          <span :class="configInfo.debugEnabled ? 'status-warning' : 'status-info'">
            {{ configInfo.debugEnabled ? '开启' : '关闭' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 速率限制状态 -->
    <div class="rate-limit-section">
      <h2>速率限制状态</h2>
      <div class="rate-limit-grid">
        <div class="rate-limit-item">
          <label>每日剩余:</label>
          <span class="rate-limit-value">{{ rateLimitInfo.dailyRemaining }}</span>
        </div>
        <div class="rate-limit-item">
          <label>每分钟剩余:</label>
          <div class="minute-remaining">
            <div v-for="(count, api) in rateLimitInfo.minuteRemaining" :key="api">
              {{ api }}: {{ count }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 测试结果 -->
    <div class="results-section" v-if="testResults.length > 0">
      <h2>测试结果</h2>
      <div class="results-summary">
        <div class="summary-item">
          <label>总测试数:</label>
          <span>{{ testSummary.totalTests }}</span>
        </div>
        <div class="summary-item">
          <label>通过:</label>
          <span class="status-success">{{ testSummary.passedTests }}</span>
        </div>
        <div class="summary-item">
          <label>失败:</label>
          <span class="status-error">{{ testSummary.failedTests }}</span>
        </div>
        <div class="summary-item">
          <label>成功率:</label>
          <span>{{ testSummary.successRate }}%</span>
        </div>
        <div class="summary-item">
          <label>总耗时:</label>
          <span>{{ testSummary.duration }}ms</span>
        </div>
      </div>

      <div class="test-results">
        <div 
          v-for="result in testResults" 
          :key="result.name"
          :class="['test-result', result.passed ? 'test-passed' : 'test-failed']"
        >
          <div class="test-header">
            <span class="test-icon">{{ result.passed ? '✅' : '❌' }}</span>
            <span class="test-name">{{ result.name }}</span>
            <span class="test-duration">{{ result.duration }}ms</span>
          </div>
          <div class="test-message">{{ result.message }}</div>
          <div v-if="result.data" class="test-data">
            <pre>{{ JSON.stringify(result.data, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- 日志输出 -->
    <div class="logs-section" v-if="logs.length > 0">
      <h2>测试日志</h2>
      <div class="logs-container">
        <div v-for="(log, index) in logs" :key="index" class="log-entry">
          <span class="log-time">{{ log.time }}</span>
          <span :class="['log-level', `log-${log.level}`]">{{ log.level.toUpperCase() }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { 
  getTushareConfigInfo,
  getRemainingRequests,
  type TestResult,
  type TestSuiteResult,
  tushareTestSuite,
  quickTest
} from '@/utils/tushareTestSuite'

// 响应式数据
const isRunning = ref(false)
const configInfo = ref({
  hasToken: false,
  tokenPreview: '未配置',
  rateLimit: 0,
  dailyLimit: 0,
  retryCount: 0,
  timeout: 0,
  debugEnabled: false
})

const rateLimitInfo = ref({
  dailyRemaining: 0,
  minuteRemaining: {} as Record<string, number>
})

const testResults = ref<TestResult[]>([])
const logs = ref<Array<{ time: string; level: string; message: string }>>([])

// 计算属性
const testSummary = computed(() => {
  const totalTests = testResults.value.length
  const passedTests = testResults.value.filter(r => r.passed).length
  const failedTests = totalTests - passedTests
  const duration = testResults.value.reduce((sum, r) => sum + r.duration, 0)
  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0'

  return {
    totalTests,
    passedTests,
    failedTests,
    duration,
    successRate
  }
})

// 方法
const loadConfigInfo = async () => {
  try {
    configInfo.value = getTushareConfigInfo()
    rateLimitInfo.value = getRemainingRequests()
  } catch (error) {
    addLog('error', `加载配置信息失败: ${error}`)
  }
}

const runQuickTest = async () => {
  if (isRunning.value) return
  
  isRunning.value = true
  clearResults()
  addLog('info', '开始快速测试...')
  
  try {
    const success = await quickTest()
    addLog(success ? 'success' : 'error', `快速测试${success ? '通过' : '失败'}`)
  } catch (error) {
    addLog('error', `快速测试异常: ${error}`)
  } finally {
    isRunning.value = false
    await loadConfigInfo()
  }
}

const runFullTest = async () => {
  if (isRunning.value) return
  
  isRunning.value = true
  clearResults()
  addLog('info', '开始完整测试套件...')
  
  try {
    const result: TestSuiteResult = await tushareTestSuite.runAllTests()
    testResults.value = result.results
    addLog('info', `完整测试完成: ${result.passedTests}/${result.totalTests} 通过`)
  } catch (error) {
    addLog('error', `完整测试异常: ${error}`)
  } finally {
    isRunning.value = false
    await loadConfigInfo()
  }
}

const clearResults = () => {
  testResults.value = []
  logs.value = []
}

const addLog = (level: string, message: string) => {
  logs.value.push({
    time: new Date().toLocaleTimeString(),
    level,
    message
  })
}

// 生命周期
onMounted(async () => {
  await loadConfigInfo()
})
</script>

<style scoped>
.tushare-test-page {
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
}

.test-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 30px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-secondary {
  background-color: #95a5a6;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #7f8c8d;
}

.btn-outline {
  background-color: transparent;
  color: #3498db;
  border: 1px solid #3498db;
}

.btn-outline:hover:not(:disabled) {
  background-color: #3498db;
  color: white;
}

.config-section, .rate-limit-section, .results-section, .logs-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.config-section h2, .rate-limit-section h2, .results-section h2, .logs-section h2 {
  margin-bottom: 15px;
  color: #2c3e50;
}

.config-grid, .rate-limit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.config-item, .rate-limit-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 5px;
}

.config-item label, .rate-limit-item label {
  font-weight: bold;
  color: #495057;
}

.status-success { color: #27ae60; }
.status-error { color: #e74c3c; }
.status-warning { color: #f39c12; }
.status-info { color: #3498db; }

.results-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 5px;
  min-width: 100px;
}

.summary-item label {
  font-size: 12px;
  color: #6c757d;
  margin-bottom: 5px;
}

.test-results {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.test-result {
  border: 1px solid #dee2e6;
  border-radius: 5px;
  padding: 15px;
}

.test-passed {
  border-left: 4px solid #27ae60;
  background: #f8fff8;
}

.test-failed {
  border-left: 4px solid #e74c3c;
  background: #fff8f8;
}

.test-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.test-name {
  font-weight: bold;
  flex: 1;
}

.test-duration {
  font-size: 12px;
  color: #6c757d;
}

.test-message {
  color: #495057;
  margin-bottom: 10px;
}

.test-data {
  background: #f8f9fa;
  border-radius: 3px;
  padding: 10px;
  overflow-x: auto;
}

.test-data pre {
  margin: 0;
  font-size: 12px;
  color: #495057;
}

.logs-container {
  max-height: 300px;
  overflow-y: auto;
  background: #f8f9fa;
  border-radius: 5px;
  padding: 10px;
}

.log-entry {
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
  font-family: monospace;
  font-size: 12px;
}

.log-time {
  color: #6c757d;
  min-width: 80px;
}

.log-level {
  min-width: 60px;
  font-weight: bold;
}

.log-info { color: #3498db; }
.log-success { color: #27ae60; }
.log-error { color: #e74c3c; }
.log-warning { color: #f39c12; }

.log-message {
  flex: 1;
  color: #495057;
}

.minute-remaining {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}

.rate-limit-value {
  font-weight: bold;
  font-size: 18px;
}
</style>
