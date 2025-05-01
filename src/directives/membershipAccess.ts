/**
 * 会员功能访问限制指令
 * 用于根据用户会员等级限制功能访问
 */

import type { Directive, DirectiveBinding } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useToast } from '@/composables/useToast'

interface MembershipAccessOptions {
  feature: string
  params?: Record<string, any>
  disableMode?: 'hide' | 'disable' | 'blur'
  message?: string
}

/**
 * 会员功能访问限制指令
 * 
 * 使用方式:
 * v-membership-access="{ feature: 'feature_name', params: { param1: value1 }, disableMode: 'disable', message: '提示信息' }"
 * 
 * @param feature 功能名称
 * @param params 附加参数
 * @param disableMode 禁用模式: hide(隐藏元素), disable(禁用元素), blur(模糊显示)
 * @param message 提示信息
 */
export const membershipAccess: Directive = {
  async mounted(el: HTMLElement, binding: DirectiveBinding) {
    await checkAccess(el, binding)
  },
  
  async updated(el: HTMLElement, binding: DirectiveBinding) {
    await checkAccess(el, binding)
  }
}

// 检查访问权限
async function checkAccess(el: HTMLElement, binding: DirectiveBinding) {
  // 获取指令值
  const options = binding.value as MembershipAccessOptions
  
  if (!options || !options.feature) {
    console.error('会员功能访问限制指令缺少必要参数')
    return
  }
  
  // 获取用户存储
  const userStore = useUserStore()
  
  // 检查功能访问权限
  const hasAccess = await userStore.checkFeatureAccess(options.feature, options.params || {})
  
  // 根据权限设置元素状态
  if (!hasAccess) {
    applyRestriction(el, options)
  } else {
    removeRestriction(el, options)
  }
}

// 应用限制
function applyRestriction(el: HTMLElement, options: MembershipAccessOptions) {
  const disableMode = options.disableMode || 'disable'
  
  // 保存原始状态
  if (!el.dataset.originalDisplay) {
    el.dataset.originalDisplay = el.style.display
  }
  
  if (!el.dataset.originalFilter) {
    el.dataset.originalFilter = el.style.filter
  }
  
  if (!el.dataset.originalCursor) {
    el.dataset.originalCursor = el.style.cursor
  }
  
  // 应用限制
  switch (disableMode) {
    case 'hide':
      el.style.display = 'none'
      break
      
    case 'disable':
      el.setAttribute('disabled', 'disabled')
      el.style.opacity = '0.5'
      el.style.cursor = 'not-allowed'
      
      // 阻止点击事件
      el.addEventListener('click', preventClick, true)
      break
      
    case 'blur':
      el.style.filter = 'blur(3px)'
      el.style.opacity = '0.7'
      el.style.cursor = 'not-allowed'
      
      // 阻止点击事件
      el.addEventListener('click', preventClick, true)
      break
  }
  
  // 添加提示事件
  if (options.message) {
    el.addEventListener('click', () => showMessage(options.message || ''), true)
  }
}

// 移除限制
function removeRestriction(el: HTMLElement, options: MembershipAccessOptions) {
  // 恢复原始状态
  if (el.dataset.originalDisplay) {
    el.style.display = el.dataset.originalDisplay
  }
  
  if (el.dataset.originalFilter) {
    el.style.filter = el.dataset.originalFilter
  }
  
  if (el.dataset.originalCursor) {
    el.style.cursor = el.dataset.originalCursor
  }
  
  // 移除禁用属性
  el.removeAttribute('disabled')
  el.style.opacity = '1'
  
  // 移除事件监听
  el.removeEventListener('click', preventClick, true)
  
  // 清除数据属性
  delete el.dataset.originalDisplay
  delete el.dataset.originalFilter
  delete el.dataset.originalCursor
}

// 阻止点击事件
function preventClick(event: Event) {
  event.stopPropagation()
  event.preventDefault()
}

// 显示提示信息
function showMessage(message: string) {
  const { showToast } = useToast()
  showToast(message || '此功能需要升级会员才能使用', 'warning')
}

export default membershipAccess
