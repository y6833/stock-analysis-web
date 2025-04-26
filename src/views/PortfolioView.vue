<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useStockStore } from '@/stores/stockStore'
import { usePortfolioStore } from '@/stores/portfolioStore'
import type { Position } from '@/types/portfolio'
import { stockService } from '@/services/stockService'
import * as portfolioService from '@/services/portfolioService'

// 仓位数据
const positions = ref<Position[]>([])
const isLoading = ref(false)
const error = ref('')

// 展开的持仓
const expandedPosition = ref<string | null>(null)

// 交易记录
const tradeRecords = ref<any[]>([])

// 新增仓位表单
const showAddForm = ref(false)
const newPosition = ref<Partial<Position>>({
  symbol: '',
  name: '',
  quantity: 0,
  buyPrice: 0,
  buyDate: new Date().toISOString().split('T')[0],
  lastPrice: 0,
  lastUpdate: new Date().toISOString(),
})

// 修改仓位表单
const showEditForm = ref(false)
const editingPosition = ref<Partial<Position>>({
  symbol: '',
  name: '',
  quantity: 0,
  buyPrice: 0,
  buyDate: new Date().toISOString().split('T')[0],
  lastPrice: 0,
  lastUpdate: new Date().toISOString(),
  id: undefined,
})
const editingIndex = ref(-1)

// 加仓表单
const showAddToForm = ref(false)
const addToPosition = ref<{
  symbol: string
  name: string
  quantity: number
  price: number
  date: string
  notes: string
  id?: number
}>({
  symbol: '',
  name: '',
  quantity: 0,
  price: 0,
  date: new Date().toISOString().split('T')[0],
  notes: '',
})
const addToIndex = ref(-1)

// 减仓表单
const showReduceForm = ref(false)
const reducePosition = ref<{
  symbol: string
  name: string
  quantity: number
  price: number
  date: string
  notes: string
  id?: number
}>({
  symbol: '',
  name: '',
  quantity: 0,
  price: 0,
  date: new Date().toISOString().split('T')[0],
  notes: '',
})
const reduceIndex = ref(-1)

// 搜索相关
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const isSearching = ref(false)
const showSearchResults = ref(false)

// 计算属性
const totalInvestment = computed(() => {
  return positions.value.reduce((sum, position) => {
    return sum + position.quantity * position.buyPrice
  }, 0)
})

const currentValue = computed(() => {
  return positions.value.reduce((sum, position) => {
    return sum + position.quantity * position.lastPrice
  }, 0)
})

const totalProfit = computed(() => {
  return currentValue.value - totalInvestment.value
})

const profitPercentage = computed(() => {
  if (totalInvestment.value === 0) return 0
  return (totalProfit.value / totalInvestment.value) * 100
})

// 获取仓位数据
const loadPositions = async () => {
  isLoading.value = true
  try {
    // 使用portfolioStore加载仓位数据
    const portfolioStore = usePortfolioStore()

    // 先获取投资组合列表
    await portfolioStore.fetchPortfolios()

    // 如果没有当前选中的投资组合，创建一个默认组合
    if (!portfolioStore.currentPortfolioId && portfolioStore.portfolios.length === 0) {
      await portfolioStore.createPortfolio({
        name: '默认组合',
        description: '系统自动创建的默认投资组合',
        isDefault: true,
      })
    }

    // 确保有当前选中的投资组合
    if (portfolioStore.currentPortfolioId) {
      // 加载当前投资组合的持仓
      await portfolioStore.fetchHoldings(portfolioStore.currentPortfolioId)

      // 将数据从store复制到本地状态
      if (portfolioStore.holdings.length > 0) {
        positions.value = portfolioStore.holdings.map((holding: portfolioService.Holding) => ({
          symbol: holding.stockCode,
          name: holding.stockName,
          quantity: holding.quantity,
          buyPrice: holding.averageCost,
          buyDate: new Date(holding.createdAt).toISOString().split('T')[0],
          lastPrice: holding.currentPrice,
          lastUpdate: holding.updatedAt,
          notes: holding.notes,
          id: holding.id,
        }))
      } else {
        // 如果没有持仓，清空本地状态
        positions.value = []
      }
    } else {
      console.error('没有可用的投资组合')
      error.value = '没有可用的投资组合，请创建一个投资组合'
    }
  } catch (err) {
    console.error('加载仓位数据失败:', err)
    error.value = '加载仓位数据失败，请稍后再试'
  } finally {
    isLoading.value = false
  }
}

// 保存仓位数据
const savePositions = () => {
  // 不再需要保存到本地存储，数据已经保存到数据库
}

// 搜索股票
const searchStocks = async () => {
  if (!searchQuery.value) {
    searchResults.value = []
    showSearchResults.value = false
    return
  }

  isSearching.value = true

  try {
    searchResults.value = await stockService.searchStocks(searchQuery.value)
    showSearchResults.value = true
  } catch (err) {
    console.error('搜索股票失败:', err)
  } finally {
    isSearching.value = false
  }
}

// 选择股票
const selectStock = async (stock: any) => {
  newPosition.value.symbol = stock.symbol
  newPosition.value.name = stock.name
  searchQuery.value = ''
  showSearchResults.value = false

  // 获取最新价格
  try {
    const stockData = await stockService.getStockData(stock.symbol)
    if (stockData && stockData.prices.length > 0) {
      newPosition.value.lastPrice = stockData.prices[stockData.prices.length - 1]
    }
  } catch (err) {
    console.error('获取股票价格失败:', err)
  }
}

// 添加仓位
const addPosition = async () => {
  if (
    !newPosition.value.symbol ||
    !newPosition.value.name ||
    !newPosition.value.quantity ||
    !newPosition.value.buyPrice
  ) {
    error.value = '请填写完整的仓位信息'
    return
  }

  const position: Position = {
    symbol: newPosition.value.symbol!,
    name: newPosition.value.name!,
    quantity: newPosition.value.quantity!,
    buyPrice: newPosition.value.buyPrice!,
    buyDate: newPosition.value.buyDate || new Date().toISOString().split('T')[0],
    lastPrice: newPosition.value.lastPrice || newPosition.value.buyPrice!,
    lastUpdate: new Date().toISOString(),
    notes: newPosition.value.notes,
  }

  isLoading.value = true

  try {
    // 使用portfolioStore添加持仓
    const portfolioStore = usePortfolioStore()

    // 首先添加交易记录
    await portfolioStore.addTradeRecord({
      stockCode: position.symbol,
      stockName: position.name,
      tradeType: 'buy', // 买入
      quantity: position.quantity,
      price: position.buyPrice,
      tradeDate: position.buyDate,
      notes: position.notes || '初始建仓',
    })

    // 然后添加或更新持仓
    const result = await portfolioStore.addHolding({
      stockCode: position.symbol,
      stockName: position.name,
      quantity: position.quantity,
      averageCost: position.buyPrice,
      currentPrice: position.lastPrice,
      notes: position.notes,
    })

    if (result) {
      // 添加成功，关闭添加界面
      showAddForm.value = false

      // 重新加载持仓数据
      await loadPositions()

      // 重置表单
      newPosition.value = {
        symbol: '',
        name: '',
        quantity: 0,
        buyPrice: 0,
        buyDate: new Date().toISOString().split('T')[0],
        lastPrice: 0,
        lastUpdate: new Date().toISOString(),
      }

      error.value = ''

      // 显示成功消息
      import('@/utils/toast').then(({ toast }) => {
        toast.success('添加持仓成功！')
      })
    } else {
      error.value = '添加持仓失败，请稍后再试'
    }
  } catch (err) {
    console.error('添加持仓失败:', err)
    error.value = '添加持仓失败，请稍后再试'
  } finally {
    isLoading.value = false
  }
}

// 删除仓位
const removePosition = async (index: number) => {
  // 使用 confirm 对话框，因为需要用户确认
  if (confirm('确定要删除这个持仓吗？这将同时删除该股票的所有交易记录！')) {
    isLoading.value = true

    try {
      const position = positions.value[index]
      const portfolioStore = usePortfolioStore()

      // 查找持仓ID
      const holding = portfolioStore.holdings.find(
        (h: portfolioService.Holding) => h.stockCode === position.symbol
      )

      if (holding) {
        // 获取该股票的所有交易记录
        await loadTradeRecordsForStock(position.symbol)

        // 删除该股票的所有交易记录
        for (const record of tradeRecords.value) {
          if (record.id) {
            await portfolioStore.deleteTradeRecord(portfolioStore.currentPortfolioId!, record.id)
          }
        }

        // 使用portfolioStore删除持仓
        await portfolioStore.deleteHolding(holding.id)

        // 重新加载持仓数据
        await loadPositions()

        // 显示成功消息
        import('@/utils/toast').then(({ toast }) => {
          toast.success('删除持仓及相关交易记录成功！')
        })
      } else {
        // 如果找不到持仓ID，直接从本地数组中删除
        positions.value.splice(index, 1)

        // 显示成功消息
        import('@/utils/toast').then(({ toast }) => {
          toast.success('删除持仓成功！')
        })
      }
    } catch (err) {
      console.error('删除持仓失败:', err)
      error.value = '删除持仓失败，请稍后再试'

      // 显示错误消息
      import('@/utils/toast').then(({ toast }) => {
        toast.error('删除持仓失败，请稍后再试')
      })
    } finally {
      isLoading.value = false
    }
  }
}

// 显示加仓表单
const showAddToPosition = (index: number) => {
  const position = positions.value[index]

  // 复制持仓数据到加仓表单
  addToPosition.value = {
    symbol: position.symbol,
    name: position.name,
    quantity: 0, // 默认为0，用户需要输入加仓数量
    price: position.lastPrice, // 默认使用最新价格
    date: new Date().toISOString().split('T')[0],
    notes: '',
    id: position.id,
  }

  addToIndex.value = index
  showAddToForm.value = true
}

// 显示减仓表单
const showReducePosition = (index: number) => {
  const position = positions.value[index]

  // 复制持仓数据到减仓表单
  reducePosition.value = {
    symbol: position.symbol,
    name: position.name,
    quantity: 0, // 默认为0，用户需要输入减仓数量
    price: position.lastPrice, // 默认使用最新价格
    date: new Date().toISOString().split('T')[0],
    notes: '',
    id: position.id,
  }

  reduceIndex.value = index
  showReduceForm.value = true
}

// 执行加仓操作
const addToPositionSubmit = async () => {
  if (!addToPosition.value.quantity || !addToPosition.value.price) {
    error.value = '请填写完整的加仓信息'
    return
  }

  if (addToPosition.value.quantity <= 0) {
    error.value = '加仓数量必须大于0'
    return
  }

  isLoading.value = true

  try {
    const portfolioStore = usePortfolioStore()

    // 添加交易记录
    const result = await portfolioStore.addTradeRecord({
      stockCode: addToPosition.value.symbol,
      stockName: addToPosition.value.name,
      tradeType: 'buy', // 买入
      quantity: addToPosition.value.quantity,
      price: addToPosition.value.price,
      tradeDate: addToPosition.value.date,
      notes: addToPosition.value.notes,
    })

    if (result) {
      // 加仓成功，关闭加仓界面
      showAddToForm.value = false

      // 重新加载持仓数据
      await loadPositions()

      // 如果当前有展开的持仓，刷新其交易记录
      if (expandedPosition.value === addToPosition.value.symbol) {
        await loadTradeRecordsForStock(addToPosition.value.symbol)
      }

      // 重置加仓表单
      addToPosition.value = {
        symbol: '',
        name: '',
        quantity: 0,
        price: 0,
        date: new Date().toISOString().split('T')[0],
        notes: '',
      }

      addToIndex.value = -1
      error.value = ''

      // 显示成功消息
      import('@/utils/toast').then(({ toast }) => {
        toast.success('加仓成功！')
      })
    } else {
      error.value = '加仓失败，请稍后再试'
    }
  } catch (err) {
    console.error('加仓失败:', err)
    error.value = '加仓失败，请稍后再试'
  } finally {
    isLoading.value = false
  }
}

// 执行减仓操作
const reducePositionSubmit = async () => {
  if (!reducePosition.value.quantity || !reducePosition.value.price) {
    error.value = '请填写完整的减仓信息'
    return
  }

  const position = positions.value[reduceIndex.value]

  if (reducePosition.value.quantity <= 0) {
    error.value = '减仓数量必须大于0'
    return
  }

  if (reducePosition.value.quantity > position.quantity) {
    error.value = '减仓数量不能大于持仓数量'
    return
  }

  isLoading.value = true

  try {
    const portfolioStore = usePortfolioStore()

    // 添加交易记录
    const result = await portfolioStore.addTradeRecord({
      stockCode: reducePosition.value.symbol,
      stockName: reducePosition.value.name,
      tradeType: 'sell', // 卖出
      quantity: reducePosition.value.quantity,
      price: reducePosition.value.price,
      tradeDate: reducePosition.value.date,
      notes: reducePosition.value.notes,
    })

    if (result) {
      // 减仓成功，关闭减仓界面
      showReduceForm.value = false

      // 重新加载持仓数据
      await loadPositions()

      // 如果当前有展开的持仓，刷新其交易记录
      if (expandedPosition.value === reducePosition.value.symbol) {
        await loadTradeRecordsForStock(reducePosition.value.symbol)
      }

      // 重置减仓表单
      reducePosition.value = {
        symbol: '',
        name: '',
        quantity: 0,
        price: 0,
        date: new Date().toISOString().split('T')[0],
        notes: '',
      }

      reduceIndex.value = -1
      error.value = ''

      // 显示成功消息
      import('@/utils/toast').then(({ toast }) => {
        toast.success('减仓成功！')
      })
    } else {
      error.value = '减仓失败，请稍后再试'
    }
  } catch (err) {
    console.error('减仓失败:', err)
    error.value = '减仓失败，请稍后再试'
  } finally {
    isLoading.value = false
  }
}

// 开始编辑持仓
const editPosition = (index: number) => {
  const position = positions.value[index]

  // 复制持仓数据到编辑表单
  editingPosition.value = { ...position }
  editingIndex.value = index
  showEditForm.value = true
}

// 保存编辑的持仓
const saveEditedPosition = async () => {
  if (
    !editingPosition.value.symbol ||
    !editingPosition.value.name ||
    !editingPosition.value.quantity ||
    !editingPosition.value.buyPrice
  ) {
    error.value = '请填写完整的仓位信息'
    return
  }

  isLoading.value = true

  try {
    const portfolioStore = usePortfolioStore()

    // 查找持仓ID
    const holding = portfolioStore.holdings.find(
      (h: portfolioService.Holding) => h.stockCode === editingPosition.value.symbol
    )

    if (holding) {
      // 使用portfolioStore更新持仓
      const result = await portfolioStore.updateHolding(holding.id, {
        quantity: editingPosition.value.quantity!,
        averageCost: editingPosition.value.buyPrice!,
        currentPrice: editingPosition.value.lastPrice!,
        notes: editingPosition.value.notes,
      })

      if (result) {
        // 更新成功，关闭编辑界面
        showEditForm.value = false

        // 重新加载持仓数据
        await loadPositions()

        // 重置编辑表单
        editingPosition.value = {
          symbol: '',
          name: '',
          quantity: 0,
          buyPrice: 0,
          buyDate: new Date().toISOString().split('T')[0],
          lastPrice: 0,
          lastUpdate: new Date().toISOString(),
          id: undefined,
        }
        editingIndex.value = -1

        error.value = ''

        // 显示成功消息
        import('@/utils/toast').then(({ toast }) => {
          toast.success('更新持仓成功！')
        })
      } else {
        error.value = '更新持仓失败，请稍后再试'
      }
    } else {
      error.value = '找不到要更新的持仓'
    }
  } catch (err) {
    console.error('更新持仓失败:', err)
    error.value = '更新持仓失败，请稍后再试'
  } finally {
    isLoading.value = false
  }
}

// 更新股票价格
const updatePrices = async () => {
  isLoading.value = true

  try {
    const portfolioStore = usePortfolioStore()

    for (let i = 0; i < positions.value.length; i++) {
      const position = positions.value[i]
      const stockData = await stockService.getStockData(position.symbol)

      if (stockData && stockData.prices.length > 0) {
        const newPrice = stockData.prices[stockData.prices.length - 1]

        // 更新本地状态
        positions.value[i] = {
          ...position,
          lastPrice: newPrice,
          lastUpdate: new Date().toISOString(),
        }

        // 更新数据库
        const holding = portfolioStore.holdings.find(
          (h: portfolioService.Holding) => h.stockCode === position.symbol
        )
        if (holding) {
          await portfolioStore.updateHolding(holding.id, {
            currentPrice: newPrice,
          })
        }
      }
    }

    // 显示成功消息
    import('@/utils/toast').then(({ toast }) => {
      toast.success('价格更新成功！')
    })
  } catch (err) {
    console.error('更新价格失败:', err)
    error.value = '更新价格失败，请稍后再试'

    // 显示错误消息
    import('@/utils/toast').then(({ toast }) => {
      toast.error('更新价格失败，请稍后再试')
    })
  } finally {
    isLoading.value = false
  }
}

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

// 加载特定股票的交易记录
const loadTradeRecordsForStock = async (symbol: string) => {
  isLoading.value = true
  try {
    const portfolioStore = usePortfolioStore()

    // 确保有当前选中的投资组合
    if (portfolioStore.currentPortfolioId) {
      // 获取所有交易记录
      const allRecords = await portfolioStore.fetchTradeRecords()

      // 过滤出特定股票的交易记录
      tradeRecords.value = allRecords.filter((record) => record.stockCode === symbol)
    } else {
      console.error('没有可用的投资组合')
      error.value = '没有可用的投资组合，请创建一个投资组合'
    }
  } catch (err) {
    console.error('加载交易记录失败:', err)
    error.value = '加载交易记录失败，请稍后再试'

    // 显示错误消息
    import('@/utils/toast').then(({ toast }) => {
      toast.error('加载交易记录失败，请稍后再试')
    })
  } finally {
    isLoading.value = false
  }
}

// 切换展开/收缩持仓
const togglePosition = async (symbol: string) => {
  // 如果已经展开了这个持仓，则收缩
  if (expandedPosition.value === symbol) {
    expandedPosition.value = null
    return
  }

  // 否则展开这个持仓
  expandedPosition.value = symbol

  // 加载该持仓的交易记录
  await loadTradeRecordsForStock(symbol)
}

// 格式化交易类型
const formatTradeType = (type: string) => {
  switch (type) {
    case 'buy':
      return '买入'
    case 'sell':
      return '卖出'
    default:
      return type
  }
}

// 初始化
onMounted(async () => {
  await loadPositions()
})
</script>

<template>
  <div class="portfolio-view">
    <h1>仓位管理</h1>

    <div class="portfolio-header">
      <div class="portfolio-summary">
        <div class="summary-item">
          <span class="label">总投资:</span>
          <span class="value">{{ totalInvestment.toFixed(2) }} 元</span>
        </div>
        <div class="summary-item">
          <span class="label">当前市值:</span>
          <span class="value">{{ currentValue.toFixed(2) }} 元</span>
        </div>
        <div class="summary-item">
          <span class="label">总收益:</span>
          <span class="value" :class="{ profit: totalProfit > 0, loss: totalProfit < 0 }">
            {{ totalProfit.toFixed(2) }} 元 ({{ profitPercentage.toFixed(2) }}%)
          </span>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn primary" @click="showAddForm = true">添加持仓</button>
        <button class="btn secondary" @click="updatePrices" :disabled="isLoading">
          {{ isLoading ? '更新中...' : '更新价格' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <!-- 没有标签页切换，直接显示持仓列表 -->

    <!-- 添加持仓表单 -->
    <div v-if="showAddForm" class="add-position-form">
      <h2>添加新持仓</h2>

      <div class="form-group">
        <label>股票代码/名称</label>
        <div class="search-input-container">
          <input
            v-model="searchQuery"
            @input="searchStocks"
            @focus="showSearchResults = !!searchQuery"
            placeholder="搜索股票代码或名称"
            class="form-control"
          />
          <div v-if="showSearchResults" class="search-results">
            <div v-if="isSearching" class="searching">搜索中...</div>
            <div v-else-if="searchResults.length === 0" class="no-results">未找到相关股票</div>
            <div
              v-else
              v-for="stock in searchResults"
              :key="stock.symbol"
              class="search-result-item"
              @click="selectStock(stock)"
            >
              <span class="stock-symbol">{{ stock.symbol }}</span>
              <span class="stock-name">{{ stock.name }}</span>
              <span class="stock-market">{{ stock.market }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>股票代码</label>
          <input v-model="newPosition.symbol" class="form-control" readonly />
        </div>
        <div class="form-group">
          <label>股票名称</label>
          <input v-model="newPosition.name" class="form-control" readonly />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>买入数量</label>
          <input v-model.number="newPosition.quantity" type="number" min="1" class="form-control" />
        </div>
        <div class="form-group">
          <label>买入价格</label>
          <input
            v-model.number="newPosition.buyPrice"
            type="number"
            min="0"
            step="0.01"
            class="form-control"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>买入日期</label>
          <input v-model="newPosition.buyDate" type="date" class="form-control" />
        </div>
        <div class="form-group">
          <label>最新价格</label>
          <input
            v-model.number="newPosition.lastPrice"
            type="number"
            min="0"
            step="0.01"
            class="form-control"
          />
        </div>
      </div>

      <div class="form-group">
        <label>备注</label>
        <textarea v-model="newPosition.notes" class="form-control"></textarea>
      </div>

      <div class="form-actions">
        <button class="btn secondary" @click="showAddForm = false">取消</button>
        <button class="btn primary" @click="addPosition">添加</button>
      </div>
    </div>

    <!-- 编辑持仓表单 -->
    <div v-if="showEditForm" class="edit-position-form">
      <h2>编辑持仓</h2>

      <div class="form-row">
        <div class="form-group">
          <label>股票代码</label>
          <input v-model="editingPosition.symbol" class="form-control" readonly />
        </div>
        <div class="form-group">
          <label>股票名称</label>
          <input v-model="editingPosition.name" class="form-control" readonly />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>持仓数量</label>
          <input
            v-model.number="editingPosition.quantity"
            type="number"
            min="1"
            class="form-control"
          />
        </div>
        <div class="form-group">
          <label>买入价格</label>
          <input
            v-model.number="editingPosition.buyPrice"
            type="number"
            min="0"
            step="0.01"
            class="form-control"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>买入日期</label>
          <input v-model="editingPosition.buyDate" type="date" class="form-control" />
        </div>
        <div class="form-group">
          <label>最新价格</label>
          <input
            v-model.number="editingPosition.lastPrice"
            type="number"
            min="0"
            step="0.01"
            class="form-control"
          />
        </div>
      </div>

      <div class="form-group">
        <label>备注</label>
        <textarea v-model="editingPosition.notes" class="form-control"></textarea>
      </div>

      <div class="form-actions">
        <button class="btn secondary" @click="showEditForm = false">取消</button>
        <button class="btn primary" @click="saveEditedPosition">保存</button>
      </div>
    </div>

    <!-- 加仓表单 -->
    <div v-if="showAddToForm" class="add-to-position-form">
      <h2>加仓</h2>

      <div class="form-row">
        <div class="form-group">
          <label>股票代码</label>
          <input v-model="addToPosition.symbol" class="form-control" readonly />
        </div>
        <div class="form-group">
          <label>股票名称</label>
          <input v-model="addToPosition.name" class="form-control" readonly />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>加仓数量</label>
          <input
            v-model.number="addToPosition.quantity"
            type="number"
            min="1"
            class="form-control"
          />
        </div>
        <div class="form-group">
          <label>买入价格</label>
          <input
            v-model.number="addToPosition.price"
            type="number"
            min="0"
            step="0.01"
            class="form-control"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>买入日期</label>
          <input v-model="addToPosition.date" type="date" class="form-control" />
        </div>
      </div>

      <div class="form-group">
        <label>备注</label>
        <textarea v-model="addToPosition.notes" class="form-control"></textarea>
      </div>

      <div class="form-actions">
        <button class="btn secondary" @click="showAddToForm = false">取消</button>
        <button class="btn primary" @click="addToPositionSubmit">确认加仓</button>
      </div>
    </div>

    <!-- 减仓表单 -->
    <div v-if="showReduceForm" class="reduce-position-form">
      <h2>减仓</h2>

      <div class="form-row">
        <div class="form-group">
          <label>股票代码</label>
          <input v-model="reducePosition.symbol" class="form-control" readonly />
        </div>
        <div class="form-group">
          <label>股票名称</label>
          <input v-model="reducePosition.name" class="form-control" readonly />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>减仓数量</label>
          <input
            v-model.number="reducePosition.quantity"
            type="number"
            min="1"
            class="form-control"
          />
        </div>
        <div class="form-group">
          <label>卖出价格</label>
          <input
            v-model.number="reducePosition.price"
            type="number"
            min="0"
            step="0.01"
            class="form-control"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>卖出日期</label>
          <input v-model="reducePosition.date" type="date" class="form-control" />
        </div>
      </div>

      <div class="form-group">
        <label>备注</label>
        <textarea v-model="reducePosition.notes" class="form-control"></textarea>
      </div>

      <div class="form-actions">
        <button class="btn secondary" @click="showReduceForm = false">取消</button>
        <button class="btn primary" @click="reducePositionSubmit">确认减仓</button>
      </div>
    </div>

    <!-- 持仓列表 -->
    <div class="positions-table-container">
      <table class="positions-table" v-if="positions.length > 0">
        <thead>
          <tr>
            <th>股票代码</th>
            <th>股票名称</th>
            <th>持仓数量</th>
            <th>买入价格</th>
            <th>买入日期</th>
            <th>最新价格</th>
            <th>持仓市值</th>
            <th>盈亏</th>
            <th>盈亏比例</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(position, index) in positions" :key="position.symbol">
            <tr :class="{ 'zero-position': position.quantity === 0 }">
              <td class="clickable" @click="togglePosition(position.symbol)">
                {{ position.symbol }}
                <span class="toggle-icon">{{
                  expandedPosition === position.symbol ? '▼' : '▶'
                }}</span>
              </td>
              <td class="clickable" @click="togglePosition(position.symbol)">
                {{ position.name }}
              </td>
              <td>{{ position.quantity }}</td>
              <td>{{ Number(position.buyPrice).toFixed(2) }}</td>
              <td>{{ formatDate(position.buyDate) }}</td>
              <td>{{ Number(position.lastPrice).toFixed(2) }}</td>
              <td>{{ (position.quantity * Number(position.lastPrice)).toFixed(2) }}</td>
              <td
                :class="{
                  profit: Number(position.lastPrice) > Number(position.buyPrice),
                  loss: Number(position.lastPrice) < Number(position.buyPrice),
                }"
              >
                {{
                  (
                    (Number(position.lastPrice) - Number(position.buyPrice)) *
                    position.quantity
                  ).toFixed(2)
                }}
              </td>
              <td
                :class="{
                  profit: Number(position.lastPrice) > Number(position.buyPrice),
                  loss: Number(position.lastPrice) < Number(position.buyPrice),
                }"
              >
                {{
                  (
                    ((Number(position.lastPrice) - Number(position.buyPrice)) /
                      Number(position.buyPrice)) *
                    100
                  ).toFixed(2)
                }}%
              </td>
              <td>
                <div class="action-buttons-cell">
                  <button class="btn-icon add" @click="showAddToPosition(index)" title="加仓">
                    <span>+</span>
                  </button>
                  <button
                    class="btn-icon reduce"
                    @click="showReducePosition(index)"
                    title="减仓"
                    :disabled="position.quantity === 0"
                  >
                    <span>-</span>
                  </button>
                  <button class="btn-icon edit" @click="editPosition(index)" title="编辑">
                    <span>✎</span>
                  </button>
                  <button class="btn-icon delete" @click="removePosition(index)" title="删除">
                    <span>×</span>
                  </button>
                </div>
              </td>
            </tr>

            <!-- 交易历史记录 -->
            <tr v-if="expandedPosition === position.symbol" class="trade-history-row">
              <td colspan="10" class="trade-history-cell">
                <div class="trade-history">
                  <h3>交易历史记录</h3>
                  <table class="trade-history-table" v-if="tradeRecords.length > 0">
                    <thead>
                      <tr>
                        <th>交易类型</th>
                        <th>交易数量</th>
                        <th>交易价格</th>
                        <th>交易日期</th>
                        <th>交易金额</th>
                        <th>备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="record in tradeRecords" :key="record.id">
                        <td
                          :class="{
                            'buy-type': record.tradeType === 'buy',
                            'sell-type': record.tradeType === 'sell',
                          }"
                        >
                          {{ formatTradeType(record.tradeType) }}
                        </td>
                        <td>{{ record.quantity }}</td>
                        <td>{{ Number(record.price).toFixed(2) }}</td>
                        <td>{{ formatDate(record.tradeDate || record.createdAt) }}</td>
                        <td>{{ (record.quantity * Number(record.price)).toFixed(2) }}</td>
                        <td>{{ record.notes }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div v-else class="no-records">
                    <p>暂无交易记录</p>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <div v-else class="no-positions">
        <p>您还没有添加任何持仓</p>
        <button class="btn primary" @click="showAddForm = true">添加持仓</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.portfolio-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.portfolio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0;
  padding: 20px;
  background-color: #f8f8f8;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.portfolio-summary {
  display: flex;
  gap: 30px;
}

.summary-item {
  display: flex;
  flex-direction: column;
}

.label {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.value {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.profit {
  color: #4caf50;
}

.loss {
  color: #f44336;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.primary {
  background-color: #42b983;
  color: white;
}

.primary:hover {
  background-color: #3aa876;
}

.secondary {
  background-color: #e0e0e0;
  color: #333;
}

.secondary:hover {
  background-color: #d0d0d0;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  padding: 15px;
  background-color: #ffebee;
  color: #c62828;
  border-radius: 4px;
  margin: 20px 0;
  text-align: center;
}

.add-position-form,
.edit-position-form,
.add-to-position-form,
.reduce-position-form {
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.edit-position-form {
  background-color: #f5f5f5;
  border-left: 4px solid #2196f3;
}

.add-to-position-form {
  background-color: #f5f5f5;
  border-left: 4px solid #4caf50;
}

.reduce-position-form {
  background-color: #f5f5f5;
  border-left: 4px solid #ffc107;
}

.form-group {
  margin-bottom: 15px;
}

.form-row {
  display: flex;
  gap: 20px;
}

.form-row .form-group {
  flex: 1;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
}

.form-control {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

textarea.form-control {
  min-height: 80px;
  resize: vertical;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.positions-table-container {
  margin-top: 30px;
  overflow-x: auto;
}

.positions-table {
  width: 100%;
  border-collapse: collapse;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

.positions-table th,
.positions-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.positions-table th {
  background-color: #f5f5f5;
  font-weight: 600;
  color: #333;
}

.positions-table tr:last-child td {
  border-bottom: none;
}

.positions-table tr:hover {
  background-color: #f9f9f9;
}

.btn-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-buttons-cell {
  display: flex;
  gap: 5px;
}

.add {
  background-color: #e8f5e9;
  color: #4caf50;
}

.add:hover {
  background-color: #c8e6c9;
}

.reduce {
  background-color: #fff8e1;
  color: #ffc107;
}

.reduce:hover {
  background-color: #ffecb3;
}

.edit {
  background-color: #e3f2fd;
  color: #2196f3;
}

.edit:hover {
  background-color: #bbdefb;
}

.delete {
  background-color: #ffebee;
  color: #f44336;
}

.delete:hover {
  background-color: #ffcdd2;
}

/* 可点击的单元格 */
.clickable {
  cursor: pointer;
  position: relative;
}

.clickable:hover {
  background-color: #f5f5f5;
}

/* 展开/收缩图标 */
.toggle-icon {
  margin-left: 5px;
  font-size: 12px;
  color: #666;
}

/* 交易历史记录 */
.trade-history-row {
  background-color: #f9f9f9;
}

.trade-history-cell {
  padding: 0;
}

.trade-history {
  padding: 15px;
  border-top: 1px solid #eee;
}

.trade-history h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  color: #333;
}

.trade-history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.trade-history-table th,
.trade-history-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.trade-history-table th {
  background-color: #f5f5f5;
  font-weight: 500;
}

.buy-type {
  color: #4caf50;
}

.sell-type {
  color: #f44336;
}

.no-records {
  padding: 20px;
  text-align: center;
  color: #666;
}

/* 零持仓样式 */
.zero-position {
  background-color: #f9f9f9;
  color: #999;
}

.zero-position .clickable {
  color: #666;
}

.zero-position .btn-icon.reduce {
  opacity: 0.5;
  cursor: not-allowed;
}

.no-positions {
  text-align: center;
  padding: 50px 0;
  color: #666;
}

.search-input-container {
  position: relative;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.search-result-item {
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
}

.search-result-item:hover {
  background-color: #f5f5f5;
}

.search-result-item:last-child {
  border-bottom: none;
}

.stock-symbol {
  font-weight: bold;
  color: #333;
  margin-right: 10px;
}

.stock-name {
  flex: 1;
  color: #666;
}

.stock-market {
  color: #999;
  font-size: 0.9em;
}

.searching,
.no-results {
  padding: 12px 16px;
  color: #666;
  text-align: center;
}

@media (max-width: 768px) {
  .portfolio-header {
    flex-direction: column;
    gap: 20px;
  }

  .portfolio-summary {
    flex-direction: column;
    gap: 15px;
  }

  .form-row {
    flex-direction: column;
    gap: 15px;
  }
}
</style>
