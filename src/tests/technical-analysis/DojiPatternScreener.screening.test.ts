import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DojiPatternScreener } from '../../services/DojiPatternScreener';
import { StockDataService } from '../../services/StockDataService';
import { DojiPatternAnalyzer } from '../../modules/technical-analysis/patterns/doji/DojiPatternAnalyzer';
import type { DojiPattern, DojiType } from '../../types/technical-analysis/doji';
import type { KLineData } from '../../types/technical-analysis/kline';
import type { DojiScreenCriteria } from '../../types/technical-analysis/screener';

// 模拟 StockDataService
const mockStockDataService: Partial<StockDataService> = {
    getKLineData: vi.fn(),
    getStockList: vi.fn(),
    getPatternHistory: vi.fn(),
    getIndexData: vi.fn(),
    getMarketStatus: vi.fn(),
    getHistoricalPatterns: vi.fn(),
    getRecentPatterns: vi.fn()
};

// 模拟 DojiPatternAnalyzer
const mockDojiPatternAnalyzer: Partial<DojiPatternAnalyzer> = {
    analyzePriceMovement: vi.fn(),
    calculateSuccessRate: vi.fn(),
    getPriceDistribution: vi.fn(),
    findSimilarPatterns: vi.fn()
};

describe('DojiPatternScreener - 筛选功能测试', () => {
    let screener: DojiPatternScreener;
    let mockPatterns: DojiPattern[];
    let mockStocks: { id: string, name: string }[];
    let mockKlines: { [key: string]: KLineData[] };

    beforeEach(() => {
        // 重置模拟函数
        vi.resetAllMocks();

        // 创建筛选器实例
        screener = new DojiPatternScreener(
            mockStockDataService as StockDataService,
            mockDojiPatternAnalyzer as DojiPatternAnalyzer
        );

        // 创建更多的模拟股票列表，用于大数据量测试
        mockStocks = Array.from({ length: 100 }, (_, i) => ({
            id: `${600000 + i}`,
            name: `测试股票${i}`
        }));

        // 创建模拟十字星形态，包含各种类型
        mockPatterns = [];
        const patternTypes: DojiType[] = ['standard', 'dragonfly', 'gravestone', 'longLegged'];
        const trends = ['uptrend', 'downtrend', 'sideways'];

        // 为每只股票创建1-3个形态
        mockStocks.forEach((stock, idx) => {
            const patternCount = (idx % 3) + 1; // 1-3个形态

            for (let j = 0; j < patternCount; j++) {
                const patternType = patternTypes[j % patternTypes.length];
                const trend = trends[j % trends.length];
                const daysAgo = (idx % 10) + 1; // 1-10天前

                mockPatterns.push({
                    id: `pattern-${stock.id}-${j}`,
                    stockId: stock.id,
                    stockName: stock.name,
                    timestamp: Date.now() - 86400000 * daysAgo,
                    type: patternType,
                    candle: {
                        open: 100,
                        high: 105,
                        low: 95,
                        close: 100,
                        volume: 10000 + idx * 100
                    },
                    significance: 0.5 + (idx % 5) * 0.1, // 0.5-0.9的显著性
                    context: {
                        trend,
                        nearSupportResistance: idx % 2 === 0,
                        volumeChange: 10 + idx % 20
                    }
                });
            }
        });

        // 创建模拟K线数据
        mockKlines = {};
        mockPatterns.forEach(pattern => {
            if (!mockKlines[pattern.stockId]) {
                // 为每个股票创建10天的K线数据
                const klines: KLineData[] = [];
                const basePrice = 100 + parseInt(pattern.stockId) % 100;

                for (let i = 0; i < 10; i++) {
                    const timestamp = pattern.timestamp - 86400000 * (5 - i); // 形态前5天到形态后5天
                    let close: number;

                    // 根据股票ID决定价格走势，有上涨、下跌和震荡三种情况
                    const stockIdNum = parseInt(pattern.stockId);
                    if (stockIdNum % 3 === 0) {
                        // 上涨
                        close = basePrice * (1 + (i - 4) * 0.01); // 每天上涨1%
                    } else if (stockIdNum % 3 === 1) {
                        // 下跌
                        close = basePrice * (1 - (i - 4) * 0.01); // 每天下跌1%
                    } else {
                        // 震荡
                        close = basePrice * (1 + Math.sin(i) * 0.01); // 震荡走势
                    }

                    klines.push({
                        timestamp,
                        open: close * 0.99,
                        high: close * 1.02,
                        low: close * 0.98,
                        close,
                        volume: 10000 + i * 1000 + stockIdNum % 1000
                    });
                }

                mockKlines[pattern.stockId] = klines;
            }
        });

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
            const stockIdNum = parseInt(stockId);

            // 根据股票ID决定价格走势
            let priceChange: number;
            if (stockIdNum % 3 === 0) {
                priceChange = 5 + (stockIdNum % 10); // 5-15%上涨
            } else if (stockIdNum % 3 === 1) {
                priceChange = -5 - (stockIdNum % 10); // 5-15%下跌
            } else {
                priceChange = -2 + (stockIdNum % 5); // -2%到+3%震荡
            }

            return Promise.resolve({
                patternId: pattern.id,
                priceMovement: {
                    priceChanges: {
                        day1: priceChange / 5,
                        day3: priceChange / 2,
                        day5: priceChange,
                        day10: priceChange * 1.5
                    },
                    volumeChanges: {
                        day1: 5 + (stockIdNum % 20),
                        day3: 10 + (stockIdNum % 30),
                        day5: 15 + (stockIdNum % 40)
                    },
                    isUpward: priceChange > 0
                }
            });
        });
    });

    describe('筛选条件处理测试', () => {
        it('应正确处理形态类型筛选', async () => {
            // 测试单一形态类型筛选
            const standardOnlyCriteria: DojiScreenCriteria = {
                patternTypes: ['standard'],
                daysRange: 10,
                sortBy: 'patternDate',
                sortDirection: 'desc',
                limit: 50
            };

            const standardResult = await screener.screenStocks(standardOnlyCriteria);

            // 验证结果中只包含标准十字星
            expect(standardResult.stocks.length).toBeGreaterThan(0);
            standardResult.stocks.forEach(item => {
                expect(item.patternType).toBe('standard');
            });

            // 测试多形态类型筛选
            const multiTypeCriteria: DojiScreenCriteria = {
                patternTypes: ['dragonfly', 'gravestone'],
                daysRange: 10,
                sortBy: 'patternDate',
                sortDirection: 'desc',
                limit: 50
            };

            const multiTypeResult = await screener.screenStocks(multiTypeCriteria);

            // 验证结果中只包含指定的形态类型
            expect(multiTypeResult.stocks.length).toBeGreaterThan(0);
            multiTypeResult.stocks.forEach(item => {
                expect(['dragonfly', 'gravestone']).toContain(item.patternType);
            });
        });

        it('应正确处理时间范围筛选', async () => {
            // 测试不同时间范围
            const ranges = [3, 5, 10];

            for (const range of ranges) {
                const criteria: DojiScreenCriteria = {
                    patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
                    daysRange: range,
                    sortBy: 'patternDate',
                    sortDirection: 'desc',
                    limit: 100
                };

                const result = await screener.screenStocks(criteria);

                // 验证结果中的形态都在指定时间范围内
                const now = Date.now();
                result.stocks.forEach(item => {
                    const daysDiff = (now - item.patternDate) / (24 * 60 * 60 * 1000);
                    expect(daysDiff).toBeLessThanOrEqual(range);
                });
            }
        });

        it('应正确处理最小上涨幅度筛选', async () => {
            const minUpwardPercents = [1, 3, 5, 10];

            for (const minPercent of minUpwardPercents) {
                const criteria: DojiScreenCriteria = {
                    patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
                    daysRange: 10,
                    minUpwardPercent: minPercent,
                    sortBy: 'priceChange',
                    sortDirection: 'desc',
                    limit: 100
                };

                const result = await screener.screenStocks(criteria);

                // 验证结果中的股票上涨幅度都大于等于指定值
                result.stocks.forEach(item => {
                    expect(item.priceChange).toBeGreaterThanOrEqual(minPercent);
                });
            }
        });

        it('应正确处理市场环境筛选', async () => {
            // 模拟不同市场环境
            const marketConditions = ['uptrend', 'downtrend', 'sideways'];

            for (const condition of marketConditions) {
                mockStockDataService.getMarketStatus.mockResolvedValueOnce(condition);

                const criteria: DojiScreenCriteria = {
                    patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
                    daysRange: 10,
                    marketCondition: condition as any,
                    sortBy: 'patternDate',
                    sortDirection: 'desc',
                    limit: 100
                };

                const result = await screener.screenStocks(criteria);

                // 验证市场环境筛选被正确应用
                expect(mockStockDataService.getMarketStatus).toHaveBeenCalled();
            }
        });

        it('应正确处理复合筛选条件', async () => {
            // 测试多个筛选条件组合
            const criteria: DojiScreenCriteria = {
                patternTypes: ['standard', 'dragonfly'],
                daysRange: 5,
                minUpwardPercent: 3,
                marketCondition: 'uptrend',
                sortBy: 'significance',
                sortDirection: 'desc',
                limit: 20
            };

            const result = await screener.screenStocks(criteria);

            // 验证结果符合所有筛选条件
            result.stocks.forEach(item => {
                expect(['standard', 'dragonfly']).toContain(item.patternType);
                expect(item.priceChange).toBeGreaterThanOrEqual(3);

                const daysDiff = (Date.now() - item.patternDate) / (24 * 60 * 60 * 1000);
                expect(daysDiff).toBeLessThanOrEqual(5);
            });
        });
    });

    describe('上涨股票筛选准确性测试', () => {
        it('应准确识别上涨股票', async () => {
            const result = await screener.screenStocks({
                patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
                daysRange: 10,
                minUpwardPercent: 0, // 所有形态都视为上涨
                sortBy: 'priceChange',
                sortDirection: 'desc',
                limit: 100
            });

            // 验证所有结果都是上涨的股票
            result.stocks.forEach(item => {
                expect(item.priceChange).toBeGreaterThan(0);
            });

            // 验证上涨股票数量与模拟数据一致
            const expectedUpwardCount = mockStocks.filter(s => parseInt(s.id) % 3 === 0).length;
            expect(result.stocks.length).toBeGreaterThanOrEqual(expectedUpwardCount / 3); // 考虑到每只股票可能有多个形态
        });

        it('应根据上涨幅度正确排序', async () => {
            const result = await screener.screenStocks({
                patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
                daysRange: 10,
                minUpwardPercent: 0, // 所有形态都视为上涨
                sortBy: 'priceChange',
                sortDirection: 'desc',
                limit: 100
            });

            // 验证结果按上涨幅度降序排序
            for (let i = 0; i < result.stocks.length - 1; i++) {
                expect(result.stocks[i].priceChange).toBeGreaterThanOrEqual(result.stocks[i + 1].priceChange);
            }
        });

        it('应正确计算上涨幅度', async () => {
            // 修改模拟函数以返回确定的价格变化
            mockDojiPatternAnalyzer.analyzePriceMovement.mockImplementation((pattern) => {
                const stockId = pattern.stockId;
                const stockIdNum = parseInt(stockId);

                // 使用确定的价格变化值
                const priceChange = stockIdNum % 10;

                return Promise.resolve({
                    patternId: pattern.id,
                    priceMovement: {
                        priceChanges: {
                            day1: priceChange / 5,
                            day3: priceChange / 2,
                            day5: priceChange,
                            day10: priceChange * 1.5
                        },
                        volumeChanges: {
                            day1: 5,
                            day3: 10,
                            day5: 15
                        },
                        isUpward: priceChange > 0
                    }
                });
            });

            const result = await screener.screenStocks({
                patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
                daysRange: 10,
                minUpwardPercent: 0, // 所有形态都视为上涨
                sortBy: 'priceChange',
                sortDirection: 'desc',
                limit: 100
            });

            // 验证价格变化计算准确性
            result.stocks.forEach(item => {
                const stockIdNum = parseInt(item.stockId);
                const expectedPriceChange = stockIdNum % 10;
                expect(item.priceChange).toBeCloseTo(expectedPriceChange, 1);
            });
        });

        it('应正确处理不同时间周期的上涨判断', async () => {
            // 测试不同时间周期的上涨判断
            const days = [1, 3, 5, 10];

            for (const day of days) {
                // 修改模拟函数以根据时间周期返回不同的价格变化
                mockDojiPatternAnalyzer.analyzePriceMovement.mockImplementation((pattern, analyzeDays) => {
                    const stockId = pattern.stockId;
                    const stockIdNum = parseInt(stockId);

                    // 根据时间周期设置不同的价格变化
                    let priceChange: number;
                    if (analyzeDays === 1) {
                        priceChange = stockIdNum % 5;
                    } else if (analyzeDays === 3) {
                        priceChange = stockIdNum % 8;
                    } else if (analyzeDays === 5) {
                        priceChange = stockIdNum % 10;
                    } else {
                        priceChange = stockIdNum % 15;
                    }

                    return Promise.resolve({
                        patternId: pattern.id,
                        priceMovement: {
                            priceChanges: {
                                day1: analyzeDays === 1 ? priceChange : priceChange / 5,
                                day3: analyzeDays === 3 ? priceChange : priceChange / 2,
                                day5: analyzeDays === 5 ? priceChange : priceChange,
                                day10: analyzeDays === 10 ? priceChange : priceChange * 1.5
                            },
                            volumeChanges: {
                                day1: 5,
                                day3: 10,
                                day5: 15
                            },
                            isUpward: priceChange > 0
                        }
                    });
                });

                const result = await screener.screenStocks({
                    patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
                    daysRange: 10,
                    minUpwardPercent: 0, // 所有形态都视为上涨
                    sortBy: 'priceChange',
                    sortDirection: 'desc',
                    limit: 100
                });

                // 验证使用了正确的时间周期
                expect(mockDojiPatternAnalyzer.analyzePriceMovement).toHaveBeenCalledWith(
                    expect.anything(),
                    day
                );
            }
        });
    });

    describe('排序和分页功能测试', () => {
        it('应正确按价格变化排序', async () => {
            const criteria: DojiScreenCriteria = {
                patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
                daysRange: 10,
                sortBy: 'priceChange',
                sortDirection: 'desc',
                limit: 100
            };

            const result = await screener.screenStocks(criteria);

            // 验证按价格变化降序排序
            for (let i = 0; i < result.stocks.length - 1; i++) {
                expect(result.stocks[i].priceChange).toBeGreaterThanOrEqual(result.stocks[i + 1].priceChange);
            }

            // 测试升序排序
            criteria.sortDirection = 'asc';
            const ascResult = await screener.screenStocks(criteria);

            // 验证按价格变化升序排序
            for (let i = 0; i < ascResult.stocks.length - 1; i++) {
                expect(ascResult.stocks[i].priceChange).toBeLessThanOrEqual(ascResult.stocks[i + 1].priceChange);
            }
        });

        it('应正确按成交量变化排序', async () => {
            const criteria: DojiScreenCriteria = {
                patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
                daysRange: 10,
                sortBy: 'volumeChange',
                sortDirection: 'desc',
                limit: 100
            };

            const result = await screener.screenStocks(criteria);

            // 验证按成交量变化降序排序
            for (let i = 0; i < result.stocks.length - 1; i++) {
                expect(result.stocks[i].volumeChange).toBeGreaterThanOrEqual(result.stocks[i + 1].volumeChange);
            }
        });

        it('应正确按形态日期排序', async () => {
            const criteria: DojiScreenCriteria = {
                patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
                daysRange: 10,
                sortBy: 'patternDate',
                sortDirection: 'desc',
                limit: 100
            };

            const result = await screener.screenStocks(criteria);

            // 验证按形态日期降序排序
            for (let i = 0; i < result.stocks.length - 1; i++) {
                expect(result.stocks[i].patternDate).toBeGreaterThanOrEqual(result.stocks[i + 1].patternDate);
            }
        });

        it('应正确按形态显著性排序', async () => {
            const criteria: DojiScreenCriteria = {
                patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
                daysRange: 10,
                sortBy: 'significance',
                sortDirection: 'desc',
                limit: 100
            };

            const result = await screener.screenStocks(criteria);

            // 验证按形态显著性降序排序
            for (let i = 0; i < result.stocks.length - 1; i++) {
                expect(result.stocks[i].significance).toBeGreaterThanOrEqual(result.stocks[i + 1].significance);
            }
        });

        it('应正确处理分页', async () => {
            const pageSize = 10;

            // 测试第一页
            const page1Criteria: DojiScreenCriteria = {
                patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
                daysRange: 10,
                sortBy: 'patternDate',
                sortDirection: 'desc',
                limit: pageSize,
                page: 1
            };

            const page1Result = await screener.screenStocks(page1Criteria);

            // 验证结果数量不超过页面大小
            expect(page1Result.stocks.length).toBeLessThanOrEqual(pageSize);

            // 测试第二页
            const page2Criteria = { ...page1Criteria, page: 2 };
            const page2Result = await screener.screenStocks(page2Criteria);

            // 验证两页结果不重叠
            const page1Ids = page1Result.stocks.map(item => item.stockId);
            const page2Ids = page2Result.stocks.map(item => item.stockId);

            page2Ids.forEach(id => {
                expect(page1Ids).not.toContain(id);
            });
        });

        it('应正确处理空页', async () => {
            // 设置一个不可能满足的条件
            const criteria: DojiScreenCriteria = {
                patternTypes: ['standard'],
                daysRange: 1,
                minUpwardPercent: 100, // 不可能有100%的上涨
                sortBy: 'priceChange',
                sortDirection: 'desc',
                limit: 10
            };

            const result = await screener.screenStocks(criteria);

            // 验证返回空数组
            expect(result.stocks).toEqual([]);
        });
    });

    describe('大数据量性能测试', () => {
        it('应能高效处理大量股票数据', async () => {
            // 创建更大的模拟数据集
            const largeStockCount = 1000;
            const largeStocks = Array.from({ length: largeStockCount }, (_, i) => ({
                id: `${600000 + i}`,
                name: `测试股票${i}`
            }));

            mockStockDataService.getStockList.mockResolvedValueOnce(largeStocks);

            const startTime = performance.now();

            const criteria: DojiScreenCriteria = {
                patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
                daysRange: 10,
                sortBy: 'priceChange',
                sortDirection: 'desc',
                limit: 100
            };

            await screener.screenStocks(criteria);

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            // 记录执行时间
            console.log(`处理${largeStockCount}只股票耗时: ${executionTime.toFixed(2)}ms`);

            // 验证执行时间在合理范围内（根据实际情况调整阈值）
            expect(executionTime).toBeLessThan(5000); // 5秒内完成
        });

        it('应能高效处理大量形态数据', async () => {
            // 为每只股票创建更多的形态
            const largePatternCount = 5000;
            const largePatterns: DojiPattern[] = [];
            const patternTypes: DojiType[] = ['standard', 'dragonfly', 'gravestone', 'longLegged'];

            for (let i = 0; i < largePatternCount; i++) {
                const stockIdx = i % mockStocks.length;
                const stock = mockStocks[stockIdx];

                largePatterns.push({
                    id: `pattern-${i}`,
                    stockId: stock.id,
                    stockName: stock.name,
                    timestamp: Date.now() - 86400000 * (i % 10 + 1),
                    type: patternTypes[i % patternTypes.length],
                    candle: {
                        open: 100,
                        high: 105,
                        low: 95,
                        close: 100,
                        volume: 10000 + i * 10
                    },
                    significance: 0.5 + (i % 5) * 0.1,
                    context: {
                        trend: i % 2 === 0 ? 'uptrend' : 'downtrend',
                        nearSupportResistance: i % 2 === 0,
                        volumeChange: 10 + i % 20
                    }
                });
            }

            // 修改模拟函数以返回大量形态
            mockStockDataService.getPatternHistory.mockImplementation((stockId) => {
                return Promise.resolve(largePatterns.filter(p => p.stockId === stockId));
            });

            const startTime = performance.now();

            const criteria: DojiScreenCriteria = {
                patternTypes: ['standard'],
                daysRange: 10,
                sortBy: 'priceChange',
                sortDirection: 'desc',
                limit: 100
            };

            await screener.screenStocks(criteria);

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            // 记录执行时间
            console.log(`处理${largePatternCount}个形态耗时: ${executionTime.toFixed(2)}ms`);

            // 验证执行时间在合理范围内（根据实际情况调整阈值）
            expect(executionTime).toBeLessThan(10000); // 10秒内完成
        });

        it('应正确处理大量结果的分页', async () => {
            // 修改模拟函数以返回大量上涨股票
            mockDojiPatternAnalyzer.analyzePriceMovement.mockImplementation(() => {
                return Promise.resolve({
                    patternId: 'test',
                    priceMovement: {
                        priceChanges: {
                            day1: 2,
                            day3: 5,
                            day5: 10,
                            day10: 15
                        },
                        volumeChanges: {
                            day1: 5,
                            day3: 10,
                            day5: 15
                        },
                        isUpward: true // 所有股票都上涨
                    }
                });
            });

            const pageSize = 50;
            const totalPages = 5;

            // 测试多页结果
            const allResults = [];

            for (let page = 1; page <= totalPages; page++) {
                const criteria: DojiScreenCriteria = {
                    patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
                    daysRange: 10,
                    sortBy: 'patternDate',
                    sortDirection: 'desc',
                    limit: pageSize,
                    page
                };

                const pageResult = await screener.screenStocks(criteria);
                allResults.push(...pageResult.stocks);

                // 验证结果数量不超过页面大小
                expect(pageResult.stocks.length).toBeLessThanOrEqual(pageSize);
            }

            // 验证没有重复结果
            const uniqueIds = new Set(allResults.map(item => item.stockId + '-' + item.patternDate));
            expect(uniqueIds.size).toBe(allResults.length);
        });
    });
});