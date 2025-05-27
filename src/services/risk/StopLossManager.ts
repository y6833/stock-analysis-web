/**
 * 止损止盈管理器
 * 提供智能止损策略、分批止盈机制和时间止损功能
 */

export interface StopLossConfig {
  type: 'fixed' | 'trailing' | 'atr' | 'volatility' | 'time'
  percentage: number          // 止损百分比
  trailingDistance: number    // 移动止损距离
  atrMultiplier: number       // ATR倍数
  volatilityMultiplier: number // 波动率倍数
  timeLimit: number           // 时间限制(天)
  isEnabled: boolean
}

export interface TakeProfitConfig {
  type: 'fixed' | 'ladder' | 'trailing' | 'dynamic'
  levels: TakeProfitLevel[]   // 止盈层级
  trailingActivation: number  // 移动止盈激活点
  trailingDistance: number    // 移动止盈距离
  isEnabled: boolean
}

export interface TakeProfitLevel {
  percentage: number          // 盈利百分比
  sellRatio: number          // 卖出比例
  isExecuted: boolean        // 是否已执行
}

export interface Position {
  symbol: string
  quantity: number
  averagePrice: number
  currentPrice: number
  entryTime: string
  unrealizedPnL: number
  unrealizedPnLPercent: number
  highestPrice: number       // 持仓期间最高价
  lowestPrice: number        // 持仓期间最低价
  atr: number               // 平均真实波幅
  volatility: number        // 波动率
}

export interface StopLossOrder {
  id: string
  symbol: string
  type: 'stop_loss' | 'take_profit'
  triggerPrice: number
  quantity: number
  orderType: 'market' | 'limit'
  limitPrice?: number
  status: 'pending' | 'triggered' | 'executed' | 'cancelled'
  reason: string
  createdAt: string
  triggeredAt?: string
  executedAt?: string
}

export interface StopLossSignal {
  symbol: string
  action: 'stop_loss' | 'take_profit' | 'update_stop' | 'cancel_stop'
  triggerPrice: number
  quantity: number
  reason: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  expectedLoss?: number
  expectedProfit?: number
}

export class StopLossManager {
  private stopLossOrders: Map<string, StopLossOrder[]> = new Map()
  private priceHistory: Map<string, number[]> = new Map()

  /**
   * 计算止损止盈信号
   */
  calculateStopLossSignals(
    position: Position,
    stopLossConfig: StopLossConfig,
    takeProfitConfig: TakeProfitConfig
  ): StopLossSignal[] {
    const signals: StopLossSignal[] = []

    // 1. 检查止损信号
    if (stopLossConfig.isEnabled) {
      const stopLossSignal = this.checkStopLoss(position, stopLossConfig)
      if (stopLossSignal) {
        signals.push(stopLossSignal)
      }
    }

    // 2. 检查止盈信号
    if (takeProfitConfig.isEnabled) {
      const takeProfitSignals = this.checkTakeProfit(position, takeProfitConfig)
      signals.push(...takeProfitSignals)
    }

    // 3. 检查止损止盈订单更新
    const updateSignals = this.checkOrderUpdates(position, stopLossConfig, takeProfitConfig)
    signals.push(...updateSignals)

    return signals
  }

  /**
   * 检查止损信号
   */
  private checkStopLoss(position: Position, config: StopLossConfig): StopLossSignal | null {
    let triggerPrice = 0
    let reason = ''

    switch (config.type) {
      case 'fixed':
        triggerPrice = position.averagePrice * (1 - config.percentage)
        reason = `固定止损 ${(config.percentage * 100).toFixed(1)}%`
        break

      case 'trailing':
        triggerPrice = position.highestPrice * (1 - config.trailingDistance)
        reason = `移动止损 ${(config.trailingDistance * 100).toFixed(1)}%`
        break

      case 'atr':
        triggerPrice = position.currentPrice - (position.atr * config.atrMultiplier)
        reason = `ATR止损 ${config.atrMultiplier}倍`
        break

      case 'volatility':
        triggerPrice = position.currentPrice - (position.currentPrice * position.volatility * config.volatilityMultiplier)
        reason = `波动率止损 ${config.volatilityMultiplier}倍`
        break

      case 'time':
        const entryDate = new Date(position.entryTime)
        const daysPassed = (Date.now() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
        if (daysPassed >= config.timeLimit && position.unrealizedPnLPercent < 0) {
          return {
            symbol: position.symbol,
            action: 'stop_loss',
            triggerPrice: position.currentPrice,
            quantity: position.quantity,
            reason: `时间止损 ${config.timeLimit}天`,
            urgency: 'high',
            confidence: 0.9,
            expectedLoss: position.unrealizedPnL
          }
        }
        return null
    }

    // 检查是否触发止损
    if (position.currentPrice <= triggerPrice) {
      return {
        symbol: position.symbol,
        action: 'stop_loss',
        triggerPrice,
        quantity: position.quantity,
        reason,
        urgency: this.getStopLossUrgency(position.unrealizedPnLPercent),
        confidence: this.calculateStopLossConfidence(config.type),
        expectedLoss: position.unrealizedPnL
      }
    }

    return null
  }

  /**
   * 检查止盈信号
   */
  private checkTakeProfit(position: Position, config: TakeProfitConfig): StopLossSignal[] {
    const signals: StopLossSignal[] = []

    switch (config.type) {
      case 'fixed':
        // 固定止盈：检查第一个未执行的止盈层级
        const nextLevel = config.levels.find(level => !level.isExecuted)
        if (nextLevel && position.unrealizedPnLPercent >= nextLevel.percentage) {
          signals.push({
            symbol: position.symbol,
            action: 'take_profit',
            triggerPrice: position.averagePrice * (1 + nextLevel.percentage),
            quantity: Math.floor(position.quantity * nextLevel.sellRatio),
            reason: `固定止盈 ${(nextLevel.percentage * 100).toFixed(1)}%`,
            urgency: 'medium',
            confidence: 0.8,
            expectedProfit: position.unrealizedPnL * nextLevel.sellRatio
          })
        }
        break

      case 'ladder':
        // 阶梯止盈：检查所有未执行的层级
        config.levels.forEach(level => {
          if (!level.isExecuted && position.unrealizedPnLPercent >= level.percentage) {
            signals.push({
              symbol: position.symbol,
              action: 'take_profit',
              triggerPrice: position.averagePrice * (1 + level.percentage),
              quantity: Math.floor(position.quantity * level.sellRatio),
              reason: `阶梯止盈 ${(level.percentage * 100).toFixed(1)}%`,
              urgency: 'medium',
              confidence: 0.8,
              expectedProfit: position.unrealizedPnL * level.sellRatio
            })
          }
        })
        break

      case 'trailing':
        // 移动止盈
        if (position.unrealizedPnLPercent >= config.trailingActivation) {
          const trailingPrice = position.highestPrice * (1 - config.trailingDistance)
          if (position.currentPrice <= trailingPrice) {
            signals.push({
              symbol: position.symbol,
              action: 'take_profit',
              triggerPrice: trailingPrice,
              quantity: position.quantity,
              reason: `移动止盈 ${(config.trailingDistance * 100).toFixed(1)}%`,
              urgency: 'high',
              confidence: 0.85,
              expectedProfit: position.unrealizedPnL
            })
          }
        }
        break

      case 'dynamic':
        // 动态止盈：基于波动率调整
        const dynamicThreshold = this.calculateDynamicThreshold(position)
        if (position.unrealizedPnLPercent >= dynamicThreshold) {
          signals.push({
            symbol: position.symbol,
            action: 'take_profit',
            triggerPrice: position.currentPrice,
            quantity: Math.floor(position.quantity * 0.5), // 卖出50%
            reason: `动态止盈 ${(dynamicThreshold * 100).toFixed(1)}%`,
            urgency: 'medium',
            confidence: 0.75,
            expectedProfit: position.unrealizedPnL * 0.5
          })
        }
        break
    }

    return signals
  }

  /**
   * 检查订单更新信号
   */
  private checkOrderUpdates(
    position: Position,
    stopLossConfig: StopLossConfig,
    takeProfitConfig: TakeProfitConfig
  ): StopLossSignal[] {
    const signals: StopLossSignal[] = []
    const existingOrders = this.stopLossOrders.get(position.symbol) || []

    // 检查移动止损更新
    if (stopLossConfig.type === 'trailing') {
      const newStopPrice = position.highestPrice * (1 - stopLossConfig.trailingDistance)
      const existingStopOrder = existingOrders.find(order => 
        order.type === 'stop_loss' && order.status === 'pending'
      )

      if (existingStopOrder && newStopPrice > existingStopOrder.triggerPrice) {
        signals.push({
          symbol: position.symbol,
          action: 'update_stop',
          triggerPrice: newStopPrice,
          quantity: position.quantity,
          reason: '更新移动止损价格',
          urgency: 'low',
          confidence: 0.9
        })
      }
    }

    // 检查移动止盈更新
    if (takeProfitConfig.type === 'trailing' && 
        position.unrealizedPnLPercent >= takeProfitConfig.trailingActivation) {
      const newTakeProfitPrice = position.highestPrice * (1 - takeProfitConfig.trailingDistance)
      const existingTakeProfitOrder = existingOrders.find(order => 
        order.type === 'take_profit' && order.status === 'pending'
      )

      if (existingTakeProfitOrder && newTakeProfitPrice > existingTakeProfitOrder.triggerPrice) {
        signals.push({
          symbol: position.symbol,
          action: 'update_stop',
          triggerPrice: newTakeProfitPrice,
          quantity: position.quantity,
          reason: '更新移动止盈价格',
          urgency: 'low',
          confidence: 0.85
        })
      }
    }

    return signals
  }

  /**
   * 创建止损订单
   */
  createStopLossOrder(
    symbol: string,
    type: 'stop_loss' | 'take_profit',
    triggerPrice: number,
    quantity: number,
    reason: string
  ): StopLossOrder {
    const order: StopLossOrder = {
      id: `${type}_${symbol}_${Date.now()}`,
      symbol,
      type,
      triggerPrice,
      quantity,
      orderType: 'market',
      status: 'pending',
      reason,
      createdAt: new Date().toISOString()
    }

    // 添加到订单列表
    if (!this.stopLossOrders.has(symbol)) {
      this.stopLossOrders.set(symbol, [])
    }
    this.stopLossOrders.get(symbol)!.push(order)

    return order
  }

  /**
   * 更新止损订单
   */
  updateStopLossOrder(orderId: string, newTriggerPrice: number): boolean {
    for (const orders of this.stopLossOrders.values()) {
      const order = orders.find(o => o.id === orderId)
      if (order && order.status === 'pending') {
        order.triggerPrice = newTriggerPrice
        return true
      }
    }
    return false
  }

  /**
   * 取消止损订单
   */
  cancelStopLossOrder(orderId: string): boolean {
    for (const orders of this.stopLossOrders.values()) {
      const order = orders.find(o => o.id === orderId)
      if (order && order.status === 'pending') {
        order.status = 'cancelled'
        return true
      }
    }
    return false
  }

  /**
   * 获取止损订单列表
   */
  getStopLossOrders(symbol?: string): StopLossOrder[] {
    if (symbol) {
      return this.stopLossOrders.get(symbol) || []
    }
    
    const allOrders: StopLossOrder[] = []
    for (const orders of this.stopLossOrders.values()) {
      allOrders.push(...orders)
    }
    return allOrders
  }

  /**
   * 计算动态止盈阈值
   */
  private calculateDynamicThreshold(position: Position): number {
    // 基于波动率的动态阈值
    const baseThreshold = 0.1 // 10%基础阈值
    const volatilityAdjustment = position.volatility * 2 // 波动率调整
    return baseThreshold + volatilityAdjustment
  }

  /**
   * 获取止损紧急程度
   */
  private getStopLossUrgency(lossPercent: number): 'low' | 'medium' | 'high' | 'critical' {
    const absLoss = Math.abs(lossPercent)
    if (absLoss >= 0.15) return 'critical'  // 15%以上
    if (absLoss >= 0.10) return 'high'      // 10-15%
    if (absLoss >= 0.05) return 'medium'    // 5-10%
    return 'low'                            // 5%以下
  }

  /**
   * 计算止损置信度
   */
  private calculateStopLossConfidence(type: string): number {
    const confidenceMap = {
      'fixed': 0.9,
      'trailing': 0.85,
      'atr': 0.8,
      'volatility': 0.75,
      'time': 0.7
    }
    return confidenceMap[type as keyof typeof confidenceMap] || 0.8
  }

  /**
   * 计算ATR (平均真实波幅)
   */
  calculateATR(symbol: string, period: number = 14): number {
    const prices = this.priceHistory.get(symbol)
    if (!prices || prices.length < period + 1) return 0

    const trueRanges = []
    for (let i = 1; i < prices.length; i++) {
      const high = prices[i]
      const low = prices[i] * 0.98 // 简化：假设低点为当前价格的98%
      const prevClose = prices[i - 1]
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      )
      trueRanges.push(tr)
    }

    // 计算ATR
    const recentTRs = trueRanges.slice(-period)
    return recentTRs.reduce((sum, tr) => sum + tr, 0) / recentTRs.length
  }

  /**
   * 更新价格历史
   */
  updatePriceHistory(symbol: string, price: number): void {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, [])
    }
    
    const history = this.priceHistory.get(symbol)!
    history.push(price)
    
    // 保持最近1000个价格点
    if (history.length > 1000) {
      history.shift()
    }
  }

  /**
   * 获取止损止盈统计
   */
  getStatistics(): {
    totalOrders: number
    pendingOrders: number
    executedOrders: number
    stopLossOrders: number
    takeProfitOrders: number
    successRate: number
  } {
    const allOrders = this.getStopLossOrders()
    
    const totalOrders = allOrders.length
    const pendingOrders = allOrders.filter(o => o.status === 'pending').length
    const executedOrders = allOrders.filter(o => o.status === 'executed').length
    const stopLossOrders = allOrders.filter(o => o.type === 'stop_loss').length
    const takeProfitOrders = allOrders.filter(o => o.type === 'take_profit').length
    
    const successRate = totalOrders > 0 ? executedOrders / totalOrders : 0

    return {
      totalOrders,
      pendingOrders,
      executedOrders,
      stopLossOrders,
      takeProfitOrders,
      successRate
    }
  }
}
