'use strict';

const Controller = require('egg').Controller;

class PortfolioController extends Controller {
  // 获取用户的所有投资组合
  async getUserPortfolios() {
    const { ctx, service } = this;
    const userId = ctx.user ? ctx.user.id : 1; // 如果没有用户信息，使用默认用户ID

    try {
      const portfolios = await service.portfolio.getUserPortfolios(userId);
      ctx.body = portfolios;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '获取投资组合失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 创建投资组合
  async createPortfolio() {
    const { ctx, service } = this;
    const userId = ctx.user ? ctx.user.id : 1; // 如果没有用户信息，使用默认用户ID
    const data = ctx.request.body;

    // 手动验证
    if (!data.name) {
      ctx.status = 400;
      ctx.body = { message: '组合名称不能为空' };
      return;
    }

    try {
      const portfolio = await service.portfolio.createPortfolio(userId, data);
      ctx.status = 201;
      ctx.body = portfolio;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '创建投资组合失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 更新投资组合
  async updatePortfolio() {
    const { ctx, service } = this;
    const userId = ctx.user ? ctx.user.id : 1; // 如果没有用户信息，使用默认用户ID
    const portfolioId = parseInt(ctx.params.id);
    const data = ctx.request.body;

    // 手动验证
    if (!data.name) {
      ctx.status = 400;
      ctx.body = { message: '组合名称不能为空' };
      return;
    }

    try {
      const portfolio = await service.portfolio.updatePortfolio(userId, portfolioId, data);
      if (!portfolio) {
        ctx.status = 404;
        ctx.body = { message: '投资组合不存在或无权限修改' };
        return;
      }
      ctx.body = portfolio;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '更新投资组合失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 删除投资组合
  async deletePortfolio() {
    const { ctx, service } = this;
    const userId = ctx.user ? ctx.user.id : 1; // 如果没有用户信息，使用默认用户ID
    const portfolioId = parseInt(ctx.params.id);

    try {
      const success = await service.portfolio.deletePortfolio(userId, portfolioId);
      if (!success) {
        ctx.status = 404;
        ctx.body = { message: '投资组合不存在或无权限删除' };
        return;
      }
      ctx.status = 204;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '删除投资组合失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 获取投资组合中的持仓
  async getPortfolioHoldings() {
    const { ctx, service } = this;
    const userId = ctx.user ? ctx.user.id : 1; // 如果没有用户信息，使用默认用户ID
    const portfolioId = parseInt(ctx.params.id);

    try {
      const holdings = await service.portfolio.getPortfolioHoldings(userId, portfolioId);
      if (holdings === null) {
        ctx.status = 404;
        ctx.body = { message: '投资组合不存在或无权限访问' };
        return;
      }
      ctx.body = holdings;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '获取持仓信息失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 添加持仓到投资组合
  async addHolding() {
    const { ctx, service } = this;
    const userId = ctx.user ? ctx.user.id : 1; // 如果没有用户信息，使用默认用户ID
    const portfolioId = parseInt(ctx.params.id);
    const data = ctx.request.body;

    // 手动验证
    if (!data.stockCode) {
      ctx.status = 400;
      ctx.body = { message: '股票代码不能为空' };
      return;
    }
    if (!data.stockName) {
      ctx.status = 400;
      ctx.body = { message: '股票名称不能为空' };
      return;
    }
    if (!data.quantity || data.quantity <= 0) {
      ctx.status = 400;
      ctx.body = { message: '持仓数量必须大于0' };
      return;
    }
    if (!data.averageCost || data.averageCost <= 0) {
      ctx.status = 400;
      ctx.body = { message: '买入价格必须大于0' };
      return;
    }

    try {
      const holding = await service.portfolio.addHolding(userId, portfolioId, data);
      if (!holding) {
        ctx.status = 404;
        ctx.body = { message: '投资组合不存在或无权限修改' };
        return;
      }
      ctx.status = 201;
      ctx.body = holding;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        ctx.status = 400;
        ctx.body = { message: '该股票已在组合中' };
      } else {
        ctx.status = 500;
        ctx.body = { message: '添加持仓失败，请稍后再试' };
        ctx.logger.error(error);
      }
    }
  }

  // 更新持仓
  async updateHolding() {
    const { ctx, service } = this;
    const userId = ctx.user ? ctx.user.id : 1; // 如果没有用户信息，使用默认用户ID
    const portfolioId = parseInt(ctx.params.portfolioId);
    const holdingId = parseInt(ctx.params.holdingId);
    const data = ctx.request.body;

    try {
      const holding = await service.portfolio.updateHolding(userId, portfolioId, holdingId, data);
      if (!holding) {
        ctx.status = 404;
        ctx.body = { message: '持仓不存在或无权限修改' };
        return;
      }
      ctx.body = holding;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '更新持仓失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 删除持仓
  async deleteHolding() {
    const { ctx, service } = this;
    const userId = ctx.user ? ctx.user.id : 1; // 如果没有用户信息，使用默认用户ID
    const portfolioId = parseInt(ctx.params.portfolioId);
    const holdingId = parseInt(ctx.params.holdingId);

    try {
      const success = await service.portfolio.deleteHolding(userId, portfolioId, holdingId);
      if (!success) {
        ctx.status = 404;
        ctx.body = { message: '持仓不存在或无权限删除' };
        return;
      }
      ctx.status = 204;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '删除持仓失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 添加交易记录
  async addTradeRecord() {
    const { ctx, service } = this;
    const userId = ctx.user ? ctx.user.id : 1; // 如果没有用户信息，使用默认用户ID
    const portfolioId = parseInt(ctx.params.id);
    const data = ctx.request.body;

    // 手动验证
    if (!data.stockCode) {
      ctx.status = 400;
      ctx.body = { message: '股票代码不能为空' };
      return;
    }
    if (!data.stockName) {
      ctx.status = 400;
      ctx.body = { message: '股票名称不能为空' };
      return;
    }
    if (!data.tradeType || !['buy', 'sell'].includes(data.tradeType)) {
      ctx.status = 400;
      ctx.body = { message: '交易类型必须为买入或卖出' };
      return;
    }
    if (!data.quantity || data.quantity <= 0) {
      ctx.status = 400;
      ctx.body = { message: '交易数量必须大于0' };
      return;
    }
    if (!data.price || data.price <= 0) {
      ctx.status = 400;
      ctx.body = { message: '交易价格必须大于0' };
      return;
    }

    try {
      const record = await service.portfolio.addTradeRecord(userId, portfolioId, data);
      if (!record) {
        ctx.status = 404;
        ctx.body = { message: '投资组合不存在或无权限修改' };
        return;
      }
      ctx.status = 201;
      ctx.body = record;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '添加交易记录失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 获取交易记录
  async getTradeRecords() {
    const { ctx, service } = this;
    const userId = ctx.user ? ctx.user.id : 1; // 如果没有用户信息，使用默认用户ID
    const portfolioId = parseInt(ctx.params.id);

    try {
      const records = await service.portfolio.getTradeRecords(userId, portfolioId);
      if (records === null) {
        ctx.status = 404;
        ctx.body = { message: '投资组合不存在或无权限访问' };
        return;
      }
      ctx.body = records;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '获取交易记录失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 删除交易记录
  async deleteTradeRecord() {
    const { ctx, service } = this;
    const userId = ctx.user ? ctx.user.id : 1; // 如果没有用户信息，使用默认用户ID
    const portfolioId = parseInt(ctx.params.portfolioId);
    const tradeId = parseInt(ctx.params.tradeId);

    try {
      const success = await service.portfolio.deleteTradeRecord(userId, portfolioId, tradeId);
      if (!success) {
        ctx.status = 404;
        ctx.body = { message: '交易记录不存在或无权限删除' };
        return;
      }
      ctx.status = 204;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '删除交易记录失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }
}

module.exports = PortfolioController;
