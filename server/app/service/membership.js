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
          '基础技术指标 (MA、MACD)',
          '最近7天历史数据',
          '每日刷新次数限制',
          '单一数据源',
          '最多10支股票关注',
          '最多5个条件提醒',
          '基础K线图表',
        ],
        dataRefreshInterval: 60 * 60 * 1000, // 1小时
        maxWatchlistItems: 10,
        maxAlerts: 5,
        dataSourceLimit: 1,
        maxPortfolios: 1,
        maxPortfolioItems: 5,
        maxHistoryDays: 7,
        maxBacktestPeriod: 30, // 30天
        allowedIndicators: ['MA', 'MACD', 'VOL'], // 允许的技术指标
        allowExport: false,
        allowBatchOperations: false,
        allowCustomDashboard: false,
        allowAdvancedCharts: false,
        maxConcurrentRequests: 2,
      },
      basic: {
        name: '基础会员',
        description: '更多功能，更快的数据刷新',
        features: [
          '所有免费功能',
          '更多技术指标 (KDJ、RSI、BOLL等)',
          '最近30天历史数据',
          '30分钟数据刷新',
          '最多3个数据源',
          '最多30支股票关注',
          '最多20个条件提醒',
          '2个自定义投资组合',
          '基础回测功能',
          '自定义看板',
        ],
        dataRefreshInterval: 30 * 60 * 1000, // 30分钟
        maxWatchlistItems: 30,
        maxAlerts: 20,
        dataSourceLimit: 3,
        maxPortfolios: 2,
        maxPortfolioItems: 20,
        maxHistoryDays: 30,
        maxBacktestPeriod: 180, // 180天
        allowedIndicators: ['MA', 'MACD', 'VOL', 'KDJ', 'RSI', 'BOLL', 'WR', 'DMI'], // 允许的技术指标
        allowExport: false,
        allowBatchOperations: true,
        allowCustomDashboard: true,
        allowAdvancedCharts: false,
        maxConcurrentRequests: 5,
      },
      premium: {
        name: '高级会员',
        description: '全部功能，最佳体验',
        features: [
          '所有基础会员功能',
          '全部技术指标',
          '完整历史数据',
          '5分钟数据刷新',
          '全部数据源',
          '无限自定义提醒',
          '高级回测功能',
          '导出数据',
          '批量操作',
          '高级图表',
          '无限投资组合',
          '市场扫描器',
        ],
        dataRefreshInterval: 5 * 60 * 1000, // 5分钟
        maxWatchlistItems: 100,
        maxAlerts: 50,
        dataSourceLimit: -1, // 无限制
        maxPortfolios: 5,
        maxPortfolioItems: 100,
        maxHistoryDays: 365,
        maxBacktestPeriod: 1095, // 3年
        allowedIndicators: [], // 空数组表示无限制
        allowExport: true,
        allowBatchOperations: true,
        allowCustomDashboard: true,
        allowAdvancedCharts: true,
        maxConcurrentRequests: 10,
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
          '无限制使用',
          '优先数据更新',
          '专业策略定制',
          '团队协作功能',
        ],
        dataRefreshInterval: 1 * 60 * 1000, // 1分钟
        maxWatchlistItems: -1, // 无限制
        maxAlerts: -1, // 无限制
        dataSourceLimit: -1, // 无限制
        maxPortfolios: -1, // 无限制
        maxPortfolioItems: -1, // 无限制
        maxHistoryDays: -1, // 无限制
        maxBacktestPeriod: -1, // 无限制
        allowedIndicators: [], // 空数组表示无限制
        allowExport: true,
        allowBatchOperations: true,
        allowCustomDashboard: true,
        allowAdvancedCharts: true,
        maxConcurrentRequests: -1, // 无限制
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

    // 获取用户会员信息
    let userMembership = null;

    try {
      userMembership = await ctx.model.UserMembership.findOne({
        where: { userId }
      });

      // 如果没有会员记录，创建一个
      if (!userMembership) {
        userMembership = await ctx.model.UserMembership.create({
          userId,
          coins: user.coins || 10, // 使用用户表中的逗币数量，如果没有则默认为10
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // 兼容旧数据，将用户表中的会员信息迁移到新表
        if (user.membership !== 'free' && user.membershipExpires) {
          const expiresAt = new Date(user.membershipExpires);
          const now = new Date();

          // 只有未过期的会员才迁移
          if (expiresAt > now) {
            const updateData = {};
            updateData[`${user.membership}MembershipExpires`] = expiresAt;
            await userMembership.update(updateData);
          }
        }
      }
    } catch (error) {
      // 如果 user_memberships 表不存在，使用用户表中的会员信息
      console.error('获取用户会员信息失败，使用用户表中的会员信息:', error);

      // 创建一个临时的会员信息对象
      userMembership = {
        coins: user.coins || 10,
        basicMembershipExpires: user.basicMembershipExpires || null,
        premiumMembershipExpires: user.premiumMembershipExpires || null,
        enterpriseMembershipExpires: user.enterpriseMembershipExpires || null,
      };
    }

    const now = new Date();

    // 检查各级别会员是否过期
    const membershipStatus = {
      basic: {
        active: userMembership.basicMembershipExpires && new Date(userMembership.basicMembershipExpires) > now,
        expiresAt: userMembership.basicMembershipExpires,
      },
      premium: {
        active: userMembership.premiumMembershipExpires && new Date(userMembership.premiumMembershipExpires) > now,
        expiresAt: userMembership.premiumMembershipExpires,
      },
      enterprise: {
        active: userMembership.enterpriseMembershipExpires && new Date(userMembership.enterpriseMembershipExpires) > now,
        expiresAt: userMembership.enterpriseMembershipExpires,
      },
    };

    // 确定有效的会员级别
    let effectiveLevel = 'free';
    let expiresAt = null;

    // 按优先级检查会员级别（企业 > 高级 > 基础）
    if (membershipStatus.enterprise.active) {
      effectiveLevel = 'enterprise';
      expiresAt = membershipStatus.enterprise.expiresAt;
    } else if (membershipStatus.premium.active) {
      effectiveLevel = 'premium';
      expiresAt = membershipStatus.premium.expiresAt;
    } else if (membershipStatus.basic.active) {
      effectiveLevel = 'basic';
      expiresAt = membershipStatus.basic.expiresAt;
    }

    // 检查是否需要处理会员级别转换
    // 如果高级会员刚刚过期，且普通会员有效，需要更新普通会员的过期时间
    const premiumExpired = membershipStatus.premium.expiresAt &&
      new Date(membershipStatus.premium.expiresAt) <= now &&
      new Date(membershipStatus.premium.expiresAt) > new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1天内过期

    if (premiumExpired && membershipStatus.basic.active) {
      console.log('高级会员刚刚过期，检查是否需要更新普通会员过期时间');

      // 如果是使用新表，直接使用已经调整过的普通会员过期时间
      if (userMembership && userMembership.basicMembershipExpires) {
        console.log('使用新表中的普通会员过期时间');
      }
      // 如果是使用旧表，且有basicMembershipExpires字段，使用它
      else if (user.basicMembershipExpires) {
        console.log('使用旧表中的basicMembershipExpires字段');
        membershipStatus.basic.expiresAt = user.basicMembershipExpires;

        // 更新有效会员级别
        effectiveLevel = 'basic';
        expiresAt = membershipStatus.basic.expiresAt;
      }
    }

    // 记录会员状态
    console.log('会员状态:', {
      userId,
      coins: userMembership.coins,
      basic: membershipStatus.basic,
      premium: membershipStatus.premium,
      enterprise: membershipStatus.enterprise,
      effectiveLevel,
      expiresAt,
    });

    return {
      level: effectiveLevel, // 当前有效的会员级别
      effectiveLevel, // 当前有效的会员级别（与level保持一致，为了向后兼容）
      expired: effectiveLevel === 'free',
      expiresAt, // 当前有效会员的过期时间
      membershipStatus, // 各级别会员的状态
      coins: userMembership.coins, // 用户逗币数量
      ...this.getMembershipInfo(effectiveLevel),
    };
  }

  /**
   * 检查用户是否有权限访问特定功能
   * @param {number} userId - 用户ID
   * @param {string} feature - 功能名称
   * @param {Object} params - 附加参数
   * @return {boolean} 是否有权限
   */
  async checkFeatureAccess(userId, feature, params = {}) {
    const { ctx } = this;

    // 获取用户信息
    const user = await ctx.model.User.findByPk(userId);
    if (!user) {
      return false;
    }

    // 管理员拥有所有权限
    if (user.role === 'admin') {
      return true;
    }

    // 获取用户会员信息
    const membership = await this.getUserMembership(userId);

    // 根据功能和会员等级判断权限
    switch (feature) {
      // 数据刷新相关
      case 'data_refresh':
        // 所有用户都可以刷新数据，但频率不同
        return true;

      case 'refresh_interval':
        // 检查是否满足刷新间隔要求
        const lastRefresh = params.lastRefresh ? new Date(params.lastRefresh) : null;
        if (!lastRefresh) return true;

        const now = new Date();
        const diffMs = now.getTime() - lastRefresh.getTime();
        return diffMs >= membership.dataRefreshInterval;

      // 数据源相关
      case 'multiple_data_sources':
        // 基础会员及以上可以使用多数据源
        return ['basic', 'premium', 'enterprise'].includes(membership.effectiveLevel);

      case 'use_data_source':
        // 检查是否可以使用指定的数据源
        if (membership.dataSourceLimit === -1) return true;
        if (!params.dataSourceCount) return true;
        return params.dataSourceCount <= membership.dataSourceLimit;

      // 技术指标相关
      case 'advanced_indicators':
        // 基础会员及以上可以使用高级指标
        return ['basic', 'premium', 'enterprise'].includes(membership.effectiveLevel);

      case 'use_indicator':
        // 检查是否可以使用指定的技术指标
        const indicator = params.indicator;
        if (!indicator) return true;

        // 空数组表示无限制
        if (membership.allowedIndicators.length === 0) return true;

        return membership.allowedIndicators.includes(indicator);

      // 数据导出相关
      case 'export_data':
        // 高级会员及以上可以导出数据
        return membership.allowExport;

      // API访问相关
      case 'api_access':
        // 只有企业版可以使用API
        return membership.effectiveLevel === 'enterprise';

      // 关注列表相关
      case 'add_watchlist_item':
        // 检查是否超过关注股票数量限制
        if (membership.maxWatchlistItems === -1) return true;
        if (!params.currentCount) return true;
        return params.currentCount < membership.maxWatchlistItems;

      // 提醒相关
      case 'add_alert':
        // 检查是否超过提醒数量限制
        if (membership.maxAlerts === -1) return true;
        if (!params.currentCount) return true;
        return params.currentCount < membership.maxAlerts;

      // 投资组合相关
      case 'add_portfolio':
        // 检查是否超过投资组合数量限制
        if (membership.maxPortfolios === -1) return true;
        if (!params.currentCount) return true;
        return params.currentCount < membership.maxPortfolios;

      case 'add_portfolio_item':
        // 检查是否超过投资组合股票数量限制
        if (membership.maxPortfolioItems === -1) return true;
        if (!params.currentCount) return true;
        return params.currentCount < membership.maxPortfolioItems;

      // 历史数据相关
      case 'history_data_access':
        // 检查是否可以访问指定天数的历史数据
        if (membership.maxHistoryDays === -1) return true;
        if (!params.days) return true;
        return params.days <= membership.maxHistoryDays;

      // 回测相关
      case 'backtest_period':
        // 检查是否可以进行指定时间段的回测
        if (membership.maxBacktestPeriod === -1) return true;
        if (!params.days) return true;
        return params.days <= membership.maxBacktestPeriod;

      // 批量操作相关
      case 'batch_operations':
        return membership.allowBatchOperations;

      // 自定义看板相关
      case 'custom_dashboard':
        return membership.allowCustomDashboard;

      // 高级图表相关
      case 'advanced_charts':
        return membership.allowAdvancedCharts;

      // 并发请求相关
      case 'concurrent_requests':
        if (membership.maxConcurrentRequests === -1) return true;
        if (!params.currentCount) return true;
        return params.currentCount <= membership.maxConcurrentRequests;

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
      // 获取用户会员信息
      let userMembership = await ctx.model.UserMembership.findOne({
        where: { userId }
      });

      // 如果没有会员记录，创建一个
      if (!userMembership) {
        // 获取用户信息
        const user = await ctx.model.User.findByPk(userId);
        if (!user) {
          throw new Error(`用户不存在: ${userId}`);
        }

        userMembership = await ctx.model.UserMembership.create({
          userId,
          coins: user.coins || 10, // 使用用户表中的逗币数量，如果没有则默认为10
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // 准备更新数据
      const updateData = {};

      // 根据会员等级设置过期时间
      if (level === 'free') {
        // 免费用户，清除所有会员过期时间
        updateData.basicMembershipExpires = null;
        updateData.premiumMembershipExpires = null;
        updateData.enterpriseMembershipExpires = null;
      } else {
        // 设置对应级别的会员过期时间
        const expiresFieldName = `${level}MembershipExpires`;
        updateData[expiresFieldName] = expiresAt;
      }

      // 更新用户会员信息
      await userMembership.update(updateData);

      // 获取更新后的会员状态
      const membershipInfo = await this.getUserMembership(userId);

      return {
        success: true,
        userId,
        level,
        expiresAt,
        effectiveLevel: membershipInfo.effectiveLevel,
        membershipStatus: membershipInfo.membershipStatus,
      };
    } catch (error) {
      ctx.logger.error('更新用户会员等级失败:', error);

      // 尝试使用旧表更新
      try {
        // 获取用户
        const user = await ctx.model.User.findByPk(userId);
        if (!user) {
          throw new Error(`用户不存在: ${userId}`);
        }

        // 更新用户会员信息
        await user.update({
          membership: level,
          membershipExpires: expiresAt,
        });

        return {
          success: true,
          userId,
          level,
          expiresAt,
          usingLegacyTable: true,
        };
      } catch (legacyError) {
        ctx.logger.error('使用旧表更新用户会员等级也失败:', legacyError);
        throw error; // 抛出原始错误
      }
    }
  }
}

module.exports = MembershipService;
