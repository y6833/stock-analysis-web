'use strict';

const { app, assert } = require('egg-mock/bootstrap');
const { performance } = require('perf_hooks');

describe('订单簿性能测试', () => {
  let orderBook;

  before(() => {
    orderBook = app.mockContext().service.orderBook;
  });

  beforeEach(() => {
    orderBook.clear();
  });

  // 测试添加订单的性能
  it('添加订单性能', async () => {
    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await orderBook.addOrder(`order${i}`, 'buy', 100 + i, 10);
    }

    const end = performance.now();
    const avgLatency = (end - start) / iterations;
    
    console.log(`添加${iterations}个订单平均延迟: ${avgLatency.toFixed(3)}ms`);
    assert(avgLatency < 10, '平均延迟应小于10ms');
  });

  // 测试修改订单的性能
  it('修改订单性能', async () => {
    // 先添加测试订单
    await orderBook.addOrder('order1', 'buy', 100, 10);
    
    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await orderBook.modifyOrder('order1', 10 + i);
    }

    const end = performance.now();
    const avgLatency = (end - start) / iterations;
    
    console.log(`修改${iterations}次订单平均延迟: ${avgLatency.toFixed(3)}ms`);
    assert(avgLatency < 5, '平均延迟应小于5ms');
  });

  // 测试获取最佳买卖价的性能
  it('获取最佳买卖价性能', async () => {
    // 添加一些测试数据
    for (let i = 0; i < 100; i++) {
      await orderBook.addOrder(`buy${i}`, 'buy', 100 - i, 10);
      await orderBook.addOrder(`sell${i}`, 'sell', 100 + i, 10);
    }
    
    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await orderBook.getBestBid();
      await orderBook.getBestAsk();
    }

    const end = performance.now();
    const avgLatency = (end - start) / (iterations * 2);
    
    console.log(`获取${iterations}次最佳买卖价平均延迟: ${avgLatency.toFixed(3)}ms`);
    assert(avgLatency < 1, '平均延迟应小于1ms');
  });

  // 测试并发操作性能
  it('并发操作性能', async () => {
    const concurrency = 100;
    const operations = 1000;
    const totalOps = concurrency * operations;
    
    const start = performance.now();
    
    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      promises.push((async () => {
        for (let j = 0; j < operations; j++) {
          const orderId = `order${i}-${j}`;
          await orderBook.addOrder(orderId, j % 2 === 0 ? 'buy' : 'sell', 100 + j, 10);
          await orderBook.modifyOrder(orderId, 15);
          await orderBook.deleteOrder(orderId);
        }
      })());
    }
    
    await Promise.all(promises);
    
    const end = performance.now();
    const opsPerSec = totalOps / ((end - start) / 1000);
    
    console.log(`并发${concurrency}完成${totalOps}次操作: ${opsPerSec.toFixed(0)} ops/s`);
    assert(opsPerSec > 1000, '吞吐量应大于1000 ops/s');
  });
});
