<template>
  <div class="realtime-monitor-view">
    <div class="monitor-header">
      <div class="header-left">
        <h1 class="page-title">
          <span class="title-icon">⚡</span>
          实时监控中心
        </h1>
        <div class="connection-status">
          <span
            class="status-dot"
            :class="{
              connected: realtimeService.isConnected.value,
              connecting: realtimeService.isConnecting.value,
              disconnected:
                !realtimeService.isConnected.value && !realtimeService.isConnecting.value,
            }"
          ></span>
          <span class="status-text">
            {{ getConnectionStatusText() }}
          </span>
        </div>
      </div>
      <div class="header-right">
        <el-button
          v-if="!realtimeService.isConnected.value"
          type="primary"
          @click="realtimeService.reconnect()"
          :loading="realtimeService.isConnecting.value"
        >
          重新连接
        </el-button>
        <el-button @click="realtimeService.clearAlerts()"> 清除警报 </el-button>
      </div>
    </div>

    <div class="monitor-content">
      <!-- 市场概况 -->
      <div class="market-summary-section">
        <div class="section-header">
          <h3>市场概况</h3>
          <div class="update-time">最后更新: {{ formatTime(lastUpdateTime) }}</div>
        </div>
        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-icon">📊</div>
            <div class="card-content">
              <div class="card-title">总成交量</div>
              <div class="card-value">{{ formatVolume(marketSummary.totalVolume) }}</div>
            </div>
          </div>
          <div class="summary-card positive">
            <div class="card-icon">📈</div>
            <div class="card-content">
              <div class="card-title">上涨家数</div>
              <div class="card-value">{{ marketSummary.advanceCount }}</div>
            </div>
          </div>
          <div class="summary-card negative">
            <div class="card-icon">📉</div>
            <div class="card-content">
              <div class="card-title">下跌家数</div>
              <div class="card-value">{{ marketSummary.declineCount }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon">⏸️</div>
            <div class="card-content">
              <div class="card-title">平盘家数</div>
              <div class="card-value">{{ marketSummary.unchangedCount }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 实时行情 -->
      <div class="realtime-quotes-section">
        <div class="section-header">
          <h3>实时行情</h3>
          <div class="quote-controls">
            <el-input
              v-model="searchSymbol"
              placeholder="输入股票代码"
              size="small"
              style="width: 150px"
              @keyup.enter="addSymbolToMonitor"
            >
              <template #append>
                <el-button @click="addSymbolToMonitor">添加</el-button>
              </template>
            </el-input>
          </div>
        </div>
        <div class="quotes-grid">
          <div
            v-for="(quote, symbol) in realtimeData"
            :key="symbol"
            class="quote-card"
            :class="getQuoteCardClass(quote)"
          >
            <div class="quote-header">
              <div class="symbol">{{ symbol }}</div>
              <div class="timestamp">{{ formatTime(quote.timestamp) }}</div>
            </div>
            <div class="quote-price">
              <div class="current-price">¥{{ quote.price.toFixed(2) }}</div>
              <div class="price-change" :class="quote.change >= 0 ? 'positive' : 'negative'">
                {{ quote.change >= 0 ? '+' : '' }}{{ quote.change.toFixed(2) }} ({{
                  quote.changePercent.toFixed(2)
                }}%)
              </div>
            </div>
            <div class="quote-details">
              <div class="detail-item">
                <span class="label">开盘:</span>
                <span class="value">{{ quote.open.toFixed(2) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">最高:</span>
                <span class="value">{{ quote.high.toFixed(2) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">最低:</span>
                <span class="value">{{ quote.low.toFixed(2) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">成交量:</span>
                <span class="value">{{ formatVolume(quote.volume) }}</span>
              </div>
            </div>
            <div class="quote-actions">
              <el-button size="small" @click="removeFromMonitor(symbol)"> 移除 </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 市场警报 -->
      <div class="market-alerts-section">
        <div class="section-header">
          <h3>市场警报</h3>
          <div class="alert-stats">
            <span class="alert-count">{{ marketAlerts.length }} 条警报</span>
          </div>
        </div>
        <div class="alerts-list">
          <div
            v-for="alert in marketAlerts"
            :key="alert.id"
            class="alert-item"
            :class="[alert.type, alert.level]"
          >
            <div class="alert-icon">{{ getAlertIcon(alert.type) }}</div>
            <div class="alert-content">
              <div class="alert-title">{{ alert.title }}</div>
              <div class="alert-message">{{ alert.message }}</div>
              <div class="alert-meta">
                <span class="alert-symbol">{{ alert.symbol }}</span>
                <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
              </div>
            </div>
            <div class="alert-actions">
              <el-button size="small" type="text" @click="realtimeService.removeAlert(alert.id)">
                ✕
              </el-button>
            </div>
          </div>
          <div v-if="marketAlerts.length === 0" class="no-alerts">
            <div class="no-alerts-icon">🔕</div>
            <div class="no-alerts-text">暂无警报</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { realtimeService } from '@/services/realtimeService'

// 响应式数据
const searchSymbol = ref('')
const lastUpdateTime = ref(Date.now())

// 从实时服务获取数据
const realtimeData = computed(() => realtimeService.realtimeData)
const marketAlerts = computed(() => realtimeService.marketAlerts.value)
const marketSummary = computed(() => realtimeService.marketSummary)

// 方法
const getConnectionStatusText = () => {
  if (realtimeService.isConnected.value) return '已连接'
  if (realtimeService.isConnecting.value) return '连接中...'
  return '未连接'
}

const addSymbolToMonitor = () => {
  if (searchSymbol.value.trim()) {
    realtimeService.subscribe(searchSymbol.value.trim())
    searchSymbol.value = ''
  }
}

const removeFromMonitor = (symbol: string) => {
  realtimeService.unsubscribe(symbol)
}

const getQuoteCardClass = (quote: any) => {
  if (quote.changePercent > 5) return 'strong-up'
  if (quote.changePercent > 0) return 'up'
  if (quote.changePercent < -5) return 'strong-down'
  if (quote.changePercent < 0) return 'down'
  return 'neutral'
}

const getAlertIcon = (type: string) => {
  const icons: Record<string, string> = {
    price: '💰',
    volume: '📊',
    technical: '📈',
    news: '📰',
  }
  return icons[type] || '⚠️'
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString()
}

const formatVolume = (volume: number) => {
  if (volume >= 100000000) return (volume / 100000000).toFixed(1) + '亿'
  if (volume >= 10000) return (volume / 10000).toFixed(1) + '万'
  return volume.toString()
}

// 生命周期
onMounted(() => {
  // 订阅一些默认股票
  const defaultSymbols = ['000001', '000002', '600036', '600519']
  defaultSymbols.forEach((symbol) => {
    realtimeService.subscribe(symbol)
  })

  // 定时更新时间
  const timer = setInterval(() => {
    lastUpdateTime.value = Date.now()
  }, 1000)

  onUnmounted(() => {
    clearInterval(timer)
  })
})
</script>

<style scoped>
.realtime-monitor-view {
  min-height: 100vh;
  background: var(--bg-secondary);
  padding: var(--spacing-lg);
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
  background: var(--bg-primary);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.page-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--primary-color);
}

.title-icon {
  font-size: 1.2em;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-dot.connected {
  background: var(--success-color);
}

.status-dot.connecting {
  background: var(--warning-color);
}

.status-dot.disconnected {
  background: var(--error-color);
}

.status-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.header-right {
  display: flex;
  gap: var(--spacing-md);
}

.monitor-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.section-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--primary-color);
}

.update-time {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.market-summary-section {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.summary-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
}

.summary-card.positive {
  border-color: var(--success-light);
  background: rgba(46, 204, 113, 0.05);
}

.summary-card.negative {
  border-color: var(--error-light);
  background: rgba(231, 76, 60, 0.05);
}

.card-icon {
  font-size: 2em;
}

.card-content {
  flex: 1;
}

.card-title {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.card-value {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.realtime-quotes-section {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
}

.quotes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-md);
}

.quote-card {
  background: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  border: 2px solid var(--border-light);
  transition: all var(--transition-normal);
}

.quote-card.up {
  border-color: var(--success-light);
  background: rgba(46, 204, 113, 0.05);
}

.quote-card.down {
  border-color: var(--error-light);
  background: rgba(231, 76, 60, 0.05);
}

.quote-card.strong-up {
  border-color: var(--success-color);
  background: rgba(46, 204, 113, 0.1);
}

.quote-card.strong-down {
  border-color: var(--error-color);
  background: rgba(231, 76, 60, 0.1);
}

.quote-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.symbol {
  font-weight: 700;
  color: var(--primary-color);
}

.timestamp {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.quote-price {
  margin-bottom: var(--spacing-md);
}

.current-price {
  font-size: var(--font-size-xl);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.price-change {
  font-size: var(--font-size-md);
  font-weight: 600;
}

.price-change.positive {
  color: var(--success-color);
}

.price-change.negative {
  color: var(--error-color);
}

.quote-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
}

.label {
  color: var(--text-secondary);
}

.value {
  color: var(--text-primary);
  font-weight: 500;
}

.market-alerts-section {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
}

.alert-count {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.alerts-list {
  max-height: 400px;
  overflow-y: auto;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
  transition: background var(--transition-fast);
}

.alert-item:hover {
  background: var(--bg-secondary);
}

.alert-item.critical {
  background: rgba(231, 76, 60, 0.05);
  border-left: 4px solid var(--error-color);
}

.alert-item.warning {
  background: rgba(243, 156, 18, 0.05);
  border-left: 4px solid var(--warning-color);
}

.alert-icon {
  font-size: 1.5em;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.alert-message {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.alert-meta {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.no-alerts {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--text-secondary);
}

.no-alerts-icon {
  font-size: 3em;
  margin-bottom: var(--spacing-md);
}

.no-alerts-text {
  font-size: var(--font-size-lg);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .monitor-header {
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .summary-cards {
    grid-template-columns: 1fr;
  }

  .quotes-grid {
    grid-template-columns: 1fr;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
