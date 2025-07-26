/**
 * 实时数据服务
 * 提供WebSocket连接和实时数据推送功能
 */

import { ref, reactive } from 'vue'
import eventBus from '@/utils/eventBus'

export interface RealtimeData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  timestamp: number
  high: number
  low: number
  open: number
}

export interface MarketAlert {
  id: string
  type: 'price' | 'volume' | 'technical' | 'news'
  level: 'info' | 'warning' | 'critical'
  symbol: string
  title: string
  message: string
  timestamp: number
  data?: any
}

class RealtimeService {
  private ws: WebSocket | null = null
  private reconnectTimer: number | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000

  // 连接状态
  public isConnected = ref(false)
  public isConnecting = ref(false)
  public connectionError = ref<string | null>(null)

  // 实时数据
  public realtimeData = reactive<Map<string, RealtimeData>>(new Map())
  public marketAlerts = ref<MarketAlert[]>([])
  public marketSummary = reactive({
    totalVolume: 0,
    advanceCount: 0,
    declineCount: 0,
    unchangedCount: 0,
    strongBuySignals: 0,
    strongSellSignals: 0
  })

  // 订阅管理
  private subscriptions = new Set<string>()
  private callbacks = new Map<string, Function[]>()

  constructor() {
    this.initializeConnection()
  }

  /**
   * 初始化WebSocket连接
   */
  private initializeConnection() {
    if (this.isConnecting.value || this.isConnected.value) {
      return
    }

    this.isConnecting.value = true
    this.connectionError.value = null

    try {
      // 暂时禁用WebSocket连接，因为后端还没有WebSocket支持
      console.log('WebSocket功能暂时禁用')
      this.isConnecting.value = false
      return

      // 在实际环境中，这里应该是真实的WebSocket服务器地址
      const wsUrl = process.env.NODE_ENV === 'production'
        ? 'wss://api.yourstock.com/ws'
        : 'ws://localhost:7001/ws'

      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = this.onOpen.bind(this)
      this.ws.onmessage = this.onMessage.bind(this)
      this.ws.onclose = this.onClose.bind(this)
      this.ws.onerror = this.onError.bind(this)

    } catch (error) {
      console.error('WebSocket连接失败:', error)
      this.connectionError.value = '连接失败'
      this.isConnecting.value = false
      this.scheduleReconnect()
    }
  }

  /**
   * WebSocket连接成功
   */
  private onOpen() {
    console.log('WebSocket连接已建立')
    this.isConnected.value = true
    this.isConnecting.value = false
    this.reconnectAttempts = 0
    this.connectionError.value = null

    // 重新订阅之前的股票
    this.resubscribeAll()

    // 发送心跳
    this.startHeartbeat()

    // 触发连接成功事件
    eventBus.emit('realtime-connected')
  }

  /**
   * 接收WebSocket消息
   */
  private onMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'quote':
          this.handleQuoteUpdate(data.payload)
          break
        case 'alert':
          this.handleMarketAlert(data.payload)
          break
        case 'summary':
          this.handleMarketSummary(data.payload)
          break
        case 'pong':
          // 心跳响应
          break
        default:
          console.warn('未知消息类型:', data.type)
      }
    } catch (error) {
      console.error('解析WebSocket消息失败:', error)
    }
  }

  /**
   * WebSocket连接关闭
   */
  private onClose(event: CloseEvent) {
    console.log('WebSocket连接已关闭:', event.code, event.reason)
    this.isConnected.value = false
    this.isConnecting.value = false

    if (event.code !== 1000) { // 非正常关闭
      this.scheduleReconnect()
    }

    eventBus.emit('realtime-disconnected')
  }

  /**
   * WebSocket连接错误
   */
  private onError(error: Event) {
    console.error('WebSocket连接错误:', error)
    this.connectionError.value = '连接错误'
    this.isConnecting.value = false
    this.scheduleReconnect()
  }

  /**
   * 处理股票行情更新
   */
  private handleQuoteUpdate(quote: RealtimeData) {
    this.realtimeData.set(quote.symbol, quote)

    // 触发股票数据更新事件
    eventBus.emit('stock-quote-updated', quote)

    // 执行订阅回调
    const callbacks = this.callbacks.get(quote.symbol)
    if (callbacks) {
      callbacks.forEach(callback => callback(quote))
    }
  }

  /**
   * 处理市场警报
   */
  private handleMarketAlert(alert: MarketAlert) {
    this.marketAlerts.value.unshift(alert)

    // 保持最多100条警报
    if (this.marketAlerts.value.length > 100) {
      this.marketAlerts.value = this.marketAlerts.value.slice(0, 100)
    }

    // 触发警报事件
    eventBus.emit('market-alert', alert)
  }

  /**
   * 处理市场概况更新
   */
  private handleMarketSummary(summary: any) {
    Object.assign(this.marketSummary, summary)
    eventBus.emit('market-summary-updated', summary)
  }

  /**
   * 订阅股票实时数据
   */
  public subscribe(symbol: string, callback?: Function): void {
    if (!symbol) return

    this.subscriptions.add(symbol)

    if (callback) {
      if (!this.callbacks.has(symbol)) {
        this.callbacks.set(symbol, [])
      }
      this.callbacks.get(symbol)!.push(callback)
    }

    if (this.isConnected.value && this.ws) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        symbol: symbol
      }))
    }
  }

  /**
   * 取消订阅股票实时数据
   */
  public unsubscribe(symbol: string, callback?: Function): void {
    if (!symbol) return

    if (callback) {
      const callbacks = this.callbacks.get(symbol)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
        if (callbacks.length === 0) {
          this.callbacks.delete(symbol)
        }
      }
    } else {
      this.callbacks.delete(symbol)
    }

    // 如果没有回调了，取消订阅
    if (!this.callbacks.has(symbol)) {
      this.subscriptions.delete(symbol)

      if (this.isConnected.value && this.ws) {
        this.ws.send(JSON.stringify({
          type: 'unsubscribe',
          symbol: symbol
        }))
      }
    }
  }

  /**
   * 批量订阅
   */
  public subscribeMultiple(symbols: string[]): void {
    symbols.forEach(symbol => this.subscribe(symbol))
  }

  /**
   * 获取股票实时数据
   */
  public getRealtimeData(symbol: string): RealtimeData | undefined {
    return this.realtimeData.get(symbol)
  }

  /**
   * 重新订阅所有股票
   */
  private resubscribeAll(): void {
    if (this.subscriptions.size > 0 && this.ws) {
      this.ws.send(JSON.stringify({
        type: 'subscribe_batch',
        symbols: Array.from(this.subscriptions)
      }))
    }
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(): void {
    setInterval(() => {
      if (this.isConnected.value && this.ws) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // 30秒心跳
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连')
      this.connectionError.value = '连接失败，请刷新页面重试'
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // 指数退避

    console.log(`${delay}ms后尝试第${this.reconnectAttempts}次重连`)

    this.reconnectTimer = setTimeout(() => {
      this.initializeConnection()
    }, delay) as unknown as number
  }

  /**
   * 手动重连
   */
  public reconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.reconnectAttempts = 0
    this.disconnect()

    setTimeout(() => {
      this.initializeConnection()
    }, 1000)
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, '用户主动断开')
      this.ws = null
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.isConnected.value = false
    this.isConnecting.value = false
  }

  /**
   * 清除警报
   */
  public clearAlerts(): void {
    this.marketAlerts.value = []
  }

  /**
   * 删除特定警报
   */
  public removeAlert(alertId: string): void {
    const index = this.marketAlerts.value.findIndex(alert => alert.id === alertId)
    if (index > -1) {
      this.marketAlerts.value.splice(index, 1)
    }
  }
}

// 创建单例实例
export const realtimeService = new RealtimeService()

// 模拟数据生成器（用于开发环境）
export class MockRealtimeService {
  private intervals: number[] = []

  constructor() {
    this.startMockData()
  }

  private startMockData() {
    // 模拟数据推送已完全禁用
    console.warn('模拟实时数据推送已禁用，请配置真实数据源')
    // 不再生成任何模拟数据或警报
  }

  public destroy() {
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals = []
  }
}

// 模拟数据已禁用 - 现在只使用真实数据源
// 如果需要测试，请配置真实的数据源或使用专门的测试环境
