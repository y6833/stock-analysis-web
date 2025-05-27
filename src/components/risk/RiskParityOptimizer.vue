<template>
  <div class="risk-parity-optimizer">
    <div class="optimizer-header">
      <h3>风险平价模型</h3>
      <p class="subtitle">等风险贡献的投资组合优化</p>
    </div>

    <div class="optimizer-content">
      <!-- 资产配置区域 -->
      <div class="assets-section">
        <div class="section-header">
          <h4>资产配置</h4>
          <button class="btn btn-small" @click="addAsset">
            <span class="btn-icon">➕</span>
            添加资产
          </button>
        </div>

        <div class="assets-table">
          <table>
            <thead>
              <tr>
                <th>资产代码</th>
                <th>资产名称</th>
                <th>期望收益率(%)</th>
                <th>波动率(%)</th>
                <th>当前权重(%)</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(asset, index) in assets" :key="asset.symbol">
                <td>
                  <input 
                    v-model="asset.symbol" 
                    class="table-input"
                    placeholder="股票代码"
                    @blur="updateAssetInfo(index)"
                  />
                </td>
                <td>
                  <input 
                    v-model="asset.name" 
                    class="table-input"
                    placeholder="资产名称"
                  />
                </td>
                <td>
                  <input 
                    v-model.number="asset.expectedReturn" 
                    type="number"
                    class="table-input"
                    step="0.1"
                    min="-50"
                    max="100"
                  />
                </td>
                <td>
                  <input 
                    v-model.number="asset.volatility" 
                    type="number"
                    class="table-input"
                    step="0.1"
                    min="0"
                    max="200"
                  />
                </td>
                <td>
                  <input 
                    v-model.number="asset.weight" 
                    type="number"
                    class="table-input"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </td>
                <td>
                  <button 
                    class="btn btn-danger btn-small"
                    @click="removeAsset(index)"
                    :disabled="assets.length <= 2"
                  >
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 优化参数 -->
      <div class="params-section">
        <h4>优化参数</h4>
        
        <div class="params-grid">
          <div class="param-group">
            <label>目标波动率 (%)</label>
            <input 
              v-model.number="params.targetVolatility" 
              type="number"
              class="form-control"
              step="0.1"
              min="1"
              max="50"
            />
          </div>
          
          <div class="param-group">
            <label>无风险利率 (%)</label>
            <input 
              v-model.number="params.riskFreeRate" 
              type="number"
              class="form-control"
              step="0.1"
              min="0"
              max="10"
            />
          </div>
          
          <div class="param-group">
            <label>回望期 (天)</label>
            <input 
              v-model.number="params.lookbackPeriod" 
              type="number"
              class="form-control"
              min="30"
              max="1000"
            />
          </div>
          
          <div class="param-group">
            <label>再平衡频率</label>
            <select v-model="params.rebalanceFrequency" class="form-control">
              <option value="daily">每日</option>
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
              <option value="quarterly">每季度</option>
            </select>
          </div>
          
          <div class="param-group">
            <label>最大权重 (%)</label>
            <input 
              v-model.number="params.maxWeight" 
              type="number"
              class="form-control"
              step="1"
              min="10"
              max="100"
            />
          </div>
          
          <div class="param-group">
            <label>最小权重 (%)</label>
            <input 
              v-model.number="params.minWeight" 
              type="number"
              class="form-control"
              step="0.1"
              min="0"
              max="20"
            />
          </div>
        </div>
      </div>

      <!-- 优化按钮 -->
      <div class="action-section">
        <button 
          class="btn btn-primary"
          @click="optimizePortfolio"
          :disabled="!canOptimize || isOptimizing"
        >
          <span v-if="isOptimizing" class="loading-spinner"></span>
          {{ isOptimizing ? '优化中...' : '开始优化' }}
        </button>
        
        <button 
          class="btn btn-secondary"
          @click="loadSampleData"
        >
          加载示例数据
        </button>
        
        <button 
          class="btn btn-outline"
          @click="resetData"
        >
          重置数据
        </button>
      </div>

      <!-- 优化结果 -->
      <div v-if="result" class="result-section">
        <h4>优化结果</h4>
        
        <!-- 投资组合指标 -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">投资组合收益率</div>
            <div class="metric-value positive">
              {{ (result.portfolioReturn * 100).toFixed(2) }}%
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-label">投资组合波动率</div>
            <div class="metric-value">
              {{ (result.portfolioVolatility * 100).toFixed(2) }}%
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-label">夏普比率</div>
            <div class="metric-value" :class="getSharpeClass(result.sharpeRatio)">
              {{ result.sharpeRatio.toFixed(3) }}
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-label">分散化比率</div>
            <div class="metric-value">
              {{ result.diversificationRatio.toFixed(3) }}
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-label">有效资产数</div>
            <div class="metric-value">
              {{ result.effectiveAssets.toFixed(1) }}
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-label">收敛状态</div>
            <div class="metric-value" :class="result.convergenceInfo.converged ? 'positive' : 'negative'">
              {{ result.convergenceInfo.converged ? '已收敛' : '未收敛' }}
            </div>
          </div>
        </div>

        <!-- 优化权重表格 -->
        <div class="weights-table">
          <h5>优化权重分配</h5>
          <table>
            <thead>
              <tr>
                <th>资产</th>
                <th>当前权重</th>
                <th>优化权重</th>
                <th>风险贡献</th>
                <th>权重变化</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(asset, index) in assets" :key="asset.symbol">
                <td>{{ asset.symbol }}</td>
                <td>{{ (asset.weight).toFixed(2) }}%</td>
                <td class="weight-optimized">{{ (result.optimizedWeights[index] * 100).toFixed(2) }}%</td>
                <td>{{ (result.riskContributions[index] * 100).toFixed(2) }}%</td>
                <td :class="getWeightChangeClass(asset.weight / 100, result.optimizedWeights[index])">
                  {{ getWeightChangeText(asset.weight / 100, result.optimizedWeights[index]) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 再平衡信号 -->
        <div v-if="result.rebalanceSignals.length > 0" class="rebalance-section">
          <h5>再平衡建议</h5>
          <div class="signals-list">
            <div 
              v-for="signal in result.rebalanceSignals" 
              :key="signal.symbol"
              class="signal-item"
              :class="signal.action"
            >
              <div class="signal-header">
                <span class="signal-symbol">{{ signal.symbol }}</span>
                <span class="signal-action" :class="signal.action">
                  {{ getActionText(signal.action) }}
                </span>
              </div>
              <div class="signal-details">
                <span class="signal-amount">{{ formatCurrency(signal.amount) }}</span>
                <span class="signal-reason">{{ signal.reason }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 收敛信息 -->
        <div class="convergence-info">
          <h5>优化收敛信息</h5>
          <div class="convergence-details">
            <span>迭代次数: {{ result.convergenceInfo.iterations }}</span>
            <span>最终误差: {{ result.convergenceInfo.finalError.toExponential(3) }}</span>
            <span>收敛状态: {{ result.convergenceInfo.converged ? '成功' : '失败' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { RiskParityCalculator, type Asset, type RiskParityParams, type RiskParityResult } from '@/services/risk/RiskParityCalculator'
import { useToast } from '@/composables/useToast'

const { showToast } = useToast()

// 风险平价计算器实例
const riskParityCalculator = new RiskParityCalculator()

// 资产列表
const assets = ref<Asset[]>([
  {
    symbol: '000001',
    name: '平安银行',
    expectedReturn: 8.5,
    volatility: 25.0,
    weight: 25.0,
    riskContribution: 0,
    currentPrice: 12.5,
    historicalPrices: []
  },
  {
    symbol: '000002',
    name: '万科A',
    expectedReturn: 6.2,
    volatility: 30.0,
    weight: 25.0,
    riskContribution: 0,
    currentPrice: 18.2,
    historicalPrices: []
  },
  {
    symbol: '600036',
    name: '招商银行',
    expectedReturn: 9.1,
    volatility: 22.0,
    weight: 25.0,
    riskContribution: 0,
    currentPrice: 35.8,
    historicalPrices: []
  },
  {
    symbol: '600519',
    name: '贵州茅台',
    expectedReturn: 12.3,
    volatility: 35.0,
    weight: 25.0,
    riskContribution: 0,
    currentPrice: 1680.0,
    historicalPrices: []
  }
])

// 优化参数
const params = reactive<RiskParityParams>({
  assets: [],
  targetVolatility: 15.0,
  riskFreeRate: 3.0,
  lookbackPeriod: 252,
  rebalanceFrequency: 'monthly',
  maxWeight: 40.0,
  minWeight: 5.0
})

// 状态
const isOptimizing = ref(false)
const result = ref<RiskParityResult | null>(null)

// 计算属性
const canOptimize = computed(() => {
  return assets.value.length >= 2 && 
         assets.value.every(asset => 
           asset.symbol && 
           asset.expectedReturn > 0 && 
           asset.volatility > 0
         )
})

// 添加资产
const addAsset = () => {
  assets.value.push({
    symbol: '',
    name: '',
    expectedReturn: 10.0,
    volatility: 20.0,
    weight: 0,
    riskContribution: 0,
    currentPrice: 10.0,
    historicalPrices: []
  })
}

// 删除资产
const removeAsset = (index: number) => {
  if (assets.value.length > 2) {
    assets.value.splice(index, 1)
  }
}

// 更新资产信息
const updateAssetInfo = async (index: number) => {
  const asset = assets.value[index]
  if (asset.symbol) {
    // 这里可以调用API获取真实的股票信息
    // 暂时使用模拟数据
    asset.historicalPrices = generateMockPrices(asset.currentPrice, 252)
  }
}

// 生成模拟价格数据
const generateMockPrices = (basePrice: number, days: number): number[] => {
  const prices = [basePrice]
  for (let i = 1; i < days; i++) {
    const change = (Math.random() - 0.5) * 0.04 // ±2%的随机变动
    const newPrice = prices[i - 1] * (1 + change)
    prices.push(newPrice)
  }
  return prices
}

// 优化投资组合
const optimizePortfolio = async () => {
  if (!canOptimize.value) {
    showToast('请完善资产信息', 'warning')
    return
  }

  isOptimizing.value = true
  
  try {
    // 准备参数
    const optimizationParams: RiskParityParams = {
      ...params,
      assets: assets.value.map(asset => ({
        ...asset,
        expectedReturn: asset.expectedReturn / 100,
        volatility: asset.volatility / 100,
        weight: asset.weight / 100,
        historicalPrices: asset.historicalPrices.length > 0 ? 
          asset.historicalPrices : 
          generateMockPrices(asset.currentPrice, params.lookbackPeriod)
      })),
      targetVolatility: params.targetVolatility / 100,
      riskFreeRate: params.riskFreeRate / 100,
      maxWeight: params.maxWeight / 100,
      minWeight: params.minWeight / 100
    }

    // 执行优化
    result.value = riskParityCalculator.calculateRiskParityWeights(optimizationParams)
    
    showToast('风险平价优化完成!', 'success')
  } catch (error: any) {
    showToast('优化失败: ' + error.message, 'error')
    console.error('Risk parity optimization failed:', error)
  } finally {
    isOptimizing.value = false
  }
}

// 加载示例数据
const loadSampleData = () => {
  // 重置为示例数据
  assets.value.forEach(asset => {
    asset.historicalPrices = generateMockPrices(asset.currentPrice, params.lookbackPeriod)
  })
  
  showToast('示例数据已加载')
}

// 重置数据
const resetData = () => {
  result.value = null
  assets.value.forEach(asset => {
    asset.weight = 25.0
    asset.riskContribution = 0
  })
  
  showToast('数据已重置')
}

// 工具函数
const getSharpeClass = (sharpe: number) => {
  if (sharpe >= 1.0) return 'excellent'
  if (sharpe >= 0.5) return 'good'
  if (sharpe >= 0.0) return 'fair'
  return 'poor'
}

const getWeightChangeClass = (current: number, target: number) => {
  const change = target - current
  if (Math.abs(change) < 0.01) return 'no-change'
  return change > 0 ? 'increase' : 'decrease'
}

const getWeightChangeText = (current: number, target: number) => {
  const change = (target - current) * 100
  if (Math.abs(change) < 1) return '无变化'
  return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`
}

const getActionText = (action: string) => {
  const actions = {
    buy: '买入',
    sell: '卖出',
    hold: '持有'
  }
  return actions[action as keyof typeof actions] || action
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}
</script>

<style scoped>
.risk-parity-optimizer {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.optimizer-header {
  text-align: center;
  margin-bottom: 30px;
}

.optimizer-header h3 {
  color: #1890ff;
  margin-bottom: 10px;
}

.subtitle {
  color: #666;
  font-size: 14px;
}

.optimizer-content {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.assets-section {
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h4 {
  color: #333;
  margin: 0;
}

.assets-table {
  overflow-x: auto;
}

.assets-table table {
  width: 100%;
  border-collapse: collapse;
}

.assets-table th,
.assets-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e8e8e8;
}

.assets-table th {
  background: #fafafa;
  font-weight: 600;
}

.table-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
}

.params-section {
  margin-bottom: 30px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.params-section h4 {
  color: #333;
  margin-bottom: 20px;
}

.params-grid {
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

.action-section {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-bottom: 30px;
  padding: 20px 0;
  border-top: 1px solid #f0f0f0;
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

.btn-danger {
  background: #ff4d4f;
  color: white;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
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

.result-section {
  border-top: 2px solid #1890ff;
  padding-top: 20px;
}

.result-section h4 {
  color: #333;
  margin-bottom: 20px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.metric-card {
  background: #f9f9f9;
  border-radius: 6px;
  padding: 15px;
  text-align: center;
}

.metric-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.metric-value {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.positive { color: #52c41a; }
.negative { color: #ff4d4f; }
.excellent { color: #1890ff; }
.good { color: #52c41a; }
.fair { color: #faad14; }
.poor { color: #ff4d4f; }

.weights-table {
  margin-bottom: 30px;
}

.weights-table h5 {
  color: #333;
  margin-bottom: 15px;
}

.weights-table table {
  width: 100%;
  border-collapse: collapse;
}

.weights-table th,
.weights-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e8e8e8;
}

.weights-table th {
  background: #fafafa;
  font-weight: 600;
}

.weight-optimized {
  font-weight: bold;
  color: #1890ff;
}

.increase { color: #52c41a; }
.decrease { color: #ff4d4f; }
.no-change { color: #666; }

.rebalance-section {
  margin-bottom: 30px;
}

.rebalance-section h5 {
  color: #333;
  margin-bottom: 15px;
}

.signals-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.signal-item {
  background: #f9f9f9;
  border-radius: 6px;
  padding: 15px;
  border-left: 4px solid #d9d9d9;
}

.signal-item.buy {
  border-left-color: #52c41a;
}

.signal-item.sell {
  border-left-color: #ff4d4f;
}

.signal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.signal-symbol {
  font-weight: bold;
  color: #333;
}

.signal-action {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.signal-action.buy {
  background: #f6ffed;
  color: #52c41a;
}

.signal-action.sell {
  background: #fff2f0;
  color: #ff4d4f;
}

.signal-details {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #666;
}

.convergence-info {
  background: #f0f9ff;
  border-radius: 6px;
  padding: 15px;
}

.convergence-info h5 {
  color: #1890ff;
  margin-bottom: 10px;
}

.convergence-details {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #666;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .params-grid {
    grid-template-columns: 1fr;
  }
  
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .action-section {
    flex-direction: column;
  }
  
  .convergence-details {
    flex-direction: column;
    gap: 5px;
  }
}
</style>
