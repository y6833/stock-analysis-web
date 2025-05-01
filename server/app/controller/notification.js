'use strict';

const Controller = require('egg').Controller;

/**
 * 通知控制器
 */
class NotificationController extends Controller {
  /**
   * 获取用户通知列表
   */
  async getUserNotifications() {
    const { ctx } = this;
    const userId = ctx.user.id;
    const { page, pageSize, isRead, type } = ctx.query;
    
    try {
      const result = await ctx.service.notification.getUserNotifications(userId, {
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 10,
        isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
        type,
      });
      
      ctx.body = {
        success: true,
        data: result.data,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取通知列表失败',
        error: error.message,
      };
    }
  }
  
  /**
   * 标记通知为已读
   */
  async markAsRead() {
    const { ctx } = this;
    const userId = ctx.user.id;
    const { notificationId } = ctx.params;
    
    try {
      const result = await ctx.service.notification.markAsRead(notificationId, userId);
      
      ctx.body = {
        success: true,
        message: '通知已标记为已读',
        data: result.data,
      };
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '标记通知为已读失败',
        error: error.message,
      };
    }
  }
  
  /**
   * 标记所有通知为已读
   */
  async markAllAsRead() {
    const { ctx } = this;
    const userId = ctx.user.id;
    
    try {
      const result = await ctx.service.notification.markAllAsRead(userId);
      
      ctx.body = {
        success: true,
        message: `已标记 ${result.data.count} 条通知为已读`,
        data: result.data,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '标记所有通知为已读失败',
        error: error.message,
      };
    }
  }
  
  /**
   * 删除通知
   */
  async deleteNotification() {
    const { ctx } = this;
    const userId = ctx.user.id;
    const { notificationId } = ctx.params;
    
    try {
      const result = await ctx.service.notification.deleteNotification(notificationId, userId);
      
      ctx.body = {
        success: true,
        message: '通知已删除',
        data: result.data,
      };
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '删除通知失败',
        error: error.message,
      };
    }
  }
  
  /**
   * 获取未读通知数量
   */
  async getUnreadCount() {
    const { ctx } = this;
    const userId = ctx.user.id;
    
    try {
      const result = await ctx.service.notification.getUnreadCount(userId);
      
      ctx.body = {
        success: true,
        data: result.data,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取未读通知数量失败',
        error: error.message,
      };
    }
  }
}

module.exports = NotificationController;
