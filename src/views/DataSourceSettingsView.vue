<template>
  <div class="data-source-settings">
    <h1 class="title">数据源设置</h1>

    <div class="current-source">
      <h3>当前数据源: {{ currentSourceInfo.name }}</h3>
      <p>{{ currentSourceInfo.description }}</p>
    </div>

    <el-divider content-position="center">可用数据源</el-divider>

    <div class="source-list">
      <el-card
        v-for="source in availableSources"
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

      <h3 class="comparison-title">数据源比较</h3>
      <el-table :data="dataSourceComparisonData" border stripe style="width: 100%">
        <el-table-column prop="name" label="数据源" width="120" />
        <el-table-column prop="realtime" label="实时性" width="100">
          <template #default="scope">
            <el-rate
              v-model="scope.row.realtime"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}"
            />
          </template>
        </el-table-column>
        <el-table-column prop="coverage" label="覆盖范围" width="100">
          <template #default="scope">
            <el-rate
              v-model="scope.row.coverage"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}"
            />
          </template>
        </el-table-column>
        <el-table-column prop="stability" label="稳定性" width="100">
          <template #default="scope">
            <el-rate
              v-model="scope.row.stability"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}"
            />
          </template>
        </el-table-column>
        <el-table-column prop="history" label="历史数据" width="100">
          <template #default="scope">
            <el-rate
              v-model="scope.row.history"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}"
            />
          </template>
        </el-table-column>
        <el-table-column prop="features" label="特点" />
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { stockService } from '@/services/stockService'
import type { DataSourceType } from '@/services/dataSource/DataSourceFactory'
import { ElMessage } from 'element-plus'

// 当前数据源
const currentSource = ref<DataSourceType>('tushare')
// 可用数据源
const availableSources = ref<DataSourceType[]>([])
// 正在测试的数据源
const testingSource = ref<DataSourceType | null>(null)
// 正在清除缓存的数据源
const clearingCache = ref<DataSourceType | null>(null)

// 数据源比较数据
const dataSourceComparisonData = [
  {
    name: 'Tushare数据',
    realtime: 3.5,
    coverage: 4.5,
    stability: 4.0,
    history: 4.5,
    features: 'A股全市场数据，包括行情、基本面、财务等多维度数据，API调用次数有限制',
  },
  {
    name: '新浪财经',
    realtime: 4.5,
    coverage: 3.5,
    stability: 3.0,
    history: 2.5,
    features: '实时行情数据，无需注册直接调用，历史数据有限，主要提供当日行情',
  },
  {
    name: '东方财富',
    realtime: 4.0,
    coverage: 4.0,
    stability: 3.0,
    history: 3.5,
    features: '数据丰富，更新及时，包括行情、K线等数据，API不稳定',
  },
  {
    name: '腾讯股票',
    realtime: 4.5,
    coverage: 3.5,
    stability: 4.0,
    history: 2.5,
    features: '实时行情数据，数据稳定，历史数据有限，主要提供当日行情',
  },
  {
    name: '网易财经',
    realtime: 3.0,
    coverage: 3.5,
    stability: 3.5,
    history: 4.0,
    features: '历史数据丰富，更新频率较低，提供历史数据和行情',
  },
  {
    name: 'Yahoo财经',
    realtime: 3.0,
    coverage: 5.0,
    stability: 4.0,
    history: 4.5,
    features: '覆盖全球市场，包括美股、港股等，A股数据有限，提供全球市场数据',
  },
]

// 获取数据源信息
const getSourceInfo = (source: DataSourceType) => {
  return stockService.getDataSourceInfo(source)
}

// 当前数据源信息
const currentSourceInfo = computed(() => {
  return getSourceInfo(currentSource.value)
})

// 切换数据源
const changeDataSource = async (source: DataSourceType) => {
  if (stockService.switchDataSource(source)) {
    currentSource.value = source
    ElMessage.success(`已切换到${getSourceInfo(source).name}`)
  }
}

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

onMounted(() => {
  // 获取当前数据源
  currentSource.value = stockService.getCurrentDataSourceType()
  // 获取可用数据源
  availableSources.value = stockService.getAvailableDataSources()
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
