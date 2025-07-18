import type { DojiType } from './doji'
import type { MarketCondition } from './kline'

/**
 * 十字星筛选条件接口
 */
export interface DojiScreenCriteria {
    /**
     * 要筛选的十字星形态类型
     */
    patternTypes: DojiType[]

    /**
     * 查找最近几天内的形态
     */
    daysRange: number

    /**
     * 最小上涨幅度百分比
     */
    minUpwardPercent?: number

    /**
     * 排序字段
     */
    sortBy: 'priceChange' | 'volumeChange' | 'patternDate' | 'significance'

    /**
     * 排序方向
     */
    sortDirection: 'asc' | 'desc'

    /**
     * 市场环境筛选
     */
    marketCondition?: MarketCondition

    /**
     * 结果数量限制
     */
    limit: number
}

/**
 * 上涨股票结果接口
 */
export interface UpwardStockResult {
    /**
     * 股票ID
     */
    stockId: string

    /**
     * 股票名称
     */
    stockName: string

    /**
     * 形态日期
     */
    patternDate: number

    /**
     * 形态类型
     */
    patternType: DojiType

    /**
     * 形态出现前的价格
     */
    priceBeforePattern: number

    /**
     * 当前价格
     */
    currentPrice: number

    /**
     * 价格变化百分比
     */
    priceChange: number

    /**
     * 成交量变化百分比
     */
    volumeChange: number

    /**
     * 形态显著性 (0-1)
     */
    significance: number

    /**
     * 排名
     */
    rank: number
}

/**
 * 股票筛选结果接口
 */
export interface StockScreenResult {
    /**
     * 符合条件的股票列表
     */
    stocks: UpwardStockResult[]

    /**
     * 结果总数
     */
    total: number

    /**
     * 使用的筛选条件
     */
    criteria: DojiScreenCriteria
}