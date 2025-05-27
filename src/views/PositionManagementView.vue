<template>
  <div class="position-management-view">
    <div class="page-header">
      <h1>仓位管理</h1>
      <p class="subtitle">智能仓位计算与风险控制</p>
    </div>

    <div class="management-container">
      <!-- 功能选择标签 -->
      <div class="tab-navigation">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-button"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-text">{{ tab.name }}</span>
        </button>
      </div>

      <!-- Kelly公式计算器 -->
      <div v-show="activeTab === 'kelly'" class="tab-content">
        <KellyPositionCalculator />
      </div>

      <!-- 风险平价模型 -->
      <div v-show="activeTab === 'risk-parity'" class="tab-content">
        <RiskParityOptimizer />
      </div>

      <!-- 动态仓位调整 -->
      <div v-show="activeTab === 'dynamic'" class="tab-content">
        <DynamicPositionAdjuster />
      </div>

      <!-- 止损止盈管理 -->
      <div v-show="activeTab === 'stop-loss'" class="tab-content">
        <StopLossManager />
      </div>

      <!-- 风险监控 -->
      <div v-show="activeTab === 'risk-monitor'" class="tab-content">
        <div class="feature-placeholder">
          <div class="placeholder-icon">📊</div>
          <h3>风险监控</h3>
          <p>实时投资组合风险分析与预警</p>
          <div class="feature-list">
            <div class="feature-item">
              <span class="feature-icon">📊</span>
              <span>VaR风险价值</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🔍</span>
              <span>压力测试</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">⚠️</span>
              <span>风险预警系统</span>
            </div>
          </div>
          <button class="btn btn-primary" @click="showComingSoon">即将推出</button>
        </div>
      </div>
    </div>

    <!-- 功能介绍 -->
    <div class="info-section">
      <h3>仓位管理系统介绍</h3>
      <div class="info-grid">
        <div class="info-card">
          <div class="info-icon">🧮</div>
          <h4>Kelly公式</h4>
          <p>基于历史胜率和盈亏比，计算理论最优仓位大小，最大化长期资本增长率。</p>
        </div>

        <div class="info-card">
          <div class="info-icon">⚖️</div>
          <h4>风险平价</h4>
          <p>确保投资组合中每个资产的风险贡献相等，实现真正的风险分散。</p>
        </div>

        <div class="info-card">
          <div class="info-icon">🎯</div>
          <h4>动态调整</h4>
          <p>根据市场波动率和风险指标，动态调整仓位大小，控制投资组合风险。</p>
        </div>

        <div class="info-card">
          <div class="info-icon">🛡️</div>
          <h4>风险控制</h4>
          <p>智能止损止盈机制，实时风险监控，保护投资本金安全。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import KellyPositionCalculator from '@/components/position/KellyPositionCalculator.vue'
import RiskParityOptimizer from '@/components/risk/RiskParityOptimizer.vue'
import DynamicPositionAdjuster from '@/components/position/DynamicPositionAdjuster.vue'
import StopLossManager from '@/components/risk/StopLossManager.vue'
import { useToast } from '@/composables/useToast'

const { showToast } = useToast()

// 当前激活的标签
const activeTab = ref('kelly')

// 标签配置
const tabs = [
  {
    id: 'kelly',
    name: 'Kelly公式',
    icon: '🧮',
  },
  {
    id: 'risk-parity',
    name: '风险平价',
    icon: '⚖️',
  },
  {
    id: 'dynamic',
    name: '动态调整',
    icon: '🎯',
  },
  {
    id: 'stop-loss',
    name: '止损止盈',
    icon: '🛡️',
  },
  {
    id: 'risk-monitor',
    name: '风险监控',
    icon: '📊',
  },
]

// 显示即将推出提示
const showComingSoon = () => {
  showToast('该功能正在开发中，敬请期待！', 'info')
}
</script>

<style scoped>
.position-management-view {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 32px;
  color: #1890ff;
  margin-bottom: 10px;
}

.subtitle {
  font-size: 16px;
  color: #666;
}

.management-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 30px;
}

.tab-navigation {
  display: flex;
  background: #f5f5f5;
  border-bottom: 1px solid #e8e8e8;
}

.tab-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 15px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  color: #666;
}

.tab-button:hover {
  background: #e6f7ff;
  color: #1890ff;
}

.tab-button.active {
  background: white;
  color: #1890ff;
  border-bottom: 2px solid #1890ff;
}

.tab-icon {
  font-size: 18px;
}

.tab-text {
  font-weight: 500;
}

.tab-content {
  padding: 30px;
  min-height: 600px;
}

.feature-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 500px;
}

.placeholder-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.feature-placeholder h3 {
  font-size: 24px;
  color: #333;
  margin-bottom: 10px;
}

.feature-placeholder p {
  font-size: 16px;
  color: #666;
  margin-bottom: 30px;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: #f9f9f9;
  border-radius: 6px;
}

.feature-icon {
  font-size: 20px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #1890ff;
  color: white;
}

.btn-primary:hover {
  background: #40a9ff;
  transform: translateY(-2px);
}

.info-section {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.info-section h3 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  font-size: 24px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.info-card {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  transition: all 0.3s;
}

.info-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.info-icon {
  font-size: 40px;
  margin-bottom: 15px;
}

.info-card h4 {
  color: #333;
  margin-bottom: 10px;
  font-size: 18px;
}

.info-card p {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .tab-navigation {
    flex-wrap: wrap;
  }

  .tab-button {
    flex: 1 1 50%;
    min-width: 120px;
  }

  .tab-content {
    padding: 20px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
