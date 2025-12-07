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
        <div v-for="signal in recentSignals" :key="signal.id" :class="['signal-item', signal.type]"
          @click="showSignalDetails(signal)">
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
        <div v-if="recentSignals.length === 0 && allSignals.length === 0" class="empty-signals">
          <p>📊 暂无技术指标数据</p>
          <p class="empty-hint">该股票暂无技术指标数据，请稍后重试或选择其他股票</p>
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
        <label>
          <input type="checkbox" v-model="enabledSignals.turtle" @change="updateSignalConfig" />
          🐢 海龟交易信号
        </label>
        <label>
          <input type="checkbox" v-model="enabledSignals.ma" @change="updateSignalConfig" />
          📈 单均线策略
        </label>
      </div>

      <!-- 海龟交易参数配置 -->
      <!-- 单均线策略配置 -->
      <div v-if="enabledSignals.ma" class="ma-config">
        <h5>📈 单均线策略参数</h5>
        <div class="param-group">
          <label>
            均线周期:
            <select v-model="maParams.period" @change="updateSignalConfig">
              <option value="5">5天</option>
              <option value="10">10天</option>
              <option value="20">20天</option>
              <option value="30">30天</option>
            </select>
          </label>
        </div>
      </div>

      <!-- 海龟交易参数配置 -->
      <div v-if="enabledSignals.turtle" class="turtle-config">
        <h5>🐢 海龟交易参数</h5>
        <div class="param-group">
          <label>
            突破周期:
            <select v-model="turtleParams.period" @change="updateSignalConfig">
              <option value="10">10天</option>
              <option value="20">20天</option>
              <option value="30">30天</option>
              <option value="55">55天</option>
            </select>
          </label>
          <label>
            账户资金:
            <input type="number" v-model="turtleParams.riskManagement.accountValue" @change="updateSignalConfig"
              placeholder="100000" min="10000" step="10000" />
          </label>
          <label>
            风险比例:
            <select v-model="turtleParams.riskManagement.riskPercent" @change="updateSignalConfig">
              <option value="0.01">1%</option>
              <option value="0.02">2%</option>
              <option value="0.03">3%</option>
              <option value="0.05">5%</option>
            </select>
          </label>
          <label>
            ATR倍数:
            <select v-model="turtleParams.riskManagement.atrMultiplier" @change="updateSignalConfig">
              <option value="1">1倍</option>
              <option value="2">2倍</option>
              <option value="3">3倍</option>
            </select>
          </label>
          <label>
            ATR周期:
            <input type="number" v-model.number="turtleParams.riskManagement.atrPeriod" @change="updateSignalConfig"
              min="5" max="30" step="1" />
          </label>
          <label>
            最大仓位(%):
            <input type="number" v-model.number="turtleParams.riskManagement.maxPositionPercent"
              @change="updateSignalConfig" min="1" max="50" step="1" />
          </label>
        </div>
      </div>
    </div>

    <!-- 信号详情弹窗 -->
    <el-dialog v-model="showSignalDetail" :title="`${selectedSignal?.signal} 信号详情`" width="500px"
      :before-close="() => (showSignalDetail = false)">
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
              <el-progress :percentage="selectedSignal?.strength || 50"
                :color="getStrengthColor(selectedSignal?.strength || 50)" :show-text="true"
                :format="(percentage) => `${percentage}%`" />
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

          <!-- 海龟交易风险管理信息 -->
          <div v-if="selectedSignal?.riskManagement" class="risk-management-section">
            <h4>🛡️ 风险管理</h4>
            <div class="risk-grid">
              <div class="risk-item">
                <label>建议仓位:</label>
                <span>{{ selectedSignal.riskManagement.positionSize?.shares || 0 }} 股</span>
              </div>
              <div class="risk-item">
                <label>仓位价值:</label>
                <span>¥{{
                  (selectedSignal.riskManagement.positionSize?.positionValue || 0).toFixed(2)
                }}</span>
              </div>
              <div class="risk-item">
                <label>止损价格:</label>
                <span>¥{{ (selectedSignal.riskManagement.stopLoss?.stopPrice || 0).toFixed(2) }}</span>
              </div>
              <div class="risk-item">
                <label>风险金额:</label>
                <span>¥{{
                  (selectedSignal.riskManagement.positionSize?.dollarRisk || 0).toFixed(2)
                }}</span>
              </div>
              <div class="risk-item">
                <label>ATR值:</label>
                <span>¥{{ (selectedSignal.atr || 0).toFixed(3) }}</span>
              </div>
              <div class="risk-item">
                <label>风险比例:</label>
                <span>{{
                  (selectedSignal.riskManagement.stopLoss?.riskPercent || 0).toFixed(2)
                }}%</span>
              </div>
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
  turtle: true, // 默认启用海龟交易信号
})

// 技术指标数据
const movingAverages = ref({})
const allSignals = ref([])
const buySignals = ref([])
const sellSignals = ref([])
const turtleSignals = ref([])

// 移动平均线参数
const maParams = reactive({
  period: 20, // 默认20天均线
  type: 'sma' // 简单移动平均线
})

// 海龟交易参数
const turtleParams = reactive({
  period: 20, // 默认20天突破周期
  riskManagement: {
    enabled: true,
    accountValue: 100000,
    riskPercent: 0.02,
    atrMultiplier: 2,
    atrPeriod: 14,
    maxPositionPercent: 20,
  },
  accountValue: 100000, // 账户资金
  riskPercent: 0.02, // 风险比例2%
  atrMultiplier: 2, // ATR倍数
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
    海龟买入: '🐢',
    海龟卖出: '🔻',
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
    海龟买入: '价格突破唐奇安通道上轨，趋势跟踪买入',
    海龟卖出: '价格跌破唐奇安通道下轨，趋势跟踪卖出',
  }
  return descriptions[signal] || '技术信号'
}

const getSignalSuggestion = (signal) => {
  if (!signal) return ''

  // 海龟交易信号的专门建议
  if (signal.signal === '海龟买入') {
    return `海龟交易法则买入信号：建议在 ¥${signal.price.toFixed(
      2
    )} 附近买入，设置止损位为前期低点，目标位为通道宽度的2倍。${signal.reason || ''}`
  } else if (signal.signal === '海龟卖出') {
    return `海龟交易法则卖出信号：建议在 ¥${signal.price.toFixed(
      2
    )} 附近卖出或止损，注意趋势反转。${signal.reason || ''}`
  }

  // 其他信号的通用建议
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

// 模拟信号数据生成函数已移除
// 现在只从真实数据源获取技术信号
const loadRealSignals = async () => {
  try {
    // 调用真实的技术信号API
    const response = await fetch(`/api/technical/signals/${props.symbol}`)
    if (!response.ok) {
      throw new Error('获取技术信号失败')
    }
    const data = await response.json()
    if (data.success) {
      recentSignals.value = data.data
    } else {
      throw new Error(data.message || '获取技术信号失败')
    }
  } catch (error) {
    console.error('获取技术信号失败:', error)
    recentSignals.value = []
    // 显示错误提示而不是使用模拟数据
    if (window.$message) {
      window.$message.error('无法获取技术信号数据，请稍后重试')
    }
  }
}

const calculateTechnicalSignals = async () => {
  try {
    // 格式化股票代码（确保有市场后缀）
    let formattedCode = props.stockCode
    if (formattedCode && !formattedCode.includes('.')) {
      if (formattedCode.startsWith('6')) {
        formattedCode = `${formattedCode}.SH`
      } else if (formattedCode.startsWith('0') || formattedCode.startsWith('3')) {
        formattedCode = `${formattedCode}.SZ`
      } else if (formattedCode.startsWith('4') || formattedCode.startsWith('8')) {
        formattedCode = `${formattedCode}.BJ`
      }
    }
    
    // 使用正确的后端API端点
    const response = await fetch(`/api/v1/stocks/${formattedCode || props.stockCode}/indicators`, {
      method: 'GET',  // 后端API是GET请求
      headers: {
        'Content-Type': 'application/json',
      }
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

      // 为每个信号添加时间戳和类型（如果没有的话）
      allSignals.forEach((signal, index) => {
        if (!signal.timestamp) {
          signal.timestamp = Date.now() - (allSignals.length - index) * 60000
        }
        if (!signal.id) {
          signal.id = `${signal.signal}_${signal.index || index}_${Date.now()}`
        }
        // 添加信号类型，如果没有的话
        if (!signal.type) {
          // 根据信号名称判断类型
          const signalName = signal.signal?.toLowerCase() || ''
          if (signalName.includes('买入') || signalName.includes('buy') || signalName.includes('突破') || signalName.includes('金叉')) {
            signal.type = 'buy'
          } else if (signalName.includes('卖出') || signalName.includes('sell') || signalName.includes('跌破') || signalName.includes('死叉')) {
            signal.type = 'sell'
          } else {
            signal.type = 'neutral'
          }
        }
      })

      // 按时间戳排序，最新的在前面
      allSignals.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

      recentSignals.value = allSignals
      updateChart(result.data)

      console.log('技术指标计算成功，信号数量:', allSignals.length)
      console.log(
        '海龟交易信号:',
        allSignals.filter((s) => s.signal?.includes('海龟'))
      )
    } else {
      console.warn('API 返回失败:', result.message)
      // 显示友好的错误信息，但不显示模拟数据
      if (result.message?.includes('暂无数据') || result.message?.includes('数据不足')) {
        showToast(`股票 ${props.stockCode} 暂无技术指标数据`, 'info')
      } else {
        showToast('获取技术指标失败', 'warning')
      }
      // 清空数据，显示空状态
      clearAllData()
    }
  } catch (error) {
    console.error('计算技术指标失败:', error)
    showToast('获取技术指标失败，请稍后重试', 'error')
    // 清空数据，显示空状态
    clearAllData()
  }
}

// 清空所有数据，显示空状态
const clearAllData = () => {
  console.log('清空技术指标数据，显示空状态')
  
  // 清空所有响应式数据
  movingAverages.value = {}
  allSignals.value = []
  buySignals.value = []
  sellSignals.value = []
  turtleSignals.value = []
  recentSignals.value = []
  
  // 清空图表
  if (chart.value) {
    chart.value.dispose()
    chart.value = null
  }
}

const updateChart = (data) => {
  if (!chart.value) return

  // 构建图例数据
  const legendData = ['MA5', 'MA10', 'MA30', 'MA60', '分水岭']
  const series = [
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
  ]

  // 如果启用了海龟交易信号，添加唐奇安通道
  if (enabledSignals.turtle && data.donchianChannel) {
    legendData.push('唐奇安上轨', '唐奇安下轨')

    series.push(
      {
        name: '唐奇安上轨',
        type: 'line',
        data: data.donchianChannel.upband || [],
        lineStyle: {
          color: '#00FF00',
          width: 2,
          type: 'dashed',
        },
        symbol: 'none',
      },
      {
        name: '唐奇安下轨',
        type: 'line',
        data: data.donchianChannel.dnband || [],
        lineStyle: {
          color: '#FF6600',
          width: 2,
          type: 'dashed',
        },
        symbol: 'none',
      }
    )
  }

  const option = {
    title: {
      text: '技术指标分析 🐢',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      formatter: function (params) {
        let result = `时间: ${params[0].axisValue}<br/>`
        params.forEach((param) => {
          if (param.seriesName.includes('唐奇安')) {
            result += `${param.seriesName}: ¥${param.value?.toFixed(2) || 'N/A'}<br/>`
          } else {
            result += `${param.seriesName}: ${param.value?.toFixed(2) || 'N/A'}<br/>`
          }
        })
        return result
      },
    },
    legend: {
      data: legendData,
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
    series: series,
  }

  try {
    if (chart.value && !chart.value.isDisposed()) {
      // 验证series数据
      const validatedSeries = series.filter(s => {
        if (!s || typeof s !== 'object') return false
        if (!s.type || !s.name) return false
        if (!Array.isArray(s.data)) s.data = []
        return true
      }).map(s => ({
        ...s,
        animation: false, // 禁用动画
        data: s.data || []
      }))

      // 更新option中的series
      const safeOption = {
        ...option,
        series: validatedSeries,
        animation: false,
        animationDuration: 0
      }

      console.log('[TechnicalSignals] 设置技术指标图表配置:', {
        seriesCount: validatedSeries.length,
        xAxisDataLength: (data.dates || []).length,
        hasValidData: validatedSeries.some(s => s.data && s.data.length > 0)
      })

      // 安全地清空和设置图表
      try {
        chart.value.clear()
        chart.value.setOption(safeOption, true)
        console.log('[TechnicalSignals] 技术指标图表渲染成功')
      } catch (setOptionError) {
        console.error('[TechnicalSignals] setOption失败，重新创建图表:', setOptionError)
        chart.value.dispose()
        if (chartContainer.value) {
          chart.value = echarts.init(chartContainer.value)
        }
        chart.value.setOption(safeOption, true)
        console.log('[TechnicalSignals] 技术指标图表重新创建成功')
      }
    } else {
      console.error('[TechnicalSignals] 图表实例无效或已销毁，重新创建')
      if (chartContainer.value) {
        chart.value = echarts.init(chartContainer.value)
        chart.value.setOption(option, true)
        console.log('[TechnicalSignals] 技术指标图表重新创建成功')
      }
    }
  } catch (err) {
    console.error('[TechnicalSignals] 图表渲染失败:', err)

    // 最后的尝试：完全重置图表
    try {
      if (chartContainer.value) {
        if (chart.value) {
          chart.value.dispose()
        }
        chart.value = echarts.init(chartContainer.value)
        console.log('[TechnicalSignals] 技术指标图表完全重置成功')
      }
    } catch (resetError) {
      console.error('[TechnicalSignals] 图表重置也失败了:', resetError)
    }
  }
}

const initChart = () => {
  if (!chartContainer.value) {
    console.warn('[TechnicalSignals] 图表容器不存在')
    return
  }

  // 检查容器尺寸
  const containerRect = chartContainer.value.getBoundingClientRect()
  if (containerRect.width === 0 || containerRect.height === 0) {
    console.warn('[TechnicalSignals] 容器尺寸为0，延迟初始化')
    setTimeout(() => {
      if (chartContainer.value) {
        const newRect = chartContainer.value.getBoundingClientRect()
        console.log('[TechnicalSignals] 重试时容器尺寸:', newRect.width, 'x', newRect.height)
        if (newRect.width > 0 && newRect.height > 0) {
          initChart()
        }
      }
    }, 200)
    return
  }

  console.log('[TechnicalSignals] 初始化图表，容器尺寸:', containerRect.width, 'x', containerRect.height)

  try {
    // 销毁旧图表
    if (chart.value) {
      chart.value.dispose()
    }

    chart.value = echarts.init(chartContainer.value)
    console.log('[TechnicalSignals] 图表初始化成功')
  } catch (error) {
    console.error('[TechnicalSignals] 图表初始化失败:', error)
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
  padding: 60px 20px;
  color: #999;
}

.empty-signals p {
  margin: 8px 0;
  font-size: 14px;
}

.empty-signals p:first-child {
  font-size: 18px;
  font-weight: 600;
  color: #666;
  margin-bottom: 12px;
}

.empty-hint {
  font-size: 13px !important;
  color: #999 !important;
  line-height: 1.6;
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
  width: 100%;
  height: 400px;
  min-height: 400px;
  background: white;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #e0e0e0;
  position: relative;
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

/* 海龟交易配置样式 */
.turtle-config {
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, #e8f5e8, #f0f9f0);
  border-radius: 6px;
  border-left: 4px solid #52c41a;
}

.turtle-config h5 {
  margin: 0 0 12px 0;
  color: #52c41a;
  font-weight: 600;
}

.param-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.param-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.param-group select,
.param-group input {
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: white;
  font-size: 14px;
}

.param-group input[type='number'] {
  width: 120px;
}

/* 风险管理样式 */
.risk-management-section {
  margin-top: 20px;
  padding: 16px;
  background: linear-gradient(135deg, #fff7e6, #fff2e6);
  border-radius: 8px;
  border-left: 4px solid #fa8c16;
}

.risk-management-section h4 {
  margin: 0 0 16px 0;
  color: #fa8c16;
  font-weight: 600;
}

.risk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.risk-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #ffd591;
}

.risk-item label {
  font-size: 12px;
  color: #8c4a00;
  font-weight: 500;
}

.risk-item span {
  font-weight: bold;
  color: #d46b08;
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
