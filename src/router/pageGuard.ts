/**
 * 页面权限路由守卫
 * 基于动态页面配置检查用户访问权限
 */

import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/userStore'
import pageService from '@/services/pageService'

// 用于存储已经显示过提示的页面路径
// 使用会话存储，这样页面刷新后仍然有效，但关闭浏览器后会重置
const SESSION_STORAGE_KEY = 'shown_permission_messages'

// 从会话存储中获取已显示的消息
const getShownPermissionMessages = (): Set<string> => {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (stored) {
      return new Set(JSON.parse(stored))
    }
  } catch (error) {
    console.error('Failed to parse shown permission messages:', error)
  }
  return new Set()
}

// 将显示过的消息保存到会话存储
const saveShownPermissionMessages = (messages: Set<string>): void => {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([...messages]))
  } catch (error) {
    console.error('Failed to save shown permission messages:', error)
  }
}

// 检查是否已经显示过提示
const hasShownPermissionMessage = (path: string): boolean => {
  const messages = getShownPermissionMessages()
  return messages.has(path)
}

// 标记已经显示过提示
const markPermissionMessageShown = (path: string): void => {
  const messages = getShownPermissionMessages()
  messages.add(path)
  saveShownPermissionMessages(messages)
}

/**
 * 页面权限路由守卫
 * @param to 目标路由
 * @param from 来源路由
 * @param next 下一步函数
 */
export async function pageGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  // 获取用户存储
  const userStore = useUserStore()

  // 如果用户未登录或路由不需要认证，直接放行
  if (!userStore.isAuthenticated || !to.meta.requiresAuth) {
    return next()
  }

  // 如果用户是管理员，直接放行
  if (userStore.userRole === 'admin') {
    console.log(`[页面守卫] 用户是管理员，直接放行: ${to.path}`)
    return next()
  }

  // 输出用户会员信息，帮助诊断问题
  console.log('[页面守卫] 用户会员信息:', {
    membershipLevel: userStore.membershipLevel,
    isPremium: userStore.isPremium,
    userId: userStore.userId,
    username: userStore.username,
  })

  try {
    // 检查页面访问权限
    const hasAccess = await pageService.checkPageAccess(to.path)

    if (!hasAccess) {
      // 检查是否已经显示过提示
      if (!hasShownPermissionMessage(to.path)) {
        // 显示提示信息
        ElMessage({
          message: `您没有权限访问此页面，请充值逗币兑换会员`,
          type: 'warning',
          duration: 5000,
        })

        // 标记已经显示过提示
        markPermissionMessageShown(to.path)
      }

      // 重定向到会员功能页面，并传递目标路径
      return next({
        path: '/membership-features',
        query: {
          redirect: to.fullPath,
        },
      })
    }
  } catch (error) {
    console.error('检查页面权限失败:', error)

    // 如果是数据库表不存在的错误，不显示错误消息
    if (
      error instanceof Error &&
      error.message &&
      (error.message.includes("doesn't exist") || error.message.includes('no such table'))
    ) {
      console.warn('页面管理表不存在，回退到会员等级守卫')
    } else {
      // 其他错误可以显示提示
      ElMessage({
        message: '页面权限检查失败，使用默认权限检查',
        type: 'warning',
        duration: 3000,
      })
    }

    // 出错时，使用默认的会员等级守卫
    return import('./membershipGuard').then(({ default: membershipGuard }) => {
      return membershipGuard(to, from, next)
    })
  }

  // 满足要求，放行
  return next()
}

export default pageGuard
