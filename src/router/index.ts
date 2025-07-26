import { createRouter, createWebHistory } from 'vue-router'
import { MembershipLevel } from '@/constants/membership'
import HomeView from '../views/HomeView.vue'
import { lazyLoadView } from './lazyLoading'
import offlineRoutes from './offlineRoutes'

// 通用加载和错误组件
const LoadingComponent = () => import('@/components/common/LoadingView.vue')
const ErrorComponent = () => import('@/components/common/ErrorView.vue')

// Route configuration organized by feature groups
const routes = [
  // ===== OFFLINE MODE ROUTES =====
  ...offlineRoutes,
  // ===== PUBLIC ROUTES =====
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { requiresAuth: false, title: '首页' },
  },
  {
    path: '/about',
    name: 'about',
    component: lazyLoadView(
      () => import('../views/AboutView.vue'),
      {
        loadingComponent: LoadingComponent,
        errorComponent: ErrorComponent,
        preload: true
      }
    ),
    meta: { requiresAuth: false, title: '关于我们' },
  },

  // ===== AUTHENTICATION ROUTES =====
  {
    path: '/auth',
    name: 'auth',
    redirect: '/auth/login',
    children: [
      {
        path: 'login',
        name: 'login',
        component: lazyLoadView(
          () => import('../views/auth/LoginView.vue'),
          {
            loadingComponent: LoadingComponent,
            errorComponent: ErrorComponent
          }
        ),
        meta: { requiresAuth: false, hideForAuth: true, title: '登录' },
      },
      {
        path: 'register',
        name: 'register',
        component: lazyLoadView(
          () => import('../views/auth/RegisterView.vue'),
          {
            loadingComponent: LoadingComponent,
            errorComponent: ErrorComponent
          }
        ),
        meta: { requiresAuth: false, hideForAuth: true, title: '注册' },
      },
      {
        path: 'forgot-password',
        name: 'forgot-password',
        component: lazyLoadView(
          () => import('../views/auth/ForgotPasswordView.vue'),
          {
            loadingComponent: LoadingComponent,
            errorComponent: ErrorComponent
          }
        ),
        meta: { requiresAuth: false, hideForAuth: true, title: '忘记密码' },
      },
      {
        path: 'reset-password',
        name: 'reset-password',
        component: lazyLoadView(
          () => import('../views/auth/ResetPasswordView.vue'),
          {
            loadingComponent: LoadingComponent,
            errorComponent: ErrorComponent
          }
        ),
        meta: { requiresAuth: false, hideForAuth: true, title: '重置密码' },
      },
    ],
  },

  // ===== DASHBOARD ROUTES =====
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true, title: '仪表盘' },
  },
  {
    path: '/advanced-dashboard',
    name: 'advanced-dashboard',
    component: () => import('../views/AdvancedDashboardView.vue'),
    meta: {
      requiresAuth: true,
      requiredMembershipLevel: MembershipLevel.PREMIUM,
      title: '高级仪表盘',
    },
  },

  // ===== STOCK ANALYSIS ROUTES =====
  {
    path: '/stock',
    name: 'stock-analysis',
    children: [
      {
        path: '',
        name: 'stock',
        component: () => import('../views/StockAnalysisView.vue'),
        meta: { requiresAuth: true, title: '股票分析' },
      },
      {
        path: 'monitor',
        name: 'stock-monitor',
        component: () => import('../views/StockMonitorView.vue'),
        meta: {
          requiresAuth: true,
          requiredMembershipLevel: MembershipLevel.BASIC,
          title: '股票监控',
        },
      },
      {
        path: 'realtime-monitor',
        name: 'realtime-monitor',
        component: () => import('../views/RealtimeMonitorView.vue'),
        meta: {
          requiresAuth: true,
          requiredMembershipLevel: MembershipLevel.PREMIUM,
          title: '实时监控',
        },
      },
    ],
  },

  // ===== MARKET ANALYSIS ROUTES =====
  {
    path: '/market',
    name: 'market',
    children: [
      {
        path: 'heatmap',
        name: 'market-heatmap',
        component: () => import('../views/MarketHeatmapView.vue'),
        meta: { requiresAuth: true, title: '市场热力图' },
      },
      {
        path: 'industry',
        name: 'industry-analysis',
        component: () => import('../views/IndustryAnalysisView.vue'),
        meta: { requiresAuth: true, title: '行业分析' },
      },
      {
        path: 'scanner',
        name: 'market-scanner',
        component: () => import('../views/MarketScannerView.vue'),
        meta: {
          requiresAuth: true,
          requiredMembershipLevel: MembershipLevel.PREMIUM,
          title: '市场扫描器',
        },
      },
    ],
  },

  // ===== WATCHLIST ROUTES =====
  {
    path: '/watchlist',
    name: 'watchlist',
    component: () => import('../views/EnhancedWatchlistView.vue'),
    meta: {
      requiresAuth: true,
      title: '关注列表',
    },
  },

  // ===== PORTFOLIO ROUTES =====
  {
    path: '/portfolio',
    name: 'portfolio',
    component: () => import('../views/PortfolioView.vue'),
    meta: {
      requiresAuth: true,
      requiredMembershipLevel: MembershipLevel.BASIC,
      title: '投资组合',
    },
  },
  {
    path: '/enhanced-portfolio',
    name: 'enhanced-portfolio',
    component: () => import('../views/EnhancedPortfolioManagementView.vue'),
    meta: {
      requiresAuth: true,
      requiredMembershipLevel: MembershipLevel.BASIC,
      title: '增强投资组合管理',
    },
  },
  {
    path: '/position-management',
    name: 'position-management',
    component: () => import('@/views/PositionManagementView.vue'),
    meta: {
      requiresAuth: true,
      membershipLevel: 'basic',
      title: '仓位管理',
    },
  },

  // ===== TRADING STRATEGIES ROUTES =====
  {
    path: '/strategies',
    name: 'strategies',
    children: [
      {
        path: 'turtle-trading',
        name: 'turtle-trading',
        component: () => import('../views/TurtleTradingView.vue'),
        meta: { requiresAuth: true, title: '海龟交易法' },
      },
      {
        path: 'smart-recommendation',
        name: 'smart-recommendation',
        component: () => import('../views/SmartRecommendationView.vue'),
        meta: {
          requiresAuth: true,
          requiredMembershipLevel: MembershipLevel.BASIC,
          title: '智能推荐',
        },
      },
    ],
  },

  // ===== BACKTESTING ROUTES =====
  {
    path: '/backtest',
    name: 'backtest',
    children: [
      {
        path: '',
        name: 'backtest-basic',
        component: () => import('../views/BacktestView.vue'),
        meta: {
          requiresAuth: true,
          requiredMembershipLevel: MembershipLevel.PREMIUM,
          title: '策略回测',
        },
      },
      {
        path: 'professional',
        name: 'professional-backtest',
        component: () => import('@/views/ProfessionalBacktestView.vue'),
        meta: {
          requiresAuth: true,
          membershipLevel: 'premium',
          title: '专业回测',
        },
      },
    ],
  },

  // ===== ALERTS ROUTES =====
  {
    path: '/alerts',
    name: 'alerts',
    component: () => import('../views/AlertsView.vue'),
    meta: {
      requiresAuth: true,
      requiredMembershipLevel: MembershipLevel.BASIC,
      title: '价格提醒',
    },
  },

  // ===== DOJI PATTERN ROUTES =====
  {
    path: '/doji-pattern',
    name: 'doji-pattern',
    children: [
      {
        path: 'alerts',
        name: 'doji-pattern-alerts',
        component: () => import('../views/DojiPatternAlertManagementView.vue'),
        meta: {
          requiresAuth: true,
          requiredMembershipLevel: MembershipLevel.BASIC,
          title: '十字星提醒管理',
        },
      },
      {
        path: 'alerts/create',
        name: 'doji-pattern-alerts-create',
        component: () => import('../views/DojiPatternAlertCreateView.vue'),
        meta: {
          requiresAuth: true,
          requiredMembershipLevel: MembershipLevel.BASIC,
          title: '创建十字星提醒',
        },
      },
      {
        path: 'screener',
        name: 'doji-pattern-screener',
        component: () => import('../views/DojiPatternScreenerView.vue'),
        meta: {
          requiresAuth: true,
          requiredMembershipLevel: MembershipLevel.BASIC,
          title: '十字星筛选器',
        },
      },
      {
        path: 'settings',
        name: 'doji-pattern-settings',
        component: () => import('../views/DojiPatternSettingsView.vue'),
        meta: {
          requiresAuth: true,
          requiredMembershipLevel: MembershipLevel.BASIC,
          title: '十字星设置',
        },
      },
      {
        path: 'system',
        name: 'doji-pattern-system',
        component: () => import('../views/DojiPatternSystemView.vue'),
        meta: {
          requiresAuth: true,
          requiredMembershipLevel: MembershipLevel.BASIC,
          title: '十字星系统',
        },
      },
    ],
  },

  // ===== RISK MANAGEMENT ROUTES =====
  {
    path: '/risk',
    name: 'risk',
    children: [
      {
        path: 'monitoring',
        name: 'risk-monitoring',
        component: () => import('../views/RiskMonitoringView.vue'),
        meta: {
          requiresAuth: true,
          requiredMembershipLevel: MembershipLevel.PREMIUM,
          title: '风险监控',
        },
      },
      {
        path: 'simulation',
        name: 'simulation',
        component: () => import('../views/SimulationView.vue'),
        meta: {
          requiresAuth: true,
          requiredMembershipLevel: MembershipLevel.PREMIUM,
          title: '风险模拟',
        },
      },
    ],
  },

  // ===== TOOLS ROUTES =====
  {
    path: '/tools',
    name: 'tools',
    children: [
      {
        path: 'export',
        name: 'export',
        component: () => import('../views/ExportView.vue'),
        meta: {
          requiresAuth: true,
          requiredMembershipLevel: MembershipLevel.PREMIUM,
          title: '数据导出',
        },
      },
    ],
  },

  // ===== USER ROUTES =====
  {
    path: '/user',
    name: 'user',
    children: [
      {
        path: 'profile',
        name: 'profile',
        component: () => import('../views/user/ProfileView.vue'),
        meta: { requiresAuth: true, title: '个人资料' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('../views/user/SettingsView.vue'),
        meta: { requiresAuth: true, title: '用户设置' },
      },
      {
        path: 'notifications',
        name: 'notifications',
        component: () => import('../views/user/NotificationsView.vue'),
        meta: { requiresAuth: true, title: '通知中心' },
      },
      {
        path: 'recharge-records',
        name: 'recharge-records',
        component: () => import('../views/user/RechargeRecordsView.vue'),
        meta: { requiresAuth: true, title: '充值记录' },
      },
    ],
  },

  // ===== MEMBERSHIP ROUTES =====
  {
    path: '/membership',
    name: 'membership',
    component: () => import('../views/MembershipView.vue'),
    meta: { requiresAuth: true, title: '会员中心' },
  },
  {
    path: '/membership-features',
    name: 'membership-features',
    component: () => import('../views/MembershipFeaturesView.vue'),
    meta: { requiresAuth: true, title: '会员功能' },
  },

  // ===== SETTINGS ROUTES =====
  {
    path: '/settings',
    name: 'settings-root',
    children: [
      {
        path: 'data-source',
        name: 'data-source-settings',
        component: () => import('../views/DataSourceSettingsView.vue'),
        meta: { requiresAuth: true, title: '数据源设置' },
      },
      {
        path: 'cache',
        name: 'cache-management',
        component: () => import('../views/CacheManagementView.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: '缓存管理' },
      },
      {
        path: 'offline',
        name: 'offline-settings',
        component: () => import('../views/settings/OfflineSettingsView.vue'),
        meta: { requiresAuth: true, title: '离线模式设置' },
      },
      {
        path: 'accessibility',
        name: 'accessibility-settings',
        component: () => import('../views/settings/AccessibilitySettingsView.vue'),
        meta: { requiresAuth: false, title: '辅助功能设置' },
      },
    ],
  },

  // ===== ADMIN ROUTES =====
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/admin/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, title: '管理后台' },
    children: [
      {
        path: 'data-source',
        name: 'data-source-management',
        component: () => import('../views/DataSourceManagementView.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: '数据源管理' },
      },
      {
        path: 'roles-permissions',
        name: 'roles-permissions-management',
        component: () => import('../views/admin/RolePermissionView.vue'),
        meta: {
          requiresAuth: true,
          requiresAdmin: true,
          title: '角色与权限管理',
          requiredPermissions: ['admin:manage_roles', 'admin:manage_permissions']
        },
      },
    ],
  },

  // ===== DEVELOPMENT/TEST ROUTES (only in development) =====
  ...(import.meta.env.DEV ? [
    {
      path: '/dev',
      name: 'dev',
      children: [
        {
          path: 'permission-demo',
          name: 'permission-demo',
          component: () => import('../views/PermissionDemoView.vue'),
          meta: { requiresAuth: true, title: '权限系统演示' },
        },
        {
          path: 'stock-search-demo',
          name: 'stock-search-demo',
          component: () => import('../views/StockSearchDemo.vue'),
          meta: { requiresAuth: false, title: '股票搜索演示' },
        },
        {
          path: 'api-test',
          name: 'api-test',
          component: () => import('../views/ApiTestView.vue'),
          meta: { requiresAuth: false, title: 'API测试' },
        },
        {
          path: 'test-dashboard',
          name: 'test-dashboard',
          component: () => import('../views/TestDashboardView.vue'),
          meta: { requiresAuth: true, title: '测试仪表盘' },
        },
        {
          path: 'membership-test',
          name: 'membership-test',
          component: () => import('../views/MembershipTestView.vue'),
          meta: { requiresAuth: true, title: '会员测试' },
        },
        {
          path: 'alerts-migration-test',
          name: 'alerts-migration-test',
          component: () => import('../views/AlertsMigrationTestView.vue'),
          meta: { requiresAuth: true, title: '提醒迁移测试' },
        },
        {
          path: 'data-source-test',
          name: 'data-source-test',
          component: () => import('../views/DataSourceTest.vue'),
          meta: { requiresAuth: true, title: '数据源测试' },
        },
        {
          path: 'data-source-debug',
          name: 'data-source-debug',
          component: () => import('../views/DataSourceDebugView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true, title: '数据源调试' },
        },
        {
          path: 'tushare-test',
          name: 'tushare-test',
          component: () => import('../views/TushareTest.vue'),
          meta: { requiresAuth: true, requiresAdmin: true, title: 'Tushare测试' },
        },
        {
          path: 'tushare-test2',
          name: 'tushare-test2',
          component: () => import('../views/TushareTestView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true, title: 'Tushare测试2' },
        },
        {
          path: 'tushare-integration-test',
          name: 'tushare-integration-test',
          component: () => import('../views/TushareTestPage.vue'),
          meta: { requiresAuth: false, title: 'Tushare集成测试' },
        },
      ],
    },
  ] : []),

  // ===== LEGACY ROUTE REDIRECTS =====
  { path: '/login', redirect: '/auth/login' },
  { path: '/register', redirect: '/auth/register' },
  { path: '/forgot-password', redirect: '/auth/forgot-password' },
  { path: '/profile', redirect: '/user/profile' },
  { path: '/settings', redirect: '/user/settings' },
  { path: '/notifications', redirect: '/user/notifications' },
  { path: '/recharge-records', redirect: '/user/recharge-records' },

  // ===== 404 ROUTE =====
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
    meta: { requiresAuth: false, title: '页面未找到' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // Always scroll to top when changing routes
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  },
})

// Import unified guards
import { routeGuard, devRouteGuard, afterNavigationGuard, navigationErrorHandler } from './guards'
import { permissionGuard } from './permissionGuard'

// Global navigation guards
router.beforeEach(routeGuard)
router.beforeEach(permissionGuard)
router.beforeEach(devRouteGuard)
router.afterEach(afterNavigationGuard)

// Handle navigation errors
router.onError(navigationErrorHandler)

export default router
export * from './utils'
export * from './guards'