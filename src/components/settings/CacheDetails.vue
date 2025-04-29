<template>
  <div class="cache-details">
    <div class="section-header">
      <h3 class="section-title">{{ title }}</h3>
      <p class="section-description">{{ description }}</p>
    </div>

    <div class="search-bar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索缓存键..."
        prefix-icon="el-icon-search"
        clearable
        @input="handleSearch"
      />
      <el-select v-model="currentSource" placeholder="选择数据源" @change="handleSourceChange">
        <el-option
          v-for="source in availableSources"
          :key="source"
          :label="getSourceName(source)"
          :value="source"
        />
      </el-select>
      <el-button type="primary" @click="refreshDetails">刷新</el-button>
    </div>

    <div class="cache-stats-summary">
      <div class="stat-item">
        <div class="stat-label">缓存项数量</div>
        <div class="stat-value">{{ totalItems }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">命中率</div>
        <div class="stat-value">{{ hitRate }}%</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">命中次数</div>
        <div class="stat-value">{{ hitCount }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">未命中次数</div>
        <div class="stat-value">{{ missCount }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">上次清除</div>
        <div class="stat-value">{{ lastCleared || '未清除' }}</div>
      </div>
    </div>

    <el-table
      :data="cacheItems"
      style="width: 100%"
      border
      stripe
      v-loading="loading"
      :height="tableHeight"
    >
      <el-table-column prop="key" label="缓存键" min-width="250" show-overflow-tooltip />
      <el-table-column prop="type" label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="getTypeTagType(row.type)">{{ row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="size" label="大小" width="100" />
      <el-table-column prop="ttl" label="过期时间" width="150" />
      <el-table-column prop="createdAt" label="创建时间" width="180" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="viewValue(row)">查看值</el-button>
          <el-button type="danger" size="small" @click="deleteKey(row.key)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-container">
      <el-pagination
        background
        layout="total, sizes, prev, pager, next"
        :total="totalItems"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :current-page="currentPage"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 查看值对话框 -->
    <el-dialog
      title="缓存值详情"
      v-model="valueDialogVisible"
      width="80%"
      :before-close="handleDialogClose"
    >
      <div class="value-dialog-content">
        <div class="value-info">
          <div><strong>键:</strong> {{ selectedItem.key }}</div>
          <div><strong>类型:</strong> {{ selectedItem.type }}</div>
          <div><strong>大小:</strong> {{ selectedItem.size }}</div>
          <div><strong>过期时间:</strong> {{ selectedItem.ttl }}</div>
        </div>
        <div class="value-content">
          <pre v-if="typeof selectedItem.value === 'string'">{{ selectedItem.value }}</pre>
          <pre v-else>{{ JSON.stringify(selectedItem.value, null, 2) }}</pre>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="valueDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="copyValue">复制值</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 设置过期时间对话框 -->
    <el-dialog
      title="设置过期时间"
      v-model="ttlDialogVisible"
      width="500px"
      :before-close="handleDialogClose"
    >
      <div class="ttl-dialog-content">
        <div class="ttl-info">
          <div><strong>键:</strong> {{ selectedItem.key }}</div>
          <div><strong>当前过期时间:</strong> {{ selectedItem.ttl }}</div>
        </div>
        <el-form :model="ttlForm" label-width="120px">
          <el-form-item label="过期时间单位">
            <el-radio-group v-model="ttlForm.unit">
              <el-radio label="seconds">秒</el-radio>
              <el-radio label="minutes">分钟</el-radio>
              <el-radio label="hours">小时</el-radio>
              <el-radio label="days">天</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="过期时间值">
            <el-input-number v-model="ttlForm.value" :min="1" :max="999999" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="ttlDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="setExpiration">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDataSourceStore } from '@/stores/dataSourceStore'
import { DataSourceFactory } from '@/services/dataSource/DataSourceFactory'
import { useLogger } from '@/composables/useLogger'
import axios from 'axios'

const props = defineProps({
  title: {
    type: String,
    default: '缓存详情'
  },
  description: {
    type: String,
    default: '查看和管理数据源缓存详情，包括键值、大小、过期时间等信息。'
  }
})

const logger = useLogger('CacheDetails')
const store = useDataSourceStore()

// 状态变量
const loading = ref(false)
const cacheItems = ref([])
const totalItems = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const searchQuery = ref('')
const currentSource = ref(store.currentSource)
const tableHeight = ref('500px')
const hitCount = ref(0)
const missCount = ref(0)
const hitRate = ref(0)
const lastCleared = ref('')

// 对话框状态
const valueDialogVisible = ref(false)
const ttlDialogVisible = ref(false)
const selectedItem = ref({})
const ttlForm = ref({
  unit: 'seconds',
  value: 3600
})

// 计算属性
const availableSources = computed(() => store.availableSources)

// 初始化
onMounted(async () => {
  logger.info('缓存详情组件已挂载')
  
  // 计算表格高度
  calculateTableHeight()
  window.addEventListener('resize', calculateTableHeight)
  
  // 加载缓存详情
  await loadCacheDetails()
})

// 计算表格高度
function calculateTableHeight() {
  nextTick(() => {
    const windowHeight = window.innerHeight
    const offset = 350 // 根据页面其他元素的高度调整
    tableHeight.value = `${windowHeight - offset}px`
  })
}

// 加载缓存详情
async function loadCacheDetails() {
  try {
    loading.value = true
    
    // 获取缓存统计信息
    const statsResponse = await axios.get(`/api/cache/stats/${currentSource.value}`)
    if (statsResponse.data && statsResponse.data.success) {
      totalItems.value = statsResponse.data.count
      hitCount.value = statsResponse.data.hitCount
      missCount.value = statsResponse.data.missCount
      hitRate.value = statsResponse.data.hitRate
      lastCleared.value = statsResponse.data.lastCleared ? 
        new Date(statsResponse.data.lastCleared).toLocaleString() : '未清除'
    }
    
    // 获取缓存详情
    const response = await axios.get(`/api/cache/details/${currentSource.value}`, {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value,
        search: searchQuery.value
      }
    })
    
    if (response.data && response.data.success) {
      cacheItems.value = response.data.details
      totalItems.value = response.data.total
    } else {
      ElMessage.error('获取缓存详情失败')
    }
  } catch (error) {
    logger.error('加载缓存详情失败:', error)
    ElMessage.error('加载缓存详情失败')
  } finally {
    loading.value = false
  }
}

// 刷新缓存详情
function refreshDetails() {
  loadCacheDetails()
}

// 处理搜索
function handleSearch() {
  currentPage.value = 1
  loadCacheDetails()
}

// 处理数据源变更
function handleSourceChange() {
  currentPage.value = 1
  loadCacheDetails()
}

// 处理页码变更
function handleCurrentChange(page) {
  currentPage.value = page
  loadCacheDetails()
}

// 处理每页条数变更
function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
  loadCacheDetails()
}

// 查看缓存值
function viewValue(item) {
  selectedItem.value = item
  valueDialogVisible.value = true
}

// 删除缓存键
async function deleteKey(key) {
  try {
    await ElMessageBox.confirm(
      `确定要删除缓存键 "${key}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 调用删除API
    const response = await axios.delete(`/api/cache/key`, {
      data: { key, source: currentSource.value }
    })
    
    if (response.data && response.data.success) {
      ElMessage.success('缓存键删除成功')
      loadCacheDetails()
    } else {
      ElMessage.error('缓存键删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      logger.error('删除缓存键失败:', error)
      ElMessage.error('删除缓存键失败')
    }
  }
}

// 设置过期时间
function openTtlDialog(item) {
  selectedItem.value = item
  ttlDialogVisible.value = true
}

// 确认设置过期时间
async function setExpiration() {
  try {
    // 计算过期时间（秒）
    let seconds = ttlForm.value.value
    switch (ttlForm.value.unit) {
      case 'minutes':
        seconds *= 60
        break
      case 'hours':
        seconds *= 3600
        break
      case 'days':
        seconds *= 86400
        break
    }
    
    // 调用设置过期时间API
    const response = await axios.post(`/api/cache/expire`, {
      key: selectedItem.value.key,
      seconds,
      source: currentSource.value
    })
    
    if (response.data && response.data.success) {
      ElMessage.success('过期时间设置成功')
      ttlDialogVisible.value = false
      loadCacheDetails()
    } else {
      ElMessage.error('过期时间设置失败')
    }
  } catch (error) {
    logger.error('设置过期时间失败:', error)
    ElMessage.error('设置过期时间失败')
  }
}

// 复制值到剪贴板
function copyValue() {
  try {
    const value = typeof selectedItem.value.value === 'string' 
      ? selectedItem.value.value 
      : JSON.stringify(selectedItem.value.value, null, 2)
    
    navigator.clipboard.writeText(value)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    logger.error('复制到剪贴板失败:', error)
    ElMessage.error('复制到剪贴板失败')
  }
}

// 关闭对话框
function handleDialogClose() {
  valueDialogVisible.value = false
  ttlDialogVisible.value = false
}

// 获取数据源名称
function getSourceName(source) {
  try {
    return DataSourceFactory.getDataSourceInfo(source).name
  } catch (error) {
    return source
  }
}

// 获取类型标签样式
function getTypeTagType(type) {
  switch (type) {
    case 'string':
      return 'success'
    case 'hash':
      return 'warning'
    case 'list':
      return 'info'
    case 'set':
      return 'danger'
    case 'zset':
      return 'primary'
    default:
      return ''
  }
}
</script>

<style scoped>
.cache-details {
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: var(--el-text-color-primary);
}

.section-description {
  color: var(--el-text-color-secondary);
  margin-bottom: 1rem;
}

.search-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.search-bar .el-input {
  flex: 1;
}

.cache-stats-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: var(--el-box-shadow-light);
}

.stat-item {
  flex: 1;
  min-width: 150px;
  text-align: center;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.pagination-container {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
}

.value-dialog-content {
  max-height: 60vh;
  overflow-y: auto;
}

.value-info {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--el-border-color-light);
}

.value-content {
  background-color: var(--el-bg-color-page);
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}

.value-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.ttl-dialog-content {
  margin-bottom: 1rem;
}

.ttl-info {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--el-border-color-light);
}
</style>
