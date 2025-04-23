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
        <h1>欢迎使用股票分析系统</h1>
        <p>全面的股票分析工具，帮助您做出明智的投资决策</p>
        <div class="hero-buttons">
          <button class="btn primary" @click="router.push('/stock')">开始分析</button>
          <button class="btn secondary" @click="router.push('/portfolio')">管理仓位</button>
        </div>
      </div>
      <div class="hero-image">
        <img src="@/assets/stock-chart.svg" alt="股票图表" />
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 40px 0;
  gap: 40px;
}

.hero-content {
  flex: 1;
}

.hero-content h1 {
  font-size: 2.5rem;
  margin-bottom: 20px;
  color: #333;
}

.hero-content p {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 30px;
  line-height: 1.6;
}

.hero-buttons {
  display: flex;
  gap: 15px;
}

.hero-image {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.hero-image img {
  max-width: 100%;
  height: auto;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.primary {
  background-color: #42b983;
  color: white;
}

.primary:hover {
  background-color: #3aa876;
}

.secondary {
  background-color: #e0e0e0;
  color: #333;
}

.secondary:hover {
  background-color: #d0d0d0;
}

.features {
  margin: 60px 0;
}

.features h2 {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 40px;
  color: #333;
}

.feature-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
}

.feature-card {
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition:
    transform 0.3s,
    box-shadow 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.feature-card .icon {
  font-size: 2.5rem;
  margin-bottom: 20px;
}

.feature-card h3 {
  font-size: 1.3rem;
  margin-bottom: 15px;
  color: #333;
}

.feature-card p {
  color: #666;
  line-height: 1.6;
}

.popular-stocks {
  margin: 60px 0;
}

.popular-stocks h2 {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 40px;
  color: #333;
}

.stock-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.stock-card {
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition:
    transform 0.3s,
    box-shadow 0.3s;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.stock-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.stock-info h3 {
  font-size: 1.2rem;
  margin-bottom: 10px;
  color: #333;
}

.stock-symbol {
  font-weight: bold;
  color: #42b983;
  margin-bottom: 5px;
}

.stock-market {
  color: #999;
  font-size: 0.9rem;
}

.view-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #eee;
  color: #42b983;
  font-weight: 500;
}

.arrow {
  transition: transform 0.2s;
}

.stock-card:hover .arrow {
  transform: translateX(5px);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.loading-spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #42b983;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .hero {
    flex-direction: column;
    text-align: center;
  }

  .hero-buttons {
    justify-content: center;
  }
}
</style>
