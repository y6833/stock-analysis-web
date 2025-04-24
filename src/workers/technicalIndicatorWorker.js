/**
 * 技术指标计算 Web Worker
 * 用于在后台线程计算各种技术指标，避免阻塞主线程
 */

// 简单移动平均线 (SMA)
function calculateSMA(prices, period) {
  const result = []

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
function calculateEMA(prices, period) {
  const result = []
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
function calculateRSI(prices, period = 14) {
  const result = []
  const gains = []
  const losses = []

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
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  // 计算快速和慢速EMA
  const fastEMA = calculateEMA(prices, fastPeriod)
  const slowEMA = calculateEMA(prices, slowPeriod)
  
  // 计算MACD线 (快速EMA - 慢速EMA)
  const macdLine = []
  for (let i = 0; i < prices.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
      macdLine.push(NaN)
    } else {
      macdLine.push(fastEMA[i] - slowEMA[i])
    }
  }
  
  // 计算信号线 (MACD的EMA)
  const validMacdValues = macdLine.filter(value => !isNaN(value))
  const signalLine = calculateEMA(macdLine, signalPeriod)
  
  // 计算柱状图 (MACD线 - 信号线)
  const histogram = []
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
function calculateKDJ(highPrices, lowPrices, closePrices, period = 9, kPeriod = 3, dPeriod = 3) {
  const rsv = []
  const k = []
  const d = []
  const j = []
  
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
    const currentRSV = (closePrices[i] - lowInPeriod) / (highInPeriod - lowInPeriod) * 100
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
function calculateBollingerBands(prices, period = 20, multiplier = 2) {
  const middle = calculateSMA(prices, period)
  const upper = []
  const lower = []
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(NaN)
      lower.push(NaN)
      continue
    }
    
    // 计算标准差
    const slice = prices.slice(i - period + 1, i + 1)
    const mean = middle[i]
    const squaredDiffs = slice.map(price => Math.pow(price - mean, 2))
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period
    const stdDev = Math.sqrt(variance)
    
    // 计算上轨和下轨
    upper.push(mean + multiplier * stdDev)
    lower.push(mean - multiplier * stdDev)
  }
  
  return { upper, middle, lower }
}

// 形态识别 - 头肩顶/底
function detectHeadAndShoulders(prices, windowSize = 60) {
  // 这里实现一个简化版的头肩顶/底识别算法
  // 实际应用中，这个算法会更复杂，需要考虑更多因素
  
  // 如果数据点不足，无法识别
  if (prices.length < windowSize) {
    return { pattern: 'none', positions: null }
  }
  
  // 获取窗口内的数据
  const windowPrices = prices.slice(prices.length - windowSize)
  
  // 寻找局部极值点
  const peaks = []
  const troughs = []
  
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
          positions: [peaks[i], peaks[i + 1], peaks[i + 2]].map(p => p + prices.length - windowSize)
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
          positions: [troughs[i], troughs[i + 1], troughs[i + 2]].map(p => p + prices.length - windowSize)
        }
      }
    }
  }
  
  return { pattern: 'none', positions: null }
}

// 形态识别 - 双顶/双底
function detectDoubleTopBottom(prices, windowSize = 60) {
  // 如果数据点不足，无法识别
  if (prices.length < windowSize) {
    return { pattern: 'none', positions: null }
  }
  
  // 获取窗口内的数据
  const windowPrices = prices.slice(prices.length - windowSize)
  
  // 寻找局部极值点
  const peaks = []
  const troughs = []
  
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
    if (topDiff < 0.05 && peaks[i + 1] - peaks[i] > 5) { // 确保两个顶之间有足够的距离
      return {
        pattern: 'double-top',
        positions: [peaks[i], peaks[i + 1]].map(p => p + prices.length - windowSize)
      }
    }
  }
  
  // 检查双底形态
  for (let i = 0; i < troughs.length - 1; i++) {
    const firstBottom = windowPrices[troughs[i]]
    const secondBottom = windowPrices[troughs[i + 1]]
    
    // 检查两个底是否深度相近 (允许5%的差异)
    const bottomDiff = Math.abs(firstBottom - secondBottom) / firstBottom
    if (bottomDiff < 0.05 && troughs[i + 1] - troughs[i] > 5) { // 确保两个底之间有足够的距离
      return {
        pattern: 'double-bottom',
        positions: [troughs[i], troughs[i + 1]].map(p => p + prices.length - windowSize)
      }
    }
  }
  
  return { pattern: 'none', positions: null }
}

// 批量计算多个指标
function calculateAllIndicators(data, indicators) {
  const result = {}
  const prices = data.prices || []
  const volumes = data.volumes || []
  const highs = data.highs || prices
  const lows = data.lows || prices
  const closes = data.closes || prices
  
  // 计算请求的指标
  if (indicators.includes('sma')) {
    result.sma = {
      sma5: calculateSMA(prices, 5),
      sma10: calculateSMA(prices, 10),
      sma20: calculateSMA(prices, 20),
      sma60: calculateSMA(prices, 60)
    }
  }
  
  if (indicators.includes('ema')) {
    result.ema = {
      ema12: calculateEMA(prices, 12),
      ema26: calculateEMA(prices, 26)
    }
  }
  
  if (indicators.includes('macd')) {
    result.macd = calculateMACD(prices)
  }
  
  if (indicators.includes('rsi')) {
    result.rsi = {
      rsi14: calculateRSI(prices, 14)
    }
  }
  
  if (indicators.includes('kdj')) {
    result.kdj = calculateKDJ(highs, lows, closes)
  }
  
  if (indicators.includes('bollinger')) {
    result.bollinger = calculateBollingerBands(prices)
  }
  
  if (indicators.includes('volume')) {
    result.volume = {
      volume: volumes,
      ma5: calculateSMA(volumes, 5),
      ma10: calculateSMA(volumes, 10)
    }
  }
  
  if (indicators.includes('pattern')) {
    const headAndShoulders = detectHeadAndShoulders(prices)
    const doubleTopBottom = detectDoubleTopBottom(prices)
    
    result.patterns = []
    
    if (headAndShoulders.pattern !== 'none') {
      result.patterns.push({
        pattern: headAndShoulders.pattern,
        positions: headAndShoulders.positions,
        confidence: 0.8,
        description: headAndShoulders.pattern === 'head-and-shoulders' 
          ? '头肩顶形态，可能预示着下跌趋势' 
          : '头肩底形态，可能预示着上涨趋势'
      })
    }
    
    if (doubleTopBottom.pattern !== 'none') {
      result.patterns.push({
        pattern: doubleTopBottom.pattern,
        positions: doubleTopBottom.positions,
        confidence: 0.75,
        description: doubleTopBottom.pattern === 'double-top' 
          ? '双顶形态，可能预示着下跌趋势' 
          : '双底形态，可能预示着上涨趋势'
      })
    }
  }
  
  return result
}

// 监听消息
self.addEventListener('message', (e) => {
  const { type, data } = e.data
  
  switch (type) {
    case 'calculate':
      const { stockData, indicators } = data
      const result = calculateAllIndicators(stockData, indicators)
      self.postMessage({ type: 'result', data: result })
      break
      
    default:
      self.postMessage({ type: 'error', message: '未知的操作类型' })
  }
})

// 通知主线程 worker 已准备就绪
self.postMessage({ type: 'ready' })
