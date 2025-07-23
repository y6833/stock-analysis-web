'use strict';

/**
 * 安全相关路由
 */
module.exports = app => {
  const { router, controller } = app;
  
  // CSRF令牌
  router.get('/api/v1/security/csrf-token', controller.security.generateCsrfToken);
  router.post('/api/v1/security/validate-csrf', controller.security.validateCsrfToken);
  
  // 安全配置
  router.get('/api/v1/security/config', controller.security.getSecurityConfig);
};