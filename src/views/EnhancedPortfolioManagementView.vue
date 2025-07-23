<template>
  <div class="enhanced-portfolio-management">
    <div class="page-header">
      <h1>增强投资组合管理</h1>
      <div class="header-actions">
        <el-select v-model="selectedPortfolio" placeholder="选择投资组合" @change="loadPortfolio">
          <el-option
            v-for="portfolio in portfolios"
            :key="portfolio.id"
            :label="portfolio.name"
            :value="portfolio.id"
          />
        </el-select>
        <el-button type="primary" @click="createNewPortfolio">创建新投资组合</el-button>
      </div>
    </div>

    <div v-if="loading" class="loading-container">
      <el-spinner size="large" />
      <p>加载投资组合数据...</p>
    </div>

    <div v-else-if="!selectedPortfolio" class="empty-state">
      <div class="empty-icon">📊</div>
      <h2>选择或创建投资组合</h2>
      <p>请从上方下拉菜单选择一个投资组合，或创建一个新的投资组合开始管理。</p>
      <el-button type="primary" @click="createNewPortfolio">创建新投资组合</el-button>
    </div>

    <div v-else class="portfolio-content">
      <el-tabs v-model="activeTab" class="portfolio-tabs">
        <el-tab-pane label="概览" name="overview">
          <div class="portfolio-overview">
            <div class="portfolio-summary">
              <div class="summary-card">
                <div class="card-title">总资产</div>
                <div class="card-value">{{ formatCurrency(portfolioSummary.totalValue) }}</div>
                <div
                  class="card-change"
                  :class="getChangeClass(portfolioSummary.totalProfitPercentage)"
                >
                  {{ formatPercent(portfolioSummary.totalProfitPercentage) }}
                </div>
              </div>
              <div class="summary-card">
                <div class="card-title">日收益</div>
                <div class="card-value">{{ formatCurrency(portfolioSummary.dailyProfit) }}</div>
                <div
                  class="card-change"
                  :class="getChangeClass(portfolioSummary.dailyProfitPercentage)"
                >
                  {{ formatPercent(portfolioSummary.dailyProfitPercentage) }}
                </div>
              </div>
              <div class="summary-card">
                <div class="card-title">总收益</div>
                <div class="card-value">{{ formatCurrency(portfolioSummary.totalProfit) }}</div>
                <div
                  class="card-change"
                  :class="getChangeClass(portfolioSummary.totalProfitPercentage)"
                >
                  {{ formatPercent(portfolioSummary.totalProfitPercentage) }}
                </div>
              </div>
              <div class="summary-card">
                <div class="card-title">年化收益率</div>
                <div class="card-value">{{ formatPercent(portfolioSummary.annualizedReturn) }}</div>
                <div class="card-subtitle">自创建以来</div>
              </div>
            </div>

            <div class="chart-section">
              <PortfolioPerformanceChart
                :portfolioId="selectedPortfolio"
                :height="400"
                :showBenchmarkSelector="true"
              />
            </div>

            <div class="holdings-section">
              <h3>持仓明细</h3>
              <el-table :data="holdings" stripe style="width: 100%">
                <el-table-column prop="symbol" label="代码" width="100" />
                <el-table-column prop="name" label="名称" />
                <el-table-column prop="quantity" label="数量" width="100" />
                <el-table-column prop="currentPrice" label="当前价格" width="120">
                  <template #default="scope">
                    {{ formatCurrency(scope.row.currentPrice) }}
                  </template>
                </el-table-column>
                <el-table-column prop="currentValue" label="市值" width="120">
                  <template #default="scope">
                    {{ formatCurrency(scope.row.currentValue) }}
                  </template>
                </el-table-column>
                <el-table-column prop="profitPercentage" label="收益率" width="120">
                  <template #default="scope">
                    <span :class="getChangeClass(scope.row.profitPercentage)">
                      {{ formatPercent(scope.row.profitPercentage) }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="weight" label="权重" width="100">
                  <template #default="scope">
                    {{ formatPercent(scope.row.weight) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="150">
                  <template #default="scope">
                    <el-button size="small" @click="editPosition(scope.row)">编辑</el-button>
                    <el-button size="small" type="danger" @click="deletePosition(scope.row)"
                      >删除</el-button
                    >
                  </template>
                </el-table-column>
              </el-table>
              <div class="table-actions">
                <el-button type="primary" @click="addPosition">添加持仓</el-button>
                <el-button @click="importPositions">导入持仓</el-button>
                <el-button @click="exportPositions">导出持仓</el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="风险分析" name="risk">
          <PortfolioRiskAnalysis :portfolioId="selectedPortfolio" />
        </el-tab-pane>

        <el-tab-pane label="高级分析" name="advanced">
          <AdvancedPortfolioAnalytics :portfolioId="selectedPortfolio" />
        </el-tab-pane>

        <el-tab-pane label="投资组合优化" name="optimization">
          <PortfolioOptimizer :portfolioId="selectedPortfolio" />
        </el-tab-pane>

        <el-tab-pane label="交易记录" name="transactions">
          <div class="transactions-section">
            <h3>交易记录</h3>
            <el-table :data="transactions" stripe style="width: 100%">
              <el-table-column prop="date" label="日期" width="120" />
              <el-table-column prop="symbol" label="代码" width="100" />
              <el-table-column prop="name" label="名称" />
              <el-table-column prop="type" label="类型" width="80">
                <template #default="scope">
                  <span :class="scope.row.type === 'buy' ? 'buy-type' : 'sell-type'">
                    {{ scope.row.type === 'buy' ? '买入' : '卖出' }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="quantity" label="数量" width="100" />
              <el-table-column prop="price" label="价格" width="120">
                <template #default="scope">
                  {{ formatCurrency(scope.row.price) }}
                </template>
              </el-table-column>
              <el-table-column prop="amount" label="金额" width="120">
                <template #default="scope">
                  {{ formatCurrency(scope.row.price * scope.row.quantity) }}
                </template>
              </el-table-column>
              <el-table-column prop="fees" label="手续费" width="100">
                <template #default="scope">
                  {{ formatCurrency(scope.row.fees) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100">
                <template #default="scope">
                  <el-button size="small" @click="editTransaction(scope.row)">编辑</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div class="table-actions">
              <el-button type="primary" @click="addTransaction">添加交易</el-button>
              <el-button @click="importTransactions">导入交易</el-button>
              <el-button @click="exportTransactions">导出交易</el-button>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="设置" name="settings">
          <div class="portfolio-settings">
            <h3>投资组合设置</h3>
            <el-form :model="portfolioSettings" label-width="120px">
              <el-form-item label="投资组合名称">
                <el-input v-model="portfolioSettings.name" />
              </el-form-item>
              <el-form-item label="描述">
                <el-input v-model="portfolioSettings.description" type="textarea" />
              </el-form-item>
              <el-form-item label="基准指数">
                <el-select v-model="portfolioSettings.benchmark" placeholder="选择基准指数">
                  <el-option label="沪深300" value="CSI300" />
                  <el-option label="上证指数" value="SSE" />
                  <el-option label="深证成指" value="SZSE" />
                  <el-option label="创业板指" value="GEM" />
                  <el-option label="标普500" value="SPX" />
                </el-select>
              </el-form-item>
              <el-form-item label="货币">
                <el-select v-model="portfolioSettings.currency" placeholder="选择货币">
                  <el-option label="人民币 (CNY)" value="CNY" />
                  <el-option label="美元 (USD)" value="USD" />
                  <el-option label="港币 (HKD)" value="HKD" />
                </el-select>
              </el-form-item>
              <el-form-item label="风险等级">
                <el-slider
                  v-model="portfolioSettings.riskLevel"
                  :min="1"
                  :max="10"
                  :step="1"
                  show-stops
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="savePortfolioSettings">保存设置</el-button>
                <el-button type="danger" @click="deletePortfolio">删除投资组合</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 添加持仓对话框 -->
    <el-dialog v-model="positionDialogVisible" :title="isEditingPosition ? '编辑持仓' : '添加持仓'">
      <el-form :model="positionForm" label-width="100px">
        <el-form-item label="股票代码">
          <el-input v-model="positionForm.symbol" :disabled="isEditingPosition" />
        </el-form-item>
        <el-form-item label="股票名称">
          <el-input v-model="positionForm.name" :disabled="isEditingPosition" />
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="positionForm.quantity" :min="0" />
        </el-form-item>
        <el-form-item label="买入价格">
          <el-input-number v-model="positionForm.buyPrice" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="买入日期">
          <el-date-picker v-model="positionForm.buyDate" type="date" placeholder="选择日期" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="positionForm.notes" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="positionDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="savePosition">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加交易对话框 -->
    <el-dialog
      v-model="transactionDialogVisible"
      :title="isEditingTransaction ? '编辑交易' : '添加交易'"
    >
      <el-form :model="transactionForm" label-width="100px">
        <el-form-item label="股票代码">
          <el-input v-model="transactionForm.symbol" />
        </el-form-item>
        <el-form-item label="股票名称">
          <el-input v-model="transactionForm.name" />
        </el-form-item>
        <el-form-item label="交易类型">
          <el-select v-model="transactionForm.type">
            <el-option label="买入" value="buy" />
            <el-option label="卖出" value="sell" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="transactionForm.quantity" :min="0" />
        </el-form-item>
        <el-form-item label="价格">
          <el-input-number v-model="transactionForm.price" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="交易日期">
          <el-date-picker v-model="transactionForm.date" type="date" placeholder="选择日期" />
        </el-form-item>
        <el-form-item label="手续费">
          <el-input-number v-model="transactionForm.fees" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="transactionForm.notes" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="transactionDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveTransaction">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 创建投资组合对话框 -->
    <el-dialog v-model="portfolioDialogVisible" title="创建新投资组合">
      <el-form :model="portfolioForm" label-width="100px">
        <el-form-item label="投资组合名称">
          <el-input v-model="portfolioForm.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="portfolioForm.description" type="textarea" />
        </el-form-item>
        <el-form-item label="基准指数">
          <el-select v-model="portfolioForm.benchmark" placeholder="选择基准指数">
            <el-option label="沪深300" value="CSI300" />
            <el-option label="上证指数" value="SSE" />
            <el-option label="深证成指" value="SZSE" />
            <el-option label="创业板指" value="GEM" />
            <el-option label="标普500" value="SPX" />
          </el-select>
        </el-form-item>
        <el-form-item label="货币">
          <el-select v-model="portfolioForm.currency" placeholder="选择货币">
            <el-option label="人民币 (CNY)" value="CNY" />
            <el-option label="美元 (USD)" value="USD" />
            <el-option label="港币 (HKD)" value="HKD" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="portfolioDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveNewPortfolio">创建</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePortfolioStore } from '@/stores/portfolio/portfolioStore'
import PortfolioPerformanceChart from '@/components/portfolio/PortfolioPerformanceChart.vue'
import PortfolioRiskAnalysis from '@/components/portfolio/PortfolioRiskAnalysis.vue'
import AdvancedPortfolioAnalytics from '@/components/portfolio/AdvancedPortfolioAnalytics.vue'
import PortfolioOptimizer from '@/components/portfolio/PortfolioOptimizer.vue'
import { portfolioAnalyticsService } from '@/services/portfolio/portfolioAnalyticsService'

// 状态
const loading = ref(false)
const activeTab = ref('overview')
const portfolioStore = usePortfolioStore()

// 投资组合列表
const portfolios = ref<Array<{ id: number; name: string }>>([])
const selectedPortfolio = ref<number | null>(null)

// 投资组合摘要
const portfolioSummary = ref({
  totalValue: 0,
  totalCost: 0,
  totalProfit: 0,
  totalProfitPercentage: 0,
  dailyProfit: 0,
  dailyProfitPercentage: 0,
  annualizedReturn: 0,
})

// 持仓列表
const holdings = ref<any[]>([])

// 交易记录
const transactions = ref<any[]>([])

// 投资组合设置
const portfolioSettings = ref({
  name: '',
  description: '',
  benchmark: 'CSI300',
  currency: 'CNY',
  riskLevel: 5,
})

// 对话框状态
const positionDialogVisible = ref(false)
const transactionDialogVisible = ref(false)
const portfolioDialogVisible = ref(false)
const isEditingPosition = ref(false)
const isEditingTransaction = ref(false)

// 表单数据
const positionForm = ref({
  id: null as number | null,
  symbol: '',
  name: '',
  quantity: 0,
  buyPrice: 0,
  buyDate: '',
  notes: '',
})

const transactionForm = ref({
  id: null as number | null,
  symbol: '',
  name: '',
  type: 'buy',
  quantity: 0,
  price: 0,
  date: '',
  fees: 0,
  notes: '',
})

const portfolioForm = ref({
  name: '',
  description: '',
  benchmark: 'CSI300',
  currency: 'CNY',
})

// 初始化
onMounted(async () => {
  await fetchPortfolios()

  // 如果有投资组合，选择第一个
  if (portfolios.value.length > 0) {
    selectedPortfolio.value = portfolios.value[0].id
    await loadPortfolio()
  }
})

// 获取投资组合列表
async function fetchPortfolios() {
  loading.value = true

  try {
    // 在实际实现中，这将从API获取数据
    // 这里使用模拟数据
    portfolios.value = [
      { id: 1, name: '我的A股组合' },
      { id: 2, name: '港股投资' },
      { id: 3, name: '美股科技股' },
    ]
  } catch (error) {
    console.error('获取投资组合列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载投资组合数据
async function loadPortfolio() {
  if (!selectedPortfolio.value) return

  loading.value = true

  try {
    // 获取投资组合持仓
    await portfolioStore.fetchHoldings(selectedPortfolio.value)

    // 获取投资组合分析
    const analytics = await portfolioAnalyticsService.analyzePortfolio(
      portfolioStore.positionSummaries
    )

    // 更新投资组合摘要
    portfolioSummary.value = {
      totalValue: analytics.totalValue,
      totalCost: analytics.totalCost,
      totalProfit: analytics.totalProfit,
      totalProfitPercentage: analytics.totalProfitPercentage / 100,
      dailyProfit: 1000, // 模拟数据
      dailyProfitPercentage: 0.02, // 模拟数据
      annualizedReturn: 0.15, // 模拟数据
    }

    // 更新持仓列表
    holdings.value = portfolioStore.positionSummaries

    // 获取交易记录
    // 在实际实现中，这将从API获取数据
    // 这里使用模拟数据
    transactions.value = [
      {
        id: 1,
        date: '2025-06-15',
        symbol: '600036',
        name: '招商银行',
        type: 'buy',
        quantity: 100,
        price: 45.67,
        fees: 5.0,
        notes: '长期持有',
      },
      {
        id: 2,
        date: '2025-06-20',
        symbol: '000001',
        name: '平安银行',
        type: 'buy',
        quantity: 200,
        price: 18.25,
        fees: 7.3,
        notes: '',
      },
      {
        id: 3,
        date: '2025-07-05',
        symbol: '600519',
        name: '贵州茅台',
        type: 'buy',
        quantity: 10,
        price: 1800.0,
        fees: 36.0,
        notes: '高位买入',
      },
      {
        id: 4,
        date: '2025-07-10',
        symbol: '000001',
        name: '平安银行',
        type: 'sell',
        quantity: 100,
        price: 19.5,
        fees: 3.9,
        notes: '获利了结一半',
      },
    ]

    // 获取投资组合设置
    // 在实际实现中，这将从API获取数据
    // 这里使用模拟数据
    portfolioSettings.value = {
      name: portfolios.value.find((p) => p.id === selectedPortfolio.value)?.name || '',
      description: '这是我的主要投资组合，专注于价值投资和长期持有。',
      benchmark: 'CSI300',
      currency: 'CNY',
      riskLevel: 5,
    }
  } catch (error) {
    console.error('加载投资组合数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 添加持仓
function addPosition() {
  isEditingPosition.value = false
  positionForm.value = {
    id: null,
    symbol: '',
    name: '',
    quantity: 0,
    buyPrice: 0,
    buyDate: new Date().toISOString().split('T')[0],
    notes: '',
  }
  positionDialogVisible.value = true
}

// 编辑持仓
function editPosition(position: any) {
  isEditingPosition.value = true
  positionForm.value = {
    id: position.id,
    symbol: position.symbol,
    name: position.name,
    quantity: position.quantity,
    buyPrice: position.buyPrice,
    buyDate: position.buyDate,
    notes: position.notes || '',
  }
  positionDialogVisible.value = true
}

// 删除持仓
function deletePosition(position: any) {
  // 在实际实现中，这将调用API删除持仓
  // 这里简单地从列表中移除
  holdings.value = holdings.value.filter((p) => p.id !== position.id)
}

// 保存持仓
function savePosition() {
  // 在实际实现中，这将调用API保存持仓
  // 这里简单地更新列表
  if (isEditingPosition.value) {
    const index = holdings.value.findIndex((p) => p.id === positionForm.value.id)
    if (index !== -1) {
      holdings.value[index] = {
        ...holdings.value[index],
        quantity: positionForm.value.quantity,
        buyPrice: positionForm.value.buyPrice,
        buyDate: positionForm.value.buyDate,
        notes: positionForm.value.notes,
      }
    }
  } else {
    // 添加新持仓
    const newPosition = {
      id: Date.now(), // 临时ID
      symbol: positionForm.value.symbol,
      name: positionForm.value.name,
      quantity: positionForm.value.quantity,
      buyPrice: positionForm.value.buyPrice,
      buyDate: positionForm.value.buyDate,
      notes: positionForm.value.notes,
      currentPrice: positionForm.value.buyPrice * (1 + Math.random() * 0.1 - 0.05), // 模拟当前价格
      currentValue:
        positionForm.value.quantity *
        positionForm.value.buyPrice *
        (1 + Math.random() * 0.1 - 0.05),
      profitPercentage: Math.random() * 0.1 - 0.05, // 模拟收益率
      weight: 0.05, // 模拟权重
    }

    holdings.value.push(newPosition)
  }

  positionDialogVisible.value = false
}

// 导入持仓
function importPositions() {
  // 在实际实现中，这将打开文件选择器并导入持仓
  console.log('导入持仓')
}

// 导出持仓
function exportPositions() {
  // 在实际实现中，这将导出持仓到文件
  console.log('导出持仓')
}

// 添加交易
function addTransaction() {
  isEditingTransaction.value = false
  transactionForm.value = {
    id: null,
    symbol: '',
    name: '',
    type: 'buy',
    quantity: 0,
    price: 0,
    date: new Date().toISOString().split('T')[0],
    fees: 0,
    notes: '',
  }
  transactionDialogVisible.value = true
}

// 编辑交易
function editTransaction(transaction: any) {
  isEditingTransaction.value = true
  transactionForm.value = {
    id: transaction.id,
    symbol: transaction.symbol,
    name: transaction.name,
    type: transaction.type,
    quantity: transaction.quantity,
    price: transaction.price,
    date: transaction.date,
    fees: transaction.fees,
    notes: transaction.notes || '',
  }
  transactionDialogVisible.value = true
}

// 保存交易
function saveTransaction() {
  // 在实际实现中，这将调用API保存交易
  // 这里简单地更新列表
  if (isEditingTransaction.value) {
    const index = transactions.value.findIndex((t) => t.id === transactionForm.value.id)
    if (index !== -1) {
      transactions.value[index] = {
        ...transactionForm.value,
      }
    }
  } else {
    // 添加新交易
    const newTransaction = {
      id: Date.now(), // 临时ID
      ...transactionForm.value,
    }

    transactions.value.push(newTransaction)
  }

  transactionDialogVisible.value = false
}

// 导入交易
function importTransactions() {
  // 在实际实现中，这将打开文件选择器并导入交易
  console.log('导入交易')
}

// 导出交易
function exportTransactions() {
  // 在实际实现中，这将导出交易到文件
  console.log('导出交易')
}

// 创建新投资组合
function createNewPortfolio() {
  portfolioForm.value = {
    name: '',
    description: '',
    benchmark: 'CSI300',
    currency: 'CNY',
  }
  portfolioDialogVisible.value = true
}

// 保存新投资组合
function saveNewPortfolio() {
  // 在实际实现中，这将调用API创建新投资组合
  // 这里简单地添加到列表
  const newPortfolio = {
    id: Date.now(), // 临时ID
    name: portfolioForm.value.name,
  }

  portfolios.value.push(newPortfolio)
  selectedPortfolio.value = newPortfolio.id

  // 初始化新投资组合的设置
  portfolioSettings.value = {
    name: portfolioForm.value.name,
    description: portfolioForm.value.description,
    benchmark: portfolioForm.value.benchmark,
    currency: portfolioForm.value.currency,
    riskLevel: 5,
  }

  // 清空持仓和交易记录
  holdings.value = []
  transactions.value = []

  portfolioDialogVisible.value = false
}

// 保存投资组合设置
function savePortfolioSettings() {
  // 在实际实现中，这将调用API保存投资组合设置
  // 这里简单地更新本地数据
  const index = portfolios.value.findIndex((p) => p.id === selectedPortfolio.value)
  if (index !== -1) {
    portfolios.value[index].name = portfolioSettings.value.name
  }

  console.log('保存投资组合设置:', portfolioSettings.value)
}

// 删除投资组合
function deletePortfolio() {
  // 在实际实现中，这将调用API删除投资组合
  // 这里简单地从列表中移除
  portfolios.value = portfolios.value.filter((p) => p.id !== selectedPortfolio.value)

  // 如果还有其他投资组合，选择第一个
  if (portfolios.value.length > 0) {
    selectedPortfolio.value = portfolios.value[0].id
    loadPortfolio()
  } else {
    selectedPortfolio.value = null
  }
}

// 格式化货币
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(value)
}

// 格式化百分比
function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

// 获取变化类名
function getChangeClass(value: number): string {
  return value > 0 ? 'positive' : value < 0 ? 'negative' : ''
}
</script>

<style scoped>
.enhanced-portfolio-management {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 16px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 32px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h2 {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 500;
}

.empty-state p {
  margin: 0 0 24px;
  color: #606266;
  text-align: center;
  max-width: 400px;
}

.portfolio-content {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.portfolio-tabs {
  padding: 16px;
}

.portfolio-overview {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.portfolio-summary {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.summary-card {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 16px;
  text-align: center;
}

.card-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.card-value {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 8px;
}

.card-change {
  font-size: 16px;
  font-weight: 500;
}

.card-subtitle {
  font-size: 12px;
  color: #909399;
}

.chart-section {
  margin-bottom: 24px;
}

.holdings-section,
.transactions-section {
  margin-bottom: 24px;
}

.holdings-section h3,
.transactions-section h3 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 500;
}

.table-actions {
  margin-top: 16px;
  display: flex;
  gap: 16px;
}

.portfolio-settings {
  padding: 16px;
}

.portfolio-settings h3 {
  margin-top: 0;
  margin-bottom: 24px;
  font-size: 18px;
  font-weight: 500;
}

.positive {
  color: #67c23a;
}

.negative {
  color: #f56c6c;
}

.buy-type {
  color: #67c23a;
}

.sell-type {
  color: #f56c6c;
}

@media (max-width: 768px) {
  .portfolio-summary {
    grid-template-columns: 1fr;
  }

  .header-actions {
    flex-direction: column;
  }
}
</style>
