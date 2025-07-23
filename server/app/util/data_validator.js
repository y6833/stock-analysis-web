'use strict'

/**
 * 数据验证器
 * 提供一致的数据验证机制，确保数据质量和一致性
 */
class DataValidator {
  constructor(app) {
    this.app = app
    this.logger = app.logger
    this.config = app.config.dataValidator || {}
    this.dataSourceManager = app.dataSourceManager
    this.cacheManager = app.cacheManager

    // 验证规则
    this.validationRules = {
      // 股票代码验证规则
      stockSymbol: {
        pattern: /^[A-Za-z0-9.]{1,20}$/,
        required: true,
        errorMessage: '无效的股票代码格式',
      },
      // 日期验证规则
      date: {
        pattern: /^\d{4}-\d{2}-\d{2}$/,
        required: true,
        errorMessage: '无效的日期格式，应为YYYY-MM-DD',
      },
      // 价格验证规则
      price: {
        type: 'number',
        min: 0,
        required: true,
        errorMessage: '价格必须是大于等于0的数字',
      },
      // 成交量验证规则
      volume: {
        type: 'number',
        min: 0,
        required: true,
        errorMessage: '成交量必须是大于等于0的数字',
      },
      // 百分比验证规则
      percentage: {
        type: 'number',
        min: -100,
        max: 100,
        required: true,
        errorMessage: '百分比必须在-100到100之间',
      },
      // 时间戳验证规则
      timestamp: {
        type: 'number',
        min: 0,
        required: true,
        errorMessage: '无效的时间戳',
      },
    }

    // 数据源特定的验证规则
    this.sourceSpecificRules = {
      tushare: {
        // Tushare特定的验证规则
      },
      akshare: {
        // AKShare特定的验证规则
      },
      sina: {
        // 新浪特定的验证规则
      },
      eastmoney: {
        // 东方财富特定的验证规则
      },
    }

    // 数据质量检查配置
    this.qualityCheckConfig = {
      // 价格异常检测阈值（百分比）
      priceAnomalyThreshold: 20,
      // 成交量异常检测阈值（百分比）
      volumeAnomalyThreshold: 300,
      // 数据完整性要求
      requiredFields: {
        stockQuote: ['symbol', 'name', 'price', 'change', 'changePercent', 'volume', 'timestamp'],
        stockHistory: ['date', 'open', 'high', 'low', 'close', 'volume', 'adjustedClose'],
      },
      // 数据一致性检查
      consistencyChecks: {
        // 价格一致性检查：开盘价、最高价、最低价、收盘价之间的关系
        priceConsistency: true,
        // 日期连续性检查
        dateContinuity: true,
      },
    }

    // 验证统计
    this.stats = {
      totalValidations: 0,
      passedValidations: 0,
      failedValidations: 0,
      qualityChecks: 0,
      qualityIssuesDetected: 0,
      transformations: 0,
      bySource: {},
    }
  }

  /**
   * 初始化数据验证器
   */
  async init() {
    this.logger.info('[DataValidator] 初始化数据验证器')

    // 初始化数据源统计
    const sources = Object.keys(this.app.config.dataSource.sources || {})
    for (const source of sources) {
      this.stats.bySource[source] = {
        validations: 0,
        passed: 0,
        failed: 0,
        qualityChecks: 0,
        qualityIssues: 0,
        transformations: 0,
      }
    }

    this.logger.info('[DataValidator] 数据验证器初始化完成')
  }

  /**
   * 验证单个字段
   * @param {String} field - 字段名
   * @param {*} value - 字段值
   * @param {Object} rule - 验证规则
   * @returns {Object} 验证结果
   */
  validateField(field, value, rule) {
    // 检查必填字段
    if (rule.required && (value === undefined || value === null || value === '')) {
      return {
        valid: false,
        field,
        error: rule.errorMessage || `${field} 是必填字段`,
      }
    }

    // 如果值为空且非必填，则视为有效
    if ((value === undefined || value === null || value === '') && !rule.required) {
      return { valid: true, field }
    }

    // 类型检查
    if (rule.type) {
      const valueType = typeof value
      if (rule.type === 'number' && valueType !== 'number') {
        // 尝试转换为数字
        const numValue = Number(value)
        if (isNaN(numValue)) {
          return {
            valid: false,
            field,
            error: rule.errorMessage || `${field} 必须是数字`,
          }
        }
        value = numValue
      } else if (rule.type !== valueType) {
        return {
          valid: false,
          field,
          error: rule.errorMessage || `${field} 类型错误，应为 ${rule.type}`,
        }
      }
    }

    // 模式匹配
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        return {
          valid: false,
          field,
          error: rule.errorMessage || `${field} 格式不正确`,
        }
      }
    }

    // 范围检查
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return {
          valid: false,
          field,
          error: rule.errorMessage || `${field} 不能小于 ${rule.min}`,
        }
      }
      if (rule.max !== undefined && value > rule.max) {
        return {
          valid: false,
          field,
          error: rule.errorMessage || `${field} 不能大于 ${rule.max}`,
        }
      }
    }

    // 长度检查
    if (typeof value === 'string' || Array.isArray(value)) {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return {
          valid: false,
          field,
          error: rule.errorMessage || `${field} 长度不能小于 ${rule.minLength}`,
        }
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return {
          valid: false,
          field,
          error: rule.errorMessage || `${field} 长度不能大于 ${rule.maxLength}`,
        }
      }
    }

    // 枚举值检查
    if (rule.enum && !rule.enum.includes(value)) {
      return {
        valid: false,
        field,
        error: rule.errorMessage || `${field} 必须是以下值之一: ${rule.enum.join(', ')}`,
      }
    }

    // 自定义验证函数
    if (rule.validator && typeof rule.validator === 'function') {
      try {
        const result = rule.validator(value)
        if (result !== true) {
          return {
            valid: false,
            field,
            error: result || rule.errorMessage || `${field} 验证失败`,
          }
        }
      } catch (error) {
        return {
          valid: false,
          field,
          error: error.message || rule.errorMessage || `${field} 验证出错`,
        }
      }
    }

    return { valid: true, field, value }
  }

  /**
   * 验证数据对象
   * @param {Object} data - 要验证的数据
   * @param {Object} schema - 验证模式
   * @param {String} source - 数据源
   * @returns {Object} 验证结果
   */
  validateData(data, schema, source = 'unknown') {
    this.stats.totalValidations++
    if (this.stats.bySource[source]) {
      this.stats.bySource[source].validations++
    }

    const errors = []
    const validatedData = {}

    // 遍历模式中的每个字段
    for (const field in schema) {
      const rule = schema[field]
      const value = data[field]

      // 验证字段
      const result = this.validateField(field, value, rule)

      if (result.valid) {
        // 如果有转换后的值，使用转换后的值
        validatedData[field] = result.value !== undefined ? result.value : value
      } else {
        errors.push(result)
      }
    }

    // 更新统计信息
    if (errors.length === 0) {
      this.stats.passedValidations++
      if (this.stats.bySource[source]) {
        this.stats.bySource[source].passed++
      }
    } else {
      this.stats.failedValidations++
      if (this.stats.bySource[source]) {
        this.stats.bySource[source].failed++
      }
    }

    return {
      valid: errors.length === 0,
      data: validatedData,
      errors: errors.length > 0 ? errors : null,
    }
  }

  /**
   * 检查数据质量
   * @param {Object} data - 要检查的数据
   * @param {String} dataType - 数据类型
   * @param {String} source - 数据源
   * @returns {Object} 检查结果
   */
  checkDataQuality(data, dataType, source = 'unknown') {
    this.stats.qualityChecks++
    if (this.stats.bySource[source]) {
      this.stats.bySource[source].qualityChecks++
    }

    const issues = []
    const config = this.qualityCheckConfig

    // 检查数据完整性
    if (config.requiredFields[dataType]) {
      const missingFields = config.requiredFields[dataType].filter((field) => {
        return data[field] === undefined || data[field] === null || data[field] === ''
      })

      if (missingFields.length > 0) {
        issues.push({
          type: 'completeness',
          message: `缺少必要字段: ${missingFields.join(', ')}`,
          fields: missingFields,
        })
      }
    }

    // 根据数据类型执行特定的质量检查
    switch (dataType) {
      case 'stockQuote':
        // 检查价格异常
        if (data.changePercent && Math.abs(data.changePercent) > config.priceAnomalyThreshold) {
          issues.push({
            type: 'anomaly',
            message: `价格变化百分比异常: ${data.changePercent}%`,
            field: 'changePercent',
            value: data.changePercent,
          })
        }

        // 检查成交量异常
        if (
          data.volume &&
          data.averageVolume &&
          data.volume > data.averageVolume * (1 + config.volumeAnomalyThreshold / 100)
        ) {
          issues.push({
            type: 'anomaly',
            message: `成交量异常: ${data.volume}，超过平均成交量的${config.volumeAnomalyThreshold}%`,
            field: 'volume',
            value: data.volume,
          })
        }
        break

      case 'stockHistory':
        // 检查价格一致性
        if (config.consistencyChecks.priceConsistency) {
          if (data.high < data.low) {
            issues.push({
              type: 'consistency',
              message: '最高价低于最低价',
              fields: ['high', 'low'],
              values: [data.high, data.low],
            })
          }
          if (data.open < data.low || data.open > data.high) {
            issues.push({
              type: 'consistency',
              message: '开盘价不在最低价和最高价之间',
              fields: ['open', 'low', 'high'],
              values: [data.open, data.low, data.high],
            })
          }
          if (data.close < data.low || data.close > data.high) {
            issues.push({
              type: 'consistency',
              message: '收盘价不在最低价和最高价之间',
              fields: ['close', 'low', 'high'],
              values: [data.close, data.low, data.high],
            })
          }
        }
        break
    }

    // 更新统计信息
    if (issues.length > 0) {
      this.stats.qualityIssuesDetected += issues.length
      if (this.stats.bySource[source]) {
        this.stats.bySource[source].qualityIssues += issues.length
      }
    }

    return {
      passed: issues.length === 0,
      issues: issues.length > 0 ? issues : null,
      data,
    }
  }

  /**
   * 标准化数据格式
   * @param {Object} data - 要标准化的数据
   * @param {String} dataType - 数据类型
   * @param {String} source - 数据源
   * @returns {Object} 标准化后的数据
   */
  standardizeData(data, dataType, source) {
    this.stats.transformations++
    if (this.stats.bySource[source]) {
      this.stats.bySource[source].transformations++
    }

    // 创建一个新对象，避免修改原始数据
    const standardized = { ...data }

    // 根据数据类型和数据源应用不同的标准化规则
    switch (dataType) {
      case 'stockQuote':
        // 标准化股票行情数据
        return this.standardizeStockQuote(standardized, source)

      case 'stockHistory':
        // 标准化股票历史数据
        return this.standardizeStockHistory(standardized, source)

      case 'stockInfo':
        // 标准化股票基本信息
        return this.standardizeStockInfo(standardized, source)

      default:
        return standardized
    }
  }

  /**
   * 标准化股票行情数据
   * @param {Object} data - 股票行情数据
   * @param {String} source - 数据源
   * @returns {Object} 标准化后的数据
   */
  standardizeStockQuote(data, source) {
    const standardized = { ...data }

    // 确保字段名称一致
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
      },
    }

    // 应用字段映射
    const mapping = fieldMappings[source]
    if (mapping) {
      for (const [sourceField, targetField] of Object.entries(mapping)) {
        if (data[sourceField] !== undefined) {
          standardized[targetField] = data[sourceField]
          // 如果源字段和目标字段不同，删除源字段
          if (sourceField !== targetField) {
            delete standardized[sourceField]
          }
        }
      }
    }

    // 确保数值类型正确
    if (standardized.price !== undefined) {
      standardized.price = Number(standardized.price)
    }
    if (standardized.change !== undefined) {
      standardized.change = Number(standardized.change)
    }
    if (standardized.changePercent !== undefined) {
      standardized.changePercent = Number(standardized.changePercent)
    }
    if (standardized.volume !== undefined) {
      standardized.volume = Number(standardized.volume)
    }
    if (standardized.amount !== undefined) {
      standardized.amount = Number(standardized.amount)
    }
    if (standardized.turnoverRate !== undefined) {
      standardized.turnoverRate = Number(standardized.turnoverRate)
    }

    // 添加数据源和时间戳信息
    standardized.source = source
    if (!standardized.timestamp) {
      standardized.timestamp = Date.now()
    }

    return standardized
  }

  /**
   * 标准化股票历史数据
   * @param {Object} data - 股票历史数据
   * @param {String} source - 数据源
   * @returns {Object} 标准化后的数据
   */
  standardizeStockHistory(data, source) {
    const standardized = { ...data }

    // 确保字段名称一致
    const fieldMappings = {
      tushare: {
        trade_date: 'date',
        open: 'open',
        high: 'high',
        low: 'low',
        close: 'close',
        vol: 'volume',
        amount: 'amount',
        adj_close: 'adjustedClose',
      },
      akshare: {
        日期: 'date',
        开盘: 'open',
        最高: 'high',
        最低: 'low',
        收盘: 'close',
        成交量: 'volume',
        成交额: 'amount',
        复权收盘: 'adjustedClose',
      },
      sina: {
        day: 'date',
        open: 'open',
        high: 'high',
        low: 'low',
        close: 'close',
        volume: 'volume',
        amount: 'amount',
        adj_close: 'adjustedClose',
      },
      eastmoney: {
        date: 'date',
        open: 'open',
        high: 'high',
        low: 'low',
        close: 'close',
        volume: 'volume',
        amount: 'amount',
        adjclose: 'adjustedClose',
      },
    }

    // 应用字段映射
    const mapping = fieldMappings[source]
    if (mapping) {
      for (const [sourceField, targetField] of Object.entries(mapping)) {
        if (data[sourceField] !== undefined) {
          standardized[targetField] = data[sourceField]
          // 如果源字段和目标字段不同，删除源字段
          if (sourceField !== targetField) {
            delete standardized[sourceField]
          }
        }
      }
    }

    // 确保数值类型正确
    if (standardized.open !== undefined) {
      standardized.open = Number(standardized.open)
    }
    if (standardized.high !== undefined) {
      standardized.high = Number(standardized.high)
    }
    if (standardized.low !== undefined) {
      standardized.low = Number(standardized.low)
    }
    if (standardized.close !== undefined) {
      standardized.close = Number(standardized.close)
    }
    if (standardized.volume !== undefined) {
      standardized.volume = Number(standardized.volume)
    }
    if (standardized.amount !== undefined) {
      standardized.amount = Number(standardized.amount)
    }
    if (standardized.adjustedClose !== undefined) {
      standardized.adjustedClose = Number(standardized.adjustedClose)
    }

    // 标准化日期格式
    if (standardized.date) {
      // 处理不同的日期格式
      if (typeof standardized.date === 'string') {
        // 处理YYYYMMDD格式
        if (/^\d{8}$/.test(standardized.date)) {
          standardized.date = `${standardized.date.substring(0, 4)}-${standardized.date.substring(
            4,
            6
          )}-${standardized.date.substring(6, 8)}`
        }
        // 其他格式可以根据需要添加
      }
    }

    // 添加数据源信息
    standardized.source = source

    return standardized
  }

  /**
   * 标准化股票基本信息
   * @param {Object} data - 股票基本信息
   * @param {String} source - 数据源
   * @returns {Object} 标准化后的数据
   */
  standardizeStockInfo(data, source) {
    const standardized = { ...data }

    // 确保字段名称一致
    const fieldMappings = {
      tushare: {
        ts_code: 'symbol',
        name: 'name',
        area: 'area',
        industry: 'industry',
        market: 'market',
        list_date: 'listDate',
        exchange: 'exchange',
      },
      akshare: {
        代码: 'symbol',
        名称: 'name',
        地区: 'area',
        行业: 'industry',
        市场: 'market',
        上市日期: 'listDate',
        交易所: 'exchange',
      },
      sina: {
        symbol: 'symbol',
        name: 'name',
        area: 'area',
        industry: 'industry',
        market: 'market',
        list_date: 'listDate',
        exchange: 'exchange',
      },
      eastmoney: {
        code: 'symbol',
        name: 'name',
        area: 'area',
        industry: 'industry',
        market: 'market',
        list_date: 'listDate',
        exchange: 'exchange',
      },
    }

    // 应用字段映射
    const mapping = fieldMappings[source]
    if (mapping) {
      for (const [sourceField, targetField] of Object.entries(mapping)) {
        if (data[sourceField] !== undefined) {
          standardized[targetField] = data[sourceField]
          // 如果源字段和目标字段不同，删除源字段
          if (sourceField !== targetField) {
            delete standardized[sourceField]
          }
        }
      }
    }

    // 标准化上市日期格式
    if (standardized.listDate) {
      // 处理不同的日期格式
      if (typeof standardized.listDate === 'string') {
        // 处理YYYYMMDD格式
        if (/^\d{8}$/.test(standardized.listDate)) {
          standardized.listDate = `${standardized.listDate.substring(
            0,
            4
          )}-${standardized.listDate.substring(4, 6)}-${standardized.listDate.substring(6, 8)}`
        }
        // 其他格式可以根据需要添加
      }
    }

    // 添加数据源和时间戳信息
    standardized.source = source
    standardized.lastUpdated = new Date().toISOString()

    return standardized
  }

  /**
   * 获取验证统计信息
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
      totalValidations: 0,
      passedValidations: 0,
      failedValidations: 0,
      qualityChecks: 0,
      qualityIssuesDetected: 0,
      transformations: 0,
      bySource: {},
    }

    // 初始化数据源统计
    const sources = Object.keys(this.app.config.dataSource.sources || {})
    for (const source of sources) {
      this.stats.bySource[source] = {
        validations: 0,
        passed: 0,
        failed: 0,
        qualityChecks: 0,
        qualityIssues: 0,
        transformations: 0,
      }
    }
  }

  /**
   * 处理数据（验证、质量检查和标准化）
   * @param {Object} data - 要处理的数据
   * @param {Object} schema - 验证模式
   * @param {String} dataType - 数据类型
   * @param {String} source - 数据源
   * @param {Object} options - 选项
   * @returns {Object} 处理结果
   */
  processData(data, schema, dataType, source, options = {}) {
    const {
      skipValidation = false,
      skipQualityCheck = false,
      skipStandardization = false,
      throwOnError = false,
    } = options

    let processedData = data
    let validationResult = { valid: true }
    let qualityResult = { passed: true }
    const issues = []

    try {
      // 步骤1：数据验证
      if (!skipValidation) {
        validationResult = this.validateData(processedData, schema, source)
        if (!validationResult.valid) {
          issues.push(...(validationResult.errors || []))
          if (throwOnError) {
            throw new Error(`数据验证失败: ${JSON.stringify(validationResult.errors)}`)
          }
        } else {
          processedData = validationResult.data
        }
      }

      // 步骤2：数据质量检查
      if (!skipQualityCheck) {
        qualityResult = this.checkDataQuality(processedData, dataType, source)
        if (!qualityResult.passed) {
          issues.push(...(qualityResult.issues || []))
          if (throwOnError) {
            throw new Error(`数据质量检查失败: ${JSON.stringify(qualityResult.issues)}`)
          }
        }
      }

      // 步骤3：数据标准化
      if (!skipStandardization) {
        processedData = this.standardizeData(processedData, dataType, source)
      }

      return {
        success: issues.length === 0,
        data: processedData,
        issues: issues.length > 0 ? issues : null,
        validation: validationResult,
        quality: qualityResult,
      }
    } catch (error) {
      this.logger.error(`[DataValidator] 处理数据失败: ${error.message}`, error)

      if (throwOnError) {
        throw error
      }

      return {
        success: false,
        data: processedData,
        issues: [...issues, { type: 'error', message: error.message }],
        validation: validationResult,
        quality: qualityResult,
        error: error.message,
      }
    }
  }

  /**
   * 批量处理数据
   * @param {Array} dataArray - 要处理的数据数组
   * @param {Object} schema - 验证模式
   * @param {String} dataType - 数据类型
   * @param {String} source - 数据源
   * @param {Object} options - 选项
   * @returns {Object} 处理结果
   */
  processBatchData(dataArray, schema, dataType, source, options = {}) {
    const results = []
    const processedData = []
    const failedItems = []
    let successCount = 0
    let failureCount = 0

    for (let i = 0; i < dataArray.length; i++) {
      const result = this.processData(dataArray[i], schema, dataType, source, options)
      results.push(result)

      if (result.success) {
        processedData.push(result.data)
        successCount++
      } else {
        failedItems.push({
          index: i,
          data: dataArray[i],
          issues: result.issues,
        })
        failureCount++
      }
    }

    return {
      success: failureCount === 0,
      data: processedData,
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
   * 关闭数据验证器
   */
  async shutdown() {
    this.logger.info('[DataValidator] 关闭数据验证器')
    // 清理资源
  }
}

module.exports = DataValidator
