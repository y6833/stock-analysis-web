<template>
  <div class="data-source-monitor">
    <h3 class="monitor-title">{{ title || '数据源监控' }}</h3>
    
    <p v-if="description" class="monitor-description">{{ description }}</p>
    
    <el-alert
      v-if="store.hasError"
      type="error"
      :closable="false"
      show-icon
      class="monitor-alert"
    >
      <template #title>
        <span>监控加载失败</span>
      </template>
      <div>{{ store.errorMessage }}</div>
    </el-alert>
    
    <div v-loading="store.isLoading" class="monitor-content">
      <!-- 数据源状态概览 -->
      <div class="monitor-section">
        <h4 class="section-title">状态概览</h4>
        
        <div class="status-overview">
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="status-card">
                <div class="status-card-header">
                  <span class="status-card-title">当前数据源</span>
                </div>
                <div class="status-card-body">
                  <div class="status-value">{{ store.currentSourceName }}</div>
                  <div class="status-indicator" :class="{ 'is-online': currentSourceOnline }">
                    {{ currentSourceOnline ? '在线' : '离线' }}
                  </div>
                </div>
              </div>
            </el-col>
            
            <el-col :span="8">
              <div class="status-card">
                <div class="status-card-header">
                  <span class="status-card-title">响应时间</span>
                </div>
                <div class="status-card-body">
                  <div class="status-value">{{ responseTime }}</div>
                  <div class="status-indicator" :class="responseTimeClass">
                    {{ responseTimeStatus }}
                  </div>
                </div>
              </div>
            </el-col>
            
            <el-col :span="8">
              <div class="status-card">
                <div class="status-card-header">
                  <span class="status-card-title">上次检查</span>
                </div>
                <div class="status-card-body">
                  <div class="status-value">{{ lastChecked }}</div>
                  <div class="status-indicator">
                    <el-button type="primary" size="small" @click="checkAllSources" :loading="checkingAll">
                      立即检查
                    </el-button>
                  </div>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
      
      <!-- 数据源状态详情 -->
      <div class="monitor-section">
        <h4 class="section-title">状态详情</h4>
        
        <el-table :data="sourceStatusList" style="width: 100%" border>
          <el-table-column prop="name" label="数据源" min-width="120">
            <template #default="{ row }">
              <div class="source-name-cell">
                <span>{{ row.name }}</span>
                <el-tag v-if="row.source === store.currentSource" type="success" size="small">当前</el-tag>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.isOnline ? 'success' : 'danger'" size="small">
                {{ row.isOnline ? '在线' : '离线' }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="responseTime" label="响应时间" width="120" />
          
          <el-table-column prop="lastChecked" label="上次检查" width="150" />
          
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button
                  type="primary"
                  size="small"
                  @click="checkSource(row.source)"
                  :loading="checkingSource === row.source"
                  :disabled="isDisabled(row.source)"
                >
                  测试
                </el-button>
                
                <el-button
                  type="warning"
                  size="small"
                  @click="clearSourceCache(row.source)"
                  :loading="clearingCache === row.source"
                  :disabled="isDisabled(row.source)"
                >
                  清除缓存
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <!-- 监控设置 -->
      <div class="monitor-section">
        <h4 class="section-title">监控设置</h4>
        
        <el-form label-position="top" class="monitor-form">
          <el-form-item label="自动检查">
            <div class="auto-check-setting">
              <el-switch v-model="autoCheck" @change="toggleAutoCheck" />
              <span class="setting-description">
                {{ autoCheck ? '已启用自动检查' : '已禁用自动检查' }}
              </span>
            </div>
          </el-form-item>
          
          <el-form-item v-if="autoCheck" label="检查间隔 (分钟)">
            <el-input-number
              v-model="checkInterval"
              :min="1"
              :max="60"
              :step="1"
              @change="updateCheckInterval"
            />
          </el-form-item>
          
          <el-form-item label="通知设置">
            <div class="notification-setting">
              <el-checkbox v-model="notifyOnError" @change="updateNotificationSettings">
                数据源离线时通知
              </el-checkbox>
              <el-checkbox v-model="notifyOnRecover" @change="updateNotificationSettings">
                数据源恢复时通知
              </el-checkbox>
            </div>
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 日志记录 -->
      <div class="monitor-section">
        <div class="section-header">
          <h4 class="section-title">日志记录</h4>
          <el-button type="primary" size="small" @click="refreshLogs">刷新</el-button>
        </div>
        
        <el-table :data="logEntries" style="width: 100%" height="300px" border>
          <el-table-column prop="timestamp" label="时间" width="180">
            <template #default="{ row }">
              {{ formatTimestamp(row.timestamp) }}
            </template>
          </el-table-column>
          
          <el-table-column prop="level" label="级别" width="100">
            <template #default="{ row }">
              <el-tag :type="getLogLevelType(row.level)" size="small">
                {{ row.level }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="source" label="数据源" width="120" />
          
          <el-table-column prop="message" label="消息" min-width="300" show-overflow-tooltip />
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDataSourceStore } from '@/stores/dataSourceStore'
import { DataSourceFactory, type DataSourceType } from '@/services/dataSource/DataSourceFactory'
import { useLogger } from '@/composables/useLogger'

const logger = useLogger('DataSourceMonitor')
const store = useDataSourceStore()

// 组件属性
const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  }
})

// 组件事件
const emit = defineEmits(['status-updated', 'cache-cleared'])

// 状态变量
const checkingSource = ref<DataSourceType | null>(null)
const clearingCache = ref<DataSourceType | null>(null)
const checkingAll = ref(false)
const autoCheck = ref(false)
const checkInterval = ref(5)
const notifyOnError = ref(true)
const notifyOnRecover = ref(true)
const checkIntervalId = ref<number | null>(null)
const logEntries = ref<any[]>([])

// 计算属性
const currentSourceOnline = computed(() => {
  return store.currentSourceStatus.isOnline
})

const responseTime = computed(() => {
  return store.currentSourceStatus.responseTime || '未知'
})

const responseTimeClass = computed(() => {
  if (!store.currentSourceStatus.responseTime) return ''
  
  const time = parseInt(store.currentSourceStatus.responseTime)
  if (isNaN(time)) return ''
  
  if (time < 500) return 'is-good'
  if (time < 1000) return 'is-normal'
  return 'is-slow'
})

const responseTimeStatus = computed(() => {
  if (!store.currentSourceStatus.responseTime) return '未知'
  
  const time = parseInt(store.currentSourceStatus.responseTime)
  if (isNaN(time)) return '未知'
  
  if (time < 500) return '良好'
  if (time < 1000) return '正常'
  return '缓慢'
})

const lastChecked = computed(() => {
  return store.currentSourceStatus.lastChecked || '未检查'
})

const sourceStatusList = computed(() => {
  return store.availableSources.map(source => {
    const info = DataSourceFactory.getDataSourceInfo(source)
    const status = store.sourcesStatus[source] || {
      isOnline: false,
      lastChecked: '未检查',
      responseTime: '未知'
    }
    
    return {
      source,
      name: info.name,
      description: info.description,
      isOnline: status.isOnline,
      responseTime: status.responseTime,
      lastChecked: status.lastChecked,
      error: status.error
    }
  })
})

// 初始化
onMounted(async () => {
  logger.info('数据源监控组件已挂载')
  
  // 初始化数据源Store
  if (!store.isLoading && Object.keys(store.sourcesStatus).length === 0) {
    await store.initializeStore()
  }
  
  // 加载监控设置
  loadMonitorSettings()
  
  // 加载日志
  loadLogs()
  
  // 如果启用了自动检查，启动定时器
  if (autoCheck.value) {
    startAutoCheck()
  }
})

// 组件卸载
onUnmounted(() => {
  // 停止自动检查
  stopAutoCheck()
})

// 加载监控设置
function loadMonitorSettings() {
  try {
    const settings = localStorage.getItem('dataSourceMonitorSettings')
    if (settings) {
      const parsed = JSON.parse(settings)
      autoCheck.value = parsed.autoCheck ?? false
      checkInterval.value = parsed.checkInterval ?? 5
      notifyOnError.value = parsed.notifyOnError ?? true
      notifyOnRecover.value = parsed.notifyOnRecover ?? true
    }
  } catch (error) {
    logger.error('加载监控设置失败', error)
  }
}

// 保存监控设置
function saveMonitorSettings() {
  try {
    const settings = {
      autoCheck: autoCheck.value,
      checkInterval: checkInterval.value,
      notifyOnError: notifyOnError.value,
      notifyOnRecover: notifyOnRecover.value
    }
    
    localStorage.setItem('dataSourceMonitorSettings', JSON.stringify(settings))
    logger.info('保存监控设置成功', settings)
  } catch (error) {
    logger.error('保存监控设置失败', error)
  }
}

// 切换自动检查
function toggleAutoCheck() {
  if (autoCheck.value) {
    startAutoCheck()
  } else {
    stopAutoCheck()
  }
  
  saveMonitorSettings()
}

// 更新检查间隔
function updateCheckInterval() {
  // 如果已启用自动检查，重新启动定时器
  if (autoCheck.value) {
    stopAutoCheck()
    startAutoCheck()
  }
  
  saveMonitorSettings()
}

// 更新通知设置
function updateNotificationSettings() {
  saveMonitorSettings()
}

// 启动自动检查
function startAutoCheck() {
  stopAutoCheck()
  
  const interval = checkInterval.value * 60 * 1000
  checkIntervalId.value = window.setInterval(() => {
    checkAllSources()
  }, interval)
  
  logger.info(`已启动自动检查，间隔: ${checkInterval.value}分钟`)
}

// 停止自动检查
function stopAutoCheck() {
  if (checkIntervalId.value) {
    window.clearInterval(checkIntervalId.value)
    checkIntervalId.value = null
    logger.info('已停止自动检查')
  }
}

// 检查单个数据源
async function checkSource(source: DataSourceType) {
  try {
    checkingSource.value = source
    
    const prevStatus = store.sourcesStatus[source]?.isOnline
    const result = await store.checkSourceStatus(source)
    const newStatus = store.sourcesStatus[source]?.isOnline
    
    // 记录日志
    logSourceStatus(source, result)
    
    // 发送通知
    if (prevStatus !== undefined && prevStatus !== newStatus) {
      if (!newStatus && notifyOnError.value) {
        // 数据源离线通知
        notifySourceStatus(source, false)
      } else if (newStatus && notifyOnRecover.value) {
        // 数据源恢复通知
        notifySourceStatus(source, true)
      }
    }
    
    emit('status-updated', source, result)
  } finally {
    checkingSource.value = null
  }
}

// 检查所有数据源
async function checkAllSources() {
  try {
    checkingAll.value = true
    
    for (const source of store.availableSources) {
      if (!isDisabled(source)) {
        await checkSource(source)
      }
    }
  } finally {
    checkingAll.value = false
  }
}

// 清除数据源缓存
async function clearSourceCache(source: DataSourceType) {
  try {
    clearingCache.value = source
    
    const success = await store.clearSourceCache(source)
    
    if (success) {
      // 记录日志
      addLogEntry({
        timestamp: new Date(),
        level: 'INFO',
        source,
        message: `已清除${DataSourceFactory.getDataSourceInfo(source).name}的缓存数据`
      })
      
      emit('cache-cleared', source)
    }
  } finally {
    clearingCache.value = null
  }
}

// 判断数据源是否禁用
function isDisabled(source: DataSourceType): boolean {
  // 这里可以添加判断数据源是否禁用的逻辑
  return false
}

// 记录数据源状态
function logSourceStatus(source: DataSourceType, isOnline: boolean) {
  const sourceName = DataSourceFactory.getDataSourceInfo(source).name
  const status = isOnline ? '在线' : '离线'
  const level = isOnline ? 'INFO' : 'WARN'
  
  addLogEntry({
    timestamp: new Date(),
    level,
    source,
    message: `${sourceName}数据源${status}`
  })
}

// 发送数据源状态通知
function notifySourceStatus(source: DataSourceType, isOnline: boolean) {
  const sourceName = DataSourceFactory.getDataSourceInfo(source).name
  const status = isOnline ? '恢复在线' : '已离线'
  const type = isOnline ? 'success' : 'error'
  
  // 这里可以添加发送通知的逻辑，例如桌面通知
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`数据源状态变更`, {
      body: `${sourceName}数据源${status}`,
      icon: '/favicon.ico'
    })
  }
  
  // 也可以使用 Element Plus 的消息通知
  // ElNotification({
  //   title: '数据源状态变更',
  //   message: `${sourceName}数据源${status}`,
  //   type,
  //   duration: 5000
  // })
}

// 加载日志
function loadLogs() {
  // 这里可以添加从后端加载日志的逻辑
  // 暂时使用模拟数据
  logEntries.value = [
    {
      timestamp: new Date(Date.now() - 60000),
      level: 'INFO',
      source: store.currentSource,
      message: '数据源监控组件已初始化'
    }
  ]
}

// 刷新日志
function refreshLogs() {
  loadLogs()
}

// 添加日志条目
function addLogEntry(entry: any) {
  logEntries.value.unshift(entry)
  
  // 限制日志条数
  if (logEntries.value.length > 100) {
    logEntries.value = logEntries.value.slice(0, 100)
  }
}

// 格式化时间戳
function formatTimestamp(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return date.toLocaleString()
}

// 获取日志级别类型
function getLogLevelType(level: string): string {
  switch (level) {
    case 'ERROR':
      return 'danger'
    case 'WARN':
      return 'warning'
    case 'INFO':
      return 'info'
    case 'DEBUG':
      return 'success'
    default:
      return 'info'
  }
}
</script>

<style scoped>
.data-source-monitor {
  max-width: 1000px;
  margin: 0 auto;
}

.monitor-title {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--el-text-color-primary);
}

.monitor-description {
  color: var(--el-text-color-secondary);
  margin-bottom: 1.5rem;
}

.monitor-alert {
  margin-bottom: 1.5rem;
}

.monitor-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.monitor-section {
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: var(--el-box-shadow-light);
}

.section-title {
  font-size: 1.2rem;
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--el-text-color-primary);
  border-bottom: 1px solid var(--el-border-color-light);
  padding-bottom: 0.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header .section-title {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}

.status-overview {
  margin-bottom: 1rem;
}

.status-card {
  background-color: var(--el-bg-color);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: var(--el-box-shadow-lighter);
  height: 100%;
}

.status-card-header {
  margin-bottom: 0.5rem;
}

.status-card-title {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
}

.status-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.status-value {
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.status-indicator {
  font-size: 0.9rem;
  color: var(--el-color-danger);
}

.status-indicator.is-online {
  color: var(--el-color-success);
}

.status-indicator.is-good {
  color: var(--el-color-success);
}

.status-indicator.is-normal {
  color: var(--el-color-warning);
}

.status-indicator.is-slow {
  color: var(--el-color-danger);
}

.source-name-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.table-actions {
  display: flex;
  gap: 0.5rem;
}

.monitor-form {
  max-width: 500px;
}

.auto-check-setting,
.notification-setting {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.setting-description {
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
}
</style>
