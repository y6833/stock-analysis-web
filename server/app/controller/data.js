'use strict';

const Controller = require('egg').Controller;

class DataController extends Controller {
  /**
   * 刷新数据
   * 强制从外部API获取最新数据并更新缓存
   */
  async refreshData() {
    const { ctx, service } = this;
    const { force_api = false, dataSource = 'tushare' } = ctx.request.body;

    try {
      // 检查用户权限
      const userId = ctx.user?.id;
      if (!userId) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: '请先登录',
          data_source: 'error',
          data_source_message: '未授权访问'
        };
        return;
      }

      // 检查用户刷新频率限制
      const canRefresh = await service.user.checkRefreshLimit(userId);
      if (!canRefresh && !ctx.user.isAdmin) {
        ctx.status = 429;
        ctx.body = {
          success: false,
          message: '刷新操作过于频繁，请稍后再试',
          data_source: 'error',
          data_source_message: '刷新频率限制'
        };
        return;
      }

      // 执行数据刷新
      const result = await service.data.refreshAllData({
        userId,
        forceApi: force_api,
        dataSource,
      });

      // 更新用户最后刷新时间
      await service.user.updateLastRefreshTime(userId);

      ctx.body = {
        success: true,
        message: '数据刷新成功',
        refreshed: result.refreshed,
        timestamp: new Date().toISOString(),
        data_source: dataSource,
        data_source_message: `数据来自${dataSource.toUpperCase()}数据源`
      };
    } catch (error) {
      ctx.logger.error('刷新数据失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `刷新数据失败: ${error.message}`,
        data_source: 'error',
        data_source_message: `刷新数据失败: ${error.message}`
      };
    }
  }

  /**
   * 获取数据刷新状态
   */
  async getRefreshStatus() {
    const { ctx, service } = this;

    try {
      // 检查用户权限
      const userId = ctx.user?.id;
      if (!userId) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: '请先登录',
        };
        return;
      }

      // 获取用户刷新状态
      const status = await service.user.getRefreshStatus(userId);

      ctx.body = {
        success: true,
        ...status,
      };
    } catch (error) {
      ctx.logger.error('获取刷新状态失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取刷新状态失败: ${error.message}`,
      };
    }
  }
}

module.exports = DataController;
