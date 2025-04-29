<template>
  <div class="admin-dashboard">
    <h2 class="section-title">系统概览</h2>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>

    <template v-else>
      <!-- 统计卡片 -->
      <div class="stats-grid">
        <!-- 用户统计 -->
        <div class="stats-card">
          <div class="card-header">
            <h3>用户统计</h3>
            <span class="card-icon">👥</span>
          </div>
          <div class="card-body">
            <div class="stat-item">
              <span class="stat-label">总用户数</span>
              <span class="stat-value">{{ stats.userStats.total }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">活跃用户</span>
              <span class="stat-value">{{ stats.userStats.active }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">管理员</span>
              <span class="stat-value">{{ stats.userStats.admin }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">高级用户</span>
              <span class="stat-value">{{ stats.userStats.premium }}</span>
            </div>
          </div>
        </div>

        <!-- 会员统计 -->
        <div class="stats-card">
          <div class="card-header">
            <h3>会员统计</h3>
            <span class="card-icon">⭐</span>
          </div>
          <div class="card-body">
            <div class="stat-item">
              <span class="stat-label">免费用户</span>
              <span class="stat-value">{{ stats.membershipStats.free }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">基础会员</span>
              <span class="stat-value">{{ stats.membershipStats.basic }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">高级会员</span>
              <span class="stat-value">{{ stats.membershipStats.premium }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">企业版</span>
              <span class="stat-value">{{ stats.membershipStats.enterprise }}</span>
            </div>
          </div>
        </div>

        <!-- 数据统计 -->
        <div class="stats-card">
          <div class="card-header">
            <h3>数据统计</h3>
            <span class="card-icon">📊</span>
          </div>
          <div class="card-body">
            <div class="stat-item">
              <span class="stat-label">关注列表</span>
              <span class="stat-value">{{ stats.dataStats.watchlists }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">投资组合</span>
              <span class="stat-value">{{ stats.dataStats.portfolios }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">提醒设置</span>
              <span class="stat-value">{{ stats.dataStats.alerts }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 最近用户 -->
      <div class="recent-section">
        <h3 class="section-subtitle">最近注册的用户</h3>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>用户名</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>状态</th>
                <th>注册时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in stats.recentUsers" :key="user.id">
                <td>{{ user.username }}</td>
                <td>{{ user.email }}</td>
                <td>
                  <span class="role-badge" :class="'role-' + user.role">
                    {{ formatRole(user.role) }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" :class="'status-' + user.status">
                    {{ formatStatus(user.status) }}
                  </span>
                </td>
                <td>{{ formatDate(user.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 最近登录 -->
      <div class="recent-section">
        <h3 class="section-subtitle">最近登录的用户</h3>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>用户名</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>状态</th>
                <th>最后登录</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in stats.recentLogins" :key="user.id">
                <td>{{ user.username }}</td>
                <td>{{ user.email }}</td>
                <td>
                  <span class="role-badge" :class="'role-' + user.role">
                    {{ formatRole(user.role) }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" :class="'status-' + user.status">
                    {{ formatStatus(user.status) }}
                  </span>
                </td>
                <td>{{ formatDate(user.lastLogin) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminService, type SystemStatsResponse } from '@/services/adminService'
import { useToast } from '@/composables/useToast'

// 状态
const isLoading = ref(true)
const error = ref('')
const stats = ref<SystemStatsResponse['data']>({
  userStats: { total: 0, active: 0, admin: 0, premium: 0 },
  membershipStats: { free: 0, basic: 0, premium: 0, enterprise: 0 },
  dataStats: { watchlists: 0, portfolios: 0, alerts: 0 },
  recentUsers: [],
  recentLogins: [],
})

const { showToast } = useToast()

// 生命周期钩子
onMounted(async () => {
  await fetchSystemStats()
})

// 获取系统统计信息
const fetchSystemStats = async () => {
  isLoading.value = true
  error.value = ''

  try {
    const response = await adminService.getSystemStats()
    stats.value = response.data
  } catch (err: any) {
    console.error('获取系统统计信息失败:', err)
    error.value = err.message || '获取系统统计信息失败'
    showToast(error.value, 'error')
  } finally {
    isLoading.value = false
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

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '未知'
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
.admin-dashboard {
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stats-card {
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
  background-color: #f5f5f5;
  border-bottom: 1px solid #e8e8e8;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.card-icon {
  font-size: 20px;
}

.card-body {
  padding: 15px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.stat-item:last-child {
  margin-bottom: 0;
}

.stat-label {
  color: #666;
}

.stat-value {
  font-weight: 500;
  color: #333;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #e8e8e8;
}

.data-table th {
  background-color: #f5f5f5;
  font-weight: 500;
  color: #333;
}

.data-table tr:hover {
  background-color: #f5f5f5;
}

.role-badge,
.status-badge {
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
</style>
