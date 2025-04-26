<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { stockService } from '@/services/stockService'
import type { Stock } from '@/types/stock'
import StockSearch from '@/components/StockSearch.vue'

// 股票列表
const stocks = ref<Stock[]>([])
const isLoading = ref(false)
const error = ref('')

// 模拟账户
const account = reactive({
  cash: 100000, // 初始资金
  positions: [] as any[],
  transactions: [] as any[],
})

// 交易表单
const tradeForm = reactive({
  symbol: '',
  stockName: '', // 添加股票名称字段
  action: 'buy', // 买入或卖出
  quantity: 0,
  price: 0,
})

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

// 获取股票当前价格
const fetchStockPrice = async (symbol: string) => {
  try {
    // 在实际应用中，这里应该调用API获取最新的股票价格
    // 这里使用模拟数据
    return parseFloat((Math.random() * 100 + 10).toFixed(2))
  } catch (err) {
    console.error('获取股票价格失败:', err)
    return 0
  }
}

// 选择股票
const selectStock = async (stock: any) => {
  tradeForm.symbol = stock.symbol
  // 如果股票名称存在，也设置它
  if (stock.name) {
    tradeForm.stockName = stock.name
  }
  // 更新价格
  await updatePrice()
}

// 当选择股票时更新价格
const updatePrice = async () => {
  if (tradeForm.symbol) {
    tradeForm.price = await fetchStockPrice(tradeForm.symbol)
  } else {
    tradeForm.price = 0
  }
}

// 执行交易
const executeTrade = async () => {
  if (!tradeForm.symbol) {
    window.alert('请选择股票')
    return
  }

  if (tradeForm.quantity <= 0) {
    window.alert('请输入有效的数量')
    return
  }

  // 获取股票信息
  let stockName = tradeForm.stockName
  if (!stockName) {
    const stock = stocks.value.find((s) => s.symbol === tradeForm.symbol)
    if (stock) {
      stockName = stock.name
      tradeForm.stockName = stockName
    } else {
      stockName = tradeForm.symbol
    }
  }

  // 更新价格
  await updatePrice()

  const amount = tradeForm.quantity * tradeForm.price

  if (tradeForm.action === 'buy') {
    // 检查资金是否足够
    if (account.cash < amount) {
      window.alert('资金不足')
      return
    }

    // 扣除资金
    account.cash -= amount

    // 添加持仓
    const existingPosition = account.positions.find((p) => p.symbol === tradeForm.symbol)
    if (existingPosition) {
      // 更新现有持仓
      const totalCost = existingPosition.quantity * existingPosition.avgPrice + amount
      const totalQuantity = existingPosition.quantity + tradeForm.quantity
      existingPosition.avgPrice = totalCost / totalQuantity
      existingPosition.quantity = totalQuantity
      existingPosition.currentPrice = tradeForm.price
      existingPosition.value = existingPosition.quantity * existingPosition.currentPrice
      existingPosition.profit =
        existingPosition.value - existingPosition.avgPrice * existingPosition.quantity
      existingPosition.profitPercent =
        (existingPosition.profit / (existingPosition.avgPrice * existingPosition.quantity)) * 100
    } else {
      // 创建新持仓
      account.positions.push({
        symbol: tradeForm.symbol,
        name: tradeForm.stockName || tradeForm.symbol,
        quantity: tradeForm.quantity,
        avgPrice: tradeForm.price,
        currentPrice: tradeForm.price,
        value: tradeForm.quantity * tradeForm.price,
        profit: 0,
        profitPercent: 0,
      })
    }
  } else {
    // 卖出
    const existingPosition = account.positions.find((p) => p.symbol === tradeForm.symbol)
    if (!existingPosition || existingPosition.quantity < tradeForm.quantity) {
      window.alert('持仓不足')
      return
    }

    // 增加资金
    account.cash += amount

    // 更新持仓
    existingPosition.quantity -= tradeForm.quantity
    existingPosition.value = existingPosition.quantity * existingPosition.currentPrice
    existingPosition.profit =
      existingPosition.value - existingPosition.avgPrice * existingPosition.quantity
    existingPosition.profitPercent =
      existingPosition.quantity > 0
        ? (existingPosition.profit / (existingPosition.avgPrice * existingPosition.quantity)) * 100
        : 0

    // 如果持仓为0，则移除
    if (existingPosition.quantity === 0) {
      account.positions = account.positions.filter((p) => p.symbol !== tradeForm.symbol)
    }
  }

  // 添加交易记录
  account.transactions.push({
    id: Date.now(),
    date: new Date().toLocaleString(),
    symbol: tradeForm.symbol,
    name: tradeForm.stockName || tradeForm.symbol,
    action: tradeForm.action,
    quantity: tradeForm.quantity,
    price: tradeForm.price,
    amount: amount,
  })

  // 重置表单
  tradeForm.quantity = 0

  // 保存到本地存储
  saveAccount()

  window.alert(tradeForm.action === 'buy' ? '买入成功' : '卖出成功')
}

// 更新所有持仓的当前价格和收益
const updatePositions = async () => {
  for (const position of account.positions) {
    position.currentPrice = await fetchStockPrice(position.symbol)
    position.value = position.quantity * position.currentPrice
    position.profit = position.value - position.avgPrice * position.quantity
    position.profitPercent = (position.profit / (position.avgPrice * position.quantity)) * 100
  }

  saveAccount()
}

// 计算总资产
const totalAssets = computed(() => {
  const positionsValue = account.positions.reduce((sum, position) => sum + position.value, 0)
  return account.cash + positionsValue
})

// 计算总收益
const totalProfit = computed(() => {
  return account.positions.reduce((sum, position) => sum + position.profit, 0)
})

// 计算总收益率
const totalProfitPercent = computed(() => {
  const totalCost = account.positions.reduce(
    (sum, position) => sum + position.avgPrice * position.quantity,
    0
  )
  return totalCost > 0 ? (totalProfit.value / totalCost) * 100 : 0
})

// 保存账户到本地存储
const saveAccount = () => {
  localStorage.setItem('simulationAccount', JSON.stringify(account))
}

// 从本地存储加载账户
const loadAccount = () => {
  const savedAccount = localStorage.getItem('simulationAccount')
  if (savedAccount) {
    try {
      const parsedAccount = JSON.parse(savedAccount)
      account.cash = parsedAccount.cash
      account.positions = parsedAccount.positions
      account.transactions = parsedAccount.transactions
    } catch (err) {
      console.error('加载账户失败:', err)
    }
  }
}

// 重置账户
const resetAccount = () => {
  if (window.confirm('确定要重置模拟账户吗？这将清除所有持仓和交易记录。')) {
    account.cash = 100000
    account.positions = []
    account.transactions = []
    saveAccount()
    window.alert('账户已重置')
  }
}

// 组件挂载时
onMounted(() => {
  fetchStocks()
  loadAccount()
  updatePositions() // 更新持仓价格
})
</script>

<template>
  <div class="simulation-view">
    <div class="page-header">
      <h1>模拟交易</h1>
      <p class="subtitle">使用虚拟资金测试交易策略，无需承担实际风险</p>
    </div>

    <div class="simulation-container">
      <div class="simulation-sidebar">
        <div class="panel">
          <h2>交易操作</h2>

          <div class="form-group">
            <label>选择股票</label>
            <StockSearch @select="selectStock" />
          </div>

          <div class="form-group">
            <label>交易类型</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" v-model="tradeForm.action" value="buy" />
                买入
              </label>
              <label class="radio-label">
                <input type="radio" v-model="tradeForm.action" value="sell" />
                卖出
              </label>
            </div>
          </div>

          <div class="form-group">
            <label for="quantity">数量</label>
            <input
              type="number"
              id="quantity"
              v-model="tradeForm.quantity"
              class="form-control"
              min="1"
              step="1"
            />
          </div>

          <div class="form-group">
            <label for="price">价格</label>
            <div class="input-group">
              <input
                type="number"
                id="price"
                v-model="tradeForm.price"
                class="form-control"
                step="0.01"
                readonly
              />
              <span class="input-group-text">元</span>
            </div>
          </div>

          <div class="trade-summary">
            <div class="summary-item">
              <span class="summary-label">交易金额:</span>
              <span class="summary-value"
                >{{ (tradeForm.quantity * tradeForm.price).toFixed(2) }} 元</span
              >
            </div>
            <div class="summary-item">
              <span class="summary-label">可用资金:</span>
              <span class="summary-value">{{ account.cash.toFixed(2) }} 元</span>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn btn-primary" @click="executeTrade">
              {{ tradeForm.action === 'buy' ? '买入' : '卖出' }}
            </button>
            <button class="btn btn-outline" @click="updatePositions">刷新价格</button>
          </div>

          <div class="reset-account">
            <button class="btn btn-danger" @click="resetAccount">重置账户</button>
          </div>
        </div>
      </div>

      <div class="simulation-content">
        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>正在加载，请稍候...</p>
        </div>

        <div v-else-if="error" class="error-state">
          <p>{{ error }}</p>
          <button class="btn btn-primary" @click="fetchStocks">重试</button>
        </div>

        <div v-else class="account-overview">
          <div class="account-summary">
            <div class="summary-card">
              <div class="summary-title">总资产</div>
              <div class="summary-value">{{ totalAssets.toFixed(2) }} 元</div>
            </div>

            <div class="summary-card">
              <div class="summary-title">可用资金</div>
              <div class="summary-value">{{ account.cash.toFixed(2) }} 元</div>
            </div>

            <div class="summary-card">
              <div class="summary-title">持仓市值</div>
              <div class="summary-value">{{ (totalAssets - account.cash).toFixed(2) }} 元</div>
            </div>

            <div class="summary-card">
              <div class="summary-title">总收益</div>
              <div class="summary-value" :class="totalProfit >= 0 ? 'positive' : 'negative'">
                {{ totalProfit.toFixed(2) }} 元 ({{ totalProfitPercent.toFixed(2) }}%)
              </div>
            </div>
          </div>

          <div class="positions-section">
            <h3>持仓列表</h3>

            <div v-if="account.positions.length === 0" class="empty-positions">
              <p>暂无持仓</p>
            </div>

            <table v-else class="positions-table">
              <thead>
                <tr>
                  <th>股票</th>
                  <th>数量</th>
                  <th>成本价</th>
                  <th>当前价</th>
                  <th>市值</th>
                  <th>盈亏</th>
                  <th>盈亏比例</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="position in account.positions" :key="position.symbol">
                  <td>{{ position.name }} ({{ position.symbol }})</td>
                  <td>{{ position.quantity }}</td>
                  <td>{{ position.avgPrice.toFixed(2) }}</td>
                  <td>{{ position.currentPrice.toFixed(2) }}</td>
                  <td>{{ position.value.toFixed(2) }}</td>
                  <td :class="position.profit >= 0 ? 'positive' : 'negative'">
                    {{ position.profit.toFixed(2) }}
                  </td>
                  <td :class="position.profitPercent >= 0 ? 'positive' : 'negative'">
                    {{ position.profitPercent.toFixed(2) }}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="transactions-section">
            <h3>交易记录</h3>

            <div v-if="account.transactions.length === 0" class="empty-transactions">
              <p>暂无交易记录</p>
            </div>

            <table v-else class="transactions-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>股票</th>
                  <th>操作</th>
                  <th>数量</th>
                  <th>价格</th>
                  <th>金额</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="transaction in account.transactions.slice().reverse()"
                  :key="transaction.id"
                >
                  <td>{{ transaction.date }}</td>
                  <td>{{ transaction.name }} ({{ transaction.symbol }})</td>
                  <td :class="transaction.action === 'buy' ? 'buy' : 'sell'">
                    {{ transaction.action === 'buy' ? '买入' : '卖出' }}
                  </td>
                  <td>{{ transaction.quantity }}</td>
                  <td>{{ transaction.price.toFixed(2) }}</td>
                  <td>{{ transaction.amount.toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.simulation-view {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.page-header {
  margin-bottom: var(--spacing-lg);
}

.page-header h1 {
  font-size: var(--font-size-xl);
  color: var(--primary-color);
  margin-bottom: var(--spacing-xs);
}

.subtitle {
  color: var(--text-secondary);
  font-size: var(--font-size-md);
}

.simulation-container {
  display: flex;
  gap: var(--spacing-lg);
}

.simulation-sidebar {
  width: 320px;
  flex-shrink: 0;
}

.simulation-content {
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

.radio-group {
  display: flex;
  gap: var(--spacing-md);
}

.radio-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
}

.input-group {
  display: flex;
  align-items: center;
}

.input-group .form-control {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  flex: 1;
}

.input-group-text {
  padding: var(--spacing-sm);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-left: none;
  border-top-right-radius: var(--border-radius-sm);
  border-bottom-right-radius: var(--border-radius-sm);
  color: var(--text-secondary);
}

.trade-summary {
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  padding: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.summary-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-xs);
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-label {
  color: var(--text-secondary);
}

.summary-value {
  font-weight: 500;
  color: var(--text-primary);
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}

.reset-account {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-light);
  text-align: center;
}

.loading-state,
.error-state {
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

.account-overview {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.account-summary {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.summary-card {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-md);
  text-align: center;
}

.summary-title {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.summary-value {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.positions-section,
.transactions-section {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-md);
}

.positions-section h3,
.transactions-section h3 {
  font-size: var(--font-size-lg);
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
}

.empty-positions,
.empty-transactions {
  text-align: center;
  padding: var(--spacing-lg) 0;
  color: var(--text-secondary);
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

.positive {
  color: var(--success-color);
}

.negative {
  color: var(--error-color);
}

.buy {
  color: var(--success-color);
}

.sell {
  color: var(--error-color);
}

.btn-danger {
  background-color: var(--error-color);
  color: white;
  border: none;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-weight: 500;
}

.btn-danger:hover {
  background-color: var(--error-color-dark);
}

@media (max-width: 768px) {
  .simulation-container {
    flex-direction: column;
  }

  .simulation-sidebar {
    width: 100%;
  }
}
</style>
