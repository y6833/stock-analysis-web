/**
 * 数据刷新服务
 * 提供全局数据刷新功能，包括刷新限制和状态管理
 */

import { stockService } from './stockService'
import { useToast } from '@/composables/useToast'
import axios from 'axios'
import eventBus from '@/utils/eventBus'

// 刷新冷却时间（毫秒）
const REFRESH_COOLDOWN = 60 * 60 * 1000 // 1小时

// 本地存储键
const LAST_REFRESH_KEY = 'last_data_refresh_time'

export const dataRefreshService = {
  /**
   * 获取上次刷新时间
   * @returns 上次刷新时间戳（毫秒）
   */
  getLastRefreshTime(): number {
    const savedTime = localStorage.getItem(LAST_REFRESH_KEY)
    return savedTime ? parseInt(savedTime) : 0
  },

  /**
   * 检查是否可以刷新数据
   * @returns 是否可以刷新
   */
  canRefresh(): boolean {
    const lastRefresh = this.getLastRefreshTime()
    const now = Date.now()
    return now - lastRefresh >= REFRESH_COOLDOWN
  },

  /**
   * 获取剩余冷却时间（毫秒）
   * @returns 剩余冷却时间
   */
  getCooldownRemaining(): number {
    const lastRefresh = this.getLastRefreshTime()
    const now = Date.now()
    const elapsed = now - lastRefresh
    return Math.max(0, REFRESH_COOLDOWN - elapsed)
  },

  /**
   * 执行全局数据刷新
   * 刷新所有关键数据，包括股票列表、市场数据等
   * @param forceRefresh 是否强制刷新（忽略冷却时间）
   * @param dataSource 数据源名称
   * @returns 刷新结果
   */
  async refreshAllData(
    forceRefresh = false,
    dataSource?: string
  ): Promise<{ success: boolean; message: string }> {
    const { showToast } = useToast()

    // 检查冷却时间
    if (!forceRefresh && !this.canRefresh()) {
      const remainingMinutes = Math.ceil(this.getCooldownRemaining() / 60000)
      const message = `刷新操作过于频繁，请在 ${remainingMinutes} 分钟后再试`
      showToast(message, 'warning')
      return { success: false, message }
    }

    // 如果没有提供数据源，使用当前数据源
    const currentDataSource = dataSource || localStorage.getItem('preferredDataSource') || 'tushare'

    try {
      // 调用后端刷新接口
      const response = await axios.post('/api/refresh-data', {
        force_api: true, // 强制使用API获取最新数据
        dataSource: currentDataSource, // 指定数据源
      })

      // 更新上次刷新时间
      localStorage.setItem(LAST_REFRESH_KEY, Date.now().toString())

      // 发送数据刷新事件
      eventBus.emit('data-refreshed')

      return {
        success: true,
        message: response.data?.message || '数据刷新成功',
      }
    } catch (error: any) {
      console.error('刷新数据失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || error.message || '刷新数据失败',
      }
    }
  },
}

export default dataRefreshService
