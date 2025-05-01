/**
 * 会员功能插件
 * 注册会员功能相关的全局组件和指令
 */

import type { App } from 'vue'
import { membershipAccess } from '@/directives/membershipAccess'
import MembershipFeature from '@/components/common/MembershipFeature.vue'

export default {
  install(app: App) {
    // 注册指令
    app.directive('membership-access', membershipAccess)
    
    // 注册组件
    app.component('MembershipFeature', MembershipFeature)
  }
}
