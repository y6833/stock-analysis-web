<template>
  <div class="technical-signals">
    <!-- 信号面板 -->
    <div class="signals-panel">
      <div class="panel-header">
        <h3>📊 技术信号面板</h3>
        <div class="signal-stats">
          <span class="buy-signals">买入: {{ buySignalsCount }}</span>
          <span class="sell-signals">卖出: {{ sellSignalsCount }}</span>
        </div>
      </div>

      <!-- 实时信号列表 -->
      <div class="signals-list">
        <div
          v-for="signal in recentSignals"
          :key="signal.id"
          :class="['signal-item', signal.type]"
          @click="showSignalDetails(signal)"
        >
          <div class="signal-icon">
            {{ getSignalIcon(signal.signal) }}
          </div>
          <div class="signal-info">
            <div class="signal-name">{{ signal.signal }}</div>
            <div class="signal-desc">{{ getSignalDescription(signal.signal) }}</div>
          </div>
          <div class="signal-price">¥{{ signal.price.toFixed(2) }}</div>
          <div class="signal-time">
            {{ formatTime(signal.timestamp) }}
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="recentSignals.length === 0" class="empty-signals">
          <p>🔍 暂无信号数据</p>
          <p>正在分析技术指标...</p>
        </div>
      </div>
    </div>

    <!-- 指标图表 -->
    <div class="indicators-chart" ref="chartContainer">
      <!-- 这里集成 ECharts 显示技术指标 -->
    </div>

    <!-- 信号配置 -->
    <div class="signal-config">
      <h4>🔧 信号配置</h4>
      <div class="config-options">
        <label>
          <input type="checkbox" v-model="enabledSignals.d2" @change="updateSignalConfig" />
          D2买入信号
        </label>
        <label>
          <input type="checkbox" v-model="enabledSignals.hunting" @change="updateSignalConfig" />
          猎庄信号
        </label>
        <label>
          <input type="checkbox" v-model="enabledSignals.reversal" @change="updateSignalConfig" />
          反转信号
        </label>
        <label>
          <input type="checkbox" v-model="enabledSignals.sell" @change="updateSignalConfig" />
          卖出信号
        </label>
      </div>
    </div>

    <!-- 信号详情弹窗 -->
    <el-dialog
      v-model="showSignalDetail"
      :title="`${selectedSignal?.signal} 信号详情`"
      width="500px"
      :before-close="() => (showSignalDetail = false)"
    >
      <div class="signal-detail">
        <div class="detail-content">
          <div class="detail-item">
            <label>信号类型:</label>
            <el-tag :type="selectedSignal?.type === 'buy' ? 'success' : 'danger'" size="small">
              {{ selectedSignal?.type === 'buy' ? '买入' : '卖出' }}
            </el-tag>
          </div>
          <div class="detail-item">
            <label>触发价格:</label>
            <span class="price-value">¥{{ selectedSignal?.price?.toFixed(2) }}</span>
          </div>
          <div class="detail-item">
            <label>信号强度:</label>
            <div class="strength-container">
              <el-progress
                :percentage="selectedSignal?.strength || 50"
                :color="getStrengthColor(selectedSignal?.strength || 50)"
                :show-text="true"
                :format="(percentage) => `${percentage}%`"
              />
            </div>
          </div>
          <div class="detail-item">
            <label>置信度:</label>
            <span class="confidence-value">{{ selectedSignal?.confidence || 50 }}%</span>
          </div>
          <div class="detail-item">
            <label>建议操作:</label>
            <div class="suggestion">
              {{ getSignalSuggestion(selectedSignal) }}
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useToast } from '@/composables/useToast'
import * as echarts from 'echarts'

// Props
const props = defineProps({
  stockCode: {
    type: String,
    required: true,
  },
  klineData: {
    type: Object,
    default: () => ({}),
  },
})

// 响应式数据
const chartContainer = ref(null)
const chart = ref(null)
const showSignalDetail = ref(false)
const selectedSignal = ref(null)

const recentSignals = ref([])
const enabledSignals = reactive({
  d2: true,
  hunting: true,
  reversal: true,
  sell: true,
})

const { showToast } = useToast()

// 计算属性
const buySignalsCount = computed(() => {
  if (!Array.isArray(recentSignals.value)) return 0
  return recentSignals.value.filter((s) => s.type === 'buy').length
})

const sellSignalsCount = computed(() => {
  if (!Array.isArray(recentSignals.value)) return 0
  return recentSignals.value.filter((s) => s.type === 'sell').length
})

// 方法
const getSignalIcon = (signal) => {
  const icons = {
    D2: '🟢',
    猎庄: '🎯',
    反转: '🔄',
    '抛↓': '🔴',
    D: '📍',
    D1: '📌',
  }
  return icons[signal] || '📊'
}

const getSignalDescription = (signal) => {
  const descriptions = {
    D2: '短期回调后的买入机会',
    猎庄: '主力建仓信号',
    反转: '强势反转买点',
    '抛↓': '技术指标超买，建议减仓',
    D: '趋势转折买点',
    D1: '拐点买入信号',
  }
  return descriptions[signal] || '技术信号'
}

const getSignalSuggestion = (signal) => {
  if (!signal) return ''

  if (signal.type === 'buy') {
    return `建议在 ¥${signal.price.toFixed(2)} 附近分批买入，设置止损位 ¥${(
      signal.price * 0.95
    ).toFixed(2)}`
  } else {
    return `建议在 ¥${signal.price.toFixed(2)} 附近减仓，注意风险控制`
  }
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString()
}

const updateSignalConfig = () => {
  // 更新信号配置
  calculateTechnicalSignals()
}

const showSignalDetails = (signal) => {
  selectedSignal.value = signal
  showSignalDetail.value = true
}

const getStrengthColor = (strength) => {
  if (strength >= 80) return '#67c23a' // 绿色 - 强
  if (strength >= 60) return '#e6a23c' // 橙色 - 中等
  if (strength >= 40) return '#f56c6c' // 红色 - 弱
  return '#909399' // 灰色 - 很弱
}

// 生成模拟信号数据
const generateMockSignals = () => {
  const mockSignals = [
    {
      id: 'mock_d2_1',
      signal: 'D2',
      type: 'buy',
      price: 12.5,
      timestamp: Date.now() - 300000, // 5分钟前
      strength: 85,
      confidence: 78,
    },
    {
      id: 'mock_hunting_1',
      signal: '猎庄',
      type: 'buy',
      price: 12.45,
      timestamp: Date.now() - 600000, // 10分钟前
      strength: 92,
      confidence: 85,
    },
    {
      id: 'mock_reversal_1',
      signal: '反转',
      type: 'buy',
      price: 12.6,
      timestamp: Date.now() - 900000, // 15分钟前
      strength: 76,
      confidence: 72,
    },
    {
      id: 'mock_sell_1',
      signal: '抛↓',
      type: 'sell',
      price: 12.8,
      timestamp: Date.now() - 1200000, // 20分钟前
      strength: 68,
      confidence: 75,
    },
  ]

  recentSignals.value = mockSignals
  console.log('使用模拟信号数据:', mockSignals)
}

const calculateTechnicalSignals = async () => {
  try {
    const response = await fetch(`/api/technical-indicators/${props.stockCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        klineData: props.klineData,
        enabledSignals: enabledSignals,
      }),
    })

    const result = await response.json()
    if (result.success) {
      // 处理信号数据 - 将对象格式的信号转换为数组
      const signalsData = result.data.signals || {}
      const allSignals = []

      // 合并所有类型的信号到一个数组中
      Object.keys(signalsData).forEach((signalType) => {
        if (Array.isArray(signalsData[signalType])) {
          allSignals.push(...signalsData[signalType])
        }
      })

      // 为每个信号添加时间戳（如果没有的话）
      allSignals.forEach((signal, index) => {
        if (!signal.timestamp) {
          signal.timestamp = Date.now() - (allSignals.length - index) * 60000
        }
        if (!signal.id) {
          signal.id = `${signal.signal}_${signal.index || index}_${Date.now()}`
        }
      })

      recentSignals.value = allSignals
      updateChart(result.data)
    } else {
      console.warn('API 返回失败:', result.message)
      // 如果 API 失败，生成一些模拟信号用于演示
      generateMockSignals()
    }
  } catch (error) {
    console.error('计算技术指标失败:', error)
    showToast('计算技术指标失败，使用模拟数据', 'warning')
    // 生成模拟信号
    generateMockSignals()
  }
}

const updateChart = (data) => {
  if (!chart.value) return

  const option = {
    title: {
      text: '技术指标分析',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
    },
    legend: {
      data: ['MA5', 'MA10', 'MA30', 'MA60', '分水岭'],
      top: 30,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.dates || [],
    },
    yAxis: {
      type: 'value',
      scale: true,
    },
    series: [
      {
        name: 'MA5',
        type: 'line',
        data: data.movingAverages?.ma5 || [],
        lineStyle: { color: '#FFFF00' },
        symbol: 'none',
      },
      {
        name: 'MA10',
        type: 'line',
        data: data.movingAverages?.ma10 || [],
        lineStyle: { color: '#FFFFFF' },
        symbol: 'none',
      },
      {
        name: 'MA30',
        type: 'line',
        data: data.movingAverages?.ma30 || [],
        lineStyle: { color: '#FF0000' },
        symbol: 'none',
      },
      {
        name: 'MA60',
        type: 'line',
        data: data.movingAverages?.ma60 || [],
        lineStyle: { color: '#FF0000' },
        symbol: 'none',
      },
      {
        name: '分水岭',
        type: 'line',
        data: data.watershed || [],
        lineStyle: {
          color: '#FF00FF',
          width: 2,
        },
        symbol: 'none',
      },
    ],
  }

  chart.value.setOption(option)
}

const initChart = () => {
  if (chartContainer.value) {
    chart.value = echarts.init(chartContainer.value)
  }
}

// 生命周期
onMounted(() => {
  initChart()
  calculateTechnicalSignals()
})

// 监听数据变化
watch(
  () => props.klineData,
  () => {
    calculateTechnicalSignals()
  },
  { deep: true }
)
</script>

<style scoped>
.technical-signals {
  padding: 16px;
  background: #f8f9fa;
}

.signals-panel {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.signal-stats span {
  margin-left: 16px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.buy-signals {
  background: #e8f5e8;
  color: #52c41a;
}

.sell-signals {
  background: #fff2f0;
  color: #ff4d4f;
}

.signals-list {
  max-height: 300px;
  overflow-y: auto;
}

.empty-signals {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-signals p {
  margin: 8px 0;
}

.signal-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.signal-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.signal-item.buy {
  background: linear-gradient(135deg, #e8f5e8, #f0f9f0);
  border-left: 4px solid #52c41a;
}

.signal-item.sell {
  background: linear-gradient(135deg, #fff2f0, #fff7f6);
  border-left: 4px solid #ff4d4f;
}

.signal-icon {
  font-size: 24px;
  margin-right: 12px;
}

.signal-info {
  flex: 1;
}

.signal-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.signal-desc {
  font-size: 12px;
  color: #666;
}

.signal-price {
  font-weight: bold;
  color: #1890ff;
  margin-right: 12px;
}

.signal-time {
  font-size: 12px;
  color: #999;
}

.indicators-chart {
  height: 400px;
  background: white;
  border-radius: 8px;
  margin-bottom: 16px;
}

.signal-config {
  background: white;
  border-radius: 8px;
  padding: 16px;
}

.config-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.config-options label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.config-options input {
  margin-right: 8px;
}

.signal-detail {
  padding: 0;
}

.detail-content {
  padding: 0;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item label {
  font-weight: bold;
  color: #666;
  min-width: 80px;
}

.price-value {
  font-weight: bold;
  color: #1890ff;
  font-size: 16px;
}

.confidence-value {
  font-weight: bold;
  color: #52c41a;
}

.strength-container {
  flex: 1;
  margin-left: 16px;
  max-width: 200px;
}

.suggestion {
  background: #f6ffed;
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
  color: #52c41a;
  border: 1px solid #b7eb8f;
  line-height: 1.5;
  margin-left: 16px;
  flex: 1;
}
</style>
