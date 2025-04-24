<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import ExportPanel from '@/components/export/ExportPanel.vue'
import ReportGenerator from '@/components/export/ReportGenerator.vue'
import { stockService } from '@/services/stockService'
import type { Stock, StockData } from '@/types/stock'

const route = useRoute()

// 当前股票
const currentStock = ref<Stock | null>(null)
// 股票数据
const stockData = ref<StockData | null>(null)
// 是否正在加载
const isLoading = ref(true)
// 是否显示导出面板
const showExportPanel = ref(false)
// 是否显示报告生成器
const showReportGenerator = ref(false)
// 导出类型
const exportType = ref<'stock' | 'backtest' | 'portfolio'>('stock')
// 模拟投资组合数据
const portfolioData = ref<any>(null)

// 页面标题
const pageTitle = computed(() => {
  return currentStock.value
    ? `${currentStock.value.name} (${currentStock.value.symbol}) - 数据导出与报告`
    : '数据导出与报告'
})

// 初始化
onMounted(async () => {
  try {
    // 获取路由参数中的股票代码
    const symbol = route.query.symbol as string

    if (symbol) {
      // 获取股票信息
      const stock = await stockService.getStockBySymbol(symbol)
      currentStock.value = stock

      // 获取股票数据
      const data = await stockService.getStockData(symbol)
      stockData.value = data
    }

    // 生成模拟投资组合数据
    generateMockPortfolioData()
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    isLoading.value = false
  }
})

// 生成模拟投资组合数据
const generateMockPortfolioData = () => {
  portfolioData.value = {
    totalAssets: 1250000,
    cash: 350000,
    marketValue: 900000,
    totalReturn: 0.15,
    positions: [
      {
        symbol: '600000.SH',
        name: '浦发银行',
        quantity: 10000,
        averageCost: 10.25,
        currentPrice: 11.35,
        marketValue: 113500,
        unrealizedPnL: 11000,
        unrealizedPnLPercent: 0.107,
        realizedPnL: 5000,
        totalPnL: 16000,
        totalPnLPercent: 0.156,
        openDate: '2023-01-15',
      },
      {
        symbol: '601318.SH',
        name: '中国平安',
        quantity: 2000,
        averageCost: 48.75,
        currentPrice: 52.3,
        marketValue: 104600,
        unrealizedPnL: 7100,
        unrealizedPnLPercent: 0.073,
        realizedPnL: 3500,
        totalPnL: 10600,
        totalPnLPercent: 0.109,
        openDate: '2023-02-10',
      },
      {
        symbol: '000001.SZ',
        name: '平安银行',
        quantity: 15000,
        averageCost: 15.2,
        currentPrice: 16.85,
        marketValue: 252750,
        unrealizedPnL: 24750,
        unrealizedPnLPercent: 0.108,
        realizedPnL: 8500,
        totalPnL: 33250,
        totalPnLPercent: 0.145,
        openDate: '2023-01-05',
      },
      {
        symbol: '000858.SZ',
        name: '五粮液',
        quantity: 1000,
        averageCost: 175.5,
        currentPrice: 198.75,
        marketValue: 198750,
        unrealizedPnL: 23250,
        unrealizedPnLPercent: 0.132,
        realizedPnL: 12000,
        totalPnL: 35250,
        totalPnLPercent: 0.201,
        openDate: '2022-12-20',
      },
      {
        symbol: '600519.SH',
        name: '贵州茅台',
        quantity: 200,
        averageCost: 1150.25,
        currentPrice: 1152.0,
        marketValue: 230400,
        unrealizedPnL: 350,
        unrealizedPnLPercent: 0.002,
        realizedPnL: 15000,
        totalPnL: 15350,
        totalPnLPercent: 0.067,
        openDate: '2022-11-15',
      },
    ],
  }
}

// 打开导出面板
const openExportPanel = (type: 'stock' | 'backtest' | 'portfolio') => {
  exportType.value = type
  showExportPanel.value = true
}

// 打开报告生成器
const openReportGenerator = () => {
  showReportGenerator.value = true
}

// 关闭导出面板
const closeExportPanel = () => {
  showExportPanel.value = false
}

// 关闭报告生成器
const closeReportGenerator = () => {
  showReportGenerator.value = false
}
</script>

<template>
  <div class="export-view">
    <div class="page-header">
      <h1>{{ pageTitle }}</h1>
      <p class="page-description">导出数据和生成分析报告</p>
    </div>

    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载数据中...</p>
    </div>

    <div v-else class="export-content">
      <div class="export-options">
        <div class="export-card">
          <div class="card-header">
            <h2>股票数据导出</h2>
          </div>
          <div class="card-content">
            <p>导出股票历史数据和基本信息，支持CSV、Excel和PDF格式。</p>

            <div v-if="!currentStock" class="no-stock-selected">
              <p>未选择股票，请先前往股票分析页面选择一个股票。</p>
              <router-link to="/stock" class="btn btn-primary"> 前往股票分析页面 </router-link>
            </div>

            <div v-else class="stock-info">
              <div class="stock-name">{{ currentStock.name }} ({{ currentStock.symbol }})</div>
              <div class="stock-market">
                {{ currentStock.market }} | {{ currentStock.industry }}
              </div>
            </div>
          </div>
          <div class="card-footer">
            <button
              class="btn btn-primary"
              @click="openExportPanel('stock')"
              :disabled="!currentStock"
            >
              导出股票数据
            </button>
          </div>
        </div>

        <div class="export-card">
          <div class="card-header">
            <h2>投资组合导出</h2>
          </div>
          <div class="card-content">
            <p>导出您的投资组合持仓和绩效数据，支持CSV、Excel和PDF格式。</p>

            <div class="portfolio-summary">
              <div class="summary-item">
                <div class="summary-label">总资产</div>
                <div class="summary-value">{{ portfolioData?.totalAssets.toLocaleString() }}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">持仓市值</div>
                <div class="summary-value">{{ portfolioData?.marketValue.toLocaleString() }}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">总收益率</div>
                <div class="summary-value">
                  {{ (portfolioData?.totalReturn * 100).toFixed(2) }}%
                </div>
              </div>
            </div>
          </div>
          <div class="card-footer">
            <button class="btn btn-primary" @click="openExportPanel('portfolio')">
              导出投资组合
            </button>
          </div>
        </div>

        <div class="export-card">
          <div class="card-header">
            <h2>分析报告生成</h2>
          </div>
          <div class="card-content">
            <p>生成专业的股票分析报告，包含技术分析、基本面分析和投资建议。</p>

            <div v-if="!currentStock" class="no-stock-selected">
              <p>未选择股票，请先前往股票分析页面选择一个股票。</p>
              <router-link to="/stock" class="btn btn-primary"> 前往股票分析页面 </router-link>
            </div>

            <div v-else class="report-options">
              <div class="report-type">基础报告</div>
              <div class="report-type">综合报告</div>
              <div class="report-type">自定义报告</div>
            </div>
          </div>
          <div class="card-footer">
            <button class="btn btn-primary" @click="openReportGenerator" :disabled="!currentStock">
              生成分析报告
            </button>
          </div>
        </div>
      </div>

      <div class="export-history">
        <h2>导出历史</h2>

        <div class="history-empty">
          <p>暂无导出历史记录</p>
        </div>
      </div>
    </div>

    <!-- 导出面板 -->
    <ExportPanel
      v-if="showExportPanel"
      :type="exportType"
      :data="exportType === 'stock' ? stockData : portfolioData"
      :stock="currentStock"
      :stockData="stockData"
      :portfolio="portfolioData"
      @close="closeExportPanel"
    />

    <!-- 报告生成器 -->
    <ReportGenerator
      v-if="showReportGenerator && currentStock && stockData"
      :stock="currentStock"
      :stockData="stockData"
      :show="showReportGenerator"
      @close="closeReportGenerator"
    />
  </div>
</template>

<style scoped>
.export-view {
  padding: var(--spacing-lg);
}

.page-header {
  margin-bottom: var(--spacing-xl);
}

.page-header h1 {
  font-size: var(--font-size-xl);
  color: var(--primary-color);
  margin: 0 0 var(--spacing-xs) 0;
  font-weight: 600;
}

.page-description {
  color: var(--text-secondary);
  margin: 0;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  gap: var(--spacing-md);
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(66, 185, 131, 0.1);
  border-radius: 50%;
  border-top: 4px solid var(--accent-color);
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

.export-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.export-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.export-card {
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.card-header {
  padding: var(--spacing-md) var(--spacing-lg);
  background-color: var(--primary-color);
  color: white;
}

.card-header h2 {
  font-size: var(--font-size-md);
  margin: 0;
  font-weight: 600;
}

.card-content {
  flex: 1;
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.card-content p {
  margin: 0;
  color: var(--text-secondary);
}

.card-footer {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: flex-end;
}

.no-stock-selected {
  background-color: var(--bg-tertiary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  text-align: center;
  color: var(--text-secondary);
}

.stock-info {
  background-color: var(--bg-tertiary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
}

.stock-name {
  font-weight: 600;
  font-size: var(--font-size-md);
}

.stock-market {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: var(--spacing-xs);
}

.portfolio-summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.summary-item {
  background-color: var(--bg-tertiary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-md);
  min-width: 120px;
}

.summary-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.summary-value {
  font-weight: 600;
  margin-top: var(--spacing-xs);
}

.report-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.report-type {
  background-color: var(--bg-tertiary);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
}

.export-history {
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
}

.export-history h2 {
  font-size: var(--font-size-md);
  color: var(--primary-color);
  margin: 0 0 var(--spacing-md) 0;
  font-weight: 600;
}

.history-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: var(--text-secondary);
  background-color: var(--bg-tertiary);
  border-radius: var(--border-radius-md);
}

@media (max-width: 768px) {
  .export-options {
    grid-template-columns: 1fr;
  }

  .portfolio-summary {
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .summary-item {
    min-width: auto;
  }
}
</style>
