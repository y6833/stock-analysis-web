<template>
  <div class="turtle-trading-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>🐢 海龟交易法则演示</h1>
      <p class="subtitle">基于唐奇安通道的趋势跟踪交易系统</p>
    </div>

    <!-- 策略介绍 -->
    <div class="strategy-intro">
      <div class="intro-card">
        <h2>📚 策略原理</h2>
        <div class="principle-grid">
          <div class="principle-item">
            <div class="icon">📈</div>
            <h3>唐奇安通道</h3>
            <p>上轨：N周期最高价<br>下轨：N周期最低价</p>
          </div>
          <div class="principle-item">
            <div class="icon">🎯</div>
            <h3>买入信号</h3>
            <p>价格突破上轨时<br>趋势跟踪买入</p>
          </div>
          <div class="principle-item">
            <div class="icon">🛡️</div>
            <h3>卖出信号</h3>
            <p>价格跌破下轨时<br>趋势跟踪卖出</p>
          </div>
          <div class="principle-item">
            <div class="icon">⚙️</div>
            <h3>机械化交易</h3>
            <p>明确的买卖规则<br>减少主观判断</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 参数配置 -->
    <div class="config-section">
      <div class="config-card">
        <h2>🔧 参数配置</h2>
        <div class="config-form">
          <div class="form-group">
            <label>股票代码:</label>
            <el-select v-model="selectedStock" placeholder="选择股票" @change="loadStockData">
              <el-option
                v-for="stock in stockList"
                :key="stock.symbol"
                :label="`${stock.name} (${stock.symbol})`"
                :value="stock.symbol"
              />
            </el-select>
          </div>
          <div class="form-group">
            <label>突破周期:</label>
            <el-select v-model="turtlePeriod" @change="updateAnalysis">
              <el-option label="10天" :value="10" />
              <el-option label="20天" :value="20" />
              <el-option label="30天" :value="30" />
              <el-option label="55天" :value="55" />
            </el-select>
          </div>
          <div class="form-group">
            <label>数据周期:</label>
            <el-select v-model="dataPeriod" @change="loadStockData">
              <el-option label="日线" value="1d" />
              <el-option label="周线" value="1w" />
              <el-option label="月线" value="1M" />
            </el-select>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表展示 -->
    <div class="chart-section">
      <div class="chart-card">
        <h2>📊 唐奇安通道图表</h2>
        <div class="chart-container" ref="chartContainer"></div>
      </div>
    </div>

    <!-- 交易信号 -->
    <div class="signals-section">
      <div class="signals-card">
        <h2>🎯 交易信号</h2>
        <div class="signals-stats">
          <div class="stat-item buy">
            <div class="stat-number">{{ buySignalsCount }}</div>
            <div class="stat-label">买入信号</div>
          </div>
          <div class="stat-item sell">
            <div class="stat-number">{{ sellSignalsCount }}</div>
            <div class="stat-label">卖出信号</div>
          </div>
          <div class="stat-item total">
            <div class="stat-number">{{ totalSignalsCount }}</div>
            <div class="stat-label">总信号数</div>
          </div>
        </div>
        
        <div class="signals-list">
          <div
            v-for="signal in recentSignals"
            :key="signal.id"
            :class="['signal-item', signal.type]"
          >
            <div class="signal-icon">
              {{ signal.type === 'buy' ? '🐢' : '🔻' }}
            </div>
            <div class="signal-info">
              <div class="signal-name">{{ signal.signal }}</div>
              <div class="signal-reason">{{ signal.reason }}</div>
            </div>
            <div class="signal-price">¥{{ signal.price.toFixed(2) }}</div>
            <div class="signal-strength">
              <el-progress
                :percentage="signal.strength"
                :color="signal.type === 'buy' ? '#67c23a' : '#f56c6c'"
                :show-text="false"
                size="small"
              />
              <span class="strength-text">{{ signal.strength }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 策略统计 -->
    <div class="stats-section">
      <div class="stats-card">
        <h2>📈 策略统计</h2>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-title">当前价格</div>
            <div class="stat-value">¥{{ currentPrice.toFixed(2) }}</div>
          </div>
          <div class="stat-box">
            <div class="stat-title">上轨价格</div>
            <div class="stat-value">¥{{ upperBand.toFixed(2) }}</div>
          </div>
          <div class="stat-box">
            <div class="stat-title">下轨价格</div>
            <div class="stat-value">¥{{ lowerBand.toFixed(2) }}</div>
          </div>
          <div class="stat-box">
            <div class="stat-title">通道宽度</div>
            <div class="stat-value">{{ channelWidth.toFixed(2) }}%</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 使用说明 -->
    <div class="instructions-section">
      <div class="instructions-card">
        <h2>📖 使用说明</h2>
        <div class="instructions-content">
          <div class="instruction-item">
            <h3>1. 选择股票和参数</h3>
            <p>选择要分析的股票代码，设置合适的突破周期（建议20天）</p>
          </div>
          <div class="instruction-item">
            <h3>2. 观察唐奇安通道</h3>
            <p>绿色虚线为上轨（买入线），橙色虚线为下轨（卖出线）</p>
          </div>
          <div class="instruction-item">
            <h3>3. 识别交易信号</h3>
            <p>🐢 表示买入信号，🔻 表示卖出信号，关注信号强度</p>
          </div>
          <div class="instruction-item">
            <h3>4. 制定交易策略</h3>
            <p>结合其他技术指标，制定完整的交易计划和风险控制</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useToast } from '@/composables/useToast'
import * as echarts from 'echarts'

// 响应式数据
const chartContainer = ref(null)
const chart = ref(null)
const selectedStock = ref('000001')
const turtlePeriod = ref(20)
const dataPeriod = ref('1d')
const currentPrice = ref(0)
const upperBand = ref(0)
const lowerBand = ref(0)
const recentSignals = ref([])

const { showToast } = useToast()

// 股票列表
const stockList = ref([
  { symbol: '000001', name: '平安银行' },
  { symbol: '000002', name: '万科A' },
  { symbol: '000858', name: '五粮液' },
  { symbol: '600036', name: '招商银行' },
  { symbol: '600519', name: '贵州茅台' },
  { symbol: '600887', name: '伊利股份' },
])

// 计算属性
const buySignalsCount = computed(() => {
  return recentSignals.value.filter(s => s.type === 'buy').length
})

const sellSignalsCount = computed(() => {
  return recentSignals.value.filter(s => s.type === 'sell').length
})

const totalSignalsCount = computed(() => {
  return recentSignals.value.length
})

const channelWidth = computed(() => {
  if (upperBand.value === 0 || lowerBand.value === 0) return 0
  return ((upperBand.value - lowerBand.value) / lowerBand.value) * 100
})

// 方法
const initChart = () => {
  if (chartContainer.value) {
    chart.value = echarts.init(chartContainer.value)
  }
}

const loadStockData = async () => {
  try {
    showToast('正在加载股票数据...', 'info')
    
    // 这里应该调用真实的API获取股票数据
    // 暂时使用模拟数据
    await updateAnalysis()
    
    showToast('股票数据加载完成', 'success')
  } catch (error) {
    console.error('加载股票数据失败:', error)
    showToast('加载股票数据失败', 'error')
  }
}

const updateAnalysis = async () => {
  try {
    // 调用后端API计算海龟交易信号
    const response = await fetch(`/api/technical-indicators/${selectedStock.value}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        enabledSignals: { turtle: true },
        turtleParams: { period: turtlePeriod.value },
      }),
    })

    const result = await response.json()
    if (result.success && result.data.donchianChannel) {
      const donchian = result.data.donchianChannel
      
      // 更新统计数据
      if (donchian.upband.length > 0) {
        upperBand.value = donchian.upband[donchian.upband.length - 1]
        lowerBand.value = donchian.dnband[donchian.dnband.length - 1]
      }
      
      // 更新信号列表
      recentSignals.value = donchian.signals || []
      
      // 更新图表
      updateChart(result.data)
    } else {
      // 使用模拟数据
      generateMockData()
    }
  } catch (error) {
    console.error('更新分析失败:', error)
    generateMockData()
  }
}

const generateMockData = () => {
  // 生成模拟的海龟交易数据
  currentPrice.value = 12.50
  upperBand.value = 13.20
  lowerBand.value = 11.80
  
  recentSignals.value = [
    {
      id: 1,
      signal: '海龟买入',
      type: 'buy',
      price: 13.25,
      strength: 85,
      reason: `价格突破${turtlePeriod.value}周期高点 ¥13.20`
    },
    {
      id: 2,
      signal: '海龟卖出',
      type: 'sell',
      price: 11.75,
      strength: 78,
      reason: `价格跌破${turtlePeriod.value}周期低点 ¥11.80`
    }
  ]
  
  updateChart()
}

const updateChart = (data = null) => {
  if (!chart.value) return

  // 模拟K线数据
  const dates = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - 29 + i)
    return date.toLocaleDateString()
  })

  const prices = Array.from({ length: 30 }, (_, i) => 12 + Math.sin(i * 0.2) * 0.5 + Math.random() * 0.3)
  const upbandData = Array.from({ length: 30 }, (_, i) => Math.max(...prices.slice(Math.max(0, i - turtlePeriod.value + 1), i + 1)))
  const dnbandData = Array.from({ length: 30 }, (_, i) => Math.min(...prices.slice(Math.max(0, i - turtlePeriod.value + 1), i + 1)))

  const option = {
    title: {
      text: `${selectedStock.value} 海龟交易法则分析`,
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['价格', '唐奇安上轨', '唐奇安下轨'],
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
      data: dates
    },
    yAxis: {
      type: 'value',
      scale: true
    },
    series: [
      {
        name: '价格',
        type: 'line',
        data: prices,
        lineStyle: { color: '#1890ff', width: 2 },
        symbol: 'circle',
        symbolSize: 4
      },
      {
        name: '唐奇安上轨',
        type: 'line',
        data: upbandData,
        lineStyle: { color: '#52c41a', width: 2, type: 'dashed' },
        symbol: 'none'
      },
      {
        name: '唐奇安下轨',
        type: 'line',
        data: dnbandData,
        lineStyle: { color: '#ff7875', width: 2, type: 'dashed' },
        symbol: 'none'
      }
    ]
  }

  chart.value.setOption(option)
}

// 生命周期
onMounted(async () => {
  await nextTick()
  initChart()
  generateMockData()
})
</script>

<style scoped>
.turtle-trading-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 10px;
}

.subtitle {
  font-size: 1.1rem;
  color: #7f8c8d;
}

.strategy-intro,
.config-section,
.chart-section,
.signals-section,
.stats-section,
.instructions-section {
  margin-bottom: 30px;
}

.intro-card,
.config-card,
.chart-card,
.signals-card,
.stats-card,
.instructions-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.principle-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.principle-item {
  text-align: center;
  padding: 20px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
}

.principle-item .icon {
  font-size: 2rem;
  margin-bottom: 10px;
}

.config-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #2c3e50;
}

.chart-container {
  height: 400px;
  margin-top: 20px;
}

.signals-stats {
  display: flex;
  gap: 20px;
  margin: 20px 0;
}

.stat-item {
  text-align: center;
  padding: 16px;
  border-radius: 8px;
  flex: 1;
}

.stat-item.buy {
  background: linear-gradient(135deg, #e8f5e8, #f0f9f0);
  border: 2px solid #52c41a;
}

.stat-item.sell {
  background: linear-gradient(135deg, #fff2f0, #fff7f6);
  border: 2px solid #ff4d4f;
}

.stat-item.total {
  background: linear-gradient(135deg, #e6f7ff, #f0f9ff);
  border: 2px solid #1890ff;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
}

.signals-list {
  max-height: 300px;
  overflow-y: auto;
}

.signal-item {
  display: flex;
  align-items: center;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 8px;
  transition: all 0.3s;
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
  font-size: 1.5rem;
  margin-right: 16px;
}

.signal-info {
  flex: 1;
}

.signal-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.signal-reason {
  font-size: 0.9rem;
  color: #666;
}

.signal-price {
  font-weight: bold;
  font-size: 1.1rem;
  margin-right: 16px;
  color: #1890ff;
}

.signal-strength {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 100px;
}

.strength-text {
  font-size: 0.9rem;
  color: #666;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.stat-box {
  text-align: center;
  padding: 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
}

.stat-title {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
  color: #2c3e50;
}

.instructions-content {
  margin-top: 20px;
}

.instruction-item {
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
}

.instruction-item h3 {
  color: #2c3e50;
  margin-bottom: 8px;
}

.instruction-item p {
  color: #666;
  line-height: 1.6;
}
</style>
