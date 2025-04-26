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
};
