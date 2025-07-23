/**
 * 预加载和预取策略插件
 * 提供智能资源预加载和预取功能
 */
import type { App } from 'vue'
import type { Router } from 'vue-router'
import { preloadResource, prefetchResource, smartResourcePreloading } from '@/utils/resourceOptimization'
import { RouteFrequencyTracker } from '@/router/lazyLoading'

/**
 * 预加载配置选项
 */
export interface PreloadingOptions {
    // 关键资源预加载
    criticalResources?: Array<{
        url: string;
        type: 'script' | 'style' | 'image' | 'font' | 'fetch';
    }>;

    // 预取资源
    prefetchResources?: Array<string>;

    // 路由预加载
    routePreloading?: {
        enabled: boolean;
        // 预加载深度（预加载当前路由的子路由层级）
        depth?: number;
        // 预加载策略：eager(立即), lazy(空闲时), user-interaction(用户交互时)
        strategy?: 'eager' | 'lazy' | 'user-interaction';
    };

    // 智能预加载
    smartPreloading?: {
        enabled: boolean;
        // 用户行为跟踪
        trackUserBehavior?: boolean;
        // 预测下一个路由
        predictNextRoute?: boolean;
        // 基于视口预加载
        viewportPreloading?: boolean;
    };

    // 预连接域名
    preconnectDomains?: Array<{
        url: string;
        crossorigin?: boolean;
    }>;

    // 资源提示映射（路径到资源的映射）
    resourceHints?: Record<string, string[]>;
}

/**
 * 创建预加载插件
 */
export function createPreloadingPlugin(options: PreloadingOptions = {}) {
    return {
        install(app: App, { router }: { router?: Router } = {}) {
            // 预加载关键资源
            if (options.criticalResources) {
                options.criticalResources.forEach(resource => {
                    preloadResource(resource.url, resource.type)
                })
            }

            // 预取非关键资源
            if (options.prefetchResources) {
                if (typeof window !== 'undefined') {
                    // 使用Intersection Observer API检测页面加载完成
                    if ('IntersectionObserver' in window) {
                        // 创建一个观察目标
                        const target = document.createElement('div')
                        target.style.height = '1px'
                        target.style.width = '1px'
                        target.style.position = 'absolute'
                        target.style.bottom = '0'
                        target.style.left = '0'
                        target.style.pointerEvents = 'none'
                        document.body.appendChild(target)

                        const observer = new IntersectionObserver(
                            (entries) => {
                                if (entries[0].isIntersecting) {
                                    // 页面已滚动到底部，开始预取资源
                                    if ('requestIdleCallback' in window) {
                                        window.requestIdleCallback(() => {
                                            options.prefetchResources?.forEach(url => {
                                                prefetchResource(url)
                                            })
                                        }, { timeout: 2000 })
                                    } else {
                                        setTimeout(() => {
                                            options.prefetchResources?.forEach(url => {
                                                prefetchResource(url)
                                            })
                                        }, 2000)
                                    }

                                    // 停止观察
                                    observer.disconnect()

                                    // 移除目标元素
                                    if (target.parentNode) {
                                        target.parentNode.removeChild(target)
                                    }
                                }
                            },
                            {
                                rootMargin: '0px 0px 200px 0px',
                                threshold: 0.1
                            }
                        )

                        observer.observe(target)
                    } else {
                        // 降级：使用load事件
                        window.addEventListener('load', () => {
                            setTimeout(() => {
                                options.prefetchResources?.forEach(url => {
                                    prefetchResource(url)
                                })
                            }, 2000)
                        })
                    }
                }
            }

            // 预连接到关键域名
            if (options.preconnectDomains) {
                options.preconnectDomains.forEach(domain => {
                    const link = document.createElement('link')
                    link.rel = 'preconnect'
                    link.href = domain.url

                    if (domain.crossorigin) {
                        link.crossOrigin = 'anonymous'
                    }

                    document.head.appendChild(link)
                })
            }

            // 路由预加载
            if (router && options.routePreloading?.enabled) {
                const depth = options.routePreloading.depth || 1
                const strategy = options.routePreloading.strategy || 'lazy'

                router.beforeEach((to, from, next) => {
                    // 获取当前路由的匹配项
                    const matched = to.matched

                    if (matched.length > 0) {
                        // 递归预加载子路由
                        const preloadChildRoutes = (route: any, currentDepth: number) => {
                            if (currentDepth > depth) return

                            if (route.children) {
                                route.children.forEach((childRoute: any) => {
                                    // 跳过当前路由
                                    if (childRoute.path !== to.path) {
                                        // 预加载子路由组件
                                        const component = childRoute.component
                                        if (component && typeof component === 'function') {
                                            if (strategy === 'eager') {
                                                // 立即预加载
                                                component()
                                            } else if (strategy === 'lazy') {
                                                // 在浏览器空闲时预加载
                                                if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                                                    window.requestIdleCallback(() => {
                                                        component()
                                                    }, { timeout: 2000 })
                                                } else {
                                                    setTimeout(() => {
                                                        component()
                                                    }, 2000)
                                                }
                                            } else if (strategy === 'user-interaction') {
                                                // 用户交互时预加载（鼠标悬停在链接上）
                                                // 这部分需要在路由链接组件中实现
                                            }
                                        }

                                        // 递归预加载更深层次的子路由
                                        preloadChildRoutes(childRoute, currentDepth + 1)
                                    }
                                })
                            }
                        }

                        // 从当前路由开始预加载
                        matched.forEach(route => {
                            preloadChildRoutes(route, 1)
                        })
                    }

                    next()
                })
            }

            // 智能预加载
            if (options.smartPreloading?.enabled) {
                // 用户行为跟踪
                if (router && options.smartPreloading.trackUserBehavior) {
                    const tracker = RouteFrequencyTracker.getInstance()

                    router.beforeEach((to, from, next) => {
                        // 记录路由访问
                        tracker.recordRouteVisit(to.path)
                        next()
                    })
                }

                // 基于资源提示映射的智能预加载
                if (options.resourceHints) {
                    smartResourcePreloading(options.resourceHints)
                }

                // 基于视口的预加载
                if (options.smartPreloading.viewportPreloading && typeof window !== 'undefined') {
                    // 监听所有带有data-preload属性的元素
                    const preloadElements = document.querySelectorAll('[data-preload]')

                    if ('IntersectionObserver' in window && preloadElements.length > 0) {
                        const observer = new IntersectionObserver(
                            (entries) => {
                                entries.forEach(entry => {
                                    if (entry.isIntersecting) {
                                        const element = entry.target as HTMLElement
                                        const resource = element.dataset.preload

                                        if (resource) {
                                            prefetchResource(resource)
                                        }

                                        // 停止观察此元素
                                        observer.unobserve(element)
                                    }
                                })
                            },
                            {
                                rootMargin: '0px 0px 200px 0px',
                                threshold: 0.1
                            }
                        )

                        preloadElements.forEach(element => {
                            observer.observe(element)
                        })
                    }
                }
            }

            // 提供全局API
            app.config.globalProperties.$preloader = {
                preload: preloadResource,
                prefetch: prefetchResource
            }
        }
    }
}