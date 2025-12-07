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
          
          // 使用后端实际存在的API
          const response = await axios.get(`${this.baseURL}/dashboard`, {
            params: { portfolioId }
          })

          if (response.data && response.data.success) {
            const dashboardData = response.data.data
            
            // 转换后端数据格式为前端需要的格式
            // 后端返回的是dashboard格式，需要转换为RiskData格式
            if (dashboardData.summary) {
              const avgVar = dashboardData.summary.avgVarPercentage || 0
              return {
                overallScore: Math.min(100, avgVar * 10), // 将VaR百分比转换为0-100的分数
                overallLevel: avgVar > 5 ? 'high' : 
                              avgVar > 3 ? 'medium' : 'low',
                scoreTrend: 'stable' as const,
                var: avgVar,
                varChange: 0,
                volatility: 0, // 需要从其他API获取
                volatilityChange: 0,
                concentration: 0, // 需要从其他API获取
                concentrationChange: 0,
                beta: 0, // 需要从其他API获取
                betaChange: 0,
                lastUpdated: new Date()
              }
            } else {
              throw new Error('风险仪表盘数据格式不正确')
            }
          } else {
            throw new Error(response.data?.message || '获取风险数据失败')
          }
        } catch (error) {
          console.error('[RiskService] 获取风险概览失败:', error)
          
          // 不再返回假数据，抛出错误让调用方处理
          throw new Error(`获取风险概览失败: ${error instanceof Error ? error.message : '未知错误'}`)
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
          
          // 不再返回假数据，返回空数组
          return []
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
          
          // 后端没有专门的recommendations API，使用dashboard API获取数据
          // 或者返回空数组，让前端显示空状态
          throw new Error('风险建议API暂不可用')

          if (response.data && response.data.success) {
            return response.data.data
          } else {
            throw new Error(response.data?.message || '获取风险建议失败')
          }
        } catch (error) {
          console.error('[RiskService] 获取风险建议失败:', error)
          
          // 不再返回假数据，返回空数组
          return []
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
