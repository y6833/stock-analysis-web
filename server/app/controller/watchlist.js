'use strict';

const Controller = require('egg').Controller;

class WatchlistController extends Controller {
  // 获取用户的所有关注分组
  async getUserWatchlists() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id;

    try {
      const watchlists = await service.watchlist.getUserWatchlists(userId);
      ctx.body = watchlists;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '获取关注分组失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 创建关注分组
  async createWatchlist() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id;
    const data = ctx.request.body;

    // 手动验证
    if (!data.name) {
      ctx.status = 400;
      ctx.body = { message: '分组名称不能为空' };
      return;
    }

    try {
      const watchlist = await service.watchlist.createWatchlist(userId, data);
      ctx.status = 201;
      ctx.body = watchlist;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '创建关注分组失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 更新关注分组
  async updateWatchlist() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id;
    const watchlistId = parseInt(ctx.params.id);
    const data = ctx.request.body;

    // 手动验证
    if (!data.name) {
      ctx.status = 400;
      ctx.body = { message: '分组名称不能为空' };
      return;
    }

    try {
      const watchlist = await service.watchlist.updateWatchlist(userId, watchlistId, data);
      if (!watchlist) {
        ctx.status = 404;
        ctx.body = { message: '关注分组不存在或无权限修改' };
        return;
      }
      ctx.body = watchlist;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '更新关注分组失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 删除关注分组
  async deleteWatchlist() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id;
    const watchlistId = parseInt(ctx.params.id);

    try {
      const success = await service.watchlist.deleteWatchlist(userId, watchlistId);
      if (!success) {
        ctx.status = 404;
        ctx.body = { message: '关注分组不存在或无权限删除' };
        return;
      }
      ctx.status = 204;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '删除关注分组失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 获取关注分组中的股票
  async getWatchlistItems() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id;
    const watchlistId = parseInt(ctx.params.id);

    try {
      const items = await service.watchlist.getWatchlistItems(userId, watchlistId);
      if (items === null) {
        ctx.status = 404;
        ctx.body = { message: '关注分组不存在或无权限访问' };
        return;
      }
      ctx.body = items;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '获取关注股票失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 添加股票到关注分组
  async addStockToWatchlist() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id;
    const watchlistId = parseInt(ctx.params.id);
    const data = ctx.request.body;

    // 手动验证
    if (!data.stockCode) {
      ctx.status = 400;
      ctx.body = { message: '股票代码不能为空' };
      return;
    }
    if (!data.stockName) {
      ctx.status = 400;
      ctx.body = { message: '股票名称不能为空' };
      return;
    }

    try {
      const item = await service.watchlist.addStockToWatchlist(userId, watchlistId, data);
      if (!item) {
        ctx.status = 404;
        ctx.body = { message: '关注分组不存在或无权限修改' };
        return;
      }
      ctx.status = 201;
      ctx.body = item;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        ctx.status = 400;
        ctx.body = { message: '该股票已在分组中' };
      } else {
        ctx.status = 500;
        ctx.body = { message: '添加关注股票失败，请稍后再试' };
        ctx.logger.error(error);
      }
    }
  }

  // 从关注分组中删除股票
  async removeStockFromWatchlist() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id;
    const watchlistId = parseInt(ctx.params.watchlistId);
    const itemId = parseInt(ctx.params.itemId);

    try {
      const success = await service.watchlist.removeStockFromWatchlist(userId, watchlistId, itemId);
      if (!success) {
        ctx.status = 404;
        ctx.body = { message: '关注股票不存在或无权限删除' };
        return;
      }
      ctx.status = 204;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '删除关注股票失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }

  // 更新关注股票的备注
  async updateWatchlistItemNotes() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id;
    const watchlistId = parseInt(ctx.params.watchlistId);
    const itemId = parseInt(ctx.params.itemId);
    const { notes } = ctx.request.body;

    try {
      const item = await service.watchlist.updateWatchlistItemNotes(userId, watchlistId, itemId, notes);
      if (!item) {
        ctx.status = 404;
        ctx.body = { message: '关注股票不存在或无权限修改' };
        return;
      }
      ctx.body = item;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '更新关注股票备注失败，请稍后再试' };
      ctx.logger.error(error);
    }
  }
}

module.exports = WatchlistController;
