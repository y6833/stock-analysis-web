import type { DojiType } from '../../../../types/technical-analysis/doji';

/**
 * 十字星形态标记样式配置接口
 */
export interface DojiMarkerStyleConfig {
    /**
     * 标记颜色
     */
    color: string;

    /**
     * 标记符号
     */
    symbol: string;

    /**
     * 标记描述
     */
    description: string;

    /**
     * 标记位置偏移系数
     */
    positionOffset: number;

    /**
     * 标记大小基础值
     */
    baseSize: number;

    /**
     * 悬停动画效果
     */
    hoverAnimation?: string;

    /**
     * 点击动画效果
     */
    clickAnimation?: string;

    /**
     * 标记阴影颜色
     */
    shadowColor?: string;

    /**
     * 标记边框宽度
     */
    borderWidth?: number;

    /**
     * 标记边框颜色
     */
    borderColor?: string;

    /**
     * 标记透明度
     */
    opacity?: number;
}

/**
 * 十字星形态标记样式
 */
export class DojiPatternMarkerStyles {
    /**
     * 标记样式配置
     */
    private static readonly styleConfigs: Record<DojiType, DojiMarkerStyleConfig> = {
        'standard': {
            color: '#1890ff', // 蓝色
            // 更精细的菱形标记，带有十字星特征
            symbol: 'path://M15,0 L30,15 L15,30 L0,15 Z M13,15 L17,15 M15,13 L15,17',
            description: '标准十字星',
            positionOffset: 1.01, // 在K线上方
            baseSize: 20,
            hoverAnimation: 'pulse',
            clickAnimation: 'bounce',
            shadowColor: 'rgba(24, 144, 255, 0.35)',
            borderWidth: 1.5,
            borderColor: '#ffffff',
            opacity: 0.9
        },
        'dragonfly': {
            color: '#52c41a', // 绿色
            // 蜻蜓十字星标记，带有下影线特征
            symbol: 'path://M0,10 L15,-10 L30,10 L15,10 Z M15,10 L15,25',
            description: '蜻蜓十字星',
            positionOffset: 1.01, // 在K线上方
            baseSize: 22,
            hoverAnimation: 'float',
            clickAnimation: 'bounce',
            shadowColor: 'rgba(82, 196, 26, 0.35)',
            borderWidth: 1.5,
            borderColor: '#ffffff',
            opacity: 0.9
        },
        'gravestone': {
            color: '#f5222d', // 红色
            // 墓碑十字星标记，带有上影线特征
            symbol: 'path://M0,15 L15,15 L30,15 L15,35 Z M15,15 L15,0',
            description: '墓碑十字星',
            positionOffset: 0.99, // 在K线下方
            baseSize: 22,
            hoverAnimation: 'shake',
            clickAnimation: 'bounce',
            shadowColor: 'rgba(245, 34, 45, 0.35)',
            borderWidth: 1.5,
            borderColor: '#ffffff',
            opacity: 0.9
        },
        'longLegged': {
            color: '#722ed1', // 紫色
            // 长腿十字星标记，带有长上下影线特征
            symbol: 'path://M15,15 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0 M15,0 L15,30 M5,15 L25,15',
            description: '长腿十字星',
            positionOffset: 1.01, // 在K线上方
            baseSize: 24,
            hoverAnimation: 'rotate',
            clickAnimation: 'bounce',
            shadowColor: 'rgba(114, 46, 209, 0.35)',
            borderWidth: 1.5,
            borderColor: '#ffffff',
            opacity: 0.9
        }
    };

    /**
     * 获取标记颜色
     * @param type 十字星类型
     * @returns 标记颜色
     */
    static getMarkerColor(type: DojiType): string {
        return this.styleConfigs[type]?.color || '#1890ff';
    }

    /**
     * 获取标记符号
     * @param type 十字星类型
     * @returns 标记符号
     */
    static getMarkerSymbol(type: DojiType): string {
        return this.styleConfigs[type]?.symbol || 'diamond';
    }

    /**
     * 获取形态名称
     * @param type 十字星类型
     * @returns 形态名称
     */
    static getPatternName(type: DojiType): string {
        return this.styleConfigs[type]?.description || '十字星';
    }

    /**
     * 获取标记位置
     * @param type 十字星类型
     * @param high K线最高价
     * @param low K线最低价
     * @param timeframe 时间周期
     * @returns 标记位置（价格）
     */
    static getMarkerPosition(type: DojiType, high: number, low: number, timeframe?: string): number {
        const offset = this.styleConfigs[type]?.positionOffset || 1.01;

        // 根据时间周期调整位置偏移量
        let timeframeAdjustment = 1.0;
        if (timeframe) {
            switch (timeframe) {
                case '1m':
                case '5m':
                    timeframeAdjustment = 1.002; // 短周期偏移更小
                    break;
                case '15m':
                case '30m':
                    timeframeAdjustment = 1.005;
                    break;
                case '1h':
                case '4h':
                    timeframeAdjustment = 1.008;
                    break;
                case '1d':
                default:
                    timeframeAdjustment = 1.01; // 增加默认偏移量，使标记更明显
                    break;
            }
        }

        // 根据十字星类型确定标记位置
        if (offset > 1) {
            // 在K线上方
            return high * (offset * timeframeAdjustment);
        } else {
            // 在K线下方
            return low * (offset / timeframeAdjustment);
        }
    }

    /**
     * 获取标记大小
     * @param type 十字星类型
     * @param significance 形态显著性（0-1）
     * @param timeframe 时间周期
     * @returns 标记大小
     */
    static getMarkerSize(type: DojiType, significance: number, timeframe?: string): number {
        const baseSize = this.styleConfigs[type]?.baseSize || 20;

        // 根据显著性调整大小，使显著性更高的形态标记更大
        const sizeWithSignificance = baseSize + significance * 12;

        // 根据时间周期调整大小
        if (timeframe) {
            switch (timeframe) {
                case '1m':
                case '5m':
                    return sizeWithSignificance * 0.7; // 短周期标记更小
                case '15m':
                case '30m':
                    return sizeWithSignificance * 0.85;
                case '1h':
                case '4h':
                    return sizeWithSignificance * 0.95;
                case '1d':
                default:
                    return sizeWithSignificance; // 默认不调整
            }
        }

        return sizeWithSignificance;
    }

    /**
     * 获取标记样式
     * @param type 十字星类型
     * @param isHighlighted 是否高亮
     * @returns 标记样式对象
     */
    static getMarkerStyle(type: DojiType, isHighlighted: boolean = false): any {
        const config = this.styleConfigs[type];
        const markerColor = config?.color || '#1890ff';
        const shadowColor = config?.shadowColor || 'rgba(0,0,0,0.2)';
        const borderWidth = config?.borderWidth || 1.5;
        const borderColor = config?.borderColor || '#ffffff';
        const opacity = config?.opacity || 0.85;

        return {
            opacity: isHighlighted ? 1 : opacity,
            shadowBlur: isHighlighted ? 15 : 5,
            shadowColor: isHighlighted ? markerColor : shadowColor,
            borderWidth: isHighlighted ? borderWidth * 1.5 : borderWidth,
            borderColor: borderColor,
            // 使用渐变效果增强视觉效果
            color: {
                type: 'radial',
                x: 0.5,
                y: 0.5,
                r: 0.5,
                colorStops: [{
                    offset: 0,
                    color: this.getLighterColor(markerColor, isHighlighted ? 0.4 : 0.2)
                }, {
                    offset: 0.7,
                    color: isHighlighted ? markerColor : this.getLighterColor(markerColor, 0.1)
                }, {
                    offset: 1,
                    color: isHighlighted ? this.getDarkerColor(markerColor, 0.1) : markerColor
                }],
                global: false
            }
        };
    }

    /**
     * 获取悬停样式
     * @param type 十字星类型
     * @returns 悬停样式对象
     */
    static getHoverStyle(type: DojiType): any {
        const config = this.styleConfigs[type];
        const markerColor = config?.color || '#1890ff';
        const hoverAnimation = config?.hoverAnimation || 'pulse';

        // 根据不同的悬停动画类型设置不同的效果
        let scaleEffect = 1.3;
        let shadowBlur = 20;
        let animationEasing = 'elasticOut';

        switch (hoverAnimation) {
            case 'pulse':
                scaleEffect = 1.3;
                shadowBlur = 25;
                animationEasing = 'elasticOut';
                break;
            case 'float':
                scaleEffect = 1.25;
                shadowBlur = 18;
                animationEasing = 'cubicInOut';
                break;
            case 'shake':
                scaleEffect = 1.2;
                shadowBlur = 22;
                animationEasing = 'bounceOut';
                break;
            case 'rotate':
                scaleEffect = 1.35;
                shadowBlur = 20;
                animationEasing = 'quadraticInOut';
                break;
        }

        return {
            opacity: 1,
            shadowBlur: shadowBlur,
            shadowColor: markerColor,
            borderWidth: 2.5,
            borderColor: '#ffffff',
            scale: scaleEffect,
            // 增强悬停时的渐变效果
            color: {
                type: 'radial',
                x: 0.5,
                y: 0.5,
                r: 0.5,
                colorStops: [{
                    offset: 0,
                    color: this.getLighterColor(markerColor, 0.6) // 更亮的中心
                }, {
                    offset: 0.5,
                    color: this.getLighterColor(markerColor, 0.3)
                }, {
                    offset: 0.8,
                    color: this.getLighterColor(markerColor, 0.1)
                }, {
                    offset: 1,
                    color: markerColor
                }],
                global: false
            },
            // 添加动画配置
            animation: true,
            animationDuration: 300,
            animationEasing: animationEasing
        };
    }

    /**
     * 获取点击样式
     * @param type 十字星类型
     * @returns 点击样式对象
     */
    static getClickStyle(type: DojiType): any {
        const config = this.styleConfigs[type];
        const markerColor = config?.color || '#1890ff';
        const clickAnimation = config?.clickAnimation || 'bounce';

        // 根据不同的点击动画类型设置不同的效果
        let scaleEffect = 1.2;
        let shadowBlur = 25;
        let animationEasing = 'bounceOut';
        let borderWidth = 3;

        switch (clickAnimation) {
            case 'bounce':
                scaleEffect = 1.2;
                shadowBlur = 25;
                animationEasing = 'bounceOut';
                borderWidth = 3;
                break;
            case 'flash':
                scaleEffect = 1.15;
                shadowBlur = 30;
                animationEasing = 'cubicOut';
                borderWidth = 3.5;
                break;
            case 'expand':
                scaleEffect = 1.3;
                shadowBlur = 20;
                animationEasing = 'elasticOut';
                borderWidth = 2.5;
                break;
            case 'contract':
                scaleEffect = 0.9;
                shadowBlur = 15;
                animationEasing = 'backIn';
                borderWidth = 4;
                break;
        }

        return {
            opacity: 1,
            shadowBlur: shadowBlur,
            shadowColor: markerColor,
            borderWidth: borderWidth,
            borderColor: '#ffffff',
            scale: scaleEffect,
            // 点击时的特殊渐变效果
            color: {
                type: 'radial',
                x: 0.5,
                y: 0.5,
                r: 0.5,
                colorStops: [{
                    offset: 0,
                    color: this.getLighterColor(markerColor, 0.3)
                }, {
                    offset: 0.4,
                    color: this.getLighterColor(markerColor, 0.1)
                }, {
                    offset: 0.7,
                    color: this.getDarkerColor(markerColor, 0.1)
                }, {
                    offset: 1,
                    color: this.getDarkerColor(markerColor, 0.2)
                }],
                global: false
            },
            // 添加动画配置
            animation: true,
            animationDuration: 400,
            animationEasing: animationEasing
        };
    }

    /**
     * 创建标记点配置
     * @param type 十字星类型
     * @param timestamp 时间戳
     * @param high K线最高价
     * @param low K线最低价
     * @param significance 形态显著性
     * @param isHighlighted 是否高亮
     * @param tooltip 工具提示内容
     * @param timeframe 时间周期
     * @returns 标记点配置
     */
    static createMarkerConfig(
        type: DojiType,
        timestamp: number,
        high: number,
        low: number,
        significance: number,
        isHighlighted: boolean = false,
        tooltip: string = '',
        timeframe?: string
    ): any {
        const markerColor = this.getMarkerColor(type);
        const config = this.styleConfigs[type];
        const hoverAnimation = config?.hoverAnimation || 'pulse';
        const clickAnimation = config?.clickAnimation || 'bounce';

        // 获取时间周期调整
        const timeframeAdjust = this.getTimeframeAdjustment(timeframe || '1d');

        // 根据时间周期调整标记的不透明度
        const baseOpacity = config?.opacity || 0.85;
        const adjustedOpacity = Math.max(0.5, Math.min(1, baseOpacity + timeframeAdjust.opacityAdjust));

        // 创建标记配置
        return {
            name: this.getPatternName(type),
            value: [
                timestamp,
                this.getMarkerPosition(type, high, low, timeframe),
                significance
            ],
            itemStyle: {
                ...this.getMarkerStyle(type, isHighlighted),
                opacity: isHighlighted ? 1 : adjustedOpacity
            },
            emphasis: {
                itemStyle: this.getHoverStyle(type),
                scale: true,
                // 添加悬停时的特殊效果
                focus: 'self',
                label: {
                    show: true,
                    position: 'top',
                    formatter: this.getPatternName(type),
                    backgroundColor: markerColor,
                    padding: [3, 5],
                    borderRadius: 2,
                    color: '#fff',
                    fontSize: 10,
                    lineHeight: 12,
                    distance: 5
                }
            },
            select: {
                itemStyle: this.getClickStyle(type),
                // 添加选中时的特殊效果
                label: {
                    show: true,
                    position: 'top',
                    formatter: this.getPatternName(type),
                    backgroundColor: markerColor,
                    padding: [3, 5],
                    borderRadius: 2,
                    color: '#fff',
                    fontSize: 10,
                    lineHeight: 12,
                    distance: 8
                }
            },
            symbol: this.getMarkerSymbol(type),
            symbolSize: this.getMarkerSize(type, significance, timeframe),
            symbolKeepAspect: true,
            symbolOffset: [0, 0],
            tooltip: {
                formatter: tooltip || this.getPatternName(type),
                backgroundColor: 'rgba(50, 50, 50, 0.95)',
                borderColor: markerColor,
                borderWidth: 2,
                borderRadius: 4,
                padding: [8, 12],
                textStyle: {
                    color: '#fff',
                    fontSize: 12
                },
                extraCssText: 'box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);'
            },
            z: isHighlighted ? 12 : 10, // 高亮的标记层级更高
            silent: false,
            cursor: 'pointer',
            // 添加入场动画效果
            animation: true,
            animationDuration: 500,
            animationEasing: 'elasticOut',
            animationDelay: function (idx: number) {
                // 错开动画时间，创造波浪效果
                return idx * 100;
            },
            // 添加悬停动画配置
            hoverAnimation: true,
            // 添加特殊的动画效果配置
            rippleEffect: {
                brushType: 'stroke',
                scale: 2.5,
                period: 4
            },
            // 添加事件响应配置
            triggerEvent: true,
            // 添加自定义数据，用于事件处理
            data: {
                patternType: type,
                significance: significance,
                timestamp: timestamp
            }
        };
    }

    /**
     * 获取动画配置
     * @param type 十字星类型
     * @param animationType 动画类型 ('hover' | 'click')
     * @returns 动画配置
     */
    static getAnimationConfig(type: DojiType, animationType: 'hover' | 'click'): any {
        const config = this.styleConfigs[type];
        const animation = animationType === 'hover' ? config?.hoverAnimation : config?.clickAnimation;

        switch (animation) {
            case 'pulse':
                return {
                    animation: true,
                    animationDuration: 300,
                    animationEasing: 'elasticOut',
                    animationDelay: 0
                };
            case 'bounce':
                return {
                    animation: true,
                    animationDuration: 500,
                    animationEasing: 'bounceOut',
                    animationDelay: 0
                };
            case 'float':
                return {
                    animation: true,
                    animationDuration: 400,
                    animationEasing: 'cubicInOut',
                    animationDelay: 0
                };
            case 'shake':
                return {
                    animation: true,
                    animationDuration: 350,
                    animationEasing: 'linear',
                    animationDelay: 0
                };
            case 'rotate':
                return {
                    animation: true,
                    animationDuration: 450,
                    animationEasing: 'quadraticInOut',
                    animationDelay: 0
                };
            case 'flash':
                return {
                    animation: true,
                    animationDuration: 250,
                    animationEasing: 'cubicOut',
                    animationDelay: 0
                };
            case 'expand':
                return {
                    animation: true,
                    animationDuration: 400,
                    animationEasing: 'elasticOut',
                    animationDelay: 0
                };
            case 'contract':
                return {
                    animation: true,
                    animationDuration: 350,
                    animationEasing: 'backIn',
                    animationDelay: 0
                };
            default:
                return {
                    animation: true,
                    animationDuration: 200,
                    animationEasing: 'cubicOut',
                    animationDelay: 0
                };
        }
    }

    /**
     * 获取交互效果配置
     * @param type 十字星类型
     * @param interactionType 交互类型 ('hover' | 'click')
     * @returns 交互效果配置
     */
    static getInteractionEffect(type: DojiType, interactionType: 'hover' | 'click'): any {
        const config = this.styleConfigs[type];
        const markerColor = config?.color || '#1890ff';

        if (interactionType === 'hover') {
            return {
                // 悬停时的波纹效果
                rippleEffect: {
                    brushType: 'stroke',
                    scale: 2.5,
                    period: 4
                },
                // 悬停时的标签
                label: {
                    show: true,
                    position: 'top',
                    formatter: this.getPatternName(type),
                    backgroundColor: markerColor,
                    padding: [3, 5],
                    borderRadius: 2,
                    color: '#fff',
                    fontSize: 10,
                    lineHeight: 12,
                    distance: 5
                }
            };
        } else {
            return {
                // 点击时的波纹效果
                rippleEffect: {
                    brushType: 'fill',
                    scale: 3,
                    period: 3
                },
                // 点击时的标签
                label: {
                    show: true,
                    position: 'top',
                    formatter: this.getPatternName(type),
                    backgroundColor: markerColor,
                    padding: [3, 5],
                    borderRadius: 2,
                    color: '#fff',
                    fontSize: 10,
                    lineHeight: 12,
                    distance: 8
                }
            };
        }
    }

    /**
     * 获取更亮的颜色
     * @param color 原始颜色（十六进制）
     * @param amount 增亮程度（0-1）
     * @returns 更亮的颜色
     */
    private static getLighterColor(color: string, amount: number = 0.2): string {
        // 移除#前缀
        color = color.replace('#', '');

        // 解析RGB值
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);

        // 增亮
        const newR = Math.min(255, Math.round(r + (255 - r) * amount));
        const newG = Math.min(255, Math.round(g + (255 - g) * amount));
        const newB = Math.min(255, Math.round(b + (255 - b) * amount));

        // 转回十六进制
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }

    /**
     * 获取更暗的颜色
     * @param color 原始颜色（十六进制）
     * @param amount 变暗程度（0-1）
     * @returns 更暗的颜色
     */
    private static getDarkerColor(color: string, amount: number = 0.2): string {
        // 移除#前缀
        color = color.replace('#', '');

        // 解析RGB值
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);

        // 变暗
        const newR = Math.max(0, Math.round(r * (1 - amount)));
        const newG = Math.max(0, Math.round(g * (1 - amount)));
        const newB = Math.max(0, Math.round(b * (1 - amount)));

        // 转回十六进制
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }

    /**
     * 获取标记在不同时间周期下的配置调整
     * @param timeframe 时间周期
     * @returns 配置调整对象
     */
    static getTimeframeAdjustment(timeframe: string): {
        positionFactor: number;
        sizeFactor: number;
        opacityAdjust: number;
        symbolAdjust?: string;
        borderWidthFactor: number;
        shadowBlurFactor: number;
    } {
        switch (timeframe) {
            case '1m':
            case '5m':
                return {
                    positionFactor: 1.002,
                    sizeFactor: 0.7,
                    opacityAdjust: -0.1,
                    // 短时间周期使用更简单的标记
                    symbolAdjust: 'simplified',
                    borderWidthFactor: 0.8,
                    shadowBlurFactor: 0.7
                };
            case '15m':
            case '30m':
                return {
                    positionFactor: 1.005,
                    sizeFactor: 0.85,
                    opacityAdjust: -0.05,
                    symbolAdjust: 'simplified',
                    borderWidthFactor: 0.9,
                    shadowBlurFactor: 0.8
                };
            case '1h':
            case '4h':
                return {
                    positionFactor: 1.008,
                    sizeFactor: 0.95,
                    opacityAdjust: 0,
                    symbolAdjust: 'normal',
                    borderWidthFactor: 1.0,
                    shadowBlurFactor: 0.9
                };
            case '1d':
            default:
                return {
                    positionFactor: 1.01,
                    sizeFactor: 1,
                    opacityAdjust: 0,
                    symbolAdjust: 'detailed',
                    borderWidthFactor: 1.0,
                    shadowBlurFactor: 1.0
                };
        }
    }

    /**
     * 获取适合时间周期的标记符号
     * @param type 十字星类型
     * @param timeframe 时间周期
     * @returns 标记符号路径
     */
    static getTimeframeAdjustedSymbol(type: DojiType, timeframe?: string): string {
        const baseSymbol = this.getMarkerSymbol(type);
        const adjustment = this.getTimeframeAdjustment(timeframe || '1d');

        // 如果没有特殊调整，返回基础符号
        if (!adjustment.symbolAdjust || adjustment.symbolAdjust === 'normal') {
            return baseSymbol;
        }

        // 根据时间周期和十字星类型返回适合的符号
        if (adjustment.symbolAdjust === 'simplified') {
            // 简化版符号，适合短时间周期
            switch (type) {
                case 'standard':
                    return 'path://M15,0 L30,15 L15,30 L0,15 Z'; // 简化菱形
                case 'dragonfly':
                    return 'path://M0,10 L15,-10 L30,10 Z'; // 简化三角形
                case 'gravestone':
                    return 'path://M0,15 L30,15 L15,35 Z'; // 简化倒三角
                case 'longLegged':
                    return 'path://M15,15 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0'; // 简化圆形
                default:
                    return baseSymbol;
            }
        } else if (adjustment.symbolAdjust === 'detailed') {
            // 详细版符号，适合日线等长时间周期
            switch (type) {
                case 'standard':
                    // 更详细的标准十字星，带有清晰的十字线
                    return 'path://M15,0 L30,15 L15,30 L0,15 Z M12,15 L18,15 M15,12 L15,18';
                case 'dragonfly':
                    // 更详细的蜻蜓十字星，带有更明显的下影线
                    return 'path://M0,10 L15,-10 L30,10 L15,10 Z M15,10 L15,28';
                case 'gravestone':
                    // 更详细的墓碑十字星，带有更明显的上影线
                    return 'path://M0,15 L15,15 L30,15 L15,35 Z M15,15 L15,-3';
                case 'longLegged':
                    // 更详细的长腿十字星，带有更长的上下影线
                    return 'path://M15,15 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0 M15,-2 L15,32 M3,15 L27,15';
                default:
                    return baseSymbol;
            }
        }

        return baseSymbol;
    }

    /**
     * 应用时间周期特定的动画效果
     * @param type 十字星类型
     * @param timeframe 时间周期
     * @returns 动画配置对象
     */
    static getTimeframeAnimationEffect(type: DojiType, timeframe?: string): any {
        const adjustment = this.getTimeframeAdjustment(timeframe || '1d');

        // 基础动画配置
        const baseConfig = {
            animation: true,
            animationDuration: 500,
            animationEasing: 'elasticOut'
        };

        // 根据时间周期调整动画效果
        switch (timeframe) {
            case '1m':
            case '5m':
                // 短时间周期使用更快的动画
                return {
                    ...baseConfig,
                    animationDuration: 300,
                    animationEasing: 'cubicOut'
                };
            case '15m':
            case '30m':
                return {
                    ...baseConfig,
                    animationDuration: 400,
                    animationEasing: 'quadraticOut'
                };
            case '1h':
            case '4h':
                return {
                    ...baseConfig,
                    animationDuration: 450,
                    animationEasing: 'cubicInOut'
                };
            case '1d':
            default:
                // 日线使用更明显的动画效果
                return {
                    ...baseConfig,
                    animationDuration: 500,
                    animationEasing: 'elasticOut'
                };
        }
    }
}