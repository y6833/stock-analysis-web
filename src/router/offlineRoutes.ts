/**
 * 离线模式路由配置
 */

import { RouteRecordRaw } from 'vue-router';

// 离线模式路由
const offlineRoutes: RouteRecordRaw[] = [
  {
    path: '/settings/offline',
    name: 'OfflineSettings',
    component: () => import('@/views/settings/OfflineSettingsView.vue'),
    meta: {
      title: '离线模式设置',
      requiresAuth: true,
      icon: 'cloud-off',
      order: 3
    }
  }
];

export default offlineRoutes;