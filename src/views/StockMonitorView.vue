<template>
  <PageLayout title="爱盯盘风格监控" subtitle="实时价格监控、快速添加股票、浮动窗口等特性">
    <template #actions>
      <el-button @click="toggleFloating">{{ isFloating ? '取消浮动' : '浮动显示' }}</el-button>
      <el-button @click="resetDemo">重置演示</el-button>
    </template>

    <div class="demo-section">
      <div class="demo-content split-layout">
        <!-- 左侧：功能介绍 -->
        <div class="features-panel content-panel glass-card split-layout__sidebar">
          <h3>核心功能</h3>
          <div class="feature-list">
            <div class="feature-item">
              <span class="feature-icon">📊</span>
              <div class="feature-content">
                <div class="feature-title">实时监控</div>
                <div class="feature-desc">实时显示股票价格和涨跌幅</div>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">⚡</span>
              <div class="feature-content">
                <div class="feature-title">快速添加</div>
                <div class="feature-desc">输入股票代码快速添加到监控列表</div>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🎯</span>
              <div class="feature-content">
                <div class="feature-title">浮动窗口</div>
                <div class="feature-desc">可拖拽的浮动窗口，不影响其他操作</div>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📱</span>
              <div class="feature-content">
                <div class="feature-title">最小化</div>
                <div class="feature-desc">支持最小化显示，节省屏幕空间</div>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📈</span>
              <div class="feature-content">
                <div class="feature-title">涨跌标识</div>
                <div class="feature-desc">颜色区分涨跌，直观显示市场状态</div>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🔄</span>
              <div class="feature-content">
                <div class="feature-title">自动刷新</div>
                <div class="feature-desc">定时自动刷新数据，保持信息最新</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：监控组件 -->
        <div class="monitor-panel split-layout__main" :class="{ floating: isFloating }">
          <SimpleStockMonitor ref="monitorRef" />
        </div>
      </div>
    </div>

    <!-- 使用说明 -->
    <div class="usage-section">
      <h2>使用说明</h2>
      <div class="usage-content">
        <div class="usage-step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h4>添加股票</h4>
            <p>在输入框中输入股票代码（如：000001），按回车或点击"添加"按钮</p>
          </div>
        </div>
        <div class="usage-step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h4>查看实时数据</h4>
            <p>添加后即可看到股票的实时价格、涨跌额和涨跌幅信息</p>
          </div>
        </div>
        <div class="usage-step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h4>管理监控列表</h4>
            <p>点击股票右侧的"×"按钮可以移除不需要的股票</p>
          </div>
        </div>
        <div class="usage-step">
          <div class="step-number">4</div>
          <div class="step-content">
            <h4>浮动显示</h4>
            <p>点击"浮动显示"按钮，监控窗口将变为可拖拽的浮动窗口</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 技术特性 -->
    <div class="tech-section">
      <h2>技术特性</h2>
      <div class="tech-grid">
        <div class="tech-card">
          <div class="tech-icon">⚡</div>
          <h4>Vue 3 响应式</h4>
          <p>基于Vue 3 Composition API，响应式数据更新</p>
        </div>
        <div class="tech-card">
          <div class="tech-icon">🎨</div>
          <h4>现代化UI</h4>
          <p>简洁美观的界面设计，支持深色模式</p>
        </div>
        <div class="tech-card">
          <div class="tech-icon">📱</div>
          <h4>响应式布局</h4>
          <p>适配各种屏幕尺寸，移动端友好</p>
        </div>
        <div class="tech-card">
          <div class="tech-icon">🔧</div>
          <h4>可扩展性</h4>
          <p>模块化设计，易于扩展新功能</p>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PageLayout from '@/components/common/PageLayout.vue'
import SimpleStockMonitor from '@/components/monitor/SimpleStockMonitor.vue'

// 响应式数据
const isFloating = ref(false)
const monitorRef = ref()

// 方法
const toggleFloating = () => {
  isFloating.value = !isFloating.value
}

const resetDemo = () => {
  // 重置演示数据
  if (monitorRef.value) {
    // 这里可以调用子组件的重置方法
    location.reload()
  }
}
</script>

<style scoped>
.demo-section {
  margin-bottom: var(--spacing-8);
}

.features-panel h3 {
  margin: 0 0 var(--spacing-lg) 0;
  color: var(--primary-color);
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.feature-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  transition: transform var(--transition-normal);
}

.feature-item:hover {
  transform: translateX(5px);
}

.feature-icon {
  font-size: 1.5em;
  width: 40px;
  text-align: center;
}

.feature-content {
  flex: 1;
}

.feature-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.feature-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.4;
}

.monitor-panel {
  position: relative;
  transition: all var(--transition-normal);
}

.monitor-panel.floating {
  position: fixed;
  top: 100px;
  right: 20px;
  z-index: 1000;
  transform: scale(1.05);
  box-shadow: var(--shadow-xl);
}

.usage-section,
.tech-section {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
}

.usage-section h2,
.tech-section h2 {
  margin: 0 0 var(--spacing-lg) 0;
  color: var(--primary-color);
}

.usage-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.usage-step {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-lg);
}

.step-number {
  width: 40px;
  height: 40px;
  background: var(--accent-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: var(--font-size-lg);
  flex-shrink: 0;
}

.step-content h4 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--primary-color);
}

.step-content p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.5;
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.tech-card {
  text-align: center;
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
  transition: transform var(--transition-normal);
}

.tech-card:hover {
  transform: translateY(-5px);
}

.tech-icon {
  font-size: 3em;
  margin-bottom: var(--spacing-md);
}

.tech-card h4 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--primary-color);
}

.tech-card p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .demo-content {
    grid-template-columns: 1fr;
  }
  
  .monitor-panel.floating {
    position: relative;
    top: auto;
    right: auto;
    transform: none;
  }
  
  .demo-header {
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .tech-grid {
    grid-template-columns: 1fr;
  }
}
</style>
