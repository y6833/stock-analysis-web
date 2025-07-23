/**
 * 权限管理 Composable
 * 提供在Vue组件中使用权限检查的功能
 */

import { ref, computed } from 'vue'
import { permissionService } from '@/services/permissionService'
import { authService } from '@/services/authService'

/**
 * 权限管理 Composable
 * @returns 权限检查相关的方法和状态
 */
export function usePermission() {
  // 权限检查状态
  const isChecking = ref(false)
  const checkError = ref<string | null>(null)

  // 计算属性：是否为管理员
  const isAdmin = computed(() => authService.isAdmin())

  /**
   * 检查用户是否有指定权限
   * @param permissionCode 权限代码
   * @returns 是否有权限
   */
  async function hasPermission(permissionCode: string): Promise<boolean> {
    if (!authService.isLoggedIn()) return false
    if (isAdmin.value) return true

    isChecking.value = true
    checkError.value = null

    try {
      const result = await permissionService.hasPermission(permissionCode)
      return result
    } catch (error: any) {
      checkError.value = error.message || '权限检查失败'
      return false
    } finally {
      isChecking.value = false
    }
  }

  /**
   * 检查用户是否有指定角色
   * @param roleCode 角色代码
   * @returns 是否有角色
   */
  async function hasRole(roleCode: string): Promise<boolean> {
    if (!authService.isLoggedIn()) return false
    if (isAdmin.value) return true

    isChecking.value = true
    checkError.value = null

    try {
      const result = await permissionService.hasRole(roleCode)
      return result
    } catch (error: any) {
      checkError.value = error.message || '角色检查失败'
      return false
    } finally {
      isChecking.value = false
    }
  }

  /**
   * 检查用户是否有指定的任意一个权限
   * @param permissionCodes 权限代码列表
   * @returns 是否有任意一个权限
   */
  async function hasAnyPermission(permissionCodes: string[]): Promise<boolean> {
    if (!authService.isLoggedIn()) return false
    if (isAdmin.value) return true
    if (permissionCodes.length === 0) return false

    isChecking.value = true
    checkError.value = null

    try {
      const result = await permissionService.hasAnyPermission(permissionCodes)
      return result
    } catch (error: any) {
      checkError.value = error.message || '权限检查失败'
      return false
    } finally {
      isChecking.value = false
    }
  }

  /**
   * 检查用户是否有指定的所有权限
   * @param permissionCodes 权限代码列表
   * @returns 是否有所有权限
   */
  async function hasAllPermissions(permissionCodes: string[]): Promise<boolean> {
    if (!authService.isLoggedIn()) return false
    if (isAdmin.value) return true
    if (permissionCodes.length === 0) return true

    isChecking.value = true
    checkError.value = null

    try {
      const result = await permissionService.hasAllPermissions(permissionCodes)
      return result
    } catch (error: any) {
      checkError.value = error.message || '权限检查失败'
      return false
    } finally {
      isChecking.value = false
    }
  }

  /**
   * 检查用户是否有指定的任意一个角色
   * @param roleCodes 角色代码列表
   * @returns 是否有任意一个角色
   */
  async function hasAnyRole(roleCodes: string[]): Promise<boolean> {
    if (!authService.isLoggedIn()) return false
    if (isAdmin.value) return true
    if (roleCodes.length === 0) return false

    isChecking.value = true
    checkError.value = null

    try {
      const result = await permissionService.hasAnyRole(roleCodes)
      return result
    } catch (error: any) {
      checkError.value = error.message || '角色检查失败'
      return false
    } finally {
      isChecking.value = false
    }
  }

  /**
   * 检查用户是否有访问特定功能的权限
   * @param featureCode 功能代码
   * @returns 是否有权限访问
   */
  async function canAccessFeature(featureCode: string): Promise<boolean> {
    if (!authService.isLoggedIn()) return false
    if (isAdmin.value) return true

    isChecking.value = true
    checkError.value = null

    try {
      const result = await permissionService.canAccessFeature(featureCode)
      return result
    } catch (error: any) {
      checkError.value = error.message || '功能访问检查失败'
      return false
    } finally {
      isChecking.value = false
    }
  }

  /**
   * 检查用户是否有访问特定资源的权限
   * @param resourceType 资源类型
   * @param resourceId 资源ID
   * @param action 操作类型 (read, write, delete, etc.)
   * @returns 是否有权限
   */
  async function canAccessResource(resourceType: string, resourceId: string | number, action: string): Promise<boolean> {
    if (!authService.isLoggedIn()) return false
    if (isAdmin.value) return true

    isChecking.value = true
    checkError.value = null

    try {
      const result = await permissionService.canAccessResource(resourceType, resourceId, action)
      return result
    } catch (error: any) {
      checkError.value = error.message || '资源访问检查失败'
      return false
    } finally {
      isChecking.value = false
    }
  }

  /**
   * 检查用户是否有访问特定订阅级别功能的权限
   * @param requiredLevel 所需订阅级别
   * @returns 是否有权限
   */
  async function checkSubscriptionAccess(requiredLevel: string): Promise<boolean> {
    if (!authService.isLoggedIn()) return false
    if (isAdmin.value) return true

    isChecking.value = true
    checkError.value = null

    try {
      const result = await permissionService.checkSubscriptionAccess(requiredLevel)
      return result
    } catch (error: any) {
      checkError.value = error.message || '订阅级别检查失败'
      return false
    } finally {
      isChecking.value = false
    }
  }

  /**
   * 清除权限缓存
   */
  function clearPermissionCache(): void {
    permissionService.clearCache()
  }

  return {
    // 状态
    isChecking,
    checkError,
    isAdmin,

    // 方法
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    hasAnyRole,
    canAccessFeature,
    canAccessResource,
    checkSubscriptionAccess,
    clearPermissionCache
  }
}