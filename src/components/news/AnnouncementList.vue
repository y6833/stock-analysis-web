<script setup lang="ts">
import { ref } from 'vue'
import type { Announcement } from '@/types/news'

const props = defineProps<{
  announcements: Announcement[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'announcementSelected', announcement: Announcement): void
}>()

// 当前选中的公告
const selectedAnnouncement = ref<Announcement | null>(null)

// 选择公告
const selectAnnouncement = (announcement: Announcement) => {
  selectedAnnouncement.value = announcement
  emit('announcementSelected', announcement)
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

// 获取公告类型图标
const getAnnouncementTypeIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case '财报':
      return '📊'
    case '分红':
      return '💰'
    case '回购':
      return '🔄'
    case '增持':
      return '📈'
    case '减持':
      return '📉'
    case '重大事项':
      return '⚠️'
    default:
      return '📄'
  }
}

// 获取重要性图标
const getImportanceIcon = (importance: string) => {
  switch (importance) {
    case 'high':
      return '🔴'
    case 'medium':
      return '🟠'
    case 'low':
      return '🟢'
    default:
      return ''
  }
}

// 获取重要性文本
const getImportanceText = (importance: string) => {
  switch (importance) {
    case 'high':
      return '高'
    case 'medium':
      return '中'
    case 'low':
      return '低'
    default:
      return ''
  }
}

// 获取重要性类名
const getImportanceClass = (importance: string) => {
  switch (importance) {
    case 'high':
      return 'importance-high'
    case 'medium':
      return 'importance-medium'
    case 'low':
      return 'importance-low'
    default:
      return ''
  }
}

// 打开原始链接
const openOriginalLink = (url: string) => {
  window.open(url, '_blank')
}
</script>

<template>
  <div class="announcement-list">
    <div class="announcement-header">
      <h3>公司公告</h3>
    </div>
    
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载公告中...</p>
    </div>
    
    <div v-else-if="announcements.length === 0" class="empty-container">
      <p>暂无公告</p>
    </div>
    
    <div v-else class="announcement-items">
      <div 
        v-for="item in announcements" 
        :key="item.id"
        class="announcement-item"
        :class="{ 'selected': selectedAnnouncement && selectedAnnouncement.id === item.id }"
        @click="selectAnnouncement(item)"
      >
        <div class="announcement-item-header">
          <div class="announcement-type">
            <span class="type-icon">{{ getAnnouncementTypeIcon(item.type) }}</span>
            <span class="type-name">{{ item.type }}</span>
          </div>
          <div 
            class="announcement-importance" 
            :class="getImportanceClass(item.importance)"
          >
            <span class="importance-icon">{{ getImportanceIcon(item.importance) }}</span>
            <span class="importance-text">{{ getImportanceText(item.importance) }}</span>
          </div>
        </div>
        
        <h3 class="announcement-title">{{ item.title }}</h3>
        
        <p class="announcement-summary" v-if="item.summary">{{ item.summary }}</p>
        
        <div class="announcement-footer">
          <div class="announcement-time">{{ formatDate(item.publishTime) }}</div>
          <button class="view-btn" @click.stop="openOriginalLink(item.url)">查看</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.announcement-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.announcement-header {
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  border-top-left-radius: var(--border-radius-md);
  border-top-right-radius: var(--border-radius-md);
}

.announcement-header h3 {
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

.announcement-items {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  background-color: var(--bg-primary);
}

.announcement-item {
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  border: 1px solid var(--border-light);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.announcement-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
  border-color: var(--border-color);
}

.announcement-item.selected {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.announcement-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.announcement-type {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.type-icon {
  font-size: var(--font-size-md);
}

.announcement-importance {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
}

.importance-high {
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.importance-medium {
  background-color: rgba(243, 156, 18, 0.1);
  color: #f39c12;
}

.importance-low {
  background-color: rgba(46, 204, 113, 0.1);
  color: #27ae60;
}

.announcement-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-md);
  color: var(--text-primary);
  line-height: 1.4;
}

.announcement-summary {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.announcement-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-xs);
}

.announcement-time {
  color: var(--text-muted);
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
