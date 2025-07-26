<template>
  <div class="search-overlay" v-if="isVisible" @click.self="close">
    <div class="search-container">
      <div class="search-header">
        <h2>搜索股票</h2>
        <button class="close-btn" @click="close">×</button>
      </div>
      <div class="search-input-container">
        <input type="text" v-model="searchQuery" placeholder="输入股票代码或名称..." class="search-input" @input="handleInput"
          @keydown.enter="handleSearch" ref="searchInputRef" />
        <button class="search-btn" @click="handleSearch">
          <span class="search-icon">🔍</span>
        </button>
      </div>
      <div class="search-results" v-if="results.length > 0">
        <div v-for="result in results" :key="result.symbol" class="search-result-item" @click="selectStock(result)">
          <div class="result-symbol">{{ result.symbol }}</div>
          <div class="result-name">{{ result.name }}</div>
        </div>
      </div>
      <div class="search-empty" v-else-if="searchQuery && !loading">
        没有找到匹配的股票
      </div>
      <div class="search-loading" v-if="loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">搜索中...</div>
      </div>
      <div class="search-history" v-if="!searchQuery && searchHistory.length > 0">
        <h3>最近搜索</h3>
        <div class="history-list">
          <div v-for="item in searchHistory" :key="item.symbol" class="history-item" @click="selectStock(item)">
            <div class="history-symbol">{{ item.symbol }}</div>
            <div class="history-name">{{ item.name }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  isVisible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const router = useRouter()
const searchQuery = ref('')
const results = ref<any[]>([])
const loading = ref(false)
const searchHistory = ref<any[]>([])
const searchInputRef = ref<HTMLInputElement | null>(null)

// 模拟搜索服务
const searchStocks = async (query: string): Promise<any[]> => {
  // 这里应该调用实际的搜索API
  // 现在只是模拟一个延迟和一些结果
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!query) {
        resolve([])
        return
      }

      const mockResults = [
      ]

      const filteredResults = mockResults.filter(
        (stock) =>
          stock.symbol.includes(query) ||
          stock.name.includes(query)
      )

      resolve(filteredResults.slice(0, 5))
    }, 300)
  })
}

// 处理输入
const handleInput = async () => {
  if (!searchQuery.value) {
    results.value = []
    return
  }

  loading.value = true
  results.value = await searchStocks(searchQuery.value)
  loading.value = false
}

// 处理搜索
const handleSearch = () => {
  if (results.value.length > 0) {
    selectStock(results.value[0])
  }
}

// 选择股票
const selectStock = (stock: any) => {
  // 添加到搜索历史
  const existingIndex = searchHistory.value.findIndex(item => item.symbol === stock.symbol)
  if (existingIndex !== -1) {
    searchHistory.value.splice(existingIndex, 1)
  }
  searchHistory.value.unshift(stock)
  if (searchHistory.value.length > 5) {
    searchHistory.value.pop()
  }

  // 保存到本地存储
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value))

  // 导航到股票详情页
  router.push(`/stock?symbol=${stock.symbol}`)
  close()
}

// 关闭搜索
const close = () => {
  emit('close')
  searchQuery.value = ''
  results.value = []
}

// 加载搜索历史
onMounted(() => {
  const savedHistory = localStorage.getItem('searchHistory')
  if (savedHistory) {
    try {
      searchHistory.value = JSON.parse(savedHistory)
    } catch (e) {
      console.error('Failed to parse search history:', e)
      searchHistory.value = []
    }
  }
})

// 当搜索框显示时，自动聚焦输入框
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
})
</script>

<style scoped>
.search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  z-index: 1000;
  padding-top: 100px;
}

.search-container {
  width: 100%;
  max-width: 600px;
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
}

.search-header h2 {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
}

.search-input-container {
  display: flex;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
}

.search-input {
  flex: 1;
  padding: var(--spacing-md);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-md);
  outline: none;
}

.search-input:focus {
  border-color: var(--primary-color);
}

.search-btn {
  margin-left: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
}

.search-icon {
  font-size: var(--font-size-md);
}

.search-results,
.search-history {
  max-height: 300px;
  overflow-y: auto;
}

.search-result-item,
.history-item {
  display: flex;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
}

.search-result-item:hover,
.history-item:hover {
  background-color: var(--bg-secondary);
}

.result-symbol,
.history-symbol {
  font-weight: bold;
  margin-right: var(--spacing-md);
  color: var(--primary-color);
}

.result-name,
.history-name {
  color: var(--text-primary);
}

.search-empty,
.search-loading {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--text-secondary);
}

.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: var(--spacing-sm);
}

.loading-text {
  display: inline-block;
  vertical-align: middle;
}

.search-history h3 {
  padding: var(--spacing-md);
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-md);
  border-bottom: 1px solid var(--border-light);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>