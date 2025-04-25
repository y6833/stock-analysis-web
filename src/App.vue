<script setup lang="ts">
// RouterLink 和 RouterView 组件在模板中自动导入
import MessageToast from '@/components/common/MessageToast.vue'
</script>

<template>
  <div class="app-container">
    <!-- 消息提示组件 -->
    <MessageToast />

    <header class="app-header">
      <div class="header-content">
        <div class="logo-section">
          <img alt="Stock Analysis logo" class="logo" src="@/image/logo/logo.png" />
          <h1 class="app-title">快乐股市</h1>
        </div>

        <nav class="main-nav">
          <RouterLink to="/" class="nav-link">
            <span class="nav-icon">🏠</span>
            <span class="nav-text">首页</span>
          </RouterLink>
          <RouterLink to="/dashboard" class="nav-link">
            <span class="nav-icon">📊</span>
            <span class="nav-text">仪表盘</span>
          </RouterLink>
          <RouterLink to="/stock" class="nav-link">
            <span class="nav-icon">📈</span>
            <span class="nav-text">股票分析</span>
          </RouterLink>
          <RouterLink to="/portfolio" class="nav-link">
            <span class="nav-icon">💼</span>
            <span class="nav-text">仓位管理</span>
          </RouterLink>
          <RouterLink to="/market-heatmap" class="nav-link">
            <span class="nav-icon">🌎</span>
            <span class="nav-text">大盘云图</span>
          </RouterLink>
          <RouterLink to="/export" class="nav-link">
            <span class="nav-icon">📋</span>
            <span class="nav-text">导出报告</span>
          </RouterLink>
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
