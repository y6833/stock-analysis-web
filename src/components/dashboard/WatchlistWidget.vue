<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStockStore } from '@/stores/stockStore'
import { stockService } from '@/services/stockService'
import type { Stock } from '@/types/stock'

const router = useRouter()
const stockStore = useStockStore()
const isLoading = ref(true)
const watchlistStocks = ref<any[]>([])

// 从 store 获取关注列表
const watchlist = computed(() => stockStore.watchlist)

// 获取关注列表数据
onMounted(async () => {
  try {
    await loadWatchlistData()
  } catch (error) {
    console.error('加载关注列表失败:', error)
  } finally {
    isLoading.value = false
  }
})

// 加载关注列表数据
const loadWatchlistData = async () => {
  isLoading.value = true

  try {
    // 只使用真实的关注列表数据，不使用模拟数据
    if (watchlist.value.length === 0) {
      watchlistStocks.value = []
      console.log('关注列表为空，请添加股票到关注列表')
    } else {
      // 获取关注列表中的股票数据
      const promises = watchlist.value.map(async (symbol) => {
        try {
          const stockData = await stockService.getStockData(symbol)
          const stockInfo = (await stockService.getStocks()).find(s => s.symbol === symbol)

          if (stockInfo && stockData) {
            const lastPrice = stockData.prices[stockData.prices.length - 1]
            const prevPrice = stockData.prices[stockData.prices.length - 2] || stockData.prices[0]
            const change = ((lastPrice - prevPrice) / prevPrice * 100).toFixed(2)

            return {
              ...stockInfo,
              price: lastPrice,
              change,
              volume: stockData.volumes[stockData.volumes.length - 1]
            }
          }
          return null
        } catch (err) {
          console.error(`获取股票 ${symbol} 数据失败:`, err)
          return null
        }
      })

      const results = await Promise.all(promises)
      watchlistStocks.value = results.filter(Boolean) as any[]
    }
  } catch (error) {
    console.error('加载关注列表数据失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 跳转到股票分析页面
const goToStockAnalysis = (symbol: string) => {
  router.push({
    path: '/stock',
    query: { symbol },
  })
}

// 从关注列表中移除
const removeFromWatchlist = (symbol: string) => {
  stockStore.removeFromWatchlist(symbol)
  // 重新加载数据
  loadWatchlistData()
}

// 管理关注列表
const manageWatchlist = () => {
  router.push('/stock')
}
</script>

<template>
  <div class="watchlist-widget">
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载关注列表...</p>
    </div>

    <div v-else-if="watchlistStocks.length === 0" class="empty-watchlist">
      <p>您的关注列表为空</p>
      <button class="btn btn-outline btn-sm" @click="manageWatchlist">
        添加股票
      </button>
    </div>

    <div v-else class="watchlist-table">
      <table>
        <thead>
          <tr>
            <th>代码</th>
            <th>名称</th>
            <th>最新价</th>
            <th>涨跌幅</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="stock in watchlistStocks" :key="stock.symbol">
            <td>{{ stock.symbol }}</td>
            <td>{{ stock.name }}</td>
            <td>{{ typeof stock.price === 'number' ? stock.price.toFixed(2) : stock.price }}</td>
            <td :class="parseFloat(stock.change) > 0 ? 'up' : 'down'">
              {{ parseFloat(stock.change) > 0 ? '+' + stock.change : stock.change }}%
            </td>
            <td>
              <div class="action-buttons">
                <button class="btn-icon" @click="goToStockAnalysis(stock.symbol)" title="查看详情">
                  <span>📊</span>
                </button>
                <button class="btn-icon" @click="removeFromWatchlist(stock.symbol)" title="移除">
                  <span>×</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="widget-footer">
      <button class="btn btn-outline btn-sm" @click="manageWatchlist">
        管理关注列表
      </button>
      <button class="btn btn-outline btn-sm" @click="loadWatchlistData">
        刷新数据
      </button>
    </div>
  </div>
</template>

<style scoped>
.watchlist-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.loading-container,
.empty-watchlist {
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
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.watchlist-table {
  flex: 1;
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: var(--spacing-sm);
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}

th {
  font-weight: 600;
  color: var(--text-primary);
  background-color: var(--bg-secondary);
}

tr:hover {
  background-color: var(--bg-secondary);
}

.up {
  color: var(--stock-up);
}

.down {
  color: var(--stock-down);
}

.action-buttons {
  display: flex;
  gap: var(--spacing-xs);
}

.btn-icon {
  width: 24px;
  height: 24px;
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
  justify-content: space-between;
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--border-light);
}

.btn-sm {
  font-size: var(--font-size-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
}
</style>
