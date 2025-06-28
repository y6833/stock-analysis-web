<template>
  <div class="enhanced-news-widget">
    <div class="widget-header">
      <h3>财经资讯</h3>
      <div class="widget-controls">
        <div class="news-filter">
          <button
            v-for="filter in newsFilters"
            :key="filter.key"
            class="filter-button"
            :class="{ active: activeFilter === filter.key }"
            @click="activeFilter = filter.key"
          >
            {{ filter.label }}
          </button>
        </div>
        <button class="refresh-btn" @click="refreshNews" :disabled="isLoading">
          <span class="refresh-icon" :class="{ spinning: isLoading }">🔄</span>
        </button>
      </div>
    </div>

    <div class="widget-content">
      <div v-if="isLoading" class="loading-state">
        <SkeletonLoader type="list" :rows="5" />
      </div>

      <div v-else-if="error" class="error-state">
        <div class="error-icon">⚠️</div>
        <p>{{ error }}</p>
        <button class="retry-btn" @click="refreshNews">重试</button>
      </div>

      <div v-else-if="filteredNews.length === 0" class="empty-state">
        <div class="empty-icon">📰</div>
        <p>暂无新闻数据</p>
        <p class="empty-hint">请检查网络连接或稍后重试</p>
      </div>

      <div v-else class="news-list">
        <div
          v-for="(news, index) in filteredNews"
          :key="index"
          class="news-item"
          :class="{
            important: news.important,
            unread: !news.read
          }"
          @click="openNews(news)"
        >
          <div class="news-content">
            <div class="news-header">
              <h4 class="news-title">{{ news.title }}</h4>
              <div class="news-badges">
                <span v-if="news.important" class="badge important">重要</span>
                <span v-if="news.category" class="badge category">{{ news.category }}</span>
              </div>
            </div>

            <div class="news-summary" v-if="news.summary">
              {{ news.summary }}
            </div>

            <div class="news-meta">
              <span class="news-source">{{ news.source }}</span>
              <span class="news-time">{{ formatTime(news.time) }}</span>
              <span
                v-if="news.data_source"
                class="data-source-badge"
                :class="getDataSourceClass(news.data_source)"
                :title="'数据来源: ' + news.data_source"
              >
                {{ getDataSourceIcon(news.data_source) }}
              </span>
            </div>
          </div>

          <div class="news-actions">
            <button
              class="action-btn bookmark"
              @click.stop="toggleBookmark(news)"
              :class="{ active: news.bookmarked }"
              title="收藏"
            >
              {{ news.bookmarked ? '⭐' : '☆' }}
            </button>
            <button
              class="action-btn share"
              @click.stop="shareNews(news)"
              title="分享"
            >
              📤
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredNews.length > 0" class="widget-footer">
        <button class="load-more-btn" @click="loadMoreNews" :disabled="isLoadingMore">
          <span v-if="isLoadingMore" class="loading-spinner-small"></span>
          <span v-else>加载更多</span>
        </button>
        <button class="view-all-btn" @click="$emit('view-all')">
          查看全部
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { stockService } from '@/services/stockService'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'

// Props
interface Props {
  maxItems?: number
  refreshInterval?: number
  showSummary?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxItems: 10,
  refreshInterval: 300000, // 5分钟
  showSummary: true
})

// Emits
const emit = defineEmits<{
  'news-click': [news: any]
  'view-all': []
}>()

// 新闻项接口
interface NewsItem {
  title: string
  summary?: string
  source: string
  time: string
  url?: string
  important?: boolean
  category?: string
  data_source?: string
  read?: boolean
  bookmarked?: boolean
}

// 状态
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref('')
const activeFilter = ref('all')

// 数据
const allNews = ref<NewsItem[]>([])
const currentPage = ref(1)
const pageSize = 10

// 新闻过滤器
const newsFilters = [
  { key: 'all', label: '全部' },
  { key: 'important', label: '重要' },
  { key: 'market', label: '市场' },
  { key: 'policy', label: '政策' },
  { key: 'company', label: '公司' }
]

// 计算属性
const filteredNews = computed(() => {
  let filtered = allNews.value

  // 按过滤器筛选
  if (activeFilter.value === 'important') {
    filtered = filtered.filter(news => news.important)
  } else if (activeFilter.value !== 'all') {
    filtered = filtered.filter(news => news.category === activeFilter.value)
  }

  // 限制显示数量
  return filtered.slice(0, props.maxItems)
})

// 方法
const refreshNews = async () => {
  if (isLoading.value) return

  isLoading.value = true
  error.value = ''
  currentPage.value = 1

  try {
    const news = await stockService.getFinancialNews(pageSize)

    if (news && news.length > 0) {
      allNews.value = news.map((item: any) => ({
        title: item.title,
        summary: item.summary || item.content?.substring(0, 100) + '...',
        source: item.source,
        time: item.time || item.publish_time || new Date().toISOString(),
        url: item.url,
        important: item.important || false,
        category: item.category || categorizeNews(item.title),
        data_source: item.data_source || item.source_type || 'api',
        read: false,
        bookmarked: false
      }))
    } else {
      allNews.value = []
      error.value = '暂无新闻数据'
    }

  } catch (err) {
    console.error('获取新闻失败:', err)
    error.value = err instanceof Error ? err.message : '获取新闻失败'
    allNews.value = []
  } finally {
    isLoading.value = false
  }
}

const loadMoreNews = async () => {
  if (isLoadingMore.value) return

  isLoadingMore.value = true
  currentPage.value++

  try {
    const news = await stockService.getFinancialNews(pageSize, currentPage.value)

    if (news && news.length > 0) {
      const newItems = news.map((item: any) => ({
        title: item.title,
        summary: item.summary || item.content?.substring(0, 100) + '...',
        source: item.source,
        time: item.time || item.publish_time || new Date().toISOString(),
        url: item.url,
        important: item.important || false,
        category: item.category || categorizeNews(item.title),
        data_source: item.data_source || item.source_type || 'api',
        read: false,
        bookmarked: false
      }))

      allNews.value.push(...newItems)
    }

  } catch (err) {
    console.error('加载更多新闻失败:', err)
    currentPage.value-- // 回退页码
  } finally {
    isLoadingMore.value = false
  }
}

const openNews = (news: NewsItem) => {
  // 标记为已读
  news.read = true

  // 发出事件
  emit('news-click', news)

  // 如果有URL，打开链接
  if (news.url && news.url !== '#') {
    window.open(news.url, '_blank')
  }
}

const toggleBookmark = (news: NewsItem) => {
  news.bookmarked = !news.bookmarked

  // 这里可以调用API保存收藏状态
  console.log(`${news.bookmarked ? '收藏' : '取消收藏'}新闻:`, news.title)
}

const shareNews = (news: NewsItem) => {
  if (navigator.share) {
    navigator.share({
      title: news.title,
      text: news.summary,
      url: news.url
    })
  } else {
    // 复制到剪贴板
    const text = `${news.title}\n${news.summary}\n${news.url || ''}`
    navigator.clipboard.writeText(text).then(() => {
      console.log('新闻内容已复制到剪贴板')
    })
  }
}

const categorizeNews = (title: string): string => {
  if (title.includes('央行') || title.includes('政策') || title.includes('监管')) {
    return 'policy'
  } else if (title.includes('公司') || title.includes('业绩') || title.includes('财报')) {
    return 'company'
  } else {
    return 'market'
  }
}

const formatTime = (time: string): string => {
  try {
    const date = new Date(time)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) {
      return `${minutes}分钟前`
    } else if (hours < 24) {
      return `${hours}小时前`
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString()
    }
  } catch {
    return time
  }
}

const getDataSourceClass = (dataSource: string): string => {
  if (dataSource.includes('api')) return 'api'
  if (dataSource.includes('cache')) return 'cache'
  if (dataSource.includes('mock')) return 'mock'
  return 'unknown'
}

const getDataSourceIcon = (dataSource: string): string => {
  if (dataSource.includes('api')) return '🔄'
  if (dataSource.includes('cache')) return '💾'
  if (dataSource.includes('mock')) return '📊'
  return '❓'
}

// 监听过滤器变化
watch(activeFilter, () => {
  // 如果切换到新的过滤器且没有数据，重新加载
  if (filteredNews.value.length === 0 && allNews.value.length === 0) {
    refreshNews()
  }
})

// 生命周期
onMounted(() => {
  refreshNews()

  // 设置定时刷新
  if (props.refreshInterval > 0) {
    setInterval(refreshNews, props.refreshInterval)
  }
})
</script>

<style scoped>
.enhanced-news-widget {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--border-light);
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-secondary);
}

.widget-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--primary-color);
  font-weight: 600;
}

.widget-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.news-filter {
  display: flex;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-md);
  padding: 2px;
}

.filter-button {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-button.active {
  background: var(--accent-color);
  color: white;
}

.refresh-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.refresh-btn:hover {
  background: var(--bg-secondary);
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.widget-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.loading-state,
.error-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--text-secondary);
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-light);
  border-top: 3px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-md);
}

.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-light);
  border-top: 2px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
}

.error-icon,
.empty-icon {
  font-size: 2rem;
  margin-bottom: var(--spacing-md);
}

.empty-hint {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-top: var(--spacing-xs);
}

.retry-btn {
  margin-top: var(--spacing-md);
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
}

.news-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm);
}

.news-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  border-radius: var(--border-radius-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.news-item:hover {
  background: var(--bg-tertiary);
  transform: translateY(-1px);
}

.news-item.important {
  border-left: 3px solid var(--accent-color);
}

.news-item.unread {
  background: var(--bg-primary);
}

.news-content {
  flex: 1;
  min-width: 0;
}

.news-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-xs);
}

.news-title {
  font-size: var(--font-size-md);
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.news-badges {
  display: flex;
  gap: var(--spacing-xs);
  margin-left: var(--spacing-sm);
  flex-shrink: 0;
}

.badge {
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.badge.important {
  background: var(--accent-color);
  color: white;
}

.badge.category {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.news-summary {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.4;
  margin-bottom: var(--spacing-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.news-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.data-source-badge {
  padding: 2px 4px;
  border-radius: 3px;
  background: var(--bg-tertiary);
}

.data-source-badge.api {
  color: var(--accent-color);
}

.data-source-badge.cache {
  color: var(--info-color);
}

.data-source-badge.mock {
  color: var(--warning-color);
}

.news-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-left: var(--spacing-sm);
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: background-color var(--transition-fast);
}

.action-btn:hover {
  background: var(--bg-tertiary);
}

.action-btn.bookmark.active {
  color: var(--warning-color);
}

.widget-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-light);
  background: var(--bg-secondary);
}

.load-more-btn,
.view-all-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.load-more-btn:hover,
.view-all-btn:hover {
  background: var(--bg-secondary);
}

.load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .widget-header {
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: stretch;
  }

  .widget-controls {
    justify-content: space-between;
  }

  .news-filter {
    flex: 1;
  }

  .filter-button {
    flex: 1;
    text-align: center;
  }

  .news-item {
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .news-actions {
    flex-direction: row;
    margin-left: 0;
  }
}
</style>
