import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarketEnvironmentClassifier } from '../../utils/MarketEnvironmentClassifier';
import { StockDataService } from '../../services/StockDataService';
import { KLineData } from '../../types/technical-analysis/kline';

// 模拟 StockDataService
const mockStockDataService: StockDataService = {
    getKLineData: vi.fn(),
    getIndexData: vi.fn(),
    getMarketStatus: vi.fn()
};

describe('MarketEnvironmentClassifier', () => {
    let classifier: MarketEnvironmentClassifier;

    beforeEach(() => {
        // 重置模拟函数
        vi.resetAllMocks();

        // 创建分类器实例
        classifier = new MarketEnvironmentClassifier(mockStockDataService);
    });

    it('应该正确判断牛市环境', async () => {
        // 模拟牛市数据：短期均线在长期均线上方，且20日涨幅大于5%
        const mockKlines: KLineData[] = [];

        // 生成60天的K线数据
        const basePrice = 3000;
        const baseVolume = 10000;
        const baseTimestamp = Date.now() - 60 * 86400000; // 60天前

        for (let i = 0; i < 60; i++) {
            // 前40天价格较低，后20天价格上涨
            const price = i < 40 ? basePrice : basePrice * (1 + (i - 40) * 0.01);

            mockKlines.push({
                timestamp: baseTimestamp + i * 86400000,
                open: price - 10,
                high: price + 20,
                low: price - 20,
                close: price,
                volume: baseVolume + i * 100
            });
        }

        // 设置模拟函数返回值
        (mockStockDataService.getIndexData as any).mockResolvedValue(mockKlines);

        // 获取市场环境
        const result = await classifier.getMarketCondition(Date.now());

        // 验证返回值
        expect(result).toBe('bull');
    });

    it('应该正确判断熊市环境', async () => {
        // 模拟熊市数据：短期均线在长期均线下方，且20日跌幅大于5%
        const mockKlines: KLineData[] = [];

        // 生成60天的K线数据
        const basePrice = 3000;
        const baseVolume = 10000;
        const baseTimestamp = Date.now() - 60 * 86400000; // 60天前

        for (let i = 0; i < 60; i++) {
            // 前40天价格较高，后20天价格下跌
            const price = i < 40 ? basePrice : basePrice * (1 - (i - 40) * 0.01);

            mockKlines.push({
                timestamp: baseTimestamp + i * 86400000,
                open: price + 10,
                high: price + 20,
                low: price - 20,
                close: price,
                volume: baseVolume + i * 100
            });
        }

        // 设置模拟函数返回值
        (mockStockDataService.getIndexData as any).mockResolvedValue(mockKlines);

        // 获取市场环境
        const result = await classifier.getMarketCondition(Date.now());

        // 验证返回值
        expect(result).toBe('bear');
    });

    it('应该正确判断中性市场环境', async () => {
        // 模拟中性市场数据：价格波动不大
        const mockKlines: KLineData[] = [];

        // 生成60天的K线数据
        const basePrice = 3000;
        const baseVolume = 10000;
        const baseTimestamp = Date.now() - 60 * 86400000; // 60天前

        for (let i = 0; i < 60; i++) {
            // 价格小幅波动
            const price = basePrice + Math.sin(i * 0.1) * 50;

            mockKlines.push({
                timestamp: baseTimestamp + i * 86400000,
                open: price - 10,
                high: price + 20,
                low: price - 20,
                close: price,
                volume: baseVolume + i * 100
            });
        }

        // 设置模拟函数返回值
        (mockStockDataService.getIndexData as any).mockResolvedValue(mockKlines);

        // 获取市场环境
        const result = await classifier.getMarketCondition(Date.now());

        // 验证返回值
        expect(result).toBe('neutral');
    });

    it('当数据不足时应该返回中性市场环境', async () => {
        // 模拟数据不足的情况
        (mockStockDataService.getIndexData as any).mockResolvedValue([]);

        // 获取市场环境
        const result = await classifier.getMarketCondition(Date.now());

        // 验证返回值
        expect(result).toBe('neutral');
    });

    it('应该能够设置和获取指数ID', () => {
        // 设置指数ID
        classifier.setIndexId('399001.SZ');

        // 获取指数ID
        const indexId = classifier.getIndexId();

        // 验证返回值
        expect(indexId).toBe('399001.SZ');
    });
});