/**
 * 缓存统计服务
 * 提供缓存性能监控和分析功能，支持多层缓存统计
 */

import axios from 'axios'
import { getAuthHeaders } from '@/utils/auth'

// API基础URL
const API_URL = '/api'

// 缓存统计信息接口
export interface CacheStats {
  success: boolean
  hits: number
  misses: number
  requests: number
  apiCalls: number
  errors: number
  hitRate: string
  lastReset: string
  dataSource?: string
  sourceStats?: {
    hits: number
    misses: number
    requests: number
    apiCalls: number
    errors: number
    hitRate: string
  }
  apiStats?: Record<
    string,
    {
      hits: number
      misses: number
      requests: number
      apiCalls: number
      errors: number
      hitRate: string
      lastAccess: string
      lastError?: {
        message: string
        time: string
      }
    }
  >
  dataSourceStats?: Record<
    string,
    {
      hits: number
      misses: number
      requests: number
      apiCalls: number
      errors: number
    }
  >
  error?: string
}

// 重置结果接口
export interface ResetResult {
  success: boolean
  message: string
  dataSource?: string
  resetTime: string
  error?: string
}

// 综合缓存统计接口
export interface CacheStatistics {
  server: {
    enabled: boolean
    hitRate: number
    totalOperations: number
    hits: number
    misses: number
    sets: number
    deletes: number
    errors: number
    memoryUsage: number
    keyCount: number
    layers: {
      redis: {
        connected: boolean
        latency: number
        memoryUsage: number
        keyCount: number
      }
      memory: {
        size: number
        usage: number
        hitRate: number
      }
    }
  }
  client: {
    memoryCache: {
      size: number
      memoryUsage: number
      maxMemorySize: number
      hitRate: number
    }
    localStorage: {
      available: boolean
      usage: number
      keyCount: number
    }
    sessionStorage: {
      available: boolean
      usage: number
      keyCount: number
    }
    indexedDB: {
      available: boolean
      usage: number
      keyCount: number
    }
  }
  performance: {
    averageResponseTime: number
    cacheEfficiency: number
    memoryEfficiency: number
    recommendations: string[]
  }
}

// 缓存健康状态
export interface CacheHealth {
  overall: 'healthy' | 'warning' | 'critical'
  server: {
    status: 'healthy' | 'warning' | 'critical'
    issues: string[]
    metrics: {
      hitRate: number
      latency: number
      memoryUsage: number
      errorRate: number
    }
  }
  client: {
    status: 'healthy' | 'warning' | 'critical'
    issues: string[]
    metrics: {
      memoryUsage: number
      storageUsage: number
      hitRate: number
    }
  }
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    category: 'performance' | 'memory' | 'configuration'
    message: string
    action: string
  }>
}

// 缓存优化建议
export interface CacheOptimization {
  suggestions: Array<{
    type: 'ttl' | 'size' | 'strategy' | 'prewarming'
    priority: number
    description: string
    expectedImprovement: string
    implementation: string
  }>
  currentEfficiency: number
  potentialEfficiency: number
  estimatedSavings: {
    memory: number
    responseTime: number
    apiCalls: number
  }
}

// 缓存统计服务类
class CacheStatsService {
  private statsHistory: Array<{ timestamp: number; stats: CacheStatistics }> = []
  private readonly maxHistorySize = 100
  private monitoringInterval: number | null = null

  /**
   * 获取缓存统计信息
   * @param dataSource 数据源名称
   */
  async getStats(dataSource?: string): Promise<CacheStats> {
    try {
      // 如果没有提供数据源，使用当前数据源
      const currentDataSource =
        dataSource || localStorage.getItem('preferredDataSource') || 'tushare'

      const url = `${API_URL}/cache-stats?dataSource=${currentDataSource}`

      const response = await axios.get(url, getAuthHeaders())
      return response.data
    } catch (error: any) {
      console.error('获取缓存统计信息失败:', error)
      throw new Error(error.response?.data?.message || '获取缓存统计信息失败')
    }
  }

  /**
   * 获取综合缓存统计信息
   */
  async getComprehensiveStats(): Promise<CacheStatistics> {
    try {
      // 获取服务器端统计
      const serverStatsResponse = await axios.get(`${API_URL}/cache/stats`, getAuthHeaders())
      const serverStats = serverStatsResponse.data

      // 获取客户端统计
      const clientStats = this.getClientStats()

      // 计算性能指标
      const performance = this.calculatePerformanceMetrics(serverStats, clientStats)

      const comprehensiveStats: CacheStatistics = {
        server: {
          enabled: serverStats.enabled || false,
          hitRate: serverStats.hitRate || 0,
          totalOperations: serverStats.totalOperations || 0,
          hits: serverStats.hits || 0,
          misses: serverStats.misses || 0,
          sets: serverStats.sets || 0,
          deletes: serverStats.deletes || 0,
          errors: serverStats.errors || 0,
          memoryUsage: serverStats.memoryUsage || 0,
          keyCount: serverStats.keyCount || 0,
          layers: {
            redis: {
              connected: serverStats.redis?.connected || false,
              latency: serverStats.redis?.latency || 0,
              memoryUsage: serverStats.redis?.memoryUsage || 0,
              keyCount: serverStats.redis?.keyCount || 0
            },
            memory: {
              size: serverStats.memory?.size || 0,
              usage: serverStats.memory?.usage || 0,
              hitRate: serverStats.memory?.hitRate || 0
            }
          }
        },
        client: clientStats,
        performance
      }

      // 保存到历史记录
      this.addToHistory(comprehensiveStats)

      return comprehensiveStats
    } catch (error) {
      console.error('获取缓存统计失败:', error)
      throw new Error('获取缓存统计失败')
    }
  }

  /**
   * 获取客户端缓存统计
   */
  private getClientStats() {
    // 获取内存缓存统计
    const memoryStats = this.getMemoryCacheStats()

    // 获取存储统计
    const localStorageStats = this.getStorageStats(localStorage, 'localStorage')
    const sessionStorageStats = this.getStorageStats(sessionStorage, 'sessionStorage')
    const indexedDBStats = this.getIndexedDBStats()

    return {
      memoryCache: memoryStats,
      localStorage: localStorageStats,
      sessionStorage: sessionStorageStats,
      indexedDB: indexedDBStats
    }
  }

  /**
   * 获取内存缓存统计
   */
  private getMemoryCacheStats() {
    // 这里需要从实际的缓存管理器获取统计信息
    // 暂时返回模拟数据
    return {
      size: 0,
      memoryUsage: 0,
      maxMemorySize: 50 * 1024 * 1024,
      hitRate: 0
    }
  }

  /**
   * 获取存储统计
   */
  private getStorageStats(storage: Storage, type: string) {
    try {
      let usage = 0
      let keyCount = 0

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key && key.startsWith('cache:')) {
          const value = storage.getItem(key)
          if (value) {
            usage += value.length
            keyCount++
          }
        }
      }

      return {
        available: true,
        usage,
        keyCount
      }
    } catch (error) {
      return {
        available: false,
        usage: 0,
        keyCount: 0
      }
    }
  }

  /**
   * 获取IndexedDB统计
   */
  private getIndexedDBStats() {
    // IndexedDB统计需要异步获取，这里返回基本信息
    return {
      available: typeof indexedDB !== 'undefined',
      usage: 0,
      keyCount: 0
    }
  }

  /**
   * 计算性能指标
   */
  private calculatePerformanceMetrics(serverStats: any, clientStats: any) {
    const totalHits = (serverStats.hits || 0) + (clientStats.memoryCache?.hits || 0)
    const totalMisses = (serverStats.misses || 0) + (clientStats.memoryCache?.misses || 0)
    const totalOperations = totalHits + totalMisses

    const cacheEfficiency = totalOperations > 0 ? (totalHits / totalOperations) * 100 : 0

    const totalMemoryUsage = (serverStats.memoryUsage || 0) + (clientStats.memoryCache?.memoryUsage || 0)
    const maxMemoryUsage = (serverStats.maxMemoryUsage || 100 * 1024 * 1024) + (clientStats.memoryCache?.maxMemorySize || 50 * 1024 * 1024)
    const memoryEfficiency = maxMemoryUsage > 0 ? ((maxMemoryUsage - totalMemoryUsage) / maxMemoryUsage) * 100 : 0

    const recommendations = this.generateRecommendations(serverStats, clientStats, cacheEfficiency, memoryEfficiency)

    return {
      averageResponseTime: serverStats.averageResponseTime || 0,
      cacheEfficiency: Math.round(cacheEfficiency * 100) / 100,
      memoryEfficiency: Math.round(memoryEfficiency * 100) / 100,
      recommendations
    }
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(serverStats: any, clientStats: any, cacheEfficiency: number, memoryEfficiency: number): string[] {
    const recommendations: string[] = []

    if (cacheEfficiency < 50) {
      recommendations.push('缓存命中率较低，建议优化缓存策略或增加预热')
    }

    if (memoryEfficiency < 30) {
      recommendations.push('内存使用率过高，建议清理过期缓存或增加内存限制')
    }

    if (serverStats.redis?.latency > 100) {
      recommendations.push('Redis延迟较高，建议检查网络连接或优化查询')
    }

    if (serverStats.errors > 0) {
      recommendations.push('存在缓存错误，建议检查日志并修复问题')
    }

    if (clientStats.localStorage?.usage > 5 * 1024 * 1024) {
      recommendations.push('localStorage使用量较大，建议清理旧数据')
    }

    return recommendations
  }

  /**
   * 获取缓存健康状态
   */
  async getCacheHealth(): Promise<CacheHealth> {
    try {
      const stats = await this.getComprehensiveStats()

      // 评估服务器健康状态
      const serverHealth = this.evaluateServerHealth(stats.server)

      // 评估客户端健康状态
      const clientHealth = this.evaluateClientHealth(stats.client)

      // 确定整体健康状态
      const overall = this.determineOverallHealth(serverHealth.status, clientHealth.status)

      // 生成优化建议
      const recommendations = this.generateHealthRecommendations(serverHealth, clientHealth)

      return {
        overall,
        server: serverHealth,
        client: clientHealth,
        recommendations
      }
    } catch (error) {
      console.error('获取缓存健康状态失败:', error)
      throw new Error('获取缓存健康状态失败')
    }
  }

  /**
   * 评估服务器健康状态
   */
  private evaluateServerHealth(serverStats: any) {
    const issues: string[] = []
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'

    // 检查命中率
    if (serverStats.hitRate < 30) {
      issues.push('缓存命中率过低')
      status = 'critical'
    } else if (serverStats.hitRate < 60) {
      issues.push('缓存命中率偏低')
      if (status === 'healthy') status = 'warning'
    }

    // 检查延迟
    if (serverStats.layers.redis.latency > 200) {
      issues.push('Redis延迟过高')
      status = 'critical'
    } else if (serverStats.layers.redis.latency > 100) {
      issues.push('Redis延迟偏高')
      if (status === 'healthy') status = 'warning'
    }

    // 检查错误率
    const errorRate = serverStats.totalOperations > 0 ? (serverStats.errors / serverStats.totalOperations) * 100 : 0
    if (errorRate > 5) {
      issues.push('错误率过高')
      status = 'critical'
    } else if (errorRate > 1) {
      issues.push('存在缓存错误')
      if (status === 'healthy') status = 'warning'
    }

    // 检查内存使用
    const memoryUsagePercent = serverStats.layers.redis.memoryUsage > 0 ?
      (serverStats.memoryUsage / serverStats.layers.redis.memoryUsage) * 100 : 0
    if (memoryUsagePercent > 90) {
      issues.push('内存使用率过高')
      status = 'critical'
    } else if (memoryUsagePercent > 80) {
      issues.push('内存使用率偏高')
      if (status === 'healthy') status = 'warning'
    }

    return {
      status,
      issues,
      metrics: {
        hitRate: serverStats.hitRate,
        latency: serverStats.layers.redis.latency,
        memoryUsage: memoryUsagePercent,
        errorRate
      }
    }
  }

  /**
   * 评估客户端健康状态
   */
  private evaluateClientHealth(clientStats: any) {
    const issues: string[] = []
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'

    // 检查内存使用
    const memoryUsagePercent = clientStats.memoryCache.maxMemorySize > 0 ?
      (clientStats.memoryCache.memoryUsage / clientStats.memoryCache.maxMemorySize) * 100 : 0
    if (memoryUsagePercent > 90) {
      issues.push('客户端内存使用率过高')
      status = 'critical'
    } else if (memoryUsagePercent > 80) {
      issues.push('客户端内存使用率偏高')
      if (status === 'healthy') status = 'warning'
    }

    // 检查localStorage使用
    if (clientStats.localStorage.usage > 8 * 1024 * 1024) { // 8MB
      issues.push('localStorage使用量过大')
      if (status === 'healthy') status = 'warning'
    }

    // 检查存储可用性
    if (!clientStats.localStorage.available) {
      issues.push('localStorage不可用')
      if (status === 'healthy') status = 'warning'
    }

    if (!clientStats.sessionStorage.available) {
      issues.push('sessionStorage不可用')
      if (status === 'healthy') status = 'warning'
    }

    const totalStorageUsage = clientStats.localStorage.usage + clientStats.sessionStorage.usage

    return {
      status,
      issues,
      metrics: {
        memoryUsage: memoryUsagePercent,
        storageUsage: totalStorageUsage,
        hitRate: clientStats.memoryCache.hitRate
      }
    }
  }

  /**
   * 确定整体健康状态
   */
  private determineOverallHealth(serverStatus: string, clientStatus: string): 'healthy' | 'warning' | 'critical' {
    if (serverStatus === 'critical' || clientStatus === 'critical') {
      return 'critical'
    }
    if (serverStatus === 'warning' || clientStatus === 'warning') {
      return 'warning'
    }
    return 'healthy'
  }

  /**
   * 生成健康建议
   */
  private generateHealthRecommendations(serverHealth: any, clientHealth: any) {
    const recommendations: Array<{
      priority: 'high' | 'medium' | 'low'
      category: 'performance' | 'memory' | 'configuration'
      message: string
      action: string
    }> = []

    // 服务器建议
    if (serverHealth.metrics.hitRate < 50) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        message: '服务器缓存命中率过低',
        action: '优化缓存策略，增加预热机制，调整TTL设置'
      })
    }

    if (serverHealth.metrics.latency > 100) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        message: 'Redis延迟过高',
        action: '检查网络连接，优化Redis配置，考虑使用连接池'
      })
    }

    if (serverHealth.metrics.memoryUsage > 80) {
      recommendations.push({
        priority: 'medium',
        category: 'memory',
        message: '服务器内存使用率过高',
        action: '清理过期缓存，调整内存限制，实施更积极的淘汰策略'
      })
    }

    // 客户端建议
    if (clientHealth.metrics.memoryUsage > 80) {
      recommendations.push({
        priority: 'medium',
        category: 'memory',
        message: '客户端内存使用率过高',
        action: '清理客户端缓存，减少内存缓存大小限制'
      })
    }

    if (clientHealth.metrics.storageUsage > 5 * 1024 * 1024) {
      recommendations.push({
        priority: 'low',
        category: 'memory',
        message: '客户端存储使用量较大',
        action: '定期清理localStorage和sessionStorage中的过期数据'
      })
    }

    return recommendations
  }

  /**
   * 获取缓存优化建议
   */
  async getCacheOptimization(): Promise<CacheOptimization> {
    try {
      const stats = await this.getComprehensiveStats()
      const suggestions = this.generateOptimizationSuggestions(stats)

      const currentEfficiency = stats.performance.cacheEfficiency
      const potentialEfficiency = this.calculatePotentialEfficiency(stats, suggestions)

      const estimatedSavings = this.calculateEstimatedSavings(stats, suggestions)

      return {
        suggestions,
        currentEfficiency,
        potentialEfficiency,
        estimatedSavings
      }
    } catch (error) {
      console.error('获取缓存优化建议失败:', error)
      throw new Error('获取缓存优化建议失败')
    }
  }

  /**
   * 生成优化建议
   */
  private generateOptimizationSuggestions(stats: CacheStatistics) {
    const suggestions: Array<{
      type: 'ttl' | 'size' | 'strategy' | 'prewarming'
      priority: number
      description: string
      expectedImprovement: string
      implementation: string
    }> = []

    // TTL优化建议
    if (stats.server.hitRate < 60) {
      suggestions.push({
        type: 'ttl',
        priority: 8,
        description: '优化缓存过期时间设置',
        expectedImprovement: '提高缓存命中率15-25%',
        implementation: '根据数据更新频率调整TTL，热点数据使用更长的TTL'
      })
    }

    // 预热策略建议
    if (stats.performance.averageResponseTime > 500) {
      suggestions.push({
        type: 'prewarming',
        priority: 9,
        description: '实施智能缓存预热策略',
        expectedImprovement: '减少响应时间30-50%',
        implementation: '基于访问模式预热热点数据，在低峰期执行预热任务'
      })
    }

    // 内存优化建议
    if (stats.server.memoryUsage > 80 * 1024 * 1024) { // 80MB
      suggestions.push({
        type: 'size',
        priority: 7,
        description: '优化缓存大小和淘汰策略',
        expectedImprovement: '减少内存使用20-30%',
        implementation: '实施LRU淘汰策略，压缩大型缓存项，调整缓存大小限制'
      })
    }

    // 策略优化建议
    if (stats.client.memoryCache.hitRate < 70) {
      suggestions.push({
        type: 'strategy',
        priority: 6,
        description: '优化多层缓存策略',
        expectedImprovement: '提高整体缓存效率10-20%',
        implementation: '改进缓存层级策略，优化数据在不同层之间的分布'
      })
    }

    return suggestions.sort((a, b) => b.priority - a.priority)
  }

  /**
   * 计算潜在效率
   */
  private calculatePotentialEfficiency(stats: CacheStatistics, suggestions: any[]): number {
    let improvement = 0

    suggestions.forEach(suggestion => {
      switch (suggestion.type) {
        case 'ttl':
          improvement += 20
          break
        case 'prewarming':
          improvement += 25
          break
        case 'size':
          improvement += 15
          break
        case 'strategy':
          improvement += 10
          break
      }
    })

    const potentialEfficiency = Math.min(stats.performance.cacheEfficiency + improvement, 95)
    return Math.round(potentialEfficiency * 100) / 100
  }

  /**
   * 计算预估节省
   */
  private calculateEstimatedSavings(stats: CacheStatistics, suggestions: any[]) {
    const memorySavings = suggestions
      .filter(s => s.type === 'size')
      .reduce((total, s) => total + (stats.server.memoryUsage * 0.2), 0)

    const responseTimeSavings = suggestions
      .filter(s => s.type === 'prewarming')
      .reduce((total, s) => total + (stats.performance.averageResponseTime * 0.4), 0)

    const apiCallSavings = suggestions
      .filter(s => s.type === 'ttl' || s.type === 'prewarming')
      .reduce((total, s) => total + (stats.server.misses * 0.3), 0)

    return {
      memory: Math.round(memorySavings),
      responseTime: Math.round(responseTimeSavings),
      apiCalls: Math.round(apiCallSavings)
    }
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(stats: CacheStatistics): void {
    this.statsHistory.push({
      timestamp: Date.now(),
      stats
    })

    // 保持历史记录大小限制
    if (this.statsHistory.length > this.maxHistorySize) {
      this.statsHistory.shift()
    }
  }

  /**
   * 获取历史统计
   */
  getStatsHistory(): Array<{ timestamp: number; stats: CacheStatistics }> {
    return [...this.statsHistory]
  }

  /**
   * 开始监控
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring()
    }

    this.monitoringInterval = window.setInterval(async () => {
      try {
        await this.getComprehensiveStats()
      } catch (error) {
        console.error('缓存监控失败:', error)
      }
    }, intervalMs)
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  /**
   * 清除历史记录
   */
  clearHistory(): void {
    this.statsHistory = []
  }

  /**
   * 重置缓存统计信息
   * @param dataSource 数据源名称
   */
  async resetStats(dataSource?: string): Promise<ResetResult> {
    try {
      // 如果没有提供数据源，使用当前数据源
      const currentDataSource =
        dataSource || localStorage.getItem('preferredDataSource') || 'tushare'

      const response = await axios.post(
        `${API_URL}/cache-stats/reset`,
        { dataSource: currentDataSource },
        getAuthHeaders()
      )
      return response.data
    } catch (error: any) {
      console.error('重置缓存统计信息失败:', error)
      throw new Error(error.response?.data?.message || '重置缓存统计信息失败')
    }
  }

  /**
   * 格式化命中率
   * @param hitRate 命中率字符串
   */
  formatHitRate(hitRate: string): string {
    // 移除百分号并转换为数字
    const rate = parseFloat(hitRate.replace('%', ''))

    // 根据命中率返回不同的颜色类名
    if (rate >= 90) return 'excellent'
    if (rate >= 70) return 'good'
    if (rate >= 50) return 'average'
    if (rate >= 30) return 'poor'
    return 'critical'
  }

  /**
   * 格式化日期
   * @param dateString 日期字符串
   */
  formatDate(dateString: string): string {
    if (!dateString) return '未知'

    try {
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch (e) {
      return dateString
    }
  }

  /**
   * 计算时间差
   * @param dateString 日期字符串
   */
  getTimeDiff(dateString: string): string {
    if (!dateString) return '未知'

    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()

      // 转换为秒
      const diffSec = Math.floor(diffMs / 1000)

      if (diffSec < 60) {
        return `${diffSec}秒前`
      }

      // 转换为分钟
      const diffMin = Math.floor(diffSec / 60)

      if (diffMin < 60) {
        return `${diffMin}分钟前`
      }

      // 转换为小时
      const diffHour = Math.floor(diffMin / 60)

      if (diffHour < 24) {
        return `${diffHour}小时前`
      }

      // 转换为天
      const diffDay = Math.floor(diffHour / 24)

      if (diffDay < 30) {
        return `${diffDay}天前`
      }

      // 转换为月
      const diffMonth = Math.floor(diffDay / 30)

      if (diffMonth < 12) {
        return `${diffMonth}个月前`
      }

      // 转换为年
      const diffYear = Math.floor(diffMonth / 12)

      return `${diffYear}年前`
    } catch (e) {
      return '未知'
    }
  }
}

// 创建缓存统计服务实例
export const cacheStatsService = new CacheStatsService()

// 导出服务
export default cacheStatsService
