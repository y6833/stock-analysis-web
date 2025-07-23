<template>
  <div class="quick-search-widget">
    <div class="search-container">
      <UnifiedStockSearch
        placeholder="搜索股票代码或名称..."
        @select="onStockSelect"
        @clear="onStockClear"
        @search="onSearch"
      />
    </div>

    <!-- 最近搜索 -->
    <div v-if="recentSearches.length > 0 && !isSearching" class="recent-searches">
      <div class="recent-title">最近搜索:</div>
      <div class="recent-list">
        <button
          v-for="recent in recentSearches"
          :key="recent.symbol"
          class="recent-item"
          @click="selectStock(recent)"
        >
          <span class="recent-symbol">{{ recent.symbol }}</span>
          <span class="recent-name">{{ recent.name }}</span>
        </button>
      </div>
    </div>

    <!-- 热门搜索 -->
    <div v-if="popularSearches.length > 0 && !isSearching" class="popular-searches">
      <div class="popular-title">热门搜索:</div>
      <div class="popular-list">
        <button
          v-for="popular in popularSearches"
          :key="popular.symbol"
          class="popular-item"
          @click="selectStock(popular)"
        >
          {{ popular.symbol }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import UnifiedStockSearch from '@/components/common/UnifiedStockSearch.vue'
import type { Stock } from '@/types/stock'

// Props
interface Props {
  placeholder?: string
  maxResults?: number
  showSuggestions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '搜索股票代码或名称...',
  maxResults: 10,
  showSuggestions: true,
})

// Emits
const emit = defineEmits<{
  'stock-selected': [stock: Stock]
  'add-to-watchlist': [stock: Stock]
  'search-performed': [query: string]
}>()

// 状态
const isSearching = ref(false)

// 搜索历史和建议
const recentSearches = ref<Stock[]>([])
const popularSearches = ref<Stock[]>([])

// 新搜索组件的事件处理
const onStockSelect = (stock: Stock) => {
  // 添加到最近搜索
  addToRecentSearches(stock)

  // 发出事件
  emit('stock-selected', stock)
}

const onStockClear = () => {
  // 搜索清除时的处理
  console.log('搜索已清除')
}

const onSearch = (query: string) => {
  isSearching.value = !!query.trim()
  emit('search-performed', query)
}

const selectStock = (stock: Stock) => {
  // 添加到最近搜索
  addToRecentSearches(stock)

  // 发出事件
  emit('stock-selected', stock)
}

// 最近搜索和热门搜索的管理方法

const addToRecentSearches = (stock: Stock) => {
  // 移除已存在的项
  recentSearches.value = recentSearches.value.filter((item) => item.symbol !== stock.symbol)

  // 添加到开头
  recentSearches.value.unshift(stock)

  // 限制数量
  recentSearches.value = recentSearches.value.slice(0, 5)

  // 保存到本地存储
  try {
    localStorage.setItem('recent-searches', JSON.stringify(recentSearches.value))
  } catch (error) {
    console.warn('无法保存搜索历史:', error)
  }
}

const loadRecentSearches = () => {
  try {
    const saved = localStorage.getItem('recent-searches')
    if (saved) {
      recentSearches.value = JSON.parse(saved)
    }
  } catch (error) {
    console.warn('无法加载搜索历史:', error)
  }
}

const loadPopularSearches = async () => {
  try {
    // 获取一些热门股票作为热门搜索
    const stocks = await stockService.getStocks()
    popularSearches.value = stocks.slice(0, 8)
  } catch (error) {
    console.warn('无法加载热门搜索:', error)
  }
}

// 生命周期
onMounted(() => {
  loadRecentSearches()
  loadPopularSearches()
})
</script>

<style scoped>
.quick-search-widget {
  position: relative;
  width: 100%;
  max-width: 400px;
}

.search-container {
  position: relative;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  padding-right: 80px;
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--font-size-md);
  transition: all var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

.search-button,
.clear-button {
  position: absolute;
  right: 4px;
  width: 32px;
  height: 32px;
  border: none;
  background: var(--accent-color);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.search-button:hover {
  background: var(--accent-dark);
}

.search-button:disabled {
  background: var(--text-muted);
  cursor: not-allowed;
}

.clear-button {
  right: 40px;
  background: var(--text-muted);
  font-size: var(--font-size-sm);
}

.clear-button:hover {
  background: var(--text-secondary);
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  margin-top: 4px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  max-height: 400px;
  overflow-y: auto;
}

.search-loading,
.search-error,
.no-results {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-light);
  border-top: 2px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.results-list {
  max-height: 300px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  border-bottom: 1px solid var(--border-light);
}

.result-item:hover,
.result-item.highlighted {
  background: var(--bg-secondary);
}

.result-item:last-child {
  border-bottom: none;
}

.stock-info {
  flex: 1;
  min-width: 0;
}

.stock-symbol {
  font-weight: 600;
  color: var(--accent-color);
  font-size: var(--font-size-md);
}

.stock-name {
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-market {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  margin-top: 2px;
}

.stock-actions {
  margin-left: var(--spacing-sm);
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--transition-fast);
}

.action-btn:hover {
  background: var(--bg-tertiary);
}

.search-suggestions {
  padding: var(--spacing-sm) var(--spacing-md);
  border-top: 1px solid var(--border-light);
}

.suggestions-title {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-bottom: var(--spacing-xs);
}

.suggestions-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.suggestion-item {
  padding: 4px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.suggestion-item:hover {
  background: var(--accent-light);
  color: var(--accent-color);
}

.recent-searches,
.popular-searches {
  margin-top: var(--spacing-md);
}

.recent-title,
.popular-title {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
  font-weight: 500;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.recent-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
}

.recent-item:hover {
  background: var(--bg-tertiary);
}

.recent-symbol {
  font-weight: 600;
  color: var(--accent-color);
  font-size: var(--font-size-sm);
}

.recent-name {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.popular-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.popular-item {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.popular-item:hover {
  background: var(--accent-light);
  color: var(--accent-color);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .quick-search-widget {
    max-width: 100%;
  }

  .search-input {
    font-size: var(--font-size-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    padding-right: 70px;
  }

  .search-button,
  .clear-button {
    width: 28px;
    height: 28px;
  }

  .clear-button {
    right: 32px;
  }
}
</style>
