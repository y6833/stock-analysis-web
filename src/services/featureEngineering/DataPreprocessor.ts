/**
 * 数据预处理器
 * 负责数据清洗、缺失值处理、异常值检测、数据对齐等
 */

import type { StockData } from '@/types/stock'

/**
 * 预处理配置
 */
export interface PreprocessConfig {
  fillMissingValues: boolean
  removeOutliers: boolean
  normalizeData: boolean
  adjustForSplits: boolean
  minDataPoints: number
  outlierThreshold: number // 标准差倍数
}

/**
 * 数据质量报告
 */
export interface DataQualityReport {
  totalDataPoints: number
  missingDataPoints: number
  outlierDataPoints: number
  missingRatio: number
  outlierRatio: number
  dataRange: [string, string]
  recommendations: string[]
}

/**
 * 数据预处理器
 */
export class DataPreprocessor {
  private defaultConfig: PreprocessConfig = {
    fillMissingValues: true,
    removeOutliers: true,
    normalizeData: false,
    adjustForSplits: true,
    minDataPoints: 30,
    outlierThreshold: 3.0
  }

  /**
   * 预处理股票数据
   */
  async preprocess(
    stockData: StockData,
    config: Partial<PreprocessConfig> = {}
  ): Promise<StockData> {
    const finalConfig = { ...this.defaultConfig, ...config }
    
    console.log('开始数据预处理...')
    
    // 1. 数据验证
    this.validateData(stockData)
    
    // 2. 数据对齐
    let processedData = this.alignData(stockData)
    
    // 3. 缺失值处理
    if (finalConfig.fillMissingValues) {
      processedData = this.fillMissingValues(processedData)
    }
    
    // 4. 异常值检测和处理
    if (finalConfig.removeOutliers) {
      processedData = this.removeOutliers(processedData, finalConfig.outlierThreshold)
    }
    
    // 5. 股票分割调整
    if (finalConfig.adjustForSplits) {
      processedData = this.adjustForSplits(processedData)
    }
    
    // 6. 数据标准化（可选）
    if (finalConfig.normalizeData) {
      processedData = this.normalizeData(processedData)
    }
    
    // 7. 最终验证
    this.validateProcessedData(processedData, finalConfig.minDataPoints)
    
    console.log('数据预处理完成')
    return processedData
  }

  /**
   * 数据验证
   */
  private validateData(stockData: StockData): void {
    if (!stockData.dates || stockData.dates.length === 0) {
      throw new Error('股票数据缺少日期信息')
    }
    
    if (!stockData.prices || stockData.prices.length === 0) {
      throw new Error('股票数据缺少价格信息')
    }
    
    if (stockData.dates.length !== stockData.prices.length) {
      throw new Error('日期和价格数据长度不匹配')
    }
    
    // 检查日期格式
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!stockData.dates.every(date => dateRegex.test(date))) {
      throw new Error('日期格式不正确，应为 YYYY-MM-DD')
    }
  }

  /**
   * 数据对齐
   */
  private alignData(stockData: StockData): StockData {
    const { dates, prices, volumes, highs, lows, opens } = stockData
    
    // 按日期排序
    const sortedIndices = dates
      .map((date, index) => ({ date, index }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(item => item.index)
    
    const alignedData: StockData = {
      symbol: stockData.symbol,
      dates: sortedIndices.map(i => dates[i]),
      prices: sortedIndices.map(i => prices[i]),
      volumes: volumes ? sortedIndices.map(i => volumes[i]) : [],
      highs: highs ? sortedIndices.map(i => highs[i]) : [],
      lows: lows ? sortedIndices.map(i => lows[i]) : [],
      opens: opens ? sortedIndices.map(i => opens[i]) : [],
      high: stockData.high,
      low: stockData.low,
      open: stockData.open,
      close: stockData.close,
      dataSource: stockData.dataSource
    }
    
    return alignedData
  }

  /**
   * 缺失值处理
   */
  private fillMissingValues(stockData: StockData): StockData {
    const result = { ...stockData }
    
    // 处理价格缺失值
    result.prices = this.fillMissingValuesInArray(stockData.prices, 'linear')
    
    // 处理成交量缺失值
    if (result.volumes && result.volumes.length > 0) {
      result.volumes = this.fillMissingValuesInArray(stockData.volumes!, 'forward')
    }
    
    // 处理OHLC数据
    if (result.highs && result.highs.length > 0) {
      result.highs = this.fillMissingValuesInArray(stockData.highs!, 'linear')
    }
    
    if (result.lows && result.lows.length > 0) {
      result.lows = this.fillMissingValuesInArray(stockData.lows!, 'linear')
    }
    
    if (result.opens && result.opens.length > 0) {
      result.opens = this.fillMissingValuesInArray(stockData.opens!, 'linear')
    }
    
    return result
  }

  /**
   * 数组缺失值填充
   */
  private fillMissingValuesInArray(
    values: number[],
    method: 'forward' | 'backward' | 'linear' | 'mean' = 'linear'
  ): number[] {
    const result = [...values]
    
    for (let i = 0; i < result.length; i++) {
      if (isNaN(result[i]) || result[i] === null || result[i] === undefined) {
        switch (method) {
          case 'forward':
            // 向前填充
            if (i > 0) {
              result[i] = result[i - 1]
            }
            break
            
          case 'backward':
            // 向后填充
            for (let j = i + 1; j < result.length; j++) {
              if (!isNaN(result[j])) {
                result[i] = result[j]
                break
              }
            }
            break
            
          case 'linear':
            // 线性插值
            const prevIndex = this.findPreviousValidIndex(result, i)
            const nextIndex = this.findNextValidIndex(result, i)
            
            if (prevIndex !== -1 && nextIndex !== -1) {
              const prevValue = result[prevIndex]
              const nextValue = result[nextIndex]
              const ratio = (i - prevIndex) / (nextIndex - prevIndex)
              result[i] = prevValue + (nextValue - prevValue) * ratio
            } else if (prevIndex !== -1) {
              result[i] = result[prevIndex]
            } else if (nextIndex !== -1) {
              result[i] = result[nextIndex]
            }
            break
            
          case 'mean':
            // 均值填充
            const validValues = result.filter(v => !isNaN(v) && v !== null && v !== undefined)
            if (validValues.length > 0) {
              result[i] = validValues.reduce((sum, v) => sum + v, 0) / validValues.length
            }
            break
        }
      }
    }
    
    return result
  }

  /**
   * 查找前一个有效值的索引
   */
  private findPreviousValidIndex(values: number[], currentIndex: number): number {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (!isNaN(values[i]) && values[i] !== null && values[i] !== undefined) {
        return i
      }
    }
    return -1
  }

  /**
   * 查找下一个有效值的索引
   */
  private findNextValidIndex(values: number[], currentIndex: number): number {
    for (let i = currentIndex + 1; i < values.length; i++) {
      if (!isNaN(values[i]) && values[i] !== null && values[i] !== undefined) {
        return i
      }
    }
    return -1
  }

  /**
   * 异常值检测和处理
   */
  private removeOutliers(stockData: StockData, threshold: number = 3.0): StockData {
    const result = { ...stockData }
    
    // 检测价格异常值
    const priceOutliers = this.detectOutliers(stockData.prices, threshold)
    result.prices = this.handleOutliers(stockData.prices, priceOutliers)
    
    // 检测成交量异常值
    if (result.volumes && result.volumes.length > 0) {
      const volumeOutliers = this.detectOutliers(stockData.volumes!, threshold)
      result.volumes = this.handleOutliers(stockData.volumes!, volumeOutliers)
    }
    
    return result
  }

  /**
   * 异常值检测（基于Z-score）
   */
  private detectOutliers(values: number[], threshold: number): boolean[] {
    const validValues = values.filter(v => !isNaN(v) && v !== null && v !== undefined)
    
    if (validValues.length === 0) {
      return values.map(() => false)
    }
    
    const mean = validValues.reduce((sum, v) => sum + v, 0) / validValues.length
    const variance = validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / validValues.length
    const stdDev = Math.sqrt(variance)
    
    return values.map(value => {
      if (isNaN(value) || value === null || value === undefined) {
        return false
      }
      const zScore = Math.abs((value - mean) / stdDev)
      return zScore > threshold
    })
  }

  /**
   * 处理异常值
   */
  private handleOutliers(values: number[], outliers: boolean[]): number[] {
    const result = [...values]
    
    for (let i = 0; i < result.length; i++) {
      if (outliers[i]) {
        // 使用相邻值的平均值替换异常值
        const prevValue = i > 0 ? result[i - 1] : result[i]
        const nextValue = i < result.length - 1 ? result[i + 1] : result[i]
        result[i] = (prevValue + nextValue) / 2
      }
    }
    
    return result
  }

  /**
   * 股票分割调整
   */
  private adjustForSplits(stockData: StockData): StockData {
    // 简单的分割检测：价格突然下降超过50%
    const result = { ...stockData }
    const prices = [...stockData.prices]
    
    for (let i = 1; i < prices.length; i++) {
      const priceChange = (prices[i] - prices[i - 1]) / prices[i - 1]
      
      // 检测可能的股票分割（价格下降超过40%）
      if (priceChange < -0.4) {
        const splitRatio = prices[i - 1] / prices[i]
        
        // 调整分割前的所有价格
        for (let j = 0; j < i; j++) {
          prices[j] = prices[j] / splitRatio
        }
        
        // 调整其他价格数据
        if (result.highs) {
          for (let j = 0; j < i; j++) {
            result.highs[j] = result.highs[j] / splitRatio
          }
        }
        
        if (result.lows) {
          for (let j = 0; j < i; j++) {
            result.lows[j] = result.lows[j] / splitRatio
          }
        }
        
        if (result.opens) {
          for (let j = 0; j < i; j++) {
            result.opens[j] = result.opens[j] / splitRatio
          }
        }
        
        // 调整成交量
        if (result.volumes) {
          for (let j = 0; j < i; j++) {
            result.volumes[j] = result.volumes[j] * splitRatio
          }
        }
      }
    }
    
    result.prices = prices
    return result
  }

  /**
   * 数据标准化
   */
  private normalizeData(stockData: StockData): StockData {
    const result = { ...stockData }
    
    // 价格标准化（Z-score）
    result.prices = this.zScoreNormalize(stockData.prices)
    
    // 成交量标准化
    if (result.volumes && result.volumes.length > 0) {
      result.volumes = this.zScoreNormalize(stockData.volumes!)
    }
    
    return result
  }

  /**
   * Z-score标准化
   */
  private zScoreNormalize(values: number[]): number[] {
    const validValues = values.filter(v => !isNaN(v) && v !== null && v !== undefined)
    
    if (validValues.length === 0) {
      return values
    }
    
    const mean = validValues.reduce((sum, v) => sum + v, 0) / validValues.length
    const variance = validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / validValues.length
    const stdDev = Math.sqrt(variance)
    
    if (stdDev === 0) {
      return values.map(() => 0)
    }
    
    return values.map(value => {
      if (isNaN(value) || value === null || value === undefined) {
        return value
      }
      return (value - mean) / stdDev
    })
  }

  /**
   * 验证处理后的数据
   */
  private validateProcessedData(stockData: StockData, minDataPoints: number): void {
    if (stockData.prices.length < minDataPoints) {
      throw new Error(`数据点不足，需要至少 ${minDataPoints} 个数据点`)
    }
    
    const validPrices = stockData.prices.filter(p => !isNaN(p) && p > 0)
    if (validPrices.length < minDataPoints * 0.8) {
      throw new Error('有效价格数据不足')
    }
  }

  /**
   * 生成数据质量报告
   */
  generateQualityReport(stockData: StockData): DataQualityReport {
    const totalDataPoints = stockData.prices.length
    const missingDataPoints = stockData.prices.filter(p => isNaN(p) || p === null || p === undefined).length
    const outliers = this.detectOutliers(stockData.prices, 3.0)
    const outlierDataPoints = outliers.filter(o => o).length
    
    const recommendations: string[] = []
    
    if (missingDataPoints / totalDataPoints > 0.1) {
      recommendations.push('缺失数据较多，建议检查数据源')
    }
    
    if (outlierDataPoints / totalDataPoints > 0.05) {
      recommendations.push('异常值较多，建议进行异常值处理')
    }
    
    if (totalDataPoints < 100) {
      recommendations.push('数据点较少，可能影响分析结果的可靠性')
    }
    
    return {
      totalDataPoints,
      missingDataPoints,
      outlierDataPoints,
      missingRatio: missingDataPoints / totalDataPoints,
      outlierRatio: outlierDataPoints / totalDataPoints,
      dataRange: [stockData.dates[0], stockData.dates[stockData.dates.length - 1]],
      recommendations
    }
  }
}

export default DataPreprocessor
