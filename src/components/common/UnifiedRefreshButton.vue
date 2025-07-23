<template>
  <div class="unified-refresh-button" :class="{ 'has-tooltip': showTooltip }">
    <BaseButton
      ref="buttonRef"
      :type="buttonType"
      :size="size"
      :loading="isLoading"
      :disabled="!canRefresh"
      :icon="buttonIcon"
      @click="handleRefresh"
    >
      <span v-if="showText">{{ buttonText }}</span>
    </BaseButton>

    <!-- Status Tooltip -->
    <div v-if="showTooltip && (status || !canRefresh)" class="refresh-tooltip">
      <div class="tooltip-content">
        <div class="tooltip-header">
          <span>{{ tooltipTitle }}</span>
        </div>
        <div class="tooltip-body">
          <div v-if="status?.dataSource" class="status-item">
            <span class="label">数据源:</span>
            <span class="value">{{ status.dataSource }}</span>
          </div>
          <div v-if="status?.lastUpdate" class="status-item">
            <span class="label">最后更新:</span>
            <span class="value">{{ formatDate(status.lastUpdate) }}</span>
          </div>
          <div v-if="status?.available !== undefined" class="status-item">
            <span class="label">状态:</span>
            <span class="value" :class="status.available ? 'success' : 'error'">
              {{ status.available ? '可用' : '不可用' }}
            </span>
          </div>
          <div v-if="status && typeof status.stockCount === 'number'" class="status-item">
            <span class="label">股票数据:</span>
            <span class="value">{{ status.stockCount }} 项</span>
          </div>
          <div v-if="status && typeof status.indexCount === 'number'" class="status-item">
            <span class="label">指数数据:</span>
            <span class="value">{{ status.indexCount }} 项</span>
          </div>
          <div v-if="!canRefresh && timeRemaining" class="status-item">
            <span class="label">冷却时间:</span>
            <span class="value warning">{{ timeRemaining }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'

interface RefreshStatus {
  dataSource?: string
  lastUpdate?: string
  available?: boolean
  stockCount?: number
  indexCount?: number
  industryCount?: number
}

interface Props {
  refreshAction: () => Promise<void>
  status?: RefreshStatus | null
  cooldownPeriod?: number
  showText?: boolean
  showTooltip?: boolean
  size?: 'small' | 'medium' | 'large'
  buttonType?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'text'
  tooltipTitle?: string
  buttonText?: string
  forceApi?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  cooldownPeriod: 60 * 60 * 1000, // 1 hour default
  showText: true,
  showTooltip: false,
  size: 'medium',
  buttonType: 'primary',
  tooltipTitle: '刷新状态',
  buttonText: '刷新数据',
  forceApi: false,
})

const emit = defineEmits<{
  'refresh-start': []
  'refresh-success': [result?: any]
  'refresh-error': [error: any]
}>()

// State
const buttonRef = ref<InstanceType<typeof BaseButton>>()
const isLoading = ref(false)
const lastRefreshTime = ref(0)
const cooldownRemaining = ref(0)
const timerInterval = ref<number | null>(null)

// Computed
const canRefresh = computed(() => cooldownRemaining.value <= 0)

const buttonText = computed(() => {
  if (isLoading.value) return '刷新中...'
  if (!canRefresh.value) return `请等待 ${timeRemaining.value}`
  return props.buttonText
})

const buttonIcon = computed(() => {
  return isLoading.value ? '' : '🔄'
})

const timeRemaining = computed(() => {
  if (cooldownRemaining.value <= 0) return ''
  const minutes = Math.floor(cooldownRemaining.value / 60000)
  const seconds = Math.floor((cooldownRemaining.value % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

// Methods
const loadLastRefreshTime = () => {
  const savedTime = localStorage.getItem('last_unified_refresh_time')
  if (savedTime) {
    lastRefreshTime.value = parseInt(savedTime)
    updateCooldownRemaining()
  }
}

const updateCooldownRemaining = () => {
  const now = Date.now()
  const elapsed = now - lastRefreshTime.value
  cooldownRemaining.value = Math.max(0, props.cooldownPeriod - elapsed)
}

const startTimer = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }

  timerInterval.value = window.setInterval(() => {
    updateCooldownRemaining()
  }, 1000)
}

const handleRefresh = async () => {
  if (!canRefresh.value || isLoading.value) return

  try {
    isLoading.value = true
    emit('refresh-start')

    // Handle API call permission if needed
    if (props.forceApi) {
      // Import tushareService dynamically to avoid circular dependencies
      const { tushareService } = await import('@/services/tushareService')
      tushareService.setAllowApiCall(true)
      console.log('Unified refresh button: API calls enabled')
    }

    await props.refreshAction()

    // Update last refresh time
    lastRefreshTime.value = Date.now()
    localStorage.setItem('last_unified_refresh_time', lastRefreshTime.value.toString())
    updateCooldownRemaining()

    emit('refresh-success')
  } catch (error) {
    console.error('Unified refresh failed:', error)
    emit('refresh-error', error)
  } finally {
    isLoading.value = false

    // Restore API call restriction if needed
    if (props.forceApi) {
      const { tushareService } = await import('@/services/tushareService')
      if (
        !window.location.pathname.includes('/tushare-test') &&
        !window.location.pathname.includes('/api-test') &&
        !window.location.pathname.includes('/data-source')
      ) {
        tushareService.setAllowApiCall(false)
        console.log('Unified refresh button: API calls disabled')
      }
    }
  }
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch (e) {
    return dateString
  }
}

// Lifecycle
onMounted(() => {
  loadLastRefreshTime()
  startTimer()
})

onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
})

// Expose methods
defineExpose({
  refresh: handleRefresh,
  focus: () => buttonRef.value?.$el?.focus(),
})
</script>

<style scoped>
.unified-refresh-button {
  position: relative;
  display: inline-block;
}

.unified-refresh-button.has-tooltip:hover .refresh-tooltip {
  display: block;
}

.refresh-tooltip {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: var(--spacing-xs);
  z-index: 1000;
  display: none;
  min-width: 250px;
}

.tooltip-content {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.tooltip-header {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-secondary);
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
}

.tooltip-body {
  padding: var(--spacing-sm) var(--spacing-md);
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
}

.status-item:last-child {
  margin-bottom: 0;
}

.label {
  color: var(--text-secondary);
}

.value {
  font-weight: 500;
  color: var(--text-primary);
}

.value.success {
  color: var(--success-color);
}

.value.warning {
  color: var(--warning-color);
}

.value.error {
  color: var(--danger-color);
}
</style>
