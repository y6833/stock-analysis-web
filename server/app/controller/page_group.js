'use strict';

const Controller = require('egg').Controller;

/**
 * 页面组控制器
 */
class PageGroupController extends Controller {
  /**
   * 获取所有页面组
   */
  async getAllPageGroups() {
    const { ctx, service } = this;

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

      // 获取所有页面组
      const groups = await service.page.getAllPageGroups();

      ctx.body = {
        success: true,
        data: groups,
      };
    } catch (error) {
      ctx.logger.error('获取所有页面组失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取所有页面组失败: ${error.message}`,
      };
    }
  }

  /**
   * 获取页面组详情
   */
  async getPageGroupById() {
    const { ctx, service } = this;
    const { id } = ctx.params;

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

      // 获取页面组详情
      const group = await service.page.getPageGroupById(id);

      ctx.body = {
        success: true,
        data: group,
      };
    } catch (error) {
      ctx.logger.error('获取页面组详情失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取页面组详情失败: ${error.message}`,
      };
    }
  }

  /**
   * 创建页面组
   */
  async createPageGroup() {
    const { ctx, service } = this;
    const data = ctx.request.body;

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

      // 参数验证
      ctx.validate({
        name: { type: 'string', required: true },
      });

      // 创建页面组
      const group = await service.page.createPageGroup(data);

      ctx.body = {
        success: true,
        message: '页面组创建成功',
        data: group,
      };
    } catch (error) {
      ctx.logger.error('创建页面组失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `创建页面组失败: ${error.message}`,
      };
    }
  }

  /**
   * 更新页面组
   */
  async updatePageGroup() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const data = ctx.request.body;

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

      // 更新页面组
      const group = await service.page.updatePageGroup(id, data);

      ctx.body = {
        success: true,
        message: '页面组更新成功',
        data: group,
      };
    } catch (error) {
      ctx.logger.error('更新页面组失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `更新页面组失败: ${error.message}`,
      };
    }
  }

  /**
   * 删除页面组
   */
  async deletePageGroup() {
    const { ctx, service } = this;
    const { id } = ctx.params;

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

      // 删除页面组
      await service.page.deletePageGroup(id);

      ctx.body = {
        success: true,
        message: '页面组删除成功',
      };
    } catch (error) {
      ctx.logger.error('删除页面组失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `删除页面组失败: ${error.message}`,
      };
    }
  }

  /**
   * 设置页面组权限
   */
  async setPageGroupPermissions() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const { permissions } = ctx.request.body;

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

      // 参数验证
      if (!permissions || !Array.isArray(permissions)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '权限数据格式不正确',
        };
        return;
      }

      // 设置页面组权限
      await service.page.setPageGroupPermissions(id, permissions);

      ctx.body = {
        success: true,
        message: '页面组权限设置成功',
      };
    } catch (error) {
      ctx.logger.error('设置页面组权限失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `设置页面组权限失败: ${error.message}`,
      };
    }
  }
}

module.exports = PageGroupController;
