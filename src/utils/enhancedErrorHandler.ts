/**
 * 增强的 Tushare Pro API 错误处理和重试逻辑
 * 提供更智能的错误分类、恢复策略和监控功能
 */

import { retryManager, tushareRateLimiter } from './rateLimiter'

// 错误类型枚举
export enum TushareErrorType {
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  PERMISSION = 'permission',
  PARAMETER = 'parameter',
  NETWORK = 'network',
  SERVER = 'server',
  DATA_QUALITY = 'data_quality',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

// 错误严重程度
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 错误恢复策略
export enum RecoveryStrategy {
  RETRY = 'retry',
  WAIT_AND_RETRY = 'wait_and_retry',
  FALLBACK = 'fallback',
  FAIL_FAST = 'fail_fast',
  CIRCUIT_BREAKER = 'circuit_breaker'
}

// 增强的错误信息
export interface EnhancedError {
  originalError: any
  type: TushareErrorType
  severity: ErrorSeverity
  code?: number
  message: string
  context: string
  timestamp: number
  recoveryStrategy: RecoveryStrategy
  retryable: boolean
  suggestions: string[]
}

// 错误统计
export interface ErrorStats {
  totalErrors: number
  errorsByType: Record<TushareErrorType, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  recentErrors: EnhancedError[]
  recoverySuccessRate: number
}

// 熔断器状态
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

// 熔断器配置
export interface CircuitBreakerConfig {
  failureThreshold: number
  recoveryTimeout: number
  monitoringPeriod: number
}

// 熔断器实现
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED
  private failureCount: number = 0
  private lastFailureTime: number = 0
  private config: CircuitBreakerConfig

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1分钟
      monitoringPeriod: 300000, // 5分钟
      ...config
    }
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = CircuitBreakerState.HALF_OPEN
      } else {
        throw new Error('熔断器开启，服务暂时不可用')
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    this.state = CircuitBreakerState.CLOSED
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN
    }
  }

  getState(): CircuitBreakerState {
    return this.state
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED
    this.failureCount = 0
    this.lastFailureTime = 0
  }
}

// 增强的错误处理器
export class EnhancedErrorHandler {
  private errorStats: ErrorStats = {
    totalErrors: 0,
    errorsByType: {} as Record<TushareErrorType, number>,
    errorsBySeverity: {} as Record<ErrorSeverity, number>,
    recentErrors: [],
    recoverySuccessRate: 0
  }
  
  private circuitBreaker = new CircuitBreaker()
  private maxRecentErrors = 100

  /**
   * 处理错误并返回增强的错误信息
   */
  handleError(error: any, context: string = 'unknown'): EnhancedError {
    const enhancedError = this.analyzeError(error, context)
    this.recordError(enhancedError)
    return enhancedError
  }

  /**
   * 分析错误并分类
   */
  private analyzeError(error: any, context: string): EnhancedError {
    const timestamp = Date.now()
    let type = TushareErrorType.UNKNOWN
    let severity = ErrorSeverity.MEDIUM
    let recoveryStrategy = RecoveryStrategy.RETRY
    let retryable = true
    const suggestions: string[] = []

    // 分析错误代码
    if (error.code) {
      switch (error.code) {
        case 40001:
          type = TushareErrorType.PERMISSION
          severity = ErrorSeverity.HIGH
          recoveryStrategy = RecoveryStrategy.FAIL_FAST
          retryable = false
          suggestions.push('检查 Token 权限或升级积分')
          break
        
        case 40002:
          type = TushareErrorType.AUTHENTICATION
          severity = ErrorSeverity.CRITICAL
          recoveryStrategy = RecoveryStrategy.FAIL_FAST
          retryable = false
          suggestions.push('Token 无效，请重新获取有效的 Token')
          break
        
        case 40101:
          type = TushareErrorType.RATE_LIMIT
          severity = ErrorSeverity.MEDIUM
          recoveryStrategy = RecoveryStrategy.WAIT_AND_RETRY
          suggestions.push('每日请求限制超限，等待次日重置或升级积分')
          break
        
        case 40203:
          type = TushareErrorType.RATE_LIMIT
          severity = ErrorSeverity.LOW
          recoveryStrategy = RecoveryStrategy.WAIT_AND_RETRY
          suggestions.push('频率限制超限，降低请求频率')
          break
        
        case 40301:
          type = TushareErrorType.PARAMETER
          severity = ErrorSeverity.MEDIUM
          recoveryStrategy = RecoveryStrategy.FAIL_FAST
          retryable = false
          suggestions.push('检查请求参数格式和必填项')
          break
        
        case 50001:
          type = TushareErrorType.SERVER
          severity = ErrorSeverity.HIGH
          recoveryStrategy = RecoveryStrategy.CIRCUIT_BREAKER
          suggestions.push('服务器错误，稍后重试或联系技术支持')
          break
        
        default:
          if (error.code >= 500) {
            type = TushareErrorType.SERVER
            severity = ErrorSeverity.HIGH
          }
      }
    }

    // 分析错误消息
    const message = error.message?.toLowerCase() || ''
    
    if (message.includes('timeout') || message.includes('econnaborted')) {
      type = TushareErrorType.TIMEOUT
      severity = ErrorSeverity.MEDIUM
      recoveryStrategy = RecoveryStrategy.RETRY
      suggestions.push('网络超时，检查网络连接或增加超时时间')
    } else if (message.includes('network') || message.includes('econnreset')) {
      type = TushareErrorType.NETWORK
      severity = ErrorSeverity.MEDIUM
      recoveryStrategy = RecoveryStrategy.RETRY
      suggestions.push('网络连接问题，检查网络状态')
    } else if (message.includes('频率限制') || message.includes('每分钟最多访问')) {
      type = TushareErrorType.RATE_LIMIT
      severity = ErrorSeverity.LOW
      recoveryStrategy = RecoveryStrategy.WAIT_AND_RETRY
      suggestions.push('触发频率限制，等待后重试')
    }

    return {
      originalError: error,
      type,
      severity,
      code: error.code,
      message: error.message || '未知错误',
      context,
      timestamp,
      recoveryStrategy,
      retryable,
      suggestions
    }
  }

  /**
   * 记录错误统计
   */
  private recordError(error: EnhancedError): void {
    this.errorStats.totalErrors++
    
    // 按类型统计
    this.errorStats.errorsByType[error.type] = 
      (this.errorStats.errorsByType[error.type] || 0) + 1
    
    // 按严重程度统计
    this.errorStats.errorsBySeverity[error.severity] = 
      (this.errorStats.errorsBySeverity[error.severity] || 0) + 1
    
    // 记录最近错误
    this.errorStats.recentErrors.unshift(error)
    if (this.errorStats.recentErrors.length > this.maxRecentErrors) {
      this.errorStats.recentErrors = this.errorStats.recentErrors.slice(0, this.maxRecentErrors)
    }
  }

  /**
   * 执行带增强错误处理的操作
   */
  async executeWithEnhancedHandling<T>(
    operation: () => Promise<T>,
    context: string = 'operation',
    options: {
      useCircuitBreaker?: boolean
      customRetryConfig?: any
      fallbackValue?: T
    } = {}
  ): Promise<T> {
    const { useCircuitBreaker = false, customRetryConfig, fallbackValue } = options

    try {
      const executeOperation = async () => {
        try {
          return await operation()
        } catch (error) {
          const enhancedError = this.handleError(error, context)
          
          // 根据恢复策略处理
          switch (enhancedError.recoveryStrategy) {
            case RecoveryStrategy.FAIL_FAST:
              throw enhancedError
            
            case RecoveryStrategy.WAIT_AND_RETRY:
              if (enhancedError.type === TushareErrorType.RATE_LIMIT) {
                await tushareRateLimiter.waitForNextRequest(context)
              }
              throw enhancedError
            
            case RecoveryStrategy.FALLBACK:
              if (fallbackValue !== undefined) {
                console.warn(`[ErrorHandler] 使用回退值: ${context}`)
                return fallbackValue
              }
              throw enhancedError
            
            default:
              throw enhancedError
          }
        }
      }

      if (useCircuitBreaker) {
        return await this.circuitBreaker.execute(executeOperation)
      } else {
        return await retryManager.executeWithRetry(executeOperation, context)
      }
    } catch (error: any) {
      // 如果有回退值且错误不是致命的，返回回退值
      if (fallbackValue !== undefined && error.severity !== ErrorSeverity.CRITICAL) {
        console.warn(`[ErrorHandler] 最终使用回退值: ${context}`)
        return fallbackValue
      }
      
      throw error
    }
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): ErrorStats {
    return { ...this.errorStats }
  }

  /**
   * 获取错误建议
   */
  getErrorSuggestions(errorType?: TushareErrorType): string[] {
    if (!errorType) {
      // 返回通用建议
      return [
        '检查网络连接状态',
        '验证 Tushare Token 是否有效',
        '确认请求参数格式正确',
        '检查是否超出 API 调用限制',
        '考虑添加重试机制和错误处理'
      ]
    }

    const recentErrors = this.errorStats.recentErrors
      .filter(error => error.type === errorType)
      .slice(0, 5)

    const suggestions = new Set<string>()
    recentErrors.forEach(error => {
      error.suggestions.forEach(suggestion => suggestions.add(suggestion))
    })

    return Array.from(suggestions)
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.errorStats = {
      totalErrors: 0,
      errorsByType: {} as Record<TushareErrorType, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      recentErrors: [],
      recoverySuccessRate: 0
    }
  }

  /**
   * 获取熔断器状态
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreaker.getState()
  }

  /**
   * 重置熔断器
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset()
  }

  /**
   * 生成错误报告
   */
  generateErrorReport(): string {
    const stats = this.errorStats
    const report = []

    report.push('=== Tushare Pro API 错误报告 ===')
    report.push(`总错误数: ${stats.totalErrors}`)
    report.push('')

    report.push('按类型分布:')
    Object.entries(stats.errorsByType).forEach(([type, count]) => {
      const percentage = ((count / stats.totalErrors) * 100).toFixed(1)
      report.push(`  ${type}: ${count} (${percentage}%)`)
    })
    report.push('')

    report.push('按严重程度分布:')
    Object.entries(stats.errorsBySeverity).forEach(([severity, count]) => {
      const percentage = ((count / stats.totalErrors) * 100).toFixed(1)
      report.push(`  ${severity}: ${count} (${percentage}%)`)
    })
    report.push('')

    if (stats.recentErrors.length > 0) {
      report.push('最近错误:')
      stats.recentErrors.slice(0, 5).forEach((error, index) => {
        const time = new Date(error.timestamp).toLocaleString()
        report.push(`  ${index + 1}. [${error.type}] ${error.message} (${time})`)
      })
    }

    return report.join('\n')
  }
}

// 导出单例实例
export const enhancedErrorHandler = new EnhancedErrorHandler()

// 便捷函数
export async function safeExecute<T>(
  operation: () => Promise<T>,
  context: string = 'operation',
  fallbackValue?: T
): Promise<T> {
  return enhancedErrorHandler.executeWithEnhancedHandling(
    operation,
    context,
    { fallbackValue }
  )
}

export async function executeWithCircuitBreaker<T>(
  operation: () => Promise<T>,
  context: string = 'operation'
): Promise<T> {
  return enhancedErrorHandler.executeWithEnhancedHandling(
    operation,
    context,
    { useCircuitBreaker: true }
  )
}
