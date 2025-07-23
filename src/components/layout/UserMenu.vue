<template>
  <div class="user-section">
    <!-- 数据源状态指示器 -->
    <DataSourceIndicator v-if="isLoggedIn" />

    <!-- 数据刷新按钮 -->
    <DataRefreshButton
      v-if="isLoggedIn"
      :showText="false"
      @refresh-success="handleRefreshSuccess"
      @refresh-error="handleRefreshError"
    />

    <!-- 缓存状态指示器 -->
    <div
      class="cache-indicator-wrapper"
      v-if="isLoggedIn && userStore.userRole === 'admin'"
    >
      <CacheStatusIndicator />
    </div>

    <!-- 搜索按钮 -->
    <button class="btn btn-outline" @click="$emit('toggle-search')">
      <span class="icon">🔍</span>
    </button>

    <!-- 通知中心 -->
    <NotificationCenter v-if="isLoggedIn" />

    <!-- 未登录状态 -->
    <template v-if="!isLoggedIn">
      <button @click="login" class="btn btn-outline login-btn">登录</button>
      <button @click="register" class="btn btn-primary register-btn">注册</button>
    </template>

    <!-- 已登录状态 - 用户菜单 -->
    <div v-else class="dropdown-container user-dropdown">
      <button
        class="user-avatar-btn"
        :class="{ active: dropdownOpen.user }"
        @click="toggleDropdown('user')"
      >
        <img :src="userAvatar" :alt="username" class="user-avatar" />
        <span class="username">{{ username }}</span>
        <span class="dropdown-arrow">▼</span>
      </button>

      <div class="dropdown-menu user-menu" v-show="dropdownOpen.user">
        <div class="user-menu-header">
          <img :src="userAvatar" :alt="username" class="user-menu-avatar" />
          <div class="user-menu-info">
            <div class="user-menu-name">{{ username }}</div>
            <div class="user-menu-role">
              <span
                class="membership-badge"
                :class="`membership-${userStore.membershipLevel}`"
              >
                {{ userStore.membershipLevel.toUpperCase() }}
              </span>
            </div>
          </div>
        </div>

        <div class="user-menu-divider"></div>

        <RouterLink to="/user/profile" class="dropdown-item">
          <span class="item-icon">👤</span>
          <span>个人资料</span>
        </RouterLink>

        <RouterLink to="/membership" class="dropdown-item">
          <span class="item-icon">⭐</span>
          <span>会员中心</span>
        </RouterLink>

        <RouterLink to="/user/settings" class="dropdown-item">
          <span class="item-icon">⚙️</span>
          <span>账户设置</span>
        </RouterLink>

        <div class="user-menu-divider"></div>

        <button @click="logout" class="dropdown-item logout-item">
          <span class="item-icon">🚪</span>
          <span>退出登录</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import DataSourceIndicator from '@/components/common/DataSourceIndicator.vue'
import DataRefreshButton from '@/components/common/DataRefreshButton.vue'
import CacheStatusIndicator from '@/components/common/CacheStatusIndicator.vue'
import NotificationCenter from '@/components/common/NotificationCenter.vue'

const props = defineProps<{
  dropdownOpen: Record<string, boolean>
}>()

const emit = defineEmits<{
  (e: 'toggle-dropdown', menu: string): void
  (e: 'toggle-search'): void
}>()

const router = useRouter()
const userStore = useUserStore()

// 用户登录状态
const isLoggedIn = computed(() => userStore.isAuthenticated)
const username = computed(() => userStore.username)
const userAvatar = computed(() => userStore.userAvatar)

// 切换下拉菜单
const toggleDropdown = (menu: string) => {
  emit('toggle-dropdown', menu)
}

// 登录
const login = () => {
  router.push('/auth/login')
}

// 注册
const register = () => {
  router.push('/auth/register')
}

// 登出
const logout = () => {
  userStore.logout()
  // 先跳转到首页，然后刷新页面
  router.push('/').then(() => {
    // 使用短暂延迟确保路由变更已完成
    setTimeout(() => {
      window.location.reload()
    }, 100)
  })
}

// 处理数据刷新成功
const handleRefreshSuccess = (result: any) => {
  console.log('数据刷新成功:', result)
}

// 处理数据刷新失败
const handleRefreshError = (error: string) => {
  console.error('数据刷新失败:', error)
}
</script>

<style scoped>
/* 用户部分 */
.user-section {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

/* 缓存状态指示器包装器 */
.cache-indicator-wrapper {
  position: relative;
  margin: 0 var(--spacing-xs);
  z-index: 1000;
  display: inline-block;
}

.user-section .btn {
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.user-section .icon {
  font-size: var(--font-size-md);
}

.login-btn,
.register-btn {
  width: auto !important;
  height: auto !important;
  padding: var(--spacing-xs) var(--spacing-md) !important;
  border-radius: var(--border-radius-md) !important;
}

/* 用户头像按钮 */
.user-avatar-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-md);
  background: none;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.user-avatar-btn:hover,
.user-avatar-btn.active {
  background-color: var(--bg-secondary);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.username {
  font-weight: 500;
  color: var(--text-primary);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 用户下拉菜单 */
.user-dropdown {
  position: relative;
}

.dropdown-container {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 200px;
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-xs);
  z-index: 200;
  margin-top: var(--spacing-xs);
  border: 1px solid var(--border-light);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-sm);
  color: var(--text-primary);
  text-decoration: none;
  transition: all var(--transition-fast);
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  text-align: left;
}

.dropdown-item:hover {
  background-color: var(--bg-secondary);
  color: var(--accent-color);
}

.user-menu {
  right: 0;
  left: auto;
  min-width: 240px;
}

.user-menu-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
}

.user-menu-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.user-menu-info {
  flex: 1;
}

.user-menu-name {
  font-weight: 500;
  color: var(--text-primary);
}

.user-menu-role {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
}

.membership-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 10px;
  color: white;
}

.membership-free {
  background-color: #909399;
}

.membership-basic {
  background-color: #409eff;
}

.membership-premium {
  background-color: #67c23a;
}

.membership-enterprise {
  background-color: #e6a23c;
}

.user-menu-divider {
  height: 1px;
  background-color: var(--border-light);
  margin: var(--spacing-xs) 0;
}

.item-icon {
  font-size: var(--font-size-md);
}

.logout-item {
  color: var(--danger-color);
}
</style>