'use strict';

/**
 * 管理员认证中间件
 * 验证用户是否已认证并且具有管理员权限
 */
module.exports = () => {
  return async function adminAuth(ctx, next) {
    // 首先检查用户是否已认证
    if (!ctx.state.user) {
      ctx.unauthorized('需要登录');
      return;
    }

    // 检查用户是否具有管理员权限
    if (ctx.state.user.role !== 'admin') {
      ctx.forbidden('需要管理员权限');
      return;
    }

    // 用户已认证且具有管理员权限，继续处理请求
    await next();
  };
};
