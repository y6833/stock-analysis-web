/**
 * 十字星形态提醒服务
 * 提供十字星形态提醒相关的功能，包括创建、获取、更新和删除提醒
 */

import axios from 'axios'
import { getAuthHeaders } from '@/utils/auth'
import type { DojiPatternType } from './alertService'

const API_URL = '/api'

// 十字星提醒条件
export type DojiAlertCondition = 'pattern_appears' | 'pattern_with_volume' | 'pattern_near_support' | 'pattern_near_resistance'

// 十字星提醒优先级
export type DojiAlertPriority = 'high' | 'medium' | 'low'

// 十字星提醒对象
export interface DojiPatternAlert {
    id: number
    stockCode: string
    stockName: string
    patternType: DojiPatternType
    condition: DojiAlertCondition
    priority: DojiAlertPriority
    message?: string
    isActive: boolean
    isTriggered: boolean
    lastTriggeredAt?: string
    createdAt: string
    updatedAt: string
    additionalParams?: {
        minSignificance?: number // 最小显著性
        volumeChangePercent?: number // 成交量变化百分比
        checkInterval?: number // 检查间隔（分钟）
    }
}

// 创建十字星提醒请求
export interface CreateDojiPatternAlertRequest {
    stockCode: string
    stockName: string
    patternType: DojiPatternType
    condition: DojiAlertCondition
    priority: DojiAlertPriority
    message?: string
    additionalParams?: {
        minSignificance?: number
        volumeChangePercent?: number
        checkInterval?: number
    }
}

// 更新十字星提醒请求
export interface UpdateDojiPatternAlertRequest {
    patternType?: DojiPatternType
    condition?: DojiAlertCondition
    priority?: DojiAlertPriority
    isActive?: boolean
    message?: string
    additionalParams?: {
        minSignificance?: number
        volumeChangePercent?: number
        checkInterval?: number
    }
}

/**
 * 十字星形态提醒服务
 */
export const dojiPatternAlertService = {
    /**
     * 获取用户的所有十字星形态提醒
     * @returns 提醒列表
     */
    async getDojiPatternAlerts(): Promise<DojiPatternAlert[]> {
        try {
            const response = await axios.get(`${API_URL}/doji-alerts`, getAuthHeaders())
            return response.data
        } catch (error) {
            console.error('获取十字星形态提醒列表失败:', error)
            throw error
        }
    },

    /**
     * 创建新的十字星形态提醒
     * @param alert 提醒信息
     * @returns 创建的提醒
     */
    async createDojiPatternAlert(alert: CreateDojiPatternAlertRequest): Promise<DojiPatternAlert> {
        try {
            const response = await axios.post(`${API_URL}/doji-alerts`, alert, getAuthHeaders())
            return response.data
        } catch (error) {
            console.error('创建十字星形态提醒失败:', error)
            throw error
        }
    },

    /**
     * 更新十字星形态提醒
     * @param id 提醒ID
     * @param data 更新数据
     * @returns 更新后的提醒
     */
    async updateDojiPatternAlert(id: number, data: UpdateDojiPatternAlertRequest): Promise<DojiPatternAlert> {
        try {
            const response = await axios.patch(`${API_URL}/doji-alerts/${id}`, data, getAuthHeaders())
            return response.data
        } catch (error) {
            console.error(`更新十字星形态提醒 ${id} 失败:`, error)
            throw error
        }
    },

    /**
     * 删除十字星形态提醒
     * @param id 提醒ID
     * @returns 是否成功
     */
    async deleteDojiPatternAlert(id: number): Promise<boolean> {
        try {
            await axios.delete(`${API_URL}/doji-alerts/${id}`, getAuthHeaders())
            return true
        } catch (error) {
            console.error(`删除十字星形态提醒 ${id} 失败:`, error)
            throw error
        }
    },

    /**
     * 切换十字星形态提醒状态
     * @param id 提醒ID
     * @param isActive 是否激活
     * @returns 更新后的提醒
     */
    async toggleDojiPatternAlertStatus(id: number, isActive: boolean): Promise<DojiPatternAlert> {
        return this.updateDojiPatternAlert(id, { isActive })
    },

    /**
     * 获取特定股票的十字星形态提醒
     * @param stockCode 股票代码
     * @returns 提醒列表
     */
    async getDojiPatternAlertsByStock(stockCode: string): Promise<DojiPatternAlert[]> {
        try {
            const response = await axios.get(
                `${API_URL}/doji-alerts/stock/${stockCode}`,
                getAuthHeaders()
            )
            return response.data
        } catch (error) {
            console.error(`获取股票 ${stockCode} 的十字星形态提醒失败:`, error)
            throw error
        }
    },

    /**
     * 测试十字星形态提醒
     * @param alert 提醒信息
     * @returns 测试结果
     */
    async testDojiPatternAlert(alert: CreateDojiPatternAlertRequest): Promise<{
        success: boolean
        message: string
        matchedPatterns?: any[]
    }> {
        try {
            const response = await axios.post(
                `${API_URL}/doji-alerts/test`,
                alert,
                getAuthHeaders()
            )
            return response.data
        } catch (error) {
            console.error('测试十字星形态提醒失败:', error)
            throw error
        }
    },

    /**
     * 获取十字星形态提醒历史记录
     * @param alertId 提醒ID
     * @param options 查询选项
     * @returns 历史记录列表
     */
    async getDojiPatternAlertHistory(
        alertId: number,
        options: { page?: number; pageSize?: number } = {}
    ): Promise<{
        history: Array<{
            id: number
            alertId: number
            triggeredAt: string
            patternDetails: any
        }>
        total: number
    }> {
        try {
            const params = new URLSearchParams()
            if (options.page) params.append('page', options.page.toString())
            if (options.pageSize) params.append('pageSize', options.pageSize.toString())

            const response = await axios.get(
                `${API_URL}/doji-alerts/${alertId}/history?${params.toString()}`,
                getAuthHeaders()
            )
            return response.data
        } catch (error) {
            console.error(`获取十字星形态提醒 ${alertId} 的历史记录失败:`, error)
            throw error
        }
    }
}

export default dojiPatternAlertService