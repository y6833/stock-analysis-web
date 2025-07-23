'use strict';

const { gql } = require('apollo-server-express');

// GraphQL Schema 定义
const typeDefs = gql`
  # 基础类型定义
  scalar Date
  scalar JSON

  # 用户类型
  type User {
    id: ID!
    username: String!
    email: String!
    createdAt: Date!
    updatedAt: Date!
    membership: Membership
    preferences: UserPreferences
  }

  type UserPreferences {
    theme: String
    defaultChartType: String
    defaultTimeframe: String
    notifications: Boolean
  }

  type Membership {
    level: String!
    startDate: Date!
    endDate: Date
    isActive: Boolean!
  }

  # 股票类型
  type Stock {
    symbol: String!
    name: String!
    exchange: String!
    industry: String
    description: String
    lastUpdated: Date
    quote: StockQuote
    history(startDate: Date, endDate: Date, period: String = "1d"): [StockPrice!]!
    indicators(indicators: [String!]!, period: String = "1d"): JSON
  }

  type StockQuote {
    symbol: String!
    price: Float!
    change: Float!
    changePercent: Float!
    volume: Int!
    high: Float!
    low: Float!
    open: Float!
    previousClose: Float!
    timestamp: Date!
    dataSource: String!
  }

  type StockPrice {
    date: Date!
    open: Float!
    high: Float!
    low: Float!
    close: Float!
    volume: Int!
    adjustedClose: Float
  }

  # 关注列表类型
  type Watchlist {
    id: ID!
    name: String!
    description: String
    createdAt: Date!
    updatedAt: Date!
    items: [WatchlistItem!]!
    itemCount: Int!
  }

  type WatchlistItem {
    id: ID!
    symbol: String!
    addedAt: Date!
    notes: String
    stock: Stock!
    alerts: [Alert!]!
  }

  # 投资组合类型
  type Portfolio {
    id: ID!
    name: String!
    description: String
    createdAt: Date!
    updatedAt: Date!
    holdings: [Holding!]!
    trades: [Trade!]!
    performance: PortfolioPerformance!
  }

  type Holding {
    id: ID!
    symbol: String!
    quantity: Float!
    averagePrice: Float!
    currentPrice: Float
    marketValue: Float
    unrealizedPnL: Float
    unrealizedPnLPercent: Float
    stock: Stock!
  }

  type Trade {
    id: ID!
    symbol: String!
    type: TradeType!
    quantity: Float!
    price: Float!
    date: Date!
    fees: Float
    notes: String
    stock: Stock!
  }

  type PortfolioPerformance {
    totalValue: Float!
    totalCost: Float!
    totalPnL: Float!
    totalPnLPercent: Float!
    dayChange: Float!
    dayChangePercent: Float!
  }

  enum TradeType {
    BUY
    SELL
  }

  # 提醒类型
  type Alert {
    id: ID!
    type: AlertType!
    symbol: String!
    condition: AlertCondition!
    value: Float!
    isActive: Boolean!
    createdAt: Date!
    triggeredAt: Date
    stock: Stock!
    history: [AlertHistory!]!
  }

  type AlertHistory {
    id: ID!
    triggeredAt: Date!
    value: Float!
    isRead: Boolean!
  }

  enum AlertType {
    PRICE
    VOLUME
    PERCENT_CHANGE
    TECHNICAL_INDICATOR
  }

  enum AlertCondition {
    ABOVE
    BELOW
    EQUALS
    CROSSES_ABOVE
    CROSSES_BELOW
  }

  # 技术分析类型
  type TechnicalIndicator {
    name: String!
    values: JSON!
    signals: [TechnicalSignal!]!
  }

  type TechnicalSignal {
    type: String!
    strength: Float!
    description: String!
    timestamp: Date!
  }

  # 查询类型
  type Query {
    # 用户查询
    me: User

    # 股票查询
    stock(symbol: String!): Stock
    stocks(
      symbols: [String!]
      search: String
      industry: String
      limit: Int = 20
      offset: Int = 0
    ): [Stock!]!

    stockQuote(symbol: String!): StockQuote
    stockQuotes(symbols: [String!]!): [StockQuote!]!

    # 关注列表查询
    watchlists: [Watchlist!]!
    watchlist(id: ID!): Watchlist

    # 投资组合查询
    portfolios: [Portfolio!]!
    portfolio(id: ID!): Portfolio

    # 提醒查询
    alerts(isActive: Boolean): [Alert!]!
    alert(id: ID!): Alert

    # 技术分析查询
    technicalIndicators(
      symbol: String!
      indicators: [String!]!
      period: String = "1d"
    ): [TechnicalIndicator!]!

    # 市场数据查询
    hotStocks(limit: Int = 10): [Stock!]!
    limitUpStocks: [Stock!]!
    limitDownStocks: [Stock!]!
  }

  # 变更类型
  type Mutation {
    # 用户变更
    updateProfile(input: UpdateProfileInput!): User!
    updatePreferences(input: UpdatePreferencesInput!): User!

    # 关注列表变更
    createWatchlist(input: CreateWatchlistInput!): Watchlist!
    updateWatchlist(id: ID!, input: UpdateWatchlistInput!): Watchlist!
    deleteWatchlist(id: ID!): Boolean!

    addStockToWatchlist(watchlistId: ID!, symbol: String!, notes: String): WatchlistItem!
    removeStockFromWatchlist(watchlistId: ID!, itemId: ID!): Boolean!
    updateWatchlistItem(watchlistId: ID!, itemId: ID!, notes: String): WatchlistItem!

    # 投资组合变更
    createPortfolio(input: CreatePortfolioInput!): Portfolio!
    updatePortfolio(id: ID!, input: UpdatePortfolioInput!): Portfolio!
    deletePortfolio(id: ID!): Boolean!

    addTrade(portfolioId: ID!, input: AddTradeInput!): Trade!
    updateTrade(portfolioId: ID!, tradeId: ID!, input: UpdateTradeInput!): Trade!
    deleteTrade(portfolioId: ID!, tradeId: ID!): Boolean!

    # 提醒变更
    createAlert(input: CreateAlertInput!): Alert!
    updateAlert(id: ID!, input: UpdateAlertInput!): Alert!
    deleteAlert(id: ID!): Boolean!
    markAlertHistoryAsRead(historyId: ID!): Boolean!
  }

  # 输入类型
  input UpdateProfileInput {
    username: String
    email: String
  }

  input UpdatePreferencesInput {
    theme: String
    defaultChartType: String
    defaultTimeframe: String
    notifications: Boolean
  }

  input CreateWatchlistInput {
    name: String!
    description: String
  }

  input UpdateWatchlistInput {
    name: String
    description: String
  }

  input CreatePortfolioInput {
    name: String!
    description: String
  }

  input UpdatePortfolioInput {
    name: String
    description: String
  }

  input AddTradeInput {
    symbol: String!
    type: TradeType!
    quantity: Float!
    price: Float!
    date: Date!
    fees: Float
    notes: String
  }

  input UpdateTradeInput {
    quantity: Float
    price: Float
    date: Date
    fees: Float
    notes: String
  }

  input CreateAlertInput {
    type: AlertType!
    symbol: String!
    condition: AlertCondition!
    value: Float!
  }

  input UpdateAlertInput {
    condition: AlertCondition
    value: Float
    isActive: Boolean
  }
`;

module.exports = typeDefs;
