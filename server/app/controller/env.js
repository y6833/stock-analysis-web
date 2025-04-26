'use strict';

const Controller = require('egg').Controller;

class EnvController extends Controller {
  async info() {
    const { ctx, app } = this;
    
    // 获取当前环境
    const env = app.config.env;
    
    // 使用 helper 方法判断环境
    const isDev = ctx.helper.isDev();
    const isProd = ctx.helper.isProd();
    const isTest = ctx.helper.isTest();
    
    // 根据环境返回不同的值
    const message = ctx.helper.envValue({
      dev: '这是开发环境',
      prod: '这是生产环境',
      test: '这是测试环境',
      default: '未知环境'
    });
    
    // 返回环境信息
    ctx.body = {
      env,
      isDev,
      isProd,
      isTest,
      message,
      // 返回一些配置信息，用于演示不同环境的配置差异
      config: {
        auth: app.config.auth,
        security: {
          csrf: app.config.security.csrf.enable,
          domainWhiteList: app.config.security.domainWhiteList,
        },
        cors: {
          origin: app.config.cors.origin,
        },
        logger: {
          level: app.config.logger.level,
          consoleLevel: app.config.logger.consoleLevel,
        }
      }
    };
  }
}

module.exports = EnvController;
