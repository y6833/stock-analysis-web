<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { fundamentalService } from '@/services/fundamentalService'
import type { 
  FundamentalAnalysis as FundamentalAnalysisType,
  FinancialSummary,
  FinancialStatement,
  ValuationAnalysis,
  IndustryComparison,
  FinancialReportAnalysis
} from '@/types/fundamental'

import FinancialSummaryComponent from './FinancialSummary.vue'
import FinancialStatementsComponent from './FinancialStatements.vue'
import ValuationAnalysisComponent from './ValuationAnalysis.vue'
import IndustryComparisonComponent from './IndustryComparison.vue'
import FinancialReportAnalysisComponent from './FinancialReportAnalysis.vue'

const props = defineProps<{
  symbol: string
}>()

// 数据状态
const isLoading = ref(true)
const error = ref<string | null>(null)
const fundamentalData = ref<FundamentalAnalysisType | null>(null)

// 财务摘要
const financialSummary = ref<FinancialSummary | null>(null)
// 财务报表
const financialStatements = ref<FinancialStatement[] | null>(null)
// 估值分析
const valuationAnalysis = ref<ValuationAnalysis | null>(null)
// 行业对比
const industryComparison = ref<IndustryComparison | null>(null)
// 财报解读
const reportAnalysis = ref<FinancialReportAnalysis | null>(null)

// 获取基本面数据
const fetchFundamentalData = async () => {
  if (!props.symbol) return
  
  isLoading.value = true
  error.value = null
  
  try {
    const data = await fundamentalService.getFundamentalAnalysis(props.symbol)
    fundamentalData.value = data
    
    // 更新各部分数据
    financialSummary.value = data.summary
    financialStatements.value = data.statements
    valuationAnalysis.value = data.valuation
    industryComparison.value = data.industryComparison
    reportAnalysis.value = data.reportAnalysis
  } catch (err) {
    console.error('获取基本面数据失败:', err)
    error.value = '获取基本面数据失败，请稍后重试'
    fundamentalData.value = null
    
    // 清空各部分数据
    financialSummary.value = null
    financialStatements.value = null
    valuationAnalysis.value = null
    industryComparison.value = null
    reportAnalysis.value = null
  } finally {
    isLoading.value = false
  }
}

// 监听股票代码变化
watch(() => props.symbol, () => {
  fetchFundamentalData()
}, { immediate: true })

// 组件挂载时获取数据
onMounted(() => {
  fetchFundamentalData()
})

// 重新加载数据
const reloadData = () => {
  fetchFundamentalData()
}
</script>

<template>
  <div class="fundamental-analysis">
    <div class="fundamental-header">
      <h2>基本面分析</h2>
      <div class="header-actions">
        <button 
          class="reload-btn" 
          @click="reloadData" 
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="loading-icon"></span>
          <span v-else>刷新数据</span>
        </button>
      </div>
    </div>
    
    <div v-if="error" class="error-container">
      <p class="error-message">{{ error }}</p>
      <button class="retry-btn" @click="reloadData">重试</button>
    </div>
    
    <div v-else class="fundamental-content">
      <!-- 财务摘要 -->
      <FinancialSummaryComponent 
        :symbol="symbol"
        :summary="financialSummary"
        :isLoading="isLoading"
      />
      
      <!-- 财务报表 -->
      <FinancialStatementsComponent 
        :symbol="symbol"
        :statements="financialStatements"
        :isLoading="isLoading"
      />
      
      <!-- 估值分析 -->
      <ValuationAnalysisComponent 
        :symbol="symbol"
        :valuation="valuationAnalysis"
        :isLoading="isLoading"
      />
      
      <!-- 行业对比 -->
      <IndustryComparisonComponent 
        :symbol="symbol"
        :comparison="industryComparison"
        :isLoading="isLoading"
      />
      
      <!-- 财报解读 -->
      <FinancialReportAnalysisComponent 
        :symbol="symbol"
        :reportAnalysis="reportAnalysis"
        :isLoading="isLoading"
      />
    </div>
  </div>
</template>

<style scoped>
.fundamental-analysis {
  width: 100%;
}

.fundamental-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.fundamental-header h2 {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--primary-color);
}

.header-actions {
  display: flex;
  gap: var(--spacing-md);
}

.reload-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.reload-btn:hover:not(:disabled) {
  background-color: var(--bg-tertiary);
}

.reload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-icon {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(66, 185, 131, 0.2);
  border-top: 2px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  gap: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
  margin-bottom: var(--spacing-lg);
}

.error-message {
  color: var(--danger-color);
  font-weight: 500;
}

.retry-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--border-radius-md);
  border: none;
  background-color: var(--primary-color);
  color: white;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.retry-btn:hover {
  background-color: var(--primary-dark);
}

.fundamental-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}
</style>
