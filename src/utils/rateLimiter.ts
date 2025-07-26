/**
 * Tushare API 速率限制和重试机制
 * 实现智能的请求频率控制和错误恢复
 */

// 速率限制器接口
export interface RateLimiter {
  canMakeRequest(apiName: string): boolean
  waitForNextRequest(apiName: string): Promise<void>
  recordRequest(apiName: string): void
  recordError(apiName: string, errorCode?: number): void
  getStats(apiName?: string): RateLimitStats
  reset(apiName?: string): void
}

// 速率限制统计
export interface RateLimitStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  lastRequestTime: number
  averageWaitTime: number
  errorCodes: Record<number, number>
}

// 重试配置
export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableErrors: number[]
}

// 默认重试配置
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 30000, // 30秒
  backoffMultiplier: 2,
  retryableErrors: [40203, 40101, 500, 502, 503, 504] // Tushare 频率限制和服务器错误
}

// Tushare 速率限制器实现
export class TushareRateLimiter implements RateLimiter {
  private requestTimes: Map<string, number[]> = new Map()
  private stats: Map<string, RateLimitStats> = new Map()
  private rateLimit: number // 每分钟请求限制
  private dailyLimit: number // 每日请求限制
  private dailyRequestCount: number = 0
  private lastResetDate: string = ''

  constructor(rateLimit: number = 200, dailyLimit: number = 500) {
    this.rateLimit = rateLimit
    this.dailyLimit = dailyLimit
    this.resetDailyCountIfNeeded()
  }

  // 检查是否可以发送请求
  canMakeRequest(apiName: string): boolean {
    this.resetDailyCountIfNeeded()
    
    // 检查每日限制
    if (this.dailyRequestCount >= this.dailyLimit) {
      return false
    }

    // 检查每分钟限制
    const now = Date.now()
    const requests = this.requestTimes.get(apiName) || []
    const oneMinuteAgo = now - 60 * 1000
    
    // 清理一分钟前的请求记录
    const recentRequests = requests.filter(time => time > oneMinuteAgo)
    this.requestTimes.set(apiName, recentRequests)
    
    return recentRequests.length < this.rateLimit
  }

  // 等待下次请求
  async waitForNextRequest(apiName: string): Promise<void> {
    if (this.canMakeRequest(apiName)) {
      return
    }

    const requests = this.requestTimes.get(apiName) || []
    if (requests.length === 0) {
      return
    }

    // 计算需要等待的时间
    const now = Date.now()
    const oldestRequest = Math.min(...requests)
    const waitTime = oldestRequest + 60 * 1000 - now

    if (waitTime > 0) {
      console.log(`[RateLimiter] API ${apiName} 达到频率限制，等待 ${waitTime}ms`)
      await this.sleep(waitTime)
    }
  }

  // 记录请求
  recordRequest(apiName: string): void {
    const now = Date.now()
    const requests = this.requestTimes.get(apiName) || []
    requests.push(now)
    this.requestTimes.set(apiName, requests)
    
    this.dailyRequestCount++
    
    // 更新统计
    const stats = this.getOrCreateStats(apiName)
    stats.totalRequests++
    stats.successfulRequests++
    stats.lastRequestTime = now
  }

  // 记录错误
  recordError(apiName: string, errorCode?: number): void {
    const stats = this.getOrCreateStats(apiName)
    stats.failedRequests++
    
    if (errorCode) {
      stats.errorCodes[errorCode] = (stats.errorCodes[errorCode] || 0) + 1
    }
  }

  // 获取统计信息
  getStats(apiName?: string): RateLimitStats {
    if (apiName) {
      return this.getOrCreateStats(apiName)
    }
    
    // 返回汇总统计
    const allStats: RateLimitStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastRequestTime: 0,
      averageWaitTime: 0,
      errorCodes: {}
    }
    
    for (const stats of this.stats.values()) {
      allStats.totalRequests += stats.totalRequests
      allStats.successfulRequests += stats.successfulRequests
      allStats.failedRequests += stats.failedRequests
      allStats.lastRequestTime = Math.max(allStats.lastRequestTime, stats.lastRequestTime)
      
      for (const [code, count] of Object.entries(stats.errorCodes)) {
        allStats.errorCodes[Number(code)] = (allStats.errorCodes[Number(code)] || 0) + count
      }
    }
    
    return allStats
  }

  // 重置统计
  reset(apiName?: string): void {
    if (apiName) {
      this.requestTimes.delete(apiName)
      this.stats.delete(apiName)
    } else {
      this.requestTimes.clear()
      this.stats.clear()
      this.dailyRequestCount = 0
    }
  }

  // 获取或创建统计对象
  private getOrCreateStats(apiName: string): RateLimitStats {
    if (!this.stats.has(apiName)) {
      this.stats.set(apiName, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        lastRequestTime: 0,
        averageWaitTime: 0,
        errorCodes: {}
      })
    }
    return this.stats.get(apiName)!
  }

  // 重置每日计数
  private resetDailyCountIfNeeded(): void {
    const today = new Date().toDateString()
    if (this.lastResetDate !== today) {
      this.dailyRequestCount = 0
      this.lastResetDate = today
    }
  }

  // 睡眠函数
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 获取每日剩余请求数
  getDailyRemainingRequests(): number {
    this.resetDailyCountIfNeeded()
    return Math.max(0, this.dailyLimit - this.dailyRequestCount)
  }

  // 获取当前每分钟剩余请求数
  getMinuteRemainingRequests(apiName: string): number {
    const requests = this.requestTimes.get(apiName) || []
    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000
    const recentRequests = requests.filter(time => time > oneMinuteAgo)
    return Math.max(0, this.rateLimit - recentRequests.length)
  }
}

// 重试机制实现
export class RetryManager {
  private config: RetryConfig

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config }
  }

  // 执行带重试的操作
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string = 'operation'
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error: any) {
        lastError = error
        
        // 检查是否应该重试
        if (attempt === this.config.maxRetries || !this.shouldRetry(error)) {
          break
        }
        
        // 计算等待时间
        const delay = this.calculateDelay(attempt)
        console.log(`[RetryManager] ${context} 失败，${delay}ms 后重试 (${attempt + 1}/${this.config.maxRetries})`)
        console.log(`[RetryManager] 错误信息:`, error.message)
        
        await this.sleep(delay)
      }
    }
    
    throw lastError
  }

  // 判断是否应该重试
  private shouldRetry(error: any): boolean {
    // 检查错误代码
    if (error.code && this.config.retryableErrors.includes(error.code)) {
      return true
    }
    
    // 检查错误消息
    const message = error.message?.toLowerCase() || ''
    const retryableMessages = [
      'timeout',
      'network error',
      'econnaborted',
      'econnreset',
      '频率限制',
      '每分钟最多访问',
      '每小时最多访问',
      '每天最多访问'
    ]
    
    return retryableMessages.some(msg => message.includes(msg))
  }

  // 计算延迟时间（指数退避）
  private calculateDelay(attempt: number): number {
    const delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt)
    return Math.min(delay, this.config.maxDelay)
  }

  // 睡眠函数
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 更新配置
  updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // 获取配置
  getConfig(): RetryConfig {
    return { ...this.config }
  }
}

// 导出单例实例
export const tushareRateLimiter = new TushareRateLimiter()
export const retryManager = new RetryManager()
