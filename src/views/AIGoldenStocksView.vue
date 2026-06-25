<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { aiService, AIServiceError, type GoldenStock } from '@/services/aiService'
import AiPageLayout from '@/components/ai/AiPageLayout.vue'

const loading = ref(false)
const stocks = ref<GoldenStock[]>([])
const marketOutlook = ref('')
const riskLevel = ref<'low' | 'medium' | 'high'>('medium')
const aiPowered = ref(false)

async function loadGoldenStocks() {
  loading.value = true
  try {
    const result = await aiService.getGoldenStocks({ riskLevel: riskLevel.value, limit: 10 })
    if (result.success) {
      stocks.value = result.data || []
      marketOutlook.value = result.marketOutlook || ''
      aiPowered.value = result.meta?.aiPowered ?? false
    } else {
      ElMessage.warning(result.message || '获取金股失败')
    }
  } catch (error: unknown) {
    const msg = error instanceof AIServiceError ? error.userMessage : (error as Error).message || '网络错误'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

loadGoldenStocks()
</script>

<template>
  <AiPageLayout title="⭐ AI 金股" subtitle="AI 综合技术、基本面与资金面，每日精选最具潜力的金股标的">
    <template #actions>
      <el-select v-model="riskLevel" style="width: 120px" @change="loadGoldenStocks">
        <el-option label="低风险" value="low" />
        <el-option label="中风险" value="medium" />
        <el-option label="高风险" value="high" />
      </el-select>
      <el-button type="primary" :loading="loading" @click="loadGoldenStocks">刷新金股</el-button>
    </template>

    <el-alert
      v-if="marketOutlook"
      :title="marketOutlook"
      type="info"
      show-icon
      :closable="false"
      class="outlook-alert"
    />

    <el-tag v-if="aiPowered" type="success" class="ai-tag">DeepSeek AI 驱动</el-tag>
    <el-tag v-else type="warning" class="ai-tag">规则引擎模式</el-tag>

    <div v-loading="loading" class="stock-grid">
      <div v-for="(stock, index) in stocks" :key="stock.symbol" class="golden-card">
        <div class="golden-card__rank">#{{ index + 1 }}</div>
        <div class="golden-card__main">
          <h3>{{ stock.name }} <span class="symbol">{{ stock.symbol }}</span></h3>
          <div class="scores">
            <span class="golden-score">金股分 {{ stock.goldenScore ?? stock.totalScore }}</span>
            <span v-if="stock.currentPrice" class="price">¥{{ stock.currentPrice?.toFixed(2) }}</span>
          </div>
          <ul class="reasons">
            <li v-for="(reason, i) in (stock.reasons || []).slice(0, 3)" :key="i">{{ reason }}</li>
          </ul>
        </div>
        <router-link :to="`/stock?symbol=${stock.symbol}`" class="golden-card__link">查看详情</router-link>
      </div>

      <el-empty v-if="!loading && stocks.length === 0" description="暂无金股数据" />
    </div>
  </AiPageLayout>
</template>

<style scoped>
.outlook-alert {
  margin-bottom: var(--spacing-4);
}

.ai-tag {
  margin-bottom: var(--spacing-4);
}

.stock-grid {
  display: grid;
  gap: var(--spacing-4);
}

.golden-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-left: 4px solid var(--ai-gold);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-5);
  box-shadow: var(--shadow-sm);
  transition: var(--transition-fast);
}

.golden-card:hover {
  box-shadow: var(--shadow-md);
}

.golden-card__rank {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--ai-gold);
  min-width: 48px;
  text-align: center;
}

.golden-card__main {
  flex: 1;
}

.golden-card__main h3 {
  margin: 0 0 var(--spacing-2);
}

.symbol {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  font-weight: normal;
}

.scores {
  display: flex;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-2);
}

.golden-score {
  color: var(--ai-accent);
  font-weight: var(--font-weight-semibold);
}

.price {
  color: var(--text-secondary);
}

.reasons {
  margin: 0;
  padding-left: var(--spacing-5);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.golden-card__link {
  color: var(--ai-accent);
  text-decoration: none;
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

@media (max-width: 640px) {
  .golden-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
