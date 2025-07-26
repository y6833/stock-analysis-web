/**
 * 统一配置管理
 * 整合所有分散的配置，提供统一的配置访问接口
 */

import { CONSTANTS } from '@/constants'

/**
 * 环境变量接口
 */
interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test'
  API_BASE_URL: string
  WS_BASE_URL: string
  ENABLE_MOCK: boolean
  ENABLE_DEBUG: boolean
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error'
}

/**
 * API配置接口
 */
interface ApiConfig {
  baseURL: string
  timeout: number
  retryCount: number
  retryDelay: number
  enableCache: boolean
  cacheTimeout: number
  enableOffline: boolean
}

/**
 * 数据源配置接口
 */
interface DataSourceConfig {
  default: string
  priority: string[]
  timeout: number
  retryCount: number
  enableFallback: boolean
  cacheTimeout: number
}

/**
 * 缓存配置接口
 */
interface CacheConfig {
  enabled: boolean
  defaultTTL: number
  maxSize: number
  storageType: 'localStorage' | 'sessionStorage' | 'memory'
  enableCompression: boolean
  enableEncryption: boolean
}

/**
 * 用户界面配置接口
 */
interface UIConfig {
  theme: 'light' | 'dark' | 'auto'
  language: string
  pageSize: number
  animationDuration: number
  enableAnimations: boolean
  enableSounds: boolean
  enableNotifications: boolean
}

/**
 * 安全配置接口
 */
interface SecurityConfig {
  enableCSRF: boolean
  enableXSS: boolean
  tokenExpiry: number
  refreshTokenExpiry: number
  maxLoginAttempts: number
  lockoutDuration: number
}

/**
 * 性能配置接口
 */
interface PerformanceConfig {
  enableLazyLoading: boolean
  enableCodeSplitting: boolean
  enablePreloading: boolean
  enableServiceWorker: boolean
  enableGzip: boolean
  bundleAnalyzer: boolean
}

/**
 * 应用配置接口
 */
interface AppConfig {
  name: string
  version: string
  description: string
  author: string
  homepage: string
  repository: string
  license: string
}

/**
 * 完整配置接口
 */
interface Config {
  env: EnvironmentConfig
  app: AppConfig
  api: ApiConfig
  dataSource: DataSourceConfig
  cache: CacheConfig
  ui: UIConfig
  security: SecurityConfig
  performance: PerformanceConfig
}

/**
 * 获取环境变量
 */
function getEnvVar(key: string, defaultValue?: string): string {
  if (typeof window !== 'undefined') {
    // 浏览器环境 - 使用 import.meta.env
    return (import.meta.env as any)[`VITE_${key}`] || (window as any).__ENV__?.[key] || defaultValue || ''
  } else {
    // Node.js环境
    return (typeof process !== 'undefined' ? process.env[key] : undefined) || defaultValue || ''
  }
}

/**
 * 获取布尔型环境变量
 */
function getBooleanEnvVar(key: string, defaultValue: boolean = false): boolean {
  const value = getEnvVar(key)
  if (!value) return defaultValue
  return value.toLowerCase() === 'true' || value === '1'
}

/**
 * 获取数字型环境变量
 */
function getNumberEnvVar(key: string, defaultValue: number = 0): number {
  const value = getEnvVar(key)
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * 环境配置
 */
const envConfig: EnvironmentConfig = {
  NODE_ENV: (getEnvVar('NODE_ENV', 'development') as any) || 'development',
  API_BASE_URL: getEnvVar('VITE_API_BASE_URL', 'http://localhost:7001'),
  WS_BASE_URL: getEnvVar('VITE_WS_BASE_URL', 'ws://localhost:7001'),
  ENABLE_MOCK: getBooleanEnvVar('VITE_ENABLE_MOCK', false),
  ENABLE_DEBUG: getBooleanEnvVar('VITE_ENABLE_DEBUG', envConfig?.NODE_ENV === 'development'),
  LOG_LEVEL: (getEnvVar('VITE_LOG_LEVEL', 'info') as any) || 'info'
}

/**
 * 应用配置
 */
const appConfig: AppConfig = {
  name: '股票分析系统',
  version: '2.0.0',
  description: '专业的股票分析和投资管理平台',
  author: 'Stock Analysis Team',
  homepage: 'https://stock-analysis.com',
  repository: 'https://github.com/stock-analysis/web',
  license: 'MIT'
}

/**
 * API配置
 */
const apiConfig: ApiConfig = {
  baseURL: envConfig.API_BASE_URL + '/api/v1',
  timeout: getNumberEnvVar('VITE_API_TIMEOUT', CONSTANTS.API.TIMEOUT),
  retryCount: getNumberEnvVar('VITE_API_RETRY_COUNT', CONSTANTS.API.RETRY_COUNT),
  retryDelay: getNumberEnvVar('VITE_API_RETRY_DELAY', 1000),
  enableCache: getBooleanEnvVar('VITE_API_ENABLE_CACHE', true),
  cacheTimeout: getNumberEnvVar('VITE_API_CACHE_TIMEOUT', CONSTANTS.CACHE.TTL.MEDIUM),
  enableOffline: getBooleanEnvVar('VITE_API_ENABLE_OFFLINE', true)
}

/**
 * 数据源配置
 */
const dataSourceConfig: DataSourceConfig = {
  default: getEnvVar('VITE_DEFAULT_DATA_SOURCE', CONSTANTS.DATA_SOURCE.TYPES.TUSHARE),
  priority: [
    CONSTANTS.DATA_SOURCE.TYPES.TUSHARE,
    CONSTANTS.DATA_SOURCE.TYPES.DATABASE,
    CONSTANTS.DATA_SOURCE.TYPES.SINA,
    CONSTANTS.DATA_SOURCE.TYPES.EASTMONEY
  ],
  timeout: getNumberEnvVar('VITE_DATA_SOURCE_TIMEOUT', 10000),
  retryCount: getNumberEnvVar('VITE_DATA_SOURCE_RETRY_COUNT', 2),
  enableFallback: getBooleanEnvVar('VITE_DATA_SOURCE_ENABLE_FALLBACK', true),
  cacheTimeout: getNumberEnvVar('VITE_DATA_SOURCE_CACHE_TIMEOUT', CONSTANTS.CACHE.TTL.LONG)
}

/**
 * 缓存配置
 */
const cacheConfig: CacheConfig = {
  enabled: getBooleanEnvVar('VITE_CACHE_ENABLED', true),
  defaultTTL: getNumberEnvVar('VITE_CACHE_DEFAULT_TTL', CONSTANTS.CACHE.TTL.MEDIUM),
  maxSize: getNumberEnvVar('VITE_CACHE_MAX_SIZE', 100),
  storageType: (getEnvVar('VITE_CACHE_STORAGE_TYPE', 'localStorage') as any) || 'localStorage',
  enableCompression: getBooleanEnvVar('VITE_CACHE_ENABLE_COMPRESSION', false),
  enableEncryption: getBooleanEnvVar('VITE_CACHE_ENABLE_ENCRYPTION', false)
}

/**
 * UI配置
 */
const uiConfig: UIConfig = {
  theme: (getEnvVar('VITE_UI_THEME', 'light') as any) || 'light',
  language: getEnvVar('VITE_UI_LANGUAGE', 'zh-CN'),
  pageSize: getNumberEnvVar('VITE_UI_PAGE_SIZE', CONSTANTS.UI.PAGINATION.DEFAULT_PAGE_SIZE),
  animationDuration: getNumberEnvVar('VITE_UI_ANIMATION_DURATION', CONSTANTS.UI.ANIMATION_DURATION.NORMAL),
  enableAnimations: getBooleanEnvVar('VITE_UI_ENABLE_ANIMATIONS', true),
  enableSounds: getBooleanEnvVar('VITE_UI_ENABLE_SOUNDS', false),
  enableNotifications: getBooleanEnvVar('VITE_UI_ENABLE_NOTIFICATIONS', true)
}

/**
 * 安全配置
 */
const securityConfig: SecurityConfig = {
  enableCSRF: getBooleanEnvVar('VITE_SECURITY_ENABLE_CSRF', true),
  enableXSS: getBooleanEnvVar('VITE_SECURITY_ENABLE_XSS', true),
  tokenExpiry: getNumberEnvVar('VITE_SECURITY_TOKEN_EXPIRY', 24 * 60 * 60 * 1000), // 24小时
  refreshTokenExpiry: getNumberEnvVar('VITE_SECURITY_REFRESH_TOKEN_EXPIRY', 7 * 24 * 60 * 60 * 1000), // 7天
  maxLoginAttempts: getNumberEnvVar('VITE_SECURITY_MAX_LOGIN_ATTEMPTS', 5),
  lockoutDuration: getNumberEnvVar('VITE_SECURITY_LOCKOUT_DURATION', 15 * 60 * 1000) // 15分钟
}

/**
 * 性能配置
 */
const performanceConfig: PerformanceConfig = {
  enableLazyLoading: getBooleanEnvVar('VITE_PERFORMANCE_ENABLE_LAZY_LOADING', true),
  enableCodeSplitting: getBooleanEnvVar('VITE_PERFORMANCE_ENABLE_CODE_SPLITTING', true),
  enablePreloading: getBooleanEnvVar('VITE_PERFORMANCE_ENABLE_PRELOADING', true),
  enableServiceWorker: getBooleanEnvVar('VITE_PERFORMANCE_ENABLE_SERVICE_WORKER', envConfig.NODE_ENV === 'production'),
  enableGzip: getBooleanEnvVar('VITE_PERFORMANCE_ENABLE_GZIP', envConfig.NODE_ENV === 'production'),
  bundleAnalyzer: getBooleanEnvVar('VITE_PERFORMANCE_BUNDLE_ANALYZER', false)
}

/**
 * 完整配置对象
 */
export const config: Config = {
  env: envConfig,
  app: appConfig,
  api: apiConfig,
  dataSource: dataSourceConfig,
  cache: cacheConfig,
  ui: uiConfig,
  security: securityConfig,
  performance: performanceConfig
}

/**
 * 配置验证
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 验证必需的环境变量
  if (!config.env.API_BASE_URL) {
    errors.push('API_BASE_URL is required')
  }

  // 验证API配置
  if (config.api.timeout <= 0) {
    errors.push('API timeout must be greater than 0')
  }

  if (config.api.retryCount < 0) {
    errors.push('API retry count must be non-negative')
  }

  // 验证缓存配置
  if (config.cache.defaultTTL <= 0) {
    errors.push('Cache default TTL must be greater than 0')
  }

  if (config.cache.maxSize <= 0) {
    errors.push('Cache max size must be greater than 0')
  }

  // 验证UI配置
  if (config.ui.pageSize <= 0) {
    errors.push('UI page size must be greater than 0')
  }

  // 验证安全配置
  if (config.security.tokenExpiry <= 0) {
    errors.push('Token expiry must be greater than 0')
  }

  if (config.security.maxLoginAttempts <= 0) {
    errors.push('Max login attempts must be greater than 0')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 获取配置值的工具函数
 */
export function getConfig<T>(path: string, defaultValue?: T): T {
  const keys = path.split('.')
  let current: any = config

  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return defaultValue as T
    }
    current = current[key]
  }

  return current as T
}

/**
 * 设置配置值的工具函数（仅用于运行时配置）
 */
export function setConfig(path: string, value: any): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  let current: any = config

  for (const key of keys) {
    if (!(key in current)) {
      current[key] = {}
    }
    current = current[key]
  }

  current[lastKey] = value
}

/**
 * 获取环境特定的配置
 */
export function getEnvConfig(): EnvironmentConfig {
  return config.env
}

/**
 * 判断是否为开发环境
 */
export function isDevelopment(): boolean {
  return config.env.NODE_ENV === 'development'
}

/**
 * 判断是否为生产环境
 */
export function isProduction(): boolean {
  return config.env.NODE_ENV === 'production'
}

/**
 * 判断是否为测试环境
 */
export function isTest(): boolean {
  return config.env.NODE_ENV === 'test'
}

/**
 * 获取完整配置（只读）
 */
export function getFullConfig(): Readonly<Config> {
  return Object.freeze({ ...config })
}

// 在开发环境下验证配置
if (isDevelopment()) {
  const validation = validateConfig()
  if (!validation.valid) {
    console.error('Configuration validation failed:', validation.errors)
  } else {
    console.log('Configuration validation passed')
  }
}

export default config