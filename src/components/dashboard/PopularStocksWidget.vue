<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStockStore } from '@/stores/stockStore'
import { stockService } from '@/services/stockService'
import type { Stock } from '@/types/stock'

const router = useRouter()
const stockStore = useStockStore()
const isLoading = ref(true)
const popularStocks = ref<Stock[]>([])

// 获取热门股票
onMounted(async () => {
  try {
    // 获取所有股票并取前10个作为热门股票
    const stocks = await stockService.getStocks()
    popularStocks.value = stocks.slice(0, 8)
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

// 添加到关注列表
const addToWatchlist = (stock: Stock) => {
  stockStore.addToWatchlist(stock.symbol)
}

// 检查股票是否已在关注列表中
const isInWatchlist = (symbol: string) => {
  return stockStore.watchlist.includes(symbol)
}

// 切换关注状态
const toggleWatchlist = (stock: Stock) => {
  if (isInWatchlist(stock.symbol)) {
    stockStore.removeFromWatchlist(stock.symbol)
  } else {
    stockStore.addToWatchlist(stock.symbol)
  }
}
</script>

<template>
  <div class="popular-stocks-widget">
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载热门股票...</p>
    </div>
    
    <div v-else class="stock-grid">
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
        <div class="stock-actions">
          <button 
            class="btn-icon" 
            @click.stop="toggleWatchlist(stock)"
            :title="isInWatchlist(stock.symbol) ? '取消关注' : '添加到关注列表'"
          >
            <span v-if="isInWatchlist(stock.symbol)">⭐</span>
            <span v-else>☆</span>
          </button>
          <button class="btn-icon" @click.stop="goToStockAnalysis(stock.symbol)" title="查看详情">
            <span>📈</span>
          </button>
        </div>
      </div>
    </div>
    
    <div class="widget-footer">
      <button class="btn btn-outline btn-sm" @click="router.push('/stock')">
        查看更多股票
      </button>
    </div>
  </div>
</template>

<style scoped>
.popular-stocks-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  gap: var(--spacing-md);
  flex: 1;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(66, 185, 131, 0.2);
  border-top: 3px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.stock-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--spacing-md);
  flex: 1;
  overflow-y: auto;
}

.stock-card {
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid var(--border-light);
}

.stock-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  background-color: var(--bg-primary);
}

.stock-info {
  margin-bottom: var(--spacing-sm);
}

.stock-info h3 {
  font-size: var(--font-size-md);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xs) 0;
  font-weight: 600;
}

.stock-symbol {
  font-size: var(--font-size-sm);
  color: var(--primary-color);
  margin: 0 0 var(--spacing-xs) 0;
  font-weight: 500;
}

.stock-market {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin: 0;
}

.stock-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-xs);
}

.btn-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.btn-icon:hover {
  background-color: var(--bg-tertiary);
}

.widget-footer {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--border-light);
}

.btn-sm {
  font-size: var(--font-size-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
}
</style>
