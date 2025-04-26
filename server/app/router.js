'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller, middleware } = app;
  const jwt = middleware.jwt(app.config.jwt);

  // 首页
  router.get('/', controller.home.index);

  // 认证相关路由
  router.post('/api/auth/register', controller.user.register);
  router.post('/api/auth/login', controller.user.login);
  router.post('/api/auth/password-reset-request', controller.user.requestPasswordReset);
  router.get('/api/auth/validate-token', jwt, controller.user.validateToken);

  // 用户相关路由（需要认证）
  router.get('/api/users/profile', jwt, controller.user.getCurrentUser);
  router.put('/api/users/profile', jwt, controller.user.updateProfile);
  router.put('/api/users/preferences', jwt, controller.user.updatePreferences);
  router.put('/api/users/password', jwt, controller.user.updatePassword);
};
