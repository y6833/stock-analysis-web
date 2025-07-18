import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PriceMovementStatisticsService } from '../../services/PriceMovementStatisticsService';
import { StockDataService } from '../../services/StockDataService';
import { DojiType } from '../../types/technical-analysis/doji';
import { MarketCondition } from '../../types/technical-analysis/kline';

// 模拟 StockDataService
const mockStockDataService: StockDataService = {
    getKLineData: vi.fn(),
    getIndexData: vi.fn(),
    getMarketStatus: vi.fn()
};

describe('PriceMovementStatisticsService', () => {
    let service: PriceMovementStatisticsService;

    beforeEach(() => {
        // 重置模拟函数
        vi.resetAllMocks();

        // 创建服务实例
        service = new PriceMovementStatisticsService(mockStockDataService);
    });

    it('应该正确计算上涨概率', async () => {
        const patternType: DojiType = 'standard';
        const days = 5;

        const result = await service.calculateUpwardProbability(patternType, days);

        // 验证返回值类型
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
    });

    it('应该正确计算平均涨跌幅', async () => {
        const patternType: DojiType = 'dragonfly';
        const days = 3;

        const result = await service.calculateAveragePriceChange(patternType, days);

        // 验证返回值结构
        expect(result).toHaveProperty('averageGain');
        expect(result).toHaveProperty('averageLoss');
        expect(result).toHaveProperty('averageChange');

        // 验证数值类型
        expect(typeof result.averageGain).toBe('number');
        expect(typeof result.averageLoss).toBe('number');
        expect(typeof result.averageChange).toBe('number');
    });

    it('应该正确计算市场环境分类统计', async () => {
        const patternType: DojiType = 'longLegged';
        const days = 5;

        const result = await service.calculateMarketConditionStats(patternType, days);

        // 验证返回值结构
        expect(result).toHaveProperty('bull');
        expect(result).toHaveProperty('bear');
        expect(result).toHaveProperty('neutral');

        // 验证每个市场环境的数据结构
        const marketConditions: MarketCondition[] = ['bull', 'bear', 'neutral'];
        marketConditions.forEach(condition => {
            expect(result[condition]).toHaveProperty('probability');
            expect(result[condition]).toHaveProperty('averageChange');
            expect(result[condition]).toHaveProperty('count');

            expect(typeof result[condition].probability).toBe('number');
            expect(typeof result[condition].averageChange).toBe('number');
            expect(typeof result[condition].count).toBe('number');
        });
    });

    it('应该正确获取价格变化分布', async () => {
        const patternType: DojiType = 'gravestone';
        const days = 10;

        const result = await service.getPriceChangeDistribution(patternType, days);

        // 验证返回值是数组
        expect(Array.isArray(result)).toBe(true);

        // 验证数组元素结构
        if (result.length > 0) {
            expect(result[0]).toHaveProperty('range');
            expect(result[0]).toHaveProperty('count');
            expect(result[0]).toHaveProperty('percentage');

            expect(typeof result[0].range).toBe('string');
            expect(typeof result[0].count).toBe('number');
            expect(typeof result[0].percentage).toBe('number');
        }
    });

    it('在不同市场环境下应该返回不同的统计结果', async () => {
        const patternType: DojiType = 'standard';
        const days = 5;

        // 获取不同市场环境下的上涨概率
        const bullProb = await service.calculateUpwardProbability(patternType, days, 'bull');
        const bearProb = await service.calculateUpwardProbability(patternType, days, 'bear');

        // 牛市环境下的上涨概率应该高于熊市
        expect(bullProb).toBeGreaterThan(bearProb);
    });
});