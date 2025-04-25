/**
 * 技术指标服务
 * 提供各种技术分析指标的计算功能
 * 使用 Web Worker 在后台线程计算，避免阻塞主线程
 */

import type { StockData } from '@/types/stock'

// 创建 Web Worker 实例
let worker: Worker | null = null
let isWorkerReady = false
let pendingTasks: { resolve: Function; reject: Function; data: any }[] = []

// 初始化 Worker
function initWorker() {
  if (worker) return

  try {
    worker = new Worker(new URL('../workers/technicalIndicatorWorker.js', import.meta.url), {
      type: 'module',
    })

    worker.addEventListener('message', (e) => {
      const { type, data, message } = e.data

      switch (type) {
        case 'ready':
          isWorkerReady = true
          processPendingTasks()
          break

        case 'result':
          const task = pendingTasks.shift()
          if (task) {
            task.resolve(data)
          }
          break

        case 'error':
          const errorTask = pendingTasks.shift()
          if (errorTask) {
            errorTask.reject(new Error(message))
          }
          break
      }
    })

    worker.addEventListener('error', (error) => {
      console.error('Worker error:', error)
      const task = pendingTasks.shift()
      if (task) {
        task.reject(error)
      }
    })
  } catch (error) {
    console.error('Failed to initialize worker:', error)
    // 如果 Worker 初始化失败，标记为就绪，使用主线程计算
    isWorkerReady = true
  }
}

// 处理排队中的任务
function processPendingTasks() {
  if (!isWorkerReady || !worker) return

  while (pendingTasks.length > 0) {
    const task = pendingTasks[0] // 不移除，等待结果返回后再移除
    try {
      // 确保数据可以被序列化
      const clonedData = JSON.parse(JSON.stringify(task.data))
      worker.postMessage(clonedData)
    } catch (error) {
      console.error('无法序列化任务数据:', error)
      // 移除当前任务并拒绝 Promise
      const failedTask = pendingTasks.shift()
      if (failedTask) {
        failedTask.reject(new Error('无法序列化任务数据: ' + error.message))
      }
      // 继续处理下一个任务
      continue
    }
    break // 只发送一个任务，等待完成后再发送下一个
  }
}

// 使用 Worker 计算指标
async function calculateWithWorker(stockData: StockData, indicators: string[]): Promise<any> {
  initWorker()

  return new Promise((resolve, reject) => {
    const task = {
      resolve,
      reject,
      data: {
        type: 'calculate',
        data: {
          stockData,
          indicators,
        },
      },
    }

    pendingTasks.push(task)

    if (isWorkerReady && worker) {
      processPendingTasks()
    }
  })
}

// 简单移动平均线 (SMA)
export function calculateSMA(prices: number[], period: number): number[] {
  const result: number[] = []

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(NaN)
      continue
    }

    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += prices[i - j]
    }

    result.push(sum / period)
  }

  return result
}

// 指数移动平均线 (EMA)
export function calculateEMA(prices: number[], period: number): number[] {
  const result: number[] = []
  const multiplier = 2 / (period + 1)

  // 第一个EMA值使用SMA
  let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(NaN)
      continue
    }

    if (i === period - 1) {
      result.push(ema)
      continue
    }

    // EMA = 当前价格 * 乘数 + 前一天EMA * (1 - 乘数)
    ema = prices[i] * multiplier + ema * (1 - multiplier)
    result.push(ema)
  }

  return result
}

// 相对强弱指标 (RSI)
export function calculateRSI(prices: number[], period: number = 14): number[] {
  const result: number[] = []
  const gains: number[] = []
  const losses: number[] = []

  // 计算价格变化
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }

  // 填充前面的空值
  for (let i = 0; i < period; i++) {
    result.push(NaN)
  }

  // 计算第一个 RSI 值
  let avgGain = gains.slice(0, period).reduce((sum, val) => sum + val, 0) / period
  let avgLoss = losses.slice(0, period).reduce((sum, val) => sum + val, 0) / period

  // 计算第一个 RSI
  if (avgLoss === 0) {
    result.push(100)
  } else {
    const rs = avgGain / avgLoss
    result.push(100 - 100 / (1 + rs))
  }

  // 计算剩余的 RSI 值
  for (let i = period; i < gains.length; i++) {
    // 使用平滑 RSI 公式
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period

    if (avgLoss === 0) {
      result.push(100)
    } else {
      const rs = avgGain / avgLoss
      result.push(100 - 100 / (1 + rs))
    }
  }

  return result
}

// MACD (移动平均线收敛/发散)
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macdLine: number[]
  signalLine: number[]
  histogram: number[]
} {
  // 计算快速和慢速EMA
  const fastEMA = calculateEMA(prices, fastPeriod)
  const slowEMA = calculateEMA(prices, slowPeriod)

  // 计算MACD线 (快速EMA - 慢速EMA)
  const macdLine: number[] = []
  for (let i = 0; i < prices.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
      macdLine.push(NaN)
    } else {
      macdLine.push(fastEMA[i] - slowEMA[i])
    }
  }

  // 计算信号线 (MACD的EMA)
  const validMacdValues = macdLine.filter((value) => !isNaN(value))
  const signalLine = calculateEMA(macdLine, signalPeriod)

  // 计算柱状图 (MACD线 - 信号线)
  const histogram: number[] = []
  for (let i = 0; i < prices.length; i++) {
    if (isNaN(macdLine[i]) || isNaN(signalLine[i])) {
      histogram.push(NaN)
    } else {
      histogram.push(macdLine[i] - signalLine[i])
    }
  }

  return { macdLine, signalLine, histogram }
}

// KDJ 指标
export function calculateKDJ(
  highPrices: number[],
  lowPrices: number[],
  closePrices: number[],
  period: number = 9,
  kPeriod: number = 3,
  dPeriod: number = 3
): {
  k: number[]
  d: number[]
  j: number[]
} {
  const rsv: number[] = []
  const k: number[] = []
  const d: number[] = []
  const j: number[] = []

  // 计算RSV
  for (let i = 0; i < closePrices.length; i++) {
    if (i < period - 1) {
      rsv.push(NaN)
      k.push(NaN)
      d.push(NaN)
      j.push(NaN)
      continue
    }

    // 计算周期内的最高价和最低价
    const highInPeriod = Math.max(...highPrices.slice(i - period + 1, i + 1))
    const lowInPeriod = Math.min(...lowPrices.slice(i - period + 1, i + 1))

    // 计算RSV值 (当前收盘价 - 周期内最低价) / (周期内最高价 - 周期内最低价) * 100
    const currentRSV = ((closePrices[i] - lowInPeriod) / (highInPeriod - lowInPeriod)) * 100
    rsv.push(currentRSV)

    // 计算K值 (前一日K值 * (kPeriod-1) + 当日RSV) / kPeriod
    if (i === period - 1) {
      k.push(currentRSV) // 第一个K值等于RSV
    } else {
      k.push((k[k.length - 1] * (kPeriod - 1) + currentRSV) / kPeriod)
    }

    // 计算D值 (前一日D值 * (dPeriod-1) + 当日K值) / dPeriod
    if (i === period - 1) {
      d.push(k[k.length - 1]) // 第一个D值等于第一个K值
    } else {
      d.push((d[d.length - 1] * (dPeriod - 1) + k[k.length - 1]) / dPeriod)
    }

    // 计算J值 (3 * K值 - 2 * D值)
    j.push(3 * k[k.length - 1] - 2 * d[d.length - 1])
  }

  return { k, d, j }
}

// 布林带 (Bollinger Bands)
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  multiplier: number = 2
): {
  upper: number[]
  middle: number[]
  lower: number[]
} {
  const middle = calculateSMA(prices, period)
  const upper: number[] = []
  const lower: number[] = []

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(NaN)
      lower.push(NaN)
      continue
    }

    // 计算标准差
    const slice = prices.slice(i - period + 1, i + 1)
    const mean = middle[i]
    const squaredDiffs = slice.map((price) => Math.pow(price - mean, 2))
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period
    const stdDev = Math.sqrt(variance)

    // 计算上轨和下轨
    upper.push(mean + multiplier * stdDev)
    lower.push(mean - multiplier * stdDev)
  }

  return { upper, middle, lower }
}

// 平均真实范围 (ATR)
export function calculateATR(
  highPrices: number[],
  lowPrices: number[],
  closePrices: number[],
  period: number = 14
): number[] {
  const trueRanges: number[] = []
  const atr: number[] = []

  // 计算真实范围 (TR)
  for (let i = 0; i < highPrices.length; i++) {
    if (i === 0) {
      // 第一个TR就是当日的高低价差
      trueRanges.push(highPrices[i] - lowPrices[i])
    } else {
      // TR = max(当日高点 - 当日低点, |当日高点 - 昨日收盘|, |当日低点 - 昨日收盘|)
      const tr1 = highPrices[i] - lowPrices[i]
      const tr2 = Math.abs(highPrices[i] - closePrices[i - 1])
      const tr3 = Math.abs(lowPrices[i] - closePrices[i - 1])
      trueRanges.push(Math.max(tr1, tr2, tr3))
    }
  }

  // 计算ATR
  for (let i = 0; i < trueRanges.length; i++) {
    if (i < period - 1) {
      atr.push(NaN)
      continue
    }

    if (i === period - 1) {
      // 第一个ATR是前N个TR的简单平均
      atr.push(trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period)
    } else {
      // 后续ATR = [(前一日ATR * (period-1)) + 当日TR] / period
      atr.push((atr[atr.length - 1] * (period - 1) + trueRanges[i]) / period)
    }
  }

  return atr
}

// 成交量加权平均价格 (VWAP)
export function calculateVWAP(prices: number[], volumes: number[]): number[] {
  const vwap: number[] = []
  let cumulativeVolume = 0
  let cumulativePriceVolume = 0

  for (let i = 0; i < prices.length; i++) {
    const priceVolume = prices[i] * volumes[i]
    cumulativePriceVolume += priceVolume
    cumulativeVolume += volumes[i]

    if (cumulativeVolume === 0) {
      vwap.push(NaN)
    } else {
      vwap.push(cumulativePriceVolume / cumulativeVolume)
    }
  }

  return vwap
}

// 形态识别 - 头肩顶/底
export function detectHeadAndShoulders(
  prices: number[],
  windowSize: number = 60
): {
  pattern: 'head-and-shoulders' | 'inverse-head-and-shoulders' | 'none'
  positions: number[] | null
} {
  // 这里实现一个简化版的头肩顶/底识别算法
  // 实际应用中，这个算法会更复杂，需要考虑更多因素

  // 如果数据点不足，无法识别
  if (prices.length < windowSize) {
    return { pattern: 'none', positions: null }
  }

  // 获取窗口内的数据
  const windowPrices = prices.slice(prices.length - windowSize)

  // 寻找局部极值点
  const peaks: number[] = []
  const troughs: number[] = []

  for (let i = 1; i < windowPrices.length - 1; i++) {
    // 局部高点
    if (windowPrices[i] > windowPrices[i - 1] && windowPrices[i] > windowPrices[i + 1]) {
      peaks.push(i)
    }
    // 局部低点
    if (windowPrices[i] < windowPrices[i - 1] && windowPrices[i] < windowPrices[i + 1]) {
      troughs.push(i)
    }
  }

  // 检查是否有足够的峰和谷
  if (peaks.length < 3 || troughs.length < 2) {
    return { pattern: 'none', positions: null }
  }

  // 检查头肩顶形态
  // 头肩顶: 三个峰，中间的峰最高，两边的峰高度相近
  for (let i = 0; i < peaks.length - 2; i++) {
    const leftShoulder = windowPrices[peaks[i]]
    const head = windowPrices[peaks[i + 1]]
    const rightShoulder = windowPrices[peaks[i + 2]]

    // 检查头是否高于两肩
    if (head > leftShoulder && head > rightShoulder) {
      // 检查两肩是否高度相近 (允许20%的差异)
      const shoulderDiff = Math.abs(leftShoulder - rightShoulder) / leftShoulder
      if (shoulderDiff < 0.2) {
        return {
          pattern: 'head-and-shoulders',
          positions: [peaks[i], peaks[i + 1], peaks[i + 2]].map(
            (p) => p + prices.length - windowSize
          ),
        }
      }
    }
  }

  // 检查头肩底形态
  // 头肩底: 三个谷，中间的谷最低，两边的谷深度相近
  for (let i = 0; i < troughs.length - 2; i++) {
    const leftShoulder = windowPrices[troughs[i]]
    const head = windowPrices[troughs[i + 1]]
    const rightShoulder = windowPrices[troughs[i + 2]]

    // 检查头是否低于两肩
    if (head < leftShoulder && head < rightShoulder) {
      // 检查两肩是否深度相近 (允许20%的差异)
      const shoulderDiff = Math.abs(leftShoulder - rightShoulder) / leftShoulder
      if (shoulderDiff < 0.2) {
        return {
          pattern: 'inverse-head-and-shoulders',
          positions: [troughs[i], troughs[i + 1], troughs[i + 2]].map(
            (p) => p + prices.length - windowSize
          ),
        }
      }
    }
  }

  return { pattern: 'none', positions: null }
}

// 形态识别 - 双顶/双底
export function detectDoubleTopBottom(
  prices: number[],
  windowSize: number = 60
): {
  pattern: 'double-top' | 'double-bottom' | 'none'
  positions: number[] | null
} {
  // 如果数据点不足，无法识别
  if (prices.length < windowSize) {
    return { pattern: 'none', positions: null }
  }

  // 获取窗口内的数据
  const windowPrices = prices.slice(prices.length - windowSize)

  // 寻找局部极值点
  const peaks: number[] = []
  const troughs: number[] = []

  for (let i = 1; i < windowPrices.length - 1; i++) {
    // 局部高点
    if (windowPrices[i] > windowPrices[i - 1] && windowPrices[i] > windowPrices[i + 1]) {
      peaks.push(i)
    }
    // 局部低点
    if (windowPrices[i] < windowPrices[i - 1] && windowPrices[i] < windowPrices[i + 1]) {
      troughs.push(i)
    }
  }

  // 检查是否有足够的峰和谷
  if (peaks.length < 2 || troughs.length < 1) {
    return { pattern: 'none', positions: null }
  }

  // 检查双顶形态
  for (let i = 0; i < peaks.length - 1; i++) {
    const firstTop = windowPrices[peaks[i]]
    const secondTop = windowPrices[peaks[i + 1]]

    // 检查两个顶是否高度相近 (允许5%的差异)
    const topDiff = Math.abs(firstTop - secondTop) / firstTop
    if (topDiff < 0.05 && peaks[i + 1] - peaks[i] > 5) {
      // 确保两个顶之间有足够的距离
      return {
        pattern: 'double-top',
        positions: [peaks[i], peaks[i + 1]].map((p) => p + prices.length - windowSize),
      }
    }
  }

  // 检查双底形态
  for (let i = 0; i < troughs.length - 1; i++) {
    const firstBottom = windowPrices[troughs[i]]
    const secondBottom = windowPrices[troughs[i + 1]]

    // 检查两个底是否深度相近 (允许5%的差异)
    const bottomDiff = Math.abs(firstBottom - secondBottom) / firstBottom
    if (bottomDiff < 0.05 && troughs[i + 1] - troughs[i] > 5) {
      // 确保两个底之间有足够的距离
      return {
        pattern: 'double-bottom',
        positions: [troughs[i], troughs[i + 1]].map((p) => p + prices.length - windowSize),
      }
    }
  }

  return { pattern: 'none', positions: null }
}

/**
 * 批量计算多个指标
 * 优先使用 Web Worker，如果 Worker 不可用则回退到主线程计算
 */
export async function calculateIndicators(
  stockData: StockData,
  indicators: string[]
): Promise<any> {
  try {
    // 尝试使用 Worker 计算
    return await calculateWithWorker(stockData, indicators)
  } catch (error) {
    console.warn('Worker calculation failed, falling back to main thread:', error)

    // 回退到主线程计算
    const result: any = {}

    if (indicators.includes('sma')) {
      result.sma = {
        sma5: calculateSMA(stockData.prices, 5),
        sma10: calculateSMA(stockData.prices, 10),
        sma20: calculateSMA(stockData.prices, 20),
        sma60: calculateSMA(stockData.prices, 60),
      }
    }

    if (indicators.includes('ema')) {
      result.ema = {
        ema12: calculateEMA(stockData.prices, 12),
        ema26: calculateEMA(stockData.prices, 26),
      }
    }

    if (indicators.includes('macd')) {
      result.macd = calculateMACD(stockData.prices)
    }

    if (indicators.includes('rsi')) {
      result.rsi = {
        rsi14: calculateRSI(stockData.prices, 14),
      }
    }

    if (indicators.includes('kdj')) {
      const highs = stockData.highs || stockData.prices
      const lows = stockData.lows || stockData.prices
      const closes = stockData.closes || stockData.prices

      result.kdj = calculateKDJ(highs, lows, closes)
    }

    if (indicators.includes('bollinger')) {
      result.bollinger = calculateBollingerBands(stockData.prices)
    }

    if (indicators.includes('volume')) {
      result.volume = {
        volume: stockData.volumes,
        ma5: calculateSMA(stockData.volumes, 5),
        ma10: calculateSMA(stockData.volumes, 10),
      }
    }

    if (indicators.includes('pattern')) {
      const headAndShoulders = detectHeadAndShoulders(stockData.prices)
      const doubleTopBottom = detectDoubleTopBottom(stockData.prices)

      result.patterns = []

      if (headAndShoulders.pattern !== 'none') {
        result.patterns.push({
          pattern: headAndShoulders.pattern,
          positions: headAndShoulders.positions,
          confidence: 0.8,
          description:
            headAndShoulders.pattern === 'head-and-shoulders'
              ? '头肩顶形态，可能预示着下跌趋势'
              : '头肩底形态，可能预示着上涨趋势',
        })
      }

      if (doubleTopBottom.pattern !== 'none') {
        result.patterns.push({
          pattern: doubleTopBottom.pattern,
          positions: doubleTopBottom.positions,
          confidence: 0.75,
          description:
            doubleTopBottom.pattern === 'double-top'
              ? '双顶形态，可能预示着下跌趋势'
              : '双底形态，可能预示着上涨趋势',
        })
      }
    }

    return result
  }
}

// 导出所有技术指标计算函数
export const technicalIndicatorService = {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateKDJ,
  calculateBollingerBands,
  calculateATR,
  calculateVWAP,
  detectHeadAndShoulders,
  detectDoubleTopBottom,
  calculateIndicators,
}

export default technicalIndicatorService
