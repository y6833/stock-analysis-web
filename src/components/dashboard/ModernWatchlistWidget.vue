<template>
  <div class="modern-watchlist-widget">
    <div class="widget-header">
      <h3 class="widget-title">
        <el-icon class="title-icon"><Star /></el-icon>
        关注列表
      </h3>
      <div class="header-actions">
        <el-dropdown @command="handleWatchlistCommand">
          <el-button size="small" :icon="Plus" circle />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="create">新建分组</el-dropdown-item>
              <el-dropdown-item command="manage">管理分组</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button
          size="small"
          :icon="Refresh"
          :loading="loading"
          @click="$emit('refresh')"
          circle
        />
      </div>
    </div>

    <div class="widget-content">
      <!-- Loading State -->
      <div v-if="loading && watchlists.length === 0" class="loading-state">
        <el-skeleton :rows="4" animated />
      </div>

      <!-- Empty State -->
      <div v-else-if="watchlists.length === 0" class="empty-state">
        <el-empty description="暂无关注列表">
          <el-button type="primary" @click="handleCreateWatchlist">
            创建第一个关注列表
          </el-button>
        </el-empty>
      </div>

      <!-- Watchlist Content -->
      <div v-else class="watchlist-content">
        <!-- 分组选择器 -->
        <div class="watchlist-selector" v-if="watchlists.length > 1">
          <el-select
            :model-value="activeWatchlistId"
            @update:model-value="$emit('watchlist-change', $event)"
            placeholder="选择关注分组"
            size="small"
            style="width: 100%"
          >
            <el-option
              v-for="watchlist in watchlists"
              :key="watchlist.id"
              :label="watchlist.name"
              :value="watchlist.id"
            >
              <span>{{ watchlist.name }}</span>
              <span class="option-count">({{ getWatchlistItemCount(watchlist) }})</span>
            </el-option>
          </el-select>
        </div>

        <!-- 股票列表 -->
        <div class="stocks-list" v-if="currentWatchlist">
          <div
            v-for="item in currentWatchlist.watchlist_items"
            :key="item.id"
            class="stock-item"
            @click="$emit('stock-click', { symbol: item.stockCode, name: item.stockName })"
          >
            <div class="stock-info">
              <div class="stock-name">{{ item.stockName }}</div>
              <div class="stock-code">{{ item.stockCode }}</div>
            </div>
            <div class="stock-actions">
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                @click.stop="handleRemoveStock(item)"
                circle
              />
            </div>
          </div>

          <!-- 空列表提示 -->
          <div v-if="currentWatchlist.watchlist_items?.length === 0" class="empty-stocks">
            <el-empty description="该分组暂无股票" size="small">
              <el-button size="small" @click="handleAddStock">
                添加股票
              </el-button>
            </el-empty>
          </div>
        </div>

        <!-- 添加股票按钮 -->
        <div class="add-stock-section" v-if="currentWatchlist && currentWatchlist.watchlist_items?.length > 0">
          <el-button
            type="primary"
            :icon="Plus"
            @click="handleAddStock"
            style="width: 100%"
            size="small"
          >
            添加股票
          </el-button>
        </div>
      </div>
    </div>

    <!-- 创建分组对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      title="创建关注分组"
      width="400px"
    >
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="分组名称" required>
          <el-input
            v-model="createForm.name"
            placeholder="请输入分组名称"
            maxlength="20"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="createForm.description"
            type="textarea"
            placeholder="请输入分组描述（可选）"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleCreateConfirm"
          :loading="creating"
        >
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- 添加股票对话框 -->
    <el-dialog
      v-model="showAddStockDialog"
      title="添加股票"
      width="500px"
    >
      <div class="add-stock-content">
        <el-input
          v-model="stockSearchQuery"
          placeholder="输入股票代码或名称搜索"
          :prefix-icon="Search"
          @input="handleStockSearch"
          clearable
        />
        
        <div class="search-results" v-if="searchResults.length > 0">
          <div
            v-for="stock in searchResults"
            :key="stock.symbol"
            class="search-result-item"
            @click="handleSelectStock(stock)"
          >
            <span class="result-name">{{ stock.name }}</span>
            <span class="result-code">{{ stock.symbol }}</span>
          </div>
        </div>
        
        <div v-if="stockSearchQuery && searchResults.length === 0" class="no-results">
          <el-empty description="未找到相关股票" size="small" />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Star, Plus, Refresh, Delete, Search } from '@element-plus/icons-vue'
import { watchlistService } from '@/services/watchlistService'
import { stockService } from '@/services/stockService'
import type { Watchlist, WatchlistItem } from '@/types/dashboard'

// Props
interface Props {
  watchlists: Watchlist[]
  activeWatchlistId: number | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
defineEmits<{
  'watchlist-change': [id: number]
  'stock-click': [stock: { symbol: string; name: string }]
  refresh: []
}>()

// 响应式数据
const showCreateDialog = ref(false)
const showAddStockDialog = ref(false)
const creating = ref(false)
const stockSearchQuery = ref('')
const searchResults = ref<any[]>([])

const createForm = ref({
  name: '',
  description: ''
})

// 计算属性
const currentWatchlist = computed(() => {
  if (!props.activeWatchlistId) return null
  return props.watchlists.find(w => w.id === props.activeWatchlistId) || null
})

// 方法
const getWatchlistItemCount = (watchlist: Watchlist) => {
  return watchlist.watchlist_items?.length || 0
}

const handleWatchlistCommand = (command: string) => {
  if (command === 'create') {
    handleCreateWatchlist()
  } else if (command === 'manage') {
    // TODO: 实现管理分组功能
    ElMessage.info('管理分组功能开发中...')
  }
}

const handleCreateWatchlist = () => {
  createForm.value = { name: '', description: '' }
  showCreateDialog.value = true
}

const handleCreateConfirm = async () => {
  if (!createForm.value.name.trim()) {
    ElMessage.warning('请输入分组名称')
    return
  }

  try {
    creating.value = true
    await watchlistService.createWatchlist(createForm.value)
    ElMessage.success('创建分组成功')
    showCreateDialog.value = false
    // 触发刷新
    // TODO: 这里应该通过emit通知父组件刷新
  } catch (error) {
    console.error('创建分组失败:', error)
    ElMessage.error('创建分组失败')
  } finally {
    creating.value = false
  }
}

const handleAddStock = () => {
  if (!currentWatchlist.value) {
    ElMessage.warning('请先选择一个关注分组')
    return
  }
  stockSearchQuery.value = ''
  searchResults.value = []
  showAddStockDialog.value = true
}

const handleStockSearch = async () => {
  if (!stockSearchQuery.value.trim()) {
    searchResults.value = []
    return
  }

  try {
    const results = await stockService.searchStocks(stockSearchQuery.value)
    searchResults.value = results.slice(0, 10) // 只显示前10个结果
  } catch (error) {
    console.error('搜索股票失败:', error)
    searchResults.value = []
  }
}

const handleSelectStock = async (stock: any) => {
  if (!currentWatchlist.value) return

  try {
    await watchlistService.addStockToWatchlist(currentWatchlist.value.id, {
      stockCode: stock.symbol,
      stockName: stock.name
    })
    ElMessage.success(`已将 ${stock.name} 添加到关注列表`)
    showAddStockDialog.value = false
    // 触发刷新
    // TODO: 这里应该通过emit通知父组件刷新
  } catch (error) {
    console.error('添加股票失败:', error)
    ElMessage.error('添加股票失败')
  }
}

const handleRemoveStock = async (item: WatchlistItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要从关注列表中移除 ${item.stockName} 吗？`,
      '确认移除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await watchlistService.removeStockFromWatchlist(item.watchlistId, item.id)
    ElMessage.success('移除成功')
    // 触发刷新
    // TODO: 这里应该通过emit通知父组件刷新
  } catch (error) {
    if (error !== 'cancel') {
      console.error('移除股票失败:', error)
      ElMessage.error('移除股票失败')
    }
  }
}
</script>

<style scoped>
.modern-watchlist-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.widget-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  color: var(--el-text-color-primary);
}

.title-icon {
  color: var(--color-warning);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.widget-content {
  flex: 1;
  padding: var(--spacing-lg);
  overflow-y: auto;
}

.loading-state,
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.watchlist-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.watchlist-selector {
  margin-bottom: var(--spacing-md);
}

.option-count {
  color: var(--el-text-color-regular);
  font-size: var(--font-size-sm);
}

.stocks-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.stock-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--el-border-color-light);
  cursor: pointer;
  transition: all 0.3s ease;
}

.stock-item:hover {
  background: var(--el-bg-color-page);
  border-color: var(--color-primary);
  transform: translateX(4px);
}

.stock-info {
  flex: 1;
}

.stock-name {
  font-weight: var(--font-weight-medium);
  color: var(--el-text-color-primary);
  margin-bottom: var(--spacing-xs);
}

.stock-code {
  font-size: var(--font-size-sm);
  color: var(--el-text-color-regular);
}

.stock-actions {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stock-item:hover .stock-actions {
  opacity: 1;
}

.empty-stocks {
  text-align: center;
  padding: var(--spacing-xl);
}

.add-stock-section {
  margin-top: var(--spacing-md);
}

/* 对话框样式 */
.add-stock-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.search-results {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--border-radius-md);
}

.search-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.search-result-item:hover {
  background: var(--el-bg-color-page);
}

.search-result-item:not(:last-child) {
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.result-name {
  font-weight: var(--font-weight-medium);
  color: var(--el-text-color-primary);
}

.result-code {
  font-size: var(--font-size-sm);
  color: var(--el-text-color-regular);
}

.no-results {
  padding: var(--spacing-lg);
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stock-item {
    padding: var(--spacing-sm);
  }

  .stock-actions {
    opacity: 1; /* 在移动端始终显示操作按钮 */
  }
}
</style>
