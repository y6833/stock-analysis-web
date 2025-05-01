'use strict';

const Controller = require('egg').Controller;

/**
 * 逗币控制器
 */
class CoinsController extends Controller {
  /**
   * 获取用户逗币余额
   */
  async getUserCoins() {
    const { ctx } = this;
    const userId = ctx.user.id;

    try {
      const coins = await ctx.service.coins.getUserCoins(userId);

      ctx.body = {
        success: true,
        data: {
          userId,
          coins,
        },
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取逗币余额失败',
        error: error.message,
      };
    }
  }

  /**
   * 使用逗币兑换会员
   */
  async exchangeMembership() {
    const { ctx } = this;
    const userId = ctx.user.id;
    const { level, days } = ctx.request.body;

    try {
      // 参数验证
      ctx.validate({
        level: { type: 'enum', values: ['basic', 'premium'] },
        days: { type: 'integer', min: 1 },
      });

      const result = await ctx.service.coins.exchangeMembership(userId, level, days);

      ctx.body = {
        success: true,
        message: `成功兑换${days}天${level === 'basic' ? '普通' : '高级'}会员`,
        data: result,
      };
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '兑换会员失败',
        error: error.message,
      };
    }
  }

  /**
   * 管理员：增加用户逗币（仅限管理员使用）
   */
  async addCoins() {
    const { ctx } = this;

    // 检查是否为管理员
    if (ctx.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足',
      };
      return;
    }

    const { userId, amount, reason } = ctx.request.body;

    try {
      // 参数验证
      ctx.validate({
        userId: { type: 'integer', min: 1 },
        amount: { type: 'integer', min: 1 },
        reason: { type: 'string', required: false },
      });

      const result = await ctx.service.coins.addCoins(userId, amount, reason || '管理员操作');

      ctx.body = {
        success: true,
        message: `成功为用户${userId}增加${amount}个逗币`,
        data: result,
      };
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '增加逗币失败',
        error: error.message,
      };
    }
  }

  /**
   * 获取用户逗币交易记录
   */
  async getTransactions() {
    const { ctx } = this;
    const userId = ctx.user.id;
    const { page, pageSize, type, startDate, endDate } = ctx.query;

    try {
      const options = {
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 10,
        type,
        startDate,
        endDate,
      };

      const result = await ctx.service.coins.getTransactions(userId, options);

      ctx.body = {
        success: true,
        data: result,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取逗币交易记录失败',
        error: error.message,
      };
    }
  }

  /**
   * 管理员：减少用户逗币（仅限管理员使用）
   */
  async deductCoins() {
    const { ctx } = this;

    // 检查是否为管理员
    if (ctx.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足',
      };
      return;
    }

    const { userId, amount, reason } = ctx.request.body;

    try {
      // 参数验证
      ctx.validate({
        userId: { type: 'integer', min: 1 },
        amount: { type: 'integer', min: 1 },
        reason: { type: 'string', required: false },
      });

      const result = await ctx.service.coins.deductCoins(userId, amount, reason || '管理员操作');

      ctx.body = {
        success: true,
        message: `成功从用户${userId}减少${amount}个逗币`,
        data: result,
      };
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '减少逗币失败',
        error: error.message,
      };
    }
  }
}

module.exports = CoinsController;
