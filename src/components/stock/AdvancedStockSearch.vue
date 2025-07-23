<template>
  <div class="advanced-stock-search">
    <div class="search-header">
      <h2 class="search-title">高级股票搜索</h2>
      <p class="search-description">使用多种条件筛选股票，快速找到符合您需求的投资标的</p>
    </div>

    <div class="search-container">
      <!-- 搜索输入框 -->
      <div class="search-input-container">
        <UnifiedStockSearch
          ref="stockSearchRef"
          placeholder="输入股票代码、名称或行业关键词"
          :showAdvanced="true"
          :initialFilters="filters"
          @select="handleStockSelect"
          @filterChange="handleFilterChange"
        />
      </div>

      <!-- 筛选条件面板 -->
      <div class="filter-panel">
        <div class="panel-section">
          <h3 class="section-title">价格区间</h3>
          <div class="range-filter">
            <div class="range-inputs">
              <input
                type="number"
                v-model.number="priceRange.min"
                placeholder="最低价"
                @change="updatePriceRange"
              />
              <span class="range-separator">至</span>
              <input
                type="number"
                v-model.number="priceRange.max"
                placeholder="最高价"
                @change="updatePriceRange"
              />
            </div>
            <div class="range-slider">
              <input
                type="range"
                :min="priceStats.min"
                :max="priceStats.max"
                v-model.number="priceRange.min"
                @input="updatePriceRange"
              />
              <input
                type="range"
                :min="priceStats.min"
                :max="priceStats.max"
                v-model.number="priceRange.max"
                @input="updatePriceRange"
              />
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h3 class="section-title">成交量区间</h3>
          <div class="range-filter">
            <div class="range-inputs">
              <input
                type="number"
                v-model.number="volumeRange.min"
                placeholder="最低量"
                @change="updateVolumeRange"
              />
              <span class="range-separator">至</span>
              <input
                type="number"
                v-model.number="volumeRange.max"
                placeholder="最高量"
                @change="updateVolumeRange"
              />
            </div>
            <div class="range-slider">
              <input
                type="range"
                :min="volumeStats.min"
                :max="volumeStats.max"
                v-model.number="volumeRange.min"
                @input="updateVolumeRange"
              />
              <input
                type="range"
                :min="volumeStats.min"
                :max="volumeStats.max"
                v-model.number="volumeRange.max"
                @input="updateVolumeRange"
              />
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h3 class="section-title">结果限制</h3>
          <div class="limit-filter">
            <input
              type="number"
              v-model.number="filters.limit"
              min="1"
              max="200"
              @change="applyFilters"
            />
            <span class="limit-label">条结果</span>
          </div>
        </div>

        <div class="panel-actions">
          <button class="reset-button" @click="resetFilters">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
            重置筛选
          </button>
          <button class="search-button" @click="performSearch">
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
            搜索
          </button>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div class="search-results">
      <div class="results-header">
        <h3 class="results-title">
          搜索结果 <span v-if="searchResults.length">({{ searchResults.length }})</span>
        </h3>
        <div class="results-actions" v-if="searchResults.length">
          <button class="export-button" @click="exportResults">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            导出结果
          </button>
          <button class="view-mode-button" @click="toggleView">
            <svg
              v-if="viewMode === 'table'"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            <svg
              v-else
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            {{ viewMode === 'table' ? '切换到图表视图' : '切换到表格视图' }}
          </button>
        </div>
      </div>

      <div class="results-container">
        <!-- 表格视图 -->
        <table v-if="searchResults.length && viewMode === 'table'" class="results-table">
          <thead>
            <tr>
              <th @click="sortResults('symbol')">
                代码
                <span class="sort-icon" :class="getSortIconClass('symbol')"></span>
              </th>
              <th @click="sortResults('name')">
                名称
                <span class="sort-icon" :class="getSortIconClass('name')"></span>
              </th>
              <th @click="sortResults('price')">
                价格
                <span class="sort-icon" :class="getSortIconClass('price')"></span>
              </th>
              <th @click="sortResults('change')">
                涨跌幅
                <span class="sort-icon" :class="getSortIconClass('change')"></span>
              </th>
              <th @click="sortResults('volume')">
                成交量
                <span class="sort-icon" :class="getSortIconClass('volume')"></span>
              </th>
              <th @click="sortResults('industry')">
                行业
                <span class="sort-icon" :class="getSortIconClass('industry')"></span>
              </th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stock in visibleStocks" :key="stock.symbol || stock.tsCode">
              <td class="symbol-cell">{{ stock.symbol || stock.tsCode }}</td>
              <td>{{ stock.name }}</td>
              <td class="price-cell">{{ formatPrice(stock.price) }}</td>
              <td class="change-cell" :class="getChangeClass(stock.change)">
                {{ formatChange(stock.change) }}
              </td>
              <td class="volume-cell">{{ formatVolume(stock.volume) }}</td>
              <td>{{ stock.industry || '未知' }}</td>
              <td class="action-cell">
                <button class="view-button" @click="viewStock(stock)">查看</button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 图表视图 -->
        <div v-else-if="searchResults.length && viewMode === 'chart'" class="chart-view">
          <div class="chart-grid">
            <div
              v-for="stock in visibleStocks"
              :key="stock.symbol || stock.tsCode"
              class="chart-item"
              @click="viewStock(stock)"
            >
              <div class="chart-item-header">
                <div class="chart-item-title">
                  <span class="chart-item-symbol">{{ stock.symbol || stock.tsCode }}</span>
                  <span class="chart-item-name">{{ stock.name }}</span>
                </div>
                <div class="chart-item-price">
                  <div class="price-value">
                    {{ formatPrice(stock.price) }}
                  </div>
                  <div class="change-value" :class="getChangeClass(stock.change)">
                    {{ formatChange(stock.change) }}
                  </div>
                </div>
              </div>
              <div class="chart-item-content">
                <OptimizedStockChart
                  :stockData="stock.chartData || []"
                  :showHeader="false"
                  :showFooter="false"
                  :showControls="false"
                  height="150"
                />
              </div>
              <div class="chart-item-footer">
                <span>成交量: {{ formatVolume(stock.volume) }}</span>
                <span class="industry">{{ stock.industry || '未知' }}</span>
              </div>
            </div>
          </div>

          <!-- 分页控制 -->
          <div class="pagination-controls" v-if="searchResults.length > itemsPerPage">
            <button
              class="pagination-button"
              :disabled="currentPage === 1"
              @click="changePage(currentPage - 1)"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <span class="pagination-info">
              第 {{ currentPage }} 页，共 {{ Math.ceil(searchResults.length / itemsPerPage) }} 页
            </span>
            <button
              class="pagination-button"
              :disabled="currentPage >= Math.ceil(searchResults.length / itemsPerPage)"
              @click="changePage(currentPage + 1)"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <div v-else-if="isSearching" class="loading-state">
          <div class="spinner"></div>
          <p>正在搜索，请稍候...</p>
        </div>

        <div v-else-if="hasSearched && !searchResults.length" class="empty-state">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <p>未找到符合条件的股票</p>
          <p class="empty-subtitle">请尝试调整搜索条件</p>
        </div>

        <div v-else class="empty-state">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <p>输入关键词或使用筛选条件开始搜索</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import UnifiedStockSearch from '@/components/search/UnifiedStockSearch.vue'
import OptimizedStockChart from '@/components/charts/OptimizedStockChart.vue'
import { formatNumber } from '@/utils/formatters'
// 路由
const router = useRouter()

// 引用
const stockSearchRef = ref(null)
// 搜索状态
const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const hasSearched = ref(false)
// 视图模式
const viewMode = ref<'table' | 'chart'>('table')
const currentPage = ref(1)
const itemsPerPage = 10 // 每页显示的项目数

// 筛选条件
const filters = reactive({
  market: [],
  industry: [],
  sortBy: 'symbol',
  sortDirection: 'asc',
  limit: 50,
})

// 价格和成交量范围
const priceStats = reactive({
  min: 0,
  max: 1000,
})

const volumeStats = reactive({
  min: 0,
  max: 1000000,
})

const priceRange = reactive({
  min: 0,
  max: 1000,
})

const volumeRange = reactive({
  min: 0,
  max: 1000000,
})

// 计算属性
const totalPages = computed(() => {
  return Math.ceil(searchResults.value.length / itemsPerPage)
})

const visibleStocks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return searchResults.value.slice(start, end)
})

// 初始化
onMounted(async () => {
  try {
    // 获取价格和成交量统计数据
    // 这里应该从API获取

    priceStats.min = 0
    priceStats.max = 1000
    volumeStats.min = 0
    volumeStats.max = 1000000

    // 初始化范围
    priceRange.min = priceStats.min
    priceRange.max = priceStats.max

    volumeRange.min = volumeStats.min
    volumeRange.max = volumeStats.max
  } catch (error) {
    console.error('Failed to initialize search', error)
  }
})

// 处理函数
const handleStockSelect = (stock) => {
  viewStock(stock)
}

const handleFilterChange = (newFilters) => {
  Object.assign(filters, newFilters)
}

const updatePriceRange = () => {
  // 确保最小值不大于最大值
  if (priceRange.min > priceRange.max) {
    priceRange.min = priceRange.max
  }

  // 更新筛选条件
  filters.priceRange = [priceRange.min, priceRange.max]
}

const updateVolumeRange = () => {
  // 确保最小值不大于最大值
  if (volumeRange.min > volumeRange.max) {
    volumeRange.min = volumeRange.max
  }

  // 更新筛选条件
  filters.volumeRange = [volumeRange.min, volumeRange.max]
}

const resetFilters = () => {
  // 重置筛选条件
  filters.market = []
  filters.industry = []
  filters.sortBy = 'symbol'
  filters.sortDirection = 'asc'
  filters.limit = 50
  delete filters.priceRange
  delete filters.volumeRange

  // 重置范围
  priceRange.min = priceStats.min
  priceRange.max = priceStats.max
  volumeRange.min = volumeStats.min
  volumeRange.max = volumeStats.max

  // 清空搜索框
  stockSearchRef.value?.clear()

  // 清空结果
  searchResults.value = []
  hasSearched.value = false
}

const performSearch = async () => {
  try {
    isSearching.value = true
    hasSearched.value = true

    // 获取搜索查询
    const query = searchQuery.value

    // 调用API进行搜索
    // searchResults.value = await searchStocks(query, filters)

    // 重置分页
    currentPage.value = 1
  } catch (error) {
    console.error('Search failed:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

const sortResults = (field) => {
  // 切换排序方向
  if (filters.sortBy === field) {
    filters.sortDirection = filters.sortDirection === 'asc' ? 'desc' : 'asc'
  } else {
    filters.sortBy = field
    filters.sortDirection = 'asc'
  }

  // 重新应用筛选
  applyFilters()
}

const applyFilters = () => {
  // 如果已经搜索过，重新执行搜索
  if (hasSearched.value) {
    performSearch()
  }
}

const viewStock = (stock) => {
  // 导航到股票详情页
  router.push({
    name: 'StockDetail',
    params: { symbol: stock.symbol || stock.tsCode },
  })
}

const exportResults = () => {
  // 导出结果为CSV
  if (!searchResults.value.length) return

  try {
    // 准备CSV内容
    const headers = ['代码', '名称', '价格', '涨跌幅', '成交量', '行业']
    const rows = searchResults.value.map((stock) => [
      stock.symbol || stock.tsCode,
      stock.name,
      formatPrice(stock.price),
      formatChange(stock.change),
      formatVolume(stock.volume),
      stock.industry || '未知',
    ])

    // 合并为CSV字符串
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

    // 创建下载链接
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', '股票搜索结果.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Export failed:', error)
  }
}

const toggleView = () => {
  viewMode.value = viewMode.value === 'table' ? 'chart' : 'table'
  currentPage.value = 1
}

const changePage = (page) => {
  currentPage.value = page
}

// 格式化函数
const formatPrice = (price: any): string => {
  const numPrice = parseFloat(price)
  return isNaN(numPrice) ? '-' : numPrice.toFixed(2)
}

const formatChange = (change: any): string => {
  const numChange = parseFloat(change)
  return isNaN(numChange) ? '-' : numChange.toFixed(2) + '%'
}

const formatVolume = (volume: any): string => {
  const numVolume = parseInt(volume)
  if (isNaN(numVolume)) return '-'

  if (numVolume >= 100000000) {
    return (numVolume / 100000000).toFixed(2) + '亿'
  } else if (numVolume >= 10000) {
    return (numVolume / 10000).toFixed(2) + '万'
  } else {
    return numVolume.toString()
  }
}

// 计算属性
const getChangeClass = (change: any): string => {
  const numChange = parseFloat(change)
  if (isNaN(numChange)) return ''
  return numChange > 0 ? 'change-value-positive' : numChange < 0 ? 'change-value-negative' : ''
}

const getSortIconClass = (field: string): string => {
  if (filters.sortBy !== field) return ''
  return filters.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc'
}
</script>

<style scoped>
.advanced-stock-search {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-md);
}

.search-header {
  text-align: center;
  margin-bottom: var(--spacing-md);
}

.search-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.search-description {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
}

.search-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
}

.search-input-container {
  width: 100%;
}

.filter-panel {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-light);
}

.panel-section {
  flex: 1;
  min-width: 250px;
}

.section-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
}

.range-filter {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.range-inputs input {
  width: 100px;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
}

.range-separator {
  color: var(--text-secondary);
}

.range-slider {
  display: flex;
  position: relative;
  height: 30px;
}

.range-slider input[type='range'] {
  position: absolute;
  width: 100%;
  pointer-events: none;
  appearance: none;
  height: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
}

.range-slider input[type='range']::-webkit-slider-thumb {
  pointer-events: auto;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
}

.limit-filter {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.limit-filter input {
  width: 80px;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
}

.limit-label {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  width: 100%;
  margin-top: var(--spacing-sm);
}

.reset-button,
.search-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.reset-button {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.reset-button:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-dark);
}

.search-button {
  background: var(--primary-color);
  border: 1px solid var(--primary-color);
  color: white;
}

.search-button:hover {
  background: var(--primary-dark);
}

.search-results {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.results-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.results-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.export-button,
.view-mode-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.export-button:hover,
.view-mode-button:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-dark);
}

.results-container {
  width: 100%;
  overflow-x: auto;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
}

.results-table th,
.results-table td {
  padding: var(--spacing-sm);
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}

.results-table th {
  background: var(--bg-secondary);
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  position: relative;
}

.results-table tr:hover {
  background: var(--bg-tertiary);
}

.sort-icon {
  display: inline-block;
  width: 16px;
  height: 16px;
  vertical-align: middle;
  margin-left: var(--spacing-xs);
}

.sort-asc::after {
  content: '↑';
  color: var(--primary-color);
}

.sort-desc::after {
  content: '↓';
  color: var(--primary-color);
}

.symbol-cell {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-weight: 600;
}

.price-cell {
  text-align: right;
}

.change-cell {
  text-align: right;
}

.change-value-positive {
  color: var(--success-color);
}

.change-value-negative {
  color: var(--danger-color);
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: var(--spacing-md);
}

.chart-item {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-md);
}

.chart-item:hover {
  border-color: var(--primary-color);
}

.chart-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
}

.chart-item-title {
  display: flex;
  flex-direction: column;
}

.chart-item-symbol {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-weight: 600;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.chart-item-name {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.chart-item-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.price-value {
  font-weight: 600;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.change-value {
  font-size: var(--font-size-xs);
}

.change-value-positive {
  color: var(--success-color);
}

.change-value-negative {
  color: var(--danger-color);
}

.chart-item-content {
  height: 150px;
}

.chart-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-light);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.chart-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.pagination-button {
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

.pagination-button:hover:not(:disabled) {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl) 0;
  color: var(--text-secondary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-light);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-md);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl) 0;
  color: var(--text-secondary);
}

.empty-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: var(--spacing-xs);
}

@media (max-width: 768px) {
  .filter-panel {
    flex-direction: column;
    width: 100%;
  }

  .panel-section {
    width: 100%;
  }

  .panel-actions {
    flex-direction: column;
  }

  .reset-button,
  .search-button {
    width: 100%;
    justify-content: center;
  }

  .results-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .results-actions {
    width: 100%;
    justify-content: space-between;
  }

  .export-button,
  .view-mode-button {
    flex: 1;
  }
}
</style>
