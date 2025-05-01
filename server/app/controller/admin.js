'use strict';

const Controller = require('egg').Controller;

/**
 * 管理员控制器
 * 处理管理员相关的API请求
 */
class AdminController extends Controller {
  /**
   * 获取所有用户列表
   */
  async getAllUsers() {
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

      // 获取分页参数和筛选参数
      const {
        page = 1,
        pageSize = 20,
        sortBy = 'id',
        sortOrder = 'asc',
        search = '',
        role = '',
        status = '',
        membership = ''
      } = ctx.query;

      // 获取用户列表
      const result = await service.admin.getAllUsers({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        sortBy,
        sortOrder,
        search,
        role,
        status,
        membership,
      });

      ctx.body = {
        success: true,
        data: result.users,
        pagination: {
          total: result.total,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalPages: Math.ceil(result.total / parseInt(pageSize)),
        },
      };
    } catch (error) {
      ctx.logger.error('获取用户列表失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取用户列表失败: ${error.message}`,
      };
    }
  }

  /**
   * 获取用户详情
   */
  async getUserDetail() {
    const { ctx, service } = this;
    const { userId } = ctx.params;

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

      // 获取用户详情
      const user = await service.admin.getUserDetail(userId);

      if (!user) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: '用户不存在',
        };
        return;
      }

      ctx.body = {
        success: true,
        data: user,
      };
    } catch (error) {
      ctx.logger.error('获取用户详情失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取用户详情失败: ${error.message}`,
      };
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser() {
    const { ctx, service } = this;
    const { userId } = ctx.params;
    const updateData = ctx.request.body;

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

      // 更新用户信息
      const result = await service.admin.updateUser(userId, updateData);

      if (!result.success) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: result.message || '更新用户信息失败',
        };
        return;
      }

      ctx.body = {
        success: true,
        data: result.user,
        message: '用户信息更新成功',
      };
    } catch (error) {
      ctx.logger.error('更新用户信息失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `更新用户信息失败: ${error.message}`,
      };
    }
  }

  /**
   * 更改用户状态（启用/禁用）
   */
  async updateUserStatus() {
    const { ctx, service } = this;
    const { userId } = ctx.params;
    const { status } = ctx.request.body;

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

      // 检查参数
      if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '无效的状态值',
        };
        return;
      }

      // 更新用户状态
      const result = await service.admin.updateUserStatus(userId, status);

      if (!result.success) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: result.message || '更新用户状态失败',
        };
        return;
      }

      ctx.body = {
        success: true,
        data: { userId, status: result.status },
        message: `用户状态已更新为 ${result.status}`,
      };
    } catch (error) {
      ctx.logger.error('更新用户状态失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `更新用户状态失败: ${error.message}`,
      };
    }
  }

  /**
   * 获取系统统计信息
   */
  async getSystemStats() {
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

      // 获取系统统计信息
      const stats = await service.admin.getSystemStats();

      ctx.body = {
        success: true,
        data: stats,
      };
    } catch (error) {
      ctx.logger.error('获取系统统计信息失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取系统统计信息失败: ${error.message}`,
      };
    }
  }
}

module.exports = AdminController;
