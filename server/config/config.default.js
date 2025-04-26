'use strict'

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = (appInfo) => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = (exports = {})

  // 使用 appInfo.name 作为 cookie 签名的 key
  config.keys = appInfo.name + '_1682323267123_3344'

  // 添加中间件
  config.middleware = ['errorHandler']

  // 错误处理中间件配置
  config.errorHandler = {
    match: '/api',
  }

  // 安全配置
  config.security = {
    csrf: {
      enable: false, // 关闭 CSRF，前后端分离项目通常不需要
    },
    domainWhiteList: ['http://localhost:5173'], // 允许的域名白名单
  }

  // CORS 配置
  config.cors = {
    origin: '*', // 允许所有域名访问
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS',
    credentials: true, // 允许发送 Cookie
  }

  // JWT 配置
  config.jwt = {
    secret: 'your-secret-key', // JWT 密钥，与模拟认证服务器使用的密钥相同
    expiresIn: '24h', // 令牌过期时间
  }

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
  }

  // 参数验证配置
  config.validate = {
    convert: true, // 自动转换类型
    validateRoot: true, // 验证根对象
  }

  // 日志配置
  config.logger = {
    dir: require('path').join(appInfo.root, 'logs'),
    level: 'INFO',
    consoleLevel: 'INFO',
  }

  // Tushare API 配置
  config.tushare = {
    token: process.env.TUSHARE_TOKEN || 'your-tushare-token-here', // 请替换为您的实际token
    api_url: 'http://api.tushare.pro',
  }

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
  }

  // Redis 配置
  config.redis = {
    client: {
      port: 6379,
      host: '127.0.0.1',
      password: '123456', // 如果 Redis 没有设置密码，使用空字符串
      db: 0,
      retry_strategy: function (options) {
        // 如果重试次数超过3次，就不再重试
        if (options.attempt > 3) {
          return undefined
        }
        // 重试间隔为1秒
        return 1000
      },
      // 连接超时时间
      connect_timeout: 3000,
    },
    // 允许 Redis 连接失败，不影响应用启动
    allowFail: true,
  }

  return {
    ...config,
  }
}
