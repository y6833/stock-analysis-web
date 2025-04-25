import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/stock',
      name: 'stock',
      component: () => import('../views/StockAnalysisView.vue'),
    },
    {
      path: '/portfolio',
      name: 'portfolio',
      component: () => import('../views/PortfolioView.vue'),
    },
    {
      path: '/market-heatmap',
      name: 'market-heatmap',
      component: () => import('../views/MarketHeatmapView.vue'),
    },
    {
      path: '/industry-analysis',
      name: 'industry-analysis',
      component: () => import('../views/IndustryAnalysisView.vue'),
    },
    {
      path: '/market-scanner',
      name: 'market-scanner',
      component: () => import('../views/MarketScannerView.vue'),
    },
    {
      path: '/tushare-test',
      name: 'tushare-test',
      component: () => import('../views/TushareTestView.vue'),
    },
    {
      path: '/export',
      name: 'export',
      component: () => import('../views/ExportView.vue'),
    },
    {
      path: '/backtest',
      name: 'backtest',
      component: () => import('../views/BacktestView.vue'),
    },
    {
      path: '/alerts',
      name: 'alerts',
      component: () => import('../views/AlertsView.vue'),
    },
    {
      path: '/simulation',
      name: 'simulation',
      component: () => import('../views/SimulationView.vue'),
    },
  ],
})

export default router
