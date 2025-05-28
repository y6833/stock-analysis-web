'use strict';

const { Service } = require('egg');

/**
 * 订单簿服务 - 与系统其他模块的关系：
 * 1. 与stock服务集成：提供实时市场深度数据
 * 2. 与strategy服务集成：为交易策略提供订单簿数据
 * 3. 与simulation服务集成：支持更真实的模拟交易环境
 * 4. 与riskMonitoring服务集成：监控订单簿异常情况
 */

// 买卖方向枚举
const Side = {
  Buy: 'buy',
  Sell: 'sell'
};

class OrderBookService extends Service {
  constructor(ctx) {
    super(ctx);
    // 买盘(价格从高到低排序)
    this.bids = new Map();
    // 卖盘(价格从低到高排序) 
    this.asks = new Map();
    // 订单索引(OrderId => {price, volume})
    this.orderIndex = new Map();
  }

  /**
   * 添加订单
   * @param {string} orderId - 订单ID
   * @param {Side} side - 买卖方向
   * @param {number} price - 价格
   * @param {number} volume - 数量
   */
  addOrder(orderId, side, price, volume) {
    if (this.orderIndex.has(orderId)) {
      throw new Error(`Order ${orderId} already exists`);
    }

    const levels = side === Side.Buy ? this.bids : this.asks;
    if (levels.has(price)) {
      levels.set(price, levels.get(price) + volume);
    } else {
      levels.set(price, volume);
      // 维护排序
      this._sortLevels(side);
    }

    this.orderIndex.set(orderId, { price, volume, side });
  }

  /**
   * 修改订单
   * @param {string} orderId - 订单ID
   * @param {number} newVolume - 新数量
   */
  modifyOrder(orderId, newVolume) {
    const orderInfo = this.orderIndex.get(orderId);
    if (!orderInfo) {
      throw new Error(`Order ${orderId} not found`);
    }

    const { price, volume, side } = orderInfo;
    const levels = side === Side.Buy ? this.bids : this.asks;
    const currentLevelVolume = levels.get(price);
    
    levels.set(price, currentLevelVolume - volume + newVolume);
    orderInfo.volume = newVolume;

    if (levels.get(price) <= 0) {
      levels.delete(price);
    }
  }

  /**
   * 删除订单
   * @param {string} orderId - 订单ID
   */
  deleteOrder(orderId) {
    const orderInfo = this.orderIndex.get(orderId);
    if (!orderInfo) {
      throw new Error(`Order ${orderId} not found`);
    }

    const { price, volume, side } = orderInfo;
    const levels = side === Side.Buy ? this.bids : this.asks;
    const currentLevelVolume = levels.get(price);

    levels.set(price, currentLevelVolume - volume);
    this.orderIndex.delete(orderId);

    if (levels.get(price) <= 0) {
      levels.delete(price);
    }
  }

  /**
   * 获取最佳买价
   * @returns {number|null} 最佳买价
   */
  getBestBid() {
    if (this.bids.size === 0) return null;
    return this.bids.keys().next().value;
  }

  /**
   * 获取最佳卖价
   * @returns {number|null} 最佳卖价
   */
  getBestAsk() {
    if (this.asks.size === 0) return null;
    return this.asks.keys().next().value;
  }

  /**
   * 维护价格水平排序
   * @param {Side} side - 买卖方向
   */
  _sortLevels(side) {
    const levels = side === Side.Buy ? this.bids : this.asks;
    const sortedEntries = Array.from(levels.entries()).sort((a, b) => {
      return side === Side.Buy ? b[0] - a[0] : a[0] - b[0];
    });

    levels.clear();
    sortedEntries.forEach(([price, volume]) => levels.set(price, volume));
  }

  /**
   * 批量添加订单
   * @param {Array} orders - 订单数组 [{orderId, side, price, volume}]
   */
  batchAddOrders(orders) {
    orders.forEach(order => {
      this.addOrder(order.orderId, order.side, order.price, order.volume);
    });
  }

  /**
   * 获取订单簿深度
   * @param {number} depth - 深度级别
   * @returns {Object} 订单簿深度 {bids: [[price, volume]], asks: [[price, volume]]}
   */
  getDepth(depth = 10) {
    const bids = Array.from(this.bids.entries())
      .slice(0, depth)
      .map(([price, volume]) => [price, volume]);

    const asks = Array.from(this.asks.entries())
      .slice(0, depth)
      .map(([price, volume]) => [price, volume]);

    return { bids, asks };
  }

  /**
   * 清空订单簿
   */
  clear() {
    this.bids.clear();
    this.asks.clear();
    this.orderIndex.clear();
  }
}

module.exports = OrderBookService;
