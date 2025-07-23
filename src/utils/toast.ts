import { createApp } from 'vue'
import MessageToast from '@/components/common/MessageToast.vue'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastOptions {
  message: string
  duration?: number
  type?: ToastType
}

export function showToast(options: ToastOptions | string) {
  // 如果传入的是字符串，则默认为info类型的消息
  const opts: ToastOptions = typeof options === 'string'
    ? { message: options, type: 'info' }
    : options

  // 创建一个挂载点
  const mountNode = document.createElement('div')
  document.body.appendChild(mountNode)

  // 创建Toast实例
  const toastApp = createApp(MessageToast, {
    message: opts.message,
    duration: opts.duration || 3000,
    type: opts.type || 'info'
  })

  // 挂载Toast
  const instance = toastApp.mount(mountNode)

  // 监听动画结束后移除DOM
  setTimeout(() => {
    toastApp.unmount()
    document.body.removeChild(mountNode)
  }, (opts.duration || 3000) + 300) // 加300ms等待动画结束

  return instance
}

// 便捷方法
export const toast = {
  info(message: string, duration?: number) {
    return showToast({ message, type: 'info', duration })
  },
  success(message: string, duration?: number) {
    return showToast({ message, type: 'success', duration })
  },
  warning(message: string, duration?: number) {
    return showToast({ message, type: 'warning', duration })
  },
  error(message: string, duration?: number) {
    return showToast({ message, type: 'error', duration })
  }
}

export default MessageToast
