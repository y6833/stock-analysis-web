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

      // 检查是否强制刷新
      const forceRefresh = ctx.query.forceRefresh === 'true';
      console.log('获取会员信息，强制刷新:', forceRefresh);

      // 获取用户会员信息
      const membershipInfo = await service.membership.getUserMembership(userId);

      // 记录会员信息
      console.log('用户会员信息:', {
        userId,
        level: membershipInfo.level,
        effectiveLevel: membershipInfo.effectiveLevel,
        expired: membershipInfo.expired,
        expiresAt: membershipInfo.expiresAt,
      });

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

      // 检查用户是否为管理员
      const user = await ctx.model.User.findByPk(userId);
      if (user && user.role === 'admin') {
        // 管理员拥有所有权限
        ctx.body = {
          success: true,
          hasAccess: true,
          feature,
          isAdmin: true,
        };
        return;
      }

      // 提取附加参数
      const params = {};

      // 根据不同功能提取相应参数
      switch (feature) {
      case 'refresh_interval':
        if (ctx.query.lastRefresh) {
          params.lastRefresh = ctx.query.lastRefresh;
        }
        break;

      case 'use_data_source':
        if (ctx.query.dataSourceCount) {
          params.dataSourceCount = parseInt(ctx.query.dataSourceCount, 10);
        }
        break;

      case 'use_indicator':
        if (ctx.query.indicator) {
          params.indicator = ctx.query.indicator;
        }
        break;

      case 'add_watchlist_item':
      case 'add_alert':
      case 'add_portfolio':
      case 'add_portfolio_item':
      case 'concurrent_requests':
        if (ctx.query.currentCount) {
          params.currentCount = parseInt(ctx.query.currentCount, 10);
        }
        break;

      case 'history_data_access':
      case 'backtest_period':
        if (ctx.query.days) {
          params.days = parseInt(ctx.query.days, 10);
        }
        break;
      }

      // 检查功能访问权限
      const hasAccess = await service.membership.checkFeatureAccess(userId, feature, params);

      ctx.body = {
        success: true,
        hasAccess,
        feature,
        params,
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
