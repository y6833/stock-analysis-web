/**
 * 资源优化模块
 * 集成所有资源优化功能
 */
import { createResourceOptimizerPlugin } from '@/plugins/resourceOptimizerPlugin'
import { createPreloadingPlugin } from '@/plugins/preloadingPlugin'
import { createRoutePreloadPlugin } from '@/router/lazyLoading'
import { createLazyImageDirective } from '@/utils/resourceOptimization'
import type { App } from 'vue'
import type { Router } from 'vue-router'

/**
 * 资源优化配置选项
 */
export interface ResourceOptimizationOptions {
    // 启用代码分割
    enableCodeSplitting?: boolean;

    // 启用懒加载
    enableLazyLoading?: boolean;

    // 启用资源压缩
    enableResourceCompression?: boolean;

    // 启用预加载和预取
    enablePreloading?: boolean;

    // 预加载配置
    preloadingOptions?: {
        // 关键资源
        criticalResources?: Array<{
            url: string;
            type: 'script' | 'style' | 'image' | 'font' | 'fetch';
        }>;

        // 预取资源
        prefetchResources?: Array<string>;

        // 预连接域名
        preconnectDomains?: Array<{
            url: string;
            crossorigin?: boolean;
        }>;
    };

    // 路由预加载配置
    routePreloadingOptions?: {
        enabled: boolean;
        depth?: number;
        strategy?: 'eager' | 'lazy' | 'user-interaction';
    };

    // 图片优化配置
    imageOptimizationOptions?: {
        lazyLoad?: boolean;
        responsive?: boolean;
        compressionQuality?: number;
        placeholders?: boolean;
    };
}

/**
 * 创建资源优化模块
 */
export function createResourceOptimizationModule(options: ResourceOptimizationOptions = {}) {
    return {
        install(app: App, { router }: { router?: Router } = {}) {
            // 默认配置
            const defaultOptions: ResourceOptimizationOptions = {
                enableCodeSplitting: true,
                enableLazyLoading: true,
                enableResourceCompression: true,
                enablePreloading: true,
                preloadingOptions: {
                    criticalResources: [],
                    prefetchResources: [],
                    preconnectDomains: []
                },
                routePreloadingOptions: {
                    enabled: true,
                    depth: 1,
                    strategy: 'lazy'
                },
                imageOptimizationOptions: {
                    lazyLoad: true,
                    responsive: true,
                    compressionQuality: 0.8,
                    placeholders: true
                }
            }

            // 合并配置
            const mergedOptions = { ...defaultOptions, ...options }

            // 注册资源优化插件
            if (mergedOptions.enablePreloading) {
                app.use(createResourceOptimizerPlugin({
                    preloadResources: mergedOptions.preloadingOptions?.criticalResources,
                    prefetchResources: mergedOptions.preloadingOptions?.prefetchResources,
                    preconnectDomains: mergedOptions.preloadingOptions?.preconnectDomains,
                    enableRoutePreloading: mergedOptions.routePreloadingOptions?.enabled,
                    routePreloadDistance: mergedOptions.routePreloadingOptions?.depth
                }), { router })

                // 注册预加载插件
                app.use(createPreloadingPlugin({
                    criticalResources: mergedOptions.preloadingOptions?.criticalResources,
                    prefetchResources: mergedOptions.preloadingOptions?.prefetchResources,
                    preconnectDomains: mergedOptions.preloadingOptions?.preconnectDomains,
                    routePreloading: mergedOptions.routePreloadingOptions,
                    smartPreloading: {
                        enabled: true,
                        trackUserBehavior: true,
                        predictNextRoute: true,
                        viewportPreloading: true
                    }
                }), { router })
            }

            // 注册路由组件预加载插件
            if (router && mergedOptions.enableLazyLoading) {
                // 注意：这里需要传入路由组件映射，实际使用时需要从路由配置中提取
                const routeComponents: Record<string, () => Promise<any>> = {}

                // 从路由配置中提取组件
                if (router.options.routes) {
                    const extractComponents = (routes: any[], basePath = '') => {
                        routes.forEach(route => {
                            const path = basePath + route.path

                            if (route.component && typeof route.component === 'function') {
                                routeComponents[path] = route.component
                            }

                            if (route.children) {
                                extractComponents(route.children, path + '/')
                            }
                        })
                    }

                    extractComponents(router.options.routes)
                }

                app.use(createRoutePreloadPlugin(routeComponents))
            }

            // 注册图片懒加载指令
            if (mergedOptions.imageOptimizationOptions?.lazyLoad) {
                app.directive('lazy-image', createLazyImageDirective())
            }

            // 提供全局配置
            app.config.globalProperties.$resourceOptimization = {
                options: mergedOptions
            }
        }
    }
}

// 导出默认模块
export default createResourceOptimizationModule