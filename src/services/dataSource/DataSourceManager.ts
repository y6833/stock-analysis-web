/**
 * 数据源管理器
 * 负责管理多个数据源，实现故障切换和负载均衡
 */

import type DataSourceInterface from './DataSourceInterface'
import { TushareDataSource } from './TushareDataSource'
import { AKShareDataSource } from './AKShareDataSource'
import { SinaDataSource } from './SinaDataSource'
import { EastMoneyDataSource } from './EastMoneyDataSource'
import { ZhituDataSource } from './ZhituDataSource'
import { YahooFinanceDataSource } from './YahooFinanceDataSource'
import { GoogleFinanceDataSource } from './GoogleFinanceDataSource'
import { JuheDataSource } from './JuheDataSource'
import type { DataSourceType } from './DataSourceFactory'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'

/**
 * 数据源健康状态
 */
interface DataSourceHealth {
  isHealthy: boolean
  lastCheckTime: number
  errorCount: number
  lastError?: string
  responseTime: number
}

/**
 * 数据源配置
 */
interface DataSourceConfig {
  type: DataSourceType
  priority: number // 优先级，数字越小优先级越高
  enabled: boolean
  maxRetries: number
  timeout: number
  healthCheckInterval: number // 健康检查间隔（毫秒）
}

/**
 * 数据源管理器
 */
export class DataSourceManager {
  private dataSources: Map<DataSourceType, DataSourceInterface> = new Map()
  private healthStatus: Map<DataSourceType, DataSourceHealth> = new Map()
  private configs: Map<DataSourceType, DataSourceConfig> = new Map()
  private healthCheckTimers: Map<DataSourceType, NodeJS.Timeout> = new Map()

  constructor() {
    this.initializeDataSources()
    this.initializeConfigs()
    this.startHealthChecks()
  }

  /**
   * 初始化数据源
   */
  private initializeDataSources() {
    this.dataSources.set('tushare', new TushareDataSource())
    this.dataSources.set('akshare', new AKShareDataSource())
    this.dataSources.set('sina', new SinaDataSource())
    this.dataSources.set('eastmoney', new EastMoneyDataSource())
    this.dataSources.set('zhitu', new ZhituDataSource())
    this.dataSources.set('yahoo_finance', new YahooFinanceDataSource())
    this.dataSources.set('google_finance', new GoogleFinanceDataSource())
    this.dataSources.set('juhe', new JuheDataSource())
  }

  /**
   * 初始化数据源配置
   */
  private initializeConfigs() {
    const defaultConfigs: DataSourceConfig[] = [
      {
        type: 'zhitu',
        priority: 1,
        enabled: true,
        maxRetries: 3,
        timeout: 10000,
        healthCheckInterval: 60000, // 1分钟
      },
      {
        type: 'tushare',
        priority: 2,
        enabled: true,
        maxRetries: 3,
        timeout: 10000,
        healthCheckInterval: 60000,
      },
      {
        type: 'yahoo_finance',
        priority: 3,
        enabled: true,
        maxRetries: 3,
        timeout: 12000,
        healthCheckInterval: 60000,
      },
      {
        type: 'eastmoney',
        priority: 4,
        enabled: true,
        maxRetries: 2,
        timeout: 8000,
        healthCheckInterval: 30000,
      },
      {
        type: 'akshare',
        priority: 5,
        enabled: true,
        maxRetries: 3,
        timeout: 15000,
        healthCheckInterval: 60000,
      },
      {
        type: 'google_finance',
        priority: 6,
        enabled: true,
        maxRetries: 2,
        timeout: 10000,
        healthCheckInterval: 45000,
      },
      {
        type: 'sina',
        priority: 7,
        enabled: true,
        maxRetries: 2,
        timeout: 8000,
        healthCheckInterval: 30000, // 30秒
      },
      {
        type: 'juhe',
        priority: 8,
        enabled: true,
        maxRetries: 2,
        timeout: 8000,
        healthCheckInterval: 30000,
      },
    ]

    defaultConfigs.forEach((config) => {
      this.configs.set(config.type, config)
      this.healthStatus.set(config.type, {
        isHealthy: true,
        lastCheckTime: 0,
        errorCount: 0,
        responseTime: 0,
      })
    })
  }

  /**
   * 启动健康检查
   */
  private startHealthChecks() {
    this.configs.forEach((config, sourceType) => {
      if (config.enabled) {
        const timer = setInterval(() => {
          this.performHealthCheck(sourceType)
        }, config.healthCheckInterval)

        this.healthCheckTimers.set(sourceType, timer)

        // 立即执行一次健康检查
        this.performHealthCheck(sourceType)
      }
    })
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(sourceType: DataSourceType) {
    const source = this.dataSources.get(sourceType)
    const health = this.healthStatus.get(sourceType)

    if (!source || !health) return

    const startTime = Date.now()

    try {
      // 执行简单的健康检查（获取股票列表的前几条）
      await Promise.race([
        source.getStocks().then((stocks) => stocks.slice(0, 5)),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        ),
      ])

      const responseTime = Date.now() - startTime

      // 更新健康状态
      health.isHealthy = true
      health.lastCheckTime = Date.now()
      health.responseTime = responseTime
      health.errorCount = Math.max(0, health.errorCount - 1) // 成功时减少错误计数

      console.log(`数据源 ${sourceType} 健康检查通过，响应时间: ${responseTime}ms`)
    } catch (error) {
      health.isHealthy = false
      health.lastCheckTime = Date.now()
      health.errorCount += 1
      health.lastError = error instanceof Error ? error.message : String(error)

      console.warn(`数据源 ${sourceType} 健康检查失败:`, error)

      // 如果错误次数过多，暂时禁用该数据源
      if (health.errorCount >= 5) {
        const config = this.configs.get(sourceType)
        if (config) {
          config.enabled = false
          console.error(`数据源 ${sourceType} 因连续失败被暂时禁用`)
        }
      }
    }
  }

  /**
   * 获取可用的数据源列表（按优先级排序）
   */
  private getAvailableDataSources(preferredSource?: DataSourceType): DataSourceType[] {
    const availableSources: Array<{ type: DataSourceType; priority: number }> = []

    this.configs.forEach((config, sourceType) => {
      const health = this.healthStatus.get(sourceType)

      if (config.enabled && health?.isHealthy) {
        availableSources.push({
          type: sourceType,
          priority: preferredSource === sourceType ? -1 : config.priority, // 首选数据源优先级最高
        })
      }
    })

    // 按优先级排序
    availableSources.sort((a, b) => a.priority - b.priority)

    return availableSources.map((item) => item.type)
  }

  /**
   * 使用故障切换机制获取数据
   */
  async getDataWithFallback<T>(
    operation: (source: DataSourceInterface) => Promise<T>,
    preferredSource?: DataSourceType,
    operationName = 'unknown'
  ): Promise<T> {
    const availableSources = this.getAvailableDataSources(preferredSource)

    if (availableSources.length === 0) {
      throw new Error('没有可用的数据源')
    }

    let lastError: Error | null = null

    for (const sourceType of availableSources) {
      const source = this.dataSources.get(sourceType)
      const config = this.configs.get(sourceType)

      if (!source || !config) continue

      try {
        console.log(`尝试使用数据源 ${sourceType} 执行操作: ${operationName}`)

        const result = await Promise.race([
          operation(source),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`操作超时: ${config.timeout}ms`)), config.timeout)
          ),
        ])

        this.recordSuccess(sourceType, operationName)
        console.log(`数据源 ${sourceType} 成功完成操作: ${operationName}`)

        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        this.recordFailure(sourceType, lastError, operationName)
        console.warn(`数据源 ${sourceType} 操作失败: ${operationName}`, error)
        continue
      }
    }

    throw new Error(`所有数据源都无法完成操作 ${operationName}: ${lastError?.message}`)
  }

  /**
   * 记录成功操作
   */
  private recordSuccess(sourceType: DataSourceType, operationName: string) {
    const health = this.healthStatus.get(sourceType)
    if (health) {
      health.errorCount = Math.max(0, health.errorCount - 1)
    }
  }

  /**
   * 记录失败操作
   */
  private recordFailure(sourceType: DataSourceType, error: Error, operationName: string) {
    const health = this.healthStatus.get(sourceType)
    if (health) {
      health.errorCount += 1
      health.lastError = `${operationName}: ${error.message}`

      // 如果错误过多，标记为不健康
      if (health.errorCount >= 3) {
        health.isHealthy = false
      }
    }
  }

  /**
   * 获取股票列表
   */
  async getStocks(preferredSource?: DataSourceType): Promise<Stock[]> {
    return this.getDataWithFallback((source) => source.getStocks(), preferredSource, 'getStocks')
  }

  /**
   * 获取股票数据
   */
  async getStockData(symbol: string, preferredSource?: DataSourceType): Promise<StockData> {
    return this.getDataWithFallback(
      (source) => source.getStockData(symbol),
      preferredSource,
      `getStockData:${symbol}`
    )
  }

  /**
   * 搜索股票
   */
  async searchStocks(query: string, preferredSource?: DataSourceType): Promise<Stock[]> {
    return this.getDataWithFallback(
      (source) => source.searchStocks(query),
      preferredSource,
      `searchStocks:${query}`
    )
  }

  /**
   * 获取股票行情
   */
  async getStockQuote(symbol: string, preferredSource?: DataSourceType): Promise<StockQuote> {
    return this.getDataWithFallback(
      (source) => source.getStockQuote(symbol),
      preferredSource,
      `getStockQuote:${symbol}`
    )
  }

  /**
   * 获取财经新闻
   */
  async getFinancialNews(count = 20, preferredSource?: DataSourceType): Promise<FinancialNews[]> {
    return this.getDataWithFallback(
      (source) => source.getFinancialNews(count),
      preferredSource,
      'getFinancialNews'
    )
  }

  /**
   * 获取数据源健康状态
   */
  getHealthStatus(): Map<DataSourceType, DataSourceHealth> {
    return new Map(this.healthStatus)
  }

  /**
   * 手动启用/禁用数据源
   */
  setDataSourceEnabled(sourceType: DataSourceType, enabled: boolean) {
    const config = this.configs.get(sourceType)
    if (config) {
      config.enabled = enabled

      if (enabled) {
        // 重新启动健康检查
        this.performHealthCheck(sourceType)
      }
    }
  }

  /**
   * 销毁管理器，清理定时器
   */
  destroy() {
    this.healthCheckTimers.forEach((timer) => clearInterval(timer))
    this.healthCheckTimers.clear()
  }
}

// 创建全局数据源管理器实例
export const dataSourceManager = new DataSourceManager()

export default dataSourceManager
