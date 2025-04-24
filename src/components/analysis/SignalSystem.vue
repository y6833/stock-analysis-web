<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { StockData } from '@/types/stock'

const props = defineProps<{
  stockData: StockData
  indicatorData: any
}>()

// 信号状态
const signals = ref<{
  buy: boolean
  sell: boolean
  hold: boolean
  strength: number // -100 到 100，负数表示卖出信号强度，正数表示买入信号强度
  reasons: string[]
}>({
  buy: false,
  sell: false,
  hold: true,
  strength: 0,
  reasons: []
})

// 监听数据变化，重新计算信号
watch([() => props.stockData, () => props.indicatorData], () => {
  calculateSignals()
}, { deep: true })

// 初始化时计算信号
onMounted(() => {
  calculateSignals()
})

// 计算交易信号
function calculateSignals() {
  if (!props.stockData || !props.indicatorData) {
    resetSignals()
    return
  }
  
  const reasons: string[] = []
  let signalStrength = 0
  
  // 分析移动平均线
  if (props.indicatorData.sma) {
    const sma5 = props.indicatorData.sma.sma5
    const sma20 = props.indicatorData.sma.sma20
    
    if (sma5 && sma20 && sma5.length > 1 && sma20.length > 1) {
      const lastSma5 = sma5[sma5.length - 1]
      const lastSma20 = sma20[sma20.length - 1]
      const prevSma5 = sma5[sma5.length - 2]
      const prevSma20 = sma20[sma20.length - 2]
      
      // 金叉：5日均线上穿20日均线
      if (prevSma5 < prevSma20 && lastSma5 > lastSma20) {
        reasons.push('5日均线上穿20日均线，形成金叉')
        signalStrength += 30
      }
      
      // 死叉：5日均线下穿20日均线
      if (prevSma5 > prevSma20 && lastSma5 < lastSma20) {
        reasons.push('5日均线下穿20日均线，形成死叉')
        signalStrength -= 30
      }
      
      // 均线位置关系
      if (lastSma5 > lastSma20) {
        reasons.push('5日均线位于20日均线上方，短期趋势向上')
        signalStrength += 10
      } else {
        reasons.push('5日均线位于20日均线下方，短期趋势向下')
        signalStrength -= 10
      }
    }
  }
  
  // 分析MACD
  if (props.indicatorData.macd) {
    const { macdLine, signalLine, histogram } = props.indicatorData.macd
    
    if (macdLine && signalLine && histogram && histogram.length > 1) {
      const lastHistogram = histogram[histogram.length - 1]
      const prevHistogram = histogram[histogram.length - 2]
      
      // MACD金叉
      if (prevHistogram < 0 && lastHistogram > 0) {
        reasons.push('MACD金叉，柱状图由负转正')
        signalStrength += 25
      }
      
      // MACD死叉
      if (prevHistogram > 0 && lastHistogram < 0) {
        reasons.push('MACD死叉，柱状图由正转负')
        signalStrength -= 25
      }
      
      // MACD方向
      if (lastHistogram > 0 && lastHistogram > prevHistogram) {
        reasons.push('MACD柱状图为正且增长，动能增强')
        signalStrength += 15
      } else if (lastHistogram < 0 && lastHistogram < prevHistogram) {
        reasons.push('MACD柱状图为负且继续下降，下跌动能增强')
        signalStrength -= 15
      }
    }
  }
  
  // 分析RSI
  if (props.indicatorData.rsi && props.indicatorData.rsi.rsi14) {
    const rsi = props.indicatorData.rsi.rsi14
    const lastRsi = rsi[rsi.length - 1]
    
    if (lastRsi > 70) {
      reasons.push(`RSI(${lastRsi.toFixed(2)})处于超买区域，可能即将回调`)
      signalStrength -= 20
    } else if (lastRsi < 30) {
      reasons.push(`RSI(${lastRsi.toFixed(2)})处于超卖区域，可能即将反弹`)
      signalStrength += 20
    }
  }
  
  // 分析KDJ
  if (props.indicatorData.kdj) {
    const { k, d } = props.indicatorData.kdj
    
    if (k && d && k.length > 1 && d.length > 1) {
      const lastK = k[k.length - 1]
      const lastD = d[d.length - 1]
      const prevK = k[k.length - 2]
      const prevD = d[d.length - 2]
      
      // KDJ金叉
      if (prevK < prevD && lastK > lastD) {
        reasons.push('KDJ金叉，K线上穿D线')
        signalStrength += 20
      }
      
      // KDJ死叉
      if (prevK > prevD && lastK < lastD) {
        reasons.push('KDJ死叉，K线下穿D线')
        signalStrength -= 20
      }
      
      // KDJ超买超卖
      if (lastK > 80 && lastD > 80) {
        reasons.push('KDJ处于超买区域，可能即将回调')
        signalStrength -= 15
      } else if (lastK < 20 && lastD < 20) {
        reasons.push('KDJ处于超卖区域，可能即将反弹')
        signalStrength += 15
      }
    }
  }
  
  // 分析布林带
  if (props.indicatorData.bollinger) {
    const { upper, middle, lower } = props.indicatorData.bollinger
    const prices = props.stockData.prices
    
    if (upper && middle && lower && prices && prices.length > 0) {
      const lastPrice = prices[prices.length - 1]
      const lastUpper = upper[upper.length - 1]
      const lastMiddle = middle[middle.length - 1]
      const lastLower = lower[lower.length - 1]
      
      if (lastPrice > lastUpper) {
        reasons.push('价格突破布林带上轨，可能超买')
        signalStrength -= 15
      } else if (lastPrice < lastLower) {
        reasons.push('价格突破布林带下轨，可能超卖')
        signalStrength += 15
      }
      
      // 计算布林带宽度
      const bandWidth = (lastUpper - lastLower) / lastMiddle
      if (bandWidth < 0.1) {
        reasons.push('布林带收窄，可能即将突破')
        // 不改变信号强度，只是提示
      }
    }
  }
  
  // 分析形态识别
  if (props.indicatorData.patterns && props.indicatorData.patterns.length > 0) {
    props.indicatorData.patterns.forEach((pattern: any) => {
      reasons.push(pattern.description)
      
      if (pattern.pattern === 'head-and-shoulders' || pattern.pattern === 'double-top') {
        signalStrength -= 25
      } else if (pattern.pattern === 'inverse-head-and-shoulders' || pattern.pattern === 'double-bottom') {
        signalStrength += 25
      }
    })
  }
  
  // 限制信号强度范围
  signalStrength = Math.max(-100, Math.min(100, signalStrength))
  
  // 根据信号强度确定买入/卖出/持有信号
  let buy = false
  let sell = false
  let hold = true
  
  if (signalStrength >= 50) {
    buy = true
    sell = false
    hold = false
  } else if (signalStrength <= -50) {
    buy = false
    sell = true
    hold = false
  } else {
    buy = false
    sell = false
    hold = true
  }
  
  // 更新信号
  signals.value = {
    buy,
    sell,
    hold,
    strength: signalStrength,
    reasons
  }
}

// 重置信号
function resetSignals() {
  signals.value = {
    buy: false,
    sell: false,
    hold: true,
    strength: 0,
    reasons: ['数据不足，无法生成信号']
  }
}

// 信号强度文本
const strengthText = computed(() => {
  const strength = signals.value.strength
  
  if (strength >= 75) return '强烈买入'
  if (strength >= 50) return '买入'
  if (strength >= 25) return '弱买入'
  if (strength > -25 && strength < 25) return '中性'
  if (strength <= -75) return '强烈卖出'
  if (strength <= -50) return '卖出'
  if (strength <= -25) return '弱卖出'
  
  return '中性'
})

// 信号强度颜色
const strengthColor = computed(() => {
  const strength = signals.value.strength
  
  if (strength >= 50) return 'var(--success-color)'
  if (strength >= 25) return 'var(--success-light)'
  if (strength <= -50) return 'var(--danger-color)'
  if (strength <= -25) return 'var(--danger-light)'
  
  return 'var(--text-secondary)'
})
</script>

<template>
  <div class="signal-system">
    <div class="signal-header">
      <h3>交易信号系统</h3>
      <div class="signal-strength">
        <div class="strength-meter">
          <div 
            class="strength-bar" 
            :style="{ 
              width: `${Math.abs(signals.strength)}%`,
              backgroundColor: strengthColor,
              marginLeft: signals.strength >= 0 ? '50%' : `${50 - Math.abs(signals.strength)}%`
            }"
          ></div>
          <div class="strength-center-line"></div>
        </div>
        <div class="strength-labels">
          <span>卖出</span>
          <span>买入</span>
        </div>
      </div>
    </div>
    
    <div class="signal-content">
      <div class="signal-indicators">
        <div 
          class="signal-indicator" 
          :class="{ active: signals.buy }"
        >
          <div class="indicator-icon buy">买入</div>
          <div class="indicator-label">{{ signals.buy ? '推荐买入' : '不推荐买入' }}</div>
        </div>
        
        <div 
          class="signal-indicator" 
          :class="{ active: signals.hold }"
        >
          <div class="indicator-icon hold">持有</div>
          <div class="indicator-label">{{ signals.hold ? '建议持有' : '不建议持有' }}</div>
        </div>
        
        <div 
          class="signal-indicator" 
          :class="{ active: signals.sell }"
        >
          <div class="indicator-icon sell">卖出</div>
          <div class="indicator-label">{{ signals.sell ? '推荐卖出' : '不推荐卖出' }}</div>
        </div>
      </div>
      
      <div class="signal-summary">
        <div class="summary-title">信号强度: <span :style="{ color: strengthColor }">{{ strengthText }}</span></div>
        <div class="summary-value">{{ signals.strength }}</div>
      </div>
      
      <div class="signal-reasons">
        <h4>信号依据:</h4>
        <ul>
          <li v-for="(reason, index) in signals.reasons" :key="index">
            {{ reason }}
          </li>
        </ul>
      </div>
      
      <div class="signal-disclaimer">
        <p>免责声明: 交易信号仅供参考，不构成投资建议。投资决策请结合自身风险承受能力和市场判断。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.signal-system {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
  transition: all var(--transition-fast);
}

.signal-header {
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.signal-header h3 {
  margin: 0;
  font-size: var(--font-size-md);
  color: var(--primary-color);
}

.signal-strength {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.strength-meter {
  height: 8px;
  background-color: var(--bg-tertiary);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.strength-bar {
  height: 100%;
  transition: all var(--transition-normal);
}

.strength-center-line {
  position: absolute;
  top: 0;
  left: 50%;
  width: 2px;
  height: 100%;
  background-color: var(--border-color);
  transform: translateX(-50%);
}

.strength-labels {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.signal-content {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.signal-indicators {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.signal-indicator {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  background-color: var(--bg-secondary);
  opacity: 0.5;
  transition: all var(--transition-fast);
}

.signal-indicator.active {
  opacity: 1;
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.indicator-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
}

.indicator-icon.buy {
  background-color: var(--success-color);
}

.indicator-icon.hold {
  background-color: var(--warning-color);
}

.indicator-icon.sell {
  background-color: var(--danger-color);
}

.indicator-label {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.signal-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
}

.summary-title {
  font-size: var(--font-size-md);
  font-weight: 600;
}

.summary-value {
  font-size: var(--font-size-lg);
  font-weight: 700;
}

.signal-reasons {
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
}

.signal-reasons h4 {
  margin-top: 0;
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
}

.signal-reasons ul {
  margin: 0;
  padding-left: var(--spacing-lg);
}

.signal-reasons li {
  margin-bottom: var(--spacing-xs);
  color: var(--text-secondary);
}

.signal-disclaimer {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-style: italic;
  text-align: center;
  padding: var(--spacing-sm);
  background-color: var(--bg-tertiary);
  border-radius: var(--border-radius-sm);
}

@media (max-width: 768px) {
  .signal-indicators {
    flex-direction: column;
  }
}
</style>
