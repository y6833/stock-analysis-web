<template>
  <div class="doji-pattern-guide">
    <el-card class="guide-card">
      <template #header>
        <div class="guide-header">
          <h3>十字星形态识别功能指南</h3>
          <el-tag type="success">新功能</el-tag>
        </div>
      </template>

      <div class="guide-content">
        <el-steps :active="currentStep" direction="vertical" finish-status="success">
          <el-step title="了解十字星形态" description="学习十字星的基本概念和类型">
            <template #icon>
              <span class="step-icon">📚</span>
            </template>
          </el-step>
          <el-step title="配置识别参数" description="根据您的需求调整识别设置">
            <template #icon>
              <span class="step-icon">⚙️</span>
            </template>
          </el-step>
          <el-step title="设置形态提醒" description="创建十字星形态出现时的提醒">
            <template #icon>
              <span class="step-icon">🔔</span>
            </template>
          </el-step>
          <el-step title="开始使用" description="在股票分析中查看识别结果">
            <template #icon>
              <span class="step-icon">🚀</span>
            </template>
          </el-step>
        </el-steps>

        <div class="guide-details" v-show="currentStep >= 0">
          <div v-if="currentStep === 0" class="step-content">
            <h4>什么是十字星形态？</h4>
            <p>十字星是一种重要的K线形态，其开盘价和收盘价几乎相等，形成十字形状。</p>

            <div class="pattern-types">
              <div class="pattern-type">
                <span class="pattern-icon">✨</span>
                <div class="pattern-info">
                  <strong>标准十字星</strong>
                  <p>开盘价与收盘价几乎相等，上下影线长度适中</p>
                </div>
              </div>
              <div class="pattern-type">
                <span class="pattern-icon">🌟</span>
                <div class="pattern-info">
                  <strong>蜻蜓十字星</strong>
                  <p>开盘价、收盘价和最高价几乎相等，有较长的下影线</p>
                </div>
              </div>
              <div class="pattern-type">
                <span class="pattern-icon">⭐</span>
                <div class="pattern-info">
                  <strong>墓碑十字星</strong>
                  <p>开盘价、收盘价和最低价几乎相等，有较长的上影线</p>
                </div>
              </div>
              <div class="pattern-type">
                <span class="pattern-icon">💫</span>
                <div class="pattern-info">
                  <strong>长腿十字星</strong>
                  <p>上下影线都很长的十字星，表示市场波动剧烈</p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="currentStep === 1" class="step-content">
            <h4>配置识别参数</h4>
            <p>您可以在设置页面调整以下参数：</p>
            <ul>
              <li><strong>敏感度阈值：</strong>控制识别的严格程度</li>
              <li><strong>价格相等容差：</strong>开盘价与收盘价的最大差异</li>
              <li><strong>长腿阈值：</strong>长腿十字星的影线长度要求</li>
              <li><strong>最小显著性：</strong>只显示显著性高于此值的形态</li>
            </ul>
            <el-button type="primary" @click="goToSettings">前往设置页面</el-button>
          </div>

          <div v-if="currentStep === 2" class="step-content">
            <h4>设置形态提醒</h4>
            <p>创建提醒以便在十字星形态出现时及时通知您：</p>
            <ul>
              <li>选择要监控的股票</li>
              <li>选择感兴趣的十字星类型</li>
              <li>设置最小显著性要求</li>
              <li>选择通知方式</li>
            </ul>
            <el-button type="primary" @click="goToAlerts">创建提醒</el-button>
          </div>

          <div v-if="currentStep === 3" class="step-content">
            <h4>开始使用</h4>
            <p>现在您可以：</p>
            <ul>
              <li>在股票分析页面查看识别出的十字星形态</li>
              <li>查看形态的详细信息和后续价格走势</li>
              <li>使用筛选功能找到出现十字星后上涨的股票</li>
              <li>分析不同类型十字星的成功率</li>
            </ul>
            <el-button type="success" @click="goToAnalysis">开始分析</el-button>
          </div>
        </div>

        <div class="guide-navigation">
          <el-button @click="prevStep" :disabled="currentStep <= 0">上一步</el-button>
          <el-button type="primary" @click="nextStep" :disabled="currentStep >= 3"
            >下一步</el-button
          >
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentStep = ref(0)

const nextStep = () => {
  if (currentStep.value < 3) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const goToSettings = () => {
  router.push('/doji-pattern/settings')
}

const goToAlerts = () => {
  router.push('/doji-pattern/alerts')
}

const goToAnalysis = () => {
  router.push('/stock')
}
</script>

<style scoped>
.doji-pattern-guide {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.guide-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.guide-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.guide-header h3 {
  margin: 0;
  color: #303133;
}

.guide-content {
  padding: 20px 0;
}

.step-icon {
  font-size: 20px;
}

.guide-details {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.step-content h4 {
  color: #303133;
  margin-bottom: 16px;
}

.step-content p {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 16px;
}

.step-content ul {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 20px;
}

.step-content li {
  margin-bottom: 8px;
}

.pattern-types {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.pattern-type {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.pattern-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.pattern-info strong {
  display: block;
  color: #303133;
  margin-bottom: 4px;
}

.pattern-info p {
  margin: 0;
  font-size: 14px;
  color: #909399;
  line-height: 1.4;
}

.guide-navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

:deep(.el-steps) {
  margin-bottom: 0;
}

:deep(.el-step__description) {
  color: #909399;
  font-size: 14px;
}
</style>
