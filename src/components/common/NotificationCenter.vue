<template>
  <div class="notification-center">
    <div class="notification-trigger" @click="toggleNotifications">
      <el-badge :value="unreadCount > 0 ? unreadCount : ''" :max="99" class="notification-badge">
        <el-button class="notification-button" :class="{ 'has-unread': unreadCount > 0 }">
          <el-icon><Bell /></el-icon>
        </el-button>
      </el-badge>
    </div>
    
    <div v-if="showNotifications" class="notification-dropdown">
      <div class="notification-header">
        <h3>通知中心</h3>
        <div class="notification-actions">
          <el-button v-if="unreadCount > 0" type="text" @click="markAllAsRead">
            全部已读
          </el-button>
          <el-button type="text" @click="fetchNotifications">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </div>
      
      <div v-if="isLoading" class="notification-loading">
        <el-skeleton :rows="3" animated />
      </div>
      
      <div v-else-if="notifications.length === 0" class="notification-empty">
        <el-empty description="暂无通知" />
      </div>
      
      <div v-else class="notification-list">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="notification-item"
          :class="{ 'is-unread': !notification.isRead }"
          @click="handleNotificationClick(notification)"
        >
          <div class="notification-icon">
            <el-icon v-if="getNotificationIcon(notification.type) === 'Coin'"><Coin /></el-icon>
            <el-icon v-else-if="getNotificationIcon(notification.type) === 'Check'"><Check /></el-icon>
            <el-icon v-else-if="getNotificationIcon(notification.type) === 'Close'"><Close /></el-icon>
            <el-icon v-else-if="getNotificationIcon(notification.type) === 'InfoFilled'"><InfoFilled /></el-icon>
            <el-icon v-else><Bell /></el-icon>
          </div>
          <div class="notification-content">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-message">{{ notification.content }}</div>
            <div class="notification-time">{{ formatTime(notification.createdAt) }}</div>
          </div>
          <div class="notification-status">
            <div v-if="!notification.isRead" class="unread-dot"></div>
          </div>
        </div>
      </div>
      
      <div class="notification-footer">
        <el-button type="text" @click="viewAllNotifications">
          查看全部通知
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, Refresh, Coin, Check, Close, InfoFilled } from '@element-plus/icons-vue'
import { useToast } from '@/composables/useToast'

// 导入服务
const notificationService = (await import('@/services/notificationService')).default

// 状态
const router = useRouter()
const { showToast } = useToast()
const isLoading = ref(false)
const notifications = ref([])
const unreadCount = ref(0)
const showNotifications = ref(false)

// 获取通知列表
const fetchNotifications = async () => {
  isLoading.value = true
  
  try {
    const result = await notificationService.getUserNotifications({
      page: 1,
      pageSize: 5,
    })
    
    notifications.value = result.list
  } catch (error) {
    console.error('获取通知列表失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 获取未读通知数量
const fetchUnreadCount = async () => {
  try {
    unreadCount.value = await notificationService.getUnreadCount()
  } catch (error) {
    console.error('获取未读通知数量失败:', error)
  }
}

// 标记通知为已读
const markAsRead = async (notificationId: number) => {
  try {
    await notificationService.markAsRead(notificationId)
    
    // 更新本地通知状态
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification) {
      notification.isRead = true
    }
    
    // 更新未读数量
    await fetchUnreadCount()
  } catch (error) {
    console.error('标记通知为已读失败:', error)
  }
}

// 标记所有通知为已读
const markAllAsRead = async () => {
  try {
    await notificationService.markAllAsRead()
    
    // 更新本地通知状态
    notifications.value.forEach(notification => {
      notification.isRead = true
    })
    
    // 更新未读数量
    unreadCount.value = 0
    
    showToast('已将所有通知标记为已读', 'success')
  } catch (error) {
    console.error('标记所有通知为已读失败:', error)
    showToast('标记所有通知为已读失败', 'error')
  }
}

// 切换通知面板
const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value
  
  if (showNotifications.value) {
    fetchNotifications()
  }
}

// 处理通知点击
const handleNotificationClick = async (notification) => {
  // 标记为已读
  if (!notification.isRead) {
    await markAsRead(notification.id)
  }
  
  // 根据通知类型执行不同操作
  if (notification.type.includes('recharge')) {
    // 跳转到充值记录页面
    router.push('/recharge-records')
  } else {
    // 默认行为：关闭通知面板
    showNotifications.value = false
  }
}

// 查看全部通知
const viewAllNotifications = () => {
  router.push('/notifications')
  showNotifications.value = false
}

// 获取通知图标
const getNotificationIcon = (type: string) => {
  if (type.includes('recharge')) {
    return 'Coin'
  } else if (type.includes('completed')) {
    return 'Check'
  } else if (type.includes('rejected') || type.includes('cancelled')) {
    return 'Close'
  } else if (type.includes('system')) {
    return 'InfoFilled'
  }
  return 'Bell'
}

// 格式化时间
const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 一分钟内
  if (diff < 60 * 1000) {
    return '刚刚'
  }
  
  // 一小时内
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))}分钟前`
  }
  
  // 一天内
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))}小时前`
  }
  
  // 一周内
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`
  }
  
  // 其他情况
  return date.toLocaleDateString()
}

// 点击外部关闭通知面板
const handleClickOutside = (event: MouseEvent) => {
  const notificationCenter = document.querySelector('.notification-center')
  if (notificationCenter && !notificationCenter.contains(event.target as Node)) {
    showNotifications.value = false
  }
}

// 定时刷新未读通知数量
let refreshInterval: number | null = null

// 初始化
onMounted(() => {
  // 获取未读通知数量
  fetchUnreadCount()
  
  // 添加点击外部关闭事件
  document.addEventListener('click', handleClickOutside)
  
  // 设置定时刷新
  refreshInterval = window.setInterval(() => {
    fetchUnreadCount()
  }, 60000) // 每分钟刷新一次
})

// 组件卸载
onUnmounted(() => {
  // 移除点击外部关闭事件
  document.removeEventListener('click', handleClickOutside)
  
  // 清除定时器
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.notification-center {
  position: relative;
}

.notification-trigger {
  cursor: pointer;
}

.notification-button {
  font-size: 20px;
  padding: 8px;
  border: none;
  background: transparent;
}

.notification-button.has-unread {
  color: #e6a23c;
}

.notification-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 350px;
  max-height: 500px;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #eee;
}

.notification-header h3 {
  margin: 0;
  font-size: 16px;
}

.notification-actions {
  display: flex;
  gap: 10px;
}

.notification-loading,
.notification-empty {
  padding: 20px;
  flex: 1;
}

.notification-list {
  flex: 1;
  overflow-y: auto;
  max-height: 350px;
}

.notification-item {
  display: flex;
  padding: 15px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
}

.notification-item:hover {
  background-color: #f5f7fa;
}

.notification-item.is-unread {
  background-color: #f0f9eb;
}

.notification-icon {
  margin-right: 15px;
  font-size: 20px;
  color: #409eff;
}

.notification-content {
  flex: 1;
}

.notification-title {
  font-weight: bold;
  margin-bottom: 5px;
}

.notification-message {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notification-time {
  font-size: 12px;
  color: #999;
}

.notification-status {
  display: flex;
  align-items: center;
  margin-left: 10px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #e6a23c;
}

.notification-footer {
  padding: 10px;
  text-align: center;
  border-top: 1px solid #eee;
}
</style>
