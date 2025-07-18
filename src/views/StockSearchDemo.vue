<template>
  <div class="stock-search-demo">
    <div class="demo-container">
      <h1 class="demo-title">股票搜索组件演示</h1>
      
      <!-- 基础用法 -->
      <section class="demo-section">
        <h2 class="section-title">基础用法</h2>
        <div class="demo-item">
          <label class="demo-label">默认搜索框：</label>
          <StockSearchInput
            @select="onStockSelect"
            @clear="onStockClear"
            @search="onSearch"
          />
        </div>
      </section>
      
      <!-- 自定义配置 -->
      <section class="demo-section">
        <h2 class="section-title">自定义配置</h2>
        <div class="demo-item">
          <label class="demo-label">自定义占位符和最大结果数：</label>
          <StockSearchInput
            placeholder="请输入股票代码或名称..."
            :max-results="5"
            :debounce-delay="500"
            @select="onStockSelect"
          />
        </div>
        
        <div class="demo-item">
          <label class="demo-label">自动聚焦：</label>
          <StockSearchInput
            placeholder="自动聚焦的搜索框"
            :auto-focus="true"
            @select="onStockSelect"
          />
        </div>
        
        <div class="demo-item">
          <label class="demo-label">禁用状态：</label>
          <StockSearchInput
            placeholder="禁用的搜索框"
            :disabled="true"
          />
        </div>
      </section>
      
      <!-- 事件监听 -->
      <section class="demo-section">
        <h2 class="section-title">事件监听</h2>
        <div class="demo-item">
          <label class="demo-label">带事件监听的搜索框：</label>
          <StockSearchInput
            ref="eventSearchRef"
            placeholder="监听所有事件"
            @select="onStockSelect"
            @clear="onStockClear"
            @focus="onFocus"
            @blur="onBlur"
            @search="onSearch"
          />
        </div>
        
        <div class="demo-controls">
          <button @click="focusSearch" class="demo-button">聚焦搜索框</button>
          <button @click="clearSearch" class="demo-button">清除搜索</button>
          <button @click="searchStock" class="demo-button">搜索"平安"</button>
        </div>
      </section>
      
      <!-- 事件日志 -->
      <section class="demo-section">
        <h2 class="section-title">事件日志</h2>
        <div class="event-log">
          <div
            v-for="(event, index) in eventLog"
            :key="index"
            class="event-item"
            :class="`event-${event.type}`"
          >
            <span class="event-time">{{ event.time }}</span>
            <span class="event-type">{{ event.type }}</span>
            <span class="event-data">{{ event.data }}</span>
          </div>
          <div v-if="eventLog.length === 0" class="event-empty">
            暂无事件记录
          </div>
        </div>
        <button @click="clearEventLog" class="demo-button clear-log">清除日志</button>
      </section>
      
      <!-- 选中的股票信息 -->
      <section class="demo-section" v-if="selectedStock">
        <h2 class="section-title">选中的股票</h2>
        <div class="selected-stock">
          <div class="stock-card">
            <div class="stock-header">
              <span class="stock-code">{{ selectedStock.symbol || selectedStock.tsCode }}</span>
              <span class="stock-name">{{ selectedStock.name }}</span>
            </div>
            <div class="stock-details">
              <div class="stock-detail">
                <span class="detail-label">行业：</span>
                <span class="detail-value">{{ selectedStock.industry || '未知' }}</span>
              </div>
              <div class="stock-detail">
                <span class="detail-label">市场：</span>
                <span class="detail-value">{{ selectedStock.market || '未知' }}</span>
              </div>
              <div class="stock-detail" v-if="selectedStock.area">
                <span class="detail-label">地区：</span>
                <span class="detail-value">{{ selectedStock.area }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import StockSearchInput from '@/components/StockSearchInput.vue'
import type { Stock } from '@/types/stock'

// 响应式状态
const selectedStock = ref<Stock | null>(null)
const eventLog = ref<Array<{ time: string, type: string, data: string }>>([])
const eventSearchRef = ref<InstanceType<typeof StockSearchInput>>()

// 事件处理方法
const onStockSelect = (stock: Stock) => {
  selectedStock.value = stock
  addEventLog('select', `选中股票: ${stock.symbol || stock.tsCode} ${stock.name}`)
}

const onStockClear = () => {
  selectedStock.value = null
  addEventLog('clear', '清除搜索')
}

const onFocus = () => {
  addEventLog('focus', '搜索框获得焦点')
}

const onBlur = () => {
  addEventLog('blur', '搜索框失去焦点')
}

const onSearch = (query: string) => {
  addEventLog('search', `搜索查询: "${query}"`)
}

// 控制方法
const focusSearch = () => {
  eventSearchRef.value?.focus()
}

const clearSearch = () => {
  eventSearchRef.value?.clear()
}

const searchStock = () => {
  eventSearchRef.value?.search('平安')
}

// 日志方法
const addEventLog = (type: string, data: string) => {
  const now = new Date()
  const time = now.toLocaleTimeString()
  eventLog.value.unshift({ time, type, data })
  
  // 限制日志数量
  if (eventLog.value.length > 50) {
    eventLog.value = eventLog.value.slice(0, 50)
  }
}

const clearEventLog = () => {
  eventLog.value = []
}
</script>

<style scoped>
.stock-search-demo {
  min-height: 100vh;
  background: #f8fafc;
  padding: 20px;
}

.demo-container {
  max-width: 800px;
  margin: 0 auto;
}

.demo-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  text-align: center;
  margin-bottom: 40px;
}

.demo-section {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 8px;
}

.demo-item {
  margin-bottom: 20px;
}

.demo-item:last-child {
  margin-bottom: 0;
}

.demo-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #4b5563;
  margin-bottom: 8px;
}

.demo-controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.demo-button {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.demo-button:hover {
  background: #2563eb;
}

.demo-button.clear-log {
  background: #ef4444;
  margin-top: 12px;
}

.demo-button.clear-log:hover {
  background: #dc2626;
}

/* 事件日志样式 */
.event-log {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
}

.event-item:last-child {
  border-bottom: none;
}

.event-time {
  color: #6b7280;
  font-family: monospace;
  min-width: 80px;
}

.event-type {
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  min-width: 60px;
  text-align: center;
  font-size: 11px;
  text-transform: uppercase;
}

.event-select .event-type {
  background: #dcfce7;
  color: #166534;
}

.event-clear .event-type {
  background: #fef3c7;
  color: #92400e;
}

.event-focus .event-type {
  background: #dbeafe;
  color: #1e40af;
}

.event-blur .event-type {
  background: #f3e8ff;
  color: #7c3aed;
}

.event-search .event-type {
  background: #e0f2fe;
  color: #0369a1;
}

.event-data {
  color: #374151;
  flex: 1;
}

.event-empty {
  text-align: center;
  color: #9ca3af;
  font-style: italic;
  padding: 20px;
}

/* 选中股票样式 */
.selected-stock {
  margin-top: 16px;
}

.stock-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.stock-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.stock-code {
  font-family: monospace;
  font-weight: 600;
  background: #3b82f6;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.stock-name {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.stock-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.stock-detail {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.detail-value {
  font-size: 13px;
  color: #374151;
  background: #ffffff;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid #e5e7eb;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .stock-search-demo {
    padding: 12px;
  }
  
  .demo-section {
    padding: 16px;
  }
  
  .demo-title {
    font-size: 24px;
    margin-bottom: 24px;
  }
  
  .section-title {
    font-size: 18px;
  }
  
  .demo-controls {
    gap: 8px;
  }
  
  .demo-button {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  .stock-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .stock-details {
    grid-template-columns: 1fr;
  }
}
</style>
