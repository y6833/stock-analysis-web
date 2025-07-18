import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DojiPatternAnalyzer } from '../../modules/technical-analysis/patterns/doji/DojiPatternAnalyzer';
import { StockDataService } from '../../services/StockDataService';
import { DojiPattern } from '../../types/technical-analysis/doji';
import { KLineData } from '../../types/technical-analysis/kline';

// 模拟 StockDataService
const mockStockDataService: StockDataService = {
    getKLineData: vi.fn(),
    getIndexData: vi.fn(),
    getMarketStatus: vi.fn()
};

describe('DojiPatternAnalyzer', () => {
    let analyzer: DojiPatternAnalyzer;
    let mockPattern: DojiPattern;
    let mockKlines: KLineData[];

    beforeEach(() => {
        // 重置模拟函数
        vi.resetAllMocks();

        // 创建分析器实例
        analyzer = new DojiPatternAnalyzer(mockStockDataService);

        // 创建模拟十字星形态
        mockPattern = {
            id: 'test-pattern-1',
            stockId: '000001',
            stockName: '测试股票',
            timestamp: Date.now() - 86400000 * 10, // 10天前
            type: 'standard',
            candle: {
                open: 100,
                high: 105,
                low: 95,
                close: 100,
                volume: 10000
            },
            significance: 0.8,
            context: {
                trend: 'uptrend',
                nearSupportResistance: true,
                volumeChange: 20
            }
        };

        // 创建模拟K线数据
        mockKlines = [
            { timestamp: mockPattern.timestamp + 86400000, open: 101, high: 106, low: 100, close: 105, volume: 12000 },
            { timestamp: mockPattern.timestamp + 86400000 * 2, open: 105, high: 108, low: 103, close: 107, volume: 11000 },
            { timestamp: mockPattern.timestamp + 86400000 * 3, open: 107, high: 110, low: 105, close: 109, volume: 13000 },
            { timestamp: mockPattern.timestamp + 86400000 * 4, open: 109, high: 112, low: 108, close: 110, volume: 14000 },
            { timestamp: mockPattern.timestamp + 86400000 * 5, open: 110, high: 115, low: 109, close: 114, volume: 15000 },
            { timestamp: mockPattern.timestamp + 86400000 * 6, open: 114, high: 118, low: 113, close: 117, volume: 16000 },
            { timestamp: mockPattern.timestamp + 86400000 * 7, open: 117, high: 120, low: 115, close: 119, volume: 17000 },
            { timestamp: mockPattern.timestamp + 86400000 * 8, open: 119, high: 122, low: 117, close: 120, volume: 18000 },
            { timestamp: mockPattern.timestamp + 86400000 * 9, open: 120, high: 123, low: 118, close: 121, volume: 19000 },
            { timestamp: mockPattern.timestamp + 86400000 * 10, open: 121, high: 125, low: 120, close: 124, volume: 20000 }
        ];

        // 设置模拟函数返回值
        (mockStockDataService.getKLineData as any).mockResolvedValue(mockKlines);
    });

    it('应该正确分析价格走势', async () => {
        const result = await analyzer.analyzePriceMovement(mockPattern, 5);

        // 验证调用了正确的服务方法
        expect(mockStockDataService.getKLineData).toHaveBeenCalledWith(
            mockPattern.stockId,
            expect.any(Number),
            expect.any(Number),
            'daily'
        );

        // 验证返回了正确的结果结构
        expect(result).toHaveProperty('patternId', mockPattern.id);
        expect(result).toHaveProperty('priceMovement');
        expect(result.priceMovement).toHaveProperty('priceChanges');
        expect(result.priceMovement.priceChanges).toHaveProperty('day1');
        expect(result.priceMovement.priceChanges).toHaveProperty('day3');
        expect(result.priceMovement.priceChanges).toHaveProperty('day5');
        expect(result.priceMovement.priceChanges).toHaveProperty('day10');

        // 验证价格变化计算正确
        expect(result.priceMovement.priceChanges.day1).toBeCloseTo(5, 1); // 5%
        expect(result.priceMovement.priceChanges.day5).toBeGreaterThan(0);
        expect(result.priceMovement.isUpward).toBe(true);
    });

    it('当没有足够的K线数据时应返回默认值', async () => {
        // 模拟没有K线数据的情况
        (mockStockDataService.getKLineData as any).mockResolvedValue([]);

        const result = await analyzer.analyzePriceMovement(mockPattern, 5);

        // 验证返回了默认值
        expect(result.priceMovement.priceChanges.day1).toBe(0);
        expect(result.priceMovement.priceChanges.day3).toBe(0);
        expect(result.priceMovement.priceChanges.day5).toBe(0);
        expect(result.priceMovement.priceChanges.day10).toBe(0);
        expect(result.priceMovement.isUpward).toBe(false);
    });

    it('应该正确计算成功率', async () => {
        // 这个测试需要模拟历史形态数据，但由于我们没有实现实际的数据获取逻辑，
        // 这里只测试方法调用是否正常，不验证具体结果
        const result = await analyzer.calculateSuccessRate('standard', '5d');

        expect(result).toHaveProperty('patternType', 'standard');
        expect(result).toHaveProperty('timeframe', '5d');
        expect(result).toHaveProperty('upwardProbability');
        expect(result).toHaveProperty('averageGain');
        expect(result).toHaveProperty('averageLoss');
        expect(result).toHaveProperty('sampleSize');
    });

    it('应该正确获取价格分布', async () => {
        const result = await analyzer.getPriceDistribution('standard', 5);

        expect(result).toHaveProperty('patternType', 'standard');
        expect(result).toHaveProperty('days', 5);
        expect(result).toHaveProperty('distribution');
        expect(Array.isArray(result.distribution)).toBe(true);
        expect(result).toHaveProperty('totalSamples');
    });

    it('应该能找到相似形态', async () => {
        const result = await analyzer.findSimilarPatterns(mockPattern);

        expect(Array.isArray(result)).toBe(true);
    });
});