<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import UnifiedWatchlistManager from '@/components/common/UnifiedWatchlistManager.vue'
import type { Watchlist, WatchlistItem } from '@/types/dashboard'
import type { Stock } from '@/types/stock'

const props = defineProps<{
  show: boolean
  watchlists: Watchlist[]
  activeWatchlistId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', watchlists: Watchlist[], activeWatchlistId: string): void
}>()

// Local state
const localWatchlists = ref<Watchlist[]>([])
const localActiveWatchlistId = ref('')

// Convert dashboard types to unified types
const convertedWatchlists = computed(() => {
  return localWatchlists.value.map((watchlist) => ({
    id: watchlist.id,
    name: watchlist.name,
    description: `包含 ${watchlist.items.length} 只股票`,
    items: watchlist.items.map((item) => ({
      symbol: item.symbol,
      name: item.name,
      notes: '',
      addedAt: item.addedAt,
    })),
  }))
})

// Event handlers
const handleWatchlistsUpdate = (updatedWatchlists: any[]) => {
  // Convert back to dashboard format
  localWatchlists.value = updatedWatchlists.map((watchlist) => ({
    id: watchlist.id,
    name: watchlist.name,
    items: watchlist.items.map((item: any) => ({
      symbol: item.symbol,
      name: item.name,
      price: 0,
      change: 0,
      changePercent: 0,
      volume: 0,
      turnover: 0,
      addedAt: item.addedAt,
    })),
    sortBy: 'addedAt' as const,
    sortDirection: 'desc' as const,
    columns: ['symbol', 'name', 'price', 'change', 'changePercent'] as const,
  }))
}

const handleActiveWatchlistUpdate = (id: string) => {
  localActiveWatchlistId.value = id
}

const handleWatchlistCreated = async (watchlist: any) => {
  try {
    const { createWatchlist: apiCreateWatchlist } = await import('@/services/watchlistService')
    await apiCreateWatchlist({
      name: watchlist.name,
      description: watchlist.description || '通过关注列表管理器创建',
    })
  } catch (error) {
    console.error('创建关注列表失败:', error)
  }
}

const handleWatchlistDeleted = async (id: string) => {
  try {
    const { deleteWatchlist: apiDeleteWatchlist } = await import('@/services/watchlistService')
    await apiDeleteWatchlist(parseInt(id))
  } catch (error) {
    console.error('删除关注列表失败:', error)
  }
}

const handleStockAdded = async (watchlistId: string, stock: Stock) => {
  try {
    const { addStockToWatchlist: apiAddStock } = await import('@/services/watchlistService')
    await apiAddStock(parseInt(watchlistId), {
      stockCode: stock.symbol,
      stockName: stock.name,
    })
  } catch (error) {
    console.error('添加股票到关注列表失败:', error)
  }
}

const handleStockRemoved = async (watchlistId: string, symbol: string) => {
  try {
    const { getWatchlistItems, removeStockFromWatchlist: apiRemoveStock } = await import(
      '@/services/watchlistService'
    )
    const items = await getWatchlistItems(parseInt(watchlistId))
    const itemToRemove = items.find((item) => item.stockCode === symbol)
    if (itemToRemove) {
      await apiRemoveStock(parseInt(watchlistId), itemToRemove.id)
    }
  } catch (error) {
    console.error('从关注列表中移除股票失败:', error)
  }
}

const saveWatchlists = () => {
  emit('save', localWatchlists.value, localActiveWatchlistId.value)
  emit('close')
}

const closeManager = () => {
  emit('close')
}

onMounted(() => {
  localWatchlists.value = JSON.parse(JSON.stringify(props.watchlists))
  localActiveWatchlistId.value = props.activeWatchlistId
})
</script>

<template>
  <div v-if="show" class="watchlist-manager-overlay">
    <div class="watchlist-manager-panel">
      <UnifiedWatchlistManager
        title="关注列表管理"
        :watchlists="convertedWatchlists"
        :active-watchlist-id="localActiveWatchlistId"
        :show-close-button="true"
        @update:watchlists="handleWatchlistsUpdate"
        @update:activeWatchlistId="handleActiveWatchlistUpdate"
        @close="closeManager"
        @watchlist-created="handleWatchlistCreated"
        @watchlist-deleted="handleWatchlistDeleted"
        @stock-added="handleStockAdded"
        @stock-removed="handleStockRemoved"
      />

      <div class="manager-footer">
        <button class="btn btn-primary" @click="saveWatchlists">保存</button>
        <button class="btn btn-outline" @click="closeManager">取消</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.watchlist-manager-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.watchlist-manager-panel {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-light);
}

.manager-header h2 {
  font-size: var(--font-size-lg);
  color: var(--primary-color);
  margin: 0;
  font-weight: 600;
}

.manager-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.watchlist-tabs {
  display: flex;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-light);
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.watchlist-tab {
  padding: var(--spacing-xs) var(--spacing-md);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  transition: all var(--transition-fast);
}

.watchlist-tab:hover {
  background-color: var(--bg-tertiary);
}

.watchlist-tab.active {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.tab-name {
  font-weight: 500;
}

.add-tab-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bg-secondary);
  border: 1px dashed var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.add-tab-btn:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.new-tab-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.watchlist-content {
  flex: 1;
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.search-container {
  position: relative;
}

.search-input-container {
  position: relative;
}

.search-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--font-size-md);
}

.search-spinner {
  position: absolute;
  right: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border: 2px solid rgba(66, 185, 131, 0.1);
  border-radius: 50%;
  border-top: 2px solid var(--accent-color);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: translateY(-50%) rotate(0deg);
  }
  100% {
    transform: translateY(-50%) rotate(360deg);
  }
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  z-index: 10;
  max-height: 300px;
  overflow-y: auto;
}

.search-result-item {
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all var(--transition-fast);
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background-color: var(--bg-tertiary);
}

.stock-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.stock-name {
  font-weight: 500;
}

.stock-symbol {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.watchlist-items {
  flex: 1;
  overflow-y: auto;
}

.empty-watchlist {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  border: 1px dashed var(--border-color);
  color: var(--text-secondary);
}

.watchlist-table {
  width: 100%;
  border-collapse: collapse;
}

.watchlist-table th,
.watchlist-table td {
  padding: var(--spacing-sm);
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}

.watchlist-table th {
  font-weight: 600;
  color: var(--text-secondary);
  background-color: var(--bg-secondary);
}

.manager-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-light);
}

.btn-sm {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-xs);
}

@media (max-width: 768px) {
  .watchlist-manager-panel {
    width: 95%;
    max-height: 95vh;
  }
}
</style>
