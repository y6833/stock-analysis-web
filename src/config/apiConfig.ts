/**
 * API配置管理器
 * 统一管理所有数据源的API配置和密钥
 */

export interface ApiConfig {
  baseUrl: string
  apiKey?: string
  apiSecret?: string
  timeout: number
  retryCount: number
  headers?: Record<string, string>
}

export interface DataSourceApiConfigs {
  zhitu: ApiConfig
  yahoo_finance: ApiConfig
  google_finance: ApiConfig
  juhe: ApiConfig
}

/**
 * 获取环境变量，支持默认值
 */
function getEnvVar(key: string, defaultValue: string = ''): string {
  // 在浏览器环境中，从 import.meta.env 获取
  if (typeof window !== 'undefined') {
    return (import.meta.env as any)[`VITE_${key}`] || defaultValue
  }

  // 在Node.js环境中，从 process.env 获取
  return process.env[key] || defaultValue
}

/**
 * 获取数字类型的环境变量
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = getEnvVar(key, defaultValue.toString())
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * 获取布尔类型的环境变量
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = getEnvVar(key, defaultValue.toString()).toLowerCase()
  return value === 'true' || value === '1' || value === 'yes'
}

/**
 * 智兔数服API配置
 */
export const zhituConfig: ApiConfig = {
  baseUrl: getEnvVar('ZHITU_BASE_URL', 'https://api.zhitudata.com'),
  apiKey: getEnvVar('ZHITU_API_KEY'),
  apiSecret: getEnvVar('ZHITU_API_SECRET', getEnvVar('ZHITU_API_KEY')), // 如果没有单独的secret，使用token作为secret
  timeout: getEnvNumber('API_REQUEST_TIMEOUT', 10000),
  retryCount: getEnvNumber('API_RETRY_COUNT', 3),
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'HappyStockMarket/1.0',
    Authorization: `Bearer ${getEnvVar('ZHITU_API_KEY')}`, // 添加Bearer token认证
  },
}

/**
 * Yahoo Finance API配置
 */
export const yahooFinanceConfig: ApiConfig = {
  baseUrl: getEnvBoolean('YAHOO_FINANCE_FREE', true)
    ? 'https://query1.finance.yahoo.com'
    : 'https://yahoo-finance1.p.rapidapi.com',
  apiKey: getEnvVar('YAHOO_FINANCE_RAPIDAPI_KEY'),
  timeout: getEnvNumber('API_REQUEST_TIMEOUT', 10000),
  retryCount: getEnvNumber('API_RETRY_COUNT', 3),
  headers: getEnvBoolean('YAHOO_FINANCE_FREE', true)
    ? {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; HappyStockMarket/1.0)',
      }
    : {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': getEnvVar('YAHOO_FINANCE_RAPIDAPI_KEY'),
        'X-RapidAPI-Host': getEnvVar(
          'YAHOO_FINANCE_RAPIDAPI_HOST',
          'yahoo-finance1.p.rapidapi.com'
        ),
      },
}

/**
 * Google Finance API配置（使用Alpha Vantage替代）
 */
export const googleFinanceConfig: ApiConfig = {
  baseUrl: getEnvVar('ALPHA_VANTAGE_BASE_URL', 'https://www.alphavantage.co'),
  apiKey: getEnvVar('ALPHA_VANTAGE_API_KEY'),
  timeout: getEnvNumber('API_REQUEST_TIMEOUT', 10000),
  retryCount: getEnvNumber('API_RETRY_COUNT', 3),
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'HappyStockMarket/1.0',
  },
}

/**
 * 聚合数据API配置
 */
export const juheConfig: ApiConfig = {
  baseUrl: getEnvVar('JUHE_BASE_URL', 'http://apis.juhe.cn'),
  apiKey: getEnvVar('JUHE_API_KEY'),
  timeout: getEnvNumber('API_REQUEST_TIMEOUT', 10000),
  retryCount: getEnvNumber('API_RETRY_COUNT', 3),
  headers: {
    'Content-Type': 'application/json',
  },
}

/**
 * 所有数据源API配置
 */
export const dataSourceConfigs: DataSourceApiConfigs = {
  zhitu: zhituConfig,
  yahoo_finance: yahooFinanceConfig,
  google_finance: googleFinanceConfig,
  juhe: juheConfig,
}

/**
 * 验证API配置是否完整
 */
export function validateApiConfig(sourceType: keyof DataSourceApiConfigs): {
  isValid: boolean
  missingFields: string[]
  warnings: string[]
} {
  const config = dataSourceConfigs[sourceType]
  const missingFields: string[] = []
  const warnings: string[] = []

  // 检查基础配置
  if (!config.baseUrl) {
    missingFields.push('baseUrl')
  }

  // 根据不同数据源检查特定配置
  switch (sourceType) {
    case 'zhitu':
      if (!config.apiKey) missingFields.push('apiKey (token)')
      // 智兔数服只需要token，不需要单独的secret
      break

    case 'yahoo_finance':
      if (!getEnvBoolean('YAHOO_FINANCE_FREE', true) && !config.apiKey) {
        missingFields.push('apiKey (for paid version)')
      }
      if (getEnvBoolean('YAHOO_FINANCE_FREE', true)) {
        warnings.push('Using free Yahoo Finance API with rate limits')
      }
      break

    case 'google_finance':
      if (!config.apiKey) {
        warnings.push('No Alpha Vantage API key, using limited access')
      }
      break

    case 'juhe':
      if (!config.apiKey) missingFields.push('apiKey')
      break
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings,
  }
}

/**
 * 获取API配置状态报告
 */
export function getApiConfigStatus(): Record<
  keyof DataSourceApiConfigs,
  ReturnType<typeof validateApiConfig>
> {
  return {
    zhitu: validateApiConfig('zhitu'),
    yahoo_finance: validateApiConfig('yahoo_finance'),
    google_finance: validateApiConfig('google_finance'),
    juhe: validateApiConfig('juhe'),
  }
}

/**
 * 通用API请求配置
 */
export const commonApiConfig = {
  timeout: getEnvNumber('API_REQUEST_TIMEOUT', 10000),
  retryCount: getEnvNumber('API_RETRY_COUNT', 3),
  enableCache: getEnvBoolean('ENABLE_API_CACHE', true),
  cacheDuration: getEnvNumber('CACHE_DURATION', 300000), // 5分钟
  maxConcurrentRequests: getEnvNumber('MAX_CONCURRENT_REQUESTS', 10),
}

/**
 * 开发环境配置检查
 */
export function checkDevelopmentConfig(): void {
  if (import.meta.env.DEV) {
    console.group('🔧 API配置状态检查')

    const status = getApiConfigStatus()

    Object.entries(status).forEach(([source, config]) => {
      console.log(`\n📊 ${source}:`)
      console.log(`  ✅ 配置有效: ${config.isValid ? '是' : '否'}`)

      if (config.missingFields.length > 0) {
        console.log(`  ❌ 缺失字段: ${config.missingFields.join(', ')}`)
      }

      if (config.warnings.length > 0) {
        console.log(`  ⚠️  警告: ${config.warnings.join(', ')}`)
      }
    })

    console.log('\n💡 提示: 请查看 api-keys-config.md 了解如何配置API密钥')
    console.groupEnd()
  }
}

// 在开发环境下自动检查配置
if (import.meta.env.DEV) {
  checkDevelopmentConfig()
}
