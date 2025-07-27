/**
 * 风险管理服务
 * 提供风险评估、监控和预警功能
 */

import axios from 'axios'
import { smartCache } from '@/utils/smartCache'

// 风险数据接口
export interface RiskData {
  overallScore: number
  overallLevel: 'low' | 'medium' | 'high' | 'critical'
  scoreTrend: 'up' | 'down' | 'stable'
  var: number // Value at Risk
  varChange: number
  volatility: number
  volatilityChange: number
  concentration: number
  concentrationChange: number
  beta: number
  betaChange: number
  lastUpdated: Date
}

export interface RiskAlert {
  id: string
  type: 'stop_loss' | 'volatility' | 'concentration' | 'market' | 'liquidity'
  level: 'info' | 'warning' | 'danger' | 'critical'
  title: string
  message: string
  timestamp: Date
  isRead: boolean
  portfolioId?: string
  stockSymbol?: string
  threshold?: number
  currentValue?: number
  actions?: Array<{
    label: string
    action: string
    type?: 'primary' | 'warning' | 'danger'
  }>
}

export interface RiskRecommendation {
  id: string
  type: 'rebalance' | 'stop_loss' | 'diversify' | 'hedge'
  priority: 'low' | 'medium' | 'high'
  title: string
  content: string
  impact: string
  effort: string
  expectedBenefit: string
  actions?: Array<{
    label: string
    action: string
    params?: any
  }>
}

export interface StopLossSettings {
  globalStopLoss: number // 全局止损百分比
  singleStockStopLoss: number // 单股止损百分比
  enableTrailingStop: boolean // 是否启用移动止损
  trailingStopPercent: number // 移动止损百分比
  enableTimeBasedStop: boolean // 是否启用时间止损
  timeBasedStopDays: number // 时间止损天数
}

export interface AlertSettings {
  varThreshold: number // VaR预警阈值
  volatilityThreshold: number // 波动率预警阈值
  concentrationThreshold: number // 集中度预警阈值
  betaThreshold: number // Beta预警阈值
  emailNotification: boolean // 邮件通知
  smsNotification: boolean // 短信通知
  pushNotification: boolean // 推送通知
  notificationFrequency: 'immediate' | 'hourly' | 'daily' // 通知频率
}

class RiskService {
  private baseURL = '/api/risk'

  /**
   * 获取风险概览数据
   */
  async getRiskOverview(portfolioId?: string): Promise<RiskData> {
    const cacheKey = `risk_overview_${portfolioId || 'default'}`
    
    return await smartCache.getOrSet(
      cacheKey,
      async () => {
        try {
          console.log('[RiskService] 获取风险概览数据...')
          
          const response = await axios.get(`${this.baseURL}/overview`, {
            params: { portfolioId }
          })

          if (response.data && response.data.success) {
            return {
              ...response.data.data,
              lastUpdated: new Date()
            }
          } else {
            throw new Error(response.data?.message || '获取风险数据失败')
          }
        } catch (error) {
          console.error('[RiskService] 获取风险概览失败:', error)
          
          // 返回模拟数据作为备用
          return {
            overallScore: 75 + Math.random() * 20,
            overallLevel: 'medium' as const,
            scoreTrend: 'stable' as const,
            var: 8.5 + Math.random() * 2,
            varChange: (Math.random() - 0.5) * 0.5,
            volatility: 18.3 + Math.random() * 5,
            volatilityChange: (Math.random() - 0.5) * 2,
            concentration: 35.2 + Math.random() * 10,
            concentrationChange: (Math.random() - 0.5) * 5,
            beta: 1.15 + Math.random() * 0.3,
            betaChange: (Math.random() - 0.5) * 0.1,
            lastUpdated: new Date()
          }
        }
      },
      {
        expiry: 5 * 60 * 1000, // 5分钟缓存
        version: '1.0',
        tags: ['risk', 'overview']
      }
    )
  }

  /**
   * 获取风险预警列表
   */
  async getRiskAlerts(portfolioId?: string): Promise<RiskAlert[]> {
    const cacheKey = `risk_alerts_${portfolioId || 'default'}`
    
    return await smartCache.getOrSet(
      cacheKey,
      async () => {
        try {
          console.log('[RiskService] 获取风险预警...')
          
          const response = await axios.get(`${this.baseURL}/alerts`, {
            params: { portfolioId }
          })

          if (response.data && response.data.success) {
            return response.data.data.map((alert: any) => ({
              ...alert,
              timestamp: new Date(alert.timestamp)
            }))
          } else {
            throw new Error(response.data?.message || '获取风险预警失败')
          }
        } catch (error) {
          console.error('[RiskService] 获取风险预警失败:', error)
          
          // 返回模拟数据
          return [
            {
              id: '1',
              type: 'volatility',
              level: 'warning',
              title: '波动率预警',
              message: '投资组合波动率超过预设阈值15%',
              timestamp: new Date(),
              isRead: false,
              actions: [
                { label: '查看详情', action: 'view_details', type: 'primary' },
                { label: '调整仓位', action: 'adjust_position', type: 'warning' }
              ]
            },
            {
              id: '2',
              type: 'concentration',
              level: 'danger',
              title: '集中度风险',
              message: '单一股票占比过高，建议分散投资',
              timestamp: new Date(Date.now() - 3600000),
              isRead: false,
              actions: [
                { label: '立即处理', action: 'handle_now', type: 'danger' }
              ]
            }
          ] as RiskAlert[]
        }
      },
      {
        expiry: 2 * 60 * 1000, // 2分钟缓存
        version: '1.0',
        tags: ['risk', 'alerts']
      }
    )
  }

  /**
   * 获取风险建议
   */
  async getRiskRecommendations(portfolioId?: string): Promise<RiskRecommendation[]> {
    const cacheKey = `risk_recommendations_${portfolioId || 'default'}`
    
    return await smartCache.getOrSet(
      cacheKey,
      async () => {
        try {
          console.log('[RiskService] 获取风险建议...')
          
          const response = await axios.get(`${this.baseURL}/recommendations`, {
            params: { portfolioId }
          })

          if (response.data && response.data.success) {
            return response.data.data
          } else {
            throw new Error(response.data?.message || '获取风险建议失败')
          }
        } catch (error) {
          console.error('[RiskService] 获取风险建议失败:', error)
          
          // 返回模拟数据
          return [
            {
              id: '1',
              type: 'diversify',
              priority: 'high',
              title: '降低集中度风险',
              content: '建议减少单一股票持仓比例，增加投资组合多样性',
              impact: '高',
              effort: '中',
              expectedBenefit: '降低15%的集中度风险'
            },
            {
              id: '2',
              type: 'stop_loss',
              priority: 'medium',
              title: '调整止损策略',
              content: '当前市场波动较大，建议收紧止损幅度至8%',
              impact: '中',
              effort: '低',
              expectedBenefit: '减少潜在损失10%'
            }
          ] as RiskRecommendation[]
        }
      },
      {
        expiry: 10 * 60 * 1000, // 10分钟缓存
        version: '1.0',
        tags: ['risk', 'recommendations']
      }
    )
  }

  /**
   * 获取止损设置
   */
  async getStopLossSettings(portfolioId?: string): Promise<StopLossSettings> {
    try {
      console.log('[RiskService] 获取止损设置...')
      
      const response = await axios.get(`${this.baseURL}/stop-loss-settings`, {
        params: { portfolioId }
      })

      if (response.data && response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data?.message || '获取止损设置失败')
      }
    } catch (error) {
      console.error('[RiskService] 获取止损设置失败:', error)
      
      // 返回默认设置
      return {
        globalStopLoss: 10.0,
        singleStockStopLoss: 15.0,
        enableTrailingStop: false,
        trailingStopPercent: 5.0,
        enableTimeBasedStop: false,
        timeBasedStopDays: 30
      }
    }
  }

  /**
   * 更新止损设置
   */
  async updateStopLossSettings(settings: StopLossSettings, portfolioId?: string): Promise<boolean> {
    try {
      console.log('[RiskService] 更新止损设置...')
      
      const response = await axios.put(`${this.baseURL}/stop-loss-settings`, {
        ...settings,
        portfolioId
      })

      return response.data && response.data.success
    } catch (error) {
      console.error('[RiskService] 更新止损设置失败:', error)
      throw error
    }
  }

  /**
   * 获取预警设置
   */
  async getAlertSettings(portfolioId?: string): Promise<AlertSettings> {
    try {
      console.log('[RiskService] 获取预警设置...')
      
      const response = await axios.get(`${this.baseURL}/alert-settings`, {
        params: { portfolioId }
      })

      if (response.data && response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data?.message || '获取预警设置失败')
      }
    } catch (error) {
      console.error('[RiskService] 获取预警设置失败:', error)
      
      // 返回默认设置
      return {
        varThreshold: 10.0,
        volatilityThreshold: 20.0,
        concentrationThreshold: 40.0,
        betaThreshold: 1.5,
        emailNotification: true,
        smsNotification: false,
        pushNotification: true,
        notificationFrequency: 'immediate'
      }
    }
  }

  /**
   * 更新预警设置
   */
  async updateAlertSettings(settings: AlertSettings, portfolioId?: string): Promise<boolean> {
    try {
      console.log('[RiskService] 更新预警设置...')
      
      const response = await axios.put(`${this.baseURL}/alert-settings`, {
        ...settings,
        portfolioId
      })

      return response.data && response.data.success
    } catch (error) {
      console.error('[RiskService] 更新预警设置失败:', error)
      throw error
    }
  }

  /**
   * 标记预警为已读
   */
  async markAlertAsRead(alertId: string): Promise<boolean> {
    try {
      const response = await axios.put(`${this.baseURL}/alerts/${alertId}/read`)
      return response.data && response.data.success
    } catch (error) {
      console.error('[RiskService] 标记预警失败:', error)
      throw error
    }
  }

  /**
   * 执行预警动作
   */
  async executeAlertAction(alertId: string, action: string, params?: any): Promise<boolean> {
    try {
      const response = await axios.post(`${this.baseURL}/alerts/${alertId}/action`, {
        action,
        params
      })
      return response.data && response.data.success
    } catch (error) {
      console.error('[RiskService] 执行预警动作失败:', error)
      throw error
    }
  }

  /**
   * 应用风险建议
   */
  async applyRecommendation(recommendationId: string, params?: any): Promise<boolean> {
    try {
      const response = await axios.post(`${this.baseURL}/recommendations/${recommendationId}/apply`, params)
      return response.data && response.data.success
    } catch (error) {
      console.error('[RiskService] 应用风险建议失败:', error)
      throw error
    }
  }

  /**
   * 导出风险报告
   */
  async exportRiskReport(portfolioId?: string, format: 'pdf' | 'excel' = 'pdf'): Promise<Blob> {
    try {
      const response = await axios.get(`${this.baseURL}/export-report`, {
        params: { portfolioId, format },
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      console.error('[RiskService] 导出风险报告失败:', error)
      throw error
    }
  }
}

// 创建并导出风险服务实例
export const riskService = new RiskService()
