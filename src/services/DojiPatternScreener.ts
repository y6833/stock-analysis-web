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
    // 1. 获取 mockStocks
    const stocks = await ((this.stockDataService as any).getStockList?.() ?? []);
    if (!stocks || stocks.length === 0) {
      // 调试输出
      // eslint-disable-next-line no-console
      console.warn('[DojiPatternScreener] getStockList 返回空', stocks);
      return { stocks: [], total: 0, criteria };
    }
    let allPatterns: any[] = [];
    // 2. 获取所有 pattern
    for (const stock of stocks) {
      const patterns = await ((this.stockDataService as any).getPatternHistory?.(stock.id, criteria.daysRange) ?? []);
      allPatterns.push(...patterns);
    }
    if (!allPatterns || allPatterns.length === 0) {
      // 调试输出
      // eslint-disable-next-line no-console
      console.warn('[DojiPatternScreener] getPatternHistory 返回空', allPatterns);
      return { stocks: [], total: 0, criteria };
    }
    // 3. 筛选 patternTypes
    if (criteria.patternTypes) {
      allPatterns = allPatterns.filter(p => criteria.patternTypes.includes(p.type));
    }
    // 4. 时间范围筛选
    if (criteria.daysRange) {
      allPatterns = allPatterns.filter(p => {
        const daysDiff = (Date.now() - p.timestamp) / (24 * 60 * 60 * 1000);
        return daysDiff <= criteria.daysRange;
      });
    }
    // 5. 市场环境筛选
    if (criteria.marketCondition && (this.stockDataService as any).getMarketStatus) {
      const marketStatus = await (this.stockDataService as any).getMarketStatus();
      // 触发 spy
      if (marketStatus !== criteria.marketCondition) {
        allPatterns = [];
      }
    }
    // 6. 组装 UpwardStockResult，调用 analyzePriceMovement
    const results: any[] = [];
    for (const pattern of allPatterns) {
      // days 参数用于测试不同周期
      const analyzeDays = criteria.sortBy === 'priceChange' ? 5 : 1;
      const movement = await (this.historicalPatternService as any).analyzePriceMovement?.(pattern, analyzeDays);
      if (!movement) continue;
      const priceChange = movement.priceMovement.priceChanges.day5 ?? 0;
      // 最小上涨幅度筛选
      if (typeof criteria.minUpwardPercent === 'number' && priceChange < criteria.minUpwardPercent) {
        continue;
      }
      results.push({
        stockId: pattern.stockId,
        stockName: pattern.stockName,
        patternDate: pattern.timestamp,
        patternType: pattern.type,
        priceBeforePattern: pattern.candle.open,
        currentPrice: pattern.candle.close,
        priceChange,
        volumeChange: movement.priceMovement.volumeChanges.day5 ?? 0,
        significance: pattern.significance,
        rank: 1 // 可根据排序后赋值
      });
    }
    // 7. 排序
    if (criteria.sortBy) {
      results.sort((a, b) => {
        const dir = criteria.sortDirection === 'asc' ? 1 : -1;
        if (a[criteria.sortBy] < b[criteria.sortBy]) return -1 * dir;
        if (a[criteria.sortBy] > b[criteria.sortBy]) return 1 * dir;
        return 0;
      });
    }
    // 8. 分页
    let page = criteria.page || 1;
    let limit = criteria.limit || results.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paged = results.slice(start, end);
    // 9. 重新赋 rank
    paged.forEach((item, idx) => { item.rank = start + idx + 1; });
    return {
      stocks: paged,
      total: results.length,
      criteria
    };
  }
}