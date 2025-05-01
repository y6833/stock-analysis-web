import axios from 'axios'
import { useToast } from '@/composables/useToast'

/**
 * 通知服务
 */
const notificationService = {
  /**
   * 获取用户通知列表
   * @param options 查询选项
   * @returns 通知列表
   */
  async getUserNotifications(options: {
    page?: number
    pageSize?: number
    isRead?: boolean
    type?: string
  } = {}): Promise<any> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 构建查询参数
      const params = new URLSearchParams()
      if (options.page) params.append('page', options.page.toString())
      if (options.pageSize) params.append('pageSize', options.pageSize.toString())
      if (options.isRead !== undefined) params.append('isRead', options.isRead.toString())
      if (options.type) params.append('type', options.type)

      // 发送请求时添加授权头
      const response = await axios.get(`/api/notifications?${params.toString()}`, getAuthHeaders())
      return response.data.data
    } catch (error: any) {
      console.error('获取通知列表失败:', error)
      const { showToast } = useToast()
      showToast(`获取通知列表失败: ${error.response?.data?.message || error.message}`, 'error')
      throw error
    }
  },

  /**
   * 获取未读通知数量
   * @returns 未读通知数量
   */
  async getUnreadCount(): Promise<number> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求时添加授权头
      const response = await axios.get('/api/notifications/unread-count', getAuthHeaders())
      return response.data.data.count
    } catch (error: any) {
      console.error('获取未读通知数量失败:', error)
      return 0
    }
  },

  /**
   * 标记通知为已读
   * @param notificationId 通知ID
   * @returns 标记结果
   */
  async markAsRead(notificationId: number): Promise<any> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求时添加授权头
      const response = await axios.post(`/api/notifications/${notificationId}/read`, {}, getAuthHeaders())
      return response.data
    } catch (error: any) {
      console.error('标记通知为已读失败:', error)
      const { showToast } = useToast()
      showToast(`标记通知为已读失败: ${error.response?.data?.message || error.message}`, 'error')
      throw error
    }
  },

  /**
   * 标记所有通知为已读
   * @returns 标记结果
   */
  async markAllAsRead(): Promise<any> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求时添加授权头
      const response = await axios.post('/api/notifications/read-all', {}, getAuthHeaders())
      return response.data
    } catch (error: any) {
      console.error('标记所有通知为已读失败:', error)
      const { showToast } = useToast()
      showToast(`标记所有通知为已读失败: ${error.response?.data?.message || error.message}`, 'error')
      throw error
    }
  },

  /**
   * 删除通知
   * @param notificationId 通知ID
   * @returns 删除结果
   */
  async deleteNotification(notificationId: number): Promise<any> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求时添加授权头
      const response = await axios.delete(`/api/notifications/${notificationId}`, getAuthHeaders())
      return response.data
    } catch (error: any) {
      console.error('删除通知失败:', error)
      const { showToast } = useToast()
      showToast(`删除通知失败: ${error.response?.data?.message || error.message}`, 'error')
      throw error
    }
  }
}

export default notificationService
