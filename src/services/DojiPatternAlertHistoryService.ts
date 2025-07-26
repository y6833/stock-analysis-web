import apiService from './apiService'
import type { DojiPatternAlertHistory, AlertHistoryQueryParams } from '@/types/alerts'

export interface DojiPatternAlertHistoryService {
    getAlertHistory(params: AlertHistoryQueryParams): Promise<{
        data: DojiPatternAlertHistory[]
        total: number
        page: number
        pageSize: number
    }>

    getAlertHistoryByAlertId(alertId: number, params: AlertHistoryQueryParams): Promise<{
        data: DojiPatternAlertHistory[]
        total: number
        page: number
        pageSize: number
    }>

    getAlertHistoryByStock(stockCode: string, params: AlertHistoryQueryParams): Promise<{
        data: DojiPatternAlertHistory[]
        total: number
        page: number
        pageSize: number
    }>

    acknowledgeAlertHistory(historyId: number): Promise<void>

    bulkAcknowledgeAlertHistory(historyIds: number[]): Promise<{ count: number }>

    deleteAlertHistory(historyId: number): Promise<void>
}

class DojiPatternAlertHistoryServiceImpl implements DojiPatternAlertHistoryService {
    async getAlertHistory(params: AlertHistoryQueryParams) {
        const response = await apiService.get('/doji-pattern-alert-history', { params })
        return response.data
    }

    async getAlertHistoryByAlertId(alertId: number, params: AlertHistoryQueryParams) {
        const response = await apiService.get(`/doji-pattern-alert-history/alert/${alertId}`, { params })
        return response.data
    }

    async getAlertHistoryByStock(stockCode: string, params: AlertHistoryQueryParams) {
        const response = await apiService.get(`/doji-pattern-alert-history/stock/${stockCode}`, { params })
        return response.data
    }

    async acknowledgeAlertHistory(historyId: number) {
        await apiService.put(`/doji-pattern-alert-history/${historyId}/acknowledge`, {})
    }

    async bulkAcknowledgeAlertHistory(historyIds: number[]) {
        const response = await apiService.put('/doji-pattern-alert-history/bulk-acknowledge', {
            historyIds
        })
        return response.data
    }

    async deleteAlertHistory(historyId: number) {
        await apiService.delete(`/doji-pattern-alert-history/${historyId}`)
    }
}

const dojiPatternAlertHistoryService = new DojiPatternAlertHistoryServiceImpl()

export default dojiPatternAlertHistoryService