<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { stockService } from '@/services/stockService'
import type { Stock } from '@/types/stock'
import * as echarts from 'echarts'

const router = useRouter()
const popularStocks = ref<Stock[]>([])
const watchlistStocks = ref<Stock[]>([])
const marketIndices = ref<any[]>([])
const newsItems = ref<any[]>([])
const isLoading = ref(true)
const marketTrend = ref<string>('up') // 'up', 'down', 'neutral'
const marketSentiment = ref<string>('bullish') // 'bullish', 'bearish', 'neutral'
const marketOverviewChart = ref<HTMLElement | null>(null)
const chart = ref<echarts.ECharts | null>(null)

// 获取市场数据
onMounted(async () => {
  try {
    // 获取所有股票并取前10个作为热门股票
    const stocks = await stockService.getStocks()
    popularStocks.value = stocks.slice(0, 10)
    
    // 模拟关注列表数据
    watchlistStocks.value = stocks.slice(10, 15).map(stock => ({
      ...stock,
      price: Math.random() * 100 + 10,
      change: (Math.random() * 10 - 5).toFixed(2),
      volume: Math.floor(Math.random() * 10000000)
    }))
    
    // 模拟市场指数数据
    marketIndices.value = [
      { name: '上证指数', code: '000001.SH', value: 3250.78, change: '+0.85%', status: 'up' },
      { name: '深证成指', code: '399001.SZ', value: 10876.54, change: '+1.12%', status: 'up' },
      { name: '创业板指', code: '399006.SZ', value: 2145.32, change: '-0.32%', status: 'down' },
      { name: '沪深300', code: '000300.SH', value: 4021.45, change: '+0.67%', status: 'up' },
    ]
    
    // 模拟新闻数据
    newsItems.value = [
      { title: '央行宣布降准0.5个百分点，释放长期资金约1万亿元', time: '10分钟前', source: '财经日报', url: '#', important: true },
      { title: '科技板块全线上涨，半导体行业领涨', time: '30分钟前', source: '证券时报', url: '#' },
      { title: '多家券商上调A股目标位，看好下半年行情', time: '1小时前', source: '上海证券报', url: '#' },
      { title: '外资连续三日净流入，北向资金今日净买入超50亿', time: '2小时前', source: '中国证券报', url: '#' },
      { title: '新能源汽车销量创新高，相关概念股受关注', time: '3小时前', source: '第一财经', url: '#' },
    ]
    
    // 随机设置市场趋势和情绪
    marketTrend.value = ['up', 'down', 'neutral'][Math.floor(Math.random() * 3)]
    marketSentiment.value = ['bullish', 'bearish', 'neutral'][Math.floor(Math.random() * 3)]
    
    // 初始化市场概览图表
    initMarketOverviewChart()
  } catch (error) {
    console.error('获取数据失败:', error)
  } finally {
    isLoading.value = false
  }
})

// 初始化市场概览图表
const initMarketOverviewChart = () => {
  if (!marketOverviewChart.value) return
  
  if (chart.value) {
    chart.value.dispose()
  }
  
  chart.value = echarts.init(marketOverviewChart.value)
  
  // 模拟上证指数数据
  const dates = []
  const data = []
  const volumes = []
  
  // 生成30天的模拟数据
  const baseValue = 3200
  let value = baseValue
  
  for (let i = 0; i < 30; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (30 - i))
    dates.push([date.getMonth() + 1, date.getDate()].join('/'))
    
    value = value + Math.random() * 50 - 25
    data.push(value.toFixed(2))
    
    volumes.push(Math.floor(Math.random() * 500000000 + 100000000))
  }
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      scale: true,
      boundaryGap: false,
      axisLine: { onZero: false },
      splitLine: { show: false },
      axisLabel: {
        formatter: function (value) {
          return value
        }
      }
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitArea: { show: true }
    },
    dataZoom: [
      {
        type: 'inside',
        start: 50,
        end: 100
      },
      {
        show: true,
        type: 'slider',
        bottom: '0%',
        start: 50,
        end: 100
      }
    ],
    series: [
      {
        name: '上证指数',
        type: 'line',
        data: data,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          width: 2,
          color: '#e74c3c'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(231, 76, 60, 0.3)'
            },
            {
              offset: 1,
              color: 'rgba(231, 76, 60, 0.1)'
            }
          ])
        }
      }
    ]
  }
  
  chart.value.setOption(option)
  
  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    chart.value?.resize()
  })
}

// 跳转到股票分析页面
const goToStockAnalysis = (symbol: string) => {
  router.push({
    path: '/stock',
    query: { symbol },
  })
}

// 计算市场趋势图标和颜色
const marketTrendIcon = computed(() => {
  switch (marketTrend.value) {
    case 'up': return '📈'
    case 'down': return '📉'
    case 'neutral': return '📊'
    default: return '📊'
  }
})

const marketTrendColor = computed(() => {
  switch (marketTrend.value) {
    case 'up': return 'var(--stock-up)'
    case 'down': return 'var(--stock-down)'
    case 'neutral': return 'var(--text-primary)'
    default: return 'var(--text-primary)'
  }
})

// 计算市场情绪图标和颜色
const marketSentimentIcon = computed(() => {
  switch (marketSentiment.value) {
    case 'bullish': return '🐂'
    case 'bearish': return '🐻'
    case 'neutral': return '🦊'
    default: return '🦊'
  }
})

const marketSentimentColor = computed(() => {
  switch (marketSentiment.value) {
    case 'bullish': return 'var(--stock-up)'
    case 'bearish': return 'var(--stock-down)'
    case 'neutral': return 'var(--text-primary)'
    default: return 'var(--text-primary)'
  }
})

// 格式化数字
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('zh-CN').format(num)
}

// 添加到关注列表
const addToWatchlist = (stock: Stock) => {
  // 实际应用中，这里应该调用API将股票添加到用户的关注列表
  console.log('添加到关注列表:', stock)
}
</script>

<template>
  <div class="dashboard-view">
    <div class="dashboard-header">
      <h1>市场仪表盘</h1>
      <div class="dashboard-actions">
        <button class="btn btn-outline">
          <span class="btn-icon">🔄</span>
          <span>刷新数据</span>
        </button>
        <button class="btn btn-outline">
          <span class="btn-icon">⚙️</span>
          <span>设置</span>
        </button>
      </div>
    </div>
    
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>正在加载市场数据...</p>
    </div>
    
    <div v-else class="dashboard-grid">
      <!-- 市场概览 -->
      <div class="dashboard-card market-overview">
        <div class="card-header">
          <h2>市场概览</h2>
          <div class="card-actions">
            <button class="btn-icon-only">
              <span>📅</span>
            </button>
            <button class="btn-icon-only">
              <span>⚙️</span>
            </button>
          </div>
        </div>
        
        <div class="market-indices">
          <div v-for="index in marketIndices" :key="index.code" class="market-index">
            <div class="index-name">{{ index.name }}</div>
            <div class="index-value">{{ index.value }}</div>
            <div class="index-change" :class="index.status">{{ index.change }}</div>
          </div>
        </div>
        
        <div class="market-chart-container">
          <div ref="marketOverviewChart" class="market-chart"></div>
        </div>
        
        <div class="market-indicators">
          <div class="market-indicator">
            <div class="indicator-label">市场趋势</div>
            <div class="indicator-value" :style="{ color: marketTrendColor }">
              <span class="indicator-icon">{{ marketTrendIcon }}</span>
              <span>{{ marketTrend === 'up' ? '上涨' : marketTrend === 'down' ? '下跌' : '震荡' }}</span>
            </div>
          </div>
          
          <div class="market-indicator">
            <div class="indicator-label">市场情绪</div>
            <div class="indicator-value" :style="{ color: marketSentimentColor }">
              <span class="indicator-icon">{{ marketSentimentIcon }}</span>
              <span>{{ marketSentiment === 'bullish' ? '看多' : marketSentiment === 'bearish' ? '看空' : '中性' }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 我的关注 -->
      <div class="dashboard-card watchlist">
        <div class="card-header">
          <h2>我的关注</h2>
          <div class="card-actions">
            <button class="btn-icon-only">
              <span>➕</span>
            </button>
            <button class="btn-icon-only">
              <span>⚙️</span>
            </button>
          </div>
        </div>
        
        <div class="watchlist-table">
          <table>
            <thead>
              <tr>
                <th>代码</th>
                <th>名称</th>
                <th>最新价</th>
                <th>涨跌幅</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stock in watchlistStocks" :key="stock.symbol">
                <td>{{ stock.symbol }}</td>
                <td>{{ stock.name }}</td>
                <td>{{ stock.price.toFixed(2) }}</td>
                <td :class="parseFloat(stock.change) > 0 ? 'up' : 'down'">
                  {{ parseFloat(stock.change) > 0 ? '+' + stock.change : stock.change }}%
                </td>
                <td>
                  <button class="btn-icon-only" @click="goToStockAnalysis(stock.symbol)">
                    <span>📊</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="card-footer">
          <button class="btn btn-outline btn-sm">管理关注列表</button>
        </div>
      </div>
      
      <!-- 热门股票 -->
      <div class="dashboard-card popular-stocks">
        <div class="card-header">
          <h2>热门股票</h2>
          <div class="card-actions">
            <button class="btn-icon-only">
              <span>🔄</span>
            </button>
          </div>
        </div>
        
        <div class="stock-grid">
          <div 
            v-for="stock in popularStocks" 
            :key="stock.symbol" 
            class="stock-card"
            @click="goToStockAnalysis(stock.symbol)"
          >
            <div class="stock-info">
              <h3>{{ stock.name }}</h3>
              <p class="stock-symbol">{{ stock.symbol }}</p>
              <p class="stock-market">{{ stock.market }}</p>
            </div>
            <div class="stock-actions">
              <button class="btn-icon-only" @click.stop="addToWatchlist(stock)">
                <span>⭐</span>
              </button>
              <button class="btn-icon-only" @click.stop="goToStockAnalysis(stock.symbol)">
                <span>📈</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 市场资讯 -->
      <div class="dashboard-card market-news">
        <div class="card-header">
          <h2>市场资讯</h2>
          <div class="card-actions">
            <button class="btn-icon-only">
              <span>🔄</span>
            </button>
          </div>
        </div>
        
        <div class="news-list">
          <div 
            v-for="(news, index) in newsItems" 
            :key="index" 
            class="news-item"
            :class="{ 'important': news.important }"
          >
            <div class="news-content">
              <h3 class="news-title">{{ news.title }}</h3>
              <div class="news-meta">
                <span class="news-time">{{ news.time }}</span>
                <span class="news-source">{{ news.source }}</span>
              </div>
            </div>
            <div class="news-actions">
              <button class="btn-icon-only">
                <span>📰</span>
              </button>
            </div>
          </div>
        </div>
        
        <div class="card-footer">
          <button class="btn btn-outline btn-sm">查看更多</button>
        </div>
      </div>
      
      <!-- 功能快捷入口 -->
      <div class="dashboard-card quick-actions">
        <div class="card-header">
          <h2>功能入口</h2>
        </div>
        
        <div class="action-grid">
          <div class="action-card" @click="router.push('/stock')">
            <div class="action-icon">📈</div>
            <div class="action-name">股票分析</div>
          </div>
          <div class="action-card" @click="router.push('/portfolio')">
            <div class="action-icon">💼</div>
            <div class="action-name">仓位管理</div>
          </div>
          <div class="action-card" @click="router.push('/market-heatmap')">
            <div class="action-icon">🌎</div>
            <div class="action-name">大盘云图</div>
          </div>
          <div class="action-card">
            <div class="action-icon">📊</div>
            <div class="action-name">行业分析</div>
          </div>
          <div class="action-card">
            <div class="action-icon">📰</div>
            <div class="action-name">新闻资讯</div>
          </div>
          <div class="action-card">
            <div class="action-icon">📱</div>
            <div class="action-name">移动端</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-view {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: var(--spacing-lg) 0;
}

.dashboard-header h1 {
  font-size: var(--font-size-xl);
  color: var(--primary-color);
  margin: 0;
  font-weight: 600;
}

.dashboard-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(66, 185, 131, 0.1);
  border-radius: 50%;
  border-top: 4px solid var(--accent-color);
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-md);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 仪表盘网格布局 */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  grid-template-areas:
    "market-overview market-overview watchlist"
    "popular-stocks market-news market-news"
    "quick-actions quick-actions quick-actions";
}

/* 卡片基础样式 */
.dashboard-card {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-light);
}

.card-header h2 {
  font-size: var(--font-size-lg);
  color: var(--primary-color);
  margin: 0;
  font-weight: 600;
}

.card-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.btn-icon-only {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-md);
}

.btn-icon-only:hover {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
}

.card-footer {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: center;
}

.btn-sm {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--font-size-sm);
}

/* 市场概览卡片 */
.market-overview {
  grid-area: market-overview;
}

.market-indices {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.market-index {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
}

.index-name {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.index-value {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.index-change {
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.index-change.up {
  color: var(--stock-up);
}

.index-change.down {
  color: var(--stock-down);
}

.market-chart-container {
  padding: 0 var(--spacing-md);
  height: 250px;
}

.market-chart {
  width: 100%;
  height: 100%;
}

.market-indicators {
  display: flex;
  justify-content: space-around;
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-light);
}

.market-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.indicator-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.indicator-value {
  font-size: var(--font-size-lg);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.indicator-icon {
  font-size: 1.2em;
}

/* 关注列表卡片 */
.watchlist {
  grid-area: watchlist;
}

.watchlist-table {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
}

.watchlist-table table {
  width: 100%;
  border-collapse: collapse;
}

.watchlist-table th,
.watchlist-table td {
  padding: var(--spacing-sm);
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}

.watchlist-table th {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.watchlist-table td {
  font-size: var(--font-size-sm);
}

.watchlist-table td.up {
  color: var(--stock-up);
}

.watchlist-table td.down {
  color: var(--stock-down);
}

/* 热门股票卡片 */
.popular-stocks {
  grid-area: popular-stocks;
}

.stock-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  overflow-y: auto;
  max-height: 400px;
}

.stock-card {
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  border: 1px solid var(--border-light);
  transition: all var(--transition-fast);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.stock-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
  border-color: var(--accent-light);
}

.stock-info h3 {
  font-size: var(--font-size-md);
  color: var(--primary-color);
  margin: 0 0 var(--spacing-xs) 0;
  font-weight: 600;
}

.stock-symbol {
  color: var(--accent-color);
  font-size: var(--font-size-sm);
  margin: 0 0 var(--spacing-xs) 0;
  font-weight: 500;
}

.stock-market {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  margin: 0;
}

.stock-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--border-light);
}

/* 市场资讯卡片 */
.market-news {
  grid-area: market-news;
}

.news-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  max-height: 400px;
}

.news-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  transition: all var(--transition-fast);
}

.news-item:hover {
  background-color: var(--bg-tertiary);
}

.news-item.important {
  border-left: 3px solid var(--accent-color);
}

.news-content {
  flex: 1;
}

.news-title {
  font-size: var(--font-size-md);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xs) 0;
  font-weight: 500;
  line-height: 1.4;
}

.news-meta {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.news-actions {
  margin-left: var(--spacing-sm);
}

/* 功能快捷入口卡片 */
.quick-actions {
  grid-area: quick-actions;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-light);
  transition: all var(--transition-fast);
  cursor: pointer;
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
  border-color: var(--accent-light);
  background-color: var(--bg-tertiary);
}

.action-icon {
  font-size: 2rem;
  margin-bottom: var(--spacing-sm);
}

.action-name {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-primary);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "market-overview market-overview"
      "watchlist popular-stocks"
      "market-news market-news"
      "quick-actions quick-actions";
  }
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "market-overview"
      "watchlist"
      "popular-stocks"
      "market-news"
      "quick-actions";
  }
  
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }
  
  .dashboard-actions {
    width: 100%;
  }
  
  .market-indices {
    justify-content: center;
  }
}
</style>
