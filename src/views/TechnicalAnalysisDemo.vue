<template>
  <PageLayout title="🎯 通达信技术分析演示" subtitle="体验专业级股票技术分析功能">
    <!-- 功能介绍 -->
    <div class="feature-intro">
      <div class="intro-card glass-card">
        <h3>📊 技术指标系统</h3>
        <p>集成通达信经典技术指标公式，提供专业的买卖信号识别</p>
        <ul>
          <li>D2买入信号 - 短期回调后的买入机会</li>
          <li>猎庄信号 - 主力建仓信号识别</li>
          <li>反转信号 - 强势反转买点捕捉</li>
          <li>拐点信号 - 趋势转折点识别</li>
          <li>分水岭指标 - 关键支撑阻力位</li>
        </ul>
      </div>

      <div class="intro-card glass-card">
        <h3>🔍 智能市场扫描</h3>
        <p>批量扫描全市场股票，快速发现投资机会</p>
        <ul>
          <li>多信号组合筛选</li>
          <li>实时信号强度评估</li>
          <li>风险等级自动评估</li>
          <li>交易建议智能生成</li>
        </ul>
      </div>

      <div class="intro-card glass-card">
        <h3>📈 可视化分析</h3>
        <p>直观的图表展示和信号标注</p>
        <ul>
          <li>多均线系统显示</li>
          <li>信号点位精确标注</li>
          <li>实时价格监控</li>
          <li>历史信号回测</li>
        </ul>
      </div>
    </div>

    <!-- 演示区域 -->
    <div class="demo-section glass-card">
      <h2>🚀 功能演示</h2>

      <!-- 股票选择 -->
      <div class="stock-selector">
        <label>选择演示股票:</label>
        <select v-model="selectedStock" @change="loadStockData">
          <option value="">请选择股票</option>
          <option value="000001.SZ">平安银行 (000001)</option>
          <option value="000002.SZ">万科A (000002)</option>
          <option value="600000.SH">浦发银行 (600000)</option>
          <option value="600036.SH">招商银行 (600036)</option>
          <option value="000858.SZ">五粮液 (000858)</option>
        </select>
        <button @click="loadStockData" :disabled="!selectedStock || isLoading">
          {{ isLoading ? '加载中...' : '加载数据' }}
        </button>
      </div>

      <!-- 技术信号展示 -->
      <div v-if="stockData" class="signals-display">
        <TechnicalSignals :stock-code="selectedStock" :kline-data="stockData.klineData" />
      </div>

      <!-- 使用说明 -->
      <div class="usage-guide">
        <h3>📖 使用说明</h3>
        <div class="guide-steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h4>选择股票</h4>
              <p>从下拉列表中选择要分析的股票，或在股票分析页面输入股票代码</p>
            </div>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h4>查看信号</h4>
              <p>系统会自动计算并显示各种技术信号，包括买入、卖出和中性信号</p>
            </div>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h4>分析建议</h4>
              <p>根据信号强度和市场条件，系统会给出相应的交易建议和风险提示</p>
            </div>
          </div>
          <div class="step">
            <div class="step-number">4</div>
            <div class="step-content">
              <h4>市场扫描</h4>
              <p>使用市场扫描器批量筛选符合条件的股票，发现更多投资机会</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 技术指标说明 -->
      <div class="indicators-explanation">
        <h3>🔬 技术指标详解</h3>
        <div class="indicator-cards">
          <div class="indicator-card">
            <h4>D2买入信号</h4>
            <div class="indicator-formula">
              <strong>触发条件:</strong>
              <ul>
                <li>13日均线 > 18日均线 (趋势向上)</li>
                <li>收盘价上穿4日均线</li>
                <li>4日均线 < 13日均线</li>
              </ul>
            </div>
            <div class="indicator-usage">
              <strong>使用建议:</strong> 适合短线操作，在股价回调到支撑位附近时买入
            </div>
          </div>

          <div class="indicator-card">
            <h4>猎庄信号</h4>
            <div class="indicator-formula">
              <strong>触发条件:</strong>
              <ul>
                <li>短期强度 J < -0.2</li>
                <li>中期强度 J1 < -0.2</li>
                <li>J 上穿 J1</li>
              </ul>
            </div>
            <div class="indicator-usage">
              <strong>使用建议:</strong> 主力资金建仓信号，适合中长线布局
            </div>
          </div>

          <div class="indicator-card">
            <h4>分水岭指标</h4>
            <div class="indicator-formula">
              <strong>计算方法:</strong>
              <ul>
                <li>VAR37 = EMA(EMA(EMA(CLOSE,2),2),2)</li>
                <li>分水岭 = MA(VAR37,13) × 0.99</li>
              </ul>
            </div>
            <div class="indicator-usage">
              <strong>使用建议:</strong> 重要的支撑阻力位，价格在此附近容易发生反转
            </div>
          </div>

          <div class="indicator-card">
            <h4>反转信号</h4>
            <div class="indicator-formula">
              <strong>触发条件:</strong>
              <ul>
                <li>偏离度反转幅度 ≥ 1.23倍</li>
                <li>前日偏离度 ≥ 8</li>
                <li>当日涨幅 ≥ 3%</li>
              </ul>
            </div>
            <div class="indicator-usage">
              <strong>使用建议:</strong> 强势反转信号，适合追涨操作，但要注意风险控制
            </div>
          </div>
        </div>
      </div>

      <!-- 风险提示 -->
      <div class="risk-warning">
        <h3>⚠️ 风险提示</h3>
        <div class="warning-content">
          <p><strong>投资有风险，入市需谨慎！</strong></p>
          <ul>
            <li>技术指标仅供参考，不构成投资建议</li>
            <li>任何技术分析方法都不能保证100%准确</li>
            <li>建议结合基本面分析和市场环境综合判断</li>
            <li>严格控制仓位，设置止损止盈</li>
            <li>不要将全部资金投入单一股票</li>
          </ul>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import PageLayout from '@/components/common/PageLayout.vue'
import TechnicalSignals from '@/components/TechnicalSignals.vue'
import { useToast } from '@/composables/useToast'

const { showToast } = useToast()

// 响应式数据
const selectedStock = ref('')
const stockData = ref(null)
const isLoading = ref(false)

// 方法
const loadStockData = async () => {
  if (!selectedStock.value) {
    showToast('请先选择股票', 'warning')
    return
  }

  isLoading.value = true

  try {
    // 模拟加载股票数据
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 生成模拟K线数据
    const days = 100
    const basePrice = 10 + Math.random() * 20
    const klineData = {
      open: [],
      high: [],
      low: [],
      close: [],
      volume: [],
      dates: []
    }

    let currentPrice = basePrice
    for (let i = 0; i < days; i++) {
      const change = (Math.random() - 0.5) * 0.1
      const open = currentPrice
      const close = open * (1 + change)
      const high = Math.max(open, close) * (1 + Math.random() * 0.05)
      const low = Math.min(open, close) * (1 - Math.random() * 0.05)
      const volume = Math.floor(Math.random() * 1000000) + 100000

      klineData.open.push(open)
      klineData.high.push(high)
      klineData.low.push(low)
      klineData.close.push(close)
      klineData.volume.push(volume)

      const date = new Date()
      date.setDate(date.getDate() - (days - i))
      klineData.dates.push(date.toISOString().split('T')[0])

      currentPrice = close
    }

    stockData.value = {
      stockCode: selectedStock.value,
      klineData
    }

    showToast('股票数据加载成功', 'success')
  } catch (error) {
    console.error('加载股票数据失败:', error)
    showToast('加载股票数据失败', 'error')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  console.log('技术分析演示页面已加载')
})
</script>

<style scoped>
.feature-intro {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-5);
  margin-bottom: var(--spacing-6);
}

.intro-card {
  padding: var(--spacing-6);
  border-left: 4px solid var(--primary-color);
}

.intro-card h3 {
  color: var(--primary-color);
  margin-bottom: 12px;
}

.intro-card p {
  color: var(--text-secondary);
  margin-bottom: 16px;
  line-height: 1.6;
}

.intro-card ul {
  list-style: none;
  padding: 0;
}

.intro-card li {
  padding: 4px 0;
  color: var(--text-primary);
  position: relative;
  padding-left: 20px;
}

.intro-card li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--primary-color);
  font-weight: bold;
}

.demo-section {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.demo-section h2 {
  color: var(--primary-color);
  margin-bottom: 30px;
  text-align: center;
}

.stock-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stock-selector label {
  font-weight: bold;
  color: var(--text-primary);
}

.stock-selector select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  min-width: 200px;
}

.stock-selector button {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.stock-selector button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.signals-display {
  margin: 30px 0;
}

.usage-guide {
  margin: 40px 0;
}

.usage-guide h3 {
  color: var(--primary-color);
  margin-bottom: 20px;
}

.guide-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.step-number {
  width: 32px;
  height: 32px;
  background: var(--primary-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.step-content h4 {
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.step-content p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.5;
}

.indicators-explanation {
  margin: 40px 0;
}

.indicators-explanation h3 {
  color: var(--primary-color);
  margin-bottom: 20px;
}

.indicator-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.indicator-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--border-color);
}

.indicator-card h4 {
  color: var(--primary-color);
  margin-bottom: 12px;
}

.indicator-formula {
  margin-bottom: 16px;
}

.indicator-formula strong {
  color: var(--text-primary);
  display: block;
  margin-bottom: 8px;
}

.indicator-formula ul {
  margin: 0;
  padding-left: 20px;
}

.indicator-formula li {
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.indicator-usage strong {
  color: var(--text-primary);
  display: block;
  margin-bottom: 8px;
}

.indicator-usage {
  color: var(--text-secondary);
  line-height: 1.5;
}

.risk-warning {
  margin-top: 40px;
  background: linear-gradient(135deg, #fff3cd, #ffeaa7);
  border: 1px solid #ffc107;
  border-radius: 8px;
  padding: 20px;
}

.risk-warning h3 {
  color: #856404;
  margin-bottom: 16px;
}

.warning-content p {
  color: #856404;
  font-weight: bold;
  margin-bottom: 12px;
}

.warning-content ul {
  margin: 0;
  padding-left: 20px;
}

.warning-content li {
  color: #856404;
  margin-bottom: 8px;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .stock-selector {
    flex-direction: column;
    align-items: stretch;
  }

  .stock-selector select {
    min-width: auto;
  }

  .guide-steps {
    grid-template-columns: 1fr;
  }

  .indicator-cards {
    grid-template-columns: 1fr;
  }
}
</style>
