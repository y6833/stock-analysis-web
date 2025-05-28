'use strict';

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = (appInfo) => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = (exports = {});

  // 使用 appInfo.name 作为 cookie 签名的 key
  config.keys = appInfo.name + '_1682323267123_3344';

  // 添加中间件
  config.middleware = ['auth', 'errorHandler'];

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
    token: process.env.TUSHARE_TOKEN || '983b25aa025eee598034c4741dc776dd73356ddc53ddcffbb180cf61', // 使用用户提供的 token
    api_url: 'http://api.tushare.pro',
    enableAutoRefresh: false, // 默认禁用自动刷新缓存，避免频繁的后台API调用
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

  // Redis 配置 - 暂时禁用以解决连接问题
  // config.redis = {
  //   client: {
  //     port: 6379,
  //     host: '127.0.0.1',
  //     password: '123456', // Redis 密码
  //     db: 0,
  //     retry_strategy: function (options) {
  //       // 如果重试次数超过3次，就不再重试
  //       if (options.attempt > 3) {
  //         return undefined
  //       }
  //       // 重试间隔为1000毫秒
  //       return 1000
  //     },
  //     // 连接超时时间
  //     connect_timeout: 5000,
  //     // 添加更多容错配置
  //     lazyConnect: true,
  //     maxRetriesPerRequest: 3,
  //   },
  //   // 允许 Redis 连接失败，不影响应用启动
  //   allowFail: true,
  // }

  // 认证配置
  config.auth = {
    enable: true, // 默认启用认证
    // 只在开发环境中提供默认用户
    defaultUser: process.env.NODE_ENV === 'development' ? { id: 1, username: 'dev_user' } : null,
  };

  // ClickHouse配置
  config.clickhouse = {
    url: 'http://127.0.0.1',
    port: 8123,
    database: 'stock_data',
    debug: false,
    basicAuth: null, // 如果需要认证: { username: 'user', password: 'pass' }
  };

  // WebSocket配置
  config.io = {
    init: {
      wsEngine: 'ws',
    },
    namespace: {
      '/': {
        connectionMiddleware: [],
        packetMiddleware: [],
      },
      '/realtime': {
        connectionMiddleware: ['auth'],
        packetMiddleware: [],
      },
    },
  };

  // 数据源配置
  config.dataSources = {
    tushare: {
      enabled: true,
      token: '983b25aa025eee598034c4741dc776ddc53ddcffbb180cf61',
      priority: 1,
      timeout: 10000,
      maxRetries: 3,
    },
    akshare: {
      enabled: true,
      priority: 2,
      timeout: 15000,
      maxRetries: 3,
    },
    joinquant: {
      enabled: false, // 需要申请API token
      token: '',
      priority: 3,
      timeout: 15000,
      maxRetries: 3,
    },
    sina: {
      enabled: true,
      priority: 4,
      timeout: 8000,
      maxRetries: 2,
    },
    eastmoney: {
      enabled: true,
      priority: 5,
      timeout: 8000,
      maxRetries: 2,
    },
  };

  // 实时数据推送配置
  config.realtime = {
    enabled: true,
    pushInterval: {
      quote: 5000,    // 行情推送间隔（毫秒）
      kline: 60000,   // K线推送间隔
      trade: 1000,    // 交易推送间隔
      depth: 3000,    // 深度推送间隔
    },
    maxSubscriptions: 100, // 单个客户端最大订阅数
    heartbeatInterval: 30000, // 心跳间隔
  };

  // 数据同步配置
  config.dataSync = {
    enabled: true,
    batchSize: 20,           // 批处理大小
    batchDelay: 1000,        // 批次间延迟
    maxConcurrency: 5,       // 最大并发数
    retryAttempts: 3,        // 重试次数
    retryDelay: 2000,        // 重试延迟
    cacheExpiry: {
      quote: 300,            // 行情缓存过期时间（秒）
      index: 300,            // 指数缓存过期时间
      industry: 600,         // 行业缓存过期时间
      news: 900,             // 新闻缓存过期时间
      financial: 3600,       // 财务数据缓存过期时间
    },
  };

  return {
    ...config,
  };
};
