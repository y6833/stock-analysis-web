'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('测试 home controller', () => {
  it('应该返回首页', async () => {
    const result = await app.httpRequest().get('/');
    assert(result.status === 200);
    assert(result.text.includes('hi, egg'));
  });
});
