'use strict';

/**
 * GraphQL上下文中间件
 * 为GraphQL请求添加Egg上下文
 */
module.exports = () => {
  return async function graphqlContext(ctx, next) {
    // 将Egg上下文添加到Express请求对象中
    // 这样Apollo Server就可以在context函数中访问到Egg的ctx
    ctx.req.ctx = ctx;

    await next();
  };
};
