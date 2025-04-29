<template>
  <div
    class="cache-status-indicator"
    @mouseenter="handleMouseEnter"
    @mouseleave="showTooltip = false"
  >
    <div class="indicator-icon" :class="statusClass" :title="statusText">
      <span v-if="isLoading">⏳</span>
      <span v-else-if="isHealthy">✅</span>
      <span v-else-if="isWarning">⚠️</span>
      <span v-else>❌</span>
    </div>

    <div v-if="showTooltip" class="status-tooltip">
      <div class="tooltip-content">
        <div class="tooltip-header">缓存健康状态</div>
        <div class="tooltip-body">
          <div v-if="isLoading" class="loading-message">正在获取缓存状态...</div>
          <template v-else>
            <div class="status-item">
              <span class="label">状态:</span>
              <span class="value" :class="statusClass">
                {{ statusText }}
              </span>
            </div>
            <div class="status-item">
              <span class="label">命中率:</span>
              <span class="value" :class="hitRateClass">
                {{ stats?.hitRate || '未知' }}
              </span>
            </div>
            <div class="status-item">
              <span class="label">请求总数:</span>
              <span class="value">{{ stats?.requests || 0 }}</span>
            </div>
            <div class="status-item">
              <span class="label">命中次数:</span>
              <span class="value">{{ stats?.hits || 0 }}</span>
            </div>
            <div class="status-item">
              <span class="label">未命中次数:</span>
              <span class="value">{{ stats?.misses || 0 }}</span>
            </div>
            <div class="status-item">
              <span class="label">API调用次数:</span>
              <span class="value">{{ stats?.apiCalls || 0 }}</span>
            </div>
            <div class="status-item">
              <span class="label">错误次数:</span>
              <span class="value" :class="{ error: stats?.errors > 0 }">
                {{ stats?.errors || 0 }}
              </span>
            </div>
            <div class="status-item">
              <span class="label">最后重置:</span>
              <span class="value">{{ formatLastReset }}</span>
            </div>
          </template>
        </div>
        <div class="tooltip-footer">
          <button class="refresh-btn-sm" :class="{ disabled: isLoading }" @click="fetchStats">
            刷新统计
          </button>
          <button class="reset-btn-sm" :class="{ disabled: isLoading }" @click="resetStats">
            重置统计
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { cacheStatsService } from '@/services/cacheStatsService'
import type { CacheStats } from '@/services/cacheStatsService'
import { useToast } from '@/composables/useToast'

// 组件属性
const props = defineProps({
  dataSource: {
    type: String,
    default: '', // 默认为空，将使用当前选择的数据源
  },
  autoRefresh: {
    type: Boolean,
    default: true,
  },
  refreshInterval: {
    type: Number,
    default: 5 * 60 * 1000, // 5分钟
  },
})

// 状态变量
const { showToast } = useToast()
const isLoading = ref(false)
const stats = ref<CacheStats | null>(null)
const showTooltip = ref(false)
const refreshTimer = ref<number | null>(null)

// 计算属性
const isHealthy = computed(() => {
  if (!stats.value) return false

  // 检查命中率是否大于70%
  const hitRate = parseFloat(stats.value.hitRate.replace('%', ''))

  // 检查错误率是否小于5%
  const errorRate = stats.value.requests > 0 ? (stats.value.errors / stats.value.requests) * 100 : 0

  return hitRate >= 70 && errorRate < 5
})

const isWarning = computed(() => {
  if (!stats.value) return false

  // 检查命中率是否大于30%
  const hitRate = parseFloat(stats.value.hitRate.replace('%', ''))

  // 检查错误率是否小于10%
  const errorRate = stats.value.requests > 0 ? (stats.value.errors / stats.value.requests) * 100 : 0

  return (hitRate >= 30 && hitRate < 70) || (errorRate >= 5 && errorRate < 10)
})

const statusClass = computed(() => {
  if (isLoading.value) return 'loading'
  if (isHealthy.value) return 'healthy'
  if (isWarning.value) return 'warning'
  return 'error'
})

const statusText = computed(() => {
  if (isLoading.value) return '加载中'
  if (isHealthy.value) return '健康'
  if (isWarning.value) return '警告'
  return '异常'
})

const hitRateClass = computed(() => {
  if (!stats.value) return ''
  return cacheStatsService.formatHitRate(stats.value.hitRate)
})

const formatLastReset = computed(() => {
  if (!stats.value || !stats.value.lastReset) return '未知'
  return cacheStatsService.getTimeDiff(stats.value.lastReset)
})

// 方法
const handleMouseEnter = () => {
  showTooltip.value = true
  fetchStats() // 鼠标悬停时刷新统计信息
}

const fetchStats = async () => {
  if (isLoading.value) return

  isLoading.value = true

  try {
    stats.value = await cacheStatsService.getStats(props.dataSource)
  } catch (error: any) {
    console.error('获取缓存统计信息失败:', error)
    showToast(error.message || '获取缓存统计信息失败', 'error')
  } finally {
    isLoading.value = false
  }
}

const resetStats = async () => {
  if (isLoading.value) return

  isLoading.value = true

  try {
    const result = await cacheStatsService.resetStats(props.dataSource)

    if (result.success) {
      showToast(result.message || '缓存统计已重置', 'success')
      await fetchStats()
    } else {
      showToast(result.error || '重置缓存统计失败', 'error')
    }
  } catch (error: any) {
    console.error('重置缓存统计失败:', error)
    showToast(error.message || '重置缓存统计失败', 'error')
  } finally {
    isLoading.value = false
  }
}

// 生命周期钩子
onMounted(async () => {
  // 获取初始统计信息
  await fetchStats()

  // 设置定时刷新
  if (props.autoRefresh && props.refreshInterval > 0) {
    refreshTimer.value = window.setInterval(fetchStats, props.refreshInterval)
  }
})

onUnmounted(() => {
  // 清除定时器
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
  }
})
</script>

<style scoped>
.cache-status-indicator {
  position: relative;
  display: inline-block;
  /* 确保工具提示有足够的空间显示 */
  margin: 0;
  padding: 0;
}

.indicator-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.indicator-icon.healthy {
  background-color: rgba(66, 185, 131, 0.2);
  color: var(--success-color);
}

.indicator-icon.warning {
  background-color: rgba(230, 162, 60, 0.2);
  color: var(--warning-color);
}

.indicator-icon.error {
  background-color: rgba(245, 108, 108, 0.2);
  color: var(--error-color);
}

.indicator-icon.loading {
  background-color: rgba(144, 147, 153, 0.2);
  color: var(--text-secondary);
}

.indicator-icon:hover {
  transform: scale(1.1);
}

.status-tooltip {
  position: fixed; /* 使用固定定位 */
  top: 60px; /* 距离顶部的距离 */
  right: 20px; /* 距离右侧的距离 */
  z-index: 9999; /* 增加 z-index 确保在最上层 */
  pointer-events: auto; /* 确保可以与工具提示交互 */
}

.tooltip-content {
  width: 280px;
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25); /* 更明显的阴影 */
  border: 1px solid var(--border-color);
  overflow: hidden;
  animation: fadeIn 0.2s ease-in-out; /* 添加淡入动画 */
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tooltip-header {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
  color: var(--text-primary);
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

.value.healthy,
.value.excellent {
  color: var(--success-color);
}

.value.warning,
.value.good,
.value.average {
  color: var(--warning-color);
}

.value.error,
.value.poor,
.value.critical {
  color: var(--error-color);
}

.tooltip-footer {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
}

.refresh-btn-sm,
.reset-btn-sm {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-xs);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.refresh-btn-sm:hover {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.reset-btn-sm:hover {
  background-color: var(--warning-light);
  border-color: var(--warning-color);
  color: var(--warning-color);
}

.refresh-btn-sm.disabled,
.reset-btn-sm.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-message {
  text-align: center;
  color: var(--text-secondary);
  padding: var(--spacing-md) 0;
}
</style>
