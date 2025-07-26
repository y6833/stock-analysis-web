<template>
  <div class="modern-news-widget">
    <div class="widget-header">
      <h3 class="widget-title">
        <el-icon class="title-icon"><Document /></el-icon>
        财经资讯
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
      <div v-if="loading && news.length === 0" class="loading-state">
        <el-skeleton :rows="4" animated />
      </div>

      <!-- Empty State -->
      <div v-else-if="news.length === 0" class="empty-state">
        <el-empty description="暂无新闻资讯" />
      </div>

      <!-- News List -->
      <div v-else class="news-list">
        <div
          v-for="item in news"
          :key="item.id"
          class="news-item"
          @click="$emit('news-click', item)"
        >
          <div class="news-content">
            <h4 class="news-title">{{ item.title }}</h4>
            <p class="news-summary" v-if="item.summary">{{ item.summary }}</p>
            <div class="news-meta">
              <span class="news-source">{{ item.source }}</span>
              <span class="news-time">{{ formatTime(item.publishTime) }}</span>
              <el-tag
                v-if="item.category"
                size="small"
                :type="getCategoryType(item.category)"
              >
                {{ item.category }}
              </el-tag>
            </div>
          </div>
          <div class="news-image" v-if="item.imageUrl">
            <img :src="item.imageUrl" :alt="item.title" />
          </div>
        </div>
      </div>

      <!-- 查看更多 -->
      <div class="view-more" v-if="news.length > 0">
        <el-button type="primary" text @click="handleViewMore">
          查看更多新闻
          <el-icon class="ml-2"><ArrowRight /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Document, Refresh, ArrowRight } from '@element-plus/icons-vue'

// Props
interface NewsItem {
  id: string
  title: string
  summary?: string
  source: string
  publishTime: string
  category?: string
  imageUrl?: string
  url?: string
}

interface Props {
  news: NewsItem[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
defineEmits<{
  'news-click': [item: NewsItem]
  refresh: []
}>()

const router = useRouter()

// 格式化时间
const formatTime = (timeStr: string) => {
  const time = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - time.getTime()
  
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
    return time.toLocaleDateString('zh-CN')
  }
}

// 获取分类标签类型
const getCategoryType = (category: string) => {
  const typeMap: Record<string, string> = {
    '重要': 'danger',
    '热点': 'warning',
    '公告': 'info',
    '研报': 'success',
    '政策': 'primary'
  }
  return typeMap[category] || 'info'
}

// 查看更多
const handleViewMore = () => {
  router.push('/news')
}
</script>

<style scoped>
.modern-news-widget {
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
  color: var(--color-info);
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

.news-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.news-item {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--el-border-color-light);
  cursor: pointer;
  transition: all 0.3s ease;
}

.news-item:hover {
  background: var(--el-bg-color-page);
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.news-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.news-title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--el-text-color-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-summary {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--el-text-color-regular);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--el-text-color-placeholder);
}

.news-source {
  font-weight: var(--font-weight-medium);
}

.news-time {
  color: var(--el-text-color-regular);
}

.news-image {
  width: 80px;
  height: 60px;
  border-radius: var(--border-radius-sm);
  overflow: hidden;
  flex-shrink: 0;
}

.news-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.view-more {
  margin-top: var(--spacing-lg);
  text-align: center;
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--el-border-color-lighter);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .news-item {
    flex-direction: column;
  }
  
  .news-image {
    width: 100%;
    height: 120px;
  }
  
  .news-meta {
    flex-wrap: wrap;
  }
}
</style>
