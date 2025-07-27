/**
 * Mock real-time service for demonstration purposes
 * This provides simulated real-time data when WebSocket is not available
 */

import { ref, reactive, computed } from 'vue'
import { mockHoldings } from '@/data/mockPortfolioData'

export interface RealtimeQuote {
  symbol: string
  name: string
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
  type: 'warning' | 'danger' | 'info'
  title: string
  message: string
  timestamp: number
  symbol?: string
}

export interface MarketSummary {
  totalStocks: number
  advancing: number
  declining: number
  unchanged: number
  totalVolume: number
  totalTurnover: number
}

class MockRealtimeService {
  // Connection state
  public isConnected = ref(false)
  public isConnecting = ref(false)
  public connectionError = ref<string | null>(null)

  // Data storage
  public realtimeData = reactive(new Map<string, RealtimeQuote>())
  public marketAlerts = ref<MarketAlert[]>([])
  public marketSummary = reactive<MarketSummary>({
    totalStocks: 5200, // A股总数量
    advancing: 2340,   // 上涨股票数
    declining: 2180,   // 下跌股票数
    unchanged: 680,    // 平盘股票数
    totalVolume: 850000000000, // 总成交量（股）
    totalTurnover: 1250000000000 // 总成交额（元）约1.25万亿
  })

  // Subscriptions
  private subscriptions = new Set<string>()
  private intervals = new Map<string, NodeJS.Timeout>()

  constructor() {
    this.initializeMockData()
  }

  /**
   * Initialize with realistic Chinese stock market data
   */
  private initializeMockData() {
    // Add realistic quotes for Chinese stocks
    mockHoldings.forEach(holding => {
      const basePrice = holding.currentPrice
      const dailyChange = (Math.random() - 0.5) * 0.06 // ±3% daily change
      const currentPrice = basePrice * (1 + dailyChange)

      this.realtimeData.set(holding.symbol, {
        symbol: holding.symbol,
        name: holding.name,
        price: Number(currentPrice.toFixed(2)),
        change: Number((currentPrice - basePrice).toFixed(2)),
        changePercent: Number((dailyChange * 100).toFixed(2)),
        volume: this.generateRealisticVolume(holding.symbol),
        timestamp: Date.now(),
        high: Number((basePrice * (1 + Math.abs(dailyChange) + Math.random() * 0.02)).toFixed(2)),
        low: Number((basePrice * (1 - Math.abs(dailyChange) - Math.random() * 0.02)).toFixed(2)),
        open: Number((basePrice * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2))
      })
    })

    // Add realistic market alerts based on Chinese market conditions
    this.marketAlerts.value = [
      {
        id: 'ALERT_001',
        type: 'warning',
        title: '沪深300指数波动',
        message: '沪深300指数盘中波动超过2.5%，当前跌幅1.8%，建议关注仓位风险',
        timestamp: Date.now() - 1800000, // 30分钟前
        symbol: '000300.SH'
      },
      {
        id: 'ALERT_002',
        type: 'info',
        title: '北向资金动向',
        message: '北向资金今日净流入23.5亿元，主要流入银行和消费板块',
        timestamp: Date.now() - 3600000, // 1小时前
        symbol: 'NORTHBOUND'
      },
      {
        id: 'ALERT_003',
        type: 'danger',
        title: '个股异动预警',
        message: '恒瑞医药盘中跌幅达6.8%，成交量放大至平均水平的280%',
        timestamp: Date.now() - 5400000, // 1.5小时前
        symbol: '600276.SH'
      },
      {
        id: 'ALERT_004',
        type: 'warning',
        title: '板块轮动提醒',
        message: '新能源汽车板块集体调整，比亚迪、宁德时代均跌超3%',
        timestamp: Date.now() - 7200000, // 2小时前
        symbol: 'NEW_ENERGY'
      }
    ]
  }

  /**
   * Generate realistic trading volume based on stock characteristics
   */
  private generateRealisticVolume(symbol: string): number {
    const volumeMap: { [key: string]: number } = {
      '000001.SZ': 45000000,  // 平安银行 - 高流动性
      '600036.SH': 35000000,  // 招商银行
      '600519.SH': 8000000,   // 贵州茅台 - 价格高，成交量相对较小
      '000858.SZ': 12000000,  // 五粮液
      '002415.SZ': 28000000,  // 海康威视
      '300059.SZ': 55000000,  // 东方财富 - 券商股活跃
      '600276.SH': 15000000,  // 恒瑞医药
      '002594.SZ': 25000000,  // 比亚迪
      '000002.SZ': 38000000,  // 万科A - 地产股活跃
      '600887.SH': 18000000,  // 伊利股份
      '300750.SZ': 22000000,  // 宁德时代
      '601318.SH': 42000000   // 中国平安
    }

    const baseVolume = volumeMap[symbol] || 20000000
    // 添加随机波动 ±30%
    const variation = (Math.random() - 0.5) * 0.6
    return Math.floor(baseVolume * (1 + variation))
  }

  /**
   * Simulate connection
   */
  async connect(): Promise<void> {
    if (this.isConnected.value || this.isConnecting.value) {
      return
    }

    this.isConnecting.value = true
    this.connectionError.value = null

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    this.isConnected.value = true
    this.isConnecting.value = false

    console.log('Mock real-time service connected')
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    this.isConnected.value = false
    this.isConnecting.value = false

    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals.clear()
    this.subscriptions.clear()

    console.log('Mock real-time service disconnected')
  }

  /**
   * Reconnect
   */
  async reconnect(): Promise<void> {
    this.disconnect()
    await this.connect()
  }

  /**
   * Subscribe to symbol updates
   */
  subscribe(symbol: string): void {
    if (this.subscriptions.has(symbol)) {
      return
    }

    this.subscriptions.add(symbol)

    // Create mock data if not exists
    if (!this.realtimeData.has(symbol)) {
      this.realtimeData.set(symbol, {
        symbol,
        name: `股票${symbol}`,
        price: 10 + Math.random() * 100,
        change: (Math.random() - 0.5) * 2,
        changePercent: (Math.random() - 0.5) * 10,
        volume: Math.floor(Math.random() * 1000000) + 100000,
        timestamp: Date.now(),
        high: 0,
        low: 0,
        open: 0
      })
    }

    // Start updating this symbol
    const interval = setInterval(() => {
      this.updateSymbolData(symbol)
    }, 2000 + Math.random() * 3000) // Random interval between 2-5 seconds

    this.intervals.set(symbol, interval)
    console.log(`Subscribed to ${symbol}`)
  }

  /**
   * Unsubscribe from symbol updates
   */
  unsubscribe(symbol: string): void {
    this.subscriptions.delete(symbol)

    const interval = this.intervals.get(symbol)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(symbol)
    }

    console.log(`Unsubscribed from ${symbol}`)
  }

  /**
   * Update symbol data with realistic Chinese market price movements
   */
  private updateSymbolData(symbol: string): void {
    const quote = this.realtimeData.get(symbol)
    if (!quote) return

    // Generate realistic price movement based on stock characteristics
    const volatilityMap: { [key: string]: number } = {
      '600519.SH': 0.008, // 茅台波动较小
      '600036.SH': 0.012, // 银行股波动中等
      '000001.SZ': 0.015, // 平安银行波动稍大
      '002594.SZ': 0.025, // 比亚迪波动较大
      '300059.SZ': 0.030, // 东方财富波动大
      '002415.SZ': 0.020, // 海康威视
      '600276.SH': 0.022, // 恒瑞医药
      '300750.SZ': 0.028  // 宁德时代波动大
    }

    const volatility = volatilityMap[symbol] || 0.018 // 默认1.8%波动
    const changePercent = (Math.random() - 0.5) * volatility * 2 // 双向波动
    const previousPrice = quote.price
    const newPrice = previousPrice * (1 + changePercent)
    const change = newPrice - previousPrice

    // 应用涨跌停限制（A股±10%）
    const limitUp = previousPrice * 1.10
    const limitDown = previousPrice * 0.90
    const finalPrice = Math.max(limitDown, Math.min(limitUp, newPrice))
    const finalChange = finalPrice - previousPrice

    // Update quote
    quote.price = Number(finalPrice.toFixed(2))
    quote.change = Number(finalChange.toFixed(2))
    quote.changePercent = Number(((finalChange / previousPrice) * 100).toFixed(2))
    quote.timestamp = Date.now()

    // Update high/low
    quote.high = Math.max(quote.high, quote.price)
    quote.low = quote.low === 0 ? quote.price : Math.min(quote.low, quote.price)

    // Generate alerts based on significant movements
    if (Math.abs(quote.changePercent) > 3 && Math.random() < 0.3) {
      this.generateRealisticAlert(symbol, quote)
    }
  }

  /**
   * Generate realistic market alerts based on Chinese market conditions
   */
  private generateRealisticAlert(symbol: string, quote: RealtimeQuote): void {
    const changePercent = Math.abs(quote.changePercent)
    let type: 'warning' | 'danger' | 'info' = 'info'
    let title = ''
    let message = ''

    if (changePercent > 5) {
      type = 'danger'
      title = `${quote.name}异动预警`
      message = `${quote.name}(${symbol})${quote.changePercent > 0 ? '涨' : '跌'}幅达${Math.abs(quote.changePercent).toFixed(2)}%，请关注风险`
    } else if (changePercent > 3) {
      type = 'warning'
      title = `${quote.name}波动提醒`
      message = `${quote.name}盘中波动较大，当前${quote.changePercent > 0 ? '涨' : '跌'}幅${Math.abs(quote.changePercent).toFixed(2)}%`
    } else {
      type = 'info'
      title = `${quote.name}交易活跃`
      message = `${quote.name}成交活跃，价格${quote.changePercent > 0 ? '上涨' : '下跌'}${Math.abs(quote.changePercent).toFixed(2)}%`
    }

    // Add sector-specific context
    const sectorContext = this.getSectorContext(symbol)
    if (sectorContext) {
      message += `，${sectorContext}`
    }

    const alert: MarketAlert = {
      id: `ALERT_${Date.now()}_${symbol}`,
      type,
      title,
      message,
      timestamp: Date.now(),
      symbol
    }

    this.marketAlerts.value.unshift(alert)

    // Keep only last 15 alerts
    if (this.marketAlerts.value.length > 15) {
      this.marketAlerts.value = this.marketAlerts.value.slice(0, 15)
    }
  }

  /**
   * Get sector-specific context for alerts
   */
  private getSectorContext(symbol: string): string {
    const sectorMap: { [key: string]: string } = {
      '600519.SH': '白酒板块整体表现',
      '000858.SZ': '白酒板块联动',
      '600036.SH': '银行板块资金关注',
      '000001.SZ': '银行股估值修复',
      '002594.SZ': '新能源汽车板块波动',
      '300750.SZ': '动力电池概念活跃',
      '002415.SZ': '科技股情绪变化',
      '300059.SZ': '券商板块受市场情绪影响',
      '600276.SH': '医药板块政策影响',
      '000002.SZ': '地产板块政策预期',
      '600887.SH': '消费板块稳健表现',
      '601318.SH': '金融板块资金流向'
    }

    return sectorMap[symbol] || '市场整体情绪影响'
  }

  /**
   * Get connection status text
   */
  getConnectionStatus(): string {
    if (this.isConnected.value) return '已连接'
    if (this.isConnecting.value) return '连接中...'
    if (this.connectionError.value) return `连接错误: ${this.connectionError.value}`
    return '未连接'
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.marketAlerts.value = []
  }

  /**
   * Remove specific alert
   */
  removeAlert(alertId: string): void {
    const index = this.marketAlerts.value.findIndex(alert => alert.id === alertId)
    if (index !== -1) {
      this.marketAlerts.value.splice(index, 1)
    }
  }
}

// Create and export singleton instance
export const mockRealtimeService = new MockRealtimeService()

// Auto-connect when service is imported
mockRealtimeService.connect()

export default mockRealtimeService
