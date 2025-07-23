# 资源优化模块

本模块提供全面的资源优化功能，包括代码分割、懒加载、资源压缩和预加载/预取策略。

## 功能特点

- **代码分割**：智能分割代码，减少初始加载时间
- **懒加载**：按需加载组件和资源
- **资源压缩**：优化资源大小，提高加载速度
- **预加载和预取**：智能预加载可能需要的资源

## 使用方法

### 基本用法

在主应用入口文件中注册资源优化模块：

```typescript
// main.ts
import { createApp } from 'vue'
import { createRouter } from 'vue-router'
import App from './App.vue'
import routes from './router'
import { createResourceOptimizationModule } from './modules/resourceOptimization'

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const app = createApp(App)

// 注册资源优化模块
app.use(
  createResourceOptimizationModule({
    // 配置选项
    enableCodeSplitting: true,
    enableLazyLoading: true,
    enableResourceCompression: true,
    enablePreloading: true,

    // 预加载配置
    preloadingOptions: {
      criticalResources: [
        { url: '/assets/css/critical.css', type: 'style' },
        { url: '/assets/js/essential.js', type: 'script' },
      ],
      prefetchResources: ['/assets/js/chart-vendor.js', '/assets/js/user-views.js'],
      preconnectDomains: [
        { url: 'https://api.example.com', crossorigin: true },
        { url: 'https://cdn.example.com', crossorigin: true },
      ],
    },

    // 路由预加载配置
    routePreloadingOptions: {
      enabled: true,
      depth: 1,
      strategy: 'lazy', // 'eager', 'lazy', 'user-interaction'
    },

    // 图片优化配置
    imageOptimizationOptions: {
      lazyLoad: true,
      responsive: true,
      compressionQuality: 0.8,
      placeholders: true,
    },
  }),
  { router }
)

app.use(router)
app.mount('#app')
```

### 组件懒加载

使用增强的懒加载功能加载组件：

```typescript
// router/index.ts
import { RouteRecordRaw } from 'vue-router'
import { lazyLoadView } from '@/router/lazyLoading'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/views/HomeView.vue'),
    children: [
      {
        path: 'dashboard',
        component: lazyLoadView(() => import('@/views/DashboardView.vue'), {
          loadingComponent: () => import('@/components/common/LoadingComponent.vue'),
          errorComponent: () => import('@/components/common/ErrorComponent.vue'),
          preload: true,
        }),
      },
    ],
  },
]

export default routes
```

### 图片懒加载

使用图片懒加载指令：

```vue
<template>
  <div class="gallery">
    <img v-lazy-image="image.url" v-for="image in images" :key="image.id" alt="Gallery image" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  setup() {
    const images = [
      { id: 1, url: '/assets/images/image1.jpg' },
      { id: 2, url: '/assets/images/image2.jpg' },
      { id: 3, url: '/assets/images/image3.jpg' },
    ]

    return { images }
  },
})
</script>
```

### 智能资源预加载

配置智能资源预加载：

```typescript
// router/index.ts
import { createRoutePreloadPlugin } from '@/router/lazyLoading'
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  /* 路由配置 */
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 提取路由组件映射
const routeComponents: Record<string, () => Promise<any>> = {}
const extractComponents = (routes: any[], basePath = '') => {
  routes.forEach((route) => {
    const path = basePath + route.path

    if (route.component && typeof route.component === 'function') {
      routeComponents[path] = route.component
    }

    if (route.children) {
      extractComponents(route.children, path + '/')
    }
  })
}

extractComponents(routes)

// 注册路由预加载插件
const app = createApp(App)
app.use(createRoutePreloadPlugin(routeComponents))
app.use(router)
```

## 最佳实践

1. **关键资源优先**：确保关键 CSS 和 JS 资源优先加载
2. **合理分割代码**：按功能模块分割代码，避免过大的块
3. **懒加载非关键组件**：非首屏组件应使用懒加载
4. **图片优化**：使用响应式图片和懒加载
5. **预加载策略**：根据用户行为智能预加载资源
6. **监控性能**：定期检查和优化资源加载性能
