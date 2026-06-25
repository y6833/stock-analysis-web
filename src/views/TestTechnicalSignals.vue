<template>
  <PageLayout title="🧪 技术信号组件测试" subtitle="测试 TechnicalSignals 组件的功能">
    <div class="test-controls glass-card">
      <el-input v-model="stockCode" placeholder="输入股票代码，如 000001.SZ" style="max-width: 280px" />
      <el-button type="primary" @click="updateStockCode">更新股票</el-button>
    </div>

    <div class="component-test glass-card">
      <TechnicalSignals
        :stock-code="currentStockCode"
        :kline-data="mockKlineData"
      />
    </div>

    <div class="debug-info glass-card">
      <h3>🔧 调试信息</h3>
      <div class="debug-item">
        <strong>当前股票代码:</strong> {{ currentStockCode }}
      </div>
      <div class="debug-item">
        <strong>K线数据:</strong>
        <pre>{{ JSON.stringify(mockKlineData, null, 2) }}</pre>
      </div>
    </div>
  </PageLayout>
</template>

<script setup>
import { ref, reactive } from 'vue'
import PageLayout from '@/components/common/PageLayout.vue'
import TechnicalSignals from '@/components/TechnicalSignals.vue'

const stockCode = ref('000001.SZ')
const currentStockCode = ref('000001.SZ')

const mockKlineData = reactive({
  open: [10.5, 10.6, 10.4, 10.7, 10.8],
  high: [10.8, 10.9, 10.6, 10.9, 11.0],
  low: [10.3, 10.4, 10.2, 10.5, 10.6],
  close: [10.6, 10.4, 10.7, 10.8, 10.9],
  volume: [1000000, 1200000, 800000, 1500000, 1100000],
  dates: ['2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18', '2024-01-19'],
})

function updateStockCode() {
  if (stockCode.value.trim()) {
    currentStockCode.value = stockCode.value.trim()
  }
}
</script>

<style scoped>
.test-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  flex-wrap: wrap;
  padding: var(--spacing-4);
  margin-bottom: var(--spacing-4);
}

.component-test {
  padding: var(--spacing-4);
  margin-bottom: var(--spacing-4);
}

.debug-info {
  padding: var(--spacing-4);
}

.debug-info h3 {
  margin-top: 0;
}

.debug-item {
  margin-bottom: var(--spacing-4);
}

.debug-item pre {
  background: var(--bg-secondary);
  padding: var(--spacing-3);
  border-radius: var(--border-radius-md);
  overflow-x: auto;
  font-size: var(--font-size-xs);
  margin: var(--spacing-2) 0 0;
}
</style>
