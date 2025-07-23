<template>
  <UnifiedRefreshButton
    ref="unifiedRefreshRef"
    :refresh-action="wrappedRefreshAction"
    :status="status"
    :show-text="showText"
    :show-tooltip="showStatus"
    :tooltip-title="'数据缓存状态'"
    :button-text="'刷新数据'"
    :force-api="true"
    @refresh-start="emit('refresh-start')"
    @refresh-success="handleRefreshSuccess"
    @refresh-error="handleRefreshError"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { cacheService } from '@/services/cacheService'
import { dataRefreshService } from '@/services/dataRefreshService'
import UnifiedRefreshButton from './UnifiedRefreshButton.vue'
import type { CacheStatus } from '@/services/cacheService'

const props = defineProps({
  dataSource: {
    type: String,
    default: '',
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

const emit = defineEmits(['refresh-start', 'refresh-success', 'refresh-error'])

const unifiedRefreshRef = ref<InstanceType<typeof UnifiedRefreshButton>>()
const status = ref<CacheStatus | null>(null)

const fetchStatus = async () => {
  try {
    const currentDataSource =
      props.dataSource || localStorage.getItem('preferredDataSource') || 'tushare'
    status.value = await cacheService.getCacheStatus(currentDataSource)
  } catch (error) {
    console.error('获取缓存状态失败:', error)
  }
}

const wrappedRefreshAction = async () => {
  const currentDataSource =
    props.dataSource || localStorage.getItem('preferredDataSource') || 'tushare'
  const result = await dataRefreshService.refreshAllData(true, currentDataSource)
  if (!result.success) {
    throw new Error(result.message || '刷新失败')
  }
  return result
}

const handleRefreshSuccess = async (result: any) => {
  await fetchStatus()
  emit('refresh-success', result)
}

const handleRefreshError = (error: any) => {
  emit('refresh-error', error)
}

onMounted(async () => {
  await fetchStatus()
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
