/**
 * DeepSeek API 配置管理
 * 负责管理 DeepSeek API 的配置、认证和限制
 */

// DeepSeek API 配置接口
export interface DeepSeekConfig {
    apiKey: string
    baseUrl: string
    model: string
    maxTokens: number
    temperature: number
    topP: number
    rateLimit: number
    dailyLimit: number
    retryCount: number
    timeout: number
    debug: boolean
    enableCache: boolean
    cacheTimeout: number
}

// 默认配置
const DEFAULT_CONFIG: DeepSeekConfig = {
    apiKey: '',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    maxTokens: 4000,
    temperature: 0.7,
    topP: 0.9,
    rateLimit: 60, // 每分钟请求限制
    dailyLimit: 1000, // 每日请求限制
    retryCount: 3,
    timeout: 30000,
    debug: true,
    enableCache: true,
    cacheTimeout: 300000 // 5分钟缓存
}

// 从环境变量获取配置
function getConfigFromEnv(): Partial<DeepSeekConfig> {
    return {
        apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
        baseUrl: import.meta.env.VITE_DEEPSEEK_BASE_URL,
        model: import.meta.env.VITE_DEEPSEEK_MODEL,
        maxTokens: Number(import.meta.env.VITE_DEEPSEEK_MAX_TOKENS) || undefined,
        temperature: Number(import.meta.env.VITE_DEEPSEEK_TEMPERATURE) || undefined,
        topP: Number(import.meta.env.VITE_DEEPSEEK_TOP_P) || undefined,
        rateLimit: Number(import.meta.env.VITE_DEEPSEEK_RATE_LIMIT) || undefined,
        dailyLimit: Number(import.meta.env.VITE_DEEPSEEK_DAILY_LIMIT) || undefined,
        retryCount: Number(import.meta.env.VITE_DEEPSEEK_RETRY_COUNT) || undefined,
        timeout: Number(import.meta.env.VITE_DEEPSEEK_TIMEOUT) || undefined,
        debug: import.meta.env.VITE_DEEPSEEK_DEBUG === 'true',
        enableCache: import.meta.env.VITE_DEEPSEEK_ENABLE_CACHE !== 'false',
        cacheTimeout: Number(import.meta.env.VITE_DEEPSEEK_CACHE_TIMEOUT) || undefined
    }
}

// 合并配置
function mergeConfig(): DeepSeekConfig {
    const envConfig = getConfigFromEnv()
    return {
        ...DEFAULT_CONFIG,
        ...Object.fromEntries(
            Object.entries(envConfig).filter(([_, value]) => value !== undefined && value !== null && value !== '')
        )
    }
}

// 获取当前配置
export function getDeepSeekConfig(): DeepSeekConfig {
    return mergeConfig()
}

// 验证配置
export function validateDeepSeekConfig(config: DeepSeekConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // 验证 API Key
    if (!config.apiKey || config.apiKey.trim() === '') {
        errors.push('DeepSeek API Key 未配置')
    } else if (!config.apiKey.startsWith('sk-')) {
        errors.push('DeepSeek API Key 格式不正确，应以 "sk-" 开头')
    }

    // 验证 URL
    if (!config.baseUrl || !isValidUrl(config.baseUrl)) {
        errors.push('DeepSeek Base URL 配置无效')
    }

    // 验证模型名称
    if (!config.model || config.model.trim() === '') {
        errors.push('DeepSeek 模型名称未配置')
    }

    // 验证数值配置
    if (config.maxTokens <= 0 || config.maxTokens > 32000) {
        errors.push('最大Token数量必须在1-32000之间')
    }

    if (config.temperature < 0 || config.temperature > 2) {
        errors.push('Temperature必须在0-2之间')
    }

    if (config.topP < 0 || config.topP > 1) {
        errors.push('Top P必须在0-1之间')
    }

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

    if (config.cacheTimeout <= 0) {
        errors.push('缓存超时时间必须大于0')
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

// API Key 验证
export async function validateDeepSeekApiKey(apiKey: string): Promise<{ valid: boolean; message: string }> {
    if (!apiKey || apiKey.trim() === '') {
        return { valid: false, message: 'API Key 不能为空' }
    }

    if (!apiKey.startsWith('sk-')) {
        return { valid: false, message: 'API Key 格式不正确，应以 "sk-" 开头' }
    }

    // 这里可以添加实际的 API Key 验证逻辑
    // 例如调用 DeepSeek API 的测试接口
    try {
        // 暂时返回基本验证结果
        return { valid: true, message: 'API Key 格式验证通过' }
    } catch (error) {
        return { valid: false, message: `API Key 验证失败: ${error}` }
    }
}

// 配置状态管理
class DeepSeekConfigManager {
    private config: DeepSeekConfig
    private validated: boolean = false
    private validationErrors: string[] = []

    constructor() {
        this.config = getDeepSeekConfig()
        this.validateConfig()
    }

    // 获取配置
    getConfig(): DeepSeekConfig {
        return { ...this.config }
    }

    // 更新配置
    updateConfig(newConfig: Partial<DeepSeekConfig>): void {
        this.config = { ...this.config, ...newConfig }
        this.validateConfig()
    }

    // 验证配置
    private validateConfig(): void {
        const validation = validateDeepSeekConfig(this.config)
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

    // 获取 API Key
    getApiKey(): string {
        return this.config.apiKey
    }

    // 获取 Base URL
    getBaseUrl(): string {
        return this.config.baseUrl
    }

    // 获取模型名称
    getModel(): string {
        return this.config.model
    }

    // 获取最大Token数量
    getMaxTokens(): number {
        return this.config.maxTokens
    }

    // 获取Temperature
    getTemperature(): number {
        return this.config.temperature
    }

    // 获取Top P
    getTopP(): number {
        return this.config.topP
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

    // 是否启用缓存
    isCacheEnabled(): boolean {
        return this.config.enableCache
    }

    // 获取缓存超时时间
    getCacheTimeout(): number {
        return this.config.cacheTimeout
    }

    // 重置为默认配置
    reset(): void {
        this.config = getDeepSeekConfig()
        this.validateConfig()
    }

    // 获取请求头
    getHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'User-Agent': 'HappyStockMarket-AI/1.0'
        }
    }

    // 获取请求配置
    getRequestConfig(): {
        baseURL: string
        timeout: number
        headers: Record<string, string>
    } {
        return {
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout,
            headers: this.getHeaders()
        }
    }
}

// 导出配置管理器实例
export const deepSeekConfigManager = new DeepSeekConfigManager()

// 导出便捷函数
export const getDeepSeekApiKey = () => deepSeekConfigManager.getApiKey()
export const getDeepSeekBaseUrl = () => deepSeekConfigManager.getBaseUrl()
export const getDeepSeekModel = () => deepSeekConfigManager.getModel()
export const getDeepSeekMaxTokens = () => deepSeekConfigManager.getMaxTokens()
export const getDeepSeekTemperature = () => deepSeekConfigManager.getTemperature()
export const getDeepSeekTopP = () => deepSeekConfigManager.getTopP()
export const getDeepSeekRateLimit = () => deepSeekConfigManager.getRateLimit()
export const getDeepSeekDailyLimit = () => deepSeekConfigManager.getDailyLimit()
export const getDeepSeekRetryCount = () => deepSeekConfigManager.getRetryCount()
export const getDeepSeekTimeout = () => deepSeekConfigManager.getTimeout()
export const isDeepSeekDebugEnabled = () => deepSeekConfigManager.isDebugEnabled()
export const isDeepSeekCacheEnabled = () => deepSeekConfigManager.isCacheEnabled()
export const getDeepSeekCacheTimeout = () => deepSeekConfigManager.getCacheTimeout()
export const isDeepSeekConfigValid = () => deepSeekConfigManager.isValid()
export const getDeepSeekConfigErrors = () => deepSeekConfigManager.getValidationErrors()
export const getDeepSeekHeaders = () => deepSeekConfigManager.getHeaders()
export const getDeepSeekRequestConfig = () => deepSeekConfigManager.getRequestConfig()

// 初始化配置（使用提供的API Key）
export function initializeDeepSeekConfig(): void {
    const providedApiKey = 'sk-2cc72ce7b3ee4c17ba490fab258b9efb'

    if (providedApiKey && !deepSeekConfigManager.getApiKey()) {
        deepSeekConfigManager.updateConfig({ apiKey: providedApiKey })
        console.log('✅ DeepSeek API Key 已初始化')
    }
}

// 自动初始化
initializeDeepSeekConfig()