<template>
  <div class="data-refresh-button">
    <button
      class="refresh-btn"
      :class="{ disabled: !canRefresh || isLoading }"
      @click="handleRefresh"
      :title="buttonTitle"
    >
      <span class="icon" :class="{ spinning: isLoading }">🔄</span>
      <span class="text" v-if="showText">{{ buttonText }}</span>
    </button>

    <div v-if="showStatus && status" class="status-tooltip">
      <div class="tooltip-content">
        <div class="tooltip-header">数据缓存状态</div>
        <div class="tooltip-body">
          <div class="status-item">
            <span class="label">数据源:</span>
            <span class="value">{{ status.dataSource }}</span>
          </div>
          <div class="status-item">
            <span class="label">缓存状态:</span>
            <span class="value" :class="status.available ? 'success' : 'error'">
              {{ status.available ? '可用' : '不可用' }}
            </span>
          </div>
          <div class="status-item">
            <span class="label">最后更新:</span>
            <span class="value">{{ formatDate(status.lastUpdate) }}</span>
          </div>
          <div class="status-item">
            <span class="label">股票数据:</span>
            <span class="value">{{ status.stockCount }} 项</span>
          </div>
          <div class="status-item">
            <span class="label">指数数据:</span>
            <span class="value">{{ status.indexCount }} 项</span>
          </div>
        </div>
        <div class="tooltip-footer">
          <button
            class="refresh-btn-sm"
            :class="{ disabled: !canRefresh || isLoading }"
            @click="handleRefresh"
          >
            {{ canRefresh ? '刷新数据' : `请等待 ${timeRemaining}` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { cacheService } from '@/services/cacheService'
import { tushareService } from '@/services/tushareService'
import { dataRefreshService } from '@/services/dataRefreshService'
import { useUserStore } from '@/stores/userStore'
import type { CacheStatus, RefreshLimit } from '@/services/cacheService'

// 组件属性
const props = defineProps({
  dataSource: {
    type: String,
    default: '', // 默认为空，将使用当前选择的数据源
  },
  showText: {
    type: Boolean,
    default: true,
  },
  showStatus: {
    type: Boolean,
    default: true,
  },
})

// 组件事件
const emit = defineEmits(['refresh-start', 'refresh-success', 'refresh-error'])

// 状态变量
const isLoading = ref(false)
const status = ref<CacheStatus | null>(null)
const refreshLimit = ref<RefreshLimit | null>(null)
const canRefresh = ref(true)
const timeRemaining = ref('')
const refreshTimer = ref<number | null>(null)
const checkTimer = ref<number | null>(null)

// 计算属性
const buttonText = computed(() => {
  if (isLoading.value) return '刷新中...'
  if (!canRefresh.value) return `请等待 ${timeRemaining.value}`
  return '刷新数据'
})

const buttonTitle = computed(() => {
  if (isLoading.value) return '正在刷新数据，请稍候'
  if (!canRefresh.value) return `数据刷新频率限制，请等待 ${timeRemaining.value}`
  return '点击刷新数据'
})

// 方法
const fetchStatus = async () => {
  try {
    // 如果没有提供数据源，使用当前数据源
    const currentDataSource =
      props.dataSource || localStorage.getItem('preferredDataSource') || 'tushare'

    status.value = await cacheService.getCacheStatus(currentDataSource)
  } catch (error) {
    console.error('获取缓存状态失败:', error)
  }
}

const checkRefreshLimit = async () => {
  try {
    // 如果没有提供数据源，使用当前数据源
    const currentDataSource =
      props.dataSource || localStorage.getItem('preferredDataSource') || 'tushare'

    refreshLimit.value = await cacheService.checkRefreshLimit(currentDataSource)
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

  // 设置新的定时器，每秒更新一次剩余时间
  let remaining = ms
  refreshTimer.value = window.setInterval(() => {
    remaining -= 1000

    if (remaining <= 0) {
      // 时间到，可以刷新了
      canRefresh.value = true
      timeRemaining.value = ''
      clearInterval(refreshTimer.value as number)
      refreshTimer.value = null
    } else {
      updateTimeRemaining(remaining)
    }
  }, 1000)
}

const handleRefresh = async () => {
  if (isLoading.value || !canRefresh.value) return

  isLoading.value = true
  emit('refresh-start')

  // 允许API调用
  tushareService.setAllowApiCall(true)
  console.log('刷新按钮点击，已允许API调用')

  // 设置一个定时器，在刷新完成后恢复API调用限制
  const resetApiCallTimer = setTimeout(() => {
    tushareService.setAllowApiCall(false)
    console.log('刷新操作超时，已恢复API调用限制')
  }, 30000) // 30秒后自动恢复限制

  try {
    // 如果没有提供数据源，使用当前数据源
    const currentDataSource =
      props.dataSource || localStorage.getItem('preferredDataSource') || 'tushare'

    // 使用新的数据刷新服务
    const result = await dataRefreshService.refreshAllData(true, currentDataSource) // 强制刷新，忽略冷却时间

    if (result.success) {
      // 刷新成功
      emit('refresh-success', result)

      // 更新状态
      await fetchStatus()

      // 设置刷新限制
      canRefresh.value = false

      // 根据用户角色设置不同的冷却时间
      const userStore = useUserStore()

      // 管理员没有任何限制
      if (userStore.userRole === 'admin') {
        // 管理员不受限制，可以立即再次刷新
        canRefresh.value = true
        timeRemaining.value = ''
      } else {
        // 非管理员用户设置冷却时间
        let limitMs = 60 * 60 * 1000 // 默认1小时

        if (userStore.membershipLevel === 'premium') {
          limitMs = 30 * 60 * 1000 // 高级会员30分钟
        } else if (userStore.membershipLevel === 'enterprise') {
          limitMs = 15 * 60 * 1000 // 企业版15分钟
        }

        updateTimeRemaining(limitMs)
        startRefreshTimer(limitMs)
      }
    } else {
      emit('refresh-error', result.message || '刷新失败')
    }
  } catch (error: any) {
    console.error('刷新数据失败:', error)
    emit('refresh-error', error.message || '刷新数据失败')
  } finally {
    isLoading.value = false

    // 清除定时器
    clearTimeout(resetApiCallTimer)

    // 刷新完成后，如果不是在API测试页面或数据源切换页面，则禁止API调用
    if (
      !window.location.pathname.includes('/tushare-test') &&
      !window.location.pathname.includes('/api-test') &&
      !window.location.pathname.includes('/data-source')
    ) {
      tushareService.setAllowApiCall(false)
      console.log('刷新完成，已恢复API调用限制')
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

  // 禁用定时检查，避免频繁的API调用
  // 注释掉定时检查代码，改为只在用户交互时更新状态
  /*
  checkTimer.value = window.setInterval(async () => {
    await fetchStatus()
  }, 5 * 60 * 1000) // 每5分钟检查一次
  */
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
.data-refresh-button {
  position: relative;
  display: inline-block;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: #fff;
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all 0.2s ease;
}

.refresh-btn:hover:not(.disabled) {
  background-color: var(--primary-color-dark);
}

.refresh-btn.disabled {
  background-color: var(--bg-disabled);
  color: var(--text-secondary);
  cursor: not-allowed;
}

.icon {
  font-size: var(--font-size-md);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.status-tooltip {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--spacing-xs);
  z-index: 100;
  display: none;
  min-width: 250px;
}

.data-refresh-button:hover .status-tooltip {
  display: block;
}

.tooltip-content {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.tooltip-header {
  padding: var(--spacing-sm);
  background-color: var(--bg-secondary);
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
}

.tooltip-body {
  padding: var(--spacing-sm);
}

.tooltip-footer {
  padding: var(--spacing-sm);
  border-top: 1px solid var(--border-color);
  text-align: right;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-xs);
}

.status-item:last-child {
  margin-bottom: 0;
}

.label {
  color: var(--text-secondary);
}

.value {
  font-weight: 500;
}

.success {
  color: var(--success-color);
}

.error {
  color: var(--danger-color);
}

.refresh-btn-sm {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: var(--font-size-xs);
}

.refresh-btn-sm:hover:not(.disabled) {
  background-color: var(--primary-color-dark);
}

.refresh-btn-sm.disabled {
  background-color: var(--bg-disabled);
  color: var(--text-secondary);
  cursor: not-allowed;
}
</style>
