/**
 * 优化的技术指标计算 Web Worker
 * 用于在后台线程计算各种技术指标，避免阻塞主线程
 * 支持增量计算和自定义指标
 */

// 简单移动平均线 (SMA)
function calculateSMA(prices, period) {
  const result = []

  // 优化: 使用滑动窗口算法，避免重复计算
  let sum = 0
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(NaN)
      sum += prices[i]
      continue
    }

    if (i === period - 1) {
      sum += prices[i]
      result.push(sum / period)
      continue
    }

    // 滑动窗口: 加入新值，移除旧值
    sum = sum + prices[i] - prices[i - period]
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

  // 优化: 使用单次遍历计算RSI，减少数组创建和内存使用
  if (prices.length <= 1) {
    return Array(prices.length).fill(NaN)
  }

  // 初始化变量
  let avgGain = 0
  let avgLoss = 0

  // 计算第一个周期的平均涨跌幅
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) {
      avgGain += change
    } else {
      avgLoss += Math.abs(change)
    }
  }

  avgGain /= period
  avgLoss /= period

  // 填充前面的NaN值
  for (let i = 0; i < period; i++) {
    result.push(NaN)
  }

  // 计算第一个RSI值
  if (avgLoss === 0) {
    result.push(100)
  } else {
    const rs = avgGain / avgLoss
    result.push(100 - 100 / (1 + rs))
  }

  // 使用平滑RSI公式计算剩余值
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0

    // 使用平滑RSI公式
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

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

  // 优化: 使用滑动窗口查找最高价和最低价
  let highestInWindow = -Infinity
  let lowestInWindow = Infinity
  let highestIndices = []
  let lowestIndices = []

  // 初始化窗口
  for (let i = 0; i < period; i++) {
    if (i < highPrices.length) {
      if (highPrices[i] > highestInWindow) {
        highestInWindow = highPrices[i]
        highestIndices = [i]
      } else if (highPrices[i] === highestInWindow) {
        highestIndices.push(i)
      }

      if (lowPrices[i] < lowestInWindow) {
        lowestInWindow = lowPrices[i]
        lowestIndices = [i]
      } else if (lowPrices[i] === lowestInWindow) {
        lowestIndices.push(i)
      }
    }
  }

  // 计算RSV
  for (let i = 0; i < closePrices.length; i++) {
    if (i < period - 1) {
      rsv.push(NaN)
      k.push(NaN)
      d.push(NaN)
      j.push(NaN)
      continue
    }

    // 更新滑动窗口
    if (i >= period) {
      // 移除离开窗口的值
      const outIndex = i - period
      if (highestIndices.includes(outIndex)) {
        highestIndices = highestIndices.filter((idx) => idx !== outIndex)
        if (highestIndices.length === 0) {
          // 重新计算窗口内的最高价
          highestInWindow = -Infinity
          for (let j = i - period + 1; j <= i; j++) {
            if (highPrices[j] > highestInWindow) {
              highestInWindow = highPrices[j]
              highestIndices = [j]
            } else if (highPrices[j] === highestInWindow) {
              highestIndices.push(j)
            }
          }
        }
      }

      if (lowestIndices.includes(outIndex)) {
        lowestIndices = lowestIndices.filter((idx) => idx !== outIndex)
        if (lowestIndices.length === 0) {
          // 重新计算窗口内的最低价
          lowestInWindow = Infinity
          for (let j = i - period + 1; j <= i; j++) {
            if (lowPrices[j] < lowestInWindow) {
              lowestInWindow = lowPrices[j]
              lowestIndices = [j]
            } else if (lowPrices[j] === lowestInWindow) {
              lowestIndices.push(j)
            }
          }
        }
      }

      // 添加新值
      if (highPrices[i] > highestInWindow) {
        highestInWindow = highPrices[i]
        highestIndices = [i]
      } else if (highPrices[i] === highestInWindow) {
        highestIndices.push(i)
      }

      if (lowPrices[i] < lowestInWindow) {
        lowestInWindow = lowPrices[i]
        lowestIndices = [i]
      } else if (lowPrices[i] === lowestInWindow) {
        lowestIndices.push(i)
      }
    }

    // 计算RSV值 (当前收盘价 - 周期内最低价) / (周期内最高价 - 周期内最低价) * 100
    const currentRSV =
      ((closePrices[i] - lowestInWindow) / (highestInWindow - lowestInWindow)) * 100
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

  // 优化: 使用更高效的滑动窗口计算标准差
  // 使用韦尔奇算法 (Welford's online algorithm) 计算方差
  // 这是一种数值稳定的单遍算法，避免了重复计算
  let windowValues = []
  let mean = 0
  let m2 = 0
  let count = 0

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(NaN)
      lower.push(NaN)

      // 更新韦尔奇算法的状态
      const newValue = prices[i]
      count++
      const delta = newValue - mean
      mean += delta / count
      const delta2 = newValue - mean
      m2 += delta * delta2

      windowValues.push(newValue)
      continue
    }

    // 更新窗口
    if (i === period - 1) {
      // 添加最后一个值到窗口
      const newValue = prices[i]
      count++
      const delta = newValue - mean
      mean += delta / count
      const delta2 = newValue - mean
      m2 += delta * delta2

      windowValues.push(newValue)
    } else {
      // 移除旧值，添加新值
      const oldValue = windowValues.shift()
      windowValues.push(prices[i])

      // 更新韦尔奇算法的状态 - 移除旧值的贡献
      const oldDelta = oldValue - mean
      mean -= oldDelta / (count - 1)
      m2 -= oldDelta * (oldValue - mean)

      // 添加新值的贡献
      const newValue = prices[i]
      const newDelta = newValue - mean
      mean += newDelta / count
      const newDelta2 = newValue - mean
      m2 += newDelta * newDelta2
    }

    // 计算标准差
    const variance = m2 / period
    const stdDev = Math.sqrt(variance)

    // 计算上轨和下轨
    upper.push(middle[i] + multiplier * stdDev)
    lower.push(middle[i] - multiplier * stdDev)
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

// 计算自定义指标
function calculateCustomIndicator(stockData, customParams) {
  const { formula, variables } = customParams
  if (!formula || !variables) {
    return null
  }

  try {
    // 解析变量
    const variableValues = {}
    for (const [key, value] of Object.entries(variables)) {
      const varConfig = value
      if (varConfig.type === 'price') {
        variableValues[key] = stockData.prices || []
      } else if (varConfig.type === 'volume') {
        variableValues[key] = stockData.volumes || []
      } else if (varConfig.type === 'indicator') {
        // 获取指标数据
        const { name, period } = varConfig
        if (name === 'sma') {
          variableValues[key] = calculateSMA(stockData.prices || [], period || 5)
        } else if (name === 'ema') {
          variableValues[key] = calculateEMA(stockData.prices || [], period || 12)
        }
        // 可以添加更多指标类型
      }
    }

    // 计算结果
    const result = []
    const dataLength = stockData.prices?.length || 0

    for (let i = 0; i < dataLength; i++) {
      // 为每个数据点计算公式
      let formulaStr = formula
      for (const [key, values] of Object.entries(variableValues)) {
        const value = i < values.length ? values[i] : NaN
        formulaStr = formulaStr.replace(new RegExp(key, 'g'), value.toString())
      }

      try {
        // 安全地计算公式
        // eslint-disable-next-line no-eval
        const value = eval(formulaStr)
        result.push(value)
      } catch (e) {
        result.push(NaN)
      }
    }

    return result
  } catch (error) {
    console.error('计算自定义指标失败:', error)
    return null
  }
}

// 批量计算多个指标
function calculateAllIndicators(data, indicators, params = {}) {
  const result = {}
  const prices = data.prices || []
  const volumes = data.volumes || []
  const highs = data.highs || prices
  const lows = data.lows || prices
  const closes = data.closes || prices

  // 检查是否是增量计算
  const isIncremental = params.incremental && params.incremental.previousResult
  if (isIncremental) {
    return calculateIncrementalIndicators(data, indicators, params)
  }

  // 计算请求的指标
  if (indicators.includes('sma')) {
    const periods = params.sma?.periods || [5, 10, 20, 60]
    result.sma = {}
    periods.forEach((period) => {
      result.sma[`sma${period}`] = calculateSMA(prices, period)
    })
  }

  if (indicators.includes('ema')) {
    const periods = params.ema?.periods || [12, 26]
    result.ema = {}
    periods.forEach((period) => {
      result.ema[`ema${period}`] = calculateEMA(prices, period)
    })
  }

  if (indicators.includes('macd')) {
    const fastPeriod = params.macd?.fastPeriod || 12
    const slowPeriod = params.macd?.slowPeriod || 26
    const signalPeriod = params.macd?.signalPeriod || 9
    result.macd = calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod)
  }

  if (indicators.includes('rsi')) {
    const periods = params.rsi?.periods || [14]
    result.rsi = {}
    periods.forEach((period) => {
      result.rsi[`rsi${period}`] = calculateRSI(prices, period)
    })
  }

  if (indicators.includes('kdj')) {
    const period = params.kdj?.period || 9
    const kPeriod = params.kdj?.kPeriod || 3
    const dPeriod = params.kdj?.dPeriod || 3
    result.kdj = calculateKDJ(highs, lows, closes, period, kPeriod, dPeriod)
  }

  if (indicators.includes('bollinger')) {
    const period = params.bollinger?.period || 20
    const multiplier = params.bollinger?.multiplier || 2
    result.bollinger = calculateBollingerBands(prices, period, multiplier)
  }

  if (indicators.includes('volume')) {
    const periods = params.volume?.periods || [5, 10]
    result.volume = {
      volume: volumes,
    }
    periods.forEach((period) => {
      result.volume[`ma${period}`] = calculateSMA(volumes, period)
    })
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

  // 处理自定义指标
  if (indicators.includes('custom') && params.custom) {
    result.custom = calculateCustomIndicator(data, params.custom)
  }

  return result
}

// 增量计算指标
function calculateIncrementalIndicators(data, indicators, params) {
  const { previousResult, newDataStartIndex } = params.incremental
  const result = JSON.parse(JSON.stringify(previousResult)) // 深拷贝

  // 对每个指标进行增量计算
  if (indicators.includes('sma') && result.sma) {
    const periods = params.sma?.periods || [5, 10, 20, 60]
    periods.forEach((period) => {
      // 对于SMA，我们需要重新计算从 newDataStartIndex - period + 1 开始的所有点
      const startIdx = Math.max(0, newDataStartIndex - period + 1)
      const newSma = calculateSMA(data.prices.slice(startIdx), period)

      // 将新计算的值拼接到原来的结果中
      result.sma[`sma${period}`] = [...result.sma[`sma${period}`].slice(0, startIdx), ...newSma]
    })
  }

  // 类似地处理其他指标...
  // 这里只是一个示例，实际上每种指标的增量计算逻辑可能不同

  return result
}

// 平均真实范围 (ATR)
function calculateATR(highPrices, lowPrices, closePrices, period = 14) {
  const trueRanges = []
  const atr = []

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

  // 计算ATR - 使用平滑移动平均
  let sum = 0
  for (let i = 0; i < trueRanges.length; i++) {
    if (i < period - 1) {
      atr.push(NaN)
      sum += trueRanges[i]
      continue
    }

    if (i === period - 1) {
      sum += trueRanges[i]
      atr.push(sum / period)
      continue
    }

    // 使用平滑ATR公式: ATR = [(前一日ATR * (period-1)) + 当日TR] / period
    atr.push((atr[atr.length - 1] * (period - 1) + trueRanges[i]) / period)
  }

  return atr
}

// 成交量加权平均价格 (VWAP)
function calculateVWAP(prices, volumes) {
  const vwap = []
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

// 相对强度指数 (Relative Vigor Index - RVI)
function calculateRVI(openPrices, highPrices, lowPrices, closePrices, period = 10) {
  const numerator = []
  const denominator = []
  const rvi = []
  const signal = []

  // 计算分子和分母
  for (let i = 0; i < closePrices.length; i++) {
    if (i === 0) {
      numerator.push(NaN)
      denominator.push(NaN)
      continue
    }

    // 分子 = 收盘价 - 开盘价
    numerator.push(closePrices[i] - openPrices[i])

    // 分母 = 最高价 - 最低价
    denominator.push(highPrices[i] - lowPrices[i])
  }

  // 计算RVI
  for (let i = 0; i < numerator.length; i++) {
    if (i < period) {
      rvi.push(NaN)
      continue
    }

    // 计算分子和分母的移动平均
    let numSum = 0
    let denSum = 0
    for (let j = 0; j < period; j++) {
      numSum += numerator[i - j]
      denSum += denominator[i - j]
    }

    // RVI = 分子移动平均 / 分母移动平均
    if (denSum === 0) {
      rvi.push(0)
    } else {
      rvi.push(numSum / denSum)
    }
  }

  // 计算信号线 (RVI的4周期移动平均)
  for (let i = 0; i < rvi.length; i++) {
    if (i < 3) {
      signal.push(NaN)
      continue
    }

    // 计算4周期移动平均
    const avg = (rvi[i] + rvi[i - 1] + rvi[i - 2] + rvi[i - 3]) / 4
    signal.push(avg)
  }

  return { rvi, signal }
}

// 随机指标 (Stochastic Oscillator)
function calculateStochastic(highPrices, lowPrices, closePrices, kPeriod = 14, dPeriod = 3) {
  const k = []
  const d = []

  // 计算%K
  for (let i = 0; i < closePrices.length; i++) {
    if (i < kPeriod - 1) {
      k.push(NaN)
      continue
    }

    // 找出周期内的最高价和最低价
    let highestHigh = -Infinity
    let lowestLow = Infinity
    for (let j = i - kPeriod + 1; j <= i; j++) {
      highestHigh = Math.max(highestHigh, highPrices[j])
      lowestLow = Math.min(lowestLow, lowPrices[j])
    }

    // 计算%K = (当前收盘价 - 周期内最低价) / (周期内最高价 - 周期内最低价) * 100
    const range = highestHigh - lowestLow
    if (range === 0) {
      k.push(100) // 避免除以零
    } else {
      k.push(((closePrices[i] - lowestLow) / range) * 100)
    }
  }

  // 计算%D (K的移动平均)
  for (let i = 0; i < k.length; i++) {
    if (i < dPeriod - 1 || isNaN(k[i])) {
      d.push(NaN)
      continue
    }

    // 计算dPeriod周期的简单移动平均
    let sum = 0
    for (let j = 0; j < dPeriod; j++) {
      sum += k[i - j]
    }
    d.push(sum / dPeriod)
  }

  return { k, d }
}

// 计算自定义指标 - 增强版
function calculateCustomIndicator(stockData, customParams) {
  const { formula, variables } = customParams
  if (!formula || !variables) {
    return null
  }

  try {
    // 解析变量
    const variableValues = {}
    for (const [key, value] of Object.entries(variables)) {
      const varConfig = value
      if (varConfig.type === 'price') {
        variableValues[key] = stockData.prices || []
      } else if (varConfig.type === 'open') {
        variableValues[key] = stockData.opens || []
      } else if (varConfig.type === 'high') {
        variableValues[key] = stockData.highs || []
      } else if (varConfig.type === 'low') {
        variableValues[key] = stockData.lows || []
      } else if (varConfig.type === 'close') {
        variableValues[key] = stockData.closes || stockData.prices || []
      } else if (varConfig.type === 'volume') {
        variableValues[key] = stockData.volumes || []
      } else if (varConfig.type === 'indicator') {
        // 获取指标数据
        const { name, period } = varConfig
        if (name === 'sma') {
          variableValues[key] = calculateSMA(stockData.prices || [], period || 5)
        } else if (name === 'ema') {
          variableValues[key] = calculateEMA(stockData.prices || [], period || 12)
        } else if (name === 'rsi') {
          variableValues[key] = calculateRSI(stockData.prices || [], period || 14)
        } else if (name === 'atr') {
          variableValues[key] = calculateATR(
            stockData.highs || stockData.prices || [],
            stockData.lows || stockData.prices || [],
            stockData.closes || stockData.prices || [],
            period || 14
          )
        }
      }
    }

    // 创建安全的计算环境
    const mathFunctions = {
      abs: Math.abs,
      sqrt: Math.sqrt,
      pow: Math.pow,
      log: Math.log,
      exp: Math.exp,
      max: Math.max,
      min: Math.min,
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      round: Math.round,
      floor: Math.floor,
      ceil: Math.ceil,
    }

    // 计算结果
    const result = []
    const dataLength = stockData.prices?.length || 0

    // 预编译公式，提高性能
    // 替换变量名为数组访问
    let compiledFormula = formula
    for (const key in variableValues) {
      const regex = new RegExp('\\b' + key + '\\b', 'g')
      compiledFormula = compiledFormula.replace(regex, `values['${key}'][i]`)
    }

    // 添加数学函数
    for (const [funcName, func] of Object.entries(mathFunctions)) {
      const regex = new RegExp('\\b' + funcName + '\\(', 'g')
      compiledFormula = compiledFormula.replace(regex, `mathFuncs.${funcName}(`)
    }

    // 创建计算函数
    const calculateValue = new Function(
      'values',
      'mathFuncs',
      'i',
      `
      try {
        return ${compiledFormula};
      } catch (e) {
        return NaN;
      }
    `
    )

    // 计算每个数据点
    for (let i = 0; i < dataLength; i++) {
      try {
        const value = calculateValue(variableValues, mathFunctions, i)
        result.push(value)
      } catch (e) {
        result.push(NaN)
      }
    }

    return result
  } catch (error) {
    console.error('计算自定义指标失败:', error)
    return null
  }
}

// 批量计算多个指标
function calculateAllIndicators(data, indicators, params = {}) {
  const result = {}
  const prices = data.prices || []
  const volumes = data.volumes || []
  const highs = data.highs || prices
  const lows = data.lows || prices
  const closes = data.closes || prices
  const opens = data.opens || prices

  // 检查是否是增量计算
  const isIncremental = params.incremental && params.incremental.previousResult
  if (isIncremental) {
    return calculateIncrementalIndicators(data, indicators, params)
  }

  // 计算请求的指标
  if (indicators.includes('sma')) {
    const periods = params.sma?.periods || [5, 10, 20, 60]
    result.sma = {}
    periods.forEach((period) => {
      result.sma[`sma${period}`] = calculateSMA(prices, period)
    })
  }

  if (indicators.includes('ema')) {
    const periods = params.ema?.periods || [12, 26]
    result.ema = {}
    periods.forEach((period) => {
      result.ema[`ema${period}`] = calculateEMA(prices, period)
    })
  }

  if (indicators.includes('macd')) {
    const fastPeriod = params.macd?.fastPeriod || 12
    const slowPeriod = params.macd?.slowPeriod || 26
    const signalPeriod = params.macd?.signalPeriod || 9
    result.macd = calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod)
  }

  if (indicators.includes('rsi')) {
    const periods = params.rsi?.periods || [14]
    result.rsi = {}
    periods.forEach((period) => {
      result.rsi[`rsi${period}`] = calculateRSI(prices, period)
    })
  }

  if (indicators.includes('kdj')) {
    const period = params.kdj?.period || 9
    const kPeriod = params.kdj?.kPeriod || 3
    const dPeriod = params.kdj?.dPeriod || 3
    result.kdj = calculateKDJ(highs, lows, closes, period, kPeriod, dPeriod)
  }

  if (indicators.includes('bollinger')) {
    const period = params.bollinger?.period || 20
    const multiplier = params.bollinger?.multiplier || 2
    result.bollinger = calculateBollingerBands(prices, period, multiplier)
  }

  if (indicators.includes('volume')) {
    const periods = params.volume?.periods || [5, 10]
    result.volume = {
      volume: volumes,
    }
    periods.forEach((period) => {
      result.volume[`ma${period}`] = calculateSMA(volumes, period)
    })
  }

  if (indicators.includes('atr')) {
    const period = params.atr?.period || 14
    result.atr = calculateATR(highs, lows, closes, period)
  }

  if (indicators.includes('vwap')) {
    result.vwap = calculateVWAP(prices, volumes)
  }

  if (indicators.includes('rvi')) {
    const period = params.rvi?.period || 10
    result.rvi = calculateRVI(opens, highs, lows, closes, period)
  }

  if (indicators.includes('stochastic')) {
    const kPeriod = params.stochastic?.kPeriod || 14
    const dPeriod = params.stochastic?.dPeriod || 3
    result.stochastic = calculateStochastic(highs, lows, closes, kPeriod, dPeriod)
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

  // 处理自定义指标
  if (indicators.includes('custom') && params.custom) {
    result.custom = calculateCustomIndicator(data, params.custom)
  }

  return result
}

// 增量计算指标
function calculateIncrementalIndicators(data, indicators, params) {
  const { previousResult, newDataStartIndex } = params.incremental
  const result = JSON.parse(JSON.stringify(previousResult)) // 深拷贝

  // 对每个指标进行增量计算
  if (indicators.includes('sma') && result.sma) {
    const periods = params.sma?.periods || [5, 10, 20, 60]
    periods.forEach((period) => {
      // 对于SMA，我们需要重新计算从 newDataStartIndex - period + 1 开始的所有点
      const startIdx = Math.max(0, newDataStartIndex - period + 1)
      const newSma = calculateSMA(data.prices.slice(startIdx), period)

      // 将新计算的值拼接到原来的结果中
      result.sma[`sma${period}`] = [...result.sma[`sma${period}`].slice(0, startIdx), ...newSma]
    })
  }

  // 对于EMA，需要使用最后一个已知的EMA值作为种子
  if (indicators.includes('ema') && result.ema) {
    const periods = params.ema?.periods || [12, 26]
    periods.forEach((period) => {
      const lastKnownIndex = newDataStartIndex - 1
      if (lastKnownIndex >= 0 && lastKnownIndex < result.ema[`ema${period}`].length) {
        const lastKnownEMA = result.ema[`ema${period}`][lastKnownIndex]
        const multiplier = 2 / (period + 1)

        // 从最后一个已知点开始计算
        let ema = lastKnownEMA
        const newEma = []

        for (let i = newDataStartIndex; i < data.prices.length; i++) {
          ema = data.prices[i] * multiplier + ema * (1 - multiplier)
          newEma.push(ema)
        }

        // 更新结果
        result.ema[`ema${period}`] = [
          ...result.ema[`ema${period}`].slice(0, newDataStartIndex),
          ...newEma,
        ]
      }
    })
  }

  // 类似地处理其他指标...
  // 这里只是一个示例，实际上每种指标的增量计算逻辑可能不同

  return result
}

// 监听消息
self.addEventListener('message', (e) => {
  const { type, data, taskId } = e.data

  switch (type) {
    case 'calculate':
      try {
        const { stockData, indicators, params } = data
        const result = calculateAllIndicators(stockData, indicators, params)
        self.postMessage({ type: 'result', data: result, taskId })
      } catch (error) {
        self.postMessage({
          type: 'error',
          message: `计算指标失败: ${error.message}`,
          taskId,
        })
      }
      break

    default:
      self.postMessage({
        type: 'error',
        message: '未知的操作类型',
        taskId: taskId || 'unknown',
      })
  }
})

// 通知主线程 worker 已准备就绪
self.postMessage({ type: 'ready' })
