'use strict'

const { app, assert } = require('egg-mock/bootstrap')

describe('Data Request Optimizer Tests', () => {
  let dataSourceManager
  let requestOptimizer

  before(async () => {
    // 初始化数据源管理器
    const DataSourceManager = require('../app/util/data_source_manager')
    dataSourceManager = new DataSourceManager(app)
    await dataSourceManager.init()

    // 获取请求优化器实例
    requestOptimizer = dataSourceManager.requestOptimizer
  })

  after(async () => {
    // 清理数据源管理器
    if (dataSourceManager) {
      await dataSourceManager.shutdown()
    }
  })

  describe('Request Optimizer Initialization', () => {
    it('should initialize request optimizer correctly', () => {
      assert(requestOptimizer)
      assert(typeof requestOptimizer.batchRequest === 'function')
      assert(typeof requestOptimizer.executeWithThrottle === 'function')
      assert(typeof requestOptimizer.executeParallelRequests === 'function')
    })

    it('should have proper configuration', () => {
      assert(dataSourceManager.requestOptimizerConfig)
      assert(typeof dataSourceManager.requestOptimizerConfig.batchingEnabled === 'boolean')
      assert(typeof dataSourceManager.requestOptimizerConfig.throttlingEnabled === 'boolean')
      assert(typeof dataSourceManager.requestOptimizerConfig.parallelEnabled === 'boolean')
    })
  })

  describe('Batch Processing', () => {
    it('should batch similar requests', async () => {
      // 创建一个模拟服务
      const mockService = {
        batchGetQuotes: async (symbols) => {
          return symbols.map((symbol) => ({ symbol, price: Math.random() * 100 }))
        },
        getQuote: async (symbol) => {
          return { symbol, price: Math.random() * 100 }
        },
      }

      // 替换数据源服务获取方法
      const originalGetDataSourceService = dataSourceManager.getDataSourceService
      dataSourceManager.getDataSourceService = () => mockService

      // 执行批处理请求
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'FB']
      const requests = symbols.map((symbol) =>
        requestOptimizer.batchRequest('tushare', 'getQuote', symbol)
      )

      // 等待所有请求完成
      const results = await Promise.all(requests)

      // 验证结果
      assert(Array.isArray(results))
      assert(results.length === symbols.length)
      results.forEach((result, index) => {
        assert(result.symbol === symbols[index])
        assert(typeof result.price === 'number')
      })

      // 检查批处理统计
      const stats = requestOptimizer.getStats()
      assert(stats.batchedRequests >= symbols.length)
      assert(stats.batchStats.totalBatches >= 1)

      // 恢复原始方法
      dataSourceManager.getDataSourceService = originalGetDataSourceService
    })

    it('should handle batch size limits', async () => {
      // 创建一个模拟服务
      const mockService = {
        batchGetData: async (params) => {
          return params.map((param) => ({ param, result: `processed-${param}` }))
        },
        getData: async (param) => {
          return { param, result: `processed-${param}` }
        },
      }

      // 替换数据源服务获取方法
      const originalGetDataSourceService = dataSourceManager.getDataSourceService
      dataSourceManager.getDataSourceService = () => mockService

      // 获取批处理配置
      const sourceConfig =
        requestOptimizer.rateLimits.tushare || requestOptimizer.rateLimits.default
      const maxBatchSize = sourceConfig.maxBatchSize

      // 创建超过最大批处理大小的请求
      const params = Array.from({ length: maxBatchSize + 10 }, (_, i) => `param-${i}`)
      const requests = params.map((param) =>
        requestOptimizer.batchRequest('tushare', 'getData', param)
      )

      // 等待所有请求完成
      const results = await Promise.all(requests)

      // 验证结果
      assert(Array.isArray(results))
      assert(results.length === params.length)
      results.forEach((result, index) => {
        assert(result.param === params[index])
        assert(result.result === `processed-${params[index]}`)
      })

      // 检查批处理统计
      const stats = requestOptimizer.getStats()
      assert(stats.batchStats.totalBatches >= 2) // 应该至少分成两批

      // 恢复原始方法
      dataSourceManager.getDataSourceService = originalGetDataSourceService
    })
  })

  describe('Rate Limiting and Throttling', () => {
    it('should apply rate limiting to requests', async () => {
      // 创建一个计数器来跟踪请求
      let requestCount = 0
      let maxConcurrentRequests = 0
      let currentConcurrentRequests = 0

      // 创建一个模拟服务
      const mockService = {
        testMethod: async () => {
          requestCount++
          currentConcurrentRequests++
          maxConcurrentRequests = Math.max(maxConcurrentRequests, currentConcurrentRequests)

          // 模拟处理时间
          await new Promise((resolve) => setTimeout(resolve, 50))

          currentConcurrentRequests--
          return { success: true }
        },
      }

      // 替换数据源服务获取方法
      const originalGetDataSourceService = dataSourceManager.getDataSourceService
      dataSourceManager.getDataSourceService = () => mockService

      // 获取速率限制配置
      const sourceConfig =
        requestOptimizer.rateLimits.tushare || requestOptimizer.rateLimits.default
      const maxRequests = sourceConfig.maxRequests

      // 创建超过速率限制的请求
      const requestCount1 = maxRequests * 2
      const requests = Array.from({ length: requestCount1 }, () =>
        requestOptimizer.executeWithThrottle('tushare', 'testMethod', {})
      )

      // 记录开始时间
      const startTime = Date.now()

      // 等待所有请求完成
      await Promise.all(requests)

      // 记录结束时间
      const endTime = Date.now()
      const duration = endTime - startTime

      // 验证结果
      assert(requestCount === requestCount1)

      // 检查是否应用了速率限制（请求应该至少分成两批）
      assert(
        duration >= sourceConfig.windowMs,
        `Duration ${duration}ms should be >= ${sourceConfig.windowMs}ms`
      )

      // 检查节流统计
      const stats = requestOptimizer.getStats()
      assert(stats.throttledRequests > 0)

      // 恢复原始方法
      dataSourceManager.getDataSourceService = originalGetDataSourceService
    })
  })

  describe('Parallel Request Execution', () => {
    it('should execute requests in parallel with concurrency control', async () => {
      // 创建一个计数器来跟踪并发请求
      let maxConcurrentRequests = 0
      let currentConcurrentRequests = 0

      // 创建请求函数
      const requestFunctions = Array.from({ length: 20 }, (_, i) => async () => {
        currentConcurrentRequests++
        maxConcurrentRequests = Math.max(maxConcurrentRequests, currentConcurrentRequests)

        // 模拟处理时间（不同的延迟）
        await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 50))

        currentConcurrentRequests--
        return { index: i, result: `result-${i}` }
      })

      // 执行并行请求
      const results = await requestOptimizer.executeParallelRequests(requestFunctions, 'test', {
        maxConcurrent: 5,
      })

      // 验证结果
      assert(Array.isArray(results))
      assert(results.length === 20)
      results.forEach((result, index) => {
        assert(result.index === index)
        assert(result.result === `result-${index}`)
      })

      // 验证并发控制
      assert(
        maxConcurrentRequests <= 5,
        `Max concurrent requests ${maxConcurrentRequests} should be <= 5`
      )

      // 检查并行请求统计
      const stats = requestOptimizer.getStats()
      assert(stats.parallelRequests >= 20)
    })

    it('should handle request failures and retries', async () => {
      // 创建请求函数，其中一些会失败
      const requestFunctions = Array.from({ length: 10 }, (_, i) => async () => {
        if (i % 3 === 0) {
          throw new Error(`Simulated failure for request ${i}`)
        }
        return { index: i, result: `result-${i}` }
      })

      // 执行并行请求，设置重试
      try {
        await requestOptimizer.executeParallelRequests(requestFunctions, 'test', {
          maxConcurrent: 3,
          retryCount: 0, // 不重试，以便测试失败处理
        })
        assert.fail('Should have thrown an error')
      } catch (error) {
        // 预期会失败
        assert(error.message.includes('并行请求失败'))
      }

      // 现在测试带重试的情况
      const retryableFunctions = Array.from({ length: 10 }, (_, i) => {
        let attempts = 0
        return async () => {
          attempts++
          if (i % 3 === 0 && attempts === 1) {
            throw new Error(`Simulated failure for request ${i}, attempt ${attempts}`)
          }
          return { index: i, result: `result-${i}`, attempts }
        }
      })

      // 执行并行请求，设置重试
      const results = await requestOptimizer.executeParallelRequests(retryableFunctions, 'test', {
        maxConcurrent: 3,
        retryCount: 1,
        retryDelay: 50,
      })

      // 验证结果
      assert(Array.isArray(results))
      assert(results.length === 10)
      results.forEach((result, index) => {
        assert(result.index === index)
        if (index % 3 === 0) {
          assert(result.attempts === 2) // 应该重试一次
        } else {
          assert(result.attempts === 1) // 不应该重试
        }
      })
    })
  })

  describe('Integration with Data Source Manager', () => {
    it('should integrate with executeWithFailover', async () => {
      // 创建一个模拟请求函数
      const requestFn = async (source) => {
        return { source, data: 'test-data' }
      }

      // 执行带故障转移的请求
      const result = await dataSourceManager.executeWithFailover(requestFn, ['tushare'], {
        useThrottling: true,
      })

      // 验证结果
      assert(result.success)
      assert(result.data.source === 'tushare')
      assert(result.data.data === 'test-data')
    })

    it('should execute batch requests through data source manager', async () => {
      // 创建一个模拟服务
      const mockService = {
        batchGetData: async (params) => {
          return params.map((param) => ({ param, result: `processed-${param}` }))
        },
        getData: async (param) => {
          return { param, result: `processed-${param}` }
        },
      }

      // 替换数据源服务获取方法
      const originalGetDataSourceService = dataSourceManager.getDataSourceService
      dataSourceManager.getDataSourceService = () => mockService

      // 执行批处理请求
      const params = ['param1', 'param2', 'param3', 'param4', 'param5']
      const results = await dataSourceManager.executeBatchRequest('tushare', 'getData', params)

      // 验证结果
      assert(Array.isArray(results))
      assert(results.length === params.length)
      results.forEach((result, index) => {
        assert(result.param === params[index])
        assert(result.result === `processed-${params[index]}`)
      })

      // 恢复原始方法
      dataSourceManager.getDataSourceService = originalGetDataSourceService
    })

    it('should execute parallel requests through data source manager', async () => {
      // 创建一个模拟服务
      const mockService = {
        getData: async (param) => {
          // 模拟处理时间
          await new Promise((resolve) => setTimeout(resolve, 50))
          return { param, result: `processed-${param}` }
        },
      }

      // 替换数据源服务获取方法
      const originalGetDataSourceService = dataSourceManager.getDataSourceService
      dataSourceManager.getDataSourceService = () => mockService

      // 执行并行请求
      const params = ['param1', 'param2', 'param3', 'param4', 'param5']
      const results = await dataSourceManager.executeParallelRequests('tushare', 'getData', params)

      // 验证结果
      assert(Array.isArray(results))
      assert(results.length === params.length)
      results.forEach((result, index) => {
        assert(result.param === params[index])
        assert(result.result === `processed-${params[index]}`)
      })

      // 恢复原始方法
      dataSourceManager.getDataSourceService = originalGetDataSourceService
    })
  })

  describe('Statistics and Monitoring', () => {
    it('should track request statistics', async () => {
      // 重置统计
      requestOptimizer.resetStats()

      // 创建一个模拟服务
      const mockService = {
        testMethod: async () => {
          return { success: true }
        },
      }

      // 替换数据源服务获取方法
      const originalGetDataSourceService = dataSourceManager.getDataSourceService
      dataSourceManager.getDataSourceService = () => mockService

      // 执行一些请求
      await Promise.all([
        requestOptimizer.executeWithThrottle('tushare', 'testMethod', {}),
        requestOptimizer.executeWithThrottle('tushare', 'testMethod', {}),
        requestOptimizer.executeWithThrottle('tushare', 'testMethod', {}),
      ])

      // 获取统计信息
      const stats = requestOptimizer.getStats()

      // 验证统计
      assert(stats.totalRequests >= 3)
      assert(stats.successfulRequests >= 3)
      assert(typeof stats.averageResponseTime === 'number')

      // 恢复原始方法
      dataSourceManager.getDataSourceService = originalGetDataSourceService
    })

    it('should provide request optimizer stats through data source manager', async () => {
      // 获取统计信息
      const stats = dataSourceManager.getRequestOptimizerStats()

      // 验证统计
      assert(stats)
      assert(typeof stats.totalRequests === 'number')
      assert(typeof stats.batchedRequests === 'number')
      assert(typeof stats.throttledRequests === 'number')
      assert(typeof stats.parallelRequests === 'number')
    })
  })
})
