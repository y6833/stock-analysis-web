import type { DojiScreenCriteria, StockScreenResult } from '../types/technical-analysis/screener'
import type { HistoricalPatternService } from './HistoricalPatternService'
import type { StockDataService } from './StockDataService'
import type { DojiPattern } from '../types/technical-analysis/doji'

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
    try {
      console.log('[DojiPatternScreener] 开始筛选，条件:', criteria)
      console.log('[DojiPatternScreener] 使用真实API进行十字星形态筛选')
      console.log('[DojiPatternScreener] API端点: Tushare API (http://api.tushare.pro)')
      console.log('[DojiPatternScreener] 调用接口: stock_basic, daily, daily_basic')

      // 1. 获取股票列表
      console.log('[DojiPatternScreener] 正在调用 Tushare stock_basic API 获取股票列表...')
      const stocks = await this.stockDataService.getStockList()
      if (!stocks || stocks.length === 0) {
        console.warn('[DojiPatternScreener] 股票列表为空')
        return { stocks: [], total: 0, criteria }
      }

      console.log('[DojiPatternScreener] 获取到股票数量:', stocks.length)

      // 2. 获取最近的形态数据
      console.log('[DojiPatternScreener] 正在调用 Tushare daily API 获取K线数据并进行十字星形态检测...')
      console.log('[DojiPatternScreener] 十字星检测算法: 基于OHLC数据的实体大小和影线长度分析')
      let allPatterns = await this.historicalPatternService.getRecentPatterns(
        criteria.daysRange || 30,
        undefined, // 不限制形态类型，后面再筛选
        200 // 获取更多数据用于筛选
      )

      console.log('[DojiPatternScreener] 获取到形态数量:', allPatterns.length)
      console.log('[DojiPatternScreener] 十字星形态检测完成，使用真实OHLC数据分析')

      if (!allPatterns || allPatterns.length === 0) {
        console.warn('[DojiPatternScreener] 形态数据为空')
        return { stocks: [], total: 0, criteria }
      }

      // 3. 筛选形态类型
      if (criteria.patternTypes && criteria.patternTypes.length > 0) {
        allPatterns = allPatterns.filter(p => criteria.patternTypes.includes(p.patternType))
        console.log('[DojiPatternScreener] 按形态类型筛选后数量:', allPatterns.length)
      }

      // 4. 时间范围筛选
      if (criteria.daysRange) {
        const cutoffTime = Date.now() - (criteria.daysRange * 24 * 60 * 60 * 1000)
        allPatterns = allPatterns.filter(p => p.timestamp >= cutoffTime)
        console.log('[DojiPatternScreener] 按时间范围筛选后数量:', allPatterns.length)
      }

      // 5. 创建股票名称映射
      const stockNameMap = new Map()
      stocks.forEach(stock => {
        stockNameMap.set(stock.id, stock.name)
      })

      // 6. 分析价格走势并组装结果
      const results: any[] = []
      for (const pattern of allPatterns) {
        try {
          const movement = await this.historicalPatternService.analyzePriceMovement(pattern, 5)
          const priceChange = movement.priceMovement.priceChanges.day5 ?? 0

          // 最小上涨幅度筛选
          if (typeof criteria.minUpwardPercent === 'number' && priceChange < criteria.minUpwardPercent) {
            continue
          }

          results.push({
            stockId: pattern.stockId,
            stockName: stockNameMap.get(pattern.stockId) || pattern.stockName || `股票${pattern.stockId}`,
            patternDate: pattern.timestamp,
            patternType: pattern.patternType,
            priceBeforePattern: pattern.candle.open,
            currentPrice: pattern.candle.close,
            priceChange,
            volumeChange: movement.priceMovement.volumeChanges.day5 ?? 0,
            significance: pattern.significance,
            rank: 1 // 将在排序后重新赋值
          })
        } catch (error) {
          console.error('[DojiPatternScreener] 分析形态失败:', pattern.id, error)
        }
      }

      console.log('[DojiPatternScreener] 分析完成，结果数量:', results.length)

      // 7. 排序
      if (criteria.sortBy && results.length > 0) {
        results.sort((a, b) => {
          const dir = criteria.sortDirection === 'asc' ? 1 : -1
          const aVal = a[criteria.sortBy]
          const bVal = b[criteria.sortBy]

          if (aVal < bVal) return -1 * dir
          if (aVal > bVal) return 1 * dir
          return 0
        })
      }

      // 8. 应用结果数量限制
      const limit = criteria.limit || results.length
      const limitedResults = results.slice(0, limit)

      // 9. 重新赋值排名
      limitedResults.forEach((item, idx) => {
        item.rank = idx + 1
      })

      console.log('[DojiPatternScreener] 最终结果数量:', limitedResults.length)

      return {
        stocks: limitedResults,
        total: results.length,
        criteria
      }
    } catch (error) {
      console.error('[DojiPatternScreener] 筛选过程出错:', error)
      return { stocks: [], total: 0, criteria }
    }
  }
}