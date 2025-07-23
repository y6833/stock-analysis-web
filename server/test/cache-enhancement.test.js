'use strict'

const { app, assert } = require('egg-mock/bootstrap')

describe('Enhanced Cache Manager Tests', () => {
  let cacheManager

  before(async () => {
    // 初始化缓存管理器
    const CacheManager = require('../app/util/cache_manager')
    cacheManager = new CacheManager(app)
    await cacheManager.init()
  })

  after(async () => {
    // 清理缓存管理器
    if (cacheManager) {
      await cacheManager.shutdown()
    }
  })

  describe('Multi-layer Caching Strategy', () => {
    it('should implement client-server-database caching layers', async () => {
      // 测试多层缓存配置
      assert(cacheManager.layers.client.enabled)
      assert(cacheManager.layers.server.enabled)
      assert(cacheManager.layers.database.enabled)
    })

    it('should have proper TTL configuration for different data types', async () => {
      const stockTTL = cacheManager.getDefaultTTL('stock')
      const userTTL = cacheManager.getDefaultTTL('user')
      const marketTTL = cacheManager.getDefaultTTL('market')

      assert(stockTTL === 300) // 5 minutes
      assert(userTTL === 600) // 10 minutes
      assert(marketTTL === 60) // 1 minute
    })

    it('should support batch operations', async () => {
      const testData = {
        test1: { value: 'data1' },
        test2: { value: 'data2' },
        test3: { value: 'data3' },
      }

      // 批量设置
      const setResult = await cacheManager.mset('test', testData, 300)
      assert(setResult === true)

      // 批量获取
      const getResult = await cacheManager.mget('test', ['test1', 'test2', 'test3'])
      assert(Object.keys(getResult).length === 3)
      assert(getResult.test1.value === 'data1')
      assert(getResult.test2.value === 'data2')
      assert(getResult.test3.value === 'data3')
    })
  })

  describe('Cache Invalidation Strategy', () => {
    it('should support pattern-based invalidation', async () => {
      // 设置测试数据
      await cacheManager.set('stock', 'AAPL:info', { symbol: 'AAPL', name: 'Apple Inc.' })
      await cacheManager.set('stock', 'AAPL:daily', [{ date: '2024-01-01', price: 150 }])
      await cacheManager.set('stock', 'GOOGL:info', { symbol: 'GOOGL', name: 'Alphabet Inc.' })

      // 模式匹配删除
      const deletedCount = await cacheManager.clearPattern('stock:AAPL:*')
      assert(deletedCount === 2)

      // 验证删除结果
      const aaplInfo = await cacheManager.get('stock', 'AAPL:info')
      const aaplDaily = await cacheManager.get('stock', 'AAPL:daily')
      const googlInfo = await cacheManager.get('stock', 'GOOGL:info')

      assert(aaplInfo === null)
      assert(aaplDaily === null)
      assert(googlInfo !== null)
    })

    it('should support dependency-based invalidation', async () => {
      // 设置主数据和依赖数据
      await cacheManager.set('stock', 'AAPL:info', { symbol: 'AAPL' })
      await cacheManager.set('stock', 'list', ['AAPL', 'GOOGL'])
      await cacheManager.set('market', 'overview', { status: 'open' })

      // 使用智能失效
      await cacheManager.invalidate('stock', 'AAPL:info')

      // 验证依赖缓存也被失效
      const stockList = await cacheManager.get('stock', 'list')
      const marketOverview = await cacheManager.get('market', 'overview')

      // 根据依赖关系配置，这些应该被失效
      assert(stockList === null)
      assert(marketOverview === null)
    })

    it('should support time-based invalidation', async () => {
      // 设置带有元数据的缓存
      await cacheManager.set('stock', 'test:old', { data: 'old' }, 300, {
        lastUpdated: Date.now() - 2 * 60 * 60 * 1000, // 2小时前
      })

      await cacheManager.set('stock', 'test:new', { data: 'new' }, 300, {
        lastUpdated: Date.now() - 30 * 60 * 1000, // 30分钟前
      })

      // 执行基于时间的失效
      const result = await cacheManager.invalidateByTime()

      assert(result.total >= 2)
      assert(result.invalidated >= 1) // 至少失效了旧数据
    })
  })

  describe('Cache Prewarming', () => {
    it('should support basic cache prewarming', async () => {
      // 执行缓存预热
      const result = await cacheManager.prewarmCache()

      assert(result.successCount >= 0)
      assert(result.duration > 0)
      assert(Array.isArray(result.details))
    })

    it('should support smart prewarming based on access patterns', async () => {
      // 模拟热点访问
      await cacheManager.trackHotKey('stock:AAPL:info')
      await cacheManager.trackHotKey('stock:AAPL:info')
      await cacheManager.trackHotKey('stock:AAPL:info')

      // 获取热点键
      const hotKeys = await cacheManager.getHotKeys(10)
      assert(Array.isArray(hotKeys))

      // 执行智能预热
      const result = await cacheManager.smartPrewarm()
      assert(typeof result.successCount === 'number')
      assert(typeof result.failCount === 'number')
    })

    it('should support scheduled prewarming', async () => {
      // 执行定时预热
      const result = await cacheManager.scheduledPrewarm()

      assert(typeof result.successCount === 'number')
      assert(typeof result.failCount === 'number')
      assert(result.total >= 0)
    })
  })

  describe('Cache Optimization', () => {
    it('should support cache compression', async () => {
      // 设置大型数据用于压缩测试
      const largeData = 'x'.repeat(2048) // 2KB数据
      await cacheManager.set('test', 'large', { data: largeData })

      // 执行压缩
      const result = await cacheManager.compressCache()

      assert(typeof result.compressedCount === 'number')
      assert(typeof result.savedBytes === 'number')
    })

    it('should support cache defragmentation', async () => {
      // 设置一些测试数据
      await cacheManager.set('test', 'frag1', { data: 'test1' })
      await cacheManager.set('test', 'frag2', { data: 'test2' })
      await cacheManager.set('test', 'frag3', { data: 'test3' })

      // 执行碎片整理
      const result = await cacheManager.defragmentCache()

      assert(typeof result.processed === 'number')
      assert(result.processed >= 0)
    })

    it('should support hot data rebalancing', async () => {
      // 模拟热点数据
      await cacheManager.trackHotKey('stock:hot1')
      await cacheManager.trackHotKey('stock:hot2')

      // 执行重平衡
      const result = await cacheManager.rebalanceHotData()

      assert(typeof result.rebalanced === 'number')
      assert(result.rebalanced >= 0)
    })

    it('should perform comprehensive cache optimization', async () => {
      // 执行综合优化
      const result = await cacheManager.optimizeCache()

      assert(typeof result.compressed === 'number')
      assert(typeof result.defragmented === 'number')
      assert(typeof result.rebalanced === 'number')
      assert(result.errors === 0)
    })
  })

  describe('Smart Invalidation', () => {
    it('should invalidate low-access keys', async () => {
      // 设置低访问频率的数据
      await cacheManager.set('test', 'low-access', { data: 'test' }, 300, {
        lastUpdated: Date.now() - 2 * 60 * 60 * 1000, // 2小时前
      })

      // 执行智能失效
      const result = await cacheManager.smartInvalidation()

      assert(typeof result.totalChecked === 'number')
      assert(typeof result.invalidated === 'number')
      assert(typeof result.strategies === 'object')
    })

    it('should invalidate inconsistent data', async () => {
      // 设置不一致的数据
      await cacheManager.set('stock', 'invalid:info', {
        /* 缺少必要字段 */
      })

      const result = await cacheManager.smartInvalidation()

      assert(result.strategies.consistency.checked >= 0)
      assert(result.strategies.consistency.invalidated >= 0)
    })

    it('should handle memory pressure invalidation', async () => {
      // 这个测试需要模拟高内存使用情况
      // 在实际环境中，这会根据Redis内存使用情况进行
      const result = await cacheManager.smartInvalidation()

      assert(result.strategies.memory.checked >= 0)
      assert(result.strategies.memory.invalidated >= 0)
    })
  })

  describe('Cache Health Monitoring', () => {
    it('should perform health checks', async () => {
      const healthReport = await cacheManager.healthCheck()

      assert(typeof healthReport.timestamp === 'number')
      assert(typeof healthReport.redis === 'object')
      assert(typeof healthReport.cache === 'object')
      assert(typeof healthReport.layers === 'object')

      // 检查Redis健康状态
      assert(['healthy', 'unhealthy'].includes(healthReport.redis.status))
      assert(typeof healthReport.redis.latency === 'number')

      // 检查缓存统计
      assert(typeof healthReport.cache.hitRate === 'number')
      assert(typeof healthReport.cache.totalOperations === 'number')
    })

    it('should provide cache statistics', async () => {
      const stats = cacheManager.getCacheStats()

      assert(typeof stats.enabled === 'boolean')
      assert(typeof stats.layers === 'object')
      assert(typeof stats.prewarming === 'object')
      assert(typeof stats.hits === 'number')
      assert(typeof stats.misses === 'number')
      assert(typeof stats.sets === 'number')
      assert(typeof stats.deletes === 'number')
      assert(typeof stats.errors === 'number')
    })
  })

  describe('Cache Wrapper Functions', () => {
    it('should support cache wrapper for functions', async () => {
      let callCount = 0

      // 创建一个测试函数
      const testFunction = async (param) => {
        callCount++
        return { result: `processed-${param}`, timestamp: Date.now() }
      }

      // 创建缓存包装器
      const cachedFunction = cacheManager.cacheWrapper(
        testFunction,
        'test',
        (param) => `func:${param}`,
        300
      )

      // 第一次调用
      const result1 = await cachedFunction('test-param')
      assert(callCount === 1)
      assert(result1.result === 'processed-test-param')

      // 第二次调用应该从缓存返回
      const result2 = await cachedFunction('test-param')
      assert(callCount === 1) // 调用次数不应该增加
      assert(result2.result === 'processed-test-param')
    })

    it('should support getOrSet pattern', async () => {
      let fetchCount = 0

      const result1 = await cacheManager.getOrSet('test', 'getOrSet', async () => {
        fetchCount++
        return { data: 'fetched-data', count: fetchCount }
      })

      assert(fetchCount === 1)
      assert(result1.data === 'fetched-data')

      // 第二次调用应该从缓存返回
      const result2 = await cacheManager.getOrSet('test', 'getOrSet', async () => {
        fetchCount++
        return { data: 'fetched-data-2', count: fetchCount }
      })

      assert(fetchCount === 1) // 不应该再次获取
      assert(result2.data === 'fetched-data') // 应该返回缓存的数据
    })
  })

  describe('Metadata Management', () => {
    it('should support cache metadata', async () => {
      const testData = { value: 'test' }
      const metadata = {
        source: 'test-api',
        version: '1.0',
        tags: ['test', 'metadata'],
      }

      // 设置带元数据的缓存
      await cacheManager.set('test', 'metadata', testData, 300, metadata)

      // 获取元数据
      const retrievedMeta = await cacheManager.getMetadata('test', 'metadata')

      assert(retrievedMeta.source === 'test-api')
      assert(retrievedMeta.version === '1.0')
      assert(Array.isArray(retrievedMeta.tags))
      assert(retrievedMeta.tags.includes('test'))
      assert(retrievedMeta.tags.includes('metadata'))
    })

    it('should track cache item sizes and timestamps', async () => {
      const testData = { large: 'x'.repeat(1000) }

      await cacheManager.set('test', 'size-test', testData, 300)

      const metadata = await cacheManager.getMetadata('test', 'size-test')

      assert(typeof metadata.lastUpdated === 'string')
      assert(typeof metadata.size === 'string')
      assert(parseInt(metadata.size) > 1000) // 应该记录数据大小
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle Redis connection failures gracefully', async () => {
      // 这个测试需要模拟Redis连接失败
      // 在实际实现中，缓存管理器应该回退到内存缓存
      const originalRedis = cacheManager.redis

      // 模拟Redis不可用
      cacheManager.redis = null

      // 操作应该仍然能够执行（使用内存缓存）
      const result = await cacheManager.set('test', 'resilience', { data: 'test' })
      assert(result === false) // 应该返回false但不抛出错误

      // 恢复Redis连接
      cacheManager.redis = originalRedis
    })

    it('should handle cache operation errors', async () => {
      // 测试错误统计
      const initialStats = cacheManager.getCacheStats()
      const initialErrors = initialStats.errors

      // 尝试获取不存在的缓存（这不应该产生错误）
      const result = await cacheManager.get('nonexistent', 'key')
      assert(result === null)

      // 错误计数不应该增加
      const finalStats = cacheManager.getCacheStats()
      assert(finalStats.errors === initialErrors)
    })
  })

  describe('Performance Optimization', () => {
    it('should track hot keys for optimization', async () => {
      // 模拟频繁访问
      for (let i = 0; i < 20; i++) {
        await cacheManager.trackHotKey('stock:popular')
      }

      const hotKeys = await cacheManager.getHotKeys(5)
      assert(Array.isArray(hotKeys))

      // 检查热点键是否被正确跟踪
      let found = false
      for (let i = 0; i < hotKeys.length; i += 2) {
        if (hotKeys[i] === 'stock:popular') {
          found = true
          assert(parseInt(hotKeys[i + 1]) >= 20)
          break
        }
      }
      assert(found, 'Hot key should be tracked')
    })

    it('should optimize cache based on access patterns', async () => {
      // 设置一些测试数据
      await cacheManager.set('test', 'pattern1', { data: 'test1' })
      await cacheManager.set('test', 'pattern2', { data: 'test2' })

      // 模拟不同的访问模式
      await cacheManager.trackHotKey('test:pattern1')
      await cacheManager.trackHotKey('test:pattern1')
      await cacheManager.trackHotKey('test:pattern1')

      // 执行基于模式的优化
      const result = await cacheManager.smartPrewarm()

      assert(typeof result.successCount === 'number')
      assert(typeof result.failCount === 'number')
    })
  })
})
