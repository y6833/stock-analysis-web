<template>
  <div class="dynamic-position-adjuster">
    <div class="adjuster-header">
      <h3>动态仓位调整</h3>
      <p class="subtitle">基于波动率和风险指标的智能仓位管理</p>
    </div>

    <div class="adjuster-content">
      <!-- 当前投资组合状态 -->
      <div class="portfolio-status">
        <h4>投资组合状态</h4>
        <div class="status-grid">
          <div class="status-card">
            <div class="status-label">总资产</div>
            <div class="status-value">{{ formatCurrency(portfolioData.totalValue) }}</div>
          </div>
          <div class="status-card">
            <div class="status-label">现金</div>
            <div class="status-value">{{ formatCurrency(portfolioData.cash) }}</div>
          </div>
          <div class="status-card">
            <div class="status-label">市值</div>
            <div class="status-value">{{ formatCurrency(portfolioData.marketValue) }}</div>
          </div>
          <div class="status-card">
            <div class="status-label">组合波动率</div>
            <div class="status-value" :class="getVolatilityClass(portfolioData.portfolioVolatility)">
              {{ (portfolioData.portfolioVolatility * 100).toFixed(2) }}%
            </div>
          </div>
          <div class="status-card">
            <div class="status-label">夏普比率</div>
            <div class="status-value" :class="getSharpeClass(portfolioData.sharpeRatio)">
              {{ portfolioData.sharpeRatio.toFixed(3) }}
            </div>
          </div>
          <div class="status-card">
            <div class="status-label">最大回撤</div>
            <div class="status-value negative">
              {{ (portfolioData.maxDrawdown * 100).toFixed(2) }}%
            </div>
          </div>
        </div>
      </div>

      <!-- 调整参数设置 -->
      <div class="params-section">
        <h4>调整参数</h4>
        <div class="params-tabs">
          <button 
            v-for="tab in paramTabs" 
            :key="tab.id"
            class="tab-btn"
            :class="{ active: activeParamTab === tab.id }"
            @click="activeParamTab = tab.id"
          >
            {{ tab.name }}
          </button>
        </div>

        <!-- 波动率目标参数 -->
        <div v-show="activeParamTab === 'volatility'" class="param-panel">
          <div class="param-grid">
            <div class="param-group">
              <label>目标波动率 (%)</label>
              <input 
                v-model.number="volatilityParams.targetVolatility" 
                type="number"
                class="form-control"
                step="0.1"
                min="5"
                max="50"
              />
            </div>
            <div class="param-group">
              <label>再平衡阈值 (%)</label>
              <input 
                v-model.number="volatilityParams.rebalanceThreshold" 
                type="number"
                class="form-control"
                step="0.01"
                min="0.01"
                max="0.5"
              />
            </div>
            <div class="param-group">
              <label>最大单仓权重 (%)</label>
              <input 
                v-model.number="volatilityParams.maxPositionWeight" 
                type="number"
                class="form-control"
                step="1"
                min="10"
                max="100"
              />
            </div>
            <div class="param-group">
              <label>最小单仓权重 (%)</label>
              <input 
                v-model.number="volatilityParams.minPositionWeight" 
                type="number"
                class="form-control"
                step="0.1"
                min="0"
                max="20"
              />
            </div>
          </div>
        </div>

        <!-- 风险控制参数 -->
        <div v-show="activeParamTab === 'risk'" class="param-panel">
          <div class="param-grid">
            <div class="param-group">
              <label>最大回撤限制 (%)</label>
              <input 
                v-model.number="riskParams.maxDrawdown" 
                type="number"
                class="form-control"
                step="1"
                min="5"
                max="50"
              />
            </div>
            <div class="param-group">
              <label>止损百分比 (%)</label>
              <input 
                v-model.number="riskParams.stopLossPercent" 
                type="number"
                class="form-control"
                step="1"
                min="3"
                max="30"
              />
            </div>
            <div class="param-group">
              <label>止盈百分比 (%)</label>
              <input 
                v-model.number="riskParams.takeProfitPercent" 
                type="number"
                class="form-control"
                step="1"
                min="5"
                max="100"
              />
            </div>
            <div class="param-group">
              <label>集中度限制 (%)</label>
              <input 
                v-model.number="riskParams.concentrationLimit" 
                type="number"
                class="form-control"
                step="1"
                min="10"
                max="50"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 市场环境设置 -->
      <div class="market-regime-section">
        <h4>市场环境</h4>
        <div class="regime-grid">
          <div class="regime-group">
            <label>波动率水平</label>
            <select v-model="marketRegime.volatilityLevel" class="form-control">
              <option value="low">低波动</option>
              <option value="medium">中等波动</option>
              <option value="high">高波动</option>
              <option value="extreme">极端波动</option>
            </select>
          </div>
          <div class="regime-group">
            <label>趋势方向</label>
            <select v-model="marketRegime.trendDirection" class="form-control">
              <option value="bull">牛市</option>
              <option value="sideways">震荡</option>
              <option value="bear">熊市</option>
            </select>
          </div>
          <div class="regime-group">
            <label>相关性水平</label>
            <select v-model="marketRegime.correlationLevel" class="form-control">
              <option value="low">低相关</option>
              <option value="medium">中等相关</option>
              <option value="high">高相关</option>
            </select>
          </div>
          <div class="regime-group">
            <label>流动性状况</label>
            <select v-model="marketRegime.liquidityCondition" class="form-control">
              <option value="normal">正常</option>
              <option value="stressed">紧张</option>
              <option value="crisis">危机</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-section">
        <button 
          class="btn btn-primary"
          @click="calculateAdjustments"
          :disabled="isCalculating"
        >
          <span v-if="isCalculating" class="loading-spinner"></span>
          {{ isCalculating ? '计算中...' : '计算调整建议' }}
        </button>
        
        <button 
          class="btn btn-secondary"
          @click="loadSamplePortfolio"
        >
          加载示例组合
        </button>
        
        <button 
          class="btn btn-outline"
          @click="resetParams"
        >
          重置参数
        </button>
      </div>

      <!-- 调整建议结果 -->
      <div v-if="adjustmentSignals.length > 0" class="results-section">
        <h4>调整建议</h4>
        
        <div class="signals-summary">
          <div class="summary-item">
            <span class="summary-label">总建议数:</span>
            <span class="summary-value">{{ adjustmentSignals.length }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">紧急调整:</span>
            <span class="summary-value critical">{{ criticalSignals.length }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">高优先级:</span>
            <span class="summary-value high">{{ highPrioritySignals.length }}</span>
          </div>
        </div>

        <div class="signals-list">
          <div 
            v-for="signal in adjustmentSignals" 
            :key="signal.symbol"
            class="signal-card"
            :class="signal.urgency"
          >
            <div class="signal-header">
              <div class="signal-symbol">{{ signal.symbol }}</div>
              <div class="signal-urgency" :class="signal.urgency">
                {{ getUrgencyText(signal.urgency) }}
              </div>
            </div>
            
            <div class="signal-content">
              <div class="signal-action">
                <span class="action-label">操作:</span>
                <span class="action-value" :class="signal.action">
                  {{ getActionText(signal.action) }}
                </span>
              </div>
              
              <div class="signal-details">
                <div class="detail-row">
                  <span>当前权重: {{ (signal.currentWeight * 100).toFixed(2) }}%</span>
                  <span>目标权重: {{ (signal.targetWeight * 100).toFixed(2) }}%</span>
                </div>
                <div class="detail-row">
                  <span>当前数量: {{ signal.currentQuantity.toLocaleString() }}</span>
                  <span>目标数量: {{ signal.targetQuantity.toLocaleString() }}</span>
                </div>
                <div class="detail-row">
                  <span>预期影响: {{ (signal.expectedImpact * 100).toFixed(2) }}%</span>
                  <span>置信度: {{ (signal.confidence * 100).toFixed(1) }}%</span>
                </div>
              </div>
              
              <div class="signal-reason">
                <strong>调整原因:</strong> {{ signal.reason }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!isCalculating" class="empty-state">
        <div class="empty-icon">🎯</div>
        <h3>动态仓位调整</h3>
        <p>设置参数并点击"计算调整建议"开始智能仓位管理</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { 
  DynamicPositionManager,
  type PortfolioData,
  type VolatilityTargetParams,
  type RiskControlParams,
  type MarketRegime,
  type AdjustmentSignal
} from '@/services/position/DynamicPositionManager'
import { useToast } from '@/composables/useToast'

const { showToast } = useToast()

// 状态
const isCalculating = ref(false)
const activeParamTab = ref('volatility')
const adjustmentSignals = ref<AdjustmentSignal[]>([])

// 参数标签
const paramTabs = [
  { id: 'volatility', name: '波动率目标' },
  { id: 'risk', name: '风险控制' }
]

// 示例投资组合数据
const portfolioData = reactive<PortfolioData>({
  totalValue: 1000000,
  cash: 200000,
  marketValue: 800000,
  portfolioVolatility: 0.18,
  portfolioBeta: 1.2,
  sharpeRatio: 0.85,
  maxDrawdown: 0.12,
  dailyReturn: 0.008,
  positions: [
    {
      symbol: '000001',
      quantity: 10000,
      averagePrice: 12.5,
      currentPrice: 13.2,
      marketValue: 132000,
      weight: 0.132,
      unrealizedPnL: 7000,
      unrealizedPnLPercent: 0.056,
      volatility: 0.25,
      beta: 1.1,
      lastUpdateTime: new Date().toISOString()
    },
    {
      symbol: '600036',
      quantity: 5000,
      averagePrice: 35.8,
      currentPrice: 38.5,
      marketValue: 192500,
      weight: 0.193,
      unrealizedPnL: 13500,
      unrealizedPnLPercent: 0.075,
      volatility: 0.22,
      beta: 0.9,
      lastUpdateTime: new Date().toISOString()
    },
    {
      symbol: '600519',
      quantity: 200,
      averagePrice: 1680.0,
      currentPrice: 1750.0,
      marketValue: 350000,
      weight: 0.35,
      unrealizedPnL: 14000,
      unrealizedPnLPercent: 0.042,
      volatility: 0.35,
      beta: 1.5,
      lastUpdateTime: new Date().toISOString()
    }
  ]
})

// 波动率目标参数
const volatilityParams = reactive<VolatilityTargetParams>({
  targetVolatility: 15.0,
  lookbackPeriod: 252,
  rebalanceThreshold: 0.05,
  maxPositionWeight: 40.0,
  minPositionWeight: 5.0,
  volatilityFloor: 8.0,
  volatilityCeiling: 30.0
})

// 风险控制参数
const riskParams = reactive<RiskControlParams>({
  maxDrawdown: 20.0,
  stopLossPercent: 10.0,
  takeProfitPercent: 25.0,
  correlationThreshold: 0.7,
  concentrationLimit: 35.0,
  leverageLimit: 1.5
})

// 市场环境
const marketRegime = reactive<MarketRegime>({
  volatilityLevel: 'medium',
  trendDirection: 'sideways',
  correlationLevel: 'medium',
  liquidityCondition: 'normal'
})

// 计算属性
const criticalSignals = computed(() => 
  adjustmentSignals.value.filter(s => s.urgency === 'critical')
)

const highPrioritySignals = computed(() => 
  adjustmentSignals.value.filter(s => s.urgency === 'high')
)

// 计算调整建议
const calculateAdjustments = async () => {
  isCalculating.value = true
  
  try {
    // 转换参数格式
    const volParams = {
      ...volatilityParams,
      targetVolatility: volatilityParams.targetVolatility / 100,
      maxPositionWeight: volatilityParams.maxPositionWeight / 100,
      minPositionWeight: volatilityParams.minPositionWeight / 100,
      volatilityFloor: volatilityParams.volatilityFloor / 100,
      volatilityCeiling: volatilityParams.volatilityCeiling / 100
    }
    
    const riskControlParams = {
      ...riskParams,
      maxDrawdown: riskParams.maxDrawdown / 100,
      stopLossPercent: riskParams.stopLossPercent / 100,
      takeProfitPercent: riskParams.takeProfitPercent / 100,
      concentrationLimit: riskParams.concentrationLimit / 100
    }

    // 创建动态仓位管理器
    const manager = new DynamicPositionManager(volParams, riskControlParams)
    
    // 计算调整信号
    adjustmentSignals.value = manager.calculateAdjustmentSignals(portfolioData, marketRegime)
    
    if (adjustmentSignals.value.length > 0) {
      showToast(`生成了 ${adjustmentSignals.value.length} 个调整建议`, 'success')
    } else {
      showToast('当前投资组合无需调整', 'info')
    }
    
  } catch (error: any) {
    showToast('计算失败: ' + error.message, 'error')
    console.error('Dynamic position adjustment failed:', error)
  } finally {
    isCalculating.value = false
  }
}

// 加载示例投资组合
const loadSamplePortfolio = () => {
  // 重新计算权重确保一致性
  const totalMarketValue = portfolioData.positions.reduce((sum, pos) => sum + pos.marketValue, 0)
  portfolioData.positions.forEach(pos => {
    pos.weight = pos.marketValue / portfolioData.totalValue
  })
  
  showToast('示例投资组合已加载')
}

// 重置参数
const resetParams = () => {
  volatilityParams.targetVolatility = 15.0
  volatilityParams.rebalanceThreshold = 0.05
  volatilityParams.maxPositionWeight = 40.0
  volatilityParams.minPositionWeight = 5.0
  
  riskParams.maxDrawdown = 20.0
  riskParams.stopLossPercent = 10.0
  riskParams.takeProfitPercent = 25.0
  riskParams.concentrationLimit = 35.0
  
  marketRegime.volatilityLevel = 'medium'
  marketRegime.trendDirection = 'sideways'
  marketRegime.correlationLevel = 'medium'
  marketRegime.liquidityCondition = 'normal'
  
  adjustmentSignals.value = []
  showToast('参数已重置')
}

// 工具函数
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

const getVolatilityClass = (vol: number) => {
  if (vol > 0.25) return 'high-risk'
  if (vol > 0.15) return 'medium-risk'
  return 'low-risk'
}

const getSharpeClass = (sharpe: number) => {
  if (sharpe >= 1.0) return 'excellent'
  if (sharpe >= 0.5) return 'good'
  return 'fair'
}

const getUrgencyText = (urgency: string) => {
  const texts = {
    critical: '紧急',
    high: '高',
    medium: '中',
    low: '低'
  }
  return texts[urgency as keyof typeof texts] || urgency
}

const getActionText = (action: string) => {
  const texts = {
    buy: '买入',
    sell: '卖出',
    hold: '持有',
    close: '清仓'
  }
  return texts[action as keyof typeof texts] || action
}
</script>

<style scoped>
.dynamic-position-adjuster {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.adjuster-header {
  text-align: center;
  margin-bottom: 30px;
}

.adjuster-header h3 {
  color: #1890ff;
  margin-bottom: 10px;
}

.subtitle {
  color: #666;
  font-size: 14px;
}

.adjuster-content {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.portfolio-status {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.portfolio-status h4 {
  color: #333;
  margin-bottom: 20px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.status-card {
  background: #f9f9f9;
  border-radius: 6px;
  padding: 15px;
  text-align: center;
}

.status-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.status-value {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.status-value.negative { color: #ff4d4f; }
.status-value.high-risk { color: #ff4d4f; }
.status-value.medium-risk { color: #faad14; }
.status-value.low-risk { color: #52c41a; }
.status-value.excellent { color: #1890ff; }
.status-value.good { color: #52c41a; }
.status-value.fair { color: #faad14; }

.params-section {
  margin-bottom: 30px;
}

.params-section h4 {
  color: #333;
  margin-bottom: 15px;
}

.params-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.tab-btn {
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
}

.tab-btn.active {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.param-panel {
  background: #fafafa;
  border-radius: 6px;
  padding: 20px;
}

.param-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.param-group {
  display: flex;
  flex-direction: column;
}

.param-group label {
  font-weight: 500;
  margin-bottom: 5px;
  color: #333;
}

.form-control {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
}

.market-regime-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.market-regime-section h4 {
  color: #333;
  margin-bottom: 20px;
}

.regime-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.regime-group {
  display: flex;
  flex-direction: column;
}

.regime-group label {
  font-weight: 500;
  margin-bottom: 5px;
  color: #333;
}

.action-section {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-bottom: 30px;
  padding: 20px 0;
  border-bottom: 1px solid #f0f0f0;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #1890ff;
  color: white;
}

.btn-secondary {
  background: #52c41a;
  color: white;
}

.btn-outline {
  background: white;
  color: #1890ff;
  border: 1px solid #1890ff;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.results-section {
  margin-top: 20px;
}

.results-section h4 {
  color: #333;
  margin-bottom: 20px;
}

.signals-summary {
  display: flex;
  gap: 30px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f0f9ff;
  border-radius: 6px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.summary-label {
  font-size: 12px;
  color: #666;
}

.summary-value {
  font-size: 18px;
  font-weight: bold;
}

.summary-value.critical { color: #ff4d4f; }
.summary-value.high { color: #faad14; }

.signals-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.signal-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid #d9d9d9;
}

.signal-card.critical {
  border-left-color: #ff4d4f;
  background: #fff2f0;
}

.signal-card.high {
  border-left-color: #faad14;
  background: #fffbe6;
}

.signal-card.medium {
  border-left-color: #1890ff;
  background: #f0f9ff;
}

.signal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.signal-symbol {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.signal-urgency {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.signal-urgency.critical {
  background: #ff4d4f;
  color: white;
}

.signal-urgency.high {
  background: #faad14;
  color: white;
}

.signal-urgency.medium {
  background: #1890ff;
  color: white;
}

.signal-action {
  margin-bottom: 10px;
}

.action-label {
  color: #666;
  margin-right: 8px;
}

.action-value {
  font-weight: bold;
}

.action-value.buy { color: #52c41a; }
.action-value.sell { color: #ff4d4f; }
.action-value.close { color: #ff4d4f; }

.signal-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 10px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #666;
}

.signal-reason {
  font-size: 14px;
  color: #333;
  background: white;
  padding: 10px;
  border-radius: 4px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 300px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h3 {
  color: #333;
  margin-bottom: 10px;
}

.empty-state p {
  color: #666;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .status-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .param-grid,
  .regime-grid {
    grid-template-columns: 1fr;
  }
  
  .action-section {
    flex-direction: column;
  }
  
  .signals-summary {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
