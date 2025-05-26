/**
 * 机器学习策略
 * 基于机器学习模型的量化选股策略
 */

import type { StockData } from '@/types/stock'
import type { FeatureMatrix } from '@/services/featureEngineering/FeatureEngineManager'
import { BaseStrategy, type StrategyContext, type StrategyExecutionResult, type StrategySignal } from './BaseStrategy'

/**
 * 机器学习模型类型
 */
export type MLModelType = 
  | 'xgboost'
  | 'random_forest'
  | 'svm'
  | 'neural_network'
  | 'lightgbm'
  | 'linear_regression'

/**
 * 特征选择方法
 */
export type FeatureSelectionMethod = 
  | 'auto'
  | 'correlation'
  | 'mutual_info'
  | 'rfe'
  | 'lasso'
  | 'manual'

/**
 * 机器学习策略参数
 */
export interface MLStrategyParams {
  modelType: MLModelType
  featureSelection: FeatureSelectionMethod
  maxFeatures: number
  trainPeriod: number // 训练周期（天）
  retrainPeriod: number // 重新训练周期（天）
  predictionHorizon: number // 预测时间窗口（天）
  threshold: number // 预测阈值
  topN: number // 选择前N只股票
  maxPositions: number
  modelParams: Record<string, any>
  crossValidation: {
    enabled: boolean
    folds: number
    testSize: number
  }
}

/**
 * 模型预测结果
 */
export interface ModelPrediction {
  symbol: string
  prediction: number
  probability: number
  confidence: number
  features: Record<string, number>
  modelVersion: string
}

/**
 * 模型性能指标
 */
export interface ModelPerformance {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  auc: number
  sharpeRatio: number
  informationRatio: number
  lastTrainDate: string
  sampleCount: number
}

/**
 * 机器学习策略实现
 */
export class MLStrategy extends BaseStrategy {
  private params: MLStrategyParams
  private model: any = null
  private selectedFeatures: string[] = []
  private lastTrainDate: string | null = null
  private modelPerformance: ModelPerformance | null = null
  private predictions: Map<string, ModelPrediction> = new Map()

  constructor(config: any) {
    super(config)
    this.params = this.getDefaultParams()
    
    // 合并用户配置
    if (config.parameters) {
      this.params = { ...this.params, ...config.parameters }
    }
  }

  /**
   * 执行机器学习策略
   */
  async execute(
    marketData: Map<string, StockData>,
    featureMatrix?: Map<string, FeatureMatrix>
  ): Promise<StrategyExecutionResult> {
    console.log(`执行机器学习策略: ${this.config.name}`)

    if (!featureMatrix || featureMatrix.size === 0) {
      throw new Error('机器学习策略需要特征矩阵数据')
    }

    // 检查是否需要训练模型
    if (this.shouldRetrain()) {
      await this.trainModel(featureMatrix, marketData)
    }

    // 创建策略上下文
    const context: StrategyContext = {
      currentDate: new Date().toISOString().split('T')[0],
      marketData,
      featureMatrix,
      positions: new Map(),
      cash: 1000000,
      totalValue: 1000000,
      benchmark: marketData.values().next().value
    }

    // 生成交易信号
    const signals = await this.generateSignals(context)

    // 应用风险控制
    const filteredSignals = this.applyRiskControl(signals, context.positions, context.totalValue)

    // 更新持仓
    const positions = this.updatePositions(context.positions, filteredSignals, marketData)

    // 计算置信度
    const confidence = this.calculateConfidence(filteredSignals, marketData)

    // 保存执行结果
    const result: StrategyExecutionResult = {
      signals: filteredSignals,
      positions,
      cash: context.cash,
      totalValue: context.totalValue,
      confidence,
      metadata: {
        predictions: Array.from(this.predictions.values()),
        modelPerformance: this.modelPerformance,
        selectedFeatures: this.selectedFeatures,
        modelType: this.params.modelType
      }
    }

    this.executionHistory.push(result)
    return result
  }

  /**
   * 生成交易信号
   */
  async generateSignals(context: StrategyContext): Promise<StrategySignal[]> {
    const signals: StrategySignal[] = []

    if (!this.model) {
      console.warn('模型尚未训练，无法生成信号')
      return signals
    }

    // 生成预测
    const predictions = await this.generatePredictions(context.featureMatrix!)

    // 选择目标股票
    const targetStocks = this.selectTargetStocks(predictions)

    // 生成买入信号
    targetStocks.forEach(prediction => {
      const stockData = context.marketData.get(prediction.symbol)
      if (stockData) {
        const currentPrice = stockData.prices[stockData.prices.length - 1]
        const positionSize = context.totalValue / this.params.maxPositions
        const quantity = Math.floor(positionSize / currentPrice)

        if (quantity > 0) {
          signals.push({
            symbol: prediction.symbol,
            action: 'buy',
            strength: prediction.probability,
            confidence: prediction.confidence,
            price: currentPrice,
            quantity,
            reason: `ML预测: ${prediction.prediction.toFixed(3)}, 概率: ${(prediction.probability * 100).toFixed(1)}%`,
            timestamp: new Date().toISOString()
          })
        }
      }
    })

    // 生成卖出信号
    const targetSymbols = new Set(targetStocks.map(p => p.symbol))
    context.positions.forEach((position, symbol) => {
      if (!targetSymbols.has(symbol)) {
        const stockData = context.marketData.get(symbol)
        if (stockData) {
          signals.push({
            symbol,
            action: 'sell',
            strength: 0.8,
            confidence: 0.9,
            price: stockData.prices[stockData.prices.length - 1],
            quantity: position.quantity,
            reason: '模型预测不佳',
            timestamp: new Date().toISOString()
          })
        }
      }
    })

    return signals
  }

  /**
   * 训练模型
   */
  private async trainModel(
    featureMatrix: Map<string, FeatureMatrix>,
    marketData: Map<string, StockData>
  ): Promise<void> {
    console.log(`开始训练${this.params.modelType}模型...`)

    try {
      // 准备训练数据
      const { features, labels } = await this.prepareTrainingData(featureMatrix, marketData)

      if (features.length === 0) {
        throw new Error('训练数据为空')
      }

      // 特征选择
      this.selectedFeatures = await this.selectFeatures(features, labels)

      // 过滤特征
      const filteredFeatures = this.filterFeatures(features, this.selectedFeatures)

      // 训练模型（这里使用模拟实现）
      this.model = await this.trainMLModel(filteredFeatures, labels)

      // 评估模型性能
      this.modelPerformance = await this.evaluateModel(filteredFeatures, labels)

      this.lastTrainDate = new Date().toISOString().split('T')[0]

      console.log(`模型训练完成，准确率: ${(this.modelPerformance.accuracy * 100).toFixed(2)}%`)

    } catch (error) {
      console.error('模型训练失败:', error)
      throw error
    }
  }

  /**
   * 准备训练数据
   */
  private async prepareTrainingData(
    featureMatrix: Map<string, FeatureMatrix>,
    marketData: Map<string, StockData>
  ): Promise<{ features: number[][], labels: number[] }> {
    const features: number[][] = []
    const labels: number[] = []

    featureMatrix.forEach((matrix, symbol) => {
      const stockData = marketData.get(symbol)
      if (!stockData) return

      const prices = stockData.prices
      const dates = matrix.dates

      // 为每个时间点创建样本
      for (let i = this.params.trainPeriod; i < dates.length - this.params.predictionHorizon; i++) {
        const featureVector: number[] = []
        let hasValidFeatures = true

        // 提取特征
        Object.values(matrix.factors).forEach(factor => {
          const value = factor.values[i]
          if (isNaN(value)) {
            hasValidFeatures = false
          } else {
            featureVector.push(value)
          }
        })

        if (!hasValidFeatures || featureVector.length === 0) continue

        // 计算标签（未来收益率）
        const currentPrice = prices[i]
        const futurePrice = prices[i + this.params.predictionHorizon]
        
        if (currentPrice > 0 && futurePrice > 0) {
          const returnRate = (futurePrice - currentPrice) / currentPrice
          const label = returnRate > this.params.threshold ? 1 : 0

          features.push(featureVector)
          labels.push(label)
        }
      }
    })

    return { features, labels }
  }

  /**
   * 特征选择
   */
  private async selectFeatures(features: number[][], labels: number[]): Promise<string[]> {
    // 这里实现简化的特征选择逻辑
    // 实际应用中应该使用更复杂的特征选择算法

    const allFactorNames = ['momentum', 'rsi_divergence', 'volatility', 'volume_price_trend', 
                           'sma_cross', 'macd_signal', 'bollinger_position']

    switch (this.params.featureSelection) {
      case 'auto':
        // 自动选择前N个特征
        return allFactorNames.slice(0, this.params.maxFeatures)
      
      case 'correlation':
        // 基于相关性选择特征
        return this.selectByCorrelation(features, labels, allFactorNames)
      
      case 'manual':
        // 手动指定特征
        return this.params.modelParams.selectedFeatures || allFactorNames.slice(0, this.params.maxFeatures)
      
      default:
        return allFactorNames.slice(0, this.params.maxFeatures)
    }
  }

  /**
   * 基于相关性选择特征
   */
  private selectByCorrelation(features: number[][], labels: number[], factorNames: string[]): string[] {
    const correlations: { name: string, correlation: number }[] = []

    for (let i = 0; i < Math.min(features[0].length, factorNames.length); i++) {
      const featureValues = features.map(row => row[i])
      const correlation = this.calculateCorrelation(featureValues, labels)
      
      correlations.push({
        name: factorNames[i],
        correlation: Math.abs(correlation)
      })
    }

    // 按相关性排序，选择前N个
    correlations.sort((a, b) => b.correlation - a.correlation)
    return correlations.slice(0, this.params.maxFeatures).map(item => item.name)
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
   * 过滤特征
   */
  private filterFeatures(features: number[][], selectedFeatures: string[]): number[][] {
    // 简化实现：假设特征顺序与selectedFeatures一致
    return features.map(row => row.slice(0, selectedFeatures.length))
  }

  /**
   * 训练机器学习模型
   */
  private async trainMLModel(features: number[][], labels: number[]): Promise<any> {
    // 这里是模拟的模型训练实现
    // 实际应用中应该调用真实的机器学习库

    console.log(`训练${this.params.modelType}模型，样本数: ${features.length}`)

    // 模拟训练过程
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 返回模拟的模型对象
    return {
      type: this.params.modelType,
      features: this.selectedFeatures,
      trainedAt: new Date().toISOString(),
      predict: (input: number[]) => {
        // 简单的线性组合作为预测
        const prediction = input.reduce((sum, val, i) => sum + val * (0.1 + i * 0.05), 0)
        const probability = 1 / (1 + Math.exp(-prediction)) // sigmoid
        return { prediction, probability }
      }
    }
  }

  /**
   * 评估模型性能
   */
  private async evaluateModel(features: number[][], labels: number[]): Promise<ModelPerformance> {
    if (!this.model) {
      throw new Error('模型未训练')
    }

    // 简化的模型评估
    let correct = 0
    const predictions: number[] = []

    features.forEach((feature, i) => {
      const result = this.model.predict(feature)
      const predicted = result.probability > 0.5 ? 1 : 0
      predictions.push(predicted)
      
      if (predicted === labels[i]) {
        correct++
      }
    })

    const accuracy = correct / labels.length

    return {
      accuracy,
      precision: accuracy, // 简化
      recall: accuracy,
      f1Score: accuracy,
      auc: accuracy,
      sharpeRatio: accuracy * 2 - 1,
      informationRatio: accuracy * 1.5 - 0.5,
      lastTrainDate: new Date().toISOString().split('T')[0],
      sampleCount: features.length
    }
  }

  /**
   * 生成预测
   */
  private async generatePredictions(featureMatrix: Map<string, FeatureMatrix>): Promise<ModelPrediction[]> {
    const predictions: ModelPrediction[] = []
    this.predictions.clear()

    featureMatrix.forEach((matrix, symbol) => {
      const featureVector: number[] = []
      let hasValidFeatures = true

      // 提取最新特征值
      this.selectedFeatures.forEach(factorName => {
        const factor = matrix.factors[factorName]
        if (factor && factor.values.length > 0) {
          const latestValue = factor.values[factor.values.length - 1]
          if (!isNaN(latestValue)) {
            featureVector.push(latestValue)
          } else {
            hasValidFeatures = false
          }
        } else {
          hasValidFeatures = false
        }
      })

      if (hasValidFeatures && featureVector.length === this.selectedFeatures.length) {
        const result = this.model.predict(featureVector)
        
        const prediction: ModelPrediction = {
          symbol,
          prediction: result.prediction,
          probability: result.probability,
          confidence: Math.min(result.probability * 2, 1.0),
          features: this.selectedFeatures.reduce((obj, name, i) => {
            obj[name] = featureVector[i]
            return obj
          }, {} as Record<string, number>),
          modelVersion: this.model.trainedAt
        }

        predictions.push(prediction)
        this.predictions.set(symbol, prediction)
      }
    })

    return predictions
  }

  /**
   * 选择目标股票
   */
  private selectTargetStocks(predictions: ModelPrediction[]): ModelPrediction[] {
    return predictions
      .filter(p => p.probability > 0.5 && p.confidence > 0.6)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, Math.min(this.params.topN, this.params.maxPositions))
  }

  /**
   * 判断是否需要重新训练
   */
  private shouldRetrain(): boolean {
    if (!this.lastTrainDate || !this.model) return true

    const lastDate = new Date(this.lastTrainDate)
    const current = new Date()
    const daysDiff = Math.floor((current.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

    return daysDiff >= this.params.retrainPeriod
  }

  /**
   * 获取默认参数
   */
  private getDefaultParams(): MLStrategyParams {
    return {
      modelType: 'xgboost',
      featureSelection: 'auto',
      maxFeatures: 10,
      trainPeriod: 60,
      retrainPeriod: 30,
      predictionHorizon: 5,
      threshold: 0.02,
      topN: 10,
      maxPositions: 10,
      modelParams: {
        nEstimators: 100,
        maxDepth: 6,
        learningRate: 0.1
      },
      crossValidation: {
        enabled: true,
        folds: 5,
        testSize: 0.2
      }
    }
  }

  /**
   * 获取模型性能
   */
  getModelPerformance(): ModelPerformance | null {
    return this.modelPerformance
  }

  /**
   * 获取选择的特征
   */
  getSelectedFeatures(): string[] {
    return this.selectedFeatures
  }

  /**
   * 获取预测结果
   */
  getPredictions(): ModelPrediction[] {
    return Array.from(this.predictions.values())
  }

  /**
   * 强制重新训练模型
   */
  async forceRetrain(
    featureMatrix: Map<string, FeatureMatrix>,
    marketData: Map<string, StockData>
  ): Promise<void> {
    this.lastTrainDate = null
    await this.trainModel(featureMatrix, marketData)
  }
}

export default MLStrategy
