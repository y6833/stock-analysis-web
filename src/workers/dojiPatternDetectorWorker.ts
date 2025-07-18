/**
 * 十字星形态检测 Web Worker
 * 用于在后台线程计算十字星形态，避免阻塞主线程
 */

import { DojiConfig, DojiPattern, DojiType } from '../types/technical-analysis/doji'
import { KLineData, TrendType } from '../types/technical-analysis/kline'

/**
 * 十字星形态检测器 - Worker 版本
 * 基于原始 DojiPatternDetector 实现，但针对 Web Worker 环境优化
 */
class DojiPatternDetectorWorker {
    /**
     * 配置参数
     */
    private config: DojiConfig

    /**
     * 默认配置
     */
    private static readonly DEFAULT_CONFIG: DojiConfig = {
        bodyThreshold: 0.1, // 实体与影线比例阈值
        equalPriceThreshold: 0.1, // 开盘收盘价相等的容差（百分比）
        longLegThreshold: 2.0, // 长腿十字星的影线长度阈值
    }

    /**
     * 构造函数
     * @param config 可选的配置参数
     */
    constructor(config?: Partial<DojiConfig>) {
        this.config = {
            ...DojiPatternDetectorWorker.DEFAULT_CONFIG,
            ...config,
        }
    }

    /**
     * 检测K线数据中的十字星形态
     * @param klines K线数据数组
     * @returns 检测到的十字星形态数组
     */
    public detectPatterns(klines: KLineData[]): DojiPattern[] {
        if (!klines || klines.length === 0) {
            return []
        }

        const patterns: DojiPattern[] = []

        // 计算平均成交量（用于成交量变化计算）
        const avgVolume = this.calculateAverageVolume(klines)

        // 遍历K线数据
        for (let i = 0; i < klines.length; i++) {
            const candle = klines[i]
            let dojiType: DojiType | null = null

            // 检测各种十字星形态
            if (this.detectLongLeggedDoji(candle)) {
                dojiType = 'longLegged'
            } else if (this.detectDragonfly(candle)) {
                dojiType = 'dragonfly'
            } else if (this.detectGravestone(candle)) {
                dojiType = 'gravestone'
            } else if (this.detectStandardDoji(candle)) {
                dojiType = 'standard'
            }

            // 如果检测到十字星形态
            if (dojiType) {
                // 计算趋势（需要前面的K线数据）
                const trend = this.determineTrend(klines, i)

                // 计算成交量变化
                const volumeChange = candle.volume / avgVolume - 1

                // 计算形态显著性
                const significance = this.calculateSignificance(candle, dojiType)

                // 创建十字星形态对象
                const pattern: DojiPattern = {
                    id: `${candle.timestamp}-${dojiType}`,
                    stockId: '', // 需要外部设置
                    stockName: '', // 需要外部设置
                    timestamp: candle.timestamp,
                    type: dojiType,
                    candle: {
                        open: candle.open,
                        high: candle.high,
                        low: candle.low,
                        close: candle.close,
                        volume: candle.volume,
                    },
                    significance,
                    context: {
                        trend,
                        nearSupportResistance: false, // 需要外部分析支撑阻力位
                        volumeChange,
                    },
                }

                patterns.push(pattern)
            }
        }

        return patterns
    }

    /**
     * 检测标准十字星
     * @param candle K线数据
     * @returns 是否为标准十字星
     */
    public detectStandardDoji(candle: KLineData): boolean {
        // 检查开盘价和收盘价是否相等（在容差范围内）
        if (!this.isPriceEqual(candle.open, candle.close)) {
            return false
        }

        // 确保有上下影线
        const hasUpperShadow = candle.high > candle.open
        const hasLowerShadow = candle.low < candle.open

        // 标准十字星应该有上下影线
        return hasUpperShadow && hasLowerShadow
    }

    /**
     * 检测蜻蜓十字星
     * @param candle K线数据
     * @returns 是否为蜻蜓十字星
     */
    public detectDragonfly(candle: KLineData): boolean {
        // 检查开盘价和收盘价是否相等（在容差范围内）
        if (!this.isPriceEqual(candle.open, candle.close)) {
            return false
        }

        // 蜻蜓十字星的特点是：
        // 1. 开盘价和收盘价接近最高价
        // 2. 有较长的下影线
        const upperShadow = candle.high - Math.max(candle.open, candle.close)
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low
        const bodySize = Math.abs(candle.close - candle.open)
        const totalRange = candle.high - candle.low

        // 上影线应该很小或不存在
        const hasMinimalUpperShadow = upperShadow <= totalRange * 0.1

        // 下影线应该明显，至少占总长度的60%
        const hasSignificantLowerShadow = lowerShadow >= totalRange * 0.6

        // 确保实体位于K线上部
        const bodyPosition = (Math.min(candle.open, candle.close) - candle.low) / totalRange
        const isBodyNearTop = bodyPosition >= 0.7

        return hasMinimalUpperShadow && hasSignificantLowerShadow && isBodyNearTop
    }

    /**
     * 检测墓碑十字星
     * @param candle K线数据
     * @returns 是否为墓碑十字星
     */
    public detectGravestone(candle: KLineData): boolean {
        // 检查开盘价和收盘价是否相等（在容差范围内）
        if (!this.isPriceEqual(candle.open, candle.close)) {
            return false
        }

        // 墓碑十字星的特点是：
        // 1. 开盘价和收盘价接近最低价
        // 2. 有较长的上影线
        const upperShadow = candle.high - Math.max(candle.open, candle.close)
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low
        const totalRange = candle.high - candle.low

        // 下影线应该很小或不存在
        const hasMinimalLowerShadow = lowerShadow <= totalRange * 0.1

        // 上影线应该明显，至少占总长度的60%
        const hasSignificantUpperShadow = upperShadow >= totalRange * 0.6

        // 确保实体位于K线下部
        const bodyPosition = (Math.min(candle.open, candle.close) - candle.low) / totalRange
        const isBodyNearBottom = bodyPosition <= 0.3

        return hasMinimalLowerShadow && hasSignificantUpperShadow && isBodyNearBottom
    }

    /**
     * 检测长腿十字星
     * @param candle K线数据
     * @returns 是否为长腿十字星
     */
    public detectLongLeggedDoji(candle: KLineData): boolean {
        // 检查开盘价和收盘价是否相等（在容差范围内）
        if (!this.isPriceEqual(candle.open, candle.close)) {
            return false
        }

        // 长腿十字星的特点是上下影线都很长
        const upperShadow = candle.high - Math.max(candle.open, candle.close)
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low
        const bodySize = Math.abs(candle.close - candle.open)

        // 上下影线都应该明显长于实体
        const hasLongUpperShadow = upperShadow > bodySize * this.config.longLegThreshold
        const hasLongLowerShadow = lowerShadow > bodySize * this.config.longLegThreshold

        return hasLongUpperShadow && hasLongLowerShadow
    }

    /**
     * 判断两个价格是否相等（在容差范围内）
     * @param price1 价格1
     * @param price2 价格2
     * @returns 是否相等
     */
    private isPriceEqual(price1: number, price2: number): boolean {
        if (price1 === price2) {
            return true
        }

        // 计算价格差异百分比
        const avgPrice = (price1 + price2) / 2
        const diffPercent = Math.abs(price1 - price2) / avgPrice * 100

        // 如果差异百分比小于等于容差阈值，则认为价格相等
        return diffPercent <= this.config.equalPriceThreshold
    }

    /**
     * 计算实体大小
     * @param candle K线数据
     * @returns 实体大小
     */
    private calculateBodySize(candle: KLineData): number {
        return Math.abs(candle.close - candle.open)
    }

    /**
     * 计算影线比例
     * @param candle K线数据
     * @returns 影线比例
     */
    private calculateShadowRatio(candle: KLineData): number {
        const bodySize = this.calculateBodySize(candle)
        if (bodySize === 0) {
            return Infinity // 避免除以零
        }

        const upperShadow = candle.high - Math.max(candle.open, candle.close)
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low
        const totalShadow = upperShadow + lowerShadow

        return totalShadow / bodySize
    }

    /**
     * 计算平均成交量
     * @param klines K线数据数组
     * @returns 平均成交量
     */
    private calculateAverageVolume(klines: KLineData[]): number {
        if (klines.length === 0) {
            return 0
        }

        const sum = klines.reduce((acc, candle) => acc + candle.volume, 0)
        return sum / klines.length
    }

    /**
     * 确定趋势
     * @param klines K线数据数组
     * @param currentIndex 当前K线索引
     * @param lookbackPeriod 回溯周期（默认为5）
     * @returns 趋势类型
     */
    private determineTrend(klines: KLineData[], currentIndex: number, lookbackPeriod: number = 5): TrendType {
        if (currentIndex < lookbackPeriod) {
            return 'sideways' // 数据不足，默认为盘整
        }

        // 获取前N个收盘价
        const closePrices = []
        for (let i = currentIndex - lookbackPeriod; i < currentIndex; i++) {
            closePrices.push(klines[i].close)
        }

        // 计算简单的趋势（基于第一个和最后一个收盘价）
        const firstClose = closePrices[0]
        const lastClose = closePrices[closePrices.length - 1]
        const priceChange = (lastClose - firstClose) / firstClose * 100

        // 根据价格变化确定趋势
        if (priceChange > 3) {
            return 'uptrend'
        } else if (priceChange < -3) {
            return 'downtrend'
        } else {
            return 'sideways'
        }
    }

    /**
     * 计算形态显著性
     * @param candle K线数据
     * @param type 十字星类型
     * @returns 显著性（0-1）
     */
    private calculateSignificance(candle: KLineData, type: DojiType): number {
        let significance = 0

        // 基础显著性：开盘价和收盘价的接近程度
        const priceEqualityScore = 1 - Math.abs(candle.open - candle.close) / ((candle.open + candle.close) / 2) * 100
        significance += priceEqualityScore * 0.4 // 权重40%

        // 根据不同类型计算额外显著性
        switch (type) {
            case 'standard':
                // 标准十字星：上下影线平衡度
                const upperShadow = candle.high - Math.max(candle.open, candle.close)
                const lowerShadow = Math.min(candle.open, candle.close) - candle.low
                const shadowBalance = 1 - Math.abs(upperShadow - lowerShadow) / (upperShadow + lowerShadow)
                significance += shadowBalance * 0.6 // 权重60%
                break

            case 'dragonfly':
                // 蜻蜓十字星：下影线长度与K线总长度的比例
                const dragonflyRatio = (Math.min(candle.open, candle.close) - candle.low) / (candle.high - candle.low)
                significance += dragonflyRatio * 0.6 // 权重60%
                break

            case 'gravestone':
                // 墓碑十字星：上影线长度与K线总长度的比例
                const gravestoneRatio = (candle.high - Math.max(candle.open, candle.close)) / (candle.high - candle.low)
                significance += gravestoneRatio * 0.6 // 权重60%
                break

            case 'longLegged':
                // 长腿十字星：影线总长度与K线总长度的比例
                const shadowRatio = this.calculateShadowRatio(candle)
                const normalizedRatio = Math.min(shadowRatio / 10, 1) // 标准化，最大为1
                significance += normalizedRatio * 0.6 // 权重60%
                break
        }

        // 确保显著性在0-1范围内
        return Math.max(0, Math.min(1, significance))
    }
}

// 创建检测器实例
const detector = new DojiPatternDetectorWorker()

// 增量计算缓存
let cachedResults: Map<string, DojiPattern[]> = new Map()
let cachedKlines: Map<string, KLineData[]> = new Map()

// 监听消息
self.addEventListener('message', (e) => {
    const { type, data } = e.data

    switch (type) {
        case 'detect': {
            const { klines, stockId, stockName, config, useCache = true } = data

            // 生成缓存键
            const cacheKey = stockId || 'default'

            // 增量计算逻辑
            let patterns: DojiPattern[] = []

            if (useCache && cachedResults.has(cacheKey)) {
                const cachedKlineData = cachedKlines.get(cacheKey) || []
                const cachedPatterns = cachedResults.get(cacheKey) || []

                // 检查是否可以进行增量计算
                if (cachedKlineData.length > 0 &&
                    klines.length > cachedKlineData.length &&
                    klines[cachedKlineData.length - 1].timestamp === cachedKlineData[cachedKlineData.length - 1].timestamp) {

                    // 只计算新增的K线
                    const newKlines = klines.slice(cachedKlineData.length)
                    const newPatterns = detector.detectPatterns(newKlines)

                    // 合并结果
                    patterns = [...cachedPatterns, ...newPatterns]
                } else {
                    // 缓存无效，重新计算全部
                    patterns = detector.detectPatterns(klines)
                }
            } else {
                // 无缓存，计算全部
                patterns = detector.detectPatterns(klines)
            }

            // 设置股票信息
            patterns.forEach(pattern => {
                pattern.stockId = stockId || ''
                pattern.stockName = stockName || ''
            })

            // 更新缓存
            cachedResults.set(cacheKey, patterns)
            cachedKlines.set(cacheKey, [...klines])

            // 返回结果
            self.postMessage({ type: 'result', data: patterns })
            break
        }

        case 'updateConfig': {
            // 更新配置会使缓存失效
            cachedResults.clear()
            cachedKlines.clear()

            // 创建新的检测器实例
            detector = new DojiPatternDetectorWorker(data.config)
            self.postMessage({ type: 'configUpdated' })
            break
        }

        case 'clearCache': {
            // 清除特定股票的缓存或所有缓存
            const { stockId } = data
            if (stockId) {
                cachedResults.delete(stockId)
                cachedKlines.delete(stockId)
            } else {
                cachedResults.clear()
                cachedKlines.clear()
            }
            self.postMessage({ type: 'cacheCleared' })
            break
        }

        default:
            self.postMessage({ type: 'error', message: '未知的操作类型' })
    }
})

// 通知主线程 worker 已准备就绪
self.postMessage({ type: 'ready' })