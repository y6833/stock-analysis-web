/**
 * 提醒状态管理
 * 管理提醒数据和状态
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { alertService, type Alert, type AlertType } from '@/services/alertService'

export const useAlertStore = defineStore('alert', () => {
    // 状态
    const alerts = ref<Alert[]>([])
    const alertHistories = ref<any[]>([])
    const loading = ref(false)
    const historyLoading = ref(false)
    const error = ref<string | null>(null)

    // 计算属性
    const activeAlerts = computed(() => alerts.value.filter(alert => alert.isActive))
    const triggeredAlerts = computed(() => alerts.value.filter(alert => alert.isTriggered))
    const alertsByType = computed(() => {
        const result: Record<AlertType, Alert[]> = {
            price: [],
            indicator: [],
            pattern: [],
            doji: []
        }

        alerts.value.forEach(alert => {
            if (result[alert.alertType]) {
                result[alert.alertType].push(alert)
            }
        })

        return result
    })

    const unreadHistoryCount = computed(() => {
        return alertHistories.value.filter(history => !history.isRead).length
    })

    // 操作
    async function fetchAlerts() {
        loading.value = true
        error.value = null

        try {
            alerts.value = await alertService.getAlerts()
        } catch (err: any) {
            error.value = err.message || '获取提醒列表失败'
            console.error('获取提醒列表失败:', err)
        } finally {
            loading.value = false
        }
    }

    async function createAlert(alertData: any) {
        loading.value = true
        error.value = null

        try {
            const newAlert = await alertService.createAlert(alertData)
            alerts.value.unshift(newAlert)
            return newAlert
        } catch (err: any) {
            error.value = err.message || '创建提醒失败'
            console.error('创建提醒失败:', err)
            throw err
        } finally {
            loading.value = false
        }
    }

    async function updateAlert(id: number, data: any) {
        loading.value = true
        error.value = null

        try {
            const updatedAlert = await alertService.updateAlert(id, data)
            const index = alerts.value.findIndex(alert => alert.id === id)
            if (index !== -1) {
                alerts.value[index] = updatedAlert
            }
            return updatedAlert
        } catch (err: any) {
            error.value = err.message || '更新提醒失败'
            console.error(`更新提醒 ${id} 失败:`, err)
            throw err
        } finally {
            loading.value = false
        }
    }

    async function deleteAlert(id: number) {
        loading.value = true
        error.value = null

        try {
            await alertService.deleteAlert(id)
            alerts.value = alerts.value.filter(alert => alert.id !== id)
            return true
        } catch (err: any) {
            error.value = err.message || '删除提醒失败'
            console.error(`删除提醒 ${id} 失败:`, err)
            throw err
        } finally {
            loading.value = false
        }
    }

    async function toggleAlertStatus(id: number, isActive: boolean) {
        return updateAlert(id, { isActive })
    }

    async function fetchAlertHistory(alertId: number) {
        historyLoading.value = true
        error.value = null

        try {
            alertHistories.value = await alertService.getAlertHistory(alertId)
            return alertHistories.value
        } catch (err: any) {
            error.value = err.message || '获取提醒历史失败'
            console.error(`获取提醒 ${alertId} 历史失败:`, err)
            throw err
        } finally {
            historyLoading.value = false
        }
    }

    async function markHistoryAsRead(historyId: number) {
        try {
            const success = await alertService.markHistoryAsRead(historyId)
            if (success) {
                const index = alertHistories.value.findIndex(history => history.id === historyId)
                if (index !== -1) {
                    alertHistories.value[index].isRead = true
                }
            }
            return success
        } catch (err: any) {
            console.error(`标记历史记录 ${historyId} 为已读失败:`, err)
            throw err
        }
    }

    async function markAllHistoryAsRead(alertId: number) {
        try {
            const success = await alertService.markAllHistoryAsRead(alertId)
            if (success) {
                alertHistories.value = alertHistories.value.map(history => ({
                    ...history,
                    isRead: true
                }))
            }
            return success
        } catch (err: any) {
            console.error(`标记所有历史记录为已读失败:`, err)
            throw err
        }
    }

    async function fetchAlertStatistics() {
        try {
            return await alertService.getAlertStatistics()
        } catch (err: any) {
            console.error('获取提醒统计数据失败:', err)
            throw err
        }
    }

    return {
        // 状态
        alerts,
        alertHistories,
        loading,
        historyLoading,
        error,

        // 计算属性
        activeAlerts,
        triggeredAlerts,
        alertsByType,
        unreadHistoryCount,

        // 操作
        fetchAlerts,
        createAlert,
        updateAlert,
        deleteAlert,
        toggleAlertStatus,
        fetchAlertHistory,
        markHistoryAsRead,
        markAllHistoryAsRead,
        fetchAlertStatistics
    }
})