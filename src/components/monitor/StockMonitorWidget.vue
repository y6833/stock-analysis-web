<template>
  <div class="stock-monitor-widget" :class="{ minimized: isMinimized, floating: isFloating }">
    <!-- 标题栏 -->
    <div class="widget-header" @mousedown="startDrag">
      <div class="header-left">
        <span class="widget-icon">📈</span>
        <span class="widget-title">股票监控</span>
        <span class="stock-count">({{ watchlist.length }})</span>
      </div>
      <div class="header-controls">
        <button class="control-btn" @click="toggleSound" :class="{ active: soundEnabled }">
          <span>{{ soundEnabled ? '🔊' : '🔇' }}</span>
        </button>
        <button class="control-btn" @click="refreshData" :disabled="isRefreshing">
          <span :class="{ rotating: isRefreshing }">🔄</span>
        </button>
        <button class="control-btn" @click="toggleMinimize">
          <span>{{ isMinimized ? '📖' : '📕' }}</span>
        </button>
        <button class="control-btn" @click="toggleFloat">
          <span>{{ isFloating ? '📌' : '🎯' }}</span>
        </button>
        <button class="control-btn close-btn" @click="closeWidget">
          <span>✕</span>
        </button>
      </div>
    </div>

    <!-- 主要内容 -->
    <div class="widget-content" v-show="!isMinimized">
      <!-- 快速添加 -->
      <div class="quick-add-section">
        <div class="search-input-container">
          <UnifiedStockSearch
            placeholder="输入股票代码或名称"
            @select="onStockSelect"
            @clear="onStockClear"
          />
          <button @click="addSelectedStock" class="add-btn" :disabled="!selectedStock">
            <span>+</span>
          </button>
        </div>
      </div>

      <!-- 股票列表 -->
      <div class="stocks-list">
        <div
          v-for="stock in watchlist"
          :key="stock.symbol"
          class="stock-item"
          :class="getStockItemClass(stock)"
          @click="viewStockDetail(stock)"
        >
          <div class="stock-info">
            <div class="stock-header">
              <span class="stock-symbol">{{ stock.symbol }}</span>
              <button @click.stop="removeStock(stock.symbol)" class="remove-btn">
                <span>✕</span>
              </button>
            </div>
            <div class="stock-name">{{ stock.name }}</div>
          </div>

          <div class="stock-price">
            <div class="current-price">{{ formatPrice(stock.price) }}</div>
            <div class="price-change" :class="getPriceChangeClass(stock.change)">
              <span class="change-amount">{{ formatChange(stock.change) }}</span>
              <span class="change-percent">{{ formatPercent(stock.changePercent) }}</span>
            </div>
          </div>

          <div class="stock-actions">
            <button
              @click.stop="setAlert(stock)"
              class="action-btn"
              :class="{ active: stock.hasAlert }"
            >
              <span>🔔</span>
            </button>
            <button
              @click.stop="toggleFavorite(stock)"
              class="action-btn"
              :class="{ active: stock.isFavorite }"
            >
              <span>{{ stock.isFavorite ? '⭐' : '☆' }}</span>
            </button>
          </div>
        </div>

        <div v-if="watchlist.length === 0" class="empty-state">
          <div class="empty-icon">📊</div>
          <div class="empty-text">暂无监控股票</div>
          <div class="empty-hint">输入股票代码添加监控</div>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="stats-section" v-if="watchlist.length > 0">
        <div class="stat-item">
          <span class="stat-label">涨:</span>
          <span class="stat-value positive">{{ stats.rising }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">跌:</span>
          <span class="stat-value negative">{{ stats.falling }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">平:</span>
          <span class="stat-value neutral">{{ stats.unchanged }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">更新:</span>
          <span class="stat-value">{{ lastUpdateTime }}</span>
        </div>
      </div>
    </div>

    <!-- 价格提醒设置弹窗 -->
    <div class="alert-modal" v-if="showAlertModal" @click.self="closeAlertModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>设置价格提醒</h3>
          <button @click="closeAlertModal" class="close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="alert-form">
            <div class="form-group">
              <label>股票:</label>
              <span class="stock-info"
                >{{ selectedStock?.symbol }} - {{ selectedStock?.name }}</span
              >
            </div>
            <div class="form-group">
              <label>当前价格:</label>
              <span class="current-price">{{ formatPrice(selectedStock?.price) }}</span>
            </div>
            <div class="form-group">
              <label>提醒类型:</label>
              <select v-model="alertForm.type">
                <option value="price_above">价格高于</option>
                <option value="price_below">价格低于</option>
                <option value="change_above">涨幅超过</option>
                <option value="change_below">跌幅超过</option>
              </select>
            </div>
            <div class="form-group">
              <label>目标值:</label>
              <input
                v-model="alertForm.value"
                type="number"
                step="0.01"
                :placeholder="getAlertPlaceholder()"
              />
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="alertForm.soundEnabled" />
                声音提醒
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="saveAlert" class="btn btn-primary">保存提醒</button>
          <button @click="closeAlertModal" class="btn btn-secondary">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import UnifiedStockSearch from '@/components/common/UnifiedStockSearch.vue'
import type { Stock } from '@/types/stock'

const router = useRouter()

// 响应式数据
const isMinimized = ref(false)
const isFloating = ref(false)
const soundEnabled = ref(true)
const isRefreshing = ref(false)
const lastUpdateTime = ref('')
const showAlertModal = ref(false)
const selectedStock = ref<Stock | null>(null)

// 拖拽相关
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

// 监控列表
const watchlist = ref([
  {
    symbol: '000001',
    name: '平安银行',
    price: 12.45,
    change: 0.23,
    changePercent: 1.88,
    hasAlert: false,
    isFavorite: true,
    lastPrice: 12.22,
  },
  {
    symbol: '600519',
    name: '贵州茅台',
    price: 1845.67,
    change: -15.33,
    changePercent: -0.82,
    hasAlert: true,
    isFavorite: false,
    lastPrice: 1861.0,
  },
])

// 提醒表单
const alertForm = ref({
  type: 'price_above',
  value: '',
  soundEnabled: true,
})

// 计算属性
const stats = computed(() => {
  const rising = watchlist.value.filter((stock) => stock.change > 0).length
  const falling = watchlist.value.filter((stock) => stock.change < 0).length
  const unchanged = watchlist.value.filter((stock) => stock.change === 0).length
  return { rising, falling, unchanged }
})

// 方法
const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value
}

const toggleFloat = () => {
  isFloating.value = !isFloating.value
  if (isFloating.value) {
    // 设置为浮动窗口
    document.body.style.position = 'relative'
  }
}

const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value
}

const closeWidget = () => {
  // 关闭组件的逻辑
  console.log('关闭监控组件')
}

const refreshData = async () => {
  isRefreshing.value = true
  // 模拟数据刷新
  setTimeout(() => {
    isRefreshing.value = false
    lastUpdateTime.value = new Date().toLocaleTimeString()
  }, 1000)
}

// 新搜索组件的事件处理
const onStockSelect = (stock: Stock) => {
  selectedStock.value = stock
}

const onStockClear = () => {
  selectedStock.value = null
}

const addSelectedStock = () => {
  if (!selectedStock.value) return

  // 检查是否已存在
  const exists = watchlist.value.find((item) => item.symbol === selectedStock.value!.symbol)
  if (exists) {
    alert('股票已在监控列表中')
    return
  }

  // 添加新股票
  const newStock = {
    symbol: selectedStock.value.symbol || selectedStock.value.tsCode,
    name: selectedStock.value.name,
    price: 10.0, // 这里应该调用API获取真实价格
    change: 0,
    changePercent: 0,
    hasAlert: false,
    isFavorite: false,
    lastPrice: 10.0,
  }

  watchlist.value.push(newStock)
  selectedStock.value = null
}

const removeStock = (symbol) => {
  const index = watchlist.value.findIndex((stock) => stock.symbol === symbol)
  if (index > -1) {
    watchlist.value.splice(index, 1)
  }
}

const setAlert = (stock) => {
  selectedStock.value = stock
  showAlertModal.value = true
}

const closeAlertModal = () => {
  showAlertModal.value = false
  selectedStock.value = null
}

const saveAlert = () => {
  if (selectedStock.value) {
    selectedStock.value.hasAlert = true
    // 这里应该保存提醒设置到后端
    console.log('保存提醒:', alertForm.value)
  }
  closeAlertModal()
}

const toggleFavorite = (stock) => {
  stock.isFavorite = !stock.isFavorite
}

const viewStockDetail = (stock) => {
  router.push({
    path: '/stock',
    query: { symbol: stock.symbol },
  })
}

const getStockItemClass = (stock) => {
  const classes = []
  if (stock.change > 0) classes.push('rising')
  else if (stock.change < 0) classes.push('falling')
  if (stock.isFavorite) classes.push('favorite')
  return classes
}

const getPriceChangeClass = (change) => {
  if (change > 0) return 'positive'
  if (change < 0) return 'negative'
  return 'neutral'
}

const formatPrice = (price) => {
  return price?.toFixed(2) || '0.00'
}

const formatChange = (change) => {
  if (!change) return '0.00'
  return (change > 0 ? '+' : '') + change.toFixed(2)
}

const formatPercent = (percent) => {
  if (!percent) return '0.00%'
  return (percent > 0 ? '+' : '') + percent.toFixed(2) + '%'
}

const getAlertPlaceholder = () => {
  if (alertForm.value.type.includes('price')) {
    return '输入价格'
  }
  return '输入百分比'
}

// 拖拽功能
const startDrag = (e) => {
  if (!isFloating.value) return

  isDragging.value = true
  const rect = e.currentTarget.parentElement.getBoundingClientRect()
  dragOffset.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
  if (!isDragging.value) return

  const widget = document.querySelector('.stock-monitor-widget')
  if (widget) {
    widget.style.left = e.clientX - dragOffset.value.x + 'px'
    widget.style.top = e.clientY - dragOffset.value.y + 'px'
  }
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 生命周期
onMounted(() => {
  // 定时刷新数据
  const timer = setInterval(() => {
    if (!isRefreshing.value) {
      refreshData()
    }
  }, 30000) // 30秒刷新一次

  onUnmounted(() => {
    clearInterval(timer)
  })
})
</script>

<style scoped>
.stock-monitor-widget {
  width: 320px;
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-light);
  font-size: 14px;
  user-select: none;
  transition: all var(--transition-normal);
}

.stock-monitor-widget.floating {
  position: fixed;
  top: 100px;
  right: 20px;
  z-index: 1000;
  resize: both;
  overflow: auto;
}

.stock-monitor-widget.minimized {
  height: 40px;
  overflow: hidden;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  color: white;
  border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
  cursor: move;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.widget-icon {
  font-size: 1.2em;
}

.widget-title {
  font-weight: 600;
}

.stock-count {
  opacity: 0.8;
  font-size: 0.9em;
}

.header-controls {
  display: flex;
  gap: var(--spacing-xs);
}

.control-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: var(--border-radius-sm);
  padding: 4px 6px;
  color: white;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.control-btn.active {
  background: rgba(255, 255, 255, 0.4);
}

.close-btn:hover {
  background: rgba(231, 76, 60, 0.8);
}

.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.widget-content {
  padding: var(--spacing-md);
}

.quick-add-section {
  margin-bottom: var(--spacing-md);
  position: relative;
}

.search-input-container {
  display: flex;
  gap: var(--spacing-xs);
}

.search-input {
  flex: 1;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-sm);
  font-size: 14px;
}

.add-btn {
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  font-weight: 600;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-sm);
  box-shadow: var(--shadow-md);
  z-index: 10;
  max-height: 150px;
  overflow-y: auto;
}

.suggestion-item {
  padding: var(--spacing-sm);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  transition: background var(--transition-fast);
}

.suggestion-item:hover {
  background: var(--bg-secondary);
}

.suggestion-symbol {
  font-weight: 600;
  color: var(--primary-color);
}

.suggestion-name {
  color: var(--text-secondary);
}

.stocks-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: var(--spacing-md);
}

.stock-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm);
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.stock-item:hover {
  background: var(--bg-secondary);
}

.stock-item.rising {
  border-left: 3px solid var(--success-color);
}

.stock-item.falling {
  border-left: 3px solid var(--error-color);
}

.stock-item.favorite {
  background: rgba(255, 215, 0, 0.1);
}

.stock-info {
  flex: 1;
  min-width: 0;
}

.stock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stock-symbol {
  font-weight: 600;
  color: var(--primary-color);
}

.remove-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.stock-item:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  color: var(--error-color);
}

.stock-name {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stock-price {
  text-align: right;
  margin: 0 var(--spacing-sm);
}

.current-price {
  font-weight: 600;
  color: var(--text-primary);
}

.price-change {
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.price-change.positive {
  color: var(--success-color);
}

.price-change.negative {
  color: var(--error-color);
}

.price-change.neutral {
  color: var(--text-secondary);
}

.stock-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: var(--border-radius-sm);
  transition: background var(--transition-fast);
}

.action-btn:hover {
  background: var(--bg-secondary);
}

.action-btn.active {
  background: var(--accent-light);
  color: var(--accent-color);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 2em;
  margin-bottom: var(--spacing-sm);
}

.empty-text {
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
}

.empty-hint {
  font-size: 12px;
  opacity: 0.8;
}

.stats-section {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-sm);
  background: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  font-size: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-label {
  color: var(--text-secondary);
}

.stat-value {
  font-weight: 600;
}

.stat-value.positive {
  color: var(--success-color);
}

.stat-value.negative {
  color: var(--error-color);
}

.stat-value.neutral {
  color: var(--text-secondary);
}

/* 提醒弹窗样式 */
.alert-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  width: 400px;
  max-width: 90vw;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-light);
}

.modal-header h3 {
  margin: 0;
  color: var(--primary-color);
}

.modal-body {
  padding: var(--spacing-lg);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-weight: 600;
  color: var(--text-primary);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-sm);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border-light);
}

.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-weight: 600;
}

.btn-primary {
  background: var(--accent-color);
  color: white;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}
</style>
