/**
 * DeepSeek API HTTP 客户端
 * 处理与DeepSeek API的HTTP通信，包括重试、错误处理和响应解析
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import {
    getDeepSeekRequestConfig,
    getDeepSeekRetryCount,
    isDeepSeekDebugEnabled
} from '@/config/deepseekConfig'
import { deepSeekRateLimiter } from './deepseekRateLimiter'

// DeepSeek API 请求接口
export interface DeepSeekRequest {
    model: string
    messages: Array<{
        role: 'system' | 'user' | 'assistant'
        content: string
    }>
    max_tokens?: number
    temperature?: number
    top_p?: number
    stream?: boolean
}

// DeepSeek API 响应接口
export interface DeepSeekResponse {
    id: string
    object: string
    created: number
    model: string
    choices: Array<{
        index: number
        message: {
            role: string
            content: string
        }
        finish_reason: string
    }>
    usage: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
}

// 错误类型
export class DeepSeekApiError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public errorCode?: string,
        public details?: any
    ) {
        super(message)
        this.name = 'DeepSeekApiError'
    }
}

// HTTP客户端类
class DeepSeekHttpClient {
    private client: AxiosInstance
    private retryCount: number

    constructor() {
        const config = getDeepSeekRequestConfig()
        this.retryCount = getDeepSeekRetryCount()

        this.client = axios.create(config)
        this.setupInterceptors()
    }

    /**
     * 设置请求和响应拦截器
     */
    private setupInterceptors(): void {
        // 请求拦截器
        this.client.interceptors.request.use(
            (config) => {
                if (isDeepSeekDebugEnabled()) {
                    console.log('🚀 DeepSeek API 请求:', {
                        url: config.url,
                        method: config.method,
                        headers: { ...config.headers, Authorization: '[HIDDEN]' }
                    })
                }
                return config
            },
            (error) => {
                console.error('❌ DeepSeek API 请求拦截器错误:', error)
                return Promise.reject(error)
            }
        )

        // 响应拦截器
        this.client.interceptors.response.use(
            (response) => {
                if (isDeepSeekDebugEnabled()) {
                    console.log('✅ DeepSeek API 响应:', {
                        status: response.status,
                        data: response.data
                    })
                }
                return response
            },
            (error) => {
                if (isDeepSeekDebugEnabled()) {
                    console.error('❌ DeepSeek API 响应错误:', {
                        status: error.response?.status,
                        data: error.response?.data,
                        message: error.message
                    })
                }
                return Promise.reject(this.handleApiError(error))
            }
        )
    }

    /**
     * 发送聊天完成请求
     */
    async chatCompletion(request: DeepSeekRequest): Promise<DeepSeekResponse> {
        const startTime = Date.now()
        let lastError: Error | null = null

        // 检查速率限制
        if (!deepSeekRateLimiter.canMakeRequest()) {
            await deepSeekRateLimiter.waitForNextRequest()
        }

        for (let attempt = 0; attempt <= this.retryCount; attempt++) {
            try {
                const response = await this.client.post<DeepSeekResponse>('/chat/completions', request)
                const responseTime = Date.now() - startTime

                // 记录成功请求
                deepSeekRateLimiter.recordRequest(
                    '/chat/completions',
                    response.data.usage?.total_tokens || 0,
                    responseTime
                )

                return response.data
            } catch (error) {
                lastError = error as Error
                const responseTime = Date.now() - startTime

                // 记录错误请求
                deepSeekRateLimiter.recordError(
                    '/chat/completions',
                    lastError.message,
                    responseTime
                )

                // 如果是最后一次尝试，或者是不可重试的错误，直接抛出
                if (attempt === this.retryCount || !this.shouldRetry(error)) {
                    break
                }

                // 等待后重试
                const delay = this.calculateRetryDelay(attempt)
                if (isDeepSeekDebugEnabled()) {
                    console.log(`⏳ DeepSeek API 请求失败，${delay}ms 后重试 (${attempt + 1}/${this.retryCount})`)
                }
                await this.sleep(delay)
            }
        }

        throw lastError
    }

    /**
     * 发送流式聊天完成请求
     */
    async streamChatCompletion(
        request: DeepSeekRequest,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        const startTime = Date.now()

        // 检查速率限制
        if (!deepSeekRateLimiter.canMakeRequest()) {
            await deepSeekRateLimiter.waitForNextRequest()
        }

        try {
            const streamRequest = { ...request, stream: true }
            const response = await this.client.post('/chat/completions', streamRequest, {
                responseType: 'stream'
            })

            let totalTokens = 0

            response.data.on('data', (chunk: Buffer) => {
                const lines = chunk.toString().split('\n')

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim()

                        if (data === '[DONE]') {
                            const responseTime = Date.now() - startTime
                            deepSeekRateLimiter.recordRequest('/chat/completions', totalTokens, responseTime)
                            return
                        }

                        try {
                            const parsed = JSON.parse(data)
                            if (parsed.choices?.[0]?.delta?.content) {
                                onChunk(parsed.choices[0].delta.content)
                            }
                            if (parsed.usage?.total_tokens) {
                                totalTokens = parsed.usage.total_tokens
                            }
                        } catch (parseError) {
                            // 忽略解析错误，继续处理下一行
                        }
                    }
                }
            })

            response.data.on('error', (error: Error) => {
                const responseTime = Date.now() - startTime
                deepSeekRateLimiter.recordError('/chat/completions', error.message, responseTime)
                throw error
            })

        } catch (error) {
            const responseTime = Date.now() - startTime
            deepSeekRateLimiter.recordError('/chat/completions', (error as Error).message, responseTime)
            throw error
        }
    }

    /**
     * 获取模型列表
     */
    async getModels(): Promise<any> {
        const startTime = Date.now()

        try {
            const response = await this.client.get('/models')
            const responseTime = Date.now() - startTime

            deepSeekRateLimiter.recordRequest('/models', 0, responseTime)
            return response.data
        } catch (error) {
            const responseTime = Date.now() - startTime
            deepSeekRateLimiter.recordError('/models', (error as Error).message, responseTime)
            throw error
        }
    }

    /**
     * 处理API错误
     */
    private handleApiError(error: any): DeepSeekApiError {
        if (error.response) {
            const { status, data } = error.response
            const message = data?.error?.message || data?.message || `HTTP ${status} Error`
            const errorCode = data?.error?.code || data?.code

            return new DeepSeekApiError(message, status, errorCode, data)
        } else if (error.request) {
            return new DeepSeekApiError('网络请求失败，请检查网络连接', 0, 'NETWORK_ERROR')
        } else {
            return new DeepSeekApiError(error.message || '未知错误', 0, 'UNKNOWN_ERROR')
        }
    }

    /**
     * 判断是否应该重试
     */
    private shouldRetry(error: any): boolean {
        if (error.response) {
            const status = error.response.status
            // 重试 5xx 错误和 429 (Too Many Requests)
            return status >= 500 || status === 429
        }
        // 重试网络错误
        return !error.response
    }

    /**
     * 计算重试延迟（指数退避）
     */
    private calculateRetryDelay(attempt: number): number {
        const baseDelay = 1000 // 1秒
        const maxDelay = 30000 // 30秒
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)

        // 添加随机抖动，避免雷群效应
        const jitter = Math.random() * 0.1 * delay
        return Math.floor(delay + jitter)
    }

    /**
     * 睡眠函数
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    /**
     * 测试API连接
     */
    async testConnection(): Promise<{ success: boolean; message: string; latency?: number }> {
        const startTime = Date.now()

        try {
            await this.getModels()
            const latency = Date.now() - startTime

            return {
                success: true,
                message: 'DeepSeek API 连接正常',
                latency
            }
        } catch (error) {
            return {
                success: false,
                message: `DeepSeek API 连接失败: ${(error as Error).message}`
            }
        }
    }

    /**
     * 获取客户端统计信息
     */
    getStats() {
        return deepSeekRateLimiter.getStats()
    }

    /**
     * 获取成本统计
     */
    getCostStats(days: number = 7) {
        return deepSeekRateLimiter.getCostStats(days)
    }
}

// 导出单例实例
export const deepSeekHttpClient = new DeepSeekHttpClient()

// 导出类型
export { DeepSeekHttpClient }
export type { DeepSeekRequest, DeepSeekResponse }