<template>
  <div class="error-boundary">
    <div class="error-content">
      <div class="error-icon">
        <el-icon :size="48" color="#f56c6c">
          <WarningFilled />
        </el-icon>
      </div>

      <div class="error-message">
        <h3 class="error-title">出现了一个错误</h3>
        <p class="error-description">{{ error || '未知错误' }}</p>
      </div>

      <div class="error-actions">
        <el-button type="primary" @click="$emit('retry')" :loading="isRetrying">
          重试
        </el-button>
        <el-button @click="$emit('dismiss')">
          关闭
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'

interface Props {
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  error: '发生了一个未知错误'
})

const emit = defineEmits<{
  retry: []
  dismiss: []
}>()

const isRetrying = ref(false)

// 处理重试
function handleRetry() {
  isRetrying.value = true
  emit('retry')

  // 3秒后重置重试状态
  setTimeout(() => {
    isRetrying.value = false
  }, 3000)
}
</script>

<style scoped>
.error-boundary {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.error-content {
  background: var(--el-bg-color);
  border-radius: 12px;
  padding: 32px;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.error-icon {
  margin-bottom: 24px;
}

.error-message {
  margin-bottom: 24px;
}

.error-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 12px 0;
}

.error-description {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin: 0;
  line-height: 1.5;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
