'use strict';

/**
 * 生产环境特定的配置
 */
module.exports = () => {
  const config = {};

  // 生产环境下的安全配置
  config.security = {
    csrf: {
      enable: true, // 生产环境启用 CSRF
    },
    domainWhiteList: ['https://yourdomain.com'], // 允许的域名白名单
  };

  // 生产环境下的 CORS 配置
  config.cors = {
    origin: 'https://yourdomain.com', // 只允许特定域名访问
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS',
    credentials: true, // 允许发送 Cookie
  };

  // 生产环境下的日志配置
  config.logger = {
    level: 'INFO',
    consoleLevel: 'INFO',
  };

  // 生产环境下的认证配置
  config.auth = {
    enable: true, // 生产环境必须启用认证
  };

  // 生产环境下的 JWT 配置
  config.jwt = {
    secret: process.env.JWT_SECRET || 'your-secret-key', // 使用环境变量中的密钥
    expiresIn: '7d', // 令牌过期时间
  };

  return config;
};
