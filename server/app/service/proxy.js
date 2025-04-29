'use strict';

const Service = require('egg').Service;

class ProxyService extends Service {
  // 调用控制器方法
  async callController(controllerName, methodName, ...args) {
    const { ctx } = this;
    
    try {
      // 获取控制器实例
      const controller = ctx.app.controller[controllerName];
      
      if (!controller) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: `控制器不存在: ${controllerName}`
        };
        return;
      }
      
      // 获取方法
      const method = controller[methodName];
      
      if (typeof method !== 'function') {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: `方法不存在: ${controllerName}.${methodName}`
        };
        return;
      }
      
      // 调用方法
      await method.apply(controller, args);
      
    } catch (error) {
      ctx.logger.error(`代理调用失败: ${controllerName}.${methodName}`, error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `代理调用失败: ${error.message}`
      };
    }
  }
}

module.exports = ProxyService;
