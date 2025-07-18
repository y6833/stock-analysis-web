import { describe, it, expect } from 'vitest';
import { StandardDojiDetector } from '../../modules/technical-analysis/patterns/doji/StandardDojiDetector';
import { KLineData } from '../../types/technical-analysis/kline';

describe('StandardDojiDetector', () => {
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

    describe('基本检测功能', () => {
        it('应该正确检测标准十字星', () => {
            const detector = new StandardDojiDetector();

            // 标准十字星：开盘价和收盘价相等，有上下影线
            const standardDoji = createKLine(100, 105, 95, 100);
            expect(detector.detect(standardDoji)).toBe(true);

            // 非十字星：开盘价和收盘价差异较大
            const nonDoji = createKLine(100, 105, 95, 110);
            expect(detector.detect(nonDoji)).toBe(false);
        });

        it('应该处理开盘价和收盘价接近但不完全相等的情况', () => {
            const detector = new StandardDojiDetector();

            // 开盘价和收盘价非常接近（在容差范围内）
            const almostDoji = createKLine(100, 105, 95, 100.09);
            expect(detector.detect(almostDoji)).toBe(true);

            // 开盘价和收盘价差异超过容差
            const notDoji = createKLine(100, 105, 95, 100.2);
            expect(detector.detect(notDoji)).toBe(false);
        });
    });

    describe('敏感度参数控制', () => {
        it('应该根据敏感度参数调整检测标准', () => {
            const detector = new StandardDojiDetector();

            // 创建一个开盘价和收盘价略有差异的K线
            const almostDoji = createKLine(100, 105, 95, 100.09);

            // 低敏感度下应该被识别为十字星
            expect(detector.detectWithSensitivity(almostDoji, 0.2)).toBe(true);

            // 高敏感度下不应该被识别为十字星
            expect(detector.detectWithSensitivity(almostDoji, 0.8)).toBe(false);
        });

        it('应该验证敏感度参数范围', () => {
            const detector = new StandardDojiDetector();
            const candle = createKLine(100, 105, 95, 100);

            // 敏感度参数超出范围应该抛出错误
            expect(() => detector.detectWithSensitivity(candle, -0.1)).toThrow();
            expect(() => detector.detectWithSensitivity(candle, 1.1)).toThrow();

            // 边界值应该正常工作
            expect(() => detector.detectWithSensitivity(candle, 0)).not.toThrow();
            expect(() => detector.detectWithSensitivity(candle, 1)).not.toThrow();
        });

        it('应该根据敏感度调整影线要求', () => {
            const detector = new StandardDojiDetector();

            // 创建一个开盘价和收盘价相等但影线较短的K线
            const shortShadowDoji = createKLine(100, 101, 99, 100);

            // 低敏感度下应该被识别为十字星
            expect(detector.detectWithSensitivity(shortShadowDoji, 0.1)).toBe(true);

            // 高敏感度下不应该被识别为十字星（因为影线太短）
            expect(detector.detectWithSensitivity(shortShadowDoji, 0.9)).toBe(false);
        });
    });

    describe('配置参数控制', () => {
        it('应该允许通过配置调整容差阈值', () => {
            // 默认配置
            const defaultDetector = new StandardDojiDetector();

            // 自定义配置（更宽松的容差）
            const customDetector = new StandardDojiDetector({
                equalPriceThreshold: 0.5
            });

            // 开盘价和收盘价差异为0.3%
            const almostDoji = createKLine(100, 105, 95, 100.3);

            // 默认配置下不是十字星
            expect(defaultDetector.detect(almostDoji)).toBe(false);

            // 自定义配置下是十字星
            expect(customDetector.detect(almostDoji)).toBe(true);
        });

        it('应该允许动态更新配置', () => {
            const detector = new StandardDojiDetector();

            // 开盘价和收盘价差异为0.3%
            const almostDoji = createKLine(100, 105, 95, 100.3);

            // 默认配置下不是十字星
            expect(detector.detect(almostDoji)).toBe(false);

            // 更新配置
            detector.updateConfig({ equalPriceThreshold: 0.5 });

            // 更新配置后是十字星
            expect(detector.detect(almostDoji)).toBe(true);
        });
    });

    describe('辅助计算方法', () => {
        it('应该正确计算实体比例', () => {
            const detector = new StandardDojiDetector();

            // 实体占比10%的K线
            const candle = createKLine(100, 110, 90, 102);

            // 实体大小为2，K线总长度为20，比例为0.1
            expect(detector.calculateBodyRatio(candle)).toBeCloseTo(0.1);
        });

        it('应该正确计算上下影线比例', () => {
            const detector = new StandardDojiDetector();

            // 上影线8，下影线2，总长度20的K线
            const candle = createKLine(100, 108, 98, 100);

            const ratios = detector.calculateShadowRatios(candle);
            expect(ratios.upper).toBeCloseTo(0.4); // 8/20
            expect(ratios.lower).toBeCloseTo(0.1); // 2/20
        });

        it('应该处理极端情况', () => {
            const detector = new StandardDojiDetector();

            // 没有影线的K线
            const noShadowCandle = createKLine(100, 100, 100, 100);

            expect(detector.calculateBodyRatio(noShadowCandle)).toBe(0);
            const ratios = detector.calculateShadowRatios(noShadowCandle);
            expect(ratios.upper).toBe(0);
            expect(ratios.lower).toBe(0);
        });
    });

    describe('显著性计算', () => {
        it('应该为非十字星返回0显著性', () => {
            const detector = new StandardDojiDetector();

            // 非十字星
            const nonDoji = createKLine(100, 105, 95, 110);

            expect(detector.calculateSignificance(nonDoji)).toBe(0);
        });

        it('应该根据开盘收盘价接近程度和影线平衡度计算显著性', () => {
            const detector = new StandardDojiDetector();

            // 完美十字星：开盘价=收盘价，上下影线完全平衡
            const perfectDoji = createKLine(100, 105, 95, 100);

            // 显著性应该接近1
            expect(detector.calculateSignificance(perfectDoji)).toBeCloseTo(1);

            // 不太完美的十字星：开盘价和收盘价略有差异，上下影线不平衡
            const imperfectDoji = createKLine(100, 106, 97, 100.05);

            // 显著性应该低于1但大于0
            const significance = detector.calculateSignificance(imperfectDoji);
            expect(significance).toBeLessThan(1);
            expect(significance).toBeGreaterThan(0);
        });
    });
});