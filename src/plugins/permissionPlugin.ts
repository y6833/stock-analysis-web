/**
 * 权限插件
 * 全局注册权限指令和提供权限相关功能
 */

import type { App } from 'vue'
import { vPermission } from '@/directives/permissionDirective'
import { permissionService } from '@/services/permissionService'

/**
 * 权限插件
 * @param app Vue应用实例
 * @param options 插件选项
 */
export default {
  install: (app: App, options = {}) => {
    // 注册全局权限指令
    app.directive('permission', vPermission)

    // 将权限服务添加到全局属性
    app.config.globalProperties.$permissions = permissionService

    // 添加全局权限检查方法
    app.config.globalProperties.$hasPermission = async (permissionCode: string) => {
      return await permissionService.hasPermission(permissionCode)
    }

    app.config.globalProperties.$hasRole = async (roleCode: string) => {
      return await permissionService.hasRole(roleCode)
    }

    // 添加全局权限检查方法到Vue实例
    app.provide('permissionService', permissionService)
  }
}