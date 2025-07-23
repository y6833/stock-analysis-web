'use strict'

/**
 * 数据请求优化器
 * 提供智能批处理、请求合并、速率限制和并行请求优化
 */
class DataRequestOptimizer {
  constructor(app) {
    this.app = app
    this.logger = app.logger
    this.config = app.config.dataSource || {}
    this.dataSourceManager = app.dataSourceManager
    this.cacheManager = app.cacheManager

    // 批处理队列
    this.batchQueues = new Map()

    // 速率限制配置
    this.rateLimits = this.config.rateLimits || {
      default: {
        maxRequests: 20, // 默认每个数据源每秒最多20个请求
        windowMs: 1000, // 1秒窗口期
        maxBatchSize: 50, // 最大批处理大小
        minBatchWait: 50, // 最小批处理等待时间(ms)
        maxBatchWait: 200, // 最大批处理等待时间(ms)
      },
      // 特定数据源的速率限制
      tushare: {
        maxRequests: 10,
        windowMs: 1000,
        maxBatchSize: 100,
        minBatchWait: 100,
        maxBatchWait: 300,
      },
      akshare: {
        maxRequests: 15,
        windowMs: 1000,
        maxBatchSize: 80,
        minBatchWait: 50,
        maxBatchWait: 200,
      },
      sina: {
        maxRequests: 30,
        windowMs: 1000,
        maxBatchSize: 50,
        minBatchWait: 20,
        maxBatchWait: 100,
      },
      eastmoney: {
        maxRequests: 20,
        windowMs: 1000,
        maxBatchSize: 60,
        minBatchWait: 30,
        maxBatchWait: 150,
      },
      alltick: {
        maxRequests: 5,
        windowMs: 1000,
        maxBatchSize: 20,
        minBatchWait: 200,
        maxBatchWait: 500,
      },
    }

    // 请求计数器
    this.requestCounts = new Map()

    // 并行请求配置
    this.parallelConfig = this.config.parallel || {
      maxConcurrent: 5, // 最大并发请求数
      priorityLevels: 3, // 优先级级别数
      timeout: 10000, // 请求超时时间(ms)
      retryCount: 2, // 重试次数
      retryDelay: 1000, // 重试延迟(ms)
      adaptiveTimeout: true, // 自适应超时
    }

    // 请求统计
    this.stats = {
      totalRequests: 0,
      batchedRequests: 0,
      throttledRequests: 0,
      parallelRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      batchStats: {
        totalBatches: 0,
        averageBatchSize: 0,
        maxBatchSize: 0,
      },
      sourceStats: {},
    }
  }

  /**
   * 初始化请求优化器
   */
  async init() {
    this.logger.info('[DataRequestOptimizer] 初始化数据请求优化器')

    // 初始化数据源统计
    for (const source of Object.keys(this.rateLimits)) {
      this.stats.sourceStats[source] = {
        totalRequests: 0,
        batchedRequests: 0,
        throttledRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
      }
    }

    this.logger.info('[DataRequestOptimizer] 数据请求优化器初始化完成')
  }

  /**
   * 智能批处理请求
   * 将短时间内的相同类型请求合并为一个批处理请求
   * @param {String} source - 数据源名称
   * @param {String} method - 方法名称
   * @param {Array} params - 请求参数数组
   * @param {Object} options - 选项
   * @returns {Promise<Array>} - 批处理结果
   */
  async batchRequest(source, method, params, options = {}) {
    const sourceConfig = this.rateLimits[source] || this.rateLimits.default
    const batchKey = `${source}:${method}`
    const startTime = Date.now()

    // 更新统计信息
    this.stats.totalRequests++
    this.stats.batchedRequests++
    if (this.stats.sourceStats[source]) {
      this.stats.sourceStats[source].totalRequests++
      this.stats.sourceStats[source].batchedRequests++
    }

    // 创建批处理队列（如果不存在）
    if (!this.batchQueues.has(batchKey)) {
      this.batchQueues.set(batchKey, {
        queue: [],
        timer: null,
        processing: false,
      })
    }

    const batchQueue = this.batchQueues.get(batchKey)

    // 创建一个新的请求项
    const requestItem = {
      params,
      resolve: null,
      reject: null,
      options,
      timestamp: Date.now(),
    }

    // 创建一个Promise，在批处理完成时解析
    const promise = new Promise((resolve, reject) => {
      requestItem.resolve = resolve
      requestItem.reject = reject
    })

    // 添加到队列
    batchQueue.queue.push(requestItem)

    // 如果队列长度达到最大批处理大小，立即处理
    if (batchQueue.queue.length >= sourceConfig.maxBatchSize) {
      this.processBatchQueue(source, method, batchKey)
    }
    // 否则设置定时器，在最大等待时间后处理
    else if (!batchQueue.timer) {
      const waitTime = Math.min(
        Math.max(sourceConfig.minBatchWait, batchQueue.queue.length * 10),
        sourceConfig.maxBatchWait
      )

      batchQueue.timer = setTimeout(() => {
        this.processBatchQueue(source, method, batchKey)
      }, waitTime)
    }

    try {
      // 等待批处理完成
      const result = await promise

      // 更新统计信息
      const responseTime = Date.now() - startTime
      this.stats.successfulRequests++
      this.stats.averageResponseTime =
        (this.stats.averageResponseTime * (this.stats.successfulRequests - 1) + responseTime) /
        this.stats.successfulRequests

      if (this.stats.sourceStats[source]) {
        this.stats.sourceStats[source].successfulRequests++
        this.stats.sourceStats[source].averageResponseTime =
          (this.stats.sourceStats[source].averageResponseTime *
            (this.stats.sourceStats[source].successfulRequests - 1) +
            responseTime) /
          this.stats.sourceStats[source].successfulRequests
      }

      return result
    } catch (error) {
      // 更新统计信息
      this.stats.failedRequests++
      if (this.stats.sourceStats[source]) {
        this.stats.sourceStats[source].failedRequests++
      }

      throw error
    }
  }

  /**
   * 处理批处理队列
   * @param {String} source - 数据源名称
   * @param {String} method - 方法名称
   * @param {String} batchKey - 批处理键
   */
  async processBatchQueue(source, method, batchKey) {
    const batchQueue = this.batchQueues.get(batchKey)

    // 如果队列为空或已在处理中，则返回
    if (!batchQueue || batchQueue.queue.length === 0 || batchQueue.processing) {
      return
    }

    // 清除定时器
    if (batchQueue.timer) {
      clearTimeout(batchQueue.timer)
      batchQueue.timer = null
    }

    // 标记为处理中
    batchQueue.processing = true

    // 获取当前队列中的所有请求
    const requests = [...batchQueue.queue]
    batchQueue.queue = []

    // 更新批处理统计信息
    this.stats.batchStats.totalBatches++
    this.stats.batchStats.averageBatchSize =
      (this.stats.batchStats.averageBatchSize * (this.stats.batchStats.totalBatches - 1) +
        requests.length) /
      this.stats.batchStats.totalBatches
    this.stats.batchStats.maxBatchSize = Math.max(
      this.stats.batchStats.maxBatchSize,
      requests.length
    )

    try {
      // 获取数据源服务
      const service = this.dataSourceManager.getDataSourceService(source)

      if (!service || typeof service[method] !== 'function') {
        throw new Error(`数据源 ${source} 不支持方法 ${method}`)
      }

      // 提取所有参数
      const allParams = requests.map((req) => req.params)

      // 检查是否需要应用速率限制
      await this.applyRateLimit(source)

      // 执行批处理请求
      const startTime = Date.now()
      this.logger.info(
        `[DataRequestOptimizer] 执行批处理请求: ${source}.${method}, 批大小: ${requests.length}`
      )

      // 调用批处理方法
      const batchMethodName = `batch${method.charAt(0).toUpperCase() + method.slice(1)}`
      let results

      if (typeof service[batchMethodName] === 'function') {
        // 使用专用批处理方法
        results = await service[batchMethodName](allParams)
      } else {
        // 使用并行请求模拟批处理
        results = await this.executeParallelRequests(
          allParams.map((params) => () => service[method](params)),
          source
        )
      }

      const endTime = Date.now()
      this.logger.info(
        `[DataRequestOptimizer] 批处理请求完成: ${source}.${method}, ` +
          `耗时: ${endTime - startTime}ms, 批大小: ${requests.length}`
      )

      // 记录请求结果
      this.dataSourceManager.recordRequestResult(source, true, endTime - startTime)

      // 解析每个请求的Promise
      for (let i = 0; i < requests.length; i++) {
        const result = Array.isArray(results) ? results[i] : results
        requests[i].resolve(result)
      }
    } catch (error) {
      this.logger.error(
        `[DataRequestOptimizer] 批处理请求失败: ${source}.${method}, ` + `错误: ${error.message}`
      )

      // 记录请求失败
      this.dataSourceManager.recordRequestResult(source, false, 0, error)

      // 拒绝所有请求的Promise
      for (const request of requests) {
        request.reject(error)
      }
    } finally {
      // 标记为处理完成
      batchQueue.processing = false

      // 如果队列中还有请求，继续处理
      if (batchQueue.queue.length > 0) {
        this.processBatchQueue(source, method, batchKey)
      }
    }
  }

  /**
   * 应用速率限制
   * @param {String} source - 数据源名称
   */
  async applyRateLimit(source) {
    const sourceConfig = this.rateLimits[source] || this.rateLimits.default
    const now = Date.now()

    // 获取当前请求计数
    if (!this.requestCounts.has(source)) {
      this.requestCounts.set(source, {
        count: 0,
        resetTime: now + sourceConfig.windowMs,
      })
    }

    const requestCount = this.requestCounts.get(source)

    // 如果已经过了重置时间，重置计数
    if (now >= requestCount.resetTime) {
      requestCount.count = 0
      requestCount.resetTime = now + sourceConfig.windowMs
    }

    // 如果请求数超过限制，等待
    if (requestCount.count >= sourceConfig.maxRequests) {
      const waitTime = requestCount.resetTime - now

      if (waitTime > 0) {
        this.logger.info(
          `[DataRequestOptimizer] 应用速率限制: ${source}, ` +
            `等待 ${waitTime}ms, 当前请求数: ${requestCount.count}/${sourceConfig.maxRequests}`
        )

        // 更新统计信息
        this.stats.throttledRequests++
        if (this.stats.sourceStats[source]) {
          this.stats.sourceStats[source].throttledRequests++
        }

        // 等待直到下一个窗口期
        await new Promise((resolve) => setTimeout(resolve, waitTime))

        // 重置计数
        requestCount.count = 0
        requestCount.resetTime = Date.now() + sourceConfig.windowMs
      }
    }

    // 增加请求计数
    requestCount.count++
  }

  /**
   * 执行并行请求
   * @param {Array<Function>} requestFunctions - 请求函数数组
   * @param {String} source - 数据源名称
   * @param {Object} options - 选项
   * @returns {Promise<Array>} - 并行请求结果
   */
  async executeParallelRequests(requestFunctions, source, options = {}) {
    // 更新统计信息
    this.stats.parallelRequests += requestFunctions.length

    // 如果请求数量为0，返回空数组
    if (requestFunctions.length === 0) {
      return []
    }

    // 如果只有一个请求，直接执行
    if (requestFunctions.length === 1) {
      const result = await requestFunctions[0]()

      // 如果启用了数据验证和转换
      if (this.app.dataValidator && this.app.dataTransformer && options.validateData) {
        const dataType = options.dataType || 'unknown'
        const dataQualityService = this.app.service.dataQualityService

        if (dataQualityService) {
          try {
            const processedResult = await dataQualityService.processData(result, dataType, source, {
              skipValidation: options.skipValidation,
              skipQualityCheck: options.skipQualityCheck,
              skipStandardization: options.skipStandardization,
              strict: options.strict,
            })

            if (processedResult.success) {
              return [processedResult.data]
            }
          } catch (error) {
            this.logger.warn(`[DataRequestOptimizer] 数据处理失败: ${error.message}`)
          }
        }
      }

      return [result]
    }

    const {
      maxConcurrent = this.parallelConfig.maxConcurrent,
      timeout = this.parallelConfig.timeout,
      retryCount = this.parallelConfig.retryCount,
      retryDelay = this.parallelConfig.retryDelay,
      priorityFn = null,
    } = options

    // 根据优先级排序请求（如果提供了优先级函数）
    let prioritizedRequests = [...requestFunctions]
    if (typeof priorityFn === 'function') {
      prioritizedRequests.sort((a, b) => priorityFn(b) - priorityFn(a))
    }

    // 创建请求队列
    const queue = prioritizedRequests.map((fn, index) => ({
      fn,
      index,
      retries: 0,
      result: null,
      error: null,
      completed: false,
    }))

    // 创建结果数组
    const results = new Array(requestFunctions.length)

    // 创建活跃请求集合
    const activeRequests = new Set()

    // 执行并行请求
    return new Promise((resolve, reject) => {
      let completed = 0
      let hasError = false

      // 处理下一个请求
      const processNext = () => {
        // 如果所有请求都已完成，解析Promise
        if (completed === requestFunctions.length) {
          if (hasError) {
            // 如果有错误，拒绝Promise
            const errors = queue
              .filter((item) => item.error)
              .map((item) => `[${item.index}]: ${item.error.message}`)

            reject(new Error(`并行请求失败: ${errors.join(', ')}`))
          } else {
            // 否则，解析结果
            resolve(results)
          }
          return
        }

        // 如果活跃请求数量已达到最大并发数，等待
        if (activeRequests.size >= maxConcurrent) {
          return
        }

        // 获取下一个未完成的请求
        const nextItem = queue.find((item) => !item.completed && !activeRequests.has(item))

        if (!nextItem) {
          return
        }

        // 标记为活跃
        activeRequests.add(nextItem)

        // 创建超时Promise
        const timeoutPromise = new Promise((_, timeoutReject) => {
          setTimeout(() => {
            timeoutReject(new Error(`请求超时 (${timeout}ms)`))
          }, timeout)
        })

        // 执行请求
        Promise.race([nextItem.fn(), timeoutPromise])
          .then((result) => {
            // 请求成功
            nextItem.result = result
            nextItem.completed = true
            results[nextItem.index] = result
            completed++

            // 从活跃请求中移除
            activeRequests.delete(nextItem)

            // 处理下一个请求
            processNext()
          })
          .catch((error) => {
            // 请求失败
            if (nextItem.retries < retryCount) {
              // 重试
              nextItem.retries++

              // 从活跃请求中移除
              activeRequests.delete(nextItem)

              // 延迟后重试
              setTimeout(() => {
                processNext()
              }, retryDelay)
            } else {
              // 达到最大重试次数
              nextItem.error = error
              nextItem.completed = true
              results[nextItem.index] = null
              completed++
              hasError = true

              // 从活跃请求中移除
              activeRequests.delete(nextItem)

              // 处理下一个请求
              processNext()
            }
          })

        // 继续处理下一个请求
        processNext()
      }

      // 开始处理请求
      for (let i = 0; i < Math.min(maxConcurrent, requestFunctions.length); i++) {
        processNext()
      }
    })
  }

  /**
   * 使用节流控制执行请求
   * @param {String} source - 数据源名称
   * @param {String} method - 方法名称
   * @param {Object} params - 请求参数
   * @param {Object} options - 选项
   * @returns {Promise<*>} - 请求结果
   */
  async executeWithThrottle(source, method, params, options = {}) {
    // 应用速率限制
    await this.applyRateLimit(source)

    // 获取数据源服务
    const service = this.dataSourceManager.getDataSourceService(source)

    if (!service || typeof service[method] !== 'function') {
      throw new Error(`数据源 ${source} 不支持方法 ${method}`)
    }

    // 更新统计信息
    this.stats.totalRequests++
    if (this.stats.sourceStats[source]) {
      this.stats.sourceStats[source].totalRequests++
    }

    try {
      // 执行请求
      const startTime = Date.now()
      const result = await service[method](params)
      const endTime = Date.now()

      // 记录请求结果
      this.dataSourceManager.recordRequestResult(source, true, endTime - startTime)

      // 更新统计信息
      this.stats.successfulRequests++
      this.stats.averageResponseTime =
        (this.stats.averageResponseTime * (this.stats.successfulRequests - 1) +
          (endTime - startTime)) /
        this.stats.successfulRequests

      if (this.stats.sourceStats[source]) {
        this.stats.sourceStats[source].successfulRequests++
        this.stats.sourceStats[source].averageResponseTime =
          (this.stats.sourceStats[source].averageResponseTime *
            (this.stats.sourceStats[source].successfulRequests - 1) +
            (endTime - startTime)) /
          this.stats.sourceStats[source].successfulRequests
      }

      return result
    } catch (error) {
      // 记录请求失败
      this.dataSourceManager.recordRequestResult(source, false, 0, error)

      // 更新统计信息
      this.stats.failedRequests++
      if (this.stats.sourceStats[source]) {
        this.stats.sourceStats[source].failedRequests++
      }

      throw error
    }
  }

  /**
   * 获取请求优化器统计信息
   * @returns {Object} - 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      timestamp: Date.now(),
    }
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      batchedRequests: 0,
      throttledRequests: 0,
      parallelRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      batchStats: {
        totalBatches: 0,
        averageBatchSize: 0,
        maxBatchSize: 0,
      },
      sourceStats: {},
    }

    // 初始化数据源统计
    for (const source of Object.keys(this.rateLimits)) {
      this.stats.sourceStats[source] = {
        totalRequests: 0,
        batchedRequests: 0,
        throttledRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
      }
    }
  }

  /**
   * 关闭请求优化器
   */
  async shutdown() {
    this.logger.info('[DataRequestOptimizer] 关闭数据请求优化器')

    // 清除所有定时器
    for (const [_, batchQueue] of this.batchQueues.entries()) {
      if (batchQueue.timer) {
        clearTimeout(batchQueue.timer)
        batchQueue.timer = null
      }
    }

    this.batchQueues.clear()
    this.requestCounts.clear()
  }
}

module.exports = DataRequestOptimizer
