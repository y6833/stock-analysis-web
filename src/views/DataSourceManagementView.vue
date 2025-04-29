<template>
  <div class="data-source-management">
    <h1 class="page-title">数据源管理</h1>

    <p class="page-description">管理和监控数据源，配置数据源参数，查看数据源日志和状态。</p>

    <el-tabs v-model="activeTab" class="management-tabs">
      <el-tab-pane label="概览" name="overview">
        <div class="tab-content">
          <div class="overview-cards">
            <el-row :gutter="20">
              <el-col :xs="24" :sm="12" :md="8">
                <div class="overview-card">
                  <div class="card-header">
                    <h3 class="card-title">当前数据源</h3>
                  </div>
                  <div class="card-body">
                    <div class="current-source">
                      <div class="source-icon" :class="{ 'is-online': currentSourceOnline }">
                        <el-icon><Connection /></el-icon>
                      </div>
                      <div class="source-info">
                        <div class="source-name">{{ store.currentSourceName }}</div>
                        <div class="source-status">
                          {{ currentSourceOnline ? '在线' : '离线' }}
                          <span class="status-time">
                            ({{ store.currentSourceStatus.lastChecked || '未检查' }})
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="source-description">
                      {{ store.currentSourceDescription }}
                    </div>
                    <div class="card-actions">
                      <el-button type="primary" @click="activeTab = 'config'">配置</el-button>
                      <el-button type="info" @click="testCurrentSource" :loading="testingSource">
                        测试连接
                      </el-button>
                    </div>
                  </div>
                </div>
              </el-col>

              <el-col :xs="24" :sm="12" :md="8">
                <div class="overview-card">
                  <div class="card-header">
                    <h3 class="card-title">缓存状态</h3>
                  </div>
                  <div class="card-body">
                    <div class="cache-stats">
                      <div class="stat-item">
                        <div class="stat-label">本地缓存项</div>
                        <div class="stat-value">
                          {{ store.currentSourceCacheStats.localCacheCount }}
                        </div>
                      </div>
                      <div class="stat-item">
                        <div class="stat-label">Redis缓存项</div>
                        <div class="stat-value">
                          {{ store.currentSourceCacheStats.redisCacheCount }}
                        </div>
                      </div>
                      <div class="stat-item">
                        <div class="stat-label">上次清除</div>
                        <div class="stat-value">
                          {{ store.currentSourceCacheStats.lastCleared }}
                        </div>
                      </div>
                    </div>
                    <div class="card-actions">
                      <el-button
                        type="warning"
                        @click="clearCurrentSourceCache"
                        :loading="clearingCache"
                      >
                        清除缓存
                      </el-button>
                      <el-button type="info" @click="refreshCacheStats" :loading="refreshingCache">
                        刷新
                      </el-button>
                      <el-button type="primary" @click="showCacheDetails = true"> 详情 </el-button>
                    </div>
                  </div>
                </div>
              </el-col>

              <el-col :xs="24" :sm="12" :md="8">
                <div class="overview-card">
                  <div class="card-header">
                    <h3 class="card-title">数据源状态</h3>
                  </div>
                  <div class="card-body">
                    <div class="source-stats">
                      <el-progress
                        :percentage="onlineSourcesPercentage"
                        :format="formatProgress"
                        :status="onlineSourcesPercentage === 100 ? 'success' : 'warning'"
                      />
                      <div class="stat-details">
                        <div class="stat-item">
                          <div class="stat-label">在线数据源</div>
                          <div class="stat-value">{{ onlineSources }} / {{ totalSources }}</div>
                        </div>
                        <div class="stat-item">
                          <div class="stat-label">平均响应时间</div>
                          <div class="stat-value">{{ averageResponseTime }}</div>
                        </div>
                      </div>
                    </div>
                    <div class="card-actions">
                      <el-button type="primary" @click="activeTab = 'monitor'">监控</el-button>
                      <el-button type="info" @click="checkAllSources" :loading="checkingAll">
                        检查全部
                      </el-button>
                    </div>
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>

          <div class="recent-logs">
            <div class="section-header">
              <h3 class="section-title">最近日志</h3>
              <el-button type="primary" size="small" @click="activeTab = 'logs'"
                >查看全部</el-button
              >
            </div>

            <el-table :data="recentLogs" style="width: 100%" border stripe>
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

              <el-table-column prop="source" label="数据源" width="120">
                <template #default="{ row }">
                  <span v-if="row.source">{{ getSourceName(row.source) }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>

              <el-table-column prop="message" label="消息" min-width="300" show-overflow-tooltip />
            </el-table>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="配置" name="config">
        <div class="tab-content">
          <DataSourceConfig
            title="数据源配置"
            description="配置数据源参数，包括超时设置、缓存时间、代理设置等。"
            @config-updated="handleConfigUpdated"
            @source-changed="handleSourceChanged"
            @cache-cleared="handleCacheCleared"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="监控" name="monitor">
        <div class="tab-content">
          <DataSourceMonitor
            title="数据源监控"
            description="监控数据源状态，查看响应时间和可用性。"
            @status-updated="handleStatusUpdated"
            @cache-cleared="handleCacheCleared"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="日志" name="logs">
        <div class="tab-content">
          <DataSourceLogs
            title="数据源日志"
            description="查看数据源相关的日志记录，包括连接测试、缓存操作等。"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 缓存详情对话框 -->
    <el-dialog
      title="缓存详情"
      v-model="showCacheDetails"
      width="90%"
      fullscreen
      :before-close="handleDialogClose"
    >
      <CacheDetails />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection } from '@element-plus/icons-vue'
import { useDataSourceStore } from '@/stores/dataSourceStore'
import { DataSourceFactory, type DataSourceType } from '@/services/dataSource/DataSourceFactory'
import { useLogger } from '@/composables/useLogger'
import DataSourceConfig from '@/components/settings/DataSourceConfig.vue'
import DataSourceMonitor from '@/components/settings/DataSourceMonitor.vue'
import DataSourceLogs from '@/components/settings/DataSourceLogs.vue'
import CacheDetails from '@/components/settings/CacheDetails.vue'
import axios from 'axios'

const logger = useLogger('DataSourceManagement')
const store = useDataSourceStore()

// 状态变量
const activeTab = ref('overview')
const testingSource = ref(false)
const clearingCache = ref(false)
const refreshingCache = ref(false)
const checkingAll = ref(false)
const localCacheCount = ref(0)
const redisCacheCount = ref(0)
const lastCacheClear = ref('')
const recentLogs = ref<any[]>([])
const showCacheDetails = ref(false)

// 计算属性
const currentSourceOnline = computed(() => {
  return store.currentSourceStatus.isOnline
})

const totalSources = computed(() => {
  return store.availableSources.length
})

const onlineSources = computed(() => {
  return store.availableSources.filter((source) => store.sourcesStatus[source]?.isOnline).length
})

const onlineSourcesPercentage = computed(() => {
  if (totalSources.value === 0) return 0
  return Math.round((onlineSources.value / totalSources.value) * 100)
})

const averageResponseTime = computed(() => {
  const times = store.availableSources
    .map((source) => store.sourcesStatus[source]?.responseTime)
    .filter((time) => time && time !== '未知' && time !== '失败')
    .map((time) => parseInt(time as string))
    .filter((time) => !isNaN(time))

  if (times.length === 0) return '未知'

  const avg = times.reduce((sum, time) => sum + time, 0) / times.length
  return `${Math.round(avg)}ms`
})

// 初始化
onMounted(async () => {
  logger.info('数据源管理页面已挂载')

  // 初始化数据源Store
  if (!store.isLoading && Object.keys(store.sourcesStatus).length === 0) {
    await store.initializeStore()
  }

  // 加载缓存统计信息
  await refreshCacheStats()

  // 加载最近日志
  await loadRecentLogs()
})

// 测试当前数据源
async function testCurrentSource() {
  try {
    testingSource.value = true
    await store.testDataSource(store.currentSource)
  } finally {
    testingSource.value = false
  }
}

// 清除当前数据源缓存
async function clearCurrentSourceCache() {
  try {
    clearingCache.value = true
    await store.clearSourceCache(store.currentSource)

    // 刷新缓存统计信息
    await refreshCacheStats()
  } finally {
    clearingCache.value = false
  }
}

// 刷新缓存统计信息
async function refreshCacheStats() {
  try {
    refreshingCache.value = true

    // 使用store中的方法加载缓存统计信息
    await store.loadCacheStats()

    logger.info('缓存统计信息已刷新')
  } catch (error) {
    logger.error('刷新缓存统计失败', error)
    ElMessage.error('刷新缓存统计失败')
  } finally {
    refreshingCache.value = false
  }
}

// 检查所有数据源
async function checkAllSources() {
  try {
    checkingAll.value = true

    for (const source of store.availableSources) {
      await store.checkSourceStatus(source)
    }

    ElMessage.success('所有数据源检查完成')
  } catch (error) {
    logger.error('检查所有数据源失败', error)
    ElMessage.error('检查所有数据源失败')
  } finally {
    checkingAll.value = false
  }
}

// 加载最近日志
async function loadRecentLogs() {
  try {
    // 尝试从后端API获取最近日志
    try {
      const response = await axios.get('/api/logs/data-source/recent', {
        params: { limit: 5 },
      })

      if (response.data && response.data.success) {
        recentLogs.value = response.data.logs
        return
      }
    } catch (error) {
      logger.warn('从后端获取最近日志失败，使用模拟数据', error)
    }

    // 如果后端API获取失败，使用模拟数据
    recentLogs.value = [
      {
        timestamp: new Date(),
        level: 'INFO',
        module: 'DataSourceStore',
        source: store.currentSource,
        message: '数据源管理页面已初始化',
      },
    ]
  } catch (error) {
    logger.error('加载最近日志失败', error)
  }
}

// 处理配置更新
function handleConfigUpdated(source: DataSourceType, config: any) {
  logger.info(`数据源配置已更新: ${source}`, config)
  loadRecentLogs()
}

// 处理数据源变更
function handleSourceChanged(source: DataSourceType) {
  logger.info(`数据源已变更: ${source}`)
  refreshCacheStats()
  loadRecentLogs()
}

// 处理缓存清除
function handleCacheCleared(source: DataSourceType) {
  logger.info(`数据源缓存已清除: ${source}`)
  refreshCacheStats()
  loadRecentLogs()
}

// 处理状态更新
function handleStatusUpdated(source: DataSourceType, isOnline: boolean) {
  logger.info(`数据源状态已更新: ${source}, 在线: ${isOnline}`)
  loadRecentLogs()
}

// 格式化进度条
function formatProgress(percentage: number) {
  return `${onlineSources.value}/${totalSources.value}`
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

// 获取数据源名称
function getSourceName(source: string) {
  try {
    return DataSourceFactory.getDataSourceInfo(source as DataSourceType).name
  } catch (error) {
    return source
  }
}

// 关闭对话框
function handleDialogClose() {
  showCacheDetails.value = false
}
</script>

<style scoped>
.data-source-management {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-title {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: var(--el-text-color-primary);
}

.page-description {
  color: var(--el-text-color-secondary);
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.management-tabs {
  margin-bottom: 2rem;
}

.tab-content {
  padding: 1rem 0;
}

.overview-cards {
  margin-bottom: 2rem;
}

.overview-card {
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  padding: 1rem;
  border-bottom: 1px solid var(--el-border-color-light);
}

.card-title {
  margin: 0;
  font-size: 1.2rem;
  color: var(--el-text-color-primary);
}

.card-body {
  padding: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.current-source {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.source-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--el-color-danger);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.source-icon.is-online {
  background-color: var(--el-color-success);
}

.source-info {
  flex: 1;
}

.source-name {
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.source-status {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
}

.status-time {
  font-size: 0.8rem;
  color: var(--el-text-color-secondary);
}

.source-description {
  margin-bottom: 1rem;
  color: var(--el-text-color-secondary);
  flex: 1;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
}

.cache-stats,
.source-stats {
  margin-bottom: 1rem;
  flex: 1;
}

.stat-details {
  margin-top: 1rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: var(--el-text-color-secondary);
}

.stat-value {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.recent-logs {
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: var(--el-box-shadow-light);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-title {
  margin: 0;
  font-size: 1.2rem;
  color: var(--el-text-color-primary);
}

@media (max-width: 768px) {
  .overview-cards .el-col {
    margin-bottom: 1rem;
  }
}
</style>
