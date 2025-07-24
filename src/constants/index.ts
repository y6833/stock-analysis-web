/**
 * 统一常量定义
 * 整合所有分散的常量定义，提供统一的常量管理
 */

// API相关常量
export const API_CONSTANTS = {
  BASE_URL: '/api/v1',
  TIMEOUT: 8000,
  RETRY_COUNT: 3,
  
  // HTTP状态码
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },
  
  // 请求头
  HEADERS: {
    CONTENT_TYPE: 'Content-Type',
    AUTHORIZATION: 'Authorization',
    X_CSRF_TOKEN: 'X-CSRF-Token',
    X_DATA_SOURCE: 'X-Data-Source'
  }
} as const

// 缓存相关常量
export const CACHE_CONSTANTS = {
  // 缓存键前缀
  PREFIXES: {
    API: 'api_cache:',
    USER: 'user_cache:',
    STOCK: 'stock_cache:',
    WATCHLIST: 'watchlist_cache:',
    PORTFOLIO: 'portfolio_cache:'
  },
  
  // 缓存过期时间 (毫秒)
  TTL: {
    SHORT: 5 * 60 * 1000,      // 5分钟
    MEDIUM: 30 * 60 * 1000,    // 30分钟
    LONG: 60 * 60 * 1000,      // 1小时
    VERY_LONG: 24 * 60 * 60 * 1000  // 24小时
  },
  
  // 缓存版本
  VERSIONS: {
    API: '2.0',
    USER: '1.0',
    STOCK: '2.1'
  }
} as const

// 数据源相关常量
export const DATA_SOURCE_CONSTANTS = {
  TYPES: {
    TUSHARE: 'tushare',
    SINA: 'sina',
    EASTMONEY: 'eastmoney',
    ALPHAVANTAGE: 'alphavantage',
    DATABASE: 'database'
  },
  
  NAMES: {
    tushare: 'Tushare',
    sina: '新浪财经',
    eastmoney: '东方财富',
    alphavantage: 'Alpha Vantage',
    database: '数据库'
  },
  
  PRIORITIES: {
    tushare: 1,
    database: 2,
    sina: 3,
    eastmoney: 4,
    alphavantage: 5
  }
} as const

// 用户相关常量
export const USER_CONSTANTS = {
  // 用户角色
  ROLES: {
    USER: 'user',
    ADMIN: 'admin',
    MODERATOR: 'moderator'
  },
  
  // 订阅类型
  SUBSCRIPTION_TYPES: {
    FREE: 'free',
    BASIC: 'basic',
    PREMIUM: 'premium',
    ENTERPRISE: 'enterprise'
  },
  
  // 用户状态
  STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    PENDING: 'pending'
  }
} as const

// 股票相关常量
export const STOCK_CONSTANTS = {
  // 市场类型
  MARKETS: {
    SH: 'SH',  // 上海证券交易所
    SZ: 'SZ',  // 深圳证券交易所
    BJ: 'BJ',  // 北京证券交易所
    HK: 'HK',  // 香港证券交易所
    US: 'US'   // 美国证券交易所
  },
  
  // 股票类型
  TYPES: {
    STOCK: 'stock',
    INDEX: 'index',
    FUND: 'fund',
    BOND: 'bond',
    OPTION: 'option',
    FUTURE: 'future'
  },
  
  // 交易状态
  TRADING_STATUS: {
    TRADING: 'trading',
    SUSPENDED: 'suspended',
    DELISTED: 'delisted',
    PRE_MARKET: 'pre_market',
    AFTER_MARKET: 'after_market'
  },
  
  // 价格变动方向
  PRICE_DIRECTION: {
    UP: 'up',
    DOWN: 'down',
    FLAT: 'flat'
  }
} as const

// UI相关常量
export const UI_CONSTANTS = {
  // 组件尺寸
  SIZES: {
    SMALL: 'small',
    MEDIUM: 'medium',
    LARGE: 'large'
  },
  
  // 组件变体
  VARIANTS: {
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    INFO: 'info'
  },
  
  // 主题
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto'
  },
  
  // 分页
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
    MAX_PAGE_SIZE: 1000
  },
  
  // 动画持续时间
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500
  }
} as const

// 错误相关常量
export const ERROR_CONSTANTS = {
  // 错误类型
  TYPES: {
    NETWORK: 'network',
    AUTH: 'auth',
    PERMISSION: 'permission',
    VALIDATION: 'validation',
    SERVER: 'server',
    CLIENT: 'client',
    OFFLINE: 'offline',
    UNKNOWN: 'unknown'
  },
  
  // 错误严重程度
  SEVERITY: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  },
  
  // 错误代码
  CODES: {
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    AUTH_FAILED: 'AUTH_FAILED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    SERVER_ERROR: 'SERVER_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    OFFLINE: 'OFFLINE'
  }
} as const

// 本地存储相关常量
export const STORAGE_CONSTANTS = {
  // 存储键
  KEYS: {
    AUTH_TOKEN: 'auth_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_INFO: 'user_info',
    USER_PREFERENCES: 'user_preferences',
    THEME: 'theme',
    LANGUAGE: 'language',
    DATA_SOURCE: 'preferredDataSource',
    WATCHLIST: 'watchlist',
    PORTFOLIO: 'portfolio',
    DASHBOARD_SETTINGS: 'dashboard_settings'
  },
  
  // 存储类型
  TYPES: {
    LOCAL: 'localStorage',
    SESSION: 'sessionStorage',
    COOKIE: 'cookie'
  }
} as const

// 路由相关常量
export const ROUTE_CONSTANTS = {
  // 路由名称
  NAMES: {
    HOME: 'Home',
    LOGIN: 'Login',
    REGISTER: 'Register',
    DASHBOARD: 'Dashboard',
    STOCK_ANALYSIS: 'StockAnalysis',
    WATCHLIST: 'Watchlist',
    PORTFOLIO: 'Portfolio',
    SETTINGS: 'Settings',
    ADMIN: 'Admin'
  },
  
  // 路由路径
  PATHS: {
    HOME: '/',
    LOGIN: '/login',
    REGISTER: '/register',
    DASHBOARD: '/dashboard',
    STOCK_ANALYSIS: '/stock/:symbol',
    WATCHLIST: '/watchlist',
    PORTFOLIO: '/portfolio',
    SETTINGS: '/settings',
    ADMIN: '/admin'
  }
} as const

// 权限相关常量
export const PERMISSION_CONSTANTS = {
  // 权限类型
  TYPES: {
    READ: 'read',
    WRITE: 'write',
    DELETE: 'delete',
    ADMIN: 'admin'
  },
  
  // 资源类型
  RESOURCES: {
    STOCK: 'stock',
    WATCHLIST: 'watchlist',
    PORTFOLIO: 'portfolio',
    USER: 'user',
    ADMIN: 'admin',
    SETTINGS: 'settings'
  },
  
  // 权限级别
  LEVELS: {
    NONE: 0,
    READ: 1,
    WRITE: 2,
    ADMIN: 3
  }
} as const

// 通知相关常量
export const NOTIFICATION_CONSTANTS = {
  // 通知类型
  TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
  },
  
  // 通知位置
  POSITIONS: {
    TOP_LEFT: 'top-left',
    TOP_RIGHT: 'top-right',
    BOTTOM_LEFT: 'bottom-left',
    BOTTOM_RIGHT: 'bottom-right',
    TOP_CENTER: 'top-center',
    BOTTOM_CENTER: 'bottom-center'
  },
  
  // 通知持续时间
  DURATION: {
    SHORT: 3000,
    MEDIUM: 5000,
    LONG: 8000,
    PERMANENT: 0
  }
} as const

// 图表相关常量
export const CHART_CONSTANTS = {
  // 图表类型
  TYPES: {
    LINE: 'line',
    CANDLESTICK: 'candlestick',
    BAR: 'bar',
    AREA: 'area',
    SCATTER: 'scatter'
  },
  
  // 时间周期
  TIME_PERIODS: {
    '1m': '1分钟',
    '5m': '5分钟',
    '15m': '15分钟',
    '30m': '30分钟',
    '1h': '1小时',
    '4h': '4小时',
    '1d': '日线',
    '1w': '周线',
    '1M': '月线'
  },
  
  // 技术指标
  INDICATORS: {
    MA: 'MA',
    EMA: 'EMA',
    MACD: 'MACD',
    RSI: 'RSI',
    KDJ: 'KDJ',
    BOLL: 'BOLL',
    VOL: 'VOL'
  }
} as const

// 导出所有常量
export const CONSTANTS = {
  API: API_CONSTANTS,
  CACHE: CACHE_CONSTANTS,
  DATA_SOURCE: DATA_SOURCE_CONSTANTS,
  USER: USER_CONSTANTS,
  STOCK: STOCK_CONSTANTS,
  UI: UI_CONSTANTS,
  ERROR: ERROR_CONSTANTS,
  STORAGE: STORAGE_CONSTANTS,
  ROUTE: ROUTE_CONSTANTS,
  PERMISSION: PERMISSION_CONSTANTS,
  NOTIFICATION: NOTIFICATION_CONSTANTS,
  CHART: CHART_CONSTANTS
} as const

// 类型导出
export type ApiStatusCode = typeof API_CONSTANTS.STATUS_CODES[keyof typeof API_CONSTANTS.STATUS_CODES]
export type DataSourceType = typeof DATA_SOURCE_CONSTANTS.TYPES[keyof typeof DATA_SOURCE_CONSTANTS.TYPES]
export type UserRole = typeof USER_CONSTANTS.ROLES[keyof typeof USER_CONSTANTS.ROLES]
export type SubscriptionType = typeof USER_CONSTANTS.SUBSCRIPTION_TYPES[keyof typeof USER_CONSTANTS.SUBSCRIPTION_TYPES]
export type StockMarket = typeof STOCK_CONSTANTS.MARKETS[keyof typeof STOCK_CONSTANTS.MARKETS]
export type ComponentSize = typeof UI_CONSTANTS.SIZES[keyof typeof UI_CONSTANTS.SIZES]
export type ComponentVariant = typeof UI_CONSTANTS.VARIANTS[keyof typeof UI_CONSTANTS.VARIANTS]
export type ErrorType = typeof ERROR_CONSTANTS.TYPES[keyof typeof ERROR_CONSTANTS.TYPES]
export type ErrorSeverity = typeof ERROR_CONSTANTS.SEVERITY[keyof typeof ERROR_CONSTANTS.SEVERITY]
export type NotificationType = typeof NOTIFICATION_CONSTANTS.TYPES[keyof typeof NOTIFICATION_CONSTANTS.TYPES]
export type ChartType = typeof CHART_CONSTANTS.TYPES[keyof typeof CHART_CONSTANTS.TYPES]

export default CONSTANTS