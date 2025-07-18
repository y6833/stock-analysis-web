import { MarketCondition } from '../types/technical-analysis/kline';
import { StockDataService } from '../services/StockDataService';

/**
 * 市场环境分类器
 * 用于判断特定时间点的市场环境
 */
export class MarketEnvironmentClassifier {
    /**
     * 股票数据服务
     */
    private stockDataService: StockDataService;

    /**
     * 指数ID（默认为上证指数）
     */
    private indexId: string;

    /**
     * 构造函数
     * @param stockDataService 股票数据服务
     * @param indexId 指数ID
     */
    constructor(stockDataService: StockDataService, indexId: string = '000001.SH') {
        this.stockDataService = stockDataService;
        this.indexId = indexId;
    }

    /**
     * 获取市场环境
     * @param timestamp 时间戳
     * @returns 市场环境
     */
    public async getMarketCondition(timestamp: number): Promise<MarketCondition> {
        try {
            // 获取指数数据
            const endDate = new Date(timestamp);
            const startDate = new Date(timestamp);
            startDate.setDate(startDate.getDate() - 60); // 获取60天数据

            const klines = await this.stockDataService.getIndexData(
                this.indexId,
                startDate.getTime(),
                endDate.getTime(),
                'daily'
            );

            if (klines.length < 20) {
                // 数据不足，返回中性
                return 'neutral';
            }

            // 计算20日和60日均线
            const ma20 = this.calculateMA(klines.slice(-20));
            const ma60 = this.calculateMA(klines);

            // 计算20日涨跌幅
            const priceChange20 = this.calculatePriceChange(klines.slice(-20));

            // 判断市场环境
            if (ma20 > ma60 && priceChange20 > 5) {
                // 短期均线在长期均线上方，且20日涨幅大于5%，判断为牛市
                return 'bull';
            } else if (ma20 < ma60 && priceChange20 < -5) {
                // 短期均线在长期均线下方，且20日跌幅大于5%，判断为熊市
                return 'bear';
            } else {
                // 其他情况判断为中性
                return 'neutral';
            }
        } catch (error) {
            console.error('获取市场环境失败:', error);
            return 'neutral';
        }
    }

    /**
     * 计算均线
     * @param klines K线数据数组
     * @returns 均线值
     */
    private calculateMA(klines: { close: number }[]): number {
        if (klines.length === 0) {
            return 0;
        }

        const sum = klines.reduce((acc, kline) => acc + kline.close, 0);
        return sum / klines.length;
    }

    /**
     * 计算价格变化百分比
     * @param klines K线数据数组
     * @returns 价格变化百分比
     */
    private calculatePriceChange(klines: { close: number }[]): number {
        if (klines.length < 2) {
            return 0;
        }

        const firstClose = klines[0].close;
        const lastClose = klines[klines.length - 1].close;

        return ((lastClose - firstClose) / firstClose) * 100;
    }

    /**
     * 设置指数ID
     * @param indexId 指数ID
     */
    public setIndexId(indexId: string): void {
        this.indexId = indexId;
    }

    /**
     * 获取指数ID
     * @returns 指数ID
     */
    public getIndexId(): string {
        return this.indexId;
    }
}