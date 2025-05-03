<template>
  <div class="admin-view">
    <div class="page-header">
      <h1>管理员后台</h1>
      <p class="subtitle">管理用户、会员和系统数据</p>
    </div>

    <el-tabs v-model="activeTab" @tab-click="handleTabClick" class="admin-tabs">
      <el-tab-pane label="仪表盘" name="dashboard"></el-tab-pane>
      <el-tab-pane label="用户管理" name="users"></el-tab-pane>
      <el-tab-pane label="会员管理" name="membership"></el-tab-pane>
      <el-tab-pane label="充值管理" name="recharge"></el-tab-pane>
      <el-tab-pane label="页面管理" name="pages"></el-tab-pane>
      <el-tab-pane label="缓存管理" name="cache"></el-tab-pane>
    </el-tabs>

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

      <!-- 充值管理 -->
      <div v-if="activeTab === 'recharge'" class="admin-panel">
        <Suspense>
          <template #default>
            <RechargeRequestManagement />
          </template>
          <template #fallback>
            <div class="loading-container">
              <el-skeleton :rows="10" animated />
            </div>
          </template>
        </Suspense>
      </div>

      <!-- 页面管理 -->
      <div v-if="activeTab === 'pages'" class="admin-panel">
        <PageManagement />
      </div>

      <!-- 缓存管理 -->
      <div v-if="activeTab === 'cache'" class="admin-panel">
        <CacheManagement />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, Suspense } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useToast } from '@/composables/useToast'

// 导入管理组件
import AdminDashboard from '@/components/admin/AdminDashboard.vue'
import UserManagement from '@/components/admin/UserManagement.vue'
import MembershipManagement from '@/components/admin/MembershipManagement.vue'
import CacheManagement from '@/components/admin/CacheManagement.vue'
import RechargeRequestManagement from '@/components/admin/RechargeRequestManagement.vue'
import PageManagement from '@/components/admin/PageManagement.vue'

const router = useRouter()
const userStore = useUserStore()
const { showToast } = useToast()

// 状态
const activeTab = ref('dashboard')

// 生命周期钩子
onMounted(async () => {
  // 检查是否是管理员
  if (userStore.userRole !== 'admin') {
    showToast('只有管理员才能访问此页面', 'error')
    router.push({ name: 'dashboard', query: { error: 'permission' } })
    return
  }

  // 从URL参数中获取活动标签
  const tab = router.currentRoute.value.query.tab as string
  if (tab && ['dashboard', 'users', 'membership', 'recharge', 'pages', 'cache'].includes(tab)) {
    activeTab.value = tab
  }
})

// 处理标签点击
const handleTabClick = (tab: any) => {
  // 更新URL参数
  router.replace({ query: { ...router.currentRoute.value.query, tab: tab.props.name } })
}
</script>

<style scoped>
.admin-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin-bottom: 5px;
}

.subtitle {
  color: #666;
}

.admin-tabs {
  margin-bottom: 20px;
}

.admin-content {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.admin-panel {
  padding: 20px;
}

.loading-container {
  padding: 20px;
  min-height: 400px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .admin-view {
    padding: 10px;
  }
}
</style>
