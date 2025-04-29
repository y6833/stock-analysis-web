'use strict';

const Service = require('egg').Service;

class MembershipService extends Service {
  /**
   * 获取会员等级信息
   * @param {string} level - 会员等级
   * @return {Object} 会员等级信息
   */
  getMembershipInfo(level = 'free') {
    const membershipLevels = {
      free: {
        name: '免费用户',
        description: '基础功能，有限的数据访问',
        features: [
          '基础股票行情查询',
          '基础技术指标',
          '有限的历史数据',
          '每日刷新次数限制',
          '单一数据源',
        ],
        dataRefreshInterval: 60 * 60 * 1000, // 1小时
        maxWatchlistItems: 10,
        maxAlerts: 5,
        dataSourceLimit: 1,
      },
      basic: {
        name: '基础会员',
        description: '更多功能，更快的数据刷新',
        features: [
          '所有免费功能',
          '更多技术指标',
          '更长的历史数据',
          '更频繁的数据刷新',
          '多数据源支持',
          '更多自定义提醒',
        ],
        dataRefreshInterval: 30 * 60 * 1000, // 30分钟
        maxWatchlistItems: 30,
        maxAlerts: 20,
        dataSourceLimit: 3,
      },
      premium: {
        name: '高级会员',
        description: '全部功能，最佳体验',
        features: [
          '所有基础会员功能',
          '全部技术指标',
          '完整历史数据',
          '实时数据刷新',
          '全部数据源',
          '无限自定义提醒',
          '高级回测功能',
          '导出数据',
        ],
        dataRefreshInterval: 5 * 60 * 1000, // 5分钟
        maxWatchlistItems: 100,
        maxAlerts: 50,
        dataSourceLimit: -1, // 无限制
      },
      enterprise: {
        name: '企业版',
        description: '企业级功能，定制支持',
        features: [
          '所有高级会员功能',
          'API访问',
          '数据导出',
          '多用户管理',
          '定制功能',
          '专属支持',
        ],
        dataRefreshInterval: 1 * 60 * 1000, // 1分钟
        maxWatchlistItems: -1, // 无限制
        maxAlerts: -1, // 无限制
        dataSourceLimit: -1, // 无限制
      },
    };

    return membershipLevels[level] || membershipLevels.free;
  }

  /**
   * 获取用户会员信息
   * @param {number} userId - 用户ID
   * @return {Object} 用户会员信息
   */
  async getUserMembership(userId) {
    const { ctx } = this;
    
    // 获取用户
    const user = await ctx.model.User.findByPk(userId);
    if (!user) {
      return {
        level: 'free',
        expired: false,
        ...this.getMembershipInfo('free'),
      };
    }
    
    // 检查会员是否过期
    let expired = false;
    if (user.membership !== 'free' && user.membershipExpires) {
      expired = new Date() > new Date(user.membershipExpires);
    }
    
    // 如果已过期，降级为免费用户
    const effectiveLevel = expired ? 'free' : user.membership;
    
    return {
      level: user.membership,
      effectiveLevel,
      expired,
      expiresAt: user.membershipExpires,
      ...this.getMembershipInfo(effectiveLevel),
    };
  }
  
  /**
   * 检查用户是否有权限访问特定功能
   * @param {number} userId - 用户ID
   * @param {string} feature - 功能名称
   * @return {boolean} 是否有权限
   */
  async checkFeatureAccess(userId, feature) {
    const { ctx } = this;
    
    // 获取用户会员信息
    const membership = await this.getUserMembership(userId);
    
    // 根据功能和会员等级判断权限
    switch (feature) {
      case 'data_refresh':
        // 所有用户都可以刷新数据，但频率不同
        return true;
        
      case 'multiple_data_sources':
        // 基础会员及以上可以使用多数据源
        return ['basic', 'premium', 'enterprise'].includes(membership.effectiveLevel);
        
      case 'advanced_indicators':
        // 基础会员及以上可以使用高级指标
        return ['basic', 'premium', 'enterprise'].includes(membership.effectiveLevel);
        
      case 'export_data':
        // 高级会员及以上可以导出数据
        return ['premium', 'enterprise'].includes(membership.effectiveLevel);
        
      case 'api_access':
        // 只有企业版可以使用API
        return membership.effectiveLevel === 'enterprise';
        
      default:
        // 默认允许访问
        return true;
    }
  }
  
  /**
   * 更新用户会员等级
   * @param {number} userId - 用户ID
   * @param {string} level - 会员等级
   * @param {Date} expiresAt - 过期时间
   * @return {Object} 更新结果
   */
  async updateMembership(userId, level, expiresAt) {
    const { ctx } = this;
    
    // 验证会员等级
    const validLevels = ['free', 'basic', 'premium', 'enterprise'];
    if (!validLevels.includes(level)) {
      throw new Error(`无效的会员等级: ${level}`);
    }
    
    try {
      // 更新用户会员信息
      await ctx.model.User.update(
        {
          membership: level,
          membershipExpires: expiresAt,
        },
        {
          where: { id: userId },
        }
      );
      
      return {
        success: true,
        userId,
        level,
        expiresAt,
      };
    } catch (error) {
      ctx.logger.error('更新用户会员等级失败:', error);
      throw error;
    }
  }
}

module.exports = MembershipService;
