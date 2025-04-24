<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { stockService } from '@/services/stockService'
import type { Stock } from '@/types/stock'

const router = useRouter()
const popularStocks = ref<Stock[]>([])
const isLoading = ref(true)

// 获取热门股票
onMounted(async () => {
  try {
    // 获取所有股票并取前10个作为热门股票
    const stocks = await stockService.getStocks()
    popularStocks.value = stocks.slice(0, 10)
  } catch (error) {
    console.error('获取热门股票失败:', error)
  } finally {
    isLoading.value = false
  }
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
        <div class="hero-badge">专业版 2.0</div>
        <h1>智能股票分析平台</h1>
        <p>全面的技术分析、实时行情和仓位管理工具，助您把握市场脑波，做出更明智的投资决策</p>

        <div class="hero-stats">
          <div class="stat-item">
            <div class="stat-value">3000+</div>
            <div class="stat-label">支持股票</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">15+</div>
            <div class="stat-label">技术指标</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">99.9%</div>
            <div class="stat-label">数据准确度</div>
          </div>
        </div>

        <div class="hero-buttons">
          <button class="btn btn-accent" @click="router.push('/dashboard')">
            <span class="btn-icon">📊</span>
            <span>进入仪表盘</span>
          </button>
          <button class="btn btn-outline" @click="router.push('/stock')">
            <span class="btn-icon">📈</span>
            <span>股票分析</span>
          </button>
          <button class="btn btn-outline" @click="router.push('/market-heatmap')">
            <span class="btn-icon">🌎</span>
            <span>大盘云图</span>
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
        <div class="feature-card">
          <div class="icon">📈</div>
          <h3>股票走势分析</h3>
          <p>查看详细的股票价格走势图表，包含多种时间周期</p>
        </div>
        <div class="feature-card">
          <div class="icon">📋</div>
          <h3>技术指标</h3>
          <p>利用移动平均线、RSI等技术指标进行深入分析</p>
        </div>
        <div class="feature-card">
          <div class="icon">🔔</div>
          <h3>交易信号</h3>
          <p>接收买入和卖出信号提醒，把握最佳交易时机</p>
        </div>
        <div class="feature-card">
          <div class="icon">💼</div>
          <h3>仓位管理</h3>
          <p>跟踪您的投资组合，监控收益和风险</p>
        </div>
        <div class="feature-card" @click="router.push('/market-heatmap')">
          <div class="icon">🌎</div>
          <h3>大盘云图</h3>
          <p>直观展示市场整体情况，快速把握行业板块和热点趋势</p>
        </div>
      </div>
    </section>

    <section class="popular-stocks">
      <h2>热门股票</h2>
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
  display: inline-block;
  background-color: var(--accent-color);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  margin-bottom: var(--spacing-md);
  letter-spacing: 0.5px;
  box-shadow: 0 2px 5px rgba(66, 185, 131, 0.3);
}

.hero-content h1 {
  font-size: var(--font-size-xxl);
  margin-bottom: var(--spacing-md);
  color: var(--primary-color);
  line-height: 1.2;
  font-weight: 700;
  background: linear-gradient(to right, var(--primary-color), var(--accent-color));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.hero-content p {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-lg);
  line-height: 1.6;
  max-width: 90%;
}

.hero-stats {
  display: flex;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.stat-item {
  background-color: rgba(255, 255, 255, 0.8);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
  text-align: center;
  min-width: 100px;
  border: 1px solid var(--border-light);
}

.stat-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--accent-color);
  margin-bottom: var(--spacing-xs);
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.hero-buttons {
  display: flex;
  gap: var(--spacing-md);
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
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 70%);
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
}

/* 热门股票区域 */
.popular-stocks {
  margin: var(--spacing-xl) 0;
  padding: var(--spacing-xl) 0;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
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
