/**
 * 仪表盘相关类型定义
 */

// 仪表盘小部件类型
export type WidgetType =
  | 'watchlist' // 关注列表
  | 'market_overview' // 市场概览
  | 'index_chart' // 指数图表
  | 'stock_chart' // 股票图表
  | 'news' // 新闻
  | 'calendar' // 日历
  | 'performance' // 表现分析
  | 'heatmap' // 热力图
  | 'sector_rotation' // 板块轮动
  | 'custom_chart' // 自定义图表

// 小部件尺寸
export interface WidgetSize {
  w: number // 宽度（网格单位）
  h: number // 高度（网格单位）
  minW?: number // 最小宽度
  minH?: number // 最小高度
  maxW?: number // 最大宽度
  maxH?: number // 最大高度
}

// 小部件位置
export interface WidgetPosition {
  x: number // 横坐标（网格单位）
  y: number // 纵坐标（网格单位）
}

// 小部件配置
export interface WidgetConfig {
  id: string
  type: WidgetType
  title: string
  size: WidgetSize
  position: WidgetPosition
  settings: any // 特定于小部件类型的设置
}

// 仪表盘布局
export interface DashboardLayout {
  id: string
  name: string
  isDefault: boolean
  widgets: WidgetConfig[]
  gridSettings: {
    cols: number
    rowHeight: number
    gap: number
  }
}

// 关注列表项
export interface WatchlistItem {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  turnover: number
  marketCap?: number
  pe?: number
  notes?: string
  addedAt: string
  alerts?: WatchlistAlert[]
  tags?: string[]
}

// 关注列表
export interface Watchlist {
  id: string
  name: string
  items: WatchlistItem[]
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  columns?: string[] // 要显示的列
}

// 关注列表提醒
export interface WatchlistAlert {
  id: string
  type: 'price' | 'volume' | 'technical' | 'news'
  condition: 'above' | 'below' | 'increase' | 'decrease' | 'crosses'
  value: number
  active: boolean
  triggered: boolean
  message: string
  createdAt: string
}

// 市场指数
export interface MarketIndex {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  turnover: number
  components?: number // 成分股数量
}

// 行业板块
export interface IndustrySector {
  id: string
  name: string
  change: number
  changePercent: number
  volume: number
  turnover: number
  leadingStocks: {
    symbol: string
    name: string
    changePercent: number
  }[]
  laggingStocks: {
    symbol: string
    name: string
    changePercent: number
  }[]
}

// 数据来源信息
export interface DataSource {
  type: 'api' | 'cache' | 'mock'
  name: string
  message: string
  timestamp: number
}

// 市场概览
export interface MarketOverview {
  indices: MarketIndex[]
  sectors: IndustrySector[]
  breadth: {
    advancing: number
    declining: number
    unchanged: number
    newHighs: number
    newLows: number
    advancingVolume: number
    decliningVolume: number
  }
  timestamp: string
  dataSource?: DataSource
}

// 用户仪表盘设置
export interface DashboardSettings {
  layouts: DashboardLayout[]
  activeLayoutId: string
  watchlists: Watchlist[]
  activeWatchlistId: string
  defaultSymbol?: string
  theme?: 'light' | 'dark' | 'auto'
  refreshInterval?: number // 数据刷新间隔（秒）
}
