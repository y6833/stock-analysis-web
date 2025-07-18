'use strict';

const Controller = require('egg').Controller;

/**
 * 提醒历史记录控制器
 */
class AlertHistoryController extends Controller {
    /**
     * 获取提醒历史记录
     * GET /api/alerts/:alertId/history
     */
    async getAlertHistory() {
        const { ctx, service } = this;
        const { alertId } = ctx.params;
        const userId = ctx.state.user.id;

        try {
            const history = await service.alert.getAlertHistory(userId, parseInt(alertId));
            ctx.body = history;
        } catch (error) {
            ctx.logger.error('获取提醒历史记录失败:', error);
            ctx.status = 500;
            ctx.body = { error: '获取提醒历史记录失败' };
        }
    }

    /**
     * 标记提醒历史为已读
     * PATCH /api/alert-history/:historyId/read
     */
    async markHistoryAsRead() {
        const { ctx, service } = this;
        const { historyId } = ctx.params;
        const userId = ctx.state.user.id;

        try {
            const success = await service.alert.markHistoryAsRead(userId, parseInt(historyId));
            if (success) {
                ctx.body = { success: true };
            } else {
                ctx.status = 404;
                ctx.body = { error: '提醒历史记录不存在或无权限' };
            }
        } catch (error) {
            ctx.logger.error('标记提醒历史为已读失败:', error);
            ctx.status = 500;
            ctx.body = { error: '标记提醒历史为已读失败' };
        }
    }

    /**
     * 标记所有提醒历史为已读
     * PATCH /api/alerts/:alertId/history/read-all
     */
    async markAllHistoryAsRead() {
        const { ctx, service } = this;
        const { alertId } = ctx.params;
        const userId = ctx.state.user.id;

        try {
            const result = await service.alert.markAllHistoryAsRead(userId, parseInt(alertId));
            ctx.body = { success: true, count: result.count };
        } catch (error) {
            ctx.logger.error('标记所有提醒历史为已读失败:', error);
            ctx.status = 500;
            ctx.body = { error: '标记所有提醒历史为已读失败' };
        }
    }

    /**
     * 删除提醒历史记录
     * DELETE /api/alert-history/:historyId
     */
    async deleteAlertHistory() {
        const { ctx, service } = this;
        const { historyId } = ctx.params;
        const userId = ctx.state.user.id;

        try {
            const success = await service.alert.deleteAlertHistory(userId, parseInt(historyId));
            if (success) {
                ctx.status = 204;
            } else {
                ctx.status = 404;
                ctx.body = { error: '提醒历史记录不存在或无权限' };
            }
        } catch (error) {
            ctx.logger.error('删除提醒历史记录失败:', error);
            ctx.status = 500;
            ctx.body = { error: '删除提醒历史记录失败' };
        }
    }

    /**
     * 获取提醒统计数据
     * GET /api/alerts/statistics
     */
    async getAlertStatistics() {
        const { ctx, service } = this;
        const userId = ctx.state.user.id;

        try {
            const statistics = await service.alert.getAlertStatistics(userId);
            ctx.body = statistics;
        } catch (error) {
            ctx.logger.error('获取提醒统计数据失败:', error);
            ctx.status = 500;
            ctx.body = { error: '获取提醒统计数据失败' };
        }
    }
}

module.exports = AlertHistoryController;