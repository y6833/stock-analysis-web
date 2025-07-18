<template>
  <div class="doji-pattern-history-list">
    <div class="list-header">
      <h3>{{ title }}</h3>
      <div class="filter-controls">
        <select v-model="filters.patternType" @change="applyFilters">
          <option value="">所有类型</option>
          <option value="standard">标准十字星</option>
          <option value="dragonfly">蜻蜓十字星</option>
          <option value="gravestone">墓碑十字星</option>
          <option value="longLegged">长腿十字星</option>
        </select>

        <select v-model="filters.sortBy" @change="applyFilters">
          <option value="timestamp">按日期</option>
          <option value="significance">按显著性</option>
          <option value="priceChange">按价格变化</option>
        </select>

        <select v-model="filters.sortDirection" @change="applyFilters">
          <option value="desc">降序</option>
          <option value="asc">升序</option>
        </select>

        <label class="checkbox-label">
          <input type="checkbox" v-model="filters.isUpward" @change="applyFilters" />
          仅显示上涨
        </label>
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

    <div class="empty-message" v-if="!loading && !error && patterns.length === 0">
      <p>没有找到符合条件的历史形态</p>
    </div>

    <div class="pattern-list" v-if="!loading && !error && patterns.length > 0">
      <div
        v-for="pattern in patterns"
        :key="pattern.id"
        class="pattern-item"
        :class="{ selected: selectedPatternId === pattern.id }"
        @click="selectPattern(pattern)"
      >
        <div class="pattern-header">
          <div class="pattern-type" :class="pattern.type">
            {{ getPatternTypeLabel(pattern.type) }}
          </div>
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
      </div>
    </div>

    <div class="pagination" v-if="totalPages > 1">
      <button class="page-btn prev" :disabled="!hasPrevPage" @click="prevPage">上一页</button>

      <div class="page-info">{{ currentPage }} / {{ totalPages }}</div>

      <button class="page-btn next" :disabled="!hasNextPage" @click="nextPage">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useHistoricalPatterns } from '../../composables/useHistoricalPatterns'
import type { DojiPattern, DojiType } from '../../types/technical-analysis/doji'
import type { HistoricalPatternQueryParams } from '../../types/technical-analysis/historical-patterns'

const props = defineProps({
  title: {
    type: String,
    default: '历史十字星形态',
  },
  stockId: {
    type: String,
    default: '',
  },
  patternType: {
    type: String as () => DojiType | '',
    default: '',
  },
  days: {
    type: Number,
    default: 30,
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
const {
  loading,
  error,
  patterns,
  total,
  currentPage,
  totalPages,
  hasNextPage,
  hasPrevPage,
  queryHistoricalPatterns,
  getPatternDetails,
  nextPage,
  prevPage,
} = useHistoricalPatterns(props.apiBaseUrl, props.useMock)

// 过滤条件
const filters = ref({
  patternType: props.patternType,
  sortBy: 'timestamp' as 'timestamp' | 'significance' | 'priceChange',
  sortDirection: 'desc' as 'asc' | 'desc',
  isUpward: false,
})

// 选中的形态ID
const selectedPatternId = ref<string | null>(null)

// 加载数据
const loadData = async () => {
  const now = Date.now()
  const startTime = now - props.days * 86400000 // days天前

  const params: HistoricalPatternQueryParams = {
    startTime,
    endTime: now,
    pageSize: 10,
    page: 1,
  }

  // 添加过滤条件
  if (props.stockId) {
    params.stockId = props.stockId
  }

  if (filters.value.patternType) {
    params.patternType = filters.value.patternType as DojiType
  }

  if (filters.value.isUpward !== undefined) {
    params.isUpward = filters.value.isUpward
  }

  // 添加排序条件
  params.sortBy = filters.value.sortBy
  params.sortDirection = filters.value.sortDirection

  await queryHistoricalPatterns(params)
}

// 应用过滤器
const applyFilters = () => {
  loadData()
}

// 选择形态
const selectPattern = (pattern: DojiPattern) => {
  selectedPatternId.value = pattern.id
  emit('patternSelected', pattern)
}

// 获取形态类型标签
const getPatternTypeLabel = (type: DojiType): string => {
  switch (type) {
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
}

// 格式化日期
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

// 监听属性变化
watch(
  () => [props.stockId, props.patternType, props.days],
  () => {
    filters.value.patternType = props.patternType
    loadData()
  }
)

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.doji-pattern-history-list {
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

.pattern-type {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: white;
}

.pattern-type.standard {
  background-color: #1976d2;
}

.pattern-type.dragonfly {
  background-color: #43a047;
}

.pattern-type.gravestone {
  background-color: #e53935;
}

.pattern-type.longLegged {
  background-color: #7b1fa2;
}

.pattern-date {
  font-size: 12px;
  color: #666;
}

.pattern-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.positive {
  color: #26a69a;
}

.negative {
  color: #ef5350;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 16px;
}

.page-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  margin: 0 12px;
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
