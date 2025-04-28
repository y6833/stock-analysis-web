'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('测试 stock service', () => {
  // 在所有测试之前运行
  before(() => {
    // 可以在这里进行一些初始化操作，比如数据库设置
  });

  // 在每个测试之前运行
  beforeEach(() => {
    // 可以在这里进行一些测试前的准备工作
  });

  // 在每个测试之后运行
  afterEach(() => {
    // 可以在这里进行一些清理工作
    app.mockRestore();
  });

  it('应该获取股票列表', async () => {
    // 获取 ctx
    const ctx = app.mockContext();
    
    // 模拟数据库查询结果
    app.mockModel('Stock', 'findAll', () => {
      return [
        { code: '000001', name: '平安银行' },
        { code: '000002', name: '万科A' }
      ];
    });

    // 调用服务
    const result = await ctx.service.stock.getStockList();

    // 验证结果
    assert(result.length === 2);
    assert(result[0].code === '000001');
  });

  it('应该获取单个股票详情', async () => {
    // 获取 ctx
    const ctx = app.mockContext();
    
    // 模拟数据库查询结果
    app.mockModel('Stock', 'findOne', (where) => {
      assert(where.where.code === '000001');
      return {
        code: '000001',
        name: '平安银行',
        price: 10.5,
        change: 0.5,
        changePercent: 0.05
      };
    });

    // 调用服务
    const result = await ctx.service.stock.getStockDetail('000001');

    // 验证结果
    assert(result.code === '000001');
    assert(result.name === '平安银行');
  });

  it('应该处理股票不存在的情况', async () => {
    // 获取 ctx
    const ctx = app.mockContext();
    
    // 模拟数据库查询结果为空
    app.mockModel('Stock', 'findOne', () => {
      return null;
    });

    // 调用服务并验证抛出错误
    try {
      await ctx.service.stock.getStockDetail('999999');
      assert(false, '应该抛出错误');
    } catch (error) {
      assert(error.message.includes('股票不存在'));
      assert(error.status === 404);
    }
  });

  it('应该正确缓存股票数据', async () => {
    // 获取 ctx
    const ctx = app.mockContext();
    
    // 模拟 Redis 操作
    app.mockApplication('redis', {
      get: (key) => {
        assert(key === 'stock:000001');
        return null; // 首次调用返回 null，表示缓存未命中
      },
      set: (key, value, option) => {
        assert(key === 'stock:000001');
        assert(JSON.parse(value).code === '000001');
        assert(option.EX === 3600); // 验证过期时间为 1 小时
        return 'OK';
      }
    });

    // 模拟数据库查询结果
    app.mockModel('Stock', 'findOne', () => {
      return {
        code: '000001',
        name: '平安银行',
        price: 10.5
      };
    });

    // 调用服务
    const result = await ctx.service.stock.getStockDetailWithCache('000001');

    // 验证结果
    assert(result.code === '000001');
    assert(result.name === '平安银行');
  });
});
