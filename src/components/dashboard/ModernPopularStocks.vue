<template>
  <div class="modern-popular-stocks">
    <div class="widget-header">
      <h3 class="widget-title">
        <el-icon class="title-icon"><TrendCharts /></el-icon>
        热门股票
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
      <div v-if="loading && stocks.length === 0" class="loading-state">
        <el-skeleton :rows="5" animated />
      </div>

      <!-- Empty State -->
      <div v-else-if="stocks.length === 0" class="empty-state">
        <el-empty description="暂无热门股票数据" />
      </div>

      <!-- Stocks List -->
      <div v-else class="stocks-list">
        <div
          v-for="(stock, index) in stocks"
          :key="stock.symbol"
          class="stock-item"
          @click="$emit('stock-click', stock)"
        >
          <div class="stock-rank">{{ index + 1 }}</div>
          <div class="stock-info">
            <div class="stock-name">{{ stock.name }}</div>
            <div class="stock-code">{{ stock.symbol }}</div>
          </div>
          <div class="stock-price">
            <div class="price-value">{{ formatPrice(stock.price) }}</div>
            <div class="price-change" :class="getChangeClass(stock.changePercent)">
              {{ formatPercent(stock.changePercent) }}
            </div>
          </div>
          <div class="stock-actions">
            <el-button
              size="small"
              :icon="Plus"
              @click.stop="$emit('add-to-watchlist', stock)"
              circle
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TrendCharts, Refresh, Plus } from '@element-plus/icons-vue'
import type { Stock } from '@/types/stock'

// Props
interface Props {
  stocks: Stock[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
defineEmits<{
  'stock-click': [stock: Stock]
  'add-to-watchlist': [stock: Stock]
  refresh: []
}>()

// 格式化函数
const formatPrice = (price: number) => {
  return price.toFixed(2)
}

const formatPercent = (percent: number) => {
  const sign = percent >= 0 ? '+' : ''
  return `${sign}${percent.toFixed(2)}%`
}

const getChangeClass = (changePercent: number) => ({
  'change-up': changePercent > 0,
  'change-down': changePercent < 0,
  'change-neutral': changePercent === 0
})
</script>

<style scoped>
.modern-popular-stocks {
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
  color: var(--color-success);
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

.stocks-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.stock-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--el-border-color-light);
  cursor: pointer;
  transition: all 0.3s ease;
}

.stock-item:hover {
  background: var(--el-bg-color-page);
  border-color: var(--color-primary);
  transform: translateX(4px);
}

.stock-rank {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.stock-item:nth-child(1) .stock-rank {
  background: #FFD700; /* 金色 */
}

.stock-item:nth-child(2) .stock-rank {
  background: #C0C0C0; /* 银色 */
}

.stock-item:nth-child(3) .stock-rank {
  background: #CD7F32; /* 铜色 */
}

.stock-info {
  flex: 1;
}

.stock-name {
  font-weight: var(--font-weight-medium);
  color: var(--el-text-color-primary);
  margin-bottom: var(--spacing-xs);
}

.stock-code {
  font-size: var(--font-size-sm);
  color: var(--el-text-color-regular);
}

.stock-price {
  text-align: right;
  min-width: 80px;
}

.price-value {
  font-weight: var(--font-weight-bold);
  color: var(--el-text-color-primary);
  margin-bottom: var(--spacing-xs);
}

.price-change {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.price-change.change-up {
  color: var(--color-success);
}

.price-change.change-down {
  color: var(--color-danger);
}

.price-change.change-neutral {
  color: var(--el-text-color-regular);
}

.stock-actions {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stock-item:hover .stock-actions {
  opacity: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stock-item {
    padding: var(--spacing-sm);
  }
  
  .stock-actions {
    opacity: 1; /* 在移动端始终显示操作按钮 */
  }
  
  .stock-price {
    min-width: 60px;
  }
}
</style>
