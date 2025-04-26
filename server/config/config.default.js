'use strict';

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {};

  // 使用 appInfo.name 作为 cookie 签名的 key
  config.keys = appInfo.name + '_1682323267123_3344';

  // 添加中间件
  config.middleware = ['errorHandler'];

  // 错误处理中间件配置
  config.errorHandler = {
    match: '/api',
  };

  // 安全配置
  config.security = {
    csrf: {
      enable: false, // 关闭 CSRF，前后端分离项目通常不需要
    },
    domainWhiteList: ['http://localhost:5173'], // 允许的域名白名单
  };

  // CORS 配置
  config.cors = {
    origin: '*', // 允许所有域名访问
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS',
    credentials: true, // 允许发送 Cookie
  };

  // JWT 配置
  config.jwt = {
    secret: 'your-secret-key', // JWT 密钥，与模拟认证服务器使用的密钥相同
    expiresIn: '24h', // 令牌过期时间
  };

  // 数据库配置
  config.sequelize = {
    dialect: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    database: 'stock_analysis',
    username: 'root',
    password: 'root', // 请修改为你的数据库密码
    timezone: '+08:00', // 东八区
    define: {
      underscored: true, // 使用下划线命名法
      freezeTableName: false, // 不冻结表名
      charset: 'utf8mb4', // 字符集
      dialectOptions: {
        collate: 'utf8mb4_general_ci', // 排序规则
      },
      timestamps: true, // 自动添加 createdAt 和 updatedAt 字段
    },
  };

  // 参数验证配置
  config.validate = {
    convert: true, // 自动转换类型
    validateRoot: true, // 验证根对象
  };

  // 日志配置
  config.logger = {
    dir: require('path').join(appInfo.root, 'logs'),
    level: 'INFO',
    consoleLevel: 'INFO',
  };

  // Tushare API 配置
  config.tushare = {
    token: '983b25aa025eee598034c4741dc776ddc53ddcffbb180cf61',
    api_url: 'http://api.tushare.pro',
  };

  // MySQL 客户端配置（用于直接操作 MySQL）
  config.mysql = {
    client: {
      host: '127.0.0.1',
      port: '3306',
      user: 'root',
      password: 'root',
      database: 'stock_analysis',
    },
    app: true,
    agent: false,
  };

  // Redis 配置
  config.redis = {
    client: {
      port: 6379,
      host: '127.0.0.1',
      password: '',
      db: 0,
    },
  };

  return {
    ...config,
  };
};
