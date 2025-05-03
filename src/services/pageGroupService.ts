/**
 * 页面组服务
 * 处理页面组相关的API交互
 */

import axios from 'axios'
import { useToast } from '@/composables/useToast'
import { SystemPage } from './pageService'

export interface PageGroup {
  id?: number
  name: string
  description?: string
  pages?: SystemPage[]
  createdAt?: string
  updatedAt?: string
}

export const pageGroupService = {
  /**
   * 获取所有页面组
   * @returns 页面组列表
   */
  async getAllPageGroups(): Promise<PageGroup[]> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      const response = await axios.get('/api/page-groups', getAuthHeaders())
      return response.data.data
    } catch (error: any) {
      console.error('获取所有页面组失败:', error)
      const { showToast } = useToast()
      showToast(`获取页面组列表失败: ${error.response?.data?.message || error.message}`, 'error')
      return []
    }
  },

  /**
   * 获取页面组详情
   * @param id 页面组ID
   * @returns 页面组详情
   */
  async getPageGroupById(id: number): Promise<PageGroup | null> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      const response = await axios.get(`/api/page-groups/${id}`, getAuthHeaders())
      return response.data.data
    } catch (error: any) {
      console.error('获取页面组详情失败:', error)
      const { showToast } = useToast()
      showToast(`获取页面组详情失败: ${error.response?.data?.message || error.message}`, 'error')
      return null
    }
  },

  /**
   * 创建页面组
   * @param data 页面组数据
   * @returns 创建的页面组
   */
  async createPageGroup(data: PageGroup): Promise<PageGroup | null> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      const response = await axios.post('/api/page-groups', data, getAuthHeaders())
      const { showToast } = useToast()
      showToast('页面组创建成功', 'success')
      return response.data.data
    } catch (error: any) {
      console.error('创建页面组失败:', error)
      const { showToast } = useToast()
      showToast(`创建页面组失败: ${error.response?.data?.message || error.message}`, 'error')
      return null
    }
  },

  /**
   * 更新页面组
   * @param id 页面组ID
   * @param data 页面组数据
   * @returns 更新后的页面组
   */
  async updatePageGroup(id: number, data: Partial<PageGroup>): Promise<PageGroup | null> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      const response = await axios.put(`/api/page-groups/${id}`, data, getAuthHeaders())
      const { showToast } = useToast()
      showToast('页面组更新成功', 'success')
      return response.data.data
    } catch (error: any) {
      console.error('更新页面组失败:', error)
      const { showToast } = useToast()
      showToast(`更新页面组失败: ${error.response?.data?.message || error.message}`, 'error')
      return null
    }
  },

  /**
   * 删除页面组
   * @param id 页面组ID
   * @returns 是否成功
   */
  async deletePageGroup(id: number): Promise<boolean> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      await axios.delete(`/api/page-groups/${id}`, getAuthHeaders())
      const { showToast } = useToast()
      showToast('页面组删除成功', 'success')
      return true
    } catch (error: any) {
      console.error('删除页面组失败:', error)
      const { showToast } = useToast()
      showToast(`删除页面组失败: ${error.response?.data?.message || error.message}`, 'error')
      return false
    }
  },

  /**
   * 设置页面组权限
   * @param groupId 页面组ID
   * @param permissions 权限数据
   * @returns 是否成功
   */
  async setPageGroupPermissions(
    groupId: number,
    permissions: Array<{ membershipLevel: string; hasAccess: boolean }>
  ): Promise<boolean> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      await axios.put(
        `/api/page-groups/${groupId}/permissions`,
        { permissions },
        getAuthHeaders()
      )
      const { showToast } = useToast()
      showToast('页面组权限设置成功', 'success')
      return true
    } catch (error: any) {
      console.error('设置页面组权限失败:', error)
      const { showToast } = useToast()
      showToast(`设置页面组权限失败: ${error.response?.data?.message || error.message}`, 'error')
      return false
    }
  },
}

export default pageGroupService
