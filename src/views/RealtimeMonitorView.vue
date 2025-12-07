<template>
  <div class="realtime-monitor-view">
    <div class="monitor-header">
      <div class="header-left">
        <h1 class="page-title">
          <span class="title-icon">⚡</span>
          实时监控中心
        </h1>
        <div class="connection-status">
          <span class="status-dot" :class="{
            connected: isConnected,
            connecting: isConnecting,
            disconnected: !isConnected && !isConnecting,
          }"></span>
          <span class="status-text">
            {{ getConnectionStatusText() }}
          </span>
        </div>
      </div>
      <div class="header-right">
        <el-button v-if="!isConnected" type="primary" @click="reconnect()"
          :loading="isConnecting">
          重新连接
        </el-button>
        <el-button @click="clearAlerts()"> 清除警报 </el-button>
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
            <el-input v-model="searchSymbol" placeholder="输入股票代码" size="small" style="width: 150px"
              @keyup.enter="addSymbolToMonitor">
              <template #append>
                <el-button @click="addSymbolToMonitor">添加</el-button>
              </template>
            </el-input>
          </div>
        </div>
        <div class="quotes-grid">
          <div v-if="realtimeData.length === 0" class="empty-state">
            <div class="empty-icon">📊</div>
            <div class="empty-text">暂无实时行情数据</div>
            <div class="empty-hint">请添加股票代码以查看实时行情</div>
          </div>
          <div v-for="quote in realtimeData" :key="quote.symbol" class="quote-card"
            :class="getQuoteCardClass(quote)">
            <div class="quote-header">
              <div class="symbol">{{ quote.symbol }}</div>
              <div class="timestamp">{{ formatTime(quote.timestamp) }}</div>
            </div>
            <div class="quote-price">
              <div class="current-price">¥{{ formatPrice(quote.price) }}</div>
              <div class="price-change" :class="getChangeClass(quote.change)">
                {{ formatChange(quote.change, quote.changePercent) }}
              </div>
            </div>
            <div class="quote-details">
              <div class="detail-item">
                <span class="label">开盘:</span>
                <span class="value">{{ formatPrice(quote.open) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">最高:</span>
                <span class="value">{{ formatPrice(quote.high) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">最低:</span>
                <span class="value">{{ formatPrice(quote.low) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">成交量:</span>
                <span class="value">{{ formatVolume(quote.volume) }}</span>
              </div>
            </div>
            <div class="quote-actions">
              <el-button size="small" @click="removeFromMonitor(quote.symbol)"> 移除 </el-button>
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
          <div v-for="alert in marketAlerts" :key="alert.id" class="alert-item" :class="[alert.type || 'default', alert.level || 'info']">
            <div class="alert-icon">{{ getAlertIcon(alert.type || 'default') }}</div>
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
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { stockService } from '@/services/stockService'
import type { StockQuote } from '@/types/stock'

// 定义实时行情数据接口
interface RealtimeQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  timestamp: number
  high: number
  low: number
  open: number
}

// 响应式数据
const searchSymbol = ref('')
const lastUpdateTime = ref(Date.now())
const isConnected = ref(false)
const isConnecting = ref(false)
const connectionError = ref<string | null>(null)

// 实时数据存储
const realtimeDataMap = reactive(new Map<string, RealtimeQuote>())
const marketAlerts = ref<any[]>([])
const marketSummary = reactive({
  totalStocks: 5200,
  advancing: 2340,
  declining: 2180,
  unchanged: 680,
  totalVolume: 850000000000,
  totalTurnover: 1250000000000
})

// 将 Map 转换为数组供模板使用
const realtimeData = computed(() => {
  return Array.from(realtimeDataMap.entries()).map(([symbol, quote]) => ({
    symbol,
    ...quote
  }))
})

// 订阅列表和更新定时器
const subscriptions = new Set<string>()
const updateIntervals = new Map<string, NodeJS.Timeout>()

// 请求防抖和去重
const pendingRequests = new Set<string>()
const requestQueue: string[] = []
let isProcessingQueue = false
const REQUEST_INTERVAL = 15000 // 15秒更新一次
const BATCH_DELAY = 500 // 批量请求间隔500ms

// 方法
const getConnectionStatusText = () => {
  if (isConnected.value) return '已连接'
  if (isConnecting.value) return '连接中...'
  if (connectionError.value) return `连接错误: ${connectionError.value}`
  return '未连接'
}

// 连接服务
const connect = async () => {
  if (isConnected.value || isConnecting.value) return
  
  isConnecting.value = true
  connectionError.value = null
  
  try {
    // 模拟连接延迟
    await new Promise(resolve => setTimeout(resolve, 500))
    isConnected.value = true
    console.log('实时监控服务已连接')
  } catch (error) {
    connectionError.value = error instanceof Error ? error.message : '连接失败'
    isConnected.value = false
  } finally {
    isConnecting.value = false
  }
}

// 重新连接
const reconnect = async () => {
  disconnect()
  await connect()
}

// 断开连接
const disconnect = () => {
  isConnected.value = false
  isConnecting.value = false
  updateIntervals.forEach(interval => clearInterval(interval))
  updateIntervals.clear()
  subscriptions.clear()
  console.log('实时监控服务已断开')
}

// 清除警报
const clearAlerts = () => {
  marketAlerts.value = []
}

// 添加股票到监控列表
const addSymbolToMonitor = async () => {
  const symbol = searchSymbol.value.trim()
  if (!symbol) return
  
  // 格式化股票代码
  const formattedSymbol = formatSymbol(symbol)
  
  if (subscriptions.has(formattedSymbol)) {
    console.log(`股票 ${formattedSymbol} 已在监控列表中`)
    searchSymbol.value = ''
    return
}

  subscriptions.add(formattedSymbol)
  searchSymbol.value = ''
  
  // 延迟获取，避免立即请求
  setTimeout(() => {
    fetchStockQuote(formattedSymbol)
  }, 100)
  
  // 设置定时更新（每15秒更新一次，降低请求频率）
  const interval = setInterval(() => {
    fetchStockQuote(formattedSymbol)
  }, REQUEST_INTERVAL)
  
  updateIntervals.set(formattedSymbol, interval)
  console.log(`已添加股票 ${formattedSymbol} 到监控列表`)
}

// 从监控列表移除股票
const removeFromMonitor = (symbol: string) => {
  subscriptions.delete(symbol)
  realtimeDataMap.delete(symbol)
  
  const interval = updateIntervals.get(symbol)
  if (interval) {
    clearInterval(interval)
    updateIntervals.delete(symbol)
  }
  
  console.log(`已从监控列表移除股票 ${symbol}`)
}

// 格式化股票代码（添加市场后缀）
const formatSymbol = (symbol: string): string => {
  // 如果已经包含.SH或.SZ后缀，直接返回
  if (symbol.includes('.')) {
    return symbol
  }
  
  // 根据股票代码规则添加后缀
  if (symbol.startsWith('6')) {
    return `${symbol}.SH` // 上海
  } else if (symbol.startsWith('0') || symbol.startsWith('3')) {
    return `${symbol}.SZ` // 深圳
  } else if (symbol.startsWith('4') || symbol.startsWith('8')) {
    return `${symbol}.BJ` // 北交所
  }
  
  // 默认返回原始代码
  return symbol
}

// 批量获取股票行情数据
const fetchStockQuotesBatch = async (symbols: string[]) => {
  if (symbols.length === 0) return
  
  // 去重
  const uniqueSymbols = Array.from(new Set(symbols))
  
  // 批量获取，添加延迟避免同时请求
  for (let i = 0; i < uniqueSymbols.length; i++) {
    const symbol = uniqueSymbols[i]
    setTimeout(() => {
      fetchStockQuote(symbol)
    }, i * BATCH_DELAY)
  }
}

// 获取股票行情数据（带防抖和去重）
const fetchStockQuote = async (symbol: string) => {
  // 格式化股票代码
  const formattedSymbol = formatSymbol(symbol)
  
  // 防抖：如果该股票正在请求中，跳过
  if (pendingRequests.has(formattedSymbol)) {
    console.log(`股票 ${formattedSymbol} 正在请求中，跳过重复请求`)
    return
  }
  
  try {
    pendingRequests.add(formattedSymbol)
    
    const quote = await stockService.getStockQuote(formattedSymbol)
    
    if (quote) {
      // 检查是否是假数据（更全面的检测）
      const isFakeData = 
        quote.data_source === 'sample' || 
        quote.data_source === 'mock' ||
        quote.data_source === 'mock_data' ||
        quote.source_type === 'sample' ||
        quote.data_source_message?.includes('示例数据') ||
        quote.data_source_message?.includes('模拟数据') ||
        quote.data_source_message?.includes('sample') ||
        quote.data_source_message?.includes('mock')
      
      if (isFakeData) {
        console.warn(`❌ 股票 ${formattedSymbol} 返回的是假数据，拒绝显示:`, {
          data_source: quote.data_source,
          message: quote.data_source_message
        })
        // 移除假数据
        removeInvalidStock(symbol)
        return
      }
      
      // 转换为 RealtimeQuote 格式
      const realtimeQuote: RealtimeQuote = {
        symbol: quote.symbol || formattedSymbol,
        name: quote.name || formattedSymbol,
        price: quote.price || 0,
        change: quote.change || 0,
        changePercent: quote.changePercent || quote.pct_chg || 0,
        volume: quote.volume || quote.vol || 0,
        timestamp: quote.timestamp || Date.now(),
        high: quote.high || quote.price || 0,
        low: quote.low || quote.price || 0,
        open: quote.open || quote.price || 0
      }
      
      // 验证数据是否有效（价格不能为0，除非是特殊情况）
      if (realtimeQuote.price === 0 && realtimeQuote.volume === 0) {
        console.warn(`股票 ${formattedSymbol} 数据无效（价格为0且成交量为0），跳过更新`)
        removeInvalidStock(symbol)
        return
      }
      
      // 数据合理性验证：检查是否与其他股票数据完全相同（可能是假数据）
      const existingQuotes = Array.from(realtimeDataMap.values())
      const duplicateData = existingQuotes.find(q => 
        q.symbol !== realtimeQuote.symbol &&
        Math.abs(q.price - realtimeQuote.price) < 0.01 &&
        Math.abs(q.change - realtimeQuote.change) < 0.01 &&
        Math.abs(q.changePercent - realtimeQuote.changePercent) < 0.01 &&
        Math.abs(q.volume - realtimeQuote.volume) < 1000
      )
      
      if (duplicateData) {
        console.warn(`❌ 股票 ${formattedSymbol} 的数据与其他股票(${duplicateData.symbol})完全相同，疑似假数据，拒绝显示:`, {
          price: realtimeQuote.price,
          change: realtimeQuote.change,
          changePercent: realtimeQuote.changePercent,
          volume: realtimeQuote.volume
        })
        removeInvalidStock(symbol)
        return
      }
      
      // 验证数据合理性：不同股票不应该有完全相同的数据
      // 如果价格、涨跌、成交量都完全相同，很可能是假数据
      const suspiciousPattern = existingQuotes.filter(q => 
        q.symbol !== realtimeQuote.symbol &&
        q.price === realtimeQuote.price &&
        q.change === realtimeQuote.change &&
        q.volume === realtimeQuote.volume
      )
      
      if (suspiciousPattern.length > 0) {
        console.warn(`❌ 检测到股票 ${formattedSymbol} 的数据与 ${suspiciousPattern.length} 只其他股票完全相同，疑似假数据，拒绝显示`)
        removeInvalidStock(symbol)
        return
      }
      
      // 更新最高价和最低价
      const existing = realtimeDataMap.get(symbol)
      if (existing) {
        realtimeQuote.high = Math.max(existing.high || 0, realtimeQuote.price)
        realtimeQuote.low = existing.low === 0 ? realtimeQuote.price : Math.min(existing.low, realtimeQuote.price)
      }
      
      realtimeDataMap.set(symbol, realtimeQuote)
      console.log(`✅ 成功获取股票 ${formattedSymbol} 的真实数据:`, {
        name: realtimeQuote.name,
        price: realtimeQuote.price,
        change: realtimeQuote.change,
        data_source: quote.data_source
      })
    } else {
      console.warn(`股票 ${formattedSymbol} 返回数据为空`)
      removeInvalidStock(symbol)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    console.error(`❌ 获取股票 ${symbol} 行情失败:`, errorMessage)
    // 如果获取失败，移除无效数据
    removeInvalidStock(symbol)
  } finally {
    // 移除请求标记
    pendingRequests.delete(formattedSymbol)
  }
}

// 移除无效股票（辅助函数）
const removeInvalidStock = (symbol: string) => {
  const existing = realtimeDataMap.get(symbol)
  // 如果没有现有数据或数据无效，移除该股票
  if (!existing || existing.price === 0) {
    realtimeDataMap.delete(symbol)
    subscriptions.delete(symbol)
    const interval = updateIntervals.get(symbol)
    if (interval) {
      clearInterval(interval)
      updateIntervals.delete(symbol)
    }
    console.log(`已移除无效股票 ${symbol}`)
  }
}

const getQuoteCardClass = (quote: any) => {
  if (quote.changePercent > 5) return 'strong-up'
  if (quote.changePercent > 0) return 'up'
  if (quote.changePercent < -5) return 'strong-down'
  if (quote.changePercent < 0) return 'down'
  return 'neutral'
}

const getAlertIcon = (type: string | undefined | null): string => {
  if (!type) return '⚠️'
  const icons: Record<string, string> = {
    price: '💰',
    volume: '📊',
    technical: '📈',
    news: '📰',
    default: '⚠️'
  }
  return icons[type] || '⚠️'
}

const formatTime = (timestamp: number | undefined | null): string => {
  if (!timestamp || isNaN(timestamp)) {
    return '--'
  }
  try {
  return new Date(timestamp).toLocaleTimeString()
  } catch (error) {
    return '--'
  }
}

// 格式化价格
const formatPrice = (price: number | undefined | null): string => {
  if (price === undefined || price === null || isNaN(price)) {
    return '--'
  }
  return price.toFixed(2)
}

// 格式化涨跌
const formatChange = (change: number | undefined | null, changePercent: number | undefined | null): string => {
  if (change === undefined || change === null || isNaN(change)) {
    return '--'
  }
  const sign = change >= 0 ? '+' : ''
  const changeStr = `${sign}${change.toFixed(2)}`
  const percentStr = changePercent !== undefined && changePercent !== null && !isNaN(changePercent)
    ? ` (${sign}${changePercent.toFixed(2)}%)`
    : ''
  return `${changeStr}${percentStr}`
}

// 获取涨跌颜色类
const getChangeClass = (change: number | undefined | null): string => {
  if (change === undefined || change === null || isNaN(change)) {
    return ''
  }
  return change >= 0 ? 'positive' : 'negative'
}

const formatVolume = (volume: number | undefined | null): string => {
  if (volume === undefined || volume === null || isNaN(volume)) {
    return '--'
  }
  if (volume >= 100000000) return (volume / 100000000).toFixed(1) + '亿'
  if (volume >= 10000) return (volume / 10000).toFixed(1) + '万'
  return volume.toString()
}

// 生命周期
onMounted(async () => {
  // 连接服务
  await connect()
  
  // 订阅一些默认股票（使用完整格式）
  const defaultSymbols = ['000001.SZ', '000002.SZ', '600036.SH', '600519.SH']
  
  // 批量添加订阅
  for (const symbol of defaultSymbols) {
    if (!subscriptions.has(symbol)) {
      subscriptions.add(symbol)
    }
  }
  
  // 批量获取初始数据，添加延迟避免同时请求
  defaultSymbols.forEach((symbol, index) => {
    // 延迟请求，避免同时发起（每个请求间隔500ms）
    setTimeout(() => {
      fetchStockQuote(symbol)
    }, index * BATCH_DELAY)
    
    // 设置定时更新（每15秒更新一次，降低请求频率）
    const interval = setInterval(() => {
      fetchStockQuote(symbol)
    }, REQUEST_INTERVAL)
    
    updateIntervals.set(symbol, interval)
  })

  // 定时更新时间
  const timer = setInterval(() => {
    lastUpdateTime.value = Date.now()
  }, 1000)

  onUnmounted(() => {
    clearInterval(timer)
    disconnect()
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

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 4em;
  margin-bottom: var(--spacing-md);
  opacity: 0.5;
}

.empty-text {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
  color: var(--text-primary);
}

.empty-hint {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
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
