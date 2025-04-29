<template>
  <div class="data-source-settings">
    <h1 class="title">数据源设置</h1>

    <div class="current-source">
      <h3>当前数据源: {{ currentSourceInfo.name }}</h3>
      <p>{{ currentSourceInfo.description }}</p>
    </div>

    <el-divider content-position="center">可用数据源</el-divider>

    <div class="source-controls">
      <div class="search-box">
        <el-input
          v-model="searchQuery"
          placeholder="搜索数据源..."
          prefix-icon="el-icon-search"
          clearable
          @input="filterSources"
        >
          <template #prefix>
            <span class="search-icon">🔍</span>
          </template>
        </el-input>
      </div>
      <div class="sort-controls">
        <span class="sort-label">排序方式:</span>
        <el-select v-model="sortBy" placeholder="排序方式" @change="sortSources">
          <el-option label="默认排序" value="default"></el-option>
          <el-option label="按热度排序" value="popularity"></el-option>
          <el-option label="按更新时间排序" value="updateTime"></el-option>
          <el-option label="按数据量排序" value="dataVolume"></el-option>
        </el-select>
      </div>
    </div>

    <div class="source-list">
      <el-card
        v-for="source in filteredSources"
        :key="source"
        class="source-item"
        :class="{ active: source === currentSource }"
        :shadow="source === currentSource ? 'always' : 'hover'"
      >
        <template #header>
          <div class="source-header">
            <h4>{{ getSourceInfo(source).name }}</h4>
            <div class="source-actions">
              <el-button
                v-if="source !== currentSource"
                type="primary"
                size="small"
                @click="changeDataSource(source)"
              >
                切换到此数据源
              </el-button>
              <el-button v-else type="success" size="small" disabled> 当前使用中 </el-button>
              <el-button
                type="info"
                size="small"
                @click="testDataSource(source)"
                :loading="testingSource === source"
              >
                测试连接
              </el-button>
            </div>
          </div>
        </template>
        <div class="source-content">
          <p>{{ getSourceInfo(source).description }}</p>
          <div v-if="source === 'tushare'" class="source-details">
            <p><strong>特点：</strong>提供A股基础数据，包括行情、基本面等</p>
            <p><strong>优点：</strong>数据全面，API稳定</p>
            <p><strong>缺点：</strong>API调用次数有限制</p>
          </div>
          <div v-else-if="source === 'sina'" class="source-details">
            <p><strong>特点：</strong>提供实时行情数据，无需注册直接调用</p>
            <p><strong>优点：</strong>实时性好，无需注册</p>
            <p><strong>缺点：</strong>历史数据有限</p>
          </div>
          <div v-else-if="source === 'eastmoney'" class="source-details">
            <p><strong>特点：</strong>提供行情、K线等数据</p>
            <p><strong>优点：</strong>数据丰富，更新及时</p>
            <p><strong>缺点：</strong>API不稳定</p>
          </div>
          <div v-else-if="source === 'tencent'" class="source-details">
            <p><strong>特点：</strong>提供实时行情数据</p>
            <p><strong>优点：</strong>实时性好，数据稳定</p>
            <p><strong>缺点：</strong>历史数据有限</p>
          </div>
          <div v-else-if="source === 'netease'" class="source-details">
            <p><strong>特点：</strong>提供历史数据和行情</p>
            <p><strong>优点：</strong>历史数据丰富</p>
            <p><strong>缺点：</strong>更新频率较低</p>
          </div>
          <div v-else-if="source === 'yahoo'" class="source-details">
            <p><strong>特点：</strong>提供全球市场数据</p>
            <p><strong>优点：</strong>覆盖全球市场</p>
            <p><strong>缺点：</strong>A股数据有限</p>
          </div>

          <div class="source-cache-control">
            <el-button
              size="small"
              type="warning"
              @click="clearSourceCache(source)"
              :loading="clearingCache === source"
            >
              清除缓存数据
            </el-button>
            <p class="cache-hint">清除此数据源的缓存数据，下次使用时将重新获取最新数据</p>
          </div>
        </div>
      </el-card>
    </div>

    <el-divider content-position="center">数据源说明</el-divider>

    <div class="source-info">
      <p>本系统支持多种数据源，您可以根据自己的需求选择合适的数据源。</p>
      <p>不同数据源的数据可能存在差异，建议选择稳定可靠的数据源。</p>
      <p>如果您遇到数据获取问题，可以尝试切换数据源或检查网络连接。</p>
    </div>

    <!-- 数据源比较组件 -->
    <DataSourceComparison :current-source="currentSource" @switch-source="changeDataSource" />

    <!-- 数据源状态监控组件 -->
    <el-divider content-position="center">数据源状态监控</el-divider>
    <DataSourceStatus :current-source="currentSource" @switch-source="changeDataSource" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { stockService } from '@/services/stockService'
import type { DataSourceType } from '@/services/dataSource/DataSourceFactory'
import { ElMessage } from 'element-plus'
import DataSourceComparison from '@/components/settings/DataSourceComparison.vue'
import DataSourceStatus from '@/components/settings/DataSourceStatus.vue'

// 当前数据源
const currentSource = ref<DataSourceType>('tushare')
// 可用数据源
const availableSources = ref<DataSourceType[]>([])
// 过滤后的数据源
const filteredSources = ref<DataSourceType[]>([])
// 正在测试的数据源
const testingSource = ref<DataSourceType | null>(null)
// 正在清除缓存的数据源
const clearingCache = ref<DataSourceType | null>(null)
// 搜索关键词
const searchQuery = ref('')
// 排序方式
const sortBy = ref('default')

// 数据源元数据
const sourceMetadata = ref<
  Record<
    DataSourceType,
    {
      popularity: number
      updateTime: Date
      dataVolume: number
    }
  >
>({
  tushare: {
    popularity: 90,
    updateTime: new Date('2023-04-20'),
    dataVolume: 95,
  },
  sina: {
    popularity: 85,
    updateTime: new Date('2023-04-18'),
    dataVolume: 80,
  },
  eastmoney: {
    popularity: 80,
    updateTime: new Date('2023-04-15'),
    dataVolume: 85,
  },
  tencent: {
    popularity: 75,
    updateTime: new Date('2023-04-10'),
    dataVolume: 75,
  },
  netease: {
    popularity: 70,
    updateTime: new Date('2023-04-05'),
    dataVolume: 70,
  },
  yahoo: {
    popularity: 65,
    updateTime: new Date('2023-04-01'),
    dataVolume: 90,
  },
})

// 获取数据源信息
const getSourceInfo = (source: DataSourceType) => {
  return stockService.getDataSourceInfo(source)
}

// 当前数据源信息
const currentSourceInfo = computed(() => {
  return getSourceInfo(currentSource.value)
})

// 测试数据源连接
const testDataSource = async (source: DataSourceType) => {
  testingSource.value = source
  try {
    await stockService.testDataSource(source)
  } finally {
    testingSource.value = null
  }
}

// 清除数据源缓存
const clearSourceCache = async (source: DataSourceType) => {
  clearingCache.value = source
  try {
    const success = await stockService.clearDataSourceCache(source)
    if (success) {
      ElMessage.success(`已清除${getSourceInfo(source).name}的缓存数据`)
    } else {
      ElMessage.warning(`清除${getSourceInfo(source).name}缓存数据失败`)
    }
  } catch (error) {
    console.error(`清除${source}数据源缓存失败:`, error)
    ElMessage.error(`清除缓存失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    clearingCache.value = null
  }
}

// 过滤数据源
const filterSources = () => {
  if (!searchQuery.value.trim()) {
    // 如果搜索框为空，显示所有数据源
    filteredSources.value = [...availableSources.value]
  } else {
    const query = searchQuery.value.toLowerCase().trim()
    // 根据名称和描述过滤
    filteredSources.value = availableSources.value.filter((source) => {
      const info = getSourceInfo(source)
      return (
        info.name.toLowerCase().includes(query) || info.description.toLowerCase().includes(query)
      )
    })
  }

  // 应用当前排序
  sortSources()
}

// 排序数据源
const sortSources = () => {
  const sources = [...filteredSources.value]

  switch (sortBy.value) {
    case 'popularity':
      // 按热度排序（从高到低）
      sources.sort(
        (a, b) => sourceMetadata.value[b].popularity - sourceMetadata.value[a].popularity
      )
      break
    case 'updateTime':
      // 按更新时间排序（从新到旧）
      sources.sort(
        (a, b) =>
          sourceMetadata.value[b].updateTime.getTime() -
          sourceMetadata.value[a].updateTime.getTime()
      )
      break
    case 'dataVolume':
      // 按数据量排序（从高到低）
      sources.sort(
        (a, b) => sourceMetadata.value[b].dataVolume - sourceMetadata.value[a].dataVolume
      )
      break
    default:
      // 默认排序（当前数据源优先，其他按字母顺序）
      sources.sort((a, b) => {
        if (a === currentSource.value) return -1
        if (b === currentSource.value) return 1
        return a.localeCompare(b)
      })
  }

  filteredSources.value = sources
}

// 检查数据源切换冷却时间
const checkSourceSwitchCooldown = () => {
  const lastSwitchTime = localStorage.getItem('last_source_switch_time')
  if (!lastSwitchTime) return true

  const now = Date.now()
  const elapsed = now - parseInt(lastSwitchTime)
  const cooldownPeriod = 60 * 60 * 1000 // 1小时

  return elapsed >= cooldownPeriod
}

// 获取剩余冷却时间（分钟）
const getRemainingCooldown = () => {
  const lastSwitchTime = localStorage.getItem('last_source_switch_time')
  if (!lastSwitchTime) return 0

  const now = Date.now()
  const elapsed = now - parseInt(lastSwitchTime)
  const cooldownPeriod = 60 * 60 * 1000 // 1小时

  const remainingMs = Math.max(0, cooldownPeriod - elapsed)
  return Math.ceil(remainingMs / (60 * 1000))
}

// 切换数据源
const changeDataSource = async (source: DataSourceType) => {
  // 检查冷却时间
  if (!checkSourceSwitchCooldown()) {
    const remainingMinutes = getRemainingCooldown()
    ElMessage.warning(`数据源切换过于频繁，请在 ${remainingMinutes} 分钟后再试`)
    return
  }

  if (stockService.switchDataSource(source)) {
    currentSource.value = source
    ElMessage.success(`已切换到${getSourceInfo(source).name}`)

    // 更新切换时间
    localStorage.setItem('last_source_switch_time', Date.now().toString())
  }
}

onMounted(() => {
  // 获取当前数据源
  currentSource.value = stockService.getCurrentDataSourceType()
  // 获取可用数据源
  availableSources.value = stockService.getAvailableDataSources()
  // 初始化过滤后的数据源
  filteredSources.value = [...availableSources.value]
  // 应用默认排序
  sortSources()
})
</script>

<style scoped>
.data-source-settings {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.title {
  text-align: center;
  margin-bottom: 30px;
}

.current-source {
  background-color: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  text-align: center;
}

.source-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.search-box {
  flex: 1;
  min-width: 250px;
  max-width: 400px;
}

.search-icon {
  margin-right: 5px;
  font-size: 16px;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sort-label {
  white-space: nowrap;
  color: var(--el-text-color-regular);
}

.source-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.source-item {
  transition: all 0.3s;
}

.source-item.active {
  border: 2px solid var(--el-color-primary);
  transform: translateY(-5px);
}

.source-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.source-header h4 {
  margin: 0;
  font-size: 18px;
}

.source-actions {
  display: flex;
  gap: 10px;
}

.source-content {
  min-height: 150px;
}

.source-details {
  margin-top: 15px;
  font-size: 14px;
}

.source-cache-control {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px dashed var(--el-border-color-lighter);
}

.cache-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.source-info {
  background-color: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.comparison-title {
  margin-top: 30px;
  margin-bottom: 20px;
  font-size: 18px;
  color: var(--el-color-primary);
  text-align: center;
}

/* 响应式表格 */
@media (max-width: 768px) {
  .source-list {
    grid-template-columns: 1fr;
  }

  .el-table {
    width: 100%;
    overflow-x: auto;
  }
}
</style>
