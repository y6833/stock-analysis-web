<template>
  <div class="smart-recommendation">
    <div class="recommendation-header">
      <h3 class="header-title">
        <span class="title-icon">🤖</span>
        AI智能推荐
      </h3>
      <div class="header-controls">
        <el-select v-model="selectedStrategy" size="small" @change="onStrategyChange">
          <el-option label="价值投资" value="value" />
          <el-option label="成长投资" value="growth" />
          <el-option label="技术分析" value="technical" />
          <el-option label="量化策略" value="quantitative" />
        </el-select>
        <el-button size="small" @click="refreshRecommendations" :loading="isLoading">
          <span class="refresh-icon">🔄</span>
          刷新
        </el-button>
      </div>
    </div>

    <div class="recommendation-content">
      <!-- 推荐概览 -->
      <div class="recommendation-overview">
        <div class="overview-card" v-for="overview in overviewData" :key="overview.type">
          <div class="overview-icon" :style="{ backgroundColor: overview.color }">
            {{ overview.icon }}
          </div>
          <div class="overview-content">
            <div class="overview-title">{{ overview.title }}</div>
            <div class="overview-value">{{ overview.value }}</div>
            <div class="overview-change" :class="overview.changeClass">
              {{ overview.change }}
            </div>
          </div>
        </div>
      </div>

      <!-- 推荐股票列表 -->
      <div class="recommendations-list">
        <div class="list-header">
          <h4>推荐股票</h4>
          <div class="sort-controls">
            <el-select v-model="sortBy" size="small" @change="sortRecommendations">
              <el-option label="推荐度" value="score" />
              <el-option label="涨跌幅" value="change" />
              <el-option label="成交量" value="volume" />
              <el-option label="市值" value="marketCap" />
            </el-select>
          </div>
        </div>

        <div class="recommendations-grid">
          <div 
            v-for="stock in sortedRecommendations" 
            :key="stock.symbol"
            class="recommendation-card"
            @click="viewStockDetail(stock)"
          >
            <div class="card-header">
              <div class="stock-info">
                <div class="stock-name">{{ stock.name }}</div>
                <div class="stock-symbol">{{ stock.symbol }}</div>
              </div>
              <div class="recommendation-score">
                <div class="score-circle" :style="{ background: getScoreColor(stock.score) }">
                  {{ stock.score }}
                </div>
                <div class="score-label">推荐度</div>
              </div>
            </div>

            <div class="card-content">
              <div class="price-info">
                <div class="current-price">¥{{ stock.price }}</div>
                <div class="price-change" :class="stock.changeClass">
                  {{ stock.change }}%
                </div>
              </div>

              <div class="recommendation-reasons">
                <div class="reason-title">推荐理由:</div>
                <div class="reasons-list">
                  <span 
                    v-for="reason in stock.reasons" 
                    :key="reason"
                    class="reason-tag"
                  >
                    {{ reason }}
                  </span>
                </div>
              </div>

              <div class="technical-indicators">
                <div class="indicator" v-for="indicator in stock.indicators" :key="indicator.name">
                  <span class="indicator-name">{{ indicator.name }}:</span>
                  <span class="indicator-value" :class="indicator.class">
                    {{ indicator.value }}
                  </span>
                </div>
              </div>

              <div class="action-buttons">
                <el-button size="small" type="primary" @click.stop="addToWatchlist(stock)">
                  <span>⭐</span> 关注
                </el-button>
                <el-button size="small" @click.stop="viewAnalysis(stock)">
                  <span>📊</span> 分析
                </el-button>
                <el-button size="small" @click.stop="setAlert(stock)">
                  <span>🔔</span> 提醒
                </el-button>
              </div>
            </div>

            <div class="card-footer">
              <div class="recommendation-type">
                <span class="type-badge" :class="stock.type">
                  {{ getTypeLabel(stock.type) }}
                </span>
              </div>
              <div class="confidence-level">
                <div class="confidence-bar">
                  <div 
                    class="confidence-fill" 
                    :style="{ width: stock.confidence + '%' }"
                  ></div>
                </div>
                <span class="confidence-text">{{ stock.confidence }}% 置信度</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 市场洞察 -->
      <div class="market-insights">
        <h4>市场洞察</h4>
        <div class="insights-grid">
          <div v-for="insight in marketInsights" :key="insight.id" class="insight-card">
            <div class="insight-header">
              <span class="insight-icon">{{ insight.icon }}</span>
              <span class="insight-title">{{ insight.title }}</span>
              <span class="insight-time">{{ insight.time }}</span>
            </div>
            <div class="insight-content">{{ insight.content }}</div>
            <div class="insight-impact" :class="insight.impactClass">
              影响程度: {{ insight.impact }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 响应式数据
const selectedStrategy = ref('technical')
const sortBy = ref('score')
const isLoading = ref(false)

// 推荐概览数据
const overviewData = ref([
  {
    type: 'strong_buy',
    icon: '🚀',
    title: '强烈推荐',
    value: '12',
    change: '+3',
    changeClass: 'positive',
    color: '#e74c3c'
  },
  {
    type: 'buy',
    icon: '📈',
    title: '推荐买入',
    value: '25',
    change: '+5',
    changeClass: 'positive',
    color: '#2ecc71'
  },
  {
    type: 'hold',
    icon: '⏸️',
    title: '持有观望',
    value: '18',
    change: '-2',
    changeClass: 'negative',
    color: '#f39c12'
  },
  {
    type: 'sell',
    icon: '📉',
    title: '建议卖出',
    value: '8',
    change: '+1',
    changeClass: 'positive',
    color: '#95a5a6'
  }
])

// 推荐股票数据
const recommendations = ref([
  {
    symbol: '000001',
    name: '平安银行',
    price: 12.45,
    change: 2.3,
    changeClass: 'positive',
    score: 85,
    type: 'strong_buy',
    confidence: 88,
    reasons: ['技术突破', '业绩增长', '估值合理'],
    indicators: [
      { name: 'RSI', value: '65', class: 'neutral' },
      { name: 'MACD', value: '金叉', class: 'positive' },
      { name: 'KDJ', value: '超买', class: 'warning' }
    ]
  },
  {
    symbol: '600519',
    name: '贵州茅台',
    price: 1845.67,
    change: -1.2,
    changeClass: 'negative',
    score: 78,
    type: 'buy',
    confidence: 82,
    reasons: ['基本面强劲', '行业龙头', '长期价值'],
    indicators: [
      { name: 'RSI', value: '45', class: 'positive' },
      { name: 'MACD', value: '死叉', class: 'negative' },
      { name: 'KDJ', value: '超卖', class: 'positive' }
    ]
  },
  {
    symbol: '000858',
    name: '五粮液',
    price: 156.78,
    change: 0.8,
    changeClass: 'positive',
    score: 72,
    type: 'buy',
    confidence: 75,
    reasons: ['消费复苏', '品牌价值', '渠道优势'],
    indicators: [
      { name: 'RSI', value: '55', class: 'neutral' },
      { name: 'MACD', value: '金叉', class: 'positive' },
      { name: 'KDJ', value: '中性', class: 'neutral' }
    ]
  }
])

// 市场洞察数据
const marketInsights = ref([
  {
    id: 1,
    icon: '📊',
    title: '银行板块异动',
    content: '银行板块今日集体上涨，主要受益于央行降准预期和净息差改善预期',
    time: '10分钟前',
    impact: '高',
    impactClass: 'high'
  },
  {
    id: 2,
    icon: '🏭',
    title: '制造业PMI超预期',
    content: '制造业PMI指数连续三个月回升，显示经济复苏势头良好',
    time: '30分钟前',
    impact: '中',
    impactClass: 'medium'
  },
  {
    id: 3,
    icon: '💰',
    title: '外资持续流入',
    content: '北向资金连续5日净流入，累计流入超过200亿元',
    time: '1小时前',
    impact: '中',
    impactClass: 'medium'
  }
])

// 计算属性
const sortedRecommendations = computed(() => {
  const sorted = [...recommendations.value]
  
  switch (sortBy.value) {
    case 'score':
      return sorted.sort((a, b) => b.score - a.score)
    case 'change':
      return sorted.sort((a, b) => b.change - a.change)
    case 'volume':
      // 这里应该根据实际成交量排序
      return sorted
    case 'marketCap':
      // 这里应该根据实际市值排序
      return sorted
    default:
      return sorted
  }
})

// 方法
const onStrategyChange = () => {
  refreshRecommendations()
}

const refreshRecommendations = async () => {
  isLoading.value = true
  // 模拟API调用
  setTimeout(() => {
    isLoading.value = false
  }, 1500)
}

const sortRecommendations = () => {
  // 排序逻辑已在计算属性中处理
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'linear-gradient(135deg, #e74c3c, #c0392b)'
  if (score >= 70) return 'linear-gradient(135deg, #2ecc71, #27ae60)'
  if (score >= 60) return 'linear-gradient(135deg, #f39c12, #e67e22)'
  return 'linear-gradient(135deg, #95a5a6, #7f8c8d)'
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    strong_buy: '强烈推荐',
    buy: '推荐买入',
    hold: '持有观望',
    sell: '建议卖出'
  }
  return labels[type] || type
}

const viewStockDetail = (stock: any) => {
  router.push({
    path: '/stock',
    query: { symbol: stock.symbol }
  })
}

const addToWatchlist = (stock: any) => {
  // 添加到关注列表的逻辑
  console.log('添加到关注列表:', stock.symbol)
}

const viewAnalysis = (stock: any) => {
  router.push({
    path: '/stock',
    query: { symbol: stock.symbol, tab: 'analysis' }
  })
}

const setAlert = (stock: any) => {
  // 设置价格提醒的逻辑
  console.log('设置提醒:', stock.symbol)
}

onMounted(() => {
  refreshRecommendations()
})
</script>

<style scoped>
.smart-recommendation {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.recommendation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-primary));
  border-bottom: 1px solid var(--border-light);
}

.header-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--primary-color);
}

.title-icon {
  font-size: 1.5em;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.refresh-icon {
  margin-right: var(--spacing-xs);
}

.recommendation-content {
  padding: var(--spacing-lg);
}

.recommendation-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.overview-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
  transition: all var(--transition-normal);
}

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.overview-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5em;
  color: white;
}

.overview-content {
  flex: 1;
}

.overview-title {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.overview-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.overview-change {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.overview-change.positive {
  color: var(--success-color);
}

.overview-change.negative {
  color: var(--error-color);
}

.recommendations-list {
  margin-bottom: var(--spacing-xl);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.list-header h4 {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--primary-color);
}

.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: var(--spacing-lg);
}

.recommendation-card {
  background: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--border-light);
  overflow: hidden;
  transition: all var(--transition-normal);
  cursor: pointer;
}

.recommendation-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
  border-color: var(--accent-light);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-light);
}

.stock-info {
  flex: 1;
}

.stock-name {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.stock-symbol {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.recommendation-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.score-circle {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: var(--font-size-md);
}

.score-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.card-content {
  padding: var(--spacing-md);
}

.price-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.current-price {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.price-change {
  font-size: var(--font-size-md);
  font-weight: 600;
}

.price-change.positive {
  color: var(--success-color);
}

.price-change.negative {
  color: var(--error-color);
}

.recommendation-reasons {
  margin-bottom: var(--spacing-md);
}

.reason-title {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.reasons-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.reason-tag {
  padding: 2px 8px;
  background: var(--accent-light);
  color: var(--accent-color);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.technical-indicators {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.indicator {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.indicator-name {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.indicator-value {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.indicator-value.positive {
  color: var(--success-color);
}

.indicator-value.negative {
  color: var(--error-color);
}

.indicator-value.neutral {
  color: var(--text-secondary);
}

.indicator-value.warning {
  color: var(--warning-color);
}

.action-buttons {
  display: flex;
  gap: var(--spacing-sm);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background: var(--bg-primary);
  border-top: 1px solid var(--border-light);
}

.type-badge {
  padding: 4px 8px;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.type-badge.strong_buy {
  background: var(--error-light);
  color: var(--error-color);
}

.type-badge.buy {
  background: var(--success-light);
  color: var(--success-color);
}

.type-badge.hold {
  background: var(--warning-light);
  color: var(--warning-color);
}

.type-badge.sell {
  background: var(--info-light);
  color: var(--info-color);
}

.confidence-level {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.confidence-bar {
  width: 60px;
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: var(--accent-color);
  transition: width var(--transition-normal);
}

.confidence-text {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.market-insights h4 {
  margin: 0 0 var(--spacing-lg) 0;
  font-size: var(--font-size-lg);
  color: var(--primary-color);
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-md);
}

.insight-card {
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
}

.insight-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.insight-icon {
  font-size: 1.2em;
}

.insight-title {
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.insight-time {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.insight-content {
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: var(--spacing-sm);
}

.insight-impact {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.insight-impact.high {
  color: var(--error-color);
}

.insight-impact.medium {
  color: var(--warning-color);
}

.insight-impact.low {
  color: var(--info-color);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .recommendation-header {
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .recommendations-grid {
    grid-template-columns: 1fr;
  }
  
  .insights-grid {
    grid-template-columns: 1fr;
  }
}
</style>
