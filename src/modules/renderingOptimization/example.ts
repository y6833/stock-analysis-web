/**
 * 渲染优化模块使用示例
 */
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from '@/App.vue'
import { createRenderingOptimizationModule } from './index'

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
        path: '/analysis',
        component: () => import('@/views/analysis/AnalysisLayout.vue'),
        children: [
            {
                path: 'technical',
                component: () => import('@/views/analysis/TechnicalAnalysisView.vue')
            },
            {
                path: 'fundamental',
                component: () => import('@/views/analysis/FundamentalAnalysisView.vue')
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

// 配置渲染优化模块
app.use(createRenderingOptimizationModule({
    // 组件渲染优化选项
    componentOptimization: {
        enableMemo: true,
        enableDebounce: true,
        enableRenderTracking: process.env.NODE_ENV === 'development',
        renderTrackingOptions: {
            logToConsole: process.env.NODE_ENV === 'development',
            showInDevtools: process.env.NODE_ENV === 'development'
        }
    },

    // 虚拟滚动选项
    virtualScroll: {
        enabled: true,
        defaultItemHeight: 40,
        bufferSize: 1.5,
        variableHeight: true,
        smoothScroll: true
    },

    // 动画优化选项
    animationOptimization: {
        enabled: true,
        useRequestAnimationFrame: true,
        enableGpuAcceleration: true,
        enableThrottling: true,
        frameRateLimit: 60
    }
}))

// 使用路由
app.use(router)

// 挂载应用
app.mount('#app')

/**
 * 组件记忆化示例
 */
/*
import { defineComponent, ref, computed } from 'vue'

export default defineComponent({
    setup() {
        // 大型数据集
        const stockData = ref(Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            code: `${600000 + i}`,
            name: `股票 ${i}`,
            price: Math.random() * 100,
            change: (Math.random() * 10) - 5
        })))
        
        // 过滤条件
        const filterText = ref('')
        
        // 计算过滤后的数据（这是一个昂贵的计算）
        const filteredStocks = computed(() => {
            console.log('Computing filtered stocks...')
            
            if (!filterText.value) {
                return stockData.value
            }
            
            const searchText = filterText.value.toLowerCase()
            
            return stockData.value.filter(stock => 
                stock.code.includes(searchText) || 
                stock.name.toLowerCase().includes(searchText)
            )
        })
        
        return {
            stockData,
            filterText,
            filteredStocks
        }
    }
})
*/

/**
 * 虚拟滚动示例
 */
/*
import { defineComponent, ref, onMounted } from 'vue'

export default defineComponent({
    setup() {
        // 大型数据集
        const stockList = ref([])
        
        // 可见项目
        const visibleStocks = ref([])
        
        // 加载数据
        onMounted(async () => {
            // 模拟加载大量数据
            stockList.value = Array.from({ length: 5000 }, (_, i) => ({
                id: i,
                code: `${600000 + i}`,
                name: `股票 ${i}`,
                price: Math.random() * 100,
                change: (Math.random() * 10) - 5,
                volume: Math.floor(Math.random() * 10000000),
                turnover: Math.random() * 0.1
            }))
        })
        
        // 处理虚拟滚动更新
        const onVirtualScrollUpdate = (event) => {
            visibleStocks.value = event.detail.visibleItems
        }
        
        return {
            stockList,
            visibleStocks,
            onVirtualScrollUpdate
        }
    }
})
*/

/**
 * 动画优化示例
 */
/*
import { defineComponent, ref, inject, onMounted, onBeforeUnmount } from 'vue'

export default defineComponent({
    setup() {
        // 获取动画优化器
        const animationOptimizer = inject('animationOptimizer')
        
        // 图表容器引用
        const chartContainer = ref(null)
        
        // 动画ID
        let animationId = null
        
        // 初始化图表动画
        onMounted(() => {
            if (!chartContainer.value || !animationOptimizer) return
            
            // 应用GPU加速
            animationOptimizer.applyGpuAcceleration(chartContainer.value)
            
            // 模拟股票数据更新动画
            let currentPrice = 100
            let volatility = 1
            
            // 创建节流动画回调
            const updateChart = animationOptimizer.throttleAnimation(() => {
                if (!chartContainer.value) return false
                
                // 模拟价格变动
                currentPrice += (Math.random() - 0.5) * volatility
                
                // 更新图表（这里只是示例，实际应用中会使用图表库）
                updateChartDisplay(currentPrice)
                
                // 继续动画
                return true
            }, 30) // 限制为30fps以节省资源
            
            // 启动动画
            animationId = animationOptimizer.animate(updateChart)
        })
        
        // 更新图表显示
        const updateChartDisplay = (price) => {
            // 实际应用中，这里会调用图表库的更新方法
            console.log(`Updating chart with price: ${price}`)
        }
        
        // 组件卸载前停止动画
        onBeforeUnmount(() => {
            if (animationId !== null && animationOptimizer) {
                animationOptimizer.cancelAnimation(animationId)
            }
        })
        
        return {
            chartContainer
        }
    }
})
*/