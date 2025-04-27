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
};
