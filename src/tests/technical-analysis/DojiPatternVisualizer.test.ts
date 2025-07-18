import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DojiPatternVisualizer } from '../../modules/technical-analysis/patterns/doji/DojiPatternVisualizer';
import { DojiPatternMarkerStyles } from '../../modules/technical-analysis/patterns/doji/DojiPatternMarkerStyles';
import type { DojiPattern } from '../../types/technical-analysis/doji';

describe('DojiPatternVisualizer', () => {
    // 模拟 ECharts 实例
    const mockChart = {
        getOption: vi.fn().mockReturnValue({
            series: [
                {
                    type: 'candlestick',
                    data: []
                }
            ]
        }),
        setOption: vi.fn(),
        on: vi.fn(),
        off: vi.fn()
    };

    // 创建测试用的十字星形态数据
    const createDojiPattern = (type: 'standard' | 'dragonfly' | 'gravestone' | 'longLegged'): DojiPattern => {
        return {
            id: `test-${type}`,
            stockId: 'TEST',
            stockName: '测试股票',
            timestamp: Date.now(),
            type,
            candle: {
                open: 100,
                high: 105,
                low: 95,
                close: 100,
                volume: 10000
            },
            significance: 0.8,
            context: {
                trend: 'sideways',
                nearSupportResistance: false,
                volumeChange: 0.2
            }
        };
    };

    let visualizer: DojiPatternVisualizer;

    beforeEach(() => {
        // 重置模拟函数
        vi.clearAllMocks();
        // 创建可视化器实例
        visualizer = new DojiPatternVisualizer(mockChart as any, '1d');
    });

    it('should set patterns correctly', () => {
        const patterns = [
            createDojiPattern('standard'),
            createDojiPattern('dragonfly')
        ];

        visualizer.setPatterns(patterns);
        expect(mockChart.setOption).toHaveBeenCalled();
    });

    it('should handle empty patterns array', () => {
        visualizer.setPatterns([]);
        expect(mockChart.setOption).not.toHaveBeenCalled();
    });

    it('should show and hide markers', () => {
        const patterns = [createDojiPattern('standard')];
        visualizer.setPatterns(patterns);

        // 清除之前的调用记录
        mockChart.setOption.mockClear();

        // 测试隐藏标记
        visualizer.hideMarkers();
        expect(mockChart.setOption).toHaveBeenCalled();

        // 清除之前的调用记录
        mockChart.setOption.mockClear();

        // 测试显示标记
        visualizer.showMarkers();
        expect(mockChart.setOption).toHaveBeenCalled();
    });

    it('should toggle markers visibility', () => {
        const patterns = [createDojiPattern('standard')];
        visualizer.setPatterns(patterns);

        // 清除之前的调用记录
        mockChart.setOption.mockClear();

        // 测试切换标记显示状态
        const initialState = visualizer.toggleMarkers();
        expect(initialState).toBe(false);
        expect(mockChart.setOption).toHaveBeenCalled();

        // 清除之前的调用记录
        mockChart.setOption.mockClear();

        // 再次切换
        const newState = visualizer.toggleMarkers();
        expect(newState).toBe(true);
        expect(mockChart.setOption).toHaveBeenCalled();
    });

    it('should highlight a specific pattern', () => {
        const patterns = [
            createDojiPattern('standard'),
            createDojiPattern('dragonfly')
        ];
        visualizer.setPatterns(patterns);

        // 清除之前的调用记录
        mockChart.setOption.mockClear();

        // 测试高亮特定形态
        visualizer.highlightPattern('test-standard');
        expect(mockChart.setOption).toHaveBeenCalled();
    });

    it('should set timeframe correctly', () => {
        const patterns = [createDojiPattern('standard')];
        visualizer.setPatterns(patterns);

        // 清除之前的调用记录
        mockChart.setOption.mockClear();

        // 测试设置时间周期
        visualizer.setTimeframe('5m');
        expect(mockChart.setOption).toHaveBeenCalled();
    });

    it('should dispose correctly', () => {
        const patterns = [createDojiPattern('standard')];
        visualizer.setPatterns(patterns);

        // 清除之前的调用记录
        mockChart.setOption.mockClear();

        // 测试销毁可视化器
        visualizer.dispose();
        expect(mockChart.setOption).toHaveBeenCalled();
        expect(mockChart.off).toHaveBeenCalled();
    });

    it('should setup chart events', () => {
        // 验证事件监听器已设置
        expect(mockChart.on).toHaveBeenCalledTimes(3);
        expect(mockChart.on).toHaveBeenCalledWith('click', expect.any(Function));
        expect(mockChart.on).toHaveBeenCalledWith('mouseover', expect.any(Function));
        expect(mockChart.on).toHaveBeenCalledWith('mouseout', expect.any(Function));
    });
});

describe('DojiPatternMarkerStyles', () => {
    it('should return correct marker color for each pattern type', () => {
        expect(DojiPatternMarkerStyles.getMarkerColor('standard')).toBe('#1890ff');
        expect(DojiPatternMarkerStyles.getMarkerColor('dragonfly')).toBe('#52c41a');
        expect(DojiPatternMarkerStyles.getMarkerColor('gravestone')).toBe('#f5222d');
        expect(DojiPatternMarkerStyles.getMarkerColor('longLegged')).toBe('#722ed1');
    });

    it('should return correct marker symbol for each pattern type', () => {
        expect(DojiPatternMarkerStyles.getMarkerSymbol('standard')).toContain('path://');
        expect(DojiPatternMarkerStyles.getMarkerSymbol('dragonfly')).toContain('path://');
        expect(DojiPatternMarkerStyles.getMarkerSymbol('gravestone')).toContain('path://');
        expect(DojiPatternMarkerStyles.getMarkerSymbol('longLegged')).toContain('path://');
    });

    it('should return correct pattern name for each pattern type', () => {
        expect(DojiPatternMarkerStyles.getPatternName('standard')).toBe('标准十字星');
        expect(DojiPatternMarkerStyles.getPatternName('dragonfly')).toBe('蜻蜓十字星');
        expect(DojiPatternMarkerStyles.getPatternName('gravestone')).toBe('墓碑十字星');
        expect(DojiPatternMarkerStyles.getPatternName('longLegged')).toBe('长腿十字星');
    });

    it('should adjust marker position based on pattern type and timeframe', () => {
        const high = 100;
        const low = 90;

        // 测试不同类型的位置
        expect(DojiPatternMarkerStyles.getMarkerPosition('standard', high, low)).toBeGreaterThan(high);
        expect(DojiPatternMarkerStyles.getMarkerPosition('gravestone', high, low)).toBeLessThan(low);

        // 测试时间周期调整
        expect(DojiPatternMarkerStyles.getMarkerPosition('standard', high, low, '1m'))
            .toBeGreaterThan(DojiPatternMarkerStyles.getMarkerPosition('standard', high, low, '1d'));
    });

    it('should adjust marker size based on significance and timeframe', () => {
        const significance = 0.8;

        // 测试显著性调整
        expect(DojiPatternMarkerStyles.getMarkerSize('standard', 0.8)).toBeGreaterThan(
            DojiPatternMarkerStyles.getMarkerSize('standard', 0.5)
        );

        // 测试时间周期调整
        expect(DojiPatternMarkerStyles.getMarkerSize('standard', significance, '1d')).toBeGreaterThan(
            DojiPatternMarkerStyles.getMarkerSize('standard', significance, '1m')
        );
    });

    it('should create complete marker configuration', () => {
        const config = DojiPatternMarkerStyles.createMarkerConfig(
            'standard',
            1625097600000,
            100,
            90,
            0.8,
            true,
            'Test tooltip',
            '1d'
        );

        expect(config).toHaveProperty('name', '标准十字星');
        expect(config).toHaveProperty('value');
        expect(config).toHaveProperty('itemStyle');
        expect(config).toHaveProperty('emphasis');
        expect(config).toHaveProperty('select');
        expect(config).toHaveProperty('symbol');
        expect(config).toHaveProperty('symbolSize');
        expect(config).toHaveProperty('tooltip');
    });
});