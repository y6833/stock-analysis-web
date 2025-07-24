'use strict'

const Service = require('egg').Service

class WatchlistService extends Service {
  /**
   * 获取用户的所有关注分组
   * @param {number} userId - 用户ID
   * @return {Array} 关注分组列表
   */
  async getUserWatchlists(userId) {
    const { ctx } = this

    // 查找用户的所有关注分组
    const watchlists = await ctx.model.UserWatchlist.findAll({
      where: { userId },
      include: [
        {
          model: ctx.model.WatchlistItem,
          attributes: ['id', 'stockCode', 'stockName'],
        },
      ],
      order: [['createdAt', 'ASC']],
    })

    // 如果用户没有关注分组，创建一个默认分组
    if (watchlists.length === 0) {
      const defaultWatchlist = await this.createWatchlist(userId, {
        name: '默认分组',
        description: '系统自动创建的默认分组',
      })
      return [defaultWatchlist]
    }

    return watchlists
  }

  /**
   * 创建关注分组
   * @param {number} userId - 用户ID
   * @param {Object} data - 分组数据
   * @return {Object} 创建的分组
   */
  async createWatchlist(userId, data) {
    const { ctx } = this
    const { name, description } = data

    // 创建关注分组
    const watchlist = await ctx.model.UserWatchlist.create({
      userId,
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return watchlist
  }

  /**
   * 更新关注分组
   * @param {number} userId - 用户ID
   * @param {number} watchlistId - 分组ID
   * @param {Object} data - 更新数据
   * @return {Object|null} 更新后的分组，如果分组不存在或无权限则返回null
   */
  async updateWatchlist(userId, watchlistId, data) {
    const { ctx } = this
    const { name, description } = data

    // 查找分组
    const watchlist = await ctx.model.UserWatchlist.findOne({
      where: { id: watchlistId, userId },
    })

    if (!watchlist) {
      return null
    }

    // 更新分组
    await watchlist.update({
      name,
      description,
      updatedAt: new Date(),
    })

    return watchlist
  }

  /**
   * 删除关注分组
   * @param {number} userId - 用户ID
   * @param {number} watchlistId - 分组ID
   * @return {boolean} 删除成功返回true，如果分组不存在或无权限则返回false
   */
  async deleteWatchlist(userId, watchlistId) {
    const { ctx } = this

    // 查找分组
    const watchlist = await ctx.model.UserWatchlist.findOne({
      where: { id: watchlistId, userId },
    })

    if (!watchlist) {
      return false
    }

    // 删除分组
    await watchlist.destroy()

    return true
  }

  /**
   * 获取关注分组中的股票
   * @param {number} userId - 用户ID
   * @param {number} watchlistId - 分组ID
   * @return {Array|null} 股票列表，如果分组不存在或无权限则返回null
   */
  async getWatchlistItems(userId, watchlistId) {
    const { ctx } = this

    // 查找分组
    const watchlist = await ctx.model.UserWatchlist.findOne({
      where: { id: watchlistId, userId },
    })

    if (!watchlist) {
      return null
    }

    // 查找分组中的股票
    const items = await ctx.model.WatchlistItem.findAll({
      where: { watchlistId },
      order: [['createdAt', 'ASC']],
    })

    return items
  }

  /**
   * 添加股票到关注分组
   * @param {number} userId - 用户ID
   * @param {number} watchlistId - 分组ID
   * @param {Object} data - 股票数据
   * @return {Object|null} 添加的股票，如果分组不存在或无权限则返回null
   */
  async addStockToWatchlist(userId, watchlistId, data) {
    const { ctx } = this
    const { stockCode, stockName, notes } = data

    // 查找分组
    const watchlist = await ctx.model.UserWatchlist.findOne({
      where: { id: watchlistId, userId },
    })

    if (!watchlist) {
      return null
    }

    // 添加股票到分组
    const item = await ctx.model.WatchlistItem.create({
      watchlistId,
      stockCode,
      stockName,
      notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return item
  }

  /**
   * 从关注分组中删除股票
   * @param {number} userId - 用户ID
   * @param {number} watchlistId - 分组ID
   * @param {number} itemId - 股票ID
   * @return {boolean} 删除成功返回true，如果股票不存在或无权限则返回false
   */
  async removeStockFromWatchlist(userId, watchlistId, itemId) {
    const { ctx } = this

    // 查找分组
    const watchlist = await ctx.model.UserWatchlist.findOne({
      where: { id: watchlistId, userId },
    })

    if (!watchlist) {
      return false
    }

    // 查找股票
    const item = await ctx.model.WatchlistItem.findOne({
      where: { id: itemId, watchlistId },
    })

    if (!item) {
      return false
    }

    // 删除股票
    await item.destroy()

    return true
  }

  /**
   * 更新关注股票的备注
   * @param {number} userId - 用户ID
   * @param {number} watchlistId - 分组ID
   * @param {number} itemId - 股票ID
   * @param {string} notes - 备注
   * @return {Object|null} 更新后的股票，如果股票不存在或无权限则返回null
   */
  async updateWatchlistItemNotes(userId, watchlistId, itemId, notes) {
    const { ctx } = this

    // 查找分组
    const watchlist = await ctx.model.UserWatchlist.findOne({
      where: { id: watchlistId, userId },
    })

    if (!watchlist) {
      return null
    }

    // 查找股票
    const item = await ctx.model.WatchlistItem.findOne({
      where: { id: itemId, watchlistId },
    })

    if (!item) {
      return null
    }

    // 更新备注
    await item.update({
      notes,
      updatedAt: new Date(),
    })

    return item
  }

  /**
   * 更新关注股票项目
   * @param {number} userId - 用户ID
   * @param {number} watchlistId - 分组ID
   * @param {number} itemId - 股票ID
   * @param {Object} data - 更新数据
   * @return {Object|null} 更新后的股票，如果股票不存在或无权限则返回null
   */
  async updateWatchlistItem(userId, watchlistId, itemId, data) {
    const { ctx } = this

    // 查找分组
    const watchlist = await ctx.model.UserWatchlist.findOne({
      where: { id: watchlistId, userId },
    })

    if (!watchlist) {
      return null
    }

    // 查找股票
    const item = await ctx.model.WatchlistItem.findOne({
      where: { id: itemId, watchlistId },
    })

    if (!item) {
      return null
    }

    // 准备更新数据
    const updateData = {}

    // 只允许更新特定字段
    if (data.notes !== undefined) {
      updateData.notes = data.notes
    }

    if (data.stockName !== undefined) {
      updateData.stockName = data.stockName
    }

    if (data.order !== undefined) {
      updateData.order = data.order
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive
    }

    // 添加更新时间
    updateData.updatedAt = new Date()

    // 更新股票
    await item.update(updateData)

    return item
  }

  /**
   * 根据ID获取单个关注分组详情
   * @param {number} userId - 用户ID
   * @param {number} watchlistId - 分组ID
   * @return {Object|null} 关注分组详情，如果分组不存在或无权限则返回null
   */
  async getWatchlistById(userId, watchlistId) {
    const { ctx } = this

    // 查找分组
    const watchlist = await ctx.model.UserWatchlist.findOne({
      where: { id: watchlistId, userId },
      include: [
        {
          model: ctx.model.WatchlistItem,
          attributes: ['id', 'stockCode', 'stockName', 'notes', 'createdAt', 'updatedAt'],
        },
      ],
    })

    if (!watchlist) {
      return null
    }

    return watchlist
  }

  /**
   * 获取所有用户关注的股票（用于数据同步）
   * @return {Array} 所有关注的股票列表
   */
  async getAllWatchlistStocks() {
    const { ctx } = this

    try {
      // 查找所有关注的股票，去重
      const items = await ctx.model.WatchlistItem.findAll({
        attributes: [
          [ctx.app.Sequelize.col('stock_code'), 'stockCode'],
          [ctx.app.Sequelize.fn('MAX', ctx.app.Sequelize.col('stock_name')), 'stockName'],
        ],
        group: ['stock_code'],
        order: [['stock_code', 'ASC']],
      })

      return items.map((item) => ({
        symbol: item.stockCode,
        name: item.stockName,
      }))
    } catch (err) {
      ctx.logger.error('获取所有关注股票失败:', err)
      return []
    }
  }
}

module.exports = WatchlistService
