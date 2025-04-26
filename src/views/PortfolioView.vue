<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useStockStore } from '@/stores/stockStore'
import { usePortfolioStore } from '@/stores/portfolioStore'
import type { Position } from '@/types/portfolio'
import { stockService } from '@/services/stockService'
import * as portfolioService from '@/services/portfolioService'

// 仓位数据
const positions = ref<Position[]>([])
const isLoading = ref(false)
const error = ref('')

// 新增仓位表单
const showAddForm = ref(false)
const newPosition = ref<Partial<Position>>({
  symbol: '',
  name: '',
  quantity: 0,
  buyPrice: 0,
  buyDate: new Date().toISOString().split('T')[0],
  lastPrice: 0,
  lastUpdate: new Date().toISOString(),
})

// 搜索相关
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const isSearching = ref(false)
const showSearchResults = ref(false)

// 计算属性
const totalInvestment = computed(() => {
  return positions.value.reduce((sum, position) => {
    return sum + position.quantity * position.buyPrice
  }, 0)
})

const currentValue = computed(() => {
  return positions.value.reduce((sum, position) => {
    return sum + position.quantity * position.lastPrice
  }, 0)
})

const totalProfit = computed(() => {
  return currentValue.value - totalInvestment.value
})

const profitPercentage = computed(() => {
  if (totalInvestment.value === 0) return 0
  return (totalProfit.value / totalInvestment.value) * 100
})

// 获取仓位数据
const loadPositions = async () => {
  isLoading.value = true
  try {
    // 使用portfolioStore加载仓位数据
    const portfolioStore = usePortfolioStore()

    // 先获取投资组合列表
    await portfolioStore.fetchPortfolios()

    // 如果没有当前选中的投资组合，创建一个默认组合
    if (!portfolioStore.currentPortfolioId && portfolioStore.portfolios.length === 0) {
      await portfolioStore.createPortfolio({
        name: '默认组合',
        description: '系统自动创建的默认投资组合',
        isDefault: true,
      })
    }

    // 确保有当前选中的投资组合
    if (portfolioStore.currentPortfolioId) {
      // 加载当前投资组合的持仓
      await portfolioStore.fetchHoldings(portfolioStore.currentPortfolioId)

      // 将数据从store复制到本地状态
      if (portfolioStore.holdings.length > 0) {
        positions.value = portfolioStore.holdings.map((holding: portfolioService.Holding) => ({
          symbol: holding.stockCode,
          name: holding.stockName,
          quantity: holding.quantity,
          buyPrice: holding.averageCost,
          buyDate: new Date(holding.createdAt).toISOString().split('T')[0],
          lastPrice: holding.currentPrice,
          lastUpdate: holding.updatedAt,
          notes: holding.notes,
          id: holding.id,
        }))
      } else {
        // 如果没有持仓，清空本地状态
        positions.value = []
      }
    } else {
      console.error('没有可用的投资组合')
      error.value = '没有可用的投资组合，请创建一个投资组合'
    }
  } catch (err) {
    console.error('加载仓位数据失败:', err)
    error.value = '加载仓位数据失败，请稍后再试'
  } finally {
    isLoading.value = false
  }
}

// 保存仓位数据
const savePositions = () => {
  // 不再需要保存到本地存储，数据已经保存到数据库
}

// 搜索股票
const searchStocks = async () => {
  if (!searchQuery.value) {
    searchResults.value = []
    showSearchResults.value = false
    return
  }

  isSearching.value = true

  try {
    searchResults.value = await stockService.searchStocks(searchQuery.value)
    showSearchResults.value = true
  } catch (err) {
    console.error('搜索股票失败:', err)
  } finally {
    isSearching.value = false
  }
}

// 选择股票
const selectStock = async (stock: any) => {
  newPosition.value.symbol = stock.symbol
  newPosition.value.name = stock.name
  searchQuery.value = ''
  showSearchResults.value = false

  // 获取最新价格
  try {
    const stockData = await stockService.getStockData(stock.symbol)
    if (stockData && stockData.prices.length > 0) {
      newPosition.value.lastPrice = stockData.prices[stockData.prices.length - 1]
    }
  } catch (err) {
    console.error('获取股票价格失败:', err)
  }
}

// 添加仓位
const addPosition = async () => {
  if (
    !newPosition.value.symbol ||
    !newPosition.value.name ||
    !newPosition.value.quantity ||
    !newPosition.value.buyPrice
  ) {
    error.value = '请填写完整的仓位信息'
    return
  }

  const position: Position = {
    symbol: newPosition.value.symbol!,
    name: newPosition.value.name!,
    quantity: newPosition.value.quantity!,
    buyPrice: newPosition.value.buyPrice!,
    buyDate: newPosition.value.buyDate || new Date().toISOString().split('T')[0],
    lastPrice: newPosition.value.lastPrice || newPosition.value.buyPrice!,
    lastUpdate: new Date().toISOString(),
    notes: newPosition.value.notes,
  }

  isLoading.value = true

  try {
    // 使用portfolioStore添加持仓
    const portfolioStore = usePortfolioStore()

    const result = await portfolioStore.addHolding({
      stockCode: position.symbol,
      stockName: position.name,
      quantity: position.quantity,
      averageCost: position.buyPrice,
      currentPrice: position.lastPrice,
      notes: position.notes,
    })

    if (result) {
      // 添加成功，关闭添加界面
      showAddForm.value = false

      // 重新加载持仓数据
      await loadPositions()

      // 重置表单
      newPosition.value = {
        symbol: '',
        name: '',
        quantity: 0,
        buyPrice: 0,
        buyDate: new Date().toISOString().split('T')[0],
        lastPrice: 0,
        lastUpdate: new Date().toISOString(),
      }

      error.value = ''

      // 显示成功消息
      alert('添加持仓成功！')
    } else {
      error.value = '添加持仓失败，请稍后再试'
    }
  } catch (err) {
    console.error('添加持仓失败:', err)
    error.value = '添加持仓失败，请稍后再试'
  } finally {
    isLoading.value = false
  }
}

// 删除仓位
const removePosition = async (index: number) => {
  if (confirm('确定要删除这个持仓吗？')) {
    isLoading.value = true

    try {
      const position = positions.value[index]
      const portfolioStore = usePortfolioStore()

      // 查找持仓ID
      const holding = portfolioStore.holdings.find(
        (h: portfolioService.Holding) => h.stockCode === position.symbol
      )

      if (holding) {
        // 使用portfolioStore删除持仓
        await portfolioStore.deleteHolding(holding.id)

        // 重新加载持仓数据
        await loadPositions()
      } else {
        // 如果找不到持仓ID，直接从本地数组中删除
        positions.value.splice(index, 1)
      }
    } catch (err) {
      console.error('删除持仓失败:', err)
      error.value = '删除持仓失败，请稍后再试'
    } finally {
      isLoading.value = false
    }
  }
}

// 更新股票价格
const updatePrices = async () => {
  isLoading.value = true

  try {
    const portfolioStore = usePortfolioStore()

    for (let i = 0; i < positions.value.length; i++) {
      const position = positions.value[i]
      const stockData = await stockService.getStockData(position.symbol)

      if (stockData && stockData.prices.length > 0) {
        const newPrice = stockData.prices[stockData.prices.length - 1]

        // 更新本地状态
        positions.value[i] = {
          ...position,
          lastPrice: newPrice,
          lastUpdate: new Date().toISOString(),
        }

        // 更新数据库
        const holding = portfolioStore.holdings.find(
          (h: portfolioService.Holding) => h.stockCode === position.symbol
        )
        if (holding) {
          await portfolioStore.updateHolding(holding.id, {
            currentPrice: newPrice,
          })
        }
      }
    }
  } catch (err) {
    console.error('更新价格失败:', err)
    error.value = '更新价格失败，请稍后再试'
  } finally {
    isLoading.value = false
  }
}

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

// 初始化
onMounted(async () => {
  await loadPositions()
})
</script>

<template>
  <div class="portfolio-view">
    <h1>仓位管理</h1>

    <div class="portfolio-header">
      <div class="portfolio-summary">
        <div class="summary-item">
          <span class="label">总投资:</span>
          <span class="value">{{ totalInvestment.toFixed(2) }} 元</span>
        </div>
        <div class="summary-item">
          <span class="label">当前市值:</span>
          <span class="value">{{ currentValue.toFixed(2) }} 元</span>
        </div>
        <div class="summary-item">
          <span class="label">总收益:</span>
          <span class="value" :class="{ profit: totalProfit > 0, loss: totalProfit < 0 }">
            {{ totalProfit.toFixed(2) }} 元 ({{ profitPercentage.toFixed(2) }}%)
          </span>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn primary" @click="showAddForm = true">添加持仓</button>
        <button class="btn secondary" @click="updatePrices" :disabled="isLoading">
          {{ isLoading ? '更新中...' : '更新价格' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <!-- 添加持仓表单 -->
    <div v-if="showAddForm" class="add-position-form">
      <h2>添加新持仓</h2>

      <div class="form-group">
        <label>股票代码/名称</label>
        <div class="search-input-container">
          <input
            v-model="searchQuery"
            @input="searchStocks"
            @focus="showSearchResults = !!searchQuery"
            placeholder="搜索股票代码或名称"
            class="form-control"
          />
          <div v-if="showSearchResults" class="search-results">
            <div v-if="isSearching" class="searching">搜索中...</div>
            <div v-else-if="searchResults.length === 0" class="no-results">未找到相关股票</div>
            <div
              v-else
              v-for="stock in searchResults"
              :key="stock.symbol"
              class="search-result-item"
              @click="selectStock(stock)"
            >
              <span class="stock-symbol">{{ stock.symbol }}</span>
              <span class="stock-name">{{ stock.name }}</span>
              <span class="stock-market">{{ stock.market }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>股票代码</label>
          <input v-model="newPosition.symbol" class="form-control" readonly />
        </div>
        <div class="form-group">
          <label>股票名称</label>
          <input v-model="newPosition.name" class="form-control" readonly />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>买入数量</label>
          <input v-model.number="newPosition.quantity" type="number" min="1" class="form-control" />
        </div>
        <div class="form-group">
          <label>买入价格</label>
          <input
            v-model.number="newPosition.buyPrice"
            type="number"
            min="0"
            step="0.01"
            class="form-control"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>买入日期</label>
          <input v-model="newPosition.buyDate" type="date" class="form-control" />
        </div>
        <div class="form-group">
          <label>最新价格</label>
          <input
            v-model.number="newPosition.lastPrice"
            type="number"
            min="0"
            step="0.01"
            class="form-control"
          />
        </div>
      </div>

      <div class="form-group">
        <label>备注</label>
        <textarea v-model="newPosition.notes" class="form-control"></textarea>
      </div>

      <div class="form-actions">
        <button class="btn secondary" @click="showAddForm = false">取消</button>
        <button class="btn primary" @click="addPosition">添加</button>
      </div>
    </div>

    <!-- 持仓列表 -->
    <div class="positions-table-container">
      <table class="positions-table" v-if="positions.length > 0">
        <thead>
          <tr>
            <th>股票代码</th>
            <th>股票名称</th>
            <th>持仓数量</th>
            <th>买入价格</th>
            <th>买入日期</th>
            <th>最新价格</th>
            <th>持仓市值</th>
            <th>盈亏</th>
            <th>盈亏比例</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(position, index) in positions" :key="position.symbol">
            <td>{{ position.symbol }}</td>
            <td>{{ position.name }}</td>
            <td>{{ position.quantity }}</td>
            <td>{{ Number(position.buyPrice).toFixed(2) }}</td>
            <td>{{ formatDate(position.buyDate) }}</td>
            <td>{{ Number(position.lastPrice).toFixed(2) }}</td>
            <td>{{ (position.quantity * Number(position.lastPrice)).toFixed(2) }}</td>
            <td
              :class="{
                profit: Number(position.lastPrice) > Number(position.buyPrice),
                loss: Number(position.lastPrice) < Number(position.buyPrice),
              }"
            >
              {{
                (
                  (Number(position.lastPrice) - Number(position.buyPrice)) *
                  position.quantity
                ).toFixed(2)
              }}
            </td>
            <td
              :class="{
                profit: Number(position.lastPrice) > Number(position.buyPrice),
                loss: Number(position.lastPrice) < Number(position.buyPrice),
              }"
            >
              {{
                (
                  ((Number(position.lastPrice) - Number(position.buyPrice)) /
                    Number(position.buyPrice)) *
                  100
                ).toFixed(2)
              }}%
            </td>
            <td>
              <button class="btn-icon delete" @click="removePosition(index)" title="删除">
                <span>×</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="no-positions">
        <p>您还没有添加任何持仓</p>
        <button class="btn primary" @click="showAddForm = true">添加持仓</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.portfolio-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.portfolio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0;
  padding: 20px;
  background-color: #f8f8f8;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.portfolio-summary {
  display: flex;
  gap: 30px;
}

.summary-item {
  display: flex;
  flex-direction: column;
}

.label {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.value {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.profit {
  color: #4caf50;
}

.loss {
  color: #f44336;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.primary {
  background-color: #42b983;
  color: white;
}

.primary:hover {
  background-color: #3aa876;
}

.secondary {
  background-color: #e0e0e0;
  color: #333;
}

.secondary:hover {
  background-color: #d0d0d0;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  padding: 15px;
  background-color: #ffebee;
  color: #c62828;
  border-radius: 4px;
  margin: 20px 0;
  text-align: center;
}

.add-position-form {
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.form-group {
  margin-bottom: 15px;
}

.form-row {
  display: flex;
  gap: 20px;
}

.form-row .form-group {
  flex: 1;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
}

.form-control {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

textarea.form-control {
  min-height: 80px;
  resize: vertical;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.positions-table-container {
  margin-top: 30px;
  overflow-x: auto;
}

.positions-table {
  width: 100%;
  border-collapse: collapse;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

.positions-table th,
.positions-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.positions-table th {
  background-color: #f5f5f5;
  font-weight: 600;
  color: #333;
}

.positions-table tr:last-child td {
  border-bottom: none;
}

.positions-table tr:hover {
  background-color: #f9f9f9;
}

.btn-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.delete {
  background-color: #ffebee;
  color: #f44336;
}

.delete:hover {
  background-color: #ffcdd2;
}

.no-positions {
  text-align: center;
  padding: 50px 0;
  color: #666;
}

.search-input-container {
  position: relative;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.search-result-item {
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
}

.search-result-item:hover {
  background-color: #f5f5f5;
}

.search-result-item:last-child {
  border-bottom: none;
}

.stock-symbol {
  font-weight: bold;
  color: #333;
  margin-right: 10px;
}

.stock-name {
  flex: 1;
  color: #666;
}

.stock-market {
  color: #999;
  font-size: 0.9em;
}

.searching,
.no-results {
  padding: 12px 16px;
  color: #666;
  text-align: center;
}

@media (max-width: 768px) {
  .portfolio-header {
    flex-direction: column;
    gap: 20px;
  }

  .portfolio-summary {
    flex-direction: column;
    gap: 15px;
  }

  .form-row {
    flex-direction: column;
    gap: 15px;
  }
}
</style>
