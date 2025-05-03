/**
 * 会员等级路由守卫
 * 用于检查用户是否有权限访问特定页面
 */

import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import {
  getRequiredMembershipLevel,
  checkMembershipLevel,
  PAGE_FEATURE_MAP,
} from '@/constants/membership'
import { ElMessage } from 'element-plus'

// 用于存储已经显示过提示的页面路径
// 使用会话存储，这样页面刷新后仍然有效，但关闭浏览器后会重置
const SESSION_STORAGE_KEY = 'shown_membership_messages'

// 从会话存储中获取已显示的消息
const getShownMembershipMessages = (): Set<string> => {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (stored) {
      return new Set(JSON.parse(stored))
    }
  } catch (error) {
    console.error('Failed to parse shown membership messages:', error)
  }
  return new Set()
}

// 将显示过的消息保存到会话存储
const saveShownMembershipMessages = (messages: Set<string>): void => {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([...messages]))
  } catch (error) {
    console.error('Failed to save shown membership messages:', error)
  }
}

// 检查是否已经显示过提示
const hasShownMembershipMessage = (path: string): boolean => {
  const messages = getShownMembershipMessages()
  return messages.has(path)
}

// 标记已经显示过提示
const markMembershipMessageShown = (path: string): void => {
  const messages = getShownMembershipMessages()
  messages.add(path)
  saveShownMembershipMessages(messages)
}

/**
 * 会员等级路由守卫
 * @param to 目标路由
 * @param from 来源路由
 * @param next 下一步函数
 */
export async function membershipGuard(
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
    console.log(`[会员守卫] 用户是管理员，直接放行: ${to.path}`)
    return next()
  }

  // 输出用户会员信息，帮助诊断问题
  console.log('[会员守卫] 用户会员信息:', {
    membershipLevel: userStore.membershipLevel,
    isPremium: userStore.isPremium,
    userId: userStore.userId,
    username: userStore.username,
  })

  // 如果路由需要管理员权限，但用户不是管理员，重定向到仪表盘
  if (to.meta.requiresAdmin) {
    // 检查是否已经显示过提示
    if (!hasShownMembershipMessage(to.path + '_admin')) {
      ElMessage({
        message: '该页面仅管理员可访问',
        type: 'warning',
        duration: 3000,
      })

      // 标记已经显示过提示
      markMembershipMessageShown(to.path + '_admin')
    }

    return next({ name: 'dashboard' })
  }

  // 获取用户会员等级
  const userLevel = userStore.membershipLevel

  // 调试输出会员信息
  console.log('[会员守卫] 用户信息:', {
    userId: userStore.userId,
    username: userStore.username,
    userRole: userStore.userRole,
    membershipLevel: userLevel,
    membershipInfo: userStore.membership,
    isPremium: userStore.isPremium,
    isAuthenticated: userStore.isAuthenticated,
  })

  // 获取页面所需的会员等级
  const requiredLevel = getRequiredMembershipLevel(to.path)
  console.log(`[会员守卫] 页面 ${to.path} 需要会员等级: ${requiredLevel}`)

  // 检查用户会员等级是否满足要求
  const hasAccess = checkMembershipLevel(userLevel, requiredLevel)
  console.log(`[会员守卫] 权限检查结果: ${hasAccess ? '允许访问' : '拒绝访问'}`)

  if (!hasAccess) {
    // 获取功能名称
    const feature = PAGE_FEATURE_MAP[to.path]

    // 检查是否已经显示过提示
    if (!hasShownMembershipMessage(to.path)) {
      // 显示提示信息
      ElMessage({
        message: `访问${feature ? `"${feature}"` : '此功能'}需要会员权限，请充值逗币兑换会员`,
        type: 'warning',
        duration: 5000,
      })

      // 标记已经显示过提示
      markMembershipMessageShown(to.path)
    }

    // 重定向到会员功能页面，并传递目标路径
    return next({
      path: '/membership-features',
      query: {
        redirect: to.fullPath,
        requiredLevel,
      },
    })
  }

  // 满足要求，放行
  return next()
}

export default membershipGuard
