'use strict';

const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');

// 自定义标量类型
const DateType = new GraphQLScalarType({
  name: 'Date',
  description: 'Date custom scalar type',
  serialize(value) {
    return value instanceof Date ? value.toISOString() : null;
  },
  parseValue(value) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

const JSONType = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value) {
    return value;
  },
  parseValue(value) {
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      try {
        return JSON.parse(ast.value);
      } catch (error) {
        return null;
      }
    }
    return null;
  },
});

// GraphQL Resolvers
const resolvers = {
  // 自定义标量类型
  Date: DateType,
  JSON: JSONType,

  // 查询解析器
  Query: {
    // 用户查询
    me: async (parent, args, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      return await ctx.service.user.getUserById(ctx.state.user.id);
    },

    // 股票查询
    stock: async (parent, { symbol }, context) => {
      const { ctx } = context;
      return await ctx.service.stock.getStockDetail(symbol);
    },

    stocks: async (parent, { symbols, search, industry, limit, offset }, context) => {
      const { ctx } = context;
      if (symbols && symbols.length > 0) {
        return await ctx.service.stock.getStocksBySymbols(symbols);
      }
      return await ctx.service.stock.searchStocks({ search, industry, limit, offset });
    },

    stockQuote: async (parent, { symbol }, context) => {
      const { ctx } = context;
      return await ctx.service.stock.getStockQuote(symbol);
    },

    stockQuotes: async (parent, { symbols }, context) => {
      const { ctx } = context;
      const quotes = await Promise.allSettled(
        symbols.map((symbol) => ctx.service.stock.getStockQuote(symbol))
      );
      return quotes.filter((result) => result.status === 'fulfilled').map((result) => result.value);
    },

    // 关注列表查询
    watchlists: async (parent, args, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      return await ctx.service.watchlist.getUserWatchlists(ctx.state.user.id);
    },

    watchlist: async (parent, { id }, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      return await ctx.service.watchlist.getWatchlist(id, ctx.state.user.id);
    },

    // 投资组合查询
    portfolios: async (parent, args, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      return await ctx.service.portfolio.getUserPortfolios(ctx.state.user.id);
    },

    portfolio: async (parent, { id }, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      return await ctx.service.portfolio.getPortfolio(id, ctx.state.user.id);
    },

    // 提醒查询
    alerts: async (parent, { isActive }, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      return await ctx.service.alert.getUserAlerts(ctx.state.user.id, { isActive });
    },

    alert: async (parent, { id }, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      return await ctx.service.alert.getAlert(id, ctx.state.user.id);
    },

    // 技术分析查询
    technicalIndicators: async (parent, { symbol, indicators, period }, context) => {
      const { ctx } = context;
      return await ctx.service.technicalIndicators.calculateIndicators(symbol, {
        indicators,
        period,
      });
    },

    // 市场数据查询
    hotStocks: async (parent, { limit }, context) => {
      const { ctx } = context;
      return await ctx.service.stock.getHotStocks(limit);
    },

    limitUpStocks: async (parent, args, context) => {
      const { ctx } = context;
      return await ctx.service.stock.getLimitUpStocks();
    },

    limitDownStocks: async (parent, args, context) => {
      const { ctx } = context;
      return await ctx.service.stock.getLimitDownStocks();
    },
  },

  // 变更解析器
  Mutation: {
    // 用户变更
    updateProfile: async (parent, { input }, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      return await ctx.service.user.updateProfile(ctx.state.user.id, input);
    },

    updatePreferences: async (parent, { input }, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      return await ctx.service.user.updatePreferences(ctx.state.user.id, input);
    },

    // 关注列表变更
    createWatchlist: async (parent, { input }, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      return await ctx.service.watchlist.createWatchlist(ctx.state.user.id, input);
    },

    updateWatchlist: async (parent, { id, input }, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      return await ctx.service.watchlist.updateWatchlist(id, input, ctx.state.user.id);
    },

    deleteWatchlist: async (parent, { id }, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      await ctx.service.watchlist.deleteWatchlist(id, ctx.state.user.id);
      return true;
    },

    addStockToWatchlist: async (parent, { watchlistId, symbol, notes }, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      return await ctx.service.watchlist.addStockToWatchlist(
        watchlistId,
        {
          symbol,
          notes,
        },
        ctx.state.user.id
      );
    },

    removeStockFromWatchlist: async (parent, { watchlistId, itemId }, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      await ctx.service.watchlist.removeStockFromWatchlist(watchlistId, itemId, ctx.state.user.id);
      return true;
    },

    // 投资组合变更
    createPortfolio: async (parent, { input }, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      return await ctx.service.portfolio.createPortfolio(ctx.state.user.id, input);
    },

    updatePortfolio: async (parent, { id, input }, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      return await ctx.service.portfolio.updatePortfolio(id, input, ctx.state.user.id);
    },

    deletePortfolio: async (parent, { id }, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      await ctx.service.portfolio.deletePortfolio(id, ctx.state.user.id);
      return true;
    },

    addTrade: async (parent, { portfolioId, input }, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      return await ctx.service.portfolio.addTradeRecord(portfolioId, input, ctx.state.user.id);
    },

    // 提醒变更
    createAlert: async (parent, { input }, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      return await ctx.service.alert.createAlert(ctx.state.user.id, input);
    },

    updateAlert: async (parent, { id, input }, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      return await ctx.service.alert.updateAlert(id, input, ctx.state.user.id);
    },

    deleteAlert: async (parent, { id }, context) => {
      const { ctx } = context;
      if (!ctx.state.user) {
        throw new Error('未认证用户');
      }
      await ctx.service.alert.deleteAlert(id, ctx.state.user.id);
      return true;
    },
  },

  // 嵌套字段解析器
  Stock: {
    quote: async (parent, args, context) => {
      const { ctx } = context;
      try {
        return await ctx.service.stock.getStockQuote(parent.symbol);
      } catch (error) {
        return null;
      }
    },

    history: async (parent, { startDate, endDate, period }, context) => {
      const { ctx } = context;
      return await ctx.service.stock.getHistory(parent.symbol, {
        startDate,
        endDate,
        period,
      });
    },

    indicators: async (parent, { indicators, period }, context) => {
      const { ctx } = context;
      return await ctx.service.technicalIndicators.calculateIndicators(parent.symbol, {
        indicators,
        period,
      });
    },
  },

  Watchlist: {
    items: async (parent, args, context) => {
      const { ctx } = context;
      return await ctx.service.watchlist.getWatchlistItems(parent.id);
    },

    itemCount: async (parent, args, context) => {
      const { ctx } = context;
      const items = await ctx.service.watchlist.getWatchlistItems(parent.id);
      return items.length;
    },
  },

  WatchlistItem: {
    stock: async (parent, args, context) => {
      const { ctx } = context;
      return await ctx.service.stock.getStockDetail(parent.symbol);
    },

    alerts: async (parent, args, context) => {
      const { ctx } = context;
      return await ctx.service.alert.getWatchlistItemAlerts(parent.id);
    },
  },

  Portfolio: {
    holdings: async (parent, args, context) => {
      const { ctx } = context;
      return await ctx.service.portfolio.getPortfolioHoldings(parent.id);
    },

    trades: async (parent, args, context) => {
      const { ctx } = context;
      return await ctx.service.portfolio.getTradeRecords(parent.id);
    },

    performance: async (parent, args, context) => {
      const { ctx } = context;
      return await ctx.service.portfolio.getPortfolioPerformance(parent.id);
    },
  },

  Holding: {
    stock: async (parent, args, context) => {
      const { ctx } = context;
      return await ctx.service.stock.getStockDetail(parent.symbol);
    },
  },

  Trade: {
    stock: async (parent, args, context) => {
      const { ctx } = context;
      return await ctx.service.stock.getStockDetail(parent.symbol);
    },
  },

  Alert: {
    stock: async (parent, args, context) => {
      const { ctx } = context;
      return await ctx.service.stock.getStockDetail(parent.symbol);
    },

    history: async (parent, args, context) => {
      const { ctx } = context;
      return await ctx.service.alert.getAlertHistory(parent.id);
    },
  },
};

module.exports = resolvers;
