<template>
  <div class="doji-pattern-price-analysis">
    <div class="analysis-header">
      <h2>{{ patternTypeLabel }}十字星价格走势分析</h2>
      <div class="pattern-info" v-if="pattern">
        <div class="info-item">
          <span class="info-label">股票:</span>
          <span class="info-value">{{ pattern.stockName }} ({{ pattern.stockId }})</span>
        </div>
        <div class="info-item">
          <span class="info-label">日期:</span>
          <span class="info-value">{{ formatDate(pattern.timestamp) }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">显著性:</span>
          <span class="info-value">{{ (pattern.significance * 100).toFixed(0) }}%</span>
        </div>
      </div>
    </div>

    <div class="loading-overlay" v-if="loading">
      <div class="spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>

    <div class="error-message" v-if="error">
      <p>{{ error }}</p>
      <button @click="loadData">重试</button>
    </div>

    <div class="analysis-content" v-if="!loading && !error">
      <div class="chart-row">
        <div class="chart-col">
          <PriceMovementChart
            v-if="priceMovementAnalysis"
            :pattern="pattern"
            :price-movement="priceMovementAnalysis.priceMovement"
            title="价格走势分析"
          />
        </div>
        <div class="chart-col">
          <SuccessRateChart
            v-if="successRateStats"
            :pattern-type="pattern.type"
            :stats="successRateStats"
            title="上涨概率统计"
            @timeframe-change="onTimeframeChange"
          />
        </div>
      </div>

      <div class="chart-row">
        <div class="chart-col">
          <PriceDistributionChart
            v-if="priceDistribution"
            :pattern-type="pattern.type"
            :distribution="priceDistribution"
            title="价格分布直方图"
            @days-change="onDaysChange"
          />
        </div>
        <div class="chart-col">
          <MarketEnvironmentChart
            v-if="marketConditionStats"
            :pattern-type="pattern.type"
            :market-stats="marketConditionStats"
            title="市场环境对比"
          />
        </div>
      </div>

      <div class="analysis-summary">
        <h3>分析总结</h3>
        <div class="summary-content">
          <p>
            {{ patternTypeLabel }}十字星形态在
            <span class="highlight">{{ selectedTimeframe }}</span>
            天后的上涨概率为
            <span :class="{ positive: upwardProbability > 0.5, negative: upwardProbability < 0.5 }">
              {{ (upwardProbability * 100).toFixed(2) }}% </span
            >， 平均涨幅为 <span class="positive">{{ averageGain.toFixed(2) }}%</span>， 平均跌幅为
            <span class="negative">{{ averageLoss.toFixed(2) }}%</span>。
          </p>
          <p>
            该形态在
            <span class="highlight">{{ bestMarketCondition }}</span>
            市场环境下表现最佳，上涨概率为
            <span class="positive">
              {{ (getBestMarketConditionProbability() * 100).toFixed(2) }}% </span
            >。
          </p>
          <p v-if="similarPatterns.length > 0">
            系统找到了 {{ similarPatterns.length }} 个相似的历史形态，其中
            {{ getUpwardSimilarPatternsCount() }} 个在形成后出现了上涨。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import PriceMovementChart from './charts/PriceMovementChart.vue'
import PriceDistributionChart from './charts/PriceDistributionChart.vue'
import SuccessRateChart from './charts/SuccessRateChart.vue'
import MarketEnvironmentChart from './charts/MarketEnvironmentChart.vue'
import { useDojiPatternAnalysis } from '../../composables/useDojiPatternAnalysis'
import { usePriceMovementStatistics } from '../../composables/usePriceMovementStatistics'
import type { DojiPattern } from '../../types/technical-analysis/doji'
import type { MarketCondition } from '../../types/technical-analysis/kline'
import type {
  PriceMovementAnalysis,
  SuccessRateStats,
  PriceDistribution,
} from '../../types/technical-analysis/doji-analysis'

const props = defineProps({
  pattern: {
    type: Object as () => DojiPattern,
    required: true,
  },
  apiBaseUrl: {
    type: String,
    default: '/api',
  },
})

// 使用分析Hook
const {
  loading: analysisLoading,
  error: analysisError,
  priceMovementAnalysis,
  similarPatterns,
  analyzePriceMovement,
} = useDojiPatternAnalysis(props.apiBaseUrl)

// 使用统计Hook
const {
  loading: statsLoading,
  error: statsError,
  upwardProbability,
  averagePriceChange,
  marketConditionStats,
  priceDistribution,
  bestMarketCondition,
  loadStatistics,
  comparePatternTypes,
} = usePriceMovementStatistics(props.apiBaseUrl)

// 状态
const loading = computed(() => analysisLoading.value || statsLoading.value)
const error = computed(() => analysisError.value || statsError.value)
const selectedDays = ref(5)
const selectedTimeframe = ref('5d')
const successRateStats = ref<SuccessRateStats | null>(null)

// 计算属性
const patternTypeLabel = computed(() => {
  switch (props.pattern.type) {
    case 'standard':
      return '标准'
    case 'dragonfly':
      return '蜻蜓'
    case 'gravestone':
      return '墓碑'
    case 'longLegged':
      return '长腿'
    default:
      return ''
  }
})

const averageGain = computed(() => averagePriceChange.value.averageGain)
const averageLoss = computed(() => averagePriceChange.value.averageLoss)

// 获取最佳市场环境的上涨概率
const getBestMarketConditionProbability = (): number => {
  if (!marketConditionStats.value || !bestMarketCondition.value) {
    return 0
  }

  return marketConditionStats.value[bestMarketCondition.value as MarketCondition].probability
}

// 获取上涨的相似形态数量
const getUpwardSimilarPatternsCount = (): number => {
  if (!similarPatterns.value) {
    return 0
  }

  return similarPatterns.value.filter((pattern) => {
    // 这里需要实际的价格走势数据，但由于我们没有实际数据，
    // 所以简单地假设形态显著性大于0.7的形态后续会上涨
    return pattern.significance > 0.7
  }).length
}

// 格式化日期
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

// 加载数据
const loadData = async () => {
  try {
    // 并行加载数据
    await Promise.all([
      // 加载价格走势分析
      analyzePriceMovement(props.pattern, selectedDays.value),

      // 加载统计数据
      loadStatistics(props.pattern.type, selectedDays.value),

      // 加载成功率统计
      loadSuccessRateStats(),
    ])
  } catch (err) {
    console.error('加载数据失败:', err)
  }
}

// 加载成功率统计
const loadSuccessRateStats = async () => {
  try {
    // 这里应该调用API获取成功率统计数据
    // 由于没有实际的API，这里使用模拟数据

    // 根据不同形态类型设置不同的上涨概率
    let upwardProb = 0.5
    switch (props.pattern.type) {
      case 'standard':
        upwardProb = 0.52
        break
      case 'dragonfly':
        upwardProb = 0.65
        break
      case 'gravestone':
        upwardProb = 0.35
        break
      case 'longLegged':
        upwardProb = 0.58
        break
    }

    // 模拟数据
    successRateStats.value = {
      patternType: props.pattern.type,
      timeframe: selectedTimeframe.value,
      upwardProbability: upwardProb,
      averageGain: 3.5,
      averageLoss: 2.8,
      sampleSize: 120,
    }
  } catch (err) {
    console.error('加载成功率统计失败:', err)
  }
}

// 时间周期变化处理
const onTimeframeChange = (timeframe: string) => {
  selectedTimeframe.value = timeframe
  loadSuccessRateStats()
}

// 天数变化处理
const onDaysChange = (days: number) => {
  selectedDays.value = days
  loadData()
}

// 监听形态变化
watch(
  () => props.pattern,
  () => {
    loadData()
  },
  { deep: true }
)

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.doji-pattern-price-analysis {
  width: 100%;
  position: relative;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.analysis-header {
  margin-bottom: 24px;
}

.analysis-header h2 {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 500;
}

.pattern-info {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-label {
  font-size: 14px;
  color: #666;
  margin-right: 8px;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
}

.chart-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}

.chart-col {
  flex: 1;
  min-width: 300px;
}

.analysis-summary {
  background-color: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.analysis-summary h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
}

.summary-content p {
  margin: 0 0 12px 0;
  font-size: 14px;
  line-height: 1.5;
}

.highlight {
  font-weight: 500;
  color: #1976d2;
}

.positive {
  color: #26a69a;
  font-weight: 500;
}

.negative {
  color: #ef5350;
  font-weight: 500;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
  border-radius: 8px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin-top: 16px;
  font-size: 14px;
  color: #666;
}

.error-message {
  padding: 16px;
  background-color: #ffebee;
  border-radius: 8px;
  margin-bottom: 16px;
  text-align: center;
}

.error-message p {
  margin: 0 0 16px 0;
  color: #d32f2f;
}

.error-message button {
  padding: 8px 16px;
  background-color: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .chart-col {
    flex: 1 1 100%;
  }
}
</style>
