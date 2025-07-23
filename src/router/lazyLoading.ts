import { defineAsyncComponent } from 'vue'
import type { RouteComponent } from 'vue-router'
import { prefetchResource } from '@/utils/resourceOptimization'

/**
 * 高级懒加载组件工厂
 * 提供更细粒度的控制，包括加载状态、错误处理和预加载
 * @param loader 组件加载函数
 * @param options 配置选项
 */
export function lazyLoadView(
    loader: () => Promise<RouteComponent>,
    options: {
        loadingComponent?: RouteComponent;
        errorComponent?: RouteComponent;
        delay?: number;
        timeout?: number;
        suspensible?: boolean;
        preload?: boolean;
    } = {}
): RouteComponent {
    // 如果启用预加载，在空闲时预加载组件
    if (options.preload) {
        // 使用requestIdleCallback在浏览器空闲时预加载
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            window.requestIdleCallback(() => {
                loader()
            })
        } else {
            // 降级为setTimeout
            setTimeout(() => {
                loader()
            }, 2000)
        }
    }

    return defineAsyncComponent({
        loader,
        loadingComponent: options.loadingComponent,
        errorComponent: options.errorComponent,
        delay: options.delay || 200,
        timeout: options.timeout || 30000,
        suspensible: options.suspensible !== undefined ? options.suspensible : true,
    })
}

/**
 * 预加载路由组件
 * 用于提前加载即将需要的组件
 * @param componentPath 组件路径
 */
export function preloadRouteComponent(componentPath: string): void {
    if (typeof window !== 'undefined') {
        // 创建link预加载标签
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.href = componentPath
        link.as = 'script'
        document.head.appendChild(link)
    }
}

/**
 * 批量预加载路由组件
 * @param paths 组件路径数组
 */
export function preloadRouteComponents(paths: string[]): void {
    paths.forEach(path => preloadRouteComponent(path))
}

/**
 * 根据用户行为智能预加载组件
 * @param loader 组件加载函数
 * @param options 预加载选项
 */
export function smartPreload(
    loader: () => Promise<RouteComponent>,
    options: {
        priority?: 'high' | 'medium' | 'low',
        condition?: () => boolean,
        delay?: number
    } = {}
): void {
    // 检查预加载条件
    const shouldPreload = options.condition ? options.condition() : true
    if (!shouldPreload) return

    // 根据优先级决定预加载策略
    const priority = options.priority || 'medium'
    const delay = options.delay || 2000

    if (priority === 'high') {
        // 高优先级：立即加载
        loader()
    } else if (priority === 'medium') {
        // 中优先级：使用requestIdleCallback或setTimeout
        if (typeof window !== 'undefined') {
            if ('requestIdleCallback' in window) {
                window.requestIdleCallback(() => {
                    loader()
                }, { timeout: delay })
            } else {
                setTimeout(() => {
                    loader()
                }, delay)
            }
        }
    } else {
        // 低优先级：在页面完全加载后预加载
        if (typeof window !== 'undefined') {
            if (document.readyState === 'complete') {
                setTimeout(() => {
                    if ('requestIdleCallback' in window) {
                        window.requestIdleCallback(() => {
                            loader()
                        }, { timeout: delay })
                    } else {
                        setTimeout(() => {
                            loader()
                        }, delay)
                    }
                }, 1000)
            } else {
                window.addEventListener('load', () => {
                    setTimeout(() => {
                        loader()
                    }, delay)
                })
            }
        }
    }
}/**
 *
 路由访问频率跟踪器
 * 跟踪用户访问路由的频率，用于智能预加载
 */
export class RouteFrequencyTracker {
    private static instance: RouteFrequencyTracker
    private routeFrequency: Record<string, number> = {}
    private routeTransitions: Record<string, Record<string, number>> = {}
    private lastRoute: string | null = null
    private storageKey = 'route_analytics'

    private constructor() {
        this.loadFromStorage()
    }

    /**
     * 获取单例实例
     */
    public static getInstance(): RouteFrequencyTracker {
        if (!RouteFrequencyTracker.instance) {
            RouteFrequencyTracker.instance = new RouteFrequencyTracker()
        }
        return RouteFrequencyTracker.instance
    }

    /**
     * 从本地存储加载数据
     */
    private loadFromStorage(): void {
        if (typeof window === 'undefined') return

        try {
            const data = localStorage.getItem(this.storageKey)
            if (data) {
                const parsed = JSON.parse(data)
                this.routeFrequency = parsed.routeFrequency || {}
                this.routeTransitions = parsed.routeTransitions || {}
            }
        } catch (error) {
            console.error('Failed to load route analytics from storage', error)
        }
    }

    /**
     * 保存数据到本地存储
     */
    private saveToStorage(): void {
        if (typeof window === 'undefined') return

        try {
            const data = JSON.stringify({
                routeFrequency: this.routeFrequency,
                routeTransitions: this.routeTransitions
            })
            localStorage.setItem(this.storageKey, data)
        } catch (error) {
            console.error('Failed to save route analytics to storage', error)
        }
    }

    /**
     * 记录路由访问
     * @param route 路由路径
     */
    public recordRouteVisit(route: string): void {
        // 更新路由访问频率
        this.routeFrequency[route] = (this.routeFrequency[route] || 0) + 1

        // 更新路由转换频率
        if (this.lastRoute && this.lastRoute !== route) {
            if (!this.routeTransitions[this.lastRoute]) {
                this.routeTransitions[this.lastRoute] = {}
            }
            this.routeTransitions[this.lastRoute][route] =
                (this.routeTransitions[this.lastRoute][route] || 0) + 1
        }

        this.lastRoute = route
        this.saveToStorage()
    }

    /**
     * 获取最常访问的路由
     * @param limit 限制数量
     */
    public getMostFrequentRoutes(limit = 5): string[] {
        return Object.entries(this.routeFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(entry => entry[0])
    }

    /**
     * 获取从指定路由最可能转换到的下一个路由
     * @param currentRoute 当前路由
     * @param limit 限制数量
     */
    public getMostLikelyNextRoutes(currentRoute: string, limit = 3): string[] {
        const transitions = this.routeTransitions[currentRoute]
        if (!transitions) return []

        return Object.entries(transitions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(entry => entry[0])
    }

    /**
     * 预加载可能的下一个路由
     * @param currentRoute 当前路由
     * @param routeComponents 路由组件映射
     */
    public preloadLikelyNextRoutes(
        currentRoute: string,
        routeComponents: Record<string, () => Promise<RouteComponent>>
    ): void {
        const nextRoutes = this.getMostLikelyNextRoutes(currentRoute)

        nextRoutes.forEach(route => {
            const component = routeComponents[route]
            if (component) {
                smartPreload(component, { priority: 'medium' })
            }
        })
    }
}

/**
 * 创建路由预加载插件
 * @param routeComponents 路由组件映射
 */
export function createRoutePreloadPlugin(routeComponents: Record<string, () => Promise<RouteComponent>>) {
    const tracker = RouteFrequencyTracker.getInstance()

    return {
        install(router: any) {
            router.beforeEach((to: any, from: any, next: any) => {
                // 记录路由访问
                tracker.recordRouteVisit(to.path)

                // 预加载可能的下一个路由
                if (to.path) {
                    // 使用requestIdleCallback延迟预加载，避免影响当前路由转换
                    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                        window.requestIdleCallback(() => {
                            tracker.preloadLikelyNextRoutes(to.path, routeComponents)
                        }, { timeout: 2000 })
                    } else {
                        setTimeout(() => {
                            tracker.preloadLikelyNextRoutes(to.path, routeComponents)
                        }, 2000)
                    }
                }

                next()
            })
        }
    }
}