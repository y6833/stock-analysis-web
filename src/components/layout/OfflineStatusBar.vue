<template>
  <div 
    v-if="shouldShowOfflineIndicator" 
    class="offline-status-bar"
    :class="{ 
      'is-offline': isOffline, 
      'is-poor-connection': !isOffline && isPoorConnection,
      'is-expanded': expanded
    }"
  >
    <div class="status-content">
      <div class="status-icon">
        <el-icon v-if="isOffline"><WarningFilled /></el-icon>
        <el-icon v-else><Warning /></el-icon>
      </div>
      
      <div class="status-message">
        <template v-if="isOffline">
          <strong>您当前处于离线模式</strong>
          <span v-if="!expanded">- 应用程序正在使用缓存数据</span>
          <p v-else class="expanded-message">
            应用程序正在使用缓存数据。部分功能可能不可用，数据可能不是最新的。
            恢复网络连接后，应用程序将自动同步您的更改。
          </p>
        </template>
        <template v-else-if="isPoorConnection">
          <strong>网络连接不稳定</strong>
          <span v-if="!expanded">- 已启用弱网络优化</span>
          <p v-else class="expanded-message">
            检测到网络连接不稳定。应用程序已启用弱网络优化，
            将优先使用缓存数据并减少网络请求，以提供更流畅的体验。
          </p>
        </template>
      </div>
    </div>
    
    <div class="status-actions">
      <template v-if="isOffline">
        <el-button 
          size="small" 
          @click="retryConnection"
        >
          重试连接
        </el-button>
      </template>
      <template v-else-if="isPoorConnection">
        <el-button 
          size="small" 
          @click="checkNetworkQuality"
        >
          检测网络
        </el-button>
      </template>
      
      <el-button 
        size="small" 
        @click="goToOfflineSettings"
      >
        离线设置
      </el-button>
      
      <el-button 
        size="small" 
        type="text" 
        @click="expanded = !expanded"
      >
        {{ expanded ? '收起' : '详情' }}
      </el-button>
      
      <el-button 
        size="small" 
        type="text" 
        @click="dismiss"
      >
        关闭
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { WarningFilled, Warning } from '@element-plus/icons-vue';
import { useOfflineMode } from '@/composables/useOfflineMode';
import { checkNetworkQuality } from '@/services/networkStatusService';

const router = useRouter();
const { 
  isOffline, 
  isPoorConnection,
  shouldShowOfflineIndicator
} = useOfflineMode();

// 本地状态
const expanded = ref(false);
const dismissed = ref(false);

// 计算是否应该显示状态栏
const shouldShow = computed(() => {
  if (dismissed.value) return false;
  return shouldShowOfflineIndicator.value;
});

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

// 前往离线设置页面
function goToOfflineSettings() {
  router.push('/settings/offline');
}

// 关闭状态栏
function dismiss() {
  dismissed.value = true;
  // 24小时内不再显示
  localStorage.setItem('offline_status_dismissed', Date.now().toString());
  
  setTimeout(() => {
    // 24小时后重置
    dismissed.value = false;
  }, 24 * 60 * 60 * 1000);
}

// 检查是否应该保持关闭状态
onMounted(() => {
  const dismissedTime = localStorage.getItem('offline_status_dismissed');
  if (dismissedTime) {
    const elapsed = Date.now() - parseInt(dismissedTime);
    if (elapsed < 24 * 60 * 60 * 1000) {
      dismissed.value = true;
    }
  }
});
</script>

<style scoped>
.offline-status-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2000;
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.offline-status-bar.is-offline {
  background-color: #fef0f0;
  color: #f56c6c;
  border-bottom: 1px solid #fde2e2;
}

.offline-status-bar.is-poor-connection {
  background-color: #fdf6ec;
  color: #e6a23c;
  border-bottom: 1px solid #faecd8;
}

.status-content {
  display: flex;
  align-items: center;
}

.status-icon {
  margin-right: 12px;
  font-size: 20px;
}

.status-message {
  font-size: 14px;
}

.expanded-message {
  margin-top: 8px;
  font-size: 12px;
  max-width: 600px;
}

.status-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.offline-status-bar.is-expanded {
  padding: 16px;
  flex-direction: column;
  align-items: flex-start;
}

.offline-status-bar.is-expanded .status-actions {
  margin-top: 12px;
  align-self: flex-end;
}
</style>