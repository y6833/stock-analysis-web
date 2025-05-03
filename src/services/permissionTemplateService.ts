/**
 * 权限模板服务
 * 处理权限模板相关的API交互
 */

import axios from 'axios'
import { useToast } from '@/composables/useToast'

export interface PermissionTemplate {
  id?: number
  name: string
  description?: string
  permissions: Array<{ membershipLevel: string; hasAccess: boolean }>
  createdAt?: string
  updatedAt?: string
}

export const permissionTemplateService = {
  /**
   * 获取所有权限模板
   * @returns 权限模板列表
   */
  async getAllTemplates(): Promise<PermissionTemplate[]> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      const response = await axios.get('/api/permission-templates', getAuthHeaders())
      return response.data.data
    } catch (error: any) {
      console.error('获取所有权限模板失败:', error)
      const { showToast } = useToast()
      showToast(`获取权限模板列表失败: ${error.response?.data?.message || error.message}`, 'error')
      return []
    }
  },

  /**
   * 获取权限模板详情
   * @param id 权限模板ID
   * @returns 权限模板详情
   */
  async getTemplateById(id: number): Promise<PermissionTemplate | null> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      const response = await axios.get(`/api/permission-templates/${id}`, getAuthHeaders())
      return response.data.data
    } catch (error: any) {
      console.error('获取权限模板详情失败:', error)
      const { showToast } = useToast()
      showToast(`获取权限模板详情失败: ${error.response?.data?.message || error.message}`, 'error')
      return null
    }
  },

  /**
   * 创建权限模板
   * @param data 权限模板数据
   * @returns 创建的权限模板
   */
  async createTemplate(data: PermissionTemplate): Promise<PermissionTemplate | null> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      const response = await axios.post('/api/permission-templates', data, getAuthHeaders())
      const { showToast } = useToast()
      showToast('权限模板创建成功', 'success')
      return response.data.data
    } catch (error: any) {
      console.error('创建权限模板失败:', error)
      const { showToast } = useToast()
      showToast(`创建权限模板失败: ${error.response?.data?.message || error.message}`, 'error')
      return null
    }
  },

  /**
   * 更新权限模板
   * @param id 权限模板ID
   * @param data 权限模板数据
   * @returns 更新后的权限模板
   */
  async updateTemplate(id: number, data: Partial<PermissionTemplate>): Promise<PermissionTemplate | null> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      const response = await axios.put(`/api/permission-templates/${id}`, data, getAuthHeaders())
      const { showToast } = useToast()
      showToast('权限模板更新成功', 'success')
      return response.data.data
    } catch (error: any) {
      console.error('更新权限模板失败:', error)
      const { showToast } = useToast()
      showToast(`更新权限模板失败: ${error.response?.data?.message || error.message}`, 'error')
      return null
    }
  },

  /**
   * 删除权限模板
   * @param id 权限模板ID
   * @returns 是否成功
   */
  async deleteTemplate(id: number): Promise<boolean> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      await axios.delete(`/api/permission-templates/${id}`, getAuthHeaders())
      const { showToast } = useToast()
      showToast('权限模板删除成功', 'success')
      return true
    } catch (error: any) {
      console.error('删除权限模板失败:', error)
      const { showToast } = useToast()
      showToast(`删除权限模板失败: ${error.response?.data?.message || error.message}`, 'error')
      return false
    }
  },

  /**
   * 应用权限模板到页面
   * @param templateId 权限模板ID
   * @param pageId 页面ID
   * @returns 是否成功
   */
  async applyTemplateToPage(templateId: number, pageId: number): Promise<boolean> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      await axios.post(
        '/api/permission-templates/apply-to-page',
        { templateId, pageId },
        getAuthHeaders()
      )
      const { showToast } = useToast()
      showToast('权限模板应用成功', 'success')
      return true
    } catch (error: any) {
      console.error('应用权限模板到页面失败:', error)
      const { showToast } = useToast()
      showToast(`应用权限模板到页面失败: ${error.response?.data?.message || error.message}`, 'error')
      return false
    }
  },

  /**
   * 应用权限模板到页面组
   * @param templateId 权限模板ID
   * @param groupId 页面组ID
   * @returns 是否成功
   */
  async applyTemplateToGroup(templateId: number, groupId: number): Promise<boolean> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      await axios.post(
        '/api/permission-templates/apply-to-group',
        { templateId, groupId },
        getAuthHeaders()
      )
      const { showToast } = useToast()
      showToast('权限模板应用成功', 'success')
      return true
    } catch (error: any) {
      console.error('应用权限模板到页面组失败:', error)
      const { showToast } = useToast()
      showToast(`应用权限模板到页面组失败: ${error.response?.data?.message || error.message}`, 'error')
      return false
    }
  },
}

export default permissionTemplateService
