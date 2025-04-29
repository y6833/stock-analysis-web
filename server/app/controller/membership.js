'use strict';

const Controller = require('egg').Controller;

class MembershipController extends Controller {
  /**
   * 获取用户会员信息
   */
  async getUserMembership() {
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
      
      // 获取用户会员信息
      const membershipInfo = await service.membership.getUserMembership(userId);
      
      ctx.body = {
        success: true,
        data: membershipInfo,
      };
    } catch (error) {
      ctx.logger.error('获取用户会员信息失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取用户会员信息失败: ${error.message}`,
      };
    }
  }
  
  /**
   * 获取会员等级列表
   */
  async getMembershipLevels() {
    const { ctx, service } = this;
    
    try {
      const levels = ['free', 'basic', 'premium', 'enterprise'];
      const membershipLevels = levels.map(level => ({
        level,
        ...service.membership.getMembershipInfo(level),
      }));
      
      ctx.body = {
        success: true,
        data: membershipLevels,
      };
    } catch (error) {
      ctx.logger.error('获取会员等级列表失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取会员等级列表失败: ${error.message}`,
      };
    }
  }
  
  /**
   * 检查功能访问权限
   */
  async checkFeatureAccess() {
    const { ctx, service } = this;
    const { feature } = ctx.query;
    
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
      
      // 检查功能参数
      if (!feature) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '缺少功能参数',
        };
        return;
      }
      
      // 检查功能访问权限
      const hasAccess = await service.membership.checkFeatureAccess(userId, feature);
      
      ctx.body = {
        success: true,
        hasAccess,
        feature,
      };
    } catch (error) {
      ctx.logger.error('检查功能访问权限失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `检查功能访问权限失败: ${error.message}`,
      };
    }
  }
  
  /**
   * 更新用户会员等级（仅管理员）
   */
  async updateMembership() {
    const { ctx, service } = this;
    const { userId, level, expiresAt } = ctx.request.body;
    
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
      if (!userId || !level) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '缺少必要参数',
        };
        return;
      }
      
      // 更新会员等级
      const result = await service.membership.updateMembership(
        userId,
        level,
        expiresAt ? new Date(expiresAt) : null
      );
      
      ctx.body = {
        success: true,
        data: result,
      };
    } catch (error) {
      ctx.logger.error('更新用户会员等级失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `更新用户会员等级失败: ${error.message}`,
      };
    }
  }
}

module.exports = MembershipController;
