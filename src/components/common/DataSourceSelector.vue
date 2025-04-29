<template>
  <div class="data-source-selector">
    <div class="selector-header">
      <h3 class="selector-title">{{ title || '数据源选择' }}</h3>
      <p v-if="description" class="selector-description">{{ description }}</p>
    </div>

    <div class="selector-content">
      <div class="current-source">
        <span class="label">当前数据源:</span>
        <el-tag type="primary" effect="dark">{{ currentDataSourceName }}</el-tag>
      </div>

      <div class="source-list">
        <el-radio-group v-model="selectedSource" @change="handleSourceChange">
          <el-radio-button
            v-for="source in availableSources"
            :key="source"
            :label="source"
            :disabled="source === currentSource || isChanging"
          >
            {{ getSourceInfo(source).name }}
          </el-radio-button>
        </el-radio-group>
      </div>

      <div class="source-actions">
        <el-button
          type="primary"
          size="small"
          @click="switchDataSource"
          :disabled="selectedSource === currentSource || isChanging"
          :loading="isChanging"
        >
          切换到选中数据源
        </el-button>

        <el-button
          type="warning"
          size="small"
          @click="clearSourceCache"
          :disabled="isClearing"
          :loading="isClearing"
        >
          清除当前数据源缓存
        </el-button>
      </div>

      <div v-if="showInfo" class="source-info">
        <el-alert type="info" :closable="false" show-icon>
          <template #title>
            <span>数据源隔离模式已启用</span>
          </template>
          <div>切换数据源后，所有数据将从新数据源获取，确保数据一致性。</div>
        </el-alert>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { stockService } from '@/services/stockService'
import type { DataSourceType } from '@/services/dataSource/DataSourceFactory'
import { DataSourceFactory } from '@/services/dataSource/DataSourceFactory'
import { useToast } from '@/composables/useToast'
import eventBus from '@/utils/eventBus'

// 定义属性
const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  showInfo: {
    type: Boolean,
    default: true,
  },
})

// 定义事件
const emit = defineEmits(['source-changed', 'cache-cleared'])

// 状态
const { showToast } = useToast()
const currentSource = ref<DataSourceType>(stockService.getCurrentDataSourceType())
const selectedSource = ref<DataSourceType>(currentSource.value)
const availableSources = ref<DataSourceType[]>([])
const isChanging = ref(false)
const isClearing = ref(false)

// 计算属性
const currentDataSourceName = computed(() => {
  return DataSourceFactory.getDataSourceInfo(currentSource.value).name
})

// 获取数据源信息
const getSourceInfo = (source: DataSourceType) => {
  return DataSourceFactory.getDataSourceInfo(source)
}

// 切换数据源
const handleSourceChange = (value: DataSourceType) => {
  selectedSource.value = value
}

// 执行数据源切换
const switchDataSource = async () => {
  if (selectedSource.value === currentSource.value) {
    showToast(`已经是${getSourceInfo(selectedSource.value).name}，无需切换`, 'info')
    return
  }

  isChanging.value = true

  try {
    // 检查冷却时间
    const lastSwitchTime = localStorage.getItem('last_source_switch_time')
    if (lastSwitchTime) {
      const now = Date.now()
      const elapsed = now - parseInt(lastSwitchTime)
      const cooldownPeriod = 60 * 60 * 1000 // 1小时

      if (elapsed < cooldownPeriod) {
        const remainingMinutes = Math.ceil((cooldownPeriod - elapsed) / (60 * 1000))
        showToast(`数据源切换过于频繁，请在 ${remainingMinutes} 分钟后再试`, 'warning')
        isChanging.value = false
        return
      }
    }

    // 执行切换
    const success = stockService.switchDataSource(selectedSource.value)

    if (success) {
      currentSource.value = selectedSource.value

      // 保存当前选择的数据源到本地存储
      localStorage.setItem('preferredDataSource', selectedSource.value)

      showToast(`已切换到${getSourceInfo(selectedSource.value).name}`, 'success')

      // 发出事件
      emit('source-changed', selectedSource.value)
    } else {
      showToast('切换数据源失败', 'error')
    }
  } catch (error) {
    console.error('切换数据源失败:', error)
    showToast(`切换数据源失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error')
  } finally {
    isChanging.value = false
  }
}

// 清除数据源缓存
const clearSourceCache = async () => {
  isClearing.value = true

  try {
    const success = await stockService.clearDataSourceCache(currentSource.value)

    if (success) {
      showToast(`已清除${getSourceInfo(currentSource.value).name}的缓存数据`, 'success')

      // 发出事件
      emit('cache-cleared', currentSource.value)
    } else {
      showToast(`清除${getSourceInfo(currentSource.value).name}缓存数据失败`, 'error')
    }
  } catch (error) {
    console.error(`清除${currentSource.value}数据源缓存失败:`, error)
    showToast(`清除缓存失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error')
  } finally {
    isClearing.value = false
  }
}

// 监听数据源变化
const updateCurrentDataSource = (type: DataSourceType) => {
  currentSource.value = type
  selectedSource.value = type
}

onMounted(() => {
  // 获取可用数据源
  availableSources.value = stockService.getAvailableDataSources()

  // 从本地存储中获取当前数据源
  const savedDataSource = localStorage.getItem('preferredDataSource')
  if (savedDataSource) {
    // 验证保存的数据源是否有效
    const isValidSource = availableSources.value.some((source) => source.type === savedDataSource)
    if (isValidSource) {
      updateCurrentDataSource(savedDataSource as DataSourceType)
    }
  }

  // 监听数据源变化事件
  eventBus.on('data-source-changed', updateCurrentDataSource)
})
</script>

<style scoped>
.data-source-selector {
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 16px;
  box-shadow: var(--el-box-shadow-light);
  margin-bottom: 20px;
}

.selector-header {
  margin-bottom: 16px;
}

.selector-title {
  font-size: 18px;
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

.selector-description {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.current-source {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.label {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.source-list {
  margin-bottom: 16px;
}

.source-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.source-info {
  margin-top: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .source-list :deep(.el-radio-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .source-actions {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
