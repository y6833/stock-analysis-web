/**
 * WebSocket 连接管理组合式函数
 * 提供实时数据订阅和推送功能
 */

import { ref, reactive, onUnmounted } from 'vue'
import { getWsBaseUrl } from '@/utils/apiBase'

// WebSocket 连接状态
export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

// 消息类型
export interface WebSocketMessage {
  type: string
  data: any
  timestamp: number
}

// 订阅回调函数类型
export type SubscriptionCallback = (data: any) => void

// WebSocket 配置
interface WebSocketConfig {
  url?: string
  protocols?: string[]
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

// 全局 WebSocket 状态
const wsInstance = ref<WebSocket | null>(null)
const status = ref<WebSocketStatus>('disconnected')
const subscriptions = reactive<Map<string, Set<SubscriptionCallback>>>(new Map())
const messageQueue = ref<WebSocketMessage[]>([])
const reconnectAttempts = ref(0)
const isReconnecting = ref(false)

// 默认配置
const defaultConfig: Required<WebSocketConfig> = {
  url: getWsBaseUrl(),
  protocols: [],
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000
}

let config: Required<WebSocketConfig> = { ...defaultConfig }
let reconnectTimer: NodeJS.Timeout | null = null
let heartbeatTimer: NodeJS.Timeout | null = null

export function useWebSocket(userConfig?: WebSocketConfig) {
  // 合并配置
  if (userConfig) {
    config = { ...config, ...userConfig }
  }

  /**
   * 连接 WebSocket
   */
  const connect = () => {
    if (wsInstance.value?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] 已经连接，无需重复连接')
      return
    }

    // WebSocket 默认关闭，设置 VITE_ENABLE_WS=true 后启用
    if (import.meta.env.VITE_ENABLE_WS !== 'true') {
      status.value = 'disconnected'
      return
    }

    try {
      status.value = 'connecting'
      console.log('[WebSocket] 正在连接...', config.url)

      wsInstance.value = new WebSocket(config.url, config.protocols)

      wsInstance.value.onopen = handleOpen
      wsInstance.value.onmessage = handleMessage
      wsInstance.value.onclose = handleClose
      wsInstance.value.onerror = handleError

    } catch (error) {
      console.error('[WebSocket] 连接失败:', error)
      status.value = 'error'
    }
  }

  /**
   * 断开连接
   */
  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }

    if (wsInstance.value) {
      wsInstance.value.close()
      wsInstance.value = null
    }

    status.value = 'disconnected'
    isReconnecting.value = false
    reconnectAttempts.value = 0
    console.log('[WebSocket] 已断开连接')
  }

  /**
   * 发送消息
   */
  const send = (message: any) => {
    if (wsInstance.value?.readyState === WebSocket.OPEN) {
      const msg: WebSocketMessage = {
        type: message.type || 'message',
        data: message.data || message,
        timestamp: Date.now()
      }
      
      wsInstance.value.send(JSON.stringify(msg))
      console.log('[WebSocket] 发送消息:', msg)
    } else {
      console.warn('[WebSocket] 连接未就绪，消息已加入队列')
      messageQueue.value.push({
        type: message.type || 'message',
        data: message.data || message,
        timestamp: Date.now()
      })
    }
  }

  /**
   * 订阅消息类型
   */
  const subscribe = (type: string, callback: SubscriptionCallback) => {
    if (!subscriptions.has(type)) {
      subscriptions.set(type, new Set())
    }
    
    subscriptions.get(type)!.add(callback)
    console.log(`[WebSocket] 订阅消息类型: ${type}`)

    // 返回取消订阅函数
    return () => {
      unsubscribe(type, callback)
    }
  }

  /**
   * 取消订阅
   */
  const unsubscribe = (type: string, callback: SubscriptionCallback) => {
    const callbacks = subscriptions.get(type)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        subscriptions.delete(type)
      }
      console.log(`[WebSocket] 取消订阅消息类型: ${type}`)
    }
  }

  /**
   * 处理连接打开
   */
  const handleOpen = () => {
    status.value = 'connected'
    reconnectAttempts.value = 0
    isReconnecting.value = false
    
    console.log('[WebSocket] 连接成功')

    // 发送队列中的消息
    while (messageQueue.value.length > 0) {
      const message = messageQueue.value.shift()
      if (message) {
        send(message)
      }
    }

    // 启动心跳
    startHeartbeat()

    // 发送认证信息（如果需要）
    const token = localStorage.getItem('token')
    if (token) {
      send({
        type: 'auth',
        data: { token }
      })
    }
  }

  /**
   * 处理接收消息
   */
  const handleMessage = (event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      console.log('[WebSocket] 收到消息:', message)

      // 处理心跳响应
      if (message.type === 'pong') {
        return
      }

      // 分发消息给订阅者
      const callbacks = subscriptions.get(message.type)
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(message.data)
          } catch (error) {
            console.error('[WebSocket] 回调函数执行错误:', error)
          }
        })
      }

      // 分发给通用订阅者
      const allCallbacks = subscriptions.get('*')
      if (allCallbacks) {
        allCallbacks.forEach(callback => {
          try {
            callback(message)
          } catch (error) {
            console.error('[WebSocket] 通用回调函数执行错误:', error)
          }
        })
      }

    } catch (error) {
      console.error('[WebSocket] 解析消息失败:', error)
    }
  }

  /**
   * 处理连接关闭
   */
  const handleClose = (event: CloseEvent) => {
    status.value = 'disconnected'
    
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }

    console.log('[WebSocket] 连接关闭:', event.code, event.reason)

    // 如果不是主动关闭，尝试重连
    if (event.code !== 1000 && reconnectAttempts.value < config.maxReconnectAttempts) {
      attemptReconnect()
    }
  }

  /**
   * 处理连接错误
   */
  const handleError = (event: Event) => {
    status.value = 'error'
    console.error('[WebSocket] 连接错误:', event)
  }

  /**
   * 尝试重连
   */
  const attemptReconnect = () => {
    if (isReconnecting.value || reconnectAttempts.value >= config.maxReconnectAttempts) {
      return
    }

    isReconnecting.value = true
    reconnectAttempts.value++

    console.log(`[WebSocket] 尝试重连 (${reconnectAttempts.value}/${config.maxReconnectAttempts})`)

    reconnectTimer = setTimeout(() => {
      connect()
    }, config.reconnectInterval)
  }

  /**
   * 启动心跳
   */
  const startHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
    }

    heartbeatTimer = setInterval(() => {
      if (wsInstance.value?.readyState === WebSocket.OPEN) {
        send({
          type: 'ping',
          data: { timestamp: Date.now() }
        })
      }
    }, config.heartbeatInterval)
  }

  /**
   * 获取连接状态
   */
  const getStatus = () => status.value

  /**
   * 检查是否已连接
   */
  const isConnected = () => status.value === 'connected'

  /**
   * 获取重连次数
   */
  const getReconnectAttempts = () => reconnectAttempts.value

  /**
   * 清理资源
   */
  const cleanup = () => {
    disconnect()
    subscriptions.clear()
    messageQueue.value = []
  }

  // 组件卸载时自动清理
  onUnmounted(() => {
    cleanup()
  })

  return {
    // 状态
    status: readonly(status),
    isReconnecting: readonly(isReconnecting),
    reconnectAttempts: readonly(reconnectAttempts),
    
    // 方法
    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe,
    
    // 工具方法
    getStatus,
    isConnected,
    getReconnectAttempts,
    cleanup
  }
}

// 只读包装器
function readonly<T>(ref: any): T {
  return ref
}

// 导出单例实例（可选）
export const globalWebSocket = useWebSocket()
