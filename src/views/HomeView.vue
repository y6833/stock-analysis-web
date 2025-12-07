<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { stockService } from '@/services/stockService'
import type { Stock, StockQuote } from '@/types/stock'
import type { DataSourceType } from '@/services/dataSource/DataSourceFactory'
import DataSourceInfo from '@/components/common/DataSourceInfo.vue'
import { useToast } from '@/composables/useToast'
import eventBus from '@/utils/eventBus'
import { DataSourceFactory } from '@/services/dataSource/DataSourceFactory'
import { dataSourceStateManager } from '@/services/dataSourceStateManager'

const router = useRouter()
const { showToast } = useToast()
const popularStocks = ref<Stock[]>([])
const stockQuotes = ref<Map<string, StockQuote>>(new Map())
const isLoading = ref(true)
const isQuoteLoading = ref(false)
const activeCategory = ref('dashboard')

// 数据来源信息
const dataSource = ref('未知')
const dataSourceMessage = ref('数据来源未知')
const isRealTime = ref(false)
const isCache = ref(false)

// 格式化价格
const formatPrice = (price: number | undefined) => {
  if (!price) return '--'
  return price.toFixed(2)
}

// 格式化涨跌幅
const formatChange = (change: number | undefined) => {
  if (change === undefined || change === null) return '--'
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}`
}

// 格式化涨跌幅百分比
const formatChangePercent = (percent: number | undefined) => {
  if (percent === undefined || percent === null) return '--'
  const sign = percent >= 0 ? '+' : ''
  return `${sign}${percent.toFixed(2)}%`
}

// 获取涨跌颜色类
const getChangeClass = (change: number | undefined) => {
  if (change === undefined || change === null) return ''
  return change >= 0 ? 'positive' : 'negative'
}

// 获取热门股票和数据源信息
const fetchStocksAndUpdateInfo = async () => {
  isLoading.value = true

  try {
    // 获取所有股票并取前10个作为热门股票
    const result = await stockService.getStocks()

    // 检查返回结果
    if (!result || !Array.isArray(result)) {
      console.warn('获取股票列表返回格式异常:', result)
      popularStocks.value = []
      return
    }

    // 保存股票数据（取前10个作为热门股票）
    const stocks = Array.isArray(result) ? result : []
    popularStocks.value = stocks.slice(0, 10)

    console.log(`成功获取 ${stocks.length} 只股票，显示前 ${popularStocks.value.length} 只热门股票`)

    // 保存数据来源信息（从返回结果的扩展属性中获取）
    const resultWithMeta = result as any
    if (resultWithMeta.data_source) {
      dataSource.value = resultWithMeta.data_source
      dataSourceMessage.value = resultWithMeta.data_source_message || `数据来自${resultWithMeta.data_source}`
      isRealTime.value = resultWithMeta.is_real_time || false
      isCache.value = resultWithMeta.is_cache || false

      // 显示数据来源提示
      const sourceType = isRealTime.value ? '实时' : '缓存'
      const toastType = isRealTime.value ? 'success' : 'info'
      showToast(dataSourceMessage.value, toastType)

      console.log(`数据来源: ${dataSource.value}, ${sourceType}数据`)
    } else {
      // 如果没有数据源信息，使用默认值
      dataSource.value = '未知'
      dataSourceMessage.value = '数据来源未知'
      isRealTime.value = false
      isCache.value = false
    }

    // 获取股票行情数据
    if (popularStocks.value.length > 0) {
      await fetchStockQuotes()
    }
  } catch (error: any) {
    console.error('获取热门股票失败:', error)
    popularStocks.value = []

    // 显示错误提示
    const errorMessage = error?.message || '获取股票数据失败'
    showToast(errorMessage, 'error')
  } finally {
    isLoading.value = false
  }
}

// 获取股票行情数据
const fetchStockQuotes = async () => {
  if (popularStocks.value.length === 0) {
    console.log('没有股票数据，跳过行情获取')
    return
  }

  isQuoteLoading.value = true
  try {
    const currentDataSourceType = dataSourceStateManager.getCurrentDataSource()
    const currentDataSource = DataSourceFactory.createDataSource(currentDataSourceType)

    console.log(`开始获取 ${popularStocks.value.length} 只股票的行情数据，数据源: ${currentDataSourceType}`)

    // 并发获取所有股票的行情数据，限制并发数量避免过载
    const BATCH_SIZE = 5 // 每批处理5只股票
    const batches: Stock[][] = []

    for (let i = 0; i < popularStocks.value.length; i += BATCH_SIZE) {
      batches.push(popularStocks.value.slice(i, i + BATCH_SIZE))
    }

    // 逐批处理，避免并发过多
    for (const batch of batches) {
      const quotePromises = batch.map(async (stock) => {
        try {
          // 获取股票代码（确保格式正确）
          const symbol = stock.symbol || ''
          if (!symbol) {
            console.warn('股票代码为空，跳过:', stock)
            return null
          }

          const quote = await currentDataSource.getStockQuote(symbol)
          return { symbol, quote }
        } catch (error: any) {
          console.warn(`获取股票 ${stock.symbol} 行情失败:`, error?.message || error)
          return null
        }
      })

      const results = await Promise.allSettled(quotePromises)

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          stockQuotes.value.set(result.value.symbol, result.value.quote)
        }
      })

      // 批次间延迟，避免API限制
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    console.log(`成功获取 ${stockQuotes.value.size} 只股票的行情数据`)
  } catch (error: any) {
    console.error('批量获取股票行情失败:', error?.message || error)
  } finally {
    isQuoteLoading.value = false
  }
}

// 获取股票行情
const getStockQuote = (symbol: string): StockQuote | null => {
  return stockQuotes.value.get(symbol) || null
}

// 组件挂载时获取数据
onMounted(async () => {
  // 获取热门股票和数据源信息
  await fetchStocksAndUpdateInfo()

  // 监听数据源变化事件
  eventBus.on('data-source-changed', async (type: DataSourceType) => {
    console.log(`数据源已切换到: ${type}，正在更新数据...`)
    await fetchStocksAndUpdateInfo()
  })
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  // 移除事件监听
  eventBus.off('data-source-changed')
})

// 跳转到股票分析页面
const goToStockAnalysis = (symbol: string) => {
  router.push({
    path: '/stock',
    query: { symbol },
  })
}

// 功能分类数据
const featureCategories = ref([
  {
    id: 'dashboard',
    name: '数据仪表盘',
    icon: '📊',
    features: [
      {
        id: 'dashboard-basic',
        title: '基础仪表盘',
        description: '核心市场数据概览，快速了解市场动态',
        icon: '📊',
        path: '/dashboard',
        badge: '免费',
        badgeType: 'free',
        type: 'free'
      },
      {
        id: 'dashboard-advanced',
        title: '高级仪表盘',
        description: '专业级投资仪表盘，集成实时数据和智能分析',
        icon: '🚀',
        path: '/advanced-dashboard',
        badge: '高级',
        badgeType: 'premium',
        type: 'premium'
      },
      {
        id: 'realtime-monitor',
        title: '实时监控',
        description: 'WebSocket实时数据推送，市场异动即时提醒',
        icon: '⚡',
        path: '/stock/realtime-monitor',
        badge: '高级',
        badgeType: 'premium',
        type: 'premium'
      }
    ]
  },
  {
    id: 'analysis',
    name: '分析工具',
    icon: '📈',
    features: [
      {
        id: 'stock-analysis',
        title: '股票分析',
        description: '详细的技术指标分析和价格走势图表',
        icon: '📈',
        path: '/stock',
        badge: '免费',
        badgeType: 'free',
        type: 'free'
      },
      {
        id: 'market-heatmap',
        title: '大盘云图',
        description: '直观展示市场整体情况和行业板块趋势',
        icon: '🌎',
        path: '/market/heatmap',
        badge: '免费',
        badgeType: 'free',
        type: 'free'
      },
      {
        id: 'position-management',
        title: '仓位管理',
        description: '投资组合跟踪，收益风险监控和资产配置',
        icon: '💼',
        path: '/position-management',
        badge: '基础',
        badgeType: 'basic',
        type: 'basic'
      },
      {
        id: 'turtle-trading',
        title: '海龟交易法',
        description: '经典的趋势跟踪交易策略系统',
        icon: '🐢',
        path: '/strategies/turtle-trading',
        badge: '基础',
        badgeType: 'basic',
        type: 'basic'
      }
    ]
  },
  {
    id: 'intelligent',
    name: '智能工具',
    icon: '🤖',
    features: [
      {
        id: 'ai-recommendation',
        title: 'AI智能推荐',
        description: '基于机器学习算法的个性化股票推荐系统',
        icon: '🤖',
        path: '/strategies/smart-recommendation',
        badge: '基础',
        badgeType: 'basic',
        type: 'basic'
      },
      {
        id: 'doji-screener',
        title: '十字星选股',
        description: '专业的十字星形态识别与筛选工具',
        icon: '✨',
        path: '/doji-pattern/screener',
        badge: '基础',
        badgeType: 'basic',
        type: 'basic'
      },
      {
        id: 'smart-alerts',
        title: '智能提醒',
        description: '价格突破和技术指标信号的智能提醒',
        icon: '🔔',
        path: '/alerts',
        badge: '基础',
        badgeType: 'basic',
        type: 'basic'
      },
      {
        id: 'doji-alerts',
        title: '十字星提醒',
        description: '十字星形态出现时的专业提醒服务',
        icon: '⚡',
        path: '/doji-pattern/alerts',
        badge: '基础',
        badgeType: 'basic',
        type: 'basic'
      },
      {
        id: 'backtest',
        title: '策略回测',
        description: '历史数据验证投资策略，量化分析表现',
        icon: '🔄',
        path: '/backtest',
        badge: '高级',
        badgeType: 'premium',
        type: 'premium'
      },
      {
        id: 'risk-monitoring',
        title: '风险管理',
        description: '全方位的风险监控与控制系统',
        icon: '🛡️',
        path: '/risk/monitoring',
        badge: '高级',
        badgeType: 'premium',
        type: 'premium'
      },
      {
        id: 'simulation',
        title: '模拟交易',
        description: '虚拟交易环境，无风险练习投资策略',
        icon: '🎮',
        path: '/risk/simulation',
        badge: '高级',
        badgeType: 'premium',
        type: 'premium'
      }
    ]
  }
])

// 当前显示的功能列表
const currentFeatures = computed(() => {
  const category = featureCategories.value.find(cat => cat.id === activeCategory.value)
  return category ? category.features : []
})
</script>

<template>
  <main class="home-view">
    <!-- Hero 区域 -->
    <section class="hero">
      <div class="hero-background">
        <div class="hero-gradient"></div>
        <div class="hero-pattern"></div>
      </div>

      <div class="container">
        <div class="hero-content">
          <div class="hero-text">
            <div class="hero-badge">
              <span class="badge-icon">💎</span>
              <span class="badge-text">专业版 4.0</span>
              <span class="badge-new">NEW</span>
            </div>

            <h1 class="hero-title">
              <span class="title-main gradient-text">智能股票分析平台</span>
              <span class="title-sub">AI驱动的专业投资决策系统</span>
            </h1>

            <p class="hero-description">
              融合前沿人工智能技术与专业金融分析，为投资者提供全方位的市场洞察和决策支持。
              <strong class="highlight">让智能分析成就投资价值</strong>
            </p>

            <!-- 核心数据展示 -->
            <div class="hero-stats">
              <div class="stat-item">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                  <div class="stat-value">5,000+</div>
                  <div class="stat-label">A股全覆盖</div>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-icon">🔧</div>
                <div class="stat-content">
                  <div class="stat-value">50+</div>
                  <div class="stat-label">技术指标</div>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-icon">⚡</div>
                <div class="stat-content">
                  <div class="stat-value">实时</div>
                  <div class="stat-label">数据推送</div>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-icon">🎯</div>
                <div class="stat-content">
                  <div class="stat-value">99.9%</div>
                  <div class="stat-label">系统稳定性</div>
                </div>
              </div>
            </div>

            <!-- 快速入口按钮 -->
            <div class="hero-actions">
              <button class="btn btn-primary btn-lg" @click="router.push('/dashboard')">
                <span class="btn-icon">📊</span>
                <span>开始分析</span>
              </button>
              <button class="btn btn-outline btn-lg" @click="router.push('/strategies/smart-recommendation')">
                <span class="btn-icon">🤖</span>
                <span>AI推荐</span>
              </button>
            </div>
          </div>

          <div class="hero-visual">
            <div class="visual-container">
              <div class="chart-preview">
                <img src="@/assets/stock-chart.svg" alt="专业股票分析图表" class="chart-image" />
                <div class="chart-overlay">
                  <div class="data-point data-point-1">
                    <div class="point-value">+12.5%</div>
                    <div class="point-label">今日涨幅</div>
                  </div>
                  <div class="data-point data-point-2">
                    <div class="point-value">RSI: 65</div>
                    <div class="point-label">技术指标</div>
                  </div>
                  <div class="data-point data-point-3">
                    <div class="point-value">买入</div>
                    <div class="point-label">AI建议</div>
                  </div>
                </div>
              </div>
              <div class="floating-cards">
                <div class="floating-card card-1">
                  <div class="card-icon">📈</div>
                  <div class="card-text">实时监控</div>
                </div>
                <div class="floating-card card-2">
                  <div class="card-icon">🔔</div>
                  <div class="card-text">智能提醒</div>
                </div>
                <div class="floating-card card-3">
                  <div class="card-icon">💼</div>
                  <div class="card-text">组合管理</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 功能快捷入口 -->
    <section class="quick-access">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">功能快捷入口</h2>
          <p class="section-description">快速访问核心功能，提升投资效率</p>
        </div>

        <div class="quick-access-grid">
          <div class="quick-access-card primary" @click="router.push('/dashboard')">
            <div class="card-icon">📊</div>
            <div class="card-content">
              <h3>基础仪表盘</h3>
              <p>核心数据概览</p>
            </div>
            <div class="card-arrow">→</div>
          </div>

          <div class="quick-access-card premium" @click="router.push('/advanced-dashboard')">
            <div class="card-icon">🚀</div>
            <div class="card-content">
              <h3>高级仪表盘</h3>
              <p>专业级分析</p>
            </div>
            <span class="feature-badge premium">高级</span>
            <div class="card-arrow">→</div>
          </div>

          <div class="quick-access-card" @click="router.push('/strategies/smart-recommendation')">
            <div class="card-icon">🤖</div>
            <div class="card-content">
              <h3>AI智能推荐</h3>
              <p>智能选股建议</p>
            </div>
            <span class="feature-badge basic">基础</span>
            <div class="card-arrow">→</div>
          </div>

          <div class="quick-access-card" @click="router.push('/doji-pattern/screener')">
            <div class="card-icon">✨</div>
            <div class="card-content">
              <h3>十字星选股</h3>
              <p>形态筛选工具</p>
            </div>
            <span class="feature-badge basic">基础</span>
            <div class="card-arrow">→</div>
          </div>

          <div class="quick-access-card" @click="router.push('/stock')">
            <div class="card-icon">📈</div>
            <div class="card-content">
              <h3>股票分析</h3>
              <p>技术指标分析</p>
            </div>
            <div class="card-arrow">→</div>
          </div>

          <div class="quick-access-card" @click="router.push('/tools/export')">
            <div class="card-icon">📤</div>
            <div class="card-content">
              <h3>数据导出</h3>
              <p>导出分析数据</p>
            </div>
            <span class="feature-badge premium">高级</span>
            <div class="card-arrow">→</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 核心功能展示 - 全新布局 -->
    <section class="features-modern">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">核心功能</h2>
          <p class="section-description">专业的投资分析工具，助力您的投资决策</p>
        </div>

        <!-- 功能分类标签 -->
        <div class="feature-tabs">
          <button v-for="(category, index) in featureCategories" :key="category.id"
            :class="['tab-button', { active: activeCategory === category.id }]" @click="activeCategory = category.id">
            <span class="tab-icon">{{ category.icon }}</span>
            <span class="tab-text">{{ category.name }}</span>
            <span class="tab-count">{{ category.features.length }}</span>
          </button>
        </div>

        <!-- 功能卡片网格 -->
        <div class="features-grid">
          <div v-for="feature in currentFeatures" :key="feature.id" :class="['feature-card-modern', feature.type]"
            @click="router.push(feature.path)">
            <div class="feature-card-bg"></div>
            <div class="feature-card-content">
              <div class="feature-icon-wrapper">
                <div class="feature-icon">{{ feature.icon }}</div>
                <div class="feature-badge-modern" :class="feature.badgeType">
                  {{ feature.badge }}
                </div>
              </div>
              <div class="feature-info">
                <h3 class="feature-title">{{ feature.title }}</h3>
                <p class="feature-description">{{ feature.description }}</p>
              </div>
              <div class="feature-action">
                <span class="action-text">立即使用</span>
                <span class="action-arrow">→</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 热门股票区域 -->
    <section class="popular-stocks">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">热门股票</h2>
          <p class="section-description">实时行情数据，把握市场动态</p>
        </div>

        <!-- 数据来源信息 -->
        <DataSourceInfo v-if="!isLoading && dataSource !== '未知'" :dataSource="dataSource"
          :dataSourceMessage="dataSourceMessage" :isRealTime="isRealTime" :isCache="isCache"
          class="data-source-info-container" />

        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>正在加载热门股票...</p>
        </div>
        <div v-else-if="popularStocks.length === 0" class="empty-state">
          <div class="empty-icon">📊</div>
          <p class="empty-text">暂无热门股票数据</p>
          <button class="empty-button" @click="fetchStocksAndUpdateInfo">重新加载</button>
        </div>
        <div v-else class="stock-grid">
          <div v-for="stock in popularStocks" :key="stock.symbol" class="stock-card-modern"
            @click="goToStockAnalysis(stock.symbol)">
            <div class="stock-header">
              <div class="stock-title-group">
                <h3 class="stock-name">{{ stock.name }}</h3>
                <span class="stock-symbol">{{ stock.symbol }}</span>
              </div>
              <div class="stock-market-badge">{{ stock.market || 'A股' }}</div>
            </div>

            <div class="stock-price-section">
              <template v-if="getStockQuote(stock.symbol)">
                <div class="price-main" :class="getChangeClass(getStockQuote(stock.symbol)?.change)">
                  ¥{{ formatPrice(getStockQuote(stock.symbol)?.price) }}
                </div>
                <div class="price-change" :class="getChangeClass(getStockQuote(stock.symbol)?.change)">
                  <span class="change-value">{{ formatChange(getStockQuote(stock.symbol)?.change) }}</span>
                  <span class="change-percent">{{ formatChangePercent((getStockQuote(stock.symbol) as
                    any)?.changePercent || (getStockQuote(stock.symbol) as any)?.pct_chg) }}</span>
                </div>
              </template>
              <template v-else>
                <div class="price-main no-data">--</div>
                <div class="price-change no-data">暂无数据</div>
              </template>
            </div>

            <div class="stock-footer">
              <div class="stock-industry" v-if="stock.industry">
                <span class="industry-icon">🏢</span>
                <span>{{ stock.industry }}</span>
              </div>
              <div class="view-action">
                <span>查看详情</span>
                <span class="arrow-icon">→</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* ===== 首页样式 ===== */
.home-view {
  min-height: 100vh;
  background: var(--bg-primary);
  position: relative;
  overflow-x: hidden;
}

/* ===== 通用容器 ===== */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-6);
}

/* ===== Hero 区域 ===== */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.hero-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--gradient-hero);
  opacity: 0.95;
}

.hero-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
  background-size: 100px 100px, 150px 150px;
  animation: patternMove 20s ease-in-out infinite;
}

@keyframes patternMove {

  0%,
  100% {
    transform: translate(0, 0);
  }

  50% {
    transform: translate(20px, 20px);
  }
}

.hero-content {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-16);
  align-items: center;
  width: 100%;
}

/* Hero 文本区域 */
.hero-text {
  color: var(--text-inverse);
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  background: rgba(255, 255, 255, 0.15);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: var(--shadow-lg);
}

.badge-icon {
  font-size: var(--font-size-lg);
}

.badge-text {
  font-weight: var(--font-weight-semibold);
}

.badge-new {
  background: var(--gradient-warning);
  color: var(--text-inverse);
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  box-shadow: var(--shadow-sm);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {

  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

.hero-title {
  margin-bottom: var(--spacing-6);
}

.title-main {
  display: block;
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: var(--font-weight-black);
  line-height: var(--line-height-tight);
  margin-bottom: var(--spacing-2);
}

.title-sub {
  display: block;
  font-size: clamp(1.2rem, 2.5vw, 1.8rem);
  font-weight: var(--font-weight-normal);
  color: rgba(255, 255, 255, 0.9);
  font-style: italic;
}

.hero-description {
  font-size: var(--font-size-lg);
  line-height: var(--line-height-relaxed);
  margin-bottom: var(--spacing-8);
  color: rgba(255, 255, 255, 0.9);
}

.highlight {
  color: #ffd700;
  font-weight: var(--font-weight-semibold);
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
}

/* Hero 统计数据 */
.hero-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-8);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-xl);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: var(--transition-normal);
}

.stat-item:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.15);
  box-shadow: var(--shadow-xl);
}

.stat-icon {
  font-size: var(--font-size-2xl);
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-inverse);
  line-height: var(--line-height-tight);
  font-family: var(--font-family-number);
}

.stat-label {
  font-size: var(--font-size-sm);
  color: rgba(255, 255, 255, 0.8);
  font-weight: var(--font-weight-medium);
}

/* Hero 操作按钮 */
.hero-actions {
  display: flex;
  gap: var(--spacing-4);
  flex-wrap: wrap;
}

.btn-lg {
  padding: var(--spacing-4) var(--spacing-8);
  font-size: var(--font-size-base);
  min-height: 56px;
}

.btn-icon {
  font-size: var(--font-size-lg);
}

/* Hero 视觉区域 */
.hero-visual {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.visual-container {
  position: relative;
  width: 100%;
  max-width: 500px;
}

.chart-preview {
  position: relative;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-2xl);
  padding: var(--spacing-6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: var(--shadow-2xl);
}

.chart-image {
  width: 100%;
  height: auto;
  border-radius: var(--border-radius-lg);
  filter: brightness(1.1) contrast(1.1);
}

.chart-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.data-point {
  position: absolute;
  background: var(--gradient-accent);
  color: var(--text-inverse);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--border-radius-lg);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  box-shadow: var(--shadow-lg);
  animation: float 3s ease-in-out infinite;
}

.data-point-1 {
  top: 20%;
  right: 10%;
  animation-delay: 0s;
}

.data-point-2 {
  top: 50%;
  left: 5%;
  animation-delay: 1s;
}

.data-point-3 {
  bottom: 25%;
  right: 20%;
  animation-delay: 2s;
}

@keyframes float {

  0%,
  100% {
    transform: translateY(0px);
  }

  50% {
    transform: translateY(-10px);
  }
}

.point-value {
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-1);
}

.point-label {
  font-size: var(--font-size-xs);
  opacity: 0.9;
}

.floating-cards {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.floating-card {
  position: absolute;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-primary);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--border-radius-lg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(10px);
  animation: floatSlow 4s ease-in-out infinite;
}

.card-1 {
  top: 10%;
  left: -10%;
  animation-delay: 0s;
}

.card-2 {
  top: 60%;
  right: -15%;
  animation-delay: 1.5s;
}

.card-3 {
  bottom: 15%;
  left: -5%;
  animation-delay: 3s;
}

@keyframes floatSlow {

  0%,
  100% {
    transform: translate(0, 0);
  }

  50% {
    transform: translate(10px, -15px);
  }
}

.card-icon {
  font-size: var(--font-size-base);
}

.card-text {
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

/* ===== 快捷入口区域 ===== */
.quick-access {
  padding: var(--spacing-16) 0;
  background: var(--bg-secondary);
}

.section-header {
  text-align: center;
  margin-bottom: var(--spacing-12);
}

.section-title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-4);
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 4px;
  background: var(--gradient-accent);
  border-radius: var(--border-radius-full);
}

.section-description {
  font-size: var(--font-size-lg);
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto;
}

.quick-access-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-6);
}

.quick-access-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-6);
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-md);
  transition: var(--transition-normal);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.quick-access-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--gradient-accent);
  transform: scaleX(0);
  transition: transform var(--transition-normal);
}

.quick-access-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
  border-color: var(--accent-color);
}

.quick-access-card:hover::before {
  transform: scaleX(1);
}

.quick-access-card.primary {
  border-color: var(--primary-color);
}

.quick-access-card.premium {
  border-color: var(--warning-color);
  background: linear-gradient(135deg, var(--bg-primary) 0%, rgba(214, 158, 46, 0.05) 100%);
}

.quick-access-card .card-icon {
  font-size: var(--font-size-3xl);
  flex-shrink: 0;
}

.quick-access-card .card-content {
  flex: 1;
}

.quick-access-card h3 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-1);
}

.quick-access-card p {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}

.quick-access-card .card-arrow {
  font-size: var(--font-size-xl);
  color: var(--accent-color);
  transition: transform var(--transition-fast);
}

.quick-access-card:hover .card-arrow {
  transform: translateX(4px);
}

/* 现代化功能区域 */
.features-modern {
  padding: var(--spacing-20) 0;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  position: relative;
}

.features-modern::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-color), transparent);
}

/* 功能分类标签 */
.feature-tabs {
  display: flex;
  justify-content: center;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-12);
  flex-wrap: wrap;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-6);
  background: var(--bg-primary);
  border: 2px solid var(--border-light);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.tab-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: var(--gradient-accent);
  transition: left var(--transition-normal);
  z-index: 0;
}

.tab-button:hover {
  border-color: var(--accent-color);
  color: var(--text-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.tab-button.active {
  border-color: var(--accent-color);
  background: var(--gradient-accent);
  color: var(--text-inverse);
  box-shadow: var(--shadow-lg);
}

.tab-button.active::before {
  left: 0;
}

.tab-icon {
  font-size: var(--font-size-lg);
  z-index: 1;
  position: relative;
}

.tab-text {
  z-index: 1;
  position: relative;
}

.tab-count {
  padding: var(--spacing-1) var(--spacing-2);
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  z-index: 1;
  position: relative;
}

.tab-button.active .tab-count {
  background: rgba(255, 255, 255, 0.3);
}

/* 功能卡片网格 */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-6);
  margin-top: var(--spacing-8);
}

/* 现代化功能卡片 */
.feature-card-modern {
  position: relative;
  background: var(--bg-primary);
  border-radius: var(--border-radius-2xl);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
  cursor: pointer;
  transition: all var(--transition-normal);
  overflow: hidden;
  min-height: 240px;
  display: flex;
  flex-direction: column;
}

.feature-card-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0;
  transition: opacity var(--transition-normal);
  z-index: 0;
}

.feature-card-modern.free .feature-card-bg {
  background: linear-gradient(135deg, rgba(72, 187, 120, 0.05) 0%, transparent 100%);
}

.feature-card-modern.basic .feature-card-bg {
  background: linear-gradient(135deg, rgba(66, 153, 225, 0.05) 0%, transparent 100%);
}

.feature-card-modern.premium .feature-card-bg {
  background: linear-gradient(135deg, rgba(214, 158, 46, 0.05) 0%, transparent 100%);
}

.feature-card-modern:hover .feature-card-bg {
  opacity: 1;
}

.feature-card-modern::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--gradient-accent);
  transform: scaleX(0);
  transition: transform var(--transition-normal);
  z-index: 1;
}

.feature-card-modern.free::before {
  background: linear-gradient(90deg, #48bb78, #38a169);
}

.feature-card-modern.basic::before {
  background: linear-gradient(90deg, #4299e1, #3182ce);
}

.feature-card-modern.premium::before {
  background: linear-gradient(90deg, #d69e2e, #b7791f);
}

.feature-card-modern:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-2xl);
  border-color: var(--accent-color);
}

.feature-card-modern:hover::before {
  transform: scaleX(1);
}

.feature-card-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.feature-icon-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-4);
}

.feature-icon {
  font-size: var(--font-size-4xl);
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-accent);
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-lg);
  position: relative;
}

.feature-card-modern.free .feature-icon {
  background: linear-gradient(135deg, #48bb78, #38a169);
}

.feature-card-modern.basic .feature-icon {
  background: linear-gradient(135deg, #4299e1, #3182ce);
}

.feature-card-modern.premium .feature-icon {
  background: linear-gradient(135deg, #d69e2e, #b7791f);
}

.feature-badge-modern {
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.feature-badge-modern.free {
  background: linear-gradient(135deg, #48bb78, #38a169);
  color: white;
}

.feature-badge-modern.basic {
  background: linear-gradient(135deg, #4299e1, #3182ce);
  color: white;
}

.feature-badge-modern.premium {
  background: linear-gradient(135deg, #d69e2e, #b7791f);
  color: white;
}

.feature-info {
  flex: 1;
  margin-bottom: var(--spacing-4);
}

.feature-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-2);
  line-height: 1.3;
}

.feature-description {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.feature-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--border-light);
  color: var(--accent-color);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.action-arrow {
  font-size: var(--font-size-lg);
  transition: transform var(--transition-fast);
}

.feature-card-modern:hover .action-arrow {
  transform: translateX(4px);
}

.feature-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-normal);
  border: 1px solid var(--border-light);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-accent);
  transform: scaleX(0);
  transition: transform var(--transition-normal);
}

.feature-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-xl);
  border-color: var(--accent-color);
}

.feature-card:hover::before {
  transform: scaleX(1);
}

.feature-card.premium-card {
  border-color: var(--warning-color);
  background: linear-gradient(135deg, var(--bg-primary) 0%, rgba(214, 158, 46, 0.05) 100%);
}

.feature-card.basic-card {
  border-color: var(--success-color);
  background: linear-gradient(135deg, var(--bg-primary) 0%, rgba(72, 187, 120, 0.05) 100%);
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.feature-card .icon {
  font-size: var(--font-size-2xl);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-accent);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.feature-card h4 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
  flex: 1;
}

.feature-card p {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: var(--spacing-4);
  flex: 1;
  font-size: var(--font-size-sm);
}

.card-footer {
  margin-top: auto;
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.feature-badge,
.access-level {
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.feature-badge.basic,
.access-level.free {
  background: var(--gradient-success);
  color: var(--text-inverse);
}

.feature-badge.premium {
  background: var(--gradient-premium);
  color: var(--text-inverse);
}

/* 热门股票区域 */
.popular-stocks {
  padding: var(--spacing-20) 0;
  background: linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  position: relative;
  overflow: hidden;
}

.popular-stocks::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-color), transparent);
}

/* 数据来源信息容器 */
.data-source-info-container {
  max-width: 600px;
  margin: 0 auto var(--spacing-8);
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-16) 0;
  gap: var(--spacing-4);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-light);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p {
  color: var(--text-secondary);
  font-size: var(--font-size-base);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-16) 0;
  gap: var(--spacing-4);
}

.empty-icon {
  font-size: var(--font-size-4xl);
  opacity: 0.5;
  margin-bottom: var(--spacing-2);
}

.empty-text {
  color: var(--text-secondary);
  font-size: var(--font-size-lg);
  margin: 0;
}

.empty-button {
  margin-top: var(--spacing-4);
  padding: var(--spacing-3) var(--spacing-6);
  background: var(--gradient-accent);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--border-radius-lg);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-normal);
}

.empty-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* 股票网格 */
.stock-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-6);
  margin-top: var(--spacing-8);
}

/* 现代化股票卡片 */
.stock-card-modern {
  background: var(--bg-primary);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-normal);
  cursor: pointer;
  border: 1px solid var(--border-light);
  position: relative;
  overflow: hidden;
}

.stock-card-modern::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-accent);
  transform: scaleX(0);
  transition: transform var(--transition-normal);
}

.stock-card-modern:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-xl);
  border-color: var(--accent-color);
}

.stock-card-modern:hover::before {
  transform: scaleX(1);
}

/* 股票头部 */
.stock-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-4);
}

.stock-title-group {
  flex: 1;
}

.stock-name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-1);
  line-height: 1.3;
}

.stock-symbol {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-family: var(--font-family-mono);
  letter-spacing: 0.5px;
}

.stock-market-badge {
  padding: var(--spacing-1) var(--spacing-2);
  background: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

/* 价格区域 */
.stock-price-section {
  margin: var(--spacing-6) 0;
  padding: var(--spacing-4) 0;
  border-top: 1px solid var(--border-light);
  border-bottom: 1px solid var(--border-light);
}

.price-main {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-2);
  font-family: var(--font-family-number);
  line-height: 1.2;
}

.price-main.positive {
  color: #f56565;
}

.price-main.negative {
  color: #48bb78;
}

.price-main.no-data {
  color: var(--text-muted);
  font-size: var(--font-size-xl);
}

.price-change {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

.price-change.positive {
  color: #f56565;
}

.price-change.negative {
  color: #48bb78;
}

.price-change.no-data {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.change-value {
  font-family: var(--font-family-number);
}

.change-percent {
  padding: var(--spacing-1) var(--spacing-2);
  background: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
}

.price-change.positive .change-percent {
  background: rgba(245, 101, 101, 0.1);
}

.price-change.negative .change-percent {
  background: rgba(72, 187, 120, 0.1);
}

/* 股票底部 */
.stock-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-4);
}

.stock-industry {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.industry-icon {
  font-size: var(--font-size-base);
}

.view-action {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  color: var(--accent-color);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-fast);
}

.stock-card-modern:hover .view-action {
  gap: var(--spacing-3);
}

.arrow-icon {
  transition: transform var(--transition-fast);
  font-size: var(--font-size-lg);
}

.stock-card-modern:hover .arrow-icon {
  transform: translateX(4px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hero {
    flex-direction: column;
    padding: var(--spacing-md);
  }

  .hero-content {
    text-align: center;
  }

  .hero-content p {
    max-width: 100%;
  }

  .hero-stats {
    justify-content: center;
  }

  .hero-buttons {
    justify-content: center;
  }

  .hero-image {
    margin-top: var(--spacing-lg);
  }

  .main-image {
    transform: none;
  }

  .hero:hover .main-image {
    transform: none;
  }
}

/* ===== 响应式设计 ===== */
@media (max-width: 1024px) {
  .hero-content {
    grid-template-columns: 1fr;
    gap: var(--spacing-12);
    text-align: center;
  }

  .hero-visual {
    order: -1;
  }

  .quick-access-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  .category-cards {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 var(--spacing-4);
  }

  .hero {
    min-height: 80vh;
    padding: var(--spacing-8) 0;
  }

  .hero-stats {
    grid-template-columns: 1fr;
    gap: var(--spacing-3);
  }

  .hero-actions {
    justify-content: center;
  }

  .btn-lg {
    padding: var(--spacing-3) var(--spacing-6);
    min-height: 48px;
  }

  .title-main {
    font-size: clamp(2rem, 8vw, 3rem);
  }

  .title-sub {
    font-size: clamp(1rem, 4vw, 1.5rem);
  }

  .quick-access-grid {
    grid-template-columns: 1fr;
  }

  .category-cards {
    grid-template-columns: 1fr;
  }

  .feature-categories {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-12);
  }

  .feature-category {
    background: var(--bg-primary);
    border-radius: var(--border-radius-xl);
    padding: var(--spacing-8);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-light);
  }

  .category-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    margin-bottom: var(--spacing-6);
    padding-bottom: var(--spacing-4);
    border-bottom: 2px solid var(--border-light);
  }

  .category-icon {
    font-size: var(--font-size-2xl);
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gradient-accent);
    border-radius: var(--border-radius-lg);
    box-shadow: var(--shadow-sm);
  }

  .category-title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
  }

  .category-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-6);
  }

  .floating-cards {
    display: none;
  }

  .stock-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-4);
  }

  .stock-card-modern {
    padding: var(--spacing-4);
  }

  .price-main {
    font-size: var(--font-size-xl);
  }
}

@media (max-width: 480px) {
  .hero-badge {
    font-size: var(--font-size-xs);
    padding: var(--spacing-1) var(--spacing-3);
  }

  .hero-description {
    font-size: var(--font-size-base);
  }

  .section-title {
    font-size: var(--font-size-2xl);
  }

  .section-description {
    font-size: var(--font-size-base);
  }

  .quick-access-card {
    padding: var(--spacing-4);
  }

  .feature-card {
    padding: var(--spacing-4);
  }
}
</style>
