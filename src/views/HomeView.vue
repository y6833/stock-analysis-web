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
    <section class="hero">
      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-icon">🚀</span>
          <span>专业版 3.0</span>
          <span class="badge-new">NEW</span>
        </div>
        <h1>
          <span class="gradient-text">智能股票分析平台</span>
          <span class="subtitle">AI驱动的投资决策助手</span>
        </h1>
        <p class="hero-description">
          集成多维度技术分析、实时市场监控、智能量化策略和风险管理于一体的专业投资平台
          <br />
          <span class="highlight">让数据驱动您的每一个投资决策</span>
        </p>

        <div class="hero-stats">
          <div class="stat-item">
            <div class="stat-icon">📊</div>
            <div class="stat-value">5000+</div>
            <div class="stat-label">A股全覆盖</div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">🔧</div>
            <div class="stat-value">30+</div>
            <div class="stat-label">技术指标</div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">⚡</div>
            <div class="stat-value">实时</div>
            <div class="stat-label">数据更新</div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">🎯</div>
            <div class="stat-value">99.9%</div>
            <div class="stat-label">准确率</div>
          </div>
        </div>

        <div class="hero-buttons">
          <button class="btn btn-accent" @click="router.push('/dashboard')">
            <span class="btn-icon">📊</span>
            <span>基础仪表盘</span>
          </button>
          <button class="btn btn-premium" @click="router.push('/advanced-dashboard')">
            <span class="btn-icon">🚀</span>
            <span>高级仪表盘</span>
          </button>
          <button class="btn btn-outline" @click="router.push('/smart-recommendation')">
            <span class="btn-icon">🤖</span>
            <span>AI推荐</span>
          </button>
          <button class="btn btn-outline" @click="router.push('/stock-monitor')">
            <span class="btn-icon">📈</span>
            <span>爱盯盘</span>
          </button>
        </div>
      </div>
      <div class="hero-image">
        <img src="@/assets/stock-chart.svg" alt="股票图表" class="main-image" />
        <div class="image-overlay"></div>
      </div>
    </section>

    <section class="features">
      <h2>主要功能</h2>
      <div class="feature-cards">
        <div class="feature-card" @click="router.push('/advanced-dashboard')">
          <div class="icon">🚀</div>
          <h3>高级仪表盘</h3>
          <p>专业级投资仪表盘，集成实时数据、技术指标和智能分析</p>
          <div class="feature-badge premium">高级功能</div>
        </div>
        <div class="feature-card" @click="router.push('/smart-recommendation')">
          <div class="icon">🤖</div>
          <h3>AI智能推荐</h3>
          <p>基于机器学习算法的个性化股票推荐和投资建议</p>
          <div class="feature-badge basic">基础功能</div>
        </div>
        <div class="feature-card" @click="router.push('/realtime-monitor')">
          <div class="icon">⚡</div>
          <h3>实时监控中心</h3>
          <p>WebSocket实时数据推送，市场异动即时提醒</p>
          <div class="feature-badge premium">高级功能</div>
        </div>
        <div class="feature-card" @click="router.push('/stock')">
          <div class="icon">📈</div>
          <h3>股票走势分析</h3>
          <p>查看详细的股票价格走势图表，包含多种时间周期和技术指标</p>
        </div>
        <div class="feature-card" @click="router.push('/portfolio')">
          <div class="icon">💼</div>
          <h3>仓位管理</h3>
          <p>跟踪您的投资组合，监控收益和风险，智能资产配置</p>
          <div class="feature-badge basic">基础功能</div>
        </div>
        <div class="feature-card" @click="router.push('/market-heatmap')">
          <div class="icon">🌎</div>
          <h3>大盘云图</h3>
          <p>直观展示市场整体情况，快速把握行业板块和热点趋势</p>
        </div>
        <div class="feature-card" @click="router.push('/backtest')">
          <div class="icon">🔄</div>
          <h3>策略回测</h3>
          <p>历史数据验证投资策略，量化分析策略表现</p>
          <div class="feature-badge premium">高级功能</div>
        </div>
        <div class="feature-card" @click="router.push('/stock-monitor')">
          <div class="icon">📈</div>
          <h3>爱盯盘监控</h3>
          <p>模仿爱盯盘插件的股票监控功能，支持浮动窗口和实时价格显示</p>
          <div class="feature-badge basic">基础功能</div>
        </div>
        <div class="feature-card" @click="router.push('/alerts')">
          <div class="icon">🔔</div>
          <h3>智能提醒</h3>
          <p>价格突破、技术指标信号等多维度智能提醒系统</p>
          <div class="feature-badge basic">基础功能</div>
        </div>
      </div>
    </section>

    <section class="popular-stocks">
      <h2>热门股票</h2>

      <!-- 数据来源信息 -->
      <DataSourceInfo
        v-if="!isLoading && dataSource !== '未知'"
        :dataSource="dataSource"
        :dataSourceMessage="dataSourceMessage"
        :isRealTime="isRealTime"
        :isCache="isCache"
        class="data-source-info-container"
      />

      <div v-if="isLoading" class="loading">
        <div class="loading-spinner"></div>
        <p>正在加载热门股票...</p>
      </div>
      <div v-else class="stock-cards">
        <div
          v-for="stock in popularStocks"
          :key="stock.symbol"
          class="stock-card"
          @click="goToStockAnalysis(stock.symbol)"
        >
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
.home-view {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

/* 英雄区域 */
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: var(--spacing-xl) 0;
  gap: var(--spacing-xl);
  position: relative;
  background: linear-gradient(to right, var(--bg-primary) 60%, var(--bg-secondary) 40%);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  opacity: 0.5;
}

.hero-content {
  flex: 1;
  position: relative;
  z-index: 1;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, var(--accent-color), #4ecdc4);
  color: white;
  padding: 8px 16px;
  border-radius: 25px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  margin-bottom: var(--spacing-lg);
  letter-spacing: 0.5px;
  box-shadow: 0 4px 15px rgba(66, 185, 131, 0.3);
  position: relative;
  overflow: hidden;
}

.hero-badge::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  animation: shimmer 2s infinite;
}

.badge-icon {
  font-size: 1.2em;
}

.badge-new {
  background: #ff6b6b;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.8em;
  font-weight: 700;
  animation: pulse 2s infinite;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.hero-content h1 {
  margin-bottom: var(--spacing-lg);
  line-height: 1.2;
}

.gradient-text {
  display: block;
  font-size: var(--font-size-xxl);
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color), #4ecdc4);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  margin-bottom: var(--spacing-xs);
}

.subtitle {
  display: block;
  font-size: var(--font-size-lg);
  font-weight: 400;
  color: var(--text-secondary);
  opacity: 0.8;
}

.hero-description {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xl);
  line-height: 1.8;
  max-width: 95%;
}

.highlight {
  color: var(--accent-color);
  font-weight: 600;
  position: relative;
}

.highlight::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, var(--accent-color), transparent);
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.stat-item {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85));
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-lg);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.stat-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, var(--accent-color), #4ecdc4);
}

.stat-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  font-size: 2rem;
  margin-bottom: var(--spacing-sm);
  display: block;
}

.stat-value {
  font-size: var(--font-size-xl);
  font-weight: 800;
  color: var(--primary-color);
  margin-bottom: var(--spacing-xs);
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

.hero-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--spacing-md);
  max-width: 600px;
}

.btn-premium {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
  border: none;
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--border-radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
}

.btn-premium:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
}

.hero-image {
  flex: 1;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
}

.main-image {
  max-width: 100%;
  height: auto;
  filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.1));
  transition: transform var(--transition-normal);
  transform: perspective(1000px) rotateY(-5deg);
  z-index: 2;
}

.hero:hover .main-image {
  transform: perspective(1000px) rotateY(0deg);
}

.image-overlay {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 20px;
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0) 70%);
  z-index: 1;
}

.btn-icon {
  font-size: 1.2em;
  margin-right: var(--spacing-xs);
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
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: white;
  box-shadow: 0 2px 8px rgba(46, 204, 113, 0.3);
}

.feature-badge.premium {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
  box-shadow: 0 2px 8px rgba(231, 76, 60, 0.3);
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
</style>
