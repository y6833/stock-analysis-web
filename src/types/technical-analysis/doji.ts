/**
 * 十字星形态类型
 */
export type DojiType = 'standard' | 'dragonfly' | 'gravestone' | 'longLegged'

/**
 * 十字星形态接口
 */
export interface DojiPattern {
    /**
     * 形态ID
     */
    id: string

    /**
     * 股票ID
     */
    stockId: string

    /**
     * 股票名称
     */
    stockName: string

    /**
     * 时间戳
     */
    timestamp: number

    /**
     * 形态类型
     */
    patternType: DojiType

    /**
     * K线数据
     */
    candle: {
        open: number
        high: number
        low: number
        close: number
        volume: number
    }

    /**
     * 形态显著性 (0-1)
     */
    significance: number

    /**
     * 形态上下文信息
     */
    context: {
        /**
         * 趋势类型
         */
        trend: 'uptrend' | 'downtrend' | 'sideways'

        /**
         * 成交量状态
         */
        volume: 'high' | 'normal' | 'low'

        /**
         * 位置信息
         */
        position: 'top' | 'middle' | 'bottom'
    }
}