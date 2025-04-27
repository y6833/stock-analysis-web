'use strict';

const Service = require('egg').Service;

class AlertService extends Service {
  /**
   * 获取用户的所有提醒
   * @param {number} userId - 用户ID
   * @return {Array} 提醒列表
   */
  async getUserAlerts(userId) {
    const { ctx } = this;

    const alerts = await ctx.model.UserAlert.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    return alerts.map(alert => ({
      id: alert.id,
      stockCode: alert.stockCode,
      stockName: alert.stockName,
      alertType: alert.alertType,
      condition: alert.condition,
      value: parseFloat(alert.value),
      message: alert.notes,
      isActive: alert.isActive,
      isTriggered: alert.isTriggered,
      lastTriggeredAt: alert.lastTriggeredAt,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    }));
  }

  /**
   * 创建新提醒
   * @param {number} userId - 用户ID
   * @param {Object} data - 提醒数据
   * @return {Object} 创建的提醒
   */
  async createAlert(userId, data) {
    const { ctx } = this;

    const alert = await ctx.model.UserAlert.create({
      userId,
      stockCode: data.stockCode,
      stockName: data.stockName,
      alertType: data.alertType,
      condition: data.condition,
      value: data.value,
      notes: data.message || '',
      isActive: true,
      isTriggered: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      id: alert.id,
      stockCode: alert.stockCode,
      stockName: alert.stockName,
      alertType: alert.alertType,
      condition: alert.condition,
      value: parseFloat(alert.value),
      message: alert.notes,
      isActive: alert.isActive,
      isTriggered: alert.isTriggered,
      lastTriggeredAt: alert.lastTriggeredAt,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }

  /**
   * 更新提醒
   * @param {number} userId - 用户ID
   * @param {number} alertId - 提醒ID
   * @param {Object} data - 更新数据
   * @return {Object|null} 更新后的提醒，如果不存在或无权限则返回null
   */
  async updateAlert(userId, alertId, data) {
    const { ctx } = this;

    // 查找提醒并验证所有权
    const alert = await ctx.model.UserAlert.findOne({
      where: { id: alertId, userId },
    });

    if (!alert) {
      return null;
    }

    // 更新字段
    if (data.isActive !== undefined) {
      alert.isActive = data.isActive;
    }

    if (data.value !== undefined) {
      alert.value = data.value;
    }

    if (data.message !== undefined) {
      alert.notes = data.message;
    }

    alert.updatedAt = new Date();
    await alert.save();

    return {
      id: alert.id,
      stockCode: alert.stockCode,
      stockName: alert.stockName,
      alertType: alert.alertType,
      condition: alert.condition,
      value: parseFloat(alert.value),
      message: alert.notes,
      isActive: alert.isActive,
      isTriggered: alert.isTriggered,
      lastTriggeredAt: alert.lastTriggeredAt,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }

  /**
   * 删除提醒
   * @param {number} userId - 用户ID
   * @param {number} alertId - 提醒ID
   * @return {boolean} 是否成功删除
   */
  async deleteAlert(userId, alertId) {
    const { ctx } = this;

    const result = await ctx.model.UserAlert.destroy({
      where: { id: alertId, userId },
    });

    return result > 0;
  }

  /**
   * 获取提醒历史记录
   * @param {number} userId - 用户ID
   * @param {number} alertId - 提醒ID
   * @return {Array} 历史记录列表
   */
  async getAlertHistory(userId, alertId) {
    const { ctx } = this;

    // 验证提醒所有权
    const alert = await ctx.model.UserAlert.findOne({
      where: { id: alertId, userId },
    });

    if (!alert) {
      return [];
    }

    const history = await ctx.model.AlertHistory.findAll({
      where: { alertId },
      order: [['createdAt', 'DESC']],
    });

    return history.map(item => ({
      id: item.id,
      alertId: item.alertId,
      triggeredValue: parseFloat(item.triggeredValue),
      message: item.message,
      isRead: item.isRead,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  /**
   * 标记提醒历史为已读
   * @param {number} userId - 用户ID
   * @param {number} historyId - 历史记录ID
   * @return {boolean} 是否成功标记
   */
  async markHistoryAsRead(userId, historyId) {
    const { ctx } = this;

    // 查找历史记录
    const history = await ctx.model.AlertHistory.findByPk(historyId);

    if (!history) {
      return false;
    }

    // 验证提醒所有权
    const alert = await ctx.model.UserAlert.findOne({
      where: { id: history.alertId, userId },
    });

    if (!alert) {
      return false;
    }

    // 标记为已读
    history.isRead = true;
    history.updatedAt = new Date();
    await history.save();

    return true;
  }

  /**
   * 检查提醒条件
   * 此方法应由定时任务调用，用于检查所有活跃提醒的条件是否满足
   */
  async checkAlerts() {
    const { ctx, service } = this;

    // 获取所有活跃的提醒
    const alerts = await ctx.model.UserAlert.findAll({
      where: { isActive: true },
    });

    for (const alert of alerts) {
      try {
        // 获取股票实时行情
        const quote = await service.stock.getStockQuote(alert.stockCode);

        if (!quote) {
          continue;
        }

        // 获取当前价格、成交量和涨跌幅
        const currentPrice = quote.price;
        const currentVolume = quote.vol / 100; // 转换为手
        const currentChange = quote.pct_chg;

        let triggered = false;
        let triggeredValue = 0;

        // 根据条件判断是否触发提醒
        switch (alert.condition) {
          case 'price_above':
            triggered = currentPrice > alert.value;
            triggeredValue = currentPrice;
            break;
          case 'price_below':
            triggered = currentPrice < alert.value;
            triggeredValue = currentPrice;
            break;
          case 'volume_above':
            triggered = currentVolume > alert.value;
            triggeredValue = currentVolume;
            break;
          case 'change_above':
            triggered = currentChange > alert.value;
            triggeredValue = currentChange;
            break;
          case 'change_below':
            triggered = -currentChange > alert.value;
            triggeredValue = -currentChange;
            break;
        }

        if (triggered) {
          // 更新提醒状态
          alert.isTriggered = true;
          alert.lastTriggeredAt = new Date();
          await alert.save();

          // 创建历史记录
          await ctx.model.AlertHistory.create({
            alertId: alert.id,
            triggeredValue,
            message: `${alert.stockName}(${alert.stockCode}) ${this.getConditionName(alert.condition)} ${alert.value}`,
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (error) {
        ctx.logger.error(`检查提醒 ${alert.id} 失败:`, error);
      }
    }
  }

  /**
   * 获取用户关注列表中的提醒
   * @param {number} userId - 用户ID
   * @param {string} watchlistId - 关注列表ID
   * @return {Array} 提醒列表
   */
  async getWatchlistAlerts(userId, watchlistId) {
    const { ctx } = this;

    // 首先验证关注列表是否属于该用户
    const watchlist = await ctx.model.UserWatchlist.findOne({
      where: { id: watchlistId, userId },
    });

    if (!watchlist) {
      return [];
    }

    // 查询该关注列表下的所有提醒
    const alerts = await ctx.model.WatchlistAlert.findAll({
      where: { watchlistId },
      order: [['createdAt', 'DESC']],
    });

    return alerts.map(alert => ({
      id: alert.id,
      watchlistId: alert.watchlistId,
      symbol: alert.symbol,
      stockName: alert.stockName,
      condition: alert.condition,
      value: parseFloat(alert.value),
      message: alert.message,
      isActive: alert.isActive,
      isTriggered: alert.isTriggered,
      lastTriggeredAt: alert.lastTriggeredAt,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    }));
  }

  /**
   * 添加提醒到关注列表
   * @param {number} userId - 用户ID
   * @param {Object} data - 提醒数据
   * @return {Object} 创建的提醒
   */
  async addWatchlistAlert(userId, data) {
    const { ctx } = this;

    // 首先验证关注列表是否属于该用户
    const watchlist = await ctx.model.UserWatchlist.findOne({
      where: { id: data.watchlistId, userId },
    });

    if (!watchlist) {
      throw new Error('关注列表不存在或无权限访问');
    }

    // 创建新的关注列表提醒
    const alert = await ctx.model.WatchlistAlert.create({
      watchlistId: data.watchlistId,
      symbol: data.symbol,
      stockName: data.stockName,
      condition: data.condition,
      value: data.value,
      message: data.message || '',
      isActive: true,
      isTriggered: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      id: alert.id,
      watchlistId: alert.watchlistId,
      symbol: alert.symbol,
      stockName: alert.stockName,
      condition: alert.condition,
      value: parseFloat(alert.value),
      message: alert.message,
      isActive: alert.isActive,
      isTriggered: alert.isTriggered,
      lastTriggeredAt: alert.lastTriggeredAt,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }

  /**
   * 删除关注列表中的提醒
   * @param {number} userId - 用户ID
   * @param {string} watchlistId - 关注列表ID
   * @param {number} alertId - 提醒ID
   * @return {boolean} 是否成功删除
   */
  async removeWatchlistAlert(userId, watchlistId, alertId) {
    const { ctx } = this;

    // 首先验证关注列表是否属于该用户
    const watchlist = await ctx.model.UserWatchlist.findOne({
      where: { id: watchlistId, userId },
    });

    if (!watchlist) {
      return false;
    }

    // 删除提醒
    const result = await ctx.model.WatchlistAlert.destroy({
      where: { id: alertId, watchlistId },
    });

    return result > 0;
  }

  /**
   * 检查关注列表提醒条件
   * 此方法应由定时任务调用，用于检查所有活跃的关注列表提醒的条件是否满足
   */
  async checkWatchlistAlerts() {
    const { ctx, service } = this;

    // 获取所有活跃的关注列表提醒
    const alerts = await ctx.model.WatchlistAlert.findAll({
      where: { isActive: true },
    });

    for (const alert of alerts) {
      try {
        // 获取股票实时行情
        const quote = await service.stock.getStockQuote(alert.symbol);

        if (!quote) {
          continue;
        }

        // 获取当前价格、成交量和涨跌幅
        const currentPrice = quote.price;
        const currentVolume = quote.vol / 100; // 转换为手
        const currentChange = quote.pct_chg;

        let triggered = false;
        let triggeredValue = 0;

        // 根据条件判断是否触发提醒
        switch (alert.condition) {
          case 'price_above':
            triggered = currentPrice > alert.value;
            triggeredValue = currentPrice;
            break;
          case 'price_below':
            triggered = currentPrice < alert.value;
            triggeredValue = currentPrice;
            break;
          case 'volume_above':
            triggered = currentVolume > alert.value;
            triggeredValue = currentVolume;
            break;
          case 'change_above':
            triggered = currentChange > alert.value;
            triggeredValue = currentChange;
            break;
          case 'change_below':
            triggered = -currentChange > alert.value;
            triggeredValue = -currentChange;
            break;
        }

        if (triggered) {
          // 更新提醒状态
          alert.isTriggered = true;
          alert.lastTriggeredAt = new Date();
          await alert.save();

          // 创建历史记录
          await ctx.model.WatchlistAlertHistory.create({
            alertId: alert.id,
            triggeredValue,
            message: `${alert.stockName}(${alert.symbol}) ${this.getConditionName(alert.condition)} ${alert.value}`,
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (error) {
        ctx.logger.error(`检查关注列表提醒 ${alert.id} 失败:`, error);
      }
    }
  }

  /**
   * 获取条件名称
   * @param {string} condition - 条件代码
   * @return {string} 条件名称
   */
  getConditionName(condition) {
    const conditionMap = {
      'price_above': '价格高于',
      'price_below': '价格低于',
      'volume_above': '成交量高于',
      'change_above': '涨幅高于',
      'change_below': '跌幅高于',
    };

    return conditionMap[condition] || condition;
  }
}

module.exports = AlertService;
