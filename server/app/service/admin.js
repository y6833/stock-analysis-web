'use strict';

const Service = require('egg').Service;

/**
 * 管理员服务
 * 处理管理员相关的业务逻辑
 */
class AdminService extends Service {
  /**
   * 获取所有用户列表
   * @param {Object} options - 查询选项
   * @param {number} options.page - 页码
   * @param {number} options.pageSize - 每页数量
   * @param {string} options.sortBy - 排序字段
   * @param {string} options.sortOrder - 排序方向
   * @return {Object} 用户列表和总数
   */
  async getAllUsers(options = {}) {
    const { ctx } = this;
    const { page = 1, pageSize = 20, sortBy = 'id', sortOrder = 'asc', search = '', role = '', status = '', membership = '' } = options;

    // 计算偏移量
    const offset = (page - 1) * pageSize;

    // 构建查询条件
    const where = {};

    // 添加搜索条件
    if (search) {
      where[ctx.app.Sequelize.Op.or] = [
        { username: { [ctx.app.Sequelize.Op.like]: `%${search}%` } },
        { email: { [ctx.app.Sequelize.Op.like]: `%${search}%` } },
        { nickname: { [ctx.app.Sequelize.Op.like]: `%${search}%` } },
      ];
    }

    // 添加角色筛选
    if (role) {
      where.role = role;
    }

    // 添加状态筛选
    if (status) {
      where.status = status;
    }

    const query = {
      where,
      offset,
      limit: pageSize,
      order: [[sortBy, sortOrder.toUpperCase()]],
      include: [
        {
          model: ctx.model.UserPreference,
          as: '_userPreference', // 使用正确的别名
          attributes: ['theme', 'language', 'defaultDashboardLayout'],
        },
      ],
      attributes: {
        exclude: ['password'], // 排除密码字段
      },
    };

    // 查询用户列表和总数
    const { count, rows } = await ctx.model.User.findAndCountAll(query);

    // 获取所有用户的会员信息
    const userIds = rows.map(user => user.id);
    const userMemberships = await ctx.model.UserMembership.findAll({
      where: { userId: userIds },
    });

    // 创建用户ID到会员信息的映射
    const membershipMap = {};
    const now = new Date();

    userMemberships.forEach(membership => {
      // 检查各级别会员是否有效
      const basicActive = membership.basicMembershipExpires && new Date(membership.basicMembershipExpires) > now;
      const premiumActive = membership.premiumMembershipExpires && new Date(membership.premiumMembershipExpires) > now;
      const enterpriseActive = membership.enterpriseMembershipExpires && new Date(membership.enterpriseMembershipExpires) > now;

      // 确定有效的会员级别
      let effectiveLevel = 'free';
      let expiresAt = null;

      if (enterpriseActive) {
        effectiveLevel = 'enterprise';
        expiresAt = membership.enterpriseMembershipExpires;
      } else if (premiumActive) {
        effectiveLevel = 'premium';
        expiresAt = membership.premiumMembershipExpires;
      } else if (basicActive) {
        effectiveLevel = 'basic';
        expiresAt = membership.basicMembershipExpires;
      }

      membershipMap[membership.userId] = {
        level: effectiveLevel,
        expiresAt,
        coins: membership.coins,
        basicMembershipExpires: membership.basicMembershipExpires,
        premiumMembershipExpires: membership.premiumMembershipExpires,
        enterpriseMembershipExpires: membership.enterpriseMembershipExpires,
      };
    });

    // 将会员信息添加到用户数据中
    const usersWithMembership = rows.map(user => {
      const userData = user.toJSON();
      userData.membership = membershipMap[user.id]?.level || 'free';
      userData.membershipExpires = membershipMap[user.id]?.expiresAt || null;
      userData.coins = membershipMap[user.id]?.coins || 0;
      userData.membershipInfo = membershipMap[user.id] || {
        level: 'free',
        expiresAt: null,
        coins: 0,
      };
      return userData;
    });

    // 如果有会员级别筛选，过滤结果
    let filteredUsers = usersWithMembership;
    if (membership) {
      filteredUsers = usersWithMembership.filter(user => user.membership === membership);
    }

    return {
      users: filteredUsers,
      total: filteredUsers.length === usersWithMembership.length ? count : filteredUsers.length,
    };
  }

  /**
   * 获取用户详情
   * @param {number} userId - 用户ID
   * @return {Object} 用户详情
   */
  async getUserDetail(userId) {
    const { ctx } = this;

    // 查询用户详情
    const user = await ctx.model.User.findByPk(userId, {
      include: [
        {
          model: ctx.model.UserPreference,
          as: '_userPreference', // 使用正确的别名
          attributes: ['theme', 'language', 'defaultDashboardLayout', 'emailNotifications', 'pushNotifications'],
        },
        {
          model: ctx.model.UserWatchlist,
          as: '_userWatchlists', // 使用正确的别名
          attributes: ['id', 'name', 'description', 'isDefault'],
        },
        {
          model: ctx.model.UserPortfolio,
          as: '_userPortfolios', // 使用正确的别名
          attributes: ['id', 'name', 'description', 'initialCapital', 'currentValue'],
        },
        {
          model: ctx.model.UserAlert,
          as: '_userAlerts', // 使用正确的别名
          attributes: ['id', 'stockCode', 'condition', 'value', 'isActive'],
        },
      ],
      attributes: {
        exclude: ['password'], // 排除密码字段
      },
    });

    if (!user) {
      return null;
    }

    // 获取用户会员信息
    const membershipInfo = await this.service.membership.getUserMembership(userId);

    // 合并用户信息和会员信息
    return {
      ...user.toJSON(),
      membership: membershipInfo,
    };
  }

  /**
   * 更新用户信息
   * @param {number} userId - 用户ID
   * @param {Object} updateData - 更新数据
   * @return {Object} 更新结果
   */
  async updateUser(userId, updateData) {
    const { ctx } = this;

    // 查询用户
    const user = await ctx.model.User.findByPk(userId);

    if (!user) {
      return {
        success: false,
        message: '用户不存在',
      };
    }

    // 提取可更新的字段
    const {
      nickname,
      email,
      role,
      membership,
      membershipExpires,
      status,
    } = updateData;

    // 构建更新数据
    const updateFields = {};

    if (nickname !== undefined) updateFields.nickname = nickname;
    if (email !== undefined) updateFields.email = email;
    if (role !== undefined) {
      // 验证角色值
      if (!['user', 'premium', 'admin'].includes(role)) {
        return {
          success: false,
          message: '无效的角色值',
        };
      }
      updateFields.role = role;
    }
    if (membership !== undefined) {
      // 验证会员等级
      if (!['free', 'basic', 'premium', 'enterprise'].includes(membership)) {
        return {
          success: false,
          message: '无效的会员等级',
        };
      }
      updateFields.membership = membership;
    }
    if (membershipExpires !== undefined) {
      updateFields.membershipExpires = membershipExpires ? new Date(membershipExpires) : null;
    }
    if (status !== undefined) {
      // 验证状态值
      if (!['active', 'inactive', 'suspended'].includes(status)) {
        return {
          success: false,
          message: '无效的状态值',
        };
      }
      updateFields.status = status;
    }

    // 更新用户信息
    await user.update(updateFields);

    // 返回更新后的用户信息（不包含密码）
    const updatedUser = user.toJSON();
    delete updatedUser.password;

    return {
      success: true,
      user: updatedUser,
    };
  }

  /**
   * 更新用户状态
   * @param {number} userId - 用户ID
   * @param {string} status - 状态值
   * @return {Object} 更新结果
   */
  async updateUserStatus(userId, status) {
    const { ctx } = this;

    // 查询用户
    const user = await ctx.model.User.findByPk(userId);

    if (!user) {
      return {
        success: false,
        message: '用户不存在',
      };
    }

    // 不允许禁用自己
    if (user.id === ctx.user.id && status !== 'active') {
      return {
        success: false,
        message: '不能禁用当前登录的管理员账户',
      };
    }

    // 更新用户状态
    await user.update({ status });

    return {
      success: true,
      status,
    };
  }

  /**
   * 获取系统统计信息
   * @return {Object} 系统统计信息
   */
  async getSystemStats() {
    const { ctx } = this;

    // 用户统计
    const userCount = await ctx.model.User.count();
    const adminCount = await ctx.model.User.count({ where: { role: 'admin' } });
    const premiumCount = await ctx.model.User.count({ where: { role: 'premium' } });
    const activeUserCount = await ctx.model.User.count({ where: { status: 'active' } });

    // 会员统计
    // 使用 user_memberships 表获取会员统计信息
    const now = new Date();

    // 获取所有用户会员记录
    const userMemberships = await ctx.model.UserMembership.findAll();

    // 初始化计数器
    let freeCount = 0;
    let basicCount = 0;
    let premiumMemberCount = 0;
    let enterpriseCount = 0;

    // 遍历所有用户会员记录，统计各级别会员数量
    for (const membership of userMemberships) {
      // 检查各级别会员是否有效
      const basicActive = membership.basicMembershipExpires && new Date(membership.basicMembershipExpires) > now;
      const premiumActive = membership.premiumMembershipExpires && new Date(membership.premiumMembershipExpires) > now;
      const enterpriseActive = membership.enterpriseMembershipExpires && new Date(membership.enterpriseMembershipExpires) > now;

      // 根据优先级确定用户的有效会员级别
      if (enterpriseActive) {
        enterpriseCount++;
      } else if (premiumActive) {
        premiumMemberCount++;
      } else if (basicActive) {
        basicCount++;
      } else {
        freeCount++;
      }
    }

    // 如果没有会员记录的用户也算作免费用户
    freeCount += userCount - userMemberships.length;

    // 数据统计
    const watchlistCount = await ctx.model.UserWatchlist.count();
    const portfolioCount = await ctx.model.UserPortfolio.count();
    const alertCount = await ctx.model.UserAlert.count();

    // 充值统计
    const rechargeRequestCount = await ctx.model.CoinRechargeRequest.count();
    const pendingRechargeCount = await ctx.model.CoinRechargeRequest.count({ where: { status: 'pending' } });
    const completedRechargeCount = await ctx.model.CoinRechargeRequest.count({ where: { status: 'completed' } });
    const rejectedRechargeCount = await ctx.model.CoinRechargeRequest.count({ where: { status: 'rejected' } });

    // 计算总充值金额
    const completedRecharges = await ctx.model.CoinRechargeRequest.findAll({
      where: { status: 'completed' },
      attributes: ['paymentAmount']
    });
    const totalRechargeAmount = completedRecharges.reduce((sum, req) => sum + (req.paymentAmount || 0), 0);

    // 计算总逗币数量
    const totalCoins = userMemberships.reduce((sum, membership) => sum + (membership.coins || 0), 0);

    // 最近注册的用户
    const recentUsers = await ctx.model.User.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'username', 'email', 'role', 'status', 'createdAt'],
    });

    // 最近登录的用户
    const recentLogins = await ctx.model.User.findAll({
      where: { lastLogin: { [ctx.app.Sequelize.Op.ne]: null } },
      order: [['lastLogin', 'DESC']],
      limit: 5,
      attributes: ['id', 'username', 'email', 'role', 'status', 'lastLogin'],
    });

    return {
      userStats: {
        total: userCount,
        active: activeUserCount,
        admin: adminCount,
        premium: premiumCount,
      },
      membershipStats: {
        free: freeCount,
        basic: basicCount,
        premium: premiumMemberCount,
        enterprise: enterpriseCount,
        totalCoins: totalCoins,
      },
      dataStats: {
        watchlists: watchlistCount,
        portfolios: portfolioCount,
        alerts: alertCount,
      },
      rechargeStats: {
        total: rechargeRequestCount,
        pending: pendingRechargeCount,
        completed: completedRechargeCount,
        rejected: rejectedRechargeCount,
        totalAmount: totalRechargeAmount,
      },
      recentUsers,
      recentLogins,
    };
  }
}

module.exports = AdminService;
