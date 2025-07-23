/**
 * 离线模式组合式函数
 * 提供离线模式相关的功能和状态
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useNetworkStatus } from '@/services/networkStatusService';
import { 
  isPwaSupported, 
  isBackgroundSyncSupported, 
  isPushNotificationSupported,
  getAllOfflineDataKeys,
  getOfflineData,
  clearAllOfflineData
} from '@/services/offlineDataService';

export function useOfflineMode() {
  const { isOnline, isOffline, isPoorConnection, networkQuality, connectionType } = useNetworkStatus();
  
  // 离线功能支持状态
  const pwaSupported = ref(isPwaSupported());
  const backgroundSyncSupported = ref(isBackgroundSyncSupported());
  const pushNotificationSupported = ref(isPushNotificationSupported());
  
  // 离线数据状态
  const offlineDataKeys = ref<string[]>([]);
  const offlineDataSize = ref(0);
  const isLoadingOfflineData = ref(false);
  
  // 离线模式设置
  const offlineModeEnabled = ref(localStorage.getItem('offline_mode_enabled') === 'true');
  const autoSyncEnabled = ref(localStorage.getItem('auto_sync_enabled') === 'true');
  const dataPreloadEnabled = ref(localStorage.getItem('data_preload_enabled') === 'true');
  
  // 计算属性
  const isOfflineAvailable = computed(() => pwaSupported.value && offlineDataKeys.value.length > 0);
  const shouldShowOfflineIndicator = computed(() => 
    isOffline.value || (isPoorConnection.value && offlineModeEnabled.value)
  );
  
  // 加载离线数据信息
  async function loadOfflineDataInfo() {
    try {
      isLoadingOfflineData.value = true;
      offlineDataKeys.value = await getAllOfflineDataKeys();
      
      // 计算离线数据大小
      let totalSize = 0;
      for (const key of offlineDataKeys.value) {
        const data = await getOfflineData(key);
        if (data) {
          totalSize += new Blob([JSON.stringify(data)]).size;
        }
      }
      offlineDataSize.value = totalSize;
    } catch (error) {
      console.error('加载离线数据信息时出错:', error);
    } finally {
      isLoadingOfflineData.value = false;
    }
  }
  
  // 切换离线模式
  function toggleOfflineMode(enabled: boolean) {
    offlineModeEnabled.value = enabled;
    localStorage.setItem('offline_mode_enabled', enabled.toString());
  }
  
  // 切换自动同步
  function toggleAutoSync(enabled: boolean) {
    autoSyncEnabled.value = enabled;
    localStorage.setItem('auto_sync_enabled', enabled.toString());
  }
  
  // 切换数据预加载
  function toggleDataPreload(enabled: boolean) {
    dataPreloadEnabled.value = enabled;
    localStorage.setItem('data_preload_enabled', enabled.toString());
  }
  
  // 清除所有离线数据
  async function clearOfflineData() {
    try {
      await clearAllOfflineData();
      await loadOfflineDataInfo();
      return true;
    } catch (error) {
      console.error('清除离线数据时出错:', error);
      return false;
    }
  }
  
  // 格式化数据大小
  function formatDataSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  }
  
  // 生命周期钩子
  onMounted(() => {
    loadOfflineDataInfo();
  });
  
  return {
    // 网络状态
    isOnline,
    isOffline,
    isPoorConnection,
    networkQuality,
    connectionType,
    
    // 离线功能支持
    pwaSupported,
    backgroundSyncSupported,
    pushNotificationSupported,
    
    // 离线数据
    offlineDataKeys,
    offlineDataSize,
    formatDataSize,
    isLoadingOfflineData,
    loadOfflineDataInfo,
    clearOfflineData,
    
    // 离线模式设置
    offlineModeEnabled,
    autoSyncEnabled,
    dataPreloadEnabled,
    toggleOfflineMode,
    toggleAutoSync,
    toggleDataPreload,
    
    // 计算属性
    isOfflineAvailable,
    shouldShowOfflineIndicator
  };
}