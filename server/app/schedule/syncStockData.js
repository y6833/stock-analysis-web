'use strict';

/**
 * 股票数据同步定时任务
 * 每天凌晨2点同步股票基础数据到数据库
 */

const Subscription = require('egg').Subscription;

class SyncStockData extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      cron: '0 2 * * *', // 每天凌晨2点执行
      type: 'all', // 指定所有的 worker 都需要执行
      immediate: false, // 应用启动后不立即执行
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    const { ctx, app } = this;
    
    try {
      ctx.logger.info('[定时任务] 开始同步股票基础数据...');
      
      // 检查是否已经有最新数据
      const latestStock = await ctx.model.Stock.findOne({
        order: [['updatedAt', 'DESC']]
      });
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // 如果今天已经同步过，跳过
      if (latestStock && latestStock.updatedAt >= today) {
        ctx.logger.info('[定时任务] 今天已经同步过股票数据，跳过');
        return;
      }
      
      // 调用股票服务的同步方法
      const result = await ctx.service.stock.fetchAndSyncStockList();
      
      if (result && result.data && result.data.length > 0) {
        ctx.logger.info(`[定时任务] 股票数据同步完成，共同步 ${result.data.length} 条数据`);
        
        // 记录同步日志
        await this.recordSyncLog('success', result.data.length, result.data_source_message);
      } else {
        ctx.logger.warn('[定时任务] 股票数据同步失败，未获取到数据');
        await this.recordSyncLog('failed', 0, '未获取到数据');
      }
      
    } catch (error) {
      ctx.logger.error('[定时任务] 股票数据同步失败:', error);
      await this.recordSyncLog('error', 0, error.message);
    }
  }
  
  /**
   * 记录同步日志
   */
  async recordSyncLog(status, count, message) {
    const { ctx } = this;
    
    try {
      // 这里可以记录到日志表或者文件
      ctx.logger.info(`[同步日志] 状态: ${status}, 数量: ${count}, 消息: ${message}`);
      
      // 如果有同步日志表，可以在这里记录
      // await ctx.model.SyncLog.create({
      //   type: 'stock_data',
      //   status,
      //   count,
      //   message,
      //   syncTime: new Date()
      // });
      
    } catch (logError) {
      ctx.logger.error('[定时任务] 记录同步日志失败:', logError);
    }
  }
}

module.exports = SyncStockData;
