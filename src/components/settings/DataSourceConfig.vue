<template>
  <div class="data-source-config">
    <h3 class="config-title">{{ title || '数据源配置' }}</h3>
    
    <p v-if="description" class="config-description">{{ description }}</p>
    
    <el-alert
      v-if="store.hasError"
      type="error"
      :closable="false"
      show-icon
      class="config-alert"
    >
      <template #title>
        <span>配置加载失败</span>
      </template>
      <div>{{ store.errorMessage }}</div>
    </el-alert>
    
    <div v-loading="store.isLoading" class="config-content">
      <!-- 数据源选择器 -->
      <div class="config-section">
        <h4 class="section-title">当前数据源</h4>
        
        <div class="current-source-info">
          <div class="source-header">
            <div class="source-name">{{ store.currentSourceName }}</div>
            <el-tag
              :type="store.currentSourceStatus.isOnline ? 'success' : 'danger'"
              size="small"
            >
              {{ store.currentSourceStatus.isOnline ? '在线' : '离线' }}
            </el-tag>
          </div>
          
          <div class="source-description">{{ store.currentSourceDescription }}</div>
          
          <div class="source-status">
            <div class="status-item">
              <span class="status-label">上次检查:</span>
              <span class="status-value">{{ store.currentSourceStatus.lastChecked }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">响应时间:</span>
              <span class="status-value">{{ store.currentSourceStatus.responseTime }}</span>
            </div>
          </div>
        </div>
        
        <div class="source-actions">
          <el-button
            type="primary"
            size="small"
            @click="openSourceSelector"
          >
            切换数据源
          </el-button>
          
          <el-button
            type="info"
            size="small"
            @click="testCurrentSource"
            :loading="testingSource"
          >
            测试连接
          </el-button>
          
          <el-button
            type="warning"
            size="small"
            @click="clearCurrentSourceCache"
            :loading="clearingCache"
          >
            清除缓存
          </el-button>
        </div>
      </div>
      
      <!-- 数据源配置表单 -->
      <div class="config-section">
        <h4 class="section-title">配置选项</h4>
        
        <el-form
          ref="configForm"
          :model="currentConfig"
          label-position="top"
          class="config-form"
        >
          <!-- 超时设置 -->
          <el-form-item label="请求超时 (毫秒)">
            <el-input-number
              v-model="currentConfig.timeout"
              :min="1000"
              :max="60000"
              :step="1000"
              @change="updateConfig"
            />
          </el-form-item>
          
          <!-- 缓存时间 -->
          <el-form-item label="缓存时间 (分钟)">
            <el-input-number
              v-model="cacheDurationMinutes"
              :min="1"
              :max="1440"
              :step="5"
              @change="updateCacheDuration"
            />
          </el-form-item>
          
          <!-- 代理设置 -->
          <el-form-item label="使用代理">
            <el-switch
              v-model="currentConfig.proxyEnabled"
              @change="updateConfig"
            />
          </el-form-item>
          
          <!-- 自定义请求头 -->
          <el-form-item label="自定义请求头">
            <div v-for="(value, key) in customHeaders" :key="key" class="custom-header-item">
              <el-input v-model="headerKeys[key]" placeholder="Header Name" class="header-key" />
              <el-input v-model="headerValues[key]" placeholder="Value" class="header-value" />
              <el-button type="danger" icon="el-icon-delete" circle @click="removeHeader(key)" />
            </div>
            
            <el-button type="primary" size="small" @click="addHeader">添加请求头</el-button>
          </el-form-item>
          
          <!-- 高级选项 -->
          <el-collapse class="advanced-options">
            <el-collapse-item title="高级选项">
              <!-- 请求限制 -->
              <el-form-item label="请求限制 (每分钟)">
                <el-input-number
                  v-model="currentConfig.requestLimit"
                  :min="1"
                  :max="1000"
                  :step="10"
                  @change="updateConfig"
                />
              </el-form-item>
              
              <!-- 数据源特定配置 -->
              <template v-if="store.currentSource === 'eastmoney'">
                <el-form-item label="使用实时行情">
                  <el-switch
                    v-model="currentConfig.useRealTimeQuote"
                    @change="updateConfig"
                  />
                </el-form-item>
              </template>
              
              <template v-if="store.currentSource === 'sina'">
                <el-form-item label="使用HTTPS">
                  <el-switch
                    v-model="currentConfig.useHttps"
                    @change="updateConfig"
                  />
                </el-form-item>
              </template>
              
              <template v-if="store.currentSource === 'akshare'">
                <el-form-item label="API版本">
                  <el-select v-model="currentConfig.apiVersion" @change="updateConfig">
                    <el-option label="v1" value="v1" />
                    <el-option label="v2" value="v2" />
                  </el-select>
                </el-form-item>
              </template>
            </el-collapse-item>
          </el-collapse>
          
          <div class="form-actions">
            <el-button type="primary" @click="saveConfig">保存配置</el-button>
            <el-button @click="resetConfig">重置</el-button>
          </div>
        </el-form>
      </div>
    </div>
    
    <!-- 数据源选择对话框 -->
    <el-dialog
      v-model="sourceDialogVisible"
      title="选择数据源"
      width="500px"
    >
      <div class="source-list">
        <el-radio-group v-model="selectedSource">
          <div
            v-for="source in store.availableSources"
            :key="source"
            class="source-option"
            :class="{ 'is-active': selectedSource === source }"
          >
            <el-radio :label="source">
              <div class="source-option-content">
                <div class="source-option-name">
                  {{ getSourceInfo(source).name }}
                  <el-tag
                    v-if="source === store.currentSource"
                    type="success"
                    size="small"
                  >
                    当前
                  </el-tag>
                </div>
                <div class="source-option-description">
                  {{ getSourceInfo(source).description }}
                </div>
              </div>
            </el-radio>
          </div>
        </el-radio-group>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="sourceDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="switchDataSource"
            :disabled="!canSwitchSource"
          >
            {{ canSwitchSource ? '切换' : `请等待 ${store.remainingCooldown} 分钟` }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDataSourceStore, type DataSourceConfig } from '@/stores/dataSourceStore'
import { DataSourceFactory, type DataSourceType } from '@/services/dataSource/DataSourceFactory'
import { useLogger } from '@/composables/useLogger'

const logger = useLogger('DataSourceConfig')
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
const emit = defineEmits(['config-updated', 'source-changed', 'cache-cleared'])

// 状态变量
const testingSource = ref(false)
const clearingCache = ref(false)
const sourceDialogVisible = ref(false)
const selectedSource = ref<DataSourceType>(store.currentSource)
const currentConfig = ref<DataSourceConfig>({ ...store.currentSourceConfig })
const configForm = ref(null)
const customHeaders = ref<Record<string, string>>({})
const headerKeys = ref<Record<string, string>>({})
const headerValues = ref<Record<string, string>>({})

// 计算属性
const cacheDurationMinutes = computed({
  get: () => (currentConfig.value.cacheDuration || 0) / (60 * 1000),
  set: (value) => {
    currentConfig.value.cacheDuration = value * 60 * 1000
  }
})

const canSwitchSource = computed(() => {
  return store.canSwitchSource || selectedSource.value === store.currentSource
})

// 监听当前数据源变化
watch(() => store.currentSource, (newSource) => {
  // 更新当前配置
  currentConfig.value = { ...store.currentSourceConfig }
  
  // 更新自定义请求头
  updateCustomHeadersFromConfig()
  
  // 触发事件
  emit('source-changed', newSource)
})

// 初始化
onMounted(async () => {
  logger.info('数据源配置组件已挂载')
  
  // 初始化数据源Store
  if (!store.isLoading && Object.keys(store.sourcesConfig).length === 0) {
    await store.initializeStore()
  }
  
  // 更新当前配置
  currentConfig.value = { ...store.currentSourceConfig }
  
  // 更新自定义请求头
  updateCustomHeadersFromConfig()
})

// 更新自定义请求头
function updateCustomHeadersFromConfig() {
  customHeaders.value = {}
  headerKeys.value = {}
  headerValues.value = {}
  
  if (currentConfig.value.customHeaders) {
    let index = 0
    for (const [key, value] of Object.entries(currentConfig.value.customHeaders)) {
      const id = `header_${index++}`
      customHeaders.value[id] = value
      headerKeys.value[id] = key
      headerValues.value[id] = value
    }
  }
}

// 添加请求头
function addHeader() {
  const id = `header_${Object.keys(customHeaders.value).length}`
  customHeaders.value[id] = ''
  headerKeys.value[id] = ''
  headerValues.value[id] = ''
}

// 移除请求头
function removeHeader(key: string) {
  delete customHeaders.value[key]
  delete headerKeys.value[key]
  delete headerValues.value[key]
}

// 更新配置
function updateConfig() {
  logger.info('更新数据源配置', currentConfig.value)
}

// 更新缓存时间
function updateCacheDuration() {
  updateConfig()
}

// 保存配置
function saveConfig() {
  try {
    // 更新自定义请求头
    const headers: Record<string, string> = {}
    for (const id in headerKeys.value) {
      const key = headerKeys.value[id]
      const value = headerValues.value[id]
      if (key && value) {
        headers[key] = value
      }
    }
    
    currentConfig.value.customHeaders = headers
    
    // 保存配置
    const success = store.updateSourceConfig(store.currentSource, currentConfig.value)
    
    if (success) {
      logger.info('数据源配置已保存', store.currentSource, currentConfig.value)
      emit('config-updated', store.currentSource, currentConfig.value)
    }
  } catch (error) {
    logger.error('保存数据源配置失败', error)
    ElMessage.error('保存配置失败')
  }
}

// 重置配置
function resetConfig() {
  ElMessageBox.confirm('确定要重置配置吗？所有自定义设置将丢失。', '重置配置', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    store.resetSourceConfig(store.currentSource)
    currentConfig.value = { ...store.currentSourceConfig }
    updateCustomHeadersFromConfig()
    ElMessage.success('配置已重置')
  }).catch(() => {
    // 用户取消，不做任何操作
  })
}

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
    const success = await store.clearSourceCache(store.currentSource)
    
    if (success) {
      emit('cache-cleared', store.currentSource)
    }
  } finally {
    clearingCache.value = false
  }
}

// 打开数据源选择器
function openSourceSelector() {
  selectedSource.value = store.currentSource
  sourceDialogVisible.value = true
}

// 切换数据源
async function switchDataSource() {
  if (selectedSource.value === store.currentSource) {
    sourceDialogVisible.value = false
    return
  }
  
  const success = await store.switchDataSource(selectedSource.value)
  
  if (success) {
    sourceDialogVisible.value = false
    emit('source-changed', store.currentSource)
  }
}

// 获取数据源信息
function getSourceInfo(source: DataSourceType) {
  return DataSourceFactory.getDataSourceInfo(source)
}
</script>

<style scoped>
.data-source-config {
  max-width: 800px;
  margin: 0 auto;
}

.config-title {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--el-text-color-primary);
}

.config-description {
  color: var(--el-text-color-secondary);
  margin-bottom: 1.5rem;
}

.config-alert {
  margin-bottom: 1.5rem;
}

.config-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.config-section {
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

.current-source-info {
  margin-bottom: 1.5rem;
}

.source-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.source-name {
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.source-description {
  color: var(--el-text-color-secondary);
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.source-status {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-label {
  color: var(--el-text-color-secondary);
}

.status-value {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.source-actions {
  display: flex;
  gap: 0.5rem;
}

.config-form {
  max-width: 100%;
}

.custom-header-item {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  align-items: center;
}

.header-key {
  flex: 1;
}

.header-value {
  flex: 2;
}

.advanced-options {
  margin: 1rem 0;
  border: none;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.source-list {
  max-height: 400px;
  overflow-y: auto;
}

.source-option {
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  transition: background-color 0.3s;
}

.source-option:hover {
  background-color: var(--el-fill-color-light);
}

.source-option.is-active {
  background-color: var(--el-color-primary-light-9);
}

.source-option-content {
  margin-left: 1.5rem;
}

.source-option-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.source-option-description {
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
