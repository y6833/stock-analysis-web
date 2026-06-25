'use strict'

const Controller = require('egg').Controller

/**
 * 用户 AI 偏好控制器
 */
class AiPreferencesController extends Controller {
  async get() {
    const { ctx, app } = this
    const userId = ctx.user?.id
    if (!userId) {
      ctx.status = 401
      ctx.body = { success: false, message: '请先登录' }
      return
    }

    try {
      const preferences = await app.model.UserAiPreferences.getOrCreate(userId)
      ctx.body = { success: true, data: preferences }
    } catch (error) {
      ctx.logger.error('获取 AI 偏好失败:', error)
      ctx.status = 500
      ctx.body = { success: false, message: error.message }
    }
  }

  async update() {
    const { ctx, app } = this
    const userId = ctx.user?.id
    if (!userId) {
      ctx.status = 401
      ctx.body = { success: false, message: '请先登录' }
      return
    }

    try {
      const allowed = [
        'riskTolerance',
        'investmentHorizon',
        'sectorPreferences',
        'analysisDepth',
        'aiWeight',
        'focusAreas',
        'excludePatterns',
        'notificationSettings',
        'customCriteria',
        'learningEnabled',
      ]
      const updates = {}
      allowed.forEach((key) => {
        if (ctx.request.body[key] !== undefined) updates[key] = ctx.request.body[key]
      })

      const preferences = await app.model.UserAiPreferences.updatePreferences(userId, updates)
      ctx.body = { success: true, data: preferences, message: '偏好已保存' }
    } catch (error) {
      ctx.logger.error('更新 AI 偏好失败:', error)
      ctx.status = 500
      ctx.body = { success: false, message: error.message }
    }
  }

  async insights() {
    const { ctx, app } = this
    const userId = ctx.user?.id
    if (!userId) {
      ctx.status = 401
      ctx.body = { success: false, message: '请先登录' }
      return
    }

    try {
      const insights = await app.model.UserAiPreferences.getPersonalizationInsights(userId)
      ctx.body = { success: true, data: insights }
    } catch (error) {
      ctx.status = 500
      ctx.body = { success: false, message: error.message }
    }
  }
}

module.exports = AiPreferencesController
