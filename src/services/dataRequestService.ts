/**
 * 数据请求优化服务
 * 提供智能批处理、请求合并、速率限制和并行请求优化
 */

import axios from 'axios'
import { getAuthHeaders } from '@/utils/auth'

// API基础URL
const API_URL = '/api/v1/data-source-management'

// 批处理请求选项接口
export interface BatchRequestOptions {
    maxBatchSize?: number
    minBatchWait?: number
    maxBatchWait?: number
    timeout?: number
    retryCount?: number
    retryDelay?: number
}

// 并行请求选项接口
export interface ParallelRequestOptions {
    maxConcurrent?: number
    timeout?: number
    retryCount?: number
    retryDelay?: number
    priorityFn?: (item: any) => number
}

// 请求优化器统计信息接口
export interface RequestOptimizerStats {
    totalRequests: number
    batchedRequests: number
    throttledRequests: number
    parallelRequests: number
    successfulRequests: number
    failedRequests: number
    averageResponseTime: number
    batchStats: {
        totalBatches: number
        averageBatchSize: number
        maxBatchSize: number
    }
    sourceStats: Record<string, {
        totalRequests: number
        batchedRequests: number
        throttledRequests: number
        successfulRequests: number
        failedRequests: number
        averageResponseTime: number
    }>
    timestamp: number
}

// 数据请求优化服务类
class DataRequestService {
    /**
     * 执行批处理请求
     * @param source 数据源名称
     * @param method 方法名称
     * @param params 请求参数数组
     * @param options 选项
     */
    async executeBatchRequest<T>(
        source: string,
        method: string,
        params: any[],
        options: BatchRequestOptions = {}
    ): Promise<T[]> {
        try {
            const response = await axios.post(
                `${API_URL}/test-batch`,
                { source, method, params, options },
                getAuthHeaders()
            )
            return response.data.data
        } catch (error: any) {
            console.error('批处理请求失败:', error)
            throw new Error(error.response?.data?.message || '批处理请求失败')
        }
    }

    /**
     * 执行并行请求
     * @param source 数据源名称
     * @param method 方法名称
     * @param params 请求参数数组
     * @param options 选项
     */
    async executeParallelRequest<T>(
        source: string,
        method: string,
        params: any[],
        options: ParallelRequestOptions = {}
    ): Promise<T[]> {
        try {
            const response = await axios.post(
                `${API_URL}/test-parallel`,
                { source, method, params, options },
                getAuthHeaders()
            )
            return response.data.data
        } catch (error: any) {
            console.error('并行请求失败:', error)
            throw new Error(error.response?.data?.message || '并行请求失败')
        }
    }

    /**
     * 测试故障转移
     * @param method 方法名称
     * @param params 请求参数
     * @param sources 数据源列表
     */
    async testFailover<T>(method: string, params: any = {}, sources?: string[]): Promise<T> {
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
     * 获取请求优化器统计信息
     */
    async getRequestOptimizerStats(): Promise<RequestOptimizerStats> {
        try {
            const response = await axios.get(`${API_URL}/request-optimizer-stats`, getAuthHeaders())
            return response.data.data
        } catch (error: any) {
            console.error('获取请求优化器统计信息失败:', error)
            throw new Error(error.response?.data?.message || '获取请求优化器统计信息失败')
        }
    }

    /**
     * 重置请求优化器统计信息
     */
    async resetRequestOptimizerStats(): Promise<void> {
        try {
            await axios.post(`${API_URL}/reset-request-optimizer-stats`, {}, getAuthHeaders())
        } catch (error: any) {
            console.error('重置请求优化器统计信息失败:', error)
            throw new Error(error.response?.data?.message || '重置请求优化器统计信息失败')
        }
    }

    /**
     * 智能批处理股票数据请求
     * 将多个股票代码的请求合并为一个批处理请求
     * @param method 方法名称
     * @param symbols 股票代码数组
     * @param source 数据源名称
     */
    async batchStockRequest<T>(
        method: string,
        symbols: string[],
        source: string = 'tushare'
    ): Promise<Record<string, T>> {
        try {
            // 执行批处理请求
            const results = await this.executeBatchRequest<{ symbol: string; data: T }>(
                source,
                method,
                symbols.map(symbol => ({ symbol }))
            )

            // 将结果转换为以股票代码为键的对象
            const resultMap: Record<string, T> = {}
            results.forEach(item => {
                if (item && item.symbol) {
                    resultMap[item.symbol] = item.data
                }
            })

            return resultMap
        } catch (error) {
            console.error(`批处理股票数据请求失败 (${method}):`, error)
            throw error
        }
    }

    /**
     * 智能并行处理历史数据请求
     * 并行获取多个股票的历史数据
     * @param symbols 股票代码数组
     * @param params 请求参数
     * @param source 数据源名称
     */
    async parallelHistoryRequest<T>(
        symbols: string[],
        params: any = {},
        source: string = 'tushare'
    ): Promise<Record<string, T>> {
        try {
            // 为每个股票创建请求参数
            const requestParams = symbols.map(symbol => ({
                symbol,
                ...params
            }))

            // 执行并行请求
            const results = await this.executeParallelRequest<{ symbol: string; data: T }>(
                source,
                'getHistory',
                requestParams,
                {
                    maxConcurrent: 5,
                    retryCount: 2
                }
            )

            // 将结果转换为以股票代码为键的对象
            const resultMap: Record<string, T> = {}
            results.forEach(item => {
                if (item && item.symbol) {
                    resultMap[item.symbol] = item.data
                }
            })

            return resultMap
        } catch (error) {
            console.error('并行历史数据请求失败:', error)
            throw error
        }
    }

    /**
     * 格式化统计信息
     * @param stats 统计信息
     */
    formatStats(stats: RequestOptimizerStats): Record<string, string | number> {
        return {
            totalRequests: stats.totalRequests,
            successRate: `${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2)}%`,
            averageResponseTime: `${stats.averageResponseTime.toFixed(2)}ms`,
            batchEfficiency: `${((stats.batchedRequests / stats.totalRequests) * 100).toFixed(2)}%`,
            throttleRate: `${((stats.throttledRequests / stats.totalRequests) * 100).toFixed(2)}%`,
            averageBatchSize: stats.batchStats.averageBatchSize.toFixed(2),
            lastUpdated: new Date(stats.timestamp).toLocaleString()
        }
    }
}

// 创建数据请求优化服务实例
export const dataRequestService = new DataRequestService()

// 导出服务
export default dataRequestService