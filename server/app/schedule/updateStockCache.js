'use strict'

const Subscription = require('egg').Subscription

class UpdateStockCache extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      cron: '0 30 18 * * 1-5', // 每个工作日18:30执行（股市收盘后）
      type: 'all', // 指定所有的 worker 都需要执行
      immediate: false, // 配置了该参数为 true 时，这个定时任务会在应用启动并 ready 后立刻执行一次这个定时任务
      disable: false, // 配置该参数为 true 时，这个定时任务不会被启动
      env: ['local', 'unittest', 'prod'], // 仅在指定的环境下才启动该定时任务
    }
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    const { ctx, app } = this
    
    ctx.logger.info('开始执行股票日线数据缓存更新任务')
    
    try {
      // 获取需要更新的股票列表
      const stocksToUpdate = await this.getStocksToUpdate()
      
      if (stocksToUpdate.length === 0) {
        ctx.logger.info('没有需要更新的股票')
        return
      }
      
      ctx.logger.info(`找到 ${stocksToUpdate.length} 只股票需要更新缓存`)
      
      // 分批处理，避免API调用过于频繁
      const batchSize = 10
      const batches = this.chunkArray(stocksToUpdate, batchSize)
      
      let successCount = 0
      let failCount = 0
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        ctx.logger.info(`处理第 ${i + 1}/${batches.length} 批，共 ${batch.length} 只股票`)
        
        // 并行处理当前批次
        const promises = batch.map(stock => this.updateStockData(stock))
        const results = await Promise.allSettled(promises)
        
        // 统计结果
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successCount++
            ctx.logger.info(`股票 ${batch[index].ts_code} 更新成功`)
          } else {
            failCount++
            ctx.logger.error(`股票 ${batch[index].ts_code} 更新失败:`, result.reason)
          }
        })
        
        // 批次间延迟，避免API限流
        if (i < batches.length - 1) {
          await this.sleep(2000) // 延迟2秒
        }
      }
      
      ctx.logger.info(`股票缓存更新完成: 成功 ${successCount} 只，失败 ${failCount} 只`)
      
      // 清理过期数据
      await this.cleanupOldData()
      
    } catch (error) {
      ctx.logger.error('股票缓存更新任务执行失败:', error)
    }
  }

  /**
   * 获取需要更新的股票列表
   */
  async getStocksToUpdate() {
    const { app } = this
    
    try {
      // 1. 获取用户关注的股票
      const watchlistStocks = await app.model.WatchlistItem.findAll({
        attributes: ['stock_code'],
        where: { is_active: true },
        group: ['stock_code'],
        raw: true
      })
      
      // 2. 获取用户搜索历史中的股票
      const searchHistoryStocks = await app.model.UserBrowsingHistory.findAll({
        attributes: ['stock_code'],
        where: {
          stock_code: { [app.Sequelize.Op.ne]: null },
          created_at: {
            [app.Sequelize.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 最近30天
          }
        },
        group: ['stock_code'],
        raw: true
      })
      
      // 3. 获取系统推荐的热门股票
      const hotStocks = [
        { ts_code: '000001.SZ', priority: 3 }, // 平安银行
        { ts_code: '000002.SZ', priority: 3 }, // 万科A
        { ts_code: '000858.SZ', priority: 3 }, // 五粮液
        { ts_code: '002415.SZ', priority: 3 }, // 海康威视
        { ts_code: '002594.SZ', priority: 3 }, // 比亚迪
        { ts_code: '300059.SZ', priority: 3 }, // 东方财富
        { ts_code: '300750.SZ', priority: 3 }, // 宁德时代
        { ts_code: '600000.SH', priority: 3 }, // 浦发银行
        { ts_code: '600036.SH', priority: 3 }, // 招商银行
        { ts_code: '600519.SH', priority: 3 }, // 贵州茅台
        { ts_code: '601318.SH', priority: 3 }, // 中国平安
        { ts_code: '601398.SH', priority: 3 }, // 工商银行
      ]
      
      // 合并所有股票并去重
      const allStocks = new Map()
      
      // 添加关注列表股票（优先级1）
      watchlistStocks.forEach(item => {
        if (item.stock_code) {
          allStocks.set(item.stock_code, { ts_code: item.stock_code, priority: 1 })
        }
      })
      
      // 添加搜索历史股票（优先级2）
      searchHistoryStocks.forEach(item => {
        if (item.stock_code && !allStocks.has(item.stock_code)) {
          allStocks.set(item.stock_code, { ts_code: item.stock_code, priority: 2 })
        }
      })
      
      // 添加热门股票（优先级3）
      hotStocks.forEach(item => {
        if (!allStocks.has(item.ts_code)) {
          allStocks.set(item.ts_code, item)
        }
      })
      
      return Array.from(allStocks.values())
    } catch (error) {
      this.ctx.logger.error('获取需要更新的股票列表失败:', error)
      return []
    }
  }

  /**
   * 更新单只股票的数据
   */
  async updateStockData(stock) {
    const { ctx } = this
    
    try {
      // 获取最近30个交易日的数据
      const endDate = this.getDateString(0) // 今天
      const startDate = this.getDateString(-30) // 30天前
      
      const stockDailyCacheService = new (ctx.service.stockDailyCache.constructor)(ctx)
      await stockDailyCacheService.getDailyData(stock.ts_code, startDate, endDate, stock.priority)
      
      return { success: true, ts_code: stock.ts_code }
    } catch (error) {
      throw new Error(`更新股票 ${stock.ts_code} 失败: ${error.message}`)
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupOldData() {
    const { ctx, app } = this
    
    try {
      // 删除90天前的数据（保留最近90天）
      const cutoffDate = this.getDateString(-90)
      
      const deletedCount = await app.model.StockDailyData.destroy({
        where: {
          trade_date: {
            [app.Sequelize.Op.lt]: cutoffDate
          }
        }
      })
      
      ctx.logger.info(`清理过期数据完成，删除 ${deletedCount} 条记录`)
    } catch (error) {
      ctx.logger.error('清理过期数据失败:', error)
    }
  }

  /**
   * 获取日期字符串
   */
  getDateString(daysOffset = 0) {
    const date = new Date()
    date.setDate(date.getDate() + daysOffset)
    return date.toISOString().slice(0, 10).replace(/-/g, '')
  }

  /**
   * 数组分块
   */
  chunkArray(array, size) {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * 延迟函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

module.exports = UpdateStockCache
