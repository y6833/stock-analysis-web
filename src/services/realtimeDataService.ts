/**
 * 实时数据推送服务
 * 通过WebSocket提供实时股票数据推送
 */

import { EventEmitter } from 'events'
import type { StockQuote } from '@/types/stock'

/**
 * 订阅类型
 */
export type SubscriptionType = 'quote' | 'trade' | 'depth' | 'kline'

/**
 * 订阅配置
 */
interface SubscriptionConfig {
  symbol: string
  type: SubscriptionType
  interval?: string // 对于K线数据
}

/**
 * WebSocket消息格式
 */
interface WebSocketMessage {
  action: 'subscribe' | 'unsubscribe' | 'data' | 'error' | 'ping' | 'pong'
  type?: SubscriptionType
  symbol?: string
  data?: any
  error?: string
  timestamp?: number
}

/**
 * 连接状态
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

/**
 * 实时数据服务
 */
export class RealtimeDataService extends EventEmitter {
  private ws: WebSocket | null = null
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED
  private subscriptions: Map<string, SubscriptionConfig> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private heartbeatTimeout: NodeJS.Timeout | null = null
  private wsUrl: string

  constructor(wsUrl = 'ws://localhost:7001/realtime') {
    super()
    this.wsUrl = wsUrl
  }

  /**
   * 连接WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connectionStatus === ConnectionStatus.CONNECTED) {
        resolve()
        return
      }

      this.setConnectionStatus(ConnectionStatus.CONNECTING)

      try {
        this.ws = new WebSocket(this.wsUrl)

        this.ws.onopen = () => {
          console.log('WebSocket连接已建立')
          this.setConnectionStatus(ConnectionStatus.CONNECTED)
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.resubscribeAll()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket连接已关闭:', event.code, event.reason)
          this.setConnectionStatus(ConnectionStatus.DISCONNECTED)
          this.stopHeartbeat()
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket连接错误:', error)
          this.setConnectionStatus(ConnectionStatus.ERROR)
          reject(error)
        }

      } catch (error) {
        this.setConnectionStatus(ConnectionStatus.ERROR)
        reject(error)
      }
    })
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    this.stopHeartbeat()
    this.setConnectionStatus(ConnectionStatus.DISCONNECTED)
    this.subscriptions.clear()
  }

  /**
   * 重连
   */
  private async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连')
      this.setConnectionStatus(ConnectionStatus.ERROR)
      return
    }

    this.reconnectAttempts++
    this.setConnectionStatus(ConnectionStatus.RECONNECTING)

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    console.log(`${delay}ms后尝试第${this.reconnectAttempts}次重连`)

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('重连失败:', error)
      })
    }, delay)
  }

  /**
   * 设置连接状态
   */
  private setConnectionStatus(status: ConnectionStatus) {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status
      this.emit('connectionStatusChanged', status)
    }
  }

  /**
   * 开始心跳
   */
  private startHeartbeat() {
    this.stopHeartbeat()
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessage({ action: 'ping', timestamp: Date.now() })
        
        // 设置心跳超时
        this.heartbeatTimeout = setTimeout(() => {
          console.warn('心跳超时，关闭连接')
          this.ws?.close()
        }, 5000)
      }
    }, 30000) // 30秒心跳间隔
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }
  }

  /**
   * 处理WebSocket消息
   */
  private handleMessage(data: string) {
    try {
      const message: WebSocketMessage = JSON.parse(data)

      switch (message.action) {
        case 'data':
          this.handleDataMessage(message)
          break
        case 'error':
          this.handleErrorMessage(message)
          break
        case 'pong':
          // 收到心跳响应，清除超时
          if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout)
            this.heartbeatTimeout = null
          }
          break
        default:
          console.warn('未知的WebSocket消息类型:', message.action)
      }
    } catch (error) {
      console.error('解析WebSocket消息失败:', error)
    }
  }

  /**
   * 处理数据消息
   */
  private handleDataMessage(message: WebSocketMessage) {
    if (!message.symbol || !message.type || !message.data) {
      return
    }

    const eventName = `${message.type}:${message.symbol}`
    this.emit(eventName, message.data)
    this.emit('data', {
      symbol: message.symbol,
      type: message.type,
      data: message.data,
      timestamp: message.timestamp || Date.now()
    })
  }

  /**
   * 处理错误消息
   */
  private handleErrorMessage(message: WebSocketMessage) {
    console.error('WebSocket服务器错误:', message.error)
    this.emit('error', new Error(message.error))
  }

  /**
   * 发送消息
   */
  private sendMessage(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket未连接，无法发送消息')
    }
  }

  /**
   * 订阅股票行情
   */
  subscribeQuote(symbol: string): void {
    const key = `quote:${symbol}`
    const config: SubscriptionConfig = { symbol, type: 'quote' }
    
    this.subscriptions.set(key, config)
    
    if (this.connectionStatus === ConnectionStatus.CONNECTED) {
      this.sendMessage({
        action: 'subscribe',
        type: 'quote',
        symbol
      })
    }
  }

  /**
   * 订阅K线数据
   */
  subscribeKline(symbol: string, interval = '1m'): void {
    const key = `kline:${symbol}:${interval}`
    const config: SubscriptionConfig = { symbol, type: 'kline', interval }
    
    this.subscriptions.set(key, config)
    
    if (this.connectionStatus === ConnectionStatus.CONNECTED) {
      this.sendMessage({
        action: 'subscribe',
        type: 'kline',
        symbol,
        data: { interval }
      })
    }
  }

  /**
   * 取消订阅
   */
  unsubscribe(symbol: string, type: SubscriptionType, interval?: string): void {
    const key = interval ? `${type}:${symbol}:${interval}` : `${type}:${symbol}`
    
    this.subscriptions.delete(key)
    
    if (this.connectionStatus === ConnectionStatus.CONNECTED) {
      this.sendMessage({
        action: 'unsubscribe',
        type,
        symbol,
        data: interval ? { interval } : undefined
      })
    }
  }

  /**
   * 重新订阅所有
   */
  private resubscribeAll() {
    this.subscriptions.forEach((config, key) => {
      this.sendMessage({
        action: 'subscribe',
        type: config.type,
        symbol: config.symbol,
        data: config.interval ? { interval: config.interval } : undefined
      })
    })
  }

  /**
   * 监听股票行情更新
   */
  onQuoteUpdate(symbol: string, callback: (quote: StockQuote) => void): void {
    this.on(`quote:${symbol}`, callback)
  }

  /**
   * 监听K线数据更新
   */
  onKlineUpdate(symbol: string, interval: string, callback: (kline: any) => void): void {
    this.on(`kline:${symbol}`, callback)
  }

  /**
   * 移除监听器
   */
  offQuoteUpdate(symbol: string, callback?: (quote: StockQuote) => void): void {
    if (callback) {
      this.off(`quote:${symbol}`, callback)
    } else {
      this.removeAllListeners(`quote:${symbol}`)
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus
  }

  /**
   * 获取订阅列表
   */
  getSubscriptions(): SubscriptionConfig[] {
    return Array.from(this.subscriptions.values())
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.connectionStatus === ConnectionStatus.CONNECTED
  }
}

// 创建全局实时数据服务实例
export const realtimeDataService = new RealtimeDataService()

export default realtimeDataService
