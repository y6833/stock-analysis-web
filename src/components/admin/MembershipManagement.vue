<template>
  <div class="membership-management">
    <h2 class="section-title">会员管理</h2>

    <!-- 会员等级概览 -->
    <div class="membership-overview">
      <div class="membership-card" v-for="level in membershipLevels" :key="level.level">
        <div class="card-header" :class="'membership-' + level.level">
          <h3>{{ level.name }}</h3>
          <span class="membership-badge">{{ level.level.toUpperCase() }}</span>
        </div>
        <div class="card-body">
          <p class="description">{{ level.description }}</p>
          <div class="features">
            <h4>包含功能</h4>
            <ul>
              <li v-for="(feature, index) in level.features" :key="index">
                {{ feature }}
              </li>
            </ul>
          </div>
          <div class="limits">
            <div class="limit-item">
              <span class="limit-label">数据刷新间隔</span>
              <span class="limit-value">{{
                formatRefreshInterval(level.dataRefreshInterval)
              }}</span>
            </div>
            <div class="limit-item">
              <span class="limit-label">最大关注股票数</span>
              <span class="limit-value">{{ formatLimit(level.maxWatchlistItems) }}</span>
            </div>
            <div class="limit-item">
              <span class="limit-label">最大提醒数</span>
              <span class="limit-value">{{ formatLimit(level.maxAlerts) }}</span>
            </div>
            <div class="limit-item">
              <span class="limit-label">数据源限制</span>
              <span class="limit-value">{{ formatLimit(level.dataSourceLimit) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 会员统计 -->
    <div class="membership-stats">
      <h3 class="section-subtitle">会员统计</h3>
      <div class="stats-container">
        <div class="stats-card" v-for="(count, level) in membershipStats" :key="level">
          <div class="stats-header" :class="'membership-' + level">
            <h4>{{ formatMembershipName(level) }}</h4>
          </div>
          <div class="stats-body">
            <div class="stats-value">{{ count }}</div>
            <div class="stats-label">用户</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 会员管理 -->
    <div class="user-membership-management">
      <h3 class="section-subtitle">用户会员管理</h3>

      <!-- 搜索用户 -->
      <div class="search-box">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="搜索用户名或邮箱"
          @input="handleSearch"
        />
        <button class="search-btn" @click="handleSearch">
          <span class="search-icon">🔍</span>
        </button>
      </div>

      <!-- 用户列表 -->
      <div class="user-list-container">
        <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="error" class="error-message">
          {{ error }}
        </div>

        <div v-else-if="users.length === 0" class="empty-state">
          <p>没有找到符合条件的用户</p>
        </div>

        <table v-else class="user-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>邮箱</th>
              <th>会员等级</th>
              <th>过期时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.username }}</td>
              <td>{{ user.email }}</td>
              <td>
                <span class="membership-badge" :class="'membership-' + user.membership">
                  {{ formatMembershipName(user.membership) }}
                </span>
              </td>
              <td>{{ formatDate(user.membershipExpires) }}</td>
              <td>
                <span
                  class="status-badge"
                  :class="
                    user.membershipExpires && new Date(user.membershipExpires) < new Date()
                      ? 'status-expired'
                      : 'status-active'
                  "
                >
                  {{
                    user.membershipExpires && new Date(user.membershipExpires) < new Date()
                      ? '已过期'
                      : '有效'
                  }}
                </span>
              </td>
              <td>
                <button class="action-btn edit" @click="editMembership(user)">
                  <span class="btn-icon">✏️</span>
                  <span class="btn-text">修改</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 分页 -->
        <div v-if="users.length > 0" class="pagination">
          <button
            class="pagination-btn"
            :disabled="currentPage === 1"
            @click="changePage(currentPage - 1)"
          >
            上一页
          </button>
          <span class="pagination-info">
            第 {{ currentPage }} 页，共 {{ totalPages }} 页，总计 {{ totalItems }} 条
          </span>
          <button
            class="pagination-btn"
            :disabled="currentPage === totalPages"
            @click="changePage(currentPage + 1)"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑会员对话框 -->
    <div v-if="showEditMembership" class="modal-overlay" @click="closeEditMembership">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>编辑会员信息</h3>
          <button class="close-btn" @click="closeEditMembership">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveMembershipChanges" class="edit-form">
            <div class="form-group">
              <label>用户</label>
              <div class="user-info">
                <span class="username">{{ editForm.username }}</span>
                <span class="email">{{ editForm.email }}</span>
              </div>
            </div>

            <div class="form-group">
              <label for="membership">会员等级</label>
              <select id="membership" v-model="editForm.membership" required>
                <option value="free">免费用户</option>
                <option value="basic">基础会员</option>
                <option value="premium">高级会员</option>
                <option value="enterprise">企业版</option>
              </select>
            </div>

            <div class="form-group">
              <label for="membershipExpires">会员到期时间</label>
              <input
                type="datetime-local"
                id="membershipExpires"
                v-model="editForm.membershipExpires"
              />
              <small class="form-hint">留空表示永不过期</small>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-cancel" @click="closeEditMembership">
                取消
              </button>
              <button type="submit" class="btn btn-save" :disabled="isSaving">
                {{ isSaving ? '保存中...' : '保存' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminService } from '@/services/adminService'
import { membershipService } from '@/services/membershipService'
import type { MembershipLevel } from '@/services/membershipService'
import { useToast } from '@/composables/useToast'

// 状态
const isLoading = ref(false)
const error = ref('')
const users = ref<any[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)
const totalPages = ref(1)
const searchQuery = ref('')
const membershipLevels = ref<MembershipLevel[]>([])
const membershipStats = ref<Record<string, number>>({
  free: 0,
  basic: 0,
  premium: 0,
  enterprise: 0,
})
const showEditMembership = ref(false)
const editForm = ref<any>({})
const isSaving = ref(false)

const { showToast } = useToast()

// 生命周期钩子
onMounted(async () => {
  await Promise.all([fetchMembershipLevels(), fetchUsers(), fetchMembershipStats()])
})

// 获取会员等级列表
const fetchMembershipLevels = async () => {
  try {
    membershipLevels.value = await membershipService.getMembershipLevels()
  } catch (err: any) {
    console.error('获取会员等级列表失败:', err)
    showToast(err.message || '获取会员等级列表失败', 'error')
  }
}

// 获取会员统计信息
const fetchMembershipStats = async () => {
  try {
    const response = await adminService.getSystemStats()
    membershipStats.value = response.data.membershipStats
  } catch (err: any) {
    console.error('获取会员统计信息失败:', err)
    showToast(err.message || '获取会员统计信息失败', 'error')
  }
}

// 获取用户列表
const fetchUsers = async () => {
  isLoading.value = true
  error.value = ''

  try {
    const response = await adminService.getAllUsers({
      page: currentPage.value,
      pageSize: pageSize.value,
      sortBy: 'id',
      sortOrder: 'asc',
      search: searchQuery.value,
    })

    users.value = response.data
    totalItems.value = response.pagination.total
    totalPages.value = response.pagination.totalPages
  } catch (err: any) {
    console.error('获取用户列表失败:', err)
    error.value = err.message || '获取用户列表失败'
    showToast(error.value, 'error')
  } finally {
    isLoading.value = false
  }
}

// 搜索用户
const handleSearch = () => {
  // 重置页码
  currentPage.value = 1
  fetchUsers()
}

// 切换页码
const changePage = (page: number) => {
  currentPage.value = page
  fetchUsers()
}

// 编辑会员信息
const editMembership = (user: any) => {
  // 复制用户数据到编辑表单
  editForm.value = {
    id: user.id,
    username: user.username,
    email: user.email,
    membership: user.membership,
    membershipExpires: user.membershipExpires
      ? new Date(user.membershipExpires).toISOString().slice(0, 16)
      : '',
  }
  showEditMembership.value = true
}

// 关闭编辑会员对话框
const closeEditMembership = () => {
  showEditMembership.value = false
  editForm.value = {}
}

// 保存会员修改
const saveMembershipChanges = async () => {
  isSaving.value = true

  try {
    // 准备更新数据
    const updateData = {
      userId: editForm.value.id,
      level: editForm.value.membership,
      expiresAt: editForm.value.membershipExpires || null,
    }

    // 发送更新请求
    await membershipService.updateMembership(updateData)

    // 更新成功
    showToast('会员信息更新成功', 'success')
    closeEditMembership()

    // 刷新用户列表和统计信息
    await Promise.all([fetchUsers(), fetchMembershipStats()])
  } catch (err: any) {
    console.error('更新会员信息失败:', err)
    showToast(err.message || '更新会员信息失败', 'error')
  } finally {
    isSaving.value = false
  }
}

// 格式化会员名称
const formatMembershipName = (level: string) => {
  const nameMap: Record<string, string> = {
    free: '免费用户',
    basic: '基础会员',
    premium: '高级会员',
    enterprise: '企业版',
  }
  return nameMap[level] || level
}

// 格式化刷新间隔
const formatRefreshInterval = (interval: number) => {
  if (interval < 60 * 1000) {
    return `${interval / 1000}秒`
  } else if (interval < 60 * 60 * 1000) {
    return `${interval / (60 * 1000)}分钟`
  } else {
    return `${interval / (60 * 60 * 1000)}小时`
  }
}

// 格式化限制
const formatLimit = (limit: number) => {
  if (limit === -1) {
    return '无限制'
  }
  return limit.toString()
}

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '永不过期'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.membership-management {
  width: 100%;
}

.section-title {
  font-size: 20px;
  margin-bottom: 20px;
  color: #333;
}

.section-subtitle {
  font-size: 18px;
  margin: 30px 0 15px;
  color: #333;
}

.membership-overview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.membership-card {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  color: white;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
}

.membership-free .card-header {
  background-color: #8c8c8c;
}

.membership-basic .card-header {
  background-color: #1890ff;
}

.membership-premium .card-header {
  background-color: #fa8c16;
}

.membership-enterprise .card-header {
  background-color: #52c41a;
}

.membership-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  background-color: rgba(255, 255, 255, 0.2);
}

.card-body {
  padding: 15px;
}

.description {
  margin: 0 0 15px;
  color: #666;
}

.features h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #333;
}

.features ul {
  margin: 0;
  padding-left: 20px;
  color: #666;
}

.features li {
  margin-bottom: 5px;
}

.limits {
  margin-top: 15px;
  border-top: 1px solid #e8e8e8;
  padding-top: 15px;
}

.limit-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.limit-label {
  color: #666;
}

.limit-value {
  font-weight: 500;
  color: #333;
}

.membership-stats {
  margin-bottom: 30px;
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.stats-card {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.stats-header {
  padding: 10px 15px;
}

.stats-header h4 {
  margin: 0;
  font-size: 14px;
}

.stats-body {
  padding: 15px;
  text-align: center;
}

.stats-value {
  font-size: 24px;
  font-weight: 500;
  color: #333;
  margin-bottom: 5px;
}

.stats-label {
  color: #666;
  font-size: 14px;
}

.search-box {
  display: flex;
  align-items: center;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  overflow: hidden;
  width: 300px;
  margin-bottom: 20px;
}

.search-box input {
  flex: 1;
  padding: 8px 12px;
  border: none;
  outline: none;
  font-size: 14px;
}

.search-btn {
  background: none;
  border: none;
  padding: 8px 12px;
  cursor: pointer;
  color: #666;
}

.search-btn:hover {
  color: #1890ff;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #1890ff;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  padding: 20px;
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  color: #f5222d;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #999;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
}

.user-table th,
.user-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #e8e8e8;
}

.user-table th {
  background-color: #f5f5f5;
  font-weight: 500;
  color: #333;
}

.user-table tr:hover {
  background-color: #f5f5f5;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.status-active {
  background-color: #f6ffed;
  color: #52c41a;
}

.status-expired {
  background-color: #fff2f0;
  color: #f5222d;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  color: #1890ff;
}

.action-btn:hover {
  background-color: #f0f0f0;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding: 10px 0;
}

.pagination-btn {
  padding: 6px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
}

.pagination-btn:hover:not(:disabled) {
  color: #1890ff;
  border-color: #1890ff;
}

.pagination-btn:disabled {
  color: #d9d9d9;
  cursor: not-allowed;
}

.pagination-info {
  color: #666;
  font-size: 14px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e8e8e8;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
}

.close-btn:hover {
  color: #666;
}

.modal-body {
  padding: 24px;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 8px;
  font-size: 14px;
  color: #333;
}

.user-info {
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
}

.username {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.email {
  color: #666;
  font-size: 14px;
}

.form-group input,
.form-group select {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
}

.form-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: none;
}

.btn-cancel {
  background-color: white;
  border: 1px solid #d9d9d9;
  color: #666;
}

.btn-save {
  background-color: #1890ff;
  color: white;
}

.btn-cancel:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.btn-save:hover {
  background-color: #40a9ff;
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
