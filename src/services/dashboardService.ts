/**
 * 仪表盘服务
 * 提供仪表盘相关的功能，包括布局管理、关注列表和市场概览
 */

import type {
  DashboardSettings,
  DashboardLayout,
  Watchlist,
  WidgetConfig,
  WidgetType,
  WidgetPosition,
  MarketOverview,
  MarketIndex,
  IndustrySector
} from '@/types/dashboard'

/**
 * 获取仪表板设置
 */
export async function getDashboardSettings(): Promise<DashboardSettings> {
  try {
    // 从本地存储获取设置
    const settings = localStorage.getItem('dashboard_settings')
    if (settings) {
      return JSON.parse(settings)
    }

    // 如果没有保存的设置，返回默认设置
    return createDefaultDashboardSettings()
  } catch (error) {
    console.error('获取仪表板设置失败:', error)
    return createDefaultDashboardSettings()
  }
}

/**
 * 保存仪表板设置
 */
export function saveDashboardSettings(settings: DashboardSettings): void {
  try {
    localStorage.setItem('dashboard_settings', JSON.stringify(settings))
  } catch (error) {
    console.error('保存仪表板设置失败:', error)
  }
}

/**
 * 创建默认仪表板设置
 */
export function createDefaultDashboardSettings(): DashboardSettings {
  return {
    theme: 'light',
    layout: 'default',
    refreshInterval: 30,
    showNotifications: true,
    autoSave: true,
    layouts: [
      createDefaultLayout('default')
    ],
    watchlists: [
      createDefaultWatchlist('default')
    ],
    widgets: []
  }
}

/**
 * 创建默认布局
 */
export function createDefaultLayout(id: string): DashboardLayout {
  return {
    id,
    name: '默认布局',
    description: '系统默认的仪表板布局',
    isDefault: true,
    widgets: [
      {
        id: 'market-overview',
        type: 'market-overview',
        title: '市场概览',
        position: { x: 0, y: 0, w: 12, h: 4 },
        settings: {}
      },
      {
        id: 'watchlist',
        type: 'watchlist',
        title: '自选股',
        position: { x: 0, y: 4, w: 6, h: 6 },
        settings: { watchlistId: 'default' }
      },
      {
        id: 'news',
        type: 'news',
        title: '财经新闻',
        position: { x: 6, y: 4, w: 6, h: 6 },
        settings: {}
      }
    ]
  }
}

/**
 * 创建默认自选股列表
 */
export function createDefaultWatchlist(id: string): Watchlist {
  return {
    id,
    name: '默认自选股',
    description: '系统默认的自选股列表',
    stocks: [
      { symbol: '000001.SZ', name: '平安银行' },
      { symbol: '000002.SZ', name: '万科A' },
      { symbol: '600000.SH', name: '浦发银行' },
      { symbol: '600036.SH', name: '招商银行' },
      { symbol: '600519.SH', name: '贵州茅台' },
      { symbol: '000858.SZ', name: '五粮液' }
    ],
    alerts: []
  }
}

/**
 * 获取默认布局
 */
export function getDefaultLayout(): DashboardLayout {
  return createDefaultLayout('default')
}

/**
 * 保存布局
 */
export async function saveLayout(layout: DashboardLayout): Promise<void> {
  try {
    const settings = await getDashboardSettings()
    const existingIndex = settings.layouts.findIndex(l => l.id === layout.id)

    if (existingIndex >= 0) {
      settings.layouts[existingIndex] = layout
    } else {
      settings.layouts.push(layout)
    }

    saveDashboardSettings(settings)
  } catch (error) {
    console.error('保存布局失败:', error)
    throw error
  }
}

/**
 * 获取布局
 */
export async function getLayout(layoutId: string): Promise<DashboardLayout | null> {
  try {
    const settings = await getDashboardSettings()
    return settings.layouts.find(l => l.id === layoutId) || null
  } catch (error) {
    console.error('获取布局失败:', error)
    return null
  }
}

/**
 * 重置布局
 */
export async function resetLayout(layoutId: string): Promise<void> {
  try {
    const settings = await getDashboardSettings()
    const layoutIndex = settings.layouts.findIndex(l => l.id === layoutId)

    if (layoutIndex >= 0) {
      settings.layouts[layoutIndex] = createDefaultLayout(layoutId)
      saveDashboardSettings(settings)
    }
  } catch (error) {
    console.error('重置布局失败:', error)
    throw error
  }
}

/**
 * 添加小部件
 */
export async function addWidget(layoutId: string, widget: WidgetConfig): Promise<void> {
  try {
    const settings = await getDashboardSettings()
    const layout = settings.layouts.find(l => l.id === layoutId)

    if (!layout) {
      throw new Error(`布局不存在: ${layoutId}`)
    }

    layout.widgets.push(widget)
    saveDashboardSettings(settings)
  } catch (error) {
    console.error('添加小部件失败:', error)
    throw error
  }
}

/**
 * 移除小部件
 */
export async function removeWidget(layoutId: string, widgetId: string): Promise<void> {
  try {
    const settings = await getDashboardSettings()
    const layout = settings.layouts.find(l => l.id === layoutId)

    if (!layout) {
      throw new Error(`布局不存在: ${layoutId}`)
    }

    layout.widgets = layout.widgets.filter(w => w.id !== widgetId)
    saveDashboardSettings(settings)
  } catch (error) {
    console.error('移除小部件失败:', error)
    throw error
  }
}

/**
 * 更新小部件
 */
export async function updateWidget(layoutId: string, widget: WidgetConfig): Promise<void> {
  try {
    const settings = await getDashboardSettings()
    const layout = settings.layouts.find(l => l.id === layoutId)

    if (!layout) {
      throw new Error(`布局不存在: ${layoutId}`)
    }

    const widgetIndex = layout.widgets.findIndex(w => w.id === widget.id)
    if (widgetIndex >= 0) {
      layout.widgets[widgetIndex] = widget
      saveDashboardSettings(settings)
    }
  } catch (error) {
    console.error('更新小部件失败:', error)
    throw error
  }
}

/**
 * 获取关注列表
 */
export async function getWatchlists(): Promise<Watchlist[]> {
  try {
    const settings = await getDashboardSettings()
    return settings.watchlists
  } catch (error) {
    console.error('获取关注列表失败:', error)
    return []
  }
}

/**
 * 创建关注列表
 */
export async function createWatchlist(name: string): Promise<Watchlist> {
  try {
    const settings = await getDashboardSettings()
    const newWatchlist = createNewWatchlist(name)
    settings.watchlists.push(newWatchlist)
    saveDashboardSettings(settings)
    return newWatchlist
  } catch (error) {
    console.error('创建关注列表失败:', error)
    throw error
  }
}

/**
 * 更新关注列表
 */
export async function updateWatchlist(watchlist: Watchlist): Promise<void> {
  try {
    const settings = await getDashboardSettings()
    const index = settings.watchlists.findIndex(w => w.id === watchlist.id)

    if (index >= 0) {
      settings.watchlists[index] = watchlist
      saveDashboardSettings(settings)
    }
  } catch (error) {
    console.error('更新关注列表失败:', error)
    throw error
  }
}

/**
 * 删除关注列表
 */
export async function deleteWatchlist(watchlistId: string): Promise<void> {
  try {
    const settings = await getDashboardSettings()
    settings.watchlists = settings.watchlists.filter(w => w.id !== watchlistId)
    saveDashboardSettings(settings)
  } catch (error) {
    console.error('删除关注列表失败:', error)
    throw error
  }
}

/**
 * 创建新布局
 */
export function createNewLayout(name: string): DashboardLayout {
  return {
    id: `layout_${Date.now()}`,
    name,
    description: `用户创建的布局: ${name}`,
    isDefault: false,
    widgets: []
  }
}

/**
 * 创建新自选股列表
 */
export function createNewWatchlist(name: string): Watchlist {
  return {
    id: `watchlist_${Date.now()}`,
    name,
    description: `用户创建的自选股列表: ${name}`,
    stocks: [],
    alerts: []
  }
}

/**
 * 创建新小部件
 */
export function createNewWidget(
  type: WidgetType,
  title: string,
  position: WidgetPosition,
  settings: any = {}
): WidgetConfig {
  return {
    id: `widget_${Date.now()}`,
    type,
    title,
    position,
    settings
  }
}

/**
 * 添加股票到自选股列表
 */
export async function addStockToWatchlist(
  watchlistId: string,
  stock: { symbol: string; name: string }
): Promise<boolean> {
  try {
    const settings = await getDashboardSettings()
    const watchlist = settings.watchlists.find(w => w.id === watchlistId)

    if (!watchlist) {
      throw new Error(`自选股列表不存在: ${watchlistId}`)
    }

    // 检查股票是否已存在
    const existingStock = watchlist.stocks.find(s => s.symbol === stock.symbol)
    if (existingStock) {
      return false // 股票已存在
    }

    // 添加股票
    watchlist.stocks.push(stock)
    saveDashboardSettings(settings)
    return true
  } catch (error) {
    console.error('添加股票到自选股列表失败:', error)
    return false
  }
}

/**
 * 从自选股列表移除股票
 */
export async function removeStockFromWatchlist(
  watchlistId: string,
  symbol: string
): Promise<boolean> {
  try {
    const settings = await getDashboardSettings()
    const watchlist = settings.watchlists.find(w => w.id === watchlistId)

    if (!watchlist) {
      throw new Error(`自选股列表不存在: ${watchlistId}`)
    }

    // 移除股票
    const initialLength = watchlist.stocks.length
    watchlist.stocks = watchlist.stocks.filter(s => s.symbol !== symbol)

    if (watchlist.stocks.length === initialLength) {
      return false // 股票不存在
    }

    saveDashboardSettings(settings)
    return true
  } catch (error) {
    console.error('从自选股列表移除股票失败:', error)
    return false
  }
}

/**
 * 添加警报到自选股项目
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
    const settings = await getDashboardSettings()
    const watchlist = settings.watchlists.find(w => w.id === watchlistId)

    if (!watchlist) {
      throw new Error(`自选股列表不存在: ${watchlistId}`)
    }

    const newAlert = {
      id: Date.now(),
      symbol,
      stockName,
      condition: alert.condition,
      value: alert.value,
      message: alert.message || '',
      active: true,
      createdAt: new Date().toISOString()
    }

    watchlist.alerts.push(newAlert)
    saveDashboardSettings(settings)
  } catch (error) {
    console.error('添加警报失败:', error)
    throw error
  }
}

/**
 * 从自选股项目移除警报
 */
export async function removeAlertFromWatchlistItem(
  watchlistId: string,
  alertId: number
): Promise<void> {
  try {
    const settings = await getDashboardSettings()
    const watchlist = settings.watchlists.find(w => w.id === watchlistId)

    if (!watchlist) {
      throw new Error(`自选股列表不存在: ${watchlistId}`)
    }

    watchlist.alerts = watchlist.alerts.filter(a => a.id !== alertId)
    saveDashboardSettings(settings)
  } catch (error) {
    console.error('移除警报失败:', error)
    throw error
  }
}

/**
 * 获取自选股警报
 */
export async function getWatchlistAlerts(watchlistId: string): Promise<any[]> {
  try {
    const settings = await getDashboardSettings()
    const watchlist = settings.watchlists.find(w => w.id === watchlistId)

    if (!watchlist) {
      return []
    }

    return watchlist.alerts
  } catch (error) {
    console.error('获取自选股警报失败:', error)
    return []
  }
}

/**
 * 获取市场概览数据
 */
export async function getMarketOverview(forceRefresh = true): Promise<MarketOverview> {
  try {
    const [indices, sectors, breadth] = await Promise.all([
      fetchMarketIndices(forceRefresh),
      fetchIndustrySectors(forceRefresh),
      fetchMarketBreadth(forceRefresh)
    ])

    return {
      indices,
      sectors,
      breadth,
      lastUpdated: new Date().toISOString()
    }
  } catch (error) {
    console.error('获取市场概览失败:', error)
    throw new Error(`获取市场概览失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 获取市场指数数据
 */
async function fetchMarketIndices(forceRefresh = true): Promise<MarketIndex[]> {
  try {
    // 调用后端API获取真实市场指数数据
    const response = await fetch('/api/market/indices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ forceRefresh })
    })

    if (!response.ok) {
      throw new Error(`获取市场指数数据失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.indices || []
  } catch (error) {
    console.error('获取市场指数数据失败:', error)
    throw new Error(`获取市场指数数据失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 获取行业板块数据
 */
async function fetchIndustrySectors(forceRefresh = true): Promise<IndustrySector[]> {
  try {
    // 调用后端API获取真实行业板块数据
    const response = await fetch('/api/market/sectors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ forceRefresh })
    })

    if (!response.ok) {
      throw new Error(`获取行业板块数据失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.sectors || []
  } catch (error) {
    console.error('获取行业板块数据失败:', error)
    throw new Error(`获取行业板块数据失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 获取市场宽度数据
 */
async function fetchMarketBreadth(forceRefresh = true): Promise<MarketOverview['breadth']> {
  try {
    // 调用后端API获取真实市场宽度数据
    const response = await fetch('/api/market/breadth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ forceRefresh })
    })

    if (!response.ok) {
      throw new Error(`获取市场宽度数据失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return {
      advancing: data.advancing || 0,
      declining: data.declining || 0,
      unchanged: data.unchanged || 0,
      newHighs: data.new_high || 0,
      newLows: data.new_low || 0,
      advancingVolume: data.up_vol || 0,
      decliningVolume: data.down_vol || 0,
    }
  } catch (error) {
    console.error('获取市场宽度数据失败:', error)
    throw new Error(`获取市场宽度数据失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 获取市场宽度数据（导出函数）
 */
export async function getMarketBreadth(forceRefresh = true): Promise<MarketOverview['breadth']> {
  return await fetchMarketBreadth(forceRefresh)
}

// 创建服务实例
export const dashboardService = {
  getDashboardSettings,
  saveDashboardSettings,
  createDefaultDashboardSettings,
  getDefaultLayout,
  saveLayout,
  getLayout,
  resetLayout,
  addWidget,
  removeWidget,
  updateWidget,
  getWatchlists,
  createWatchlist,
  updateWatchlist,
  deleteWatchlist,
  addStockToWatchlist,
  removeStockFromWatchlist,
  getMarketOverview,
  getMarketBreadth
}
