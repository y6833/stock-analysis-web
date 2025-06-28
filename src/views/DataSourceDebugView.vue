<template>
  <div class="data-source-debug">
    <div class="debug-header">
      <h1>数据源状态调试</h1>
      <p>用于调试数据源切换状态同步问题</p>
    </div>

    <div class="debug-content">
      <!-- 状态显示 -->
      <el-card title="当前状态" class="debug-card">
        <div class="status-grid">
          <div class="status-item">
            <label>统一状态管理器:</label>
            <span class="status-value">{{ stateManagerSource }}</span>
          </div>
          <div class="status-item">
            <label>stockService:</label>
            <span class="status-value">{{ stockServiceSource }}</span>
          </div>
          <div class="status-item">
            <label>localStorage:</label>
            <span class="status-value">{{ localStorageSource }}</span>
          </div>
          <div class="status-item">
            <label>组件状态:</label>
            <span class="status-value">{{ componentSource }}</span>
          </div>
        </div>
        
        <div class="status-check">
          <el-tag :type="isStateConsistent ? 'success' : 'danger'">
            {{ isStateConsistent ? '状态一致' : '状态不一致' }}
          </el-tag>
        </div>
      </el-card>

      <!-- 数据源切换测试 -->
      <el-card title="数据源切换测试" class="debug-card">
        <div class="switch-controls">
          <el-select v-model="selectedSource" placeholder="选择数据源">
            <el-option
              v-for="source in availableSources"
              :key="source"
              :label="getSourceInfo(source).name"
              :value="source"
            />
          </el-select>
          
          <el-button 
            type="primary" 
            @click="testSwitch"
            :loading="isSwitching"
          >
            切换数据源
          </el-button>
          
          <el-button @click="refreshStatus">
            刷新状态
          </el-button>
          
          <el-button @click="clearStorage" type="warning">
            清除localStorage
          </el-button>
        </div>
      </el-card>

      <!-- 事件日志 -->
      <el-card title="事件日志" class="debug-card">
        <div class="log-controls">
          <el-button @click="clearLogs" size="small">清除日志</el-button>
          <el-button @click="exportLogs" size="small">导出日志</el-button>
        </div>
        
        <div class="log-container">
          <div 
            v-for="(log, index) in eventLogs" 
            :key="index"
            class="log-entry"
            :class="log.type"
          >
            <span class="log-time">{{ log.time }}</span>
            <span class="log-type">{{ log.type }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { DataSourceType } from '@/services/dataSource/DataSourceFactory'
import { DataSourceFactory } from '@/services/dataSource/DataSourceFactory'
import { stockService } from '@/services/stockService'
import { dataSourceStateManager } from '@/services/dataSourceStateManager'
import eventBus from '@/utils/eventBus'

// 状态
const componentSource = ref<DataSourceType>('eastmoney')
const selectedSource = ref<DataSourceType>('eastmoney')
const isSwitching = ref(false)
const eventLogs = ref<Array<{
  time: string
  type: string
  message: string
}>>([])

// 可用数据源
const availableSources = computed(() => DataSourceFactory.getAvailableDataSources())

// 获取各个系统的当前数据源
const stateManagerSource = computed(() => dataSourceStateManager.getCurrentDataSource())
const stockServiceSource = computed(() => stockService.getCurrentDataSourceType())
const localStorageSource = computed(() => localStorage.getItem('preferredDataSource') || 'none')

// 检查状态是否一致
const isStateConsistent = computed(() => {
  const sources = [
    stateManagerSource.value,
    stockServiceSource.value,
    localStorageSource.value,
    componentSource.value
  ]
  
  return sources.every(source => source === sources[0])
})

// 获取数据源信息
const getSourceInfo = (source: DataSourceType) => {
  return DataSourceFactory.getDataSourceInfo(source)
}

// 添加日志
const addLog = (type: string, message: string) => {
  const now = new Date()
  eventLogs.value.unshift({
    time: now.toLocaleTimeString(),
    type,
    message
  })
  
  // 限制日志数量
  if (eventLogs.value.length > 100) {
    eventLogs.value = eventLogs.value.slice(0, 100)
  }
}

// 刷新状态
const refreshStatus = () => {
  componentSource.value = stockService.getCurrentDataSourceType()
  addLog('info', '状态已刷新')
}

// 测试切换
const testSwitch = async () => {
  if (!selectedSource.value) {
    ElMessage.warning('请选择数据源')
    return
  }
  
  isSwitching.value = true
  addLog('info', `开始切换数据源到: ${selectedSource.value}`)
  
  try {
    const success = stockService.switchDataSource(selectedSource.value)
    
    if (success) {
      componentSource.value = selectedSource.value
      addLog('success', `数据源切换成功: ${selectedSource.value}`)
      ElMessage.success('数据源切换成功')
    } else {
      addLog('error', `数据源切换失败: ${selectedSource.value}`)
      ElMessage.error('数据源切换失败')
    }
  } catch (error) {
    addLog('error', `数据源切换异常: ${error}`)
    ElMessage.error('数据源切换异常')
  } finally {
    isSwitching.value = false
  }
}

// 清除localStorage
const clearStorage = () => {
  localStorage.removeItem('preferredDataSource')
  localStorage.removeItem('last_source_switch_time')
  addLog('warning', 'localStorage已清除')
  ElMessage.success('localStorage已清除')
  refreshStatus()
}

// 清除日志
const clearLogs = () => {
  eventLogs.value = []
}

// 导出日志
const exportLogs = () => {
  const logText = eventLogs.value
    .map(log => `[${log.time}] ${log.type.toUpperCase()}: ${log.message}`)
    .join('\n')
  
  const blob = new Blob([logText], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `datasource-debug-${Date.now()}.log`
  a.click()
  URL.revokeObjectURL(url)
}

// 监听数据源变化事件
const handleDataSourceChange = (type: DataSourceType) => {
  addLog('event', `收到数据源变化事件: ${type}`)
  componentSource.value = type
}

// 组件挂载
onMounted(() => {
  // 初始化状态
  refreshStatus()
  selectedSource.value = componentSource.value
  
  // 监听事件
  eventBus.on('data-source-changed', handleDataSourceChange)
  
  addLog('info', '调试页面已加载')
})

// 组件卸载
onUnmounted(() => {
  eventBus.off('data-source-changed', handleDataSourceChange)
})
</script>

<style scoped>
.data-source-debug {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.debug-header {
  text-align: center;
  margin-bottom: 30px;
}

.debug-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.debug-card {
  margin-bottom: 20px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: var(--el-bg-color-page);
  border-radius: 4px;
}

.status-item label {
  font-weight: bold;
  color: var(--el-text-color-regular);
}

.status-value {
  color: var(--el-color-primary);
  font-family: monospace;
}

.status-check {
  text-align: center;
}

.switch-controls {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.log-controls {
  margin-bottom: 15px;
}

.log-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 10px;
  background: var(--el-bg-color-page);
}

.log-entry {
  display: flex;
  gap: 10px;
  padding: 5px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-family: monospace;
  font-size: 12px;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-time {
  color: var(--el-text-color-secondary);
  min-width: 80px;
}

.log-type {
  min-width: 60px;
  font-weight: bold;
}

.log-entry.info .log-type {
  color: var(--el-color-info);
}

.log-entry.success .log-type {
  color: var(--el-color-success);
}

.log-entry.warning .log-type {
  color: var(--el-color-warning);
}

.log-entry.error .log-type {
  color: var(--el-color-danger);
}

.log-entry.event .log-type {
  color: var(--el-color-primary);
}

.log-message {
  flex: 1;
  color: var(--el-text-color-primary);
}
</style>
