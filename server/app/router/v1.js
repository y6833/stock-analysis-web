'use strict'

/**
 * API v1 路由配置
 * 重构后的RESTful API端点，确保一致性
 * @param {Egg.Application} app - egg application
 */
module.exports = (app) => {
  const { router, controller, middleware } = app
  const auth = middleware.auth(app.config.jwt)

  // ==================== 认证相关 ====================
  router.post('/api/v1/auth/register', controller.auth.register)
  router.post('/api/v1/auth/login', controller.auth.login)
  router.post('/api/v1/auth/logout', auth, controller.auth.logout)
  router.post('/api/v1/auth/refresh', auth, controller.auth.refreshToken)
  router.post('/api/v1/auth/password-reset', controller.auth.requestPasswordReset)
  router.get('/api/v1/auth/validate', auth, controller.auth.validateToken)

  // ==================== 用户管理 ====================
  router.get('/api/v1/users/profile', auth, controller.user.getCurrentUser)
  router.put('/api/v1/users/profile', auth, controller.user.updateProfile)
  router.put('/api/v1/users/preferences', auth, controller.user.updatePreferences)
  router.put('/api/v1/users/password', auth, controller.user.updatePassword)

  // ==================== 股票数据 ====================
  router.get('/api/v1/stocks', controller.stock.getStockList)
  router.get('/api/v1/stocks/search', controller.stock.searchStocks)
  router.get('/api/v1/stocks/:symbol', controller.stock.getStockDetail)
  router.get('/api/v1/stocks/:symbol/quote', controller.stock.getQuote)
  router.get('/api/v1/stocks/:symbol/history', controller.stock.getHistory)
  router.get(
    '/api/v1/stocks/:symbol/indicators',
    controller.technicalIndicators.calculateIndicators
  )
  router.post('/api/v1/stocks/quotes/batch', controller.stock.getBatchQuotes)

  // 行业数据
  router.get('/api/v1/industries', controller.stock.getIndustryList)
  router.get('/api/v1/industries/:code', controller.stock.getIndustryData)
  router.get('/api/v1/markets/hot-stocks', controller.stock.getHotStocks)
  router.get('/api/v1/markets/limit-up', controller.stock.getLimitUpStocks)
  router.get('/api/v1/markets/limit-down', controller.stock.getLimitDownStocks)

  // ==================== 关注列表 ====================
  router.get('/api/v1/watchlists', auth, controller.watchlist.getUserWatchlists)
  router.post('/api/v1/watchlists', auth, controller.watchlist.createWatchlist)
  router.get('/api/v1/watchlists/:id', auth, controller.watchlist.getWatchlist)
  router.put('/api/v1/watchlists/:id', auth, controller.watchlist.updateWatchlist)
  router.delete('/api/v1/watchlists/:id', auth, controller.watchlist.deleteWatchlist)

  // 关注列表项目
  router.get('/api/v1/watchlists/:id/items', auth, controller.watchlist.getWatchlistItems)
  router.post('/api/v1/watchlists/:id/items', auth, controller.watchlist.addStockToWatchlist)
  router.put(
    '/api/v1/watchlists/:watchlistId/items/:itemId',
    auth,
    controller.watchlist.updateWatchlistItem
  )
  router.delete(
    '/api/v1/watchlists/:watchlistId/items/:itemId',
    auth,
    controller.watchlist.removeStockFromWatchlist
  )

  // ==================== 投资组合 ====================
  router.get('/api/v1/portfolios', auth, controller.portfolio.getUserPortfolios)
  router.post('/api/v1/portfolios', auth, controller.portfolio.createPortfolio)
  router.get('/api/v1/portfolios/:id', auth, controller.portfolio.getPortfolio)
  router.put('/api/v1/portfolios/:id', auth, controller.portfolio.updatePortfolio)
  router.delete('/api/v1/portfolios/:id', auth, controller.portfolio.deletePortfolio)

  // 持仓管理
  router.get('/api/v1/portfolios/:id/holdings', auth, controller.portfolio.getPortfolioHoldings)
  router.post('/api/v1/portfolios/:id/holdings', auth, controller.portfolio.addHolding)
  router.put(
    '/api/v1/portfolios/:portfolioId/holdings/:holdingId',
    auth,
    controller.portfolio.updateHolding
  )
  router.delete(
    '/api/v1/portfolios/:portfolioId/holdings/:holdingId',
    auth,
    controller.portfolio.deleteHolding
  )

  // 交易记录
  router.get('/api/v1/portfolios/:id/trades', auth, controller.portfolio.getTradeRecords)
  router.post('/api/v1/portfolios/:id/trades', auth, controller.portfolio.addTradeRecord)
  router.put(
    '/api/v1/portfolios/:portfolioId/trades/:tradeId',
    auth,
    controller.portfolio.updateTradeRecord
  )
  router.delete(
    '/api/v1/portfolios/:portfolioId/trades/:tradeId',
    auth,
    controller.portfolio.deleteTradeRecord
  )

  // ==================== 提醒系统 ====================
  router.get('/api/v1/alerts', auth, controller.alert.getAlerts)
  router.post('/api/v1/alerts', auth, controller.alert.createAlert)
  router.get('/api/v1/alerts/:id', auth, controller.alert.getAlert)
  router.put('/api/v1/alerts/:id', auth, controller.alert.updateAlert)
  router.delete('/api/v1/alerts/:id', auth, controller.alert.deleteAlert)
  router.get('/api/v1/alerts/:id/history', auth, controller.alert.getAlertHistory)

  // ==================== 技术分析 ====================
  router.get(
    '/api/v1/analysis/indicators/:symbol',
    controller.technicalIndicators.calculateIndicators
  )
  router.get('/api/v1/analysis/signals/:symbol', controller.technicalIndicators.getRealTimeSignals)
  router.post('/api/v1/analysis/scan', controller.technicalIndicators.scanStockSignals)
  router.get('/api/v1/analysis/patterns/doji', controller.dojiPattern.getRecentPatterns)
  router.post('/api/v1/analysis/patterns/doji/screen', controller.dojiPattern.screenUpwardStocks)

  // ==================== 策略与回测 ====================
  router.get('/api/v1/strategies', auth, controller.strategy.getStrategies)
  router.post('/api/v1/strategies', auth, controller.strategy.createStrategy)
  router.get('/api/v1/strategies/:id', auth, controller.strategy.getStrategy)
  router.put('/api/v1/strategies/:id', auth, controller.strategy.updateStrategy)
  router.delete('/api/v1/strategies/:id', auth, controller.strategy.deleteStrategy)
  router.post('/api/v1/strategies/:id/execute', auth, controller.strategy.executeStrategy)

  router.get('/api/v1/backtests', auth, controller.backtest.getBacktestHistory)
  router.post('/api/v1/backtests', auth, controller.backtest.runBacktest)
  router.get('/api/v1/backtests/:id', auth, controller.backtest.getBacktestDetail)
  router.delete('/api/v1/backtests/:id', auth, controller.backtest.deleteBacktest)

  // ==================== 风险管理 ====================
  router.get('/api/v1/risk/configs', auth, controller.riskMonitoring.getConfigs)
  router.post('/api/v1/risk/configs', auth, controller.riskMonitoring.createConfig)
  router.put('/api/v1/risk/configs/:id', auth, controller.riskMonitoring.updateConfig)
  router.delete('/api/v1/risk/configs/:id', auth, controller.riskMonitoring.deleteConfig)

  router.get('/api/v1/risk/alerts', auth, controller.riskAlert.getRules)
  router.post('/api/v1/risk/alerts', auth, controller.riskAlert.createRule)
  router.put('/api/v1/risk/alerts/:id', auth, controller.riskAlert.updateRule)
  router.delete('/api/v1/risk/alerts/:id', auth, controller.riskAlert.deleteRule)

  router.get('/api/v1/risk/var', auth, controller.riskMonitoring.getVarHistory)
  router.post('/api/v1/risk/var/calculate', auth, controller.riskMonitoring.calculateVaR)

  // ==================== 模拟交易 ====================
  router.get('/api/v1/simulation/accounts', auth, controller.simulation.getAccounts)
  router.post('/api/v1/simulation/accounts', auth, controller.simulation.createAccount)
  router.get('/api/v1/simulation/accounts/:id', auth, controller.simulation.getAccount)
  router.get('/api/v1/simulation/accounts/:id/positions', auth, controller.simulation.getPositions)
  router.get(
    '/api/v1/simulation/accounts/:id/transactions',
    auth,
    controller.simulation.getTransactions
  )
  router.post('/api/v1/simulation/accounts/:id/trades', auth, controller.simulation.executeTrade)

  // ==================== 会员与权限 ====================
  router.get('/api/v1/membership', auth, controller.membership.getUserMembership)
  router.get('/api/v1/membership/levels', controller.membership.getMembershipLevels)
  router.post('/api/v1/membership/check-access', auth, controller.membership.checkFeatureAccess)

  // ==================== 通知系统 ====================
  router.get('/api/v1/notifications', auth, controller.notification.getUserNotifications)
  router.get('/api/v1/notifications/unread-count', auth, controller.notification.getUnreadCount)
  router.put('/api/v1/notifications/:id/read', auth, controller.notification.markAsRead)
  router.put('/api/v1/notifications/read-all', auth, controller.notification.markAllAsRead)
  router.delete('/api/v1/notifications/:id', auth, controller.notification.deleteNotification)

  // ==================== 系统管理 ====================
  router.get('/api/v1/system/health', controller.health.detailed)
  router.get('/api/v1/system/cache/stats', auth, controller.cache.status)
  router.post('/api/v1/system/cache/refresh', auth, controller.cache.prewarm)
  router.delete('/api/v1/system/cache/:key', auth, controller.cache.clear)

  // ==================== API文档 ====================
  router.get('/api/v1/docs', controller.apiDocs.getDocs)
  router.get('/api/v1/docs/graphql', controller.apiDocs.getGraphQLSchema)
  router.get('/api/v1/docs/migration', controller.apiDocs.getMigrationGuide)
  router.get('/api/v1/version', controller.apiDocs.getVersionInfo)

  // ==================== GraphQL ====================
  router.post('/api/v1/graphql', controller.graphql.query)
  router.get('/api/v1/graphql/playground', controller.graphql.playground)
  router.get('/api/v1/graphql/schema', controller.graphql.schema)
  router.get('/api/v1/graphql/health', controller.graphql.health)

  return router
}
