/**
 * 缓存统计服务
 * 处理缓存统计相关的功能
 */

import axios from 'axios'
import { getAuthHeaders } from '@/utils/auth'

// API基础URL
const API_URL = '/api'

// 缓存统计信息接口
export interface CacheStats {
  success: boolean
  hits: number
  misses: number
  requests: number
  apiCalls: number
  errors: number
  hitRate: string
  lastReset: string
  dataSource?: string
  sourceStats?: {
    hits: number
    misses: number
    requests: number
    apiCalls: number
    errors: number
    hitRate: string
  }
  apiStats?: Record<string, {
    hits: number
    misses: number
    requests: number
    apiCalls: number
    errors: number
    hitRate: string
    lastAccess: string
    lastError?: {
      message: string
      time: string
    }
  }>
  dataSourceStats?: Record<string, {
    hits: number
    misses: number
    requests: number
    apiCalls: number
    errors: number
  }>
  error?: string
}

// 重置结果接口
export interface ResetResult {
  success: boolean
  message: string
  dataSource?: string
  resetTime: string
  error?: string
}

// 缓存统计服务
export const cacheStatsService = {
  /**
   * 获取缓存统计信息
   * @param dataSource 数据源名称
   */
  async getStats(dataSource?: string): Promise<CacheStats> {
    try {
      const url = dataSource 
        ? `${API_URL}/cache-stats?dataSource=${dataSource}`
        : `${API_URL}/cache-stats`
      
      const response = await axios.get(url, getAuthHeaders())
      return response.data
    } catch (error: any) {
      console.error('获取缓存统计信息失败:', error)
      throw new Error(error.response?.data?.message || '获取缓存统计信息失败')
    }
  },

  /**
   * 重置缓存统计信息
   * @param dataSource 数据源名称
   */
  async resetStats(dataSource?: string): Promise<ResetResult> {
    try {
      const response = await axios.post(
        `${API_URL}/cache-stats/reset`,
        { dataSource },
        getAuthHeaders()
      )
      return response.data
    } catch (error: any) {
      console.error('重置缓存统计信息失败:', error)
      throw new Error(error.response?.data?.message || '重置缓存统计信息失败')
    }
  },

  /**
   * 格式化命中率
   * @param hitRate 命中率字符串
   */
  formatHitRate(hitRate: string): string {
    // 移除百分号并转换为数字
    const rate = parseFloat(hitRate.replace('%', ''))
    
    // 根据命中率返回不同的颜色类名
    if (rate >= 90) return 'excellent'
    if (rate >= 70) return 'good'
    if (rate >= 50) return 'average'
    if (rate >= 30) return 'poor'
    return 'critical'
  },

  /**
   * 格式化日期
   * @param dateString 日期字符串
   */
  formatDate(dateString: string): string {
    if (!dateString) return '未知'

    try {
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch (e) {
      return dateString
    }
  },

  /**
   * 计算时间差
   * @param dateString 日期字符串
   */
  getTimeDiff(dateString: string): string {
    if (!dateString) return '未知'

    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      
      // 转换为秒
      const diffSec = Math.floor(diffMs / 1000)
      
      if (diffSec < 60) {
        return `${diffSec}秒前`
      }
      
      // 转换为分钟
      const diffMin = Math.floor(diffSec / 60)
      
      if (diffMin < 60) {
        return `${diffMin}分钟前`
      }
      
      // 转换为小时
      const diffHour = Math.floor(diffMin / 60)
      
      if (diffHour < 24) {
        return `${diffHour}小时前`
      }
      
      // 转换为天
      const diffDay = Math.floor(diffHour / 24)
      
      if (diffDay < 30) {
        return `${diffDay}天前`
      }
      
      // 转换为月
      const diffMonth = Math.floor(diffDay / 30)
      
      if (diffMonth < 12) {
        return `${diffMonth}个月前`
      }
      
      // 转换为年
      const diffYear = Math.floor(diffMonth / 12)
      
      return `${diffYear}年前`
    } catch (e) {
      return '未知'
    }
  }
}
