<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import PageLayout from '@/components/common/PageLayout.vue'

const isLoading = ref(true)
const newsItems = ref([])
const categories = ref(['全部', '宏观经济', '公司新闻', '行业动态', '政策法规', '市场评论'])
const selectedCategory = ref('全部')
const searchQuery = ref('')

// 模拟新闻数据// 初始化页面
onMounted(() => {
  // 设置新闻数据
  newsItems.value = []
  isLoading.value = false
})

// 过滤新闻
const filteredNews = computed(() => {
  let result = newsItems.value

  // 按分类过滤
  if (selectedCategory.value !== '全部') {
    result = result.filter(item => item.category === selectedCategory.value)
  }

  // 按搜索关键词过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.summary.toLowerCase().includes(query) ||
      item.source.toLowerCase().includes(query)
    )
  }

  return result
})

// 格式化日期
const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 获取相对时间
const getRelativeTime = (dateStr, timeStr) => {
  const now = new Date()
  const newsDate = new Date(`${dateStr} ${timeStr}`)
  const diffMs = now - newsDate

  // 转换为秒
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 60) {
    return '刚刚'
  } else if (diffSec < 3600) {
    return `${Math.floor(diffSec / 60)}分钟前`
  } else if (diffSec < 86400) {
    return `${Math.floor(diffSec / 3600)}小时前`
  } else if (diffSec < 604800) {
    return `${Math.floor(diffSec / 86400)}天前`
  } else {
    return `${formatDate(dateStr)}`
  }
}
</script>

<template>
  <PageLayout title="市场资讯" subtitle="及时了解市场动态，把握投资机会">
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>正在加载新闻资讯...</p>
    </div>

    <div v-else class="news-content">
      <!-- 搜索和筛选 -->
      <div class="news-filters glass-card">
        <el-input
          v-model="searchQuery"
          placeholder="搜索新闻..."
          clearable
          class="search-input"
        >
          <template #prefix>🔍</template>
        </el-input>

        <el-radio-group v-model="selectedCategory" class="category-tabs">
          <el-radio-button v-for="category in categories" :key="category" :label="category">
            {{ category }}
          </el-radio-button>
        </el-radio-group>
      </div>

      <!-- 新闻列表 -->
      <div class="news-list">
        <div v-if="filteredNews.length === 0" class="no-news">
          <p>没有找到符合条件的新闻</p>
        </div>

        <div v-else v-for="news in filteredNews" :key="news.id" class="news-card"
          :class="{ 'important': news.important }">
          <div class="news-image">
            <img :src="news.image" :alt="news.title" />
            <div class="news-category">{{ news.category }}</div>
          </div>

          <div class="news-content">
            <h3 class="news-title">{{ news.title }}</h3>
            <p class="news-summary">{{ news.summary }}</p>

            <div class="news-meta">
              <span class="news-source">{{ news.source }}</span>
              <span class="news-time">{{ getRelativeTime(news.date, news.time) }}</span>
            </div>
          </div>

          <div class="news-actions">
            <button class="btn btn-outline btn-sm">阅读全文</button>
            <button class="btn-icon-only">
              <span>⭐</span>
            </button>
            <button class="btn-icon-only">
              <span>🔗</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination">
        <button class="btn btn-outline btn-sm">上一页</button>
        <div class="page-numbers">
          <button class="page-number active">1</button>
          <button class="page-number">2</button>
          <button class="page-number">3</button>
          <span>...</span>
          <button class="page-number">10</button>
        </div>
        <button class="btn btn-outline btn-sm">下一页</button>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(66, 185, 131, 0.1);
  border-radius: 50%;
  border-top: 4px solid var(--accent-color);
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-md);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.news-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.card {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
}

/* 搜索和筛选 */
.news-filters {
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.category-tabs {
  flex-wrap: wrap;
}

/* 新闻列表 */
.news-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: var(--spacing-lg);
}

.no-news {
  grid-column: 1 / -1;
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--text-secondary);
  font-size: var(--font-size-lg);
}

.news-card {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
  transition: all var(--transition-normal);
  display: flex;
  flex-direction: column;
}

.news-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
}

.news-card.important {
  border-left: 4px solid var(--accent-color);
}

.news-image {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.news-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-normal);
}

.news-card:hover .news-image img {
  transform: scale(1.05);
}

.news-category {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
}

.news-content {
  padding: var(--spacing-md);
  flex: 1;
}

.news-title {
  font-size: var(--font-size-md);
  color: var(--primary-color);
  margin: 0 0 var(--spacing-sm) 0;
  font-weight: 600;
  line-height: 1.4;
}

.news-summary {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.6;
  margin: 0 0 var(--spacing-md) 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-meta {
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.news-actions {
  padding: var(--spacing-sm) var(--spacing-md);
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-icon-only {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-md);
}

.btn-icon-only:hover {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
}

.btn-sm {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--font-size-sm);
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.page-number {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-sm);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
}

.page-number:hover {
  background-color: var(--bg-tertiary);
}

.page-number.active {
  background-color: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .news-list {
    grid-template-columns: 1fr;
  }

  .category-tabs {
    justify-content: center;
  }

  .pagination {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
}
</style>
