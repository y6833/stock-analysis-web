'use strict';

const Service = require('egg').Service;

/**
 * 逗币服务
 */
class CoinsService extends Service {
  /**
   * 获取用户逗币余额
   * @param {number} userId - 用户ID
   * @return {number} 逗币余额
   */
  async getUserCoins(userId) {
    const { ctx } = this;

    // 获取用户
    const user = await ctx.model.User.findByPk(userId);
    if (!user) {
      throw new Error(`用户不存在: ${userId}`);
    }

    try {
      // 获取用户会员信息
      let userMembership = await ctx.model.UserMembership.findOne({
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
      }

      return userMembership.coins || 0;
    } catch (error) {
      // 如果 user_memberships 表不存在，使用用户表中的逗币数量
      console.error('获取用户会员信息失败，使用用户表中的逗币数量:', error);
      return user.coins || 0;
    }
  }

  /**
   * 增加用户逗币
   * @param {number} userId - 用户ID
   * @param {number} amount - 增加的逗币数量
   * @param {string} reason - 增加原因
   * @return {Object} 操作结果
   */
  async addCoins(userId, amount, reason) {
    const { ctx } = this;

    if (amount <= 0) {
      throw new Error('增加的逗币数量必须大于0');
    }

    // 获取用户
    const user = await ctx.model.User.findByPk(userId);
    if (!user) {
      throw new Error(`用户不存在: ${userId}`);
    }

    // 开启事务
    const transaction = await ctx.model.transaction();

    try {
      let previousBalance = 0;
      let newBalance = 0;

      try {
        // 获取用户会员信息
        let userMembership = await ctx.model.UserMembership.findOne({
          where: { userId },
          transaction,
        });

        // 如果没有会员记录，创建一个
        if (!userMembership) {
          userMembership = await ctx.model.UserMembership.create({
            userId,
            coins: user.coins || 10, // 使用用户表中的逗币数量，如果没有则默认为10
            createdAt: new Date(),
            updatedAt: new Date(),
          }, { transaction });
        }

        // 更新用户逗币余额
        previousBalance = userMembership.coins;
        newBalance = previousBalance + amount;
        await userMembership.update({ coins: newBalance }, { transaction });
      } catch (error) {
        // 如果 user_memberships 表不存在，使用用户表中的逗币数量
        console.error('获取用户会员信息失败，使用用户表中的逗币数量:', error);

        // 更新用户逗币余额
        previousBalance = user.coins || 0;
        newBalance = previousBalance + amount;
        await user.update({ coins: newBalance }, { transaction });
      }

      // 记录逗币变动日志
      await ctx.model.CoinTransaction.create({
        userId,
        type: 'add',
        amount,
        balance: newBalance,
        reason,
        details: {
          previousBalance,
          timestamp: new Date(),
        },
      }, { transaction });

      // 提交事务
      await transaction.commit();

      return {
        success: true,
        userId,
        previousBalance,
        amount,
        newBalance,
        reason,
        timestamp: new Date(),
      };
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      ctx.logger.error('增加用户逗币失败:', error);
      throw error;
    }
  }

  /**
   * 减少用户逗币
   * @param {number} userId - 用户ID
   * @param {number} amount - 减少的逗币数量
   * @param {string} reason - 减少原因
   * @return {Object} 操作结果
   */
  async deductCoins(userId, amount, reason) {
    const { ctx } = this;

    if (amount <= 0) {
      throw new Error('减少的逗币数量必须大于0');
    }

    // 获取用户
    const user = await ctx.model.User.findByPk(userId);
    if (!user) {
      throw new Error(`用户不存在: ${userId}`);
    }

    // 开启事务
    const transaction = await ctx.model.transaction();

    try {
      let previousBalance = 0;
      let newBalance = 0;

      try {
        // 获取用户会员信息
        let userMembership = await ctx.model.UserMembership.findOne({
          where: { userId },
          transaction,
        });

        // 如果没有会员记录，创建一个
        if (!userMembership) {
          userMembership = await ctx.model.UserMembership.create({
            userId,
            coins: user.coins || 10, // 使用用户表中的逗币数量，如果没有则默认为10
            createdAt: new Date(),
            updatedAt: new Date(),
          }, { transaction });
        }

        // 检查余额是否足够
        if (userMembership.coins < amount) {
          throw new Error(`逗币余额不足: 当前${userMembership.coins}, 需要${amount}`);
        }

        // 更新用户逗币余额
        previousBalance = userMembership.coins;
        newBalance = previousBalance - amount;
        await userMembership.update({ coins: newBalance }, { transaction });
      } catch (error) {
        // 如果是余额不足的错误，直接抛出
        if (error.message && error.message.includes('逗币余额不足')) {
          throw error;
        }

        // 如果 user_memberships 表不存在，使用用户表中的逗币数量
        console.error('获取用户会员信息失败，使用用户表中的逗币数量:', error);

        // 检查余额是否足够
        if (user.coins < amount) {
          throw new Error(`逗币余额不足: 当前${user.coins}, 需要${amount}`);
        }

        // 更新用户逗币余额
        previousBalance = user.coins || 0;
        newBalance = previousBalance - amount;
        await user.update({ coins: newBalance }, { transaction });
      }

      // 记录逗币变动日志
      await ctx.model.CoinTransaction.create({
        userId,
        type: 'deduct',
        amount,
        balance: newBalance,
        reason,
        details: {
          previousBalance,
          timestamp: new Date(),
        },
      }, { transaction });

      // 提交事务
      await transaction.commit();

      return {
        success: true,
        userId,
        previousBalance,
        amount,
        newBalance,
        reason,
        timestamp: new Date(),
      };
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      ctx.logger.error('减少用户逗币失败:', error);
      throw error;
    }
  }

  /**
   * 使用逗币兑换会员
   * @param {number} userId - 用户ID
   * @param {string} level - 会员等级 (basic 或 premium)
   * @param {number} days - 兑换天数
   * @return {Object} 兑换结果
   */
  /**
   * 获取用户逗币交易记录
   * @param {number} userId - 用户ID
   * @param {Object} options - 查询选项
   * @param {number} options.page - 页码
   * @param {number} options.pageSize - 每页记录数
   * @param {string} options.type - 交易类型 (add, deduct, exchange)
   * @param {string} options.startDate - 开始日期
   * @param {string} options.endDate - 结束日期
   * @return {Object} 交易记录列表和分页信息
   */
  async getTransactions(userId, options = {}) {
    const { ctx } = this;

    // 默认查询选项
    const page = options.page || 1;
    const pageSize = options.pageSize || 10;
    const type = options.type || null;
    const startDate = options.startDate ? new Date(options.startDate) : null;
    const endDate = options.endDate ? new Date(options.endDate) : null;

    // 构建查询条件
    const where = { userId };

    if (type) {
      where.type = type;
    }

    if (startDate && endDate) {
      where.createdAt = {
        [ctx.app.Sequelize.Op.between]: [startDate, endDate],
      };
    } else if (startDate) {
      where.createdAt = {
        [ctx.app.Sequelize.Op.gte]: startDate,
      };
    } else if (endDate) {
      where.createdAt = {
        [ctx.app.Sequelize.Op.lte]: endDate,
      };
    }

    // 查询总记录数
    const total = await ctx.model.CoinTransaction.count({ where });

    // 查询交易记录
    const transactions = await ctx.model.CoinTransaction.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return {
      transactions,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async exchangeMembership(userId, level, days) {
    const { ctx } = this;

    // 验证会员等级
    if (!['basic', 'premium'].includes(level)) {
      throw new Error(`无效的会员等级: ${level}`);
    }

    if (days <= 0) {
      throw new Error('兑换天数必须大于0');
    }

    // 计算所需逗币
    let coinsNeeded;
    if (level === 'basic') {
      // 1逗币 = 3天普通会员
      coinsNeeded = Math.ceil(days / 3);
    } else {
      // 1逗币 = 1天高级会员
      coinsNeeded = days;
    }

    // 获取用户
    const user = await ctx.model.User.findByPk(userId);
    if (!user) {
      throw new Error(`用户不存在: ${userId}`);
    }

    // 开启事务
    const transaction = await ctx.model.transaction();

    try {
      const now = new Date();
      let expiresAt;
      let previousCoins = 0;
      let newCoins = 0;
      let useUserMembership = true;

      try {
        // 获取用户会员信息
        let userMembership = await ctx.model.UserMembership.findOne({
          where: { userId },
          transaction,
        });

        // 如果没有会员记录，创建一个
        if (!userMembership) {
          userMembership = await ctx.model.UserMembership.create({
            userId,
            coins: user.coins || 10, // 使用用户表中的逗币数量，如果没有则默认为10
            createdAt: new Date(),
            updatedAt: new Date(),
          }, { transaction });
        }

        // 检查余额是否足够
        if (userMembership.coins < coinsNeeded) {
          throw new Error(`逗币余额不足: 当前${userMembership.coins}, 需要${coinsNeeded}`);
        }

        // 获取对应级别的会员过期时间字段名
        const expiresFieldName = `${level}MembershipExpires`;

        // 计算新的过期时间
        // 如果用户已经有该级别会员且未过期，则在原有基础上延长
        if (userMembership[expiresFieldName] && new Date(userMembership[expiresFieldName]) > now) {
          console.log(`用户${level}会员未过期，在原有基础上延长`);
          expiresAt = new Date(userMembership[expiresFieldName]);
          expiresAt.setDate(expiresAt.getDate() + days);
          console.log(`原${level}过期时间:`, userMembership[expiresFieldName]);
          console.log(`新${level}过期时间:`, expiresAt);
        } else {
          // 否则从当前时间开始计算
          console.log(`用户${level}会员已过期或没有会员，从当前时间开始计算`);
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + days);
          console.log('当前时间:', now);
          console.log(`新${level}过期时间:`, expiresAt);
        }

        // 处理会员级别转换逻辑
        // 当购买高级会员时，同时延长普通会员的有效期
        if (level === 'premium' && userMembership.basicMembershipExpires) {
          // 检查普通会员是否有效
          const basicActive = new Date(userMembership.basicMembershipExpires) > now;

          if (basicActive) {
            // 如果普通会员有效，延长相同的天数
            const basicExpiresAt = new Date(userMembership.basicMembershipExpires);
            basicExpiresAt.setDate(basicExpiresAt.getDate() + days);
            console.log(`原普通会员过期时间:`, userMembership.basicMembershipExpires);
            console.log(`新普通会员过期时间:`, basicExpiresAt);
            console.log(`延长天数: ${days}天`);

            // 更新普通会员过期时间
            userMembership.basicMembershipExpires = basicExpiresAt;
          }
        }

        // 记录当前的会员状态，用于后续处理
        console.log('当前会员状态:', {
          premium: {
            active: userMembership.premiumMembershipExpires && new Date(userMembership.premiumMembershipExpires) > now,
            expiresAt: userMembership.premiumMembershipExpires,
          },
          basic: {
            active: userMembership.basicMembershipExpires && new Date(userMembership.basicMembershipExpires) > now,
            expiresAt: userMembership.basicMembershipExpires,
          },
        });

        // 准备更新数据
        const updateData = {
          coins: userMembership.coins - coinsNeeded,
        };

        // 更新对应级别的会员过期时间
        updateData[expiresFieldName] = expiresAt;

        // 如果调整了普通会员过期时间，也需要更新
        if (level === 'premium' && userMembership.basicMembershipExpires) {
          updateData.basicMembershipExpires = userMembership.basicMembershipExpires;
        }

        console.log('更新用户会员信息:', updateData);

        // 更新用户会员信息
        await userMembership.update(updateData, { transaction });

        previousCoins = userMembership.coins;
        newCoins = userMembership.coins - coinsNeeded;
      } catch (error) {
        // 如果是余额不足的错误，直接抛出
        if (error.message && error.message.includes('逗币余额不足')) {
          throw error;
        }

        // 如果 user_memberships 表不存在，使用用户表中的会员信息
        console.error('获取用户会员信息失败，使用用户表中的会员信息:', error);
        useUserMembership = false;

        // 检查余额是否足够
        if (user.coins < coinsNeeded) {
          throw new Error(`逗币余额不足: 当前${user.coins}, 需要${coinsNeeded}`);
        }

        // 计算新的过期时间
        // 如果用户已经有该级别会员且未过期，则在原有基础上延长
        if (user.membership === level && user.membershipExpires && new Date(user.membershipExpires) > now) {
          console.log(`用户${level}会员未过期，在原有基础上延长`);
          expiresAt = new Date(user.membershipExpires);
          expiresAt.setDate(expiresAt.getDate() + days);
          console.log(`原${level}过期时间:`, user.membershipExpires);
          console.log(`新${level}过期时间:`, expiresAt);
        } else {
          // 否则从当前时间开始计算
          console.log(`用户${level}会员已过期或没有会员，从当前时间开始计算`);
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + days);
          console.log('当前时间:', now);
          console.log(`新${level}过期时间:`, expiresAt);
        }

        // 处理会员级别转换逻辑
        // 当购买高级会员时，同时延长普通会员的有效期
        if (level === 'premium' && user.membership === 'basic' && user.membershipExpires && new Date(user.membershipExpires) > now) {
          // 保存原普通会员过期时间，用于后续处理
          const basicExpiresAt = new Date(user.membershipExpires);
          basicExpiresAt.setDate(basicExpiresAt.getDate() + days); // 延长相同的天数
          console.log(`原普通会员过期时间:`, user.membershipExpires);
          console.log(`新普通会员过期时间:`, basicExpiresAt);
          console.log(`延长天数: ${days}天`);

          // 在用户表中，我们只能设置一个会员级别和过期时间
          // 所以我们先设置为高级会员，等高级会员过期后，系统会自动检查并恢复为普通会员
          // 这里我们可以在用户表的其他字段中存储调整后的普通会员过期时间
          if (user.basicMembershipExpires !== undefined) {
            // 如果用户表有 basicMembershipExpires 字段，使用它存储调整后的普通会员过期时间
            user.basicMembershipExpires = basicExpiresAt;
          }
        }

        // 准备更新数据
        const updateData = {
          coins: user.coins - coinsNeeded,
          membership: level,
          membershipExpires: expiresAt,
        };

        // 如果用户表有 basicMembershipExpires 字段，且我们调整了普通会员过期时间，也需要更新
        if (level === 'premium' && user.basicMembershipExpires !== undefined) {
          updateData.basicMembershipExpires = user.basicMembershipExpires;
        }

        console.log('更新用户会员信息:', updateData);

        // 更新用户会员信息
        await user.update(updateData, { transaction });

        previousCoins = user.coins;
        newCoins = user.coins - coinsNeeded;
      }

      // 记录兑换日志
      await ctx.model.CoinTransaction.create({
        userId,
        type: 'exchange',
        amount: coinsNeeded,
        balance: newCoins,
        reason: `兑换${days}天${level === 'basic' ? '普通' : '高级'}会员`,
        details: {
          previousBalance: previousCoins,
          level,
          days,
          expiresAt,
          timestamp: new Date(),
        },
      }, { transaction });

      // 提交事务
      await transaction.commit();

      // 获取会员状态
      const membershipService = ctx.service.membership;
      const membershipInfo = await membershipService.getUserMembership(userId);

      return {
        success: true,
        userId,
        level, // 兑换的会员级别
        days, // 兑换的天数
        coinsUsed: coinsNeeded, // 消费的逗币数量
        previousCoins, // 兑换前的逗币余额
        newCoins, // 兑换后的逗币余额
        expiresAt, // 该级别会员的过期时间
        effectiveLevel: membershipInfo.effectiveLevel, // 当前有效的会员级别
        membershipStatus: membershipInfo.membershipStatus, // 各级别会员的状态
        timestamp: new Date(),
      };
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      ctx.logger.error('使用逗币兑换会员失败:', error);
      throw error;
    }
  }
}

module.exports = CoinsService;
