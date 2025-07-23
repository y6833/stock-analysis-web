'use strict';

const Service = require('egg').Service;

/**
 * 安全审计服务
 * 记录安全相关事件，用于审计和监控
 */
class SecurityAuditService extends Service {
  /**
   * 记录安全事件
   * @param {Object} options 事件选项
   * @param {String} options.eventType 事件类型
   * @param {Object} options.eventDetails 事件详情
   * @param {String} options.severity 严重程度
   * @param {Number} options.userId 用户ID
   * @param {String} options.ipAddress IP地址
   * @param {String} options.userAgent 用户代理
   */
  async logSecurityEvent({
    eventType,
    eventDetails = {},
    severity = 'info',
    userId = null,
    ipAddress = null,
    userAgent = null,
  }) {
    const { ctx } = this;
    
    // 如果没有提供IP地址，使用请求中的IP
    if (!ipAddress && ctx.request) {
      ipAddress = ctx.ip;
    }
    
    // 如果没有提供用户代理，使用请求中的用户代理
    if (!userAgent && ctx.request) {
      userAgent = ctx.get('user-agent');
    }
    
    // 如果没有提供用户ID，尝试从会话中获取
    if (!userId && ctx.user) {
      userId = ctx.user.id;
    }
    
    // 记录安全事件
    try {
      await ctx.model.SecurityAuditLog.create({
        ipAddress,
        userId,
        eventType,
        eventDetails: JSON.stringify(eventDetails),
        severity,
        eventTime: new Date(),
        userAgent,
      });
      
      // 对于严重事件，记录到应用日志
      if (severity === 'error' || severity === 'critical') {
        ctx.logger.error(`[安全事件] ${eventType}: ${JSON.stringify(eventDetails)}`);
      } else if (severity === 'warning') {
        ctx.logger.warn(`[安全事件] ${eventType}: ${JSON.stringify(eventDetails)}`);
      } else {
        ctx.logger.info(`[安全事件] ${eventType}: ${JSON.stringify(eventDetails)}`);
      }
    } catch (error) {
      // 记录失败不应影响主要业务流程
      ctx.logger.error(`记录安全事件失败: ${error.message}`, error);
    }
  }
  
  /**
   * 记录登录尝试
   * @param {Object} options 登录尝试选项
   * @param {String} options.email 邮箱
   * @param {Boolean} options.success 是否成功
   * @param {Number} options.userId 用户ID（成功时）
   * @param {String} options.ipAddress IP地址
   * @param {String} options.userAgent 用户代理
   */
  async logLoginAttempt({
    email,
    success,
    userId = null,
    ipAddress = null,
    userAgent = null,
  }) {
    const { ctx } = this;
    
    // 如果没有提供IP地址，使用请求中的IP
    if (!ipAddress && ctx.request) {
      ipAddress = ctx.ip;
    }
    
    // 如果没有提供用户代理，使用请求中的用户代理
    if (!userAgent && ctx.request) {
      userAgent = ctx.get('user-agent');
    }
    
    // 记录登录尝试
    try {
      await ctx.model.LoginAttempt.create({
        ipAddress,
        userId,
        email,
        success,
        attemptTime: new Date(),
        userAgent,
      });
      
      // 记录安全事件
      const eventType = success ? 'login_success' : 'login_failed';
      const severity = success ? 'info' : 'warning';
      
      await this.logSecurityEvent({
        eventType,
        eventDetails: { email, userId },
        severity,
        userId,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      // 记录失败不应影响主要业务流程
      ctx.logger.error(`记录登录尝试失败: ${error.message}`, error);
    }
  }
  
  /**
   * 检查是否应该阻止登录尝试
   * @param {Object} options 检查选项
   * @param {String} options.email 邮箱
   * @param {String} options.ipAddress IP地址
   * @returns {Object} 检查结果
   */
  async shouldBlockLoginAttempt({
    email,
    ipAddress = null,
  }) {
    const { ctx } = this;
    
    // 如果没有提供IP地址，使用请求中的IP
    if (!ipAddress && ctx.request) {
      ipAddress = ctx.ip;
    }
    
    // 检查配置
    const maxAttempts = this.config.security.bruteForce.maxAttempts || 5;
    const blockDuration = this.config.security.bruteForce.blockDuration || 15 * 60 * 1000; // 15分钟
    
    // 计算时间窗口
    const windowStart = new Date(Date.now() - blockDuration);
    
    // 查询失败的登录尝试
    const failedAttempts = await ctx.model.LoginAttempt.count({
      where: {
        ipAddress,
        email,
        success: false,
        attemptTime: {
          $gte: windowStart,
        },
      },
    });
    
    // 检查是否超过最大尝试次数
    const shouldBlock = failedAttempts >= maxAttempts;
    
    // 如果应该阻止，记录安全事件
    if (shouldBlock) {
      await this.logSecurityEvent({
        eventType: 'login_blocked',
        eventDetails: { email, ipAddress, failedAttempts },
        severity: 'warning',
        ipAddress,
      });
    }
    
    return {
      shouldBlock,
      failedAttempts,
      remainingAttempts: Math.max(0, maxAttempts - failedAttempts),
    };
  }
  
  /**
   * 记录API请求
   * @param {Object} options 请求选项
   * @param {String} options.method 请求方法
   * @param {String} options.path 请求路径
   * @param {Number} options.statusCode 状态码
   * @param {Number} options.responseTime 响应时间（毫秒）
   * @param {Number} options.userId 用户ID
   * @param {String} options.ipAddress IP地址
   * @param {String} options.userAgent 用户代理
   */
  async logApiRequest({
    method,
    path,
    statusCode,
    responseTime,
    userId = null,
    ipAddress = null,
    userAgent = null,
  }) {
    const { ctx } = this;
    
    // 如果没有提供IP地址，使用请求中的IP
    if (!ipAddress && ctx.request) {
      ipAddress = ctx.ip;
    }
    
    // 如果没有提供用户代理，使用请求中的用户代理
    if (!userAgent && ctx.request) {
      userAgent = ctx.get('user-agent');
    }
    
    // 如果没有提供用户ID，尝试从会话中获取
    if (!userId && ctx.user) {
      userId = ctx.user.id;
    }
    
    // 记录API请求
    try {
      await ctx.model.ApiRequestLog.create({
        ipAddress,
        userId,
        method,
        path,
        statusCode,
        responseTime,
        requestTime: new Date(),
        userAgent,
      });
    } catch (error) {
      // 记录失败不应影响主要业务流程
      ctx.logger.error(`记录API请求失败: ${error.message}`, error);
    }
  }
  
  /**
   * 检查是否应该限制API请求
   * @param {Object} options 检查选项
   * @param {String} options.path 请求路径
   * @param {String} options.ipAddress IP地址
   * @returns {Object} 检查结果
   */
  async shouldLimitApiRequest({
    path,
    ipAddress = null,
  }) {
    const { ctx } = this;
    
    // 如果没有提供IP地址，使用请求中的IP
    if (!ipAddress && ctx.request) {
      ipAddress = ctx.ip;
    }
    
    // 获取路径特定的限制配置
    const pathConfig = this.getPathRateLimitConfig(path);
    
    // 如果没有配置，不限制
    if (!pathConfig) {
      return { shouldLimit: false };
    }
    
    const { windowMs, max } = pathConfig;
    
    // 计算时间窗口
    const windowStart = new Date(Date.now() - windowMs);
    
    // 查询时间窗口内的请求数
    const requestCount = await ctx.model.ApiRequestLog.count({
      where: {
        ipAddress,
        path,
        requestTime: {
          $gte: windowStart,
        },
      },
    });
    
    // 检查是否超过限制
    const shouldLimit = requestCount >= max;
    
    // 如果应该限制，记录安全事件
    if (shouldLimit) {
      await this.logSecurityEvent({
        eventType: 'rate_limit_exceeded',
        eventDetails: { path, ipAddress, requestCount, max, windowMs },
        severity: 'warning',
        ipAddress,
      });
    }
    
    return {
      shouldLimit,
      requestCount,
      limit: max,
      remaining: Math.max(0, max - requestCount),
      resetTime: new Date(windowStart.getTime() + windowMs),
    };
  }
  
  /**
   * 获取路径特定的速率限制配置
   * @param {String} path 请求路径
   * @returns {Object} 速率限制配置
   */
  getPathRateLimitConfig(path) {
    // 获取配置
    const { paths, windowMs: defaultWindowMs, max: defaultMax } = this.config.security.rateLimit;
    
    // 查找路径特定的配置
    for (const pathConfig of paths) {
      if (path === pathConfig.path || (pathConfig.pattern && new RegExp(pathConfig.pattern).test(path))) {
        return {
          windowMs: pathConfig.windowMs || defaultWindowMs,
          max: pathConfig.max || defaultMax,
        };
      }
    }
    
    // 返回默认配置
    return {
      windowMs: defaultWindowMs,
      max: defaultMax,
    };
  }
}

module.exports = SecurityAuditService;