'use strict';

const Controller = require('egg').Controller;

class SimulationController extends Controller {
  // 获取用户的所有模拟账户
  async getAccounts() {
    const { ctx, service } = this;

    // 确保用户已认证
    if (!ctx.user) {
      ctx.status = 401;
      ctx.body = { message: '未认证，请先登录' };
      return;
    }

    const userId = ctx.user.id;

    try {
      const accounts = await service.simulation.getAccounts(userId);
      ctx.body = accounts;
    } catch (err) {
      ctx.status = 500;
      ctx.body = { message: '获取模拟账户失败' };
      ctx.logger.error(err);
    }
  }

  // 创建新的模拟账户
  async createAccount() {
    const { ctx, service } = this;

    // 确保用户已认证
    if (!ctx.user) {
      ctx.status = 401;
      ctx.body = { message: '未认证，请先登录' };
      return;
    }

    const userId = ctx.user.id;
    const { name, initialCash } = ctx.request.body;

    try {
      const account = await service.simulation.createAccount(userId, name, initialCash);
      ctx.status = 201;
      ctx.body = account;
    } catch (err) {
      ctx.status = 500;
      ctx.body = { message: '创建模拟账户失败' };
      ctx.logger.error(err);
    }
  }

  // 获取账户详情
  async getAccount() {
    const { ctx, service } = this;

    // 确保用户已认证
    if (!ctx.user) {
      ctx.status = 401;
      ctx.body = { message: '未认证，请先登录' };
      return;
    }

    const userId = ctx.user.id;
    const accountId = parseInt(ctx.params.id);

    try {
      const account = await service.simulation.getAccount(userId, accountId);
      if (!account) {
        ctx.status = 404;
        ctx.body = { message: '账户不存在或无权限访问' };
        return;
      }
      ctx.body = account;
    } catch (err) {
      ctx.status = 500;
      ctx.body = { message: '获取账户详情失败' };
      ctx.logger.error(err);
    }
  }

  // 获取账户持仓
  async getPositions() {
    const { ctx, service } = this;

    // 确保用户已认证
    if (!ctx.user) {
      ctx.status = 401;
      ctx.body = { message: '未认证，请先登录' };
      return;
    }

    const userId = ctx.user.id;
    const accountId = parseInt(ctx.params.id);

    try {
      const positions = await service.simulation.getPositions(userId, accountId);
      ctx.body = positions;
    } catch (err) {
      ctx.status = 500;
      ctx.body = { message: '获取持仓失败' };
      ctx.logger.error(err);
    }
  }

  // 获取交易记录
  async getTransactions() {
    const { ctx, service } = this;

    // 确保用户已认证
    if (!ctx.user) {
      ctx.status = 401;
      ctx.body = { message: '未认证，请先登录' };
      return;
    }

    const userId = ctx.user.id;
    const accountId = parseInt(ctx.params.id);

    try {
      const transactions = await service.simulation.getTransactions(userId, accountId);
      ctx.body = transactions;
    } catch (err) {
      ctx.status = 500;
      ctx.body = { message: '获取交易记录失败' };
      ctx.logger.error(err);
    }
  }

  // 执行交易
  async executeTrade() {
    const { ctx, service } = this;

    // 确保用户已认证
    if (!ctx.user) {
      ctx.status = 401;
      ctx.body = { message: '未认证，请先登录' };
      return;
    }

    const userId = ctx.user.id;
    const accountId = parseInt(ctx.params.id);
    const { stockCode, stockName, action, quantity, price } = ctx.request.body;

    try {
      const result = await service.simulation.executeTrade(
        userId, accountId, stockCode, stockName, action, quantity, price
      );
      ctx.body = result;
    } catch (err) {
      ctx.status = 500;
      ctx.body = { message: err.message || '交易执行失败' };
      ctx.logger.error(err);
    }
  }
}

module.exports = SimulationController;
