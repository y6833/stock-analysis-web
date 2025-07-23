<template>
  <div class="cache-status">
    <h3>缓存状态</h3>

    <!-- 基础统计 -->
    <el-card shadow="hover" class="cache-card">
      <template #header>
        <div class="card-header">
          <span>缓存统计</span>
          <div>
            <el-button type="primary" size="small" @click="updateStats">刷新</el-button>
            <el-button type="success" size="small" @click="warmupCache">预热</el-button>
            <el-button type="danger" size="small" @click="clearAll">清除所有</el-button>
          </div>
        </div>
      </template>
      <div class="stats-container">
        <div class="stat-item">
          <div class="stat-label">命中</div>
          <div class="stat-value">{{ stats.hits }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">未命中</div>
          <div class="stat-value">{{ stats.misses }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">设置</div>
          <div class="stat-value">{{ stats.sets }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">删除</div>
          <div class="stat-value">{{ stats.deletes }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">错误</div>
          <div class="stat-value">{{ stats.errors }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">命中率</div>
          <div class="stat-value">{{ hitRate }}%</div>
        </div>
      </div>
    </el-card>

    <!-- 使用情况 -->
    <el-card shadow="hover" class="cache-card">
      <template #header>
        <span>使用情况</span>
      </template>
      <div class="usage-container">
        <div class="usage-item">
          <div class="usage-label">内存缓存</div>
          <div class="usage-value">{{ formatBytes(usage.memorySize) }}</div>
        </div>
        <div class="usage-item">
          <div class="usage-label">存储缓存</div>
          <div class="usage-value">{{ formatBytes(usage.storageSize) }}</div>
        </div>
        <div class="usage-item">
          <div class="usage-label">总项目数</div>
          <div class="usage-value">{{ usage.totalItems }}</div>
        </div>
        <div class="usage-item">
          <div class="usage-label">整体命中率</div>
          <div class="usage-value">{{ usage.hitRate }}%</div>
        </div>
      </div>
    </el-card>

    <!-- 命名空间管理 -->
    <el-card shadow="hover" class="cache-card">
      <template #header>
        <span>命名空间管理</span>
      </template>
      <div class="namespace-controls">
        <el-select v-model="selectedNamespace" placeholder="选择命名空间">
          <el-option label="股票数据" value="stock" />
          <el-option label="市场数据" value="market" />
          <el-option label="用户数据" value="user" />
          <el-option label="搜索结果" value="search" />
        </el-select>
        <el-button type="warning" size="small" @click="clearNamespace">清除命名空间</el-button>
        <el-button type="info" size="small" @click="smartInvalidateNamespace">智能失效</el-button>
      </div>
    </el-card>

    <!-- 缓存层级状态 -->
    <el-card shadow="hover" class="cache-card">
      <template #header>
        <span>多层缓存状态</span>
      </template>
      <div class="layers-container">
        <div class="layer-item">
          <div class="layer-header">
            <span class="layer-name">客户端缓存</span>
            <el-tag :type="clientCacheStatus.enabled ? 'success' : 'danger'" size="small">
              {{ clientCacheStatus.enabled ? '启用' : '禁用' }}
            </el-tag>
          </div>
          <div class="layer-details">
            <span>类型: {{ clientCacheStatus.type }}</span>
            <span>项目: {{ clientCacheStatus.items }}</span>
          </div>
        </div>

        <div class="layer-item">
          <div class="layer-header">
            <span class="layer-name">服务器缓存</span>
            <el-tag :type="serverCacheStatus.enabled ? 'success' : 'danger'" size="small">
              {{ serverCacheStatus.enabled ? '启用' : '禁用' }}
            </el-tag>
          </div>
          <div class="layer-details">
            <span>类型: Redis</span>
            <span>连接: {{ serverCacheStatus.connected ? '正常' : '断开' }}</span>
          </div>
        </div>

        <div class="layer-item">
          <div class="layer-header">
            <span class="layer-name">数据库缓存</span>
            <el-tag type="success" size="small">启用</el-tag>
          </div>
          <div class="layer-details">
            <span>类型: 查询缓存</span>
            <span>状态: 自动刷新</span>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, reactive } from 'vue'
import { useCache } from '../../composables/useCache'
import { ElMessage } from 'element-plus'

const {
  stats,
  updateStats,
  clearAll,
  clearNamespace: clearCacheNamespace,
  smartInvalidate,
  warmup,
  getUsage,
} = useCache()

const selectedNamespace = ref('stock')
const usage = ref(getUsage())

// 缓存层级状态
const clientCacheStatus = reactive({
  enabled: true,
  type: 'localStorage',
  items: 0,
})

const serverCacheStatus = reactive({
  enabled: true,
  connected: true,
})

// 计算命中率
const hitRate = computed(() => {
  const total = stats.value.hits + stats.value.misses
  if (total === 0) return '0.00'
  return ((stats.value.hits / total) * 100).toFixed(2)
})

// 格式化字节数
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 清除选定的命名空间
const clearNamespace = () => {
  if (selectedNamespace.value) {
    clearCacheNamespace(selectedNamespace.value)
    updateStats()
    updateUsage()
    ElMessage.success(`已清除 ${selectedNamespace.value} 命名空间的缓存`)
  }
}

// 智能失效命名空间
const smartInvalidateNamespace = () => {
  if (selectedNamespace.value) {
    smartInvalidate(`${selectedNamespace.value}:*`)
    updateStats()
    updateUsage()
    ElMessage.success(`已智能失效 ${selectedNamespace.value} 命名空间的缓存`)
  }
}

// 缓存预热
const warmupCache = async () => {
  try {
    const commonKeys = ['stock:list', 'market:overview', 'market:indexes', 'stock:hot']

    await warmup(commonKeys)
    updateStats()
    updateUsage()
    ElMessage.success('缓存预热完成')
  } catch (error) {
    ElMessage.error('缓存预热失败')
  }
}

// 更新使用情况
const updateUsage = () => {
  usage.value = getUsage()
}

// 检查服务器缓存状态
const checkServerCacheStatus = async () => {
  try {
    const response = await fetch('/api/v1/cache/status')
    if (response.ok) {
      const data = await response.json()
      serverCacheStatus.enabled = data.enabled
      serverCacheStatus.connected = data.connected
    }
  } catch (error) {
    serverCacheStatus.connected = false
  }
}

// 组件挂载时初始化
onMounted(() => {
  updateStats()
  updateUsage()
  checkServerCacheStatus()

  // 定期更新状态
  setInterval(() => {
    updateStats()
    updateUsage()
    checkServerCacheStatus()
  }, 30000) // 每30秒更新一次
})
</script>

<style scoped>
.cache-status {
  margin: 20px 0;
}

.cache-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.stat-item {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 10px;
  text-align: center;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

.namespace-controls {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.usage-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.usage-item {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 10px;
  text-align: center;
}

.usage-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 5px;
}

.usage-value {
  font-size: 16px;
  font-weight: bold;
  color: #67c23a;
}

.layers-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.layer-item {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 15px;
}

.layer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.layer-name {
  font-weight: bold;
  color: #303133;
}

.layer-details {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #606266;
}
</style>
