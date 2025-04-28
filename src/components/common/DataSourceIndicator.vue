<template>
  <div class="data-source-indicator" @click="showSourceInfo">
    <div class="indicator-icon" :class="{ 'is-connected': isConnected }">
      <i class="el-icon-connection"></i>
    </div>
    <div class="indicator-text">
      <span class="source-name">{{ sourceName }}</span>
      <span v-if="showStatus" class="source-status" :class="{ 'is-connected': isConnected }">
        {{ isConnected ? '已连接' : '未连接' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { stockService } from '@/services/stockService'
import { ElMessageBox } from 'element-plus'
import eventBus from '@/utils/eventBus'
import type { DataSourceType } from '@/services/dataSource/DataSourceFactory'

const props = defineProps({
  showStatus: {
    type: Boolean,
    default: true,
  },
})

const router = useRouter()
const sourceName = ref('加载中...')
const isConnected = ref(false)
const checkInterval = ref<number | null>(null)

// 获取当前数据源信息
const updateSourceInfo = async () => {
  try {
    const currentType = stockService.getCurrentDataSourceType()
    const sourceInfo = stockService.getDataSourceInfo(currentType)
    sourceName.value = sourceInfo.name

    // 测试连接
    isConnected.value = await stockService.testDataSource(currentType)
  } catch (error) {
    console.error('获取数据源信息失败:', error)
    sourceName.value = '未知数据源'
    isConnected.value = false
  }
}

// 显示数据源信息
const showSourceInfo = () => {
  ElMessageBox.confirm(
    `当前数据源: ${sourceName.value}\n状态: ${
      isConnected.value ? '已连接' : '未连接'
    }\n\n是否前往数据源设置页面?`,
    '数据源信息',
    {
      confirmButtonText: '前往设置',
      cancelButtonText: '取消',
      type: 'info',
    }
  )
    .then(() => {
      router.push('/settings/data-source')
    })
    .catch(() => {
      // 用户取消，不做任何操作
    })
}

onMounted(async () => {
  // 初始化获取数据源信息
  await updateSourceInfo()

  // 禁用定期检查数据源连接状态，避免频繁API调用
  // checkInterval.value = window.setInterval(async () => {
  //   const currentType = stockService.getCurrentDataSourceType()
  //   isConnected.value = await stockService.testDataSource(currentType)
  // }, 5 * 60 * 1000) // 每5分钟检查一次
  console.log('数据源状态自动检查已禁用，避免频繁API调用')

  // 监听数据源变化事件
  eventBus.on('data-source-changed', async (type: DataSourceType) => {
    await updateSourceInfo()
  })

  // 监听数据源缓存清除事件
  eventBus.on('data-source-cache-cleared', async (type: DataSourceType) => {
    if (type === stockService.getCurrentDataSourceType()) {
      await updateSourceInfo()
    }
  })
})

onUnmounted(() => {
  // 清除定时器
  if (checkInterval.value) {
    clearInterval(checkInterval.value)
  }

  // 移除事件监听
  eventBus.off('data-source-changed')
  eventBus.off('data-source-cache-cleared')
})
</script>

<style scoped>
.data-source-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 4px;
  background-color: var(--el-bg-color-page);
  cursor: pointer;
  transition: all 0.3s;
}

.data-source-indicator:hover {
  background-color: var(--el-color-primary-light-9);
}

.indicator-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: var(--el-color-danger);
  color: white;
  font-size: 12px;
  transition: all 0.3s;
}

.indicator-icon.is-connected {
  background-color: var(--el-color-success);
}

.indicator-text {
  display: flex;
  flex-direction: column;
}

.source-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.source-status {
  font-size: 10px;
  color: var(--el-color-danger);
}

.source-status.is-connected {
  color: var(--el-color-success);
}
</style>
