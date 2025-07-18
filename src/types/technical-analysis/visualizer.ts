import type { ECharts } from 'echarts';
import type { DojiPattern } from './doji';

/**
 * 十字星形态可视化器接口
 */
export interface IDojiPatternVisualizer {
    /**
     * 设置要显示的十字星形态
     * @param patterns 十字星形态数组
     */
    setPatterns(patterns: DojiPattern[]): void;

    /**
     * 显示十字星标记
     */
    showMarkers(): void;

    /**
     * 隐藏十字星标记
     */
    hideMarkers(): void;

    /**
     * 切换十字星标记显示状态
     */
    toggleMarkers(): boolean;

    /**
     * 高亮特定的十字星形态
     * @param patternId 形态ID
     */
    highlightPattern(patternId: string): void;

    /**
     * 更新图表
     */
    updateChart(): void;

    /**
     * 销毁可视化器
     */
    dispose(): void;
}