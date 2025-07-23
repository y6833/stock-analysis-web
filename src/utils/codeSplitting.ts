/**
 * 代码分割策略工具
 * 提供更高级的代码分割和懒加载策略
 */
import type { RouteRecordRaw } from 'vue-router'
import { lazyLoadView } from '@/router/lazyLoading'

/**
 * 路由分组类型
 */
export type RouteGroup = {
    name: string;
    routes: RouteRecordRaw[];
}

/**
 * 按模块分组路由
 * 将相关路由组合在一起，以便于代码分割
 * @param routes 路由配置
 * @param groupingFn 分组函数
 */
export function groupRoutesByModule(
    routes: RouteRecordRaw[],
    groupingFn: (route: RouteRecordRaw) => string
): RouteGroup[] {
    const groups: Record<string, RouteRecordRaw[]> = {}

    routes.forEach(route => {
        const groupName = groupingFn(route)
        if (!groups[groupName]) {
            groups[groupName] = []
        }
        groups[groupName].push(route)
    })

    return Object.entries(groups).map(([name, routes]) => ({
        name,
        routes
    }))
}

/**
 * 创建分组的懒加载路由
 * @param routes 路由配置
 * @param groupingFn 分组函数
 */
export function createGroupedLazyRoutes(
    routes: RouteRecordRaw[],
    groupingFn: (route: RouteRecordRaw) => string
): RouteRecordRaw[] {
    const routeGroups = groupRoutesByModule(routes, groupingFn)
    const componentCache: Record<string, any> = {}

    return routes.map(route => {
        const groupName = groupingFn(route)
        const originalComponent = route.component

        // 如果没有组件或组件不是函数，直接返回原始路由
        if (!originalComponent || typeof originalComponent !== 'function') {
            return route
        }

        // 创建或复用组件加载器
        if (!componentCache[groupName]) {
            componentCache[groupName] = {}
        }

        const routePath = route.path
        if (!componentCache[groupName][routePath]) {
            componentCache[groupName][routePath] = lazyLoadView(
                originalComponent as () => Promise<any>,
                {
                    preload: false // 不自动预加载，由路由预加载插件控制
                }
            )
        }

        return {
            ...route,
            component: componentCache[groupName][routePath]
        }
    })
}

/**
 * 创建动态导入函数，支持Webpack/Vite的命名块
 * @param modulePath 模块路径
 * @param chunkName 块名称
 */
export function dynamicImport(modulePath: string, chunkName?: string): () => Promise<any> {
    // 对于Vite，使用注释来命名块
    if (chunkName) {
        return () => import(/* @vite-ignore */ modulePath)
    }
    return () => import(modulePath)
}

/**
 * 创建组件预加载映射
 * @param routes 路由配置
 */
export function createComponentPreloadMap(routes: RouteRecordRaw[]): Record<string, () => Promise<any>> {
    const preloadMap: Record<string, () => Promise<any>> = {}

    function processRoute(route: RouteRecordRaw) {
        if (route.path && route.component && typeof route.component === 'function') {
            preloadMap[route.path] = route.component as () => Promise<any>
        }

        if (route.children) {
            route.children.forEach(processRoute)
        }
    }

    routes.forEach(processRoute)
    return preloadMap
}

/**
 * 按需加载组件
 * 用于非路由组件的懒加载
 * @param factory 组件工厂函数
 * @param loadingComponent 加载中组件
 * @param errorComponent 错误组件
 */
export function lazyComponent(
    factory: () => Promise<any>,
    loadingComponent?: any,
    errorComponent?: any
) {
    return {
        // 使用异步组件
        component: lazyLoadView(factory, {
            loadingComponent,
            errorComponent,
            delay: 200,
            timeout: 10000
        }),

        // 预加载方法
        preload() {
            return factory()
        }
    }
}

/**
 * 创建模块联邦配置
 * 用于大型应用的微前端架构
 * @param name 应用名称
 * @param remotes 远程应用
 * @param exposes 暴露模块
 * @param shared 共享依赖
 */
export function createFederationConfig(
    name: string,
    remotes: Record<string, string> = {},
    exposes: Record<string, string> = {},
    shared: string[] = []
) {
    return {
        name,
        remotes,
        exposes,
        shared: shared.reduce((acc, lib) => {
            acc[lib] = { singleton: true, eager: false, requiredVersion: false }
            return acc
        }, {} as Record<string, any>)
    }
}