/**
 * 十字星形态检测服务
 * 用于检测股票K线中的十字星形态，并评估是否触发提醒
 */

import type { DojiPatternType } from './alertService'
import type { DojiAlertCondition } from './DojiPatternAlertService'
import type { KLineData } from '../types/chart'

/**
 * 十字星形态检测结果
 */
export interface DojiPatternDetectionResult {
    detected: boolean
    patternType?: DojiPatternType
    timestamp?: number
    significance?: number
    candle?: {
        open: number
        high: number
        low: number
        close: number
        volume: number
    }
    context?: {
        trend?: 'uptrend' | 'downtrend' | 'sideways'
        nearSupportResistance?: boolean
        volumeChange?: number
    }
}

/**
 * 十字星形态检测服务
 */
export class DojiPatternDetectorService {
    // 配置参数
    private config = {
        bodyThreshold: 0.1, // 实体与影线比例阈值
        equalPriceThreshold: 0.001, // 开盘收盘价相等的容差
        longLegThreshold: 0.5, // 长腿十字星的影线长度阈值
        volumeChangeThreshold: 0.2, // 成交量变化阈值
        supportResistanceDistance: 0.02 // 支撑/阻力位距离阈值
    }

    /**
     * 构造函数
     * @param config 配置参数
     */
    constructor(config?: Partial<typeof DojiPatternDetectorService.prototype.config>) {
        if (config) {
            this.config = { ...this.config, ...config }
        }
    }

    /**
     * 检测K线数据中的十字星形态
     * @param klines K线数据
     * @param patternType 要检测的形态类型，不指定则检测所有类型
     * @returns 检测结果
     */
    detectPattern(klines: KLineData[], patternType?: DojiPatternType): DojiPatternDetectionResult {
        if (!klines || klines.length < 2) {
            return { detected: false }
        }

        // 获取最新的K线
        const latestCandle = klines[klines.length - 1]
        const previousCandles = klines.slice(0, klines.length - 1)

        // 根据指定类型或依次检测各种形态
        let detected = false
        let detectedType: DojiPatternType | undefined
        let significance = 0

        if (!patternType || patternType === 'standard') {
            const isStandardDoji = this.detectStandardDoji(latestCandle)
            if (isStandardDoji) {
                detected = true
                detectedType = 'standard'
                significance = this.calculateSignificance(latestCandle, previousCandles)
            }
        }

        if ((!detected && !patternType) || patternType === 'dragonfly') {
            const isDragonfly = this.detectDragonfly(latestCandle)
            if (isDragonfly) {
                detected = true
                detectedType = 'dragonfly'
                significance = this.calculateSignificance(latestCandle, previousCandles, 1.2) // 蜻蜓十字星显著性更高
            }
        }

        if ((!detected && !patternType) || patternType === 'gravestone') {
            const isGravestone = this.detectGravestone(latestCandle)
            if (isGravestone) {
                detected = true
                detectedType = 'gravestone'
                significance = this.calculateSignificance(latestCandle, previousCandles, 1.2) // 墓碑十字星显著性更高
            }
        }

        if ((!detected && !patternType) || patternType === 'longLegged') {
            const isLongLegged = this.detectLongLeggedDoji(latestCandle)
            if (isLongLegged) {
                detected = true
                detectedType = 'longLegged'
                significance = this.calculateSignificance(latestCandle, previousCandles, 1.1) // 长腿十字星显著性稍高
            }
        }

        if (!detected) {
            return { detected: false }
        }

        // 计算上下文信息
        const context = this.analyzeContext(latestCandle, previousCandles)

        return {
            detected,
            patternType: detectedType,
            timestamp: latestCandle.timestamp,
            significance,
            candle: {
                open: latestCandle.open,
                high: latestCandle.high,
                low: latestCandle.low,
                close: latestCandle.close,
                volume: latestCandle.volume
            },
            context
        }
    }

    /**
     * 评估是否满足提醒条件
     * @param detectionResult 检测结果
     * @param condition 提醒条件
     * @param additionalParams 额外参数
     * @returns 是否满足条件
     */
    evaluateAlertCondition(
        detectionResult: DojiPatternDetectionResult,
        condition: DojiAlertCondition,
        additionalParams?: {
            minSignificance?: number
            volumeChangePercent?: number
        }
    ): boolean {
        if (!detectionResult.detected) {
            return false
        }

        const minSignificance = additionalParams?.minSignificance || 0.5
        const volumeChangePercent = additionalParams?.volumeChangePercent || 20

        // 检查显著性是否满足要求
        if ((detectionResult.significance || 0) < minSignificance) {
            return false
        }

        // 根据不同条件评估
        switch (condition) {
            case 'pattern_appears':
                // 仅检查形态出现即可
                return true

            case 'pattern_with_volume':
                // 检查形态出现且成交量变化满足要求
                return (
                    (detectionResult.context?.volumeChange || 0) >= volumeChangePercent / 100
                )

            case 'pattern_near_support':
            case 'pattern_near_resistance':
                // 检查形态是否出现在支撑/阻力位附近
                return detectionResult.context?.nearSupportResistance === true

            default:
                return false
        }
    }

    /**
     * 检测标准十字星
     * @param candle K线数据
     * @returns 是否为标准十字星
     */
    private detectStandardDoji(candle: KLineData): boolean {
        // 开盘价和收盘价几乎相等
        const isPriceEqual = this.isPriceEqual(candle.open, candle.close)

        // 上下影线存在
        const hasUpperShadow = candle.high > Math.max(candle.open, candle.close)
        const hasLowerShadow = candle.low < Math.min(candle.open, candle.close)

        // 实体小于整体K线的一定比例
        const bodySize = Math.abs(candle.close - candle.open)
        const totalRange = candle.high - candle.low
        const bodyRatio = totalRange > 0 ? bodySize / totalRange : 0

        return isPriceEqual && hasUpperShadow && hasLowerShadow && bodyRatio < this.config.bodyThreshold
    }

    /**
     * 检测蜻蜓十字星
     * @param candle K线数据
     * @returns 是否为蜻蜓十字星
     */
    private detectDragonfly(candle: KLineData): boolean {
        // 开盘价和收盘价几乎相等
        const isPriceEqual = this.isPriceEqual(candle.open, candle.close)

        // 几乎没有上影线
        const upperShadow = candle.high - Math.max(candle.open, candle.close)
        const totalRange = candle.high - candle.low
        const upperShadowRatio = totalRange > 0 ? upperShadow / totalRange : 0

        // 有明显的下影线
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low
        const lowerShadowRatio = totalRange > 0 ? lowerShadow / totalRange : 0

        return isPriceEqual && upperShadowRatio < 0.1 && lowerShadowRatio > 0.6
    }

    /**
     * 检测墓碑十字星
     * @param candle K线数据
     * @returns 是否为墓碑十字星
     */
    private detectGravestone(candle: KLineData): boolean {
        // 开盘价和收盘价几乎相等
        const isPriceEqual = this.isPriceEqual(candle.open, candle.close)

        // 几乎没有下影线
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low
        const totalRange = candle.high - candle.low
        const lowerShadowRatio = totalRange > 0 ? lowerShadow / totalRange : 0

        // 有明显的上影线
        const upperShadow = candle.high - Math.max(candle.open, candle.close)
        const upperShadowRatio = totalRange > 0 ? upperShadow / totalRange : 0

        return isPriceEqual && lowerShadowRatio < 0.1 && upperShadowRatio > 0.6
    }

    /**
     * 检测长腿十字星
     * @param candle K线数据
     * @returns 是否为长腿十字星
     */
    private detectLongLeggedDoji(candle: KLineData): boolean {
        // 开盘价和收盘价几乎相等
        const isPriceEqual = this.isPriceEqual(candle.open, candle.close)

        // 上下影线都很长
        const upperShadow = candle.high - Math.max(candle.open, candle.close)
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low
        const totalRange = candle.high - candle.low

        const upperShadowRatio = totalRange > 0 ? upperShadow / totalRange : 0
        const lowerShadowRatio = totalRange > 0 ? lowerShadow / totalRange : 0

        return isPriceEqual &&
            upperShadowRatio > this.config.longLegThreshold &&
            lowerShadowRatio > this.config.longLegThreshold
    }

    /**
     * 判断两个价格是否几乎相等
     * @param price1 价格1
     * @param price2 价格2
     * @returns 是否几乎相等
     */
    private isPriceEqual(price1: number, price2: number): boolean {
        if (price1 === 0 || price2 === 0) return false

        const diff = Math.abs(price1 - price2)
        const avg = (price1 + price2) / 2
        return diff / avg <= this.config.equalPriceThreshold
    }

    /**
     * 计算形态显著性
     * @param candle 当前K线
     * @param previousCandles 之前的K线
     * @param multiplier 显著性乘数
     * @returns 显著性分数 (0-1)
     */
    private calculateSignificance(
        candle: KLineData,
        previousCandles: KLineData[],
        multiplier: number = 1
    ): number {
        if (previousCandles.length === 0) return 0.5 * multiplier

        // 计算实体大小与影线比例
        const bodySize = Math.abs(candle.close - candle.open)
        const totalRange = candle.high - candle.low
        const bodySizeRatio = totalRange > 0 ? bodySize / totalRange : 0

        // 实体越小，显著性越高
        let significance = 1 - bodySizeRatio * 10
        significance = Math.max(0, Math.min(1, significance))

        // 计算成交量因素
        if (previousCandles.length >= 5) {
            const avgVolume = previousCandles
                .slice(-5)
                .reduce((sum, c) => sum + c.volume, 0) / 5

            const volumeRatio = avgVolume > 0 ? candle.volume / avgVolume : 1

            // 成交量越大，显著性越高
            const volumeFactor = Math.min(1, volumeRatio / 2)
            significance = significance * 0.7 + volumeFactor * 0.3
        }

        // 应用乘数
        significance = Math.min(1, significance * multiplier)

        return significance
    }

    /**
     * 分析K线上下文
     * @param candle 当前K线
     * @param previousCandles 之前的K线
     * @returns 上下文信息
     */
    private analyzeContext(candle: KLineData, previousCandles: KLineData[]): {
        trend?: 'uptrend' | 'downtrend' | 'sideways'
        nearSupportResistance?: boolean
        volumeChange?: number
    } {
        if (previousCandles.length < 10) {
            return {}
        }

        // 分析趋势
        const recentCandles = previousCandles.slice(-10)
        const firstPrice = recentCandles[0].close
        const lastPrice = recentCandles[recentCandles.length - 1].close
        const priceChange = (lastPrice - firstPrice) / firstPrice

        let trend: 'uptrend' | 'downtrend' | 'sideways' = 'sideways'
        if (priceChange > 0.03) {
            trend = 'uptrend'
        } else if (priceChange < -0.03) {
            trend = 'downtrend'
        }

        // 分析成交量变化
        const avgVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length
        const volumeChange = avgVolume > 0 ? (candle.volume - avgVolume) / avgVolume : 0

        // 检查是否接近支撑/阻力位
        const nearSupportResistance = this.checkNearSupportResistance(candle, previousCandles)

        return {
            trend,
            nearSupportResistance,
            volumeChange
        }
    }

    /**
     * 检查是否接近支撑/阻力位
     * @param candle 当前K线
     * @param previousCandles 之前的K线
     * @returns 是否接近支撑/阻力位
     */
    private checkNearSupportResistance(candle: KLineData, previousCandles: KLineData[]): boolean {
        if (previousCandles.length < 20) {
            return false
        }

        // 简单实现：查找最近的高点和低点
        const recentCandles = previousCandles.slice(-20)
        const highs = recentCandles.map(c => c.high)
        const lows = recentCandles.map(c => c.low)

        const maxHigh = Math.max(...highs)
        const minLow = Math.min(...lows)

        // 计算当前价格与高点/低点的距离
        const currentPrice = candle.close
        const distanceToHigh = Math.abs(maxHigh - currentPrice) / currentPrice
        const distanceToLow = Math.abs(currentPrice - minLow) / currentPrice

        // 如果接近高点或低点，则认为接近支撑/阻力位
        return distanceToHigh < this.config.supportResistanceDistance ||
            distanceToLow < this.config.supportResistanceDistance
    }
}

export default DojiPatternDetectorService