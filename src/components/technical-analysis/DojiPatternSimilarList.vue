<template>
  <div class="doji-pattern-similar-list">
    <div class="list-header">
      <h3>{{ title }}</h3>
      <div class="filter-controls" v-if="similarPatterns.length > 0">
        <label class="checkbox-label">
          <input type="checkbox" v-model="onlyUpward" @change="filterPatterns" />
          仅显示上涨
        </label>

        <select v-model="minSimilarity" @change="loadData">
          <option value="0.7">相似度 > 70%</option>
          <option value="0.8">相似度 > 80%</option>
          <option value="0.9">相似度 > 90%</option>
        </select>
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

    <div class="empty-message" v-if="!loading && !error && filteredPatterns.length === 0">
      <p>没有找到相似的历史形态</p>
    </div>

    <div class="pattern-list" v-if="!loading && !error && filteredPatterns.length > 0">
      <div
        v-for="pattern in filteredPatterns"
        :key="pattern.id"
        class="pattern-item"
        :class="{ selected: selectedPatternId === pattern.id }"
        @click="selectPattern(pattern)"
      >
        <div class="pattern-header">
          <div class="similarity-badge">相似度: {{ (pattern.similarity * 100).toFixed(0) }}%</div>
          <div class="pattern-date">
            {{ formatDate(pattern.timestamp) }}
          </div>
        </div>

        <div class="pattern-content">
          <div class="stock-info">
            <span class="stock-name">{{ pattern.stockName }}</span>
            <span class="stock-id">{{ pattern.stockId }}</span>
          </div>

          <div class="pattern-stats">
            <div class="stat-item">
              <span class="stat-label">显著性:</span>
              <span class="stat-value">{{ (pattern.significance * 100).toFixed(0) }}%</span>
            </div>

            <div class="stat-item" v-if="pattern.priceChange">
              <span class="stat-label">5天涨跌:</span>
              <span
                class="stat-value"
                :class="{
                  positive: pattern.priceChange.day5 > 0,
                  negative: pattern.priceChange.day5 < 0,
                }"
              >
                {{ pattern.priceChange.day5.toFixed(2) }}%
              </span>
            </div>
          </div>
        </div>

        <div class="price-changes" v-if="pattern.priceChange">
          <div
            class="price-change-item"
            :class="{
              positive: pattern.priceChange.day1 > 0,
              negative: pattern.priceChange.day1 < 0,
            }"
          >
            1天: {{ pattern.priceChange.day1.toFixed(2) }}%
          </div>
          <div
            class="price-change-item"
            :class="{
              positive: pattern.priceChange.day3 > 0,
              negative: pattern.priceChange.day3 < 0,
            }"
          >
            3天: {{ pattern.priceChange.day3.toFixed(2) }}%
          </div>
          <div
            class="price-change-item"
            :class="{
              positive: pattern.priceChange.day5 > 0,
              negative: pattern.priceChange.day5 < 0,
            }"
          >
            5天: {{ pattern.priceChange.day5.toFixed(2) }}%
          </div>
          <div
            class="price-change-item"
            :class="{
              positive: pattern.priceChange.day10 > 0,
              negative: pattern.priceChange.day10 < 0,
            }"
          >
            10天: {{ pattern.priceChange.day10.toFixed(2) }}%
          </div>
        </div>
      </div>
    </div>

    <div class="summary" v-if="!loading && !error && similarPatterns.length > 0">
      <p>
        找到 {{ similarPatterns.length }} 个相似形态，其中 {{ upwardCount }} 个上涨， 上涨概率:
        <span :class="{ positive: upwardProbability > 0.5, negative: upwardProbability < 0.5 }">
          {{ (upwardProbability * 100).toFixed(2) }}%
        </span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useHistoricalPatterns } from '../../composables/useHistoricalPatterns'
import type { DojiPattern } from '../../types/technical-analysis/doji'

const props = defineProps({
  title: {
    type: String,
    default: '相似形态',
  },
  pattern: {
    type: Object as () => DojiPattern,
    required: true,
  },
  limit: {
    type: Number,
    default: 10,
  },
  apiBaseUrl: {
    type: String,
    default: '/api',
  },
  useMock: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['patternSelected'])

// 使用历史形态Hook
const { loading, error, similarPatterns, querySimilarPatterns } = useHistoricalPatterns(
  props.apiBaseUrl,
  props.useMock
)

// 过滤条件
const minSimilarity = ref(0.7)
const onlyUpward = ref(false)
const selectedPatternId = ref<string | null>(null)

// 过滤后的形态
const filteredPatterns = computed(() => {
  if (!similarPatterns.value) return []

  return similarPatterns.value.filter((pattern) => {
    // 过滤相似度
    if (pattern.similarity < minSimilarity.value) {
      return false
    }

    // 过滤上涨
    if (onlyUpward.value && pattern.isUpward !== undefined && !pattern.isUpward) {
      return false
    }

    return true
  })
})

// 上涨数量
const upwardCount = computed(() => {
  if (!similarPatterns.value) return 0

  return similarPatterns.value.filter(
    (pattern) => pattern.isUpward !== undefined && pattern.isUpward
  ).length
})

// 上涨概率
const upwardProbability = computed(() => {
  if (!similarPatterns.value || similarPatterns.value.length === 0) return 0

  return upwardCount.value / similarPatterns.value.length
})

// 加载数据
const loadData = async () => {
  if (!props.pattern || !props.pattern.id) return

  await querySimilarPatterns({
    patternId: props.pattern.id,
    limit: props.limit,
    minSimilarity: minSimilarity.value,
  })
}

// 过滤形态
const filterPatterns = () => {
  // 过滤是在计算属性中完成的，这里不需要额外操作
}

// 选择形态
const selectPattern = (pattern: DojiPattern & { similarity: number }) => {
  selectedPatternId.value = pattern.id
  emit('patternSelected', pattern)
}

// 格式化日期
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

// 监听形态变化
watch(
  () => props.pattern,
  () => {
    if (props.pattern && props.pattern.id) {
      loadData()
    }
  },
  { deep: true }
)

onMounted(() => {
  if (props.pattern && props.pattern.id) {
    loadData()
  }
})
</script>

<style scoped>
.doji-pattern-similar-list {
  width: 100%;
  position: relative;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 16px;
}

.list-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.list-header h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 500;
}

.filter-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.filter-controls select {
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background-color: #f5f5f5;
  font-size: 14px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  font-size: 14px;
  cursor: pointer;
}

.checkbox-label input {
  margin-right: 4px;
}

.pattern-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.pattern-item {
  padding: 12px;
  border-radius: 6px;
  background-color: #f9f9f9;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.pattern-item:hover {
  background-color: #f0f0f0;
}

.pattern-item.selected {
  background-color: #e3f2fd;
  border-left: 3px solid #1976d2;
}

.pattern-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.similarity-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  background-color: #1976d2;
}

.pattern-date {
  font-size: 12px;
  color: #666;
}

.pattern-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stock-info {
  display: flex;
  flex-direction: column;
}

.stock-name {
  font-size: 14px;
  font-weight: 500;
}

.stock-id {
  font-size: 12px;
  color: #666;
}

.pattern-stats {
  display: flex;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-right: 4px;
}

.stat-value {
  font-size: 12px;
  font-weight: 500;
}

.price-changes {
  display: flex;
  justify-content: space-between;
  background-color: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  margin-top: 8px;
}

.price-change-item {
  font-size: 12px;
  font-weight: 500;
}

.positive {
  color: #26a69a;
}

.negative {
  color: #ef5350;
}

.summary {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
  font-size: 14px;
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

.empty-message {
  padding: 32px 16px;
  text-align: center;
  color: #666;
  font-size: 14px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
