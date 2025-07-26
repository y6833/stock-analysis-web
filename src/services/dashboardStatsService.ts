import { apiService as apiClient } from './refactored/ApiService'

export interface DojiStats {
  todayPatterns: number
  totalStocks: number
  accuracy: number
}

export interface AIRecommendationStats {
  recommendations: number
  highConfidence: number
  mediumConfidence: number
  lowConfidence: number
}

export interface TurtleSignalStats {
  signals: number
  buySignals: number
  sellSignals: number
  strongSignals: number
}

export interface RiskStats {
  level: '低' | '中' | '高'
  score: number
  volatility: number
  vixLevel: number
}

export interface DashboardStats {
  dojiStats: DojiStats
  aiStats: AIRecommendationStats
  turtleStats: TurtleSignalStats
  riskStats: RiskStats
}

class DashboardStatsService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T
    }
    return null
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  /**
   * 获取十字星形态统计
   */
  async getDojiStats(): Promise<DojiStats> {
    const cacheKey = 'doji-stats'
    const cached = this.getCachedData<DojiStats>(cacheKey)
    if (cached) return cached

    try {
      // 获取热门股票列表
      const hotStocks = await this.getHotStocksList()

      let todayPatterns = 0
      let totalAnalyzed = 0

      // 分析每只股票的十字星形态
      for (const stock of hotStocks.slice(0, 50)) { // 限制分析50只股票
        try {
          const endDate = this.getDateString(0)
          const startDate = this.getDateString(-5) // 最近5天

          const response = await apiClient.get(`/api/stocks/${stock.ts_code}/history`, {
            params: { start_date: startDate, end_date: endDate }
          })

          if (response.data.success && response.data.data.length > 0) {
            totalAnalyzed++
            const latestData = response.data.data[response.data.data.length - 1]

            // 检测十字星形态
            if (this.isDojiPattern(latestData)) {
              todayPatterns++
            }
          }
        } catch (error) {
          console.warn(`分析股票 ${stock.ts_code} 十字星形态失败:`, error)
        }
      }

      const stats: DojiStats = {
        todayPatterns,
        totalStocks: totalAnalyzed,
        accuracy: totalAnalyzed > 0 ? Math.round((todayPatterns / totalAnalyzed) * 100) : 0
      }

      this.setCachedData(cacheKey, stats)
      return stats
    } catch (error) {
      console.error('获取十字星统计失败:', error)
      // 返回默认值
      return { todayPatterns: 0, totalStocks: 0, accuracy: 0 }
    }
  }

  /**
   * 获取AI推荐统计
   */
  async getAIRecommendationStats(): Promise<AIRecommendationStats> {
    const cacheKey = 'ai-recommendation-stats'
    const cached = this.getCachedData<AIRecommendationStats>(cacheKey)
    if (cached) return cached

    try {
      // 获取热门股票并进行AI分析
      const hotStocks = await this.getHotStocksList()

      let highConfidence = 0
      let mediumConfidence = 0
      let lowConfidence = 0

      // 分析前30只股票
      for (const stock of hotStocks.slice(0, 30)) {
        try {
          const score = await this.calculateAIScore(stock.ts_code)

          if (score >= 0.8) {
            highConfidence++
          } else if (score >= 0.6) {
            mediumConfidence++
          } else if (score >= 0.4) {
            lowConfidence++
          }
        } catch (error) {
          console.warn(`AI分析股票 ${stock.ts_code} 失败:`, error)
        }
      }

      const stats: AIRecommendationStats = {
        recommendations: highConfidence + mediumConfidence + lowConfidence,
        highConfidence,
        mediumConfidence,
        lowConfidence
      }

      this.setCachedData(cacheKey, stats)
      return stats
    } catch (error) {
      console.error('获取AI推荐统计失败:', error)
      return { recommendations: 0, highConfidence: 0, mediumConfidence: 0, lowConfidence: 0 }
    }
  }

  /**
   * 获取海龟交易信号统计
   */
  async getTurtleSignalStats(): Promise<TurtleSignalStats> {
    const cacheKey = 'turtle-signal-stats'
    const cached = this.getCachedData<TurtleSignalStats>(cacheKey)
    if (cached) return cached

    try {
      const hotStocks = await this.getHotStocksList()

      let buySignals = 0
      let sellSignals = 0
      let strongSignals = 0

      // 分析前40只股票的海龟信号
      for (const stock of hotStocks.slice(0, 40)) {
        try {
          const signals = await this.calculateTurtleSignals(stock.ts_code)

          if (signals.type === 'buy') {
            buySignals++
            if (signals.strength > 0.7) strongSignals++
          } else if (signals.type === 'sell') {
            sellSignals++
            if (signals.strength > 0.7) strongSignals++
          }
        } catch (error) {
          console.warn(`计算股票 ${stock.ts_code} 海龟信号失败:`, error)
        }
      }

      const stats: TurtleSignalStats = {
        signals: buySignals + sellSignals,
        buySignals,
        sellSignals,
        strongSignals
      }

      this.setCachedData(cacheKey, stats)
      return stats
    } catch (error) {
      console.error('获取海龟信号统计失败:', error)
      return { signals: 0, buySignals: 0, sellSignals: 0, strongSignals: 0 }
    }
  }

  /**
   * 获取风险统计
   */
  async getRiskStats(): Promise<RiskStats> {
    const cacheKey = 'risk-stats'
    const cached = this.getCachedData<RiskStats>(cacheKey)
    if (cached) return cached

    try {
      // 计算市场整体波动率
      const marketVolatility = await this.calculateMarketVolatility()

      // 根据波动率确定风险等级
      let level: '低' | '中' | '高' = '低'
      let score = 0

      if (marketVolatility > 0.03) { // 3%以上波动率为高风险
        level = '高'
        score = Math.min(100, marketVolatility * 1000)
      } else if (marketVolatility > 0.02) { // 2-3%为中风险
        level = '中'
        score = Math.min(70, marketVolatility * 1000)
      } else { // 2%以下为低风险
        level = '低'
        score = Math.min(30, marketVolatility * 1000)
      }

      const stats: RiskStats = {
        level,
        score: Math.round(score),
        volatility: Math.round(marketVolatility * 10000) / 100, // 转换为百分比
        vixLevel: Math.round(marketVolatility * 100) // 模拟VIX指数
      }

      this.setCachedData(cacheKey, stats)
      return stats
    } catch (error) {
      console.error('获取风险统计失败:', error)
      return { level: '低', score: 0, volatility: 0, vixLevel: 0 }
    }
  }

  /**
   * 获取所有仪表盘统计数据
   */
  async getAllStats(): Promise<DashboardStats> {
    try {
      const [dojiStats, aiStats, turtleStats, riskStats] = await Promise.all([
        this.getDojiStats(),
        this.getAIRecommendationStats(),
        this.getTurtleSignalStats(),
        this.getRiskStats()
      ])

      return { dojiStats, aiStats, turtleStats, riskStats }
    } catch (error) {
      console.error('获取仪表盘统计数据失败:', error)
      throw error
    }
  }

  // 辅助方法
  private async getHotStocksList() {
    try {
      const response = await apiClient.get('/api/stocks/hot-stocks')
      return response.data.data || []
    } catch (error) {
      console.warn('获取热门股票列表失败，使用默认列表')
      return [
        { ts_code: '000001.SZ' }, { ts_code: '000002.SZ' }, { ts_code: '000858.SZ' },
        { ts_code: '002415.SZ' }, { ts_code: '002594.SZ' }, { ts_code: '300059.SZ' },
        { ts_code: '300750.SZ' }, { ts_code: '600000.SH' }, { ts_code: '600036.SH' },
        { ts_code: '600519.SH' }, { ts_code: '601318.SH' }, { ts_code: '601398.SH' }
      ]
    }
  }

  private isDojiPattern(data: any): boolean {
    const { open, high, low, close } = data
    if (!open || !high || !low || !close) return false

    const bodySize = Math.abs(close - open)
    const totalRange = high - low
    const upperShadow = high - Math.max(open, close)
    const lowerShadow = Math.min(open, close) - low

    // 十字星判断条件：实体小，上下影线长
    return (
      bodySize / totalRange < 0.1 && // 实体占总范围不超过10%
      upperShadow > bodySize * 2 && // 上影线至少是实体的2倍
      lowerShadow > bodySize * 2    // 下影线至少是实体的2倍
    )
  }

  private async calculateAIScore(tsCode: string): Promise<number> {
    try {
      const endDate = this.getDateString(0)
      const startDate = this.getDateString(-20) // 最近20天

      const response = await apiClient.get(`/api/stocks/${tsCode}/history`, {
        params: { start_date: startDate, end_date: endDate }
      })

      if (!response.data.success || !response.data.data.length) {
        return 0.5 // 默认中等分数
      }

      const data = response.data.data
      // 简单的AI评分算法：基于价格趋势和成交量
      const priceChange = (data[data.length - 1].close - data[0].close) / data[0].close
      const volumeAvg = data.reduce((sum: number, item: any) => sum + (item.vol || 0), 0) / data.length
      const recentVolume = data.slice(-5).reduce((sum: number, item: any) => sum + (item.vol || 0), 0) / 5

      let score = 0.5
      if (priceChange > 0.05) score += 0.2 // 价格上涨5%以上加分
      if (recentVolume > volumeAvg * 1.2) score += 0.2 // 近期成交量放大加分
      if (priceChange > 0 && priceChange < 0.1) score += 0.1 // 温和上涨加分

      return Math.min(1, Math.max(0, score))
    } catch (error) {
      return 0.5
    }
  }

  private async calculateTurtleSignals(tsCode: string): Promise<{ type: 'buy' | 'sell' | 'hold'; strength: number }> {
    try {
      const endDate = this.getDateString(0)
      const startDate = this.getDateString(-30) // 最近30天

      const response = await apiClient.get(`/api/stocks/${tsCode}/history`, {
        params: { start_date: startDate, end_date: endDate }
      })

      if (!response.data.success || !response.data.data.length) {
        return { type: 'hold', strength: 0 }
      }

      const data = response.data.data
      const currentPrice = data[data.length - 1].close

      // 计算20日高点和低点
      const highs = data.slice(-20).map((item: any) => item.high)
      const lows = data.slice(-20).map((item: any) => item.low)
      const highest20 = Math.max(...highs)
      const lowest20 = Math.min(...lows)

      let type: 'buy' | 'sell' | 'hold' = 'hold'
      let strength = 0

      if (currentPrice > highest20 * 0.98) { // 接近20日高点
        type = 'buy'
        strength = (currentPrice - lowest20) / (highest20 - lowest20)
      } else if (currentPrice < lowest20 * 1.02) { // 接近20日低点
        type = 'sell'
        strength = (highest20 - currentPrice) / (highest20 - lowest20)
      }

      return { type, strength: Math.min(1, Math.max(0, strength)) }
    } catch (error) {
      return { type: 'hold', strength: 0 }
    }
  }

  private async calculateMarketVolatility(): Promise<number> {
    try {
      // 使用上证指数计算市场波动率
      const endDate = this.getDateString(0)
      const startDate = this.getDateString(-20)

      const response = await apiClient.get('/api/stocks/000001.SH/history', {
        params: { start_date: startDate, end_date: endDate }
      })

      if (!response.data.success || !response.data.data.length) {
        return 0.02 // 默认2%波动率
      }

      const data = response.data.data
      const returns = []

      for (let i = 1; i < data.length; i++) {
        const dailyReturn = (data[i].close - data[i - 1].close) / data[i - 1].close
        returns.push(dailyReturn)
      }

      // 计算标准差作为波动率
      const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length

      return Math.sqrt(variance)
    } catch (error) {
      return 0.02 // 默认2%波动率
    }
  }

  private getDateString(daysOffset: number = 0): string {
    const date = new Date()
    date.setDate(date.getDate() + daysOffset)
    return date.toISOString().slice(0, 10).replace(/-/g, '')
  }
}

export const dashboardStatsService = new DashboardStatsService()
