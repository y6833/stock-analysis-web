'use strict';

/**
 * 数据库相关路由
 */
module.exports = (app) => {
  const { router, controller, middleware } = app;
  const { database_health: dbHealthController } = controller;

  // 获取认证中间件
  const auth = middleware.auth();
  const adminAuth = middleware.adminAuth();

  // 数据库健康相关路由
  router.get('/api/v1/database/health', dbHealthController.getHealth);
  router.get('/api/v1/database/connection-pool', auth, dbHealthController.getConnectionPoolStats);
  router.get('/api/v1/database/slow-queries', adminAuth, dbHealthController.getSlowQueries);
  router.get('/api/v1/database/tables', auth, dbHealthController.getAllTables);
  router.get('/api/v1/database/table-stats', auth, dbHealthController.getTableStats);

  // 数据库维护相关路由（仅管理员可访问）
  router.post('/api/v1/database/maintain-table', adminAuth, dbHealthController.maintainTable);
  router.post('/api/v1/database/maintain-database', adminAuth, dbHealthController.maintainDatabase);
  router.post('/api/v1/database/clear-model-cache', adminAuth, dbHealthController.clearModelCache);
};
