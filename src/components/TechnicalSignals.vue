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
        >
          <div class="signal-icon">
            {{ getSignalIcon(signal.signal) }}
          </div>
          <div class="signal-info">
            <div class="signal-name">{{ signal.signal }}</div>
            <div class="signal-desc">{{ getSignalDescription(signal.signal) }}</div>
          </div>
          <div class="signal-price">
            ¥{{ signal.price.toFixed(2) }}
          </div>
          <div class="signal-time">
            {{ formatTime(signal.timestamp) }}
          </div>
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
          <input 
            type="checkbox" 
            v-model="enabledSignals.d2"
            @change="updateSignalConfig"
          >
          D2买入信号
        </label>
        <label>
          <input 
            type="checkbox" 
            v-model="enabledSignals.hunting"
            @change="updateSignalConfig"
          >
          猎庄信号
        </label>
        <label>
          <input 
            type="checkbox" 
            v-model="enabledSignals.reversal"
            @change="updateSignalConfig"
          >
          反转信号
        </label>
        <label>
          <input 
            type="checkbox" 
            v-model="enabledSignals.sell"
            @change="updateSignalConfig"
          >
          卖出信号
        </label>
      </div>
    </div>

    <!-- 信号详情弹窗 -->
    <van-popup 
      v-model:show="showSignalDetail" 
      position="bottom" 
      :style="{ height: '60%' }"
    >
      <div class="signal-detail">
        <div class="detail-header">
          <h3>{{ selectedSignal?.signal }} 信号详情</h3>
          <van-icon name="cross" @click="showSignalDetail = false" />
        </div>
        <div class="detail-content">
          <div class="detail-item">
            <label>信号类型:</label>
            <span :class="selectedSignal?.type">{{ selectedSignal?.type === 'buy' ? '买入' : '卖出' }}</span>
          </div>
          <div class="detail-item">
            <label>触发价格:</label>
            <span>¥{{ selectedSignal?.price?.toFixed(2) }}</span>
          </div>
          <div class="detail-item">
            <label>信号强度:</label>
            <div class="strength-bar">
              <div 
                class="strength-fill" 
                :style="{ width: (selectedSignal?.strength || 50) + '%' }"
              ></div>
            </div>
          </div>
          <div class="detail-item">
            <label>建议操作:</label>
            <div class="suggestion">
              {{ getSignalSuggestion(selectedSignal) }}
            </div>
          </div>
        </div>
      </div>
    </van-popup>
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
    required: true
  },
  klineData: {
    type: Object,
    default: () => ({})
  }
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
  sell: true
})

const { showToast } = useToast()

// 计算属性
const buySignalsCount = computed(() => 
  recentSignals.value.filter(s => s.type === 'buy').length
)

const sellSignalsCount = computed(() => 
  recentSignals.value.filter(s => s.type === 'sell').length
)

// 方法
const getSignalIcon = (signal) => {
  const icons = {
    'D2': '🟢',
    '猎庄': '🎯',
    '反转': '🔄',
    '抛↓': '🔴',
    'D': '📍',
    'D1': '📌'
  }
  return icons[signal] || '📊'
}

const getSignalDescription = (signal) => {
  const descriptions = {
    'D2': '短期回调后的买入机会',
    '猎庄': '主力建仓信号',
    '反转': '强势反转买点',
    '抛↓': '技术指标超买，建议减仓',
    'D': '趋势转折买点',
    'D1': '拐点买入信号'
  }
  return descriptions[signal] || '技术信号'
}

const getSignalSuggestion = (signal) => {
  if (!signal) return ''
  
  if (signal.type === 'buy') {
    return `建议在 ¥${signal.price.toFixed(2)} 附近分批买入，设置止损位 ¥${(signal.price * 0.95).toFixed(2)}`
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

const calculateTechnicalSignals = async () => {
  try {
    const response = await fetch(`/api/technical-indicators/${props.stockCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        klineData: props.klineData,
        enabledSignals: enabledSignals
      })
    })

    const result = await response.json()
    if (result.success) {
      recentSignals.value = result.data.signals
      updateChart(result.data)
    }
  } catch (error) {
    console.error('计算技术指标失败:', error)
    showToast('计算技术指标失败', 'error')
  }
}

const updateChart = (data) => {
  if (!chart.value) return

  const option = {
    title: {
      text: '技术指标分析',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['MA5', 'MA10', 'MA30', 'MA60', '分水岭'],
      top: 30
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.dates || []
    },
    yAxis: {
      type: 'value',
      scale: true
    },
    series: [
      {
        name: 'MA5',
        type: 'line',
        data: data.movingAverages?.ma5 || [],
        lineStyle: { color: '#FFFF00' },
        symbol: 'none'
      },
      {
        name: 'MA10',
        type: 'line',
        data: data.movingAverages?.ma10 || [],
        lineStyle: { color: '#FFFFFF' },
        symbol: 'none'
      },
      {
        name: 'MA30',
        type: 'line',
        data: data.movingAverages?.ma30 || [],
        lineStyle: { color: '#FF0000' },
        symbol: 'none'
      },
      {
        name: 'MA60',
        type: 'line',
        data: data.movingAverages?.ma60 || [],
        lineStyle: { color: '#FF0000' },
        symbol: 'none'
      },
      {
        name: '分水岭',
        type: 'line',
        data: data.watershed || [],
        lineStyle: { 
          color: '#FF00FF',
          width: 2
        },
        symbol: 'none'
      }
    ]
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
watch(() => props.klineData, () => {
  calculateTechnicalSignals()
}, { deep: true })
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
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
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
  padding: 20px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item label {
  font-weight: bold;
  color: #666;
}

.strength-bar {
  width: 100px;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  background: linear-gradient(90deg, #52c41a, #1890ff);
  transition: width 0.3s;
}

.suggestion {
  background: #f6ffed;
  padding: 8px;
  border-radius: 4px;
  font-size: 14px;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}
</style>
