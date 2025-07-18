<template>
  <div
    class="stock-search-input"
    ref="searchContainer"
    :class="{
      'is-focused': isFocused,
      'has-results': showDropdown,
      'is-loading': isSearching,
      'is-disabled': disabled
    }"
  >
    <!-- 搜索输入框容器 -->
    <div class="search-input-wrapper">
      <div class="search-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      </div>

      <input
        ref="searchInput"
        v-model="searchQuery"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
        type="text"
        :placeholder="placeholder"
        class="search-input"
        autocomplete="off"
        :disabled="disabled"
        :aria-expanded="showDropdown"
        :aria-haspopup="true"
        :aria-owns="dropdownId"
        :aria-activedescendant="activeItemId"
        role="combobox"
        aria-autocomplete="list"
      />

      <!-- 清除按钮 -->
      <button
        v-if="searchQuery && !disabled"
        @click="clearSearch"
        class="clear-button"
        type="button"
        aria-label="清除搜索"
        tabindex="-1"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- 加载指示器 -->
      <div v-if="isSearching" class="loading-indicator">
        <div class="spinner"></div>
      </div>
    </div>

    <!-- 下拉选择列表 -->
    <Transition name="dropdown">
      <div
        v-if="showDropdown"
        :id="dropdownId"
        class="dropdown-menu"
        role="listbox"
        :aria-label="dropdownAriaLabel"
      >
        <!-- 搜索结果 -->
        <div v-if="searchResults.length > 0" class="dropdown-section">
          <div
            v-for="(stock, index) in searchResults"
            :key="stock.symbol || stock.tsCode"
            :id="`${dropdownId}-item-${index}`"
            class="dropdown-item"
            :class="{
              'is-active': index === activeIndex,
              'is-highlighted': index === highlightedIndex
            }"
            role="option"
            :aria-selected="index === activeIndex"
            @click="selectStock(stock)"
            @mouseenter="highlightedIndex = index"
            @mouseleave="highlightedIndex = -1"
          >
            <div class="stock-info">
              <div class="stock-primary">
                <span class="stock-code" v-html="highlightText(stock.symbol || stock.tsCode, searchQuery)"></span>
                <span class="stock-name" v-html="highlightText(stock.name, searchQuery)"></span>
              </div>
              <div class="stock-secondary">
                <span class="stock-industry">{{ stock.industry || '未知行业' }}</span>
                <span class="stock-market">{{ stock.market || '未知市场' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 无结果提示 -->
        <div v-else-if="searchQuery && !isSearching" class="dropdown-empty">
          <div class="empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </div>
          <div class="empty-text">
            <div class="empty-title">未找到相关股票</div>
            <div class="empty-subtitle">请尝试其他关键词</div>
          </div>
        </div>

        <!-- 搜索提示 -->
        <div v-else-if="!searchQuery && !isSearching" class="dropdown-hint">
          <div class="hint-text">输入股票代码或名称进行搜索</div>
          <div class="hint-examples">
            <span class="hint-example">如：平安银行</span>
            <span class="hint-example">000001</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { stockService } from '@/services/stockService'
import type { Stock } from '@/types/stock'

// 组件属性 - 添加 pageSize 以保持向后兼容
interface Props {
  placeholder?: string
  disabled?: boolean
  initialValue?: Stock | null
  maxResults?: number
  minSearchLength?: number
  debounceDelay?: number
  autoFocus?: boolean
  clearable?: boolean
  pageSize?: number // 为了向后兼容
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '搜索股票代码或名称',
  disabled: false,
  initialValue: null,
  maxResults: 10,
  minSearchLength: 1,
  debounceDelay: 300,
  autoFocus: false,
  clearable: true,
  pageSize: 20 // 为了向后兼容
})

// 组件事件
interface Emits {
  select: [stock: Stock]
  clear: []
  focus: []
  blur: []
  search: [query: string]
}

const emit = defineEmits<Emits>()

// 响应式状态
const searchContainer = ref<HTMLElement>()
const searchInput = ref<HTMLInputElement>()
const searchQuery = ref('')
const searchResults = ref<Stock[]>([])
const isSearching = ref(false)
const isFocused = ref(false)
const showDropdown = ref(false)
const activeIndex = ref(-1)
const highlightedIndex = ref(-1)
const searchTimeout = ref<number>()

// 计算属性
const dropdownId = computed(() => `stock-search-dropdown-${Math.random().toString(36).substr(2, 9)}`)
const activeItemId = computed(() =>
  activeIndex.value >= 0 ? `${dropdownId.value}-item-${activeIndex.value}` : undefined
)
const dropdownAriaLabel = computed(() =>
  searchResults.value.length > 0
    ? `找到 ${searchResults.value.length} 个股票结果`
    : '股票搜索结果'
)

// 生命周期
onMounted(() => {
  // 自动聚焦
  if (props.autoFocus) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  }

  // 设置初始值
  if (props.initialValue) {
    searchQuery.value = `${props.initialValue.symbol} ${props.initialValue.name}`
  }

  // 添加全局点击事件
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
})

// 监听搜索查询变化
watch(searchQuery, (newQuery) => {
  emit('search', newQuery)
})

// 事件处理方法
const onInput = () => {
  // 清除之前的定时器
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }

  const query = searchQuery.value.trim()

  // 如果查询为空，清空结果
  if (!query) {
    searchResults.value = []
    showDropdown.value = false
    activeIndex.value = -1
    highlightedIndex.value = -1
    return
  }

  // 如果查询长度小于最小搜索长度，不执行搜索
  if (query.length < props.minSearchLength) {
    return
  }

  // 设置防抖延迟
  searchTimeout.value = window.setTimeout(() => {
    performSearch(query)
  }, props.debounceDelay)
}

const onFocus = () => {
  isFocused.value = true
  emit('focus')

  // 如果有搜索内容，显示下拉框
  if (searchQuery.value.trim()) {
    showDropdown.value = true
  }
}

const onBlur = () => {
  // 延迟隐藏下拉框，以便点击选项时能正常工作
  setTimeout(() => {
    isFocused.value = false
    showDropdown.value = false
    activeIndex.value = -1
    highlightedIndex.value = -1
    emit('blur')
  }, 150)
}

const onKeydown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      navigateDown()
      break
    case 'ArrowUp':
      event.preventDefault()
      navigateUp()
      break
    case 'Enter':
      event.preventDefault()
      selectActiveItem()
      break
    case 'Escape':
      event.preventDefault()
      closeDropdown()
      break
    case 'Tab':
      closeDropdown()
      break
  }
}

// 搜索方法
const performSearch = async (query: string) => {
  if (!query.trim()) return

  isSearching.value = true
  showDropdown.value = true

  try {
    const results = await stockService.searchStocks(query)
    searchResults.value = results.slice(0, props.maxResults)
    activeIndex.value = -1
    highlightedIndex.value = -1
  } catch (error) {
    console.error('搜索股票失败:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

// 导航方法
const navigateDown = () => {
  if (searchResults.value.length === 0) return

  activeIndex.value = activeIndex.value < searchResults.value.length - 1
    ? activeIndex.value + 1
    : 0
  highlightedIndex.value = activeIndex.value

  // 滚动到可见区域
  scrollToActiveItem()
}

const navigateUp = () => {
  if (searchResults.value.length === 0) return

  activeIndex.value = activeIndex.value > 0
    ? activeIndex.value - 1
    : searchResults.value.length - 1
  highlightedIndex.value = activeIndex.value

  // 滚动到可见区域
  scrollToActiveItem()
}

const scrollToActiveItem = () => {
  nextTick(() => {
    const activeElement = document.getElementById(activeItemId.value || '')
    if (activeElement) {
      activeElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  })
}

// 选择方法
const selectActiveItem = () => {
  if (activeIndex.value >= 0 && searchResults.value[activeIndex.value]) {
    selectStock(searchResults.value[activeIndex.value])
  }
}

const selectStock = (stock: Stock) => {
  searchQuery.value = `${stock.symbol || stock.tsCode} ${stock.name}`
  closeDropdown()
  emit('select', stock)

  // 失去焦点
  searchInput.value?.blur()
}

// 清除和关闭方法
const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
  closeDropdown()
  emit('clear')

  // 重新聚焦
  nextTick(() => {
    searchInput.value?.focus()
  })
}

const closeDropdown = () => {
  showDropdown.value = false
  activeIndex.value = -1
  highlightedIndex.value = -1
}

// 外部点击处理
const handleClickOutside = (event: MouseEvent) => {
  if (!searchContainer.value?.contains(event.target as Node)) {
    closeDropdown()
  }
}

// 高亮文本方法
const highlightText = (text: string, query: string): string => {
  if (!text || !query) return text

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

// 暴露的方法
defineExpose({
  focus: () => searchInput.value?.focus(),
  blur: () => searchInput.value?.blur(),
  clear: clearSearch,
  search: performSearch
})
</script>

<style scoped>
.stock-search-input {
  position: relative;
  width: 100%;
}

/* 搜索输入框容器 */
.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  transition: all 0.2s ease;
  min-height: 44px;
}

.search-input-wrapper:hover {
  border-color: #c6d0dc;
}

.stock-search-input.is-focused .search-input-wrapper {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.stock-search-input.is-disabled .search-input-wrapper {
  background: #f8f9fa;
  border-color: #e9ecef;
  cursor: not-allowed;
}

/* 搜索图标 */
.search-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  color: #6b7280;
  pointer-events: none;
}

.stock-search-input.is-focused .search-icon {
  color: #3b82f6;
}

/* 搜索输入框 */
.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  padding: 12px 8px;
  font-size: 14px;
  line-height: 1.5;
  color: #1f2937;
  min-width: 0;
}

.search-input::placeholder {
  color: #9ca3af;
}

.search-input:disabled {
  cursor: not-allowed;
  color: #6b7280;
}

/* 清除按钮 */
.clear-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: 6px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.clear-button:active {
  background: #e5e7eb;
}

/* 加载指示器 */
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 下拉菜单 */
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  max-height: 320px;
  overflow-y: auto;
  margin-top: 4px;
}

/* 下拉菜单过渡动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 下拉项 */
.dropdown-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.15s ease;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover,
.dropdown-item.is-highlighted {
  background: #f8fafc;
}

.dropdown-item.is-active {
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
}

/* 股票信息 */
.stock-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stock-primary {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stock-code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  min-width: 80px;
  text-align: center;
}

.stock-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  flex: 1;
}

.stock-secondary {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #6b7280;
}

.stock-industry,
.stock-market {
  padding: 1px 6px;
  background: #f9fafb;
  border-radius: 3px;
  border: 1px solid #e5e7eb;
}

/* 高亮标记 */
:deep(mark) {
  background: #fef3c7;
  color: #92400e;
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: 600;
}

/* 空状态 */
.dropdown-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px;
  text-align: center;
}

.empty-icon {
  color: #d1d5db;
  margin-bottom: 12px;
}

.empty-title {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 4px;
}

.empty-subtitle {
  font-size: 12px;
  color: #9ca3af;
}

/* 搜索提示 */
.dropdown-hint {
  padding: 20px 16px;
  text-align: center;
}

.hint-text {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
}

.hint-examples {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.hint-example {
  font-size: 11px;
  color: #9ca3af;
  background: #f9fafb;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid #e5e7eb;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .search-input-wrapper {
    min-height: 40px;
  }

  .search-input {
    padding: 10px 6px;
    font-size: 16px; /* 防止iOS缩放 */
  }

  .dropdown-menu {
    max-height: 280px;
  }

  .dropdown-item {
    padding: 10px 12px;
  }

  .stock-primary {
    gap: 8px;
  }

  .stock-code {
    min-width: 70px;
    font-size: 12px;
  }

  .stock-name {
    font-size: 13px;
  }

  .stock-secondary {
    gap: 8px;
    font-size: 11px;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .search-input-wrapper {
    background: #1f2937;
    border-color: #374151;
  }

  .search-input-wrapper:hover {
    border-color: #4b5563;
  }

  .stock-search-input.is-focused .search-input-wrapper {
    border-color: #60a5fa;
    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
  }

  .search-input {
    color: #f9fafb;
  }

  .search-input::placeholder {
    color: #6b7280;
  }

  .dropdown-menu {
    background: #1f2937;
    border-color: #374151;
  }

  .dropdown-item:hover,
  .dropdown-item.is-highlighted {
    background: #374151;
  }

  .dropdown-item.is-active {
    background: #1e3a8a;
    border-left-color: #60a5fa;
  }

  .stock-code {
    background: #374151;
    color: #f9fafb;
  }

  .stock-name {
    color: #f9fafb;
  }

  .stock-secondary {
    color: #9ca3af;
  }

  .stock-industry,
  .stock-market {
    background: #374151;
    border-color: #4b5563;
    color: #d1d5db;
  }
}
</style>
