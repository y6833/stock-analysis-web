<template>
  <div class="stop-loss-manager">
    <div class="manager-header">
      <h3>止损止盈管理</h3>
      <p class="subtitle">智能止损策略与分批止盈机制</p>
    </div>

    <div class="manager-content">
      <!-- 当前持仓状态 -->
      <div class="positions-section">
        <h4>当前持仓</h4>
        <div class="positions-table">
          <table>
            <thead>
              <tr>
                <th>股票代码</th>
                <th>数量</th>
                <th>成本价</th>
                <th>现价</th>
                <th>盈亏</th>
                <th>盈亏率</th>
                <th>止损状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="position in positions" :key="position.symbol">
                <td class="symbol">{{ position.symbol }}</td>
                <td>{{ position.quantity.toLocaleString() }}</td>
                <td>{{ position.averagePrice.toFixed(2) }}</td>
                <td>{{ position.currentPrice.toFixed(2) }}</td>
                <td :class="getPnLClass(position.unrealizedPnL)">
                  {{ formatCurrency(position.unrealizedPnL) }}
                </td>
                <td :class="getPnLClass(position.unrealizedPnL)">
                  {{ (position.unrealizedPnLPercent * 100).toFixed(2) }}%
                </td>
                <td>
                  <span class="status-badge" :class="getStopLossStatus(position.symbol)">
                    {{ getStopLossStatusText(position.symbol) }}
                  </span>
                </td>
                <td>
                  <button 
                    class="btn btn-small btn-primary"
                    @click="openStopLossDialog(position)"
                  >
                    设置
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 止损止盈配置 -->
      <div v-if="selectedPosition" class="config-section">
        <h4>{{ selectedPosition.symbol }} 止损止盈设置</h4>
        
        <div class="config-tabs">
          <button 
            class="tab-btn"
            :class="{ active: activeTab === 'stop-loss' }"
            @click="activeTab = 'stop-loss'"
          >
            止损设置
          </button>
          <button 
            class="tab-btn"
            :class="{ active: activeTab === 'take-profit' }"
            @click="activeTab = 'take-profit'"
          >
            止盈设置
          </button>
        </div>

        <!-- 止损配置 -->
        <div v-show="activeTab === 'stop-loss'" class="config-panel">
          <div class="config-row">
            <label class="config-label">
              <input 
                type="checkbox" 
                v-model="stopLossConfig.isEnabled"
              />
              启用止损
            </label>
          </div>

          <div v-if="stopLossConfig.isEnabled" class="config-details">
            <div class="config-row">
              <label>止损类型</label>
              <select v-model="stopLossConfig.type" class="form-control">
                <option value="fixed">固定止损</option>
                <option value="trailing">移动止损</option>
                <option value="atr">ATR止损</option>
                <option value="volatility">波动率止损</option>
                <option value="time">时间止损</option>
              </select>
            </div>

            <div v-if="stopLossConfig.type === 'fixed'" class="config-row">
              <label>止损比例 (%)</label>
              <input 
                type="number" 
                v-model.number="stopLossConfig.percentage" 
                class="form-control"
                step="0.1"
                min="1"
                max="50"
              />
              <small class="hint">
                止损价: {{ calculateStopPrice().toFixed(2) }} 元
              </small>
            </div>

            <div v-if="stopLossConfig.type === 'trailing'" class="config-row">
              <label>移动距离 (%)</label>
              <input 
                type="number" 
                v-model.number="stopLossConfig.trailingDistance" 
                class="form-control"
                step="0.1"
                min="1"
                max="20"
              />
              <small class="hint">
                当前止损价: {{ calculateTrailingStopPrice().toFixed(2) }} 元
              </small>
            </div>

            <div v-if="stopLossConfig.type === 'atr'" class="config-row">
              <label>ATR倍数</label>
              <input 
                type="number" 
                v-model.number="stopLossConfig.atrMultiplier" 
                class="form-control"
                step="0.1"
                min="0.5"
                max="5"
              />
              <small class="hint">
                ATR值: {{ selectedPosition.atr.toFixed(3) }}
              </small>
            </div>

            <div v-if="stopLossConfig.type === 'time'" class="config-row">
              <label>时间限制 (天)</label>
              <input 
                type="number" 
                v-model.number="stopLossConfig.timeLimit" 
                class="form-control"
                min="1"
                max="365"
              />
              <small class="hint">
                持仓天数: {{ getHoldingDays(selectedPosition.entryTime) }} 天
              </small>
            </div>
          </div>
        </div>

        <!-- 止盈配置 -->
        <div v-show="activeTab === 'take-profit'" class="config-panel">
          <div class="config-row">
            <label class="config-label">
              <input 
                type="checkbox" 
                v-model="takeProfitConfig.isEnabled"
              />
              启用止盈
            </label>
          </div>

          <div v-if="takeProfitConfig.isEnabled" class="config-details">
            <div class="config-row">
              <label>止盈类型</label>
              <select v-model="takeProfitConfig.type" class="form-control">
                <option value="fixed">固定止盈</option>
                <option value="ladder">阶梯止盈</option>
                <option value="trailing">移动止盈</option>
                <option value="dynamic">动态止盈</option>
              </select>
            </div>

            <!-- 阶梯止盈配置 -->
            <div v-if="takeProfitConfig.type === 'ladder'" class="ladder-config">
              <div class="ladder-header">
                <label>止盈层级</label>
                <button class="btn btn-small" @click="addTakeProfitLevel">
                  添加层级
                </button>
              </div>
              
              <div class="ladder-levels">
                <div 
                  v-for="(level, index) in takeProfitConfig.levels" 
                  :key="index"
                  class="level-row"
                >
                  <input 
                    type="number" 
                    v-model.number="level.percentage" 
                    placeholder="盈利%"
                    class="level-input"
                    step="1"
                    min="1"
                  />
                  <input 
                    type="number" 
                    v-model.number="level.sellRatio" 
                    placeholder="卖出%"
                    class="level-input"
                    step="0.1"
                    min="0.1"
                    max="1"
                  />
                  <button 
                    class="btn btn-small btn-danger"
                    @click="removeTakeProfitLevel(index)"
                    :disabled="takeProfitConfig.levels.length <= 1"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>

            <!-- 移动止盈配置 -->
            <div v-if="takeProfitConfig.type === 'trailing'" class="trailing-config">
              <div class="config-row">
                <label>激活点 (%)</label>
                <input 
                  type="number" 
                  v-model.number="takeProfitConfig.trailingActivation" 
                  class="form-control"
                  step="1"
                  min="5"
                />
              </div>
              <div class="config-row">
                <label>移动距离 (%)</label>
                <input 
                  type="number" 
                  v-model.number="takeProfitConfig.trailingDistance" 
                  class="form-control"
                  step="0.1"
                  min="1"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="config-actions">
          <button 
            class="btn btn-primary"
            @click="applyStopLossConfig"
            :disabled="isApplying"
          >
            <span v-if="isApplying" class="loading-spinner"></span>
            {{ isApplying ? '应用中...' : '应用设置' }}
          </button>
          
          <button 
            class="btn btn-secondary"
            @click="previewStopLoss"
          >
            预览效果
          </button>
          
          <button 
            class="btn btn-outline"
            @click="resetConfig"
          >
            重置
          </button>
          
          <button 
            class="btn btn-outline"
            @click="closeDialog"
          >
            取消
          </button>
        </div>
      </div>

      <!-- 止损订单列表 -->
      <div class="orders-section">
        <h4>止损订单</h4>
        <div class="orders-summary">
          <div class="summary-item">
            <span class="summary-label">总订单:</span>
            <span class="summary-value">{{ statistics.totalOrders }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">待执行:</span>
            <span class="summary-value pending">{{ statistics.pendingOrders }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">已执行:</span>
            <span class="summary-value executed">{{ statistics.executedOrders }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">成功率:</span>
            <span class="summary-value">{{ (statistics.successRate * 100).toFixed(1) }}%</span>
          </div>
        </div>

        <div class="orders-table">
          <table>
            <thead>
              <tr>
                <th>股票</th>
                <th>类型</th>
                <th>触发价</th>
                <th>数量</th>
                <th>状态</th>
                <th>原因</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in stopLossOrders" :key="order.id">
                <td>{{ order.symbol }}</td>
                <td>
                  <span class="order-type" :class="order.type">
                    {{ getOrderTypeText(order.type) }}
                  </span>
                </td>
                <td>{{ order.triggerPrice.toFixed(2) }}</td>
                <td>{{ order.quantity.toLocaleString() }}</td>
                <td>
                  <span class="order-status" :class="order.status">
                    {{ getOrderStatusText(order.status) }}
                  </span>
                </td>
                <td>{{ order.reason }}</td>
                <td>{{ formatDateTime(order.createdAt) }}</td>
                <td>
                  <button 
                    v-if="order.status === 'pending'"
                    class="btn btn-small btn-danger"
                    @click="cancelOrder(order.id)"
                  >
                    取消
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { 
  StopLossManager,
  type Position,
  type StopLossConfig,
  type TakeProfitConfig,
  type StopLossOrder,
  type TakeProfitLevel
} from '@/services/risk/StopLossManager'
import { useToast } from '@/composables/useToast'

const { showToast } = useToast()

// 止损管理器实例
const stopLossManager = new StopLossManager()

// 状态
const activeTab = ref('stop-loss')
const selectedPosition = ref<Position | null>(null)
const isApplying = ref(false)

// 示例持仓数据
const positions = ref<Position[]>([
  {
    symbol: '000001',
    quantity: 10000,
    averagePrice: 12.5,
    currentPrice: 13.2,
    entryTime: '2024-01-15T09:30:00Z',
    unrealizedPnL: 7000,
    unrealizedPnLPercent: 0.056,
    highestPrice: 13.8,
    lowestPrice: 12.1,
    atr: 0.35,
    volatility: 0.25
  },
  {
    symbol: '600036',
    quantity: 5000,
    averagePrice: 35.8,
    currentPrice: 38.5,
    entryTime: '2024-01-10T09:30:00Z',
    unrealizedPnL: 13500,
    unrealizedPnLPercent: 0.075,
    highestPrice: 39.2,
    lowestPrice: 34.5,
    atr: 0.85,
    volatility: 0.22
  }
])

// 止损配置
const stopLossConfig = reactive<StopLossConfig>({
  type: 'fixed',
  percentage: 0.1,
  trailingDistance: 0.05,
  atrMultiplier: 2.0,
  volatilityMultiplier: 1.5,
  timeLimit: 30,
  isEnabled: false
})

// 止盈配置
const takeProfitConfig = reactive<TakeProfitConfig>({
  type: 'ladder',
  levels: [
    { percentage: 0.1, sellRatio: 0.3, isExecuted: false },
    { percentage: 0.2, sellRatio: 0.5, isExecuted: false }
  ],
  trailingActivation: 0.15,
  trailingDistance: 0.05,
  isEnabled: false
})

// 止损订单
const stopLossOrders = ref<StopLossOrder[]>([])

// 统计信息
const statistics = computed(() => stopLossManager.getStatistics())

// 初始化
onMounted(() => {
  loadStopLossOrders()
})

// 打开止损设置对话框
const openStopLossDialog = (position: Position) => {
  selectedPosition.value = position
  // 重置配置为默认值
  resetConfig()
}

// 关闭对话框
const closeDialog = () => {
  selectedPosition.value = null
}

// 计算固定止损价格
const calculateStopPrice = () => {
  if (!selectedPosition.value) return 0
  return selectedPosition.value.averagePrice * (1 - stopLossConfig.percentage)
}

// 计算移动止损价格
const calculateTrailingStopPrice = () => {
  if (!selectedPosition.value) return 0
  return selectedPosition.value.highestPrice * (1 - stopLossConfig.trailingDistance)
}

// 获取持仓天数
const getHoldingDays = (entryTime: string) => {
  const entry = new Date(entryTime)
  const now = new Date()
  return Math.floor((now.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24))
}

// 添加止盈层级
const addTakeProfitLevel = () => {
  takeProfitConfig.levels.push({
    percentage: 0.15,
    sellRatio: 0.3,
    isExecuted: false
  })
}

// 删除止盈层级
const removeTakeProfitLevel = (index: number) => {
  if (takeProfitConfig.levels.length > 1) {
    takeProfitConfig.levels.splice(index, 1)
  }
}

// 应用止损配置
const applyStopLossConfig = async () => {
  if (!selectedPosition.value) return

  isApplying.value = true
  
  try {
    // 计算止损止盈信号
    const signals = stopLossManager.calculateStopLossSignals(
      selectedPosition.value,
      stopLossConfig,
      takeProfitConfig
    )

    // 创建止损订单
    signals.forEach(signal => {
      if (signal.action === 'stop_loss' || signal.action === 'take_profit') {
        stopLossManager.createStopLossOrder(
          signal.symbol,
          signal.action,
          signal.triggerPrice,
          signal.quantity,
          signal.reason
        )
      }
    })

    loadStopLossOrders()
    showToast('止损止盈设置已应用', 'success')
    closeDialog()
    
  } catch (error: any) {
    showToast('应用设置失败: ' + error.message, 'error')
  } finally {
    isApplying.value = false
  }
}

// 预览止损效果
const previewStopLoss = () => {
  if (!selectedPosition.value) return

  const signals = stopLossManager.calculateStopLossSignals(
    selectedPosition.value,
    stopLossConfig,
    takeProfitConfig
  )

  if (signals.length > 0) {
    const preview = signals.map(s => 
      `${s.action === 'stop_loss' ? '止损' : '止盈'}: ${s.triggerPrice.toFixed(2)}元 (${s.reason})`
    ).join('\n')
    
    showToast(`预览效果:\n${preview}`, 'info')
  } else {
    showToast('当前配置不会触发任何止损止盈', 'info')
  }
}

// 重置配置
const resetConfig = () => {
  stopLossConfig.type = 'fixed'
  stopLossConfig.percentage = 0.1
  stopLossConfig.isEnabled = false
  
  takeProfitConfig.type = 'ladder'
  takeProfitConfig.levels = [
    { percentage: 0.1, sellRatio: 0.3, isExecuted: false },
    { percentage: 0.2, sellRatio: 0.5, isExecuted: false }
  ]
  takeProfitConfig.isEnabled = false
}

// 加载止损订单
const loadStopLossOrders = () => {
  stopLossOrders.value = stopLossManager.getStopLossOrders()
}

// 取消订单
const cancelOrder = (orderId: string) => {
  if (stopLossManager.cancelStopLossOrder(orderId)) {
    loadStopLossOrders()
    showToast('订单已取消', 'success')
  } else {
    showToast('取消订单失败', 'error')
  }
}

// 工具函数
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const getPnLClass = (pnl: number) => {
  return pnl >= 0 ? 'positive' : 'negative'
}

const getStopLossStatus = (symbol: string) => {
  const orders = stopLossManager.getStopLossOrders(symbol)
  const pendingOrders = orders.filter(o => o.status === 'pending')
  return pendingOrders.length > 0 ? 'active' : 'inactive'
}

const getStopLossStatusText = (symbol: string) => {
  const status = getStopLossStatus(symbol)
  return status === 'active' ? '已设置' : '未设置'
}

const getOrderTypeText = (type: string) => {
  return type === 'stop_loss' ? '止损' : '止盈'
}

const getOrderStatusText = (status: string) => {
  const statusMap = {
    pending: '待执行',
    triggered: '已触发',
    executed: '已执行',
    cancelled: '已取消'
  }
  return statusMap[status as keyof typeof statusMap] || status
}
</script>

<style scoped>
.stop-loss-manager {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.manager-header {
  text-align: center;
  margin-bottom: 30px;
}

.manager-header h3 {
  color: #1890ff;
  margin-bottom: 10px;
}

.subtitle {
  color: #666;
  font-size: 14px;
}

.manager-content {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.positions-section,
.config-section,
.orders-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.positions-section h4,
.config-section h4,
.orders-section h4 {
  color: #333;
  margin-bottom: 20px;
}

.positions-table,
.orders-table {
  overflow-x: auto;
}

.positions-table table,
.orders-table table {
  width: 100%;
  border-collapse: collapse;
}

.positions-table th,
.positions-table td,
.orders-table th,
.orders-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e8e8e8;
}

.positions-table th,
.orders-table th {
  background: #fafafa;
  font-weight: 600;
}

.symbol {
  font-weight: bold;
  color: #1890ff;
}

.positive { color: #52c41a; }
.negative { color: #ff4d4f; }

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.status-badge.active {
  background: #f6ffed;
  color: #52c41a;
}

.status-badge.inactive {
  background: #fff2f0;
  color: #ff4d4f;
}

.config-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.tab-btn {
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
}

.tab-btn.active {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.config-panel {
  background: #fafafa;
  border-radius: 6px;
  padding: 20px;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.config-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #333;
}

.form-control {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  min-width: 120px;
}

.hint {
  color: #999;
  font-size: 12px;
  margin-left: 10px;
}

.ladder-config {
  margin-top: 15px;
}

.ladder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.level-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.level-input {
  width: 100px;
  padding: 6px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
}

.config-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e8e8e8;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #1890ff;
  color: white;
}

.btn-secondary {
  background: #52c41a;
  color: white;
}

.btn-outline {
  background: white;
  color: #1890ff;
  border: 1px solid #1890ff;
}

.btn-danger {
  background: #ff4d4f;
  color: white;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.orders-summary {
  display: flex;
  gap: 30px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f0f9ff;
  border-radius: 6px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.summary-label {
  font-size: 12px;
  color: #666;
}

.summary-value {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.summary-value.pending { color: #faad14; }
.summary-value.executed { color: #52c41a; }

.order-type {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: bold;
}

.order-type.stop_loss {
  background: #fff2f0;
  color: #ff4d4f;
}

.order-type.take_profit {
  background: #f6ffed;
  color: #52c41a;
}

.order-status {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: bold;
}

.order-status.pending {
  background: #fffbe6;
  color: #faad14;
}

.order-status.executed {
  background: #f6ffed;
  color: #52c41a;
}

.order-status.cancelled {
  background: #f5f5f5;
  color: #999;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .config-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .config-actions {
    flex-direction: column;
  }
  
  .orders-summary {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
