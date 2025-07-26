<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { stockService } from '@/services/stockService'
import type { Stock } from '@/types/stock'
import type { DataSourceType } from '@/services/dataSource/DataSourceFactory'
import DataSourceInfo from '@/components/common/DataSourceInfo.vue'
import { useToast } from '@/composables/useToast'
import eventBus from '@/utils/eventBus'

const router = useRouter()
const { showToast } = useToast()
const popularStocks = ref<Stock[]>([])
const isLoading = ref(true)

// 数据来源信息
const dataSource = ref('未知')
const dataSourceMessage = ref('数据来源未知')
const isRealTime = ref(false)
const isCache = ref(false)

// 获取热门股票和数据源信息
const fetchStocksAndUpdateInfo = async () => {
  isLoading.value = true

  try {
    // 获取所有股票并取前10个作为热门股票
    const result = await stockService.getStocks()

    // 保存股票数据
    popularStocks.value = result.slice(0, 10)

    // 保存数据来源信息
    if (result.data_source) {
      dataSource.value = result.data_source
      dataSourceMessage.value = result.data_source_message || `数据来自${result.data_source}`
      isRealTime.value = result.is_real_time || false
      isCache.value = result.is_cache || false

      // 显示数据来源提示
      const sourceType = isRealTime.value ? '实时' : '缓存'
      const toastType = isRealTime.value ? 'success' : 'info'
      showToast(dataSourceMessage.value, toastType)

      console.log(`数据来源: ${dataSource.value}, ${sourceType}数据`)
    }
  } catch (error) {
    console.error('获取热门股票失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 组件挂载时获取数据
onMounted(async () => {
  // 获取热门股票和数据源信息
  await fetchStocksAndUpdateInfo()

  // 监听数据源变化事件
  eventBus.on('data-source-changed', async (type: DataSourceType) => {
    console.log(`数据源已切换到: ${type}，正在更新数据...`)
    await fetchStocksAndUpdateInfo()
  })
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  // 移除事件监听
  eventBus.off('data-source-changed')
})

// 跳转到股票分析页面
const goToStockAnalysis = (symbol: string) => {
  router.push({
    path: '/stock',
    query: { symbol },
  })
}
</script>

<template>
  <main class="home-view">
    <!-- Hero 区域 -->
    <section class="hero">
      <div class="hero-background">
        <div class="hero-gradient"></div>
        <div class="hero-pattern"></div>
      </div>

      <div class="container">
        <div class="hero-content">
          <div class="hero-text">
            <div class="hero-badge">
              <span class="badge-icon">💎</span>
              <span class="badge-text">专业版 4.0</span>
              <span class="badge-new">NEW</span>
            </div>

            <h1 class="hero-title">
              <span class="title-main gradient-text">智能股票分析平台</span>
              <span class="title-sub">AI驱动的专业投资决策系统</span>
            </h1>

            <p class="hero-description">
              融合前沿人工智能技术与专业金融分析，为投资者提供全方位的市场洞察和决策支持。
              <strong class="highlight">让智能分析成就投资价值</strong>
            </p>

            <!-- 核心数据展示 -->
            <div class="hero-stats">
              <div class="stat-item">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                  <div class="stat-value">5,000+</div>
                  <div class="stat-label">A股全覆盖</div>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-icon">🔧</div>
                <div class="stat-content">
                  <div class="stat-value">50+</div>
                  <div class="stat-label">技术指标</div>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-icon">⚡</div>
                <div class="stat-content">
                  <div class="stat-value">实时</div>
                  <div class="stat-label">数据推送</div>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-icon">🎯</div>
                <div class="stat-content">
                  <div class="stat-value">99.9%</div>
                  <div class="stat-label">系统稳定性</div>
                </div>
              </div>
            </div>

            <!-- 快速入口按钮 -->
            <div class="hero-actions">
              <button class="btn btn-primary btn-lg" @click="router.push('/dashboard')">
                <span class="btn-icon">📊</span>
                <span>开始分析</span>
              </button>
              <button class="btn btn-outline btn-lg" @click="router.push('/strategies/smart-recommendation')">
                <span class="btn-icon">🤖</span>
                <span>AI推荐</span>
              </button>
            </div>
          </div>

          <div class="hero-visual">
            <div class="visual-container">
              <div class="chart-preview">
                <img src="@/assets/stock-chart.svg" alt="专业股票分析图表" class="chart-image" />
                <div class="chart-overlay">
                  <div class="data-point data-point-1">
                    <div class="point-value">+12.5%</div>
                    <div class="point-label">今日涨幅</div>
                  </div>
                  <div class="data-point data-point-2">
                    <div class="point-value">RSI: 65</div>
                    <div class="point-label">技术指标</div>
                  </div>
                  <div class="data-point data-point-3">
                    <div class="point-value">买入</div>
                    <div class="point-label">AI建议</div>
                  </div>
                </div>
              </div>
              <div class="floating-cards">
                <div class="floating-card card-1">
                  <div class="card-icon">📈</div>
                  <div class="card-text">实时监控</div>
                </div>
                <div class="floating-card card-2">
                  <div class="card-icon">🔔</div>
                  <div class="card-text">智能提醒</div>
                </div>
                <div class="floating-card card-3">
                  <div class="card-icon">💼</div>
                  <div class="card-text">组合管理</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 功能快捷入口 -->
    <section class="quick-access">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">功能快捷入口</h2>
          <p class="section-description">快速访问核心功能，提升投资效率</p>
        </div>

        <div class="quick-access-grid">
          <div class="quick-access-card primary" @click="router.push('/dashboard')">
            <div class="card-icon">📊</div>
            <div class="card-content">
              <h3>基础仪表盘</h3>
              <p>核心数据概览</p>
            </div>
            <div class="card-arrow">→</div>
          </div>

          <div class="quick-access-card premium" @click="router.push('/advanced-dashboard')">
            <div class="card-icon">🚀</div>
            <div class="card-content">
              <h3>高级仪表盘</h3>
              <p>专业级分析</p>
            </div>
            <span class="feature-badge premium">高级</span>
            <div class="card-arrow">→</div>
          </div>

          <div class="quick-access-card" @click="router.push('/strategies/smart-recommendation')">
            <div class="card-icon">🤖</div>
            <div class="card-content">
              <h3>AI智能推荐</h3>
              <p>智能选股建议</p>
            </div>
            <span class="feature-badge basic">基础</span>
            <div class="card-arrow">→</div>
          </div>

          <div class="quick-access-card" @click="router.push('/doji-pattern/screener')">
            <div class="card-icon">✨</div>
            <div class="card-content">
              <h3>十字星选股</h3>
              <p>形态筛选工具</p>
            </div>
            <span class="feature-badge basic">基础</span>
            <div class="card-arrow">→</div>
          </div>

          <div class="quick-access-card" @click="router.push('/stock')">
            <div class="card-icon">📈</div>
            <div class="card-content">
              <h3>股票分析</h3>
              <p>技术指标分析</p>
            </div>
            <div class="card-arrow">→</div>
          </div>

          <div class="quick-access-card" @click="router.push('/tools/export')">
            <div class="card-icon">📤</div>
            <div class="card-content">
              <h3>数据导出</h3>
              <p>导出分析数据</p>
            </div>
            <span class="feature-badge premium">高级</span>
            <div class="card-arrow">→</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 核心功能展示 -->
    <section class="features">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">核心功能</h2>
          <p class="section-description">专业的投资分析工具，助力您的投资决策</p>
        </div>

        <div class="feature-categories">
          <!-- 仪表盘类 -->
          <div class="feature-category">
            <div class="category-header">
              <div class="category-icon">📊</div>
              <h3 class="category-title">数据仪表盘</h3>
            </div>
            <div class="category-cards">
              <div class="feature-card" @click="router.push('/dashboard')">
                <div class="card-header">
                  <div class="icon">📊</div>
                  <h4>基础仪表盘</h4>
                </div>
                <p>核心市场数据概览，快速了解市场动态</p>
                <div class="card-footer">
                  <span class="access-level free">免费</span>
                </div>
              </div>

              <div class="feature-card premium-card" @click="router.push('/advanced-dashboard')">
                <div class="card-header">
                  <div class="icon">🚀</div>
                  <h4>高级仪表盘</h4>
                </div>
                <p>专业级投资仪表盘，集成实时数据和智能分析</p>
                <div class="card-footer">
                  <span class="feature-badge premium">高级</span>
                </div>
              </div>

              <div class="feature-card premium-card" @click="router.push('/stock/realtime-monitor')">
                <div class="card-header">
                  <div class="icon">⚡</div>
                  <h4>实时监控</h4>
                </div>
                <p>WebSocket实时数据推送，市场异动即时提醒</p>
                <div class="card-footer">
                  <span class="feature-badge premium">高级</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 分析工具类 -->
          <div class="feature-category">
            <div class="category-header">
              <div class="category-icon">📈</div>
              <h3 class="category-title">分析工具</h3>
            </div>
            <div class="category-cards">
              <div class="feature-card" @click="router.push('/stock')">
                <div class="card-header">
                  <div class="icon">📈</div>
                  <h4>股票分析</h4>
                </div>
                <p>详细的技术指标分析和价格走势图表</p>
                <div class="card-footer">
                  <span class="access-level free">免费</span>
                </div>
              </div>

              <div class="feature-card" @click="router.push('/market/heatmap')">
                <div class="card-header">
                  <div class="icon">🌎</div>
                  <h4>大盘云图</h4>
                </div>
                <p>直观展示市场整体情况和行业板块趋势</p>
                <div class="card-footer">
                  <span class="access-level free">免费</span>
                </div>
              </div>

              <div class="feature-card basic-card" @click="router.push('/position-management')">
                <div class="card-header">
                  <div class="icon">💼</div>
                  <h4>仓位管理</h4>
                </div>
                <p>投资组合跟踪，收益风险监控和资产配置</p>
                <div class="card-footer">
                  <span class="feature-badge basic">基础</span>
                </div>
              </div>

              <div class="feature-card basic-card" @click="router.push('/strategies/turtle-trading')">
                <div class="card-header">
                  <div class="icon">🐢</div>
                  <h4>海龟交易法</h4>
                </div>
                <p>经典的趋势跟踪交易策略系统</p>
                <div class="card-footer">
                  <span class="feature-badge basic">基础</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 智能工具类 -->
          <div class="feature-category">
            <div class="category-header">
              <div class="category-icon">🤖</div>
              <h3 class="category-title">智能工具</h3>
            </div>
            <div class="category-cards">
              <div class="feature-card basic-card" @click="router.push('/strategies/smart-recommendation')">
                <div class="card-header">
                  <div class="icon">🤖</div>
                  <h4>AI智能推荐</h4>
                </div>
                <p>基于机器学习算法的个性化股票推荐系统，智能分析市场趋势</p>
                <div class="card-footer">
                  <span class="access-level free">基础</span>
                </div>
              </div>

              <div class="feature-card basic-card" @click="router.push('/doji-pattern/screener')">
                <div class="card-header">
                  <div class="icon">✨</div>
                  <h4>十字星选股</h4>
                </div>
                <p>专业的十字星形态识别与筛选工具，发现潜在的反转机会</p>
                <div class="card-footer">
                  <span class="access-level free">基础</span>
                </div>
              </div>

              <div class="feature-card basic-card" @click="router.push('/alerts')">
                <div class="card-header">
                  <div class="icon">🔔</div>
                  <h4>智能提醒</h4>
                </div>
                <p>价格突破和技术指标信号的智能提醒</p>
                <div class="card-footer">
                  <span class="access-level free">基础</span>
                </div>
              </div>

              <div class="feature-card basic-card" @click="router.push('/doji-pattern/alerts')">
                <div class="card-header">
                  <div class="icon">⚡</div>
                  <h4>十字星提醒</h4>
                </div>
                <p>十字星形态出现时的专业提醒服务，不错过关键信号</p>
                <div class="card-footer">
                  <span class="access-level free">基础</span>
                </div>
              </div>

              <div class="feature-card premium-card" @click="router.push('/backtest')">
                <div class="card-header">
                  <div class="icon">🔄</div>
                  <h4>策略回测</h4>
                </div>
                <p>历史数据验证投资策略，量化分析表现</p>
                <div class="card-footer">
                  <span class="feature-badge premium">高级</span>
                </div>
              </div>

              <div class="feature-card premium-card" @click="router.push('/risk/monitoring')">
                <div class="card-header">
                  <div class="icon">🛡️</div>
                  <h4>风险管理</h4>
                </div>
                <p>全方位的风险监控与控制系统，保护投资安全</p>
                <div class="card-footer">
                  <span class="feature-badge premium">高级</span>
                </div>
              </div>

              <div class="feature-card premium-card" @click="router.push('/risk/simulation')">
                <div class="card-header">
                  <div class="icon">🎮</div>
                  <h4>模拟交易</h4>
                </div>
                <p>虚拟交易环境，无风险练习投资策略</p>
                <div class="card-footer">
                  <span class="feature-badge premium">高级</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="popular-stocks">
      <h2>热门股票</h2>

      <!-- 数据来源信息 -->
      <DataSourceInfo v-if="!isLoading && dataSource !== '未知'" :dataSource="dataSource"
        :dataSourceMessage="dataSourceMessage" :isRealTime="isRealTime" :isCache="isCache"
        class="data-source-info-container" />

      <div v-if="isLoading" class="loading">
        <div class="loading-spinner"></div>
        <p>正在加载热门股票...</p>
      </div>
      <div v-else class="stock-cards">
        <div v-for="stock in popularStocks" :key="stock.symbol" class="stock-card"
          @click="goToStockAnalysis(stock.symbol)">
          <div class="stock-info">
            <h3>{{ stock.name }}</h3>
            <p class="stock-symbol">{{ stock.symbol }}</p>
            <p class="stock-market">{{ stock.market }}</p>
          </div>
          <div class="view-btn">
            <span>查看分析</span>
            <span class="arrow">→</span>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* ===== 首页样式 ===== */
.home-view {
  min-height: 100vh;
  background: var(--bg-primary);
  position: relative;
  overflow-x: hidden;
}

/* ===== 通用容器 ===== */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-6);
}

/* ===== Hero 区域 ===== */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.hero-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--gradient-hero);
  opacity: 0.95;
}

.hero-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
  background-size: 100px 100px, 150px 150px;
  animation: patternMove 20s ease-in-out infinite;
}

@keyframes patternMove {

  0%,
  100% {
    transform: translate(0, 0);
  }

  50% {
    transform: translate(20px, 20px);
  }
}

.hero-content {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-16);
  align-items: center;
  width: 100%;
}

/* Hero 文本区域 */
.hero-text {
  color: var(--text-inverse);
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  background: rgba(255, 255, 255, 0.15);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: var(--shadow-lg);
}

.badge-icon {
  font-size: var(--font-size-lg);
}

.badge-text {
  font-weight: var(--font-weight-semibold);
}

.badge-new {
  background: var(--gradient-warning);
  color: var(--text-inverse);
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  box-shadow: var(--shadow-sm);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {

  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

.hero-title {
  margin-bottom: var(--spacing-6);
}

.title-main {
  display: block;
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: var(--font-weight-black);
  line-height: var(--line-height-tight);
  margin-bottom: var(--spacing-2);
}

.title-sub {
  display: block;
  font-size: clamp(1.2rem, 2.5vw, 1.8rem);
  font-weight: var(--font-weight-normal);
  color: rgba(255, 255, 255, 0.9);
  font-style: italic;
}

.hero-description {
  font-size: var(--font-size-lg);
  line-height: var(--line-height-relaxed);
  margin-bottom: var(--spacing-8);
  color: rgba(255, 255, 255, 0.9);
}

.highlight {
  color: #ffd700;
  font-weight: var(--font-weight-semibold);
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
}

/* Hero 统计数据 */
.hero-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-8);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-xl);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: var(--transition-normal);
}

.stat-item:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.15);
  box-shadow: var(--shadow-xl);
}

.stat-icon {
  font-size: var(--font-size-2xl);
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-inverse);
  line-height: var(--line-height-tight);
  font-family: var(--font-family-number);
}

.stat-label {
  font-size: var(--font-size-sm);
  color: rgba(255, 255, 255, 0.8);
  font-weight: var(--font-weight-medium);
}

/* Hero 操作按钮 */
.hero-actions {
  display: flex;
  gap: var(--spacing-4);
  flex-wrap: wrap;
}

.btn-lg {
  padding: var(--spacing-4) var(--spacing-8);
  font-size: var(--font-size-base);
  min-height: 56px;
}

.btn-icon {
  font-size: var(--font-size-lg);
}

/* Hero 视觉区域 */
.hero-visual {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.visual-container {
  position: relative;
  width: 100%;
  max-width: 500px;
}

.chart-preview {
  position: relative;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-2xl);
  padding: var(--spacing-6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: var(--shadow-2xl);
}

.chart-image {
  width: 100%;
  height: auto;
  border-radius: var(--border-radius-lg);
  filter: brightness(1.1) contrast(1.1);
}

.chart-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.data-point {
  position: absolute;
  background: var(--gradient-accent);
  color: var(--text-inverse);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--border-radius-lg);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  box-shadow: var(--shadow-lg);
  animation: float 3s ease-in-out infinite;
}

.data-point-1 {
  top: 20%;
  right: 10%;
  animation-delay: 0s;
}

.data-point-2 {
  top: 50%;
  left: 5%;
  animation-delay: 1s;
}

.data-point-3 {
  bottom: 25%;
  right: 20%;
  animation-delay: 2s;
}

@keyframes float {

  0%,
  100% {
    transform: translateY(0px);
  }

  50% {
    transform: translateY(-10px);
  }
}

.point-value {
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-1);
}

.point-label {
  font-size: var(--font-size-xs);
  opacity: 0.9;
}

.floating-cards {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.floating-card {
  position: absolute;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-primary);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--border-radius-lg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(10px);
  animation: floatSlow 4s ease-in-out infinite;
}

.card-1 {
  top: 10%;
  left: -10%;
  animation-delay: 0s;
}

.card-2 {
  top: 60%;
  right: -15%;
  animation-delay: 1.5s;
}

.card-3 {
  bottom: 15%;
  left: -5%;
  animation-delay: 3s;
}

@keyframes floatSlow {

  0%,
  100% {
    transform: translate(0, 0);
  }

  50% {
    transform: translate(10px, -15px);
  }
}

.card-icon {
  font-size: var(--font-size-base);
}

.card-text {
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

/* ===== 快捷入口区域 ===== */
.quick-access {
  padding: var(--spacing-16) 0;
  background: var(--bg-secondary);
}

.section-header {
  text-align: center;
  margin-bottom: var(--spacing-12);
}

.section-title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-4);
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 4px;
  background: var(--gradient-accent);
  border-radius: var(--border-radius-full);
}

.section-description {
  font-size: var(--font-size-lg);
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto;
}

.quick-access-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-6);
}

.quick-access-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-6);
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-md);
  transition: var(--transition-normal);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.quick-access-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--gradient-accent);
  transform: scaleX(0);
  transition: transform var(--transition-normal);
}

.quick-access-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
  border-color: var(--accent-color);
}

.quick-access-card:hover::before {
  transform: scaleX(1);
}

.quick-access-card.primary {
  border-color: var(--primary-color);
}

.quick-access-card.premium {
  border-color: var(--warning-color);
  background: linear-gradient(135deg, var(--bg-primary) 0%, rgba(214, 158, 46, 0.05) 100%);
}

.quick-access-card .card-icon {
  font-size: var(--font-size-3xl);
  flex-shrink: 0;
}

.quick-access-card .card-content {
  flex: 1;
}

.quick-access-card h3 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-1);
}

.quick-access-card p {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}

.quick-access-card .card-arrow {
  font-size: var(--font-size-xl);
  color: var(--accent-color);
  transition: transform var(--transition-fast);
}

.quick-access-card:hover .card-arrow {
  transform: translateX(4px);
}

/* 功能区域 */
.features {
  margin: var(--spacing-xl) 0;
  padding: var(--spacing-xl) 0;
  position: relative;
}

.features h2 {
  text-align: center;
  font-size: var(--font-size-xl);
  margin-bottom: var(--spacing-xl);
  color: var(--primary-color);
  position: relative;
  display: inline-block;
  left: 50%;
  transform: translateX(-50%);
}

.features h2::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 50px;
  height: 3px;
  background-color: var(--accent-color);
  border-radius: 3px;
}

.feature-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.feature-card {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-normal);
  border: 1px solid var(--border-light);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
  border-color: var(--accent-light);
}

.feature-card .icon {
  font-size: 2.5rem;
  margin-bottom: var(--spacing-md);
  color: var(--accent-color);
  display: inline-block;
  background-color: rgba(66, 185, 131, 0.1);
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-md);
}

.feature-card h3 {
  font-size: var(--font-size-lg);
  margin-bottom: var(--spacing-sm);
  color: var(--primary-color);
  font-weight: 600;
}

.feature-card p {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: var(--spacing-md);
}

.feature-badge {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  padding: 4px 8px;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.feature-badge.basic {
  background: var(--gradient-success);
  color: var(--text-inverse);
}

.feature-badge.premium {
  background: var(--gradient-premium);
  color: var(--text-inverse);
}

/* 热门股票区域 */
.popular-stocks {
  margin: var(--spacing-xl) 0;
  padding: var(--spacing-xl) 0;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
  position: relative;
}

/* 数据来源信息容器 */
.data-source-info-container {
  max-width: 600px;
  margin: 0 auto var(--spacing-md);
}

.popular-stocks h2 {
  text-align: center;
  font-size: var(--font-size-xl);
  margin-bottom: var(--spacing-xl);
  color: var(--primary-color);
}

.stock-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-md);
}

.stock-card {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
  cursor: pointer;
  border: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.stock-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: var(--accent-light);
}

.stock-info h3 {
  font-size: var(--font-size-md);
  margin-bottom: var(--spacing-xs);
  color: var(--primary-color);
}

.stock-symbol {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-xs);
}

.stock-market {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-bottom: var(--spacing-md);
}

.view-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--border-light);
  color: var(--accent-color);
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.arrow {
  transition: transform var(--transition-fast);
}

.stock-card:hover .arrow {
  transform: translateX(3px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hero {
    flex-direction: column;
    padding: var(--spacing-md);
  }

  .hero-content {
    text-align: center;
  }

  .hero-content p {
    max-width: 100%;
  }

  .hero-stats {
    justify-content: center;
  }

  .hero-buttons {
    justify-content: center;
  }

  .hero-image {
    margin-top: var(--spacing-lg);
  }

  .main-image {
    transform: none;
  }

  .hero:hover .main-image {
    transform: none;
  }
}

/* ===== 响应式设计 ===== */
@media (max-width: 1024px) {
  .hero-content {
    grid-template-columns: 1fr;
    gap: var(--spacing-12);
    text-align: center;
  }

  .hero-visual {
    order: -1;
  }

  .quick-access-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  .category-cards {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 var(--spacing-4);
  }

  .hero {
    min-height: 80vh;
    padding: var(--spacing-8) 0;
  }

  .hero-stats {
    grid-template-columns: 1fr;
    gap: var(--spacing-3);
  }

  .hero-actions {
    justify-content: center;
  }

  .btn-lg {
    padding: var(--spacing-3) var(--spacing-6);
    min-height: 48px;
  }

  .title-main {
    font-size: clamp(2rem, 8vw, 3rem);
  }

  .title-sub {
    font-size: clamp(1rem, 4vw, 1.5rem);
  }

  .quick-access-grid {
    grid-template-columns: 1fr;
  }

  .category-cards {
    grid-template-columns: 1fr;
  }

  .feature-categories {
    gap: var(--spacing-8);
  }

  .category-header {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-2);
  }

  .floating-cards {
    display: none;
  }
}

@media (max-width: 480px) {
  .hero-badge {
    font-size: var(--font-size-xs);
    padding: var(--spacing-1) var(--spacing-3);
  }

  .hero-description {
    font-size: var(--font-size-base);
  }

  .section-title {
    font-size: var(--font-size-2xl);
  }

  .section-description {
    font-size: var(--font-size-base);
  }

  .quick-access-card {
    padding: var(--spacing-4);
  }

  .feature-card {
    padding: var(--spacing-4);
  }
}
</style>
