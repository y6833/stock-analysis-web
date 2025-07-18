import { KLineData } from '../../../../types/technical-analysis/kline';
import { DojiConfig } from '../../../../types/technical-analysis/doji';

/**
 * 标准十字星检测器
 * 专门用于检测标准十字星形态
 */
export class StandardDojiDetector {
    /**
     * 配置参数
     */
    private config: DojiConfig;

    /**
     * 默认配置
     */
    private static readonly DEFAULT_CONFIG: DojiConfig = {
        bodyThreshold: 0.1, // 实体与影线比例阈值
        equalPriceThreshold: 0.1, // 开盘收盘价相等的容差（百分比）
        longLegThreshold: 2.0, // 长腿十字星的影线长度阈值
    };

    /**
     * 构造函数
     * @param config 可选的配置参数
     */
    constructor(config?: Partial<DojiConfig>) {
        this.config = {
            ...StandardDojiDetector.DEFAULT_CONFIG,
            ...config,
        };
    }

    /**
     * 检测标准十字星
     * @param candle K线数据
     * @returns 是否为标准十字星
     */
    public detect(candle: KLineData): boolean {
        // 检查开盘价和收盘价是否相等（在容差范围内）
        if (!this.isPriceEqual(candle.open, candle.close)) {
            return false;
        }

        // 确保有上下影线
        const hasUpperShadow = candle.high > Math.max(candle.open, candle.close);
        const hasLowerShadow = candle.low < Math.min(candle.open, candle.close);

        // 检查实体大小与K线总长度的比例
        const bodyRatio = this.calculateBodyRatio(candle);
        if (bodyRatio > this.config.bodyThreshold) {
            return false; // 实体太大，不是标准十字星
        }

        // 标准十字星应该有上下影线
        return hasUpperShadow && hasLowerShadow;
    }

    /**
     * 检测标准十字星（带有敏感度参数）
     * @param candle K线数据
     * @param sensitivity 敏感度参数（0-1，值越大越敏感）
     * @returns 是否为标准十字星
     */
    public detectWithSensitivity(candle: KLineData, sensitivity: number): boolean {
        // 验证敏感度参数范围
        if (sensitivity < 0 || sensitivity > 1) {
            throw new Error('敏感度参数必须在0到1之间');
        }

        // 根据敏感度调整容差
        // 敏感度越高，容差越小，判定越严格
        const adjustedThreshold = this.config.equalPriceThreshold * (1 - sensitivity);

        // 检查开盘价和收盘价是否相等（在调整后的容差范围内）
        if (!this.isPriceEqualWithThreshold(candle.open, candle.close, adjustedThreshold)) {
            return false;
        }

        // 确保有上下影线
        const hasUpperShadow = candle.high > Math.max(candle.open, candle.close);
        const hasLowerShadow = candle.low < Math.min(candle.open, candle.close);

        // 根据敏感度调整影线要求
        // 敏感度越高，对影线长度的要求越严格
        const minShadowRatio = 0.1 + sensitivity * 0.2; // 最小影线比例随敏感度增加

        // 根据敏感度调整实体大小要求
        // 敏感度越高，对实体大小的要求越严格
        const maxBodyRatio = this.config.bodyThreshold * (1 - sensitivity * 0.5);

        const bodySize = Math.abs(candle.close - candle.open);
        const upperShadowSize = candle.high - Math.max(candle.open, candle.close);
        const lowerShadowSize = Math.min(candle.open, candle.close) - candle.low;

        const candleRange = candle.high - candle.low;

        // 避免除以零
        if (candleRange === 0) {
            return false;
        }

        const bodyRatio = bodySize / candleRange;
        const upperShadowRatio = upperShadowSize / candleRange;
        const lowerShadowRatio = lowerShadowSize / candleRange;

        // 标准十字星应该有足够明显的上下影线，且实体足够小
        return hasUpperShadow && hasLowerShadow &&
            upperShadowRatio >= minShadowRatio &&
            lowerShadowRatio >= minShadowRatio &&
            bodyRatio <= maxBodyRatio;
    }

    /**
     * 计算标准十字星的显著性
     * @param candle K线数据
     * @returns 显著性（0-1）
     */
    public calculateSignificance(candle: KLineData): number {
        // 如果不是标准十字星，显著性为0
        if (!this.detect(candle)) {
            return 0;
        }

        // 基础显著性：开盘价和收盘价的接近程度
        const priceEqualityScore = 1 - Math.abs(candle.open - candle.close) / ((candle.open + candle.close) / 2) * 100;
        let significance = priceEqualityScore * 0.4; // 权重40%

        // 标准十字星：上下影线平衡度
        const upperShadow = candle.high - Math.max(candle.open, candle.close);
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low;

        // 避免除以零的情况
        if (upperShadow + lowerShadow === 0) {
            return significance;
        }

        const shadowBalance = 1 - Math.abs(upperShadow - lowerShadow) / (upperShadow + lowerShadow);
        significance += shadowBalance * 0.6; // 权重60%

        // 确保显著性在0-1范围内
        return Math.max(0, Math.min(1, significance));
    }

    /**
     * 判断两个价格是否相等（在容差范围内）
     * @param price1 价格1
     * @param price2 价格2
     * @returns 是否相等
     */
    private isPriceEqual(price1: number, price2: number): boolean {
        return this.isPriceEqualWithThreshold(price1, price2, this.config.equalPriceThreshold);
    }

    /**
     * 判断两个价格是否相等（在指定容差范围内）
     * @param price1 价格1
     * @param price2 价格2
     * @param threshold 容差阈值（百分比）
     * @returns 是否相等
     */
    private isPriceEqualWithThreshold(price1: number, price2: number, threshold: number): boolean {
        if (price1 === price2) {
            return true;
        }

        // 避免除以零
        if (price1 === 0 && price2 === 0) {
            return true;
        }

        // 计算价格差异百分比
        const avgPrice = (price1 + price2) / 2;

        // 避免除以零
        if (avgPrice === 0) {
            return false;
        }

        const diffPercent = Math.abs(price1 - price2) / avgPrice * 100;

        // 如果差异百分比小于等于容差阈值，则认为价格相等
        return diffPercent <= threshold;
    }

    /**
     * 计算实体大小与K线总长度的比例
     * @param candle K线数据
     * @returns 实体比例
     */
    public calculateBodyRatio(candle: KLineData): number {
        const bodySize = Math.abs(candle.close - candle.open);
        const candleRange = candle.high - candle.low;

        // 避免除以零
        if (candleRange === 0) {
            return 0;
        }

        return bodySize / candleRange;
    }

    /**
     * 计算上下影线比例
     * @param candle K线数据
     * @returns 上下影线比例 {upper: number, lower: number}
     */
    public calculateShadowRatios(candle: KLineData): { upper: number, lower: number } {
        const upperShadow = candle.high - Math.max(candle.open, candle.close);
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
        const candleRange = candle.high - candle.low;

        // 避免除以零
        if (candleRange === 0) {
            return { upper: 0, lower: 0 };
        }

        return {
            upper: upperShadow / candleRange,
            lower: lowerShadow / candleRange
        };
    }

    /**
     * 更新配置
     * @param config 新的配置参数
     */
    public updateConfig(config: Partial<DojiConfig>): void {
        this.config = {
            ...this.config,
            ...config,
        };
    }

    /**
     * 获取当前配置
     * @returns 当前配置
     */
    public getConfig(): DojiConfig {
        return { ...this.config };
    }
}