<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { aiService, AIServiceError } from '@/services/aiService'
import AiPageLayout from '@/components/ai/AiPageLayout.vue'
import RecommendationCard from '@/components/analysis/RecommendationCard.vue'

const query = ref('')
const loading = ref(false)
const results = ref<any[]>([])
const parsedConditions = ref<Record<string, unknown> | null>(null)

const examples = [
  '帮我找低估值、高ROE的白酒龙头股，适合中长期持有',
  '筛选近期放量突破、MACD金叉的科技成长股',
  '找市值500亿以上、股息率高的稳健蓝筹股',
]

async function handleScreen() {
  if (!query.value.trim()) {
    ElMessage.warning('请输入选股条件')
    return
  }

  loading.value = true
  try {
    const result = await aiService.screenByConditions(query.value.trim())
    if (result.success) {
      results.value = result.data || []
      parsedConditions.value = result.conditions
      ElMessage.success(`找到 ${results.value.length} 只符合条件的股票`)
    } else {
      ElMessage.error(result.message || '筛选失败')
    }
  } catch (error: unknown) {
    const msg = error instanceof AIServiceError ? error.userMessage : (error as Error).message || '网络错误'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

function useExample(text: string) {
  query.value = text
}
</script>

<template>
  <AiPageLayout
    title="🔍 AI 条件筛选"
    subtitle="用自然语言描述您的选股需求，AI 自动解析条件并筛选股票"
  >
    <div class="search-box glass-card">
      <el-input
        v-model="query"
        type="textarea"
        :rows="3"
        placeholder="例如：帮我找近期突破年线、成交量放大的新能源龙头股..."
        @keydown.ctrl.enter="handleScreen"
      />
      <div class="search-actions">
        <el-button type="primary" :loading="loading" @click="handleScreen">
          AI 智能筛选
        </el-button>
      </div>
    </div>

    <div class="examples">
      <span class="examples-label">试试：</span>
      <el-tag
        v-for="ex in examples"
        :key="ex"
        class="example-tag"
        effect="plain"
        @click="useExample(ex)"
      >
        {{ ex }}
      </el-tag>
    </div>

    <el-card v-if="parsedConditions" class="conditions-card" shadow="never">
      <template #header>AI 解析的条件</template>
      <pre class="conditions-json">{{ JSON.stringify(parsedConditions, null, 2) }}</pre>
    </el-card>

    <div v-loading="loading" class="results">
      <h2 v-if="results.length">筛选结果 ({{ results.length }})</h2>
      <div class="results-grid">
        <RecommendationCard
          v-for="stock in results"
          :key="stock.symbol"
          :stock="stock"
        />
      </div>
      <el-empty v-if="!loading && results.length === 0 && parsedConditions" description="未找到匹配股票" />
    </div>
  </AiPageLayout>
</template>

<style scoped>
.search-box {
  padding: var(--spacing-5);
}

.search-actions {
  margin-top: var(--spacing-3);
  display: flex;
  justify-content: flex-end;
}

.examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-6);
}

.examples-label {
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.example-tag {
  cursor: pointer;
}

.conditions-card {
  margin-bottom: var(--spacing-6);
}

.conditions-json {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.results h2 {
  margin-bottom: var(--spacing-4);
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-4);
}
</style>
