<template>
  <div class="cache-management">
    <h2 class="section-title">缓存管理</h2>
    <p class="section-description">管理和监控数据缓存，优化应用性能</p>

    <div class="dashboard-grid">
      <!-- 缓存健康状态 -->
      <div class="dashboard-card">
        <div class="card-header">
          <h3>缓存健康状态</h3>
          <div class="header-actions">
            <CacheStatusIndicator :dataSource="currentDataSource" />
          </div>
        </div>
        <div class="card-body">
          <CacheHealthStatus :dataSource="currentDataSource" />
        </div>
      </div>

      <!-- 缓存操作 -->
      <div class="dashboard-card">
        <div class="card-header">
          <h3>缓存操作</h3>
        </div>
        <div class="card-body">
          <div class="action-buttons">
            <CacheRefreshButton
              :dataSource="currentDataSource"
              @refresh-success="handleRefreshSuccess"
            />
            <CachePrewarmButton :count="20" @prewarm-success="handlePrewarmSuccess" />
            <button
              class="action-btn clear"
              :class="{ disabled: isLoading }"
              :disabled="isLoading"
              @click="clearCache"
            >
              <span class="btn-icon">🗑️</span>
              <span class="btn-text">清除缓存</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 缓存统计 -->
      <div class="dashboard-card">
        <div class="card-header">
          <h3>缓存统计</h3>
          <div class="header-actions">
            <select v-model="currentDataSource" @change="handleDataSourceChange">
              <option v-for="source in dataSources" :key="source.value" :value="source.value">
                {{ source.label }}
              </option>
            </select>
          </div>
        </div>
        <div class="card-body">
          <div v-if="isLoading" class="loading-state">
            <div class="spinner"></div>
            <p>加载中...</p>
          </div>
          <div v-else-if="error" class="error-message">
            {{ error }}
          </div>
          <div v-else class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">缓存命中率</span>
              <span class="stat-value" :class="hitRateClass">
                {{ cacheStats?.hitRate ? (cacheStats.hitRate * 100).toFixed(2) + '%' : 'N/A' }}
              </span>
            </div>
            <div class="stat-item">
              <span class="stat-label">缓存请求数</span>
              <span class="stat-value">{{ cacheStats?.requests || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">命中次数</span>
              <span class="stat-value">{{ cacheStats?.hits || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">未命中次数</span>
              <span class="stat-value">{{ cacheStats?.misses || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">API调用次数</span>
              <span class="stat-value">{{ cacheStats?.apiCalls || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">错误次数</span>
              <span class="stat-value">{{ cacheStats?.errors || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">最后重置时间</span>
              <span class="stat-value">{{ formatDate(cacheStats?.lastReset) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 缓存详情 -->
      <div class="dashboard-card full-width">
        <div class="card-header">
          <h3>缓存详情</h3>
        </div>
        <div class="card-body">
          <div v-if="isLoadingStatus" class="loading-state">
            <div class="spinner"></div>
            <p>加载中...</p>
          </div>
          <div v-else-if="statusError" class="error-message">
            {{ statusError }}
          </div>
          <div v-else-if="cacheStatus" class="cache-details">
            <div class="detail-section">
              <h4>基本信息</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">数据源</span>
                  <span class="detail-value">{{ cacheStatus.dataSource }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">缓存可用</span>
                  <span class="detail-value">{{ cacheStatus.available ? '是' : '否' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">最后更新</span>
                  <span class="detail-value">{{ formatDate(cacheStatus.lastUpdate) }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h4>缓存数量</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">股票数据</span>
                  <span class="detail-value">{{ cacheStatus.stockCount }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">指数数据</span>
                  <span class="detail-value">{{ cacheStatus.indexCount }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">行业数据</span>
                  <span class="detail-value">{{ cacheStatus.industryCount }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">总缓存键数</span>
                  <span class="detail-value">{{ cacheStatus.cacheKeys.length }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h4>缓存键列表</h4>
              <div class="cache-keys">
                <div v-if="cacheStatus.cacheKeys.length === 0" class="empty-state">
                  没有缓存数据
                </div>
                <div v-else class="keys-container">
                  <div v-for="(key, index) in cacheStatus.cacheKeys" :key="index" class="key-item">
                    {{ key }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { cacheService } from '@/services/cacheService'
import { cacheStatsService } from '@/services/cacheStatsService'
import type { CacheStats } from '@/services/cacheStatsService'
import type { CacheStatus } from '@/services/cacheService'
import { useToast } from '@/composables/useToast'
import CacheStatusIndicator from '@/components/common/CacheStatusIndicator.vue'
import CacheHealthStatus from '@/components/common/CacheHealthStatus.vue'
import CacheRefreshButton from '@/components/common/CacheRefreshButton.vue'
import CachePrewarmButton from '@/components/common/CachePrewarmButton.vue'

// 状态变量
const { showToast } = useToast()
const isLoading = ref(false)
const isLoadingStatus = ref(false)
const error = ref('')
const statusError = ref('')
const cacheStats = ref<CacheStats | null>(null)
const cacheStatus = ref<CacheStatus | null>(null)
// 从本地存储获取当前数据源，如果没有则使用默认值
const currentDataSource = ref(localStorage.getItem('preferredDataSource') || 'tushare')

// 数据源列表
const dataSources = [
  { label: 'Tushare', value: 'tushare' },
  { label: '新浪财经', value: 'sina' },
  { label: '东方财富', value: 'eastmoney' },
  { label: '腾讯股票', value: 'tencent' },
  { label: '网易财经', value: 'netease' },
  { label: 'AKShare', value: 'akshare' },
]

// 计算属性
const hitRateClass = computed(() => {
  if (!cacheStats.value) return ''
  return cacheStatsService.formatHitRate(cacheStats.value.hitRate)
})

// 生命周期钩子
onMounted(async () => {
  await Promise.all([fetchCacheStats(), fetchCacheStatus()])
})

// 获取缓存统计信息
const fetchCacheStats = async () => {
  isLoading.value = true
  error.value = ''

  try {
    cacheStats.value = await cacheStatsService.getStats(currentDataSource.value)
  } catch (err: any) {
    console.error('获取缓存统计信息失败:', err)
    error.value = err.message || '获取缓存统计信息失败'
    showToast(error.value, 'error')
  } finally {
    isLoading.value = false
  }
}

// 获取缓存状态
const fetchCacheStatus = async () => {
  isLoadingStatus.value = true
  statusError.value = ''

  try {
    cacheStatus.value = await cacheService.getCacheStatus(currentDataSource.value)
  } catch (err: any) {
    console.error('获取缓存状态失败:', err)
    statusError.value = err.message || '获取缓存状态失败'
    showToast(statusError.value, 'error')
  } finally {
    isLoadingStatus.value = false
  }
}

// 切换数据源
const handleDataSourceChange = async () => {
  // 保存当前选择的数据源到本地存储
  localStorage.setItem('preferredDataSource', currentDataSource.value)

  // 刷新缓存统计和状态
  await Promise.all([fetchCacheStats(), fetchCacheStatus()])
}

// 清除缓存
const clearCache = async () => {
  try {
    const result = await cacheService.clearCache(currentDataSource.value)
    showToast(`缓存已清除: ${result.clearedKeys?.length || 0} 个键`, 'success')

    // 刷新缓存状态
    await Promise.all([fetchCacheStats(), fetchCacheStatus()])
  } catch (err: any) {
    console.error('清除缓存失败:', err)
    showToast(err.message || '清除缓存失败', 'error')
  }
}

// 处理刷新成功
const handleRefreshSuccess = async () => {
  // 刷新缓存状态
  await Promise.all([fetchCacheStats(), fetchCacheStatus()])
}

// 处理预热成功
const handlePrewarmSuccess = async () => {
  // 刷新缓存状态
  await Promise.all([fetchCacheStats(), fetchCacheStatus()])
}

// 格式化日期
const formatDate = (dateString: string | null) => {
  if (!dateString) return '未知'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
</script>

<style scoped>
.cache-management {
  width: 100%;
}

.section-title {
  font-size: 20px;
  margin-bottom: 5px;
  color: #333;
}

.section-description {
  color: #666;
  margin-bottom: 20px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.dashboard-card {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.full-width {
  grid-column: 1 / -1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e8e8e8;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.header-actions select {
  padding: 6px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  outline: none;
  font-size: 14px;
  background-color: white;
}

.card-body {
  padding: 15px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #1890ff;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  padding: 15px;
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  color: #f5222d;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.stat-value.hit-rate-low {
  color: #f5222d;
}

.stat-value.hit-rate-medium {
  color: #fa8c16;
}

.stat-value.hit-rate-high {
  color: #52c41a;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.action-btn.clear {
  color: #f5222d;
  border-color: #f5222d;
}

.action-btn.clear:hover:not(.disabled) {
  background-color: #fff2f0;
}

.action-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid #e8e8e8;
  padding-bottom: 8px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.detail-item {
  display: flex;
  flex-direction: column;
}

.detail-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.detail-value {
  font-size: 14px;
  color: #333;
}

.cache-keys {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 10px;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: #999;
}

.keys-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.key-item {
  font-family: monospace;
  font-size: 12px;
  padding: 5px;
  background-color: #f5f5f5;
  border-radius: 4px;
  word-break: break-all;
}

.key-item:nth-child(even) {
  background-color: #fafafa;
}
</style>
