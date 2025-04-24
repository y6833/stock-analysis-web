<script setup lang="ts">
import { ref, computed } from 'vue'
import { exportService, type ExportFormat } from '@/services/exportService'
import type { Stock, StockData } from '@/types/stock'
import type { BacktestResult } from '@/types/backtest'

const props = defineProps<{
  type: 'stock' | 'backtest' | 'portfolio'
  data: any
  stock?: Stock
  stockData?: StockData
  backtestResult?: BacktestResult
  portfolio?: any
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// 选择的导出格式
const selectedFormat = ref<ExportFormat>('excel')

// 是否正在导出
const isExporting = ref(false)

// 导出格式选项
const formatOptions = [
  { value: 'csv', label: 'CSV文件', icon: '📄', description: '逗号分隔的文本文件，可用Excel打开' },
  { value: 'excel', label: 'Excel文件', icon: '📊', description: 'Microsoft Excel电子表格文件' },
  { value: 'pdf', label: 'PDF文件', icon: '📑', description: '便携式文档格式，适合打印和分享' }
]

// 导出类型标题
const exportTypeTitle = computed(() => {
  switch (props.type) {
    case 'stock': return '股票数据导出'
    case 'backtest': return '回测结果导出'
    case 'portfolio': return '投资组合导出'
    default: return '数据导出'
  }
})

// 导出类型描述
const exportTypeDescription = computed(() => {
  switch (props.type) {
    case 'stock': return '导出股票历史数据和基本信息'
    case 'backtest': return '导出回测结果、交易记录和绩效指标'
    case 'portfolio': return '导出投资组合持仓和绩效数据'
    default: return '导出数据'
  }
})

// 导出数据
const exportData = async () => {
  if (isExporting.value) return
  
  isExporting.value = true
  
  try {
    switch (props.type) {
      case 'stock':
        if (props.stock && props.stockData) {
          exportService.exportStockData(props.stock, props.stockData, selectedFormat.value)
        }
        break
      case 'backtest':
        if (props.backtestResult) {
          exportService.exportBacktestResult(props.backtestResult, selectedFormat.value)
        }
        break
      case 'portfolio':
        if (props.portfolio) {
          exportService.exportPortfolio(props.portfolio, selectedFormat.value)
        }
        break
    }
  } catch (error) {
    console.error('导出数据失败:', error)
  } finally {
    isExporting.value = false
  }
}

// 关闭面板
const closePanel = () => {
  emit('close')
}
</script>

<template>
  <div class="export-panel">
    <div class="export-panel-header">
      <h2>{{ exportTypeTitle }}</h2>
      <button class="btn-icon-only" @click="closePanel">
        <span>✖</span>
      </button>
    </div>
    
    <div class="export-panel-content">
      <p class="export-description">{{ exportTypeDescription }}</p>
      
      <div class="format-selection">
        <h3>选择导出格式</h3>
        
        <div class="format-options">
          <div 
            v-for="option in formatOptions" 
            :key="option.value"
            class="format-option"
            :class="{ active: selectedFormat === option.value }"
            @click="selectedFormat = option.value as ExportFormat"
          >
            <div class="format-icon">{{ option.icon }}</div>
            <div class="format-info">
              <div class="format-label">{{ option.label }}</div>
              <div class="format-description">{{ option.description }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="export-preview">
        <h3>导出预览</h3>
        
        <div class="preview-content">
          <!-- 股票数据预览 -->
          <div v-if="type === 'stock' && stock" class="preview-stock">
            <div class="preview-header">
              <div class="stock-name">{{ stock.name }} ({{ stock.symbol }})</div>
              <div class="stock-market">{{ stock.market }}</div>
            </div>
            
            <div class="preview-table">
              <table>
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>开盘价</th>
                    <th>最高价</th>
                    <th>最低价</th>
                    <th>收盘价</th>
                    <th>成交量</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(date, index) in stockData?.dates.slice(0, 5)" :key="date">
                    <td>{{ date }}</td>
                    <td>{{ stockData?.prices[index] }}</td>
                    <td>{{ stockData?.high }}</td>
                    <td>{{ stockData?.low }}</td>
                    <td>{{ stockData?.close }}</td>
                    <td>{{ stockData?.volumes[index] }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- 回测结果预览 -->
          <div v-else-if="type === 'backtest' && backtestResult" class="preview-backtest">
            <div class="preview-header">
              <div class="backtest-title">回测结果: {{ backtestResult.params.symbol }}</div>
              <div class="backtest-strategy">策略: {{ backtestResult.params.strategyType }}</div>
            </div>
            
            <div class="preview-metrics">
              <div class="metric-item">
                <div class="metric-label">总回报率</div>
                <div class="metric-value">{{ (backtestResult.performance.totalReturn * 100).toFixed(2) }}%</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">最大回撤</div>
                <div class="metric-value">{{ (backtestResult.performance.maxDrawdown * 100).toFixed(2) }}%</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">夏普比率</div>
                <div class="metric-value">{{ backtestResult.performance.sharpeRatio.toFixed(2) }}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">交易次数</div>
                <div class="metric-value">{{ backtestResult.performance.totalTrades }}</div>
              </div>
            </div>
            
            <div class="preview-table">
              <table>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>方向</th>
                    <th>价格</th>
                    <th>数量</th>
                    <th>金额</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="trade in backtestResult.trades.slice(0, 5)" :key="trade.id">
                    <td>{{ new Date(trade.timestamp).toLocaleDateString() }}</td>
                    <td>{{ trade.direction === 'buy' ? '买入' : '卖出' }}</td>
                    <td>{{ trade.price }}</td>
                    <td>{{ trade.quantity }}</td>
                    <td>{{ trade.amount }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- 投资组合预览 -->
          <div v-else-if="type === 'portfolio' && portfolio" class="preview-portfolio">
            <div class="preview-header">
              <div class="portfolio-title">投资组合</div>
              <div class="portfolio-summary">
                总资产: {{ portfolio.totalAssets }} | 现金: {{ portfolio.cash }}
              </div>
            </div>
            
            <div class="preview-table">
              <table>
                <thead>
                  <tr>
                    <th>代码</th>
                    <th>名称</th>
                    <th>持仓数量</th>
                    <th>成本价</th>
                    <th>现价</th>
                    <th>市值</th>
                    <th>盈亏比例</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="position in portfolio.positions.slice(0, 5)" :key="position.symbol">
                    <td>{{ position.symbol }}</td>
                    <td>{{ position.name }}</td>
                    <td>{{ position.quantity }}</td>
                    <td>{{ position.averageCost }}</td>
                    <td>{{ position.currentPrice }}</td>
                    <td>{{ position.marketValue }}</td>
                    <td :class="position.unrealizedPnLPercent >= 0 ? 'profit' : 'loss'">
                      {{ (position.unrealizedPnLPercent * 100).toFixed(2) }}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- 默认预览 -->
          <div v-else class="preview-empty">
            <p>无可预览数据</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="export-panel-footer">
      <button 
        class="btn btn-primary" 
        @click="exportData"
        :disabled="isExporting"
      >
        <span v-if="!isExporting">导出数据</span>
        <span v-else class="loading-spinner-small"></span>
      </button>
      <button class="btn btn-outline" @click="closePanel">取消</button>
    </div>
  </div>
</template>

<style scoped>
.export-panel {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
}

.export-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-light);
}

.export-panel-header h2 {
  font-size: var(--font-size-lg);
  color: var(--primary-color);
  margin: 0;
  font-weight: 600;
}

.export-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.export-description {
  color: var(--text-secondary);
  margin: 0;
}

.format-selection h3,
.export-preview h3 {
  font-size: var(--font-size-md);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-md) 0;
  font-weight: 600;
}

.format-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.format-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.format-option:hover {
  background-color: var(--bg-tertiary);
}

.format-option.active {
  border-color: var(--primary-color);
  background-color: var(--primary-light);
}

.format-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
}

.format-info {
  flex: 1;
}

.format-label {
  font-weight: 500;
  color: var(--text-primary);
}

.format-description {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: var(--spacing-xs);
}

.preview-content {
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
}

.preview-header {
  margin-bottom: var(--spacing-md);
}

.stock-name,
.backtest-title,
.portfolio-title {
  font-weight: 600;
  font-size: var(--font-size-md);
}

.stock-market,
.backtest-strategy,
.portfolio-summary {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: var(--spacing-xs);
}

.preview-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.metric-item {
  background-color: var(--bg-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-sm);
  min-width: 120px;
}

.metric-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.metric-value {
  font-weight: 600;
  margin-top: var(--spacing-xs);
}

.preview-table {
  overflow-x: auto;
}

.preview-table table {
  width: 100%;
  border-collapse: collapse;
}

.preview-table th,
.preview-table td {
  padding: var(--spacing-xs) var(--spacing-sm);
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}

.preview-table th {
  font-weight: 600;
  color: var(--text-secondary);
  background-color: var(--bg-tertiary);
}

.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-secondary);
}

.profit {
  color: var(--stock-up);
}

.loss {
  color: var(--stock-down);
}

.export-panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-light);
}

.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 2px solid #fff;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .export-panel {
    width: 95%;
    max-height: 95vh;
  }
  
  .format-options {
    flex-direction: column;
  }
  
  .preview-metrics {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .metric-item {
    min-width: auto;
  }
}
</style>
