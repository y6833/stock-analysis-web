import { ref, computed } from 'vue';
import { PriceMovementStatisticsService } from '../services/PriceMovementStatisticsService';
import { StockDataServiceImpl } from '../services/StockDataService';
import type { DojiType } from '../types/technical-analysis/doji';
import type { MarketCondition } from '../types/technical-analysis/kline';

/**
 * 价格走势统计Hook
 * @param apiBaseUrl API基础URL
 * @returns 价格走势统计相关方法和状态
 */
export function usePriceMovementStatistics(apiBaseUrl: string = '/api') {
    // 创建股票数据服务
    const stockDataService = new StockDataServiceImpl(apiBaseUrl);

    // 创建价格走势统计服务
    const statisticsService = new PriceMovementStatisticsService(stockDataService);

    // 状态
    const loading = ref(false);
    const error = ref<string | null>(null);

    // 统计数据
    const upwardProbability = ref<number>(0);
    const averagePriceChange = ref<{ averageGain: number; averageLoss: number; averageChange: number }>({
        averageGain: 0,
        averageLoss: 0,
        averageChange: 0
    });
    const marketConditionStats = ref<Record<MarketCondition, { probability: number; averageChange: number; count: number }>>({
        bull: { probability: 0, averageChange: 0, count: 0 },
        bear: { probability: 0, averageChange: 0, count: 0 },
        neutral: { probability: 0, averageChange: 0, count: 0 }
    });
    const priceDistribution = ref<{ range: string; count: number; percentage: number }[]>([]);

    // 计算属性
    const riskRewardRatio = computed(() => {
        if (averagePriceChange.value.averageLoss === 0) {
            return 0;
        }
        return averagePriceChange.value.averageGain / averagePriceChange.value.averageLoss;
    });

    const expectedValue = computed(() => {
        return upwardProbability.value * averagePriceChange.value.averageGain -
            (1 - upwardProbability.value) * averagePriceChange.value.averageLoss;
    });

    const bestMarketCondition = computed(() => {
        const conditions = Object.entries(marketConditionStats.value)
            .filter(([_, stats]) => stats.count > 0)
            .sort((a, b) => b[1].probability - a[1].probability);

        return conditions.length > 0 ? conditions[0][0] as MarketCondition : 'neutral';
    });

    /**
     * 加载价格走势统计数据
     * @param patternType 十字星类型
     * @param days 天数
     * @param marketCondition 市场环境
     */
    const loadStatistics = async (
        patternType: DojiType,
        days: number,
        marketCondition?: MarketCondition
    ): Promise<void> => {
        loading.value = true;
        error.value = null;

        try {
            // 并行加载各项统计数据
            const [
                probabilityResult,
                priceChangeResult,
                conditionStatsResult,
                distributionResult
            ] = await Promise.all([
                statisticsService.calculateUpwardProbability(patternType, days, marketCondition),
                statisticsService.calculateAveragePriceChange(patternType, days, marketCondition),
                statisticsService.calculateMarketConditionStats(patternType, days),
                statisticsService.getPriceChangeDistribution(patternType, days, marketCondition)
            ]);

            // 更新状态
            upwardProbability.value = probabilityResult;
            averagePriceChange.value = priceChangeResult;
            marketConditionStats.value = conditionStatsResult;
            priceDistribution.value = distributionResult;
        } catch (err) {
            error.value = err instanceof Error ? err.message : String(err);
            console.error('加载价格走势统计数据失败:', err);
        } finally {
            loading.value = false;
        }
    };

    /**
     * 比较不同天数的价格走势
     * @param patternType 十字星类型
     * @param marketCondition 市场环境
     * @returns 不同天数的上涨概率和平均涨跌幅
     */
    const compareDifferentDays = async (
        patternType: DojiType,
        marketCondition?: MarketCondition
    ): Promise<{
        days: number;
        upwardProbability: number;
        averageGain: number;
        averageLoss: number;
        averageChange: number;
    }[]> => {
        loading.value = true;
        error.value = null;

        try {
            // 分析不同天数的价格走势
            const days = [1, 3, 5, 10];

            const results = await Promise.all(
                days.map(async (day) => {
                    const probability = await statisticsService.calculateUpwardProbability(patternType, day, marketCondition);
                    const priceChange = await statisticsService.calculateAveragePriceChange(patternType, day, marketCondition);

                    return {
                        days: day,
                        upwardProbability: probability,
                        averageGain: priceChange.averageGain,
                        averageLoss: priceChange.averageLoss,
                        averageChange: priceChange.averageChange
                    };
                })
            );

            return results;
        } catch (err) {
            error.value = err instanceof Error ? err.message : String(err);
            console.error('比较不同天数的价格走势失败:', err);
            return [];
        } finally {
            loading.value = false;
        }
    };

    /**
     * 比较不同类型十字星的价格走势
     * @param days 天数
     * @param marketCondition 市场环境
     * @returns 不同类型十字星的上涨概率和平均涨跌幅
     */
    const comparePatternTypes = async (
        days: number,
        marketCondition?: MarketCondition
    ): Promise<{
        patternType: DojiType;
        upwardProbability: number;
        averageGain: number;
        averageLoss: number;
        averageChange: number;
    }[]> => {
        loading.value = true;
        error.value = null;

        try {
            // 分析不同类型十字星的价格走势
            const patternTypes: DojiType[] = ['standard', 'dragonfly', 'gravestone', 'longLegged'];

            const results = await Promise.all(
                patternTypes.map(async (type) => {
                    const probability = await statisticsService.calculateUpwardProbability(type, days, marketCondition);
                    const priceChange = await statisticsService.calculateAveragePriceChange(type, days, marketCondition);

                    return {
                        patternType: type,
                        upwardProbability: probability,
                        averageGain: priceChange.averageGain,
                        averageLoss: priceChange.averageLoss,
                        averageChange: priceChange.averageChange
                    };
                })
            );

            return results;
        } catch (err) {
            error.value = err instanceof Error ? err.message : String(err);
            console.error('比较不同类型十字星的价格走势失败:', err);
            return [];
        } finally {
            loading.value = false;
        }
    };

    /**
     * 重置状态
     */
    const reset = (): void => {
        upwardProbability.value = 0;
        averagePriceChange.value = {
            averageGain: 0,
            averageLoss: 0,
            averageChange: 0
        };
        marketConditionStats.value = {
            bull: { probability: 0, averageChange: 0, count: 0 },
            bear: { probability: 0, averageChange: 0, count: 0 },
            neutral: { probability: 0, averageChange: 0, count: 0 }
        };
        priceDistribution.value = [];
        error.value = null;
    };

    return {
        // 状态
        loading,
        error,

        // 统计数据
        upwardProbability,
        averagePriceChange,
        marketConditionStats,
        priceDistribution,

        // 计算属性
        riskRewardRatio,
        expectedValue,
        bestMarketCondition,

        // 方法
        loadStatistics,
        compareDifferentDays,
        comparePatternTypes,
        reset
    };
}