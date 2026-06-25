<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { stockService } from '@/services/stockService'
import { alertService, type Alert, type AlertCondition } from '@/services/alertService'
import { alertMigrationService } from '@/services/alertMigrationService'
import { useToast } from '@/composables/useToast'
import { ElMessageBox } from 'element-plus'
import type { Stock } from '@/types/stock'
import UnifiedStockSearch from '@/components/common/UnifiedStockSearch.vue'
import PageLayout from '@/components/common/PageLayout.vue'

const { showToast } = useToast()

// 股票列表
const stocks = ref<Stock[]>([])
const isLoading = ref(false)
const error = ref('')

// 提醒列表
const alerts = ref<Alert[]>([])

// 新提醒表单
const newAlert = reactive({
  symbol: '',
  stockName: '', // 添加股票名称字段
  condition: 'price_above' as AlertCondition, // 默认条件：价格高于
  value: 0,
  message: '',
  active: true,
})

// 可用条件列表
const conditions = [
  { id: 'price_above', name: '价格高于', unit: '元' },
  { id: 'price_below', name: '价格低于', unit: '元' },
  { id: 'volume_above', name: '成交量高于', unit: '手' },
  { id: 'change_above', name: '涨幅高于', unit: '%' },
  { id: 'change_below', name: '跌幅高于', unit: '%' },
]

// 获取股票列表
const fetchStocks = async () => {
  isLoading.value = true
  error.value = ''

  try {
    stocks.value = await stockService.getStocks()
  } catch (err: any) {
    console.error('获取股票列表失败:', err)
    error.value = `获取股票列表失败: ${err.message || '未知错误'}`
  } finally {
    isLoading.value = false
  }
}

// 获取提醒列表
const fetchAlerts = async () => {
  isLoading.value = true
  error.value = ''

  try {
    alerts.value = await alertService.getAlerts()
  } catch (err: any) {
    console.error('获取提醒列表失败:', err)
    error.value = `获取提醒列表失败: ${err.message || '未知错误'}`
  } finally {
    isLoading.value = false
  }
}

// 选择股票
const selectStock = (stock: any) => {
  newAlert.symbol = stock.symbol
  // 如果股票名称存在，也设置它
  if (stock.name) {
    newAlert.stockName = stock.name
  }
}

// 添加提醒
const addAlert = async () => {
  if (!newAlert.symbol) {
    showToast('请选择股票', 'warning')
    return
  }

  if (!newAlert.value) {
    showToast('请输入条件值', 'warning')
    return
  }

  isLoading.value = true

  try {
    // 创建新提醒
    const alertData = {
      stockCode: newAlert.symbol,
      stockName: newAlert.stockName || '',
      alertType: 'price', // 默认为价格提醒
      condition: newAlert.condition,
      value: newAlert.value,
      message:
        newAlert.message ||
        `${newAlert.stockName || newAlert.symbol} ${
          conditions.find((c) => c.id === newAlert.condition)?.name || ''
        } ${newAlert.value}${conditions.find((c) => c.id === newAlert.condition)?.unit || ''}`,
    }

    // 调用API创建提醒
    const createdAlert = await alertService.createAlert(alertData)

    // 添加到提醒列表
    alerts.value.push(createdAlert)

    // 重置表单
    newAlert.symbol = ''
    newAlert.stockName = ''
    newAlert.value = 0
    newAlert.message = ''

    showToast('提醒已添加', 'success')
  } catch (err: any) {
    console.error('添加提醒失败:', err)
    showToast(`添加提醒失败: ${err.message || '未知错误'}`, 'error')
  } finally {
    isLoading.value = false
  }
}

// 删除提醒
const deleteAlert = (id: number) => {
  ElMessageBox.confirm('确定要删除这个提醒吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        // 调用API删除提醒
        await alertService.deleteAlert(id)

        // 从列表中移除
        alerts.value = alerts.value.filter((alert) => alert.id !== id)

        showToast('提醒已删除', 'success')
      } catch (err: any) {
        console.error('删除提醒失败:', err)
        showToast(`删除提醒失败: ${err.message || '未知错误'}`, 'error')
      }
    })
    .catch(() => {
      // 用户取消删除，不做任何操作
    })
}

// 切换提醒状态
const toggleAlertStatus = async (id: number) => {
  const alert = alerts.value.find((a) => a.id === id)
  if (alert) {
    try {
      // 调用API更新提醒状态
      const updatedAlert = await alertService.toggleAlertStatus(id, !alert.isActive)

      // 更新本地状态
      Object.assign(alert, updatedAlert)

      showToast(`提醒已${alert.isActive ? '启用' : '停用'}`, 'success')
    } catch (err: any) {
      console.error('更新提醒状态失败:', err)
      showToast(`更新提醒状态失败: ${err.message || '未知错误'}`, 'error')
    }
  }
}

// 获取条件名称
const getConditionName = (condition: string): string => {
  const conditionMap = {
    price_above: '价格高于',
    price_below: '价格低于',
    volume_above: '成交量高于',
    change_above: '涨幅高于',
    change_below: '跌幅高于',
  }

  return conditionMap[condition as keyof typeof conditionMap] || condition
}

// 获取条件单位
const getConditionUnit = (condition: string): string => {
  const unitMap = {
    price_above: '元',
    price_below: '元',
    volume_above: '手',
    change_above: '%',
    change_below: '%',
  }

  return unitMap[condition as keyof typeof unitMap] || ''
}

// 手动检查提醒状态
const checkAlertStatus = async () => {
  isLoading.value = true

  try {
    // 刷新提醒列表
    await fetchAlerts()
    showToast('提醒状态已更新', 'success')
  } catch (err: any) {
    console.error('检查提醒状态失败:', err)
    showToast(`检查提醒状态失败: ${err.message || '未知错误'}`, 'error')
  } finally {
    isLoading.value = false
  }
}

// 迁移本地提醒数据到数据库
const migrateLocalAlerts = async () => {
  // 检查是否有本地提醒数据
  if (!alertMigrationService.hasLocalAlerts()) {
    return
  }

  try {
    isLoading.value = true

    // 确认迁移
    await ElMessageBox.confirm(
      '检测到本地存储的提醒数据，是否将其迁移到数据库？迁移后可在多设备间同步提醒数据。',
      '数据迁移',
      {
        confirmButtonText: '确认迁移',
        cancelButtonText: '暂不迁移',
        type: 'info',
      }
    )

    // 执行迁移
    const result = await alertMigrationService.migrateAlertsToDatabase()

    if (result.total > 0) {
      // 迁移完成后刷新提醒列表
      await fetchAlerts()
    }
  } catch (err: any) {
    // 用户取消迁移或发生错误
    if (err !== 'cancel') {
      console.error('迁移提醒数据失败:', err)
      showToast(`迁移提醒数据失败: ${err.message || '未知错误'}`, 'error')
    }
  } finally {
    isLoading.value = false
  }
}

// 组件挂载时
onMounted(() => {
  fetchStocks()
  fetchAlerts()

  // 检查并迁移本地提醒数据
  migrateLocalAlerts()

  // 请求通知权限
  if ('Notification' in window) {
    Notification.requestPermission()
  }
})
</script>

<template>
  <PageLayout title="条件提醒" subtitle="设置价格、成交量等条件的提醒，及时把握市场机会">
    <div class="alerts-container">
      <div class="alerts-sidebar">
        <div class="panel">
          <h2>添加新提醒</h2>

          <div class="form-group">
            <label>选择股票</label>
            <UnifiedStockSearch @select="selectStock" />
          </div>

          <div class="form-group">
            <label for="condition">提醒条件</label>
            <select id="condition" v-model="newAlert.condition" class="form-control">
              <option v-for="condition in conditions" :key="condition.id" :value="condition.id">
                {{ condition.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="value">条件值</label>
            <div class="input-group">
              <input
                type="number"
                id="value"
                v-model="newAlert.value"
                class="form-control"
                step="0.01"
              />
              <span class="input-group-text">
                {{ conditions.find((c) => c.id === newAlert.condition)?.unit }}
              </span>
            </div>
          </div>

          <div class="form-group">
            <label for="message">提醒消息 (可选)</label>
            <input
              type="text"
              id="message"
              v-model="newAlert.message"
              class="form-control"
              placeholder="自定义提醒消息"
            />
          </div>

          <div class="form-actions">
            <button class="btn btn-primary" @click="addAlert">添加提醒</button>
          </div>
        </div>
      </div>

      <div class="alerts-content">
        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>正在加载，请稍候...</p>
        </div>

        <div v-else-if="error" class="error-state">
          <p>{{ error }}</p>
          <button class="btn btn-primary" @click="fetchStocks">重试</button>
        </div>

        <div v-else-if="alerts.length === 0" class="empty-state">
          <div class="empty-icon">🔔</div>
          <h3>没有设置提醒</h3>
          <p>添加提醒以便在股票满足特定条件时收到通知</p>
        </div>

        <div v-else class="alerts-list">
          <div class="alerts-header">
            <h3>我的提醒 ({{ alerts.length }})</h3>
            <div class="alerts-actions">
              <button
                v-if="alertMigrationService.hasLocalAlerts()"
                class="btn btn-primary btn-sm"
                @click="migrateLocalAlerts"
                :disabled="isLoading"
                title="将本地存储的提醒数据迁移到数据库"
              >
                <span v-if="isLoading">迁移中...</span>
                <span v-else>迁移本地数据</span>
              </button>
              <button class="btn btn-secondary" @click="checkAlertStatus" :disabled="isLoading">
                <span v-if="isLoading">刷新中...</span>
                <span v-else>刷新状态</span>
              </button>
            </div>
          </div>

          <div class="alert-card" v-for="alert in alerts" :key="alert.id">
            <div class="alert-header">
              <div class="alert-title">{{ alert.stockName || alert.stockCode }}</div>
              <div class="alert-actions">
                <button
                  class="btn-icon"
                  :class="{ active: alert.isActive }"
                  @click="toggleAlertStatus(alert.id)"
                  :title="alert.isActive ? '停用' : '启用'"
                >
                  <span v-if="alert.isActive">🔔</span>
                  <span v-else>🔕</span>
                </button>
                <button class="btn-icon delete" @click="deleteAlert(alert.id)" title="删除">
                  ❌
                </button>
              </div>
            </div>

            <div class="alert-condition">
              {{ getConditionName(alert.condition) }} {{ alert.value
              }}{{ getConditionUnit(alert.condition) }}
            </div>

            <div class="alert-message">
              {{ alert.message }}
            </div>

            <div class="alert-footer">
              <div class="alert-status" :class="{ active: alert.isActive }">
                {{ alert.isActive ? '已启用' : '已停用' }}
              </div>
              <div class="alert-date">创建于 {{ new Date(alert.createdAt).toLocaleString() }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.alerts-container {
  display: flex;
  gap: var(--spacing-lg);
}

.alerts-sidebar {
  width: 320px;
  flex-shrink: 0;
}

.alerts-content {
  flex: 1;
  min-width: 0;
}

.panel {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.panel h2 {
  font-size: var(--font-size-lg);
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  color: var(--text-secondary);
  font-weight: 500;
}

.form-control {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.input-group {
  display: flex;
  align-items: center;
}

.input-group .form-control {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  flex: 1;
}

.input-group-text {
  padding: var(--spacing-sm);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-left: none;
  border-top-right-radius: var(--border-radius-sm);
  border-bottom-right-radius: var(--border-radius-sm);
  color: var(--text-secondary);
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl) 0;
  text-align: center;
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
  min-height: 400px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(66, 185, 131, 0.1);
  border-radius: 50%;
  border-top: 3px solid var(--primary-color);
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-md);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-state {
  color: var(--error-color);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-md);
}

.empty-state h3 {
  margin-top: 0;
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
}

.empty-state p {
  color: var(--text-secondary);
  max-width: 400px;
}

.alerts-list {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-md);
}

.alerts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.alerts-header h3 {
  font-size: var(--font-size-lg);
  margin: 0;
  color: var(--text-primary);
}

.alerts-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.btn-sm {
  font-size: var(--font-size-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
}

.btn-secondary {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: background-color 0.2s;
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--bg-hover);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alert-card {
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  border-left: 3px solid var(--primary-color);
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.alert-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: var(--font-size-md);
}

.alert-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--font-size-md);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.btn-icon:hover {
  background-color: var(--bg-hover);
}

.btn-icon.active {
  color: var(--primary-color);
}

.btn-icon.delete:hover {
  color: var(--error-color);
}

.alert-condition {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.alert-message {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
  font-size: var(--font-size-sm);
}

.alert-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.alert-status {
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
  background-color: var(--bg-tertiary);
}

.alert-status.active {
  background-color: rgba(66, 185, 131, 0.1);
  color: var(--success-color);
}

@media (max-width: 768px) {
  .alerts-container {
    flex-direction: column;
  }

  .alerts-sidebar {
    width: 100%;
  }
}
</style>
