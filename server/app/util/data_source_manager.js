'use strict'

/**
 * 数据源管理器
 * 提供数据源优先级、评分和故障转移功能
 */
class DataSourceManager {
  constructor(app) {
    this.app = app
    this.logger = app.logger
    this.config = app.config.dataSource || {}
    this.cacheManager = app.cacheManager

    // 数据源配置
    this.dataSources = this.config.sources || {
      tushare: {
        priority: 100,
        reliability: 0.95,
        performance: 0.9,
        costPerRequest: 1.0,
        enabled: true,
      },
      akshare: {
        priority: 90,
        reliability: 0.9,
        performance: 0.85,
        costPerRequest: 0.5,
        enabled: true,
      },
      sina: {
        priority: 80,
        reliability: 0.8,
        performance: 0.95,
        costPerRequest: 0.0,
        enabled: true,
      },
      eastmoney: {
        priority: 70,
        reliability: 0.85,
        performance: 0.8,
        costPerRequest: 0.0,
        enabled: true,
      },
      netease: {
        priority: 60,
        reliability: 0.75,
        performance: 0.75,
        costPerRequest: 0.0,
        enabled: true,
      },
      tencent: {
        priority: 50,
        reliability: 0.7,
        performance: 0.7,
        costPerRequest: 0.0,
        enabled: true,
      },
      yahoo_finance: {
        priority: 40,
        reliability: 0.6,
        performance: 0.6,
        costPerRequest: 0.0,
        enabled: true,
      },
      alltick: {
        priority: 30,
        reliability: 0.5,
        performance: 0.5,
        costPerRequest: 2.0,
        enabled: true,
      },
      juhe: {
        priority: 20,
        reliability: 0.4,
        performance: 0.4,
        costPerRequest: 0.1,
        enabled: true,
      },
      zhitu: {
        priority: 10,
        reliability: 0.3,
        performance: 0.3,
        costPerRequest: 0.2,
        enabled: true,
      },
    }

    // 数据源健康状态
    this.healthStatus = {}

    // 数据源评分历史
    this.scoreHistory = {}

    // 故障转移配置
    this.failoverConfig = this.config.failover || {
      enabled: true,
      maxRetries: 3,
      retryDelay: 1000,
      healthCheckInterval: 5 * 60 * 1000, // 5分钟
      recoveryThreshold: 3, // 连续成功次数阈值
      failureThreshold: 3, // 连续失败次数阈值
      timeoutThreshold: 10000, // 超时阈值（毫秒）
    }

    // 数据请求优化配置
    this.requestOptimizerConfig = this.config.requestOptimizer || {
      batchingEnabled: true, // 启用批处理
      throttlingEnabled: true, // 启用节流
      parallelEnabled: true, // 启用并行请求优化
      adaptiveEnabled: true, // 启用自适应优化
    }

    // 初始化数据源健康状态
    this.initHealthStatus()
  }

  /**
   * 初始化数据源健康状态
   */
  initHealthStatus() {
    for (const [source, config] of Object.entries(this.dataSources)) {
      this.healthStatus[source] = {
        isHealthy: config.enabled,
        lastCheck: null,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        lastError: null,
        lastSuccess: null,
        status: config.enabled ? 'available' : 'disabled',
      }

      this.scoreHistory[source] = []
    }
  }

  /**
   * 获取数据源列表
   * @returns {Array} 数据源列表
   */
  getDataSources() {
    return Object.keys(this.dataSources).filter((source) => this.dataSources[source].enabled)
  }

  /**
   * 获取数据源配置
   * @param {String} source 数据源名称
   * @returns {Object} 数据源配置
   */
  getDataSourceConfig(source) {
    return this.dataSources[source] || null
  }

  /**
   * 获取数据源健康状态
   * @param {String} source 数据源名称
   * @returns {Object} 数据源健康状态
   */
  getDataSourceHealth(source) {
    return this.healthStatus[source] || null
  }

  /**
   * 获取所有数据源健康状态
   * @returns {Object} 所有数据源健康状态
   */
  getAllDataSourceHealth() {
    return this.healthStatus
  }

  /**
   * 计算数据源评分
   * 基于可靠性、性能、优先级和健康状态
   * @param {String} source 数据源名称
   * @returns {Number} 评分（0-100）
   */
  calculateScore(source) {
    const config = this.dataSources[source]
    const health = this.healthStatus[source]

    if (!config || !config.enabled || !health || health.status === 'disabled') {
      return 0
    }

    // 如果数据源不健康，大幅降低评分
    if (health.status === 'unavailable') {
      return config.priority * 0.1
    }

    // 基础评分 = 优先级（40%）+ 可靠性（30%）+ 性能（30%）
    let score =
      config.priority * 0.4 + config.reliability * 100 * 0.3 + config.performance * 100 * 0.3

    // 根据健康状态调整评分
    if (health.totalRequests > 0) {
      const successRate = health.successfulRequests / health.totalRequests

      // 成功率低于80%时，降低评分
      if (successRate < 0.8) {
        score *= successRate
      }

      // 响应时间超过5秒，降低评分
      if (health.averageResponseTime > 5000) {
        score *= 5000 / health.averageResponseTime
      }

      // 连续失败次数影响
      if (health.consecutiveFailures > 0) {
        score *= Math.pow(0.9, health.consecutiveFailures)
      }
    }

    // 确保评分在0-100之间
    return Math.max(0, Math.min(100, score))
  }

  /**
   * 获取最佳数据源
   * @param {Array} requiredSources 可选的数据源列表，如果不提供则使用所有可用数据源
   * @returns {String} 最佳数据源名称
   */
  getBestDataSource(requiredSources = null) {
    const sources = requiredSources || this.getDataSources()

    let bestSource = null
    let bestScore = -1

    for (const source of sources) {
      const score = this.calculateScore(source)

      if (score > bestScore) {
        bestScore = score
        bestSource = source
      }
    }

    return bestSource
  }

  /**
   * 获取数据源优先级列表
   * 按评分从高到低排序
   * @param {Array} requiredSources 可选的数据源列表，如果不提供则使用所有可用数据源
   * @returns {Array} 数据源优先级列表
   */
  getDataSourcePriority(requiredSources = null) {
    const sources = requiredSources || this.getDataSources()

    return sources
      .map((source) => ({
        name: source,
        score: this.calculateScore(source),
        health: this.healthStatus[source].status,
      }))
      .sort((a, b) => b.score - a.score)
  }

  /**
   * 记录数据源请求结果
   * @param {String} source 数据源名称
   * @param {Boolean} success 是否成功
   * @param {Number} responseTime 响应时间（毫秒）
   * @param {Error} error 错误信息（如果失败）
   */
  recordRequestResult(source, success, responseTime = 0, error = null) {
    if (!this.healthStatus[source]) {
      this.healthStatus[source] = {
        isHealthy: true,
        lastCheck: null,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        lastError: null,
        lastSuccess: null,
        status: 'available',
      }
    }

    const health = this.healthStatus[source]

    // 更新请求统计
    health.totalRequests++

    if (success) {
      health.successfulRequests++
      health.consecutiveSuccesses++
      health.consecutiveFailures = 0
      health.lastSuccess = new Date()

      // 更新平均响应时间
      health.averageResponseTime =
        (health.averageResponseTime * (health.successfulRequests - 1) + responseTime) /
        health.successfulRequests

      // 如果之前不健康，检查是否恢复
      if (
        health.status === 'unavailable' &&
        health.consecutiveSuccesses >= this.failoverConfig.recoveryThreshold
      ) {
        health.status = 'available'
        health.isHealthy = true
        this.logger.info(`[DataSourceManager] 数据源 ${source} 已恢复可用`)
      }
    } else {
      health.failedRequests++
      health.consecutiveFailures++
      health.consecutiveSuccesses = 0
      health.lastError = {
        time: new Date(),
        message: error ? error.message : 'Unknown error',
        stack: error ? error.stack : null,
      }

      // 检查是否需要标记为不可用
      if (
        health.status === 'available' &&
        health.consecutiveFailures >= this.failoverConfig.failureThreshold
      ) {
        health.status = 'unavailable'
        health.isHealthy = false
        this.logger.warn(
          `[DataSourceManager] 数据源 ${source} 已标记为不可用，连续失败 ${health.consecutiveFailures} 次`
        )
      }
    }

    // 更新最后检查时间
    health.lastCheck = new Date()

    // 记录评分历史
    this.recordScoreHistory(source)

    return health
  }

  /**
   * 记录评分历史
   * @param {String} source 数据源名称
   */
  recordScoreHistory(source) {
    if (!this.scoreHistory[source]) {
      this.scoreHistory[source] = []
    }

    const score = this.calculateScore(source)

    this.scoreHistory[source].push({
      timestamp: Date.now(),
      score,
    })

    // 保留最近100条记录
    if (this.scoreHistory[source].length > 100) {
      this.scoreHistory[source].shift()
    }
  }

  /**
   * 获取评分历史
   * @param {String} source 数据源名称
   * @returns {Array} 评分历史
   */
  getScoreHistory(source) {
    return this.scoreHistory[source] || []
  }

  /**
   * 执行数据源健康检查
   * @param {String} source 数据源名称，如果不提供则检查所有数据源
   * @returns {Object} 健康检查结果
   */
  async checkHealth(source = null) {
    const sources = source ? [source] : this.getDataSources()
    const results = {}

    for (const src of sources) {
      try {
        const startTime = Date.now()

        // 调用数据源的测试接口
        const service = this.getDataSourceService(src)
        let success = false
        let responseTime = 0
        let error = null

        if (!service) {
          error = new Error(`数据源服务 ${src} 不存在`)
          success = false
        } else if (typeof service.test !== 'function') {
          error = new Error(`数据源服务 ${src} 没有 test 方法`)
          success = false
        } else {
          try {
            await service.test()
            success = true
          } catch (err) {
            error = err
            success = false
          } finally {
            responseTime = Date.now() - startTime
          }
        } else {
          error = new Error(`数据源 ${src} 不存在或没有测试方法`)
          success = false
          responseTime = 0
        }

        // 记录结果
        const health = this.recordRequestResult(src, success, responseTime, error)

        results[src] = {
          success,
          responseTime,
          health: health.status,
          error: error ? error.message : null,
        }
      } catch (err) {
        this.logger.error(`[DataSourceManager] 检查数据源 ${src} 健康状态失败:`, err)
        results[src] = {
          success: false,
          responseTime: 0,
          health: 'error',
          error: err.message,
        }
      }
    }

    return {
      timestamp: Date.now(),
      results,
    }
  }

  /**
   * 获取数据源服务
   * @param {String} source 数据源名称
   * @returns {Object} 数据源服务
   */
  getDataSourceService(source) {
    const serviceMap = {
      tushare: this.app.service.tushare,
      akshare: this.app.service.akshare,
      sina: this.app.service.sina,
      eastmoney: this.app.service.eastmoney,
      netease: this.app.service.netease,
      tencent: this.app.service.tencent,
      yahoo_finance: this.app.service.yahooFinance,
      alltick: this.app.service.alltick,
      juhe: this.app.service.juhe,
      zhitu: this.app.service.zhitu,
    }

    return serviceMap[source] || null
  }

  /**
   * 启动定期健康检查
   */
  startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        this.logger.info('[DataSourceManager] 执行定期数据源健康检查')
        await this.checkHealth()
      } catch (error) {
        this.logger.error('[DataSourceManager] 定期健康检查失败:', error)
      }
    }, this.failoverConfig.healthCheckInterval)

    this.logger.info(
      `[DataSourceManager] 已启动定期健康检查，间隔 ${
        this.failoverConfig.healthCheckInterval / 1000
      } 秒`
    )
  }

  /**
   * 停止定期健康检查
   */
  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
      this.logger.info('[DataSourceManager] 已停止定期健康检查')
    }
  }

  /**
   * 使用故障转移机制执行数据源请求
   * @param {Function} requestFn 请求函数，接受数据源名称作为参数
   * @param {Array} sources 数据源优先级列表，如果不提供则自动计算
   * @param {Object} options 选项
   * @returns {Promise<*>} 请求结果
   */
  async executeWithFailover(requestFn, sources = null, options = {}) {
    const {
      maxRetries = this.failoverConfig.maxRetries,
      retryDelay = this.failoverConfig.retryDelay,
      timeout = this.failoverConfig.timeoutThreshold,
      requireFresh = false,
      cacheKey = null,
      cacheNamespace = null,
      cacheTTL = null,
      useThrottling = this.requestOptimizerConfig.throttlingEnabled,
    } = options

    // 如果提供了缓存键，尝试从缓存获取
    if (cacheKey && cacheNamespace && !requireFresh && this.cacheManager) {
      try {
        const cachedData = await this.cacheManager.get(cacheNamespace, cacheKey)
        if (cachedData !== null) {
          return {
            success: true,
            data: cachedData,
            source: 'cache',
            fromCache: true,
          }
        }
      } catch (error) {
        this.logger.warn(
          `[DataSourceManager] 从缓存获取数据失败 (${cacheNamespace}:${cacheKey}):`,
          error
        )
      }
    }

    // 获取数据源优先级列表
    const dataSourcePriority = sources || this.getDataSourcePriority().map((s) => s.name)

    if (dataSourcePriority.length === 0) {
      throw new Error('没有可用的数据源')
    }

    let lastError = null

    // 按优先级尝试每个数据源
    for (const source of dataSourcePriority) {
      // 跳过不健康的数据源
      const health = this.healthStatus[source]
      if (health && health.status === 'unavailable' && !options.forceUseUnhealthy) {
        continue
      }

      let retries = 0

      while (retries <= maxRetries) {
        try {
          const startTime = Date.now()
          let result

          // 如果启用了节流，使用请求优化器执行请求
          if (useThrottling && this.requestOptimizer) {
            // 创建一个包装函数，将请求函数包装为接受参数的形式
            const wrappedFn = async () => requestFn(source)
            result = await this.requestOptimizer.executeWithThrottle(source, 'custom', wrappedFn)
          } else {
            // 设置超时
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error(`请求超时 (${timeout}ms)`)), timeout)
            })

            // 执行请求
            const resultPromise = requestFn(source)

            // 使用Promise.race实现超时
            result = await Promise.race([resultPromise, timeoutPromise])
          }

          const responseTime = Date.now() - startTime

          // 记录成功
          this.recordRequestResult(source, true, responseTime)

          // 如果提供了缓存键，将结果存入缓存
          if (cacheKey && cacheNamespace && this.cacheManager) {
            try {
              await this.cacheManager.set(cacheNamespace, cacheKey, result, cacheTTL, {
                source,
                timestamp: Date.now(),
              })
            } catch (error) {
              this.logger.warn(
                `[DataSourceManager] 缓存数据失败 (${cacheNamespace}:${cacheKey}):`,
                error
              )
            }
          }

          return {
            success: true,
            data: result,
            source,
            responseTime,
            fromCache: false,
          }
        } catch (error) {
          const responseTime = Date.now() - startTime

          // 记录失败
          this.recordRequestResult(source, false, responseTime, error)

          lastError = error
          retries++

          this.logger.warn(
            `[DataSourceManager] 数据源 ${source} 请求失败 (重试 ${retries}/${maxRetries}):`,
            error
          )

          if (retries <= maxRetries) {
            // 等待重试延迟
            await new Promise((resolve) => setTimeout(resolve, retryDelay))
          }
        }
      }
    }

    // 所有数据源都失败了
    throw lastError || new Error('所有数据源请求失败')
  }

  /**
   * 初始化数据源管理器
   */
  async init() {
    this.logger.info('[DataSourceManager] 初始化数据源管理器')

    try {
      // 初始化数据请求优化器
      const DataRequestOptimizer = require('./data_request_optimizer')
      this.requestOptimizer = new DataRequestOptimizer(this.app)
      await this.requestOptimizer.init()

      // 执行初始健康检查
      await this.checkHealth()

      // 启动定期健康检查
      if (this.failoverConfig.enabled) {
        this.startHealthCheck()
      }

      this.logger.info('[DataSourceManager] 数据源管理器初始化完成')
    } catch (error) {
      this.logger.error('[DataSourceManager] 初始化数据源管理器失败:', error)
      throw error
    }
  }

  /**
   * 执行批处理请求
   * 将多个相同类型的请求合并为一个批处理请求
   * @param {String} source 数据源名称
   * @param {String} method 方法名称
   * @param {Array} params 请求参数数组
   * @param {Object} options 选项
   * @returns {Promise<Array>} 批处理结果
   */
  async executeBatchRequest(source, method, params, options = {}) {
    // 如果未启用批处理或请求优化器不可用，则使用并行请求
    if (!this.requestOptimizerConfig.batchingEnabled || !this.requestOptimizer) {
      return this.executeParallelRequests(source, method, params, options)
    }

    try {
      // 如果启用了数据验证和转换
      if (this.app.dataValidator && this.app.dataTransformer && options.validateData) {
        const dataType = options.dataType || 'unknown'
        const dataQualityService = this.app.service.dataQualityService

        // 批量处理数据
        if (dataQualityService) {
          const result = await dataQualityService.processBatchData(params, dataType, source, {
            skipValidation: options.skipValidation,
            skipQualityCheck: options.skipQualityCheck,
            skipStandardization: options.skipStandardization,
            strict: options.strict,
          })

          // 使用处理后的数据
          if (result.success) {
            params = result.data
          } else {
            this.logger.warn(
              `[DataSourceManager] 批量数据处理有问题: ${source}.${method}, 继续使用原始数据`
            )
          }
        }
      }

      return await this.requestOptimizer.batchRequest(source, method, params, options)
    } catch (error) {
      this.logger.error(`[DataSourceManager] 批处理请求失败: ${source}.${method}:`, error)

      // 如果批处理失败，回退到并行请求
      this.logger.info(`[DataSourceManager] 回退到并行请求: ${source}.${method}`)
      return this.executeParallelRequests(source, method, params, options)
    }
  }

  /**
   * 执行并行请求
   * 并行执行多个请求，但控制并发数
   * @param {String} source 数据源名称
   * @param {String} method 方法名称
   * @param {Array} params 请求参数数组
   * @param {Object} options 选项
   * @returns {Promise<Array>} 并行请求结果
   */
  async executeParallelRequests(source, method, params, options = {}) {
    // 如果未启用并行请求优化或请求优化器不可用，则使用普通的Promise.all
    if (!this.requestOptimizerConfig.parallelEnabled || !this.requestOptimizer) {
      const service = this.getDataSourceService(source)

      if (!service || typeof service[method] !== 'function') {
        throw new Error(`数据源 ${source} 不支持方法 ${method}`)
      }

      // 创建请求函数数组
      const requestFunctions = params.map((param) => async () => {
        return service[method](param)
      })

      // 使用Promise.all执行所有请求
      return Promise.all(requestFunctions.map((fn) => fn()))
    }

    // 获取数据源服务
    const service = this.getDataSourceService(source)

    if (!service || typeof service[method] !== 'function') {
      throw new Error(`数据源 ${source} 不支持方法 ${method}`)
    }

    // 创建请求函数数组
    const requestFunctions = params.map((param) => async () => {
      return service[method](param)
    })

    // 使用请求优化器执行并行请求
    return this.requestOptimizer.executeParallelRequests(requestFunctions, source, options)
  }

  /**
   * 使用节流控制执行请求
   * 控制请求速率，避免过载数据源
   * @param {String} source 数据源名称
   * @param {String} method 方法名称
   * @param {Object} params 请求参数
   * @param {Object} options 选项
   * @returns {Promise<*>} 请求结果
   */
  async executeWithThrottle(source, method, params, options = {}) {
    // 如果未启用节流或请求优化器不可用，则直接执行请求
    if (!this.requestOptimizerConfig.throttlingEnabled || !this.requestOptimizer) {
      const service = this.getDataSourceService(source)

      if (!service || typeof service[method] !== 'function') {
        throw new Error(`数据源 ${source} 不支持方法 ${method}`)
      }

      return service[method](params)
    }

    return this.requestOptimizer.executeWithThrottle(source, method, params, options)
  }

  /**
   * 获取请求优化器统计信息
   * @returns {Object} 统计信息
   */
  getRequestOptimizerStats() {
    if (!this.requestOptimizer) {
      return {
        enabled: false,
        message: '请求优化器未初始化',
      }
    }

    return this.requestOptimizer.getStats()
  }

  /**
   * 重置请求优化器统计信息
   */
  resetRequestOptimizerStats() {
    if (this.requestOptimizer) {
      this.requestOptimizer.resetStats()
    }
  }

  /**
   * 关闭数据源管理器
   */
  async shutdown() {
    this.logger.info('[DataSourceManager] 关闭数据源管理器')

    // 停止定期健康检查
    this.stopHealthCheck()

    // 关闭请求优化器
    if (this.requestOptimizer) {
      await this.requestOptimizer.shutdown()
    }
  }
}

module.exports = DataSourceManager
