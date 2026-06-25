'use strict'

const { app, assert } = require('egg-mock/bootstrap')

describe('recommendationPerformanceTracker service', () => {
  afterEach(() => {
    app.mockRestore()
  })

  it('evaluateRecommendationStatus 应在到期后标记 expired', () => {
    const ctx = app.mockContext()
    const service = ctx.service.recommendationPerformanceTracker

    const rec = {
      status: 'active',
      recommendationType: 'buy',
      targetPrice: 20,
      expiresAt: new Date(Date.now() - 1000),
    }

    assert.strictEqual(service.evaluateRecommendationStatus(rec, 15), 'expired')
  })

  it('evaluateRecommendationStatus 应在买入达标时标记 achieved', () => {
    const ctx = app.mockContext()
    const service = ctx.service.recommendationPerformanceTracker

    const rec = {
      status: 'active',
      recommendationType: 'buy',
      targetPrice: 10,
      expiresAt: new Date(Date.now() + 86400000),
    }

    assert.strictEqual(service.evaluateRecommendationStatus(rec, 10.5), 'achieved')
  })

  it('evaluateRecommendationStatus 卖出达标应标记 achieved', () => {
    const ctx = app.mockContext()
    const service = ctx.service.recommendationPerformanceTracker

    const rec = {
      status: 'active',
      recommendationType: 'sell',
      targetPrice: 8,
      expiresAt: new Date(Date.now() + 86400000),
    }

    assert.strictEqual(service.evaluateRecommendationStatus(rec, 7.5), 'achieved')
  })
})
