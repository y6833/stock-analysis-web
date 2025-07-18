import { DojiPattern, DojiType } from '../../../../types/technical-analysis/doji';
import { KLineData, MarketCondition } from '../../../../types/technical-analysis/kline';
import {
    IDojiPatternAnalyzer,
    PriceDistribution,
    PriceMovement,
    PriceMovementAnalysis,
    SuccessRateStats
} from '../../../../types/technical-analysis/doji-analysis';
import { StockDataService } from '../../../../services/StockDataService';

/**
 * 十字星形态分析器
 * 用于分析十字星形态后的价格走势
 */
export class DojiPatternAnalyzer implements IDojiPatternAnalyzer {
    /**
     * 股票数据服务
     */
    private stockDataService: StockDataService;

    /**
     * 构造函数
     * @param stockDataService 股票数据服务
     */
    constructor(stockDataService: StockDataService) {
        this.stockDataService = stockDataService;
    }

    /**
     * 分析价格走势
     * @param pattern 十字星形态
     * @param days 天数
     * @returns 价格走势分析
     */
    public async analyzePriceMovement(pattern: DojiPattern, days: number): Promise<PriceMovementAnalysis> {
        // 获取价格走势数据
        const priceMovement = await this.calculatePriceMovement(pattern);

        // 获取历史平均表现
        const historicalAverage = await this.getHistoricalAverage(pattern.type, days);

        // 查找相似形态
        const similarPatterns = await this.findSimilarPatterns(pattern);

        // 获取相似形态的价格走势
        const similarPatternsWithMovement = await Promise.all(
            similarPatterns.slice(0, 5).map(async (similarPattern) => {
                const movement = await this.calculatePriceMovement(similarPattern);
                return {
                    patternId: similarPattern.id,
                    similarity: this.calculatePatternSimilarity(pattern, similarPattern),
                    priceMovement: movement
                };
            })
        );

        return {
            patternId: pattern.id,
            priceMovement,
            historicalAverage,
            similarPatterns: similarPatternsWithMovement
        };
    }

    /**
     * 计算成功率
     * @param patternType 形态类型
     * @param timeframe 时间周期
     * @param marketCondition 市场环境
     * @returns 成功率统计
     */
    public async calculateSuccessRate(
        patternType: DojiType,
        timeframe: string,
        marketCondition?: MarketCondition
    ): Promise<SuccessRateStats> {
        // 获取历史形态数据
        const patterns = await this.getHistoricalPatterns(patternType);

        // 根据市场环境过滤
        const filteredPatterns = marketCondition
            ? patterns.filter(p => this.getMarketCondition(p.timestamp) === marketCondition)
            : patterns;

        if (filteredPatterns.length === 0) {
            return {
                patternType,
                timeframe,
                marketCondition,
                upwardProbability: 0,
                averageGain: 0,
                averageLoss: 0,
                sampleSize: 0
            };
        }

        // 计算每个形态的价格变动
        const priceMovements = await Promise.all(
            filteredPatterns.map(p => this.calculatePriceMovement(p))
        );

        // 根据时间周期获取价格变化
        const days = this.timeframeToDays(timeframe);
        const priceChanges = priceMovements.map(pm => this.getPriceChangeForDays(pm, days));

        // 计算上涨概率
        const upwardCount = priceChanges.filter(change => change > 0).length;
        const upwardProbability = upwardCount / priceChanges.length;

        // 计算平均涨幅和平均跌幅
        const gains = priceChanges.filter(change => change > 0);
        const losses = priceChanges.filter(change => change < 0);

        const averageGain = gains.length > 0
            ? gains.reduce((sum, gain) => sum + gain, 0) / gains.length
            : 0;

        const averageLoss = losses.length > 0
            ? Math.abs(losses.reduce((sum, loss) => sum + loss, 0) / losses.length)
            : 0;

        return {
            patternType,
            timeframe,
            marketCondition,
            upwardProbability,
            averageGain,
            averageLoss,
            sampleSize: filteredPatterns.length
        };
    }

    /**
     * 获取价格分布
     * @param patternType 形态类型
     * @param days 天数
     * @returns 价格分布
     */
    public async getPriceDistribution(patternType: DojiType, days: number): Promise<PriceDistribution> {
        // 获取历史形态数据
        const patterns = await this.getHistoricalPatterns(patternType);

        // 计算每个形态的价格变动
        const priceMovements = await Promise.all(
            patterns.map(p => this.calculatePriceMovement(p))
        );

        // 获取指定天数的价格变化
        const priceChanges = priceMovements.map(pm => this.getPriceChangeForDays(pm, days));

        // 创建价格区间
        const ranges = [
            { min: -Infinity, max: -10, label: '< -10%' },
            { min: -10, max: -5, label: '-10% ~ -5%' },
            { min: -5, max: -3, label: '-5% ~ -3%' },
            { min: -3, max: -1, label: '-3% ~ -1%' },
            { min: -1, max: 1, label: '-1% ~ 1%' },
            { min: 1, max: 3, label: '1% ~ 3%' },
            { min: 3, max: 5, label: '3% ~ 5%' },
            { min: 5, max: 10, label: '5% ~ 10%' },
            { min: 10, max: Infinity, label: '> 10%' }
        ];

        // 统计每个区间的数量
        const distribution = ranges.map(range => {
            const count = priceChanges.filter(
                change => change > range.min && change <= range.max
            ).length;

            return {
                range: range.label,
                count,
                percentage: (count / priceChanges.length) * 100
            };
        });

        return {
            patternType,
            days,
            distribution,
            totalSamples: patterns.length
        };
    }

    /**
     * 查找相似形态
     * @param pattern 十字星形态
     * @returns 相似形态列表
     */
    public async findSimilarPatterns(pattern: DojiPattern): Promise<DojiPattern[]> {
        // 获取同类型的历史形态
        const patterns = await this.getHistoricalPatterns(pattern.type);

        // 排除当前形态
        const otherPatterns = patterns.filter(p => p.id !== pattern.id);

        // 计算相似度并排序
        const patternsWithSimilarity = otherPatterns.map(p => ({
            pattern: p,
            similarity: this.calculatePatternSimilarity(pattern, p)
        }));

        // 按相似度降序排序
        patternsWithSimilarity.sort((a, b) => b.similarity - a.similarity);

        // 返回相似度最高的形态
        return patternsWithSimilarity.slice(0, 10).map(p => p.pattern);
    }

    /**
     * 计算价格走势
     * @param pattern 十字星形态
     * @returns 价格走势
     */
    private async calculatePriceMovement(pattern: DojiPattern): Promise<PriceMovement> {
        // 获取形态后的K线数据
        const klines = await this.getKlinesAfterPattern(pattern, 10);

        if (klines.length < 10) {
            // 数据不足，返回默认值
            return this.createDefaultPriceMovement(pattern);
        }

        // 获取形态当天的收盘价
        const patternClose = pattern.candle.close;

        // 计算各天的价格变化
        const day1Change = this.calculatePriceChange(patternClose, klines[0].close);
        const day3Change = this.calculatePriceChange(patternClose, klines[2].close);
        const day5Change = this.calculatePriceChange(patternClose, klines[4].close);
        const day10Change = this.calculatePriceChange(patternClose, klines[9].close);

        // 计算各天的成交量变化
        const patternVolume = pattern.candle.volume;
        const day1VolumeChange = this.calculateVolumeChange(patternVolume, klines[0].volume);
        const day3VolumeChange = this.calculateAverageVolumeChange(patternVolume, klines.slice(0, 3));
        const day5VolumeChange = this.calculateAverageVolumeChange(patternVolume, klines.slice(0, 5));

        return {
            patternId: pattern.id,
            stockId: pattern.stockId,
            patternDate: pattern.timestamp,
            priceChanges: {
                day1: day1Change,
                day3: day3Change,
                day5: day5Change,
                day10: day10Change
            },
            volumeChanges: {
                day1: day1VolumeChange,
                day3: day3VolumeChange,
                day5: day5VolumeChange
            },
            isUpward: day5Change > 0
        };
    }

    /**
     * 创建默认价格走势（当数据不足时）
     * @param pattern 十字星形态
     * @returns 默认价格走势
     */
    private createDefaultPriceMovement(pattern: DojiPattern): PriceMovement {
        return {
            patternId: pattern.id,
            stockId: pattern.stockId,
            patternDate: pattern.timestamp,
            priceChanges: {
                day1: 0,
                day3: 0,
                day5: 0,
                day10: 0
            },
            volumeChanges: {
                day1: 0,
                day3: 0,
                day5: 0
            },
            isUpward: false
        };
    }

    /**
     * 计算价格变化百分比
     * @param basePrice 基准价格
     * @param currentPrice 当前价格
     * @returns 价格变化百分比
     */
    private calculatePriceChange(basePrice: number, currentPrice: number): number {
        return ((currentPrice - basePrice) / basePrice) * 100;
    }

    /**
     * 计算成交量变化百分比
     * @param baseVolume 基准成交量
     * @param currentVolume 当前成交量
     * @returns 成交量变化百分比
     */
    private calculateVolumeChange(baseVolume: number, currentVolume: number): number {
        return ((currentVolume - baseVolume) / baseVolume) * 100;
    }

    /**
     * 计算平均成交量变化百分比
     * @param baseVolume 基准成交量
     * @param klines K线数据数组
     * @returns 平均成交量变化百分比
     */
    private calculateAverageVolumeChange(baseVolume: number, klines: KLineData[]): number {
        if (klines.length === 0) {
            return 0;
        }

        const avgVolume = klines.reduce((sum, kline) => sum + kline.volume, 0) / klines.length;
        return ((avgVolume - baseVolume) / baseVolume) * 100;
    }

    /**
     * 获取形态后的K线数据
     * @param pattern 十字星形态
     * @param days 天数
     * @returns K线数据数组
     */
    private async getKlinesAfterPattern(pattern: DojiPattern, days: number): Promise<KLineData[]> {
        try {
            // 获取形态后的K线数据
            const endDate = new Date();
            const startDate = new Date(pattern.timestamp);
            startDate.setDate(startDate.getDate() + 1); // 从形态后一天开始

            const klines = await this.stockDataService.getKLineData(
                pattern.stockId,
                startDate.getTime(),
                endDate.getTime(),
                'daily'
            );

            // 只返回指定天数的数据
            return klines.slice(0, days);
        } catch (error) {
            console.error('获取K线数据失败:', error);
            return [];
        }
    }

    /**
     * 获取历史形态数据
     * @param patternType 形态类型
     * @returns 历史形态数据
     */
    private async getHistoricalPatterns(patternType: DojiType): Promise<DojiPattern[]> {
        try {
            // 这里应该从数据库或API获取历史形态数据
            // 由于没有实际的数据源，这里返回空数组
            // 实际实现时，应该调用相应的服务获取数据
            return [];
        } catch (error) {
            console.error('获取历史形态数据失败:', error);
            return [];
        }
    }

    /**
     * 获取历史平均表现
     * @param patternType 形态类型
     * @param days 天数
     * @returns 历史平均表现
     */
    private async getHistoricalAverage(patternType: DojiType, days: number): Promise<{ upwardProbability: number; averageGain: number }> {
        // 获取历史形态数据
        const patterns = await this.getHistoricalPatterns(patternType);

        if (patterns.length === 0) {
            return {
                upwardProbability: 0,
                averageGain: 0
            };
        }

        // 计算每个形态的价格变动
        const priceMovements = await Promise.all(
            patterns.map(p => this.calculatePriceMovement(p))
        );

        // 获取指定天数的价格变化
        const priceChanges = priceMovements.map(pm => this.getPriceChangeForDays(pm, days));

        // 计算上涨概率
        const upwardCount = priceChanges.filter(change => change > 0).length;
        const upwardProbability = upwardCount / priceChanges.length;

        // 计算平均涨幅
        const gains = priceChanges.filter(change => change > 0);
        const averageGain = gains.length > 0
            ? gains.reduce((sum, gain) => sum + gain, 0) / gains.length
            : 0;

        return {
            upwardProbability,
            averageGain
        };
    }

    /**
     * 获取指定天数的价格变化
     * @param priceMovement 价格走势
     * @param days 天数
     * @returns 价格变化百分比
     */
    private getPriceChangeForDays(priceMovement: PriceMovement, days: number): number {
        switch (days) {
            case 1:
                return priceMovement.priceChanges.day1;
            case 3:
                return priceMovement.priceChanges.day3;
            case 5:
                return priceMovement.priceChanges.day5;
            case 10:
                return priceMovement.priceChanges.day10;
            default:
                return priceMovement.priceChanges.day5; // 默认返回5天价格变化
        }
    }

    /**
     * 时间周期转换为天数
     * @param timeframe 时间周期
     * @returns 天数
     */
    private timeframeToDays(timeframe: string): number {
        switch (timeframe) {
            case '1d':
                return 1;
            case '3d':
                return 3;
            case '5d':
                return 5;
            case '10d':
                return 10;
            default:
                return 5; // 默认5天
        }
    }

    /**
     * 获取市场环境
     * @param timestamp 时间戳
     * @returns 市场环境
     */
    private getMarketCondition(timestamp: number): MarketCondition {
        // 这里应该根据指数或其他指标判断市场环境
        // 由于没有实际的数据，这里返回中性
        // 实际实现时，应该根据市场指数走势判断
        return 'neutral';
    }

    /**
     * 计算形态相似度
     * @param pattern1 形态1
     * @param pattern2 形态2
     * @returns 相似度（0-1）
     */
    private calculatePatternSimilarity(pattern1: DojiPattern, pattern2: DojiPattern): number {
        // 确保是同一类型的形态
        if (pattern1.type !== pattern2.type) {
            return 0;
        }

        // 计算K线特征的相似度
        const candleSimilarity = this.calculateCandleSimilarity(pattern1.candle, pattern2.candle);

        // 计算上下文的相似度
        const contextSimilarity = this.calculateContextSimilarity(pattern1.context, pattern2.context);

        // 综合相似度（权重可调整）
        return candleSimilarity * 0.7 + contextSimilarity * 0.3;
    }

    /**
     * 计算K线相似度
     * @param candle1 K线1
     * @param candle2 K线2
     * @returns 相似度（0-1）
     */
    private calculateCandleSimilarity(
        candle1: { open: number; high: number; low: number; close: number; volume: number },
        candle2: { open: number; high: number; low: number; close: number; volume: number }
    ): number {
        // 标准化K线数据
        const normalizedCandle1 = this.normalizeCandle(candle1);
        const normalizedCandle2 = this.normalizeCandle(candle2);

        // 计算各项特征的差异
        const openDiff = Math.abs(normalizedCandle1.open - normalizedCandle2.open);
        const highDiff = Math.abs(normalizedCandle1.high - normalizedCandle2.high);
        const lowDiff = Math.abs(normalizedCandle1.low - normalizedCandle2.low);
        const closeDiff = Math.abs(normalizedCandle1.close - normalizedCandle2.close);

        // 计算总差异
        const totalDiff = (openDiff + highDiff + lowDiff + closeDiff) / 4;

        // 转换为相似度（0-1）
        return Math.max(0, 1 - totalDiff);
    }

    /**
     * 标准化K线数据
     * @param candle K线数据
     * @returns 标准化后的K线数据
     */
    private normalizeCandle(candle: { open: number; high: number; low: number; close: number; volume: number }) {
        const range = candle.high - candle.low;
        if (range === 0) {
            return {
                open: 0.5,
                high: 1,
                low: 0,
                close: 0.5,
                volume: candle.volume
            };
        }

        return {
            open: (candle.open - candle.low) / range,
            high: 1,
            low: 0,
            close: (candle.close - candle.low) / range,
            volume: candle.volume
        };
    }

    /**
     * 计算上下文相似度
     * @param context1 上下文1
     * @param context2 上下文2
     * @returns 相似度（0-1）
     */
    private calculateContextSimilarity(
        context1: { trend: string; nearSupportResistance: boolean; volumeChange: number },
        context2: { trend: string; nearSupportResistance: boolean; volumeChange: number }
    ): number {
        // 趋势相似度
        const trendSimilarity = context1.trend === context2.trend ? 1 : 0;

        // 支撑/阻力位相似度
        const srSimilarity = context1.nearSupportResistance === context2.nearSupportResistance ? 1 : 0;

        // 成交量变化相似度
        const volumeChangeDiff = Math.abs(context1.volumeChange - context2.volumeChange);
        const volumeChangeSimilarity = Math.max(0, 1 - volumeChangeDiff / 100);

        // 综合相似度（权重可调整）
        return trendSimilarity * 0.4 + srSimilarity * 0.3 + volumeChangeSimilarity * 0.3;
    }
}