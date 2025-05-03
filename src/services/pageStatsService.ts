/**
 * 页面统计服务
 * 处理页面统计相关的API交互
 */

import axios from 'axios'
import { useToast } from '@/composables/useToast'

export interface PageAccessLog {
  id: number
  pageId: number
  userId?: number
  path: string
  membershipLevel: string
  ipAddress?: string
  userAgent?: string
  referrer?: string
  hasAccess: boolean
  accessResult: string
  duration?: number
  createdAt: string
  updatedAt: string
  page?: {
    id: number
    name: string
    path: string
  }
  user?: {
    id: number
    username: string
    email: string
  }
}

export interface PageAccessStat {
  id: number
  pageId: number
  userId?: number
  membershipLevel: string
  accessCount: number
  totalDuration: number
  lastAccessAt: string
  createdAt: string
  updatedAt: string
  page?: {
    id: number
    name: string
    path: string
  }
  user?: {
    id: number
    username: string
    email: string
  }
}

export interface PageAccessSummary {
  totalVisits: number
  todayVisits: number
  yesterdayVisits: number
  thisWeekVisits: number
  thisMonthVisits: number
  topPages: Array<{
    pageId: number
    totalVisits: number
    page: {
      id: number
      name: string
      path: string
    }
  }>
  topUsers: Array<{
    userId: number
    totalVisits: number
    user: {
      id: number
      username: string
      email: string
    }
  }>
  membershipDistribution: Array<{
    membershipLevel: string
    count: number
  }>
  accessResultDistribution: Array<{
    accessResult: string
    count: number
  }>
}

export const pageStatsService = {
  /**
   * 获取页面访问统计摘要
   * @param options 查询选项
   * @returns 统计摘要
   */
  async getPageAccessSummary(options: {
    startDate?: Date
    endDate?: Date
  } = {}): Promise<PageAccessSummary | null> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 构建查询参数
      const params = new URLSearchParams()
      if (options.startDate) {
        params.append('startDate', options.startDate.toISOString())
      }
      if (options.endDate) {
        params.append('endDate', options.endDate.toISOString())
      }

      // 发送请求
      const response = await axios.get(`/api/page-stats/summary?${params.toString()}`, getAuthHeaders())
      return response.data.data
    } catch (error: any) {
      console.error('获取页面访问统计摘要失败:', error)
      const { showToast } = useToast()
      showToast(`获取页面访问统计摘要失败: ${error.response?.data?.message || error.message}`, 'error')
      return null
    }
  },

  /**
   * 获取页面访问统计
   * @param options 查询选项
   * @returns 统计数据
   */
  async getPageAccessStats(options: {
    pageId?: number
    userId?: number
    startDate?: Date
    endDate?: Date
    limit?: number
  } = {}): Promise<PageAccessStat[]> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 构建查询参数
      const params = new URLSearchParams()
      if (options.pageId) {
        params.append('pageId', options.pageId.toString())
      }
      if (options.userId) {
        params.append('userId', options.userId.toString())
      }
      if (options.startDate) {
        params.append('startDate', options.startDate.toISOString())
      }
      if (options.endDate) {
        params.append('endDate', options.endDate.toISOString())
      }
      if (options.limit) {
        params.append('limit', options.limit.toString())
      }

      // 发送请求
      const response = await axios.get(`/api/page-stats/stats?${params.toString()}`, getAuthHeaders())
      return response.data.data
    } catch (error: any) {
      console.error('获取页面访问统计失败:', error)
      const { showToast } = useToast()
      showToast(`获取页面访问统计失败: ${error.response?.data?.message || error.message}`, 'error')
      return []
    }
  },

  /**
   * 获取页面访问日志
   * @param options 查询选项
   * @returns 分页日志数据
   */
  async getPageAccessLogs(options: {
    pageId?: number
    userId?: number
    path?: string
    membershipLevel?: string
    hasAccess?: boolean
    accessResult?: string
    startDate?: Date
    endDate?: Date
    page?: number
    pageSize?: number
  } = {}): Promise<{ total: number; page: number; pageSize: number; list: PageAccessLog[] }> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 构建查询参数
      const params = new URLSearchParams()
      if (options.pageId) {
        params.append('pageId', options.pageId.toString())
      }
      if (options.userId) {
        params.append('userId', options.userId.toString())
      }
      if (options.path) {
        params.append('path', options.path)
      }
      if (options.membershipLevel) {
        params.append('membershipLevel', options.membershipLevel)
      }
      if (options.hasAccess !== undefined) {
        params.append('hasAccess', options.hasAccess.toString())
      }
      if (options.accessResult) {
        params.append('accessResult', options.accessResult)
      }
      if (options.startDate) {
        params.append('startDate', options.startDate.toISOString())
      }
      if (options.endDate) {
        params.append('endDate', options.endDate.toISOString())
      }
      if (options.page) {
        params.append('page', options.page.toString())
      }
      if (options.pageSize) {
        params.append('pageSize', options.pageSize.toString())
      }

      // 发送请求
      const response = await axios.get(`/api/page-stats/logs?${params.toString()}`, getAuthHeaders())
      return response.data.data
    } catch (error: any) {
      console.error('获取页面访问日志失败:', error)
      const { showToast } = useToast()
      showToast(`获取页面访问日志失败: ${error.response?.data?.message || error.message}`, 'error')
      return { total: 0, page: 1, pageSize: 20, list: [] }
    }
  },

  /**
   * 记录页面访问
   * @param data 访问数据
   * @returns 创建的日志ID
   */
  async logPageAccess(data: {
    pageId: number
    userId?: number
    path: string
    membershipLevel: string
    ipAddress?: string
    userAgent?: string
    referrer?: string
    hasAccess: boolean
    accessResult: string
  }): Promise<number | null> {
    try {
      // 发送请求
      const response = await axios.post('/api/page-stats/log', data)
      return response.data.data?.id || null
    } catch (error: any) {
      console.error('记录页面访问失败:', error)
      return null
    }
  },

  /**
   * 更新页面停留时间
   * @param logId 日志ID
   * @param duration 停留时间（秒）
   * @returns 是否成功
   */
  async updatePageDuration(logId: number, duration: number): Promise<boolean> {
    try {
      // 发送请求
      const response = await axios.post('/api/page-stats/duration', { logId, duration })
      return response.data.success
    } catch (error: any) {
      console.error('更新页面停留时间失败:', error)
      return false
    }
  },
}

export default pageStatsService
