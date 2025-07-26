<template>
  <div class="modern-market-overview">
    <div class="widget-header">
      <h3 class="widget-title">
        <el-icon class="title-icon"><TrendCharts /></el-icon>
        市场概览
      </h3>
      <div class="header-actions">
        <el-button
          size="small"
          :icon="Refresh"
          :loading="loading"
          @click="$emit('refresh')"
          circle
        />
      </div>
    </div>

    <div class="widget-content">
      <!-- Loading State -->
      <div v-if="loading && !data" class="loading-state">
        <el-skeleton :rows="3" animated />
      </div>

      <!-- Error State -->
      <div v-else-if="!data" class="error-state">
        <el-empty description="暂无市场数据" />
      </div>

      <!-- Market Data -->
      <div v-else class="market-data">
        <!-- 主要指数 -->
        <div class="indices-section">
          <h4 class="section-title">主要指数</h4>
          <div class="indices-grid">
            <div
              v-for="index in data.indices"
              :key="index.symbol"
              class="index-card"
              :class="getIndexClass(index)"
            >
              <div class="index-header">
                <span class="index-name">{{ index.name }}</span>
                <span class="index-symbol">{{ index.symbol }}</span>
              </div>
              <div class="index-price">{{ formatPrice(index.price) }}</div>
              <div class="index-change">
                <span class="change-value">{{ formatChange(index.change) }}</span>
                <span class="change-percent">{{ formatPercent(index.changePercent) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 市场宽度 -->
        <div class="breadth-section" v-if="data.breadth">
          <h4 class="section-title">市场宽度</h4>
          <div class="breadth-stats">
            <div class="breadth-item">
              <span class="breadth-label">上涨</span>
              <span class="breadth-value up">{{ data.breadth.advancing }}</span>
            </div>
            <div class="breadth-item">
              <span class="breadth-label">下跌</span>
              <span class="breadth-value down">{{ data.breadth.declining }}</span>
            </div>
            <div class="breadth-item">
              <span class="breadth-label">平盘</span>
              <span class="breadth-value neutral">{{ data.breadth.unchanged }}</span>
            </div>
            <div class="breadth-item">
              <span class="breadth-label">新高</span>
              <span class="breadth-value highlight">{{ data.breadth.newHighs }}</span>
            </div>
            <div class="breadth-item">
              <span class="breadth-label">新低</span>
              <span class="breadth-value warning">{{ data.breadth.newLows }}</span>
            </div>
          </div>
        </div>

        <!-- 行业板块 -->
        <div class="sectors-section" v-if="data.sectors && data.sectors.length > 0">
          <h4 class="section-title">热门板块</h4>
          <div class="sectors-list">
            <div
              v-for="sector in data.sectors.slice(0, 6)"
              :key="sector.code"
              class="sector-item"
              :class="getSectorClass(sector)"
            >
              <span class="sector-name">{{ sector.name }}</span>
              <span class="sector-change">{{ formatPercent(sector.changePercent) }}</span>
            </div>
          </div>
        </div>

        <!-- 数据来源信息 -->
        <div class="data-source" v-if="data.dataSource">
          <el-tag size="small" type="info">
            {{ data.dataSource.message }}
          </el-tag>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TrendCharts, Refresh } from '@element-plus/icons-vue'
import type { MarketOverview } from '@/types/dashboard'

// Props
interface Props {
  data: MarketOverview | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
defineEmits<{
  refresh: []
}>()

// 格式化函数
const formatPrice = (price: number) => {
  return price.toFixed(2)
}

const formatChange = (change: number) => {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}`
}

const formatPercent = (percent: number) => {
  const sign = percent >= 0 ? '+' : ''
  return `${sign}${percent.toFixed(2)}%`
}

// 样式类计算
const getIndexClass = (index: any) => ({
  'index-up': index.changePercent > 0,
  'index-down': index.changePercent < 0,
  'index-neutral': index.changePercent === 0
})

const getSectorClass = (sector: any) => ({
  'sector-up': sector.changePercent > 0,
  'sector-down': sector.changePercent < 0,
  'sector-neutral': sector.changePercent === 0
})
</script>

<style scoped>
.modern-market-overview {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.widget-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  color: var(--el-text-color-primary);
}

.title-icon {
  color: var(--color-primary);
}

.widget-content {
  flex: 1;
  padding: var(--spacing-lg);
  overflow-y: auto;
}

.loading-state,
.error-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.market-data {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.section-title {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--el-text-color-primary);
}

/* 指数网格 */
.indices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.index-card {
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--el-border-color-light);
  transition: all 0.3s ease;
}

.index-card:hover {
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.index-card.index-up {
  border-color: var(--color-success-light);
  background: var(--color-success-light-9);
}

.index-card.index-down {
  border-color: var(--color-danger-light);
  background: var(--color-danger-light-9);
}

.index-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.index-name {
  font-weight: var(--font-weight-medium);
  color: var(--el-text-color-primary);
}

.index-symbol {
  font-size: var(--font-size-sm);
  color: var(--el-text-color-regular);
}

.index-price {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--el-text-color-primary);
  margin-bottom: var(--spacing-xs);
}

.index-change {
  display: flex;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.index-up .change-value,
.index-up .change-percent {
  color: var(--color-success);
}

.index-down .change-value,
.index-down .change-percent {
  color: var(--color-danger);
}

/* 市场宽度 */
.breadth-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: var(--spacing-md);
}

.breadth-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  background: var(--el-bg-color-page);
}

.breadth-label {
  font-size: var(--font-size-sm);
  color: var(--el-text-color-regular);
  margin-bottom: var(--spacing-xs);
}

.breadth-value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.breadth-value.up {
  color: var(--color-success);
}

.breadth-value.down {
  color: var(--color-danger);
}

.breadth-value.neutral {
  color: var(--el-text-color-regular);
}

.breadth-value.highlight {
  color: var(--color-warning);
}

.breadth-value.warning {
  color: var(--color-danger);
}

/* 行业板块 */
.sectors-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-sm);
}

.sector-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-sm);
  background: var(--el-bg-color-page);
  transition: all 0.3s ease;
}

.sector-item:hover {
  background: var(--el-bg-color);
}

.sector-name {
  font-size: var(--font-size-sm);
  color: var(--el-text-color-primary);
}

.sector-change {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.sector-up .sector-change {
  color: var(--color-success);
}

.sector-down .sector-change {
  color: var(--color-danger);
}

.data-source {
  margin-top: var(--spacing-md);
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .indices-grid {
    grid-template-columns: 1fr;
  }
  
  .breadth-stats {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .sectors-list {
    grid-template-columns: 1fr;
  }
}
</style>
