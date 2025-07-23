'use strict';

/**
 * GraphQL插件
 * 在应用启动时初始化GraphQL服务器
 */
module.exports = (app) => {
  app.beforeStart(async () => {
    try {
      // 初始化GraphQL服务器
      await app.initGraphQL();
      app.logger.info('GraphQL plugin initialized successfully');

      // 记录GraphQL端点信息
      app.logger.info('GraphQL endpoints:', {
        query: '/api/v1/graphql',
        playground: app.config.env === 'local' ? '/api/v1/graphql' : null,
        schema: '/api/v1/docs/graphql',
        health: '/api/v1/graphql/health',
      });
    } catch (error) {
      app.logger.error('GraphQL plugin initialization failed:', error);
      // 不抛出错误，允许应用继续启动（GraphQL为可选功能）
    }
  });
};
