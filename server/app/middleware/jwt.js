'use strict';

module.exports = options => {
  return async function jwt(ctx, next) {
    // 获取 token
    const token = ctx.request.header.authorization;
    if (!token) {
      ctx.status = 401;
      ctx.body = { message: '未提供认证令牌' };
      return;
    }

    // 验证 token
    try {
      // 去掉 Bearer 前缀
      const tokenValue = token.replace('Bearer ', '');
      // 验证 token
      const user = ctx.app.jwt.verify(tokenValue, options.secret);
      // 将用户信息存储在 ctx.state 中
      ctx.state.user = user;
      await next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        ctx.status = 401;
        ctx.body = { message: '认证令牌已过期' };
      } else {
        ctx.status = 401;
        ctx.body = { message: '无效的认证令牌' };
      }
    }
  };
};
