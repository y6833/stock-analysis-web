import { describe, it, expect } from 'vitest';
import { DojiPatternDetector } from '../../modules/technical-analysis/patterns/doji/DojiPatternDetector';
import { KLineData } from '../../types/technical-analysis/kline';

describe('DojiPatternDetector', () => {
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

    it('should detect standard doji', () => {
        const detector = new DojiPatternDetector();

        // 标准十字星：开盘价和收盘价相等，有上下影线
        const standardDoji = createKLine(100, 105, 95, 100);

        expect(detector.detectStandardDoji(standardDoji)).toBe(true);

        // 非十字星：开盘价和收盘价差异较大
        const nonDoji = createKLine(100, 105, 95, 110);
        expect(detector.detectStandardDoji(nonDoji)).toBe(false);
    });

    it('should detect dragonfly doji', () => {
        const detector = new DojiPatternDetector();

        // 蜻蜓十字星：开盘价和收盘价相等，接近最高价，有长下影线
        const dragonflyDoji = createKLine(100, 101, 90, 100);

        expect(detector.detectDragonfly(dragonflyDoji)).toBe(true);

        // 非蜻蜓十字星：有明显上影线
        const nonDragonflyDoji = createKLine(100, 105, 90, 100);
        expect(detector.detectDragonfly(nonDragonflyDoji)).toBe(false);
    });

    it('should detect gravestone doji', () => {
        const detector = new DojiPatternDetector();

        // 墓碑十字星：开盘价和收盘价相等，接近最低价，有长上影线
        const gravestoneDoji = createKLine(100, 110, 99, 100);

        expect(detector.detectGravestone(gravestoneDoji)).toBe(true);

        // 非墓碑十字星：有明显下影线
        const nonGravestoneDoji = createKLine(100, 110, 90, 100);
        expect(detector.detectGravestone(nonGravestoneDoji)).toBe(false);
    });

    it('should detect long legged doji', () => {
        const detector = new DojiPatternDetector();

        // 长腿十字星：开盘价和收盘价相等，有长上下影线
        const longLeggedDoji = createKLine(100, 110, 90, 100);

        expect(detector.detectLongLeggedDoji(longLeggedDoji)).toBe(true);

        // 非长腿十字星：上下影线不够长
        const nonLongLeggedDoji = createKLine(100, 102, 98, 100);
        expect(detector.detectLongLeggedDoji(nonLongLeggedDoji)).toBe(false);
    });

    it('should detect patterns in a series of candles', () => {
        const detector = new DojiPatternDetector();

        const klines: KLineData[] = [
            createKLine(100, 105, 95, 110, 1625097600000), // 非十字星
            createKLine(110, 115, 105, 110, 1625184000000), // 标准十字星
            createKLine(110, 111, 100, 110, 1625270400000), // 蜻蜓十字星
            createKLine(110, 120, 109, 110, 1625356800000), // 墓碑十字星
            createKLine(110, 120, 100, 110, 1625443200000), // 长腿十字星
        ];

        const patterns = detector.detectPatterns(klines);

        // 应该检测到4种十字星形态
        expect(patterns.length).toBe(4);

        // 验证检测到的形态类型
        expect(patterns[0].type).toBe('standard');
        expect(patterns[1].type).toBe('dragonfly');
        expect(patterns[2].type).toBe('gravestone');
        expect(patterns[3].type).toBe('longLegged');
    });

    it('should handle empty or null input', () => {
        const detector = new DojiPatternDetector();

        expect(detector.detectPatterns([])).toEqual([]);
        expect(detector.detectPatterns(null as any)).toEqual([]);
    });

    it('should allow configuration updates', () => {
        const detector = new DojiPatternDetector();

        // 默认配置下不是十字星（开盘价和收盘价差异超过默认阈值）
        const almostDoji = createKLine(100, 105, 95, 100.2);
        expect(detector.detectStandardDoji(almostDoji)).toBe(false);

        // 更新配置，增加容差
        detector.updateConfig({ equalPriceThreshold: 0.5 });

        // 现在应该被识别为十字星
        expect(detector.detectStandardDoji(almostDoji)).toBe(true);
    });
});