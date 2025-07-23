/**
 * 优化后的提醒状态管理
 * 重构原alertStore，提供更好的状态管理和缓存策略
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { alertService, type Alert, type AlertType } from '@/services/alertService'
import { createBaseStore, createPaginationState, createSearchState } from '@/stores/core/baseStore'
import { useAuthStore } from '@/stores/user/authStore'

export interface AlertFilters {
    type?: AlertType
    isActive?: boolean
    isTriggered?: boolean
    symbol?: string
}

export const useAlertStore = defineStore('alert', () => {
    // 使用基础Store功能
    const baseStore = createBaseStore({
        name: 'alert',
        cache: {
            enabled: true,
            ttl: 1 * 60 * 1000, // 1分钟缓存
            key: 'alerts'
        }
    })()

    // 使用分页和搜索状态
    const pagination = createPaginationState()
    const search = createSearchState()

    // 提醒状态
    const alerts = ref<Alert[]>([])
    const alertsMap = ref<Map<number, Alert>>(new Map())
    const alertHistories = ref<Map<number, any[]>>(new Map())
    const statistics = ref<any>(null)

    // 计算属性
    const activeAlerts = computed(() =>
        alerts.value.filter(alert => alert.isActive)
    )

    const triggeredAlerts = computed(() =>
        alerts.value.filter(alert => alert.isTriggered)
    )

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

    const filteredAlerts = computed(() => {
        let result = alerts.value

        // 应用搜索过滤
        if (search.query.value) {
            const query = search.query.value.toLowerCase()
            result = result.filter(alert =>
                alert.name?.toLowerCase().includes(query) ||
                alert.symbol?.toLowerCase().includes(query) ||
                alert.description?.toLowerCase().includes(query)
            )
        }

        // 应用过滤器
        Object.entries(search.filters.value).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                result = result.filter(alert => {
                    switch (key) {
                        case 'type':
                            return alert.alertType === value
                        case 'isActive':
                            return alert.isActive === value
                        case 'isTriggered':
                            return alert.isTriggered === value
                        case 'symbol':
                            return alert.symbol?.toLowerCase().includes(value.toLowerCase())
                        default:
                            return true
                    }
                })
            }
        })

        // 应用排序
        if (search.sortBy.value) {
            result.sort((a, b) => {
                const aValue = (a as any)[search.sortBy.value]
                const bValue = (b as any)[search.sortBy.value]

                if (aValue < bValue) return search.sortOrder.value === 'asc' ? -1 : 1
                if (aValue > bValue) return search.sortOrder.value === 'asc' ? 1 : -1
                return 0
            })
        }

        return result
    })

    const paginatedAlerts = computed(() => {
        const start = (pagination.currentPage.value - 1) * pagination.pageSize.value
        const end = start + pagination.pageSize.value
        return filteredAlerts.value.slice(start, end)
    })

    const unreadHistoryCount = computed(() => {
        let count = 0
        alertHistories.value.forEach(histories => {
            count += histories.filter(history => !history.isRead).length
        })
        return count
    })

    // 获取提醒列表
    async function fetchAlerts(options?: {
        forceRefresh?: boolean
        page?: number
        pageSize?: number
        filters?: AlertFilters
    }) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        const { forceRefresh = false, page, pageSize, filters } = options || {}

        if (page) pagination.setPage(page)
        if (pageSize) pagination.setPageSize(pageSize)
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                search.setFilter(key, value)
            })
        }

        return await baseStore.executeAsync(async () => {
            const result = await alertService.getAlerts({
                page: pagination.currentPage.value,
                pageSize: pagination.pageSize.value,
                filters: search.filters.value
            })

            alerts.value = result.data || result
            pagination.setTotal(result.total || alerts.value.length)

            // 更新提醒映射
            alerts.value.forEach(alert => {
                alertsMap.value.set(alert.id, alert)
            })

            return alerts.value
        }, {
            cacheKey: `alerts_${pagination.currentPage.value}_${JSON.stringify(search.filters.value)}`,
            skipCache: forceRefresh,
            onError: (error) => {
                console.error('获取提醒列表失败:', error)
            }
        })
    }

    // 创建提醒
    async function createAlert(alertData: any) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            const newAlert = await alertService.createAlert(alertData)

            // 添加到列表开头
            alerts.value.unshift(newAlert)
            alertsMap.value.set(newAlert.id, newAlert)

            return newAlert
        }, {
            onSuccess: () => {
                // 清除缓存，确保下次获取最新数据
                baseStore.clearCache()
            },
            onError: (error) => {
                console.error('创建提醒失败:', error)
            }
        })
    }

    // 更新提醒
    async function updateAlert(id: number, data: any) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            const updatedAlert = await alertService.updateAlert(id, data)

            // 更新本地状态
            const index = alerts.value.findIndex(alert => alert.id === id)
            if (index !== -1) {
                alerts.value[index] = updatedAlert
            }
            alertsMap.value.set(id, updatedAlert)

            return updatedAlert
        }, {
            onSuccess: () => {
                // 清除相关缓存
                baseStore.clearCache()
            },
            onError: (error) => {
                console.error(`更新提醒 ${id} 失败:`, error)
            }
        })
    }

    // 删除提醒
    async function deleteAlert(id: number) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            await alertService.deleteAlert(id)

            // 从本地状态中移除
            alerts.value = alerts.value.filter(alert => alert.id !== id)
            alertsMap.value.delete(id)
            alertHistories.value.delete(id)

            return true
        }, {
            onSuccess: () => {
                // 清除缓存
                baseStore.clearCache()
            },
            onError: (error) => {
                console.error(`删除提醒 ${id} 失败:`, error)
            }
        })
    }

    // 批量删除提醒
    async function deleteMultipleAlerts(ids: number[]) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            const results = await Promise.allSettled(
                ids.map(id => alertService.deleteAlert(id))
            )

            const successful: number[] = []
            const failed: { id: number; error: any }[] = []

            results.forEach((result, index) => {
                const id = ids[index]
                if (result.status === 'fulfilled') {
                    successful.push(id)
                    // 从本地状态中移除
                    alerts.value = alerts.value.filter(alert => alert.id !== id)
                    alertsMap.value.delete(id)
                    alertHistories.value.delete(id)
                } else {
                    failed.push({ id, error: result.reason })
                }
            })

            return { successful, failed }
        }, {
            onSuccess: () => {
                // 清除缓存
                baseStore.clearCache()
            },
            onError: (error) => {
                console.error('批量删除提醒失败:', error)
            }
        })
    }

    // 切换提醒状态
    async function toggleAlertStatus(id: number, isActive: boolean) {
        return await updateAlert(id, { isActive })
    }

    // 批量切换提醒状态
    async function toggleMultipleAlertStatus(ids: number[], isActive: boolean) {
        return await baseStore.executeAsync(async () => {
            const results = await Promise.allSettled(
                ids.map(id => alertService.updateAlert(id, { isActive }))
            )

            const successful: Alert[] = []
            const failed: { id: number; error: any }[] = []

            results.forEach((result, index) => {
                const id = ids[index]
                if (result.status === 'fulfilled') {
                    successful.push(result.value)
                    // 更新本地状态
                    const localIndex = alerts.value.findIndex(alert => alert.id === id)
                    if (localIndex !== -1) {
                        alerts.value[localIndex] = result.value
                    }
                    alertsMap.value.set(id, result.value)
                } else {
                    failed.push({ id, error: result.reason })
                }
            })

            return { successful, failed }
        }, {
            onSuccess: () => {
                // 清除缓存
                baseStore.clearCache()
            },
            onError: (error) => {
                console.error('批量切换提醒状态失败:', error)
            }
        })
    }

    // 获取提醒历史
    async function fetchAlertHistory(alertId: number, forceRefresh = false) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            const histories = await alertService.getAlertHistory(alertId)
            alertHistories.value.set(alertId, histories)
            return histories
        }, {
            cacheKey: `alert_history_${alertId}`,
            skipCache: forceRefresh,
            onError: (error) => {
                console.error(`获取提醒 ${alertId} 历史失败:`, error)
            }
        })
    }

    // 标记历史记录为已读
    async function markHistoryAsRead(historyId: number, alertId: number) {
        return await baseStore.executeAsync(async () => {
            const success = await alertService.markHistoryAsRead(historyId)

            if (success) {
                const histories = alertHistories.value.get(alertId)
                if (histories) {
                    const index = histories.findIndex(history => history.id === historyId)
                    if (index !== -1) {
                        histories[index].isRead = true
                    }
                }
            }

            return success
        }, {
            onError: (error) => {
                console.error(`标记历史记录 ${historyId} 为已读失败:`, error)
            }
        })
    }

    // 标记所有历史记录为已读
    async function markAllHistoryAsRead(alertId: number) {
        return await baseStore.executeAsync(async () => {
            const success = await alertService.markAllHistoryAsRead(alertId)

            if (success) {
                const histories = alertHistories.value.get(alertId)
                if (histories) {
                    histories.forEach(history => {
                        history.isRead = true
                    })
                }
            }

            return success
        }, {
            onError: (error) => {
                console.error(`标记所有历史记录为已读失败:`, error)
            }
        })
    }

    // 获取提醒统计
    async function fetchStatistics(forceRefresh = false) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            const stats = await alertService.getAlertStatistics()
            statistics.value = stats
            return stats
        }, {
            cacheKey: 'alert_statistics',
            skipCache: forceRefresh,
            onError: (error) => {
                console.error('获取提醒统计数据失败:', error)
            }
        })
    }

    // 获取单个提醒
    function getAlert(id: number): Alert | null {
        return alertsMap.value.get(id) || null
    }

    // 获取提醒历史
    function getAlertHistory(alertId: number) {
        return alertHistories.value.get(alertId) || []
    }

    // 重置状态
    function reset() {
        alerts.value = []
        alertsMap.value.clear()
        alertHistories.value.clear()
        statistics.value = null
        pagination.reset()
        search.reset()
        baseStore.clearCache()
    }

    return {
        // 基础Store功能
        ...baseStore,

        // 分页和搜索
        ...pagination,
        ...search,

        // 提醒状态
        alerts,
        alertsMap,
        alertHistories,
        statistics,

        // 计算属性
        activeAlerts,
        triggeredAlerts,
        alertsByType,
        filteredAlerts,
        paginatedAlerts,
        unreadHistoryCount,

        // 方法
        fetchAlerts,
        createAlert,
        updateAlert,
        deleteAlert,
        deleteMultipleAlerts,
        toggleAlertStatus,
        toggleMultipleAlertStatus,
        fetchAlertHistory,
        markHistoryAsRead,
        markAllHistoryAsRead,
        fetchStatistics,
        getAlert,
        getAlertHistory,
        reset
    }
})