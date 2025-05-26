/**
 * 特征工程管理器
 * 统一管理技术指标、基本面、另类因子的计算和缓存
 */

import type { StockData } from '@/types/stock'
import { TechnicalFactorEngine } from './TechnicalFactorEngine'
import { FundamentalFactorEngine } from './FundamentalFactorEngine'
import { AlternativeFactorEngine } from './AlternativeFactorEngine'
import { DataPreprocessor } from './DataPreprocessor'

/**
 * 因子类型
 */
export type FactorType = 'technical' | 'fundamental' | 'alternative' | 'macro'

/**
 * 因子计算配置
 */
export interface FactorConfig {
  type: FactorType
  name: string
  params?: Record<string, any>
  enabled: boolean
  priority: number
  cacheExpiry?: number // 缓存过期时间（秒）
}

/**
 * 因子计算结果
 */
export interface FactorResult {
  factorName: string
  factorType: FactorType
  values: number[]
  dates: string[]
  metadata: {
    description: string
    category: string
    unit?: string
    range?: [number, number]
    lastUpdated: string
    dataSource: string
  }
}

/**
 * 特征矩阵
 */
export interface FeatureMatrix {
  symbol: string
  dates: string[]
  factors: Record<string, FactorResult>
  metadata: {
    totalFactors: number
    factorTypes: FactorType[]
    dataRange: [string, string]
    lastUpdated: string
    missingDataRatio: number
  }
}

/**
 * 特征工程管理器
 */
export class FeatureEngineManager {
  private technicalEngine: TechnicalFactorEngine
  private fundamentalEngine: FundamentalFactorEngine
  private alternativeEngine: AlternativeFactorEngine
  private dataPreprocessor: DataPreprocessor
  private factorCache: Map<string, FactorResult> = new Map()
  private configCache: Map<string, FactorConfig[]> = new Map()

  constructor() {
    this.technicalEngine = new TechnicalFactorEngine()
    this.fundamentalEngine = new FundamentalFactorEngine()
    this.alternativeEngine = new AlternativeFactorEngine()
    this.dataPreprocessor = new DataPreprocessor()
  }

  /**
   * 计算单个股票的所有因子
   */
  async calculateAllFactors(
    symbol: string,
    stockData: StockData,
    configs: FactorConfig[]
  ): Promise<FeatureMatrix> {
    try {
      console.log(`开始计算股票 ${symbol} 的特征因子`)

      // 数据预处理
      const preprocessedData = await this.dataPreprocessor.preprocess(stockData)

      // 按类型分组计算因子
      const technicalConfigs = configs.filter(c => c.type === 'technical' && c.enabled)
      const fundamentalConfigs = configs.filter(c => c.type === 'fundamental' && c.enabled)
      const alternativeConfigs = configs.filter(c => c.type === 'alternative' && c.enabled)

      // 并行计算各类因子
      const [technicalFactors, fundamentalFactors, alternativeFactors] = await Promise.all([
        this.calculateTechnicalFactors(symbol, preprocessedData, technicalConfigs),
        this.calculateFundamentalFactors(symbol, preprocessedData, fundamentalConfigs),
        this.calculateAlternativeFactors(symbol, preprocessedData, alternativeConfigs)
      ])

      // 合并所有因子
      const allFactors = {
        ...technicalFactors,
        ...fundamentalFactors,
        ...alternativeFactors
      }

      // 构建特征矩阵
      const featureMatrix: FeatureMatrix = {
        symbol,
        dates: preprocessedData.dates,
        factors: allFactors,
        metadata: {
          totalFactors: Object.keys(allFactors).length,
          factorTypes: [...new Set(configs.map(c => c.type))],
          dataRange: [
            preprocessedData.dates[0],
            preprocessedData.dates[preprocessedData.dates.length - 1]
          ],
          lastUpdated: new Date().toISOString(),
          missingDataRatio: this.calculateMissingDataRatio(allFactors)
        }
      }

      console.log(`股票 ${symbol} 特征计算完成，共 ${featureMatrix.metadata.totalFactors} 个因子`)
      return featureMatrix

    } catch (error) {
      console.error(`计算股票 ${symbol} 特征因子失败:`, error)
      throw error
    }
  }

  /**
   * 计算技术指标因子
   */
  private async calculateTechnicalFactors(
    symbol: string,
    stockData: StockData,
    configs: FactorConfig[]
  ): Promise<Record<string, FactorResult>> {
    const results: Record<string, FactorResult> = {}

    for (const config of configs) {
      try {
        const cacheKey = `${symbol}_${config.name}_${JSON.stringify(config.params)}`
        
        // 检查缓存
        if (this.factorCache.has(cacheKey)) {
          const cached = this.factorCache.get(cacheKey)!
          const cacheAge = Date.now() - new Date(cached.metadata.lastUpdated).getTime()
          
          if (cacheAge < (config.cacheExpiry || 3600) * 1000) {
            results[config.name] = cached
            continue
          }
        }

        // 计算因子
        const factorResult = await this.technicalEngine.calculateFactor(
          config.name,
          stockData,
          config.params || {}
        )

        // 缓存结果
        this.factorCache.set(cacheKey, factorResult)
        results[config.name] = factorResult

      } catch (error) {
        console.warn(`计算技术因子 ${config.name} 失败:`, error)
      }
    }

    return results
  }

  /**
   * 计算基本面因子
   */
  private async calculateFundamentalFactors(
    symbol: string,
    stockData: StockData,
    configs: FactorConfig[]
  ): Promise<Record<string, FactorResult>> {
    const results: Record<string, FactorResult> = {}

    for (const config of configs) {
      try {
        const cacheKey = `${symbol}_${config.name}_fundamental`
        
        // 检查缓存
        if (this.factorCache.has(cacheKey)) {
          const cached = this.factorCache.get(cacheKey)!
          const cacheAge = Date.now() - new Date(cached.metadata.lastUpdated).getTime()
          
          if (cacheAge < (config.cacheExpiry || 86400) * 1000) { // 基本面数据缓存1天
            results[config.name] = cached
            continue
          }
        }

        // 计算因子
        const factorResult = await this.fundamentalEngine.calculateFactor(
          config.name,
          symbol,
          stockData,
          config.params || {}
        )

        // 缓存结果
        this.factorCache.set(cacheKey, factorResult)
        results[config.name] = factorResult

      } catch (error) {
        console.warn(`计算基本面因子 ${config.name} 失败:`, error)
      }
    }

    return results
  }

  /**
   * 计算另类因子
   */
  private async calculateAlternativeFactors(
    symbol: string,
    stockData: StockData,
    configs: FactorConfig[]
  ): Promise<Record<string, FactorResult>> {
    const results: Record<string, FactorResult> = {}

    for (const config of configs) {
      try {
        const cacheKey = `${symbol}_${config.name}_alternative`
        
        // 检查缓存
        if (this.factorCache.has(cacheKey)) {
          const cached = this.factorCache.get(cacheKey)!
          const cacheAge = Date.now() - new Date(cached.metadata.lastUpdated).getTime()
          
          if (cacheAge < (config.cacheExpiry || 7200) * 1000) { // 另类数据缓存2小时
            results[config.name] = cached
            continue
          }
        }

        // 计算因子
        const factorResult = await this.alternativeEngine.calculateFactor(
          config.name,
          symbol,
          stockData,
          config.params || {}
        )

        // 缓存结果
        this.factorCache.set(cacheKey, factorResult)
        results[config.name] = factorResult

      } catch (error) {
        console.warn(`计算另类因子 ${config.name} 失败:`, error)
      }
    }

    return results
  }

  /**
   * 获取默认因子配置
   */
  getDefaultFactorConfigs(): FactorConfig[] {
    return [
      // 技术指标因子
      { type: 'technical', name: 'sma_cross', enabled: true, priority: 1 },
      { type: 'technical', name: 'rsi_divergence', enabled: true, priority: 2 },
      { type: 'technical', name: 'macd_signal', enabled: true, priority: 3 },
      { type: 'technical', name: 'bollinger_position', enabled: true, priority: 4 },
      { type: 'technical', name: 'volume_price_trend', enabled: true, priority: 5 },
      
      // 基本面因子
      { type: 'fundamental', name: 'roe_trend', enabled: true, priority: 6 },
      { type: 'fundamental', name: 'pe_relative', enabled: true, priority: 7 },
      { type: 'fundamental', name: 'debt_ratio', enabled: true, priority: 8 },
      { type: 'fundamental', name: 'revenue_growth', enabled: true, priority: 9 },
      { type: 'fundamental', name: 'profit_margin', enabled: true, priority: 10 },
      
      // 另类因子
      { type: 'alternative', name: 'sentiment_score', enabled: true, priority: 11 },
      { type: 'alternative', name: 'money_flow', enabled: true, priority: 12 },
      { type: 'alternative', name: 'correlation_factor', enabled: true, priority: 13 },
      { type: 'alternative', name: 'volatility_regime', enabled: true, priority: 14 },
    ]
  }

  /**
   * 计算缺失数据比例
   */
  private calculateMissingDataRatio(factors: Record<string, FactorResult>): number {
    if (Object.keys(factors).length === 0) return 1

    let totalValues = 0
    let missingValues = 0

    Object.values(factors).forEach(factor => {
      totalValues += factor.values.length
      missingValues += factor.values.filter(v => isNaN(v) || v === null || v === undefined).length
    })

    return totalValues > 0 ? missingValues / totalValues : 1
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.factorCache.clear()
    this.configCache.clear()
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.factorCache.size,
      hitRate: 0.85 // 模拟命中率，实际应该统计
    }
  }

  /**
   * 批量计算多个股票的因子
   */
  async calculateBatchFactors(
    symbols: string[],
    stockDataMap: Map<string, StockData>,
    configs: FactorConfig[]
  ): Promise<Map<string, FeatureMatrix>> {
    const results = new Map<string, FeatureMatrix>()
    
    // 并行计算，但限制并发数
    const concurrency = 5
    const batches = []
    
    for (let i = 0; i < symbols.length; i += concurrency) {
      batches.push(symbols.slice(i, i + concurrency))
    }
    
    for (const batch of batches) {
      const batchPromises = batch.map(async symbol => {
        const stockData = stockDataMap.get(symbol)
        if (stockData) {
          try {
            const featureMatrix = await this.calculateAllFactors(symbol, stockData, configs)
            results.set(symbol, featureMatrix)
          } catch (error) {
            console.error(`批量计算股票 ${symbol} 因子失败:`, error)
          }
        }
      })
      
      await Promise.all(batchPromises)
      
      // 批次间延迟，避免过载
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return results
  }
}

// 创建全局特征工程管理器实例
export const featureEngineManager = new FeatureEngineManager()

export default featureEngineManager
