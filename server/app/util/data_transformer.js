'use strict'

/**
 * 数据转换器
 * 提供数据格式转换和标准化功能
 */
class DataTransformer {
  constructor(app) {
    this.app = app
    this.logger = app.logger
    this.config = app.config.dataTransformer || {}
    this.dataSourceManager = app.dataSourceManager
    this.cacheManager = app.cacheManager
    this.dataValidator = app.dataValidator

    // 转换统计
    this.stats = {
      totalTransformations: 0,
      successfulTransformations: 0,
      failedTransformations: 0,
      byType: {},
      bySource: {},
    }

    // 数据类型映射配置
    this.typeMappers = {
      // 股票行情数据映射
      stockQuote: {
        // 字段映射函数
        mapFields: this.mapStockQuoteFields.bind(this),
        // 字段类型转换
        typeConversions: {
          price: 'number',
          change: 'number',
          changePercent: 'number',
          volume: 'number',
          amount: 'number',
          turnoverRate: 'number',
          marketCap: 'number',
          pe: 'number',
          pb: 'number',
        },
      },
      // 股票历史数据映射
      stockHistory: {
        // 字段映射函数
        mapFields: this.mapStockHistoryFields.bind(this),
        // 字段类型转换
        typeConversions: {
          open: 'number',
          high: 'number',
          low: 'number',
          close: 'number',
          volume: 'number',
          amount: 'number',
          adjustedClose: 'number',
        },
      },
      // 股票基本信息映射
      stockInfo: {
        // 字段映射函数
        mapFields: this.mapStockInfoFields.bind(this),
        // 字段类型转换
        typeConversions: {
          totalShares: 'number',
          floatShares: 'number',
          eps: 'number',
          bvps: 'number',
          totalAssets: 'number',
          liquidAssets: 'number',
          fixedAssets: 'number',
          reserved: 'number',
          reservedPerShare: 'number',
          undistributed: 'number',
          undistributedPerShare: 'number',
        },
      },
    }
  }

  /**
   * 初始化数据转换器
   */
  async init() {
    this.logger.info('[DataTransformer] 初始化数据转换器')

    // 初始化统计信息
    const dataTypes = ['stockQuote', 'stockHistory', 'stockInfo']
    for (const type of dataTypes) {
      this.stats.byType[type] = {
        total: 0,
        success: 0,
        failure: 0,
      }
    }

    const sources = Object.keys(this.app.config.dataSource.sources || {})
    for (const source of sources) {
      this.stats.bySource[source] = {
        total: 0,
        success: 0,
        failure: 0,
      }
    }

    this.logger.info('[DataTransformer] 数据转换器初始化完成')
  }

  /**
   * 转换数据类型
   * @param {*} value - 要转换的值
   * @param {String} type - 目标类型
   * @returns {*} 转换后的值
   */
  convertType(value, type) {
    if (value === undefined || value === null) {
      return value
    }

    switch (type) {
      case 'number':
        const num = Number(value)
        return isNaN(num) ? value : num
      case 'string':
        return String(value)
      case 'boolean':
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase()
          if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
            return true
          }
          if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
            return false
          }
        }
        return Boolean(value)
      case 'date':
        if (typeof value === 'string') {
          // 处理YYYYMMDD格式
          if (/^\d{8}$/.test(value)) {
            return `${value.substring(0, 4)}-${value.substring(4, 6)}-${value.substring(6, 8)}`
          }
          // 尝试解析日期字符串
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]
          }
        }
        return value
      case 'array':
        if (Array.isArray(value)) {
          return value
        }
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value)
            return Array.isArray(parsed) ? parsed : [value]
          } catch (e) {
            return [value]
          }
        }
        return [value]
      case 'object':
        if (typeof value === 'object' && value !== null) {
          return value
        }
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value)
            return parsed
          } catch (e) {
            return { value }
          }
        }
        return { value }
      default:
        return value
    }
  }

  /**
   * 映射股票行情数据字段
   * @param {Object} data - 原始数据
   * @param {String} source - 数据源
   * @returns {Object} 映射后的数据
   */
  mapStockQuoteFields(data, source) {
    // 不同数据源的字段映射
    const fieldMappings = {
      tushare: {
        ts_code: 'symbol',
        name: 'name',
        close: 'price',
        pct_chg: 'changePercent',
        change: 'change',
        vol: 'volume',
        amount: 'amount',
        trade_date: 'date',
        turnover_rate: 'turnoverRate',
        pe: 'pe',
        pb: 'pb',
        total_mv: 'marketCap',
        circ_mv: 'circulatingMarketCap',
      },
      akshare: {
        代码: 'symbol',
        名称: 'name',
        最新价: 'price',
        涨跌幅: 'changePercent',
        涨跌额: 'change',
        成交量: 'volume',
        成交额: 'amount',
        日期: 'date',
        换手率: 'turnoverRate',
        市盈率: 'pe',
        市净率: 'pb',
        总市值: 'marketCap',
        流通市值: 'circulatingMarketCap',
      },
      sina: {
        symbol: 'symbol',
        name: 'name',
        price: 'price',
        pricechange: 'change',
        changepercent: 'changePercent',
        volume: 'volume',
        amount: 'amount',
        ticktime: 'date',
        turnoverratio: 'turnoverRate',
        per: 'pe',
        pb: 'pb',
        mktcap: 'marketCap',
        nmc: 'circulatingMarketCap',
      },
      eastmoney: {
        code: 'symbol',
        name: 'name',
        price: 'price',
        percent: 'changePercent',
        change: 'change',
        volume: 'volume',
        amount: 'amount',
        time: 'date',
        turnover: 'turnoverRate',
        pe_ttm: 'pe',
        pb: 'pb',
        total_market_cap: 'marketCap',
        circulating_market_cap: 'circulatingMarketCap',
      },
    }

    // 创建一个新对象，避免修改原始数据
    const mapped = {}

    // 应用字段映射
    const mapping = fieldMappings[source] || {}
    for (const [sourceField, targetField] of Object.entries(mapping)) {
      if (data[sourceField] !== undefined) {
        mapped[targetField] = data[sourceField]
      }
    }

    // 复制未映射的字段
    for (const field in data) {
      if (!Object.values(mapping).includes(field) && !Object.keys(mapping).includes(field)) {
        mapped[field] = data[field]
      }
    }

    // 确保必要字段存在
    if (!mapped.symbol && data.symbol) {
      mapped.symbol = data.symbol
    }
    if (!mapped.name && data.name) {
      mapped.name = data.name
    }

    return mapped
  }

  /**
   * 映射股票历史数据字段
   * @param {Object} data - 原始数据
   * @param {String} source - 数据源
   * @returns {Object} 映射后的数据
   */
  mapStockHistoryFields(data, source) {
    // 不同数据源的字段映射
    const fieldMappings = {
      tushare: {
        ts_code: 'symbol',
        trade_date: 'date',
        open: 'open',
        high: 'high',
        low: 'low',
        close: 'close',
        vol: 'volume',
        amount: 'amount',
        adj_close: 'adjustedClose',
        pre_close: 'preClose',
        change: 'change',
        pct_chg: 'changePercent',
        turnover_rate: 'turnoverRate',
      },
      akshare: {
        代码: 'symbol',
        日期: 'date',
        开盘: 'open',
        最高: 'high',
        最低: 'low',
        收盘: 'close',
        成交量: 'volume',
        成交额: 'amount',
        复权收盘: 'adjustedClose',
        前收盘: 'preClose',
        涨跌额: 'change',
        涨跌幅: 'changePercent',
        换手率: 'turnoverRate',
      },
      sina: {
        symbol: 'symbol',
        day: 'date',
        open: 'open',
        high: 'high',
        low: 'low',
        close: 'close',
        volume: 'volume',
        amount: 'amount',
        adj_close: 'adjustedClose',
        prev_close: 'preClose',
        change: 'change',
        percent: 'changePercent',
        turnover: 'turnoverRate',
      },
      eastmoney: {
        code: 'symbol',
        date: 'date',
        open: 'open',
        high: 'high',
        low: 'low',
        close: 'close',
        volume: 'volume',
        amount: 'amount',
        adjclose: 'adjustedClose',
        preclose: 'preClose',
        change: 'change',
        percent: 'changePercent',
        turnover: 'turnoverRate',
      },
    }

    // 创建一个新对象，避免修改原始数据
    const mapped = {}

    // 应用字段映射
    const mapping = fieldMappings[source] || {}
    for (const [sourceField, targetField] of Object.entries(mapping)) {
      if (data[sourceField] !== undefined) {
        mapped[targetField] = data[sourceField]
      }
    }

    // 复制未映射的字段
    for (const field in data) {
      if (!Object.values(mapping).includes(field) && !Object.keys(mapping).includes(field)) {
        mapped[field] = data[field]
      }
    }

    // 确保必要字段存在
    if (!mapped.symbol && data.symbol) {
      mapped.symbol = data.symbol
    }
    if (!mapped.date && data.date) {
      mapped.date = data.date
    }

    return mapped
  }

  /**
   * 映射股票基本信息字段
   * @param {Object} data - 原始数据
   * @param {String} source - 数据源
   * @returns {Object} 映射后的数据
   */
  mapStockInfoFields(data, source) {
    // 不同数据源的字段映射
    const fieldMappings = {
      tushare: {
        ts_code: 'symbol',
        name: 'name',
        area: 'area',
        industry: 'industry',
        market: 'market',
        list_date: 'listDate',
        exchange: 'exchange',
        total_share: 'totalShares',
        float_share: 'floatShares',
        total_assets: 'totalAssets',
        liquid_assets: 'liquidAssets',
        fixed_assets: 'fixedAssets',
        reserved: 'reserved',
        reserved_pershare: 'reservedPerShare',
        undp: 'undistributed',
        per_undp: 'undistributedPerShare',
        eps: 'eps',
        bvps: 'bvps',
      },
      akshare: {
        代码: 'symbol',
        名称: 'name',
        地区: 'area',
        行业: 'industry',
        市场: 'market',
        上市日期: 'listDate',
        交易所: 'exchange',
        总股本: 'totalShares',
        流通股本: 'floatShares',
        总资产: 'totalAssets',
        流动资产: 'liquidAssets',
        固定资产: 'fixedAssets',
        公积金: 'reserved',
        每股公积金: 'reservedPerShare',
        未分配利润: 'undistributed',
        每股未分配利润: 'undistributedPerShare',
        每股收益: 'eps',
        每股净资产: 'bvps',
      },
      sina: {
        symbol: 'symbol',
        name: 'name',
        area: 'area',
        industry: 'industry',
        market: 'market',
        list_date: 'listDate',
        exchange: 'exchange',
        totals: 'totalShares',
        outstanding: 'floatShares',
        totalassets: 'totalAssets',
        liquidassets: 'liquidAssets',
        fixedassets: 'fixedAssets',
        reserved: 'reserved',
        reservedpershare: 'reservedPerShare',
        undistributed: 'undistributed',
        undistributedpershare: 'undistributedPerShare',
        eps: 'eps',
        bvps: 'bvps',
      },
      eastmoney: {
        code: 'symbol',
        name: 'name',
        area: 'area',
        industry: 'industry',
        market: 'market',
        list_date: 'listDate',
        exchange: 'exchange',
        total_share: 'totalShares',
        float_share: 'floatShares',
        total_assets: 'totalAssets',
        liquid_assets: 'liquidAssets',
        fixed_assets: 'fixedAssets',
        reserved: 'reserved',
        reserved_pershare: 'reservedPerShare',
        undp: 'undistributed',
        per_undp: 'undistributedPerShare',
        eps: 'eps',
        bvps: 'bvps',
      },
    }

    // 创建一个新对象，避免修改原始数据
    const mapped = {}

    // 应用字段映射
    const mapping = fieldMappings[source] || {}
    for (const [sourceField, targetField] of Object.entries(mapping)) {
      if (data[sourceField] !== undefined) {
        mapped[targetField] = data[sourceField]
      }
    }

    // 复制未映射的字段
    for (const field in data) {
      if (!Object.values(mapping).includes(field) && !Object.keys(mapping).includes(field)) {
        mapped[field] = data[field]
      }
    }

    // 确保必要字段存在
    if (!mapped.symbol && data.symbol) {
      mapped.symbol = data.symbol
    }
    if (!mapped.name && data.name) {
      mapped.name = data.name
    }

    return mapped
  }

  /**
   * 转换数据
   * @param {Object} data - 要转换的数据
   * @param {String} dataType - 数据类型
   * @param {String} source - 数据源
   * @param {Object} options - 选项
   * @returns {Object} 转换结果
   */
  transformData(data, dataType, source, options = {}) {
    const { skipFieldMapping = false, skipTypeConversion = false, throwOnError = false } = options

    this.stats.totalTransformations++
    if (this.stats.byType[dataType]) {
      this.stats.byType[dataType].total++
    }
    if (this.stats.bySource[source]) {
      this.stats.bySource[source].total++
    }

    try {
      // 获取数据类型的映射器
      const mapper = this.typeMappers[dataType]
      if (!mapper) {
        throw new Error(`未找到数据类型 ${dataType} 的映射器`)
      }

      let transformedData = { ...data }

      // 步骤1：字段映射
      if (!skipFieldMapping && mapper.mapFields) {
        transformedData = mapper.mapFields(transformedData, source)
      }

      // 步骤2：类型转换
      if (!skipTypeConversion && mapper.typeConversions) {
        for (const [field, type] of Object.entries(mapper.typeConversions)) {
          if (transformedData[field] !== undefined) {
            transformedData[field] = this.convertType(transformedData[field], type)
          }
        }
      }

      // 添加元数据
      transformedData._meta = {
        source,
        dataType,
        transformedAt: new Date().toISOString(),
      }

      // 更新统计信息
      this.stats.successfulTransformations++
      if (this.stats.byType[dataType]) {
        this.stats.byType[dataType].success++
      }
      if (this.stats.bySource[source]) {
        this.stats.bySource[source].success++
      }

      return {
        success: true,
        data: transformedData,
      }
    } catch (error) {
      this.logger.error(`[DataTransformer] 转换数据失败: ${error.message}`, error)

      // 更新统计信息
      this.stats.failedTransformations++
      if (this.stats.byType[dataType]) {
        this.stats.byType[dataType].failure++
      }
      if (this.stats.bySource[source]) {
        this.stats.bySource[source].failure++
      }

      if (throwOnError) {
        throw error
      }

      return {
        success: false,
        data,
        error: error.message,
      }
    }
  }

  /**
   * 批量转换数据
   * @param {Array} dataArray - 要转换的数据数组
   * @param {String} dataType - 数据类型
   * @param {String} source - 数据源
   * @param {Object} options - 选项
   * @returns {Object} 转换结果
   */
  transformBatchData(dataArray, dataType, source, options = {}) {
    const results = []
    const transformedData = []
    const failedItems = []
    let successCount = 0
    let failureCount = 0

    for (let i = 0; i < dataArray.length; i++) {
      const result = this.transformData(dataArray[i], dataType, source, options)
      results.push(result)

      if (result.success) {
        transformedData.push(result.data)
        successCount++
      } else {
        failedItems.push({
          index: i,
          data: dataArray[i],
          error: result.error,
        })
        failureCount++
      }
    }

    return {
      success: failureCount === 0,
      data: transformedData,
      results,
      stats: {
        total: dataArray.length,
        success: successCount,
        failure: failureCount,
      },
      failedItems: failedItems.length > 0 ? failedItems : null,
    }
  }

  /**
   * 获取转换统计信息
   * @returns {Object} 统计信息
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
      totalTransformations: 0,
      successfulTransformations: 0,
      failedTransformations: 0,
      byType: {},
      bySource: {},
    }

    // 初始化统计信息
    const dataTypes = ['stockQuote', 'stockHistory', 'stockInfo']
    for (const type of dataTypes) {
      this.stats.byType[type] = {
        total: 0,
        success: 0,
        failure: 0,
      }
    }

    const sources = Object.keys(this.app.config.dataSource.sources || {})
    for (const source of sources) {
      this.stats.bySource[source] = {
        total: 0,
        success: 0,
        failure: 0,
      }
    }
  }

  /**
   * 关闭数据转换器
   */
  async shutdown() {
    this.logger.info('[DataTransformer] 关闭数据转换器')
    // 清理资源
  }
}

module.exports = DataTransformer
