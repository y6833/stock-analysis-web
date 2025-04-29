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
    const { page = 1, pageSize = 20, sortBy = 'id', sortOrder = 'asc' } = options;
    
    // 计算偏移量
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    const query = {
      offset,
      limit: pageSize,
      order: [[sortBy, sortOrder.toUpperCase()]],
      include: [
        {
          model: ctx.model.UserPreference,
          attributes: ['theme', 'language', 'defaultDashboardLayout'],
        },
      ],
      attributes: {
        exclude: ['password'], // 排除密码字段
      },
    };
    
    // 查询用户列表和总数
    const { count, rows } = await ctx.model.User.findAndCountAll(query);
    
    return {
      users: rows,
      total: count,
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
          attributes: ['theme', 'language', 'defaultDashboardLayout', 'emailNotifications', 'pushNotifications'],
        },
        {
          model: ctx.model.UserWatchlist,
          attributes: ['id', 'name', 'description', 'isDefault'],
        },
        {
          model: ctx.model.UserPortfolio,
          attributes: ['id', 'name', 'description', 'initialCapital', 'currentValue'],
        },
        {
          model: ctx.model.UserAlert,
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
    const freeCount = await ctx.model.User.count({ where: { membership: 'free' } });
    const basicCount = await ctx.model.User.count({ where: { membership: 'basic' } });
    const premiumMemberCount = await ctx.model.User.count({ where: { membership: 'premium' } });
    const enterpriseCount = await ctx.model.User.count({ where: { membership: 'enterprise' } });
    
    // 数据统计
    const watchlistCount = await ctx.model.UserWatchlist.count();
    const portfolioCount = await ctx.model.UserPortfolio.count();
    const alertCount = await ctx.model.UserAlert.count();
    
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
      },
      dataStats: {
        watchlists: watchlistCount,
        portfolios: portfolioCount,
        alerts: alertCount,
      },
      recentUsers,
      recentLogins,
    };
  }
}

module.exports = AdminService;
