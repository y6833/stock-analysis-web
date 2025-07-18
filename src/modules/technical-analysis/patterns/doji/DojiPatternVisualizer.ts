import type { ECharts } from 'echarts';
import * as echarts from 'echarts';
import type { DojiPattern, DojiType } from '../../../../types/technical-analysis/doji';
import type { IDojiPatternVisualizer } from '../../../../types/technical-analysis/visualizer';
import { formatDate } from '../../../../utils/dateUtils';
import { DojiPatternMarkerStyles } from './DojiPatternMarkerStyles';

/**
 * 十字星形态可视化器
 * 用于在图表上标记识别出的十字星形态
 */
export class DojiPatternVisualizer implements IDojiPatternVisualizer {
    /**
     * ECharts 实例
     */
    private chart: ECharts;

    /**
     * 十字星形态数组
     */
    private patterns: DojiPattern[] = [];

    /**
     * 标记是否可见
     */
    private markersVisible: boolean = true;

    /**
     * 当前高亮的形态ID
     */
    private highlightedPatternId: string | null = null;

    /**
     * 标记系列的ID
     */
    private readonly MARKER_SERIES_ID = 'doji-pattern-markers';

    /**
     * 当前时间周期
     */
    private timeframe: string = '1d';

    /**
     * 构造函数
     * @param chart ECharts 实例
     * @param timeframe 时间周期
     */
    constructor(chart: ECharts, timeframe: string = '1d') {
        this.chart = chart;
        this.timeframe = timeframe;

        // 添加图表点击事件监听
        this.setupChartEvents();
    }

    /**
     * 设置要显示的十字星形态
     * @param patterns 十字星形态数组
     */
    public setPatterns(patterns: DojiPattern[]): void {
        this.patterns = patterns || [];
        if (this.markersVisible) {
            this.renderMarkers();
        }
    }

    /**
     * 显示十字星标记
     */
    public showMarkers(): void {
        this.markersVisible = true;
        this.renderMarkers();
    }

    /**
     * 隐藏十字星标记
     */
    public hideMarkers(): void {
        this.markersVisible = false;
        this.removeMarkers();
    }

    /**
     * 切换十字星标记显示状态
     * @returns 当前显示状态
     */
    public toggleMarkers(): boolean {
        if (this.markersVisible) {
            this.hideMarkers();
        } else {
            this.showMarkers();
        }
        return this.markersVisible;
    }

    /**
     * 高亮特定的十字星形态
     * @param patternId 形态ID
     */
    public highlightPattern(patternId: string): void {
        this.highlightedPatternId = patternId;
        this.renderMarkers();
    }

    /**
     * 更新图表
     */
    public updateChart(): void {
        if (this.markersVisible) {
            this.renderMarkers();
        }
    }

    /**
     * 设置时间周期
     * @param timeframe 时间周期
     */
    public setTimeframe(timeframe: string): void {
        this.timeframe = timeframe;
        if (this.markersVisible) {
            this.renderMarkers();
        }
    }

    /**
     * 销毁可视化器
     */
    public dispose(): void {
        this.removeMarkers();
        this.patterns = [];

        // 移除事件监听
        if (this.chart) {
            this.chart.off('click');
            this.chart.off('mouseover');
            this.chart.off('mouseout');
        }
    }

    /**
     * 设置图表事件监听
     * @private
     */
    private setupChartEvents(): void {
        if (!this.chart) return;

        // 点击事件
        this.chart.on('click', (params) => {
            if (params.componentType === 'series' && params.seriesId === this.MARKER_SERIES_ID) {
                // 触发点击效果
                const patternId = this.findPatternIdByTimestamp(params.value[0]);
                if (patternId) {
                    // 高亮选中的形态
                    this.highlightPattern(patternId);

                    // 获取形态对象
                    const pattern = this.patterns.find(p => p.id === patternId);

                    // 应用点击动画效果
                    if (pattern) {
                        // 创建点击波纹效果
                        this.createClickRippleEffect(pattern);

                        // 触发自定义事件
                        const event = new CustomEvent('doji-pattern-click', {
                            detail: {
                                patternId,
                                pattern
                            }
                        });
                        document.dispatchEvent(event);
                    }
                }
            }
        });

        // 鼠标悬停事件
        this.chart.on('mouseover', (params) => {
            if (params.componentType === 'series' && params.seriesId === this.MARKER_SERIES_ID) {
                // 设置鼠标样式
                this.chart.setOption({
                    tooltip: {
                        show: true
                    }
                });

                // 触发悬停效果
                const patternId = this.findPatternIdByTimestamp(params.value[0]);
                if (patternId) {
                    const pattern = this.patterns.find(p => p.id === patternId);

                    if (pattern) {
                        // 应用悬停动画效果
                        this.applyHoverEffect(pattern);

                        // 触发自定义事件
                        const event = new CustomEvent('doji-pattern-hover', {
                            detail: {
                                patternId,
                                pattern
                            }
                        });
                        document.dispatchEvent(event);
                    }
                }
            }
        });

        // 鼠标移出事件
        this.chart.on('mouseout', (params) => {
            if (params.componentType === 'series' && params.seriesId === this.MARKER_SERIES_ID) {
                // 恢复默认样式
                this.chart.setOption({
                    tooltip: {
                        show: false
                    }
                });

                // 移除悬停效果
                const patternId = this.findPatternIdByTimestamp(params.value[0]);
                if (patternId) {
                    const pattern = this.patterns.find(p => p.id === patternId);

                    if (pattern && this.highlightedPatternId !== patternId) {
                        // 如果不是当前高亮的形态，恢复默认样式
                        this.removeHoverEffect(pattern);
                    }
                }
            }
        });
    }

    /**
     * 应用悬停效果
     * @private
     * @param pattern 十字星形态
     */
    private applyHoverEffect(pattern: DojiPattern): void {
        // 获取悬停动画配置
        const hoverAnimation = DojiPatternMarkerStyles.getAnimationConfig(pattern.type, 'hover');

        // 更新图表选项，应用悬停效果
        const option = this.chart.getOption();
        if (option.series && Array.isArray(option.series)) {
            const markerSeries = option.series.find(s => s.id === this.MARKER_SERIES_ID);
            if (markerSeries && markerSeries.data && Array.isArray(markerSeries.data)) {
                // 找到对应的数据点
                const dataIndex = markerSeries.data.findIndex(
                    (item: any) => item.value && item.value[0] === pattern.timestamp
                );

                if (dataIndex !== -1) {
                    // 应用悬停样式
                    this.chart.dispatchAction({
                        type: 'highlight',
                        seriesIndex: option.series.indexOf(markerSeries),
                        dataIndex
                    });
                }
            }
        }
    }

    /**
     * 移除悬停效果
     * @private
     * @param pattern 十字星形态
     */
    private removeHoverEffect(pattern: DojiPattern): void {
        // 更新图表选项，移除悬停效果
        const option = this.chart.getOption();
        if (option.series && Array.isArray(option.series)) {
            const markerSeries = option.series.find(s => s.id === this.MARKER_SERIES_ID);
            if (markerSeries && markerSeries.data && Array.isArray(markerSeries.data)) {
                // 找到对应的数据点
                const dataIndex = markerSeries.data.findIndex(
                    (item: any) => item.value && item.value[0] === pattern.timestamp
                );

                if (dataIndex !== -1) {
                    // 移除悬停样式
                    this.chart.dispatchAction({
                        type: 'downplay',
                        seriesIndex: option.series.indexOf(markerSeries),
                        dataIndex
                    });
                }
            }
        }
    }

    /**
     * 创建点击波纹效果
     * @private
     * @param pattern 十字星形态
     */
    private createClickRippleEffect(pattern: DojiPattern): void {
        // 获取点击动画配置
        const clickAnimation = DojiPatternMarkerStyles.getAnimationConfig(pattern.type, 'click');

        // 获取标记位置
        const position = DojiPatternMarkerStyles.getMarkerPosition(
            pattern.type,
            pattern.candle.high,
            pattern.candle.low,
            this.timeframe
        );

        // 创建临时的波纹效果系列
        const rippleSeriesId = `${this.MARKER_SERIES_ID}-ripple-${Date.now()}`;
        const rippleSeries = {
            id: rippleSeriesId,
            type: 'effectScatter',
            coordinateSystem: 'cartesian2d',
            zlevel: 6,
            z: 11,
            data: [{
                value: [pattern.timestamp, position],
                itemStyle: {
                    color: DojiPatternMarkerStyles.getMarkerColor(pattern.type),
                    opacity: 0.6
                }
            }],
            symbolSize: DojiPatternMarkerStyles.getMarkerSize(pattern.type, pattern.significance, this.timeframe) * 1.5,
            rippleEffect: {
                brushType: 'stroke',
                scale: 3,
                period: 3
            },
            hoverAnimation: false,
            silent: true
        };

        // 添加到图表
        const option = this.chart.getOption();
        if (option.series && Array.isArray(option.series)) {
            option.series.push(rippleSeries);
            this.chart.setOption(option);

            // 3秒后移除波纹效果
            setTimeout(() => {
                this.removeRippleEffect(rippleSeriesId);
            }, 3000);
        }
    }

    /**
     * 移除波纹效果
     * @private
     * @param rippleSeriesId 波纹系列ID
     */
    private removeRippleEffect(rippleSeriesId: string): void {
        if (!this.chart) return;

        const option = this.chart.getOption();
        if (option.series && Array.isArray(option.series)) {
            // 过滤掉波纹系列
            const newSeries = option.series.filter(series => {
                return series && series.id !== rippleSeriesId;
            });

            if (newSeries.length !== option.series.length) {
                option.series = newSeries;
                this.chart.setOption(option);
            }
        }
    }

    /**
     * 根据时间戳查找形态ID
     * @private
     * @param timestamp 时间戳
     * @returns 形态ID
     */
    private findPatternIdByTimestamp(timestamp: number): string | null {
        const pattern = this.patterns.find(p => p.timestamp === timestamp);
        return pattern ? pattern.id : null;
    }

    /**
     * 渲染十字星标记
     * @private
     */
    private renderMarkers(): void {
        if (!this.chart || !this.patterns || this.patterns.length === 0) {
            return;
        }

        // 移除现有标记
        this.removeMarkers();

        // 获取当前图表配置
        const option = this.chart.getOption();

        // 创建标记点数据
        const markPoints = this.createMarkPointData();

        // 找到K线图系列
        let klineSeriesIndex = -1;
        if (option.series && Array.isArray(option.series)) {
            for (let i = 0; i < option.series.length; i++) {
                const series = option.series[i];
                if (series && (series.type === 'candlestick' || series.type === 'custom')) {
                    klineSeriesIndex = i;
                    break;
                }
            }
        }

        // 如果找到K线图系列，添加标记
        if (klineSeriesIndex !== -1) {
            // 创建新的标记系列
            const markerSeries = {
                id: this.MARKER_SERIES_ID,
                name: '十字星形态',
                type: 'scatter',
                zlevel: 5,
                z: 10,
                data: markPoints,
                selectedMode: 'single',
                emphasis: {
                    focus: 'series',
                    blurScope: 'coordinateSystem'
                },
                tooltip: {
                    trigger: 'item',
                    enterable: true,
                    confine: true,
                    position: function (point: any, params: any, dom: any, rect: any, size: any) {
                        // 智能定位提示框
                        return ['50%', '50%'];
                    }
                },
                // 添加全局动画效果
                animation: true,
                animationDuration: 300,
                animationEasing: 'cubicOut',
                animationDelay: function (idx: number) {
                    // 错开动画时间，创造波浪效果
                    return idx * 50;
                }
            };

            // 添加到图表
            option.series.push(markerSeries);
            this.chart.setOption(option);
        }
    }

    /**
     * 创建标记点数据
     * @private
     * @returns 标记点数据
     */
    private createMarkPointData(): any[] {
        return this.patterns.map(pattern => {
            const isHighlighted = this.highlightedPatternId === pattern.id;
            const tooltip = this.createTooltip(pattern);

            // 使用时间周期优化的符号
            const optimizedSymbol = DojiPatternMarkerStyles.getTimeframeAdjustedSymbol(pattern.type, this.timeframe);

            // 创建基础标记配置
            const markerConfig = DojiPatternMarkerStyles.createMarkerConfig(
                pattern.type,
                pattern.timestamp,
                pattern.candle.high,
                pattern.candle.low,
                pattern.significance,
                isHighlighted,
                tooltip,
                this.timeframe
            );

            // 应用时间周期特定的动画效果
            const animationEffect = DojiPatternMarkerStyles.getTimeframeAnimationEffect(pattern.type, this.timeframe);

            // 合并配置
            return {
                ...markerConfig,
                symbol: optimizedSymbol,
                ...animationEffect
            };
        });
    }

    /**
     * 创建工具提示
     * @private
     * @param pattern 十字星形态
     * @returns 工具提示HTML
     */
    private createTooltip(pattern: DojiPattern): string {
        const date = formatDate(new Date(pattern.timestamp), 'yyyy-MM-dd');
        const patternName = DojiPatternMarkerStyles.getPatternName(pattern.type);
        const significance = Math.round(pattern.significance * 100);
        const markerColor = DojiPatternMarkerStyles.getMarkerColor(pattern.type);

        // 获取趋势文本和颜色
        let trendText = '';
        let trendColor = '';
        switch (pattern.context.trend) {
            case 'uptrend':
                trendText = '上升趋势';
                trendColor = '#52c41a'; // 绿色
                break;
            case 'downtrend':
                trendText = '下降趋势';
                trendColor = '#f5222d'; // 红色
                break;
            case 'sideways':
                trendText = '盘整趋势';
                trendColor = '#faad14'; // 黄色
                break;
        }

        const volumeChange = Math.round(pattern.context.volumeChange * 100);
        const volumeChangeText = volumeChange > 0 ? `+${volumeChange}%` : `${volumeChange}%`;
        const volumeColor = volumeChange > 0 ? '#52c41a' : '#f5222d';

        // 获取形态简短描述
        const patternDescription = this.getPatternShortDescription(pattern.type);

        // 增强的工具提示样式，使用更现代的设计
        return `
            <div style="padding: 12px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: linear-gradient(to bottom, rgba(255,255,255,0.98), rgba(250,250,250,0.98)); border-top: 3px solid ${markerColor}; max-width: 280px;">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${markerColor}; margin-right: 8px;"></div>
                    <div style="font-weight: bold; font-size: 15px; color: #303133;">
                        ${patternName}
                    </div>
                </div>
                
                <div style="font-size: 12px; color: #606266; margin-bottom: 10px; line-height: 1.5;">
                    ${patternDescription}
                </div>
                
                <div style="background-color: rgba(0,0,0,0.03); border-radius: 4px; padding: 8px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <div style="font-weight: 500; color: #606266;">日期</div>
                        <div style="color: #303133;">${date}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                        <div style="display: flex; justify-content: space-between;">
                            <div style="font-weight: 500; color: #606266;">开盘</div>
                            <div style="color: #303133;">${pattern.candle.open.toFixed(2)}</div>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <div style="font-weight: 500; color: #606266;">收盘</div>
                            <div style="color: #303133;">${pattern.candle.close.toFixed(2)}</div>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <div style="font-weight: 500; color: #606266;">最高</div>
                            <div style="color: #303133;">${pattern.candle.high.toFixed(2)}</div>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <div style="font-weight: 500; color: #606266;">最低</div>
                            <div style="color: #303133;">${pattern.candle.low.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <div style="font-weight: 500; color: #606266; font-size: 12px;">显著性</div>
                        <div style="color: ${markerColor}; font-weight: bold; font-size: 12px;">${significance}%</div>
                    </div>
                    <div style="height: 6px; border-radius: 3px; background-color: #f0f0f0; overflow: hidden;">
                        <div style="height: 100%; width: ${significance}%; background-color: ${markerColor}; border-radius: 3px;"></div>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center;">
                        <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${trendColor}; margin-right: 6px;"></div>
                        <div style="font-size: 12px; color: ${trendColor};">${trendText}</div>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <div style="font-size: 12px; color: ${volumeColor}; font-weight: 500;">成交量: ${volumeChangeText}</div>
                    </div>
                </div>
                
                <div style="margin-top: 10px; text-align: center; background-color: ${markerColor}; 
                            color: white; padding: 6px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.3s ease;">
                    点击查看详情
                </div>
            </div>
        `;
    }

    /**
     * 获取形态简短描述
     * @private
     * @param type 十字星类型
     * @returns 简短描述
     */
    private getPatternShortDescription(type: DojiType): string {
        switch (type) {
            case 'standard':
                return '开盘价和收盘价几乎相等，表明市场处于犹豫不决状态，买卖双方力量均衡。';
            case 'dragonfly':
                return '开盘价和收盘价接近最高价，有较长下影线，表明市场在低位受到支撑。';
            case 'gravestone':
                return '开盘价和收盘价接近最低价，有较长上影线，表明市场在高位遇到阻力。';
            case 'longLegged':
                return '开盘价和收盘价接近，但上下影线都很长，表明市场波动剧烈。';
            default:
                return '十字星是一种重要的K线形态，通常被视为市场犹豫或潜在反转的信号。';
        }
    }
    /**
     * 移除标记
     * @private
     */
    private removeMarkers(): void {
        if (!this.chart) {
            return;
        }

        const option = this.chart.getOption();
        if (!option.series || !Array.isArray(option.series)) {
            return;
        }

        // 过滤掉标记系列
        const newSeries = option.series.filter(series => {
            return series && series.id !== this.MARKER_SERIES_ID;
        });

        if (newSeries.length !== option.series.length) {
            option.series = newSeries;
            this.chart.setOption(option);
        }
    }
}