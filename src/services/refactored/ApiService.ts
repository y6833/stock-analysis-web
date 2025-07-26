/**
 * 重构后的API服务
 * 使用新的基础服务类和统一的错误处理模式
 */

import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { BaseService, type ServiceConfig, type ApiResponse } from '@/core/BaseService'
import { CONSTANTS } from '@/constants'
import { Utils } from '@/utils'
import {
  saveOfflineData,
  getOfflineData,
  isOnline,
  savePendingWatchlistChange,
  savePendingPortfolioChange
} from '../offlineDataService'
import { getNetworkAwareTimeout } from '../networkStatusService'
import errorHandlingService, { ErrorType, ErrorSeverity } from '../errorHandlingService'
import loadingService from '../loadingService'

/**
 * API服务配置接口
 */
interface ApiServiceConfig extends ServiceConfig {
  baseURL?: string
  enableOfflineSupport?: boolean
  enableCaching?: boolean
  enableRetry?: boolean
}

/**
 * 请求选项接口
 */
interface RequestOptions {
  showLoading?: boolean
  loadingText?: string
  enableCache?: boolean
  cacheKey?: string
  cacheTTL?: number
  enableOffline?: boolean
  retryCount?: number
}

/**
 * 重构后的API服务类
 */
class ApiService extends BaseService {
  private axiosInstance: AxiosInstance
  private defaultConfig: ApiServiceConfig

  constructor(config: ApiServiceConfig = {}) {
    super('ApiService', config)

    this.defaultConfig = {
      baseURL: CONSTANTS.API.BASE_URL,
      timeout: CONSTANTS.API.TIMEOUT,
      enableOfflineSupport: true,
      enableCaching: true,
      enableRetry: true,
      ...config
    }

    this.axiosInstance = this.createAxiosInstance()
    this.setupInterceptors()
  }

  /**
   * 创建Axios实例
   */
  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.defaultConfig.baseURL,
      timeout: this.defaultConfig.timeout,
      headers: {
        [CONSTANTS.API.HEADERS.CONTENT_TYPE]: 'application/json'
      }
    })
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // 根据网络状态调整超时时间
        config.timeout = getNetworkAwareTimeout()

        // 添加认证令牌
        const token = Utils.Storage.local.get<string>(CONSTANTS.STORAGE.KEYS.AUTH_TOKEN)
        if (token) {
          config.headers[CONSTANTS.API.HEADERS.AUTHORIZATION] = `Bearer ${token}`
        }

        // 添加CSRF令牌到非GET请求
        if (config.method?.toLowerCase() !== 'get') {
          const csrfToken = Utils.Storage.local.get<string>('csrf_token')
          if (csrfToken) {
            config.headers[CONSTANTS.API.HEADERS.X_CSRF_TOKEN] = csrfToken
          }
        }

        return config
      },
      (error) => Promise.reject(error)
    )

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config

        // 处理网络错误和超时
        if (this.isNetworkError(error) && originalRequest?.method?.toLowerCase() === 'get') {
          const cachedData = await this.getCachedResponse(originalRequest)
          if (cachedData) {
            return this.createCacheResponse(cachedData, originalRequest)
          }
        }

        // 处理认证错误
        if (error.response?.status === CONSTANTS.API.STATUS_CODES.UNAUTHORIZED) {
          this.handleAuthError()
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * 判断是否为网络错误
   */
  private isNetworkError(error: AxiosError): boolean {
    return error.message === 'Network Error' ||
      error.code === 'ECONNABORTED' ||
      error.message.includes('timeout')
  }

  /**
   * 获取缓存响应
   */
  private async getCachedResponse(config: AxiosRequestConfig): Promise<any> {
    if (!this.defaultConfig.enableCaching) return null

    const cacheKey = this.generateCacheKey(config)
    try {
      return await getOfflineData(cacheKey)
    } catch (error) {
      console.warn('获取缓存数据失败:', error)
      return null
    }
  }

  /**
   * 创建缓存响应对象
   */
  private createCacheResponse(data: any, config: AxiosRequestConfig): AxiosResponse {
    return {
      data,
      status: CONSTANTS.API.STATUS_CODES.OK,
      statusText: 'OK (from cache)',
      headers: {},
      config,
      fromCache: true
    } as AxiosResponse
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(config: AxiosRequestConfig): string {
    const url = config.url || ''
    const params = config.params ? Utils.Url.buildQuery(config.params) : ''
    return `${CONSTANTS.CACHE.PREFIXES.API}${url}${params ? `?${params}` : ''}`
  }

  /**
   * 处理认证错误
   */
  private handleAuthError(): void {
    // 清除认证信息
    Utils.Storage.local.remove(CONSTANTS.STORAGE.KEYS.AUTH_TOKEN)
    Utils.Storage.local.remove(CONSTANTS.STORAGE.KEYS.REFRESH_TOKEN)
    Utils.Storage.local.remove(CONSTANTS.STORAGE.KEYS.USER_INFO)

    // 重定向到登录页面
    if (typeof window !== 'undefined') {
      window.location.href = CONSTANTS.ROUTE.PATHS.LOGIN
    }
  }

  /**
   * 缓存响应数据
   */
  private async cacheResponse(config: AxiosRequestConfig, data: any, ttl?: number): Promise<void> {
    if (!this.defaultConfig.enableCaching) return

    const cacheKey = this.generateCacheKey(config)
    try {
      await saveOfflineData(cacheKey, data, ttl)
    } catch (error) {
      console.warn('缓存响应数据失败:', error)
    }
  }

  /**
   * 处理离线请求
   */
  private async handleOfflineRequest(
    method: string,
    url: string,
    data?: any
  ): Promise<ApiResponse<any>> {
    if (!this.defaultConfig.enableOfflineSupport) {
      throw errorHandlingService.createAppError(
        ErrorType.OFFLINE,
        '您当前处于离线状态，无法发送请求',
        ErrorSeverity.WARNING
      )
    }

    // 处理特定的离线操作
    const token = Utils.Storage.local.get<string>(CONSTANTS.STORAGE.KEYS.AUTH_TOKEN) || ''

    if (url.includes('/watchlist')) {
      await savePendingWatchlistChange(method, data, token)
      return { success: true, data: { pendingSync: true }, message: '已保存到离线队列' }
    }

    if (url.includes('/portfolio')) {
      await savePendingPortfolioChange(method, data, token)
      return { success: true, data: { pendingSync: true }, message: '已保存到离线队列' }
    }

    throw errorHandlingService.createAppError(
      ErrorType.OFFLINE,
      '离线状态下无法执行此操作',
      ErrorSeverity.WARNING
    )
  }

  /**
   * 统一的请求方法
   */
  private async request<T>(
    method: string,
    url: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      showLoading = false,
      loadingText = '请求中...',
      enableCache = this.defaultConfig.enableCaching,
      cacheKey,
      cacheTTL = CONSTANTS.CACHE.TTL.MEDIUM,
      enableOffline = this.defaultConfig.enableOfflineSupport,
      retryCount = this.config.retryCount
    } = options

    // 显示加载状态
    if (showLoading) {
      loadingService.showGlobalLoading(loadingText)
    }

    try {
      // 检查离线状态
      if (!isOnline() && enableOffline) {
        if (method.toLowerCase() === 'get') {
          // GET请求尝试从缓存获取
          const cachedData = await this.getCachedResponse({ url, params: data })
          if (cachedData) {
            return cachedData
          }
        } else {
          // 非GET请求处理离线操作
          return await this.handleOfflineRequest(method, url, data) as T
        }
      }

      // 发送请求
      const requestConfig: AxiosRequestConfig = {
        method,
        url,
        ...(method.toLowerCase() === 'get' ? { params: data } : { data })
      }

      const response = await (retryCount && retryCount > 1
        ? this.withRetry(() => this.axiosInstance.request<T>(requestConfig), retryCount)
        : this.axiosInstance.request<T>(requestConfig)
      )

      // 缓存GET请求的响应
      if (method.toLowerCase() === 'get' && enableCache) {
        await this.cacheResponse(requestConfig, response.data, cacheTTL)
      }

      return response.data
    } catch (error) {
      // 如果是网络错误，尝试从缓存获取数据
      if (this.isNetworkError(error as AxiosError) && method.toLowerCase() === 'get') {
        const cachedData = await this.getCachedResponse({ url, params: data })
        if (cachedData) {
          return cachedData
        }
      }

      throw error
    } finally {
      if (showLoading) {
        loadingService.hideGlobalLoading()
      }
    }
  }

  /**
   * GET请求
   */
  async get<T>(url: string, params?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('GET', url, params, options)
  }

  /**
   * POST请求
   */
  async post<T>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('POST', url, data, {
      ...options,
      loadingText: options.loadingText || '提交中...'
    })
  }

  /**
   * PUT请求
   */
  async put<T>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PUT', url, data, {
      ...options,
      loadingText: options.loadingText || '更新中...'
    })
  }

  /**
   * DELETE请求
   */
  async delete<T>(url: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('DELETE', url, undefined, {
      ...options,
      loadingText: options.loadingText || '删除中...'
    })
  }

  /**
   * 批量请求
   */
  async batch<T>(requests: Array<{
    method: string
    url: string
    data?: any
    options?: RequestOptions
  }>): Promise<T[]> {
    const promises = requests.map(({ method, url, data, options }) =>
      this.request<T>(method, url, data, options)
    )

    return Promise.all(promises)
  }

  /**
   * 预加载数据
   */
  async preload(urls: string[]): Promise<void> {
    if (!isOnline()) {
      console.log('离线状态，跳过预加载')
      return
    }

    const promises = urls.map(async (url) => {
      try {
        await this.get(url, undefined, { showLoading: false })
        console.log(`预加载成功: ${url}`)
      } catch (error) {
        console.error(`预加载失败: ${url}`, error)
      }
    })

    await Promise.allSettled(promises)
  }

  /**
   * 清除缓存
   */
  async clearCache(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        // 清除匹配模式的缓存
        const keys = Object.keys(localStorage).filter(key =>
          key.startsWith(CONSTANTS.CACHE.PREFIXES.API) && key.includes(pattern)
        )
        keys.forEach(key => localStorage.removeItem(key))
      } else {
        // 清除所有API缓存
        const keys = Object.keys(localStorage).filter(key =>
          key.startsWith(CONSTANTS.CACHE.PREFIXES.API)
        )
        keys.forEach(key => localStorage.removeItem(key))
      }
    } catch (error) {
      console.error('清除缓存失败:', error)
    }
  }

  /**
   * 获取请求统计信息
   */
  getStats(): {
    totalRequests: number
    successRequests: number
    failedRequests: number
    cacheHits: number
  } {
    // 这里可以实现请求统计逻辑
    return {
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      cacheHits: 0
    }
  }
}

// 创建默认API服务实例
export const apiService = new ApiService()

// 导出便捷方法
export const { get, post, put, delete: del } = apiService

export default apiService