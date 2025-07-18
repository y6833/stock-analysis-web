/**
 * 十字星形态提醒组合式API
 * 提供十字星形态提醒相关的功能
 */

import { ref, inject, onMounted, onUnmounted } from 'vue'
import type { DojiPatternAlert, CreateDojiPatternAlertRequest, UpdateDojiPatternAlertRequest } from '../services/DojiPatternAlertService'
import { dojiPatternAlertService } from '../services/DojiPatternAlertService'
import type { DojiPatternAlertManager } from '../services/DojiPatternAlertManager'
import type { DojiPatternDetectorService } from '../services/DojiPatternDetectorService'

/**
 * 十字星形态提醒组合式API
 */
export function useDojiPatternAlert() {
    // 注入服务
    const alertManager = inject<DojiPatternAlertManager>('dojiPatternAlertManager')
    const detectorService = inject<DojiPatternDetectorService>('dojiPatternDetectorService')

    // 状态
    const alerts = ref<DojiPatternAlert[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    /**
     * 加载提醒列表
     */
    const loadAlerts = async () => {
        loading.value = true
        error.value = null

        try {
            alerts.value = await dojiPatternAlertService.getDojiPatternAlerts()
        } catch (err: any) {
            error.value = err.message || '加载提醒失败'
            console.error('加载十字星形态提醒失败:', err)
        } finally {
            loading.value = false
        }
    }

    /**
     * 创建提醒
     * @param alertData 提醒数据
     */
    const createAlert = async (alertData: CreateDojiPatternAlertRequest) => {
        loading.value = true
        error.value = null

        try {
            const newAlert = await dojiPatternAlertService.createDojiPatternAlert(alertData)
            alerts.value.push(newAlert)

            // 如果提醒是活跃的，添加到管理器
            if (newAlert.isActive && alertManager) {
                await alertManager.addAlert(newAlert)
            }

            return newAlert
        } catch (err: any) {
            error.value = err.message || '创建提醒失败'
            console.error('创建十字星形态提醒失败:', err)
            throw err
        } finally {
            loading.value = false
        }
    }

    /**
     * 更新提醒
     * @param id 提醒ID
     * @param data 更新数据
     */
    const updateAlert = async (id: number, data: UpdateDojiPatternAlertRequest) => {
        loading.value = true
        error.value = null

        try {
            const updatedAlert = await dojiPatternAlertService.updateDojiPatternAlert(id, data)

            // 更新本地列表
            const index = alerts.value.findIndex(a => a.id === id)
            if (index >= 0) {
                alerts.value[index] = updatedAlert
            }

            // 更新管理器中的提醒
            if (alertManager) {
                await alertManager.updateAlert(updatedAlert)
            }

            return updatedAlert
        } catch (err: any) {
            error.value = err.message || '更新提醒失败'
            console.error(`更新十字星形态提醒 ${id} 失败:`, err)
            throw err
        } finally {
            loading.value = false
        }
    }

    /**
     * 删除提醒
     * @param id 提醒ID
     */
    const deleteAlert = async (id: number) => {
        loading.value = true
        error.value = null

        try {
            await dojiPatternAlertService.deleteDojiPatternAlert(id)

            // 从本地列表中移除
            alerts.value = alerts.value.filter(a => a.id !== id)

            // 从管理器中移除
            if (alertManager) {
                await alertManager.removeAlert(id)
            }

            return true
        } catch (err: any) {
            error.value = err.message || '删除提醒失败'
            console.error(`删除十字星形态提醒 ${id} 失败:`, err)
            throw err
        } finally {
            loading.value = false
        }
    }

    /**
     * 切换提醒状态
     * @param id 提醒ID
     * @param isActive 是否激活
     */
    const toggleAlertStatus = async (id: number, isActive: boolean) => {
        return updateAlert(id, { isActive })
    }

    /**
     * 测试提醒
     * @param alertData 提醒数据
     */
    const testAlert = async (alertData: CreateDojiPatternAlertRequest) => {
        loading.value = true
        error.value = null

        try {
            return await dojiPatternAlertService.testDojiPatternAlert(alertData)
        } catch (err: any) {
            error.value = err.message || '测试提醒失败'
            console.error('测试十字星形态提醒失败:', err)
            throw err
        } finally {
            loading.value = false
        }
    }

    /**
     * 获取提醒历史
     * @param alertId 提醒ID
     * @param options 查询选项
     */
    const getAlertHistory = async (
        alertId: number,
        options: { page?: number; pageSize?: number } = {}
    ) => {
        loading.value = true
        error.value = null

        try {
            return await dojiPatternAlertService.getDojiPatternAlertHistory(alertId, options)
        } catch (err: any) {
            error.value = err.message || '获取提醒历史失败'
            console.error(`获取十字星形态提醒 ${alertId} 的历史记录失败:`, err)
            throw err
        } finally {
            loading.value = false
        }
    }

    // 生命周期钩子
    onMounted(() => {
        loadAlerts()
    })

    return {
        alerts,
        loading,
        error,
        loadAlerts,
        createAlert,
        updateAlert,
        deleteAlert,
        toggleAlertStatus,
        testAlert,
        getAlertHistory
    }
}