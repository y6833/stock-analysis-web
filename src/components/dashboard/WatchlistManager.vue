<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { Watchlist, WatchlistItem } from '@/types/dashboard'
import { stockService } from '@/services/stockService'
import type { Stock } from '@/types/stock'
import { v4 as uuidv4 } from 'uuid'

const props = defineProps<{
  show: boolean
  watchlists: Watchlist[]
  activeWatchlistId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', watchlists: Watchlist[], activeWatchlistId: string): void
}>()

// 本地数据副本
const localWatchlists = ref<Watchlist[]>([])
const localActiveWatchlistId = ref('')

// 新建关注列表相关
const isCreatingWatchlist = ref(false)
const newWatchlistName = ref('')

// 搜索股票相关
const searchQuery = ref('')
const searchResults = ref<Stock[]>([])
const isSearching = ref(false)

// 当前选中的关注列表
const activeWatchlist = computed(() => {
  return localWatchlists.value.find((w) => w.id === localActiveWatchlistId.value) || null
})

// 初始化
onMounted(() => {
  // 创建深拷贝以避免直接修改props
  localWatchlists.value = JSON.parse(JSON.stringify(props.watchlists))
  localActiveWatchlistId.value = props.activeWatchlistId
})

// 创建新的关注列表
const createWatchlist = async () => {
  if (!newWatchlistName.value.trim()) return

  try {
    // 导入watchlistService
    const { createWatchlist: apiCreateWatchlist } = await import('@/services/watchlistService')

    // 调用API创建关注列表
    const newWatchlist = await apiCreateWatchlist({
      name: newWatchlistName.value.trim(),
      description: '通过关注列表管理器创建',
    })

    // 转换为前端格式
    const convertedWatchlist: Watchlist = {
      id: newWatchlist.id.toString(),
      name: newWatchlist.name,
      items: [],
      sortBy: 'addedAt',
      sortDirection: 'desc',
      columns: ['symbol', 'name', 'price', 'change', 'changePercent'],
    }

    // 添加到本地列表
    localWatchlists.value.push(convertedWatchlist)
    localActiveWatchlistId.value = convertedWatchlist.id
    newWatchlistName.value = ''
    isCreatingWatchlist.value = false
  } catch (error) {
    console.error('创建关注列表失败:', error)

    // 如果API调用失败，使用本地创建作为备份
    const newWatchlist: Watchlist = {
      id: uuidv4(),
      name: newWatchlistName.value.trim(),
      items: [],
      sortBy: 'addedAt',
      sortDirection: 'desc',
      columns: ['symbol', 'name', 'price', 'change', 'changePercent'],
    }

    localWatchlists.value.push(newWatchlist)
    localActiveWatchlistId.value = newWatchlist.id
    newWatchlistName.value = ''
    isCreatingWatchlist.value = false
  }
}

// 删除关注列表
const deleteWatchlist = async (watchlistId: string) => {
  // 不允许删除最后一个关注列表
  if (localWatchlists.value.length <= 1) return

  try {
    // 导入watchlistService
    const { deleteWatchlist: apiDeleteWatchlist } = await import('@/services/watchlistService')

    // 调用API删除关注列表
    await apiDeleteWatchlist(parseInt(watchlistId))

    // 从本地列表中移除
    localWatchlists.value = localWatchlists.value.filter((w) => w.id !== watchlistId)

    // 如果删除的是当前选中的关注列表，则选中第一个关注列表
    if (localActiveWatchlistId.value === watchlistId) {
      localActiveWatchlistId.value = localWatchlists.value[0].id
    }
  } catch (error) {
    console.error('删除关注列表失败:', error)

    // 如果API调用失败，仍然从本地列表中移除
    localWatchlists.value = localWatchlists.value.filter((w) => w.id !== watchlistId)

    // 如果删除的是当前选中的关注列表，则选中第一个关注列表
    if (localActiveWatchlistId.value === watchlistId) {
      localActiveWatchlistId.value = localWatchlists.value[0].id
    }
  }
}

// 搜索股票
const searchStocks = async () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }

  isSearching.value = true

  try {
    const stocks = await stockService.getStocks()
    searchResults.value = stocks
      .filter(
        (stock: Stock) =>
          stock.symbol.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
          stock.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
      .slice(0, 10) // 限制结果数量
  } catch (error) {
    console.error('搜索股票失败:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

// 添加股票到关注列表
const addStockToWatchlist = async (stock: Stock) => {
  if (!activeWatchlist.value) return

  // 检查是否已存在
  const exists = activeWatchlist.value.items.some(
    (item: WatchlistItem) => item.symbol === stock.symbol
  )

  if (exists) {
    // 清空搜索
    searchQuery.value = ''
    searchResults.value = []
    return
  }

  try {
    // 导入watchlistService
    const { addStockToWatchlist: apiAddStock } = await import('@/services/watchlistService')

    // 调用API添加股票到关注列表
    await apiAddStock(parseInt(activeWatchlist.value.id), {
      stockCode: stock.symbol,
      stockName: stock.name,
    })

    // 创建新的关注项（本地显示用）
    const newItem: WatchlistItem = {
      symbol: stock.symbol,
      name: stock.name,
      price: 0,
      change: 0,
      changePercent: 0,
      volume: 0,
      turnover: 0,
      addedAt: new Date().toISOString(),
    }

    // 添加到本地列表
    activeWatchlist.value.items.push(newItem)
  } catch (error) {
    console.error('添加股票到关注列表失败:', error)

    // 如果API调用失败，仍然添加到本地列表
    const newItem: WatchlistItem = {
      symbol: stock.symbol,
      name: stock.name,
      price: 0,
      change: 0,
      changePercent: 0,
      volume: 0,
      turnover: 0,
      addedAt: new Date().toISOString(),
    }

    activeWatchlist.value.items.push(newItem)
  }

  // 清空搜索
  searchQuery.value = ''
  searchResults.value = []
}

// 从关注列表中移除股票
const removeStockFromWatchlist = async (symbol: string) => {
  if (!activeWatchlist.value) return

  try {
    // 导入watchlistService
    const { getWatchlistItems, removeStockFromWatchlist: apiRemoveStock } = await import(
      '@/services/watchlistService'
    )

    // 获取关注列表中的股票
    const items = await getWatchlistItems(parseInt(activeWatchlist.value.id))

    // 查找要删除的股票项
    const itemToRemove = items.find((item) => item.stockCode === symbol)

    if (itemToRemove) {
      // 调用API从关注列表中删除股票
      await apiRemoveStock(parseInt(activeWatchlist.value.id), itemToRemove.id)

      // 从本地列表中移除
      activeWatchlist.value.items = activeWatchlist.value.items.filter(
        (item: WatchlistItem) => item.symbol !== symbol
      )
    } else {
      console.warn(`未找到要删除的股票: ${symbol}`)
    }
  } catch (error) {
    console.error('从关注列表中移除股票失败:', error)

    // 如果API调用失败，仍然从本地列表中移除
    activeWatchlist.value.items = activeWatchlist.value.items.filter(
      (item: WatchlistItem) => item.symbol !== symbol
    )
  }
}

// 保存关注列表
const saveWatchlists = () => {
  emit('save', localWatchlists.value, localActiveWatchlistId.value)
  emit('close')
}

// 关闭管理器
const closeManager = () => {
  emit('close')
}
</script>

<template>
  <div v-if="show" class="watchlist-manager-overlay">
    <div class="watchlist-manager-panel">
      <div class="manager-header">
        <h2>关注列表管理</h2>
        <button class="btn-icon-only" @click="closeManager">
          <span>✖</span>
        </button>
      </div>

      <div class="manager-content">
        <div class="watchlist-tabs">
          <div
            v-for="watchlist in localWatchlists"
            :key="watchlist.id"
            class="watchlist-tab"
            :class="{ active: localActiveWatchlistId === watchlist.id }"
            @click="localActiveWatchlistId = watchlist.id"
          >
            <span class="tab-name">{{ watchlist.name }}</span>
            <button
              v-if="localWatchlists.length > 1"
              class="btn-icon-only btn-sm"
              @click.stop="deleteWatchlist(watchlist.id)"
              title="删除关注列表"
            >
              <span>✖</span>
            </button>
          </div>

          <button
            v-if="!isCreatingWatchlist"
            class="add-tab-btn"
            @click="isCreatingWatchlist = true"
            title="新建关注列表"
          >
            <span>+</span>
          </button>

          <div v-else class="new-tab-form">
            <input
              v-model="newWatchlistName"
              type="text"
              placeholder="输入名称"
              class="input-field"
              @keyup.enter="createWatchlist"
            />
            <div class="form-actions">
              <button class="btn btn-primary btn-sm" @click="createWatchlist">创建</button>
              <button class="btn btn-outline btn-sm" @click="isCreatingWatchlist = false">
                取消
              </button>
            </div>
          </div>
        </div>

        <div v-if="activeWatchlist" class="watchlist-content">
          <div class="search-container">
            <div class="search-input-container">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索股票添加到关注列表..."
                class="search-input"
                @input="searchStocks"
              />
              <div v-if="isSearching" class="search-spinner"></div>
            </div>

            <div v-if="searchResults.length > 0" class="search-results">
              <div
                v-for="stock in searchResults"
                :key="stock.symbol"
                class="search-result-item"
                @click="addStockToWatchlist(stock)"
              >
                <div class="stock-info">
                  <div class="stock-name">{{ stock.name }}</div>
                  <div class="stock-symbol">{{ stock.symbol }}</div>
                </div>
                <button class="btn-icon-only btn-sm">
                  <span>+</span>
                </button>
              </div>
            </div>
          </div>

          <div class="watchlist-items">
            <div v-if="activeWatchlist.items.length === 0" class="empty-watchlist">
              <p>关注列表为空，请搜索并添加股票</p>
            </div>

            <table v-else class="watchlist-table">
              <thead>
                <tr>
                  <th>代码</th>
                  <th>名称</th>
                  <th>添加时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in activeWatchlist.items" :key="item.symbol">
                  <td>{{ item.symbol }}</td>
                  <td>{{ item.name }}</td>
                  <td>{{ new Date(item.addedAt).toLocaleDateString() }}</td>
                  <td>
                    <button
                      class="btn-icon-only btn-sm"
                      @click="removeStockFromWatchlist(item.symbol)"
                      title="从关注列表移除"
                    >
                      <span>🗑️</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
