<template>
  <div class="unified-watchlist-manager">
    <div class="watchlist-header">
      <h3>{{ title || '关注列表管理' }}</h3>
      <div class="header-actions">
        <BaseButton
          v-if="showCreateButton"
          type="primary"
          size="small"
          icon="+"
          @click="showCreateDialog = true"
        >
          新建分组
        </BaseButton>
        <BaseButton
          v-if="showCloseButton"
          type="text"
          size="small"
          icon="✖"
          @click="$emit('close')"
        />
      </div>
    </div>

    <!-- Watchlist Tabs -->
    <div v-if="watchlists.length > 0" class="watchlist-tabs">
      <div
        v-for="watchlist in watchlists"
        :key="watchlist.id"
        class="watchlist-tab"
        :class="{ active: activeWatchlistId === watchlist.id }"
        @click="selectWatchlist(watchlist.id)"
      >
        <span class="tab-name">{{ watchlist.name }}</span>
        <BaseButton
          v-if="watchlists.length > 1 && showDeleteButton"
          type="text"
          size="small"
          icon="✖"
          @click.stop="confirmDeleteWatchlist(watchlist)"
        />
      </div>
    </div>

    <!-- Active Watchlist Content -->
    <div v-if="activeWatchlist" class="watchlist-content">
      <!-- Search and Add Stock -->
      <div v-if="showAddStock" class="add-stock-section">
        <UnifiedStockSearch
          ref="stockSearchRef"
          placeholder="搜索股票添加到关注列表..."
          @select="addStockToWatchlist"
        />
      </div>

      <!-- Watchlist Items -->
      <div class="watchlist-items">
        <div v-if="activeWatchlist.items.length === 0" class="empty-watchlist">
          <div class="empty-icon">📋</div>
          <div class="empty-text">
            <div class="empty-title">关注列表为空</div>
            <div class="empty-subtitle">搜索并添加股票到关注列表</div>
          </div>
        </div>

        <div v-else class="items-table">
          <div class="table-header">
            <div class="header-cell symbol">代码</div>
            <div class="header-cell name">名称</div>
            <div v-if="showNotes" class="header-cell notes">备注</div>
            <div v-if="showActions" class="header-cell actions">操作</div>
          </div>

          <div v-for="item in activeWatchlist.items" :key="item.symbol" class="table-row">
            <div class="table-cell symbol">{{ item.symbol }}</div>
            <div class="table-cell name">{{ item.name }}</div>
            <div v-if="showNotes" class="table-cell notes">
              <input
                v-if="editingNotes === item.symbol"
                v-model="tempNotes"
                type="text"
                class="notes-input"
                @blur="saveNotes(item)"
                @keyup.enter="saveNotes(item)"
                @keyup.escape="cancelEditNotes"
              />
              <div v-else class="notes-display" @click="editNotes(item)">
                {{ item.notes || '点击添加备注' }}
              </div>
            </div>
            <div v-if="showActions" class="table-cell actions">
              <BaseButton type="text" size="small" @click="$emit('view-stock', item.symbol)">
                查看
              </BaseButton>
              <BaseButton type="text" size="small" @click="removeStockFromWatchlist(item.symbol)">
                删除
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Watchlist Dialog -->
    <div v-if="showCreateDialog" class="dialog-overlay" @click="showCreateDialog = false">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header">
          <h4>新建关注分组</h4>
          <BaseButton type="text" size="small" icon="✖" @click="showCreateDialog = false" />
        </div>
        <div class="dialog-body">
          <div class="form-field">
            <label>分组名称</label>
            <input
              v-model="newWatchlistName"
              type="text"
              placeholder="请输入分组名称"
              class="form-input"
              @keyup.enter="createWatchlist"
            />
          </div>
          <div class="form-field">
            <label>描述</label>
            <textarea
              v-model="newWatchlistDescription"
              placeholder="请输入分组描述（可选）"
              class="form-textarea"
            ></textarea>
          </div>
        </div>
        <div class="dialog-footer">
          <BaseButton type="secondary" @click="showCreateDialog = false"> 取消 </BaseButton>
          <BaseButton type="primary" :loading="isCreating" @click="createWatchlist">
            创建
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <div v-if="showDeleteDialog" class="dialog-overlay" @click="showDeleteDialog = false">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header">
          <h4>删除确认</h4>
          <BaseButton type="text" size="small" icon="✖" @click="showDeleteDialog = false" />
        </div>
        <div class="dialog-body">
          <p>确定要删除分组"{{ watchlistToDelete?.name }}"吗？此操作不可恢复。</p>
        </div>
        <div class="dialog-footer">
          <BaseButton type="secondary" @click="showDeleteDialog = false"> 取消 </BaseButton>
          <BaseButton type="danger" :loading="isDeleting" @click="deleteWatchlist">
            删除
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import UnifiedStockSearch from './UnifiedStockSearch.vue'
import type { Stock } from '@/types/stock'

interface WatchlistItem {
  symbol: string
  name: string
  notes?: string
  addedAt: string
}

interface Watchlist {
  id: string
  name: string
  description?: string
  items: WatchlistItem[]
}

interface Props {
  title?: string
  watchlists: Watchlist[]
  activeWatchlistId: string
  showCreateButton?: boolean
  showDeleteButton?: boolean
  showCloseButton?: boolean
  showAddStock?: boolean
  showNotes?: boolean
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showCreateButton: true,
  showDeleteButton: true,
  showCloseButton: false,
  showAddStock: true,
  showNotes: true,
  showActions: true,
})

const emit = defineEmits<{
  'update:watchlists': [watchlists: Watchlist[]]
  'update:activeWatchlistId': [id: string]
  close: []
  'view-stock': [symbol: string]
  'watchlist-created': [watchlist: Watchlist]
  'watchlist-deleted': [id: string]
  'stock-added': [watchlistId: string, stock: Stock]
  'stock-removed': [watchlistId: string, symbol: string]
  'notes-updated': [watchlistId: string, symbol: string, notes: string]
}>()

// Local state
const localWatchlists = ref<Watchlist[]>([])
const localActiveWatchlistId = ref('')

// Dialog states
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const newWatchlistName = ref('')
const newWatchlistDescription = ref('')
const watchlistToDelete = ref<Watchlist | null>(null)
const isCreating = ref(false)
const isDeleting = ref(false)

// Notes editing
const editingNotes = ref('')
const tempNotes = ref('')

// Component references
const stockSearchRef = ref<InstanceType<typeof UnifiedStockSearch>>()

// Computed
const activeWatchlist = computed(() => {
  return localWatchlists.value.find((w) => w.id === localActiveWatchlistId.value) || null
})

// Methods
const selectWatchlist = (id: string) => {
  localActiveWatchlistId.value = id
  emit('update:activeWatchlistId', id)
}

const createWatchlist = async () => {
  if (!newWatchlistName.value.trim()) return

  isCreating.value = true
  try {
    const newWatchlist: Watchlist = {
      id: Date.now().toString(),
      name: newWatchlistName.value.trim(),
      description: newWatchlistDescription.value.trim() || undefined,
      items: [],
    }

    localWatchlists.value.push(newWatchlist)
    localActiveWatchlistId.value = newWatchlist.id

    emit('update:watchlists', localWatchlists.value)
    emit('update:activeWatchlistId', newWatchlist.id)
    emit('watchlist-created', newWatchlist)

    // Reset form
    newWatchlistName.value = ''
    newWatchlistDescription.value = ''
    showCreateDialog.value = false
  } finally {
    isCreating.value = false
  }
}

const confirmDeleteWatchlist = (watchlist: Watchlist) => {
  watchlistToDelete.value = watchlist
  showDeleteDialog.value = true
}

const deleteWatchlist = async () => {
  if (!watchlistToDelete.value) return

  isDeleting.value = true
  try {
    const index = localWatchlists.value.findIndex((w) => w.id === watchlistToDelete.value!.id)
    if (index !== -1) {
      localWatchlists.value.splice(index, 1)

      // Select first watchlist if current was deleted
      if (localActiveWatchlistId.value === watchlistToDelete.value.id) {
        localActiveWatchlistId.value = localWatchlists.value[0]?.id || ''
        emit('update:activeWatchlistId', localActiveWatchlistId.value)
      }

      emit('update:watchlists', localWatchlists.value)
      emit('watchlist-deleted', watchlistToDelete.value.id)
    }

    showDeleteDialog.value = false
    watchlistToDelete.value = null
  } finally {
    isDeleting.value = false
  }
}

const addStockToWatchlist = (stock: Stock) => {
  if (!activeWatchlist.value) return

  // Check if stock already exists
  const exists = activeWatchlist.value.items.some((item) => item.symbol === stock.symbol)
  if (exists) return

  const newItem: WatchlistItem = {
    symbol: stock.symbol,
    name: stock.name,
    addedAt: new Date().toISOString(),
  }

  activeWatchlist.value.items.push(newItem)
  emit('update:watchlists', localWatchlists.value)
  emit('stock-added', activeWatchlist.value.id, stock)

  // Clear search
  stockSearchRef.value?.clear()
}

const removeStockFromWatchlist = (symbol: string) => {
  if (!activeWatchlist.value) return

  const index = activeWatchlist.value.items.findIndex((item) => item.symbol === symbol)
  if (index !== -1) {
    activeWatchlist.value.items.splice(index, 1)
    emit('update:watchlists', localWatchlists.value)
    emit('stock-removed', activeWatchlist.value.id, symbol)
  }
}

const editNotes = (item: WatchlistItem) => {
  editingNotes.value = item.symbol
  tempNotes.value = item.notes || ''
}

const saveNotes = (item: WatchlistItem) => {
  if (editingNotes.value !== item.symbol) return

  item.notes = tempNotes.value
  editingNotes.value = ''
  tempNotes.value = ''

  emit('update:watchlists', localWatchlists.value)
  emit('notes-updated', activeWatchlist.value!.id, item.symbol, item.notes)
}

const cancelEditNotes = () => {
  editingNotes.value = ''
  tempNotes.value = ''
}

// Initialize
onMounted(() => {
  localWatchlists.value = [...props.watchlists]
  localActiveWatchlistId.value = props.activeWatchlistId
})
</script>

<style scoped>
.unified-watchlist-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
}

.watchlist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.watchlist-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.watchlist-tabs {
  display: flex;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.watchlist-tab {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.watchlist-tab:hover {
  background: var(--bg-tertiary);
}

.watchlist-tab.active {
  background: var(--primary-light);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.tab-name {
  font-weight: 500;
}

.watchlist-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.add-stock-section {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.watchlist-items {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md) var(--spacing-lg);
}

.empty-watchlist {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-md);
  opacity: 0.5;
}

.empty-title {
  font-size: var(--font-size-md);
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
}

.empty-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.items-table {
  display: flex;
  flex-direction: column;
}

.table-header {
  display: grid;
  grid-template-columns: 100px 1fr 150px 120px;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) 0;
  border-bottom: 2px solid var(--border-color);
  font-weight: 600;
  color: var(--text-secondary);
}

.table-row {
  display: grid;
  grid-template-columns: 100px 1fr 150px 120px;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--border-light);
  align-items: center;
}

.table-row:hover {
  background: var(--bg-secondary);
}

.table-cell.symbol {
  font-family: monospace;
  font-weight: 600;
}

.table-cell.name {
  font-weight: 500;
}

.table-cell.actions {
  display: flex;
  gap: var(--spacing-xs);
}

.notes-input {
  width: 100%;
  padding: var(--spacing-xs);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
}

.notes-display {
  cursor: pointer;
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-sm);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.notes-display:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.dialog-header h4 {
  margin: 0;
  font-size: var(--font-size-md);
  color: var(--text-primary);
}

.dialog-body {
  padding: var(--spacing-lg);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-color);
}

.form-field {
  margin-bottom: var(--spacing-md);
}

.form-field label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-weight: 500;
  color: var(--text-primary);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  background: var(--bg-primary);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

@media (max-width: 768px) {
  .table-header,
  .table-row {
    grid-template-columns: 80px 1fr 100px;
  }

  .table-cell.notes {
    display: none;
  }
}
</style>
