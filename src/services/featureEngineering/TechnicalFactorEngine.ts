/**
 * 技术指标因子引擎
 * 计算各种技术分析因子
 */

import type { StockData } from '@/types/stock'
import type { FactorResult } from './FeatureEngineManager'
import { 
  calculateSMA, 
  calculateEMA, 
  calculateRSI, 
  calculateMACD, 
  calculateKDJ,
  calculateBollingerBands,
  calculateATR,
  calculateVWAP
} from '@/services/technicalIndicatorService'

/**
 * 技术指标因子引擎
 */
export class TechnicalFactorEngine {
  
  /**
   * 计算指定的技术因子
   */
  async calculateFactor(
    factorName: string,
    stockData: StockData,
    params: Record<string, any> = {}
  ): Promise<FactorResult> {
    switch (factorName) {
      case 'sma_cross':
        return this.calculateSMACross(stockData, params)
      case 'rsi_divergence':
        return this.calculateRSIDivergence(stockData, params)
      case 'macd_signal':
        return this.calculateMACDSignal(stockData, params)
      case 'bollinger_position':
        return this.calculateBollingerPosition(stockData, params)
      case 'volume_price_trend':
        return this.calculateVolumePriceTrend(stockData, params)
      case 'momentum':
        return this.calculateMomentum(stockData, params)
      case 'volatility':
        return this.calculateVolatility(stockData, params)
      case 'trend_strength':
        return this.calculateTrendStrength(stockData, params)
      case 'support_resistance':
        return this.calculateSupportResistance(stockData, params)
      case 'price_acceleration':
        return this.calculatePriceAcceleration(stockData, params)
      default:
        throw new Error(`未知的技术因子: ${factorName}`)
    }
  }

  /**
   * 均线交叉因子
   */
  private calculateSMACross(stockData: StockData, params: any): FactorResult {
    const shortPeriod = params.shortPeriod || 5
    const longPeriod = params.longPeriod || 20
    
    const shortSMA = calculateSMA(stockData.prices, shortPeriod)
    const longSMA = calculateSMA(stockData.prices, longPeriod)
    
    const values = shortSMA.map((short, i) => {
      const long = longSMA[i]
      if (isNaN(short) || isNaN(long)) return NaN
      
      // 计算短期均线相对长期均线的位置
      return (short - long) / long
    })
    
    return {
      factorName: 'sma_cross',
      factorType: 'technical',
      values,
      dates: stockData.dates,
      metadata: {
        description: `${shortPeriod}日均线与${longPeriod}日均线的交叉信号`,
        category: '趋势跟踪',
        unit: '比例',
        range: [-1, 1],
        lastUpdated: new Date().toISOString(),
        dataSource: 'technical_calculation'
      }
    }
  }

  /**
   * RSI背离因子
   */
  private calculateRSIDivergence(stockData: StockData, params: any): FactorResult {
    const period = params.period || 14
    const lookback = params.lookback || 20
    
    const rsi = calculateRSI(stockData.prices, period)
    const values: number[] = []
    
    for (let i = 0; i < stockData.prices.length; i++) {
      if (i < lookback) {
        values.push(NaN)
        continue
      }
      
      // 计算价格和RSI的相关性
      const priceSlice = stockData.prices.slice(i - lookback, i)
      const rsiSlice = rsi.slice(i - lookback, i)
      
      const correlation = this.calculateCorrelation(priceSlice, rsiSlice)
      
      // 背离信号：相关性为负表示背离
      values.push(-correlation)
    }
    
    return {
      factorName: 'rsi_divergence',
      factorType: 'technical',
      values,
      dates: stockData.dates,
      metadata: {
        description: 'RSI与价格的背离程度',
        category: '动量指标',
        unit: '相关性',
        range: [-1, 1],
        lastUpdated: new Date().toISOString(),
        dataSource: 'technical_calculation'
      }
    }
  }

  /**
   * MACD信号因子
   */
  private calculateMACDSignal(stockData: StockData, params: any): FactorResult {
    const fastPeriod = params.fastPeriod || 12
    const slowPeriod = params.slowPeriod || 26
    const signalPeriod = params.signalPeriod || 9
    
    const macd = calculateMACD(stockData.prices, fastPeriod, slowPeriod, signalPeriod)
    
    const values = macd.histogram.map((hist, i) => {
      if (isNaN(hist)) return NaN
      
      // 标准化MACD柱状图
      const price = stockData.prices[i]
      return hist / price
    })
    
    return {
      factorName: 'macd_signal',
      factorType: 'technical',
      values,
      dates: stockData.dates,
      metadata: {
        description: 'MACD柱状图信号强度',
        category: '动量指标',
        unit: '标准化值',
        lastUpdated: new Date().toISOString(),
        dataSource: 'technical_calculation'
      }
    }
  }

  /**
   * 布林带位置因子
   */
  private calculateBollingerPosition(stockData: StockData, params: any): FactorResult {
    const period = params.period || 20
    const multiplier = params.multiplier || 2
    
    const bollinger = calculateBollingerBands(stockData.prices, period, multiplier)
    
    const values = stockData.prices.map((price, i) => {
      const upper = bollinger.upper[i]
      const lower = bollinger.lower[i]
      
      if (isNaN(upper) || isNaN(lower)) return NaN
      
      // 计算价格在布林带中的相对位置
      const bandWidth = upper - lower
      if (bandWidth === 0) return 0
      
      return (price - lower) / bandWidth
    })
    
    return {
      factorName: 'bollinger_position',
      factorType: 'technical',
      values,
      dates: stockData.dates,
      metadata: {
        description: '价格在布林带中的相对位置',
        category: '波动性指标',
        unit: '位置比例',
        range: [0, 1],
        lastUpdated: new Date().toISOString(),
        dataSource: 'technical_calculation'
      }
    }
  }

  /**
   * 量价趋势因子
   */
  private calculateVolumePriceTrend(stockData: StockData, params: any): FactorResult {
    const period = params.period || 10
    
    if (!stockData.volumes || stockData.volumes.length === 0) {
      // 如果没有成交量数据，返回空值
      return {
        factorName: 'volume_price_trend',
        factorType: 'technical',
        values: stockData.prices.map(() => NaN),
        dates: stockData.dates,
        metadata: {
          description: '量价趋势因子（无成交量数据）',
          category: '量价关系',
          lastUpdated: new Date().toISOString(),
          dataSource: 'technical_calculation'
        }
      }
    }
    
    const values: number[] = []
    
    for (let i = 0; i < stockData.prices.length; i++) {
      if (i < period) {
        values.push(NaN)
        continue
      }
      
      // 计算价格变化和成交量变化的相关性
      const priceChanges = []
      const volumeChanges = []
      
      for (let j = i - period + 1; j <= i; j++) {
        if (j > 0) {
          priceChanges.push((stockData.prices[j] - stockData.prices[j - 1]) / stockData.prices[j - 1])
          volumeChanges.push((stockData.volumes![j] - stockData.volumes![j - 1]) / stockData.volumes![j - 1])
        }
      }
      
      const correlation = this.calculateCorrelation(priceChanges, volumeChanges)
      values.push(correlation)
    }
    
    return {
      factorName: 'volume_price_trend',
      factorType: 'technical',
      values,
      dates: stockData.dates,
      metadata: {
        description: '量价趋势一致性',
        category: '量价关系',
        unit: '相关性',
        range: [-1, 1],
        lastUpdated: new Date().toISOString(),
        dataSource: 'technical_calculation'
      }
    }
  }

  /**
   * 动量因子
   */
  private calculateMomentum(stockData: StockData, params: any): FactorResult {
    const period = params.period || 10
    
    const values = stockData.prices.map((price, i) => {
      if (i < period) return NaN
      
      const pastPrice = stockData.prices[i - period]
      return (price - pastPrice) / pastPrice
    })
    
    return {
      factorName: 'momentum',
      factorType: 'technical',
      values,
      dates: stockData.dates,
      metadata: {
        description: `${period}日动量`,
        category: '动量指标',
        unit: '收益率',
        lastUpdated: new Date().toISOString(),
        dataSource: 'technical_calculation'
      }
    }
  }

  /**
   * 波动率因子
   */
  private calculateVolatility(stockData: StockData, params: any): FactorResult {
    const period = params.period || 20
    
    const returns = stockData.prices.map((price, i) => {
      if (i === 0) return 0
      return Math.log(price / stockData.prices[i - 1])
    })
    
    const values: number[] = []
    
    for (let i = 0; i < returns.length; i++) {
      if (i < period) {
        values.push(NaN)
        continue
      }
      
      const slice = returns.slice(i - period + 1, i + 1)
      const mean = slice.reduce((sum, r) => sum + r, 0) / slice.length
      const variance = slice.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / slice.length
      const volatility = Math.sqrt(variance * 252) // 年化波动率
      
      values.push(volatility)
    }
    
    return {
      factorName: 'volatility',
      factorType: 'technical',
      values,
      dates: stockData.dates,
      metadata: {
        description: `${period}日滚动波动率`,
        category: '波动性指标',
        unit: '年化波动率',
        lastUpdated: new Date().toISOString(),
        dataSource: 'technical_calculation'
      }
    }
  }

  /**
   * 趋势强度因子
   */
  private calculateTrendStrength(stockData: StockData, params: any): FactorResult {
    const period = params.period || 20
    
    const values: number[] = []
    
    for (let i = 0; i < stockData.prices.length; i++) {
      if (i < period) {
        values.push(NaN)
        continue
      }
      
      const slice = stockData.prices.slice(i - period + 1, i + 1)
      
      // 计算线性回归的R²值作为趋势强度
      const x = Array.from({ length: period }, (_, idx) => idx)
      const y = slice
      
      const rSquared = this.calculateRSquared(x, y)
      values.push(rSquared)
    }
    
    return {
      factorName: 'trend_strength',
      factorType: 'technical',
      values,
      dates: stockData.dates,
      metadata: {
        description: '趋势强度（R²值）',
        category: '趋势指标',
        unit: 'R²',
        range: [0, 1],
        lastUpdated: new Date().toISOString(),
        dataSource: 'technical_calculation'
      }
    }
  }

  /**
   * 支撑阻力因子
   */
  private calculateSupportResistance(stockData: StockData, params: any): FactorResult {
    const lookback = params.lookback || 50
    const threshold = params.threshold || 0.02
    
    const values: number[] = []
    
    for (let i = 0; i < stockData.prices.length; i++) {
      if (i < lookback) {
        values.push(NaN)
        continue
      }
      
      const currentPrice = stockData.prices[i]
      const historicalPrices = stockData.prices.slice(i - lookback, i)
      
      // 寻找支撑和阻力位
      let supportCount = 0
      let resistanceCount = 0
      
      historicalPrices.forEach(price => {
        const diff = Math.abs(price - currentPrice) / currentPrice
        if (diff < threshold) {
          if (price < currentPrice) {
            supportCount++
          } else {
            resistanceCount++
          }
        }
      })
      
      // 计算支撑阻力强度
      const totalCount = supportCount + resistanceCount
      const strength = totalCount / lookback
      
      values.push(strength)
    }
    
    return {
      factorName: 'support_resistance',
      factorType: 'technical',
      values,
      dates: stockData.dates,
      metadata: {
        description: '支撑阻力位强度',
        category: '价格水平',
        unit: '强度比例',
        range: [0, 1],
        lastUpdated: new Date().toISOString(),
        dataSource: 'technical_calculation'
      }
    }
  }

  /**
   * 价格加速度因子
   */
  private calculatePriceAcceleration(stockData: StockData, params: any): FactorResult {
    const period = params.period || 5
    
    // 计算价格变化率
    const returns = stockData.prices.map((price, i) => {
      if (i === 0) return 0
      return (price - stockData.prices[i - 1]) / stockData.prices[i - 1]
    })
    
    // 计算变化率的变化率（加速度）
    const values = returns.map((ret, i) => {
      if (i < period) return NaN
      
      const currentReturn = ret
      const pastReturn = returns[i - period]
      
      return currentReturn - pastReturn
    })
    
    return {
      factorName: 'price_acceleration',
      factorType: 'technical',
      values,
      dates: stockData.dates,
      metadata: {
        description: '价格变化加速度',
        category: '动量指标',
        unit: '加速度',
        lastUpdated: new Date().toISOString(),
        dataSource: 'technical_calculation'
      }
    }
  }

  /**
   * 计算相关系数
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0
    
    const n = x.length
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0)
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0)
    
    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
    
    return denominator === 0 ? 0 : numerator / denominator
  }

  /**
   * 计算R²值
   */
  private calculateRSquared(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0
    
    const n = x.length
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0)
    
    const meanY = sumY / n
    
    // 计算回归系数
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    // 计算R²
    let ssRes = 0
    let ssTot = 0
    
    for (let i = 0; i < n; i++) {
      const predicted = slope * x[i] + intercept
      ssRes += Math.pow(y[i] - predicted, 2)
      ssTot += Math.pow(y[i] - meanY, 2)
    }
    
    return ssTot === 0 ? 0 : 1 - (ssRes / ssTot)
  }
}

export default TechnicalFactorEngine
