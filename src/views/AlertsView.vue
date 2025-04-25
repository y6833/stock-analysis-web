<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { stockService } from '@/services/stockService'
import type { Stock } from '@/types/stock'

// 股票列表
const stocks = ref<Stock[]>([])
const isLoading = ref(false)
const error = ref('')

// 提醒列表
const alerts = ref<any[]>([])

// 新提醒表单
const newAlert = reactive({
  symbol: '',
  condition: 'price_above', // 默认条件：价格高于
  value: 0,
  message: '',
  active: true
})

// 可用条件列表
const conditions = [
  { id: 'price_above', name: '价格高于', unit: '元' },
  { id: 'price_below', name: '价格低于', unit: '元' },
  { id: 'volume_above', name: '成交量高于', unit: '手' },
  { id: 'change_above', name: '涨幅高于', unit: '%' },
  { id: 'change_below', name: '跌幅高于', unit: '%' }
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

// 添加提醒
const addAlert = () => {
  if (!newAlert.symbol) {
    alert('请选择股票')
    return
  }
  
  if (!newAlert.value) {
    alert('请输入条件值')
    return
  }
  
  // 获取股票信息
  const stock = stocks.value.find(s => s.symbol === newAlert.symbol)
  
  // 创建新提醒
  const alert = {
    id: Date.now(),
    symbol: newAlert.symbol,
    stockName: stock?.name || '',
    condition: newAlert.condition,
    conditionName: conditions.find(c => c.id === newAlert.condition)?.name || '',
    value: newAlert.value,
    unit: conditions.find(c => c.id === newAlert.condition)?.unit || '',
    message: newAlert.message || `${stock?.name || newAlert.symbol} ${conditions.find(c => c.id === newAlert.condition)?.name || ''} ${newAlert.value}${conditions.find(c => c.id === newAlert.condition)?.unit || ''}`,
    active: true,
    createdAt: new Date().toLocaleString()
  }
  
  // 添加到提醒列表
  alerts.value.push(alert)
  
  // 重置表单
  newAlert.symbol = ''
  newAlert.value = 0
  newAlert.message = ''
  
  // 保存到本地存储
  saveAlerts()
  
  alert('提醒已添加')
}

// 删除提醒
const deleteAlert = (id: number) => {
  if (confirm('确定要删除这个提醒吗？')) {
    alerts.value = alerts.value.filter(alert => alert.id !== id)
    saveAlerts()
  }
}

// 切换提醒状态
const toggleAlertStatus = (id: number) => {
  const alert = alerts.value.find(a => a.id === id)
  if (alert) {
    alert.active = !alert.active
    saveAlerts()
  }
}

// 保存提醒到本地存储
const saveAlerts = () => {
  localStorage.setItem('stockAlerts', JSON.stringify(alerts.value))
}

// 从本地存储加载提醒
const loadAlerts = () => {
  const savedAlerts = localStorage.getItem('stockAlerts')
  if (savedAlerts) {
    try {
      alerts.value = JSON.parse(savedAlerts)
    } catch (err) {
      console.error('加载提醒失败:', err)
    }
  }
}

// 模拟检查提醒条件
let checkInterval: number | null = null

const checkAlerts = () => {
  // 在实际应用中，这里应该调用API获取最新的股票价格
  // 这里使用模拟数据
  alerts.value.forEach(alert => {
    if (!alert.active) return
    
    // 模拟随机价格
    const currentPrice = Math.random() * 100
    const currentVolume = Math.random() * 10000
    const currentChange = Math.random() * 10 - 5
    
    let triggered = false
    
    switch (alert.condition) {
      case 'price_above':
        triggered = currentPrice > alert.value
        break
      case 'price_below':
        triggered = currentPrice < alert.value
        break
      case 'volume_above':
        triggered = currentVolume > alert.value
        break
      case 'change_above':
        triggered = currentChange > alert.value
        break
      case 'change_below':
        triggered = -currentChange > alert.value
        break
    }
    
    if (triggered) {
      // 在实际应用中，这里应该显示通知
      console.log(`提醒触发: ${alert.message}`)
      
      // 如果浏览器支持通知
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('股票提醒', {
            body: alert.message,
            icon: '/favicon.ico'
          })
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('股票提醒', {
                body: alert.message,
                icon: '/favicon.ico'
              })
            }
          })
        }
      }
    }
  })
}

// 组件挂载时
onMounted(() => {
  fetchStocks()
  loadAlerts()
  
  // 请求通知权限
  if ('Notification' in window) {
    Notification.requestPermission()
  }
  
  // 设置定时检查
  checkInterval = window.setInterval(checkAlerts, 10000) // 每10秒检查一次
})

// 组件卸载时
onUnmounted(() => {
  if (checkInterval !== null) {
    clearInterval(checkInterval)
  }
})
</script>

<template>
  <div class="alerts-view">
    <div class="page-header">
      <h1>条件提醒</h1>
      <p class="subtitle">设置价格、成交量等条件的提醒，及时把握市场机会</p>
    </div>
    
    <div class="alerts-container">
      <div class="alerts-sidebar">
        <div class="panel">
          <h2>添加新提醒</h2>
          
          <div class="form-group">
            <label for="stock-select">选择股票</label>
            <select id="stock-select" v-model="newAlert.symbol" class="form-control">
              <option value="">请选择股票</option>
              <option v-for="stock in stocks" :key="stock.symbol" :value="stock.symbol">
                {{ stock.name }} ({{ stock.symbol }})
              </option>
            </select>
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
              >
              <span class="input-group-text">
                {{ conditions.find(c => c.id === newAlert.condition)?.unit }}
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
            >
          </div>
          
          <div class="form-actions">
            <button 
              class="btn btn-primary" 
              @click="addAlert"
            >
              添加提醒
            </button>
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
          <h3>我的提醒 ({{ alerts.length }})</h3>
          
          <div class="alert-card" v-for="alert in alerts" :key="alert.id">
            <div class="alert-header">
              <div class="alert-title">{{ alert.stockName || alert.symbol }}</div>
              <div class="alert-actions">
                <button 
                  class="btn-icon" 
                  :class="{ 'active': alert.active }"
                  @click="toggleAlertStatus(alert.id)"
                  :title="alert.active ? '停用' : '启用'"
                >
                  <span v-if="alert.active">🔔</span>
                  <span v-else>🔕</span>
                </button>
                <button 
                  class="btn-icon delete" 
                  @click="deleteAlert(alert.id)"
                  title="删除"
                >
                  ❌
                </button>
              </div>
            </div>
            
            <div class="alert-condition">
              {{ alert.conditionName }} {{ alert.value }}{{ alert.unit }}
            </div>
            
            <div class="alert-message">
              {{ alert.message }}
            </div>
            
            <div class="alert-footer">
              <div class="alert-status" :class="{ 'active': alert.active }">
                {{ alert.active ? '已启用' : '已停用' }}
              </div>
              <div class="alert-date">
                创建于 {{ alert.createdAt }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alerts-view {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.page-header {
  margin-bottom: var(--spacing-lg);
}

.page-header h1 {
  font-size: var(--font-size-xl);
  color: var(--primary-color);
  margin-bottom: var(--spacing-xs);
}

.subtitle {
  color: var(--text-secondary);
  font-size: var(--font-size-md);
}

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
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

.alerts-list h3 {
  font-size: var(--font-size-lg);
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
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
