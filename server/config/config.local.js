'use strict';

/**
 * 本地开发环境特定的配置
 */
module.exports = () => {
  const config = {};

  // 开发环境下的安全配置
  config.security = {
    csrf: {
      enable: false, // 开发环境关闭 CSRF
    },
    domainWhiteList: ['http://localhost:5173'], // 允许的域名白名单
  };

  // 开发环境下的 CORS 配置
  config.cors = {
    origin: '*', // 允许所有域名访问
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS',
    credentials: true, // 允许发送 Cookie
  };

  // 开发环境下的日志配置
  config.logger = {
    level: 'DEBUG',
    consoleLevel: 'DEBUG',
  };

  // 开发环境下的认证配置
  config.auth = {
    enable: false, // 开发环境可以禁用认证
    defaultUser: {
      id: 1,
      username: 'dev_admin',
      role: 'admin', // 设置为管理员角色以便测试管理员功能
    },
  };

  return config;
};
