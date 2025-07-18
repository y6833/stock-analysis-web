import { DojiType } from '../types/technical-analysis/doji';
import { MarketCondition } from '../types/technical-analysis/kline';
import { StockDataService } from './StockDataService';

/**
 * 价格走势统计服务
 * 用于计算十字星形态后的价格走势统计数据
 */
export class PriceMovementStatisticsService {
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
     * 计算上涨概率
     * @param patternType 十字星类型
     * @param days 天数
     * @param marketCondition 市场环境
     * @returns 上涨概率（0-1）
     */
    public async calculateUpwardProbability(
        patternType: DojiType,
        days: number,
        marketCondition?: MarketCondition
    ): Promise<number> {
        try {
            // 获取历史统计数据
            const stats = await this.getHistoricalStats(patternType, days, marketCondition);

            if (stats.totalCount === 0) {
                return 0;
            }

            // 计算上涨概率
            return stats.upwardCount / stats.totalCount;
        } catch (error) {
            console.error('计算上涨概率失败:', error);
            return 0;
        }
    }

    /**
     * 计算平均涨跌幅
     * @param patternType 十字星类型
     * @param days 天数
     * @param marketCondition 市场环境
     * @returns 平均涨跌幅对象
     */
    public async calculateAveragePriceChange(
        patternType: DojiType,
        days: number,
        marketCondition?: MarketCondition
    ): Promise<{ averageGain: number; averageLoss: number; averageChange: number }> {
        try {
            // 获取历史统计数据
            const stats = await this.getHistoricalStats(patternType, days, marketCondition);

            if (stats.totalCount === 0) {
                return {
                    averageGain: 0,
                    averageLoss: 0,
                    averageChange: 0
                };
            }

            // 计算平均涨幅
            const averageGain = stats.upwardCount > 0
                ? stats.totalGain / stats.upwardCount
                : 0;

            // 计算平均跌幅
            const averageLoss = stats.downwardCount > 0
                ? Math.abs(stats.totalLoss / stats.downwardCount)
                : 0;

            // 计算平均涨跌幅
            const averageChange = stats.totalCount > 0
                ? (stats.totalGain + stats.totalLoss) / stats.totalCount
                : 0;

            return {
                averageGain,
                averageLoss,
                averageChange
            };
        } catch (error) {
            console.error('计算平均涨跌幅失败:', error);
            return {
                averageGain: 0,
                averageLoss: 0,
                averageChange: 0
            };
        }
    }

    /**
     * 计算市场环境分类统计
     * @param patternType 十字星类型
     * @param days 天数
     * @returns 市场环境分类统计
     */
    public async calculateMarketConditionStats(
        patternType: DojiType,
        days: number
    ): Promise<Record<MarketCondition, { probability: number; averageChange: number; count: number }>> {
        try {
            // 获取各市场环境下的统计数据
            const bullStats = await this.getHistoricalStats(patternType, days, 'bull');
            const bearStats = await this.getHistoricalStats(patternType, days, 'bear');
            const neutralStats = await this.getHistoricalStats(patternType, days, 'neutral');

            return {
                bull: {
                    probability: bullStats.totalCount > 0 ? bullStats.upwardCount / bullStats.totalCount : 0,
                    averageChange: bullStats.totalCount > 0 ? (bullStats.totalGain + bullStats.totalLoss) / bullStats.totalCount : 0,
                    count: bullStats.totalCount
                },
                bear: {
                    probability: bearStats.totalCount > 0 ? bearStats.upwardCount / bearStats.totalCount : 0,
                    averageChange: bearStats.totalCount > 0 ? (bearStats.totalGain + bearStats.totalLoss) / bearStats.totalCount : 0,
                    count: bearStats.totalCount
                },
                neutral: {
                    probability: neutralStats.totalCount > 0 ? neutralStats.upwardCount / neutralStats.totalCount : 0,
                    averageChange: neutralStats.totalCount > 0 ? (neutralStats.totalGain + neutralStats.totalLoss) / neutralStats.totalCount : 0,
                    count: neutralStats.totalCount
                }
            };
        } catch (error) {
            console.error('计算市场环境分类统计失败:', error);
            return {
                bull: { probability: 0, averageChange: 0, count: 0 },
                bear: { probability: 0, averageChange: 0, count: 0 },
                neutral: { probability: 0, averageChange: 0, count: 0 }
            };
        }
    }

    /**
     * 获取价格变化分布
     * @param patternType 十字星类型
     * @param days 天数
     * @param marketCondition 市场环境
     * @returns 价格变化分布
     */
    public async getPriceChangeDistribution(
        patternType: DojiType,
        days: number,
        marketCondition?: MarketCondition
    ): Promise<{ range: string; count: number; percentage: number }[]> {
        try {
            // 获取历史价格变化数据
            const priceChanges = await this.getHistoricalPriceChanges(patternType, days, marketCondition);

            if (priceChanges.length === 0) {
                return [];
            }

            // 定义价格区间
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

            return distribution;
        } catch (error) {
            console.error('获取价格变化分布失败:', error);
            return [];
        }
    }

    /**
     * 获取历史统计数据
     * @param patternType 十字星类型
     * @param days 天数
     * @param marketCondition 市场环境
     * @returns 历史统计数据
     */
    private async getHistoricalStats(
        patternType: DojiType,
        days: number,
        marketCondition?: MarketCondition
    ): Promise<{
        upwardCount: number;
        downwardCount: number;
        totalCount: number;
        totalGain: number;
        totalLoss: number;
    }> {
        // 获取历史价格变化数据
        const priceChanges = await this.getHistoricalPriceChanges(patternType, days, marketCondition);

        if (priceChanges.length === 0) {
            return {
                upwardCount: 0,
                downwardCount: 0,
                totalCount: 0,
                totalGain: 0,
                totalLoss: 0
            };
        }

        // 统计上涨和下跌
        const upwardChanges = priceChanges.filter(change => change > 0);
        const downwardChanges = priceChanges.filter(change => change < 0);

        // 计算总涨幅和总跌幅
        const totalGain = upwardChanges.reduce((sum, change) => sum + change, 0);
        const totalLoss = downwardChanges.reduce((sum, change) => sum + change, 0);

        return {
            upwardCount: upwardChanges.length,
            downwardCount: downwardChanges.length,
            totalCount: priceChanges.length,
            totalGain,
            totalLoss
        };
    }

    /**
     * 获取历史价格变化数据
     * @param patternType 十字星类型
     * @param days 天数
     * @param marketCondition 市场环境
     * @returns 价格变化百分比数组
     */
    private async getHistoricalPriceChanges(
        patternType: DojiType,
        days: number,
        marketCondition?: MarketCondition
    ): Promise<number[]> {
        try {
            // 这里应该从数据库或API获取历史形态和价格数据
            // 由于没有实际的数据源，这里返回模拟数据
            // 实际实现时，应该调用相应的服务获取数据

            // 模拟不同类型十字星的价格变化数据
            const mockData: Record<DojiType, number[]> = {
                standard: [-5.2, -3.1, -1.5, -0.8, 0.3, 1.2, 2.5, 3.8, 5.6, 8.9],
                dragonfly: [-2.1, -1.3, -0.5, 0.7, 1.5, 2.8, 4.2, 6.1, 9.3, 12.5],
                gravestone: [-8.5, -6.2, -4.1, -2.3, -1.1, 0.4, 1.8, 3.2, 4.5, 6.8],
                longLegged: [-4.5, -2.8, -1.2, 0.5, 1.9, 3.4, 5.2, 7.1, 9.8, 12.3]
            };

            // 根据市场环境过滤数据
            if (marketCondition) {
                // 模拟不同市场环境下的价格变化
                // 牛市：上涨概率更高
                // 熊市：下跌概率更高
                // 中性：平衡
                switch (marketCondition) {
                    case 'bull':
                        return mockData[patternType].map(change => change * 1.5);
                    case 'bear':
                        return mockData[patternType].map(change => change * 0.5);
                    case 'neutral':
                        return mockData[patternType];
                }
            }

            return mockData[patternType];
        } catch (error) {
            console.error('获取历史价格变化数据失败:', error);
            return [];
        }
    }
}