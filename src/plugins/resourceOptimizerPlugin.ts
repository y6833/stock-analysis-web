import type { App } from 'vue'
import type { Router } from 'vue-router'
import { preloadResource, prefetchResource, preconnect, dnsPrefetch } from '@/utils/resourceOptimization'

interface ResourceOptimizerOptions {
    preloadResources?: Array<{
        url: string;
        type: 'script' | 'style' | 'image' | 'font' | 'fetch';
    }>;
    prefetchResources?: Array<string>;
    preconnectDomains?: Array<{
        url: string;
        crossorigin?: boolean;
    }>;
    dnsPrefetchDomains?: Array<string>;
    enableRoutePreloading?: boolean;
    routePreloadDistance?: number;
}

export function createResourceOptimizerPlugin(options: ResourceOptimizerOptions = {}) {
    return {
        install(app: App, { router }: { router?: Router } = {}) {
            // 在应用启动时预加载关键资源
            if (options.preloadResources) {
                options.preloadResources.forEach(resource => {
                    preloadResource(resource.url, resource.type)
                })
            }

            // 预取可能需要的资源
            if (options.prefetchResources) {
                // 使用requestIdleCallback在浏览器空闲时预取
                if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                    window.requestIdleCallback(() => {
                        options.prefetchResources?.forEach(url => {
                            prefetchResource(url)
                        })
                    }, { timeout: 2000 })
                } else {
                    // 降级为setTimeout
                    setTimeout(() => {
                        options.prefetchResources?.forEach(url => {
                            prefetchResource(url)
                        })
                    }, 3000)
                }
            }

            // 预连接到关键域名
            if (options.preconnectDomains) {
                options.preconnectDomains.forEach(domain => {
                    preconnect(domain.url, domain.crossorigin)
                })
            }

            // DNS预解析
            if (options.dnsPrefetchDomains) {
                options.dnsPrefetchDomains.forEach(domain => {
                    dnsPrefetch(domain)
                })
            }

            // 路由预加载
            if (router && options.enableRoutePreloading) {
                const distance = options.routePreloadDistance || 2

                // 监听路由变化，预加载可能的下一个路由
                router.beforeEach((to, from, next) => {
                    // 获取当前路由的匹配项
                    const matched = to.matched

                    if (matched.length > 0) {
                        // 获取当前路由的父级路由
                        const parentRoute = matched[0]

                        // 如果父级路由有子路由，预加载它们
                        if (parentRoute.children) {
                            parentRoute.children.forEach(childRoute => {
                                // 跳过当前路由
                                if (childRoute.path !== to.path) {
                                    // 预加载子路由组件
                                    const component = childRoute.component
                                    if (component && typeof component === 'function') {
                                        // 使用requestIdleCallback在浏览器空闲时预加载
                                        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                                            window.requestIdleCallback(() => {
                                                component()
                                            }, { timeout: 2000 })
                                        } else {
                                            // 降级为setTimeout
                                            setTimeout(() => {
                                                component()
                                            }, 3000)
                                        }
                                    }
                                }
                            })
                        }
                    }

                    next()
                })
            }

            // 提供全局API
            app.config.globalProperties.$resourceOptimizer = {
                preload: preloadResource,
                prefetch: prefetchResource,
                preconnect: preconnect,
                dnsPrefetch: dnsPrefetch
            }
        }
    }
}