<template>
  <div class="data-source-provider">
    <slot></slot>
    
    <!-- 数据源指示器 -->
    <div v-if="showIndicator" class="data-source-indicator" :class="{ 'is-expanded': isExpanded }">
      <div class="indicator-header" @click="toggleExpand">
        <span class="indicator-icon">📊</span>
        <span class="indicator-text">{{ currentDataSourceName }}</span>
        <span class="indicator-arrow">{{ isExpanded ? '▲' : '▼' }}</span>
      </div>
      
      <div v-if="isExpanded" class="indicator-content">
        <p>当前数据源: <strong>{{ currentDataSourceName }}</strong></p>
        <p class="indicator-description">{{ currentDataSourceDescription }}</p>
        
        <div class="indicator-actions">
          <el-button size="small" type="primary" @click="openDataSourceSettings">
            切换数据源
          </el-button>
          <el-button size="small" type="warning" @click="clearCurrentDataSourceCache">
            清除缓存
          </el-button>
        </div>
        
        <div class="indicator-info">
          <p>
            <el-tag size="small" type="info">数据源隔离模式</el-tag>
            所有数据请求将仅使用当前数据源
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import { stockService } from '@/services/stockService'
import type { DataSourceType } from '@/services/dataSource/DataSourceFactory'
import { DataSourceFactory } from '@/services/dataSource/DataSourceFactory'
import { useToast } from '@/composables/useToast'
import eventBus from '@/utils/eventBus'

// 定义数据源上下文
const DataSourceContext = Symbol('DataSourceContext')

// 定义属性
const props = defineProps({
  showIndicator: {
    type: Boolean,
    default: true
  }
})

// 路由
const router = useRouter()
const { showToast } = useToast()

// 数据源状态
const currentDataSource = ref<DataSourceType>(stockService.getCurrentDataSourceType())
const isExpanded = ref(false)

// 计算属性
const currentDataSourceName = computed(() => {
  return DataSourceFactory.getDataSourceInfo(currentDataSource.value).name
})

const currentDataSourceDescription = computed(() => {
  return DataSourceFactory.getDataSourceInfo(currentDataSource.value).description
})

// 切换展开状态
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

// 打开数据源设置页面
const openDataSourceSettings = () => {
  router.push('/data-source-settings')
  isExpanded.value = false
}

// 清除当前数据源缓存
const clearCurrentDataSourceCache = async () => {
  const success = await stockService.clearDataSourceCache(currentDataSource.value)
  if (success) {
    showToast(`已清除${currentDataSourceName.value}的缓存数据`, 'success')
  } else {
    showToast(`清除${currentDataSourceName.value}缓存数据失败`, 'error')
  }
  isExpanded.value = false
}

// 监听数据源变化
const updateCurrentDataSource = (type: DataSourceType) => {
  currentDataSource.value = type
  console.log(`数据源已更新为: ${type}`)
}

// 提供数据源上下文
provide(DataSourceContext, {
  currentDataSource,
  currentDataSourceName,
  currentDataSourceDescription,
  clearCurrentDataSourceCache
})

onMounted(() => {
  // 监听数据源变化事件
  eventBus.on('data-source-changed', updateCurrentDataSource)
})
</script>

<style scoped>
.data-source-provider {
  position: relative;
}

.data-source-indicator {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 1000;
  width: 200px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.data-source-indicator.is-expanded {
  width: 300px;
}

.indicator-header {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  cursor: pointer;
  background-color: var(--el-color-primary-light-9);
  border-bottom: 1px solid var(--el-border-color-light);
}

.indicator-icon {
  margin-right: 8px;
  font-size: 16px;
}

.indicator-text {
  flex: 1;
  font-weight: 500;
  color: var(--el-color-primary);
}

.indicator-arrow {
  font-size: 12px;
  color: var(--el-color-info);
}

.indicator-content {
  padding: 15px;
  font-size: 14px;
}

.indicator-description {
  color: var(--el-text-color-secondary);
  margin-bottom: 15px;
  font-size: 12px;
}

.indicator-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.indicator-info {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  border-top: 1px dashed var(--el-border-color-lighter);
  padding-top: 10px;
}

.indicator-info p {
  display: flex;
  align-items: center;
  gap: 5px;
}
</style>
