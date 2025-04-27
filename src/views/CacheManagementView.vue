<template>
  <div class="cache-management-view">
    <div class="page-header">
      <h1>缓存管理</h1>
      <p class="subtitle">管理和监控数据缓存，优化应用性能</p>
    </div>
    
    <div class="dashboard-grid">
      <!-- 缓存健康状态 -->
      <div class="dashboard-card">
        <div class="card-header">
          <h2>缓存健康状态</h2>
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
          <h2>缓存操作</h2>
        </div>
        <div class="card-body">
          <div class="action-buttons">
            <CacheRefreshButton 
              :dataSource="currentDataSource" 
              @refresh-success="handleRefreshSuccess"
            />
            <CachePrewarmButton 
              :count="20" 
              @prewarm-success="handlePrewarmSuccess"
            />
            <button 
              class="action-btn clear" 
              :class="{ 'disabled': isLoading }"
              :disabled="isLoading"
              @click="clearCache"
            >
              <span class="btn-icon">🗑️</span>
              <span class="btn-text">清除缓存</span>
            </button>
          </div>
          
          <div class="data-source-selector">
            <div class="selector-label">数据源:</div>
            <div class="selector-options">
              <button 
                v-for="source in dataSources" 
                :key="source.value"
                class="source-btn"
                :class="{ 'active': currentDataSource === source.value }"
                @click="currentDataSource = source.value"
              >
                {{ source.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 缓存统计 -->
      <div class="dashboard-card full-width">
        <div class="card-header">
          <h2>缓存统计详情</h2>
          <div class="header-actions">
            <button 
              class="refresh-btn-sm" 
              :class="{ 'disabled': isLoading }"
              :disabled="isLoading"
              @click="fetchCacheStats"
              title="刷新统计信息"
            >
              <span v-if="!isLoading">🔄</span>
              <span class="btn-spinner" v-else></span>
            </button>
          </div>
        </div>
        <div class="card-body">
          <div v-if="isLoading" class="loading-container">
            <div class="loading-spinner"></div>
            <p>加载中...</p>
          </div>
          <div v-else-if="!cacheStats" class="empty-state">
            <p>暂无缓存统计数据</p>
            <button class="action-btn" @click="fetchCacheStats">获取统计</button>
          </div>
          <div v-else class="stats-container">
            <div class="stats-overview">
              <div class="stat-card">
                <div class="stat-value">{{ cacheStats.requests }}</div>
                <div class="stat-label">总请求数</div>
              </div>
              <div class="stat-card">
                <div class="stat-value" :class="hitRateClass">{{ cacheStats.hitRate }}</div>
                <div class="stat-label">命中率</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ cacheStats.hits }}</div>
                <div class="stat-label">命中次数</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ cacheStats.misses }}</div>
                <div class="stat-label">未命中次数</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ cacheStats.apiCalls }}</div>
                <div class="stat-label">API调用次数</div>
              </div>
              <div class="stat-card">
                <div class="stat-value" :class="{ 'error': cacheStats.errors > 0 }">{{ cacheStats.errors }}</div>
                <div class="stat-label">错误次数</div>
              </div>
            </div>
            
            <div v-if="cacheStats.apiStats" class="api-stats">
              <h3>API统计</h3>
              <div class="api-table-container">
                <table class="api-table">
                  <thead>
                    <tr>
                      <th>API名称</th>
                      <th>请求数</th>
                      <th>命中率</th>
                      <th>API调用</th>
                      <th>错误数</th>
                      <th>最后访问</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(stat, api) in cacheStats.apiStats" :key="api">
                      <td>{{ api }}</td>
                      <td>{{ stat.requests }}</td>
                      <td :class="getHitRateClass(stat.hitRate)">{{ stat.hitRate }}</td>
                      <td>{{ stat.apiCalls }}</td>
                      <td :class="{ 'error': stat.errors > 0 }">{{ stat.errors }}</td>
                      <td>{{ formatTimeDiff(stat.lastAccess) }}</td>
                    </tr>
                  </tbody>
                </table>
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
import { useToast } from '@/composables/useToast'
import CacheStatusIndicator from '@/components/common/CacheStatusIndicator.vue'
import CacheHealthStatus from '@/components/common/CacheHealthStatus.vue'
import CacheRefreshButton from '@/components/common/CacheRefreshButton.vue'
import CachePrewarmButton from '@/components/common/CachePrewarmButton.vue'

// 状态变量
const { showToast } = useToast()
const isLoading = ref(false)
const cacheStats = ref<CacheStats | null>(null)
const currentDataSource = ref('tushare')

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

// 方法
const fetchCacheStats = async () => {
  if (isLoading.value) return
  
  isLoading.value = true
  
  try {
    cacheStats.value = await cacheStatsService.getStats(currentDataSource.value)
  } catch (error: any) {
    console.error('获取缓存统计信息失败:', error)
    showToast(error.message || '获取缓存统计信息失败', 'error')
  } finally {
    isLoading.value = false
  }
}

const clearCache = async () => {
  if (isLoading.value) return
  
  isLoading.value = true
  
  try {
    await cacheService.clearCache(currentDataSource.value)
    showToast(`${currentDataSource.value} 缓存已清除`, 'success')
    
    // 重新获取统计信息
    await fetchCacheStats()
  } catch (error: any) {
    console.error('清除缓存失败:', error)
    showToast(error.message || '清除缓存失败', 'error')
  } finally {
    isLoading.value = false
  }
}

const handleRefreshSuccess = () => {
  // 刷新成功后重新获取统计信息
  fetchCacheStats()
}

const handlePrewarmSuccess = () => {
  // 预热成功后重新获取统计信息
  fetchCacheStats()
}

const getHitRateClass = (hitRate: string) => {
  return cacheStatsService.formatHitRate(hitRate)
}

const formatTimeDiff = (dateString: string) => {
  return cacheStatsService.getTimeDiff(dateString)
}

// 生命周期钩子
onMounted(async () => {
  // 获取初始统计信息
  await fetchCacheStats()
})
</script>

<style scoped>
.cache-management-view {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.page-header {
  margin-bottom: var(--spacing-lg);
  text-align: center;
}

.page-header h1 {
  font-size: var(--font-size-xl);
  color: var(--primary-color);
  margin-bottom: var(--spacing-xs);
  font-weight: 700;
}

.subtitle {
  color: var(--text-secondary);
  font-size: var(--font-size-md);
  max-width: 700px;
  margin: 0 auto;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.full-width {
  grid-column: 1 / -1;
}

.dashboard-card {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.card-header {
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  font-size: var(--font-size-lg);
  color: var(--primary-color);
  margin: 0;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.card-body {
  padding: var(--spacing-md);
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
  font-weight: 500;
  border: none;
}

.action-btn.clear {
  background-color: var(--error-color);
  color: white;
}

.action-btn.clear:hover {
  background-color: var(--error-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.action-btn.disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.data-source-selector {
  margin-top: var(--spacing-md);
  border-top: 1px solid var(--border-light);
  padding-top: var(--spacing-md);
}

.selector-label {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.selector-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.source-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
}

.source-btn:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--primary-light);
}

.source-btn.active {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.refresh-btn-sm {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.refresh-btn-sm:hover {
  background-color: var(--primary-light);
  color: var(--primary-color);
  border-color: var(--primary-color);
  transform: rotate(30deg);
}

.refresh-btn-sm.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(144, 147, 153, 0.3);
  border-top: 2px solid var(--text-secondary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl) 0;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(66, 185, 131, 0.2);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-md);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-xl) 0;
  color: var(--text-secondary);
}

.stats-container {
  margin-top: var(--spacing-md);
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.stat-card {
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  padding: var(--spacing-md);
  text-align: center;
  border: 1px solid var(--border-light);
}

.stat-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin-bottom: var(--spacing-xs);
  color: var(--text-primary);
}

.stat-value.excellent {
  color: var(--success-color);
}

.stat-value.good,
.stat-value.average {
  color: var(--warning-color);
}

.stat-value.poor,
.stat-value.critical,
.stat-value.error {
  color: var(--error-color);
}

.stat-label {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.api-stats {
  margin-top: var(--spacing-lg);
  border-top: 1px solid var(--border-light);
  padding-top: var(--spacing-md);
}

.api-stats h3 {
  font-size: var(--font-size-md);
  color: var(--primary-color);
  margin-bottom: var(--spacing-md);
  font-weight: 600;
}

.api-table-container {
  overflow-x: auto;
}

.api-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.api-table th,
.api-table td {
  padding: var(--spacing-sm);
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}

.api-table th {
  background-color: var(--bg-secondary);
  font-weight: 600;
  color: var(--text-primary);
}

.api-table td {
  color: var(--text-secondary);
}

.api-table tr:hover td {
  background-color: var(--bg-tertiary);
}

.api-table td.excellent {
  color: var(--success-color);
}

.api-table td.good,
.api-table td.average {
  color: var(--warning-color);
}

.api-table td.poor,
.api-table td.critical,
.api-table td.error {
  color: var(--error-color);
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
