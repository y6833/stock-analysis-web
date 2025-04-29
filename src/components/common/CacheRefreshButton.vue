<template>
  <div
    class="cache-refresh-button"
    @mouseenter="showTooltip = true"
    @mouseleave="showTooltip = false"
  >
    <button
      class="refresh-btn"
      :class="{ loading: isLoading, disabled: isLoading || !canRefresh }"
      :disabled="isLoading || !canRefresh"
      @click="handleRefresh"
      :title="buttonTitle"
    >
      <span class="btn-icon" v-if="!isLoading">🔄</span>
      <span class="btn-spinner" v-if="isLoading"></span>
      <span class="btn-text" v-if="showText">{{ buttonText }}</span>
    </button>

    <div v-if="showStatus && status && showTooltip" class="status-tooltip">
      <div class="tooltip-content">
        <div class="tooltip-header">
          <span>缓存刷新状态</span>
          <button class="close-btn" @click.stop="showTooltip = false" title="关闭">×</button>
        </div>
        <div class="tooltip-body">
          <div class="status-item">
            <span class="label">数据源:</span>
            <span class="value">{{ dataSource }}</span>
          </div>
          <div class="status-item">
            <span class="label">最后更新:</span>
            <span class="value">{{ formatDate(status.lastUpdate) }}</span>
          </div>
          <div class="status-item">
            <span class="label">缓存项目:</span>
            <span class="value"
              >{{ status.stockCount + status.indexCount + status.industryCount }} 项</span
            >
          </div>
          <div class="status-item">
            <span class="label">刷新限制:</span>
            <span class="value" :class="canRefresh ? 'success' : 'warning'">
              {{ canRefresh ? '可以刷新' : `请等待 ${timeRemaining}` }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { cacheService } from '@/services/cacheService'
import { tushareService } from '@/services/tushareService'
import type { CacheStatus, RefreshLimit } from '@/services/cacheService'
import { useToast } from '@/composables/useToast'

// 组件属性
const props = defineProps({
  dataSource: {
    type: String,
    default: 'tushare',
  },
  showText: {
    type: Boolean,
    default: true,
  },
  showStatus: {
    type: Boolean,
    default: true,
  },
  forceApi: {
    type: Boolean,
    default: true,
  },
})

// 组件事件
const emit = defineEmits(['refresh-start', 'refresh-success', 'refresh-error'])

// 状态变量
const { showToast } = useToast()
const isLoading = ref(false)
const status = ref<CacheStatus | null>(null)
const refreshLimit = ref<RefreshLimit | null>(null)
const canRefresh = ref(true)
const timeRemaining = ref('')
const refreshTimer = ref<number | null>(null)
const checkTimer = ref<number | null>(null)
const showTooltip = ref(false)

// 计算属性
const buttonText = computed(() => {
  if (isLoading.value) return '刷新中...'
  if (!canRefresh.value) return `请等待 ${timeRemaining.value}`
  return '强制刷新'
})

const buttonTitle = computed(() => {
  if (isLoading.value) return '正在刷新数据，请稍候'
  if (!canRefresh.value) return `数据刷新频率限制，请等待 ${timeRemaining.value}`
  return '强制从数据源获取最新数据'
})

// 方法
const fetchStatus = async () => {
  try {
    status.value = await cacheService.getCacheStatus(props.dataSource)
  } catch (error) {
    console.error('获取缓存状态失败:', error)
  }
}

const checkRefreshLimit = async () => {
  try {
    refreshLimit.value = await cacheService.checkRefreshLimit(props.dataSource)
    canRefresh.value = refreshLimit.value.canRefresh

    if (!canRefresh.value && refreshLimit.value.timeRemaining) {
      updateTimeRemaining(refreshLimit.value.timeRemaining)
      startRefreshTimer(refreshLimit.value.timeRemaining)
    }
  } catch (error) {
    console.error('检查刷新限制失败:', error)
    canRefresh.value = true
  }
}

const updateTimeRemaining = (ms: number) => {
  timeRemaining.value = cacheService.formatTimeRemaining(ms)
}

const startRefreshTimer = (ms: number) => {
  // 清除现有定时器
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
  }

  // 设置新定时器
  const updateInterval = 1000 // 每秒更新一次
  let remainingMs = ms

  refreshTimer.value = window.setInterval(() => {
    remainingMs -= updateInterval

    if (remainingMs <= 0) {
      // 时间到，可以刷新
      canRefresh.value = true
      clearInterval(refreshTimer.value as number)
      refreshTimer.value = null
    } else {
      // 更新剩余时间
      updateTimeRemaining(remainingMs)
    }
  }, updateInterval)
}

const handleRefresh = async () => {
  if (isLoading.value || !canRefresh.value) return

  isLoading.value = true
  emit('refresh-start')

  // 允许API调用
  if (props.forceApi) {
    tushareService.setAllowApiCall(true)
    console.log('强制刷新按钮点击，已允许API调用')
  }

  try {
    // 刷新缓存
    const result = await cacheService.refreshCache(props.dataSource)

    if (result.success) {
      showToast(`缓存刷新成功，已更新 ${result.cachedItems} 项数据`, 'success')
      emit('refresh-success', result)

      // 更新状态
      await fetchStatus()
      await checkRefreshLimit()
    } else {
      showToast(result.error || '缓存刷新失败', 'error')
      emit('refresh-error', result)
    }
  } catch (error: any) {
    console.error('刷新缓存失败:', error)
    showToast(error.message || '刷新缓存失败', 'error')
    emit('refresh-error', error)
  } finally {
    isLoading.value = false

    // 刷新完成后，如果不是在API测试页面或数据源切换页面，则禁止API调用
    if (
      props.forceApi &&
      !window.location.pathname.includes('/tushare-test') &&
      !window.location.pathname.includes('/api-test') &&
      !window.location.pathname.includes('/data-source')
    ) {
      tushareService.setAllowApiCall(false)
      console.log('强制刷新完成，已恢复API调用限制')
    }
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '未知'

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

// 生命周期钩子
onMounted(async () => {
  // 获取初始状态
  await fetchStatus()
  await checkRefreshLimit()

  // 设置定时检查
  checkTimer.value = window.setInterval(async () => {
    await fetchStatus()
  }, 5 * 60 * 1000) // 每5分钟检查一次
})

onUnmounted(() => {
  // 清除定时器
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
  }

  if (checkTimer.value) {
    clearInterval(checkTimer.value)
  }
})
</script>

<style scoped>
.cache-refresh-button {
  position: relative;
  display: inline-block;
}

.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.refresh-btn:hover {
  background-color: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.refresh-btn.loading,
.refresh-btn.disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-icon {
  font-size: 1.2em;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.status-tooltip {
  position: absolute;
  top: 100%; /* 改为显示在按钮下方 */
  left: 0;
  margin-top: 8px; /* 与按钮的间距 */
  z-index: 9999; /* 增加 z-index 确保在最上层 */
}

.tooltip-content {
  width: 250px;
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.tooltip-header {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
  color: var(--error-color);
}

.tooltip-body {
  padding: var(--spacing-md);
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
  color: var(--error-color);
}
</style>
