<template>
  <div class="doji-pattern-feature-guide">
    <el-card class="guide-card">
      <template #header>
        <div class="card-header">
          <span class="header-icon">📚</span>
          <span class="header-title">十字星形态功能指南</span>
          <el-button type="text" @click="closeGuide" class="close-button">
            <el-icon>
              <Close />
            </el-icon>
          </el-button>
        </div>
      </template>

      <div class="guide-content">
        <el-steps :active="activeStep" finish-status="success" simple>
          <el-step title="筛选工具" icon="Search" @click="setStep(0)" />
          <el-step title="设置参数" icon="Setting" @click="setStep(1)" />
          <el-step title="创建提醒" icon="Bell" @click="setStep(2)" />
          <el-step title="查看分析" icon="DataAnalysis" @click="setStep(3)" />
        </el-steps>

        <div class="step-content">
          <div v-if="activeStep === 0" class="step-details">
            <h3>十字星筛选工具</h3>
            <p>
              使用十字星筛选工具，您可以快速找到最近出现十字星形态后上涨的股票，把握潜在的交易机会。
            </p>
            <div class="feature-image">
              <div class="placeholder-image">
                <el-icon size="48">
                  <TrendCharts />
                </el-icon>
                <p>十字星筛选工具</p>
              </div>
            </div>
            <div class="step-actions">
              <el-button type="primary" @click="goToScreener">前往筛选工具</el-button>
              <el-button @click="nextStep">下一步</el-button>
            </div>
          </div>

          <div v-if="activeStep === 1" class="step-details">
            <h3>自定义十字星参数</h3>
            <p>在设置页面，您可以调整十字星识别的敏感度参数，自定义不同类型十字星的识别标准。</p>
            <div class="feature-image">
              <div class="placeholder-image">
                <el-icon size="48">
                  <Setting />
                </el-icon>
                <p>十字星设置</p>
              </div>
            </div>
            <div class="step-actions">
              <el-button type="primary" @click="goToSettings">前往设置</el-button>
              <el-button @click="prevStep">上一步</el-button>
              <el-button @click="nextStep">下一步</el-button>
            </div>
          </div>

          <div v-if="activeStep === 2" class="step-details">
            <h3>设置十字星提醒</h3>
            <p>
              创建基于十字星形态的条件提醒，当您关注的股票出现指定类型的十字星形态时，系统将自动通知您。
            </p>
            <div class="feature-image">
              <div class="placeholder-image">
                <el-icon size="48">
                  <Bell />
                </el-icon>
                <p>十字星提醒</p>
              </div>
            </div>
            <div class="step-actions">
              <el-button type="primary" @click="goToAlerts">创建提醒</el-button>
              <el-button @click="prevStep">上一步</el-button>
              <el-button @click="nextStep">下一步</el-button>
            </div>
          </div>

          <div v-if="activeStep === 3" class="step-details">
            <h3>查看形态分析</h3>
            <p>分析十字星形态后的价格走势模式，了解不同类型十字星在各种市场环境下的成功率。</p>
            <div class="feature-image">
              <div class="placeholder-image">
                <el-icon size="48">
                  <DataAnalysis />
                </el-icon>
                <p>十字星分析</p>
              </div>
            </div>
            <div class="step-actions">
              <el-button type="primary" @click="goToScreener">查看分析</el-button>
              <el-button @click="prevStep">上一步</el-button>
              <el-button type="success" @click="finishGuide">完成指南</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Close, Search, Setting, Bell, DataAnalysis, TrendCharts } from '@element-plus/icons-vue'

const router = useRouter()
const activeStep = ref(0)
const emit = defineEmits(['close'])

// 设置当前步骤
const setStep = (step: number) => {
  activeStep.value = step
}

// 下一步
const nextStep = () => {
  if (activeStep.value < 3) {
    activeStep.value++
  }
}

// 上一步
const prevStep = () => {
  if (activeStep.value > 0) {
    activeStep.value--
  }
}

// 关闭指南
const closeGuide = () => {
  emit('close')
}

// 完成指南
const finishGuide = () => {
  // 可以在这里记录用户已完成指南
  localStorage.setItem('dojiPatternGuideCompleted', 'true')
  emit('close')
}

// 导航到十字星筛选工具
const goToScreener = () => {
  router.push('/doji-pattern/screener')
}

// 导航到十字星设置页面
const goToSettings = () => {
  router.push('/doji-pattern/settings')
}

// 导航到十字星提醒页面
const goToAlerts = () => {
  router.push('/doji-pattern/alerts')
}
</script>

<style scoped>
.guide-card {
  border-radius: 8px;
  box-shadow: var(--shadow-md);
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 18px;
}

.header-title {
  font-weight: 600;
  font-size: 16px;
  flex: 1;
}

.close-button {
  padding: 2px;
}

.guide-content {
  padding: 10px 0;
}

.step-content {
  margin-top: 20px;
  padding: 10px;
  border-radius: 8px;
  background-color: var(--bg-secondary);
}

.step-details {
  padding: 10px;
}

.step-details h3 {
  margin-top: 0;
  color: var(--primary-color);
}

.feature-image {
  margin: 15px 0;
  text-align: center;
  background-color: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
}

.placeholder-image {
  max-width: 100%;
  height: 200px;
  object-fit: contain;
  opacity: 0.7;
}

.step-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}
</style>
