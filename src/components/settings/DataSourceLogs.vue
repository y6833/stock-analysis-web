<template>
  <div class="data-source-logs">
    <h3 class="logs-title">{{ title || '数据源日志' }}</h3>
    
    <p v-if="description" class="logs-description">{{ description }}</p>
    
    <div class="logs-toolbar">
      <div class="filter-section">
        <el-select v-model="filterLevel" placeholder="日志级别" clearable>
          <el-option label="全部" value="" />
          <el-option label="调试" value="DEBUG" />
          <el-option label="信息" value="INFO" />
          <el-option label="警告" value="WARN" />
          <el-option label="错误" value="ERROR" />
        </el-select>
        
        <el-select v-model="filterSource" placeholder="数据源" clearable>
          <el-option label="全部" value="" />
          <el-option
            v-for="source in store.availableSources"
            :key="source"
            :label="getSourceInfo(source).name"
            :value="source"
          />
        </el-select>
        
        <el-input
          v-model="filterText"
          placeholder="搜索日志内容"
          clearable
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
      
      <div class="action-section">
        <el-button type="primary" @click="refreshLogs" :loading="isLoading">刷新</el-button>
        <el-button type="warning" @click="clearLogs">清除</el-button>
        <el-button type="success" @click="exportLogs">导出</el-button>
      </div>
    </div>
    
    <div class="logs-content">
      <el-table
        :data="filteredLogs"
        style="width: 100%"
        height="500px"
        border
        stripe
        :default-sort="{ prop: 'timestamp', order: 'descending' }"
      >
        <el-table-column prop="timestamp" label="时间" width="180" sortable>
          <template #default="{ row }">
            {{ formatTimestamp(row.timestamp) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="level" label="级别" width="100" sortable>
          <template #default="{ row }">
            <el-tag :type="getLogLevelType(row.level)" size="small">
              {{ row.level }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="module" label="模块" width="150" sortable />
        
        <el-table-column prop="source" label="数据源" width="120" sortable>
          <template #default="{ row }">
            <span v-if="row.source">{{ getSourceName(row.source) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="message" label="消息" min-width="300" show-overflow-tooltip />
        
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="showLogDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="logs-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalLogs"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
    
    <!-- 日志详情对话框 -->
    <el-dialog
      v-model="logDetailVisible"
      title="日志详情"
      width="700px"
      destroy-on-close
    >
      <div v-if="selectedLog" class="log-detail">
        <div class="detail-item">
          <div class="detail-label">时间:</div>
          <div class="detail-value">{{ formatTimestamp(selectedLog.timestamp) }}</div>
        </div>
        
        <div class="detail-item">
          <div class="detail-label">级别:</div>
          <div class="detail-value">
            <el-tag :type="getLogLevelType(selectedLog.level)" size="small">
              {{ selectedLog.level }}
            </el-tag>
          </div>
        </div>
        
        <div class="detail-item">
          <div class="detail-label">模块:</div>
          <div class="detail-value">{{ selectedLog.module }}</div>
        </div>
        
        <div class="detail-item">
          <div class="detail-label">数据源:</div>
          <div class="detail-value">
            {{ selectedLog.source ? getSourceName(selectedLog.source) : '-' }}
          </div>
        </div>
        
        <div class="detail-item">
          <div class="detail-label">消息:</div>
          <div class="detail-value message-value">{{ selectedLog.message }}</div>
        </div>
        
        <div v-if="selectedLog.data" class="detail-item">
          <div class="detail-label">数据:</div>
          <div class="detail-value">
            <pre class="data-value">{{ formatData(selectedLog.data) }}</pre>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { useDataSourceStore } from '@/stores/dataSourceStore'
import { DataSourceFactory, type DataSourceType } from '@/services/dataSource/DataSourceFactory'
import { getLogHistory, LogLevel, type LogEntry } from '@/composables/useLogger'
import { useLogger } from '@/composables/useLogger'
import axios from 'axios'

const logger = useLogger('DataSourceLogs')
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

// 状态变量
const isLoading = ref(false)
const logs = ref<LogEntry[]>([])
const filterLevel = ref('')
const filterSource = ref('')
const filterText = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const logDetailVisible = ref(false)
const selectedLog = ref<LogEntry | null>(null)

// 计算属性
const filteredLogs = computed(() => {
  let result = [...logs.value]
  
  // 按级别筛选
  if (filterLevel.value) {
    result = result.filter(log => log.level === filterLevel.value)
  }
  
  // 按数据源筛选
  if (filterSource.value) {
    result = result.filter(log => log.source === filterSource.value)
  }
  
  // 按文本筛选
  if (filterText.value) {
    const searchText = filterText.value.toLowerCase()
    result = result.filter(log => 
      log.message.toLowerCase().includes(searchText) || 
      (log.module && log.module.toLowerCase().includes(searchText)) ||
      (log.data && JSON.stringify(log.data).toLowerCase().includes(searchText))
    )
  }
  
  // 分页
  const startIndex = (currentPage.value - 1) * pageSize.value
  return result.slice(startIndex, startIndex + pageSize.value)
})

const totalLogs = computed(() => {
  let result = [...logs.value]
  
  // 按级别筛选
  if (filterLevel.value) {
    result = result.filter(log => log.level === filterLevel.value)
  }
  
  // 按数据源筛选
  if (filterSource.value) {
    result = result.filter(log => log.source === filterSource.value)
  }
  
  // 按文本筛选
  if (filterText.value) {
    const searchText = filterText.value.toLowerCase()
    result = result.filter(log => 
      log.message.toLowerCase().includes(searchText) || 
      (log.module && log.module.toLowerCase().includes(searchText)) ||
      (log.data && JSON.stringify(log.data).toLowerCase().includes(searchText))
    )
  }
  
  return result.length
})

// 初始化
onMounted(async () => {
  logger.info('数据源日志组件已挂载')
  
  // 初始化数据源Store
  if (!store.isLoading && Object.keys(store.sourcesStatus).length === 0) {
    await store.initializeStore()
  }
  
  // 加载日志
  await refreshLogs()
})

// 刷新日志
async function refreshLogs() {
  try {
    isLoading.value = true
    
    // 首先尝试从后端API获取日志
    try {
      const response = await axios.get('/api/logs/data-source', {
        params: {
          page: currentPage.value,
          pageSize: pageSize.value,
          level: filterLevel.value,
          source: filterSource.value,
          search: filterText.value
        }
      })
      
      if (response.data && response.data.success) {
        logs.value = response.data.logs
        return
      }
    } catch (error) {
      logger.warn('从后端获取日志失败，使用本地日志', error)
    }
    
    // 如果后端API获取失败，使用本地日志
    logs.value = getLogHistory()
  } catch (error) {
    logger.error('刷新日志失败', error)
    ElMessage.error('刷新日志失败')
  } finally {
    isLoading.value = false
  }
}

// 清除日志
function clearLogs() {
  ElMessageBox.confirm('确定要清除所有日志吗？此操作不可恢复。', '清除日志', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      // 首先尝试从后端API清除日志
      try {
        await axios.delete('/api/logs/data-source')
      } catch (error) {
        logger.warn('从后端清除日志失败', error)
      }
      
      // 清除本地日志
      logs.value = []
      
      ElMessage.success('日志已清除')
    } catch (error) {
      logger.error('清除日志失败', error)
      ElMessage.error('清除日志失败')
    }
  }).catch(() => {
    // 用户取消，不做任何操作
  })
}

// 导出日志
function exportLogs() {
  try {
    // 创建要导出的日志数据
    let exportData = [...logs.value]
    
    // 按筛选条件过滤
    if (filterLevel.value) {
      exportData = exportData.filter(log => log.level === filterLevel.value)
    }
    
    if (filterSource.value) {
      exportData = exportData.filter(log => log.source === filterSource.value)
    }
    
    if (filterText.value) {
      const searchText = filterText.value.toLowerCase()
      exportData = exportData.filter(log => 
        log.message.toLowerCase().includes(searchText) || 
        (log.module && log.module.toLowerCase().includes(searchText)) ||
        (log.data && JSON.stringify(log.data).toLowerCase().includes(searchText))
      )
    }
    
    // 格式化日志数据
    const formattedData = exportData.map(log => ({
      timestamp: formatTimestamp(log.timestamp),
      level: log.level,
      module: log.module,
      source: log.source ? getSourceName(log.source) : '-',
      message: log.message,
      data: log.data ? JSON.stringify(log.data) : ''
    }))
    
    // 转换为CSV
    const headers = ['时间', '级别', '模块', '数据源', '消息', '数据']
    const csvContent = [
      headers.join(','),
      ...formattedData.map(item => [
        `"${item.timestamp}"`,
        `"${item.level}"`,
        `"${item.module}"`,
        `"${item.source}"`,
        `"${item.message.replace(/"/g, '""')}"`,
        `"${item.data.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n')
    
    // 创建Blob对象
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    
    // 创建下载链接
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `data-source-logs-${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    ElMessage.success('日志导出成功')
  } catch (error) {
    logger.error('导出日志失败', error)
    ElMessage.error('导出日志失败')
  }
}

// 显示日志详情
function showLogDetail(log: LogEntry) {
  selectedLog.value = log
  logDetailVisible.value = true
}

// 处理页码变化
function handleCurrentChange(val: number) {
  currentPage.value = val
}

// 处理每页条数变化
function handleSizeChange(val: number) {
  pageSize.value = val
  currentPage.value = 1
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

// 获取数据源信息
function getSourceInfo(source: DataSourceType) {
  return DataSourceFactory.getDataSourceInfo(source)
}

// 获取数据源名称
function getSourceName(source: string) {
  try {
    return DataSourceFactory.getDataSourceInfo(source as DataSourceType).name
  } catch (error) {
    return source
  }
}

// 格式化数据
function formatData(data: any): string {
  try {
    return typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)
  } catch (error) {
    return String(data)
  }
}
</script>

<style scoped>
.data-source-logs {
  max-width: 1200px;
  margin: 0 auto;
}

.logs-title {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--el-text-color-primary);
}

.logs-description {
  color: var(--el-text-color-secondary);
  margin-bottom: 1.5rem;
}

.logs-toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.filter-section {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  flex: 1;
}

.search-input {
  min-width: 200px;
  max-width: 300px;
}

.action-section {
  display: flex;
  gap: 0.5rem;
}

.logs-content {
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: var(--el-box-shadow-light);
}

.logs-pagination {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}

.log-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-item {
  display: flex;
  gap: 1rem;
}

.detail-label {
  font-weight: 500;
  color: var(--el-text-color-primary);
  width: 80px;
  flex-shrink: 0;
}

.detail-value {
  color: var(--el-text-color-regular);
  flex: 1;
}

.message-value {
  white-space: pre-wrap;
  word-break: break-word;
}

.data-value {
  background-color: var(--el-fill-color-light);
  padding: 0.5rem;
  border-radius: 4px;
  overflow: auto;
  max-height: 200px;
  margin: 0;
  font-family: monospace;
  font-size: 0.9rem;
}
</style>
