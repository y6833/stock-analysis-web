/**
 * 提醒服务
 * 提供条件提醒相关的功能，包括创建、获取、更新和删除提醒
 */

import axios from 'axios'
import { getAuthHeaders } from '@/utils/auth'

const API_URL = '/api'

// 提醒类型
export type AlertType = 'price' | 'indicator' | 'pattern' | 'doji'

// 提醒条件
export type AlertCondition =
  | 'price_above'
  | 'price_below'
  | 'volume_above'
  | 'change_above'
  | 'change_below'

// 十字星形态类型
export type DojiPatternType = 'standard' | 'dragonfly' | 'gravestone' | 'longLegged' | 'any'

// 提醒对象
export interface Alert {
  id: number
  stockCode: string
  stockName: string
  alertType: AlertType
  condition: AlertCondition
  value: number
  message?: string
  isActive: boolean
  isTriggered: boolean
  lastTriggeredAt?: string
  createdAt: string
  updatedAt: string
  patternType?: DojiPatternType // 十字星形态类型
  additionalParams?: Record<string, any> // 额外参数
}

// 创建提醒请求
export interface CreateAlertRequest {
  stockCode: string
  stockName: string
  alertType: AlertType
  condition: AlertCondition
  value: number
  message?: string
}

// 更新提醒请求
export interface UpdateAlertRequest {
  isActive?: boolean
  value?: number
  message?: string
}

// 关注列表提醒对象
export interface WatchlistAlert {
  id: number
  watchlistId: string
  symbol: string
  stockName: string
  condition: AlertCondition
  value: number
  message?: string
  isActive: boolean
  isTriggered: boolean
  lastTriggeredAt?: string
  createdAt: string
  updatedAt: string
}

// 创建关注列表提醒请求
export interface CreateWatchlistAlertRequest {
  watchlistId: string
  symbol: string
  stockName: string
  condition: AlertCondition
  value: number
  message?: string
}

// 提醒服务
export const alertService = {
  /**
   * 获取用户的所有提醒
   * @returns 提醒列表
   */
  async getAlerts(): Promise<Alert[]> {
    try {
      const response = await axios.get(`${API_URL}/alerts`, getAuthHeaders())
      return response.data
    } catch (error) {
      console.error('获取提醒列表失败:', error)
      throw error
    }
  },

  /**
   * 创建新提醒
   * @param alert 提醒信息
   * @returns 创建的提醒
   */
  async createAlert(alert: CreateAlertRequest): Promise<Alert> {
    try {
      const response = await axios.post(`${API_URL}/alerts`, alert, getAuthHeaders())
      return response.data
    } catch (error) {
      console.error('创建提醒失败:', error)
      throw error
    }
  },

  /**
   * 更新提醒
   * @param id 提醒ID
   * @param data 更新数据
   * @returns 更新后的提醒
   */
  async updateAlert(id: number, data: UpdateAlertRequest): Promise<Alert> {
    try {
      const response = await axios.patch(`${API_URL}/alerts/${id}`, data, getAuthHeaders())
      return response.data
    } catch (error) {
      console.error(`更新提醒 ${id} 失败:`, error)
      throw error
    }
  },

  /**
   * 删除提醒
   * @param id 提醒ID
   * @returns 是否成功
   */
  async deleteAlert(id: number): Promise<boolean> {
    try {
      await axios.delete(`${API_URL}/alerts/${id}`, getAuthHeaders())
      return true
    } catch (error) {
      console.error(`删除提醒 ${id} 失败:`, error)
      throw error
    }
  },

  /**
   * 切换提醒状态
   * @param id 提醒ID
   * @param isActive 是否激活
   * @returns 更新后的提醒
   */
  async toggleAlertStatus(id: number, isActive: boolean): Promise<Alert> {
    return this.updateAlert(id, { isActive })
  },

  /**
   * 获取关注列表的提醒
   * @param watchlistId 关注列表ID
   * @returns 提醒列表
   */
  async getWatchlistAlerts(watchlistId: string): Promise<WatchlistAlert[]> {
    try {
      const response = await axios.get(
        `${API_URL}/watchlist-alerts?watchlistId=${watchlistId}`,
        getAuthHeaders()
      )
      return response.data
    } catch (error) {
      console.error('获取关注列表提醒失败:', error)
      throw error
    }
  },

  /**
   * 添加提醒到关注列表
   * @param alert 提醒信息
   * @returns 创建的提醒
   */
  async addWatchlistAlert(alert: CreateWatchlistAlertRequest): Promise<WatchlistAlert> {
    try {
      const response = await axios.post(`${API_URL}/watchlist-alerts`, alert, getAuthHeaders())
      return response.data
    } catch (error) {
      console.error('添加关注列表提醒失败:', error)
      throw error
    }
  },

  /**
   * 删除关注列表中的提醒
   * @param watchlistId 关注列表ID
   * @param alertId 提醒ID
   * @returns 是否成功
   */
  async removeWatchlistAlert(watchlistId: string, alertId: number): Promise<boolean> {
    try {
      await axios.delete(`${API_URL}/watchlist-alerts/${watchlistId}/${alertId}`, getAuthHeaders())
      return true
    } catch (error) {
      console.error(`删除关注列表提醒 ${alertId} 失败:`, error)
      throw error
    }
  },
}

export default alertService
