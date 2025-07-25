import { createRouter, createWebHistory } from 'vue-router'
import { userService } from '@/services/userService'
import { tushareService } from '@/services/tushareService'
import { pageGuard } from './pageGuard'
import { MembershipLevel } from '@/constants/membership'
import { useUserStore } from '@/stores/userStore'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 公开路由 - 无需登录
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: false },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
      meta: { requiresAuth: false },
    },

    // 认证相关路由
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/auth/LoginView.vue'),
      meta: { requiresAuth: false, hideForAuth: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/auth/RegisterView.vue'),
      meta: { requiresAuth: false, hideForAuth: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/auth/ForgotPasswordView.vue'),
      meta: { requiresAuth: false, hideForAuth: true },
    },

    // 需要认证的路由
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/professional-backtest',
      name: 'professional-backtest',
      component: () => import('@/views/ProfessionalBacktestView.vue'),
      meta: { requiresAuth: true, membershipLevel: 'premium' },
    },
    {
      path: '/position-management',
      name: 'position-management',
      component: () => import('@/views/PositionManagementView.vue'),
      meta: { requiresAuth: true, membershipLevel: 'basic' },
    },
    {
      path: '/advanced-dashboard',
      name: 'advanced-dashboard',
      component: () => import('../views/AdvancedDashboardView.vue'),
      meta: {
        requiresAuth: true,
        requiredMembershipLevel: MembershipLevel.PREMIUM,
      },
    },
    {
      path: '/smart-recommendation',
      name: 'smart-recommendation',
      component: () => import('../views/SmartRecommendationView.vue'),
      meta: {
        requiresAuth: true,
        requiredMembershipLevel: MembershipLevel.BASIC,
      },
    },
    {
      path: '/realtime-monitor',
      name: 'realtime-monitor',
      component: () => import('../views/RealtimeMonitorView.vue'),
      meta: {
        requiresAuth: true,
        requiredMembershipLevel: MembershipLevel.PREMIUM,
      },
    },
    {
      path: '/stock-monitor',
      name: 'stock-monitor',
      component: () => import('../views/StockMonitorView.vue'),
      meta: {
        requiresAuth: true,
        requiredMembershipLevel: MembershipLevel.BASIC,
      },
    },
    {
      path: '/stock',
      name: 'stock',
      component: () => import('../views/StockAnalysisView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/turtle-trading',
      name: 'turtle-trading',
      component: () => import('../views/TurtleTradingView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/portfolio',
      name: 'portfolio',
      component: () => import('../views/PortfolioView.vue'),
      meta: {
        requiresAuth: true,
        requiredMembershipLevel: MembershipLevel.BASIC,
      },
    },
    {
      path: '/market-heatmap',
      name: 'market-heatmap',
      component: () => import('../views/MarketHeatmapView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/industry-analysis',
      name: 'industry-analysis',
      component: () => import('../views/IndustryAnalysisView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/market-scanner',
      name: 'market-scanner',
      component: () => import('../views/MarketScannerView.vue'),
      meta: {
        requiresAuth: true,
        requiredMembershipLevel: MembershipLevel.PREMIUM,
      },
    },
    {
      path: '/tushare-test',
      name: 'tushare-test',
      component: () => import('../views/TushareTest.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/stock-search-demo',
      name: 'stock-search-demo',
      component: () => import('../views/StockSearchDemo.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/tushare-test2',
      name: 'tushare-test2',
      component: () => import('../views/TushareTestView.vue'),
    },
    {
      path: '/api-test',
      name: 'api-test',
      component: () => import('../views/ApiTestView.vue'),
      meta: { requiresAuth: false }, // 暂时禁用认证要求，方便测试
    },
    {
      path: '/export',
      name: 'export',
      component: () => import('../views/ExportView.vue'),
      meta: {
        requiresAuth: true,
        requiredMembershipLevel: MembershipLevel.PREMIUM,
      },
    },
    {
      path: '/backtest',
      name: 'backtest',
      component: () => import('../views/BacktestView.vue'),
      meta: {
        requiresAuth: true,
        requiredMembershipLevel: MembershipLevel.PREMIUM,
      },
    },
    {
      path: '/alerts',
      name: 'alerts',
      component: () => import('../views/AlertsView.vue'),
      meta: {
        requiresAuth: true,
        requiredMembershipLevel: MembershipLevel.BASIC,
      },
    },
    {
      path: '/doji-pattern/alerts',
      name: 'doji-pattern-alerts',
      component: () => import('../views/DojiPatternAlertManagementView.vue'),
      meta: {
        requiresAuth: true,
        requiredMembershipLevel: MembershipLevel.BASIC,
      },
    },
    {
      path: '/doji-pattern/alerts/create',
      name: 'doji-pattern-alerts-create',
      component: () => import('../views/DojiPatternAlertCreateView.vue'),
      meta: {
        requiresAuth: true,
        requiredMembershipLevel: MembershipLevel.BASIC,
      },
    },
    {
      path: '/doji-pattern/settings',
      name: 'doji-pattern-settings',
      component: () => import('../views/DojiPatternSettingsView.vue'),
      meta: {
        requiresAuth: true,
        requiredMembershipLevel: MembershipLevel.BASIC,
      },
    },
    {
      path: '/doji-pattern/screener',
      name: 'doji-pattern-screener',
      component: () => import('../views/DojiPatternScreenerView.vue'),
      meta: {
        requiresAuth: true,
        requiredMembershipLevel: MembershipLevel.BASIC,
      },
    },
    {
      path: '/doji-pattern/system',
      name: 'doji-pattern-system',
      component: () => import('../views/DojiPatternSystemView.vue'),
      meta: {
        requiresAuth: true,
        requiredMembershipLevel: MembershipLevel.BASIC,
      },
    },
    {
      path: '/simulation',
      name: 'simulation',
      component: () => import('../views/SimulationView.vue'),
      meta: {
        requiresAuth: true,
        requiredMembershipLevel: MembershipLevel.PREMIUM,
      },
    },
    {
      path: '/risk-monitoring',
      name: 'risk-monitoring',
      component: () => import('../views/RiskMonitoringView.vue'),
      meta: {
        requiresAuth: true,
        requiredMembershipLevel: MembershipLevel.PREMIUM,
      },
    },

    // 用户相关路由
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/user/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/user/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/membership',
      name: 'membership',
      component: () => import('../views/MembershipView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/membership-test',
      name: 'membership-test',
      component: () => import('../views/MembershipTestView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/membership-features',
      name: 'membership-features',
      component: () => import('../views/MembershipFeaturesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/recharge-records',
      name: 'recharge-records',
      component: () => import('../views/user/RechargeRecordsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('../views/user/NotificationsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/alerts-migration-test',
      name: 'alerts-migration-test',
      component: () => import('../views/AlertsMigrationTestView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/data-source-test',
      name: 'data-source-test',
      component: () => import('../views/DataSourceTest.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/data-source-debug',
      name: 'data-source-debug',
      component: () => import('../views/DataSourceDebugView.vue'),
      meta: {
        requiresAuth: true,
        requiresAdmin: true,
      },
    },
    {
      path: '/test-dashboard',
      name: 'test-dashboard',
      component: () => import('../views/TestDashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings/data-source',
      name: 'data-source-settings',
      component: () => import('../views/DataSourceSettingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings/cache',
      name: 'cache-management',
      component: () => import('../views/CacheManagementView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },

    // 管理员路由
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/admin/AdminView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/data-source',
      name: 'data-source-management',
      component: () => import('../views/DataSourceManagementView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },

    // 404 路由
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
      meta: { requiresAuth: false },
    },
  ],
})

// 记录上一个路由路径，避免重复处理
let lastPath = ''

// 全局前置守卫
router.beforeEach(async (to, from, next) => {
  // 如果是相同路径的重定向，直接放行（避免循环）
  if (to.path === from.path && to.path === lastPath) {
    console.log('[路由守卫] 检测到相同路径重定向，直接放行:', to.path)
    return next()
  }

  // 记录当前路径
  lastPath = to.path

  // 更新当前路径，用于API调用控制（只在路径变化时更新）
  if (to.path !== from.path) {
    tushareService.updateCurrentPath(to.path)
  }

  // 检查路由是否需要认证和权限
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin)
  const hideForAuth = to.matched.some((record) => record.meta.hideForAuth)
  const isLoggedIn = userService.isLoggedIn()

  // 获取当前用户信息
  const currentUser = userService.getCurrentUser()
  const isAdmin = currentUser?.role === 'admin'

  // 如果路由需要认证且用户未登录，重定向到登录页面
  if (requiresAuth && !isLoggedIn) {
    return next({
      name: 'login',
      query: { redirect: to.fullPath }, // 保存原始目标路径
    })
  }
  // 如果路由需要管理员权限但用户不是管理员，重定向到仪表盘
  else if (requiresAdmin && !isAdmin) {
    return next({
      name: 'dashboard',
      query: { error: 'permission' }, // 传递权限错误信息
    })
  }
  // 如果用户已登录且路由是登录/注册页面，重定向到仪表盘
  else if (isLoggedIn && hideForAuth) {
    return next({ name: 'dashboard' })
  }
  // 检查页面权限
  else if (isLoggedIn && !isAdmin) {
    // 如果是会员功能页面，直接放行（避免循环）
    if (to.path === '/membership-features') {
      return next()
    }

    // 高级会员和企业会员可以访问所有功能
    const userStore = useUserStore()
    if (['premium', 'enterprise'].includes(userStore.membershipLevel)) {
      console.log(`[路由守卫] 用户是高级会员或企业会员，直接放行: ${to.path}`)
      return next()
    }

    // 使用统一的页面权限检查
    return pageGuard(to, from, next)
  }
  // 其他情况正常导航
  else {
    return next()
  }
})

export default router
