<template>
  <div class="doji-pattern-history-query">
    <div class="query-header">
      <h2>十字星形态历史查询</h2>
      <div class="query-form">
        <div class="form-group">
          <label>股票代码</label>
          <input type="text" v-model="queryParams.stockId" placeholder="输入股票代码" />
        </div>

        <div class="form-group">
          <label>形态类型</label>
          <select v-model="queryParams.patternType">
            <option value="">所有类型</option>
            <option value="standard">标准十字星</option>
            <option value="dragonfly">蜻蜓十字星</option>
            <option value="gravestone">墓碑十字星</option>
            <option value="longLegged">长腿十字星</option>
          </select>
        </div>

        <div class="form-group">
          <label>查询天数</label>
          <select v-model="queryParams.days">
            <option :value="7">最近7天</option>
            <option :value="30">最近30天</option>
            <option :value="90">最近90天</option>
            <option :value="180">最近180天</option>
            <option :value="365">最近一年</option>
          </select>
        </div>

        <button class="query-button" @click="executeQuery">查询</button>
      </div>
    </div>

    <div class="query-content">
      <div class="content-left">
        <DojiPatternHistoryList
          title="历史十字星形态"
          :stock-id="queryParams.stockId"
          :pattern-type="queryParams.patternType"
          :days="queryParams.days"
          :api-base-url="apiBaseUrl"
          :use-mock="useMock"
          @pattern-selected="onPatternSelected"
        />
      </div>

      <div class="content-right">
        <div v-if="!selectedPattern" class="no-selection">
          <p>请从左侧列表选择一个形态查看详情</p>
        </div>

        <div v-else class="pattern-details">
          <div class="details-header">
            <h3>形态详情</h3>
            <div class="pattern-info">
              <div class="info-item">
                <span class="info-label">股票:</span>
                <span class="info-value"
                  >{{ selectedPattern.stockName }} ({{ selectedPattern.stockId }})</span
                >
              </div>
              <div class="info-item">
                <span class="info-label">日期:</span>
                <span class="info-value">{{ formatDate(selectedPattern.timestamp) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">类型:</span>
                <span class="info-value"
                  >{{ getPatternTypeLabel(selectedPattern.type) }}十字星</span
                >
              </div>
            </div>
          </div>

          <div class="details-content">
            <div class="details-section">
              <h4>形态特征</h4>
              <div class="feature-grid">
                <div class="feature-item">
                  <span class="feature-label">显著性:</span>
                  <span class="feature-value"
                    >{{ (selectedPattern.significance * 100).toFixed(0) }}%</span
                  >
                </div>
                <div class="feature-item">
                  <span class="feature-label">趋势:</span>
                  <span class="feature-value">{{
                    getTrendLabel(selectedPattern.context.trend)
                  }}</span>
                </div>
                <div class="feature-item">
                  <span class="feature-label">支撑/阻力:</span>
                  <span class="feature-value">{{
                    selectedPattern.context.nearSupportResistance ? '是' : '否'
                  }}</span>
                </div>
                <div class="feature-item">
                  <span class="feature-label">成交量变化:</span>
                  <span
                    class="feature-value"
                    :class="{
                      positive: selectedPattern.context.volumeChange > 0,
                      negative: selectedPattern.context.volumeChange < 0,
                    }"
                  >
                    {{ selectedPattern.context.volumeChange.toFixed(2) }}%
                  </span>
                </div>
              </div>
            </div>

            <div class="details-section">
              <h4>K线数据</h4>
              <div class="candle-data">
                <div class="candle-item">
                  <span class="candle-label">开盘价:</span>
                  <span class="candle-value">{{ selectedPattern.candle.open.toFixed(2) }}</span>
                </div>
                <div class="candle-item">
                  <span class="candle-label">最高价:</span>
                  <span class="candle-value">{{ selectedPattern.candle.high.toFixed(2) }}</span>
                </div>
                <div class="candle-item">
                  <span class="candle-label">最低价:</span>
                  <span class="candle-value">{{ selectedPattern.candle.low.toFixed(2) }}</span>
                </div>
                <div class="candle-item">
                  <span class="candle-label">收盘价:</span>
                  <span class="candle-value">{{ selectedPattern.candle.close.toFixed(2) }}</span>
                </div>
                <div class="candle-item">
                  <span class="candle-label">成交量:</span>
                  <span class="candle-value">{{
                    formatVolume(selectedPattern.candle.volume)
                  }}</span>
                </div>
              </div>
            </div>

            <DojiPatternSimilarList
              title="相似形态"
              :pattern="selectedPattern"
              :limit="10"
              :api-base-url="apiBaseUrl"
              :use-mock="useMock"
              @pattern-selected="onSimilarPatternSelected"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import DojiPatternHistoryList from './DojiPatternHistoryList.vue'
import DojiPatternSimilarList from './DojiPatternSimilarList.vue'
import type { DojiPattern, DojiType } from '../../types/technical-analysis/doji'

const props = defineProps({
  apiBaseUrl: {
    type: String,
    default: '/api',
  },
  useMock: {
    type: Boolean,
    default: true,
  },
})

// 查询参数
const queryParams = reactive({
  stockId: '',
  patternType: '' as DojiType | '',
  days: 30,
})

// 选中的形态
const selectedPattern = ref<DojiPattern | null>(null)

// 执行查询
const executeQuery = () => {
  // 查询逻辑在DojiPatternHistoryList组件中实现
  // 这里只需要清空选中的形态
  selectedPattern.value = null
}

// 选择形态
const onPatternSelected = (pattern: DojiPattern) => {
  selectedPattern.value = pattern
}

// 选择相似形态
const onSimilarPatternSelected = (pattern: DojiPattern) => {
  selectedPattern.value = pattern
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

// 获取趋势标签
const getTrendLabel = (trend: string): string => {
  switch (trend) {
    case 'uptrend':
      return '上升'
    case 'downtrend':
      return '下降'
    case 'sideways':
      return '盘整'
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

// 格式化成交量
const formatVolume = (volume: number): string => {
  if (volume >= 100000000) {
    return (volume / 100000000).toFixed(2) + '亿'
  } else if (volume >= 10000) {
    return (volume / 10000).toFixed(2) + '万'
  } else {
    return volume.toString()
  }
}

onMounted(() => {
  // 初始化逻辑
})
</script>

<style scoped>
.doji-pattern-history-query {
  width: 100%;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.query-header {
  margin-bottom: 24px;
}

.query-header h2 {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 500;
}

.query-form {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 14px;
  margin-bottom: 4px;
  color: #666;
}

.form-group input,
.form-group select {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ddd;
  font-size: 14px;
  min-width: 150px;
}

.query-button {
  padding: 8px 16px;
  background-color: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  height: 36px;
}

.query-content {
  display: flex;
  gap: 16px;
}

.content-left {
  flex: 1;
  min-width: 300px;
}

.content-right {
  flex: 2;
  min-width: 400px;
}

.no-selection {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 32px;
  color: #666;
  font-size: 16px;
}

.pattern-details {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 16px;
}

.details-header {
  margin-bottom: 16px;
}

.details-header h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
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

.details-section {
  margin-bottom: 24px;
}

.details-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.feature-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.feature-label {
  font-size: 14px;
  color: #666;
}

.feature-value {
  font-size: 14px;
  font-weight: 500;
}

.candle-data {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.candle-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.candle-label {
  font-size: 14px;
  color: #666;
}

.candle-value {
  font-size: 14px;
  font-weight: 500;
}

.positive {
  color: #26a69a;
}

.negative {
  color: #ef5350;
}

@media (max-width: 768px) {
  .query-content {
    flex-direction: column;
  }

  .content-left,
  .content-right {
    width: 100%;
  }
}
</style>
