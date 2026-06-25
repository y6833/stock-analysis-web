'use strict'

/**
 * 解析 CORS / 安全白名单来源（逗号分隔）
 * 例: ALLOWED_ORIGINS=https://xxx.pages.dev,https://stock.example.com
 */
function parseOriginList(envValue, fallback = []) {
  if (!envValue) return fallback
  return envValue
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * 生产环境特定的配置
 */
module.exports = () => {
  const config = {}

  const allowedOrigins = parseOriginList(process.env.ALLOWED_ORIGINS, [
    'https://yourdomain.com',
    'https://stock-analysis-web.pages.dev',
  ])

  config.security = {
    csrf: {
      enable: true,
    },
    domainWhiteList: allowedOrigins,
  }

  config.cors = {
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS',
    credentials: true,
  }

  config.logger = {
    level: 'INFO',
    consoleLevel: 'INFO',
  }

  config.auth = {
    enable: true,
  }

  config.jwt = {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: '7d',
  }

  return config
}
