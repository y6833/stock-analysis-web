'use strict';

module.exports = options => {
  return async function auth(ctx, next) {
    // 获取 token
    const token = ctx.request.header.authorization;

    // 检查是否需要认证
    const authConfig = ctx.app.config.auth || {};
    const needAuth = authConfig.enable !== false; // 默认需要认证
    const defaultUser = authConfig.defaultUser || { id: 1, username: 'dev_user' };

    // 检查是否是开发环境
    const isDev = process.env.NODE_ENV === 'development';

    // 如果没有提供令牌
    if (!token || token === 'Bearer') {
      if (!needAuth && isDev) {
        // 只有在开发环境且明确配置不需要认证时，才使用默认用户
        ctx.user = defaultUser;
        ctx.logger.warn('使用默认用户访问API，仅用于开发环境');
        return await next();
      } else {
        ctx.status = 401;
        ctx.body = { message: '未提供认证令牌' };
        return;
      }
    }

    // 去掉 Bearer 前缀
    const tokenValue = token.replace('Bearer ', '');

    // 如果 tokenValue 为空且不需要认证，使用默认用户
    if (!tokenValue && !needAuth) {
      ctx.user = defaultUser;
      return await next();
    }

    // 验证 token
    try {
      // 验证 token
      const user = ctx.app.jwt.verify(tokenValue, options.secret);
      // 将用户信息存储在 ctx.user 中
      ctx.user = user;
      ctx.state.user = user; // 同时存储在 ctx.state.user 中，确保兼容性
      return await next();
    } catch (err) {
      // 如果不需要认证，允许继续访问
      if (!needAuth) {
        ctx.user = defaultUser;
        ctx.state.user = defaultUser; // 同时存储在 ctx.state.user 中，确保兼容性
        return await next();
      }

      // 认证失败
      if (err.name === 'TokenExpiredError') {
        ctx.status = 401;
        ctx.body = { message: '认证令牌已过期' };
      } else {
        ctx.status = 401;
        ctx.body = { message: '无效的认证令牌' };
      }
      return;
    }
  };
};
