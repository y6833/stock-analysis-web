<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import * as echarts from 'echarts'
import { stockService } from '@/services/stockService'
import { technicalIndicatorService } from '@/services/technicalIndicatorService'
import { dashboardService } from '@/services/dashboardService'
import { useToast } from '@/composables/useToast'
import type { Stock, StockData, TrendLine } from '@/types/stock'
import type { Watchlist, WatchlistItem } from '@/types/dashboard'
import TechnicalIndicatorPanel from '@/components/analysis/TechnicalIndicatorPanel.vue'
import TrendLineTools from '@/components/analysis/TrendLineTools.vue'
import MultiTimeframeAnalysis from '@/components/analysis/MultiTimeframeAnalysis.vue'
import SignalSystem from '@/components/analysis/SignalSystem.vue'
import FundamentalAnalysis from '@/components/fundamental/FundamentalAnalysis.vue'
import NewsAggregation from '@/components/news/NewsAggregation.vue'
import DataSourceInfo from '@/components/common/DataSourceInfo.vue'

const route = useRoute()
const { showToast } = useToast()

const chartRef = ref<HTMLElement | null>(null)
const stockSymbol = ref('')
const stockName = ref('')
const stockData = ref<StockData | null>(null)
const analysisResult = ref('')
const isLoading = ref(false)
const error = ref('')
const chart = ref<echarts.ECharts | null>(null)

// 数据来源信息
const dataSource = ref('未知')
const dataSourceMessage = ref('数据来源未知')
const isRealTime = ref(false)
const isCache = ref(false)

// 高级技术分析相关
const activeTab = ref('basic') // 'basic', 'advanced', 'multiframe'
const activeIndicators = ref<string[]>(['sma', 'rsi'])
const indicatorData = ref<any>(null)
const showTrendLineTools = ref(false)
const trendLines = ref<TrendLine[]>([])

// 交易信号相关
const isBuySignal = () => {
  if (!stockData.value) return false

  const prices = stockData.value.prices
  const sma5 = calculateSMA(prices, 5)
  const sma20 = calculateSMA(prices, 20)
  const rsi = calculateRSI(prices)

  // 金叉信号
  if (sma5.length > 2 && sma20.length > 2) {
    const lastSMA5 = sma5[sma5.length - 1]
    const prevSMA5 = sma5[sma5.length - 2]
    const lastSMA20 = sma20[sma20.length - 1]
    const prevSMA20 = sma20[sma20.length - 2]

    if (prevSMA5 < prevSMA20 && lastSMA5 > lastSMA20) {
      return true
    }
  }

  // RSI 超卖信号
  if (rsi.length > 0) {
    const lastRSI = rsi[rsi.length - 1]
    if (lastRSI < 30) {
      return true
    }
  }

  return false
}

const isSellSignal = () => {
  if (!stockData.value) return false

  const prices = stockData.value.prices
  const sma5 = calculateSMA(prices, 5)
  const sma20 = calculateSMA(prices, 20)
  const rsi = calculateRSI(prices)

  // 死叉信号
  if (sma5.length > 2 && sma20.length > 2) {
    const lastSMA5 = sma5[sma5.length - 1]
    const prevSMA5 = sma5[sma5.length - 2]
    const lastSMA20 = sma20[sma20.length - 1]
    const prevSMA20 = sma20[sma20.length - 2]

    if (prevSMA5 > prevSMA20 && lastSMA5 < lastSMA20) {
      return true
    }
  }

  // RSI 超买信号
  if (rsi.length > 0) {
    const lastRSI = rsi[rsi.length - 1]
    if (lastRSI > 70) {
      return true
    }
  }

  return false
}

const getSignalText = () => {
  if (isBuySignal()) {
    return '买入信号'
  } else if (isSellSignal()) {
    return '卖出信号'
  } else {
    return '观望信号'
  }
}

// 搜索相关
const searchQuery = ref('')
const searchResults = ref<Stock[]>([])
const isSearching = ref(false)
const showSearchResults = ref(false)

// 获取股票数据
const fetchStockData = async () => {
  console.log('获取股票数据')

  if (!stockSymbol.value) return

  isLoading.value = true
  error.value = ''

  try {
    // 确保股票代码包含市场后缀
    let symbol = stockSymbol.value
    if (!symbol.includes('.')) {
      // 根据股票代码规则添加市场后缀
      if (symbol.startsWith('6')) {
        symbol = `${symbol}.SH` // 上海证券交易所
      } else if (symbol.startsWith('0') || symbol.startsWith('3')) {
        symbol = `${symbol}.SZ` // 深圳证券交易所
      } else if (symbol.startsWith('4') || symbol.startsWith('8')) {
        symbol = `${symbol}.BJ` // 北京证券交易所
      }
      console.log(`添加市场后缀，原始代码: ${stockSymbol.value}, 修正后: ${symbol}`)
      stockSymbol.value = symbol
    }

    try {
      const result = await stockService.getStockData(stockSymbol.value)

      // 保存股票数据
      stockData.value = result

      // 保存数据来源信息
      if (result.data_source) {
        dataSource.value = result.data_source
        dataSourceMessage.value = result.data_source_message || `数据来自${result.data_source}`
        isRealTime.value = result.is_real_time || false
        isCache.value = result.is_cache || false

        // 显示数据来源提示
        const sourceType = isRealTime.value ? '实时' : '缓存'
        const toastType = isRealTime.value ? 'success' : 'info'
        showToast(dataSourceMessage.value, toastType)

        console.log(`数据来源: ${dataSource.value}, ${sourceType}数据`)
      }

      // 添加延迟，确保DOM已经完全渲染
      console.log('数据加载完成，延迟300ms初始化图表')
      setTimeout(() => {
        initChart()
        analyzeStock()
      }, 300)
    } catch (dataError) {
      console.error('获取股票数据失败:', dataError)

      // 显示具体的错误信息
      if (dataError.message && dataError.message.includes('所有数据源均失败')) {
        error.value = `无法获取${stockSymbol.value}的数据，所有数据源均无法提供数据`
        showToast(error.value, 'error')
      } else {
        error.value = `获取${stockSymbol.value}的数据失败: ${dataError.message || '未知错误'}`
        showToast(error.value, 'error')
      }

      // 清空股票数据
      stockData.value = null
    }
  } catch (err) {
    console.error('处理股票数据请求失败:', err)
    error.value = '获取股票数据失败，请稍后再试'
    showToast(error.value, 'error')

    // 清空股票数据
    stockData.value = null
  } finally {
    isLoading.value = false
  }
}

// 搜索股票
const searchStocks = async () => {
  if (!searchQuery.value) {
    searchResults.value = []
    showSearchResults.value = false
    return
  }

  isSearching.value = true

  try {
    searchResults.value = await stockService.searchStocks(searchQuery.value)
    showSearchResults.value = true
  } catch (err) {
    console.error('搜索股票失败:', err)

    // 显示具体的错误信息
    if (err.message && err.message.includes('所有数据源均失败')) {
      showToast(`无法搜索股票。所有数据源均无法提供数据，请检查网络连接或稍后再试。`, 'error')
    } else {
      showToast(`搜索股票失败: ${err.message || '未知错误'}`, 'error')
    }

    // 清空搜索结果
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

// 显示用户关注的股票
const showWatchlistStocks = async () => {
  try {
    isLoading.value = true

    // 导入关注列表服务
    const { getUserWatchlists, getWatchlistItems } = await import('@/services/watchlistService')

    // 获取用户的所有关注分组
    const watchlists = await getUserWatchlists()

    if (!watchlists || watchlists.length === 0) {
      showToast('您还没有创建关注列表，请先创建关注列表', 'info')
      isLoading.value = false
      return
    }

    // 获取第一个关注分组的股票
    const watchlistItems = await getWatchlistItems(watchlists[0].id)

    if (!watchlistItems || watchlistItems.length === 0) {
      showToast('您的关注列表为空，请先添加股票到关注列表', 'info')
      isLoading.value = false
      return
    }

    // 显示关注列表中的股票
    searchResults.value = watchlistItems.map((item) => ({
      symbol: item.stockCode,
      name: item.stockName,
      market: item.stockCode.endsWith('.SH')
        ? '上海'
        : item.stockCode.endsWith('.SZ')
        ? '深圳'
        : '未知',
      industry: '关注列表',
      notes: item.notes,
    }))

    // 显示搜索结果
    showSearchResults.value = true

    showToast(`已显示您关注的 ${searchResults.value.length} 只股票`, 'success')
    console.log('从数据库获取的关注列表数据:', searchResults.value)
  } catch (error) {
    console.error('获取关注列表失败:', error)
    showToast('获取关注列表失败', 'error')
  } finally {
    isLoading.value = false
  }
}

// 显示用户持仓的股票
const showPortfolioStocks = async () => {
  try {
    isLoading.value = true

    // 导入投资组合服务
    const { usePortfolioStore } = await import('@/stores/portfolioStore')
    const portfolioStore = usePortfolioStore()

    // 获取用户的所有投资组合
    await portfolioStore.fetchPortfolios()

    if (!portfolioStore.portfolios || portfolioStore.portfolios.length === 0) {
      showToast('您还没有创建投资组合，请先创建投资组合', 'info')
      isLoading.value = false
      return
    }

    // 获取当前投资组合的持仓
    if (!portfolioStore.currentPortfolioId) {
      // 如果没有当前选中的投资组合，选择第一个
      await portfolioStore.switchPortfolio(portfolioStore.portfolios[0].id)
    }

    // 获取持仓数据
    await portfolioStore.fetchHoldings(portfolioStore.currentPortfolioId as number)

    if (!portfolioStore.holdings || portfolioStore.holdings.length === 0) {
      showToast('您的持仓为空，请先添加股票到持仓', 'info')
      isLoading.value = false
      return
    }

    // 显示持仓中的股票
    searchResults.value = portfolioStore.holdings.map((holding) => ({
      symbol: holding.stockCode,
      name: holding.stockName,
      market: holding.stockCode.endsWith('.SH')
        ? '上海'
        : holding.stockCode.endsWith('.SZ')
        ? '深圳'
        : '未知',
      industry: '持仓',
      shares: holding.quantity,
      cost: holding.averageCost,
      currentPrice: holding.currentPrice,
      notes: holding.notes,
    }))

    // 显示搜索结果
    showSearchResults.value = true

    showToast(`已显示您持仓的 ${searchResults.value.length} 只股票`, 'success')
    console.log('从数据库获取的持仓数据:', searchResults.value)
  } catch (error) {
    console.error('获取持仓失败:', error)
    showToast('获取持仓失败', 'error')
  } finally {
    isLoading.value = false
  }
}

// 选择股票
const selectStock = (stock: Stock) => {
  stockSymbol.value = stock.symbol
  stockName.value = stock.name
  searchQuery.value = ''
  showSearchResults.value = false
  fetchStockData()
}

// 初始化图表
const initChart = () => {
  console.log('初始化图表', chartRef.value, stockData.value)

  if (!chartRef.value) {
    console.warn('图表引用为空，无法初始化图表')
    // 添加延迟重试逻辑
    console.log('将在500ms后重试初始化图表')
    setTimeout(() => {
      if (chartRef.value) {
        console.log('重试初始化图表成功')
        initChart()
      } else {
        console.error('重试初始化图表失败，图表引用仍为空')
        showToast('图表容器未准备好，请刷新页面重试', 'error')
      }
    }, 500)
    return
  }

  if (!stockData.value) {
    console.warn('股票数据为空，无法初始化图表')
    // 添加消息提示
    showToast('未获取到股票数据，请检查股票代码是否正确', 'error')
    return
  }

  // 检查数据完整性
  if (
    !stockData.value.prices ||
    stockData.value.prices.length === 0 ||
    !stockData.value.dates ||
    stockData.value.dates.length === 0 ||
    !stockData.value.volumes ||
    stockData.value.volumes.length === 0
  ) {
    console.warn('股票数据不完整，无法初始化图表')
    return
  }

  try {
    if (chart.value) {
      console.log('销毁旧图表实例')
      chart.value.dispose()
    }

    console.log(
      '创建新图表实例，容器尺寸:',
      chartRef.value.offsetWidth,
      'x',
      chartRef.value.offsetHeight
    )

    try {
      // 确保容器有足够的尺寸
      if (chartRef.value.offsetWidth < 100 || chartRef.value.offsetHeight < 100) {
        console.warn('图表容器尺寸过小，强制设置最小尺寸')
        chartRef.value.style.width = '800px'
        chartRef.value.style.height = '500px'
      }

      // 初始化图表
      chart.value = echarts.init(chartRef.value)
      console.log('图表实例创建成功')
    } catch (err: any) {
      console.error('创建图表实例失败:', err)
      showToast('创建图表失败: ' + (err.message || '未知错误'), 'error')
    }

    // 计算技术指标
    const prices = stockData.value.prices
    const sma5 = calculateSMA(prices, 5)
    const sma10 = calculateSMA(prices, 10)
    const sma20 = calculateSMA(prices, 20)
    const sma60 = calculateSMA(prices, 60)
    const rsi = calculateRSI(prices)

    // 计算成交量柱状图数据
    const volumeData = stockData.value.volumes.map((volume: number, index: number) => {
      const price = prices[index]
      const prevPrice = index > 0 ? prices[index - 1] : price
      // 价格上涨显示红色，下跌显示绿色
      const color = price >= prevPrice ? '#ef5350' : '#26a69a'
      return {
        value: volume,
        itemStyle: {
          color: color,
        },
      }
    })

    // 确保所有数据都有效
    if (!sma5.length || !sma10.length || !sma20.length || !sma60.length || !rsi.length) {
      console.warn('技术指标计算结果为空')
      return
    }

    const option = {
      title: {
        text: `${stockName.value} (${stockSymbol.value}) 股票走势`,
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        formatter: function (params: any) {
          if (!params || !params.length) return ''

          const date = params[0].axisValue
          let tooltipText = `<div style="font-weight:bold;margin-bottom:5px">日期: ${date}</div>`

          params.forEach((param: any) => {
            if (!param) return

            const color = param.color || '#ccc'
            const seriesName = param.seriesName || '未知'
            const value = param.value

            if (value !== undefined && !isNaN(value)) {
              tooltipText += `<div style="display:flex;justify-content:space-between;align-items:center;margin:3px 0">
                <span style="margin-right:15px">
                  <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${color};margin-right:5px"></span>
                  ${seriesName}:
                </span>
                <span style="font-weight:bold">${
                  typeof value === 'object' ? value.value || value : value
                }</span>
              </div>`
            }
          })

          return tooltipText
        },
      },
      legend: {
        data: ['价格', '5日均线', '10日均线', '20日均线', '60日均线', 'RSI'],
        top: 30,
      },
      grid: [
        {
          left: '3%',
          right: '4%',
          top: '80px',
          height: '50%',
          containLabel: true,
        },
        {
          left: '3%',
          right: '4%',
          top: '65%',
          height: '15%',
          containLabel: true,
        },
      ],
      xAxis: [
        {
          type: 'category',
          data: stockData.value.dates,
          scale: true,
          boundaryGap: false,
          axisLabel: {
            rotate: 45,
            formatter: function (value: string) {
              return value && typeof value === 'string' ? value.substring(5) : '' // 只显示月-日
            },
          },
          axisLine: { onZero: false },
          splitLine: { show: false },
          gridIndex: 0,
        },
        {
          type: 'category',
          data: stockData.value.dates,
          scale: true,
          boundaryGap: false,
          axisLabel: { show: false },
          axisLine: { onZero: false },
          axisTick: { show: false },
          splitLine: { show: false },
          gridIndex: 1,
        },
      ],
      yAxis: [
        {
          type: 'value',
          scale: true,
          splitArea: { show: true },
          axisLabel: {
            formatter: '{value} 元',
          },
          gridIndex: 0,
        },
        {
          type: 'value',
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: { show: true },
          axisLine: { show: true },
          axisTick: { show: false },
          splitLine: { show: false },
        },
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 50,
          end: 100,
        },
        {
          show: true,
          xAxisIndex: [0, 1],
          type: 'slider',
          bottom: '0%',
          start: 50,
          end: 100,
        },
      ],
      series: [
        {
          name: '价格',
          type: 'line',
          data: stockData.value.prices,
          smooth: true,
          lineStyle: {
            color: '#5470C6',
            width: 2,
          },
          markPoint: {
            data: [
              { type: 'max', name: '最高价' },
              { type: 'min', name: '最低价' },
            ],
          },
          markLine: {
            data: [{ type: 'average', name: '平均值' }],
          },
        },
        {
          name: '5日均线',
          type: 'line',
          data: sma5,
          smooth: true,
          lineStyle: {
            color: '#FF9800',
            width: 1.5,
          },
          symbol: 'none',
        },
        {
          name: '10日均线',
          type: 'line',
          data: sma10,
          smooth: true,
          lineStyle: {
            color: '#4CAF50',
            width: 1.5,
          },
          symbol: 'none',
        },
        {
          name: '20日均线',
          type: 'line',
          data: sma20,
          smooth: true,
          lineStyle: {
            color: '#9C27B0',
            width: 1.5,
          },
          symbol: 'none',
        },
        {
          name: '60日均线',
          type: 'line',
          data: sma60,
          smooth: true,
          lineStyle: {
            color: '#E91E63',
            width: 1.5,
          },
          symbol: 'none',
        },
        {
          name: 'RSI',
          type: 'line',
          yAxisIndex: 1,
          xAxisIndex: 1,
          data: rsi,
          smooth: true,
          lineStyle: {
            color: '#2196F3',
            width: 1.5,
          },
          symbol: 'none',
          markLine: {
            data: [
              { yAxis: 70, lineStyle: { color: '#F44336' } },
              { yAxis: 30, lineStyle: { color: '#4CAF50' } },
            ],
          },
        },
        {
          name: '成交量',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumeData,
        },
      ],
    }

    console.log('设置图表选项')
    if (chart.value) {
      chart.value.setOption(option)
    } else {
      console.error('图表实例为空，无法设置选项')
      showToast('图表初始化失败，请刷新页面重试', 'error')
    }

    // 响应窗口大小变化
    window.addEventListener('resize', () => {
      if (chart.value) {
        chart.value.resize()
      }
    })

    console.log('图表初始化完成')
  } catch (error) {
    console.error('初始化图表失败:', error)
  }
}

// 分析股票数据
const analyzeStock = () => {
  if (!stockData.value) return

  const prices = stockData.value.prices
  const lastPrice = prices[prices.length - 1]
  const firstPrice = prices[0]
  const changePercent = (((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2)

  // 计算5日和20日均线
  const sma5 = calculateSMA(prices, 5)
  const sma20 = calculateSMA(prices, 20)

  // 判断金叉死叉
  let signal = ''
  if (sma5.length > 2 && sma20.length > 2) {
    const lastSMA5 = sma5[sma5.length - 1]
    const prevSMA5 = sma5[sma5.length - 2]
    const lastSMA20 = sma20[sma20.length - 1]
    const prevSMA20 = sma20[sma20.length - 2]

    if (prevSMA5 < prevSMA20 && lastSMA5 > lastSMA20) {
      signal = '金叉形成，可能是买入信号'
    } else if (prevSMA5 > prevSMA20 && lastSMA5 < lastSMA20) {
      signal = '死叉形成，可能是卖出信号'
    }
  }

  if (parseFloat(changePercent) > 0) {
    analysisResult.value = `过去${stockData.value.dates.length}天上涨${changePercent}%。${signal}`
  } else {
    analysisResult.value = `过去${stockData.value.dates.length}天下跌${Math.abs(
      parseFloat(changePercent)
    )}%。${signal}`
  }
}

// 使用技术指标服务

// 计算简单移动平均线
function calculateSMA(prices: number[], period: number): number[] {
  return technicalIndicatorService.calculateSMA(prices, period)
}

// 计算相对强弱指标 (RSI)
function calculateRSI(prices: number[], period: number = 14): number[] {
  return technicalIndicatorService.calculateRSI(prices, period)
}

// 处理技术指标数据更新
const handleIndicatorDataUpdated = (data: any) => {
  indicatorData.value = data
}

// 处理趋势线添加
const handleTrendLineAdded = (trendLine: TrendLine) => {
  trendLines.value.push(trendLine)
  updateChartTrendLines()
}

// 处理趋势线移除
const handleTrendLineRemoved = (trendLineId: string) => {
  if (trendLineId === 'all') {
    trendLines.value = []
  } else {
    trendLines.value = trendLines.value.filter((line) => line.id !== trendLineId)
  }
  updateChartTrendLines()
}

// 更新图表中的趋势线
const updateChartTrendLines = () => {
  if (!chart.value) return

  // 获取当前图表配置
  const option = chart.value.getOption() as any

  // 移除所有趋势线系列
  option.series = option.series.filter(
    (series: any) => !series.id || !series.id.startsWith('trendline-')
  )

  // 添加新的趋势线
  trendLines.value.forEach((trendLine) => {
    option.series.push({
      id: `trendline-${trendLine.id}`,
      type: 'line',
      showSymbol: false,
      data: [],
      markLine: {
        silent: true,
        symbol: ['none', 'none'],
        data: [
          {
            name: trendLine.type,
            coords: [
              [trendLine.startIndex, trendLine.startValue],
              [trendLine.endIndex, trendLine.endValue],
            ],
            lineStyle: {
              color: trendLine.color,
              width: 2,
              type: trendLine.type === 'trend' ? 'solid' : 'dashed',
            },
          },
        ],
      },
    })
  })

  // 更新图表
  chart.value.setOption(option)
}

// 监听股票代码变化
watch(stockSymbol, () => {
  fetchStockData()
})

// 初始化
onMounted(() => {
  console.log('组件挂载完成')

  // 添加一个小延迟，确保DOM已经完全渲染
  setTimeout(() => {
    console.log('延迟检查 chartRef:', chartRef.value)

    // 检查URL参数中是否有股票代码
    const symbolParam = route.query.symbol
    if (symbolParam && typeof symbolParam === 'string') {
      stockSymbol.value = symbolParam
      console.log('从URL获取股票代码:', stockSymbol.value)
      fetchStockData()
    }

    // 如果已经有数据但图表未初始化，尝试初始化图表
    if (stockData.value && !chart.value) {
      console.log('已有数据但图表未初始化，尝试重新初始化图表')
      initChart()
    }

    // 如果没有股票代码，默认加载一个示例股票
    if (!stockSymbol.value) {
      console.log('没有指定股票代码，加载默认股票')
      stockSymbol.value = '000001.SZ' // 平安银行
      fetchStockData()
    }
  }, 500)
})
</script>

<template>
  <div class="stock-analysis">
    <div class="page-header">
      <h1>专业股票分析工具</h1>
      <p class="subtitle">基于技术指标的智能分析系统，帮助您做出更明智的投资决策</p>
    </div>

    <div class="control-panel">
      <div class="search-box">
        <div class="search-input-container">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            @input="searchStocks"
            @focus="showSearchResults = !!searchQuery"
            placeholder="输入股票代码或名称进行搜索"
            class="search-input"
          />
          <div v-if="showSearchResults" class="search-results">
            <div v-if="isSearching" class="searching">
              <div class="mini-spinner"></div>
              <span>搜索中...</span>
            </div>
            <div v-else-if="searchResults.length === 0" class="no-results">未找到相关股票</div>
            <div
              v-else
              v-for="stock in searchResults"
              :key="stock.symbol"
              class="search-result-item"
              @click="selectStock(stock)"
            >
              <span class="stock-symbol">{{ stock.symbol }}</span>
              <span class="stock-name">{{ stock.name }}</span>
              <span class="stock-market">{{ stock.market }}</span>
            </div>
          </div>
        </div>
        <button class="btn btn-accent search-btn" @click="fetchStockData" :disabled="isLoading">
          <span class="btn-icon" v-if="!isLoading">📈</span>
          <span class="btn-spinner" v-if="isLoading"></span>
          {{ isLoading ? '加载中...' : '分析股票' }}
        </button>
      </div>

      <div class="quick-filters">
        <span class="filter-label">快速筛选：</span>
        <button class="filter-btn" @click="searchQuery = '600519'">$贵州茅台</button>
        <button class="filter-btn" @click="searchQuery = '000001'">$平安银行</button>
        <button class="filter-btn" @click="searchQuery = '601318'">$中国平安</button>
        <button class="filter-btn" @click="searchQuery = '600036'">$招商银行</button>
        <button class="filter-btn special-btn" @click="showWatchlistStocks">我的关注</button>
        <button class="filter-btn special-btn" @click="showPortfolioStocks">我的持仓</button>
      </div>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="isLoading" class="loading">
      <div class="loading-spinner"></div>
      <p>正在加载股票数据...</p>
    </div>

    <div v-else>
      <div class="analysis-tabs" v-if="stockData">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'basic' }"
          @click="activeTab = 'basic'"
        >
          基础分析
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'advanced' }"
          @click="activeTab = 'advanced'"
        >
          高级技术指标
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'fundamental' }"
          @click="activeTab = 'fundamental'"
        >
          基本面分析
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'news' }"
          @click="activeTab = 'news'"
        >
          新闻与公告
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'multiframe' }"
          @click="activeTab = 'multiframe'"
        >
          多时间周期分析
        </button>
        <button
          class="tool-btn"
          :class="{ active: showTrendLineTools }"
          @click="showTrendLineTools = !showTrendLineTools"
          title="趋势线工具"
        >
          趋势线工具
        </button>
      </div>

      <div class="chart-container-wrapper">
        <!-- 数据来源信息 -->
        <DataSourceInfo
          v-if="stockData && dataSource !== '未知'"
          :dataSource="dataSource"
          :dataSourceMessage="dataSourceMessage"
          :isRealTime="isRealTime"
          :isCache="isCache"
        />

        <div ref="chartRef" class="chart-container">
          <div v-if="isLoading" class="loading-overlay">
            <div class="loading-spinner"></div>
            <div class="loading-text">正在加载数据...</div>
          </div>
        </div>
        <TrendLineTools
          v-if="showTrendLineTools && chart"
          :chartInstance="chart"
          :isActive="showTrendLineTools"
          @update:isActive="showTrendLineTools = $event"
          @trendLineAdded="handleTrendLineAdded"
          @trendLineRemoved="handleTrendLineRemoved"
        />
      </div>

      <div v-if="activeTab === 'advanced' && stockData" class="advanced-analysis-container">
        <div class="advanced-analysis-grid">
          <div class="technical-indicators-panel">
            <TechnicalIndicatorPanel
              :stockData="stockData"
              v-model:activeIndicators="activeIndicators"
              @indicatorDataUpdated="handleIndicatorDataUpdated"
            />
          </div>

          <div class="signal-system-panel">
            <SignalSystem :stockData="stockData" :indicatorData="indicatorData" />
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'multiframe' && stockData" class="multiframe-analysis-container">
        <MultiTimeframeAnalysis :symbol="stockSymbol" />
      </div>

      <div v-if="activeTab === 'fundamental' && stockData" class="fundamental-analysis-container">
        <FundamentalAnalysis :symbol="stockSymbol" />
      </div>

      <div v-if="activeTab === 'news' && stockData" class="news-aggregation-container">
        <NewsAggregation :symbol="stockSymbol" />
      </div>

      <div class="stock-info" v-if="stockData && activeTab === 'basic'">
        <div class="info-card">
          <h3>股票信息</h3>
          <div class="info-item">
            <span class="label">代码:</span>
            <span class="value">{{ stockSymbol }}</span>
          </div>
          <div class="info-item">
            <span class="label">名称:</span>
            <span class="value">{{ stockName }}</span>
          </div>
          <div class="info-item">
            <span class="label">最新价:</span>
            <span class="value"
              >{{ stockData?.prices[stockData.prices.length - 1].toFixed(2) }} 元</span
            >
          </div>
          <div class="info-item">
            <span class="label">最高价:</span>
            <span class="value">{{ stockData?.high.toFixed(2) }} 元</span>
          </div>
          <div class="info-item">
            <span class="label">最低价:</span>
            <span class="value">{{ stockData?.low.toFixed(2) }} 元</span>
          </div>
          <div class="info-item">
            <span class="label">涨跌幅:</span>
            <span
              class="value"
              :class="{
                profit: stockData.prices[stockData.prices.length - 1] > stockData.prices[0],
                loss: stockData.prices[stockData.prices.length - 1] < stockData.prices[0],
              }"
            >
              {{
                (
                  ((stockData.prices[stockData.prices.length - 1] - stockData.prices[0]) /
                    stockData.prices[0]) *
                  100
                ).toFixed(2)
              }}%
            </span>
          </div>
        </div>

        <div class="analysis-result">
          <h3>分析建议</h3>
          <p>{{ analysisResult }}</p>

          <div class="technical-indicators">
            <h4>技术指标</h4>
            <div class="indicator-grid">
              <div class="indicator">
                <span class="indicator-name">5日均线</span>
                <span class="indicator-value">{{
                  calculateSMA(stockData.prices, 5)[
                    calculateSMA(stockData.prices, 5).length - 1
                  ].toFixed(2)
                }}</span>
              </div>
              <div class="indicator">
                <span class="indicator-name">10日均线</span>
                <span class="indicator-value">{{
                  calculateSMA(stockData.prices, 10)[
                    calculateSMA(stockData.prices, 10).length - 1
                  ].toFixed(2)
                }}</span>
              </div>
              <div class="indicator">
                <span class="indicator-name">20日均线</span>
                <span class="indicator-value">{{
                  calculateSMA(stockData.prices, 20)[
                    calculateSMA(stockData.prices, 20).length - 1
                  ].toFixed(2)
                }}</span>
              </div>
              <div class="indicator">
                <span class="indicator-name">RSI(14)</span>
                <span
                  class="indicator-value"
                  :class="{
                    overbought:
                      calculateRSI(stockData.prices)[calculateRSI(stockData.prices).length - 1] >
                      70,
                    oversold:
                      calculateRSI(stockData.prices)[calculateRSI(stockData.prices).length - 1] <
                      30,
                  }"
                >
                  {{
                    calculateRSI(stockData.prices)[
                      calculateRSI(stockData.prices).length - 1
                    ].toFixed(2)
                  }}
                </span>
              </div>
            </div>
          </div>

          <div class="trading-signals">
            <h4>交易信号</h4>
            <div
              class="signal-box"
              :class="{
                'buy-signal': isBuySignal(),
                'sell-signal': isSellSignal(),
                'neutral-signal': !isBuySignal() && !isSellSignal(),
              }"
            >
              <div class="signal-icon">
                <span v-if="isBuySignal()">⬆️</span>
                <span v-else-if="isSellSignal()">⬇️</span>
                <span v-else>↔️</span>
              </div>
              <div class="signal-text">
                <strong>{{ getSignalText() }}</strong>
                <p>{{ analysisResult }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 页面布局 */
.stock-analysis {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

/* 页面标题 */
.page-header {
  margin-bottom: var(--spacing-lg);
  text-align: center;
}

.page-header h1 {
  font-size: var(--font-size-xl);
  color: var(--primary-color);
  margin-bottom: var(--spacing-xs);
  font-weight: 700;
}

.subtitle {
  color: var(--text-secondary);
  font-size: var(--font-size-md);
  max-width: 700px;
  margin: 0 auto;
}

/* 控制面板 */
.control-panel {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
}

/* 搜索框 */
.search-box {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.search-input-container {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: var(--spacing-md);
  color: var(--text-muted);
  font-size: var(--font-size-md);
  z-index: 1;
}

.search-input {
  padding: var(--spacing-md) var(--spacing-md) var(--spacing-md) calc(var(--spacing-md) * 2 + 1em);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  width: 100%;
  font-size: var(--font-size-md);
  transition: all var(--transition-fast);
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.2);
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-top: none;
  border-radius: 0 0 var(--border-radius-md) var(--border-radius-md);
  max-height: 300px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: var(--shadow-md);
}

.search-result-item {
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-light);
  transition: background-color var(--transition-fast);
}

.search-result-item:hover {
  background-color: var(--bg-secondary);
}

.search-result-item:last-child {
  border-bottom: none;
}

.stock-symbol {
  font-weight: 600;
  color: var(--primary-color);
  margin-right: var(--spacing-md);
}

.stock-name {
  flex: 1;
  color: var(--text-primary);
}

.stock-market {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.searching,
.no-results {
  padding: var(--spacing-md);
  color: var(--text-secondary);
  text-align: center;
}

.searching {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
}

.mini-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(66, 185, 131, 0.2);
  border-top: 2px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 快速筛选 */
.quick-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.filter-label {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  margin-right: var(--spacing-xs);
}

.filter-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-btn:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--accent-light);
  color: var(--accent-color);
}

.filter-btn.special-btn {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
  color: var(--primary-color);
  font-weight: 500;
}

.filter-btn.special-btn:hover {
  background-color: var(--primary-color);
  color: white;
}

/* 按钮样式 */
.search-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  min-width: 140px;
}

.btn-icon {
  font-size: 1.2em;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: var(--spacing-xs);
}

/* 分析选项卡 */
.analysis-tabs {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
  padding-bottom: var(--spacing-sm);
  flex-wrap: wrap;
}

.tab-btn,
.tool-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
}

.tab-btn:hover,
.tool-btn:hover {
  background-color: var(--bg-tertiary);
  transform: translateY(-2px);
}

.tab-btn.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.tool-btn.active {
  background-color: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

/* 图表容器 */
.chart-container-wrapper {
  position: relative;
  margin: var(--spacing-lg) 0;
}

.chart-container {
  width: 100%;
  min-width: 600px; /* 确保最小宽度 */
  height: 550px;
  min-height: 400px; /* 确保最小高度 */
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-md);
  background-color: var(--bg-primary);
  transition: all var(--transition-normal);
  position: relative;
  display: block; /* 确保显示为块级元素 */
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
  border-radius: var(--border-radius-lg);
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(66, 185, 131, 0.2);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-md);
}

.loading-text {
  font-size: var(--font-size-md);
  color: var(--primary-color);
  font-weight: 500;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 高级分析容器 */
.advanced-analysis-container,
.multiframe-analysis-container,
.fundamental-analysis-container,
.news-aggregation-container {
  margin: var(--spacing-lg) 0;
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
  padding: var(--spacing-lg);
}

/* 高级分析网格 */
.advanced-analysis-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--spacing-lg);
}

.technical-indicators-panel,
.signal-system-panel {
  width: 100%;
}

@media (max-width: 1200px) {
  .advanced-analysis-grid {
    grid-template-columns: 1fr;
  }
}

/* 股票信息区 */
.stock-info {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-lg);
}

.info-card {
  padding: var(--spacing-lg);
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
  transition: all var(--transition-normal);
}

.info-card h3 {
  margin-top: 0;
  color: var(--primary-color);
  font-size: var(--font-size-lg);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 2px solid var(--accent-light);
}

.info-item {
  margin: var(--spacing-sm) 0;
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--border-light);
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  color: var(--text-secondary);
  font-weight: 500;
}

.value {
  font-weight: 600;
  color: var(--text-primary);
}

.profit {
  color: var(--stock-up);
}

.loss {
  color: var(--stock-down);
}

/* 分析结果区 */
.analysis-result {
  padding: var(--spacing-lg);
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
}

.analysis-result h3,
.analysis-result h4 {
  margin-top: 0;
  color: var(--primary-color);
  border-bottom: 2px solid var(--accent-light);
  padding-bottom: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  font-weight: 600;
}

.analysis-result h4 {
  margin-top: var(--spacing-lg);
  font-size: var(--font-size-md);
  color: var(--primary-color);
}

.analysis-result p {
  color: var(--text-secondary);
  line-height: 1.6;
}

/* 技术指标区 */
.technical-indicators {
  margin-top: var(--spacing-lg);
}

.indicator-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.indicator {
  background-color: var(--bg-secondary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid var(--border-light);
  transition: all var(--transition-fast);
}

.indicator:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
  border-color: var(--accent-light);
}

.indicator-name {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.indicator-value {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.overbought {
  color: var(--stock-up);
}

.oversold {
  color: var(--stock-down);
}

/* 交易信号区 */
.trading-signals {
  margin-top: var(--spacing-lg);
}

.signal-box {
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  margin-top: var(--spacing-md);
  transition: all var(--transition-normal);
}

.buy-signal {
  background-color: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.3);
}

.sell-signal {
  background-color: rgba(46, 204, 113, 0.1);
  border: 1px solid rgba(46, 204, 113, 0.3);
}

.neutral-signal {
  background-color: rgba(52, 152, 219, 0.1);
  border: 1px solid rgba(52, 152, 219, 0.3);
}

.signal-icon {
  font-size: 2rem;
  margin-right: var(--spacing-md);
}

.signal-text {
  flex: 1;
}

.signal-text strong {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-md);
  color: var(--primary-color);
}

.signal-text p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

/* 错误信息 */
.error-message {
  padding: var(--spacing-md);
  background-color: rgba(231, 76, 60, 0.1);
  color: #c62828;
  border-radius: var(--border-radius-md);
  margin: var(--spacing-md) 0;
  text-align: center;
  border: 1px solid rgba(231, 76, 60, 0.3);
}

/* 加载状态 */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  margin: var(--spacing-lg) 0;
}

.loading-spinner {
  border: 4px solid rgba(66, 185, 131, 0.1);
  border-radius: 50%;
  border-top: 4px solid var(--accent-color);
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-md);
}

.loading p {
  color: var(--text-secondary);
  font-size: var(--font-size-md);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stock-info {
    grid-template-columns: 1fr;
  }

  .search-box {
    flex-direction: column;
  }

  .search-btn {
    width: 100%;
  }

  .chart-container {
    height: 400px;
  }

  .indicator-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .analysis-tabs {
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .tab-btn,
  .tool-btn {
    width: 100%;
    text-align: center;
  }

  .advanced-analysis-container,
  .multiframe-analysis-container,
  .fundamental-analysis-container,
  .news-aggregation-container {
    padding: var(--spacing-md);
  }
}
</style>
