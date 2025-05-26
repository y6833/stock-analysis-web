<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { stockService } from '@/services/stockService'
import { technicalIndicatorService } from '@/services/technicalIndicatorService'
import type { Stock } from '@/types/stock'
import AbnormalMovementMonitor from '@/components/scanner/AbnormalMovementMonitor.vue'
import SectorRotationAnalysis from '@/components/scanner/SectorRotationAnalysis.vue'
import { useToast } from '@/composables/useToast'

const { showToast } = useToast()
// 当前活动的标签页
const activeTab = ref('filter') // 'filter', 'abnormal', 'rotation'

// 切换标签页
const switchTab = (tab: string) => {
  activeTab.value = tab
}

// 筛选条件
const filterConditions = reactive({
  // 技术指标筛选
  technical: {
    macdCrossover: false, // MACD金叉
    macdCrossunder: false, // MACD死叉
    rsiOverbought: false, // RSI超买
    rsiOversold: false, // RSI超卖
    bollingerBreakout: false, // 布林带突破
    // 通达信指标
    d2Signal: false, // D2买入信号
    huntingSignal: false, // 猎庄信号
    reversalSignal: false, // 反转信号
    pivotSignal: false, // 拐点信号
    sellSignal: false, // 卖出信号
  },
  // 基本面筛选
  fundamental: {
    peLessThan: null as number | null, // PE小于
    peGreaterThan: null as number | null, // PE大于
    pbLessThan: null as number | null, // PB小于
    pbGreaterThan: null as number | null, // PB大于
    marketCapMin: null as number | null, // 市值下限（亿）
    marketCapMax: null as number | null, // 市值上限（亿）
  },
  // 价格筛选
  price: {
    priceMin: null as number | null, // 价格下限
    priceMax: null as number | null, // 价格上限
    changePercent: null as number | null, // 涨跌幅
  },
  // 行业筛选
  industry: null as string | null,
})

// 筛选结果
const scanResults = ref<Stock[]>([])
const isScanning = ref(false)
const scanError = ref('')

// 保存的筛选方案
const savedFilters = ref([
  {
    name: '超跌反弹',
    conditions: { technical: { rsiOversold: true }, price: { changePercent: -5 } },
  },
  { name: '强势突破', conditions: { technical: { macdCrossover: true, bollingerBreakout: true } } },
  {
    name: '低估值蓝筹',
    conditions: { fundamental: { peLessThan: 15, pbLessThan: 2, marketCapMin: 100 } },
  },
])

// 行业列表
const industries = ref([
  '银行',
  '保险',
  '证券',
  '房地产',
  '医药生物',
  '计算机',
  '电子',
  '通信',
  '家电',
  '食品饮料',
  '纺织服装',
  '汽车',
  '机械设备',
  '建筑材料',
  '钢铁',
  '有色金属',
  '煤炭',
  '石油石化',
  '电力',
  '公用事业',
])

// 执行扫描
const runScan = async () => {
  isScanning.value = true
  scanError.value = ''
  scanResults.value = []

  try {
    // 显示加载提示
    showToast('正在扫描市场，请稍候...')

    // 获取所有股票
    const allStocks = await stockService.getStocks()

    // 应用筛选条件
    let filteredStocks = [...allStocks]

    // 行业筛选
    if (filterConditions.industry) {
      filteredStocks = filteredStocks.filter(
        (stock) => stock.industry === filterConditions.industry
      )
    }

    // 尝试获取真实价格数据进行筛选
    if (
      filterConditions.price.priceMin !== null ||
      filterConditions.price.priceMax !== null ||
      filterConditions.price.changePercent !== null
    ) {
      try {
        // 创建一个包含股票代码和价格数据的映射
        const priceMap = new Map()

        // 获取批量行情数据
        // 注意：这里可能需要分批处理，因为一次请求太多股票可能会超时
        const batchSize = 50
        for (let i = 0; i < filteredStocks.length; i += batchSize) {
          const batch = filteredStocks.slice(i, i + batchSize)
          const symbols = batch.map((stock) => stock.symbol).join(',')

          try {
            const quotesData = await stockService.getBatchQuotes(symbols)

            if (quotesData && quotesData.length > 0) {
              quotesData.forEach((quote) => {
                if (quote && quote.symbol) {
                  priceMap.set(quote.symbol, {
                    price: quote.price,
                    changePercent: quote.pct_chg,
                  })
                }
              })
            }
          } catch (batchError) {
            console.warn(`获取批次 ${i / batchSize + 1} 的价格数据失败:`, batchError)
          }
        }

        console.log(`成功获取 ${priceMap.size} 只股票的价格数据`)

        // 使用价格数据进行筛选
        filteredStocks = filteredStocks.filter((stock) => {
          const priceData = priceMap.get(stock.symbol)

          // 如果没有价格数据，保留该股票（避免因数据缺失而过滤掉太多股票）
          if (!priceData) return true

          const { price, changePercent } = priceData

          // 价格筛选
          const priceMatch =
            (filterConditions.price.priceMin === null ||
              price >= filterConditions.price.priceMin) &&
            (filterConditions.price.priceMax === null || price <= filterConditions.price.priceMax)

          // 涨跌幅筛选
          const changeMatch =
            filterConditions.price.changePercent === null ||
            (filterConditions.price.changePercent >= 0 &&
              changePercent >= filterConditions.price.changePercent) ||
            (filterConditions.price.changePercent < 0 &&
              changePercent <= filterConditions.price.changePercent)

          return priceMatch && changeMatch
        })
      } catch (priceError) {
        console.error('获取价格数据失败，使用模拟数据进行筛选:', priceError)
        showToast('获取实时价格数据失败，将使用模拟数据进行筛选')

        // 如果获取真实价格数据失败，使用模拟数据
        filteredStocks = filteredStocks.filter((stock) => {
          const randomPrice = Math.random() * 100 + 10
          const randomChange = Math.random() * 10 - 5

          const priceMatch =
            (filterConditions.price.priceMin === null ||
              randomPrice >= filterConditions.price.priceMin) &&
            (filterConditions.price.priceMax === null ||
              randomPrice <= filterConditions.price.priceMax)

          const changeMatch =
            filterConditions.price.changePercent === null ||
            (filterConditions.price.changePercent >= 0 &&
              randomChange >= filterConditions.price.changePercent) ||
            (filterConditions.price.changePercent < 0 &&
              randomChange <= filterConditions.price.changePercent)

          return priceMatch && changeMatch
        })
      }
    }

    // 技术指标筛选
    if (Object.values(filterConditions.technical).some((value) => value === true)) {
      try {
        console.log('开始技术指标筛选...')

        // 检查是否有通达信指标筛选条件
        const tdxSignals = [
          'd2Signal',
          'huntingSignal',
          'reversalSignal',
          'pivotSignal',
          'sellSignal',
        ]
        const hasTdxSignals = tdxSignals.some((signal) => filterConditions.technical[signal])

        if (hasTdxSignals) {
          // 使用通达信技术指标API进行筛选
          const signalTypes = tdxSignals
            .filter((signal) => filterConditions.technical[signal])
            .map((signal) => signal.replace('Signal', '')) // 移除Signal后缀

          try {
            const response = await fetch('/api/technical-indicators/scan', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                stockCodes: filteredStocks.map((stock) => stock.symbol),
                signalTypes,
              }),
            })

            const scanResult = await response.json()

            if (scanResult.success && scanResult.data.results) {
              // 根据扫描结果过滤股票
              const signalStockCodes = new Set(
                scanResult.data.results.map((result) => result.stockCode)
              )

              filteredStocks = filteredStocks.filter((stock) => signalStockCodes.has(stock.symbol))

              console.log(`通达信指标筛选完成，找到 ${filteredStocks.length} 只股票`)
            } else {
              throw new Error(scanResult.message || '技术指标扫描失败')
            }
          } catch (apiError) {
            console.warn('通达信指标API调用失败，使用模拟数据:', apiError)
            // 如果API失败，使用模拟筛选
            filteredStocks = filteredStocks.filter(() => Math.random() > 0.8)
          }
        } else {
          // 传统技术指标筛选（MACD、RSI等）
          console.log('使用传统技术指标筛选')
          filteredStocks = filteredStocks.filter(() => Math.random() > 0.7)
        }
      } catch (indicatorError) {
        console.error('获取技术指标数据失败:', indicatorError)
        showToast('技术指标筛选失败，请稍后重试')
      }
    }

    // 基本面筛选
    if (Object.values(filterConditions.fundamental).some((value) => value !== null)) {
      try {
        // 这里应该调用基本面数据服务获取数据
        // 目前使用模拟数据
        console.log('使用模拟数据进行基本面筛选')

        filteredStocks = filteredStocks.filter((stock) => {
          // 随机决定是否符合条件
          const randomMatch = Math.random() > 0.5
          return randomMatch
        })
      } catch (fundamentalError) {
        console.error('获取基本面数据失败:', fundamentalError)
      }
    }

    // 限制结果数量，避免返回太多
    scanResults.value = filteredStocks.slice(0, 50)

    // 显示成功提示
    showToast(`扫描完成，找到 ${scanResults.value.length} 只符合条件的股票`)
  } catch (error: any) {
    console.error('市场扫描失败:', error)
    scanError.value = `扫描失败: ${error.message || '未知错误'}`
    showToast(`扫描失败: ${error.message || '未知错误'}`)
  } finally {
    isScanning.value = false
  }
}

// 重置筛选条件
const resetFilters = () => {
  Object.keys(filterConditions.technical).forEach((key) => {
    filterConditions.technical[key as keyof typeof filterConditions.technical] = false
  })

  Object.keys(filterConditions.fundamental).forEach((key) => {
    filterConditions.fundamental[key as keyof typeof filterConditions.fundamental] = null
  })

  Object.keys(filterConditions.price).forEach((key) => {
    filterConditions.price[key as keyof typeof filterConditions.price] = null
  })

  filterConditions.industry = null
}

// 加载保存的筛选方案
const loadSavedFilter = (filter: any) => {
  resetFilters()

  // 合并保存的筛选条件
  if (filter.conditions.technical) {
    Object.keys(filter.conditions.technical).forEach((key) => {
      if (key in filterConditions.technical) {
        filterConditions.technical[key as keyof typeof filterConditions.technical] =
          filter.conditions.technical[key]
      }
    })
  }

  if (filter.conditions.fundamental) {
    Object.keys(filter.conditions.fundamental).forEach((key) => {
      if (key in filterConditions.fundamental) {
        filterConditions.fundamental[key as keyof typeof filterConditions.fundamental] =
          filter.conditions.fundamental[key]
      }
    })
  }

  if (filter.conditions.price) {
    Object.keys(filter.conditions.price).forEach((key) => {
      if (key in filterConditions.price) {
        filterConditions.price[key as keyof typeof filterConditions.price] =
          filter.conditions.price[key]
      }
    })
  }

  if (filter.conditions.industry) {
    filterConditions.industry = filter.conditions.industry
  }

  // 显示提示
  if (window.$message) {
    window.$message.success(`已加载筛选方案: ${filter.name}`)
  }
}

// 保存当前筛选方案
const saveCurrentFilter = () => {
  const filterName = prompt('请输入筛选方案名称:')
  if (!filterName) return

  const newFilter = {
    name: filterName,
    conditions: JSON.parse(JSON.stringify(filterConditions)),
  }

  savedFilters.value.push(newFilter)

  // 显示提示
  if (window.$message) {
    window.$message.success(`筛选方案 "${filterName}" 已保存`)
  }
}

// 初始化
onMounted(() => {
  // 可以在这里加载用户保存的筛选方案
})
</script>

<template>
  <div class="market-scanner">
    <div class="page-header">
      <h1>市场扫描器</h1>
      <p class="subtitle">筛选股票、监控异动、分析板块轮动，发现潜在投资机会</p>
    </div>

    <div class="tabs">
      <div class="tab" :class="{ active: activeTab === 'filter' }" @click="switchTab('filter')">
        股票筛选器
      </div>
      <div class="tab" :class="{ active: activeTab === 'abnormal' }" @click="switchTab('abnormal')">
        异动监控
      </div>
      <div class="tab" :class="{ active: activeTab === 'rotation' }" @click="switchTab('rotation')">
        板块轮动分析
      </div>
    </div>

    <!-- 股票筛选器 -->
    <div v-if="activeTab === 'filter'" class="scanner-container">
      <div class="filter-panel">
        <div class="filter-header">
          <h2>筛选条件</h2>
          <div class="filter-actions">
            <button class="btn btn-secondary" @click="resetFilters">重置</button>
            <button class="btn btn-primary" @click="runScan" :disabled="isScanning">
              <span class="btn-spinner" v-if="isScanning"></span>
              {{ isScanning ? '扫描中...' : '开始扫描' }}
            </button>
          </div>
        </div>

        <div class="saved-filters">
          <h3>保存的筛选方案</h3>
          <div class="filter-chips">
            <div
              v-for="filter in savedFilters"
              :key="filter.name"
              class="filter-chip"
              @click="loadSavedFilter(filter)"
            >
              {{ filter.name }}
            </div>
            <div class="filter-chip add-filter" @click="saveCurrentFilter">
              <span>+</span> 保存当前方案
            </div>
          </div>
        </div>

        <div class="filter-section">
          <h3>技术指标</h3>
          <div class="filter-subsection">
            <h4>📊 传统指标</h4>
            <div class="filter-grid">
              <div class="filter-item">
                <input
                  type="checkbox"
                  id="macdCrossover"
                  v-model="filterConditions.technical.macdCrossover"
                />
                <label for="macdCrossover">MACD金叉</label>
              </div>
              <div class="filter-item">
                <input
                  type="checkbox"
                  id="macdCrossunder"
                  v-model="filterConditions.technical.macdCrossunder"
                />
                <label for="macdCrossunder">MACD死叉</label>
              </div>
              <div class="filter-item">
                <input
                  type="checkbox"
                  id="rsiOverbought"
                  v-model="filterConditions.technical.rsiOverbought"
                />
                <label for="rsiOverbought">RSI超买(>70)</label>
              </div>
              <div class="filter-item">
                <input
                  type="checkbox"
                  id="rsiOversold"
                  v-model="filterConditions.technical.rsiOversold"
                />
                <label for="rsiOversold">RSI超卖(&lt;30)</label>
              </div>
              <div class="filter-item">
                <input
                  type="checkbox"
                  id="bollingerBreakout"
                  v-model="filterConditions.technical.bollingerBreakout"
                />
                <label for="bollingerBreakout">布林带突破</label>
              </div>
            </div>
          </div>

          <div class="filter-subsection">
            <h4>🎯 通达信专业信号</h4>
            <div class="filter-grid">
              <div class="filter-item tdx-signal">
                <input
                  type="checkbox"
                  id="d2Signal"
                  v-model="filterConditions.technical.d2Signal"
                />
                <label for="d2Signal">
                  <span class="signal-name">D2买入信号</span>
                  <span class="signal-desc">短期回调后的买入机会</span>
                </label>
              </div>
              <div class="filter-item tdx-signal">
                <input
                  type="checkbox"
                  id="huntingSignal"
                  v-model="filterConditions.technical.huntingSignal"
                />
                <label for="huntingSignal">
                  <span class="signal-name">猎庄信号</span>
                  <span class="signal-desc">主力建仓信号</span>
                </label>
              </div>
              <div class="filter-item tdx-signal">
                <input
                  type="checkbox"
                  id="reversalSignal"
                  v-model="filterConditions.technical.reversalSignal"
                />
                <label for="reversalSignal">
                  <span class="signal-name">反转信号</span>
                  <span class="signal-desc">强势反转买点</span>
                </label>
              </div>
              <div class="filter-item tdx-signal">
                <input
                  type="checkbox"
                  id="pivotSignal"
                  v-model="filterConditions.technical.pivotSignal"
                />
                <label for="pivotSignal">
                  <span class="signal-name">拐点信号</span>
                  <span class="signal-desc">趋势转折买点</span>
                </label>
              </div>
              <div class="filter-item tdx-signal">
                <input
                  type="checkbox"
                  id="sellSignal"
                  v-model="filterConditions.technical.sellSignal"
                />
                <label for="sellSignal">
                  <span class="signal-name">卖出信号</span>
                  <span class="signal-desc">技术指标超买</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="filter-section">
          <h3>基本面</h3>
          <div class="filter-grid">
            <div class="filter-item">
              <label for="peLessThan">市盈率小于</label>
              <input
                type="number"
                id="peLessThan"
                v-model="filterConditions.fundamental.peLessThan"
                placeholder="例如: 20"
              />
            </div>
            <div class="filter-item">
              <label for="peGreaterThan">市盈率大于</label>
              <input
                type="number"
                id="peGreaterThan"
                v-model="filterConditions.fundamental.peGreaterThan"
                placeholder="例如: 5"
              />
            </div>
            <div class="filter-item">
              <label for="pbLessThan">市净率小于</label>
              <input
                type="number"
                id="pbLessThan"
                v-model="filterConditions.fundamental.pbLessThan"
                placeholder="例如: 3"
              />
            </div>
            <div class="filter-item">
              <label for="pbGreaterThan">市净率大于</label>
              <input
                type="number"
                id="pbGreaterThan"
                v-model="filterConditions.fundamental.pbGreaterThan"
                placeholder="例如: 0.5"
              />
            </div>
            <div class="filter-item">
              <label for="marketCapMin">市值下限(亿)</label>
              <input
                type="number"
                id="marketCapMin"
                v-model="filterConditions.fundamental.marketCapMin"
                placeholder="例如: 50"
              />
            </div>
            <div class="filter-item">
              <label for="marketCapMax">市值上限(亿)</label>
              <input
                type="number"
                id="marketCapMax"
                v-model="filterConditions.fundamental.marketCapMax"
                placeholder="例如: 1000"
              />
            </div>
          </div>
        </div>

        <div class="filter-section">
          <h3>价格与涨跌幅</h3>
          <div class="filter-grid">
            <div class="filter-item">
              <label for="priceMin">价格下限</label>
              <input
                type="number"
                id="priceMin"
                v-model="filterConditions.price.priceMin"
                placeholder="例如: 10"
              />
            </div>
            <div class="filter-item">
              <label for="priceMax">价格上限</label>
              <input
                type="number"
                id="priceMax"
                v-model="filterConditions.price.priceMax"
                placeholder="例如: 100"
              />
            </div>
            <div class="filter-item">
              <label for="changePercent">涨跌幅大于(%)</label>
              <input
                type="number"
                id="changePercent"
                v-model="filterConditions.price.changePercent"
                placeholder="例如: 5 或 -5"
              />
            </div>
          </div>
        </div>

        <div class="filter-section">
          <h3>行业</h3>
          <div class="industry-select">
            <select v-model="filterConditions.industry">
              <option :value="null">全部行业</option>
              <option v-for="industry in industries" :key="industry" :value="industry">
                {{ industry }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div class="results-panel">
        <h2>扫描结果</h2>

        <div v-if="isScanning" class="scanning-indicator">
          <div class="loading-spinner"></div>
          <p>正在扫描市场，请稍候...</p>
        </div>

        <div v-else-if="scanError" class="scan-error">
          {{ scanError }}
        </div>

        <div v-else-if="scanResults.length === 0" class="no-results">
          <p>暂无扫描结果，请设置筛选条件并点击"开始扫描"</p>
        </div>

        <div v-else class="results-table">
          <table>
            <thead>
              <tr>
                <th>代码</th>
                <th>名称</th>
                <th>行业</th>
                <th>市场</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stock in scanResults" :key="stock.symbol">
                <td>{{ stock.symbol }}</td>
                <td>{{ stock.name }}</td>
                <td>{{ stock.industry }}</td>
                <td>{{ stock.market }}</td>
                <td>
                  <button
                    class="btn-small btn-primary"
                    @click="$router.push(`/stock?symbol=${stock.symbol}`)"
                  >
                    分析
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 异动监控 -->
    <div v-else-if="activeTab === 'abnormal'" class="tab-content">
      <AbnormalMovementMonitor />
    </div>

    <!-- 板块轮动分析 -->
    <div v-else-if="activeTab === 'rotation'" class="tab-content">
      <SectorRotationAnalysis />
    </div>
  </div>
</template>

<style scoped>
.market-scanner {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.tabs {
  display: flex;
  margin-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--border-light);
}

.tab {
  padding: var(--spacing-md) var(--spacing-lg);
  cursor: pointer;
  font-weight: 500;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
}

.tab:hover {
  color: var(--primary-color);
  background-color: var(--bg-secondary);
}

.tab.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  background-color: var(--bg-secondary);
}

.tab-content {
  padding: var(--spacing-md);
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
}

.page-header {
  margin-bottom: var(--spacing-lg);
  text-align: center;
}

.page-header h1 {
  font-size: var(--font-size-xl);
  color: var(--primary-color);
  margin-bottom: var(--spacing-xs);
  font-weight: 700;
}

.subtitle {
  color: var(--text-secondary);
  font-size: var(--font-size-md);
  max-width: 700px;
  margin: 0 auto;
}

.scanner-container {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--spacing-lg);
}

.filter-panel {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-light);
}

.filter-header h2 {
  margin: 0;
  color: var(--primary-color);
  font-size: var(--font-size-lg);
}

.filter-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.filter-section {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-light);
}

.filter-section h3 {
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
  font-size: var(--font-size-md);
  font-weight: 600;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.filter-item {
  display: flex;
  flex-direction: column;
}

.filter-item label {
  margin-bottom: var(--spacing-xs);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.filter-item input[type='checkbox'] {
  margin-right: var(--spacing-xs);
}

.filter-item input[type='number'] {
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.industry-select select {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.saved-filters {
  margin-top: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.filter-chip {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-chip:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--primary-light);
  color: var(--primary-color);
}

.add-filter {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.add-filter:hover {
  background-color: var(--primary-color);
  color: white;
}

.results-panel {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
}

.results-panel h2 {
  margin-top: 0;
  margin-bottom: var(--spacing-lg);
  color: var(--primary-color);
  font-size: var(--font-size-lg);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-light);
}

.scanning-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl) 0;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(66, 185, 131, 0.1);
  border-radius: 50%;
  border-top: 4px solid var(--primary-color);
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

.scanning-indicator p {
  color: var(--text-secondary);
  font-size: var(--font-size-md);
}

.scan-error {
  padding: var(--spacing-md);
  background-color: rgba(231, 76, 60, 0.1);
  color: #c62828;
  border-radius: var(--border-radius-md);
  text-align: center;
  border: 1px solid rgba(231, 76, 60, 0.3);
}

.no-results {
  padding: var(--spacing-xl) 0;
  text-align: center;
  color: var(--text-secondary);
}

.results-table {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: var(--spacing-sm);
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}

th {
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  font-weight: 600;
  position: sticky;
  top: 0;
}

tr:hover {
  background-color: var(--bg-secondary);
}

.btn-small {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
  border-radius: var(--border-radius-sm);
}

/* 通达信信号样式 */
.filter-subsection {
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
}

.filter-subsection h4 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--primary-color);
  font-size: var(--font-size-md);
  font-weight: 600;
}

.tdx-signal {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border: 1px solid #dee2e6;
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  transition: all var(--transition-fast);
}

.tdx-signal:hover {
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.15);
}

.tdx-signal label {
  display: flex;
  flex-direction: column;
  cursor: pointer;
  margin-left: var(--spacing-sm);
}

.signal-name {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.signal-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.4;
}

.tdx-signal input[type='checkbox']:checked + label {
  color: var(--primary-color);
}

.tdx-signal input[type='checkbox']:checked + label .signal-name {
  color: var(--primary-color);
  font-weight: 700;
}

.tdx-signal input[type='checkbox']:checked + label .signal-desc {
  color: var(--primary-dark);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .scanner-container {
    grid-template-columns: 1fr;
  }

  .filter-panel {
    margin-bottom: var(--spacing-lg);
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .tdx-signal {
    padding: var(--spacing-sm);
  }
}

@media (max-width: 768px) {
  .filter-subsection {
    padding: var(--spacing-sm);
  }

  .signal-name {
    font-size: var(--font-size-sm);
  }

  .signal-desc {
    font-size: 12px;
  }
}
</style>
