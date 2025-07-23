'use strict'

const { app, assert } = require('egg-mock/bootstrap')

describe('Data Source Manager Tests', () => {
  let dataSourceManager

  before(async () => {
    // 初始化数据源管理器
    const DataSourceManager = require('../app/util/data_source_manager')
    dataSourceManager = new DataSourceManager(app)
    await dataSourceManager.init()
  })

  after(async () => {
    // 清理数据源管理器
    if (dataSourceManager) {
      await dataSourceManager.shutdown()
    }
  })

  describe('Data Source Configuration', () => {
    it('should have proper data source configurations', () => {
      const sources = dataSourceManager.getDataSources()
      assert(Array.isArray(sources))
      assert(sources.length > 0)

      // 检查是否包含主要数据源
      assert(sources.includes('tushare'))
      assert(sources.includes('akshare'))
      assert(sources.includes('sina'))
    })

    it('should provide data source config details', () => {
      const tushareConfig = dataSourceManager.getDataSourceConfig('tushare')

      assert(tushareConfig)
      assert(typeof tushareConfig.priority === 'number')
      assert(typeof tushareConfig.reliability === 'number')
      assert(typeof tushareConfig.performance === 'number')
      assert(typeof tushareConfig.enabled === 'boolean')
    })
  })

  describe('Data Source Scoring', () => {
    it('should calculate data source scores correctly', () => {
      const score = dataSourceManager.calculateScore('tushare')

      assert(typeof score === 'number')
      assert(score >= 0 && score <= 100)
    })

    it('should return zero score for disabled or non-existent data sources', () => {
      // 临时禁用数据源
      const originalEnabled = dataSourceManager.dataSources.tushare.enabled
      dataSourceManager.dataSources.tushare.enabled = false

      const score = dataSourceManager.calculateScore('tushare')
      assert(score === 0)

      // 恢复原始状态
      dataSourceManager.dataSources.tushare.enabled = originalEnabled

      // 测试不存在的数据源
      const nonExistentScore = dataSourceManager.calculateScore('non_existent_source')
      assert(nonExistentScore === 0)
    })

    it('should prioritize data sources based on scores', () => {
      const priority = dataSourceManager.getDataSourcePriority()

      assert(Array.isArray(priority))
      assert(priority.length > 0)

      // 验证排序是否正确（分数从高到低）
      for (let i = 1; i < priority.length; i++) {
        assert(priority[i - 1].score >= priority[i].score)
      }
    })

    it('should select the best data source', () => {
      const bestSource = dataSourceManager.getBestDataSource()

      assert(bestSource)
      assert(typeof bestSource === 'string')

      // 验证最佳数据源是否真的是最高分
      const score = dataSourceManager.calculateScore(bestSource)
      const allSources = dataSourceManager.getDataSources()

      for (const source of allSources) {
        const otherScore = dataSourceManager.calculateScore(source)
        assert(score >= otherScore)
      }
    })
  })

  describe('Health Tracking', () => {
    it('should track request results correctly', () => {
      // 记录成功请求
      const successHealth = dataSourceManager.recordRequestResult('tushare', true, 100)

      assert(successHealth.totalRequests === 1)
      assert(successHealth.successfulRequests === 1)
      assert(successHealth.failedRequests === 0)
      assert(successHealth.consecutiveSuccesses === 1)
      assert(successHealth.consecutiveFailures === 0)
      assert(successHealth.averageResponseTime === 100)

      // 记录失败请求
      const error = new Error('Test error')
      const failHealth = dataSourceManager.recordRequestResult('tushare', false, 200, error)

      assert(failHealth.totalRequests === 2)
      assert(failHealth.successfulRequests === 1)
      assert(failHealth.failedRequests === 1)
      assert(failHealth.consecutiveSuccesses === 0)
      assert(failHealth.consecutiveFailures === 1)
      assert(failHealth.lastError.message === 'Test error')
    })

    it('should mark data source as unavailable after consecutive failures', () => {
      // 重置健康状态
      dataSourceManager.healthStatus.test_source = {
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

      // 记录多次失败，达到阈值
      const failureThreshold = dataSourceManager.failoverConfig.failureThreshold

      for (let i = 0; i < failureThreshold; i++) {
        dataSourceManager.recordRequestResult('test_source', false, 0, new Error('Failure'))
      }

      // 验证数据源是否被标记为不可用
      assert(dataSourceManager.healthStatus.test_source.status === 'unavailable')
      assert(dataSourceManager.healthStatus.test_source.isHealthy === false)
    })

    it('should mark data source as available after consecutive successes', () => {
      // 设置初始状态为不可用
      dataSourceManager.healthStatus.test_source = {
        isHealthy: false,
        lastCheck: null,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        lastError: null,
        lastSuccess: null,
        status: 'unavailable',
      }

      // 记录多次成功，达到阈值
      const recoveryThreshold = dataSourceManager.failoverConfig.recoveryThreshold

      for (let i = 0; i < recoveryThreshold; i++) {
        dataSourceManager.recordRequestResult('test_source', true, 100)
      }

      // 验证数据源是否被标记为可用
      assert(dataSourceManager.healthStatus.test_source.status === 'available')
      assert(dataSourceManager.healthStatus.test_source.isHealthy === true)
    })
  })

  describe('Score History', () => {
    it('should record score history', () => {
      // 清除历史记录
      dataSourceManager.scoreHistory.tushare = []

      // 记录评分
      dataSourceManager.recordScoreHistory('tushare')

      // 验证历史记录
      assert(Array.isArray(dataSourceManager.scoreHistory.tushare))
      assert(dataSourceManager.scoreHistory.tushare.length === 1)
      assert(typeof dataSourceManager.scoreHistory.tushare[0].timestamp === 'number')
      assert(typeof dataSourceManager.scoreHistory.tushare[0].score === 'number')
    })

    it('should limit score history size', () => {
      // 清除历史记录
      dataSourceManager.scoreHistory.test_source = []

      // 添加超过限制的记录
      for (let i = 0; i < 110; i++) {
        dataSourceManager.scoreHistory.test_source.push({
          timestamp: Date.now() - i * 1000,
          score: 50,
        })
      }

      // 再添加一条记录，触发限制
      dataSourceManager.recordScoreHistory('test_source')

      // 验证历史记录大小是否被限制
      assert(dataSourceManager.scoreHistory.test_source.length <= 100)
    })
  })

  describe('Failover Mechanism', () => {
    it('should execute request with failover', async () => {
      // 创建一个模拟请求函数
      const requestFn = async (source) => {
        if (source === 'tushare') {
          throw new Error('Simulated failure')
        }
        return { data: `Data from ${source}` }
      }

      // 执行带故障转移的请求
      const result = await dataSourceManager.executeWithFailover(requestFn, [
        'tushare',
        'akshare',
        'sina',
      ])

      // 验证结果
      assert(result.success)
      assert(result.source === 'akshare' || result.source === 'sina')
      assert(result.data.data.includes(result.source))
    })

    it('should use cache when available', async () => {
      // 模拟缓存管理器
      const originalCacheManager = dataSourceManager.cacheManager
      dataSourceManager.cacheManager = {
        get: async (namespace, key) => {
          if (namespace === 'test' && key === 'cached_data') {
            return { cached: true, value: 'test_value' }
          }
          return null
        },
        set: async () => true,
      }

      // 创建一个模拟请求函数
      const requestFn = async () => {
        throw new Error('This should not be called')
      }

      // 执行带缓存的请求
      const result = await dataSourceManager.executeWithFailover(requestFn, ['tushare'], {
        cacheKey: 'cached_data',
        cacheNamespace: 'test',
      })

      // 验证结果
      assert(result.success)
      assert(result.source === 'cache')
      assert(result.fromCache === true)
      assert(result.data.cached === true)

      // 恢复原始缓存管理器
      dataSourceManager.cacheManager = originalCacheManager
    })

    it('should handle all sources failing', async () => {
      // 创建一个总是失败的请求函数
      const requestFn = async () => {
        throw new Error('Always fails')
      }

      // 执行带故障转移的请求，应该失败
      try {
        await dataSourceManager.executeWithFailover(requestFn, ['test_source1', 'test_source2'])
        assert.fail('Should have thrown an error')
      } catch (error) {
        assert(error.message === 'Always fails')
      }
    })
  })

  describe('Health Check', () => {
    it('should perform health check for all sources', async () => {
      // 模拟数据源服务
      const originalGetDataSourceService = dataSourceManager.getDataSourceService
      dataSourceManager.getDataSourceService = (source) => {
        return {
          test: async () => {
            if (source === 'test_fail') {
              throw new Error('Test failure')
            }
            return { success: true }
          },
        }
      }

      // 执行健康检查
      const result = await dataSourceManager.checkHealth()

      // 验证结果
      assert(result.timestamp)
      assert(typeof result.results === 'object')

      // 恢复原始方法
      dataSourceManager.getDataSourceService = originalGetDataSourceService
    })

    it('should perform health check for specific source', async () => {
      // 模拟数据源服务
      const originalGetDataSourceService = dataSourceManager.getDataSourceService
      dataSourceManager.getDataSourceService = () => {
        return {
          test: async () => ({ success: true }),
        }
      }

      // 执行健康检查
      const result = await dataSourceManager.checkHealth('tushare')

      // 验证结果
      assert(result.timestamp)
      assert(result.results.tushare)
      assert(result.results.tushare.success === true)

      // 恢复原始方法
      dataSourceManager.getDataSourceService = originalGetDataSourceService
    })
  })
})
