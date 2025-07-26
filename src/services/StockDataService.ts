import type { KLineData } from '../types/technical-analysis/kline'

/**
 * 股票基本信息接口
 */
export interface StockInfo {
    id: string
    symbol: string
    name: string
    market?: string
    industry?: string
}

/**
 * 股票数据服务接口
 */
export interface StockDataService {
    /**
     * 获取股票列表
     * @returns 股票列表
     */
    getStockList(): Promise<StockInfo[]>

    /**
     * 获取K线数据
     * @param stockId 股票ID
     * @param startDate 开始日期
     * @param endDate 结束日期
     * @returns K线数据列表
     */
    getKLineData(stockId: string, startDate: number, endDate: number): Promise<KLineData[]>

    /**
     * 获取股票价格变化
     * @param stockId 股票ID
     * @param fromDate 起始日期
     * @param days 天数
     * @returns 价格变化百分比
     */
    getPriceChange(stockId: string, fromDate: number, days: number): Promise<number>

    /**
     * 获取股票成交量变化
     * @param stockId 股票ID
     * @param fromDate 起始日期
     * @param days 天数
     * @returns 成交量变化百分比
     */
    getVolumeChange(stockId: string, fromDate: number, days: number): Promise<number>

    /**
     * 获取形态历史数据
     * @param stockId 股票ID
     * @param days 天数
     * @returns 形态历史数据
     */
    getPatternHistory?(stockId: string, days: number): Promise<any[]>
}

/**
 * 股票数据服务实现
 */
export class StockDataServiceImpl implements StockDataService {
    /**
     * 获取股票列表
     * @returns 股票列表
     */
    async getStockList(): Promise<StockInfo[]> {
        // 返回模拟股票数据用于测试
        return [
            { id: '000001', symbol: '000001', name: '平安银行', market: '深圳', industry: '银行' },
            { id: '000002', symbol: '000002', name: '万科A', market: '深圳', industry: '房地产' },
            { id: '000858', symbol: '000858', name: '五粮液', market: '深圳', industry: '食品饮料' },
            { id: '600000', symbol: '600000', name: '浦发银行', market: '上海', industry: '银行' },
            { id: '600036', symbol: '600036', name: '招商银行', market: '上海', industry: '银行' },
            { id: '600519', symbol: '600519', name: '贵州茅台', market: '上海', industry: '食品饮料' },
            { id: '600887', symbol: '600887', name: '伊利股份', market: '上海', industry: '食品饮料' },
            { id: '000858', symbol: '000858', name: '五粮液', market: '深圳', industry: '食品饮料' },
            { id: '002415', symbol: '002415', name: '海康威视', market: '深圳', industry: '电子' },
            { id: '300059', symbol: '300059', name: '东方财富', market: '深圳', industry: '非银金融' }
        ]
    }

    /**
     * 获取K线数据
     * @param stockId 股票ID
     * @param startDate 开始日期
     * @param endDate 结束日期
     * @returns K线数据列表
     */
    async getKLineData(stockId: string, startDate: number, endDate: number): Promise<KLineData[]> {
        // 实际实现会从API获取数据
        // 这里返回模拟数据
        return []
    }

    /**
     * 获取股票价格变化
     * @param stockId 股票ID
     * @param fromDate 起始日期
     * @param days 天数
     * @returns 价格变化百分比
     */
    async getPriceChange(stockId: string, fromDate: number, days: number): Promise<number> {
        // 实际实现会从API获取数据
        // 这里返回模拟数据
        return Math.random() * 10 - 3 // 返回-3%到7%之间的随机值
    }

    /**
     * 获取股票成交量变化
     * @param stockId 股票ID
     * @param fromDate 起始日期
     * @param days 天数
     * @returns 成交量变化百分比
     */
    async getVolumeChange(stockId: string, fromDate: number, days: number): Promise<number> {
        // 实际实现会从API获取数据
        // 这里返回模拟数据
        return Math.random() * 20 - 5 // 返回-5%到15%之间的随机值
    }

    /**
     * 获取形态历史数据
     * @param stockId 股票ID
     * @param days 天数
     * @returns 形态历史数据
     */
    async getPatternHistory(stockId: string, days: number): Promise<any[]> {
        // 返回模拟形态数据
        const patterns = []
        const now = Date.now()

        // 为每只股票生成一些模拟的十字星形态
        for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
            const patternDate = now - (Math.floor(Math.random() * days) * 24 * 60 * 60 * 1000)
            patterns.push({
                stockId,
                patternType: ['standard', 'dragonfly', 'gravestone', 'longLegged'][Math.floor(Math.random() * 4)],
                patternDate,
                significance: Math.random() * 0.8 + 0.2, // 0.2-1.0
                priceChange: Math.random() * 10 - 2, // -2% to 8%
                volumeChange: Math.random() * 20 - 5 // -5% to 15%
            })
        }

        return patterns
    }
}