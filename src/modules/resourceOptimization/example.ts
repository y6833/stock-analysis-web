/**
 * 资源优化模块使用示例
 */
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from '@/App.vue'
import { createResourceOptimizationModule } from './index'

// 示例路由配置
const routes = [
    {
        path: '/',
        component: () => import('@/views/HomeView.vue'),
        children: [
            {
                path: 'dashboard',
                component: () => import('@/views/DashboardView.vue')
            },
            {
                path: 'stocks',
                component: () => import('@/views/StocksView.vue')
            }
        ]
    },
    {
        path: '/auth',
        component: () => import('@/views/auth/AuthLayout.vue'),
        children: [
            {
                path: 'login',
                component: () => import('@/views/auth/LoginView.vue')
            },
            {
                path: 'register',
                component: () => import('@/views/auth/RegisterView.vue')
            }
        ]
    }
]

// 创建路由实例
const router = createRouter({
    history: createWebHistory(),
    routes
})

// 创建应用实例
const app = createApp(App)

// 配置资源优化模块
app.use(createResourceOptimizationModule({
    // 启用所有优化功能
    enableCodeSplitting: true,
    enableLazyLoading: true,
    enableResourceCompression: true,
    enablePreloading: true,

    // 预加载配置
    preloadingOptions: {
        // 关键资源（立即加载）
        criticalResources: [
            { url: '/assets/css/critical.css', type: 'style' },
            { url: '/assets/fonts/main-font.woff2', type: 'font' }
        ],

        // 预取资源（空闲时加载）
        prefetchResources: [
            '/assets/js/chart-vendor.js',
            '/assets/js/user-views.js'
        ],

        // 预连接到关键域名
        preconnectDomains: [
            { url: 'https://api.tushare.pro', crossorigin: true },
            { url: 'https://quote.alltick.io', crossorigin: true },
            { url: 'https://cdn.example.com', crossorigin: true }
        ]
    },

    // 路由预加载配置
    routePreloadingOptions: {
        enabled: true,
        // 预加载深度（预加载当前路由的子路由层级）
        depth: 1,
        // 预加载策略：eager(立即), lazy(空闲时), user-interaction(用户交互时)
        strategy: 'lazy'
    },

    // 图片优化配置
    imageOptimizationOptions: {
        lazyLoad: true,
        responsive: true,
        compressionQuality: 0.8,
        placeholders: true
    }
}), { router })

// 使用路由
app.use(router)

// 挂载应用
app.mount('#app')

/**
 * 在组件中使用资源优化功能示例
 */
/*
import { defineComponent } from 'vue'
import { lazyLoadImage, adaptiveLoading } from '@/utils/resourceOptimization'

export default defineComponent({
  mounted() {
    // 示例：懒加载图片
    const imgElement = document.querySelector('.hero-image') as HTMLImageElement
    if (imgElement) {
      lazyLoadImage(
        imgElement,
        '/assets/images/hero.jpg',
        {
          placeholder: '/assets/images/hero-placeholder.jpg',
          rootMargin: '0px 0px 200px 0px'
        }
      )
    }
    
    // 示例：根据网络状况加载不同质量的资源
    adaptiveLoading({
      highQuality: '/assets/videos/intro-hd.mp4',
      lowQuality: '/assets/videos/intro-sd.mp4',
      type: 'script'
    }).then(() => {
      console.log('Video loaded based on network conditions')
    }).catch(error => {
      console.error('Failed to load video', error)
    })
    
    // 示例：使用全局资源优化API
    // @ts-ignore - 全局属性类型
    this.$resourceOptimizer.preload('/assets/js/upcoming-feature.js', 'script')
  }
})
*/