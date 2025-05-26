<template>
  <div class="simple-stock-monitor">
    <!-- 标题栏 -->
    <div class="monitor-header">
      <span class="monitor-title">📈 股票监控</span>
      <div class="header-actions">
        <button @click="toggleMinimize" class="action-btn">
          {{ isMinimized ? '📖' : '📕' }}
        </button>
        <button @click="refreshData" class="action-btn" :disabled="isRefreshing">
          <span :class="{ rotating: isRefreshing }">🔄</span>
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="monitor-content" v-show="!isMinimized">
      <!-- 添加股票 -->
      <div class="add-stock-section">
        <input
          v-model="newStockCode"
          @keyup.enter="addStock"
          placeholder="输入股票代码"
          class="stock-input"
        />
        <button @click="addStock" class="add-btn">添加</button>
      </div>

      <!-- 股票列表 -->
      <div class="stocks-list">
        <div
          v-for="stock in watchlist"
          :key="stock.symbol"
          class="stock-item"
          :class="getStockClass(stock)"
        >
          <div class="stock-info">
            <div class="stock-symbol">{{ stock.symbol }}</div>
            <div class="stock-name">{{ stock.name }}</div>
          </div>
          <div class="stock-price">
            <div class="current-price">{{ stock.price }}</div>
            <div class="price-change" :class="getPriceChangeClass(stock.change)">
              {{ formatChange(stock.change) }}
            </div>
          </div>
          <button @click="removeStock(stock.symbol)" class="remove-btn">×</button>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="stats-bar" v-if="watchlist.length > 0">
        <span class="stat-item">
          涨: <span class="stat-value positive">{{ stats.up }}</span>
        </span>
        <span class="stat-item">
          跌: <span class="stat-value negative">{{ stats.down }}</span>
        </span>
        <span class="stat-item">
          平: <span class="stat-value neutral">{{ stats.flat }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// 响应式数据
const isMinimized = ref(false)
const isRefreshing = ref(false)
const newStockCode = ref('')

// 监控列表
const watchlist = ref([
  {
    symbol: '000001',
    name: '平安银行',
    price: 12.45,
    change: 0.23,
    changePercent: 1.88
  },
  {
    symbol: '600519',
    name: '贵州茅台',
    price: 1845.67,
    change: -15.33,
    changePercent: -0.82
  }
])

// 计算统计信息
const stats = computed(() => {
  const up = watchlist.value.filter(stock => stock.change > 0).length
  const down = watchlist.value.filter(stock => stock.change < 0).length
  const flat = watchlist.value.filter(stock => stock.change === 0).length
  return { up, down, flat }
})

// 方法
const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value
}

const refreshData = () => {
  isRefreshing.value = true
  // 模拟数据刷新
  setTimeout(() => {
    isRefreshing.value = false
  }, 1000)
}

const addStock = () => {
  if (!newStockCode.value.trim()) return
  
  // 检查是否已存在
  const exists = watchlist.value.find(stock => stock.symbol === newStockCode.value)
  if (exists) {
    alert('股票已在监控列表中')
    return
  }

  // 添加新股票
  watchlist.value.push({
    symbol: newStockCode.value,
    name: '新股票',
    price: 10.00,
    change: 0,
    changePercent: 0
  })
  
  newStockCode.value = ''
}

const removeStock = (symbol: string) => {
  const index = watchlist.value.findIndex(stock => stock.symbol === symbol)
  if (index > -1) {
    watchlist.value.splice(index, 1)
  }
}

const getStockClass = (stock: any) => {
  if (stock.change > 0) return 'rising'
  if (stock.change < 0) return 'falling'
  return 'neutral'
}

const getPriceChangeClass = (change: number) => {
  if (change > 0) return 'positive'
  if (change < 0) return 'negative'
  return 'neutral'
}

const formatChange = (change: number) => {
  if (change === 0) return '0.00'
  return (change > 0 ? '+' : '') + change.toFixed(2)
}
</script>

<style scoped>
.simple-stock-monitor {
  width: 280px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  overflow: hidden;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: linear-gradient(135deg, #1e3c72, #2a5298);
  color: white;
}

.monitor-title {
  font-weight: 600;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 4px;
  padding: 4px 6px;
  color: white;
  cursor: pointer;
  font-size: 12px;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.monitor-content {
  padding: 12px;
}

.add-stock-section {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.stock-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.add-btn {
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 14px;
}

.add-btn:hover {
  background: #369870;
}

.stocks-list {
  max-height: 300px;
  overflow-y: auto;
}

.stock-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.stock-item:hover {
  background: #f8f9fa;
}

.stock-item.rising {
  border-left: 3px solid #e74c3c;
}

.stock-item.falling {
  border-left: 3px solid #2ecc71;
}

.stock-info {
  flex: 1;
  min-width: 0;
}

.stock-symbol {
  font-weight: 600;
  color: #2c3e50;
  font-size: 13px;
}

.stock-name {
  font-size: 11px;
  color: #7f8c8d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stock-price {
  text-align: right;
  margin-right: 8px;
}

.current-price {
  font-weight: 600;
  color: #2c3e50;
  font-size: 13px;
}

.price-change {
  font-size: 11px;
}

.price-change.positive {
  color: #e74c3c;
}

.price-change.negative {
  color: #2ecc71;
}

.price-change.neutral {
  color: #7f8c8d;
}

.remove-btn {
  background: none;
  border: none;
  color: #bdc3c7;
  cursor: pointer;
  font-size: 16px;
  padding: 2px 4px;
}

.remove-btn:hover {
  color: #e74c3c;
}

.stats-bar {
  display: flex;
  justify-content: space-around;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  margin-top: 8px;
  font-size: 12px;
}

.stat-item {
  color: #7f8c8d;
}

.stat-value {
  font-weight: 600;
}

.stat-value.positive {
  color: #e74c3c;
}

.stat-value.negative {
  color: #2ecc71;
}

.stat-value.neutral {
  color: #7f8c8d;
}
</style>
