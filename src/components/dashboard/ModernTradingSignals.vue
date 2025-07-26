<template>
  <div class="modern-trading-signals">
    <div class="widget-header">
      <h3 class="widget-title">
        <el-icon class="title-icon"><Bell /></el-icon>
        交易信号
      </h3>
      <div class="header-actions">
        <el-button
          size="small"
          :icon="Refresh"
          :loading="loading"
          @click="$emit('refresh')"
          circle
        />
      </div>
    </div>

    <div class="widget-content">
      <!-- Loading State -->
      <div v-if="loading && signals.length === 0" class="loading-state">
        <el-skeleton :rows="3" animated />
      </div>

      <!-- Empty State -->
      <div v-else-if="signals.length === 0" class="empty-state">
        <el-empty description="暂无交易信号" />
      </div>

      <!-- Signals List -->
      <div v-else class="signals-list">
        <div
          v-for="signal in signals"
          :key="signal.id"
          class="signal-item"
          :class="getSignalClass(signal.type)"
          @click="$emit('signal-click', signal)"
        >
          <div class="signal-icon">
            <el-icon v-if="signal.type === 'buy'"><CaretTop /></el-icon>
            <el-icon v-else-if="signal.type === 'sell'"><CaretBottom /></el-icon>
            <el-icon v-else><Minus /></el-icon>
          </div>
          
          <div class="signal-content">
            <div class="signal-header">
              <span class="signal-stock">{{ signal.stockName }}</span>
              <span class="signal-code">{{ signal.stockCode }}</span>
              <el-tag
                :type="getSignalTagType(signal.type)"
                size="small"
              >
                {{ getSignalText(signal.type) }}
              </el-tag>
            </div>
            
            <div class="signal-details">
              <span class="signal-price">价格: ¥{{ signal.price }}</span>
              <span class="signal-strategy">策略: {{ signal.strategy }}</span>
            </div>
            
            <div class="signal-meta">
              <span class="signal-time">{{ formatTime(signal.timestamp) }}</span>
              <span class="signal-confidence">
                置信度: {{ signal.confidence }}%
              </span>
            </div>
          </div>
          
          <div class="signal-arrow">
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Bell, Refresh, CaretTop, CaretBottom, Minus, ArrowRight } from '@element-plus/icons-vue'

// Props
interface TradingSignal {
  id: string
  stockName: string
  stockCode: string
  type: 'buy' | 'sell' | 'hold'
  price: number
  strategy: string
  confidence: number
  timestamp: string
}

interface Props {
  signals: TradingSignal[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
defineEmits<{
  'signal-click': [signal: TradingSignal]
  refresh: []
}>()

// 格式化时间
const formatTime = (timeStr: string) => {
  const time = new Date(timeStr)
  return time.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取信号样式类
const getSignalClass = (type: string) => ({
  'signal-buy': type === 'buy',
  'signal-sell': type === 'sell',
  'signal-hold': type === 'hold'
})

// 获取信号标签类型
const getSignalTagType = (type: string) => {
  const typeMap: Record<string, string> = {
    'buy': 'success',
    'sell': 'danger',
    'hold': 'warning'
  }
  return typeMap[type] || 'info'
}

// 获取信号文本
const getSignalText = (type: string) => {
  const textMap: Record<string, string> = {
    'buy': '买入',
    'sell': '卖出',
    'hold': '持有'
  }
  return textMap[type] || '未知'
}
</script>

<style scoped>
.modern-trading-signals {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.widget-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  color: var(--el-text-color-primary);
}

.title-icon {
  color: var(--color-warning);
}

.widget-content {
  flex: 1;
  padding: var(--spacing-lg);
  overflow-y: auto;
}

.loading-state,
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.signals-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.signal-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--el-border-color-light);
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--el-bg-color);
}

.signal-item:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.signal-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 20px;
  color: white;
}

.signal-buy .signal-icon {
  background: var(--color-success);
}

.signal-sell .signal-icon {
  background: var(--color-danger);
}

.signal-hold .signal-icon {
  background: var(--color-warning);
}

.signal-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.signal-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.signal-stock {
  font-weight: var(--font-weight-medium);
  color: var(--el-text-color-primary);
}

.signal-code {
  font-size: var(--font-size-sm);
  color: var(--el-text-color-regular);
}

.signal-details {
  display: flex;
  gap: var(--spacing-lg);
  font-size: var(--font-size-sm);
  color: var(--el-text-color-regular);
}

.signal-price {
  font-weight: var(--font-weight-medium);
  color: var(--el-text-color-primary);
}

.signal-meta {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
  color: var(--el-text-color-placeholder);
}

.signal-confidence {
  font-weight: var(--font-weight-medium);
}

.signal-arrow {
  color: var(--el-text-color-placeholder);
  transition: all 0.3s ease;
}

.signal-item:hover .signal-arrow {
  color: var(--color-primary);
  transform: translateX(4px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .signal-item {
    padding: var(--spacing-md);
  }
  
  .signal-icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
  
  .signal-details {
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  
  .signal-meta {
    flex-direction: column;
    gap: var(--spacing-xs);
  }
}
</style>
