/**
 * Tushare Pro API 错误监控和报告系统
 * 提供实时错误监控、告警和详细报告功能
 */

import { 
  EnhancedError, 
  ErrorSeverity, 
  TushareErrorType,
  enhancedErrorHandler 
} from './enhancedErrorHandler'

// 监控配置
export interface MonitoringConfig {
  enabled: boolean
  alertThresholds: {
    errorRate: number // 错误率阈值 (%)
    criticalErrors: number // 严重错误数量阈值
    timeWindow: number // 时间窗口 (ms)
  }
  reporting: {
    interval: number // 报告间隔 (ms)
    maxReports: number // 最大保存报告数
  }
  notifications: {
    console: boolean
    webhook?: string
    email?: string
  }
}

// 默认监控配置
const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enabled: true,
  alertThresholds: {
    errorRate: 10, // 10% 错误率
    criticalErrors: 5, // 5个严重错误
    timeWindow: 300000 // 5分钟
  },
  reporting: {
    interval: 600000, // 10分钟
    maxReports: 24 // 保存24个报告 (4小时)
  },
  notifications: {
    console: true
  }
}

// 监控指标
export interface MonitoringMetrics {
  timestamp: number
  timeWindow: number
  totalRequests: number
  totalErrors: number
  errorRate: number
  errorsByType: Record<TushareErrorType, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  averageResponseTime: number
  slowestRequests: Array<{
    context: string
    duration: number
    timestamp: number
  }>
  topErrors: Array<{
    message: string
    count: number
    type: TushareErrorType
    severity: ErrorSeverity
  }>
}

// 告警信息
export interface Alert {
  id: string
  type: 'error_rate' | 'critical_errors' | 'service_down' | 'performance'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: number
  metrics: Partial<MonitoringMetrics>
  resolved: boolean
  resolvedAt?: number
}

// 性能指标
export interface PerformanceMetrics {
  requestCount: number
  totalDuration: number
  averageDuration: number
  minDuration: number
  maxDuration: number
  p95Duration: number
  p99Duration: number
}

// 错误监控器
export class ErrorMonitor {
  private config: MonitoringConfig
  private metrics: MonitoringMetrics[] = []
  private alerts: Alert[] = []
  private requestTimes: Array<{ context: string; duration: number; timestamp: number }> = []
  private isRunning = false
  private monitoringInterval?: NodeJS.Timeout

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...DEFAULT_MONITORING_CONFIG, ...config }
  }

  /**
   * 启动监控
   */
  start(): void {
    if (this.isRunning || !this.config.enabled) {
      return
    }

    this.isRunning = true
    console.log('🔍 启动 Tushare Pro API 错误监控')

    // 定期生成报告
    this.monitoringInterval = setInterval(() => {
      this.generateMetrics()
      this.checkAlerts()
    }, this.config.reporting.interval)
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }

    console.log('⏹️ 停止 Tushare Pro API 错误监控')
  }

  /**
   * 记录请求性能
   */
  recordRequest(context: string, duration: number): void {
    if (!this.config.enabled) return

    this.requestTimes.push({
      context,
      duration,
      timestamp: Date.now()
    })

    // 清理旧数据
    const cutoff = Date.now() - this.config.alertThresholds.timeWindow
    this.requestTimes = this.requestTimes.filter(req => req.timestamp > cutoff)
  }

  /**
   * 生成监控指标
   */
  private generateMetrics(): void {
    const now = Date.now()
    const timeWindow = this.config.alertThresholds.timeWindow
    const cutoff = now - timeWindow

    // 获取错误统计
    const errorStats = enhancedErrorHandler.getErrorStats()
    const recentErrors = errorStats.recentErrors.filter(error => error.timestamp > cutoff)
    const recentRequests = this.requestTimes.filter(req => req.timestamp > cutoff)

    // 计算指标
    const totalRequests = recentRequests.length
    const totalErrors = recentErrors.length
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0

    // 按类型统计错误
    const errorsByType: Record<TushareErrorType, number> = {} as any
    const errorsBySeverity: Record<ErrorSeverity, number> = {} as any

    recentErrors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1
    })

    // 计算响应时间
    const durations = recentRequests.map(req => req.duration)
    const averageResponseTime = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0

    // 最慢的请求
    const slowestRequests = recentRequests
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)

    // 最常见的错误
    const errorCounts = new Map<string, { count: number; type: TushareErrorType; severity: ErrorSeverity }>()
    recentErrors.forEach(error => {
      const key = error.message
      const existing = errorCounts.get(key)
      if (existing) {
        existing.count++
      } else {
        errorCounts.set(key, { count: 1, type: error.type, severity: error.severity })
      }
    })

    const topErrors = Array.from(errorCounts.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const metrics: MonitoringMetrics = {
      timestamp: now,
      timeWindow,
      totalRequests,
      totalErrors,
      errorRate,
      errorsByType,
      errorsBySeverity,
      averageResponseTime,
      slowestRequests,
      topErrors
    }

    this.metrics.unshift(metrics)

    // 保持最大报告数量
    if (this.metrics.length > this.config.reporting.maxReports) {
      this.metrics = this.metrics.slice(0, this.config.reporting.maxReports)
    }

    // 输出到控制台
    if (this.config.notifications.console) {
      this.logMetrics(metrics)
    }
  }

  /**
   * 检查告警条件
   */
  private checkAlerts(): void {
    if (this.metrics.length === 0) return

    const latestMetrics = this.metrics[0]
    const alerts: Alert[] = []

    // 检查错误率
    if (latestMetrics.errorRate > this.config.alertThresholds.errorRate) {
      alerts.push({
        id: `error_rate_${Date.now()}`,
        type: 'error_rate',
        severity: latestMetrics.errorRate > 50 ? 'critical' : 'high',
        message: `错误率过高: ${latestMetrics.errorRate.toFixed(1)}% (阈值: ${this.config.alertThresholds.errorRate}%)`,
        timestamp: Date.now(),
        metrics: latestMetrics,
        resolved: false
      })
    }

    // 检查严重错误数量
    const criticalErrors = latestMetrics.errorsBySeverity[ErrorSeverity.CRITICAL] || 0
    if (criticalErrors > this.config.alertThresholds.criticalErrors) {
      alerts.push({
        id: `critical_errors_${Date.now()}`,
        type: 'critical_errors',
        severity: 'critical',
        message: `严重错误数量过多: ${criticalErrors} (阈值: ${this.config.alertThresholds.criticalErrors})`,
        timestamp: Date.now(),
        metrics: latestMetrics,
        resolved: false
      })
    }

    // 检查性能问题
    if (latestMetrics.averageResponseTime > 10000) { // 10秒
      alerts.push({
        id: `performance_${Date.now()}`,
        type: 'performance',
        severity: 'medium',
        message: `平均响应时间过长: ${(latestMetrics.averageResponseTime / 1000).toFixed(1)}s`,
        timestamp: Date.now(),
        metrics: latestMetrics,
        resolved: false
      })
    }

    // 处理新告警
    alerts.forEach(alert => {
      this.alerts.unshift(alert)
      this.sendAlert(alert)
    })

    // 清理旧告警
    const alertCutoff = Date.now() - (24 * 60 * 60 * 1000) // 24小时
    this.alerts = this.alerts.filter(alert => alert.timestamp > alertCutoff)
  }

  /**
   * 发送告警
   */
  private sendAlert(alert: Alert): void {
    if (this.config.notifications.console) {
      const severityIcon = {
        low: '🟡',
        medium: '🟠',
        high: '🔴',
        critical: '🚨'
      }[alert.severity]

      console.warn(`${severityIcon} [ALERT] ${alert.message}`)
    }

    // 这里可以添加其他通知方式，如 webhook、邮件等
    if (this.config.notifications.webhook) {
      this.sendWebhookAlert(alert)
    }
  }

  /**
   * 发送 Webhook 告警
   */
  private async sendWebhookAlert(alert: Alert): Promise<void> {
    try {
      await fetch(this.config.notifications.webhook!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'tushare_alert',
          alert: alert,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('发送 Webhook 告警失败:', error)
    }
  }

  /**
   * 输出指标到控制台
   */
  private logMetrics(metrics: MonitoringMetrics): void {
    const time = new Date(metrics.timestamp).toLocaleTimeString()
    
    console.log(`\n📊 [${time}] Tushare Pro API 监控报告`)
    console.log(`请求数: ${metrics.totalRequests}, 错误数: ${metrics.totalErrors}, 错误率: ${metrics.errorRate.toFixed(1)}%`)
    
    if (metrics.averageResponseTime > 0) {
      console.log(`平均响应时间: ${(metrics.averageResponseTime / 1000).toFixed(2)}s`)
    }

    if (metrics.totalErrors > 0) {
      console.log('错误分布:')
      Object.entries(metrics.errorsByType).forEach(([type, count]) => {
        if (count > 0) {
          console.log(`  ${type}: ${count}`)
        }
      })
    }
  }

  /**
   * 获取最新指标
   */
  getLatestMetrics(): MonitoringMetrics | null {
    return this.metrics.length > 0 ? this.metrics[0] : null
  }

  /**
   * 获取历史指标
   */
  getHistoricalMetrics(count: number = 10): MonitoringMetrics[] {
    return this.metrics.slice(0, count)
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  /**
   * 获取所有告警
   */
  getAllAlerts(): Alert[] {
    return [...this.alerts]
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedAt = Date.now()
      return true
    }
    return false
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const durations = this.requestTimes.map(req => req.duration)
    
    if (durations.length === 0) {
      return {
        requestCount: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        p99Duration: 0
      }
    }

    const sorted = durations.sort((a, b) => a - b)
    const total = durations.reduce((sum, d) => sum + d, 0)

    return {
      requestCount: durations.length,
      totalDuration: total,
      averageDuration: total / durations.length,
      minDuration: sorted[0],
      maxDuration: sorted[sorted.length - 1],
      p95Duration: sorted[Math.floor(sorted.length * 0.95)],
      p99Duration: sorted[Math.floor(sorted.length * 0.99)]
    }
  }

  /**
   * 生成详细报告
   */
  generateDetailedReport(): string {
    const report = []
    const latestMetrics = this.getLatestMetrics()
    const activeAlerts = this.getActiveAlerts()
    const performance = this.getPerformanceMetrics()

    report.push('=== Tushare Pro API 监控报告 ===')
    report.push(`生成时间: ${new Date().toLocaleString()}`)
    report.push('')

    if (latestMetrics) {
      report.push('📊 最新指标:')
      report.push(`  时间窗口: ${(latestMetrics.timeWindow / 60000).toFixed(0)} 分钟`)
      report.push(`  总请求数: ${latestMetrics.totalRequests}`)
      report.push(`  总错误数: ${latestMetrics.totalErrors}`)
      report.push(`  错误率: ${latestMetrics.errorRate.toFixed(1)}%`)
      report.push(`  平均响应时间: ${(latestMetrics.averageResponseTime / 1000).toFixed(2)}s`)
      report.push('')
    }

    if (performance.requestCount > 0) {
      report.push('⚡ 性能指标:')
      report.push(`  请求总数: ${performance.requestCount}`)
      report.push(`  平均响应时间: ${(performance.averageDuration / 1000).toFixed(2)}s`)
      report.push(`  最快响应: ${(performance.minDuration / 1000).toFixed(2)}s`)
      report.push(`  最慢响应: ${(performance.maxDuration / 1000).toFixed(2)}s`)
      report.push(`  95% 响应时间: ${(performance.p95Duration / 1000).toFixed(2)}s`)
      report.push(`  99% 响应时间: ${(performance.p99Duration / 1000).toFixed(2)}s`)
      report.push('')
    }

    if (activeAlerts.length > 0) {
      report.push('🚨 活跃告警:')
      activeAlerts.forEach((alert, index) => {
        const time = new Date(alert.timestamp).toLocaleString()
        report.push(`  ${index + 1}. [${alert.severity.toUpperCase()}] ${alert.message} (${time})`)
      })
      report.push('')
    }

    return report.join('\n')
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * 获取配置
   */
  getConfig(): MonitoringConfig {
    return { ...this.config }
  }
}

// 导出单例实例
export const errorMonitor = new ErrorMonitor()

// 便捷函数
export function startMonitoring(config?: Partial<MonitoringConfig>): void {
  if (config) {
    errorMonitor.updateConfig(config)
  }
  errorMonitor.start()
}

export function stopMonitoring(): void {
  errorMonitor.stop()
}

export function getMonitoringStatus(): {
  isRunning: boolean
  latestMetrics: MonitoringMetrics | null
  activeAlerts: Alert[]
} {
  return {
    isRunning: true, // 简化实现
    latestMetrics: errorMonitor.getLatestMetrics(),
    activeAlerts: errorMonitor.getActiveAlerts()
  }
}
