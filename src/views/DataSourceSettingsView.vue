<template>
  <div class="data-source-settings">
    <h1 class="title">数据源设置</h1>

    <!-- 使用新的数据源选择器组件 -->
    <DataSourceSelector
      title="数据源设置"
      description="选择并管理您的数据源，确保数据一致性和准确性"
      @source-changed="handleSourceChanged"
      @cache-cleared="handleCacheCleared"
    />

    <div class="current-source">
      <h3>当前数据源: {{ currentSourceInfo.name }}</h3>
      <p>{{ currentSourceInfo.description }}</p>
      <el-alert type="info" :closable="false" show-icon>
        <template #title>
          <span>数据源隔离模式已启用</span>
        </template>
        <div>
          所有数据请求将仅使用
          <strong>{{ currentSourceInfo.name }}</strong> 数据源，确保数据一致性。
          切换数据源后，所有数据将从新数据源获取。
        </div>
      </el-alert>
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
      <div class="test-controls">
        <el-button
          type="primary"
          size="default"
          :loading="testingAllSources"
          @click="testAllDataSources"
          :disabled="testingSource !== null"
        >
          <el-icon><Connection /></el-icon>
          {{ testingAllSources ? '测试中...' : '一键测试所有数据源' }}
        </el-button>
        <el-button
          v-if="lastTestResults.length > 0"
          type="info"
          size="default"
          @click="showTestResultsDialog = true"
        >
          <el-icon><Document /></el-icon>
          查看测试结果
        </el-button>
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

    <!-- 测试结果对话框 -->
    <el-dialog
      v-model="showTestResultsDialog"
      title="数据源测试结果"
      width="800px"
      :close-on-click-modal="false"
    >
      <div class="test-results-container">
        <!-- 测试摘要 -->
        <div class="test-summary">
          <div class="summary-stats">
            <div class="stat-item success">
              <div class="stat-number">{{ successfulTests.length }}</div>
              <div class="stat-label">连接成功</div>
            </div>
            <div class="stat-item failed">
              <div class="stat-number">{{ failedTests.length }}</div>
              <div class="stat-label">连接失败</div>
            </div>
            <div class="stat-item total">
              <div class="stat-number">{{ lastTestResults.length }}</div>
              <div class="stat-label">总计测试</div>
            </div>
            <div class="stat-item rate">
              <div class="stat-number">{{ successRate }}%</div>
              <div class="stat-label">成功率</div>
            </div>
          </div>
          <div class="test-time">
            <span>测试时间: {{ lastTestTime }}</span>
            <span>总耗时: {{ totalTestDuration }}ms</span>
          </div>
        </div>

        <!-- 测试详情 -->
        <div class="test-details">
          <el-tabs v-model="activeTab" type="border-card">
            <el-tab-pane label="成功连接" name="success">
              <div class="test-list">
                <div
                  v-for="result in successfulTests"
                  :key="result.source"
                  class="test-item success-item"
                >
                  <div class="test-info">
                    <div class="source-name">
                      <el-icon class="success-icon"><SuccessFilled /></el-icon>
                      {{ result.sourceName }}
                    </div>
                    <div class="test-meta">
                      <span class="response-time">响应时间: {{ result.responseTime }}ms</span>
                      <span class="test-timestamp">{{ result.timestamp }}</span>
                    </div>
                  </div>
                  <div class="test-actions">
                    <el-button
                      size="small"
                      type="primary"
                      @click="switchToSource(result.source)"
                      :disabled="result.source === currentSource"
                    >
                      {{ result.source === currentSource ? '当前使用' : '切换使用' }}
                    </el-button>
                  </div>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="连接失败" name="failed">
              <div class="test-list">
                <div
                  v-for="result in failedTests"
                  :key="result.source"
                  class="test-item failed-item"
                >
                  <div class="test-info">
                    <div class="source-name">
                      <el-icon class="failed-icon"><CircleCloseFilled /></el-icon>
                      {{ result.sourceName }}
                    </div>
                    <div class="error-message">{{ result.error }}</div>
                    <div class="test-meta">
                      <span class="test-timestamp">{{ result.timestamp }}</span>
                    </div>
                  </div>
                  <div class="test-actions">
                    <el-button
                      size="small"
                      type="warning"
                      @click="retestSingleSource(result.source)"
                      :loading="testingSource === result.source"
                    >
                      重新测试
                    </el-button>
                  </div>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showTestResultsDialog = false">关闭</el-button>
          <el-button
            type="primary"
            @click="testAllDataSources"
            :loading="testingAllSources"
          >
            重新测试所有
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 测试进度对话框 -->
    <el-dialog
      v-model="showTestProgressDialog"
      title="正在测试数据源连接"
      width="600px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <div class="test-progress-container">
        <div class="progress-header">
          <div class="progress-title">测试进度</div>
          <div class="progress-stats">{{ completedTests }} / {{ totalTests }}</div>
        </div>

        <el-progress
          :percentage="testProgress"
          :stroke-width="8"
          :show-text="false"
          class="main-progress"
        />

        <div class="current-test">
          <div v-if="currentTestingSource" class="testing-source">
            <el-icon class="loading-icon"><Loading /></el-icon>
            正在测试: {{ getSourceInfo(currentTestingSource).name }}
          </div>
        </div>

        <div class="test-log">
          <div
            v-for="log in testLogs"
            :key="log.id"
            class="log-item"
            :class="log.type"
          >
            <el-icon v-if="log.type === 'success'" class="log-icon"><SuccessFilled /></el-icon>
            <el-icon v-else-if="log.type === 'error'" class="log-icon"><CircleCloseFilled /></el-icon>
            <el-icon v-else class="log-icon"><InfoFilled /></el-icon>
            <span class="log-message">{{ log.message }}</span>
            <span class="log-time">{{ log.time }}</span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { stockService } from '@/services/stockService'
import type { DataSourceType } from '@/services/dataSource/DataSourceFactory'
import { DataSourceFactory } from '@/services/dataSource/DataSourceFactory'
import { ElMessage } from 'element-plus'
import {
  Connection,
  Document,
  Loading,
  SuccessFilled,
  CircleCloseFilled,
  InfoFilled
} from '@element-plus/icons-vue'
import DataSourceComparison from '@/components/settings/DataSourceComparison.vue'
import DataSourceStatus from '@/components/settings/DataSourceStatus.vue'
import DataSourceSelector from '@/components/common/DataSourceSelector.vue'
import { useUserStore } from '@/stores/userStore'

// 测试结果接口定义
interface TestResult {
  source: DataSourceType
  sourceName: string
  success: boolean
  responseTime: number
  error?: string
  timestamp: string
}

interface TestLog {
  id: number
  type: 'info' | 'success' | 'error'
  message: string
  time: string
}

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

// 一键测试相关状态
const testingAllSources = ref(false)
const showTestResultsDialog = ref(false)
const showTestProgressDialog = ref(false)
const lastTestResults = ref<TestResult[]>([])
const lastTestTime = ref('')
const totalTestDuration = ref(0)
const currentTestingSource = ref<DataSourceType | null>(null)
const completedTests = ref(0)
const totalTests = ref(0)
const testLogs = ref<TestLog[]>([])
const activeTab = ref('success')
let logIdCounter = 0

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

// 测试结果计算属性
const successfulTests = computed(() => {
  return lastTestResults.value.filter(result => result.success)
})

const failedTests = computed(() => {
  return lastTestResults.value.filter(result => !result.success)
})

const successRate = computed(() => {
  if (lastTestResults.value.length === 0) return 0
  return Math.round((successfulTests.value.length / lastTestResults.value.length) * 100)
})

const testProgress = computed(() => {
  if (totalTests.value === 0) return 0
  return Math.round((completedTests.value / totalTests.value) * 100)
})

// 测试数据源连接
const testDataSource = async (source: DataSourceType) => {
  // 完全禁止测试Tushare数据源
  if (source === 'tushare') {
    console.log('系统已配置为不使用Tushare数据源，跳过测试')
    ElMessage.info('系统已配置为不使用Tushare数据源，跳过测试')
    return
  }

  // 如果不是当前数据源，显示提示并测试当前数据源
  if (source !== currentSource.value) {
    ElMessage.info(
      `为避免不必要的API调用，只测试当前数据源: ${getSourceInfo(currentSource.value).name}`
    )
    source = currentSource.value
  }

  testingSource.value = source
  try {
    // 传递当前数据源参数，确保后端也知道当前选择的数据源
    await stockService.testDataSource(source, currentSource.value)
  } finally {
    testingSource.value = null
  }
}

// 添加测试日志
const addTestLog = (type: 'info' | 'success' | 'error', message: string) => {
  testLogs.value.push({
    id: ++logIdCounter,
    type,
    message,
    time: new Date().toLocaleTimeString()
  })

  // 限制日志数量，保持最新的20条
  if (testLogs.value.length > 20) {
    testLogs.value = testLogs.value.slice(-20)
  }
}

// 测试单个数据源（内部方法）
const testSingleDataSource = async (source: DataSourceType): Promise<TestResult> => {
  const startTime = Date.now()
  const sourceInfo = getSourceInfo(source)

  try {
    addTestLog('info', `开始测试 ${sourceInfo.name}...`)

    // 创建数据源实例并测试连接
    const dataSource = DataSourceFactory.createDataSource(source)
    const success = await Promise.race([
      dataSource.testConnection(),
      new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('测试超时')), 15000)
      )
    ])

    const responseTime = Date.now() - startTime

    const result: TestResult = {
      source,
      sourceName: sourceInfo.name,
      success,
      responseTime,
      timestamp: new Date().toLocaleString()
    }

    if (success) {
      addTestLog('success', `${sourceInfo.name} 连接成功 (${responseTime}ms)`)
    } else {
      result.error = '连接失败'
      addTestLog('error', `${sourceInfo.name} 连接失败`)
    }

    return result
  } catch (error) {
    const responseTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : '未知错误'

    addTestLog('error', `${sourceInfo.name} 测试异常: ${errorMessage}`)

    return {
      source,
      sourceName: sourceInfo.name,
      success: false,
      responseTime,
      error: errorMessage,
      timestamp: new Date().toLocaleString()
    }
  }
}

// 一键测试所有数据源
const testAllDataSources = async () => {
  if (testingAllSources.value) return

  testingAllSources.value = true
  showTestProgressDialog.value = true

  // 重置状态
  lastTestResults.value = []
  testLogs.value = []
  completedTests.value = 0
  logIdCounter = 0

  // 获取所有可用数据源（排除禁用的）
  const sourcesToTest = availableSources.value.filter(source => {
    // 排除tushare等禁用的数据源
    return source !== 'tushare'
  })

  totalTests.value = sourcesToTest.length
  const testStartTime = Date.now()

  addTestLog('info', `开始测试 ${totalTests.value} 个数据源...`)

  try {
    // 并发测试，但限制并发数量以避免API限制
    const concurrencyLimit = 3
    const results: TestResult[] = []

    for (let i = 0; i < sourcesToTest.length; i += concurrencyLimit) {
      const batch = sourcesToTest.slice(i, i + concurrencyLimit)

      // 并发测试当前批次
      const batchPromises = batch.map(async (source) => {
        currentTestingSource.value = source
        const result = await testSingleDataSource(source)
        completedTests.value++
        return result
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // 批次间添加短暂延迟，避免API调用过于频繁
      if (i + concurrencyLimit < sourcesToTest.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // 保存测试结果
    lastTestResults.value = results
    totalTestDuration.value = Date.now() - testStartTime
    lastTestTime.value = new Date().toLocaleString()

    // 显示测试完成消息
    const successCount = results.filter(r => r.success).length
    const failedCount = results.length - successCount

    addTestLog('info', `测试完成！成功: ${successCount}, 失败: ${failedCount}`)

    ElMessage.success(
      `数据源测试完成！成功连接 ${successCount} 个，失败 ${failedCount} 个`
    )

    // 延迟关闭进度对话框并显示结果
    setTimeout(() => {
      showTestProgressDialog.value = false
      showTestResultsDialog.value = true
      activeTab.value = successCount > 0 ? 'success' : 'failed'
    }, 1000)

  } catch (error) {
    console.error('测试所有数据源时发生错误:', error)
    addTestLog('error', `测试过程发生错误: ${error instanceof Error ? error.message : '未知错误'}`)
    ElMessage.error('测试过程中发生错误，请查看详细日志')
  } finally {
    testingAllSources.value = false
    currentTestingSource.value = null
  }
}

// 重新测试单个数据源
const retestSingleSource = async (source: DataSourceType) => {
  if (testingSource.value) return

  testingSource.value = source
  try {
    const result = await testSingleDataSource(source)

    // 更新测试结果中的对应项
    const index = lastTestResults.value.findIndex(r => r.source === source)
    if (index !== -1) {
      lastTestResults.value[index] = result
    } else {
      lastTestResults.value.push(result)
    }

    if (result.success) {
      ElMessage.success(`${result.sourceName} 重新测试成功`)
    } else {
      ElMessage.error(`${result.sourceName} 重新测试失败: ${result.error}`)
    }
  } finally {
    testingSource.value = null
  }
}

// 切换到指定数据源
const switchToSource = async (source: DataSourceType) => {
  if (source === currentSource.value) return

  try {
    await changeDataSource(source)
    ElMessage.success(`已切换到 ${getSourceInfo(source).name}`)
    showTestResultsDialog.value = false
  } catch (error) {
    ElMessage.error(`切换数据源失败: ${error instanceof Error ? error.message : '未知错误'}`)
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
  // 获取用户存储
  const userStore = useUserStore()
  const isAdmin = userStore.userRole === 'admin'

  // 检查冷却时间（管理员不受限制）
  if (!checkSourceSwitchCooldown() && !isAdmin) {
    const remainingMinutes = getRemainingCooldown()
    ElMessage.warning(`数据源切换过于频繁，请在 ${remainingMinutes} 分钟后再试`)
    return
  }

  // 管理员日志记录
  if (isAdmin && !checkSourceSwitchCooldown()) {
    console.log('管理员用户，跳过数据源切换冷却时间检查')
  }

  if (stockService.switchDataSource(source)) {
    currentSource.value = source
    ElMessage.success(`已切换到${getSourceInfo(source).name}`)

    // 更新切换时间
    localStorage.setItem('last_source_switch_time', Date.now().toString())
  }
}

// 处理数据源变更事件
const handleSourceChanged = (source: DataSourceType) => {
  currentSource.value = source
  // 重新过滤和排序
  filterSources()
}

// 处理缓存清除事件
const handleCacheCleared = (source: DataSourceType) => {
  ElMessage.success(`已清除${getSourceInfo(source).name}的缓存数据`)
}

onMounted(() => {
  // 直接从localStorage获取当前数据源，确保使用最新的值
  const storedDataSource = localStorage.getItem('preferredDataSource') as DataSourceType

  // 如果localStorage中有值，使用该值；否则使用stockService中的值
  currentSource.value = storedDataSource || stockService.getCurrentDataSourceType()

  console.log(`DataSourceSettingsView: 当前数据源类型 = ${currentSource.value}`)

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

.test-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
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

/* 测试结果对话框样式 */
.test-results-container {
  max-height: 600px;
  overflow-y: auto;
}

.test-summary {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
  margin-bottom: 15px;
}

.stat-item {
  text-align: center;
  padding: 15px;
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-item.success {
  border-left: 4px solid #67c23a;
}

.stat-item.failed {
  border-left: 4px solid #f56c6c;
}

.stat-item.total {
  border-left: 4px solid #409eff;
}

.stat-item.rate {
  border-left: 4px solid #e6a23c;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.test-time {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.test-details {
  margin-top: 20px;
}

.test-list {
  max-height: 300px;
  overflow-y: auto;
}

.test-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.test-item.success-item {
  border-left: 4px solid #67c23a;
}

.test-item.failed-item {
  border-left: 4px solid #f56c6c;
}

.test-info {
  flex: 1;
}

.source-name {
  display: flex;
  align-items: center;
  font-weight: bold;
  margin-bottom: 5px;
}

.success-icon {
  color: #67c23a;
  margin-right: 8px;
}

.failed-icon {
  color: #f56c6c;
  margin-right: 8px;
}

.test-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.error-message {
  color: #f56c6c;
  font-size: 14px;
  margin-bottom: 5px;
}

.test-actions {
  margin-left: 15px;
}

/* 测试进度对话框样式 */
.test-progress-container {
  padding: 10px 0;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.progress-title {
  font-size: 16px;
  font-weight: bold;
}

.progress-stats {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.main-progress {
  margin-bottom: 20px;
}

.current-test {
  margin-bottom: 20px;
  min-height: 30px;
}

.testing-source {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: var(--el-color-primary);
}

.loading-icon {
  margin-right: 8px;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.test-log {
  max-height: 200px;
  overflow-y: auto;
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 10px;
}

.log-item {
  display: flex;
  align-items: center;
  padding: 5px 0;
  font-size: 13px;
  border-bottom: 1px solid #eee;
}

.log-item:last-child {
  border-bottom: none;
}

.log-item.success {
  color: #67c23a;
}

.log-item.error {
  color: #f56c6c;
}

.log-item.info {
  color: var(--el-text-color-regular);
}

.log-icon {
  margin-right: 8px;
  font-size: 14px;
}

.log-message {
  flex: 1;
}

.log-time {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-left: 10px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .source-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: none;
  }

  .test-controls {
    justify-content: center;
  }

  .summary-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .test-item {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .test-actions {
    margin-left: 0;
    align-self: flex-end;
  }
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
