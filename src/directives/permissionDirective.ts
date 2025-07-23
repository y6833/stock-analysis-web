/**
 * 权限指令
 * 提供基于权限控制元素显示的Vue指令
 */

import type { Directive, DirectiveBinding } from 'vue'
import { permissionService } from '@/services/permissionService'
import { authService } from '@/services/authService'

// 权限检查结果缓存
const checkResultCache = new Map<string, { result: boolean; timestamp: number }>()
const CACHE_DURATION = 60 * 1000 // 1分钟缓存

/**
 * 缓存权限检查结果
 * @param key 缓存键
 * @param result 检查结果
 */
function cacheResult(key: string, result: boolean): void {
  checkResultCache.set(key, {
    result,
    timestamp: Date.now()
  })
}

/**
 * 获取缓存的权限检查结果
 * @param key 缓存键
 * @returns 缓存的结果或undefined
 */
function getCachedResult(key: string): boolean | undefined {
  const cached = checkResultCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.result
  }
  return undefined
}

/**
 * 检查权限并更新元素可见性
 * @param el 目标元素
 * @param binding 指令绑定值
 */
async function checkPermissionAndUpdateVisibility(el: HTMLElement, binding: DirectiveBinding): Promise<void> {
  // 获取指令参数
  const { value, arg } = binding

  // 如果没有提供值，则不做任何操作
  if (!value) return

  // 确定检查类型
  const checkType = arg || 'permission'

  // 构建缓存键
  const cacheKey = `${checkType}:${typeof value === 'string' ? value : JSON.stringify(value)}`

  // 检查缓存
  const cachedResult = getCachedResult(cacheKey)
  if (cachedResult !== undefined) {
    updateElementVisibility(el, cachedResult)
    return
  }

  // 管理员始终有权限
  if (authService.isAdmin()) {
    updateElementVisibility(el, true)
    cacheResult(cacheKey, true)
    return
  }

  // 根据不同类型进行权限检查
  let hasPermission = false

  try {
    switch (checkType) {
      case 'permission':
        // 单个权限或权限列表
        if (Array.isArray(value)) {
          hasPermission = await permissionService.hasAnyPermission(value)
        } else {
          hasPermission = await permissionService.hasPermission(value)
        }
        break

      case 'allPermissions':
        // 必须拥有所有权限
        hasPermission = await permissionService.hasAllPermissions(value)
        break

      case 'role':
        // 单个角色或角色列表
        if (Array.isArray(value)) {
          hasPermission = await permissionService.hasAnyRole(value)
        } else {
          hasPermission = await permissionService.hasRole(value)
        }
        break

      case 'feature':
        // 功能访问权限
        hasPermission = await permissionService.canAccessFeature(value)
        break

      case 'subscription':
        // 订阅级别检查
        hasPermission = await permissionService.checkSubscriptionAccess(value)
        break

      case 'resource':
        // 资源访问权限 { type, id, action }
        if (typeof value === 'object' && value.type && value.id && value.action) {
          hasPermission = await permissionService.canAccessResource(value.type, value.id, value.action)
        }
        break

      default:
        console.warn(`未知的权限检查类型: ${checkType}`)
        hasPermission = false
    }
  } catch (error) {
    console.error('权限检查失败:', error)
    hasPermission = false
  }

  // 缓存结果
  cacheResult(cacheKey, hasPermission)

  // 更新元素可见性
  updateElementVisibility(el, hasPermission)
}

/**
 * 更新元素可见性
 * @param el 目标元素
 * @param hasPermission 是否有权限
 */
function updateElementVisibility(el: HTMLElement, hasPermission: boolean): void {
  if (hasPermission) {
    // 如果有权限，恢复元素显示
    if (el.hasAttribute('data-permission-display')) {
      const originalDisplay = el.getAttribute('data-permission-display')
      el.style.display = originalDisplay !== 'none' ? originalDisplay : ''
      el.removeAttribute('data-permission-display')
    }
  } else {
    // 如果没有权限，隐藏元素
    if (!el.hasAttribute('data-permission-display')) {
      el.setAttribute('data-permission-display', el.style.display || 'block')
      el.style.display = 'none'
    }
  }
}

/**
 * 权限指令
 * 
 * 使用方法:
 * 1. 基本权限检查: v-permission="'user:read'"
 * 2. 多权限检查(任一): v-permission="['user:read', 'user:write']"
 * 3. 多权限检查(所有): v-permission:allPermissions="['user:read', 'user:write']"
 * 4. 角色检查: v-permission:role="'admin'"
 * 5. 功能检查: v-permission:feature="'advanced_analytics'"
 * 6. 订阅级别检查: v-permission:subscription="'premium'"
 * 7. 资源访问检查: v-permission:resource="{ type: 'report', id: 123, action: 'edit' }"
 */
export const vPermission: Directive = {
  // 指令挂载时
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    checkPermissionAndUpdateVisibility(el, binding)
  },

  // 指令值更新时
  updated(el: HTMLElement, binding: DirectiveBinding) {
    checkPermissionAndUpdateVisibility(el, binding)
  }
}

// 导出指令
export default vPermission