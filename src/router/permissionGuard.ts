/**
 * 权限路由守卫
 * 提供基于角色和权限的路由访问控制
 */

import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authService } from '@/services/authService'
import { permissionService } from '@/services/permissionService'
import { useUserStore } from '@/stores/userStore'

// 会话存储键
const SESSION_STORAGE_KEY = 'shown_permission_messages'

// 获取已显示的权限消息
const getShownPermissionMessages = (): Set<string> => {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

// 保存已显示的权限消息
const saveShownPermissionMessages = (messages: Set<string>): void => {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([...messages]))
  } catch (error) {
    console.error('保存已显示的权限消息失败:', error)
  }
}

// 检查是否已显示权限消息
const hasShownPermissionMessage = (path: string): boolean => {
  return getShownPermissionMessages().has(path)
}

// 标记权限消息已显示
const markPermissionMessageShown = (path: string): void => {
  const messages = getShownPermissionMessages()
  messages.add(path)
  saveShownPermissionMessages(messages)
}

/**
 * 权限路由守卫
 * 处理基于角色和权限的路由访问控制
 */
export async function permissionGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  // 提取路由元数据
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin)
  const requiredRoles = to.meta.requiredRoles as string[] | undefined
  const requiredPermissions = to.meta.requiredPermissions as string[] | undefined
  const requiredFeature = to.meta.requiredFeature as string | undefined
  const requiredMembershipLevel = to.meta.requiredMembershipLevel as string | undefined
  const membershipLevel = to.meta.membershipLevel as string | undefined

  // 如果路由不需要认证，直接放行
  if (!requiresAuth) {
    return next()
  }

  // 检查用户是否已登录
  const isLoggedIn = authService.isLoggedIn()
  if (!isLoggedIn) {
    return next({
      name: 'login',
      query: { redirect: to.fullPath },
    })
  }

  // 检查是否为管理员
  const isAdmin = authService.isAdmin()
  
  // 管理员可以访问所有页面
  if (isAdmin) {
    return next()
  }

  // 检查管理员专属页面
  if (requiresAdmin && !isAdmin) {
    if (!hasShownPermissionMessage('admin_required')) {
      ElMessage({
        message: '此功能需要管理员权限',
        type: 'warning',
        duration: 3000,
      })
      markPermissionMessageShown('admin_required')
    }
    return next({
      name: 'dashboard',
      query: { error: 'permission' },
    })
  }

  // 检查角色要求
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = await permissionService.hasAnyRole(requiredRoles)
    if (!hasRequiredRole) {
      if (!hasShownPermissionMessage(`role:${to.path}`)) {
        ElMessage({
          message: '您没有访问此页面所需的角色权限',
          type: 'warning',
          duration: 3000,
        })
        markPermissionMessageShown(`role:${to.path}`)
      }
      return next({
        name: 'dashboard',
        query: { error: 'permission' },
      })
    }
  }

  // 检查权限要求
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasRequiredPermission = await permissionService.hasAnyPermission(requiredPermissions)
    if (!hasRequiredPermission) {
      if (!hasShownPermissionMessage(`permission:${to.path}`)) {
        ElMessage({
          message: '您没有访问此页面所需的权限',
          type: 'warning',
          duration: 3000,
        })
        markPermissionMessageShown(`permission:${to.path}`)
      }
      return next({
        name: 'dashboard',
        query: { error: 'permission' },
      })
    }
  }

  // 检查功能访问权限
  if (requiredFeature) {
    const hasFeatureAccess = await permissionService.canAccessFeature(requiredFeature)
    if (!hasFeatureAccess) {
      if (!hasShownPermissionMessage(`feature:${to.path}`)) {
        ElMessage({
          message: '您没有访问此功能的权限',
          type: 'warning',
          duration: 3000,
        })
        markPermissionMessageShown(`feature:${to.path}`)
      }
      return next({
        name: 'membership-features',
        query: { redirect: to.fullPath },
      })
    }
  }

  // 检查订阅级别要求
  if (requiredMembershipLevel || membershipLevel) {
    const level = requiredMembershipLevel || membershipLevel
    if (level) {
      const hasSubscriptionAccess = await permissionService.checkSubscriptionAccess(level)
      if (!hasSubscriptionAccess) {
        if (!hasShownPermissionMessage(`subscription:${to.path}`)) {
          ElMessage({
            message: '您的会员级别不足以访问此功能，请升级会员',
            type: 'warning',
            duration: 5000,
          })
          markPermissionMessageShown(`subscription:${to.path}`)
        }
        return next({
          name: 'membership-features',
          query: { redirect: to.fullPath },
        })
      }
    }
  }

  // 所有权限检查通过，允许访问
  return next()
}