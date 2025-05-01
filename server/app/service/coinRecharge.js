'use strict';

const Service = require('egg').Service;

/**
 * 逗币充值服务
 */
class CoinRechargeService extends Service {
  /**
   * 创建充值请求
   * @param {Object} data - 充值请求数据
   * @return {Object} 创建结果
   */
  async createRechargeRequest(data) {
    const { ctx } = this;
    const { userId, amount, paymentAmount, paymentMethod, remark } = data;

    try {
      // 验证用户是否存在
      const user = await ctx.model.User.findByPk(userId);
      if (!user) {
        throw new Error(`用户不存在: ${userId}`);
      }

      // 创建充值请求
      const request = await ctx.model.CoinRechargeRequest.create({
        userId,
        amount,
        paymentAmount,
        paymentMethod: paymentMethod || 'wechat',
        remark,
        status: 'pending',
      });

      try {
        // 创建通知
        await ctx.service.notification.create({
          userId,
          title: '逗币充值申请已提交',
          content: `您的${amount}个逗币充值申请已提交，请等待管理员审核。`,
          type: 'recharge',
          relatedId: request.id,
          isRead: false,
        });
      } catch (error) {
        // 通知创建失败不影响主流程
        ctx.logger.error('创建用户通知失败:', error);
      }

      try {
        // 创建管理员通知
        const admins = await ctx.model.User.findAll({
          where: { role: 'admin' },
        });

        for (const admin of admins) {
          await ctx.service.notification.create({
            userId: admin.id,
            title: '新的逗币充值申请',
            content: `用户 ${user.username} 提交了${amount}个逗币的充值申请，请及时处理。`,
            type: 'admin_recharge',
            relatedId: request.id,
            isRead: false,
          });
        }
      } catch (error) {
        // 通知创建失败不影响主流程
        ctx.logger.error('创建管理员通知失败:', error);
      }

      return {
        success: true,
        data: request,
      };
    } catch (error) {
      ctx.logger.error('创建充值请求失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户充值请求列表
   * @param {number} userId - 用户ID
   * @param {Object} options - 查询选项
   * @return {Object} 充值请求列表
   */
  async getUserRechargeRequests(userId, options = {}) {
    const { ctx } = this;
    const { page = 1, pageSize = 10, status } = options;

    const where = { userId };
    if (status) {
      where.status = status;
    }

    try {
      const count = await ctx.model.CoinRechargeRequest.count({ where });

      const requests = await ctx.model.CoinRechargeRequest.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });

      return {
        success: true,
        data: {
          list: requests,
          pagination: {
            total: count,
            page,
            pageSize,
            totalPages: Math.ceil(count / pageSize),
          },
        },
      };
    } catch (error) {
      ctx.logger.error('获取用户充值请求列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有充值请求（管理员）
   * @param {Object} options - 查询选项
   * @return {Object} 充值请求列表
   */
  async getAllRechargeRequests(options = {}) {
    const { ctx } = this;
    const { page = 1, pageSize = 10, status, userId } = options;

    const where = {};
    if (status) {
      where.status = status;
    }
    if (userId) {
      where.userId = userId;
    }

    try {
      const count = await ctx.model.CoinRechargeRequest.count({ where });

      const requests = await ctx.model.CoinRechargeRequest.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: pageSize,
        offset: (page - 1) * pageSize,
        include: [
          {
            model: ctx.model.User,
            as: 'applicantUser',
            foreignKey: 'userId',
            attributes: ['id', 'username', 'email', 'nickname'],
          },
          {
            model: ctx.model.User,
            as: 'adminUser',
            foreignKey: 'processedBy',
            attributes: ['id', 'username', 'nickname'],
          },
        ],
      });

      return {
        success: true,
        data: {
          list: requests,
          pagination: {
            total: count,
            page,
            pageSize,
            totalPages: Math.ceil(count / pageSize),
          },
        },
      };
    } catch (error) {
      ctx.logger.error('获取所有充值请求列表失败:', error);
      throw error;
    }
  }

  /**
   * 处理充值请求（管理员）
   * @param {number} requestId - 请求ID
   * @param {Object} data - 处理数据
   * @return {Object} 处理结果
   */
  async processRechargeRequest(requestId, data) {
    const { ctx } = this;
    const { status, adminRemark, adminId } = data;

    // 验证状态
    if (!['completed', 'rejected', 'cancelled'].includes(status)) {
      throw new Error(`无效的状态: ${status}`);
    }

    // 开启事务
    const transaction = await ctx.model.transaction();

    try {
      // 获取充值请求
      const request = await ctx.model.CoinRechargeRequest.findByPk(requestId);
      if (!request) {
        throw new Error(`充值请求不存在: ${requestId}`);
      }

      // 检查请求状态
      if (request.status !== 'pending') {
        throw new Error(`充值请求已处理，当前状态: ${request.status}`);
      }

      // 更新请求状态
      await request.update({
        status,
        adminRemark,
        processedBy: adminId,
        processedAt: new Date(),
      }, { transaction });

      // 准备通知数据
      let notificationData = null;

      // 如果是完成状态，增加用户逗币
      if (status === 'completed') {
        // 获取用户
        const user = await ctx.model.User.findByPk(request.userId, { transaction });
        if (!user) {
          throw new Error(`用户不存在: ${request.userId}`);
        }

        let previousCoins = 0;
        let newCoins = 0;

        try {
          // 获取用户会员信息
          let userMembership = await ctx.model.UserMembership.findOne({
            where: { userId: request.userId },
            transaction,
          });

          // 如果没有会员记录，创建一个
          if (!userMembership) {
            userMembership = await ctx.model.UserMembership.create({
              userId: request.userId,
              coins: user.coins || 10, // 使用用户表中的逗币数量，如果没有则默认为10
              createdAt: new Date(),
              updatedAt: new Date(),
            }, { transaction });
          }

          // 更新用户逗币
          previousCoins = userMembership.coins;
          newCoins = previousCoins + request.amount;
          await userMembership.update({ coins: newCoins }, { transaction });
        } catch (error) {
          // 如果 user_memberships 表不存在，使用用户表中的逗币数量
          console.error('获取用户会员信息失败，使用用户表中的逗币数量:', error);

          // 更新用户逗币
          previousCoins = user.coins || 0;
          newCoins = previousCoins + request.amount;
          await user.update({ coins: newCoins }, { transaction });
        }

        // 记录逗币交易
        await ctx.model.CoinTransaction.create({
          userId: request.userId,
          type: 'add',
          amount: request.amount,
          balance: newCoins,
          reason: '充值',
          details: {
            requestId,
            paymentAmount: request.paymentAmount,
            paymentMethod: request.paymentMethod,
            processedBy: adminId,
            processedAt: new Date(),
            previousBalance: previousCoins,
          },
        }, { transaction });

        // 准备通知数据
        notificationData = {
          userId: request.userId,
          title: '逗币充值成功',
          content: `您的${request.amount}个逗币充值申请已审核通过，逗币已添加到您的账户。`,
          type: 'recharge_completed',
          relatedId: requestId,
          isRead: false,
        };
      } else if (status === 'rejected') {
        // 准备通知数据
        notificationData = {
          userId: request.userId,
          title: '逗币充值被拒绝',
          content: `您的${request.amount}个逗币充值申请被拒绝。${adminRemark ? `原因：${adminRemark}` : ''}`,
          type: 'recharge_rejected',
          relatedId: requestId,
          isRead: false,
        };
      } else if (status === 'cancelled') {
        // 准备通知数据
        notificationData = {
          userId: request.userId,
          title: '逗币充值已取消',
          content: `您的${request.amount}个逗币充值申请已取消。${adminRemark ? `原因：${adminRemark}` : ''}`,
          type: 'recharge_cancelled',
          relatedId: requestId,
          isRead: false,
        };
      }

      // 提交事务
      await transaction.commit();

      // 事务完成后创建通知
      if (notificationData) {
        try {
          await ctx.service.notification.create(notificationData);
        } catch (error) {
          // 通知创建失败不影响主流程
          ctx.logger.error('创建通知失败:', error);
        }
      }

      return {
        success: true,
        data: {
          id: requestId,
          status,
          processedAt: new Date(),
        },
      };
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      ctx.logger.error('处理充值请求失败:', error);
      throw error;
    }
  }

  /**
   * 取消充值请求（用户）
   * @param {number} requestId - 请求ID
   * @param {number} userId - 用户ID
   * @return {Object} 取消结果
   */
  async cancelRechargeRequest(requestId, userId) {
    const { ctx } = this;

    try {
      // 获取充值请求
      const request = await ctx.model.CoinRechargeRequest.findByPk(requestId);
      if (!request) {
        throw new Error(`充值请求不存在: ${requestId}`);
      }

      // 检查是否是请求的所有者
      if (request.userId !== userId) {
        throw new Error('无权取消此充值请求');
      }

      // 检查请求状态
      if (request.status !== 'pending') {
        throw new Error(`充值请求已处理，当前状态: ${request.status}`);
      }

      // 更新请求状态
      await request.update({
        status: 'cancelled',
        adminRemark: '用户自行取消',
        processedAt: new Date(),
      });

      try {
        // 创建通知
        await ctx.service.notification.create({
          userId,
          title: '逗币充值已取消',
          content: `您已取消${request.amount}个逗币的充值申请。`,
          type: 'recharge_cancelled',
          relatedId: requestId,
          isRead: false,
        });
      } catch (error) {
        // 通知创建失败不影响主流程
        ctx.logger.error('创建通知失败:', error);
      }

      return {
        success: true,
        data: {
          id: requestId,
          status: 'cancelled',
          processedAt: new Date(),
        },
      };
    } catch (error) {
      ctx.logger.error('取消充值请求失败:', error);
      throw error;
    }
  }

  /**
   * 获取充值请求详情
   * @param {number} requestId - 请求ID
   * @return {Object} 请求详情
   */
  async getRechargeRequestDetail(requestId) {
    const { ctx } = this;

    try {
      const request = await ctx.model.CoinRechargeRequest.findByPk(requestId, {
        include: [
          {
            model: ctx.model.User,
            as: 'applicantUser',
            foreignKey: 'userId',
            attributes: ['id', 'username', 'email', 'nickname'],
          },
          {
            model: ctx.model.User,
            as: 'adminUser',
            foreignKey: 'processedBy',
            attributes: ['id', 'username', 'nickname'],
          },
        ],
      });

      if (!request) {
        throw new Error(`充值请求不存在: ${requestId}`);
      }

      return {
        success: true,
        data: request,
      };
    } catch (error) {
      ctx.logger.error('获取充值请求详情失败:', error);
      throw error;
    }
  }
}

module.exports = CoinRechargeService;
