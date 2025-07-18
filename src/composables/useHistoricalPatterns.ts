import { ref, computed } from 'vue';
import { HistoricalPatternServiceImpl } from '../services/HistoricalPatternService';
import type { DojiPattern, DojiType } from '../types/technical-analysis/doji';
import type { MarketCondition } from '../types/technical-analysis/kline';
import type {
    HistoricalPatternQueryParams,
    HistoricalPatternQueryResult,
    SimilarPatternQueryParams,
    SimilarPatternQueryResult
} from '../types/technical-analysis/historical-patterns';

/**
 * 历史形态Hook
 * @param apiBaseUrl API基础URL
 * @param useMock 是否使用模拟数据
 * @returns 历史形态相关方法和状态
 */
export function useHistoricalPatterns(apiBaseUrl: string = '/api', useMock: boolean = true) {
    // 创建历史形态服务
    const service = new HistoricalPatternServiceImpl(apiBaseUrl);

    // 状态
    const loading = ref(false);
    const error = ref<string | null>(null);

    // 查询结果
    const queryResult = ref<HistoricalPatternQueryResult>({
        patterns: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0
    });

    // 相似形态结果
    const similarResult = ref<SimilarPatternQueryResult>({
        originalPattern: {
            id: '',
            stockId: '',
            stockName: '',
            timestamp: 0,
            type: 'standard',
            candle: {
                open: 0,
                high: 0,
                low: 0,
                close: 0,
                volume: 0
            },
            significance: 0,
            context: {
                trend: 'sideways',
                nearSupportResistance: false,
                volumeChange: 0
            }
        },
        similarPatterns: []
    });

    // 当前形态
    const currentPattern = ref<DojiPattern | null>(null);

    // 计算属性
    const patterns = computed(() => queryResult.value.patterns);
    const total = computed(() => queryResult.value.total);
    const currentPage = computed(() => queryResult.value.page);
    const totalPages = computed(() => queryResult.value.totalPages);
    const hasNextPage = computed(() => currentPage.value < totalPages.value);
    const hasPrevPage = computed(() => currentPage.value > 1);
    const similarPatterns = computed(() => similarResult.value.similarPatterns);

    /**
     * 查询历史形态
     * @param params 查询参数
     */
    const queryHistoricalPatterns = async (params: HistoricalPatternQueryParams): Promise<void> => {
        loading.value = true;
        error.value = null;

        try {
            // 使用模拟数据或实际API
            const result = useMock
                ? await (service as HistoricalPatternServiceImpl).mockQueryHistoricalPatterns(params)
                : await service.queryHistoricalPatterns(params);

            queryResult.value = result;
        } catch (err) {
            error.value = err instanceof Error ? err.message : String(err);
            console.error('查询历史形态失败:', err);
        } finally {
            loading.value = false;
        }
    };

    /**
     * 查询相似形态
     * @param params 查询参数
     */
    const querySimilarPatterns = async (params: SimilarPatternQueryParams): Promise<void> => {
        loading.value = true;
        error.value = null;

        try {
            // 使用模拟数据或实际API
            const result = useMock
                ? await (service as HistoricalPatternServiceImpl).mockQuerySimilarPatterns(params)
                : await service.querySimilarPatterns(params);

            similarResult.value = result;
        } catch (err) {
            error.value = err instanceof Error ? err.message : String(err);
            console.error('查询相似形态失败:', err);
        } finally {
            loading.value = false;
        }
    };

    /**
     * 获取形态详情
     * @param patternId 形态ID
     */
    const getPatternDetails = async (patternId: string): Promise<void> => {
        loading.value = true;
        error.value = null;

        try {
            // 使用模拟数据或实际API
            const result = useMock
                ? await (service as HistoricalPatternServiceImpl).mockGetPatternDetails(patternId)
                : await service.getPatternDetails(patternId);

            currentPattern.value = result;
        } catch (err) {
            error.value = err instanceof Error ? err.message : String(err);
            console.error('获取形态详情失败:', err);
            currentPattern.value = null;
        } finally {
            loading.value = false;
        }
    };

    /**
     * 转到下一页
     */
    const nextPage = async (): Promise<void> => {
        if (hasNextPage.value) {
            await queryHistoricalPatterns({
                ...getQueryParams(),
                page: currentPage.value + 1
            });
        }
    };

    /**
     * 转到上一页
     */
    const prevPage = async (): Promise<void> => {
        if (hasPrevPage.value) {
            await queryHistoricalPatterns({
                ...getQueryParams(),
                page: currentPage.value - 1
            });
        }
    };

    /**
     * 转到指定页
     * @param page 页码
     */
    const goToPage = async (page: number): Promise<void> => {
        if (page >= 1 && page <= totalPages.value) {
            await queryHistoricalPatterns({
                ...getQueryParams(),
                page
            });
        }
    };

    /**
     * 获取当前查询参数
     * @returns 查询参数
     */
    const getQueryParams = (): HistoricalPatternQueryParams => {
        // 从当前查询结果中提取查询参数
        // 这里只是一个简单的实现，实际应用中可能需要更复杂的逻辑
        return {
            page: queryResult.value.page,
            pageSize: queryResult.value.pageSize
        };
    };

    /**
     * 重置状态
     */
    const reset = (): void => {
        queryResult.value = {
            patterns: [],
            total: 0,
            page: 1,
            pageSize: 10,
            totalPages: 0
        };
        similarResult.value = {
            originalPattern: {
                id: '',
                stockId: '',
                stockName: '',
                timestamp: 0,
                type: 'standard',
                candle: {
                    open: 0,
                    high: 0,
                    low: 0,
                    close: 0,
                    volume: 0
                },
                significance: 0,
                context: {
                    trend: 'sideways',
                    nearSupportResistance: false,
                    volumeChange: 0
                }
            },
            similarPatterns: []
        };
        currentPattern.value = null;
        error.value = null;
    };

    return {
        // 状态
        loading,
        error,

        // 查询结果
        queryResult,
        patterns,
        total,
        currentPage,
        totalPages,
        hasNextPage,
        hasPrevPage,

        // 相似形态结果
        similarResult,
        similarPatterns,

        // 当前形态
        currentPattern,

        // 方法
        queryHistoricalPatterns,
        querySimilarPatterns,
        getPatternDetails,
        nextPage,
        prevPage,
        goToPage,
        reset
    };
}