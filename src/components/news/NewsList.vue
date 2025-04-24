<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { NewsItem, NewsFilterOptions, NewsSortOption, NewsSource, NewsSentiment } from '@/types/news'

const props = defineProps<{
  news: NewsItem[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'filter', options: NewsFilterOptions): void
  (e: 'sort', option: NewsSortOption): void
  (e: 'newsSelected', news: NewsItem): void
}>()

// 过滤和排序选项
const filterOptions = ref<NewsFilterOptions>({
  sources: [],
  sentiment: [],
  keywords: []
})

const sortOption = ref<NewsSortOption>('time')

// 当前选中的新闻
const selectedNews = ref<NewsItem | null>(null)

// 可用的新闻来源
const availableSources = computed(() => {
  const sources = new Set<NewsSource>()
  props.news.forEach(item => {
    sources.add(item.source)
  })
  return Array.from(sources)
})

// 可用的情感类型
const availableSentiments = computed(() => {
  const sentiments = new Set<NewsSentiment>()
  props.news.forEach(item => {
    if (item.sentiment) {
      sentiments.add(item.sentiment)
    }
  })
  return Array.from(sentiments)
})

// 应用过滤
const applyFilter = () => {
  emit('filter', filterOptions.value)
}

// 应用排序
const applySort = (option: NewsSortOption) => {
  sortOption.value = option
  emit('sort', option)
}

// 重置过滤
const resetFilter = () => {
  filterOptions.value = {
    sources: [],
    sentiment: [],
    keywords: []
  }
  applyFilter()
}

// 选择新闻
const selectNews = (news: NewsItem) => {
  selectedNews.value = news
  emit('newsSelected', news)
}

// 格式化日期
const formatDate = (dateString: string) => {
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
const getSourceIcon = (source: NewsSource) => {
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
const getSentimentIcon = (sentiment?: NewsSentiment) => {
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
const getSentimentClass = (sentiment?: NewsSentiment) => {
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

// 获取来源名称
const getSourceName = (source: NewsSource) => {
  switch (source) {
    case 'official':
      return '官方公告'
    case 'media':
      return '媒体报道'
    case 'research':
      return '研究报告'
    case 'social':
      return '社交媒体'
    default:
      return '其他来源'
  }
}

// 获取情感名称
const getSentimentName = (sentiment?: NewsSentiment) => {
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

// 添加关键词过滤
const addKeyword = (keyword: string) => {
  if (!filterOptions.value.keywords) {
    filterOptions.value.keywords = []
  }
  
  if (!filterOptions.value.keywords.includes(keyword)) {
    filterOptions.value.keywords.push(keyword)
    applyFilter()
  }
}
</script>

<template>
  <div class="news-list">
    <div class="news-filter">
      <div class="filter-header">
        <h3>新闻过滤</h3>
        <button class="reset-btn" @click="resetFilter">重置</button>
      </div>
      
      <div class="filter-section">
        <h4>来源</h4>
        <div class="filter-options">
          <label 
            v-for="source in availableSources" 
            :key="source"
            class="filter-option"
          >
            <input 
              type="checkbox" 
              :value="source" 
              v-model="filterOptions.sources"
              @change="applyFilter"
            />
            <span>{{ getSourceName(source) }}</span>
          </label>
        </div>
      </div>
      
      <div class="filter-section">
        <h4>情感</h4>
        <div class="filter-options">
          <label 
            v-for="sentiment in availableSentiments" 
            :key="sentiment"
            class="filter-option"
          >
            <input 
              type="checkbox" 
              :value="sentiment" 
              v-model="filterOptions.sentiment"
              @change="applyFilter"
            />
            <span>{{ getSentimentName(sentiment) }}</span>
          </label>
        </div>
      </div>
      
      <div class="filter-section">
        <h4>排序方式</h4>
        <div class="sort-options">
          <button 
            class="sort-btn" 
            :class="{ active: sortOption === 'time' }"
            @click="applySort('time')"
          >
            时间
          </button>
          <button 
            class="sort-btn" 
            :class="{ active: sortOption === 'relevance' }"
            @click="applySort('relevance')"
          >
            相关性
          </button>
          <button 
            class="sort-btn" 
            :class="{ active: sortOption === 'sentiment' }"
            @click="applySort('sentiment')"
          >
            情感
          </button>
        </div>
      </div>
    </div>
    
    <div class="news-content">
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>加载新闻中...</p>
      </div>
      
      <div v-else-if="news.length === 0" class="empty-container">
        <p>暂无相关新闻</p>
      </div>
      
      <div v-else class="news-items">
        <div 
          v-for="item in news" 
          :key="item.id"
          class="news-item"
          :class="{ 'selected': selectedNews && selectedNews.id === item.id }"
          @click="selectNews(item)"
        >
          <div class="news-item-header">
            <div class="news-source">
              <span class="source-icon">{{ getSourceIcon(item.source) }}</span>
              <span class="source-name">{{ item.sourceName }}</span>
            </div>
            <div 
              class="news-sentiment" 
              v-if="item.sentiment"
              :class="getSentimentClass(item.sentiment)"
            >
              <span class="sentiment-icon">{{ getSentimentIcon(item.sentiment) }}</span>
              <span class="sentiment-name">{{ getSentimentName(item.sentiment) }}</span>
            </div>
          </div>
          
          <h3 class="news-title">{{ item.title }}</h3>
          
          <div class="news-image" v-if="item.imageUrl">
            <img :src="item.imageUrl" :alt="item.title" />
          </div>
          
          <p class="news-summary">{{ item.summary }}</p>
          
          <div class="news-footer">
            <div class="news-time">{{ formatDate(item.publishTime) }}</div>
            <div class="news-keywords">
              <span 
                v-for="(keyword, index) in item.keywords.slice(0, 3)" 
                :key="index"
                class="keyword"
                @click.stop="addKeyword(keyword)"
              >
                #{{ keyword }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.news-list {
  display: flex;
  gap: var(--spacing-lg);
}

.news-filter {
  width: 250px;
  flex-shrink: 0;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  border: 1px solid var(--border-light);
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-light);
}

.filter-header h3 {
  margin: 0;
  font-size: var(--font-size-md);
  color: var(--primary-color);
}

.reset-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--font-size-xs);
  transition: all var(--transition-fast);
}

.reset-btn:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.filter-section {
  margin-bottom: var(--spacing-md);
}

.filter-section h4 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.filter-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.filter-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.filter-option:hover {
  color: var(--text-primary);
}

.sort-options {
  display: flex;
  gap: var(--spacing-xs);
}

.sort-btn {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  color: var(--text-primary);
  cursor: pointer;
  font-size: var(--font-size-xs);
  transition: all var(--transition-fast);
}

.sort-btn:hover {
  background-color: var(--bg-tertiary);
}

.sort-btn.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.news-content {
  flex: 1;
  min-width: 0;
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
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
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

.news-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.news-item {
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  border: 1px solid var(--border-light);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.news-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
  border-color: var(--border-color);
}

.news-item.selected {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.news-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.news-source {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.source-icon {
  font-size: var(--font-size-md);
}

.news-sentiment {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
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

.news-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-md);
  color: var(--text-primary);
  line-height: 1.4;
}

.news-image {
  margin-bottom: var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  overflow: hidden;
}

.news-image img {
  width: 100%;
  height: auto;
  object-fit: cover;
  display: block;
}

.news-summary {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.news-keywords {
  display: flex;
  gap: var(--spacing-xs);
}

.keyword {
  color: var(--primary-color);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.keyword:hover {
  color: var(--primary-dark);
  text-decoration: underline;
}

@media (max-width: 768px) {
  .news-list {
    flex-direction: column;
  }
  
  .news-filter {
    width: 100%;
  }
  
  .sort-options {
    flex-wrap: wrap;
  }
}
</style>
