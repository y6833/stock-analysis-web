import { describe, it, expect, beforeEach } from 'vitest';
import { DojiPatternDetector } from '../../modules/technical-analysis/patterns/doji/DojiPatternDetector';
import { KLineData } from '../../types/technical-analysis/kline';
import { DojiConfig, DojiPattern, DojiType } from '../../types/technical-analysis/doji';

describe('DojiPatternDetector - 综合算法测试', () => {
    let detector: DojiPatternDetector;

    // 创建测试用的K线数据
    const createKLine = (
        open: number,
        high: number,
        low: number,
        close: number,
        timestamp: number = Date.now(),
        volume: number = 1000
    ): KLineData => ({
        open,
        high,
        low,
        close,
        timestamp,
        volume,
    });

    beforeEach(() => {
        // 每个测试前创建新的检测器实例，禁用Worker以便同步测试
        detector = new DojiPatternDetector({}, false);
    });

    describe('基础十字星识别测试', () => {
        it('应准确识别标准十字星', () => {
            // 完美标准十字星
            const perfectDoji = createKLine(100, 105, 95, 100);
            expect(detector.detectStandardDoji(perfectDoji)).toBe(true);

            // 接近标准十字星（开盘收盘价略有差异）
            const closeDoji = createKLine(100, 105, 95, 100.09);
            expect(detector.detectStandardDoji(closeDoji)).toBe(true);

            // 非标准十字星（开盘收盘价差异过大）
            const nonDoji = createKLine(100, 105, 95, 102);
            expect(detector.detectStandardDoji(nonDoji)).toBe(false);

            // 无上影线的K线不是标准十字星
            const noUpperShadow = createKLine(100, 100, 95, 100);
            expect(detector.detectStandardDoji(noUpperShadow)).toBe(false);

            // 无下影线的K线不是标准十字星
            const noLowerShadow = createKLine(100, 105, 100, 100);
            expect(detector.detectStandardDoji(noLowerShadow)).toBe(false);
        });

        it('应准确识别蜻蜓十字星', () => {
            // 完美蜻蜓十字星（开盘=收盘=最高价）
            const perfectDragonfly = createKLine(100, 100, 90, 100);
            expect(detector.detectDragonfly(perfectDragonfly)).toBe(true);

            // 接近蜻蜓十字星（最高价略高于开盘收盘价）
            const closeDragonfly = createKLine(100, 101, 90, 100);
            expect(detector.detectDragonfly(closeDragonfly)).toBe(true);

            // 非蜻蜓十字星（上影线过长）
            const nonDragonfly = createKLine(100, 105, 90, 100);
            expect(detector.detectDragonfly(nonDragonfly)).toBe(false);

            // 非蜻蜓十字星（下影线不够长）
            const shortLowerShadow = createKLine(100, 101, 98, 100);
            expect(detector.detectDragonfly(shortLowerShadow)).toBe(false);

            // 非蜻蜓十字星（开盘收盘价差异过大）
            const largePriceDiff = createKLine(100, 101, 90, 102);
            expect(detector.detectDragonfly(largePriceDiff)).toBe(false);
        });

        it('应准确识别墓碑十字星', () => {
            // 完美墓碑十字星（开盘=收盘=最低价）
            const perfectGravestone = createKLine(100, 110, 100, 100);
            expect(detector.detectGravestone(perfectGravestone)).toBe(true);

            // 接近墓碑十字星（最低价略低于开盘收盘价）
            const closeGravestone = createKLine(100, 110, 99, 100);
            expect(detector.detectGravestone(closeGravestone)).toBe(true);

            // 非墓碑十字星（下影线过长）
            const nonGravestone = createKLine(100, 110, 95, 100);
            expect(detector.detectGravestone(nonGravestone)).toBe(false);

            // 非墓碑十字星（上影线不够长）
            const shortUpperShadow = createKLine(100, 102, 99, 100);
            expect(detector.detectGravestone(shortUpperShadow)).toBe(false);

            // 非墓碑十字星（开盘收盘价差异过大）
            const largePriceDiff = createKLine(100, 110, 99, 102);
            expect(detector.detectGravestone(largePriceDiff)).toBe(false);
        });

        it('应准确识别长腿十字星', () => {
            // 完美长腿十字星（上下影线都很长）
            const perfectLongLegged = createKLine(100, 110, 90, 100);
            expect(detector.detectLongLeggedDoji(perfectLongLegged)).toBe(true);

            // 非长腿十字星（影线不够长）
            const shortShadows = createKLine(100, 102, 98, 100);
            expect(detector.detectLongLeggedDoji(shortShadows)).toBe(false);

            // 非长腿十字星（开盘收盘价差异过大）
            const largePriceDiff = createKLine(100, 110, 90, 102);
            expect(detector.detectLongLeggedDoji(largePriceDiff)).toBe(false);

            // 非长腿十字星（只有上影线长）
            const onlyUpperLong = createKLine(100, 110, 99, 100);
            expect(detector.detectLongLeggedDoji(onlyUpperLong)).toBe(false);

            // 非长腿十字星（只有下影线长）
            const onlyLowerLong = createKLine(100, 101, 90, 100);
            expect(detector.detectLongLeggedDoji(onlyLowerLong)).toBe(false);
        });
    });

    describe('参数敏感度测试', () => {
        it('应根据equalPriceThreshold参数正确识别十字星', () => {
            // 创建一系列开盘收盘价差异逐渐增大的K线
            const testCases = [
                { open: 100, close: 100, expected: true },      // 完全相等
                { open: 100, close: 100.05, expected: true },   // 差异0.05%
                { open: 100, close: 100.1, expected: true },    // 差异0.1%（默认阈值）
                { open: 100, close: 100.11, expected: false },  // 差异0.11%
                { open: 100, close: 100.2, expected: false },   // 差异0.2%
                { open: 100, close: 100.5, expected: false },   // 差异0.5%
            ];

            // 使用默认配置测试
            testCases.forEach(testCase => {
                const kline = createKLine(testCase.open, 105, 95, testCase.close);
                expect(
                    detector.detectStandardDoji(kline),
                    `开盘价${testCase.open}，收盘价${testCase.close}，默认阈值`
                ).toBe(testCase.expected);
            });

            // 更新配置，增加容差
            detector.updateConfig({ equalPriceThreshold: 0.2 });

            // 使用新配置测试
            const updatedExpectations = [
                { open: 100, close: 100, expected: true },      // 完全相等
                { open: 100, close: 100.05, expected: true },   // 差异0.05%
                { open: 100, close: 100.1, expected: true },    // 差异0.1%
                { open: 100, close: 100.11, expected: true },   // 差异0.11%
                { open: 100, close: 100.2, expected: true },    // 差异0.2%（新阈值）
                { open: 100, close: 100.21, expected: false },  // 差异0.21%
            ];

            updatedExpectations.forEach(testCase => {
                const kline = createKLine(testCase.open, 105, 95, testCase.close);
                expect(
                    detector.detectStandardDoji(kline),
                    `开盘价${testCase.open}，收盘价${testCase.close}，阈值0.2%`
                ).toBe(testCase.expected);
            });
        });

        it('应根据longLegThreshold参数正确识别长腿十字星', () => {
            // 创建不同影线长度的K线
            const testCases = [
                { shadowRatio: 1.0, expected: false },  // 影线长度为实体的1倍
                { shadowRatio: 1.5, expected: false },  // 影线长度为实体的1.5倍
                { shadowRatio: 2.0, expected: true },   // 影线长度为实体的2倍（默认阈值）
                { shadowRatio: 3.0, expected: true },   // 影线长度为实体的3倍
            ];

            // 测试不同影线比例的K线
            testCases.forEach(testCase => {
                // 创建一个开盘收盘价差为1的K线，影线长度根据比例设置
                const shadowLength = testCase.shadowRatio * 1;
                const kline = createKLine(100, 100 + shadowLength, 100 - shadowLength, 101);

                expect(
                    detector.detectLongLeggedDoji(kline),
                    `影线比例${testCase.shadowRatio}，默认阈值`
                ).toBe(false); // 因为开盘收盘价差异，所以都应该是false
            });

            // 更新配置，降低长腿阈值
            detector.updateConfig({ longLegThreshold: 1.5, equalPriceThreshold: 1.0 });

            // 使用新配置测试
            testCases.forEach(testCase => {
                // 创建一个开盘收盘价差为1%的K线，影线长度根据比例设置
                const shadowLength = testCase.shadowRatio * 1;
                const kline = createKLine(100, 100 + shadowLength, 100 - shadowLength, 101);

                const expected = testCase.shadowRatio >= 1.5; // 新阈值是1.5
                expect(
                    detector.detectLongLeggedDoji(kline),
                    `影线比例${testCase.shadowRatio}，阈值1.5`
                ).toBe(expected);
            });
        });
    });

    describe('综合检测测试', () => {
        it('应正确检测K线序列中的所有十字星形态', async () => {
            // 创建包含各种十字星和非十字星的K线序列
            const klines: KLineData[] = [
                createKLine(100, 105, 95, 100, 1625097600000),   // 标准十字星
                createKLine(110, 115, 105, 112, 1625184000000),  // 非十字星
                createKLine(110, 111, 100, 110, 1625270400000),  // 蜻蜓十字星
                createKLine(110, 120, 109, 110, 1625356800000),  // 墓碑十字星
                createKLine(110, 120, 100, 110, 1625443200000),  // 长腿十字星
                createKLine(110, 112, 108, 111, 1625529600000),  // 非十字星
            ];

            // 检测形态
            const patterns = await detector.detectPatternsSync(klines);

            // 应该检测到4种十字星形态
            expect(patterns.length).toBe(4);

            // 验证检测到的形态类型
            expect(patterns[0].type).toBe('standard');
            expect(patterns[1].type).toBe('dragonfly');
            expect(patterns[2].type).toBe('gravestone');
            expect(patterns[3].type).toBe('longLegged');

            // 验证时间戳
            expect(patterns[0].timestamp).toBe(1625097600000);
            expect(patterns[1].timestamp).toBe(1625270400000);
            expect(patterns[2].timestamp).toBe(1625356800000);
            expect(patterns[3].timestamp).toBe(1625443200000);
        });

        it('应正确计算形态显著性', async () => {
            // 创建不同质量的十字星
            const klines: KLineData[] = [
                createKLine(100, 105, 95, 100, 1625097600000),    // 完美标准十字星
                createKLine(100, 105, 95, 100.09, 1625184000000), // 接近标准十字星
                createKLine(100, 100, 90, 100, 1625270400000),    // 完美蜻蜓十字星
                createKLine(100, 110, 100, 100, 1625356800000),   // 完美墓碑十字星
                createKLine(100, 110, 90, 100, 1625443200000),    // 完美长腿十字星
            ];

            // 检测形态
            const patterns = await detector.detectPatternsSync(klines);

            // 应该检测到5个十字星
            expect(patterns.length).toBe(5);

            // 验证形态类型
            expect(patterns[0].type).toBe('standard');
            expect(patterns[1].type).toBe('standard');
            expect(patterns[2].type).toBe('dragonfly');
            expect(patterns[3].type).toBe('gravestone');
            expect(patterns[4].type).toBe('longLegged');

            // 完美十字星的显著性应该高于接近十字星
            expect(patterns[0].significance).toBeGreaterThan(patterns[1].significance);

            // 所有完美形态的显著性应该都很高
            expect(patterns[0].significance).toBeGreaterThan(0.9);
            expect(patterns[2].significance).toBeGreaterThan(0.9);
            expect(patterns[3].significance).toBeGreaterThan(0.9);
            expect(patterns[4].significance).toBeGreaterThan(0.9);
        });

        it('应正确处理趋势判断', async () => {
            // 创建具有明确趋势的K线序列
            const uptrendKlines: KLineData[] = [
                createKLine(90, 95, 85, 92, 1625097600000),
                createKLine(92, 97, 87, 94, 1625184000000),
                createKLine(94, 99, 89, 96, 1625270400000),
                createKLine(96, 101, 91, 98, 1625356800000),
                createKLine(98, 103, 93, 100, 1625443200000),
                createKLine(100, 105, 95, 100, 1625529600000), // 标准十字星
            ];

            const downtrendKlines: KLineData[] = [
                createKLine(110, 115, 105, 108, 1625097600000),
                createKLine(108, 113, 103, 106, 1625184000000),
                createKLine(106, 111, 101, 104, 1625270400000),
                createKLine(104, 109, 99, 102, 1625356800000),
                createKLine(102, 107, 97, 100, 1625443200000),
                createKLine(100, 105, 95, 100, 1625529600000), // 标准十字星
            ];

            const sidewaysKlines: KLineData[] = [
                createKLine(99, 104, 94, 100, 1625097600000),
                createKLine(100, 105, 95, 101, 1625184000000),
                createKLine(101, 106, 96, 100, 1625270400000),
                createKLine(100, 105, 95, 101, 1625356800000),
                createKLine(101, 106, 96, 100, 1625443200000),
                createKLine(100, 105, 95, 100, 1625529600000), // 标准十字星
            ];

            // 检测形态
            const uptrendPatterns = await detector.detectPatternsSync(uptrendKlines);
            const downtrendPatterns = await detector.detectPatternsSync(downtrendKlines);
            const sidewaysPatterns = await detector.detectPatternsSync(sidewaysKlines);

            // 验证趋势判断
            expect(uptrendPatterns[0].context.trend).toBe('uptrend');
            expect(downtrendPatterns[0].context.trend).toBe('downtrend');
            expect(sidewaysPatterns[0].context.trend).toBe('sideways');
        });
    });

    describe('边界条件和异常处理测试', () => {
        it('应正确处理空数据', async () => {
            const emptyResult = await detector.detectPatternsSync([]);
            expect(emptyResult).toEqual([]);
        });

        it('应正确处理无效数据', async () => {
            // 创建包含无效数据的K线
            const invalidKlines: KLineData[] = [
                createKLine(NaN, 105, 95, 100),
                createKLine(100, Infinity, 95, 100),
                createKLine(100, 105, -Infinity, 100),
                createKLine(100, 105, 95, NaN),
            ];

            // 检测形态
            const patterns = await detector.detectPatternsSync(invalidKlines);

            // 不应检测到任何形态
            expect(patterns.length).toBe(0);
        });

        it('应正确处理极端价格', async () => {
            // 创建包含极端价格的K线
            const extremePriceKlines: KLineData[] = [
                createKLine(0, 0, 0, 0),                                // 零价格
                createKLine(0.0001, 0.00011, 0.00009, 0.0001),          // 极小价格
                createKLine(1000000, 1100000, 900000, 1000000),         // 极大价格
                createKLine(-10, -5, -15, -10),                         // 负价格
            ];

            // 检测形态
            const patterns = await detector.detectPatternsSync(extremePriceKlines);

            // 应该检测到4个十字星（所有极端价格都是有效的十字星）
            expect(patterns.length).toBe(4);
        });

        it('应正确处理数据错误', async () => {
            // 创建包含数据错误的K线
            const errorKlines: KLineData[] = [
                createKLine(110, 105, 95, 100),  // 开盘价高于最高价
                createKLine(100, 105, 95, 90),   // 收盘价低于最低价
                createKLine(100, 90, 110, 100),  // 最高价小于最低价
            ];

            // 检测形态
            const patterns = await detector.detectPatternsSync(errorKlines);

            // 不应检测到任何形态
            expect(patterns.length).toBe(0);
        });
    });

    describe('缓存和增量计算测试', () => {
        it('应正确处理增量计算', async () => {
            // 创建初始K线序列
            const initialKlines: KLineData[] = [
                createKLine(100, 105, 95, 100, 1625097600000),   // 标准十字星
                createKLine(110, 115, 105, 112, 1625184000000),  // 非十字星
                createKLine(110, 111, 100, 110, 1625270400000),  // 蜻蜓十字星
            ];

            // 检测初始形态
            const initialPatterns = await detector.detectPatternsSync(initialKlines, 'TEST001');
            expect(initialPatterns.length).toBe(2);

            // 添加更多K线
            const additionalKlines: KLineData[] = [
                ...initialKlines,
                createKLine(110, 120, 109, 110, 1625356800000),  // 墓碑十字星
                createKLine(110, 120, 100, 110, 1625443200000),  // 长腿十字星
            ];

            // 检测更新后的形态
            const updatedPatterns = await detector.detectPatternsSync(additionalKlines, 'TEST001');
            expect(updatedPatterns.length).toBe(4);

            // 验证缓存状态
            const cacheStatus = detector.getCacheStatus();
            expect(cacheStatus.enabled).toBe(true);
            expect(cacheStatus.stockCount).toBeGreaterThan(0);
            expect(cacheStatus.patternCount).toBeGreaterThan(0);
        });

        it('应正确处理缓存清除', async () => {
            // 创建K线序列
            const klines: KLineData[] = [
                createKLine(100, 105, 95, 100, 1625097600000),   // 标准十字星
                createKLine(110, 111, 100, 110, 1625270400000),  // 蜻蜓十字星
            ];

            // 检测形态并缓存
            await detector.detectPatternsSync(klines, 'TEST002');

            // 验证缓存状态
            let cacheStatus = detector.getCacheStatus();
            expect(cacheStatus.stockCount).toBeGreaterThan(0);

            // 清除特定股票的缓存
            detector.clearCache('TEST002');

            // 验证缓存状态
            cacheStatus = detector.getCacheStatus();
            expect(cacheStatus.stockCount).toBe(0);

            // 再次检测形态并缓存多个股票
            await detector.detectPatternsSync(klines, 'TEST003');
            await detector.detectPatternsSync(klines, 'TEST004');

            // 验证缓存状态
            cacheStatus = detector.getCacheStatus();
            expect(cacheStatus.stockCount).toBe(2);

            // 清除所有缓存
            detector.clearCache();

            // 验证缓存状态
            cacheStatus = detector.getCacheStatus();
            expect(cacheStatus.stockCount).toBe(0);
        });
    });

    describe('配置更新测试', () => {
        it('应正确处理配置更新', async () => {
            // 创建边界情况的K线
            const borderlineDoji = createKLine(100, 105, 95, 100.2);

            // 默认配置下不是十字星
            expect(detector.detectStandardDoji(borderlineDoji)).toBe(false);

            // 更新配置
            await detector.updateConfig({ equalPriceThreshold: 0.3 });

            // 获取更新后的配置
            const config = detector.getConfig();
            expect(config.equalPriceThreshold).toBe(0.3);

            // 现在应该被识别为十字星
            expect(detector.detectStandardDoji(borderlineDoji)).toBe(true);
        });

        it('应正确处理Worker启用/禁用', () => {
            // 默认启用Worker
            expect(detector.isWorkerEnabled()).toBe(false); // 我们在测试中禁用了Worker

            // 启用Worker
            detector.enableWorker();
            expect(detector.isWorkerEnabled()).toBe(true);

            // 禁用Worker
            detector.disableWorker();
            expect(detector.isWorkerEnabled()).toBe(false);
        });
    });
});