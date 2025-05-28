'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/service/orderBook.test.js', () => {
  let orderBook;

  before(() => {
    orderBook = app.mockContext().service.orderBook;
  });

  it('should add buy order correctly', () => {
    orderBook.addOrder('order1', 'buy', 100, 10);
    assert.equal(orderBook.getBestBid(), 100);
    assert.equal(orderBook.getBestAsk(), null);
  });

  it('should add sell order correctly', () => {
    orderBook.addOrder('order2', 'sell', 110, 20);
    assert.equal(orderBook.getBestBid(), 100);
    assert.equal(orderBook.getBestAsk(), 110);
  });

  it('should modify order correctly', () => {
    orderBook.addOrder('order3', 'buy', 95, 15);
    orderBook.modifyOrder('order3', 25);
    assert.equal(orderBook.getBestBid(), 100); // 最佳买价仍然是100
  });

  it('should delete order correctly', () => {
    orderBook.addOrder('order4', 'sell', 105, 5);
    orderBook.deleteOrder('order4');
    assert.equal(orderBook.getBestAsk(), 110); // 最佳卖价回到110
  });

  it('should maintain bid levels in descending order', () => {
    orderBook.addOrder('order5', 'buy', 102, 10);
    orderBook.addOrder('order6', 'buy', 98, 10);
    assert.deepEqual(Array.from(orderBook.bids.keys()), [102, 100, 98, 95]);
  });

  it('should maintain ask levels in ascending order', () => {
    orderBook.addOrder('order7', 'sell', 108, 10);
    orderBook.addOrder('order8', 'sell', 115, 10);
    assert.deepEqual(Array.from(orderBook.asks.keys()), [108, 110, 115]);
  });

  it('should handle order not found', () => {
    assert.throws(() => {
      orderBook.modifyOrder('nonexist', 10);
    }, /Order nonexist not found/);
  });

  it('should prevent duplicate order id', () => {
    assert.throws(() => {
      orderBook.addOrder('order1', 'buy', 90, 5);
    }, /Order order1 already exists/);
  });

  it('should handle batch add orders', () => {
    orderBook.clear();
    const orders = [
      { orderId: 'batch1', side: 'buy', price: 99, volume: 10 },
      { orderId: 'batch2', side: 'buy', price: 98, volume: 5 },
      { orderId: 'batch3', side: 'sell', price: 101, volume: 8 }
    ];
    orderBook.batchAddOrders(orders);
    assert.equal(orderBook.getBestBid(), 99);
    assert.equal(orderBook.getBestAsk(), 101);
  });

  it('should get order book depth', () => {
    orderBook.clear();
    orderBook.addOrder('depth1', 'buy', 100, 10);
    orderBook.addOrder('depth2', 'buy', 99, 5);
    orderBook.addOrder('depth3', 'sell', 102, 8);
    orderBook.addOrder('depth4', 'sell', 103, 12);

    const depth = orderBook.getDepth(2);
    assert.deepEqual(depth.bids, [[100, 10], [99, 5]]);
    assert.deepEqual(depth.asks, [[102, 8], [103, 12]]);
  });

  it('should clear order book', () => {
    orderBook.addOrder('clear1', 'buy', 95, 10);
    orderBook.clear();
    assert.equal(orderBook.getBestBid(), null);
    assert.equal(orderBook.getBestAsk(), null);
  });
});
