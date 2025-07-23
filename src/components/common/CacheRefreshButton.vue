<template>
  <UnifiedRefreshButton
    ref="unifiedRefreshRef"
    :refresh-action="wrappedRefreshAction"
    :status="status"
    :show-text="showText"
    :show-tooltip="showStatus"
    :tooltip-title="'缓存刷新状态'"
    :button-text="'强制刷新'"
    :force-api="forceApi"
    @refresh-start="emit('refresh-start')"
    @refresh-success="handleRefreshSuccess"
    @refresh-error="handleRefreshError"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { cacheService } from '@/services/cacheService'
import { useToast } from '@/composables/useToast'
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
  forceApi: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['refresh-start', 'refresh-success', 'refresh-error'])

const unifiedRefreshRef = ref<InstanceType<typeof UnifiedRefreshButton>>()
const { showToast } = useToast()
const status = ref<CacheStatus | null>(null)
const checkTimer = ref<number | null>(null)

const fetchStatus = async () => {
  try {
    status.value = await cacheService.getCacheStatus(props.dataSource)
  } catch (error) {
    console.error('获取缓存状态失败:', error)
  }
}

const wrappedRefreshAction = async () => {
  const result = await cacheService.refreshCache(props.dataSource)
  if (!result.success) {
    throw new Error(result.error || '缓存刷新失败')
  }
  return result
}

const handleRefreshSuccess = async (result: any) => {
  showToast(`缓存刷新成功，已更新 ${result.cachedItems || 0} 项数据`, 'success')
  await fetchStatus()
  emit('refresh-success', result)
}

const handleRefreshError = (error: any) => {
  showToast(error.message || '刷新缓存失败', 'error')
  emit('refresh-error', error)
}

onMounted(async () => {
  await fetchStatus()
  checkTimer.value = window.setInterval(async () => {
    await fetchStatus()
  }, 5 * 60 * 1000)
})

onUnmounted(() => {
  if (checkTimer.value) {
    clearInterval(checkTimer.value)
  }
})
</script>
