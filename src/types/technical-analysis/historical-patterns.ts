import { DojiPattern, DojiType } from './doji';
import { MarketCondition } from './kline';

/**
 * 历史形态查询参数
 */
export interface HistoricalPatternQueryParams {
    /**
     * 形态类型
     */
    patternType?: DojiType;

    /**
     * 股票ID
     */
    stockId?: string;

    /**
     * 开始时间戳
     */
    startTime?: number;

    /**
     * 结束时间戳
     */
    endTime?: number;

    /**
     * 市场环境
     */
    marketCondition?: MarketCondition;

    /**
     * 最小显著性
     */
    minSignificance?: number;

    /**
     * 是否上涨
     */
    isUpward?: boolean;

    /**
     * 排序字段
     */
    sortBy?: 'timestamp' | 'significance' | 'priceChange';

    /**
     * 排序方向
     */
    sortDirection?: 'asc' | 'desc';

    /**
     * 页码
     */
    page?: number;

    /**
     * 每页数量
     */
    pageSize?: number;
}

/**
 * 历史形态查询结果
 */
export interface HistoricalPatternQueryResult {
    /**
     * 形态列表
     */
    patterns: (DojiPattern & {
        /**
         * 价格变化
         */
        priceChange?: {
            /**
             * 1天后的价格变化百分比
             */
            day1: number;
            /**
             * 3天后的价格变化百分比
             */
            day3: number;
            /**
             * 5天后的价格变化百分比
             */
            day5: number;
            /**
             * 10天后的价格变化百分比
             */
            day10: number;
        };
        /**
         * 是否上涨（基于5天价格变化）
         */
        isUpward?: boolean;
    })[];

    /**
     * 总数
     */
    total: number;

    /**
     * 页码
     */
    page: number;

    /**
     * 每页数量
     */
    pageSize: number;

    /**
     * 总页数
     */
    totalPages: number;
}

/**
 * 相似形态查询参数
 */
export interface SimilarPatternQueryParams {
    /**
     * 形态ID
     */
    patternId: string;

    /**
     * 最大结果数
     */
    limit?: number;

    /**
     * 最小相似度
     */
    minSimilarity?: number;
}

/**
 * 相似形态查询结果
 */
export interface SimilarPatternQueryResult {
    /**
     * 原始形态
     */
    originalPattern: DojiPattern;

    /**
     * 相似形态列表
     */
    similarPatterns: (DojiPattern & {
        /**
         * 相似度
         */
        similarity: number;
        /**
         * 价格变化
         */
        priceChange?: {
            /**
             * 1天后的价格变化百分比
             */
            day1: number;
            /**
             * 3天后的价格变化百分比
             */
            day3: number;
            /**
             * 5天后的价格变化百分比
             */
            day5: number;
            /**
             * 10天后的价格变化百分比
             */
            day10: number;
        };
        /**
         * 是否上涨（基于5天价格变化）
         */
        isUpward?: boolean;
    })[];
}