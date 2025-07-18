/**
 * 市场环境类型
 */
export type MarketCondition = 'bull' | 'bear' | 'neutral' | undefined

/**
 * K线数据接口
 */
export interface KLineData {
    /**
     * 时间戳
     */
    timestamp: number

    /**
     * 开盘价
     */
    open: number

    /**
     * 最高价
     */
    high: number

    /**
     * 最低价
     */
    low: number

    /**
     * 收盘价
     */
    close: number

    /**
     * 成交量
     */
    volume: number
}