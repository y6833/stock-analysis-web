/**
 * 会员等级路由守卫
 *
 * 注意：此守卫已被弃用，仅作为兼容层保留
 * 所有权限检查现在统一使用 pageGuard
 */

import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { pageGuard } from './pageGuard'

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
  console.log('[会员守卫] 已弃用，转发到页面守卫:', to.path)
  return pageGuard(to, from, next)
}

export default membershipGuard
