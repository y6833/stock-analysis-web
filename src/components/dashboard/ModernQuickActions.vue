<template>
  <div class="modern-quick-actions">
    <div class="widget-header">
      <h3 class="widget-title">
        <el-icon class="title-icon">
          <Lightning />
        </el-icon>
        快速操作
      </h3>
    </div>

    <div class="widget-content">
      <div class="actions-grid">
        <!-- 十字星选股 -->
        <div class="action-card doji-scan" @click="$emit('doji-scan')">
          <div class="action-icon">
            <el-icon>
              <TrendCharts />
            </el-icon>
          </div>
          <div class="action-content">
            <h4 class="action-title">十字星选股</h4>
            <p class="action-description">基于十字星形态筛选潜力股票</p>
            <div class="action-stats">
              <span class="stat-item">
                <span class="stat-label">今日形态:</span>
                <span class="stat-value">{{ dojiStats.todayPatterns }}</span>
              </span>
            </div>
          </div>
          <div class="action-arrow">
            <el-icon>
              <ArrowRight />
            </el-icon>
          </div>
        </div>

        <!-- AI智能推荐 -->
        <div class="action-card ai-recommend" @click="$emit('ai-recommend')">
          <div class="action-icon">
            <el-icon>
              <MagicStick />
            </el-icon>
          </div>
          <div class="action-content">
            <h4 class="action-title">AI智能推荐</h4>
            <p class="action-description">基于机器学习的股票推荐</p>
            <div class="action-stats">
              <span class="stat-item">
                <span class="stat-label">推荐股票:</span>
                <span class="stat-value">{{ aiStats.recommendations }}</span>
              </span>
            </div>
          </div>
          <div class="action-arrow">
            <el-icon>
              <ArrowRight />
            </el-icon>
          </div>
        </div>

        <!-- 风险监控 -->
        <div class="action-card risk-monitor" @click="$emit('risk-monitor')">
          <div class="action-icon">
            <el-icon>
              <Warning />
            </el-icon>
          </div>
          <div class="action-content">
            <h4 class="action-title">风险监控</h4>
            <p class="action-description">实时监控投资组合风险</p>
            <div class="action-stats">
              <span class="stat-item">
                <span class="stat-label">风险等级:</span>
                <span class="stat-value" :class="riskLevelClass">{{ riskStats.level }}</span>
              </span>
            </div>
          </div>
          <div class="action-arrow">
            <el-icon>
              <ArrowRight />
            </el-icon>
          </div>
        </div>

        <!-- 模拟交易 -->
        <div class="action-card simulation-trade" @click="handleSimulationTrade">
          <div class="action-icon">
            <el-icon>
              <Coin />
            </el-icon>
          </div>
          <div class="action-content">
            <h4 class="action-title">模拟交易</h4>
            <p class="action-description">无风险练习交易策略</p>
            <div class="action-stats">
              <span class="stat-item">
                <span class="stat-label">虚拟资金:</span>
                <span class="stat-value">{{ formatCurrency(simulationStats.balance) }}</span>
              </span>
            </div>
          </div>
          <div class="action-arrow">
            <el-icon>
              <ArrowRight />
            </el-icon>
          </div>
        </div>

        <!-- 数据导出 -->
        <div class="action-card data-export" @click="handleDataExport">
          <div class="action-icon">
            <el-icon>
              <Download />
            </el-icon>
          </div>
          <div class="action-content">
            <h4 class="action-title">数据导出</h4>
            <p class="action-description">导出分析数据和报告</p>
            <div class="action-stats">
              <span class="stat-item">
                <span class="stat-label">可导出:</span>
                <span class="stat-value">{{ exportStats.availableReports }}</span>
              </span>
            </div>
          </div>
          <div class="action-arrow">
            <el-icon>
              <ArrowRight />
            </el-icon>
          </div>
        </div>

        <!-- 海龟交易 -->
        <div class="action-card turtle-trading" @click="handleTurtleTrading">
          <div class="action-icon">
            <el-icon>
              <Compass />
            </el-icon>
          </div>
          <div class="action-content">
            <h4 class="action-title">海龟交易</h4>
            <p class="action-description">经典趋势跟踪策略</p>
            <div class="action-stats">
              <span class="stat-item">
                <span class="stat-label">信号数:</span>
                <span class="stat-value">{{ turtleStats.signals }}</span>
              </span>
            </div>
          </div>
          <div class="action-arrow">
            <el-icon>
              <ArrowRight />
            </el-icon>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Lightning,
  TrendCharts,
  MagicStick,
  Warning,
  Coin,
  Download,
  Compass,
  ArrowRight
} from '@element-plus/icons-vue'
import { dashboardStatsService } from '@/services/dashboardStatsService'

// Emits
defineEmits<{
  'doji-scan': []
  'ai-recommend': []
  'risk-monitor': []
}>()

const router = useRouter()

// 响应式数据
const dojiStats = ref({
  todayPatterns: 0,
  totalStocks: 0,
  accuracy: 0
})

const aiStats = ref({
  recommendations: 0,
  highConfidence: 0,
  mediumConfidence: 0,
  lowConfidence: 0
})

const riskStats = ref({
  level: '低' as '低' | '中' | '高',
  score: 0,
  volatility: 0,
  vixLevel: 0
})

const simulationStats = ref({
  balance: 1000000
})

const exportStats = ref({
  availableReports: 5
})

const turtleStats = ref({
  signals: 0,
  buySignals: 0,
  sellSignals: 0,
  strongSignals: 0
})

// 计算属性
const riskLevelClass = computed(() => ({
  'risk-low': riskStats.value.level === '低',
  'risk-medium': riskStats.value.level === '中',
  'risk-high': riskStats.value.level === '高'
}))

// 方法
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0
  }).format(amount)
}

const handleSimulationTrade = () => {
  router.push('/simulation/trading')
}

const handleDataExport = () => {
  router.push('/tools/export')
}

const handleTurtleTrading = () => {
  router.push('/strategies/turtle')
}

// 加载统计数据
const loadStats = async () => {
  try {
    console.log('开始加载真实统计数据...')

    // 获取真实的统计数据
    const stats = await dashboardStatsService.getAllStats()

    // 更新十字星统计
    dojiStats.value = stats.dojiStats

    // 更新AI推荐统计
    aiStats.value = stats.aiStats

    // 更新海龟交易统计
    turtleStats.value = stats.turtleStats

    // 更新风险统计
    riskStats.value = stats.riskStats

    console.log('统计数据加载完成:', {
      doji: dojiStats.value.todayPatterns,
      ai: aiStats.value.recommendations,
      turtle: turtleStats.value.signals,
      risk: riskStats.value.level
    })
  } catch (error) {
    console.error('加载统计数据失败:', error)

    // 失败时使用默认值
    dojiStats.value = { todayPatterns: 0, totalStocks: 0, accuracy: 0 }
    aiStats.value = { recommendations: 0, highConfidence: 0, mediumConfidence: 0, lowConfidence: 0 }
    turtleStats.value = { signals: 0, buySignals: 0, sellSignals: 0, strongSignals: 0 }
    riskStats.value = { level: '低', score: 0, volatility: 0, vixLevel: 0 }
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.modern-quick-actions {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.widget-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.widget-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  color: var(--el-text-color-primary);
}

.title-icon {
  color: var(--color-warning);
}

.widget-content {
  flex: 1;
  padding: var(--spacing-lg);
  overflow-y: auto;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-md);
}

.action-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--el-border-color-light);
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--el-bg-color);
}

.action-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius-md);
  font-size: 24px;
  color: white;
}

.doji-scan .action-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.ai-recommend .action-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.risk-monitor .action-icon {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
}

.simulation-trade .action-icon {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.data-export .action-icon {
  background: linear-gradient(135deg, #d299c2 0%, #fef9d7 100%);
}

.turtle-trading .action-icon {
  background: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%);
}

.action-content {
  flex: 1;
}

.action-title {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--el-text-color-primary);
}

.action-description {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-sm);
  color: var(--el-text-color-regular);
  line-height: 1.4;
}

.action-stats {
  display: flex;
  gap: var(--spacing-md);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}

.stat-label {
  color: var(--el-text-color-regular);
}

.stat-value {
  font-weight: var(--font-weight-medium);
  color: var(--el-text-color-primary);
}

.stat-value.risk-low {
  color: var(--color-success);
}

.stat-value.risk-medium {
  color: var(--color-warning);
}

.stat-value.risk-high {
  color: var(--color-danger);
}

.action-arrow {
  color: var(--el-text-color-placeholder);
  transition: all 0.3s ease;
}

.action-card:hover .action-arrow {
  color: var(--color-primary);
  transform: translateX(4px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .actions-grid {
    grid-template-columns: 1fr;
  }

  .action-card {
    padding: var(--spacing-md);
  }

  .action-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
}
</style>
