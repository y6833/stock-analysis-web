<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { FinancialStatement, FinancialStatementType } from '@/types/fundamental'

const props = defineProps<{
  symbol: string
  statements: FinancialStatement[] | null
  isLoading: boolean
}>()

// 当前选中的报表类型
const selectedType = ref<FinancialStatementType>('income')

// 报表类型选项
const statementTypes = [
  { value: 'income', label: '利润表' },
  { value: 'balance', label: '资产负债表' },
  { value: 'cash_flow', label: '现金流量表' }
]

// 当前选中的报表
const currentStatement = computed(() => {
  if (!props.statements) return null
  
  return props.statements.find(statement => statement.type === selectedType.value) || null
})

// 切换报表类型
const changeStatementType = (type: FinancialStatementType) => {
  selectedType.value = type
}

// 获取同比变化的类名
const getChangeClass = (change?: number) => {
  if (!change) return ''
  
  return change > 0 ? 'change-up' : change < 0 ? 'change-down' : ''
}

// 格式化同比变化
const formatChange = (change?: number) => {
  if (!change) return '--'
  
  return change > 0 ? `+${change}%` : `${change}%`
}
</script>

<template>
  <div class="financial-statements">
    <div class="statements-header">
      <h3>财务报表</h3>
      <div class="statement-tabs">
        <button 
          v-for="type in statementTypes" 
          :key="type.value"
          class="tab-btn"
          :class="{ active: selectedType === type.value }"
          @click="changeStatementType(type.value as FinancialStatementType)"
        >
          {{ type.label }}
        </button>
      </div>
    </div>
    
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载财务报表...</p>
    </div>
    
    <div v-else-if="!statements || !currentStatement" class="empty-container">
      <p>暂无财务报表数据</p>
    </div>
    
    <div v-else class="statement-content">
      <div class="statement-info">
        <span class="statement-period">{{ currentStatement.period === 'annual' ? '年报' : '季报' }}</span>
        <span class="statement-date">截至 {{ currentStatement.reportDate }}</span>
      </div>
      
      <div class="statement-table-container">
        <table class="statement-table">
          <thead>
            <tr>
              <th>项目</th>
              <th>金额</th>
              <th>同比变化</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in currentStatement.items" :key="index">
              <td>{{ item.name }}</td>
              <td>{{ item.value.toLocaleString() }} {{ item.unit }}</td>
              <td :class="getChangeClass(item.yoyChange)">
                {{ formatChange(item.yoyChange) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.financial-statements {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
  transition: all var(--transition-fast);
}

.statements-header {
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
}

.statements-header h3 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-md);
  color: var(--primary-color);
}

.statement-tabs {
  display: flex;
  gap: var(--spacing-xs);
}

.tab-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
}

.tab-btn:hover {
  background-color: var(--bg-tertiary);
}

.tab-btn.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  gap: var(--spacing-md);
  min-height: 200px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(66, 185, 131, 0.2);
  border-top: 4px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.statement-content {
  padding: var(--spacing-md);
}

.statement-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.statement-table-container {
  overflow-x: auto;
}

.statement-table {
  width: 100%;
  border-collapse: collapse;
}

.statement-table th,
.statement-table td {
  padding: var(--spacing-sm);
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}

.statement-table th {
  background-color: var(--bg-secondary);
  font-weight: 600;
  color: var(--text-primary);
}

.statement-table tr:hover {
  background-color: var(--bg-secondary);
}

.change-up {
  color: var(--stock-up);
}

.change-down {
  color: var(--stock-down);
}

@media (max-width: 768px) {
  .statement-tabs {
    flex-wrap: wrap;
  }
  
  .tab-btn {
    flex: 1;
    text-align: center;
  }
}
</style>
