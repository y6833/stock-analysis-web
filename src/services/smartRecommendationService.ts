/**
 * 智能推荐服务
 * 处理智能股票推荐相关的API调用
 */

import axios from 'axios'
import { getAuthHeaders } from '@/utils/auth'

// API基础URL
const API_URL = '/api/smart-recommendation'

// 推荐选项接口
export interface RecommendationOptions {
  riskLevel?: 'low' | 'medium' | 'high'
  expectedReturn?: number
  timeHorizon?: number
  limit?: number
}

// 推荐结果接口
export interface StockRecommendation {
  symbol: string
  name: string
  currentPrice: number
  totalScore: number
  technicalScore: number
  volumePriceScore: number
  trendScore: number
  momentumScore: number
  riskLevel: 'low' | 'medium' | 'high'
  expectedReturn: number
  reasons: string[]
  tradingAdvice: {
    buyPriceRange: {
      min: number
      max: number
      optimal: number
    }
    stopLoss: number
    holdingPeriod: string
    positionSizing: string
    timing: string
  }
  targetPrice: {
    target: number
    upside: number
    confidence: string
    timeframe: string
  }
  recommendation: 'strong_buy' | 'buy' | 'moderate_buy' | 'hold'
  generatedAt: string
  validUntil: string
}

// 推荐响应接口
export interface RecommendationResponse {
  success: boolean
  data: StockRecommendation[]
  meta: {
    totalAnalyzed: number
    qualified: number
    recommended: number
    generatedAt: string
    criteria: RecommendationOptions
  }
  error?: string
}

// 推荐统计接口
export interface RecommendationStats {
  totalRecommendations: number
  successfulRecommendations: number
  successRate: number
  averageReturn: number
  period: string
  riskDistribution: {
    low: number
    medium: number
    high: number
  }
}

// 推荐配置接口
export interface RecommendationConfig {
  riskLevels: Array<{
    value: string
    label: string
    description: string
  }>
  timeHorizons: Array<{
    value: number
    label: string
    description: string
  }>
  expectedReturns: Array<{
    value: number
    label: string
    description: string
  }>
  membershipLimits: {
    [key: string]: {
      maxRecommendations: number
      description: string
    }
  }
  disclaimer: string
}

/**
 * 智能推荐服务
 */
export const smartRecommendationService = {
  /**
   * 获取智能推荐列表
   * @param options 推荐选项
   * @returns 推荐结果
   */
  async getRecommendations(options: RecommendationOptions = {}): Promise<RecommendationResponse> {
    try {
      const params = new URLSearchParams()
      
      if (options.riskLevel) params.append('riskLevel', options.riskLevel)
      if (options.expectedReturn) params.append('expectedReturn', options.expectedReturn.toString())
      if (options.timeHorizon) params.append('timeHorizon', options.timeHorizon.toString())
      if (options.limit) params.append('limit', options.limit.toString())

      const response = await axios.get(`${API_URL}?${params.toString()}`)
      return response.data
    } catch (error) {
      console.error('获取智能推荐失败:', error)
      throw error
    }
  },

  /**
   * 刷新推荐列表
   * @param options 推荐选项
   * @returns 推荐结果
   */
  async refreshRecommendations(options: RecommendationOptions = {}): Promise<RecommendationResponse> {
    try {
      const headers = getAuthHeaders()
      const response = await axios.post(`${API_URL}/refresh`, options, headers)
      return response.data
    } catch (error) {
      console.error('刷新推荐失败:', error)
      throw error
    }
  },

  /**
   * 获取推荐历史统计
   * @param days 统计天数
   * @returns 统计信息
   */
  async getRecommendationStats(days: number = 30): Promise<RecommendationStats> {
    try {
      const response = await axios.get(`${API_URL}/stats?days=${days}`)
      return response.data.data
    } catch (error) {
      console.error('获取推荐统计失败:', error)
      throw error
    }
  },

  /**
   * 分析单个股票
   * @param symbol 股票代码
   * @returns 分析结果
   */
  async analyzeStock(symbol: string): Promise<StockRecommendation> {
    try {
      const response = await axios.get(`${API_URL}/analyze/${symbol}`)
      return response.data.data
    } catch (error) {
      console.error(`分析股票 ${symbol} 失败:`, error)
      throw error
    }
  },

  /**
   * 获取推荐配置
   * @returns 配置信息
   */
  async getRecommendationConfig(): Promise<RecommendationConfig> {
    try {
      const response = await axios.get(`${API_URL}/config`)
      return response.data.data
    } catch (error) {
      console.error('获取推荐配置失败:', error)
      throw error
    }
  },

  /**
   * 格式化推荐等级显示
   * @param recommendation 推荐等级
   * @returns 格式化的显示文本
   */
  formatRecommendationLevel(recommendation: string): { text: string; color: string; icon: string } {
    const levels = {
      strong_buy: { text: '强烈买入', color: '#f56565', icon: '🔥' },
      buy: { text: '买入', color: '#48bb78', icon: '📈' },
      moderate_buy: { text: '适度买入', color: '#38b2ac', icon: '👍' },
      hold: { text: '持有观望', color: '#ed8936', icon: '⏸️' }
    }
    
    return levels[recommendation as keyof typeof levels] || levels.hold
  },

  /**
   * 格式化风险等级显示
   * @param riskLevel 风险等级
   * @returns 格式化的显示文本
   */
  formatRiskLevel(riskLevel: string): { text: string; color: string; icon: string } {
    const levels = {
      low: { text: '低风险', color: '#48bb78', icon: '🛡️' },
      medium: { text: '中等风险', color: '#ed8936', icon: '⚖️' },
      high: { text: '高风险', color: '#f56565', icon: '⚠️' }
    }
    
    return levels[riskLevel as keyof typeof levels] || levels.medium
  },

  /**
   * 格式化价格显示
   * @param price 价格
   * @returns 格式化的价格字符串
   */
  formatPrice(price: number): string {
    return price.toFixed(2)
  },

  /**
   * 格式化百分比显示
   * @param value 数值
   * @returns 格式化的百分比字符串
   */
  formatPercentage(value: number): string {
    return `${(value * 100).toFixed(2)}%`
  },

  /**
   * 获取评分颜色
   * @param score 评分
   * @returns 颜色值
   */
  getScoreColor(score: number): string {
    if (score >= 85) return '#f56565' // 红色 - 优秀
    if (score >= 75) return '#48bb78' // 绿色 - 良好
    if (score >= 65) return '#38b2ac' // 青色 - 一般
    return '#ed8936' // 橙色 - 较差
  },

  /**
   * 检查推荐是否过期
   * @param validUntil 有效期
   * @returns 是否过期
   */
  isRecommendationExpired(validUntil: string): boolean {
    return new Date(validUntil) < new Date()
  }
}
