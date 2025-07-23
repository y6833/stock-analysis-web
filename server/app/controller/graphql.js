'use strict';

const Controller = require('egg').Controller;

class GraphQLController extends Controller {
  /**
   * 处理GraphQL查询
   * 这个方法主要用于错误处理和日志记录，实际查询由Apollo Server中间件处理
   */
  async query() {
    const { ctx } = this;

    try {
      ctx.logger.info('GraphQL query received');

      // 如果到达这里，说明Apollo Server中间件没有处理请求
      ctx.status = 404;
      ctx.body = {
        success: false,
        error: {
          code: 'GRAPHQL_NOT_CONFIGURED',
          message: 'GraphQL端点未正确配置',
          timestamp: new Date().toISOString(),
          version: ctx.apiVersion || 'v1',
        },
      };
    } catch (error) {
      ctx.logger.error('GraphQL Controller Error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '服务器内部错误',
          timestamp: new Date().toISOString(),
          version: ctx.apiVersion || 'v1',
        },
      };
    }
  }

  /**
   * GraphQL Playground页面（仅开发环境）
   */
  async playground() {
    const { ctx, app } = this;

    const isDevelopment = app.config.env === 'local' || app.config.env === 'development';
    if (!isDevelopment) {
      ctx.status = 404;
      ctx.body = 'Not Found';
      return;
    }

    // 重定向到GraphQL Playground
    ctx.redirect('/api/v1/graphql');
  }

  /**
   * GraphQL Schema信息
   */
  async schema() {
    const { ctx, app } = this;

    const isDevelopment = app.config.env === 'local' || app.config.env === 'development';
    if (!isDevelopment) {
      ctx.status = 404;
      ctx.body = 'Not Found';
      return;
    }

    try {
      const { typeDefs } = require('../graphql');

      ctx.success(
        {
          schema: typeDefs.loc.source.body,
          endpoint: '/api/v1/graphql',
          playground: isDevelopment ? '/api/v1/graphql' : null,
          version: ctx.apiVersion || 'v1',
        },
        'GraphQL Schema获取成功'
      );
    } catch (error) {
      ctx.logger.error('获取GraphQL Schema失败:', error);
      ctx.error('获取GraphQL Schema失败', 'SCHEMA_ERROR', 500, error.message);
    }
  }

  /**
   * GraphQL健康检查
   */
  async health() {
    const { ctx, app } = this;

    try {
      const graphqlServer = app.getGraphQLServer();

      if (!graphqlServer) {
        ctx.success(
          {
            status: 'warning',
            message: 'GraphQL服务器未初始化',
            timestamp: new Date().toISOString(),
          },
          'GraphQL健康检查'
        );
        return;
      }

      ctx.success(
        {
          status: 'ok',
          message: 'GraphQL服务器运行正常',
          timestamp: new Date().toISOString(),
        },
        'GraphQL健康检查'
      );
    } catch (error) {
      ctx.logger.error('GraphQL健康检查失败:', error);
      ctx.success(
        {
          status: 'error',
          message: '无法检查GraphQL服务器状态',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        'GraphQL健康检查'
      );
    }
  }
}

module.exports = GraphQLController;
