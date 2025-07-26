/**
 * 离线模式插件
 * 提供全局离线模式功能和组件
 */

import type { App } from 'vue';
import { initPwa } from './pwa';
import { initNetworkMonitoring } from '@/services/networkStatusService';
import OfflineIndicator from '@/components/common/OfflineIndicator.vue';
import OfflineStatusBar from '@/components/layout/OfflineStatusBar.vue';
import NetworkAwareImage from '@/components/common/NetworkAwareImage.vue';
import NetworkAwareDataTable from '@/components/common/NetworkAwareDataTable.vue';
import OfflineNotification from '@/components/common/OfflineNotification.vue';

export default {
  install(app: App) {
    // 注册全局组件
    app.component('OfflineIndicator', OfflineIndicator);
    app.component('OfflineStatusBar', OfflineStatusBar);
    app.component('NetworkAwareImage', NetworkAwareImage);
    app.component('NetworkAwareDataTable', NetworkAwareDataTable);
    app.component('OfflineNotification', OfflineNotification);

    // 初始化PWA功能
    if ('serviceWorker' in navigator) {
      initPwa();
    }

    // 初始化网络监控
    initNetworkMonitoring();

    // 添加全局属性
    app.config.globalProperties.$isOnline = navigator.onLine;

    // 监听网络状态变化
    window.addEventListener('online', () => {
      app.config.globalProperties.$isOnline = true;

      // 触发自定义事件
      window.dispatchEvent(new CustomEvent('app:online'));
    });

    window.addEventListener('offline', () => {
      app.config.globalProperties.$isOnline = false;

      // 触发自定义事件
      window.dispatchEvent(new CustomEvent('app:offline'));
    });
  }
};