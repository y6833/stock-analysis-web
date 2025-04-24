<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { newsService } from '@/services/newsService'
import type { 
  NewsAggregation as NewsAggregationType,
  NewsItem,
  Announcement,
  ResearchReport,
  NewsFilterOptions,
  NewsSortOption
} from '@/types/news'

import NewsList from './NewsList.vue'
import NewsDetail from './NewsDetail.vue'
import AnnouncementList from './AnnouncementList.vue'
import ResearchReportList from './ResearchReportList.vue'

const props = defineProps<{
  symbol: string
}>()

// 数据状态
const isLoading = ref(true)
const error = ref<string | null>(null)
const newsData = ref<NewsAggregationType | null>(null)

// 新闻列表
const newsList = ref<NewsItem[]>([])
// 公告列表
const announcementList = ref<Announcement[]>([])
// 研究报告列表
const researchReportList = ref<ResearchReport[]>([])

// 当前选中的新闻
const selectedNews = ref<NewsItem | null>(null)
// 当前选中的公告
const selectedAnnouncement = ref<Announcement | null>(null)
// 当前选中的研究报告
const selectedReport = ref<ResearchReport | null>(null)

// 当前选中的标签页
const activeTab = ref('news')

// 获取新闻聚合数据
const fetchNewsData = async () => {
  if (!props.symbol) return
  
  isLoading.value = true
  error.value = null
  
  try {
    const data = await newsService.getNewsAggregation(props.symbol)
    newsData.value = data
    
    // 更新各部分数据
    newsList.value = data.news
    announcementList.value = data.announcements
    researchReportList.value = data.researchReports
  } catch (err) {
    console.error('获取新闻数据失败:', err)
    error.value = '获取新闻数据失败，请稍后重试'
    newsData.value = null
    
    // 清空各部分数据
    newsList.value = []
    announcementList.value = []
    researchReportList.value = []
  } finally {
    isLoading.value = false
  }
}

// 监听股票代码变化
watch(() => props.symbol, () => {
  fetchNewsData()
}, { immediate: true })

// 组件挂载时获取数据
onMounted(() => {
  fetchNewsData()
})

// 重新加载数据
const reloadData = () => {
  fetchNewsData()
}

// 处理新闻过滤
const handleNewsFilter = async (options: NewsFilterOptions) => {
  try {
    const filteredNews = await newsService.getNews(props.symbol, options)
    newsList.value = filteredNews
  } catch (err) {
    console.error('过滤新闻失败:', err)
  }
}

// 处理新闻排序
const handleNewsSort = async (option: NewsSortOption) => {
  try {
    const sortedNews = await newsService.getNews(props.symbol, undefined, option)
    newsList.value = sortedNews
  } catch (err) {
    console.error('排序新闻失败:', err)
  }
}

// 处理新闻选择
const handleNewsSelected = (news: NewsItem) => {
  selectedNews.value = news
}

// 处理公告选择
const handleAnnouncementSelected = (announcement: Announcement) => {
  selectedAnnouncement.value = announcement
}

// 处理研究报告选择
const handleReportSelected = (report: ResearchReport) => {
  selectedReport.value = report
}

// 切换标签页
const switchTab = (tab: string) => {
  activeTab.value = tab
}
</script>

<template>
  <div class="news-aggregation">
    <div class="news-header">
      <h2>新闻与公告</h2>
      <div class="header-actions">
        <button 
          class="reload-btn" 
          @click="reloadData" 
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="loading-icon"></span>
          <span v-else>刷新数据</span>
        </button>
      </div>
    </div>
    
    <div v-if="error" class="error-container">
      <p class="error-message">{{ error }}</p>
      <button class="retry-btn" @click="reloadData">重试</button>
    </div>
    
    <div v-else class="news-content">
      <div class="news-tabs">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'news' }"
          @click="switchTab('news')"
        >
          新闻
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'announcements' }"
          @click="switchTab('announcements')"
        >
          公告
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'reports' }"
          @click="switchTab('reports')"
        >
          研究报告
        </button>
      </div>
      
      <div class="news-container" v-if="activeTab === 'news'">
        <div class="news-list-container">
          <NewsList 
            :news="newsList"
            :isLoading="isLoading"
            @filter="handleNewsFilter"
            @sort="handleNewsSort"
            @newsSelected="handleNewsSelected"
          />
        </div>
        <div class="news-detail-container">
          <NewsDetail :news="selectedNews" />
        </div>
      </div>
      
      <div class="announcements-container" v-if="activeTab === 'announcements'">
        <AnnouncementList 
          :announcements="announcementList"
          :isLoading="isLoading"
          @announcementSelected="handleAnnouncementSelected"
        />
      </div>
      
      <div class="reports-container" v-if="activeTab === 'reports'">
        <ResearchReportList 
          :reports="researchReportList"
          :isLoading="isLoading"
          @reportSelected="handleReportSelected"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.news-aggregation {
  width: 100%;
}

.news-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.news-header h2 {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--primary-color);
}

.header-actions {
  display: flex;
  gap: var(--spacing-md);
}

.reload-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.reload-btn:hover:not(:disabled) {
  background-color: var(--bg-tertiary);
}

.reload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-icon {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(66, 185, 131, 0.2);
  border-top: 2px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  gap: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
  margin-bottom: var(--spacing-lg);
}

.error-message {
  color: var(--danger-color);
  font-weight: 500;
}

.retry-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--border-radius-md);
  border: none;
  background-color: var(--primary-color);
  color: white;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.retry-btn:hover {
  background-color: var(--primary-dark);
}

.news-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.news-tabs {
  display: flex;
  gap: var(--spacing-sm);
  border-bottom: 1px solid var(--border-light);
  padding-bottom: var(--spacing-sm);
}

.tab-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
}

.tab-btn:hover {
  background-color: var(--bg-tertiary);
  transform: translateY(-2px);
}

.tab-btn.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.news-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
  height: 600px;
}

.news-list-container,
.news-detail-container {
  height: 100%;
  overflow: hidden;
}

.announcements-container,
.reports-container {
  height: 600px;
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

@media (max-width: 1200px) {
  .news-container {
    grid-template-columns: 1fr;
    height: auto;
  }
  
  .news-list-container,
  .news-detail-container {
    height: 500px;
  }
}

@media (max-width: 768px) {
  .news-tabs {
    flex-wrap: wrap;
  }
  
  .tab-btn {
    flex: 1;
    text-align: center;
  }
}
</style>
