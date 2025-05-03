'use strict';

const Controller = require('egg').Controller;

/**
 * 页面统计控制器
 */
class PageStatsController extends Controller {
  /**
   * 获取页面访问统计摘要
   */
  async getPageAccessSummary() {
    const { ctx, service } = this;
    const { startDate, endDate } = ctx.query;

    try {
      // 检查管理员权限
      if (!ctx.user || ctx.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '没有权限执行此操作',
        };
        return;
      }

      // 解析日期参数
      const parsedStartDate = startDate ? new Date(startDate) : null;
      const parsedEndDate = endDate ? new Date(endDate) : null;

      // 获取页面访问统计摘要
      const summary = await service.page.getPageAccessSummary({
        startDate: parsedStartDate,
        endDate: parsedEndDate,
      });

      ctx.body = {
        success: true,
        data: summary,
      };
    } catch (error) {
      ctx.logger.error('获取页面访问统计摘要失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取页面访问统计摘要失败: ${error.message}`,
      };
    }
  }

  /**
   * 获取页面访问统计
   */
  async getPageAccessStats() {
    const { ctx, service } = this;
    const { pageId, userId, startDate, endDate, limit } = ctx.query;

    try {
      // 检查管理员权限
      if (!ctx.user || ctx.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '没有权限执行此操作',
        };
        return;
      }

      // 解析参数
      const parsedPageId = pageId ? parseInt(pageId, 10) : null;
      const parsedUserId = userId ? parseInt(userId, 10) : null;
      const parsedStartDate = startDate ? new Date(startDate) : null;
      const parsedEndDate = endDate ? new Date(endDate) : null;
      const parsedLimit = limit ? parseInt(limit, 10) : 10;

      // 获取页面访问统计
      const stats = await service.page.getPageAccessStats({
        pageId: parsedPageId,
        userId: parsedUserId,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        limit: parsedLimit,
      });

      ctx.body = {
        success: true,
        data: stats,
      };
    } catch (error) {
      ctx.logger.error('获取页面访问统计失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取页面访问统计失败: ${error.message}`,
      };
    }
  }

  /**
   * 获取页面访问日志
   */
  async getPageAccessLogs() {
    const { ctx, service } = this;
    const {
      pageId,
      userId,
      path,
      membershipLevel,
      hasAccess,
      accessResult,
      startDate,
      endDate,
      page = '1',
      pageSize = '20',
    } = ctx.query;

    try {
      // 检查管理员权限
      if (!ctx.user || ctx.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '没有权限执行此操作',
        };
        return;
      }

      // 解析参数
      const parsedPageId = pageId ? parseInt(pageId, 10) : null;
      const parsedUserId = userId ? parseInt(userId, 10) : null;
      const parsedHasAccess = hasAccess ? hasAccess === 'true' : undefined;
      const parsedStartDate = startDate ? new Date(startDate) : null;
      const parsedEndDate = endDate ? new Date(endDate) : null;
      const parsedPage = parseInt(page, 10);
      const parsedPageSize = parseInt(pageSize, 10);

      // 获取页面访问日志
      const logs = await service.page.getPageAccessLogs({
        pageId: parsedPageId,
        userId: parsedUserId,
        path,
        membershipLevel,
        hasAccess: parsedHasAccess,
        accessResult,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        page: parsedPage,
        pageSize: parsedPageSize,
      });

      ctx.body = {
        success: true,
        data: logs,
      };
    } catch (error) {
      ctx.logger.error('获取页面访问日志失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取页面访问日志失败: ${error.message}`,
      };
    }
  }

  /**
   * 记录页面访问
   */
  async logPageAccess() {
    const { ctx, service } = this;
    const data = ctx.request.body;

    try {
      // 记录页面访问日志
      const log = await service.page.logPageAccess(data);

      ctx.body = {
        success: true,
        data: log ? { id: log.id } : null,
      };
    } catch (error) {
      ctx.logger.error('记录页面访问失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `记录页面访问失败: ${error.message}`,
      };
    }
  }

  /**
   * 更新页面停留时间
   */
  async updatePageDuration() {
    const { ctx, service } = this;
    const { logId, duration } = ctx.request.body;

    try {
      // 参数验证
      if (!logId || !duration) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '缺少必要参数',
        };
        return;
      }

      // 更新页面停留时间
      const success = await service.page.updatePageDuration(logId, duration);

      ctx.body = {
        success,
        message: success ? '更新页面停留时间成功' : '更新页面停留时间失败',
      };
    } catch (error) {
      ctx.logger.error('更新页面停留时间失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `更新页面停留时间失败: ${error.message}`,
      };
    }
  }
}

module.exports = PageStatsController;
