<template>
  <div class="notifications-view">
    <div class="container">
      <h1 class="page-title">我的通知</h1>
      <div class="page-content">
        <Suspense>
          <template #default>
            <div class="notifications-container">
          <!-- 筛选栏 -->
          <div class="filter-bar">
            <div class="filter-item">
              <span class="filter-label">状态:</span>
              <el-select v-model="filters.isRead" placeholder="全部" clearable>
                <el-option label="全部" :value="null" />
                <el-option label="未读" :value="false" />
                <el-option label="已读" :value="true" />
              </el-select>
            </div>
            <div class="filter-item">
              <span class="filter-label">类型:</span>
              <el-select v-model="filters.type" placeholder="全部" clearable>
                <el-option label="全部" :value="null" />
                <el-option label="充值相关" value="recharge" />
                <el-option label="系统通知" value="system" />
              </el-select>
            </div>
            <div class="filter-actions">
              <el-button type="primary" @click="fetchNotifications">
                <el-icon><Search /></el-icon>
                筛选
              </el-button>
              <el-button @click="resetFilters">
                <el-icon><Refresh /></el-icon>
                重置
              </el-button>
            </div>
          </div>

          <!-- 通知列表 -->
          <div class="notification-list">
            <el-table
              v-loading="isLoading"
              :data="notifications"
              border
              stripe
              style="width: 100%"
            >
              <el-table-column label="状态" width="80">
                <template #default="scope">
                  <el-tag
                    :type="scope.row.isRead ? 'info' : 'warning'"
                    size="small"
                  >
                    {{ scope.row.isRead ? '已读' : '未读' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="标题" prop="title" min-width="150" />
              <el-table-column label="内容" prop="content" min-width="250" show-overflow-tooltip />
              <el-table-column label="时间" width="180">
                <template #default="scope">
                  {{ formatDate(scope.row.createdAt) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="scope">
                  <div class="action-buttons">
                    <el-button
                      v-if="!scope.row.isRead"
                      type="primary"
                      size="small"
                      @click="handleMarkAsRead(scope.row)"
                    >
                      标为已读
                    </el-button>
                    <el-button
                      type="danger"
                      size="small"
                      @click="handleDelete(scope.row)"
                    >
                      删除
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>

            <!-- 分页 -->
            <div class="pagination-container">
              <el-pagination
                v-model:current-page="pagination.page"
                v-model:page-size="pagination.pageSize"
                :page-sizes="[10, 20, 50, 100]"
                layout="total, sizes, prev, pager, next, jumper"
                :total="pagination.total"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
              />
            </div>
          </div>
          </template>
          <template #fallback>
            <div class="loading-container">
              <el-skeleton :rows="10" animated />
            </div>
          </template>
        </Suspense>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { ElMessageBox, ElSkeleton } from 'element-plus'
import { useToast } from '@/composables/useToast'

// 导入服务
import notificationService from '@/services/notificationService'

// 状态
const isLoading = ref(false)
const notifications = ref([])
const { showToast } = useToast()

// 筛选条件
const filters = reactive({
  isRead: null,
  type: null,
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// 获取通知列表
const fetchNotifications = async () => {
  isLoading.value = true

  try {
    const result = await notificationService.getUserNotifications({
      page: pagination.page,
      pageSize: pagination.pageSize,
      isRead: filters.isRead,
      type: filters.type,
    })

    notifications.value = result.list
    pagination.total = result.pagination.total
  } catch (error) {
    console.error('获取通知列表失败:', error)
    showToast('获取通知列表失败', 'error')
  } finally {
    isLoading.value = false
  }
}

// 重置筛选条件
const resetFilters = () => {
  filters.isRead = null
  filters.type = null
  pagination.page = 1
  fetchNotifications()
}

// 处理分页大小变化
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  fetchNotifications()
}

// 处理页码变化
const handleCurrentChange = (page: number) => {
  pagination.page = page
  fetchNotifications()
}

// 标记为已读
const handleMarkAsRead = async (notification) => {
  try {
    await notificationService.markAsRead(notification.id)

    // 更新本地通知状态
    notification.isRead = true

    showToast('通知已标记为已读', 'success')
  } catch (error) {
    console.error('标记通知为已读失败:', error)
    showToast('标记通知为已读失败', 'error')
  }
}

// 删除通知
const handleDelete = async (notification) => {
  try {
    await ElMessageBox.confirm('确定要删除此通知吗？', '删除通知', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await notificationService.deleteNotification(notification.id)

    // 从列表中移除
    notifications.value = notifications.value.filter(n => n.id !== notification.id)

    showToast('通知已删除', 'success')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除通知失败:', error)
      showToast('删除通知失败', 'error')
    }
  }
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  return date.toLocaleString()
}

// 初始化
onMounted(() => {
  fetchNotifications()
})
</script>

<style scoped>
.notifications-view {
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  margin-bottom: 20px;
  font-size: 24px;
  color: #333;
}

.page-content {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.loading-container {
  padding: 20px;
}

.notifications-container {
  padding: 20px;
}

.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 150px;
}

.filter-label {
  font-weight: bold;
  color: #606266;
  width: 50px;
}

.filter-actions {
  margin-left: auto;
  display: flex;
  gap: 10px;
}

.notification-list {
  margin-bottom: 20px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
