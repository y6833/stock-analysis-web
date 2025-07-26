'use strict'

const Service = require('egg').Service
const axios = require('axios')

/**
 * 股票服务 - 订单簿相关扩展
 * 1. 获取股票订单簿深度数据
 * 2. 增强行情数据包含订单簿信息
 */

class StockService extends Service {
  /**
   * 获取股票订单簿深度
   * @param {string} stockCode - 股票代码
   * @param {number} depth - 深度级别(默认5档)
   */
  async getStockOrderBook(stockCode, depth = 5) {
    const { ctx } = this
    try {
      // 获取基础行情数据
      const quote = await this.getStockQuote(stockCode)

      // 获取订单簿数据
      const orderBook = await ctx.service.orderBook.getDepth(depth)

      return {
        ...quote,
        orderBook,
      }
    } catch (err) {
      ctx.logger.error(`获取股票订单簿失败: ${stockCode}`, err)
      throw err
    }
  }
  // 通用的缓存包装器，用于包装任何 API 调用并自动缓存结果
  async withCache(cacheKey, ttl, fetchDataFn) {
    const { app, ctx } = this

    // 提取数据源名称
    const dataSource = cacheKey.split(':')[0] || 'tushare'

    // 首先尝试从缓存获取数据
    try {
      if (app.redis && typeof app.redis.get === 'function') {
        const cachedData = await app.redis.get(cacheKey)
        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData)
            ctx.logger.info(`从 Redis 缓存获取数据成功: ${cacheKey}`)

            // 记录缓存命中
            await ctx.service.cache.recordCacheHit(dataSource)

            return {
              ...parsedData,
              fromCache: true,
              data_source: 'redis_cache',
              data_source_message: '数据来自Redis缓存',
            }
          } catch (parseErr) {
            ctx.logger.warn('解析 Redis 缓存数据失败:', parseErr)
            // 继续尝试从 API 获取
          }
        }
      } else if (global.stockCache && global.stockCache[cacheKey]) {
        // 如果 Redis 不可用，尝试从内存缓存获取
        const cacheData = global.stockCache[cacheKey]
        const cacheTime = new Date(cacheData.cacheTime || 0)
        const now = new Date()
        const cacheAge = now.getTime() - cacheTime.getTime()

        // 检查缓存是否过期
        if (cacheAge < ttl * 1000) {
          ctx.logger.info(`从内存缓存获取数据成功: ${cacheKey}`)

          // 记录缓存命中
          await ctx.service.cache.recordCacheHit(dataSource)

          return {
            ...cacheData,
            fromCache: true,
            data_source: 'local_cache',
            data_source_message: '数据来自本地内存缓存',
          }
        }
      }

      // 记录缓存未命中
      await ctx.service.cache.recordCacheMiss(dataSource)
    } catch (cacheErr) {
      ctx.logger.warn('获取缓存数据失败:', cacheErr)
      // 继续尝试从 API 获取
    }

    // 如果缓存中没有数据或已过期，从 API 获取
    try {
      // 调用传入的函数获取数据
      const data = await fetchDataFn()

      // 添加缓存时间和数据来源
      const dataToCache = {
        ...data,
        cacheTime: new Date().toISOString(),
        data_source: 'external_api',
        data_source_message: `数据来自${dataSource.toUpperCase()}外部API`,
      }

      // 保存到 Redis 缓存
      try {
        if (app.redis && typeof app.redis.set === 'function') {
          await app.redis.set(cacheKey, JSON.stringify(dataToCache), 'EX', ttl)
          ctx.logger.info(`数据已保存到 Redis 缓存: ${cacheKey}`)
        }

        // 同时保存到内存缓存作为备份
        if (!global.stockCache) {
          global.stockCache = {}
        }
        global.stockCache[cacheKey] = dataToCache
      } catch (cacheErr) {
        ctx.logger.warn('保存数据到缓存失败:', cacheErr)
        // 继续返回数据，不影响主流程
      }

      return dataToCache
    } catch (err) {
      ctx.logger.error(`获取数据失败: ${cacheKey}`, err)

      // 再次尝试从缓存获取（可能第一次尝试时缓存还未准备好）
      try {
        if (app.redis && typeof app.redis.get === 'function') {
          const cachedData = await app.redis.get(cacheKey)
          if (cachedData) {
            const parsedData = JSON.parse(cachedData)
            ctx.logger.info(`API调用失败，使用缓存数据: ${cacheKey}`)

            // 记录缓存命中
            await ctx.service.cache.recordCacheHit(dataSource)

            return {
              ...parsedData,
              fromCache: true,
              data_source: 'redis_cache',
              data_source_message: '数据来自Redis缓存（API调用失败）',
            }
          }
        } else if (global.stockCache && global.stockCache[cacheKey]) {
          ctx.logger.info(`API调用失败，使用内存缓存数据: ${cacheKey}`)

          // 记录缓存命中
          await ctx.service.cache.recordCacheHit(dataSource)

          return {
            ...global.stockCache[cacheKey],
            fromCache: true,
            data_source: 'local_cache',
            data_source_message: '数据来自本地内存缓存（API调用失败）',
          }
        }

        // 如果没有缓存数据，记录缓存未命中
        await ctx.service.cache.recordCacheMiss(dataSource)
      } catch (cacheErr) {
        ctx.logger.warn('获取缓存数据失败:', cacheErr)

        // 记录缓存未命中
        await ctx.service.cache.recordCacheMiss(dataSource)
      }

      // 如果没有缓存数据，抛出错误
      throw err
    }
  }

  // 获取股票实时行情
  async getStockQuote(stockCode) {
    const { app, ctx } = this
    const cacheKey = `stock:quote:${stockCode}`

    // 使用缓存包装器
    return this.withCache(cacheKey, 3600, async () => {
      try {
        ctx.logger.info(`开始获取股票 ${stockCode} 行情...`)

        // 使用Tushare API获取实时行情
        // 首先尝试使用 daily_basic 接口获取最新交易日数据
        const tushareToken =
          (app.config && app.config.tushare && app.config.tushare.token) || 'demo_token'
        const response = await axios.post('http://api.tushare.pro', {
          api_name: 'daily_basic',
          token: tushareToken,
          params: {
            ts_code: stockCode,
            trade_date: this.getDateString(0), // 今天
          },
        })

        // 输出调试信息
        ctx.logger.info(`股票 ${stockCode} Tushare API响应: ${JSON.stringify(response.data)}`)

        // 检查API权限错误
        if (
          response.data &&
          response.data.msg &&
          (response.data.msg.includes('积分') || response.data.msg.includes('权限'))
        ) {
          ctx.logger.error(`Tushare API权限不足: ${response.data.msg}`)
          throw new Error(`Tushare API权限不足: ${response.data.msg}`)
        }

        // 如果今天没有数据，尝试获取最近一个交易日的数据
        if (
          !response.data ||
          !response.data.data ||
          !response.data.data.items ||
          response.data.data.items.length === 0
        ) {
          try {
            const fallbackResponse = await axios.post('http://api.tushare.pro', {
              api_name: 'daily',
              token: app.config.tushare.token,
              params: {
                ts_code: stockCode,
                start_date: this.getDateString(-10), // 10天前
                end_date: this.getDateString(0), // 今天
                limit: 1, // 只获取最新的一条记录
              },
            })

            // 检查fallback API权限错误
            if (
              fallbackResponse.data &&
              fallbackResponse.data.msg &&
              (fallbackResponse.data.msg.includes('积分') ||
                fallbackResponse.data.msg.includes('权限'))
            ) {
              ctx.logger.error(`Tushare API权限不足: ${fallbackResponse.data.msg}`)
              throw new Error(`Tushare API权限不足: ${fallbackResponse.data.msg}`)
            }

            return this.processStockData(fallbackResponse, stockCode, 'daily')
          } catch (fallbackErr) {
            ctx.logger.error(`获取股票 ${stockCode} fallback数据失败: ${fallbackErr.message}`)
            throw new Error(`获取股票 ${stockCode} 数据失败: ${fallbackErr.message}`)
          }
        }

        return this.processStockData(response, stockCode, 'daily_basic')
      } catch (err) {
        ctx.logger.error(`获取股票 ${stockCode} 行情失败:`, err)

        // 如果是积分不足或权限问题，抛出错误
        if (err.response && err.response.data) {
          const errorMsg = err.response.data.msg || err.message
          if (errorMsg.includes('积分') || errorMsg.includes('权限')) {
            ctx.logger.error(`Tushare API权限不足: ${errorMsg}`)
            throw new Error(`Tushare API权限不足: ${errorMsg}`)
          }
        }

        // 其他错误也抛出，不使用默认数据
        ctx.logger.error(`股票 ${stockCode} 获取失败: ${err.message}`)
        throw new Error(`股票 ${stockCode} 获取失败: ${err.message}`)
      }
    })
  }

  // 处理股票数据
  async processStockData(response, stockCode, apiType) {
    const { ctx } = this

    // 检查API权限错误
    if (
      response.data &&
      response.data.msg &&
      (response.data.msg.includes('积分') || response.data.msg.includes('权限'))
    ) {
      ctx.logger.error(`Tushare API权限不足: ${response.data.msg}`)
      throw new Error(`Tushare API权限不足: ${response.data.msg}`)
    }

    if (
      response.data &&
      response.data.data &&
      response.data.data.items &&
      response.data.data.items.length > 0
    ) {
      const latestData = response.data.data.items[0]
      const stockNameResult = await this.getStockName(stockCode)
      const stockName = stockNameResult && stockNameResult.name ? stockNameResult.name : stockCode

      let quote

      if (apiType === 'daily_basic') {
        // daily_basic 接口返回的数据结构
        quote = {
          code: stockCode,
          name: stockName,
          price: latestData[2], // 收盘价
          open: null, // daily_basic 不包含开盘价
          high: null, // daily_basic 不包含最高价
          low: null, // daily_basic 不包含最低价
          volume: latestData[9], // 成交量
          amount: null, // daily_basic 不包含成交额
          change: latestData[8], // 涨跌幅
          date: latestData[1], // 交易日期
          pe: latestData[3], // 市盈率
          pb: latestData[5], // 市净率
          total_mv: latestData[12], // 总市值
          data_source: 'external_api',
          data_source_message: `数据来自Tushare API (${apiType})`,
        }
      } else {
        // daily 接口返回的数据结构
        quote = {
          code: stockCode,
          name: stockName,
          price: latestData[5], // 收盘价
          open: latestData[2], // 开盘价
          high: latestData[3], // 最高价
          low: latestData[4], // 最低价
          volume: latestData[9], // 成交量
          amount: latestData[10], // 成交额
          change: latestData[8], // 涨跌幅
          date: latestData[1], // 日期
          data_source: 'external_api',
          data_source_message: `数据来自Tushare API (${apiType})`,
        }
      }

      return quote
    }

    // 如果没有获取到数据，抛出错误
    ctx.logger.error(`股票 ${stockCode} 未获取到数据`)
    throw new Error(`股票 ${stockCode} 未获取到数据`)
  }

  // 已删除 getDefaultStockQuote 方法 - 禁止使用模拟数据

  // 获取股票历史数据（优先从缓存读取）
  async getStockHistoryData(stockCode, startDate = null, endDate = null, cachePriority = 3) {
    const { ctx } = this

    try {
      ctx.logger.info(
        `获取股票 ${stockCode} 历史数据，开始日期: ${startDate}, 结束日期: ${endDate}`
      )

      // 使用缓存服务获取数据
      const stockDailyCacheService = new ctx.service.stockDailyCache.constructor(ctx)
      const data = await stockDailyCacheService.getDailyData(
        stockCode,
        startDate,
        endDate,
        cachePriority
      )

      if (data && data.length > 0) {
        ctx.logger.info(`成功获取股票 ${stockCode} 历史数据，共 ${data.length} 条`)
        return {
          success: true,
          data: data,
          data_source: 'cache_or_api',
          data_source_message: '数据来自缓存或Tushare API',
          count: data.length,
        }
      } else {
        ctx.logger.warn(`股票 ${stockCode} 未获取到历史数据`)
        return {
          success: false,
          data: [],
          data_source: 'none',
          data_source_message: '未获取到数据',
          count: 0,
        }
      }
    } catch (error) {
      ctx.logger.error(`获取股票 ${stockCode} 历史数据失败:`, error)
      return {
        success: false,
        data: [],
        data_source: 'error',
        data_source_message: `获取数据失败: ${error.message}`,
        count: 0,
      }
    }
  }

  // 获取股票缓存数据 (如果有)
  async getCachedStockQuote(stockCode) {
    const { app, ctx } = this
    const cacheKey = `stock:quote:${stockCode}`
    let redisError = false

    // 尝试从 Redis 获取缓存数据
    if (app.redis && typeof app.redis.get === 'function') {
      try {
        const cachedData = await app.redis.get(cacheKey)
        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData)
            ctx.logger.info(`从 Redis 缓存获取股票 ${stockCode} 行情数据成功`)
            return {
              ...parsedData,
              data_source: 'redis_cache',
              data_source_message: '数据来自Redis缓存',
            }
          } catch (parseErr) {
            ctx.logger.warn('解析 Redis 缓存数据失败:', parseErr)
            // Redis 数据解析失败，继续尝试内存缓存
            redisError = true
          }
        }
      } catch (redisErr) {
        ctx.logger.warn('Redis 获取失败:', redisErr)
        redisError = true
        // Redis 出错，继续尝试内存缓存
      }
    } else {
      redisError = true
      ctx.logger.info('Redis 不可用，使用内存缓存')
    }

    // 如果 Redis 不可用或出错，尝试从内存缓存获取
    if (redisError) {
      try {
        const cacheData = this.getLocalCache(stockCode)
        if (cacheData) {
          ctx.logger.info(`从内存缓存获取股票 ${stockCode} 行情数据成功`)
          return {
            ...cacheData,
            data_source: 'local_cache',
            data_source_message: '数据来自本地内存缓存',
          }
        }
      } catch (memErr) {
        ctx.logger.warn('内存缓存获取失败:', memErr)
      }
    }

    return null
  }

  // 从内存缓存中获取数据 (作为 Redis 的备份)
  getLocalCache(stockCode) {
    // 使用全局变量作为简单的内存缓存
    if (!global.stockCache) {
      global.stockCache = {}
    }

    const cache = global.stockCache[stockCode]
    if (!cache) return null

    // 检查缓存是否过期（1小时）
    const cacheTime = new Date(cache.cacheTime || 0)
    const now = new Date()
    const cacheAge = now.getTime() - cacheTime.getTime()
    const cacheExpiry = 60 * 60 * 1000 // 1小时

    if (cacheAge < cacheExpiry) {
      return cache
    }

    // 缓存已过期，删除它
    delete global.stockCache[stockCode]
    return null
  }

  // 保存股票数据到缓存
  async saveStockQuoteToCache(stockCode, quoteData) {
    const { app, ctx } = this
    const cacheKey = `stock:quote:${stockCode}`

    try {
      // 确定数据来源
      const dataSource = quoteData.data_source || 'external_api'
      const dataSourceMessage = quoteData.data_source_message || '数据来自外部API'

      // 添加缓存时间和数据来源
      const dataToCache = {
        ...quoteData,
        cacheTime: new Date().toISOString(),
        data_source: dataSource,
        data_source_message: dataSourceMessage,
      }

      // 保存到 Redis 缓存
      if (app.redis && typeof app.redis.set === 'function') {
        await app.redis.set(cacheKey, JSON.stringify(dataToCache), 'EX', 3600) // 1小时过期
        ctx.logger.info(`股票 ${stockCode} 行情数据已保存到 Redis 缓存`)
      }

      // 同时保存到内存缓存作为备份
      if (!global.stockCache) {
        global.stockCache = {}
      }
      global.stockCache[stockCode] = dataToCache
    } catch (err) {
      ctx.logger.warn(`保存股票 ${stockCode} 行情数据到 Redis 缓存失败:`, err)

      // 如果 Redis 保存失败，只保存到内存缓存
      try {
        if (!global.stockCache) {
          global.stockCache = {}
        }

        // 确定数据来源
        const dataSource = quoteData.data_source || 'external_api'
        const dataSourceMessage = quoteData.data_source_message || '数据来自外部API'

        global.stockCache[stockCode] = {
          ...quoteData,
          cacheTime: new Date().toISOString(),
          data_source: dataSource,
          data_source_message: dataSourceMessage,
        }
        ctx.logger.info(`股票 ${stockCode} 行情数据已保存到内存缓存（Redis 失败）`)
      } catch (e) {
        ctx.logger.error('保存到内存缓存也失败:', e)
      }
    }
  }

  // 获取股票历史数据
  async getStockHistory(stockCode, startDate, endDate) {
    const { app, ctx } = this
    const cacheKey = `stock:history:${stockCode}:${startDate}:${endDate}`

    // 使用缓存包装器
    return this.withCache(cacheKey, 3600, async () => {
      try {
        // 检查是否有有效的Tushare token
        const tushareConfig = (app.config && app.config.tushare) || {}
        const hasValidToken =
          tushareConfig.token &&
          tushareConfig.token !== 'demo_token' &&
          tushareConfig.token.length > 10

        if (hasValidToken) {
          // 使用Tushare API获取历史数据
          const response = await axios.post('http://api.tushare.pro', {
            api_name: 'daily',
            token: app.config.tushare.token,
            params: {
              ts_code: stockCode,
              start_date: startDate,
              end_date: endDate,
            },
          })

          if (response.data && response.data.data && response.data.data.items) {
            const historyData = response.data.data.items.map((item) => ({
              date: item[1],
              open: item[2],
              high: item[3],
              low: item[4],
              close: item[5],
              volume: item[9],
              amount: item[10],
              change: item[8],
            }))

            // 添加数据来源信息
            return {
              data: historyData,
              data_source: 'external_api',
              data_source_message: '数据来自Tushare API (daily)',
            }
          }
        }

        // 如果没有有效token或API调用失败，生成模拟历史数据
        ctx.logger.warn(`Tushare API不可用，为股票 ${stockCode} 生成模拟历史数据`)
        return this.generateMockHistoryData(stockCode, startDate, endDate)
      } catch (err) {
        ctx.logger.warn(`Tushare API调用失败: ${err.message}，为股票 ${stockCode} 生成模拟历史数据`)
        return this.generateMockHistoryData(stockCode, startDate, endDate)
      }
    })
  }

  // 生成模拟历史数据
  generateMockHistoryData(stockCode, startDate, endDate) {
    const { ctx } = this

    // 解析日期
    const start = new Date(startDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'))
    const end = new Date(endDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'))

    const historyData = []
    const basePrice = 10 + Math.random() * 90 // 基础价格 10-100
    let currentPrice = basePrice

    // 生成每日数据
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      // 跳过周末
      if (date.getDay() === 0 || date.getDay() === 6) continue

      // 模拟价格波动 (-3% 到 +3%)
      const changePercent = (Math.random() - 0.5) * 0.06
      const open = currentPrice
      const change = open * changePercent
      const close = open + change

      // 生成高低价
      const volatility = Math.random() * 0.02 // 0-2%的波动
      const high = Math.max(open, close) * (1 + volatility)
      const low = Math.min(open, close) * (1 - volatility)

      // 生成成交量 (随机)
      const volume = Math.floor(Math.random() * 1000000 + 100000)
      const amount = volume * ((high + low) / 2)

      historyData.push({
        date: date.toISOString().split('T')[0].replace(/-/g, ''),
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: volume,
        amount: parseFloat(amount.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
      })

      currentPrice = close
    }

    ctx.logger.info(`为股票 ${stockCode} 生成了 ${historyData.length} 条模拟历史数据`)

    return {
      data: historyData.reverse(), // 按日期倒序
      data_source: 'mock_data',
      data_source_message: `模拟历史数据 (${historyData.length}条记录)`,
    }
  }

  // 获取K线数据（用于技术指标计算）
  async getKlineData(stockCode, period = '1d', count = 100) {
    const { ctx } = this

    try {
      // 计算日期范围
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - count)

      const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '')
      const startDateStr = startDate.toISOString().split('T')[0].replace(/-/g, '')

      // 获取历史数据
      const historyResult = await this.getStockHistory(stockCode, startDateStr, endDateStr)

      if (historyResult && historyResult.data && historyResult.data.length > 0) {
        const data = historyResult.data

        // 转换为技术指标计算所需的格式
        return {
          open: data.map((item) => item.open),
          high: data.map((item) => item.high),
          low: data.map((item) => item.low),
          close: data.map((item) => item.close),
          volume: data.map((item) => item.volume),
          dates: data.map((item) => item.date),
        }
      } else {
        ctx.logger.warn(`无法获取股票 ${stockCode} 的K线数据`)
        return null
      }
    } catch (error) {
      ctx.logger.error(`获取股票 ${stockCode} K线数据失败:`, error)
      return null
    }
  }

  // 获取股票名称
  async getStockName(stockCode) {
    const { app, ctx } = this
    const cacheKey = `stock:name:${stockCode}`

    // 使用缓存包装器
    return this.withCache(cacheKey, 86400, async () => {
      // 24小时过期
      // 使用Tushare API获取股票基本信息
      const tushareToken =
        (app.config && app.config.tushare && app.config.tushare.token) || 'demo_token'
      const response = await axios.post('http://api.tushare.pro', {
        api_name: 'stock_basic',
        token: tushareToken,
        params: {
          ts_code: stockCode,
        },
      })

      if (
        response.data &&
        response.data.data &&
        response.data.data.items &&
        response.data.data.items.length > 0
      ) {
        const stockName = response.data.data.items[0][2] // 股票名称
        return {
          name: stockName,
          data_source: 'external_api',
          data_source_message: '数据来自Tushare API (stock_basic)',
        }
      }

      return {
        name: stockCode,
        data_source: 'external_api',
        data_source_message: '数据来自Tushare API (stock_basic)，但未获取到数据',
      }
    }).catch((err) => {
      ctx.logger.error('获取股票名称失败:', err)
      return {
        name: stockCode,
        data_source: 'error',
        data_source_message: `获取数据失败: ${err.message}`,
      }
    })
  }

  // 获取日期字符串 (offset: 0表示今天, -1表示昨天, 1表示明天)
  getDateString(offset = 0) {
    const date = new Date()
    date.setDate(date.getDate() + offset)

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}${month}${day}`
  }

  // 获取股票列表 - 优先从数据库获取
  async getStockList() {
    const { app, ctx } = this
    const cacheKey = 'stock:list:db'

    // 使用缓存包装器
    return this.withCache(cacheKey, 3600, async () => {
      // 1小时过期，因为数据库数据更稳定
      try {
        ctx.logger.info('开始获取股票列表（优先从数据库）...')

        // 直接从 stock_basic 表获取数据
        try {
          ctx.logger.info('从stock_basic表获取股票数据...')

          const rawQuery = `
            SELECT ts_code as tsCode, symbol, name, area, industry, market, list_date as listDate
            FROM stock_basic
            WHERE list_status = 'L' OR list_status IS NULL
            ORDER BY symbol ASC
            LIMIT 5000
          `

          const [results] = await app.model.query(rawQuery, {
            type: app.model.QueryTypes.SELECT,
          })

          if (results && results.length > 0) {
            ctx.logger.info(`从stock_basic表获取到 ${results.length} 条股票数据`)

            const stocks = results.map((stock) => ({
              symbol: stock.symbol || stock.tsCode,
              tsCode: stock.tsCode,
              name: stock.name,
              area: stock.area,
              industry: stock.industry || '未知',
              market: stock.market,
              listDate: stock.listDate,
            }))

            return {
              data: stocks,
              count: stocks.length,
              data_source: 'database_stock_basic',
              data_source_message: `数据来自stock_basic表，共 ${stocks.length} 条股票信息`,
            }
          } else {
            ctx.logger.warn('stock_basic表中没有股票数据，尝试从API获取并同步到数据库')
          }
        } catch (dbError) {
          ctx.logger.error('从stock_basic表获取股票列表失败:', dbError)
          ctx.logger.warn('数据库查询失败，尝试从API获取')
        }

        // 数据库没有数据或查询失败，从API获取并同步到数据库
        return await this.fetchAndSyncStockList()
      } catch (error) {
        ctx.logger.error('获取股票列表失败:', error)
        throw new Error(`获取股票列表失败: ${error.message}`)
      }
    }).catch((err) => {
      ctx.logger.error('获取股票列表失败:', err)
      // 返回空数组而不是抛出错误，但添加数据来源信息
      return {
        data: [],
        count: 0,
        data_source: 'error',
        data_source_message: `获取数据失败: ${err.message}`,
      }
    })
  }

  // 从API获取股票列表并同步到数据库
  async fetchAndSyncStockList() {
    const { ctx, app } = this

    try {
      ctx.logger.info('从Tushare API获取股票列表并同步到数据库...')

      // 构建请求数据
      const tushareToken =
        (app.config && app.config.tushare && app.config.tushare.token) || 'demo_token'
      const requestData = {
        api_name: 'stock_basic',
        token: tushareToken,
        params: {
          exchange: '',
          list_status: 'L',
          fields:
            'ts_code,symbol,name,area,industry,market,list_date,fullname,enname,cnspell,curr_type,list_status,delist_date,is_hs',
        },
      }

      // 发送请求
      const tushareApiUrl =
        (app.config && app.config.tushare && app.config.tushare.api_url) || 'http://api.tushare.pro'
      const response = await axios.post(tushareApiUrl, requestData, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        },
        timeout: 30000, // 30秒超时
      })

      // 检查响应
      if (!response.data || response.data.code !== 0 || !response.data.data) {
        ctx.logger.error('API响应数据为空或错误')
        throw new Error('Tushare API响应数据为空或错误')
      }

      const { fields, items } = response.data.data

      if (!fields || !items || items.length === 0) {
        ctx.logger.error('API响应数据格式不正确')
        throw new Error('Tushare API响应数据格式不正确')
      }

      // 解析字段索引
      const fieldIndexes = {
        tsCode: fields.indexOf('ts_code'),
        symbol: fields.indexOf('symbol'),
        name: fields.indexOf('name'),
        area: fields.indexOf('area'),
        industry: fields.indexOf('industry'),
        market: fields.indexOf('market'),
        listDate: fields.indexOf('list_date'),
        fullname: fields.indexOf('fullname'),
        enname: fields.indexOf('enname'),
        cnspell: fields.indexOf('cnspell'),
        currType: fields.indexOf('curr_type'),
        listStatus: fields.indexOf('list_status'),
        delistDate: fields.indexOf('delist_date'),
        isHs: fields.indexOf('is_hs'),
      }

      ctx.logger.info(`准备同步 ${items.length} 条股票数据到数据库`)

      // 批量同步到数据库
      const stocksToSync = items
        .map((item) => ({
          symbol: item[fieldIndexes.symbol] || '',
          tsCode: item[fieldIndexes.tsCode] || '',
          name: item[fieldIndexes.name] || '',
          area: item[fieldIndexes.area] || null,
          industry: item[fieldIndexes.industry] || null,
          market: item[fieldIndexes.market] || null,
          listDate: item[fieldIndexes.listDate] || null,
          fullname: item[fieldIndexes.fullname] || null,
          enname: item[fieldIndexes.enname] || null,
          cnspell: item[fieldIndexes.cnspell] || null,
          currType: item[fieldIndexes.currType] || null,
          listStatus: item[fieldIndexes.listStatus] || 'L',
          delistDate: item[fieldIndexes.delistDate] || null,
          isHs: item[fieldIndexes.isHs] || null,
        }))
        .filter((stock) => stock.symbol && stock.name) // 过滤掉无效数据

      // 使用事务批量插入或更新到 stock_basic 表
      const transaction = await app.model.transaction()
      try {
        // 先清空 stock_basic 表
        await app.model.query('DELETE FROM stock_basic', { transaction })

        // 批量插入到 stock_basic 表
        const stockBasicData = stocksToSync.map((stock) => [
          stock.tsCode,
          stock.symbol,
          stock.name,
          stock.area,
          stock.industry,
          stock.market,
          stock.listDate,
          stock.fullname,
          stock.enname,
          stock.cnspell,
          stock.currType,
          stock.listStatus,
          stock.delistDate,
          stock.isHs,
        ])

        if (stockBasicData.length > 0) {
          const insertQuery = `
            INSERT INTO stock_basic
            (ts_code, symbol, name, area, industry, market, list_date, fullname, enname, cnspell, curr_type, list_status, delist_date, is_hs)
            VALUES ?
          `

          await app.model.query(insertQuery, {
            replacements: [stockBasicData],
            transaction,
          })

          ctx.logger.info(`成功同步 ${stockBasicData.length} 条数据到stock_basic表`)
        }

        await transaction.commit()
        ctx.logger.info(`成功同步 ${stocksToSync.length} 条股票数据到stock_basic表`)

        // 返回格式化的数据
        const stocks = stocksToSync.map((stock) => ({
          symbol: stock.symbol,
          tsCode: stock.tsCode,
          name: stock.name,
          area: stock.area,
          industry: stock.industry || '未知',
          market: stock.market,
          listDate: stock.listDate,
        }))

        return {
          data: stocks,
          count: stocks.length,
          data_source: 'api_synced_to_stock_basic',
          data_source_message: `从Tushare API获取并同步到stock_basic表，共 ${stocks.length} 条股票信息`,
        }
      } catch (dbError) {
        await transaction.rollback()
        ctx.logger.error('同步股票数据到stock_basic表失败:', dbError)

        // 数据库同步失败，但API数据可用，直接返回API数据
        const stocks = stocksToSync.map((stock) => ({
          symbol: stock.symbol,
          tsCode: stock.tsCode,
          name: stock.name,
          area: stock.area,
          industry: stock.industry || '未知',
          market: stock.market,
          listDate: stock.listDate,
        }))

        return {
          data: stocks,
          count: stocks.length,
          data_source: 'api_only',
          data_source_message: `从Tushare API获取（stock_basic表同步失败），共 ${stocks.length} 条股票信息`,
        }
      }
    } catch (apiError) {
      ctx.logger.error('从API获取股票列表失败:', apiError)

      // API也失败了，尝试返回stock_basic表中的任何现有数据
      try {
        const rawQuery = `
          SELECT ts_code as tsCode, symbol, name, area, industry, market, list_date as listDate
          FROM stock_basic
          ORDER BY symbol ASC
          LIMIT 5000
        `

        const [results] = await app.model.query(rawQuery, {
          type: app.model.QueryTypes.SELECT,
        })

        if (results && results.length > 0) {
          ctx.logger.info(`API失败，使用stock_basic表中的 ${results.length} 条历史数据`)

          const stocks = results.map((stock) => ({
            symbol: stock.symbol || stock.tsCode,
            tsCode: stock.tsCode,
            name: stock.name,
            area: stock.area,
            industry: stock.industry || '未知',
            market: stock.market,
            listDate: stock.listDate,
          }))

          return {
            data: stocks,
            count: stocks.length,
            data_source: 'stock_basic_fallback',
            data_source_message: `API获取失败，使用stock_basic表历史数据，共 ${stocks.length} 条股票信息`,
          }
        }
      } catch (fallbackError) {
        ctx.logger.error('stock_basic表回退也失败:', fallbackError)
      }

      // 所有数据源都失败，抛出错误
      ctx.logger.error('所有数据源都失败，无法获取股票数据')
      throw new Error('所有数据源都失败，无法获取股票数据')
    }
  }

  // 已删除 getDefaultStockList 方法 - 禁止使用模拟数据

  // 测试 Redis 连接和数据存储
  async testRedisStorage() {
    const { app, ctx } = this
    const result = {
      success: false,
      redisAvailable: false,
      testData: null,
      error: null,
      data_source: 'redis_cache',
      data_source_message: 'Redis缓存测试',
    }

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        result.error = 'Redis 客户端不可用'
        result.data_source_message = 'Redis缓存不可用'
        return result
      }

      // 测试 Redis 连接
      try {
        if (typeof app.redis.ping === 'function') {
          await app.redis.ping()
          result.redisAvailable = true
        } else {
          result.error = 'Redis ping 方法不可用'
          result.data_source_message = 'Redis ping方法不存在'
          return result
        }
      } catch (pingErr) {
        result.error = `Redis 连接测试失败: ${pingErr.message}`
        result.data_source_message = 'Redis缓存连接失败'
        return result
      }

      // 生成测试数据
      const testData = {
        id: 'test-' + Date.now(),
        name: 'Redis 测试数据',
        timestamp: new Date().toISOString(),
        randomValue: Math.random().toFixed(4),
      }

      // 存储测试数据到 Redis
      const testKey = 'stock:test:redis-connection'
      if (typeof app.redis.set === 'function') {
        await app.redis.set(testKey, JSON.stringify(testData), 'EX', 300) // 5分钟过期
      } else {
        result.error = 'Redis set 方法不可用'
        result.data_source_message = 'Redis set方法不存在'
        return result
      }

      // 从 Redis 读取测试数据
      let storedData = null
      if (typeof app.redis.get === 'function') {
        storedData = await app.redis.get(testKey)
      } else {
        result.error = 'Redis get 方法不可用'
        result.data_source_message = 'Redis get方法不存在'
        return result
      }
      if (storedData) {
        result.testData = JSON.parse(storedData)
        result.success = true
        result.data_source_message = 'Redis缓存测试成功'
      } else {
        result.error = '无法从 Redis 读取测试数据'
        result.data_source_message = 'Redis缓存读取失败'
      }

      // 获取所有与股票相关的键
      if (typeof app.redis.keys === 'function') {
        const stockKeys = await app.redis.keys('stock:*')
        result.existingKeys = stockKeys
      } else {
        result.existingKeys = []
        ctx.logger.warn('Redis keys 方法不可用')
      }

      return result
    } catch (err) {
      ctx.logger.error('Redis 测试失败:', err)
      result.error = err.message || '未知错误'
      result.data_source_message = `Redis缓存测试失败: ${err.message}`
      return result
    }
  }

  // 主动存储股票数据到 Redis
  async storeStockDataToRedis(stockCode) {
    const { app, ctx } = this
    const result = {
      success: false,
      stockCode,
      data: null,
      error: null,
      data_source: 'redis_cache',
      data_source_message: '手动存储数据到Redis缓存',
    }

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        result.error = 'Redis 客户端不可用'
        result.data_source_message = 'Redis缓存不可用'
        return result
      }

      // 测试 Redis 连接
      try {
        await app.redis.ping()
      } catch (pingErr) {
        result.error = `Redis 连接测试失败: ${pingErr.message}`
        result.data_source_message = 'Redis缓存连接失败'
        return result
      }

      // 获取股票数据
      try {
        // 获取股票实时行情
        const quoteData = await this.getStockQuote(stockCode)
        if (quoteData) {
          // 手动存储到 Redis
          const quoteKey = `stock:quote:${stockCode}`
          const dataToCache = {
            ...quoteData,
            cacheTime: new Date().toISOString(),
            data_source: quoteData.data_source || 'external_api',
            data_source_message: quoteData.data_source_message || '数据来自外部API',
          }

          if (app.redis && typeof app.redis.set === 'function') {
            await app.redis.set(quoteKey, JSON.stringify(dataToCache), 'EX', 3600) // 1小时过期
            ctx.logger.info(`股票 ${stockCode} 行情数据已手动保存到 Redis 缓存`)
          }

          // 获取股票历史数据（最近30天）
          const historyData = await this.getStockHistory(
            stockCode,
            this.getDateString(-30), // 30天前
            this.getDateString(0) // 今天
          )

          let historyCount = 0
          if (historyData && historyData.data && historyData.data.length > 0) {
            const historyKey = `stock:history:${stockCode}:${this.getDateString(
              -30
            )}:${this.getDateString(0)}`
            await app.redis.set(historyKey, JSON.stringify(historyData), 'EX', 3600) // 1小时过期
            ctx.logger.info(`股票 ${stockCode} 历史数据已手动保存到 Redis 缓存`)
            historyCount = historyData.data.length
          }

          // 获取股票名称
          const stockNameResult = await this.getStockName(stockCode)
          const stockName =
            stockNameResult && stockNameResult.name ? stockNameResult.name : stockCode

          if (stockName) {
            const nameKey = `stock:name:${stockCode}`
            await app.redis.set(nameKey, JSON.stringify(stockNameResult), 'EX', 86400) // 24小时过期
            ctx.logger.info(`股票 ${stockCode} 名称已手动保存到 Redis 缓存`)
          }

          // 获取所有与该股票相关的键
          let stockKeys = []
          if (app.redis && typeof app.redis.keys === 'function') {
            stockKeys = await app.redis.keys(`stock:*:${stockCode}*`)
          }

          result.success = true
          result.data = {
            quote: quoteData,
            history: historyCount,
            name: stockName,
            keys: stockKeys,
          }
          result.data_source_message = '数据已成功存储到Redis缓存'
        } else {
          result.error = `无法获取股票 ${stockCode} 的数据`
          result.data_source_message = '获取股票数据失败，无法存储到缓存'
        }
      } catch (dataErr) {
        result.error = `获取股票数据失败: ${dataErr.message}`
        result.data_source_message = `获取股票数据失败: ${dataErr.message}`
        ctx.logger.error('获取股票数据失败:', dataErr)
      }

      return result
    } catch (err) {
      ctx.logger.error('存储股票数据到 Redis 失败:', err)
      result.error = err.message || '未知错误'
      result.data_source_message = `存储数据到Redis缓存失败: ${err.message}`
      return result
    }
  }

  // 批量存储多只股票数据到 Redis
  async storeAllStocksToRedis(stockCodes) {
    const { app, ctx } = this
    const result = {
      success: false,
      totalStocks: stockCodes.length,
      successCount: 0,
      failedCount: 0,
      processedStocks: [],
      error: null,
      data_source: 'redis_cache',
      data_source_message: '批量存储数据到Redis缓存',
    }

    try {
      // 检查 Redis 是否可用
      if (!app.redis) {
        result.error = 'Redis 客户端不可用'
        result.data_source_message = 'Redis缓存不可用'
        return result
      }

      // 测试 Redis 连接
      try {
        await app.redis.ping()
      } catch (pingErr) {
        result.error = `Redis 连接测试失败: ${pingErr.message}`
        result.data_source_message = 'Redis缓存连接失败'
        return result
      }

      // 批量处理股票
      const startTime = Date.now()

      // 限制并发请求数量，避免请求过多导致API限流
      const concurrentLimit = 5
      const chunks = []

      // 将股票代码分成多个小组，每组最多 concurrentLimit 个
      for (let i = 0; i < stockCodes.length; i += concurrentLimit) {
        chunks.push(stockCodes.slice(i, i + concurrentLimit))
      }

      // 逐组处理股票
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const chunkPromises = chunk.map(async (stockCode) => {
          try {
            // 获取并存储股票数据
            const stockResult = await this.storeStockDataToRedis(stockCode)

            return {
              stockCode,
              success: stockResult.success,
              error: stockResult.error,
              data_source: stockResult.data_source || 'redis_cache',
              data_source_message: stockResult.data_source_message || '数据已存储到Redis缓存',
              data: stockResult.success
                ? {
                    name: stockResult.data.name,
                    historyCount: stockResult.data.history,
                  }
                : null,
            }
          } catch (err) {
            ctx.logger.error(`处理股票 ${stockCode} 时出错:`, err)
            return {
              stockCode,
              success: false,
              error: err.message || '未知错误',
              data_source: 'error',
              data_source_message: `处理失败: ${err.message}`,
              data: null,
            }
          }
        })

        // 等待当前组的所有请求完成
        const chunkResults = await Promise.all(chunkPromises)

        // 更新结果
        chunkResults.forEach((stockResult) => {
          result.processedStocks.push(stockResult)
          if (stockResult.success) {
            result.successCount++
          } else {
            result.failedCount++
          }
        })

        // 每组处理完后稍微暂停一下，避免请求过于频繁
        if (i < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      const endTime = Date.now()
      const totalTime = (endTime - startTime) / 1000

      result.success = true
      result.totalTime = totalTime
      result.averageTimePerStock = totalTime / stockCodes.length
      result.data_source_message = `成功存储${result.successCount}/${result.totalStocks}只股票数据到Redis缓存`

      return result
    } catch (err) {
      ctx.logger.error('批量存储股票数据到 Redis 失败:', err)
      result.error = err.message || '未知错误'
      result.data_source_message = `批量存储数据到Redis缓存失败: ${err.message}`
      return result
    }
  }

  // 获取行业列表
  async getIndustryList() {
    const { app, ctx } = this
    const cacheKey = 'stock:industry_list'

    return this.withCache(cacheKey, 86400, async () => {
      // 24小时过期
      try {
        // 使用Tushare API获取申万行业分类
        ctx.logger.info('开始获取行业列表...')
        const response = await axios.post('http://api.tushare.pro', {
          api_name: 'index_classify',
          token: app.config.tushare.token,
          params: {
            level: 'L1', // 一级行业
            src: 'SW2021', // 申万2021版本
          },
        })

        // 输出调试信息
        ctx.logger.info(`Tushare API响应: ${JSON.stringify(response.data)}`)

        if (response.data && response.data.data && response.data.data.items) {
          const items = response.data.data.items
          const fields = response.data.data.fields

          const industries = items.map((item) => {
            const record = {}
            fields.forEach((field, index) => {
              record[field] = item[index]
            })

            return {
              code: record.index_code,
              name: record.industry_name,
              level: record.level,
              parent_code: record.parent_code,
              industry_code: record.industry_code,
              is_pub: record.is_pub,
              data_source: 'external_api',
              data_source_message: '数据来自Tushare API (index_classify)',
            }
          })

          return {
            data: industries,
            data_source: 'external_api',
            data_source_message: '数据来自Tushare API (index_classify)',
          }
        }

        // 如果API返回数据但没有items，可能是权限问题，检查错误信息
        if (response.data && response.data.msg) {
          const errorMsg = response.data.msg
          if (errorMsg.includes('积分') || errorMsg.includes('权限')) {
            ctx.logger.warn(`Tushare API权限不足: ${errorMsg}，使用默认行业列表`)
            // 直接返回默认行业列表
            return {
              data: [
                { code: '801010.SI', name: '农林牧渔', level: 'L1' },
                { code: '801030.SI', name: '基础化工', level: 'L1' },
                { code: '801040.SI', name: '钢铁', level: 'L1' },
                { code: '801050.SI', name: '有色金属', level: 'L1' },
                { code: '801080.SI', name: '电子', level: 'L1' },
                { code: '801110.SI', name: '家用电器', level: 'L1' },
                { code: '801120.SI', name: '食品饮料', level: 'L1' },
                { code: '801130.SI', name: '纺织服饰', level: 'L1' },
                { code: '801140.SI', name: '轻工制造', level: 'L1' },
                { code: '801150.SI', name: '医药生物', level: 'L1' },
                { code: '801160.SI', name: '公用事业', level: 'L1' },
                { code: '801170.SI', name: '交通运输', level: 'L1' },
                { code: '801180.SI', name: '房地产', level: 'L1' },
                { code: '801200.SI', name: '商贸零售', level: 'L1' },
                { code: '801210.SI', name: '社会服务', level: 'L1' },
                { code: '801710.SI', name: '建筑材料', level: 'L1' },
                { code: '801720.SI', name: '建筑装饰', level: 'L1' },
                { code: '801730.SI', name: '电力设备', level: 'L1' },
                { code: '801750.SI', name: '计算机', level: 'L1' },
                { code: '801760.SI', name: '传媒', level: 'L1' },
                { code: '801770.SI', name: '通信', level: 'L1' },
                { code: '801780.SI', name: '银行', level: 'L1' },
                { code: '801790.SI', name: '非银金融', level: 'L1' },
                { code: '801880.SI', name: '汽车', level: 'L1' },
                { code: '801890.SI', name: '机械设备', level: 'L1' },
                { code: '801740.SI', name: '国防军工', level: 'L1' },
                { code: '801950.SI', name: '煤炭', level: 'L1' },
                { code: '801960.SI', name: '石油石化', level: 'L1' },
                { code: '801970.SI', name: '环保', level: 'L1' },
                { code: '801980.SI', name: '美容护理', level: 'L1' },
                { code: '801230.SI', name: '综合', level: 'L1' },
              ],
              data_source: 'fallback',
              data_source_message: `Tushare API权限不足: ${errorMsg}，使用默认申万2021版一级行业列表`,
            }
          }
        }

        return {
          data: [],
          data_source: 'external_api',
          data_source_message: '数据来自Tushare API (index_classify)，但未获取到数据',
        }
      } catch (err) {
        ctx.logger.error('获取行业列表失败:', err)

        // 如果是积分不足或权限问题，返回更详细的错误信息
        if (err.response && err.response.data) {
          const errorMsg = err.response.data.msg || err.message
          if (errorMsg.includes('积分') || errorMsg.includes('权限')) {
            ctx.logger.warn(`Tushare API权限不足: ${errorMsg}，使用默认行业列表`)
          }
        }
        // 返回默认申万2021版一级行业列表
        return {
          data: [
            { code: '801010.SI', name: '农林牧渔', level: 'L1' },
            { code: '801030.SI', name: '基础化工', level: 'L1' },
            { code: '801040.SI', name: '钢铁', level: 'L1' },
            { code: '801050.SI', name: '有色金属', level: 'L1' },
            { code: '801080.SI', name: '电子', level: 'L1' },
            { code: '801110.SI', name: '家用电器', level: 'L1' },
            { code: '801120.SI', name: '食品饮料', level: 'L1' },
            { code: '801130.SI', name: '纺织服饰', level: 'L1' },
            { code: '801140.SI', name: '轻工制造', level: 'L1' },
            { code: '801150.SI', name: '医药生物', level: 'L1' },
            { code: '801160.SI', name: '公用事业', level: 'L1' },
            { code: '801170.SI', name: '交通运输', level: 'L1' },
            { code: '801180.SI', name: '房地产', level: 'L1' },
            { code: '801200.SI', name: '商贸零售', level: 'L1' },
            { code: '801210.SI', name: '社会服务', level: 'L1' },
            { code: '801710.SI', name: '建筑材料', level: 'L1' },
            { code: '801720.SI', name: '建筑装饰', level: 'L1' },
            { code: '801730.SI', name: '电力设备', level: 'L1' },
            { code: '801750.SI', name: '计算机', level: 'L1' },
            { code: '801760.SI', name: '传媒', level: 'L1' },
            { code: '801770.SI', name: '通信', level: 'L1' },
            { code: '801780.SI', name: '银行', level: 'L1' },
            { code: '801790.SI', name: '非银金融', level: 'L1' },
            { code: '801880.SI', name: '汽车', level: 'L1' },
            { code: '801890.SI', name: '机械设备', level: 'L1' },
            { code: '801740.SI', name: '国防军工', level: 'L1' },
            { code: '801950.SI', name: '煤炭', level: 'L1' },
            { code: '801960.SI', name: '石油石化', level: 'L1' },
            { code: '801970.SI', name: '环保', level: 'L1' },
            { code: '801980.SI', name: '美容护理', level: 'L1' },
            { code: '801230.SI', name: '综合', level: 'L1' },
          ],
          data_source: 'fallback',
          data_source_message: `使用默认申万2021版一级行业列表，因为API调用失败: ${err.message}`,
        }
      }
    })
  }

  // 获取热门股票
  async getHotStocks(limit = 50) {
    const { app, ctx } = this
    const cacheKey = `stock:hot_stocks:${limit}`

    return this.withCache(cacheKey, 1800, async () => {
      // 30分钟过期
      try {
        // 获取最近的交易日（尝试最近5天）
        let tradeDate = null
        let response = null

        for (let i = 0; i <= 5; i++) {
          tradeDate = this.getDateString(-i)
          ctx.logger.info(`尝试获取 ${tradeDate} 的热门股票数据...`)

          // 使用Tushare API获取热门股票（通过成交量排序）
          response = await axios.post('http://api.tushare.pro', {
            api_name: 'daily',
            token: (app.config && app.config.tushare && app.config.tushare.token) || 'demo_token',
            params: {
              trade_date: tradeDate,
              limit: limit,
            },
          })

          // 如果有数据，跳出循环
          if (
            response.data &&
            response.data.data &&
            response.data.data.items &&
            response.data.data.items.length > 0
          ) {
            ctx.logger.info(
              `找到 ${tradeDate} 的交易数据，共 ${response.data.data.items.length} 条`
            )
            break
          }
        }

        if (response.data && response.data.data && response.data.data.items) {
          const hotStocks = response.data.data.items
            .filter((item) => item[9] > 0) // 过滤掉成交量为0的股票
            .sort((a, b) => b[9] - a[9]) // 按成交量降序排序
            .slice(0, limit)

          // 获取每只股票的订单簿数据
          const stocksWithOrderBook = await Promise.all(
            hotStocks.map(async (item) => {
              try {
                const orderBook = await ctx.service.orderBook.getDepth(3)
                return {
                  symbol: item[0],
                  name: '', // 需要单独获取股票名称
                  volume: item[9],
                  amount: item[10],
                  price: item[5],
                  change: item[8],
                  orderBook, // 添加订单簿数据
                  data_source: 'external_api',
                  data_source_message: '数据来自Tushare API (daily)',
                }
              } catch (err) {
                ctx.logger.warn(`获取股票 ${item[0]} 订单簿失败:`, err)
                return {
                  symbol: item[0],
                  name: '',
                  volume: item[9],
                  amount: item[10],
                  price: item[5],
                  change: item[8],
                  orderBook: null, // 订单簿获取失败
                  data_source: 'external_api',
                  data_source_message: '数据来自Tushare API (daily)',
                }
              }
            })
          )

          return {
            data: stocksWithOrderBook,
            data_source: 'external_api',
            data_source_message: '数据来自Tushare API (daily)',
          }
        }

        // 如果没有获取到数据，返回默认热门股票列表
        ctx.logger.warn('Tushare API未返回热门股票数据，使用默认列表')
        return {
          data: [
            { symbol: '000001.SZ', name: '平安银行' },
            { symbol: '000002.SZ', name: '万科A' },
            { symbol: '000858.SZ', name: '五粮液' },
            { symbol: '000876.SZ', name: '新希望' },
            { symbol: '002415.SZ', name: '海康威视' },
            { symbol: '002594.SZ', name: '比亚迪' },
            { symbol: '300059.SZ', name: '东方财富' },
            { symbol: '300750.SZ', name: '宁德时代' },
            { symbol: '600000.SH', name: '浦发银行' },
            { symbol: '600036.SH', name: '招商银行' },
            { symbol: '600519.SH', name: '贵州茅台' },
            { symbol: '600887.SH', name: '伊利股份' },
            { symbol: '601318.SH', name: '中国平安' },
            { symbol: '601398.SH', name: '工商银行' },
            { symbol: '601939.SH', name: '建设银行' },
          ],
          data_source: 'fallback',
          data_source_message: '使用默认热门股票列表（Tushare API未返回数据）',
        }
      } catch (err) {
        ctx.logger.error('获取热门股票失败:', err)
        // 返回默认热门股票列表
        return {
          data: [
            { symbol: '000001.SZ', name: '平安银行' },
            { symbol: '000002.SZ', name: '万科A' },
            { symbol: '000858.SZ', name: '五粮液' },
            { symbol: '000876.SZ', name: '新希望' },
            { symbol: '002415.SZ', name: '海康威视' },
            { symbol: '002594.SZ', name: '比亚迪' },
            { symbol: '300059.SZ', name: '东方财富' },
            { symbol: '300750.SZ', name: '宁德时代' },
            { symbol: '600000.SH', name: '浦发银行' },
            { symbol: '600036.SH', name: '招商银行' },
            { symbol: '600519.SH', name: '贵州茅台' },
            { symbol: '600887.SH', name: '伊利股份' },
            { symbol: '601318.SH', name: '中国平安' },
            { symbol: '601398.SH', name: '工商银行' },
            { symbol: '601939.SH', name: '建设银行' },
          ],
          data_source: 'fallback',
          data_source_message: '使用默认热门股票列表（API调用失败）',
        }
      }
    })
  }

  // 获取指数行情
  async getIndexQuote(indexCode) {
    const { app, ctx } = this
    const cacheKey = `index:quote:${indexCode}`

    return this.withCache(cacheKey, 300, async () => {
      // 5分钟过期
      try {
        ctx.logger.info(`开始获取指数 ${indexCode} 行情...`)

        // 使用Tushare API获取指数行情
        const response = await axios.post('http://api.tushare.pro', {
          api_name: 'index_daily',
          token: app.config.tushare.token,
          params: {
            ts_code: indexCode,
            trade_date: this.getDateString(0),
          },
        })

        // 输出调试信息
        ctx.logger.info(`指数 ${indexCode} Tushare API响应: ${JSON.stringify(response.data)}`)

        // 检查API权限错误
        if (
          response.data &&
          response.data.msg &&
          (response.data.msg.includes('积分') || response.data.msg.includes('权限'))
        ) {
          ctx.logger.error(`Tushare API权限不足: ${response.data.msg}`)
          throw new Error(`Tushare API权限不足: ${response.data.msg}`)
        }

        if (
          response.data &&
          response.data.data &&
          response.data.data.items &&
          response.data.data.items.length > 0
        ) {
          const indexData = response.data.data.items[0]
          const indexName = await this.getIndexName(indexCode)

          const quote = {
            code: indexCode,
            name: indexName.name || indexCode,
            price: indexData[5], // 收盘价
            open: indexData[2], // 开盘价
            high: indexData[3], // 最高价
            low: indexData[4], // 最低价
            volume: indexData[6], // 成交量
            amount: indexData[7], // 成交额
            change: indexData[8], // 涨跌幅
            date: indexData[1], // 日期
            data_source: 'external_api',
            data_source_message: '数据来自Tushare API (index_daily)',
          }

          return quote
        }

        // 如果没有数据，抛出错误
        ctx.logger.error(`指数 ${indexCode} 未获取到数据`)
        throw new Error(`指数 ${indexCode} 未获取到数据`)
      } catch (err) {
        ctx.logger.error(`获取指数 ${indexCode} 行情失败:`, err)

        // 如果是积分不足或权限问题，抛出错误
        if (err.response && err.response.data) {
          const errorMsg = err.response.data.msg || err.message
          if (errorMsg.includes('积分') || errorMsg.includes('权限')) {
            ctx.logger.error(`Tushare API权限不足: ${errorMsg}`)
            throw new Error(`Tushare API权限不足: ${errorMsg}`)
          }
        }

        // 其他错误也抛出，不使用默认数据
        ctx.logger.error(`指数 ${indexCode} 获取失败: ${err.message}`)
        throw new Error(`指数 ${indexCode} 获取失败: ${err.message}`)
      }
    })
  }

  // 已删除 getDefaultIndexQuote 方法 - 禁止使用模拟数据

  // 获取指数名称
  async getIndexName(indexCode) {
    const { app, ctx } = this
    const cacheKey = `index:name:${indexCode}`

    return this.withCache(cacheKey, 86400, async () => {
      // 24小时过期
      try {
        // 使用Tushare API获取指数基本信息
        const tushareToken =
          (app.config && app.config.tushare && app.config.tushare.token) || 'demo_token'
        const response = await axios.post('http://api.tushare.pro', {
          api_name: 'index_basic',
          token: tushareToken,
          params: {
            ts_code: indexCode,
          },
        })

        // 检查API权限错误
        if (
          response.data &&
          response.data.msg &&
          (response.data.msg.includes('积分') || response.data.msg.includes('权限'))
        ) {
          ctx.logger.error(`Tushare API权限不足: ${response.data.msg}`)
          throw new Error(`Tushare API权限不足: ${response.data.msg}`)
        }

        if (
          response.data &&
          response.data.data &&
          response.data.data.items &&
          response.data.data.items.length > 0
        ) {
          const indexName = response.data.data.items[0][2] // 指数名称
          return {
            name: indexName,
            data_source: 'external_api',
            data_source_message: '数据来自Tushare API (index_basic)',
          }
        }

        // 如果没有数据，抛出错误
        throw new Error(`指数 ${indexCode} 基本信息未获取到数据`)
      } catch (err) {
        ctx.logger.error('获取指数名称失败:', err)

        // 如果是积分不足或权限问题，抛出错误
        if (err.response && err.response.data) {
          const errorMsg = err.response.data.msg || err.message
          if (errorMsg.includes('积分') || errorMsg.includes('权限')) {
            ctx.logger.error(`Tushare API权限不足: ${errorMsg}`)
            throw new Error(`Tushare API权限不足: ${errorMsg}`)
          }
        }

        // 其他错误也抛出
        throw new Error(`获取指数名称失败: ${err.message}`)
      }
    })
  }

  // 已删除 getDefaultIndexName 方法 - 禁止使用模拟数据

  // 获取用户关注的股票
  async getUserWatchlistStocks() {
    const { ctx } = this

    try {
      // 从关注列表服务获取所有用户的关注股票
      const watchlistStocks = await ctx.service.watchlist.getAllWatchlistStocks()

      return watchlistStocks.map((stock) => ({
        symbol: stock.symbol,
        name: stock.name || stock.symbol,
        data_source: 'database',
        data_source_message: '数据来自用户关注列表',
      }))
    } catch (err) {
      ctx.logger.error('获取用户关注股票失败:', err)
      return []
    }
  }

  // 获取股票数量统计
  async getStockCount() {
    const { ctx } = this

    try {
      // 检查 Stock 模型是否存在
      if (ctx.model.Stock) {
        // 使用 Sequelize 模型获取股票数量
        const count = await ctx.model.Stock.count()
        return count
      } else {
        // 如果模型不存在，尝试直接查询
        const result = await ctx.app.mysql.query('SELECT COUNT(*) as count FROM stocks')
        return result[0]?.count || 0
      }
    } catch (err) {
      ctx.logger.error('获取股票数量失败:', err)
      // 返回一个默认值，避免阻塞其他功能
      return 0
    }
  }

  // 获取行业数据
  async getIndustryData(industryCode) {
    const { app, ctx } = this
    const cacheKey = `industry:data:${industryCode}`

    return this.withCache(cacheKey, 3600, async () => {
      // 1小时过期
      try {
        // 使用Tushare API获取申万行业指数日行情
        const response = await axios.post('http://api.tushare.pro', {
          api_name: 'sw_daily',
          token: app.config.tushare.token,
          params: {
            ts_code: industryCode,
            trade_date: this.getDateString(0), // 今天
          },
        })

        if (
          response.data &&
          response.data.data &&
          response.data.data.items &&
          response.data.data.items.length > 0
        ) {
          const item = response.data.data.items[0]
          const fields = response.data.data.fields

          // 构建字段映射
          const record = {}
          fields.forEach((field, index) => {
            record[field] = item[index]
          })

          const industryData = {
            code: industryCode,
            name: record.name || industryCode,
            change: record.change || 0,
            changePercent: record.pct_change || 0,
            volume: record.vol || 0,
            turnover: record.amount || 0,
            open: record.open || 0,
            close: record.close || 0,
            high: record.high || 0,
            low: record.low || 0,
            pe: record.pe || 0,
            pb: record.pb || 0,
            total_mv: record.total_mv || 0,
            float_mv: record.float_mv || 0,
            leadingStocks: [], // 申万行业指数API不提供成分股信息
            laggingStocks: [],
            data_source: 'external_api',
            data_source_message: '数据来自Tushare API (sw_daily)',
          }

          return industryData
        }

        return {
          code: industryCode,
          name: industryCode,
          change: 0,
          changePercent: 0,
          volume: 0,
          turnover: 0,
          leadingStocks: [],
          laggingStocks: [],
          data_source: 'external_api',
          data_source_message: '数据来自Tushare API (sw_daily)，但未获取到数据',
        }
      } catch (err) {
        ctx.logger.error(`获取行业 ${industryCode} 数据失败:`, err)

        // 如果是积分不足或权限问题，返回更详细的错误信息
        if (err.response && err.response.data) {
          const errorMsg = err.response.data.msg || err.message
          if (errorMsg.includes('积分') || errorMsg.includes('权限')) {
            return {
              code: industryCode,
              name: industryCode,
              change: 0,
              changePercent: 0,
              volume: 0,
              turnover: 0,
              leadingStocks: [],
              laggingStocks: [],
              data_source: 'tushare_error',
              data_source_message: `Tushare API权限不足: ${errorMsg}，需要至少5000积分才能调用申万行业指数接口`,
            }
          }
        }

        return {
          code: industryCode,
          name: industryCode,
          change: 0,
          changePercent: 0,
          volume: 0,
          turnover: 0,
          leadingStocks: [],
          laggingStocks: [],
          data_source: 'error',
          data_source_message: `获取数据失败: ${err.message}`,
        }
      }
    })
  }

  // 获取涨停股票
  async getLimitUpStocks(limit = 50) {
    const { ctx, app } = this
    const cacheKey = `tushare:limit_up_stocks:${this.getDateString(0)}`

    return this.withCache(cacheKey, 1800, async () => {
      // 30分钟过期
      try {
        ctx.logger.info('获取涨停股票数据...')

        // 调用Tushare涨跌停列表API
        const response = await axios.post('http://api.tushare.pro', {
          api_name: 'limit_list_d',
          token: app.config.tushare.token,
          params: {
            trade_date: this.getDateString(0), // 今天
            limit_type: 'U', // U表示涨停
          },
        })

        if (response.data && response.data.data && response.data.data.items) {
          const items = response.data.data.items
          const fields = response.data.data.fields

          const limitUpStocks = items
            .map((item) => {
              const record = {}
              fields.forEach((field, index) => {
                record[field] = item[index]
              })
              return record
            })
            .slice(0, limit) // 限制返回数量

          return {
            data: limitUpStocks,
            data_source: 'tushare',
            data_source_message: `数据来自Tushare API (limit_list_d)，共${limitUpStocks.length}只涨停股票`,
          }
        } else {
          return {
            data: [],
            data_source: 'tushare',
            data_source_message: 'Tushare API返回数据格式异常',
          }
        }
      } catch (error) {
        ctx.logger.error('获取涨停股票失败:', error)

        // 如果是积分不足或权限问题，返回更详细的错误信息
        if (error.response && error.response.data) {
          const errorMsg = error.response.data.msg || error.message
          if (errorMsg.includes('积分') || errorMsg.includes('权限')) {
            return {
              data: [],
              data_source: 'tushare_error',
              data_source_message: `Tushare API权限不足: ${errorMsg}，需要至少5000积分才能调用涨跌停接口`,
            }
          }
        }

        return {
          data: [],
          data_source: 'error',
          data_source_message: `获取涨停股票数据失败: ${error.message}`,
        }
      }
    })
  }

  // 获取跌停股票
  async getLimitDownStocks(limit = 50) {
    const { ctx, app } = this
    const cacheKey = `tushare:limit_down_stocks:${this.getDateString(0)}`

    return this.withCache(cacheKey, 1800, async () => {
      // 30分钟过期
      try {
        ctx.logger.info('获取跌停股票数据...')

        // 调用Tushare涨跌停列表API
        const response = await axios.post('http://api.tushare.pro', {
          api_name: 'limit_list_d',
          token: app.config.tushare.token,
          params: {
            trade_date: this.getDateString(0), // 今天
            limit_type: 'D', // D表示跌停
          },
        })

        if (response.data && response.data.data && response.data.data.items) {
          const items = response.data.data.items
          const fields = response.data.data.fields

          const limitDownStocks = items
            .map((item) => {
              const record = {}
              fields.forEach((field, index) => {
                record[field] = item[index]
              })
              return record
            })
            .slice(0, limit) // 限制返回数量

          return {
            data: limitDownStocks,
            data_source: 'tushare',
            data_source_message: `数据来自Tushare API (limit_list_d)，共${limitDownStocks.length}只跌停股票`,
          }
        } else {
          return {
            data: [],
            data_source: 'tushare',
            data_source_message: 'Tushare API返回数据格式异常',
          }
        }
      } catch (error) {
        ctx.logger.error('获取跌停股票失败:', error)

        // 如果是积分不足或权限问题，返回更详细的错误信息
        if (error.response && error.response.data) {
          const errorMsg = error.response.data.msg || error.message
          if (errorMsg.includes('积分') || errorMsg.includes('权限')) {
            return {
              data: [],
              data_source: 'tushare_error',
              data_source_message: `Tushare API权限不足: ${errorMsg}，需要至少5000积分才能调用涨跌停接口`,
            }
          }
        }

        return {
          data: [],
          data_source: 'error',
          data_source_message: `获取跌停股票数据失败: ${error.message}`,
        }
      }
    })
  }

  // 获取资金流向数据
  async getMoneyFlow(limit = 100) {
    const { ctx, app } = this
    const cacheKey = `tushare:money_flow:${this.getDateString(0)}`

    return this.withCache(cacheKey, 1800, async () => {
      // 30分钟过期
      try {
        ctx.logger.info('获取资金流向数据...')

        // 获取沪深港通资金流向数据
        const hsgtResponse = await axios.post('http://api.tushare.pro', {
          api_name: 'moneyflow_hsgt',
          token: app.config.tushare.token,
          params: {
            trade_date: this.getDateString(0), // 今天
          },
        })

        let hsgtData = []
        if (hsgtResponse.data && hsgtResponse.data.data && hsgtResponse.data.data.items) {
          const items = hsgtResponse.data.data.items
          if (items.length > 0) {
            const item = items[0] // 取最新一条数据
            hsgtData = [
              {
                type: 'hsgt',
                name: '沪深港通资金流向',
                trade_date: item[0],
                north_money: item[5] || 0, // 北向资金
                south_money: item[6] || 0, // 南向资金
                hgt: item[3] || 0, // 沪股通
                sgt: item[4] || 0, // 深股通
                ggt_ss: item[1] || 0, // 港股通(上海)
                ggt_sz: item[2] || 0, // 港股通(深圳)
              },
            ]
          }
        }

        // 获取热门股票的资金流向数据
        const hotStocks = ['000001.SZ', '000002.SZ', '600036.SH', '600519.SH', '000858.SZ']
        const stockMoneyFlow = []

        for (const stock of hotStocks.slice(0, Math.min(limit - hsgtData.length, 10))) {
          try {
            const stockResponse = await axios.post('http://api.tushare.pro', {
              api_name: 'moneyflow',
              token: app.config.tushare.token,
              params: {
                ts_code: stock,
                trade_date: this.getDateString(0),
              },
            })

            if (stockResponse.data && stockResponse.data.data && stockResponse.data.data.items) {
              const items = stockResponse.data.data.items
              if (items.length > 0) {
                const item = items[0]
                stockMoneyFlow.push({
                  type: 'stock',
                  ts_code: item[0],
                  name: stock,
                  trade_date: item[1],
                  net_mf_amount: item[18] || 0, // 净流入额(万元)
                  buy_lg_amount: item[10] || 0, // 大单买入金额
                  sell_lg_amount: item[12] || 0, // 大单卖出金额
                  buy_elg_amount: item[14] || 0, // 特大单买入金额
                  sell_elg_amount: item[16] || 0, // 特大单卖出金额
                })
              }
            }
          } catch (stockError) {
            ctx.logger.warn(`获取股票${stock}资金流向失败:`, stockError.message)
          }
        }

        const allData = [...hsgtData, ...stockMoneyFlow]

        return {
          data: allData,
          data_source: 'tushare',
          data_source_message: `数据来自Tushare API，包含${hsgtData.length}条沪深港通数据和${stockMoneyFlow.length}条个股数据`,
        }
      } catch (error) {
        ctx.logger.error('获取资金流向数据失败:', error)

        // 如果是积分不足或权限问题，返回更详细的错误信息
        if (error.response && error.response.data) {
          const errorMsg = error.response.data.msg || error.message
          if (errorMsg.includes('积分') || errorMsg.includes('权限')) {
            return {
              data: [],
              data_source: 'tushare_error',
              data_source_message: `Tushare API权限不足: ${errorMsg}，需要至少2000积分才能调用资金流向接口`,
            }
          }
        }

        return {
          data: [],
          data_source: 'error',
          data_source_message: `获取资金流向数据失败: ${error.message}`,
        }
      }
    })
  }

  // 模拟涨停股票数据生成函数已移除

  // 模拟跌停股票数据生成函数已移除

  // 模拟资金流向数据生成函数已移除
}

module.exports = StockService
