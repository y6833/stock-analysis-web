<template>
  <nav class="main-nav">
    <!-- 基础导航 -->
    <RouterLink to="/" class="nav-link">
      <span class="nav-icon">🏠</span>
      <span class="nav-text">首页</span>
    </RouterLink>
    
    <!-- 仪表盘下拉菜单 -->
    <div class="dropdown-container">
      <button
        class="nav-link dropdown-toggle"
        :class="{ active: dropdownOpen.dashboard }"
        @click="toggleDropdown('dashboard')"
      >
        <span class="nav-icon">📊</span>
        <span class="nav-text">仪表盘</span>
        <span class="dropdown-arrow">▼</span>
      </button>
      <div class="dropdown-menu" v-show="dropdownOpen.dashboard">
        <RouterLink to="/dashboard" class="dropdown-item">
          <span class="nav-icon">📊</span>
          <span class="nav-text">基础仪表盘</span>
        </RouterLink>
        <template v-if="canAccessPremiumFeatures">
          <RouterLink to="/advanced-dashboard" class="dropdown-item">
            <span class="nav-icon">🚀</span>
            <span class="nav-text">高级仪表盘</span>
            <span class="feature-badge premium">高级</span>
          </RouterLink>
          <RouterLink to="/realtime-monitor" class="dropdown-item">
            <span class="nav-icon">⚡</span>
            <span class="nav-text">实时监控</span>
            <span class="feature-badge premium">高级</span>
          </RouterLink>
        </template>
      </div>
    </div>

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
        <RouterLink to="/watchlist" class="dropdown-item">
          <span class="nav-icon">📋</span>
          <span class="nav-text">关注列表</span>
        </RouterLink>
        <RouterLink to="/market-heatmap" class="dropdown-item">
          <span class="nav-icon">🌎</span>
          <span class="nav-text">大盘云图</span>
        </RouterLink>
        <template v-if="canAccessBasicFeatures">
          <RouterLink to="/position-management" class="dropdown-item">
            <span class="nav-icon">💼</span>
            <span class="nav-text">仓位管理</span>
            <span class="feature-badge basic">基础</span>
          </RouterLink>
          <RouterLink to="/enhanced-portfolio" class="dropdown-item">
            <span class="nav-icon">📊</span>
            <span class="nav-text">投资组合</span>
            <span class="feature-badge basic">基础</span>
          </RouterLink>
        </template>
        <template v-if="canAccessPremiumFeatures">
          <RouterLink to="/market-scanner" class="dropdown-item">
            <span class="nav-icon">🔍</span>
            <span class="nav-text">市场扫描器</span>
            <span class="feature-badge premium">高级</span>
          </RouterLink>
        </template>
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
        <template v-if="canAccessBasicFeatures">
          <RouterLink to="/alerts" class="dropdown-item">
            <span class="nav-icon">🔔</span>
            <span class="nav-text">条件提醒</span>
            <span class="feature-badge basic">基础</span>
          </RouterLink>
        </template>
        <template v-if="canAccessPremiumFeatures">
          <RouterLink to="/backtest" class="dropdown-item">
            <span class="nav-icon">🔄</span>
            <span class="nav-text">策略回测</span>
            <span class="feature-badge premium">高级</span>
          </RouterLink>
          <RouterLink to="/simulation" class="dropdown-item">
            <span class="nav-icon">🎮</span>
            <span class="nav-text">模拟交易</span>
            <span class="feature-badge premium">高级</span>
          </RouterLink>
        </template>
      </div>
    </div>

    <!-- 其他链接 -->
    <RouterLink to="/about" class="nav-link">
      <span class="nav-icon">ℹ️</span>
      <span class="nav-text">关于</span>
    </RouterLink>
    
    <!-- 管理员菜单 -->
    <div v-if="userStore.userRole === 'admin'" class="dropdown-container">
      <button
        class="nav-link dropdown-toggle"
        :class="{ active: dropdownOpen.admin }"
        @click="toggleDropdown('admin')"
      >
        <span class="nav-icon">👑</span>
        <span class="nav-text">管理后台</span>
        <span class="dropdown-arrow">▼</span>
      </button>
      <div class="dropdown-menu" v-show="dropdownOpen.admin">
        <RouterLink to="/admin" class="dropdown-item">
          <span class="nav-icon">👑</span>
          <span class="nav-text">用户管理</span>
        </RouterLink>
        <RouterLink to="/admin/data-source" class="dropdown-item">
          <span class="nav-icon">🔌</span>
          <span class="nav-text">数据源管理</span>
        </RouterLink>
        <RouterLink to="/settings/cache" class="dropdown-item">
          <span class="nav-icon">💾</span>
          <span class="nav-text">缓存管理</span>
        </RouterLink>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/userStore'
import { MembershipLevel, checkMembershipLevel } from '@/constants/membership'
import { computed } from 'vue'

const props = defineProps<{
  dropdownOpen: Record<string, boolean>
}>()

const emit = defineEmits<{
  (e: 'toggle-dropdown', menu: string): void
}>()

const userStore = useUserStore()

// 会员等级检查
const canAccessBasicFeatures = computed(() => {
  if (!userStore.isAuthenticated) return false
  if (userStore.userRole === 'admin') return true
  return checkMembershipLevel(userStore.membershipLevel, MembershipLevel.BASIC)
})

const canAccessPremiumFeatures = computed(() => {
  if (!userStore.isAuthenticated) return false
  if (userStore.userRole === 'admin') return true
  return checkMembershipLevel(userStore.membershipLevel, MembershipLevel.PREMIUM)
})

// 切换下拉菜单
const toggleDropdown = (menu: string) => {
  emit('toggle-dropdown', menu)
}
</script>

<style scoped>
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

/* 功能标识 */
.feature-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
  margin-left: auto;
  font-weight: bold;
}

.feature-badge.basic {
  background-color: #409eff;
}

.feature-badge.premium {
  background-color: #67c23a;
}
</style>