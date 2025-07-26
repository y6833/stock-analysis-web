'use strict'

const Controller = require('egg').Controller

class StockController extends Controller {
  // 批量获取股票实时行情
  async getBatchQuotes() {
    const { ctx, service } = this
    const { symbols } = ctx.request.body

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '请提供股票代码数组',
        error: 'symbols参数必须是非空数组',
      }
      return
    }

    // 限制批量请求数量
    const maxBatchSize = 50
    const limitedSymbols = symbols.slice(0, maxBatchSize)

    // 获取数据源参数
    const dataSource = ctx.query.source || ctx.headers['x-data-source'] || 'tushare'

    ctx.logger.info(`批量获取 ${limitedSymbols.length} 只股票行情，数据源: ${dataSource}`)

    try {
      const quotes = {}
      const errors = {}

      // 并行获取所有股票行情，但限制并发数
      const batchSize = 10
      for (let i = 0; i < limitedSymbols.length; i += batchSize) {
        const batch = limitedSymbols.slice(i, i + batchSize)

        const batchPromises = batch.map(async (symbol) => {
          try {
            const quote = await service.stock.getStockQuote(symbol)
            return { symbol, quote, success: true }
          } catch (error) {
            ctx.logger.warn(`获取股票 ${symbol} 行情失败:`, error.message)
            return { symbol, error: error.message, success: false }
          }
        })

        const batchResults = await Promise.allSettled(batchPromises)

        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            const { symbol, quote, error, success } = result.value
            if (success) {
              quotes[symbol] = quote
            } else {
              errors[symbol] = error
            }
          } else {
            // Promise rejected
            ctx.logger.error('批量获取行情Promise失败:', result.reason)
          }
        })

        // 添加小延迟避免API限制
        if (i + batchSize < limitedSymbols.length) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      ctx.body = {
        success: true,
        quotes,
        errors,
        total: limitedSymbols.length,
        successful: Object.keys(quotes).length,
        failed: Object.keys(errors).length,
        data_source: dataSource,
        data_source_message: `批量获取行情数据，数据源: ${dataSource}`,
      }
    } catch (err) {
      ctx.status = 500
      ctx.body = {
        success: false,
        message: '批量获取股票行情失败',
        error: err.message || '未知错误',
        data_source: 'error',
        data_source_message: `批量获取行情失败: ${err.message}`,
      }
      ctx.logger.error(err)
    }
  }

  // 获取股票实时行情
  async getQuote() {
    const { ctx, service } = this
    const stockCode = ctx.params.code

    // 获取数据源参数
    const dataSource = ctx.query.source || ctx.headers['x-data-source'] || 'tushare'

    ctx.logger.info(`获取股票 ${stockCode} 行情，数据源: ${dataSource}`)

    try {
      let quote

      // 根据数据源调用不同的API
      switch (dataSource.toLowerCase()) {
        case 'alphavantage':
          // 调用Alpha Vantage API
          try {
            ctx.logger.info(
              `调用ALPHAVANTAGE API: http://localhost:7001/api/alphavantage/quote?symbol=${stockCode}`
            )

            const response = await ctx.curl(
              `http://localhost:7001/api/alphavantage/quote?symbol=${stockCode}`,
              {
                method: 'GET',
                timeout: 15000,
                dataType: 'json',
              }
            )

            ctx.logger.info(`ALPHAVANTAGE API响应: ${JSON.stringify(response.data)}`)

            if (response.data && response.data.success) {
              quote = {
                code: stockCode,
                name: response.data.data.name || stockCode,
                price: response.data.data.price || 0,
                open: response.data.data.open || 0,
                high: response.data.data.high || 0,
                low: response.data.data.low || 0,
                volume: response.data.data.volume || 0,
                amount: response.data.data.amount || 0,
                change: response.data.data.changePercent || 0,
                date: new Date().toISOString().split('T')[0],
                data_source: 'ALPHAVANTAGE API',
                data_source_message: '数据来自ALPHAVANTAGE API实时查询，最新数据',
                data_source_type: 'alphavantage',
                is_real_time: true,
                cache: false,
                api_time: new Date().toISOString(),
              }
            } else {
              throw new Error(response.data?.message || 'ALPHAVANTAGE API调用失败')
            }
          } catch (alphaError) {
            ctx.logger.error(`ALPHAVANTAGE API调用失败: ${alphaError.message}`)
            throw new Error(`ALPHAVANTAGE API调用失败: ${alphaError.message}`)
          }
          break

        case 'sina':
          // 调用新浪财经API
          try {
            const response = await ctx.curl(
              `http://localhost:7001/api/sina/quote?symbol=${stockCode}`,
              {
                method: 'GET',
                timeout: 15000,
                dataType: 'json',
              }
            )

            if (response.data && response.data.success) {
              quote = {
                ...response.data.data,
                data_source: 'SINA API',
                data_source_message: '数据来自新浪财经API',
                data_source_type: 'sina',
              }
            } else {
              throw new Error(response.data?.message || '新浪财经API调用失败')
            }
          } catch (sinaError) {
            ctx.logger.error(`新浪财经API调用失败: ${sinaError.message}`)
            throw new Error(`新浪财经API调用失败: ${sinaError.message}`)
          }
          break

        case 'eastmoney':
          // 调用东方财富API
          try {
            const response = await ctx.curl(
              `http://localhost:7001/api/eastmoney/quote?symbol=${stockCode}`,
              {
                method: 'GET',
                timeout: 15000,
                dataType: 'json',
              }
            )

            if (response.data && response.data.success) {
              quote = {
                ...response.data.data,
                data_source: 'EASTMONEY API',
                data_source_message: '数据来自东方财富API',
                data_source_type: 'eastmoney',
              }
            } else {
              throw new Error(response.data?.message || '东方财富API调用失败')
            }
          } catch (eastmoneyError) {
            ctx.logger.error(`东方财富API调用失败: ${eastmoneyError.message}`)
            throw new Error(`东方财富API调用失败: ${eastmoneyError.message}`)
          }
          break

        case 'tushare':
        default:
          // 使用原有的Tushare API逻辑
          quote = await service.stock.getStockQuote(stockCode)
          break
      }

      // 设置响应头中的数据来源
      if (quote.data_source) {
        ctx.set('X-Data-Source', quote.data_source)
      } else if (quote.fromCache) {
        ctx.set('X-Data-Source', 'cache')
      } else {
        ctx.set('X-Data-Source', 'api')
      }

      // 返回数据，保留原有的数据来源信息
      ctx.body = quote
    } catch (err) {
      if (err.message === '未找到股票行情数据') {
        ctx.status = 404
        ctx.body = {
          error: true,
          message: '未找到股票行情数据',
          code: 'STOCK_NOT_FOUND',
          data_source: 'error',
          data_source_message: '未找到股票行情数据',
        }
      } else {
        ctx.status = 500
        ctx.body = {
          error: true,
          message: err.message || '获取股票行情失败',
          code: 'API_ERROR',
          data_source: 'error',
          data_source_message: `获取数据失败: ${err.message}`,
        }
      }
      ctx.logger.error(err)
    }
  }

  // 获取股票历史数据（使用缓存优化）
  async getHistory() {
    const { ctx, service } = this
    const stockCode = ctx.params.code
    const { start_date, end_date, cache_priority } = ctx.query

    try {
      // 使用新的缓存优化方法
      const result = await service.stock.getStockHistoryData(
        stockCode,
        start_date || service.stock.getDateString(-30), // 默认30天前
        end_date || service.stock.getDateString(0), // 默认今天
        parseInt(cache_priority) || 3 // 默认优先级3
      )

      // 设置响应头中的数据来源
      if (result.data_source) {
        ctx.set('X-Data-Source', result.data_source)
      }

      // 返回数据，保留原有的数据来源信息
      ctx.body = result
    } catch (err) {
      ctx.status = 500
      ctx.body = {
        success: false,
        message: '获取股票历史数据失败',
        data: [],
        count: 0,
        data_source: 'error',
        data_source_message: `获取数据失败: ${err.message}`,
      }
      ctx.logger.error(err)
    }
  }

  // 获取股票列表
  async getStockList() {
    const { ctx, service } = this

    try {
      const result = await service.stock.getStockList()

      // 设置响应头中的数据来源
      if (result.data_source) {
        ctx.set('X-Data-Source', result.data_source)
      }

      // 检查是否有数据
      if (result.data && result.data.length > 0) {
        // 返回数据，保留原有的数据来源信息
        ctx.body = result
      } else if (result.count && result.count > 0) {
        // 兼容旧格式
        ctx.body = result
      } else {
        ctx.status = 404
        ctx.body = {
          message: '未找到股票列表数据',
          data_source: 'error',
          data_source_message: '未找到股票列表数据',
        }
      }
    } catch (err) {
      ctx.status = 500
      ctx.body = {
        message: '获取股票列表失败',
        data_source: 'error',
        data_source_message: `获取数据失败: ${err.message}`,
      }
      ctx.logger.error(err)
    }
  }

  // 测试 Redis 连接和数据存储
  async testRedis() {
    const { ctx, service } = this

    try {
      const result = await service.stock.testRedisStorage()

      // 设置响应头中的数据来源
      if (result.data_source) {
        ctx.set('X-Data-Source', result.data_source)
      }

      ctx.body = result
    } catch (err) {
      ctx.status = 500
      ctx.body = {
        success: false,
        message: '测试 Redis 失败',
        error: err.message || '未知错误',
        data_source: 'error',
        data_source_message: `测试Redis失败: ${err.message}`,
      }
      ctx.logger.error(err)
    }
  }

  // 主动存储股票数据到 Redis
  async storeStockData() {
    const { ctx, service } = this
    const { code } = ctx.query

    if (!code) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '缺少股票代码参数',
        error: '请提供股票代码，例如：?code=000001.SZ',
        data_source: 'error',
        data_source_message: '参数错误',
      }
      return
    }

    try {
      const result = await service.stock.storeStockDataToRedis(code)

      // 设置响应头中的数据来源
      if (result.data_source) {
        ctx.set('X-Data-Source', result.data_source)
      }

      ctx.body = result
    } catch (err) {
      ctx.status = 500
      ctx.body = {
        success: false,
        message: '存储股票数据到 Redis 失败',
        error: err.message || '未知错误',
        data_source: 'error',
        data_source_message: `存储数据失败: ${err.message}`,
      }
      ctx.logger.error(err)
    }
  }

  // 批量存储多只股票数据到 Redis
  async storeAllStocks() {
    const { ctx, service } = this
    const { codes } = ctx.query

    try {
      // 如果没有提供股票代码，则获取股票列表
      let stockCodes = []

      if (codes) {
        // 如果提供了股票代码，则使用提供的代码
        stockCodes = codes.split(',')
      } else {
        // 从数据库获取常用股票列表
        try {
          const [results] = await app.model.query(
            'SELECT symbol FROM stock_basic WHERE list_status = "L" ORDER BY symbol LIMIT 20',
            { type: app.model.QueryTypes.SELECT }
          )

          if (results && results.length > 0) {
            stockCodes = results.map((row) => row.symbol)
          } else {
            ctx.logger.error('❌ 数据库中没有股票数据')
            ctx.status = 404
            ctx.body = {
              success: false,
              message: '数据库中没有股票数据',
            }
            return
          }
        } catch (dbError) {
          ctx.logger.error('❌ 获取股票列表失败:', dbError.message)
          ctx.status = 500
          ctx.body = {
            success: false,
            message: '获取股票列表失败: ' + dbError.message,
          }
          return
        }
      }

      if (stockCodes.length === 0) {
        ctx.status = 400
        ctx.body = {
          success: false,
          message: '没有可处理的股票代码',
          error: '请提供股票代码，或者系统无法获取股票列表',
          data_source: 'error',
          data_source_message: '参数错误',
        }
        return
      }

      // 限制一次最多处理的股票数量，避免请求过多
      const maxStocks = 20
      if (stockCodes.length > maxStocks) {
        stockCodes = stockCodes.slice(0, maxStocks)
        ctx.logger.info(`限制处理股票数量为 ${maxStocks} 只`)
      }

      ctx.logger.info(`开始批量处理 ${stockCodes.length} 只股票`)

      // 开始批量处理
      const result = await service.stock.storeAllStocksToRedis(stockCodes)

      // 设置响应头中的数据来源
      if (result.data_source) {
        ctx.set('X-Data-Source', result.data_source)
      }

      ctx.body = result
    } catch (err) {
      ctx.status = 500
      ctx.body = {
        success: false,
        message: '批量存储股票数据到 Redis 失败',
        error: err.message || '未知错误',
        data_source: 'error',
        data_source_message: `批量存储数据失败: ${err.message}`,
      }
      ctx.logger.error(err)
    }
  }

  // 获取行业列表
  async getIndustryList() {
    const { ctx, service } = this

    try {
      const result = await service.stock.getIndustryList()

      ctx.body = {
        success: true,
        data: result.data,
        message: '成功获取行业列表',
        data_source: result.data_source,
        data_source_message: result.data_source_message,
      }
    } catch (err) {
      ctx.status = 500
      ctx.body = {
        success: false,
        message: '获取行业列表失败',
        error: err.message || '未知错误',
        data_source: 'error',
        data_source_message: `获取行业列表失败: ${err.message}`,
      }
      ctx.logger.error(err)
    }
  }

  // 获取行业数据
  async getIndustryData() {
    const { ctx, service } = this
    const industryCode = ctx.params.code

    try {
      const result = await service.stock.getIndustryData(industryCode)

      ctx.body = {
        success: true,
        data: result,
        message: `成功获取行业 ${industryCode} 数据`,
        data_source: result.data_source,
        data_source_message: result.data_source_message,
      }
    } catch (err) {
      ctx.status = 500
      ctx.body = {
        success: false,
        message: `获取行业 ${industryCode} 数据失败`,
        error: err.message || '未知错误',
        data_source: 'error',
        data_source_message: `获取行业数据失败: ${err.message}`,
      }
      ctx.logger.error(err)
    }
  }

  // 获取热门股票
  async getHotStocks() {
    const { ctx, service } = this
    const limit = parseInt(ctx.query.limit) || 50

    try {
      const result = await service.stock.getHotStocks(limit)

      ctx.body = {
        success: true,
        data: result.data,
        message: `成功获取${result.data.length}只热门股票`,
        data_source: result.data_source,
        data_source_message: result.data_source_message,
      }
    } catch (err) {
      ctx.status = 500
      ctx.body = {
        success: false,
        message: '获取热门股票失败',
        error: err.message || '未知错误',
        data_source: 'error',
        data_source_message: `获取热门股票失败: ${err.message}`,
      }
      ctx.logger.error(err)
    }
  }

  // 获取涨停股票
  async getLimitUpStocks() {
    const { ctx, service } = this
    const limit = parseInt(ctx.query.limit) || 50

    try {
      const result = await service.stock.getLimitUpStocks(limit)

      ctx.body = {
        success: true,
        data: result.data,
        message: `成功获取${result.data.length}只涨停股票`,
        data_source: result.data_source,
        data_source_message: result.data_source_message,
      }
    } catch (err) {
      ctx.status = 500
      ctx.body = {
        success: false,
        message: '获取涨停股票失败',
        error: err.message || '未知错误',
        data_source: 'error',
        data_source_message: `获取涨停股票失败: ${err.message}`,
      }
      ctx.logger.error(err)
    }
  }

  // 获取跌停股票
  async getLimitDownStocks() {
    const { ctx, service } = this
    const limit = parseInt(ctx.query.limit) || 50

    try {
      const result = await service.stock.getLimitDownStocks(limit)

      ctx.body = {
        success: true,
        data: result.data,
        message: `成功获取${result.data.length}只跌停股票`,
        data_source: result.data_source,
        data_source_message: result.data_source_message,
      }
    } catch (err) {
      ctx.status = 500
      ctx.body = {
        success: false,
        message: '获取跌停股票失败',
        error: err.message || '未知错误',
        data_source: 'error',
        data_source_message: `获取跌停股票失败: ${err.message}`,
      }
      ctx.logger.error(err)
    }
  }

  // 手动同步股票数据到数据库
  async syncStockData() {
    const { ctx, service } = this

    try {
      ctx.logger.info('开始手动同步股票数据到数据库...')

      const result = await service.stock.fetchAndSyncStockList()

      ctx.body = {
        success: true,
        message: '股票数据同步成功',
        data: {
          count: result.count,
          data_source: result.data_source,
          data_source_message: result.data_source_message,
          sync_time: new Date().toISOString(),
        },
      }

      ctx.logger.info(`股票数据同步完成，共同步 ${result.count} 条数据`)
    } catch (err) {
      ctx.status = 500
      ctx.body = {
        success: false,
        message: '股票数据同步失败',
        error: err.message || '未知错误',
        sync_time: new Date().toISOString(),
      }
      ctx.logger.error('股票数据同步失败:', err)
    }
  }

  // 搜索股票（基于数据库）
  async searchStocks() {
    const { ctx, app } = this
    const { keyword } = ctx.query

    if (!keyword) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '缺少搜索关键词参数',
      }
      return
    }

    try {
      ctx.logger.info(`搜索股票关键词: ${keyword}`)

      // 使用 Sequelize 模型查询
      const { Op } = app.Sequelize
      const searchPattern = `%${keyword}%`

      const results = await app.model.Stock.findAll({
        where: {
          [Op.or]: [
            { symbol: { [Op.like]: searchPattern } },
            { name: { [Op.like]: searchPattern } },
            { tsCode: { [Op.like]: searchPattern } },
          ],
        },
        attributes: ['tsCode', 'symbol', 'name', 'area', 'industry', 'market', 'listDate'],
        order: [
          [
            app.Sequelize.literal(`CASE
            WHEN symbol = '${keyword}' THEN 1
            WHEN name = '${keyword}' THEN 2
            WHEN symbol LIKE '${keyword}%' THEN 3
            WHEN name LIKE '${keyword}%' THEN 4
            ELSE 5
          END`),
          ],
          ['symbol', 'ASC'],
        ],
        limit: 50,
        raw: true,
      })

      ctx.logger.info(
        `MySQL查询结果类型: ${typeof results}, 是否为数组: ${Array.isArray(results)}, 长度: ${
          results ? results.length : 'undefined'
        }`
      )

      const stocks = Array.isArray(results)
        ? results.map((stock) => ({
            symbol: stock.symbol || stock.tsCode,
            tsCode: stock.tsCode,
            name: stock.name,
            area: stock.area,
            industry: stock.industry || '未知',
            market: stock.market,
            listDate: stock.listDate,
          }))
        : []

      ctx.body = {
        success: true,
        data: stocks,
        count: stocks.length,
        message: `找到 ${stocks.length} 条匹配的股票`,
        data_source: 'database_stock_basic',
        data_source_message: `搜索结果来自stock_basic表，关键词: ${keyword}`,
      }

      ctx.logger.info(`搜索完成，找到 ${stocks.length} 条匹配的股票`)
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        message: '搜索股票失败',
        error: error.message,
      }
      ctx.logger.error('搜索股票失败:', error)
    }
  }

  // 获取数据库中的股票统计信息
  async getStockStats() {
    const { ctx, app } = this

    try {
      // 获取股票总数
      const [totalResult] = await app.model.query('SELECT COUNT(*) as count FROM stock_basic', {
        type: app.model.QueryTypes.SELECT,
      })
      const totalCount = totalResult.count

      // 获取上市股票数
      const [listedResult] = await app.model.query(
        "SELECT COUNT(*) as count FROM stock_basic WHERE list_status = 'L'",
        {
          type: app.model.QueryTypes.SELECT,
        }
      )
      const listedCount = listedResult.count

      // 获取最新更新时间（如果有updated_at字段）
      let lastUpdated = null
      try {
        const [updateResult] = await app.model.query(
          'SELECT MAX(updated_at) as last_updated FROM stock_basic',
          {
            type: app.model.QueryTypes.SELECT,
          }
        )
        lastUpdated = updateResult.last_updated
      } catch (updateError) {
        // 如果没有updated_at字段，忽略错误
        ctx.logger.info('stock_basic表没有updated_at字段')
      }

      // 按行业统计
      const industryStats = await app.model.query(
        `
        SELECT industry, COUNT(*) as count
        FROM stock_basic
        WHERE list_status = 'L' OR list_status IS NULL
        GROUP BY industry
        ORDER BY count DESC
        LIMIT 10
      `,
        {
          type: app.model.QueryTypes.SELECT,
        }
      )

      ctx.body = {
        success: true,
        message: '获取股票统计信息成功',
        data: {
          total_count: totalCount,
          listed_count: listedCount,
          last_updated: lastUpdated,
          industry_stats: industryStats.map((item) => ({
            industry: item.industry || '未知',
            count: parseInt(item.count),
          })),
          data_source: 'stock_basic',
          data_source_message: '统计数据来自stock_basic表',
        },
      }
    } catch (err) {
      ctx.status = 500
      ctx.body = {
        success: false,
        message: '获取股票统计信息失败',
        error: err.message || '未知错误',
      }
      ctx.logger.error('获取股票统计信息失败:', err)
    }
  }

  // 获取股票详情
  async getStockDetail() {
    const { ctx, service, app } = this
    const symbol = ctx.params.symbol

    try {
      ctx.logger.info(`获取股票详情: ${symbol}`)

      // 从数据库获取股票基本信息
      const [stockInfo] = await app.model.query(
        `SELECT 
          ts_code as tsCode, 
          symbol, 
          name, 
          area, 
          industry, 
          market, 
          list_date as listDate,
          list_status as listStatus
         FROM stock_basic
         WHERE symbol = ? OR ts_code = ?
         LIMIT 1`,
        {
          replacements: [symbol, symbol],
          type: app.model.QueryTypes.SELECT,
        }
      )

      if (!stockInfo) {
        ctx.status = 404
        ctx.body = {
          success: false,
          message: `未找到股票: ${symbol}`,
          data_source: 'database',
          data_source_message: '数据库中未找到该股票',
        }
        return
      }

      // 获取股票实时行情
      const quote = await service.stock.getStockQuote(stockInfo.tsCode || symbol)

      // 获取最近的财务指标
      let financials = {}
      try {
        financials = await service.stock.getLatestFinancials(stockInfo.tsCode || symbol)
      } catch (financialError) {
        ctx.logger.warn(`获取股票 ${symbol} 财务数据失败:`, financialError.message)
        financials = { error: '获取财务数据失败' }
      }

      ctx.body = {
        success: true,
        data: {
          ...stockInfo,
          quote,
          financials,
          data_source: 'combined',
          data_source_message: '基本信息来自数据库，行情和财务数据来自API',
        },
      }
    } catch (err) {
      ctx.status = 500
      ctx.body = {
        success: false,
        message: '获取股票详情失败',
        error: err.message || '未知错误',
        data_source: 'error',
        data_source_message: `获取股票详情失败: ${err.message}`,
      }
      ctx.logger.error('获取股票详情失败:', err)
    }
  }
}

module.exports = StockController
