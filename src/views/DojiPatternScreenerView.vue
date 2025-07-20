<template>
  <div class="doji-pattern-screener-view">
    <div class="page-header">
      <div class="header-content">
        <h1>十字星形态筛选工具</h1>
        <p class="page-description">筛选出现十字星形态后上涨的股票，帮助您发现潜在的交易机会</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showGuide">
          <el-icon><QuestionFilled /></el-icon>
          功能指南
        </el-button>
      </div>
    </div>

    <!-- 功能指南组件 -->
    <doji-pattern-feature-guide v-if="guideVisible" @close="guideVisible = false" />

    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="feature-intro-card">
          <div class="feature-intro">
            <div class="intro-icon">✨</div>
            <div class="intro-content">
              <h3>什么是十字星形态？</h3>
              <p>
                十字星是一种重要的K线形态，其开盘价和收盘价几乎相同，形成一个十字形状。在技术分析中，十字星通常被视为市场犹豫或潜在反转的信号。
              </p>
              <p>使用本工具，您可以筛选出最近出现十字星形态后上涨的股票，把握潜在的交易机会。</p>
              <div class="intro-actions">
                <el-button type="primary" @click="scrollToScreener">开始筛选</el-button>
                <el-button @click="showTutorial">查看教程</el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <div class="section-divider">
      <span>筛选工具</span>
    </div>

    <div ref="screenerRef">
      <doji-pattern-screener-component />
    </div>

    <div class="section-divider">
      <span>相关功能</span>
    </div>

    <el-row :gutter="20">
      <el-col :md="8" :sm="12">
        <el-card class="related-feature-card" shadow="hover">
          <div class="related-feature">
            <div class="feature-icon">⚙️</div>
            <div class="feature-content">
              <h3>十字星设置</h3>
              <p>自定义十字星识别参数，调整敏感度和显示选项</p>
              <el-button type="info" @click="goToSettings">前往设置</el-button>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :md="8" :sm="12">
        <el-card class="related-feature-card" shadow="hover">
          <div class="related-feature">
            <div class="feature-icon">🔧</div>
            <div class="feature-content">
              <h3>系统管理</h3>
              <p>管理十字星形态系统性能、缓存和配置</p>
              <el-button type="warning" @click="goToSystem">系统管理</el-button>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :md="8" :sm="12">
        <el-card class="related-feature-card" shadow="hover">
          <div class="related-feature">
            <div class="feature-icon">🔔</div>
            <div class="feature-content">
              <h3>十字星提醒</h3>
              <p>设置十字星形态出现时的自动提醒，不错过交易机会</p>
              <el-button type="success" @click="goToAlerts">设置提醒</el-button>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :md="8" :sm="12">
        <el-card class="related-feature-card" shadow="hover">
          <div class="related-feature">
            <div class="feature-icon">📊</div>
            <div class="feature-content">
              <h3>K线图分析</h3>
              <p>在K线图上查看十字星形态标记和详细分析</p>
              <el-button @click="goToStockAnalysis">查看K线图</el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 教程弹窗 -->
    <el-dialog v-model="tutorialVisible" title="十字星形态筛选工具使用教程" width="70%">
      <div class="tutorial-content">
        <h3>1. 设置筛选条件</h3>
        <p>在筛选条件表单中，您可以选择要筛选的十字星形态类型、时间范围、最小上涨幅度等条件。</p>
        <el-divider />

        <h3>2. 执行筛选</h3>
        <p>点击"开始筛选"按钮，系统将根据您设置的条件查找符合要求的股票。</p>
        <el-divider />

        <h3>3. 查看结果</h3>
        <p>
          筛选结果将显示在下方的表格中，包括股票代码、名称、形态类型、形态日期、价格变化等信息。
        </p>
        <el-divider />

        <h3>4. 分析结果</h3>
        <p>点击"显示分析"按钮，可以查看筛选结果的统计分析，包括形态分布、上涨幅度分布等图表。</p>
        <el-divider />

        <h3>5. 查看详情</h3>
        <p>点击结果表格中的"查看详情"按钮，可以查看该股票的十字星形态详细信息和后续价格走势。</p>
        <el-divider />

        <h3>6. 导出结果</h3>
        <p>点击"导出结果"按钮，可以将筛选结果导出为CSV、Excel或JSON格式。</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { QuestionFilled } from '@element-plus/icons-vue'
import DojiPatternScreenerComponent from '@/components/technical-analysis/DojiPatternScreenerView.vue'
import DojiPatternFeatureGuide from '@/components/common/DojiPatternFeatureGuide.vue'

const router = useRouter()
const screenerRef = ref<HTMLElement | null>(null)
const tutorialVisible = ref(false)
const guideVisible = ref(false)

// 检查是否是首次访问
onMounted(() => {
  // 如果是首次访问该页面，显示功能指南
  const hasVisitedBefore = localStorage.getItem('dojiPatternScreenerVisited')
  if (!hasVisitedBefore) {
    guideVisible.value = true
    localStorage.setItem('dojiPatternScreenerVisited', 'true')
  }
})

// 滚动到筛选器
const scrollToScreener = () => {
  screenerRef.value?.scrollIntoView({ behavior: 'smooth' })
}

// 显示教程
const showTutorial = () => {
  tutorialVisible.value = true
}

// 显示功能指南
const showGuide = () => {
  guideVisible.value = true
}

// 导航到十字星设置页面
const goToSettings = () => {
  router.push('/doji-pattern/settings')
}

// 导航到十字星提醒页面
const goToAlerts = () => {
  router.push('/doji-pattern/alerts')
}

// 导航到股票分析页面
const goToStockAnalysis = () => {
  router.push('/stock')
}

// 导航到系统管理页面
const goToSystem = () => {
  router.push('/doji-pattern/system')
}
</script>

<style scoped>
.doji-pattern-screener-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-content {
  flex: 1;
}

.header-actions {
  margin-left: 20px;
}

.page-description {
  color: var(--text-secondary);
  font-size: 16px;
  max-width: 800px;
}

.feature-intro-card {
  margin-bottom: 30px;
}

.feature-intro {
  display: flex;
  gap: 20px;
}

.intro-icon {
  font-size: 48px;
  color: var(--primary-color);
}

.intro-content {
  flex: 1;
}

.intro-content h3 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 20px;
}

.intro-actions {
  margin-top: 20px;
}

.section-divider {
  display: flex;
  align-items: center;
  margin: 40px 0 20px;
}

.section-divider::before,
.section-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--border-light);
}

.section-divider span {
  padding: 0 16px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-secondary);
}

.related-feature-card {
  height: 100%;
  transition: transform 0.3s ease;
}

.related-feature-card:hover {
  transform: translateY(-5px);
}

.related-feature {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 10px;
}

.feature-icon {
  font-size: 36px;
  margin-bottom: 16px;
}

.feature-content h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.feature-content p {
  margin-bottom: 20px;
  color: var(--text-secondary);
}

.tutorial-content h3 {
  color: var(--primary-color);
  margin-top: 20px;
}

.tutorial-content p {
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .feature-intro {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .related-feature-card {
    margin-bottom: 20px;
  }
}
</style>
