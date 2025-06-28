/**
 * 防抖函数工具
 * 用于优化频繁触发的事件，如搜索、滚动、窗口大小调整等
 */

/**
 * 基础防抖函数
 * @param func 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @param immediate 是否立即执行第一次调用
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeoutId: number | null = null
  let lastCallTime = 0

  return function (this: any, ...args: Parameters<T>) {
    const context = this
    const now = Date.now()

    // 清除之前的定时器
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    // 如果是立即执行模式且是第一次调用
    if (immediate && now - lastCallTime > delay) {
      func.apply(context, args)
      lastCallTime = now
      return
    }

    // 设置新的定时器
    timeoutId = setTimeout(() => {
      func.apply(context, args)
      lastCallTime = Date.now()
      timeoutId = null
    }, delay) as unknown as number
  }
}

/**
 * 可取消的防抖函数
 * @param func 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @param immediate 是否立即执行第一次调用
 * @returns 包含防抖函数和取消方法的对象
 */
export function debounceCancelable<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  immediate = false
): {
  debounced: (...args: Parameters<T>) => void
  cancel: () => void
  flush: (...args: Parameters<T>) => void
} {
  let timeoutId: number | null = null
  let lastCallTime = 0
  let lastArgs: Parameters<T> | null = null
  let lastContext: any = null

  const debounced = function (this: any, ...args: Parameters<T>) {
    const context = this
    const now = Date.now()

    lastArgs = args
    lastContext = context

    // 清除之前的定时器
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    // 如果是立即执行模式且是第一次调用
    if (immediate && now - lastCallTime > delay) {
      func.apply(context, args)
      lastCallTime = now
      return
    }

    // 设置新的定时器
    timeoutId = setTimeout(() => {
      func.apply(context, args)
      lastCallTime = Date.now()
      timeoutId = null
    }, delay) as unknown as number
  }

  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    lastArgs = null
    lastContext = null
  }

  const flush = (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    
    const argsToUse = args.length > 0 ? args : lastArgs
    const contextToUse = lastContext

    if (argsToUse && contextToUse) {
      func.apply(contextToUse, argsToUse)
      lastCallTime = Date.now()
    }
  }

  return { debounced, cancel, flush }
}

/**
 * 节流函数
 * @param func 要节流的函数
 * @param delay 节流间隔（毫秒）
 * @param options 选项
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: {
    leading?: boolean // 是否在开始时执行
    trailing?: boolean // 是否在结束时执行
  } = {}
): (...args: Parameters<T>) => void {
  const { leading = true, trailing = true } = options
  let timeoutId: number | null = null
  let lastCallTime = 0
  let lastArgs: Parameters<T> | null = null
  let lastContext: any = null

  return function (this: any, ...args: Parameters<T>) {
    const context = this
    const now = Date.now()

    lastArgs = args
    lastContext = context

    // 如果是第一次调用且允许立即执行
    if (lastCallTime === 0 && leading) {
      func.apply(context, args)
      lastCallTime = now
      return
    }

    // 如果还在节流期内
    if (now - lastCallTime < delay) {
      // 清除之前的尾部执行定时器
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }

      // 如果允许尾部执行，设置定时器
      if (trailing) {
        timeoutId = setTimeout(() => {
          func.apply(lastContext!, lastArgs!)
          lastCallTime = Date.now()
          timeoutId = null
        }, delay - (now - lastCallTime)) as unknown as number
      }
      return
    }

    // 执行函数
    func.apply(context, args)
    lastCallTime = now
  }
}

/**
 * 组合防抖和节流的函数
 * 在指定时间内最多执行一次，但会延迟到最后一次调用
 * @param func 要处理的函数
 * @param throttleDelay 节流延迟
 * @param debounceDelay 防抖延迟
 * @returns 处理后的函数
 */
export function debounceThrottle<T extends (...args: any[]) => any>(
  func: T,
  throttleDelay: number,
  debounceDelay: number
): (...args: Parameters<T>) => void {
  const throttled = throttle(func, throttleDelay)
  return debounce(throttled, debounceDelay)
}

/**
 * 创建一个防抖的异步函数
 * @param asyncFunc 异步函数
 * @param delay 防抖延迟
 * @returns 防抖后的异步函数
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  asyncFunc: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: number | null = null
  let currentPromise: Promise<ReturnType<T>> | null = null

  return function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    const context = this

    // 如果有正在进行的Promise，返回它
    if (currentPromise) {
      return currentPromise
    }

    // 清除之前的定时器
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    // 创建新的Promise
    currentPromise = new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await asyncFunc.apply(context, args)
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          currentPromise = null
          timeoutId = null
        }
      }, delay) as unknown as number
    })

    return currentPromise
  }
}

/**
 * 创建一个带有最大等待时间的防抖函数
 * @param func 要防抖的函数
 * @param delay 防抖延迟
 * @param maxWait 最大等待时间
 * @returns 防抖后的函数
 */
export function debounceWithMaxWait<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  maxWait: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | null = null
  let maxTimeoutId: number | null = null
  let lastCallTime = 0

  return function (this: any, ...args: Parameters<T>) {
    const context = this
    const now = Date.now()

    // 清除之前的定时器
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    // 如果是第一次调用，设置最大等待定时器
    if (lastCallTime === 0) {
      lastCallTime = now
      maxTimeoutId = setTimeout(() => {
        func.apply(context, args)
        lastCallTime = 0
        timeoutId = null
        maxTimeoutId = null
      }, maxWait) as unknown as number
    }

    // 如果超过最大等待时间，立即执行
    if (now - lastCallTime >= maxWait) {
      if (maxTimeoutId !== null) {
        clearTimeout(maxTimeoutId)
        maxTimeoutId = null
      }
      func.apply(context, args)
      lastCallTime = 0
      return
    }

    // 设置防抖定时器
    timeoutId = setTimeout(() => {
      if (maxTimeoutId !== null) {
        clearTimeout(maxTimeoutId)
        maxTimeoutId = null
      }
      func.apply(context, args)
      lastCallTime = 0
      timeoutId = null
    }, delay) as unknown as number
  }
}

/**
 * Vue 3 组合式API的防抖hook
 * @param func 要防抖的函数
 * @param delay 延迟时间
 * @param immediate 是否立即执行
 * @returns 防抖后的函数和取消方法
 */
export function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  immediate = false
) {
  const { debounced, cancel, flush } = debounceCancelable(func, delay, immediate)
  
  // 在组件卸载时自动取消
  if (typeof window !== 'undefined' && 'onUnmounted' in window) {
    const { onUnmounted } = require('vue')
    onUnmounted(cancel)
  }
  
  return { debounced, cancel, flush }
}

export default {
  debounce,
  debounceCancelable,
  throttle,
  debounceThrottle,
  debounceAsync,
  debounceWithMaxWait,
  useDebounce
}
