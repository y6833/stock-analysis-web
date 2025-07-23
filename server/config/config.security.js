'use strict';

/**
 * 安全配置
 */
module.exports = {
  // 安全中间件配置
  security: {
    // 启用安全中间件
    enable: true,
    
    // CSRF保护配置
    csrf: {
      enable: true,
      type: 'ctoken',
      cookieName: 'csrfToken',
      headerName: 'x-csrf-token',
      bodyName: '_csrf',
      queryName: '_csrf',
      cookieOptions: {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV !== 'development',
      },
    },
    
    // XSS防护配置
    xss: {
      enable: true,
    },
    
    // 速率限制配置
    rateLimit: {
      enable: true,
      windowMs: 60 * 1000, // 1分钟
      max: 100, // 每个IP每分钟最多100个请求
      message: '请求频率过高，请稍后再试',
      statusCode: 429,
      headers: true,
      // 不同路径的速率限制
      paths: [
        {
          path: '/api/v1/auth/login',
          windowMs: 60 * 1000,
          max: 5,
        },
        {
          path: '/api/v1/auth/register',
          windowMs: 60 * 1000,
          max: 3,
        },
        {
          path: '/api/v1/auth/reset-password',
          windowMs: 60 * 1000,
          max: 3,
        },
        {
          path: '/api/v1/stocks/search',
          windowMs: 60 * 1000,
          max: 20,
        },
      ],
    },
    
    // 暴力攻击防护配置
    bruteForce: {
      enable: true,
      paths: ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/reset-password'],
      maxAttempts: 5,
      blockDuration: 15 * 60 * 1000, // 15分钟
    },
    
    // 内容安全策略
    contentSecurityPolicy: {
      enable: true,
      policy: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:'],
        'font-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
      },
    },
    
    // HTTP头安全配置
    headers: {
      enable: true,
      xssProtection: {
        enable: true,
        value: '1; mode=block',
      },
      noSniff: {
        enable: true,
        value: 'nosniff',
      },
      frameOptions: {
        enable: true,
        value: 'SAMEORIGIN',
      },
      hsts: {
        enable: process.env.NODE_ENV !== 'development',
        maxAge: 31536000,
        includeSubdomains: true,
      },
      referrerPolicy: {
        enable: true,
        value: 'strict-origin-when-cross-origin',
      },
    },
  },
};