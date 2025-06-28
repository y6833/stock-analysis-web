<template>
  <div class="skeleton-loader" :class="{ animated: animated }">
    <!-- 卡片骨架屏 -->
    <div v-if="type === 'card'" class="skeleton-card">
      <div class="skeleton-header">
        <div class="skeleton-title"></div>
        <div class="skeleton-subtitle"></div>
      </div>
      <div class="skeleton-content">
        <div v-for="i in rows" :key="i" class="skeleton-line" :style="{ width: getLineWidth(i) }"></div>
      </div>
    </div>

    <!-- 列表骨架屏 -->
    <div v-else-if="type === 'list'" class="skeleton-list">
      <div v-for="i in rows" :key="i" class="skeleton-list-item">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-list-content">
          <div class="skeleton-line skeleton-line-title"></div>
          <div class="skeleton-line skeleton-line-subtitle"></div>
        </div>
        <div class="skeleton-action"></div>
      </div>
    </div>

    <!-- 图表骨架屏 -->
    <div v-else-if="type === 'chart'" class="skeleton-chart">
      <div class="skeleton-chart-header">
        <div class="skeleton-title"></div>
        <div class="skeleton-legend">
          <div v-for="i in 3" :key="i" class="skeleton-legend-item"></div>
        </div>
      </div>
      <div class="skeleton-chart-body">
        <div class="skeleton-chart-bars">
          <div v-for="i in 8" :key="i" class="skeleton-bar" :style="{ height: getBarHeight(i) }"></div>
        </div>
      </div>
    </div>

    <!-- 表格骨架屏 -->
    <div v-else-if="type === 'table'" class="skeleton-table">
      <div class="skeleton-table-header">
        <div v-for="i in columns" :key="i" class="skeleton-table-cell skeleton-header-cell"></div>
      </div>
      <div v-for="row in rows" :key="row" class="skeleton-table-row">
        <div v-for="col in columns" :key="col" class="skeleton-table-cell"></div>
      </div>
    </div>

    <!-- 默认骨架屏 -->
    <div v-else class="skeleton-default">
      <div v-for="i in rows" :key="i" class="skeleton-line" :style="{ width: getLineWidth(i) }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'card' | 'list' | 'chart' | 'table' | 'default'
  rows?: number
  columns?: number
  animated?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  rows: 3,
  columns: 4,
  animated: true
})

const getLineWidth = (index: number): string => {
  const widths = ['100%', '85%', '70%', '90%', '60%']
  return widths[index % widths.length]
}

const getBarHeight = (index: number): string => {
  const heights = ['60%', '80%', '45%', '90%', '70%', '55%', '85%', '65%']
  return heights[index % heights.length]
}
</script>

<style scoped>
.skeleton-loader {
  padding: 16px;
}

.skeleton-loader.animated .skeleton-line,
.skeleton-loader.animated .skeleton-title,
.skeleton-loader.animated .skeleton-subtitle,
.skeleton-loader.animated .skeleton-avatar,
.skeleton-loader.animated .skeleton-action,
.skeleton-loader.animated .skeleton-legend-item,
.skeleton-loader.animated .skeleton-bar,
.skeleton-loader.animated .skeleton-table-cell {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 卡片骨架屏 */
.skeleton-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
}

.skeleton-header {
  margin-bottom: 16px;
}

.skeleton-title {
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 4px;
  margin-bottom: 8px;
  width: 60%;
}

.skeleton-subtitle {
  height: 14px;
  background-color: #f0f0f0;
  border-radius: 4px;
  width: 40%;
}

.skeleton-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 16px;
  background-color: #f0f0f0;
  border-radius: 4px;
}

/* 列表骨架屏 */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  background-color: #f0f0f0;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-list-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-line-title {
  width: 70%;
}

.skeleton-line-subtitle {
  width: 50%;
}

.skeleton-action {
  width: 60px;
  height: 32px;
  background-color: #f0f0f0;
  border-radius: 4px;
  flex-shrink: 0;
}

/* 图表骨架屏 */
.skeleton-chart {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
}

.skeleton-chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.skeleton-legend {
  display: flex;
  gap: 12px;
}

.skeleton-legend-item {
  width: 60px;
  height: 16px;
  background-color: #f0f0f0;
  border-radius: 4px;
}

.skeleton-chart-body {
  height: 200px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.skeleton-chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 100%;
  width: 100%;
}

.skeleton-bar {
  flex: 1;
  background-color: #f0f0f0;
  border-radius: 4px 4px 0 0;
  min-height: 20px;
}

/* 表格骨架屏 */
.skeleton-table {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.skeleton-table-header {
  display: flex;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.skeleton-table-row {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
}

.skeleton-table-row:last-child {
  border-bottom: none;
}

.skeleton-table-cell {
  flex: 1;
  height: 40px;
  background-color: #f0f0f0;
  margin: 8px;
  border-radius: 4px;
}

.skeleton-header-cell {
  background-color: #e0e0e0;
}

/* 默认骨架屏 */
.skeleton-default {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
