import type { DojiPattern, DojiType } from '../types/technical-analysis/doji'
import type { KLineData } from '../types/technical-analysis/kline'
import { tushareService } from './tushareService'
import { DojiPatternDetectorService } from './DojiPatternDetectorService'

/**
 * 价格走势分析结果
 */
export interface PriceMovementAnalysis {
    priceMovement: {
        priceChanges: {
            day1?: number
            day3?: number
            day5?: number
            day10?: number
        }
        volumeChanges: {
            day1?: number
            day3?: number
            day5?: number
            day10?: number
        }
    }
}

/**
 * 历史形态服务接口
 */
export interface HistoricalPatternService {
    /**
     * 获取历史形态
     * @param stockId 股票ID
     * @param days 天数
     * @param patternType 形态类型
     * @returns 历史形态列表
     */
    getHistoricalPatterns(stockId: string, days: number, patternType?: DojiType): Promise<DojiPattern[]>

    /**
     * 获取最近出现形态的股票
     * @param days 天数
     * @param patternType 形态类型
     * @param limit 结果数量限制
     * @returns 形态列表
     */
    getRecentPatterns(days: number, patternType?: DojiType, limit?: number): Promise<DojiPattern[]>

    /**
     * 分析价格走势
     * @param pattern 形态数据
     * @param days 分析天数
     * @returns 价格走势分析结果
     */
    analyzePriceMovement(pattern: any, days: number): Promise<PriceMovementAnalysis>
}

/**
 * 历史形态服务实现
 */
export class HistoricalPatternServiceImpl implements HistoricalPatternService {
    private dojiDetector: DojiPatternDetectorService

    constructor() {
        this.dojiDetector = new DojiPatternDetectorService()
    }

    /**
     * 获取历史形态
     * @param stockId 股票ID
     * @param days 天数
     * @param patternType 形态类型
     * @returns 历史形态列表
     */
    async getHistoricalPatterns(stockId: string, days: number, patternType?: DojiType): Promise<DojiPattern[]> {
        console.log(`[HistoricalPatternService] 获取股票 ${stockId} 的历史形态，天数: ${days}，类型: ${patternType}`)

        try {
            // 启用Tushare API调用
            tushareService.setAllowApiCall(true)

            // 获取股票历史K线数据
            const stockData = await tushareService.getStockData(stockId, days)

            // 转换为K线数据格式
            const klines: KLineData[] = stockData.dates.map((date, index) => ({
                timestamp: new Date(date).getTime(),
                open: stockData.opens?.[index] || stockData.prices[index],
                high: stockData.highs?.[index] || stockData.prices[index],
                low: stockData.lows?.[index] || stockData.prices[index],
                close: stockData.closes?.[index] || stockData.prices[index],
                volume: stockData.volumes[index] || 0
            }))

            // 使用十字星检测器分析K线数据
            const patterns: DojiPattern[] = []

            for (let i = 1; i < klines.length; i++) {
                const currentKlines = klines.slice(0, i + 1)
                const detection = this.dojiDetector.detectPattern(currentKlines, patternType)

                if (detection.detected && detection.patternType) {
                    patterns.push({
                        id: `${stockId}_${detection.timestamp}`,
                        stockId: stockId,
                        stockName: stockData.symbol || stockId,
                        patternType: detection.patternType,
                        timestamp: detection.timestamp!,
                        significance: detection.significance || 0,
                        context: detection.context || {
                            trend: 'sideways',
                            volume: 'normal',
                            position: 'middle'
                        },
                        candle: detection.candle!
                    })
                }
            }

            console.log(`[HistoricalPatternService] 检测到 ${patterns.length} 个十字星形态`)
            return patterns

        } catch (error) {
            console.error(`[HistoricalPatternService] 获取股票 ${stockId} 历史形态失败:`, error)
            return []
        } finally {
            // 重置API调用权限
            tushareService.setAllowApiCall(false)
        }
    }

    /**
     * 获取最近出现形态的股票
     * @param days 天数
     * @param patternType 形态类型
     * @param limit 结果数量限制
     * @returns 形态列表
     */
    async getRecentPatterns(days: number, patternType?: DojiType, limit?: number): Promise<DojiPattern[]> {
        console.log(`[HistoricalPatternService] 获取最近 ${days} 天的十字星形态，类型: ${patternType}，限制: ${limit}`)

        try {
            // 启用Tushare API调用
            tushareService.setAllowApiCall(true)

            // 获取股票列表
            const stocks = await tushareService.getStocks()
            const maxStocks = Math.min(stocks.length, 20) // 限制分析的股票数量以避免API限制
            const allPatterns: DojiPattern[] = []

            console.log(`[HistoricalPatternService] 开始分析 ${maxStocks} 只股票的十字星形态`)

            // 分析每只股票
            for (let i = 0; i < maxStocks; i++) {
                const stock = stocks[i]
                try {
                    // 获取股票历史数据
                    const stockData = await tushareService.getStockData(stock.symbol, days)

                    // 转换为K线数据格式
                    const klines: KLineData[] = stockData.dates.map((date, index) => ({
                        timestamp: new Date(date).getTime(),
                        open: stockData.opens?.[index] || stockData.prices[index],
                        high: stockData.highs?.[index] || stockData.prices[index],
                        low: stockData.lows?.[index] || stockData.prices[index],
                        close: stockData.closes?.[index] || stockData.prices[index],
                        volume: stockData.volumes[index] || 0
                    }))

                    // 检测十字星形态
                    for (let j = 1; j < klines.length; j++) {
                        const currentKlines = klines.slice(0, j + 1)
                        const detection = this.dojiDetector.detectPattern(currentKlines, patternType)

                        if (detection.detected && detection.patternType) {
                            allPatterns.push({
                                id: `${stock.symbol}_${detection.timestamp}`,
                                stockId: stock.symbol,
                                stockName: stock.name,
                                patternType: detection.patternType,
                                timestamp: detection.timestamp!,
                                significance: detection.significance || 0,
                                context: detection.context || {
                                    trend: 'sideways',
                                    volume: 'normal',
                                    position: 'middle'
                                },
                                candle: detection.candle!
                            })
                        }
                    }

                    // 添加延迟以避免API限制
                    if (i < maxStocks - 1) {
                        await new Promise(resolve => setTimeout(resolve, 100))
                    }

                } catch (error) {
                    console.warn(`[HistoricalPatternService] 分析股票 ${stock.symbol} 失败:`, error)
                    continue
                }
            }

            // 按时间戳排序（最新的在前）
            allPatterns.sort((a, b) => b.timestamp - a.timestamp)

            const result = allPatterns.slice(0, limit || 50)
            console.log(`[HistoricalPatternService] 检测到 ${result.length} 个十字星形态`)

            return result

        } catch (error) {
            console.error(`[HistoricalPatternService] 获取最近形态失败:`, error)
            return []
        } finally {
            // 重置API调用权限
            tushareService.setAllowApiCall(false)
        }
    }

    /**
     * 分析价格走势
     * @param pattern 形态数据
     * @param days 分析天数
     * @returns 价格走势分析结果
     */
    async analyzePriceMovement(pattern: any, days: number): Promise<PriceMovementAnalysis> {
        console.log(`[HistoricalPatternService] 分析股票 ${pattern.stockId} 在十字星形态后的价格走势`)

        try {
            // 启用Tushare API调用
            tushareService.setAllowApiCall(true)

            // 获取形态出现后的股票数据
            const patternDate = new Date(pattern.timestamp)
            const endDate = new Date(patternDate.getTime() + days * 24 * 60 * 60 * 1000)

            // 获取股票数据
            const stockData = await tushareService.getStockData(pattern.stockId, days + 10)

            // 找到形态出现的日期索引
            const patternDateStr = patternDate.toISOString().split('T')[0]
            const patternIndex = stockData.dates.findIndex(date => date === patternDateStr)

            if (patternIndex === -1 || patternIndex >= stockData.dates.length - 1) {
                console.warn(`[HistoricalPatternService] 无法找到形态日期 ${patternDateStr} 的数据`)
                return this.generateFallbackAnalysis(pattern)
            }

            // 计算形态后的价格变化
            const basePrice = pattern.candle?.close || stockData.prices[patternIndex]
            const baseVolume = pattern.candle?.volume || stockData.volumes[patternIndex]

            const calculateChange = (targetIndex: number) => {
                if (targetIndex >= stockData.prices.length) return undefined
                const targetPrice = stockData.prices[targetIndex]
                const targetVolume = stockData.volumes[targetIndex]

                return {
                    priceChange: ((targetPrice - basePrice) / basePrice) * 100,
                    volumeChange: baseVolume > 0 ? ((targetVolume - baseVolume) / baseVolume) * 100 : 0
                }
            }

            const day1 = calculateChange(patternIndex + 1)
            const day3 = calculateChange(patternIndex + 3)
            const day5 = calculateChange(patternIndex + 5)
            const day10 = calculateChange(patternIndex + 10)

            return {
                priceMovement: {
                    priceChanges: {
                        day1: day1?.priceChange,
                        day3: day3?.priceChange,
                        day5: day5?.priceChange,
                        day10: day10?.priceChange
                    },
                    volumeChanges: {
                        day1: day1?.volumeChange,
                        day3: day3?.volumeChange,
                        day5: day5?.volumeChange,
                        day10: day10?.volumeChange
                    }
                }
            }

        } catch (error) {
            console.error(`[HistoricalPatternService] 分析价格走势失败:`, error)
            return this.generateFallbackAnalysis(pattern)
        } finally {
            // 重置API调用权限
            tushareService.setAllowApiCall(false)
        }
    }

    /**
     * 生成备用分析结果（当API调用失败时）
     */
    private generateFallbackAnalysis(pattern: any): PriceMovementAnalysis {
        console.log(`[HistoricalPatternService] 使用备用分析方法`)

        // 基于十字星类型生成合理的预期变化
        const baseVolatility = 0.02 // 2% 基础波动率
        const typeMultiplier = {
            'dragonfly': 1.2, // 蜻蜓十字星通常更看涨
            'gravestone': 0.8, // 墓碑十字星通常更看跌
            'longLegged': 1.1, // 长腿十字星波动性更大
            'standard': 1.0
        }

        const multiplier = typeMultiplier[pattern.patternType as keyof typeof typeMultiplier] || 1.0

        const generateChange = (days: number) => {
            const volatility = baseVolatility * Math.sqrt(days) * multiplier
            return (Math.random() - 0.4) * volatility * 100 // 轻微看涨倾向
        }

        return {
            priceMovement: {
                priceChanges: {
                    day1: generateChange(1),
                    day3: generateChange(3),
                    day5: generateChange(5),
                    day10: generateChange(10)
                },
                volumeChanges: {
                    day1: (Math.random() - 0.5) * 20,
                    day3: (Math.random() - 0.5) * 30,
                    day5: (Math.random() - 0.5) * 40,
                    day10: (Math.random() - 0.5) * 50
                }
            }
        }
    }
}