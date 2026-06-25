<template>
  <PageLayout title="数据源管理测试" subtitle="测试数据源搜索、排序和切换冷却时间">
    <div class="test-container">
      <div class="test-section">
        <h2>数据源切换测试</h2>
        <div class="current-source">
          <h3>当前数据源: {{ currentSourceInfo.name }}</h3>
          <p>{{ currentSourceInfo.description }}</p>
          <div class="cooldown-info" v-if="cooldownRemaining > 0">
            <p class="cooldown-text">
              数据源切换冷却中: {{ formatCooldown(cooldownRemaining) }} 后可再次切换
            </p>
            <div class="cooldown-progress">
              <div
                class="cooldown-bar"
                :style="{ width: `${(cooldownRemaining / cooldownPeriod) * 100}%` }"
              ></div>
            </div>
          </div>
        </div>

        <div class="source-controls">
          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索数据源..."
              class="search-input"
              @input="filterSources"
            />
            <span class="search-icon">🔍</span>
          </div>
          <div class="sort-controls">
            <span class="sort-label">排序方式:</span>
            <select v-model="sortBy" class="sort-select" @change="sortSources">
              <option value="default">默认排序</option>
              <option value="popularity">按热度排序</option>
              <option value="updateTime">按更新时间排序</option>
              <option value="dataVolume">按数据量排序</option>
            </select>
          </div>
        </div>

        <div class="source-list">
          <div
            v-for="source in filteredSources"
            :key="source"
            class="source-item"
            :class="{ active: source === currentSource }"
          >
            <div class="source-header">
              <h4>{{ getSourceInfo(source).name }}</h4>
              <div class="source-meta">
                <div class="meta-item">
                  <span class="meta-label">热度:</span>
                  <div class="rating">
                    <span
                      v-for="i in 5"
                      :key="i"
                      class="star"
                      :class="{
                        filled: i <= Math.round((sourceMetadata[source]?.popularity || 0) / 20),
                      }"
                      >★</span
                    >
                  </div>
                </div>
                <div class="meta-item">
                  <span class="meta-label">更新:</span>
                  <span>{{
                    sourceMetadata[source]?.updateTime
                      ? formatDate(sourceMetadata[source].updateTime)
                      : '未知'
                  }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">数据量:</span>
                  <div class="progress-bar">
                    <div
                      class="progress"
                      :style="{ width: `${sourceMetadata[source]?.dataVolume || 0}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="source-content">
              <p>{{ getSourceInfo(source).description }}</p>
            </div>
            <div class="source-actions">
              <button
                v-if="source !== currentSource"
                class="btn btn-primary"
                @click="changeDataSource(source)"
                :disabled="cooldownRemaining > 0"
              >
                切换到此数据源
              </button>
              <button v-else class="btn btn-success" disabled>当前使用中</button>
              <button
                class="btn btn-secondary"
                @click="testDataSource(source)"
                :disabled="isLoading"
              >
                测试连接
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="test-section">
        <h2>数据刷新测试</h2>
        <div class="refresh-test">
          <div class="refresh-info">
            <h3>数据刷新控制</h3>
            <p>测试全局数据刷新功能，包括刷新按钮和冷却时间控制。</p>

            <div class="refresh-status">
              <div class="status-item">
                <span class="status-label">上次刷新时间:</span>
                <span>{{ lastRefreshTime ? formatDateTime(lastRefreshTime) : '从未刷新' }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">刷新冷却时间:</span>
                <span>{{ formatDuration(refreshCooldownPeriod) }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">剩余冷却时间:</span>
                <span>{{
                  refreshCooldownRemaining > 0
                    ? formatDuration(refreshCooldownRemaining)
                    : '可以刷新'
                }}</span>
              </div>
            </div>

            <div class="cooldown-info" v-if="refreshCooldownRemaining > 0">
              <div class="cooldown-progress">
                <div
                  class="cooldown-bar"
                  :style="{ width: `${(refreshCooldownRemaining / refreshCooldownPeriod) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>

          <div class="refresh-actions">
            <button
              class="btn btn-primary refresh-button"
              @click="refreshData"
              :disabled="refreshCooldownRemaining > 0 || isRefreshing"
            >
              <span v-if="isRefreshing">刷新中...</span>
              <span v-else-if="refreshCooldownRemaining > 0">
                {{ formatDuration(refreshCooldownRemaining) }} 后可刷新
              </span>
              <span v-else>刷新数据</span>
            </button>

            <button class="btn btn-secondary" @click="resetRefreshCooldown">重置冷却时间</button>
          </div>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import PageLayout from '@/components/common/PageLayout.vue'
import { stockService } from '@/services/stockService'
import { dataRefreshService } from '@/services/dataRefreshService'
import { useToast } from '@/composables/useToast'
import type { DataSourceType } from '@/services/dataSource/DataSourceFactory'
import { useUserStore } from '@/stores/userStore'

const { showToast } = useToast()

// 状态
const isLoading = ref(false)
const isRefreshing = ref(false)
const currentSource = ref<DataSourceType>('tushare')
const availableSources = ref<DataSourceType[]>([])
const filteredSources = ref<DataSourceType[]>([])
const searchQuery = ref('')
const sortBy = ref('default')
const cooldownRemaining = ref(0)
const cooldownPeriod = 60 * 60 * 1000 // 1小时
const timerInterval = ref<number | null>(null)
const lastRefreshTime = ref<number | null>(null)
const refreshCooldownRemaining = ref(0)
const refreshCooldownPeriod = 60 * 60 * 1000 // 1小时
const refreshTimerInterval = ref<number | null>(null)

// 数据源元数据
const sourceMetadata = ref<
  Record<
    string,
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
        (a, b) =>
          (sourceMetadata.value[b]?.popularity || 0) - (sourceMetadata.value[a]?.popularity || 0)
      )
      break
    case 'updateTime':
      // 按更新时间排序（从新到旧）
      sources.sort((a, b) => {
        const timeA = sourceMetadata.value[a]?.updateTime?.getTime() || 0
        const timeB = sourceMetadata.value[b]?.updateTime?.getTime() || 0
        return timeB - timeA
      })
      break
    case 'dataVolume':
      // 按数据量排序（从高到低）
      sources.sort(
        (a, b) =>
          (sourceMetadata.value[b]?.dataVolume || 0) - (sourceMetadata.value[a]?.dataVolume || 0)
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

// 从本地存储获取上次切换时间
const loadLastSwitchTime = () => {
  const savedTime = localStorage.getItem('last_source_switch_time')
  if (savedTime) {
    const lastSwitchTime = parseInt(savedTime)
    const now = Date.now()
    cooldownRemaining.value = Math.max(0, cooldownPeriod - (now - lastSwitchTime))
  }
}

// 从本地存储获取上次刷新时间
const loadLastRefreshTime = () => {
  const savedTime = localStorage.getItem('last_data_refresh_time')
  if (savedTime) {
    lastRefreshTime.value = parseInt(savedTime)
    updateRefreshCooldown()
  }
}

// 更新数据源切换冷却时间
const updateCooldown = () => {
  if (cooldownRemaining.value > 0) {
    cooldownRemaining.value = Math.max(0, cooldownRemaining.value - 1000)
  }
}

// 更新数据刷新冷却时间
const updateRefreshCooldown = () => {
  if (!lastRefreshTime.value) {
    refreshCooldownRemaining.value = 0
    return
  }

  const now = Date.now()
  refreshCooldownRemaining.value = Math.max(
    0,
    refreshCooldownPeriod - (now - lastRefreshTime.value)
  )
}

// 格式化冷却时间
const formatCooldown = (ms: number) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// 格式化日期
const formatDate = (date: Date) => {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// 格式化日期时间
const formatDateTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// 格式化持续时间
const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)

  if (minutes > 0) {
    return `${minutes}分${seconds}秒`
  } else {
    return `${seconds}秒`
  }
}

// 切换数据源
const changeDataSource = (source: DataSourceType) => {
  // 获取用户存储
  const userStore = useUserStore()
  const isAdmin = userStore.userRole === 'admin'

  // 检查冷却时间（管理员不受限制）
  if (cooldownRemaining.value > 0 && !isAdmin) {
    showToast(
      `数据源切换过于频繁，请在 ${formatCooldown(cooldownRemaining.value)} 后再试`,
      'warning'
    )
    return
  }

  // 管理员日志记录
  if (isAdmin && cooldownRemaining.value > 0) {
    console.log('管理员用户，跳过数据源切换冷却时间检查')
  }

  try {
    if (stockService.switchDataSource(source)) {
      currentSource.value = source
      showToast(`已切换到${getSourceInfo(source).name}`, 'success')

      // 更新切换时间
      localStorage.setItem('last_source_switch_time', Date.now().toString())
      cooldownRemaining.value = cooldownPeriod
    }
  } catch (error) {
    console.error('切换数据源失败:', error)
    showToast('切换数据源失败', 'error')
  }
}

// 测试数据源连接
const testDataSource = async (source: DataSourceType) => {
  isLoading.value = true

  try {
    await stockService.testDataSource(source)
    showToast(`${getSourceInfo(source).name} 连接测试成功`, 'success')
  } catch (error) {
    console.error(`测试数据源 ${source} 失败:`, error)
    showToast(`测试数据源失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error')
  } finally {
    isLoading.value = false
  }
}

// 刷新数据
const refreshData = async () => {
  if (refreshCooldownRemaining.value > 0) {
    showToast(
      `刷新过于频繁，请在 ${formatDuration(refreshCooldownRemaining.value)} 后再试`,
      'warning'
    )
    return
  }

  isRefreshing.value = true

  try {
    const result = await dataRefreshService.refreshAllData(true)

    if (result.success) {
      showToast('数据刷新成功', 'success')
      lastRefreshTime.value = Date.now()
      localStorage.setItem('last_data_refresh_time', lastRefreshTime.value.toString())
      refreshCooldownRemaining.value = refreshCooldownPeriod
    } else {
      showToast(`刷新失败: ${result.message}`, 'error')
    }
  } catch (error) {
    console.error('刷新数据失败:', error)
    showToast(`刷新失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error')
  } finally {
    isRefreshing.value = false
  }
}

// 重置刷新冷却时间
const resetRefreshCooldown = () => {
  lastRefreshTime.value = null
  refreshCooldownRemaining.value = 0
  localStorage.removeItem('last_data_refresh_time')
  showToast('已重置刷新冷却时间', 'success')
}

// 启动定时器
const startTimers = () => {
  // 数据源切换冷却定时器
  timerInterval.value = window.setInterval(() => {
    updateCooldown()
  }, 1000)

  // 数据刷新冷却定时器
  refreshTimerInterval.value = window.setInterval(() => {
    updateRefreshCooldown()
  }, 1000)
}

// 初始化
onMounted(() => {
  // 获取当前数据源
  currentSource.value = stockService.getCurrentDataSourceType()
  // 获取可用数据源
  availableSources.value = stockService.getAvailableDataSources()
  // 初始化过滤后的数据源
  filteredSources.value = [...availableSources.value]
  // 应用默认排序
  sortSources()
  // 加载上次切换时间
  loadLastSwitchTime()
  // 加载上次刷新时间
  loadLastRefreshTime()
  // 启动定时器
  startTimers()
})

// 组件卸载时
onUnmounted(() => {
  // 清除定时器
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }

  if (refreshTimerInterval.value) {
    clearInterval(refreshTimerInterval.value)
  }
})
</script>

<style scoped>
.data-source-test-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.title {
  text-align: center;
  margin-bottom: 30px;
}

.test-container {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.test-section {
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--el-box-shadow-light);
}

.test-section h2 {
  margin-top: 0;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  padding-bottom: 10px;
}

.current-source {
  background-color: var(--el-bg-color);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: var(--el-box-shadow-lighter);
}

.current-source h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: var(--el-color-primary);
}

.current-source p {
  margin: 0 0 15px 0;
}

.cooldown-info {
  margin-top: 15px;
}

.cooldown-text {
  margin-bottom: 5px;
  font-size: 14px;
  color: var(--el-color-warning);
}

.cooldown-progress {
  height: 6px;
  background-color: var(--el-bg-color-page);
  border-radius: 3px;
  overflow: hidden;
}

.cooldown-bar {
  height: 100%;
  background-color: var(--el-color-warning);
  transition: width 1s linear;
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
  position: relative;
  flex: 1;
  min-width: 250px;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 35px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.search-input:focus {
  border-color: var(--el-color-primary);
  outline: none;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  color: var(--el-text-color-secondary);
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

.sort-select {
  padding: 8px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--el-bg-color);
  transition: border-color 0.3s;
}

.sort-select:focus {
  border-color: var(--el-color-primary);
  outline: none;
}

.source-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.source-item {
  background-color: var(--el-bg-color);
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--el-box-shadow-lighter);
  transition: transform 0.3s, box-shadow 0.3s;
}

.source-item:hover {
  transform: translateY(-5px);
  box-shadow: var(--el-box-shadow-light);
}

.source-item.active {
  border: 2px solid var(--el-color-success);
}

.source-header {
  margin-bottom: 15px;
}

.source-header h4 {
  margin: 0 0 10px 0;
  color: var(--el-color-primary);
}

.source-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.meta-label {
  min-width: 50px;
  color: var(--el-text-color-secondary);
}

.rating {
  display: flex;
  gap: 2px;
}

.star {
  color: var(--el-text-color-placeholder);
}

.star.filled {
  color: var(--el-color-warning);
}

.progress-bar {
  flex: 1;
  height: 6px;
  background-color: var(--el-bg-color-page);
  border-radius: 3px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background-color: var(--el-color-primary);
}

.source-content {
  margin-bottom: 20px;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.source-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--el-color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--el-color-primary-dark-2);
}

.btn-secondary {
  background-color: var(--el-color-info);
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--el-color-info-dark-2);
}

.btn-success {
  background-color: var(--el-color-success);
  color: white;
}

.refresh-test {
  background-color: var(--el-bg-color);
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--el-box-shadow-lighter);
}

.refresh-info {
  margin-bottom: 20px;
}

.refresh-info h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.refresh-info p {
  margin-top: 0;
  margin-bottom: 15px;
  color: var(--el-text-color-regular);
}

.refresh-status {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-label {
  min-width: 120px;
  color: var(--el-text-color-secondary);
}

.refresh-actions {
  display: flex;
  gap: 10px;
}

.refresh-button {
  min-width: 150px;
}

@media (max-width: 768px) {
  .source-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: none;
  }

  .source-list {
    grid-template-columns: 1fr;
  }

  .refresh-actions {
    flex-direction: column;
  }
}
</style>
