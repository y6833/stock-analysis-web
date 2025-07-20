'use strict'

/**
 * 十字星形态控制器
 * 处理十字星形态相关的API请求
 */
const Controller = require('egg').Controller

class DojiPatternController extends Controller {
  /**
   * 筛选出现十字星后上涨的股票
   * POST /api/v1/screener/doji/upward
   */
  async screenUpwardStocks() {
    const { ctx } = this

    try {
      // 参数验证
      const params = ctx.request.body
      const {
        days = 3,
        patternTypes = ['standard'],
        minUpwardPercent = 0,
        sortBy = 'priceChange',
        sortDirection = 'desc',
        limit = 20,
        offset = 0,
      } = params

      // 参数校验
      if (days < 1 || days > 30) {
        ctx.throw(400, '查询天数必须在1-30之间')
      }

      if (limit > 100) {
        ctx.throw(400, '单次查询限制不能超过100条')
      }

      const validPatternTypes = ['standard', 'dragonfly', 'gravestone', 'longLegged']
      const invalidTypes = patternTypes.filter((type) => !validPatternTypes.includes(type))
      if (invalidTypes.length > 0) {
        ctx.throw(400, `无效的形态类型: ${invalidTypes.join(', ')}`)
      }

      const validSortFields = ['priceChange', 'volumeChange', 'patternDate', 'significance']
      if (!validSortFields.includes(sortBy)) {
        ctx.throw(400, `无效的排序字段: ${sortBy}`)
      }

      // 调用服务
      const result = await ctx.service.dojiPatternService.screenUpwardStocks({
        days,
        patternTypes,
        minUpwardPercent,
        sortBy,
        sortDirection,
        limit,
        offset,
      })

      ctx.body = {
        success: true,
        data: result.data,
        pagination: result.pagination,
        totalCount: result.totalCount,
        fromCache: result.fromCache,
      }
    } catch (error) {
      ctx.logger.error('筛选上涨股票失败:', error)
      ctx.throw(error.status || 500, error.message || '筛选失败')
    }
  }

  /**
   * 获取价格走势分析
   * GET /api/v1/patterns/doji/price-movement
   */
  async getPriceMovement() {
    const { ctx } = this

    try {
      const { stockId, patternDate, days = 5 } = ctx.query

      if (!stockId || !patternDate) {
        ctx.throw(400, '股票代码和形态日期不能为空')
      }

      if (days < 1 || days > 30) {
        ctx.throw(400, '分析天数必须在1-30之间')
      }

      const result = await ctx.service.dojiPatternService.analyzePriceMovement(
        stockId,
        patternDate,
        days
      )

      if (!result) {
        ctx.throw(404, '未找到对应的形态数据')
      }

      ctx.body = {
        success: true,
        data: result,
      }
    } catch (error) {
      ctx.logger.error('获取价格走势分析失败:', error)
      ctx.throw(error.status || 500, error.message || '获取分析失败')
    }
  }

  /**
   * 获取形态统计数据
   * GET /api/v1/patterns/doji/stats
   */
  async getPatternStatistics() {
    const { ctx } = this

    try {
      const {
        type: patternType,
        days: analysisPeriod = 5,
        marketCondition,
        forceUpdate = false,
      } = ctx.query

      const validPatternTypes = ['standard', 'dragonfly', 'gravestone', 'longLegged']
      if (patternType && !validPatternTypes.includes(patternType)) {
        ctx.throw(400, `无效的形态类型: ${patternType}`)
      }

      const validMarketConditions = ['bull', 'bear', 'sideways']
      if (marketCondition && !validMarketConditions.includes(marketCondition)) {
        ctx.throw(400, `无效的市场环境: ${marketCondition}`)
      }

      const result = await ctx.service.dojiPatternService.getPatternStatistics({
        patternType,
        analysisPeriod: parseInt(analysisPeriod),
        marketCondition,
        forceUpdate: forceUpdate === 'true',
      })

      ctx.body = {
        success: true,
        data: result,
      }
    } catch (error) {
      ctx.logger.error('获取形态统计失败:', error)
      ctx.throw(error.status || 500, error.message || '获取统计失败')
    }
  }

  /**
   * 获取最近形态
   * GET /api/v1/patterns/doji/recent
   */
  async getRecentPatterns() {
    const { ctx } = this

    try {
      const { days = 7, type: patternType, limit = 50 } = ctx.query

      if (days < 1 || days > 90) {
        ctx.throw(400, '查询天数必须在1-90之间')
      }

      if (limit > 200) {
        ctx.throw(400, '单次查询限制不能超过200条')
      }

      const validPatternTypes = ['standard', 'dragonfly', 'gravestone', 'longLegged']
      if (patternType && !validPatternTypes.includes(patternType)) {
        ctx.throw(400, `无效的形态类型: ${patternType}`)
      }

      const result = await ctx.service.dojiPatternService.getRecentPatterns({
        days: parseInt(days),
        patternType,
        limit: parseInt(limit),
      })

      ctx.body = {
        success: true,
        data: result.data,
        totalCount: result.totalCount,
        fromCache: result.fromCache,
      }
    } catch (error) {
      ctx.logger.error('获取最近形态失败:', error)
      ctx.throw(error.status || 500, error.message || '获取失败')
    }
  }

  /**
   * 创建形态提醒
   * POST /api/v1/patterns/doji/alerts
   */
  async createPatternAlert() {
    const { ctx } = this

    try {
      const userId = ctx.state.user?.id
      if (!userId) {
        ctx.throw(401, '用户未登录')
      }

      const alertData = ctx.request.body
      const {
        stockId,
        stockName,
        patternTypes = ['standard'],
        minSignificance = 0.5,
        marketConditions,
        notificationMethods = ['web'],
      } = alertData

      // 参数校验
      const validPatternTypes = ['standard', 'dragonfly', 'gravestone', 'longLegged']
      const invalidTypes = patternTypes.filter((type) => !validPatternTypes.includes(type))
      if (invalidTypes.length > 0) {
        ctx.throw(400, `无效的形态类型: ${invalidTypes.join(', ')}`)
      }

      if (minSignificance < 0 || minSignificance > 1) {
        ctx.throw(400, '最小显著性必须在0-1之间')
      }

      const validNotificationMethods = ['web', 'email', 'sms']
      const invalidMethods = notificationMethods.filter(
        (method) => !validNotificationMethods.includes(method)
      )
      if (invalidMethods.length > 0) {
        ctx.throw(400, `无效的通知方式: ${invalidMethods.join(', ')}`)
      }

      const alert = await ctx.service.dojiPatternService.createPatternAlert({
        userId,
        stockId,
        stockName,
        patternTypes,
        minSignificance,
        marketConditions,
        notificationMethods,
      })

      ctx.body = {
        success: true,
        data: alert,
      }
    } catch (error) {
      ctx.logger.error('创建形态提醒失败:', error)
      ctx.throw(error.status || 500, error.message || '创建失败')
    }
  }

  /**
   * 获取用户的形态提醒
   * GET /api/v1/patterns/doji/alerts
   */
  async getUserPatternAlerts() {
    const { ctx } = this

    try {
      const userId = ctx.state.user?.id
      if (!userId) {
        ctx.throw(401, '用户未登录')
      }

      const alerts = await ctx.service.dojiPatternService.getUserPatternAlerts(userId)

      ctx.body = {
        success: true,
        data: alerts,
      }
    } catch (error) {
      ctx.logger.error('获取用户形态提醒失败:', error)
      ctx.throw(error.status || 500, error.message || '获取失败')
    }
  }

  /**
   * 更新形态提醒
   * PUT /api/v1/patterns/doji/alerts/:id
   */
  async updatePatternAlert() {
    const { ctx } = this

    try {
      const userId = ctx.state.user?.id
      if (!userId) {
        ctx.throw(401, '用户未登录')
      }

      const alertId = ctx.params.id
      const updateData = ctx.request.body

      // 验证提醒是否属于当前用户
      const existingAlert = await ctx.model.DojiPatternAlert.findOne({
        where: { id: alertId, userId },
      })

      if (!existingAlert) {
        ctx.throw(404, '提醒不存在或无权限')
      }

      const alert = await ctx.service.dojiPatternService.updatePatternAlert(alertId, updateData)

      ctx.body = {
        success: true,
        data: alert,
      }
    } catch (error) {
      ctx.logger.error('更新形态提醒失败:', error)
      ctx.throw(error.status || 500, error.message || '更新失败')
    }
  }

  /**
   * 删除形态提醒
   * DELETE /api/v1/patterns/doji/alerts/:id
   */
  async deletePatternAlert() {
    const { ctx } = this

    try {
      const userId = ctx.state.user?.id
      if (!userId) {
        ctx.throw(401, '用户未登录')
      }

      const alertId = ctx.params.id

      // 验证提醒是否属于当前用户
      const existingAlert = await ctx.model.DojiPatternAlert.findOne({
        where: { id: alertId, userId },
      })

      if (!existingAlert) {
        ctx.throw(404, '提醒不存在或无权限')
      }

      await ctx.service.dojiPatternService.deletePatternAlert(alertId)

      ctx.body = {
        success: true,
        message: '删除成功',
      }
    } catch (error) {
      ctx.logger.error('删除形态提醒失败:', error)
      ctx.throw(error.status || 500, error.message || '删除失败')
    }
  }

  /**
   * 批量保存形态识别结果
   * POST /api/v1/patterns/doji/batch
   */
  async batchSavePatterns() {
    const { ctx } = this

    try {
      const patterns = ctx.request.body.patterns

      if (!Array.isArray(patterns) || patterns.length === 0) {
        ctx.throw(400, '形态数据不能为空')
      }

      if (patterns.length > 1000) {
        ctx.throw(400, '单次批量保存不能超过1000条')
      }

      const savedPatterns = await ctx.service.dojiPatternService.batchSavePatterns(patterns)

      ctx.body = {
        success: true,
        data: {
          savedCount: savedPatterns.length,
          totalCount: patterns.length,
        },
      }
    } catch (error) {
      ctx.logger.error('批量保存形态失败:', error)
      ctx.throw(error.status || 500, error.message || '批量保存失败')
    }
  }

  /**
   * 获取缓存统计
   * GET /api/v1/patterns/doji/cache-stats
   */
  async getCacheStats() {
    const { ctx } = this

    try {
      const stats = await ctx.service.dojiPatternService.getCacheStats()

      ctx.body = {
        success: true,
        data: stats,
      }
    } catch (error) {
      ctx.logger.error('获取缓存统计失败:', error)
      ctx.throw(error.status || 500, error.message || '获取统计失败')
    }
  }

  /**
   * 清理过期缓存
   * POST /api/v1/patterns/doji/clean-cache
   */
  async cleanExpiredCache() {
    const { ctx } = this

    try {
      const deletedCount = await ctx.service.dojiPatternService.cleanExpiredCache()

      ctx.body = {
        success: true,
        data: {
          deletedCount,
        },
      }
    } catch (error) {
      ctx.logger.error('清理过期缓存失败:', error)
      ctx.throw(error.status || 500, error.message || '清理失败')
    }
  }

  /**
   * 获取用户设置
   * GET /api/v1/patterns/doji/settings
   */
  async getUserSettings() {
    const { ctx } = this

    try {
      const userId = ctx.state.user?.id
      if (!userId) {
        ctx.throw(401, '用户未登录')
      }

      const settings = await ctx.service.dojiPatternService.getUserSettings(userId)

      ctx.body = {
        success: true,
        data: settings,
      }
    } catch (error) {
      ctx.logger.error('获取用户设置失败:', error)
      ctx.throw(error.status || 500, error.message || '获取设置失败')
    }
  }

  /**
   * 保存用户设置
   * POST /api/v1/patterns/doji/settings
   */
  async saveUserSettings() {
    const { ctx } = this

    try {
      const userId = ctx.state.user?.id
      if (!userId) {
        ctx.throw(401, '用户未登录')
      }

      const settings = ctx.request.body

      // 验证设置数据
      const validationResult = await ctx.service.dojiPatternService.validateSettings(settings)
      if (!validationResult.valid) {
        ctx.throw(400, `设置验证失败: ${validationResult.errors.join(', ')}`)
      }

      const savedSettings = await ctx.service.dojiPatternService.saveUserSettings(userId, settings)

      ctx.body = {
        success: true,
        data: savedSettings,
      }
    } catch (error) {
      ctx.logger.error('保存用户设置失败:', error)
      ctx.throw(error.status || 500, error.message || '保存设置失败')
    }
  }

  /**
   * 重置用户设置
   * DELETE /api/v1/patterns/doji/settings
   */
  async resetUserSettings() {
    const { ctx } = this

    try {
      const userId = ctx.state.user?.id
      if (!userId) {
        ctx.throw(401, '用户未登录')
      }

      const defaultSettings = await ctx.service.dojiPatternService.resetUserSettings(userId)

      ctx.body = {
        success: true,
        data: defaultSettings,
      }
    } catch (error) {
      ctx.logger.error('重置用户设置失败:', error)
      ctx.throw(error.status || 500, error.message || '重置设置失败')
    }
  }

  /**
   * 获取设置预设
   * GET /api/v1/patterns/doji/settings/presets
   */
  async getSettingsPresets() {
    const { ctx } = this

    try {
      const presets = await ctx.service.dojiPatternService.getSettingsPresets()

      ctx.body = {
        success: true,
        data: presets,
      }
    } catch (error) {
      ctx.logger.error('获取设置预设失败:', error)
      ctx.throw(error.status || 500, error.message || '获取预设失败')
    }
  }

  /**
   * 获取性能统计
   * GET /api/v1/patterns/doji/settings/performance
   */
  async getPerformanceStats() {
    const { ctx } = this

    try {
      const userId = ctx.state.user?.id
      if (!userId) {
        ctx.throw(401, '用户未登录')
      }

      const stats = await ctx.service.dojiPatternService.getPerformanceStats(userId)

      ctx.body = {
        success: true,
        data: stats,
      }
    } catch (error) {
      ctx.logger.error('获取性能统计失败:', error)
      ctx.throw(error.status || 500, error.message || '获取统计失败')
    }
  }
}

module.exports = DojiPatternController
