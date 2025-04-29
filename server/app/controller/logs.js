'use strict';

const Controller = require('egg').Controller;

/**
 * 日志控制器
 * 处理日志相关的API请求
 */
class LogsController extends Controller {
  /**
   * 获取数据源日志
   */
  async getDataSourceLogs() {
    const { ctx, service } = this;
    const { page = 1, pageSize = 20, level, source, search } = ctx.query;

    try {
      const logs = await service.logs.getDataSourceLogs({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        level,
        source,
        search
      });

      ctx.body = {
        success: true,
        logs: logs.items,
        total: logs.total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: '获取数据源日志失败',
        message: error.message || '未知错误'
      };
      ctx.logger.error('获取数据源日志失败:', error);
    }
  }

  /**
   * 获取最近的数据源日志
   */
  async getRecentDataSourceLogs() {
    const { ctx, service } = this;
    const { limit = 5 } = ctx.query;

    try {
      const logs = await service.logs.getRecentDataSourceLogs(parseInt(limit));

      ctx.body = {
        success: true,
        logs
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: '获取最近数据源日志失败',
        message: error.message || '未知错误'
      };
      ctx.logger.error('获取最近数据源日志失败:', error);
    }
  }

  /**
   * 添加数据源日志
   */
  async addDataSourceLog() {
    const { ctx, service } = this;
    const { level, module, source, message, data } = ctx.request.body;

    // 验证必填字段
    if (!level || !message) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: '缺少必填字段',
        message: '级别和消息是必填字段'
      };
      return;
    }

    try {
      // 获取当前用户ID
      const userId = ctx.user ? ctx.user.id : null;

      const result = await service.logs.addDataSourceLog({
        level,
        module,
        source,
        message,
        data,
        userId
      });

      ctx.body = {
        success: true,
        message: '日志添加成功',
        log: result
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: '添加数据源日志失败',
        message: error.message || '未知错误'
      };
      ctx.logger.error('添加数据源日志失败:', error);
    }
  }

  /**
   * 清除数据源日志
   */
  async clearDataSourceLogs() {
    const { ctx, service } = this;

    try {
      const result = await service.logs.clearDataSourceLogs();

      ctx.body = {
        success: true,
        message: '数据源日志已清除',
        count: result
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: '清除数据源日志失败',
        message: error.message || '未知错误'
      };
      ctx.logger.error('清除数据源日志失败:', error);
    }
  }
}

module.exports = LogsController;
