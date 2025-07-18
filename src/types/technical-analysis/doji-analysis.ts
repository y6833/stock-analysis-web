import { DojiPattern, DojiType } from './doji';
import { MarketCondition } from './kline';

/**
 * 价格变动分析
 */
export interface PriceMovement {
    /**
     * 形态ID
     */
    patternId: string;
    /**
     * 股票ID
     */
    stockId: string;
    /**
     * 形态日期
     */
    patternDate: number;
    /**
     * 价格变化
     */
    priceChanges: {
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
     * 成交量变化
     */
    volumeChanges: {
        /**
         * 1天后的成交量变化百分比
         */
        day1: number;
        /**
         * 3天后的成交量变化百分比
         */
        day3: number;
        /**
         * 5天后的成交量变化百分比
         */
        day5: number;
    };
    /**
     * 是否上涨（基于5天价格变化）
     */
    isUpward: boolean;
}

/**
 * 价格分布
 */
export interface PriceDistribution {
    /**
     * 形态类型
     */
    patternType: DojiType;
    /**
     * 天数
     */
    days: number;
    /**
     * 分布数据
     */
    distribution: {
        /**
         * 区间
         */
        range: string;
        /**
         * 数量
         */
        count: number;
        /**
         * 百分比
         */
        percentage: number;
    }[];
    /**
     * 样本总数
     */
    totalSamples: number;
}

/**
 * 成功率统计
 */
export interface SuccessRateStats {
    /**
     * 形态类型
     */
    patternType: DojiType;
    /**
     * 时间周期
     */
    timeframe: string;
    /**
     * 市场环境
     */
    marketCondition?: MarketCondition;
    /**
     * 上涨概率
     */
    upwardProbability: number;
    /**
     * 平均涨幅
     */
    averageGain: number;
    /**
     * 平均跌幅
     */
    averageLoss: number;
    /**
     * 样本数量
     */
    sampleSize: number;
}

/**
 * 价格走势分析
 */
export interface PriceMovementAnalysis {
    /**
     * 形态ID
     */
    patternId: string;
    /**
     * 价格变动
     */
    priceMovement: PriceMovement;
    /**
     * 历史平均表现
     */
    historicalAverage: {
        /**
         * 上涨概率
         */
        upwardProbability: number;
        /**
         * 平均涨幅
         */
        averageGain: number;
    };
    /**
     * 相似形态
     */
    similarPatterns: {
        /**
         * 形态ID
         */
        patternId: string;
        /**
         * 相似度
         */
        similarity: number;
        /**
         * 价格变动
         */
        priceMovement: PriceMovement;
    }[];
}

/**
 * 十字星分析器接口
 */
export interface IDojiPatternAnalyzer {
    /**
     * 分析价格走势
     * @param pattern 十字星形态
     * @param days 天数
     * @returns 价格走势分析
     */
    analyzePriceMovement(pattern: DojiPattern, days: number): Promise<PriceMovementAnalysis>;

    /**
     * 计算成功率
     * @param patternType 形态类型
     * @param timeframe 时间周期
     * @param marketCondition 市场环境
     * @returns 成功率统计
     */
    calculateSuccessRate(
        patternType: DojiType,
        timeframe: string,
        marketCondition?: MarketCondition
    ): Promise<SuccessRateStats>;

    /**
     * 获取价格分布
     * @param patternType 形态类型
     * @param days 天数
     * @returns 价格分布
     */
    getPriceDistribution(patternType: DojiType, days: number): Promise<PriceDistribution>;

    /**
     * 查找相似形态
     * @param pattern 十字星形态
     * @returns 相似形态列表
     */
    findSimilarPatterns(pattern: DojiPattern): Promise<DojiPattern[]>;
}