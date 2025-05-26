'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller, middleware } = app;
  const auth = middleware.auth(app.config.jwt);

  // 首页
  router.get('/', controller.home.index);

  // 认证相关路由
  router.post('/api/auth/register', controller.user.register);
  router.post('/api/auth/login', controller.user.login);
  router.post('/api/auth/password-reset-request', controller.user.requestPasswordReset);
  router.get('/api/auth/validate-token', auth, controller.user.validateToken);

  // 用户相关路由（需要认证）
  router.get('/api/users/profile', auth, controller.user.getCurrentUser);
  router.put('/api/users/profile', auth, controller.user.updateProfile);
  router.put('/api/users/preferences', auth, controller.user.updatePreferences);
  router.put('/api/users/password', auth, controller.user.updatePassword);

  // 关注的股票相关路由（需要认证）
  router.get('/api/watchlists', auth, controller.watchlist.getUserWatchlists);
  router.post('/api/watchlists', auth, controller.watchlist.createWatchlist);
  router.put('/api/watchlists/:id', auth, controller.watchlist.updateWatchlist);
  router.delete('/api/watchlists/:id', auth, controller.watchlist.deleteWatchlist);
  router.get('/api/watchlists/:id/stocks', auth, controller.watchlist.getWatchlistItems);
  router.post('/api/watchlists/:id/stocks', auth, controller.watchlist.addStockToWatchlist);
  router.delete('/api/watchlists/:watchlistId/stocks/:itemId', auth, controller.watchlist.removeStockFromWatchlist);
  router.put('/api/watchlists/:watchlistId/stocks/:itemId/notes', auth, controller.watchlist.updateWatchlistItemNotes);

  // 仓位管理相关路由（需要认证）
  router.get('/api/portfolios', auth, controller.portfolio.getUserPortfolios);
  router.post('/api/portfolios', auth, controller.portfolio.createPortfolio);
  router.put('/api/portfolios/:id', auth, controller.portfolio.updatePortfolio);
  router.delete('/api/portfolios/:id', auth, controller.portfolio.deletePortfolio);
  router.get('/api/portfolios/:id/holdings', auth, controller.portfolio.getPortfolioHoldings);
  router.post('/api/portfolios/:id/holdings', auth, controller.portfolio.addHolding);
  router.put('/api/portfolios/:portfolioId/holdings/:holdingId', auth, controller.portfolio.updateHolding);
  router.delete('/api/portfolios/:portfolioId/holdings/:holdingId', auth, controller.portfolio.deleteHolding);
  router.post('/api/portfolios/:id/trades', auth, controller.portfolio.addTradeRecord);
  router.get('/api/portfolios/:id/trades', auth, controller.portfolio.getTradeRecords);
  router.delete('/api/portfolios/:portfolioId/trades/:tradeId', auth, controller.portfolio.deleteTradeRecord);

  // 模拟交易相关路由（需要认证）
  router.get('/api/simulation/accounts', auth, controller.simulation.getAccounts);
  router.post('/api/simulation/accounts', auth, controller.simulation.createAccount);
  router.get('/api/simulation/accounts/:id', auth, controller.simulation.getAccount);
  router.get('/api/simulation/accounts/:id/positions', auth, controller.simulation.getPositions);
  router.get('/api/simulation/accounts/:id/transactions', auth, controller.simulation.getTransactions);
  router.post('/api/simulation/accounts/:id/trade', auth, controller.simulation.executeTrade);

  // 股票行情相关路由
  router.get('/api/stocks', controller.stock.getStockList);
  router.get('/api/stocks/:code/quote', controller.stock.getQuote);
  router.get('/api/stocks/:code/history', controller.stock.getHistory);

  // 技术指标相关路由
  router.post('/api/technical-indicators/:stockCode', controller.technicalIndicators.calculateIndicators);
  router.get('/api/technical-indicators/:stockCode/realtime', controller.technicalIndicators.getRealTimeSignals);
  router.post('/api/technical-indicators/scan', controller.technicalIndicators.scanStockSignals);
  router.get('/api/technical-indicators/:stockCode/history', controller.technicalIndicators.getSignalHistory);

  // 测试相关路由
  router.get('/api/test/redis', controller.stock.testRedis);
  router.get('/api/test/store-stock', controller.stock.storeStockData);
  router.get('/api/test/store-all-stocks', controller.stock.storeAllStocks);

  // 环境信息路由
  router.get('/api/env/info', controller.env.info);

  // 新浪财经API代理路由
  router.get('/api/sina/test', controller.sina.test);
  router.get('/api/sina/quote', controller.sina.quote);
  router.get('/api/sina/stock-list', controller.sina.stockList);
  router.get('/api/sina/search', controller.sina.search);
  router.get('/api/sina/history', controller.sina.history);
  router.get('/api/sina/news', controller.sina.news);

  // 东方财富API代理路由
  router.get('/api/eastmoney/test', controller.eastmoney.test);
  router.get('/api/eastmoney/quote', controller.eastmoney.quote);
  router.get('/api/eastmoney/stock-list', controller.eastmoney.stockList);
  router.get('/api/eastmoney/search', controller.eastmoney.search);
  router.get('/api/eastmoney/history', controller.eastmoney.history);
  router.get('/api/eastmoney/news', controller.eastmoney.news);

  // 腾讯股票API代理路由
  router.get('/api/tencent/test', controller.tencent.test);
  router.get('/api/tencent/quote', controller.tencent.quote);
  router.get('/api/tencent/stock-list', controller.tencent.stockList);
  router.get('/api/tencent/search', controller.tencent.search);
  router.get('/api/tencent/history', controller.tencent.history);
  router.get('/api/tencent/news', controller.tencent.news);

  // 网易财经API代理路由
  router.get('/api/netease/test', controller.netease.test);
  router.get('/api/netease/quote', controller.netease.quote);
  router.get('/api/netease/stock-list', controller.netease.stockList);
  router.get('/api/netease/search', controller.netease.search);
  router.get('/api/netease/history', controller.netease.history);
  router.get('/api/netease/news', controller.netease.news);

  // AKShare API代理路由
  router.get('/api/akshare/test', controller.akshare.test);
  router.get('/api/akshare/quote', controller.akshare.quote);
  router.get('/api/akshare/stock-list', controller.akshare.stockList);
  router.get('/api/akshare/search', controller.akshare.search);
  router.get('/api/akshare/history', controller.akshare.history);
  router.get('/api/akshare/news', controller.akshare.news);

  // Tushare API路由
  router.get('/api/tushare/test', controller.tushare.test);
  router.get('/api/tushare/stock-basic', controller.tushare.getStockBasic);
  router.post('/api/tushare/update-stock-basic', controller.tushare.updateStockBasic);
  router.post('/api/tushare', controller.tushare.proxy);

  // 通用数据源API路由 - 新的RESTful API
  router.get('/api/data-source/test', controller.dataSource.test);
  router.get('/api/data-source/stocks', controller.dataSource.getStockList);

  // 提醒相关路由（需要认证）
  router.get('/api/alerts', auth, controller.alert.getAlerts);
  router.post('/api/alerts', auth, controller.alert.createAlert);
  router.patch('/api/alerts/:id', auth, controller.alert.updateAlert);
  router.delete('/api/alerts/:id', auth, controller.alert.deleteAlert);
  router.get('/api/alerts/:id/history', auth, controller.alert.getAlertHistory);
  router.patch('/api/alerts/history/:historyId', auth, controller.alert.markHistoryAsRead);

  // 关注列表提醒相关路由（需要认证）
  router.get('/api/watchlist-alerts', auth, controller.alert.getWatchlistAlerts);
  router.post('/api/watchlist-alerts', auth, controller.alert.addWatchlistAlert);
  router.delete('/api/watchlist-alerts/:watchlistId/:alertId', auth, controller.alert.removeWatchlistAlert);

  // 缓存相关路由（需要认证）
  router.get('/api/cache/status', auth, controller.cache.getStatus);
  router.post('/api/cache/refresh', auth, controller.cache.refreshCache);
  router.delete('/api/cache/:dataSource', auth, controller.cache.clearCache);
  router.delete('/api/cache/source/:dataSource', auth, controller.cache.clearDataSourceCache);
  router.get('/api/cache/refresh-limit', auth, controller.cache.checkRefreshLimit);

  // 缓存统计相关路由（需要认证）
  router.get('/api/cache-stats', auth, controller.cacheStats.getStats);
  router.post('/api/cache-stats/reset', auth, controller.cacheStats.resetStats);

  // 数据刷新相关路由（需要认证）
  router.post('/api/refresh-data', auth, controller.data.refreshData);
  router.get('/api/refresh-status', auth, controller.data.getRefreshStatus);

  // 会员相关路由
  router.get('/api/membership', auth, controller.membership.getUserMembership);
  router.get('/api/membership/levels', controller.membership.getMembershipLevels);
  router.get('/api/membership/check-access', auth, controller.membership.checkFeatureAccess);
  router.post('/api/membership/update', auth, controller.membership.updateMembership);

  // 逗币相关路由
  router.get('/api/coins', auth, controller.coins.getUserCoins);
  router.get('/api/coins/transactions', auth, controller.coins.getTransactions);
  router.post('/api/coins/exchange', auth, controller.coins.exchangeMembership);
  router.post('/api/coins/add', auth, controller.coins.addCoins); // 仅限管理员
  router.post('/api/coins/deduct', auth, controller.coins.deductCoins); // 仅限管理员

  // 逗币充值请求路由
  router.post('/api/coins/recharge', auth, controller.coinRecharge.createRechargeRequest);
  router.get('/api/coins/recharge', auth, controller.coinRecharge.getUserRechargeRequests);
  router.get('/api/coins/recharge/all', auth, controller.coinRecharge.getAllRechargeRequests); // 仅限管理员
  router.get('/api/coins/recharge/:requestId', auth, controller.coinRecharge.getRechargeRequestDetail);
  router.post('/api/coins/recharge/:requestId/process', auth, controller.coinRecharge.processRechargeRequest); // 仅限管理员
  router.post('/api/coins/recharge/:requestId/cancel', auth, controller.coinRecharge.cancelRechargeRequest);

  // 通知路由
  router.get('/api/notifications', auth, controller.notification.getUserNotifications);
  router.get('/api/notifications/unread-count', auth, controller.notification.getUnreadCount);
  router.post('/api/notifications/:notificationId/read', auth, controller.notification.markAsRead);
  router.post('/api/notifications/read-all', auth, controller.notification.markAllAsRead);
  router.delete('/api/notifications/:notificationId', auth, controller.notification.deleteNotification);

  // 管理员相关路由（需要管理员权限）
  router.get('/api/admin/users', auth, controller.admin.getAllUsers);
  router.get('/api/admin/users/:userId', auth, controller.admin.getUserDetail);
  router.put('/api/admin/users/:userId', auth, controller.admin.updateUser);
  router.patch('/api/admin/users/:userId/status', auth, controller.admin.updateUserStatus);
  router.get('/api/admin/stats', auth, controller.admin.getSystemStats);

  // 页面管理相关路由（需要管理员权限）
  router.get('/api/pages', auth, controller.page.getAllPages);
  router.get('/api/pages/:id', auth, controller.page.getPageById);
  router.post('/api/pages', auth, controller.page.createPage);
  router.put('/api/pages/:id', auth, controller.page.updatePage);
  router.delete('/api/pages/:id', auth, controller.page.deletePage);
  router.put('/api/pages/:id/permissions', auth, controller.page.updatePagePermissions);
  router.post('/api/pages/batch-status', auth, controller.page.batchUpdateStatus);
  router.post('/api/pages/init', auth, controller.page.initSystemPages);
  router.get('/api/user-menu', auth, controller.page.getUserMenu);
  router.get('/api/check-page-access', auth, controller.page.checkPageAccess);

  // 页面统计相关路由
  router.get('/api/page-stats/summary', auth, controller.pageStats.getPageAccessSummary);
  router.get('/api/page-stats/stats', auth, controller.pageStats.getPageAccessStats);
  router.get('/api/page-stats/logs', auth, controller.pageStats.getPageAccessLogs);
  router.post('/api/page-stats/log', controller.pageStats.logPageAccess);
  router.post('/api/page-stats/duration', controller.pageStats.updatePageDuration);

  // 页面组相关路由
  router.get('/api/page-groups', auth, controller.pageGroup.getAllPageGroups);
  router.get('/api/page-groups/:id', auth, controller.pageGroup.getPageGroupById);
  router.post('/api/page-groups', auth, controller.pageGroup.createPageGroup);
  router.put('/api/page-groups/:id', auth, controller.pageGroup.updatePageGroup);
  router.delete('/api/page-groups/:id', auth, controller.pageGroup.deletePageGroup);
  router.put('/api/page-groups/:id/permissions', auth, controller.pageGroup.setPageGroupPermissions);

  // 权限模板相关路由
  router.get('/api/permission-templates', auth, controller.permissionTemplate.getAllTemplates);
  router.get('/api/permission-templates/:id', auth, controller.permissionTemplate.getTemplateById);
  router.post('/api/permission-templates', auth, controller.permissionTemplate.createTemplate);
  router.put('/api/permission-templates/:id', auth, controller.permissionTemplate.updateTemplate);
  router.delete('/api/permission-templates/:id', auth, controller.permissionTemplate.deleteTemplate);
  router.post('/api/permission-templates/apply-to-page', auth, controller.permissionTemplate.applyTemplateToPage);
  router.post('/api/permission-templates/apply-to-group', auth, controller.permissionTemplate.applyTemplateToGroup);

  // 日志相关路由（需要认证）
  router.get('/api/logs/data-source', auth, controller.logs.getDataSourceLogs);
  router.get('/api/logs/data-source/recent', auth, controller.logs.getRecentDataSourceLogs);
  router.post('/api/logs/data-source', auth, controller.logs.addDataSourceLog);
  router.delete('/api/logs/data-source', auth, controller.logs.clearDataSourceLogs);

  // 缓存相关路由（需要认证）
  router.get('/api/cache/stats/:source', auth, controller.cache.getStats);
  router.get('/api/cache/details/:source', auth, controller.cache.getDetails);
  router.delete('/api/cache/source/:dataSource', auth, controller.cache.clearDataSourceCache);
  router.delete('/api/cache/key', auth, controller.cache.deleteKey);
  router.post('/api/cache/expire', auth, controller.cache.setExpire);
  router.post('/api/cache/clean/time', auth, controller.cache.cleanCacheByTime);
  router.post('/api/cache/clean/capacity', auth, controller.cache.cleanCacheByCapacity);
  router.post('/api/cache/clean/auto', auth, controller.cache.autoCleanCache);

  // 因子分析路由（需要认证）
  router.post('/api/factor/calculate', auth, controller.factor.calculateFactors);
  router.post('/api/factor/batch-calculate', auth, controller.factor.batchCalculateFactors);
  router.get('/api/factor/configs', auth, controller.factor.getFactorConfigs);
  router.get('/api/factor/correlation', auth, controller.factor.getFactorCorrelation);
  router.get('/api/factor/importance', auth, controller.factor.getFactorImportance);
  router.get('/api/factor/statistics', auth, controller.factor.getFactorStatistics);
  router.post('/api/factor/cache/clear', auth, controller.factor.clearFactorCache);
  router.get('/api/factor/cache/stats', auth, controller.factor.getFactorCacheStats);

  // 策略管理路由（需要认证）
  router.post('/api/strategy', auth, controller.strategy.createStrategy);
  router.get('/api/strategy', auth, controller.strategy.getStrategies);
  router.get('/api/strategy/templates', auth, controller.strategy.getStrategyTemplates);
  router.get('/api/strategy/:id', auth, controller.strategy.getStrategy);
  router.put('/api/strategy/:id', auth, controller.strategy.updateStrategy);
  router.delete('/api/strategy/:id', auth, controller.strategy.deleteStrategy);
  router.post('/api/strategy/:id/execute', auth, controller.strategy.executeStrategy);
  router.post('/api/strategy/:id/optimize', auth, controller.strategy.optimizeStrategy);
  router.post('/api/strategy/:id/toggle', auth, controller.strategy.toggleStrategy);
  router.post('/api/strategy/:id/clone', auth, controller.strategy.cloneStrategy);
  router.get('/api/strategy/:id/history', auth, controller.strategy.getExecutionHistory);
  router.get('/api/strategy/:id/performance', auth, controller.strategy.getPerformanceAnalysis);
  router.get('/api/strategy/:id/risk', auth, controller.strategy.getRiskAnalysis);
  router.post('/api/strategy/batch-execute', auth, controller.strategy.batchExecuteStrategies);
};
