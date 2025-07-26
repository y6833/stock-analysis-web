/**
 * Tushare API 配置管理
 * 负责管理 Tushare API 的配置、认证和限制
 */

// Tushare API 配置接口
export interface TushareConfig {
  token: string
  baseUrl: string
  proxyUrl: string
  rateLimit: number
  dailyLimit: number
  retryCount: number
  timeout: number
  debug: boolean
}

// 默认配置
const DEFAULT_CONFIG: TushareConfig = {
  token: '',
  baseUrl: 'http://api.tushare.pro',
  proxyUrl: '/api/tushare',
  rateLimit: 200, // 每分钟请求限制
  dailyLimit: 500, // 每日请求限制
  retryCount: 3,
  timeout: 30000,
  debug: true
}

// 从环境变量获取配置
function getConfigFromEnv(): Partial<TushareConfig> {
  return {
    token: import.meta.env.VITE_TUSHARE_API_TOKEN,
    baseUrl: import.meta.env.VITE_TUSHARE_BASE_URL,
    proxyUrl: import.meta.env.VITE_TUSHARE_PROXY_URL,
    rateLimit: Number(import.meta.env.VITE_TUSHARE_RATE_LIMIT) || undefined,
    dailyLimit: Number(import.meta.env.VITE_TUSHARE_DAILY_LIMIT) || undefined,
    retryCount: Number(import.meta.env.VITE_TUSHARE_RETRY_COUNT) || undefined,
  }
}

// 合并配置
function mergeConfig(): TushareConfig {
  const envConfig = getConfigFromEnv()
  return {
    ...DEFAULT_CONFIG,
    ...Object.fromEntries(
      Object.entries(envConfig).filter(([_, value]) => value !== undefined && value !== null && value !== '')
    )
  }
}

// 获取当前配置
export function getTushareConfig(): TushareConfig {
  return mergeConfig()
}

// 验证配置
export function validateTushareConfig(config: TushareConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 验证 token
  if (!config.token || config.token.trim() === '') {
    errors.push('Tushare API Token 未配置')
  } else if (config.token.length < 32) {
    errors.push('Tushare API Token 格式不正确，长度应至少为32位')
  }

  // 验证 URL
  if (!config.baseUrl || !isValidUrl(config.baseUrl)) {
    errors.push('Tushare Base URL 配置无效')
  }

  if (!config.proxyUrl || config.proxyUrl.trim() === '') {
    errors.push('Tushare Proxy URL 未配置')
  }

  // 验证数值配置
  if (config.rateLimit <= 0) {
    errors.push('速率限制必须大于0')
  }

  if (config.dailyLimit <= 0) {
    errors.push('每日限制必须大于0')
  }

  if (config.retryCount < 0) {
    errors.push('重试次数不能为负数')
  }

  if (config.timeout <= 0) {
    errors.push('超时时间必须大于0')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// URL 验证辅助函数
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Token 验证
export async function validateTushareToken(token: string): Promise<{ valid: boolean; message: string }> {
  if (!token || token.trim() === '') {
    return { valid: false, message: 'Token 不能为空' }
  }

  if (token.length < 32) {
    return { valid: false, message: 'Token 格式不正确，长度应至少为32位' }
  }

  // 这里可以添加实际的 token 验证逻辑
  // 例如调用 Tushare API 的测试接口
  try {
    // 暂时返回基本验证结果
    return { valid: true, message: 'Token 格式验证通过' }
  } catch (error) {
    return { valid: false, message: `Token 验证失败: ${error}` }
  }
}

// 配置状态管理
class TushareConfigManager {
  private config: TushareConfig
  private validated: boolean = false
  private validationErrors: string[] = []

  constructor() {
    this.config = getTushareConfig()
    this.validateConfig()
  }

  // 获取配置
  getConfig(): TushareConfig {
    return { ...this.config }
  }

  // 更新配置
  updateConfig(newConfig: Partial<TushareConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.validateConfig()
  }

  // 验证配置
  private validateConfig(): void {
    const validation = validateTushareConfig(this.config)
    this.validated = validation.valid
    this.validationErrors = validation.errors
  }

  // 检查配置是否有效
  isValid(): boolean {
    return this.validated
  }

  // 获取验证错误
  getValidationErrors(): string[] {
    return [...this.validationErrors]
  }

  // 获取 token
  getToken(): string {
    return this.config.token
  }

  // 获取代理 URL
  getProxyUrl(): string {
    return this.config.proxyUrl
  }

  // 获取速率限制
  getRateLimit(): number {
    return this.config.rateLimit
  }

  // 获取每日限制
  getDailyLimit(): number {
    return this.config.dailyLimit
  }

  // 获取重试次数
  getRetryCount(): number {
    return this.config.retryCount
  }

  // 获取超时时间
  getTimeout(): number {
    return this.config.timeout
  }

  // 是否启用调试
  isDebugEnabled(): boolean {
    return this.config.debug
  }

  // 重置为默认配置
  reset(): void {
    this.config = getTushareConfig()
    this.validateConfig()
  }
}

// 导出配置管理器实例
export const tushareConfigManager = new TushareConfigManager()

// 导出便捷函数
export const getTushareToken = () => tushareConfigManager.getToken()
export const getTushareProxyUrl = () => tushareConfigManager.getProxyUrl()
export const getTushareRateLimit = () => tushareConfigManager.getRateLimit()
export const getTushareDailyLimit = () => tushareConfigManager.getDailyLimit()
export const getTushareRetryCount = () => tushareConfigManager.getRetryCount()
export const getTushareTimeout = () => tushareConfigManager.getTimeout()
export const isTushareDebugEnabled = () => tushareConfigManager.isDebugEnabled()
export const isTushareConfigValid = () => tushareConfigManager.isValid()
export const getTushareConfigErrors = () => tushareConfigManager.getValidationErrors()
