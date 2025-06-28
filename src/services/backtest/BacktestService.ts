/**
 * 回测服务
 * 提供完整的回测功能，包括数据准备、策略执行、结果分析
 */

import axios from 'axios'
import { BacktestEngine } from './BacktestEngine'
import { StrategyManager } from '@/services/strategy/StrategyManager'
import { stockService } from '@/services/stockService'
import type { BacktestParams, BacktestResult, StrategyTemplate } from '@/types/backtest'
import type { StockData } from '@/types/stock'
import type { BaseStrategy } from '@/services/strategy/strategies/BaseStrategy'

export class BacktestService {
  private strategyManager: StrategyManager
  private backtestHistory: Map<string, BacktestResult> = new Map()

  constructor() {
    this.strategyManager = new StrategyManager()
  }

  /**
   * 运行回测
   */
  async runBacktest(params: BacktestParams): Promise<BacktestResult> {
    console.log('开始专业回测:', params)

    try {
      // 调用后端API进行专业回测
      const response = await axios.post('/api/backtest/run', params)

      if (response.data.success) {
        const result = response.data.data
        // 保存到本地缓存
        this.backtestHistory.set(result.id, result)
        console.log('专业回测完成:', result.id)
        return result
      } else {
        throw new Error(response.data.message || '回测失败')
      }
    } catch (error: any) {
      console.error('专业回测失败:', error)

      // 如果后端失败，尝试使用本地回测引擎
      if (error.response?.status === 500 || error.code === 'NETWORK_ERROR') {
        console.log('后端回测失败，使用本地回测引擎')
        return this.runLocalBacktest(params)
      }

      throw new Error(`回测失败: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * 本地回测（备用方案）
   */
  private async runLocalBacktest(params: BacktestParams): Promise<BacktestResult> {
    try {
      // 1. 验证参数
      this.validateParams(params)

      // 2. 获取历史数据
      const historicalData = await this.getHistoricalData(params)

      // 3. 创建策略实例
      const strategy = await this.createStrategy(params)

      // 4. 创建回测引擎
      const engine = new BacktestEngine(strategy, params)

      // 5. 运行回测
      const result = await engine.runBacktest(historicalData)

      // 6. 保存回测结果
      this.backtestHistory.set(result.id, result)

      console.log('本地回测完成:', result.id)
      return result
    } catch (error: any) {
      console.error('本地回测失败:', error)
      throw new Error(`本地回测失败: ${error.message}`)
    }
  }

  /**
   * 批量回测（参数优化）
   */
  async runBatchBacktest(
    baseParams: BacktestParams,
    parameterGrid: Record<string, any[]>
  ): Promise<BacktestResult[]> {
    console.log('开始批量回测:', baseParams, parameterGrid)

    try {
      // 调用后端API进行批量回测
      const response = await axios.post('/api/backtest/batch', {
        baseParams,
        parameterGrid,
      })

      if (response.data.success) {
        const results = response.data.data
        // 保存到本地缓存
        results.forEach((result: BacktestResult) => {
          this.backtestHistory.set(result.id, result)
        })
        console.log(`批量回测完成，共 ${results.length} 个结果`)
        return results
      } else {
        throw new Error(response.data.message || '批量回测失败')
      }
    } catch (error: any) {
      console.error('批量回测失败:', error)

      // 如果后端失败，使用本地批量回测
      if (error.response?.status === 500 || error.code === 'NETWORK_ERROR') {
        console.log('后端批量回测失败，使用本地批量回测')
        return this.runLocalBatchBacktest(baseParams, parameterGrid)
      }

      throw new Error(`批量回测失败: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * 本地批量回测（备用方案）
   */
  private async runLocalBatchBacktest(
    baseParams: BacktestParams,
    parameterGrid: Record<string, any[]>
  ): Promise<BacktestResult[]> {
    const results: BacktestResult[] = []
    const paramCombinations = this.generateParameterCombinations(parameterGrid)

    console.log(`开始本地批量回测，共 ${paramCombinations.length} 个参数组合`)

    for (let i = 0; i < paramCombinations.length; i++) {
      const paramSet = paramCombinations[i]
      const testParams = {
        ...baseParams,
        strategyParams: { ...baseParams.strategyParams, ...paramSet },
      }

      try {
        const result = await this.runLocalBacktest(testParams)
        results.push(result)
        console.log(`完成第 ${i + 1}/${paramCombinations.length} 个回测`)
      } catch (error) {
        console.warn(`参数组合 ${i + 1} 回测失败:`, error)
      }
    }

    return results
  }

  /**
   * 获取历史数据
   */
  private async getHistoricalData(params: BacktestParams): Promise<Map<string, StockData[]>> {
    const historicalData = new Map<string, StockData[]>()

    // 如果是单股回测
    if (params.symbol) {
      const data = await this.getStockHistoricalData(
        params.symbol,
        params.customStartDate!,
        params.customEndDate!
      )
      historicalData.set(params.symbol, data)
    }

    // 如果是多股回测（从策略参数中获取股票池）
    if (params.strategyParams?.symbols) {
      for (const symbol of params.strategyParams.symbols) {
        const data = await this.getStockHistoricalData(
          symbol,
          params.customStartDate!,
          params.customEndDate!
        )
        historicalData.set(symbol, data)
      }
    }

    return historicalData
  }

  /**
   * 获取单只股票的历史数据
   */
  private async getStockHistoricalData(
    symbol: string,
    startDate: string,
    endDate: string
  ): Promise<StockData[]> {
    try {
      // 尝试从服务获取真实历史数据
      const response = await stockService.getStockHistory(symbol, startDate, endDate)

      if (response && response.length > 0) {
        return response.map((item) => ({
          symbol,
          date: item.date,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
          amount: item.amount,
        }))
      }
    } catch (error) {
      console.warn(`获取 ${symbol} 历史数据失败:`, error)
    }

    // 如果获取真实数据失败，抛出错误而不是生成模拟数据
    throw new Error(`无法获取股票${symbol}的历史数据，所有数据源均不可用`)
  }

  /**
   * 获取真实历史数据
   * 模拟数据生成函数已移除
   */
  private async getRealHistoricalData(
    symbol: string,
    startDate: string,
    endDate: string
  ): Promise<StockData[]> {
    try {
      // 调用真实的历史数据API
      const response = await fetch(`/api/historical/${symbol}?start=${startDate}&end=${endDate}`)

      if (!response.ok) {
        throw new Error(`获取历史数据失败: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || '获取历史数据失败')
      }

      return data.data
    } catch (error) {
      console.error('获取历史数据失败:', error)
      throw new Error(`无法获取股票${symbol}的历史数据，请检查数据源配置`)
    }
  }

  /**
   * 创建策略实例
   */
  private async createStrategy(params: BacktestParams): Promise<BaseStrategy> {
    return await this.strategyManager.createStrategy(params.strategyType, params.strategyParams)
  }

  /**
   * 验证回测参数
   */
  private validateParams(params: BacktestParams): void {
    if (!params.symbol && !params.strategyParams?.symbols) {
      throw new Error('必须指定股票代码或股票池')
    }

    if (!params.customStartDate || !params.customEndDate) {
      throw new Error('必须指定开始和结束日期')
    }

    if (new Date(params.customStartDate) >= new Date(params.customEndDate)) {
      throw new Error('开始日期必须早于结束日期')
    }

    if (params.initialCapital <= 0) {
      throw new Error('初始资金必须大于0')
    }
  }

  /**
   * 生成参数组合
   */
  private generateParameterCombinations(
    parameterGrid: Record<string, any[]>
  ): Record<string, any>[] {
    const keys = Object.keys(parameterGrid)
    const combinations: Record<string, any>[] = []

    const generate = (index: number, current: Record<string, any>) => {
      if (index === keys.length) {
        combinations.push({ ...current })
        return
      }

      const key = keys[index]
      const values = parameterGrid[key]

      for (const value of values) {
        current[key] = value
        generate(index + 1, current)
      }
    }

    generate(0, {})
    return combinations
  }

  /**
   * 获取回测历史
   */
  getBacktestHistory(): BacktestResult[] {
    return Array.from(this.backtestHistory.values())
  }

  /**
   * 获取指定回测结果
   */
  getBacktestResult(id: string): BacktestResult | undefined {
    return this.backtestHistory.get(id)
  }

  /**
   * 删除回测结果
   */
  deleteBacktestResult(id: string): boolean {
    return this.backtestHistory.delete(id)
  }

  /**
   * 比较多个回测结果
   */
  compareBacktestResults(ids: string[]): {
    results: BacktestResult[]
    comparison: {
      bestReturn: BacktestResult
      bestSharpe: BacktestResult
      lowestDrawdown: BacktestResult
      highestWinRate: BacktestResult
    }
  } {
    const results = ids
      .map((id) => this.backtestHistory.get(id))
      .filter(Boolean) as BacktestResult[]

    if (results.length === 0) {
      throw new Error('没有找到有效的回测结果')
    }

    const comparison = {
      bestReturn: results.reduce((best, current) =>
        current.performance.totalReturn > best.performance.totalReturn ? current : best
      ),
      bestSharpe: results.reduce((best, current) =>
        current.performance.sharpeRatio > best.performance.sharpeRatio ? current : best
      ),
      lowestDrawdown: results.reduce((best, current) =>
        current.performance.maxDrawdown < best.performance.maxDrawdown ? current : best
      ),
      highestWinRate: results.reduce((best, current) =>
        current.performance.winRate > best.performance.winRate ? current : best
      ),
    }

    return { results, comparison }
  }

  /**
   * 获取策略模板
   */
  getStrategyTemplates(): StrategyTemplate[] {
    return [
      {
        id: 'ma_crossover',
        name: '均线交叉策略',
        description: '基于短期和长期移动平均线交叉的趋势跟踪策略',
        type: 'technical',
        defaultParams: {
          shortPeriod: 5,
          longPeriod: 20,
          stopLoss: 0.05,
          takeProfit: 0.15,
        },
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rsi_reversal',
        name: 'RSI反转策略',
        description: '基于RSI指标的均值回归策略',
        type: 'technical',
        defaultParams: {
          rsiPeriod: 14,
          oversoldLevel: 30,
          overboughtLevel: 70,
          stopLoss: 0.03,
          takeProfit: 0.08,
        },
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'bollinger_breakout',
        name: '布林带突破策略',
        description: '基于布林带的突破策略',
        type: 'technical',
        defaultParams: {
          period: 20,
          stdDev: 2,
          stopLoss: 0.04,
          takeProfit: 0.12,
        },
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
  }
}

// 导出单例实例
export const backtestService = new BacktestService()
