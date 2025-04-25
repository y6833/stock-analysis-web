<script setup lang="ts">
const props = defineProps({
  results: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <div class="backtest-results-summary">
    <h3>回测结果摘要</h3>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-title">总收益率</div>
        <div class="metric-value" :class="parseFloat(results.totalReturn) >= 0 ? 'positive' : 'negative'">
          {{ results.totalReturn }}%
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">年化收益率</div>
        <div class="metric-value" :class="parseFloat(results.annualizedReturn) >= 0 ? 'positive' : 'negative'">
          {{ results.annualizedReturn }}%
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">最大回撤</div>
        <div class="metric-value negative">
          {{ results.maxDrawdown }}%
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">夏普比率</div>
        <div class="metric-value" :class="parseFloat(results.sharpeRatio) >= 0 ? 'positive' : 'negative'">
          {{ results.sharpeRatio }}
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">初始资金</div>
        <div class="metric-value">
          {{ results.initialCapital.toLocaleString() }}
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">最终资产</div>
        <div class="metric-value">
          {{ results.finalAssets.toLocaleString() }}
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">交易次数</div>
        <div class="metric-value">
          {{ results.trades.length }}
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">胜率</div>
        <div class="metric-value" :class="parseFloat(results.winRate) >= 50 ? 'positive' : 'negative'">
          {{ results.winRate }}%
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backtest-results-summary {
  margin-bottom: var(--spacing-lg);
}

.backtest-results-summary h3 {
  font-size: var(--font-size-lg);
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.metric-card {
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  padding: var(--spacing-md);
  text-align: center;
}

.metric-title {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.metric-value {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.positive {
  color: var(--success-color);
}

.negative {
  color: var(--error-color);
}
</style>
