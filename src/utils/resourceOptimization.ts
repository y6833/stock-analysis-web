/**
 * 资源优化工具
 * 提供资源预加载、预取和动态加载功能
 */

/**
 * 预加载资源
 * @param url 资源URL
 * @param type 资源类型
 */
export function preloadResource(url: string, type: 'script' | 'style' | 'image' | 'font' | 'fetch' = 'fetch'): void {
    if (typeof window === 'undefined') return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = url
    link.as = type

    if (type === 'font') {
        link.setAttribute('crossorigin', 'anonymous')
    }

    document.head.appendChild(link)
}

/**
 * 预取资源
 * @param url 资源URL
 */
export function prefetchResource(url: string): void {
    if (typeof window === 'undefined') return

    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = url
    document.head.appendChild(link)
}

/**
 * 预连接到域名
 * @param url 域名URL
 * @param crossorigin 是否跨域
 */
export function preconnect(url: string, crossorigin = false): void {
    if (typeof window === 'undefined') return

    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = url

    if (crossorigin) {
        link.setAttribute('crossorigin', 'anonymous')
    }

    document.head.appendChild(link)
}

/**
 * DNS预解析
 * @param url 域名URL
 */
export function dnsPrefetch(url: string): void {
    if (typeof window === 'undefined') return

    const link = document.createElement('link')
    link.rel = 'dns-prefetch'
    link.href = url
    document.head.appendChild(link)
}

/**
 * 动态加载脚本
 * @param url 脚本URL
 * @param async 是否异步加载
 * @param defer 是否延迟执行
 * @returns Promise
 */
export function loadScript(url: string, async = true, defer = true): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject(new Error('loadScript can only be used in browser environment'))
            return
        }

        const script = document.createElement('script')
        script.src = url
        script.async = async
        script.defer = defer

        script.onload = () => resolve()
        script.onerror = () => reject(new Error(`Failed to load script: ${url}`))

        document.head.appendChild(script)
    })
}

/**
 * 动态加载样式
 * @param url 样式URL
 * @returns Promise
 */
export function loadStyle(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject(new Error('loadStyle can only be used in browser environment'))
            return
        }

        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = url

        link.onload = () => resolve()
        link.onerror = () => reject(new Error(`Failed to load style: ${url}`))

        document.head.appendChild(link)
    })
}

/**
 * 根据视口可见性动态加载资源
 * @param url 资源URL
 * @param type 资源类型
 * @param options 配置选项
 */
export function loadResourceWhenVisible(
    url: string,
    type: 'script' | 'style' | 'image',
    options: {
        rootMargin?: string,
        threshold?: number,
        id?: string
    } = {}
): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
        // 降级处理：直接加载资源
        if (type === 'script') loadScript(url)
        else if (type === 'style') loadStyle(url)
        else if (type === 'image') {
            const img = new Image()
            img.src = url
        }
        return
    }

    // 创建一个占位元素作为观察目标
    const target = document.createElement('div')
    target.id = options.id || `resource-observer-${Math.random().toString(36).substr(2, 9)}`
    target.style.height = '1px'
    target.style.width = '1px'
    target.style.position = 'absolute'
    target.style.bottom = '200px' // 在视口底部上方200px
    target.style.left = '0'
    target.style.pointerEvents = 'none'
    document.body.appendChild(target)

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // 元素可见，加载资源
                    if (type === 'script') loadScript(url)
                    else if (type === 'style') loadStyle(url)
                    else if (type === 'image') {
                        const img = new Image()
                        img.src = url
                    }

                    // 停止观察
                    observer.disconnect()

                    // 移除占位元素
                    if (target.parentNode) {
                        target.parentNode.removeChild(target)
                    }
                }
            })
        },
        {
            rootMargin: options.rootMargin || '0px 0px 200px 0px',
            threshold: options.threshold || 0.1
        }
    )

    observer.observe(target)
}

/**
 * 检测网络状况并相应地加载资源
 * @param resource 资源配置
 */
export function adaptiveLoading(resource: {
    highQuality: string,
    lowQuality: string,
    type: 'script' | 'style' | 'image'
}): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !('connection' in navigator)) {
            // 降级：直接加载高质量资源
            if (resource.type === 'script') {
                loadScript(resource.highQuality).then(resolve).catch(reject)
            } else if (resource.type === 'style') {
                loadStyle(resource.highQuality).then(resolve).catch(reject)
            } else if (resource.type === 'image') {
                const img = new Image()
                img.onload = () => resolve()
                img.onerror = () => reject(new Error(`Failed to load image: ${resource.highQuality}`))
                img.src = resource.highQuality
            }
            return
        }

        // @ts-ignore - connection属性可能不存在于某些浏览器
        const connection = navigator.connection

        // 根据网络状况选择资源
        const isSlowConnection = connection &&
            (connection.saveData ||
                connection.effectiveType === 'slow-2g' ||
                connection.effectiveType === '2g' ||
                connection.effectiveType === '3g')

        const resourceUrl = isSlowConnection ? resource.lowQuality : resource.highQuality

        if (resource.type === 'script') {
            loadScript(resourceUrl).then(resolve).catch(reject)
        } else if (resource.type === 'style') {
            loadStyle(resourceUrl).then(resolve).catch(reject)
        } else if (resource.type === 'image') {
            const img = new Image()
            img.onload = () => resolve()
            img.onerror = () => reject(new Error(`Failed to load image: ${resourceUrl}`))
            img.src = resourceUrl
        }
    })
}/*
*
 * 图片懒加载工具
 * 使用Intersection Observer API实现图片懒加载
 * @param imgElement 图片元素
 * @param src 图片源URL
 * @param options 配置选项
 */
export function lazyLoadImage(
    imgElement: HTMLImageElement,
    src: string,
    options: {
        rootMargin?: string,
        threshold?: number,
        placeholder?: string,
        errorPlaceholder?: string
    } = {}
): void {
    // 设置占位图
    if (options.placeholder) {
        imgElement.src = options.placeholder
    }

    // 如果浏览器不支持IntersectionObserver，直接加载图片
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
        imgElement.src = src
        return
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // 图片进入视口，加载真实图片
                    imgElement.src = src

                    // 处理加载错误
                    imgElement.onerror = () => {
                        if (options.errorPlaceholder) {
                            imgElement.src = options.errorPlaceholder
                        }
                    }

                    // 停止观察
                    observer.unobserve(imgElement)
                }
            })
        },
        {
            rootMargin: options.rootMargin || '0px 0px 200px 0px',
            threshold: options.threshold || 0.1
        }
    )

    observer.observe(imgElement)
}

/**
 * 创建Vue图片懒加载指令
 * @returns Vue指令对象
 */
export function createLazyImageDirective() {
    return {
        mounted(el: HTMLImageElement, binding: any) {
            const src = binding.value
            const options = binding.arg || {}

            lazyLoadImage(el, src, options)
        },
        updated(el: HTMLImageElement, binding: any) {
            if (binding.value !== binding.oldValue) {
                const src = binding.value
                const options = binding.arg || {}

                lazyLoadImage(el, src, options)
            }
        }
    }
}

/**
 * 优化字体加载
 * 实现字体文件的优化加载策略
 * @param fontUrl 字体文件URL
 * @param fontFamily 字体族名称
 * @param options 配置选项
 */
export function optimizeFontLoading(
    fontUrl: string,
    fontFamily: string,
    options: {
        display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional',
        preload?: boolean
    } = {}
): void {
    if (typeof window === 'undefined') return

    // 创建字体face
    const fontFace = new FontFace(
        fontFamily,
        `url(${fontUrl})`,
        {
            display: options.display || 'swap'
        }
    )

    // 加载字体
    fontFace.load()
        .then(loadedFace => {
            // 添加到字体集
            document.fonts.add(loadedFace)
        })
        .catch(err => {
            console.error(`Failed to load font: ${fontFamily}`, err)
        })

    // 如果需要预加载
    if (options.preload) {
        preloadResource(fontUrl, 'font')
    }
}

/**
 * 组件级别代码分割工具
 * 用于更细粒度的组件懒加载控制
 * @param importFn 导入函数
 * @param chunkName 块名称（用于webpack命名）
 * @returns 异步组件
 */
export function lazyComponent(importFn: () => Promise<any>, chunkName?: string): any {
    // 添加注释以支持webpack命名块
    if (chunkName) {
        return () => importFn()
    }
    return importFn
}

/**
 * 智能资源预加载
 * 基于用户行为和导航模式预测并预加载资源
 * @param resourceMap 资源映射
 */
export function smartResourcePreloading(resourceMap: Record<string, string[]>): void {
    if (typeof window === 'undefined') return

    // 当前路径
    const currentPath = window.location.pathname

    // 获取当前路径可能的下一个资源
    const nextResources = resourceMap[currentPath] || []

    // 使用Intersection Observer API检测用户是否接近页面底部
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // 用户接近页面底部，预加载可能的下一个资源
                    if (nextResources.length > 0) {
                        // 使用requestIdleCallback在浏览器空闲时预加载
                        if ('requestIdleCallback' in window) {
                            window.requestIdleCallback(() => {
                                nextResources.forEach(resource => {
                                    prefetchResource(resource)
                                })
                            }, { timeout: 2000 })
                        } else {
                            // 降级为setTimeout
                            setTimeout(() => {
                                nextResources.forEach(resource => {
                                    prefetchResource(resource)
                                })
                            }, 3000)
                        }
                    }

                    // 停止观察
                    observer.disconnect()
                }
            })
        },
        {
            rootMargin: '0px 0px 200px 0px',
            threshold: 0.1
        }
    )

    // 创建一个观察目标（页面底部）
    const target = document.createElement('div')
    target.style.height = '1px'
    target.style.width = '100%'
    target.style.position = 'absolute'
    target.style.bottom = '0'
    target.style.left = '0'
    target.style.pointerEvents = 'none'
    document.body.appendChild(target)

    observer.observe(target)
}

/**
 * 资源优先级管理
 * 根据资源重要性设置加载优先级
 * @param resources 资源列表
 */
export function prioritizeResources(resources: Array<{
    url: string,
    type: 'script' | 'style' | 'image' | 'font' | 'fetch',
    priority: 'high' | 'medium' | 'low'
}>): void {
    if (typeof window === 'undefined') return

    // 按优先级排序
    const sortedResources = [...resources].sort((a, b) => {
        const priorityMap = { high: 0, medium: 1, low: 2 }
        return priorityMap[a.priority] - priorityMap[b.priority]
    })

    // 高优先级资源立即加载
    const highPriorityResources = sortedResources.filter(r => r.priority === 'high')
    highPriorityResources.forEach(resource => {
        preloadResource(resource.url, resource.type)
    })

    // 中优先级资源在DOMContentLoaded后加载
    const mediumPriorityResources = sortedResources.filter(r => r.priority === 'medium')
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            mediumPriorityResources.forEach(resource => {
                preloadResource(resource.url, resource.type)
            })
        })
    } else {
        mediumPriorityResources.forEach(resource => {
            preloadResource(resource.url, resource.type)
        })
    }

    // 低优先级资源在load事件后或使用requestIdleCallback加载
    const lowPriorityResources = sortedResources.filter(r => r.priority === 'low')
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
            lowPriorityResources.forEach(resource => {
                prefetchResource(resource.url)
            })
        }, { timeout: 2000 })
    } else {
        window.addEventListener('load', () => {
            setTimeout(() => {
                lowPriorityResources.forEach(resource => {
                    prefetchResource(resource.url)
                })
            }, 1000)
        })
    }
}