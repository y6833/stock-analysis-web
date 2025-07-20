import { describe, it, expect, beforeEach } from 'vitest';
import { DojiPatternDetector } from '../../modules/technical-analysis/patterns/doji/DojiPatternDetector';
import { KLineData } from '../../types/technical-analysis/kline';

describe('DojiPatternDetector - 性能测试', () => {
    let detector: DojiPatternDetector;

    beforeEach(() => {
        // 每个测试前创建新的检测器实例，禁用Worker以便同步测试
        detector = new DojiPatternDetector({}, false);
    });

    // 创建大量测试数据
    const createLargeDataset = (size: number): KLineData[] => {
        const data: KLineData[] = [];
        let basePrice = 100;

        for (let i = 0; i < size; i++) {
            // 每10个数据点添加一个十字星
            const isDoji = i % 10 === 0;
            const open = basePrice;
            const close = isDoji ? basePrice : basePrice + (Math.random() > 0.5 ? 2 : -2);
            const high = Math.max(open, close) + Math.random() * 5;
            const low = Math.min(open, close) - Math.random() * 5;

            data.push({
                timestamp: 1625097600000 + i * 86400000,
                open,
                high,
                low,
                close,
                volume: 1000000 + Math.floor(Math.random() * 1000000)
            });

            // 模拟价格变动
            basePrice += Math.random() > 0.5 ? Math.random() * 2 : -Math.random() * 2;
        }

        return data;
    };

    describe('大数据量处理性能', () => {
        it('应能高效处理100条K线数据', async () => {
            const data = createLargeDataset(100);

            const startTime = performance.now();
            const patterns = await detector.detectPatternsSync(data);
            const endTime = performance.now();

            const executionTime = endTime - startTime;

            // 记录执行时间
            console.log(`处理100条K线数据耗时: ${executionTime.toFixed(2)}ms`);

            // 验证结果
            expect(patterns.length).toBeGreaterThan(0);

            // 100条数据应该在50ms内处理完（在大多数现代设备上）
            // 注意：这个阈值可能需要根据测试环境调整
            expect(executionTime).toBeLessThan(50);
        });

        it('应能高效处理1000条K线数据', async () => {
            const data = createLargeDataset(1000);

            const startTime = performance.now();
            const patterns = await detector.detectPatternsSync(data);
            const endTime = performance.now();

            const executionTime = endTime - startTime;

            // 记录执行时间
            console.log(`处理1000条K线数据耗时: ${executionTime.toFixed(2)}ms`);

            // 验证结果
            expect(patterns.length).toBeGreaterThan(0);

            // 1000条数据应该在500ms内处理完（在大多数现代设备上）
            // 注意：这个阈值可能需要根据测试环境调整
            expect(executionTime).toBeLessThan(500);
        });
    });

    describe('增量计算性能', () => {
        it('应高效处理增量数据', async () => {
            // 创建初始数据集
            const initialData = createLargeDataset(500);

            // 首次计算
            const startTime1 = performance.now();
            await detector.detectPatternsSync(initialData, 'TEST001');
            const endTime1 = performance.now();
            const initialTime = endTime1 - startTime1;

            // 创建增量数据
            const additionalData = createLargeDataset(100);
            const combinedData = [...initialData, ...additionalData];

            // 增量计算
            const startTime2 = performance.now();
            await detector.detectPatternsSync(combinedData, 'TEST001');
            const endTime2 = performance.now();
            const incrementalTime = endTime2 - startTime2;

            // 记录执行时间
            console.log(`首次计算500条数据耗时: ${initialTime.toFixed(2)}ms`);
            console.log(`增量计算100条数据耗时: ${incrementalTime.toFixed(2)}ms`);

            // 增量计算应该比首次计算快很多
            // 注意：这个比例可能需要根据测试环境调整
            expect(incrementalTime).toBeLessThan(initialTime * 0.5);
        });
    });

    describe('缓存性能', () => {
        it('应通过缓存提高重复计算性能', async () => {
            const data = createLargeDataset(500);

            // 首次计算（无缓存）
            const startTime1 = performance.now();
            await detector.detectPatternsSync(data, 'TEST002');
            const endTime1 = performance.now();
            const firstRunTime = endTime1 - startTime1;

            // 第二次计算（有缓存）
            const startTime2 = performance.now();
            await detector.detectPatternsSync(data, 'TEST002');
            const endTime2 = performance.now();
            const secondRunTime = endTime2 - startTime2;

            // 记录执行时间
            console.log(`无缓存计算耗时: ${firstRunTime.toFixed(2)}ms`);
            console.log(`有缓存计算耗时: ${secondRunTime.toFixed(2)}ms`);

            // 有缓存的计算应该比无缓存快很多
            expect(secondRunTime).toBeLessThan(firstRunTime * 0.1);
        });
    });

    describe('配置变更性能', () => {
        it('应高效处理配置变更后的重新计算', async () => {
            const data = createLargeDataset(500);

            // 首次计算
            const startTime1 = performance.now();
            const patterns1 = await detector.detectPatternsSync(data, 'TEST003');
            const endTime1 = performance.now();
            const firstRunTime = endTime1 - startTime1;

            // 更新配置
            await detector.updateConfig({ equalPriceThreshold: 0.2 });

            // 配置变更后重新计算
            const startTime2 = performance.now();
            const patterns2 = await detector.detectPatternsSync(data, 'TEST003');
            const endTime2 = performance.now();
            const secondRunTime = endTime2 - startTime2;

            // 记录执行时间
            console.log(`首次计算耗时: ${firstRunTime.toFixed(2)}ms`);
            console.log(`配置变更后重新计算耗时: ${secondRunTime.toFixed(2)}ms`);

            // 验证结果数量可能不同（因为配置变更）
            expect(patterns1.length).not.toBe(patterns2.length);

            // 配置变更后的计算不应该比首次计算慢太多
            expect(secondRunTime).toBeLessThan(firstRunTime * 1.5);
        });
    });

    describe('多股票并行处理性能', () => {
        it('应高效处理多只股票的并行计算', async () => {
            // 创建多只股票的数据
            const stocks = ['000001.SZ', '600000.SH', '300059.SZ', '002415.SZ', '601318.SH'];
            const dataMap = new Map<string, KLineData[]>();

            stocks.forEach(stock => {
                dataMap.set(stock, createLargeDataset(200));
            });

            // 串行处理
            const startTimeSerial = performance.now();
            for (const stock of stocks) {
                await detector.detectPatternsSync(dataMap.get(stock)!, stock);
            }
            const endTimeSerial = performance.now();
            const serialTime = endTimeSerial - startTimeSerial;

            // 清除缓存
            detector.clearCache();

            // 并行处理
            const startTimeParallel = performance.now();
            await Promise.all(stocks.map(stock =>
                detector.detectPatternsSync(dataMap.get(stock)!, stock)
            ));
            const endTimeParallel = performance.now();
            const parallelTime = endTimeParallel - startTimeParallel;

            // 记录执行时间
            console.log(`串行处理5只股票耗时: ${serialTime.toFixed(2)}ms`);
            console.log(`并行处理5只股票耗时: ${parallelTime.toFixed(2)}ms`);

            // 并行处理应该比串行处理快
            // 注意：这个比例可能需要根据测试环境和CPU核心数调整
            expect(parallelTime).toBeLessThan(serialTime);
        });
    });
});