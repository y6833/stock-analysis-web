<template>
  <div class="data-source-status">
    <h3 class="status-title">数据源状态监控</h3>

    <div class="status-cards">
      <el-card
        v-for="source in availableSources"
        :key="source"
        class="status-card"
        :class="{ 'current-source': source === currentSource }"
        shadow="hover"
      >
        <div class="status-header">
          <h4>{{ getSourceInfo(source).name }}</h4>
          <div class="status-indicator" :class="getStatusClass(sourceStatus[source])">
            <span class="status-dot"></span>
            <span class="status-text">{{ getStatusText(sourceStatus[source]) }}</span>
          </div>
        </div>

        <div class="status-content">
          <div class="status-metrics">
            <div class="metric">
              <div class="metric-label">响应时间</div>
              <div class="metric-value">{{ responseTime[source] || '未知' }}</div>
            </div>
            <div class="metric">
              <div class="metric-label">可用性</div>
              <div class="metric-value">{{ availability[source] || '未知' }}</div>
            </div>
            <div class="metric">
              <div class="metric-label">最后检查</div>
              <div class="metric-value">{{ lastChecked[source] || '未检查' }}</div>
            </div>
          </div>

          <div class="status-actions">
            <el-button
              type="primary"
              size="small"
              @click="
                source === currentSource ? checkStatus(source) : checkCurrentSourceOnly(source)
              "
              :loading="checkingSource === source"
            >
              {{ source === currentSource ? '检查连接' : '检查当前数据源' }}
            </el-button>
            <el-button v-if="source === currentSource" type="success" size="small" disabled>
              当前使用中
            </el-button>
            <el-button v-else type="info" size="small" @click="switchSource(source)">
              切换到此数据源
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <div class="status-summary">
      <h4>系统状态摘要</h4>
      <div class="summary-content">
        <div class="summary-item">
          <div class="summary-label">当前数据源</div>
          <div class="summary-value">{{ getSourceInfo(currentSource).name }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">状态</div>
          <div class="summary-value" :class="getStatusClass(sourceStatus[currentSource])">
            {{ getStatusText(sourceStatus[currentSource]) }}
          </div>
        </div>
        <div class="summary-item">
          <div class="summary-label">健康数据源</div>
          <div class="summary-value">{{ healthySourcesCount }} / {{ availableSources.length }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">推荐操作</div>
          <div class="summary-value">
            <span v-if="sourceStatus[currentSource] === 'online'">继续使用当前数据源</span>
            <span v-else-if="healthySourcesCount > 0">切换到健康的数据源</span>
            <span v-else>检查网络连接或稍后再试</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { stockService } from '@/services/stockService'
import { DataSourceFactory, type DataSourceType } from '@/services/dataSource/DataSourceFactory'
import { ElMessage } from 'element-plus'

// 属性
const props = defineProps({
  currentSource: {
    type: String as () => DataSourceType,
    required: true,
  },
})

// 事件
const emit = defineEmits(['switch-source'])

// 状态
const availableSources = ref<DataSourceType[]>([])
const sourceStatus = ref<Record<DataSourceType, 'online' | 'offline' | 'unknown'>>(
  {} as Record<DataSourceType, 'online' | 'offline' | 'unknown'>
)
const responseTime = ref<Record<DataSourceType, string>>({} as Record<DataSourceType, string>)
const availability = ref<Record<DataSourceType, string>>({} as Record<DataSourceType, string>)
const lastChecked = ref<Record<DataSourceType, string>>({} as Record<DataSourceType, string>)
const checkingSource = ref<DataSourceType | null>(null)
const checkInterval = ref<number | null>(null)

// 计算属性
const healthySourcesCount = computed(() => {
  return Object.values(sourceStatus.value).filter((status) => status === 'online').length
})

// 获取数据源信息
const getSourceInfo = (source: DataSourceType) => {
  return stockService.getDataSourceInfo(source)
}

// 获取状态类名
const getStatusClass = (status: 'online' | 'offline' | 'unknown' | undefined) => {
  if (status === 'online') return 'status-online'
  if (status === 'offline') return 'status-offline'
  return 'status-unknown'
}

// 获取状态文本
const getStatusText = (status: 'online' | 'offline' | 'unknown' | undefined) => {
  if (status === 'online') return '在线'
  if (status === 'offline') return '离线'
  return '未知'
}

// 检查数据源状态
const checkStatus = async (source: DataSourceType) => {
  checkingSource.value = source

  try {
    const startTime = Date.now()
    // 传递当前数据源，确保只测试当前数据源
    const isOnline = await stockService.testDataSource(source, props.currentSource)
    const endTime = Date.now()

    // 更新状态
    sourceStatus.value[source] = isOnline ? 'online' : 'offline'
    responseTime.value[source] = `${endTime - startTime}ms`
    lastChecked.value[source] = new Date().toLocaleTimeString()

    // 更新可用性
    if (!availability.value[source]) {
      availability.value[source] = isOnline ? '100%' : '0%'
    } else {
      // 简单计算可用性
      const currentAvailability = parseInt(availability.value[source].replace('%', ''))
      const newAvailability = isOnline
        ? Math.min(100, currentAvailability + 5)
        : Math.max(0, currentAvailability - 10)
      availability.value[source] = `${newAvailability}%`
    }

    // 显示消息
    if (isOnline) {
      ElMessage.success(`${getSourceInfo(source).name}连接正常`)
    } else {
      ElMessage.warning(`${getSourceInfo(source).name}连接失败`)
    }
  } catch (error) {
    console.error(`检查数据源${source}状态失败:`, error)
    sourceStatus.value[source] = 'offline'
    ElMessage.error(`检查数据源状态失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    checkingSource.value = null
  }
}

// 切换数据源
const switchSource = (source: DataSourceType) => {
  emit('switch-source', source)
}

// 只检查当前数据源（忽略传入的源）
const checkCurrentSourceOnly = (source: DataSourceType) => {
  // 显示提示消息
  ElMessage.info(
    `为避免不必要的API调用，只检查当前数据源: ${getSourceInfo(props.currentSource).name}`
  )
  // 检查当前数据源
  checkStatus(props.currentSource)
}

// 初始化所有数据源状态
const initializeSourceStatus = () => {
  availableSources.value.forEach((source) => {
    sourceStatus.value[source] = 'unknown'
    responseTime.value[source] = '未知'
    availability.value[source] = '未知'
    lastChecked.value[source] = '未检查'
  })
}

// 定期检查当前数据源状态
const startStatusCheck = () => {
  // 清除现有定时器
  if (checkInterval.value) {
    clearInterval(checkInterval.value)
  }

  // 禁用定期检查，避免频繁API调用
  // checkInterval.value = window.setInterval(() => {
  //   checkStatus(props.currentSource)
  // }, 5 * 60 * 1000)
  console.log('数据源状态自动检查已禁用，避免频繁API调用')
}

// 初始化
onMounted(async () => {
  // 获取所有可用数据源
  availableSources.value = DataSourceFactory.getAvailableDataSources()

  // 初始化数据源状态 - 所有数据源初始化为未知状态
  initializeSourceStatus()

  // 只检查当前数据源状态，不检查其他数据源
  console.log(`只检查当前数据源: ${props.currentSource}，跳过其他数据源`)
  await checkStatus(props.currentSource)

  // 确保其他数据源保持未知状态，避免自动测试
  availableSources.value.forEach((source) => {
    if (source !== props.currentSource) {
      sourceStatus.value[source] = 'unknown'
      // 设置一个占位符，避免自动测试
      responseTime.value[source] = '未测试'
      lastChecked.value[source] = '未测试'
      availability.value[source] = '未知'
    }
  })

  // 开始定期检查 - 只检查当前数据源
  startStatusCheck()
})

// 清理
onBeforeUnmount(() => {
  if (checkInterval.value) {
    clearInterval(checkInterval.value)
  }
})
</script>

<style scoped>
.data-source-status {
  margin-top: 30px;
}

.status-title {
  margin-bottom: 20px;
  font-size: 18px;
  color: #333;
}

.status-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.status-card {
  transition: all 0.3s;
}

.status-card.current-source {
  border: 1px solid #67c23a;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.status-header h4 {
  margin: 0;
  font-size: 16px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
}

.status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-online .status-dot {
  background-color: #67c23a;
}

.status-offline .status-dot {
  background-color: #f56c6c;
}

.status-unknown .status-dot {
  background-color: #909399;
}

.status-online .status-text {
  color: #67c23a;
}

.status-offline .status-text {
  color: #f56c6c;
}

.status-unknown .status-text {
  color: #909399;
}

.status-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 15px;
}

.metric {
  text-align: center;
}

.metric-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 5px;
}

.metric-value {
  font-size: 14px;
  font-weight: 500;
}

.status-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.status-summary {
  background-color: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
  margin-top: 30px;
}

.status-summary h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  color: #333;
}

.summary-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.summary-label {
  font-size: 12px;
  color: #909399;
}

.summary-value {
  font-size: 14px;
  font-weight: 500;
}

.summary-value.status-online {
  color: #67c23a;
}

.summary-value.status-offline {
  color: #f56c6c;
}

.summary-value.status-unknown {
  color: #909399;
}

@media (max-width: 768px) {
  .status-cards {
    grid-template-columns: 1fr;
  }

  .summary-content {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
