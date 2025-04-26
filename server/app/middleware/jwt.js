'use strict';

module.exports = options => {
  return async function jwt(ctx, next) {
    // 获取 token
    const token = ctx.request.header.authorization;

    // 检查是否需要认证
    const authConfig = ctx.app.config.auth || {};
    const needAuth = authConfig.enable !== false; // 默认需要认证
    const defaultUser = authConfig.defaultUser || { id: 1, username: 'dev_user' };

    if (!token || token === 'Bearer') {
      if (!needAuth) {
        // 如果不需要认证，使用默认用户
        ctx.user = defaultUser;
        await next();
        return;
      } else {
        ctx.status = 401;
        ctx.body = { message: '未提供认证令牌' };
        return;
      }
    }

    // 验证 token
    try {
      // 去掉 Bearer 前缀
      const tokenValue = token.replace('Bearer ', '');

      // 如果 tokenValue 为空且不需要认证，使用默认用户
      if (!tokenValue && !needAuth) {
        ctx.user = defaultUser;
        await next();
        return;
      }

      // 验证 token
      const user = ctx.app.jwt.verify(tokenValue, options.secret);
      // 将用户信息存储在 ctx.user 中
      ctx.user = user;
      await next();
    } catch (err) {
      // 如果不需要认证，允许继续访问
      if (!needAuth) {
        ctx.user = defaultUser;
        await next();
        return;
      }

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
