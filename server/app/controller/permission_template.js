'use strict';

const Controller = require('egg').Controller;

/**
 * 权限模板控制器
 */
class PermissionTemplateController extends Controller {
  /**
   * 获取所有权限模板
   */
  async getAllTemplates() {
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

      // 获取所有权限模板
      const templates = await service.page.getAllPermissionTemplates();

      ctx.body = {
        success: true,
        data: templates,
      };
    } catch (error) {
      ctx.logger.error('获取所有权限模板失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取所有权限模板失败: ${error.message}`,
      };
    }
  }

  /**
   * 获取权限模板详情
   */
  async getTemplateById() {
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

      // 获取权限模板详情
      const template = await service.page.getPermissionTemplateById(id);

      ctx.body = {
        success: true,
        data: template,
      };
    } catch (error) {
      ctx.logger.error('获取权限模板详情失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取权限模板详情失败: ${error.message}`,
      };
    }
  }

  /**
   * 创建权限模板
   */
  async createTemplate() {
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
        permissions: { type: 'array', required: true },
      });

      // 创建权限模板
      const template = await service.page.createPermissionTemplate(data);

      ctx.body = {
        success: true,
        message: '权限模板创建成功',
        data: template,
      };
    } catch (error) {
      ctx.logger.error('创建权限模板失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `创建权限模板失败: ${error.message}`,
      };
    }
  }

  /**
   * 更新权限模板
   */
  async updateTemplate() {
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

      // 更新权限模板
      const template = await service.page.updatePermissionTemplate(id, data);

      ctx.body = {
        success: true,
        message: '权限模板更新成功',
        data: template,
      };
    } catch (error) {
      ctx.logger.error('更新权限模板失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `更新权限模板失败: ${error.message}`,
      };
    }
  }

  /**
   * 删除权限模板
   */
  async deleteTemplate() {
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

      // 删除权限模板
      await service.page.deletePermissionTemplate(id);

      ctx.body = {
        success: true,
        message: '权限模板删除成功',
      };
    } catch (error) {
      ctx.logger.error('删除权限模板失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `删除权限模板失败: ${error.message}`,
      };
    }
  }

  /**
   * 应用权限模板到页面
   */
  async applyTemplateToPage() {
    const { ctx, service } = this;
    const { templateId, pageId } = ctx.request.body;

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
      if (!templateId || !pageId) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '缺少必要参数',
        };
        return;
      }

      // 应用权限模板到页面
      await service.page.applyTemplateToPage(templateId, pageId);

      ctx.body = {
        success: true,
        message: '权限模板应用成功',
      };
    } catch (error) {
      ctx.logger.error('应用权限模板到页面失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `应用权限模板到页面失败: ${error.message}`,
      };
    }
  }

  /**
   * 应用权限模板到页面组
   */
  async applyTemplateToGroup() {
    const { ctx, service } = this;
    const { templateId, groupId } = ctx.request.body;

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
      if (!templateId || !groupId) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '缺少必要参数',
        };
        return;
      }

      // 应用权限模板到页面组
      await service.page.applyTemplateToGroup(templateId, groupId);

      ctx.body = {
        success: true,
        message: '权限模板应用成功',
      };
    } catch (error) {
      ctx.logger.error('应用权限模板到页面组失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `应用权限模板到页面组失败: ${error.message}`,
      };
    }
  }
}

module.exports = PermissionTemplateController;
