/**
 * 提醒数据迁移服务
 * 用于将本地存储的提醒数据迁移到数据库
 */

import { alertService, type CreateAlertRequest } from './alertService'
import { useToast } from '@/composables/useToast'

const LOCAL_STORAGE_ALERTS_KEY = 'stock_alerts'

interface LocalAlert {
  id: string
  symbol: string
  name: string
  condition: string
  value: number
  message?: string
  active: boolean
  createdAt: string
}

export const alertMigrationService = {
  /**
   * 检查本地存储中是否有提醒数据
   * @returns 是否存在本地提醒数据
   */
  hasLocalAlerts(): boolean {
    const alertsJson = localStorage.getItem(LOCAL_STORAGE_ALERTS_KEY)
    if (!alertsJson) return false
    
    try {
      const alerts = JSON.parse(alertsJson)
      return Array.isArray(alerts) && alerts.length > 0
    } catch (error) {
      console.error('解析本地提醒数据失败:', error)
      return false
    }
  },

  /**
   * 获取本地存储的提醒数据
   * @returns 本地提醒数据数组
   */
  getLocalAlerts(): LocalAlert[] {
    const alertsJson = localStorage.getItem(LOCAL_STORAGE_ALERTS_KEY)
    if (!alertsJson) return []
    
    try {
      return JSON.parse(alertsJson)
    } catch (error) {
      console.error('解析本地提醒数据失败:', error)
      return []
    }
  },

  /**
   * 将本地提醒数据迁移到数据库
   * @returns 迁移结果，包含成功和失败的数量
   */
  async migrateAlertsToDatabase(): Promise<{ success: number; failed: number; total: number }> {
    const { showToast } = useToast()
    const localAlerts = this.getLocalAlerts()
    
    if (localAlerts.length === 0) {
      return { success: 0, failed: 0, total: 0 }
    }
    
    let successCount = 0
    let failedCount = 0
    
    for (const localAlert of localAlerts) {
      try {
        // 转换为创建提醒请求格式
        const alertData: CreateAlertRequest = {
          stockCode: localAlert.symbol,
          stockName: localAlert.name,
          alertType: 'price', // 默认为价格提醒
          condition: this.mapCondition(localAlert.condition),
          value: localAlert.value,
          message: localAlert.message
        }
        
        // 调用API创建提醒
        await alertService.createAlert(alertData)
        successCount++
      } catch (error) {
        console.error(`迁移提醒 ${localAlert.id} 失败:`, error)
        failedCount++
      }
    }
    
    // 迁移完成后，清除本地存储
    if (successCount > 0) {
      localStorage.removeItem(LOCAL_STORAGE_ALERTS_KEY)
      showToast(`成功迁移 ${successCount} 个提醒到数据库`, 'success')
    }
    
    if (failedCount > 0) {
      showToast(`${failedCount} 个提醒迁移失败`, 'warning')
    }
    
    return {
      success: successCount,
      failed: failedCount,
      total: localAlerts.length
    }
  },
  
  /**
   * 映射本地提醒条件到API条件格式
   * @param localCondition 本地提醒条件
   * @returns API条件格式
   */
  mapCondition(localCondition: string): string {
    const conditionMap: Record<string, string> = {
      'above': 'price_above',
      'below': 'price_below',
      'volume_above': 'volume_above',
      'change_above': 'change_above',
      'change_below': 'change_below'
    }
    
    return conditionMap[localCondition] || 'price_above'
  }
}

export default alertMigrationService
