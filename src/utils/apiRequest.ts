/**
 * 通用API请求工具
 * 提供统一的HTTP请求、重试、缓存和错误处理机制
 */

import axios from 'axios'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import type { ApiConfig } from '@/config/apiConfig'

/**
 * API请求选项
 */
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  params?: Record<string, any>
  data?: any
  headers?: Record<string, string>
  timeout?: number
  retryCount?: number
  enableCache?: boolean
  cacheDuration?: number
}

/**
 * API响应结果
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  source?: string
  timestamp?: number
  fromCache?: boolean
}

/**
 * 缓存管理器
 */
class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number; duration: number }>()

  set(key: string, data: any, duration: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      duration,
    })
  }

  get(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const now = Date.now()
    if (now - cached.timestamp > cached.duration) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  clear(): void {
    this.cache.clear()
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  size(): number {
    return this.cache.size
  }
}

// 全局缓存实例
const cacheManager = new CacheManager()

/**
 * 生成缓存键
 */
function generateCacheKey(url: string, options: ApiRequestOptions): string {
  const params = options.params ? JSON.stringify(options.params) : ''
  const data = options.data ? JSON.stringify(options.data) : ''
  return `${options.method || 'GET'}:${url}:${params}:${data}`
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 通用API请求函数
 */
export async function apiRequest<T = any>(
  url: string,
  config: ApiConfig,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    params,
    data,
    headers = {},
    timeout = config.timeout,
    retryCount = config.retryCount,
    enableCache = true,
    cacheDuration = 300000, // 5分钟
  } = options

  // 生成缓存键
  const cacheKey = generateCacheKey(url, options)

  // 检查缓存（仅对GET请求）
  if (method === 'GET' && enableCache) {
    const cachedData = cacheManager.get(cacheKey)
    if (cachedData) {
      console.log(`📦 使用缓存数据: ${url}`)
      return {
        success: true,
        data: cachedData,
        message: '数据来自缓存',
        timestamp: Date.now(),
        fromCache: true,
      }
    }
  }

  // 构建请求配置
  const requestConfig: AxiosRequestConfig = {
    method,
    url,
    params,
    data,
    timeout,
    headers: {
      ...config.headers,
      ...headers,
    },
  }

  // 重试逻辑
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      console.log(`🌐 API请求 (尝试 ${attempt + 1}/${retryCount + 1}): ${method} ${url}`)

      const response: AxiosResponse<T> = await axios(requestConfig)

      // 请求成功
      const result: ApiResponse<T> = {
        success: true,
        data: response.data,
        message: '请求成功',
        timestamp: Date.now(),
        fromCache: false,
      }

      // 缓存成功的GET请求结果
      if (method === 'GET' && enableCache && response.data) {
        cacheManager.set(cacheKey, response.data, cacheDuration)
      }

      console.log(`✅ API请求成功: ${method} ${url}`)
      return result
    } catch (error: any) {
      lastError = error
      console.warn(`❌ API请求失败 (尝试 ${attempt + 1}/${retryCount + 1}): ${error.message}`)

      // 如果是最后一次尝试，不再重试
      if (attempt === retryCount) {
        break
      }

      // 根据错误类型决定是否重试
      if (error.response) {
        // HTTP错误响应
        const status = error.response.status

        // 4xx错误通常不需要重试（除了429 Too Many Requests）
        if (status >= 400 && status < 500 && status !== 429) {
          console.log(`🚫 HTTP ${status} 错误，跳过重试`)
          break
        }
      }

      // 等待后重试（指数退避）
      const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000)
      console.log(`⏳ ${delayMs}ms 后重试...`)
      await delay(delayMs)
    }
  }

  // 所有重试都失败了
  const errorMessage = lastError?.response?.data?.message || lastError?.message || '未知错误'

  console.error(`💥 API请求最终失败: ${method} ${url} - ${errorMessage}`)

  return {
    success: false,
    error: errorMessage,
    message: `请求失败: ${errorMessage}`,
    timestamp: Date.now(),
    fromCache: false,
  }
}

/**
 * GET请求快捷方法
 */
export async function apiGet<T = any>(
  url: string,
  config: ApiConfig,
  params?: Record<string, any>,
  options?: Omit<ApiRequestOptions, 'method' | 'params'>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, config, {
    ...options,
    method: 'GET',
    params,
  })
}

/**
 * POST请求快捷方法
 */
export async function apiPost<T = any>(
  url: string,
  config: ApiConfig,
  data?: any,
  options?: Omit<ApiRequestOptions, 'method' | 'data'>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, config, {
    ...options,
    method: 'POST',
    data,
    enableCache: false, // POST请求默认不缓存
  })
}

/**
 * 清除所有缓存
 */
export function clearApiCache(): void {
  cacheManager.clear()
  console.log('🗑️ 已清除所有API缓存')
}

/**
 * 清除特定URL的缓存
 */
export function clearUrlCache(url: string, method: string = 'GET'): void {
  // 由于缓存键包含参数，这里只能清除完全匹配的缓存
  // 实际使用中可能需要更复杂的缓存键匹配逻辑
  const keys = Array.from((cacheManager as any).cache.keys())
  const keysToDelete = keys.filter((key) => key.includes(`${method}:${url}`))

  keysToDelete.forEach((key) => cacheManager.delete(key))
  console.log(`🗑️ 已清除 ${url} 的缓存 (${keysToDelete.length} 条)`)
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): {
  size: number
  keys: string[]
} {
  return {
    size: cacheManager.size(),
    keys: Array.from((cacheManager as any).cache.keys()),
  }
}

/**
 * 创建带有基础配置的API客户端
 */
export function createApiClient(config: ApiConfig) {
  return {
    get: <T = any>(
      url: string,
      params?: Record<string, any>,
      options?: Omit<ApiRequestOptions, 'method' | 'params'>
    ) => apiGet<T>(url, config, params, options),

    post: <T = any>(
      url: string,
      data?: any,
      options?: Omit<ApiRequestOptions, 'method' | 'data'>
    ) => apiPost<T>(url, config, data, options),

    request: <T = any>(url: string, options?: ApiRequestOptions) =>
      apiRequest<T>(url, config, options),
  }
}

/**
 * 错误处理工具
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any,
    public source?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * 将API响应转换为错误（如果失败）
 */
export function throwIfFailed<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new ApiError(
      response.error || response.message || '请求失败',
      undefined,
      response,
      response.source
    )
  }
  return response.data!
}

export default {
  request: apiRequest,
  get: apiGet,
  post: apiPost,
  clearCache: clearApiCache,
  clearUrlCache,
  getCacheStats,
  createClient: createApiClient,
  ApiError,
  throwIfFailed,
}
