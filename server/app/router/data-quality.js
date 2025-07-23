'use strict'

/**
 * 数据质量相关路由
 * @param {Egg.Application} app - egg application
 */
module.exports = (app) => {
  const { router, controller, middleware } = app
  const auth = middleware.auth(app.config.jwt)

  // 数据质量管理API路由
  router.post('/api/v1/data-quality/validate', auth, controller.dataQualityManagement.validateData)
  router.post(
    '/api/v1/data-quality/validate-batch',
    auth,
    controller.dataQualityManagement.validateBatchData
  )
  router.post(
    '/api/v1/data-quality/transform',
    auth,
    controller.dataQualityManagement.transformData
  )
  router.post(
    '/api/v1/data-quality/transform-batch',
    auth,
    controller.dataQualityManagement.transformBatchData
  )
  router.post('/api/v1/data-quality/process', auth, controller.dataQualityManagement.processData)
  router.post(
    '/api/v1/data-quality/process-batch',
    auth,
    controller.dataQualityManagement.processBatchData
  )
  router.get('/api/v1/data-quality/stats', auth, controller.dataQualityManagement.getStats)
  router.post('/api/v1/data-quality/reset-stats', auth, controller.dataQualityManagement.resetStats)
  router.get(
    '/api/v1/data-quality/schemas',
    auth,
    controller.dataQualityManagement.getValidationSchemas
  )
}
