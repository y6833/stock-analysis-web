<template>
  <nav class="main-nav">
    <!-- 首页 -->
    <RouterLink to="/" class="nav-link" exact-active-class="active">
      <span class="nav-icon">🏠</span>
      <span class="nav-text">首页</span>
    </RouterLink>

    <!-- 仪表盘菜单 -->
    <div class="dropdown-container">
      <button
        class="nav-link dropdown-toggle"
        :class="{ active: dropdownOpen.dashboard }"
        @click="toggleDropdown('dashboard')"
        @keydown.enter="toggleDropdown('dashboard')"
        @keydown.space.prevent="toggleDropdown('dashboard')"
        aria-haspopup="true"
        :aria-expanded="dropdownOpen.dashboard"
      >
        <span class="nav-icon">📊</span>
        <span class="nav-text">仪表盘</span>
        <span class="dropdown-arrow" :class="{ rotated: dropdownOpen.dashboard }">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </button>
      <div
        class="dropdown-menu"
        v-show="dropdownOpen.dashboard"
        role="menu"
        aria-label="仪表盘菜单"
      >
        <div class="dropdown-section">
          <div class="dropdown-section-title">基础功能</div>
          <RouterLink to="/dashboard" class="dropdown-item" role="menuitem">
            <span class="nav-icon">📊</span>
            <div class="item-content">
              <span class="nav-text">基础仪表盘</span>
              <span class="item-description">核心数据概览</span>
            </div>
          </RouterLink>
        </div>

        <div class="dropdown-section" v-if="canAccessPremiumFeatures">
          <div class="dropdown-section-title">高级功能</div>
          <RouterLink to="/advanced-dashboard" class="dropdown-item" role="menuitem">
            <span class="nav-icon">🚀</span>
            <div class="item-content">
              <span class="nav-text">高级仪表盘</span>
              <span class="item-description">专业级数据分析</span>
            </div>
            <span class="feature-badge premium">高级</span>
          </RouterLink>
          <RouterLink to="/realtime-monitor" class="dropdown-item" role="menuitem">
            <span class="nav-icon">⚡</span>
            <div class="item-content">
              <span class="nav-text">实时监控</span>
              <span class="item-description">实时市场监控</span>
            </div>
            <span class="feature-badge premium">高级</span>
          </RouterLink>
        </div>

        <div class="dropdown-section" v-if="!canAccessPremiumFeatures">
          <div class="upgrade-prompt">
            <div class="upgrade-content">
              <span class="upgrade-icon">💎</span>
              <div class="upgrade-text">
                <div class="upgrade-title">解锁高级功能</div>
                <div class="upgrade-description">升级会员享受更多专业功能</div>
              </div>
            </div>
            <RouterLink to="/membership" class="upgrade-button">升级</RouterLink>
          </div>
        </div>
      </div>
    </div>

    <!-- 分析工具菜单 -->
    <div class="dropdown-container">
      <button
        class="nav-link dropdown-toggle"
        :class="{ active: dropdownOpen.analysis }"
        @click="toggleDropdown('analysis')"
        @keydown.enter="toggleDropdown('analysis')"
        @keydown.space.prevent="toggleDropdown('analysis')"
        aria-haspopup="true"
        :aria-expanded="dropdownOpen.analysis"
      >
        <span class="nav-icon">📈</span>
        <span class="nav-text">分析工具</span>
        <span class="dropdown-arrow" :class="{ rotated: dropdownOpen.analysis }">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </button>
      <div
        class="dropdown-menu"
        v-show="dropdownOpen.analysis"
        role="menu"
        aria-label="分析工具菜单"
      >
        <div class="dropdown-section">
          <div class="dropdown-section-title">基础分析</div>
          <RouterLink to="/stock" class="dropdown-item" role="menuitem">
            <span class="nav-icon">📈</span>
            <div class="item-content">
              <span class="nav-text">股票分析</span>
              <span class="item-description">个股技术分析</span>
            </div>
          </RouterLink>
          <RouterLink to="/watchlist" class="dropdown-item" role="menuitem">
            <span class="nav-icon">📋</span>
            <div class="item-content">
              <span class="nav-text">关注列表</span>
              <span class="item-description">自选股管理</span>
            </div>
          </RouterLink>
          <RouterLink to="/market-heatmap" class="dropdown-item" role="menuitem">
            <span class="nav-icon">🌎</span>
            <div class="item-content">
              <span class="nav-text">大盘云图</span>
              <span class="item-description">市场热力图</span>
            </div>
          </RouterLink>
        </div>

        <div class="dropdown-section" v-if="canAccessBasicFeatures">
          <div class="dropdown-section-title">投资管理</div>
          <RouterLink to="/position-management" class="dropdown-item" role="menuitem">
            <span class="nav-icon">💼</span>
            <div class="item-content">
              <span class="nav-text">仓位管理</span>
              <span class="item-description">持仓分析管理</span>
            </div>
            <span class="feature-badge basic">基础</span>
          </RouterLink>
          <RouterLink to="/enhanced-portfolio" class="dropdown-item" role="menuitem">
            <span class="nav-icon">📊</span>
            <div class="item-content">
              <span class="nav-text">投资组合</span>
              <span class="item-description">组合绩效分析</span>
            </div>
            <span class="feature-badge basic">基础</span>
          </RouterLink>
        </div>

        <div class="dropdown-section" v-if="canAccessPremiumFeatures">
          <div class="dropdown-section-title">高级工具</div>
          <RouterLink to="/market-scanner" class="dropdown-item" role="menuitem">
            <span class="nav-icon">🔍</span>
            <div class="item-content">
              <span class="nav-text">市场扫描器</span>
              <span class="item-description">智能选股工具</span>
            </div>
            <span class="feature-badge premium">高级</span>
          </RouterLink>
          <RouterLink to="/sector-analysis" class="dropdown-item" role="menuitem">
            <span class="nav-icon">🏭</span>
            <div class="item-content">
              <span class="nav-text">行业分析</span>
              <span class="item-description">行业对比分析</span>
            </div>
            <span class="feature-badge premium">高级</span>
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- 智能工具菜单 -->
    <div class="dropdown-container">
      <button
        class="nav-link dropdown-toggle"
        :class="{ active: dropdownOpen.smart }"
        @click="toggleDropdown('smart')"
        @keydown.enter="toggleDropdown('smart')"
        @keydown.space.prevent="toggleDropdown('smart')"
        aria-haspopup="true"
        :aria-expanded="dropdownOpen.smart"
      >
        <span class="nav-icon">🤖</span>
        <span class="nav-text">智能工具</span>
        <span class="dropdown-arrow" :class="{ rotated: dropdownOpen.smart }">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </button>
      <div
        class="dropdown-menu"
        v-show="dropdownOpen.smart"
        role="menu"
        aria-label="智能工具菜单"
      >
        <div class="dropdown-section" v-if="canAccessBasicFeatures">
          <div class="dropdown-section-title">智能选股工具</div>
          <RouterLink to="/strategies/smart-recommendation" class="dropdown-item" role="menuitem">
            <span class="nav-icon">🤖</span>
            <div class="item-content">
              <span class="nav-text">AI智能推荐</span>
              <span class="item-description">基于算法的智能选股</span>
            </div>
            <span class="feature-badge basic">基础</span>
          </RouterLink>
          <RouterLink to="/doji-pattern/screener" class="dropdown-item" role="menuitem">
            <span class="nav-icon">✨</span>
            <div class="item-content">
              <span class="nav-text">十字星选股</span>
              <span class="item-description">十字星形态筛选</span>
            </div>
            <span class="feature-badge basic">基础</span>
          </RouterLink>
        </div>

        <div class="dropdown-section" v-if="canAccessBasicFeatures">
          <div class="dropdown-section-title">智能提醒工具</div>
          <RouterLink to="/alerts" class="dropdown-item" role="menuitem">
            <span class="nav-icon">🔔</span>
            <div class="item-content">
              <span class="nav-text">智能提醒</span>
              <span class="item-description">条件触发提醒</span>
            </div>
            <span class="feature-badge basic">基础</span>
          </RouterLink>
          <RouterLink to="/doji-pattern/alerts" class="dropdown-item" role="menuitem">
            <span class="nav-icon">⚡</span>
            <div class="item-content">
              <span class="nav-text">十字星提醒</span>
              <span class="item-description">形态出现提醒</span>
            </div>
            <span class="feature-badge basic">基础</span>
          </RouterLink>
        </div>

        <div class="dropdown-section" v-if="canAccessPremiumFeatures">
          <div class="dropdown-section-title">高级策略工具</div>
          <RouterLink to="/backtest" class="dropdown-item" role="menuitem">
            <span class="nav-icon">🔄</span>
            <div class="item-content">
              <span class="nav-text">策略回测</span>
              <span class="item-description">历史数据验证</span>
            </div>
            <span class="feature-badge premium">高级</span>
          </RouterLink>
          <RouterLink to="/risk/simulation" class="dropdown-item" role="menuitem">
            <span class="nav-icon">🎮</span>
            <div class="item-content">
              <span class="nav-text">模拟交易</span>
              <span class="item-description">虚拟交易练习</span>
            </div>
            <span class="feature-badge premium">高级</span>
          </RouterLink>
          <RouterLink to="/risk/monitoring" class="dropdown-item" role="menuitem">
            <span class="nav-icon">🛡️</span>
            <div class="item-content">
              <span class="nav-text">风险管理</span>
              <span class="item-description">智能风控系统</span>
            </div>
            <span class="feature-badge premium">高级</span>
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- 市场资讯 -->
    <RouterLink to="/news" class="nav-link" exact-active-class="active">
      <span class="nav-icon">📰</span>
      <span class="nav-text">市场资讯</span>
    </RouterLink>

    <!-- 帮助中心 -->
    <RouterLink to="/help" class="nav-link" exact-active-class="active">
      <span class="nav-icon">❓</span>
      <span class="nav-text">帮助</span>
    </RouterLink>

    <!-- 管理员菜单 -->
    <div v-if="userStore.userRole === 'admin'" class="dropdown-container">
      <button
        class="nav-link dropdown-toggle admin-toggle"
        :class="{ active: dropdownOpen.admin }"
        @click="toggleDropdown('admin')"
        @keydown.enter="toggleDropdown('admin')"
        @keydown.space.prevent="toggleDropdown('admin')"
        aria-haspopup="true"
        :aria-expanded="dropdownOpen.admin"
      >
        <span class="nav-icon">👑</span>
        <span class="nav-text">管理后台</span>
        <span class="dropdown-arrow" :class="{ rotated: dropdownOpen.admin }">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </button>
      <div
        class="dropdown-menu admin-menu"
        v-show="dropdownOpen.admin"
        role="menu"
        aria-label="管理后台菜单"
      >
        <div class="dropdown-section">
          <div class="dropdown-section-title">系统管理</div>
          <RouterLink to="/admin" class="dropdown-item" role="menuitem">
            <span class="nav-icon">👑</span>
            <div class="item-content">
              <span class="nav-text">用户管理</span>
              <span class="item-description">用户权限管理</span>
            </div>
          </RouterLink>
          <RouterLink to="/admin/data-source" class="dropdown-item" role="menuitem">
            <span class="nav-icon">🔌</span>
            <div class="item-content">
              <span class="nav-text">数据源管理</span>
              <span class="item-description">数据接口配置</span>
            </div>
          </RouterLink>
          <RouterLink to="/settings/cache" class="dropdown-item" role="menuitem">
            <span class="nav-icon">💾</span>
            <div class="item-content">
              <span class="nav-text">缓存管理</span>
              <span class="item-description">系统缓存控制</span>
            </div>
          </RouterLink>
        </div>
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
/* ===== 主导航样式 ===== */
.main-nav {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: 0 var(--spacing-4);
}

/* 导航链接基础样式 */
.nav-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--border-radius-lg);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: var(--transition-fast);
  position: relative;
  white-space: nowrap;
  min-height: 44px; /* 确保触摸友好 */
}

.nav-link:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.nav-link.active,
.nav-link.router-link-active {
  background: var(--gradient-accent);
  color: var(--text-inverse);
  font-weight: var(--font-weight-semibold);
  box-shadow: var(--shadow-sm);
}

.nav-link.active::before,
.nav-link.router-link-active::before {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background: var(--accent-color);
  border-radius: var(--border-radius-full);
}

/* 导航图标 */
.nav-icon {
  font-size: var(--font-size-lg);
  line-height: 1;
  flex-shrink: 0;
}

/* 导航文本 */
.nav-text {
  font-size: var(--font-size-sm);
  font-weight: inherit;
}

/* ===== 下拉菜单样式 ===== */
.dropdown-container {
  position: relative;
}

.dropdown-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  outline: none;
}

.dropdown-toggle:focus {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
  border-radius: var(--border-radius-md);
}

.dropdown-toggle.active {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.dropdown-toggle.admin-toggle.active {
  background: var(--gradient-warning);
  color: var(--text-inverse);
}

/* 下拉箭头 */
.dropdown-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: var(--spacing-1);
  transition: transform var(--transition-fast);
}

.dropdown-arrow.rotated {
  transform: rotate(180deg);
}

.dropdown-arrow svg {
  width: 12px;
  height: 12px;
}

/* 下拉菜单容器 */
.dropdown-menu {
  position: absolute;
  top: calc(100% + var(--spacing-2));
  left: 0;
  min-width: 280px;
  max-width: 320px;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-xl);
  padding: var(--spacing-3);
  z-index: var(--z-index-dropdown);
  opacity: 0;
  transform: translateY(-8px);
  animation: dropdownFadeIn 0.2s ease-out forwards;
}

.dropdown-menu.admin-menu {
  border-color: var(--warning-color);
  box-shadow: var(--shadow-xl), 0 0 0 1px rgba(214, 158, 46, 0.1);
}

@keyframes dropdownFadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ===== 下拉菜单分组 ===== */
.dropdown-section {
  margin-bottom: var(--spacing-4);
}

.dropdown-section:last-child {
  margin-bottom: 0;
}

.dropdown-section-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  margin-bottom: var(--spacing-2);
  padding: 0 var(--spacing-3);
}

/* ===== 下拉菜单项 ===== */
.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-3);
  border-radius: var(--border-radius-lg);
  color: var(--text-primary);
  text-decoration: none;
  transition: var(--transition-fast);
  width: 100%;
  margin-bottom: var(--spacing-1);
  min-height: 48px;
}

.dropdown-item:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
  transform: translateX(2px);
}

.dropdown-item.router-link-active {
  background: var(--gradient-accent);
  color: var(--text-inverse);
  font-weight: var(--font-weight-medium);
  box-shadow: var(--shadow-sm);
}

.dropdown-item .nav-icon {
  font-size: var(--font-size-lg);
  flex-shrink: 0;
}

/* 菜单项内容 */
.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.item-content .nav-text {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-tight);
}

.item-description {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  line-height: var(--line-height-tight);
}

.dropdown-item.router-link-active .item-description {
  color: rgba(255, 255, 255, 0.8);
}

/* ===== 功能徽章 ===== */
.feature-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-1) var(--spacing-2);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  border-radius: var(--border-radius-base);
  color: var(--text-inverse);
  flex-shrink: 0;
}

.feature-badge.basic {
  background: var(--gradient-success);
}

.feature-badge.premium {
  background: var(--gradient-premium);
}

/* ===== 升级提示 ===== */
.upgrade-prompt {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  background: var(--gradient-premium);
  border-radius: var(--border-radius-lg);
  color: var(--text-inverse);
  margin-top: var(--spacing-2);
}

.upgrade-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex: 1;
}

.upgrade-icon {
  font-size: var(--font-size-lg);
}

.upgrade-text {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.upgrade-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.upgrade-description {
  font-size: var(--font-size-xs);
  opacity: 0.9;
}

.upgrade-button {
  padding: var(--spacing-2) var(--spacing-4);
  background: rgba(255, 255, 255, 0.2);
  color: var(--text-inverse);
  text-decoration: none;
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  transition: var(--transition-fast);
  backdrop-filter: blur(10px);
}

.upgrade-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}
</style>