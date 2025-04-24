<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { StockData } from '@/types/stock'
import { technicalIndicatorService } from '@/services/technicalIndicatorService'

const props = defineProps<{
  stockData: StockData
  activeIndicators: string[]
}>()

const emit = defineEmits<{
  (e: 'update:activeIndicators', indicators: string[]): void
  (e: 'indicatorDataUpdated', indicatorData: any): void
}>()

// 可用的技术指标
const availableIndicators = [
  { id: 'sma', name: '移动平均线', description: '简单移动平均线 (SMA)' },
  { id: 'ema', name: '指数平均线', description: '指数移动平均线 (EMA)' },
  { id: 'macd', name: 'MACD', description: '移动平均线收敛/发散指标' },
  { id: 'rsi', name: 'RSI', description: '相对强弱指标' },
  { id: 'kdj', name: 'KDJ', description: '随机指标' },
  { id: 'bollinger', name: '布林带', description: '布林带指标' },
  { id: 'volume', name: '成交量', description: '成交量分析' },
  { id: 'pattern', name: '形态识别', description: '自动识别常见形态' }
]

// 指标数据
const indicatorData = ref<any>(null)
const isCalculating = ref(false)
const calculationError = ref<string | null>(null)

// 计算所有技术指标数据
async function calculateIndicators() {
  if (!props.stockData || !props.stockData.prices || props.stockData.prices.length === 0) {
    indicatorData.value = null
    return
  }

  if (props.activeIndicators.length === 0) {
    indicatorData.value = null
    return
  }

  isCalculating.value = true
  calculationError.value = null

  try {
    // 使用异步方法计算指标，可能在 Web Worker 中运行
    const result = await technicalIndicatorService.calculateIndicators(
      props.stockData,
      props.activeIndicators
    )

    indicatorData.value = result

    // 通知父组件指标数据已更新
    emit('indicatorDataUpdated', result)
  } catch (error) {
    console.error('Failed to calculate indicators:', error)
    calculationError.value = '计算指标时出错，请刷新重试'
  } finally {
    isCalculating.value = false
  }
}

// 监听股票数据变化
watch(() => props.stockData, () => {
  calculateIndicators()
}, { deep: true })

// 监听活跃指标变化
watch(() => props.activeIndicators, () => {
  calculateIndicators()
}, { deep: true })

// 初始化时计算指标
onMounted(() => {
  calculateIndicators()
})

// 切换指标
const toggleIndicator = (indicatorId: string) => {
  const newActiveIndicators = [...props.activeIndicators]

  if (newActiveIndicators.includes(indicatorId)) {
    // 移除指标
    const index = newActiveIndicators.indexOf(indicatorId)
    newActiveIndicators.splice(index, 1)
  } else {
    // 添加指标
    newActiveIndicators.push(indicatorId)
  }

  emit('update:activeIndicators', newActiveIndicators)
}

// 获取指标的最新值
const getLatestValue = (indicatorId: string) => {
  if (!indicatorData.value) return null

  switch (indicatorId) {
    case 'sma':
      return {
        sma5: indicatorData.value.sma?.sma5[indicatorData.value.sma.sma5.length - 1].toFixed(2),
        sma10: indicatorData.value.sma?.sma10[indicatorData.value.sma.sma10.length - 1].toFixed(2),
        sma20: indicatorData.value.sma?.sma20[indicatorData.value.sma.sma20.length - 1].toFixed(2),
        sma60: indicatorData.value.sma?.sma60[indicatorData.value.sma.sma60.length - 1].toFixed(2)
      }
    case 'ema':
      return {
        ema12: indicatorData.value.ema?.ema12[indicatorData.value.ema.ema12.length - 1].toFixed(2),
        ema26: indicatorData.value.ema?.ema26[indicatorData.value.ema.ema26.length - 1].toFixed(2)
      }
    case 'macd':
      return {
        macd: indicatorData.value.macd?.macdLine[indicatorData.value.macd.macdLine.length - 1].toFixed(2),
        signal: indicatorData.value.macd?.signalLine[indicatorData.value.macd.signalLine.length - 1].toFixed(2),
        histogram: indicatorData.value.macd?.histogram[indicatorData.value.macd.histogram.length - 1].toFixed(2)
      }
    case 'rsi':
      return {
        rsi14: indicatorData.value.rsi?.rsi14[indicatorData.value.rsi.rsi14.length - 1].toFixed(2)
      }
    case 'kdj':
      return {
        k: indicatorData.value.kdj?.k[indicatorData.value.kdj.k.length - 1].toFixed(2),
        d: indicatorData.value.kdj?.d[indicatorData.value.kdj.d.length - 1].toFixed(2),
        j: indicatorData.value.kdj?.j[indicatorData.value.kdj.j.length - 1].toFixed(2)
      }
    case 'bollinger':
      return {
        upper: indicatorData.value.bollinger?.upper[indicatorData.value.bollinger.upper.length - 1].toFixed(2),
        middle: indicatorData.value.bollinger?.middle[indicatorData.value.bollinger.middle.length - 1].toFixed(2),
        lower: indicatorData.value.bollinger?.lower[indicatorData.value.bollinger.lower.length - 1].toFixed(2)
      }
    case 'pattern':
      return indicatorData.value.patterns?.length > 0
        ? indicatorData.value.patterns[0].pattern
        : '未检测到形态'
    default:
      return null
  }
}

// 获取指标的分析结果
const getIndicatorAnalysis = (indicatorId: string) => {
  if (!indicatorData.value) return ''

  switch (indicatorId) {
    case 'sma':
      if (!indicatorData.value.sma) return ''
      const sma5 = indicatorData.value.sma.sma5[indicatorData.value.sma.sma5.length - 1]
      const sma20 = indicatorData.value.sma.sma20[indicatorData.value.sma.sma20.length - 1]
      const prevSma5 = indicatorData.value.sma.sma5[indicatorData.value.sma.sma5.length - 2]
      const prevSma20 = indicatorData.value.sma.sma20[indicatorData.value.sma.sma20.length - 2]

      if (prevSma5 < prevSma20 && sma5 > sma20) {
        return '5日均线上穿20日均线，形成金叉，可能是买入信号'
      } else if (prevSma5 > prevSma20 && sma5 < sma20) {
        return '5日均线下穿20日均线，形成死叉，可能是卖出信号'
      } else if (sma5 > sma20) {
        return '5日均线位于20日均线上方，短期趋势向上'
      } else {
        return '5日均线位于20日均线下方，短期趋势向下'
      }

    case 'macd':
      if (!indicatorData.value.macd) return ''
      const macd = indicatorData.value.macd.macdLine[indicatorData.value.macd.macdLine.length - 1]
      const signal = indicatorData.value.macd.signalLine[indicatorData.value.macd.signalLine.length - 1]
      const histogram = indicatorData.value.macd.histogram[indicatorData.value.macd.histogram.length - 1]
      const prevHistogram = indicatorData.value.macd.histogram[indicatorData.value.macd.histogram.length - 2]

      if (histogram > 0 && prevHistogram < 0) {
        return 'MACD金叉，可能是买入信号'
      } else if (histogram < 0 && prevHistogram > 0) {
        return 'MACD死叉，可能是卖出信号'
      } else if (histogram > 0) {
        return 'MACD柱状图为正，趋势向上'
      } else {
        return 'MACD柱状图为负，趋势向下'
      }

    case 'rsi':
      if (!indicatorData.value.rsi) return ''
      const rsi = indicatorData.value.rsi.rsi14[indicatorData.value.rsi.rsi14.length - 1]

      if (rsi > 70) {
        return 'RSI高于70，处于超买区域，可能即将回调'
      } else if (rsi < 30) {
        return 'RSI低于30，处于超卖区域，可能即将反弹'
      } else if (rsi > 50) {
        return 'RSI高于50，中等偏强'
      } else {
        return 'RSI低于50，中等偏弱'
      }

    case 'kdj':
      if (!indicatorData.value.kdj) return ''
      const k = indicatorData.value.kdj.k[indicatorData.value.kdj.k.length - 1]
      const d = indicatorData.value.kdj.d[indicatorData.value.kdj.d.length - 1]
      const j = indicatorData.value.kdj.j[indicatorData.value.kdj.j.length - 1]
      const prevK = indicatorData.value.kdj.k[indicatorData.value.kdj.k.length - 2]
      const prevD = indicatorData.value.kdj.d[indicatorData.value.kdj.d.length - 2]

      if (k > d && prevK < prevD) {
        return 'KDJ金叉，可能是买入信号'
      } else if (k < d && prevK > prevD) {
        return 'KDJ死叉，可能是卖出信号'
      } else if (k > 80 && d > 80) {
        return 'KDJ处于超买区域，可能即将回调'
      } else if (k < 20 && d < 20) {
        return 'KDJ处于超卖区域，可能即将反弹'
      } else {
        return 'KDJ处于中性区域'
      }

    case 'bollinger':
      if (!indicatorData.value.bollinger) return ''
      const price = props.stockData.prices[props.stockData.prices.length - 1]
      const upper = indicatorData.value.bollinger.upper[indicatorData.value.bollinger.upper.length - 1]
      const middle = indicatorData.value.bollinger.middle[indicatorData.value.bollinger.middle.length - 1]
      const lower = indicatorData.value.bollinger.lower[indicatorData.value.bollinger.lower.length - 1]

      if (price > upper) {
        return '价格突破布林带上轨，可能超买'
      } else if (price < lower) {
        return '价格突破布林带下轨，可能超卖'
      } else if (price > middle) {
        return '价格位于布林带上方，偏强走势'
      } else {
        return '价格位于布林带下方，偏弱走势'
      }

    case 'pattern':
      if (!indicatorData.value.patterns || indicatorData.value.patterns.length === 0) {
        return '未检测到明显形态'
      }
      return indicatorData.value.patterns[0].description

    default:
      return ''
  }
}
</script>

<template>
  <div class="technical-indicator-panel">
    <div class="indicator-selector">
      <div
        v-for="indicator in availableIndicators"
        :key="indicator.id"
        class="indicator-option"
        :class="{ active: activeIndicators.includes(indicator.id) }"
        @click="toggleIndicator(indicator.id)"
      >
        <div class="indicator-name">{{ indicator.name }}</div>
        <div class="indicator-description">{{ indicator.description }}</div>
      </div>
    </div>

    <div v-if="isCalculating" class="loading-container">
      <div class="loading-spinner"></div>
      <p>正在计算技术指标...</p>
    </div>

    <div v-else-if="calculationError" class="error-container">
      <p class="error-message">{{ calculationError }}</p>
      <button class="btn btn-primary" @click="calculateIndicators">重试</button>
    </div>

    <div v-else class="indicator-details">
      <div
        v-for="indicator in availableIndicators.filter(i => activeIndicators.includes(i.id))"
        :key="indicator.id"
        class="indicator-detail-card"
      >
        <div class="indicator-header">
          <h3>{{ indicator.name }}</h3>
          <button class="btn-close" @click="toggleIndicator(indicator.id)">×</button>
        </div>

        <div class="indicator-values">
          <template v-if="indicator.id === 'sma' && getLatestValue('sma')">
            <div class="value-item">
              <span class="value-label">SMA5:</span>
              <span class="value-number">{{ getLatestValue('sma').sma5 }}</span>
            </div>
            <div class="value-item">
              <span class="value-label">SMA10:</span>
              <span class="value-number">{{ getLatestValue('sma').sma10 }}</span>
            </div>
            <div class="value-item">
              <span class="value-label">SMA20:</span>
              <span class="value-number">{{ getLatestValue('sma').sma20 }}</span>
            </div>
            <div class="value-item">
              <span class="value-label">SMA60:</span>
              <span class="value-number">{{ getLatestValue('sma').sma60 }}</span>
            </div>
          </template>

          <template v-else-if="indicator.id === 'ema' && getLatestValue('ema')">
            <div class="value-item">
              <span class="value-label">EMA12:</span>
              <span class="value-number">{{ getLatestValue('ema').ema12 }}</span>
            </div>
            <div class="value-item">
              <span class="value-label">EMA26:</span>
              <span class="value-number">{{ getLatestValue('ema').ema26 }}</span>
            </div>
          </template>

          <template v-else-if="indicator.id === 'macd' && getLatestValue('macd')">
            <div class="value-item">
              <span class="value-label">MACD:</span>
              <span class="value-number">{{ getLatestValue('macd').macd }}</span>
            </div>
            <div class="value-item">
              <span class="value-label">Signal:</span>
              <span class="value-number">{{ getLatestValue('macd').signal }}</span>
            </div>
            <div class="value-item">
              <span class="value-label">Histogram:</span>
              <span
                class="value-number"
                :class="{
                  'positive': parseFloat(getLatestValue('macd').histogram) > 0,
                  'negative': parseFloat(getLatestValue('macd').histogram) < 0
                }"
              >
                {{ getLatestValue('macd').histogram }}
              </span>
            </div>
          </template>

          <template v-else-if="indicator.id === 'rsi' && getLatestValue('rsi')">
            <div class="value-item">
              <span class="value-label">RSI(14):</span>
              <span
                class="value-number"
                :class="{
                  'overbought': parseFloat(getLatestValue('rsi').rsi14) > 70,
                  'oversold': parseFloat(getLatestValue('rsi').rsi14) < 30
                }"
              >
                {{ getLatestValue('rsi').rsi14 }}
              </span>
            </div>
          </template>

          <template v-else-if="indicator.id === 'kdj' && getLatestValue('kdj')">
            <div class="value-item">
              <span class="value-label">K:</span>
              <span class="value-number">{{ getLatestValue('kdj').k }}</span>
            </div>
            <div class="value-item">
              <span class="value-label">D:</span>
              <span class="value-number">{{ getLatestValue('kdj').d }}</span>
            </div>
            <div class="value-item">
              <span class="value-label">J:</span>
              <span
                class="value-number"
                :class="{
                  'overbought': parseFloat(getLatestValue('kdj').j) > 100,
                  'oversold': parseFloat(getLatestValue('kdj').j) < 0
                }"
              >
                {{ getLatestValue('kdj').j }}
              </span>
            </div>
          </template>

          <template v-else-if="indicator.id === 'bollinger' && getLatestValue('bollinger')">
            <div class="value-item">
              <span class="value-label">上轨:</span>
              <span class="value-number">{{ getLatestValue('bollinger').upper }}</span>
            </div>
            <div class="value-item">
              <span class="value-label">中轨:</span>
              <span class="value-number">{{ getLatestValue('bollinger').middle }}</span>
            </div>
            <div class="value-item">
              <span class="value-label">下轨:</span>
              <span class="value-number">{{ getLatestValue('bollinger').lower }}</span>
            </div>
          </template>

          <template v-else-if="indicator.id === 'pattern'">
            <div class="value-item pattern-item">
              <span class="value-label">检测到的形态:</span>
              <span class="value-text">{{ getLatestValue('pattern') }}</span>
            </div>
          </template>
        </div>

        <div class="indicator-analysis">
          {{ getIndicatorAnalysis(indicator.id) }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.technical-indicator-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.indicator-selector {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.indicator-option {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-md);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex: 1;
  min-width: 150px;
}

.indicator-option:hover {
  background-color: var(--bg-tertiary);
  transform: translateY(-2px);
}

.indicator-option.active {
  background-color: var(--primary-light);
  color: white;
  border-color: var(--primary-color);
}

.indicator-name {
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
}

.indicator-description {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.indicator-option.active .indicator-description {
  color: rgba(255, 255, 255, 0.8);
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  gap: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  min-height: 200px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(66, 185, 131, 0.2);
  border-top: 4px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: var(--danger-color);
  font-weight: 500;
}

.indicator-details {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-md);
}

.indicator-detail-card {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
  transition: all var(--transition-fast);
}

.indicator-detail-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.indicator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
}

.indicator-header h3 {
  margin: 0;
  font-size: var(--font-size-md);
  color: var(--primary-color);
}

.btn-close {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background-color: transparent;
  color: var(--text-secondary);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-close:hover {
  background-color: rgba(231, 76, 60, 0.1);
  color: var(--danger-color);
}

.indicator-values {
  padding: var(--spacing-md);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--spacing-sm);
}

.value-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.pattern-item {
  grid-column: 1 / -1;
}

.value-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.value-number {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-primary);
}

.value-text {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.positive {
  color: var(--stock-up);
}

.negative {
  color: var(--stock-down);
}

.overbought {
  color: var(--stock-up);
}

.oversold {
  color: var(--stock-down);
}

.indicator-analysis {
  padding: var(--spacing-md);
  border-top: 1px solid var(--border-light);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  background-color: var(--bg-secondary);
}

@media (max-width: 768px) {
  .indicator-details {
    grid-template-columns: 1fr;
  }
}
</style>
