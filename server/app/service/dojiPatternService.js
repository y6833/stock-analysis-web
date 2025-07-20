'use strict'

/**
 * 十字星形态服务
 * 提供形态识别、筛选、统计分析等功能
 */
const Service = require('egg').Service

class DojiPatternService extends Service {
  /**
   * 筛选出现十字星后上涨的股票
   * @param {Object} criteria 筛选条件
   * @returns {Object} 筛选结果
   */
  async screenUpwardStocks(criteria) {
    const {
      days = 3,
      patternTypes = ['standard'],
      minUpwardPercent = 0,
      sortBy = 'priceChange',
      sortDirection = 'desc',
      limit = 20,
      offset = 0,
      useCache = true,
    } = criteria

    // 尝试从缓存获取结果
    if (useCache) {
      const cachedResult = await this.getCachedResult('upward_stocks_screening', criteria)
      if (cachedResult) {
        return cachedResult
      }
    }

    // 执行数据库查询
    const result = await this.ctx.model.DojiPattern.findUpwardStocks({
      days,
      patternTypes,
      minUpwardPercent,
      sortBy,
      sortDirection,
      limit,
      offset,
    })

    // 处理结果数据
    const processedData = result.rows.map((pattern) => ({
      stockId: pattern.stockId,
      stockName: pattern.stockName,
      patternDate: pattern.patternDate,
      patternType: pattern.patternType,
      priceBeforePattern: pattern.candleData.close,
      currentPrice: this.calculateCurrentPrice(pattern),
      priceChange: pattern.priceMovement?.day5 || 0,
      volumeChange: pattern.context?.volumeChange || 0,
      significance: pattern.significance,
      rank: offset + result.rows.indexOf(pattern) + 1,
    }))

    const finalResult = {
      data: processedData,
      totalCount: result.count,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < result.count,
      },
      fromCache: false,
    }

    // 缓存结果
    if (useCache) {
      await this.setCachedResult('upward_stocks_screening', criteria, finalResult, 300)
    }

    return finalResult
  }

  /**
   * 获取最近的十字星形态
   * @param {Object} params 查询参数
   * @returns {Array} 形态列表
   */
  async getRecentPatterns(params) {
    const { days = 7, patternType = null, limit = 50, useCache = true } = params

    // 尝试从缓存获取结果
    if (useCache) {
      const cachedResult = await this.getCachedResult('pattern_history_query', params)
      if (cachedResult) {
        return cachedResult
      }
    }

    const patterns = await this.ctx.model.DojiPattern.findRecentPatterns(days, patternType, limit)

    const result = {
      data: patterns,
      totalCount: patterns.length,
      fromCache: false,
    }

    // 缓存结果
    if (useCache) {
      await this.setCachedResult('pattern_history_query', params, result, 600)
    }

    return result
  }

  /**
   * 分析价格走势
   * @param {String} stockId 股票代码
   * @param {String} patternDate 形态日期
   * @param {Number} days 分析天数
   * @returns {Object} 价格走势分析
   */
  async analyzePriceMovement(stockId, patternDate, days = 5) {
    return await this.ctx.model.DojiPattern.analyzePriceMovement(stockId, patternDate, days)
  }

  /**
   * 获取形态统计数据
   * @param {Object} params 查询参数
   * @returns {Object} 统计数据
   */
  async getPatternStatistics(params) {
    const {
      patternType = null,
      analysisPeriod = 5,
      marketCondition = null,
      forceUpdate = false,
    } = params

    // 检查是否需要更新统计数据
    if (
      forceUpdate ||
      (await this.ctx.model.DojiPatternStatistics.needsUpdate(
        patternType,
        analysisPeriod,
        marketCondition
      ))
    ) {
      await this.ctx.model.DojiPatternStatistics.updateStats(
        patternType,
        analysisPeriod,
        marketCondition
      )
    }

    return await this.ctx.model.DojiPatternStatistics.getStatsSummary(patternType, analysisPeriod)
  }

  /**
   * 创建形态提醒
   * @param {Object} alertData 提醒数据
   * @returns {Object} 创建的提醒
   */
  async createPatternAlert(alertData) {
    const alert = await this.ctx.model.DojiPatternAlert.create(alertData)

    // 清理相关缓存
    await this.clearRelatedCache('pattern_alerts')

    return alert
  }

  /**
   * 更新形态提醒
   * @param {Number} alertId 提醒ID
   * @param {Object} updateData 更新数据
   * @returns {Object} 更新后的提醒
   */
  async updatePatternAlert(alertId, updateData) {
    const alert = await this.ctx.model.DojiPatternAlert.findByPk(alertId)
    if (!alert) {
      throw new Error('提醒不存在')
    }

    await alert.update(updateData)

    // 清理相关缓存
    await this.clearRelatedCache('pattern_alerts')

    return alert
  }

  /**
   * 删除形态提醒
   * @param {Number} alertId 提醒ID
   * @returns {Boolean} 删除结果
   */
  async deletePatternAlert(alertId) {
    const alert = await this.ctx.model.DojiPatternAlert.findByPk(alertId)
    if (!alert) {
      throw new Error('提醒不存在')
    }

    await alert.destroy()

    // 清理相关缓存
    await this.clearRelatedCache('pattern_alerts')

    return true
  }

  /**
   * 获取用户的形态提醒
   * @param {Number} userId 用户ID
   * @returns {Array} 提醒列表
   */
  async getUserPatternAlerts(userId) {
    return await this.ctx.model.DojiPatternAlert.findActiveByUser(userId)
  }

  /**
   * 触发形态提醒
   * @param {Object} pattern 形态数据
   * @returns {Array} 触发的提醒列表
   */
  async triggerPatternAlerts(pattern) {
    const alerts = await this.ctx.model.DojiPatternAlert.findActiveByStock(pattern.stockId)
    const triggeredAlerts = []

    for (const alert of alerts) {
      if (alert.matchesPattern(pattern)) {
        await alert.trigger(pattern)
        triggeredAlerts.push(alert)
      }
    }

    return triggeredAlerts
  }

  /**
   * 获取缓存结果
   * @param {String} queryType 查询类型
   * @param {Object} queryParams 查询参数
   * @returns {Object|null} 缓存结果
   */
  async getCachedResult(queryType, queryParams) {
    try {
      const cacheParams = { queryType, ...queryParams }
      return await this.ctx.model.DojiPatternQueryCache.getCache(cacheParams)
    } catch (error) {
      this.logger.warn('获取缓存失败:', error)
      return null
    }
  }

  /**
   * 设置缓存结果
   * @param {String} queryType 查询类型
   * @param {Object} queryParams 查询参数
   * @param {Object} result 结果数据
   * @param {Number} cacheDuration 缓存时长（秒）
   * @returns {Boolean} 设置结果
   */
  async setCachedResult(queryType, queryParams, result, cacheDuration = 300) {
    try {
      const cacheParams = { queryType, ...queryParams }
      await this.ctx.model.DojiPatternQueryCache.setCache(
        cacheParams,
        result.data,
        result.totalCount,
        cacheDuration
      )
      return true
    } catch (error) {
      this.logger.warn('设置缓存失败:', error)
      return false
    }
  }

  /**
   * 清理相关缓存
   * @param {String} pattern 缓存模式
   * @returns {Number} 清理的缓存数量
   */
  async clearRelatedCache(pattern) {
    try {
      return await this.ctx.model.DojiPatternQueryCache.clearCacheByPattern(pattern)
    } catch (error) {
      this.logger.warn('清理缓存失败:', error)
      return 0
    }
  }

  /**
   * 清理过期缓存
   * @returns {Number} 清理的缓存数量
   */
  async cleanExpiredCache() {
    try {
      return await this.ctx.model.DojiPatternQueryCache.cleanExpiredCache()
    } catch (error) {
      this.logger.warn('清理过期缓存失败:', error)
      return 0
    }
  }

  /**
   * 获取缓存统计
   * @returns {Object} 缓存统计信息
   */
  async getCacheStats() {
    try {
      return await this.ctx.model.DojiPatternQueryCache.getCacheStats()
    } catch (error) {
      this.logger.warn('获取缓存统计失败:', error)
      return { totalCaches: 0, activeCaches: 0, expiredCaches: 0, hitStats: {} }
    }
  }

  /**
   * 计算当前价格（模拟）
   * @param {Object} pattern 形态数据
   * @returns {Number} 当前价格
   */
  calculateCurrentPrice(pattern) {
    // 这里应该调用实时价格API，暂时使用模拟数据
    const basePrice = pattern.candleData.close
    const priceChange = pattern.priceMovement?.day5 || 0
    return basePrice * (1 + priceChange / 100)
  }

  /**
   * 批量保存形态识别结果
   * @param {Array} patterns 形态数组
   * @returns {Array} 保存的形态
   */
  async batchSavePatterns(patterns) {
    const savedPatterns = []

    for (const patternData of patterns) {
      try {
        const pattern = await this.ctx.model.DojiPattern.create(patternData)
        savedPatterns.push(pattern)

        // 触发相关提醒
        await this.triggerPatternAlerts(pattern)
      } catch (error) {
        this.logger.error('保存形态失败:', error, patternData)
      }
    }

    // 清理相关缓存
    if (savedPatterns.length > 0) {
      await this.clearRelatedCache('upward_stocks')
      await this.clearRelatedCache('pattern_history')
    }

    return savedPatterns
  }

  /**
   * 获取分页配置
   * @param {String} queryType 查询类型
   * @returns {Object} 分页配置
   */
  async getPaginationConfig(queryType) {
    // 这里可以从数据库获取配置，暂时返回默认值
    const defaultConfigs = {
      upward_stocks_screening: { defaultPageSize: 20, maxPageSize: 100, cacheDuration: 300 },
      pattern_history_query: { defaultPageSize: 50, maxPageSize: 200, cacheDuration: 600 },
      pattern_statistics_query: { defaultPageSize: 10, maxPageSize: 50, cacheDuration: 1800 },
    }

    return (
      defaultConfigs[queryType] || { defaultPageSize: 20, maxPageSize: 100, cacheDuration: 300 }
    )
  }

  /**
   * 获取用户设置
   * @param {Number} userId 用户ID
   * @returns {Object} 用户设置
   */
  async getUserSettings(userId) {
    try {
      const userSettings = await this.ctx.model.DojiPatternUserSettings.findOne({
        where: { userId },
      })

      if (!userSettings) {
        // 返回默认设置
        return this.getDefaultSettings()
      }

      return {
        ...this.getDefaultSettings(),
        ...userSettings.settings,
        updatedAt: userSettings.updatedAt,
      }
    } catch (error) {
      this.logger.error('获取用户设置失败:', error)
      return this.getDefaultSettings()
    }
  }

  /**
   * 保存用户设置
   * @param {Number} userId 用户ID
   * @param {Object} settings 设置数据
   * @returns {Object} 保存的设置
   */
  async saveUserSettings(userId, settings) {
    try {
      const [userSettings, created] = await this.ctx.model.DojiPatternUserSettings.findOrCreate({
        where: { userId },
        defaults: {
          userId,
          settings,
        },
      })

      if (!created) {
        await userSettings.update({ settings })
      }

      return {
        ...this.getDefaultSettings(),
        ...settings,
        updatedAt: userSettings.updatedAt,
      }
    } catch (error) {
      this.logger.error('保存用户设置失败:', error)
      throw error
    }
  }

  /**
   * 重置用户设置
   * @param {Number} userId 用户ID
   * @returns {Object} 默认设置
   */
  async resetUserSettings(userId) {
    try {
      await this.ctx.model.DojiPatternUserSettings.destroy({
        where: { userId },
      })

      return this.getDefaultSettings()
    } catch (error) {
      this.logger.error('重置用户设置失败:', error)
      throw error
    }
  }

  /**
   * 验证设置
   * @param {Object} settings 设置数据
   * @returns {Object} 验证结果
   */
  async validateSettings(settings) {
    const errors = []

    try {
      // 验证基础识别参数
      if (
        typeof settings.bodyThreshold !== 'number' ||
        settings.bodyThreshold < 0.1 ||
        settings.bodyThreshold > 2.0
      ) {
        errors.push('敏感度阈值必须在0.1-2.0之间')
      }

      if (
        typeof settings.equalPriceThreshold !== 'number' ||
        settings.equalPriceThreshold < 0.01 ||
        settings.equalPriceThreshold > 1.0
      ) {
        errors.push('价格相等容差必须在0.01-1.0之间')
      }

      if (
        typeof settings.longLegThreshold !== 'number' ||
        settings.longLegThreshold < 1.0 ||
        settings.longLegThreshold > 5.0
      ) {
        errors.push('长腿阈值必须在1.0-5.0之间')
      }

      // 验证形态类型
      if (
        !Array.isArray(settings.enabledPatternTypes) ||
        settings.enabledPatternTypes.length === 0
      ) {
        errors.push('必须至少启用一种形态类型')
      }

      const validPatternTypes = ['standard', 'dragonfly', 'gravestone', 'longLegged']
      const invalidTypes = settings.enabledPatternTypes.filter(
        (type) => !validPatternTypes.includes(type)
      )
      if (invalidTypes.length > 0) {
        errors.push(`无效的形态类型: ${invalidTypes.join(', ')}`)
      }

      // 验证显示设置
      if (
        typeof settings.minSignificance !== 'number' ||
        settings.minSignificance < 0.1 ||
        settings.minSignificance > 1.0
      ) {
        errors.push('最小显著性必须在0.1-1.0之间')
      }

      const validMarkerSizes = ['small', 'medium', 'large']
      if (!validMarkerSizes.includes(settings.markerSize)) {
        errors.push('无效的标记大小')
      }

      if (
        typeof settings.markerOpacity !== 'number' ||
        settings.markerOpacity < 0.3 ||
        settings.markerOpacity > 1.0
      ) {
        errors.push('标记透明度必须在0.3-1.0之间')
      }

      // 验证性能设置
      const validCalculationModes = ['realtime', 'ondemand', 'cached']
      if (!validCalculationModes.includes(settings.calculationMode)) {
        errors.push('无效的计算模式')
      }

      if (
        typeof settings.cacheTimeout !== 'number' ||
        settings.cacheTimeout < 60 ||
        settings.cacheTimeout > 3600
      ) {
        errors.push('缓存时长必须在60-3600秒之间')
      }

      if (
        typeof settings.maxCalculationCount !== 'number' ||
        settings.maxCalculationCount < 100 ||
        settings.maxCalculationCount > 10000
      ) {
        errors.push('最大计算数量必须在100-10000之间')
      }

      return {
        valid: errors.length === 0,
        errors,
      }
    } catch (error) {
      this.logger.error('验证设置失败:', error)
      return {
        valid: false,
        errors: ['设置验证过程中发生错误'],
      }
    }
  }

  /**
   * 获取设置预设
   * @returns {Array} 预设列表
   */
  async getSettingsPresets() {
    return [
      {
        name: '保守型',
        description: '严格的识别标准，减少误报',
        features: ['高精度', '低噪音', '适合新手'],
        settings: {
          bodyThreshold: 0.3,
          equalPriceThreshold: 0.05,
          longLegThreshold: 2.5,
          minSignificance: 0.7,
          enabledPatternTypes: ['standard', 'dragonfly', 'gravestone'],
          markerSize: 'medium',
          markerOpacity: 0.8,
          displayOptions: ['showTooltip', 'showSignificance'],
          calculationMode: 'cached',
          cacheTimeout: 600,
          maxCalculationCount: 500,
        },
      },
      {
        name: '平衡型',
        description: '平衡的识别标准，推荐设置',
        features: ['平衡性能', '适中精度', '推荐使用'],
        settings: {
          bodyThreshold: 0.5,
          equalPriceThreshold: 0.1,
          longLegThreshold: 2.0,
          minSignificance: 0.5,
          enabledPatternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
          markerSize: 'medium',
          markerOpacity: 0.8,
          displayOptions: ['showTooltip', 'showSignificance', 'showPriceMovement'],
          calculationMode: 'cached',
          cacheTimeout: 300,
          maxCalculationCount: 1000,
        },
      },
      {
        name: '激进型',
        description: '宽松的识别标准，捕获更多信号',
        features: ['高敏感度', '更多信号', '适合专业用户'],
        settings: {
          bodyThreshold: 0.8,
          equalPriceThreshold: 0.2,
          longLegThreshold: 1.5,
          minSignificance: 0.3,
          enabledPatternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
          markerSize: 'large',
          markerOpacity: 0.9,
          displayOptions: ['showTooltip', 'showSignificance', 'showPriceMovement', 'autoHideWeak'],
          calculationMode: 'realtime',
          cacheTimeout: 120,
          maxCalculationCount: 2000,
        },
      },
    ]
  }

  /**
   * 获取性能统计
   * @param {Number} userId 用户ID
   * @returns {Object} 性能统计
   */
  async getPerformanceStats(userId) {
    try {
      // 这里应该从实际的性能监控数据中获取，暂时返回模拟数据
      const stats = await this.ctx.model.DojiPatternPerformanceStats.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']],
      })

      if (!stats) {
        return {
          avgCalculationTime: 45,
          cacheHitRate: 85,
          memoryUsage: 12.5,
          totalCalculations: 0,
          lastCalculationTime: null,
        }
      }

      return {
        avgCalculationTime: stats.avgCalculationTime,
        cacheHitRate: stats.cacheHitRate,
        memoryUsage: stats.memoryUsage,
        totalCalculations: stats.totalCalculations,
        lastCalculationTime: stats.lastCalculationTime,
      }
    } catch (error) {
      this.logger.error('获取性能统计失败:', error)
      return {
        avgCalculationTime: 0,
        cacheHitRate: 0,
        memoryUsage: 0,
        totalCalculations: 0,
        lastCalculationTime: null,
      }
    }
  }

  /**
   * 获取默认设置
   * @returns {Object} 默认设置
   */
  getDefaultSettings() {
    return {
      // 基础识别参数
      bodyThreshold: 0.5,
      equalPriceThreshold: 0.1,
      longLegThreshold: 2.0,

      // 形态类型
      enabledPatternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],

      // 显示设置
      minSignificance: 0.5,
      markerSize: 'medium',
      markerOpacity: 0.8,
      displayOptions: ['showTooltip', 'showSignificance', 'showPriceMovement'],

      // 性能设置
      calculationMode: 'cached',
      cacheTimeout: 300,
      maxCalculationCount: 1000,
    }
  }
}

module.exports = DojiPatternService
