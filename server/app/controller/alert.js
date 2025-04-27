'use strict';

const Controller = require('egg').Controller;

class AlertController extends Controller {
  // 获取用户的所有提醒
  async getAlerts() {
    const { ctx, service } = this;
    const userId = ctx.user.id;

    try {
      const alerts = await service.alert.getUserAlerts(userId);
      ctx.body = alerts;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '获取提醒列表失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 获取用户关注列表中的提醒
  async getWatchlistAlerts() {
    const { ctx, service } = this;
    const userId = ctx.user.id;
    const { watchlistId } = ctx.query;

    if (!watchlistId) {
      ctx.status = 400;
      ctx.body = { message: '缺少关注列表ID' };
      return;
    }

    try {
      const alerts = await service.alert.getWatchlistAlerts(userId, watchlistId);
      ctx.body = alerts;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '获取关注列表提醒失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 添加提醒到关注列表
  async addWatchlistAlert() {
    const { ctx, service } = this;
    const userId = ctx.user.id;
    const data = ctx.request.body;

    // 验证必填字段
    if (!data.watchlistId || !data.symbol || !data.stockName || !data.condition || data.value === undefined) {
      ctx.status = 400;
      ctx.body = { message: '缺少必要的提醒信息' };
      return;
    }

    try {
      const alert = await service.alert.addWatchlistAlert(userId, data);
      ctx.status = 201;
      ctx.body = alert;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '添加关注列表提醒失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 删除关注列表中的提醒
  async removeWatchlistAlert() {
    const { ctx, service } = this;
    const userId = ctx.user.id;
    const { watchlistId, alertId } = ctx.params;

    if (!watchlistId || !alertId) {
      ctx.status = 400;
      ctx.body = { message: '缺少必要的参数' };
      return;
    }

    try {
      const success = await service.alert.removeWatchlistAlert(userId, watchlistId, alertId);
      if (!success) {
        ctx.status = 404;
        ctx.body = { message: '提醒不存在或无权限删除' };
        return;
      }
      ctx.status = 204;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '删除关注列表提醒失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 创建新提醒
  async createAlert() {
    const { ctx, service } = this;
    const userId = ctx.user.id;
    const data = ctx.request.body;

    // 验证必填字段
    if (!data.stockCode || !data.stockName || !data.alertType || !data.condition || data.value === undefined) {
      ctx.status = 400;
      ctx.body = { message: '缺少必要的提醒信息' };
      return;
    }

    try {
      const alert = await service.alert.createAlert(userId, data);
      ctx.status = 201;
      ctx.body = alert;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '创建提醒失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 更新提醒
  async updateAlert() {
    const { ctx, service } = this;
    const userId = ctx.user.id;
    const alertId = parseInt(ctx.params.id);
    const data = ctx.request.body;

    try {
      const alert = await service.alert.updateAlert(userId, alertId, data);
      if (!alert) {
        ctx.status = 404;
        ctx.body = { message: '提醒不存在或无权限修改' };
        return;
      }
      ctx.body = alert;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '更新提醒失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 删除提醒
  async deleteAlert() {
    const { ctx, service } = this;
    const userId = ctx.user.id;
    const alertId = parseInt(ctx.params.id);

    try {
      const success = await service.alert.deleteAlert(userId, alertId);
      if (!success) {
        ctx.status = 404;
        ctx.body = { message: '提醒不存在或无权限删除' };
        return;
      }
      ctx.status = 204;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '删除提醒失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 获取提醒历史记录
  async getAlertHistory() {
    const { ctx, service } = this;
    const userId = ctx.user.id;
    const alertId = parseInt(ctx.params.id);

    try {
      const history = await service.alert.getAlertHistory(userId, alertId);
      ctx.body = history;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '获取提醒历史记录失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 标记提醒历史为已读
  async markHistoryAsRead() {
    const { ctx, service } = this;
    const userId = ctx.user.id;
    const historyId = parseInt(ctx.params.historyId);

    try {
      const success = await service.alert.markHistoryAsRead(userId, historyId);
      if (!success) {
        ctx.status = 404;
        ctx.body = { message: '提醒历史记录不存在或无权限修改' };
        return;
      }
      ctx.status = 204;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '标记提醒历史为已读失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }
}

module.exports = AlertController;
