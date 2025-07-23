/**
 * 数据验证服务
 * 提供前端数据验证和转换功能
 */

import axios from 'axios'
import { getAuthHeaders } from '@/utils/auth'

// API基础URL
const API_URL = '/api/v1/data-quality'

// 数据处理选项接口
export interface DataProcessingOptions {
    skipValidation?: boolean
    skipQualityCheck?: boolean
    skipStandardization?: boolean
    skipFieldMapping?: boolean
    skipTypeConversion?: boolean
    strict?: boolean
    throwOnError?: boolean
}

// 验证结果接口
export interface ValidationResult {
    valid: boolean
    data: any
    errors?: Array<{
        field: string
        error: string
        valid: boolean
    }> | null
}

// 质量检查结果接口
export interface QualityCheckResult {
    passed: boolean
    issues?: Array<{
        type: string
        message: string
        field?: string
        fields?: string[]
        value?: any
        values?: any[]
    }> | null
    data: any
}

// 转换结果接口
export interface TransformationResult {
    success: boolean
    data: any
    error?: string
}

// 处理结果接口
export interface ProcessingResult {
    success: boolean
    data: any
    issues?: any[] | null
    validation?: ValidationResult
    quality?: QualityCheckResult
    error?: string
}

// 批处理结果接口
export interface BatchProcessingResult {
    success: boolean
    data: any[]
    stats: {
        total: number
        validPassed?: number
        validFailed?: number
        transformSuccess?: number
        transformFailure?: number
        finalSuccess: number
    }
    failedItems?: Array<{
        index: number
        data: any
        issues?: any[]
        error?: string
    }> | null
    validation?: any
    transformation?: any
}

// 统计信息接口
export interface StatsResult {
    validation: {
        totalValidations: number
        passedValidations: number
        failedValidations: number
        qualityChecks: number
        qualityIssuesDetected: number
        bySource: Record<string, any>
        timestamp: number
    }
    transformation: {
        totalTransformations: number
        successfulTransformations: number
        failedTransformations: number
        byType: Record<string, any>
        bySource: Record<string, any>
        timestamp: number
    }
    timestamp: number
}

// 数据验证服务类
class DataValidationService {
    /**
     * 验证数据
     * @param {any} data - 要验证的数据
     * @param {string} dataType - 数据类型
     * @param {string} source - 数据源
     * @param {DataProcessingOptions} options - 选项
     * @returns {Promise<ValidationResult>} 验证结果
     */
    async validateData(
        data: any,
        dataType: string,
        source?: string,
        options: DataProcessingOptions = {}
    ): Promise<ValidationResult> {
        try {
            const response = await axios.post(
                `${API_URL}/validate`,
                { data, dataType, source, options },
                getAuthHeaders()
            )
            return response.data.data
        } catch (error: any) {
            console.error('数据验证失败:', error)
            throw new Error(error.response?.data?.message || '数据验证失败')
        }
    }

    /**
     * 批量验证数据
     * @param {any[]} dataArray - 要验证的数据数组
     * @param {string} dataType - 数据类型
     * @param {string} source - 数据源
     * @param {DataProcessingOptions} options - 选项
     * @returns {Promise<BatchProcessingResult>} 批量验证结果
     */
    async validateBatchData(
        dataArray: any[],
        dataType: string,
        source?: string,
        options: DataProcessingOptions = {}
    ): Promise<BatchProcessingResult> {
        try {
            const response = await axios.post(
                `${API_URL}/validate-batch`,
                { dataArray, dataType, source, options },
                getAuthHeaders()
            )
            return response.data.data
        } catch (error: any) {
            console.error('批量数据验证失败:', error)
            throw new Error(error.response?.data?.message || '批量数据验证失败')
        }
    }

    /**
     * 转换数据
     * @param {any} data - 要转换的数据
     * @param {string} dataType - 数据类型
     * @param {string} source - 数据源
     * @param {DataProcessingOptions} options - 选项
     * @returns {Promise<TransformationResult>} 转换结果
     */
    async transformData(
        data: any,
        dataType: string,
        source: string,
        options: DataProcessingOptions = {}
    ): Promise<TransformationResult> {
        try {
            const response = await axios.post(
                `${API_URL}/transform`,
                { data, dataType, source, options },
                getAuthHeaders()
            )
            return response.data.data
        } catch (error: any) {
            console.error('数据转换失败:', error)
            throw new Error(error.response?.data?.message || '数据转换失败')
        }
    }

    /**
     * 批量转换数据
     * @param {any[]} dataArray - 要转换的数据数组
     * @param {string} dataType - 数据类型
     * @param {string} source - 数据源
     * @param {DataProcessingOptions} options - 选项
     * @returns {Promise<BatchProcessingResult>} 批量转换结果
     */
    async transformBatchData(
        dataArray: any[],
        dataType: string,
        source: string,
        options: DataProcessingOptions = {}
    ): Promise<BatchProcessingResult> {
        try {
            const response = await axios.post(
                `${API_URL}/transform-batch`,
                { dataArray, dataType, source, options },
                getAuthHeaders()
            )
            return response.data.data
        } catch (error: any) {
            console.error('批量数据转换失败:', error)
            throw new Error(error.response?.data?.message || '批量数据转换失败')
        }
    }

    /**
     * 处理数据（验证和转换）
     * @param {any} data - 要处理的数据
     * @param {string} dataType - 数据类型
     * @param {string} source - 数据源
     * @param {DataProcessingOptions} options - 选项
     * @returns {Promise<ProcessingResult>} 处理结果
     */
    async processData(
        data: any,
        dataType: string,
        source: string,
        options: DataProcessingOptions = {}
    ): Promise<ProcessingResult> {
        try {
            const response = await axios.post(
                `${API_URL}/process`,
                { data, dataType, source, options },
                getAuthHeaders()
            )
            return response.data.data
        } catch (error: any) {
            console.error('数据处理失败:', error)
            throw new Error(error.response?.data?.message || '数据处理失败')
        }
    }

    /**
     * 批量处理数据
     * @param {any[]} dataArray - 要处理的数据数组
     * @param {string} dataType - 数据类型
     * @param {string} source - 数据源
     * @param {DataProcessingOptions} options - 选项
     * @returns {Promise<BatchProcessingResult>} 批量处理结果
     */
    async processBatchData(
        dataArray: any[],
        dataType: string,
        source: string,
        options: DataProcessingOptions = {}
    ): Promise<BatchProcessingResult> {
        try {
            const response = await axios.post(
                `${API_URL}/process-batch`,
                { dataArray, dataType, source, options },
                getAuthHeaders()
            )
            return response.data.data
        } catch (error: any) {
            console.error('批量数据处理失败:', error)
            throw new Error(error.response?.data?.message || '批量数据处理失败')
        }
    }

    /**
     * 获取数据质量统计信息
     * @returns {Promise<StatsResult>} 统计信息
     */
    async getStats(): Promise<StatsResult> {
        try {
            const response = await axios.get(`${API_URL}/stats`, getAuthHeaders())
            return response.data.data
        } catch (error: any) {
            console.error('获取数据质量统计信息失败:', error)
            throw new Error(error.response?.data?.message || '获取数据质量统计信息失败')
        }
    }

    /**
     * 重置数据质量统计信息
     * @returns {Promise<void>}
     */
    async resetStats(): Promise<void> {
        try {
            await axios.post(`${API_URL}/reset-stats`, {}, getAuthHeaders())
        } catch (error: any) {
            console.error('重置数据质量统计信息失败:', error)
            throw new Error(error.response?.data?.message || '重置数据质量统计信息失败')
        }
    }

    /**
     * 获取验证模式
     * @returns {Promise<Record<string, any>>} 验证模式
     */
    async getValidationSchemas(): Promise<Record<string, any>> {
        try {
            const response = await axios.get(`${API_URL}/schemas`, getAuthHeaders())
            return response.data.data
        } catch (error: any) {
            console.error('获取验证模式失败:', error)
            throw new Error(error.response?.data?.message || '获取验证模式失败')
        }
    }

    /**
     * 格式化验证错误
     * @param {ValidationResult} result - 验证结果
     * @returns {string[]} 格式化的错误消息
     */
    formatValidationErrors(result: ValidationResult): string[] {
        if (!result.errors || result.errors.length === 0) {
            return []
        }

        return result.errors.map(error => `${error.field}: ${error.error}`)
    }

    /**
     * 格式化质量问题
     * @param {QualityCheckResult} result - 质量检查结果
     * @returns {string[]} 格式化的问题消息
     */
    formatQualityIssues(result: QualityCheckResult): string[] {
        if (!result.issues || result.issues.length === 0) {
            return []
        }

        return result.issues.map(issue => {
            if (issue.field) {
                return `${issue.type} - ${issue.message} (字段: ${issue.field})`
            } else if (issue.fields) {
                return `${issue.type} - ${issue.message} (字段: ${issue.fields.join(', ')})`
            } else {
                return `${issue.type} - ${issue.message}`
            }
        })
    }

    /**
     * 格式化统计信息
     * @param {StatsResult} stats - 统计信息
     * @returns {Record<string, string | number>} 格式化的统计信息
     */
    formatStats(stats: StatsResult): Record<string, string | number> {
        const validation = stats.validation
        const transformation = stats.transformation

        const validationSuccessRate = validation.totalValidations > 0
            ? ((validation.passedValidations / validation.totalValidations) * 100).toFixed(2)
            : '0.00'

        const transformationSuccessRate = transformation.totalTransformations > 0
            ? ((transformation.successfulTransformations / transformation.totalTransformations) * 100).toFixed(2)
            : '0.00'

        return {
            validationTotal: validation.totalValidations,
            validationPassed: validation.passedValidations,
            validationFailed: validation.failedValidations,
            validationSuccessRate: `${validationSuccessRate}%`,
            qualityChecks: validation.qualityChecks,
            qualityIssues: validation.qualityIssuesDetected,
            transformationTotal: transformation.totalTransformations,
            transformationSuccess: transformation.successfulTransformations,
            transformationFailed: transformation.failedTransformations,
            transformationSuccessRate: `${transformationSuccessRate}%`,
            lastUpdated: new Date(stats.timestamp).toLocaleString()
        }
    }
}

// 创建数据验证服务实例
export const dataValidationService = new DataValidationService()

// 导出服务
export default dataValidationService