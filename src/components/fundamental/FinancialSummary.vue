<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { FinancialSummary } from '@/types/fundamental'

const props = defineProps<{
  symbol: string
  summary: FinancialSummary | null
  isLoading: boolean
}>()

// 获取趋势图标
const getTrendIcon = (trend?: string) => {
  if (!trend) return ''
  
  switch (trend) {
    case 'up':
      return '↑'
    case 'down':
      return '↓'
    case 'stable':
      return '→'
    default:
      return ''
  }
}

// 获取趋势类名
const getTrendClass = (trend?: string) => {
  if (!trend) return ''
  
  switch (trend) {
    case 'up':
      return 'trend-up'
    case 'down':
      return 'trend-down'
    case 'stable':
      return 'trend-stable'
    default:
      return ''
  }
}

// 格式化数值
const formatValue = (value: number | string) => {
  if (typeof value === 'string') return value
  
  // 如果是大数字，使用适当的单位
  if (value >= 1000000000) {
    return (value / 1000000000).toFixed(2) + '十亿'
  } else if (value >= 1000000) {
    return (value / 1000000).toFixed(2) + '百万'
  } else if (value >= 1000) {
    return (value / 1000).toFixed(2) + '千'
  }
  
  return value.toString()
}
</script>

<template>
  <div class="financial-summary">
    <div class="summary-header">
      <h3>财务摘要</h3>
      <span class="report-date" v-if="!isLoading && summary">截至 2023-12-31</span>
    </div>
    
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载财务数据...</p>
    </div>
    
    <div v-else-if="!summary" class="empty-container">
      <p>暂无财务数据</p>
    </div>
    
    <div v-else class="summary-grid">
      <!-- 营业收入 -->
      <div class="summary-item">
        <div class="item-header">
          <span class="item-name">{{ summary.revenue.name }}</span>
          <span 
            class="item-trend" 
            :class="getTrendClass(summary.revenue.trend)"
          >
            {{ getTrendIcon(summary.revenue.trend) }}
            {{ summary.revenue.changePercent }}%
          </span>
        </div>
        <div class="item-value">{{ formatValue(summary.revenue.value) }} {{ summary.revenue.unit }}</div>
        <div class="item-description">{{ summary.revenue.description }}</div>
      </div>
      
      <!-- 净利润 -->
      <div class="summary-item">
        <div class="item-header">
          <span class="item-name">{{ summary.netProfit.name }}</span>
          <span 
            class="item-trend" 
            :class="getTrendClass(summary.netProfit.trend)"
          >
            {{ getTrendIcon(summary.netProfit.trend) }}
            {{ summary.netProfit.changePercent }}%
          </span>
        </div>
        <div class="item-value">{{ formatValue(summary.netProfit.value) }} {{ summary.netProfit.unit }}</div>
        <div class="item-description">{{ summary.netProfit.description }}</div>
      </div>
      
      <!-- 毛利率 -->
      <div class="summary-item">
        <div class="item-header">
          <span class="item-name">{{ summary.grossMargin.name }}</span>
          <span 
            class="item-trend" 
            :class="getTrendClass(summary.grossMargin.trend)"
          >
            {{ getTrendIcon(summary.grossMargin.trend) }}
            {{ summary.grossMargin.changePercent }}%
          </span>
        </div>
        <div class="item-value">{{ summary.grossMargin.value }}{{ summary.grossMargin.unit }}</div>
        <div class="item-description">{{ summary.grossMargin.description }}</div>
      </div>
      
      <!-- 净利率 -->
      <div class="summary-item">
        <div class="item-header">
          <span class="item-name">{{ summary.netMargin.name }}</span>
          <span 
            class="item-trend" 
            :class="getTrendClass(summary.netMargin.trend)"
          >
            {{ getTrendIcon(summary.netMargin.trend) }}
            {{ summary.netMargin.changePercent }}%
          </span>
        </div>
        <div class="item-value">{{ summary.netMargin.value }}{{ summary.netMargin.unit }}</div>
        <div class="item-description">{{ summary.netMargin.description }}</div>
      </div>
      
      <!-- ROE -->
      <div class="summary-item">
        <div class="item-header">
          <span class="item-name">{{ summary.roe.name }}</span>
          <span 
            class="item-trend" 
            :class="getTrendClass(summary.roe.trend)"
          >
            {{ getTrendIcon(summary.roe.trend) }}
            {{ summary.roe.changePercent }}%
          </span>
        </div>
        <div class="item-value">{{ summary.roe.value }}{{ summary.roe.unit }}</div>
        <div class="item-description">{{ summary.roe.description }}</div>
      </div>
      
      <!-- 资产负债率 -->
      <div class="summary-item">
        <div class="item-header">
          <span class="item-name">{{ summary.debtToAsset.name }}</span>
          <span 
            class="item-trend" 
            :class="getTrendClass(summary.debtToAsset.trend)"
          >
            {{ getTrendIcon(summary.debtToAsset.trend) }}
            {{ summary.debtToAsset.changePercent }}%
          </span>
        </div>
        <div class="item-value">{{ summary.debtToAsset.value }}{{ summary.debtToAsset.unit }}</div>
        <div class="item-description">{{ summary.debtToAsset.description }}</div>
      </div>
      
      <!-- EPS -->
      <div class="summary-item">
        <div class="item-header">
          <span class="item-name">{{ summary.eps.name }}</span>
          <span 
            class="item-trend" 
            :class="getTrendClass(summary.eps.trend)"
          >
            {{ getTrendIcon(summary.eps.trend) }}
            {{ summary.eps.changePercent }}%
          </span>
        </div>
        <div class="item-value">{{ summary.eps.value }}{{ summary.eps.unit }}</div>
        <div class="item-description">{{ summary.eps.description }}</div>
      </div>
      
      <!-- BPS -->
      <div class="summary-item">
        <div class="item-header">
          <span class="item-name">{{ summary.bps.name }}</span>
          <span 
            class="item-trend" 
            :class="getTrendClass(summary.bps.trend)"
          >
            {{ getTrendIcon(summary.bps.trend) }}
            {{ summary.bps.changePercent }}%
          </span>
        </div>
        <div class="item-value">{{ summary.bps.value }}{{ summary.bps.unit }}</div>
        <div class="item-description">{{ summary.bps.description }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.financial-summary {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
  transition: all var(--transition-fast);
}

.summary-header {
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-header h3 {
  margin: 0;
  font-size: var(--font-size-md);
  color: var(--primary-color);
}

.report-date {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  gap: var(--spacing-md);
  min-height: 200px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(66, 185, 131, 0.2);
  border-top: 4px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-md);
  padding: var(--spacing-md);
}

.summary-item {
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  padding: var(--spacing-md);
  transition: all var(--transition-fast);
}

.summary-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.item-name {
  font-weight: 600;
  color: var(--text-primary);
}

.item-trend {
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.trend-up {
  color: var(--stock-up);
}

.trend-down {
  color: var(--stock-down);
}

.trend-stable {
  color: var(--text-secondary);
}

.item-value {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.item-description {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
