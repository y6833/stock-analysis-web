<template>
  <PageLayout
    title="十字星形态系统管理"
    subtitle="管理十字星形态识别系统的性能、缓存和配置"
  >
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="feature-intro-card">
          <div class="feature-intro">
            <div class="intro-icon">⚙️</div>
            <div class="intro-content">
              <h3>系统管理</h3>
              <p>
                在此页面，您可以监控十字星形态识别系统的性能指标，管理缓存，以及调整系统配置以获得最佳性能。
              </p>
              <p>
                系统已针对性能进行了优化，包括使用Web
                Worker进行形态计算、实现增量计算策略、添加计算结果缓存，以及优化大数据量处理性能。
              </p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <div class="section-divider">
      <span>系统状态</span>
    </div>

    <el-row :gutter="20">
      <el-col :span="24">
        <doji-pattern-system-status />
      </el-col>
    </el-row>

    <div class="section-divider">
      <span>功能导航</span>
    </div>

    <el-row :gutter="20">
      <el-col :md="8" :sm="12">
        <el-card class="feature-card" shadow="hover">
          <div class="feature-item">
            <div class="feature-icon">✨</div>
            <div class="feature-content">
              <h3>十字星筛选工具</h3>
              <p>筛选出现十字星形态后上涨的股票，帮助您发现潜在的交易机会</p>
              <el-button type="primary" @click="goToScreener">前往筛选工具</el-button>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :md="8" :sm="12">
        <el-card class="feature-card" shadow="hover">
          <div class="feature-item">
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
        <el-card class="feature-card" shadow="hover">
          <div class="feature-item">
            <div class="feature-icon">🔔</div>
            <div class="feature-content">
              <h3>十字星提醒</h3>
              <p>设置十字星形态出现时的自动提醒，不错过交易机会</p>
              <el-button type="success" @click="goToAlerts">设置提醒</el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <div class="section-divider">
      <span>性能优化</span>
    </div>

    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>性能优化措施</span>
            </div>
          </template>
          <div class="optimization-list">
            <el-timeline>
              <el-timeline-item timestamp="Web Worker 计算" placement="top">
                <el-card>
                  <h4>使用 Web Worker 进行形态计算</h4>
                  <p>
                    将十字星形态的识别计算放在 Web Worker 中执行，避免阻塞主线程，保持界面响应流畅。
                  </p>
                </el-card>
              </el-timeline-item>
              <el-timeline-item timestamp="增量计算策略" placement="top">
                <el-card>
                  <h4>实现增量计算策略</h4>
                  <p>当新数据到达时，只计算新数据部分，避免重复计算，提高性能。</p>
                </el-card>
              </el-timeline-item>
              <el-timeline-item timestamp="计算结果缓存" placement="top">
                <el-card>
                  <h4>添加计算结果缓存</h4>
                  <p>缓存计算结果，避免重复计算，提高响应速度。缓存策略可在系统配置中调整。</p>
                </el-card>
              </el-timeline-item>
              <el-timeline-item timestamp="大数据量处理优化" placement="top">
                <el-card>
                  <h4>优化大数据量处理性能</h4>
                  <p>使用分批处理、虚拟滚动等技术，优化大数据量下的处理性能和展示效果。</p>
                </el-card>
              </el-timeline-item>
              <el-timeline-item timestamp="数据库索引优化" placement="top">
                <el-card>
                  <h4>数据库索引和查询优化</h4>
                  <p>优化数据库索引和查询，提高筛选和查询性能。</p>
                </el-card>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </PageLayout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import PageLayout from '@/components/common/PageLayout.vue'
import DojiPatternSystemStatus from '@/components/common/DojiPatternSystemStatus.vue'

const router = useRouter()

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
.feature-intro-card {
  margin-bottom: var(--spacing-6);
}

.intro-icon {
  color: var(--primary-color);
}

.feature-card {
  height: 100%;
  margin-bottom: 20px;
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px;
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

.optimization-list {
  padding: var(--spacing-3);
}
</style>
