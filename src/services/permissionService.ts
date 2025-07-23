/**
 * 权限服务
 * 提供基于角色的访问控制和细粒度权限检查
 */

import axios from 'axios'
import { authService } from './authService'
import { useToast } from '@/composables/useToast'

// 权限类型定义
export interface Permission {
  id: number
  name: string
  code: string
  description: string
  category: string
  createdAt: string
  updatedAt: string
}

// 角色类型定义
export interface Role {
  id: number
  name: string
  code: string
  description: string
  isSystem: boolean
  permissions: Permission[]
  createdAt: string
  updatedAt: string
}

// 用户权限类型定义
export interface UserPermission {
  userId: string
  permissions: string[] // 权限代码列表
  roles: string[] // 角色代码列表
}

/**
 * 权限服务类
 */
class PermissionService {
  // 权限缓存
  private _permissionCache: UserPermission | null = null
  private _permissionCacheExpiry: number = 0
  private _cacheDuration: number = 5 * 60 * 1000 // 5分钟缓存

  // 权限检查结果缓存
  private _checkResultCache: Map<string, { result: boolean; timestamp: number }> = new Map()
  private _checkCacheDuration: number = 60 * 1000 // 1分钟缓存

  /**
   * 获取当前用户的所有权限
   * @param forceRefresh 是否强制刷新缓存
   * @returns 用户权限信息
   */
  async getUserPermissions(forceRefresh = false): Promise<UserPermission | null> {
    // 检查缓存是否有效
    const now = Date.now()
    if (!forceRefresh && this._permissionCache && now < this._permissionCacheExpiry) {
      return this._permissionCache
    }

    try {
      // 如果用户未登录，返回null
      if (!authService.isLoggedIn()) {
        return null
      }

      // 获取用户权限
      const response = await axios.get('/api/v1/user/permissions', {
        headers: authService.getAuthHeader()
      })

      // 更新缓存
      this._permissionCache = response.data
      this._permissionCacheExpiry = now + this._cacheDuration

      return this._permissionCache
    } catch (error: any) {
      console.error('获取用户权限失败:', error)
      return null
    }
  }

  /**
   * 检查用户是否有指定权限
   * @param permissionCode 权限代码
   * @returns 是否有权限
   */
  async hasPermission(permissionCode: string): Promise<boolean> {
    // 检查缓存
    const now = Date.now()
    const cacheKey = `perm:${permissionCode}`
    const cached = this._checkResultCache.get(cacheKey)
    
    if (cached && now - cached.timestamp < this._checkCacheDuration) {
      return cached.result
    }

    try {
      // 管理员拥有所有权限
      if (authService.isAdmin()) {
        this._cacheCheckResult(cacheKey, true)
        return true
      }

      // 获取用户权限
      const userPermissions = await this.getUserPermissions()
      
      if (!userPermissions) {
        this._cacheCheckResult(cacheKey, false)
        return false
      }

      // 检查是否有指定权限
      const hasPermission = userPermissions.permissions.includes(permissionCode)
      this._cacheCheckResult(cacheKey, hasPermission)
      
      return hasPermission
    } catch (error) {
      console.error(`检查权限失败 (${permissionCode}):`, error)
      return false
    }
  }

  /**
   * 检查用户是否有指定角色
   * @param roleCode 角色代码
   * @returns 是否有角色
   */
  async hasRole(roleCode: string): Promise<boolean> {
    // 检查缓存
    const now = Date.now()
    const cacheKey = `role:${roleCode}`
    const cached = this._checkResultCache.get(cacheKey)
    
    if (cached && now - cached.timestamp < this._checkCacheDuration) {
      return cached.result
    }

    try {
      // 管理员拥有所有角色
      if (authService.isAdmin()) {
        this._cacheCheckResult(cacheKey, true)
        return true
      }

      // 获取用户权限
      const userPermissions = await this.getUserPermissions()
      
      if (!userPermissions) {
        this._cacheCheckResult(cacheKey, false)
        return false
      }

      // 检查是否有指定角色
      const hasRole = userPermissions.roles.includes(roleCode)
      this._cacheCheckResult(cacheKey, hasRole)
      
      return hasRole
    } catch (error) {
      console.error(`检查角色失败 (${roleCode}):`, error)
      return false
    }
  }

  /**
   * 检查用户是否有指定的任意一个权限
   * @param permissionCodes 权限代码列表
   * @returns 是否有任意一个权限
   */
  async hasAnyPermission(permissionCodes: string[]): Promise<boolean> {
    try {
      // 管理员拥有所有权限
      if (authService.isAdmin()) {
        return true
      }

      // 获取用户权限
      const userPermissions = await this.getUserPermissions()
      
      if (!userPermissions) {
        return false
      }

      // 检查是否有任意一个指定权限
      return permissionCodes.some(code => userPermissions.permissions.includes(code))
    } catch (error) {
      console.error(`检查多个权限失败:`, error)
      return false
    }
  }

  /**
   * 检查用户是否有指定的所有权限
   * @param permissionCodes 权限代码列表
   * @returns 是否有所有权限
   */
  async hasAllPermissions(permissionCodes: string[]): Promise<boolean> {
    try {
      // 管理员拥有所有权限
      if (authService.isAdmin()) {
        return true
      }

      // 获取用户权限
      const userPermissions = await this.getUserPermissions()
      
      if (!userPermissions) {
        return false
      }

      // 检查是否有所有指定权限
      return permissionCodes.every(code => userPermissions.permissions.includes(code))
    } catch (error) {
      console.error(`检查多个权限失败:`, error)
      return false
    }
  }

  /**
   * 检查用户是否有指定的任意一个角色
   * @param roleCodes 角色代码列表
   * @returns 是否有任意一个角色
   */
  async hasAnyRole(roleCodes: string[]): Promise<boolean> {
    try {
      // 管理员拥有所有角色
      if (authService.isAdmin()) {
        return true
      }

      // 获取用户权限
      const userPermissions = await this.getUserPermissions()
      
      if (!userPermissions) {
        return false
      }

      // 检查是否有任意一个指定角色
      return roleCodes.some(code => userPermissions.roles.includes(code))
    } catch (error) {
      console.error(`检查多个角色失败:`, error)
      return false
    }
  }

  /**
   * 检查用户是否有访问特定功能的权限
   * @param featureCode 功能代码
   * @returns 是否有权限访问
   */
  async canAccessFeature(featureCode: string): Promise<boolean> {
    // 检查缓存
    const now = Date.now()
    const cacheKey = `feature:${featureCode}`
    const cached = this._checkResultCache.get(cacheKey)
    
    if (cached && now - cached.timestamp < this._checkCacheDuration) {
      return cached.result
    }

    try {
      // 管理员可以访问所有功能
      if (authService.isAdmin()) {
        this._cacheCheckResult(cacheKey, true)
        return true
      }

      // 调用API检查功能访问权限
      const response = await axios.get(`/api/v1/permissions/check-feature/${featureCode}`, {
        headers: authService.getAuthHeader()
      })

      const hasAccess = response.data.hasAccess
      this._cacheCheckResult(cacheKey, hasAccess)
      
      return hasAccess
    } catch (error: any) {
      console.error(`检查功能访问权限失败 (${featureCode}):`, error)
      
      // 如果是404错误，可能是API尚未实现，默认允许访问
      if (error.response && error.response.status === 404) {
        console.warn(`功能访问检查API不存在，默认允许访问: ${featureCode}`)
        return true
      }
      
      return false
    }
  }

  /**
   * 检查用户是否有访问特定资源的权限
   * @param resourceType 资源类型
   * @param resourceId 资源ID
   * @param action 操作类型 (read, write, delete, etc.)
   * @returns 是否有权限
   */
  async canAccessResource(resourceType: string, resourceId: string | number, action: string): Promise<boolean> {
    // 检查缓存
    const now = Date.now()
    const cacheKey = `resource:${resourceType}:${resourceId}:${action}`
    const cached = this._checkResultCache.get(cacheKey)
    
    if (cached && now - cached.timestamp < this._checkCacheDuration) {
      return cached.result
    }

    try {
      // 管理员可以访问所有资源
      if (authService.isAdmin()) {
        this._cacheCheckResult(cacheKey, true)
        return true
      }

      // 调用API检查资源访问权限
      const response = await axios.post('/api/v1/permissions/check-resource', {
        resourceType,
        resourceId,
        action
      }, {
        headers: authService.getAuthHeader()
      })

      const hasAccess = response.data.hasAccess
      this._cacheCheckResult(cacheKey, hasAccess)
      
      return hasAccess
    } catch (error: any) {
      console.error(`检查资源访问权限失败 (${resourceType}/${resourceId}/${action}):`, error)
      
      // 如果是404错误，可能是API尚未实现，默认允许访问
      if (error.response && error.response.status === 404) {
        console.warn(`资源访问检查API不存在，默认允许访问: ${resourceType}/${resourceId}/${action}`)
        return true
      }
      
      return false
    }
  }

  /**
   * 检查用户是否有访问特定订阅级别功能的权限
   * @param requiredLevel 所需订阅级别
   * @returns 是否有权限
   */
  async checkSubscriptionAccess(requiredLevel: string): Promise<boolean> {
    try {
      // 管理员可以访问所有订阅级别
      if (authService.isAdmin()) {
        return true
      }

      // 调用API检查订阅级别
      const response = await axios.get(`/api/v1/user/subscription-access/${requiredLevel}`, {
        headers: authService.getAuthHeader()
      })

      return response.data.hasAccess
    } catch (error) {
      console.error(`检查订阅级别访问权限失败 (${requiredLevel}):`, error)
      return false
    }
  }

  /**
   * 清除权限缓存
   */
  clearCache(): void {
    this._permissionCache = null
    this._permissionCacheExpiry = 0
    this._checkResultCache.clear()
    console.log('权限缓存已清除')
  }

  /**
   * 获取所有权限列表
   * @returns 权限列表
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      const response = await axios.get('/api/v1/permissions', {
        headers: authService.getAuthHeader()
      })
      return response.data
    } catch (error) {
      console.error('获取权限列表失败:', error)
      const { showToast } = useToast()
      showToast('获取权限列表失败', 'error')
      return []
    }
  }

  /**
   * 获取所有角色列表
   * @returns 角色列表
   */
  async getAllRoles(): Promise<Role[]> {
    try {
      const response = await axios.get('/api/v1/roles', {
        headers: authService.getAuthHeader()
      })
      return response.data
    } catch (error) {
      console.error('获取角色列表失败:', error)
      const { showToast } = useToast()
      showToast('获取角色列表失败', 'error')
      return []
    }
  }

  /**
   * 创建新角色
   * @param role 角色数据
   * @returns 创建的角色
   */
  async createRole(role: Partial<Role>): Promise<Role | null> {
    try {
      const response = await axios.post('/api/v1/roles', role, {
        headers: authService.getAuthHeader()
      })
      const { showToast } = useToast()
      showToast('角色创建成功', 'success')
      return response.data
    } catch (error) {
      console.error('创建角色失败:', error)
      const { showToast } = useToast()
      showToast('创建角色失败', 'error')
      return null
    }
  }

  /**
   * 更新角色
   * @param id 角色ID
   * @param role 角色数据
   * @returns 更新后的角色
   */
  async updateRole(id: number, role: Partial<Role>): Promise<Role | null> {
    try {
      const response = await axios.put(`/api/v1/roles/${id}`, role, {
        headers: authService.getAuthHeader()
      })
      const { showToast } = useToast()
      showToast('角色更新成功', 'success')
      return response.data
    } catch (error) {
      console.error('更新角色失败:', error)
      const { showToast } = useToast()
      showToast('更新角色失败', 'error')
      return null
    }
  }

  /**
   * 删除角色
   * @param id 角色ID
   * @returns 是否成功
   */
  async deleteRole(id: number): Promise<boolean> {
    try {
      await axios.delete(`/api/v1/roles/${id}`, {
        headers: authService.getAuthHeader()
      })
      const { showToast } = useToast()
      showToast('角色删除成功', 'success')
      return true
    } catch (error) {
      console.error('删除角色失败:', error)
      const { showToast } = useToast()
      showToast('删除角色失败', 'error')
      return false
    }
  }

  /**
   * 为角色分配权限
   * @param roleId 角色ID
   * @param permissionIds 权限ID列表
   * @returns 是否成功
   */
  async assignPermissionsToRole(roleId: number, permissionIds: number[]): Promise<boolean> {
    try {
      await axios.post(`/api/v1/roles/${roleId}/permissions`, { permissionIds }, {
        headers: authService.getAuthHeader()
      })
      const { showToast } = useToast()
      showToast('权限分配成功', 'success')
      return true
    } catch (error) {
      console.error('分配权限失败:', error)
      const { showToast } = useToast()
      showToast('分配权限失败', 'error')
      return false
    }
  }

  /**
   * 为用户分配角色
   * @param userId 用户ID
   * @param roleIds 角色ID列表
   * @returns 是否成功
   */
  async assignRolesToUser(userId: string, roleIds: number[]): Promise<boolean> {
    try {
      await axios.post(`/api/v1/users/${userId}/roles`, { roleIds }, {
        headers: authService.getAuthHeader()
      })
      const { showToast } = useToast()
      showToast('角色分配成功', 'success')
      
      // 清除权限缓存
      this.clearCache()
      
      return true
    } catch (error) {
      console.error('分配角色失败:', error)
      const { showToast } = useToast()
      showToast('分配角色失败', 'error')
      return false
    }
  }

  /**
   * 为用户分配直接权限
   * @param userId 用户ID
   * @param permissionIds 权限ID列表
   * @returns 是否成功
   */
  async assignPermissionsToUser(userId: string, permissionIds: number[]): Promise<boolean> {
    try {
      await axios.post(`/api/v1/users/${userId}/permissions`, { permissionIds }, {
        headers: authService.getAuthHeader()
      })
      const { showToast } = useToast()
      showToast('权限分配成功', 'success')
      
      // 清除权限缓存
      this.clearCache()
      
      return true
    } catch (error) {
      console.error('分配权限失败:', error)
      const { showToast } = useToast()
      showToast('分配权限失败', 'error')
      return false
    }
  }

  /**
   * 缓存权限检查结果
   * @param key 缓存键
   * @param result 检查结果
   */
  private _cacheCheckResult(key: string, result: boolean): void {
    this._checkResultCache.set(key, {
      result,
      timestamp: Date.now()
    })
  }
}

// 导出权限服务实例
export const permissionService = new PermissionService()