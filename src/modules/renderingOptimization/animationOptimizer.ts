/**
 * 动画优化器
 * 提供高性能动画和过渡效果
 */

/**
 * 动画优化器配置选项
 */
export interface AnimationOptimizerOptions {
    // 使用 requestAnimationFrame
    useRequestAnimationFrame?: boolean;
    // 启用 GPU 加速
    enableGpuAcceleration?: boolean;
    // 启用动画节流
    enableThrottling?: boolean;
    // 动画帧率限制
    frameRateLimit?: number;
}

/**
 * 动画回调函数类型
 */
export type AnimationCallback = (timestamp: number) => boolean | void;

/**
 * 动画优化器接口
 */
export interface AnimationOptimizer {
    // 运行动画
    animate: (callback: AnimationCallback, duration?: number) => number;
    // 取消动画
    cancelAnimation: (id: number) => void;
    // 创建过渡
    createTransition: (
        element: HTMLElement,
        properties: string[],
        options?: {
            duration?: number;
            easing?: string;
            delay?: number;
            onComplete?: () => void;
        }
    ) => void;
    // 优化 CSS 属性
    optimizeCSS: (properties: Record<string, string>) => Record<string, string>;
    // 应用 GPU 加速
    applyGpuAcceleration: (element: HTMLElement) => void;
    // 节流动画回调
    throttleAnimation: (callback: AnimationCallback, fps?: number) => AnimationCallback;
}

/**
 * 创建动画优化器
 */
export function createAnimationOptimizer(options: AnimationOptimizerOptions = {}): AnimationOptimizer {
    // 默认配置
    const defaultOptions: Required<AnimationOptimizerOptions> = {
        useRequestAnimationFrame: true,
        enableGpuAcceleration: true,
        enableThrottling: true,
        frameRateLimit: 60,
    };

    // 合并配置
    const mergedOptions: Required<AnimationOptimizerOptions> = {
        ...defaultOptions,
        ...options,
    };

    // 动画映射
    const animations = new Map<number, number>();

    // 最后一次动画时间戳
    let lastAnimationTimestamp = 0;

    // 动画计数器
    let animationCounter = 0;

    /**
     * 运行动画
     */
    const animate = (callback: AnimationCallback, duration = 0): number => {
        const animationId = ++animationCounter;
        let startTime: number | null = null;
        let rafId: number;

        const animationStep = (timestamp: number) => {
            // 初始化开始时间
            if (startTime === null) {
                startTime = timestamp;
            }

            // 计算经过的时间
            const elapsed = timestamp - startTime;

            // 执行回调
            const result = callback(timestamp);

            // 如果回调返回 false 或者超过持续时间，则停止动画
            if (result === false || (duration > 0 && elapsed >= duration)) {
                animations.delete(animationId);
                return;
            }

            // 继续动画
            rafId = requestAnimationFrame(animationStep);
            animations.set(animationId, rafId);
        };

        // 启动动画
        if (mergedOptions.useRequestAnimationFrame) {
            rafId = requestAnimationFrame(animationStep);
            animations.set(animationId, rafId);
        } else {
            // 回退到 setTimeout
            const timeoutId = window.setTimeout(() => {
                callback(performance.now());
                animations.delete(animationId);
            }, 16); // 约 60fps
            animations.set(animationId, timeoutId);
        }

        return animationId;
    };

    /**
     * 取消动画
     */
    const cancelAnimation = (id: number): void => {
        const rafId = animations.get(id);
        if (rafId !== undefined) {
            if (mergedOptions.useRequestAnimationFrame) {
                cancelAnimationFrame(rafId);
            } else {
                clearTimeout(rafId);
            }
            animations.delete(id);
        }
    };

    /**
     * 创建过渡
     */
    const createTransition = (
        element: HTMLElement,
        properties: string[],
        options: {
            duration?: number;
            easing?: string;
            delay?: number;
            onComplete?: () => void;
        } = {}
    ): void => {
        // 默认选项
        const defaultTransitionOptions = {
            duration: 300,
            easing: 'ease',
            delay: 0,
        };

        // 合并选项
        const mergedTransitionOptions = {
            ...defaultTransitionOptions,
            ...options,
        };

        // 构建过渡字符串
        const transitionValue = properties
            .map(
                (prop) =>
                    `${prop} ${mergedTransitionOptions.duration}ms ${mergedTransitionOptions.easing} ${mergedTransitionOptions.delay}ms`
            )
            .join(', ');

        // 应用过渡
        element.style.transition = transitionValue;

        // 如果启用 GPU 加速
        if (mergedOptions.enableGpuAcceleration) {
            applyGpuAcceleration(element);
        }

        // 处理过渡结束事件
        if (options.onComplete) {
            const onTransitionEnd = (event: TransitionEvent) => {
                // 确保事件来自目标元素
                if (event.target === element) {
                    // 检查是否是最后一个过渡的属性
                    if (properties.includes(event.propertyName)) {
                        // 移除事件监听器
                        element.removeEventListener('transitionend', onTransitionEnd);
                        // 执行完成回调
                        options.onComplete?.();
                    }
                }
            };

            // 添加过渡结束事件监听器
            element.addEventListener('transitionend', onTransitionEnd);
        }
    };

    /**
     * 优化 CSS 属性
     */
    const optimizeCSS = (properties: Record<string, string>): Record<string, string> => {
        const optimizedProperties = { ...properties };

        // 如果启用 GPU 加速
        if (mergedOptions.enableGpuAcceleration) {
            // 检查是否有变换属性
            if (
                'transform' in optimizedProperties ||
                'opacity' in optimizedProperties ||
                'filter' in optimizedProperties
            ) {
                // 添加 will-change 属性
                const willChangeProperties = [];

                if ('transform' in optimizedProperties) {
                    willChangeProperties.push('transform');
                }
                if ('opacity' in optimizedProperties) {
                    willChangeProperties.push('opacity');
                }
                if ('filter' in optimizedProperties) {
                    willChangeProperties.push('filter');
                }

                optimizedProperties['will-change'] = willChangeProperties.join(', ');
            }

            // 使用 transform 替代 top/left 定位
            if ('top' in optimizedProperties || 'left' in optimizedProperties) {
                const top = parseFloat(optimizedProperties.top || '0');
                const left = parseFloat(optimizedProperties.left || '0');

                // 使用 transform 替代
                optimizedProperties.transform = `translate3d(${left}px, ${top}px, 0)`;
                delete optimizedProperties.top;
                delete optimizedProperties.left;
            }
        }

        return optimizedProperties;
    };

    /**
     * 应用 GPU 加速
     */
    const applyGpuAcceleration = (element: HTMLElement): void => {
        // 获取当前变换
        const currentTransform = element.style.transform;

        // 如果没有变换或者不包含 translate3d，添加 translate3d
        if (!currentTransform || !currentTransform.includes('translate3d')) {
            // 保留现有变换
            const newTransform = currentTransform
                ? `${currentTransform} translate3d(0,0,0)`
                : 'translate3d(0,0,0)';

            element.style.transform = newTransform;
        }

        // 添加 will-change 属性
        if (!element.style.willChange) {
            element.style.willChange = 'transform';
        }
    };

    /**
     * 节流动画回调
     */
    const throttleAnimation = (callback: AnimationCallback, fps = mergedOptions.frameRateLimit): AnimationCallback => {
        // 如果不启用节流，直接返回原始回调
        if (!mergedOptions.enableThrottling) {
            return callback;
        }

        // 计算帧间隔
        const interval = 1000 / fps;

        // 返回节流后的回调
        return (timestamp: number) => {
            // 如果距离上次执行的时间不足一帧，跳过
            if (timestamp - lastAnimationTimestamp < interval) {
                return true;
            }

            // 更新最后执行时间
            lastAnimationTimestamp = timestamp;

            // 执行原始回调
            return callback(timestamp);
        };
    };

    // 返回动画优化器
    return {
        animate,
        cancelAnimation,
        createTransition,
        optimizeCSS,
        applyGpuAcceleration,
        throttleAnimation,
    };
}

// 导出默认函数
export default createAnimationOptimizer;