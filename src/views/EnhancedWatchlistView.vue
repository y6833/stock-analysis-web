<template>
  <div class="enhanced-watchlist-view">
    <div class="page-header">
      <h1>关注列表</h1>
      <div class="header-actions">
        <el-button type="primary" @click="showAddStockDialog = true"> 添加股票 </el-button>
      </div>
    </div>

    <div class="watchlist-container">
      <enhanced-watchlist-component
        ref="watchlistRef"
        @view-stock="viewStock"
        @refresh="handleRefresh"
      />
    </div>

    <!-- 添加股票对话框 -->
    <el-dialog
      v-model="showAddStockDialog"
      title="添加股票到关注列表"
      width="500px"
      destroy-on-close
    >
      <div class="add-stock-form">
        <UnifiedStockSearch
          ref="stockSearchRef"
          placeholder="搜索股票..."
          @select="handleStockSelect"
        />
        <div v-if="selectedStock" class="selected-stock-info">
          <div class="stock-info-header">
            <span class="stock-symbol">{{ selectedStock.symbol }}</span>
            <span class="stock-name">{{ selectedStock.name }}</span>
          </div>
          <div class="stock-info-body">
            <el-form label-position="top">
              <el-form-item label="关注列表">
                <el-select v-model="selectedWatchlistId" style="width: 100%">
                  <el-option
                    v-for="watchlist in watchlists"
                    :key="watchlist.id"
                    :label="watchlist.name"
                    :value="watchlist.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="备注">
                <el-input
                  v-model="stockNotes"
                  type="textarea"
                  :rows="3"
                  placeholder="添加备注..."
                />
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddStockDialog = false">取消</el-button>
          <el-button
            type="primary"
            :disabled="!selectedStock || !selectedWatchlistId"
            @click="addStockToWatchlist"
          >
            添加
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEnhancedWatchlistStore } from '@/stores/stock/enhancedWatchlistStore'
import EnhancedWatchlistComponent from '@/components/watchlist/EnhancedWatchlistComponent.vue'
import UnifiedStockSearch from '@/components/common/UnifiedStockSearch.vue'
import type { Stock } from '@/types/stock'
import { ElMessage } from 'element-plus'

// 路由
const router = useRouter()

// 状态管理
const watchlistStore = useEnhancedWatchlistStore()

// 本地状态
const showAddStockDialog = ref(false)
const selectedStock = ref<Stock | null>(null)
const selectedWatchlistId = ref('')
const stockNotes = ref('')

// 组件引用
const watchlistRef = ref<InstanceType<typeof EnhancedWatchlistComponent>>()
const stockSearchRef = ref<InstanceType<typeof UnifiedStockSearch>>()

// 计算属性
const watchlists = computed(() => watchlistStore.watchlists)
const activeWatchlistId = computed(() => watchlistStore.activeWatchlistId)

// 方法
function viewStock(symbol: string) {
  router.push({
    name: 'StockAnalysis',
    params: { symbol },
  })
}

function handleRefresh(timestamp: number) {
  console.log('关注列表已刷新:', new Date(timestamp).toLocaleString())
}

function handleStockSelect(stock: Stock) {
  selectedStock.value = stock
  stockNotes.value = ''

  // 默认选择当前活动的关注列表
  if (activeWatchlistId.value && !selectedWatchlistId.value) {
    selectedWatchlistId.value = activeWatchlistId.value
  }
}

async function addStockToWatchlist() {
  if (!selectedStock.value || !selectedWatchlistId.value) return

  try {
    await watchlistStore.addStockToWatchlist(
      selectedWatchlistId.value,
      selectedStock.value.symbol,
      selectedStock.value.name,
      stockNotes.value
    )

    ElMessage.success(`已添加 ${selectedStock.value.name} 到关注列表`)
    showAddStockDialog.value = false
    selectedStock.value = null
    stockNotes.value = ''

    // 清除搜索框
    if (stockSearchRef.value) {
      stockSearchRef.value.clear()
    }

    // 刷新关注列表
    if (watchlistRef.value) {
      watchlistRef.value.refreshData()
    }
  } catch (error) {
    console.error('添加股票失败:', error)
    ElMessage.error('添加股票失败')
  }
}

// 初始化
onMounted(async () => {
  await watchlistStore.loadWatchlists()
})
</script>

<style scoped>
.enhanced-watchlist-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--spacing-lg);
  gap: var(--spacing-lg);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h1 {
  margin: 0;
  font-size: var(--font-size-xl);
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: var(--spacing-md);
}

.watchlist-container {
  flex: 1;
  min-height: 0;
}

.add-stock-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.selected-stock-info {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
}

.stock-info-header {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
}

.stock-symbol {
  font-family: monospace;
  font-weight: 600;
}

.stock-name {
  font-weight: 500;
}
</style>
