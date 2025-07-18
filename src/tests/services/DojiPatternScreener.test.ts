import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DojiPatternScreener } from '../../services/DojiPatternScreener';
import { HistoricalPatternServiceImpl } from '../../services/HistoricalPatternService';
import { StockDataServiceImpl } from '../../services/StockDataService';
import { DojiType } from '../../types/technical-analysis/doji';
import { MarketCondition } from '../../types/technical-analysis/kline';

// 模拟服务
vi.mock('../../services/HistoricalPatternService', () => {
    return {
        HistoricalPatternServiceImpl: vi.fn().mockImplementation(() => ({
            queryHistoricalPatterns: vi.fn().mockImplementation(async (params) => {
                // 模拟查询结果
                const patterns = [];
                const totalCount = 10;

                for (let i = 0; i < 5; i++) {
                    const patternType = params.patternType || ['standard', 'dragonfly', 'gravestone', 'longLegged'][i % 4] as DojiType;
                    const timestamp = Date.now() - i * 86400000;
                    const stockId = `${600000 + i}`;
                    const priceChange = i * 2 + 1; // 1%, 3%, 5%, 7%, 9%

                    patterns.push({
                        id: `test-pattern-${i}`,
                        stockId,
                        stockName: `测试股票${i}`,
                        timestamp,
                        type: patternType,
                        candle: {
                            open: 100,
                            high: 105,
                            low: 95,
                            close: 100,
                            volume: 10000 + i * 100
                        },
                        significance: 0.5 + i * 0.1,
                        context: {
                            trend: 'uptrend',
                            nearSupportResistance: true,
                            volumeChange: 10 + i * 5
                        },
                        priceChange: {
                            day1: priceChange / 2,
                            day3: priceChange * 0.8,
                            day5: priceChange,
                            day10: priceChange * 1.2
                        },
                        isUpward: priceChange > 0
                    });
                }

                return {
                    patterns,
                    total: totalCount,
                    page: params.page || 1,
                    pageSize: params.pageSize || 10,
                    totalPages: Math.ceil(totalCount / (params.pageSize || 10))
                };
            }),

            querySimilarPatterns: vi.fn(),
            getPatternDetails: vi.fn()
        }))
    };
});

vi.mock('../../services/StockDataService', () => {
    return {
        StockDataServiceImpl: vi.fn().mockImplementation(() => ({
            getKLineData: vi.fn().mockImplementation(async (stockId, startTime, endTime) => {
                // 模拟K线数据
                const klines = [];
                const days = Math.ceil((endTime - startTime) / (24 * 60 * 60 * 1000));

                for (let i = 0; i < days; i++) {
                    klines.push({
                        timestamp: startTime + i * 24 * 60 * 60 * 1000,
                        open: 100 + i,
                        high: 105 + i,
                        low: 95 + i,
                        close: 100 + i * 2,
                        volume: 10000 + i * 100
                    });
                }

                return klines;
            }),

            getIndexData: vi.fn(),
            getMarketStatus: vi.fn().mockResolvedValue('neutral')
        }))
    };
});

describe('DojiPatternScreener', () => {
    let screener: DojiPatternScreener;
    let historicalPatternService: HistoricalPatternServiceImpl;
    let stockDataService: StockDataServiceImpl;

    beforeEach(() => {
        historicalPatternService = new HistoricalPatternServiceImpl();
        stockDataService = new StockDataServiceImpl();
        screener = new DojiPatternScreener(historicalPatternService, stockDataService);
    });

    describe('screenStocks', () => {
        it('应该根据筛选条件返回股票列表', async () => {
            const criteria = {
                patternTypes: ['standard' as DojiType],
                daysRange: 7,
                minUpwardPercent: 3.0,
                sortBy: 'priceChange' as const,
                sortDirection: 'desc' as const,
                limit: 10
            };

            const result = await screener.screenStocks(criteria);

            expect(result).toBeDefined();
            expect(result.stocks).toBeInstanceOf(Array);
            expect(result.total).toBeGreaterThan(0);
            expect(result.criteria).toEqual(criteria);

            // 验证排序
            if (result.stocks.length > 1) {
                for (let i = 0; i < result.stocks.length - 1; i++) {
                    expect(result.stocks[i].priceChange).toBeGreaterThanOrEqual(result.stocks[i + 1].priceChange);
                }
            }

            // 验证上涨幅度
            for (const stock of result.stocks) {
                expect(stock.priceChange).toBeGreaterThanOrEqual(criteria.minUpwardPercent);
            }
        });

        it('应该处理空结果', async () => {
            vi.spyOn(historicalPatternService, 'queryHistoricalPatterns').mockResolvedValueOnce({
                patterns: [],
                total: 0,
                page: 1,
                pageSize: 10,
                totalPages: 0
            });

            const criteria = {
                patternTypes: ['standard' as DojiType],
                daysRange: 7,
                minUpwardPercent: 20.0, // 设置一个很高的上涨幅度，确保没有结果
                sortBy: 'priceChange' as const,
                sortDirection: 'desc' as const,
                limit: 10
            };

            const result = await screener.screenStocks(criteria);

            expect(result).toBeDefined();
            expect(result.stocks).toHaveLength(0);
            expect(result.total).toBe(0);
        });
    });

    describe('getRecentPatterns', () => {
        it('应该返回最近的形态列表', async () => {
            const days = 7;
            const patternType = 'standard' as DojiType;

            const result = await screener.getRecentPatterns(days, patternType);

            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBeGreaterThan(0);

            if (result.length > 0) {
                expect(result[0].stockId).toBeDefined();
                expect(result[0].stockName).toBeDefined();
                expect(result[0].patterns).toBeInstanceOf(Array);
                expect(result[0].patterns.length).toBeGreaterThan(0);
            }
        });
    });

    describe('getUpwardStocksAfterDoji', () => {
        it('应该返回十字星后上涨的股票列表', async () => {
            const days = 7;
            const upwardPercent = 3.0;

            const result = await screener.getUpwardStocksAfterDoji(days, upwardPercent);

            expect(result).toBeInstanceOf(Array);

            for (const stock of result) {
                expect(stock.priceChange).toBeGreaterThanOrEqual(upwardPercent);
                expect(stock.stockId).toBeDefined();
                expect(stock.stockName).toBeDefined();
                expect(stock.patternDate).toBeDefined();
                expect(stock.patternType).toBeDefined();
                expect(stock.rank).toBeGreaterThan(0);
            }
        });
    });
});