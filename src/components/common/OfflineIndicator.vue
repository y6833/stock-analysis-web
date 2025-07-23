<template>
  <div 
    v-if="shouldShowOfflineIndicator" 
    :class="[
      'offline-indicator', 
      { 
        'is-offline': isOffline,
        'is-poor-connection': !isOffline && isPoorConnection
      }
    ]"
  >
    <el-icon><WarningFilled v-if="isOffline" /><Warning v-else /></el-icon>
    <span v-if="isOffline">离线模式</span>
    <span v-else-if="isPoorConnection">弱网络模式</span>
    <el-button 
      v-if="isOffline" 
      size="small" 
      @click="retryConnection"
    >
      重试连接
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { WarningFilled, Warning } from '@element-plus/icons-vue';
import { useOfflineMode } from '@/composables/useOfflineMode';
import { checkNetworkQuality } from '@/services/networkStatusService';

const { 
  isOffline, 
  isPoorConnection,
  shouldShowOfflineIndicator
} = useOfflineMode();

// 重试连接
async function retryConnection() {
  if (navigator.onLine) {
    // 如果浏览器认为已经在线，检查网络质量
    await checkNetworkQuality();
    // 刷新页面以重新加载应用
    window.location.reload();
  } else {
    // 如果浏览器认为离线，显示提示
    ElMessage({
      type: 'warning',
      message: '您仍处于离线状态。请检查网络连接后重试。'
    });
  }
}
</script>

<style scoped>
.offline-indicator {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 9999;
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.offline-indicator.is-offline {
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fde2e2;
}

.offline-indicator.is-poor-connection {
  background-color: #fdf6ec;
  color: #e6a23c;
  border: 1px solid #faecd8;
}

.offline-indicator .el-icon {
  margin-right: 8px;
  font-size: 16px;
}

.offline-indicator .el-button {
  margin-left: 16px;
}
</style>