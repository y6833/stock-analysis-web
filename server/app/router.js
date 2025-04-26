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

  // 关注的股票相关路由（需要认证）
  router.get('/api/watchlists', jwt, controller.watchlist.getUserWatchlists);
  router.post('/api/watchlists', jwt, controller.watchlist.createWatchlist);
  router.put('/api/watchlists/:id', jwt, controller.watchlist.updateWatchlist);
  router.delete('/api/watchlists/:id', jwt, controller.watchlist.deleteWatchlist);
  router.get('/api/watchlists/:id/stocks', jwt, controller.watchlist.getWatchlistItems);
  router.post('/api/watchlists/:id/stocks', jwt, controller.watchlist.addStockToWatchlist);
  router.delete('/api/watchlists/:watchlistId/stocks/:itemId', jwt, controller.watchlist.removeStockFromWatchlist);
  router.put('/api/watchlists/:watchlistId/stocks/:itemId/notes', jwt, controller.watchlist.updateWatchlistItemNotes);

  // 仓位管理相关路由（需要认证）
  router.get('/api/portfolios', jwt, controller.portfolio.getUserPortfolios);
  router.post('/api/portfolios', jwt, controller.portfolio.createPortfolio);
  router.put('/api/portfolios/:id', jwt, controller.portfolio.updatePortfolio);
  router.delete('/api/portfolios/:id', jwt, controller.portfolio.deletePortfolio);
  router.get('/api/portfolios/:id/holdings', jwt, controller.portfolio.getPortfolioHoldings);
  router.post('/api/portfolios/:id/holdings', jwt, controller.portfolio.addHolding);
  router.put('/api/portfolios/:portfolioId/holdings/:holdingId', jwt, controller.portfolio.updateHolding);
  router.delete('/api/portfolios/:portfolioId/holdings/:holdingId', jwt, controller.portfolio.deleteHolding);
  router.post('/api/portfolios/:id/trades', jwt, controller.portfolio.addTradeRecord);
  router.get('/api/portfolios/:id/trades', jwt, controller.portfolio.getTradeRecords);
  router.delete('/api/portfolios/:portfolioId/trades/:tradeId', jwt, controller.portfolio.deleteTradeRecord);

  // 模拟交易相关路由（需要认证）
  router.get('/api/simulation/accounts', jwt, controller.simulation.getAccounts);
  router.post('/api/simulation/accounts', jwt, controller.simulation.createAccount);
  router.get('/api/simulation/accounts/:id', jwt, controller.simulation.getAccount);
  router.get('/api/simulation/accounts/:id/positions', jwt, controller.simulation.getPositions);
  router.get('/api/simulation/accounts/:id/transactions', jwt, controller.simulation.getTransactions);
  router.post('/api/simulation/accounts/:id/trade', jwt, controller.simulation.executeTrade);

  // 股票行情相关路由
  router.get('/api/stocks', controller.stock.getStockList);
  router.get('/api/stocks/:code/quote', controller.stock.getQuote);
  router.get('/api/stocks/:code/history', controller.stock.getHistory);

  // 测试相关路由
  router.get('/api/test/redis', controller.stock.testRedis);
  router.get('/api/test/store-stock', controller.stock.storeStockData);
  router.get('/api/test/store-all-stocks', controller.stock.storeAllStocks);

  // 环境信息路由
  router.get('/api/env/info', controller.env.info);
};
