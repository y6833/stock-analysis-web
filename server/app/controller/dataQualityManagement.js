'use strict'

const Controller = require('egg').Controller

/**
 * 数据质量管理控制器
 * 提供数据验证和转换的API接口
 */
class DataQualityManagementController extends Controller {
  /**
   * 验证数据
   */
  async validateData() {
    const { ctx } = this

    try {
      const { data, dataType, source, options = {} } = ctx.request.body

      if (!data || !dataType) {
        ctx.body = {
          success: false,
          message: '请提供数据和数据类型',
          error: 'Data and dataType are required',
        }
        return
      }

      const dataValidator = ctx.app.dataValidator
      if (!dataValidator) {
        ctx.body = {
          success: false,
          message: '数据验证器不可用',
          error: 'Data validator not available',
        }
        return
      }

      // 获取验证模式
      const schema = ctx.service.dataQualityService.validationSchemas[dataType]
      if (!schema) {
        ctx.body = {
          success: false,
          message: `未找到数据类型 ${dataType} 的验证模式`,
          error: `Validation schema not found for dataType: ${dataType}`,
        }
        return
      }

      // 执行数据验证
      const result = await dataValidator.processData(
        data,
        schema,
        dataType,
        source || 'unknown',
        options
      )

      ctx.body = {
        success: true,
        message: result.success ? '数据验证通过' : '数据验证失败',
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[DataQualityManagement] 验证数据失败:', error)
      ctx.body = {
        success: false,
        message: '验证数据失败',
        error: error.message,
      }
    }
  }

  /**
   * 批量验证数据
   */
  async validateBatchData() {
    const { ctx } = this

    try {
      const { dataArray, dataType, source, options = {} } = ctx.request.body

      if (!dataArray || !Array.isArray(dataArray) || !dataType) {
        ctx.body = {
          success: false,
          message: '请提供数据数组和数据类型',
          error: 'DataArray and dataType are required',
        }
        return
      }

      const dataValidator = ctx.app.dataValidator
      if (!dataValidator) {
        ctx.body = {
          success: false,
          message: '数据验证器不可用',
          error: 'Data validator not available',
        }
        return
      }

      // 获取验证模式
      const schema = ctx.service.dataQualityService.validationSchemas[dataType]
      if (!schema) {
        ctx.body = {
          success: false,
          message: `未找到数据类型 ${dataType} 的验证模式`,
          error: `Validation schema not found for dataType: ${dataType}`,
        }
        return
      }

      // 执行批量数据验证
      const result = await dataValidator.processBatchData(
        dataArray,
        schema,
        dataType,
        source || 'unknown',
        options
      )

      ctx.body = {
        success: true,
        message: `批量验证完成，成功: ${result.stats.success}，失败: ${result.stats.failure}`,
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[DataQualityManagement] 批量验证数据失败:', error)
      ctx.body = {
        success: false,
        message: '批量验证数据失败',
        error: error.message,
      }
    }
  }

  /**
   * 转换数据
   */
  async transformData() {
    const { ctx } = this

    try {
      const { data, dataType, source, options = {} } = ctx.request.body

      if (!data || !dataType || !source) {
        ctx.body = {
          success: false,
          message: '请提供数据、数据类型和数据源',
          error: 'Data, dataType and source are required',
        }
        return
      }

      const dataTransformer = ctx.app.dataTransformer
      if (!dataTransformer) {
        ctx.body = {
          success: false,
          message: '数据转换器不可用',
          error: 'Data transformer not available',
        }
        return
      }

      // 执行数据转换
      const result = await dataTransformer.transformData(data, dataType, source, options)

      ctx.body = {
        success: true,
        message: result.success ? '数据转换成功' : '数据转换失败',
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[DataQualityManagement] 转换数据失败:', error)
      ctx.body = {
        success: false,
        message: '转换数据失败',
        error: error.message,
      }
    }
  }

  /**
   * 批量转换数据
   */
  async transformBatchData() {
    const { ctx } = this

    try {
      const { dataArray, dataType, source, options = {} } = ctx.request.body

      if (!dataArray || !Array.isArray(dataArray) || !dataType || !source) {
        ctx.body = {
          success: false,
          message: '请提供数据数组、数据类型和数据源',
          error: 'DataArray, dataType and source are required',
        }
        return
      }

      const dataTransformer = ctx.app.dataTransformer
      if (!dataTransformer) {
        ctx.body = {
          success: false,
          message: '数据转换器不可用',
          error: 'Data transformer not available',
        }
        return
      }

      // 执行批量数据转换
      const result = await dataTransformer.transformBatchData(dataArray, dataType, source, options)

      ctx.body = {
        success: true,
        message: `批量转换完成，成功: ${result.stats.success}，失败: ${result.stats.failure}`,
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[DataQualityManagement] 批量转换数据失败:', error)
      ctx.body = {
        success: false,
        message: '批量转换数据失败',
        error: error.message,
      }
    }
  }

  /**
   * 处理数据（验证和转换）
   */
  async processData() {
    const { ctx } = this

    try {
      const { data, dataType, source, options = {} } = ctx.request.body

      if (!data || !dataType || !source) {
        ctx.body = {
          success: false,
          message: '请提供数据、数据类型和数据源',
          error: 'Data, dataType and source are required',
        }
        return
      }

      // 执行数据处理
      const result = await ctx.service.dataQualityService.processData(
        data,
        dataType,
        source,
        options
      )

      ctx.body = {
        success: true,
        message: result.success ? '数据处理成功' : '数据处理失败',
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[DataQualityManagement] 处理数据失败:', error)
      ctx.body = {
        success: false,
        message: '处理数据失败',
        error: error.message,
      }
    }
  }

  /**
   * 批量处理数据
   */
  async processBatchData() {
    const { ctx } = this

    try {
      const { dataArray, dataType, source, options = {} } = ctx.request.body

      if (!dataArray || !Array.isArray(dataArray) || !dataType || !source) {
        ctx.body = {
          success: false,
          message: '请提供数据数组、数据类型和数据源',
          error: 'DataArray, dataType and source are required',
        }
        return
      }

      // 执行批量数据处理
      const result = await ctx.service.dataQualityService.processBatchData(
        dataArray,
        dataType,
        source,
        options
      )

      ctx.body = {
        success: true,
        message: `批量处理完成，成功: ${result.stats.finalSuccess}，失败: ${
          dataArray.length - result.stats.finalSuccess
        }`,
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[DataQualityManagement] 批量处理数据失败:', error)
      ctx.body = {
        success: false,
        message: '批量处理数据失败',
        error: error.message,
      }
    }
  }

  /**
   * 获取数据质量统计信息
   */
  async getStats() {
    const { ctx } = this

    try {
      const stats = await ctx.service.dataQualityService.getStats()

      ctx.body = {
        success: true,
        data: stats,
      }
    } catch (error) {
      ctx.logger.error('[DataQualityManagement] 获取数据质量统计信息失败:', error)
      ctx.body = {
        success: false,
        message: '获取数据质量统计信息失败',
        error: error.message,
      }
    }
  }

  /**
   * 重置数据质量统计信息
   */
  async resetStats() {
    const { ctx } = this

    try {
      const result = await ctx.service.dataQualityService.resetStats()

      ctx.body = {
        success: true,
        message: '数据质量统计信息已重置',
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[DataQualityManagement] 重置数据质量统计信息失败:', error)
      ctx.body = {
        success: false,
        message: '重置数据质量统计信息失败',
        error: error.message,
      }
    }
  }

  /**
   * 获取验证模式
   */
  async getValidationSchemas() {
    const { ctx } = this

    try {
      const schemas = ctx.service.dataQualityService.validationSchemas

      ctx.body = {
        success: true,
        data: schemas,
      }
    } catch (error) {
      ctx.logger.error('[DataQualityManagement] 获取验证模式失败:', error)
      ctx.body = {
        success: false,
        message: '获取验证模式失败',
        error: error.message,
      }
    }
  }
}

module.exports = DataQualityManagementController
