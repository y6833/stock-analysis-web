'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('测试 stock controller', () => {
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
    // 例如，重置 mock 数据
    app.mockRestore();
  });

  it('应该获取股票列表', async () => {
    // 模拟服务返回数据
    app.mockService('stock', 'getStockList', async () => {
      return [
        { code: '000001', name: '平安银行' },
        { code: '000002', name: '万科A' }
      ];
    });

    // 发送请求
    const result = await app.httpRequest()
      .get('/api/stocks')
      .expect(200);

    // 验证响应
    assert(result.body.success === true);
    assert(result.body.data.length === 2);
    assert(result.body.data[0].code === '000001');
  });

  it('应该获取单个股票详情', async () => {
    // 模拟服务返回数据
    app.mockService('stock', 'getStockDetail', async (ctx, code) => {
      assert(code === '000001');
      return {
        code: '000001',
        name: '平安银行',
        price: 10.5,
        change: 0.5,
        changePercent: 0.05
      };
    });

    // 发送请求
    const result = await app.httpRequest()
      .get('/api/stocks/000001')
      .expect(200);

    // 验证响应
    assert(result.body.success === true);
    assert(result.body.data.code === '000001');
    assert(result.body.data.name === '平安银行');
  });

  it('应该处理股票不存在的情况', async () => {
    // 模拟服务抛出错误
    app.mockService('stock', 'getStockDetail', async () => {
      const error = new Error('股票不存在');
      error.status = 404;
      throw error;
    });

    // 发送请求
    const result = await app.httpRequest()
      .get('/api/stocks/999999')
      .expect(404);

    // 验证响应
    assert(result.body.success === false);
    assert(result.body.message.includes('股票不存在'));
  });
});
