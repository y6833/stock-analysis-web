/**
 * 消息服务类型声明
 */

interface MessageService {
  info(text: string, timeout?: number): void
  success(text: string, timeout?: number): void
  warning(text: string, timeout?: number): void
  error(text: string, timeout?: number): void
}

declare global {
  interface Window {
    $message?: MessageService
  }
}

export {}
