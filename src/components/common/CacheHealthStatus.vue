<template>
  <div class="cache-health-status">
    <div class="health-card" :class="healthClass">
      <div class="health-icon">
        <span v-if="isLoading">⏳</span>
        <span v-else-if="isHealthy">✅</span>
        <span v-else-if="isWarning">⚠️</span>
        <span v-else>❌</span>
      </div>
      <div class="health-info">
        <div class="health-title">缓存健康状态</div>
        <div class="health-status">{{ healthStatus }}</div>
      </div>
      <div class="health-actions">
        <button
          class="health-btn"
          :class="{ disabled: isLoading }"
          @click="fetchStats"
          title="刷新健康状态"
        >
          <span v-if="!isLoading">🔄</span>
          <span class="btn-spinner" v-else></span>
        </button>
      </div>
    </div>

    <div class="health-details" v-if="stats">
      <div class="health-metrics">
        <div class="metric-item">
          <div class="metric-value" :class="hitRateClass">{{ stats.hitRate }}</div>
          <div class="metric-label">命中率</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">{{ stats.requests }}</div>
          <div class="metric-label">请求总数</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">{{ stats.apiCalls }}</div>
          <div class="metric-label">API调用</div>
        </div>
        <div class="metric-item">
          <div class="metric-value" :class="{ error: stats.errors > 0 }">{{ stats.errors }}</div>
          <div class="metric-label">错误数</div>
        </div>
      </div>

      <div class="health-chart">
        <div class="chart-title">缓存命中情况</div>
        <div class="chart-container">
          <div class="chart-bar">
            <div
              class="chart-hit"
              :style="{ width: `${hitPercentage}%` }"
              :title="`命中: ${stats.hits} (${hitPercentage}%)`"
            ></div>
            <div
              class="chart-miss"
              :style="{ width: `${missPercentage}%` }"
              :title="`未命中: ${stats.misses} (${missPercentage}%)`"
            ></div>
          </div>
          <div class="chart-legend">
            <div class="legend-item">
              <div class="legend-color hit"></div>
              <div class="legend-text">命中 ({{ stats.hits }})</div>
            </div>
            <div class="legend-item">
              <div class="legend-color miss"></div>
              <div class="legend-text">未命中 ({{ stats.misses }})</div>
            </div>
          </div>
        </div>
      </div>

      <div class="health-actions-full">
        <button class="action-btn refresh" :class="{ disabled: isLoading }" @click="fetchStats">
          刷新统计
        </button>
        <button class="action-btn reset" :class="{ disabled: isLoading }" @click="resetStats">
          重置统计
        </button>
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

const healthClass = computed(() => {
  if (isLoading.value) return 'loading'
  if (isHealthy.value) return 'healthy'
  if (isWarning.value) return 'warning'
  return 'error'
})

const healthStatus = computed(() => {
  if (isLoading.value) return '加载中...'
  if (isHealthy.value) return '健康'
  if (isWarning.value) return '需要注意'
  if (stats.value) return '异常'
  return '未知'
})

const hitRateClass = computed(() => {
  if (!stats.value) return ''
  return cacheStatsService.formatHitRate(stats.value.hitRate)
})

const hitPercentage = computed(() => {
  if (!stats.value || stats.value.requests === 0) return 0
  return Math.round((stats.value.hits / stats.value.requests) * 100)
})

const missPercentage = computed(() => {
  if (!stats.value || stats.value.requests === 0) return 0
  return Math.round((stats.value.misses / stats.value.requests) * 100)
})

// 方法
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
.cache-health-status {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  overflow: hidden;
  margin-bottom: var(--spacing-lg);
}

.health-card {
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
}

.health-card.healthy {
  background-color: rgba(66, 185, 131, 0.1);
  border-left: 4px solid var(--success-color);
}

.health-card.warning {
  background-color: rgba(230, 162, 60, 0.1);
  border-left: 4px solid var(--warning-color);
}

.health-card.error {
  background-color: rgba(245, 108, 108, 0.1);
  border-left: 4px solid var(--error-color);
}

.health-card.loading {
  background-color: rgba(144, 147, 153, 0.1);
  border-left: 4px solid var(--text-secondary);
}

.health-icon {
  font-size: 1.5rem;
  margin-right: var(--spacing-md);
}

.health-info {
  flex: 1;
}

.health-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.health-status {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.health-actions {
  display: flex;
  align-items: center;
}

.health-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.health-btn:hover {
  color: var(--primary-color);
  transform: rotate(30deg);
}

.health-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(144, 147, 153, 0.3);
  border-top: 2px solid var(--text-secondary);
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

.health-details {
  padding: var(--spacing-md);
}

.health-metrics {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.metric-item {
  text-align: center;
  flex: 1;
}

.metric-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin-bottom: var(--spacing-xs);
  color: var(--text-primary);
}

.metric-value.excellent {
  color: var(--success-color);
}

.metric-value.good,
.metric-value.average {
  color: var(--warning-color);
}

.metric-value.poor,
.metric-value.critical,
.metric-value.error {
  color: var(--error-color);
}

.metric-label {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.health-chart {
  margin-bottom: var(--spacing-lg);
}

.chart-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.chart-container {
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  padding: var(--spacing-md);
}

.chart-bar {
  height: 24px;
  background-color: var(--bg-tertiary);
  border-radius: var(--border-radius-sm);
  overflow: hidden;
  display: flex;
  margin-bottom: var(--spacing-sm);
}

.chart-hit {
  height: 100%;
  background-color: var(--success-color);
  transition: width var(--transition-normal);
}

.chart-miss {
  height: 100%;
  background-color: var(--error-color);
  transition: width var(--transition-normal);
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  margin-right: var(--spacing-xs);
}

.legend-color.hit {
  background-color: var(--success-color);
}

.legend-color.miss {
  background-color: var(--error-color);
}

.health-actions-full {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.action-btn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.action-btn.refresh:hover {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.action-btn.reset:hover {
  background-color: var(--warning-light);
  border-color: var(--warning-color);
  color: var(--warning-color);
}

.action-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
