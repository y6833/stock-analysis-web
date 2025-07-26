'use strict';

const crypto = require('crypto');
const xss = require('xss');

/**
 * 安全中间件
 * 提供CSRF保护、XSS防护、速率限制和其他安全功能
 */
module.exports = (options, app) => {
  // 默认配置
  const config = {
    csrf: {
      enable: true,
      type: 'ctoken', // 'ctoken' 或 'referer'
      cookieName: 'csrfToken',
      headerName: 'x-csrf-token',
      bodyName: '_csrf',
      queryName: '_csrf',
      refererWhiteList: [],
      cookieOptions: {
        httpOnly: true,
        sameSite: 'strict',
        secure: app.config.env !== 'local',
      },
    },
    xss: {
      enable: true,
      whiteList: {}, // 使用xss模块的默认白名单
    },
    rateLimit: {
      enable: true,
      windowMs: 60 * 1000, // 1分钟
      max: 100, // 每个IP每分钟最多100个请求
      message: '请求频率过高，请稍后再试',
      statusCode: 429,
      headers: true, // 添加速率限制相关的HTTP头
      keyGenerator: (ctx) => ctx.ip, // 默认使用IP作为键
      skip: (ctx) => false, // 默认不跳过任何请求
      store: null, // 默认使用内存存储
    },
    bruteForce: {
      enable: true,
      paths: ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/reset-password'],
      maxAttempts: 5, // 最大尝试次数
      blockDuration: 15 * 60 * 1000, // 15分钟
      keyGenerator: (ctx) => ctx.ip, // 默认使用IP作为键
    },
    ...options,
  };

  // 速率限制器
  const rateLimiters = new Map();

  // 暴力攻击防护
  const bruteForceProtection = new Map();

  return async function security(ctx, next) {
    // 添加安全相关的HTTP头
    addSecurityHeaders(ctx);

    // CSRF保护
    if (config.csrf.enable && !isCsrfSafe(ctx)) {
      await handleCsrfValidation(ctx);
    }

    // 速率限制
    if (config.rateLimit.enable && !(typeof config.rateLimit.skip === 'function' && config.rateLimit.skip(ctx))) {
      const limited = await handleRateLimit(ctx);
      if (limited) return;
    }

    // 暴力攻击防护
    if (config.bruteForce.enable && isBruteForcePath(ctx)) {
      const blocked = await handleBruteForceProtection(ctx);
      if (blocked) return;
    }

    // XSS防护
    if (config.xss.enable) {
      sanitizeRequestData(ctx);
    }

    await next();

    // 响应数据XSS防护
    if (config.xss.enable && ctx.body && typeof ctx.body === 'object') {
      ctx.body = sanitizeResponseData(ctx.body);
    }
  };

  /**
   * 添加安全相关的HTTP头
   */
  function addSecurityHeaders(ctx) {
    // 内容安全策略
    ctx.set('Content-Security-Policy', 'default-src \'self\'; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; font-src \'self\' data:; connect-src \'self\'');

    // XSS保护
    ctx.set('X-XSS-Protection', '1; mode=block');

    // 禁止MIME类型嗅探
    ctx.set('X-Content-Type-Options', 'nosniff');

    // 点击劫持保护
    ctx.set('X-Frame-Options', 'SAMEORIGIN');

    // 引荐来源策略
    ctx.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // HTTP严格传输安全
    if (app.config.env !== 'local') {
      ctx.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  }

  /**
   * 检查请求是否需要CSRF验证
   */
  function isCsrfSafe(ctx) {
    // 安全的HTTP方法不需要CSRF验证
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(ctx.method)) {
      return true;
    }

    // 检查是否是API请求
    const isApiRequest = ctx.path.startsWith('/api/');
    if (!isApiRequest) {
      return true;
    }

    // 检查是否是CSRF令牌请求
    if (ctx.path === '/api/v1/security/csrf-token') {
      return true;
    }

    return false;
  }

  /**
   * 处理CSRF验证
   */
  async function handleCsrfValidation(ctx) {
    const { headerName, bodyName, queryName, cookieName } = config.csrf;

    // 获取CSRF令牌
    const cookieToken = ctx.cookies.get(cookieName);
    const headerToken = ctx.get(headerName);
    const bodyToken = ctx.request.body && ctx.request.body[bodyName];
    const queryToken = ctx.query[queryName];

    // 使用的令牌
    const token = headerToken || bodyToken || queryToken;

    // 验证令牌
    if (!cookieToken || !token || cookieToken !== token) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        error: 'invalid_csrf_token',
        message: 'CSRF令牌无效',
      };
      return true;
    }

    return false;
  }

  /**
   * 处理速率限制
   */
  async function handleRateLimit(ctx) {
    const { windowMs, max, message, statusCode, headers, keyGenerator } = config.rateLimit;

    // 生成键
    const key = typeof keyGenerator === 'function' ? keyGenerator(ctx) : ctx.ip;

    // 获取或创建限制器
    let limiter = rateLimiters.get(key);
    if (!limiter) {
      limiter = {
        count: 0,
        resetTime: Date.now() + windowMs,
      };
      rateLimiters.set(key, limiter);
    }

    // 检查是否需要重置
    if (Date.now() > limiter.resetTime) {
      limiter.count = 0;
      limiter.resetTime = Date.now() + windowMs;
    }

    // 增加计数
    limiter.count++;

    // 添加响应头
    if (headers) {
      ctx.set('X-RateLimit-Limit', max.toString());
      ctx.set('X-RateLimit-Remaining', Math.max(0, max - limiter.count).toString());
      ctx.set('X-RateLimit-Reset', Math.ceil(limiter.resetTime / 1000).toString());
    }

    // 检查是否超过限制
    if (limiter.count > max) {
      ctx.status = statusCode;
      ctx.body = {
        success: false,
        error: 'rate_limit_exceeded',
        message,
      };
      return true;
    }

    return false;
  }

  /**
   * 检查是否是需要暴力攻击防护的路径
   */
  function isBruteForcePath(ctx) {
    return config.bruteForce.paths.some(path => ctx.path === path);
  }

  /**
   * 处理暴力攻击防护
   */
  async function handleBruteForceProtection(ctx) {
    const { maxAttempts, blockDuration, keyGenerator } = config.bruteForce;

    // 生成键
    const key = typeof keyGenerator === 'function' ? keyGenerator(ctx) : ctx.ip;

    // 获取或创建防护记录
    let protection = bruteForceProtection.get(key);
    if (!protection) {
      protection = {
        attempts: 0,
        blockedUntil: 0,
      };
      bruteForceProtection.set(key, protection);
    }

    // 检查是否被阻止
    if (protection.blockedUntil > Date.now()) {
      const remainingSeconds = Math.ceil((protection.blockedUntil - Date.now()) / 1000);

      ctx.status = 429;
      ctx.body = {
        success: false,
        error: 'too_many_attempts',
        message: `尝试次数过多，请在${remainingSeconds}秒后重试`,
        retryAfter: remainingSeconds,
      };
      ctx.set('Retry-After', remainingSeconds.toString());
      return true;
    }

    // 增加尝试次数
    protection.attempts++;

    // 检查是否超过最大尝试次数
    if (protection.attempts >= maxAttempts) {
      protection.blockedUntil = Date.now() + blockDuration;
      protection.attempts = 0;

      const remainingSeconds = Math.ceil(blockDuration / 1000);

      ctx.status = 429;
      ctx.body = {
        success: false,
        error: 'too_many_attempts',
        message: `尝试次数过多，请在${remainingSeconds}秒后重试`,
        retryAfter: remainingSeconds,
      };
      ctx.set('Retry-After', remainingSeconds.toString());
      return true;
    }

    return false;
  }

  /**
   * 清理请求数据，防止XSS攻击
   */
  function sanitizeRequestData(ctx) {
    // 清理查询参数
    if (ctx.query) {
      Object.keys(ctx.query).forEach(key => {
        if (typeof ctx.query[key] === 'string') {
          ctx.query[key] = xss(ctx.query[key], config.xss.whiteList);
        }
      });
    }

    // 清理请求体
    if (ctx.request.body) {
      sanitizeObject(ctx.request.body);
    }
  }

  /**
   * 清理响应数据，防止XSS攻击
   */
  function sanitizeResponseData(data, seen = new Set()) {
    if (typeof data === 'string') {
      return xss(data, config.xss.whiteList);
    } else if (Array.isArray(data)) {
      return data.map(item => sanitizeResponseData(item, seen));
    } else if (typeof data === 'object' && data !== null) {
      if (seen.has(data)) return data; // 防止循环引用
      seen.add(data);
      const result = Array.isArray(data) ? [] : {};
      Object.keys(data).forEach(key => {
        try {
          result[key] = sanitizeResponseData(data[key], seen);
        } catch (e) {
          result[key] = data[key]; // 只读属性保留原值
        }
      });
      seen.delete(data);
      return result;
    }
    return data;
  }

  /**
   * 递归清理对象，防止XSS攻击
   */
  function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return;

    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        obj[key] = xss(obj[key], config.xss.whiteList);
      } else if (typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    });
  }
};