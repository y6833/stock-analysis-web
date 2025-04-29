<template>
  <div class="alerts-migration-test">
    <h1 class="title">提醒数据迁移测试</h1>

    <div class="test-container">
      <div class="test-section">
        <h2>本地存储提醒数据</h2>
        <div class="actions">
          <button class="btn btn-primary" @click="createLocalAlerts">创建测试提醒数据</button>
          <button class="btn btn-danger" @click="clearLocalAlerts">清除本地提醒数据</button>
        </div>

        <div class="local-alerts">
          <h3>当前本地提醒 ({{ localAlerts.length }})</h3>
          <div v-if="localAlerts.length === 0" class="empty-state">没有本地提醒数据</div>
          <div v-else class="alerts-list">
            <div v-for="alert in localAlerts" :key="alert.id" class="alert-item">
              <div class="alert-header">
                <div class="alert-stock">
                  <span class="stock-code">{{ alert.symbol }}</span>
                  <span class="stock-name">{{ alert.name }}</span>
                </div>
                <div class="alert-badge" :class="{ active: alert.active }">
                  {{ alert.active ? '已启用' : '已禁用' }}
                </div>
              </div>
              <div class="alert-content">
                <div class="alert-condition">
                  条件: {{ formatCondition(alert.condition) }} {{ alert.value }}
                </div>
                <div class="alert-message" v-if="alert.message">消息: {{ alert.message }}</div>
                <div class="alert-date">创建时间: {{ formatDate(alert.createdAt) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="test-section">
        <h2>数据库提醒数据</h2>
        <div class="actions">
          <button class="btn btn-primary" @click="migrateAlerts" :disabled="isLoading">
            <span v-if="isLoading">迁移中...</span>
            <span v-else>迁移提醒数据</span>
          </button>
          <button class="btn btn-secondary" @click="fetchDatabaseAlerts" :disabled="isLoading">
            <span v-if="isLoading">加载中...</span>
            <span v-else>刷新数据库提醒</span>
          </button>
        </div>

        <div class="database-alerts">
          <h3>当前数据库提醒 ({{ databaseAlerts.length }})</h3>
          <div v-if="isLoading" class="loading-state">加载中...</div>
          <div v-else-if="databaseAlerts.length === 0" class="empty-state">没有数据库提醒数据</div>
          <div v-else class="alerts-list">
            <div v-for="alert in databaseAlerts" :key="alert.id" class="alert-item">
              <div class="alert-header">
                <div class="alert-stock">
                  <span class="stock-code">{{ alert.stockCode }}</span>
                  <span class="stock-name">{{ alert.stockName }}</span>
                </div>
                <div class="alert-badge" :class="{ active: alert.active }">
                  {{ alert.active ? '已启用' : '已禁用' }}
                </div>
              </div>
              <div class="alert-content">
                <div class="alert-condition">
                  条件: {{ formatCondition(alert.condition) }} {{ alert.value }}
                </div>
                <div class="alert-message" v-if="alert.message">消息: {{ alert.message }}</div>
                <div class="alert-date">创建时间: {{ formatDate(alert.createdAt) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="test-section">
        <h2>迁移结果</h2>
        <div v-if="migrationResult" class="migration-result">
          <div class="result-header" :class="getResultClass">
            <h3>{{ getResultTitle }}</h3>
          </div>
          <div class="result-details">
            <p><strong>总数:</strong> {{ migrationResult.total }}</p>
            <p><strong>成功:</strong> {{ migrationResult.success }}</p>
            <p><strong>失败:</strong> {{ migrationResult.failed }}</p>
          </div>
        </div>
        <div v-else class="empty-state">尚未执行迁移</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { alertService, type Alert } from '@/services/alertService'
import { alertMigrationService } from '@/services/alertMigrationService'
import { useToast } from '@/composables/useToast'
import { v4 as uuidv4 } from 'uuid'

const { showToast } = useToast()

// 状态
const isLoading = ref(false)
const localAlerts = ref<any[]>([])
const databaseAlerts = ref<Alert[]>([])
const migrationResult = ref<{ total: number; success: number; failed: number } | null>(null)

// 测试数据
const testStocks = [
  { symbol: '000001', name: '平安银行' },
  { symbol: '600036', name: '招商银行' },
  { symbol: '601318', name: '中国平安' },
  { symbol: '000651', name: '格力电器' },
  { symbol: '600519', name: '贵州茅台' },
]

const testConditions = ['above', 'below', 'volume_above', 'change_above', 'change_below']

// 获取本地提醒数据
const getLocalAlerts = () => {
  const alertsJson = localStorage.getItem('stock_alerts')
  if (!alertsJson) {
    localAlerts.value = []
    return
  }

  try {
    localAlerts.value = JSON.parse(alertsJson)
  } catch (error) {
    console.error('解析本地提醒数据失败:', error)
    localAlerts.value = []
  }
}

// 创建测试提醒数据
const createLocalAlerts = () => {
  // 生成3-5个随机提醒
  const count = Math.floor(Math.random() * 3) + 3
  const alerts = []

  for (let i = 0; i < count; i++) {
    const stock = testStocks[Math.floor(Math.random() * testStocks.length)]
    const condition = testConditions[Math.floor(Math.random() * testConditions.length)]
    const value = Math.floor(Math.random() * 100) + 1

    alerts.push({
      id: uuidv4(),
      symbol: stock.symbol,
      name: stock.name,
      condition,
      value,
      message: `${stock.name}${
        condition === 'above' ? '上涨' : condition === 'below' ? '下跌' : '变动'
      }提醒`,
      active: Math.random() > 0.3, // 70%概率为激活状态
      createdAt: new Date().toISOString(),
    })
  }

  localStorage.setItem('stock_alerts', JSON.stringify(alerts))
  getLocalAlerts()
  showToast(`已创建 ${alerts.length} 个测试提醒`, 'success')
}

// 清除本地提醒数据
const clearLocalAlerts = () => {
  localStorage.removeItem('stock_alerts')
  getLocalAlerts()
  showToast('已清除本地提醒数据', 'success')
}

// 获取数据库提醒数据
const fetchDatabaseAlerts = async () => {
  isLoading.value = true

  try {
    databaseAlerts.value = await alertService.getAlerts()
  } catch (error) {
    console.error('获取数据库提醒失败:', error)
    showToast('获取数据库提醒失败', 'error')
  } finally {
    isLoading.value = false
  }
}

// 迁移提醒数据
const migrateAlerts = async () => {
  if (localAlerts.value.length === 0) {
    showToast('没有本地提醒数据可迁移', 'warning')
    return
  }

  isLoading.value = true

  try {
    migrationResult.value = await alertMigrationService.migrateAlertsToDatabase()

    if (migrationResult.value.success > 0) {
      showToast(`成功迁移 ${migrationResult.value.success} 个提醒到数据库`, 'success')
    }

    if (migrationResult.value.failed > 0) {
      showToast(`${migrationResult.value.failed} 个提醒迁移失败`, 'warning')
    }

    // 刷新数据
    getLocalAlerts()
    await fetchDatabaseAlerts()
  } catch (error) {
    console.error('迁移提醒数据失败:', error)
    showToast('迁移提醒数据失败', 'error')
  } finally {
    isLoading.value = false
  }
}

// 格式化条件
const formatCondition = (condition: string) => {
  const conditionMap: Record<string, string> = {
    above: '价格高于',
    below: '价格低于',
    volume_above: '成交量高于',
    change_above: '涨幅高于',
    change_below: '跌幅高于',
    price_above: '价格高于',
    price_below: '价格低于',
  }

  return conditionMap[condition] || condition
}

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '未知'

  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 计算属性
const getResultClass = computed(() => {
  if (!migrationResult.value) return ''

  if (migrationResult.value.failed > 0) {
    return 'result-warning'
  }

  return migrationResult.value.success > 0 ? 'result-success' : 'result-error'
})

const getResultTitle = computed(() => {
  if (!migrationResult.value) return ''

  if (migrationResult.value.failed > 0 && migrationResult.value.success > 0) {
    return '部分迁移成功'
  }

  return migrationResult.value.success > 0 ? '迁移成功' : '迁移失败'
})

// 初始化
onMounted(() => {
  getLocalAlerts()
  fetchDatabaseAlerts()
})
</script>

<style scoped>
.alerts-migration-test {
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

.actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
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

.btn-danger {
  background-color: var(--el-color-danger);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: var(--el-color-danger-dark-2);
}

.local-alerts h3,
.database-alerts h3 {
  margin-top: 0;
  margin-bottom: 15px;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-style: italic;
  background-color: var(--el-bg-color);
  border-radius: 4px;
}

.loading-state {
  padding: 20px;
  text-align: center;
  color: var(--el-text-color-secondary);
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.alert-item {
  background-color: var(--el-bg-color);
  border-radius: 8px;
  padding: 15px;
  box-shadow: var(--el-box-shadow-lighter);
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.alert-stock {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stock-code {
  font-weight: bold;
}

.stock-name {
  color: var(--el-text-color-secondary);
}

.alert-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  background-color: var(--el-color-info-light-9);
  color: var(--el-color-info);
}

.alert-badge.active {
  background-color: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

.alert-content {
  font-size: 14px;
}

.alert-condition,
.alert-message,
.alert-date {
  margin-bottom: 5px;
}

.alert-date {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.migration-result {
  background-color: var(--el-bg-color);
  border-radius: 8px;
  overflow: hidden;
}

.result-header {
  padding: 15px;
  text-align: center;
}

.result-header h3 {
  margin: 0;
  color: white;
}

.result-success {
  background-color: var(--el-color-success);
}

.result-warning {
  background-color: var(--el-color-warning);
}

.result-error {
  background-color: var(--el-color-danger);
}

.result-details {
  padding: 15px;
}

.result-details p {
  margin: 8px 0;
}

@media (max-width: 768px) {
  .actions {
    flex-direction: column;
  }
}
</style>
