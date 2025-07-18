/**
 * 十字星形态提醒相关类型定义
 */

import type { DojiPatternType } from '../services/alertService'

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

// 十字星提醒历史记录
export interface DojiPatternAlertHistory {
    id: number
    alertId: number
    alert?: DojiPatternAlert
    triggeredAt: string
    patternDetails: any
    acknowledged: boolean
    acknowledgedAt?: string
}

// 十字星提醒历史统计
export interface DojiPatternAlertStats {
    totalAlerts: number
    activeAlerts: number
    triggeredToday: number
    triggeredThisWeek: number
    triggeredThisMonth: number
    byPriority: {
        high: number
        medium: number
        low: number
    }
    byPatternType: Record<DojiPatternType, number>
    byStock: Array<{
        stockCode: string
        stockName: string
        count: number
    }>
}

// 十字星提醒历史查询参数
export interface AlertHistoryQueryParams {
    page?: number
    pageSize?: number
    startDate?: string
    endDate?: string
    stockCode?: string
    patternType?: DojiPatternType
    acknowledged?: boolean
    sortBy?: 'triggeredAt' | 'stockCode' | 'patternType'
    sortDirection?: 'asc' | 'desc'
}

// 十字星提醒历史分页结果
export interface AlertHistoryPaginatedResult {
    history: DojiPatternAlertHistory[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}