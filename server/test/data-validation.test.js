'use strict'

const { app, assert } = require('egg-mock/bootstrap')

describe('Data Validation and Transformation Tests', () => {
  let dataValidator
  let dataTransformer

  before(async () => {
    // 获取数据验证器和转换器实例
    dataValidator = app.dataValidator
    dataTransformer = app.dataTransformer

    // 确保实例已初始化
    if (dataValidator && !dataValidator.stats) {
      await dataValidator.init()
    }
    if (dataTransformer && !dataTransformer.stats) {
      await dataTransformer.init()
    }
  })

  describe('Data Validator', () => {
    it('should initialize data validator correctly', () => {
      assert(dataValidator)
      assert(typeof dataValidator.validateData === 'function')
      assert(typeof dataValidator.checkDataQuality === 'function')
      assert(typeof dataValidator.processData === 'function')
    })

    it('should validate stock quote data correctly', () => {
      // 有效的股票行情数据
      const validData = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150.25,
        change: 2.5,
        changePercent: 1.69,
        volume: 1000000,
        timestamp: Date.now(),
      }

      // 创建验证模式
      const schema = {
        symbol: {
          pattern: /^[A-Za-z0-9.]{1,20}$/,
          required: true,
        },
        name: {
          type: 'string',
          required: true,
        },
        price: {
          type: 'number',
          min: 0,
          required: true,
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
        timestamp: {
          required: false,
        },
      }

      // 验证有效数据
      const validResult = dataValidator.validateData(validData, schema, 'tushare')
      assert(validResult.valid)
      assert(!validResult.errors)

      // 验证无效数据
      const invalidData = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: -10, // 无效的价格
        change: 2.5,
        changePercent: 1.69,
        volume: 1000000,
        timestamp: Date.now(),
      }

      const invalidResult = dataValidator.validateData(invalidData, schema, 'tushare')
      assert(!invalidResult.valid)
      assert(invalidResult.errors)
      assert(invalidResult.errors.length > 0)
      assert(invalidResult.errors[0].field === 'price')
    })

    it('should check data quality correctly', () => {
      // 正常的股票历史数据
      const normalData = {
        symbol: 'AAPL',
        date: '2023-01-01',
        open: 150.0,
        high: 155.0,
        low: 148.0,
        close: 152.0,
        volume: 1000000,
        adjustedClose: 152.0,
      }

      // 检查正常数据质量
      const normalResult = dataValidator.checkDataQuality(normalData, 'stockHistory', 'tushare')
      assert(normalResult.passed)
      assert(!normalResult.issues)

      // 异常的股票历史数据（价格不一致）
      const anomalyData = {
        symbol: 'AAPL',
        date: '2023-01-01',
        open: 150.0,
        high: 145.0, // 最高价低于最低价
        low: 148.0,
        close: 152.0,
        volume: 1000000,
        adjustedClose: 152.0,
      }

      // 检查异常数据质量
      const anomalyResult = dataValidator.checkDataQuality(anomalyData, 'stockHistory', 'tushare')
      assert(!anomalyResult.passed)
      assert(anomalyResult.issues)
      assert(anomalyResult.issues.length > 0)
      assert(anomalyResult.issues[0].type === 'consistency')
    })

    it('should process data correctly', () => {
      // 测试数据
      const testData = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150.25,
        change: 2.5,
        changePercent: 1.69,
        volume: 1000000,
        timestamp: Date.now(),
      }

      // 创建验证模式
      const schema = {
        symbol: {
          pattern: /^[A-Za-z0-9.]{1,20}$/,
          required: true,
        },
        name: {
          type: 'string',
          required: true,
        },
        price: {
          type: 'number',
          min: 0,
          required: true,
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
        timestamp: {
          required: false,
        },
      }

      // 处理数据
      const result = dataValidator.processData(testData, schema, 'stockQuote', 'tushare')
      assert(result.success)
      assert(result.data)
      assert(!result.issues)
    })
  })

  describe('Data Transformer', () => {
    it('should initialize data transformer correctly', () => {
      assert(dataTransformer)
      assert(typeof dataTransformer.transformData === 'function')
      assert(typeof dataTransformer.transformBatchData === 'function')
    })

    it('should transform stock quote data correctly', () => {
      // 测试数据（Tushare格式）
      const tushareData = {
        ts_code: 'AAPL',
        name: 'Apple Inc.',
        close: 150.25,
        change: 2.5,
        pct_chg: 1.69,
        vol: 1000000,
        amount: 150250000,
        trade_date: '20230101',
        turnover_rate: 0.5,
      }

      // 转换数据
      const result = dataTransformer.transformData(tushareData, 'stockQuote', 'tushare')
      assert(result.success)
      assert(result.data)
      assert(result.data.symbol === 'AAPL')
      assert(result.data.price === 150.25)
      assert(result.data.changePercent === 1.69)
      assert(result.data.volume === 1000000)
      assert(result.data.turnoverRate === 0.5)
    })

    it('should transform stock history data correctly', () => {
      // 测试数据（Tushare格式）
      const tushareData = {
        ts_code: 'AAPL',
        trade_date: '20230101',
        open: 150.0,
        high: 155.0,
        low: 148.0,
        close: 152.0,
        vol: 1000000,
        amount: 150250000,
        adj_close: 152.0,
      }

      // 转换数据
      const result = dataTransformer.transformData(tushareData, 'stockHistory', 'tushare')
      assert(result.success)
      assert(result.data)
      assert(result.data.symbol === 'AAPL')
      assert(result.data.date === '2023-01-01')
      assert(result.data.open === 150.0)
      assert(result.data.high === 155.0)
      assert(result.data.low === 148.0)
      assert(result.data.close === 152.0)
      assert(result.data.volume === 1000000)
      assert(result.data.adjustedClose === 152.0)
    })

    it('should batch transform data correctly', () => {
      // 测试数据数组（Tushare格式）
      const tushareDataArray = [
        {
          ts_code: 'AAPL',
          name: 'Apple Inc.',
          close: 150.25,
          change: 2.5,
          pct_chg: 1.69,
          vol: 1000000,
          amount: 150250000,
          trade_date: '20230101',
          turnover_rate: 0.5,
        },
        {
          ts_code: 'GOOGL',
          name: 'Alphabet Inc.',
          close: 2500.0,
          change: 15.0,
          pct_chg: 0.6,
          vol: 500000,
          amount: 1250000000,
          trade_date: '20230101',
          turnover_rate: 0.3,
        },
      ]

      // 批量转换数据
      const result = dataTransformer.transformBatchData(tushareDataArray, 'stockQuote', 'tushare')
      assert(result.success)
      assert(Array.isArray(result.data))
      assert(result.data.length === 2)
      assert(result.data[0].symbol === 'AAPL')
      assert(result.data[1].symbol === 'GOOGL')
      assert(result.stats.total === 2)
      assert(result.stats.success === 2)
      assert(result.stats.failure === 0)
    })
  })

  describe('Data Quality Service', () => {
    it('should process data through the service correctly', async () => {
      // 获取数据质量服务
      const dataQualityService = app.service.dataQualityService

      // 测试数据（Tushare格式）
      const tushareData = {
        ts_code: 'AAPL',
        name: 'Apple Inc.',
        close: 150.25,
        change: 2.5,
        pct_chg: 1.69,
        vol: 1000000,
        amount: 150250000,
        trade_date: '20230101',
        turnover_rate: 0.5,
      }

      // 处理数据
      const result = await dataQualityService.processData(tushareData, 'stockQuote', 'tushare')
      assert(result.success)
      assert(result.data)
      assert(result.data.symbol === 'AAPL')
      assert(result.data.price === 150.25)
      assert(result.data.changePercent === 1.69)
      assert(result.data.volume === 1000000)
      assert(result.data.turnoverRate === 0.5)
    })

    it('should batch process data through the service correctly', async () => {
      // 获取数据质量服务
      const dataQualityService = app.service.dataQualityService

      // 测试数据数组（Tushare格式）
      const tushareDataArray = [
        {
          ts_code: 'AAPL',
          name: 'Apple Inc.',
          close: 150.25,
          change: 2.5,
          pct_chg: 1.69,
          vol: 1000000,
          amount: 150250000,
          trade_date: '20230101',
          turnover_rate: 0.5,
        },
        {
          ts_code: 'GOOGL',
          name: 'Alphabet Inc.',
          close: 2500.0,
          change: 15.0,
          pct_chg: 0.6,
          vol: 500000,
          amount: 1250000000,
          trade_date: '20230101',
          turnover_rate: 0.3,
        },
      ]

      // 批量处理数据
      const result = await dataQualityService.processBatchData(
        tushareDataArray,
        'stockQuote',
        'tushare'
      )
      assert(result.success)
      assert(Array.isArray(result.data))
      assert(result.data.length === 2)
      assert(result.data[0].symbol === 'AAPL')
      assert(result.data[1].symbol === 'GOOGL')
      assert(result.stats.total === 2)
      assert(result.stats.finalSuccess === 2)
    })
  })
})
