<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { aiPreferencesService, type AIPreferences } from '@/services/aiPreferencesService'
import AiPageLayout from '@/components/ai/AiPageLayout.vue'

const loading = ref(false)
const saving = ref(false)
const prefs = ref<AIPreferences>({
  riskTolerance: 'moderate',
  investmentHorizon: 'medium',
  analysisDepth: 'detailed',
  aiWeight: 0.6,
  focusAreas: ['技术分析', '风险控制'],
  learningEnabled: true,
})

async function load() {
  loading.value = true
  try {
    prefs.value = await aiPreferencesService.get()
    if (!prefs.value.focusAreas) prefs.value.focusAreas = ['技术分析', '风险控制']
  } catch {
    /* 使用默认值 */
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await aiPreferencesService.update(prefs.value)
    ElMessage.success('AI 偏好已保存')
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <AiPageLayout
    title="⚙️ AI 投资偏好"
    subtitle="自定义 AI 分析与推荐的参数，获得更贴合您策略的结果"
    narrow
  >
    <el-form v-loading="loading" label-width="140px" class="prefs-form glass-card">
      <el-form-item label="风险承受能力">
        <el-radio-group v-model="prefs.riskTolerance">
          <el-radio label="conservative">保守</el-radio>
          <el-radio label="moderate">稳健</el-radio>
          <el-radio label="aggressive">激进</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="投资期限">
        <el-radio-group v-model="prefs.investmentHorizon">
          <el-radio label="short">短期（1-3月）</el-radio>
          <el-radio label="medium">中期（3-12月）</el-radio>
          <el-radio label="long">长期（1年以上）</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="分析深度">
        <el-radio-group v-model="prefs.analysisDepth">
          <el-radio label="brief">简要</el-radio>
          <el-radio label="detailed">详细</el-radio>
          <el-radio label="comprehensive">全面</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="AI 权重">
        <el-slider v-model="prefs.aiWeight" :min="0" :max="1" :step="0.1" show-input />
        <span class="hint">越高越依赖 AI 分析，越低越依赖规则引擎</span>
      </el-form-item>

      <el-form-item label="关注领域">
        <el-checkbox-group v-model="prefs.focusAreas">
          <el-checkbox label="技术分析" />
          <el-checkbox label="基本面" />
          <el-checkbox label="资金流向" />
          <el-checkbox label="风险控制" />
          <el-checkbox label="行业轮动" />
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="智能学习">
        <el-switch v-model="prefs.learningEnabled" />
        <span class="hint">根据您的使用习惯自动优化推荐</span>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="saving" @click="save">保存偏好</el-button>
      </el-form-item>
    </el-form>
  </AiPageLayout>
</template>

<style scoped>
.prefs-form {
  padding: var(--spacing-6);
}

.hint {
  margin-left: var(--spacing-3);
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}
</style>
