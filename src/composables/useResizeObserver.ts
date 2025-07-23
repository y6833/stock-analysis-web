/**
 * 使用ResizeObserver监听元素大小变化的组合式函数
 */

import { onUnmounted } from 'vue'

/**
 * 使用ResizeObserver监听元素大小变化
 * @param element 要监听的元素
 * @param callback 大小变化时的回调函数
 * @param options ResizeObserver选项
 * @returns 清理函数
 */
export function useResizeObserver(
    element: HTMLElement,
    callback: ResizeObserverCallback,
    options?: ResizeObserverOptions
): () => void {
    // 创建ResizeObserver实例
    const observer = new ResizeObserver(callback)

    // 开始观察
    observer.observe(element, options)

    // 在组件卸载时停止观察
    onUnmounted(() => {
        observer.disconnect()
    })

    // 返回清理函数
    return () => {
        observer.disconnect()
    }
}

/**
 * 使用防抖的ResizeObserver
 * @param element 要监听的元素
 * @param callback 大小变化时的回调函数
 * @param delay 防抖延迟时间（毫秒）
 * @param options ResizeObserver选项
 * @returns 清理函数
 */
export function useDebounceResizeObserver(
    element: HTMLElement,
    callback: ResizeObserverCallback,
    delay: number = 200,
    options?: ResizeObserverOptions
): () => void {
    let timeoutId: number | null = null

    // 创建防抖回调
    const debouncedCallback: ResizeObserverCallback = (entries, observer) => {
        if (timeoutId !== null) {
            window.clearTimeout(timeoutId)
        }

        timeoutId = window.setTimeout(() => {
            callback(entries, observer)
            timeoutId = null
        }, delay)
    }

    // 使用防抖回调创建观察者
    const cleanup = useResizeObserver(element, debouncedCallback, options)

    // 增强清理函数，确保清除超时
    return () => {
        if (timeoutId !== null) {
            window.clearTimeout(timeoutId)
        }
        cleanup()
    }
}

export default useResizeObserver