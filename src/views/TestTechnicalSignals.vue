<template>
  <div class="test-page">
    <div class="page-header">
      <h1>🧪 技术信号组件测试</h1>
      <p>测试 TechnicalSignals 组件的功能</p>
    </div>

    <div class="test-controls">
      <label>
        股票代码:
        <input 
          v-model="stockCode" 
          placeholder="输入股票代码，如 000001.SZ"
          class="stock-input"
        />
      </label>
      <button @click="updateStockCode" class="update-btn">
        更新股票
      </button>
    </div>

    <div class="component-test">
      <TechnicalSignals 
        :stock-code="currentStockCode"
        :kline-data="mockKlineData"
      />
    </div>

    <div class="debug-info">
      <h3>🔧 调试信息</h3>
      <div class="debug-item">
        <strong>当前股票代码:</strong> {{ currentStockCode }}
      </div>
      <div class="debug-item">
        <strong>K线数据:</strong> 
        <pre>{{ JSON.stringify(mockKlineData, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import TechnicalSignals from '@/components/TechnicalSignals.vue'

// 响应式数据
const stockCode = ref('000001.SZ')
const currentStockCode = ref('000001.SZ')

// 模拟K线数据
const mockKlineData = reactive({
  open: [10.5, 10.6, 10.4, 10.7, 10.8],
  high: [10.8, 10.9, 10.6, 10.9, 11.0],
  low: [10.3, 10.4, 10.2, 10.5, 10.6],
  close: [10.6, 10.4, 10.7, 10.8, 10.9],
  volume: [1000000, 1200000, 800000, 1500000, 1100000],
  dates: [
    '2024-01-15',
    '2024-01-16', 
    '2024-01-17',
    '2024-01-18',
    '2024-01-19'
  ]
})

// 方法
const updateStockCode = () => {
  if (stockCode.value.trim()) {
    currentStockCode.value = stockCode.value.trim()
    console.log('更新股票代码:', currentStockCode.value)
  }
}
</script>

<style scoped>
.test-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  color: #42b883;
  margin-bottom: 10px;
}

.page-header p {
  color: #666;
}

.test-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.test-controls label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
}

.stock-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 200px;
}

.update-btn {
  background: #42b883;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.update-btn:hover {
  background: #369870;
}

.component-test {
  margin-bottom: 30px;
}

.debug-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e9ecef;
}

.debug-info h3 {
  margin-top: 0;
  color: #495057;
}

.debug-item {
  margin-bottom: 16px;
}

.debug-item strong {
  color: #495057;
}

.debug-item pre {
  background: #e9ecef;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  margin: 8px 0 0 0;
}
</style>
