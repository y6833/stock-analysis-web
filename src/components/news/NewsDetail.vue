<script setup lang="ts">
import { ref, watch } from 'vue'
import type { NewsItem } from '@/types/news'

const props = defineProps<{
  news: NewsItem | null
}>()

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取来源图标
const getSourceIcon = (source: string) => {
  switch (source) {
    case 'official':
      return '📢'
    case 'media':
      return '📰'
    case 'research':
      return '📊'
    case 'social':
      return '💬'
    default:
      return '📄'
  }
}

// 获取情感图标
const getSentimentIcon = (sentiment?: string) => {
  if (!sentiment) return ''
  
  switch (sentiment) {
    case 'positive':
      return '📈'
    case 'negative':
      return '📉'
    case 'neutral':
      return '📊'
    default:
      return ''
  }
}

// 获取情感类名
const getSentimentClass = (sentiment?: string) => {
  if (!sentiment) return ''
  
  switch (sentiment) {
    case 'positive':
      return 'sentiment-positive'
    case 'negative':
      return 'sentiment-negative'
    case 'neutral':
      return 'sentiment-neutral'
    default:
      return ''
  }
}

// 获取情感名称
const getSentimentName = (sentiment?: string) => {
  if (!sentiment) return '未知'
  
  switch (sentiment) {
    case 'positive':
      return '积极'
    case 'negative':
      return '消极'
    case 'neutral':
      return '中性'
    default:
      return '未知'
  }
}

// 打开原始链接
const openOriginalLink = () => {
  if (props.news?.url) {
    window.open(props.news.url, '_blank')
  }
}
</script>

<template>
  <div class="news-detail">
    <div v-if="!news" class="empty-container">
      <p>请选择一条新闻查看详情</p>
    </div>
    
    <div v-else class="news-detail-content">
      <div class="news-header">
        <div class="news-meta">
          <div class="news-source">
            <span class="source-icon">{{ getSourceIcon(news.source) }}</span>
            <span class="source-name">{{ news.sourceName }}</span>
          </div>
          <div class="news-time">{{ formatDate(news.publishTime) }}</div>
        </div>
        
        <h2 class="news-title">{{ news.title }}</h2>
        
        <div 
          class="news-sentiment" 
          v-if="news.sentiment"
          :class="getSentimentClass(news.sentiment)"
        >
          <span class="sentiment-icon">{{ getSentimentIcon(news.sentiment) }}</span>
          <span class="sentiment-name">{{ getSentimentName(news.sentiment) }}</span>
          <span class="sentiment-score" v-if="news.sentimentScore">
            ({{ news.sentimentScore }}/100)
          </span>
        </div>
      </div>
      
      <div class="news-image" v-if="news.imageUrl">
        <img :src="news.imageUrl" :alt="news.title" />
      </div>
      
      <div class="news-body">
        <p class="news-summary">{{ news.summary }}</p>
        
        <div class="news-content" v-if="news.content">
          <p>{{ news.content }}</p>
        </div>
      </div>
      
      <div class="news-footer">
        <div class="news-keywords">
          <span class="keyword-label">关键词：</span>
          <div class="keyword-list">
            <span 
              v-for="(keyword, index) in news.keywords" 
              :key="index"
              class="keyword"
            >
              #{{ keyword }}
            </span>
          </div>
        </div>
        
        <div class="news-related-stocks" v-if="news.relatedStocks && news.relatedStocks.length > 0">
          <span class="related-stocks-label">相关股票：</span>
          <div class="related-stocks-list">
            <span 
              v-for="stock in news.relatedStocks" 
              :key="stock.symbol"
              class="related-stock"
            >
              {{ stock.name }}({{ stock.symbol }})
            </span>
          </div>
        </div>
        
        <div class="news-actions">
          <button class="action-btn" @click="openOriginalLink">
            查看原文
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.news-detail {
  height: 100%;
}

.empty-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
  color: var(--text-secondary);
  font-size: var(--font-size-md);
}

.news-detail-content {
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
  padding: var(--spacing-lg);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.news-header {
  margin-bottom: var(--spacing-md);
}

.news-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.news-source {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.source-icon {
  font-size: var(--font-size-md);
}

.news-time {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.news-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  line-height: 1.4;
}

.news-sentiment {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  margin-bottom: var(--spacing-md);
}

.sentiment-positive {
  background-color: rgba(46, 204, 113, 0.1);
  color: #27ae60;
}

.sentiment-negative {
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.sentiment-neutral {
  background-color: rgba(52, 152, 219, 0.1);
  color: #3498db;
}

.sentiment-icon {
  font-size: var(--font-size-md);
}

.news-image {
  margin-bottom: var(--spacing-md);
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

.news-image img {
  width: 100%;
  height: auto;
  max-height: 300px;
  object-fit: cover;
  display: block;
}

.news-body {
  flex: 1;
  margin-bottom: var(--spacing-md);
}

.news-summary {
  font-size: var(--font-size-md);
  color: var(--text-primary);
  line-height: 1.6;
  margin-bottom: var(--spacing-md);
  font-weight: 500;
}

.news-content {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.6;
}

.news-footer {
  border-top: 1px solid var(--border-light);
  padding-top: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.news-keywords,
.news-related-stocks {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.keyword-label,
.related-stocks-label {
  color: var(--text-secondary);
  white-space: nowrap;
}

.keyword-list,
.related-stocks-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.keyword {
  color: var(--primary-color);
  background-color: rgba(66, 185, 131, 0.1);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
}

.related-stock {
  color: var(--accent-color);
  background-color: rgba(52, 152, 219, 0.1);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
}

.news-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--spacing-sm);
}

.action-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background-color: var(--primary-dark);
}
</style>
