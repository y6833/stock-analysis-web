<template>
  <div class="professional-backtest-view">
    <div class="page-header">
      <h1>专业回测系统</h1>
      <p class="subtitle">基于事件驱动引擎的专业级策略回测平台</p>
    </div>

    <div class="backtest-container">
      <!-- 参数配置面板 -->
      <div class="config-panel">
        <div class="panel-section">
          <h3>基础配置</h3>
          
          <div class="form-group">
            <label>股票代码</label>
            <StockSearch @select="selectStock" />
            <div v-if="params.symbol" class="selected-stock">
              已选择: {{ params.symbol }}
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>开始日期</label>
              <input 
                type="date" 
                v-model="params.customStartDate" 
                class="form-control"
              />
            </div>
            <div class="form-group">
              <label>结束日期</label>
              <input 
                type="date" 
                v-model="params.customEndDate" 
                class="form-control"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>初始资金</label>
              <input 
                type="number" 
                v-model="params.initialCapital" 
                class="form-control"
                min="10000"
                step="10000"
              />
            </div>
            <div class="form-group">
              <label>回测频率</label>
              <select v-model="params.frequency" class="form-control">
                <option value="1d">日线</option>
                <option value="1w">周线</option>
                <option value="1h">小时线</option>
                <option value="30m">30分钟</option>
              </select>
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h3>策略配置</h3>
          
          <div class="form-group">
            <label>策略类型</label>
            <select v-model="params.strategyType" class="form-control" @change="onStrategyTypeChange">
              <option value="technical">技术分析策略</option>
              <option value="factor">因子策略</option>
              <option value="ml">机器学习策略</option>
              <option value="timing">择时策略</option>
            </select>
          </div>

          <div class="form-group">
            <label>策略模板</label>
            <select v-model="selectedTemplate" class="form-control" @change="loadTemplate">
              <option value="">选择策略模板</option>
              <option 
                v-for="template in strategyTemplates" 
                :key="template.id" 
                :value="template.id"
              >
                {{ template.name }}
              </option>
            </select>
          </div>

          <!-- 动态策略参数 -->
          <div v-if="strategyParams" class="strategy-params">
            <h4>策略参数</h4>
            <div v-for="(value, key) in strategyParams" :key="key" class="form-group">
              <label>{{ getParamLabel(key) }}</label>
              <input 
                v-if="typeof value === 'number'"
                type="number" 
                v-model.number="strategyParams[key]" 
                class="form-control"
                :step="getParamStep(key)"
              />
              <input 
                v-else-if="typeof value === 'boolean'"
                type="checkbox" 
                v-model="strategyParams[key]" 
                class="form-checkbox"
              />
              <input 
                v-else
                type="text" 
                v-model="strategyParams[key]" 
                class="form-control"
              />
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h3>交易成本</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label>佣金率 (%)</label>
              <input 
                type="number" 
                v-model="params.commissionRate" 
                class="form-control"
                step="0.001"
                min="0"
              />
            </div>
            <div class="form-group">
              <label>滑点率 (%)</label>
              <input 
                type="number" 
                v-model="params.slippageRate" 
                class="form-control"
                step="0.001"
                min="0"
              />
            </div>
          </div>
        </div>

        <div class="panel-actions">
          <button 
            class="btn btn-primary" 
            @click="runBacktest" 
            :disabled="isRunning || !canRunBacktest"
          >
            <span v-if="isRunning" class="loading-spinner"></span>
            {{ isRunning ? '回测中...' : '开始回测' }}
          </button>
          
          <button 
            class="btn btn-secondary" 
            @click="runBatchBacktest" 
            :disabled="isRunning"
          >
            参数优化
          </button>
          
          <button 
            class="btn btn-outline" 
            @click="resetBacktest"
            :disabled="isRunning"
          >
            重置
          </button>
        </div>
      </div>

      <!-- 结果展示区域 -->
      <div class="results-panel">
        <div v-if="isRunning" class="loading-state">
          <div class="loading-spinner large"></div>
          <h3>正在运行专业回测...</h3>
          <p>{{ loadingMessage }}</p>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
        </div>

        <div v-else-if="error" class="error-state">
          <div class="error-icon">❌</div>
          <h3>回测失败</h3>
          <p>{{ error }}</p>
          <button class="btn btn-primary" @click="resetBacktest">重新开始</button>
        </div>

        <div v-else-if="!backtestResult" class="empty-state">
          <div class="empty-icon">📊</div>
          <h3>专业回测系统</h3>
          <p>配置回测参数，开始您的专业策略回测</p>
          <div class="features-list">
            <div class="feature-item">
              <span class="feature-icon">⚡</span>
              <span>事件驱动回测引擎</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">💰</span>
              <span>精确交易成本建模</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📈</span>
              <span>专业绩效分析</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🎯</span>
              <span>多策略支持</span>
            </div>
          </div>
        </div>

        <div v-else class="results-content">
          <BacktestResultVisualization :result="backtestResult" />
        </div>
      </div>
    </div>

    <!-- 批量回测结果对比 -->
    <div v-if="batchResults.length > 0" class="batch-results">
      <h3>参数优化结果</h3>
      <div class="batch-results-table">
        <table>
          <thead>
            <tr>
              <th>参数组合</th>
              <th>总收益率</th>
              <th>年化收益率</th>
              <th>最大回撤</th>
              <th>夏普比率</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(result, index) in batchResults" :key="result.id">
              <td>{{ formatParams(result.params.strategyParams) }}</td>
              <td :class="getReturnClass(result.performance.totalReturn)">
                {{ formatPercent(result.performance.totalReturn) }}
              </td>
              <td :class="getReturnClass(result.performance.annualizedReturn)">
                {{ formatPercent(result.performance.annualizedReturn) }}
              </td>
              <td class="negative">{{ formatPercent(result.performance.maxDrawdown) }}</td>
              <td>{{ result.performance.sharpeRatio.toFixed(2) }}</td>
              <td>
                <button class="btn btn-small" @click="viewResult(result)">查看详情</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import StockSearch from '@/components/StockSearch.vue'
import BacktestResultVisualization from '@/components/backtest/BacktestResultVisualization.vue'
import { backtestService } from '@/services/backtest/BacktestService'
import { useToast } from '@/composables/useToast'
import type { BacktestParams, BacktestResult, StrategyTemplate } from '@/types/backtest'

const { showToast } = useToast()

// 回测参数
const params = reactive<BacktestParams>({
  symbol: '',
  strategyType: 'technical',
  timeRange: 'custom',
  frequency: '1d',
  initialCapital: 100000,
  commissionRate: 0.0003,
  slippageRate: 0.001,
  customStartDate: '',
  customEndDate: '',
  strategyParams: {}
})

// 状态管理
const isRunning = ref(false)
const error = ref('')
const loadingMessage = ref('')
const progress = ref(0)
const backtestResult = ref<BacktestResult | null>(null)
const batchResults = ref<BacktestResult[]>([])

// 策略相关
const selectedTemplate = ref('')
const strategyTemplates = ref<StrategyTemplate[]>([])
const strategyParams = ref<any>(null)

// 计算属性
const canRunBacktest = computed(() => {
  return params.symbol && params.customStartDate && params.customEndDate && params.initialCapital > 0
})

// 初始化
onMounted(async () => {
  // 设置默认日期
  const today = new Date()
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(today.getFullYear() - 1)
  
  params.customEndDate = today.toISOString().split('T')[0]
  params.customStartDate = oneYearAgo.toISOString().split('T')[0]
  
  // 加载策略模板
  strategyTemplates.value = backtestService.getStrategyTemplates()
})

// 选择股票
const selectStock = (stock: any) => {
  params.symbol = stock.symbol
}

// 策略类型变化
const onStrategyTypeChange = () => {
  selectedTemplate.value = ''
  strategyParams.value = null
}

// 加载策略模板
const loadTemplate = () => {
  const template = strategyTemplates.value.find(t => t.id === selectedTemplate.value)
  if (template) {
    strategyParams.value = { ...template.defaultParams }
    params.strategyParams = strategyParams.value
  }
}

// 运行回测
const runBacktest = async () => {
  if (!canRunBacktest.value) {
    showToast('请完善回测参数')
    return
  }

  isRunning.value = true
  error.value = ''
  progress.value = 0
  loadingMessage.value = '准备回测数据...'

  try {
    // 模拟进度更新
    const progressInterval = setInterval(() => {
      if (progress.value < 90) {
        progress.value += Math.random() * 10
        if (progress.value < 30) {
          loadingMessage.value = '获取历史数据...'
        } else if (progress.value < 60) {
          loadingMessage.value = '执行策略回测...'
        } else {
          loadingMessage.value = '计算绩效指标...'
        }
      }
    }, 500)

    const result = await backtestService.runBacktest(params)
    
    clearInterval(progressInterval)
    progress.value = 100
    loadingMessage.value = '回测完成!'
    
    setTimeout(() => {
      backtestResult.value = result
      showToast('回测完成!')
    }, 500)

  } catch (err: any) {
    error.value = err.message
    showToast('回测失败: ' + err.message)
  } finally {
    isRunning.value = false
  }
}

// 批量回测（参数优化）
const runBatchBacktest = async () => {
  if (!canRunBacktest.value) {
    showToast('请完善回测参数')
    return
  }

  // 定义参数网格
  const parameterGrid = {
    shortPeriod: [5, 10, 15, 20],
    longPeriod: [20, 30, 40, 50],
    stopLoss: [0.03, 0.05, 0.08],
    takeProfit: [0.10, 0.15, 0.20]
  }

  isRunning.value = true
  error.value = ''
  loadingMessage.value = '开始批量回测...'

  try {
    const results = await backtestService.runBatchBacktest(params, parameterGrid)
    batchResults.value = results.sort((a, b) => b.performance.sharpeRatio - a.performance.sharpeRatio)
    showToast(`批量回测完成，共 ${results.length} 个结果`)
  } catch (err: any) {
    error.value = err.message
    showToast('批量回测失败: ' + err.message)
  } finally {
    isRunning.value = false
  }
}

// 重置回测
const resetBacktest = () => {
  backtestResult.value = null
  batchResults.value = []
  error.value = ''
  progress.value = 0
}

// 查看结果详情
const viewResult = (result: BacktestResult) => {
  backtestResult.value = result
}

// 工具函数
const getParamLabel = (key: string) => {
  const labels: Record<string, string> = {
    shortPeriod: '短期周期',
    longPeriod: '长期周期',
    stopLoss: '止损比例',
    takeProfit: '止盈比例',
    rsiPeriod: 'RSI周期',
    oversoldLevel: '超卖阈值',
    overboughtLevel: '超买阈值'
  }
  return labels[key] || key
}

const getParamStep = (key: string) => {
  if (key.includes('Loss') || key.includes('Profit')) return 0.01
  return 1
}

const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`
const getReturnClass = (value: number) => value >= 0 ? 'positive' : 'negative'

const formatParams = (params: any) => {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ')
}
</script>

<style scoped>
.professional-backtest-view {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 32px;
  color: #1890ff;
  margin-bottom: 10px;
}

.subtitle {
  font-size: 16px;
  color: #666;
}

.backtest-container {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 30px;
  margin-bottom: 30px;
}

.config-panel {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
  height: fit-content;
}

.panel-section {
  margin-bottom: 30px;
}

.panel-section h3 {
  margin-bottom: 15px;
  color: #333;
  border-bottom: 2px solid #1890ff;
  padding-bottom: 5px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
}

.form-control:focus {
  border-color: #1890ff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.selected-stock {
  margin-top: 5px;
  padding: 5px 10px;
  background: #f0f9ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  font-size: 12px;
  color: #1890ff;
}

.strategy-params h4 {
  margin: 15px 0 10px 0;
  color: #666;
  font-size: 14px;
}

.panel-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary {
  background: #1890ff;
  color: white;
}

.btn-secondary {
  background: #52c41a;
  color: white;
}

.btn-outline {
  background: white;
  color: #1890ff;
  border: 1px solid #1890ff;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.results-panel {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
  min-height: 600px;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 500px;
  text-align: center;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-spinner.large {
  width: 40px;
  height: 40px;
}

.progress-bar {
  width: 300px;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 20px;
}

.progress-fill {
  height: 100%;
  background: #1890ff;
  transition: width 0.3s ease;
}

.features-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-top: 30px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 4px;
}

.feature-icon {
  font-size: 20px;
}

.batch-results {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
}

.batch-results-table {
  overflow-x: auto;
}

.batch-results-table table {
  width: 100%;
  border-collapse: collapse;
}

.batch-results-table th,
.batch-results-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e8e8e8;
}

.batch-results-table th {
  background: #fafafa;
  font-weight: 600;
}

.positive { color: #52c41a; }
.negative { color: #ff4d4f; }

.btn-small {
  padding: 4px 8px;
  font-size: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
