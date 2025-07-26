<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useAuthStore } from '@/stores/auth/authStore'
import DataSourceProvider from '@/components/DataSourceProvider.vue'
import { dojiPatternSystemService } from '@/services/DojiPatternSystemService'
import OfflineStatusBar from '@/components/layout/OfflineStatusBar.vue'
import MainNavigation from '@/components/layout/MainNavigation.vue'
import UserMenu from '@/components/layout/UserMenu.vue'
import SearchOverlay from '@/components/layout/SearchOverlay.vue'
import errorHandlingService from '@/services/errorHandlingService'
import loadingService from '@/services/loadingService'
import { useToast } from '@/composables/useToast'
import ErrorMessage from '@/components/common/ErrorMessage.vue'
import LoadingIndicator from '@/components/common/LoadingIndicator.vue'

const userStore = useUserStore()
const authStore = useAuthStore()
const { showToast } = useToast()

// 下拉菜单状态
const dropdownOpen = ref({
  dashboard: false,
  analysis: false,
  smart: false,
  user: false,
  admin: false,
})

// 搜索状态
const searchVisible = ref(false)

// 全局错误状态
const globalError = ref({
  show: false,
  message: '',
  type: 'error',
  details: ''
})

// 切换下拉菜单
const toggleDropdown = (menu) => {
  dropdownOpen.value[menu] = !dropdownOpen.value[menu]

  // 关闭其他下拉菜单
  Object.keys(dropdownOpen.value).forEach((key) => {
    if (key !== menu) {
      dropdownOpen.value[key] = false
    }
  })
}

// 切换搜索
const toggleSearch = () => {
  searchVisible.value = !searchVisible.value
  if (searchVisible.value) {
    closeAllDropdowns()
  }
}

// 关闭所有下拉菜单
const closeAllDropdowns = () => {
  Object.keys(dropdownOpen.value).forEach((key) => {
    dropdownOpen.value[key] = false
  })
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event) => {
  const dropdowns = document.querySelectorAll('.dropdown-container')
  let clickedOutside = true

  dropdowns.forEach((dropdown) => {
    if (dropdown.contains(event.target)) {
      clickedOutside = false
    }
  })

  if (clickedOutside) {
    closeAllDropdowns()
  }
}

// 清除全局错误
const clearGlobalError = () => {
  globalError.value.show = false
}

// 初始化用户状态
onMounted(async () => {
  document.addEventListener('click', handleClickOutside)

  // 设置全局错误处理
  errorHandlingService.setupGlobalErrorHandlers()
  
  // 显示应用程序初始化消息
  showToast('应用程序初始化中...', 'info')
  
  try {
    loadingService.showGlobalLoading('初始化应用程序...')
    
    // 初始化认证状态
    await authStore.initializeAuth()
    
    // 初始化用户状态
    await userStore.initUserState()

    // 如果用户已登录，强制刷新会员信息
    if (userStore.isAuthenticated) {
      console.log('[App] 用户已登录，强制刷新会员信息')
      try {
        const membershipInfo = await userStore.fetchMembershipInfo(true)
        console.log('[App] 会员信息刷新成功:', membershipInfo)
      } catch (error) {
        console.error('[App] 刷新会员信息失败:', error)
        const appError = errorHandlingService.createAppError(
          errorHandlingService.ErrorType.API,
          '刷新会员信息失败，将使用缓存数据',
          errorHandlingService.ErrorSeverity.WARNING,
          error
        )
        errorHandlingService.handleError(appError)
      }
    }

    // 初始化十字星形态系统
    try {
      await dojiPatternSystemService.initialize()
      console.log('[App] 十字星形态系统初始化成功')
    } catch (error) {
      console.error('[App] 十字星形态系统初始化失败:', error)
      const appError = errorHandlingService.createAppError(
        errorHandlingService.ErrorType.UNKNOWN,
        '初始化分析系统失败，部分功能可能不可用',
        errorHandlingService.ErrorSeverity.WARNING,
        error
      )
      errorHandlingService.handleError(appError)
    }
    
    // 应用程序初始化完成
    showToast('应用程序初始化完成', 'success')
  } catch (error) {
    console.error('[App] 应用程序初始化失败:', error)
    const appError = errorHandlingService.createAppError(
      errorHandlingService.ErrorType.UNKNOWN,
      '应用程序初始化失败，请刷新页面重试',
      errorHandlingService.ErrorSeverity.ERROR,
      error
    )
    errorHandlingService.handleError(appError)
  } finally {
    loadingService.hideGlobalLoading()
  }
})

// 组件卸载时移除点击事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  
  // 重置所有加载状态
  loadingService.resetAllLoadingStates()
})
</script>

<template>
  <DataSourceProvider>
    <div class="app-container">
      <!-- 跳过导航链接 - 辅助功能 -->
      <a href="#main-content" class="skip-link">跳到主要内容</a>
      
      <!-- 离线状态栏 -->
      <OfflineStatusBar />

      <!-- 搜索覆盖层 -->
      <SearchOverlay :is-visible="searchVisible" @close="searchVisible = false" />

      <!-- 全局错误消息 -->
      <ErrorMessage
        v-if="globalError.show"
        :type="globalError.type"
        :message="globalError.message"
        :details="globalError.details"
        :dismissible="true"
        @dismiss="clearGlobalError"
        class="global-error-message"
        role="alert"
        aria-live="assertive"
      />

      <header class="app-header" role="banner">
        <div class="header-content">
          <div class="logo-section">
            <img alt="快乐股市 logo" class="logo" src="@/image/logo/logo1.png" />
            <h1 class="app-title">快乐股市</h1>
          </div>

          <!-- 主导航 -->
          <MainNavigation 
            :dropdown-open="dropdownOpen" 
            @toggle-dropdown="toggleDropdown" 
            role="navigation" 
            aria-label="主导航"
          />

          <!-- 用户菜单 -->
          <UserMenu 
            :dropdown-open="dropdownOpen" 
            @toggle-dropdown="toggleDropdown" 
            @toggle-search="toggleSearch" 
            role="navigation" 
            aria-label="用户菜单"
          />
        </div>
      </header>

      <main id="main-content" class="app-main" role="main" tabindex="-1">
        <RouterView v-slot="{ Component }">
          <Suspense>
            <template #default>
              <component :is="Component" />
            </template>
            <template #fallback>
              <LoadingIndicator 
                :loading="true" 
                text="加载页面中..." 
                :overlay="false"
                size="large"
                aria-live="polite"
              />
            </template>
          </Suspense>
        </RouterView>
      </main>

      <footer class="app-footer" role="contentinfo">
        <div class="footer-content">
          <p>&copy; 2025 快乐股市 | 专业股票分析工具</p>
          <div class="footer-links">
            <router-link to="/settings/accessibility">辅助功能设置</router-link>
          </div>
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

/* 主内容区域 */
.app-main {
  flex: 1;
  padding: var(--spacing-lg);
  background-color: var(--bg-secondary);
}

/* 页脚样式 */
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

.footer-links {
  margin-top: var(--spacing-sm);
}

.footer-links a {
  color: var(--primary-color);
  text-decoration: none;
  margin: 0 var(--spacing-sm);
  transition: color var(--transition-fast);
}

.footer-links a:hover,
.footer-links a:focus {
  color: color-mix(in srgb, var(--primary-color) 80%, black);
  text-decoration: underline;
}

/* 全局错误消息 */
.global-error-message {
  position: fixed;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 600px;
  z-index: 1000;
  box-shadow: var(--shadow-md);
}

/* 跳过导航链接 - 辅助功能 */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--primary-color);
  color: white;
  padding: 8px;
  z-index: 1000;
  transition: top 0.3s;
}

.skip-link:focus {
  top: 0;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: var(--spacing-md);
    padding: var(--spacing-sm);
  }
  
  .app-main {
    padding: var(--spacing-md);
  }
  
  .global-error-message {
    width: 95%;
    top: 60px;
  }
  
  /* 增强触摸目标尺寸 */
  .app-header button,
  .app-header a {
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}
</style>