'use strict';

/**
 * API请求日志中间件
 * 记录所有API请求，用于审计和监控
 */
module.exports = () => {
  return async function apiLogger(ctx, next) {
    // 记录请求开始时间
    const startTime = Date.now();
    
    // 获取请求信息
    const { method, path } = ctx;
    const ipAddress = ctx.ip;
    const userAgent = ctx.get('user-agent');
    
    // 获取用户ID（如果已认证）
    let userId = null;
    if (ctx.user) {
      userId = ctx.user.id;
    }
    
    try {
      // 继续处理请求
      await next();
    } finally {
      // 计算响应时间
      const responseTime = Date.now() - startTime;
      
      // 获取状态码
      const statusCode = ctx.status;
      
      // 记录API请求
      try {
        await ctx.service.securityAudit.logApiRequest({
          method,
          path,
          statusCode,
          responseTime,
          userId,
          ipAddress,
          userAgent,
        });
      } catch (error) {
        // 记录失败不应影响主要业务流程
        ctx.logger.error(`记录API请求失败: ${error.message}`, error);
      }
    }
  };
};