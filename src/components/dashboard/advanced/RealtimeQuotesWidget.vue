<template>
  <div class="realtime-quotes-widget">
    <div class="widget-header">
      <h3 class="widget-title">实时行情</h3>
      <div class="widget-actions">
        <el-button size="small" @click="$emit('refresh')" :loading="loading">
          刷新
        </el-button>
      </div>
    </div>

    <div class="widget-content">
      <div v-if="loading" class="loading-placeholder">
        <el-skeleton :rows="3" animated />
      </div>

      <div v-else-if="!quotes || quotes.length === 0" class="empty-state">
        <el-empty description="暂无实时行情数据" />
      </div>

      <div v-else class="quotes-container">
        <div class="quotes-list">
          <div v-for="quote in quotes" :key="quote.symbol" class="quote-item">
            <div class="quote-header">
              <span class="stock-name">{{ quote.name }}</span>
              <span class="stock-code">{{ quote.symbol }}</span>
            </div>

            <div class="quote-body">
              <div class="price-info">
                <span class="current-price" :class="quote.change >= 0 ? 'up' : 'down'">
                  {{ quote.price }}
                </span>
                <span class="price-change" :class="quote.change >= 0 ? 'up' : 'down'">
                  {{ quote.change >= 0 ? '+' : '' }}{{ quote.change }}
                  ({{ quote.changePercent >= 0 ? '+' : '' }}{{ quote.changePercent }}%)
                </span>
              </div>

              <div class="volume-info">
                <span class="volume-label">成交量</span>
                <span class="volume-value">{{ formatVolume(quote.volume) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Quote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
}

interface Props {
  quotes?: Quote[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  refresh: []
}>()

// 格式化成交量
function formatVolume(volume: number | undefined | null): string {
  if (volume === undefined || volume === null || isNaN(volume)) {
    return '--'
  }

  if (volume >= 1000000000) {
    return (volume / 1000000000).toFixed(2) + 'B'
  } else if (volume >= 1000000) {
    return (volume / 1000000).toFixed(2) + 'M'
  } else if (volume >= 1000) {
    return (volume / 1000).toFixed(2) + 'K'
  }
  return volume.toString()
}
</script>

<style scoped>
.realtime-quotes-widget {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.widget-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.widget-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.loading-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quotes-container {
  flex: 1;
  overflow-y: auto;
}

.quotes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quote-item {
  padding: 16px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  transition: all 0.3s ease;
}

.quote-item:hover {
  background: var(--el-fill-color-light);
  border-color: var(--el-color-primary-light-7);
}

.quote-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.stock-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.stock-code {
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color);
  padding: 2px 6px;
  border-radius: 4px;
}

.quote-body {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.price-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.current-price {
  font-size: 20px;
  font-weight: 700;
}

.current-price.up {
  color: var(--el-color-success);
}

.current-price.down {
  color: var(--el-color-danger);
}

.price-change {
  font-size: 14px;
  font-weight: 500;
}

.price-change.up {
  color: var(--el-color-success);
}

.price-change.down {
  color: var(--el-color-danger);
}

.volume-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.volume-label {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.volume-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>
