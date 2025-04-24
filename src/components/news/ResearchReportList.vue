<script setup lang="ts">
import { ref } from 'vue'
import type { ResearchReport } from '@/types/news'

const props = defineProps<{
  reports: ResearchReport[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'reportSelected', report: ResearchReport): void
}>()

// 当前选中的研究报告
const selectedReport = ref<ResearchReport | null>(null)

// 选择研究报告
const selectReport = (report: ResearchReport) => {
  selectedReport.value = report
  emit('reportSelected', report)
}

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 获取评级图标
const getRatingIcon = (rating: string) => {
  switch (rating) {
    case 'buy':
    case 'outperform':
      return '📈'
    case 'hold':
      return '📊'
    case 'sell':
    case 'underperform':
      return '📉'
    default:
      return '📄'
  }
}

// 获取评级文本
const getRatingText = (rating: string) => {
  switch (rating) {
    case 'buy':
      return '买入'
    case 'outperform':
      return '跑赢大市'
    case 'hold':
      return '持有'
    case 'sell':
      return '卖出'
    case 'underperform':
      return '跑输大市'
    default:
      return rating
  }
}

// 获取评级类名
const getRatingClass = (rating: string) => {
  switch (rating) {
    case 'buy':
    case 'outperform':
      return 'rating-positive'
    case 'hold':
      return 'rating-neutral'
    case 'sell':
    case 'underperform':
      return 'rating-negative'
    default:
      return ''
  }
}

// 获取评级变化图标
const getRatingChangeIcon = (currentRating: string, previousRating?: string) => {
  if (!previousRating) return ''
  
  const ratingValues: Record<string, number> = {
    'buy': 5,
    'outperform': 4,
    'hold': 3,
    'underperform': 2,
    'sell': 1
  }
  
  const currentValue = ratingValues[currentRating] || 0
  const previousValue = ratingValues[previousRating] || 0
  
  if (currentValue > previousValue) return '⬆️'
  if (currentValue < previousValue) return '⬇️'
  return '➡️'
}

// 打开原始链接
const openOriginalLink = (url: string) => {
  window.open(url, '_blank')
}
</script>

<template>
  <div class="report-list">
    <div class="report-header">
      <h3>研究报告</h3>
    </div>
    
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载研究报告中...</p>
    </div>
    
    <div v-else-if="reports.length === 0" class="empty-container">
      <p>暂无研究报告</p>
    </div>
    
    <div v-else class="report-items">
      <div 
        v-for="item in reports" 
        :key="item.id"
        class="report-item"
        :class="{ 'selected': selectedReport && selectedReport.id === item.id }"
        @click="selectReport(item)"
      >
        <div class="report-item-header">
          <div class="report-institution">{{ item.institution }}</div>
          <div class="report-time">{{ formatDate(item.publishTime) }}</div>
        </div>
        
        <h3 class="report-title">{{ item.title }}</h3>
        
        <div class="report-meta">
          <div class="report-analyst">
            <span class="meta-label">分析师：</span>
            <span class="meta-value">{{ item.analyst }}</span>
          </div>
          
          <div class="report-rating-container">
            <div 
              class="report-rating" 
              :class="getRatingClass(item.rating)"
            >
              <span class="rating-icon">{{ getRatingIcon(item.rating) }}</span>
              <span class="rating-text">{{ getRatingText(item.rating) }}</span>
            </div>
            
            <div class="rating-change" v-if="item.previousRating">
              <span class="change-icon">{{ getRatingChangeIcon(item.rating, item.previousRating) }}</span>
              <span class="previous-rating">{{ getRatingText(item.previousRating) }}</span>
            </div>
          </div>
        </div>
        
        <div class="report-price" v-if="item.targetPrice">
          <div class="target-price">
            <span class="price-label">目标价：</span>
            <span class="price-value">{{ item.targetPrice.toFixed(2) }}</span>
          </div>
          
          <div class="price-change" v-if="item.previousTargetPrice">
            <span class="change-icon">
              {{ item.targetPrice > item.previousTargetPrice ? '⬆️' : item.targetPrice < item.previousTargetPrice ? '⬇️' : '➡️' }}
            </span>
            <span class="previous-price">{{ item.previousTargetPrice.toFixed(2) }}</span>
          </div>
        </div>
        
        <p class="report-summary">{{ item.summary }}</p>
        
        <div class="report-footer">
          <button class="view-btn" @click.stop="openOriginalLink(item.url)">查看报告</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.report-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.report-header {
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  border-top-left-radius: var(--border-radius-md);
  border-top-right-radius: var(--border-radius-md);
}

.report-header h3 {
  margin: 0;
  font-size: var(--font-size-md);
  color: var(--primary-color);
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  gap: var(--spacing-md);
  flex: 1;
  background-color: var(--bg-primary);
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

.report-items {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  background-color: var(--bg-primary);
}

.report-item {
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  border: 1px solid var(--border-light);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.report-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
  border-color: var(--border-color);
}

.report-item.selected {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.report-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.report-institution {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.report-time {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.report-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-md);
  color: var(--text-primary);
  line-height: 1.4;
}

.report-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.report-analyst {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.meta-label {
  color: var(--text-muted);
}

.report-rating-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.report-rating {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
}

.rating-positive {
  background-color: rgba(46, 204, 113, 0.1);
  color: #27ae60;
}

.rating-neutral {
  background-color: rgba(52, 152, 219, 0.1);
  color: #3498db;
}

.rating-negative {
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.rating-icon {
  font-size: var(--font-size-md);
}

.rating-change {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.report-price {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.target-price {
  color: var(--text-primary);
}

.price-label {
  color: var(--text-muted);
}

.price-value {
  font-weight: 600;
}

.price-change {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.report-summary {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.report-footer {
  display: flex;
  justify-content: flex-end;
}

.view-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-xs);
}

.view-btn:hover {
  background-color: var(--primary-dark);
}
</style>
