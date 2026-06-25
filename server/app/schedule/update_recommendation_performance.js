'use strict'

const Subscription = require('egg').Subscription

/**
 * 定时回填 AI 推荐 actualReturn
 */
class UpdateRecommendationPerformanceTask extends Subscription {
  static get schedule() {
    return {
      interval: '30m',
      type: 'worker',
      disable: false,
    }
  }

  async subscribe() {
    const { ctx } = this
    ctx.logger.info('开始执行推荐绩效回填任务')

    try {
      const result = await ctx.service.recommendationPerformanceTracker.backfillRecommendationPerformance({
        limit: 200,
        staleMinutes: 25,
        includeExpired: true,
      })

      ctx.logger.info('推荐绩效回填完成:', result.data)
    } catch (error) {
      ctx.logger.error('推荐绩效回填任务失败:', error)
    }
  }
}

module.exports = UpdateRecommendationPerformanceTask
