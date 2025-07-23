'use strict'

/**
 * 默认配置
 */
module.exports = (appInfo) => {
  const config = {}

  // 应用名称
  config.name = 'Stock Analysis Web'

  // 应用密钥
  config.keys = appInfo.name + '_1234567890'

  // 中间件配置
  config.middleware = ['errorHandler', 'security', 'apiLogger']

  // 加载数据质量配置
  const dataQualityConfig = require('./config.data_quality')

  // 加载安全配置
  const securityConfig = require('./config.security');

  // 安全配置
  config.security = {
    ...securityConfig.security,
    domainWhiteList: ['http://localhost:8080'],
  }

  // CORS配置
  config.cors = {
    origin: '*',
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS',
    credentials: true,
  }

  // 数据库配置
  config.sequelize = {
    dialect: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    database: 'stock_analysis',
    username: 'root',
    password: 'root',
    timezone: '+08:00',
    define: {
      underscored: true,
      freezeTableName: true,
    },
  }

  // Redis配置
  config.redis = {
    client: {
      port: 6379,
      host: '127.0.0.1',
      password: '123456',
      db: 0,
    },
  }

  // JWT配置
  config.jwt = {
    secret: 'your-jwt-secret',
    expiresIn: '7d',
  }

  // 缓存配置
  config.cache = {
    enabled: true,
    prefix: 'app:cache:',
    defaultTTL: 300,
    layers: {
      client: {
        enabled: true,
        maxAge: {
          static: 86400, // 静态资源缓存1天
          api: 60, // API响应缓存60秒
          user: 300, // 用户数据缓存5分钟
        },
      },
      server: {
        enabled: true,
        ttl: {
          stock: 300, // 股票数据缓存5分钟
          user: 600, // 用户数据缓存10分钟
          market: 60, // 市场数据缓存1分钟
          search: 1800, // 搜索结果缓存30分钟
          static: 86400, // 静态数据缓存1天
        },
      },
      database: {
        enabled: true,
        refreshInterval: {
          stock: 3600, // 股票数据每小时刷新
          index: 1800, // 指数数据每30分钟刷新
          industry: 7200, // 行业数据每2小时刷新
        },
      },
    },
  }

  // 数据源配置
  config.dataSource = {
    // 数据源列表及其配置
    sources: {
      tushare: {
        priority: 100,
        reliability: 0.95,
        performance: 0.9,
        costPerRequest: 1.0,
        enabled: true,
      },
      akshare: {
        priority: 90,
        reliability: 0.9,
        performance: 0.85,
        costPerRequest: 0.5,
        enabled: true,
      },
      sina: {
        priority: 80,
        reliability: 0.8,
        performance: 0.95,
        costPerRequest: 0.0,
        enabled: true,
      },
      eastmoney: {
        priority: 70,
        reliability: 0.85,
        performance: 0.8,
        costPerRequest: 0.0,
        enabled: true,
      },
      netease: {
        priority: 60,
        reliability: 0.75,
        performance: 0.75,
        costPerRequest: 0.0,
        enabled: true,
      },
      tencent: {
        priority: 50,
        reliability: 0.7,
        performance: 0.7,
        costPerRequest: 0.0,
        enabled: true,
      },
      yahoo_finance: {
        priority: 40,
        reliability: 0.6,
        performance: 0.6,
        costPerRequest: 0.0,
        enabled: true,
      },
      alltick: {
        priority: 30,
        reliability: 0.5,
        performance: 0.5,
        costPerRequest: 2.0,
        enabled: true,
      },
      juhe: {
        priority: 20,
        reliability: 0.4,
        performance: 0.4,
        costPerRequest: 0.1,
        enabled: true,
      },
      zhitu: {
        priority: 10,
        reliability: 0.3,
        performance: 0.3,
        costPerRequest: 0.2,
        enabled: true,
      },
    },
    // 故障转移配置
    failover: {
      enabled: true,
      maxRetries: 3,
      retryDelay: 1000,
      healthCheckInterval: 5 * 60 * 1000, // 5分钟
      recoveryThreshold: 3, // 连续成功次数阈值
      failureThreshold: 3, // 连续失败次数阈值
      timeoutThreshold: 10000, // 超时阈值（毫秒）
    },
    // 请求优化器配置
    requestOptimizer: {
      // 功能开关
      batchingEnabled: true, // 启用批处理
      throttlingEnabled: true, // 启用节流
      parallelEnabled: true, // 启用并行请求优化
      adaptiveEnabled: true, // 启用自适应优化

      // 速率限制配置
      rateLimits: {
        default: {
          maxRequests: 20, // 默认每个数据源每秒最多20个请求
          windowMs: 1000, // 1秒窗口期
          maxBatchSize: 50, // 最大批处理大小
          minBatchWait: 50, // 最小批处理等待时间(ms)
          maxBatchWait: 200, // 最大批处理等待时间(ms)
        },
        tushare: {
          maxRequests: 10,
          windowMs: 1000,
          maxBatchSize: 100,
          minBatchWait: 100,
          maxBatchWait: 300,
        },
        akshare: {
          maxRequests: 15,
          windowMs: 1000,
          maxBatchSize: 80,
          minBatchWait: 50,
          maxBatchWait: 200,
        },
        sina: {
          maxRequests: 30,
          windowMs: 1000,
          maxBatchSize: 50,
          minBatchWait: 20,
          maxBatchWait: 100,
        },
        eastmoney: {
          maxRequests: 20,
          windowMs: 1000,
          maxBatchSize: 60,
          minBatchWait: 30,
          maxBatchWait: 150,
        },
        alltick: {
          maxRequests: 5,
          windowMs: 1000,
          maxBatchSize: 20,
          minBatchWait: 200,
          maxBatchWait: 500,
        },
      },

      // 并行请求配置
      parallel: {
        maxConcurrent: 5, // 最大并发请求数
        priorityLevels: 3, // 优先级级别数
        timeout: 10000, // 请求超时时间(ms)
        retryCount: 2, // 重试次数
        retryDelay: 1000, // 重试延迟(ms)
        adaptiveTimeout: true, // 自适应超时
      },
    },
  }

  // 集群配置
  config.cluster = {
    listen: {
      port: 7001,
    },
  }

  // 日志配置
  config.logger = {
    dir: `${appInfo.root}/logs`,
    level: 'INFO',
    consoleLevel: 'INFO',
  }

  return config
}
