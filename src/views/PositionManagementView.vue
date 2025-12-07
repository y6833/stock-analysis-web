<template>
  <div class="position-management-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <el-icon class="header-icon"><DataAnalysis /></el-icon>
          <div>
            <h1 class="page-title">仓位管理系统</h1>
            <p class="page-subtitle">智能仓位计算与风险控制，科学管理投资组合</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计概览卡片 -->
    <div class="stats-overview">
      <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon kelly">
              <el-icon><Money /></el-icon>
            </div>
          <div class="stat-info">
            <div class="stat-label">Kelly公式</div>
            <div class="stat-value">最优仓位</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon risk">
            <el-icon><PieChart /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">风险平价</div>
            <div class="stat-value">风险分散</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon dynamic">
            <el-icon><Compass /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">动态调整</div>
            <div class="stat-value">实时监控</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon stop-loss">
            <el-icon><Lock /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">止损止盈</div>
            <div class="stat-value">风险控制</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 主功能区域 -->
    <el-card class="management-container" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="header-title">功能模块</span>
        </div>
      </template>
      
      <!-- 功能选择标签 -->
      <el-tabs v-model="activeTab" class="feature-tabs" @tab-change="handleTabChange">
        <el-tab-pane label="Kelly公式" name="kelly">
          <template #label>
            <span class="tab-label">
              <el-icon class="tab-icon"><Money /></el-icon>
              <span class="tab-text">Kelly公式</span>
            </span>
          </template>
        </el-tab-pane>

        <el-tab-pane label="风险平价" name="risk-parity">
          <template #label>
            <span class="tab-label">
              <el-icon class="tab-icon"><PieChart /></el-icon>
              <span class="tab-text">风险平价</span>
            </span>
          </template>
        </el-tab-pane>

        <el-tab-pane label="动态调整" name="dynamic">
          <template #label>
            <span class="tab-label">
              <el-icon class="tab-icon"><Compass /></el-icon>
              <span class="tab-text">动态调整</span>
            </span>
          </template>
        </el-tab-pane>

        <el-tab-pane label="止损止盈" name="stop-loss">
          <template #label>
            <span class="tab-label">
              <el-icon class="tab-icon"><Lock /></el-icon>
              <span class="tab-text">止损止盈</span>
            </span>
          </template>
        </el-tab-pane>

        <el-tab-pane label="风险监控" name="risk-monitor">
          <template #label>
            <span class="tab-label">
              <el-icon class="tab-icon"><Monitor /></el-icon>
              <span class="tab-text">风险监控</span>
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>

      <!-- 内容区域 -->
      <div class="tab-content-wrapper">
        <!-- Kelly公式计算器 -->
        <div v-if="activeTab === 'kelly'" class="tab-content">
          <KellyPositionCalculator />
        </div>

        <!-- 风险平价模型 -->
        <div v-else-if="activeTab === 'risk-parity'" class="tab-content">
          <RiskParityOptimizer />
        </div>

        <!-- 动态仓位调整 -->
        <div v-else-if="activeTab === 'dynamic'" class="tab-content">
          <DynamicPositionAdjuster />
        </div>

        <!-- 止损止盈管理 -->
        <div v-else-if="activeTab === 'stop-loss'" class="tab-content">
          <StopLossManager />
        </div>

        <!-- 风险监控 -->
        <div v-else-if="activeTab === 'risk-monitor'" class="tab-content">
          <el-empty description="该功能正在开发中，敬请期待！" :image-size="200">
            <template #image>
              <div class="empty-custom-image">
                <el-icon class="empty-icon"><Monitor /></el-icon>
              </div>
            </template>
            <template #description>
              <div class="empty-description">
                <h3>风险监控</h3>
                <p>实时投资组合风险分析与预警</p>
                <div class="feature-list">
                  <el-tag class="feature-tag" type="info">
                    <el-icon><TrendCharts /></el-icon>
                    VaR风险价值
                  </el-tag>
                  <el-tag class="feature-tag" type="warning">
                    <el-icon><Search /></el-icon>
                    压力测试
                  </el-tag>
                  <el-tag class="feature-tag" type="danger">
                    <el-icon><Warning /></el-icon>
                    风险预警系统
                  </el-tag>
                </div>
              </div>
            </template>
            <el-button type="primary" @click="showComingSoon">即将推出</el-button>
          </el-empty>
        </div>
      </div>
    </el-card>

    <!-- 功能介绍 -->
    <el-card class="info-section" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><InfoFilled /></el-icon>
          <span class="header-title">系统功能介绍</span>
        </div>
      </template>
      
      <div class="info-grid">
        <el-card class="info-card" shadow="hover" @click="activeTab = 'kelly'">
          <div class="info-content">
            <div class="info-icon-wrapper kelly">
              <el-icon class="info-icon"><Money /></el-icon>
            </div>
            <h4>Kelly公式</h4>
            <p>基于历史胜率和盈亏比，计算理论最优仓位大小，最大化长期资本增长率。</p>
            <el-button text type="primary" class="info-link">
              立即使用 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </el-card>

        <el-card class="info-card" shadow="hover" @click="activeTab = 'risk-parity'">
          <div class="info-content">
            <div class="info-icon-wrapper risk">
              <el-icon class="info-icon"><PieChart /></el-icon>
            </div>
            <h4>风险平价</h4>
            <p>确保投资组合中每个资产的风险贡献相等，实现真正的风险分散。</p>
            <el-button text type="primary" class="info-link">
              立即使用 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </el-card>

        <el-card class="info-card" shadow="hover" @click="activeTab = 'dynamic'">
          <div class="info-content">
            <div class="info-icon-wrapper dynamic">
              <el-icon class="info-icon"><Compass /></el-icon>
            </div>
            <h4>动态调整</h4>
            <p>根据市场波动率和风险指标，动态调整仓位大小，控制投资组合风险。</p>
            <el-button text type="primary" class="info-link">
              立即使用 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </el-card>

        <el-card class="info-card" shadow="hover" @click="activeTab = 'stop-loss'">
          <div class="info-content">
            <div class="info-icon-wrapper stop-loss">
              <el-icon class="info-icon"><Lock /></el-icon>
            </div>
            <h4>风险控制</h4>
            <p>智能止损止盈机制，实时风险监控，保护投资本金安全。</p>
            <el-button text type="primary" class="info-link">
              立即使用 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </el-card>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElCard, ElTabs, ElTabPane, ElIcon, ElButton, ElTag, ElEmpty } from 'element-plus'
import {
  DataAnalysis,
  Money,
  PieChart,
  Compass,
  Lock,
  Monitor,
  TrendCharts,
  Search,
  Warning,
  InfoFilled,
  ArrowRight
} from '@element-plus/icons-vue'
import KellyPositionCalculator from '@/components/position/KellyPositionCalculator.vue'
import RiskParityOptimizer from '@/components/risk/RiskParityOptimizer.vue'
import DynamicPositionAdjuster from '@/components/position/DynamicPositionAdjuster.vue'
import StopLossManager from '@/components/risk/StopLossManager.vue'
import { useToast } from '@/composables/useToast'

const { showToast } = useToast()

// 当前激活的标签
const activeTab = ref('kelly')

// 标签切换处理
const handleTabChange = (tabName: string) => {
  // 可以在这里添加标签切换的逻辑
  console.log('切换到标签:', tabName)
}

// 显示即将推出提示
const showComingSoon = () => {
  ElMessage.info('该功能正在开发中，敬请期待！')
}
</script>

<style scoped>
.position-management-view {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

/* 页面头部 */
.page-header {
  margin-bottom: 24px;
}

.header-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 32px;
  color: white;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
}

.title-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-icon {
  font-size: 48px;
  opacity: 0.9;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: white;
}

.page-subtitle {
  font-size: 16px;
  margin: 0;
  opacity: 0.9;
  color: rgba(255, 255, 255, 0.95);
}

/* 统计概览 */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 12px;
  transition: all 0.3s;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-icon.kelly {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.risk {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.dynamic {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.stop-loss {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

/* 主功能区域 */
.management-container {
  border-radius: 16px;
  margin-bottom: 24px;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
}

/* 标签页 */
.feature-tabs {
  margin-top: 20px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-icon {
  font-size: 18px;
}

.tab-text {
  font-weight: 500;
}

.tab-content-wrapper {
  position: relative;
  min-height: 600px;
}

.tab-content {
  padding: 24px 0;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* 空状态 */
.empty-custom-image {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.empty-icon {
  font-size: 80px;
  color: #c0c4cc;
}

.empty-description {
  text-align: center;
}

.empty-description h3 {
  font-size: 20px;
  color: #303133;
  margin: 16px 0 8px;
}

.empty-description p {
  font-size: 14px;
  color: #909399;
  margin-bottom: 24px;
}

.feature-list {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.feature-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 14px;
}

/* 功能介绍 */
.info-section {
  border-radius: 16px;
  overflow: hidden;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.info-card {
  border-radius: 12px;
  transition: all 0.3s;
  cursor: pointer;
  height: 100%;
}

.info-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
}

.info-content {
  text-align: center;
  padding: 8px;
}

.info-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 32px;
  color: white;
  transition: transform 0.3s;
}

.info-card:hover .info-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
}

.info-icon-wrapper.kelly {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.info-icon-wrapper.risk {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.info-icon-wrapper.dynamic {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.info-icon-wrapper.stop-loss {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.info-icon {
  font-size: 32px;
}

.info-content h4 {
  color: #303133;
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
}

.info-content p {
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 16px;
  min-height: 60px;
}

.info-link {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .position-management-view {
    padding: 16px;
  }

  .header-content {
    padding: 24px 20px;
  }

  .title-section {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .stat-card {
    padding: 12px;
  }

  .stat-content {
    gap: 12px;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }

  .stat-label {
    font-size: 12px;
  }

  .stat-value {
    font-size: 16px;
  }

  .tab-content {
    padding: 16px 0;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .feature-list {
    flex-direction: column;
    align-items: center;
  }
}

@media (max-width: 480px) {
  .stats-overview {
    grid-template-columns: 1fr;
  }

  .page-title {
    font-size: 20px;
  }

  .page-subtitle {
    font-size: 14px;
  }
}
</style>
