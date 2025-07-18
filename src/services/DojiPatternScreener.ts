import type { DojiScreenCriteria, StockScreenResult } from '../types/technical-analysis/screener'
import type { HistoricalPatternService } from './HistoricalPatternService'
import type { StockDataService } from './StockDataService'

/**
 * 十字星形态筛选器
 * 用于筛选出现十字星形态后上涨的股票
 */
export class DojiPatternScreener {
  private historicalPatternService: HistoricalPatternService
  private stockDataService: StockDataService

  /**
   * 构造函数
   * @param historicalPatternService 历史形态服务
   * @param stockDataService 股票数据服务
   */
  constructor(
    historicalPatternService: HistoricalPatternService,
    stockDataService: StockDataService
  ) {
    this.historicalPatternService = historicalPatternService
    this.stockDataService = stockDataService
  }

  /**
   * 根据条件筛选股票
   * @param criteria 筛选条件
   * @returns 筛选结果
   */
  async screenStocks(criteria: DojiScreenCriteria): Promise<StockScreenResult> {
    // 实际实现会调用服务获取数据
    // 这里返回模拟数据用于界面开发
    return {
      stocks: [
        {
          stockId: '600000',
          stockName: '浦发银行',
          patternDate: Date.now() - 86400000 * 2,
          patternType: 'standard',
          priceBeforePattern: 10.5,
          currentPrice: 11.2,
          priceChange: 6.67,
          volumeChange: 15.3,
          significance: 0.85,
          rank: 1
        },
        {
          stockId: '000001',
          stockName: '平安银行',
          patternDate: Date.now() - 86400000 * 3,
          patternType: 'dragonfly',
          priceBeforePattern: 15.2,
          currentPrice: 16.1,
          priceChange: 5.92,
          volumeChange: 8.7,
          significance: 0.76,
          rank: 2
        },
        {
          stockId: '601318',
          stockName: '中国平安',
          patternDate: Date.now() - 86400000 * 1,
          patternType: 'longLegged',
          priceBeforePattern: 45.6,
          currentPrice: 47.8,
          priceChange: 4.82,
          volumeChange: 12.1,
          significance: 0.92,
          rank: 3
        },
        {
          stockId: '600519',
          stockName: '贵州茅台',
          patternDate: Date.now() - 86400000 * 5,
          patternType: 'gravestone',
          priceBeforePattern: 1800.5,
          currentPrice: 1860.2,
          priceChange: 3.32,
          volumeChange: -2.5,
          significance: 0.68,
          rank: 4
        },
        {
          stockId: '000858',
          stockName: '五粮液',
          patternDate: Date.now() - 86400000 * 4,
          patternType: 'standard',
          priceBeforePattern: 168.3,
          currentPrice: 172.5,
          priceChange: 2.49,
          volumeChange: 5.8,
          significance: 0.71,
          rank: 5
        }
      ],
      total: 5,
      criteria
    }
  }
}