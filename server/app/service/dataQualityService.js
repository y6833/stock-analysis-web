'use strict'

const Service = require('egg').Service

/**
 * 数据质量服务
 * 集成数据验证和转换功能，提供统一的数据处理接口
 */
class DataQualityService extends Service {
  /**
   * 验证模式定义
   * 包含各种数据类型的验证规则
   */
  get validationSchemas() {
    return {
      // 股票行情数据验证模式
      stockQuote: {
        symbol: {
          pattern: /^[A-Za-z0-9.]{1,20}$/,
          required: true,
          errorMessage: '无效的股票代码格式',
        },
        name: {
          type: 'string',
          required: true,
          errorMessage: '股票名称是必填字段',
        },
        price: {
          type: 'number',
          min: 0,
          required: true,
          errorMessage: '价格必须是大于等于0的数字',
        },
        change: {
          type: 'number',
          required: false,
        },
        changePercent: {
          type: 'number',
          min: -100,
          max: 100,
          required: false,
        },
        volume: {
          type: 'number',
          min: 0,
          required: false,
        },
        amount: {
          type: 'number',
          min: 0,
          required: false,
        },
        date: {
          required: false,
        },
        timestamp: {
          required: false,
        },
      },
      // 股票历史数据验证模式
      stockHistory: {
        symbol: {
          pattern: /^[A-Za-z0-9.]{1,20}$/,
          required: true,
          errorMessage: '无效的股票代码格式',
        },
        date: {
          pattern: /^\d{4}-\d{2}-\d{2}$/,
          required: true,
          errorMessage: '无效的日期格式，应为YYYY-MM-DD',
        },
        open: {
          type: 'number',
          min: 0,
          required: true,
          errorMessage: '开盘价必须是大于等于0的数字',
        },
        high: {
          type: 'number',
          min: 0,
          required: true,
          errorMessage: '最高价必须是大于等于0的数字',
        },
        low: {
          type: 'number',
          min: 0,
          required: true,
          errorMessage: '最低价必须是大于等于0的数字',
        },
        close: {
          type: 'number',
          min: 0,
          required: true,
          errorMessage: '收盘价必须是大于等于0的数字',
        },
        volume: {
          type: 'number',
          min: 0,
          required: false,
        },
        amount: {
          type: 'number',
          min: 0,
          required: false,
        },
        adjustedClose: {
          type: 'number',
          min: 0,
          required: false,
        },
      },
      // 股票基本信息验证模式
      stockInfo: {
        symbol: {
          pattern: /^[A-Za-z0-9.]{1,20}$/,
          required: true,
          errorMessage: '无效的股票代码格式',
        },
        name: {
          type: 'string',
          required: true,
          errorMessage: '股票名称是必填字段',
        },
        industry: {
          type: 'string',
          required: false,
        },
        area: {
          type: 'string',
          required: false,
        },
        market: {
          type: 'string',
          required: false,
        },
        listDate: {
          required: false,
        },
        exchange: {
          type: 'string',
          required: false,
        },
      },
    }
  }

  /**
   * 处理数据（验证、质量检查和转换）
   * @param {Object} data - 要处理的数据
   * @param {String} dataType - 数据类型
   * @param {String} source - 数据源
   * @param {Object} options - 选项
   * @returns {Object} 处理结果
   */
  async processData(data, dataType, source, options = {}) {
    const { ctx, app } = this
    const { dataValidator, dataTransformer } = app

    // 获取验证模式
    const schema = this.validationSchemas[dataType]
    if (!schema) {
      return {
        success: false,
        error: `未找到数据类型 ${dataType} 的验证模式`,
      }
    }

    try {
      // 步骤1：数据验证和质量检查
      const validationResult = await dataValidator.processData(
        data,
        schema,
        dataType,
        source,
        options
      )

      // 如果验证失败且配置为严格模式，则返回错误
      if (!validationResult.success && options.strict) {
        return validationResult
      }

      // 步骤2：数据转换
      const transformResult = await dataTransformer.transformData(
        validationResult.data || data,
        dataType,
        source,
        options
      )

      // 合并验证和转换结果
      return {
        success: transformResult.success,
        data: transformResult.data,
        validation: validationResult,
        issues: validationResult.issues || null,
        error: transformResult.error || null,
      }
    } catch (error) {
      ctx.logger.error(`[DataQualityService] 处理数据失败: ${error.message}`, error)
      return {
        success: false,
        data,
        error: error.message,
      }
    }
  }

  /**
   * 批量处理数据
   * @param {Array} dataArray - 要处理的数据数组
   * @param {String} dataType - 数据类型
   * @param {String} source - 数据源
   * @param {Object} options - 选项
   * @returns {Object} 处理结果
   */
  async processBatchData(dataArray, dataType, source, options = {}) {
    const { ctx, app } = this
    const { dataValidator, dataTransformer } = app

    // 获取验证模式
    const schema = this.validationSchemas[dataType]
    if (!schema) {
      return {
        success: false,
        error: `未找到数据类型 ${dataType} 的验证模式`,
      }
    }

    try {
      // 步骤1：批量数据验证和质量检查
      const validationResult = await dataValidator.processBatchData(
        dataArray,
        schema,
        dataType,
        source,
        options
      )

      // 步骤2：批量数据转换
      const transformResult = await dataTransformer.transformBatchData(
        validationResult.data || dataArray,
        dataType,
        source,
        options
      )

      // 合并验证和转换结果
      return {
        success: transformResult.success,
        data: transformResult.data,
        validation: validationResult,
        transformation: transformResult,
        stats: {
          total: dataArray.length,
          validPassed: validationResult.stats.success,
          validFailed: validationResult.stats.failure,
          transformSuccess: transformResult.stats.success,
          transformFailure: transformResult.stats.failure,
          finalSuccess: transformResult.stats.success,
        },
      }
    } catch (error) {
      ctx.logger.error(`[DataQualityService] 批量处理数据失败: ${error.message}`, error)
      return {
        success: false,
        data: dataArray,
        error: error.message,
      }
    }
  }

  /**
   * 获取数据质量统计信息
   * @returns {Object} 统计信息
   */
  async getStats() {
    const { app } = this
    const { dataValidator, dataTransformer } = app

    return {
      validation: dataValidator.getStats(),
      transformation: dataTransformer.getStats(),
      timestamp: Date.now(),
    }
  }

  /**
   * 重置统计信息
   */
  async resetStats() {
    const { app } = this
    const { dataValidator, dataTransformer } = app

    dataValidator.resetStats()
    dataTransformer.resetStats()

    return {
      success: true,
      message: '数据质量统计信息已重置',
    }
  }
}

module.exports = DataQualityService
