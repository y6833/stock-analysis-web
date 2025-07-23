<template>
  <el-dialog
    v-model="dialogVisible"
    title="网络连接状态变更"
    width="400px"
    :show-close="true"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
  >
    <div class="offline-notification">
      <div v-if="isOffline" class="offline-content">
        <el-icon class="status-icon offline"><WarningFilled /></el-icon>
        <h3>您已进入离线模式</h3>
        <p>
          网络连接已断开。应用程序将使用缓存数据，部分功能可能不可用。
          恢复网络连接后，您的更改将自动同步。
        </p>
      </div>
      <div v-else class="online-content">
        <el-icon class="status-icon online"><SuccessFilled /></el-icon>
        <h3>网络连接已恢复</h3>
        <p>
          您现在已重新连接到网络。应用程序将自动同步您在离线期间所做的更改，
          并恢复所有功能。
        </p>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-checkbox v-model="dontShowAgain">不再显示</el-checkbox>
        <el-button @click="closeDialog">关闭</el-button>
        <el-button v-if="isOffline" type="primary" @click="goToOfflineSettings">
          离线设置
        </el-button>
        <el-button v-else type="primary" @click="refreshData">
          刷新数据
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { WarningFilled, SuccessFilled } from '@element-plus/icons-vue';
import { useOfflineMode } from '@/composables/useOfflineMode';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  isOffline: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'refresh']);

const router = useRouter();
const dialogVisible = ref(props.show);
const dontShowAgain = ref(false);

// 监听show属性变化
watch(() => props.show, (newVal) => {
  dialogVisible.value = newVal;
});

// 关闭对话框
function closeDialog() {
  dialogVisible.value = false;
  
  if (dontShowAgain.value) {
    // 保存用户偏好
    localStorage.setItem('offline_notification_disabled', 'true');
  }
  
  emit('close');
}

// 前往离线设置
function goToOfflineSettings() {
  closeDialog();
  router.push('/settings/offline');
}

// 刷新数据
function refreshData() {
  closeDialog();
  emit('refresh');
}
</script>

<style scoped>
.offline-notification {
  text-align: center;
  padding: 16px 0;
}

.status-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.status-icon.offline {
  color: #f56c6c;
}

.status-icon.online {
  color: #67c23a;
}

h3 {
  margin-bottom: 16px;
  font-weight: 500;
}

p {
  color: #606266;
  line-height: 1.6;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>