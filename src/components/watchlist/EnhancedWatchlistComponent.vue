<template>
  <div class="enhanced-watchlist">
    <!-- 标题栏 -->
    <div class="watchlist-header">
      <div class="header-left">
        <h3 class="watchlist-title">{{ title || '关注列表' }}</h3>
        <div v-if="watchlists.length > 1" class="watchlist-selector">
          <el-select v-model="localActiveWatchlistId" size="small" @change="handleWatchlistChange">
            <el-option
              v-for="watchlist in watchlists"
              :key="watchlist.id"
              :label="watchlist.name"
              :value="watchlist.id"
            />
          </el-select>
        </div>
      </div>
      <div class="header-actions">
        <el-tooltip content="刷新数据" placement="top">
          <el-button
            type="primary"
            size="small"
            :icon="Refresh"
            circle
            :loading="isRefreshing"
            @click="refreshData"
          />
        </el-tooltip>
        <el-tooltip content="管理关注列表" placement="top">
          <el-button
            type="primary"
            size="small"
            :icon="Setting"
            circle
            @click="showWatchlistManager = true"
          />
        </el-tooltip>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="watchlist-toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchQuery"
          placeholder="搜索股票..."
          size="small"
          clearable
          :prefix-icon="Search"
        />
      </div>
      <div class="toolbar-right">
        <el-dropdown v-if="hasSelectedItems" @command="handleBatchCommand">
          <el-button type="primary" size="small">
            批量操作 <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="remove">删除选中</el-dropdown-item>
              <el-dropdown-item command="move" :disabled="watchlists.length <= 1">
                移动到...
              </el-dropdown-item>
              <el-dropdown-item command="tag">添加标签...</el-dropdown-item>
              <el-dropdown-item command="export">导出数据</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown @command="handleSortCommand">
          <el-button size="small">
            排序 <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="symbol">按代码</el-dropdown-item>
              <el-dropdown-item command="name">按名称</el-dropdown-item>
              <el-dropdown-item command="price">按价格</el-dropdown-item>
              <el-dropdown-item command="change">按涨跌额</el-dropdown-item>
              <el-dropdown-item command="changePercent">按涨跌幅</el-dropdown-item>
              <el-dropdown-item command="volume">按成交量</el-dropdown-item>
              <el-dropdown-item command="addedAt">按添加时间</el-dropdown-item>
              <el-dropdown-item divided command="direction">
                {{ sortDirection === 'asc' ? '升序 ↑' : '降序 ↓' }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown @command="handleColumnsCommand">
          <el-button size="small">
            列显示 <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="col in availableColumns"
                :key="col.value"
                :command="col.value"
              >
                <el-checkbox v-model="visibleColumns" :label="col.value">
                  {{ col.label }}
                </el-checkbox>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 股票列表 -->
    <div class="watchlist-content">
      <el-table
        v-if="activeWatchlist && filteredItems.length > 0"
        :data="filteredItems"
        style="width: 100%"
        size="small"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="45" />

        <el-table-column v-if="isColumnVisible('symbol')" label="代码" prop="symbol" width="90">
          <template #default="{ row }">
            <div class="symbol-cell">
              <span class="symbol-text">{{ row.symbol }}</span>
              <span v-if="row.tags && row.tags.length" class="symbol-tags">
                <el-tag v-for="tag in row.tags" :key="tag" size="small" effect="plain">
                  {{ tag }}
                </el-tag>
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column v-if="isColumnVisible('name')" label="名称" prop="name" min-width="120">
          <template #default="{ row }">
            <div class="name-cell">
              <span class="stock-name">{{ row.name }}</span>
              <el-tooltip v-if="row.notes" :content="row.notes" placement="top">
                <el-icon class="notes-icon"><document /></el-icon>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          v-if="isColumnVisible('price')"
          label="价格"
          prop="price"
          width="90"
          align="right"
        >
          <template #default="{ row }">
            <span>{{ formatPrice(row.price) }}</span>
          </template>
        </el-table-column>

        <el-table-column
          v-if="isColumnVisible('change')"
          label="涨跌额"
          prop="change"
          width="90"
          align="right"
        >
          <template #default="{ row }">
            <span :class="getPriceChangeClass(row.change)">
              {{ formatPriceChange(row.change) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column
          v-if="isColumnVisible('changePercent')"
          label="涨跌幅"
          prop="changePercent"
          width="90"
          align="right"
        >
          <template #default="{ row }">
            <span :class="getPriceChangeClass(row.changePercent)">
              {{ formatPercentage(row.changePercent) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column
          v-if="isColumnVisible('volume')"
          label="成交量"
          prop="volume"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            <span>{{ formatVolume(row.volume) }}</span>
          </template>
        </el-table-column>

        <el-table-column
          v-if="isColumnVisible('turnover')"
          label="成交额"
          prop="turnover"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            <span>{{ formatMoney(row.turnover) }}</span>
          </template>
        </el-table-column>

        <el-table-column
          v-if="isColumnVisible('addedAt')"
          label="添加时间"
          prop="addedAt"
          width="150"
        >
          <template #default="{ row }">
            <span>{{ formatDate(row.addedAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column v-if="isColumnVisible('actions')" label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <div class="actions-cell">
              <el-tooltip content="查看详情" placement="top">
                <el-button
                  type="primary"
                  size="small"
                  :icon="View"
                  circle
                  @click="viewStock(row.symbol)"
                />
              </el-tooltip>
              <el-tooltip content="从关注列表移除" placement="top">
                <el-button
                  type="danger"
                  size="small"
                  :icon="Delete"
                  circle
                  @click="removeStock(row.symbol)"
                />
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <div
        v-else-if="activeWatchlist && activeWatchlist.items.length === 0"
        class="empty-watchlist"
      >
        <el-empty description="关注列表为空">
          <el-button type="primary" @click="showAddStockDialog = true">添加股票</el-button>
        </el-empty>
      </div>

      <div v-else-if="activeWatchlist && filteredItems.length === 0" class="empty-watchlist">
        <el-empty description="没有找到匹配的股票">
          <el-button @click="searchQuery = ''">清除搜索</el-button>
        </el-empty>
      </div>

      <div v-else class="empty-watchlist">
        <el-empty description="加载中...">
          <el-button type="primary" @click="refreshData">刷新</el-button>
        </el-empty>
      </div>
    </div>

    <!-- 统计信息 -->
    <div v-if="activeWatchlist && activeWatchlist.items.length > 0" class="watchlist-footer">
      <div class="stats-info">
        <span>共 {{ activeWatchlist.items.length }} 只股票</span>
        <span class="stat-item">
          <span class="stat-label">涨:</span>
          <span class="stat-value positive">{{ stats.rising }}</span>
        </span>
        <span class="stat-item">
          <span class="stat-label">跌:</span>
          <span class="stat-value negative">{{ stats.falling }}</span>
        </span>
        <span class="stat-item">
          <span class="stat-label">平:</span>
          <span class="stat-value">{{ stats.unchanged }}</span>
        </span>
      </div>
      <div class="last-updated">更新于: {{ formatDateTime(lastUpdated) }}</div>
    </div>

    <!-- 关注列表管理器 -->
    <el-dialog v-model="showWatchlistManager" title="关注列表管理" width="80%" destroy-on-close>
      <watchlist-manager
        :watchlists="watchlists"
        :active-watchlist-id="localActiveWatchlistId"
        @update:watchlists="handleWatchlistsUpdate"
        @update:active-watchlist-id="handleActiveWatchlistUpdate"
      />
    </el-dialog>

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
          <el-button type="primary" :disabled="!selectedStock" @click="addStockToWatchlist">
            添加
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 移动股票对话框 -->
    <el-dialog
      v-model="showMoveDialog"
      title="移动股票到其他关注列表"
      width="400px"
      destroy-on-close
    >
      <div class="move-stocks-form">
        <p>选择目标关注列表:</p>
        <el-select v-model="targetWatchlistId" style="width: 100%">
          <el-option
            v-for="watchlist in otherWatchlists"
            :key="watchlist.id"
            :label="watchlist.name"
            :value="watchlist.id"
          />
        </el-select>
        <div class="selected-stocks-info">
          <p>将移动 {{ selectedItems.length }} 只股票</p>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showMoveDialog = false">取消</el-button>
          <el-button type="primary" :disabled="!targetWatchlistId" @click="moveSelectedStocks">
            移动
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加标签对话框 -->
    <el-dialog v-model="showTagDialog" title="添加标签" width="400px" destroy-on-close>
      <div class="add-tag-form">
        <p>为选中的 {{ selectedItems.length }} 只股票添加标签:</p>
        <el-select
          v-model="selectedTag"
          style="width: 100%"
          allow-create
          filterable
          placeholder="选择或创建标签"
        >
          <el-option v-for="tag in availableTags" :key="tag" :label="tag" :value="tag" />
        </el-select>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showTagDialog = false">取消</el-button>
          <el-button type="primary" :disabled="!selectedTag" @click="addTagToStocks">
            添加
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useEnhancedWatchlistStore } from '@/stores/stock/enhancedWatchlistStore'
import { useStockDataStore } from '@/stores/stock/stockDataStore'
import type { Watchlist, WatchlistItem } from '@/types/dashboard'
import type { Stock } from '@/types/stock'
import WatchlistManager from '@/components/common/UnifiedWatchlistManager.vue'
import UnifiedStockSearch from '@/components/common/UnifiedStockSearch.vue'
import {
  Refresh,
  Setting,
  Search,
  View,
  Delete,
  Document,
  ArrowDown,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 组件属性
const props = defineProps({
  title: {
    type: String,
    default: '关注列表',
  },
  defaultColumns: {
    type: Array as () => string[],
    default: () => ['symbol', 'name', 'price', 'change', 'changePercent', 'actions'],
  },
})

// 组件事件
const emit = defineEmits<{
  (e: 'view-stock', symbol: string): void
  (e: 'refresh', timestamp: number): void
}>()

// 状态管理
const watchlistStore = useEnhancedWatchlistStore()
const stockDataStore = useStockDataStore()

// 本地状态
const localActiveWatchlistId = ref('')
const searchQuery = ref('')
const isRefreshing = ref(false)
const lastUpdated = ref(Date.now())
const showWatchlistManager = ref(false)
const showAddStockDialog = ref(false)
const showMoveDialog = ref(false)
const showTagDialog = ref(false)
const selectedStock = ref<Stock | null>(null)
const stockNotes = ref('')
const targetWatchlistId = ref('')
const selectedTag = ref('')
const visibleColumns = ref<string[]>([...props.defaultColumns])
const sortBy = ref('addedAt')
const sortDirection = ref<'asc' | 'desc'>('desc')

// 组件引用
const stockSearchRef = ref<InstanceType<typeof UnifiedStockSearch>>()

// 计算属性
const watchlists = computed(() => watchlistStore.watchlists)
const activeWatchlist = computed(() => watchlistStore.activeWatchlist)
const selectedItems = computed(() => watchlistStore.selectedItems)
const hasSelectedItems = computed(() => selectedItems.value.length > 0)

const otherWatchlists = computed(() => {
  if (!activeWatchlist.value) return []
  return watchlists.value.filter((w) => w.id !== activeWatchlist.value?.id)
})

const filteredItems = computed(() => {
  if (!activeWatchlist.value) return []

  let items = [...activeWatchlist.value.items]

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(
      (item) => item.symbol.toLowerCase().includes(query) || item.name.toLowerCase().includes(query)
    )
  }

  return items
})

const stats = computed(() => {
  if (!activeWatchlist.value) {
    return { rising: 0, falling: 0, unchanged: 0 }
  }

  const items = activeWatchlist.value.items
  const rising = items.filter((item) => item.change > 0).length
  const falling = items.filter((item) => item.change < 0).length
  const unchanged = items.length - rising - falling

  return { rising, falling, unchanged }
})

const availableColumns = computed(() => [
  { label: '代码', value: 'symbol' },
  { label: '名称', value: 'name' },
  { label: '价格', value: 'price' },
  { label: '涨跌额', value: 'change' },
  { label: '涨跌幅', value: 'changePercent' },
  { label: '成交量', value: 'volume' },
  { label: '成交额', value: 'turnover' },
  { label: '添加时间', value: 'addedAt' },
  { label: '操作', value: 'actions' },
])

const availableTags = computed(() => {
  // 收集所有已有的标签
  const tagSet = new Set<string>()

  watchlists.value.forEach((watchlist) => {
    watchlist.items.forEach((item) => {
      if (item.tags) {
        item.tags.forEach((tag) => tagSet.add(tag))
      }
    })
  })

  return Array.from(tagSet)
})

// 方法
function isColumnVisible(column: string): boolean {
  return visibleColumns.value.includes(column)
}

function handleWatchlistChange(id: string) {
  watchlistStore.setActiveWatchlist(id)
}

function handleWatchlistsUpdate(updatedWatchlists: Watchlist[]) {
  // 这里可以处理关注列表更新
  console.log('关注列表已更新', updatedWatchlists)
}

function handleActiveWatchlistUpdate(id: string) {
  localActiveWatchlistId.value = id
  watchlistStore.setActiveWatchlist(id)
}

async function refreshData() {
  if (!activeWatchlist.value || isRefreshing.value) return

  isRefreshing.value = true

  try {
    await watchlistStore.refreshWatchlistData(activeWatchlist.value.id)
    lastUpdated.value = Date.now()
    emit('refresh', lastUpdated.value)
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('刷新数据失败')
  } finally {
    isRefreshing.value = false
  }
}

function handleSelectionChange(selection: WatchlistItem[]) {
  // 更新选中的股票
  const symbols = new Set(selection.map((item) => item.symbol))

  // 清除当前选中
  watchlistStore.toggleSelectAll(false)

  // 设置新选中
  symbols.forEach((symbol) => {
    watchlistStore.toggleStockSelection(symbol, true)
  })
}

function handleStockSelect(stock: Stock) {
  selectedStock.value = stock
  stockNotes.value = ''
}

async function addStockToWatchlist() {
  if (!selectedStock.value || !activeWatchlist.value) return

  try {
    await watchlistStore.addStockToWatchlist(
      activeWatchlist.value.id,
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
  } catch (error) {
    console.error('添加股票失败:', error)
    ElMessage.error('添加股票失败')
  }
}

async function removeStock(symbol: string) {
  if (!activeWatchlist.value) return

  try {
    await ElMessageBox.confirm('确定要从关注列表中移除该股票吗？', '确认移除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await watchlistStore.removeStockFromWatchlist(activeWatchlist.value.id, symbol)
    ElMessage.success('已从关注列表中移除')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('移除股票失败:', error)
      ElMessage.error('移除股票失败')
    }
  }
}

function viewStock(symbol: string) {
  emit('view-stock', symbol)
}

function handleBatchCommand(command: string) {
  switch (command) {
    case 'remove':
      confirmRemoveSelectedStocks()
      break
    case 'move':
      showMoveDialog.value = true
      break
    case 'tag':
      showTagDialog.value = true
      break
    case 'export':
      exportSelectedStocks()
      break
  }
}

function handleSortCommand(command: string) {
  if (command === 'direction') {
    // 切换排序方向
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // 设置排序字段
    sortBy.value = command
  }

  if (activeWatchlist.value) {
    watchlistStore.sortWatchlist(activeWatchlist.value.id, sortBy.value, sortDirection.value)
  }
}

function handleColumnsCommand() {
  // 列显示变化时保存设置
  if (activeWatchlist.value) {
    watchlistStore.setWatchlistColumns(activeWatchlist.value.id, visibleColumns.value)
  }
}

async function confirmRemoveSelectedStocks() {
  if (!activeWatchlist.value || selectedItems.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      `确定要从关注列表中移除选中的 ${selectedItems.value.length} 只股票吗？`,
      '确认移除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    await watchlistStore.removeSelectedStocks()
    ElMessage.success('已从关注列表中移除选中股票')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('移除股票失败:', error)
      ElMessage.error('移除股票失败')
    }
  }
}

async function moveSelectedStocks() {
  if (!activeWatchlist.value || selectedItems.value.length === 0 || !targetWatchlistId.value) return

  try {
    await watchlistStore.moveSelectedStocks(targetWatchlistId.value)
    ElMessage.success(`已将选中股票移动到其他关注列表`)
    showMoveDialog.value = false
    targetWatchlistId.value = ''
  } catch (error) {
    console.error('移动股票失败:', error)
    ElMessage.error('移动股票失败')
  }
}

async function addTagToStocks() {
  if (!activeWatchlist.value || selectedItems.value.length === 0 || !selectedTag.value) return

  try {
    await watchlistStore.addTagToSelectedStocks(selectedTag.value)
    ElMessage.success(`已为选中股票添加标签: ${selectedTag.value}`)
    showTagDialog.value = false
    selectedTag.value = ''
  } catch (error) {
    console.error('添加标签失败:', error)
    ElMessage.error('添加标签失败')
  }
}

function exportSelectedStocks() {
  if (!activeWatchlist.value || selectedItems.value.length === 0) return

  try {
    // 准备导出数据
    const exportData = selectedItems.value.map((item) => ({
      代码: item.symbol,
      名称: item.name,
      价格: item.price,
      涨跌额: item.change,
      涨跌幅: `${(item.changePercent * 100).toFixed(2)}%`,
      成交量: item.volume,
      成交额: item.turnover,
      添加时间: new Date(item.addedAt).toLocaleString(),
    }))

    // 转换为CSV
    const headers = Object.keys(exportData[0])
    const csvContent = [
      headers.join(','),
      ...exportData.map((row) =>
        headers.map((header) => JSON.stringify(row[header as keyof typeof row])).join(',')
      ),
    ].join('\n')

    // 创建下载链接
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `watchlist_export_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出数据失败:', error)
    ElMessage.error('导出数据失败')
  }
}

// 格式化函数
function formatPrice(price: number): string {
  return price.toFixed(2)
}

function formatPriceChange(change: number): string {
  return change > 0 ? `+${change.toFixed(2)}` : change.toFixed(2)
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function formatVolume(volume: number): string {
  if (volume >= 100000000) {
    return `${(volume / 100000000).toFixed(2)}亿`
  } else if (volume >= 10000) {
    return `${(volume / 10000).toFixed(2)}万`
  }
  return volume.toString()
}

function formatMoney(money: number): string {
  if (money >= 100000000) {
    return `${(money / 100000000).toFixed(2)}亿`
  } else if (money >= 10000) {
    return `${(money / 10000).toFixed(2)}万`
  }
  return money.toFixed(2)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

function getPriceChangeClass(value: number): string {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return ''
}

// 监听器
watch(
  () => watchlistStore.activeWatchlistId,
  (newId) => {
    localActiveWatchlistId.value = newId
  }
)

watch(
  () => watchlistStore.lastUpdated,
  (newTimestamp) => {
    lastUpdated.value = newTimestamp
  }
)

// 初始化
onMounted(async () => {
  await watchlistStore.loadWatchlists()
  localActiveWatchlistId.value = watchlistStore.activeWatchlistId

  // 如果有活动的关注列表，加载其设置
  if (activeWatchlist.value) {
    if (activeWatchlist.value.columns) {
      visibleColumns.value = [...activeWatchlist.value.columns]
    }

    if (activeWatchlist.value.sortBy) {
      sortBy.value = activeWatchlist.value.sortBy
      sortDirection.value = activeWatchlist.value.sortDirection || 'desc'
    }

    // 刷新数据
    refreshData()
  }
})
</script>

<style scoped>
.enhanced-watchlist {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.watchlist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.watchlist-title {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.watchlist-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.watchlist-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm);
}

.watchlist-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  font-size: var(--font-size-sm);
}

.stats-info {
  display: flex;
  gap: var(--spacing-md);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.stat-label {
  color: var(--text-secondary);
}

.stat-value {
  font-weight: 500;
}

.last-updated {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.empty-watchlist {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.symbol-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.symbol-text {
  font-family: monospace;
  font-weight: 600;
}

.symbol-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stock-name {
  font-weight: 500;
}

.notes-icon {
  color: var(--text-secondary);
  font-size: 14px;
}

.actions-cell {
  display: flex;
  gap: 8px;
}

.positive {
  color: var(--success-color);
}

.negative {
  color: var(--danger-color);
}

.add-stock-form,
.move-stocks-form,
.add-tag-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.selected-stock-info,
.selected-stocks-info {
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

@media (max-width: 768px) {
  .watchlist-toolbar {
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: stretch;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
  }

  .watchlist-footer {
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: flex-start;
  }
}
</style>
