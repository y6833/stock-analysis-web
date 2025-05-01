<template>
  <div class="user-management">
    <h2 class="section-title">用户管理</h2>

    <!-- 搜索和过滤 -->
    <div class="filter-bar">
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

      <div class="filter-actions">
        <select v-model="roleFilter" @change="handleFilterChange">
          <option value="">所有角色</option>
          <option value="admin">管理员</option>
          <option value="premium">高级用户</option>
          <option value="user">普通用户</option>
        </select>

        <select v-model="statusFilter" @change="handleFilterChange">
          <option value="">所有状态</option>
          <option value="active">活跃</option>
          <option value="inactive">未激活</option>
          <option value="suspended">已禁用</option>
        </select>

        <select v-model="membershipFilter" @change="handleFilterChange">
          <option value="">所有会员等级</option>
          <option value="free">免费用户</option>
          <option value="basic">基础会员</option>
          <option value="premium">高级会员</option>
          <option value="enterprise">企业版</option>
        </select>
      </div>
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
            <th>ID</th>
            <th>用户名</th>
            <th>邮箱</th>
            <th>角色</th>
            <th>会员等级</th>
            <th>状态</th>
            <th>注册时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.username }}</td>
            <td>{{ user.email }}</td>
            <td>
              <span class="role-badge" :class="'role-' + user.role">
                {{ formatRole(user.role) }}
              </span>
            </td>
            <td>
              <span class="membership-badge" :class="'membership-' + user.membership">
                {{ formatMembership(user.membership) }}
              </span>
            </td>
            <td>
              <span class="status-badge" :class="'status-' + user.status">
                {{ formatStatus(user.status) }}
              </span>
            </td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td>
              <div class="action-buttons">
                <button class="action-btn view" @click="viewUser(user)">
                  <span class="btn-icon">👁️</span>
                </button>
                <button class="action-btn edit" @click="editUser(user)">
                  <span class="btn-icon">✏️</span>
                </button>
                <button
                  class="action-btn"
                  :class="user.status === 'active' ? 'disable' : 'enable'"
                  @click="toggleUserStatus(user)"
                  :disabled="user.id === currentUserId"
                >
                  <span class="btn-icon">{{ user.status === 'active' ? '🔒' : '🔓' }}</span>
                </button>
              </div>
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

    <!-- 用户详情对话框 -->
    <div v-if="showUserDetail" class="modal-overlay" @click="closeUserDetail">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>用户详情</h3>
          <button class="close-btn" @click="closeUserDetail">×</button>
        </div>
        <div class="modal-body">
          <div v-if="isLoadingDetail" class="loading-state">
            <div class="spinner"></div>
            <p>加载中...</p>
          </div>
          <div v-else-if="detailError" class="error-message">
            {{ detailError }}
          </div>
          <div v-else-if="userDetail" class="user-detail">
            <div class="detail-section">
              <h4>基本信息</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">用户名</span>
                  <span class="detail-value">{{ userDetail.username }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">邮箱</span>
                  <span class="detail-value">{{ userDetail.email }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">角色</span>
                  <span class="detail-value">{{ formatRole(userDetail.role) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">状态</span>
                  <span class="detail-value">{{ formatStatus(userDetail.status) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">注册时间</span>
                  <span class="detail-value">{{ formatDate(userDetail.createdAt) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">最后登录</span>
                  <span class="detail-value">{{ formatDate(userDetail.lastLogin) }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h4>会员信息</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">会员等级</span>
                  <span class="detail-value">{{ formatMembership(userDetail.membership) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">有效等级</span>
                  <span class="detail-value">{{
                    formatMembership(userDetail.membership?.effectiveLevel || userDetail.membership)
                  }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">是否过期</span>
                  <span class="detail-value">{{
                    userDetail.membership?.expired ? '是' : '否'
                  }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">过期时间</span>
                  <span class="detail-value">{{ formatDate(userDetail.membershipExpires) }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h4>用户数据</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">关注列表</span>
                  <span class="detail-value">{{ userDetail.UserWatchlists?.length || 0 }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">投资组合</span>
                  <span class="detail-value">{{ userDetail.UserPortfolios?.length || 0 }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">提醒设置</span>
                  <span class="detail-value">{{ userDetail.UserAlerts?.length || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑用户对话框 -->
    <div v-if="showEditUser" class="modal-overlay" @click="closeEditUser">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>编辑用户</h3>
          <button class="close-btn" @click="closeEditUser">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveUserChanges" class="edit-form">
            <div class="form-group">
              <label for="username">用户名</label>
              <input type="text" id="username" v-model="editForm.username" disabled />
            </div>

            <div class="form-group">
              <label for="email">邮箱</label>
              <input type="email" id="email" v-model="editForm.email" required />
            </div>

            <div class="form-group">
              <label for="role">角色</label>
              <select id="role" v-model="editForm.role" required>
                <option value="user">普通用户</option>
                <option value="premium">高级用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>

            <div class="form-group">
              <label for="status">状态</label>
              <select
                id="status"
                v-model="editForm.status"
                required
                :disabled="editForm.id === currentUserId"
              >
                <option value="active">活跃</option>
                <option value="inactive">未激活</option>
                <option value="suspended">已禁用</option>
              </select>
              <small v-if="editForm.id === currentUserId" class="form-hint">
                不能修改当前登录用户的状态
              </small>
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
              <button type="button" class="btn btn-cancel" @click="closeEditUser">取消</button>
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
import { ref, onMounted, computed } from 'vue'
import { adminService } from '@/services/adminService'
import { useUserStore } from '@/stores/userStore'
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
const roleFilter = ref('')
const statusFilter = ref('')
const membershipFilter = ref('')
const showUserDetail = ref(false)
const showEditUser = ref(false)
const isLoadingDetail = ref(false)
const detailError = ref('')
const userDetail = ref<any>(null)
const editForm = ref<any>({})
const isSaving = ref(false)

const userStore = useUserStore()
const { showToast } = useToast()

// 计算属性
const currentUserId = computed(() => userStore.user?.id)

// 生命周期钩子
onMounted(async () => {
  await fetchUsers()
})

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
      role: roleFilter.value,
      status: statusFilter.value,
      membership: membershipFilter.value,
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

// 过滤用户
const handleFilterChange = () => {
  // 重置页码
  currentPage.value = 1
  fetchUsers()
}

// 切换页码
const changePage = (page: number) => {
  currentPage.value = page
  fetchUsers()
}

// 查看用户详情
const viewUser = async (user: any) => {
  showUserDetail.value = true
  isLoadingDetail.value = true
  detailError.value = ''

  try {
    const response = await adminService.getUserDetail(user.id)
    userDetail.value = response.data
  } catch (err: any) {
    console.error('获取用户详情失败:', err)
    detailError.value = err.message || '获取用户详情失败'
    showToast(detailError.value, 'error')
  } finally {
    isLoadingDetail.value = false
  }
}

// 关闭用户详情对话框
const closeUserDetail = () => {
  showUserDetail.value = false
  userDetail.value = null
}

// 编辑用户
const editUser = (user: any) => {
  // 复制用户数据到编辑表单
  editForm.value = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    membership: user.membership,
    membershipExpires: user.membershipExpires
      ? new Date(user.membershipExpires).toISOString().slice(0, 16)
      : '',
  }
  showEditUser.value = true
}

// 关闭编辑用户对话框
const closeEditUser = () => {
  showEditUser.value = false
  editForm.value = {}
}

// 保存用户修改
const saveUserChanges = async () => {
  isSaving.value = true

  try {
    // 准备更新数据
    const updateData = {
      email: editForm.value.email,
      role: editForm.value.role,
      status: editForm.value.status,
      membership: editForm.value.membership,
      membershipExpires: editForm.value.membershipExpires || null,
    }

    // 发送更新请求
    const response = await adminService.updateUser(editForm.value.id, updateData)

    // 更新成功
    showToast('用户信息更新成功', 'success')
    closeEditUser()

    // 刷新用户列表
    await fetchUsers()
  } catch (err: any) {
    console.error('更新用户信息失败:', err)
    showToast(err.message || '更新用户信息失败', 'error')
  } finally {
    isSaving.value = false
  }
}

// 切换用户状态
const toggleUserStatus = async (user: any) => {
  // 不允许修改当前登录用户的状态
  if (user.id === currentUserId.value) {
    showToast('不能修改当前登录用户的状态', 'warning')
    return
  }

  try {
    const newStatus = user.status === 'active' ? 'suspended' : 'active'
    await adminService.updateUserStatus(user.id, newStatus)

    // 更新成功
    showToast(`用户状态已更新为${formatStatus(newStatus)}`, 'success')

    // 刷新用户列表
    await fetchUsers()
  } catch (err: any) {
    console.error('更新用户状态失败:', err)
    showToast(err.message || '更新用户状态失败', 'error')
  }
}

// 格式化角色
const formatRole = (role: string) => {
  const roleMap: Record<string, string> = {
    admin: '管理员',
    premium: '高级用户',
    user: '普通用户',
  }
  return roleMap[role] || role
}

// 格式化状态
const formatStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    active: '活跃',
    inactive: '未激活',
    suspended: '已禁用',
  }
  return statusMap[status] || status
}

// 格式化会员等级
const formatMembership = (membership: string) => {
  const membershipMap: Record<string, string> = {
    free: '免费用户',
    basic: '基础会员',
    premium: '高级会员',
    enterprise: '企业版',
  }
  return membershipMap[membership] || membership
}

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '未设置'
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
.user-management {
  width: 100%;
}

.section-title {
  font-size: 20px;
  margin-bottom: 20px;
  color: #333;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.search-box {
  display: flex;
  align-items: center;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  overflow: hidden;
  width: 300px;
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

.filter-actions {
  display: flex;
  gap: 10px;
}

.filter-actions select {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  outline: none;
  font-size: 14px;
  background-color: white;
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

.role-badge,
.status-badge,
.membership-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.role-admin {
  background-color: #e6f7ff;
  color: #1890ff;
}

.role-premium {
  background-color: #fff7e6;
  color: #fa8c16;
}

.role-user {
  background-color: #f9f0ff;
  color: #722ed1;
}

.status-active {
  background-color: #f6ffed;
  color: #52c41a;
}

.status-inactive {
  background-color: #f5f5f5;
  color: #8c8c8c;
}

.status-suspended {
  background-color: #fff2f0;
  color: #f5222d;
}

.membership-free {
  background-color: #f5f5f5;
  color: #8c8c8c;
}

.membership-basic {
  background-color: #e6f7ff;
  color: #1890ff;
}

.membership-premium {
  background-color: #fff7e6;
  color: #fa8c16;
}

.membership-enterprise {
  background-color: #f6ffed;
  color: #52c41a;
}

.action-buttons {
  display: flex;
  gap: 5px;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
}

.action-btn:hover {
  background-color: #f0f0f0;
}

.action-btn.view {
  color: #1890ff;
}

.action-btn.edit {
  color: #fa8c16;
}

.action-btn.disable {
  color: #f5222d;
}

.action-btn.enable {
  color: #52c41a;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  max-width: 600px;
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

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #333;
  border-bottom: 1px solid #e8e8e8;
  padding-bottom: 8px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
}

.detail-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.detail-value {
  font-size: 14px;
  color: #333;
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

.form-group input,
.form-group select {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:disabled,
.form-group select:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
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
