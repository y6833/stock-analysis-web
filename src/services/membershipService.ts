/**
 * 会员服务
 * 处理会员相关功能和API交互
 */

import axios from 'axios'
import { useToast } from '@/composables/useToast'

export interface MembershipLevel {
  level: string
  name: string
  description: string
  features: string[]
  dataRefreshInterval: number
  maxWatchlistItems: number
  maxAlerts: number
  dataSourceLimit: number
}

export interface UserMembership extends MembershipLevel {
  effectiveLevel: string
  expired: boolean
  expiresAt: string | null
}

export const membershipService = {
  /**
   * 获取用户会员信息
   * @returns 用户会员信息
   */
  async getUserMembership(): Promise<UserMembership> {
    try {
      const response = await axios.get('/api/membership')
      return response.data.data
    } catch (error: any) {
      console.error('获取用户会员信息失败:', error)
      const { showToast } = useToast()
      showToast(`获取会员信息失败: ${error.response?.data?.message || error.message}`, 'error')
      
      // 返回默认的免费会员信息
      return {
        level: 'free',
        effectiveLevel: 'free',
        expired: false,
        expiresAt: null,
        name: '免费用户',
        description: '基础功能，有限的数据访问',
        features: [
          '基础股票行情查询',
          '基础技术指标',
          '有限的历史数据',
          '每日刷新次数限制',
          '单一数据源'
        ],
        dataRefreshInterval: 60 * 60 * 1000, // 1小时
        maxWatchlistItems: 10,
        maxAlerts: 5,
        dataSourceLimit: 1
      }
    }
  },
  
  /**
   * 获取会员等级列表
   * @returns 会员等级列表
   */
  async getMembershipLevels(): Promise<MembershipLevel[]> {
    try {
      const response = await axios.get('/api/membership/levels')
      return response.data.data
    } catch (error: any) {
      console.error('获取会员等级列表失败:', error)
      const { showToast } = useToast()
      showToast(`获取会员等级列表失败: ${error.response?.data?.message || error.message}`, 'error')
      return []
    }
  },
  
  /**
   * 检查功能访问权限
   * @param feature 功能名称
   * @returns 是否有权限访问
   */
  async checkFeatureAccess(feature: string): Promise<boolean> {
    try {
      const response = await axios.get(`/api/membership/check-access?feature=${feature}`)
      return response.data.hasAccess
    } catch (error: any) {
      console.error(`检查功能 ${feature} 访问权限失败:`, error)
      // 默认拒绝访问
      return false
    }
  },
  
  /**
   * 获取会员等级名称
   * @param level 会员等级代码
   * @returns 会员等级名称
   */
  getMembershipLevelName(level: string): string {
    const levelNames: Record<string, string> = {
      free: '免费用户',
      basic: '基础会员',
      premium: '高级会员',
      enterprise: '企业版'
    }
    
    return levelNames[level] || '未知等级'
  },
  
  /**
   * 格式化过期时间
   * @param expiresAt 过期时间字符串
   * @returns 格式化后的过期时间
   */
  formatExpiryDate(expiresAt: string | null): string {
    if (!expiresAt) return '永久有效'
    
    const date = new Date(expiresAt)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
}

export default membershipService
