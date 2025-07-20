import { describe, it, expect, beforeEach } from 'vitest';
import { DojiPatternDetector } from '../../modules/technical-analysis/patterns/doji/DojiPatternDetector';
import { KLineData } from '../../types/technical-analysis/kline';

describe('DojiPatternDetector - 额外边界条件测试', () => {
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

    describe('极端价格差异测试', () => {
        it('应正确处理开盘价和收盘价完全相等的情况', () => {
            const exactEqualPrice = createKLine(100, 105, 95, 100);
            expect(detector.detectStandardDoji(exactEqualPrice)).toBe(true);
        });

        it('应正确处理开盘价和收盘价差异极小的情况', () => {
            const tinyDifference = createKLine(100, 105, 95, 100.0001);
            expect(detector.detectStandardDoji(tinyDifference)).toBe(true);
        });

        it('应正确处理开盘价和收盘价差异接近阈值的情况', () => {
            // 默认阈值是0.1%
            const nearThreshold = createKLine(100, 105, 95, 100.099);
            expect(detector.detectStandardDoji(nearThreshold)).toBe(true);

            const overThreshold = createKLine(100, 105, 95, 100.101);
            expect(detector.detectStandardDoji(overThreshold)).toBe(false);
        });
    });

    describe('极端影线比例测试', () => {
        it('应正确处理无实体但有影线的情况', () => {
            const noBodyDoji = createKLine(100, 105, 95, 100);
            expect(detector.detectStandardDoji(noBodyDoji)).toBe(true);
        });

        it('应正确处理极长上影线的情况', () => {
            const extremeUpperShadow = createKLine(100, 200, 95, 100);
            expect(detector.detectStandardDoji(extremeUpperShadow)).toBe(true);
        });

        it('应正确处理极长下影线的情况', () => {
            const extremeLowerShadow = createKLine(100, 105, 0, 100);
            expect(detector.detectStandardDoji(extremeLowerShadow)).toBe(true);
        });

        it('应正确处理极不平衡的影线比例', () => {
            const unbalancedShadows = createKLine(100, 200, 99, 100);
            // 这仍然是十字星，但不是标准的平衡十字星
            expect(detector.detectStandardDoji(unbalancedShadows)).toBe(true);
        });
    });

    describe('特殊十字星边界情况', () => {
        it('应正确处理接近蜻蜓十字星的边界情况', () => {
            // 完美蜻蜓十字星
            const perfectDragonfly = createKLine(100, 100, 90, 100);
            expect(detector.detectDragonfly(perfectDragonfly)).toBe(true);

            // 接近蜻蜓十字星，但上影线略长
            const almostDragonfly1 = createKLine(100, 101, 90, 100);
            expect(detector.detectDragonfly(almostDragonfly1)).toBe(true);

            // 上影线更长，但仍在阈值内
            const almostDragonfly2 = createKLine(100, 102, 90, 100);
            expect(detector.detectDragonfly(almostDragonfly2)).toBe(false);
        });

        it('应正确处理接近墓碑十字星的边界情况', () => {
            // 完美墓碑十字星
            const perfectGravestone = createKLine(100, 110, 100, 100);
            expect(detector.detectGravestone(perfectGravestone)).toBe(true);

            // 接近墓碑十字星，但下影线略长
            const almostGravestone1 = createKLine(100, 110, 99, 100);
            expect(detector.detectGravestone(almostGravestone1)).toBe(true);

            // 下影线更长，但仍在阈值内
            const almostGravestone2 = createKLine(100, 110, 98, 100);
            expect(detector.detectGravestone(almostGravestone2)).toBe(false);
        });

        it('应正确处理长腿十字星的边界情况', () => {
            // 标准长腿十字星
            const standardLongLegged = createKLine(100, 110, 90, 100);
            expect(detector.detectLongLeggedDoji(standardLongLegged)).toBe(true);

            // 影线长度刚好达到阈值
            detector.updateConfig({ longLegThreshold: 5.0 });
            const borderlineLongLegged = createKLine(100, 105, 95, 100);
            expect(detector.detectLongLeggedDoji(borderlineLongLegged)).toBe(true);

            // 影线长度略低于阈值
            const belowThresholdLongLegged = createKLine(100, 104, 96, 100);
            expect(detector.detectLongLeggedDoji(belowThresholdLongLegged)).toBe(false);
        });
    });

    describe('异常数据处理测试', () => {
        it('应正确处理价格为0的特殊情况', () => {
            // 所有价格都为0
            const allZeroPrices = createKLine(0, 0, 0, 0);
            expect(detector.detectStandardDoji(allZeroPrices)).toBe(true);

            // 只有开盘价和收盘价为0
            const zeroOpenClose = createKLine(0, 10, -10, 0);
            expect(detector.detectStandardDoji(zeroOpenClose)).toBe(true);
        });

        it('应正确处理极小价格的特殊情况', () => {
            // 极小价格
            const tinyPrices = createKLine(0.0001, 0.00011, 0.00009, 0.0001);
            expect(detector.detectStandardDoji(tinyPrices)).toBe(true);
        });

        it('应正确处理负价格的特殊情况', () => {
            // 负价格
            const negativePrices = createKLine(-10, -5, -15, -10);
            expect(detector.detectStandardDoji(negativePrices)).toBe(true);
        });

        it('应正确处理价格数据错误的情况', () => {
            // 最高价小于最低价
            const invalidHighLow = createKLine(100, 90, 110, 100);
            expect(detector.detectStandardDoji(invalidHighLow)).toBe(false);

            // 开盘价高于最高价
            const invalidOpen = createKLine(110, 105, 95, 100);
            expect(detector.detectStandardDoji(invalidOpen)).toBe(false);

            // 收盘价低于最低价
            const invalidClose = createKLine(100, 105, 95, 90);
            expect(detector.detectStandardDoji(invalidClose)).toBe(false);
        });
    });

    describe('多种十字星同时满足的情况', () => {
        it('应正确处理同时满足多种十字星条件的情况', () => {
            // 同时满足标准十字星和长腿十字星条件
            const standardAndLongLegged = createKLine(100, 110, 90, 100);
            expect(detector.detectStandardDoji(standardAndLongLegged)).toBe(true);
            expect(detector.detectLongLeggedDoji(standardAndLongLegged)).toBe(true);

            // 同时满足蜻蜓十字星和标准十字星条件
            const dragonflyAndStandard = createKLine(100, 101, 90, 100);
            expect(detector.detectStandardDoji(dragonflyAndStandard)).toBe(true);
            expect(detector.detectDragonfly(dragonflyAndStandard)).toBe(true);

            // 同时满足墓碑十字星和标准十字星条件
            const gravestoneAndStandard = createKLine(100, 110, 99, 100);
            expect(detector.detectStandardDoji(gravestoneAndStandard)).toBe(true);
            expect(detector.detectGravestone(gravestoneAndStandard)).toBe(true);
        });

        it('应在检测多个形态时优先选择更具体的十字星类型', async () => {
            // 创建同时满足多种条件的K线
            const multipleTypes = [
                createKLine(100, 110, 90, 100, 1625097600000),  // 同时满足标准和长腿
                createKLine(100, 101, 90, 100, 1625184000000),  // 同时满足标准和蜻蜓
                createKLine(100, 110, 99, 100, 1625270400000),  // 同时满足标准和墓碑
            ];

            // 检测形态
            const patterns = await detector.detectPatternsSync(multipleTypes);

            // 应该检测到3个形态
            expect(patterns.length).toBe(3);

            // 验证形态类型（应该选择更具体的类型）
            expect(patterns[0].type).toBe('longLegged');
            expect(patterns[1].type).toBe('dragonfly');
            expect(patterns[2].type).toBe('gravestone');
        });
    });

    describe('配置边界值测试', () => {
        it('应正确处理极端配置值', async () => {
            // 测试极小阈值
            await detector.updateConfig({ equalPriceThreshold: 0.001 });
            const smallThresholdDoji = createKLine(100, 105, 95, 100.001);
            expect(detector.detectStandardDoji(smallThresholdDoji)).toBe(true);

            const overSmallThreshold = createKLine(100, 105, 95, 100.002);
            expect(detector.detectStandardDoji(overSmallThreshold)).toBe(false);

            // 测试极大阈值
            await detector.updateConfig({ equalPriceThreshold: 5.0 });
            const largeThresholdDoji = createKLine(100, 105, 95, 104.9);
            expect(detector.detectStandardDoji(largeThresholdDoji)).toBe(true);
        });

        it('应正确处理极端长腿阈值', async () => {
            // 测试极小长腿阈值
            await detector.updateConfig({ longLegThreshold: 0.5 });
            const smallThresholdLongLegged = createKLine(100, 101, 99, 100);
            expect(detector.detectLongLeggedDoji(smallThresholdLongLegged)).toBe(true);

            // 测试极大长腿阈值
            await detector.updateConfig({ longLegThreshold: 10.0 });
            const standardLongLegged = createKLine(100, 110, 90, 100);
            expect(detector.detectLongLeggedDoji(standardLongLegged)).toBe(false);

            const extremeLongLegged = createKLine(100, 150, 50, 100);
            expect(detector.detectLongLeggedDoji(extremeLongLegged)).toBe(true);
        });
    });
});