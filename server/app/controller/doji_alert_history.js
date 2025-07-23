'use strict';

const Controller = require('egg').Controller;

/**
 * 十字星形态提醒历史记录控制器
 */
class DojiAlertHistoryController extends Controller {
  /**
     * 获取提醒历史记录
     * GET /api/doji-alerts/history
     */
  async getAlertHistory() {
    const { ctx, service } = this;
    const { page = 1, pageSize = 10, startDate, endDate, stockCode, patternType, acknowledged, sortBy = 'triggeredAt', sortDirection = 'desc' } = ctx.query;
    const userId = ctx.state.user.id;

    try {
      const result = await service.dojiAlert.getAlertHistory(userId, {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        startDate,
        endDate,
        stockCode,
        patternType,
        acknowledged: acknowledged === 'true' ? true : (acknowledged === 'false' ? false : undefined),
        sortBy,
        sortDirection,
      });

      ctx.body = result;
    } catch (error) {
      ctx.logger.error('获取十字星形态提醒历史记录失败:', error);
      ctx.status = 500;
      ctx.body = { error: '获取十字星形态提醒历史记录失败' };
    }
  }

  /**
     * 获取特定提醒的历史记录
     * GET /api/doji-alerts/:alertId/history
     */
  async getAlertHistoryByAlertId() {
    const { ctx, service } = this;
    const { alertId } = ctx.params;
    const { page = 1, pageSize = 10, startDate, endDate, acknowledged, sortBy = 'triggeredAt', sortDirection = 'desc' } = ctx.query;
    const userId = ctx.state.user.id;

    try {
      const result = await service.dojiAlert.getAlertHistoryByAlertId(userId, parseInt(alertId), {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        startDate,
        endDate,
        acknowledged: acknowledged === 'true' ? true : (acknowledged === 'false' ? false : undefined),
        sortBy,
        sortDirection,
      });

      ctx.body = result;
    } catch (error) {
      ctx.logger.error(`获取十字星形态提醒 ${alertId} 的历史记录失败:`, error);
      ctx.status = 500;
      ctx.body = { error: `获取十字星形态提醒 ${alertId} 的历史记录失败` };
    }
  }

  /**
     * 获取特定股票的提醒历史记录
     * GET /api/doji-alerts/history/stock/:stockCode
     */
  async getAlertHistoryByStock() {
    const { ctx, service } = this;
    const { stockCode } = ctx.params;
    const { page = 1, pageSize = 10, startDate, endDate, patternType, acknowledged, sortBy = 'triggeredAt', sortDirection = 'desc' } = ctx.query;
    const userId = ctx.state.user.id;

    try {
      const result = await service.dojiAlert.getAlertHistoryByStock(userId, stockCode, {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        startDate,
        endDate,
        patternType,
        acknowledged: acknowledged === 'true' ? true : (acknowledged === 'false' ? false : undefined),
        sortBy,
        sortDirection,
      });

      ctx.body = result;
    } catch (error) {
      ctx.logger.error(`获取股票 ${stockCode} 的十字星形态提醒历史记录失败:`, error);
      ctx.status = 500;
      ctx.body = { error: `获取股票 ${stockCode} 的十字星形态提醒历史记录失败` };
    }
  }

  /**
     * 确认提醒历史记录
     * PATCH /api/doji-alerts/history/:historyId/acknowledge
     */
  async acknowledgeAlertHistory() {
    const { ctx, service } = this;
    const { historyId } = ctx.params;
    const userId = ctx.state.user.id;

    try {
      const result = await service.dojiAlert.acknowledgeAlertHistory(userId, parseInt(historyId));
      if (result) {
        ctx.body = result;
      } else {
        ctx.status = 404;
        ctx.body = { error: '提醒历史记录不存在或无权限' };
      }
    } catch (error) {
      ctx.logger.error(`确认十字星形态提醒历史记录 ${historyId} 失败:`, error);
      ctx.status = 500;
      ctx.body = { error: '确认十字星形态提醒历史记录失败' };
    }
  }

  /**
     * 批量确认提醒历史记录
     * POST /api/doji-alerts/history/bulk-acknowledge
     */
  async bulkAcknowledgeAlertHistory() {
    const { ctx, service } = this;
    const { historyIds } = ctx.request.body;
    const userId = ctx.state.user.id;

    if (!historyIds || !Array.isArray(historyIds) || historyIds.length === 0) {
      ctx.status = 400;
      ctx.body = { error: '无效的历史记录ID列表' };
      return;
    }

    try {
      const result = await service.dojiAlert.bulkAcknowledgeAlertHistory(userId, historyIds);
      ctx.body = { count: result.count };
    } catch (error) {
      ctx.logger.error('批量确认十字星形态提醒历史记录失败:', error);
      ctx.status = 500;
      ctx.body = { error: '批量确认十字星形态提醒历史记录失败' };
    }
  }

  /**
     * 删除提醒历史记录
     * DELETE /api/doji-alerts/history/:historyId
     */
  async deleteAlertHistory() {
    const { ctx, service } = this;
    const { historyId } = ctx.params;
    const userId = ctx.state.user.id;

    try {
      const success = await service.dojiAlert.deleteAlertHistory(userId, parseInt(historyId));
      if (success) {
        ctx.status = 204;
      } else {
        ctx.status = 404;
        ctx.body = { error: '提醒历史记录不存在或无权限' };
      }
    } catch (error) {
      ctx.logger.error(`删除十字星形态提醒历史记录 ${historyId} 失败:`, error);
      ctx.status = 500;
      ctx.body = { error: '删除十字星形态提醒历史记录失败' };
    }
  }

  /**
     * 获取提醒历史统计数据
     * GET /api/doji-alerts/stats
     */
  async getAlertHistoryStats() {
    const { ctx, service } = this;
    const { startDate, endDate, stockCode } = ctx.query;
    const userId = ctx.state.user.id;

    try {
      const stats = await service.dojiAlert.getAlertHistoryStats(userId, {
        startDate,
        endDate,
        stockCode,
      });
      ctx.body = stats;
    } catch (error) {
      ctx.logger.error('获取十字星形态提醒统计数据失败:', error);
      ctx.status = 500;
      ctx.body = { error: '获取十字星形态提醒统计数据失败' };
    }
  }

  /**
     * 标记所有提醒历史为已读
     * PATCH /api/doji-alerts/:alertId/history/read-all
     */
  async markAllHistoryAsRead() {
    const { ctx, service } = this;
    const { alertId } = ctx.params;
    const userId = ctx.state.user.id;

    try {
      const result = await service.dojiAlert.markAllHistoryAsRead(userId, parseInt(alertId));
      ctx.body = { success: true, count: result.count };
    } catch (error) {
      ctx.logger.error('标记所有提醒历史为已读失败:', error);
      ctx.status = 500;
      ctx.body = { error: '标记所有提醒历史为已读失败' };
    }
  }

  /**
     * 获取未读提醒历史数量
     * GET /api/doji-alerts/history/unread-count
     */
  async getUnreadHistoryCount() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id;

    try {
      const count = await service.dojiAlert.getUnreadHistoryCount(userId);
      ctx.body = { count };
    } catch (error) {
      ctx.logger.error('获取未读提醒历史数量失败:', error);
      ctx.status = 500;
      ctx.body = { error: '获取未读提醒历史数量失败' };
    }
  }

  /**
     * 导出提醒历史记录
     * GET /api/doji-alerts/history/export
     */
  async exportAlertHistory() {
    const { ctx, service } = this;
    const { startDate, endDate, stockCode, patternType, acknowledged, format = 'excel' } = ctx.query;
    const userId = ctx.state.user.id;

    try {
      const result = await service.dojiAlert.exportAlertHistory(userId, {
        startDate,
        endDate,
        stockCode,
        patternType,
        acknowledged: acknowledged === 'true' ? true : (acknowledged === 'false' ? false : undefined),
        format,
      });

      // 设置响应头
      ctx.set('Content-Type', format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv');
      ctx.set('Content-Disposition', `attachment; filename=doji_alert_history_${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`);

      // 发送文件内容
      ctx.body = result.buffer;
    } catch (error) {
      ctx.logger.error('导出提醒历史记录失败:', error);
      ctx.status = 500;
      ctx.body = { error: '导出提醒历史记录失败' };
    }
  }

  /**
     * 获取提醒历史趋势数据
     * GET /api/doji-alerts/history/trend
     */
  async getAlertHistoryTrend() {
    const { ctx, service } = this;
    const { startDate, endDate, stockCode, patternType, interval = 'day' } = ctx.query;
    const userId = ctx.state.user.id;

    try {
      const trend = await service.dojiAlert.getAlertHistoryTrend(userId, {
        startDate,
        endDate,
        stockCode,
        patternType,
        interval,
      });
      ctx.body = trend;
    } catch (error) {
      ctx.logger.error('获取提醒历史趋势数据失败:', error);
      ctx.status = 500;
      ctx.body = { error: '获取提醒历史趋势数据失败' };
    }
  }
}

module.exports = DojiAlertHistoryController;
