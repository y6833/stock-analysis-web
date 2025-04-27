'use strict';

const Subscription = require('egg').Subscription;

class CheckAlertsTask extends Subscription {
  // 配置定时任务执行间隔
  static get schedule() {
    return {
      interval: '1m', // 每1分钟执行一次
      type: 'worker', // 指定一个 worker 执行
    };
  }

  // 定时任务的执行逻辑
  async subscribe() {
    const { ctx, service } = this;
    ctx.logger.info('开始执行提醒条件检查任务');

    try {
      // 检查普通提醒
      await service.alert.checkAlerts();
      ctx.logger.info('普通提醒条件检查任务执行完成');

      // 检查关注列表提醒
      await service.alert.checkWatchlistAlerts();
      ctx.logger.info('关注列表提醒条件检查任务执行完成');
    } catch (error) {
      ctx.logger.error('提醒条件检查任务执行失败:', error);
    }
  }
}

module.exports = CheckAlertsTask;
