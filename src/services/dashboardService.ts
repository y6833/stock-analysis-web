/**
 * 仪表盘服务
 * 提供仪表盘相关的功能，包括布局管理、关注列表和市场概览
 */

import { v4 as uuidv4 } from 'uuid'
import { marketDataService } from '@/services/marketDataService'
import type {
  DashboardSettings,
  DashboardLayout,
  WidgetConfig,
  Watchlist,
  WatchlistItem,
  WatchlistAlert,
  MarketOverview,
  MarketIndex,
  IndustrySector,
} from '@/types/dashboard'

// 本地存储键
const DASHBOARD_SETTINGS_KEY = 'dashboard_settings'

/**
 * 获取仪表盘设置
 * @returns 仪表盘设置
 */
export function getDashboardSettings(): DashboardSettings {
  try {
    const settingsJson = localStorage.getItem(DASHBOARD_SETTINGS_KEY)
    if (settingsJson) {
      return JSON.parse(settingsJson)
    }
    return createDefaultDashboardSettings()
  } catch (error) {
    console.error('获取仪表盘设置失败:', error)
    return createDefaultDashboardSettings()
  }
}

/**
 * 保存仪表盘设置
 * @param settings 仪表盘设置
 */
export function saveDashboardSettings(settings: DashboardSettings): void {
  try {
    localStorage.setItem(DASHBOARD_SETTINGS_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('保存仪表盘设置失败:', error)
  }
}

/**
 * 创建默认仪表盘设置
 * @returns 默认仪表盘设置
 */
export function createDefaultDashboardSettings(): DashboardSettings {
  const defaultLayoutId = uuidv4()
  const defaultWatchlistId = uuidv4()

  return {
    layouts: [createDefaultLayout(defaultLayoutId)],
    activeLayoutId: defaultLayoutId,
    watchlists: [createDefaultWatchlist(defaultWatchlistId)],
    activeWatchlistId: defaultWatchlistId,
    theme: 'light',
    refreshInterval: 60,
  }
}

/**
 * 创建默认布局
 * @param id 布局ID
 * @returns 默认布局
 */
export function createDefaultLayout(id: string): DashboardLayout {
  return {
    id,
    name: '默认布局',
    isDefault: true,
    widgets: [
      {
        id: uuidv4(),
        type: 'watchlist',
        title: '关注列表',
        size: { w: 6, h: 4, minW: 3, minH: 2 },
        position: { x: 0, y: 0 },
        settings: {},
      },
      {
        id: uuidv4(),
        type: 'market_overview',
        title: '市场概览',
        size: { w: 6, h: 4, minW: 3, minH: 2 },
        position: { x: 6, y: 0 },
        settings: {},
      },
      {
        id: uuidv4(),
        type: 'index_chart',
        title: '指数图表',
        size: { w: 6, h: 4, minW: 3, minH: 2 },
        position: { x: 0, y: 4 },
        settings: {
          symbol: '000001.SH',
        },
      },
      {
        id: uuidv4(),
        type: 'news',
        title: '最新资讯',
        size: { w: 6, h: 4, minW: 3, minH: 2 },
        position: { x: 6, y: 4 },
        settings: {},
      },
    ],
    gridSettings: {
      cols: 12,
      rowHeight: 60,
      gap: 10,
    },
  }
}

/**
 * 创建默认关注列表
 * @param id 关注列表ID
 * @returns 默认关注列表
 */
export function createDefaultWatchlist(id: string): Watchlist {
  return {
    id,
    name: '默认关注列表',
    items: [
      {
        symbol: '600000.SH',
        name: '浦发银行',
        price: 10.25,
        change: 0.15,
        changePercent: 1.48,
        volume: 12345678,
        turnover: 126547890,
        addedAt: new Date().toISOString(),
      },
      {
        symbol: '000001.SZ',
        name: '平安银行',
        price: 15.76,
        change: -0.24,
        changePercent: -1.5,
        volume: 23456789,
        turnover: 369854712,
        addedAt: new Date().toISOString(),
      },
      {
        symbol: '601318.SH',
        name: '中国平安',
        price: 48.32,
        change: 0.87,
        changePercent: 1.83,
        volume: 34567890,
        turnover: 1669854123,
        addedAt: new Date().toISOString(),
      },
    ],
    sortBy: 'changePercent',
    sortDirection: 'desc',
    columns: ['symbol', 'name', 'price', 'change', 'changePercent'],
  }
}

/**
 * 创建新的布局
 * @param name 布局名称
 * @returns 新布局
 */
export function createNewLayout(name: string): DashboardLayout {
  return {
    id: uuidv4(),
    name,
    isDefault: false,
    widgets: [],
    gridSettings: {
      cols: 12,
      rowHeight: 60,
      gap: 10,
    },
  }
}

/**
 * 创建新的关注列表
 * @param name 关注列表名称
 * @returns 新关注列表
 */
export function createNewWatchlist(name: string): Watchlist {
  return {
    id: uuidv4(),
    name,
    items: [],
    sortBy: 'addedAt',
    sortDirection: 'desc',
    columns: ['symbol', 'name', 'price', 'change', 'changePercent'],
  }
}

/**
 * 创建新的小部件
 * @param type 小部件类型
 * @param title 小部件标题
 * @param position 小部件位置
 * @param settings 小部件设置
 * @returns 新小部件
 */
export function createNewWidget(
  type: WidgetType,
  title: string,
  position: WidgetPosition,
  settings: any = {}
): WidgetConfig {
  // 根据类型设置默认尺寸
  let size: WidgetSize

  switch (type) {
    case 'watchlist':
    case 'market_overview':
      size = { w: 6, h: 4, minW: 3, minH: 2 }
      break
    case 'index_chart':
    case 'stock_chart':
      size = { w: 6, h: 4, minW: 4, minH: 3 }
      break
    case 'news':
      size = { w: 6, h: 4, minW: 3, minH: 2 }
      break
    case 'calendar':
      size = { w: 4, h: 4, minW: 3, minH: 3 }
      break
    case 'performance':
      size = { w: 4, h: 3, minW: 2, minH: 2 }
      break
    case 'heatmap':
    case 'sector_rotation':
      size = { w: 6, h: 5, minW: 4, minH: 3 }
      break
    case 'custom_chart':
      size = { w: 6, h: 4, minW: 3, minH: 2 }
      break
    default:
      size = { w: 4, h: 3, minW: 2, minH: 2 }
  }

  return {
    id: uuidv4(),
    type,
    title,
    size,
    position,
    settings,
  }
}

/**
 * 添加股票到关注列表
 * @param watchlistId 关注列表ID
 * @param stock 股票信息
 */
export function addStockToWatchlist(
  watchlistId: string,
  stock: { symbol: string; name: string }
): void {
  const settings = getDashboardSettings()
  const watchlist = settings.watchlists.find((w) => w.id === watchlistId)

  if (watchlist) {
    // 检查是否已存在
    const exists = watchlist.items.some((item) => item.symbol === stock.symbol)

    if (!exists) {
      // 创建新的关注项
      const newItem: WatchlistItem = {
        symbol: stock.symbol,
        name: stock.name,
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        turnover: 0,
        addedAt: new Date().toISOString(),
      }

      watchlist.items.push(newItem)
      saveDashboardSettings(settings)
    }
  }
}

/**
 * 从关注列表中移除股票
 * @param watchlistId 关注列表ID
 * @param symbol 股票代码
 */
export function removeStockFromWatchlist(watchlistId: string, symbol: string): void {
  const settings = getDashboardSettings()
  const watchlist = settings.watchlists.find((w) => w.id === watchlistId)

  if (watchlist) {
    watchlist.items = watchlist.items.filter((item) => item.symbol !== symbol)
    saveDashboardSettings(settings)
  }
}

/**
 * 添加提醒到关注列表项
 * @param watchlistId 关注列表ID
 * @param symbol 股票代码
 * @param stockName 股票名称
 * @param alert 提醒信息
 */
export async function addAlertToWatchlistItem(
  watchlistId: string,
  symbol: string,
  stockName: string,
  alert: {
    condition: string
    value: number
    message?: string
  }
): Promise<void> {
  try {
    // 导入alertService
    const { alertService } = await import('@/services/alertService')

    // 创建提醒请求
    const alertRequest = {
      watchlistId,
      symbol,
      stockName,
      condition: alert.condition as any,
      value: alert.value,
      message: alert.message,
    }

    // 调用API创建提醒
    await alertService.addWatchlistAlert(alertRequest)
  } catch (error) {
    console.error('添加关注列表提醒失败:', error)
    throw error
  }
}

/**
 * 移除关注列表项的提醒
 * @param watchlistId 关注列表ID
 * @param alertId 提醒ID
 */
export async function removeAlertFromWatchlistItem(
  watchlistId: string,
  alertId: number
): Promise<void> {
  try {
    // 导入alertService
    const { alertService } = await import('@/services/alertService')

    // 调用API删除提醒
    await alertService.removeWatchlistAlert(watchlistId, alertId)
  } catch (error) {
    console.error('删除关注列表提醒失败:', error)
    throw error
  }
}

/**
 * 获取关注列表项的提醒
 * @param watchlistId 关注列表ID
 * @returns 提醒列表
 */
export async function getWatchlistAlerts(watchlistId: string): Promise<any[]> {
  try {
    // 导入alertService
    const { alertService } = await import('@/services/alertService')

    // 调用API获取提醒
    return await alertService.getWatchlistAlerts(watchlistId)
  } catch (error) {
    console.error('获取关注列表提醒失败:', error)
    return []
  }
}

/**
 * 获取市场概览数据
 * @param forceRefresh 是否强制刷新（从外部数据源获取）
 * @returns 市场概览数据
 */
export async function getMarketOverview(forceRefresh = true): Promise<MarketOverview> {
  try {
    // 缓存键
    const CACHE_KEY = 'market_overview_data'
    const CACHE_EXPIRY = 5 * 60 * 1000 // 5分钟缓存

    // 如果不强制刷新，尝试从缓存获取
    if (!forceRefresh) {
      try {
        const cachedData = localStorage.getItem(CACHE_KEY)
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData)
          const now = new Date().getTime()

          // 检查缓存是否过期
          if (now - timestamp < CACHE_EXPIRY) {
            console.log('使用缓存的市场概览数据')

            // 显示数据来源提示
            if (window.$message) {
              const cacheTime = new Date(timestamp)
              const timeDiff = Math.round((now - timestamp) / 1000 / 60) // 分钟
              window.$message.info(`数据来自本地缓存，最后更新于${timeDiff}分钟前`)
            }

            // 添加数据来源信息
            return {
              ...data,
              dataSource: {
                type: 'cache',
                name: '本地缓存',
                message: `数据来自本地缓存，最后更新于${new Date(timestamp).toLocaleTimeString()}`,
                timestamp: timestamp,
              },
            }
          }
        }
      } catch (cacheError) {
        console.warn('读取缓存数据失败:', cacheError)
      }
    }

    // 如果强制刷新或缓存不可用，从外部数据源获取数据
    if (forceRefresh) {
      console.log('从外部数据源获取市场概览数据')

      // 显示数据来源提示
      if (window.$message) {
        window.$message.info('正在从外部数据源获取最新数据...')
      }
    } else {
      console.log('缓存过期或不可用，从外部数据源获取市场概览数据')

      // 显示数据来源提示
      if (window.$message) {
        window.$message.info('缓存已过期，正在从外部数据源获取最新数据...')
      }
    }

    // 使用API获取真实市场数据
    const indices = await fetchMarketIndices(forceRefresh)
    const sectors = await fetchIndustrySectors(forceRefresh)
    const breadth = await fetchMarketBreadth(forceRefresh)

    const marketOverview = {
      indices,
      sectors,
      breadth,
      timestamp: new Date().toISOString(),
      dataSource: {
        type: 'api',
        name: '外部数据源',
        message: `数据来自外部数据源，获取时间：${new Date().toLocaleTimeString()}`,
        timestamp: new Date().getTime(),
      },
    }

    // 缓存数据
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data: marketOverview,
          timestamp: new Date().getTime(),
        })
      )
    } catch (cacheError) {
      console.warn('缓存市场概览数据失败:', cacheError)
    }

    return marketOverview
  } catch (error) {
    console.error('获取市场概览数据失败:', error)
    // 如果API调用失败，回退到模拟数据
    console.warn('API调用失败，使用模拟数据作为回退方案')
    return generateMockMarketOverview()
  }
}

/**
 * 从API获取市场指数数据
 * @param forceRefresh 是否强制刷新（从外部数据源获取）
 * @returns 市场指数数据
 */
async function fetchMarketIndices(forceRefresh = true): Promise<MarketIndex[]> {
  try {
    // 获取主要指数列表
    const indexCodes = [
      '000001.SH',
      '399001.SZ',
      '399006.SZ',
      '000016.SH',
      '000300.SH',
      '000905.SH',
    ]
    const indices: MarketIndex[] = []

    // 获取每个指数的数据
    for (const code of indexCodes) {
      try {
        // 获取指数基本信息
        const indexInfo = await marketDataService.getIndexInfo(code)

        // 获取指数最新行情
        const indexQuote = await marketDataService.getIndexQuote(code)

        if (indexInfo && indexQuote) {
          indices.push({
            symbol: code,
            name: indexInfo.name,
            price: indexQuote.close,
            change: indexQuote.change,
            changePercent: indexQuote.pct_chg,
            volume: indexQuote.vol,
            turnover: indexQuote.amount,
            components: indexInfo.components || 0,
          })
        }
      } catch (error) {
        console.error(`获取指数 ${code} 数据失败:`, error)
      }
    }

    // 如果没有获取到任何指数数据，使用模拟数据
    if (indices.length === 0) {
      return generateMockIndices()
    }

    return indices
  } catch (error) {
    console.error('获取市场指数数据失败:', error)
    return generateMockIndices()
  }
}

/**
 * 从API获取行业板块数据
 * @param forceRefresh 是否强制刷新（从外部数据源获取）
 * @returns 行业板块数据
 */
async function fetchIndustrySectors(forceRefresh = true): Promise<IndustrySector[]> {
  try {
    // 获取行业板块列表
    const sectorList = await marketDataService.getSectorList()
    const sectors: IndustrySector[] = []

    // 获取每个行业板块的数据
    for (const sector of sectorList.slice(0, 5)) {
      // 只获取前5个行业
      try {
        // 获取行业板块行情
        const sectorQuote = await marketDataService.getSectorQuote(sector.code)

        // 获取行业内领涨股票
        const leadingStocks = await marketDataService.getSectorLeadingStocks(sector.code, 'up', 2)

        // 获取行业内领跌股票
        const laggingStocks = await marketDataService.getSectorLeadingStocks(sector.code, 'down', 2)

        if (sectorQuote) {
          sectors.push({
            id: sector.code,
            name: sector.name,
            change: sectorQuote.change,
            changePercent: sectorQuote.pct_chg,
            volume: sectorQuote.vol,
            turnover: sectorQuote.amount,
            leadingStocks,
            laggingStocks,
          })
        }
      } catch (error) {
        console.error(`获取行业板块 ${sector.name} 数据失败:`, error)
      }
    }

    // 如果没有获取到任何行业板块数据，使用模拟数据
    if (sectors.length === 0) {
      return generateMockSectors()
    }

    return sectors
  } catch (error) {
    console.error('获取行业板块数据失败:', error)
    return generateMockSectors()
  }
}

/**
 * 从API获取市场宽度数据
 * @param forceRefresh 是否强制刷新（从外部数据源获取）
 * @returns 市场宽度数据
 */
async function fetchMarketBreadth(forceRefresh = true): Promise<MarketOverview['breadth']> {
  try {
    // 获取市场宽度数据
    const breadthData = await marketDataService.getMarketBreadth()

    if (breadthData) {
      return {
        advancing: breadthData.up_count,
        declining: breadthData.down_count,
        unchanged: breadthData.unchanged_count,
        newHighs: breadthData.new_high,
        newLows: breadthData.new_low,
        advancingVolume: breadthData.up_vol,
        decliningVolume: breadthData.down_vol,
      }
    }

    // 如果没有获取到市场宽度数据，使用模拟数据
    return generateMockBreadth()
  } catch (error) {
    console.error('获取市场宽度数据失败:', error)
    return generateMockBreadth()
  }
}

/**
 * 生成模拟的市场指数数据
 * @returns 模拟的市场指数数据
 */
function generateMockIndices(): MarketIndex[] {
  return [
    {
      symbol: '000001.SH',
      name: '上证指数',
      price: 3000 + Math.random() * 200,
      change: Math.random() * 40 - 20,
      changePercent: Math.random() * 2 - 1,
      volume: Math.round(Math.random() * 100000000000),
      turnover: Math.round(Math.random() * 500000000000),
      components: 1800,
    },
    {
      symbol: '399001.SZ',
      name: '深证成指',
      price: 10000 + Math.random() * 1000,
      change: Math.random() * 100 - 50,
      changePercent: Math.random() * 2 - 1,
      volume: Math.round(Math.random() * 80000000000),
      turnover: Math.round(Math.random() * 400000000000),
      components: 500,
    },
    {
      symbol: '399006.SZ',
      name: '创业板指',
      price: 2000 + Math.random() * 200,
      change: Math.random() * 40 - 20,
      changePercent: Math.random() * 3 - 1.5,
      volume: Math.round(Math.random() * 50000000000),
      turnover: Math.round(Math.random() * 300000000000),
      components: 100,
    },
    {
      symbol: '000016.SH',
      name: '上证50',
      price: 3000 + Math.random() * 200,
      change: Math.random() * 40 - 20,
      changePercent: Math.random() * 2 - 1,
      volume: Math.round(Math.random() * 30000000000),
      turnover: Math.round(Math.random() * 200000000000),
      components: 50,
    },
    {
      symbol: '000300.SH',
      name: '沪深300',
      price: 4000 + Math.random() * 300,
      change: Math.random() * 60 - 30,
      changePercent: Math.random() * 2 - 1,
      volume: Math.round(Math.random() * 60000000000),
      turnover: Math.round(Math.random() * 350000000000),
      components: 300,
    },
    {
      symbol: '000905.SH',
      name: '中证500',
      price: 6000 + Math.random() * 400,
      change: Math.random() * 80 - 40,
      changePercent: Math.random() * 2 - 1,
      volume: Math.round(Math.random() * 40000000000),
      turnover: Math.round(Math.random() * 250000000000),
      components: 500,
    },
  ]
}

/**
 * 生成模拟的行业板块数据
 * @returns 模拟的行业板块数据
 */
function generateMockSectors(): IndustrySector[] {
  return [
    {
      id: 'finance',
      name: '金融',
      change: Math.random() * 2 - 1,
      changePercent: Math.random() * 3 - 1.5,
      volume: Math.round(Math.random() * 20000000000),
      turnover: Math.round(Math.random() * 100000000000),
      leadingStocks: [
        {
          symbol: '601318.SH',
          name: '中国平安',
          changePercent: Math.random() * 5,
        },
        {
          symbol: '600036.SH',
          name: '招商银行',
          changePercent: Math.random() * 4,
        },
      ],
      laggingStocks: [
        {
          symbol: '601398.SH',
          name: '工商银行',
          changePercent: Math.random() * -3,
        },
        {
          symbol: '601288.SH',
          name: '农业银行',
          changePercent: Math.random() * -2,
        },
      ],
    },
    {
      id: 'technology',
      name: '科技',
      change: Math.random() * 3 - 1,
      changePercent: Math.random() * 4 - 1,
      volume: Math.round(Math.random() * 15000000000),
      turnover: Math.round(Math.random() * 80000000000),
      leadingStocks: [
        {
          symbol: '000725.SZ',
          name: '京东方A',
          changePercent: Math.random() * 6,
        },
        {
          symbol: '002415.SZ',
          name: '海康威视',
          changePercent: Math.random() * 5,
        },
      ],
      laggingStocks: [
        {
          symbol: '600100.SH',
          name: '同方股份',
          changePercent: Math.random() * -4,
        },
        {
          symbol: '000066.SZ',
          name: '中国长城',
          changePercent: Math.random() * -3,
        },
      ],
    },
    {
      id: 'consumer',
      name: '消费',
      change: Math.random() * 2.5 - 1,
      changePercent: Math.random() * 3.5 - 1.5,
      volume: Math.round(Math.random() * 12000000000),
      turnover: Math.round(Math.random() * 70000000000),
      leadingStocks: [
        {
          symbol: '600519.SH',
          name: '贵州茅台',
          changePercent: Math.random() * 4,
        },
        {
          symbol: '000858.SZ',
          name: '五粮液',
          changePercent: Math.random() * 3.5,
        },
      ],
      laggingStocks: [
        {
          symbol: '600887.SH',
          name: '伊利股份',
          changePercent: Math.random() * -2.5,
        },
        {
          symbol: '000568.SZ',
          name: '泸州老窖',
          changePercent: Math.random() * -2,
        },
      ],
    },
  ]
}

/**
 * 生成模拟的市场宽度数据
 * @returns 模拟的市场宽度数据
 */
function generateMockBreadth(): MarketOverview['breadth'] {
  const totalStocks = 4000
  const advancing = Math.round(Math.random() * totalStocks * 0.6)
  const declining = Math.round(Math.random() * totalStocks * 0.4)
  const unchanged = totalStocks - advancing - declining

  const totalVolume = Math.round(Math.random() * 500000000000)
  const advancingVolume = Math.round(
    totalVolume * (advancing / totalStocks) * (1 + Math.random() * 0.3)
  )
  const decliningVolume = totalVolume - advancingVolume

  return {
    advancing,
    declining,
    unchanged,
    newHighs: Math.round(Math.random() * 100),
    newLows: Math.round(Math.random() * 50),
    advancingVolume,
    decliningVolume,
  }
}

/**
 * 生成模拟的市场概览数据
 * @returns 模拟的市场概览数据
 */
function generateMockMarketOverview(): MarketOverview {
  // 生成模拟的指数数据
  const indices: MarketIndex[] = [
    {
      symbol: '000001.SH',
      name: '上证指数',
      price: 3000 + Math.random() * 200,
      change: Math.random() * 40 - 20,
      changePercent: Math.random() * 2 - 1,
      volume: Math.round(Math.random() * 100000000000),
      turnover: Math.round(Math.random() * 500000000000),
      components: 1800,
    },
    {
      symbol: '399001.SZ',
      name: '深证成指',
      price: 10000 + Math.random() * 1000,
      change: Math.random() * 100 - 50,
      changePercent: Math.random() * 2 - 1,
      volume: Math.round(Math.random() * 80000000000),
      turnover: Math.round(Math.random() * 400000000000),
      components: 500,
    },
    {
      symbol: '399006.SZ',
      name: '创业板指',
      price: 2000 + Math.random() * 200,
      change: Math.random() * 40 - 20,
      changePercent: Math.random() * 3 - 1.5,
      volume: Math.round(Math.random() * 50000000000),
      turnover: Math.round(Math.random() * 300000000000),
      components: 100,
    },
    {
      symbol: '000016.SH',
      name: '上证50',
      price: 3000 + Math.random() * 200,
      change: Math.random() * 40 - 20,
      changePercent: Math.random() * 2 - 1,
      volume: Math.round(Math.random() * 30000000000),
      turnover: Math.round(Math.random() * 200000000000),
      components: 50,
    },
    {
      symbol: '000300.SH',
      name: '沪深300',
      price: 4000 + Math.random() * 300,
      change: Math.random() * 60 - 30,
      changePercent: Math.random() * 2 - 1,
      volume: Math.round(Math.random() * 60000000000),
      turnover: Math.round(Math.random() * 350000000000),
      components: 300,
    },
    {
      symbol: '000905.SH',
      name: '中证500',
      price: 6000 + Math.random() * 400,
      change: Math.random() * 80 - 40,
      changePercent: Math.random() * 2 - 1,
      volume: Math.round(Math.random() * 40000000000),
      turnover: Math.round(Math.random() * 250000000000),
      components: 500,
    },
  ]

  // 生成模拟的行业板块数据
  const sectors: IndustrySector[] = [
    {
      id: 'finance',
      name: '金融',
      change: Math.random() * 2 - 1,
      changePercent: Math.random() * 3 - 1.5,
      volume: Math.round(Math.random() * 20000000000),
      turnover: Math.round(Math.random() * 100000000000),
      leadingStocks: [
        {
          symbol: '601318.SH',
          name: '中国平安',
          changePercent: Math.random() * 5,
        },
        {
          symbol: '600036.SH',
          name: '招商银行',
          changePercent: Math.random() * 4,
        },
      ],
      laggingStocks: [
        {
          symbol: '601398.SH',
          name: '工商银行',
          changePercent: Math.random() * -3,
        },
        {
          symbol: '601288.SH',
          name: '农业银行',
          changePercent: Math.random() * -2,
        },
      ],
    },
    {
      id: 'technology',
      name: '科技',
      change: Math.random() * 3 - 1,
      changePercent: Math.random() * 4 - 1,
      volume: Math.round(Math.random() * 15000000000),
      turnover: Math.round(Math.random() * 80000000000),
      leadingStocks: [
        {
          symbol: '000725.SZ',
          name: '京东方A',
          changePercent: Math.random() * 6,
        },
        {
          symbol: '002415.SZ',
          name: '海康威视',
          changePercent: Math.random() * 5,
        },
      ],
      laggingStocks: [
        {
          symbol: '600100.SH',
          name: '同方股份',
          changePercent: Math.random() * -4,
        },
        {
          symbol: '000066.SZ',
          name: '中国长城',
          changePercent: Math.random() * -3,
        },
      ],
    },
    {
      id: 'consumer',
      name: '消费',
      change: Math.random() * 2.5 - 1,
      changePercent: Math.random() * 3.5 - 1.5,
      volume: Math.round(Math.random() * 12000000000),
      turnover: Math.round(Math.random() * 70000000000),
      leadingStocks: [
        {
          symbol: '600519.SH',
          name: '贵州茅台',
          changePercent: Math.random() * 4,
        },
        {
          symbol: '000858.SZ',
          name: '五粮液',
          changePercent: Math.random() * 3.5,
        },
      ],
      laggingStocks: [
        {
          symbol: '600887.SH',
          name: '伊利股份',
          changePercent: Math.random() * -2.5,
        },
        {
          symbol: '000568.SZ',
          name: '泸州老窖',
          changePercent: Math.random() * -2,
        },
      ],
    },
    {
      id: 'healthcare',
      name: '医药健康',
      change: Math.random() * 2 - 0.5,
      changePercent: Math.random() * 3 - 1,
      volume: Math.round(Math.random() * 10000000000),
      turnover: Math.round(Math.random() * 60000000000),
      leadingStocks: [
        {
          symbol: '600276.SH',
          name: '恒瑞医药',
          changePercent: Math.random() * 4.5,
        },
        {
          symbol: '300015.SZ',
          name: '爱尔眼科',
          changePercent: Math.random() * 4,
        },
      ],
      laggingStocks: [
        {
          symbol: '600196.SH',
          name: '复星医药',
          changePercent: Math.random() * -3,
        },
        {
          symbol: '000538.SZ',
          name: '云南白药',
          changePercent: Math.random() * -2.5,
        },
      ],
    },
    {
      id: 'realestate',
      name: '房地产',
      change: Math.random() * 1.5 - 1,
      changePercent: Math.random() * 2.5 - 2,
      volume: Math.round(Math.random() * 8000000000),
      turnover: Math.round(Math.random() * 50000000000),
      leadingStocks: [
        {
          symbol: '600048.SH',
          name: '保利发展',
          changePercent: Math.random() * 3,
        },
        {
          symbol: '001979.SZ',
          name: '招商蛇口',
          changePercent: Math.random() * 2.5,
        },
      ],
      laggingStocks: [
        {
          symbol: '600606.SH',
          name: '绿地控股',
          changePercent: Math.random() * -4,
        },
        {
          symbol: '000002.SZ',
          name: '万科A',
          changePercent: Math.random() * -3.5,
        },
      ],
    },
  ]

  // 生成模拟的市场宽度数据
  const totalStocks = 4000
  const advancing = Math.round(Math.random() * totalStocks * 0.6)
  const declining = Math.round(Math.random() * totalStocks * 0.4)
  const unchanged = totalStocks - advancing - declining

  const totalVolume = Math.round(Math.random() * 500000000000)
  const advancingVolume = Math.round(
    totalVolume * (advancing / totalStocks) * (1 + Math.random() * 0.3)
  )
  const decliningVolume = totalVolume - advancingVolume

  return {
    indices,
    sectors,
    breadth: {
      advancing,
      declining,
      unchanged,
      newHighs: Math.round(Math.random() * 100),
      newLows: Math.round(Math.random() * 50),
      advancingVolume,
      decliningVolume,
    },
    timestamp: new Date().toISOString(),
  }
}

// 导出服务
export const dashboardService = {
  getDashboardSettings,
  saveDashboardSettings,
  createDefaultDashboardSettings,
  createDefaultLayout,
  createDefaultWatchlist,
  createNewLayout,
  createNewWatchlist,
  createNewWidget,
  addStockToWatchlist,
  removeStockFromWatchlist,
  addAlertToWatchlistItem,
  removeAlertFromWatchlistItem,
  getMarketOverview,
}

export default dashboardService
