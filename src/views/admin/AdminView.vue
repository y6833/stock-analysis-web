<template>
  <div class="admin-view">
    <div class="page-header">
      <h1>管理员后台</h1>
      <p class="subtitle">管理用户、会员和系统数据</p>
    </div>

    <div class="admin-tabs">
      <button
        class="tab-button"
        :class="{ active: activeTab === 'dashboard' }"
        @click="switchTab('dashboard')"
      >
        仪表盘
      </button>
      <button
        class="tab-button"
        :class="{ active: activeTab === 'users' }"
        @click="switchTab('users')"
      >
        用户管理
      </button>
      <button
        class="tab-button"
        :class="{ active: activeTab === 'membership' }"
        @click="switchTab('membership')"
      >
        会员管理
      </button>
      <button
        class="tab-button"
        :class="{ active: activeTab === 'cache' }"
        @click="switchTab('cache')"
      >
        缓存管理
      </button>
    </div>

    <div class="admin-content">
      <!-- 仪表盘 -->
      <div v-if="activeTab === 'dashboard'" class="admin-panel">
        <AdminDashboard />
      </div>

      <!-- 用户管理 -->
      <div v-if="activeTab === 'users'" class="admin-panel">
        <UserManagement />
      </div>

      <!-- 会员管理 -->
      <div v-if="activeTab === 'membership'" class="admin-panel">
        <MembershipManagement />
      </div>

      <!-- 缓存管理 -->
      <div v-if="activeTab === 'cache'" class="admin-panel">
        <CacheManagement />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import AdminDashboard from '@/components/admin/AdminDashboard.vue'
import UserManagement from '@/components/admin/UserManagement.vue'
import MembershipManagement from '@/components/admin/MembershipManagement.vue'
import CacheManagement from '@/components/admin/CacheManagement.vue'

const router = useRouter()
const userStore = useUserStore()

// 状态
const activeTab = ref('dashboard')

// 生命周期钩子
onMounted(() => {
  // 检查是否是管理员
  if (userStore.userRole !== 'admin') {
    router.push({ name: 'dashboard', query: { error: 'permission' } })
    return
  }

  // 从URL参数中获取活动标签
  const tab = router.currentRoute.value.query.tab as string
  if (tab && ['dashboard', 'users', 'membership', 'cache'].includes(tab)) {
    activeTab.value = tab
  }
})

// 切换标签
const switchTab = (tab: string) => {
  activeTab.value = tab
  // 更新URL参数
  router.replace({ query: { ...router.currentRoute.value.query, tab } })
}
</script>

<style scoped>
.admin-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 24px;
  margin-bottom: 5px;
}

.subtitle {
  color: #666;
  font-size: 14px;
}

.admin-tabs {
  display: flex;
  border-bottom: 1px solid #ddd;
  margin-bottom: 20px;
}

.tab-button {
  padding: 10px 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  position: relative;
}

.tab-button:hover {
  color: #333;
}

.tab-button.active {
  color: #1890ff;
  font-weight: 500;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #1890ff;
}

.admin-content {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.admin-panel {
  padding: 20px;
}
</style>
