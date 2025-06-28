/**
 * 性能监控工具
 * 用于监控和记录应用性能指标
 */

interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, any>
}

interface PerformanceReport {
  totalTime: number
  metrics: PerformanceMetric[]
  slowestOperations: PerformanceMetric[]
  averageTime: number
  operationCount: number
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private completedMetrics: PerformanceMetric[] = []
  private enabled: boolean = true

  constructor() {
    // 在开发环境启用性能监控
    this.enabled = import.meta.env.DEV || localStorage.getItem('performance-monitor') === 'true'
  }

  /**
   * 开始监控一个操作
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return

    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata
    }

    this.metrics.set(name, metric)
    console.log(`[Performance] 开始监控: ${name}`)
  }

  /**
   * 结束监控一个操作
   */
  end(name: string, metadata?: Record<string, any>): number | null {
    if (!this.enabled) return null

    const metric = this.metrics.get(name)
    if (!metric) {
      console.warn(`[Performance] 未找到监控项: ${name}`)
      return null
    }

    const endTime = performance.now()
    const duration = endTime - metric.startTime

    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration,
      metadata: { ...metric.metadata, ...metadata }
    }

    this.completedMetrics.push(completedMetric)
    this.metrics.delete(name)

    console.log(`[Performance] ${name} 完成，耗时: ${duration.toFixed(2)}ms`)

    // 如果操作耗时超过阈值，发出警告
    if (duration > 1000) {
      console.warn(`[Performance] 慢操作警告: ${name} 耗时 ${duration.toFixed(2)}ms`)
    }

    return duration
  }

  /**
   * 测量一个异步操作的性能
   */
  async measure<T>(name: string, operation: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    if (!this.enabled) {
      return await operation()
    }

    this.start(name, metadata)
    try {
      const result = await operation()
      this.end(name, { success: true })
      return result
    } catch (error) {
      this.end(name, { success: false, error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  /**
   * 测量一个同步操作的性能
   */
  measureSync<T>(name: string, operation: () => T, metadata?: Record<string, any>): T {
    if (!this.enabled) {
      return operation()
    }

    this.start(name, metadata)
    try {
      const result = operation()
      this.end(name, { success: true })
      return result
    } catch (error) {
      this.end(name, { success: false, error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  /**
   * 获取性能报告
   */
  getReport(): PerformanceReport {
    const totalTime = this.completedMetrics.reduce((sum, metric) => sum + (metric.duration || 0), 0)
    const operationCount = this.completedMetrics.length
    const averageTime = operationCount > 0 ? totalTime / operationCount : 0

    // 找出最慢的操作（前5个）
    const slowestOperations = [...this.completedMetrics]
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 5)

    return {
      totalTime,
      metrics: [...this.completedMetrics],
      slowestOperations,
      averageTime,
      operationCount
    }
  }

  /**
   * 打印性能报告
   */
  printReport(): void {
    if (!this.enabled) return

    const report = this.getReport()
    
    console.group('[Performance Report]')
    console.log(`总操作数: ${report.operationCount}`)
    console.log(`总耗时: ${report.totalTime.toFixed(2)}ms`)
    console.log(`平均耗时: ${report.averageTime.toFixed(2)}ms`)
    
    if (report.slowestOperations.length > 0) {
      console.group('最慢的操作:')
      report.slowestOperations.forEach((metric, index) => {
        console.log(`${index + 1}. ${metric.name}: ${metric.duration?.toFixed(2)}ms`)
      })
      console.groupEnd()
    }
    
    console.groupEnd()
  }

  /**
   * 清除所有性能数据
   */
  clear(): void {
    this.metrics.clear()
    this.completedMetrics = []
    console.log('[Performance] 性能数据已清除')
  }

  /**
   * 启用/禁用性能监控
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    localStorage.setItem('performance-monitor', enabled.toString())
    console.log(`[Performance] 性能监控已${enabled ? '启用' : '禁用'}`)
  }

  /**
   * 获取当前正在监控的操作
   */
  getActiveMetrics(): string[] {
    return Array.from(this.metrics.keys())
  }

  /**
   * 监控页面加载性能
   */
  monitorPageLoad(): void {
    if (!this.enabled) return

    // 监控页面加载时间
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      if (navigation) {
        console.group('[Performance] 页面加载性能')
        console.log(`DNS查询: ${(navigation.domainLookupEnd - navigation.domainLookupStart).toFixed(2)}ms`)
        console.log(`TCP连接: ${(navigation.connectEnd - navigation.connectStart).toFixed(2)}ms`)
        console.log(`请求响应: ${(navigation.responseEnd - navigation.requestStart).toFixed(2)}ms`)
        console.log(`DOM解析: ${(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart).toFixed(2)}ms`)
        console.log(`页面加载: ${(navigation.loadEventEnd - navigation.loadEventStart).toFixed(2)}ms`)
        console.log(`总时间: ${(navigation.loadEventEnd - navigation.navigationStart).toFixed(2)}ms`)
        console.groupEnd()
      }
    })

    // 监控资源加载
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.duration > 1000) {
          console.warn(`[Performance] 慢资源: ${entry.name} 耗时 ${entry.duration.toFixed(2)}ms`)
        }
      })
    })

    observer.observe({ entryTypes: ['resource'] })
  }

  /**
   * 监控长任务
   */
  monitorLongTasks(): void {
    if (!this.enabled) return

    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          console.warn(`[Performance] 长任务检测: ${entry.duration.toFixed(2)}ms`)
        })
      })

      try {
        observer.observe({ entryTypes: ['longtask'] })
      } catch (e) {
        console.warn('[Performance] 浏览器不支持长任务监控')
      }
    }
  }
}

// 创建全局实例
export const performanceMonitor = new PerformanceMonitor()

// 在开发环境下自动启动页面性能监控
if (import.meta.env.DEV) {
  performanceMonitor.monitorPageLoad()
  performanceMonitor.monitorLongTasks()
}

// 导出类型
export type { PerformanceMetric, PerformanceReport }
export default performanceMonitor
