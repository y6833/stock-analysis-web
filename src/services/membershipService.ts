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
  maxPortfolios: number
  maxPortfolioItems: number
  maxHistoryDays: number
  maxBacktestPeriod: number
  allowedIndicators: string[]
  allowExport: boolean
  allowBatchOperations: boolean
  allowCustomDashboard: boolean
  allowAdvancedCharts: boolean
  maxConcurrentRequests: number
}

export interface UserMembership extends MembershipLevel {
  effectiveLevel: string
  expired: boolean
  expiresAt: string | null
}

export const membershipService = {
  /**
   * 获取用户会员信息
   * @param forceRefresh 是否强制刷新，不使用缓存
   * @returns 用户会员信息
   */
  async getUserMembership(forceRefresh = false): Promise<UserMembership> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 构建请求URL，添加强制刷新参数
      const url = forceRefresh ? '/api/membership?forceRefresh=true' : '/api/membership'

      console.log(`[会员服务] 请求会员信息, URL: ${url}, 强制刷新: ${forceRefresh}`)

      // 获取授权头
      const headers = getAuthHeaders()
      console.log('[会员服务] 授权头:', headers)

      // 发送请求
      const response = await axios.get(url, headers)

      // 检查响应
      if (!response.data || !response.data.data) {
        console.error('[会员服务] 会员信息API响应无效:', response)
        throw new Error('会员信息API响应无效')
      }

      console.log('[会员服务] 会员信息API响应:', response.data)

      // 检查会员信息是否有效
      const membershipData = response.data.data
      if (!membershipData.effectiveLevel) {
        console.error('[会员服务] 会员信息缺少effectiveLevel字段:', membershipData)
        throw new Error('会员信息缺少effectiveLevel字段')
      }

      // 如果是高级会员，特别标记
      if (['premium', 'enterprise'].includes(membershipData.effectiveLevel)) {
        console.log(`[会员服务] 用户是高级会员 (${membershipData.effectiveLevel})，应该有更多权限`)
      }

      // 缓存会员信息到localStorage
      try {
        localStorage.setItem('user_membership', JSON.stringify(membershipData))
        console.log('[会员服务] 会员信息已缓存到localStorage')
      } catch (cacheError) {
        console.error('[会员服务] 缓存会员信息失败:', cacheError)
      }

      return membershipData
    } catch (error: any) {
      console.error('[会员服务] 获取用户会员信息失败:', error)

      // 检查是否是网络错误
      if (
        error.message &&
        (error.message.includes('Network Error') || error.message.includes('timeout'))
      ) {
        console.warn('[会员服务] 网络错误，尝试再次请求...')

        try {
          // 再次尝试，使用不同的URL参数
          const retryUrl = forceRefresh ? '/api/membership' : '/api/membership?forceRefresh=true'
          const { getAuthHeaders } = await import('@/utils/auth')
          const response = await axios.get(retryUrl, getAuthHeaders())

          if (response.data && response.data.data) {
            console.log('[会员服务] 重试成功，会员信息:', response.data.data)
            return response.data.data
          }
        } catch (retryError) {
          console.error('[会员服务] 重试获取会员信息失败:', retryError)
        }
      }

      const { showToast } = useToast()
      showToast(`获取会员信息失败: ${error.response?.data?.message || error.message}`, 'error')

      // 返回默认的会员信息（根据后端API的实际响应）
      console.warn('[会员服务] 返回默认会员信息')

      // 尝试从localStorage获取缓存的会员信息
      try {
        const cachedMembership = localStorage.getItem('user_membership')
        if (cachedMembership) {
          const parsedMembership = JSON.parse(cachedMembership)
          console.log('[会员服务] 使用缓存的会员信息:', parsedMembership)
          return parsedMembership
        }
      } catch (cacheError) {
        console.error('[会员服务] 读取缓存会员信息失败:', cacheError)
      }

      // 如果没有缓存，返回默认的免费会员信息
      return {
        level: 'free',
        effectiveLevel: 'free',
        expired: false,
        expiresAt: null,
        name: '免费用户',
        description: '基础功能，有限的数据访问',
        features: [
          '基础股票行情查询',
          '基础技术指标 (MA、MACD)',
          '最近7天历史数据',
          '每日刷新次数限制',
          '单一数据源',
          '最多10支股票关注',
          '最多5个条件提醒',
          '基础K线图表',
        ],
        dataRefreshInterval: 60 * 60 * 1000, // 1小时
        maxWatchlistItems: 10,
        maxAlerts: 5,
        dataSourceLimit: 1,
        maxPortfolios: 1,
        maxPortfolioItems: 5,
        maxHistoryDays: 7,
        maxBacktestPeriod: 30,
        allowedIndicators: ['MA', 'MACD', 'VOL'],
        allowExport: false,
        allowBatchOperations: false,
        allowCustomDashboard: false,
        allowAdvancedCharts: false,
        maxConcurrentRequests: 2,
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
   * @param params 附加参数
   * @returns 是否有权限访问
   */
  async checkFeatureAccess(feature: string, params: Record<string, any> = {}): Promise<boolean> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 构建查询参数
      const queryParams = new URLSearchParams()
      queryParams.append('feature', feature)

      // 添加附加参数
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })

      const response = await axios.get(
        `/api/membership/check-access?${queryParams.toString()}`,
        getAuthHeaders()
      )
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
      enterprise: '企业版',
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
      day: 'numeric',
    })
  },

  /**
   * 更新用户会员等级（仅管理员）
   * @param data 更新数据
   * @returns 更新结果
   */
  async updateMembership(data: {
    userId: number | string
    level: string
    expiresAt: string | null
  }): Promise<any> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求时添加授权头
      const response = await axios.post('/api/membership/update', data, getAuthHeaders())
      return response.data
    } catch (error: any) {
      console.error('更新会员信息失败:', error)
      const { showToast } = useToast()
      showToast(`更新会员信息失败: ${error.response?.data?.message || error.message}`, 'error')
      throw error
    }
  },
}

export default membershipService
