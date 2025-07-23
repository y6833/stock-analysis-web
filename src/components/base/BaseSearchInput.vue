<template>
  <div
    class="base-search-input"
    ref="searchContainer"
    :class="{
      'is-focused': isFocused,
      'has-results': showDropdown,
      'is-loading': isSearching,
      'is-disabled': disabled,
    }"
  >
    <!-- Search Input Container -->
    <div class="search-input-wrapper">
      <div class="search-icon">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
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

      <!-- Clear Button -->
      <button
        v-if="searchQuery && !disabled && clearable"
        @click="clearSearch"
        class="clear-button"
        type="button"
        aria-label="清除搜索"
        tabindex="-1"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- Loading Indicator -->
      <div v-if="isSearching" class="loading-indicator">
        <div class="spinner"></div>
      </div>
    </div>

    <!-- Dropdown Results -->
    <Transition name="dropdown">
      <div
        v-if="showDropdown"
        :id="dropdownId"
        class="dropdown-menu"
        role="listbox"
        :aria-label="dropdownAriaLabel"
      >
        <!-- Search Results -->
        <div v-if="searchResults.length > 0" class="dropdown-section">
          <div
            v-for="(item, index) in searchResults"
            :key="getItemKey(item, index)"
            :id="`${dropdownId}-item-${index}`"
            class="dropdown-item"
            :class="{
              'is-active': index === activeIndex,
              'is-highlighted': index === highlightedIndex,
            }"
            role="option"
            :aria-selected="index === activeIndex"
            @click="selectItem(item)"
            @mouseenter="highlightedIndex = index"
            @mouseleave="highlightedIndex = -1"
          >
            <slot name="item" :item="item" :query="searchQuery" :highlight="highlightText">
              <div class="default-item">
                <div class="item-primary">
                  <span v-html="highlightText(getItemLabel(item), searchQuery)"></span>
                </div>
                <div v-if="getItemDescription(item)" class="item-secondary">
                  <span>{{ getItemDescription(item) }}</span>
                </div>
              </div>
            </slot>
          </div>
        </div>

        <!-- No Results -->
        <div v-else-if="searchQuery && !isSearching" class="dropdown-empty">
          <slot name="empty" :query="searchQuery">
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
              <div class="empty-title">未找到相关结果</div>
              <div class="empty-subtitle">请尝试其他关键词</div>
            </div>
          </slot>
        </div>

        <!-- Search Hint -->
        <div v-else-if="!searchQuery && !isSearching" class="dropdown-hint">
          <slot name="hint">
            <div class="hint-text">输入关键词进行搜索</div>
          </slot>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts" generic="T">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  placeholder?: string
  disabled?: boolean
  initialValue?: T | null
  maxResults?: number
  minSearchLength?: number
  debounceDelay?: number
  autoFocus?: boolean
  clearable?: boolean
  searchFunction: (query: string) => Promise<T[]>
  getItemKey?: (item: T, index: number) => string | number
  getItemLabel?: (item: T) => string
  getItemDescription?: (item: T) => string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请输入搜索关键词',
  disabled: false,
  initialValue: null,
  maxResults: 10,
  minSearchLength: 1,
  debounceDelay: 300,
  autoFocus: false,
  clearable: true,
  getItemKey: (item: T, index: number) => index,
  getItemLabel: (item: T) => String(item),
  getItemDescription: () => '',
})

const emit = defineEmits<{
  select: [item: T]
  clear: []
  focus: []
  blur: []
  search: [query: string]
}>()

// Reactive state
const searchContainer = ref<HTMLElement>()
const searchInput = ref<HTMLInputElement>()
const searchQuery = ref('')
const searchResults = ref<T[]>([])
const isSearching = ref(false)
const isFocused = ref(false)
const showDropdown = ref(false)
const activeIndex = ref(-1)
const highlightedIndex = ref(-1)
const searchTimeout = ref<number>()

// Computed properties
const dropdownId = computed(() => `search-dropdown-${Math.random().toString(36).substr(2, 9)}`)
const activeItemId = computed(() =>
  activeIndex.value >= 0 ? `${dropdownId.value}-item-${activeIndex.value}` : undefined
)
const dropdownAriaLabel = computed(() =>
  searchResults.value.length > 0 ? `找到 ${searchResults.value.length} 个结果` : '搜索结果'
)

// Lifecycle
onMounted(() => {
  if (props.autoFocus) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  }

  if (props.initialValue) {
    searchQuery.value = props.getItemLabel(props.initialValue)
  }

  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
})

// Watch search query changes
watch(searchQuery, (newQuery) => {
  emit('search', newQuery)
})

// Event handlers
const onInput = () => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }

  const query = searchQuery.value.trim()

  if (!query) {
    searchResults.value = []
    showDropdown.value = false
    activeIndex.value = -1
    highlightedIndex.value = -1
    return
  }

  if (query.length < props.minSearchLength) {
    return
  }

  searchTimeout.value = window.setTimeout(() => {
    performSearch(query)
  }, props.debounceDelay)
}

const onFocus = () => {
  isFocused.value = true
  emit('focus')

  if (searchQuery.value.trim()) {
    showDropdown.value = true
  }
}

const onBlur = () => {
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

// Search methods
const performSearch = async (query: string) => {
  if (!query.trim()) return

  isSearching.value = true
  showDropdown.value = true

  try {
    const results = await props.searchFunction(query)
    searchResults.value = results.slice(0, props.maxResults)
    activeIndex.value = -1
    highlightedIndex.value = -1
  } catch (error) {
    console.error('Search failed:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

// Navigation methods
const navigateDown = () => {
  if (searchResults.value.length === 0) return

  activeIndex.value = activeIndex.value < searchResults.value.length - 1 ? activeIndex.value + 1 : 0
  highlightedIndex.value = activeIndex.value
  scrollToActiveItem()
}

const navigateUp = () => {
  if (searchResults.value.length === 0) return

  activeIndex.value = activeIndex.value > 0 ? activeIndex.value - 1 : searchResults.value.length - 1
  highlightedIndex.value = activeIndex.value
  scrollToActiveItem()
}

const scrollToActiveItem = () => {
  nextTick(() => {
    const activeElement = document.getElementById(activeItemId.value || '')
    if (activeElement) {
      activeElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  })
}

// Selection methods
const selectActiveItem = () => {
  if (activeIndex.value >= 0 && searchResults.value[activeIndex.value]) {
    selectItem(searchResults.value[activeIndex.value])
  }
}

const selectItem = (item: T) => {
  searchQuery.value = props.getItemLabel(item)
  closeDropdown()
  emit('select', item)
  searchInput.value?.blur()
}

// Clear and close methods
const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
  closeDropdown()
  emit('clear')

  nextTick(() => {
    searchInput.value?.focus()
  })
}

const closeDropdown = () => {
  showDropdown.value = false
  activeIndex.value = -1
  highlightedIndex.value = -1
}

// External click handler
const handleClickOutside = (event: MouseEvent) => {
  if (!searchContainer.value?.contains(event.target as Node)) {
    closeDropdown()
  }
}

// Highlight text method
const highlightText = (text: string, query: string): string => {
  if (!text || !query) return text

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

// Exposed methods
defineExpose({
  focus: () => searchInput.value?.focus(),
  blur: () => searchInput.value?.blur(),
  clear: clearSearch,
  search: performSearch,
})
</script>

<style scoped>
.base-search-input {
  position: relative;
  width: 100%;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius-md);
  transition: all var(--transition-fast);
  min-height: 44px;
}

.search-input-wrapper:hover {
  border-color: var(--border-dark);
}

.base-search-input.is-focused .search-input-wrapper {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

.base-search-input.is-disabled .search-input-wrapper {
  background: var(--bg-disabled);
  border-color: var(--border-light);
  cursor: not-allowed;
}

.search-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--spacing-sm);
  color: var(--text-muted);
  pointer-events: none;
}

.base-search-input.is-focused .search-icon {
  color: var(--primary-color);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  padding: var(--spacing-sm) var(--spacing-xs);
  font-size: var(--font-size-sm);
  line-height: 1.5;
  color: var(--text-primary);
  min-width: 0;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-input:disabled {
  cursor: not-allowed;
  color: var(--text-muted);
}

.clear-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: var(--spacing-xs);
  border: none;
  background: transparent;
  border-radius: var(--border-radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.clear-button:hover {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--spacing-sm);
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-light);
  border-top: 2px solid var(--primary-color);
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

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  max-height: 320px;
  overflow-y: auto;
  margin-top: var(--spacing-xs);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all var(--transition-fast);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-item {
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  border-bottom: 1px solid var(--border-light);
  transition: background-color var(--transition-fast);
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover,
.dropdown-item.is-highlighted {
  background: var(--bg-secondary);
}

.dropdown-item.is-active {
  background: var(--primary-light);
  border-left: 3px solid var(--primary-color);
}

.default-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.item-primary {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.item-secondary {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

:deep(mark) {
  background: var(--warning-light);
  color: var(--warning-dark);
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: 600;
}

.dropdown-empty {
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

.dropdown-hint {
  padding: var(--spacing-md);
  text-align: center;
}

.hint-text {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .search-input-wrapper {
    min-height: 40px;
  }

  .search-input {
    padding: var(--spacing-xs) var(--spacing-xs);
    font-size: 16px; /* Prevent iOS zoom */
  }

  .dropdown-menu {
    max-height: 280px;
  }

  .dropdown-item {
    padding: var(--spacing-xs) var(--spacing-sm);
  }
}
</style>
