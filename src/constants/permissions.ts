/**
 * 权限常量
 * 定义系统中使用的所有权限代码
 */

// 用户权限
export const USER_PERMISSIONS = {
  // 用户管理
  VIEW_USERS: 'user:view',
  CREATE_USER: 'user:create',
  UPDATE_USER: 'user:update',
  DELETE_USER: 'user:delete',
  
  // 个人资料
  VIEW_PROFILE: 'profile:view',
  UPDATE_PROFILE: 'profile:update',
  
  // 用户设置
  VIEW_SETTINGS: 'settings:view',
  UPDATE_SETTINGS: 'settings:update',
}

// 股票分析权限
export const STOCK_PERMISSIONS = {
  // 基本股票功能
  VIEW_STOCK: 'stock:view',
  SEARCH_STOCK: 'stock:search',
  
  // 技术分析
  USE_BASIC_INDICATORS: 'stock:use_basic_indicators',
  USE_ADVANCED_INDICATORS: 'stock:use_advanced_indicators',
  SAVE_CUSTOM_INDICATORS: 'stock:save_custom_indicators',
  
  // 图表功能
  VIEW_BASIC_CHARTS: 'chart:view_basic',
  VIEW_ADVANCED_CHARTS: 'chart:view_advanced',
  EXPORT_CHARTS: 'chart:export',
}

// 市场分析权限
export const MARKET_PERMISSIONS = {
  VIEW_MARKET_DATA: 'market:view',
  VIEW_HEATMAP: 'market:view_heatmap',
  VIEW_INDUSTRY_ANALYSIS: 'market:view_industry',
  USE_MARKET_SCANNER: 'market:use_scanner',
}

// 关注列表权限
export const WATCHLIST_PERMISSIONS = {
  VIEW_WATCHLIST: 'watchlist:view',
  CREATE_WATCHLIST: 'watchlist:create',
  UPDATE_WATCHLIST: 'watchlist:update',
  DELETE_WATCHLIST: 'watchlist:delete',
  SHARE_WATCHLIST: 'watchlist:share',
}

// 投资组合权限
export const PORTFOLIO_PERMISSIONS = {
  VIEW_PORTFOLIO: 'portfolio:view',
  CREATE_PORTFOLIO: 'portfolio:create',
  UPDATE_PORTFOLIO: 'portfolio:update',
  DELETE_PORTFOLIO: 'portfolio:delete',
  VIEW_PERFORMANCE: 'portfolio:view_performance',
  USE_ADVANCED_ANALYSIS: 'portfolio:use_advanced_analysis',
}

// 交易策略权限
export const STRATEGY_PERMISSIONS = {
  VIEW_STRATEGIES: 'strategy:view',
  USE_BASIC_STRATEGIES: 'strategy:use_basic',
  USE_ADVANCED_STRATEGIES: 'strategy:use_advanced',
  CREATE_CUSTOM_STRATEGY: 'strategy:create_custom',
  SHARE_STRATEGY: 'strategy:share',
}

// 回测权限
export const BACKTEST_PERMISSIONS = {
  RUN_BASIC_BACKTEST: 'backtest:run_basic',
  RUN_ADVANCED_BACKTEST: 'backtest:run_advanced',
  SAVE_BACKTEST_RESULTS: 'backtest:save_results',
  SHARE_BACKTEST_RESULTS: 'backtest:share_results',
}

// 提醒权限
export const ALERT_PERMISSIONS = {
  VIEW_ALERTS: 'alert:view',
  CREATE_ALERT: 'alert:create',
  UPDATE_ALERT: 'alert:update',
  DELETE_ALERT: 'alert:delete',
  RECEIVE_NOTIFICATIONS: 'alert:receive_notifications',
}

// 数据导出权限
export const EXPORT_PERMISSIONS = {
  EXPORT_DATA: 'export:data',
  SCHEDULE_EXPORTS: 'export:schedule',
}

// 管理员权限
export const ADMIN_PERMISSIONS = {
  // 用户管理
  MANAGE_USERS: 'admin:manage_users',
  
  // 角色和权限管理
  MANAGE_ROLES: 'admin:manage_roles',
  MANAGE_PERMISSIONS: 'admin:manage_permissions',
  
  // 系统设置
  MANAGE_SYSTEM_SETTINGS: 'admin:manage_settings',
  
  // 数据源管理
  MANAGE_DATA_SOURCES: 'admin:manage_data_sources',
  
  // 缓存管理
  MANAGE_CACHE: 'admin:manage_cache',
  
  // 系统监控
  VIEW_SYSTEM_METRICS: 'admin:view_metrics',
  
  // 日志管理
  VIEW_LOGS: 'admin:view_logs',
}

// 订阅级别权限
export const SUBSCRIPTION_PERMISSIONS = {
  // 基础会员
  ACCESS_BASIC_FEATURES: 'subscription:basic',
  
  // 高级会员
  ACCESS_PREMIUM_FEATURES: 'subscription:premium',
  
  // 企业会员
  ACCESS_ENTERPRISE_FEATURES: 'subscription:enterprise',
}

// 所有权限集合
export const ALL_PERMISSIONS = {
  ...USER_PERMISSIONS,
  ...STOCK_PERMISSIONS,
  ...MARKET_PERMISSIONS,
  ...WATCHLIST_PERMISSIONS,
  ...PORTFOLIO_PERMISSIONS,
  ...STRATEGY_PERMISSIONS,
  ...BACKTEST_PERMISSIONS,
  ...ALERT_PERMISSIONS,
  ...EXPORT_PERMISSIONS,
  ...ADMIN_PERMISSIONS,
  ...SUBSCRIPTION_PERMISSIONS,
}

// 默认角色权限映射
export const DEFAULT_ROLE_PERMISSIONS = {
  // 管理员角色拥有所有权限
  admin: Object.values(ALL_PERMISSIONS),
  
  // 普通用户角色拥有基本权限
  user: [
    USER_PERMISSIONS.VIEW_PROFILE,
    USER_PERMISSIONS.UPDATE_PROFILE,
    USER_PERMISSIONS.VIEW_SETTINGS,
    USER_PERMISSIONS.UPDATE_SETTINGS,
    STOCK_PERMISSIONS.VIEW_STOCK,
    STOCK_PERMISSIONS.SEARCH_STOCK,
    STOCK_PERMISSIONS.USE_BASIC_INDICATORS,
    STOCK_PERMISSIONS.VIEW_BASIC_CHARTS,
    MARKET_PERMISSIONS.VIEW_MARKET_DATA,
    MARKET_PERMISSIONS.VIEW_HEATMAP,
    MARKET_PERMISSIONS.VIEW_INDUSTRY_ANALYSIS,
    WATCHLIST_PERMISSIONS.VIEW_WATCHLIST,
    WATCHLIST_PERMISSIONS.CREATE_WATCHLIST,
    WATCHLIST_PERMISSIONS.UPDATE_WATCHLIST,
    WATCHLIST_PERMISSIONS.DELETE_WATCHLIST,
  ],
  
  // 高级用户角色拥有更多权限
  premium_user: [
    // 包含普通用户的所有权限
    ...DEFAULT_ROLE_PERMISSIONS.user,
    // 额外的高级权限
    STOCK_PERMISSIONS.USE_ADVANCED_INDICATORS,
    STOCK_PERMISSIONS.SAVE_CUSTOM_INDICATORS,
    STOCK_PERMISSIONS.VIEW_ADVANCED_CHARTS,
    STOCK_PERMISSIONS.EXPORT_CHARTS,
    MARKET_PERMISSIONS.USE_MARKET_SCANNER,
    PORTFOLIO_PERMISSIONS.VIEW_PORTFOLIO,
    PORTFOLIO_PERMISSIONS.CREATE_PORTFOLIO,
    PORTFOLIO_PERMISSIONS.UPDATE_PORTFOLIO,
    PORTFOLIO_PERMISSIONS.DELETE_PORTFOLIO,
    PORTFOLIO_PERMISSIONS.VIEW_PERFORMANCE,
    STRATEGY_PERMISSIONS.VIEW_STRATEGIES,
    STRATEGY_PERMISSIONS.USE_BASIC_STRATEGIES,
    BACKTEST_PERMISSIONS.RUN_BASIC_BACKTEST,
    ALERT_PERMISSIONS.VIEW_ALERTS,
    ALERT_PERMISSIONS.CREATE_ALERT,
    ALERT_PERMISSIONS.UPDATE_ALERT,
    ALERT_PERMISSIONS.DELETE_ALERT,
    ALERT_PERMISSIONS.RECEIVE_NOTIFICATIONS,
    SUBSCRIPTION_PERMISSIONS.ACCESS_BASIC_FEATURES,
    SUBSCRIPTION_PERMISSIONS.ACCESS_PREMIUM_FEATURES,
  ],
  
  // 企业用户角色拥有全部非管理员权限
  enterprise_user: [
    // 包含高级用户的所有权限
    ...DEFAULT_ROLE_PERMISSIONS.premium_user,
    // 额外的企业级权限
    PORTFOLIO_PERMISSIONS.USE_ADVANCED_ANALYSIS,
    STRATEGY_PERMISSIONS.USE_ADVANCED_STRATEGIES,
    STRATEGY_PERMISSIONS.CREATE_CUSTOM_STRATEGY,
    STRATEGY_PERMISSIONS.SHARE_STRATEGY,
    BACKTEST_PERMISSIONS.RUN_ADVANCED_BACKTEST,
    BACKTEST_PERMISSIONS.SAVE_BACKTEST_RESULTS,
    BACKTEST_PERMISSIONS.SHARE_BACKTEST_RESULTS,
    EXPORT_PERMISSIONS.EXPORT_DATA,
    EXPORT_PERMISSIONS.SCHEDULE_EXPORTS,
    WATCHLIST_PERMISSIONS.SHARE_WATCHLIST,
    SUBSCRIPTION_PERMISSIONS.ACCESS_ENTERPRISE_FEATURES,
  ],
}