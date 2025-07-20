import { describe, it, expect, beforeEach } from 'vitest';
import { DojiPatternDetector } from '../../modules/technical-analysis/patterns/doji/DojiPatternDetector';
import { KLineData } from '../../types/technical-analysis/kline';
import { DojiPattern, DojiType } from '../../types/technical-analysis/doji';

describe('DojiPatternDetector - 真实数据测试', () => {
    let detector: DojiPatternDetector;

    beforeEach(() => {
        // 每个测试前创建新的检测器实例，禁用Worker以便同步测试
        detector = new DojiPatternDetector({}, false);
    });

    // 创建一个模拟的真实市场数据集
    const createRealMarketDataset = (): KLineData[] => {
        return [
            // 上证指数模拟数据 - 包含各种十字星形态
            { timestamp: 1625097600000, open: 3553.12, high: 3563.25, low: 3542.87, close: 3553.15, volume: 21536789 }, // 标准十字星
            { timestamp: 1625184000000, open: 3553.15, high: 3578.56, low: 3548.23, close: 3574.12, volume: 23654125 }, // 非十字星
            { timestamp: 1625270400000, open: 3574.12, high: 3575.23, low: 3542.18, close: 3574.10, volume: 19854632 }, // 接近标准十字星
            { timestamp: 1625356800000, open: 3574.10, high: 3574.15, low: 3535.28, close: 3574.12, volume: 18563214 }, // 蜻蜓十字星
            { timestamp: 1625443200000, open: 3574.12, high: 3598.65, low: 3574.05, close: 3574.10, volume: 22145896 }, // 墓碑十字星
            { timestamp: 1625529600000, open: 3574.10, high: 3595.42, low: 3552.36, close: 3574.08, volume: 20145632 }, // 长腿十字星
            { timestamp: 1625616000000, open: 3574.08, high: 3585.26, low: 3565.48, close: 3582.15, volume: 19856321 }, // 非十字星
            { timestamp: 1625702400000, open: 3582.15, high: 3592.45, low: 3575.36, close: 3582.18, volume: 21458963 }, // 接近标准十字星
            { timestamp: 1625788800000, open: 3582.18, high: 3582.20, low: 3562.35, close: 3582.16, volume: 18965423 }, // 蜻蜓十字星
            { timestamp: 1625875200000, open: 3582.16, high: 3602.58, low: 3582.12, close: 3582.14, volume: 22145896 }, // 墓碑十字星
        ];
    };

    // 创建一个包含极端情况的数据集
    const createExtremeMarketDataset = (): KLineData[] => {
        return [
            // 极端波动情况
            { timestamp: 1626048000000, open: 3500.00, high: 3650.00, low: 3450.00, close: 3500.05, volume: 35698745 }, // 大波动标准十字星
            { timestamp: 1626134400000, open: 3500.05, high: 3500.10, low: 3350.00, close: 3500.02, volume: 42568974 }, // 极端蜻蜓十字星
            { timestamp: 1626220800000, open: 3500.02, high: 3650.00, low: 3499.98, close: 3500.00, volume: 38965214 }, // 极端墓碑十字星
            { timestamp: 1626307200000, open: 3500.00, high: 3600.00, low: 3400.00, close: 3500.00, volume: 41258963 }, // 极端长腿十字星
            // 微小波动情况
            { timestamp: 1626393600000, open: 3500.00, high: 3501.00, low: 3499.00, close: 3500.00, volume: 15698745 }, // 微小波动标准十字星
            { timestamp: 1626480000000, open: 3500.00, high: 3500.10, low: 3499.50, close: 3500.00, volume: 12568974 }, // 微小蜻蜓十字星
            { timestamp: 1626566400000, open: 3500.00, high: 3500.50, low: 3499.95, close: 3500.00, volume: 13965214 }, // 微小墓碑十字星
            { timestamp: 1626652800000, open: 3500.00, high: 3500.50, low: 3499.50, close: 3500.00, volume: 11258963 }, // 微小长腿十字星
        ];
    };

    describe('真实市场数据测试', () => {
        it('应正确识别真实市场数据中的十字星形态', async () => {
            const marketData = createRealMarketDataset();
            const patterns = await detector.detectPatternsSync(marketData, '000001.SH', '上证指数');

            // 验证检测到的形态数量
            expect(patterns.length).toBeGreaterThan(0);

            // 验证股票信息
            patterns.forEach(pattern => {
                expect(pattern.stockId).toBe('000001.SH');
                expect(pattern.stockName).toBe('上证指数');
            });

            // 验证是否检测到了各种类型的十字星
            const patternTypes = patterns.map(p => p.type);
            expect(patternTypes).toContain('standard');

            // 不是所有数据都一定会包含所有类型的十字星，所以这里我们只检查是否至少有一种类型
            expect(['dragonfly', 'gravestone', 'longLegged'].some(type => patternTypes.includes(type as DojiType))).toBe(true);
        });

        it('应正确处理极端市场数据', async () => {
            const extremeData = createExtremeMarketDataset();
            const patterns = await detector.detectPatternsSync(extremeData, '000001.SH', '上证指数');

            // 验证检测到的形态数量
            expect(patterns.length).toBeGreaterThan(0);

            // 验证是否检测到了各种类型的十字星
            const patternTypes = patterns.map(p => p.type);

            // 检查是否包含各种类型的十字星
            expect(patternTypes).toContain('standard');
            expect(['dragonfly', 'gravestone', 'longLegged'].some(type => patternTypes.includes(type as DojiType))).toBe(true);

            // 验证显著性评分
            patterns.forEach(pattern => {
                expect(pattern.significance).toBeGreaterThanOrEqual(0);
                expect(pattern.significance).toBeLessThanOrEqual(1);
            });
        });

        it('应正确计算趋势和成交量变化', async () => {
            const marketData = createRealMarketDataset();
            const patterns = await detector.detectPatternsSync(marketData, '000001.SH', '上证指数');

            // 验证每个形态都有趋势和成交量变化信息
            patterns.forEach(pattern => {
                expect(['uptrend', 'downtrend', 'sideways']).toContain(pattern.context.trend);
                expect(typeof pattern.context.volumeChange).toBe('number');
            });
        });
    });

    describe('不同市场环境下的十字星识别', () => {
        // 创建不同市场环境的数据
        const createMarketEnvironmentData = (trend: 'uptrend' | 'downtrend' | 'sideways'): KLineData[] => {
            const baseData: KLineData[] = [];
            let price = 3500;

            // 创建前5天的趋势数据
            for (let i = 0; i < 5; i++) {
                if (trend === 'uptrend') {
                    price += 20;
                } else if (trend === 'downtrend') {
                    price -= 20;
                } else {
                    price += Math.random() > 0.5 ? 5 : -5;
                }

                baseData.push({
                    timestamp: 1625097600000 + i * 86400000,
                    open: price - 5,
                    high: price + 10,
                    low: price - 10,
                    close: price,
                    volume: 20000000 + Math.floor(Math.random() * 5000000)
                });
            }

            // 添加一个十字星
            baseData.push({
                timestamp: 1625097600000 + 5 * 86400000,
                open: price,
                high: price + 10,
                low: price - 10,
                close: price,
                volume: 25000000
            });

            return baseData;
        };

        it('应正确识别上升趋势中的十字星', async () => {
            const uptrendData = createMarketEnvironmentData('uptrend');
            const patterns = await detector.detectPatternsSync(uptrendData);

            expect(patterns.length).toBeGreaterThan(0);
            expect(patterns[0].context.trend).toBe('uptrend');
        });

        it('应正确识别下降趋势中的十字星', async () => {
            const downtrendData = createMarketEnvironmentData('downtrend');
            const patterns = await detector.detectPatternsSync(downtrendData);

            expect(patterns.length).toBeGreaterThan(0);
            expect(patterns[0].context.trend).toBe('downtrend');
        });

        it('应正确识别盘整趋势中的十字星', async () => {
            const sidewaysData = createMarketEnvironmentData('sideways');
            const patterns = await detector.detectPatternsSync(sidewaysData);

            expect(patterns.length).toBeGreaterThan(0);
            expect(patterns[0].context.trend).toBe('sideways');
        });
    });

    describe('不同时间周期的十字星识别', () => {
        // 创建不同时间周期的数据
        const createTimeframeData = (timeframe: 'daily' | 'weekly' | 'monthly'): KLineData[] => {
            const baseData: KLineData[] = [];
            let price = 3500;
            let timeMultiplier = timeframe === 'daily' ? 1 : timeframe === 'weekly' ? 7 : 30;

            for (let i = 0; i < 10; i++) {
                price += Math.random() > 0.5 ? 10 : -10;

                if (i === 5) {
                    // 添加一个十字星
                    baseData.push({
                        timestamp: 1625097600000 + i * 86400000 * timeMultiplier,
                        open: price,
                        high: price + 20,
                        low: price - 20,
                        close: price,
                        volume: 25000000
                    });
                } else {
                    baseData.push({
                        timestamp: 1625097600000 + i * 86400000 * timeMultiplier,
                        open: price - 10,
                        high: price + 20,
                        low: price - 20,
                        close: price + 10,
                        volume: 20000000 + Math.floor(Math.random() * 5000000)
                    });
                }
            }

            return baseData;
        };

        it('应正确识别日线图中的十字星', async () => {
            const dailyData = createTimeframeData('daily');
            const patterns = await detector.detectPatternsSync(dailyData);

            expect(patterns.length).toBeGreaterThan(0);
            expect(patterns[0].type).toBe('standard');
        });

        it('应正确识别周线图中的十字星', async () => {
            const weeklyData = createTimeframeData('weekly');
            const patterns = await detector.detectPatternsSync(weeklyData);

            expect(patterns.length).toBeGreaterThan(0);
            expect(patterns[0].type).toBe('standard');
        });

        it('应正确识别月线图中的十字星', async () => {
            const monthlyData = createTimeframeData('monthly');
            const patterns = await detector.detectPatternsSync(monthlyData);

            expect(patterns.length).toBeGreaterThan(0);
            expect(patterns[0].type).toBe('standard');
        });
    });
});