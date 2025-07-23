/**
 * 数据源服务
 * 提供数据源管理和监控功能
 */

import axios from 'axios'
import { getAuthHeaders } from '@/utils/auth'
import { dataRequestService } from './dataRequestService'

// API基础URL
const API_URL = '/api/v1/data-source-management'

// 数据源配置接口
export interface DataSourceConfig {
    priority: number
    reliability: number
    performance: number
    costPerRequest: number
    enabled: boolean
}

// 数据源健康状态接口
export interface DataSourceHealth {
    isHealthy: boolean
    lastCheck: string | null
    consecutiveFailures: number
    consecutiveSuccesses: number
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    averageResponseTime: number
    lastError: {
        time: string
        message: string
        stack: string | null
    } | null
    lastSuccess: string | null
    status: 'available' | 'unavailable' | 'disabled'
}

// 数据源优先级接口
export interface DataSourcePriority {
    name: string
    score: number
    health: string
}

// 数据源评分历史接口
export interface ScoreHistoryItem {
    timestamp: number
    score: number
}

// 故障转移配置接口
export interface FailoverConfig {
    enabled: boolean
    maxRetries: number
    retryDelay: number
    healthCheckInterval: number
    recoveryThreshold: number
    failureThreshold: number
    timeoutThreshold: number
}

// 健康检查结果接口
export interface HealthCheckResult {
    timestamp: number
    results: Record<string, {
        success: boolean
        responseTime: number
        health: string
        error: string | null
    }>
}

// 数据源服务类
class DataSourceService {
    /**
     * 获取所有数据源配置
     */
    async getDataSources(): Promise<Record<string, DataSourceConfig>> {
        try {
            const response = await axios.get(`${API_URL}/sources`, getAuthHeaders())
            return response.data.data
        } catch (error: any) {
            console.error('获取数据源配置失败:', error)
            throw new Error(error.response?.data?.message || '获取数据源配置失败')
        }
    }

    /**
     * 获取数据源健康状态
     */
    async getHealth(): Promise<Record<string, DataSourceHealth>> {
        try {
            const response = await axios.get(`${API_URL}/health`, getAuthHeaders())
            return response.data.data
        } catch (error: any) {
            console.error('获取数据源健康状态失败:', error)
            throw new Error(error.response?.data?.message || '获取数据源健康状态失败')
        }
    }

    /**
     * 执行数据源健康检查
     * @param source 可选的数据源名称
     */
    async checkHealth(source?: string): Promise<HealthCheckResult> {
        try {
            const response = await axios.post(
                `${API_URL}/check-health`,
                { source },
                getAuthHeaders()
            )
            return response.data.data
        } catch (error: any) {
            console.error('健康检查失败:', error)
            throw new Error(error.response?.data?.message || '健康检查失败')
        }
    }

    /**
     * 获取数据源优先级
     */
    async getPriority(): Promise<DataSourcePriority[]> {
        try {
            const response = await axios.get(`${API_URL}/priority`, getAuthHeaders())
            return response.data.data
        } catch (error: any) {
            console.error('获取数据源优先级失败:', error)
            throw new Error(error.response?.data?.message || '获取数据源优先级失败')
        }
    }

    /**
     * 获取最佳数据源
     * @param sources 可选的数据源列表
     */
    async getBestDataSource(sources?: string[]): Promise<{
        source: string
        score: number
        health: DataSourceHealth
    }> {
        try {
            const queryParams = sources ? `?sources=${sources.join(',')}` : ''
            const response = await axios.get(`${API_URL}/best-source${queryParams}`, getAuthHeaders())
            return response.data.data
        } catch (error: any) {
            console.error('获取最佳数据源失败:', error)
            throw new Error(error.response?.data?.message || '获取最佳数据源失败')
        }
    }

    /**
     * 获取数据源评分历史
     * @param source 数据源名称
     */
    async getScoreHistory(source: string): Promise<ScoreHistoryItem[]> {
        try {
            const response = await axios.get(
                `${API_URL}/score-history?source=${source}`,
                getAuthHeaders()
            )
            return response.data.data
        } catch (error: any) {
            console.error('获取数据源评分历史失败:', error)
            throw new Error(error.response?.data?.message || '获取数据源评分历史失败')
        }
    }

    /**
     * 更新数据源配置
     * @param source 数据源名称
     * @param config 数据源配置
     */
    async updateDataSourceConfig(
        source: string,
        config: Partial<DataSourceConfig>
    ): Promise<DataSourceConfig> {
        try {
            const response = await axios.put(
                `${API_URL}/source-config`,
                { source, config },
                getAuthHeaders()
            )
            return response.data.data
        } catch (error: any) {
            console.error('更新数据源配置失败:', error)
            throw new Error(error.response?.data?.message || '更新数据源配置失败')
        }
    }

    /**
     * 启用/禁用数据源
     * @param source 数据源名称
     * @param enabled 是否启用
     */
    async toggleDataSource(source: string, enabled: boolean): Promise<{
        source: string
        enabled: boolean
        config: DataSourceConfig
        health: DataSourceHealth
    }> {
        try {
            const response = await axios.post(
                `${API_URL}/toggle-source`,
                { source, enabled },
                getAuthHeaders()
            )
            return response.data.data
        } catch (error: any) {
            console.error('切换数据源状态失败:', error)
            throw new Error(error.response?.data?.message || '切换数据源状态失败')
        }
    }

    /**
     * 重置数据源健康状态
     * @param source 数据源名称
     */
    async resetDataSourceHealth(source: string): Promise<DataSourceHealth> {
        try {
            const response = await axios.post(
                `${API_URL}/reset-health`,
                { source },
                getAuthHeaders()
            )
            return response.data.data
        } catch (error: any) {
            console.error('重置数据源健康状态失败:', error)
            throw new Error(error.response?.data?.message || '重置数据源健康状态失败')
        }
    }

    /**
     * 获取故障转移配置
     */
    async getFailoverConfig(): Promise<FailoverConfig> {
        try {
            const response = await axios.get(`${API_URL}/failover-config`, getAuthHeaders())
            return response.data.data
        } catch (error: any) {
            console.error('获取故障转移配置失败:', error)
            throw new Error(error.response?.data?.message || '获取故障转移配置失败')
        }
    }

    /**
     * 更新故障转移配置
     * @param config 故障转移配置
     */
    async updateFailoverConfig(config: Partial<FailoverConfig>): Promise<FailoverConfig> {
        try {
            const response = await axios.put(
                `${API_URL}/failover-config`,
                { config },
                getAuthHeaders()
            )
            return response.data.data
        } catch (error: any) {
            console.error('更新故障转移配置失败:', error)
            throw new Error(error.response?.data?.message || '更新故障转移配置失败')
        }
    }

    /**
     * 测试数据源故障转移
     * @param method 方法名称
     * @param params 方法参数
     * @param sources 数据源列表
     */
    async testFailover(
        method: string,
        params: Record<string, any> = {},
        sources?: string[]
    ): Promise<any> {
        try {
            const response = await axios.post(
                `${API_URL}/test-failover`,
                { method, params, sources },
                getAuthHeaders()
            )
            return response.data.data
        } catch (error: any) {
            console.error('故障转移测试失败:', error)
            throw new Error(error.response?.data?.message || '故障转移测试失败')
        }
    }

    /**
     * 格式化健康状态
     * @param status 健康状态
     */
    formatHealthStatus(status: string): string {
        switch (status) {
            case 'available':
                return '可用'
            case 'unavailable':
                return '不可用'
            case 'disabled':
                return '已禁用'
            default:
                return '未知'
        }
    }

    /**
     * 获取健康状态类名
     * @param status 健康状态
     */
    getHealthStatusClass(status: string): string {
        switch (status) {
            case 'available':
                return 'success'
            case 'unavailable':
                return 'danger'
            case 'disabled':
                return 'warning'
            default:
                return 'info'
        }
    }

    /**
     * 格式化日期
     * @param dateString 日期字符串
     */
    formatDate(dateString: string | null): string {
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
    getTimeDiff(dateString: string | null): string {
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

    /**
     * 批量获取股票数据
     * 将多个股票代码的请求合并为一个批处理请求
     * @param method 方法名称
     * @param symbols 股票代码数组
     * @param source 数据源名称
     */
    async batchGetStockData<T>(
        method: string,
        symbols: string[],
        source: string = 'tushare'
    ): Promise<Record<string, T>> {
        return dataRequestService.batchStockRequest<T>(method, symbols, source)
    }

    /**
     * 批量获取股票行情
     * @param symbols 股票代码数组
     * @param source 数据源名称
     */
    async batchGetQuotes<T>(symbols: string[], source: string = 'tushare'): Promise<Record<string, T>> {
        return this.batchGetStockData<T>('getQuote', symbols, source)
    }

    /**
     * 并行获取多个股票的历史数据
     * @param symbols 股票代码数组
     * @param params 请求参数
     * @param source 数据源名称
     */
    async parallelGetHistory<T>(
        symbols: string[],
        params: any = {},
        source: string = 'tushare'
    ): Promise<Record<string, T>> {
        return dataRequestService.parallelHistoryRequest<T>(symbols, params, source)
    }

    /**
     * 获取请求优化器统计信息
     */
    async getRequestOptimizerStats(): Promise<any> {
        return dataRequestService.getRequestOptimizerStats()
    }

    /**
     * 重置请求优化器统计信息
     */
    async resetRequestOptimizerStats(): Promise<void> {
        return dataRequestService.resetRequestOptimizerStats()
    }

    /**
     * 测试批处理请求
     * @param source 数据源名称
     * @param method 方法名称
     * @param params 请求参数数组
     * @param options 选项
     */
    async testBatchRequest<T>(
        source: string,
        method: string,
        params: any[],
        options: any = {}
    ): Promise<T[]> {
        return dataRequestService.executeBatchRequest<T>(source, method, params, options)
    }

    /**
     * 测试并行请求
     * @param source 数据源名称
     * @param method 方法名称
     * @param params 请求参数数组
     * @param options 选项
     */
    async testParallelRequest<T>(
        source: string,
        method: string,
        params: any[],
        options: any = {}
    ): Promise<T[]> {
        return dataRequestService.executeParallelRequest<T>(source, method, params, options)
    }
}

// 创建数据源服务实例
export const dataSourceService = new DataSourceService()

// 导出服务
export default dataSourceService