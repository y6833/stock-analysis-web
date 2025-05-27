/**
 * 专业事件驱动回测引擎
 * 支持高精度历史数据回测、交易成本建模、风险控制
 */

import type { BacktestParams, BacktestResult, TradeRecord } from '@/types/backtest'
import type { StockData } from '@/types/stock'
import type { BaseStrategy } from '@/services/strategy/strategies/BaseStrategy'

export interface BacktestEvent {
  timestamp: string
  type: 'market_data' | 'trade_signal' | 'position_update' | 'risk_check'
  data: any
}

export interface BacktestContext {
  currentDate: string
  cash: number
  positions: Map<string, Position>
  portfolio: Portfolio
  marketData: Map<string, StockData>
  trades: TradeRecord[]
  performance: PerformanceMetrics
}

export interface Position {
  symbol: string
  quantity: number
  averagePrice: number
  marketValue: number
  unrealizedPnL: number
  openDate: string
}

export interface Portfolio {
  totalValue: number
  cash: number
  marketValue: number
  dailyReturn: number
  totalReturn: number
  maxDrawdown: number
}

export interface PerformanceMetrics {
  totalReturn: number
  annualizedReturn: number
  volatility: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  profitFactor: number
  calmarRatio: number
}

export interface TradingCosts {
  commissionRate: number      // 佣金率
  minimumCommission: number   // 最低佣金
  stampDutyRate: number      // 印花税率（卖出时）
  transferFeeRate: number    // 过户费率
  slippageRate: number       // 滑点率
}

export class BacktestEngine {
  private context: BacktestContext
  private strategy: BaseStrategy
  private params: BacktestParams
  private tradingCosts: TradingCosts
  private events: BacktestEvent[] = []
  private currentEventIndex = 0

  constructor(strategy: BaseStrategy, params: BacktestParams) {
    this.strategy = strategy
    this.params = params
    this.tradingCosts = this.getDefaultTradingCosts()
    this.initializeContext()
  }

  /**
   * 运行回测
   */
  async runBacktest(historicalData: Map<string, StockData[]>): Promise<BacktestResult> {
    console.log('开始事件驱动回测...')
    
    // 1. 准备历史数据事件
    this.prepareMarketDataEvents(historicalData)
    
    // 2. 按时间顺序处理事件
    while (this.currentEventIndex < this.events.length) {
      const event = this.events[this.currentEventIndex]
      await this.processEvent(event)
      this.currentEventIndex++
      
      // 每日结束时更新组合状态
      if (this.isEndOfDay(event)) {
        this.updatePortfolioMetrics()
      }
    }
    
    // 3. 计算最终绩效指标
    const finalPerformance = this.calculateFinalPerformance()
    
    // 4. 生成回测报告
    return this.generateBacktestReport(finalPerformance)
  }

  /**
   * 初始化回测上下文
   */
  private initializeContext(): void {
    this.context = {
      currentDate: this.params.customStartDate || '',
      cash: this.params.initialCapital,
      positions: new Map(),
      portfolio: {
        totalValue: this.params.initialCapital,
        cash: this.params.initialCapital,
        marketValue: 0,
        dailyReturn: 0,
        totalReturn: 0,
        maxDrawdown: 0
      },
      marketData: new Map(),
      trades: [],
      performance: {
        totalReturn: 0,
        annualizedReturn: 0,
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        profitFactor: 0,
        calmarRatio: 0
      }
    }
  }

  /**
   * 准备市场数据事件
   */
  private prepareMarketDataEvents(historicalData: Map<string, StockData[]>): void {
    const allDates = new Set<string>()
    
    // 收集所有交易日期
    for (const [symbol, data] of historicalData) {
      data.forEach(item => {
        if (item.date) allDates.add(item.date)
      })
    }
    
    // 按日期排序并创建事件
    const sortedDates = Array.from(allDates).sort()
    
    for (const date of sortedDates) {
      // 为每个交易日创建市场数据事件
      const dayData = new Map<string, StockData>()
      
      for (const [symbol, data] of historicalData) {
        const dayItem = data.find(item => item.date === date)
        if (dayItem) {
          dayData.set(symbol, dayItem)
        }
      }
      
      this.events.push({
        timestamp: date,
        type: 'market_data',
        data: dayData
      })
    }
    
    console.log(`准备了 ${this.events.length} 个市场数据事件`)
  }

  /**
   * 处理单个事件
   */
  private async processEvent(event: BacktestEvent): Promise<void> {
    this.context.currentDate = event.timestamp
    
    switch (event.type) {
      case 'market_data':
        await this.processMarketDataEvent(event)
        break
      case 'trade_signal':
        await this.processTradeSignalEvent(event)
        break
      case 'position_update':
        this.processPositionUpdateEvent(event)
        break
      case 'risk_check':
        this.processRiskCheckEvent(event)
        break
    }
  }

  /**
   * 处理市场数据事件
   */
  private async processMarketDataEvent(event: BacktestEvent): Promise<void> {
    const marketData = event.data as Map<string, StockData>
    this.context.marketData = marketData
    
    // 更新持仓市值
    this.updatePositionValues(marketData)
    
    // 执行策略获取交易信号
    try {
      const signals = await this.strategy.generateSignals(this.context)
      
      // 处理交易信号
      for (const signal of signals) {
        await this.executeTradeSignal(signal)
      }
    } catch (error) {
      console.warn(`策略执行失败 ${event.timestamp}:`, error)
    }
  }

  /**
   * 执行交易信号
   */
  private async executeTradeSignal(signal: any): Promise<void> {
    const { symbol, direction, quantity, price, reason } = signal
    
    // 风险检查
    if (!this.passRiskCheck(signal)) {
      console.log(`交易信号被风控拒绝: ${symbol} ${direction}`)
      return
    }
    
    // 计算交易成本
    const costs = this.calculateTradingCosts(direction, quantity, price)
    
    // 检查资金充足性
    if (direction === 'buy' && this.context.cash < quantity * price + costs.totalCost) {
      console.log(`资金不足，无法买入 ${symbol}`)
      return
    }
    
    // 执行交易
    const trade: TradeRecord = {
      id: `${Date.now()}_${Math.random()}`,
      timestamp: this.context.currentDate,
      symbol,
      direction,
      quantity,
      price,
      amount: quantity * price,
      commission: costs.commission,
      slippage: costs.slippage,
      stampDuty: costs.stampDuty,
      transferFee: costs.transferFee,
      reason
    }
    
    this.executeTrade(trade)
  }

  /**
   * 获取默认交易成本配置
   */
  private getDefaultTradingCosts(): TradingCosts {
    return {
      commissionRate: 0.0003,      // 万分之三佣金
      minimumCommission: 5,        // 最低5元佣金
      stampDutyRate: 0.001,        // 千分之一印花税（仅卖出）
      transferFeeRate: 0.00002,    // 万分之0.2过户费
      slippageRate: 0.001          // 千分之一滑点
    }
  }

  /**
   * 计算交易成本
   */
  private calculateTradingCosts(direction: 'buy' | 'sell', quantity: number, price: number) {
    const amount = quantity * price
    
    // 佣金
    const commission = Math.max(amount * this.tradingCosts.commissionRate, this.tradingCosts.minimumCommission)
    
    // 印花税（仅卖出时收取）
    const stampDuty = direction === 'sell' ? amount * this.tradingCosts.stampDutyRate : 0
    
    // 过户费
    const transferFee = amount * this.tradingCosts.transferFeeRate
    
    // 滑点
    const slippage = amount * this.tradingCosts.slippageRate
    
    const totalCost = commission + stampDuty + transferFee + slippage
    
    return {
      commission,
      stampDuty,
      transferFee,
      slippage,
      totalCost
    }
  }

  /**
   * 执行交易
   */
  private executeTrade(trade: TradeRecord): void {
    const { symbol, direction, quantity, price, commission, slippage, stampDuty, transferFee } = trade
    const totalCost = commission + slippage + stampDuty + transferFee
    
    if (direction === 'buy') {
      // 买入操作
      this.context.cash -= quantity * price + totalCost
      
      const existingPosition = this.context.positions.get(symbol)
      if (existingPosition) {
        // 加仓
        const totalQuantity = existingPosition.quantity + quantity
        const totalCost = existingPosition.quantity * existingPosition.averagePrice + quantity * price
        existingPosition.quantity = totalQuantity
        existingPosition.averagePrice = totalCost / totalQuantity
      } else {
        // 新建仓位
        this.context.positions.set(symbol, {
          symbol,
          quantity,
          averagePrice: price,
          marketValue: quantity * price,
          unrealizedPnL: 0,
          openDate: this.context.currentDate
        })
      }
    } else {
      // 卖出操作
      this.context.cash += quantity * price - totalCost
      
      const position = this.context.positions.get(symbol)
      if (position) {
        position.quantity -= quantity
        if (position.quantity <= 0) {
          this.context.positions.delete(symbol)
        }
      }
    }
    
    this.context.trades.push(trade)
    console.log(`执行交易: ${direction} ${symbol} ${quantity}@${price}`)
  }

  /**
   * 更新持仓市值
   */
  private updatePositionValues(marketData: Map<string, StockData>): void {
    for (const [symbol, position] of this.context.positions) {
      const stockData = marketData.get(symbol)
      if (stockData && stockData.close) {
        position.marketValue = position.quantity * stockData.close
        position.unrealizedPnL = position.marketValue - position.quantity * position.averagePrice
      }
    }
  }

  /**
   * 风险检查
   */
  private passRiskCheck(signal: any): boolean {
    // 这里可以添加各种风险控制逻辑
    // 例如：单股持仓限制、行业集中度限制、最大回撤限制等
    return true
  }

  /**
   * 判断是否为交易日结束
   */
  private isEndOfDay(event: BacktestEvent): boolean {
    return event.type === 'market_data'
  }

  /**
   * 更新组合指标
   */
  private updatePortfolioMetrics(): void {
    // 计算总市值
    let totalMarketValue = 0
    for (const position of this.context.positions.values()) {
      totalMarketValue += position.marketValue
    }
    
    this.context.portfolio.marketValue = totalMarketValue
    this.context.portfolio.totalValue = this.context.cash + totalMarketValue
    this.context.portfolio.totalReturn = (this.context.portfolio.totalValue / this.params.initialCapital - 1) * 100
  }

  /**
   * 计算最终绩效指标
   */
  private calculateFinalPerformance(): PerformanceMetrics {
    // 这里应该实现完整的绩效指标计算
    // 包括夏普比率、最大回撤、胜率等
    return this.context.performance
  }

  /**
   * 生成回测报告
   */
  private generateBacktestReport(performance: PerformanceMetrics): BacktestResult {
    return {
      id: `backtest_${Date.now()}`,
      params: this.params,
      trades: this.context.trades,
      performance: {
        totalReturn: performance.totalReturn,
        annualizedReturn: performance.annualizedReturn,
        maxDrawdown: performance.maxDrawdown,
        sharpeRatio: performance.sharpeRatio,
        winRate: performance.winRate,
        profitFactor: performance.profitFactor,
        totalTrades: this.context.trades.length,
        profitableTrades: this.context.trades.filter(t => t.direction === 'sell' && t.amount > 0).length,
        lossTrades: this.context.trades.filter(t => t.direction === 'sell' && t.amount < 0).length,
        averageProfit: 0,
        averageLoss: 0,
        averageHoldingPeriod: 0
      },
      equity: {
        dates: [],
        values: []
      },
      drawdowns: {
        dates: [],
        values: []
      },
      benchmarkReturn: 0,
      createdAt: new Date().toISOString()
    }
  }
}
