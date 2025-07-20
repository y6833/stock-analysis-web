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

describe('DojiPatternScreener - 性能测试', () => {
    let screener: DojiPatternScreener;

    // 创建大量测试数据的辅助函数
    const createLargeDataset = (stockCount: number, patternsPerStock: number = 3): {
        stocks: { id: string, name: string }[],
        patterns: DojiPattern[],
        klines: { [key: string]: KLineData[] }
    } => {
        // 创建股票列表
        const stocks = Array.from({ length: stockCount }, (_, i) => ({
            id: `${600000 + i}`,
            name: `测试股票${i}`
        }));

        // 创建形态列表
        const patterns: DojiPattern[] = [];
        const patternTypes: DojiType[] = ['standard', 'dragonfly', 'gravestone', 'longLegged'];
        const trends = ['uptrend', 'downtrend', 'sideways'];

        stocks.forEach((stock, idx) => {
            for (let j = 0; j < patternsPerStock; j++) {
                const patternType = patternTypes[j % patternTypes.length];
                const trend = trends[j % trends.length];
                const daysAgo = (idx % 10) + 1; // 1-10天前

                patterns.push({
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

        // 创建K线数据
        const klines: { [key: string]: KLineData[] } = {};
        patterns.forEach(pattern => {
            if (!klines[pattern.stockId]) {
                // 为每个股票创建10天的K线数据
                const stockKlines: KLineData[] = [];
                const basePrice = 100 + parseInt(pattern.stockId) % 100;

                for (let i = 0; i < 10; i++) {
                    const timestamp = pattern.timestamp - 86400000 * (5 - i); // 形态前5天到形态后5天
                    let close: number;

                    // 根据股票ID决定价格走势
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

                    stockKlines.push({
                        timestamp,
                        open: close * 0.99,
                        high: close * 1.02,
                        low: close * 0.98,
                        close,
                        volume: 10000 + i * 1000 + stockIdNum % 1000
                    });
                }

                klines[pattern.stockId] = stockKlines;
            }
        });

        return { stocks, patterns, klines };
    };

    beforeEach(() => {
        // 重置模拟函数
        vi.resetAllMocks();

        // 创建筛选器实例
        screener = new DojiPatternScreener(
            mockStockDataService as StockDataService,
            mockDojiPatternAnalyzer as DojiPatternAnalyzer
        );

        // 设置价格走势分析模拟返回值
        mockDojiPatternAnalyzer.analyzePriceMovement.mockImplementation((pattern) => {
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

    describe('大数据量处理性能', () => {
        it('应能高效处理100只股票的筛选', async () => {
            const { stocks, patterns, klines } = createLargeDataset(100);

            // 设置模拟函数返回值
            mockStockDataService.getStockList.mockResolvedValue(stocks);
            mockStockDataService.getPatternHistory.mockImplementation((stockId) => {
                return Promise.resolve(patterns.filter(p => p.stockId === stockId));
            });
            mockStockDataService.getKLineData.mockImplementation((stockId) => {
                return Promise.resolve(klines[stockId] || []);
            });

            const criteria: DojiScreenCriteria = {
                patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
                daysRange: 10,
                sortBy: 'priceChange',
                sortDirection: 'desc',
                limit: 50
            };

            const startTime = performance.now();
            const result = await screener.screenStocks(criteria);
            const endTime = performance.now();

            const executionTime = endTime - startTime;
            console.log(`处理100只股票耗时: ${executionTime.toFixed(2)}ms`);

            // 验证结果
            expect(result.stocks.length).toBeGreaterThan(0);

            // 验证执行时间在合理范围内
            expect(executionTime).toBeLessThan(1000); // 1秒内完成
        });

        it('应能高效处理1000只股票的筛选', async () => {
            const { stocks, patterns, klines } = createLargeDataset(1000);

            // 设置模拟函数返回值
            mockStockDataService.getStockList.mockResolvedValue(stocks);
            mockStockDataService.getPatternHistory.mockImplementation((stockId) => {
                return Promise.resolve(patterns.filter(p => p.stockId === stockId));
            });
            mockStockDataService.getKLineData.mockImplementation((stockId) => {
                return Promise.resolve(klines[stockId] || []);
            });

            const criteria: DojiScreenCriteria = {
                patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
                daysRange: 10,
                sortBy: 'priceChange',
                sortDirection: 'desc',
                limit: 50
            };

            const startTime = performance.now();
            const result = await screener.screenStocks(criteria);
            const endTime = performance.now();

            const executionTime = endTime - startTime;
            console.log(`处理1000只股票耗时: ${executionTime.toFixed(2)}ms`);

            // 验证结果
            expect(result.stocks.length).toBeGreaterThan(0);

            // 验证执行时间在合理范围内
            expect(executionTime).toBeLessThan(5000); // 5秒内完成
        });

        it('应能高效处理大量形态的筛选', async () => {
            // 每只股票10个形态，共100只股票，总计1000个形态
            const { stocks, patterns, klines } = createLargeDataset(100, 10);

            // 设置模拟函数返回值
            mockStockDataService.getStockList.mockResolvedValue(stocks);
            mockStockDataService.getPatternHistory.mockImplementation((stockId) => {
                return Promise.resolve(patterns.filter(p => p.stockId === stockId));
            });
            mockStockDataService.getKLineData.mockImplementation((stockId) => {
                return Promise.resolve(klines[stockId] || []);
            });

            const criteria: DojiScreenCriteria = {
                patternTypes: ['standard'],
                daysRange: 10,
                sortBy: 'priceChange',
                sortDirection: 'desc',
                limit: 50
            };

            const startTime = performance.now();
            const result = await screener.screenStocks(criteria);
            const endTime = performance.now();

            const executionTime = endTime - startTime;
            console.log(`处理1000个形态耗时: ${executionTime.toFixed(2)}ms`);

            // 验证结果
            expect(result.stocks.length).toBeGreaterThan(0);

            // 验证执行时间在合理范围内
            expect(executionTime).toBeLessThan(3000); // 3秒内完成
        });
    });

    describe('筛选条件性能', () => {
        it('应高效处理复杂筛选条件', async () => {
            const { stocks, patterns, klines } = createLargeDataset(500);

            // 设置模拟函数返回值
            mockStockDataService.getStockList.mockResolvedValue(stocks);
            mockStockDataService.getPatternHistory.mockImplementation((stockId) => {
                return Promise.resolve(patterns.filter(p => p.stockId === stockId));
            });
            mockStockDataService.getKLineData.mockImplementation((stockId) => {
                return Promise.resolve(klines[stockId] || []);
            });

            // 简单筛选条件
            const simpleCriteria: DojiScreenCriteria = {
                patternTypes: ['standard'],
                daysRange: 10,
                sortBy: 'priceChange',
                sortDirection: 'desc',
                limit: 50
            };

            // 复杂筛选条件
            const complexCriteria: DojiScreenCriteria = {
                patternTypes: ['standard', 'dragonfly', 'gravestone'],
                daysRange: 5,
                minUpwardPercent: 3.5,
                marketCondition: 'uptrend',
                sortBy: 'significance',
                sortDirection: 'desc',
                limit: 20
            };

            // 测试简单筛选条件性能
            const simpleStartTime = performance.now();
            await screener.screenStocks(simpleCriteria);
            const simpleEndTime = performance.now();
            const simpleExecutionTime = simpleEndTime - simpleStartTime;

            console.log(`简单筛选条件处理耗时: ${simpleExecutionTime.toFixed(2)}ms`);

            // 测试复杂筛选条件性能
            const complexStartTime = performance.now();
            await screener.screenStocks(complexCriteria);
            const complexEndTime = performance.now();
            const complexExecutionTime = complexEndTime - complexStartTime;

            console.log(`复杂筛选条件处理耗时: ${complexExecutionTime.toFixed(2)}ms`);

            // 验证复杂筛选条件的执行时间不应该比简单筛选条件慢太多
            expect(complexExecutionTime).toBeLessThan(simpleExecutionTime * 2);
        });
    });

    describe('分页性能', () => {
        it('应高效处理不同页码的请求', async () => {
            const { stocks, patterns, klines } = createLargeDataset(500);

            // 设置模拟函数返回值
            mockStockDataService.getStockList.mockResolvedValue(stocks);
            mockStockDataService.getPatternHistory.mockImplementation((stockId) => {
                return Promise.resolve(patterns.filter(p => p.stockId === stockId));
            });
            mockStockDataService.getKLineData.mockImplementation((stockId) => {
                return Promise.resolve(klines[stockId] || []);
            });

            const pageSize = 20;
            const pagesToTest = [1, 2, 5, 10, 20];
            const executionTimes: number[] = [];

            // 测试不同页码的性能
            for (const page of pagesToTest) {
                const criteria: DojiScreenCriteria = {
                    patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
                    daysRange: 10,
                    sortBy: 'priceChange',
                    sortDirection: 'desc',
                    limit: pageSize,
                    page
                };

                const startTime = performance.now();
                await screener.screenStocks(criteria);
                const endTime = performance.now();

                const executionTime = endTime - startTime;
                executionTimes.push(executionTime);

                console.log(`处理第${page}页耗时: ${executionTime.toFixed(2)}ms`);
            }

            // 验证不同页码的执行时间应该相近
            // 计算平均执行时间
            const avgExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;

            // 验证每个页码的执行时间不应该比平均时间慢太多
            executionTimes.forEach((time, index) => {
                expect(time).toBeLessThan(avgExecutionTime * 2);
                console.log(`第${pagesToTest[index]}页执行时间与平均时间比: ${(time / avgExecutionTime).toFixed(2)}`);
            });
        });
    });

    describe('缓存性能', () => {
        it('应通过缓存提高重复筛选性能', async () => {
            const { stocks, patterns, klines } = createLargeDataset(300);

            // 设置模拟函数返回值
            mockStockDataService.getStockList.mockResolvedValue(stocks);
            mockStockDataService.getPatternHistory.mockImplementation((stockId) => {
                return Promise.resolve(patterns.filter(p => p.stockId === stockId));
            });
            mockStockDataService.getKLineData.mockImplementation((stockId) => {
                return Promise.resolve(klines[stockId] || []);
            });

            const criteria: DojiScreenCriteria = {
                patternTypes: ['standard', 'dragonfly'],
                daysRange: 7,
                sortBy: 'priceChange',
                sortDirection: 'desc',
                limit: 50
            };

            // 首次筛选
            const firstStartTime = performance.now();
            await screener.screenStocks(criteria);
            const firstEndTime = performance.now();
            const firstExecutionTime = firstEndTime - firstStartTime;

            console.log(`首次筛选耗时: ${firstExecutionTime.toFixed(2)}ms`);

            // 重复筛选（应该使用缓存）
            const secondStartTime = performance.now();
            await screener.screenStocks(criteria);
            const secondEndTime = performance.now();
            const secondExecutionTime = secondEndTime - secondStartTime;

            console.log(`重复筛选耗时: ${secondExecutionTime.toFixed(2)}ms`);

            // 验证重复筛选应该比首次筛选快
            expect(secondExecutionTime).toBeLessThan(firstExecutionTime * 0.5);
        });
    });

    describe('并发性能', () => {
        it('应能高效处理并发筛选请求', async () => {
            const { stocks, patterns, klines } = createLargeDataset(200);

            // 设置模拟函数返回值
            mockStockDataService.getStockList.mockResolvedValue(stocks);
            mockStockDataService.getPatternHistory.mockImplementation((stockId) => {
                return Promise.resolve(patterns.filter(p => p.stockId === stockId));
            });
            mockStockDataService.getKLineData.mockImplementation((stockId) => {
                return Promise.resolve(klines[stockId] || []);
            });

            // 创建不同的筛选条件
            const criteriaList: DojiScreenCriteria[] = [
                {
                    patternTypes: ['standard'],
                    daysRange: 10,
                    sortBy: 'priceChange',
                    sortDirection: 'desc',
                    limit: 50
                },
                {
                    patternTypes: ['dragonfly'],
                    daysRange: 5,
                    sortBy: 'significance',
                    sortDirection: 'desc',
                    limit: 30
                },
                {
                    patternTypes: ['gravestone', 'longLegged'],
                    daysRange: 7,
                    minUpwardPercent: 2,
                    sortBy: 'patternDate',
                    sortDirection: 'desc',
                    limit: 40
                }
            ];

            // 串行执行
            const serialStartTime = performance.now();
            for (const criteria of criteriaList) {
                await screener.screenStocks(criteria);
            }
            const serialEndTime = performance.now();
            const serialExecutionTime = serialEndTime - serialStartTime;

            console.log(`串行执行3个筛选请求耗时: ${serialExecutionTime.toFixed(2)}ms`);

            // 并行执行
            const parallelStartTime = performance.now();
            await Promise.all(criteriaList.map(criteria => screener.screenStocks(criteria)));
            const parallelEndTime = performance.now();
            const parallelExecutionTime = parallelEndTime - parallelStartTime;

            console.log(`并行执行3个筛选请求耗时: ${parallelExecutionTime.toFixed(2)}ms`);

            // 验证并行执行应该比串行执行快
            expect(parallelExecutionTime).toBeLessThan(serialExecutionTime);
        });
    });
});