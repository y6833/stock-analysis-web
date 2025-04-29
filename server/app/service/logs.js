'use strict';

const Service = require('egg').Service;

/**
 * 日志服务
 */
class LogsService extends Service {
  /**
   * 获取数据源日志
   * @param {Object} options - 查询选项
   * @param {number} options.page - 页码
   * @param {number} options.pageSize - 每页条数
   * @param {string} options.level - 日志级别
   * @param {string} options.source - 数据源
   * @param {string} options.search - 搜索关键词
   * @return {Promise<Object>} 日志列表和总数
   */
  async getDataSourceLogs({ page = 1, pageSize = 20, level, source, search }) {
    const { ctx } = this;
    const { model } = ctx;

    try {
      // 构建查询条件
      const where = {
        type: 'data_source'
      };

      if (level) {
        where.level = level;
      }

      if (source) {
        where.source = source;
      }

      if (search) {
        where.message = {
          $like: `%${search}%`
        };
      }

      // 查询总数
      const total = await model.SystemLog.count({
        where
      });

      // 查询日志
      const logs = await model.SystemLog.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: pageSize,
        offset: (page - 1) * pageSize
      });

      // 获取所有日志中的用户ID
      const userIds = logs
        .filter(log => log.userId)
        .map(log => log.userId);

      // 如果有用户ID，查询用户信息
      let usersMap = {};
      if (userIds.length > 0) {
        const users = await model.User.findAll({
          where: { id: userIds },
          attributes: ['id', 'username', 'nickname', 'email']
        });

        // 创建用户ID到用户信息的映射
        usersMap = users.reduce((map, user) => {
          map[user.id] = {
            id: user.id,
            username: user.username,
            nickname: user.nickname
          };
          return map;
        }, {});
      }

      // 格式化日志
      const items = logs.map(log => ({
        id: log.id,
        timestamp: log.createdAt,
        level: log.level,
        module: log.module,
        source: log.source,
        message: log.message,
        data: log.data ? JSON.parse(log.data) : undefined,
        user: log.userId && usersMap[log.userId] ? usersMap[log.userId] : null
      }));

      return {
        items,
        total
      };
    } catch (error) {
      this.ctx.logger.error('获取数据源日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取最近的数据源日志
   * @param {number} limit - 限制条数
   * @return {Promise<Array>} 日志列表
   */
  async getRecentDataSourceLogs(limit = 5) {
    const { ctx } = this;
    const { model } = ctx;

    try {
      // 查询最近的日志
      const logs = await model.SystemLog.findAll({
        where: {
          type: 'data_source'
        },
        order: [['created_at', 'DESC']],
        limit
      });

      // 获取所有日志中的用户ID
      const userIds = logs
        .filter(log => log.userId)
        .map(log => log.userId);

      // 如果有用户ID，查询用户信息
      let usersMap = {};
      if (userIds.length > 0) {
        const users = await model.User.findAll({
          where: { id: userIds },
          attributes: ['id', 'username', 'nickname', 'email']
        });

        // 创建用户ID到用户信息的映射
        usersMap = users.reduce((map, user) => {
          map[user.id] = {
            id: user.id,
            username: user.username,
            nickname: user.nickname
          };
          return map;
        }, {});
      }

      // 格式化日志
      return logs.map(log => ({
        id: log.id,
        timestamp: log.createdAt,
        level: log.level,
        module: log.module,
        source: log.source,
        message: log.message,
        data: log.data ? JSON.parse(log.data) : undefined,
        user: log.userId && usersMap[log.userId] ? usersMap[log.userId] : null
      }));
    } catch (error) {
      this.ctx.logger.error('获取最近数据源日志失败:', error);
      throw error;
    }
  }

  /**
   * 添加数据源日志
   * @param {Object} log - 日志对象
   * @param {string} log.level - 日志级别
   * @param {string} log.module - 模块名称
   * @param {string} log.source - 数据源
   * @param {string} log.message - 日志消息
   * @param {Object} log.data - 附加数据
   * @param {number} log.userId - 用户ID
   * @return {Promise<Object>} 创建的日志
   */
  async addDataSourceLog({ level, module, source, message, data, userId }) {
    const { ctx } = this;
    const { model } = ctx;

    try {
      // 创建日志
      const log = await model.SystemLog.create({
        type: 'data_source',
        level,
        module,
        source,
        message,
        data: data ? JSON.stringify(data) : null,
        userId: userId || null
      });

      // 获取用户信息（如果有）
      let userInfo = null;
      if (userId) {
        const user = await model.User.findByPk(userId, {
          attributes: ['id', 'username', 'nickname', 'email']
        });
        if (user) {
          userInfo = {
            id: user.id,
            username: user.username,
            nickname: user.nickname
          };
        }
      }

      return {
        id: log.id,
        timestamp: log.createdAt,
        level: log.level,
        module: log.module,
        source: log.source,
        message: log.message,
        data: log.data ? JSON.parse(log.data) : undefined,
        user: userInfo
      };
    } catch (error) {
      this.ctx.logger.error('添加数据源日志失败:', error);
      throw error;
    }
  }

  /**
   * 清除数据源日志
   * @return {Promise<number>} 清除的日志数量
   */
  async clearDataSourceLogs() {
    const { ctx } = this;
    const { model } = ctx;

    try {
      // 删除所有数据源日志
      const result = await model.SystemLog.destroy({
        where: {
          type: 'data_source'
        }
      });

      return result;
    } catch (error) {
      this.ctx.logger.error('清除数据源日志失败:', error);
      throw error;
    }
  }
}

module.exports = LogsService;
