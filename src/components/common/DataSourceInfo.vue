<template>
  <div class="data-source-info" :class="{ 'real-time': isRealTime, 'cached': !isRealTime }">
    <div class="source-icon">
      <span v-if="isRealTime">🔄</span>
      <span v-else>💾</span>
    </div>
    <div class="source-text">
      {{ dataSourceMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
// 组件属性
const props = defineProps({
  dataSource: {
    type: String,
    default: '未知'
  },
  dataSourceMessage: {
    type: String,
    default: '数据来源未知'
  },
  isRealTime: {
    type: Boolean,
    default: false
  },
  isCache: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.data-source-info {
  display: flex;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  margin-bottom: var(--spacing-sm);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
}

.real-time {
  background-color: rgba(66, 185, 131, 0.1);
  border-color: var(--success-color);
  color: var(--success-color);
}

.cached {
  background-color: rgba(230, 162, 60, 0.1);
  border-color: var(--warning-color);
  color: var(--warning-color);
}

.source-icon {
  margin-right: var(--spacing-xs);
  font-size: var(--font-size-sm);
}

.source-text {
  flex: 1;
}
</style>
