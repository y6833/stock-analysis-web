<template>
  <div class="offline-settings">
    <h3>离线模式设置</h3>
    
    <div v-if="!pwaSupported" class="pwa-not-supported">
      <el-alert
        title="您的浏览器不支持PWA功能"
        type="warning"
        description="请使用支持PWA的现代浏览器，如Chrome、Edge、Firefox或Safari的最新版本。"
        show-icon
        :closable="false"
      />
    </div>
    
    <div v-else>
      <div class="setting-item">
        <span class="setting-label">启用离线模式</span>
        <el-switch
          v-model="offlineModeEnabledLocal"
          @change="toggleOfflineMode"
        />
        <p class="setting-description">
          启用后，应用将在离线或弱网络条件下自动使用缓存数据
        </p>
      </div>
      
      <div class="setting-item">
        <span class="setting-label">启用自动同步</span>
        <el-switch
          v-model="autoSyncEnabledLocal"
          :disabled="!offlineModeEnabledLocal || !backgroundSyncSupported"
          @change="toggleAutoSync"
        />
        <p class="setting-description">
          启用后，在恢复网络连接时自动同步离线更改
          <span v-if="!backgroundSyncSupported" class="not-supported-text">
            (您的浏览器不支持后台同步)
          </span>
        </p>
      </div>
      
      <div class="setting-item">
        <span class="setting-label">启用数据预加载</span>
        <el-switch
          v-model="dataPreloadEnabledLocal"
          :disabled="!offlineModeEnabledLocal"
          @change="toggleDataPreload"
        />
        <p class="setting-description">
          启用后，应用将预加载常用数据以便离线使用
        </p>
      </div>
      
      <div class="offline-data-info">
        <h4>离线数据</h4>
        <div v-if="isLoadingOfflineData" class="loading-data">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>加载中...</span>
        </div>
        <div v-else>
          <p>
            <strong>缓存项数:</strong> {{ offlineDataKeys.length }}
          </p>
          <p>
            <strong>缓存大小:</strong> {{ formatDataSize(offlineDataSize) }}
          </p>
          <div class="actions">
            <el-button 
              size="small" 
              type="primary" 
              @click="loadOfflineDataInfo"
            >
              刷新
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="confirmClearCache"
              :disabled="offlineDataKeys.length === 0"
            >
              清除缓存
            </el-button>
          </div>
        </div>
      </div>
      
      <div class="offline-status">
        <h4>网络状态</h4>
        <p>
          <el-tag 
            :type="isOnline ? 'success' : 'danger'" 
            size="small"
          >
            {{ isOnline ? '在线' : '离线' }}
          </el-tag>
        </p>
        <p v-if="isOnline">
          <strong>连接类型:</strong> {{ connectionType }}
        </p>
        <p v-if="isOnline">
          <strong>网络质量:</strong> 
          <el-tag 
            :type="networkQuality === 'good' ? 'success' : networkQuality === 'poor' ? 'warning' : 'info'" 
            size="small"
          >
            {{ networkQuality === 'good' ? '良好' : networkQuality === 'poor' ? '较差' : '未知' }}
          </el-tag>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Loading } from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus';
import { useOfflineMode } from '@/composables/useOfflineMode';

const {
  isOnline,
  networkQuality,
  connectionType,
  pwaSupported,
  backgroundSyncSupported,
  offlineDataKeys,
  offlineDataSize,
  formatDataSize,
  isLoadingOfflineData,
  loadOfflineDataInfo,
  clearOfflineData,
  offlineModeEnabled,
  autoSyncEnabled,
  dataPreloadEnabled,
  toggleOfflineMode,
  toggleAutoSync,
  toggleDataPreload
} = useOfflineMode();

// 本地状态，用于双向绑定
const offlineModeEnabledLocal = ref(offlineModeEnabled.value);
const autoSyncEnabledLocal = ref(autoSyncEnabled.value);
const dataPreloadEnabledLocal = ref(dataPreloadEnabled.value);

// 确认清除缓存
async function confirmClearCache() {
  try {
    await ElMessageBox.confirm(
      '确定要清除所有离线缓存数据吗？这将删除所有已缓存的股票数据和设置。',
      '清除缓存',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    const success = await clearOfflineData();
    if (success) {
      ElMessage({
        type: 'success',
        message: '缓存已成功清除'
      });
    } else {
      ElMessage({
        type: 'error',
        message: '清除缓存时出错'
      });
    }
  } catch {
    // 用户取消操作
  }
}

// 监听开关变化
function handleOfflineModeChange(value: boolean) {
  toggleOfflineMode(value);
}

function handleAutoSyncChange(value: boolean) {
  toggleAutoSync(value);
}

function handleDataPreloadChange(value: boolean) {
  toggleDataPreload(value);
}

onMounted(() => {
  loadOfflineDataInfo();
});
</script>

<style scoped>
.offline-settings {
  padding: 16px;
}

.setting-item {
  margin-bottom: 24px;
}

.setting-label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
}

.setting-description {
  margin-top: 8px;
  font-size: 12px;
  color: #606266;
}

.not-supported-text {
  color: #f56c6c;
}

.offline-data-info,
.offline-status {
  margin-top: 32px;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.loading-data {
  display: flex;
  align-items: center;
  gap: 8px;
}

.actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.pwa-not-supported {
  margin-bottom: 24px;
}
</style>