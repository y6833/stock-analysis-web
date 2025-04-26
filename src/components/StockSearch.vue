<template>
  <div class="stock-search">
    <div class="search-input-container">
      <input
        ref="searchInput"
        v-model="searchQuery"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.down.prevent="onKeyDown"
        @keydown.up.prevent="onKeyUp"
        @keydown.enter.prevent="onKeyEnter"
        @keydown.esc.prevent="onKeyEsc"
        :placeholder="placeholder"
        class="form-control"
        :disabled="disabled"
      />
      <div class="dropdown-icon" @click="toggleDropdown">
        <span>▼</span>
      </div>
      <div v-if="showSearchResults" class="search-results">
        <div v-if="isSearching" class="searching">搜索中...</div>
        <div v-else-if="searchResults.length === 0 && searchQuery" class="no-results">
          未找到相关股票
        </div>
        <div v-else>
          <!-- 如果有搜索词，显示搜索结果 -->
          <div v-if="searchQuery">
            <div
              v-for="(stock, index) in searchResults"
              :key="stock.symbol"
              class="search-result-item"
              :class="{ active: index === activeIndex }"
              @click="selectStock(stock)"
              @mouseenter="activeIndex = index"
            >
              <span class="stock-symbol">{{ stock.symbol }}</span>
              <span class="stock-name">{{ stock.name }}</span>
              <span class="stock-market">{{ stock.market }}</span>
            </div>
          </div>
          <!-- 如果没有搜索词，显示所有股票，可能需要分类或分页 -->
          <div v-else>
            <div class="search-result-category" v-if="allStocks.length > 0">所有股票</div>
            <div
              v-for="(stock, index) in displayedStocks"
              :key="stock.symbol"
              class="search-result-item"
              :class="{ active: index === activeIndex }"
              @click="selectStock(stock)"
              @mouseenter="activeIndex = index"
            >
              <span class="stock-symbol">{{ stock.symbol }}</span>
              <span class="stock-name">{{ stock.name }}</span>
              <span class="stock-market">{{ stock.market }}</span>
            </div>
            <!-- 如果股票数量很多，添加分页控件 -->
            <div v-if="allStocks.length > pageSize" class="pagination">
              <button
                class="pagination-btn"
                :disabled="currentPage === 1"
                @click="changePage(currentPage - 1)"
              >
                上一页
              </button>
              <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
              <button
                class="pagination-btn"
                :disabled="currentPage === totalPages"
                @click="changePage(currentPage + 1)"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { stockService } from '@/services/stockService'

// 定义组件属性
const props = defineProps({
  placeholder: {
    type: String,
    default: '搜索股票代码或名称',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  initialValue: {
    type: Object,
    default: null,
  },
  pageSize: {
    type: Number,
    default: 20,
  },
})

// 定义组件事件
const emit = defineEmits(['select', 'clear'])

// 搜索相关状态
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const allStocks = ref<any[]>([])
const isSearching = ref(false)
const showSearchResults = ref(false)
const activeIndex = ref(-1)
const searchInput = ref<HTMLInputElement | null>(null)
const searchTimeout = ref<number | null>(null)

// 分页相关
const currentPage = ref(1)
const totalPages = computed(() => Math.ceil(allStocks.value.length / props.pageSize))
const displayedStocks = computed(() => {
  const start = (currentPage.value - 1) * props.pageSize
  const end = start + props.pageSize
  return allStocks.value.slice(start, end)
})

// 初始化
onMounted(async () => {
  // 如果有初始值，设置搜索框的值
  if (props.initialValue) {
    searchQuery.value = `${props.initialValue.symbol} ${props.initialValue.name}`
  }

  // 添加点击外部关闭下拉框的事件
  document.addEventListener('click', handleClickOutside)

  // 加载所有股票
  try {
    allStocks.value = await stockService.getStocks()
  } catch (err) {
    console.error('获取股票列表失败:', err)
  }
})

// 清理
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
})

// 处理点击外部关闭下拉框
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.stock-search')) {
    showSearchResults.value = false
  }
}

// 切换下拉框显示状态
const toggleDropdown = () => {
  if (showSearchResults.value) {
    showSearchResults.value = false
  } else {
    showSearchResults.value = true
    // 如果没有搜索词，显示所有股票
    if (!searchQuery.value && allStocks.value.length === 0) {
      loadAllStocks()
    }
  }
}

// 加载所有股票
const loadAllStocks = async () => {
  if (allStocks.value.length > 0) return

  isSearching.value = true

  try {
    allStocks.value = await stockService.getStocks()
  } catch (err) {
    console.error('获取股票列表失败:', err)
  } finally {
    isSearching.value = false
  }
}

// 搜索股票（带防抖）
const onInput = () => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }

  if (!searchQuery.value) {
    searchResults.value = []
    // 不关闭下拉框，而是显示所有股票
    if (showSearchResults.value) {
      currentPage.value = 1
    }
    emit('clear')
    return
  }

  searchTimeout.value = window.setTimeout(() => {
    searchStocks()
  }, 300) // 300ms 防抖
}

// 执行搜索
const searchStocks = async () => {
  if (!searchQuery.value) {
    searchResults.value = []
    showSearchResults.value = false
    return
  }

  isSearching.value = true
  showSearchResults.value = true
  activeIndex.value = -1

  try {
    searchResults.value = await stockService.searchStocks(searchQuery.value)
  } catch (err) {
    console.error('搜索股票失败:', err)
  } finally {
    isSearching.value = false
  }
}

// 选择股票
const selectStock = (stock: any) => {
  searchQuery.value = `${stock.symbol} ${stock.name}`
  showSearchResults.value = false
  emit('select', stock)
}

// 处理焦点事件
const onFocus = () => {
  showSearchResults.value = true
  if (searchQuery.value) {
    if (searchResults.value.length === 0) {
      searchStocks()
    }
  } else {
    // 如果没有搜索词，显示所有股票
    if (allStocks.value.length === 0) {
      loadAllStocks()
    }
  }
}

// 处理失焦事件
const onBlur = () => {
  // 延迟关闭，以便点击选项时能够触发选择
  setTimeout(() => {
    showSearchResults.value = false
  }, 200)
}

// 键盘导航 - 向下
const onKeyDown = () => {
  const items = searchQuery.value ? searchResults.value : displayedStocks.value
  if (items.length > 0) {
    activeIndex.value = Math.min(activeIndex.value + 1, items.length - 1)
    scrollActiveItemIntoView()
  }
}

// 键盘导航 - 向上
const onKeyUp = () => {
  const items = searchQuery.value ? searchResults.value : displayedStocks.value
  if (items.length > 0) {
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
    scrollActiveItemIntoView()
  }
}

// 键盘导航 - 回车选择
const onKeyEnter = () => {
  const items = searchQuery.value ? searchResults.value : displayedStocks.value
  if (activeIndex.value >= 0 && activeIndex.value < items.length) {
    selectStock(items[activeIndex.value])
  }
}

// 键盘导航 - ESC 关闭
const onKeyEsc = () => {
  showSearchResults.value = false
}

// 滚动活动项到可视区域
const scrollActiveItemIntoView = () => {
  nextTick(() => {
    const activeItem = document.querySelector('.search-result-item.active')
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest' })
    }
  })
}

// 切换页面
const changePage = (page: number) => {
  currentPage.value = page
  activeIndex.value = -1
}

// 暴露方法给父组件
defineExpose({
  focus: () => {
    searchInput.value?.focus()
  },
  clear: () => {
    searchQuery.value = ''
    searchResults.value = []
    showSearchResults.value = false
    emit('clear')
  },
  setValue: (stock: any) => {
    if (stock) {
      searchQuery.value = `${stock.symbol} ${stock.name}`
      emit('select', stock)
    } else {
      searchQuery.value = ''
      emit('clear')
    }
  },
})
</script>

<style scoped>
.stock-search {
  position: relative;
  width: 100%;
}

.search-input-container {
  position: relative;
  width: 100%;
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-control:focus {
  border-color: #42b983;
  outline: none;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.2);
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  max-height: 300px;
  overflow-y: auto;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 0 0 4px 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.searching,
.no-results {
  padding: 12px;
  text-align: center;
  color: #666;
  font-size: 14px;
}

.search-result-item {
  display: flex;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover,
.search-result-item.active {
  background-color: #f5f5f5;
}

.stock-symbol {
  font-weight: 500;
  margin-right: 10px;
  color: #333;
  min-width: 80px;
}

.stock-name {
  flex: 1;
  color: #333;
}

.stock-market {
  color: #999;
  font-size: 12px;
  margin-left: 10px;
}

.dropdown-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  cursor: pointer;
  padding: 5px;
}

.dropdown-icon:hover {
  color: #666;
}

.search-result-category {
  padding: 8px 12px;
  font-weight: 500;
  color: #666;
  background-color: #f5f5f5;
  border-bottom: 1px solid #eee;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-top: 1px solid #eee;
  background-color: #f9f9f9;
}

.pagination-btn {
  padding: 5px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  font-size: 12px;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #f0f0f0;
}

.page-info {
  font-size: 12px;
  color: #666;
}
</style>
