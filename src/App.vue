<script setup lang="ts">
// RouterLink 和 RouterView 组件在模板中自动导入
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import DataSourceIndicator from '@/components/common/DataSourceIndicator.vue'
import DataRefreshButton from '@/components/common/DataRefreshButton.vue'
import CacheStatusIndicator from '@/components/common/CacheStatusIndicator.vue'
import DataSourceProvider from '@/components/DataSourceProvider.vue'

const router = useRouter()
const userStore = useUserStore()

// 下拉菜单状态
const dropdownOpen = ref({
  analysis: false,
  strategy: false,
  user: false,
})

// 切换下拉菜单
const toggleDropdown = (menu: string) => {
  dropdownOpen.value[menu] = !dropdownOpen.value[menu]

  // 关闭其他下拉菜单
  Object.keys(dropdownOpen.value).forEach((key) => {
    if (key !== menu) {
      dropdownOpen.value[key] = false
    }
  })
}

// 关闭所有下拉菜单
const closeAllDropdowns = () => {
  Object.keys(dropdownOpen.value).forEach((key) => {
    dropdownOpen.value[key] = false
  })
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event: MouseEvent) => {
  const dropdowns = document.querySelectorAll('.dropdown-container')
  let clickedOutside = true

  dropdowns.forEach((dropdown) => {
    if (dropdown.contains(event.target as Node)) {
      clickedOutside = false
    }
  })

  if (clickedOutside) {
    closeAllDropdowns()
  }
}

// 用户登录状态
const isLoggedIn = computed(() => userStore.isAuthenticated)
const username = computed(() => userStore.username)
const userAvatar = computed(() => userStore.userAvatar)

// 登录
const login = () => {
  router.push('/login')
}

// 注册
const register = () => {
  router.push('/register')
}

// 登出
const logout = () => {
  userStore.logout()
  router.push('/')
}

// 初始化用户状态
onMounted(async () => {
  document.addEventListener('click', handleClickOutside)

  // 初始化用户状态
  await userStore.initUserState()
})

// 处理数据刷新成功
const handleRefreshSuccess = (result: any) => {
  // 这里可以添加Toast提示或其他反馈
  console.log('数据刷新成功:', result)
}

// 处理数据刷新失败
const handleRefreshError = (error: string) => {
  // 这里可以添加Toast提示或其他反馈
  console.error('数据刷新失败:', error)
}

// 组件卸载时移除点击事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <DataSourceProvider>
    <div class="app-container">
      <!-- 消息提示组件 -->
      <!-- <MessageToast /> -->

      <header class="app-header">
        <div class="header-content">
          <div class="logo-section">
            <img alt="Stock Analysis logo" class="logo" src="@/image/logo/logo1.png" />
            <h1 class="app-title">快乐股市</h1>
          </div>

          <nav class="main-nav">
            <!-- 基础导航 -->
            <RouterLink to="/" class="nav-link">
              <span class="nav-icon">🏠</span>
              <span class="nav-text">首页</span>
            </RouterLink>
            <RouterLink to="/dashboard" class="nav-link">
              <span class="nav-icon">📊</span>
              <span class="nav-text">仪表盘</span>
            </RouterLink>

            <!-- 分析工具下拉菜单 -->
            <div class="dropdown-container">
              <button
                class="nav-link dropdown-toggle"
                :class="{ active: dropdownOpen.analysis }"
                @click="toggleDropdown('analysis')"
              >
                <span class="nav-icon">📈</span>
                <span class="nav-text">分析工具</span>
                <span class="dropdown-arrow">▼</span>
              </button>
              <div class="dropdown-menu" v-show="dropdownOpen.analysis">
                <RouterLink to="/stock" class="dropdown-item">
                  <span class="nav-icon">📈</span>
                  <span class="nav-text">股票分析</span>
                </RouterLink>
                <RouterLink to="/portfolio" class="dropdown-item">
                  <span class="nav-icon">💼</span>
                  <span class="nav-text">仓位管理</span>
                </RouterLink>
                <RouterLink to="/market-heatmap" class="dropdown-item">
                  <span class="nav-icon">🌎</span>
                  <span class="nav-text">大盘云图</span>
                </RouterLink>
                <RouterLink to="/market-scanner" class="dropdown-item">
                  <span class="nav-icon">🔍</span>
                  <span class="nav-text">市场扫描器</span>
                </RouterLink>
                <RouterLink to="/export" class="dropdown-item">
                  <span class="nav-icon">📋</span>
                  <span class="nav-text">导出报告</span>
                </RouterLink>
              </div>
            </div>

            <!-- 策略工具下拉菜单 -->
            <div class="dropdown-container">
              <button
                class="nav-link dropdown-toggle"
                :class="{ active: dropdownOpen.strategy }"
                @click="toggleDropdown('strategy')"
              >
                <span class="nav-icon">🔄</span>
                <span class="nav-text">策略工具</span>
                <span class="dropdown-arrow">▼</span>
              </button>
              <div class="dropdown-menu" v-show="dropdownOpen.strategy">
                <RouterLink to="/backtest" class="dropdown-item">
                  <span class="nav-icon">🔄</span>
                  <span class="nav-text">策略回测</span>
                </RouterLink>
                <RouterLink to="/alerts" class="dropdown-item">
                  <span class="nav-icon">🔔</span>
                  <span class="nav-text">条件提醒</span>
                </RouterLink>
                <RouterLink to="/simulation" class="dropdown-item">
                  <span class="nav-icon">🎮</span>
                  <span class="nav-text">模拟交易</span>
                </RouterLink>
              </div>
            </div>

            <!-- 其他链接 -->
            <RouterLink v-if="userStore.userRole === 'admin'" to="/admin" class="nav-link">
              <span class="nav-icon">👑</span>
              <span class="nav-text">管理后台</span>
            </RouterLink>
            <RouterLink v-if="userStore.userRole === 'admin'" to="/tushare-test" class="nav-link">
              <span class="nav-icon">📊</span>
              <span class="nav-text">API测试</span>
            </RouterLink>
            <RouterLink to="/test-dashboard" class="nav-link">
              <span class="nav-icon">🧪</span>
              <span class="nav-text">功能测试</span>
            </RouterLink>
            <RouterLink to="/about" class="nav-link">
              <span class="nav-icon">ℹ️</span>
              <span class="nav-text">关于</span>
            </RouterLink>
          </nav>

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
            <button class="btn btn-outline">
              <span class="icon">🔍</span>
            </button>

            <!-- 通知按钮 -->
            <button class="btn btn-outline">
              <span class="icon">🔔</span>
            </button>

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

                <RouterLink to="/profile" class="dropdown-item">
                  <span class="item-icon">👤</span>
                  <span>个人资料</span>
                </RouterLink>

                <RouterLink to="/membership" class="dropdown-item">
                  <span class="item-icon">⭐</span>
                  <span>会员中心</span>
                </RouterLink>

                <RouterLink to="/settings" class="dropdown-item">
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
        </div>
      </header>

      <main class="app-main">
        <RouterView />
      </main>

      <footer class="app-footer">
        <div class="footer-content">
          <p>&copy; 2025 快乐股市 | 专业股票分析工具</p>
        </div>
      </footer>
    </div>
  </DataSourceProvider>
</template>

<style scoped>
/* 应用容器 */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* 头部样式 */
.app-header {
  background-color: var(--bg-primary);
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--border-light);
}

.header-content {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Logo 部分 */
.logo-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.app-title {
  font-size: var(--font-size-lg);
  color: var(--primary-color);
  font-weight: 600;
  margin: 0;
}

/* 导航菜单 */
.main-nav {
  display: flex;
  gap: var(--spacing-md);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-md);
  color: var(--text-primary);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.nav-link:hover {
  background-color: var(--bg-secondary);
  color: var(--accent-color);
}

.nav-link.router-link-active {
  background-color: var(--bg-secondary);
  color: var(--accent-color);
  font-weight: 500;
}

.nav-icon {
  font-size: var(--font-size-md);
}

/* 下拉菜单 */
.dropdown-container {
  position: relative;
}

.dropdown-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
}

.dropdown-toggle.active {
  background-color: var(--bg-secondary);
  color: var(--accent-color);
}

.dropdown-arrow {
  font-size: 10px;
  margin-left: 4px;
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
}

.dropdown-item:hover {
  background-color: var(--bg-secondary);
  color: var(--accent-color);
}

.dropdown-item.router-link-active {
  background-color: var(--bg-secondary);
  color: var(--accent-color);
  font-weight: 500;
}

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
  z-index: 1000; /* 确保在较高层级 */
  display: inline-block; /* 确保工具提示定位正确 */
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
  margin-right: var(--spacing-xs);
}

.logout-item {
  color: var(--danger-color);
}

/* 主内容区 */
.app-main {
  flex: 1;
  padding: var(--spacing-md) 0;
  background-color: var(--bg-secondary);
  width: 100%;
}

/* 页脚 */
.app-footer {
  background-color: var(--bg-primary);
  border-top: 1px solid var(--border-light);
  padding: var(--spacing-md) 0;
}

.footer-content {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
  text-align: center;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dropdown-menu {
    min-width: auto;
  }
  .header-content {
    flex-direction: column;
    gap: var(--spacing-md);
    padding: var(--spacing-sm);
  }

  .main-nav {
    flex-wrap: wrap;
    justify-content: center;
  }

  .nav-text {
    display: none;
  }

  .nav-link {
    padding: var(--spacing-sm);
  }

  .nav-icon {
    font-size: var(--font-size-lg);
  }
}
</style>
