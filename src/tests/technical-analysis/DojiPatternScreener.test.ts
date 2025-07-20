import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DojiPatternScreener } from '../../modules/technical-analysis/patterns/doji/DojiPatternScreener';
import { StockDataService } from '../../services/StockDataService';
import { DojiPatternAnalyzer } from '../../modules/technical-analysis/patterns/doji/DojiPatternAnalyzer';
import { DojiPattern } from '../../types/technical-analysis/doji';
import { KLineData } from '../../types/technical-analysis/kline';

// 模拟 StockDataService
const mockStockDataService = {
    getKLineData: vi.fn(),
    getStockList: vi.fn(),
    getPatternHistory: vi.fn(),
    getIndexData: vi.fn(),
    getMarketStatus: vi.fn()
};

// 模拟 DojiPatternAnalyzer
const mockDojiPatternAnalyzer = {
    analyzePriceMovement: vi.fn(),
    calculateSuccessRate: vi.fn(),
    getPriceDistribution: vi.fn(),
    findSimilarPatterns: vi.fn()
};

describe('DojiPatternScreener', () => {
    let screener: DojiPatternScreener;
    let mockPatterns: DojiPattern[];
    let mockStocks: { id: string, name: string }[];
    let mockKlines: { [key: string]: KLineData[] };

    beforeEach(() => {
        // 重置模拟函数
        vi.resetAllMocks();

        // 创建筛选器实例
        screener = new DojiPatternScreener(
            mockStockDataService as unknown as StockDataService,
            mockDojiPatternAnalyzer as unknown as DojiPatternAnalyzer
        );

        // 创建模拟股票列表
        mockStocks = [
            { id: '000001', name: '平安银行' },
            { id: '000002', name: '万科A' },
            { id: '000003', name: '国华网安' },
            { id: '000004', name: '国农科技' },
            { id: '000005', name: '世纪星源' }
        ];

        // 创建模拟十字星形态
        mockPatterns = [
            {
                id: 'pattern-1',
                stockId: '000001',
                stockName: '平安银行',
                timestamp: Date.now() - 86400000 * 3, // 3天前
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
            },
            {
                id: 'pattern-2',
                stockId: '000002',
                stockName: '万科A',
                timestamp: Date.now() - 86400000 * 2, // 2天前
                type: 'dragonfly',
                candle: {
                    open: 50,
                    high: 50,
                    low: 45,
                    close: 50,
                    volume: 15000
                },
                significance: 0.9,
                context: {
                    trend: 'downtrend',
                    nearSupportResistance: true,
                    volumeChange: 30
                }
            },
            {
                id: 'pattern-3',
                stockId: '000003',
                stockName: '国华网安',
                timestamp: Date.now() - 86400000 * 1, // 1天前
                type: 'gravestone',
                candle: {
                    open: 30,
                    high: 35,
                    low: 30,
                    close: 30,
                    volume: 8000
                },
                significance: 0.7,
                context: {
                    trend: 'sideways',
                    nearSupportResistance: false,
                    volumeChange: 10
                }
            }
        ];

        // 创建模拟K线数据
        mockKlines = {
            '000001': [
                { timestamp: mockPatterns[0].timestamp, open: 100, high: 105, low: 95, close: 100, volume: 10000 },
                { timestamp: mockPatterns[0].timestamp + 86400000, open: 101, high: 106, low: 100, close: 105, volume: 12000 },
                { timestamp: mockPatterns[0].timestamp + 86400000 * 2, open: 105, high: 108, low: 103, close: 107, volume: 11000 },
                { timestamp: mockPatterns[0].timestamp + 86400000 * 3, open: 107, high: 110, low: 105, close: 109, volume: 13000 }
            ],
            '000002': [
                { timestamp: mockPatterns[1].timestamp, open: 50, high: 50, low: 45, close: 50, volume: 15000 },
                { timestamp: mockPatterns[1].timestamp + 86400000, open: 51, high: 52, low: 49, close: 51, volume: 14000 },
                { timestamp: mockPatterns[1].timestamp + 86400000 * 2, open: 51, high: 53, low: 50, close: 52, volume: 16000 }
            ],
            '000003': [
                { timestamp: mockPatterns[2].timestamp, open: 30, high: 35, low: 30, close: 30, volume: 8000 },
                { timestamp: mockPatterns[2].timestamp + 86400000, open: 29, high: 30, low: 28, close: 29, volume: 7000 }
            ]
        };

        // 设置模拟函数返回值
        mockStockDataService.getStockList.mockResolvedValue(mockStocks);
        mockStockDataService.getPatternHistory.mockImplementation((stockId, days) => {
            return Promise.resolve(mockPatterns.filter(p => p.stockId === stockId));
        });
        mockStockDataService.getKLineData.mockImplementation((stockId, startTime, endTime) => {
            return Promise.resolve(mockKlines[stockId] || []);
        });

        // 设置价格走势分析模拟返回值
        mockDojiPatternAnalyzer.analyzePriceMovement.mockImplementation((pattern, days) => {
            const stockId = pattern.stockId;
            const klines = mockKlines[stockId] || [];
            const patternIndex = klines.findIndex(k => k.timestamp === pattern.timestamp);

            if (patternIndex === -1 || patternIndex + 1 >= klines.length) {
                return Promise.resolve({
                    patternId: pattern.id,
                    priceMovement: {
                        priceChanges: { day1: 0, day3: 0, day5: 0, day10: 0 },
                        volumeChanges: { day1: 0, day3: 0, day5: 0 },
                        isUpward: false
                    }
                });
            }

            const nextCandle = klines[patternIndex + 1];
            const priceChange = ((nextCandle.close - pattern.candle.close) / pattern.candle.close) * 100;

            return Promise.resolve({
                patternId: pattern.id,
                priceMovement: {
                    priceChanges: {
                        day1: priceChange,
                        day3: stockId === '000001' ? 9 : (stockId === '000002' ? 4 : -3),
                        day5: stockId === '000001' ? 14 : (stockId === '000002' ? 6 : -5),
                        day10: stockId === '000001' ? 20 : (stockId === '000002' ? 10 : -8)
                    },
                    volumeChanges: {
                        day1: ((nextCandle.volume - pattern.candle.volume) / pattern.candle.volume) * 100,
                        day3: 15,
                        day5: 20
                    },
                    isUpward: stockId !== '000003' // 000001和000002上涨，000003下跌
                }
            });
        });
    });

    it('应该正确筛选最近出现十字星的股票', async () => {
        const result = await screener.getRecentPatterns(5);

        // 验证调用了正确的服务方法
        expect(mockStockDataService.getStockList).toHaveBeenCalled();
        expect(mockStockDataService.getPatternHistory).toHaveBeenCalled();

        // 验证返回了正确的结果
        expect(result.length).toBe(3);
        expect(result[0].stockId).toBe('000003'); // 最近的排在前面
        expect(result[1].stockId).toBe('000002');
        expect(result[2].stockId).toBe('000001');
    });

    it('应该正确筛选特定类型的十字星', async () => {
        const result = await screener.getRecentPatterns(5, 'standard');

        // 验证返回了正确的结果
        expect(result.length).toBe(1);
        expect(result[0].stockId).toBe('000001');
        expect(result[0].patternType).toBe('standard');
    });

    it('应该正确筛选出现十字星后上涨的股票', async () => {
        const result = await screener.getUpwardStocksAfterDoji(5);

        // 验证调用了正确的服务方法
        expect(mockStockDataService.getStockList).toHaveBeenCalled();
        expect(mockStockDataService.getPatternHistory).toHaveBeenCalled();
        expect(mockDojiPatternAnalyzer.analyzePriceMovement).toHaveBeenCalled();

        // 验证返回了正确的结果
        expect(result.length).toBe(2); // 只有000001和000002上涨
        expect(result[0].stockId).toBe('000002'); // 按上涨幅度排序
        expect(result[1].stockId).toBe('000001');
    });

    it('应该根据最小上涨幅度筛选股票', async () => {
        const result = await screener.getUpwardStocksAfterDoji(5, 8);

        // 验证返回了正确的结果
        expect(result.length).toBe(1); // 只有000001上涨超过8%
        expect(result[0].stockId).toBe('000001');
    });

    it('应该根据筛选条件筛选股票', async () => {
        const criteria = {
            patternTypes: ['standard', 'dragonfly'],
            daysRange: 5,
            minUpwardPercent: 3,
            sortBy: 'priceChange' as const,
            sortDirection: 'desc' as const,
            limit: 10
        };

        const result = await screener.screenStocks(criteria);

        // 验证返回了正确的结果
        expect(result.length).toBe(2); // 只有000001和000002符合条件
        expect(result[0].stockId).toBe('000001'); // 按价格变化排序
        expect(result[1].stockId).toBe('000002');
    });

    it('应该处理空结果情况', async () => {
        // 模拟没有形态的情况
        mockStockDataService.getPatternHistory.mockResolvedValue([]);

        const result = await screener.getRecentPatterns(5);

        // 验证返回了空数组
        expect(result.length).toBe(0);
    });

    it('应该处理服务错误情况', async () => {
        // 模拟服务错误
        mockStockDataService.getStockList.mockRejectedValue(new Error('服务错误'));

        // 验证错误被正确处理
        await expect(screener.getRecentPatterns(5)).rejects.toThrow('服务错误');
    });

    it('应该正确处理分页', async () => {
        const criteria = {
            patternTypes: ['standard', 'dragonfly', 'gravestone'],
            daysRange: 5,
            sortBy: 'patternDate' as const,
            sortDirection: 'desc' as const,
            limit: 2,
            page: 1
        };

        const result = await screener.screenStocks(criteria);

        // 验证返回了正确的分页结果
        expect(result.length).toBe(2);
        expect(result[0].stockId).toBe('000003');
        expect(result[1].stockId).toBe('000002');

        // 测试第二页
        criteria.page = 2;
        const page2Result = await screener.screenStocks(criteria);

        expect(page2Result.length).toBe(1);
        expect(page2Result[0].stockId).toBe('000001');
    });

    it('应该正确处理排序', async () => {
        // 按形态显著性排序
        const criteria = {
            patternTypes: ['standard', 'dragonfly', 'gravestone'],
            daysRange: 5,
            sortBy: 'significance' as const,
            sortDirection: 'desc' as const,
            limit: 10
        };

        const result = await screener.screenStocks(criteria);

        // 验证返回了正确的排序结果
        expect(result.length).toBe(3);
        expect(result[0].stockId).toBe('000002'); // 显著性0.9
        expect(result[1].stockId).toBe('000001'); // 显著性0.8
        expect(result[2].stockId).toBe('000003'); // 显著性0.7
    });

    it('应该支持订阅形态通知', () => {
        const stockIds = ['000001', '000002'];
        const patternTypes = ['standard', 'dragonfly'];

        // 这个测试主要验证方法调用不会抛出异常
        expect(() => {
            screener.subscribeToPatterns(stockIds, patternTypes);
        }).not.toThrow();
    });
});