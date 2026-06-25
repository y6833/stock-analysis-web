<template>
  <PageLayout title="我的通知" subtitle="查看和管理系统通知">
    <div class="page-content glass-card">
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
                  <el-icon>
                    <Search />
                  </el-icon>
                  筛选
                </el-button>
                <el-button @click="resetFilters">
                  <el-icon>
                    <Refresh />
                  </el-icon>
                  重置
                </el-button>
              </div>
            </div>

            <!-- 通知列表 -->
            <div class="notification-list">
              <el-table v-loading="isLoading" :data="notifications" border stripe style="width: 100%">
                <el-table-column label="状态" width="80">
                  <template #default="scope">
                    <el-tag :type="scope.row.isRead ? 'info' : 'warning'" size="small">
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
                      <el-button type="danger" size="small" @click="handleDelete(scope.row)">
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
          </div>
        </template>
        <template #fallback>
          <div class="loading-container">
            <el-skeleton :rows="10" animated />
          </div>
        </template>
      </Suspense>
    </div>
  </PageLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { ElMessageBox, ElSkeleton } from 'element-plus'
import { useToast } from '@/composables/useToast'
import PageLayout from '@/components/common/PageLayout.vue'

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
    pagination.total = result.pagination?.total ?? 0
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

// 标记为已读
const handleMarkAsRead = async (notification: { id: number }) => {
  try {
    await notificationService.markAsRead(notification.id)
    showToast('已标记为已读', 'success')
    fetchNotifications()
  } catch (error) {
    console.error('标记已读失败:', error)
    showToast('标记已读失败', 'error')
  }
}

// 删除通知
const handleDelete = async (notification: { id: number }) => {
  try {
    await ElMessageBox.confirm('确定要删除这条通知吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await notificationService.deleteNotification(notification.id)
    showToast('删除成功', 'success')
    fetchNotifications()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除通知失败:', error)
      showToast('删除通知失败', 'error')
    }
  }
}

// 分页处理
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  fetchNotifications()
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
  fetchNotifications()
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
.page-content {
  overflow: hidden;
}

.loading-container {
  padding: var(--spacing-lg);
}

.notifications-container {
  padding: var(--spacing-lg);
}

.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
}

.filter-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 150px;
}

.filter-label {
  font-weight: 600;
  color: var(--text-secondary);
  width: 50px;
}

.filter-actions {
  margin-left: auto;
  display: flex;
  gap: var(--spacing-sm);
}

.notification-list {
  margin-bottom: var(--spacing-lg);
}

.action-buttons {
  display: flex;
  gap: var(--spacing-sm);
}

.pagination-container {
  margin-top: var(--spacing-lg);
  display: flex;
  justify-content: flex-end;
}
</style>
