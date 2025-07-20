import { describe, it, expect, beforeEach } from 'vitest';
import { DojiPatternDetector } from '../../modules/technical-analysis/patterns/doji/DojiPatternDetector';
import { KLineData } from '../../types/technical-analysis/kline';
import { DojiType } from '../../types/technical-analysis/doji';

describe('DojiPatternDetector - 边界条件和异常情况测试', () => {
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

    describe('极端价格情况', () => {
        it('应该正确处理价格为0的情况', () => {
            const zeroPrice = createKLine(0, 0, 0, 0);

            // 不应抛出异常
            expect(() => detector.detectStandardDoji(zeroPrice)).not.toThrow();
            expect(() => detector.detectDragonfly(zeroPrice)).not.toThrow();
            expect(() => detector.detectGravestone(zeroPrice)).not.toThrow();
            expect(() => detector.detectLongLeggedDoji(zeroPrice)).not.toThrow();

            // 零价格应被视为十字星（开盘=收盘）
            expect(detector.detectStandardDoji(zeroPrice)).toBe(true);
        });

        it('应该正确处理负价格的情况', () => {
            const negativePrice = createKLine(-10, -5, -15, -10);

            // 不应抛出异常
            expect(() => detector.detectStandardDoji(negativePrice)).not.toThrow();

            // 负价格也应正确识别十字星
            expect(detector.detectStandardDoji(negativePrice)).toBe(true);
        });

        it('应该正确处理极小价格的情况', () => {
            const tinyPrice = createKLine(0.0001, 0.00011, 0.00009, 0.0001);

            // 不应抛出异常
            expect(() => detector.detectStandardDoji(tinyPrice)).not.toThrow();

            // 极小价格也应正确识别十字星
            expect(detector.detectStandardDoji(tinyPrice)).toBe(true);
        });

        it('应该正确处理极大价格的情况', () => {
            const hugePrice = createKLine(1000000, 1100000, 900000, 1000000);

            // 不应抛出异常
            expect(() => detector.detectStandardDoji(hugePrice)).not.toThrow();

            // 极大价格也应正确识别十字星
            expect(detector.detectStandardDoji(hugePrice)).toBe(true);
        });
    });

    describe('数据错误情况', () => {
        it('应该正确处理最高价小于最低价的情况', () => {
            const invalidHighLow = createKLine(100, 90, 110, 100);

            // 不应抛出异常
            expect(() => detector.detectStandardDoji(invalidHighLow)).not.toThrow();

            // 数据无效，应返回false
            expect(detector.detectStandardDoji(invalidHighLow)).toBe(false);
        });

        it('应该正确处理开盘价高于最高价的情况', () => {
            const invalidOpen = createKLine(110, 105, 95, 100);

            // 不应抛出异常
            expect(() => detector.detectStandardDoji(invalidOpen)).not.toThrow();

            // 数据无效，应返回false
            expect(detector.detectStandardDoji(invalidOpen)).toBe(false);
        });

        it('应该正确处理收盘价低于最低价的情况', () => {
            const invalidClose = createKLine(100, 105, 95, 90);

            // 不应抛出异常
            expect(() => detector.detectStandardDoji(invalidClose)).not.toThrow();

            // 数据无效，应返回false
            expect(detector.detectStandardDoji(invalidClose)).toBe(false);
        });

        it('应该正确处理NaN和Infinity价格的情况', () => {
            const nanPrice = createKLine(NaN, 105, 95, 100);
            const infinityPrice = createKLine(100, Infinity, 95, 100);

            // 不应抛出异常
            expect(() => detector.detectStandardDoji(nanPrice)).not.toThrow();
            expect(() => detector.detectStandardDoji(infinityPrice)).not.toThrow();

            // NaN和Infinity应被视为无效数据
            expect(detector.detectStandardDoji(nanPrice)).toBe(false);
            expect(detector.detectStandardDoji(infinityPrice)).toBe(false);
        });
    });

    describe('边界敏感度测试', () => {
        it('应该根据equalPriceThreshold正确识别边界情况', () => {
            // 创建一系列开盘收盘价差异逐渐增大的K线
            const testCases = [
                { open: 100, close: 100, expected: true },      // 完全相等
                { open: 100, close: 100.05, expected: true },   // 差异0.05%
                { open: 100, close: 100.1, expected: true },    // 差异0.1%（默认阈值）
                { open: 100, close: 100.11, expected: false },  // 差异0.11%
                { open: 100, close: 100.2, expected: false },   // 差异0.2%
            ];

            testCases.forEach(testCase => {
                const kline = createKLine(testCase.open, 105, 95, testCase.close);
                expect(
                    detector.detectStandardDoji(kline),
                    `开盘价${testCase.open}，收盘价${testCase.close}`
                ).toBe(testCase.expected);
            });

            // 更新配置，增加容差
            detector.updateConfig({ equalPriceThreshold: 0.2 });

            // 现在差异0.2%的也应该被识别为十字星
            const borderlineCase = createKLine(100, 105, 95, 100.2);
            expect(detector.detectStandardDoji(borderlineCase)).toBe(true);
        });

        it('应该根据bodyThreshold正确识别实体与影线比例的边界情况', () => {
            // 更新配置，设置实体阈值
            detector.updateConfig({ bodyThreshold: 0.1 });

            // 创建不同实体大小的K线
            const smallBodyDoji = createKLine(100, 105, 95, 100.05); // 实体很小
            const mediumBodyDoji = createKLine(100, 105, 95, 101); // 实体中等
            const largeBodyDoji = createKLine(100, 105, 95, 103); // 实体较大

            // 检测结果
            expect(detector.detectStandardDoji(smallBodyDoji)).toBe(true);
            expect(detector.detectStandardDoji(mediumBodyDoji)).toBe(false);
            expect(detector.detectStandardDoji(largeBodyDoji)).toBe(false);
        });

        it('应该根据longLegThreshold正确识别长腿十字星的边界情况', () => {
            // 创建不同影线长度的K线
            const shortLegDoji = createKLine(100, 102, 98, 100); // 短影线
            const mediumLegDoji = createKLine(100, 105, 95, 100); // 中等影线
            const longLegDoji = createKLine(100, 110, 90, 100); // 长影线

            // 默认配置下（longLegThreshold = 2.0）
            expect(detector.detectLongLeggedDoji(shortLegDoji)).toBe(false);
            expect(detector.detectLongLeggedDoji(mediumLegDoji)).toBe(false);
            expect(detector.detectLongLeggedDoji(longLegDoji)).toBe(true);

            // 更新配置，降低长腿阈值
            detector.updateConfig({ longLegThreshold: 1.0 });

            // 现在中等影线的也应该被识别为长腿十字星
            expect(detector.detectLongLeggedDoji(mediumLegDoji)).toBe(true);
        });
    });

    describe('特殊十字星变种识别准确性', () => {
        it('应该准确识别完美的蜻蜓十字星', () => {
            const perfectDragonfly = createKLine(100, 100, 90, 100); // 开盘=收盘=最高价
            expect(detector.detectDragonfly(perfectDragonfly)).toBe(true);
        });

        it('应该准确识别接近的蜻蜓十字星', () => {
            const closeDragonfly = createKLine(100, 101, 90, 100); // 最高价略高于开盘收盘价
            expect(detector.detectDragonfly(closeDragonfly)).toBe(true);
        });

        it('应该准确识别完美的墓碑十字星', () => {
            const perfectGravestone = createKLine(100, 110, 100, 100); // 开盘=收盘=最低价
            expect(detector.detectGravestone(perfectGravestone)).toBe(true);
        });

        it('应该准确识别接近的墓碑十字星', () => {
            const closeGravestone = createKLine(100, 110, 99, 100); // 最低价略低于开盘收盘价
            expect(detector.detectGravestone(closeGravestone)).toBe(true);
        });

        it('应该区分蜻蜓十字星和墓碑十字星', () => {
            const dragonfly = createKLine(100, 101, 90, 100);
            const gravestone = createKLine(100, 110, 99, 100);

            expect(detector.detectDragonfly(dragonfly)).toBe(true);
            expect(detector.detectGravestone(dragonfly)).toBe(false);

            expect(detector.detectDragonfly(gravestone)).toBe(false);
            expect(detector.detectGravestone(gravestone)).toBe(true);
        });
    });

    describe('显著性评分测试', () => {
        it('应该为不同质量的十字星分配合理的显著性评分', async () => {
            // 创建不同质量的十字星
            const perfectDoji = createKLine(100, 105, 95, 100); // 完美十字星
            const almostDoji = createKLine(100, 105, 95, 100.09); // 接近十字星
            const barelyDoji = createKLine(100, 105, 95, 100.1); // 勉强算十字星

            // 检测形态
            const patterns = await detector.detectPatternsSync([perfectDoji, almostDoji, barelyDoji]);

            // 应该检测到2个十字星（barelyDoji超出默认阈值）
            expect(patterns.length).toBe(2);

            // 完美十字星的显著性应该高于接近十字星
            expect(patterns[0].significance).toBeGreaterThan(patterns[1].significance);

            // 完美十字星的显著性应该接近1
            expect(patterns[0].significance).toBeGreaterThan(0.9);
        });

        it('应该为不同类型的十字星计算合适的显著性评分', async () => {
            // 创建不同类型的完美十字星
            const standardDoji = createKLine(100, 105, 95, 100);
            const dragonflyDoji = createKLine(100, 100, 90, 100);
            const gravestoneDoji = createKLine(100, 110, 100, 100);
            const longLeggedDoji = createKLine(100, 110, 90, 100);

            // 检测形态
            const patterns = await detector.detectPatternsSync([
                standardDoji, dragonflyDoji, gravestoneDoji, longLeggedDoji
            ]);

            // 应该检测到4个十字星
            expect(patterns.length).toBe(4);

            // 所有完美形态的显著性应该都很高
            patterns.forEach(pattern => {
                expect(pattern.significance).toBeGreaterThan(0.8);
            });

            // 验证形态类型
            expect(patterns[0].type).toBe('standard');
            expect(patterns[1].type).toBe('dragonfly');
            expect(patterns[2].type).toBe('gravestone');
            expect(patterns[3].type).toBe('longLegged');
        });
    });
});