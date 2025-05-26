<template>
  <div class="smart-recommendation-view">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <span class="title-icon">🤖</span>
          AI智能推荐
        </h1>
        <p class="page-description">
          基于大数据分析和机器学习算法，为您提供个性化的投资建议和市场洞察
        </p>
      </div>
      <div class="header-stats">
        <div class="stat-card">
          <div class="stat-value">{{ todayRecommendations }}</div>
          <div class="stat-label">今日推荐</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ successRate }}%</div>
          <div class="stat-label">成功率</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ avgReturn }}%</div>
          <div class="stat-label">平均收益</div>
        </div>
      </div>
    </div>

    <div class="page-content">
      <SmartRecommendation />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SmartRecommendation from '@/components/analysis/SmartRecommendation.vue'

// 页面统计数据
const todayRecommendations = ref(25)
const successRate = ref(78.5)
const avgReturn = ref(12.3)
</script>

<style scoped>
.smart-recommendation-view {
  min-height: 100vh;
  background: var(--bg-secondary);
}

.page-header {
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  color: white;
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
  margin-bottom: var(--spacing-lg);
}

.page-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  font-size: var(--font-size-xxl);
  font-weight: 800;
  margin: 0 0 var(--spacing-md) 0;
}

.title-icon {
  font-size: 1.2em;
}

.page-description {
  font-size: var(--font-size-lg);
  opacity: 0.9;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.header-stats {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xl);
  max-width: 1200px;
  margin: 0 auto;
}

.stat-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  min-width: 120px;
}

.stat-value {
  font-size: var(--font-size-xxl);
  font-weight: 800;
  margin-bottom: var(--spacing-xs);
}

.stat-label {
  font-size: var(--font-size-sm);
  opacity: 0.8;
}

.page-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    padding: var(--spacing-lg);
  }
  
  .header-stats {
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
  }
  
  .stat-card {
    min-width: 200px;
  }
  
  .page-content {
    padding: 0 var(--spacing-md);
  }
}
</style>
