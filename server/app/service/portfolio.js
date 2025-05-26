'use strict';

const Service = require('egg').Service;

class PortfolioService extends Service {
  /**
   * 获取用户的所有投资组合
   * @param {number} userId - 用户ID
   * @return {Array} 投资组合列表
   */
  async getUserPortfolios(userId) {
    const { ctx } = this;

    // 查找用户的所有投资组合
    const portfolios = await ctx.model.UserPortfolio.findAll({
      where: { userId },
      order: [['createdAt', 'ASC']],
    });

    // 如果用户没有投资组合，创建一个默认组合
    if (portfolios.length === 0) {
      const defaultPortfolio = await this.createPortfolio(userId, {
        name: '默认组合',
        description: '系统自动创建的默认组合',
        isDefault: true,
      });
      return [defaultPortfolio];
    }

    return portfolios;
  }

  /**
   * 创建投资组合
   * @param {number} userId - 用户ID
   * @param {Object} data - 组合数据
   * @return {Object} 创建的组合
   */
  async createPortfolio(userId, data) {
    const { ctx } = this;
    const { name, description, isDefault = false } = data;

    // 如果设置为默认组合，先将其他组合设为非默认
    if (isDefault) {
      await ctx.model.UserPortfolio.update(
        { isDefault: false },
        { where: { userId, isDefault: true } }
      );
    }

    // 创建投资组合
    const portfolio = await ctx.model.UserPortfolio.create({
      userId,
      name,
      description,
      isDefault,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return portfolio;
  }

  /**
   * 更新投资组合
   * @param {number} userId - 用户ID
   * @param {number} portfolioId - 组合ID
   * @param {Object} data - 更新数据
   * @return {Object|null} 更新后的组合，如果组合不存在或无权限则返回null
   */
  async updatePortfolio(userId, portfolioId, data) {
    const { ctx } = this;
    const { name, description, isDefault } = data;

    // 查找组合
    const portfolio = await ctx.model.UserPortfolio.findOne({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      return null;
    }

    // 如果设置为默认组合，先将其他组合设为非默认
    if (isDefault && !portfolio.isDefault) {
      await ctx.model.UserPortfolio.update(
        { isDefault: false },
        { where: { userId, isDefault: true } }
      );
    }

    // 更新组合
    await portfolio.update({
      name,
      description,
      isDefault: isDefault !== undefined ? isDefault : portfolio.isDefault,
      updatedAt: new Date(),
    });

    return portfolio;
  }

  /**
   * 删除投资组合
   * @param {number} userId - 用户ID
   * @param {number} portfolioId - 组合ID
   * @return {boolean} 删除成功返回true，如果组合不存在或无权限则返回false
   */
  async deletePortfolio(userId, portfolioId) {
    const { ctx } = this;

    // 查找组合
    const portfolio = await ctx.model.UserPortfolio.findOne({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      return false;
    }

    // 如果是默认组合，不允许删除
    if (portfolio.isDefault) {
      throw new Error('不能删除默认组合');
    }

    // 删除组合
    await portfolio.destroy();

    return true;
  }

  /**
   * 获取投资组合中的持仓
   * @param {number} userId - 用户ID
   * @param {number} portfolioId - 组合ID
   * @return {Array|null} 持仓列表，如果组合不存在或无权限则返回null
   */
  async getPortfolioHoldings(userId, portfolioId) {
    const { ctx } = this;

    // 查找组合
    const portfolio = await ctx.model.UserPortfolio.findOne({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      return null;
    }

    // 查找组合中的持仓
    const holdings = await ctx.model.PortfolioHolding.findAll({
      where: { portfolioId },
      order: [['createdAt', 'ASC']],
    });

    return holdings;
  }

  /**
   * 添加持仓到投资组合
   * @param {number} userId - 用户ID
   * @param {number} portfolioId - 组合ID
   * @param {Object} data - 持仓数据
   * @return {Object|null} 添加的持仓，如果组合不存在或无权限则返回null
   */
  async addHolding(userId, portfolioId, data) {
    const { ctx } = this;
    const { stockCode, stockName, quantity, averageCost, currentPrice, notes } = data;

    // 查找组合
    const portfolio = await ctx.model.UserPortfolio.findOne({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      return null;
    }

    // 检查是否已存在相同股票的持仓
    const existingHolding = await ctx.model.PortfolioHolding.findOne({
      where: { portfolioId, stockCode },
    });

    if (existingHolding) {
      // 如果存在，更新持仓（采用平均成本法）
      const totalQuantity = existingHolding.quantity + quantity;
      const totalCost = existingHolding.quantity * existingHolding.averageCost + quantity * averageCost;
      const newAverageCost = totalCost / totalQuantity;

      await existingHolding.update({
        quantity: totalQuantity,
        averageCost: newAverageCost,
        currentPrice: currentPrice || existingHolding.currentPrice,
        notes: notes || existingHolding.notes,
        updatedAt: new Date(),
      });

      return existingHolding;
    } else {
      // 如果不存在，添加新持仓
      const holding = await ctx.model.PortfolioHolding.create({
        portfolioId,
        stockCode,
        stockName,
        quantity,
        averageCost,
        currentPrice: currentPrice || averageCost,
        notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return holding;
    }
  }

  /**
   * 更新持仓
   * @param {number} userId - 用户ID
   * @param {number} portfolioId - 组合ID
   * @param {number} holdingId - 持仓ID
   * @param {Object} data - 更新数据
   * @return {Object|null} 更新后的持仓，如果持仓不存在或无权限则返回null
   */
  async updateHolding(userId, portfolioId, holdingId, data) {
    const { ctx } = this;

    // 查找组合
    const portfolio = await ctx.model.UserPortfolio.findOne({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      return null;
    }

    // 查找持仓
    const holding = await ctx.model.PortfolioHolding.findOne({
      where: { id: holdingId, portfolioId },
    });

    if (!holding) {
      return null;
    }

    // 更新持仓
    const updateData = {};
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.averageCost !== undefined) updateData.averageCost = data.averageCost;
    if (data.currentPrice !== undefined) updateData.currentPrice = data.currentPrice;
    if (data.notes !== undefined) updateData.notes = data.notes;
    updateData.updatedAt = new Date();

    await holding.update(updateData);

    return holding;
  }

  /**
   * 删除持仓
   * @param {number} userId - 用户ID
   * @param {number} portfolioId - 组合ID
   * @param {number} holdingId - 持仓ID
   * @return {boolean} 删除成功返回true，如果持仓不存在或无权限则返回false
   */
  async deleteHolding(userId, portfolioId, holdingId) {
    const { ctx } = this;

    // 查找组合
    const portfolio = await ctx.model.UserPortfolio.findOne({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      return false;
    }

    // 查找持仓
    const holding = await ctx.model.PortfolioHolding.findOne({
      where: { id: holdingId, portfolioId },
    });

    if (!holding) {
      return false;
    }

    // 删除该股票的所有交易记录
    await ctx.model.TradeRecord.destroy({
      where: {
        portfolioId,
        userId,
        stockCode: holding.stockCode
      }
    });

    // 删除持仓
    await holding.destroy();

    return true;
  }

  /**
   * 添加交易记录
   * @param {number} userId - 用户ID
   * @param {number} portfolioId - 组合ID
   * @param {Object} data - 交易数据
   * @return {Object|null} 添加的交易记录，如果组合不存在或无权限则返回null
   */
  async addTradeRecord(userId, portfolioId, data) {
    const { ctx } = this;
    const { stockCode, stockName, tradeType, quantity, price, tradeDate, notes } = data;

    // 查找组合
    const portfolio = await ctx.model.UserPortfolio.findOne({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      return null;
    }

    // 计算交易总额
    const totalAmount = quantity * price;

    // 创建交易记录
    const record = await ctx.model.TradeRecord.create({
      userId,
      portfolioId,
      stockCode,
      stockName,
      tradeType,
      quantity,
      price,
      totalAmount,
      tradeDate: tradeDate || new Date(),
      notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 更新持仓
    if (tradeType === 'buy') {
      // 买入，添加或更新持仓
      await this.addHolding(userId, portfolioId, {
        stockCode,
        stockName,
        quantity,
        averageCost: price,
        currentPrice: price,
        notes,
      });
    } else if (tradeType === 'sell') {
      // 卖出，减少持仓
      const holding = await ctx.model.PortfolioHolding.findOne({
        where: { portfolioId, stockCode },
      });

      if (holding) {
        if (quantity >= holding.quantity) {
          // 全部卖出，但不删除记录，而是将数量设为0
          await holding.update({
            quantity: 0,
            currentPrice: price,
            updatedAt: new Date(),
          });
        } else {
          // 部分卖出
          await holding.update({
            quantity: holding.quantity - quantity,
            currentPrice: price,
            updatedAt: new Date(),
          });
        }
      }
    }

    return record;
  }

  /**
   * 获取交易记录
   * @param {number} userId - 用户ID
   * @param {number} portfolioId - 组合ID
   * @return {Array|null} 交易记录列表，如果组合不存在或无权限则返回null
   */
  async getTradeRecords(userId, portfolioId) {
    const { ctx } = this;

    // 查找组合
    const portfolio = await ctx.model.UserPortfolio.findOne({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      return null;
    }

    // 查找交易记录
    const records = await ctx.model.TradeRecord.findAll({
      where: { portfolioId, userId },
      order: [['tradeDate', 'DESC']],
    });

    return records;
  }

  /**
   * 删除交易记录
   * @param {number} userId - 用户ID
   * @param {number} portfolioId - 组合ID
   * @param {number} tradeId - 交易记录ID
   * @return {boolean} 删除成功返回true，如果交易记录不存在或无权限则返回false
   */
  async deleteTradeRecord(userId, portfolioId, tradeId) {
    const { ctx } = this;

    // 查找组合
    const portfolio = await ctx.model.UserPortfolio.findOne({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      return false;
    }

    // 查找交易记录
    const record = await ctx.model.TradeRecord.findOne({
      where: { id: tradeId, portfolioId, userId },
    });

    if (!record) {
      return false;
    }

    // 删除交易记录
    await record.destroy();

    // 如果是卖出记录，不需要更新持仓
    if (record.tradeType === 'sell') {
      return true;
    }

    // 如果是买入记录，需要更新持仓
    const stockCode = record.stockCode;
    const quantity = record.quantity;

    // 查找持仓
    const holding = await ctx.model.PortfolioHolding.findOne({
      where: { portfolioId, stockCode },
    });

    if (holding) {
      // 计算新的持仓数量
      const newQuantity = holding.quantity - quantity;

      if (newQuantity <= 0) {
        // 如果新的持仓数量小于等于0，将持仓数量设为0
        await holding.update({
          quantity: 0,
          updatedAt: new Date(),
        });
      } else {
        // 否则更新持仓数量
        await holding.update({
          quantity: newQuantity,
          updatedAt: new Date(),
        });
      }
    }

    return true;
  }

  /**
   * 获取所有用户持仓的股票（用于数据同步）
   * @return {Array} 所有持仓的股票列表
   */
  async getAllPortfolioStocks() {
    const { ctx } = this;

    try {
      // 查找所有持仓的股票，去重，只返回持仓数量大于0的股票
      const holdings = await ctx.model.PortfolioHolding.findAll({
        attributes: [
          [ctx.app.Sequelize.col('stock_code'), 'stockCode'],
          [ctx.app.Sequelize.fn('MAX', ctx.app.Sequelize.col('stock_name')), 'stockName']
        ],
        where: {
          quantity: {
            [ctx.app.Sequelize.Op.gt]: 0
          }
        },
        group: ['stock_code'],
        order: [['stock_code', 'ASC']],
      });

      return holdings.map(holding => ({
        symbol: holding.stockCode,
        name: holding.stockName,
      }));
    } catch (err) {
      ctx.logger.error('获取所有持仓股票失败:', err);
      return [];
    }
  }
}

module.exports = PortfolioService;
