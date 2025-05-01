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
    return next()
  }

  // 如果路由需要管理员权限，但用户不是管理员，重定向到仪表盘
  if (to.meta.requiresAdmin) {
    ElMessage({
      message: '该页面仅管理员可访问',
      type: 'warning',
      duration: 3000,
    })
    return next({ name: 'dashboard' })
  }

  // 获取用户会员等级
  const userLevel = userStore.membershipLevel

  // 获取页面所需的会员等级
  const requiredLevel = getRequiredMembershipLevel(to.path)

  // 检查用户会员等级是否满足要求
  if (!checkMembershipLevel(userLevel, requiredLevel)) {
    // 获取功能名称
    const feature = PAGE_FEATURE_MAP[to.path]

    // 显示提示信息
    ElMessage({
      message: `访问${feature ? `"${feature}"` : '此功能'}需要会员权限，请充值逗币兑换会员`,
      type: 'warning',
      duration: 5000,
    })

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
