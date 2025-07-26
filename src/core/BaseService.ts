/**
 * 基础服务类
 * 提供统一的服务基础功能和错误处理模式
 */

import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import { get, post, put, del } from '@/services/apiService'
import errorHandlingService, { ErrorType, ErrorSeverity } from '@/services/errorHandlingService'
import loadingService from '@/services/loadingService'

export interface ServiceConfig {
  baseUrl?: string
  timeout?: number
  retryCount?: number
  enableLoading?: boolean
  enableCache?: boolean
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  code?: string | number
}

export interface CacheOptions {
  key: string
  ttl?: number
  version?: string
  tags?: string[]
}

/**
 * 基础服务抽象类
 * 所有服务类都应该继承此类以获得统一的功能
 */
export abstract class BaseService {
  protected config: ServiceConfig
  protected serviceName: string

  constructor(serviceName: string, config: ServiceConfig = {}) {
    this.serviceName = serviceName
    this.config = {
      timeout: 8000,
      retryCount: 3,
      enableLoading: false,
      enableCache: true,
      ...config
    }
  }

  /**
   * 统一的GET请求方法
   */
  protected async get<T>(
    url: string,
    params?: any,
    options: {
      showLoading?: boolean
      loadingText?: string
      cache?: CacheOptions
    } = {}
  ): Promise<T> {
    const { showLoading = this.config.enableLoading, loadingText, cache } = options

    try {
      return await get<T>(url, params, undefined, showLoading, loadingText)
    } catch (error) {
      this.handleError(error, 'GET', url)
      throw error
    }
  }

  /**
   * 统一的POST请求方法
   */
  protected async post<T>(
    url: string,
    data?: any,
    options: {
      showLoading?: boolean
      loadingText?: string
      config?: AxiosRequestConfig
    } = {}
  ): Promise<T> {
    const { showLoading = this.config.enableLoading, loadingText, config } = options

    try {
      return await post<T>(url, data, config, showLoading, loadingText)
    } catch (error) {
      this.handleError(error, 'POST', url)
      throw error
    }
  }

  /**
   * 统一的PUT请求方法
   */
  protected async put<T>(
    url: string,
    data?: any,
    options: {
      showLoading?: boolean
      loadingText?: string
      config?: AxiosRequestConfig
    } = {}
  ): Promise<T> {
    const { showLoading = this.config.enableLoading, loadingText, config } = options

    try {
      return await put<T>(url, data, config, showLoading, loadingText)
    } catch (error) {
      this.handleError(error, 'PUT', url)
      throw error
    }
  }

  /**
   * 统一的DELETE请求方法
   */
  protected async delete<T>(
    url: string,
    options: {
      showLoading?: boolean
      loadingText?: string
      config?: AxiosRequestConfig
    } = {}
  ): Promise<T> {
    const { showLoading = this.config.enableLoading, loadingText, config } = options

    try {
      return await del<T>(url, config, showLoading, loadingText)
    } catch (error) {
      this.handleError(error, 'DELETE', url)
      throw error
    }
  }

  /**
   * 统一的错误处理方法
   */
  protected handleError(error: any, method: string, url: string): void {
    const errorMessage = `${this.serviceName} ${method} ${url} 失败`

    // 创建应用错误对象
    const appError = errorHandlingService.createAppError(
      this.getErrorType(error),
      errorMessage,
      ErrorSeverity.ERROR,
      {
        service: this.serviceName,
        method,
        url,
        originalError: error
      }
    )

    // 处理错误
    errorHandlingService.handleError(appError)
  }

  /**
   * 根据错误类型确定错误分类
   */
  private getErrorType(error: any): ErrorType {
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return ErrorType.NETWORK
    }
    if (error?.response?.status === 401) {
      return ErrorType.AUTH
    }
    if (error?.response?.status === 403) {
      return ErrorType.PERMISSION
    }
    if (error?.response?.status >= 400 && error?.response?.status < 500) {
      return ErrorType.VALIDATION
    }
    if (error?.response?.status >= 500) {
      return ErrorType.SERVER
    }
    if (error?.message === 'Network Error') {
      return ErrorType.NETWORK
    }
    return ErrorType.UNKNOWN
  }

  /**
   * 带重试的请求方法
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retryCount || 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error

        // 如果是最后一次尝试，直接抛出错误
        if (attempt === maxRetries) {
          break
        }

        // 如果是不可重试的错误，直接抛出
        if (this.isNonRetryableError(error)) {
          break
        }

        // 等待后重试
        await this.sleep(delay * attempt)
      }
    }

    throw lastError
  }

  /**
   * 判断是否为不可重试的错误
   */
  private isNonRetryableError(error: any): boolean {
    const status = error?.response?.status
    // 4xx错误通常不需要重试
    return status >= 400 && status < 500
  }

  /**
   * 延迟执行
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 格式化API响应
   */
  protected formatResponse<T>(response: any): ApiResponse<T> {
    if (response?.success !== undefined) {
      return response
    }

    // 统一响应格式
    return {
      success: true,
      data: response,
      message: 'Success'
    }
  }

  /**
   * 验证必需参数
   */
  protected validateRequired(params: Record<string, any>, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field =>
      params[field] === undefined || params[field] === null || params[field] === ''
    )

    if (missingFields.length > 0) {
      const error = errorHandlingService.createAppError(
        ErrorType.VALIDATION,
        `缺少必需参数: ${missingFields.join(', ')}`,
        ErrorSeverity.ERROR,
        { missingFields, service: this.serviceName }
      )
      throw error
    }
  }

  /**
   * 获取服务名称
   */
  public getServiceName(): string {
    return this.serviceName
  }

  /**
   * 获取服务配置
   */
  public getConfig(): ServiceConfig {
    return { ...this.config }
  }
}

/**
 * 数据服务基类
 * 专门用于数据相关的服务
 */
export abstract class BaseDataService extends BaseService {
  constructor(serviceName: string, config: ServiceConfig = {}) {
    super(serviceName, {
      enableLoading: true,
      enableCache: true,
      ...config
    })
  }

  /**
   * 标准化数据列表响应
   */
  protected formatListResponse<T>(
    data: T[],
    total?: number,
    page?: number,
    pageSize?: number
  ): ApiResponse<{
    items: T[]
    total: number
    page: number
    pageSize: number
    hasMore: boolean
  }> {
    const totalCount = total ?? data.length
    const currentPage = page ?? 1
    const currentPageSize = pageSize ?? data.length

    return {
      success: true,
      data: {
        items: data,
        total: totalCount,
        page: currentPage,
        pageSize: currentPageSize,
        hasMore: currentPage * currentPageSize < totalCount
      }
    }
  }

  /**
   * 标准化单项数据响应
   */
  protected formatItemResponse<T>(data: T): ApiResponse<T> {
    return {
      success: true,
      data
    }
  }
}

export default BaseService