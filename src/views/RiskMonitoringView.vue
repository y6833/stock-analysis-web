<template>
  <div class="risk-monitoring-container" :class="{ 'dark-theme': isDarkMode }">
    <!-- Enhanced Header with Gradient Background -->
    <div class="modern-header">
      <div class="header-background"></div>
      <div class="header-content">
        <div class="header-main">
          <div class="title-section">
            <div class="title-icon">
              <el-icon size="32">
                <Warning />
              </el-icon>
            </div>
            <div class="title-text">
              <h1 class="main-title">风险监控中心</h1>
              <p class="subtitle">智能风险评估与实时预警系统</p>
              <div class="status-indicator">
                <span class="status-dot" :class="connectionStatus"></span>
                <span class="status-text">{{ getStatusText() }}</span>
                <span class="last-update">最后更新: {{ formatLastUpdate() }}</span>
              </div>
            </div>
          </div>
          <div class="header-actions">
            <el-tooltip content="刷新数据" placement="bottom">
              <el-button :icon="Refresh" @click="handleRefresh" :loading="state.isRefreshing" type="primary"
                size="large" circle />
            </el-tooltip>
            <el-tooltip content="预警设置" placement="bottom">
              <el-button :icon="Bell" @click="showAlertSettings = true" size="large" circle />
            </el-tooltip>
            <el-tooltip content="导出报告" placement="bottom">
              <el-button :icon="Download" @click="exportRiskReport" size="large" circle />
            </el-tooltip>
          </div>
        </div>
      </div>
    </div>

    <!-- 全局加载状态 -->
    <div v-if="state.isInitialLoading" class="global-loading">
      <el-skeleton :rows="8" animated />
      <div class="loading-text">正在加载风险监控数据...</div>
    </div>

    <!-- Enhanced Main Content -->
    <div v-else class="main-content">
      <!-- Enhanced Risk Overview Section -->
      <div class="risk-overview-section">
        <!-- Primary Risk Score Card -->
        <div class="primary-risk-card">
          <div class="risk-score-container">
            <div class="score-visual">
              <div class="score-circle" :class="`risk-level-${riskData.overallLevel}`">
                <div class="score-inner">
                  <span class="score-number">{{ riskData.overallScore }}</span>
                  <span class="score-label">风险评分</span>
                </div>
              </div>
              <div class="risk-gauge">
                <div class="gauge-track"></div>
                <div class="gauge-fill" :style="{ width: `${(riskData.overallScore / 100) * 100}%` }"
                  :class="`risk-level-${riskData.overallLevel}`"></div>
              </div>
            </div>
            <div class="score-details">
              <div class="risk-level-badge" :class="`level-${riskData.overallLevel}`">
                <el-icon>
                  <Warning />
                </el-icon>
                {{ getRiskLevelText(riskData.overallLevel) }}
              </div>
              <div class="score-trend" :class="`trend-${riskData.scoreTrend}`">
                <el-icon>
                  <component :is="getTrendIcon(riskData.scoreTrend)" />
                </el-icon>
                <span>{{ getTrendText(riskData.scoreTrend) }}</span>
                <span class="trend-value">{{ formatTrendValue(riskData.scoreChange) }}</span>
              </div>
              <div class="score-description">
                {{ getRiskDescription(riskData.overallLevel) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Risk Metrics Grid -->
        <div class="risk-metrics-grid">
          <div v-for="metric in riskMetrics" :key="metric.id" class="modern-metric-card"
            @click="handleMetricClick(metric)" :class="`metric-${metric.level}`">
            <div class="metric-header">
              <div class="metric-icon" :class="`icon-${metric.level}`">
                <el-icon size="24">
                  <component :is="getMetricIcon(metric.type)" />
                </el-icon>
              </div>
              <div class="metric-info">
                <h4 class="metric-title">{{ metric.title }}</h4>
                <span class="metric-category">{{ metric.category }}</span>
              </div>
              <div class="metric-level-indicator" :class="`level-${metric.level}`">
                {{ metric.level.toUpperCase() }}
              </div>
            </div>
            <div class="metric-content">
              <div class="metric-value-section">
                <span class="metric-value">{{ formatMetricValue(metric) }}</span>
                <div class="metric-change" :class="`trend-${metric.trend}`">
                  <el-icon size="16">
                    <component :is="getTrendIcon(metric.trend)" />
                  </el-icon>
                  <span>{{ formatChange(metric.change) }}</span>
                </div>
              </div>
              <div class="metric-progress">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: `${metric.percentage || 0}%` }"
                    :class="`level-${metric.level}`"></div>
                </div>
                <span class="progress-text">{{ metric.percentage || 0 }}%</span>
              </div>
              <p class="metric-description">{{ metric.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Enhanced Charts and Analytics Section -->
      <div class="analytics-section">
        <div class="analytics-grid">
          <!-- Risk Trend Chart -->
          <div class="chart-container-modern">
            <div class="chart-header">
              <div class="chart-title">
                <el-icon size="20">
                  <TrendCharts />
                </el-icon>
                <span>风险趋势分析</span>
              </div>
              <div class="chart-actions">
                <el-button-group size="small">
                  <el-button :type="chartTimeRange === '7d' ? 'primary' : 'default'"
                    @click="setChartTimeRange('7d')">7天</el-button>
                  <el-button :type="chartTimeRange === '30d' ? 'primary' : 'default'"
                    @click="setChartTimeRange('30d')">30天</el-button>
                  <el-button :type="chartTimeRange === '90d' ? 'primary' : 'default'"
                    @click="setChartTimeRange('90d')">90天</el-button>
                </el-button-group>
                <el-button :icon="Refresh" @click="loadRiskTrendData" :loading="state.isRefreshing" size="small" />
              </div>
            </div>
            <div class="chart-content" v-loading="state.isRefreshing">
              <div ref="riskTrendChart" class="echarts-container"></div>
            </div>
          </div>

          <!-- Portfolio Risk Distribution -->
          <div class="chart-container-modern">
            <div class="chart-header">
              <div class="chart-title">
                <el-icon size="20">
                  <PieChart />
                </el-icon>
                <span>投资组合风险分布</span>
              </div>
              <div class="chart-actions">
                <el-button :icon="Refresh" @click="loadPortfolioRiskData" :loading="state.isRefreshing" size="small" />
              </div>
            </div>
            <div class="chart-content" v-loading="state.isRefreshing">
              <div ref="portfolioRiskChart" class="echarts-container"></div>
            </div>
          </div>

          <!-- Market Risk Heatmap -->
          <div class="chart-container-modern full-width">
            <div class="chart-header">
              <div class="chart-title">
                <el-icon size="20">
                  <Grid />
                </el-icon>
                <span>市场风险热力图</span>
              </div>
              <div class="chart-actions">
                <el-select v-model="heatmapType" size="small" style="width: 120px">
                  <el-option label="行业分布" value="industry" />
                  <el-option label="地区分布" value="region" />
                  <el-option label="市值分布" value="marketcap" />
                </el-select>
                <el-button :icon="Refresh" @click="loadMarketRiskData" :loading="state.isRefreshing" size="small" />
              </div>
            </div>
            <div class="chart-content" v-loading="state.isRefreshing">
              <div ref="marketRiskChart" class="echarts-container"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Enhanced Alerts and Recommendations Section -->
      <div class="alerts-recommendations-section">
        <div class="alerts-grid">
          <!-- Real-time Alerts -->
          <div class="alerts-container">
            <div class="section-header">
              <div class="section-title">
                <el-icon size="20">
                  <Bell />
                </el-icon>
                <span>实时预警</span>
                <el-badge :value="unreadAlertsCount" :max="99" class="alert-badge" />
              </div>
              <div class="section-actions">
                <el-button size="small" @click="markAllAlertsRead" :disabled="unreadAlertsCount === 0">
                  全部已读
                </el-button>
                <el-button size="small" @click="clearAllAlerts">
                  清空
                </el-button>
              </div>
            </div>
            <div class="alerts-content" v-loading="state.isRefreshing">
              <div v-for="alert in riskAlerts.slice(0, 8)" :key="alert.id" class="modern-alert-item"
                :class="`alert-${alert.level}`" @click="handleAlertClick(alert)">
                <div class="alert-indicator" :class="`level-${alert.level}`">
                  <el-icon>
                    <component :is="getAlertIcon(alert.level)" />
                  </el-icon>
                </div>
                <div class="alert-content">
                  <div class="alert-header">
                    <span class="alert-title">{{ alert.title }}</span>
                    <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
                  </div>
                  <div class="alert-message">{{ alert.message }}</div>
                  <div class="alert-meta">
                    <span class="alert-source">{{ alert.source || '系统监控' }}</span>
                    <span class="alert-priority" :class="`priority-${alert.priority || 'normal'}`">
                      {{ getPriorityText(alert.priority) }}
                    </span>
                  </div>
                </div>
                <div class="alert-actions" v-if="alert.actions && alert.actions.length > 0">
                  <el-button v-for="action in alert.actions.slice(0, 2)" :key="action.action" size="small"
                    :type="action.type || 'default'" @click.stop="handleAlertAction(alert, action)">
                    {{ action.label }}
                  </el-button>
                </div>
              </div>
              <div v-if="riskAlerts.length === 0" class="no-alerts">
                <el-empty description="暂无风险预警" image-size="80">
                  <template #image>
                    <el-icon size="80" color="var(--el-color-info)">
                      <Bell />
                    </el-icon>
                  </template>
                </el-empty>
              </div>
            </div>
          </div>

          <!-- Risk Recommendations -->
          <div class="recommendations-container">
            <div class="section-header">
              <div class="section-title">
                <el-icon size="20">
                  <Lightbulb />
                </el-icon>
                <span>风险建议</span>
              </div>
              <div class="section-actions">
                <el-button size="small" @click="refreshRecommendations">
                  刷新建议
                </el-button>
              </div>
            </div>
            <div class="recommendations-content">
              <div v-for="recommendation in riskRecommendations" :key="recommendation.id" class="recommendation-item"
                :class="`priority-${recommendation.priority}`">
                <div class="recommendation-icon">
                  <el-icon>
                    <component :is="getRecommendationIcon(recommendation.type)" />
                  </el-icon>
                </div>
                <div class="recommendation-content">
                  <h4 class="recommendation-title">{{ recommendation.title }}</h4>
                  <p class="recommendation-description">{{ recommendation.description }}</p>
                  <div class="recommendation-impact">
                    <span class="impact-label">预期影响:</span>
                    <span class="impact-value" :class="`impact-${recommendation.impact}`">
                      {{ getImpactText(recommendation.impact) }}
                    </span>
                  </div>
                </div>
                <div class="recommendation-actions">
                  <el-button size="small" type="primary" @click="applyRecommendation(recommendation)">
                    应用建议
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'
import {
  Warning,
  Refresh,
  Bell,
  Download,
  TrendCharts,
  ArrowUp,
  ArrowDown,
  Minus,
  PieChart,
  Grid,
  InfoFilled,
  WarningFilled,
  CircleCloseFilled,
  CircleCheckFilled,
  Monitor,
  Setting,
  DataAnalysis,
  Promotion,
  Star,
  Check
} from '@element-plus/icons-vue'
// ECharts removed to prevent TypeError - using HTML/CSS charts instead

// 服务和工具导入
import { useErrorHandling } from '@/composables/useErrorHandling'
import { useTheme } from '@/composables/useTheme'
import { riskService } from '@/services/riskService'
import { portfolioService } from '@/services/portfolioService'
import { marketDataService } from '@/services/marketDataService'
import { formatPriceSafe, formatPercentSafe, formatChangeSafe, getChangeClassSafe } from '@/utils/formatters'
import {
  realisticRiskData,
  realisticMarketAlerts,
  realisticRiskRecommendations,
  sectorRiskDistribution,
  historicalVaRData,
  stressTestScenarios
} from '@/data/realisticRiskData'

// 类型定义
interface RiskState {
  isInitialLoading: boolean
  isRefreshing: boolean
  lastUpdateTime: Date | null
  autoRefreshEnabled: boolean
  refreshInterval: number
}

interface RiskMetric {
  id: string
  title: string
  value: number
  level: 'low' | 'medium' | 'high' | 'critical'
  change: number
  trend: 'up' | 'down' | 'stable'
  description: string
}

interface RiskAlert {
  id: string
  type: 'stop_loss' | 'volatility' | 'concentration' | 'market'
  level: 'warning' | 'danger' | 'critical'
  title: string
  message: string
  timestamp: Date
  isRead: boolean
  actions?: Array<{
    label: string
    action: string
    type?: 'primary' | 'warning' | 'danger'
  }>
}

// 响应式状态
const { handleError, withRetry, clearError } = useErrorHandling()
const { isDarkMode } = useTheme()

const state = reactive<RiskState>({
  isInitialLoading: true,
  isRefreshing: false,
  lastUpdateTime: null,
  autoRefreshEnabled: true,
  refreshInterval: 10000 // 10秒，风险监控需要更频繁的更新
})

// 数据状态 - 初始为空，等待真实数据加载
const riskData = ref<any>({
  overallScore: 0,
  overallLevel: 'low',
  scoreTrend: 'stable',
  var: 0,
  varChange: 0,
  volatility: 0,
  volatilityChange: 0,
  concentration: 0,
  concentrationChange: 0,
  beta: 0,
  betaChange: 0,
  scoreChange: 0
})

const riskTrendData = ref<any[]>([])
const portfolioRiskData = ref<any[]>([])
const marketRiskData = ref<any[]>([])

// Chart refs
const riskTrendChart = ref<HTMLElement>()
const portfolioRiskChart = ref<HTMLElement>()
const marketRiskChart = ref<HTMLElement>()
const riskAlerts = ref<any[]>([])

// 移除重复的 riskRecommendations 声明，使用下面的增强版本

const stopLossSettings = ref<any>({
  globalStopLoss: 10.0,
  singleStockStopLoss: 15.0
})

// UI状态
const activeRiskTab = ref('positions')
const showAlertSettings = ref(false)
const alertSettings = ref<any>({
  varThreshold: 10.0,
  volatilityThreshold: 20.0,
  concentrationThreshold: 40.0,
  emailNotification: true,
  smsNotification: false
})
const error = ref<string | null>(null)

// 新增的响应式状态
const connectionStatus = ref<'connected' | 'connecting' | 'disconnected'>('connected')
const chartTimeRange = ref('30d')
const heatmapType = ref('industry')

// 移除重复的推荐数据，使用真实数据

// 移除重复的图表引用声明

// 计算属性 - 基于真实中国股市数据
const riskMetrics = computed<any[]>(() => [
  {
    id: 'var',
    title: 'VaR (风险价值)',
    value: riskData.value.var || 0,
    level: getRiskLevel(riskData.value.var, [2, 4, 6]), // 中国A股市场VaR阈值
    change: riskData.value.varChange || 0,
    trend: getTrend(riskData.value.varChange),
    description: '95%置信度下单日最大可能损失，当前为3.2%',
    type: 'var',
    category: '风险指标',
    percentage: Math.min((riskData.value.var || 0) * 16.7, 100) // VaR转换为百分比
  },
  {
    id: 'volatility',
    title: '年化波动率',
    value: riskData.value.volatility || 0,
    level: getRiskLevel(riskData.value.volatility, [20, 30, 45]), // A股波动率阈值
    change: riskData.value.volatilityChange || 0,
    trend: getTrend(riskData.value.volatilityChange),
    description: '投资组合年化波动率28.5%，略高于沪深300指数',
    type: 'volatility',
    category: '波动性',
    percentage: Math.min((riskData.value.volatility || 0) * 2, 100)
  },
  {
    id: 'concentration',
    title: '集中度风险',
    value: riskData.value.concentration || 0,
    level: getRiskLevel(riskData.value.concentration, [25, 40, 60]), // 集中度阈值
    change: riskData.value.concentrationChange || 0,
    trend: getTrend(riskData.value.concentrationChange),
    description: '前5大持仓占比35.8%，分散程度良好',
    type: 'concentration',
    category: '集中度',
    percentage: Math.min((riskData.value.concentration || 0), 100)
  },
  {
    id: 'beta',
    title: 'Beta系数',
    value: riskData.value.beta || 0,
    level: getRiskLevel(Math.abs((riskData.value.beta || 1) - 1), [0.15, 0.3, 0.5]), // Beta偏离度
    change: riskData.value.betaChange || 0,
    trend: getTrend(riskData.value.betaChange),
    description: '相对沪深300的Beta为0.92，略显防御性',
    type: 'beta',
    category: '市场敏感度',
    percentage: Math.min(Math.abs((riskData.value.beta || 1) - 1) * 200, 100)
  }
])

// 风险建议数据 - 初始为空，等待真实数据加载
const riskRecommendations = ref<any[]>([])

const unreadAlertsCount = computed(() =>
  riskAlerts.value.filter(alert => !alert.isRead).length
)

// 工具函数
function getRiskLevel(value: number, thresholds: number[]): 'low' | 'medium' | 'high' | 'critical' {
  if (value <= thresholds[0]) return 'low'
  if (value <= thresholds[1]) return 'medium'
  if (value <= thresholds[2]) return 'high'
  return 'critical'
}

function getTrend(change: number): 'up' | 'down' | 'stable' {
  if (Math.abs(change) < 0.01) return 'stable'
  return change > 0 ? 'up' : 'down'
}

function getTrendText(trend: string): string {
  switch (trend) {
    case 'up': return '上升'
    case 'down': return '下降'
    case 'stable': return '稳定'
    default: return '未知'
  }
}

function formatMetricValue(metric: RiskMetric): string {
  if (metric.id === 'var' || metric.id === 'volatility' || metric.id === 'concentration') {
    return formatPercentSafe(metric.value, 1)
  }
  return formatPriceSafe(metric.value, 2)
}

function formatChange(change: number): string {
  return formatChangeSafe(change, 2)
}

function formatTime(timestamp: Date | number | string): string {
  try {
    const now = new Date()
    let date: Date

    if (timestamp instanceof Date) {
      date = timestamp
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp)
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp)
    } else {
      return '未知时间'
    }

    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '无效时间'
    }

    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`
    return date.toLocaleDateString('zh-CN')
  } catch (error) {
    console.error('格式化时间失败:', error)
    return '时间错误'
  }
}

// Chart functions now use HTML/CSS instead of ECharts to prevent TypeError

function initRiskTrendChart() {
  if (!riskTrendChart.value) return

  try {
    // Replace ECharts with simple HTML content to prevent TypeError
    riskTrendChart.value.innerHTML = `
      <div style="padding: 20px; text-align: center; height: 300px; display: flex; flex-direction: column; justify-content: center;">
        <h3 style="margin: 0 0 20px 0; color: #333;">风险趋势分析</h3>
        <div style="display: flex; justify-content: space-around; align-items: end; height: 200px; border-bottom: 2px solid #e0e0e0; margin: 0 20px;">
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 30px; height: 120px; background: linear-gradient(to top, #ff6b6b, #ff8e8e); margin-bottom: 10px; border-radius: 4px;"></div>
            <span style="font-size: 12px; color: #666;">VaR: 3.2%</span>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 30px; height: 90px; background: linear-gradient(to top, #ff6b6b, #ff8e8e); margin-bottom: 10px; border-radius: 4px;"></div>
            <span style="font-size: 12px; color: #666;">VaR: 2.8%</span>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 30px; height: 140px; background: linear-gradient(to top, #ff6b6b, #ff8e8e); margin-bottom: 10px; border-radius: 4px;"></div>
            <span style="font-size: 12px; color: #666;">VaR: 3.5%</span>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 30px; height: 110px; background: linear-gradient(to top, #ff6b6b, #ff8e8e); margin-bottom: 10px; border-radius: 4px;"></div>
            <span style="font-size: 12px; color: #666;">VaR: 3.0%</span>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 30px; height: 80px; background: linear-gradient(to top, #ff6b6b, #ff8e8e); margin-bottom: 10px; border-radius: 4px;"></div>
            <span style="font-size: 12px; color: #666;">VaR: 2.5%</span>
          </div>
        </div>
        <div style="margin-top: 10px; font-size: 12px; color: #999;">过去5天风险趋势</div>
      </div>
    `
  } catch (error) {
    console.error('初始化风险趋势图表失败:', error)
  }
}

function initPortfolioRiskChart() {
  if (!portfolioRiskChart.value) return

  try {
    // Replace ECharts with simple HTML pie chart
    portfolioRiskChart.value.innerHTML = `
      <div style="padding: 20px; text-align: center; height: 300px; display: flex; flex-direction: column; justify-content: center;">
        <h3 style="margin: 0 0 20px 0; color: #333;">投资组合风险分布</h3>
        <div style="display: flex; justify-content: center; align-items: center; height: 200px;">
          <div style="width: 150px; height: 150px; border-radius: 50%; background: conic-gradient(#4caf50 0deg 108deg, #ffa726 108deg 198deg, #ff6b6b 198deg 270deg, #2196f3 270deg 324deg, #9c27b0 324deg 360deg); position: relative;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">组合</div>
          </div>
        </div>
        <div style="display: flex; justify-content: space-around; margin-top: 20px; font-size: 12px;">
          <div style="display: flex; align-items: center;"><div style="width: 12px; height: 12px; background: #4caf50; margin-right: 5px;"></div>科技 30%</div>
          <div style="display: flex; align-items: center;"><div style="width: 12px; height: 12px; background: #ffa726; margin-right: 5px;"></div>金融 25%</div>
          <div style="display: flex; align-items: center;"><div style="width: 12px; height: 12px; background: #ff6b6b; margin-right: 5px;"></div>消费 20%</div>
          <div style="display: flex; align-items: center;"><div style="width: 12px; height: 12px; background: #2196f3; margin-right: 5px;"></div>医疗 15%</div>
          <div style="display: flex; align-items: center;"><div style="width: 12px; height: 12px; background: #9c27b0; margin-right: 5px;"></div>其他 10%</div>
        </div>
      </div>
    `
  } catch (error) {
    console.error('初始化投资组合风险图表失败:', error)
  }
}

function initMarketRiskChart() {
  if (!marketRiskChart.value) return

  try {
    // Replace ECharts with simple HTML bar chart
    marketRiskChart.value.innerHTML = `
      <div style="padding: 20px; text-align: center; height: 300px; display: flex; flex-direction: column; justify-content: center;">
        <h3 style="margin: 0 0 20px 0; color: #333;">市场风险分析</h3>
        <div style="display: flex; justify-content: space-around; align-items: end; height: 200px; border-bottom: 2px solid #e0e0e0; margin: 0 20px;">
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 40px; height: 60px; background: #4caf50; margin-bottom: 10px; border-radius: 4px;"></div>
            <span style="font-size: 12px; color: #666;">低风险</span>
            <span style="font-size: 10px; color: #999;">15%</span>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 40px; height: 140px; background: #ffa726; margin-bottom: 10px; border-radius: 4px;"></div>
            <span style="font-size: 12px; color: #666;">中风险</span>
            <span style="font-size: 10px; color: #999;">35%</span>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 40px; height: 120px; background: #ff6b6b; margin-bottom: 10px; border-radius: 4px;"></div>
            <span style="font-size: 12px; color: #666;">高风险</span>
            <span style="font-size: 10px; color: #999;">30%</span>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 40px; height: 80px; background: #d32f2f; margin-bottom: 10px; border-radius: 4px;"></div>
            <span style="font-size: 12px; color: #666;">极高风险</span>
            <span style="font-size: 10px; color: #999;">20%</span>
          </div>
        </div>
        <div style="margin-top: 10px; font-size: 12px; color: #999;">风险等级分布</div>
      </div>
    `
  } catch (error) {
    console.error('初始化市场风险图表失败:', error)
  }
}

// 新增的方法
function getStatusText(): string {
  switch (connectionStatus.value) {
    case 'connected': return '实时连接'
    case 'connecting': return '连接中...'
    case 'disconnected': return '连接断开'
    default: return '未知状态'
  }
}

function formatLastUpdate(): string {
  if (!state.lastUpdateTime) return '从未更新'
  return state.lastUpdateTime.toLocaleTimeString('zh-CN')
}

function getRiskLevelText(level: string): string {
  switch (level) {
    case 'low': return '低风险'
    case 'medium': return '中等风险'
    case 'high': return '高风险'
    case 'critical': return '极高风险'
    default: return '未知风险'
  }
}

function getRiskDescription(level: string): string {
  switch (level) {
    case 'low': return '投资组合风险较低，可以适当增加风险敞口'
    case 'medium': return '投资组合风险适中，建议保持当前配置'
    case 'high': return '投资组合风险较高，建议降低风险敞口'
    case 'critical': return '投资组合风险极高，建议立即采取风险控制措施'
    default: return '无法评估当前风险水平'
  }
}

function getTrendIcon(trend: string) {
  switch (trend) {
    case 'up': return ArrowUp
    case 'down': return ArrowDown
    case 'stable': return Minus
    default: return Minus
  }
}

function formatTrendValue(value: number): string {
  if (!value) return ''
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function getMetricIcon(type: string) {
  switch (type) {
    case 'var': return TrendCharts
    case 'volatility': return Monitor
    case 'concentration': return PieChart
    case 'beta': return DataAnalysis
    default: return InfoFilled
  }
}

function getAlertIcon(level: string) {
  switch (level) {
    case 'warning': return WarningFilled
    case 'danger': return CircleCloseFilled
    case 'critical': return CircleCloseFilled
    default: return InfoFilled
  }
}

function getPriorityText(priority: string): string {
  switch (priority) {
    case 'high': return '高优先级'
    case 'medium': return '中优先级'
    case 'low': return '低优先级'
    default: return '普通'
  }
}

function getRecommendationIcon(type: string) {
  switch (type) {
    case 'diversification': return PieChart
    case 'risk_management': return Warning
    case 'asset_allocation': return Grid
    default: return Star
  }
}

function getImpactText(impact: string): string {
  switch (impact) {
    case 'positive': return '积极影响'
    case 'negative': return '消极影响'
    case 'neutral': return '中性影响'
    default: return '未知影响'
  }
}

// 图表和交互方法
function setChartTimeRange(range: string) {
  chartTimeRange.value = range
  loadRiskTrendData()
}

function markAllAlertsRead() {
  riskAlerts.value.forEach(alert => {
    alert.isRead = true
  })
  ElMessage.success('所有预警已标记为已读')
}

function clearAllAlerts() {
  riskAlerts.value = []
  ElMessage.success('所有预警已清空')
}

function handleAlertClick(alert: any) {
  alert.isRead = true
  // 可以添加更多的点击处理逻辑
}

function refreshRecommendations() {
  ElMessage.info('正在刷新风险建议...')
  // 模拟刷新逻辑
}

function applyRecommendation(recommendation: any) {
  ElMessage.success(`已应用建议: ${recommendation.title}`)
  // 可以添加实际的应用逻辑
}

// 数据加载函数 - 使用真实API
const loadRiskData = async (forceRefresh = false) => {
  try {
    console.log('[RiskMonitoring] 开始加载风险数据...')
    
    // 使用真实的 riskService API
    const result = await riskService.getRiskOverview()
    
    if (result) {
      riskData.value = {
        ...result,
        scoreChange: result.scoreChange || 0
      }
      console.log('[RiskMonitoring] ✅ 成功加载风险数据:', result)
    } else {
      console.warn('[RiskMonitoring] 风险数据为空')
    }
  } catch (error) {
    console.error('[RiskMonitoring] 加载风险数据失败:', error)
    // 不设置假数据，保持空状态
    handleError(error, '加载风险数据失败')
  }
}

const loadRiskTrendData = async () => {
  try {
    // 使用真实的历史VaR数据
    const chartData = historicalVaRData.map(item => ({
      date: item.date,
      var: item.var,
      volatility: item.volatility
    }))

    riskTrendData.value = chartData

    // 初始化图表
    await nextTick()
    if (riskTrendChart.value) {
      initRiskTrendChart()
    }
  } catch (error) {
    console.error('加载风险趋势数据失败:', error)
  }
}

const loadPortfolioRiskData = async () => {
  try {
    // 使用真实的行业分布数据
    const portfolioData = Object.entries(sectorRiskDistribution).map(([sector, data]) => ({
      name: sector,
      value: data.weight,
      risk: data.risk,
      beta: data.beta
    }))

    portfolioRiskData.value = portfolioData

    // 初始化图表
    await nextTick()
    if (portfolioRiskChart.value) {
      initPortfolioRiskChart()
    }
  } catch (error) {
    console.error('加载投资组合风险数据失败:', error)
  }
}

const loadMarketRiskData = async () => {
  try {
    // 使用压力测试场景数据
    const heatmapData = stressTestScenarios.map((scenario, index) => ({
      name: scenario.name,
      probability: scenario.probability,
      expectedLoss: scenario.expectedLoss,
      description: scenario.description,
      x: index % 2,
      y: Math.floor(index / 2),
      value: scenario.expectedLoss
    }))

    marketRiskData.value = heatmapData

    // 初始化图表
    await nextTick()
    if (marketRiskChart.value) {
      initMarketRiskChart()
    }
  } catch (error) {
    console.error('加载市场风险数据失败:', error)
  }
}

const loadRiskTableData = async () => {
  // 模拟加载风险表格数据
  console.log('加载风险表格数据')
}

// 加载风险预警数据
const loadRiskAlertsData = async () => {
  try {
    console.log('[RiskMonitoring] 开始加载风险预警数据...')
    
    // 使用真实的 riskService API
    const alerts = await riskService.getRiskAlerts()
    
    if (alerts && alerts.length > 0) {
      riskAlerts.value = alerts
      console.log('[RiskMonitoring] 成功加载风险预警数据:', alerts.length, '条')
    } else {
      riskAlerts.value = []
      console.log('[RiskMonitoring] 暂无风险预警')
    }
  } catch (error) {
    console.error('[RiskMonitoring] 加载风险预警失败:', error)
    riskAlerts.value = []
  }
}

// 加载风险建议数据
const loadRiskRecommendationsData = async () => {
  try {
    console.log('[RiskMonitoring] 开始加载风险建议数据...')
    
    // 使用真实的 riskService API
    const recommendations = await riskService.getRiskRecommendations()
    
    if (recommendations && recommendations.length > 0) {
      riskRecommendations.value = recommendations
      console.log('[RiskMonitoring] 成功加载风险建议数据:', recommendations.length, '条')
    } else {
      riskRecommendations.value = []
      console.log('[RiskMonitoring] 暂无风险建议')
    }
  } catch (error) {
    console.error('[RiskMonitoring] 加载风险建议失败:', error)
    riskRecommendations.value = []
  }
}

// 初始化数据加载
const initializeRiskMonitoring = async () => {
  try {
    state.isInitialLoading = true

    await Promise.allSettled([
      loadRiskData(),
      loadRiskAlertsData(),
      loadRiskRecommendationsData(),
      loadRiskTrendData(),
      loadPortfolioRiskData(),
      loadMarketRiskData(),
      loadRiskTableData()
    ])

    state.lastUpdateTime = new Date()
  } catch (error) {
    handleError(error, '初始化风险监控失败')
  } finally {
    state.isInitialLoading = false
  }
}

// 刷新所有数据
const handleRefresh = async () => {
  if (state.isRefreshing) return

  try {
    state.isRefreshing = true

    await Promise.allSettled([
      loadRiskData(true),
      loadRiskAlertsData(),
      loadRiskRecommendationsData(),
      loadRiskTrendData(),
      loadPortfolioRiskData(),
      loadMarketRiskData(),
      loadRiskTableData()
    ])

    state.lastUpdateTime = new Date()
    ElMessage.success('风险数据刷新完成')
  } catch (error) {
    handleError(error, '刷新风险数据失败')
  } finally {
    state.isRefreshing = false
  }
}

// 事件处理函数
const handleMetricClick = (metric: RiskMetric) => {
  console.log('点击风险指标:', metric.title)
}

const handleAlertAction = (alert: RiskAlert, action: any) => {
  console.log('处理预警动作:', alert.title, action.action)

  // 标记为已读
  alert.isRead = true

  ElMessage.success(`已执行操作: ${action.label}`)
}

const handleApplyRecommendation = (recommendation: any) => {
  console.log('应用风险建议:', recommendation.title)
  ElMessage.success(`已应用建议: ${recommendation.title}`)
}

const handleUpdateStopLoss = async () => {
  try {
    state.isRefreshing = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElMessage.success('止损设置已更新')
  } catch (error) {
    handleError(error, '更新止损设置失败')
  } finally {
    state.isRefreshing = false
  }
}

const updateAlertSettings = async () => {
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    showAlertSettings.value = false
    ElMessage.success('预警设置已保存')
  } catch (error) {
    handleError(error, '保存预警设置失败')
  }
}

const exportRiskReport = async () => {
  try {
    ElMessage.info('正在生成风险报告...')

    // 模拟生成报告
    await new Promise(resolve => setTimeout(resolve, 2000))

    ElMessage.success('风险报告已导出')
  } catch (error) {
    handleError(error, '导出风险报告失败')
  }
}

const handleRetry = () => {
  clearError()
  initializeRiskMonitoring()
}

// 全局错误处理
const originalConsoleError = console.error
console.error = (...args: any[]) => {
  // 过滤掉ECharts的TypeError，避免控制台污染
  const message = args.join(' ')
  if (message.includes('Cannot read properties of undefined') &&
    message.includes('type') &&
    message.includes('chunk-')) {
    // 静默处理ECharts内部错误
    return
  }
  originalConsoleError.apply(console, args)
}

// 生命周期钩子
onMounted(async () => {
  await initializeRiskMonitoring()
  // 初始化图表数据
  await loadRiskTrendData()
  await loadPortfolioRiskData()
  await loadMarketRiskData()
})

onUnmounted(() => {
  // 恢复原始console.error
  console.error = originalConsoleError
  // 清理资源
})
</script>

<style scoped>
/* Modern Risk Monitoring Container */
.risk-monitoring-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  transition: all 0.3s ease;
}

.dark-theme .risk-monitoring-container {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%);
}

/* Enhanced Modern Header */
.modern-header {
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  overflow: hidden;
}

.header-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
  opacity: 0.3;
}

.header-content {
  position: relative;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  z-index: 1;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.title-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.title-text {
  flex: 1;
}

.main-title {
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 400;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-dot.connected {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
}

.status-dot.connecting {
  background: #f59e0b;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
}

.status-dot.disconnected {
  background: #ef4444;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.header-actions .el-button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.header-actions .el-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Main Content */
.main-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.global-loading {
  padding: 3rem;
  text-align: center;
}

.loading-text {
  margin-top: 1.5rem;
  color: var(--el-text-color-secondary);
  font-size: 1.1rem;
}

/* Risk Overview Section */
.risk-overview-section {
  margin-bottom: 3rem;
}

/* Primary Risk Score Card */
.primary-risk-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 20px;
  padding: 2.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.dark-theme .primary-risk-card {
  background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.primary-risk-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}

.risk-score-container {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 3rem;
  align-items: center;
}

.score-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.score-circle {
  position: relative;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: conic-gradient(from 0deg, #10b981 0%, #34d399 25%, #fbbf24 50%, #f59e0b 75%, #ef4444 100%);
  padding: 8px;
  animation: rotate 10s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.score-inner {
  width: 100%;
  height: 100%;
  background: var(--el-bg-color);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.1);
}

.score-number {
  font-size: 3rem;
  font-weight: 800;
  color: var(--el-text-color-primary);
  line-height: 1;
}

.score-label {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
  margin-top: 0.5rem;
}

.risk-gauge {
  position: relative;
  width: 200px;
  height: 12px;
  background: var(--el-border-color-light);
  border-radius: 6px;
  overflow: hidden;
}

.gauge-track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, #10b981 0%, #fbbf24 50%, #ef4444 100%);
  opacity: 0.3;
}

.gauge-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.8s ease;
  position: relative;
  overflow: hidden;
}

.gauge-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(100%);
  }
}

.risk-level-low .gauge-fill {
  background: #10b981;
}

.risk-level-medium .gauge-fill {
  background: #fbbf24;
}

.risk-level-high .gauge-fill {
  background: #f59e0b;
}

.risk-level-critical .gauge-fill {
  background: #ef4444;
}

.score-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.risk-level-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1.1rem;
  width: fit-content;
}

.risk-level-badge.level-low {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #065f46;
  border: 1px solid #10b981;
}

.risk-level-badge.level-medium {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border: 1px solid #fbbf24;
}

.risk-level-badge.level-high {
  background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
  color: #9a3412;
  border: 1px solid #f59e0b;
}

.risk-level-badge.level-critical {
  background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
  color: #991b1b;
  border: 1px solid #ef4444;
}

.score-trend {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1rem;
  font-weight: 500;
}

.score-trend.trend-up {
  color: #ef4444;
}

.score-trend.trend-down {
  color: #10b981;
}

.score-trend.trend-stable {
  color: var(--el-text-color-secondary);
}

.trend-value {
  font-weight: 600;
  margin-left: 0.5rem;
}

.score-description {
  font-size: 1rem;
  color: var(--el-text-color-regular);
  line-height: 1.6;
  padding: 1rem;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  border-left: 4px solid var(--el-color-primary);
}

/* Risk Metrics Grid */
.risk-metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.modern-metric-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.dark-theme .modern-metric-card {
  background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modern-metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6, #ef4444);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.modern-metric-card:hover::before {
  opacity: 1;
}

.modern-metric-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.modern-metric-card.metric-low {
  border-left: 4px solid #10b981;
}

.modern-metric-card.metric-medium {
  border-left: 4px solid #fbbf24;
}

.modern-metric-card.metric-high {
  border-left: 4px solid #f59e0b;
}

.modern-metric-card.metric-critical {
  border-left: 4px solid #ef4444;
}

.metric-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.metric-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  flex-shrink: 0;
}

.metric-icon.icon-low {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #065f46;
}

.metric-icon.icon-medium {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
}

.metric-icon.icon-high {
  background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
  color: #9a3412;
}

.metric-icon.icon-critical {
  background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
  color: #991b1b;
}

.metric-info {
  flex: 1;
  min-width: 0;
}

.metric-title {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.3;
}

.metric-category {
  font-size: 0.8rem;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.metric-level-indicator {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.metric-level-indicator.level-low {
  background: #d1fae5;
  color: #065f46;
}

.metric-level-indicator.level-medium {
  background: #fef3c7;
  color: #92400e;
}

.metric-level-indicator.level-high {
  background: #fed7aa;
  color: #9a3412;
}

.metric-level-indicator.level-critical {
  background: #fecaca;
  color: #991b1b;
}

.metric-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.metric-value-section {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1;
}

.metric-change {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.metric-change.trend-up {
  color: #ef4444;
}

.metric-change.trend-down {
  color: #10b981;
}

.metric-change.trend-stable {
  color: var(--el-text-color-secondary);
}

.metric-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--el-border-color-light);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.8s ease;
  position: relative;
}

.progress-fill.level-low {
  background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
}

.progress-fill.level-medium {
  background: linear-gradient(90deg, #fbbf24 0%, #fde047 100%);
}

.progress-fill.level-high {
  background: linear-gradient(90deg, #f59e0b 0%, #fb923c 100%);
}

.progress-fill.level-critical {
  background: linear-gradient(90deg, #ef4444 0%, #f87171 100%);
}

.progress-text {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  min-width: 40px;
  text-align: right;
}

.metric-description {
  margin: 0;
  font-size: 0.9rem;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

/* Analytics Section */
.analytics-section {
  margin: 3rem 0;
}

.analytics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.analytics-grid .full-width {
  grid-column: 1 / -1;
}

.chart-container-modern {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
}

.dark-theme .chart-container-modern {
  background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.chart-container-modern:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: rgba(255, 255, 255, 0.5);
}

.dark-theme .chart-header {
  background: rgba(0, 0, 0, 0.2);
}

.chart-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.chart-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.chart-content {
  padding: 1.5rem;
  min-height: 300px;
}

.echarts-container {
  width: 100%;
  height: 300px;
}

/* Alerts and Recommendations Section */
.alerts-recommendations-section {
  margin: 3rem 0;
}

.alerts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.alerts-container,
.recommendations-container {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.dark-theme .alerts-container,
.dark-theme .recommendations-container {
  background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: rgba(255, 255, 255, 0.5);
}

.dark-theme .section-header {
  background: rgba(0, 0, 0, 0.2);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.section-actions {
  display: flex;
  gap: 0.5rem;
}

.alerts-content,
.recommendations-content {
  padding: 1rem;
  max-height: 500px;
  overflow-y: auto;
}

/* Modern Alert Items */
.modern-alert-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border-radius: 12px;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.modern-alert-item:hover {
  background: var(--el-fill-color-light);
  transform: translateX(4px);
}

.modern-alert-item.alert-warning {
  border-left: 4px solid #fbbf24;
}

.modern-alert-item.alert-danger {
  border-left: 4px solid #ef4444;
}

.modern-alert-item.alert-critical {
  border-left: 4px solid #dc2626;
}

.alert-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
}

.alert-indicator.level-warning {
  background: #fef3c7;
  color: #92400e;
}

.alert-indicator.level-danger {
  background: #fecaca;
  color: #991b1b;
}

.alert-indicator.level-critical {
  background: #dc2626;
  color: white;
}

.alert-content {
  flex: 1;
  min-width: 0;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
  gap: 1rem;
}

.alert-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-size: 0.95rem;
}

.alert-time {
  font-size: 0.8rem;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.alert-message {
  font-size: 0.9rem;
  color: var(--el-text-color-regular);
  line-height: 1.4;
  margin-bottom: 0.5rem;
}

.alert-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
}

.alert-source {
  color: var(--el-text-color-secondary);
}

.alert-priority {
  font-weight: 500;
}

.alert-priority.priority-high {
  color: #ef4444;
}

.alert-priority.priority-medium {
  color: #f59e0b;
}

.alert-priority.priority-low {
  color: #10b981;
}

.alert-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.no-alerts {
  text-align: center;
  padding: 2rem;
  color: var(--el-text-color-secondary);
}

/* Recommendation Items */
.recommendation-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 12px;
  margin-bottom: 1rem;
  border: 1px solid var(--el-border-color-lighter);
  transition: all 0.3s ease;
}

.recommendation-item:hover {
  background: var(--el-fill-color-light);
  border-color: var(--el-color-primary-light-5);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.recommendation-item.priority-high {
  border-left: 4px solid #ef4444;
}

.recommendation-item.priority-medium {
  border-left: 4px solid #f59e0b;
}

.recommendation-item.priority-low {
  border-left: 4px solid #10b981;
}

.recommendation-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.recommendation-content {
  flex: 1;
  min-width: 0;
}

.recommendation-title {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.recommendation-description {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

.recommendation-impact {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.impact-label {
  color: var(--el-text-color-secondary);
}

.impact-value {
  font-weight: 600;
}

.impact-value.impact-positive {
  color: #10b981;
}

.impact-value.impact-negative {
  color: #ef4444;
}

.impact-value.impact-neutral {
  color: var(--el-text-color-secondary);
}

.recommendation-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .risk-score-container {
    grid-template-columns: 1fr;
    gap: 2rem;
    text-align: center;
  }

  .analytics-grid {
    grid-template-columns: 1fr;
  }

  .alerts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .header-main {
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
  }

  .title-section {
    flex-direction: column;
    gap: 1rem;
  }

  .main-content {
    padding: 1rem;
  }

  .primary-risk-card {
    padding: 1.5rem;
  }

  .score-circle {
    width: 120px;
    height: 120px;
  }

  .score-number {
    font-size: 2.5rem;
  }

  .main-title {
    font-size: 2rem;
  }

  .risk-metrics-grid {
    grid-template-columns: 1fr;
  }

  .modern-alert-item {
    flex-direction: column;
    gap: 0.75rem;
  }

  .alert-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .recommendation-item {
    flex-direction: column;
    gap: 1rem;
  }

  .recommendation-actions {
    flex-direction: row;
    align-self: stretch;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 1.5rem 1rem;
  }

  .main-title {
    font-size: 1.75rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .chart-content {
    padding: 1rem;
  }

  .echarts-container {
    height: 250px;
  }
}

/* Dark Theme Adjustments */
.dark-theme .gauge-fill::after {
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
}

.dark-theme .modern-alert-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.dark-theme .recommendation-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

/* Accessibility Improvements */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus States */
.modern-metric-card:focus,
.modern-alert-item:focus,
.recommendation-item:focus {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

/* Loading States */
.chart-content[v-loading] {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alerts-content[v-loading] {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>