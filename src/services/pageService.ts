/**
 * 页面管理服务
 * 处理页面相关的API交互
 */

import axios from 'axios'
import { useToast } from '@/composables/useToast'

export interface PagePermission {
  id?: number
  pageId?: number
  membershipLevel: string
  hasAccess: boolean
}

export interface SystemPage {
  id?: number
  path: string
  name: string
  description?: string
  icon?: string
  component: string
  isMenu: boolean
  parentId?: number
  sortOrder: number
  isEnabled: boolean
  requiresAuth: boolean
  requiresAdmin: boolean
  requiredMembershipLevel: string
  meta?: Record<string, any>
  permissions?: PagePermission[]
  children?: SystemPage[]
}

export const pageService = {
  /**
   * 获取所有页面
   * @param options 查询选项
   * @returns 页面列表
   */
  async getAllPages(
    options: {
      withPermissions?: boolean
      onlyEnabled?: boolean
      onlyMenu?: boolean
    } = {}
  ): Promise<SystemPage[]> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 构建查询参数
      const params = new URLSearchParams()
      if (options.withPermissions) {
        params.append('withPermissions', 'true')
      }
      if (options.onlyEnabled) {
        params.append('onlyEnabled', 'true')
      }
      if (options.onlyMenu) {
        params.append('onlyMenu', 'true')
      }

      // 发送请求
      const response = await axios.get(`/api/pages?${params.toString()}`, getAuthHeaders())
      return response.data.data
    } catch (error: any) {
      console.error('获取所有页面失败:', error)
      const { showToast } = useToast()
      showToast(`获取页面列表失败: ${error.response?.data?.message || error.message}`, 'error')
      return []
    }
  },

  /**
   * 获取页面详情
   * @param id 页面ID
   * @returns 页面详情
   */
  async getPageById(id: number): Promise<SystemPage | null> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      const response = await axios.get(`/api/pages/${id}`, getAuthHeaders())
      return response.data.data
    } catch (error: any) {
      console.error('获取页面详情失败:', error)
      const { showToast } = useToast()
      showToast(`获取页面详情失败: ${error.response?.data?.message || error.message}`, 'error')
      return null
    }
  },

  /**
   * 创建页面
   * @param data 页面数据
   * @returns 创建的页面
   */
  async createPage(data: SystemPage): Promise<SystemPage | null> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      const response = await axios.post('/api/pages', data, getAuthHeaders())
      const { showToast } = useToast()
      showToast('页面创建成功', 'success')
      return response.data.data
    } catch (error: any) {
      console.error('创建页面失败:', error)
      const { showToast } = useToast()
      showToast(`创建页面失败: ${error.response?.data?.message || error.message}`, 'error')
      return null
    }
  },

  /**
   * 更新页面
   * @param id 页面ID
   * @param data 页面数据
   * @returns 更新后的页面
   */
  async updatePage(id: number, data: Partial<SystemPage>): Promise<SystemPage | null> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      const response = await axios.put(`/api/pages/${id}`, data, getAuthHeaders())
      const { showToast } = useToast()
      showToast('页面更新成功', 'success')
      return response.data.data
    } catch (error: any) {
      console.error('更新页面失败:', error)
      const { showToast } = useToast()
      showToast(`更新页面失败: ${error.response?.data?.message || error.message}`, 'error')
      return null
    }
  },

  /**
   * 删除页面
   * @param id 页面ID
   * @returns 是否成功
   */
  async deletePage(id: number): Promise<boolean> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      await axios.delete(`/api/pages/${id}`, getAuthHeaders())
      const { showToast } = useToast()
      showToast('页面删除成功', 'success')
      return true
    } catch (error: any) {
      console.error('删除页面失败:', error)
      const { showToast } = useToast()
      showToast(`删除页面失败: ${error.response?.data?.message || error.message}`, 'error')
      return false
    }
  },

  /**
   * 更新页面权限
   * @param pageId 页面ID
   * @param permissions 权限数据
   * @returns 更新后的页面
   */
  async updatePagePermissions(
    pageId: number,
    permissions: PagePermission[]
  ): Promise<SystemPage | null> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      const response = await axios.put(
        `/api/pages/${pageId}/permissions`,
        { permissions },
        getAuthHeaders()
      )
      const { showToast } = useToast()
      showToast('页面权限更新成功', 'success')
      return response.data.data
    } catch (error: any) {
      console.error('更新页面权限失败:', error)
      const { showToast } = useToast()
      showToast(`更新页面权限失败: ${error.response?.data?.message || error.message}`, 'error')
      return null
    }
  },

  /**
   * 批量更新页面状态
   * @param ids 页面ID数组
   * @param isEnabled 是否启用
   * @returns 更新的记录数
   */
  async batchUpdateStatus(ids: number[], isEnabled: boolean): Promise<number> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      const response = await axios.post(
        '/api/pages/batch-status',
        { ids, isEnabled },
        getAuthHeaders()
      )
      const { showToast } = useToast()
      showToast(response.data.message, 'success')
      return response.data.count
    } catch (error: any) {
      console.error('批量更新页面状态失败:', error)
      const { showToast } = useToast()
      showToast(`批量更新页面状态失败: ${error.response?.data?.message || error.message}`, 'error')
      return 0
    }
  },

  /**
   * 初始化系统页面
   * @returns 创建的页面数量
   */
  async initSystemPages(): Promise<number> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      const response = await axios.post('/api/pages/init', {}, getAuthHeaders())
      const { showToast } = useToast()
      showToast(response.data.message, 'success')
      return response.data.count
    } catch (error: any) {
      console.error('初始化系统页面失败:', error)
      const { showToast } = useToast()

      // 检查是否是数据库表不存在的错误
      if (
        error.response?.data?.message &&
        (error.response.data.message.includes("doesn't exist") ||
          error.response.data.message.includes('no such table'))
      ) {
        showToast('正在尝试创建数据库表，请稍后再试...', 'warning', 5000)

        // 延迟1秒后再次尝试
        await new Promise((resolve) => setTimeout(resolve, 1000))

        try {
          // 再次尝试初始化
          const retryResponse = await axios.post('/api/pages/init', {}, getAuthHeaders())
          showToast(retryResponse.data.message, 'success')
          return retryResponse.data.count
        } catch (retryError: any) {
          console.error('重试初始化系统页面失败:', retryError)
          showToast(
            `初始化系统页面失败: ${retryError.response?.data?.message || retryError.message}`,
            'error'
          )
          return 0
        }
      } else {
        showToast(`初始化系统页面失败: ${error.response?.data?.message || error.message}`, 'error')
        return 0
      }
    }
  },

  /**
   * 获取用户菜单
   * @returns 菜单树
   */
  async getUserMenu(): Promise<SystemPage[]> {
    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      const response = await axios.get('/api/user-menu', getAuthHeaders())
      return response.data.data
    } catch (error: any) {
      console.error('获取用户菜单失败:', error)
      return []
    }
  },

  /**
   * 页面访问权限缓存
   * 使用会话存储缓存页面访问权限，避免频繁API调用
   */
  _pageAccessCache: new Map<string, { hasAccess: boolean; timestamp: number }>(),

  /**
   * 缓存过期时间（毫秒）
   */
  _cacheExpiration: 5 * 60 * 1000, // 5分钟

  /**
   * 清除页面访问权限缓存
   */
  clearPageAccessCache(): void {
    this._pageAccessCache.clear()
    console.log('[页面权限] 缓存已清除')
  },

  /**
   * 检查页面访问权限
   * @param path 页面路径
   * @param forceRefresh 是否强制刷新缓存
   * @returns 是否有权限访问
   */
  async checkPageAccess(path: string, forceRefresh = false): Promise<boolean> {
    // 特殊页面直接允许访问
    if (
      path === '/membership-features' || // 会员功能页面（避免循环）
      path === '/dashboard' || // 仪表盘（基础功能，所有用户都可访问）
      path === '/' || // 首页
      path === '/about' // 关于页面
    ) {
      console.log(`[页面权限] 特殊页面直接允许访问: ${path}`)
      return true
    }

    // 检查缓存
    const now = Date.now()
    const cachedResult = this._pageAccessCache.get(path)

    if (!forceRefresh && cachedResult && now - cachedResult.timestamp < this._cacheExpiration) {
      console.log(`[页面权限] 使用缓存结果: ${path} -> ${cachedResult.hasAccess ? '允许' : '拒绝'}`)
      return cachedResult.hasAccess
    }

    try {
      // 导入授权头工具函数
      const { getAuthHeaders } = await import('@/utils/auth')

      // 发送请求
      console.log(`[页面权限] 请求API: ${path}`)
      const response = await axios.get(`/api/check-page-access?path=${path}`, getAuthHeaders())

      // 输出详细的响应信息
      console.log(`[页面权限] API响应:`, {
        path,
        hasAccess: response.data.hasAccess,
        message: response.data.message,
        requiredLevel: response.data.requiredLevel,
        userLevel: response.data.userLevel,
        details: response.data.details,
      })

      // 缓存结果
      this._pageAccessCache.set(path, {
        hasAccess: response.data.hasAccess,
        timestamp: now,
      })

      return response.data.hasAccess
    } catch (error: any) {
      // 检查是否是数据库表不存在的错误
      if (
        error.response?.data?.message &&
        (error.response.data.message.includes("doesn't exist") ||
          error.response.data.message.includes('no such table'))
      ) {
        console.warn('页面管理表不存在，默认允许访问:', path)
        // 表不存在时，默认允许访问
        const result = true

        // 缓存结果
        this._pageAccessCache.set(path, {
          hasAccess: result,
          timestamp: now,
        })

        return result
      }

      console.error('检查页面访问权限失败:', error)

      // 检查是否是基础页面，如果是则默认允许访问
      const basicPages = ['/stock', '/market-heatmap', '/industry-analysis', '/test-dashboard']
      if (basicPages.includes(path)) {
        console.warn('检查页面权限失败，但这是基础页面，默认允许访问:', path)
        const result = true

        // 缓存结果
        this._pageAccessCache.set(path, {
          hasAccess: result,
          timestamp: now,
        })

        return result
      }

      // 其他错误情况下，默认拒绝访问
      const result = false

      // 缓存结果
      this._pageAccessCache.set(path, {
        hasAccess: result,
        timestamp: now,
      })

      return result
    }
  },
}

export default pageService
