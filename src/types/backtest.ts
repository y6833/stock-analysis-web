/**
 * 回测与策略相关类型定义
 */

// 交易方向
export type TradeDirection = 'buy' | 'sell'

// 交易类型
export type TradeType = 'market' | 'limit' | 'stop' | 'stop_limit'

// 策略类型
export type StrategyType = 
  | 'moving_average_cross'    // 均线交叉
  | 'rsi_overbought_oversold' // RSI超买超卖
  | 'macd_cross'              // MACD交叉
  | 'bollinger_bands'         // 布林带突破
  | 'volume_breakout'         // 成交量突破
  | 'price_breakout'          // 价格突破
  | 'custom'                  // 自定义策略

// 回测时间范围
export type BacktestTimeRange = 
  | '1m'  // 1个月
  | '3m'  // 3个月
  | '6m'  // 6个月
  | '1y'  // 1年
  | '2y'  // 2年
  | '3y'  // 3年
  | '5y'  // 5年
  | 'max' // 全部历史
  | 'custom' // 自定义时间范围

// 回测频率
export type BacktestFrequency = 
  | '1d'  // 日线
  | '1w'  // 周线
  | '1h'  // 小时线
  | '30m' // 30分钟线
  | '15m' // 15分钟线
  | '5m'  // 5分钟线
  | '1m'  // 1分钟线

// 回测参数
export interface BacktestParams {
  symbol: string                  // 股票代码
  strategyType: StrategyType      // 策略类型
  timeRange: BacktestTimeRange    // 时间范围
  frequency: BacktestFrequency    // 回测频率
  initialCapital: number          // 初始资金
  positionSize?: number           // 仓位大小（百分比或固定金额）
  isPercentage?: boolean          // 仓位是否为百分比
  commissionRate?: number         // 佣金率
  slippageRate?: number           // 滑点率
  customStartDate?: string        // 自定义开始日期
  customEndDate?: string          // 自定义结束日期
  strategyParams: any             // 策略特定参数
}

// 交易记录
export interface TradeRecord {
  id: string                      // 交易ID
  symbol: string                  // 股票代码
  direction: TradeDirection       // 交易方向
  type: TradeType                 // 交易类型
  price: number                   // 交易价格
  quantity: number                // 交易数量
  amount: number                  // 交易金额
  commission: number              // 佣金
  slippage: number                // 滑点
  timestamp: string               // 交易时间
  reason: string                  // 交易原因
}

// 回测结果
export interface BacktestResult {
  id: string                      // 回测ID
  params: BacktestParams          // 回测参数
  trades: TradeRecord[]           // 交易记录
  performance: {
    totalReturn: number           // 总回报率
    annualizedReturn: number      // 年化回报率
    maxDrawdown: number           // 最大回撤
    sharpeRatio: number           // 夏普比率
    winRate: number               // 胜率
    profitFactor: number          // 盈亏比
    totalTrades: number           // 总交易次数
    profitableTrades: number      // 盈利交易次数
    lossTrades: number            // 亏损交易次数
    averageProfit: number         // 平均盈利
    averageLoss: number           // 平均亏损
    averageHoldingPeriod: number  // 平均持仓周期
  }
  equity: {                       // 权益曲线
    dates: string[]               // 日期
    values: number[]              // 权益值
  }
  drawdowns: {                    // 回撤曲线
    dates: string[]               // 日期
    values: number[]              // 回撤值
  }
  benchmarkReturn: number         // 基准回报率
  createdAt: string               // 创建时间
}

// 策略模板
export interface StrategyTemplate {
  id: string                      // 策略ID
  name: string                    // 策略名称
  description: string             // 策略描述
  type: StrategyType              // 策略类型
  defaultParams: any              // 默认参数
  isSystem: boolean               // 是否为系统策略
  createdAt: string               // 创建时间
  updatedAt: string               // 更新时间
}

// 条件提醒类型
export type AlertConditionType = 
  | 'price_above'                 // 价格高于
  | 'price_below'                 // 价格低于
  | 'price_change_percent'        // 价格变化百分比
  | 'volume_above'                // 成交量高于
  | 'ma_cross'                    // 均线交叉
  | 'rsi_above'                   // RSI高于
  | 'rsi_below'                   // RSI低于
  | 'macd_cross'                  // MACD交叉
  | 'bollinger_band_break'        // 布林带突破
  | 'custom'                      // 自定义条件

// 条件提醒状态
export type AlertStatus = 
  | 'active'                      // 活跃
  | 'triggered'                   // 已触发
  | 'expired'                     // 已过期
  | 'disabled'                    // 已禁用

// 条件提醒
export interface AlertCondition {
  id: string                      // 提醒ID
  symbol: string                  // 股票代码
  type: AlertConditionType        // 提醒类型
  parameters: any                 // 提醒参数
  message: string                 // 提醒消息
  status: AlertStatus             // 提醒状态
  triggerCount: number            // 触发次数
  lastTriggered?: string          // 最后触发时间
  expiryDate?: string             // 过期时间
  createdAt: string               // 创建时间
  updatedAt: string               // 更新时间
}

// 模拟交易账户
export interface SimulatedAccount {
  id: string                      // 账户ID
  name: string                    // 账户名称
  initialCapital: number          // 初始资金
  currentCapital: number          // 当前资金
  positions: SimulatedPosition[]  // 持仓
  trades: TradeRecord[]           // 交易记录
  performance: {
    totalReturn: number           // 总回报率
    dailyReturn: number           // 日回报率
    weeklyReturn: number          // 周回报率
    monthlyReturn: number         // 月回报率
  }
  createdAt: string               // 创建时间
  updatedAt: string               // 更新时间
}

// 模拟持仓
export interface SimulatedPosition {
  symbol: string                  // 股票代码
  name: string                    // 股票名称
  quantity: number                // 持仓数量
  averageCost: number             // 平均成本
  currentPrice: number            // 当前价格
  marketValue: number             // 市值
  unrealizedPnL: number           // 未实现盈亏
  unrealizedPnLPercent: number    // 未实现盈亏百分比
  realizedPnL: number             // 已实现盈亏
  totalPnL: number                // 总盈亏
  totalPnLPercent: number         // 总盈亏百分比
  openDate: string                // 开仓日期
}
