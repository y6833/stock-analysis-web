/**
 * 渲染优化模块
 * 提供组件渲染优化、虚拟滚动和动画优化功能
 */
import { App } from 'vue';
import { createMemoComponent } from './memoComponent';
import { createVirtualScrollDirective } from './virtualScroll';
import { createAnimationOptimizer } from './animationOptimizer';

/**
 * 渲染优化配置选项
 */
export interface RenderingOptimizationOptions {
    // 组件渲染优化选项
    componentOptimization?: {
        // 启用组件记忆化
        enableMemo?: boolean;
        // 启用自动防抖
        enableDebounce?: boolean;
        // 启用渲染追踪
        enableRenderTracking?: boolean;
        // 渲染追踪选项
        renderTrackingOptions?: {
            // 是否在控制台输出渲染信息
            logToConsole?: boolean;
            // 是否在开发工具中显示渲染信息
            showInDevtools?: boolean;
        };
    };

    // 虚拟滚动选项
    virtualScroll?: {
        // 启用虚拟滚动
        enabled?: boolean;
        // 默认项目高度（像素）
        defaultItemHeight?: number;
        // 缓冲区大小（屏幕高度的倍数）
        bufferSize?: number;
        // 是否使用可变高度
        variableHeight?: boolean;
        // 是否启用平滑滚动
        smoothScroll?: boolean;
    };

    // 动画优化选项
    animationOptimization?: {
        // 启用动画优化
        enabled?: boolean;
        // 使用 requestAnimationFrame
        useRequestAnimationFrame?: boolean;
        // 启用 GPU 加速
        enableGpuAcceleration?: boolean;
        // 启用动画节流
        enableThrottling?: boolean;
        // 动画帧率限制
        frameRateLimit?: number;
    };
}

/**
 * 创建渲染优化模块
 */
export function createRenderingOptimizationModule(options: RenderingOptimizationOptions = {}) {
    return {
        install(app: App) {
            // 默认配置
            const defaultOptions: RenderingOptimizationOptions = {
                componentOptimization: {
                    enableMemo: true,
                    enableDebounce: true,
                    enableRenderTracking: process.env.NODE_ENV === 'development',
                    renderTrackingOptions: {
                        logToConsole: process.env.NODE_ENV === 'development',
                        showInDevtools: process.env.NODE_ENV === 'development',
                    },
                },
                virtualScroll: {
                    enabled: true,
                    defaultItemHeight: 40,
                    bufferSize: 1.5,
                    variableHeight: true,
                    smoothScroll: true,
                },
                animationOptimization: {
                    enabled: true,
                    useRequestAnimationFrame: true,
                    enableGpuAcceleration: true,
                    enableThrottling: true,
                    frameRateLimit: 60,
                },
            };

            // 合并配置
            const mergedOptions = {
                ...defaultOptions,
                componentOptimization: {
                    ...defaultOptions.componentOptimization,
                    ...options.componentOptimization,
                },
                virtualScroll: {
                    ...defaultOptions.virtualScroll,
                    ...options.virtualScroll,
                },
                animationOptimization: {
                    ...defaultOptions.animationOptimization,
                    ...options.animationOptimization,
                },
            };

            // 注册组件记忆化工具
            if (mergedOptions.componentOptimization?.enableMemo) {
                app.component('MemoComponent', createMemoComponent());
            }

            // 注册虚拟滚动指令
            if (mergedOptions.virtualScroll?.enabled) {
                app.directive('virtual-scroll', createVirtualScrollDirective({
                    defaultItemHeight: mergedOptions.virtualScroll.defaultItemHeight,
                    bufferSize: mergedOptions.virtualScroll.bufferSize,
                    variableHeight: mergedOptions.virtualScroll.variableHeight,
                    smoothScroll: mergedOptions.virtualScroll.smoothScroll,
                }));
            }

            // 注册动画优化器
            if (mergedOptions.animationOptimization?.enabled) {
                const animationOptimizer = createAnimationOptimizer({
                    useRequestAnimationFrame: mergedOptions.animationOptimization.useRequestAnimationFrame,
                    enableGpuAcceleration: mergedOptions.animationOptimization.enableGpuAcceleration,
                    enableThrottling: mergedOptions.animationOptimization.enableThrottling,
                    frameRateLimit: mergedOptions.animationOptimization.frameRateLimit,
                });

                // 提供全局动画优化器
                app.config.globalProperties.$animationOptimizer = animationOptimizer;
                app.provide('animationOptimizer', animationOptimizer);
            }

            // 注册渲染追踪
            if (mergedOptions.componentOptimization?.enableRenderTracking) {
                // 在开发环境中启用渲染追踪
                if (process.env.NODE_ENV === 'development') {
                    const renderTracker = {
                        trackRender: (componentName: string) => {
                            if (mergedOptions.componentOptimization?.renderTrackingOptions?.logToConsole) {
                                console.log(`[RenderTracker] Component rendered: ${componentName}`);
                            }
                        },
                    };

                    app.config.globalProperties.$renderTracker = renderTracker;
                    app.provide('renderTracker', renderTracker);
                }
            }

            // 提供全局配置
            app.config.globalProperties.$renderingOptimization = {
                options: mergedOptions,
            };
        },
    };
}

// 导出默认模块
export default createRenderingOptimizationModule;