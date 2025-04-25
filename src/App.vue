<script setup lang="ts">
// RouterLink 和 RouterView 组件在模板中自动导入
import { ref, onMounted, onUnmounted } from 'vue'

// 下拉菜单状态
const dropdownOpen = ref({
  analysis: false,
  strategy: false,
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

// 组件挂载时添加点击事件监听
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

// 组件卸载时移除点击事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="app-container">
    <!-- 消息提示组件 -->
    <!-- <MessageToast /> -->

    <header class="app-header">
      <div class="header-content">
        <div class="logo-section">
          <img alt="Stock Analysis logo" class="logo" src="@/image/logo/logo.png" />
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
          <RouterLink to="/tushare-test" class="nav-link">
            <span class="nav-icon">📊</span>
            <span class="nav-text">API测试</span>
          </RouterLink>
          <RouterLink to="/about" class="nav-link">
            <span class="nav-icon">ℹ️</span>
            <span class="nav-text">关于</span>
          </RouterLink>
        </nav>

        <div class="user-section">
          <button class="btn btn-outline">
            <span class="icon">🔍</span>
          </button>
          <button class="btn btn-outline">
            <span class="icon">🔔</span>
          </button>
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
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.1));
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
