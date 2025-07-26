// 核心样式 - 关键渲染路径
import './assets/main.css'
import './assets/styles/variables.css'

// 延迟加载非关键样式
import { loadStyle } from './utils/resourceOptimization'
if (typeof window !== 'undefined') {
    // 使用requestIdleCallback在浏览器空闲时加载非关键样式
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
            loadStyle('/src/assets/theme.css')
            loadStyle('/src/assets/payment.css')
        }, { timeout: 2000 })
    } else {
        // 降级为setTimeout
        setTimeout(() => {
            loadStyle('/src/assets/theme.css')
            loadStyle('/src/assets/payment.css')
        }, 1000)
    }
}

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import membershipPlugin from './plugins/membershipPlugin'
import dojiPatternAlertPlugin from './plugins/dojiPatternAlertPlugin'
import { createCachePlugin } from './plugins/cachePlugin'
import { createResourceOptimizerPlugin } from './plugins/resourceOptimizerPlugin'
import offlinePlugin from './plugins/offlinePlugin'
import errorHandlingPlugin from './plugins/errorHandlingPlugin'
import accessibilityPlugin from './plugins/accessibilityPlugin'
import authInterceptor from './plugins/authInterceptor'
import permissionPlugin from './plugins/permissionPlugin'
import securityPlugin from './plugins/securityPlugin'
import monitoringPlugin from './plugins/monitoring'

// 导入服务
import { StockDataServiceImpl } from './services/StockDataService'

// 离线模式功能已由offlinePlugin提供

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.use(errorHandlingPlugin)
app.use(authInterceptor)
app.use(securityPlugin)
app.use(membershipPlugin)
app.use(offlinePlugin)
app.use(accessibilityPlugin)
app.use(permissionPlugin)
app.use(monitoringPlugin)

// 全局错误处理已由errorHandlingPlugin提供

// 注册缓存插件
app.use(createCachePlugin({
    enabled: true,
    defaultExpiry: 5 * 60 * 1000, // 5分钟
    maxSize: 100,
    storageType: 'localStorage',
    debug: process.env.NODE_ENV !== 'production'
}), { router })

// 注册资源优化插件
app.use(createResourceOptimizerPlugin({
    // 预连接到关键域名
    preconnectDomains: [
        { url: 'https://quote.alltick.io', crossorigin: true },
        { url: 'https://api.tushare.pro', crossorigin: true }
    ],
    // DNS预解析
    dnsPrefetchDomains: [
        'https://quote.alltick.io',
        'https://api.tushare.pro'
    ],
    // 启用路由预加载
    enableRoutePreloading: true,
    routePreloadDistance: 2
}), { router })

// 获取股票数据服务实例
const stockDataService = new StockDataServiceImpl()

// 注册十字星形态提醒插件
app.use(dojiPatternAlertPlugin, {
    stockDataService
})

// 使用性能标记记录应用启动时间
if (typeof window !== 'undefined' && 'performance' in window) {
    performance.mark('app-start')
}

app.mount('#app')

// 记录应用挂载完成时间
if (typeof window !== 'undefined' && 'performance' in window) {
    window.addEventListener('load', () => {
        performance.mark('app-loaded')
        performance.measure('app-startup', 'app-start', 'app-loaded')

        // 在开发环境中输出性能指标
        if (process.env.NODE_ENV !== 'production') {
            const measure = performance.getEntriesByName('app-startup')[0]
            console.log(`应用启动时间: ${measure.duration.toFixed(2)}ms`)
        }
    })
}
