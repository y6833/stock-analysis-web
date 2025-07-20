<template>
  <div class="doji-pattern-system-status">
    <el-card class="status-card">
      <template #header>
        <div class="card-header">
          <span class="header-icon">📊</span>
          <span class="header-title">十字星形态系统状态</span>
        </div>
      </template>

      <div class="status-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="缓存状态">
            <el-tag :type="systemStatus.cacheEnabled ? 'success' : 'info'">
              {{ systemStatus.cacheEnabled ? '已启用' : '已禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="缓存项数">
            {{ systemStatus.cacheItems }} 项
          </el-descriptions-item>
          <el-descriptions-item label="缓存大小">
            {{ systemStatus.cacheSize }} KB
          </el-descriptions-item>
          <el-descriptions-item label="最后更新">
            {{ systemStatus.lastUpdate ? formatDate(systemStatus.lastUpdate) : '无数据' }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="performance-metrics">
          <h4>性能指标</h4>
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="metric-card">
                <div class="metric-value">{{ calculationTime }}ms</div>
                <div class="metric-label">计算耗时</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="metric-card">
                <div class="metric-value">{{ memoryUsage }}MB</div>
                <div class="metric-label">内存占用</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="metric-card">
                <div class="metric-value">{{ cpuUsage }}%</div>
                <div class="metric-label">CPU占用</div>
              </div>
            </el-col>
          </el-row>
        </div>

        <div class="system-actions">
          <el-button type="primary" @click="refreshStatus">
            <el-icon><Refresh /></el-icon>
            刷新状态
          </el-button>
          <el-button type="danger" @click="clearCache">
            <el-icon><Delete /></el-icon>
            清除缓存
          </el-button>
          <el-button @click="optimizeSystem">
            <el-icon><SetUp /></el-icon>
            优化系统
          </el-button>
        </div>

        <div class="config-section">
          <h4>系统配置</h4>
          <el-form :model="configForm" label-width="120px">
            <el-form-item label="启用缓存">
              <el-switch v-model="configForm.cacheEnabled" />
            </el-form-item>
            <el-form-item label="缓存过期时间">
              <el-select v-model="configForm.cacheExpiryTime" style="width: 100%">
                <el-option :value="5 * 60 * 1000" label="5分钟" />
                <el-option :value="15 * 60 * 1000" label="15分钟" />
                <el-option :value="30 * 60 * 1000" label="30分钟" />
                <el-option :value="60 * 60 * 1000" label="1小时" />
                <el-option :value="24 * 60 * 60 * 1000" label="1天" />
              </el-select>
            </el-form-item>
            <el-form-item label="计算节流时间">
              <el-slider
                v-model="configForm.calculationThrottleTime"
                :min="100"
                :max="1000"
                :step="100"
                show-input
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveConfig">保存配置</el-button>
              <el-button @click="resetConfig">重置</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Delete, SetUp } from '@element-plus/icons-vue'
import { dojiPatternSystemService } from '@/services/DojiPatternSystemService'

// 系统状态
const systemStatus = ref({
  cacheEnabled: true,
  cacheSize: 0,
  cacheItems: 0,
  lastUpdate: null as Date | null,
})

// 性能指标
const calculationTime = ref(0)
const memoryUsage = ref(0)
const cpuUsage = ref(0)

// 配置表单
const configForm = ref({
  cacheEnabled: true,
  cacheExpiryTime: 30 * 60 * 1000, // 30分钟
  calculationThrottleTime: 500, // 500毫秒
})

// 格式化日期
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

// 刷新状态
const refreshStatus = () => {
  // 获取系统状态
  systemStatus.value = dojiPatternSystemService.getSystemStatus()

  // 模拟获取性能指标
  calculationTime.value = Math.floor(Math.random() * 50) + 10
  memoryUsage.value = Math.floor(Math.random() * 100) + 20
  cpuUsage.value = Math.floor(Math.random() * 30) + 5

  ElMessage.success('系统状态已刷新')
}

// 清除缓存
const clearCache = () => {
  ElMessageBox.confirm('确定要清除所有十字星形态缓存数据吗？', '清除缓存', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      dojiPatternSystemService.clearCache()
      refreshStatus()
      ElMessage.success('缓存已清除')
    })
    .catch(() => {
      // 取消操作
    })
}

// 优化系统
const optimizeSystem = () => {
  ElMessage.info('系统优化中...')

  // 模拟优化过程
  setTimeout(() => {
    refreshStatus()
    ElMessage.success('系统已优化')
  }, 1500)
}

// 保存配置
const saveConfig = () => {
  dojiPatternSystemService.saveUserConfig({
    cacheEnabled: configForm.value.cacheEnabled,
    cacheExpiryTime: configForm.value.cacheExpiryTime,
    calculationThrottleTime: configForm.value.calculationThrottleTime,
  })

  refreshStatus()
  ElMessage.success('配置已保存')
}

// 重置配置
const resetConfig = () => {
  configForm.value = {
    cacheEnabled: true,
    cacheExpiryTime: 30 * 60 * 1000,
    calculationThrottleTime: 500,
  }
}

// 组件挂载时获取系统状态
onMounted(() => {
  refreshStatus()
})
</script>

<style scoped>
.status-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 18px;
}

.header-title {
  font-weight: 600;
  font-size: 16px;
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.performance-metrics {
  margin-top: 10px;
}

.performance-metrics h4 {
  margin-bottom: 15px;
  color: var(--text-primary);
  font-weight: 600;
}

.metric-card {
  background-color: var(--bg-secondary);
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  height: 100%;
}

.metric-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--primary-color);
}

.metric-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 5px;
}

.system-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.config-section {
  margin-top: 20px;
}

.config-section h4 {
  margin-bottom: 15px;
  color: var(--text-primary);
  font-weight: 600;
}
</style>
