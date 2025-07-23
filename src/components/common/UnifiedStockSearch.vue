<template>
  <div class="unified-stock-search">
    <BaseSearchInput
      ref="searchInputRef"
      v-bind="$attrs"
      :search-function="searchStocksWithFilters"
      :get-item-key="getItemKey"
      :get-item-label="getItemLabel"
      :get-item-description="getItemDescription"
      @select="handleSelect"
      @clear="handleClear"
      @focus="handleFocus"
      @blur="handleBlur"
      @search="handleSearch"
    >
      <!-- Stock Item Template -->
      <template #item="{ item, query, highlight }">
        <div v-if="item.type === 'stock'" class="stock-item">
          <div class="stock-primary">
            <span class="stock-code" v-html="highlight(item.data.symbol || item.data.tsCode, query)"></span>
            <span class="stock-name" v-html="highlight(item.data.name, query)"></span>
          </div>
          <div class="stock-secondary">
            <span class="stock-industry">{{ item.data.industry || '未知行业' }}</span>
            <span class="stock-market">{{ item.data.market || '未知市场' }}</span>
          </div>
        </div>
        
        <!-- Recent Search Item -->
        <div v-else-if="item.type === 'recent'" class="recent-item">
          <div class="recent-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div class="recent-text" v-html="highlight(item.text, query)"></div>
        </div>
        
        <!-- Industry Item -->
        <div v-else-if="item.type === 'industry'" class="category-item">
          <div class="category-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
          </div>
          <div class="category-text">
            <span class="category-label">行业：</span>
            <span class="category-value" v-html="highlight(item.text, query)"></span>
          </div>
        </div>
        
        <!-- Market Item -->
        <div v-else-if="item.type === 'market'" class="category-item">
          <div class="category-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </div>
          <div class="category-text">
            <span class="category-label">市场：</span>
            <span class="category-value" v-html="highlight(item.text, query)"></span>
          </div>
        </div>
        
        <!-- Popular Stock Item -->
        <div v-else-if="item.type === 'popular'" class="popular-item">
          <div class="popular-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <div class="popular-text" v-html="highlight(item.text, query)"></div>
        </div>
      </template>

      <!-- Empty Results Template -->
      <template #empty="{ query }">
        <div class="stock-empty">
          <div class="empty-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </div>
          <div class="empty-text">
            <div class="empty-title">未找到相关股票</div>
            <div class="empty-subtitle">请尝试其他关键词</div>
          </div>
        </div>
      </template>

      <!-- Search Hint Template -->
      <template #hint>
        <div class="stock-hint">
          <div class="hint-text">输入股票代码或名称进行搜索</div>
          <div class="hint-examples">
            <span class="hint-example">如：平安银行</span>
            <span class="hint-example">000001</span>
            <span class="hint-example">银行</span>
          </div>
        </div>
      </template>
    </BaseSearchInput>
    
    <!-- Advanced Search Button -->
    <button 
      v-if="showAdvancedButton" 
      class="advanced-search-button" 
      @click="toggleAdvancedSearch"
      :class="{ 'is-active': showAdvancedSearch }"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
      </svg>
      <span>高级筛选</span>
    </button>
    
    <!-- Advanced Search Panel -->
    <Transition name="slide">
      <div v-if="showAdvancedSearch" class="advanced-search-panel">
        <div class="panel-header">
          <h3>高级筛选</h3>
          <button class="close-button" @click="showAdvancedSearch = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="panel-content">
          <!-- Market Filter -->
          <div class="filter-group">
            <label class="filter-label">市场</label>
            <div class="filter-options">
              <label v-for="market in availableMarkets" :key="market" class="filter-option">
                <input 
                  type="checkbox" 
                  :value="market" 
                  v-model="filters.market"
                  @change="applyFilters"
                >
                <span>{{ market }}</span>
              </label>
            </div>
          </div>
          
          <!-- Industry Filter -->
          <div class="filter-group">
            <label class="filter-label">行业</label>
            <div class="filter-options scrollable">
              <label v-for="industry in availableIndustries" :key="industry" class="filter-option">
                <input 
                  type="checkbox" 
                  :value="industry" 
                  v-model="filters.industry"
                  @change="applyFilters"
                >
                <span>{{ industry }}</span>
              </label>
            </div>
          </div>
          
          <!-- Sort Options -->
          <div class="filter-group">
            <label class="filter-label">排序</label>
            <div class="sort-controls">
              <select v-model="filters.sortBy" @change="applyFilters">
                <option value="symbol">代码</option>
                <option value="name">名称</option>
                <option value="industry">行业</option>
                <option value="price">价格</option>
                <option value="change">涨跌幅</option>
                <option value="volume">成交量</option>
              </select>
              
              <button 
                class="sort-direction" 
                @click="toggleSortDirection"
                :class="{ 'is-desc': filters.sortDirection === 'desc' }"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20V4"></path>
                  <path d="M5 13l7 7 7-7"></path>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="filter-actions">
            <button class="reset-button" @click="resetFilters">重置筛选</button>
            <button class="apply-button" @click="applyFilters">应用筛选</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { stockSearchService, type SearchFilters, type SearchSuggestion } from '@/services/stockSearchService'
import BaseSearchInput from '@/components/base/BaseSearchInput.vue'
import type { Stock } from '@/types/stock'

// Props
interface Props {
  showAdvanced?: boolean
  initialFilters?: SearchFilters
}

const props = withDefaults(defineProps<Props>(), {
  showAdvanced: false,
  initialFilters: () => ({})
})

// Component reference
const searchInputRef = ref<InstanceType<typeof BaseSearchInput>>()

// Advanced search state
const showAdvancedButton = computed(() => props.showAdvanced)
const showAdvancedSearch = ref(false)
const availableMarkets = ref<string[]>([])
const availableIndustries = ref<string[]>([])
const filters = ref<SearchFilters>({
  market: [],
  industry: [],
  sortBy: 'symbol',
  sortDirection: 'asc',
  limit: 50
})

// Initialize component
onMounted(async () => {
  // Load available markets and industries
  if (props.showAdvanced) {
    try {
      availableMarkets.value = await stockSearchService.getAvailableMarkets()
      availableIndustries.value = await stockSearchService.getAvailableIndustries()
    } catch (error) {
      console.error('Failed to load filter options:', error)
    }
  }
  
  // Apply initial filters if provided
  if (props.initialFilters) {
    filters.value = { ...filters.value, ...props.initialFilters }
  }
})

// Events
const emit = defineEmits<{
  select: [stock: Stock]
  clear: []
  focus: []
  blur: []
  search: [query: string]
  filterChange: [filters: SearchFilters]
}>()

// Event handlers
const handleSelect = (item: SearchSuggestion) => {
  if (item.type === 'stock' && item.data) {
    emit('select', item.data)
  } else if (item.type === 'industry' && item.data) {
    // Set industry filter and apply
    filters.value.industry = [item.data.industry]
    applyFilters()
    // Clear search input
    searchInputRef.value?.clear()
  } else if (item.type === 'market' && item.data) {
    // Set market filter and apply
    filters.value.market = [item.data.market]
    applyFilters()
    // Clear search input
    searchInputRef.value?.clear()
  } else if (item.type === 'recent' || item.type === 'popular') {
    // Search for the text
    searchInputRef.value?.search(item.text)
  }
}

const handleClear = () => {
  emit('clear')
}

const handleFocus = () => {
  emit('focus')
}

const handleBlur = () => {
  emit('blur')
}

const handleSearch = (query: string) => {
  emit('search', query)
}

// Advanced search methods
const toggleAdvancedSearch = () => {
  showAdvancedSearch.value = !showAdvancedSearch.value
}

const toggleSortDirection = () => {
  filters.value.sortDirection = filters.value.sortDirection === 'asc' ? 'desc' : 'asc'
  applyFilters()
}

const resetFilters = () => {
  filters.value = {
    market: [],
    industry: [],
    sortBy: 'symbol',
    sortDirection: 'asc',
    limit: 50
  }
  applyFilters()
}

const applyFilters = () => {
  emit('filterChange', { ...filters.value })
}

// Search function with suggestions
const searchStocksWithFilters = async (query: string): Promise<SearchSuggestion[]> => {
  try {
    return await stockSearchService.getSearchSuggestions(query)
  } catch (error) {
    console.error('Stock search failed:', error)
    return []
  }
}

// Item rendering helpers
const getItemKey = (item: SearchSuggestion, index: number): string => {
  if (item.type === 'stock' && item.data) {
    return item.data.symbol || item.data.tsCode || `stock-${index}`
  }
  return `${item.type}-${index}`
}

const getItemLabel = (item: SearchSuggestion): string => {
  if (item.type === 'stock' && item.data) {
    return `${item.data.symbol || item.data.tsCode} ${item.data.name}`
  }
  return item.text
}

const getItemDescription = (item: SearchSuggestion): string => {
  if (item.type === 'stock' && item.data) {
    return `${item.data.industry || '未知行业'} · ${item.data.market || '未知市场'}`
  }
  return ''
}

// Expose methods for backward compatibility
defineExpose({
  focus: () => searchInputRef.value?.focus(),
  blur: () => searchInputRef.value?.blur(),
  clear: () => searchInputRef.value?.clear(),
  search: (query: string) => searchInputRef.value?.search(query),
  setValue: (stock: Stock | null) => {
    // For backward compatibility - this method is deprecated
    console.warn('setValue method is deprecated, use v-model or initialValue prop instead')
    if (!stock) {
      searchInputRef.value?.clear()
    }
  },
  // New methods
  toggleAdvancedSearch,
  applyFilters,
  resetFilters,
  getFilters: () => ({ ...filters.value })
})
</script>

<script lang="ts">
export default {
  name: 'UnifiedStockSearch',
  inheritAttrs: false,
}
</script>

<style scoped>
.unified-stock-search {
  position: relative;
  width: 100%;
}

/* Stock Item Styles */
.stock-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.stock-primary {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.stock-code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-primary);
  background: var(--bg-secondary);
  padding: 2px var(--spacing-xs);
  border-radius: var(--border-radius-sm);
  min-width: 80px;
  text-align: center;
}

.stock-name {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
}

.stock-secondary {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.stock-industry,
.stock-market {
  padding: 1px var(--spacing-xs);
  background: var(--bg-tertiary);
  border-radius: 3px;
  border: 1px solid var(--border-light);
}

/* Recent Search Item Styles */
.recent-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 2px 0;
}

.recent-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.recent-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

/* Category Item Styles */
.category-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 2px 0;
}

.category-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
}

.category-text {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.category-label {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.category-value {
  font-size: var(--font-size-sm);
  color: var(--primary-color);
  font-weight: 500;
}

/* Popular Item Styles */
.popular-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 2px 0;
}

.popular-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--warning-color);
}

.popular-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

/* Empty State Styles */
.stock-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-lg) var(--spacing-md);
  text-align: center;
}

.empty-icon {
  color: var(--text-muted);
  margin-bottom: var(--spacing-sm);
}

.empty-title {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.empty-subtitle {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

/* Hint Styles */
.stock-hint {
  padding: var(--spacing-md);
  text-align: center;
}

.hint-text {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
}

.hint-examples {
  display: flex;
  justify-content: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.hint-example {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 2px var(--spacing-xs);
  border-radius: 3px;
  border: 1px solid var(--border-light);
}

/* Advanced Search Button */
.advanced-search-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.advanced-search-button:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-dark);
}

.advanced-search-button.is-active {
  background: var(--primary-light);
  border-color: var(--primary-color);
  color: var(--primary-dark);
}

/* Advanced Search Panel */
.advanced-search-panel {
  position: absolute;
  top: calc(100% + var(--spacing-sm));
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
}

.panel-header h3 {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: var(--border-radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.close-button:hover {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.panel-content {
  padding: var(--spacing-md);
}

.filter-group {
  margin-bottom: var(--spacing-md);
}

.filter-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.filter-options.scrollable {
  max-height: 150px;
  overflow-y: auto;
  padding: var(--spacing-xs);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-sm);
}

.filter-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.filter-option:hover {
  background: var(--bg-tertiary);
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.sort-controls select {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
}

.sort-direction {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.sort-direction:hover {
  background: var(--bg-secondary);
}

.sort-direction.is-desc svg {
  transform: rotate(180deg);
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.reset-button {
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.reset-button:hover {
  background: var(--bg-secondary);
  border-color: var(--border-dark);
}

.apply-button {
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--primary-color);
  border-radius: var(--border-radius-sm);
  background: var(--primary-color);
  color: white;
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.apply-button:hover {
  background: var(--primary-dark);
}

/* Transition Animations */
.slide-enter-active,
.slide-leave-active {
  transition: all var(--transition-fast);
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 640px) {
  .stock-primary {
    gap: var(--spacing-xs);
  }

  .stock-code {
    min-width: 70px;
    font-size: var(--font-size-xs);
  }

  .stock-name {
    font-size: var(--font-size-xs);
  }

  .stock-secondary {
    gap: var(--spacing-xs);
    font-size: var(--font-size-xs);
  }
  
  .filter-options {
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  
  .filter-actions {
    flex-direction: column;
  }
  
  .reset-button,
  .apply-button {
    width: 100%;
  }
}
</style>