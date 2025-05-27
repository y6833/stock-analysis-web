<template>
  <div class="kelly-calculator">
    <div class="calculator-header">
      <h3>Kelly公式仓位计算器</h3>
      <p class="subtitle">基于Kelly公式计算最优投资仓位</p>
    </div>

    <div class="calculator-content">
      <!-- 参数输入区域 -->
      <div class="input-section">
        <h4>策略参数</h4>
        
        <div class="form-row">
          <div class="form-group">
            <label>胜率 (%)</label>
            <input 
              type="number" 
              v-model.number="params.winRate" 
              class="form-control"
              min="0"
              max="100"
              step="0.1"
              @input="calculatePosition"
            />
            <small class="form-hint">历史交易的盈利比例</small>
          </div>
          
          <div class="form-group">
            <label>平均盈利 (元)</label>
            <input 
              type="number" 
              v-model.number="params.avgWin" 
              class="form-control"
              min="0"
              step="0.01"
              @input="calculatePosition"
            />
            <small class="form-hint">每次盈利交易的平均收益</small>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>平均亏损 (元)</label>
            <input 
              type="number" 
              v-model.number="params.avgLoss" 
              class="form-control"
              min="0"
              step="0.01"
              @input="calculatePosition"
            />
            <small class="form-hint">每次亏损交易的平均损失</small>
          </div>
          
          <div class="form-group">
            <label>期望收益率 (%)</label>
            <input 
              type="number" 
              v-model.number="params.expectedReturn" 
              class="form-control"
              step="0.01"
              @input="calculatePosition"
            />
            <small class="form-hint">策略的年化期望收益率</small>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>无风险利率 (%)</label>
            <input 
              type="number" 
              v-model.number="params.riskFreeRate" 
              class="form-control"
              min="0"
              max="20"
              step="0.01"
              @input="calculatePosition"
            />
            <small class="form-hint">当前无风险利率（如国债收益率）</small>
          </div>
          
          <div class="form-group">
            <label>Kelly上限 (%)</label>
            <input 
              type="number" 
              v-model.number="params.maxKellyFraction" 
              class="form-control"
              min="1"
              max="50"
              step="1"
              @input="calculatePosition"
            />
            <small class="form-hint">Kelly比例的最大限制</small>
          </div>
        </div>
      </div>

      <!-- 投资参数 -->
      <div class="input-section">
        <h4>投资参数</h4>
        
        <div class="form-row">
          <div class="form-group">
            <label>当前股价 (元)</label>
            <input 
              type="number" 
              v-model.number="currentPrice" 
              class="form-control"
              min="0"
              step="0.01"
              @input="calculatePosition"
            />
          </div>
          
          <div class="form-group">
            <label>可用资金 (元)</label>
            <input 
              type="number" 
              v-model.number="availableCash" 
              class="form-control"
              min="0"
              step="100"
              @input="calculatePosition"
            />
          </div>
        </div>
      </div>

      <!-- 计算结果 -->
      <div class="result-section" v-if="result">
        <h4>计算结果</h4>
        
        <div class="result-grid">
          <div class="result-card">
            <div class="result-label">Kelly比例</div>
            <div class="result-value" :class="getRiskClass(result.riskLevel)">
              {{ (result.kellyFraction * 100).toFixed(2) }}%
            </div>
          </div>
          
          <div class="result-card">
            <div class="result-label">调整后比例</div>
            <div class="result-value" :class="getRiskClass(result.riskLevel)">
              {{ (result.adjustedFraction * 100).toFixed(2) }}%
            </div>
          </div>
          
          <div class="result-card">
            <div class="result-label">建议金额</div>
            <div class="result-value">
              {{ formatCurrency(result.suggestedAmount) }}
            </div>
          </div>
          
          <div class="result-card">
            <div class="result-label">建议股数</div>
            <div class="result-value">
              {{ result.suggestedShares.toLocaleString() }} 股
            </div>
          </div>
          
          <div class="result-card">
            <div class="result-label">风险等级</div>
            <div class="result-value" :class="getRiskClass(result.riskLevel)">
              {{ getRiskLabel(result.riskLevel) }}
            </div>
          </div>
          
          <div class="result-card">
            <div class="result-label">置信度</div>
            <div class="result-value">
              {{ (result.confidence * 100).toFixed(1) }}%
            </div>
          </div>
        </div>

        <!-- 风险警告 -->
        <div class="warnings-section" v-if="result.warnings.length > 0">
          <h5>风险提示</h5>
          <div class="warning-list">
            <div 
              v-for="(warning, index) in result.warnings" 
              :key="index"
              class="warning-item"
            >
              <span class="warning-icon">⚠️</span>
              <span class="warning-text">{{ warning }}</span>
            </div>
          </div>
        </div>

        <!-- 投资建议 -->
        <div class="advice-section">
          <h5>投资建议</h5>
          <div class="advice-content">
            <p>{{ getKellyAdvice() }}</p>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-section">
        <button 
          class="btn btn-primary" 
          @click="calculatePosition"
          :disabled="!canCalculate"
        >
          重新计算
        </button>
        
        <button 
          class="btn btn-secondary" 
          @click="loadHistoricalData"
          :disabled="!selectedStock"
        >
          使用历史数据
        </button>
        
        <button 
          class="btn btn-outline" 
          @click="resetParams"
        >
          重置参数
        </button>
      </div>
    </div>

    <!-- Kelly公式说明 -->
    <div class="info-section">
      <h4>Kelly公式说明</h4>
      <div class="formula-explanation">
        <div class="formula">
          <strong>Kelly比例 = (胜率 × 盈亏比 - 败率) ÷ 盈亏比</strong>
        </div>
        <div class="explanation">
          <p><strong>核心思想：</strong>在保证长期资本增长的前提下，最大化投资收益。</p>
          <p><strong>适用场景：</strong>有明确胜率和盈亏比的投资策略。</p>
          <p><strong>风险提示：</strong>Kelly公式假设可以无限次重复投资，实际应用中需要考虑风险控制。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { KellyCalculator, type KellyParams, type KellyResult } from '@/services/position/KellyCalculator'
import { useToast } from '@/composables/useToast'

const { showToast } = useToast()

// Kelly计算器实例
const kellyCalculator = new KellyCalculator()

// 参数
const params = reactive<KellyParams>({
  winRate: 0.6,           // 60%胜率
  avgWin: 150,            // 平均盈利150元
  avgLoss: 100,           // 平均亏损100元
  expectedReturn: 0.15,   // 15%期望收益率
  riskFreeRate: 0.03,     // 3%无风险利率
  maxKellyFraction: 0.25  // 25%Kelly上限
})

// 投资参数
const currentPrice = ref(10.5)
const availableCash = ref(100000)
const selectedStock = ref('')

// 计算结果
const result = ref<KellyResult | null>(null)

// 计算属性
const canCalculate = computed(() => {
  return params.winRate > 0 && 
         params.avgWin > 0 && 
         params.avgLoss > 0 && 
         currentPrice.value > 0 && 
         availableCash.value > 0
})

// 初始化
onMounted(() => {
  calculatePosition()
})

// 计算仓位
const calculatePosition = () => {
  if (!canCalculate.value) return

  try {
    // 转换百分比为小数
    const calculationParams = {
      ...params,
      winRate: params.winRate / 100,
      expectedReturn: params.expectedReturn / 100,
      riskFreeRate: params.riskFreeRate / 100,
      maxKellyFraction: params.maxKellyFraction / 100
    }

    result.value = kellyCalculator.calculateKellyPosition(
      calculationParams,
      currentPrice.value,
      availableCash.value
    )

    if (result.value.warnings.length > 0) {
      showToast('计算完成，请注意风险提示', 'warning')
    }
  } catch (error: any) {
    showToast('计算失败: ' + error.message, 'error')
  }
}

// 加载历史数据
const loadHistoricalData = () => {
  // 这里可以集成实际的历史交易数据
  showToast('历史数据加载功能开发中...', 'info')
}

// 重置参数
const resetParams = () => {
  params.winRate = 60
  params.avgWin = 150
  params.avgLoss = 100
  params.expectedReturn = 15
  params.riskFreeRate = 3
  params.maxKellyFraction = 25
  
  currentPrice.value = 10.5
  availableCash.value = 100000
  
  calculatePosition()
  showToast('参数已重置')
}

// 获取风险等级样式
const getRiskClass = (riskLevel: string) => {
  const classes = {
    low: 'risk-low',
    medium: 'risk-medium', 
    high: 'risk-high',
    extreme: 'risk-extreme'
  }
  return classes[riskLevel as keyof typeof classes] || ''
}

// 获取风险等级标签
const getRiskLabel = (riskLevel: string) => {
  const labels = {
    low: '低风险',
    medium: '中等风险',
    high: '高风险', 
    extreme: '极高风险'
  }
  return labels[riskLevel as keyof typeof labels] || '未知'
}

// 格式化货币
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

// 获取Kelly建议
const getKellyAdvice = () => {
  if (!result.value) return ''
  return kellyCalculator.getKellyAdvice(result.value)
}
</script>

<style scoped>
.kelly-calculator {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.calculator-header {
  text-align: center;
  margin-bottom: 30px;
}

.calculator-header h3 {
  color: #1890ff;
  margin-bottom: 10px;
}

.subtitle {
  color: #666;
  font-size: 14px;
}

.calculator-content {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.input-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.input-section h4 {
  color: #333;
  margin-bottom: 20px;
  font-size: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
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

.form-control:focus {
  border-color: #1890ff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.form-hint {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}

.result-section {
  margin-bottom: 30px;
}

.result-section h4 {
  color: #333;
  margin-bottom: 20px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.result-card {
  background: #f9f9f9;
  border-radius: 6px;
  padding: 15px;
  text-align: center;
}

.result-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.result-value {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.risk-low { color: #52c41a; }
.risk-medium { color: #faad14; }
.risk-high { color: #ff7a45; }
.risk-extreme { color: #ff4d4f; }

.warnings-section {
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 20px;
}

.warnings-section h5 {
  color: #d46b08;
  margin-bottom: 10px;
  font-size: 14px;
}

.warning-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.warning-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.warning-icon {
  font-size: 16px;
}

.warning-text {
  color: #d46b08;
  font-size: 13px;
}

.advice-section {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 6px;
  padding: 15px;
}

.advice-section h5 {
  color: #389e0d;
  margin-bottom: 10px;
  font-size: 14px;
}

.advice-content p {
  color: #389e0d;
  margin: 0;
  font-size: 14px;
}

.action-section {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-bottom: 30px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #1890ff;
  color: white;
}

.btn-primary:hover {
  background: #40a9ff;
}

.btn-secondary {
  background: #52c41a;
  color: white;
}

.btn-secondary:hover {
  background: #73d13d;
}

.btn-outline {
  background: white;
  color: #1890ff;
  border: 1px solid #1890ff;
}

.btn-outline:hover {
  background: #f0f9ff;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.info-section {
  background: #fafafa;
  border-radius: 8px;
  padding: 20px;
}

.info-section h4 {
  color: #333;
  margin-bottom: 15px;
}

.formula-explanation {
  line-height: 1.6;
}

.formula {
  background: white;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 15px;
  text-align: center;
  border-left: 4px solid #1890ff;
}

.explanation p {
  margin-bottom: 10px;
  color: #666;
  font-size: 14px;
}

.explanation strong {
  color: #333;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .result-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .action-section {
    flex-direction: column;
  }
}
</style>
