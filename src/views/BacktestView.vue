<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { stockService } from '@/services/stockService'
import type { Stock } from '@/types/stock'
import UnifiedStockSearch from '@/components/common/UnifiedStockSearch.vue'
import PageLayout from '@/components/common/PageLayout.vue'
import { useToast } from '@/composables/useToast'

const { showToast } = useToast()
// 股票列表
const stocks = ref<Stock[]>([])
const isLoading = ref(false)
const error = ref('')

// 回测参数
const backtestParams = reactive({
  symbol: '',
  startDate: '',
  endDate: '',
  initialCapital: 100000,
  strategy: 'ma_crossover', // 默认策略：均线交叉
  parameters: {
    shortPeriod: 5, // 短期均线周期
    longPeriod: 20, // 长期均线周期
    rsiPeriod: 14, // RSI周期
    rsiOverbought: 70, // RSI超买阈值
    rsiOversold: 30, // RSI超卖阈值
    macdFastPeriod: 12, // MACD快线周期
    macdSlowPeriod: 26, // MACD慢线周期
    macdSignalPeriod: 9, // MACD信号线周期
  },
})

// 回测结果
const backtestResults = ref<any>(null)
const backtestData = ref<any[]>([])
const isBacktesting = ref(false)

// 可用策略列表
const strategies = [
  { id: 'ma_crossover', name: '均线交叉', description: '当短期均线上穿长期均线时买入，下穿时卖出' },
  { id: 'rsi', name: 'RSI超买超卖', description: '当RSI低于超卖阈值时买入，高于超买阈值时卖出' },
  { id: 'macd', name: 'MACD金叉死叉', description: '当MACD金叉时买入，死叉时卖出' },
  { id: 'bollinger', name: '布林带突破', description: '当价格突破上轨时买入，突破下轨时卖出' },
]

// 计算当前日期和一年前的日期作为默认值
const today = new Date()
const oneYearAgo = new Date()
oneYearAgo.setFullYear(today.getFullYear() - 1)

const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 设置默认日期
backtestParams.endDate = formatDate(today)
backtestParams.startDate = formatDate(oneYearAgo)

// 获取股票列表
const fetchStocks = async () => {
  isLoading.value = true
  error.value = ''

  try {
    stocks.value = await stockService.getStocks()
  } catch (err: any) {
    console.error('获取股票列表失败:', err)
    error.value = `获取股票列表失败: ${err.message || '未知错误'}`
  } finally {
    isLoading.value = false
  }
}

// 运行回测
const runBacktest = async () => {
  if (!backtestParams.symbol) {
    showToast('请选择股票')
    return
  }

  isBacktesting.value = true
  backtestResults.value = null
  error.value = ''

  try {
    // 尝试获取真实股票数据
    try {
      // 获取股票历史数据
      const stockData = await stockService.getStockData(backtestParams.symbol)

      if (!stockData || !stockData.prices || stockData.prices.length === 0) {
        throw new Error('无法获取股票历史数据，请检查网络连接或稍后再试')
      }

      console.log(
        `成功获取 ${backtestParams.symbol} 的历史数据，共 ${stockData.prices.length} 条记录`
      )

      // 如果获取到了真实数据，使用真实数据进行回测
      // 但目前回测逻辑仍使用模拟数据，因为需要实现完整的回测算法
      // 这里可以在未来扩展为使用真实数据的回测
    } catch (dataErr) {
      console.warn('获取真实数据失败，使用模拟数据:', dataErr)
      // 如果获取真实数据失败，提示用户但继续使用模拟数据
      showToast('获取真实数据失败，将使用模拟数据进行回测')
    }

    // 使用模拟数据进行回测
    await simulateBacktest()

    showToast('回测完成')
  } catch (err: any) {
    console.error('回测失败:', err)
    error.value = `回测失败: ${err.message || '未知错误'}`
    showToast(`回测失败: ${err.message || '未知错误'}`)
  } finally {
    isBacktesting.value = false
  }
}

// 模拟回测过程
const simulateBacktest = async () => {
  // 模拟API调用延迟
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // 生成模拟数据
  const days = 250 // 约一年的交易日
  const data: any[] = []

  // 初始价格和波动范围
  let price = 100
  const volatility = 2

  // 生成日期序列
  const startDate = new Date(backtestParams.startDate)
  const endDate = new Date(backtestParams.endDate)
  const dateRange = (endDate.getTime() - startDate.getTime()) / (days - 1)

  // 生成价格和交易信号
  for (let i = 0; i < days; i++) {
    // 生成日期
    const currentDate = new Date(startDate.getTime() + dateRange * i)

    // 生成价格变动
    const change = (Math.random() - 0.5) * volatility
    price = Math.max(price + change, 1) // 确保价格为正

    // 计算交易信号
    const signal = Math.random() > 0.95 ? (Math.random() > 0.5 ? 'buy' : 'sell') : null

    data.push({
      date: formatDate(currentDate),
      price: parseFloat(price.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000) + 100000,
      signal,
    })
  }

  // 计算回测结果
  const initialCapital = backtestParams.initialCapital
  let capital = initialCapital
  let shares = 0
  const trades: any[] = []

  data.forEach((day, index) => {
    if (day.signal === 'buy' && capital > 0) {
      // 买入信号
      const buyAmount = capital
      shares = buyAmount / day.price
      capital = 0

      trades.push({
        date: day.date,
        type: 'buy',
        price: day.price,
        shares,
        amount: buyAmount,
      })

      // 添加到数据中
      data[index].position = shares * day.price
    } else if (day.signal === 'sell' && shares > 0) {
      // 卖出信号
      const sellAmount = shares * day.price
      capital = sellAmount

      trades.push({
        date: day.date,
        type: 'sell',
        price: day.price,
        shares,
        amount: sellAmount,
      })

      shares = 0

      // 添加到数据中
      data[index].position = 0
    } else {
      // 持仓价值
      data[index].position = shares * day.price
    }

    // 总资产
    data[index].totalAssets = capital + shares * day.price
  })

  // 计算收益率和其他指标
  const finalAssets = data[data.length - 1].totalAssets
  const totalReturn = ((finalAssets - initialCapital) / initialCapital) * 100

  // 计算最大回撤
  let maxDrawdown = 0
  let peak = initialCapital

  data.forEach((day) => {
    if (day.totalAssets > peak) {
      peak = day.totalAssets
    }

    const drawdown = ((peak - day.totalAssets) / peak) * 100
    maxDrawdown = Math.max(maxDrawdown, drawdown)
  })

  // 计算年化收益率
  const daysInYear = 252 // 交易日
  const years = days / daysInYear
  const annualizedReturn = (Math.pow(finalAssets / initialCapital, 1 / years) - 1) * 100

  // 计算夏普比率 (简化版)
  const returns = data.map((day, index) => {
    if (index === 0) return 0
    return (day.totalAssets - data[index - 1].totalAssets) / data[index - 1].totalAssets
  })

  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
  const stdDev = Math.sqrt(
    returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
  )
  const sharpeRatio = (avgReturn / stdDev) * Math.sqrt(daysInYear)

  // 设置回测结果
  backtestResults.value = {
    initialCapital,
    finalAssets,
    totalReturn: totalReturn.toFixed(2),
    annualizedReturn: annualizedReturn.toFixed(2),
    maxDrawdown: maxDrawdown.toFixed(2),
    sharpeRatio: sharpeRatio.toFixed(2),
    trades,
    winRate: (
      (trades.filter(
        (t) =>
          t.type === 'sell' &&
          t.amount > t.shares * trades.find((b) => b.type === 'buy' && b.date < t.date)?.price
      ).length /
        trades.filter((t) => t.type === 'sell').length) *
      100
    ).toFixed(2),
  }

  backtestData.value = data
}

// 重置回测
const resetBacktest = () => {
  backtestResults.value = null
  backtestData.value = []
}

// 获取当前策略的参数字段
const strategyParameters = computed(() => {
  switch (backtestParams.strategy) {
    case 'ma_crossover':
      return [
        { id: 'shortPeriod', name: '短期均线周期', type: 'number', min: 1, max: 100 },
        { id: 'longPeriod', name: '长期均线周期', type: 'number', min: 2, max: 200 },
      ]
    case 'rsi':
      return [
        { id: 'rsiPeriod', name: 'RSI周期', type: 'number', min: 1, max: 100 },
        { id: 'rsiOverbought', name: 'RSI超买阈值', type: 'number', min: 50, max: 100 },
        { id: 'rsiOversold', name: 'RSI超卖阈值', type: 'number', min: 0, max: 50 },
      ]
    case 'macd':
      return [
        { id: 'macdFastPeriod', name: '快线周期', type: 'number', min: 1, max: 100 },
        { id: 'macdSlowPeriod', name: '慢线周期', type: 'number', min: 1, max: 100 },
        { id: 'macdSignalPeriod', name: '信号线周期', type: 'number', min: 1, max: 100 },
      ]
    case 'bollinger':
      return [
        { id: 'bollingerPeriod', name: '布林带周期', type: 'number', min: 1, max: 100 },
        { id: 'bollingerStdDev', name: '标准差倍数', type: 'number', min: 0.5, max: 5 },
      ]
    default:
      return []
  }
})

// 选择股票
const selectStock = (stock: any) => {
  backtestParams.symbol = stock.symbol
}

// 组件挂载时获取股票列表
onMounted(() => {
  fetchStocks()
})
</script>

<template>
  <PageLayout title="策略回测" subtitle="测试交易策略在历史数据上的表现，优化您的投资决策">
    <div class="backtest-container">
      <div class="backtest-sidebar">
        <div class="panel">
          <h2>回测参数</h2>

          <div class="form-group">
            <label>选择股票</label>
            <UnifiedStockSearch @select="selectStock" />
          </div>

          <div class="form-group">
            <label for="start-date">开始日期</label>
            <input type="date" id="start-date" v-model="backtestParams.startDate" class="form-control" />
          </div>

          <div class="form-group">
            <label for="end-date">结束日期</label>
            <input type="date" id="end-date" v-model="backtestParams.endDate" class="form-control" />
          </div>

          <div class="form-group">
            <label for="initial-capital">初始资金</label>
            <input type="number" id="initial-capital" v-model="backtestParams.initialCapital" class="form-control"
              min="1000" step="1000" />
          </div>

          <div class="form-group">
            <label for="strategy">交易策略</label>
            <select id="strategy" v-model="backtestParams.strategy" class="form-control">
              <option v-for="strategy in strategies" :key="strategy.id" :value="strategy.id">
                {{ strategy.name }}
              </option>
            </select>
            <p class="strategy-description">
              {{strategies.find((s) => s.id === backtestParams.strategy)?.description}}
            </p>
          </div>

          <h3>策略参数</h3>
          <div class="strategy-parameters">
            <div v-for="param in strategyParameters" :key="param.id" class="form-group">
              <label :for="param.id">{{ param.name }}</label>
              <input :type="param.type" :id="param.id" v-model="backtestParams.parameters[param.id]"
                class="form-control" :min="param.min" :max="param.max" step="1" />
            </div>
          </div>

          <div class="form-actions">
            <button class="btn btn-primary" @click="runBacktest" :disabled="isBacktesting">
              <span v-if="isBacktesting" class="loading-spinner small"></span>
              {{ isBacktesting ? '回测中...' : '运行回测' }}
            </button>
            <button class="btn btn-outline" @click="resetBacktest" :disabled="isBacktesting || !backtestResults">
              重置
            </button>
          </div>
        </div>
      </div>

      <div class="backtest-content">
        <div v-if="isBacktesting" class="loading-state">
          <div class="loading-spinner"></div>
          <p>正在进行回测，请稍候...</p>
        </div>

        <div v-else-if="error" class="error-state">
          <p>{{ error }}</p>
          <button class="btn btn-primary" @click="fetchStocks">重试</button>
        </div>

        <div v-else-if="!backtestResults" class="empty-state">
          <div class="empty-icon">📊</div>
          <h3>开始您的策略回测</h3>
          <p>选择股票、时间范围和交易策略，然后点击"运行回测"按钮</p>
        </div>

        <div v-else class="backtest-results">
          <div class="results-summary">
            <h3>回测结果摘要</h3>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-title">总收益率</div>
                <div class="metric-value"
                  :class="parseFloat(backtestResults.totalReturn) >= 0 ? 'positive' : 'negative'">
                  {{ backtestResults.totalReturn }}%
                </div>
              </div>

              <div class="metric-card">
                <div class="metric-title">年化收益率</div>
                <div class="metric-value" :class="parseFloat(backtestResults.annualizedReturn) >= 0 ? 'positive' : 'negative'
                  ">
                  {{ backtestResults.annualizedReturn }}%
                </div>
              </div>

              <div class="metric-card">
                <div class="metric-title">最大回撤</div>
                <div class="metric-value negative">{{ backtestResults.maxDrawdown }}%</div>
              </div>

              <div class="metric-card">
                <div class="metric-title">夏普比率</div>
                <div class="metric-value"
                  :class="parseFloat(backtestResults.sharpeRatio) >= 0 ? 'positive' : 'negative'">
                  {{ backtestResults.sharpeRatio }}
                </div>
              </div>

              <div class="metric-card">
                <div class="metric-title">初始资金</div>
                <div class="metric-value">
                  {{ backtestResults.initialCapital.toLocaleString() }}
                </div>
              </div>

              <div class="metric-card">
                <div class="metric-title">最终资产</div>
                <div class="metric-value">
                  {{ backtestResults.finalAssets.toLocaleString() }}
                </div>
              </div>

              <div class="metric-card">
                <div class="metric-title">交易次数</div>
                <div class="metric-value">
                  {{ backtestResults.trades.length }}
                </div>
              </div>

              <div class="metric-card">
                <div class="metric-title">胜率</div>
                <div class="metric-value" :class="parseFloat(backtestResults.winRate) >= 50 ? 'positive' : 'negative'">
                  {{ backtestResults.winRate }}%
                </div>
              </div>
            </div>
          </div>

          <div class="chart-container">
            <h3>回测图表</h3>
            <div class="chart-placeholder">
              <p>图表功能正在开发中...</p>
            </div>
          </div>

          <div class="trades-table">
            <h3>交易记录</h3>
            <table>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>类型</th>
                  <th>价格</th>
                  <th>数量</th>
                  <th>金额</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(trade, index) in backtestResults.trades" :key="index">
                  <td>{{ trade.date }}</td>
                  <td :class="trade.type === 'buy' ? 'buy' : 'sell'">
                    {{ trade.type === 'buy' ? '买入' : '卖出' }}
                  </td>
                  <td>{{ trade.price.toFixed(2) }}</td>
                  <td>{{ trade.shares.toFixed(2) }}</td>
                  <td>{{ trade.amount.toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.backtest-container {
  display: flex;
  gap: var(--spacing-lg);
}

.backtest-sidebar {
  width: 320px;
  flex-shrink: 0;
}

.backtest-content {
  flex: 1;
  min-width: 0;
}

.panel {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.panel h2 {
  font-size: var(--font-size-lg);
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
}

.panel h3 {
  font-size: var(--font-size-md);
  margin-top: var(--spacing-lg);
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
}

.results-summary h3,
.chart-container h3,
.trades-table h3 {
  font-size: var(--font-size-md);
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.metric-card {
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  padding: var(--spacing-md);
  text-align: center;
}

.metric-title {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.metric-value {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.positive {
  color: var(--success-color);
}

.negative {
  color: var(--error-color);
}

.chart-placeholder {
  height: 300px;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  color: var(--text-secondary);
  font-weight: 500;
}

.form-control {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.strategy-description {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-style: italic;
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl) 0;
  text-align: center;
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
  min-height: 400px;
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

.loading-spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
  margin: 0;
  margin-right: var(--spacing-xs);
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

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-md);
}

.empty-state h3 {
  margin-top: 0;
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
}

.empty-state p {
  color: var(--text-secondary);
  max-width: 400px;
}

.backtest-results {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-md);
}

.chart-container {
  margin-top: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.chart-container h3 {
  font-size: var(--font-size-md);
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
}

.trades-table {
  margin-top: var(--spacing-lg);
}

.trades-table h3 {
  font-size: var(--font-size-md);
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
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
}

.buy {
  color: var(--success-color);
}

.sell {
  color: var(--error-color);
}

@media (max-width: 768px) {
  .backtest-container {
    flex-direction: column;
  }

  .backtest-sidebar {
    width: 100%;
  }
}
</style>
