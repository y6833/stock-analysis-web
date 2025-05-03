<template>
  <div class="stock-analysis">
    <div class="page-header">
      <h1>专业股票分析工具</h1>
      <p class="subtitle">基于技术指标的智能分析系统，帮助您做出更明智的投资决策</p>
    </div>
    
    <div class="content">
      <p>正在加载股票分析工具...</p>
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  console.log('StockAnalysisView 组件已加载')
})
</script>

<style scoped>
.stock-analysis {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 28px;
  color: #42b983;
  margin-bottom: 10px;
}

.subtitle {
  color: #666;
  font-size: 16px;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(66, 185, 131, 0.2);
  border-top: 4px solid #42b983;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-top: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
