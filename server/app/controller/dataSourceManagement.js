'use strict'

const Controller = require('egg').Controller

/**
 * 数据源管理控制器
 * 提供数据源管理和监控的API接口
 */
class DataSourceManagementController extends Controller {
  /**
   * 获取所有数据源配置
   */
  async getDataSources() {
    const { ctx } = this

    try {
      const dataSourceManager = ctx.app.dataSourceManager

      if (!dataSourceManager) {
        ctx.body = {
          success: false,
          message: '数据源管理器不可用',
          error: 'Data source manager not available',
        }
        return
      }

      const sources = dataSourceManager.getDataSources()
      const result = {}

      for (const source of sources) {
        result[source] = dataSourceManager.getDataSourceConfig(source)
      }

      ctx.body = {
        success: true,
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[DataSourceManagement] 获取数据源配置失败:', error)
      ctx.body = {
        success: false,
        message: '获取数据源配置失败',
        error: error.message,
      }
    }
  }

  /**
   * 获取数据源健康状态
   */
  async getHealth() {
    const { ctx } = this

    try {
      const dataSourceManager = ctx.app.dataSourceManager

      if (!dataSourceManager) {
        ctx.body = {
          success: false,
          message: '数据源管理器不可用',
          error: 'Data source manager not available',
        }
        return
      }

      const health = dataSourceManager.getAllDataSourceHealth()

      ctx.body = {
        success: true,
        data: health,
      }
    } catch (error) {
      ctx.logger.error('[DataSourceManagement] 获取数据源健康状态失败:', error)
      ctx.body = {
        success: false,
        message: '获取数据源健康状态失败',
        error: error.message,
      }
    }
  }

  /**
   * 执行数据源健康检查
   */
  async checkHealth() {
    const { ctx } = this

    try {
      const dataSourceManager = ctx.app.dataSourceManager

      if (!dataSourceManager) {
        ctx.body = {
          success: false,
          message: '数据源管理器不可用',
          error: 'Data source manager not available',
        }
        return
      }

      const { source } = ctx.request.body

      const result = await dataSourceManager.checkHealth(source)

      ctx.body = {
        success: true,
        message: '健康检查完成',
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[DataSourceManagement] 健康检查失败:', error)
      ctx.body = {
        success: false,
        message: '健康检查失败',
        error: error.message,
      }
    }
  }

  /**
   * 获取数据源优先级
   */
  async getPriority() {
    const { ctx } = this

    try {
      const dataSourceManager = ctx.app.dataSourceManager

      if (!dataSourceManager) {
        ctx.body = {
          success: false,
          message: '数据源管理器不可用',
          error: 'Data source manager not available',
        }
        return
      }

      const priority = dataSourceManager.getDataSourcePriority()

      ctx.body = {
        success: true,
        data: priority,
      }
    } catch (error) {
      ctx.logger.error('[DataSourceManagement] 获取数据源优先级失败:', error)
      ctx.body = {
        success: false,
        message: '获取数据源优先级失败',
        error: error.message,
      }
    }
  }

  /**
   * 获取最佳数据源
   */
  async getBestDataSource() {
    const { ctx } = this

    try {
      const dataSourceManager = ctx.app.dataSourceManager

      if (!dataSourceManager) {
        ctx.body = {
          success: false,
          message: '数据源管理器不可用',
          error: 'Data source manager not available',
        }
        return
      }

      const { sources } = ctx.request.query
      const requiredSources = sources ? sources.split(',') : null

      const bestSource = dataSourceManager.getBestDataSource(requiredSources)

      ctx.body = {
        success: true,
        data: {
          source: bestSource,
          score: bestSource ? dataSourceManager.calculateScore(bestSource) : 0,
          health: bestSource ? dataSourceManager.getDataSourceHealth(bestSource) : null,
        },
      }
    } catch (error) {
      ctx.logger.error('[DataSourceManagement] 获取最佳数据源失败:', error)
      ctx.body = {
        success: false,
        message: '获取最佳数据源失败',
        error: error.message,
      }
    }
  }

  /**
   * 获取数据源评分历史
   */
  async getScoreHistory() {
    const { ctx } = this

    try {
      const dataSourceManager = ctx.app.dataSourceManager

      if (!dataSourceManager) {
        ctx.body = {
          success: false,
          message: '数据源管理器不可用',
          error: 'Data source manager not available',
        }
        return
      }

      const { source } = ctx.request.query

      if (!source) {
        ctx.body = {
          success: false,
          message: '请提供数据源名称',
          error: 'Source name required',
        }
        return
      }

      const history = dataSourceManager.getScoreHistory(source)

      ctx.body = {
        success: true,
        data: history,
      }
    } catch (error) {
      ctx.logger.error('[DataSourceManagement] 获取数据源评分历史失败:', error)
      ctx.body = {
        success: false,
        message: '获取数据源评分历史失败',
        error: error.message,
      }
    }
  }

  /**
   * 更新数据源配置
   */
  async updateDataSourceConfig() {
    const { ctx } = this

    try {
      const dataSourceManager = ctx.app.dataSourceManager

      if (!dataSourceManager) {
        ctx.body = {
          success: false,
          message: '数据源管理器不可用',
          error: 'Data source manager not available',
        }
        return
      }

      const { source, config } = ctx.request.body

      if (!source || !config) {
        ctx.body = {
          success: false,
          message: '请提供数据源名称和配置',
          error: 'Source name and config required',
        }
        return
      }

      // 更新配置
      dataSourceManager.dataSources[source] = {
        ...dataSourceManager.dataSources[source],
        ...config,
      }

      ctx.body = {
        success: true,
        message: '数据源配置已更新',
        data: dataSourceManager.dataSources[source],
      }
    } catch (error) {
      ctx.logger.error('[DataSourceManagement] 更新数据源配置失败:', error)
      ctx.body = {
        success: false,
        message: '更新数据源配置失败',
        error: error.message,
      }
    }
  }

  /**
   * 启用/禁用数据源
   */
  async toggleDataSource() {
    const { ctx } = this

    try {
      const dataSourceManager = ctx.app.dataSourceManager

      if (!dataSourceManager) {
        ctx.body = {
          success: false,
          message: '数据源管理器不可用',
          error: 'Data source manager not available',
        }
        return
      }

      const { source, enabled } = ctx.request.body

      if (!source || enabled === undefined) {
        ctx.body = {
          success: false,
          message: '请提供数据源名称和启用状态',
          error: 'Source name and enabled status required',
        }
        return
      }

      // 更新启用状态
      if (dataSourceManager.dataSources[source]) {
        dataSourceManager.dataSources[source].enabled = enabled

        // 更新健康状态
        if (dataSourceManager.healthStatus[source]) {
          dataSourceManager.healthStatus[source].status = enabled ? 'available' : 'disabled'
          dataSourceManager.healthStatus[source].isHealthy = enabled
        }
      }

      ctx.body = {
        success: true,
        message: `数据源 ${source} 已${enabled ? '启用' : '禁用'}`,
        data: {
          source,
          enabled,
          config: dataSourceManager.dataSources[source],
          health: dataSourceManager.healthStatus[source],
        },
      }
    } catch (error) {
      ctx.logger.error('[DataSourceManagement] 切换数据源状态失败:', error)
      ctx.body = {
        success: false,
        message: '切换数据源状态失败',
        error: error.message,
      }
    }
  }

  /**
   * 重置数据源健康状态
   */
  async resetDataSourceHealth() {
    const { ctx } = this

    try {
      const dataSourceManager = ctx.app.dataSourceManager

      if (!dataSourceManager) {
        ctx.body = {
          success: false,
          message: '数据源管理器不可用',
          error: 'Data source manager not available',
        }
        return
      }

      const { source } = ctx.request.body

      if (!source) {
        ctx.body = {
          success: false,
          message: '请提供数据源名称',
          error: 'Source name required',
        }
        return
      }

      // 重置健康状态
      if (dataSourceManager.healthStatus[source]) {
        const enabled = dataSourceManager.dataSources[source]?.enabled || false
        dataSourceManager.healthStatus[source] = {
          isHealthy: enabled,
          lastCheck: new Date(),
          consecutiveFailures: 0,
          consecutiveSuccesses: 0,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          lastError: null,
          lastSuccess: null,
          status: enabled ? 'available' : 'disabled',
        }
      }

      ctx.body = {
        success: true,
        message: `数据源 ${source} 健康状态已重置`,
        data: dataSourceManager.healthStatus[source],
      }
    } catch (error) {
      ctx.logger.error('[DataSourceManagement] 重置数据源健康状态失败:', error)
      ctx.body = {
        success: false,
        message: '重置数据源健康状态失败',
        error: error.message,
      }
    }
  }

  /**
   * 更新故障转移配置
   */
  async updateFailoverConfig() {
    const { ctx } = this

    try {
      const dataSourceManager = ctx.app.dataSourceManager

      if (!dataSourceManager) {
        ctx.body = {
          success: false,
          message: '数据源管理器不可用',
          error: 'Data source manager not available',
        }
        return
      }

      const { config } = ctx.request.body

      if (!config) {
        ctx.body = {
          success: false,
          message: '请提供故障转移配置',
          error: 'Failover config required',
        }
        return
      }

      // 更新故障转移配置
      dataSourceManager.failoverConfig = {
        ...dataSourceManager.failoverConfig,
        ...config,
      }

      // 如果健康检查间隔发生变化，重启健康检查
      if (config.healthCheckInterval !== undefined) {
        dataSourceManager.stopHealthCheck()
        if (dataSourceManager.failoverConfig.enabled) {
          dataSourceManager.startHealthCheck()
        }
      }

      ctx.body = {
        success: true,
        message: '故障转移配置已更新',
        data: dataSourceManager.failoverConfig,
      }
    } catch (error) {
      ctx.logger.error('[DataSourceManagement] 更新故障转移配置失败:', error)
      ctx.body = {
        success: false,
        message: '更新故障转移配置失败',
        error: error.message,
      }
    }
  }

  /**
   * 获取故障转移配置
   */
  async getFailoverConfig() {
    const { ctx } = this

    try {
      const dataSourceManager = ctx.app.dataSourceManager

      if (!dataSourceManager) {
        ctx.body = {
          success: false,
          message: '数据源管理器不可用',
          error: 'Data source manager not available',
        }
        return
      }

      ctx.body = {
        success: true,
        data: dataSourceManager.failoverConfig,
      }
    } catch (error) {
      ctx.logger.error('[DataSourceManagement] 获取故障转移配置失败:', error)
      ctx.body = {
        success: false,
        message: '获取故障转移配置失败',
        error: error.message,
      }
    }
  }

  /**
   * 测试数据源故障转移
   */
  async testFailover() {
    const { ctx } = this

    try {
      const dataSourceManager = ctx.app.dataSourceManager

      if (!dataSourceManager) {
        ctx.body = {
          success: false,
          message: '数据源管理器不可用',
          error: 'Data source manager not available',
        }
        return
      }

      const { method, params = {}, sources } = ctx.request.body

      if (!method) {
        ctx.body = {
          success: false,
          message: '请提供要测试的方法名称',
          error: 'Method name required',
        }
        return
      }

      // 创建请求函数
      const requestFn = async (source) => {
        const service = dataSourceManager.getDataSourceService(source)
        if (!service || typeof service[method] !== 'function') {
          throw new Error(`数据源 ${source} 不支持方法 ${method}`)
        }
        return await service[method](params)
      }

      // 执行带故障转移的请求
      const result = await dataSourceManager.executeWithFailover(requestFn, sources)

      ctx.body = {
        success: true,
        message: '故障转移测试成功',
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[DataSourceManagement] 故障转移测试失败:', error)
      ctx.body = {
        success: false,
        message: '故障转移测试失败',
        error: error.message,
      }
    }
  }

  /**
   * 测试批处理请求
   */
  async testBatchRequest() {
    const { ctx } = this

    try {
      const dataSourceManager = ctx.app.dataSourceManager

      if (!dataSourceManager) {
        ctx.body = {
          success: false,
          message: '数据源管理器不可用',
          error: 'Data source manager not available',
        }
        return
      }

      const { source, method, params = [], options = {} } = ctx.request.body

      if (!source || !method || !Array.isArray(params)) {
        ctx.body = {
          success: false,
          message: '请提供数据源、方法名称和参数数组',
          error: 'Source, method and params array required',
        }
        return
      }

      // 执行批处理请求
      const result = await dataSourceManager.executeBatchRequest(source, method, params, options)

      ctx.body = {
        success: true,
        message: '批处理请求测试成功',
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[DataSourceManagement] 批处理请求测试失败:', error)
      ctx.body = {
        success: false,
        message: '批处理请求测试失败',
        error: error.message,
      }
    }
  }

  /**
   * 测试并行请求
   */
  async testParallelRequest() {
    const { ctx } = this

    try {
      const dataSourceManager = ctx.app.dataSourceManager

      if (!dataSourceManager) {
        ctx.body = {
          success: false,
          message: '数据源管理器不可用',
          error: 'Data source manager not available',
        }
        return
      }

      const { source, method, params = [], options = {} } = ctx.request.body

      if (!source || !method || !Array.isArray(params)) {
        ctx.body = {
          success: false,
          message: '请提供数据源、方法名称和参数数组',
          error: 'Source, method and params array required',
        }
        return
      }

      // 执行并行请求
      const result = await dataSourceManager.executeParallelRequests(
        source,
        method,
        params,
        options
      )

      ctx.body = {
        success: true,
        message: '并行请求测试成功',
        data: result,
      }
    } catch (error) {
      ctx.logger.error('[DataSourceManagement] 并行请求测试失败:', error)
      ctx.body = {
        success: false,
        message: '并行请求测试失败',
        error: error.message,
      }
    }
  }

  /**
   * 获取请求优化器统计信息
   */
  async getRequestOptimizerStats() {
    const { ctx } = this

    try {
      const dataSourceManager = ctx.app.dataSourceManager

      if (!dataSourceManager) {
        ctx.body = {
          success: false,
          message: '数据源管理器不可用',
          error: 'Data source manager not available',
        }
        return
      }

      const stats = dataSourceManager.getRequestOptimizerStats()

      ctx.body = {
        success: true,
        data: stats,
      }
    } catch (error) {
      ctx.logger.error('[DataSourceManagement] 获取请求优化器统计信息失败:', error)
      ctx.body = {
        success: false,
        message: '获取请求优化器统计信息失败',
        error: error.message,
      }
    }
  }

  /**
   * 重置请求优化器统计信息
   */
  async resetRequestOptimizerStats() {
    const { ctx } = this

    try {
      const dataSourceManager = ctx.app.dataSourceManager

      if (!dataSourceManager) {
        ctx.body = {
          success: false,
          message: '数据源管理器不可用',
          error: 'Data source manager not available',
        }
        return
      }

      dataSourceManager.resetRequestOptimizerStats()

      ctx.body = {
        success: true,
        message: '请求优化器统计信息已重置',
      }
    } catch (error) {
      ctx.logger.error('[DataSourceManagement] 重置请求优化器统计信息失败:', error)
      ctx.body = {
        success: false,
        message: '重置请求优化器统计信息失败',
        error: error.message,
      }
    }
  }
}

module.exports = DataSourceManagementController
