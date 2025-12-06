/**
 * DeepSeek API 速率限制器
 * 管理API调用频率、统计使用情况和成本监控
 */

import { getDeepSeekRateLimit, getDeepSeekDailyLimit, isDeepSeekDebugEnabled } from '@/config/deepseekConfig'

// API使用记录接口
export interface ApiUsageRecord {
    timestamp: number
    endpoint: string
    tokensUsed: number
    responseTime: number
    success: boolean
    error?: string
    cost?: number
}

// 速率限制统计接口
export interface RateLimitStats {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    totalTokensUsed: number
    totalCost: number
    averageResponseTime: number
    requestsInLastMinute: number
    requestsToday: number
    remainingDailyRequests: number
    remainingMinuteRequests: number
}

// 成本计算配置
const COST_CONFIG = {
    // DeepSeek API 定价 (每1000 tokens的价格，单位：美分)
    inputTokenCost: 0.14,   // $0.0014 per 1K tokens
    outputTokenCost: 0.28,  // $0.0028 per 1K tokens
    // 汇率 (USD to CNY)
    exchangeRate: 7.2
}

class DeepSeekRateLimiter {
    private usageRecords: ApiUsageRecord[] = []
    private requestTimes: number[] = []
    private dailyRequestCount: number = 0
    private lastResetDate: string = ''

    constructor() {
        this.loadFromStorage()
        this.resetDailyCountIfNeeded()
    }

    /**
     * 检查是否可以发送请求
     */
    canMakeRequest(): boolean {
        const now = Date.now()
        const oneMinuteAgo = now - 60 * 1000

        // 清理过期的请求时间记录
        this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo)

        // 检查每分钟限制
        const minuteLimit = getDeepSeekRateLimit()
        if (this.requestTimes.length >= minuteLimit) {
            if (isDeepSeekDebugEnabled()) {
                console.warn(`⚠️ DeepSeek API 每分钟请求限制已达到: ${this.requestTimes.length}/${minuteLimit}`)
            }
            return false
        }

        // 检查每日限制
        const dailyLimit = getDeepSeekDailyLimit()
        if (this.dailyRequestCount >= dailyLimit) {
            if (isDeepSeekDebugEnabled()) {
                console.warn(`⚠️ DeepSeek API 每日请求限制已达到: ${this.dailyRequestCount}/${dailyLimit}`)
            }
            return false
        }

        return true
    }

    /**
     * 等待直到可以发送下一个请求
     */
    async waitForNextRequest(): Promise<void> {
        if (this.canMakeRequest()) {
            return
        }

        const now = Date.now()
        const oneMinuteAgo = now - 60 * 1000
        const oldestRequestTime = Math.min(...this.requestTimes.filter(time => time > oneMinuteAgo))
        const waitTime = Math.max(0, oldestRequestTime + 60 * 1000 - now)

        if (waitTime > 0) {
            if (isDeepSeekDebugEnabled()) {
                console.log(`⏳ 等待 ${Math.ceil(waitTime / 1000)} 秒后重试 DeepSeek API 请求`)
            }
            await new Promise(resolve => setTimeout(resolve, waitTime))
        }
    }

    /**
     * 记录API请求
     */
    recordRequest(endpoint: string, tokensUsed: number = 0, responseTime: number = 0): void {
        const now = Date.now()
        this.requestTimes.push(now)
        this.dailyRequestCount++

        // 计算成本
        const cost = this.calculateCost(tokensUsed)

        const record: ApiUsageRecord = {
            timestamp: now,
            endpoint,
            tokensUsed,
            responseTime,
            success: true,
            cost
        }

        this.usageRecords.push(record)
        this.saveToStorage()

        if (isDeepSeekDebugEnabled()) {
            console.log(`📊 DeepSeek API 请求记录: ${endpoint}, Tokens: ${tokensUsed}, 成本: ¥${(cost * COST_CONFIG.exchangeRate / 100).toFixed(4)}`)
        }
    }

    /**
     * 记录API错误
     */
    recordError(endpoint: string, error: string, responseTime: number = 0): void {
        const now = Date.now()
        this.requestTimes.push(now)
        this.dailyRequestCount++

        const record: ApiUsageRecord = {
            timestamp: now,
            endpoint,
            tokensUsed: 0,
            responseTime,
            success: false,
            error,
            cost: 0
        }

        this.usageRecords.push(record)
        this.saveToStorage()

        if (isDeepSeekDebugEnabled()) {
            console.error(`❌ DeepSeek API 请求失败: ${endpoint}, 错误: ${error}`)
        }
    }

    /**
     * 获取统计信息
     */
    getStats(): RateLimitStats {
        const now = Date.now()
        const oneMinuteAgo = now - 60 * 1000
        const oneDayAgo = now - 24 * 60 * 60 * 1000

        const recentRecords = this.usageRecords.filter(record => record.timestamp > oneDayAgo)
        const minuteRecords = this.usageRecords.filter(record => record.timestamp > oneMinuteAgo)

        const totalRequests = recentRecords.length
        const successfulRequests = recentRecords.filter(record => record.success).length
        const failedRequests = totalRequests - successfulRequests
        const totalTokensUsed = recentRecords.reduce((sum, record) => sum + record.tokensUsed, 0)
        const totalCost = recentRecords.reduce((sum, record) => sum + (record.cost || 0), 0)
        const averageResponseTime = totalRequests > 0
            ? recentRecords.reduce((sum, record) => sum + record.responseTime, 0) / totalRequests
            : 0

        return {
            totalRequests,
            successfulRequests,
            failedRequests,
            totalTokensUsed,
            totalCost,
            averageResponseTime,
            requestsInLastMinute: minuteRecords.length,
            requestsToday: this.dailyRequestCount,
            remainingDailyRequests: Math.max(0, getDeepSeekDailyLimit() - this.dailyRequestCount),
            remainingMinuteRequests: Math.max(0, getDeepSeekRateLimit() - minuteRecords.length)
        }
    }

    /**
     * 获取成本统计
     */
    getCostStats(days: number = 7): {
        totalCostUSD: number
        totalCostCNY: number
        dailyAverage: number
        tokenUsage: number
        requestCount: number
    } {
        const now = Date.now()
        const periodStart = now - days * 24 * 60 * 60 * 1000

        const periodRecords = this.usageRecords.filter(
            record => record.timestamp > periodStart && record.success
        )

        const totalCostUSD = periodRecords.reduce((sum, record) => sum + (record.cost || 0), 0) / 100
        const totalCostCNY = totalCostUSD * COST_CONFIG.exchangeRate
        const dailyAverage = totalCostCNY / days
        const tokenUsage = periodRecords.reduce((sum, record) => sum + record.tokensUsed, 0)
        const requestCount = periodRecords.length

        return {
            totalCostUSD,
            totalCostCNY,
            dailyAverage,
            tokenUsage,
            requestCount
        }
    }

    /**
     * 重置统计信息
     */
    reset(): void {
        this.usageRecords = []
        this.requestTimes = []
        this.dailyRequestCount = 0
        this.lastResetDate = new Date().toDateString()
        this.saveToStorage()

        if (isDeepSeekDebugEnabled()) {
            console.log('🔄 DeepSeek API 统计信息已重置')
        }
    }

    /**
     * 计算API调用成本
     */
    private calculateCost(tokensUsed: number): number {
        // 假设输入和输出token各占一半
        const inputTokens = Math.ceil(tokensUsed * 0.6)
        const outputTokens = Math.floor(tokensUsed * 0.4)

        const inputCost = (inputTokens / 1000) * COST_CONFIG.inputTokenCost
        const outputCost = (outputTokens / 1000) * COST_CONFIG.outputTokenCost

        return inputCost + outputCost // 返回美分
    }

    /**
     * 检查是否需要重置每日计数
     */
    private resetDailyCountIfNeeded(): void {
        const today = new Date().toDateString()
        if (this.lastResetDate !== today) {
            this.dailyRequestCount = 0
            this.lastResetDate = today
            this.saveToStorage()

            if (isDeepSeekDebugEnabled()) {
                console.log('🌅 DeepSeek API 每日计数已重置')
            }
        }
    }

    /**
     * 从本地存储加载数据
     */
    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem('deepseek_rate_limiter')
            if (stored) {
                const data = JSON.parse(stored)
                this.usageRecords = data.usageRecords || []
                this.requestTimes = data.requestTimes || []
                this.dailyRequestCount = data.dailyRequestCount || 0
                this.lastResetDate = data.lastResetDate || ''

                // 清理过期数据
                const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
                this.usageRecords = this.usageRecords.filter(record => record.timestamp > oneDayAgo)
                this.requestTimes = this.requestTimes.filter(time => time > oneDayAgo)
            }
        } catch (error) {
            console.error('加载 DeepSeek 速率限制数据失败:', error)
        }
    }

    /**
     * 保存数据到本地存储
     */
    private saveToStorage(): void {
        try {
            const data = {
                usageRecords: this.usageRecords,
                requestTimes: this.requestTimes,
                dailyRequestCount: this.dailyRequestCount,
                lastResetDate: this.lastResetDate
            }
            localStorage.setItem('deepseek_rate_limiter', JSON.stringify(data))
        } catch (error) {
            console.error('保存 DeepSeek 速率限制数据失败:', error)
        }
    }

    /**
     * 清理过期数据
     */
    private cleanupOldData(): void {
        const now = Date.now()
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

        // 只保留最近7天的数据
        this.usageRecords = this.usageRecords.filter(record => record.timestamp > sevenDaysAgo)
        this.saveToStorage()
    }
}

// 导出单例实例
export const deepSeekRateLimiter = new DeepSeekRateLimiter()

// 定期清理过期数据
setInterval(() => {
    deepSeekRateLimiter['cleanupOldData']()
}, 60 * 60 * 1000) // 每小时清理一次