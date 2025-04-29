<template>
  <div class="refresh-button-container">
    <button
      class="refresh-button"
      :class="{ disabled: isDisabled }"
      @click="handleRefresh"
      :disabled="isDisabled || isLoading"
      :title="buttonTitle"
    >
      <span class="refresh-icon" :class="{ 'spin': isLoading }">🔄</span>
      <span class="refresh-text">{{ buttonText }}</span>
    </button>
    <div v-if="isDisabled && !isLoading" class="cooldown-timer">
      {{ formatCooldown(cooldownRemaining) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  refreshAction: {
    type: Function,
    required: true
  },
  cooldownPeriod: {
    type: Number,
    default: 60 * 60 * 1000 // 默认1小时（毫秒）
  },
  buttonText: {
    type: String,
    default: '刷新数据'
  }
})

const emit = defineEmits(['refresh-start', 'refresh-complete', 'refresh-error'])

const { showToast } = useToast()

// 状态
const isLoading = ref(false)
const lastRefreshTime = ref(0)
const cooldownRemaining = ref(0)
const timerInterval = ref<number | null>(null)

// 从本地存储获取上次刷新时间
const loadLastRefreshTime = () => {
  const savedTime = localStorage.getItem('last_data_refresh_time')
  if (savedTime) {
    lastRefreshTime.value = parseInt(savedTime)
    updateCooldownRemaining()
  }
}

// 更新剩余冷却时间
const updateCooldownRemaining = () => {
  const now = Date.now()
  const elapsed = now - lastRefreshTime.value
  cooldownRemaining.value = Math.max(0, props.cooldownPeriod - elapsed)
}

// 格式化剩余时间
const formatCooldown = (ms: number) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// 计算按钮是否禁用
const isDisabled = computed(() => {
  return cooldownRemaining.value > 0
})

// 计算按钮提示文本
const buttonTitle = computed(() => {
  if (isLoading.value) {
    return '正在刷新数据...'
  }
  
  if (isDisabled.value) {
    return `刷新冷却中，${formatCooldown(cooldownRemaining.value)}后可再次刷新`
  }
  
  return '刷新所有数据'
})

// 处理刷新按钮点击
const handleRefresh = async () => {
  if (isDisabled.value || isLoading.value) {
    return
  }
  
  try {
    isLoading.value = true
    emit('refresh-start')
    
    // 执行刷新操作
    await props.refreshAction()
    
    // 更新上次刷新时间
    lastRefreshTime.value = Date.now()
    localStorage.setItem('last_data_refresh_time', lastRefreshTime.value.toString())
    updateCooldownRemaining()
    
    emit('refresh-complete')
    showToast('数据刷新成功', 'success')
  } catch (error: any) {
    console.error('刷新数据失败:', error)
    emit('refresh-error', error)
    showToast(`刷新失败: ${error.message || '未知错误'}`, 'error')
  } finally {
    isLoading.value = false
  }
}

// 启动定时器
const startTimer = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
  
  timerInterval.value = window.setInterval(() => {
    updateCooldownRemaining()
  }, 1000)
}

// 组件挂载时
onMounted(() => {
  loadLastRefreshTime()
  startTimer()
})

// 组件卸载时
onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
})
</script>

<style scoped>
.refresh-button-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  padding: 6px 12px;
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: background-color 0.2s;
}

.refresh-button:hover:not(:disabled) {
  background-color: var(--primary-color-dark);
}

.refresh-button.disabled {
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: not-allowed;
}

.refresh-icon {
  display: inline-block;
}

.refresh-icon.spin {
  animation: spin 1s linear infinite;
}

.cooldown-timer {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: 4px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
