'use strict';

const { ApolloServer } = require('apollo-server-express');
const { ApolloServerPluginCacheControl } = require('apollo-server-plugin-cache-control');
const { ApolloServerPluginLandingPageGraphQLPlayground } = require('apollo-server-core');
const { ApolloServerPluginLandingPageDisabled } = require('apollo-server-core');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');

/**
 * 创建GraphQL服务器
 * @param {Egg.Application} app - Egg应用实例
 * @returns {ApolloServer} Apollo服务器实例
 */
function createGraphQLServer(app) {
  const isDevelopment = app.config.env === 'local' || app.config.env === 'development';

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      // 从Express请求中获取Egg上下文
      const ctx = req.ctx;
      return {
        ctx,
        // 添加版本信息到GraphQL上下文
        apiVersion: ctx.apiVersion || 'v1',
        // 添加用户信息到GraphQL上下文
        user: ctx.state.user,
        // 添加应用实例到GraphQL上下文
        app,
      };
    },
    // 开发环境启用GraphQL Playground，生产环境禁用
    introspection: isDevelopment,
    plugins: [
      // 缓存控制插件
      ApolloServerPluginCacheControl({
        // 默认最大缓存时间（秒）
        defaultMaxAge: 60,
        // 是否计算缓存指纹
        calculateHttpHeaders: true,
      }),
      // 根据环境决定是否启用Playground
      isDevelopment
        ? ApolloServerPluginLandingPageGraphQLPlayground({
          settings: {
            'editor.theme': 'dark',
            'editor.reuseHeaders': true,
            'tracing.hideTracingResponse': false,
            'queryPlan.hideQueryPlanResponse': false,
          },
        })
        : ApolloServerPluginLandingPageDisabled(),
      // 自定义插件：请求生命周期处理
      {
        async requestDidStart(requestContext) {
          const { context, request } = requestContext;
          const { ctx } = context;

          // 记录GraphQL查询开始
          ctx.logger.info('GraphQL query started', {
            operation: request.operationName,
            query: request.query,
            variables: request.variables,
          });

          return {
            // 解析完成
            async didResolveOperation(resolveContext) {
              const { operation } = resolveContext;
              if (operation) {
                ctx.logger.info('GraphQL operation resolved', {
                  operationType: operation.operation,
                  operationName: operation.name?.value,
                });
              }
            },

            // 发生错误
            async didEncounterErrors(errorsContext) {
              ctx.logger.error('GraphQL errors', {
                errors: errorsContext.errors.map((err) => ({
                  message: err.message,
                  path: err.path,
                  locations: err.locations,
                })),
              });
            },

            // 响应发送前
            async willSendResponse(responseContext) {
              const { response } = responseContext;

              // 添加CORS头
              if (response && response.http) {
                response.http.headers.set('Access-Control-Allow-Origin', '*');
                response.http.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
                response.http.headers.set(
                  'Access-Control-Allow-Headers',
                  'Content-Type,Authorization'
                );

                // 添加API版本头
                response.http.headers.set('X-API-Version', ctx.apiVersion || 'v1');
              }

              // 记录GraphQL查询完成
              ctx.logger.info('GraphQL query completed', {
                operation: requestContext.request.operationName,
                errors: response.errors?.length || 0,
              });
            },
          };
        },
      },
    ],
    // 错误格式化
    formatError: (error) => {
      // 记录错误日志
      app.logger.error('GraphQL Error:', error);

      // 在生产环境中隐藏内部错误详情
      if (app.config.env === 'prod') {
        return new Error('内部服务器错误');
      }

      return error;
    },
    // 启用缓存
    cache: 'bounded',
    // 设置查询复杂度限制
    validationRules: [
      // 可以添加自定义验证规则
    ],
  });

  return server;
}

module.exports = {
  createGraphQLServer,
  typeDefs,
  resolvers,
};
