'use strict'

const Controller = require('egg').Controller

class ApiDocsController extends Controller {
  /**
   * 获取API文档
   */
  async getDocs() {
    const { ctx } = this

    const apiDocs = {
      openapi: '3.0.0',
      info: {
        title: '股票分析系统 API',
        version: ctx.apiVersion || 'v1',
        description: '提供股票数据、技术分析、投资组合管理等功能的RESTful API',
        contact: {
          name: 'API Support',
          email: 'support@stockanalysis.com',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: `${ctx.protocol}://${ctx.host}/api/v1`,
          description: 'API v1 服务器',
        },
      ],
      tags: [
        { name: '认证', description: '用户认证和授权' },
        { name: '股票', description: '股票数据和行情' },
        { name: '关注列表', description: '用户关注列表管理' },
        { name: '投资组合', description: '投资组合和交易记录' },
        { name: '提醒', description: '价格和技术指标提醒' },
        { name: '技术分析', description: '技术指标和信号' },
        { name: 'GraphQL', description: 'GraphQL查询接口' },
      ],
      // 路径和组件定义省略，实际实现中应包含完整的OpenAPI规范
    }

    ctx.success(apiDocs, 'API文档获取成功')
  }

  /**
   * 获取GraphQL Schema
   */
  async getGraphQLSchema() {
    const { ctx, app } = this

    const isDevelopment = app.config.env === 'local' || app.config.env === 'development'
    if (!isDevelopment) {
      ctx.notFound('Schema不可用')
      return
    }

    try {
      const { typeDefs } = require('../graphql')

      ctx.success(
        {
          schema: typeDefs.loc.source.body,
          endpoint: '/api/v1/graphql',
          playground: isDevelopment ? '/api/v1/graphql' : null,
          version: ctx.apiVersion || 'v1',
          examples: {
            stockQuery: `
query GetStock($symbol: String!) {
  stock(symbol: $symbol) {
    symbol
    name
    exchange
    quote {
      price
      change
      changePercent
    }
  }
}`,
            stocksQuery: `
query GetStocks($search: String, $limit: Int) {
  stocks(search: $search, limit: $limit) {
    symbol
    name
    quote {
      price
      change
    }
  }
}`,
          },
        },
        'GraphQL Schema获取成功'
      )
    } catch (error) {
      ctx.logger.error('获取GraphQL Schema失败:', error)
      ctx.error('获取GraphQL Schema失败', 'SCHEMA_ERROR', 500, error.message)
    }
  }

  /**
   * 获取API版本信息
   */
  async getVersionInfo() {
    const { ctx } = this

    const versionInfo = {
      currentVersion: ctx.apiVersion || 'v1',
      supportedVersions: ['v1'],
      deprecatedVersions: [],
      endpoints: {
        rest: '/api/v1',
        graphql: '/api/v1/graphql',
        docs: '/api/v1/docs',
      },
      features: {
        rest: {
          enabled: true,
          description: '一致的基于资源的RESTful API端点',
        },
        graphql: {
          enabled: true,
          description: '灵活的GraphQL数据查询API',
        },
        versioning: {
          enabled: true,
          methods: ['url-path', 'query-parameter', 'header', 'accept-header'],
          description: '支持多种API版本控制策略',
        },
      },
    }

    ctx.success(versionInfo, 'API版本信息获取成功')
  }

  /**
   * 获取API迁移指南
   */
  async getMigrationGuide() {
    const { ctx } = this
    const fs = require('fs')
    const path = require('path')

    try {
      const guidePath = path.join(this.app.baseDir, 'docs/api-migration-guide.md')

      // 检查文件是否存在
      if (fs.existsSync(guidePath)) {
        const guideContent = fs.readFileSync(guidePath, 'utf8')

        ctx.success(
          {
            content: guideContent,
            format: 'markdown',
            version: ctx.apiVersion || 'v1',
          },
          'API迁移指南获取成功'
        )
      } else {
        // 如果文件不存在，返回默认内容
        ctx.success(
          {
            content: '# API迁移指南\n\n目前尚无迁移指南内容。',
            format: 'markdown',
            version: ctx.apiVersion || 'v1',
          },
          'API迁移指南获取成功'
        )
      }
    } catch (error) {
      ctx.logger.error('获取API迁移指南失败:', error)
      ctx.error('获取API迁移指南失败', 'GUIDE_ERROR', 500, error.message)
    }
  }
}

module.exports = ApiDocsController
