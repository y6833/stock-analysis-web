<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { simulationService, type SimulationAccount, type SimulationPosition, type SimulationTransaction } from '@/services/simulationService'
import StockSearch from '@/components/StockSearch.vue'
import { useToast } from '@/composables/useToast'

// 使用 Toast 提示
const { showToast } = useToast()

// 加载状态
const isLoading = ref(false)
const error = ref('')

// 当前选中的模拟账户
const currentAccount = ref<SimulationAccount | null>(null)
const accounts = ref<SimulationAccount[]>([])

// 交易表单
const tradeForm = reactive({
  symbol: '',
  stockName: '',
  action: 'buy', // 买入或卖出
  quantity: 0,
  price: 0,
})

// 获取模拟账户列表
const fetchAccounts = async () => {
  isLoading.value = true
  error.value = ''
  
  try {
    accounts.value = await simulationService.getAccounts()
    
    // 如果有账户，默认选择第一个
    if (accounts.value.length > 0) {
      await selectAccount(accounts.value[0].id)
    } else {
      // 如果没有账户，创建一个默认账户
      await createDefaultAccount()
    }
  } catch (err: any) {
    console.error('获取模拟账户失败:', err)
    error.value = `获取模拟账户失败: ${err.message || '未知错误'}`
  } finally {
    isLoading.value = false
  }
}

// 创建默认账户
const createDefaultAccount = async () => {
  try {
    const newAccount = await simulationService.createAccount('默认账户', 100000)
    accounts.value.push(newAccount)
    await selectAccount(newAccount.id)
    showToast('已创建默认模拟账户', 'success')
  } catch (err: any) {
    console.error('创建默认账户失败:', err)
    error.value = `创建默认账户失败: ${err.message || '未知错误'}`
  }
}

// 选择账户
const selectAccount = async (accountId: number) => {
  isLoading.value = true
  error.value = ''
  
  try {
    currentAccount.value = await simulationService.getAccount(accountId)
  } catch (err: any) {
    console.error('获取账户详情失败:', err)
    error.value = `获取账户详情失败: ${err.message || '未知错误'}`
  } finally {
    isLoading.value = false
  }
}

// 选择股票
const selectStock = async (stock: any) => {
  tradeForm.symbol = stock.symbol
  tradeForm.stockName = stock.name || stock.symbol
  
  // 更新价格
  await updatePrice()
}

// 获取股票当前价格
const updatePrice = async () => {
  if (!tradeForm.symbol) {
    tradeForm.price = 0
    return
  }
  
  try {
    const quote = await simulationService.getStockQuote(tradeForm.symbol)
    if (quote) {
      tradeForm.price = quote.price
    } else {
      // 如果获取不到实时价格，使用模拟价格
      tradeForm.price = parseFloat((Math.random() * 100 + 10).toFixed(2))
    }
  } catch (err) {
    console.error('获取股票价格失败:', err)
    // 使用模拟价格
    tradeForm.price = parseFloat((Math.random() * 100 + 10).toFixed(2))
  }
}

// 执行交易
const executeTrade = async () => {
  if (!currentAccount.value) {
    showToast('请先选择或创建模拟账户', 'error')
    return
  }
  
  if (!tradeForm.symbol) {
    showToast('请选择股票', 'error')
    return
  }
  
  if (tradeForm.quantity <= 0) {
    showToast('请输入有效的数量', 'error')
    return
  }
  
  isLoading.value = true
  
  try {
    const result = await simulationService.executeTrade(currentAccount.value.id, {
      stockCode: tradeForm.symbol,
      stockName: tradeForm.stockName,
      action: tradeForm.action as 'buy' | 'sell',
      quantity: tradeForm.quantity,
      price: tradeForm.price
    })
    
    // 更新当前账户信息
    currentAccount.value = result.account
    
    // 重置表单
    tradeForm.quantity = 0
    
    showToast(tradeForm.action === 'buy' ? '买入成功' : '卖出成功', 'success')
  } catch (err: any) {
    console.error('交易执行失败:', err)
    showToast(err.message || '交易执行失败', 'error')
  } finally {
    isLoading.value = false
  }
}

// 更新所有持仓的当前价格和收益
const updatePositions = async () => {
  if (!currentAccount.value) return
  
  isLoading.value = true
  
  try {
    const positions = await simulationService.getPositions(currentAccount.value.id)
    if (currentAccount.value) {
      currentAccount.value.positions = positions
    }
    showToast('持仓价格已更新', 'success')
  } catch (err) {
    console.error('更新持仓失败:', err)
    showToast('更新持仓失败', 'error')
  } finally {
    isLoading.value = false
  }
}

// 计算总资产
const totalAssets = computed(() => {
  if (!currentAccount.value) return 0
  
  const positionsValue = currentAccount.value.positions?.reduce(
    (sum, position) => sum + (position.value || 0), 0
  ) || 0
  
  return currentAccount.value.cash + positionsValue
})

// 计算总收益
const totalProfit = computed(() => {
  if (!currentAccount.value) return 0
  
  return currentAccount.value.positions?.reduce(
    (sum, position) => sum + (position.profit || 0), 0
  ) || 0
})

// 计算总收益率
const totalProfitPercent = computed(() => {
  if (!currentAccount.value) return 0
  
  const totalCost = currentAccount.value.positions?.reduce(
    (sum, position) => sum + (position.avgPrice * position.quantity), 0
  ) || 0
  
  return totalCost > 0 ? (totalProfit.value / totalCost) * 100 : 0
})

// 重置账户
const resetAccount = async () => {
  if (!currentAccount.value) return
  
  if (window.confirm('确定要重置模拟账户吗？这将清除所有持仓和交易记录。')) {
    isLoading.value = true
    
    try {
      // 创建一个新账户替代当前账户
      const newAccount = await simulationService.createAccount(
        `${currentAccount.value.name} (重置)`, 
        100000
      )
      
      // 更新账户列表
      accounts.value = await simulationService.getAccounts()
      
      // 选择新账户
      await selectAccount(newAccount.id)
      
      showToast('账户已重置', 'success')
    } catch (err: any) {
      console.error('重置账户失败:', err)
      showToast('重置账户失败', 'error')
    } finally {
      isLoading.value = false
    }
  }
}

// 组件挂载时
onMounted(() => {
  fetchAccounts()
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
          
          <!-- 账户选择 -->
          <div class="form-group" v-if="accounts.length > 1">
            <label>选择账户</label>
            <select 
              v-model="currentAccount" 
              class="form-control"
              @change="selectAccount(currentAccount?.id || 0)"
            >
              <option 
                v-for="account in accounts" 
                :key="account.id" 
                :value="account"
              >
                {{ account.name }} ({{ account.cash.toFixed(2) }}元)
              </option>
            </select>
          </div>
          
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
              <span class="summary-value">{{ (tradeForm.quantity * tradeForm.price).toFixed(2) }} 元</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">可用资金:</span>
              <span class="summary-value">{{ currentAccount?.cash.toFixed(2) || '0.00' }} 元</span>
            </div>
          </div>
          
          <div class="form-actions">
            <button 
              class="btn btn-primary" 
              @click="executeTrade"
              :disabled="isLoading"
            >
              {{ tradeForm.action === 'buy' ? '买入' : '卖出' }}
            </button>
            <button 
              class="btn btn-outline" 
              @click="updatePositions"
              :disabled="isLoading"
            >
              刷新价格
            </button>
          </div>
          
          <div class="reset-account">
            <button 
              class="btn btn-danger" 
              @click="resetAccount"
              :disabled="isLoading"
            >
              重置账户
            </button>
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
          <button class="btn btn-primary" @click="fetchAccounts">重试</button>
        </div>
        
        <div v-else-if="currentAccount" class="account-overview">
          <div class="account-summary">
            <div class="summary-card">
              <div class="summary-title">总资产</div>
              <div class="summary-value">{{ totalAssets.toFixed(2) }} 元</div>
            </div>
            
            <div class="summary-card">
              <div class="summary-title">可用资金</div>
              <div class="summary-value">{{ currentAccount.cash.toFixed(2) }} 元</div>
            </div>
            
            <div class="summary-card">
              <div class="summary-title">持仓市值</div>
              <div class="summary-value">{{ (totalAssets - currentAccount.cash).toFixed(2) }} 元</div>
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
            
            <div v-if="!currentAccount.positions || currentAccount.positions.length === 0" class="empty-positions">
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
                <tr v-for="position in currentAccount.positions" :key="position.stockCode">
                  <td>{{ position.stockName }} ({{ position.stockCode }})</td>
                  <td>{{ position.quantity }}</td>
                  <td>{{ position.avgPrice.toFixed(2) }}</td>
                  <td>{{ (position.currentPrice || 0).toFixed(2) }}</td>
                  <td>{{ (position.value || 0).toFixed(2) }}</td>
                  <td :class="(position.profit || 0) >= 0 ? 'positive' : 'negative'">
                    {{ (position.profit || 0).toFixed(2) }}
                  </td>
                  <td :class="(position.profitPercent || 0) >= 0 ? 'positive' : 'negative'">
                    {{ (position.profitPercent || 0).toFixed(2) }}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="transactions-section">
            <h3>交易记录</h3>
            
            <div v-if="!currentAccount.transactions || currentAccount.transactions.length === 0" class="empty-transactions">
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
                <tr v-for="transaction in currentAccount.transactions" :key="transaction.id">
                  <td>{{ new Date(transaction.transactionDate).toLocaleString() }}</td>
                  <td>{{ transaction.stockName }} ({{ transaction.stockCode }})</td>
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

th, td {
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
