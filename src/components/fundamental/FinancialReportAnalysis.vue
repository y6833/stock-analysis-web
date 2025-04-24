<script setup lang="ts">
import { ref } from 'vue'
import type { FinancialReportAnalysis as FinancialReportAnalysisType } from '@/types/fundamental'

const props = defineProps<{
  symbol: string
  reportAnalysis: FinancialReportAnalysisType | null
  isLoading: boolean
}>()
</script>

<template>
  <div class="financial-report-analysis">
    <div class="report-header">
      <h3>财报解读</h3>
      <div v-if="!isLoading && reportAnalysis" class="report-info">
        <span>{{ reportAnalysis.period === 'annual' ? '年报' : '季报' }}</span>
        <span>截至 {{ reportAnalysis.reportDate }}</span>
      </div>
    </div>
    
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载财报解读...</p>
    </div>
    
    <div v-else-if="!reportAnalysis" class="empty-container">
      <p>暂无财报解读数据</p>
    </div>
    
    <div v-else class="report-content">
      <div class="report-summary">
        <h4>摘要</h4>
        <p>{{ reportAnalysis.summary }}</p>
      </div>
      
      <div class="report-highlights">
        <h4>亮点</h4>
        <ul>
          <li v-for="(highlight, index) in reportAnalysis.highlights" :key="index">
            {{ highlight }}
          </li>
        </ul>
      </div>
      
      <div class="report-risks">
        <h4>风险因素</h4>
        <ul>
          <li v-for="(risk, index) in reportAnalysis.risks" :key="index">
            {{ risk }}
          </li>
        </ul>
      </div>
      
      <div class="report-outlook">
        <h4>未来展望</h4>
        <p>{{ reportAnalysis.outlook }}</p>
      </div>
      
      <div class="report-disclaimer">
        <p>免责声明：本解读基于公开财务数据自动生成，仅供参考，不构成投资建议。投资决策请结合自身风险承受能力和市场判断。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.financial-report-analysis {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
}

.report-header {
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.report-header h3 {
  margin: 0;
  font-size: var(--font-size-md);
  color: var(--primary-color);
}

.report-info {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.loading-container, .empty-container {
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

.report-content {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.report-summary, .report-highlights, .report-risks, .report-outlook {
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
}

.report-content h4 {
  margin-top: 0;
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-md);
  color: var(--primary-color);
  border-bottom: 1px solid var(--border-light);
  padding-bottom: var(--spacing-xs);
}

.report-content p {
  margin: 0;
  line-height: 1.6;
  color: var(--text-primary);
}

.report-content ul {
  margin: 0;
  padding-left: var(--spacing-lg);
}

.report-content li {
  margin-bottom: var(--spacing-xs);
  line-height: 1.6;
  color: var(--text-primary);
}

.report-content li:last-child {
  margin-bottom: 0;
}

.report-disclaimer {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-style: italic;
  text-align: center;
  padding: var(--spacing-sm);
  background-color: var(--bg-tertiary);
  border-radius: var(--border-radius-sm);
}
</style>
