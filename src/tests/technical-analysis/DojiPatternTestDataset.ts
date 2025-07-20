import { KLineData } from '../../types/technical-analysis/kline';

/**
 * 十字星形态测试数据集
 * 包含各种类型的十字星形态和边界情况
 */
export const DojiPatternTestDataset = {
    /**
     * 创建标准K线数据
     */
    createKLine(
        open: number,
        high: number,
        low: number,
        close: number,
        timestamp: number = Date.now(),
        volume: number = 10000
    ): KLineData {
        return {
            open,
            high,
            low,
            close,
            timestamp,
            volume,
        };
    },

    /**
     * 标准十字星测试数据
     */
    standardDoji: [
        // 完美标准十字星：开盘价=收盘价，上下影线平衡
        {
            open: 100,
            high: 105,
            low: 95,
            close: 100,
            timestamp: 1625097600000,
            volume: 10000,
            expected: true,
            description: '完美标准十字星'
        },
        // 接近标准十字星：开盘价和收盘价非常接近
        {
            open: 100,
            high: 105,
            low: 95,
            close: 100.09,
            timestamp: 1625097600000,
            volume: 10000,
            expected: true,
            description: '接近标准十字星'
        },
        // 非十字星：开盘价和收盘价差异较大
        {
            open: 100,
            high: 105,
            low: 95,
            close: 103,
            timestamp: 1625097600000,
            volume: 10000,
            expected: false,
            description: '非十字星-实体较大'
        },
        // 边界情况：开盘价和收盘价差异刚好在阈值边界
        {
            open: 100,
            high: 105,
            low: 95,
            close: 100.1,
            timestamp: 1625097600000,
            volume: 10000,
            expected: false,
            description: '边界情况-开盘收盘价差异'
        },
        // 极端情况：没有影线的十字星
        {
            open: 100,
            high: 100,
            low: 100,
            close: 100,
            timestamp: 1625097600000,
            volume: 10000,
            expected: true,
            description: '极端情况-无影线十字星'
        }
    ],

    /**
     * 蜻蜓十字星测试数据
     */
    dragonflyDoji: [
        // 完美蜻蜓十字星：开盘价=收盘价=最高价，有长下影线
        {
            open: 100,
            high: 100,
            low: 90,
            close: 100,
            timestamp: 1625097600000,
            volume: 10000,
            expected: true,
            description: '完美蜻蜓十字星'
        },
        // 接近蜻蜓十字星：开盘价和收盘价接近最高价
        {
            open: 100,
            high: 101,
            low: 90,
            close: 100,
            timestamp: 1625097600000,
            volume: 10000,
            expected: true,
            description: '接近蜻蜓十字星'
        },
        // 非蜻蜓十字星：有明显上影线
        {
            open: 100,
            high: 105,
            low: 90,
            close: 100,
            timestamp: 1625097600000,
            volume: 10000,
            expected: false,
            description: '非蜻蜓十字星-有上影线'
        },
        // 边界情况：上影线刚好在阈值边界
        {
            open: 100,
            high: 102,
            low: 90,
            close: 100,
            timestamp: 1625097600000,
            volume: 10000,
            expected: false,
            description: '边界情况-上影线长度'
        }
    ],

    /**
     * 墓碑十字星测试数据
     */
    gravestoneDoji: [
        // 完美墓碑十字星：开盘价=收盘价=最低价，有长上影线
        {
            open: 100,
            high: 110,
            low: 100,
            close: 100,
            timestamp: 1625097600000,
            volume: 10000,
            expected: true,
            description: '完美墓碑十字星'
        },
        // 接近墓碑十字星：开盘价和收盘价接近最低价
        {
            open: 100,
            high: 110,
            low: 99,
            close: 100,
            timestamp: 1625097600000,
            volume: 10000,
            expected: true,
            description: '接近墓碑十字星'
        },
        // 非墓碑十字星：有明显下影线
        {
            open: 100,
            high: 110,
            low: 95,
            close: 100,
            timestamp: 1625097600000,
            volume: 10000,
            expected: false,
            description: '非墓碑十字星-有下影线'
        },
        // 边界情况：下影线刚好在阈值边界
        {
            open: 100,
            high: 110,
            low: 98,
            close: 100,
            timestamp: 1625097600000,
            volume: 10000,
            expected: false,
            description: '边界情况-下影线长度'
        }
    ],

    /**
     * 长腿十字星测试数据
     */
    longLeggedDoji: [
        // 完美长腿十字星：开盘价=收盘价，上下影线都很长
        {
            open: 100,
            high: 110,
            low: 90,
            close: 100,
            timestamp: 1625097600000,
            volume: 10000,
            expected: true,
            description: '完美长腿十字星'
        },
        // 接近长腿十字星：开盘价和收盘价接近，上下影线长
        {
            open: 100,
            high: 110,
            low: 90,
            close: 100.09,
            timestamp: 1625097600000,
            volume: 10000,
            expected: true,
            description: '接近长腿十字星'
        },
        // 非长腿十字星：影线不够长
        {
            open: 100,
            high: 103,
            low: 97,
            close: 100,
            timestamp: 1625097600000,
            volume: 10000,
            expected: false,
            description: '非长腿十字星-影线太短'
        },
        // 边界情况：影线长度刚好在阈值边界
        {
            open: 100,
            high: 105,
            low: 95,
            close: 100,
            timestamp: 1625097600000,
            volume: 10000,
            expected: false,
            description: '边界情况-影线长度'
        }
    ],

    /**
     * 异常情况测试数据
     */
    edgeCases: [
        // 价格为0
        {
            open: 0,
            high: 0,
            low: 0,
            close: 0,
            timestamp: 1625097600000,
            volume: 10000,
            description: '价格为0'
        },
        // 负价格（理论上不应该出现，但测试健壮性）
        {
            open: -10,
            high: -5,
            low: -15,
            close: -10,
            timestamp: 1625097600000,
            volume: 10000,
            description: '负价格'
        },
        // 最高价小于最低价（数据错误）
        {
            open: 100,
            high: 90,
            low: 100,
            close: 100,
            timestamp: 1625097600000,
            volume: 10000,
            description: '最高价小于最低价'
        },
        // 开盘价高于最高价（数据错误）
        {
            open: 110,
            high: 105,
            low: 95,
            close: 100,
            timestamp: 1625097600000,
            volume: 10000,
            description: '开盘价高于最高价'
        },
        // 收盘价低于最低价（数据错误）
        {
            open: 100,
            high: 105,
            low: 95,
            close: 90,
            timestamp: 1625097600000,
            volume: 10000,
            description: '收盘价低于最低价'
        }
    ],

    /**
     * 市场环境测试数据
     */
    marketContexts: [
        // 上升趋势中的十字星
        {
            pattern: {
                open: 100,
                high: 105,
                low: 95,
                close: 100,
                timestamp: 1625097600000,
                volume: 10000
            },
            previousCandles: [
                { open: 90, high: 95, low: 88, close: 94, timestamp: 1625011200000, volume: 9000 },
                { open: 94, high: 98, low: 92, close: 97, timestamp: 1625097600000 - 86400000, volume: 9500 }
            ],
            expectedTrend: 'uptrend',
            description: '上升趋势中的十字星'
        },
        // 下降趋势中的十字星
        {
            pattern: {
                open: 100,
                high: 105,
                low: 95,
                close: 100,
                timestamp: 1625097600000,
                volume: 10000
            },
            previousCandles: [
                { open: 110, high: 112, low: 108, close: 109, timestamp: 1625011200000, volume: 9000 },
                { open: 109, high: 110, low: 102, close: 103, timestamp: 1625097600000 - 86400000, volume: 9500 }
            ],
            expectedTrend: 'downtrend',
            description: '下降趋势中的十字星'
        },
        // 横盘整理中的十字星
        {
            pattern: {
                open: 100,
                high: 105,
                low: 95,
                close: 100,
                timestamp: 1625097600000,
                volume: 10000
            },
            previousCandles: [
                { open: 99, high: 102, low: 97, close: 101, timestamp: 1625011200000, volume: 9000 },
                { open: 101, high: 103, low: 98, close: 99, timestamp: 1625097600000 - 86400000, volume: 9500 }
            ],
            expectedTrend: 'sideways',
            description: '横盘整理中的十字星'
        }
    ],

    /**
     * 成交量变化测试数据
     */
    volumeChanges: [
        // 成交量显著增加的十字星
        {
            pattern: {
                open: 100,
                high: 105,
                low: 95,
                close: 100,
                timestamp: 1625097600000,
                volume: 20000
            },
            previousCandles: [
                { open: 99, high: 102, low: 97, close: 101, timestamp: 1625011200000, volume: 10000 },
                { open: 101, high: 103, low: 98, close: 99, timestamp: 1625097600000 - 86400000, volume: 10500 }
            ],
            expectedVolumeChange: 100, // 100% 增加
            description: '成交量显著增加的十字星'
        },
        // 成交量显著减少的十字星
        {
            pattern: {
                open: 100,
                high: 105,
                low: 95,
                close: 100,
                timestamp: 1625097600000,
                volume: 5000
            },
            previousCandles: [
                { open: 99, high: 102, low: 97, close: 101, timestamp: 1625011200000, volume: 10000 },
                { open: 101, high: 103, low: 98, close: 99, timestamp: 1625097600000 - 86400000, volume: 10500 }
            ],
            expectedVolumeChange: -50, // 50% 减少
            description: '成交量显著减少的十字星'
        }
    ],

    /**
     * 支撑阻力位测试数据
     */
    supportResistance: [
        // 在支撑位附近的十字星
        {
            pattern: {
                open: 100,
                high: 105,
                low: 95,
                close: 100,
                timestamp: 1625097600000,
                volume: 10000
            },
            supportLevels: [95, 90, 85],
            resistanceLevels: [110, 115, 120],
            expectedNearSR: true,
            description: '在支撑位附近的十字星'
        },
        // 在阻力位附近的十字星
        {
            pattern: {
                open: 100,
                high: 105,
                low: 95,
                close: 100,
                timestamp: 1625097600000,
                volume: 10000
            },
            supportLevels: [85, 80, 75],
            resistanceLevels: [105, 110, 115],
            expectedNearSR: true,
            description: '在阻力位附近的十字星'
        },
        // 不在支撑阻力位附近的十字星
        {
            pattern: {
                open: 100,
                high: 105,
                low: 95,
                close: 100,
                timestamp: 1625097600000,
                volume: 10000
            },
            supportLevels: [80, 75, 70],
            resistanceLevels: [120, 125, 130],
            expectedNearSR: false,
            description: '不在支撑阻力位附近的十字星'
        }
    ]
};