<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive } from 'vue'

defineOptions({
  name: 'AbnormalMovementMonitor',
})
import { stockService } from '@/services/stockService'
import { useRouter } from 'vue-router'
import type { Stock } from '@/types/stock'

const router = useRouter()

// 异动类型
const abnormalTypes = [
  { id: 'volume_surge', name: '成交量暴增', description: '成交量较前一日增加超过100%' },
  { id: 'price_surge', name: '价格暴涨', description: '价格较前一日上涨超过5%' },
  { id: 'price_plunge', name: '价格暴跌', description: '价格较前一日下跌超过5%' },
  { id: 'break_ma20', name: '突破20日均线', description: '价格突破20日均线' },
  { id: 'break_ma60', name: '突破60日均线', description: '价格突破60日均线' },
  { id: 'unusual_turnover', name: '异常换手率', description: '换手率超过行业平均水平的2倍' },
]

// 选中的异动类型
const selectedTypes = reactive({
  volume_surge: true,
  price_surge: true,
  price_plunge: true,
  break_ma20: false,
  break_ma60: false,
  unusual_turnover: false,
})

// 异动股票列表
const abnormalStocks = ref<any[]>([])
const isLoading = ref(false)
const error = ref('')
const autoRefreshEnabled = ref(false)
const refreshInterval = ref<number | null>(null)
const lastUpdateTime = ref(new Date())

// 监控设置
const monitorSettings = reactive({
  refreshInterval: 5, // 分钟
  notificationEnabled: true,
  soundEnabled: false,
})

// 开始监控
const startMonitoring = () => {
  if (autoRefreshEnabled.value) return

  autoRefreshEnabled.value = true
  refreshAbnormalStocks()

  // 设置定时刷新
  refreshInterval.value = window.setInterval(() => {
    refreshAbnormalStocks()
  }, monitorSettings.refreshInterval * 60 * 1000)

  // 显示提示
  if (window.$message) {
    window.$message.success(`已开始监控，将每${monitorSettings.refreshInterval}分钟自动刷新`)
  }
}

// 停止监控
const stopMonitoring = () => {
  if (!autoRefreshEnabled.value) return

  autoRefreshEnabled.value = false

  // 清除定时器
  if (refreshInterval.value !== null) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }

  // 显示提示
  if (window.$message) {
    window.$message.info('已停止监控')
  }
}

// 刷新异动股票列表
const refreshAbnormalStocks = async () => {
  if (isLoading.value) return

  isLoading.value = true
  error.value = ''

  try {
    // 获取所有股票
    const stocks = await stockService.getStocks()

    // 模拟异动检测
    const abnormal: any[] = []

    // 随机选择一些股票作为异动股票
    const stockCount = Math.floor(Math.random() * 10) + 5 // 5-15只股票
    const selectedStocks = [...stocks].sort(() => Math.random() - 0.5).slice(0, stockCount)

    for (const stock of selectedStocks) {
      // 随机生成异动类型
      const abnormalType = abnormalTypes[Math.floor(Math.random() * abnormalTypes.length)]

      // 随机生成异动数据
      const changePercent = (Math.random() * 10 - 5).toFixed(2)
      const volumeChange = (Math.random() * 200).toFixed(2)
      const price = (Math.random() * 50 + 10).toFixed(2)

      // 检查是否符合选中的异动类型
      if (selectedTypes[abnormalType.id as keyof typeof selectedTypes]) {
        abnormal.push({
          ...stock,
          abnormalType: abnormalType.name,
          abnormalDescription: abnormalType.description,
          changePercent: `${changePercent}%`,
          volumeChange: `${volumeChange}%`,
          price,
          time: new Date().toLocaleTimeString(),
          severity: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
        })
      }
    }

    // 更新异动股票列表
    abnormalStocks.value = abnormal
    lastUpdateTime.value = new Date()

    // 如果启用了通知，显示通知
    if (monitorSettings.notificationEnabled && abnormal.length > 0) {
      showNotification(abnormal.length)
    }
  } catch (err: any) {
    console.error('获取异动股票失败:', err)
    error.value = `获取异动股票失败: ${err.message || '未知错误'}`

    // 显示错误提示
    if (window.$message) {
      window.$message.error(`获取异动股票失败: ${err.message || '未知错误'}`)
    }
  } finally {
    isLoading.value = false
  }
}

// 显示通知
const showNotification = (count: number) => {
  // 显示提示
  if (window.$message) {
    window.$message.info(`发现 ${count} 只异动股票`)
  }

  // 如果启用了声音，播放提示音
  if (monitorSettings.soundEnabled) {
    playAlertSound()
  }
}

// 播放提示音
const playAlertSound = () => {
  try {
    const audio = new Audio('/alert.mp3')
    audio.play()
  } catch (err) {
    console.error('播放提示音失败:', err)
  }
}

// 跳转到股票分析页面
const goToStockAnalysis = (symbol: string) => {
  router.push({
    path: '/stock',
    query: { symbol },
  })
}

// 组件挂载时
onMounted(() => {
  refreshAbnormalStocks()
})

// 组件卸载时
onUnmounted(() => {
  // 清除定时器
  if (refreshInterval.value !== null) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
})
</script>

<template>
  <div class="abnormal-monitor">
    <div class="monitor-header">
      <h2>异动监控</h2>
      <div class="monitor-actions">
        <button
          class="btn"
          :class="{ 'btn-primary': !autoRefreshEnabled, 'btn-danger': autoRefreshEnabled }"
          @click="autoRefreshEnabled ? stopMonitoring() : startMonitoring()"
        >
          {{ autoRefreshEnabled ? '停止监控' : '开始监控' }}
        </button>
        <button class="btn btn-outline" @click="refreshAbnormalStocks" :disabled="isLoading">
          <span v-if="isLoading" class="loading-spinner small"></span>
          刷新
        </button>
      </div>
    </div>

    <div class="monitor-settings">
      <div class="settings-group">
        <h3>监控设置</h3>
        <div class="settings-row">
          <label for="refreshInterval">刷新间隔 (分钟):</label>
          <input
            type="number"
            id="refreshInterval"
            v-model="monitorSettings.refreshInterval"
            min="1"
            max="60"
            :disabled="autoRefreshEnabled"
          />
        </div>
        <div class="settings-row">
          <label for="notificationEnabled">启用通知:</label>
          <input
            type="checkbox"
            id="notificationEnabled"
            v-model="monitorSettings.notificationEnabled"
          />
        </div>
        <div class="settings-row">
          <label for="soundEnabled">启用声音提醒:</label>
          <input type="checkbox" id="soundEnabled" v-model="monitorSettings.soundEnabled" />
        </div>
      </div>

      <div class="settings-group">
        <h3>异动类型</h3>
        <div class="abnormal-types">
          <div v-for="type in abnormalTypes" :key="type.id" class="abnormal-type">
            <input
              type="checkbox"
              :id="type.id"
              v-model="selectedTypes[type.id as keyof typeof selectedTypes]"
            />
            <label :for="type.id" :title="type.description">{{ type.name }}</label>
          </div>
        </div>
      </div>
    </div>

    <div class="monitor-content">
      <div v-if="isLoading && abnormalStocks.length === 0" class="loading-state">
        <div class="loading-spinner"></div>
        <p>正在获取异动股票...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
        <button class="btn btn-primary" @click="refreshAbnormalStocks">重试</button>
      </div>

      <div v-else-if="abnormalStocks.length === 0" class="empty-state">
        <p>暂未发现异动股票</p>
        <p class="hint">选择异动类型并点击"开始监控"来监控市场异动</p>
      </div>

      <div v-else class="abnormal-list">
        <div class="list-header">
          <p>最后更新: {{ lastUpdateTime.toLocaleString() }}</p>
          <p>共发现 {{ abnormalStocks.length }} 只异动股票</p>
        </div>

        <div class="abnormal-table">
          <table>
            <thead>
              <tr>
                <th>代码</th>
                <th>名称</th>
                <th>异动类型</th>
                <th>价格</th>
                <th>涨跌幅</th>
                <th>成交量变化</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="stock in abnormalStocks"
                :key="stock.symbol"
                :class="{
                  'severity-high': stock.severity === 'high',
                  'severity-medium': stock.severity === 'medium',
                  'severity-low': stock.severity === 'low',
                }"
              >
                <td>{{ stock.symbol }}</td>
                <td>{{ stock.name }}</td>
                <td>{{ stock.abnormalType }}</td>
                <td>{{ stock.price }}</td>
                <td
                  :class="{
                    positive: parseFloat(stock.changePercent) > 0,
                    negative: parseFloat(stock.changePercent) < 0,
                  }"
                >
                  {{ stock.changePercent }}
                </td>
                <td>{{ stock.volumeChange }}</td>
                <td>{{ stock.time }}</td>
                <td>
                  <button class="btn-small btn-primary" @click="goToStockAnalysis(stock.symbol)">
                    分析
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

<style scoped>
.abnormal-monitor {
  width: 100%;
  margin-bottom: var(--spacing-xl);
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.monitor-header h2 {
  margin: 0;
  color: var(--primary-color);
  font-size: var(--font-size-lg);
}

.monitor-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.monitor-settings {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
}

.settings-group h3 {
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
  font-size: var(--font-size-md);
  font-weight: 600;
}

.settings-row {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.settings-row label {
  flex: 1;
  margin-right: var(--spacing-md);
  color: var(--text-secondary);
}

.settings-row input[type='number'] {
  width: 60px;
  padding: var(--spacing-xs);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background-color: var(--bg-primary);
}

.abnormal-types {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--spacing-sm);
}

.abnormal-type {
  display: flex;
  align-items: center;
}

.abnormal-type input[type='checkbox'] {
  margin-right: var(--spacing-xs);
}

.abnormal-type label {
  color: var(--text-secondary);
  cursor: pointer;
}

.monitor-content {
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

.loading-spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
  margin: 0;
  margin-right: var(--spacing-xs);
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

.empty-state .hint {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-sm);
}

.list-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.abnormal-table {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: var(--spacing-sm);
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}

th {
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  font-weight: 600;
  position: sticky;
  top: 0;
}

tr:hover {
  background-color: var(--bg-secondary);
}

.severity-high {
  background-color: rgba(231, 76, 60, 0.1);
}

.severity-medium {
  background-color: rgba(241, 196, 15, 0.1);
}

.severity-low {
  background-color: rgba(46, 204, 113, 0.1);
}

.positive {
  color: var(--success-color);
}

.negative {
  color: var(--error-color);
}

.btn-small {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
  border-radius: var(--border-radius-sm);
}

.btn-danger {
  background-color: var(--error-color);
  color: white;
}

.btn-danger:hover {
  background-color: var(--error-dark);
}

@media (max-width: 768px) {
  .monitor-settings {
    grid-template-columns: 1fr;
  }

  .abnormal-table {
    font-size: var(--font-size-sm);
  }
}
</style>
