import { ref, computed } from 'vue';
import { DojiPatternAnalyzer } from '../modules/technical-analysis/patterns/doji/DojiPatternAnalyzer';
import { StockDataServiceImpl } from '../services/StockDataService';
import type { DojiPattern, DojiType } from '../types/technical-analysis/doji';
import type { MarketCondition } from '../types/technical-analysis/kline';
import type { PriceMovementAnalysis, SuccessRateStats, PriceDistribution } from '../types/technical-analysis/doji-analysis';

/**
 * 十字星形态分析Hook
 * @param apiBaseUrl API基础URL
 * @returns 十字星形态分析相关方法和状态
 */
export function useDojiPatternAnalysis(apiBaseUrl: string = '/api') {
    // 创建股票数据服务
    const stockDataService = new StockDataServiceImpl(apiBaseUrl);

    // 创建十字星分析器
    const analyzer = new DojiPatternAnalyzer(stockDataService);

    // 状态
    const loading = ref(false);
    const error = ref<string | null>(null);

    // 分析结果
    const priceMovementAnalysis = ref<PriceMovementAnalysis | null>(null);
    const successRateStats = ref<SuccessRateStats | null>(null);
    const priceDistribution = ref<PriceDistribution | null>(null);
    const similarPatterns = ref<DojiPattern[]>([]);

    // 计算属性
    const isUpward = computed(() => priceMovementAnalysis.value?.priceMovement.isUpward || false);
    const upwardProbability = computed(() => successRateStats.value?.upwardProbability || 0);
    const averageGain = computed(() => successRateStats.value?.averageGain || 0);
    const averageLoss = computed(() => successRateStats.value?.averageLoss || 0);

    /**
     * 分析价格走势
     * @param pattern 十字星形态
     * @param days 天数
     */
    const analyzePriceMovement = async (pattern: DojiPattern, days: number = 5): Promise<void> => {
        loading.value = true;
        error.value = null;

        try {
            priceMovementAnalysis.value = await analyzer.analyzePriceMovement(pattern, days);
        } catch (err) {
            error.value = err instanceof Error ? err.message : String(err);
            console.error('分析价格走势失败:', err);
        } finally {
            loading.value = false;
        }
    };

    /**
     * 计算成功率
     * @param patternType 形态类型
     * @param timeframe 时间周期
     * @param marketCondition 市场环境
     */
    const calculateSuccessRate = async (
        patternType: DojiType,
        timeframe: string,
        marketCondition?: MarketCondition
    ): Promise<void> => {
        loading.value = true;
        error.value = null;

        try {
            successRateStats.value = await analyzer.calculateSuccessRate(patternType, timeframe, marketCondition);
        } catch (err) {
            error.value = err instanceof Error ? err.message : String(err);
            console.error('计算成功率失败:', err);
        } finally {
            loading.value = false;
        }
    };

    /**
     * 获取价格分布
     * @param patternType 形态类型
     * @param days 天数
     */
    const getPriceDistribution = async (patternType: DojiType, days: number): Promise<void> => {
        loading.value = true;
        error.value = null;

        try {
            priceDistribution.value = await analyzer.getPriceDistribution(patternType, days);
        } catch (err) {
            error.value = err instanceof Error ? err.message : String(err);
            console.error('获取价格分布失败:', err);
        } finally {
            loading.value = false;
        }
    };

    /**
     * 查找相似形态
     * @param pattern 十字星形态
     */
    const findSimilarPatterns = async (pattern: DojiPattern): Promise<void> => {
        loading.value = true;
        error.value = null;

        try {
            similarPatterns.value = await analyzer.findSimilarPatterns(pattern);
        } catch (err) {
            error.value = err instanceof Error ? err.message : String(err);
            console.error('查找相似形态失败:', err);
        } finally {
            loading.value = false;
        }
    };

    /**
     * 重置状态
     */
    const reset = (): void => {
        priceMovementAnalysis.value = null;
        successRateStats.value = null;
        priceDistribution.value = null;
        similarPatterns.value = [];
        error.value = null;
    };

    return {
        // 状态
        loading,
        error,

        // 分析结果
        priceMovementAnalysis,
        successRateStats,
        priceDistribution,
        similarPatterns,

        // 计算属性
        isUpward,
        upwardProbability,
        averageGain,
        averageLoss,

        // 方法
        analyzePriceMovement,
        calculateSuccessRate,
        getPriceDistribution,
        findSimilarPatterns,
        reset
    };
}