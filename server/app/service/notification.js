'use strict';

const Service = require('egg').Service;

/**
 * 通知服务
 */
class NotificationService extends Service {
  /**
   * 创建通知
   * @param {Object} data - 通知数据
   * @param {Object} transaction - 事务对象（可选）
   * @return {Object} 创建结果
   */
  async create(data, transaction = null) {
    const { ctx } = this;
    const { userId, title, content, type, relatedId, isRead = false } = data;

    try {
      // 如果在事务中，尝试跳过通知创建
      if (transaction) {
        ctx.logger.info('在事务中跳过通知创建，将在事务完成后创建');
        return {
          success: true,
          data: {
            id: 0,
            userId,
            title,
            content,
            type,
            relatedId,
            isRead,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          skipped: true,
        };
      }

      // 创建通知
      const notification = await ctx.model.Notification.create({
        userId,
        title,
        content,
        type,
        relatedId,
        isRead,
      });

      return {
        success: true,
        data: notification,
      };
    } catch (error) {
      ctx.logger.error('创建通知失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户通知列表
   * @param {number} userId - 用户ID
   * @param {Object} options - 查询选项
   * @return {Object} 通知列表
   */
  async getUserNotifications(userId, options = {}) {
    const { ctx } = this;
    const { page = 1, pageSize = 10, isRead, type } = options;

    const where = { userId };
    if (isRead !== undefined) {
      where.isRead = isRead;
    }
    if (type) {
      where.type = type;
    }

    try {
      const count = await ctx.model.Notification.count({ where });

      const notifications = await ctx.model.Notification.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });

      return {
        success: true,
        data: {
          list: notifications,
          pagination: {
            total: count,
            page,
            pageSize,
            totalPages: Math.ceil(count / pageSize),
          },
        },
      };
    } catch (error) {
      ctx.logger.error('获取用户通知列表失败:', error);
      throw error;
    }
  }

  /**
   * 标记通知为已读
   * @param {number} notificationId - 通知ID
   * @param {number} userId - 用户ID
   * @return {Object} 标记结果
   */
  async markAsRead(notificationId, userId) {
    const { ctx } = this;

    try {
      // 获取通知
      const notification = await ctx.model.Notification.findByPk(notificationId);
      if (!notification) {
        throw new Error(`通知不存在: ${notificationId}`);
      }

      // 检查是否是通知的所有者
      if (notification.userId !== userId) {
        throw new Error('无权标记此通知');
      }

      // 更新通知状态
      await notification.update({ isRead: true });

      return {
        success: true,
        data: {
          id: notificationId,
          isRead: true,
        },
      };
    } catch (error) {
      ctx.logger.error('标记通知为已读失败:', error);
      throw error;
    }
  }

  /**
   * 标记所有通知为已读
   * @param {number} userId - 用户ID
   * @return {Object} 标记结果
   */
  async markAllAsRead(userId) {
    const { ctx } = this;

    try {
      // 更新所有未读通知
      const result = await ctx.model.Notification.update(
        { isRead: true },
        { where: { userId, isRead: false } }
      );

      return {
        success: true,
        data: {
          count: result[0],
        },
      };
    } catch (error) {
      ctx.logger.error('标记所有通知为已读失败:', error);
      throw error;
    }
  }

  /**
   * 删除通知
   * @param {number} notificationId - 通知ID
   * @param {number} userId - 用户ID
   * @return {Object} 删除结果
   */
  async deleteNotification(notificationId, userId) {
    const { ctx } = this;

    try {
      // 获取通知
      const notification = await ctx.model.Notification.findByPk(notificationId);
      if (!notification) {
        throw new Error(`通知不存在: ${notificationId}`);
      }

      // 检查是否是通知的所有者
      if (notification.userId !== userId) {
        throw new Error('无权删除此通知');
      }

      // 删除通知
      await notification.destroy();

      return {
        success: true,
        data: {
          id: notificationId,
        },
      };
    } catch (error) {
      ctx.logger.error('删除通知失败:', error);
      throw error;
    }
  }

  /**
   * 获取未读通知数量
   * @param {number} userId - 用户ID
   * @return {Object} 未读通知数量
   */
  async getUnreadCount(userId) {
    const { ctx } = this;

    try {
      const count = await ctx.model.Notification.count({
        where: { userId, isRead: false },
      });

      return {
        success: true,
        data: {
          count,
        },
      };
    } catch (error) {
      ctx.logger.error('获取未读通知数量失败:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
