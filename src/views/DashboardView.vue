<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { stockService } from '@/services/stockService'
import { dashboardService } from '@/services/dashboardService'
import type { Stock } from '@/types/stock'
import type { DashboardSettings, Watchlist, WatchlistItem, MarketOverview } from '@/types/dashboard'
import * as echarts from 'echarts'
import WatchlistManager from '@/components/dashboard/WatchlistManager.vue'
import AddStockDialog from '@/components/dashboard/AddStockDialog.vue'
import eventBus from '@/utils/eventBus'
import type { DataSourceType } from '@/services/dataSource/DataSourceFactory'

// 导入消息服务类型
declare global {
  interface Window {
    $message?: {
      info(text: string, timeout?: number): void
      success(text: string, timeout?: number): void
      warning(text: string, timeout?: number): void
      error(text: string, timeout?: number): void
    }
  }
}

const router = useRouter()
const popularStocks = ref<Stock[]>([])
const watchlistStocks = ref<WatchlistItem[]>([])
const marketIndices = ref<any[]>([])
const newsItems = ref<any[]>([])
const isLoading = ref(true)
const marketTrend = ref<string>('up') // 'up', 'down', 'neutral'
const marketSentiment = ref<string>('bullish') // 'bullish', 'bearish', 'neutral'
// 数据来源信息
const dataSourceInfo = ref<{ type: 'api' | 'cache' | 'mock'; message: string } | null>(null)
const marketOverviewChart = ref<HTMLElement | null>(null)
const chart = ref<echarts.ECharts | null>(null)

// 仪表盘设置
const dashboardSettings = ref<DashboardSettings | null>(null)
// 当前活动的关注列表
const activeWatchlist = ref<Watchlist | null>(null)
// 是否显示关注列表管理器
const showWatchlistManager = ref(false)
// 是否显示添加股票对话框
const showAddStockDialog = ref(false)
// 数据刷新定时器
let refreshTimer: number | null = null

// 获取市场数据
onMounted(async () => {
  try {
    // 加载仪表盘设置（包括从数据库获取的关注列表）
    await loadDashboardSettings()

    // 获取所有股票并取前10个作为热门股票
    const stocks = await stockService.getStocks()
    popularStocks.value = stocks.slice(0, 10)

    // 获取市场概览数据
    await refreshMarketData()

    // 初始化市场概览图表
    initMarketOverviewChart()

    // 设置定时刷新
    setupRefreshTimer()

    // 监听数据源变化事件
    eventBus.on('data-source-changed', async (type: DataSourceType) => {
      console.log(`数据源已切换到: ${type}，正在更新仪表盘数据...`)

      // 强制刷新数据
      await refreshMarketData(true)

      // 更新图表
      if (chart.value) {
        updateMarketOverviewChart()
      }

      // 显示提示
      if (window.$message) {
        window.$message.success(`数据源已切换到: ${type}，仪表盘数据已更新`)
      }
    })
  } catch (error) {
    console.error('获取数据失败:', error)

    // 显示错误提示
    if (window.$message) {
      window.$message.error(
        '加载仪表盘数据失败: ' + (error instanceof Error ? error.message : String(error))
      )
    }
  } finally {
    isLoading.value = false
  }
})

// 加载仪表盘设置
const loadDashboardSettings = async () => {
  try {
    // 获取仪表盘设置（包括从数据库获取的关注列表）
    const settings = await dashboardService.getDashboardSettings()
    dashboardSettings.value = settings

    // 获取活动的关注列表
    const watchlist = settings.watchlists.find(
      (w: Watchlist) => w.id === settings.activeWatchlistId
    )
    if (watchlist) {
      activeWatchlist.value = watchlist
      watchlistStocks.value = watchlist.items
    }

    // 显示数据来源提示
    if (window.$message && watchlist && watchlist.items.length > 0) {
      window.$message.success('已从数据库加载关注列表数据')
    }
  } catch (error) {
    console.error('加载仪表盘设置失败:', error)
    // 使用默认设置
    dashboardSettings.value = dashboardService.createDefaultDashboardSettings()
    activeWatchlist.value = dashboardSettings.value.watchlists[0]
    watchlistStocks.value = activeWatchlist.value.items

    // 显示错误提示
    if (window.$message) {
      window.$message.error('加载关注列表数据失败，使用默认数据')
    }
  }
}

// 刷新市场数据
const refreshMarketData = async (forceRefresh = true) => {
  try {
    // 获取市场概览数据，传递 forceRefresh 参数
    // forceRefresh 为 true 时，强制从外部数据源获取数据
    // forceRefresh 为 false 时，优先从缓存获取数据
    const marketOverview = await dashboardService.getMarketOverview(forceRefresh)

    // 在控制台显示数据来源信息
    if (marketOverview.dataSource) {
      console.log(`数据来源: ${marketOverview.dataSource.name}`, marketOverview.dataSource)

      // 更新数据来源信息显示
      dataSourceInfo.value = {
        type: marketOverview.dataSource.type,
        message: marketOverview.dataSource.message,
      }
    }

    // 更新市场指数数据
    marketIndices.value = marketOverview.indices
      .map((index: any) => ({
        name: index.name,
        code: index.symbol,
        value: index.price.toFixed(2),
        change: (index.change > 0 ? '+' : '') + index.change.toFixed(2),
        changePercent: (index.changePercent > 0 ? '+' : '') + index.changePercent.toFixed(2) + '%',
        status: index.changePercent > 0 ? 'up' : index.changePercent < 0 ? 'down' : 'neutral',
      }))
      .slice(0, 4)

    // 更新市场趋势和情绪
    const advancingRatio =
      marketOverview.breadth.advancing /
      (marketOverview.breadth.advancing + marketOverview.breadth.declining)
    if (advancingRatio > 0.6) {
      marketTrend.value = 'up'
      marketSentiment.value = 'bullish'
    } else if (advancingRatio < 0.4) {
      marketTrend.value = 'down'
      marketSentiment.value = 'bearish'
    } else {
      marketTrend.value = 'neutral'
      marketSentiment.value = 'neutral'
    }

    // 更新关注列表价格
    if (activeWatchlist.value) {
      try {
        // 获取关注列表中所有股票的最新价格
        const updatedItems = await Promise.all(
          activeWatchlist.value.items.map(async (item: WatchlistItem) => {
            try {
              // 获取股票最新行情，传递 forceRefresh 参数
              const stockQuote = await stockService.getStockQuote(item.symbol, forceRefresh)

              if (stockQuote) {
                const previousPrice = item.price || stockQuote.pre_close
                const newPrice = stockQuote.price
                const change = newPrice - previousPrice
                const changePercent = (change / previousPrice) * 100

                return {
                  ...item,
                  price: newPrice,
                  change,
                  changePercent,
                  volume: stockQuote.vol || 0,
                  turnover: stockQuote.amount || 0,
                  data_source: stockQuote.data_source || stockQuote.source_type || 'unknown',
                }
              }

              return item
            } catch (error) {
              console.error(`获取股票 ${item.symbol} 行情失败:`, error)
              // 保留原有数据，不更新
              return {
                ...item,
                data_source: 'error',
              }
            }
          })
        )

        const updatedWatchlist = {
          ...activeWatchlist.value,
          items: updatedItems,
        }

        activeWatchlist.value = updatedWatchlist
        watchlistStocks.value = updatedWatchlist.items

        // 更新仪表盘设置中的关注列表
        if (dashboardSettings.value) {
          const index = dashboardSettings.value.watchlists.findIndex(
            (w: Watchlist) => w.id === updatedWatchlist.id
          )
          if (index !== -1) {
            dashboardSettings.value.watchlists[index] = updatedWatchlist
          }
        }
      } catch (error) {
        console.error('更新关注列表价格失败:', error)
      }
    }

    // 获取最新财经新闻
    try {
      // 传递 forceRefresh 参数，控制是否强制刷新
      const news = await stockService.getFinancialNews(5)
      if (news && news.length > 0) {
        newsItems.value = news.map((item: any) => ({
          title: item.title,
          time: item.time,
          source: item.source,
          url: item.url,
          important: item.important,
          data_source: item.data_source || item.source_type || 'unknown',
        }))
      } else {
        console.log('未获取到新闻数据，使用模拟数据')
        // 如果没有获取到新闻，使用模拟数据
        newsItems.value = [
          {
            title: '央行宣布降准0.5个百分点，释放长期资金约1万亿元',
            time: '10分钟前',
            source: '财经日报',
            url: '#',
            important: true,
            data_source: 'mock',
          },
          {
            title: '科技板块全线上涨，半导体行业领涨',
            time: '30分钟前',
            source: '证券时报',
            url: '#',
            data_source: 'mock',
          },
          {
            title: '多家券商上调A股目标位，看好下半年行情',
            time: '1小时前',
            source: '上海证券报',
            url: '#',
            data_source: 'mock',
          },
          {
            title: '外资连续三日净流入，北向资金今日净买入超50亿',
            time: '2小时前',
            source: '中国证券报',
            url: '#',
            data_source: 'mock',
          },
          {
            title: '新能源汽车销量创新高，相关概念股受关注',
            time: '3小时前',
            source: '第一财经',
            url: '#',
            data_source: 'mock',
          },
        ]
      }
    } catch (error) {
      console.error('获取财经新闻失败:', error)
      // 使用模拟数据作为备份
      newsItems.value = [
        {
          title: '央行宣布降准0.5个百分点，释放长期资金约1万亿元',
          time: '10分钟前',
          source: '财经日报',
          url: '#',
          important: true,
          data_source: 'mock (error)',
        },
        {
          title: '科技板块全线上涨，半导体行业领涨',
          time: '30分钟前',
          source: '证券时报',
          url: '#',
          data_source: 'mock (error)',
        },
        {
          title: '多家券商上调A股目标位，看好下半年行情',
          time: '1小时前',
          source: '上海证券报',
          url: '#',
          data_source: 'mock (error)',
        },
      ]
    }
  } catch (error) {
    console.error('刷新市场数据失败:', error)
  }
}

// 设置定时刷新
const setupRefreshTimer = () => {
  // 清除现有定时器
  if (refreshTimer !== null) {
    clearInterval(refreshTimer)
  }

  // 设置新定时器，但只从缓存获取数据
  const interval = dashboardSettings.value?.refreshInterval || 60
  console.log(`设置定时刷新，间隔 ${interval} 秒，只从缓存获取数据`)

  refreshTimer = setInterval(async () => {
    try {
      // 调用刷新市场数据，但指定只从缓存获取
      await refreshMarketData(false) // false 表示不强制刷新，只从缓存获取

      if (chart.value) {
        updateMarketOverviewChart()
      }
    } catch (error) {
      console.error('自动刷新市场数据失败:', error)
    }
  }, interval * 1000) as unknown as number
}

// 初始化市场概览图表
const initMarketOverviewChart = () => {
  if (!marketOverviewChart.value) return

  if (chart.value) {
    chart.value.dispose()
  }

  chart.value = echarts.init(marketOverviewChart.value)
  updateMarketOverviewChart()

  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    chart.value?.resize()
  })
}

// 更新市场概览图表
const updateMarketOverviewChart = () => {
  if (!chart.value) return

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
        type: 'cross',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      scale: true,
      boundaryGap: false,
      axisLine: { onZero: false },
      splitLine: { show: false },
      axisLabel: {
        formatter: function (value: string) {
          return value
        },
      },
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitArea: { show: true },
    },
    dataZoom: [
      {
        type: 'inside',
        start: 50,
        end: 100,
      },
      {
        show: true,
        type: 'slider',
        bottom: '0%',
        start: 50,
        end: 100,
      },
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
          color: '#e74c3c',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(231, 76, 60, 0.3)',
            },
            {
              offset: 1,
              color: 'rgba(231, 76, 60, 0.1)',
            },
          ]),
        },
      },
    ],
  }

  chart.value.setOption(option)
}

// 跳转到股票分析页面
const goToStockAnalysis = (symbol: string) => {
  router.push({
    path: '/stock',
    query: { symbol },
  })
}

// 跳转到指数分析页面
const goToIndexAnalysis = (symbol: string) => {
  // 目前指向相同的分析页面，后续可以开发专门的指数分析页面
  router.push({
    path: '/stock',
    query: { symbol },
  })

  // 显示提示
  if (window.$message) {
    window.$message.info(`正在查看指数: ${symbol}`)
  }
}

// 计算市场趋势图标和颜色
const marketTrendIcon = computed(() => {
  switch (marketTrend.value) {
    case 'up':
      return '📈'
    case 'down':
      return '📉'
    case 'neutral':
      return '📊'
    default:
      return '📊'
  }
})

const marketTrendColor = computed(() => {
  switch (marketTrend.value) {
    case 'up':
      return 'var(--stock-up)'
    case 'down':
      return 'var(--stock-down)'
    case 'neutral':
      return 'var(--text-primary)'
    default:
      return 'var(--text-primary)'
  }
})

// 计算市场情绪图标和颜色
const marketSentimentIcon = computed(() => {
  switch (marketSentiment.value) {
    case 'bullish':
      return '🐂'
    case 'bearish':
      return '🐻'
    case 'neutral':
      return '🦊'
    default:
      return '🦊'
  }
})

const marketSentimentColor = computed(() => {
  switch (marketSentiment.value) {
    case 'bullish':
      return 'var(--stock-up)'
    case 'bearish':
      return 'var(--stock-down)'
    case 'neutral':
      return 'var(--text-primary)'
    default:
      return 'var(--text-primary)'
  }
})

// 格式化数字（用于模板中）
function formatNumber(num: number): string {
  return new Intl.NumberFormat('zh-CN').format(num)
}

// 打开新闻详情
const openNewsDetail = (news: any) => {
  // 如果有URL，则打开链接
  if (news.url && news.url !== '#') {
    window.open(news.url, '_blank')
    return
  }

  // 否则显示提示
  if (window.$message) {
    window.$message.info(`查看新闻: ${news.title}`)
  }
}

// 添加到关注列表
const addToWatchlist = async (stock: Stock) => {
  if (!activeWatchlist.value) {
    // 添加错误提示
    if (window.$message) {
      window.$message.error('未找到活动的关注列表')
    }
    return
  }

  // 检查是否已存在
  const exists = activeWatchlist.value.items.some(
    (item: WatchlistItem) => item.symbol === stock.symbol
  )

  if (exists) {
    // 添加提示
    if (window.$message) {
      window.$message.info(`${stock.name}(${stock.symbol}) 已在关注列表中`)
    }
    return
  }

  try {
    // 调用API添加股票到关注列表
    const success = await dashboardService.addStockToWatchlist(activeWatchlist.value.id, {
      symbol: stock.symbol,
      name: stock.name,
    })

    if (success) {
      // 重新加载仪表盘设置以获取最新数据
      await loadDashboardSettings()

      // 添加成功提示
      if (window.$message) {
        window.$message.success(`已将 ${stock.name}(${stock.symbol}) 添加到关注列表`)
      }
    } else {
      // 添加失败提示
      if (window.$message) {
        window.$message.error(`添加 ${stock.name}(${stock.symbol}) 到关注列表失败`)
      }
    }
  } catch (error) {
    console.error('添加到关注列表失败:', error)

    // 添加失败提示
    if (window.$message) {
      window.$message.error(`添加 ${stock.name}(${stock.symbol}) 到关注列表失败: ${error}`)
    }
  }
}

// 打开关注列表管理器
const openWatchlistManager = () => {
  showWatchlistManager.value = true
}

// 打开添加股票对话框
const openAddStockDialog = () => {
  showAddStockDialog.value = true
}

// 处理股票添加完成事件
const handleStockAdded = async (success: boolean) => {
  if (success) {
    // 重新加载仪表盘设置以获取最新数据
    await loadDashboardSettings()
  }
}

// 显示新闻页面
const showNewsPage = () => {
  // 目前简单实现，使用提示消息
  if (window.$message) {
    window.$message.info('新闻资讯功能即将上线')
  }

  // 后续可以实现专门的新闻页面
}

// 显示日期范围选择器
const showDateRangePicker = () => {
  // 目前简单实现，使用提示消息
  if (window.$message) {
    window.$message.info('日期范围选择功能即将上线')
  }

  // 后续可以实现日期范围选择器
}

// 显示市场设置
const showMarketSettings = () => {
  // 目前简单实现，使用提示消息
  if (window.$message) {
    window.$message.info('市场设置功能即将上线')
  }

  // 后续可以实现市场设置对话框
}

// 显示更多新闻
const showMoreNews = () => {
  // 目前简单实现，使用提示消息
  if (window.$message) {
    window.$message.info('更多新闻功能即将上线')
  }

  // 后续可以实现新闻列表页面
  showNewsPage()
}

// 显示移动端应用
const showMobileApp = () => {
  // 目前简单实现，使用提示消息
  if (window.$message) {
    window.$message.info('移动端应用即将上线，敬请期待')
  }

  // 后续可以实现二维码扫描下载移动端应用
}

// 获取数据源类名
const getDataSourceClass = (dataSource: string): string => {
  if (!dataSource) return ''

  if (dataSource.includes('api')) return 'api'
  if (dataSource.includes('cache')) return 'cache'
  if (dataSource.includes('mock')) return 'mock'

  return ''
}

// 获取数据源图标
const getDataSourceIcon = (dataSource: string): string => {
  if (!dataSource) return ''

  if (dataSource.includes('api')) return '🔄'
  if (dataSource.includes('cache')) return '💾'
  if (dataSource.includes('mock')) return '📊'

  return ''
}

// 保存关注列表
const saveWatchlists = async (watchlists: Watchlist[], activeWatchlistId: string) => {
  if (!dashboardSettings.value) return

  try {
    // 更新设置
    dashboardSettings.value.watchlists = watchlists
    dashboardSettings.value.activeWatchlistId = activeWatchlistId

    // 保存设置
    await dashboardService.saveDashboardSettings(dashboardSettings.value)

    // 重新加载仪表盘设置以获取最新数据
    await loadDashboardSettings()

    // 显示成功提示
    if (window.$message) {
      window.$message.success('关注列表已保存')
    }
  } catch (error) {
    console.error('保存关注列表失败:', error)

    // 显示错误提示
    if (window.$message) {
      window.$message.error(
        '保存关注列表失败: ' + (error instanceof Error ? error.message : String(error))
      )
    }

    // 更新活动的关注列表（使用本地数据）
    const watchlist = watchlists.find((w) => w.id === activeWatchlistId)
    if (watchlist) {
      activeWatchlist.value = watchlist
      watchlistStocks.value = watchlist.items
    }
  }
}

// 刷新数据（手动刷新按钮）
const refreshData = async () => {
  isLoading.value = true
  try {
    // 强制从外部数据源获取最新数据
    await refreshMarketData(true) // true 表示强制刷新，从外部数据源获取

    if (chart.value) {
      updateMarketOverviewChart()
    }

    // 添加成功提示
    if (window.$message) {
      window.$message.success(`数据已从外部数据源刷新成功 (${new Date().toLocaleTimeString()})`)
    }
  } catch (error) {
    console.error('刷新数据失败:', error)
    // 添加错误提示
    if (window.$message) {
      window.$message.error(
        '刷新数据失败: ' + (error instanceof Error ? error.message : String(error))
      )
    }
  } finally {
    isLoading.value = false
  }
}

// 组件卸载时清理
onUnmounted(() => {
  // 清除定时器
  if (refreshTimer !== null) {
    clearInterval(refreshTimer)
  }

  // 清除图表实例
  if (chart.value) {
    chart.value.dispose()
  }

  // 移除事件监听
  eventBus.off('data-source-changed')
})
</script>

<template>
  <div class="dashboard-view">
    <div class="dashboard-header">
      <h1>市场仪表盘</h1>
      <div class="data-source-indicator" v-if="dataSourceInfo">
        <span class="data-source-icon" :class="dataSourceInfo.type">
          {{ dataSourceInfo.type === 'api' ? '🔄' : dataSourceInfo.type === 'cache' ? '💾' : '📊' }}
        </span>
        <span class="data-source-text">{{ dataSourceInfo.message }}</span>
      </div>
      <div class="dashboard-actions">
        <button class="btn btn-outline" @click="refreshData" :disabled="isLoading">
          <span class="btn-icon" v-if="!isLoading">🔄</span>
          <span class="loading-spinner-small" v-else></span>
          <span>刷新数据</span>
        </button>
        <button class="btn btn-outline" @click="openWatchlistManager">
          <span class="btn-icon">⭐</span>
          <span>管理关注列表</span>
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
            <button class="btn-icon-only" @click="showDateRangePicker" title="选择日期范围">
              <span>📅</span>
            </button>
            <button class="btn-icon-only" @click="showMarketSettings" title="市场设置">
              <span>⚙️</span>
            </button>
          </div>
        </div>

        <div class="market-indices">
          <div
            v-for="index in marketIndices"
            :key="index.code"
            class="market-index"
            @click="goToIndexAnalysis(index.code)"
            title="点击查看详情"
          >
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
              <span>{{
                marketTrend === 'up' ? '上涨' : marketTrend === 'down' ? '下跌' : '震荡'
              }}</span>
            </div>
          </div>

          <div class="market-indicator">
            <div class="indicator-label">市场情绪</div>
            <div class="indicator-value" :style="{ color: marketSentimentColor }">
              <span class="indicator-icon">{{ marketSentimentIcon }}</span>
              <span>{{
                marketSentiment === 'bullish'
                  ? '看多'
                  : marketSentiment === 'bearish'
                  ? '看空'
                  : '中性'
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 我的关注 -->
      <div class="dashboard-card watchlist">
        <div class="card-header">
          <h2>我的关注</h2>
          <div class="card-actions">
            <button class="btn-icon-only" @click="openAddStockDialog" title="添加股票">
              <span>➕</span>
            </button>
            <button class="btn-icon-only" @click="openWatchlistManager" title="管理关注列表">
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
                <td>
                  {{ stock.symbol }}
                  <span
                    v-if="stock.data_source"
                    class="stock-data-source"
                    :class="getDataSourceClass(stock.data_source)"
                    :title="'数据来源: ' + stock.data_source"
                  >
                    {{ getDataSourceIcon(stock.data_source) }}
                  </span>
                </td>
                <td>{{ stock.name }}</td>
                <td>
                  {{ typeof stock.price === 'number' ? stock.price.toFixed(2) : stock.price }}
                </td>
                <td :class="stock.changePercent > 0 ? 'up' : 'down'">
                  {{
                    stock.changePercent > 0
                      ? '+' + stock.changePercent.toFixed(2)
                      : stock.changePercent.toFixed(2)
                  }}%
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
          <button class="btn btn-outline btn-sm" @click="openWatchlistManager">管理关注列表</button>
        </div>
      </div>

      <!-- 热门股票 -->
      <div class="dashboard-card popular-stocks">
        <div class="card-header">
          <h2>热门股票</h2>
          <div class="card-actions">
            <button class="btn-icon-only" @click="refreshData" title="刷新数据">
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
            <button class="btn-icon-only" @click="refreshData" title="刷新数据">
              <span>🔄</span>
            </button>
          </div>
        </div>

        <div class="news-list">
          <div
            v-for="(news, index) in newsItems"
            :key="index"
            class="news-item"
            :class="{ important: news.important }"
            @click="openNewsDetail(news)"
            title="点击查看详情"
          >
            <div class="news-content">
              <h3 class="news-title">{{ news.title }}</h3>
              <div class="news-meta">
                <span class="news-time">{{ news.time }}</span>
                <span class="news-source">{{ news.source }}</span>
                <span
                  v-if="news.data_source"
                  class="news-data-source"
                  :class="getDataSourceClass(news.data_source)"
                >
                  {{ getDataSourceIcon(news.data_source) }}
                </span>
              </div>
            </div>
            <div class="news-actions">
              <button class="btn-icon-only" @click.stop="openNewsDetail(news)">
                <span>📰</span>
              </button>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <button class="btn btn-outline btn-sm" @click="showMoreNews">查看更多</button>
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
          <div class="action-card" @click="router.push('/industry-analysis')">
            <div class="action-icon">📊</div>
            <div class="action-name">行业分析</div>
          </div>
          <div class="action-card" @click="showNewsPage">
            <div class="action-icon">📰</div>
            <div class="action-name">新闻资讯</div>
          </div>
          <div class="action-card" @click="showMobileApp">
            <div class="action-icon">📱</div>
            <div class="action-name">移动端</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- 关注列表管理器 -->
  <WatchlistManager
    v-if="dashboardSettings"
    :show="showWatchlistManager"
    :watchlists="dashboardSettings.watchlists"
    :activeWatchlistId="dashboardSettings.activeWatchlistId"
    @close="showWatchlistManager = false"
    @save="saveWatchlists"
  />

  <!-- 添加股票对话框 -->
  <AddStockDialog
    v-if="dashboardSettings"
    v-model:visible="showAddStockDialog"
    :watchlists="dashboardSettings.watchlists"
    :activeWatchlistId="dashboardSettings.activeWatchlistId"
    @close="showAddStockDialog = false"
    @added="handleStockAdded"
  />
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
  flex-wrap: wrap;
}

.dashboard-header h1 {
  font-size: var(--font-size-xl);
  color: var(--primary-color);
  margin: 0;
  font-weight: 600;
}

.data-source-indicator {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: var(--bg-secondary);
  margin-left: 16px;
  font-size: var(--font-size-sm);
}

.data-source-icon {
  margin-right: 6px;
  font-size: 16px;
}

.data-source-icon.api {
  color: var(--accent-color);
}

.data-source-icon.cache {
  color: var(--info-color);
}

.data-source-icon.mock {
  color: var(--warning-color);
}

.data-source-text {
  color: var(--text-secondary);
}

.dashboard-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-left: auto;
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

.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(66, 185, 131, 0.1);
  border-radius: 50%;
  border-top: 2px solid var(--accent-color);
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 仪表盘网格布局 */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  grid-template-areas:
    'market-overview market-overview watchlist'
    'popular-stocks market-news market-news'
    'quick-actions quick-actions quick-actions';
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

.stock-data-source {
  font-size: 10px;
  padding: 1px 3px;
  border-radius: 3px;
  background-color: var(--bg-tertiary);
  margin-left: 4px;
  display: inline-block;
  vertical-align: middle;
}

.stock-data-source.api {
  color: var(--accent-color);
}

.stock-data-source.cache {
  color: var(--info-color);
}

.stock-data-source.mock {
  color: var(--warning-color);
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
  align-items: center;
}

.news-data-source {
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 3px;
  background-color: var(--bg-tertiary);
}

.news-data-source.api {
  color: var(--accent-color);
}

.news-data-source.cache {
  color: var(--info-color);
}

.news-data-source.mock {
  color: var(--warning-color);
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
      'market-overview market-overview'
      'watchlist popular-stocks'
      'market-news market-news'
      'quick-actions quick-actions';
  }
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      'market-overview'
      'watchlist'
      'popular-stocks'
      'market-news'
      'quick-actions';
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
